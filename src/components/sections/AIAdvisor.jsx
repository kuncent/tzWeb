import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Sparkles, BookOpen, FileDown } from 'lucide-react'
import { Check } from 'lucide-react'
import { Magnetic, CountUp, SectionHead, EASE } from '../ui'
import SolutionPanel from '../ai/SolutionPanel'
import { advisorKicker, advisorTitle, advisorDesc, advisorCtas, advisorStats, advisorPills } from '../../data/site'

/* 这个板块就是原来的首屏 Hero：甲方要求把首屏让给三屏业务特效。
   现下挪到「痛点 → 产品矩阵」之间：先让方案顾问出场把需求理清，再进产品与方案。
   需求 → 方案 → 一键带进页面底部的咨询表单。板块名：一站式 AI 方案顾问。 */

function scrollToContact() {
  const el = document.getElementById('contact')
  if (!el) return
  if (window.__lenis) window.__lenis.scrollTo(el, { offset: -120 })
  else el.scrollIntoView({ behavior: 'smooth' })
}

/* 漂浮演示小卡：藏在左栏与面板之间的空隙及面板右下角，不压输入框与引导角标 */
const PILL_POS = [
  '-left-28 top-[12%]',
  '-right-24 bottom-[8%]',
  '-left-28 -bottom-8',
]

/* 演示 1：需求原文打字机 + 关键词高亮 */
const TYPING_SEG = [
  { t: '化工学院', hl: true },
  { t: '计划改造', hl: false },
  { t: '5门课程', hl: true },
  { t: '，引入', hl: false },
  { t: 'AI课堂', hl: true },
]
const TYPING_CHARS = TYPING_SEG.flatMap((s) => [...s.t].map((ch) => ({ ch, hl: s.hl })))

function TypingDemo() {
  const [n, setN] = useState(0)
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      i += 1
      if (i > TYPING_CHARS.length + 24) i = 0 // 打完后停顿再重来
      setN(Math.min(i, TYPING_CHARS.length))
    }, 110)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="h-[54px] overflow-hidden rounded-xl bg-mist-100 px-3 py-2.5 text-[11px] leading-[1.6]">
      <p className="flex flex-wrap font-medium">
        {TYPING_CHARS.map((c, i) => (
          <span key={i} className={i < n ? (c.hl ? 'font-bold text-brand' : 'text-ink-600') : 'opacity-0'}>
            {c.ch}
          </span>
        ))}
        {n < TYPING_CHARS.length && <span className="ml-px inline-block h-[12px] w-[2px] self-center bg-brand motion-safe:animate-pulse" />}
      </p>
    </div>
  )
}

/* 演示 2：方案模块逐行滑入 + 匹配度环形进度 */
const MATCH_MODULES = ['AI 课堂平台', '课程资源包', '学情分析中心']

function ScoreDemo() {
  return (
    <div className="flex h-[62px] items-center gap-2.5 rounded-xl bg-mist-100 px-2.5">
      <div className="relative h-11 w-11 shrink-0">
        <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" stroke="#E2E8F0" strokeWidth="4" />
          <motion.circle
            cx="22" cy="22" r="18" fill="none" stroke="#1677FF" strokeWidth="4" strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 0.68, 0.68] }}
            transition={{ duration: 4.6, times: [0.4, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[11px] font-bold text-brand">68%</span>
      </div>
      <div className="flex-1 space-y-1">
        {MATCH_MODULES.map((m, i) => (
          <motion.div
            key={m}
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: [0, 1, 1, 0], x: [-10, 0, 0, 0] }}
            transition={{ duration: 4.6, times: [0.08 + i * 0.1, 0.3 + i * 0.1, 0.92, 1], repeat: Infinity }}
          >
            <span className="h-1 w-1 shrink-0 rounded-full bg-brand" />
            <span className="truncate text-[10.5px] text-ink-600">{m}</span>
            <Check className="ml-auto h-2.5 w-2.5 shrink-0 text-emerald-500" />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* 演示 3：方案文档 → 飞入联系表单 → 打勾 */
function HandoffDemo() {
  return (
    <div className="relative flex h-[62px] items-center justify-between overflow-hidden rounded-xl bg-mist-100 px-3">
      <motion.div
        className="flex flex-col gap-1 rounded-lg bg-white px-2.5 py-2 shadow-sm"
        animate={{ x: [0, 22, 60, 60], opacity: [1, 1, 0, 0] }}
        transition={{ duration: 4, times: [0, 0.35, 0.55, 1], repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
      >
        <span className="flex items-center gap-1 text-[8px] font-bold text-brand"><Sparkles className="h-2 w-2" /> 方案</span>
        <span className="h-1 w-9 rounded-sm bg-brand/50" />
        <span className="h-1 w-6 rounded-sm bg-mist-300" />
      </motion.div>
      <motion.div
        className="text-ink-400"
        animate={{ x: [0, 0, 10, 10, 10], opacity: [0.25, 0.25, 1, 0, 0] }}
        transition={{ duration: 4, times: [0, 0.2, 0.5, 0.62, 1], repeat: Infinity, repeatDelay: 0.8 }}
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </motion.div>
      <div className="relative flex flex-col gap-1 rounded-lg border border-ink-900/[0.08] bg-white px-2.5 py-2">
        <span className="text-[8px] font-bold text-ink-400">联系表单</span>
        <span className="h-1 w-10 rounded-sm bg-mist-200" />
        <motion.span
          className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 0, 1.25, 1, 1, 0] }}
          transition={{ duration: 4, times: [0, 0.55, 0.63, 0.68, 0.94, 1], repeat: Infinity, repeatDelay: 0.8 }}
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </motion.span>
      </div>
    </div>
  )
}

const PILL_DEMOS = { typing: TypingDemo, score: ScoreDemo, handoff: HandoffDemo }

function AdvisorPill({ pill, index }) {
  const Demo = PILL_DEMOS[pill.demo]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: 0.3 + index * 0.15, duration: 0.6, ease: EASE }}
      className={`pointer-events-none absolute z-10 hidden w-[210px] flex-col gap-2.5 rounded-2xl border border-ink-900/[0.06] bg-white/[0.97] px-4 py-3.5 shadow-glass animate-floaty xl:flex ${PILL_POS[index] || 'left-0 top-0'}`}
      style={{ animationDelay: `${index * 1.1}s` }}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
          <pill.icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </span>
        <div>
          <p className="text-[12.5px] font-bold text-ink-900">{pill.title}</p>
          <p className="mt-0.5 text-[10.5px] text-ink-400">{pill.desc}</p>
        </div>
      </div>
      {Demo && <Demo />}
    </motion.div>
  )
}

