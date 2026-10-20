import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { MapPin, Calendar, Sparkles, Cpu, Blocks, ArrowUpRight } from 'lucide-react'
import { SectionHead, Reveal, CountUp, spotMove, SpotlightGlow, EASE } from '../ui'
import { labCases, labCaseStats } from '../../data/pages'

/* ============================================================
 * 标杆实验室建设案例集 —— 浅色控制台
 * ------------------------------------------------------------
 * 为什么做成「左轨点选 / 右板详情联动」而不是十二张平铺卡片：
 * 九所学校 ×（面积机位 / 区域 / 软硬件）信息密度极高，平铺会糊成
 * 一面墙、也撑不起「高端」。这里把选择权交给访客 —— 轨上只给身份，
 * 看板上一次只讲透一所，切换走 AnimatePresence 的位移淡入，配合
 * 光标柔光 + 未操作时的自动巡览，动而不吵。
 * 底色改为全站统一的浅色体系（白 → mist 渐变 + 品牌蓝柔光 + 极淡网格），
 * 数字全用现成 CountUp，不常驻计时器。压图的抬头/标签仍走深底白字（叠在效果图上，保证可读）。
 * 全部动效在 prefers-reduced-motion 下退化为静态（自动巡览停、位移停）。
 * ============================================================ */

const AUTO_MS = 6500

