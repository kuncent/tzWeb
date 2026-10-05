import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useInView } from 'motion/react'
import { Reveal, SectionHead, EASE } from '../ui'
import { deliveryPath } from '../../data/business'

/* ============================================================
 * 交付路径（首页新增屏）
 * ------------------------------------------------------------
 * 高校采购真正卡住的一步不是「你们有什么」，而是「签了之后怎么落地、
 * 谁干什么、多久能开课」。这一段以前完全没有，所以前面讲得再像
 * 未来教育也像在卖概念。
 *
 * 六步一条线：桌面横向（基线从左画到右，读起来就是时间往前走），
 * 窄屏转竖向。每步都带周期、交付物、双方分工 —— 少一项都不叫路径。
 * ============================================================ */
export default function Delivery() {
  const rootRef = useRef(null)
  const inView = useInView(rootRef, { margin: '15% 0px' })
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const LAST = deliveryPath.length - 1
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)

  // 播放头自动推进：仅在视口内、开启播放、且非 reduced 时运行（滚走即停表，省重渲染）
  useEffect(() => {
    if (reduced || !playing || !inView) return
    const id = setInterval(() => setStep((s) => (s >= LAST ? 0 : s + 1)), 3200)
    return () => clearInterval(id)
  }, [reduced, playing, inView, LAST])

  const go = (i) => {
    setPlaying(false)
    setStep(Math.max(0, Math.min(LAST, i)))
  }

  const cur = deliveryPath[step]
  const CurIcon = cur.icon
  const frac = LAST === 0 ? 0 : step / LAST

  return (
    <section id="delivery" ref={rootRef} className="relative bg-mist-100 sec-y">
      <div className="container-x">
        <SectionHead
          id="delivery" n="07"
          en="DELIVERY PATH"
          zh="从第一次见面，到学生拿出作品"
          sub="六步交付路径。周期按一个院系的首批建设估算，多院系并行时第 02 步之后可以拆开走。"
          action={{ to: '/solutions', children: '看落地场景' }}
        />

        {/* 整体节奏提示：把「多久能开课」这个最常被问的问题先答掉 */}
        <Reveal delay={0.06} className="mt-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl card-elev px-6 py-4">
            <div>
              <p className="text-[12.5px] text-ink-500">诊断到首批开课</p>
              <p className="mt-0.5 text-[19px] font-bold tracking-tight text-ink-900">约 9–13 周</p>
            </div>
            <span className="hidden h-9 w-px bg-ink-900/10 sm:block" />
            <div>
              <p className="text-[12.5px] text-ink-500">师资认证</p>
              <p className="mt-0.5 text-[19px] font-bold tracking-tight text-ink-900">2 周集中 + 学期陪跑</p>
            </div>
            <span className="hidden h-9 w-px bg-ink-900/10 sm:block" />
            <div>
              <p className="text-[12.5px] text-ink-500">验收出口</p>
              <p className="mt-0.5 text-[19px] font-bold tracking-tight text-ink-900">竞赛 · 1+X · 作品集</p>
            </div>
            <Link
              to="/#contact"
              className="group ml-auto inline-flex items-center gap-2 text-[13.5px] font-medium text-brand transition-colors hover:text-ink-900"
            >
              要一份排期表
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </Reveal>

        {/* ―― 桌面：交付流水线步进器（对齐 RNN 步进图语言 · 浅色版）――
            播放头沿 6 个节点推进：当前节点强发光 + 呼吸，走过的连线点亮，
            前方连线保持淡色；下方只展开当前步的交付详情，读作“路径正在往前走”。 */}
        <div className="relative mt-14 hidden lg:block">
          {/* 轨道：淡底基线 + 已走过的品牌色进度线 + 行进发光头点 */}
          <div className="pointer-events-none absolute inset-x-0 top-[29px]">
            <div className="absolute left-[8.333%] right-[8.333%] top-0 h-px bg-ink-900/10" />
            <div
              className="absolute left-[8.333%] top-0 h-[2px] rounded-full bg-gradient-to-r from-brand-400 to-brand transition-[width] duration-700 ease-out"
              style={{ width: `calc(83.334% * ${frac})` }}
            />
            <span
              className="absolute top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-glow transition-[left] duration-700 ease-out"
              style={{ left: `calc(8.333% + 83.334% * ${frac})` }}
            />
          </div>

          {/* 节点轨：可点击跳转；状态 = 当前 / 已走过 / 未来 */}
          <div className="relative grid grid-cols-6 gap-4">
            {deliveryPath.map((s, i) => {
              const Icon = s.icon
              const now = i === step
              const done = i < step
              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => go(i)}
                  aria-current={now ? 'step' : undefined}
                  className="group flex flex-col items-center text-center"
                >
                  <span
                    className={`relative z-10 grid h-[58px] w-[58px] place-items-center rounded-full border bg-white transition-all duration-500 ${
                      now
                        ? 'animate-breathe scale-105 border-brand text-brand shadow-glow'
                        : done
                          ? 'border-brand/45 text-brand'
                          : 'border-ink-900/10 text-ink-400 group-hover:border-ink-900/25'
                    }`}
                  >
                    <Icon className="h-[22px] w-[22px]" />
                  </span>
                  <span className="mt-4 font-mono text-[10.5px] tabular-nums tracking-[0.2em] text-ink-400">{s.n}</span>
                  <span className={`mt-1 text-[14.5px] font-semibold tracking-tight transition-colors duration-500 ${now ? 'text-brand' : 'text-ink-900'}`}>
                    {s.title}
                  </span>
                  <span className="mt-1 text-[11.5px] text-ink-400">{s.period}</span>
                </button>
              )
            })}
          </div>

          {/* 当前步详情：只展开播放头所在的一步，切换做交叉淡入（reduced 时瞬时）；min-h 锁高杜绝屏高抖动 */}
          <div className="relative mt-10 min-h-[196px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="grid gap-6 rounded-2xl card-elev px-7 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand">
                      <CurIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-mono text-[11px] tabular-nums tracking-[0.2em] text-ink-400">STEP {cur.n}</p>
                      <h3 className="text-[20px] font-bold tracking-tight text-ink-900">{cur.title}</h3>
                    </div>
                    <span className="ml-auto rounded-full bg-brand px-3 py-1 text-[12px] font-medium text-white">{cur.period}</span>
                  </div>
                  <p className="mt-4 text-[14px] leading-[1.8] text-ink-600">{cur.desc}</p>
                  <p className="mt-4 text-[12.5px] text-ink-400">分工 · {cur.who}</p>
                </div>
                <div>
                  <p className="text-[12px] font-medium tracking-[0.14em] text-ink-400">交付物</p>
                  <ul className="mt-3 space-y-2.5">
                    {cur.outputs.map((o) => (
                      <li key={o} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-800">
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="mt-[3px] shrink-0 text-brand">
                          <path d="M2 6.5 4.8 9 10 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 步进控件：◀ 上一步 · ▶播放/暂停 · 下一步 ▶ + Step n/6 + 进度 */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(step - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 bg-white px-4 py-2 text-[13px] font-medium text-ink-700 shadow-card transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-900/10 disabled:hover:text-ink-700"
            >
              ◀ 上一步
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-5 py-2 text-[13px] font-semibold text-white shadow-card transition-transform hover:-translate-y-0.5"
            >
              {playing ? '❚❚ 暂停' : '▶ 播放'}
            </button>
            <button
              type="button"
              onClick={() => go(step + 1)}
              disabled={step === LAST}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 bg-white px-4 py-2 text-[13px] font-medium text-ink-700 shadow-card transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-900/10 disabled:hover:text-ink-700"
            >
              下一步 ▶
            </button>
            <div className="ml-auto flex items-center gap-3">
              <span className="font-mono text-[12px] tabular-nums text-ink-500">Step {step + 1} / {deliveryPath.length}</span>
              <span className="relative h-1 w-28 overflow-hidden rounded-full bg-ink-900/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-700 ease-out"
                  style={{ width: `${((step + 1) / deliveryPath.length) * 100}%` }}
                />
              </span>
            </div>
          </div>
        </div>

        {/* ―― 窄屏：竖向时间轴 ―― */}
        <div className="mt-12 lg:hidden">
          {deliveryPath.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.n} delay={i * 0.05}>
                <div className="relative flex gap-4 pb-8">
                  {i < deliveryPath.length - 1 && (
                    <>
                      {/* 竖向时间轴同步流动：打底线（不 mask）+ 蓝色流动虚线（arch-flow）分层 */}
                      <span className="absolute left-[22px] top-[46px] h-[calc(100%-46px)] w-px bg-ink-900/10" />
                      <svg
                        aria-hidden
                        viewBox="0 0 2 100"
                        preserveAspectRatio="none"
                        className="absolute left-[21px] top-[46px] h-[calc(100%-46px)] w-0.5"
                      >
                        <line
                          x1="1"
                          y1="0"
                          x2="1"
                          y2="100"
                          stroke="#1677FF"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                          strokeLinecap="round"
                          strokeDasharray="26 74"
                          className="arch-flow"
                          style={{ '--flow': '100' }}
                        />
                      </svg>
                    </>
                  )}
                  <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink-900/10 bg-white text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-mono text-[10.5px] tabular-nums tracking-[0.2em] text-ink-400">{s.n}</span>
                      <h3 className="text-[16px] font-semibold text-ink-900">{s.title}</h3>
                      <span className="rounded-full bg-mist-200 px-2 py-0.5 text-[11.5px] text-ink-500">{s.period}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-[1.7] text-ink-500">{s.desc}</p>
                    <ul className="mt-2.5 space-y-1">
                      {s.outputs.map((o) => (
                        <li key={o} className="text-[12.5px] text-ink-700">· {o}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[12px] text-ink-400">{s.who}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
