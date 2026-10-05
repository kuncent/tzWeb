import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/* 动画缩略图选择条：产品选择的横排缩略图，静止是封面、鼠标上去就自己播。
   截图视差的问题是「它终究是一张图」，缩略图同理 —— 三套界面风格完全不同的
   产品摆在一起，动起来的辨识度远高于三张静态封面。

   这条是为「以后只会更多、不会更少」写的，所以一切额外元素都由
   「内容是否真的放不下」决定，而不是写死产品个数：
   1) 三套时它干净得像装饰，没有箭头也没有遮罩；
   2) 放不下才长出左右翻页箭头与端点渐隐，并且永远只占固定的一行高
      （竖排胶囊那种做法会把主画面越挤越窄，产品一多就不可用）。
   任何带 clip 字段的产品数组都能直接用它，后续模块产品页不必再写一遍。 */

const pad = (i) => String(i + 1).padStart(2, '0')

/** 单张缩略图。
 *  preload="none"：不在视野里就不拉流，产品加到十个也只是十张封面，
 *  悬停才真去请求那一段录屏（每段 ≤1.5MB，浏览器自己会留着复用）。
 *  peek 是各自切入的那一秒，挑最有辨识度的一幕，几张摆在一起才分得开。 */
export function ClipThumb({ pr, k, on, onPick }) {
  const v = useRef(null)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const el = v.current
    if (!el) return
    if (hover) {
      try {
        el.currentTime = pr.clip.peek || 0
      } catch {
        /* 元数据还没到，赋值会被媒体元素存成待执行 seek，不影响 */
      }
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [hover, pr])

  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-current={on}
      aria-label={`${pr.name} 演示`}
      /* 缩略图行是纯增量成本，矮屏（1366×768 这类）上必须收，否则会把主画面挤掉一百多 px；
         宽度下限则由最长的产品名定，再窄就只剩省略号 */
      className={`group relative aspect-video w-[148px] shrink-0 overflow-hidden rounded-lg border transition-colors duration-300 [@media(max-height:820px)]:w-[124px] ${
        on ? 'border-brand/70' : 'border-white/[0.09] hover:border-white/30'
      }`}
    >
      <video
        ref={v}
        data-film="thumb"
        src={pr.clip.src}
        poster={pr.clip.poster}
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-[#04070d] via-transparent to-[#04070d]/25" />
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-2 pb-1">
        <span className={`font-mono text-[11px] tabular-nums ${on ? 'text-brand-300' : 'text-ink-400'}`}>{pad(k)}</span>
        <span className="min-w-0 flex-1 truncate text-left text-[12.5px] font-medium text-white/90">{pr.name}</span>
      </span>
      <span className="absolute right-1.5 top-1.5 rounded-sm bg-[#04070d]/70 px-1 font-mono text-[8px] tabular-nums tracking-[0.1em] text-white/70">
        {pr.clip.chapters.length} 幕
      </span>
      {on && (
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-sm bg-brand px-1.5 py-[3px] font-mono text-[8px] uppercase tracking-[0.12em] text-white">
          <span className="h-1 w-1 rounded-full bg-white" />
          ON AIR
        </span>
      )}
    </button>
  )
}

/** 横滑条本体：溢出检测 + 端点箭头 + 滚轮映射。 */
export function ClipRail({ products, active, onPick }) {
  const railRef = useRef(null)
  /* over=内容放不下，left/right=这一侧还有货没露出来。三个产品时三个全 false，
     条子上一个装饰都不会长出来，所以「更多产品」这件事不需要谁来改代码 */
  const [edge, setEdge] = useState({ over: false, left: false, right: false })

  const measure = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const max = rail.scrollWidth - rail.clientWidth
    const next = {
      over: max > 2,
      left: rail.scrollLeft > 2,
      right: rail.scrollLeft < max - 2,
    }
    setEdge((p) => (p.over === next.over && p.left === next.left && p.right === next.right ? p : next))
  }, [])

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    measure()
    /* ResizeObserver 只管得到条子自己变宽，产品数变化靠 deps 再量一次 */
    const ro = new ResizeObserver(measure)
    ro.observe(rail)
    rail.addEventListener('scroll', measure, { passive: true })
    return () => {
      ro.disconnect()
      rail.removeEventListener('scroll', measure)
    }
  }, [measure, products.length])

  /* 选中项滚到中间：产品多了以后，从键盘或别处切过去也能看到当前是哪个 */
  useEffect(() => {
    const rail = railRef.current
    const el = rail?.children[active]
    if (!rail || !el) return
    rail.scrollTo({ left: el.offsetLeft - (rail.clientWidth - el.clientWidth) / 2, behavior: 'smooth' })
  }, [active, products.length])

  /* 竖向滚量映射成横向：溢出时条子上挂着 data-lenis-prevent，Lenis 遇到它会整段跳过，
     不做映射的话鼠标滚轮停在缩略图条上就成了「页面和条子都不动」。
     已经在端点时把属性摘掉一帧 —— Lenis 是在事件冒泡到 window 时才读它，
     所以同一个事件还能原样交还给页面继续滚，不会把用户锁死在这里。 */
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
      } else {
        rail.removeAttribute('data-lenis-prevent')
        requestAnimationFrame(() => rail.setAttribute('data-lenis-prevent', ''))
      }
    }
    rail.addEventListener('wheel', onWheel, { passive: false })
    return () => rail.removeEventListener('wheel', onWheel)
  }, [])

  const page = (dir) => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({ left: dir * Math.max(150, rail.clientWidth * 0.7), behavior: 'smooth' })
  }

  const arrow =
    'absolute top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-white/12 bg-[#05080e]/85 text-white/75 backdrop-blur-sm transition-colors hover:border-brand/60 hover:bg-brand/25 hover:text-white'

  return (
    <div className="relative flex shrink-0 items-center gap-3">
      <div className="relative min-w-0 flex-1">
        {/* data-lenis-prevent 只在真的放不下时挂：三个产品时条子横向滚不动，
            挂了它反而会把这一行的滚轮吃掉，变成页面上的死区 */}
        <div
          {...(edge.over ? { 'data-lenis-prevent': '' } : {})}
          ref={railRef}
          className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((pr, k) => (
            <ClipThumb key={pr.code} pr={pr} k={k} on={k === active} onPick={() => onPick(k)} />
          ))}
        </div>
        {/* 端点渐隐只在这一侧真的有内容时出现，比常驻一条更诚实 */}
        {edge.left && (
          <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#05080e] to-transparent" />
        )}
        {edge.right && (
          <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#05080e] to-transparent" />
        )}
        {edge.over && (
          <>
            <button type="button" onClick={() => page(-1)} aria-label="上一批产品" className={`${arrow} left-0.5`}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => page(1)} aria-label="下一批产品" className={`${arrow} right-0.5`}>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      {/* 悬停即播是个不 obvious 的手势，得写出来；触摸端没有 hover，就只说「点击换台」。
         计数放在这里：产品一多，用户得知道自己是看完了还是漏了 */}
      <p className="hidden shrink-0 text-right font-mono text-[11px] uppercase leading-[1.5] tracking-[0.12em] text-ink-500 lg:block">
        <span className="hidden xl:inline">
          悬停预览
          <span className="mx-1 text-white/25">/</span>
        </span>
        点击换台
        <span className="mx-1 text-white/25">·</span>
        <span className="tabular-nums">
          {pad(active)} / {pad(products.length - 1)}
        </span>
      </p>
    </div>
  )
}
