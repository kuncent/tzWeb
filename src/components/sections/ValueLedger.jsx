import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Ruler, ChevronDown } from 'lucide-react'
import { Reveal, SectionHead } from '../ui'
import { ledgerHead, ledgerTop, ledgerBooks, ledgerAsset } from '../../data/site'

/* ============================================================
 * 价值账（量化 ROI · 可尽调）—— 暗底「章节带」
 * ------------------------------------------------------------
 * 全站十几屏都是白 / mist 浅底 + 同款卡片，滚下来像一堵墙。这里
 * 故意翻成深夜蓝（与首屏、AI 屏同一 bg-night），当一次强节奏的分段，
 * 让读者的眼睛知道「进入结论区了」。
 *
 * 头条四笔账不再是四张删改线小卡，而是一枚「前后对比滑块」：左半是
 * 天择之后的蓝、右半是现状的灰，拖着中线把未来一点点擦过现状 —— 把
 * before→after 这件事从「读」变成「亲手划」。数字全部沿用站内既有口径。
 *
 * 为降低同质化，这一屏刻意不套 SpotlightGlow / spotMove / Tilt。
 * ============================================================ */

/* 头条账：一枚「状态擦洗器」。滑块控制 0→1 的进度，四个值在同一格内
   前后叠放、按进度交叉淡入淡出 —— 语义唯一（一个控件统一对照同一笔账），
   默认停在「天择之后」（蓝色数字好看），拖回左端看「现状」。 */
