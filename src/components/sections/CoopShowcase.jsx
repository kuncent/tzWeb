import { useCallback, useEffect, useRef, useState } from 'react'
import { Users, BookOpenCheck, Microscope, GraduationCap, Award, Images, X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { coopCategories } from '../../data/cooperation'

const ICONS = { conference: Users, textbook: BookOpenCheck, project: Microscope, training: GraduationCap, competition: Award }

/* 学术会议：画卷式胶卷。左端竖立卷筒把右侧胶片像手卷一样缓缓收起，
   左筒越卷越粗、右筒越放越细，沿时间线推进，走完一圈自动 loop。
   位移用 rAF 直接写 transform/width（不逐帧 setState），只有「卷到第几帧」变化时才更新 React。 */
function FilmReel({ items, onOpen }) {
  const n = items.length
  const W = 320
  const total = n * W
  const SPEED = 40
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [paused, setPaused] = useState(reduced.current)
  const [gate, setGate] = useState(0)
  const off = useRef(0)
  const track = useRef(null)
  const rollL = useRef(null)
  const rollR = useRef(null)
  const prog = useRef(null)
  const yearOf = (it) => it.caption.match(/^\d{4}/)?.[0] ?? '··'

  const apply = useCallback(() => {
    const o = off.current
    const p = o / total
    if (track.current) track.current.style.transform = `translate3d(${-o}px,0,0)`
    if (rollL.current) {
      rollL.current.style.width = `${26 + p * 38}px`
      rollL.current.children[0].style.backgroundPosition = `${-o * 0.35}px 0, 0 0`
    }
    if (rollR.current) rollR.current.style.width = `${26 + (1 - p) * 38}px`
    if (prog.current) prog.current.style.width = `${p * 100}%`
    const g = Math.floor(o / W) % n
    setGate((prev) => (prev === g ? prev : g))
  }, [n, total])

  useEffect(() => {
    if (paused) return
    let raf = 0
    let last = performance.now()
    const tick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      off.current = (off.current + dt * SPEED) % total
      apply()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, total, apply])

  const jump = (i) => {
    off.current = i * W
    apply()
  }

  /* 卷筒：竖立画轴，上下铜轴头；端面用同色金属渐变收圆，避免小尺寸下螺旋纹读成图标 */
  const capStyle = { background: 'linear-gradient(90deg,#20242c,#6a7180_50%,#20242c)' }
  const skinStyle = {
    backgroundImage:
      'repeating-linear-gradient(90deg,rgba(255,255,255,0.10)_0_2px,transparent_2px_12px),linear-gradient(90deg,#20242c,#4a505c_30%,#6a7180_50%,#4a505c_70%,#20242c)',
    backgroundSize: '12px 100%, 100% 100%',
    boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6), 0 0 14px rgba(0,0,0,0.5)',
  }
  const roller = (ref, w) => (
    <div ref={ref} className="relative shrink-0 self-stretch" style={{ width: w }}>
      <span className="absolute inset-x-0 bottom-1 top-1 rounded-[3px]" style={skinStyle} />
      <span className="absolute inset-x-0 top-0 h-3 rounded-[50%]" style={capStyle} />
      <span className="absolute inset-x-0 bottom-0 h-3 rounded-[50%]" style={capStyle} />
      <span className="absolute -top-2 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full bg-[#c9a24b]" />
      <span className="absolute -bottom-2 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full bg-[#c9a24b]" />
    </div>
  )

  return (
    <div className="flex h-full flex-col justify-center gap-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(reduced.current)}>
      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-micro uppercase tracking-label text-white/40">胶卷手卷 · 2019 — 2026</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-caption tabular-nums text-amber-300/80">卷至 {yearOf(items[gate])}</span>
          <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? '播放' : '暂停'} className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center">
        <div className="flex w-full items-stretch">
        {roller(rollL, 26)}
        {/* 展开的胶片：齿孔与片边印字随胶片一起走，两端阴影暗示 wrap 进卷筒 */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div ref={track} className="relative flex w-max py-3 will-change-transform">
            <span aria-hidden className="absolute inset-x-0 top-0 h-2.5 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.85)_0_12px,transparent_12px_26px)]" />
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-2.5 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.85)_0_12px,transparent_12px_26px)]" />
            {[...items, ...items].map((it, i) => (
              <button key={`${it.src}-${i}`} type="button" onClick={() => onOpen(i % n)} style={{ width: W }} className="group shrink-0 px-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                <span className="mb-1 block truncate font-mono text-[9px] tracking-[0.18em] text-amber-200/40">TZ-5247 · {yearOf(it)} · {String((i % n) + 1).padStart(2, '0')}A</span>
                <span className="relative block overflow-hidden">
                  <img src={it.src} alt={it.caption} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" className="aspect-[4/3] w-full object-cover contrast-[1.05] sepia-[0.28] transition-[filter,transform] duration-500 group-hover:scale-[1.04] group-hover:sepia-0" />
                  <span className="absolute left-1.5 top-1.5 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-amber-300/90">{yearOf(it)}</span>
                </span>
                <span className="mt-1.5 block truncate text-caption text-white/60 transition-colors group-hover:text-white">{it.caption}</span>
              </button>
            ))}
          </div>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/80 to-transparent" />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/80 to-transparent" />
        </div>
        {roller(rollR, 64)}
        </div>
      </div>

      {/* 时间线：琥珀色进度随卷片推进，点哪年就把胶片拨到那一帧 */}
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

