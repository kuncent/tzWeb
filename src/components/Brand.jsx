import { Link } from 'react-router-dom'
import { brand } from '../data/site'

/* ============================================================
 * 品牌标识单一真源：全站（顶栏 / 页脚 / favicon）共用同一枚标记
 * 与同一套字标锁定，杜绝"每个组件各画一个 Logo"导致的不统一。
 *
 * 标记只保留蓝色圆盘 + 白色「Z」本身（public/images/brand-mark.svg，
 * 按旧 brand-logo.png 逐像素量出色形后重画的矢量；旧图外圈的细环与
 * 环形中英文名已剔除）。透明底，深/浅底通用，与 index.html favicon 同源。
 * ============================================================ */

const LOGO_SRC = '/images/brand-mark.svg'

/* 30 而不是 34：旧资产在 34 的盒子里还带着一圈环形小字，圆盘实占 26.6；
   去掉外圈后同样的盒子会让圆盘直接顶满，反而压过右侧字标。30 让圆盘
   比旧观感略大（+13%）、整体高度又与两行字标齐平。 */
export function BrandMark({ size = 30, className = '' }) {
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