function CompareSlider({ items }) {
  const trackRef = useRef(null)
  const dragging = useRef(false)
  const [t, setT] = useState(1) // 0 = 现状 / 1 = 天择之后

  const setFromX = (clientX) => {
    const el = trackRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setT(Math.max(0, Math.min(1, (clientX - r.left) / r.width)))
  }
  const onDown = (e) => {
    dragging.current = true
    trackRef.current?.setPointerCapture?.(e.pointerId)
    setFromX(e.clientX)
  }
  const onMove = (e) => { if (dragging.current) setFromX(e.clientX) }
  const onUp = () => { dragging.current = false }
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { setT((v) => Math.max(0, v - 0.05)); e.preventDefault() }
    else if (e.key === 'ArrowRight') { setT((v) => Math.min(1, v + 0.05)); e.preventDefault() }
    else if (e.key === 'Home') { setT(0); e.preventDefault() }
    else if (e.key === 'End') { setT(1); e.preventDefault() }
  }
  /* smoothstep：把交叉淡变收敛到中段附近，两端各自干净；配合上下滚位避开同位叠字鬼影 */
  const s = t * t * (3 - 2 * t)

  return (
    <Reveal delay={0.06} className="mt-12">
      <div className="rounded-2xl border border-white/12 bg-[#070b13]/85 p-6 shadow-2xl ring-1 ring-white/5 sm:p-9">
        {/* 两端标签随进度此消彼长 */}
        <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.2em]">
          <span className="text-white/45" style={{ opacity: 0.4 + 0.6 * (1 - s) }}>现状 · Before</span>
          <span className="text-brand-300" style={{ opacity: 0.4 + 0.6 * s }}>天择之后 · After</span>
        </div>

        {/* 四笔账：每格两个值叠放，按 t 交叉淡入淡出 */}
        <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.k} className="flex items-end justify-between gap-4 border-b border-white/[0.07] pb-4">
              <span className="text-[13px] text-white/60">{it.k}</span>
              <span className="grid text-right">
                <span
                  className="col-start-1 row-start-1 whitespace-nowrap text-[24px] font-bold leading-none tracking-tight text-white/40 line-through decoration-white/25 transition-[opacity,transform] duration-150"
                  style={{ opacity: 1 - s, transform: `translateY(${-8 * s}px)` }}
                >
                  {it.a}
                </span>
                <span
                  className="col-start-1 row-start-1 whitespace-nowrap text-[24px] font-bold leading-none tracking-tight text-brand-200 transition-[opacity,transform] duration-150"
                  style={{ opacity: s, transform: `translateY(${8 * (1 - s)}px)` }}
                >
                  {it.b}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* 擦洗器轨道 + 抓手 */}
        <div className="mt-8 flex items-center gap-4">
          <span className="shrink-0 text-[11px] text-white/40">现状</span>
          <div
            ref={trackRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{ touchAction: 'pan-y' }}
            className="group/trk relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/10"
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${t * 100}%` }} />
            <button
              type="button"
              role="slider"
              aria-label="拖动对照：现状 与 天择之后"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(t * 100)}
              onKeyDown={onKey}
              style={{ left: `${t * 100}%` }}
              className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-[#0b1220] shadow-glow transition-transform duration-150 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </div>
          <span className="shrink-0 text-[11px] text-brand-300">天择之后</span>
        </div>
        <p className="mt-3.5 text-center text-[12px] text-ink-400">拖动滑块，在「现状」与「天择之后」之间对照同一笔账</p>
      </div>
    </Reveal>
  )
}

function BookCard({ book, i }) {
  const Icon = book.icon
  return (
    <Reveal delay={i * 0.08} className="h-full">
      <div className="flex h-full flex-col rounded-2xl border border-white/12 bg-white/[0.03] p-7 transition-colors duration-300 hover:border-brand/40 hover:bg-white/[0.05]">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-400/85 to-brand text-white shadow-glow">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-[17px] font-bold tracking-tight text-white">{book.name}</h3>
            <p className="text-[12px] text-white/40">{book.tag}</p>
          </div>
        </div>
        <ul className="mt-6 space-y-4">
          {book.rows.map((r) => (
            <li key={r.k}>
              <p className="text-[12.5px] text-white/45">{r.k}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]">
                <span className="text-white/35 line-through decoration-white/25">{r.a}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand/70" />
                <span className="font-semibold text-brand-200">{r.b}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-start gap-2 rounded-xl border border-dashed border-brand/30 bg-brand/[0.08] px-4 py-3">
          <span className="mt-[1px] shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-300">怎么验</span>
          <p className="text-[12.5px] leading-relaxed text-white/65">{book.check}</p>
        </div>
      </div>
    </Reveal>
  )
}

/* 度量方法学：把上面那四个数从「断言」变成「可核对」。
   口径 / 基线 / 怎么验都取自站内既有口径（效率账、质量账的 check 与交付路径），
   没有样本量的地方写「现场逐条复查」而不是编一个 n。 */
const ledgerMethod = [
  { k: '备课周期', v: '3–10 分钟', def: '同一主题，从下达任务到课件 / 测验 / 项目全部就绪、可直接上课的耗时。', base: '教师手工备课', verify: '现场给一个主题，我们当堂出课，您计时。' },
  { k: '课堂互动率', v: '+38%', def: '单位时间内主动应答 / 提问的人次，占班级人数的比例。', base: '讲授型班级的现场基线', verify: '调取任一班级的学情看板逐条复查。' },
  { k: '实验室利用率', v: '92%', def: '设备实际机时 ÷ 可开放机时。', base: '未做开放管理的传统实验室', verify: '开放设备台账与排课系统按周导出核对。' },
  { k: '首批开课', v: '9–13 周', def: '从签约到首批课程可上讲台的自然周。', base: '自建自研的常规周期', verify: '按交付路径六步的周期表逐项对照。' },
]

function Methodology() {
  const [open, setOpen] = useState(0)
  return (
    <Reveal delay={0.1} className="mt-6 rounded-2xl border border-white/12 bg-white/[0.03] p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Ruler className="h-4 w-4 text-brand-300" />
        <h3 className="text-[15px] font-semibold text-white">度量方法学</h3>
        <span className="text-[12.5px] text-white/45">· 每个数都写清口径、基线与现场怎么核对</span>
      </div>
      <div className="mt-4 border-y border-white/[0.07]">
        {ledgerMethod.map((m, i) => {
          const on = open === i
          return (
            <div key={m.k} className="border-b border-white/[0.07] last:border-b-0">
              <button
                type="button"
                onClick={() => setOpen(on ? null : i)}
                aria-expanded={on}
                className="flex w-full items-center gap-4 py-4 text-left"
              >
                <ChevronDown className={`h-4 w-4 shrink-0 text-brand-300 transition-transform duration-300 ${on ? 'rotate-180' : ''}`} />
                <span className="min-w-0 flex-1 text-[14px] font-medium text-white">{m.k}</span>
                <span className="shrink-0 text-[15px] font-bold tabular-nums text-brand-200">{m.v}</span>
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <dl className="grid gap-x-8 gap-y-3 pb-5 pl-8 sm:grid-cols-3">
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.14em] text-white/35">口径</dt>
                        <dd className="mt-1 text-[13px] leading-relaxed text-white/70">{m.def}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.14em] text-white/35">基线</dt>
                        <dd className="mt-1 text-[13px] leading-relaxed text-white/70">{m.base}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.14em] text-brand-300">怎么验</dt>
                        <dd className="mt-1 text-[13px] leading-relaxed text-brand-100">{m.verify}</dd>
                      </div>
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-[12px] text-white/40">
        以上口径均可在演示现场复现；需完整取数与统计口径，可
        <Link to="/technology" className="mx-1 text-brand-300 underline decoration-brand/40 underline-offset-2 hover:text-brand-200">在技术页</Link>
        或联系我们时索取。
      </p>
    </Reveal>
  )
}

export default function ValueLedger() {
  return (
    <section id="value" className="relative overflow-hidden bg-night sec-y text-white">
      {/* 顶部一层极淡的品牌蓝辉光，把纯黑压出纵深（CSS 径向渐变，不上 backdrop-filter） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: 'radial-gradient(58% 100% at 50% 0%, rgba(22,119,255,0.16), transparent 72%)' }}
      />
      <div className="container-x relative">
        <SectionHead id="value" tone="dark" n="10" en={ledgerHead.en} zh={ledgerHead.zh} sub={ledgerHead.sub} />

        {/* 头条四笔账 → 前后对比滑块 */}
        <CompareSlider items={ledgerTop} />

        {/* 度量方法学：把这几个数变成可核对 */}
        <Methodology />

        {/* 三本账 */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {ledgerBooks.map((b, i) => (
            <BookCard key={b.name} book={b} i={i} />
          ))}
        </div>

        {/* 资产账收口 */}
        <Reveal delay={0.1} className="mt-6 rounded-2xl border border-white/12 bg-white/[0.03]">
          <div className="grid items-center gap-8 p-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:p-10">
            <div className="min-w-0">
              <h3 className="text-[19px] font-bold tracking-tight text-white md:text-[21px]">{ledgerAsset.title}</h3>
              <p className="mt-3 text-[14px] leading-[1.85] text-white/55">{ledgerAsset.desc}</p>
            </div>
            <ul className="grid grid-cols-3 gap-3">
              {ledgerAsset.stats.map((s) => (
                <li key={s.k} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-5 text-center">
                  <p className="text-[22px] font-bold tracking-tight text-brand-200">{s.v}</p>
                  <p className="mt-1.5 text-[11px] text-white/45">{s.k}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
