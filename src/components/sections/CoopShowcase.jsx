import { useCallback, useEffect, useRef, useState } from 'react'
import { Users, BookOpenCheck, Microscope, GraduationCap, Award, Projector, Medal } from 'lucide-react'
import { coopCategories } from '../../data/cooperation'
import { BrandMark } from '../Brand'

const ICONS = { conference: Users, textbook: BookOpenCheck, project: Microscope, training: GraduationCap, competition: Award }

/* 学术会议：两卷胶卷之间的收卷。左边是收卷卷筒——像一幅还没展开的画卷那样
   紧紧卷着，随着胶片卷进来一点点变粗；右边是放卷卷筒，越放越细。
   卷径按面积守恒开方算（卷进去的长度正比于圆环面积），转速按当前卷径反比算。
   卷到尽头不跳回起点，而是反向倒片，来回都是连续的，看不到接缝。
   齿孔挂在胶片本体上跟着走，节距 = 帧宽/8，正好在画格边界上对齐，
   画面上下各留一条齿孔带，照片是被齿孔卡住的，不是浮在齿孔上面。
   位移与转角由 rAF 直接写样式，只有「卷到第几帧」变化时才更新 React。 */
const FILM_BASE = '#0b0d12'
/* 齿孔：--pitch 由帧宽算出，孔在每格里居中；下面垫一圈略大的暗边当作冲孔的毛口 */
const PERF_HOLE =
  'repeating-linear-gradient(90deg, transparent 0 calc(var(--pitch) * 0.31), rgba(203,212,227,0.78) calc(var(--pitch) * 0.31) calc(var(--pitch) * 0.69), transparent calc(var(--pitch) * 0.69) var(--pitch))'
const PERF_RIM =
  'repeating-linear-gradient(90deg, transparent 0 calc(var(--pitch) * 0.27), rgba(0,0,0,0.9) calc(var(--pitch) * 0.27) calc(var(--pitch) * 0.73), transparent calc(var(--pitch) * 0.73) var(--pitch))'
/* 齿孔带：孔本身是整高的重复渐变，必须用真正的 mask-image 裁成上下两条，
   只垫一层黑色背景是盖不住上层孔的（背景层不会互相裁切）。 */
const PERF_MASK =
  'linear-gradient(180deg, transparent 0 3px, #000 3px 9px, transparent 9px calc(100% - 9px), #000 calc(100% - 9px) calc(100% - 3px), transparent calc(100% - 3px))'
const perfLayers = `${PERF_HOLE}, ${PERF_RIM}`
const perfStyle = {
  backgroundImage: perfLayers,
  backgroundRepeat: 'repeat-x, repeat-x',
  maskImage: PERF_MASK,
  WebkitMaskImage: PERF_MASK,
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
}
/* 卷筒柱面：卷绕层是沿轴向叠起来的，所以纹理是横向细线，不是竖拉丝。
   对比压得很低——粗了就像螺纹杆，不像卷起来的片子。 */
const ROLL_LAYERS =
  'repeating-linear-gradient(180deg, rgba(255,255,255,0.085) 0 1px, rgba(0,0,0,0.26) 1px 2px, transparent 2px 3px)'
const ROLL_SHADE =
  'linear-gradient(90deg, #04060a 0%, #10151d 14%, #2c3644 30%, #4b5769 40%, #232b38 62%, #0d1117 84%, #04060a 100%)'
const ROLL_CAP = 'repeating-radial-gradient(ellipse at center, #090c11 0 1.5px, #59657c 1.5px 3px)'
const ROLL_AXLE = 'linear-gradient(90deg, #4a3a16, #d9bd7c 42%, #8a6a24)'
const ROLL_KNOB = 'radial-gradient(circle at 34% 28%, #f6e4b2, #b8913f 58%, #5c4418)'
/* 片门几何：齿孔带 + 片边印字留白 + 画面 + 下留白，整条胶片的高度由此推出，
   卷筒轴长直接等于它，齿孔才和片舌严丝合缝。 */
const BAND = 12
const GAP_TOP = 14
const GAP_BOT = 12
const stripHeight = (fw) => Math.round((fw - 12) * 0.75) + BAND * 2 + GAP_TOP + GAP_BOT

