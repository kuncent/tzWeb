import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { matrixHead, productMatrix, embodiedProducts, labModules } from '../../data/site'
import { requestProductContact } from '../../lib/aiEngine'
import { useContent, useContentData } from '../../lib/contentStore'
import ChainScreen from './ChainScreen'
import ClassroomScreen from './ClassroomScreen'
import SystemsScreen from './SystemsScreen'

/* 3D 环形展台（自 KUN 具身教育实验室项目复用）：体积较大，按需懒加载。
   把 import 工厂提到具名变量，是为了在矩阵接近视口时先手动 trigger 一次 ——
   chunk 下载与该模块里的 useGLTF.preload（四个机型 GLB）都在那一步跑起来，
   等 EmbodiedScreen 真的 live 挂载时只剩建 WebGL 上下文，不再边下边解析边解码，
   把「滚到产品矩阵卡一下」从一次大的网络+解码抖动摊到进入视口之前。 */
const importShowcase = () => import('../three/ProductShowcase')
const ProductShowcase = lazy(importShowcase)

const N = productMatrix.length
const LAST = N - 1
const EASE = [0.22, 1, 0.36, 1]
/* 每一屏对应 52vh 的滚动行程：钉屏期间页面看似不动，内部整屏翻页 */
const STEP_VH = 52

const pad = (i) => String(i + 1).padStart(2, '0')

/* rich 字段决定用哪个定制屏；普通产品走 MatrixScreen */
function RichScreen({ rich, p, i, withIndex }) {
  if (rich === 'chain') return <ChainScreen p={p} i={i} withIndex={withIndex} />
  if (rich === 'class') return <ClassroomScreen p={p} i={i} withIndex={withIndex} />
  if (rich === 'systems') return <SystemsScreen p={p} i={i} withIndex={withIndex} />
  return <EmbodiedScreen p={p} i={i} withIndex={withIndex} />
}

