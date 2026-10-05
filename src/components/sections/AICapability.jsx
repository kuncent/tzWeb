import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'motion/react'
import { Radio } from 'lucide-react'
import { Reveal, SectionHead, SpotlightGlow, spotMove, EASE } from '../ui'
import { aiHead, aiAgents, aiEngine } from '../../data/site'

/* ============================================================
 * AI 贯穿教学研全链路 —— 实时演示台
 * ------------------------------------------------------------
 * 这一屏是全站立身之本，用"演"而不是"列"：一条教学研链路主轴，
 * 一个会自己生成、讲授、评测、迭代的课堂窗口，四个按角色点亮的
 * 智能体。买家在这里第一次"看见"产品跑起来，而不是读四张卡片。
 * 纯 DOM/CSS 动效，WebGL 仅氛围层且懒加载；reduced-motion 给静帧。
 * ============================================================ */

const TOPICS = ['机械臂逆运动学', '区块链共识机制', '机器学习入门']

/* 五段链路：每段标出此刻"在场"的智能体（对应 aiAgents 下标：教师0/同学1/助教2/导演3） */
const PHASES = [
  { key: 'prep', label: '备课', agent: 3, note: '导演编排 · 解析知识点' },
  { key: 'teach', label: '授课', agent: 0, note: 'AI 教师主讲 · 白板板书' },
  { key: 'lab', label: '实训', agent: 1, note: 'AI 同学陪练 · 交互模拟' },
  { key: 'assess', label: '评测', agent: 2, note: 'AI 助教巡视 · 即时评分' },
  { key: 'iter', label: '迭代', agent: 3, note: '数据回流 · 内容自动演进' },
]

/* 演示主题（随阶段推进逐条累积进课堂线程，读作"一堂课正在被生成"） */
const threadFor = (topic) => [
  { p: 0, from: 'sys', text: `主题「${topic}」→ 已解析 4 个知识点，规划课程结构` },
  { p: 0, from: 'sys', text: '装配课堂组件：讲解幻灯 · 随堂提问 · 互动模拟 · 项目任务' },
  { p: 1, from: 'teacher', text: '先看连杆坐标系怎么建——我把这一帧直接画在白板上。' },
  { p: 2, from: 'peer', text: '老师，逆解为什么常常有多组？该选哪一组上机？' },
  { p: 2, from: 'sys', text: '已启动孪生体仿真：实时求解 · 支持真机联动' },
  { p: 3, from: 'ta', text: '随堂测验：3 人未掌握关键点，已课后单独补课，不当众点破。' },
  { p: 4, from: 'sys', text: '课堂数据回流 → 下一版讲法已自动迭代 · 平均出课 38s' },
]

const WHO = {
  teacher: { label: 'AI 教师', cls: 'border-brand/40 bg-brand/[0.12] text-white' },
  peer: { label: 'AI 同学', cls: 'border-white/15 bg-white/[0.06] text-white/90' },
  ta: { label: 'AI 助教', cls: 'border-emerald-400/30 bg-emerald-400/[0.10] text-white/90' },
}

function Bubble({ m }) {
  if (m.from === 'sys') {
    return (
      <div className="flex items-start gap-2 font-mono text-[12px] leading-relaxed text-white/55">
        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand/70" />
        <span>{m.text}</span>
      </div>
    )
  }
  const w = WHO[m.from]
  return (
    <div className={'rounded-xl border px-3.5 py-2.5 ' + w.cls}>
      <div className="text-[10px] font-semibold tracking-[0.12em] text-white/45">{w.label}</div>
      <p className="mt-1 text-[13px] leading-relaxed">{m.text}</p>
    </div>
  )
}

