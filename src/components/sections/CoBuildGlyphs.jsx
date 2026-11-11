import { useId } from 'react'

/* ============================================================
 * 专业共建 · 六枚会讲故事的通道徽标
 * ------------------------------------------------------------
 * 每个维度一枚手绘 SVG 小场景，选中才上演自己的那段动作：
 *   01 评估仪表 —— 指针寻北式摆动 + 刻度逐格点亮 + 弧线巡航
 *   02 师资提升 —— 小人从左滑入站定，学位帽反复落下扣上，流苏甩两下
 *   03 科研创新 —— 滴管捏一下，液滴坠入烧杯，烧杯倾斜摇匀、液面保持水平、气泡上浮
 *   04 课程建设 —— 书页绕书脊翻过去又翻回来
 *   05 实践教学 —— 机柜底层常驻，上面两层依次滑入上架，指示灯呼吸、扫描线掠过
 *   06 社会服务 —— 话筒升起，网罩逐格亮起，两侧声波一轮轮推出去，直播灯呼吸
 *
 * 静止态就是动作的「完成 pose」，所以未选中 / prefers-reduced-motion
 * 看到的仍是一枚完整好看的图标，而不是半截动画。
 * 所有动画都挂在 .cg-on 下，且带 fw-loop —— 滚出视口时随舞台一起停摆。
 * 颜色：描边吃 currentColor（= 通道 ink），强调面吃 --g（= 通道 hue）。
 * ============================================================ */

export function ChannelGlyph({ n, active, reduced, size = 26 }) {
  const raw = useId()
  const uid = raw.replace(/[^a-zA-Z0-9]/g, '')
  const on = active && !reduced
  const px = on ? Math.round(size * 1.6) : size
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`cg ${on ? 'cg-on' : ''}`}
      style={{
        '--g': 'var(--ch)',
        width: px,
        height: px,
        transition: 'width .5s cubic-bezier(.2,.8,.2,1), height .5s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      {n === '01' && <Dial />}
      {n === '02' && <Scholar />}
      {n === '03' && <Flask uid={uid} />}
      {n === '04' && <Book />}
      {n === '05' && <Rack />}
      {n === '06' && <Mic />}
    </svg>
  )
}

/* 01 · 评估仪表：刻度盘 + 双色指针 + 巡航弧 */
function Dial() {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    const x1 = 32 + Math.cos(a) * 17.5
    const y1 = 32 + Math.sin(a) * 17.5
    const x2 = 32 + Math.cos(a) * 21
    const y2 = 32 + Math.sin(a) * 21
    return <line key={i} className="cg-tick fw-loop" style={{ '--i': i }} x1={x1} y1={y1} x2={x2} y2={y2} strokeOpacity="0.55" />
  })
  return (
    <>
      <circle cx="32" cy="32" r="21" />
      <circle cx="32" cy="32" r="14" strokeOpacity="0.3" strokeDasharray="2 4" />
      {ticks}
      <circle
        className="cg-arc fw-loop"
        cx="32"
        cy="32"
        r="21"
        pathLength="100"
        stroke="var(--g)"
        strokeWidth="2.6"
        strokeDasharray="16 84"
      />
      <g className="cg-needle fw-loop">
        <path d="M32 13 L35.6 32 L28.4 32 Z" fill="var(--g)" stroke="none" />
        <path d="M32 51 L35.6 32 L28.4 32 Z" fill="currentColor" fillOpacity="0.28" stroke="none" />
      </g>
      <circle cx="32" cy="32" r="2.6" fill="currentColor" stroke="none" />
    </>
  )
}

/* 02 · 师资提升：小人滑入站定 + 学位帽反复落下 + 流苏摆动 */
function Scholar() {
  return (
    <>
      <g className="cg-person fw-loop">
        <circle cx="32" cy="33" r="7.5" />
        <path d="M18 52 C18 44.5 24.3 40.5 32 40.5 C39.7 40.5 46 44.5 46 52" />
      </g>
      <g className="cg-cap fw-loop">
        <path d="M24.5 25 V30.5 C24.5 33.6 39.5 33.6 39.5 30.5 V25" />
        <path d="M32 13.5 L51 21.5 L32 29.5 L13 21.5 Z" fill="var(--g)" fillOpacity="0.2" />
        <g className="cg-tassel fw-loop">
          <path d="M51 21.5 V31" />
          <circle cx="51" cy="33.4" r="2.4" fill="var(--g)" stroke="none" />
        </g>
      </g>
      <g className="cg-spark fw-loop" stroke="var(--g)" strokeWidth="1.8">
        <path d="M12 34 v5 M9.5 36.5 h5" />
        <path d="M52 44 v4 M50 46 h4" />
      </g>
    </>
  )
}

