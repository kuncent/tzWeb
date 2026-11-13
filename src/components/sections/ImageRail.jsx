import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react'
import { ClipThumb } from './ClipRail'

/* 图片缩略图选择条：与 ClipRail 同一套溢出/翻页/滚轮逻辑，只是缩略图从录屏换成静态封面。
   一切额外元素（箭头、端点渐隐）都由「内容是否真的放不下」决定，不写死产品个数：
   产品少时干净得像装饰，产品多了才长出翻页箭头，且永远只占固定的一行高。 */

const pad = (i) => String(i + 1).padStart(2, '0')

/** 单张缩略图：静止是封面，悬停轻微推近给出反馈，点击换台。 */
export function ImageThumb({ pr, k, on, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-current={on}
      aria-label={pr.embodied ? `${pr.name} 3D 展台` : `${pr.name} 界面截图`}
      className={`group relative aspect-video w-[148px] shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-all duration-300 [@media(max-height:820px)]:w-[124px] ${
        on
          ? 'border-brand/70 ring-1 ring-brand/25'
          : 'border-white/20 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_8px_24px_-8px_rgba(22,119,255,0.55)]'
      }`}
    >
      {pr.thumb ? (
        <img
          src={pr.thumb}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,rgba(22,119,255,0.16),rgba(6,8,13,0.9))]">
          {pr.embodied ? (
            <Bot className="h-7 w-7 text-accent-ice/85" />
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-ice/80">{pr.code}</span>
          )}
        </span>
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-night/25" />
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-2 pb-1">
        <span className={`font-mono text-[11px] tabular-nums ${on ? 'text-brand-300' : 'text-ink-400'}`}>{pad(k)}</span>
        <span className="min-w-0 flex-1 truncate text-left text-[12.5px] font-medium text-white/90">{pr.name}</span>
      </span>
      <span className="absolute right-1.5 top-1.5 rounded-sm bg-night/70 px-1 font-mono text-[8px] tabular-nums tracking-[0.1em] text-white/70">
        {pr.embodied ? '3D 展台' : pr.shots.length > 0 ? `${pr.shots.length} 图` : '装备'}
      </span>
      {on ? (
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-sm bg-brand px-1.5 py-[3px] font-mono text-[8px] uppercase tracking-[0.12em] text-white">
          <span className="h-1 w-1 rounded-full bg-white" />
          ON AIR
        </span>
      ) : (
        /* 未选中项：角标常显，不等 hover 才告诉人「这里能点」 */
        <span className="pointer-events-none absolute left-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-sm border border-white/25 bg-night/70 text-white/80">
          <MousePointerClick className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  )
}

/** 横滑条本体：溢出检测 + 端点箭头 + 滚轮映射。 */
export function ImageRail({ products, active, onPick }) {
  const railRef = useRef(null)
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
    const ro = new ResizeObserver(measure)
    ro.observe(rail)
    rail.addEventListener('scroll', measure, { passive: true })
    return () => {
      ro.disconnect()
      rail.removeEventListener('scroll', measure)
    }
  }, [measure, products.length])

  /* 选中项滚到中间 */
  useEffect(() => {
    const rail = railRef.current
    const el = rail?.children[active]
    if (!rail || !el) return
    rail.scrollTo({ left: el.offsetLeft - (rail.clientWidth - el.clientWidth) / 2, behavior: 'smooth' })
  }, [active, products.length])

  /* 竖向滚量映射成横向；已在端点时把 data-lenis-prevent 摘掉一帧交还页面 */
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
    'absolute top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-white/12 bg-night/85 text-white/75 backdrop-blur-sm transition-colors hover:border-brand/60 hover:bg-brand/25 hover:text-white'

  return (
    <div className="relative flex shrink-0 flex-col gap-1.5">
      {/* 多数人根本不会把鼠标移到缩略图上，提示改为常显 + 图标呼吸，不再依赖 hover */}
      <div className="flex items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.12em]">
        <span className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-brand/45 bg-brand/15 px-2.5 py-1 font-medium text-brand-300 shadow-[0_0_14px_rgba(22,119,255,0.4)]">
          <MousePointerClick className="h-3.5 w-3.5 text-accent-ice motion-safe:animate-pulse" />
          <span className="lg:hidden">滑动 · </span>
          点击缩略图切换产品
          {/* 扫光：从左侧掠过，间歇出现，避免持续闪动干扰 */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/40 blur-[3px] motion-safe:animate-[hintShine_3.2s_ease-in-out_infinite]"
          />
        </span>
        <span className="tabular-nums text-white/45">
          {pad(active)} / {pad(products.length - 1)}
        </span>
      </div>
      <div className="flex items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <div
          {...(edge.over ? { 'data-lenis-prevent': '' } : {})}
          ref={railRef}
          className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((pr, k) =>
            pr.clip ? (
              <ClipThumb key={pr.code} pr={pr} k={k} on={k === active} onPick={() => onPick(k)} />
            ) : (
              <ImageThumb key={pr.code} pr={pr} k={k} on={k === active} onPick={() => onPick(k)} />
            ),
          )}
        </div>
        {edge.left && (
          <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-night to-transparent" />
        )}
        {edge.right && (
          <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-night to-transparent" />
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
      </div>
    </div>
  )
}