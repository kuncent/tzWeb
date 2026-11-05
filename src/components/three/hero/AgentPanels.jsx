import { solutionPlans } from '../../../data/pages'

/* ============================================================
 * AI 屏空中那五块方案展板 —— 板面是 DOM，不是 canvas 纹理
 * ------------------------------------------------------------
 * 上一版这五块画的是「五位智能体的运行界面」（课堂 / 推理链 / 校验 / 圆桌 / 学情）。
 * 现在改成五大解决方案的展示面板：数字经济 · 金融科技 · 应用统计 ·
 * 商务数据分析 · 工商科一体化平台。
 *
 * 文案纪律：标题、主线、指标、课程层、产品数量全部直接读 solutionPlans
 * （src/data/pages.js），不在这里另造一套说法 —— 首屏与 /solutions 说两套话，
 * 是 B 端官网最容易被客户当场抓住的事故。
 *
 * 为什么走 DOM 不是纹理：字过 canvas 纹理要吃三道折损（烤进纹理、按 dpr 0.8
 * 贴出、被 Bloom 阈值糊一层）。drei 的 <Html transform> 把真 DOM 按相机透视
 * 摆进场景，三道都不吃，1px 的线就是 1px 的线，颜色也不受泛光与 AGX 影响。
 *
 * 版式硬约束：卫星牌在屏幕上 169~218×99~128（去掉标题栏与状态行只剩 ~79px）。
 * 每块只做三件事：一条主线链路 + 一张迷你图 + 一行指标；其余不做。
 * 五块共用同一套版式语言（切角窗、等宽读数、同一组蓝青色阶），
 * 差异只放在「迷你图」与强调色上 —— 一家人穿同款制服，各戴各的工牌。
 *
 * 换算：world = cssPx × ADF / 400。改 ADF 必须同步改面板尺寸，
 * 否则 NeuralRig 那几块链路端点（按面板边线接）就对不上牌边。
 * ============================================================ */

export const ADF = 2.2
/* ―― 板面尺寸：CSS 像素。这两个数与 ADF 是一对，改一个必须改另一个 ――
   换算 world = css × ADF / 400，屏幕上又还原成 css × 5.55 / d ――
   288×178 / 208×122 是按首屏现在的空档反解的：文案列止于 x≈700，服务地图
   占 x≥997 且上移到 y≈359，所以五块牌只能落在「文案列右侧、地图左上」这块
   区域里 —— 尺寸给到「主牌 253×156、卫星 180~228」正好排满且都留 20px 缝 */
export const HERO = { w: 288, h: 178 }
export const SAT = { w: 208, h: 122 }
export const isHero = (i) => i === 0
export const panelCss = (i) => (isHero(i) ? HERO : SAT)
/** 面板的世界尺寸（米）：链路的端点要接在牌边上，靠的就是这两个数 */
export const panelWorld = (i) => {
  const s = panelCss(i)
  return { w: (s.w * ADF) / 400, h: (s.h * ADF) / 400 }
}

/* ―― 五支通道色（蓝 → 青，同族内拉开明度/饱和度）――
   五块牌要在一屏里彼此认得出，颜色就不能都是同一个明度的蓝。这五支沿
   蓝→青的色相走 50° 左右，明度与饱和度交替：金融科技（主牌位）取最亮的青，
   数字经济（它上面的卫星）取主题蓝，应用统计拉开到靛蓝，商务数据分析取青绿，
   工商科取浅天蓝。这一轮 0/1 两支跟着内容对调一起换了，所以不会出现
   「标题是金融科技、灯色还是数字经济那支蓝」的错配。 */
export const HUES = ['#25D4FF', '#3E8BFF', '#5C7CFF', '#28C9C0', '#7FB8FF']

/* ―― 五块展板 = 五个方案：字段原样取自 pages.js ――
   app = 方案简称（标题栏），sub = 培养定位（标题栏副行，够短不折行），
   en = 英文名（CHIP 常驻位），n = 方案序号。
   ★ 用户要求「金融科技」与「数字经济」两块内容整体对调：所以主牌位（0）现在
   挂金融科技，它上面那块卫星（1）挂数字经济，其余三块不动。
   ORDER 只决定「哪块方案落在哪个席位」；标题、主线、指标、课程层、色相、序号
   全部跟着方案自己走（HUES 与 plan.n 都按新内容重排），不会出现「标题换了、
   色系/编号还是旧的」这种图文不符。 */
const ORDER = [1, 0, 2, 3, 4]
const planAt = (i) => solutionPlans[ORDER[i]]
export const APPS = ORDER.map((k) => {
  const p = solutionPlans[k]
  return { app: p.short, en: p.en, n: p.n, sub: p.positioning }
})

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace'
const SANS = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

const pad = (n) => String(n).padStart(2, '0')

