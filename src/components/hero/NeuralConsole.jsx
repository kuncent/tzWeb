import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Panel, CmdButton, Metric, Sparkline, Ring, Row, Led, wobble, useSeries, useTick } from './consoleBits'
import { speakerNow } from '../three/hero/buildBus'

/* AI 屏看板 = 课堂引擎的运行面板。四种能力各有各的读数：
   备课看生成进度、课堂看谁在说话、学情看掌握漏斗、资源看阵面沉淀。
   切换的不是标签页，是引擎此刻在干哪件事 —— 场景里那五块智能体界面
   会跟着换一组在走的数据链路。 */

/* 每种能力的主读数与主视图：写死结构而不是从数据层推导，
   因为这四块的版式天生不同，硬凑成同构反而丢信息 */
const MODES = {
  prep: {
    title: 'LESSON GEN',
    metrics: [['生成用时', '32', 's'], ['大纲节点', '18', '个'], ['场景页数', '8', '页']],
    stages: ['需求解析', '大纲生成', '逐页装配', '排版自检'],
  },
  class: {
    title: 'MULTI-AGENT',
    metrics: [['在线智能体', '5', '个'], ['课堂互动率', '98', '%'], ['主动追问', '27', '次']],
    stages: ['AI 教师讲授', '同学追问', '反例质疑', '圆桌辩论'],
  },
  insight: {
    title: 'ANALYTICS',
    metrics: [['学情维度', '24', '项'], ['薄弱知识点', '3', '个'], ['风险预警', '7', '天']],
    stages: ['答题采集', '代码提交', '发言语义', '漏斗收敛'],
  },
  hub: {
    title: 'COURSE HUB',
    metrics: [['在架课程包', '500+', '门'], ['双周更新', '14', '天'], ['校本沉淀', '86', '份']],
    stages: ['产业案例入库', '教师 fork', '改编上线', '校本归档'],
  },
}

export default function NeuralConsole({ scene, cmd, fire }) {
  const accent = scene.accent
  const tick = useTick(760)
  const mode = MODES[cmd.id] || MODES.prep
  const token = useSeries({ base: 1180, amp: 180, seed: 6, n: 26, period: 760, spike: cmd.n, gain: 2.4 })

  /* 四阶段流水线：点一次按钮重跑一遍，每拍推进一格 —— 引擎在干活的样子 */
  const [step, setStep] = useState(0)
  useEffect(() => {
    setStep(0)
  }, [cmd.n, cmd.id])
  useEffect(() => setStep((s) => Math.min(4, s + 1)), [tick])

  /* 智能体谁在发言：与场景里那五块界面同一个纯函数（墙上时钟 3s 一人）。
     上一版这里用本组件自己的 tick 算 —— 760ms 一拍除 3 与全局 3s 轮值不是一套，
     于是看板说「反例者在说」、画面里亮着的是观察员（数字打架比丑更糟） */
  const speaker = speakerNow(scene.agents.length)

  const pct = useMemo(() => Math.round(wobble(tick, 61, 4, 8)), [tick])

  return (
    <Panel
      title="AI ENGINE"
      code="QWEN · ON-PREM"
      accent={accent}
      right={<span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: accent }}><Led accent={accent} />{mode.title}</span>}
    >
      {/* 上：三个主读数 + 掌握度环 */}
      <div className="flex items-start gap-4">
        <div className="grid flex-1 grid-cols-3 gap-3">
          {mode.metrics.map(([k, v, u]) => (
            <Metric key={k} k={k} v={v} unit={u} accent={accent} />
          ))}
        </div>
        <Ring pct={pct} accent={accent} size={54} />
      </div>

      {/* 中：能力按钮 */}
      <div className="mt-3.5 grid gap-1.5 sm:grid-cols-2">
        {scene.commands.map((c) => (
          <CmdButton key={c.id} cmd={c} accent={accent} on={cmd.id === c.id} onClick={() => fire(c.id)} />
        ))}
      </div>

      {/* 下：左流水线 · 右 token 流与智能体 */}
      <div className="mt-3.5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
        <div>
          <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.16em] text-white/35">
            {cmd.id === 'insight' ? scene.funnel.title : '执行链路'}
          </p>
          {cmd.id === 'insight' ? (
            <div className="space-y-1">
              {scene.funnel.stages.map(([s, v], i) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-[38px] shrink-0 text-[10px] text-white/45">{s}</span>
                  <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: accent, boxShadow: `0 0 10px ${accent}88` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${v}%` }}
                      transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                  <span className="w-[26px] shrink-0 text-right font-mono text-[10px] tabular-nums text-white/70">{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-[5px]">
              {mode.stages.map((s, i) => {
                const done = i < step
                const live = i === step
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span
                      className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border font-mono text-[8px]"
                      style={done || live ? { borderColor: accent, color: accent } : { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.28)' }}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span className="flex-1 truncate text-[10.5px]" style={{ color: done || live ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.32)' }}>{s}</span>
                    {live && <span className="h-[3px] w-10 shrink-0 overflow-hidden rounded-full bg-white/10"><motion.span className="block h-full rounded-full" style={{ background: accent }} animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} /></span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
          <p className="text-[9.5px] uppercase tracking-[0.16em] text-white/35">token 吞吐</p>
          <div className="h-[34px]">
            <Sparkline data={token} accent={accent} h={34} />
          </div>
          <p className="font-mono text-[12px] font-semibold tabular-nums text-white">
            {Math.round(token[token.length - 1])}
            <span className="ml-0.5 text-[9px] font-normal" style={{ color: accent }}>t/s</span>
          </p>
        </div>
      </div>

      {/* 智能体在说的话：只有课堂模式展开，其它模式收成一行，避免四块看板长得一样 */}
      <AnimatePresence initial={false} mode="wait">
        {cmd.id === 'class' ? (
          <motion.div key="agents" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden border-t border-white/[0.07] pt-2.5">
            {scene.agents.map((a, i) => (
              <Row key={a} name={a} value={i === speaker ? 'SPEAKING' : 'IDLE'} accent={accent} live={i === speaker} dim={i !== speaker} />
            ))}
          </motion.div>
        ) : (
          <motion.p key="quiet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 border-t border-white/[0.07] pt-2.5 font-mono text-[10px] text-white/30">
            多智能体同堂 · 点「多智能体课堂」看谁在说话
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/[0.07] pt-3 sm:grid-cols-4">
        {scene.specs.map(([k, v]) => (
          <Metric key={k} k={k} v={v} accent={accent} />
        ))}
      </div>
    </Panel>
  )
}
