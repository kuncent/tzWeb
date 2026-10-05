import { heroScenes } from '../../../data/heroScenes'
import { beatNow, speakerNow } from './buildBus'

/* ============================================================
 * AI 屏空中那五块智能体界面 —— 板面是 DOM，不是 canvas 纹理
 * ------------------------------------------------------------
 * 为什么走这条路：上一版五位是用原语几何拼的小人偶（球头 + 倒锥座 + 一圈环），
 * 用户说"太像玩具"。要的不是更精细的偶，而是把每个智能体画成它自己那个产品的
 * 界面 —— 一个真在跑的东西，屏幕上就该长得像个在跑的东西。
 *
 * 而界面要高清，只有一条路（链屏那六块玻璃牌已经验过，见 ChainPanels）：
 * 字过 canvas 纹理要吃三道折损 —— 先烤进纹理、再按 dpr 0.8 贴出来、最后被 Bloom
 * 那 1.8 的阈值糊一层。drei 的 <Html transform> 把真 DOM 按相机透视摆进场景，
 * 三道都不吃：浏览器按设备像素排一次版，1px 的线就是 1px 的线，
 * 颜色也不受泛光与 AGX 影响（这一条很关键：上一版五位为了在泛光里保住色相
 * 不得不压亮度，DOM 完全没这个约束，五支色可以按业务语义直接给足）。
 *
 * 五块界面 = 五件事，版式天生不同（同款卡片换字就是"玩具"的另一种写法）：
 *   主讲   AI 课堂：课件缩略列 + 三段对话流 + 课堂节奏条
 *   追问者 推理链 harness：think / tool / rank / branch 四步 trace 带耗时
 *   反例者 命题校验：claim 逐条判定 + 一条不成立的结论
 *   主持人 圆桌调度：五位发言队列 + 用时预算条 + ROUND 计数
 *   观察员 学情采集：掌握漏斗 + 参与度走势 + 一条卡点告警
 * 共同的是外壳那套窗口语汇（切角、顶膜、标题栏三枚窗控点、底部状态行）——
 * 一家人穿同款制服，各干各的活。
 *
 * 版式的硬约束：一块卫星面板在屏幕上只有 185×120 上下。塞进去的东西越多，
 * 每件东西越小，糊与挤是同一个病因的两种症状。所以每块的规矩是：
 * 一个主视图 + 四行以内的读数 + 一行状态，其余不做。
 *
 * 换算：world = cssPx × ADF / 400。改 ADF 必须同步改面板尺寸，
 * 否则 NeuralRig 那几块链路端点（按面板边线接）就对不上牌边。
 * ============================================================ */

const SCENE = heroScenes[2]

export const ADF = 2.2
/* ―― 板面尺寸：CSS 像素。这两个数与 ADF 是一对，改一个必须改另一个 ――
   换算 world = css × ADF / 400，屏幕上又还原成 css × 6.449 / d ——
   NeuralRig 那十条链路的端点是按牌边线接的，牌一大就接在牌里、一小就飘在外面。
   306×190 / 196×116 是 tmp/ai-seat.cjs 反解出来的：主讲那块最近（d 6.1）在屏幕上
   是 322×200，四块卫星 173~207 宽 —— 再大一点就要压上描述那行字或者钻到看板底下 */
export const HERO = { w: 306, h: 190 }
export const SAT = { w: 196, h: 116 }
export const isHero = (i) => i === 0
export const panelCss = (i) => (isHero(i) ? HERO : SAT)
/** 面板的世界尺寸（米）：链路的端点要接在牌边上，靠的就是这两个数 */
export const panelWorld = (i) => {
  const s = panelCss(i)
  return { w: (s.w * ADF) / 400, h: (s.h * ADF) / 400 }
}

