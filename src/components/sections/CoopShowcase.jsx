import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Users, BookOpenCheck, Microscope, GraduationCap, Award } from 'lucide-react'
import { coopCategories } from '../../data/cooperation'
import { scrollToId } from '../../hooks/useLenis'

const ICONS = { conference: Users, textbook: BookOpenCheck, project: Microscope, training: GraduationCap, competition: Award }

/* 合作实景 · 左侧悬浮目录 + 右侧五章连续叙事。
   目录只负责定位与滚动高亮，不再切换内容；每一章独立组织标题、文案、交付点与舞台：
     01 学术会议：横向时间胶片，会场纪事沿年份流动
     02 出版教材：左侧出版叙事，右侧可抽取的书封展台
     03 产学研合作：拼贴现场与项目笔记左右对读
     04 师资培训：深色成长路径，手风琴展开每次培训现场
     05 以赛促学：数据海报与赛场幻灯收束到「学 — 练 — 赛 — 用」 */

const CAPTION_BAR =
  'absolute inset-x-0 bottom-0 flex items-center gap-2.5 border-t border-white/10 bg-black/45 px-3 py-2 backdrop-blur-[6px]'

const pad = (i) => String(i + 1).padStart(2, '0')

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

/* 字幕条：左侧细线 + 编号，右侧计数。五个板块共用，保证节奏一致 */
function CaptionBar({ index, total, text, tone = 'light' }) {
  return (
    <div className={CAPTION_BAR}>
      <span aria-hidden className="h-3 w-[2px] shrink-0 rounded-full bg-brand" />
      <span className={`shrink-0 font-mono text-[10px] tabular-nums tracking-[0.16em] ${tone === 'light' ? 'text-white/40' : 'text-ink-400'}`}>
        {index} / {total}
      </span>
      <p key={text} className="coop-swap min-w-0 flex-1 truncate text-[12.5px] text-white/80">
        {text}
      </p>
    </div>
  )
}

/* ―― 01 学术会议：35mm 双卷 ——
   左边收卷、右边放卷，卷径按面积守恒开方算，转到底会反向倒片，来回都连续。
   优化点：卷筒由黄铜改成冷调钢（高光偏冷、轴头不抢戏），片边印字降饱和、
   印字只用等宽字体 + brand 蓝标当前年份，视口外的字幕统一交给底部字幕条。
   齿孔挂在胶片本体上，节距 = 帧宽/8，画格边界正好落在孔与孔之间。 */
const FILM_BASE = '#0a0c11'
const PERF_HOLE =
  'repeating-linear-gradient(90deg, transparent 0 calc(var(--pitch) * 0.31), rgba(222,230,242,0.7) calc(var(--pitch) * 0.31) calc(var(--pitch) * 0.69), transparent calc(var(--pitch) * 0.69) var(--pitch))'
const PERF_RIM =
  'repeating-linear-gradient(90deg, transparent 0 calc(var(--pitch) * 0.27), rgba(0,0,0,0.9) calc(var(--pitch) * 0.27) calc(var(--pitch) * 0.73), transparent calc(var(--pitch) * 0.73) var(--pitch))'
const PERF_MASK =
  'linear-gradient(180deg, transparent 0 3px, #000 3px 9px, transparent 9px calc(100% - 9px), #000 calc(100% - 9px) calc(100% - 3px), transparent calc(100% - 3px))'
const perfStyle = {
  backgroundImage: `${PERF_HOLE}, ${PERF_RIM}`,
  backgroundRepeat: 'repeat-x, repeat-x',
  maskImage: PERF_MASK,
  WebkitMaskImage: PERF_MASK,
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
}
/* 卷筒柱面：卷绕层沿轴向叠起来，纹理是横向细线；对比压得很低，粗了就像螺纹杆 */
const ROLL_LAYERS =
  'repeating-linear-gradient(180deg, rgba(255,255,255,0.07) 0 1px, rgba(0,0,0,0.24) 1px 2px, transparent 2px 3px)'
const ROLL_SHADE =
  'linear-gradient(90deg, #04060a 0%, #0f141c 14%, #2a3340 30%, #536175 41%, #232b37 62%, #0c1017 84%, #04060a 100%)'
const ROLL_CAP = 'repeating-radial-gradient(ellipse at center, #080b10 0 1.5px, #4d586a 1.5px 3px)'
const ROLL_AXLE = 'linear-gradient(90deg, #38404d, #cfd8e6 42%, #5d6878)'
const ROLL_KNOB = 'radial-gradient(circle at 34% 28%, #e8eef8, #8d97a6 58%, #3f4855)'
const BAND = 12
const GAP_TOP = 14
const GAP_BOT = 12
const stripHeight = (fw) => Math.round((fw - 12) * 0.75) + BAND * 2 + GAP_TOP + GAP_BOT

