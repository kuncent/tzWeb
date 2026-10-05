import { useId } from 'react'
import { Link } from 'react-router-dom'
import { brand } from '../data/site'

/* ============================================================
 * 品牌标识单一真源：全站（顶栏 / 页脚 / favicon）共用同一枚标记
 * 与同一套字标锁定，杜绝"每个组件各画一个 Logo"导致的不统一。
 *
 * 概念「天择 · 甄选之升」：
 *   圆角方形渐变基座 = 人才培养基础设施
 *   上扬山峰 + 峰顶点亮的节点 = 攀登而上、被时代「天择」脱颖而出
 *   底部地平线 = 托举成长的平台底座
 * ============================================================ */

export function BrandMark({ size = 34, className = '' }) {
  const id = useId().replace(/:/g, '')
  const tile = `tz-tile-${id}`
  const gloss = `tz-gloss-${id}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id={tile} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#65BFFF" />
          <stop offset="1" stopColor="#1677FF" />
        </linearGradient>
        <linearGradient id={gloss} x1="16" y1="1" x2="16" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 基座 */}
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${tile})`} />
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${gloss})`} />
      {/* 甄选之升：一道上扬山峰 + 峰顶被点亮的节点，底部一道地平线作底座。
          整体居中，替掉原先歪向右上、头重脚轻的三点折线 */}
      <path
        d="M9.4 18.6L16 10.4L22.6 18.6"
        stroke="#fff"
        strokeOpacity="0.96"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 峰顶被点亮的节点 = 被「天择」的脱颖而出者 */}
      <circle cx="16" cy="8" r="2" fill="#fff" />
      {/* 底部地平线 = 托举成长的平台底座 */}
      <path
        d="M11 23.6L21 23.6"
        stroke="#fff"
        strokeOpacity="0.4"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* 顶栏 / 页脚通用锁定：图形 + 中文主标 + 英文副行。
   tone='dark' 用于暗底（首屏、页脚），'light' 用于白底（滚动后顶栏）。 */
export function BrandLockup({ tone = 'light', className = '' }) {
  const dark = tone === 'dark'
  return (
    <Link to="/" className={'group flex items-center gap-2.5 ' + className}>
      <BrandMark className="shrink-0 drop-shadow-[0_2px_10px_rgba(22,119,255,0.38)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]" />
      <div className="leading-none">
        <div className={'text-[16.5px] font-bold tracking-tight ' + (dark ? 'text-white' : 'text-ink-900')}>
          {brand.short}
        </div>
        <div className={'mt-1 text-[9px] font-semibold tracking-[0.3em] ' + (dark ? 'text-brand-300' : 'text-brand')}>
          {brand.en}
        </div>
      </div>
    </Link>
  )
}
