import { solutionPlans } from '../../../data/pages'

/* ============================================================
 * AI 屏空中那块展板 —— 板面是 DOM，不是 canvas 纹理
 * ------------------------------------------------------------
 * 板面内容 = 五大解决方案（数字经济 / 金融科技 / 应用统计 / 新商科大数据 /
 * 工商科一体化），字段全部直接读 solutionPlans（src/data/pages.js）：
 * 标题、主线、培养定位、英文名与编号都不在这里另造说法 —— 首屏与 /solutions
 * 说两套话，是 B 端官网最容易被客户当场抓住的事故。
 *
 * 五块牌各挂一套方案，强调色按方案固定（HUES），牌换位时颜色跟着牌走，
 * 不会出现「同一块牌换个位置就换了个颜色」。版式只有一套（主牌 288×178）：
 * 轮到中央时要能读全；侧牌靠席位纵深 + 3D 缩放 + 亮度退到背景里。
 *
 * 为什么走 DOM 不是纹理：字过 canvas 纹理要吃三道折损（烤进纹理、按 dpr 0.8
 * 贴出、被 Bloom 阈值糊一层）。drei 的 <Html transform> 把真 DOM 按相机透视
 * 摆进场景，三道都不吃，1px 的线就是 1px 的线，颜色也不受泛光与 AGX 影响。
 *
 * 换算：world = cssPx × ADF / 400。改 ADF 必须同步改面板尺寸，
 * 否则 NeuralRig 那几块链路端点（按面板边线接）就对不上牌边。
 *
 * 可读性：牌面按 ADF / 距离缩到屏幕上，7px 的字落地只剩 5px —— 所以字号
 * 整体抬一档、低对比的灰字一并提亮，同时把 ADF 从 2.2 抬到 2.36。
 * ============================================================ */

export const ADF = 2.36
/* ―― 板面尺寸：CSS 像素。这两个数与 ADF 是一对，改一个必须改另一个 ――
   换算 world = css × ADF / 400，屏幕上又还原成 css × 5.55 / d ――
   轮播后五块牌都会轮到中央，所以五块统一用主牌版式（288×178）：
   中央那一块要能读全，侧牌退回背景后再靠 3D 缩放与亮度压低存在感。
   世界尺寸（米）给链路的端点用：HERO_W / HERO_H × 该槽位缩放 */
export const HERO = { w: 288, h: 178 }
export const HERO_W = (HERO.w * ADF) / 400
export const HERO_H = (HERO.h * ADF) / 400

/* ―― 五支通道色（蓝 → 青等距阶梯）――
   五块牌各挂一套方案，要在一屏里彼此认得出，又不能像随机蓝：沿蓝→青把色相
   等距排开、明度逐档对齐，读作一条刻意的光谱。与 StoryHero 的 PRODUCT_HUES 同族。 */
export const HUES = ['#5C8DFF', '#46A2FF', '#2FB8F0', '#1FCBE0', '#2AD9C9']

/* ―― 五块展板 = 五套方案：字段原样取自 pages.js ――
   index 就是方案序号（0 数字经济 … 4 工商科一体化），与轮播前一致；
   NeuralRig 按「停稳时这块板坐在哪个席位」把这个序号传进来。
   app = 方案简称（标题栏），sub = 培养定位（标题栏副行），en = 英文名，n = 方案序号。
   标题、主线、培养定位、英文名与编号全部取自方案自身（plan.n），
   不会出现「方案换了、编号还是旧的」这种图文不符。
   席位通道色（HUES）按方案固定，跟着牌走 —— 牌换位时颜色不会跳。 */
const planAt = (i) => solutionPlans[i]
export const APPS = solutionPlans.map((p) => ({
  app: p.short,
  en: p.en,
  n: p.n,
  sub: p.positioning,
}))

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace'
const SANS = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

const pad = (n) => String(n).padStart(2, '0')

/* ---------- 原子 ---------- */

const cut = (px = 12) => `polygon(0 0, calc(100% - ${px}px) 0, 100% ${px}px, 100% 100%, 0 100%)`

