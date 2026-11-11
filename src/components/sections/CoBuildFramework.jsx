import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { Reveal } from '../ui'
import { coBuildLead, coBuildNodes, coBuildTitle } from '../../data/coBuild'
import { useContent, useContentData } from '../../lib/contentStore'
import { ChannelGlyph, glyphCss } from './CoBuildGlyphs'
import { CoverageMap, coverageCss } from './CoBuildCoverage'

/* ============================================================
 * 专业共建框架 —— 浅色无边框展示
 * ------------------------------------------------------------
 * 主体是图，不是仪表盘，也不是一块卡片：整屏只有一张环状六边形大图直接落在白底上。
 * 没有底板 / 描边 / 圆角 / 投影框，没有轮播文字块，没有另排的通道按钮，
 * 没有状态行，也没有刻度尺与进度条 —— 图上的六个六边形自己就是导航与身份。
 *
 * 叙事是「逐条贯通，最后结算」：
 *   每 1.5s 核心送出一颗能量头，线跟着头一路画到六边形；
 *   抵达时六边形炸开一圈光环、底色闪一下，徽标开始上演自己的动作；
 *   这条线随后常驻 —— 亮线 + 辉光 + 永不停的数据点，六边形周边留下呼吸光晕，徽标也一直循环。
 *   连线只走彩虹圈之外，绝不穿进核心仪表。
 *   六条全部贯通后进入结算：六路白光同时向外冲一遍，两道冲击波扫过整张图，
 *   单色雷达换成六色合环并沿圆周画满，六个端口按各自方位依次点亮；
 *   白盘缩成一粒种子落到北京，浅色中国地图浮现，29 座主要城市依次弹上品牌徽标，
 *   最后从首都拉出八条干线。此后常驻不重置。
 *   进度不靠进度条表达 —— 亮起来的线本身就是进度。
 *
 * 一套坐标，两套排布：
 *   ① 760×620 用户单位，容器锁死同一长宽比，SVG 连线端点与 DOM 六边形永远咬合。
 *   ② ≥768 ＝ 只有一张大图；<768 ＝ 核心在上、六条通道竖排手风琴。
 *   ③ 推进不受指针影响；点选＝六条一次性齐发并聚焦所选。
 *
 * 三支通道色各有分工（见 data/coBuild.js）：hue 只上图形，ink 才是白底上的字，
 * soft 做底纹与洗光。颜色过渡靠 @property 注册成 <color> 才会真的插值。
 * 变量挂在 section 上，洗光才能铺满整屏而不被内容盒子裁出一个矩形边。
 * 滚出视口、切后台、prefers-reduced-motion 全部停摆并落到「已贯通」静态终态。
 * ============================================================ */

const G = { w: 760, h: 620 }
/* r = 连线起点半径。核心盒占 26% 宽 → 半径 98.8 用户单位，彩虹圈再外扩 4% 到 102.8；
   取 112 是给辉光与模糊留余量，保证光永远不穿进核心仪表。 */
const CORE = { x: 380, y: 300, r: 112 }
const HEX_PCT = 13.6

const STEP_MS = 1000
const FIRST_MS = 620
const LAND_MS = 950
/* 一轮 15 秒：前 ~10 秒逐条贯通并结算成全国服务地图，第 14 秒彩虹环把六路光晕
   沿连线收回核心，第 15 秒整场复位重开。收与开之间不留黑场。 */
const CYCLE_MS = 15000
const RECALL_MS = 14000
const FULL = (1 << coBuildNodes.length) - 1

/* 结算后核心不再属于任何一条通道，回到品牌蓝，六色只留在合环与六条线上。 */
const SEAL = { hue: '#1677ff', ink: '#0b5bd3', soft: '#bfe3ff' }
const SEAL_SPOT = { ax: 50, ay: 40 }

const rgba = (hex, a) => {
  const v = parseInt(hex.slice(1), 16)
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${a})`
}

const nextUnlit = (mask) => {
  for (let i = 0; i < coBuildNodes.length; i += 1) if (!(mask & (1 << i))) return i
  return -1
}

/* 连线从核心盘外沿出发（藏在白盘下面），末端落在六边形中心；
   控制点朝同一侧偏一点，六条线像绕核心拧了一圈，而不是六根直辐条。 */
const LINKS = coBuildNodes.map((n) => {
  const dx = n.x - CORE.x
  const dy = n.y - CORE.y
  const len = Math.hypot(dx, dy)
  const sx = CORE.x + (dx / len) * CORE.r
  const sy = CORE.y + (dy / len) * CORE.r
  const px = -dy / len
  const py = dx / len
  const c1x = sx + dx * 0.42 + px * len * 0.055
  const c1y = sy + dy * 0.42 + py * len * 0.055
  const c2x = sx + dx * 0.82 + px * len * 0.018
  const c2y = sy + dy * 0.82 + py * len * 0.018
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${n.x} ${n.y}`
})

/* 洗光落点：把节点在图里的位置映射到整屏的百分比，选中哪条聚光就滑到哪。 */
const SPOT = coBuildNodes.map((n) => ({
  ax: 26 + (n.x / G.w) * 48,
  ay: 24 + (n.y / G.h) * 44,
}))

/* 合环上的六个端口：角度取自节点相对核心的真实方位，所以端口正对着各自的六边形。 */
const PORTS = coBuildNodes.map((n) => {
  const a = Math.atan2(n.y - CORE.y, n.x - CORE.x)
  return { left: 50 + Math.cos(a) * 49.5, top: 50 + Math.sin(a) * 49.5 }
})

const HEX_POINTS = '80,8 145,45 145,115 80,152 15,115 15,45'
const HEX_INNER = '80,20 134,51 134,109 80,140 26,109 26,51'

/* 背景网：十二边形外圈 + 八边形内圈 + 四角散点，节点按慢速正弦漂移。
   坐标数组只在挂载时分配一次，绘制循环里不 new 任何对象。 */
const NET_SPACE = { w: 1000, h: 820 }
const NET_SPEED = 2.4
const NET_ANCHORS = [
  [90, 230], [220, 150], [340, 205], [500, 95], [660, 180], [820, 145],
  [920, 270], [850, 500], [700, 650], [500, 740], [300, 650], [120, 500],
  [350, 330], [500, 300], [650, 330], [720, 430], [650, 520], [500, 550], [350, 520], [280, 430],
  [300, 120], [700, 110], [110, 380], [890, 380], [300, 720], [700, 720],
]
const NET_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 0],
  [11, 2], [2, 9], [5, 8], [1, 4],
  [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 12],
  [0, 12], [1, 12], [3, 13], [4, 14], [5, 14], [6, 15], [6, 16], [7, 16],
  [7, 17], [8, 17], [9, 18], [10, 18], [10, 19], [11, 19],
  [1, 20], [3, 20], [3, 21], [5, 21], [11, 22], [0, 22], [6, 23], [7, 23],
  [10, 24], [9, 24], [8, 25], [9, 25],
]

