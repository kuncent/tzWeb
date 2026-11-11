import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { heroScenes } from '../../../data/heroScenes'
import { ContactGlow, FlowArc, damp, useAppear } from './kit'
import AgentPanel, { ADF, HERO, HERO_H, HERO_W, HUES, THK } from './AgentPanels'
import { BEAT_MS, beatNow } from './buildBus'

/* ============================================================
 * AI 屏布景：五块方案展板轮流走「一主四卫」那五个错开的席位
 * ------------------------------------------------------------
 * 席位回到轮播之前那一版：中央最近最大，左上高而远，左下 / 右下贴镜头压得最低，
 * 右上最深 —— 五块牌是错开深度的一圈，不是一排（数值见下面的 SEATS，
 * 都是当年按相机矩阵反解出来的原值）。轮播只是让它们依次走这五个位：
 * 右上 → 右下 → 中央 → 左下 → 左上。
 * 五块牌各挂一套方案（数字经济 / 金融科技 / 应用统计 / 商务数据分析 /
 * 工商科一体化），内容与强调色见 AgentPanels，数据直接取 solutionPlans：
 * 席位与方案的对应见 SLOT_SEAT 与 AgentPanels 的 ORDER。中央席保持原主牌的
 * 位置与大小（scale 1），所以停稳时中央那一块和原来分毫不差。
 *
 * 节奏：每 4.8s 前进一格，其中 64% 停住（读内容），36% 换位。换位用
 * smoothstep，首尾速度归零，所以「进来 / 出去」是连续的，没有推一下的顿感。
 * 环形回绕在 |槽距| > 2.0 时开始压透明度、2.45 时归零，跨过 ±2.5 的那一帧
 * 看不见，因此循环是无缝的（不是靠跳帧或交叉淡入掩盖）。
 *
 * 可读性：五块牌统一用原主牌 288×178 版式，轮到中央时和原来一模一样大；
 * 侧牌靠席位本身的纵深 + 3D 缩放（208/288）+ 压亮度（近 0.70 / 远 0.40）退后。
 * 中央牌的 DOM 层级永远最高（z 60 → 58 → 56），侧牌不会盖住中间。
 *
 * 链路：按环形顺序相邻的四条弧，牌在换位时整组淡出（settle = 0），
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
const PITCH_GAIN = 0.5
const CAM = SCENE.cam.pos

/* ―― 席位：恢复到「一主四卫」那版的五点布阵 ――
   各档的数值都是当初按相机矩阵反解出来的（tmp/ai-seat.cjs 等），不是调参调出来的：
   中央最近最大；左上抬得很高、往后退；左下 / 右下几乎贴着镜头、压得最低；
   右上最深最远。所以五块牌是「错开深度」的一圈，而不是一排。
   轮播只是让它们依次走这五个位：右上 → 右下 → 中央 → 左下 → 左上。
   中心席（SEATS[i][0]）与 40px 右移、机位都没动，停稳时中央那块和原来一模一样。

   副牌缩放 SAT_K = 208/288：原来副牌的 DOM 是 208×122，现在五块统一用主牌
   288×178 的版式，乘这个系数后它在屏幕上占的像素与那一版完全一致。
   宽档 / 窄档再乘该档原来的副牌缩放（0.70 / 0.80）。 */
const SAT_K = 208 / 288

const SEATS = {
  base: [
    { x: 0.308, y: 0.169, z: 0.466, yaw: -0.034, s: 1 }, // 0 中央（最近）
    { x: -1.521, y: 1.185, z: 0.053, yaw: 0.243, s: SAT_K }, // 1 左上（远）
    { x: -0.739, y: -1.024, z: 0.594, yaw: 0.139, s: SAT_K }, // 2 左下（近）
    { x: 0.767, y: -1.027, z: 0.038, yaw: -0.101, s: SAT_K }, // 3 右下（近）
    { x: 0.835, y: 1.375, z: -0.894, yaw: -0.098, s: SAT_K }, // 4 右上（最远）
  ],
  wide: [
    { x: 0.952, y: 0.962, z: 0.323, yaw: -0.135, s: 1 },
    { x: 2.213, y: 1.209, z: 0.018, yaw: -0.311, s: SAT_K * 0.7 },
    { x: 2.214, y: 0.566, z: 0.067, yaw: -0.313, s: SAT_K * 0.7 },
    { x: 3.166, y: 0.566, z: 0.033, yaw: -0.437, s: SAT_K * 0.7 },
    { x: 3.164, y: 1.209, z: -0.016, yaw: -0.434, s: SAT_K * 0.7 },
  ],
  narrow: [
    { x: 1.723, y: 0.974, z: 0.294, yaw: -0.252, s: 1 },
    { x: 1.149, y: 0.179, z: 0.134, yaw: -0.161, s: SAT_K * 0.8 },
    { x: 1.151, y: -0.434, z: 0.18, yaw: -0.162, s: SAT_K * 0.8 },
    { x: 2.43, y: -0.434, z: 0.135, yaw: -0.346, s: SAT_K * 0.8 },
    { x: 2.428, y: 0.179, z: 0.089, yaw: -0.343, s: SAT_K * 0.8 },
  ],
}