export default function AICapability() {
  const sceneRef = useRef(null)
  /* 演示循环只在屏内运行：滚走即停表，既省重渲染，也杜绝屏外任何潜在重排对下游屏的扰动 */
  const active = useInView(sceneRef, { margin: '15% 0px' })
  const reduced = useMemo(
    () => (typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    []
  )
  const [phase, setPhase] = useState(0)
  const [topic, setTopic] = useState(0)
  const tick = useRef(0)

  useEffect(() => {
    if (reduced) {
      setPhase(PHASES.length - 1)
      return
    }
    if (!active) return
    const id = setInterval(() => {
      tick.current += 1
      setPhase(tick.current % PHASES.length)
      setTopic(Math.floor(tick.current / PHASES.length) % TOPICS.length)
    }, 2400)
    return () => clearInterval(id)
  }, [reduced, active])

  const pickTopic = (i) => {
    tick.current = 0
    setTopic(i)
    setPhase(0)
  }

  const activeAgent = PHASES[phase].agent
  const thread = threadFor(TOPICS[topic])
  const visible = thread.filter((m) => m.p <= phase)

  return (
    <section id="ai" ref={sceneRef} className="relative overflow-hidden bg-night sec-y text-white">
      {/* ―― 背景：深空渐变 + 两团缓慢漂移的极光辉光 + 细网格 + 暗角 ――
          原先叠了一层 WebGL 粒子场（MatrixScene），600 颗加色软点在低配无泛光下糊成
          一地失焦光斑，读作噪点而非科技氛围；换成可控的 CSS 极光，更干净、更省一个 canvas。 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_85%_at_50%_-15%,#0c1a33_0%,#080d18_52%,#05070d_100%)]" />
      <div className="animate-drift pointer-events-none absolute -left-32 top-[10%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.22),transparent_72%)]" />
      <div className="animate-drift pointer-events-none absolute -right-28 bottom-[4%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.16),transparent_72%)]" style={{ animationDelay: '-9s' }} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_72%_60%_at_50%_42%,#000,transparent_80%)]" />
      <div className="pointer-events-none absolute inset-0 [box-shadow:inset_0_0_160px_40px_rgba(3,6,12,0.7)]" />

      <div className="container-x relative z-10">
        <SectionHead
          id="ai" n="06"
          tone="dark"
          en={aiHead.en}
          zh={aiHead.zh}
          sub={aiHead.desc}
          action={{ to: '/technology#agents', children: '看四个自研引擎' }}
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-10">
          {/* 左：教学研链路主轴 + 在场智能体 */}
          <Reveal className="flex flex-col gap-8">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-white/40">教 · 学 · 研 全链路</div>
              <div className="relative mt-5">
                {/* 竖连接轴：底色轨道 */}
                <span className="pointer-events-none absolute left-[15px] top-2 bottom-2 w-px bg-white/10" />
                {/* 进度填充：随阶段变高；内叠一层竖向 arch-flow 流动光带（flowchart 数据流感）
                    dasharray 周期 16+84=100 = --flow，循环点落在图案边界不回跳 */}
                <span
                  className="pointer-events-none absolute left-[15px] top-2 w-0.5 overflow-hidden transition-[height] duration-700 ease-out"
                  style={{ height: `calc(${(phase / (PHASES.length - 1)) * 100}% - 8px)` }}
                >
                  <span className="absolute inset-0 bg-gradient-to-b from-brand-400 to-brand" />
                  <svg aria-hidden viewBox="0 0 2 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                    <line
                      x1="1"
                      y1="0"
                      x2="1"
                      y2="100"
                      stroke="#BBD8FF"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeDasharray="16 84"
                      className="arch-flow"
                      style={{ '--flow': '100' }}
                    />
                  </svg>
                </span>
                <ul className="relative space-y-3">
                  {PHASES.map((ph, i) => {
                    const done = i < phase
                    const now = i === phase
                    return (
                      <li key={ph.key} className="flex items-center gap-3">
                        <span
                          className={
                            'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[12px] font-bold transition-all duration-500 ' +
                            (now
                              ? 'animate-breathe border-brand bg-brand text-white shadow-glow'
                              : done
                                ? 'border-brand/40 bg-brand/15 text-brand-300'
                                : 'border-white/12 bg-white/[0.03] text-white/35')
                          }
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className={'text-[14px] font-semibold transition-colors duration-500 ' + (now ? 'text-white' : 'text-white/55')}>
                            {ph.label}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {/* 数据回流反馈回路（对齐 LSTM 机理图的“回路”语言）：迭代 → 备课 的一条
                    右侧绕行虚线回路，顶端箭头指回备课，一颗发光数据点自下而上流动。
                    只在链路列右侧空白区绕行，不吃布局、窄屏隐藏。 */}
                <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 left-[80px] hidden lg:block">
                  <div className="absolute top-[16px] bottom-[16px] right-[8px] rounded-r-xl border-2 border-l-0 border-dashed border-brand/45" />
                  <span className="absolute right-[3px] top-[7px] text-[12px] leading-none text-brand">▲</span>
                  <span className="animate-flowup absolute right-[4px] h-2 w-2 -translate-y-1/2 rounded-full bg-brand shadow-glow" />
                  <span className="absolute right-[20px] top-1/2 -translate-y-1/2 text-[10.5px] font-semibold tracking-[0.12em] text-brand-300">数据回流</span>
                </div>
              </div>
              {/* 阶段说明：单条固定高度槽位，仅做透明度切换 → 不改变列高，杜绝屏高抖动 */}
              <div className="mt-4 flex h-4 items-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="whitespace-nowrap text-[11.5px] text-brand-300"
                  >
                    {PHASES[phase].note}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* 在场智能体 */}
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-white/40">在场智能体</div>
              <div className="mt-4 space-y-2">
                {aiAgents.map((a, i) => {
                  const Icon = a.icon
                  const on = i === activeAgent
                  return (
                    <div
                      key={a.role}
                      className={
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ' +
                        (on ? 'border-brand/50 bg-brand/[0.10]' : 'border-white/10 bg-white/[0.03]')
                      }
                    >
                      <span
                        className={
                          'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all duration-500 ' +
                          (on ? 'bg-gradient-to-br from-brand-400 to-brand text-white shadow-glow' : 'bg-white/[0.06] text-white/45')
                        }
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className={'text-[13px] font-semibold transition-colors duration-500 ' + (on ? 'text-white' : 'text-white/55')}>
                          {a.role}
                        </div>
                        <div className="truncate text-[11px] text-white/40">{a.desc}</div>
                      </div>
                      {on && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand motion-safe:animate-pulse" />}
                    </div>
                  )
                })}
              </div>
            </div>
          </Reveal>

          {/* 右：AI 课堂工作台 · 实时演示窗口 */}
          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#070b13]/90 shadow-2xl ring-1 ring-white/5">
              {/* 窗口标题栏 */}
              <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <span className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                </span>
                <span className="ml-1 text-[12.5px] font-medium text-white/60">AI 课堂工作台</span>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-brand-300">
                  <Radio className="h-3 w-3" /> 实时演示
                </span>
              </div>

              {/* 主题选择 chips */}
              <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <span className="text-[11px] text-white/35">输入主题</span>
                {TOPICS.map((t, i) => (
                  <button
                    key={t}
                    onClick={() => pickTopic(i)}
                    className={
                      'rounded-full border px-3 py-1 text-[12px] transition-all duration-300 ' +
                      (i === topic
                        ? 'border-brand/50 bg-brand/15 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/80')
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* 课堂线程：固定高度终端窗口，新行上推、顶行淡出裁切 → 屏高恒定，不再牵动下游布局 */}
              <div className="relative flex h-[360px] flex-col justify-end gap-3 overflow-hidden px-4 py-5 md:px-5">
                <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-[#070b13] via-[#070b13]/70 to-transparent" />
                <AnimatePresence initial={false}>
                  {visible.map((m, i) => (
                    <motion.div
                      key={`${topic}-${m.p}-${i}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                    >
                      <Bubble m={m} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* 底部：进度与活数据 */}
              <div className="border-t border-white/[0.08] px-4 py-3">
                <div className="flex items-center justify-between text-[11px] text-white/40">
                  <span>
                    阶段 {phase + 1}/{PHASES.length} · {PHASES[phase].label}
                  </span>
                  <span className="font-mono">已生成课程 12,480 堂 · 覆盖 30+ 学科</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand transition-[width] duration-700 ease-out"
                    style={{ width: `${((phase + 1) / PHASES.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* 精简能力条：四套自研内核，一行一个 */}
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {aiEngine.map((e, i) => {
            const Icon = e.icon
            return (
              <div
                key={e.title}
                onMouseMove={spotMove}
                className="group relative overflow-hidden bg-night-800 p-5 transition-colors duration-300 hover:bg-night-700"
              >
                <SpotlightGlow tone="dark" />
                <div className="relative flex items-center gap-2.5">
                  <Icon className="h-[18px] w-[18px] text-brand-400" />
                  <h3 className="text-[13.5px] font-semibold">{e.title}</h3>
                </div>
                <p className="relative mt-2 text-[12px] leading-relaxed text-white/45">{e.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