function FilmReel({ items }) {
  const n = items.length
  const [fw, setFw] = useState(236)
  const fwRef = useRef(236)
  const gateW = useRef(620)
  const gateEl = useRef(null)
  const slotEl = useRef(null)
  const total = n * fw
  const SPEED = 44
  const FMIN = 0.42
  const FMAX = 0.96
  const NOMINAL_R = 40
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const hoverSlow = useRef(false)
  const [gate, setGate] = useState(0)
  const [winding, setWinding] = useState(true)
  const off = useRef(0)
  const dir = useRef(1)
  const angL = useRef(0)
  const angR = useRef(0)
  const surf = useRef(0)
  const track = useRef(null)
  const perf = useRef(null)
  const L = useRef({})
  const R = useRef({})
  const yearOf = (it) => it?.caption.match(/^\d{4}/)?.[0] ?? '··'

  /* 端面椭圆高度跟着卷径微调，卷筒本体宽度固定：照片从卷筒内缘开始，
     不会随卷径缩出去一截空片基 */
  const sizeRoll = (r, f) => {
    const cap = Math.max(5, f * 26)
    if (r.root) r.root.style.setProperty('--cap', `${cap}px`)
    if (r.layers) r.layers.style.backgroundPositionY = `${surf.current}px`
    if (r.seam) r.seam.style.transform = `rotate(${r === L.current ? angL.current : angR.current}deg)`
  }

  const apply = useCallback((dt, sp = SPEED) => {
    const o = off.current
    const p = o / total
    const a = FMIN * FMIN
    const b = FMAX * FMAX
    const fL = Math.sqrt(a + (b - a) * p)
    const fR = Math.sqrt(b - (b - a) * p)
    if (dt) {
      const k = ((dt * sp * 180) / Math.PI / NOMINAL_R) * dir.current
      angL.current += k / fL
      angR.current += k / fR
      surf.current += dt * sp * dir.current
    }
    if (track.current) track.current.style.transform = `translate3d(${-o}px,0,0)`
    if (perf.current) perf.current.style.backgroundPositionX = `${-o}px`
    sizeRoll(L.current, fL)
    sizeRoll(R.current, fR)
    const g = Math.min(n - 1, Math.max(0, Math.floor((o + gateW.current / 2) / fw) % n))
    setGate((prev) => (prev === g ? prev : g))
  }, [n, total, fw])

  useEffect(() => {
    const el = gateEl.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      gateW.current = el.clientWidth
      const next = Math.round(Math.max(168, Math.min(248, el.clientWidth / 2.7)))
      const prev = fwRef.current
      if (next === prev) return
      off.current = (off.current / prev) * next
      fwRef.current = next
      setFw(next)
    })
    ro.observe(el)
    if (slotEl.current) ro.observe(slotEl.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { apply(0) }, [apply])

  useEffect(() => {
    if (reduced.current) return
    let raf = 0
    let last = performance.now()
    const tick = (t) => {
      const dt = Math.max(0, Math.min(0.05, (t - last) / 1000))
      last = t
      const sp = SPEED * (hoverSlow.current ? 0.22 : 1)
      const next = off.current + dt * sp * dir.current
      if (next >= total) {
        off.current = total
        dir.current = -1
        setWinding(false)
      } else if (next <= 0) {
        off.current = 0
        dir.current = 1
        setWinding(true)
      } else {
        off.current = next
      }
      apply(dt, sp)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [total, apply])

  const roll = (r, label, side, first) => (
    <div className="relative flex shrink-0 flex-col items-center">
      <div
        ref={first ? slotEl : undefined}
        className="relative w-[34px] shrink-0 sm:w-[38px] md:w-[42px] lg:w-[46px] xl:w-[50px]"
        style={{ height: stripHeight(fw), '--pitch': `${fw / 8}px` }}
      >
        {/* 卷筒本体占满整列：内缘就是照片的起点，胶片像真的卷进筒里 */}
        <div
          ref={(el) => { r.current.root = el }}
          className="absolute inset-0"
          style={{ '--cap': '10px' }}
        >
          <span aria-hidden className="absolute -top-4 left-1/2 h-[calc(100%+32px)] w-[4px] -translate-x-1/2 rounded-full" style={{ backgroundImage: ROLL_AXLE }} />

          {/* 柱面 */}
          <span aria-hidden className="absolute inset-0 overflow-hidden rounded-[1px] shadow-[0_12px_24px_rgba(0,0,0,0.7)]" style={{ backgroundImage: ROLL_SHADE }}>
            <span ref={(el) => { r.current.layers = el }} className="absolute inset-0" style={{ backgroundImage: ROLL_LAYERS }} />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55),transparent_14%,transparent_86%,rgba(0,0,0,0.55))]" />
            <span className="absolute inset-y-0 left-[30%] w-[9%] bg-white/16 blur-[2px]" />
            <span className="absolute inset-y-0 left-0 w-[2px] bg-black/70" />
            <span className="absolute inset-y-0 right-0 w-[2px] bg-black/70" />
          </span>

          {/* 上端面：同心卷绕层 + 旋转接缝 + 轴心 */}
          <span aria-hidden className="absolute inset-x-0 overflow-hidden rounded-[50%] border border-black/70" style={{ top: 'calc(var(--cap) / -2)', height: 'var(--cap)', backgroundImage: ROLL_CAP }}>
            <span ref={(el) => { r.current.seam = el }} className="absolute left-1/2 top-1/2 aspect-square w-full -translate-x-1/2 -translate-y-1/2 will-change-transform" style={{ backgroundImage: 'conic-gradient(from 0deg, rgba(255,255,255,0.28) 0deg 12deg, transparent 12deg 180deg, rgba(0,0,0,0.4) 180deg 192deg, transparent 192deg 360deg)' }} />
            <span className="absolute inset-0 rounded-[50%] bg-[linear-gradient(120deg,rgba(215,230,255,0.22),transparent_52%)]" />
            <span className="absolute left-1/2 top-1/2 h-[38%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[#080a0f] shadow-[0_0_0_1px_rgba(0,0,0,0.75)]" />
          </span>
          <span aria-hidden className="absolute inset-x-0 overflow-hidden rounded-[50%] border border-black/70" style={{ bottom: 'calc(var(--cap) / -2)', height: 'var(--cap)', backgroundImage: ROLL_CAP }}>
            <span className="absolute inset-0 rounded-[50%] bg-black/60" />
          </span>

          <span aria-hidden className="absolute left-1/2 h-[8px] w-[12px] -translate-x-1/2 rounded-full border border-black/60" style={{ top: 'calc(var(--cap) / -2 - 11px)', backgroundImage: ROLL_KNOB }} />
          <span aria-hidden className="absolute left-1/2 h-[8px] w-[12px] -translate-x-1/2 rounded-full border border-black/60" style={{ bottom: 'calc(var(--cap) / -2 - 11px)', backgroundImage: ROLL_KNOB }} />
        </div>
      </div>
      <span className="absolute left-1/2 top-full mt-2.5 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
        {label}
        <span className="hidden sm:inline"> {side === 'left' ? 'take-up' : 'supply'}</span>
      </span>
    </div>
  )

  return (
    <div
      className="relative flex h-full min-h-[330px] flex-col overflow-hidden"
      onMouseEnter={() => { hoverSlow.current = true }}
      onMouseLeave={() => { hoverSlow.current = false }}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 px-3 pb-12 pt-3 md:px-4">
        <div className="flex items-center justify-between px-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">35mm · 2019 — 2026</p>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-white/30 sm:inline">{winding ? '收卷中' : '倒片中'}</span>
            <span aria-hidden className="hidden h-3 w-px bg-white/15 sm:block" />
            <span className="font-mono text-[10px] tabular-nums tracking-[0.16em] text-brand-300/85">卷至 {yearOf(items[gate])}</span>
          </div>
        </div>

        {/* 胶片带夹在两个卷筒之间：卷筒内缘就是照片的起点与终点 */}
        <div className="flex min-h-0 flex-1 flex-nowrap items-center justify-between">
          {roll(L, '收卷', 'left', true)}

          <div ref={gateEl} className="relative min-w-0 flex-1 overflow-hidden" style={{ height: stripHeight(fw), '--pitch': `${fw / 8}px` }}>
            <div ref={track} className="relative flex w-max will-change-transform" style={{ height: '100%', backgroundColor: FILM_BASE }}>
              <span ref={perf} aria-hidden className="absolute inset-x-0 top-0" style={{ height: '100%', ...perfStyle }} />
              {[...items, ...items].map((it, i) => (
                <div key={`${it.src}-${i}`} style={{ width: fw }} className="group relative shrink-0">
                  <span className="absolute inset-x-0 truncate text-center font-mono text-[8px] leading-[10px] tracking-[0.2em] text-white/25" style={{ top: BAND + 2 }}>
                    TZ-5247 · {yearOf(it)} · {String((i % n) + 1).padStart(2, '0')}A
                  </span>
                  <span className="absolute overflow-hidden rounded-[1px] ring-1 ring-white/10" style={{ left: 6, right: 6, top: BAND + GAP_TOP, bottom: BAND + GAP_BOT }}>
                    <img
                      src={it.src}
                      alt={it.caption}
                      loading={i < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="h-full w-full object-cover contrast-[1.04] saturate-[0.9] transition-[filter,transform] duration-500 group-hover:scale-[1.04] group-hover:saturate-100"
                    />
                  </span>
                  <span className="absolute inset-x-0 text-center font-mono text-[8px] leading-[9px] tracking-[0.24em] text-white/20" style={{ bottom: BAND + 2 }}>
                    ▸ {String((i % n) + 1).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
            {/* 卷筒与片头的接触影：只压最外 20px，照片边缘贴着卷筒，不隔空片 */}
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-black/80 to-transparent" />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-black/80 to-transparent" />
          </div>

          {roll(R, '放卷', 'right', false)}
        </div>
      </div>

      <CaptionBar index={pad(gate)} total={String(n).padStart(2, '0')} text={items[gate]?.caption} />
    </div>
  )
}

/* ―― 02 出版教材 ――
   八本书封一字排开，落在一条不受光的暗台面上，脚下带倒影；
   点击书封走 FLIP：被点那本的副本从原位飞向主展台并放大，
   同时上一本的副本从主展台缩回它重排后的槽位 —— 起点与落点都取自真实布局，
   所以“升起 / 插回”不会对不上位置。飞行结束才把主展台交还给 React 渲染。
   没有书架、没有铜牌。 */
const rectOf = (el) => {
  const r = el.getBoundingClientRect()
  const num = (v) => (Number.isFinite(v) ? v : 0)
  return { left: num(r.left), top: num(r.top), width: num(r.width), height: num(r.height) }
}

/* 飞行副本：从起点直接补间到落点，起落两端都是真实布局位置；
   上台与回架用同一条轨迹（上台只是反向放大），不做侧向抽出之类的多余动作。 */
function FlyingCover({ src, from, to, big = false }) {
  const ref = useRef(null)
  const px = (v) => `${v}px`

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !to) return
    const box = (b) => ({ left: px(b.left), top: px(b.top), width: px(b.width), height: px(b.height) })
    const anim = el.animate([box(from), box(to)], {
      duration: 620,
      easing: 'cubic-bezier(.32,.74,.24,1)',
      fill: 'forwards',
    })
    return () => anim.cancel()
  }, [to]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      aria-hidden
      style={{
        position: 'fixed',
        left: from.left,
        top: from.top,
        width: from.width,
        height: from.height,
      }}
      className={`pointer-events-none z-[80] rounded-[3px] object-cover ring-1 ring-white/25 ${
        big ? 'shadow-[0_30px_60px_-18px_rgba(0,0,0,0.9)]' : 'shadow-[0_16px_30px_-12px_rgba(0,0,0,0.8)]'
      }`}
    />
  )
}

function TextbookStage({ items }) {
  const n = items.length
  const [cur, setCur] = useState(0)
  /* flight：正在飞行的一对副本；prev 是即将回架的那本 */
  const [flight, setFlight] = useState(null)
  const imgRefs = useRef([])
  const featRef = useRef(null)
  const shelfRef = useRef(null)
  const lock = useRef(false)
  /* 书封宽窄略有参差，高度由书封自身比例决定：整排共底、顶上不齐，才像真的一排书 */
  const WIDTH = [90, 84, 94, 86, 92, 82, 96, 88]

  /* 预载全部书封：主展台的图是按「高度定死、宽度自适应」排的，
     图还没解码时量到的宽度是 0，飞行目标就会缩成一条线 —— 先把素材都放进缓存 */
  useEffect(() => {
    items.forEach((it) => {
      const im = new Image()
      im.src = it.src
    })
  }, [items])

  const pull = (i) => {
    if (flight || lock.current || i === cur) return
    const src = imgRefs.current[i]
    const feat = featRef.current
    const shelf = shelfRef.current
    const prevImg = imgRefs.current[cur]
    /* 系统开了减少动态就不飞，直接换 */
    if (!src || !feat || !shelf || !prevImg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCur(i)
      return
    }
    const fromShelf = rectOf(src)
    const fromFeat = rectOf(feat)
    const prev = cur

    /* 回架落点：重排后槽位是等分的 n-1 份，直接从行的几何算，
       不去量「正在过渡中的槽位」——那量到的是过渡起点，会落在错的位置 */
    const row = shelf.getBoundingClientRect()
    const cs = getComputedStyle(shelf)
    const padL = parseFloat(cs.paddingLeft) || 0
    const inner = row.width - padL - (parseFloat(cs.paddingRight) || 0)
    const slotW = inner / Math.max(1, n - 1)
    const order = prev - (i < prev ? 1 : 0)
    const cx = row.left + padL + slotW * (order + 0.5)
    const pRect = rectOf(prevImg)
    const toShelf = {
      left: cx - pRect.width / 2,
      /* 槽位横向重排，但共底不动，书的 top 与尺寸和现在一致 */
      top: pRect.top,
      width: pRect.width,
      height: pRect.height,
    }

    setCur(i)
    lock.current = true
    setFlight({ src: items[i].src, prevSrc: items[prev].src, prev, fromShelf, fromFeat, toShelf, toFeat: null })
  }

  /* 换书后布局已重排：新主封面的真实位置就是要落到的地方。
     图还没解码完时宽度会是 0，先等几帧再量，避免落到一条线上 */
  useLayoutEffect(() => {
    if (!flight || flight.toFeat) return
    let raf = 0
    let tries = 0
    const measure = () => {
      const feat = featRef.current
      if (!feat) {
        setFlight(null)
        return
      }
      const r = feat.getBoundingClientRect()
      if (r.width < 2 && tries < 24) {
        tries += 1
        raf = requestAnimationFrame(measure)
        return
      }
      setFlight((f) => (f ? { ...f, toFeat: rectOf(feat) } : f))
    }
    measure()
    return () => cancelAnimationFrame(raf)
  }, [flight])

  useEffect(() => {
    if (!flight) {
      lock.current = false
      return
    }
    if (!flight.toFeat) return
    const id = window.setTimeout(() => setFlight(null), 660)
    return () => window.clearTimeout(id)
  }, [flight])

  return (
    <div className="relative flex h-full min-h-[440px] flex-col overflow-hidden md:min-h-0">
      {/* 台上：当前被抽出的那本，放大居中 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pt-3 md:px-8">
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-1 left-1/2 h-20 w-[58%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(120,160,255,0.18),transparent)] blur-md"
        />
        <div
          key={cur}
          style={{ opacity: flight ? 0 : 1 }}
          className="relative flex items-center gap-4 md:gap-7"
        >
          <span className="relative block h-[clamp(128px,21vw,236px)] shrink-0">
            <img
              ref={featRef}
              src={items[cur].src}
              alt={items[cur].caption}
              decoding="async"
              className="h-full w-auto rounded-[3px] object-cover shadow-[0_28px_56px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/25"
            />
            <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[linear-gradient(90deg,rgba(0,0,0,0.6),transparent)]" />
            <span aria-hidden className="absolute inset-y-[3px] -right-[4px] w-[4px] rounded-r-[2px] bg-[repeating-linear-gradient(180deg,#efe8db_0_2px,#c8bda8_2px_3px)] opacity-[0.85]" />
            {/* 主展台也给一道镜面，和下面书架排同一套语言 */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-full h-[34%] overflow-hidden opacity-20"
              style={{
                maskImage: 'linear-gradient(180deg, #000, transparent 86%)',
                WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 86%)',
              }}
            >
              <img src={items[cur].src} alt="" decoding="async" className="h-full w-full -scale-y-100 object-cover blur-[1.5px]" />
            </span>
          </span>
          <span className="hidden max-w-[230px] min-w-0 sm:block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-300/85">textbook · {pad(cur)}</span>
            <span className="mt-2.5 block text-ui font-semibold leading-snug text-white">{items[cur].caption}</span>
            <span className="mt-2 block text-[11.5px] leading-relaxed text-white/40">校企双主编 · 配套课件与实验手册</span>
            <span aria-hidden className="mt-3 block h-px w-8 bg-white/25" />
            <span className="mt-2.5 block text-[10.5px] tracking-[0.04em] text-white/30">点击下方书封抽出 / 放回</span>
          </span>
        </div>
      </div>

      {/* 书架：点击抽取，槽位随之合拢 */}
      <div ref={shelfRef} className="relative flex h-[38%] min-h-[112px] shrink-0 items-end justify-center px-4 pb-[42px] md:px-8">
        {items.map((it, i) => {
          const on = i === cur
          return (
            <button
              key={it.src}
              type="button"
              onClick={() => pull(i)}
              title={`${it.caption}（点击抽出）`}
              aria-label={`抽出 ${it.caption}`}
              aria-current={on ? 'true' : undefined}
              style={{
                flexGrow: on ? 0 : 1,
                flexBasis: 0,
                overflow: on ? 'hidden' : 'visible',
              }}
              className="group relative flex h-full min-w-0 cursor-pointer items-end justify-center transition-[flex-grow] duration-500 ease-out"
            >
              {/* 固定宽的托盘：槽位收窄时只是被裁切，书本身不会被横向压扁 */}
              <span className="relative flex h-full w-[68px] shrink-0 items-end justify-center px-1 sm:px-1.5 md:w-[84px] md:px-2">
                <span
                  className={`relative block ${
                    on || (flight && flight.prev === i) ? 'pointer-events-none opacity-0' : 'opacity-100'
                  }`}
                  style={{ width: `${WIDTH[i % WIDTH.length]}%` }}
                >
                  <img
                    ref={(el) => {
                      imgRefs.current[i] = el
                    }}
                    src={it.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full rounded-[2px] object-cover shadow-[6px_8px_16px_rgba(0,0,0,0.5)] ring-1 ring-white/10 brightness-[0.72] saturate-[0.8] transition-[filter] duration-500 group-hover:brightness-100 group-hover:saturate-100"
                  />
                  <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-[linear-gradient(90deg,rgba(0,0,0,0.55),transparent)]" />
                  <span aria-hidden className="absolute inset-y-[2px] right-0 w-[3px] rounded-r-[2px] bg-[repeating-linear-gradient(180deg,#efe8db_0_2px,#c8bda8_2px_3px)] opacity-75" />
                  {/* 书架上的小倒影：和主展台同一套镜面语言，密度收一档 */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-full h-[42%] overflow-hidden opacity-25"
                    style={{
                      maskImage: 'linear-gradient(180deg, #000, transparent 88%)',
                      WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 88%)',
                    }}
                  >
                    <img src={it.src} alt="" loading="lazy" decoding="async" className="h-full w-full -scale-y-100 object-cover blur-[1px]" />
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* 陈列台基线：一条极窄的高光边，托住整排书 */}
      <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-[41px] h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)]" />

      <div className="absolute left-4 top-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
        <BookOpenCheck className="h-3.5 w-3.5" strokeWidth={1.6} />
        {n} titles · co-authored
      </div>

      {/* 飞行层挂到 body：外层入场动画与展台裁切都可能改变 fixed 的坐标包含块，
          portal 可保证飞行副本始终使用真实视口坐标。 */}
      {flight &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <FlyingCover src={flight.src} from={flight.fromShelf} to={flight.toFeat} big />
            <FlyingCover src={flight.prevSrc} from={flight.fromFeat} to={flight.toShelf} />
          </>,
          document.body,
        )}

      <CaptionBar index={pad(cur)} total={String(n).padStart(2, '0')} text={items[cur].caption} />
    </div>
  )
}

/* ―― 03 产学研合作 ――
   八格拼贴墙：左侧一张 2×2 主图压阵，右侧与底边用六张小图补缝。
   主图常驻一条字幕，小图平时只留编号、悬停才浮出说明 —— 一强七弱，
   信息密度靠主图承载，整墙保持同一档间距与描边。 */
function ProjectStage({ items }) {
  const n = items.length
  const [cur, setCur] = useState(0)
  const SPAN = ['col-span-2 row-span-2', '', '', '', '', '', '', 'col-span-2']

  return (
    <div className="relative flex h-full min-h-[440px] flex-col overflow-hidden md:min-h-0">
      <div className="grid min-h-0 flex-1 auto-rows-[92px] grid-cols-2 gap-1.5 p-3 pb-12 sm:auto-rows-[112px] md:auto-rows-fr md:grid-cols-6 md:grid-rows-2 md:gap-2 md:p-4 md:pb-12">
        {items.map((it, i) => {
          const big = i === 0
          const on = i === cur
          return (
            <button
              key={it.src}
              type="button"
              onMouseEnter={() => setCur(i)}
              onFocus={() => setCur(i)}
              onClick={() => setCur(i)}
              title={it.caption}
              aria-label={it.caption}
              aria-current={on ? 'true' : undefined}
              className={`group relative overflow-hidden rounded-[4px] bg-white/[0.03] ring-1 transition-[box-shadow] duration-500 ${
                big ? 'ring-white/15' : on ? 'ring-white/30' : 'ring-white/[0.07] hover:ring-white/20'
              } ${SPAN[i] || ''}`}
            >
              <img
                src={it.src}
                alt={it.caption}
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-cover transition-all duration-700 ${
                  big
                    ? 'opacity-100'
                    : `opacity-80 saturate-[0.72] group-hover:scale-[1.03] group-hover:opacity-100 group-hover:saturate-100 ${
                        on ? 'opacity-100 saturate-100' : ''
                      }`
                }`}
              />

              {big ? (
                /* 主图：底部常驻字幕，另外压一条弱化到几乎看不见的底色渐变 */
                <span className="pointer-events-none absolute inset-x-0 bottom-0 block bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.74))] px-3.5 pb-3 pt-12 text-left">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">field note · {pad(i)}</span>
                  <span className="mt-1.5 block line-clamp-2 text-ui-sm font-semibold leading-snug text-white">{it.caption}</span>
                </span>
              ) : (
                <>
                  <span className="pointer-events-none absolute right-1.5 top-1.5 font-mono text-[9px] tabular-nums tracking-[0.14em] text-white/45 transition-colors group-hover:text-white/75">
                    {pad(i)}
                  </span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_48%,rgba(0,0,0,0.68))] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <span className="pointer-events-none absolute inset-x-2 bottom-1.5 line-clamp-1 text-left text-[10.5px] text-white/85 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    {it.caption}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      <CaptionBar index={pad(cur)} total={String(n).padStart(2, '0')} text={items[cur].caption} />
    </div>
  )
}

/* ―― 04 师资培训 ――
   推翻原来的"教室复原"，改成横向手风琴名册：七张现场缩成一列竖排书脊，
   选中的那张展开成主画幅；竖起的是编号 + 主题，展开的带完整字幕。
   自动每 5s 换一张，悬停 / 聚焦即停。 */
function TrainingStage({ items }) {
  const n = items.length
  const reduced = useReducedMotion()
  const [cur, setCur] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduced || paused) return
    const t = setInterval(() => setCur((c) => (c + 1) % n), 5000)
    return () => clearInterval(t)
  }, [reduced, paused, n])

  const label = (it) => it.short || it.caption

  return (
    <div
      className="relative flex h-full min-h-[440px] flex-col overflow-hidden md:min-h-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex min-h-0 flex-1 gap-1.5 p-3 md:gap-2 md:p-4">
        {items.map((it, i) => {
          const on = i === cur
          return (
            <button
              key={it.src}
              type="button"
              onMouseEnter={() => setCur(i)}
              onFocus={() => setCur(i)}
              onClick={() => setCur(i)}
              aria-current={on ? 'true' : undefined}
              aria-label={it.caption}
              title={it.caption}
              className={`group relative min-w-0 overflow-hidden rounded-[3px] ring-1 transition-[flex-grow,box-shadow] duration-[650ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
                on ? 'flex-[3.4] ring-white/25' : 'flex-[1] ring-white/[0.07] hover:ring-white/20'
              }`}
            >
              <img
                src={it.src}
                alt={it.caption}
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-cover transition-all duration-700 ${
                  on ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-45 saturate-[0.35] group-hover:opacity-75'
                }`}
              />
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
                  on
                    ? 'bg-[linear-gradient(180deg,transparent_46%,rgba(0,0,0,0.72))] opacity-100'
                    : 'bg-[linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0.55))] opacity-100'
                }`}
              />

              {/* 收起态：竖排书脊（编号在上、主题竖排居中、末端一道短划线） */}
              <span
                className={`absolute inset-0 flex flex-col items-center justify-between py-3 transition-opacity duration-300 ${
                  on ? 'pointer-events-none opacity-0' : 'opacity-100'
                }`}
              >
                <span className="font-mono text-[10px] tabular-nums tracking-[0.2em] text-white/45">{pad(i)}</span>
                <span
                  className="max-h-[70%] overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] tracking-[0.08em] text-white/70 transition-colors group-hover:text-white/90"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {label(it)}
                </span>
                <span aria-hidden className="h-4 w-px bg-white/25" />
              </span>

              {/* 展开态：编号 + 主题 + 一句字幕 */}
              <span
                className={`absolute inset-x-0 bottom-0 flex flex-col gap-1 px-3.5 pb-3.5 transition-all duration-500 ${
                  on ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                }`}
              >
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand-300">
                  <span className="h-px w-4 bg-brand-300/70" />
                  第 {pad(i)} 讲
                </span>
                <span className="text-ui font-semibold text-white">{label(it)}</span>
                <span className="line-clamp-2 text-[11.5px] leading-relaxed text-white/55">{it.caption}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between px-4 pb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
        <span>faculty sessions · {n}</span>
        <span className="tabular-nums text-white/45">
          {pad(cur)} / {String(n).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

/* ―― 05 以赛促学 ――
   左半是数据海报：届次做成大字，下面三行细线指标；
   右半是一张获奖现场主图 + 五格幻灯索引，点哪张换哪张。 */
const COMP_STATS = [
  { k: '参与院校', v: '400', u: '+' },
  { k: '参赛队伍', v: '18000', u: '+' },
  { k: '竞赛平台', v: '自研', u: '' },
]

function CompetitionStage({ items }) {
  const n = items.length
  const [cur, setCur] = useState(0)
  const at = items[cur]
  /* 缩略图横向滚动行的 ref —— 挂 wheel 事件把鼠标滚轮翻译成横向滚动。
     浏览器默认不会让 overflow-x-auto 响应物理滚轮，PC 用户滚一下发现页面
     在滚、缩略图纹丝不动，就觉得"不能滚"。这里用 preventDefault 吃掉纵向
     deltaY、转成 scrollLeft，滚动到头时再让事件冒泡回页面 */
  const rowRef = useRef(null)
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    /* 把鼠标滚轮 deltaY 翻译成横向 scrollLeft。
       行上挂了 data-lenis-prevent-wheel，Lenis（1.1.14）在 wheel handler 里
       看到这个属性就提前 return，不会拦截事件 —— 我们用普通冒泡就能收到 */
    const onWheel = (e) => {
      const dx = Math.abs(e.deltaX), dy = Math.abs(e.deltaY)
      if (dx > dy) return                         // 触控板横滑不干预
      const d = e.deltaY
      const atStart = row.scrollLeft <= 0 && d < 0
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1 && d > 0
      if (atStart) return                         // 左尽头：放行给 Lenis 让页面滚
      if (atEnd) return                           // 右尽头：放行
      e.preventDefault()
      row.scrollLeft += d
    }
    row.addEventListener('wheel', onWheel, { passive: false })
    return () => row.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div className="relative flex h-full min-h-[460px] flex-col overflow-hidden md:min-h-0">
      <div className="grid min-h-0 flex-1 gap-4 p-4 pb-12 md:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] md:gap-6 md:p-5 md:pb-12">
        {/* 数据海报：届次立住左右两端，指标走细线表格 */}
        <div className="hidden min-w-0 flex-col justify-center md:flex">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            <span aria-hidden className="h-px w-4 bg-brand-300/70" />
            national securities
          </span>
          <span className="mt-1 pl-6 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            investment simulation
          </span>

          <p className="mt-6 flex items-end gap-2.5">
            <span className="text-[72px] font-bold leading-[0.78] tracking-[-0.05em] text-white">10</span>
            <span className="pb-2 font-mono text-[10px] uppercase leading-[1.5] tracking-[0.2em] text-white/35">
              th edition
              <br />
              <span className="text-[11px] tracking-[0.24em] text-white/45">届</span>
            </span>
          </p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/45">全国证券投资模拟实训大赛</p>

          <dl className="mt-7 border-t border-white/10">
            {COMP_STATS.map((s) => (
              <div key={s.k} className="flex items-baseline justify-between border-b border-white/[0.07] py-2.5">
                <dt className="text-[11.5px] tracking-[0.04em] text-white/40">{s.k}</dt>
                <dd className="flex items-baseline gap-0.5">
                  <span className="font-mono text-[18px] font-semibold tabular-nums text-white">{s.v}</span>
                  <span className="text-[11px] text-white/40">{s.u}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 现场幻灯：主图压一条细描边，索引与片号分守两端 */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[4px] bg-black ring-1 ring-white/10">
            <img
              key={at.src}
              src={at.src}
              alt={at.caption}
              loading="lazy"
              decoding="async"
              className="coop-swap h-full w-full object-cover"
            />
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_62%,rgba(0,0,0,0.55))]" />
            <span className="absolute left-3 top-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-300" />
              on site
            </span>
            <span className="absolute right-3 top-3 font-mono text-[10px] tabular-nums tracking-[0.16em] text-white/55">
              {pad(cur)}
              <span className="text-white/25"> / {String(n).padStart(2, '0')}</span>
            </span>
          </div>

          <div ref={rowRef} data-lenis-prevent-wheel className="mt-2.5 flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar [&>*]:flex-none">
            {items.map((it, i) => {
              const on = i === cur
              return (
                <button
                  key={it.src}
                  type="button"
                  onClick={() => setCur(i)}
                  aria-label={it.caption}
                  aria-current={on ? 'true' : undefined}
                  className={`relative h-11 w-20 shrink-0 overflow-hidden rounded-[3px] ring-1 transition-all duration-500 sm:w-24 md:w-20 lg:w-24 ${
                    on ? 'ring-white/45' : 'ring-white/10 hover:ring-white/25'
                  }`}
                >
                  <img
                    src={it.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-cover transition-all duration-500 ${
                      on ? 'saturate-100' : 'opacity-45 saturate-[0.25] hover:opacity-85 hover:saturate-100'
                    }`}
                  />
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 bottom-0 h-[2px] bg-brand transition-opacity duration-300 ${
                      on ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 窄屏把数据折成一行，不丢信息 */}
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-white/10 px-4 py-2 md:hidden">
        {COMP_STATS.map((s) => (
          <span key={s.k} className="flex items-baseline gap-1">
            <span className="font-mono text-[14px] font-semibold tabular-nums text-white/85">
              {s.v}
              {s.u}
            </span>
            <span className="text-[11px] text-white/40">{s.k}</span>
          </span>
        ))}
      </div>

      <CaptionBar index={pad(cur)} total={String(n).padStart(2, '0')} text={at.caption} />
    </div>
  )
}

/* 章节标题只统一编号、图标与字阶；标题、正文、交付点的组合方式由每章自己决定。 */
function ChapterHeading({ cat, dark = false }) {
  const Icon = ICONS[cat.id]
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-caption tabular-nums tracking-[0.16em] text-brand">{cat.n}</span>
        <span aria-hidden className={`h-px w-5 ${dark ? 'bg-white/25' : 'bg-ink-900/20'}`} />
        <Icon className={`h-4 w-4 ${dark ? 'text-brand-300' : 'text-brand'}`} strokeWidth={1.7} />
        <p className={`font-mono text-micro uppercase tracking-label ${dark ? 'text-white/40' : 'text-ink-400'}`}>{cat.en}</p>
      </div>
      <h3 id={`coop-title-${cat.id}`} className={`mt-3 text-[26px] font-bold tracking-tight md:text-[30px] ${dark ? 'text-white' : 'text-ink-900'}`}>
        {cat.zh}
      </h3>
    </div>
  )
}

function StoryPoints({ points, dark = false, className = '' }) {
  return (
    <ol className={`grid gap-4 ${className}`}>
      {points.map((point, i) => (
        <li key={point} className={`flex items-start gap-3 border-t pt-3 ${dark ? 'border-white/12' : 'border-ink-900/10'}`}>
          <span className={`mt-0.5 shrink-0 font-mono text-[10px] tabular-nums tracking-[0.14em] ${dark ? 'text-brand-300/80' : 'text-brand'}`}>
            {pad(i)}
          </span>
          <p className={`min-w-0 text-ui leading-relaxed ${dark ? 'text-white/60' : 'text-ink-700'}`}>{point}</p>
        </li>
      ))}
    </ol>
  )
}

function StageFrame({ children, dark = false, className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-night-900 ${
        dark ? 'border-white/10 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.9)]' : 'border-ink-900/10 shadow-card'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* 左侧悬浮目录保留原来的视觉，只把行为从切换面板改为滚动定位。 */
function SideNav({ active, onSelect }) {
  return (
    <nav aria-label="合作实景章节" className="sticky top-24 hidden self-start lg:block">
      <p className="mb-3 px-3 font-mono text-micro uppercase tracking-label text-ink-400">合作板块</p>
      <div className="flex flex-col gap-1">
        {coopCategories.map((c) => {
          const Icon = ICONS[c.id]
          const on = c.id === active
          return (
            <a
              key={c.id}
              href={`#coop-${c.id}`}
              onClick={(event) => {
                event.preventDefault()
                onSelect(c.id)
              }}
              aria-current={on ? 'location' : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-ui transition-colors ${
                on ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:bg-white/70 hover:text-ink-900'
              }`}
            >
              <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`} />
              <span className={`font-mono text-caption tabular-nums ${on ? 'text-brand' : 'text-ink-400'}`}>{c.n}</span>
              <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-brand' : 'text-ink-400'}`} strokeWidth={1.8} />
              <span className="min-w-0 truncate font-medium">{c.zh}</span>
              <span className={`ml-auto font-mono text-caption tabular-nums ${on ? 'text-ink-400' : 'text-ink-300'}`}>{c.items.length}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}

export default function CoopShowcase() {
  const [active, setActive] = useState(coopCategories[0].id)
  const [conference, textbook, project, training, competition] = coopCategories

  const goTo = useCallback((id) => {
    setActive(id)
    scrollToId(`coop-${id}`)
  }, [])

  /* 五章同时常驻，滚动经过哪一章就高亮哪一章。rAF 合并滚动事件，避免反复测量。 */
  useEffect(() => {
    let raf = 0
    const sync = () => {
      raf = 0
      const marker = Math.min(180, window.innerHeight * 0.3)
      let current = coopCategories[0].id
      coopCategories.forEach((c) => {
        const el = document.getElementById(`coop-${c.id}`)
        if (el && el.getBoundingClientRect().top <= marker) current = c.id
      })
      setActive((prev) => (prev === current ? prev : current))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sync)
    }
    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section className="container-x pb-20 pt-2 md:pb-28">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12">
        <div>
          <p className="font-mono text-micro uppercase tracking-label text-ink-400">COOPERATION IN PRACTICE</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 md:text-[30px]">合作实景</h2>
        </div>
        <p className="max-w-md text-ui leading-relaxed text-ink-500">五条合作线依次展开，左侧悬浮目录可随时定位。</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <SideNav active={active} onSelect={goTo} />

        <div className="min-w-0">
          {/* 窄屏保留同一套目录，横向滚动定位，不再切换面板。 */}
          <div className="sticky top-16 z-20 -mx-2 mb-8 flex gap-2 overflow-x-auto border-b border-ink-900/[0.06] bg-white/95 px-2 py-3 backdrop-blur-md lg:hidden">
            {coopCategories.map((c) => {
              const Icon = ICONS[c.id]
              const on = c.id === active
              return (
                <a
                  key={c.id}
                  href={`#coop-${c.id}`}
                  onClick={(event) => {
                    event.preventDefault()
                    goTo(c.id)
                  }}
                  aria-current={on ? 'location' : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-ui transition-colors ${
                    on ? 'bg-ink-900 text-white shadow-card' : 'bg-ink-900/[0.04] text-ink-500 hover:bg-ink-900/[0.08] hover:text-ink-900'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                  <span className="font-medium">{c.zh}</span>
                </a>
              )
            })}
          </div>

          <div className="space-y-16 md:space-y-24">
            {/* 01 · 以时间为序：先看流动会场，再读会议如何回流教学。 */}
            <article id="coop-conference" aria-labelledby="coop-title-conference" className="scroll-mt-24">
              <div className="grid gap-5 border-t border-ink-900/10 pt-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-8">
                <ChapterHeading cat={conference} />
                <p className="text-ui-lg leading-[1.85] text-ink-500">{conference.lead}</p>
              </div>
              <StageFrame className="mt-7 h-[390px] md:h-[420px]">
                <FilmReel items={conference.items} />
              </StageFrame>
              <StoryPoints points={conference.points} className="mt-6 md:grid-cols-3 md:gap-5" />
            </article>

            {/* 02 · 出版分章：文案是书脊旁的内容说明，展台承担抽书与换位。 */}
            <article
              id="coop-textbook"
              aria-labelledby="coop-title-textbook"
              className="scroll-mt-24 rounded-[28px] bg-mist-100 p-5 md:p-7 xl:p-8"
            >
              <div className="grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-center xl:gap-9">
                <div>
                  <ChapterHeading cat={textbook} />
                  <p className="mt-5 text-ui leading-[1.85] text-ink-500">{textbook.lead}</p>
                  <StoryPoints points={textbook.points} className="mt-7" />
                </div>
                <StageFrame className="h-[520px]">
                  <TextbookStage items={textbook.items} />
                </StageFrame>
              </div>
            </article>

            {/* 03 · 田野笔记：拼贴墙与项目说明左右对读，窄屏先叙事后看现场。 */}
            <article
              id="coop-project"
              aria-labelledby="coop-title-project"
              className="scroll-mt-24 border-y border-ink-900/10 py-8 md:py-10"
            >
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center xl:gap-9">
                <div className="xl:order-2">
                  <ChapterHeading cat={project} />
                  <p className="mt-5 text-ui leading-[1.85] text-ink-500">{project.lead}</p>
                  <StoryPoints points={project.points} className="mt-7" />
                </div>
                <StageFrame className="md:h-[520px] xl:order-1">
                  <ProjectStage items={project.items} />
                </StageFrame>
              </div>
            </article>

            {/* 04 · 教师成长路径：整章压暗，三个交付点是课程路径，现场名册随后展开。 */}
            <article
              id="coop-training"
              aria-labelledby="coop-title-training"
              className="scroll-mt-24 rounded-[28px] bg-night-950 p-5 text-white md:p-7 xl:p-8"
            >
              <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-8">
                <ChapterHeading cat={training} dark />
                <p className="text-ui-lg leading-[1.85] text-white/55">{training.lead}</p>
              </div>
              <StoryPoints points={training.points} dark className="mt-8 md:grid-cols-3 md:gap-5" />
              <StageFrame dark className="mt-8 h-[480px]">
                <TrainingStage items={training.items} />
              </StageFrame>
            </article>

            {/* 05 · 竞赛闭环：数据与现场先行，最后落到「学 — 练 — 赛 — 用」。 */}
            <article id="coop-competition" aria-labelledby="coop-title-competition" className="scroll-mt-24">
              <div className="grid gap-5 border-t border-ink-900/10 pt-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-8">
                <ChapterHeading cat={competition} />
                <p className="text-ui-lg leading-[1.85] text-ink-500">{competition.lead}</p>
              </div>
              <StageFrame className="mt-7 h-[520px] md:h-[540px]">
                <CompetitionStage items={competition.items} />
              </StageFrame>
              <div className="mt-7 grid gap-6 border-b border-ink-900/10 pb-8 xl:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] xl:items-start">
                <p className="whitespace-nowrap text-[clamp(24px,3vw,34px)] font-semibold tracking-[0.08em] text-ink-900">
                  学 <span className="text-brand">—</span> 练 <span className="text-brand">—</span> 赛 <span className="text-brand">—</span> 用
                </p>
                <StoryPoints points={competition.points} className="md:grid-cols-3 md:gap-5" />
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}
