import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Reveal } from '../ui'
import { honors } from '../../data/honors'

/* 荣誉墙：浅色展墙 + 一条横向排开的牌匾展台。
   牌匾图为按实物正面重绘的 1600×1200 SVG（scripts/gen-honors.mjs 生成），
   统一画幅、留白与光感，材质差异靠画面本身表达，这里只负责排列与图注。
   第四项数据直接取 honors.length：honors.js 是唯一真源，增删牌匾不必再改文案。

   底色走全站浅色 token（mist / ink / brand），与下方新闻、联系两屏同一张纸，
   不再是一条深色块。黄铜、红木这类暖色匾面放在浅底上会发飘，所以每块牌匾
   都叠了一层白色卡纸底：1px 冷灰描边 + 接触阴影 + 环境阴影，把匾面「压」在墙上。

   排布参照「一条横幅、共底排列」的展墙形态：整排同高、同底线地横向铺开，
   放不下就横滑。展台缓慢自动轮播：整排复制一份接在尾部，滚到一份的宽度就无声
   回卷，衔接处画面完全重合，不会出现空白或首尾错位。
   悬停只是减速（留出看清匾面的时间，也不至于打断节奏）；聚焦 / 拖拽 / 滚轮 /
   点箭头这些主动操作才真正让位，停手后稍等再续播；
   系统开了「减少动态效果」就整排静止，只保留手动滑动。 */

const AUTO_SPEED = 30 // px/s，一块牌匾约 5.5 秒滑过，节奏偏慢
const HOVER_SLOW = 0.25 // 悬停降到四分之一速：明显变慢但仍在走

const stats = [
  { v: '国家级', k: '高新技术企业' },
  { v: '省市级', k: '专精特新中小企业' },
  { v: 'AAA', k: '企业信用等级' },
  { v: String(honors.length), k: '块校企合作牌匾' },
]

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

function Plaque({ h, clone = false }) {
  return (
    <figure
      aria-hidden={clone || undefined}
      className="group w-[calc((100%_-_0.75rem)/2.6)] max-w-[200px] shrink-0 sm:w-[calc((100%_-_2rem)/3.7)] lg:w-[calc((100%_-_3.75rem)/5.4)] xl:w-[calc((100%_-_5rem)/6.6)]"
    >
      {/* 牌匾只作展示，不再可点：交互只剩展台本身的滚动 */}
      <div className="relative rounded-xl bg-white p-1 shadow-[0_1px_2px_rgba(11,18,32,0.06),0_12px_26px_-16px_rgba(11,18,32,0.32)] ring-1 ring-ink-900/[0.08]">
        <img
          src={h.file}
          alt={`${h.org} · ${h.title}`}
          width={1600}
          height={1200}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="block h-auto w-full rounded-[7px]"
        />
      </div>
      <figcaption className="mt-2.5 px-0.5">
        <p className="truncate text-ui-sm font-medium text-ink-900">{h.title}</p>
        <p className="mt-0.5 truncate text-caption text-ink-500">{h.org}</p>
      </figcaption>
    </figure>
  )
}

