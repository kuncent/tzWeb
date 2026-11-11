import { useMemo, useRef } from 'react'
import { useInView } from 'motion/react'
import DriftWall from '../reactbits/DriftWall'
import { clientLogos } from '../../data/pages'

/* ============================================================
 * 合作院校「校徽漂移墙」—— 站内封装
 * ------------------------------------------------------------
 * 样式对齐底部「产业客户 · 金融机构」带：不要外层卡片框，只有一条细分隔线 + 小标头，
 * 下面是 reactbits/DriftWall（横向平面漂移，校徽卡与产业客户卡同款）。
 * 用 useInView 首次进入视口才挂载 DriftWall —— 它跑常驻 rAF，未入视口时不挂载更省。
 * ============================================================ */

export default function LogoDriftWall() {
  const wrapRef = useRef(null)
  const inView = useInView(wrapRef, { once: true, margin: '80px' })

  const items = useMemo(
    () =>
      clientLogos
        .filter((l) => l.kind === 'school')
        .map((l) => ({ image: l.img, title: l.name })),
    []
  )

  return (
    <div ref={wrapRef} className="flex flex-col gap-5 border-t border-ink-900/[0.07] pt-9">
      {/* 标头：与产业客户带同款（渐变短线 + 标题 + 右侧数量） */}
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-gradient-to-r from-brand/60 to-transparent" />
        <h3 className="text-[13.5px] font-semibold uppercase tracking-[0.16em] text-ink-700">合作院校 · 校徽墙</h3>
        <span className="ml-auto text-[12px] font-medium text-brand">800 多所高校</span>
      </div>

      {/* 漂移墙：横向多行校徽卡平面漂移（无倾斜、无卡片框）；入视口才挂载，占位保持布局高度 */}
      {inView ? (
        <DriftWall items={items} hoverSpeed={0.16} />
      ) : (
        <div className="h-[440px] w-full sm:h-[484px]" aria-hidden />
      )}
    </div>
  )
}