/* 出版教材：木质双层书架，8 部书高矮错落立在板上，一部斜倚，悬停抽出。 */
function Bookshelf({ items, onOpen }) {
  const BOOK_H = [196, 178, 204, 186, 192, 174, 200, 182]
  const WOOD = '[background-image:repeating-linear-gradient(90deg,rgba(0,0,0,0.10)_0_2px,transparent_2px_9px),linear-gradient(180deg,#7a5230,#5a3b21)]'
  const rows = [items.slice(0, 4), items.slice(4)]
  return (
    <div className={`relative h-full rounded-lg border border-black/40 px-4 pb-4 pt-3 md:px-7 ${WOOD}`}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-2 rounded-l-lg bg-black/25" />
      <span aria-hidden className="absolute inset-y-0 right-0 w-2 rounded-r-lg bg-black/25" />
      <span className="mx-auto mb-3 block w-fit rounded-sm bg-[#c9a24b] px-3 py-1 font-mono text-[11px] tracking-[0.2em] text-[#3a2c10] shadow-[0_1px_3px_rgba(0,0,0,0.5)]">已出版教材 · 8 部</span>
      <div className="flex h-[calc(100%-44px)] flex-col justify-evenly">
        {rows.map((row, r) => (
          <div key={r}>
            <div className="flex items-end justify-center gap-4 md:gap-7">
              {row.map((it, j) => {
                const idx = r * 4 + j
                const lean = idx === 5
                return (
                  <button
                    key={it.src}
                    type="button"
                    onClick={() => onOpen(idx)}
                    style={{ height: BOOK_H[idx] }}
                    className={`group relative h-[104px] shrink-0 transition-transform duration-500 ease-out hover:-translate-y-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 md:h-auto ${
                      lean ? 'origin-bottom-left rotate-[7deg] hover:rotate-0' : ''
                    }`}
                  >
                    <img src={it.src} alt={it.caption} loading="lazy" decoding="async" className="h-full w-auto rounded-r-[3px] object-cover shadow-[8px_10px_18px_rgba(0,0,0,0.55)]" />
                    <span aria-hidden className="absolute inset-y-0 left-0 w-[7px] rounded-l-[2px] bg-gradient-to-r from-black/55 to-transparent" />
                    <span aria-hidden className="absolute inset-y-0 right-0 w-[3px] bg-white/25" />
                    <span className="pointer-events-none absolute -bottom-6 left-1/2 z-20 w-max max-w-[180px] -translate-x-1/2 truncate rounded bg-black/85 px-2 py-0.5 text-[11px] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">{it.caption}</span>
                  </button>
                )
              })}
            </div>
            <div aria-hidden className={`mt-0 h-2.5 rounded-[2px] shadow-[0_6px_12px_rgba(0,0,0,0.5)] ${WOOD}`} />
          </div>
        ))}
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

/* 师资培训：一叠培训现场照片卡，点下一张翻牌，后面两张斜叠着待翻。 */
function CardDeck({ items, onOpen }) {
  const [cur, setCur] = useState(0)
  const n = items.length
  const step = (d) => setCur((c) => (c + d + n) % n)
  return (
    <div className="relative h-[380px] md:h-full">
      <p className="absolute left-3 top-2 font-mono text-micro uppercase tracking-label text-white/40">FACULTY TRAINING DECK</p>
      {items.map((it, i) => {
        const k = (i - cur + n) % n
        const style =
          k === 0 ? { transform: 'translate(-50%,-50%) rotate(0deg) scale(1)', zIndex: 30, opacity: 1 }
          : k === 1 ? { transform: 'translate(-44%,-46%) rotate(5deg) scale(0.94)', zIndex: 20, opacity: 1 }
          : k === 2 ? { transform: 'translate(-38%,-42%) rotate(10deg) scale(0.88)', zIndex: 10, opacity: 0.9 }
          : { transform: 'translate(-50%,-50%) scale(0.85)', zIndex: 0, opacity: 0 }
        return (
          <button
            key={it.src}
            type="button"
            onClick={() => (k === 0 ? onOpen(i) : setCur(i))}
            style={style}
            className="absolute left-1/2 top-1/2 w-[82%] rounded-md bg-white p-2 pb-9 shadow-[0_16px_36px_rgba(0,0,0,0.55)] transition-all duration-500 ease-out md:w-[52%]"
          >
            <img src={it.src} alt={it.caption} loading="lazy" decoding="async" className="aspect-[16/10] w-full rounded-sm object-cover" />
            <span className="absolute inset-x-3 bottom-2 truncate text-left text-caption text-ink-700">{it.caption}</span>
          </button>
        )
      })}
      <div className="absolute bottom-2 right-3 z-40 flex items-center gap-2">
        <span className="font-mono text-caption tabular-nums text-white/60">{cur + 1} / {n}</span>
        <button type="button" onClick={() => step(-1)} aria-label="上一张" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => step(1)} aria-label="下一张" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* 学科竞赛：环形 3D 转台，获奖现场绕圈慢转，悬停暂停，正对的那张最亮。 */
function RingStage({ items, onOpen }) {
  const n = items.length
  const [angle, setAngle] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setAngle((a) => a - 360 / n), 3800)
    return () => clearInterval(t)
  }, [paused, n])
  const front = ((Math.round(-angle / (360 / n)) % n) + n) % n
  const step = (d) => setAngle((a) => a - d * (360 / n))
  return (
    <div className="relative h-[340px] overflow-hidden md:h-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div aria-hidden className="absolute left-1/2 top-0 h-[70%] w-[70%] -translate-x-1/2 bg-gradient-to-b from-white/[0.10] to-transparent [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)]" />
      <div aria-hidden className="absolute bottom-6 left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-lg" />
      <div
        className="absolute left-1/2 top-1/2 -ml-[125px] -mt-[105px] h-[210px] w-[250px] [--rz:210px] [transform-style:preserve-3d] transition-transform duration-[900ms] ease-in-out md:-ml-[165px] md:-mt-[125px] md:h-[250px] md:w-[330px] md:[--rz:300px]"
        style={{ transform: `rotateY(${angle}deg)` }}
      >
        {items.map((it, i) => (
          <button
            key={it.src}
            type="button"
            onClick={() => onOpen(i)}
            style={{ transform: `rotateY(${i * (360 / n)}deg) translateZ(var(--rz))` }}
            className={`group absolute inset-0 overflow-hidden rounded-lg border [backface-visibility:hidden] transition-opacity duration-700 ${i === front ? 'border-white/25 opacity-100' : 'border-white/10 opacity-60'}`}
          >
            <img src={it.src} alt={it.caption} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/70 to-transparent" />
          </button>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-1.5">
        <p className="max-w-[80%] truncate text-caption text-white/85">{items[front].caption}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="上一个" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-caption tabular-nums text-white/50">{front + 1} / {n}</span>
          <button type="button" onClick={() => step(1)} aria-label="下一个" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

const VIEWS = { conference: FilmReel, textbook: Bookshelf, project: PinBoard, training: CardDeck, competition: RingStage }

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
              <div className="md:h-[516px]">
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