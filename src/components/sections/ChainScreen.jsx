import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useInView } from 'motion/react'
import { ArrowUpRight, ExternalLink, Maximize2, Pause, Play, RotateCcw, X } from 'lucide-react'
import { blockchainProducts, productMatrix } from '../../data/site'
import { requestTrial, requestProductContact } from '../../lib/aiEngine'
import { ClipRail } from './ClipRail'

/* 区块链产品屏：放真实产品的操作录屏（登录 → 首页 → 专项页一镜到底）。
   截图视差的问题是「它终究是一张图」；录屏里光标会自己动、数据会自己跳，
   看一眼就知道这东西真的在跑。

   版面只服务一件事：让录屏尽可能大。所以
   1) 标题带压成一行、产品切换交给录屏下方那一排动画缩略图（ClipRail），
      垂直空间整块让给画面；
   2) 浏览器外壳、字幕、分镜刻度、hover 蒙版上的两个体验出口全部浮在画面上
      （不占录屏自己的一行高）；
   3) 1280×720 的真实界面缩到 800px 宽仍然偏小，所以给画面加了「影院」——
      点开放到整屏，才谈得上读清每一块面板。 */

const LAST = productMatrix.length - 1
const EASE = [0.22, 1, 0.36, 1]
/* 与 ProductMatrix 模块内同一口径：传入 0 基索引，输出 1 基序号 */
const pad = (i) => String(i + 1).padStart(2, '0')
/* 时间码用的零填充与上面的序号口径无关，不能复用 pad */
const z = (n) => String(n).padStart(2, '0')
const tc = (s) => `${z(Math.floor((s || 0) / 60))}:${z(Math.floor((s || 0) % 60))}`

/* 画面顶栏：把浏览器外壳和传输键浮在录屏上沿。
   录屏里产品自己也有顶栏，两层文字会打架 —— 所以只在暂停或鼠标进来时出现，
   放映中让位给画面本身 */
