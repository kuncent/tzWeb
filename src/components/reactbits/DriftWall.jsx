import { useEffect, useMemo, useRef, useState } from 'react'

/* ============================================================
 * Drift Wall —— 参考 reactbits.dev/components/drift-wall 的「横向 · 平面」定制版
 * ------------------------------------------------------------
 * 多「行」校徽卡在整面墙上横向漂移（相邻行方向相反 + variance 速度抖动），左右两端
 * 线性淡出读作无尽之墙；悬停单卡像「产业客户」卡那样轻微上浮 + 品牌描边。
 * 去掉 3D 透视/倾斜/缩放（平面铺满容器，避免透视投影把墙缩得比容器小而在上下露出空白）。
 * 纯 rAF 驱动，不依赖 motion/framer；prefers-reduced-motion 下静止。
 * ============================================================ */

const cx = (...parts) => parts.filter(Boolean).join(' ')

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const rowFactor = (index, variance) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1
  return 1 + variance * pseudo
}

export default function DriftWall({
  items = [],
  rows = 4,
  tileWidth = 180,
  tileHeight = 120,
  gap = 16,
  radius = 16,
  speed = 28,
  direction = 'left',
  variance = 0.5,
  pauseOnHover = true,
  hoverSpeed = 0,
  fade = true,
  className = '',
  style
}) {
  const containerRef = useRef(null)
  const trackRefs = useRef([])
  const offsetsRef = useRef([])
  const velocitiesRef = useRef([])
  const hoveredRowRef = useRef(-1)
  const wallHoveredRef = useRef(false)
  const rafRef = useRef(null)
  const lastTsRef = useRef(null)

  const [containerWidth, setContainerWidth] = useState(1200)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(reducedMotion())
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // 瓷砖轮转分配到各行 → 每行都有标杆校与新增校，长度接近
  const rowItems = useMemo(() => {
    const rs = Array.from({ length: rows }, () => [])
    items.forEach((item, i) => rs[i % rows].push(item))
    return rs.map((r) => (r.length ? r : items.slice(0, 1)))
  }, [items, rows])

  // 每行副本数：整行内容宽 ≥ 容器宽 + 一个循环宽，保证任意 offset 下都不露空白
  const rowMeta = useMemo(() => {
    const unit = tileWidth + gap
    return rowItems.map((r) => {
      const copyWidth = Math.max(unit, r.length * unit)
      const copies = Math.max(2, Math.ceil((containerWidth * 1.5) / copyWidth) + 1)
      return { copyWidth, copies }
    })
  }, [rowItems, tileWidth, gap, containerWidth])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width || 1200)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const baseVelocities = useMemo(() => {
    const dirSign = direction === 'left' ? 1 : -1
    return rowItems.map((_, r) => speed * rowFactor(r, variance) * dirSign * (r % 2 === 0 ? 1 : -1))
  }, [rowItems, speed, direction, variance])

  useEffect(() => {
    offsetsRef.current = rowMeta.map((meta, r) => meta.copyWidth * ((r * 0.37) % 1))
    velocitiesRef.current = rowItems.map(() => 0)
  }, [rowMeta, rowItems])

  useEffect(() => {
    const animate = (ts) => {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const dt = Math.min(0.05, Math.max(0, ts - lastTsRef.current) / 1000)
      lastTsRef.current = ts

      if (!reduced) {
        for (let r = 0; r < trackRefs.current.length; r++) {
          const meta = rowMeta[r]
          if (!meta) continue
          const hovering = (wallHoveredRef.current || hoveredRowRef.current === r) && pauseOnHover
          /* 悬停不硬停：按 hoverSpeed 降到低速继续漂移（0 = 完全停住，保持旧行为） */
          const target = hovering ? baseVelocities[r] * hoverSpeed : baseVelocities[r]
          const ease = 1 - Math.exp(-dt / (hovering ? 0.5 : 0.28))
          velocitiesRef.current[r] += (target - velocitiesRef.current[r]) * ease
          let next = (offsetsRef.current[r] ?? 0) + velocitiesRef.current[r] * dt
          next = ((next % meta.copyWidth) + meta.copyWidth) % meta.copyWidth
          offsetsRef.current[r] = next
          const el = trackRefs.current[r]
          if (el) el.style.transform = `translate3d(${-next}px, 0, 0)`
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [baseVelocities, rowMeta, pauseOnHover, hoverSpeed, reduced])

  // 左右两端淡出（横向漂移用水平遮罩）
  const mask = fade
    ? 'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)'
    : undefined

  const cssVars = {
    '--dw-tile-w': `${tileWidth}px`,
    '--dw-tile-h': `${tileHeight}px`,
    '--dw-gap': `${gap}px`,
    '--dw-radius': `${radius}px`,
    maskImage: mask,
    WebkitMaskImage: mask,
    ...style
  }

  // 瓷砖 = 产业客户同款卡：白底圆角 + logo 居中 + 下方校名；悬停轻微上浮 + 品牌描边
  const tileClass = 'group/tile relative flex-none w-[var(--dw-tile-w)] h-[var(--dw-tile-h)] mr-[var(--dw-gap)]'
  const innerClass = cx(
    'absolute inset-0 flex flex-col items-center justify-center overflow-hidden',
    'rounded-[var(--dw-radius)] border border-ink-900/[0.07] bg-white p-4 shadow-card',
    'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
    'group-hover/tile:-translate-y-0.5 group-hover/tile:border-brand/30 group-hover/tile:shadow-lift'
  )

  return (
    <div
      ref={containerRef}
      className={cx('relative w-full overflow-hidden', className)}
      style={cssVars}
      onPointerEnter={() => {
        wallHoveredRef.current = true
      }}
      onPointerLeave={() => {
        wallHoveredRef.current = false
      }}
      role="group"
      aria-label="合作院校校徽漂移墙"
    >
      <div className="flex flex-col" style={{ gap: `${gap}px` }}>
        {rowItems.map((row, r) => {
          const meta = rowMeta[r]
          const copies = Array.from({ length: meta.copies })
          return (
            <div
              key={`row-${r}`}
              className="flex w-max flex-row will-change-transform"
              ref={(el) => {
                trackRefs.current[r] = el
              }}
              onMouseEnter={() => {
                hoveredRowRef.current = r
              }}
              onMouseLeave={() => {
                hoveredRowRef.current = -1
              }}
            >
              {copies.map((_, copyIndex) =>
                row.map((item, itemIndex) => (
                  <div key={`${r}-${copyIndex}-${itemIndex}`} className={tileClass}>
                    <div className={innerClass}>
                      <div className="flex h-14 w-full items-center justify-center">
                        <img
                          src={item.image}
                          alt={item.title ?? ''}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className="max-h-12 max-w-[80%] object-contain"
                        />
                      </div>
                      <p className="mt-2.5 w-full text-center text-[12.5px] leading-snug text-ink-500">{item.title}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