/* 03 · 科研创新：滴管 + 坠落的液滴 + 烧杯倾斜摇匀（液面始终水平）与气泡 */
function Flask({ uid }) {
  const clip = `cg-flask-${uid}`
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d="M29.6 18.6 V30.4 L18.3 48.6 C16.7 51.8 18.8 55.4 22.6 55.4 H41.4 C45.2 55.4 47.3 51.8 45.7 48.6 L34.4 30.4 V18.6 Z" />
        </clipPath>
      </defs>
      <g className="cg-tilt fw-loop">
        <g clipPath={`url(#${clip})`}>
          <g className="cg-level fw-loop">
            <g className="cg-liquid fw-loop">
              <rect x="10" y="44" width="44" height="20" fill="var(--g)" fillOpacity="0.3" stroke="none" />
              <path d="M10 44 q6 -3 12 0 t12 0 t12 0 t12 0" stroke="var(--g)" strokeWidth="1.8" />
            </g>
          </g>
          <circle className="cg-bub fw-loop" style={{ '--i': 0 }} cx="26" cy="53" r="1.7" fill="var(--g)" fillOpacity="0.7" stroke="none" />
          <circle className="cg-bub fw-loop" style={{ '--i': 1 }} cx="33" cy="54" r="1.3" fill="var(--g)" fillOpacity="0.7" stroke="none" />
          <circle className="cg-bub fw-loop" style={{ '--i': 2 }} cx="39" cy="52.5" r="1.5" fill="var(--g)" fillOpacity="0.7" stroke="none" />
        </g>
        <path d="M26 18 H38" />
        <path d="M29 18 V30 L17.5 48 C15.5 52 18 56 22.5 56 H41.5 C46 56 48.5 52 46.5 48 L35 30 V18" />
        <path d="M22 44 H27 M22 49 H25" strokeOpacity="0.4" strokeWidth="1.6" />
        <circle className="cg-splash fw-loop" cx="32" cy="44" r="3.4" stroke="var(--g)" strokeWidth="1.6" />
      </g>
      <g className="cg-dropper fw-loop">
        <circle className="cg-bulb fw-loop" cx="32" cy="5.5" r="3.6" fill="var(--g)" fillOpacity="0.28" />
        <path d="M30.2 8.6 L30.8 13.5 H33.2 L33.8 8.6" />
      </g>
      <circle className="cg-drop fw-loop" cx="32" cy="16" r="2.3" fill="var(--g)" stroke="none" />
    </>
  )
}

/* 04 · 课程建设：摊开的书 + 绕书脊翻页 */
function Book() {
  return (
    <>
      <path d="M32 20 C26.5 16.5 19 15.2 12 16.4 V46.4 C19 45.2 26.5 46.5 32 50" />
      <path d="M32 20 C37.5 16.5 45 15.2 52 16.4 V46.4 C45 45.2 37.5 46.5 32 50" />
      <path d="M32 20 V50" strokeOpacity="0.45" />
      <g strokeOpacity="0.35" strokeWidth="1.7">
        <path d="M17 25 H27 M17 31 H27 M17 37 H24" />
        <path d="M37 25 H47 M37 31 H47 M37 37 H44" />
      </g>
      <g className="cg-page fw-loop">
        <path
          d="M32 20 C37.5 16.5 45 15.2 52 16.4 V46.4 C45 45.2 37.5 46.5 32 50 Z"
          fill="var(--g)"
          fillOpacity="0.16"
        />
        <path d="M37 25 H47 M37 31 H47 M37 37 H44" strokeOpacity="0.5" strokeWidth="1.7" />
      </g>
    </>
  )
}

