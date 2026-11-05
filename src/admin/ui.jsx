/* ============================================================
 * 后台共享 UI 原语：与官网同一套 brand/ink/mist 令牌 + card-elev 质感
 * ------------------------------------------------------------
 * 亮色、克制、够用即可；不自造设计系统，全部走 index.css 里已有的
 * token 与 .card-elev/.btn-dark 语言。所有可交互件保留默认 :focus-visible
 * 环（全局已配），动效件带 motion-reduce 兜底。
 * ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const cx = (...a) => a.filter(Boolean).join(' ')

/* 时间戳归一：同时兼容 numeric epoch ms（访问/线索日志）与 ISO 字符串（审计行），
   返回 UTC+8 偏移后的 ms；无法解析时回落到 Date.now()。防 new Date("...Z"+ms) 抛 Invalid time value。 */
export const TZ8_MS = 8 * 3600 * 1000
export function toBaseMs(ts) {
  if (ts == null) return NaN
  const base = typeof ts === 'number' ? ts : new Date(ts).getTime()
  return Number.isFinite(base) ? base + TZ8_MS : NaN
}

const inputBase =
  'w-full rounded-xl border border-ink-900/10 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400/70 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-mist-200 disabled:text-ink-400'

export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-ui-sm font-medium text-ink-700">
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
        size === 'sm' ? 'px-3 py-1.5 text-ui-sm' : 'px-4 py-2.5 text-sm',
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

export function Card({ className, children, hover, ...p }) {
  return (
    <div
      {...p}
      className={cx(
        'card-elev rounded-2xl',
        hover && 'transition-all duration-200 hover:-translate-y-px hover:shadow-elev-lg',
        className,
      )}
    >
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
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium', badgeTones[tone], className)}>{children}</span>
}

export function Banner({ kind = 'error', children }) {
  if (!children) return null
  const tone = kind === 'error' ? 'border-[#DC2626]/25 bg-[#DC2626]/[0.06] text-[#B91C1C]' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return <div className={cx('rounded-xl border px-4 py-3 text-ui-sm leading-relaxed', tone)} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
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
  // 走 portal 挂到 document.body：抽屉/弹窗是 fixed 全屏遮罩，必须脱离页面内容树。
  // 否则一旦祖先（如 PageFade 的 tz-fade-in 动画 fill-mode:both 触发 transform）成为
  // fixed 的包含块，遮罩就只盖住内容盒（实测被夹到 max-w-[1100px] 那块），抽屉错位、
  // 列表被半遮——"进入详情有东西盖住列表"即此。portal 到 body 后 fixed 重新以视口为基准。
  return createPortal(
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
          <h3 className="text-ui-lg font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-mist-200 hover:text-ink-900" aria-label="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/* ---------- Skeleton 骨架屏：取代满屏 Spinner，给加载中的卡/表行一个占位 */
export function Skeleton({ lines = 3, className }) {
  return (
    <div className={cx('space-y-2', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 animate-pulse rounded-md bg-mist-200 motion-reduce:animate-none" style={{ width: `${Math.max(35, 100 - i * 12)}%` }} />
      ))}
    </div>
  )
}

/* ---------- EmptyState：插画图标 + 主标题 + 可选提示 + 可选 CTA */
export function EmptyState({ icon: Icon, title, hint, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      {Icon && (
        <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-mist-200 text-ink-400">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-ui font-semibold text-ink-900">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-ui-sm leading-relaxed text-ink-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- PageFade：包裹一页的顶层容器，进入时淡入 + 8px 上推；
   prefers-reduced-motion 下自动关闭动画，直接可见。 */
export function PageFade({ children, className }) {
  return (
    <div
      className={cx(
        'animate-[tz-fade-in_0.24s_ease-out_both] motion-reduce:animate-none',
        className,
      )}
    >
      <style>{`@keyframes tz-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
      {children}
    </div>
  )
}

/* ---------- AuditList：SEO / GEO 面板共用的体检清单 ----------
 * items：[{ key, label, pass, detail, advice }]；
 *   · pass=true 一行一个对号，绿色
 *   · pass=false 开一个可展开的 advice 区，默认折叠
 * 无 advice 则不渲染展开开关，保持行高一致。 */
export function AuditList({ items }) {
  const [open, setOpen] = useState(() => new Set())
  const toggle = (k) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  if (!items?.length) {
    return <p className="px-4 py-6 text-center text-ui-sm text-ink-400">没有可展示的条目。</p>
  }
  return (
    <ul className="divide-y divide-ink-900/6">
      {items.map((it) => {
        const isOpen = open.has(it.key)
        const hasAdvice = !!it.advice
        return (
          <li key={it.key} className="px-5 py-3.5">
            <div className="flex items-start gap-3">
              <span
                className={cx(
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-caption font-bold',
                  it.pass ? 'bg-emerald-50 text-emerald-600' : 'bg-[#DC2626]/10 text-[#B91C1C]',
                )}
                aria-hidden
              >
                {it.pass ? '✓' : '!'}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cx('text-ui font-medium leading-snug', it.pass ? 'text-ink-900' : 'text-[#B91C1C]')}>{it.label}</p>
                {it.detail && <p className="mt-0.5 text-ui-sm leading-relaxed text-ink-500">{it.detail}</p>}
                {hasAdvice && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggle(it.key)}
                      className="mt-1.5 inline-flex items-center gap-1 text-ui-sm font-medium text-brand hover:underline"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? '收起建议' : '查看建议'}
                    </button>
                    {isOpen && (
                      <div className="mt-2 rounded-lg border border-brand/20 bg-brand-50/60 px-3 py-2 text-ui-sm leading-relaxed text-ink-700">
                        {it.advice}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ---------- 轻量 toast ---------- */
const ToastCtx = createContext(null)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((msg, kind = 'info') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, msg, kind }])
    const ttl = kind === 'error' ? 8000 : 3200
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), ttl)
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
              'pointer-events-auto rounded-full px-4 py-2 text-ui-sm font-medium shadow-elev-lg',
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