function HonorShelf() {
  const railRef = useRef(null)
  const holdTimer = useRef(0)
  const suppressClick = useRef(false)
  const [edge, setEdge] = useState({ over: false, left: false, right: false })
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [hold, setHold] = useState(false)
  const [inView, setInView] = useState(false)
  const reduced = useReducedMotion()

  const measure = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const max = rail.scrollWidth - rail.clientWidth
    const next = { over: max > 2, left: rail.scrollLeft > 2, right: rail.scrollLeft < max - 2 }
    setEdge((p) => (p.over === next.over && p.left === next.left && p.right === next.right ? p : next))
  }, [])

  /* 手动操作后先歇一会儿再续播，避免刚松手就被自动滚动拽走 */
  const pauseBriefly = useCallback(() => {
    setHold(true)
    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => setHold(false), 1800)
  }, [])

  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(rail)
    rail.addEventListener('scroll', measure, { passive: true })
    return () => {
      ro.disconnect()
      rail.removeEventListener('scroll', measure)
    }
  }, [measure])

  /* 滚出视口就别空转 */
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 })
    io.observe(rail)
    return () => io.disconnect()
  }, [])

  /* 悬停只改速度不改启停：用 ref 传进逐帧循环，避免悬停时重启 effect 造成顿挫 */
  const slowRef = useRef(1)
  slowRef.current = hovered ? HOVER_SLOW : 1

  const paused = reduced || focused || dragging || hold || !inView

  /* 自动轮播：逐帧推进 scrollLeft，走到「一份副本」的宽度就减去这段长度，
     因为尾部复制了整排，回卷前后画面完全一致，接缝处不会空、也不会错位 */
  useEffect(() => {
    const rail = railRef.current
    if (!rail || paused) return
    const period = () => {
      const first = rail.children[0]
      const twin = rail.children[honors.length]
      if (!first || !twin) return 0
      /* 用 rect 差而不是 offsetLeft：前者保留小数，回卷不会差出 1px 的接缝 */
      return twin.getBoundingClientRect().left - first.getBoundingClientRect().left
    }
    let p = period()
    if (p > 0 && rail.scrollLeft >= p) {
      rail.scrollLeft %= p
    }
    let pos = rail.scrollLeft
    let last = performance.now()
    let raf = 0
    const step = (now) => {
      /* 限幅只为避免切回标签页时一口气窜很远；120ms 容得下 8fps 的机器 */
      const dt = Math.min(120, now - last)
      last = now
      p = period()
      if (p > 0) {
        pos += (AUTO_SPEED * slowRef.current * dt) / 1000
        if (pos >= p) pos -= p
        rail.scrollLeft = pos
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [paused])

  /* 竖向滚量映射成横滑：溢出时挂 data-lenis-prevent，Lenis 会整段跳过；
     已经在端点就把属性摘掉一帧，把这一下滚轮交还页面，不把用户锁在展台上 */
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const onWheel = (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const max = rail.scrollWidth - rail.clientWidth
      if (max <= 2) return
      const next = Math.min(max, Math.max(0, rail.scrollLeft + d))
      if (next !== rail.scrollLeft) {
        e.preventDefault()
        rail.scrollLeft = next
        pauseBriefly()
      } else {
        rail.removeAttribute('data-lenis-prevent')
        requestAnimationFrame(() => rail.setAttribute('data-lenis-prevent', ''))
      }
    }
    rail.addEventListener('wheel', onWheel, { passive: false })
    return () => rail.removeEventListener('wheel', onWheel)
  }, [pauseBriefly])

  /* 鼠标左右拖拽（触屏用原生横滑）：只认左键，中键既不启动拖拽、也不拦默认行为，
     中键自动滚屏仍归浏览器；拖动期间自动轮播让位，松手后吞掉那一下点击，
     免得拖完还顺手打开了牌匾大图 */
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    let active = false
    let moved = false
    let startX = 0
    let startLeft = 0
    const onDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      active = true
      moved = false
      startX = e.clientX
      startLeft = rail.scrollLeft
    }
    const onMove = (e) => {
      if (!active) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) < 6) return
      if (!moved) {
        moved = true
        setDragging(true)
        rail.style.userSelect = 'none'
      }
      rail.scrollLeft = startLeft - dx
    }
    const onUp = () => {
      if (!active) return
      active = false
      if (!moved) return
      setDragging(false)
      rail.style.userSelect = ''
      suppressClick.current = true
      pauseBriefly()
    }
    const onClick = (e) => {
      if (!suppressClick.current) return
      suppressClick.current = false
      e.preventDefault()
      e.stopPropagation()
    }
    rail.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    rail.addEventListener('click', onClick, true)
    return () => {
      rail.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      rail.removeEventListener('click', onClick, true)
    }
  }, [pauseBriefly])

  const page = (dir) => {
    const rail = railRef.current
    if (!rail) return
    pauseBriefly()
    rail.scrollBy({ left: dir * Math.max(240, rail.clientWidth * 0.8), behavior: 'smooth' })
  }

  const arrow =
    'absolute top-[42%] z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-ink-900/10 bg-white/95 text-ink-700 shadow-[0_4px_14px_-4px_rgba(11,18,32,0.28)] backdrop-blur-sm transition-colors hover:border-brand/50 hover:bg-brand-soft hover:text-brand sm:grid'

  return (
    <div
      className="relative"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false)
      }}
      onTouchStart={pauseBriefly}
      onTouchMove={pauseBriefly}
    >
      {/* py 给牌匾的落影留出上下余量：overflow-x-auto 会把另一轴也变成 auto，不留就会被切 */}
      <div
        {...(edge.over ? { 'data-lenis-prevent': '' } : {})}
        ref={railRef}
        aria-label="荣誉牌匾列表"
        className="no-scrollbar flex gap-3 overflow-x-auto py-3 sm:gap-4 lg:gap-5"
      >
        {honors.map((h) => (
          <Plaque key={h.file} h={h} />
        ))}
        {/* 尾部复制整排：回卷时画面无缝衔接；副本对读屏与 Tab 隐藏，避免重复朗读 */}
        {!reduced &&
          honors.map((h) => <Plaque key={`clone-${h.file}`} h={h} clone />)}
      </div>

      {edge.left && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-mist-100 via-mist-100/60 to-transparent sm:block" />
      )}
      {edge.right && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-mist-100 via-mist-100/60 to-transparent sm:block" />
      )}
      {edge.over && (
        <>
          {edge.left && (
            <button type="button" onClick={() => page(-1)} aria-label="向左查看更多牌匾" className={`${arrow} left-1`}>
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {edge.right && (
            <button type="button" onClick={() => page(1)} aria-label="向右查看更多牌匾" className={`${arrow} right-1`}>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function HonorWall() {
  return (
    <section id="honors" className="sec-y relative isolate scroll-mt-24 overflow-hidden bg-mist-100">
      {/* 背景：顶部一道冷灰分界 + 极淡的品牌蓝光晕；中间一层白光把牌匾从纸面托起来 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink-900/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_-8%,rgba(22,119,255,0.07),transparent_68%)]" />
        <div className="absolute inset-x-0 top-16 h-[440px] bg-[radial-gradient(45%_70%_at_50%_20%,rgba(255,255,255,0.95),transparent_74%)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(55%_100%_at_50%_100%,rgba(22,119,255,0.05),transparent_72%)]" />
      </div>

      <div className="container-x relative">
        <Reveal className="text-center">
          <p className="font-mono text-caption uppercase tracking-eyebrow text-brand-text">HONORS &amp; QUALIFICATIONS</p>
          <h2 className="mt-3 text-h2 font-bold text-ink-900">荣誉资质</h2>
          <p className="mx-auto mt-4 max-w-3xl text-pretty text-body-lg text-ink-500">
            从高校实践基地到行业协会会员单位 —— 每一块牌匾，都对应一段真实落地的共建关系。
          </p>
        </Reveal>

        {/* 数据条：对应参考图标题下的三列认证信息 */}
        <Reveal delay={0.06} className="mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.k} className="relative pl-4 text-left sm:pl-5">
              <span aria-hidden className="absolute left-0 top-1 h-[calc(100%-6px)] w-px bg-ink-900/12" />
              <p className="text-[clamp(1.15rem,1rem+0.7vw,1.6rem)] font-bold leading-none text-ink-900">{s.v}</p>
              <p className="mt-2 text-ui-sm leading-snug text-ink-500">{s.k}</p>
            </div>
          ))}
        </Reveal>

        {/* 牌匾展台：一条横向牌位，共底排列；下方一道细光当地面接缝 */}
        <Reveal delay={0.1} className="mt-10 md:mt-12">
          <HonorShelf />
          <div aria-hidden className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-ink-900/12 to-transparent" />
        </Reveal>
      </div>
    </section>
  )
}
