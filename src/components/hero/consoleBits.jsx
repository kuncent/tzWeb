import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

/* ============================================================
 * 首屏看板共用件
 * ------------------------------------------------------------
 * 三块看板（遥测 / 链指标 / 模型）版式完全不同，但必须是同一家族：
 * 切角外框、HUD 角标、等宽读数、细网格底。所以把这些收在这里，
 * 业务差异只体现在结构与数据上。
 *
 * 读数一律「确定性伪实时」：由序号 i 与 seed 决定的正弦叠加，
 * 不用 Math.random —— 随机的抖看着像噪声，规律里带意外才像仪表。
 * ============================================================ */

const EASE = [0.22, 1, 0.36, 1]
export const fmt = (v, d = 0) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

/** 时钟：每 period 毫秒把序号 +1，所有读数与曲线都由它推导 */
export function useTick(period = 900, active = true) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setI((v) => v + 1), period)
    return () => clearInterval(id)
  }, [period, active])
  return i
}

/** 正弦叠加出来的「像仪表」的抖：base 上下 ±amp，seed 决定相位形状 */
export function wobble(i, base, amp, seed = 1) {
  const n = Math.sin(i * 0.61 + seed * 1.7) * 0.55 + Math.sin(i * 0.23 + seed * 4.1) * 0.3 + Math.sin(i * 1.37 + seed) * 0.15
  return base + n * amp
}

/**
 * 一条会走的序列。spike 变化（点按钮）时往头部注入一次冲击，
 * 于是曲线不是「一直在抖」，而是「你动了它才有反应」——这才是交互看板。
 */
export function useSeries({ base, amp, seed = 1, n = 28, period = 820, active = true, spike = 0, gain = 2.6 }) {
  const [arr, setArr] = useState(() => Array.from({ length: n }, (_, k) => wobble(k, base, amp, seed)))
  const lastSpike = useRef(spike)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setArr((prev) => {
        const k = prev.length
        return [...prev.slice(1), wobble(k + Math.sin(k * 7.3) * 0.4, base, amp, seed)]
      })
    }, period)
    return () => clearInterval(id)
  }, [base, amp, seed, period, active])
  useEffect(() => {
    if (spike === lastSpike.current) return
    lastSpike.current = spike
    if (!spike) return
    setArr((prev) => [...prev.slice(1), base + amp * gain])
  }, [spike, base, amp, gain])
  return arr
}

/* 切角外框：右上角裁掉一块（参考站那枚 NEXT 按钮的语言），
   纯 CSS clip-path，不用 svg 描边 —— 省节点也省重绘 */
const clipCorner = (px = 18) => ({ clipPath: `polygon(0 0, calc(100% - ${px}px) 0, 100% ${px}px, 100% 100%, 0 100%)` })

export function Panel({ title, code, accent, right, children, className = '' }) {
  return (
    <div
      /* 这里原来挂的是 backdrop-blur-md：看板叠在一块逐帧变的 canvas 上，
         浏览器就得每帧重算一次高斯模糊 —— 实测这是 6fps 的头号成因之一。
         改成不透明度高一档的实底，观感几乎不掉，开销直接归零 */
      className={`relative border border-white/[0.09] bg-[#060b12]/92 ${className}`}
      style={{ ...clipCorner(20), boxShadow: `0 24px 60px -30px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.04)` }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.028)_1px,transparent_1px)] [background-size:26px_26px]" />
      {/* HUD 角标 */}
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t" style={{ borderColor: `${accent}88` }} />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l" style={{ borderColor: `${accent}88` }} />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r" style={{ borderColor: `${accent}88` }} />

      <div className="relative flex items-center gap-2 border-b border-white/[0.07] px-4 py-2.5">
        <Led accent={accent} />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/85">{title}</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{code}</span>
        <span className="ml-auto shrink-0">{right}</span>
      </div>
      <div className="relative px-4 py-3.5">{children}</div>
    </div>
  )
}

export function Led({ accent = '#5FA8FF', on = true }) {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      {on && <span className="absolute inline-flex h-full w-full animate-pingslow rounded-full" style={{ background: accent }} />}
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
    </span>
  )
}

/** 看板主按钮：切角 + 图标 + 英文小标；点亮时描边与底都吃 accent。
    data-cmd 是给验收脚本（tmp/hero-interact.mjs）用的稳定钩子 ——
    按钮的身份是业务指令 id，不该靠中文文案去匹配。 */