/* 槽位 k = -2..+2 各坐哪个席位：k=+2 右上、+1 右下、0 中央、-1 左下、-2 左上。
   相位推进时 k 递减，所以牌是从右上入场、经右下进中央，再往左下、左上退场；
   跨过 ±2.5 时回绕，那一格透明度为 0 */
const SLOT_SEAT = [1, 2, 0, 3, 4]

/* 板 i 停稳时（phase=0，k=i，i>2 时回绕）落在哪个席位 —— 那块板就挂那个席位的方案。
   轮播前席位号即方案号（0 中央 数字经济 / 1 左上 金融科技 / 2 左下 应用统计 /
   3 右下 商务数据分析 / 4 右上 工商科一体化），所以停稳时的seat→方案与原来一致 */
const SEAT_OF = [0, 1, 2, 3, 4].map((i) => SLOT_SEAT[(i + 2) % N])

const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/** 槽位 k（-2..2，允许小数）→ 这一格的位姿。
    在两个相邻席位之间线性插值，k 的进度就是换位进度 —— 段与段共用端点，
    所以整段运动是连续的；缓入缓出由外面的 smoothstep 统一给，不在这里叠 */
function poseAt(k, seats) {
  const a = Math.min(Math.max(k, -2.5), 2.5)
  const u = a + 2
  const i0 = Math.floor(u)
  const t = u - i0
  const A = seats[SLOT_SEAT[((i0 % N) + N) % N]]
  const B = seats[SLOT_SEAT[(((i0 + 1) % N) + N) % N]]
  const x = A.x + (B.x - A.x) * t
  const y = A.y + (B.y - A.y) * t
  const z = A.z + (B.z - A.z) * t
  const yaw = A.yaw + (B.yaw - A.yaw) * t
  const scale = A.s + (B.s - A.s) * t
  const sight = Math.hypot(CAM[0] - (RIG_X + x), CAM[2] - z)
  const pitch = -Math.atan2(CAM[1] - (CENTER + y), sight) * PITCH_GAIN
  /* 亮度：中央满亮、近槽 0.70、远槽 0.40；到 2.45 槽外完全退场，
     环形回绕就发生在透明度为 0 的那一格，看不见接缝 */
  const fade = 1 - smooth01((Math.abs(k) - 2.0) / 0.45)
  const opacity = Math.max(0, 1 - 0.3 * Math.abs(a)) * fade
  return { x, y, z, scale, yaw, pitch, opacity }
}

/* 席位 → 板：停稳时坐这个席位的是第几块板 */
const BOARD_AT = []
SEAT_OF.forEach((seat, board) => {
  BOARD_AT[seat] = board
})

/* ―― 四条数据弧：连的是「停稳时相邻」的那几块板 ――
   换位时端点按牌的实时位姿重算，线跟着牌走，不再钉在槽位上；
   on 决定这条弧归哪条指令管，沿用原来的「按指令点亮不同链路」读法 */
const EDGES = [
  { a: 0, b: 1, on: ['class', 'insight'] },
  { a: 1, b: 2, on: ['class', 'prep', 'hub'] },
  { a: 2, b: 3, on: ['class', 'prep', 'insight'] },
  { a: 3, b: 4, on: ['class', 'insight', 'hub'] },
]

/** 牌某条边上的接点（rig 局部）：半宽半高 + 沿边位置，再绕 Y 转牌自己的 yaw，
    最后往外挪 2cm —— 线不埋在牌里。牌移动时用同一份位姿重算，端点不脱节 */
function anchorInto(v, p, side, along = 0) {
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
  return v.set(p.x + ax * c + 0.02 * n, p.y + ay, p.z - ax * n + 0.02 * c)
}