function Mono({ v, s = 9.5, c = 'rgba(255,255,255,0.8)', dim, right, ell = true }) {
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
        fontSize: 8.5,
        letterSpacing: 0.6,
        padding: '1px 5px',
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
function Mainline({ steps, hue, b, live, size = 8.5, compact }) {
  const cur = b % steps.length
  /* 卫星牌（compact）：四段等宽的格子铺在这块 194px 宽的板上，每段只剩 40px，
     字缩到 6px 落地约 4~5px，等于糊成一片。改成「当前段 → 下一段 + 四枚进度点」，
     字号抬回 9.5px（屏幕上约 7px），四段的结构仍由点阵读得出，而且是活的 ——
     比四块灰格子更像一条正在跑的主线 */
  if (compact) {
    const next = (cur + 1) % steps.length
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flexShrink: 0, height: 15 }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, color: hue, flexShrink: 0 }}>{pad(cur + 1)}</span>
        <span style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>{steps[cur]}</span>
        <span style={{ fontFamily: MONO, fontSize: 7.5, color: 'rgba(255,255,255,0.32)', flexShrink: 0 }}>›</span>
        <span style={{ minWidth: 0, fontFamily: SANS, fontSize: 9.5, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{steps[next]}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 2.5, flexShrink: 0 }}>
          {steps.map((s, i) => (
            <span
              key={s}
              style={{
                width: i === cur ? 5 : 3.5,
                height: i === cur ? 5 : 3.5,
                borderRadius: 3,
                background: i === cur ? hue : `${hue}38`,
                boxShadow: i === cur ? `0 0 6px ${hue}` : 'none',
                transition: `all .4s ${EASE}`,
              }}
            />
          ))}
        </span>
      </div>
    )
  }
  const maxLen = Math.max(...steps.map((s) => s.length))
  const fs = Math.min(size, Math.max(6, Math.floor(64 / maxLen)))
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
                padding: '2px 1px',
                borderRadius: 2,
                border: `1px solid ${on ? `${hue}88` : 'rgba(255,255,255,0.14)'}`,
                background: on ? `${hue}24` : 'rgba(255,255,255,0.05)',
                fontFamily: SANS,
                fontSize: fs,
                color: on ? '#fff' : 'rgba(255,255,255,0.84)',
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

/* ============================================================
 * 中间区：图标塔 + 终端出码，五块牌同一套语言
 * ------------------------------------------------------------
 * 只读 solutionPlans 里已有的东西：方案图标（plan.icon）、英文名、主线、
 * 培养定位。不写产品数、不造指标 —— 牌上出现的每个词都能在 /solutions 找到出处。
 * 终端把方案读作「一段正在跑的命令」：提示符 + 方案号 + 四段主线；
 * 打字盖板只挂在中央那一块，滑走的是合成层，不逐帧改字。
 * ============================================================ */

/** 图标塔：方案自己的图标 + 四枚跟着主线走的点 */
function IconTower({ plan, hue, b }) {
  const Glyph = plan.icon
  const cur = b % plan.mainline.length
  return (
    <div
      style={{
        position: 'relative',
        width: 56,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        clipPath: cut(8),
        /* 图标塔做成一格凹进去的壁龛：顶部一枚通道色回光把图标托住，
           四周硬边 + 下缘反上来的次色，与右边那块屏是同一套腔体语言 */
        background: `radial-gradient(76% 50% at 50% 30%,${hue}30,rgba(0,0,0,0) 72%),linear-gradient(180deg,rgba(255,255,255,0.09) 0%,rgba(255,255,255,0.015) 60%,${hue}16 100%)`,
        boxShadow: `inset 0 1px 0 ${hue}7a, inset 0 0 0 1px ${hue}2b, inset 0 -9px 14px -10px ${hue}66`,
      }}
    >
      {Glyph ? <Glyph size={30} strokeWidth={1.4} color={hue} /> : null}
      <span style={{ display: 'flex', gap: 3 }}>
        {plan.mainline.map((s, i) => (
          <span
            key={s}
            style={{
              width: 4,
              height: 4,
              borderRadius: 4,
              background: i === cur ? hue : `${hue}4a`,
              boxShadow: i === cur ? `0 0 6px ${hue}` : 'none',
              transition: `background .4s ${EASE}, box-shadow .4s ${EASE}`,
            }}
          />
        ))}
      </span>
    </div>
  )
}