const ICON_FLOAT = [
  { dx: 3.6, dy: 2.6, s0: 1.035, s1: 1, dur: 9.1, delay: -1.6 },
  { dx: 2.7, dy: 3.4, s0: 0.98, s1: 0.995, dur: 10.9, delay: -6.2 },
  { dx: 3.3, dy: 2.4, s0: 1.02, s1: 0.99, dur: 8.6, delay: -3.9 },
  { dx: 2.5, dy: 3.1, s0: 0.97, s1: 0.99, dur: 11.4, delay: -9.4 },
  { dx: 3.4, dy: 2.8, s0: 1.03, s1: 1.005, dur: 9.8, delay: -5.1 },
  { dx: 2.9, dy: 2.5, s0: 0.99, s1: 1.02, dur: 9.5, delay: -8.3 },
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

function useMedia(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setMatch(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])
  return match
}

/* 背景网。live 与 hue 都走 ref，滚出视口或换通道都不会重建画布与缓冲区。 */
function NetField({ reduced, live, hue }) {
  const ref = useRef(null)
  const liveRef = useRef(live)
  const ctrl = useRef(null)
  const dotRef = useRef(rgba(hue, 0.3))

  useEffect(() => {
    dotRef.current = rgba(hue, 0.3)
    if (reduced) ctrl.current?.paintOnce()
  }, [hue, reduced])

  useEffect(() => {
    liveRef.current = live
    if (live) ctrl.current?.start()
    else ctrl.current?.stop()
  }, [live])

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
      r: 1.7 + (i % 3) * 0.5,
    }))
    const xs = new Float32Array(nodes.length)
    const ys = new Float32Array(nodes.length)
    const EDGE_STYLE = 'rgba(11,20,48,0.055)'
    let w = 0
    let h = 0
    let raf = 0
    let running = false
    let lastPaint = -1

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
        ctx.moveTo(xs[e[0]], ys[e[1]])
        ctx.lineTo(xs[e[1]], ys[e[1]])
      }
      ctx.stroke()
      ctx.fillStyle = dotRef.current
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
      paint(0)
    }

    const tick = (t) => {
      if (!running) {
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
      if (reduced || running || document.hidden) return
      running = true
      lastPaint = -1
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    resize()
    ctrl.current = { start, stop, paintOnce: () => paint(0) }
    const onVis = () => (document.hidden ? stop() : liveRef.current && start())
    document.addEventListener('visibilitychange', onVis)
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    if (liveRef.current) start()

    return () => {
      ctrl.current = null
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [reduced])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-0 h-full w-full" />
}

/* 核心仪表：呼吸晕 + 雷达扫描 + 60 齿刻度环 + 两条压扁轨道 + 天择白盘。
   六条全部贯通后叠上结算：六色合环沿圆周画满 + 六个端口 + 两道冲击波，
   仪表家具淡出、白盘缩成一粒种子落到北京，浅色服务地图接管核心，之后常驻。 */
function CoreInstrument({ reduced, pulseKey, sealed, hues, className = '', disc = 'inset-[14%]', compact = false, recall = false }) {
  const ringMask = 'radial-gradient(closest-side, transparent 87%, #000 89%, #000 100%)'
  const sweepMask = 'radial-gradient(closest-side, transparent 48%, #000 53%, #000 95%, transparent 99%)'
  const sealMask = `radial-gradient(closest-side, transparent 88%, #000 90%, #000 100%), conic-gradient(from -90deg, #000 var(--seal-sweep), transparent 0)`
  const live = sealed && !reduced
  return (
    <div className={`fw-core relative aspect-square ${className}`}>
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-[38%] rounded-full ${reduced ? '' : 'fw-breathe fw-loop'}`}
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in srgb, var(--ch) 26%, transparent), color-mix(in srgb, var(--ch) 8%, transparent) 50%, transparent 72%)',
        }}
      />

      {!reduced && !sealed && (
        <span
          aria-hidden
          className="fw-sweep fw-loop pointer-events-none absolute -inset-[3%] rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg 232deg, color-mix(in srgb, var(--ch) 16%, transparent) 318deg, color-mix(in srgb, var(--ch) 46%, transparent) 358deg, transparent 360deg)',
            maskImage: sweepMask,
            WebkitMaskImage: sweepMask,
          }}
        />
      )}

      <span
        aria-hidden
        className={`fw-dial pointer-events-none absolute inset-0 rounded-full ${sealed ? 'is-off' : ''} ${reduced ? '' : 'fw-ticks fw-loop'}`}
        style={{
          background: 'repeating-conic-gradient(from 0deg, rgba(11,20,48,.3) 0deg 0.6deg, transparent 0.6deg 6deg)',
          maskImage: ringMask,
          WebkitMaskImage: ringMask,
        }}
      />

      <span
        aria-hidden
        className={`fw-dial pointer-events-none absolute inset-[7%] rounded-full border ${sealed ? 'is-off' : ''} ${reduced ? '' : 'fw-orbit-a fw-loop'}`}
        style={{ borderColor: 'color-mix(in srgb, var(--ch) 42%, transparent)' }}
      >
        <span
          className="absolute left-[16%] top-[11%] h-[5px] w-[5px] rounded-full"
          style={{ background: 'var(--ch)', boxShadow: '0 0 9px 2px color-mix(in srgb, var(--ch) 55%, transparent)' }}
        />
      </span>
      <span
        aria-hidden
        className={`fw-dial pointer-events-none absolute -inset-[8%] rounded-full border ${sealed ? 'is-off' : ''} ${reduced ? '' : 'fw-orbit-b fw-loop'}`}
        style={{ borderColor: 'color-mix(in srgb, var(--ch) 22%, transparent)' }}
      />

      {!reduced && (
        <span
          key={pulseKey}
          aria-hidden
          className="fw-pulse pointer-events-none absolute inset-[12%] rounded-full border-2"
          style={{ borderColor: 'color-mix(in srgb, var(--ch) 65%, transparent)' }}
        />
      )}

      {/* ―― 结算：白盘缩成种子落到北京，浅色服务地图接管核心 ―― */}
      <CoverageMap on={sealed} live={live} compact={compact} recall={recall} />
      <div
        className={`fw-disc absolute ${disc} overflow-hidden rounded-full ${sealed ? 'is-seed' : ''}`}
        style={{
          background: 'linear-gradient(158deg, #ffffff 0%, #eef4ff 100%)',
          boxShadow:
            '0 0 0 1px color-mix(in srgb, var(--ch) 45%, transparent), 0 0 30px -4px color-mix(in srgb, var(--ch) 55%, transparent), 0 20px 40px -20px rgba(11,20,48,.5), inset 0 1px 0 #fff',
        }}
      >
        <img
          src="/images/brand-mark.svg"
          alt="天择科技"
          width={140}
          height={140}
          decoding="async"
          className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 object-contain"
        />
        {!reduced && !sealed && (
          <span
            aria-hidden
            className="fw-scan fw-loop pointer-events-none absolute inset-x-0 top-[22%] h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--ch) 75%, transparent), transparent)',
            }}
          />
        )}
        <span
          aria-hidden
          className={`fw-shine pointer-events-none absolute -inset-y-[25%] -left-[65%] w-[55%] ${live ? 'is-on' : ''}`}
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.95) 46%, rgba(255,255,255,.5) 62%, transparent)',
            rotate: '16deg',
          }}
        />
      </div>

      {/* ―― 结算：六色合环。第 14 秒反向卷收，把六路光晕吸回来 ―― */}
      <span
        aria-hidden
        className={`fw-seal-ring pointer-events-none absolute -inset-[2%] rounded-full ${sealed ? 'is-on' : ''} ${live ? 'fw-loop' : ''} ${recall ? 'is-recall' : ''}`}
        style={{
          background: `conic-gradient(from -90deg, ${hues.join(', ')}, ${hues[0]})`,
          maskImage: sealMask,
          WebkitMaskImage: sealMask,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      />
      <span
        aria-hidden
        className={`fw-reel pointer-events-none absolute -inset-[2%] rounded-full border-2 ${recall ? 'is-on' : ''}`}
        style={{ borderColor: 'color-mix(in srgb, var(--ch) 72%, transparent)' }}
      />
      <span aria-hidden className={`pointer-events-none absolute inset-0 fw-seal-ports ${sealed ? 'is-on' : ''} ${recall ? 'is-recall' : ''}`}>
        {PORTS.map((p, i) => (
          <span
            key={hues[i]}
            className="fw-seal-port absolute h-[5%] w-[5%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              background: hues[i],
              boxShadow: `0 0 9px 1.5px ${rgba(hues[i], 0.65)}, 0 0 0 2px #fff`,
              transitionDelay: sealed ? `${0.5 + i * 0.09}s` : '0s',
            }}
          />
        ))}
      </span>
      {[0, 1].map((i) => (
        <span
          key={i}
          aria-hidden
          className={`fw-shock pointer-events-none absolute inset-[8%] rounded-full border-2 ${live ? 'is-on' : ''}`}
          style={{ borderColor: 'color-mix(in srgb, var(--ch) 70%, transparent)', animationDelay: `${i * 0.24}s` }}
        />
      ))}
    </div>
  )
}