export default function LabCases() {
  const [active, setActive] = useState(0)
  const [photo, setPhoto] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = useMemo(
    () => (typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    []
  )
  const cur = labCases[active]
  const img = cur.imgs[Math.min(photo, cur.imgs.length - 1)]

  /* 换案例时把图册回到首图 */
  useEffect(() => { setPhoto(0) }, [active])

  /* 自动巡览：滚入视口且未交互 / 未悬停时才走，一旦用户点选或指针进入就停 */
  const wrapRef = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setSeen(true)), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (reduced || paused || !seen) return
    const t = setInterval(() => setActive((i) => (i + 1) % labCases.length), AUTO_MS)
    return () => clearInterval(t)
  }, [reduced, paused, seen])

  const pick = (i) => {
    setActive(i)
    setPaused(true)
  }

  /* 左轨钉屏后，自动巡览推进时把当前高亮项滚入可视区 ——
     只改轨道自身的 scrollTop，绝不牵动整页滚动；仅在 lg 竖向轨且溢出时生效。 */
  const railRef = useRef(null)
  useEffect(() => {
    const rail = railRef.current
    if (!rail || typeof window === 'undefined') return
    if (!window.matchMedia('(min-width: 1024px)').matches) return
    const btn = rail.children[active]
    if (!btn) return
    const rb = rail.getBoundingClientRect()
    const bb = btn.getBoundingClientRect()
    if (bb.top < rb.top) rail.scrollTop -= rb.top - bb.top + 8
    else if (bb.bottom > rb.bottom) rail.scrollTop += bb.bottom - rb.bottom + 8
  }, [active])

  return (
    <section id="labcases" className="relative isolate scroll-mt-[132px] overflow-clip bg-gradient-to-b from-white to-mist-100 py-24 text-ink-900 md:py-28">
      {/* ―― 浅色氛围：品牌蓝柔光 + 极淡网格 + 顶部一条收口 ―― */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/3 h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.10),transparent)] blur-[10px]" />
        <div className="absolute bottom-[-160px] right-[-120px] h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(101,191,255,0.10),transparent)]" />
        <div className="absolute inset-0 opacity-[0.5] [background-image:radial-gradient(rgba(22,119,255,0.10)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(90%_70%_at_50%_0%,#000,transparent)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
      </div>

      <div className="container-x relative z-10">
        <SectionHead
          id="labcases"
          tone="light"
          n="01"
          en="LAB BUILD CASES"
          zh="标杆实验室建设案例集"
          sub="九所高校的真实建设形态：从面积机位到软硬件配置清单，都是我们交付过、可对外展示的实验室。左侧选一所，右侧看板把它讲透。"
          action={{ to: '/#contact', children: '索取同类院校完整案例集' }}
        />

        {/* ―― 聚合数字条 ―― */}
        <Reveal className="mt-12">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 rounded-2xl border border-ink-900/[0.07] bg-white px-6 py-7 shadow-card sm:grid-cols-3 lg:grid-cols-5">
            {labCaseStats.map((s) => (
              <div key={s.k} className="relative pl-4">
                <span className="absolute left-0 top-1 h-[calc(100%-8px)] w-px bg-ink-900/[0.08]" />
                <p className="text-[12.5px] text-ink-400">{s.k}</p>
                <p className="mt-1.5 text-[26px] font-bold leading-none tracking-tight text-ink-900 md:text-[30px]">
                  <CountUp to={s.v} />
                  <span className="ml-0.5 text-[0.55em] font-semibold text-brand">{s.suffix}</span>
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ―― 主控台：左轨 + 右板 ―― */}
        <div
          ref={wrapRef}
          onMouseEnter={() => setPaused(true)}
          className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-6"
        >
          {/* 左：案例轨 */}
          <Reveal>
            <div ref={railRef} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:sticky lg:top-[132px] lg:max-h-[calc(100vh-150px)] lg:flex-col lg:gap-2 lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0 lg:pr-1">
              {labCases.map((c, i) => {
                const on = i === active
                const Icon = c.icon
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pick(i)}
                    aria-pressed={on}
                    onMouseMove={spotMove}
                    className={`group relative flex w-[220px] shrink-0 items-start gap-3 overflow-hidden rounded-xl border px-4 py-3.5 text-left transition-colors duration-300 lg:w-full ${
                      on ? 'border-brand/40 bg-brand/[0.06]' : 'border-ink-900/[0.07] bg-white hover:border-brand/25 hover:bg-mist-50'
                    }`}
                  >
                    {on && (
                      <motion.span
                        layoutId="rail-active"
                        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                        className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-brand-400 to-brand-600"
                      />
                    )}
                    <span className="relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-ink-900/[0.07]">
                      <img src={c.imgs[0]} alt="" loading="lazy" decoding="async" className={`h-full w-full object-cover transition duration-300 ${on ? '' : 'opacity-70 grayscale-[0.35] group-hover:opacity-100 group-hover:grayscale-0'}`} />
                      <span className={`absolute bottom-0 right-0 grid h-[18px] w-[18px] place-items-center rounded-tl-md ${on ? 'bg-brand text-white' : 'bg-black/55 text-white/75'}`}>
                        <Icon className="h-[11px] w-[11px]" strokeWidth={2} />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className={`font-mono text-[10.5px] tabular-nums tracking-[0.18em] ${on ? 'text-brand' : 'text-ink-400'}`}>{c.n}</span>
                        <span className="truncate text-[14px] font-semibold leading-tight text-ink-900">{c.school}</span>
                      </span>
                      <span className={`mt-1 block truncate text-[12px] leading-snug ${on ? 'text-ink-700' : 'text-ink-500'}`}>{c.lab}</span>
                      <span className="mt-1 block text-[11px] text-ink-400">{c.city} · {c.year}</span>
                    </span>
                    <SpotlightGlow tone="light" />
                  </button>
                )
              })}
            </div>
          </Reveal>

          {/* 右：详情看板（一次讲透一所，切换走位移淡入） */}
          <Reveal delay={0.08}>
            <div className="relative min-h-[560px] overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card md:p-8">
              {/* 一层跟随光标的柔光，只提亮不糊字 */}
              <span aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(600px_circle_at_var(--sx,-9999px)_var(--sy,-9999px),rgba(22,119,255,0.06),transparent_60%)]" onMouseMove={spotMove} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={cur.id}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: -18 }}
                  transition={{ duration: 0.42, ease: EASE }}
                  onMouseMove={spotMove}
                  className="relative"
                >
                  {/* 建成效果图 —— 看板主角：大图 + 压图抬头 + 多图缩略切换 */}
                  <div className="relative overflow-hidden rounded-xl border border-ink-900/[0.07] bg-mist-100">
                    <div className="relative aspect-[16/9] w-full">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.img
                          key={img}
                          src={img}
                          alt={`${cur.school} ${cur.lab} 建成效果图`}
                          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 1.05 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={reduced ? { opacity: 0 } : { opacity: 0 }}
                          transition={{ duration: 0.6, ease: EASE }}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </AnimatePresence>
                      {/* 底部渐变，保证压图文字可读 */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#04070d] via-[#04070d]/25 to-transparent" />
                      {/* 左上角类型标签 */}
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10.5px] font-medium tracking-wide text-white/80 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-pulse" />建成效果图 · EFFECT PHOTO
                      </span>
                      {/* 压图抬头 */}
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 md:p-5">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brand-300">CASE {cur.n}</p>
                          <h3 className="mt-1 truncate text-[20px] font-bold leading-tight tracking-tight text-white drop-shadow md:text-[25px]">{cur.school}</h3>
                          <p className="mt-0.5 truncate text-[14px] text-white/80">{cur.lab}</p>
                        </div>
                        <CurIcon icon={cur.icon} />
                      </div>
                    </div>
                  </div>

                  {/* 多图缩略切换 */}
                  {cur.imgs.length > 1 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {cur.imgs.map((src, k) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => { setPhoto(k); setPaused(true) }}
                            aria-label={`查看第 ${k + 1} 张效果图`}
                            aria-pressed={k === photo}
                            className={`relative h-14 w-[92px] shrink-0 overflow-hidden rounded-lg border transition-all duration-300 ${
                              k === photo ? 'border-brand/70 ring-1 ring-brand/40' : 'border-ink-900/[0.07] opacity-55 hover:opacity-95'
                            }`}
                          >
                            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                          </button>
                        ))}
                      </div>
                      <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-ink-400">{Math.min(photo + 1, cur.imgs.length)}/{cur.imgs.length}</span>
                    </div>
                  )}

                  <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-ink-400">{cur.en}</p>

                  {/* 身份标签 */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Chip icon={MapPin}>{cur.city} · {cur.province}</Chip>
                    <Chip icon={Calendar}>{cur.year === '—' ? '在建 / 已交付' : cur.year}</Chip>
                    <Chip icon={Sparkles}>{cur.type}</Chip>
                  </div>

                  {/* 概述 */}
                  <p className="mt-5 max-w-[62ch] text-[13.5px] leading-[1.9] text-ink-700">{cur.summary}</p>

                  {/* 关键指标 */}
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {cur.specs.map((m) => (
                      <div key={m.k} className="rounded-xl border border-ink-900/[0.07] bg-mist-50 px-4 py-3.5">
                        <p className="text-[11.5px] text-ink-400">{m.k}</p>
                        <p className="mt-1.5 text-[19px] font-bold leading-none tracking-tight text-ink-900 md:text-[22px]">{m.v}</p>
                      </div>
                    ))}
                  </div>

                  {/* 分区 / 功能 */}
                  <Block title="功能分区" en="ZONES">
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cur.regions.map((r) => (
                        <span key={r} className="rounded-full border border-ink-900/[0.07] bg-mist-50 px-3 py-1.5 text-[12px] text-ink-600">{r}</span>
                      ))}
                    </div>
                  </Block>

                  {/* 硬件 / 软件 双列 */}
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <Stack title="硬件配置" icon={Cpu} items={cur.hardware} />
                    <Stack title="软件系统" icon={Blocks} items={cur.software} />
                  </div>

                  {/* 特色亮点 */}
                  {cur.highlight && (
                    <div className="mt-6 flex gap-3 rounded-xl border border-brand/25 bg-brand/[0.05] px-4 py-3.5">
                      <span className="mt-0.5 h-4 w-[3px] shrink-0 rounded-full bg-brand" />
                      <p className="text-[13px] leading-relaxed text-ink-700">
                        <span className="font-semibold text-brand">亮点 · </span>{cur.highlight}
                      </p>
                    </div>
                  )}

                  {/* 看板内行动 */}
                  <Link
                    to="/#contact"
                    className="group mt-7 inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-all duration-300 hover:bg-ink-800 hover:shadow-lift"
                  >
                    获取「{cur.school}」完整建设方案
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* 看板右上的大图标：套一层缓慢自转的科技环，纯装饰（叠在效果图上，走品牌色） */
function CurIcon({ icon: Icon }) {
  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center">
      <span aria-hidden className="absolute inset-0 rounded-full border border-white/25" />
      <span aria-hidden className="absolute inset-0 rounded-full border border-dashed border-white/30 motion-safe:animate-[spin_18s_linear_infinite]" />
      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand/90 text-white shadow-[0_6px_18px_-6px_rgba(22,119,255,0.6)]">
        <Icon className="h-6 w-6" strokeWidth={1.7} />
      </span>
    </div>
  )
}

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/[0.07] bg-mist-50 px-3 py-1 text-[12px] text-ink-600">
      <Icon className="h-3.5 w-3.5 text-brand" strokeWidth={1.8} />
      {children}
    </span>
  )
}

function Block({ title, en, children }) {
  return (
    <div className="mt-6 border-t border-ink-900/[0.07] pt-5">
      <div className="flex items-baseline gap-2.5">
        <h4 className="text-[13px] font-semibold tracking-wide text-ink-900">{title}</h4>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">{en}</span>
      </div>
      {children}
    </div>
  )
}

/* 硬件/软件堆栈：一行一项，左侧小方点，hover 点亮成品牌色 */
function Stack({ title, icon: Icon, items }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-ink-900">
        <Icon className="h-4 w-4 text-brand" strokeWidth={1.8} />
        <h4 className="text-[13px] font-semibold tracking-wide">{title}</h4>
        <span className="font-mono text-[10.5px] tabular-nums text-ink-400">{items.length}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-[12.5px] leading-snug text-ink-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-[2px] bg-brand/60" />
            <span className="min-w-0">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