/* 05 · 实践教学：机柜与底层设备常驻，上面两层依次滑入上架，指示灯呼吸、扫描线掠过 */
function Rack() {
  return (
    <>
      <rect x="11" y="9" width="42" height="46" rx="4" strokeOpacity="0.32" />
      <path d="M17 55 V58 M47 55 V58" strokeOpacity="0.32" />
      <g className="cg-m1 fw-loop">
        <rect x="15" y="39" width="34" height="11" rx="2.5" />
        <circle className="cg-led fw-loop" style={{ '--i': 0 }} cx="20" cy="44.5" r="1.9" fill="var(--g)" stroke="none" />
        <path d="M25 44.5 H44" strokeOpacity="0.4" strokeWidth="1.7" />
      </g>
      <g className="cg-m2 fw-loop">
        <rect x="15" y="26.5" width="34" height="11" rx="2.5" />
        <circle className="cg-led fw-loop" style={{ '--i': 1 }} cx="20" cy="32" r="1.9" fill="var(--g)" stroke="none" />
        <path d="M25 32 H44" strokeOpacity="0.4" strokeWidth="1.7" />
      </g>
      <g className="cg-m3 fw-loop">
        <rect x="15" y="14" width="34" height="11" rx="2.5" />
        <circle className="cg-led fw-loop" style={{ '--i': 2 }} cx="20" cy="19.5" r="1.9" fill="var(--g)" stroke="none" />
        <path d="M25 19.5 H44" strokeOpacity="0.4" strokeWidth="1.7" />
      </g>
      <path className="cg-rackscan fw-loop" d="M13 14 H51" stroke="var(--g)" strokeWidth="1.6" />
    </>
  )
}

/* 06 · 社会服务：话筒升起立定 + 网罩逐格亮 + 两侧声波一轮轮推出去 + 直播灯呼吸 */
function Mic() {
  return (
    <>
      <g className="cg-mic fw-loop">
        <g className="cg-mic-sway fw-loop">
          <rect x="25" y="9" width="14" height="26" rx="7" fill="var(--g)" fillOpacity="0.18" />
          <g strokeOpacity="0.55" strokeWidth="1.6">
            <path className="cg-grille fw-loop" style={{ '--i': 0 }} d="M28.5 16 H35.5" />
            <path className="cg-grille fw-loop" style={{ '--i': 1 }} d="M28.5 21 H35.5" />
            <path className="cg-grille fw-loop" style={{ '--i': 2 }} d="M28.5 26 H35.5" />
          </g>
          <path d="M20 28.5 V31 a12 12 0 0 0 24 0 v-2.5" />
          <path d="M32 43 V51" />
          <path d="M23.5 52 H40.5" />
        </g>
      </g>
      <circle className="cg-live fw-loop" cx="46" cy="11.5" r="2.6" fill="var(--g)" stroke="none" />
      <g stroke="var(--g)" strokeWidth="1.8" fill="none">
        <path className="cg-wave fw-loop" style={{ '--i': 0 }} d="M18 19 A 8 8 0 0 0 18 31" />
        <path className="cg-wave fw-loop" style={{ '--i': 1 }} d="M13 15 A 13 13 0 0 0 13 35" />
        <path className="cg-wave fw-loop" style={{ '--i': 0 }} d="M46 19 A 8 8 0 0 1 46 31" />
        <path className="cg-wave fw-loop" style={{ '--i': 1 }} d="M51 15 A 13 13 0 0 1 51 35" />
      </g>
    </>
  )
}

/* 动画全部只在 .cg-on 下生效；静止态即完成 pose。
   位移 / 旋转 / 缩放都基于 view-box，原点默认 (32,32)。 */