function MatrixScreen({ p, i, withIndex }) {
  const Icon = p.icon
  return (
    <div className="relative flex h-full flex-col justify-center">
      <span className="pointer-events-none absolute -top-6 right-0 select-none text-[130px] font-bold leading-none text-white/[0.045] xl:text-[170px]">
        {pad(i)}
      </span>
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white shadow-glow">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-brand-400">{p.en}</p>
            {withIndex && (
              <p className="text-[13px] tabular-nums text-ink-400">
                {pad(i)} / {pad(LAST)}
              </p>
            )}
          </div>
        </div>

        <h3 className="mt-6 text-[26px] font-bold tracking-tight text-white md:text-[34px] xl:text-[42px]">{p.title}</h3>
        <p className="mt-3 text-[15px] font-medium text-brand-300 xl:text-[16px]">{p.tagline}</p>
        <p className="mt-4 max-w-2xl text-[14px] leading-[1.9] text-ink-400 xl:text-[15px]">{p.desc}</p>

        <ul className="mt-7 flex flex-wrap gap-2.5">
          {p.bullets.map((b) => (
            <li
              key={b}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13.5px] text-white/80 backdrop-blur-sm"
            >
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-stretch gap-3">
          {p.stats.map((s) => (
            <div key={s.k} className="min-w-[146px] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
              <p className="text-[12.5px] text-ink-400">{s.k}</p>
              <p className="mt-1 text-[21px] font-bold tracking-tight text-white">{s.v}</p>
            </div>
          ))}
          <a
            href="/#contact"
            onClick={(e) => {
              e.preventDefault()
              requestProductContact({ name: p.title, intent: p.intent, source: `matrix-${p.id}`, cta: '咨询产品体系' })
            }}
            className="group inline-flex items-center gap-2 self-center rounded-2xl border border-brand/40 bg-brand/10 px-5 py-4 text-[14px] font-medium text-brand-200 transition-colors hover:bg-brand hover:text-white"
          >
            咨询该产品体系
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

/* 首屏专用：具身智能实验室 —— 3D 环形展台 + 产品体系选型 + 实验室交付模块 */
function EmbodiedScreen({ p, i, withIndex }) {
  const Icon = p.icon
  const [active, setActive] = useState(0)
  const stageRef = useRef(null)
  /* once:false：滚离矩阵即卸掉 ProductShowcase、释放它的 WebGL 上下文
     （R3F 卸载会 forceContextLoss）——否则进过一次就常驻，与首屏/其它画布叠到
     浏览器上限就会把最旧的首屏顶掉（黑屏诱因）。机型 GLB 已由 useGLTF 缓存，
     回来时重建的主要是上下文与 GPU 资源，不是重新下载 */
  const live = useInView(stageRef, { once: false, margin: '160px' })
  const cur = embodiedProducts[active]

  return (
    <div className="relative flex h-full flex-col justify-center">
      <span className="pointer-events-none absolute -top-4 right-0 select-none text-[110px] font-bold leading-none text-white/[0.045] xl:text-[150px]">
        {pad(i)}
      </span>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* 标题区 */}
        <div className="shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-white shadow-glow">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-brand-400">{p.en}</p>
              {withIndex && (
                <p className="text-[12.5px] tabular-nums text-ink-400">
                  {pad(i)} / {pad(LAST)}
                </p>
              )}
            </div>
          </div>
          <h3 className="mt-3 text-[23px] font-bold tracking-tight text-white md:text-[28px] xl:text-[34px] [@media(max-height:820px)]:xl:text-[28px]">{p.title}</h3>
          <p className="mt-1.5 text-[14px] font-medium text-brand-300 xl:text-[15px]">{p.tagline}</p>
          <p className="mt-1.5 max-w-3xl text-[13px] leading-[1.75] text-ink-400 [@media(max-height:820px)]:line-clamp-2">{p.desc}</p>
        </div>

        {/* 产品选择器 */}
        <div className="mt-3.5 flex shrink-0 flex-wrap gap-2">
          {embodiedProducts.map((pr, k) => {
            const on = k === active
            return (
              <button
                key={pr.code}
                onClick={() => setActive(k)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors duration-300 [@media(max-height:820px)]:py-1 ${
                  on ? 'border-brand/50 bg-brand/15 text-white' : 'border-white/[0.08] text-ink-400 hover:border-white/20 hover:text-white/80'
                }`}
              >
                <span className={`font-mono text-[11.5px] tabular-nums ${on ? 'text-brand-300' : 'text-ink-500'}`}>{pad(k)}</span>
                <span className="text-[13.5px] font-medium">{pr.name}</span>
                <span className={`hidden font-mono text-[11px] tracking-[0.1em] sm:inline ${on ? 'text-brand-200' : 'text-ink-500'}`}>
                  {pr.code}
                </span>
              </button>
            )
          })}
        </div>

        {/* 3D 展台 + 当前产品详情
            行轨锁 minmax(0,1fr)：grid 行默认 auto，右边那块详情会按内容长高，
            把下面的交付区顶出屏（详情面板自己已经是定高内滚，不该再长） */}
        <div className="mt-3.5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.15fr_1fr] lg:grid-rows-[minmax(0,1fr)]">
          <div
            ref={stageRef}
            className="relative min-h-[260px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060a11] lg:min-h-0"
          >
            {live ? (
              <Suspense fallback={null}>
                <div className="absolute inset-0">
                  <ProductShowcase active={active} />
                </div>
              </Suspense>
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-mono text-[11.5px] uppercase tracking-[0.2em] text-ink-500">INITIALIZING PRODUCT RING…</span>
              </div>
            )}

            {/* HUD 角标 */}
            {['left-3 top-3 border-l border-t', 'right-3 top-3 border-r border-t', 'left-3 bottom-3 border-b border-l', 'right-3 bottom-3 border-b border-r'].map(
              (pos) => (
                <span key={pos} className={`pointer-events-none absolute h-4 w-4 border-brand/40 ${pos}`} />
              ),
            )}
            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pingslow rounded-full bg-brand-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">PRODUCT RING · {cur.code}</span>
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">⟳ DRAG TO ROTATE</span>
            </div>
            <div className="pointer-events-none absolute bottom-4 right-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">{cur.en} · ON STAGE</span>
            </div>
          </div>

          {/* 详情面板（矮屏时内部滚动，不裁切内容） */}
          <div
            className="flex min-h-0 flex-col overflow-y-auto rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 xl:px-6 xl:py-5"
            data-lenis-prevent
          >
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="my-auto flex flex-col"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-brand-400">{cur.en}</p>
                <span className="font-mono text-[11.5px] text-ink-400">{cur.code}</span>
              </div>
              <h4 className="mt-1.5 text-[19px] font-bold tracking-tight text-white">{cur.name}</h4>
              <p className="mt-0.5 text-[13px] text-brand-300">{cur.tag}</p>
              <p className="mt-2 text-[13px] leading-[1.75] text-ink-400">{cur.desc}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-1">
                {cur.specs.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] pb-1">
                    <dt className="shrink-0 text-[12.5px] text-ink-400">{k}</dt>
                    <dd className="whitespace-nowrap text-right text-[13px] font-medium text-white/90">{v}</dd>
                  </div>
                ))}
              </dl>
              <a
                href="/#contact"
                onClick={(e) => {
                  e.preventDefault()
                  requestProductContact({ name: cur.name, code: cur.code, intent: p.intent, source: `embodied-${cur.code}`, cta: `索取 ${cur.name} 参数手册` })
                }}
                className="group mt-4 inline-flex items-center gap-1.5 text-[13px] text-brand-200 transition-colors hover:text-white"
              >
                索取 {cur.code} 完整参数手册
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
              <p className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[12.5px] text-ink-500">
                <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                按住画面拖动可 360° 自由旋转机型 · 点击上方型号切换机型
              </p>
            </motion.div>
          </div>
        </div>

        {/* 实验室交付：一间实验室的完整交付 */}
        <div className="mt-3.5 shrink-0">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-brand-400">实验室交付 · 一间实验室的完整交付</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {labModules.map((m, mi) => (
              <li key={m.code} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-[13px] font-semibold text-white">
                  <span className="mr-1.5 font-mono text-[11px] tabular-nums text-ink-500">{pad(mi)}</span>
                  {m.name}
                </p>
                <p className="mt-0.5 text-[12px] uppercase tracking-[0.14em] text-brand-300 [@media(max-height:820px)]:hidden">{m.code}</p>
                <p className="mt-1 text-[12.5px] leading-4 text-ink-400 line-clamp-4 [@media(max-height:820px)]:line-clamp-2">{m.desc}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* 底部：能力标签 + 指标 + 咨询 */}
        <div className="mt-4 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/[0.07] pt-4 [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:pt-3">
          <ul className="flex flex-wrap gap-2">
            {p.bullets.map((b) => (
              <li key={b} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-white/75">
                {b}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-5 sm:ml-auto">
            {p.stats.map((s) => (
              <div key={s.k}>
                <p className="text-[12.5px] text-ink-400">{s.k}</p>
                <p className="text-[19px] font-bold tracking-tight text-white">{s.v}</p>
              </div>
            ))}
            <a
              href="/#contact"
              onClick={(e) => {
                e.preventDefault()
                requestProductContact({ name: p.title, intent: p.intent, source: 'embodied-lab', cta: '咨询实验室方案' })
              }}
              className="group inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-[13.5px] font-medium text-brand-200 transition-colors hover:bg-brand hover:text-white"
            >
              咨询实验室方案
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductMatrix() {
  const outerRef = useRef(null)
  const [idx, setIdx] = useState(0)

  /* 后台可编辑字段的产品叠加：按 id 合并 title/tagline/desc（只覆盖这几个叶子），
     icon / rich / stats / bullets 等结构与默认值仍来自 site.js。拉到空（未配置/离线）
     就是原样。 */
  const data = useContentData()
  const P = productMatrix.map((p) => {
    const o = data.products && data.products[p.id]
    return o ? { ...p, ...o } : p
  })
  const mHeadZh = useContent('sections.matrix.title', matrixHead.zh)
  const mHeadDesc = useContent('sections.matrix.desc', matrixHead.desc)

  /* 进入矩阵前一屏就把 3D chunk + 四个机型 GLB 拉起来预热（只做一次，之后断开）。
     rootMargin 120% 比 EmbodiedScreen 自己的 live 门控早一大截触发，把下载与
     解码从「滚到位那一帧的同步代价」挪到用户还在上一屏时。 */
  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    let done = false
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting && !done) {
          done = true
          importShowcase()
          io.disconnect()
        }
      },
      { rootMargin: '120% 0px' }
    )
    io.observe(outer)
    return () => io.disconnect()
  }, [])

  /* 页面滚动 → 折算为内部屏序号（钉屏期间由 sticky 保证画面不动）
     只在矩阵区快进/出视口时挂 scroll 监听：否则整页滚动都会做一次强制布局量测 */
  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    let raf = 0
    let bound = false
    const update = () => {
      raf = 0
      const rect = outer.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      if (span <= 0) return
      const p = Math.min(1, Math.max(0, -rect.top / span))
      const i = Math.min(LAST, Math.floor(p * N))
      setIdx((cur) => (cur === i ? cur : i))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const attach = () => {
      if (bound) return
      bound = true
      update()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
    }
    const detach = () => {
      if (!bound) return
      bound = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
    const io = new IntersectionObserver(([en]) => (en.isIntersecting ? attach() : detach()), {
      rootMargin: '300px 0px',
    })
    io.observe(outer)
    return () => {
      io.disconnect()
      detach()
    }
  }, [])

  /* 点击竖排导航：把页面滚到对应那一屏 */
  const jump = (i) => {
    const outer = outerRef.current
    if (!outer) return
    const rect = outer.getBoundingClientRect()
    const span = rect.height - window.innerHeight
    if (span <= 0 || window.innerWidth < 1024) {
      outer.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    const y = window.scrollY + rect.top + span * ((i + 0.5) / N)
    if (window.__lenis) window.__lenis.scrollTo(y)
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <section id="matrix" className="relative bg-night">
      {/* ―― 桌面端：sticky 钉屏 + 竖立导航 + 整屏轮播 ―― */}
      <div ref={outerRef} className="hidden lg:block" style={{ height: `calc(100vh + ${LAST * STEP_VH}vh)` }}>
        <div className="sticky top-[64px] h-[calc(100vh-64px)] overflow-hidden">
          {/* 背景：网格 + 品牌光晕 */}
          <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:64px_64px]" />
          {/* 品牌光晕：用多段渐变直接画软，不再叠 blur（钉屏期间这层一直在屏内，blur 会每帧重光栅化） */}
          <div className="pointer-events-none absolute -right-40 top-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.03),rgba(22,119,255,0.26)_42%,transparent_82%)]" />
          <div className="pointer-events-none absolute -left-40 bottom-[-15%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,rgba(101,191,255,0.02),rgba(101,191,255,0.15)_44%,transparent_82%)]" />

          {/* 右列必须是 minmax(0,1fr)：1fr 的自动最小值是内容的 min-content，
              区块链屏那排动画缩略图一旦产品变多（8 套就是 1240px 固有宽），
              整列会被撑出去、左侧竖排导航挤成一条。轨道锁 0 才轮得到横滑。 */}
          <div className="container-x relative grid h-full min-h-0 grid-cols-[minmax(0,300px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-14 xl:gap-20">
            {/* 竖立导航 */}
            <div className="flex h-full min-h-0 flex-col justify-center py-6 xl:py-8">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] tabular-nums tracking-[0.18em] text-brand-400">03</span>
                <span className="h-px w-6 bg-white/25" />
                <span className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-brand-400">{matrixHead.en}</span>
              </div>
              <h2 className="text-h2 mt-3 font-bold text-white">{mHeadZh}</h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-400">{mHeadDesc}</p>

              <nav className="mt-7 space-y-0.5" aria-label="产品矩阵">
                {P.map((p, i) => {
                  const active = i === idx
                  const Icon = p.icon
                  return (
                    <button
                      key={p.id}
                      onClick={() => jump(i)}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-300 ${
                        active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="matrix-active"
                          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand"
                        />
                      )}
                      <span className={`w-5 text-[12.5px] font-semibold tabular-nums ${active ? 'text-brand-300' : 'text-ink-400'}`}>
                        {pad(i)}
                      </span>
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand' : 'text-ink-400 group-hover:text-white/70'}`} />
                      <span className={`truncate text-[14px] ${active ? 'font-semibold text-white' : 'text-ink-400 group-hover:text-white/80'}`}>
                        {p.title}
                      </span>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-7 flex items-center gap-3">
                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-500"
                    style={{ width: `${((idx + 1) / N) * 100}%` }}
                  />
                </div>
                <span className="text-[12.5px] tabular-nums text-ink-400">
                  {pad(idx)} / {pad(LAST)}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-400">
                <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
                {idx === LAST ? '继续滚动，离开产品矩阵' : '滚动切换下一产品 · 画面保持不动'}
              </p>
            </div>

            {/* 整屏舞台 */}
            <div className={`relative h-full min-h-0 ${P[idx].rich ? 'py-6 xl:py-8' : 'py-10'}`}>
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 44 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="h-full"
              >
                {P[idx].rich ? (
                  <RichScreen rich={P[idx].rich} p={P[idx]} i={idx} withIndex />
                ) : (
                  <MatrixScreen p={P[idx]} i={idx} withIndex />
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ―― 移动 / 平板：常规纵向堆叠，保证可读与可滚 ―― */}
      <div className="container-x py-20 lg:hidden">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tabular-nums tracking-[0.18em] text-brand-400">03</span>
          <span className="h-px w-6 bg-white/25" />
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-brand-400">{matrixHead.en}</span>
        </div>
        <h2 className="text-h2 mt-3 font-bold text-white">{mHeadZh}</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-400">{mHeadDesc}</p>
        <div className="mt-10 divide-y divide-white/[0.07]">
          {P.map((p, i) => (
            <div key={p.id} className="py-10">
              {p.rich ? <RichScreen rich={p.rich} p={p} i={i} withIndex={false} /> : <MatrixScreen p={p} i={i} withIndex={false} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