/* ―― 中间区形态：按方案本身选仪表，而不是五块同一台终端 ――
   01 数字经济（增量/网络）→ 折线趋势
   02 金融科技（多标的对比）→ 柱列
   03 应用统计（抽样/分布）→ 径向分布仪表
   04 新商科大数据（取数/查询）→ 终端
   05 工商科一体化（流程编排）→ 终端
   折线 / 柱列 / 径向分布都是示意占位：轴上不写数值、图例不写百分比，
   牌是「在做分析」的样子，不是一张经营看板，不编造真实指标。 */
const DISPLAY = ['trend', 'bars', 'radial', 'terminal', 'terminal']

const TREND_A = [0.16, 0.3, 0.24, 0.42, 0.36, 0.55, 0.46, 0.64]
const TREND_B = [0.1, 0.18, 0.15, 0.26, 0.22, 0.33, 0.28, 0.4]
const BARS_A = [0.34, 0.52, 0.42, 0.66, 0.48, 0.8]
const BARS_B = [0.28, 0.6, 0.36, 0.7, 0.55, 0.74]

/* 屏面底色：比 bezel 深两档，顶上回一抹通道色。
   牌缩到屏幕上 200px 时，屏与框只差几个亮度值就会糊成同一块灰板；
   拉开明度差之后才读作「一圈被照亮的边框裹着一块通电的黑屏」。
   打字盖板要用同一份底（见 Terminal），否则盖板滑过时会露出一道色差边 */
const screenBg = (hue) =>
  `radial-gradient(135% 96% at 50% -14%,${hue}26,rgba(0,0,0,0) 58%),linear-gradient(180deg,#04070f 0%,#02040a 100%)`