/* 白玻璃六边形：白底 + 通道色描边 + 会讲故事的通道徽标。
   lit = 这条通道已贯通（常驻身份，徽标从此一直循环），active = 当前聚焦。
   recall = 第 14 秒彩虹环回收：光晕沿本通道方向被吸回核心。 */
function HexPlate({ node, active, lit, story, float, iconSize = 26, className = '', badge = false, reduced = false, recall = false, compact = false }) {
  const raw = useId()
  const gid = `fw-hex-${raw.replace(/[^a-zA-Z0-9]/g, '')}`
  /* 抵达时炸开的那团散射光就是它：盒子取六边形的 1.92 倍，光团一直摊到
     六边形外一倍远的地方。核心距六边形约 210 用户单位、合环半径约 99，
     所以回收时要飞 111 单位 ≈ 自身盒宽的 56%，正好落进环里。
     窄屏是竖排列表，方向没有意义，光团就地收拢。 */
  const hx = compact ? 0 : CORE.x - node.x
  const hy = compact ? 0 : CORE.y - node.y
  const hl = Math.hypot(hx, hy) || 1
  return (
    <span className={`relative block aspect-square ${className}`}>
      <span
        aria-hidden
        className={`fw-hex-halo pointer-events-none absolute -inset-[46%] ${lit ? 'is-on' : ''} ${lit && !reduced ? 'fw-loop' : ''} ${recall ? 'is-recall' : ''}`}
        style={{
          '--rx': ((hx / hl) * 56).toFixed(2),
          '--ry': ((hy / hl) * 56).toFixed(2),
          '--hd': `${(Number(node.n) - 1) * 0.04}s`,
          background: `radial-gradient(closest-side, ${rgba(node.hue, 0.3)} 0%, ${rgba(node.hue, 0.34)} 44%, ${rgba(node.hue, 0.22)} 60%, ${rgba(node.hue, 0.09)} 78%, transparent 100%)`,
        }}
      />
      <svg
        viewBox="0 0 160 160"
        data-lit={lit ? '1' : '0'}
        className="fw-hex block h-full w-full overflow-visible transition-[filter] duration-500"
        style={{
          filter: active
            ? `drop-shadow(0 0 12px ${rgba(node.hue, 0.42)}) drop-shadow(0 12px 22px ${rgba(node.hue, 0.24)})`
            : lit
              ? `drop-shadow(0 0 7px ${rgba(node.hue, 0.26)}) drop-shadow(0 12px 22px ${rgba(node.hue, 0.18)})`
              : 'drop-shadow(0 12px 22px rgba(11,20,48,.17))',
        }}
      >
        <defs>
          <linearGradient id={gid} x1="0.1" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#eef4ff" />
          </linearGradient>
        </defs>
        <polygon points={HEX_POINTS} fill={`url(#${gid})`} />
        <polygon
          points={HEX_POINTS}
          fill={node.hue}
          className="transition-opacity duration-500"
          style={{ opacity: active ? 0.17 : lit ? 0.12 : 0.06 }}
        />
        <polygon
          points={HEX_POINTS}
          fill="none"
          stroke={node.hue}
          strokeWidth="1.9"
          className="transition-[stroke-opacity] duration-500"
          style={{ strokeOpacity: active ? 1 : lit ? 0.85 : 0.5 }}
        />
        <polygon
          points={HEX_INNER}
          fill="none"
          stroke={node.hue}
          strokeWidth="0.8"
          className="transition-[stroke-opacity] duration-500"
          style={{ strokeOpacity: active ? 0.45 : lit ? 0.32 : 0.16 }}
        />
        <polygon className="fw-hex-flash" points={HEX_POINTS} fill={node.hue} />
        {badge && (
          <text
            x="80"
            y="133"
            textAnchor="middle"
            fontSize="12.5"
            fontWeight="600"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill={node.ink}
            style={{ opacity: active ? 0.95 : lit ? 0.75 : 0.42, transition: 'opacity .5s ease' }}
          >
            {node.n}
          </text>
        )}
        {active && (
          <circle
            cx="80"
            cy="80"
            r="76"
            fill="none"
            stroke={node.hue}
            strokeOpacity="0.6"
            strokeWidth="1.2"
            strokeDasharray="7 11"
            className="fw-hex-ring fw-loop"
            style={{ transformOrigin: '80px 80px' }}
          />
        )}
        <circle
          className="fw-hex-arrive"
          cx="80"
          cy="80"
          r="72"
          fill="none"
          stroke={node.hue}
          strokeWidth="2.2"
          style={{ transformOrigin: '80px 80px' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span
          className={float ? 'fw-icon-drift fw-loop' : ''}
          style={{
            color: node.ink,
            opacity: active ? 1 : lit ? 0.95 : 0.78,
            transition: 'opacity .5s ease',
            ...(float
              ? {
                  '--dx': `${float.dx}px`,
                  '--dy': `${float.dy}px`,
                  '--s0': float.s0,
                  '--s1': float.s1,
                  animationDuration: `${float.dur}s`,
                  animationDelay: `${float.delay}s`,
                }
              : null),
          }}
        >
          <ChannelGlyph n={node.n} active={story} reduced={reduced} size={iconSize} />
        </span>
      </span>
    </span>
  )
}

/* 一条通道的常驻生命线：能量头领着线一路画到六边形 → 线常亮 + 数据点永流。
   data-on 从 0 翻到 1 时一次性动画重新触发；data-recall 翻到 1 时整条反向抽回核心。
   全部 pathLength=100 归一化，位移量正好等于各自 dasharray 的周期。 */
function LinkFlow({ d, node, on, sealed, recall }) {
  return (
    <g className="fw-flow" data-on={on ? '1' : '0'} data-seal={sealed ? '1' : '0'} data-recall={recall ? '1' : '0'}>
      <path className="fw-flow-glow" d={d} pathLength="100" fill="none" stroke={node.hue} strokeOpacity="0.26" strokeWidth="9" strokeLinecap="round" filter="url(#fw-soft)" />
      <path className="fw-flow-line" d={d} pathLength="100" fill="none" stroke={node.hue} strokeOpacity="0.95" strokeWidth="1.9" strokeLinecap="round" />
      <g className="fw-flow-stream">
        <path
          d={d}
          pathLength="100"
          fill="none"
          stroke={node.hue}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeDasharray="1.4 8.6"
          className="fw-packet fw-loop"
        />
      </g>
      <path className="fw-flow-head" d={d} pathLength="100" fill="none" stroke={node.hue} strokeWidth="5" strokeLinecap="round" strokeDasharray="10 90" />
      <path className="fw-flow-tip" d={d} pathLength="100" fill="none" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 95" />
      <path className="fw-flow-wave" d={d} pathLength="100" fill="none" stroke={node.hue} strokeOpacity="0.5" strokeWidth="8" strokeLinecap="round" strokeDasharray="14 86" />
      <path className="fw-flow-wave" d={d} pathLength="100" fill="none" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="9 91" />
      <path className="fw-flow-reel" d={d} pathLength="100" fill="none" stroke={node.hue} strokeWidth="6" strokeLinecap="round" strokeDasharray="11 89" />
      <path className="fw-flow-reel is-tip" d={d} pathLength="100" fill="none" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="6 94" />
    </g>
  )
}

function RadialScene({ nodes, active, litMask, sealed, manual, pick, preview, reduced, on, sceneRef, live, recall }) {
  const parallaxRef = useRef(null)
  const hues = nodes.map((n) => n.hue)

  /* 指针视差：整张图轻微跟着指针偏，最大 6px。写 CSS 变量而不是 setState，
     所以 pointermove 不触发 React 重渲染。 */
  useEffect(() => {
    const el = parallaxRef.current
    if (!el || reduced) return
    let raf = 0
    let tx = 0
    let ty = 0
    const apply = () => {
      raf = 0
      el.style.setProperty('--px', `${tx.toFixed(2)}px`)
      el.style.setProperty('--py', `${ty.toFixed(2)}px`)
    }
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width - 0.5) * 12
      ty = ((e.clientY - r.top) / r.height - 0.5) * 12
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const reset = () => {
      tx = 0
      ty = 0
      if (!raf) raf = requestAnimationFrame(apply)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', reset)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', reset)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div
      ref={parallaxRef}
      className="fw-parallax relative mx-auto w-full max-w-[960px]"
      style={{ aspectRatio: `${G.w} / ${G.h}` }}
    >
      {/* 图纸网格只铺在图周围，径向遮罩收边 —— 不是一块底板，是一片场 */}
      <div aria-hidden className="fw-grid pointer-events-none absolute -inset-x-[9%] -inset-y-[5%]" />
      <div aria-hidden className="pointer-events-none absolute -inset-x-[9%] -inset-y-[5%]">
        <NetField reduced={reduced} live={live} hue={sealed ? SEAL.hue : nodes[active].hue} />
      </div>
      <div ref={sceneRef} className={`fw-scene absolute inset-0 ${on ? 'is-on' : ''}`}>
        <svg aria-hidden viewBox={`0 0 ${G.w} ${G.h}`} className="pointer-events-none absolute inset-0 h-full w-full">
          {[112, 152, 192].map((r, i) => (
            <circle
              key={r}
              cx={CORE.x}
              cy={CORE.y}
              r={r}
              fill="none"
              stroke="rgba(11,20,48,0.11)"
              strokeWidth="1"
              strokeDasharray={i === 1 ? '2 8' : undefined}
            />
          ))}
          {[0, 1].map((i) => (
            <circle
              key={`w${i}`}
              className={`fw-bigwave ${sealed && !reduced ? 'is-on' : ''}`}
              cx={CORE.x}
              cy={CORE.y}
              r="78"
              fill="none"
              stroke={SEAL.hue}
              strokeWidth="1.6"
              style={{ transformOrigin: `${CORE.x}px ${CORE.y}px`, animationDelay: `${0.1 + i * 0.26}s` }}
            />
          ))}
        </svg>

        <svg
          aria-hidden
          viewBox={`0 0 ${G.w} ${G.h}`}
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
        >
          <defs>
            <filter id="fw-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.4" />
            </filter>
          </defs>
          {LINKS.map((d, i) => (
            <path
              key={`base-${nodes[i].n}`}
              className="fw-link"
              d={d}
              pathLength="100"
              fill="none"
              stroke={nodes[i].hue}
              strokeWidth="1.3"
              strokeLinecap="round"
              style={{
                '--d': `${0.25 + i * 0.09}s`,
                strokeOpacity: litMask & (1 << i) ? 0 : 0.3,
                transition: 'stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1) var(--d,0s), stroke-opacity .5s ease',
              }}
            />
          ))}
          {LINKS.map((d, i) => (
            <circle
              key={`cap-${nodes[i].n}`}
              cx={nodes[i].x}
              cy={nodes[i].y}
              r="2.8"
              fill={nodes[i].hue}
              style={{ fillOpacity: litMask & (1 << i) ? 0 : 0.5, transition: 'fill-opacity .5s ease' }}
            />
          ))}
          {LINKS.map((d, i) => (
            <LinkFlow key={`flow-${nodes[i].n}`} d={d} node={nodes[i]} on={Boolean(litMask & (1 << i))} sealed={sealed} recall={recall} />
          ))}
        </svg>

        <div
          className="absolute z-[3] w-[26%] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(CORE.x / G.w) * 100}%`, top: `${(CORE.y / G.h) * 100}%` }}
        >
          <CoreInstrument reduced={reduced} pulseKey={active} sealed={sealed} hues={hues} className="w-full" recall={recall} />
        </div>

        <ul
          className="absolute inset-0 z-[4]"
          aria-label="专业共建六个维度"
          onKeyDown={(e) => {
            if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
            e.preventDefault()
            const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1
            const next = (active + step + nodes.length) % nodes.length
            pick(next)
            e.currentTarget.querySelectorAll('button')[next]?.focus()
          }}
        >
          {nodes.map((n, i) => {
            const isLit = Boolean(litMask & (1 << i))
            const isActive = i === active && (!sealed || manual)
            return (
              <li
                key={n.n}
                className="fw-node absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${(n.x / G.w) * 100}%`,
                  top: `${(n.y / G.h) * 100}%`,
                  width: `${HEX_PCT}%`,
                  '--d': `${0.3 + i * 0.11}s`,
                }}
              >
                <button
                  type="button"
                  onClick={() => pick(i)}
                  onPointerEnter={() => preview(i)}
                  aria-pressed={isActive}
                  aria-label={`${n.n} ${n.title}｜${n.sub}`}
                  className="block w-full cursor-pointer rounded-xl outline-none transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:ring-2 focus-visible:ring-brand"
                  style={{ transform: isActive ? 'scale(1.07)' : 'scale(1)' }}
                >
                  <HexPlate
                    node={n}
                    active={isActive}
                    lit={isLit}
                    story={isLit || isActive}
                    float={isActive ? null : ICON_FLOAT[i]}
                    iconSize={26}
                    badge
                    reduced={reduced}
                    recall={recall}
                    className="w-full"
                  />
                  <span className="mt-2 block text-center">
                    <span
                      className="block whitespace-nowrap text-[15px] font-semibold leading-[1.25] tracking-[-0.01em] transition-colors duration-500"
                      style={{ color: isLit || isActive ? n.ink : '#0b0f17' }}
                    >
                      {n.title}
                    </span>
                    <span
                      className="mt-0.5 block whitespace-nowrap text-[12px] leading-[1.35] transition-colors duration-500"
                      style={{ color: isLit ? '#4e5866' : '#67707c' }}
                    >
                      {n.sub}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* 窄屏：核心在上，六条通道竖排手风琴，展开即是释义。
   左侧导轨按通道逐段点亮，和桌面版「一条一条贯通」是同一套叙事。 */
function ChannelList({ nodes, active, litMask, sealed, manual, pick, reduced, recall }) {
  const hues = nodes.map((n) => n.hue)
  return (
    <div className="relative mx-auto max-w-[600px]">
      <div className="flex justify-center pb-7 pt-1">
        <CoreInstrument reduced={reduced} pulseKey={active} sealed={sealed} hues={hues} className="w-[116px]" disc="inset-[15%]" compact recall={recall} />
      </div>
      <ul className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-[27px] top-2 w-px"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(11,20,48,.16) 10%, rgba(11,20,48,.16) 90%, transparent)',
          }}
        />
        {nodes.map((n, i) => {
          const isLit = Boolean(litMask & (1 << i))
          const isActive = i === active && (!sealed || manual)
          return (
            <li key={n.n} className="fw-row relative mb-1.5" style={{ '--d': `${0.06 * i}s` }}>
              <span
                aria-hidden
                className="pointer-events-none absolute left-[26px] top-1 h-[54px] w-[3px] rounded-full transition-opacity duration-700"
                style={{ background: n.hue, opacity: isLit ? 0.85 : 0 }}
              />
              <button
                type="button"
                onClick={() => pick(i)}
                aria-expanded={isActive}
                className="relative z-[2] grid w-full grid-cols-[56px_minmax(0,1fr)_18px] items-center gap-3 rounded-xl border py-1.5 pr-2.5 text-left outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-brand"
                style={{
                  borderColor: isActive ? rgba(n.hue, 0.42) : 'transparent',
                  background: isActive ? rgba(n.hue, 0.09) : 'transparent',
                }}
              >
                <HexPlate
                  node={n}
                  active={isActive}
                  lit={isLit}
                  story={isLit || isActive}
                  float={isActive ? null : ICON_FLOAT[i]}
                  iconSize={19}
                  reduced={reduced}
                  recall={recall}
                  compact
                  className="w-[54px]"
                />
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] tabular-nums text-ink-300">{n.n}</span>
                    <span
                      className="truncate text-[14.5px] font-semibold leading-tight transition-colors duration-300"
                      style={{ color: isLit || isActive ? n.ink : '#0b0f17' }}
                    >
                      {n.title}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-ink-400">{n.sub}</span>
                </span>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className="shrink-0 transition-transform duration-500"
                  style={{ color: isActive ? n.ink : '#9aa1ac', transform: isActive ? 'rotate(180deg)' : 'none' }}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-500 ease-out"
                style={{ gridTemplateRows: isActive ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="ml-[68px] pb-2.5 pr-3 pt-2 text-[12.5px] leading-[1.7] text-ink-500">{n.desc}</p>
                  <ul className="ml-[68px] space-y-2 pb-3 pr-3">
                    {n.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[12.5px] leading-[1.5] text-ink-700">
                        <span
                          className="mt-[2px] grid h-[16px] w-[16px] shrink-0 place-items-center rounded-[5px]"
                          style={{ background: rgba(n.hue, 0.16), color: n.ink }}
                        >
                          <Check size={10} strokeWidth={3.2} />
                        </span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function CoBuildFramework() {
  const reduced = useReducedMotion()
  const wide = useMedia('(min-width: 768px)')
  const stageRef = useRef(null)
  const sceneRef = useRef(null)
  const entered = useInView(stageRef, { once: true, amount: 0.1 })
  const inView = useInView(stageRef, { amount: 0.04 })

  const [active, setActive] = useState(0)
  const [mask, setMask] = useState(0)
  const [seal, setSeal] = useState(false)
  const [auto, setAuto] = useState(true)
  const [manual, setManual] = useState(false)
  const [recall, setRecall] = useState(false)
  const [round, setRound] = useState(0)

  /* 后台可编辑面：区块标题 + 六个节点的 title / sub。坐标、通道色、
     释义与交付要点仍吃前端默认，覆盖只做文本合并，不动版式。 */
  const title = useContent('about.coBuild.title', coBuildTitle)
  const nodeOverlay = useContentData().about?.coBuild?.nodes
  const nodes = useMemo(
    () =>
      coBuildNodes.map((n) => {
        const o = nodeOverlay?.[n.n]
        return o ? { ...n, ...o, points: Array.isArray(o.points) && o.points.length ? o.points : n.points } : n
      }),
    [nodeOverlay],
  )

  const on = reduced || entered
  const running = on && inView && !reduced && auto

  /* 推进器：每 STEP_MS 贯通下一条，贯通后常驻不复位。指针悬浮不打断节奏。 */
  useEffect(() => {
    if (!running || mask === FULL) return
    const next = nextUnlit(mask)
    const t = setTimeout(
      () => {
        setActive(next)
        setMask((m) => m | (1 << next))
      },
      mask === 0 ? FIRST_MS : STEP_MS,
    )
    return () => clearTimeout(t)
  }, [running, mask])

  const litMask = reduced ? FULL : mask
  const sealed = reduced || seal

  /* 一轮 15 秒。第 14 秒彩虹环反向卷收，把六路光晕沿连线吸回核心；
     第 15 秒整场复位 —— data-on / data-lit / is-on 全部落回 0，
     一次性动画因此重新触发，下一轮从头再画。滚出视口时整轮挂起。 */
  useEffect(() => {
    if (!on || !inView || reduced) return
    const reel = setTimeout(() => setRecall(true), RECALL_MS)
    const reset = setTimeout(() => {
      setRecall(false)
      setSeal(false)
      setMask(0)
      setActive(0)
      setAuto(true)
      setManual(false)
      setRound((r) => r + 1)
    }, CYCLE_MS)
    return () => {
      clearTimeout(reel)
      clearTimeout(reset)
    }
  }, [on, inView, reduced, round])

  /* 六条齐了，等最后一颗能量头落地再结算。结算不受指针暂停影响，且只发生一次。 */
  useEffect(() => {
    if (litMask !== FULL || sealed) return
    const t = setTimeout(() => setSeal(true), LAND_MS)
    return () => clearTimeout(t)
  }, [litMask, sealed])

  /* 点选＝六条一次性齐发（一次并发的描线作为回应），聚焦所选，此后不再自动推进。 */
  const pick = (i) => {
    setActive(i)
    setAuto(false)
    setManual(true)
    setMask(FULL)
  }
  const preview = (i) => {
    setActive(i)
    if (sealed) setManual(true)
  }

  const node = sealed ? SEAL : nodes[active]
  const spot = sealed ? SEAL_SPOT : SPOT[active]

  return (
    <section
      id="framework"
      data-fw={on ? 'on' : 'idle'}
      className={`fw-stage relative isolate scroll-mt-24 overflow-hidden bg-mist-50 pb-[84px] pt-[76px] ${inView ? '' : 'fw-idle'}`}
      style={{
        '--ch': node.hue,
        '--ch-ink': node.ink,
        '--ch-soft': node.soft,
        '--ax': spot.ax,
        '--ay': spot.ay,
      }}
    >
      <style>{`
        @property --ch { syntax: '<color>'; inherits: true; initial-value: #3d8bff; }
        @property --ch-ink { syntax: '<color>'; inherits: true; initial-value: #0b5bd3; }
        @property --ch-soft { syntax: '<color>'; inherits: true; initial-value: #a8ccff; }
        @property --ax { syntax: '<number>'; inherits: true; initial-value: 50; }
        @property --ay { syntax: '<number>'; inherits: true; initial-value: 34; }
        @property --seal-sweep { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

        .fw-stage { transition: --ch .75s ease, --ch-ink .75s ease, --ch-soft .75s ease, --ax .9s cubic-bezier(.3,.8,.3,1), --ay .9s cubic-bezier(.3,.8,.3,1); }

        .fw-grid {
          background-image:
            linear-gradient(to right, rgba(11,20,48,.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(11,20,48,.05) 1px, transparent 1px);
          background-size: 44px 44px;
          -webkit-mask-image: radial-gradient(76% 66% at 50% 40%, #000 0%, transparent 80%);
          mask-image: radial-gradient(76% 66% at 50% 40%, #000 0%, transparent 80%);
        }
        .fw-spot {
          background:
            radial-gradient(34% 30% at calc(var(--ax) * 1%) calc(var(--ay) * 1%), color-mix(in srgb, var(--ch) 17%, transparent) 0%, transparent 70%),
            radial-gradient(46% 38% at 50% 36%, color-mix(in srgb, var(--ch-soft) 20%, transparent) 0%, transparent 74%),
            radial-gradient(38% 26% at 84% 88%, color-mix(in srgb, var(--ch) 8%, transparent) 0%, transparent 72%);
        }

        /* ―― 入场 ―― */
        .fw-shell { opacity: 0; transform: translateY(22px); transition: opacity .8s ease, transform .9s cubic-bezier(.2,.8,.2,1); }
        .fw-shell.is-on { opacity: 1; transform: none; }

        .fw-node { opacity: 0; scale: .74; transition: opacity .7s ease var(--d,0s), scale .8s cubic-bezier(.2,.9,.25,1.05) var(--d,0s); }
        .fw-scene.is-on .fw-node { opacity: 1; scale: 1; }

        .fw-row { opacity: 0; transform: translateY(12px); transition: opacity .6s ease var(--d,0s), transform .6s cubic-bezier(.2,.8,.2,1) var(--d,0s); }
        .is-on .fw-row { opacity: 1; transform: none; }

        .fw-core { opacity: 0; scale: .6; transition: opacity .6s ease .15s, scale 1.05s cubic-bezier(.34,1.4,.64,1) .15s; }
        .is-on .fw-core { opacity: 1; scale: 1; }

        .fw-link { stroke-dasharray: 100; stroke-dashoffset: 100; }
        .fw-scene.is-on .fw-link { stroke-dashoffset: 0; }

        .fw-parallax { transform: translate3d(var(--px,0), var(--py,0), 0); transition: transform .5s cubic-bezier(.2,.8,.2,1); }

        /* ―― 逐条贯通：能量头领着线画过去，位移量 = dasharray 周期 ―― */
        .fw-flow { opacity: 0; }
        .fw-flow[data-on="1"] { opacity: 1; transition: opacity .45s ease; }
        .fw-flow-glow, .fw-flow-line { stroke-dasharray: 100; stroke-dashoffset: 0; }
        @keyframes fw-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
        .fw-flow[data-on="1"] .fw-flow-glow,
        .fw-flow[data-on="1"] .fw-flow-line { animation: fw-draw .85s cubic-bezier(.36,0,.24,1) both; }

        .fw-flow-head, .fw-flow-tip { opacity: 0; }
        @keyframes fw-send { 0% { stroke-dashoffset: 5; opacity: 1; } 86% { opacity: 1; } 100% { stroke-dashoffset: -95; opacity: 0; } }
        @keyframes fw-send-tip { 0% { stroke-dashoffset: 2.5; opacity: 1; } 86% { opacity: 1; } 100% { stroke-dashoffset: -97.5; opacity: 0; } }
        .fw-flow[data-on="1"] .fw-flow-head { animation: fw-send .85s cubic-bezier(.36,0,.24,1) both; }
        .fw-flow[data-on="1"] .fw-flow-tip { animation: fw-send-tip .85s cubic-bezier(.36,0,.24,1) both; }

        .fw-flow-stream { opacity: 1; }
        @keyframes fw-stream-in { from { opacity: 0; } to { opacity: 1; } }
        .fw-flow[data-on="1"] .fw-flow-stream { animation: fw-stream-in .45s ease .78s both; }
        @keyframes fw-packet { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -10; } }
        .fw-packet { stroke-dashoffset: 0; animation: fw-packet .62s linear infinite; }

        /* 抵达：六边形炸出一圈光环 + 一次底色闪烁 */
        .fw-hex-arrive { opacity: 0; }
        @keyframes fw-hex-arrive { 0% { opacity: .9; scale: .96; } 100% { opacity: 0; scale: 1.5; } }
        .fw-hex[data-lit="1"] .fw-hex-arrive { animation: fw-hex-arrive .95s cubic-bezier(.16,1,.3,1) .62s both; }
        .fw-hex-flash { opacity: 0; }
        @keyframes fw-hex-flash { 0% { opacity: 0; } 24% { opacity: .32; } 100% { opacity: 0; } }
        .fw-hex[data-lit="1"] .fw-hex-flash { animation: fw-hex-flash .85s ease-out .58s both; }

        /* 抵达时炸开的那团散射光：跟着冲击环一起摊开，然后就地常驻 ——
           不再衰减回去，一直亮到本轮第 14 秒被彩虹环收走。 */
        .fw-hex-halo { opacity: 0; scale: .5; transition: opacity .55s ease .58s, scale .95s cubic-bezier(.16,1,.3,1) .58s; }
        .fw-hex-halo.is-on { opacity: 1; scale: 1; }
        @keyframes fw-halo-breathe { 0%,100% { opacity: .88; scale: 1; } 50% { opacity: 1; scale: 1.06; } }
        .fw-hex-halo.is-on.fw-loop { animation: fw-halo-breathe 5.2s ease-in-out 1.6s infinite; }

        /* ―― 第 14 秒：彩虹环回收 ――
           光晕先鼓一下再沿本通道方向缩着飞进环里；连线同时从六边形端往回抽，
           白色回收头领着往核心跑；合环反向卷收，端口最后熄灭。整段 0.98s，
           正好在第 15 秒复位前收干净。 */
        @keyframes fw-halo-reel {
          0% { opacity: 1; scale: 1; translate: 0 0; }
          24% { opacity: 1; scale: 1.14; translate: 0 0; }
          100% { opacity: 0; scale: .16; translate: calc(var(--rx,0) * 1%) calc(var(--ry,0) * 1%); }
        }
        .fw-hex-halo.is-on.is-recall { animation: fw-halo-reel .78s cubic-bezier(.5,0,.35,1) var(--hd,0s) both; }

        @keyframes fw-reel-line { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 100; } }
        .fw-flow[data-recall="1"] .fw-flow-glow,
        .fw-flow[data-recall="1"] .fw-flow-line { animation: fw-reel-line .8s cubic-bezier(.5,0,.35,1) both; }
        .fw-flow[data-recall="1"] .fw-flow-stream { animation: none; opacity: 0; transition: opacity .3s ease; }

        .fw-flow-reel { opacity: 0; }
        @keyframes fw-reel-head {
          0% { stroke-dashoffset: -95; opacity: 0; } 16% { opacity: 1; }
          84% { opacity: 1; } 100% { stroke-dashoffset: 5; opacity: 0; }
        }
        @keyframes fw-reel-tip {
          0% { stroke-dashoffset: -97; opacity: 0; } 16% { opacity: 1; }
          84% { opacity: 1; } 100% { stroke-dashoffset: 3; opacity: 0; }
        }
        .fw-flow[data-recall="1"] .fw-flow-reel { animation: fw-reel-head .8s cubic-bezier(.5,0,.35,1) both; }
        .fw-flow[data-recall="1"] .fw-flow-reel.is-tip { animation: fw-reel-tip .8s cubic-bezier(.5,0,.35,1) both; }

        @keyframes fw-reel-in { 0% { opacity: 0; scale: 1.55; } 34% { opacity: .9; scale: 1.2; } 100% { opacity: 0; scale: .8; } }
        .fw-reel { opacity: 0; }
        .fw-reel.is-on { animation: fw-reel-in .95s cubic-bezier(.3,0,.3,1) both; }

        /* ―― 结算：六路齐发 + 冲击波 + 六色合环 + 端口 + 掠光 + 印章 ―― */
        .fw-flow-wave { opacity: 0; }
        @keyframes fw-wave { 0% { stroke-dashoffset: 7; opacity: 0; } 12% { opacity: 1; } 100% { stroke-dashoffset: -93; opacity: 0; } }
        .fw-flow[data-seal="1"] .fw-flow-wave { animation: fw-wave .95s cubic-bezier(.3,0,.35,1) both; }

        .fw-bigwave { opacity: 0; }
        @keyframes fw-bigwave { 0% { opacity: .5; scale: .9; } 100% { opacity: 0; scale: 2.5; } }
        .fw-bigwave.is-on { animation: fw-bigwave 1.6s cubic-bezier(.16,1,.3,1) both; }

        .fw-shock { opacity: 0; }
        @keyframes fw-shock { 0% { opacity: .75; scale: .8; } 100% { opacity: 0; scale: 2.15; } }
        .fw-shock.is-on { animation: fw-shock 1.5s cubic-bezier(.16,1,.3,1) both; }

        .fw-seal-ring { --seal-sweep: 0deg; opacity: 0; transition: opacity .4s ease; }
        .fw-seal-ring.is-on { --seal-sweep: 360deg; opacity: 1; transition: opacity .4s ease .2s, --seal-sweep 1.2s cubic-bezier(.32,0,.2,1) .2s; }
        .fw-seal-ring.is-on.fw-loop { animation: fw-spin 20s linear infinite; }
        /* 回收：合环反着卷回起点，六个端口最后熄灭。必须排在 fw-spin 之后才能盖掉它。 */
        @keyframes fw-seal-reel { 0%,38% { --seal-sweep: 360deg; } 100% { --seal-sweep: 0deg; } }
        .fw-seal-ring.is-on.is-recall { animation: fw-seal-reel .95s cubic-bezier(.5,0,.35,1) both; }
        .fw-seal-port { opacity: 0; scale: .2; transition: opacity .35s ease, scale .55s cubic-bezier(.34,1.6,.64,1); }
        .fw-seal-ports.is-on .fw-seal-port { opacity: 1; scale: 1; }
        .fw-seal-ports.is-on.is-recall .fw-seal-port { opacity: 0; scale: .2; transition: opacity .35s ease .55s, scale .4s cubic-bezier(.5,0,.4,1) .55s; }

        .fw-shine { opacity: 0; }
        @keyframes fw-shine { 0% { opacity: 0; translate: 0 0; } 18% { opacity: 1; } 100% { opacity: 0; translate: 330% 0; } }
        .fw-shine.is-on { animation: fw-shine 1.15s cubic-bezier(.4,0,.3,1) .5s both; }

        /* ―― 结算：仪表家具淡出 → 白盘缩成种子飞向北京 → 服务地图接管 ――
           落点按地图几何算死：地图占核心 86% 宽、居中，北京在 viewBox (179.2,78.1)，
           换算到核心盒是 (66.3%, 42.8%)；白盘自身占 72%，所以位移取 22.6% / -10.1%。
           终态缩放 .067 让盘里的徽标正好等于一枚城市针脚，交接看不出断点。 */
        .fw-dial { transition: opacity .55s ease; }
        .fw-dial.is-off { opacity: 0; }
        .fw-disc { translate: 0 0; scale: 1; opacity: 1; }
        /* 复位时 is-seed 摘掉，动画名换回 fw-disc-in 即为一次新的入场，白盘柔和长回来 */
        @keyframes fw-disc-in { 0% { opacity: 0; scale: .55; } 100% { opacity: 1; scale: 1; } }
        .fw-disc { animation: fw-disc-in .55s cubic-bezier(.2,.9,.25,1) both; }
        @keyframes fw-disc-seed {
          0% { translate: 0 0; scale: 1; opacity: 1; }
          34% { translate: 0 -4%; scale: .46; opacity: 1; }
          74% { translate: 22.6% -10.1%; scale: .13; opacity: 1; }
          100% { translate: 22.6% -10.1%; scale: .067; opacity: 0; }
        }
        .fw-disc.is-seed { animation: fw-disc-seed 1.45s cubic-bezier(.4,0,.3,1) both; }

        /* ―― 核心仪表 ―― */
        @keyframes fw-breathe { 0%,100% { opacity: .62; scale: 1; } 50% { opacity: 1; scale: 1.07; } }
        .fw-breathe { animation: fw-breathe 4.4s ease-in-out infinite; }
        @keyframes fw-spin { to { rotate: 360deg; } }
        .fw-sweep { animation: fw-spin 7s linear infinite; }
        .fw-ticks { animation: fw-spin 52s linear infinite reverse; }
        .fw-orbit-a { transform: rotateX(68deg) rotate(-18deg); animation: fw-spin 13s linear infinite; }
        .fw-orbit-b { transform: rotateX(73deg) rotate(52deg); animation: fw-spin 21s linear infinite reverse; }
        @keyframes fw-scan { 0%,100% { transform: translateY(-10px); opacity: 0; } 22%,78% { opacity: .9; } 50% { transform: translateY(70px); } }
        .fw-scan { animation: fw-scan 3.6s ease-in-out infinite; }
        @keyframes fw-pulse { 0% { opacity: .8; scale: .94; } 100% { opacity: 0; scale: 1.5; } }
        .fw-pulse { opacity: 0; animation: fw-pulse 1.15s cubic-bezier(.16,1,.3,1) both; }
        @keyframes fw-hex-spin { to { transform: rotate(360deg); } }
        .fw-hex-ring { animation: fw-hex-spin 16s linear infinite; }

        @keyframes fw-icon-float {
          0%,100% { transform: translate3d(0,0,0) scale(var(--s0,1)); }
          30% { transform: translate3d(var(--dx,2.5px), calc(var(--dy,2.5px) * -0.65), 0) scale(var(--s1,1)); }
          58% { transform: translate3d(calc(var(--dx,2.5px) * -0.55), var(--dy,2.5px), 0) scale(var(--s0,1)); }
          82% { transform: translate3d(calc(var(--dx,2.5px) * 0.35), calc(var(--dy,2.5px) * 0.45), 0) scale(var(--s1,1)); }
        }
        .fw-icon-drift { display: block; animation: fw-icon-float 12s ease-in-out infinite; will-change: transform; }

        /* 滚出视口 / 切后台：停掉所有循环，渲染不再逐帧重排 */
        .fw-idle .fw-loop { animation-play-state: paused; }

        @media (prefers-reduced-motion: reduce) {
          .fw-stage { transition: none; }
          .fw-shell, .fw-node, .fw-row, .fw-core { opacity: 1; transform: none; scale: 1; transition: none; }
          .fw-link { stroke-dashoffset: 0; transition: none; }
          .fw-parallax { transform: none; transition: none; }
          .fw-packet { stroke-dashoffset: 0; animation: none; }
          .fw-flow, .fw-flow-glow, .fw-flow-line, .fw-flow-stream, .fw-hex-arrive, .fw-hex-flash,
          .fw-flow-wave, .fw-flow-reel, .fw-bigwave, .fw-shock, .fw-shine, .fw-hex-halo, .fw-reel,
          .fw-seal-ring, .fw-seal-port, .fw-dial, .fw-disc { animation: none; transition: none; }
          .fw-hex-halo { opacity: 1; scale: 1; translate: 0 0; }
          .fw-flow-reel, .fw-reel { opacity: 0; }
          .fw-dial { opacity: 0; }
          .fw-disc { opacity: 0; }
          .fw-breathe, .fw-sweep, .fw-ticks, .fw-orbit-a, .fw-orbit-b, .fw-scan,
          .fw-pulse, .fw-hex-ring, .fw-icon-drift { animation: none; }
          .fw-pulse { opacity: 0; }
          .fw-orbit-a { transform: rotateX(68deg) rotate(-18deg); }
          .fw-orbit-b { transform: rotateX(73deg) rotate(52deg); }
        }
        ${glyphCss}
        ${coverageCss}
      `}</style>

      {/* 环境层：整屏一层跟着通道滑动的洗光 + 极淡纸纹。
          没有底板、没有描边、没有圆角 —— 图直接落在页面上。 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="fw-spot absolute inset-0" />
        <div className="dark-grain absolute inset-0 opacity-[0.03] mix-blend-multiply" />
      </div>

      <div className="container-x relative">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div className="max-w-[640px]">
              <p className="font-mono text-caption uppercase tracking-eyebrow text-brand-text">WHY CHOOSE US</p>
              <h2 className="mt-2.5 text-[32px] font-bold leading-[1.04] tracking-tight text-ink-900 sm:text-[38px] lg:text-[46px]">
                {title}
              </h2>
              <p className="mt-3 text-[15px] leading-[1.7] text-ink-500">{coBuildLead}</p>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
              06 CHANNELS<span className="mx-2 text-ink-200">·</span>点选切换通道
            </p>
          </div>
        </Reveal>

        <div ref={stageRef} className={`fw-shell relative mt-10 ${on ? 'is-on' : ''}`}>
          <div className="relative z-[1]">
            {wide ? (
              <RadialScene
                nodes={nodes}
                active={active}
                litMask={litMask}
                sealed={sealed}
                manual={manual}
                pick={pick}
                preview={preview}
                reduced={reduced}
                on={on}
                sceneRef={sceneRef}
                live={inView && !reduced}
                recall={recall}
              />
            ) : (
              <ChannelList
                nodes={nodes}
                active={active}
                litMask={litMask}
                sealed={sealed}
                manual={manual}
                pick={pick}
                reduced={reduced}
                recall={recall}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}