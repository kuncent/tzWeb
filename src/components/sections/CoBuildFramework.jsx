import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { Boxes, BookOpen, Compass, FlaskConical, GraduationCap, Handshake } from 'lucide-react'
import { Reveal } from '../ui'

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
 *   ⑤ 背景一层 canvas 星尘（点 + 近邻连线的极淡网）和一层 20% 透明度的
 *      多边形网；两者都只做气氛，不参与语义
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

const NODES = [
  { n: '01', title: '专业建设与评估', sub: '人才培养方案修订', icon: Compass, x: 500, y: 131, side: 'top' },
  { n: '02', title: '师资提升', sub: '企业顶岗实践', icon: GraduationCap, x: 205, y: 230, side: 'left' },
  { n: '03', title: '科研及创新', sub: '横向课题', icon: FlaskConical, x: 795, y: 230, side: 'right' },
  { n: '04', title: '课程建设', sub: '虚拟仿真课程资源', icon: BookOpen, x: 205, y: 510, side: 'left' },
  { n: '05', title: '实践教学', sub: '实验室建设', icon: Boxes, x: 795, y: 510, side: 'right' },
  { n: '06', title: '社会服务', sub: '会议联合举办', icon: Handshake, x: 500, y: 605, side: 'bottom' },
]

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
    // 落点：线撞到六边形边上那颗小站点点位
    lx: n.x - ux * (HEX_U + 4),
    ly: n.y - uy * (HEX_U + 4),
  }
})

const HEX_POINTS = '80,8 145,45 145,115 80,152 15,115 15,45'
const HEX_INNER = '80,18 136,50 136,110 80,142 24,110 24,50'

/* 与参考稿同构的 `scene` 背景网：一个十二边形 + 几条弦，压到 5% 左右 */
const MESH = [
  'M90 230L220 150 340 205 500 95 660 180 820 145 920 270 850 500 700 650 500 740 300 650 120 500Z',
  'M90 230L120 500 300 650 340 205M220 150L500 95 660 180 850 500 700 650M340 205L500 740M660 180L500 740M820 145L700 650',
  'M70 330L220 150M920 270L660 180M120 500L300 650M850 500L700 650',
]
const MESH_DOTS = [
  [90, 230], [220, 150], [340, 205], [500, 95], [660, 180], [820, 145],
  [920, 270], [850, 500], [700, 650], [500, 740], [300, 650], [120, 500],
]

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

/* 星尘：参考稿用 canvas 画点 + 近邻连线（150 个点两两比较，代价不低）。
   这里降到 34 个点、连线半径 110px，只在视口内跑；滚出视口或标签页隐藏即停。 */