/* 三种仪表共用一块屏：同底色、同切角、同一枚左下角小标 */
const screenBox = (hue) => ({
  position: 'relative',
  flex: 1,
  minWidth: 0,
  boxSizing: 'border-box',
  padding: '5px 7px 11px',
  clipPath: cut(8),
  background: screenBg(hue),
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px ${hue}45, inset 0 0 18px -6px ${hue}3a`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
})

function Tag({ hue, t }) {
  return (
    <span style={{ position: 'absolute', left: 7, bottom: 4, fontFamily: MONO, fontSize: 6.5, letterSpacing: 0.7, color: `${hue}99` }}>{t}</span>
  )
}

const linePath = (vals, x0, x1, y0, y1) =>
  vals.map((v, i) => `${i ? 'L' : 'M'}${(x0 + (i / (vals.length - 1)) * (x1 - x0)).toFixed(1)},${(y1 - v * (y1 - y0)).toFixed(1)}`).join(' ')

/** 折线：两条抽象序列 + 一枚跟着节拍走的读数点；无坐标数值
    过渡只给中央那块 —— 五块同时做 CSS 过渡等于让五个全屏 DOM 图层一起重合成 */
function Trend({ hue, b, uid, live }) {
  const i = b % TREND_A.length
  const mx = 8 + (i / (TREND_A.length - 1)) * 184
  const my = 66 - TREND_A[i] * 52
  return (
    <svg viewBox="0 0 200 80" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`tr${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hue} stopOpacity="0.26" />
          <stop offset="100%" stopColor={hue} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[22, 42, 62].map((y) => (
        <line key={y} x1="6" x2="194" y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={`${linePath(TREND_A, 8, 192, 14, 66)} L192,72 L8,72 Z`} fill={`url(#tr${uid})`} />
      <path d={linePath(TREND_B, 8, 192, 14, 66)} fill="none" stroke={hue} strokeOpacity="0.34" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={linePath(TREND_A, 8, 192, 14, 66)} fill="none" stroke={hue} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle
        cx="0"
        cy="0"
        r="2.4"
        fill={hue}
        style={{ transform: `translate(${mx}px,${my}px)`, transition: live ? 'transform 1.1s cubic-bezier(0.22,0.61,0.36,1)' : 'none' }}
      />
    </svg>
  )
}

/** 柱列：六根对比柱，节拍换一组高度、当前柱点亮；无刻度数值 */
function Bars({ hue, b, live }) {
  const vals = b % 2 ? BARS_B : BARS_A
  const cur = b % vals.length
  return (
    <svg viewBox="0 0 200 80" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
      {vals.map((v, i) => (
        <rect
          key={i}
          x={10 + i * 30}
          y="12"
          width="16"
          height="54"
          fill={i === cur ? hue : `${hue}3d`}
          style={{
            transform: `scaleY(${v})`,
            transformBox: 'fill-box',
            transformOrigin: 'bottom',
            transition: live ? 'transform 1.2s cubic-bezier(0.22,0.61,0.36,1), fill .5s' : 'none',
          }}
        />
      ))}
      <line x1="8" x2="192" y1="66" y2="66" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** 径向分布仪表：外圈 49 枚刻度 + 三层同心弧 + 36 根辐条与分布包络 + 巡扫扇区。
    03 应用统计读作一台正在扫描的仪器；不写任何刻度值 / 百分比。
    辐条与包络按节拍整组换形（包络的 d 无法过渡，索性整组刷新，像雷达重采样），
    连续的慢动效只有扫臂：transform 过渡，且只给中央那块 */
const RAD_N = 36
const RAD_WOBBLE = [
  [0.86, 1, 0.92, 1.08, 0.8, 0.96],
  [0.9, 0.82, 1.04, 0.94, 1.1, 0.88],
]
const radProfile = (k, peak, spread) =>
  Array.from({ length: RAD_N }, (_, i) => {
    const t = i / (RAD_N - 1)
    const bell = Math.exp(-(((t - peak) / spread) ** 2))
    return Math.max(0.18, Math.min(1, bell * RAD_WOBBLE[k][i % 6]))
  })
const RAD_A = radProfile(0, 0.46, 0.3)
const RAD_B = radProfile(1, 0.6, 0.26)
const RAD_TICKS = Array.from({ length: 49 }, (_, i) => {
  const a = Math.PI + (i / 48) * Math.PI
  const r2 = i % 6 === 0 ? 47 : 50
  return {
    x1: (100 + 54 * Math.cos(a)).toFixed(1),
    y1: (62 + 54 * Math.sin(a)).toFixed(1),
    x2: (100 + r2 * Math.cos(a)).toFixed(1),
    y2: (62 + r2 * Math.sin(a)).toFixed(1),
  }
})
const radArc = (r) => `M${100 - r},62 A${r},${r} 0 0 1 ${100 + r},62`

function Radial({ hue, b, live }) {
  const vals = b % 2 ? RAD_B : RAD_A
  const rot = -72 + (b % 5) * 36
  const ease = 'cubic-bezier(0.22,0.61,0.36,1)'
  const half = 0.21
  /* 以「正上方」为 0°：x = 100 + r·sinφ，y = 62 − r·cosφ，
     扇区约 24°、外圈亮弧约 30° —— 扫臂是一道窄光，不是半个仪表罩 */
  const wedge = `M100,62 L${(100 - 54 * Math.sin(half)).toFixed(1)},${(62 - 54 * Math.cos(half)).toFixed(1)} A54,54 0 0 1 ${(100 + 54 * Math.sin(half)).toFixed(1)},${(62 - 54 * Math.cos(half)).toFixed(1)} Z`
  const cap = `M${(100 - 57 * Math.sin(0.26)).toFixed(1)},${(62 - 57 * Math.cos(0.26)).toFixed(1)} A57,57 0 0 1 ${(100 + 57 * Math.sin(0.26)).toFixed(1)},${(62 - 57 * Math.cos(0.26)).toFixed(1)}`
  /* 分布包络：把辐条端点连成一块扇形底色 —— 侧牌缩到 200px 时，
     单根 1.5 单位的辐条会退成噪点，这块面的轮廓还立得住 */
  const fan = vals
    .map((v, i) => {
      const a = Math.PI + (i / (RAD_N - 1)) * Math.PI
      const r = 26 + 22 * v
      return `${i ? 'L' : 'M'}${(100 + r * Math.cos(a)).toFixed(1)},${(62 + r * Math.sin(a)).toFixed(1)}`
    })
    .join(' ') + ' L100,62 Z'
  return (
    <svg viewBox="0 0 200 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      {[44, 34, 24].map((r) => (
        <path key={r} d={radArc(r)} fill="none" stroke={hue} strokeOpacity="0.12" strokeWidth="0.7" />
      ))}
      {RAD_TICKS.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(255,255,255,0.22)" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
      ))}
      <line x1="42" x2="158" y1="62" y2="62" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      <path d={fan} fill={hue} opacity="0.16" />
      {vals.map((v, i) => {
        const deg = -90 + (i / (RAD_N - 1) - 0.5) * 176
        return (
          <g key={i} transform={`rotate(${deg.toFixed(2)} 100 62)`}>
            <rect
              x="99"
              y="16"
              width="2"
              height="20"
              fill={hue}
              opacity={0.45 + v * 0.5}
              style={{ transform: `scaleY(${v.toFixed(3)})`, transformBox: 'fill-box', transformOrigin: 'center bottom' }}
            />
          </g>
        )
      })}
      {/* 巡扫臂：随节拍在 -72°…+72° 之间扫，扇区 + 外圈亮弧一起走 */}
      <g
        style={{
          transformBox: 'view-box',
          transformOrigin: '100px 62px',
          transform: `rotate(${rot}deg)`,
          transition: live ? `transform 1.2s ${ease}` : 'none',
        }}
      >
        <path d={wedge} fill={hue} opacity="0.12" />
        <line x1="100" y1="62" x2="100" y2="5" stroke={hue} strokeWidth="1" opacity="0.8" vectorEffect="non-scaling-stroke" />
        <path d={cap} fill="none" stroke={hue} strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
      </g>
      <circle cx="100" cy="62" r="2" fill={hue} />
    </svg>
  )
}

