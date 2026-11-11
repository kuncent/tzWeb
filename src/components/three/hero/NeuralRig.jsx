import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { heroScenes } from '../../../data/heroScenes'
import { ContactGlow, FlowArc, damp, useAppear } from './kit'
import AgentPanel, { ADF, HERO, HERO_H, HERO_W, BOARD_HUE, THK } from './AgentPanels'
import { BEAT_MS, beatNow } from './buildBus'

/* ============================================================
 * AI 屏布景：同一块展板的五份复制品沿一条有纵深的弧线轮流走到中央
 * ------------------------------------------------------------
 * 上一版是「一主四卫」的固定席位：0 号牌最大最近，其余四块散在四周。
 * 用户要的是五块轮流到中间放大，且「不改内容、不改摆放，只加轮播」——
 * 所以五块牌是同一块牌的复制品（内容/尺寸/色完全相同，见 AgentPanels），
 * 席位不再按牌固定，而是按槽位排成一条浅弧：中央槽就是原来那块主牌的位置
 * 与大小（scale 1，c 为原解），左右近槽后退 0.46m / 0.74 倍，远槽再退
 * 0.42m / 0.53 倍。位置、缩放、yaw 一起变，才有透视而不是一排贴纸。
 *
 * 节奏：每 4.8s 前进一格，其中 64% 停住（读内容），36% 换位。换位用
 * smoothstep，首尾速度归零，所以「进来 / 出去」是连续的，没有推一下的顿感。
 * 环形回绕在 |槽距| > 2.02 时开始压透明度、2.46 时归零，跨过 ±2.5 的那一帧
 * 看不见，因此循环是无缝的（不是靠跳帧或交叉淡入掩盖）。
 *
 * 可读性：五块牌统一用原主牌 288×178 版式，轮到中央时和原来一模一样大；
 * 侧牌靠 3D 缩放 + 纵深 + 压亮度（近 0.60 / 远 0.20）退到背景里。
 * 中央牌的 DOM 层级永远最高（z 60 → 58 → 56），侧牌不会盖住中间。
 *
 * 链路：按槽位固定的相邻弧，牌在换位时整组淡出（settle = 0），
 * 停稳后再亮回来 —— 线始终接在牌边上，不会出现「线连到空气里」。
 *
 * 降级：reduced-motion 时 phase 冻结在 0（0 号牌居中、侧牌就位），
 * 不浮动、不换位、镜头也不漂移，画面就是一张静态构图。
 * ============================================================ */

const SCENE = heroScenes.find((s) => s.id === 'ai') || heroScenes[0]
/* 布景离地高度。机位 look 在 y 1.02，这一层不动，镜头与构图的换算才成立 */
const CENTER = 1.45
/* 整组左偏量：算视线前得先把 rig 局部 x 偏回世界 */
const RIG_X = 0.15
const MODES = ['prep', 'class', 'insight', 'hub']

/* ―― 轮播参数 ―― */
const N = 5
const STEP = 4.8 // 每格 4.8s（停 ~3.1s + 走 ~1.7s）
const HOLD_FRAC = 0.64
const WRAP = N / 2
const YAW = 0.16
const PITCH_GAIN = 0.5
const CAM = SCENE.cam.pos

/* ―― 三档弧线：中心席位沿用各档原来反解出的主牌位，左右按档位收窄 ――
   x1/z1/y1 是近槽（±1）的偏移，x2/z2/y2 是从近槽再走到远槽（±2）的增量。
   s1/s2 是近/远槽的缩放。1440 起用 base，1280–1439 用 wide，1024–1279
   用 narrow —— 两档紧凑弧线是为了不把牌推出右侧，并被 sticky 容器正常裁切。 */
const RINGS = {
  base: { c: { x: 0.308, y: 0.169, z: 0.466 }, x1: 1.26, x2: 0.9, z1: -0.46, z2: -0.42, y1: 0.045, y2: 0.07, s1: 0.74, s2: 0.53 },
  wide: { c: { x: 0.952, y: 0.962, z: 0.323 }, x1: 1.02, x2: 0.72, z1: -0.36, z2: -0.33, y1: 0.035, y2: 0.06, s1: 0.75, s2: 0.55 },
  narrow: { c: { x: 1.723, y: 0.974, z: 0.294 }, x1: 0.7, x2: 0.47, z1: -0.26, z2: -0.22, y1: 0.025, y2: 0.045, s1: 0.77, s2: 0.57 },
}

