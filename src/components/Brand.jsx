import { Link } from 'react-router-dom'
import { brand } from '../data/site'

/* ============================================================
 * 品牌标识单一真源：全站（顶栏 / 页脚 / favicon）共用同一枚标记
 * 与同一套字标锁定，杜绝"每个组件各画一个 Logo"导致的不统一。
 *
 * 标记为公司正式徽标（蓝色圆底 + 白色衬线体「Z」+ 环形中英文名），
 * 真图落地于 public/images/brand-logo.png（透明底，深/浅底通用），
 * 与 index.html favicon 同源。
 * ============================================================ */

const LOGO_SRC = '/images/brand-logo.png'

export function BrandMark({ size = 34, className = '' }) {
  return (
    <img
      src={LOGO_SRC}
      width={size}
      height={size}
      alt=""
      aria-hidden
      decoding="async"
      className={`shrink-0 object-contain ${className}`}
    />
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
