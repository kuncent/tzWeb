/* ============================================================
 * 智能备课系统 · AI 课堂第二个 tab
 * ------------------------------------------------------------
 * 对齐 OpenMAIC 首页那一步：把一段课程内容交给模型，换回一份能
 * 直接开讲的讲课 PPT。差别在于这份课件不再是自己发明的版式，而是
 * @openmaic/dsl 的 Slide[] —— 逐页绝对坐标由官方 938 行提示词让模型
 * 自己出，服务端 server/maic-deck.mjs 复核，前端只用官方 <SlideCanvas>
 * 画。全站只留这一条渲染路径，离线兜底也是同一份 Slide 契约。
 *
 * 与第一个 tab 的关系不是并列而是接续：备课台出的每一页都能
 * 「送入课堂」，deckToLesson 把画布读平成同一个播放器的 scenes，
 * 所以放映、白板、语音、提问那一套不用重写。
 *
 * 数据通路同课堂：浏览器 → /api/ai/prepare（SSE，逐页推）→ 通义千问。
 * Key 只在服务端；没 key 时降级到预制的那 6 页官方 Slide，界面上照样
 * 标「离线演示」，不假装是模型现写的。
 * ============================================================ */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, FileDown, Play, Sparkles, Trash2 } from 'lucide-react'
import { SlideCanvas } from '@openmaic/renderer'
/* 模型产的 latex 元素带的是 KaTeX 渲好的 HTML（@openmaic/generation 里
   processLatexElements 调 katex.renderToString 填的 html 字段），官方渲染器
   只出 .katex 那套 span、自带样式里没有 KaTeX CSS —— 少了这份，公式就是
   散架的一堆 span。woff2 由 @font-face 按需下载，不下载就不占东西。 */
import 'katex/dist/katex.min.css'
import { prepLevels, prepSamples, prepStyles } from '../../data/classroom'
/* 预制那份直接走仓库根目录的数据文件：它不再从 data/classroom 转手，
   否则会被首屏图拉过去（见 src/data/classroom.js 里那段注释） */
import { builtinDeck } from '../../../data/classroom-deck-slides.mjs'
import { prepareDeck } from '../../lib/classroomApi'
import { exportDeckPptx } from '../../lib/slidePptx'
import { slideTitle, typeLabel } from '../../lib/slideText'

const EASE = [0.22, 1, 0.36, 1]
const pad = (n) => String(n + 1).padStart(2, '0')
/* 与服务端 server/maic-deck.mjs 的 clampPages 同口径：一次备课是
   1 + 页数次模型调用，页数上限就是时延与成本上限，别在这边放宽 */
const MIN_PAGES = 4
const MAX_PAGES = 8

/* 放映卡的底色：官方渲染器只读 slide.background（不读 theme.backgroundColor），
   万一哪页没带 background，白页黑字会糊在深色卡上看不见 —— 外层先按这页
   自己的底色垫一张，字没写底色就退回主题色 / 白。 */
function pageColor(slide) {
  const bg = slide?.background
  if (bg?.type === 'solid' && bg.color) return bg.color
  return slide?.theme?.backgroundColor || '#ffffff'
}