const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/** 槽位 k（-2..2，允许小数）→ 这一格的位姿。k 的小数部分由换位进度直接给出，
    所以同一块牌在整段运动里是连续插值的，不会出现分段跳变 */
function poseAt(k, ring) {
  const a = Math.min(Math.abs(k), 2.6)
  const s1 = Math.min(a, 1)
  const s2 = Math.max(0, a - 1)
  const sgn = k < 0 ? -1 : 1
  const x = ring.c.x + sgn * (ring.x1 * s1 + ring.x2 * s2)
  const z = ring.c.z + ring.z1 * s1 + ring.z2 * s2
  const y = ring.c.y + ring.y1 * s1 + ring.y2 * s2
  const scale = 1 - (1 - ring.s1) * s1 - (ring.s1 - ring.s2) * s2
  const yaw = -sgn * YAW * Math.min(a, 2)
  const sight = Math.hypot(CAM[0] - (RIG_X + x), CAM[2] - z)
  const pitch = -Math.atan2(CAM[1] - (CENTER + y), sight) * PITCH_GAIN
  /* 亮度：中央满亮，近槽 0.60、远槽 0.20；到 2.46 槽外完全退场，
     环形回绕就发生在透明度为 0 的那一格，看不见接缝 */
  const fade = 1 - smooth01((a - 2.02) / 0.44)
  const opacity = Math.max(0, 1 - 0.4 * a) * fade
  return { x, y, z, scale, yaw, pitch, opacity }
}

/* ―― 相邻槽位之间的数据弧：0 最左 → 4 最右，停稳时接在牌边上 ――
   on 决定这条弧归哪条指令管，沿用原来的「按指令点亮不同链路」读法 */
const EDGES = [
  { a: 0, b: 1, ex: 'r', en: 'l', ak: 0.16, bk: -0.16, on: ['class', 'insight'] },
  { a: 1, b: 2, ex: 'r', en: 'l', ak: 0.12, bk: -0.18, on: ['class', 'prep', 'hub'] },
  { a: 2, b: 3, ex: 'r', en: 'l', ak: 0.18, bk: -0.12, on: ['class', 'prep', 'insight'] },
  { a: 3, b: 4, ex: 'r', en: 'l', ak: 0.16, bk: -0.16, on: ['class', 'insight', 'hub'] },
]

/** 一档弧线 → 静态量：五个槽位、每条链路的端点与颜色 */
function buildLayout(ring) {
  const poses = [-2, -1, 0, 1, 2].map((k) => poseAt(k, ring))
  const anchor = (i, side, along = 0) => {
    const p = poses[i]
    const sw = HERO_W * p.scale
    const sh = HERO_H * p.scale
    let ax = 0
    let ay = 0
    if (side === 'l') [ax, ay] = [-sw / 2, along * sh]
    if (side === 'r') [ax, ay] = [sw / 2, along * sh]
    if (side === 't') [ax, ay] = [along * sw, sh / 2]
    if (side === 'b') [ax, ay] = [along * sw, -sh / 2]
    const c = Math.cos(p.yaw)
    const n = Math.sin(p.yaw)
    return new THREE.Vector3(p.x + ax * c + 0.02 * n, p.y + ay, p.z - ax * n + 0.02 * c)
  }
  const arcs = EDGES.map((e) => ({
    a: anchor(e.a, e.ex, e.ak),
    b: anchor(e.b, e.en, e.bk),
    bend: e.bend ?? 0.16,
    lift: e.lift ?? 0.06,
    tc: e.tc ?? 0.14,
    key: `${e.a}>${e.b}`,
    on: e.on,
    hue: BOARD_HUE,
  }))
  return { ring, poses, arcs }
}

const BASE = buildLayout(RINGS.base)
const NARROW = buildLayout(RINGS.narrow)
const WIDE = buildLayout(RINGS.wide)

