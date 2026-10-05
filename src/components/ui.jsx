import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import { useContent } from '../lib/contentStore'

export const EASE = [0.16, 1, 0.3, 1]

/* ―― 动效缓动语言（P0②）―― 全站只用这三把曲线：
   EASE（即进场收束用的 outQuint）；EASE_UI 微交互/hover；EASE_SPRING 弹性微动。
   以前各屏硬编码了两把不同的 outQuint（[0.16,1,0.3,1] 与 [0.22,1,0.36,1]），
   收敛到同一把才像一个导过的系统 */
export const EASE_ENTER = EASE
export const EASE_UI = [0.4, 0, 0.2, 1]
export const EASE_SPRING = { type: 'spring', stiffness: 260, damping: 26, mass: 0.6 }

/* 遮罩行揭示（P0②）：标题被一条 clip 从下往上揭开 + 轻微上浮，
   比全场统一的淡入更“有次序”，是高端站最常见的入场语汇。
   ―― 关键：可见性检测挂在外层那个未被裁剪的 span 上，不能用内层的 whileInView。
   因为 IntersectionObserver 的可见矩形会被祖先的 overflow:hidden 裁剪，
   而内层初始 y:115% 已被推到 clip 框之外 —— 若让内层自己 whileInView，IO 永远
   判定“未相交”，揭示动画永不触发，标题永久隐藏（实测所有 SectionHead 标题全没）。 */
export function LineMask({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <span ref={ref} className={`block overflow-hidden ${className}`}>
      <motion.span
        className="block will-change-transform"
        initial={{ y: '115%' }}
        animate={inView ? { y: 0 } : { y: '115%' }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  )
}

/* 上浮淡入 */
export function Reveal({ children, delay = 0, y = 22, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* 数字滚动（克制、快速） */
export function CountUp({ to, suffix = '', duration = 1.6, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(to)
      return
    }
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / (duration * 1000))
      const e = 1 - Math.pow(1 - p, 4)
      setVal(Math.round(to * e))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])
  return (
    <span ref={ref} className={className}>
      {val.toLocaleString()}
      {suffix}
    </span>
  )
}

/* 磁性跟随 */
export function Magnetic({ children, strength = 0.3, className = '' }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 180, damping: 14, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 180, damping: 14, mass: 0.4 })
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy, display: 'inline-block' }}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
 * 交互增强三件套：指针柔光 / 3D 微倾斜
 * ------------------------------------------------------------
 * 首屏与产品矩阵靠 3D + 钉屏撑住了「动感」，但中间那几屏卡片以前
 * 只有淡入 + hover 抬一下，读起来明显比两头平。这里补两种参考站那种
 * 高级触感，且都不重渲染、不上 backdrop-filter：
 *   spotMove + SpotlightGlow：光标在卡上走，一层径向柔光跟着走（只写 CSS 变量）
 *   Tilt：卡片随光标做 ≤6° 透视偏转，离开弹回
 * 两者都在 prefers-reduced-motion 下自动退化成静态。
 * ============================================================ */

/* 把光标在元素内的坐标写进 --sx/--sy，供 SpotlightGlow 定位光斑。
   挂在 map 出来的每张卡上，直接读 currentTarget，不需要 per-item 的 ref */
export const spotMove = (e) => {
  const el = e.currentTarget
  if (!el) return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--sx', `${e.clientX - r.left}px`)
  el.style.setProperty('--sy', `${e.clientY - r.top}px`)
}

/* 跟随光标的柔光层：放进一张 `group relative overflow-hidden` 的卡里当一个子节点。
   默认藏在卡片内容之上、pointer-events-none，低透明度只提亮不糊字 */
