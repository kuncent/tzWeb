import { useCallback, useEffect, useRef, useState } from 'react'
import { Users, BookOpenCheck, Microscope, GraduationCap, Award, Images, X, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Projector, Medal } from 'lucide-react'
import { coopCategories } from '../../data/cooperation'
import { BrandMark } from '../Brand'

const ICONS = { conference: Users, textbook: BookOpenCheck, project: Microscope, training: GraduationCap, competition: Award }

/* 学术会议：双片盘收卷。右盘放片、左盘收片，胶片从两盘之间横向走过；
   左盘越收越粗、右盘越放越细，转速按各自当前卷径反比算（粗盘转得慢），
   齿孔与片边印字跟着胶片一起位移，走完一圈自动 loop。
   位移与转角由 rAF 直接写样式，只有「卷到第几帧」变化时才更新 React。
   窄屏两盘并排在上、胶片整宽在下；宽屏两盘左右夹住胶片。 */
function FilmReel({ items, onOpen }) {
  const n = items.length
  /* 帧宽跟着片门实际宽度走，窄屏才不会只剩一帧半；off 是像素量，改帧宽时按比例换算保住当前帧。 */
  const [fw, setFw] = useState(236)
  const fwRef = useRef(236)
  const gateEl = useRef(null)
  const total = n * fw
  const SPEED = 46
  /* 名义卷径（px）：只用来把线速度换算成角速度，窄屏盘小一点不影响观感 */
  const NOMINAL_R = 58
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [paused, setPaused] = useState(reduced.current)
  const [gate, setGate] = useState(0)
  const off = useRef(0)
  const angL = useRef(0)
  const angR = useRef(0)
  const track = useRef(null)
  const woundL = useRef(null)
  const woundR = useRef(null)
  const spinL = useRef(null)
  const spinR = useRef(null)
  const prog = useRef(null)
  const yearOf = (it) => it?.caption.match(/^\d{4}/)?.[0] ?? '··'

  const apply = useCallback((dt) => {
    const o = off.current
    const p = o / total
    const fL = 0.5 + p * 0.42
    const fR = 0.92 - p * 0.42
    if (track.current) track.current.style.transform = `translate3d(${-o}px,0,0)`
    if (woundL.current) {
      woundL.current.style.width = `${fL * 100}%`
      woundL.current.style.height = `${fL * 100}%`
    }
    if (woundR.current) {
      woundR.current.style.width = `${fR * 100}%`
      woundR.current.style.height = `${fR * 100}%`
    }
    if (dt) {
      const k = (dt * SPEED * 180) / Math.PI / NOMINAL_R
      angL.current += k / fL
      angR.current += k / fR
      if (spinL.current) spinL.current.style.transform = `rotate(${angL.current}deg)`
      if (spinR.current) spinR.current.style.transform = `rotate(${angR.current}deg)`
    }
    if (prog.current) prog.current.style.width = `${p * 100}%`
    const g = Math.floor(o / fw) % n
    setGate((prev) => (prev === g ? prev : g))
  }, [n, total, fw])

  useEffect(() => {
    const el = gateEl.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const next = Math.round(Math.max(172, Math.min(248, el.clientWidth / 2.6)))
      const prev = fwRef.current
      if (next === prev) return
      off.current = (off.current / prev) * next
      fwRef.current = next
      setFw(next)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (paused) return
    let raf = 0
    let last = performance.now()
    const tick = (t) => {
      /* 首帧的 rAF 时间戳可能早于 effect 里取的 performance.now()，
         dt 不夹到 0 就会把 off 推成负数，取模后帧号变 -1 直接读崩 items[-1] */
      const dt = Math.max(0, Math.min(0.05, (t - last) / 1000))
      last = t
      off.current = (((off.current + dt * SPEED) % total) + total) % total
      apply(dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, total, apply])

  const jump = (i) => {
    off.current = i * fw
    apply(0)
  }

  /* 片盘：卷绕的胶片在下、三根盘辐在上，透过辐条空隙能看见胶片涨缩 */
  const reel = (woundRef, spinRef, label) => (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="relative aspect-square w-[92px] sm:w-[116px] md:w-[108px] lg:w-[128px] xl:w-[164px]">
        <span aria-hidden className="absolute inset-[5px] rounded-full bg-[#080a0f]" />
        <span
          ref={woundRef}
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: '50%',
            height: '50%',
            backgroundImage: 'repeating-radial-gradient(circle, #191d25 0 2px, #3d4655 2px 4px)',
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8), 0 0 0 1px rgba(198,212,236,0.28)',
          }}
        />
        <span
          ref={spinRef}
          aria-hidden
          className="absolute inset-0 rounded-full will-change-transform"
          style={{
            backgroundImage:
              'conic-gradient(from 0deg,#79839a 0deg 20deg,transparent 20deg 120deg,#79839a 120deg 140deg,transparent 140deg 240deg,#79839a 240deg 260deg,transparent 260deg 360deg)',
          }}
        />
        <span aria-hidden className="absolute inset-0 rounded-full border-[3px] border-[#8d97ab] shadow-[inset_0_0_10px_rgba(0,0,0,0.7),0_8px_22px_rgba(0,0,0,0.6)]" />
        <span aria-hidden className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.26),transparent_46%)]" />
        <span aria-hidden className="absolute left-1/2 top-1/2 h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/50 bg-[radial-gradient(circle_at_34%_30%,#e8cd90,#a8813a_62%,#5c4418)]" />
        <span aria-hidden className="absolute left-1/2 top-1/2 h-[7%] w-[7%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70" />
      </div>
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">{label}</span>
    </div>
  )

  return (
    <div className="flex h-full flex-col justify-center gap-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(reduced.current)}>
      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-micro uppercase tracking-label text-white/40">35mm 收卷 · 2019 — 2026</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-caption tabular-nums text-amber-300/80">卷至 {yearOf(items[gate])}</span>
          <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? '播放' : '暂停'} className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-wrap items-center justify-between gap-2 md:flex-nowrap md:gap-3">
        <div className="order-1">{reel(woundL, spinL, '收片 take-up')}</div>
        <div className="order-2 md:order-3">{reel(woundR, spinR, '放片 supply')}</div>

        {/* 展开的胶片：齿孔与片边印字随胶片一起走，两端压暗暗示绕进片盘 */}
        <div ref={gateEl} className="relative order-3 w-full min-w-0 overflow-hidden rounded-[3px] bg-[#0a0c10] md:order-2 md:w-auto md:flex-1">
          <div ref={track} className="relative flex w-max py-3.5 will-change-transform">
            <span aria-hidden className="absolute inset-x-0 top-[3px] h-2 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.8)_0_10px,transparent_10px_24px)]" />
            <span aria-hidden className="absolute inset-x-0 bottom-[3px] h-2 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.8)_0_10px,transparent_10px_24px)]" />
            {[...items, ...items].map((it, i) => (
              <button key={`${it.src}-${i}`} type="button" onClick={() => onOpen(i % n)} style={{ width: fw }} className="group shrink-0 px-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                <span className="mb-1 block truncate font-mono text-[9px] tracking-[0.18em] text-amber-200/45">TZ-5247 · {yearOf(it)} · {String((i % n) + 1).padStart(2, '0')}A</span>
                <span className="relative block overflow-hidden">
                  <img src={it.src} alt={it.caption} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" className="aspect-[4/3] w-full object-cover contrast-[1.05] sepia-[0.28] transition-[filter,transform] duration-500 group-hover:scale-[1.04] group-hover:sepia-0" />
                  <span className="absolute left-1.5 top-1.5 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-amber-300/90">{yearOf(it)}</span>
                </span>
              </button>
            ))}
          </div>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-1/3 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,236,190,0.07),transparent)]" />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-black/85 to-transparent" />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-black/85 to-transparent" />
        </div>
      </div>

      {/* 当前帧字幕：胶片本身只留片边印字，标题放在片门外，画面才够大 */}
      <p key={gate} className="coop-swap truncate px-1 text-caption text-white/70">{items[gate]?.caption}</p>

      {/* 时间线：琥珀色进度随收卷推进，点哪年就把胶片拨到那一帧 */}
      <div className="relative px-2 pt-1">
        <span aria-hidden className="absolute inset-x-2 top-[5px] h-px bg-white/15" />
        <span ref={prog} aria-hidden className="absolute left-2 top-[5px] h-px bg-amber-300/70" style={{ width: 0 }} />
        <div className="relative flex justify-between">
          {items.map((it, i) => (
            <button key={it.src} type="button" onClick={() => jump(i)} aria-label={`跳到 ${it.caption}`} className="group flex flex-col items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full border transition-colors ${i === gate ? 'border-amber-300 bg-amber-300/40' : 'border-white/30 bg-night-900 group-hover:border-amber-300'}`} />
              <span className={`font-mono text-[10px] tabular-nums transition-colors ${i === gate ? 'text-amber-300' : 'text-white/40 group-hover:text-amber-300'}`}>{yearOf(it)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* 出版教材：仿真书架。背板 + 侧板 + 两层带厚度的层板，书立在板上、右侧露书口、
   脚下有接触阴影；架顶铜牌与每本书封面都打上品牌标记，悬停把书抽出来一点。 */
function Bookshelf({ items, onOpen }) {
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

        {/* 铜牌：品牌标记 + 共建教材铭牌 */}
        <div className="my-2 flex shrink-0 justify-center">
          <span className="flex items-center gap-2 rounded-[3px] border border-[#8a6a24] bg-[linear-gradient(180deg,#e2c079,#c9a24b_55%,#a5822f)] px-2.5 py-1 shadow-[0_2px_5px_rgba(0,0,0,0.55)]">
            <BrandMark size={15} />
            <span className="text-[11px] font-semibold tracking-[0.14em] text-[#3a2c10]">天择教育 · 校企共建教材</span>
            <span className="hidden font-mono text-[10px] tracking-[0.16em] text-[#5a4517] sm:inline">已出版 8 部</span>
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
                    <button
                      key={it.src}
                      type="button"
                      onClick={() => onOpen(idx)}
                      style={{ height: `${H[idx] * 100}%` }}
                      aria-label={`${it.caption} · 天择教育校企共建教材`}
                      className={`group relative shrink-0 transition-transform duration-500 ease-out hover:-translate-y-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${
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
                        {/* 共建钢印 */}
                        <span className="absolute bottom-1 left-1 grid h-4 w-4 place-items-center rounded-full bg-white/92 shadow-[0_1px_3px_rgba(0,0,0,0.5)] ring-1 ring-black/10 transition-transform duration-500 group-hover:scale-110 md:h-5 md:w-5">
                          <BrandMark size={13} />
                        </span>
                      </span>
                      <span className="pointer-events-none absolute -bottom-6 left-1/2 z-20 w-max max-w-[180px] -translate-x-1/2 truncate rounded bg-black/85 px-2 py-0.5 text-[11px] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">{it.caption}</span>
                    </button>
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
function PinBoard({ items, onOpen }) {
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
            <button
              key={it.src}
              type="button"
              onClick={() => onOpen(i)}
              style={{ '--rot': `${p.r}deg`, left: `${p.x}%`, top: `${p.y}%` }}
              className="group relative rotate-[var(--rot)] bg-white p-1.5 pb-7 shadow-[0_10px_22px_rgba(0,0,0,0.5)] transition-all duration-500 ease-out hover:z-20 hover:rotate-0 hover:scale-[1.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand md:absolute md:w-[23%] md:p-2 md:pb-8"
            >
              <span aria-hidden className="absolute -top-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rounded-full bg-brand shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
              <img src={it.src} alt={it.caption} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
              <span className="absolute inset-x-2 bottom-1.5 truncate text-[11px] text-ink-700 md:bottom-2">{it.caption}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* 师资培训：研修课堂。左侧是课程表节次，右侧是教室里的投影幕 ——
   幕布卷轴、幕面纹理、幕光洒向阶梯座位，讲台上压着品牌标记。
   自动按节次推进，悬停停住；点节次即跳，点幕面放大看现场。 */
function LectureHall({ items, onOpen }) {
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

          <button
            type="button"
            onClick={() => onOpen(cur)}
            aria-label={`放大查看：${at.caption}`}
            className="group relative mt-1.5 block h-[188px] w-full max-w-[640px] shrink-0 overflow-hidden border-x-2 border-b-2 border-white/25 bg-black shadow-[0_0_70px_rgba(170,200,255,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:h-[250px] md:h-[318px]"
          >
            <img key={at.src} src={at.src} alt={at.caption} decoding="async" className="hall-cut h-full w-full object-cover" />
            {/* 幕面纹理与边缘压暗：投影幕不是相框 */}
            <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.6)_0_1px,transparent_1px_3px)]" />
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_50%_35%,transparent_45%,rgba(0,0,0,0.5))]" />
            <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="h-3 w-3" />
              放大
            </span>
          </button>

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
   点一枚即选中，下方铭牌换字幕、聚光落到领奖台上，「查看大图」进灯箱。
   领奖台与规模数字取自本板块 lead 里的真实口径（400 余所院校 / 18000 余支队伍 / 第十届）。 */
function MedalWall({ items, onOpen }) {
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

        {/* 铭牌：当前选中项的字幕与放大出口 */}
        <div className="flex w-full max-w-[820px] shrink-0 items-center gap-2 rounded-md border border-white/12 bg-white/[0.05] px-3 py-2">
          <Medal className="h-4 w-4 shrink-0 text-amber-300/80" />
          <p key={cur} className="coop-swap min-w-0 flex-1 truncate text-caption text-white/85">{at.caption}</p>
          <button
            type="button"
            onClick={() => onOpen(cur)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-2.5 py-1 text-[12px] text-white/80 transition-colors hover:border-amber-300/60 hover:bg-amber-300/15 hover:text-white"
          >
            <Maximize2 className="h-3 w-3" />
            查看大图
          </button>
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
const STAGE_H = { conference: 'clamp(356px, 32vw, 420px)', textbook: '516px', project: '516px', training: '516px', competition: '516px' }

function Lightbox({ cat, index, onClose, onStep }) {
  const item = cat.items[index]
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onStep(-1)
      else if (e.key === 'ArrowRight') onStep(1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, onStep])

  return (
    <div role="dialog" aria-modal="true" aria-label={item.caption} className="fixed inset-0 z-[90] flex flex-col bg-night/95 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <p className="font-mono text-caption uppercase tracking-label text-white/50">{cat.n} · {cat.en}</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-caption tabular-nums text-white/60">{index + 1} / {cat.items.length}</span>
          <button type="button" onClick={onClose} aria-label="关闭" className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 md:px-20" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => onStep(-1)} aria-label="上一张" className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-5">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <img key={item.src} src={item.src} alt={item.caption} className="coop-swap max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        <button type="button" onClick={() => onStep(1)} aria-label="下一张" className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-5">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <p className="px-6 py-4 text-center text-ui text-white/85">{item.caption}</p>
    </div>
  )
}

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
  const [box, setBox] = useState(null)
  const cat = coopCategories.find((c) => c.id === active)
  const View = VIEWS[cat.id]

  const open = useCallback((i) => setBox({ id: active, i }), [active])
  const close = useCallback(() => setBox(null), [])
  const step = useCallback((d) => {
    setBox((b) => {
      if (!b) return b
      const n = coopCategories.find((c) => c.id === b.id).items.length
      return { ...b, i: (b.i + d + n) % n }
    })
  }, [])

  const boxCat = box ? coopCategories.find((c) => c.id === box.id) : null

  return (
    <section className="container-x pb-14 md:pb-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div>
          <p className="font-mono text-micro uppercase tracking-label text-ink-400">COOPERATION IN PRACTICE</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 md:text-[30px]">合作实景 · 五条线正在跑</h2>
        </div>
        <p className="max-w-md text-ui leading-relaxed text-ink-500">左侧切换板块，每条合作线有自己的展陈方式；点击任意图片可放大浏览全组。</p>
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
            <div className="flex items-center justify-between px-3 pt-3 md:px-4">
              <p className="font-mono text-micro uppercase tracking-label text-white/40">{cat.n} · {cat.en}</p>
              <button type="button" onClick={() => open(0)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                <Images className="h-3.5 w-3.5" />
                浏览全部 {cat.items.length} {cat.id === 'textbook' ? '部' : '张'}
              </button>
            </div>
            <div key={cat.id} className="coop-swap p-2 md:p-3">
              <div className="transition-[height] duration-500 ease-out md:h-[var(--stage-h)]" style={{ '--stage-h': STAGE_H[cat.id] }}>
                <View items={cat.items} onOpen={open} />
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

      {boxCat && <Lightbox cat={boxCat} index={box.i} onClose={close} onStep={step} />}
    </section>
  )
}