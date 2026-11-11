import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Reveal } from '../ui'
import { copyrights } from '../../data/copyrights'

/* 软件著作权：深色舞台 + 逐张循环轮播。
   版式沿用参考图的骨架：居中眉标 + 标题 → 三组数据 → 一条横贯全宽、两端被屏幕裁切的证书带。
   深色不用页脚那层最黑的 night，而是抬一阶的 night-800：仍是与浅色区隔开的暗色场，
   但不再压成一块黑；上下各压一条发丝接缝，让浅色「荣誉资质」→ 深色证书台 → 浅色
   「新闻资讯」的切换读作刻意的换场，而不是色块断层。

   轮播：走「一张一张」的步进，停住的永远是某张卡的边界，不会停在半张卡上。
   自动轮播慢速前进，拖动与键盘聚焦时暂停，悬停不打断；reduced-motion 下不自动走。
   循环：证书渲染三份，视觉始终停在中段那份；越过中段时把 scrollLeft 平移整份长度（47 步），
   因为偏移处的内容完全一样，重定位在画面上不可见，带子也不会在首尾空掉。
   两端仍各垫半屏，于是第 i 张居中的 scrollLeft 恰好是 i × (卡宽 + 缝宽)。

   间距：中间那张放大到 1.15。放大用 transform 不占布局，会把左右各约 9.7px 压进 10px 的缝里，
   所以给中线两侧的卡做等量位移补偿 —— 视觉上每条缝都还是 10px。卡片都是 origin-bottom，
   放大与补偿都不离地。不提供点击放大；reduced-motion 下取消放大与平滑吸附。 */

const RATIO = 1000 / 1354
const CARD_W = 'clamp(112px, 9vw, 132px)'
const GAP_PX = 10
const SCALE = 1.15
const COPIES = 3
const TOTAL = copyrights.length
const START = TOTAL + Math.floor(TOTAL / 2)
const AUTOPLAY = true
const AUTOPLAY_MS = 3200