/** 终端：命令行 + 方案主线；中央那块演「正在敲」，侧牌直接摊开全文
    只留三行 —— 英文名在页脚已经有一份，挤进 200px 的侧牌反而会截字；
    主线拆成两行，每行都完整 */
function Terminal({ plan, hue, live, still }) {
  const m = plan.mainline
  const rows = [
    { p: '$', t: `tz solve --plan ${plan.n}`, c: '#fff' },
    { p: '>', t: `${m[0]} / ${m[1]}`, c: 'rgba(255,255,255,0.86)' },
    { p: '>', t: `${m[2]} / ${m[3 % m.length]}`, c: 'rgba(255,255,255,0.86)' },
  ]
  return (
    <div style={screenBox(hue)}>
      <Motes hue={hue} />
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, minWidth: 0, alignItems: 'baseline' }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: r.p === '$' ? hue : `${hue}aa`, flexShrink: 0 }}>{r.p}</span>
          <span style={{ fontFamily: MONO, fontSize: i === 0 ? 10.5 : 10, lineHeight: 1.4, color: r.c, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.t}</span>
          {i === rows.length - 1 && <span style={{ width: 4, height: 9, background: hue, flexShrink: 0, opacity: 0.9 }} />}
        </div>
      ))}
      <Tag hue={hue} t="STDOUT" />
      {/* 打字盖板：只给中央那块；transform 在合成层里滑走，不触发文字重排。
          reduced-motion 与侧牌不挂，读者看到的直接是完整落定的输出 */}
      {live && !still && <span className="ap-type-cover" aria-hidden style={{ position: 'absolute', inset: 0, background: screenBg(hue) }} />}
    </div>
  )
}

/** 五块牌共用的中间区：图标塔 +（折线 / 柱列 / 径向分布 / 终端） */
function Display({ kind, plan, hue, b, live, still, idx }) {
  if (kind === 'trend') {
    return (
      <div style={screenBox(hue)}>
        <Motes hue={hue} />
        <Trend hue={hue} b={b} uid={idx} live={live} />
        <Tag hue={hue} t="INDICATIVE" />
      </div>
    )
  }
  if (kind === 'bars') {
    return (
      <div style={screenBox(hue)}>
        <Motes hue={hue} />
        <Bars hue={hue} b={b} live={live} />
        <Tag hue={hue} t="INDICATIVE" />
      </div>
    )
  }
  if (kind === 'radial') {
    return (
      <div style={screenBox(hue)}>
        <Motes hue={hue} />
        <Radial hue={hue} b={b} live={live} />
        <Tag hue={hue} t="INDICATIVE" />
      </div>
    )
  }
  return <Terminal plan={plan} hue={hue} live={live} still={still} />
}