/* ―― 五支通道色 ――
   这五支现在是 DOM 里的颜色，不再过泛光：上一版为了在 Bloom 阈值下保住饱和度，
   不得不把亮度乘数压到 1.3~2.6 那一档；DOM 没有这件事，色可以直接按业务语义给。
   反例者那支是珊瑚红 —— 在一个紫色场景里放一支暖红本来是要慎用的，但它的语义
   就是"证伪 / 不成立"，产品界面里的判负色没有比这更好读的写法 */
export const HUES = ['#B9A2FF', '#7EE0FF', '#FF8A7A', '#FFD08A', '#7BE8B6']

export const APPS = [
  { app: 'AI 课堂', en: 'CLASSROOM', sub: '主讲教师 · 实时授课' },
  { app: '追问引擎', en: 'TRACE', sub: '举一反三 · 推理链' },
  { app: '反例检验', en: 'VERIFIER', sub: '挑毛病 · 命题证伪' },
  { app: '圆桌调度', en: 'ORCHESTRATOR', sub: '组织辩论 · 发言队列' },
  { app: '学情采集', en: 'LEARNER MODEL', sub: '记录学情 · 24 维' },
]

const MODE_TAG = { prep: '备课生成', class: '课堂交互', insight: '学情回流', hub: '资源沉淀' }

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace'
const SANS = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

/* 确定性伪随机：与链屏同一句。切屏重挂会重跑一遍渲染，用 Math.random 的版
   每次回来都是一副新面孔，看着像数据在跳，其实只是组件在重挂 */
const jit = (i, k = 1) => ((((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1)
const pad = (n) => String(n).padStart(2, '0')
const mmss = (sec) => `${pad(Math.floor(sec / 60))}:${pad(Math.floor(sec % 60))}`

/* ---------- 原子 ---------- */

const cut = (px = 12) => `polygon(0 0, calc(100% - ${px}px) 0, 100% ${px}px, 100% 100%, 0 100%)`

function Mono({ v, s = 9, c = 'rgba(255,255,255,0.62)', dim, right, ell = true }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: s,
        lineHeight: 1.25,
        color: c,
        fontVariantNumeric: 'tabular-nums',
        opacity: dim ? 0.5 : 1,
        marginLeft: right ? 'auto' : undefined,
        whiteSpace: 'nowrap',
        overflow: ell ? 'hidden' : undefined,
        textOverflow: ell ? 'ellipsis' : undefined,
      }}
    >
      {v}
    </span>
  )
}

/** 一行的进度条：用时预算、生成进度都靠它。宽度走 transition，
 *  所以一拍一跳读作"仪表在更新"，而不是"有东西在抽搐" */
function Bar({ v, c, h = 3, glow }) {
  return (
    <span style={{ flex: 1, minWidth: 0, height: h, borderRadius: h, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', display: 'block' }}>
      <span
        style={{
          display: 'block',
          height: '100%',
          width: `${Math.max(2, Math.min(100, v * 100))}%`,
          background: c,
          borderRadius: h,
          boxShadow: glow ? `0 0 6px ${c}` : 'none',
          transition: `width .6s ${EASE}`,
        }}
      />
    </span>
  )
}

/** 一枚斜角小标签：与链屏那块的 status chip 同一族 */
function Chip({ t, c, solid }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 7.5,
        letterSpacing: 0.6,
        padding: '1px 4px',
        clipPath: cut(4),
        whiteSpace: 'nowrap',
        color: solid ? '#050910' : c,
        background: solid ? c : `${c}24`,
        transition: `background .38s ${EASE}, color .38s ${EASE}`,
      }}
    >
      {t}
    </span>
  )
}

/** 发言队列里那一枚状态灯。live 的那一位才带光晕 —— 一屏上只能有一处发光 */
function Led({ c, live }) {
  return (
    <span
      style={{
        width: 4,
        height: 4,
        borderRadius: 4,
        flexShrink: 0,
        background: live ? c : 'rgba(255,255,255,0.2)',
        boxShadow: live ? `0 0 7px ${c}` : 'none',
        transition: `background .4s ${EASE}, box-shadow .4s ${EASE}`,
      }}
    />
  )
}

