import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'motion/react'
import {
  ArrowUpRight,
  Check,
  Download,
  FileText,
  ListTree,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { productMatrix } from '../../data/site'
import { classroomAgents, classroomTopics, deckToLesson, pickLesson } from '../../data/classroom'
import { aiStatus, ask, generateLesson, sleep } from '../../lib/classroomApi'
import { requestProductContact } from '../../lib/aiEngine'

/* 备课台按第一次点开才挂载、才下载：@openmaic 的官方画布（≈231KB）与
   KaTeX 的 CSS 只挂在它身上，静态 import 会把这整块写进首屏的
   modulepreload 列表。挂载后就始终留在 DOM 里，所以刚备好的课件与
   讲稿不会因切 tab 而丢。 */
const ClassroomPrep = lazy(() => import('./ClassroomPrep'))

/* ============================================================
 * AI 多智能体课堂（第三板块）
 * ------------------------------------------------------------
 * 这屏要回答的问题是「模型到底在课堂里干什么」，所以不放宣传图，
 * 直接跑一个能放映的课堂播放器：左边是投影，右边是控制台与消息流。
 *
 * 数据通路：浏览器 → /api/ai/* → server/ai-proxy.mjs → 通义千问。
 * Key 只存在于服务端 .env；没配 key 或上游挂了就落回 src/data/classroom.js
 * 的内置教案，并在界面上如实标「离线演示」—— 演示可以离线，假模型不行。
 *
 * 节奏：每一幕用「拍」（beat，110ms 一拍）驱动，所有出现顺序都从拍数
 * 推导，不排队列定时器 —— 暂停即停表，切幕即归零，不会有异步尾巴。
 * ============================================================ */

const LAST = productMatrix.length - 1
const EASE = [0.22, 1, 0.36, 1]
const pad = (i) => String(i + 1).padStart(2, '0')
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

const TICK = 110 // ms / 拍
const LEAD = 4 // 幕间留白（换幕后先安静半秒）

/* 三类场景各自的时间线：显示到哪一条、打了多少字、这一幕共多少拍。
   answeredAt 是作答发生的那一拍 —— 判分窗口从那一刻起算，
   不能拿当前拍去比，否则在第三问才举手，这一幕会当场超时划走。 */
function beatOf(scene, beat, answeredAt) {
  if (!scene) return { shown: 0, typed: 0, board: 0, total: 20 }
  if (scene.type === 'quiz') {
    const n = Math.max(1, scene.options.length)
    const shown = beat < LEAD ? 0 : clamp(Math.floor((beat - LEAD) / 3) + 1, 0, n)
    /* 答了给 46 拍看判分；没答也自动往下放，演示不能卡在提问上 */
    return { shown, typed: 0, board: 0, total: answeredAt != null ? answeredAt + 46 : LEAD + n * 3 + 58 }
  }
  if (scene.type === 'discussion') {
    const n = Math.max(1, scene.turns.length)
    const shown = beat < LEAD ? 0 : clamp(Math.floor((beat - LEAD) / 14) + 1, 0, n)
    return { shown, typed: 0, board: 0, total: LEAD + n * 14 + 16 }
  }
  const n = Math.max(1, scene.bullets.length)
  const shown = beat < LEAD ? 0 : clamp(Math.floor((beat - LEAD) / 8) + 1, 0, n)
  const speech = scene.speech || ''
  const typeStart = LEAD + (n - 1) * 8 + 5
  const typed = clamp((beat - typeStart) * 3, 0, speech.length)
  const board = scene.board ? clamp(Math.round((beat - LEAD - 2) * 1.4), 0, scene.board.text.length) : 0
  return { shown, typed, board, total: typeStart + Math.ceil(speech.length / 3) + 15 }
}

const agentOf = (who) => classroomAgents.find((a) => who && (a.name === who || who.includes(a.name) || a.name.includes(who))) || classroomAgents[0]

/* 白板：一行板书逐字书写 + 一道 SVG 下划线随字数描出来（OpenMAIC 的实时绘图最省事的等价物） */
function Board({ board, n }) {
  if (!board || !board.text) return null
  const done = n >= board.text.length
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border border-white/[0.07] bg-[#070c14] px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-500">{board.kind === 'formula' ? 'BOARD · 推导' : 'BOARD · 示意'}</p>
      <p className="mt-1 wrap-break-word font-mono text-[14px] leading-relaxed text-brand-200 xl:text-[16px]">
        {board.text.slice(0, n)}
        <span className={`ml-0.5 inline-block h-[1em] w-[6px] translate-y-[2px] bg-brand-400 ${done ? 'opacity-0' : 'animate-pulse'}`} />
      </p>
      <svg className="pointer-events-none absolute inset-x-4 bottom-2 h-[10px] w-[calc(100%-2rem)]" viewBox="0 0 300 10" preserveAspectRatio="none">
        <path
          d="M2 7 C 60 2, 120 9, 180 4 S 260 6, 298 3"
          fill="none"
          stroke="rgba(22,119,255,0.5)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="320"
          strokeDashoffset={320 - 320 * (n / Math.max(1, board.text.length))}
          style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
      </svg>
    </div>
  )
}

/* 投影区的一类场景 */
function Scene({ scene, b, answer, onAnswer }) {
  if (!scene) return null
  if (scene.type === 'quiz') {
    const judged = answer != null
    return (
      <div className="mt-3">
        <p className="text-[16px] font-semibold leading-snug text-white xl:text-[17px]">{scene.question}</p>
        <ul className="mt-3 space-y-1.5">
          {scene.options.map((o, oi) => {
            const on = oi < b.shown
            const right = oi === scene.answer
            const picked = judged && oi === answer
            const state = !on
              ? 'opacity-0'
              : judged
                ? right
                  ? 'border-emerald-400/45 bg-emerald-400/[0.10] text-white'
                  : picked
                    ? 'border-rose-400/45 bg-rose-400/[0.08] text-white/80'
                    : 'border-white/[0.06] text-ink-400'
                : 'border-white/10 text-white/80 hover:border-brand/45 hover:bg-brand/[0.08]'
            return (
              <li key={oi} className="transition-all duration-500" style={{ opacity: on ? 1 : 0, transform: `translateY(${on ? 0 : 8}px)` }}>
                <button
                  type="button"
                  data-classroom="opt"
                  disabled={!on || judged}
                  onClick={() => onAnswer(oi)}
                  className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors xl:text-[14px] ${state}`}
                >
                  <span className="mt-[1px] shrink-0 font-mono text-[11.5px] tabular-nums text-ink-500">{String.fromCharCode(65 + oi)}</span>
                  <span className="min-w-0 flex-1">{o}</span>
                  {judged && right && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                  {judged && picked && !right && <X className="h-3.5 w-3.5 shrink-0 text-rose-400" />}
                </button>
              </li>
            )
          })}
        </ul>
        <AnimatePresence>
          {judged && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2.5 rounded-lg border-l-2 border-brand/60 bg-brand/[0.07] px-3 py-2 text-[13px] leading-relaxed text-brand-100"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-300">AI 教师判分 / </span>
              {answer === scene.answer ? '答对了。' : '再想想。'}
              {scene.explain}
            </motion.p>
          )}
        </AnimatePresence>
        {!judged && b.shown >= scene.options.length && (
          <p className="mt-2.5 text-[12.5px] text-ink-500">点选一个选项，AI 教师当堂判分 · 不动也会继续往下放</p>
        )}
      </div>
    )
  }
  if (scene.type === 'discussion') {
    return (
      <div className="mt-3">
        <p className="text-[14px] font-medium leading-snug text-brand-200 xl:text-[16px]">{scene.topic}</p>
        <ul className="mt-3 space-y-2">
          {scene.turns.slice(0, b.shown).map((t, ti) => {
            const a = agentOf(t.who)
            const last = ti === b.shown - 1
            return (
              <motion.li
                key={ti}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex items-start gap-2.5"
              >
                <span className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-[12.5px] font-semibold ${a.color}`}>
                  {a.name.replace('AI 同学 · ', '').replace('AI 教师', '师').slice(0, 1)}
                </span>
                <p className={`min-w-0 flex-1 rounded-xl rounded-tl-sm border px-3 py-2 text-[13px] leading-relaxed transition-colors ${last ? 'border-brand/30 bg-brand/[0.08] text-white' : 'border-white/[0.07] bg-white/[0.03] text-ink-400'}`}>
                  <span className={`mr-2 font-mono text-[11px] uppercase tracking-[0.12em] ${a.color}`}>{t.who}</span>
                  {t.text}
                </p>
              </motion.li>
            )
          })}
        </ul>
      </div>
    )
  }
  return (
    <div className="mt-3">
      <ul className="space-y-1.5">
        {/* 只渲染已揭示的条目：未讲到的 bullet 不再用 opacity:0 占位，
            否则投影区会先空出一大块“留白”，还把下方板书顶到卡片底边被裁 */}
        {scene.bullets.slice(0, b.shown).map((bl, bi) => {
          const lit = bi === b.shown - 1
          return (
            <motion.li
              key={bi}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <span className="flex items-start gap-2.5">
                {/* 激光笔：落在正在讲的那一条上 */}
                <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${lit ? 'bg-brand shadow-[0_0_0_4px_rgba(22,119,255,0.18)]' : 'bg-white/20'}`} />
                <span className={`text-[13.5px] leading-relaxed xl:text-[15px] ${lit ? 'text-white' : 'text-white/70'}`}>{bl}</span>
              </span>
            </motion.li>
          )
        })}
      </ul>
      <Board board={scene.board} n={b.board} />
    </div>
  )
}

/* 图谱视图：把这一堂的结构画成一张可核对的放射图（数据就是当前 lesson 本身） */
function MindMap({ lesson, sceneIdx, onPick }) {
  const W = 640
  const H = 300
  const nodes = lesson.scenes.map((s, si) => {
    /* 绕中心一整圈均匀分布：之前只用了 -150°~0° 那一段，
       节点全挤在左上，还跟中心圆压在一起 */
    const ang = (Math.PI * 2 * si) / Math.max(1, lesson.scenes.length) - Math.PI / 2
    return { s, si, x: W / 2 + Math.cos(ang) * 235, y: H / 2 + Math.sin(ang) * 104 }
  })
  const w = (t) => 30 + t.length * 11
  return (
    <div className="mt-3 min-h-0 flex-1">
      <svg viewBox={`0 0 ${W} ${H}`} data-classroom="map" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {nodes.map(({ x, y, si }) => (
          <path
            key={`l${si}`}
            d={`M${W / 2} ${H / 2} Q ${(W / 2 + x) / 2} ${(H / 2 + y) / 2 - 10} ${x} ${y}`}
            fill="none"
            stroke={si === sceneIdx ? 'rgba(22,119,255,0.7)' : 'rgba(255,255,255,0.12)'}
            strokeWidth={si === sceneIdx ? 1.6 : 1}
          />
        ))}
        <circle cx={W / 2} cy={H / 2} r={54} fill="rgba(22,119,255,0.10)" stroke="rgba(22,119,255,0.45)" />
        <text x={W / 2} y={H / 2 - 4} textAnchor="middle" className="fill-white" style={{ fontSize: 13, fontWeight: 700 }}>
          {lesson.title.length > 9 ? `${lesson.title.slice(0, 9)}…` : lesson.title}
        </text>
        <text x={W / 2} y={H / 2 + 14} textAnchor="middle" className="fill-[#7f8ea8]" style={{ fontSize: 10 }}>
          {lesson.scenes.length} 幕 · {lesson.outline.length} 段
        </text>
        {nodes.map(({ s, si, x, y }) => {
          const on = si === sceneIdx
          const tw = w(s.title)
          return (
            <g key={si} onClick={() => onPick(si)} className="cursor-pointer">
              <rect
                x={x - tw / 2}
                y={y - 13}
                width={tw}
                height={26}
                rx={7}
                fill={on ? 'rgba(22,119,255,0.9)' : 'rgba(255,255,255,0.045)'}
                stroke={on ? 'transparent' : 'rgba(255,255,255,0.12)'}
              />
              <text x={x} y={y + 4} textAnchor="middle" className={on ? 'fill-white' : 'fill-white/75'} style={{ fontSize: 11.5 }}>
                {s.title}
              </text>
              <text x={x} y={y + 24} textAnchor="middle" style={{ fontSize: 9, letterSpacing: '0.12em' }} className="fill-[#5d6b81]">
                {s.type.toUpperCase()}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function ClassroomScreen({ p, i, withIndex }) {
  const Icon = p.icon
  const stageRef = useRef(null)
  const inView = useInView(stageRef, { margin: '120px' })
  /* 投影场景的滚动层：内容（逐条揭示的 bullet + 板书）长高时自动滚到底，
     保证笔记本矮视口（投影区仅 ~177px）下板书不被卡片底边裁掉；能装下时不滚 */
  const sceneBoxRef = useRef(null)

  const [lesson, setLesson] = useState(() => ({ ...pickLesson(classroomTopics[0]), source: 'builtin' }))
  const [topic, setTopic] = useState(classroomTopics[0])
  const [sceneIdx, setSceneIdx] = useState(0)
  const [beat, setBeat] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [voice, setVoice] = useState(false)
  const [view, setView] = useState('stage') // stage | map
  const [tab, setTab] = useState('class') // class 互动课堂 | prep 智能备课系统
  /* 备课台一旦点开就不再卸载（见上面 lazy 那段），所以它的内部 state 一直留着 */
  const [prepSeen, setPrepSeen] = useState(false)
  const [answers, setAnswers] = useState({})
  const [qa, setQa] = useState([])
  const [pending, setPending] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState(0) // 0 待生成 1 大纲 2 场景
  const [status, setStatus] = useState({ online: false, model: '' })

  const scenes = lesson.scenes || []
  const scene = scenes[sceneIdx]
  const ans = answers[sceneIdx]
  const b = beatOf(scene, beat, ans ? ans.at : null)
  const cur = classroomTopics.find((t) => t === lesson.topicKey)

  /* 服务端在不在：只影响徽标与提示措辞 */
  useEffect(() => {
    let dead = false
    aiStatus().then((s) => !dead && setStatus(s))
    return () => {
      dead = true
    }
  }, [])

  /* 走表：拍数只在这一幕还没放完时增加 */
  useEffect(() => {
    if (!playing || !inView || busy || view !== 'stage' || tab !== 'class') return
    const id = setInterval(() => setBeat((v) => v + 1), TICK)
    return () => clearInterval(id)
  }, [playing, inView, busy, view, tab, sceneIdx, scenes.length])

  /* 一幕放完换下一幕，末幕回卷 —— 和录屏一样，不该停在一个黑屏上。
     liveRef 是必需的：useEffect 被推到帧后跑，而这一帧里用户可能刚好点了
     幕间导航 —— 不比对现场，这次陈旧的推进会把点击的目标幕顶掉一幕。 */
  const liveRef = useRef({ si: 0, beat: 0 })
  liveRef.current = { si: sceneIdx, beat }
  useEffect(() => {
    if (view !== 'stage' || busy || !scene) return
    if (beat < b.total) return
    if (liveRef.current.si !== sceneIdx || liveRef.current.beat !== beat) return
    setSceneIdx((cur2) => {
      const next = (cur2 + 1) % scenes.length
      if (next === 0) setAnswers({})
      return next
    })
    setBeat(0)
  }, [beat, b.total, view, busy, scene, scenes.length, sceneIdx])

  /* 语音：真调用浏览器 TTS，关掉或切去备课 tab 就立刻收声 */
  useEffect(() => {
    const sy = typeof window !== 'undefined' ? window.speechSynthesis : null
    if (!sy) return
    if (!voice || tab !== 'class') {
      sy.cancel()
      return
    }
    const text = scene?.type === 'slides' ? scene.speech : scene?.type === 'discussion' ? scene.topic : ''
    if (!text) return
    try {
      sy.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'zh-CN'
      u.rate = 1.05
      sy.speak(u)
    } catch {
      /* 有的环境没有中文语音包，不能因此打断放映 */
    }
    return () => sy.cancel()
  }, [voice, tab, sceneIdx, scene])

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const feed = useMemo(() => {
    const items = [
      /* 开场先留一句话在实录里：不然刚进这一屏时右栏是一片空，
         看不出这块是干什么的 */
      {
        key: 'intro',
        who: 'AI 教师',
        text: `本堂《${lesson.title}》共 ${scenes.length} 幕 —— ${(lesson.outline || []).slice(0, 4).join(' / ')}，可随时打断提问。`,
      },
    ]
    scenes.forEach((s, si) => {
      if (si > sceneIdx) return
      const done = si < sceneIdx
      if (s.type === 'discussion') {
        const upTo = done ? s.turns.length : b.shown
        s.turns.slice(0, upTo).forEach((t, ti) => items.push({ key: `d${si}${ti}`, who: t.who, text: t.text }))
      } else if (s.type === 'slides') {
        if (done || b.typed >= (s.speech || '').length) items.push({ key: `s${si}`, who: 'AI 教师', text: s.speech })
      } else if (done) {
        items.push({ key: `q${si}`, who: 'AI 教师', text: `随堂提问：${s.question}` })
      }
    })
    return items.filter((x) => x.text).concat(qa)
  }, [scenes, sceneIdx, b.shown, b.typed, qa, lesson])

  const feedRef = useRef(null)
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [feed.length])

  /* 投影内容随拍长高时把滚动层带到底（新 bullet / 板书刚出现），装得下则无位移 */
  useEffect(() => {
    const el = sceneBoxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [b.shown, b.board, sceneIdx, view])

  const goto = useCallback((si) => {
    setSceneIdx(si)
    setBeat(0)
    setView('stage')
    setPlaying(true)
  }, [])

  const restart = useCallback(() => {
    setSceneIdx(0)
    setBeat(0)
    setAnswers({})
    setPlaying(true)
  }, [])

  function applyLesson(next) {
    setLesson(next)
    setSceneIdx(0)
    setBeat(0)
    setAnswers({})
    setQa([])
    setView('stage')
    setPlaying(true)
  }

  /* 备课台送来的课件 → 同一个播放器放映（scenes 由 deckToLesson 转） */
  function onSendDeck(deck) {
    applyLesson({ ...deckToLesson(deck), model: deck.model })
    setTab('class')
  }

  /* 两阶段流水线：先大纲、再装配场景。在线时这两步真发生在服务端的一次调用里，
     这里只是把阶段显出来，不假装进度 —— 结束前一直转圈。 */
  async function onGenerate(nextTopic) {
    const t = String(nextTopic || topic).trim()
    if (!t || busy) return
    setTopic(t)
    setBusy(true)
    setPhase(1)
    const p1 = sleep(600)
    const r = await generateLesson(t)
    await p1
    setPhase(2)
    await sleep(480)
    applyLesson(r)
    setBusy(false)
    setPhase(0)
    setStatus((s) => (r.source === 'qwen' ? { ...s, online: true } : s))
  }

  async function onAsk(e) {
    e.preventDefault()
    const q = draft.trim()
    if (!q || pending) return
    setDraft('')
    setPending(true)
    setQa((v) => v.concat({ key: `u${Date.now()}`, who: '你', text: q }))
    const history = qa.reduce((acc, m) => {
      const role = m.who === '你' ? 'user' : 'assistant'
      return acc.concat({ role, content: m.text })
    }, [])
    const r = await ask(q, { history, lesson })
    setQa((v) =>
      v.concat({
        key: `a${Date.now()}`,
        who: 'AI 教师',
        text: r.text || '（没有拿到回答）',
        off: r.source !== 'qwen',
      }),
    )
    setPending(false)
  }

  /* 导出教案：把当前这堂课落成一个自包含的 HTML，真能拿去备课 */
  function onExport() {
    const rows = scenes
      .map((s, si) => {
        if (s.type === 'quiz')
          return `<h3>${si + 1}. 随堂提问</h3><p>${s.question}</p><ol>${s.options
            .map((o, oi) => `<li${oi === s.answer ? ' style="font-weight:700"' : ''}>${o}</li>`)
            .join('')}</ol><p class="x">答案：${String.fromCharCode(65 + s.answer)} · ${s.explain || ''}</p>`
        if (s.type === 'discussion')
          return `<h3>${si + 1}. ${s.title}</h3><p>${s.topic}</p><ul>${s.turns
            .map((t) => `<li><b>${t.who}</b>：${t.text}</li>`)
            .join('')}</ul>`
        return `<h3>${si + 1}. ${s.title}</h3><ul>${(s.bullets || []).map((x) => `<li>${x}</li>`).join('')}</ul>${
          s.board ? `<p class="b">${s.board.text}</p>` : ''
        }<p class="x">口播：${s.speech || ''}</p>`
      })
      .join('\n')
    const html = `<!doctype html><meta charset="utf-8"><title>${lesson.title}</title>
<style>body{max-width:820px;margin:48px auto;padding:0 20px;font:15px/1.8 system-ui,-apple-system,"Microsoft YaHei",sans-serif;color:#111}
h1{font-size:24px;margin-bottom:4px}h3{margin:26px 0 6px;font-size:16px}p.x{color:#555;font-size:13px}p.b{font-family:ui-monospace,monospace;background:#f5f7fa;padding:8px 10px;border-left:3px solid #1677ff}
ul,ol{padding-left:20px}.meta{color:#777;font-size:12.5px}</style>
<h1>${lesson.title}</h1><p class="meta">${lesson.subtitle || ''}<br>来源：${lesson.source === 'qwen' ? `Qwen(${lesson.model || '未知模型'}) 实时生成` : '离线演示 · 内置教案'} · 天择教育 AI 课堂</p>
<p class="meta">大纲：${(lesson.outline || []).join(' / ')}</p><hr>${rows}`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${lesson.title}-课堂脚本.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const online = status.online || lesson.source === 'qwen'
  const btn = 'grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-brand/60 hover:bg-brand/20 hover:text-white'

  return (
    <div className="relative flex h-full flex-col justify-center">
      <span className="pointer-events-none absolute -top-4 right-0 select-none text-[110px] font-bold leading-none text-white/[0.045] xl:text-[150px]">
        {pad(i)}
      </span>

      <div ref={stageRef} data-classroom="screen" className="relative flex min-h-0 flex-1 flex-col">
        {/* 标题带 */}
        <div className="shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-glow">
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-brand-400">{p.en}</p>
            {withIndex && (
              <p className="text-[12.5px] tabular-nums text-ink-400">
                {pad(i)} / {pad(LAST)}
              </p>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
              <span className={`relative flex h-1.5 w-1.5 ${online ? '' : 'opacity-60'}`}>
                {online && <span className="absolute inline-flex h-full w-full animate-pingslow rounded-full bg-emerald-400" />}
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-ink-500'}`} />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">
                {busy ? 'GENERATING…' : online ? `QWEN · ${status.model || lesson.model || 'ONLINE'}` : '离线演示 · 内置教案'}
              </span>
            </span>
          </div>
          <h3 className="mt-2.5 text-[22px] font-bold tracking-tight text-white md:text-[27px] xl:text-[32px]">{p.title}</h3>
          <p className="mt-1 text-[13.5px] font-medium text-brand-300 xl:text-[15px]">{p.tagline}</p>
          <p className="mt-1.5 line-clamp-2 max-w-3xl text-[13px] leading-[1.7] text-ink-400 [@media(max-height:860px)]:line-clamp-1" title={p.desc}>
            {p.desc}
          </p>

          {/* 两个 tab：互动课堂 / 智能备课系统（备完课直接送进来放映） */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {[
              { id: 'class', label: '互动课堂', icon: Presentation },
              { id: 'prep', label: '智能备课系统', icon: FileText },
            ].map((t) => {
              const on = tab === t.id
              const Ic = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  data-classroom="tab"
                  onClick={() => {
                    setTab(t.id)
                    if (t.id === 'prep') setPrepSeen(true)
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-medium transition-colors ${
                    on ? 'border-brand/55 bg-brand/15 text-white' : 'border-white/[0.08] text-ink-400 hover:border-white/25 hover:text-white/85'
                  }`}
                >
                  <Ic className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              )
            })}
            <p className="ml-1 hidden truncate text-[12.5px] text-ink-500 lg:block">
              {tab === 'class' ? 'AI 教师与同学同堂放映，可随时打断提问' : '贴一段课程内容，换回一份带讲稿的讲课 PPT'}
            </p>
          </div>
        </div>

        {/* 主体：两个 tab 都留在 DOM 里（切回来不丢刚生成的课件），只换显示
            lg:grid-rows-[minmax(0,1fr)] 不能省：grid 行默认 auto，右列那三块面板会按内容长高，
            整行溢出到下面的能力标签与指标条上（字一放大就叠在一起，而屏底还没越界，量裁切量不到） */}
        <div className={`${tab === 'class' ? 'grid' : 'hidden'} mt-3 min-h-0 flex-1 gap-3.5 lg:grid-cols-[1.12fr_0.88fr] lg:grid-rows-[minmax(0,1fr)]`}>
          {/* ―― 投影 ―― */}
          <div className="relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#060a11] px-4 pb-3 pt-2.5 lg:min-h-[190px] xl:min-h-[225px] 2xl:min-h-[280px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_24%_0%,rgba(22,119,255,0.10),transparent_70%)]" />
            {/* 放映顶栏 */}
            <div className="relative flex shrink-0 items-center gap-2">
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-brand/70" />
              </span>
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/85">
                {lesson.title}
                <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-300">{scene?.title || ''}</span>
              </p>
              <button type="button" onClick={() => setView(view === 'stage' ? 'map' : 'stage')} title="切换投影/课堂图谱" className={btn}>
                {view === 'stage' ? <ListTree className="h-3 w-3" /> : <Presentation className="h-3 w-3" />}
              </button>
              <button type="button" onClick={onExport} title="导出本堂课脚本" className={btn}>
                <Download className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setVoice((v) => !v)}
                title={voice ? '关闭教师语音' : '开启教师语音（浏览器 TTS）'}
                className={`${btn} ${voice ? '!border-brand/60 !bg-brand/20 !text-white' : ''}`}
              >
                {voice ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              </button>
              <button type="button" onClick={restart} title="回到第一幕" className={btn}>
                <RotateCcw className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => setPlaying((v) => !v)} title={playing ? '暂停放映' : '继续放映'} className={btn}>
                {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
            </div>
            <div className="relative mt-1 flex shrink-0 items-baseline justify-between gap-3 border-b border-white/[0.06] pb-1.5">
              <p className="line-clamp-1 min-w-0 flex-1 text-[12.5px] text-ink-400">{lesson.subtitle}</p>
              <span className="shrink-0 font-mono text-[11px] tabular-nums tracking-[0.12em] text-ink-500">
                SCENE {pad(sceneIdx)} / {pad(scenes.length - 1)}
              </span>
            </div>

            {view === 'map' ? (
              <MindMap lesson={lesson} sceneIdx={sceneIdx} onPick={goto} />
            ) : (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${topic}-${sceneIdx}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    ref={sceneBoxRef}
                    className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pr-1"
                    data-lenis-prevent
                  >
                    <Scene
                      scene={scene}
                      b={b}
                      answer={ans && ans.oi}
                      onAnswer={(oi) => setAnswers((v) => ({ ...v, [sceneIdx]: { oi, at: beat } }))}
                    />
                  </motion.div>
                </AnimatePresence>
                {/* 口播：逐字打出的教师讲稿 */}
                <div className="relative mt-2 shrink-0 border-t border-white/[0.06] pt-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-300">
                    {scene?.type === 'quiz' ? 'AI 教师 · 等待作答' : scene?.type === 'discussion' ? 'AI 教师 · 组织讨论' : 'AI 教师 · 口播'}
                  </p>
                  <p className="mt-0.5 line-clamp-2 min-h-[2.9em] text-[13px] leading-[1.6] text-white/70">
                    {scene?.type === 'slides'
                      ? `${(scene.speech || '').slice(0, b.typed)}${b.typed < (scene.speech || '').length ? '▍' : ''}`
                      : scene?.type === 'quiz'
                        ? scene.explain
                          ? `答题要点：${scene.explain}`
                          : ''
                        : '多名 AI 智能体同堂：追问、举反例、当堂判分，你也可以随时打断提问。'}
                  </p>
                </div>
              </>
            )}

            {/* 幕间导航（即大纲） */}
            <div className="relative mt-2 flex shrink-0 items-stretch gap-1.5">
              {scenes.map((s, si) => (
                <button
                  key={si}
                  type="button"
                  onClick={() => goto(si)}
                  title={s.title}
                  className={`min-w-0 flex-1 truncate rounded-sm px-1.5 py-1 text-left font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                    si === sceneIdx && view === 'stage' ? 'bg-brand text-white' : si < sceneIdx ? 'text-brand-300 hover:bg-white/[0.08]' : 'text-ink-400 hover:bg-white/[0.08] hover:text-white/85'
                  }`}
                >
                  {pad(si)} {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* ―― 控制台：生成 + 智能体 + 消息流 ――
              右列只给一条滚动层，而且只包「生成流水线 + 花名册」：
              1280×800 下右列 360px，三块面板加输入框的固有高 406px，不滚就顶穿到下面的能力标签上
              （叠在兄弟上、没超出屏底，量裁切量不到）。实录与 ASK 输入框留在滚动层外：
              一个是这一屏在“活着”的证据，一个是交互入口，滚走就本末倒置 */}
          <div className="flex min-h-0 flex-col gap-2.5">
            <div data-lenis-prevent className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
            <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
              <p className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-brand-400">课堂生成流水线 · 两阶段</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {classroomTopics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => applyLesson(pickLesson(t))}
                    className={`rounded-full border px-2.5 py-1 text-[12.5px] transition-colors ${
                      cur === t ? 'border-brand/50 bg-brand/15 text-white' : 'border-white/[0.08] text-ink-400 hover:border-white/25 hover:text-white/85'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <form
                className="mt-2 flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault()
                  onGenerate()
                }}
              >
                <input
                  value={topic}
                  onChange={(ev) => setTopic(ev.target.value)}
                  placeholder="输入任意主题，如「傅里叶变换的直觉」"
                  className="min-w-0 flex-1 rounded-lg border border-white/[0.09] bg-[#060a11] px-2.5 py-1.5 text-[13px] text-white outline-none transition-colors placeholder:text-ink-500 focus:border-brand/60"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                  {busy ? '生成中' : '生成这堂课'}
                </button>
              </form>
              {/* 阶段进度：请求真在跑的时候才有这行，结束后自动收起 */}
              <div className={`grid transition-all duration-300 ${busy ? 'mt-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    {['生成教学大纲', '装配课堂场景'].map((label, si) => (
                      <span key={label} className="flex items-center gap-1.5 text-[12.5px]">
                        <span className={`h-1.5 w-1.5 rounded-full ${phase > si ? 'bg-brand' : 'bg-white/15'}`} />
                        <span className={phase > si ? 'text-white/85' : 'text-ink-500'}>{label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-brand" style={{ width: phase >= 2 ? '82%' : '46%', transition: 'width .5s' }} />
                  </div>
                </div>
              </div>
              {lesson.source !== 'qwen' && !busy && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
                  当前为内置教案演示{lesson.reason ? `（${lesson.reason}）` : ''}。服务端 .env 配好 QWEN_API_KEY 后，这里换成模型实时生成的课堂。
                </p>
              )}
            </div>

            {/* 智能体花名册 */}
            <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
              <p className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-brand-400">同堂智能体</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 [@media(max-height:820px)]:grid-cols-4 [@media(max-height:820px)]:gap-y-1">
                {classroomAgents.map((a) => (
                  <li key={a.id} className="flex min-w-0 items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                    <span className={`truncate text-[12.5px] ${a.color}`}>{a.name}</span>
                    {/* 768 高的笔记本上这一栏只给一行高：角色描述不如名字重要 */}
                    <span className="hidden truncate text-[12px] text-ink-500 [@media(min-height:820px)]:inline">{a.role}</span>
                  </li>
                ))}
              </ul>
            </div>
            </div>{/* 整列滚动层到此：只包「生成流水线 + 花名册」这两块 ——
                    1280×800 下右列只有 360px，而三块面板的固有高是 406px。
                    让不常用的生成区去滚，实录与输入框固定可见（否则 feed 被压到 19px，
                    文字半行被裁，看着就是两行叠在一起） */}

            {/* 消息流：高度随视口伸缩（~140–200px，不再固定 92px），能多看几条实录。
                让位的是上方会滚的生成区，不牺牲 ASK 常驻。标题是独立不滚的头部，
                消息在下面的滚动层里，新消息进来自动滚到底 */}
            <div className="flex h-[clamp(140px,18vh,200px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <p className="shrink-0 px-3.5 pb-1 pt-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">
                课堂实录 · LIVE
              </p>
              <div ref={feedRef} data-lenis-prevent className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3.5 pb-2.5">
                {feed.map((m) => {
                  const a = agentOf(m.who)
                  return (
                    <div key={m.key} className="flex items-start gap-2">
                      <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                      <p className="min-w-0 flex-1 text-[12.5px] leading-[1.6]">
                        <span className={`mr-1.5 font-medium ${a.color}`}>{m.who}</span>
                        <span className="text-white/70">{m.text}</span>
                        {m.off && <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-500">离线演示</span>}
                      </p>
                    </div>
                  )
                })}
                {pending && <p className="text-[12.5px] text-ink-400">AI 教师正在作答…</p>}
              </div>
            </div>

            {/* 提问 */}
            <form
              onSubmit={onAsk}
              data-classroom="ask"
              className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2"
            >
              <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.16em] text-brand-300">ASK</span>
              <input
                value={draft}
                onChange={(ev) => setDraft(ev.target.value)}
                placeholder="打断一下，问个具体问题…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-ink-500"
              />
              <button type="submit" disabled={pending || !draft.trim()} aria-label="发送提问" className="shrink-0 text-brand-200 transition-colors hover:text-white disabled:text-ink-500">
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* ―― 第二个 tab：智能备课系统（OpenMAIC 首页那一步）―― */}
        {prepSeen && (
          <Suspense
            fallback={
              <div className="mt-3 grid min-h-[300px] flex-1 place-items-center rounded-2xl border border-white/[0.09] bg-[#060a11] lg:min-h-[190px] xl:min-h-[225px]">
                <p className="text-[12.5px] text-ink-500">备课台加载中…</p>
              </div>
            }
          >
            <ClassroomPrep active={tab === 'prep'} online={status.online} model={status.model} onSendToClass={onSendDeck} />
          </Suspense>
        )}

        {/* 底部：能力标签 + 指标 + 咨询 */}
        <div className="mt-3 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-2.5">
          <ul className="flex flex-wrap gap-2">
            {p.bullets.map((bl) => (
              <li key={bl} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-white/75">
                {bl}
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
                requestProductContact({ name: p.title, intent: p.intent, source: `classroom-${p.id}`, cta: '预约课堂演示' })
              }}
              className="group inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2 text-[13px] font-medium text-brand-200 transition-colors hover:bg-brand hover:text-white"
            >
              预约课堂演示
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