/* ―― 主图（288×178）：主线 + 图标塔 + 仪表屏 ――
   原来那组「课程模块 / 支撑产品」数字块与四层课程格子都撤了：
   牌缩到屏幕 200px 宽时 2×2 数字先糊成噪点，图形 + 几行等宽字反而立得住 */
function HeroBody({ plan, hue, b, live, still, kind, idx }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Mainline steps={plan.mainline} hue={hue} b={b} live={live} size={11} />
      <div style={{ height: 1, flexShrink: 0, background: `linear-gradient(90deg,${hue}00,${hue}66 22%,${hue}52 70%,${hue}00)` }} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 7 }}>
        <IconTower plan={plan} hue={hue} b={b} />
        <Display kind={kind} plan={plan} hue={hue} b={b} live={live} still={still} idx={idx} />
      </div>
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
export { THK }

/* 屏幕内漂浮数据粒子：4 枚错峰小点，给屏幕区「数据在流动」的体感。
   位置/尺寸/节拍各不相同，避免读作整齐点阵。全部走 transform + opacity。 */
const MOTE_LIST = [
  { left: '16%', bottom: '10%', size: 2, delay: 0, dur: 4.2 },
  { left: '40%', bottom: '6%', size: 1.6, delay: 1.1, dur: 3.7 },
  { left: '64%', bottom: '18%', size: 2.6, delay: 2.4, dur: 4.6 },
  { left: '84%', bottom: '8%', size: 1.4, delay: 0.6, dur: 4.0 },
]
function Motes({ hue }) {
  return (
    <>
      {MOTE_LIST.map((m, i) => (
        <span
          key={i}
          aria-hidden
          className="ap-mote"
          style={{
            position: 'absolute',
            left: m.left,
            bottom: m.bottom,
            width: m.size,
            height: m.size,
            borderRadius: '50%',
            background: hue,
            boxShadow: `0 0 6px ${hue}, 0 0 12px ${hue}66`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.dur}s`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

export default function AgentPanel({ index, beat, live, still = false, yaw = 0, pitch = 0 }) {
  const hue = HUES[index]
  const plan = planAt(index)
  const { app, en, n, sub } = APPS[index]
  const { w, h } = HERO
  /* 板厚与溢出量：与 ChainPanels 那层同一个算法（溢出 = t·sin(转角)，t=26px ≈ 10cm）。
     量在 data-plate 那层之外，所以 tmp/ai-flow.mjs 量到的牌 rect 不跟着长 */
  const tx = -Math.sin(yaw) * THK
  const ty = -Math.sin(pitch) * THK
  return (
    <div data-plate={index} style={{ position: 'relative', width: w, height: h }}>
      {/* 聚焦背板光晕：只在 live 时挂，一圈柔色呼吸光把中央那块从背景里托出来。
          放在背板之前（z 最低），不参与切角裁剪，光晕要溢出牌边才有体积感 */}
      {live && !still && (
        <span
          aria-hidden
          className="ap-halo"
          style={{
            position: 'absolute',
            inset: '-18px',
            borderRadius: 18,
            background: `radial-gradient(closest-side, ${hue}55, ${hue}14 55%, transparent 78%)`,
            filter: 'blur(6px)',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* 背板：先画，永远在玻璃面之下。只从近侧棱溢出几 px，其余藏在半透面板面后面 */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(var(--ptx, ${tx.toFixed(2)}px), var(--pty, ${ty.toFixed(2)}px))`,
          clipPath: cut(14),
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
          padding: '0 8px 7px',
          clipPath: cut(14),
          overflow: 'hidden',
          color: '#fff',
          userSelect: 'none',
          background: [
            'radial-gradient(125% 105% at 50% 44%,rgba(0,0,0,0) 52%,rgba(0,0,0,0.38) 100%)',
            'linear-gradient(180deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.08) 10%,rgba(255,255,255,0) 22%)',
            `radial-gradient(160px 74px at 10% -12%,rgba(255,255,255,0.24),rgba(255,255,255,0) 70%)`,
            `linear-gradient(0deg,${hue}4d 0%,${hue}1c 7%,${hue}00 16%)`,
            /* 网格从白 0.022 提到通道色 0.043：原来那层在深底上根本看不见，
               牌就成了一块没有刻度的灰板。染成通道色后它读作仪器面板的坐标纸，
               而且每块牌的网格跟着自己的色相走，五块并排能一眼分出彼此 */
            `repeating-linear-gradient(0deg,${hue}0b 0 1px,transparent 1px 13px)`,
            `repeating-linear-gradient(90deg,${hue}0b 0 1px,transparent 1px 13px)`,
            /* bezel 自身的明度跨度拉开（顶 33,42,70 → 底 5,8,15），屏面压黑
               （见 screenBox）：原来框与屏落在同一个深灰值上，整块牌读作一张
               平贴的暗卡。提亮只走 bezel 的上下梯度，不往上叠白膜 —— 叠过
               0.26 的一版把标题区糊成了一片奶白，字反而比原来更难认 */
            'linear-gradient(168deg,rgba(33,42,70,0.95) 0%,rgba(14,19,34,0.96) 52%,rgba(5,8,15,0.98) 100%)',
          ].join(','),
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.42)',
            'inset 1px 0 0 rgba(255,255,255,0.11)',
            /* 一圈实边：牌缩到屏幕上 200px 时，柔光 inset 会糊成一团，
               只有 1px 的硬边还立得住轮廓 */
            `inset 0 0 0 1px ${hue}3d`,
            `inset -1px 0 0 ${hue}2e`,
            `inset 0 -1px 0 ${hue}66`,
            `inset 0 0 22px ${hue}1a`,
            /* 只有正在聚焦的那一块往外发光：五块一起发光就等于没有一块发光。
               两层 —— 近圈实色勾出轮廓边、远圈柔色把它从背景里托出来，
               再加一圈同色大半径氛围光，让中央那块读作「正在工作的核心」 */
            live ? `0 0 18px ${hue}66, 0 0 44px ${hue}33, 0 0 90px ${hue}1f` : '0 0 0 rgba(0,0,0,0)',
          ].join(','),
          opacity: live ? 1 : 0.95,
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
      {/* 全息扫光：一道斜向高光从左扫到右，给玻璃面一层「活的」质感。
          只在 live 时挂 —— 五块一起扫会把视线撕成碎片。走 transform，
          不触发重绘；skewX 把光带拉成斜条，与切角方向一致 */}
      {live && !still && (
        <span
          aria-hidden
          className="ap-sheen"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `linear-gradient(105deg,rgba(255,255,255,0) 40%,rgba(255,255,255,0.16) 48%,${hue}33 52%,rgba(255,255,255,0.14) 56%,rgba(255,255,255,0) 64%)`,
          }}
        />
      )}
      {/* 能量描边：沿切角内缘跑一圈通道色光流，只有聚焦的那块在跑 ——
          一圈静止的虚线只是装饰，一圈流动的虚线读作「这块界面正在通电」。
          SVG 用与面板同尺寸的 viewBox，path 按 inset 3px 描切角轮廓，
          stroke-dasharray 让一段 80px 光在 900 总长的虚线上循环 */}
      {live && !still && (
        <svg
          aria-hidden
          className="ap-perimeter"
          viewBox="0 0 288 178"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <path
            d="M 3 3 L 271 3 L 285 17 L 285 175 L 3 175 Z"
            fill="none"
            stroke={hue}
            strokeWidth="1.5"
            strokeDasharray="80 820"
            strokeLinecap="round"
          />
        </svg>
      )}
      {/* 三枚 L 形刻线（右上角是切角，不放）：一块仪表盘的「仪器感」不在花边，
          在这几道角标 —— 零动画成本，缩放后也不会糊。
          聚焦的那块给角标加一圈同色发光 + 呼吸脉冲，让"正在被选中"的体感
          不靠整块发光，而靠这四个角同时亮起来 */}
      {[
        { box: { left: 0, top: 0 }, edges: ['left', 'top'] },
        { box: { left: 0, bottom: 0 }, edges: ['left', 'bottom'] },
        { box: { right: 0, bottom: 0 }, edges: ['right', 'bottom'] },
      ].map((p, i) => (
        <span
          key={i}
          aria-hidden
          className={live && !still ? 'ap-bracket-live' : undefined}
          style={{
            position: 'absolute',
            ...p.box,
            width: 9,
            height: 9,
            pointerEvents: 'none',
            opacity: 0.9,
            borderLeft: p.edges.includes('left') ? `1.5px solid ${hue}cc` : undefined,
            borderTop: p.edges.includes('top') ? `1.5px solid ${hue}cc` : undefined,
            borderRight: p.edges.includes('right') ? `1.5px solid ${hue}cc` : undefined,
            borderBottom: p.edges.includes('bottom') ? `1.5px solid ${hue}cc` : undefined,
            boxShadow: live ? `0 0 6px ${hue}, 0 0 10px ${hue}66` : 'none',
          }}
        />
      ))}
      {/* 扫描带：只有正在发言的那一块有 —— 一条 16px 的青蓝光带自上而下扫过，
          读作「这块界面正在出数」，而不是一块静态贴图。走 transform/opacity，
          不碰布局；整屏同时最多只有一块在扫 */}
      {live && (
        <span
          aria-hidden
          className="ap-scan"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 16,
            pointerEvents: 'none',
            background: `linear-gradient(180deg,${hue}00 0%,${hue}44 55%,${hue}bb 96%,${hue}00 100%)`,
            '--ap-h': `${h}px`,
          }}
        />
      )}

      {/* ―― 标题栏：三枚窗控点 + 方案简称 + 培养定位 + 编号/聚焦态 ―― */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, height: 28, flexShrink: 0 }}>
        <span style={{ display: 'flex', gap: 2.5, flexShrink: 0 }}>
          {[hue, 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.16)'].map((c, i) => (
            <span
              key={i}
              style={{
                width: 4.5,
                height: 4.5,
                borderRadius: 4,
                background: c,
                boxShadow: i === 0 && live ? `0 0 6px ${hue}` : 'none',
                /* 第一枚窗控点在发言时呼吸：一条 1.9s 的 opacity 脉冲，
                   比常亮读得出「它在跑」 */
                animation: i === 0 && live ? 'ap-pulse 1.9s ease-in-out infinite' : undefined,
              }}
            />
          ))}
        </span>
        <span style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 600, letterSpacing: 0.2, color: live ? '#fff' : 'rgba(255,255,255,0.94)', whiteSpace: 'nowrap' }}>{app}</span>
        <span style={{ fontFamily: SANS, fontSize: 10, color: 'rgba(255,255,255,0.66)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{sub}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Chip t={live ? 'FOCUS' : `${n}/05`} c={live ? hue : `${hue}cc`} solid={live} />
        </span>
      </div>
      <div style={{ position: 'relative', height: 1, margin: '0 -8px 3px', background: `linear-gradient(90deg,${hue}00,${hue}66 22%,${hue}52 70%,${hue}00)` }} />

      {/* ―― 板心：五块统一用主牌完整版式，谁轮到中央谁就读全 ―― */}
      <HeroBody plan={plan} hue={hue} b={beat} live={live} still={still} kind={DISPLAY[index] || 'terminal'} idx={index} />

      {/* ―― 底部状态行：一块真界面永远有一条在跑的系统信息 ―― */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 10, flexShrink: 0 }}>
        <Mono v={live ? '● focus' : '○ standby'} s={8} c={live ? hue : 'rgba(255,255,255,0.55)'} />
        <span style={{ flex: 1, minWidth: 0, height: 1, background: 'rgba(255,255,255,0.14)' }} />
        {/* 五格信号条：按 beat 逐格点亮 —— 一条在跑的系统读数，比写死的字更像活的 */}
        <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {[0, 1, 2, 3, 4].map((k) => (
            <span
              key={k}
              style={{
                width: 3,
                height: k === beat % 5 ? 6 : 3,
                borderRadius: 1,
                background: k === beat % 5 ? hue : `${hue}40`,
                transition: `height .35s ${EASE}, background .35s ${EASE}`,
              }}
            />
          ))}
        </span>
        <Mono v={en} s={7.5} c="rgba(255,255,255,0.52)" />
        <Mono v={`${n}/${pad(solutionPlans.length)}`} s={8} c={`${hue}dd`} />
      </div>
      </div>
    </div>
  )
}