export function CmdButton({ cmd, on, accent, onClick }) {
  const Icon = cmd.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      data-cmd={cmd.id}
      style={on ? { borderColor: `${accent}99`, background: `${accent}22`, color: '#fff', ...clipCorner(12) } : clipCorner(12)}
      className={`group relative flex w-full items-center gap-2.5 border px-3 py-2.5 text-left transition-colors duration-300 ${
        on ? '' : 'border-white/[0.08] bg-white/[0.02] text-white/65 hover:border-white/25 hover:text-white'
      }`}
    >
      <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.9} style={on ? { color: accent } : undefined} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium leading-tight">{cmd.label}</span>
        <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: on ? accent : 'rgba(255,255,255,0.32)' }}>
          {cmd.en}
        </span>
      </span>
      {/* 点亮时右侧一道走马竖条，代替传统的对勾：像是「正在执行」而非「已选中」 */}
      {on && (
        <motion.span
          layout
          initial={{ opacity: 0, scaleY: 0.2 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="h-6 w-[3px] shrink-0 rounded-full"
          style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
        />
      )}
    </button>
  )
}

/** 大读数：数字用等宽 + tabular-nums，跳数时不抖行。
    v 也可能是规格串（「±0.05 mm」「ROS 2 / SDK」）—— 那种走小一号的字，
    绝不能过 fmt：Number('±0.05 mm') 是 NaN，产物里会直接印出 NaN。 */
export function Metric({ k, v, unit, accent, digits = 0, sub }) {
  const num = typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)))
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] uppercase tracking-[0.16em] text-white/38">{k}</p>
      <p
        className={`mt-1 truncate font-mono font-semibold leading-none tabular-nums tracking-tight text-white ${
          num ? 'text-[20px]' : 'text-[13px] font-medium'
        }`}
      >
        {num ? fmt(v, digits) : v}
        {unit && <span className="ml-0.5 text-[11px] font-normal" style={{ color: accent }}>{unit}</span>}
      </p>
      {sub && <p className="mt-1 truncate text-[10px] text-white/35">{sub}</p>}
    </div>
  )
}

/** 折线图：走线的同时把描边末端点亮，看着像真的在采样 */
export function Sparkline({ data, accent, h = 42, fill = true }) {
  const w = 100
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = Math.max(0.0001, max - min)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * (h - 6) - 3])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full" style={{ minHeight: h }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={`sp-${accent.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={`url(#sp-${accent.replace('#', '')})`} stroke="none" />
        </>
      )}
      <path d={d} fill="none" stroke={accent} strokeWidth="1.1" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="1.6" fill={accent} />
    </svg>
  )
}

/** 竖条阵：区块链的出块时延、AI 的 token 流都用它，比折线更像「离散事件」 */
export function Bars({ data, accent, max: fixedMax, h = 38 }) {
  const max = fixedMax || Math.max(...data, 1)
  return (
    <div className="flex items-end gap-[3px]" style={{ height: h }}>
      {data.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-[1px] transition-[height] duration-500"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: i === data.length - 1 ? accent : `${accent}55`,
            boxShadow: i === data.length - 1 ? `0 0 10px ${accent}` : 'none',
          }}
        />
      ))}
    </div>
  )
}

/** 环形进度：AI 屏的掌握度、具身屏的匹配度都靠它 */
export function Ring({ pct, accent, label, size = 52 }) {
  const r = 18
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <motion.circle
          cx="22" cy="22" r={r} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-bold tabular-nums" style={{ color: accent }}>
        {label ?? `${Math.round(pct)}%`}
      </span>
    </div>
  )
}

/** 状态行：名字 + 值 + 灯，三块看板的列表都用它 */
export function Row({ name, value, accent, live = false, dim = false }) {
  return (
    <div className={`flex items-center gap-2 border-b border-white/[0.05] py-[5px] last:border-0 ${dim ? 'opacity-45' : ''}`}>
      {live ? <Led accent={accent} /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/15" />}
      <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] tracking-[0.02em] text-white/70">{name}</span>
      <span className="shrink-0 font-mono text-[10.5px] tabular-nums" style={{ color: accent }}>{value}</span>
    </div>
  )
}

/* 面板整体的进出：切屏时看板换个业务，得有个「重装」的样子。
   不要写 filter: blur() —— 大面积元素上的模糊动画是合成器最贵的一类 */
export function Swap({ k, children }) {
  return (
    <motion.div key={k} initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.55, ease: EASE }}>
      {children}
    </motion.div>
  )
}