function DustField() {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const COUNT = 34
    const LINK = 110
    const dots = []
    let w = 0
    let h = 0
    let raf = 0
    let live = false
    let last = 0

    const spawn = () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.15 + 0.45,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.5) * 9,
      a: Math.random() * 0.35 + 0.12,
      p: Math.random() * 6.28,
    })

    const resize = () => {
      const box = cv.getBoundingClientRect()
      w = Math.max(1, Math.round(box.width))
      h = Math.max(1, Math.round(box.height))
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      if (!dots.length) for (let i = 0; i < COUNT; i += 1) dots.push(spawn())
    }

    const paint = (t) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const dt = last ? Math.min(48, t - last) / 1000 : 0
      last = t

      for (const d of dots) {
        d.x += d.vx * dt
        d.y += d.vy * dt
        if (d.x < 0) d.x += w
        if (d.x > w) d.x -= w
        if (d.y < 0) d.y += h
        if (d.y > h) d.y -= h
      }

      for (let i = 0; i < dots.length; i += 1) {
        const a = dots[i]
        for (let j = i + 1; j < dots.length; j += 1) {
          const b = dots[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d > LINK) continue
          ctx.strokeStyle = `rgba(22,119,255,${((1 - d / LINK) * 0.08).toFixed(3)})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      for (const d of dots) {
        ctx.fillStyle = `rgba(22,119,255,${(d.a * (0.62 + 0.38 * Math.sin(t / 900 + d.p))).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const tick = (t) => {
      if (!live) {
        raf = 0
        return
      }
      paint(t)
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      live = true
      last = 0
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
  }, [])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-0 h-full w-full" />
}

/* 天择圆盘 + 轨道 + 扫描：核心场直径 216px（画布宽度的 20%），
   圆盘按参考稿 164/220 的比例缩到 78%，连线起点就藏在盘下。 */
function CoreField({ reduced, className = '', disc = 'inset-[11%]' }) {
  return (
    <div className={`fw-core relative aspect-square ${className}`}>
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

function HexPlate({ icon: Icon, iconSize = 22, className = '' }) {
  return (
    <span className={`relative block aspect-square ${className}`}>
      <svg viewBox="0 0 160 160" className="block h-full w-full overflow-visible">
        <polygon points={HEX_POINTS} fill="rgba(255,255,255,0.92)" stroke="rgba(22,119,255,0.45)" strokeWidth="1.2" />
        <polygon points={HEX_INNER} fill="none" stroke="rgba(22,119,255,0.2)" strokeWidth="0.7" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-brand-text">
        <Icon size={iconSize} strokeWidth={1.6} />
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
function RadialScene({ reduced, on, inView, sceneRef }) {
  return (
    <div
      ref={sceneRef}
      className={`fw-scene relative mx-auto hidden w-full max-w-[1080px] xl:block ${on ? 'is-on' : ''} ${inView ? '' : 'fw-idle'}`}
      style={{ aspectRatio: `${G.w} / ${G.h}` }}
    >
      {!reduced && <DustField />}

      {/* 背景网：只做底纹，压到 5% */}
      <svg
        aria-hidden
        viewBox="0 0 1000 820"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      >
        <g fill="none" stroke="rgba(11,15,23,0.055)" strokeWidth="0.8" vectorEffect="non-scaling-stroke">
          {MESH.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g fill="rgba(22,119,255,0.16)">
          {MESH_DOTS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" />
          ))}
        </g>
      </svg>

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

        {LINKS.map((l) => (
          <circle key={`s-${l.d}`} className="fw-station" cx={l.lx} cy={l.ly} r="3.2" fill="rgba(22,119,255,0.55)" />
        ))}
      </svg>

      {/* 核心：天择圆盘 */}
      <div className="absolute left-1/2 top-1/2 z-[3] w-[20%] -translate-x-1/2 -translate-y-1/2">
        <CoreField reduced={reduced} className="w-full" />
      </div>

      {/* 六个节点 */}
      <ul className="absolute inset-0 z-[4]">
        {NODES.map((n, i) => {
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
          <HexPlate icon={Icon} iconSize={19} className="h-[54px] w-[54px]" />
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

function SpineScene({ reduced, on, inView, sceneRef }) {
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
        {NODES.slice(0, 3).map((n, i) => (
          <SpineNode key={n.n} n={n} i={i} />
        ))}
      </ul>

      <div className="relative z-[3] flex justify-center py-4">
        <CoreField reduced={reduced} className="w-[128px]" disc="inset-[9%]" />
      </div>

      <ul className="relative">
        {NODES.slice(3).map((n, i) => (
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

        /* 落点小圆：流光亮起来之后才出现 */
        .fw-station { opacity: 0; transition: opacity .5s ease 2.6s; }
        .fw-scene.is-on .fw-station { opacity: 1; }

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
        .fw-idle .fw-scan { animation-play-state: paused; }

        @media (prefers-reduced-motion: reduce) {
          .fw-node, .fw-node-row { opacity: 1; scale: 1; transition: none; }
          .fw-core { opacity: 1; scale: 1; transition: none; }
          .fw-bloom { display: none; }
          .fw-link { stroke-dashoffset: 0; transition: none; }
          .fw-glow { opacity: .55; animation: none; transition: none; }
          .fw-station { opacity: 1; transition: none; }
          .fw-axis, .fw-branch { transform: none; transition: none; }
          .fw-breathe, .fw-orbit-a, .fw-orbit-b, .fw-scan { animation: none; }
        }
      `}</style>

      <div className="container-x relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <p className="font-mono text-caption uppercase tracking-eyebrow text-brand-text">CO-BUILDING FRAMEWORK</p>
            <h2 className="mt-2.5 text-[32px] font-bold leading-[1.04] tracking-tight text-ink-900 sm:text-[38px] lg:text-[46px]">
              专业共建框架
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="lg:max-w-[40ch] lg:pb-1.5">
            <p className="text-[13px] leading-[1.75] text-ink-500">
              六个维度从同一个中心展开，彼此咬合成一套可执行的共建框架。
            </p>
          </Reveal>
        </div>

        {wide ? (
          <RadialScene reduced={reduced} on={on} inView={inView} sceneRef={sceneRef} />
        ) : (
          <SpineScene reduced={reduced} on={on} inView={inView} sceneRef={sceneRef} />
        )}
      </div>
    </section>
  )
}