/* ---------- 原子 ---------- */

const cut = (px = 12) => `polygon(0 0, calc(100% - ${px}px) 0, 100% ${px}px, 100% 100%, 0 100%)`

function Mono({ v, s = 9, c = 'rgba(255,255,255,0.7)', dim, right, ell = true }) {
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

/* ============================================================
 * 板心：五个方案共用一套版式
 * ============================================================ */

/** 主线链路：四段等宽，逐段点亮（点亮的段落由 beat 推着走，读作"方案在演示"） */
function Mainline({ steps, hue, b, live, size = 7.5, compact }) {
  const cur = b % steps.length
  /* 字号按最长那一段收：卫星牌一块只有 196px 宽，四段等分后每段不到 40px，
     「可视化呈现」这种五个字的主线原样 7px 会被省略号吃掉 —— 与其截断，
    不如整条链路一起缩到能完整放下，五块牌的字号也就此对齐 */
  const maxLen = Math.max(...steps.map((s) => s.length))
  const fs = Math.min(size, Math.max(6, Math.floor((compact ? 34 : 62) / maxLen)))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flexShrink: 0 }}>
      {steps.map((s, i) => {
        const on = live && i === cur
        return (
          <span key={s} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'center',
                padding: '2px 2px',
                borderRadius: 2,
                border: `1px solid ${on ? `${hue}88` : 'rgba(255,255,255,0.09)'}`,
                background: on ? `${hue}24` : 'rgba(255,255,255,0.03)',
                fontFamily: SANS,
                fontSize: fs,
                color: on ? '#fff' : 'rgba(255,255,255,0.66)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: `border-color .45s ${EASE}, background .45s ${EASE}, color .45s ${EASE}`,
              }}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <span style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>›</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

/** 指标：一枚数值 + 一枚标签。主图（hero）用大号，卫星牌用小号 */
function Metric({ k, v, hue, big }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: big ? 16 : 10.5, fontWeight: big ? 700 : 600, lineHeight: 1.1, color: hue, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
      <div style={{ marginTop: 1, fontFamily: SANS, fontSize: big ? 8 : 7, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</div>
    </div>
  )
}

/** 课程层：四层的名字，同宽的斜角小格 —— 结构一眼能数清是四层 */
function LayerRow({ layers, hue, size = 6.5 }) {
  return (
    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
      {layers.map((t, i) => (
        <span
          key={t}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'center',
            padding: '2px 1px',
            clipPath: cut(4),
            background: `linear-gradient(180deg,${hue}${i === 0 ? '24' : '17'},rgba(255,255,255,0.02))`,
            borderBottom: `1px solid ${hue}${i === 0 ? '88' : '40'}`,
            fontFamily: SANS,
            fontSize: size,
            color: 'rgba(255,255,255,0.68)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {t}
        </span>
      ))}
    </div>
  )
}

/* ―― 迷你图：每块牌一个，形状跟着方案语义走，不是同款换色 ―― */

/** 1 数字经济：数据要素网络 —— 节点互联、脉冲沿链路走（要素流通的读法） */
function DataMotif({ hue, b, live }) {
  const nodes = [
    [8, 13], [32, 4], [56, 11], [84, 3], [112, 12], [142, 5], [170, 12], [192, 17],
  ]
  const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [1, 4], [2, 5]]
  const hi = live ? b % nodes.length : -1
  return (
    <svg viewBox="0 0 200 20" preserveAspectRatio="none" style={{ width: '100%', height: 20, display: 'block' }}>
      {links.map(([a, c], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[c][0]} y2={nodes[c][1]} stroke={hue} strokeWidth="0.9" opacity="0.3" />
      ))}
      {nodes.map(([x, y], i) => {
        const on = i === hi
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={on ? 2.6 : 1.7} fill={on ? '#fff' : hue} opacity={on ? 1 : 0.8} />
            {on && <circle cx={x} cy={y} r={4.8} fill="none" stroke={hue} strokeWidth="0.9" opacity="0.55" />}
          </g>
        )
      })}
    </svg>
  )
}

/** 2 应用统计：分布柱 —— 中间高两边低，统计的默认形状 */
function DistMotif({ hue, b, live }) {
  const n = 16
  const bars = Array.from({ length: n }, (_, i) => {
    const x = (i - (n - 1) / 2) / ((n - 1) / 2)
    return Math.max(0.12, Math.exp(-(x * x) * 2.1) * 0.95)
  })
  const hi = Math.min(n - 1, Math.round(((b % n) / (n - 1)) * (n - 1)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 20 }}>
      {bars.map((v, i) => {
        const on = live && i === hi
        return (
          <span key={i} style={{ flex: 1, minWidth: 0, height: `${Math.min(100, v * 100)}%`, borderRadius: 1, background: on ? hue : `${hue}${i % 2 ? '4d' : '66'}`, boxShadow: on ? `0 0 6px ${hue}` : 'none', transition: `background .5s ${EASE}, box-shadow .5s ${EASE}` }} />
        )
      })}
    </div>
  )
}