export const glyphCss = `
  .cg g, .cg circle, .cg rect, .cg path, .cg line { transform-box: view-box; }
  .cg .cg-tick { opacity: .55; }

  /* 01 仪表 */
  @keyframes cg-needle {
    0% { rotate: 0deg } 16% { rotate: 128deg } 26% { rotate: 112deg }
    46% { rotate: 246deg } 56% { rotate: 232deg } 78% { rotate: 360deg } 100% { rotate: 360deg }
  }
  .cg-on .cg-needle { transform-origin: 32px 32px; animation: cg-needle 4.6s cubic-bezier(.4,0,.2,1) infinite; }
  @keyframes cg-arc { to { rotate: 360deg } }
  .cg-on .cg-arc { transform-origin: 32px 32px; animation: cg-arc 4.6s linear infinite; }
  @keyframes cg-tick { 0%,100% { opacity: .3 } 12% { opacity: 1 } 30% { opacity: .3 } }
  .cg-on .cg-tick { animation: cg-tick 4.6s ease-out infinite; animation-delay: calc(var(--i) * .12s); }

  /* 02 学位帽 */
  /* 小人滑进来就站住不走，帽子反复落下抬起 —— 六边形任何一帧都有主体 */
  @keyframes cg-person-in { 0% { translate: -26px 0; opacity: 0 } 100% { translate: 0 0; opacity: 1 } }
  @keyframes cg-person-bob { 0%,100% { translate: 0 0 } 50% { translate: 0 -1.6px } }
  .cg-on .cg-person { animation: cg-person-in .6s cubic-bezier(.2,.8,.2,1) both, cg-person-bob 4.4s ease-in-out .6s infinite; }
  @keyframes cg-cap {
    0% { translate: 0 -26px; opacity: 0 } 6% { translate: 0 -26px; opacity: 1 }
    20% { translate: 0 2px } 26% { translate: 0 -3px } 32%,86% { translate: 0 0; opacity: 1 }
    94%,100% { translate: 0 -15px; opacity: 0 }
  }
  .cg-on .cg-cap { animation: cg-cap 4.4s cubic-bezier(.3,.9,.3,1) infinite; }
  @keyframes cg-tassel {
    0%,38% { rotate: 0deg } 46% { rotate: 17deg } 54% { rotate: -12deg } 62% { rotate: 7deg } 70%,100% { rotate: 0deg }
  }
  .cg-on .cg-tassel { transform-origin: 51px 21.5px; animation: cg-tassel 4.4s ease-in-out infinite; }
  @keyframes cg-spark { 0%,22% { opacity: 0; scale: .5 } 32% { opacity: 1; scale: 1 } 50%,100% { opacity: 0; scale: 1.25 } }
  .cg-on .cg-spark { transform-origin: 32px 32px; animation: cg-spark 4.4s ease-out infinite; }

  /* 03 烧杯 */
  /* 摇匀：烧杯绕杯底摆一下，液面用等量反向旋转抵消，始终保持水平。
     3.8s = 两个滴液周期，倾斜落在两滴之间，液滴永远垂直落进杯口。 */
  @keyframes cg-tilt {
    0%,50% { rotate: 0deg } 62% { rotate: -15deg } 74% { rotate: -13deg }
    86% { rotate: 2deg } 94%,100% { rotate: 0deg }
  }
  .cg-on .cg-tilt { transform-origin: 32px 56px; animation: cg-tilt 3.8s cubic-bezier(.4,0,.3,1) infinite; }
  @keyframes cg-level {
    0%,50% { rotate: 0deg } 62% { rotate: 15deg } 74% { rotate: 13deg }
    86% { rotate: -2deg } 94%,100% { rotate: 0deg }
  }
  .cg-on .cg-level { transform-origin: 32px 46px; animation: cg-level 3.8s cubic-bezier(.4,0,.3,1) infinite; }
  @keyframes cg-bulb { 0%,6% { scale: 1 1 } 10% { scale: 1 .78 } 18%,100% { scale: 1 1 } }
  .cg-on .cg-bulb { transform-origin: 32px 5.5px; animation: cg-bulb 1.9s ease-in-out infinite; }
  @keyframes cg-drop {
    0%,10% { translate: 0 0; opacity: 0 } 14% { opacity: 1 }
    74% { translate: 0 27px; opacity: 1 } 80%,100% { translate: 0 28px; opacity: 0 }
  }
  .cg-on .cg-drop { animation: cg-drop 1.9s cubic-bezier(.5,0,.9,.6) infinite; }
  @keyframes cg-splash {
    0%,74% { scale: .3; opacity: 0 } 78% { scale: .6; opacity: .9 } 100% { scale: 2.1; opacity: 0 }
  }
  .cg-on .cg-splash { transform-origin: 32px 44px; animation: cg-splash 1.9s ease-out infinite; }
  @keyframes cg-liquid { 0%,72% { translate: 0 2px } 84% { translate: 0 -1.5px } 100% { translate: 0 2px } }
  .cg-on .cg-liquid { animation: cg-liquid 1.9s ease-in-out infinite; }
  @keyframes cg-bub {
    0% { translate: 0 0; opacity: 0 } 15% { opacity: .8 } 85% { opacity: .5 } 100% { translate: 0 -11px; opacity: 0 }
  }
  .cg-on .cg-bub { animation: cg-bub 2.4s ease-in infinite; animation-delay: calc(var(--i) * .8s); }

  /* 04 翻页 */
  @keyframes cg-page { 0% { scale: 1 1 } 50% { scale: .04 1 } 100% { scale: -1 1 } }
  .cg-on .cg-page { transform-origin: 32px 32px; animation: cg-page 1.7s cubic-bezier(.45,0,.55,1) infinite alternate; }

  /* 05 机架 */
  /* 底层设备常驻不熄，上面两层依次上架再自上而下退出，机柜任何一帧都不空 */
  @keyframes cg-m1 { 0% { translate: 0 5px } 12%,88% { translate: 0 0 } 100% { translate: 0 5px } }
  .cg-on .cg-m1 { animation: cg-m1 4.6s cubic-bezier(.2,.8,.2,1) infinite; }
  @keyframes cg-m2 { 0%,14% { translate: -22px 0; opacity: 0 } 30% { translate: 0 0; opacity: 1 } 84% { translate: 0 0; opacity: 1 } 94%,100% { translate: -22px 0; opacity: 0 } }
  .cg-on .cg-m2 { animation: cg-m2 4.6s cubic-bezier(.2,.8,.2,1) infinite; }
  @keyframes cg-m3 { 0%,30% { translate: 0 -18px; opacity: 0 } 46% { translate: 0 2px; opacity: 1 } 52% { translate: 0 0 } 78% { translate: 0 0; opacity: 1 } 88%,100% { translate: 0 -18px; opacity: 0 } }
  .cg-on .cg-m3 { animation: cg-m3 4.6s cubic-bezier(.3,.9,.3,1) infinite; }
  @keyframes cg-led { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
  .cg-on .cg-led { animation: cg-led 1.3s ease-in-out infinite; animation-delay: calc(var(--i) * .42s); }
  @keyframes cg-rackscan {
    0%,54% { translate: 0 0; opacity: 0 } 58% { opacity: .9 } 80% { translate: 0 36px; opacity: .9 } 86%,100% { translate: 0 36px; opacity: 0 }
  }
  .cg-on .cg-rackscan { animation: cg-rackscan 4.6s ease-in-out infinite; }

  /* 06 话筒 */
  .cg .cg-wave { opacity: .5; }
  /* 话筒升起一次就立在台上，之后只摇摆、亮网罩、推声波，不再整支淡出 */
  @keyframes cg-mic-in { 0% { translate: 0 20px; opacity: 0 } 100% { translate: 0 0; opacity: 1 } }
  .cg-on .cg-mic { animation: cg-mic-in .7s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes cg-mic-sway {
    0%,20% { rotate: 0deg } 32% { rotate: -4deg } 46% { rotate: 3deg }
    60% { rotate: -2deg } 72%,100% { rotate: 0deg }
  }
  .cg-on .cg-mic-sway { transform-origin: 32px 52px; animation: cg-mic-sway 4.2s ease-in-out infinite; }
  @keyframes cg-grille { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
  .cg-on .cg-grille { animation: cg-grille 1.1s ease-in-out infinite; animation-delay: calc(var(--i) * .16s); }
  @keyframes cg-live { 0%,100% { opacity: .3; scale: .8 } 50% { opacity: 1; scale: 1.15 } }
  .cg-on .cg-live { transform-origin: 46px 11.5px; animation: cg-live 1.3s ease-in-out infinite; }
  @keyframes cg-wave {
    0% { opacity: 0; scale: .55 } 25% { opacity: .95 } 70%,100% { opacity: 0; scale: 1.25 }
  }
  .cg-on .cg-wave { transform-origin: 32px 25px; animation: cg-wave 1.9s ease-out infinite; animation-delay: calc(var(--i) * .35s); }

  @media (prefers-reduced-motion: reduce) {
    .cg * { animation: none !important; }
  }
`