export default function NeuralRig({ active, cmd, accent = SCENE.accent, panelLayout = false, still = false }) {
  /* 第三参是这套布景的离地高度：useAppear 每帧写 root.position.y，
     不传进来就会把下面 JSX 的 position={[0, CENTER, 0]} 抹成 0。
     第四参 still：降级动效时直接落到位，不演升起的过场 */
  const [root, prog] = useAppear(active, 3.2, CENTER, still)
  const boards = useRef([])
  const panels = useRef([])
  const flow = useRef(EDGES.map(() => 0))
  const opLast = useRef(Array(N).fill(-1))
  const offLast = useRef(Array(N).fill(''))
  /* 连续的轮播相位：0 是 0 号牌居中，1 是 1 号牌居中……到 5 回绕 */
  const phase = useRef(0)
  const acc = useRef(0)
  const [focus, setFocus] = useState(0)
  const focusRef = useRef(0)
  const modeId = MODES.includes(cmd.id) ? cmd.id : 'prep'

  /* 面板重挂的节拍沿用 buildBus：与看板那台对齐到墙，切桌面时不出现两套零点。
     降级动效时不再排程 —— 静态构图里没有在跑的主线 */
  const [beat, setBeat] = useState(() => beatNow())
  useEffect(() => {
    if (!active || still) return
    setBeat(beatNow())
    let id = null
    const schedule = () => {
      id = setTimeout(() => {
        setBeat(beatNow())
        schedule()
      }, BEAT_MS - (Date.now() % BEAT_MS))
    }
    schedule()
    return () => clearTimeout(id)
  }, [active, still])

  /* 三档弧线：≥1440 用 base；1280–1439 用 wide；1024–1279 用 narrow */
  const L = panelLayout === 'narrow' ? NARROW : panelLayout === 'wide' ? WIDE : BASE

  /* 面板显隐以「DOM 上此刻是什么」为准：先比缓存再取 el 会留一个死锁窗口。
     opacity 写在牌面内容层上。层级不能用每帧写 wrapper.style.zIndex 来解决：
     drei 自己每帧按距离重写，而 deps 相同的 zIndexRange 在 6~7m 的景深里
     四舍五入后全是 60，分不出中央与侧牌 —— 所以给每块牌一组按「离中央几格」
     错开的 zIndexRange，中央 60、近侧 58、远侧 56，drei 每帧重算也落在这三档。
     换位到中点时 focus 翻转，进来的那块正好在被超过的那一刻顶到最上层。 */
  const setPanelOp = (i, v) => {
    const el = panels.current[i]
    if (!el) return
    if (opLast.current[i] === v) return
    opLast.current[i] = v
    el.style.display = v > 0.02 ? '' : 'none'
    if (v > 0.02) el.style.opacity = v
  }
  const hideAll = () => {
    for (let i = 0; i < N; i++) {
      const el = panels.current[i]
      if (!el || el.style.display === 'none') continue
      opLast.current[i] = 0
      el.style.display = 'none'
    }
  }

  useFrame((state, delta) => {
    if (!active && prog.current < 0.01) {
      hideAll()
      return
    }
    const dt = Math.min(delta, 0.05)
    const appear = prog.current
    const live = appear > 0.5 ? 1 : 0

    /* 相位推进：等布景升到位才开始走，避免第一块牌在入场途中就换位 */
    if (!still && appear > 0.97) acc.current += dt
    const raw = acc.current / STEP
    const base = Math.floor(raw)
    const f = raw - base
    const e = smooth01((f - HOLD_FRAC) / (1 - HOLD_FRAC))
    if (!still) phase.current = base + e
    const ph = still ? 0 : phase.current
    /* 换位中把链路整组淡出：牌在动，线接在固定槽位边上会对不上 */
    const settle = still ? 1 : 1 - Math.sin(Math.PI * e)

    /* 中央牌：换到下一格的中点再翻，扫描带与 FOCUS 只在中央那一块出现 */
    const now = ((Math.round(ph) % N) + N) % N
    if (now !== focusRef.current) {
      focusRef.current = now
      setFocus(now)
    }

    for (let i = 0; i < EDGES.length; i++) {
      flow.current[i] = damp(flow.current[i], EDGES[i].on.includes(modeId) ? live * settle : 0, 3.2, dt)
    }

    for (let i = 0; i < N; i++) {
      /* i - ph 落在 [-2.5, 2.5)：环形窗口的回绕点在透明度 0 的角落，
         所以看不见的那一侧可以任意接缝 */
      let k = i - ph
      k = ((((k + WRAP) % N) + N) % N) - WRAP
      const p = poseAt(k, L.ring)
      const g = boards.current[i]
      if (g) {
        /* 不在这里加「空中微浮」：每帧改一次组矩阵，五个全屏级 DOM 图层
           就要跟着每帧重新合成。实测停稳时会从 56fps 掉到 39fps（1440×900），
           而 CSS 动画版本一样贵（图层照样每帧重合成）。牌停在槽位上不动，
           「活着」的感觉交给扫描带、窗控点脉冲与数据弧。 */
        g.position.set(p.x, p.y, p.z)
        g.rotation.y = p.yaw
        g.rotation.x = p.pitch
        g.scale.setScalar(p.scale)
      }
      setPanelOp(i, Math.round(Math.min(1, appear * p.opacity) * 50) / 50)
      /* 背板溢出量跟着当前 yaw/pitch 走（牌厚 THK 的透视投影）。
         不能用挂载时的初始 yaw：侧牌落到中央时 yaw 已归零，背板却还歪着 4px，
         中央那一块就不再是原来那块主牌了。
         按 1px 量化 + 只写变化：这两个值逐帧重写会让整块牌的栅格每帧失效，
         而这 4px 的偏移在 1px 粒度上完全看不出来 */
      const el = panels.current[i]
      if (el) {
        const x = Math.round(-Math.sin(p.yaw) * THK)
        const y = Math.round(-Math.sin(p.pitch) * THK)
        const sig = `${x},${y}`
        if (offLast.current[i] !== sig) {
          offLast.current[i] = sig
          el.style.setProperty('--ptx', `${x}px`)
          el.style.setProperty('--pty', `${y}px`)
        }
      }
    }
  })

  /* 离中央越远层级越低：0 格 → 60，1 格 → 58，2 格 → 56。
     以 focus（已翻到新中央）为准，换位中点两侧牌等大时，进来的那块在上 */
  const stackRank = (i) => {
    const k = ((((i - focus + WRAP) % N) + N) % N) - WRAP
    return Math.min(2, Math.round(Math.abs(k)))
  }

  return (
    <group ref={root} name="rig-neural" position={[RIG_X, CENTER, 0]}>
      {/* 地上那团接触光留着：五块界面都飘在空中，没有它整个布景就是浮的 */}
      <ContactGlow radius={1.8} color={accent} opacity={0.07} y={-CENTER + 0.012} />

      {/* ―― 数据链路：弯管 + 沿线短划 + 两枚离散数据包 ――
          按槽位固定，牌停稳时端点正好接在相邻两块牌的边上；
          换位期间整组淡出（settle），停稳后再亮回来 */}
      {L.arcs.map((c, i) => (
        <FlowArc
          key={c.key}
          a={c.a}
          b={c.b}
          bend={c.bend}
          lift={c.lift}
          towardCamera={c.tc}
          color={c.hue}
          radius={0.0055}
          opacity={0.82}
          speed={0.3 + i * 0.018}
          size={0.08}
          active={() => flow.current[i]}
        />
      ))}

      {/* ―― 五块同一块牌的复制品：真 DOM，按槽位透视摆在弧线上 ――
          pointerEvents 关掉：这一屏不需要点牌，牌是背景舞台的一部分。
          zIndexRange 与链屏同一段：高于 scrim、低于 StoryHero 的排版层（z-[70]）；
          前后层级由下面按「离中央几格」错开的 zIndexRange 保证 */}
      {[0, 1, 2, 3, 4].map((i) => {
        /* 初始位置直接落在 phase=0 的槽位上，挂载第一帧不会从原点闪过来 */
        const k0 = i > 2 ? i - N : i
        const s0 = L.poses[k0 + 2]
        return (
          <group
            key={SCENE.agents[i] ?? i}
            ref={(el) => (boards.current[i] = el)}
            position={[s0.x, s0.y, s0.z]}
            rotation-x={s0.pitch}
            rotation-y={s0.yaw}
            visible={false}
          >
            <Html
              ref={(el) => (panels.current[i] = el)}
              transform
              distanceFactor={ADF}
              zIndexRange={[60 - stackRank(i) * 2, 20 - stackRank(i) * 2]}
              pointerEvents="none"
              style={{ width: HERO.w, height: HERO.h, pointerEvents: 'none' }}
            >
              <AgentPanel index={i} beat={beat} live={i === focus} yaw={s0.yaw} pitch={s0.pitch} />
            </Html>
          </group>
        )
      })}
    </group>
  )
}