/** 3 商务数据分析：四条业务线各一根柱子，从低到高 —— 经营分析的读法 */
function ColumnsMotif({ hue, b, live }) {
  const hs = [0.34, 0.52, 0.68, 0.86]
  const hi = b % hs.length
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 20 }}>
      {hs.map((v, i) => {
        const on = live && i === hi
        return (
          <div key={i} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2 }}>
            <span style={{ height: `${v * 100}%`, borderRadius: 1.5, background: on ? hue : `${hue}55`, border: `1px solid ${on ? `${hue}cc` : 'rgba(255,255,255,0.06)'}`, boxShadow: on ? `0 0 8px ${hue}66` : 'none', transition: `all .5s ${EASE}` }} />
            <span style={{ height: 1, background: 'rgba(255,255,255,0.12)' }} />
          </div>
        )
      })}
    </div>
  )
}

/** 4 工商科一体化：三段产线节点 + 连线，流转点在跑 —— 工业闭环的读法 */
function PipelineMotif({ hue, b, live }) {
  const nodes = ['采', '治', '决']
  const at = live ? b % (nodes.length + 1) : 0
  return (
    <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* 连线：从第一枚节点直到最后一枚，中间跑一颗流光点 */}
      <span aria-hidden style={{ position: 'absolute', left: 10, right: 10, top: '50%', height: 1, background: `linear-gradient(90deg,${hue}55,${hue}22)`, transform: 'translateY(-50%)' }} />
      {nodes.map((t, i) => {
        const on = at === i
        return (
          <div key={t} style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, height: 14, display: 'grid', placeItems: 'center', borderRadius: 3, border: `1px solid ${on ? `${hue}99` : 'rgba(255,255,255,0.1)'}`, background: on ? `linear-gradient(160deg,${hue}30,rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.035)', boxShadow: on ? `0 0 10px ${hue}33` : 'none', transition: `all .5s ${EASE}` }}>
            <span style={{ fontFamily: SANS, fontSize: 8, color: on ? '#fff' : 'rgba(255,255,255,0.45)' }}>{t}</span>
          </div>
        )
      })}
      {at === nodes.length && (
        <span style={{ position: 'absolute', right: 8, top: '50%', width: 4, height: 4, borderRadius: 4, background: '#fff', boxShadow: `0 0 8px ${hue}`, transform: 'translateY(-50%)' }} />
      )}
    </div>
  )
}

const MOTIFS = [null, DataMotif, DistMotif, ColumnsMotif, PipelineMotif]

/* ―― 主图（金融科技，288×178=屏幕上 252×156）：链路 + 2×2 指标 + 四层课程 ――
   这块牌最近、也最大，是全场的"封面"，所以给它一张完整的方案名片 */
function HeroBody({ plan, hue, b, live }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Mainline steps={plan.mainline} hue={hue} b={b} live={live} size={9.5} />
      <div style={{ height: 1, margin: '2px 0', background: `linear-gradient(90deg,${hue}00,${hue}66 22%,${hue}52 70%,${hue}00)`, flexShrink: 0 }} />
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {plan.metrics.slice(0, 2).map((m) => (
          <Metric key={m.k} k={m.k} v={m.v} hue={hue} big />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {plan.metrics.slice(2, 4).map((m) => (
          <Metric key={m.k} k={m.k} v={m.v} hue={hue} big />
        ))}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 这一行只留"四层课程"这一枚行标签：产品总数上面 2×2 指标里已经有一条
            「9 套支撑产品」，同一块牌上写两遍就是重复信息 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <Mono v="四层课程" s={7} c="rgba(255,255,255,0.45)" />
        </div>
        <LayerRow layers={plan.layers.map((l) => l.name)} hue={hue} size={7.5} />
      </div>
    </div>
  )
}

/* ―― 卫星牌（208×122，屏幕上 169~218×99~128）：主线 + 迷你图 + 一行指标 + 两层结构 ――
   去掉标题栏与状态行只剩 ~79px，所以只放四行，字号不再往下压 */
function SatBody({ plan, hue, b, live, index }) {
  const Motif = MOTIFS[index]
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Mainline steps={plan.mainline} hue={hue} b={b} live={live} size={8} compact />
      <div style={{ height: 20, flexShrink: 0, opacity: live ? 1 : 0.72, transition: `opacity .5s ${EASE}` }}>
        <Motif hue={hue} b={b} live={live} />
      </div>
      {/* 指标单行走完：卫星牌去掉标题栏与状态行只剩 ~79px，三行指标会把
          底下的课程层挤出板外；三个数并排一行，读起来反而更像仪表 */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'baseline', flexShrink: 0 }}>
        {plan.metrics.slice(0, 3).map((m) => (
          <span key={m.k} style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, lineHeight: 1.1, color: hue, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{m.v}</span>
            <span style={{ fontFamily: SANS, fontSize: 7, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{m.k}</span>
          </span>
        ))}
      </div>
      <LayerRow layers={plan.layers.slice(0, 3).map((l) => l.name)} hue={hue} size={6.5} />
    </div>
  )
}

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
  const plan = planAt(index)
  const { app, en, n, sub } = APPS[index]
  const { w, h } = panelCss(index)
  const Body = index === 0 ? HeroBody : SatBody
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
            'radial-gradient(125% 105% at 50% 44%,rgba(0,0,0,0) 52%,rgba(0,0,0,0.32) 100%)',
            'linear-gradient(180deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.08) 10%,rgba(255,255,255,0) 22%)',
            `radial-gradient(160px 74px at 10% -12%,rgba(255,255,255,0.24),rgba(255,255,255,0) 70%)`,
            `linear-gradient(0deg,${hue}3d 0%,${hue}18 7%,${hue}00 16%)`,
            'repeating-linear-gradient(0deg,rgba(255,255,255,0.022) 0 1px,transparent 1px 13px)',
            'repeating-linear-gradient(90deg,rgba(255,255,255,0.022) 0 1px,transparent 1px 13px)',
            'linear-gradient(168deg,rgba(30,38,64,0.92) 0%,rgba(16,22,40,0.94) 52%,rgba(8,12,22,0.96) 100%)',
          ].join(','),
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.36)',
            'inset 1px 0 0 rgba(255,255,255,0.09)',
            `inset -1px 0 0 ${hue}1f`,
            `inset 0 -1px 0 ${hue}4d`,
            `inset 0 0 20px ${hue}14`,
            /* 只有正在聚焦的那一块往外发光：五块一起发光就等于没有一块发光 */
            live ? `0 0 22px ${hue}33, 0 0 54px ${hue}14` : '0 0 0 rgba(0,0,0,0)',
          ].join(','),
          opacity: live ? 1 : hot ? 0.97 : 0.93,
          /* 这里挂过一枚 filter: saturate()/brightness() 给非聚焦牌压色 —— 摘掉了。
             <Html transform> 的牌本身就在 matrix3d 层里，CSS filter 会再给它开一个
             render surface：板面上每个字都被合成两遍（偏移 3~5px 的重影），
             五块牌 = 五个全屏级纹理。压暗这件事 opacity + 板面背景已经做完了 */
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

      {/* ―― 标题栏：三枚窗控点 + 方案简称 + 培养定位 + 编号/聚焦态 ―― */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, height: index === 0 ? 26 : 22, flexShrink: 0 }}>
        <span style={{ display: 'flex', gap: 2.5, flexShrink: 0 }}>
          {[hue, 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.16)'].map((c, i) => (
            <span key={i} style={{ width: 4, height: 4, borderRadius: 4, background: c, boxShadow: i === 0 && live ? `0 0 6px ${hue}` : 'none' }} />
          ))}
        </span>
        <span style={{ fontFamily: SANS, fontSize: index === 0 ? 12.5 : 11, fontWeight: 600, letterSpacing: 0.2, color: live ? '#fff' : 'rgba(255,255,255,0.88)', whiteSpace: 'nowrap' }}>{app}</span>
        <span style={{ fontFamily: SANS, fontSize: 8.5, color: 'rgba(255,255,255,0.46)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{sub}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Chip t={live ? 'FOCUS' : `${n}/05`} c={live ? hue : `${hue}cc`} solid={live} />
        </span>
      </div>
      <div style={{ position: 'relative', height: 1, margin: `0 -${index === 0 ? 8 : 7}px 4px`, background: `linear-gradient(90deg,${hue}00,${hue}66 22%,${hue}52 70%,${hue}00)` }} />

      {/* ―― 板心 ―― */}
      <Body index={index} plan={plan} hue={hue} b={beat} live={live || hot} hot={hot} />

      {/* ―― 底部状态行：一块真界面永远有一条在跑的系统信息 ―― */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 11, flexShrink: 0 }}>
        <Mono v={live ? '● focus' : '○ standby'} s={7} c={live ? hue : 'rgba(255,255,255,0.36)'} />
        <span style={{ flex: 1, minWidth: 0, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        <Mono v={en} s={6.5} c="rgba(255,255,255,0.34)" />
        <Mono v={`${n}/${pad(solutionPlans.length)}`} s={7} c={`${hue}cc`} />
      </div>
      </div>
    </div>
  )
}
