import { useId } from 'react'
import { CHINA_PATH, MAP_CITIES, MAP_VB } from '../../data/coBuildMap'

/* ============================================================
 * 专业共建 · 结算用的全国服务地图
 * ------------------------------------------------------------
 * 六条通道全部贯通后，核心那枚白盘缩成一粒「种子」落到北京，
 * 浅色中国地图浮现，29 座主要城市按离北京的距离依次弹出品牌徽标，
 * 最后从首都拉出八条干线、扫一道掠光 —— 此后常驻不重置。
 *
 * 地图是离线生成的单条 path（见 data/coBuildMap.js），不引 echarts、
 * 不引任何地图库，整块就是一张会动的 SVG，窄屏只是等比缩小。
 * 所有循环都带 fw-loop，滚出视口随舞台一起停摆。
 * ============================================================ */

const PIN_R = 5.25
const HOME_R = 6.6
const STEP = 0.06
const PIN_AT = 1.3
const ARC_AT = PIN_AT + MAP_CITIES.length * STEP + 0.25

const HOME = MAP_CITIES[0]
const HUBS = ['上海', '广州', '成都', '乌鲁木齐', '哈尔滨', '昆明', '西安', '武汉']

/* 干线：北京到八个枢纽。控制点沿法线外推、左右交替，弧线绕开密集的城市徽标，
   读起来像航线而不是直线网；短程也给一个最小弓高，否则整条会被沿途针脚吃掉。 */
const ARCS = HUBS.map((name, i) => {
  const c = MAP_CITIES.find((p) => p.name === name)
  const dx = c.x - HOME.x
  const dy = c.y - HOME.y
  const len = Math.hypot(dx, dy) || 1
  const bow = Math.max(len * 0.34, 15) * (i % 2 ? 1 : -1)
  const mx = (HOME.x + c.x) / 2 - (dy / len) * bow
  const my = (HOME.y + c.y) / 2 + (dx / len) * bow
  return { name, i, d: `M${HOME.x} ${HOME.y} Q${mx.toFixed(1)} ${my.toFixed(1)} ${c.x} ${c.y}` }
})

const MARK_D =
  'M55.5 41H156.5V62L79.5 150L80.5 153H117.5V125L136.5 104V153H156.5V171H55.5V150L75.5 128V59H55.5Z M93.5 59H131.5L93.5 102Z'

export function CoverageMap({ on, live, compact = false, recall = false }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  const mark = `fw-mark-${raw}`
  const clip = `fw-clip-${raw}`
  const land = `fw-land-${raw}`
  const sweep = `fw-sweep-${raw}`
  const loop = live ? 'fw-loop' : ''
  return (
    <svg
      viewBox={`0 0 ${MAP_VB.w} ${MAP_VB.h}`}
      aria-hidden
      className={`fw-map pointer-events-none absolute left-1/2 top-1/2 w-[86%] -translate-x-1/2 -translate-y-1/2 overflow-visible ${on ? 'is-on' : ''} ${recall ? 'is-recall' : ''}`}
    >
      <defs>
        <symbol id={mark} viewBox="0 0 212 212">
          <circle cx="106" cy="106" r="106" fill="#3A9CF3" />
          <path fill="#ffffff" fillRule="evenodd" d={MARK_D} />
        </symbol>
        <clipPath id={clip}>
          <path d={CHINA_PATH} />
        </clipPath>
        <linearGradient id={land} x1="0.15" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#e2edff" />
          <stop offset="1" stopColor="#bcd5f1" />
        </linearGradient>
        <linearGradient id={sweep} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path className="fw-map-halo" d={CHINA_PATH} fill="none" stroke="#9cc4ee" strokeWidth="3.4" strokeOpacity="0.55" />
      <path d={CHINA_PATH} fill={`url(#${land})`} stroke="#6ba3dc" strokeWidth="0.8" strokeLinejoin="round" />

      <g clipPath={`url(#${clip})`}>
        <rect className={`fw-map-sweep ${loop}`} x="-64" y="-4" width="64" height={MAP_VB.h + 8} fill={`url(#${sweep})`} />
        <circle
          className="fw-map-wave"
          cx={HOME.x}
          cy={HOME.y}
          r="30"
          fill="none"
          stroke="#3A9CF3"
          strokeWidth="2.4"
          style={{ transformOrigin: `${HOME.x}px ${HOME.y}px` }}
        />
      </g>

      {!compact &&
        ARCS.map((a) => (
          <g key={a.name} className="fw-arc" style={{ '--i': a.i }}>
            <path d={a.d} pathLength="100" fill="none" stroke="#2f8fe8" strokeOpacity="0.5" strokeWidth="1.1" className="fw-arc-line" />
            <path
              d={a.d}
              pathLength="100"
              fill="none"
              stroke="#1677ff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="3 97"
              className={`fw-arc-spark ${loop}`}
            />
          </g>
        ))}

      {MAP_CITIES.map((c, i) => {
        const home = i === 0
        const r = home ? HOME_R : PIN_R
        const origin = { transformOrigin: `${c.x}px ${c.y}px` }
        return (
          <g key={c.name} className={`fw-pin ${loop}`} style={{ ...origin, '--i': i }}>
            <circle className="fw-pin-wave" cx={c.x} cy={c.y} r={r + 1.5} fill="none" stroke="#3A9CF3" strokeWidth="1.4" style={origin} />
            {home && (
              <circle
                className={`fw-pin-home ${loop}`}
                cx={c.x}
                cy={c.y}
                r={r + 3.4}
                fill="none"
                stroke="#3A9CF3"
                strokeOpacity="0.5"
                strokeWidth="0.9"
                strokeDasharray="3 3.6"
                style={origin}
              />
            )}
            <circle cx={c.x} cy={c.y} r={r + 1} fill="#ffffff" fillOpacity="0.94" />
            <use href={`#${mark}`} x={c.x - r} y={c.y - r} width={r * 2} height={r * 2} />
          </g>
        )
      })}
    </svg>
  )
}