export function SpotlightGlow({ tone = 'light', className = '' }) {
  const g =
    tone === 'dark'
      ? 'radial-gradient(340px circle at var(--sx,-9999px) var(--sy,-9999px), rgba(120,190,255,0.16), transparent 62%)'
      : 'radial-gradient(340px circle at var(--sx,-9999px) var(--sy,-9999px), rgba(22,119,255,0.10), transparent 62%)'
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${className}`}
      style={{ background: g }}
    />
  )
}

/* 3D 微倾斜：光标位置驱动 rotateX/rotateY，弹簧回弹。max 给小一点（≤6）
   才不会让正文发虚；perspective 走 transformPerspective，不影响周围布局 */
export function Tilt({ children, max = 5, className = '', style }) {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 200, damping: 20, mass: 0.3 })
  const sy = useSpring(my, { stiffness: 200, damping: 20, mass: 0.3 })
  const rotateX = useTransform(sy, [0, 1], [max, -max])
  const rotateY = useTransform(sx, [0, 1], [-max, max])
  const reduced = useMemo(
    () => (typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    []
  )
  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1000, transformStyle: 'preserve-3d', ...style }}
      onPointerMove={(e) => {
        if (reduced) return
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width)
        my.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => {
        mx.set(0.5)
        my.set(0.5)
      }}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
 * 分区骨架：标题模板 / 过渡线 / 统计条 / cover-reveal 卡 / 进度线
 * ------------------------------------------------------------
 * 为什么抽到这里：首页 12 屏的标题区此前是每屏手写一遍同样的
 * `eyebrow + text-3xl md:text-[38px] + 副标`，改一处要追十二处，而且已经
 * 出现了 leading 不一致（Value 有 md:leading-[1.2]、Customers 没写）。
 * 高端感一半来自节奏：同样的留白、同样的字号、同样的编号位置。
 * ============================================================ */

/* 分区右上角的细描边动作（参考站那种「查看全部 →」幽灵按钮） */
export function GhostAction({ to, href, onClick, children, tone = 'light' }) {
  const cls =
    tone === 'dark'
      ? 'group inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[13px] font-medium text-white/80 transition-all duration-300 hover:border-white/50 hover:bg-white/10 hover:text-white'
      : 'group inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-900/12 px-4 py-2 text-[13px] font-medium text-ink-700 transition-all duration-300 hover:border-brand/50 hover:bg-brand-50 hover:text-brand'
  const inner = (
    <>
      {children}
      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
    </>
  )
  if (href) return <a href={href} className={cls}>{inner}</a>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <Link to={to} className={cls}>{inner}</Link>
}

/* 分区标题：编号 + 英文小标 + 中文大标 + 副标 + 右侧动作。
   左侧那条 3px 蓝竖线是全站分区的统一锐利锚点，比每屏自己配一个图标克制。
   传 id（= 该屏锚点 id）时，标题/描述接运行时覆盖层：后台发布了 sections.<id>.* 就用新的，
   没发布则回落这里传入的 zh/sub（site.js 默认），不传 id 的其它页用法完全不变。 */
export function SectionHead({ id, n, en, zh, sub, action, tone = 'light', className = '' }) {
  const dark = tone === 'dark'
  const title = useContent(id ? `sections.${id}.title` : null, zh)
  const desc = useContent(id ? `sections.${id}.desc` : null, sub)
  return (
    <Reveal className={`flex flex-wrap items-start gap-x-6 gap-y-4 ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          {n && (
            <span
              className={`font-mono text-[11px] tabular-nums tracking-[0.18em] ${dark ? 'text-brand-400' : 'text-brand'}`}
            >
              {n}
            </span>
          )}
          <span className={`h-px w-6 ${dark ? 'bg-white/25' : 'bg-ink-900/15'}`} />
          {en && (
            <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${dark ? 'text-white/45' : 'text-ink-400'}`}>
              {en}
            </span>
          )}
        </div>
        <LineMask className="mt-4">
          <h2 className={`text-h2 font-bold ${dark ? 'text-white' : 'text-ink-900'}`}>{title}</h2>
        </LineMask>
        {desc && (
          <p className={`mt-4 max-w-2xl text-body-lg ${dark ? 'text-ink-400' : 'text-ink-500'}`}>{desc}</p>
        )}
      </div>
      {action && <div className="pt-6">{
        typeof action === 'string'
          ? <Magnetic strength={0.25}><GhostAction to={action} tone={tone}>查看全部</GhostAction></Magnetic>
          : <Magnetic strength={0.25}><GhostAction tone={tone} {...action} /></Magnetic>
      }</div>}
    </Reveal>
  )
}

/* 分区之间的一条线：从左渐隐到右，左端挂编号。
   它不是装饰 —— 十二屏往下讲，用户需要知道自己在第几层 */
export function SectionEdge({ label, tone = 'light', className = '' }) {
  const line = tone === 'dark' ? 'from-transparent via-white/12 to-white/12' : 'from-transparent via-ink-900/12 to-ink-900/12'
  return (
    <div aria-hidden className={`container-x ${className}`}>
      <div className="flex items-center gap-4">
        <span className={`h-px w-16 rounded-full bg-gradient-to-r ${line}`} />
        {label && (
          <span className={`font-mono text-[10px] uppercase tracking-[0.28em] ${tone === 'dark' ? 'text-white/30' : 'text-ink-400'}`}>
            {label}
          </span>
        )}
        <span className={`h-px flex-1 rounded-full bg-gradient-to-r ${line}`} />
      </div>
    </div>
  )
}

/* 图注：给示意图/拓扑图/剖面图编号（图 1、图 2）+ 标题 + 可选说明。
   学术排版的低成本信号：图不再是“配个插图”，而是有编号、可引用。 */
export function FigureCaption({ n, title, desc, tone = 'light', className = '' }) {
  const dark = tone === 'dark'
  return (
    <figcaption className={`mt-4 flex items-baseline gap-3 ${className}`}>
      <span className={`shrink-0 font-mono text-[10.5px] uppercase tracking-[0.2em] ${dark ? 'text-brand-400' : 'text-brand'}`}>
        图 {n}
      </span>
      <span className={`text-[12.5px] leading-relaxed ${dark ? 'text-white/70' : 'text-ink-700'}`}>
        <span className="font-semibold">{title}</span>
        {desc && <span className={dark ? ' text-white/45' : ' text-ink-400'}> · {desc}</span>}
      </span>
    </figcaption>
  )
}

/* 顶部滚动进度线：2px。放在导航之下、内容之上，
   用 scaleX 而不是 width —— 后者每帧都会引发重排 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const x = useSpring(scrollYProgress, { stiffness: 900, damping: 60, mass: 0.3 })
  const dot = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  return (
    <>
      <motion.span
        style={{ scaleX: x }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-brand-600 via-brand to-brand-400"
        aria-hidden
      />
      <motion.span
        style={{ left: dot }}
        className="pointer-events-none fixed top-0 z-[60] h-[2px] w-[2px] -translate-x-1/2 bg-brand-300 shadow-glow"
        aria-hidden
      />
    </>
  )
}

/* 数字归一：站点里统计量有两种写法（{value,suffix,label} 与 {k,v}），
   两种都要能直接丢进来。关键是区分“可 CountUp 的纯前导整数”与“非纯数字”：
   含 → / ± / 单位斜杠 / 小数的值原样渲染，修掉旧版
   「±0.05mm 被滚成 0mm」「3-6 周 → 3-10 分钟 折三行断字」 */
const normStat = (s) => {
  if (s.value !== undefined) return { v: s.value, suffix: s.suffix || '', raw: String(s.value ?? ''), k: s.label || '', countable: true }
  const raw = String(s.v ?? '').trim()
  const m = raw.match(/^(\d{1,3}(?:,\d{3})*|\d+)\s*(.*)$/)
  const numeric = m ? Number(m[1].replace(/,/g, '')) : null
  const suffix = m ? m[2] : ''
  const countable = numeric !== null && !/[→±/]/.test(raw) && !/\.\d/.test(raw)
  return { v: countable ? numeric : null, raw, suffix: countable ? suffix : '', k: s.k || '', countable }
}

/* 统计值呈现：数字大号 + 单位小号；「A → B」比较值把 A 做成删除线小注、B 做大号；
   纯文本值统一走同一字号。size='sm' 用于窄栏（如受众卡 3 列），让数字/文本/比较值
   字号一致，不再出现“一个折行小字 + 两个大号数字”参差 */
function StatValue({ stat, dark, size = 'lg' }) {
  const color = dark ? 'text-white' : 'text-ink-900'
  const head = size === 'sm' ? 'text-[clamp(1.15rem,1rem+0.6vw,1.5rem)]' : 'text-stat'
  /* 先走可计数的纯数字（含 {value,suffix} 与 {v} 前导整数两种写法） */
  if (stat.countable) {
    return (
      <p className={`mt-1.5 font-bold tabular-nums leading-[1.08] ${head} ${color}`}>
        <CountUp to={stat.v} />
        {stat.suffix ? <span className="ml-0.5 text-[0.6em] font-semibold tracking-tight">{stat.suffix}</span> : null}
      </p>
    )
  }
  /* 非计数值：raw 可能没给（老数据形状），一律兜底成字符串再匹配，避免读 undefined */
  const raw = String(stat.raw ?? '')
  const cmp = raw.match(/^(.+?)\s*(?:→|->)\s*(.+)$/)
  if (cmp) {
    return (
      <p className="mt-1.5">
        <span className="block text-[12px] font-medium leading-none text-ink-400 line-through decoration-ink-400/50">{cmp[1].trim()}</span>
        <span className={`mt-1 block font-bold tabular-nums leading-[1.12] ${head} ${color}`}>{cmp[2].trim()}</span>
      </p>
    )
  }
  return <p className={`mt-1.5 break-words text-balance font-bold leading-[1.2] text-[clamp(1.15rem,1rem+0.6vw,1.5rem)] ${color}`}>{raw}</p>
}

/* 统计条：进入视口时数字从 0 滚到目标。
   参考站的数字是静态大字 —— 我们有现成 CountUp 却一处没用过，
   白给的信任感不用。滚动只在可见时跑一次（once），不常驻计时器 */
export function StatBand({ items, tone = 'light', cols = 'sm:grid-cols-4', size = 'lg', className = '' }) {
  const dark = tone === 'dark'
  return (
    <Reveal
      className={`grid grid-cols-2 gap-x-6 gap-y-8 ${cols} ${className}`}
    >
      {items.map((it, i) => {
        const s = normStat(it)
        return (
          <div key={it.k || i} className="relative pl-5">
            <span className={`absolute left-0 top-1 h-[calc(100%-8px)] w-px ${dark ? 'bg-white/12' : 'bg-ink-900/10'}`} />
            <p className={`text-[12.5px] ${dark ? 'text-ink-400' : 'text-ink-500'}`}>{s.k}</p>
            <StatValue stat={s} dark={dark} size={size} />
          </div>
        )
      })}
    </Reveal>
  )
}

/* cover-reveal 卡：默认只给图与标题，hover 把整面品牌蓝从下往上刷满，
   在原位露出完整描述。参考站最有记忆点的一处交互；
   比「hover 抬一下加个阴影」信息量大得多：藏起来的是正文，不是特效 */
export function CoverCard({ img, imgAlt = '', index, title, tag, desc, bullets = [], to, href, ratio = '4/3', tone = 'light' }) {
  const dark = tone === 'dark'
  const Body = (
    <div
      className={`group relative isolate overflow-hidden rounded-2xl ${dark ? 'card-elev-dark bg-night-800' : 'card-elev'}`}
      style={{ aspectRatio: ratio }}
    >
      {img ? (
        <img
          src={img}
          alt={imgAlt}
          loading="lazy"
          decoding="async"
          className="img-duo absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_20%_0%,rgba(22,119,255,0.16),transparent_60%)]" />
      )}
      {/* 未 hover：底部一层渐变托住标题，保证白字在任何底图上都读得清 */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#04070d]/92 via-[#04070d]/55 to-transparent px-5 pb-5 pt-14 transition-opacity duration-300 group-hover:opacity-0">
        {tag && <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand-300">{tag}</p>}
        <h3 className="mt-1 text-[17px] font-semibold leading-snug text-white">{title}</h3>
      </div>
      {/* hover：整面品牌蓝刷上来，正文在这一层里 */}
      <div className="absolute inset-0 z-20 translate-y-full bg-brand-600 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-focus-visible:translate-y-0">
        <div className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              {index && <p className="font-mono text-[10.5px] tabular-nums tracking-[0.2em] text-white/55">{index}</p>}
              <h3 className="mt-1 text-[17px] font-semibold leading-snug text-white">{title}</h3>
            </div>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/35 text-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2.5 9.5 9.5 2.5M9.5 2.5H4.6M9.5 2.5v4.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          {desc && <p className="mt-2 text-[12.5px] leading-[1.65] text-white/85">{desc}</p>}
          {bullets.length > 0 && (
            <ul className="mt-auto flex flex-wrap gap-1.5 pt-3">
              {bullets.map((b) => (
                <li key={b} className="rounded-full border border-white/25 px-2.5 py-1 text-[11.5px] text-white/85">
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className="block">{Body}</a>
  if (to) return <Link to={to} className="block">{Body}</Link>
  return Body
}
