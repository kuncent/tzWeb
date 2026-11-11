import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { matrixHead, productMatrix } from '../../data/site'
import { requestProductContact } from '../../lib/aiEngine'
import { useContent, useContentData } from '../../lib/contentStore'
import ChainScreen from './ChainScreen'
import GalleryScreen from './GalleryScreen'
import EmbodiedScreen, { importShowcase } from './EmbodiedScreen'
import { subscribeMatrix, takePending } from '../../lib/matrixNav'

const N = productMatrix.length
const LAST = N - 1
const EASE = [0.22, 1, 0.36, 1]
/* 每一屏对应 52vh 的滚动行程：钉屏期间页面看似不动，内部整屏翻页 */
const STEP_VH = 52

const pad = (i) => String(i + 1).padStart(2, '0')

/* rich 字段决定用哪个定制屏；普通产品走 MatrixScreen */
function RichScreen({ rich, p, i, withIndex }) {
  if (rich === 'chain') return <ChainScreen p={p} i={i} withIndex={withIndex} />
  if (rich === 'gallery') return <GalleryScreen p={p} i={i} withIndex={withIndex} />
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
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-white shadow-glow">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-ui-sm font-semibold uppercase tracking-eyebrow text-accent-sky">{p.en}</p>
            {withIndex && (
              <p className="text-ui-sm tabular-nums text-ink-400">
                {pad(i)} / {pad(LAST)}
              </p>
            )}
          </div>
        </div>

        <h3 className="mt-6 text-[26px] font-bold tracking-tight text-white md:text-[34px] xl:text-[42px]">{p.title}</h3>
        <p className="mt-3 text-ui-lg font-medium text-accent-ice xl:text-ui-lg">{p.tagline}</p>
        <p className="mt-4 max-w-2xl text-ui leading-[1.9] text-ink-400 xl:text-ui-lg">{p.desc}</p>

        <ul className="mt-7 flex flex-wrap gap-2.5">
          {p.bullets.map((b) => (
            <li
              key={b}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-ui text-white/80 backdrop-blur-sm"
            >
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-stretch gap-3">
          {p.stats.map((s) => (
            <div key={s.k} className="min-w-[146px] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
              <p className="text-ui-sm text-ink-400">{s.k}</p>
              <p className="mt-1 text-[21px] font-bold tracking-tight text-white">{s.v}</p>
            </div>
          ))}
          <a
            href="/about#contact"
            onClick={(e) => {
              e.preventDefault()
              requestProductContact({ name: p.title, intent: p.intent, source: `matrix-${p.id}`, cta: '咨询产品体系' })
            }}
            className="group inline-flex items-center gap-2 self-center rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-ui font-medium text-accent-sky transition-colors hover:bg-accent hover:text-white"
          >
            咨询该产品体系
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ProductMatrix() {
  const outerRef = useRef(null)
  const [idx, setIdx] = useState(0)

  /* 后台可编辑字段的产品叠加：按 id 合并 title/tagline/desc/bullets/stats（只覆盖这些叶子），
     icon / rich / intent 等结构与默认值仍来自 site.js。拉到空（未配置/离线）
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

  /* 点击竖排导航 / 顶栏产品下拉：直接把页面落到对应那一屏。
     这里必须是瞬移而不是平滑滚 —— 钉屏区一共 8 屏，从第 1 屏平滑滚到第 5 屏
     会把中间那几屏逐一推过一遍（每屏都触发一次整屏切换动画），读起来就是闪屏。
     lenis 缓存的最大滚动值同样要先 resize，理由见 useLenis.fly */
  const jump = (i) => {
    const outer = outerRef.current
    if (!outer) return
    const rect = outer.getBoundingClientRect()
    const span = rect.height - window.innerHeight
    const y =
      span <= 0 || window.innerWidth < 1024
        ? window.scrollY + rect.top
        : window.scrollY + rect.top + span * ((i + 0.5) / N)
    if (window.__lenis) {
      window.__lenis.resize()
      window.__lenis.scrollTo(y, { immediate: true })
    } else {
      window.scrollTo(0, y)
    }
  }

  /* 顶栏「产品体系」下拉跳过来：进矩阵并切到指定产品。
     本页只有这一处消费总线；jump 仅读 ref 与常量，首帧实例稳定，故 [] 依赖即可。 */
  useEffect(() => {
    const off = subscribeMatrix((i) => {
      takePending()
      requestAnimationFrame(() => jump(i))
    })
    const p = takePending()
    if (p != null) requestAnimationFrame(() => jump(p))
    return off
  }, [])

  return (
    <section id="matrix" className="relative" style={{ background: '#06080d' }}>
      {/* ―― 桌面端：sticky 钉屏 + 竖立导航 + 整屏轮播 ―― */}
      <div ref={outerRef} className="hidden lg:block" style={{ height: `calc(100vh + ${LAST * STEP_VH}vh)` }}>
        <div className="sticky top-[64px] h-[calc(100vh-64px)] overflow-hidden">
          {/* 背景：网格 + 品牌光晕 */}
          <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:64px_64px]" />
          {/* 品牌光晕：用多段渐变直接画软，不再叠 blur（钉屏期间这层一直在屏内，blur 会每帧重光栅化） */}
          <div className="pointer-events-none absolute -right-40 top-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,transparent,var(--theme-halo)_42%,transparent_82%)]" />
          <div className="pointer-events-none absolute -left-40 bottom-[-15%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,transparent,var(--theme-halo-cyan)_44%,transparent_82%)]" />

          {/* 右列必须是 minmax(0,1fr)：1fr 的自动最小值是内容的 min-content，
              区块链屏那排动画缩略图一旦产品变多（8 套就是 1240px 固有宽），
              整列会被撑出去、左侧竖排导航挤成一条。轨道锁 0 才轮得到横滑。 */}
          <div className="container-x relative grid h-full min-h-0 grid-cols-[minmax(0,300px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-14 xl:gap-20">
            {/* 竖立导航 */}
            <div className="flex h-full min-h-0 flex-col justify-center py-6 xl:py-8">
              <div className="flex items-center gap-3">
                <span className="font-mono text-caption tabular-nums tracking-label text-accent-sky">03</span>
                <span className="h-px w-6 bg-white/25" />
                <span className="text-ui-sm font-semibold uppercase tracking-eyebrow text-accent-sky">{matrixHead.en}</span>
              </div>
              <h2 className="text-h2 mt-3 font-bold text-white">{mHeadZh}</h2>
              <p className="mt-3 text-ui leading-relaxed text-ink-400">{mHeadDesc}</p>

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
                          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent"
                        />
                      )}
                      <span className={`w-5 text-ui-sm font-semibold tabular-nums ${active ? 'text-accent-ice' : 'text-ink-400'}`}>
                        {pad(i)}
                      </span>
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-accent-ice' : 'text-ink-400 group-hover:text-white/70'}`} />
                      <span className={`truncate text-ui ${active ? 'font-semibold text-white' : 'text-ink-400 group-hover:text-white/80'}`}>
                        {p.title}
                      </span>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-7 flex items-center gap-3">
                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{ width: `${((idx + 1) / N) * 100}%` }}
                  />
                </div>
                <span className="text-ui-sm tabular-nums text-ink-400">
                  {pad(idx)} / {pad(LAST)}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-ui-sm text-ink-400">
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
          <span className="font-mono text-caption tabular-nums tracking-label text-accent-sky">03</span>
          <span className="h-px w-6 bg-white/25" />
          <span className="text-ui-sm font-semibold uppercase tracking-eyebrow text-accent-sky">{matrixHead.en}</span>
        </div>
        <h2 className="text-h2 mt-3 font-bold text-white">{mHeadZh}</h2>
        <p className="mt-3 text-ui leading-relaxed text-ink-400">{mHeadDesc}</p>
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