/* ―― 一句话的秒数：由墙上时钟那一拍推出来，DOM 看板与这块面板算的是同一个数 ―― */

/* ============================================================
 * 五块板心
 * ============================================================ */

/** 0 主讲 · AI 课堂：左课件列 + 右三段对话流 + 底下一条课堂节奏条 */
function Classroom({ hue, b, sp, line }) {
  const slides = [
    ['01', '注意力机制'],
    ['02', 'Q / K / V'],
    ['03', 'softmax 缩放'],
  ]
  const cur = b % 3
  const students = ['为什么一定要除以 √dk？', '这一步和注意力稀疏有关吗？', '我可以先手写一个 mask 吗？']
  const phases = [
    ['讲授', 744],
    ['追问', 201],
    ['辩论', 160],
    ['随练', 300],
  ]
  const onPhase = sp === 0 ? 0 : sp === 1 ? 1 : sp === 3 ? 2 : 3
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 7 }}>
        {/* 课件列：三张缩略，当前那张描边 —— 一块真的在放的东西 */}
        <div style={{ width: 92, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Mono v="课件" s={7.5} c="rgba(255,255,255,0.34)" />
            <Mono v={`${cur + 1}/${slides.length * 2 + 2}`} s={7.5} c={`${hue}cc`} />
          </div>
          {slides.map(([no, title], i) => (
            <div
              key={no}
              style={{
                position: 'relative',
                flex: 1,
                minHeight: 0,
                padding: '3px 4px',
                borderRadius: 3,
                overflow: 'hidden',
                border: `1px solid ${i === cur ? `${hue}88` : 'rgba(255,255,255,0.08)'}`,
                background: i === cur ? `linear-gradient(150deg,${hue}2e,rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.03)',
                boxShadow: i === cur ? `0 0 10px ${hue}2e` : 'none',
                transition: `border-color .5s ${EASE}, background .5s ${EASE}`,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: 0.5, color: i === cur ? hue : 'rgba(255,255,255,0.28)' }}>{no}</span>
              <div style={{ fontFamily: SANS, fontSize: 9, color: i === cur ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.42)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
              {i === cur && <span style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: `${28 + (b % 5) * 15}%`, background: hue, boxShadow: `0 0 6px ${hue}`, transition: `width .6s ${EASE}` }} />}
            </div>
          ))}
        </div>

        {/* 对话流：教师 → 同学 → 追问者。发言者那一行点亮，
            于是这块屏与空中另外四块面板指的是同一个人 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { who: 'AI 教师', text: line, hue, live: sp === 0 },
            { who: '同学 · 林', text: students[b % students.length], hue: '#ffffff', live: false },
            { who: '追问者', text: SCENE.agentLines[1][b % 3], hue: HUES[1], live: sp === 1 },
          ].map((m, i) => (
            <div
              key={i}
              style={{
                padding: '4px 6px',
                borderRadius: 3,
                borderLeft: `2px solid ${m.live ? m.hue : 'rgba(255,255,255,0.12)'}`,
                background: m.live ? `${m.hue}1b` : 'rgba(255,255,255,0.028)',
                boxShadow: m.live ? `inset 0 0 14px ${m.hue}14` : 'none',
                transition: `background .45s ${EASE}, border-color .45s ${EASE}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Mono v={m.who} s={7} c={m.live ? m.hue : 'rgba(255,255,255,0.34)'} />
                {m.live && <Led c={m.hue} live />}
              </div>
              <div style={{ fontFamily: SANS, fontSize: 10.5, lineHeight: 1.42, color: m.live ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.text}</div>
            </div>
          ))}
          {/* 输入行：一块课堂界面没有输入框就不是课堂界面 */}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ flex: 1, minWidth: 0, height: 17, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', padding: '0 7px', fontFamily: SANS, fontSize: 8.5, color: 'rgba(255,255,255,0.26)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              接着这个问题往下问…
            </span>
            <span style={{ width: 17, height: 17, borderRadius: 3, flexShrink: 0, background: `${hue}d9`, display: 'grid', placeItems: 'center', color: '#0a0714', fontFamily: MONO, fontSize: 9, fontWeight: 700 }}>↑</span>
          </div>
        </div>
      </div>

      {/* 课堂节奏：四段用时。当前那段点亮，其余是灰的一格一格 */}
      <div style={{ display: 'flex', gap: 3, height: 15, flexShrink: 0 }}>
        {phases.map(([t, sec], i) => (
          <span
            key={t}
            style={{
              flex: i === onPhase ? 1.5 : 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '0 4px',
              borderRadius: 2,
              overflow: 'hidden',
              background: i === onPhase ? `${hue}24` : 'rgba(255,255,255,0.035)',
              border: `1px solid ${i === onPhase ? `${hue}59` : 'rgba(255,255,255,0.05)'}`,
              transition: `flex .5s ${EASE}, background .5s ${EASE}`,
            }}
          >
            <span style={{ fontFamily: SANS, fontSize: 8, color: i === onPhase ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.34)', whiteSpace: 'nowrap' }}>{t}</span>
            <Mono v={mmss(sec + (i === onPhase ? b : 0))} s={7} c={i === onPhase ? hue : 'rgba(255,255,255,0.24)'} right />
          </span>
        ))}
      </div>
    </div>
  )
}

/** 1 追问者 · 推理链 harness：think / tool / rank / branch 四步，带耗时与岔口 */
function Trace({ hue, b, live }) {
  const steps = [
    ['think', '展开三种追问', 12],
    ['tool', 'knowledge_base.search', 48],
    ['rank', '按薄弱点排序 12 条', 9],
    ['branch', '生成 3 个岔口', 6],
  ]
  const run = b % steps.length
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {steps.map(([kind, label, ms], i) => {
        const on = live && i === run
        const done = i < run
        return (
          <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <span style={{ width: 26, flexShrink: 0, fontFamily: MONO, fontSize: 6.5, letterSpacing: 0.3, color: on ? hue : done ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.2)' }}>{kind}</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 8.5, color: on ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.52)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
            {on ? (
              <span style={{ width: 30, flexShrink: 0 }}>
                <Bar v={0.25 + (b % 4) * 0.2} c={hue} h={3} glow />
              </span>
            ) : (
              <Mono v={`${ms}ms`} s={7} c="rgba(255,255,255,0.26)" />
            )}
          </div>
        )
      })}
      {/* 岔口：三枚叶子标签，这是"举一反三"唯一能被读出来的形状 */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 3 }}>
        {['长序列', '跨模态', '并行性'].map((t, i) => (
          <span key={t} style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '2px 0', borderRadius: 2, fontFamily: SANS, fontSize: 7.5, whiteSpace: 'nowrap', overflow: 'hidden', color: (b + i) % 4 === 0 ? hue : 'rgba(255,255,255,0.4)', border: `1px solid ${(b + i) % 4 === 0 ? `${hue}66` : 'rgba(255,255,255,0.08)'}`, background: (b + i) % 4 === 0 ? `${hue}1a` : 'transparent', transition: `all .5s ${EASE}` }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

/** 2 反例者 · 命题校验：claim 逐条判定 + 一条不成立的结论 */
function Verifier({ hue, b, live }) {
  const rows = [
    ['✓', 'softmax 逐行单调', 'ok'],
    ['✗', '自回归可以并行', 'bad'],
    ['✗', 'padding 不污染统计', 'bad'],
    ['?', '位置编码可外推', 'ask'],
  ]
  const col = { ok: '#7BE8B6', bad: hue, ask: '#FFD08A' }
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {rows.map(([mark, text, k], i) => (
        <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ width: 9, flexShrink: 0, textAlign: 'center', fontFamily: MONO, fontSize: 9, color: col[k], textShadow: k !== 'ok' && live ? `0 0 7px ${col[k]}` : 'none' }}>{mark}</span>
          <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 9, color: k === 'ok' ? 'rgba(255,255,255,0.46)' : 'rgba(255,255,255,0.86)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: k === 'bad' ? 'line-through rgba(255,255,255,0.2)' : 'none' }}>{text}</span>
          <Mono v={`#${pad(i + 1)}`} s={6.5} c="rgba(255,255,255,0.18)" />
        </div>
      ))}
      <div
        style={{
          marginTop: 'auto',
          padding: '3px 5px',
          borderRadius: 2,
          border: `1px solid ${hue}59`,
          background: `${hue}17`,
          fontFamily: SANS,
          fontSize: 8.5,
          lineHeight: 1.4,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          opacity: live ? 1 : 0.5,
          transition: `opacity .45s ${EASE}`,
        }}
      >
        <span style={{ color: hue, fontFamily: MONO, fontSize: 7, letterSpacing: 0.5, marginRight: 4 }}>VERDICT</span>
        不成立 · 缺 mask 时因果性被破坏
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Mono v={`通过 ${11 + (b % 3)}`} s={7} c="rgba(255,255,255,0.3)" />
        <Mono v={`存疑 ${2 + (b % 2)}`} s={7} c="#FFD08Ac0" />
        <Mono v={`反驳 ${1 + (b % 4)}`} s={7} c={`${hue}dd`} right />
      </div>
    </div>
  )
}

/** 3 主持人 · 圆桌调度：五位的发言队列与用时预算 */
function RoundTable({ hue, b, sp }) {
  const short = ['主讲', '追问', '反例', '主持', '观察']
  const order = short.map((_, i) => (i - sp + 5) % 5)
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {short.map((nm, i) => {
        const rank = order[i]
        const speaking = rank === 0
        const done = rank > 0 && rank < 3
        const c = HUES[i]
        return (
          <div key={nm} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <Led c={c} live={speaking} />
            <span style={{ width: 26, flexShrink: 0, fontFamily: SANS, fontSize: 8.5, color: speaking ? '#fff' : 'rgba(255,255,255,0.45)' }}>{nm}</span>
            <Bar v={speaking ? 0.4 + (b % 5) * 0.13 : done ? 1 : 0.05} c={speaking ? c : done ? `${c}66` : 'rgba(255,255,255,0.16)'} h={2.5} glow={speaking} />
            <Mono v={speaking ? 'SPEAK' : done ? 'DONE' : 'QUEUE'} s={6.5} c={speaking ? c : 'rgba(255,255,255,0.22)'} />
          </div>
        )
      })}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Mono v={`ROUND ${(b % 4) + 1}/4`} s={7.5} c={`${hue}dd`} />
        <Mono v={`下一位 · ${SCENE.agents[((sp + 1) % 5)].split('·')[0].trim()}`} s={7.5} c="rgba(255,255,255,0.4)" right />
      </div>
    </div>
  )
}

/** 4 观察员 · 学情采集：掌握漏斗 + 参与度走势 + 一条卡点告警 */
function LearnerModel({ hue, b, live }) {
  const spark = Array.from({ length: 14 }, (_, i) => 0.32 + jit(i, 3) * 0.5 + Math.sin(b * 0.5 + i * 0.5) * 0.12)
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {SCENE.funnel.stages.map(([label, v], i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ width: 24, flexShrink: 0, fontFamily: SANS, fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
          <Bar v={(v / 100) * (live ? 1 : 0.94)} c={i === 3 ? hue : `${hue}${i === 2 ? 'cc' : '7a'}`} h={3} glow={i === 3 && live} />
          <Mono v={`${v}`} s={8} c={i === 3 ? hue : 'rgba(255,255,255,0.5)'} />
        </div>
      ))}
      {/* 参与度走势：柱高吃时间序，不吃排序序（走势一排成楼梯就是假数据） */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 22, minHeight: 0 }}>
        {spark.map((v, i) => (
          <span key={i} style={{ flex: 1, minWidth: 0, height: `${Math.min(100, Math.max(8, v * 100))}%`, background: i === spark.length - 1 ? hue : `${hue}55`, borderRadius: 1, transition: `height .55s ${EASE}` }} />
        ))}
      </div>
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          minWidth: 0,
          padding: '3px 5px',
          borderRadius: 2,
          background: live ? '#FF8A7A1f' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${live ? '#FF8A7A59' : 'rgba(255,255,255,0.06)'}`,
          transition: `all .45s ${EASE}`,
        }}
      >
        <Led c="#FF8A7A" live={live} />
        <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontSize: 8.5, color: live ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {3 + (b % 3)} 人卡在「缩放因子」
        </span>
        <Mono v="24 维" s={6.5} c="rgba(255,255,255,0.26)" />
      </div>
    </div>
  )
}

const BODY = [Classroom, Trace, Verifier, RoundTable, LearnerModel]

/* ============================================================
 * 公共外壳：一块飘在场景里的应用窗口
 * ------------------------------------------------------------
 * 与链屏那六块牌是同一家族（切角、顶膜、细网格、等宽读数、下缘反上来的次色，
 * 以及那块从近侧棱溢出来的背板 —— 零厚度的 DOM 平面贴在哪都像贴纸，链屏那边
 * 已经拿背板治过这个病，这边不能例外），但这里多了一条窗口才有的东西：
 * 标题栏左边那三枚窗控点 —— 没有它们，一块牌读作"一块仪表盘"；
 * 有了它们，才读作"一个在跑的程序"。
 * 不做 backdrop-filter：这块牌叠在一块逐帧变的 canvas 上，任何背景模糊都得
 * 浏览器每帧重算一遍高斯，本站实测过那就是把整屏拖到 6fps 的头号成因。
 * ============================================================ */
/* 板厚（CSS px）：与 ChainPanels 那个 THK 同一个值 —— 两块牌在同一个机房里，
   不可能是两种厚度 */
const THK = 26

export default function AgentPanel({ index, mode, beat, live, hot, yaw = 0, pitch = 0 }) {
  const hue = HUES[index]
  const { app, en, sub } = APPS[index]
  const { w, h } = panelCss(index)
  const Body = BODY[index]
  const line = SCENE.agentLines[index][beat % 3]
  const sp = speakerNow(SCENE.agents.length)
  /* 板厚与溢出量：与 ChainPanels 那层同一个算法（溢出 = t·sin(转角)，t=26px ≈ 10cm）。
     量在 data-plate 那层之外，所以 tmp/ai-flow.mjs 量到的牌 rect 不跟着长 */
  const tx = -Math.sin(yaw) * THK
  const ty = -Math.sin(pitch) * THK
  return (
    <div data-plate={index} style={{ position: 'relative', width: w, height: h }}>
      {/* 背板：先画，永远在玻璃面之下。只从近侧棱溢出几 px，其余藏在半透面板面后面 */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`,
          clipPath: cut(index === 0 ? 14 : 10),
          background: 'linear-gradient(168deg,rgba(17,22,42,0.96) 0%,rgba(7,11,21,0.97) 46%,rgba(2,5,11,0.98) 100%)',
          boxShadow: `0 16px 32px -16px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 18px ${hue}14`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          padding: `0 ${index === 0 ? 8 : 7}px ${index === 0 ? 7 : 5}px`,
          clipPath: cut(index === 0 ? 14 : 10),
          overflow: 'hidden',
          color: '#fff',
          userSelect: 'none',
          background: [
            'radial-gradient(125% 105% at 50% 44%,rgba(0,0,0,0) 50%,rgba(0,0,0,0.46) 100%)',
            'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0.06) 10%,rgba(255,255,255,0) 22%)',
            `radial-gradient(160px 74px at 10% -12%,rgba(255,255,255,0.2),rgba(255,255,255,0) 70%)`,
            `linear-gradient(0deg,${hue}30 0%,${hue}12 7%,${hue}00 16%)`,
            'repeating-linear-gradient(0deg,rgba(255,255,255,0.018) 0 1px,transparent 1px 13px)',
            'repeating-linear-gradient(90deg,rgba(255,255,255,0.018) 0 1px,transparent 1px 13px)',
            'linear-gradient(168deg,rgba(21,26,46,0.86) 0%,rgba(10,14,26,0.9) 52%,rgba(4,8,15,0.94) 100%)',
          ].join(','),
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.36)',
            'inset 1px 0 0 rgba(255,255,255,0.09)',
            `inset -1px 0 0 ${hue}1f`,
            `inset 0 -1px 0 ${hue}4d`,
            `inset 0 0 20px ${hue}14`,
            /* 只有正在发言的那一块往外发光：五块一起发光就等于没有一块发光 */
            live ? `0 0 22px ${hue}33, 0 0 54px ${hue}14` : '0 0 0 rgba(0,0,0,0)',
          ].join(','),
          opacity: live ? 1 : hot ? 0.94 : 0.82,
          /* 这里挂过一枚 filter: saturate()/brightness() 给非发言牌压色 —— 摘掉了。
             <Html transform> 的牌本身就在 matrix3d 层里，CSS filter 会再给它开一个
             render surface：板面上每个字都被合成两遍（偏移 3~5px 的重影），
             五块牌 = 五个全屏级纹理。压暗这件事 opacity + 板面背景已经做完了，
             再叠一层 filter 换来的差别肉眼几乎看不出 */
          transition: `opacity .5s ${EASE}, box-shadow .5s ${EASE}`,
        }}
      >
      {/* 斜反射带：链屏那块的同一枚，静态 0.5 的亮度 —— 它只为让"这是一块玻璃" */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(112deg,rgba(255,255,255,0) 26%,${hue}12 34%,rgba(255,255,255,0.1) 40%,${hue}0d 47%,rgba(255,255,255,0) 56%)`,
          opacity: 0.5,
        }}
      />

      {/* ―― 标题栏 ―― */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, height: index === 0 ? 26 : 22, flexShrink: 0 }}>
        <span style={{ display: 'flex', gap: 2.5, flexShrink: 0 }}>
          {[hue, 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.16)'].map((c, i) => (
            <span key={i} style={{ width: 4, height: 4, borderRadius: 4, background: c, boxShadow: i === 0 && live ? `0 0 6px ${hue}` : 'none' }} />
          ))}
        </span>
        <span style={{ fontFamily: SANS, fontSize: index === 0 ? 11.5 : 10, fontWeight: 600, letterSpacing: 0.2, color: live ? '#fff' : 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap' }}>{app}</span>
        <span style={{ fontFamily: SANS, fontSize: 8, color: 'rgba(255,255,255,0.32)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{sub}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Chip t={live ? 'SPEAKING' : MODE_TAG[mode] || en} c={live ? hue : `${hue}cc`} solid={live} />
        </span>
      </div>
      <div style={{ position: 'relative', height: 1, margin: `0 -${index === 0 ? 8 : 7}px 4px`, background: `linear-gradient(90deg,${hue}00,${hue}66 22%,${hue}52 70%,${hue}00)` }} />

      {/* ―― 板心 ―― */}
      <Body index={index} hue={hue} b={beat} sp={sp} line={line} live={live || hot} hot={hot} mode={mode} />

      {/* ―― 底部状态行：一块真界面永远有一条在跑的系统信息 ―― */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 11, flexShrink: 0 }}>
        <Mono v={live ? '● live' : '○ idle'} s={6.5} c={live ? hue : 'rgba(255,255,255,0.22)'} />
        <span style={{ flex: 1, minWidth: 0, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <Mono v={`${(0.7 + jit(index, beat % 17) * 0.6).toFixed(2)}s`} s={6.5} c="rgba(255,255,255,0.2)" />
        <Mono v={`${Math.round(1.4 + jit(index * 3, beat % 13) * 0.9)}k t/s`} s={6.5} c={`${hue}99`} />
      </div>
      </div>
    </div>
  )
}