export default function AIAdvisor() {
  return (
    <section id="advisor" className="relative overflow-hidden sec-y bg-gradient-to-b from-white to-mist-100">
      {/* 背景：细网格 + 顶部光晕（原首屏那两层，收进板块内） */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] [background-image:linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,black_25%,transparent_72%)]" />
      {/* 光晕用多段 radial-gradient 直接画软：不叠 blur-2xl（大面积 filter 重新光栅化很贵） */}
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[560px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.02),rgba(59,130,246,0.15)_40%,transparent_80%)]" />
      {/* 顶部羽化：把网格与光晕在板块交界处淡入到白，避免从上一屏纯白突然撞出一条硬边 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white via-white/85 to-transparent" />

      <div className="container-x relative">
        <SectionHead
          id="advisor" n="02"
          en="ONE-STOP AI ADVISOR"
          zh="一站式 AI 方案顾问"
          sub="这五条，我们都有在跑的解法；但落到不同院系、预算与周期，组合方式并不相同。把您的情况一句话说给方案顾问——该上哪些模块、怎么排期、匹配度多少，实时算给您看，再一键带进咨询表单。"
        />

        {/* 左右布局：左文案 · 右方案引擎 */}
        <div className="mt-12 grid items-start gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 xl:gap-16">
          {/* 左：文案 */}
          <div className="max-w-xl 3xl:max-w-[620px]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/80 px-4 py-1.5 text-[13px] font-bold text-brand backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
              {advisorKicker}
            </motion.div>

            <h3 className="mt-5 font-bold tracking-[-0.03em] text-ink-900 text-[clamp(1.75rem,1.3rem+2vw,2.7rem)] leading-[1.14]">
              {advisorTitle.map((line, i) => (
                <motion.span
                  key={line}
                  className="block"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: 0.06 + i * 0.1, duration: 0.6, ease: EASE }}
                >
                  {i === 0 ? (
                    line
                  ) : (
                    <span className="bg-gradient-to-r from-brand-700 via-brand to-brand-400 bg-clip-text text-transparent">{line}</span>
                  )}
                </motion.span>
              ))}
            </h3>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: 0.24, duration: 0.6, ease: EASE }}
              className="mt-4 text-[14px] leading-[1.8] text-ink-500"
            >
              {advisorDesc}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: 0.32, duration: 0.6, ease: EASE }}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <Magnetic strength={0.2}>
                <button onClick={scrollToContact} className="btn-dark h-[46px] gap-2 rounded-full px-6 text-[14px]">
                  {advisorCtas[0].label} <ArrowRight className="h-4 w-4" />
                </button>
              </Magnetic>
              <button onClick={scrollToContact} className="btn-ghost h-[46px] rounded-full px-5 text-[14px]">
                {advisorCtas[1].label}
              </button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-400"
            >
              <a href="/technology" className="flex items-center gap-1.5 font-medium transition-colors hover:text-brand">
                <BookOpen className="h-4 w-4" /> {advisorCtas[2].label}
              </a>
              <a href="/resources" className="flex items-center gap-1.5 font-medium transition-colors hover:text-brand">
                <FileDown className="h-4 w-4" /> {advisorCtas[3].label}
              </a>
            </motion.div>
          </div>

          {/* 右：真实可用的需求分析 + 方案引擎 + 漂浮卡（面板封顶居中，大屏下不无限拉伸） */}
          <div className="relative mx-auto w-full max-w-[800px] wide:max-w-[860px] 3xl:max-w-[920px]">
            <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 rounded-[40px] bg-[radial-gradient(closest-side,rgba(59,130,246,0.02),rgba(59,130,246,0.17)_40%,transparent_80%)]" />
            <AdvisorPill pill={advisorPills[0]} index={0} />
            <AdvisorPill pill={advisorPills[1]} index={1} />
            <AdvisorPill pill={advisorPills[2]} index={2} />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, ease: EASE }}
              className="relative z-[5]"
            >
              <SolutionPanel />
            </motion.div>
          </div>
        </div>

        {/* 数据条 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mx-auto mt-14 grid w-full max-w-[1200px] grid-cols-2 items-center gap-y-6 md:grid-cols-4"
        >
          {advisorStats.map((s, i) => (
            <div key={s.label} className={`px-4 text-center ${i > 0 ? 'md:border-l md:border-ink-900/[0.08]' : ''}`}>
              <p className="text-stat font-bold tracking-tight text-ink-900">
                <CountUp to={s.value} duration={1.8} />
                <span className="text-brand">{s.suffix}</span>
              </p>
              <p className="mt-0.5 text-[12px] text-ink-400">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