function TopBar({ clip, product, t, dur, playing, show, onToggle, onReplay, onExpand, onClose }) {
  const btn =
    'grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-brand/60 hover:bg-brand/20 hover:text-white'
  return (
    <div
      className={`absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-[#04070d]/92 via-[#04070d]/55 to-transparent px-3 pb-7 pt-2 transition-opacity duration-300 ${
        show ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-brand/70" />
      </span>
      <span className="ml-1 hidden min-w-0 shrink truncate font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400 sm:inline">
        {clip.domain}
      </span>
      <span className="ml-2 hidden min-w-0 shrink truncate text-[13px] font-medium text-white/85 lg:inline">
        {product.name}
        <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-300">{product.code}</span>
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <span className="font-mono text-[11px] tabular-nums tracking-[0.1em] text-ink-400">
          {tc(t)} / {tc(dur)}
        </span>
        <span className="relative flex h-1.5 w-1.5">
          {playing && <span className="absolute inline-flex h-full w-full animate-pingslow rounded-full bg-brand-400" />}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
        </span>
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-white/60 sm:inline">REAL FOOTAGE</span>
        <button type="button" onClick={onToggle} aria-label={playing ? '暂停' : '播放'} className={btn}>
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
        <button type="button" onClick={onReplay} aria-label="重播" className={btn}>
          <RotateCcw className="h-3 w-3" />
        </button>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="退出全屏" className={btn}>
            <X className="h-3 w-3" />
          </button>
        ) : (
          <button type="button" onClick={onExpand} aria-label="放大观看" className={btn}>
            <Maximize2 className="h-3 w-3" />
          </button>
        )}
      </span>
    </div>
  )
}

/* 画面底栏：当前幕字幕 + 分镜刻度。刻度既是进度条也是导航 */
function BottomBar({ at, chapters, t, dur, onSeek, index }) {
  const pct = dur ? Math.min(100, (t / dur) * 100) : 0
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#04070d] via-[#04070d]/80 to-transparent px-3 pb-2 pt-6">
      <div className="flex items-center gap-2.5">
        <span className="h-3 w-[2px] shrink-0 rounded-full bg-brand" />
        <AnimatePresence mode="wait">
          <motion.p
            key={at.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="min-w-0 flex-1 truncate text-[13px] text-white/85"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-300">{at.label}</span>
            <span className="mx-2 text-ink-500">/</span>
            {at.cap}
          </motion.p>
        </AnimatePresence>
        <span className="shrink-0 font-mono text-[11px] tabular-nums tracking-[0.12em] text-ink-400">
          {index + 1} / {chapters.length}
        </span>
      </div>
      <div className="relative mt-2 h-[3px] rounded-full bg-white/12">
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${pct}%` }} />
        {chapters.map((c) => (
          <span
            key={c.label}
            className="absolute top-1/2 h-[7px] w-[2px] -translate-y-1/2 rounded-full bg-white/40"
            style={{ left: `${dur ? (c.t / dur) * 100 : 0}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-stretch gap-1.5">
        {chapters.map((c) => {
          const on = c === at
          return (
            <button
              key={c.label}
              onClick={() => onSeek(c.t)}
              title={c.cap}
              className={`min-w-0 flex-1 truncate rounded-sm px-1 py-1 text-left font-mono text-[10px] uppercase tracking-[0.02em] transition-colors sm:px-1.5 sm:text-[11px] sm:tracking-[0.1em] ${
                on ? 'bg-brand text-white' : 'text-ink-400 hover:bg-white/[0.08] hover:text-white/85'
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* 一块屏：取景框按 16/9 走，不把产品界面裁掉；行高不够时 max-h-full 压回
   object-contain，多余的空间留给卡片同色底，不会出现生硬的黑边 */
function Surface({ clip, product, live, playing, t, dur, at, chapters, index, theater, onToggle, onReplay, onSeek, onExpand, onClose, videoRef, onTime, onMeta }) {
  /* 顶栏只在鼠标停在这块屏上、或已经暂停时出现：放映时把画面完整还给产品 */
  const [hover, setHover] = useState(false)
  /* 切片机时共用同一个 <video>，改 src 会 load() 清空当前帧 —— 新流就绪前露的是白底。
     用一个 ready 门控：视频层先透明，等 canplay 再淡入；底下那张深色海报常驻垫底。 */
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(false), [clip.src])
  /* '#' 与空都算没配：占位阶段宁可按钮置灰，也不能把人带到死链上去 */
  const demo = product.demo && product.demo !== '#' ? product.demo : ''
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative overflow-hidden border border-white/[0.09] bg-[#05080e] aspect-video ${
        theater
          ? 'h-full w-auto max-w-full max-h-[calc(100vh-6rem)] rounded-xl shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]'
          : 'w-full max-h-full lg:h-full lg:w-auto lg:max-w-full rounded-2xl'
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(62%_54%_at_50%_44%,rgba(22,119,255,0.10),transparent_72%)]" />
      {/* 海报常驻垫底：切片机 load() 清空当前帧时露出的是这张封面，而不是白底 */}
      <img
        src={clip.poster}
        alt=""
        className={`absolute inset-0 h-full w-full object-contain ${live ? '' : 'opacity-70'}`}
        loading={live ? 'eager' : 'lazy'}
        decoding="async"
      />
      {live && (
        <video
          ref={videoRef}
          data-film={theater ? 'theater' : 'stage'}
          src={clip.src}
          muted
          loop
          playsInline
          preload="metadata"
          onTimeUpdate={onTime}
          onLoadedMetadata={onMeta}
          onCanPlay={() => setReady(true)}
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0 }}
        />
      )}

      {/* 整块画面即点击暂停热区，浮层在它之上另起 z-10 */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? '暂停演示' : '播放演示'}
        className="absolute inset-0 z-[5] cursor-pointer"
      />
      {!playing && !hover && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-none absolute inset-0 z-[6] grid place-items-center bg-[#05080e]/40"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-brand/85 text-white shadow-glow">
            <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
          </span>
        </motion.span>
      )}

      {/* hover 蒙版：看完这段录屏正是决策点，两个出口就摆在画面本身之上 ——
          「申请体验」带着产品名与意向方向跳到联系表单，「前往体验」直接进产品环境。
          影院里不放：放大是为了看画面，不该被按钮挡住；暂停大图标让位给蒙版。
          蒙版本体 pointer-events-none、只给按钮开指针事件 —— 否则盖上一层暗底
          就把「点画面任意处暂停」的手势吃掉了。 */}
      <AnimatePresence>
        {hover && !theater && (
          <motion.div
            key="trial-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            data-trial="veil"
            className="pointer-events-none absolute inset-0 z-[7] grid place-items-center bg-[#03060b]/62"
          >
            <div className="flex flex-col items-center gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-300">体验项目 · {product.name}</p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  data-trial="apply"
                  onClick={() => requestTrial({ name: product.name, code: product.code, intent: product.intent })}
                  className="pointer-events-auto rounded-xl bg-brand px-4 py-2 text-[13.5px] font-medium text-white shadow-glow transition-colors hover:bg-brand-500"
                >
                  申请体验
                </button>
                {demo ? (
                  <a
                    data-trial="go"
                    href={demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/[0.06] px-4 py-2 text-[13.5px] font-medium text-white/90 transition-colors hover:border-white/50 hover:bg-white/15"
                  >
                    前往体验
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    data-trial="go"
                    disabled
                    title="体验地址待配置：在 src/data/site.js 里给该产品补上 demo 字段"
                    className="pointer-events-auto inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2 text-[13.5px] font-medium text-white/35"
                  >
                    前往体验
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TopBar
        clip={clip}
        product={product}
        t={t}
        dur={dur}
        playing={playing}
        show={hover || !playing}
        onToggle={onToggle}
        onReplay={onReplay}
        onExpand={onExpand}
        onClose={onClose}
      />
      <BottomBar at={at} chapters={chapters} t={t} dur={dur} onSeek={onSeek} index={index} />
    </div>
  )
}

function FilmStage({ clip, product, live, playing, setPlaying }) {
  const smallRef = useRef(null)
  const bigRef = useRef(null)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const [theater, setTheater] = useState(false)

  /* 换片必须显式 load()：三套录屏共用同一个 <video> 节点，只改 src 的话
     浏览器会带着上一片的播放头继续跑，用户一上来看到的是录屏中段。
     但首次挂载不能 load：元素自己会按 preload 发起加载，再叫一次只会把
     那个请求 abort 掉（实测就是因此卡在 readyState 0）。 */
  const srcRef = useRef(clip.src)
  useEffect(() => {
    if (srcRef.current === clip.src) return
    srcRef.current = clip.src
    setT(0)
    setDur(0)
    smallRef.current?.load()
  }, [clip.src])

  /* 两块屏（板块内 + 影院）共用一套传输状态，但同时只推可见的那块：
     影院开着时背后的小屏继续解码，等于白占一路硬解，滚动帧率会受牵连 */
  useEffect(() => {
    const on = playing && live
    const hot = (theater ? bigRef : smallRef).current
    const cold = (theater ? smallRef : bigRef).current
    if (hot) {
      if (on) hot.play().catch(() => {})
      else hot.pause()
    }
    cold?.pause()
  }, [live, playing, clip.src, theater])

  /* 进出影院时交接播放头，别让放大后的画面从片头重放 */
  useEffect(() => {
    const from = theater ? smallRef.current : bigRef.current
    const to = theater ? bigRef.current : smallRef.current
    if (from && to && from.currentTime) to.currentTime = from.currentTime
  }, [theater])

  /* 影院期间锁死页面滚动：站点是 Lenis 平滑滚动，光 overflow:hidden 拦不住 */
  useEffect(() => {
    if (!theater) return
    const lenis = window.__lenis
    lenis?.stop()
    const onKey = (e) => e.key === 'Escape' && setTheater(false)
    window.addEventListener('keydown', onKey)
    return () => {
      lenis?.start()
      window.removeEventListener('keydown', onKey)
    }
  }, [theater])

  /* timeupdate 每秒触发几十次，按 0.1s 取整再落 state，避免整块无谓重渲染 */
  const onTime = (e) => {
    const cur = Math.round(e.currentTarget.currentTime * 10) / 10
    setT((prev) => (Math.abs(prev - cur) >= 0.1 ? cur : prev))
  }
  const onMeta = (e) => setDur(e.currentTarget.duration || 0)

  const chapters = clip.chapters
  const at = chapters.filter((c) => c.t <= t + 0.05).pop() || chapters[0]
  const index = chapters.indexOf(at)

  const toggle = useCallback(() => setPlaying((v) => !v), [setPlaying])
  const seek = useCallback(
    (sec) => {
      setT(sec)
      setPlaying(true)
      const hot = (theater ? bigRef : smallRef).current
      if (!hot) return
      hot.currentTime = sec
      hot.play().catch(() => {})
    },
    [setPlaying, theater]
  )
  const replay = useCallback(() => seek(0), [seek])

  const shared = {
    clip,
    product,
    playing,
    t,
    dur,
    at,
    chapters,
    index,
    onTime,
    onMeta,
    onToggle: toggle,
    onReplay: replay,
    onSeek: seek,
  }

  return (
    <>
      <Surface
        {...shared}
        live={live}
        videoRef={smallRef}
        onExpand={() => {
          setTheater(true)
          setPlaying(true) /* 放大是为了看，别把暂停状态一起带进去 */
        }}
      />
      {createPortal(
        <AnimatePresence>
          {theater && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03050a]/94 p-4 backdrop-blur-sm md:p-8"
              onClick={(e) => e.target === e.currentTarget && setTheater(false)}
            >
              <Surface {...shared} live theater videoRef={bigRef} onClose={() => setTheater(false)} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

/* 缩略图选择条抽到 ClipRail.jsx：三套区块链产品只是第一个用户，
   后面补齐的模块产品页要拿同一条挂上去，所以它不待在这里。 */

export default function ChainScreen({ p, i, withIndex }) {
  const Icon = p.icon
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const stageRef = useRef(null)
  const inView = useInView(stageRef, { margin: '120px' })
  /* 进过一次视野就常驻挂载：来回滚动时不该反复重建 <video> 与重新解码 */
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (inView) setMounted(true)
  }, [inView])
  const live = mounted

  const cur = blockchainProducts[active]

  /* 切产品时回到开头并重播，别停在上一段的中途 */
  useEffect(() => setPlaying(true), [active])

  /* 滚出视野就真停：三块产品共用一个 sticky 舞台，偷偷解码会吃掉滚动帧率 */
  const play = playing && inView

  return (
    <div className="relative flex h-full flex-col justify-center">
      <span className="pointer-events-none absolute -top-4 right-0 select-none text-[110px] font-bold leading-none text-white/[0.045] xl:text-[150px]">
        {pad(i)}
      </span>

      <div ref={stageRef} className="relative flex min-h-0 flex-1 flex-col">
        {/* 标题带：产品切换已经交给下面的缩略图，这里只留板块自述 */}
        <div className="shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-glow">
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-brand-400">{p.en}</p>
            {withIndex && (
              <p className="text-[12.5px] tabular-nums text-ink-400">
                {pad(i)} / {pad(LAST)}
              </p>
            )}
          </div>
          <h3 className="mt-2.5 text-[22px] font-bold tracking-tight text-white md:text-[27px] xl:text-[32px]">{p.title}</h3>
          <p className="mt-1 text-[13.5px] font-medium text-brand-300 xl:text-[15px]">{p.tagline}</p>
        </div>

        {/* 录屏：减掉缩略图那一行后剩下的空间全给它。桌面钉屏行高有限，卡片按高度
            收身成 16:9（lg:h-full lg:w-auto）并居左（与上方标题左缘对齐），宽视口下不再
            撑成超宽盒而在两侧露出深色黑边；移动端（<lg）行高不定，退回 w-full 按宽铺满 */}
        <div className="mt-3 flex min-h-0 flex-1 items-center justify-start">
          <FilmStage clip={cur.clip} product={cur} live={live} playing={play} setPlaying={setPlaying} />
        </div>

        {/* 三套（未来 N 套）产品的动画缩略图：悬停即播，点一下换台 */}
        <div className="mt-2.5">
          <ClipRail products={blockchainProducts} active={active} onPick={setActive} />
        </div>

        {/* 说明占满整宽放第一行，指标与咨询并列第二行：跟按钮挤一行会把说明压成一竖条 */}
        <div className="mt-3 grid shrink-0 grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-2.5">
          <p
            className="col-span-2 line-clamp-2 min-w-0 text-[13px] leading-[1.65] text-ink-400 [@media(max-height:820px)]:line-clamp-1"
            title={cur.desc}
          >
            <span className="font-medium text-white/85">{cur.tag}</span>
            <span className="mx-2 text-ink-500">/</span>
            {cur.desc}
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {cur.specs.map(([k, v]) => (
              <li key={k} className="whitespace-nowrap text-[12.5px] text-ink-400">
                {k}
                <span className="ml-1.5 text-[14px] font-bold tracking-tight text-white">{v}</span>
              </li>
            ))}
          </ul>
          <a
            href="/#contact"
            onClick={(e) => {
              e.preventDefault()
              requestProductContact({ name: cur.name, code: cur.code, intent: cur.intent || p.intent, source: `chain-scheme-${cur.code}`, cta: `索取 ${cur.name} 实训方案` })
            }}
            className="group ml-auto inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2 text-[13px] font-medium text-brand-200 transition-colors hover:bg-brand hover:text-white"
          >
            索取 {cur.code} 实训方案
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