/** 一档席位 → 静态量：五个槽位、每条链路的端点与颜色（停稳时的兜底值） */
function buildLayout(seats) {
  const poses = [-2, -1, 0, 1, 2].map((k) => poseAt(k, seats))
  const restPose = (board) => poses[(board > 2 ? board - N : board) + 2]
  /* 席位不在一条水平线上，接边得看两块牌谁偏哪边：横向差大就左右接，纵向差大就上下接 */
  const sides = (pa, pb) => {
    const dx = pb.x - pa.x
    const dy = pb.y - pa.y
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? ['r', 'l'] : ['l', 'r']
    return dy > 0 ? ['b', 't'] : ['t', 'b']
  }
  const arcs = EDGES.map((e, i) => {
    const ba = BOARD_AT[e.a]
    const bb = BOARD_AT[e.b]
    const [sa, sb] = sides(restPose(ba), restPose(bb))
    const along = i % 2 ? -0.18 : 0.18
    return {
      a: ba,
      b: bb,
      sa,
      sb,
      along,
      /* 停稳时的兜底端点：首帧之前 / ends 还没写进来时用它建管面 */
      A: anchorInto(new THREE.Vector3(), restPose(ba), sa, along),
      B: anchorInto(new THREE.Vector3(), restPose(bb), sb, -along),
      bend: e.bend ?? 0.16,
      lift: e.lift ?? 0.06,
      tc: e.tc ?? 0.14,
      key: `${ba}>${bb}`,
      on: e.on,
      /* 弧的颜色跟着它接过去的那块牌（目的板上的方案色），停稳时线牌同色 */
      hue: HUES[bb],
    }
  })
  return { seats, poses, arcs }
}

const BASE = buildLayout(SEATS.base)
const NARROW = buildLayout(SEATS.narrow)
const WIDE = buildLayout(SEATS.wide)

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
  /* 这一帧五块牌各自的位姿：板矩阵与链路端点读的是同一份，线不会滞后一帧 */
  const poseLive = useRef(Array(N))
  /* 四条弧的端点 + 高亮量：由这块 useFrame 写，FlowArc 只负责搬顶点 */
  const arcEnds = useRef(EDGES.map(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), boost: 0 })))
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
    /* 换位进度（0 停稳、1 中段）：链路跟着牌走，同时在换位中段抬亮 */
    const glow = still ? 0 : Math.sin(Math.PI * e)

    /* 中央牌：换到下一格的中点再翻，扫描带与 FOCUS 只在中央那一块出现 */
    const now = ((Math.round(ph) % N) + N) % N
    if (now !== focusRef.current) {
      focusRef.current = now
      setFocus(now)
    }

    for (let i = 0; i < N; i++) {
      /* i - ph 落在 [-2.5, 2.5)：环形窗口的回绕点在透明度 0 的角落，
         所以看不见的那一侧可以任意接缝 */
      let k = i - ph
      k = ((((k + WRAP) % N) + N) % N) - WRAP
      const p = poseAt(k, L.seats)
      poseLive.current[i] = p
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

    /* ―― 链路端点：直接拿上一轮算好的五块牌位姿，不另起一套运动学 ――
       端点跟着牌走，牌在换位中段最亮，线色同时冲高一档；两端任一块退场时
       整条弧一起变淡，回绕的那一格看不见接缝。
       这段和上面写板矩阵在同一个 useFrame 里，且本回调排在 FlowArc 之前
       （priority -1），所以渲染时线牌同帧，没有一帧的滞后 */
    for (let i = 0; i < L.arcs.length; i++) {
      const c = L.arcs[i]
      const pa = poseLive.current[c.a]
      const pb = poseLive.current[c.b]
      const ends = arcEnds.current[i]
      anchorInto(ends.a, pa, c.sa, c.along)
      anchorInto(ends.b, pb, c.sb, -c.along)
      ends.boost = glow
      /* 只在有端点回绕（该牌整块退场）时才压暗整条弧；平时保持常亮，
         否则侧牌 0.4 的常态亮度会把线一起拖灰，换位里的高亮就看不出来 */
      const alive = Math.min(pa.opacity, pb.opacity) > 0.03 ? 1 : 0
      flow.current[i] = damp(flow.current[i], EDGES[i].on.includes(modeId) ? live * alive : 0, 4.5, dt)
    }
  }, -1)

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
          端点每帧由上面的 useFrame 按牌的实际位姿写入 ends，换位时线跟着牌走；
          中段线色抬到高亮，停稳回落。a / b 只是首帧之前用来建管面的兜底端点 */}
      {L.arcs.map((c, i) => (
        <FlowArc
          key={c.key}
          a={c.A}
          b={c.B}
          ends={arcEnds.current[i]}
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

      {/* ―― 五块方案展板：真 DOM，按槽位透视摆在弧线上 ――
          index 传的是「这块板停稳时所在席位」的方案号，五块内容各不相同；
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
              <AgentPanel index={SEAT_OF[i]} beat={beat} live={i === focus} still={still} yaw={s0.yaw} pitch={s0.pitch} />
            </Html>
          </group>
        )
      })}
    </group>
  )
}
