import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUp, CheckCircle2, ChevronRight, Loader2, Sparkles, PhoneCall, Lightbulb, Users, Trophy, Building2, MousePointerClick } from 'lucide-react'
import { advisorConsoleUrl } from '../../data/site'
import { analyzeNeed, generateSolution, loadHistory, pushHistory, handoffToContact } from '../../lib/aiEngine'

const EXAMPLES = [
  '计算机学院拟新建人工智能实验室，面向 200 名学生开课，希望一学期内落地',
  '教务处计划改造 10 门实训课程，引入 AI 课堂与学情分析，还要做师资培训',
  '我们要组建机器人竞赛训练营，需要场地、导师和集训体系',
]

const TABS = [
  { id: 'modules', label: '方案组成' },
  { id: 'phases', label: '实施路线' },
  { id: 'case', label: '标杆案例' },
]

export default function SolutionPanel() {
  const [text, setText] = useState(EXAMPLES[0])
  const [status, setStatus] = useState('idle') // idle | running | done
  const [step, setStep] = useState(0)
  const [pkg, setPkg] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [tab, setTab] = useState('modules')
  const [focused, setFocused] = useState(false)
  const [history, setHistory] = useState(() => loadHistory())
  const [sent, setSent] = useState(false)
  const timers = useRef([])
  const listRef = useRef(null)

  const generate = (raw) => {
    const input = (raw ?? text).trim()
    if (!input || status === 'running') return
    const t0 = performance.now()
    setStatus('running')
    setSent(false)
    setStep(1)
    timers.current.forEach(clearTimeout)
    timers.current = [
      setTimeout(() => setStep(2), 300),
      setTimeout(() => setStep(3), 640),
      setTimeout(() => {
        const analysis = analyzeNeed(input)
        const solution = generateSolution(analysis)
        setPkg({ analysis, solution })
        setElapsed(Math.max(1, Math.round(performance.now() - t0)))
        setStatus('done')
        setTab('modules')
        setHistory(pushHistory(analysis, solution.score))
      }, 980),
    ]
  }

  useEffect(() => {
    generate(history[0]?.text || EXAMPLES[0])
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white text-left shadow-lift">
      {/* 窗口栏 */}
      <div className="flex items-center gap-2 border-b border-ink-900/[0.05] bg-mist-100 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 hidden rounded-md bg-white px-3 py-1 font-mono text-[10px] text-ink-400 ring-1 ring-ink-900/[0.05] sm:block">
          {advisorConsoleUrl}
        </span>
        <span className="ml-auto hidden items-center gap-1.5 text-[10px] font-medium text-ink-400 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          老师您好 · 描述需求，AI 实时出解决方案
        </span>
      </div>

      {/* 需求输入 */}
      <div className="relative px-4 pt-5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
            <Lightbulb className="h-[18px] w-[18px]" />
          </span>
          <div className="relative flex-1">
            <div className={`flex items-center rounded-xl border border-ink-900/[0.08] bg-mist-50 transition-colors focus-within:border-brand/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand/10 ${focused ? '' : 'animate-breathe'}`}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => e.key === 'Enter' && generate()}
                placeholder="点击输入：计算机学院拟新建 AI 实验室，面向 200 名学生…"
                className="w-full bg-transparent px-4 py-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400/80"
              />
            </div>
            {/* 未聚焦时的浮动引导角标：指向输入框 */}
            {!focused && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: [0, -3, 0] }}
                transition={{ y: { repeat: Infinity, duration: 1.3, ease: 'easeInOut' }, opacity: { duration: 0.4 } }}
                className="absolute -top-[26px] left-8 z-20 flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[10.5px] font-bold text-white shadow-glow"
              >
                <MousePointerClick className="h-3 w-3" />
                这里可以直接输入你的需求
                <span className="absolute -bottom-[3px] left-6 h-2 w-2 rotate-45 bg-brand" />
              </motion.div>
            )}
          </div>
          <button
            onClick={() => generate()}
            disabled={status === 'running' || !text.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-3 text-[12px] font-medium text-white transition-all hover:bg-ink-800 disabled:opacity-40"
          >
            {status === 'running' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{status === 'running' ? '分析中' : '出方案'}</span>
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 overflow-hidden pl-[52px] whitespace-nowrap">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => {
                setText(ex)
                generate(ex)
              }}
              className="max-w-full truncate rounded-full border border-ink-900/[0.07] bg-white px-3 py-1 text-[10.5px] text-ink-500 transition-colors hover:border-brand/40 hover:text-brand"
            >
              {ex.slice(0, 16)}…
            </button>
          ))}
          {history.slice(0, 1).map((h) => (
            <button
              key={h.ts}
              onClick={() => {
                setText(h.text)
                generate(h.text)
              }}
              className="flex items-center gap-1 rounded-full bg-mist-200 px-2.5 py-1 text-[10.5px] text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand"
              title={h.text}
            >
              <ChevronRight className="h-2.5 w-2.5" />
              {h.label.slice(0, 8)}
            </button>
          ))}
        </div>
      </div>

      {/* 分析流水线 */}
      <div className="mt-2 flex items-center gap-1.5 border-t border-ink-900/[0.05] px-4 py-2 text-[11px] sm:px-5">
        {['需求理解', '方案匹配', '路线与预算生成'].map((s, i) => {
          const idx = i + 1
          const isDone = status === 'done' || step > idx
          const isActive = status === 'running' && step === idx
          return (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-ink-400" />}
              <span
                className={
                  isDone
                    ? 'flex items-center gap-1 font-medium text-emerald-600'
                    : isActive
                      ? 'flex items-center gap-1 font-semibold text-brand'
                      : 'flex items-center gap-1 text-ink-400'
                }
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-3.5 w-3.5 rounded-full border border-current opacity-40" />}
                {s}
              </span>
            </span>
          )
        })}
        <span className="ml-auto font-mono text-ink-400">{status === 'done' ? `${elapsed}ms` : status === 'running' ? '···' : ''}</span>
      </div>

      {/* 结果 */}
      {pkg && (
        <div className="grid gap-3 border-t border-ink-900/[0.05] p-4 sm:px-5 md:h-[400px] md:grid-cols-[1fr_1.05fr] md:grid-rows-[minmax(0,1fr)]">
          {/* 左：需求诊断 + 方案概要 */}
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-ink-900/[0.06] bg-white p-4">
            <div className="flex shrink-0 items-center justify-between">
              <p className="text-[13px] font-bold text-ink-900">需求诊断</p>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-medium text-brand">AI 已理解</span>
            </div>
            {/* 诊断内容区：固定高度下内部滚动（Lenis 已豁免） */}
            <div data-lenis-prevent className="max-h-[320px] min-h-0 flex-1 overflow-auto md:max-h-none">
              <div className="mt-3 flex flex-wrap gap-1.5">
              {pkg.analysis.scenes.map((s) => (
                <span key={s.key} className="rounded-full bg-ink-900 px-2.5 py-1 text-[10.5px] font-medium text-white">{s.label}</span>
              ))}
              <span className="rounded-full border border-brand/30 bg-white px-2.5 py-1 text-[10.5px] font-medium text-brand">{pkg.analysis.subjectLabel}</span>
            </div>
              <ul className="mt-3.5 space-y-1.5">
                {pkg.solution.diagnosis.slice(1).map((d) => (
                  <li key={d} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-500">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 shrink-0 rounded-xl bg-gradient-to-br from-brand-600 to-brand p-4 text-white shadow-glow">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">为您生成的方案</p>
              <p className="mt-1.5 text-[15px] font-bold leading-snug">{pkg.solution.title}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-4">
                  {pkg.solution.metrics.slice(0, 3).map((m) => (
                    <div key={m.k}>
                      <p className="text-[15px] font-bold leading-none">{m.v}</p>
                      <p className="mt-1 whitespace-nowrap text-[9.5px] text-white/70">{m.k}</p>
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-bold leading-none">{pkg.solution.score}<span className="text-[12px]">%</span></p>
                  <p className="mt-1 text-[9.5px] text-white/70">方案匹配度</p>
                </div>
              </div>
            </div>
          </div>

          {/* 右：Tabs */}
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-ink-900/[0.06] bg-white">
            <div className="flex items-center gap-1 border-b border-ink-900/[0.05] p-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id)
                    if (listRef.current) listRef.current.scrollTop = 0 // 切换 Tab 时重置列表滚动位置
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition-colors ${
                    tab === t.id ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-mist-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div ref={listRef} data-lenis-prevent className="max-h-[300px] min-h-0 flex-1 overflow-auto p-3.5 md:max-h-none">
              {tab === 'modules' && (
                <div className="space-y-2.5">
                  {pkg.solution.modules.map((m, i) => (
                    <motion.div
                      key={m.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.35 }}
                      className="rounded-lg border border-ink-900/[0.06] bg-mist-50 px-3.5 py-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[12.5px] font-bold text-ink-900">{i + 1}. {m.name}</p>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9.5px] font-medium text-brand ring-1 ring-brand/15">{m.from}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{m.desc}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {tab === 'phases' && (
                <div className="relative space-y-4 pl-5">
                  <span className="absolute left-[7px] top-2 bottom-2 w-px bg-ink-900/[0.08]" />
                  {pkg.solution.phases.map((p, i) => (
                    <motion.div
                      key={p.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                      className="relative"
                    >
                      <span className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${i === 0 ? 'bg-brand shadow-glow' : 'bg-mist-300'}`} />
                      <div className="flex items-center gap-2">
                        <p className="text-[12.5px] font-bold text-ink-900">{p.name}</p>
                        <span className="rounded-full bg-mist-200 px-2 py-0.5 font-mono text-[9.5px] text-ink-500">{p.dur}</span>
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {p.items.map((it) => (
                          <li key={it} className="text-[11px] leading-relaxed text-ink-500">· {it}</li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              )}

              {tab === 'case' && (
                <div className="flex h-full flex-col">
                  <div className="rounded-xl border border-ink-900/[0.06] bg-mist-50 p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-brand" />
                      <p className="text-[13px] font-bold text-ink-900">{pkg.solution.caseRef.school}</p>
                    </div>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">{pkg.solution.caseRef.note}</p>
                    <div className="mt-3 flex gap-4 border-t border-ink-900/[0.06] pt-3">
                      {[{ v: '5,000㎡', k: '建设面积' }, { v: '5,000+', k: '服务学生' }, { v: '300+', k: '课程数量' }].map((m) => (
                        <div key={m.k}>
                          <p className="text-[14px] font-bold text-ink-900">{m.v}</p>
                          <p className="mt-0.5 text-[9.5px] text-ink-400">{m.k}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50 px-3.5 py-3 text-[11px] leading-relaxed text-brand">
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    与您需求相近的院校已验证该路线；点击下方按钮，方案顾问将带着完整建议书与您沟通预算与申报路径。
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 底部：就方案联系我们 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-900/[0.05] bg-mist-50 px-4 py-2.5 sm:px-5">
        <span className="text-[10.5px] text-ink-400">
          {status === 'done' ? '✓ 方案已按你的描述实时生成 · 可修改需求重新生成' : status === 'running' ? '分析中…' : '等待需求描述'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generate()}
            disabled={status === 'running'}
            className="rounded-full px-4 py-2 text-[12px] font-medium text-ink-500 transition-colors hover:bg-white hover:text-ink-900 disabled:opacity-40"
          >
            重新生成
          </button>
          <button
            onClick={() => {
              if (!pkg) return
              handoffToContact(pkg.analysis, pkg.solution)
              setSent(true)
              setTimeout(() => setSent(false), 3000)
            }}
            disabled={!pkg || status !== 'done'}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px] font-bold text-white shadow-soft transition-all disabled:opacity-40 ${
              sent ? 'bg-emerald-600' : 'bg-ink-900 hover:bg-brand hover:shadow-glow'
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            {sent ? '已带入下方联系表单 ✓' : '就此方案联系我们'}
          </button>
        </div>
      </div>
    </div>
  )
}
