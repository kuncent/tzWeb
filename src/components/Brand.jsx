import { useId } from 'react'
import { Link } from 'react-router-dom'
import { brand } from '../data/site'

/* ============================================================
 * 品牌标识单一真源：全站（顶栏 / 页脚 / favicon）共用同一枚标记
 * 与同一套字标锁定，杜绝"每个组件各画一个 Logo"导致的不统一。
 *
 * 标记取自老官网（sztzjy.com）那枚圆徽：浅蓝圆底 + 白色「TZ」连写
 * （天择首字母：顶横与左竖成 T，顶横、斜干与底横成 Z，两字共用顶横）。
 * 老站域名当前已不可访问，这里以公司前台实景墙上的同一枚标识为准复原。
 * ============================================================ */

export function BrandMark({ size = 34, className = '' }) {
  const id = useId().replace(/:/g, '')
  const badge = `tz-badge-${id}`
  const crop = `tz-crop-${id}`
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
        <linearGradient id={badge} x1="7" y1="3" x2="25" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#74ADEC" />
          <stop offset="1" stopColor="#3A78C6" />
        </linearGradient>
        <clipPath id={crop}>
          <rect x="9" y="7.4" width="14" height="17.2" />
        </clipPath>
      </defs>
      {/* 圆底：老标识是一枚浅蓝圆徽，不是方形磁贴 */}
      <circle cx="16" cy="16" r="15" fill={`url(#${badge})`} />
      <circle cx="16" cy="16" r="14.3" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.9" />
      <g clipPath={`url(#${crop})`}>
        {/* T：顶横 + 左竖；Z：顶横 + 斜干 + 底横，两字共用顶横 */}
        <path d="M9 7.4H23V9.6H11.2V22.4H23V24.6H9V7.4Z" fill="#fff" />
        <line x1="23" y1="8.5" x2="9.6" y2="23.5" stroke="#fff" strokeWidth="2.7" />
      </g>
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