export const coverageCss = `
  .fw-map g, .fw-map circle, .fw-map path, .fw-map rect, .fw-map use { transform-box: view-box; }
  .fw-map { opacity: 0; scale: .82; transition: opacity .7s ease, scale .9s cubic-bezier(.2,.9,.25,1); }
  .fw-map.is-on { opacity: 1; scale: 1; transition: opacity .8s ease .45s, scale 1s cubic-bezier(.2,.9,.25,1) .45s; }
  /* 第 14 秒整张图被合环吸回去：针脚保持原位，整块缩着淡出 */
  .fw-map.is-recall { opacity: 0; scale: .74; transition: opacity .62s ease .12s, scale .74s cubic-bezier(.5,0,.35,1) .12s; }
  .fw-map-halo { opacity: .5; }

  /* 城市徽标：从首都向外一圈圈弹开，落地各自炸一道涟漪 */
  .fw-pin { opacity: 0; }
  @keyframes fw-pin-in { 0% { opacity: 0; scale: .2 } 62% { opacity: 1; scale: 1.34 } 100% { opacity: 1; scale: 1 } }
  @keyframes fw-pin-breathe { 0%,100% { opacity: 1 } 50% { opacity: .72 } }
  .fw-map.is-on .fw-pin { animation: fw-pin-in .52s cubic-bezier(.3,1.5,.5,1) both; animation-delay: calc(${PIN_AT}s + var(--i) * ${STEP}s); }
  .fw-map.is-on .fw-pin.fw-loop {
    animation: fw-pin-in .52s cubic-bezier(.3,1.5,.5,1) both, fw-pin-breathe 3.8s ease-in-out infinite;
    animation-delay: calc(${PIN_AT}s + var(--i) * ${STEP}s), calc(${PIN_AT + 1.2}s + var(--i) * ${STEP}s);
  }
  .fw-pin-wave { opacity: 0; }
  @keyframes fw-pin-wave { 0% { opacity: .8; scale: .35 } 100% { opacity: 0; scale: 2.7 } }
  .fw-map.is-on .fw-pin-wave { animation: fw-pin-wave .95s cubic-bezier(.16,1,.3,1) both; animation-delay: calc(${PIN_AT + 0.06}s + var(--i) * ${STEP}s); }
  @keyframes fw-pin-home { to { rotate: 360deg } }
  .fw-map.is-on .fw-pin-home.fw-loop { animation: fw-pin-home 14s linear infinite; }

  /* 干线：全部落地后才从首都拉出去，之后一颗光点常驻巡航 */
  .fw-arc-line { stroke-dasharray: 100; stroke-dashoffset: 100; }
  @keyframes fw-arc-draw { to { stroke-dashoffset: 0 } }
  .fw-map.is-on .fw-arc-line { animation: fw-arc-draw .85s cubic-bezier(.36,0,.24,1) both; animation-delay: calc(${ARC_AT}s + var(--i) * .07s); }
  .fw-arc-spark { opacity: 0; stroke-dashoffset: 3; }
  @keyframes fw-arc-run { 0% { stroke-dashoffset: 3; opacity: 0 } 12% { opacity: .95 } 88% { opacity: .95 } 100% { stroke-dashoffset: -97; opacity: 0 } }
  .fw-map.is-on .fw-arc-spark.fw-loop { animation: fw-arc-run 2.6s cubic-bezier(.5,0,.5,1) infinite; animation-delay: calc(${ARC_AT + 0.9}s + var(--i) * .21s); }

  /* 掠光与全国波纹：只在陆地里走，边缘天然被国界裁住 */
  .fw-map-sweep { opacity: 0; }
  @keyframes fw-map-sweep { 0% { translate: 0 0; opacity: 0 } 12% { opacity: .6 } 88% { opacity: .6 } 100% { translate: 330px 0; opacity: 0 } }
  .fw-map.is-on .fw-map-sweep.fw-loop { animation: fw-map-sweep 5.4s cubic-bezier(.4,0,.4,1) infinite; animation-delay: ${ARC_AT + 0.6}s; }
  .fw-map-wave { opacity: 0; }
  @keyframes fw-map-wave { 0% { opacity: .55; scale: .2 } 100% { opacity: 0; scale: 7.5 } }
  .fw-map.is-on .fw-map-wave { animation: fw-map-wave 1.7s cubic-bezier(.16,1,.3,1) both; animation-delay: ${ARC_AT}s; }

  @media (prefers-reduced-motion: reduce) {
    .fw-map, .fw-pin, .fw-pin-wave, .fw-pin-home, .fw-arc-line, .fw-arc-spark,
    .fw-map-sweep, .fw-map-wave { animation: none; transition: none; }
    .fw-map { opacity: 1; scale: 1; }
    .fw-pin { opacity: 1; scale: 1; }
    .fw-pin-wave, .fw-map-sweep, .fw-map-wave, .fw-arc-spark { opacity: 0; }
    .fw-arc-line { stroke-dashoffset: 0; }
  }
`