function FilmReel({ items }) {
  const n = items.length
  /* 帧宽跟着片门实际宽度走，窄屏才不会只剩一帧半；off 是像素量，改帧宽时按比例换算保住当前帧。 */
  const [fw, setFw] = useState(236)
  const fwRef = useRef(236)
  const gateW = useRef(620)
  const slotW = useRef(78)
  const gateEl = useRef(null)
  const slotEl = useRef(null)
  const total = n * fw
  const SPEED = 46
  const FMIN = 0.42
  const FMAX = 0.96
  /* 名义卷径（px）：只用来把线速度换算成角速度 */
  const NOMINAL_R = 40
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  /* 悬浮不再暂停，而是把线速度压到慢速，便于看清当前这一格 */
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

  /* 端面椭圆的高度必须跟着卷径走，细卷压扁、粗卷撑圆，否则细的时候像个铁桶 */
  const sizeRoll = (r, f) => {
    const d = f * slotW.current
    const cap = Math.max(5, d * 0.3)
    if (r.root) {
      r.root.style.width = `${d}px`
      r.root.style.setProperty('--cap', `${cap}px`)
    }
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
    /* 高亮跟的是片门正中那一格，不是卷过的长度，字幕才对得上眼前这张 */
    const g = Math.min(n - 1, Math.max(0, Math.floor((o + gateW.current / 2) / fw) % n))
    setGate((prev) => (prev === g ? prev : g))
  }, [n, total, fw])

  useEffect(() => {
    const el = gateEl.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      gateW.current = el.clientWidth
      if (slotEl.current) slotW.current = slotEl.current.clientWidth
      const next = Math.round(Math.max(172, Math.min(248, el.clientWidth / 2.6)))
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

  /*  reduced-motion 下 rAF 不跑，卷径和齿孔也得先摆好 */
  useEffect(() => { apply(0) }, [apply])

  useEffect(() => {
    if (reduced.current) return
    let raf = 0
    let last = performance.now()
    const tick = (t) => {
      /* 首帧的 rAF 时间戳可能早于 effect 里取的 performance.now()，dt 不夹到 0 会把 off 推成负数 */
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

  /* 卷筒：柱面是卷起来的胶片本体（横向卷绕层 + 柱面明暗），上下椭圆端面露出
     同心卷绕层与一道跟着转的接缝，铜轴贯穿两端做成画卷的轴头。
     片舌把柱面和片门接上，它的齿孔和胶片共用同一个位移，接缝处不会错位。 */
  const roll = (r, label, side, first) => (
    <div className="relative flex shrink-0 flex-col items-center">
      <div ref={first ? slotEl : undefined} className="relative w-[40px] sm:w-[58px] md:w-[68px] lg:w-[78px] xl:w-[92px]" style={{ height: stripHeight(fw), '--pitch': `${fw / 8}px` }}>
        {/* 片舌：占朝向片门的半槽、垫在柱面下面，从柱面一直铺到片门边缘，
            卷径怎么涨缩都不留缝；靠卷筒一侧压暗，读作片子绕进卷筒。 */}
        <span aria-hidden className={`absolute inset-y-0 ${side === 'left' ? 'left-1/2 right-0' : 'left-0 right-1/2'}`} style={{ backgroundColor: FILM_BASE }}>
          <span className={`absolute inset-0 ${side === 'left' ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} from-black/70 to-transparent`} />
        </span>
        <div ref={(el) => { r.current.root = el }} className="absolute left-1/2 top-0 h-full -translate-x-1/2" style={{ width: '40%', '--cap': '10px' }}>
          {/* 轴：贯穿卷筒，两端露出轴头 */}
          <span aria-hidden className="absolute -top-4 left-1/2 h-[calc(100%+32px)] w-[5px] -translate-x-1/2 rounded-full" style={{ backgroundImage: ROLL_AXLE }} />

          {/* 柱面 */}
          <span aria-hidden className="absolute inset-0 overflow-hidden rounded-[1px] shadow-[0_10px_22px_rgba(0,0,0,0.65)]" style={{ backgroundImage: ROLL_SHADE }}>
            <span ref={(el) => { r.current.layers = el }} className="absolute inset-0" style={{ backgroundImage: ROLL_LAYERS }} />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.6),transparent_14%,transparent_86%,rgba(0,0,0,0.6))]" />
            <span className="absolute inset-y-0 left-[30%] w-[9%] bg-white/20 blur-[2px]" />
            <span className="absolute inset-y-0 left-0 w-[2px] bg-black/70" />
            <span className="absolute inset-y-0 right-0 w-[2px] bg-black/70" />
          </span>

          {/* 上端面：同心卷绕层 + 旋转接缝 + 轴心 */}
          <span aria-hidden className="absolute inset-x-0 overflow-hidden rounded-[50%] border border-black/70" style={{ top: 'calc(var(--cap) / -2)', height: 'var(--cap)', backgroundImage: ROLL_CAP }}>
            <span ref={(el) => { r.current.seam = el }} className="absolute left-1/2 top-1/2 aspect-square w-full -translate-x-1/2 -translate-y-1/2 will-change-transform" style={{ backgroundImage: 'conic-gradient(from 0deg, rgba(255,255,255,0.32) 0deg 12deg, transparent 12deg 180deg, rgba(0,0,0,0.4) 180deg 192deg, transparent 192deg 360deg)' }} />
            <span className="absolute inset-0 rounded-[50%] bg-[linear-gradient(120deg,rgba(255,255,255,0.24),transparent_52%)]" />
            <span className="absolute left-1/2 top-1/2 h-[38%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[#0a0c10] shadow-[0_0_0_1px_rgba(0,0,0,0.7)]" />
          </span>
          {/* 下端面：背光，只留一圈卷绕层 */}
          <span aria-hidden className="absolute inset-x-0 overflow-hidden rounded-[50%] border border-black/70" style={{ bottom: 'calc(var(--cap) / -2)', height: 'var(--cap)', backgroundImage: ROLL_CAP }}>
            <span className="absolute inset-0 rounded-[50%] bg-black/60" />
          </span>

          <span aria-hidden className="absolute left-1/2 h-[9px] w-[13px] -translate-x-1/2 rounded-full border border-black/50" style={{ top: 'calc(var(--cap) / -2 - 12px)', backgroundImage: ROLL_KNOB }} />
          <span aria-hidden className="absolute left-1/2 h-[9px] w-[13px] -translate-x-1/2 rounded-full border border-black/50" style={{ bottom: 'calc(var(--cap) / -2 - 12px)', backgroundImage: ROLL_KNOB }} />
        </div>
      </div>
      {/* 标签脱离流：卷筒列高必须正好等于片门高，否则齿孔接不上 */}
      <span className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
        {label}
        <span className="hidden sm:inline"> {side === 'left' ? 'take-up' : 'supply'}</span>
      </span>
    </div>
  )

  return (
    <div className="flex h-full flex-col justify-center gap-3" onMouseEnter={() => { hoverSlow.current = true }} onMouseLeave={() => { hoverSlow.current = false }}>
      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-micro uppercase tracking-label text-white/40">35mm 收卷 · 2019 — 2026</p>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 sm:inline">{winding ? '收卷中' : '倒片中'}</span>
          <span className="font-mono text-caption tabular-nums text-amber-300/80">卷至 {yearOf(items[gate])}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-nowrap items-center justify-between">
        {roll(L, '收卷', 'left', true)}

        {/* 展开的胶片：整条片子（含齿孔）一起位移，画面被上下齿孔带卡住 */}
        <div ref={gateEl} className="relative min-w-0 flex-1 overflow-hidden" style={{ height: stripHeight(fw), '--pitch': `${fw / 8}px` }}>
          <div ref={track} className="relative flex w-max will-change-transform" style={{ height: '100%', backgroundColor: FILM_BASE }}>
            {/* 齿孔挂在片子上，节距 = 帧宽/8，画格边界正好落在孔与孔之间 */}
            <span ref={perf} aria-hidden className="absolute inset-x-0 top-0" style={{ height: '100%', ...perfStyle }} />
            {[...items, ...items].map((it, i) => (
              <div key={`${it.src}-${i}`} style={{ width: fw }} className="group relative shrink-0">
                <span className="absolute inset-x-0 truncate text-center font-mono text-[8px] leading-[10px] tracking-[0.2em] text-amber-200/45" style={{ top: BAND + 2 }}>
                  TZ-5247 · {yearOf(it)} · {String((i % n) + 1).padStart(2, '0')}A
                </span>
                <span className="absolute overflow-hidden rounded-[1px] ring-1 ring-white/10" style={{ left: 6, right: 6, top: BAND + GAP_TOP, bottom: BAND + GAP_BOT }}>
                  <img src={it.src} alt={it.caption} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover contrast-[1.05] sepia-[0.28] transition-[filter,transform] duration-500 group-hover:scale-[1.04] group-hover:sepia-0" />
                </span>
                <span className="absolute inset-x-0 text-center font-mono text-[8px] leading-[9px] tracking-[0.24em] text-amber-200/35" style={{ bottom: BAND + 2 }}>
                  ▸ {String((i % n) + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {roll(R, '放卷', 'right', false)}
      </div>

      {/* 当前帧字幕：胶片本身只留片边印字，标题放在片门外，画面才够大 */}
      <p key={gate} className="coop-swap truncate px-1 text-caption text-white/70">{items[gate]?.caption}</p>
    </div>
  )
}

/* 出版教材：仿真书架。背板 + 侧板 + 两层带厚度的层板，书立在板上、右侧露书口、
   脚下有接触阴影；书封一律保持原样不加盖任何标记，品牌只在架子左上角那块
   写实铜牌上出现一次（拉丝面 + 倒角 + 螺钉 + 凹嵌徽标）。悬停把书抽出来一点。 */
function Bookshelf({ items }) {
  const H = [0.96, 0.87, 1, 0.91, 0.94, 0.85, 0.98, 0.89]
  const rows = [items.slice(0, 4), items.slice(4)]
  /* 内联 style 里的渐变必须用真空格：Tailwind 的 `_` 占位只在类名里生效，
     写进 style 会被 CSS 解析器整条丢弃，木纹和金属色会静默变成透明。 */
  const BACK =
    'repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 11px), linear-gradient(180deg, #4a3018, #2e1e0e)'
  const BOARD =
    'repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 9px), linear-gradient(180deg, #96653a, #6b4526 52%, #432b15)'

  const board = (key) => (
    <div key={key} aria-hidden className="relative h-3.5 shrink-0 rounded-[2px] shadow-[0_10px_16px_rgba(0,0,0,0.55)]" style={{ backgroundImage: BOARD }}>
      <span className="absolute inset-x-0 top-0 h-[3px] rounded-t-[2px] bg-white/20" />
      <span className="absolute inset-x-0 bottom-0 h-[4px] rounded-b-[2px] bg-black/35" />
    </div>
  )

  return (
    <div className="relative h-full overflow-hidden rounded-lg border border-black/50 p-2.5 md:p-3.5" style={{ backgroundImage: BACK }}>
      {/* 侧板：内侧压暗，让架子读起来有进深 */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-3 rounded-l-lg bg-[linear-gradient(90deg,#6b4526,#2a1b0c)] shadow-[inset_-3px_0_6px_rgba(0,0,0,0.6)]" />
      <span aria-hidden className="absolute inset-y-0 right-0 w-3 rounded-r-lg bg-[linear-gradient(270deg,#6b4526,#2a1b0c)] shadow-[inset_3px_0_6px_rgba(0,0,0,0.6)]" />
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(255,226,170,0.16),transparent_62%)]" />

      <div className="relative flex h-full flex-col px-1.5 md:px-2.5">
        {board('top')}

        {/* 左上角铜牌：整块书架唯一的品牌标记，做成拉丝铜面 + 倒角 + 螺钉 + 凹嵌徽标 */}
        <div className="my-2 flex shrink-0 justify-start pl-0.5 md:pl-1.5">
          <span
            className="relative flex items-center gap-2 rounded-[3px] px-3 py-1.5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(96deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 3px), linear-gradient(160deg, #f2dca6, #c9a24b 38%, #a5822f 64%, #dcbe74)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.45), inset 1px 0 0 rgba(255,255,255,0.35), inset -1px 0 0 rgba(0,0,0,0.3), 0 3px 8px rgba(0,0,0,0.6)',
            }}
          >
            {['left-1 top-1', 'right-1 top-1', 'left-1 bottom-1', 'right-1 bottom-1'].map((pos) => (
              <span
                key={pos}
                aria-hidden
                className={`absolute ${pos} h-[6px] w-[6px] rounded-full`}
                style={{
                  backgroundImage: 'radial-gradient(circle at 34% 30%, #f4e3b6, #9c7c30 62%, #6b5218)',
                  boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.5), 0 1px 1px rgba(0,0,0,0.4)',
                }}
              >
                <span className="absolute left-1/2 top-1/2 h-px w-[4px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-black/50" />
              </span>
            ))}
            <span
              className="relative mx-1 grid h-7 w-7 shrink-0 place-items-center rounded-full"
              style={{
                backgroundImage: 'radial-gradient(circle at 38% 28%, #8a6a24, #4e3a12)',
                boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.75), inset 0 -1px 0 rgba(255,255,255,0.3), 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <BrandMark size={19} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)]" />
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(150deg,rgba(255,255,255,0.3),transparent_46%)]" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.14em] text-[#4a3714] [text-shadow:0_1px_0_rgba(255,255,255,0.5)]">天择教育 · 校企共建教材</span>
            <span className="hidden font-mono text-[10px] tracking-[0.16em] text-[#5a4517] [text-shadow:0_1px_0_rgba(255,255,255,0.45)] sm:inline">已出版 8 部</span>
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-2">
          {rows.map((row, r) => (
            <div key={r} className="shrink-0">
              <div className="relative flex h-[104px] items-end justify-center gap-1.5 sm:h-[150px] sm:gap-4 md:h-[150px] lg:h-[170px] xl:h-[186px] xl:gap-6">
                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
                {row.map((it, j) => {
                  const idx = r * 4 + j
                  const lean = idx === 5
                  return (
                    <div
                      key={it.src}
                      style={{ height: `${H[idx] * 100}%` }}
                      className={`group relative shrink-0 transition-transform duration-500 ease-out hover:-translate-y-2.5 ${
                        lean ? 'origin-bottom-left rotate-[7deg] hover:rotate-0' : ''
                      }`}
                    >
                      <span aria-hidden className="absolute -bottom-1 left-1/2 h-2 w-[88%] -translate-x-1/2 rounded-[50%] bg-black/65 blur-[3px] transition-all duration-500 group-hover:w-[64%] group-hover:opacity-50" />
                      <span className="relative block h-full">
                        <img src={it.src} alt={it.caption} loading="lazy" decoding="async" className="h-full w-auto rounded-r-[2px] object-cover shadow-[6px_8px_16px_rgba(0,0,0,0.55)]" />
                        {/* 书口：右侧纸页叠层 */}
                        <span aria-hidden className="absolute inset-y-[3px] -right-[5px] w-[5px] rounded-r-[2px] bg-[repeating-linear-gradient(180deg,#f4ede1_0_2px,#c9bea9_2px_3px)] shadow-[2px_2px_4px_rgba(0,0,0,0.5)]" />
                        <span aria-hidden className="absolute inset-y-0 left-0 w-[7px] rounded-l-[1px] bg-gradient-to-r from-black/60 to-transparent" />
                        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22),transparent_38%)]" />
                      </span>
                      <span className="pointer-events-none absolute -bottom-6 left-1/2 z-20 w-max max-w-[180px] -translate-x-1/2 truncate rounded bg-black/85 px-2 py-0.5 text-[11px] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">{it.caption}</span>
                    </div>
                  )
                })}
                {/* 书立：L 形铁件抵住最后一本 */}
                <span aria-hidden className="relative ml-0.5 h-[42%] w-3 shrink-0 self-end">
                  <span className="absolute inset-y-0 left-0 w-[3px] rounded-t-sm bg-[linear-gradient(180deg,#aab3c2,#5b6472)]" />
                  <span className="absolute bottom-0 left-0 h-[3px] w-3 rounded-r-sm bg-[#6b7482]" />
                </span>
              </div>
              {board(`shelf-${r}`)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* 科研课题：深色图钉板，8 张宝丽来散钉其上，悬停扶正放大。 */
function PinBoard({ items }) {
  const PIN_POS = [
    { x: 2, y: 5, r: -5 }, { x: 26, y: 2, r: 3 }, { x: 51, y: 7, r: -2 }, { x: 75, y: 3, r: 5 },
    { x: 5, y: 47, r: 4 }, { x: 29, y: 52, r: -3 }, { x: 54, y: 46, r: 2 }, { x: 77, y: 51, r: -4 },
  ]
  return (
    <div className="relative h-full rounded-lg bg-[#141a2e] shadow-inner">
      <div aria-hidden className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="grid grid-cols-2 gap-3 p-3 md:block md:h-full md:p-0">
        {items.map((it, i) => {
          const p = PIN_POS[i % PIN_POS.length]
          return (
            <div
              key={it.src}
              style={{ '--rot': `${p.r}deg`, left: `${p.x}%`, top: `${p.y}%` }}
              className="group relative rotate-[var(--rot)] bg-white p-1.5 pb-7 shadow-[0_10px_22px_rgba(0,0,0,0.5)] transition-all duration-500 ease-out hover:z-20 hover:rotate-0 hover:scale-[1.06] md:absolute md:w-[23%] md:p-2 md:pb-8"
            >
              <span aria-hidden className="absolute -top-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rounded-full bg-brand shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
              <img src={it.src} alt={it.caption} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
              <span className="absolute inset-x-2 bottom-1.5 truncate text-[11px] text-ink-700 md:bottom-2">{it.caption}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* 师资培训：研修课堂。左侧是课程表节次，右侧是教室里的投影幕 ——
   幕布卷轴、幕面纹理、幕光洒向阶梯座位，讲台上压着品牌标记。
   自动按节次推进，悬停停住；点节次即跳。 */
function LectureHall({ items }) {
  const n = items.length
  const DWELL = 5200
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [cur, setCur] = useState(0)
  const [paused, setPaused] = useState(reduced.current)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setCur((c) => (c + 1) % n), DWELL)
    return () => clearInterval(t)
  }, [paused, n, cur])

  const at = items[cur]
  const title = (it) => it.short || it.caption

  return (
    <div
      className="relative h-full min-h-[430px] overflow-hidden rounded-md bg-[radial-gradient(120%_90%_at_50%_0%,#1b2233,#0a0d14_70%)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(reduced.current)}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:46px_100%]" />

      <div className="relative grid h-full grid-cols-1 gap-3 p-3 md:grid-cols-[170px_minmax(0,1fr)] md:gap-4 md:p-4">
        {/* 课程表：节次即导航，当前节次走一条 dwell 进度 */}
        <div className="flex min-w-0 flex-col">
          <p className="mb-2 shrink-0 font-mono text-micro uppercase tracking-label text-white/40">研修课程表 · syllabus</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:min-h-0 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
            {items.map((it, i) => {
              const on = i === cur
              return (
                <button
                  key={it.src}
                  type="button"
                  onClick={() => setCur(i)}
                  aria-current={on ? 'true' : undefined}
                  className={`group relative shrink-0 overflow-hidden rounded-md px-2.5 py-2 text-left transition-colors md:w-full ${
                    on ? 'bg-white/[0.10]' : 'hover:bg-white/[0.05]'
                  }`}
                >
                  <span className={`absolute inset-y-1 left-0 w-[2px] rounded-full bg-brand transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`} />
                  <span className={`block font-mono text-[10px] tabular-nums tracking-[0.14em] ${on ? 'text-brand-300' : 'text-white/35'}`}>
                    第 {String(i + 1).padStart(2, '0')} 讲
                  </span>
                  <span className={`mt-0.5 block max-w-[150px] truncate text-[12.5px] md:max-w-none ${on ? 'font-medium text-white' : 'text-white/55 group-hover:text-white/80'}`}>
                    {title(it)}
                  </span>
                  {on && (
                    <span
                      key={cur}
                      aria-hidden
                      className="absolute bottom-0 left-0 h-[2px] bg-brand/70"
                      style={{ animation: `hallDwell ${DWELL}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 教室：幕布 + 幕光 + 阶梯座位 */}
        <div className="flex min-h-0 min-w-0 flex-col items-center justify-center">
          {/* 幕布卷轴 */}
          <div aria-hidden className="relative h-3 w-full max-w-[640px] shrink-0">
            <span className="absolute inset-x-2 inset-y-0 rounded-full bg-[linear-gradient(180deg,#8d97ab,#3c4453)]" />
            <span className="absolute left-0 top-1/2 h-4 w-2.5 -translate-y-1/2 rounded-sm bg-[#aab3c2]" />
            <span className="absolute right-0 top-1/2 h-4 w-2.5 -translate-y-1/2 rounded-sm bg-[#aab3c2]" />
          </div>

          <div className="relative mt-1.5 block h-[188px] w-full max-w-[640px] shrink-0 overflow-hidden border-x-2 border-b-2 border-white/25 bg-black shadow-[0_0_70px_rgba(170,200,255,0.18)] sm:h-[250px] md:h-[318px]">
            <img key={at.src} src={at.src} alt={at.caption} decoding="async" className="hall-cut h-full w-full object-cover" />
            {/* 幕面纹理与边缘压暗：投影幕不是相框 */}
            <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.6)_0_1px,transparent_1px_3px)]" />
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_50%_35%,transparent_45%,rgba(0,0,0,0.5))]" />
          </div>

          <div className="mt-2 flex w-full max-w-[640px] shrink-0 items-center gap-2">
            <span className="h-3 w-[2px] shrink-0 rounded-full bg-brand" />
            <p key={cur} className="coop-swap min-w-0 flex-1 truncate text-caption text-white/80">{at.caption}</p>
            <span className="shrink-0 font-mono text-caption tabular-nums text-white/40">{cur + 1} / {n}</span>
          </div>

          {/* 幕光洒向座位 + 讲台 + 三排阶梯剪影 */}
          <div aria-hidden className="relative mt-1 h-[88px] w-full max-w-[640px] shrink-0">
            <span className="absolute inset-x-0 top-0 h-12 bg-[linear-gradient(180deg,rgba(180,208,255,0.22),transparent)] [clip-path:polygon(2%_0,98%_0,84%_100%,16%_100%)]" />
            <span className="absolute bottom-0 left-1 h-11 w-8 rounded-t-[3px] bg-[linear-gradient(180deg,#38445c,#141a26)] [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)]">
              <span className="absolute inset-x-1 top-2 h-[2px] rounded-full bg-brand/70" />
            </span>
            {[0, 1, 2].map((r) => (
              <div
                key={r}
                className="absolute inset-x-9 flex justify-center gap-[7px]"
                style={{ bottom: (2 - r) * 21, transform: `scale(${0.82 + r * 0.09})`, opacity: 0.4 + r * 0.26 }}
              >
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} className="relative block h-4 w-[18px] rounded-t-[6px] bg-[linear-gradient(180deg,#4a5772,#0d121b)]">
                    <span className="absolute -top-[7px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#5a6884,#161d29)]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
        <Projector className="h-3.5 w-3.5" />
        {paused ? '已暂停' : '放映中'}
      </span>
    </div>
  )
}

/* 以赛促学：奖牌墙。挂杆上垂下六枚奖牌，绶带带动牌面轻轻摆动（相位错开）；
   点一枚即选中，下方铭牌换字幕、聚光落到领奖台上。
   领奖台与规模数字取自本板块 lead 里的真实口径（400 余所院校 / 18000 余支队伍 / 第十届）。 */
function MedalWall({ items }) {
  const n = items.length
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [cur, setCur] = useState(0)
  const METAL = [
    'conic-gradient(from 210deg, #f9e7ab, #c9a24b 25%, #8a6a24 50%, #e8d193 75%, #f9e7ab)',
    'conic-gradient(from 210deg, #f4f7fb, #aab4c2 25%, #6d7889 50%, #dfe5ec 75%, #f4f7fb)',
    'conic-gradient(from 210deg, #f3cea6, #cd7f32 25%, #8a4f1c 50%, #e3ac7e 75%, #f3cea6)',
    'conic-gradient(from 210deg, #d3e3ff, #5b86d6 25%, #274a86 50%, #a3c3f2 75%, #d3e3ff)',
  ]
  const at = items[cur]
  /* 聚光从选中的那枚奖牌斜落到领奖台，点哪枚就跟着摆过去 */
  const beamX = ((cur + 0.5) / n) * 100

  return (
    <div className="relative h-full min-h-[430px] overflow-hidden rounded-md bg-[radial-gradient(90%_70%_at_50%_-10%,#243049,#080b12_72%)]">
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[62%] w-[74%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,236,190,0.13),transparent_72%)] [clip-path:polygon(34%_0,66%_0,100%_100%,0_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[19%] top-[44%] hidden md:block">
        <div className="relative mx-auto h-full w-full max-w-[820px] blur-[7px]">
          <span
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,228,168,0.17),rgba(255,228,168,0.03))] transition-[clip-path] duration-700 ease-out"
            style={{ clipPath: `polygon(${beamX - 4}% 0, ${beamX + 4}% 0, 63% 100%, 37% 100%)` }}
          />
        </div>
      </div>

      <div className="relative flex h-full flex-col items-center gap-3 px-3 py-3 md:px-5 md:py-4">
        {/* 挂杆 */}
        <div aria-hidden className="relative h-2.5 w-full max-w-[820px] shrink-0 rounded-full bg-[linear-gradient(180deg,#9aa4b6,#39404e)] shadow-[0_3px_8px_rgba(0,0,0,0.6)]">
          <span className="absolute -left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_34%_30%,#cfd6e2,#5b6472)]" />
          <span className="absolute -right-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_34%_30%,#cfd6e2,#5b6472)]" />
        </div>

        {/* 奖牌：绶带 + 牌面，整枚以挂点为轴摆动 */}
        <div className="flex w-full max-w-[820px] shrink-0 flex-wrap items-start justify-center gap-x-2 gap-y-3 sm:gap-x-4">
          {items.map((it, i) => {
            const on = i === cur
            return (
              <button
                key={it.src}
                type="button"
                onClick={() => setCur(i)}
                title={it.caption}
                aria-label={`选中 ${it.caption}`}
                aria-current={on ? 'true' : undefined}
                className="group relative w-[30%] max-w-[112px] origin-top focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:w-[15%] md:max-w-[124px]"
                style={
                  reduced.current
                    ? undefined
                    : { animation: `medalSwing ${4.2 + (i % 3) * 0.7}s ease-in-out ${-i * 0.8}s infinite` }
                }
              >
                <span aria-hidden className="mx-auto block h-9 w-6 bg-[linear-gradient(90deg,#0b4fb8,#1677ff_45%,#0b4fb8)] [clip-path:polygon(10%_0,90%_0,64%_100%,36%_100%)] md:h-12 md:w-7" />
                <span
                  className={`relative mx-auto -mt-1 block aspect-square w-[78%] rounded-full p-[5px] transition-transform duration-500 group-hover:scale-[1.07] ${
                    on ? 'shadow-[0_0_26px_rgba(255,222,150,0.45)]' : 'shadow-[0_8px_18px_rgba(0,0,0,0.6)]'
                  }`}
                  style={{ backgroundImage: METAL[i % METAL.length] }}
                >
                  <span className="relative block h-full w-full overflow-hidden rounded-full ring-1 ring-black/40">
                    <img src={it.src} alt={it.caption} loading="lazy" decoding="async" className={`h-full w-full object-cover transition-[filter] duration-500 ${on ? '' : 'brightness-[0.62] saturate-[0.7] group-hover:brightness-90 group-hover:saturate-100'}`} />
                    <span aria-hidden className="absolute inset-0 rounded-full bg-[linear-gradient(140deg,rgba(255,255,255,0.34),transparent_44%)]" />
                  </span>
                  <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 font-mono text-[9px] tabular-nums transition-colors ${on ? 'bg-amber-300 text-[#3a2c10]' : 'bg-black/70 text-white/60'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* 铭牌：当前选中项的字幕 */}
        <div className="flex w-full max-w-[820px] shrink-0 items-center gap-2 rounded-md border border-white/12 bg-white/[0.05] px-3 py-2">
          <Medal className="h-4 w-4 shrink-0 text-amber-300/80" />
          <p key={cur} className="coop-swap min-w-0 flex-1 truncate text-caption text-white/85">{at.caption}</p>
          <span className="shrink-0 font-mono text-caption tabular-nums text-white/40">{cur + 1} / {n}</span>
        </div>

        {/* 领奖台 + 真实规模 */}
        <div className="flex w-full max-w-[820px] min-h-0 flex-1 flex-col items-center justify-center gap-2.5">
          <div aria-hidden className="relative flex h-[96px] w-full max-w-[340px] items-end justify-center gap-2">
            <span className="absolute -top-3 left-1/2 h-20 w-28 -translate-x-1/2 rounded-[50%] bg-amber-200/14 blur-xl" />
            {[
              { h: 64, t: '银', c: 'linear-gradient(180deg,#dfe5ec,#8d97a8)' },
              { h: 92, t: '金', c: 'linear-gradient(180deg,#f3dda0,#b8912f)' },
              { h: 50, t: '铜', c: 'linear-gradient(180deg,#e6b98f,#a2612a)' },
            ].map((s) => (
              <span key={s.t} className="relative flex w-[30%] items-start justify-center rounded-t-[3px] pt-2 shadow-[0_-2px_10px_rgba(0,0,0,0.4)]" style={{ height: s.h, backgroundImage: s.c }}>
                <span className="text-[14px] font-bold text-black/55">{s.t}</span>
                <span className="absolute inset-x-0 bottom-0 h-2 bg-black/25" />
              </span>
            ))}
          </div>
          <div className="flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-white/10 pt-2">
            {[
              { k: '参与院校', v: '400+' },
              { k: '参赛队伍', v: '18000+' },
              { k: '全国大赛', v: '第 10 届' },
            ].map((s) => (
              <span key={s.k} className="flex items-baseline gap-1.5">
                <span className="font-mono text-[15px] font-bold tabular-nums text-amber-200">{s.v}</span>
                <span className="text-[11.5px] text-white/45">{s.k}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const VIEWS = { conference: FilmReel, textbook: Bookshelf, project: PinBoard, training: LectureHall, competition: MedalWall }
/* 胶卷是横向长条，跟其余四个展陈共用 516 会在上下留出大片空台；
   帧宽随片门缩放，台高也跟着视口收放，窄屏才不会又空出一截。 */
const STAGE_H = { conference: 'clamp(340px, 30vw, 400px)', textbook: '516px', project: '516px', training: '516px', competition: '516px' }

/* 左侧竖直悬浮导航：sticky 跟随滚动，高亮当前板块；窄屏退化为横排胶囊。 */
function SideNav({ active, onSelect }) {
  return (
    <nav className="sticky top-24 hidden self-start lg:block">
      <p className="mb-3 px-3 font-mono text-micro uppercase tracking-label text-ink-400">合作板块</p>
      <div className="flex flex-col gap-1">
        {coopCategories.map((c) => {
          const Icon = ICONS[c.id]
          const on = c.id === active
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              aria-current={on ? 'true' : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-ui transition-colors ${
                on ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:bg-white/70 hover:text-ink-900'
              }`}
            >
              <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`} />
              <span className={`font-mono text-caption tabular-nums ${on ? 'text-brand' : 'text-ink-400'}`}>{c.n}</span>
              <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-brand' : 'text-ink-400'}`} strokeWidth={1.8} />
              <span className="min-w-0 truncate font-medium">{c.zh}</span>
              <span className={`ml-auto font-mono text-caption tabular-nums ${on ? 'text-ink-400' : 'text-ink-300'}`}>{c.items.length}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function CoopShowcase() {
  const [active, setActive] = useState(coopCategories[0].id)
  const cat = coopCategories.find((c) => c.id === active)
  const View = VIEWS[cat.id]

  return (
    <section className="container-x pb-14 md:pb-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div>
          <p className="font-mono text-micro uppercase tracking-label text-ink-400">COOPERATION IN PRACTICE</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 md:text-[30px]">合作实景 · 五条线正在跑</h2>
        </div>
        <p className="max-w-md text-ui leading-relaxed text-ink-500">左侧切换板块，每条合作线有自己的展陈方式。</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <SideNav active={active} onSelect={setActive} />

        <div className="min-w-0">
          {/* 窄屏横排胶囊导航 */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {coopCategories.map((c) => {
              const Icon = ICONS[c.id]
              const on = c.id === active
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-ui transition-colors ${
                    on ? 'bg-ink-900 text-white shadow-card' : 'bg-ink-900/[0.04] text-ink-500 hover:bg-ink-900/[0.08] hover:text-ink-900'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                  <span className="font-medium">{c.zh}</span>
                </button>
              )
            })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-night-900 shadow-card">
            <div className="px-3 pt-3 md:px-4">
              <p className="font-mono text-micro uppercase tracking-label text-white/40">{cat.n} · {cat.en}</p>
            </div>
            <div key={cat.id} className="coop-swap p-2 md:p-3">
              <div className="transition-[height] duration-500 ease-out md:h-[var(--stage-h)]" style={{ '--stage-h': STAGE_H[cat.id] }}>
                <View items={cat.items} />
              </div>
            </div>
          </div>

          <div key={`info-${cat.id}`} className="coop-swap mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
            <p className="text-ui-lg leading-[1.9] text-ink-500">{cat.lead}</p>
            <ul className="space-y-2.5">
              {cat.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-ui leading-relaxed text-ink-700">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span className="min-w-0">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}