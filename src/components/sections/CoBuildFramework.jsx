import { useEffect, useMemo, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { Reveal } from '../ui'
import { coBuildNodes, coBuildTitle } from '../../data/coBuild'
import { useContent, useContentData } from '../../lib/contentStore'

/* ============================================================
 * 专业共建框架 —— 六边形节点围绕「天择」核心展开的共建生态
 * ------------------------------------------------------------
 * 技法照搬参考稿 digital_business_ecosystem.html，不是照着图重画：
 *   ① 一张 1000×740 的坐标网格：节点位置、连线端点、落点全在同一套数字里，
 *      容器锁定同一比例，所以线和六边形永远咬合（参考稿用百分比定位 + 保留
 *      长宽比的 SVG，窗口比例一变就会错位，这里改成比例锁定后不错位）
 *   ② 连线是「常显的虚线」：5/5 虚线始终在，入场时 dashoffset 从 1000 推到 0
 *      （虚线沿路径朝节点方向滚过一段），随后叠一层 3/13 的亮虚线 4s 一段
 *      无限向前流——参考稿的 .path / .path-glow 就是这两层
 *   ③ 节点 0.72 → 1 弹入，六个错开 0.28s；悬停只加一圈辉光，不放大
 *   ④ 核心是呼吸光晕 + 两条 rotateX 压扁的轨道（12s / 18s 反向）+ 一条纵向
 *      扫描线；天择圆盘压在连线起点上，光是「从盘后出来」的
 *   ⑤ 背景网由 canvas 统一绘制：26 个锚点极慢漂移，50 条连线每帧按节点
 *      当前位置重画；节点、连线全是预分配的数组，绘制循环里不再分配对象
 *
 * 在这个骨架上补的几处「慢氛围」（都不改变内容与文案）：
 *   · 六边形里的图标各自漂浮：幅度 3~4.5px、缩放 ±3%、周期 8.6~11.4s 且相位全错开，
 *     部分略大略快形成轻微景深，读起来是浮在六个面上方，而不是在格子里闪
 *   · 中心徽标外三枚 创新 / 服务 / 专业 玻璃框锁在同一条外环上：同半径、同角速度、
 *     严格相隔 120°，外圈正向转、内层等量反向转抵消，框永远正立；整环一起轻微浮动
 *   · 以上全部在滚出视口时暂停；减弱动效时直接落成静态完整构图
 *
 * 与参考稿的差异，都是为了这块内容：
 *   · 核心的「地球」（大陆 / 经纬线）换成天择圆盘——这里的主体是品牌
 *   · 去掉底部承台（perspective 椭圆 + 光柱），它属于地球悬浮的隐喻
 *   · 深色底改浅色：青色辉光 → 品牌蓝，金色节点 → 白底蓝描边
 *   · 去掉「重播 / 暂停」按钮：本站在视口内自动起播，减少动态交给系统设置
 *   · 窄屏不是把图缩小，而是同一套节点/连线语言换成一竖轴：核心居中，
 *     上下各三个节点交替挂在轴上——缩到 154px 的六边形里放不下中文标签
 *
 * prefers-reduced-motion：连线直接画好、节点直接到位，星尘不跑，轨道/扫描/流光全停。
 * ============================================================ */

const G = { w: 1000, h: 740 }
const CORE = { x: 500, y: 370, r: 70 }
const HEX_U = 70 // 六边形半高（用户单位）；节点宽 = 14% × 1000 = 140
const HEX_PX = 14 // 节点宽度，占画布宽度的百分比

const NODES = coBuildNodes

/* 连线：从核心盘外沿（r=70，藏在圆盘下面）出发，末端落在六边形中心；
   控制点顺着参考稿的手感——0.44 处起弯、0.80 处回正，并朝同一侧偏一点，
   六条线因此像绕核心拧了一圈，而不是六根辐条。 */
const LINKS = NODES.map((n) => {
  const dx = n.x - CORE.x
  const dy = n.y - CORE.y
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const sx = CORE.x + ux * CORE.r
  const sy = CORE.y + uy * CORE.r
  const px = -uy
  const py = ux
  const c1x = sx + dx * 0.44 + px * len * 0.045
  const c1y = sy + dy * 0.44 + py * len * 0.045
  const c2x = sx + dx * 0.8 + px * len * 0.014
  const c2y = sy + dy * 0.8 + py * len * 0.014
  return {
    d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${n.x} ${n.y}`,
  }
})

const HEX_POINTS = '80,8 145,45 145,115 80,152 15,115 15,45'
const HEX_INNER = '80,18 136,50 136,110 80,142 24,110 24,50'

/* 背景网沿用参考稿的十二边形骨架，但节点改成活的：每帧按各自的慢速正弦
   轨迹算出当前位置，连线再跟着节点重画。26 个点 + 50 条边用 canvas 一笔画完，
   不占 DOM；节点与连线的坐标数组只在挂载时分配一次，绘制循环里不 new 任何东西。 */
const NET_SPACE = { w: 1000, h: 820 }
/* 节点漂移速度的整体倍率：在当前 1.2× 的基础上再 ×2.5，实际取 3.0×（相对首版慢速基准） */
const NET_SPEED = 3.0
const NET_ANCHORS = [
  // 外圈：十二边形
  [90, 230], [220, 150], [340, 205], [500, 95], [660, 180], [820, 145],
  [920, 270], [850, 500], [700, 650], [500, 740], [300, 650], [120, 500],
  // 内圈：八边形
  [350, 330], [500, 300], [650, 330], [720, 430], [650, 520], [500, 550], [350, 520], [280, 430],
  // 四角散点，把外圈再撑开一点
  [300, 120], [700, 110], [110, 380], [890, 380], [300, 720], [700, 720],
]
const NET_EDGES = [
  // 外圈
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 0],
  // 长弦
  [11, 2], [2, 9], [5, 8], [1, 4],
  // 内圈
  [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 12],
  // 内外桥接
  [0, 12], [1, 12], [3, 13], [4, 14], [5, 14], [6, 15], [6, 16], [7, 16],
  [7, 17], [8, 17], [9, 18], [10, 18], [10, 19], [11, 19],
  // 散点接线
  [1, 20], [3, 20], [3, 21], [5, 21], [11, 22], [0, 22], [6, 23], [7, 23],
  [10, 24], [9, 24], [8, 25], [9, 25],
]

/* 图标漂浮参数：dx/dy 是像素幅度（3~4.5px），s0/s1 是这条轨迹两端的缩放
   （形成景深差），周期 8.6~11.4s、delay 全不相同，所以六个图标不会同拍。 */
const ICON_FLOAT = [
  { dx: 4.5, dy: 3.2, s0: 1.04, s1: 1.005, dur: 9.1, delay: -1.6 },
  { dx: 3.4, dy: 4.2, s0: 0.975, s1: 0.995, dur: 10.9, delay: -6.2 },
  { dx: 4.1, dy: 2.9, s0: 1.02, s1: 0.99, dur: 8.6, delay: -3.9 },
  { dx: 3.1, dy: 3.8, s0: 0.965, s1: 0.99, dur: 11.4, delay: -9.4 },
  { dx: 4.2, dy: 3.5, s0: 1.035, s1: 1.005, dur: 9.8, delay: -5.1 },
  { dx: 3.6, dy: 3.1, s0: 0.99, s1: 1.02, dur: 9.5, delay: -8.3 },
]

/* 中心徽标周围的三枚浮框锁在同一条外环上：同一半径、同一周期，初始角度
   严格相隔 120°，所以任意时刻都等距。半径取场宽的 68%（始终大于圆盘半径），
   72s 一圈；delay 由初始角度换算，让它们一开始就散在三个方向。 */
const CORE_ORBIT = { r: 68, dur: 72 }
const CORE_FRAMES = [
  { label: '创新', a: -90 },
  { label: '服务', a: 30 },
  { label: '专业', a: 150 },
]
const orbitDelay = (a) => (-(((a % 360) + 360) % 360) / 360) * CORE_ORBIT.dur

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

/* 背景网：节点按各自的慢速正弦轨迹漂移，连线每帧按节点新位置重画。
   绘制节流到 30fps —— 位移速度只有每秒一两像素，30fps 看不出差别，
   但主线程的绘制开销直接减半；滚出视口 / 标签页隐藏即停。
   减弱动效时不跑循环，只画一帧完整的静态网（构图不缺任何东西）。 */
function NetField({ reduced }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const nodes = NET_ANCHORS.map(([x, y], i) => ({
      nx: x / NET_SPACE.w,
      ny: y / NET_SPACE.h,
      ax: 3.4 + (i % 4) * 1.5,
      ay: 3.2 + ((i + 2) % 4) * 1.4,
      sx: (0.17 + (i % 5) * 0.013) * NET_SPEED,
      sy: (0.14 + ((i + 3) % 5) * 0.011) * NET_SPEED,
      p: i * 1.37,
      r: 1.9 + (i % 3) * 0.5,
    }))
    let w = 0
    let h = 0
    let raf = 0
    let live = false
    let lastPaint = -1
    /* 坐标缓冲区与画笔样式都在挂载时定好，绘制循环里不再创建任何对象 */
    const xs = new Float32Array(nodes.length)
    const ys = new Float32Array(nodes.length)
    const EDGE_STYLE = 'rgba(11,15,23,0.048)'
    const DOT_STYLE = 'rgba(22,119,255,0.14)'

    const paint = (t) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const s = w / 1000
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i]
        xs[i] = n.nx * w + (Math.sin(t * n.sx + n.p) * n.ax + Math.sin(t * n.sx * 1.9 + n.p * 1.7) * n.ax * 0.3) * s
        ys[i] = n.ny * h + (Math.cos(t * n.sy + n.p * 1.3) * n.ay + Math.cos(t * n.sy * 1.7 + n.p * 0.8) * n.ay * 0.3) * s
      }

      ctx.lineWidth = 1
      ctx.strokeStyle = EDGE_STYLE
      ctx.beginPath()
      for (let i = 0; i < NET_EDGES.length; i += 1) {
        const e = NET_EDGES[i]
        ctx.moveTo(xs[e[0]], ys[e[0]])
        ctx.lineTo(xs[e[1]], ys[e[1]])
      }
      ctx.stroke()

      ctx.fillStyle = DOT_STYLE
      ctx.beginPath()
      for (let i = 0; i < nodes.length; i += 1) {
        ctx.moveTo(xs[i] + nodes[i].r * s, ys[i])
        ctx.arc(xs[i], ys[i], nodes[i].r * s, 0, Math.PI * 2)
      }
      ctx.fill()
    }

    const resize = () => {
      const box = cv.getBoundingClientRect()
      w = Math.max(1, Math.round(box.width))
      h = Math.max(1, Math.round(box.height))
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      if (reduced) paint(0)
    }

    if (reduced) {
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(cv)
      return () => ro.disconnect()
    }

    const tick = (t) => {
      if (!live) {
        raf = 0
        return
      }
      if (lastPaint < 0 || t - lastPaint >= 32) {
        paint(t / 1000)
        lastPaint = t
      }
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (live) return
      live = true
      lastPaint = -1
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      live = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    resize()
    const io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop()), {
      threshold: 0.02,
    })
    io.observe(cv)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    const ro = new ResizeObserver(() => {
      resize()
      if (!raf && live) start()
    })
    ro.observe(cv)

    return () => {
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [reduced])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-0 h-full w-full" />
}

/* 中心徽标外的三枚浮框：三枚共用同一半径与同一周期，只差 120° 的初始角度，
   所以始终等距地锁在一条外环上；外圈整体旋转（绕核心），内层等量反向旋转
   把角度抵消，框因此永远正立。整环的轻微上下浮动放在 .fw-frames 上，
   三枚同步升降，不会破坏等距读法。定角只在减弱动效时使用。 */
function OrbitFrames() {
  return (
    <div className="fw-frames pointer-events-none absolute inset-0 z-[5]">
      {CORE_FRAMES.map((f) => {
        const style = {
          '--dur': `${CORE_ORBIT.dur}s`,
          '--delay': `${orbitDelay(f.a)}s`,
          '--a': `${f.a}deg`,
        }
        return (
          <span key={f.label} className="fw-orb" style={style}>
            <span className="fw-orb-arm" style={{ '--r': `${CORE_ORBIT.r}%` }}>
              <span className="fw-orb-fix" style={style}>
                <span className="fw-orb-bob">
                  <span className="fw-frame">
                    <span className="fw-frame-dot" />
                    {f.label}
                  </span>
                </span>
              </span>
            </span>
          </span>
        )
      })}
    </div>
  )
}

/* 天择圆盘 + 轨道 + 扫描：核心场直径 216px（画布宽度的 20%），
   圆盘按参考稿 164/220 的比例缩到 78%，连线起点就藏在盘下。 */
function CoreField({ reduced, className = '', disc = 'inset-[11%]' }) {
  return (
    <div className={`fw-core relative aspect-square ${className}`}>
      <OrbitFrames />
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-[30%] rounded-full ${reduced ? '' : 'fw-breathe'}`}
        style={{
          background:
            'radial-gradient(closest-side, rgba(22,119,255,0.16), rgba(22,119,255,0.055) 54%, rgba(22,119,255,0) 74%)',
        }}
      />

      {/* 流光铺满全场之后，核心「应」一下：两道环从盘沿散开，序列就收在这里 */}
      {!reduced && (
        <>
          <span
            aria-hidden
            className="fw-bloom pointer-events-none absolute inset-[11%] rounded-full border border-brand/40"
            style={{ animationDelay: '2.8s' }}
          />
          <span
            aria-hidden
            className="fw-bloom pointer-events-none absolute inset-[11%] rounded-full border border-brand/25"
            style={{ animationDelay: '3s' }}
          />
        </>
      )}

      <span
        aria-hidden
        className={`pointer-events-none absolute inset-[3%] rounded-full border border-brand/25 ${reduced ? '' : 'fw-orbit-a'}`}
      >
        <span className="absolute left-[16%] top-[11%] h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_3px_rgba(22,119,255,0.35)]" />
      </span>
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-[7%] rounded-full border border-brand/15 ${reduced ? '' : 'fw-orbit-b'}`}
      />

      <div
        className={`absolute ${disc} overflow-hidden rounded-full bg-white ring-1 ring-brand/25 shadow-[0_26px_54px_-22px_rgba(11,74,176,0.42),0_1px_0_rgba(255,255,255,1)_inset]`}
      >
        <img
          src="/images/brand-mark.svg"
          alt="天择科技"
          width={140}
          height={140}
          decoding="async"
          className="absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 object-contain"
        />
        {!reduced && (
          <span
            aria-hidden
            className="fw-scan pointer-events-none absolute inset-x-0 top-[24%] h-px bg-[linear-gradient(90deg,transparent,rgba(22,119,255,0.4),transparent)] shadow-[0_0_8px_rgba(22,119,255,0.35)]"
          />
        )}
      </div>
    </div>
  )
}

function HexPlate({ icon: Icon, iconSize = 22, float, className = '' }) {
  return (
    <span className={`relative block aspect-square ${className}`}>
      <svg viewBox="0 0 160 160" className="block h-full w-full overflow-visible">
        <polygon points={HEX_POINTS} fill="rgba(255,255,255,0.92)" stroke="rgba(22,119,255,0.45)" strokeWidth="1.2" />
        <polygon points={HEX_INNER} fill="none" stroke="rgba(22,119,255,0.2)" strokeWidth="0.7" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-brand-text">
        <span
          className={float ? 'fw-icon-drift' : ''}
          style={
            float
              ? {
                  '--dx': `${float.dx}px`,
                  '--dy': `${float.dy}px`,
                  '--s0': float.s0,
                  '--s1': float.s1,
                  animationDuration: `${float.dur}s`,
                  animationDelay: `${float.delay}s`,
                }
              : undefined
          }
        >
          <Icon size={iconSize} strokeWidth={1.6} />
        </span>
      </span>
    </span>
  )
}

const LABEL_POS = {
  top: 'bottom-[calc(100%+2px)] left-1/2 -translate-x-1/2 text-center items-center',
  bottom: 'top-[calc(100%+2px)] left-1/2 -translate-x-1/2 text-center items-center',
  left: 'right-[calc(100%+10px)] top-1/2 -translate-y-1/2 text-right items-end',
  right: 'left-[calc(100%+10px)] top-1/2 -translate-y-1/2 text-left items-start',
}

function NodeLabel({ n, className = '' }) {
  return (
    <div className={`absolute flex flex-col whitespace-nowrap ${className}`}>
      <p className="text-[15.5px] font-semibold leading-[1.28] tracking-[-0.01em] text-ink-900">{n.title}</p>
      <p className="mt-1 text-[12px] leading-[1.4] text-ink-500">{n.sub}</p>
    </div>
  )
}

/* ―――――――――― 桌面：径向生态 ―――――――――― */
function RadialScene({ reduced, on, inView, sceneRef, nodes }) {
  return (
    <div
      ref={sceneRef}
      className={`fw-scene relative mx-auto hidden w-full max-w-[1080px] xl:block ${on ? 'is-on' : ''} ${inView ? '' : 'fw-idle'}`}
      style={{ aspectRatio: `${G.w} / ${G.h}` }}
    >
      <NetField reduced={reduced} />

      {/* 连线：底下是常显虚线的「滚过」，上面叠一层流动的亮虚线 */}
      <svg
        aria-hidden
        viewBox={`0 0 ${G.w} ${G.h}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
      >
        <defs>
          <linearGradient id="fw-link" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={G.h}>
            <stop offset="0" stopColor="#1677ff" stopOpacity="0.3" />
            <stop offset="0.55" stopColor="#1677ff" stopOpacity="0.2" />
            <stop offset="1" stopColor="#1677ff" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="fw-flow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fd0ff" />
            <stop offset="0.6" stopColor="#2e8bff" />
            <stop offset="1" stopColor="#1677ff" />
          </linearGradient>
        </defs>

        {LINKS.map((l, i) => (
          <path
            key={`l-${l.d}`}
            className="fw-link"
            d={l.d}
            fill="none"
            stroke="url(#fw-link)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
            style={{ '--d': `${i * 0.05}s` }}
          />
        ))}

        {LINKS.map((l, i) => (
          <path
            key={`g-${l.d}`}
            className="fw-glow fw-loop"
            d={l.d}
            fill="none"
            stroke="url(#fw-flow)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeDasharray="3 13"
            vectorEffect="non-scaling-stroke"
            style={{ '--d': `${2.1 + i * 0.08}s` }}
          />
        ))}
      </svg>

      {/* 核心：天择圆盘 */}
      <div className="absolute left-1/2 top-1/2 z-[3] w-[20%] -translate-x-1/2 -translate-y-1/2">
        <CoreField reduced={reduced} className="w-full" />
      </div>

      {/* 六个节点 */}
      <ul className="absolute inset-0 z-[4]">
        {nodes.map((n, i) => {
          const Icon = n.icon
          return (
            <li
              key={n.n}
              className="fw-node absolute -translate-x-1/2 -translate-y-1/2 hover:z-10"
              style={{
                left: `${n.x / 10}%`,
                top: `${(n.y / G.h) * 100}%`,
                width: `${HEX_PX}%`,
                '--d': `${0.15 + i * 0.28}s`,
              }}
            >
              <div className="group relative">
                <HexPlate
                  icon={Icon}
                  float={ICON_FLOAT[i]}
                  className="w-full transition-[filter] duration-300 group-hover:drop-shadow-[0_0_16px_rgba(22,119,255,0.4)]"
                />
                <NodeLabel n={n} className={LABEL_POS[n.side]} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ―――――――――― 窄屏：竖轴 + 左右交替 ―――――――――― */
function SpineNode({ n, i }) {
  const Icon = n.icon
  const left = i % 2 === 0
  return (
    <li
      className="fw-node-row relative z-[2] grid grid-cols-2 gap-x-14 py-3"
      style={{ '--d': `${0.1 + i * 0.1}s` }}
    >
      <div
        className={`flex flex-col ${
          left ? 'col-start-1 items-end text-right' : 'col-start-2 items-start text-left'
        }`}
      >
        <span className="relative">
          <HexPlate icon={Icon} iconSize={19} float={ICON_FLOAT[i]} className="h-[54px] w-[54px]" />
          <span
            aria-hidden
            className={`fw-branch absolute top-1/2 h-px w-7 bg-brand/25 ${left ? '-right-7 origin-right' : '-left-7 origin-left'}`}
            style={{ '--d': `${0.35 + i * 0.1}s` }}
          />
        </span>
        <p className="mt-2 text-[12.5px] font-semibold leading-[1.3] text-ink-900">{n.title}</p>
        <p className="mt-0.5 text-[11px] leading-[1.4] text-ink-500">{n.sub}</p>
      </div>
    </li>
  )
}

function SpineScene({ reduced, on, inView, sceneRef, nodes }) {
  return (
    <div
      ref={sceneRef}
      className={`fw-scene relative mx-auto mt-8 max-w-[560px] md:max-w-[640px] xl:hidden ${on ? 'is-on' : ''} ${inView ? '' : 'fw-idle'}`}
    >
      <span
        aria-hidden
        className="fw-axis absolute bottom-6 left-1/2 top-6 w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,rgba(22,119,255,0.06),rgba(22,119,255,0.3)_30%,rgba(22,119,255,0.3)_70%,rgba(22,119,255,0.06))]"
      />

      <ul className="relative">
        {nodes.slice(0, 3).map((n, i) => (
          <SpineNode key={n.n} n={n} i={i} />
        ))}
      </ul>

      <div className="relative z-[3] flex justify-center py-12">
        <CoreField reduced={reduced} className="w-[128px]" disc="inset-[9%]" />
      </div>

      <ul className="relative">
        {nodes.slice(3).map((n, i) => (
          <SpineNode key={n.n} n={n} i={i + 3} />
        ))}
      </ul>
    </div>
  )
}

export default function CoBuildFramework() {
  const reduced = useReducedMotion()
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches,
  )
  const sceneRef = useRef(null)
  const entered = useInView(sceneRef, { once: true, amount: 0.2 })
  const inView = useInView(sceneRef, { amount: 0.06 })
  const [on, setOn] = useState(false)

  /* 后台可编辑面：区块标题 + 六个节点的纯文案（title / sub）。
     坐标、图标与连线仍吃数据默认，覆盖只做文本合并，不动版式。 */
  const title = useContent('about.coBuild.title', coBuildTitle)
  const nodeOverlay = useContentData().about?.coBuild?.nodes
  const nodes = useMemo(
    () => NODES.map((n) => {
      const o = nodeOverlay?.[n.n]
      return o ? { ...n, ...o } : n
    }),
    [nodeOverlay],
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reduced || entered) setOn(true)
  }, [entered, reduced])

  return (
    <section
      id="framework"
      data-fw={on ? 'on' : 'idle'}
      className="relative isolate scroll-mt-24 overflow-hidden bg-mist-50 pb-[80px] pt-[72px]"
    >
      <style>{`
        /* ―― 入场：节点弹入（参考稿 nodeIn 0.72 → 1）―― */
        .fw-node {
          opacity: 0;
          scale: .72;
          transition:
            opacity .85s cubic-bezier(.2,.8,.2,1) var(--d, 0s),
            scale .85s cubic-bezier(.2,.8,.2,1) var(--d, 0s);
        }
        .fw-scene.is-on .fw-node { opacity: 1; scale: 1; }

        /* ―― 连线：虚线沿路径朝节点滚一段（参考稿 draw 1000 → 0）―― */
        .fw-link { stroke-dashoffset: 1000; transition: stroke-dashoffset 2.4s cubic-bezier(.42,0,.58,1) var(--d, 0s); }
        .fw-scene.is-on .fw-link { stroke-dashoffset: 0; }

        /* 流光：3/13 亮虚线，4s 一段无限向前（核心 → 节点） */
        @keyframes fw-flow { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -64; } }
        .fw-glow { opacity: 0; transition: opacity .9s ease var(--d, 2.1s); animation: fw-flow 4s linear infinite; }
        .fw-scene.is-on .fw-glow { opacity: .72; }

        /* ―― 核心：先缩后放到位（参考稿 centerIn 0.55 → 1.06 → 1），再呼吸 / 转轨道 / 扫描 ―― */
        .fw-core { opacity: 0; scale: .55; transition: opacity .5s ease .4s, scale 1.1s cubic-bezier(.34,1.42,.64,1) .4s; }
        .fw-scene.is-on .fw-core { opacity: 1; scale: 1; }

        /* 核心反应：流光铺满后的那一下，环从盘沿散开 */
        @keyframes fw-bloom { 0% { opacity: 0; scale: .92; } 16% { opacity: .9; } 100% { opacity: 0; scale: 1.34; } }
        .fw-bloom { opacity: 0; }
        .fw-scene.is-on .fw-bloom { animation: fw-bloom 1.1s cubic-bezier(.16,1,.3,1) both; }

        @keyframes fw-breathe { 0%, 100% { opacity: .62; scale: 1; } 50% { opacity: 1; scale: 1.06; } }
        .fw-breathe { animation: fw-breathe 4s ease-in-out infinite; }

        @keyframes fw-spin { to { rotate: 360deg; } }
        .fw-orbit-a { transform: rotateX(67deg) rotate(-20deg); animation: fw-spin 12s linear infinite; }
        .fw-orbit-b {
          transform: rotateX(72deg) rotate(54deg);
          animation: fw-spin 18s linear infinite reverse;
        }

        @keyframes fw-scan {
          0%, 100% { transform: translateY(-14px); opacity: 0; }
          20%, 80% { opacity: .85; }
          50% { transform: translateY(96px); }
        }
        .fw-scan { animation: fw-scan 3.5s ease-in-out infinite; }

        /* ―― 六边形内的图标：各自一条极慢漂浮轨迹（幅度 2~3px、缩放 ±3%），
              周期与相位全错开，形成轻微景深差，读起来是浮在六个面之上 ―― */
        @keyframes fw-icon-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(var(--s0, 1)); }
          30% { transform: translate3d(var(--dx, 2.5px), calc(var(--dy, 2.5px) * -0.65), 0) scale(var(--s1, 1)); }
          58% { transform: translate3d(calc(var(--dx, 2.5px) * -0.55), var(--dy, 2.5px), 0) scale(var(--s0, 1)); }
          82% { transform: translate3d(calc(var(--dx, 2.5px) * 0.35), calc(var(--dy, 2.5px) * 0.45), 0) scale(var(--s1, 1)); }
        }
        .fw-icon-drift { display: block; animation: fw-icon-float 12s ease-in-out infinite; will-change: transform; }

        /* ―― 徽标外三枚浮框：同一外环、120° 等距；外圈绕核心转，内层等量
              反向转抵消角度，框永远正立；上下浮动只给整环，三枚同步 ―― */
        .fw-frames {
          opacity: 0;
          transition: opacity .7s ease 1.15s;
          animation: fw-orb-bob 8.6s ease-in-out infinite;
        }
        .fw-scene.is-on .fw-frames { opacity: 1; }
        @keyframes fw-orb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fw-orb-spin-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes fw-orb-bob { 0%, 100% { transform: translateY(-2.5px); } 50% { transform: translateY(2.5px); } }
        .fw-orb { position: absolute; inset: 0; }
        .fw-orb-arm { position: absolute; left: calc(50% + var(--r, 68%)); top: 50%; width: 0; height: 0; }
        .fw-orb-fix { position: absolute; left: 0; top: 0; width: 0; height: 0; }
        .fw-orb {
          animation: fw-orb-spin var(--dur, 72s) linear infinite;
          animation-delay: var(--delay, 0s);
        }
        .fw-orb-fix {
          animation: fw-orb-spin-rev var(--dur, 72s) linear infinite;
          animation-delay: var(--delay, 0s);
        }
        .fw-orb-bob { position: absolute; left: 0; top: 0; width: 0; height: 0; }
        .fw-frame {
          position: absolute;
          left: 0;
          top: 0;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px 4px 7px;
          border-radius: 7px;
          border: 1px solid rgba(22, 119, 255, 0.18);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(244, 248, 255, 0.86));
          box-shadow:
            0 10px 22px -14px rgba(11, 74, 176, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          line-height: 1;
          color: var(--color-ink-800, #161b24);
          white-space: nowrap;
          backdrop-filter: blur(6px);
        }
        .fw-frame-dot {
          width: 4px;
          height: 4px;
          border-radius: 1px;
          background: rgba(22, 119, 255, 0.75);
          box-shadow: 0 0 6px rgba(22, 119, 255, 0.35);
          transform: rotate(45deg);
        }

        /* ―― 竖轴版：轴从中间往两头长，支线从轴往外伸，节点依次到位 ―― */
        .fw-axis { transform: scaleY(0); transform-origin: center; transition: transform 1.1s cubic-bezier(.65,0,.35,1) .1s; }
        .fw-scene.is-on .fw-axis { transform: scaleY(1); }
        .fw-branch { transform: scaleX(0); transition: transform .5s cubic-bezier(.65,0,.35,1) var(--d, .4s); }
        .fw-scene.is-on .fw-branch { transform: scaleX(1); }
        .fw-node-row { opacity: 0; scale: .9; transition: opacity .6s ease var(--d, 0s), scale .6s cubic-bezier(.2,.8,.2,1) var(--d, 0s); }
        .fw-scene.is-on .fw-node-row { opacity: 1; scale: 1; }

        /* 滚出视口就停掉所有循环动画（渲染不再逐帧重排） */
        .fw-idle .fw-loop,
        .fw-idle .fw-breathe,
        .fw-idle .fw-orbit-a,
        .fw-idle .fw-orbit-b,
        .fw-idle .fw-scan,
        .fw-idle .fw-icon-drift,
        .fw-idle .fw-frames,
        .fw-idle .fw-orb,
        .fw-idle .fw-orb-fix { animation-play-state: paused; }

        @media (prefers-reduced-motion: reduce) {
          .fw-node, .fw-node-row { opacity: 1; scale: 1; transition: none; }
          .fw-core { opacity: 1; scale: 1; transition: none; }
          .fw-bloom { display: none; }
          .fw-link { stroke-dashoffset: 0; transition: none; }
          .fw-glow { opacity: .55; animation: none; transition: none; }
          .fw-axis, .fw-branch { transform: none; transition: none; }
          .fw-breathe, .fw-orbit-a, .fw-orbit-b, .fw-scan { animation: none; }
          .fw-frames { opacity: 1; transition: none; animation: none; }
          .fw-icon-drift { animation: none; }
          .fw-orb { animation: none; transform: rotate(var(--a, 0deg)); }
          .fw-orb-fix { animation: none; transform: rotate(calc(-1 * var(--a, 0deg))); }
        }
      `}</style>

      <div className="container-x relative">
        <Reveal>
          <p className="font-mono text-caption uppercase tracking-eyebrow text-brand-text">CO-BUILDING FRAMEWORK</p>
          <h2 className="mt-2.5 text-[32px] font-bold leading-[1.04] tracking-tight text-ink-900 sm:text-[38px] lg:text-[46px]">
            {title}
          </h2>
        </Reveal>

        {wide ? (
          <RadialScene reduced={reduced} on={on} inView={inView} sceneRef={sceneRef} nodes={nodes} />
        ) : (
          <SpineScene reduced={reduced} on={on} inView={inView} sceneRef={sceneRef} nodes={nodes} />
        )}
      </div>
    </section>
  )
}
