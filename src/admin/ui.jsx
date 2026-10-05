/* ============================================================
 * 后台共享 UI 原语：与官网同一套 brand/ink/mist 令牌 + card-elev 质感
 * ------------------------------------------------------------
 * 亮色、克制、够用即可；不自造设计系统，全部走 index.css 里已有的
 * token 与 .card-elev/.btn-dark 语言。所有可交互件保留默认 :focus-visible
 * 环（全局已配），动效件带 motion-reduce 兜底。
 * ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export const cx = (...a) => a.filter(Boolean).join(' ')

const inputBase =
  'w-full rounded-xl border border-ink-900/10 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400/70 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-mist-200 disabled:text-ink-400'

export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-ink-700">
          {label}
          {required && <span className="text-brand">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-[#DC2626]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-400">{hint}</span>
      ) : null}
    </label>
  )
}

export const Input = ({ className, invalid, ...p }) => (
  <input {...p} aria-invalid={invalid || undefined} className={cx(inputBase, invalid && 'border-[#DC2626]/50 focus:border-[#DC2626] focus:ring-[#DC2626]/10', className)} />
)

export const Textarea = ({ className, invalid, rows = 3, ...p }) => (
  <textarea {...p} rows={rows} aria-invalid={invalid || undefined} className={cx(inputBase, 'resize-y leading-relaxed', invalid && 'border-[#DC2626]/50', className)} />
)

export const Select = ({ className, children, ...p }) => (
  <select {...p} className={cx(inputBase, 'appearance-none pr-8', className)}>
    {children}
  </select>
)

const btnVariants = {
  primary: 'bg-brand text-white hover:bg-brand-600 active:scale-[0.98]',
  dark: 'bg-ink-900 text-white hover:bg-ink-800 active:scale-[0.98]',
  ghost: 'border border-ink-900/12 bg-white text-ink-700 hover:border-ink-900/25 hover:text-ink-900',
  danger: 'border border-[#DC2626]/25 bg-white text-[#B91C1C] hover:bg-[#DC2626] hover:text-white',
  subtle: 'bg-mist-200 text-ink-700 hover:bg-mist-300',
}
export function Btn({ variant = 'primary', size = 'md', loading, className, children, ...p }) {
  return (
    <button
      {...p}
      disabled={p.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2.5 text-sm',
        btnVariants[variant],
        className,
      )}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  )
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <span
      role="status"
      aria-label="加载中"
      className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none', className)}
    />
  )
}

export function Card({ className, children, ...p }) {
  return (
    <div {...p} className={cx('card-elev rounded-2xl', className)}>
      {children}
    </div>
  )
}

const badgeTones = {
  neutral: 'bg-mist-200 text-ink-500',
  brand: 'bg-brand-50 text-brand',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-[#DC2626]/10 text-[#B91C1C]',
}
export function Badge({ tone = 'neutral', className, children }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium', badgeTones[tone], className)}>{children}</span>
}

export function Banner({ kind = 'error', children }) {
  if (!children) return null
  const tone = kind === 'error' ? 'border-[#DC2626]/25 bg-[#DC2626]/[0.06] text-[#B91C1C]' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return <div className={cx('rounded-xl border px-4 py-3 text-[13px] leading-relaxed', tone)} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}

/* 抽屉/弹窗：轻量遮罩 + Esc 关闭 + 焦点移入。不自带滚动锁定，页面本身不复杂。 */
export function Modal({ open, onClose, title, children, wide }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('relative z-10 flex h-full w-full flex-col bg-mist-100 shadow-elev-lg outline-none', wide ? 'max-w-2xl' : 'max-w-lg')}
      >
        <div className="flex items-center justify-between border-b border-ink-900/8 bg-white px-5 py-4">
          <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-mist-200 hover:text-ink-900" aria-label="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

/* ---------- 轻量 toast ---------- */
const ToastCtx = createContext(null)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((msg, kind = 'info') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, msg, kind }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {items.map((i) => (
          <div
            key={i.id}
            className={cx(
              'pointer-events-auto rounded-full px-4 py-2 text-[13px] font-medium shadow-elev-lg',
              i.kind === 'error' ? 'bg-[#B91C1C] text-white' : i.kind === 'success' ? 'bg-emerald-600 text-white' : 'bg-ink-900 text-white',
            )}
          >
            {i.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => {
  const ctx = useContext(ToastCtx)
  return ctx ? ctx.push : () => {}
}