export default function ClassroomPrep({ active, online, model, onSendToClass }) {
  const [content, setContent] = useState(prepSamples[0].content)
  const [level, setLevel] = useState(prepLevels[1])
  const [style, setStyle] = useState(prepStyles[0])
  const [pages, setPages] = useState(7)
  const [deck, setDeck] = useState(() => builtinDeck())
  const [cur, setCur] = useState(0)
  const [busy, setBusy] = useState(false)
  /* { stage: 'parse' | 'slides', title, count, got, fallbacks } —— 只有生成中非空 */
  const [prog, setProg] = useState(null)
  const [exporting, setExporting] = useState('')
  const [note, setNote] = useState('')

  const slides = deck.slides || []
  const total = slides.length
  const at = Math.min(cur, Math.max(0, total - 1))
  const s = slides[at]

  async function onBuild() {
    const t = content.trim()
    if (!t || busy) return
    setBusy(true)
    setNote('')
    setCur(0)
    setProg({ stage: 'parse', title: '', count: 0, got: 0, fallbacks: 0 })
    /* 逐页存下来：服务端并发 4，事件到达顺序不等于页序，下标才是 */
    const slots = []
    let outlineTitle = ''
    const r = await prepareDeck({ content: t, level, style, pages }, (ev) => {
      if (ev.type === 'outline') {
        outlineTitle = String(ev.title || '')
        setProg((p) => ({ ...p, stage: 'slides', title: outlineTitle, count: Number(ev.count) || 0 }))
      } else if (ev.type === 'slide') {
        slots[Math.max(0, Number(ev.index) || 0)] = ev.slide
        const got = slots.filter(Boolean)
        setProg((p) => ({ ...p, stage: 'slides', got: got.length, count: Math.max(p.count, got.length), fallbacks: p.fallbacks + (ev.fallback ? 1 : 0) }))
        /* 边生成边出页：缩略图与放映区跟着长，不是一屏转圈等最后啪一下 */
        setDeck((d) => ({ ...d, title: outlineTitle || d.title, slides: got }))
      }
    })
    setDeck({ ...r, meta: { level, style, pages: (r.slides || []).length || pages } })
    setCur(0)
    setBusy(false)
    setProg(null)
    if (r.stats?.fallback) setNote(`${r.stats.fallback} 页模型没出图，已按大纲要点铺成兜底版；不满意可以再生成一次。`)
    else if (r.stats?.dropped) setNote(`${r.stats.dropped} 页没能交付，其余页面正常。`)
  }

  function patchSlide(next) {
    setDeck((d) => ({ ...d, slides: slides.map((x, i) => (i === at ? next : x)) }))
  }

  function move(dir) {
    const to = at + dir
    if (to < 0 || to >= total) return
    setDeck((d) => {
      const arr = d.slides.slice()
      ;[arr[at], arr[to]] = [arr[to], arr[at]]
      return { ...d, slides: arr }
    })
    setCur(to)
  }

  function remove() {
    if (total <= 3) return
    setDeck((d) => ({ ...d, slides: d.slides.filter((_, i) => i !== at) }))
    setCur((v) => Math.max(0, Math.min(v, total - 2)))
  }

  async function doExport() {
    setExporting('pptx')
    setNote('')
    try {
      const r = await exportDeckPptx({ ...deck, slides })
      if (!r.elements) setNote('这份课件里没有可映射成 PPT 的元素，导出的是空白页。')
    } catch {
      /* 导出失败不该打断备课台，按钮自己会退回可点状态 */
      setNote('导出没成功，再点一次试试。')
    }
    setExporting('')
  }

  const chip = (on) =>
    `rounded-full border px-2.5 py-[3px] text-[12.5px] transition-colors ${
      on ? 'border-brand/50 bg-brand/15 text-white' : 'border-white/[0.08] text-ink-400 hover:border-white/25 hover:text-white/85'
    }`
  const btn =
    'grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-brand/60 hover:bg-brand/20 hover:text-white'
  const stage = prog?.stage === 'slides' ? 1 : prog ? 0.45 : 0

  return (
    /* 与互动课堂同一个栅格、同样常驻 DOM：切走再切回来，刚备好的课件和讲稿还在。
       所以可见性由自己管，hidden 时整棵子树不占位。 */
    <div className={`${active ? 'grid' : 'hidden'} mt-3 min-h-0 flex-1 gap-3.5 lg:grid-cols-[1.12fr_0.88fr]`}>
      {/* ―― 课件预览：官方画布直出 ―― */}
      <div className="relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#060a11] px-4 pb-3 pt-2.5 lg:min-h-[190px] xl:min-h-[225px] 2xl:min-h-[280px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_76%_0%,rgba(22,119,255,0.10),transparent_70%)]" />
        <div className="relative flex shrink-0 items-center gap-2">
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-brand/70" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/85">
            {busy ? prog?.title || '正在备课' : deck.title}
            <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-300">{typeLabel(s?.type)}</span>
          </p>
          <button
            type="button"
            onClick={doExport}
            disabled={!!exporting || !total}
            title="导出可编辑的 .pptx（讲稿进备注页）"
            className={btn}
          >
            <FileDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onSendToClass({ ...deck, slides })}
            disabled={!total}
            title="把这份课件送进互动课堂放映"
            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-brand/50 bg-brand/20 px-2 text-[12.5px] text-white transition-colors hover:bg-brand disabled:opacity-50"
          >
            <Play className="h-2.5 w-2.5" />
            送入课堂
          </button>
        </div>
        <div className="relative mt-1 flex shrink-0 items-baseline justify-between gap-3 border-b border-white/[0.06] pb-1.5">
          <p className="line-clamp-1 min-w-0 flex-1 text-[12.5px] text-ink-400">{busy ? '页面正在一页一页落地，右下角的缩略图可以点' : deck.subtitle}</p>
          <span className="shrink-0 font-mono text-[11px] tabular-nums tracking-[0.12em] text-ink-500">
            SLIDE {pad(at)} / {pad(Math.max(0, total - 1))}
          </span>
        </div>

        {/* 放映区：SlideCanvas 外层是 width/height:100%，父容器必须有确定宽高，
            所以这里用绝对定位撑满，不靠 flex 的隐式高度 */}
        <div className="relative mt-2 min-h-0 flex-1">
          <AnimatePresence mode="wait">
            {s ? (
              <motion.div
                key={`${deck.title}-${s.id || at}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: EASE }}
                className="absolute inset-0 overflow-hidden rounded-xl"
                data-prep="stage"
                style={{ background: pageColor(s) }}
              >
                <SlideCanvas slide={s} chrome={false} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center">
                <p className="text-[12.5px] text-ink-500">{busy ? '第一页还在路上…' : '这份课件没有可放的页'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 缩略图列：同一套 <SlideCanvas>，只是容器小 —— 所见即所得。
            104px 宽 ÷ 16:9 = 58.5px 高，正好占满整张卡，所以页码/页型/标题
            不写成可见小字（会把画面挤掉半截），只当 aria-label 给读屏 */}
        <div className="relative mt-2 flex shrink-0 items-stretch gap-1.5">
          <button type="button" onClick={() => setCur((v) => Math.max(0, v - 1))} disabled={at === 0} aria-label="上一页" className={btn}>
            <ChevronLeft className="h-3 w-3" />
          </button>
          <div data-lenis-prevent className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {slides.map((x, si) => {
              const title = slideTitle(x, `第 ${si + 1} 页`)
              return (
                <button
                  key={x.id || si}
                  type="button"
                  onClick={() => setCur(si)}
                  aria-label={`${pad(si)} ${typeLabel(x.type)} · ${title}`}
                  data-prep="thumb"
                  className={`w-[104px] shrink-0 overflow-hidden rounded-md border transition-colors ${
                    si === at ? 'border-brand/60' : 'border-white/[0.07] hover:border-white/25'
                  }`}
                >
                  {/* 官方硬要求：容器要有确定宽高。104px 宽 ÷ 16:9 = 58.5px 高 */}
                  <div className="relative h-[58px] w-full overflow-hidden" data-prep="thumb-canvas" style={{ background: pageColor(x) }}>
                    <SlideCanvas slide={x} chrome={false} canvasPercentage={100} />
                  </div>
                </button>
              )
            })}
            {busy &&
              Array.from({ length: Math.max(0, (prog?.count || pages) - (prog?.got || 0)) }).map((_, i) => (
                <div key={`pending-${i}`} className="h-[58px] w-[104px] shrink-0 animate-pulse rounded-md border border-dashed border-white/10 bg-white/[0.02]" />
              ))}
          </div>
          <button type="button" onClick={() => setCur((v) => Math.min(total - 1, v + 1))} disabled={at >= total - 1} aria-label="下一页" className={btn}>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ―― 备课输入 + 本页讲稿 ―― */}
      <div className="flex min-h-0 flex-col gap-2.5">
        <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-brand-400">智能备课 · 课程内容进，课件出</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {prepSamples.map((x) => (
              <button key={x.label} type="button" onClick={() => setContent(x.content)} className={chip(content === x.content)}>
                {x.label}
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(ev) => setContent(ev.target.value)}
            rows={3}
            placeholder="把讲义、教材段落或知识点清单贴进来，AI 会先出大纲再逐页生成幻灯与讲稿…"
            className="mt-2 h-[58px] w-full resize-none rounded-lg border border-white/[0.09] bg-[#060a11] px-2.5 py-1.5 text-[12.5px] leading-[1.6] text-white outline-none transition-colors placeholder:text-ink-500 focus:border-brand/60 [@media(max-height:820px)]:h-[42px]"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {prepLevels.map((x) => (
              <button key={x} type="button" onClick={() => setLevel(x)} className={chip(level === x)}>
                {x}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {prepStyles.map((x) => (
              <button key={x} type="button" onClick={() => setStyle(x)} className={chip(style === x)}>
                {x}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-1 text-[12.5px] text-ink-400">
              页数
              <button type="button" onClick={() => setPages((v) => Math.max(MIN_PAGES, v - 1))} aria-label="减少页数" className={btn}>
                <span className="text-[12.5px] leading-none">−</span>
              </button>
              <span className="w-4 text-center font-mono tabular-nums text-white">{pages}</span>
              <button type="button" onClick={() => setPages((v) => Math.min(MAX_PAGES, v + 1))} aria-label="增加页数" className={btn}>
                <span className="text-[12.5px] leading-none">+</span>
              </button>
            </span>
          </div>
          <button
            type="button"
            onClick={onBuild}
            disabled={busy || !content.trim()}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
          >
            <Sparkles className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            {busy ? '正在备课' : '生成讲课 PPT'}
          </button>
          <div className={`grid transition-all duration-300 ${busy ? 'mt-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                {['解析课程内容 · 出大纲', '逐页生成幻灯与讲稿'].map((label, si) => (
                  <span key={label} className="flex items-center gap-1.5 text-[12.5px]">
                    <span className={`h-1.5 w-1.5 rounded-full ${stage > si * 0.5 ? 'bg-brand' : 'bg-white/15'}`} />
                    <span className={stage > si * 0.5 ? 'text-white/85' : 'text-ink-500'}>{label}</span>
                  </span>
                ))}
                <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-brand-300">
                  已备好 {prog?.got || 0} / {prog?.count || pages} 页
                </span>
              </div>
              <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${prog?.count ? Math.round(((prog.got || 0) / prog.count) * 100) : 12}%`, transition: 'width .5s' }}
                />
              </div>
            </div>
          </div>
          {deck.source !== 'qwen' && !busy && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
              {deck.reason ? (
                <>当前是预制兜底课件（{deck.reason}）。服务端 .env 配好 QWEN_API_KEY 后，这里换成模型现写的 PPT。</>
              ) : (
                <>这是一份预制的示例课件（与模型产出同一种官方 Slide 格式）。点「生成讲课 PPT」就换成现写的那一份。</>
              )}
            </p>
          )}
          {note && !busy && <p className="mt-2 text-[12.5px] leading-relaxed text-[#F0B429]">{note}</p>}
        </div>

        {/* 本页讲稿：能改，改完就是教师自己要念的那段话 */}
        <div className="flex min-h-[92px] flex-1 flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5">
          <div className="flex shrink-0 items-center gap-2">
            <p className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">
              本页教师讲稿 · 第 {pad(at)} 页
            </p>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-500">{total} 页</span>
            <button type="button" onClick={() => move(-1)} disabled={at === 0} title="本页前移" className={btn}>
              <ArrowUp className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => move(1)} disabled={at >= total - 1} title="本页后移" className={btn}>
              <ArrowDown className="h-3 w-3" />
            </button>
            <button type="button" onClick={remove} disabled={total <= 3} title="删除本页" className={`${btn} disabled:opacity-30`}>
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <textarea
            key={s?.id || at}
            defaultValue={s?.script || ''}
            onBlur={(ev) => s && patchSlide({ ...s, script: ev.target.value })}
            data-lenis-prevent
            placeholder="这一页要讲的话…（失焦即保存到本页）"
            className="mt-1.5 min-h-0 w-full flex-1 resize-none bg-transparent text-[12.5px] leading-[1.7] text-white/75 outline-none placeholder:text-ink-500"
          />
          <p className="mt-1 shrink-0 text-[12px] text-ink-500">
            来源：{deck.source === 'qwen' ? `Qwen(${deck.model || model || '实时生成'})` : deck.reason ? '预制兜底课件 · 离线演示' : '预制示例课件 · 还没生成'}
            {online ? ' · 服务端在线' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