const STATS = [
  { value: '47', suffix: '项', label: '软件著作权登记证书', lead: true },
  { value: '国家级', label: '国家版权局登记' },
  { value: '全场景', label: '金融科技实训场景' },
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

export default function CopyrightGrid() {
  const railRef = useRef(null)
  const itemsRef = useRef([])
  const dragRef = useRef({ down: false, startX: 0, startLeft: 0 })
  const metricsRef = useRef({ cw: 0, gap: 0, step: 0 })
  const centreRef = useRef(-1)
  const snapTimer = useRef(0)
  const paintRef = useRef(() => {})
  const reduced = useReducedMotion()
  const reducedRef = useRef(reduced)

  useEffect(() => {
    reducedRef.current = reduced
  }, [reduced])

  /* 卡宽与缝宽都从真实布局里读，不写死 —— 断点切换、窗口缩放都自动跟上 */
  const measure = useCallback(() => {
    const rail = railRef.current
    const first = itemsRef.current[0]
    /* 用计算样式取宽度：offsetWidth 会取整，多张累加后步长会漂移近 10px */
    const cw = first ? parseFloat(getComputedStyle(first).width) || 0 : 0
    const gap = rail ? parseFloat(getComputedStyle(rail).columnGap) || 0 : 0
    metricsRef.current = { cw, gap, step: cw + gap }
    return metricsRef.current
  }, [])

  /* 轨道两端各垫 (视口宽 - 卡宽) / 2 - 缝宽，于是第 i 张居中的 scrollLeft 恰好是 i × (卡宽 + 缝宽) */
  const goTo = useCallback((i, smooth = true) => {
    const rail = railRef.current
    const { step } = metricsRef.current
    if (!rail || !step) return
    const idx = Math.max(0, Math.min(COPIES * TOTAL - 1, i))
    const target = idx * step
    if (Math.abs(rail.scrollLeft - target) < 1.5) return
    rail.scrollTo({ left: target, behavior: smooth && !reducedRef.current ? 'smooth' : 'auto' })
  }, [])

  /* 把索引收回中段那份：整份平移 scrollLeft，画面上完全等价，所以看不见跳 */
  const rebase = useCallback((idx) => {
    const rail = railRef.current
    const { step } = metricsRef.current
    if (!rail || !step) return idx
    let next = idx
    if (idx >= TOTAL * 2) next = idx - TOTAL
    else if (idx < TOTAL) next = idx + TOTAL
    if (next !== idx) {
      rail.scrollLeft += (next - idx) * step
      paintRef.current()
    }
    return next
  }, [])

  /* 停手后吸附到最近一张：拖动、触控板、触摸惯性都走这里 */
  const settle = useCallback(() => {
    const rail = railRef.current
    const { step } = metricsRef.current
    if (!rail || !step || dragRef.current.down) return
    goTo(rebase(Math.round(rail.scrollLeft / step)))
  }, [goTo, rebase])

  const stepBy = useCallback(
    (dir) => {
      const rail = railRef.current
      const { step } = metricsRef.current
      if (!rail || !step) return
      goTo(rebase(Math.round(rail.scrollLeft / step)) + dir)
    },
    [goTo, rebase],
  )

  /* 首屏落在中段那份的正中，保留「整条带子两端出血」的构图 */
  useLayoutEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const { step } = measure()
    rail.scrollLeft = START * step
  }, [measure])

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    let raf = 0
    centreRef.current = -1

    const paint = () => {
      raf = 0
      const { cw, step } = metricsRef.current
      if (!step) return
      const n = itemsRef.current.length
      const best = Math.max(0, Math.min(n - 1, Math.round(rail.scrollLeft / step)))
      if (best !== centreRef.current) {
        centreRef.current = best
        /* 放大外溢的一半，从两侧邻居身上等量退回去，缝宽才不会在中间变窄 */
        const h = (cw * (SCALE - 1)) / 2
        for (let i = 0; i < n; i++) {
          const node = itemsRef.current[i]
          if (!node) continue
          const on = i === best
          node.style.transform = reduced ? '' : on ? `scale(${SCALE})` : `translateX(${i < best ? -h : h}px)`
          if (node.dataset.centre !== String(on)) node.dataset.centre = String(on)
        }
      }
    }
    paintRef.current = paint

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint)
      window.clearTimeout(snapTimer.current)
      if (dragRef.current.down) return
      snapTimer.current = window.setTimeout(settle, 150)
    }

    paint()
    rail.addEventListener('scroll', onScroll, { passive: true })

    /* 断点切换会改变卡宽与缝宽：按当前张数重新对位 */
    const ro = new ResizeObserver(() => {
      const prev = metricsRef.current.step
      const next = measure()
      if (!next.step || next.step === prev) return
      const idx = centreRef.current < 0 ? START : centreRef.current
      rail.scrollLeft = idx * next.step
      centreRef.current = -1
      paint()
    })
    ro.observe(rail)

    return () => {
      rail.removeEventListener('scroll', onScroll)
      ro.disconnect()
      window.clearTimeout(snapTimer.current)
      cancelAnimationFrame(raf)
      paintRef.current = () => {}
    }
  }, [reduced, measure, settle])

  /* 自动轮播：慢速逐张，拖动与键盘聚焦时暂停；悬停不打断，reduced-motion 下不自动走。
     整段离屏时也停：这条带子有 141 张卡，每次步进都要给全部卡写一遍 transform，
     滚到页面别处后那笔开销全是白付的。 */
  useEffect(() => {
    if (!AUTOPLAY) return
    const rail = railRef.current
    if (!rail) return
    let focused = false
    let onScreen = true
    let timer = 0
    const stop = () => window.clearTimeout(timer)
    const arm = () => {
      stop()
      if (reducedRef.current || focused || !onScreen) return
      timer = window.setTimeout(() => {
        if (!reducedRef.current && !dragRef.current.down) stepBy(1)
        arm()
      }, AUTOPLAY_MS)
    }
    const onDown = () => stop()
    const onUp = () => arm()
    const onFocusIn = () => {
      /* 只认键盘聚焦；鼠标点击、拖动落下的焦点不应把轮播永久停住 */
      if (!rail.matches(':focus-visible')) return
      focused = true
      stop()
    }
    const onFocusOut = () => {
      focused = false
      arm()
    }
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
      arm()
    })
    io.observe(rail)
    rail.addEventListener('pointerdown', onDown)
    rail.addEventListener('pointerup', onUp)
    rail.addEventListener('pointercancel', onUp)
    rail.addEventListener('focusin', onFocusIn)
    rail.addEventListener('focusout', onFocusOut)
    arm()
    return () => {
      stop()
      io.disconnect()
      rail.removeEventListener('pointerdown', onDown)
      rail.removeEventListener('pointerup', onUp)
      rail.removeEventListener('pointercancel', onUp)
      rail.removeEventListener('focusin', onFocusIn)
      rail.removeEventListener('focusout', onFocusOut)
    }
  }, [stepBy])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      stepBy(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      stepBy(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      goTo(TOTAL)
    } else if (e.key === 'End') {
      e.preventDefault()
      goTo(TOTAL * 2 - 1)
    }
  }

  /* 鼠标拖拽：只接管左键 mouse（中键不启动拖拽、也不拦默认行为），触屏交给原生滚动 */
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    dragRef.current = { down: true, startX: e.clientX, startLeft: railRef.current.scrollLeft }
  }
  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d.down) return
    railRef.current.scrollLeft = d.startLeft - (e.clientX - d.startX)
  }
  const endDrag = () => {
    if (!dragRef.current.down) return
    dragRef.current.down = false
    settle()
  }

  return (
    <section id="copyrights" className="relative isolate scroll-mt-24 overflow-hidden bg-night-800 py-16 text-white md:py-24">
      {/* 舞台光：顶部主光 + 两侧侧光。底色抬到 night-800 之后，主光不再需要把顶边照亮到发灰 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(900px 420px at 50% -10%, rgba(75,107,255,0.17), transparent 72%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[30%]"
        style={{ background: 'radial-gradient(58% 46% at 0% 55%, rgba(34,211,238,0.07), transparent 76%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[30%]"
        style={{ background: 'radial-gradient(58% 46% at 100% 55%, rgba(75,107,255,0.09), transparent 76%)' }}
      />
      {/* 换场接缝：浅色 → 深色的一条受光边，深色 → 浅色同理 */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

      <div className="container-x relative text-center">
        <Reveal>
          <p className="font-mono text-caption uppercase tracking-eyebrow text-accent-sky">SOFTWARE COPYRIGHTS</p>
          <h2 className="mt-3 text-h2 font-bold text-white">软件著作权</h2>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-3 md:mt-10 md:gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <div className="flex h-11 items-end md:h-14">
                  <span
                    className={`tabular-nums text-white ${
                      s.lead
                        ? 'text-[clamp(30px,3.4vw,42px)] font-bold leading-none tracking-[-0.03em]'
                        : 'text-[clamp(17px,1.9vw,22px)] font-semibold leading-none tracking-tight'
                    }`}
                  >
                    {s.value}
                    {s.suffix && (
                      <span className="ml-1 align-top text-[11px] font-medium text-white/55">{s.suffix}</span>
                    )}
                  </span>
                </div>
                <p className="mt-2 text-caption leading-snug text-white/55">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* 证书带：全宽出血，两端垫半屏空白，逐张吸附居中 */}
      <div className="relative mt-8 md:mt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[240px] w-[460px] -translate-x-1/2 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(closest-side, rgba(75,107,255,0.19), transparent 74%)' }}
        />
        <div className="relative">
          <div
            ref={railRef}
            role="region"
            aria-roledescription="轮播"
            aria-label="软件著作权证书，自动逐张轮播，也可拖动、滑动或按左右方向键浏览"
            tabIndex={0}
            style={{ '--cw': CARD_W, '--cg': `${GAP_PX}px` }}
            className="flex cursor-grab select-none items-end gap-[var(--cg)] overflow-x-auto pb-5 pt-8 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/25 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
          >
            {/* 两端垫片：让首尾也能停在正中，宽度扣掉缝宽以免多出一格 */}
            <span aria-hidden className="shrink-0" style={{ width: 'calc(50% - var(--cw) / 2 - var(--cg))' }} />
            {Array.from({ length: COPIES * TOTAL }, (_, i) => {
              const c = copyrights[i % TOTAL]
              const duplicate = i < TOTAL || i >= TOTAL * 2
              return (
                <div
                  key={i}
                  ref={(el) => (itemsRef.current[i] = el)}
                  data-centre="false"
                  aria-hidden={duplicate || undefined}
                  style={{ transformOrigin: 'bottom center' }}
                  className={`group relative w-[var(--cw)] shrink-0 origin-bottom ${
                    reduced ? '' : 'transition-transform duration-300 ease-out'
                  }`}
                >
                  <span
                    className="relative block select-none rounded-[7px] bg-white p-1.5 shadow-[0_1px_2px_rgba(3,6,20,0.5),0_16px_32px_-16px_rgba(2,5,22,0.62)] transition-shadow duration-300 group-data-[centre=true]:shadow-[0_1px_2px_rgba(3,6,20,0.5),0_0_0_1px_rgba(168,196,255,0.45),0_26px_54px_-18px_rgba(96,140,255,0.5)]"
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                  >
                    {/* 图片防下载：拦右键菜单 / 拖拽 / 长按「存储图像」；
                        img 关掉指针命中，右键落点变成外层容器，浏览器就不给「图片另存为」 */}
                    <img
                      src={c.file}
                      alt={duplicate ? '' : `${c.title} 软件著作权登记证书`}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      style={{ aspectRatio: RATIO }}
                      className="pointer-events-none block w-full select-none rounded-[3px] bg-white object-contain"
                    />
                  </span>
                </div>
              )
            })}
            <span aria-hidden className="shrink-0" style={{ width: 'calc(50% - var(--cw) / 2 - var(--cg))' }} />
          </div>
        </div>

        {/* 地面：一条亮线 + 一汪光池。底抬亮后亮线压细、光池收薄，否则整条地缝会浮起来 */}
        <div aria-hidden className="relative">
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
          <div
            className="h-16 md:h-20"
            style={{ background: 'radial-gradient(56% 100% at 50% 0%, rgba(75,107,255,0.13), transparent 76%)' }}
          />
        </div>
      </div>
    </section>
  )
}
