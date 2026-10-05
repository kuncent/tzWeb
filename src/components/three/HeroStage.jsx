import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, DepthOfField, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { heroScenes } from '../../data/heroScenes'
import { useCanvasVisibility } from '../../hooks/useCanvasVisibility'
import { Floor, FloorBrand, damp } from './hero/kit'
import { buildClock, getDevice, markHeroReady, selectDevice, subDevice } from './hero/buildBus'
import LabEnvironment from './hero/LabEnvironment'
import EmbodiedRig from './hero/EmbodiedRig'
import ChainRig from './hero/ChainRig'
import NeuralRig from './hero/NeuralRig'

/* ============================================================
 * 首屏舞台：一个 Canvas、一台相机、三套布景 + 一层实验室环境
 * ------------------------------------------------------------
 * 三屏不是三个画布 —— 三个 WebGL 上下文在笔记本上会把显存和功耗一起
 * 点着。切屏时相机沿机位飞过去，布景靠 useAppear 整厅下沉 / 升起交接（见 kit.jsx）。
 *
 * 这一版把「卡」当一等公民处理。实测基线（Intel HD 630 / 1440×900）：
 * 上一版固定 dpr 上限 1.7 + 常开 DoF/SMAA，只有 6~9 fps。
 * 所以画质不再按 CPU 核数猜（核多不等于显存好），改成运行时自适应：
 * 量真实帧间隔，超预算就降档，只降不升 —— 升档会让 composer 反复重建，
 * 观感是"画质在呼吸"，比一直卡着更糟。
 * ============================================================ */

/* tier 2 = 全开；1 = 关 DoF、降 SMAA 采样；0 = 只留 Bloom + ToneMapping。
   cap = 每秒最多推几帧。这一项比前两项目加起来还管用：拆屏实测（真机 prod 包）
   只留 3D 是 14fps、只留 DOM 是 20fps —— 不是某一个东西贵，是两半加起来超了。
   与其让它在 13fps 上抽接，不如限帧到 24fps 跑稳：限帧同时砍掉一半 GPU 和一半 JS。

   bloom 的 intensity/radius 在这一版一起往下拧：radius 是泛光能摊开多远。
   真机截图上那层“整屏青绿雾 / 紫雾”不是地板 shader 画的，是 mipmapBlur 把
   几十像素的 LED 糊到几百像素 —— 收 radius 比收透明度管用。

   dpr 与 bloomLevels 是消融量出来后定的（Intel HD 630 / 1440×900 / scene0 / 钉 tier0 + 拆限帧）：
     基准 56.7ms/帧；关后处理 39.5（后处理 17ms）；关实验室 44.8（12ms）；
     关地台 51.2（5.5ms）；关全部布景 51.1（5.6ms）；dpr 0.5 → 31.3（省 25.4ms）。
   两张表合起来只说明一件事：贵的不是 draw call 也不是三角形（12 万个只值 5.6ms），
   是像素。所以降 dpr 是同时给后处理、地台、实验室、布景打折的那一个旋钮。
   canvas 背板变软不会动 DOM —— 标题与看板文字依旧按设备像素渲染，
   而 3D 本来就是一片辉光，0.8 看不出来。bloomLevels 8→5 是同理：
   mipmap 链少三级，而泛光本身就是糊的，没人能看出它是半分辨率。 */
/* sparkles 三档全部钉死为 false：drei 的 Sparkles 是一堆随机漂移、随机闪烁的小方块，
   与场景里的几何没有任何关系 —— 它不是“数据”，就是噪点。而“杂乱无章”说的
   就是画面里同时有十几个东西在各自闪。要“活着”的感觉交给链的脉冲与智能体节拍。 */
/* particles 这一档随 AI 屏的粒子云一起拆掉了：那 700~2000 个 additive 点在屏幕上
   是一团白噪（四种拓扑一个也读不出来），画质档再去为它分预算已经没有意义 */
const TIERS = [
  { dpr: 0.8, cap: 24, dof: false, smaa: false, bloom: 0.2, bloomRadius: 0.2, bloomLevels: 5, sparkles: false },
  { dpr: 1.0, cap: 30, dof: false, smaa: true, bloom: 0.28, bloomRadius: 0.24, bloomLevels: 6, sparkles: false },
  { dpr: 1.35, cap: 60, dof: true, smaa: true, bloom: 0.32, bloomRadius: 0.26, bloomLevels: 7, sparkles: false },
]
/* cap 会被 FrameDriver 往下取整到 vsync 步数（step = floor(1000/cap/16.67)），
   所以 60Hz 屏上只有 20 / 30 / 60 三档可达：cap=24 与 cap=30 完全等价（都是 step 2）。
   写 24 不是笔误，是预算语义 —— budgetOf 跟着它走。而实测帧时只能落在
   16.7 / 33.4 / 50.1 三个格子上，预算线必须落在两个格子之间才有意义：
   tier2 拿 tier1 的 cap 算出 45ms（在 33.4 与 50.1 之间）—— 跑不住 30fps 就降档；
   tier1 拿 tier0 的 24 算出 56ms（在 50.1 与 66.8 之间）—— 要跌破 18fps 才降到底。
   量化在这里是帮忙的，不是捣乱的。 */
/* 预算拿下一档的 cap 算（见 onWindow）：拿当前档算的话，限到 24fps 再以 26ms 当线，
   量化后的真实帧时 33.4ms 永远超线，会一路降到底 */
const budgetOf = (cap) => (1000 / cap) * 1.35
const WINDOW_MS = 1100

/* 体检用的命令行开关：?tier=0 钉住画质不再自适应，?dpr=0.5 单独改像素比。
   拆「卡」的成因只能靠改一个变量看帧率怎么动：
   dpr 一降就飞起来 = fill-rate 问题，不降 = JS / draw call 问题。
   ?fx=0&lab=0&floor=0&rigs=embodied 是给 tmp/hero-ablate.mjs 逐层消融用的 ——
   只在 DEV 生效，生产包不会因为这些字符串少画一层。 */
const QUERY = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search)
const DEV = import.meta.env.DEV
/* 读数开关。与下面那些消融参数不同，?dbg=1 在生产包里也有效：
   它只多一份逐帧统计，不会改变画什么 —— 而消融开关会把代码路径改掉，
   开在生产上量出来的就不是用户看到的那个画面了 */
const DBG = DEV || (typeof window !== 'undefined' && /[?&]dbg=1(?:&|$)/.test(window.location.search))
const Q_TIER = DEV && QUERY && QUERY.has('tier') ? Math.max(0, Math.min(TIERS.length - 1, Number(QUERY.get('tier')))) : null
const Q_DPR = DEV && QUERY && QUERY.has('dpr') ? Number(QUERY.get('dpr')) : null
/* ?cap=1000 拆限帧：消融实验要量一层的裸成本，限在 24fps 会把改进全部掩盖掉 */
const Q_CAP = DEV && QUERY && QUERY.has('cap') ? Number(QUERY.get('cap')) : null
const AB = DEV && QUERY
  ? {
      fx: QUERY.get('fx') !== '0',
      lab: QUERY.get('lab') !== '0',
      floor: QUERY.get('floor') !== '0',
      rigs: (QUERY.get('rigs') || 'embodied,chain,neural').split(','),
    }
  : null
const showRig = (name) => !AB || AB.rigs.includes(name)

/* 起始画质档：探测一次、结果模块级缓存。
   绝不能在每次调用里都 getContext —— HeroStage 在 React 18 并发渲染下，
   commit 前会被反复 render（子树挂起 → 丢弃 → 重试），而 useState 的惰性初始化器
   会在每次 render 尝试里重跑。若这里每次都建一个 WebGL 上下文，就会被并发重放
   几十次，瞬间打满浏览器上下文硬上限 → 最旧的首屏画布被丢弃（黑屏）。
   缓存后无论重放多少次，全局只建一个探测上下文，且用完即弃。 */
let _startTier
function guessStartTier() {
  if (_startTier !== undefined) return _startTier
  if (typeof navigator === 'undefined') return (_startTier = 2)
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info')
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    /* 用完即弃：这个探测上下文不释放就会常驻占一个名额，而 WebGL 上下文总数
       有硬上限，攒够就把最旧的首屏画布顶掉（黑屏诱因） */
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    /* 软件光栅（无 GPU 的虚拟机 / 远程桌面）直接最低档 */
    if (/swiftshader|llvmpipe|software|basic render/i.test(r)) return (_startTier = 0)
    if (/intel.*(hd|uhd) (graphics )?[3-6]\d{2}/i.test(r)) return (_startTier = 1)
  } catch {
    /* 探测失败就走默认高档，交给自适应降下来 */
  }
  return (_startTier = (navigator.hardwareConcurrency || 4) >= 8 ? 2 : 1)
}

/** 限帧驱动：把 Canvas 的 frameloop 切成 demand 之后，逐帧就得自己推。
    一个 rAF + 一次 invalidate，没别的开销；降档时 cap 变了会重建循环。

    跳帧只能按 vsync 的整数倍跳，而且要往下取整 —— 这一点量出来之前踩过：
    旧写法是 if (now - last < min - 1) return，min = 1000/24 = 41.7ms。
    60Hz 面板上只有 16.7 / 33.4 / 50.1ms 三档，41.7 这个目标会被追到上一档 50.1，
    于是“限到 24fps”实际是 20fps —— 而拆掉限帧后 GPU 自己能跑 25.8fps（实测
    tmp/hero-ablate.mjs：38.7ms/帧）。限帧器把首屏锁在了比它自己上限更低的帧率上。
    改成 floor 到 vsync 步数：宁可多画一帧，也不少画一帧。 */
function FrameDriver({ cap }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let raf = 0
    let last = 0
    const VSYNC = 1000 / 60
    const step = Math.max(1, Math.floor(1000 / cap / VSYNC))
    const min = step * VSYNC - 2
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (now - last < min) return
      last = now
      invalidate()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [cap, invalidate])
  return null
}

/** 帧率计：把每帧间隔攒成窗口，向父级汇报中位数。只做加法与比较，不碰 DOM */
function FrameGauge({ onWindow }) {
  const acc = useRef({ n: 0, sum: 0, worst: 0, t0: 0 })
  const cb = useRef(onWindow)
  cb.current = onWindow
  useFrame((state, delta) => {
    const a = acc.current
    const now = state.clock.elapsedTime
    if (!a.t0) a.t0 = now
    a.n += 1
    a.sum += delta
    if (delta > a.worst) a.worst = delta
    const span = now - a.t0
    if (span >= WINDOW_MS / 1000 && a.n >= 3) {
      cb.current?.((a.sum / a.n) * 1000, a.n, span)
      acc.current = { n: 0, sum: 0, worst: 0, t0: now }
    }
  })
  return null
}

const _look = new THREE.Vector3()
const _want = new THREE.Vector3()
const _off = new THREE.Vector3()
const _sph = new THREE.Spherical()

/* 装配分镜机位：上一版七键 Catmull-Rom 长轨道 —— 六道工序每道切一个取景，
   用户反馈“机位太多太复杂”：镜头一直在飞，反而没有一个画面看得清。
   收敛成三键：俯瞰建立 → 中景缓推（装配全程）→ 交全景业务机位；
   戏交给设备进场演，镜头只慢慢收近。特写一律由“点击设备聚焦”触发。
   轨道时长跟着 EmbodiedRig 的 BUILD 一起从 6.5s 压到 4.4s（用户：还是太长），
   中键 1.9 = 全程的 43%，与旧版 2.8/6.5 同一个位置 —— 缩的是等，不是快进。
   分镜的自变量是 buildClock.t 而不是墙钟，所以 skipBuild() 抬快进时
   镜头也跟着快：不另外加一套“跳过动画”，只要时钟跑快一点，整条链自己到位 */
const BUILD_CAMS = [
  { t: 0.0, pos: [-3.6, 2.5, 7.6], look: [0.2, 0.7, -1.6] },
  { t: 1.9, pos: [-1.2, 1.9, 6.0], look: [0.3, 0.8, -1.5] },
  /* 末键 = 运行态全景机位：曲线走到头就是交接点，阻尼接手时没有跳变 */
  { t: 4.4, pos: [0.3, 1.42, 5.6], look: [0.42, 0.95, -1.2] },
]
/* 末键之后留 1.0s 尾巴：工序 06 的人形升起（3.3 + 1.15）与 live 沉降
   （4.4 + 0.7 = 5.1）都在这段里落定，轨道交接时画面已经静止 */
const BUILD_END = 5.4
/* 关键帧逐对线性插值会在每个关键帧上出折角（速度不连续，观感是“一顿一顿”）。
   两条 Catmull-Rom 曲线按 u 采样：跨段速度连续，才是“滑”而不是“跳” */
const BUILD_POS_CURVE = new THREE.CatmullRomCurve3(BUILD_CAMS.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal', 0.5)
const BUILD_LOOK_CURVE = new THREE.CatmullRomCurve3(BUILD_CAMS.map((k) => new THREE.Vector3(...k.look)), false, 'centripetal', 0.5)
const BUILD_FOV = [46, 42, 40]

/* ―― 每机型一个出厂特写机位：点击设备 → 镜头飞过来锁定（聚焦动画）――
   与设备档案表同文件维护：pos 略高于设备、look 钉在设备几何中心。
   look 取中心而不是取上半身：中心投影落在屏正 50%，而 DOM 文案占左 42%、
   看板占右 29% —— 只要不居中，特写就会被自己家的面板挡住。
   fov 按「整机要在框里」反算：可见高 = 2·d·tan(fov/2) 要盖住机高 + 上下各留 10%。
   （上一版 human 机位 d=2.0 / fov 36 → 框内只有 1.29 m，1.58 m 的人被切头切脚）
   矮个机器（狗）的机位得蹲下去：站在 1.4m 俯看就是一块黑饼
   wide = 解锁后的全景落点（与 s.cam 同值，交接无跳变） */
const DEV_CAMS = {
  wide: { pos: [0.3, 1.42, 5.6], look: [0.42, 0.95, -1.2], fov: 40 },
  /* 主臂从 1.2 挪到 0.55（不让夹爪被宇树吃掉），机位跟着换：旧那个
     (1.35,·,-1.4) 现在正好从人形（现 H2）身上穿过去 —— 改从左前上方取，
     而且不往岛后过道（z≈-2）那一档停：那是 AGV 的巡回带，
     机位往那一站，车驶过就是 0.4m 处糊满整幅的黑块 */
  arm: { pos: [-0.45, 1.6, -1.15], look: [0.55, 1.05, -3.02], fov: 34 },
  /* 三台换位：人形特写保持“正前偏左 2.6m 平视”的旧相对关系，
     整体平移到新站位（机位 z=2.4 停在岛前那条带之后，不穿任何机器）*/
  human: { pos: [1.85, 1.15, 2.4], look: [1.5, 0.8, -0.2], fov: 40 },
  /* H2（替 G1）特写机位取左前而不是右前：右前那条路要穿过岛前停位湾；
     狗在左中背景（狗在 z=0.3、在 H2 前面，但只 0.46m 高，不拦机身）。
     底盘删掉后湾里空了，这条路径更干净。
     人形抬到 1.45m 后重算的两个量：look.y 0.68 → 0.75（几何中心 = 岛面
     0.03 + 身高一半），z 3.0 → 3.15 + fov 36 → 38 —— d=2.65 上可见高
     1.82m，盖住 1.45m 机身再上下各留 ~12%（旧那档只框 1.67m，会把头切掉）*/
  h2: { pos: [0.25, 1.3, 3.15], look: [0.7, 0.75, 0.55], fov: 38 },
  /* 狗往前站到了 z=0.3，机位跟着搬到它的右前低机位。
     机头在局部 +x（官方 go2-official，定方法见 LabResidents）、rotationY
     0.28π - π/2 → 头朝世界 (+0.77, 0, +0.64)，与这条视线（从狗算出 (+0.26,0,+0.97)）
     夹 35° —— 四分之三侧脸，而不是一个正脸或一个背影。
     fov 22 / d=1.72 → 框内 0.67m，0.46m 的机子占 69% 框高：
     再广就变成“看地板中间一个灰点”，再窄就没有身体只有头 */
  go2: { pos: [0.42, 0.88, 1.85], look: [0, 0.28, 0.3], fov: 22 },
  /* tb（TurtleBot3 底盘）的特写机位随模型一起删（用户：去掉底盘模型）*/
}
/* 链屏的看板不配特写机位：那六块牌本来就是画面里最大的东西，镜头一推，
   它们就往左右两块 DOM 面板底下钻（取景带是按 wide 机位反投影量出来的，
   见 ChainRig 的 PLACE/STAGE）。让牌自己飞、自己长大，比动镜头干净，
   而且不动镜头还保住了运行态漂移 —— 钉死朝向的阵列靠漂移视差才读得出 3D */
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

function CameraRig({ idx, cmd }) {
  const { camera, gl } = useThree()
  const look = useRef(new THREE.Vector3(...heroScenes[0].cam.look))
  const punch = useRef(0)
  /* 入场推轨与运行态漂移的门控：切屏记一个起始时刻，拖拽时漂移让位给用户 */
  const idxRef = useRef(-1)
  const enterRef = useRef(0)
  const driftGate = useRef(1)
  /* 拖拽 orbit：目标角 + 阻尼角两个 ref，惯性就是两者之间的阻尼差 */
  const yawT = useRef(0)
  const pitchT = useRef(0)
  const yaw = useRef(0)
  const pitch = useRef(0)
  const drag = useRef(null)
  const orbitOn = useRef(false)
  /* 看板点一下：镜头轻轻推近一点，让"我按了，画面真的应答了" */
  useEffect(() => {
    if (cmd.n) punch.current = 1
  }, [cmd.n])
  /* ―― 设备聚焦：点击设备 → 镜头飞向该机型的出厂特写机位并锁定 ――
     逐帧读总线而不是订阅成 state：机位每帧都要读，而选中一年改不了几次 */
  const devRef = useRef('wide')
  useEffect(() => subDevice((id) => { devRef.current = id }), [])
  const prevDev = useRef('wide')

  /* 拖拽只改目标角，不改相机：相机逐帧阻尼过去，松手还有余势。
     限幅是硬的（yaw ±0.55 / pitch -0.2~0.26）—— 首屏背后是钉屏布局，
     转到背面去就是穿帮；双击回正 */
  useEffect(() => {
    /* 拖拽挂在 canvas 的父层而不是 canvas 上：链屏那六块看板是真 DOM
       （drei <Html>，见 ChainPanels），它是 canvas 的兄弟、两者的共同父层
       才是它们的公共上游 —— 监听装在 canvas 上时，起手压在牌上的那一次拖拽
       根本走不到 orbit，画面里最大最亮的那块东西反而成了转不动的死角 */
    const el = gl.domElement.parentElement || gl.domElement
    const down = (e) => {
      if (!orbitOn.current || e.button !== 0) return
      drag.current = { x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY, cap: false }
    }
    const move = (e) => {
      if (!drag.current) return
      /* 指针捕获要等真的动了才上。setPointerCapture 会把后续 pointer 事件改派到
         本层，click 于是落在公共祖先而不是牌面上 —— 起手那一下还没动就把指针抢走，
         链屏那六块 DOM 看板的 onClick 永远收不到回执（实测：点牌后六块纹丝不动）。
         走过 5px 才捕获：那以后才是“我在转镜头”，也不再需要 click */
      if (!drag.current.cap) {
        if (Math.hypot(e.clientX - drag.current.ox, e.clientY - drag.current.oy) < 5) return
        drag.current.cap = true
        el.setPointerCapture?.(e.pointerId)
        el.style.cursor = 'grabbing'
      }
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      drag.current = { ...drag.current, x: e.clientX, y: e.clientY }
      yawT.current = clamp(yawT.current - dx * 0.0042, -0.55, 0.55)
      pitchT.current = clamp(pitchT.current + dy * 0.0028, -0.2, 0.26)
    }
    const up = (e) => {
      if (!drag.current) return
      if (drag.current.cap) el.releasePointerCapture?.(e.pointerId)
      drag.current = null
      el.style.cursor = orbitOn.current ? 'grab' : ''
    }
    const dbl = () => {
      yawT.current = 0
      pitchT.current = 0
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('dblclick', dbl)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('dblclick', dbl)
    }
  }, [gl])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const s = heroScenes[idx]
    const t = state.clock.elapsedTime
    punch.current = damp(punch.current, 0, 3.4, dt)
    /* 入场推轨：切屏后 2.4s 内机位从 12% 远处收进来 ——
       切屏该是“一次镜头运动”，不是两张静帧互溶 */
    if (idxRef.current !== idx) {
      idxRef.current = idx
      enterRef.current = t
    }
    const age = Math.min((t - enterRef.current) / 2.4, 1)
    const enterK = 1.12 - 0.12 * (1 - Math.pow(1 - age, 3))
    _look.set(...s.cam.look)
    /* 推近是沿视线收，不是把坐标往原点缩 —— 后者会把机位歪到一边。
       cam.pos 是数组，只能 set(...) 不能 copy(...)（copy 会读不到 x/y/z 变成 NaN） */
    _want.set(...s.cam.pos).sub(_look).multiplyScalar(enterK * (1 - punch.current * 0.055)).add(_look)
    let fovT = s.cam.fov || 42

    /* ―― 装配分镜：bt < BUILD_END 时相机走曲线轨道，不走业务机位 ―― */
    const bt = buildClock.active && idx === 0 ? buildClock.t : Infinity
    const cine = bt < BUILD_END
    /* 聚焦态：只有具身屏的设备走特写机位（链屏的看板选中不动相机，
       见上面那段注释），装配分镜走完之后才接管机位 */
    const dev = idx === 0 && !cine ? devRef.current : 'wide'
    const focus = dev !== 'wide'
    /* 切换聚焦对象的那一瞬借一次推近脉冲：飞行落点有一口“呼吸”，
       纯阻尼到位读作“平移”，脉冲才读作“锁定” */
    const trans = dev !== prevDev.current
    if (trans) {
      prevDev.current = dev
      punch.current = 1
    }
    if (cine) {
      const keys = BUILD_CAMS
      let i = keys.length - 1
      while (i > 0 && bt < keys[i].t) i--
      const a = keys[i]
      const b = i + 1 < keys.length ? keys[i + 1] : { t: BUILD_END }
      const f = smooth((bt - a.t) / Math.max(0.001, b.t - a.t))
      const u = Math.min((i + f) / (keys.length - 1), 1)
      BUILD_POS_CURVE.getPoint(u, _want)
      BUILD_LOOK_CURVE.getPoint(u, _look)
      const j = Math.min(i + 1, BUILD_FOV.length - 1)
      fovT = BUILD_FOV[i] + (BUILD_FOV[j] - BUILD_FOV[i]) * f
    } else if (focus) {
      /* 特写机位直接接管：不走入场推轨也不走业务机位，漂移在下方门控里关掉 */
      const c = DEV_CAMS[dev]
      _want.set(...c.pos)
      _look.set(...c.look)
      fovT = c.fov
    } else {
      /* 运行态电影漂移：慢摆 + 微 boom + FOV 呼吸。
         静置机位等拖拽读作“暂停的视频”；漂移是分镜语言在运行态的延续。
         拖拽时门控归零：镜头的所有权交给用户；聚焦锁定时也归零：
         特写里镜头自己晃，设备档案的读数条都对不准 */
      driftGate.current = damp(driftGate.current, drag.current || focus ? 0 : 1, 2, dt)
      const gk = driftGate.current
      _off.copy(_want).sub(_look)
      _sph.setFromVector3(_off)
      _sph.theta += Math.sin(t * 0.24) * 0.05 * gk
      _sph.phi = clamp(_sph.phi - Math.sin(t * 0.17 + 1.3) * 0.02 * gk, 0.9, 1.62)
      _want.copy(_look).add(_off.setFromSpherical(_sph))
      fovT += Math.sin(t * 0.21) * 1.1 * gk
    }
    /* 分镜期间指针视差只留三成：相机自己在走，再叠视差就像手持抖；聚焦锁定同理 */
    const par = cine || focus ? 0.3 : 1
    _want.x += state.pointer.x * 0.14 * par
    _want.y += state.pointer.y * 0.09 * par

    /* ―― 运行态拖拽 orbit：绕 look 点球坐标偏转。三屏都开：
       “能 3D 变换视角”不是具身屏的特产，链与 AI 的房间同样可以绕着看 ―― */
    orbitOn.current = idx === 0 ? buildClock.active && bt >= BUILD_END : true
    const el = gl.domElement.parentElement || gl.domElement
    if (!drag.current && el.style.cursor !== (orbitOn.current ? 'grab' : '')) el.style.cursor = orbitOn.current ? 'grab' : ''
    yaw.current = damp(yaw.current, yawT.current, 5, dt)
    pitch.current = damp(pitch.current, pitchT.current, 5, dt)
    if (Math.abs(yaw.current) > 1e-4 || Math.abs(pitch.current) > 1e-4) {
      _off.copy(_want).sub(_look)
      _sph.setFromVector3(_off)
      _sph.theta += yaw.current
      _sph.phi = clamp(_sph.phi - pitch.current, 0.9, 1.62)
      _off.setFromSpherical(_sph)
      _want.copy(_look).add(_off)
    }

    /* 飞行速度：聚焦切换要“拍住”（快而带脉冲），普通切屏仍是慢阻尼 */
    const flyK = trans ? 3.4 : focus ? 2.4 : 1.7
    camera.position.set(
      damp(camera.position.x, _want.x, cine ? 2.6 : flyK, dt),
      damp(camera.position.y, _want.y, cine ? 2.6 : flyK, dt),
      damp(camera.position.z, _want.z, cine ? 2.6 : flyK, dt),
    )
    look.current.lerp(_look, 1 - Math.exp(-(focus ? 3 : 2) * dt))
    camera.lookAt(look.current)
    /* FOV：分镜期间跟关键帧走（曲线本身已平滑），运行态阻尼过去 */
    if (Math.abs(camera.fov - fovT) > 1e-3) {
      camera.fov = cine ? fovT : damp(camera.fov, fovT, 2.5, dt)
      camera.updateProjectionMatrix()
    }
  })
  return null
}

/* ―― 舞台「在画」的凭据：启动遮罩在这儿收口 ――
   界放在哪儿有讲究：不是 Canvas 建好（onCreated 那时着色器一行还没编，
   实测那是入口之后最长的一次长任务，~1.2s），也不是模型到位（GLB 还要一跳
   网络，等于让用户等一个他看不见的下载）。放在「画出第三帧且帧距回到正常」：
   useFrame 跑在本帧 render 之前 —— 第一帧的 render 把编译那笔最贵的账付掉，
   所以它的 delta 就是那次卡顿；第三帧还连着卡，说明画面是冻住的空场，
   不该在此刻收遮罩。0.25 是 4fps 地板：真跑不到这个帧率的机器，等下去也不会
   变好，交给 main.jsx 那个兜底定时器 */
function StageReady({ onPainted }) {
  const n = useRef(0)
  const done = useRef(false)
  /* 首帧就绪回调走 ref：onPainted 是父级内联箭头，useFrame 只挂一次不能跟着换 */
  const cb = useRef(onPainted)
  cb.current = onPainted
  useFrame((state, delta) => {
    if (done.current) return
    n.current += 1
    /* 帧数写到窗上：tmp/boot-verify.mjs 拿它断“遮罩确实在画面活了之后才收”，
       而不是断一个时刻 —— 后者会把“收得早”与“收得晚但刚好那个数”混为一谈 */
    if (typeof window !== 'undefined') window.__heroFrames = n.current
    if (n.current >= 3 && delta < 0.25) {
      done.current = true
      markHeroReady('stage')
      /* 通知父层“画布真的在画了”：CSS 动底要等这一刻之后才拆，
         不能拿一个盲定时器去赌帧会不会来 */
      cb.current?.()
    }
  })
  return null
}

/** WebGL 上下文丢失守卫。
    上下文丢失不是 JS 异常 —— 走不到 StoryHero 的 StageGuard 错误边界，
    浏览器默认行为是把画布刷成全黑且不会自动恢复；而此刻那层 CSS 动底
    （Scrim）已在挂载 1.7s 后被卸载（见 StoryHero 的 scrimGone），于是用户
    看到一片纯黑的 #04070d 且永远回不来 —— 这正是「首屏黑屏」的成因。
    preventDefault 是「请求浏览器重建上下文」的开关（不调它就不会触发 restored），
    丢失期间把 CSS 动底换回来盖住黑屏（onLost），重建成功后主动推一帧重绘（onRestored，
    帧循环是 demand，不 invalidate 就停在那儿不画）。 */
function ContextGuard({ onLost, onRestored }) {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  /* 回调存 ref：StoryHero 传的是内联箭头，若不隔一层会把订阅绑到每次渲染上 */
  const lostCb = useRef(onLost)
  const restCb = useRef(onRestored)
  lostCb.current = onLost
  restCb.current = onRestored
  useEffect(() => {
    const el = gl.domElement
    const lost = (e) => {
      e.preventDefault()
      lostCb.current?.()
    }
    const restored = () => {
      restCb.current?.()
      invalidate()
    }
    el.addEventListener('webglcontextlost', lost, false)
    el.addEventListener('webglcontextrestored', restored, false)
    return () => {
      el.removeEventListener('webglcontextlost', lost)
      el.removeEventListener('webglcontextrestored', restored)
    }
  }, [gl, invalidate])
  return null
}

/** 主光跟着业务主题色走：切到区块链屏，整台戏的调子就换成青绿 */
function KeyLight({ accent }) {
  const ref = useRef(null)
  const target = useMemo(() => new THREE.Color(accent), [accent])
  useFrame((state, delta) => {
    if (ref.current) ref.current.color.lerp(target, 1 - Math.exp(-2.2 * Math.min(delta, 0.05)))
  })
  return <pointLight ref={ref} position={[2.4, 3.2, 3.4]} intensity={16} distance={16} decay={1.8} color={accent} />
}

function Scene({ idx, cmd, tier }) {
  const accent = heroScenes[idx].accent
  const q = TIERS[tier]
  return (
    <>
      <color attach="background" args={['#04070d']} />
      {/* fog 近界从 9 收到 8：实验室那一层比主体远 3~6 米，让它真退到后面去。
          上一版三屏都“平”：主体与环境一样清楚，没有空气，也就没有纵深 */}
      <fog attach="fog" args={['#04070d', 8, 21]} />

      {/* 环境光与天光各降一档、主光升一档：质感是对比度，不是亮度。
          上一版 ambient 0.34 + hemi 0.42 把暗部抬到一个中等值，
          再叠上 bloom 就是“整幅蒙了一层雾”，金属与白壳都读不出面 */}
      <ambientLight intensity={0.22} color="#a8c4e6" />
      <hemisphereLight intensity={0.28} color="#4a6480" groundColor="#03050a" />
      <directionalLight position={[3.5, 6, 4]} intensity={1.65} color="#eaf2ff" />
      <directionalLight position={[-4.5, 2.6, -2]} intensity={0.42} color="#5FA8FF" />
      <KeyLight accent={accent} />

      {(AB ? AB.floor : true) && (
        <>
          <Floor accent={accent} />
          <FloorBrand variant={['embodied', 'chain', 'ai'][idx]} />
        </>
      )}
      {(AB ? AB.lab : true) && <LabEnvironment variant={['embodied', 'chain', 'ai'][idx]} lite={tier === 0} />}

      {showRig('embodied') && (
        <EmbodiedRig mounted active={idx === 0} cmd={idx === 0 ? cmd : { id: '', n: cmd.n }} accent={heroScenes[0].accent} sparkles={q.sparkles} />
      )}
      {showRig('chain') && (
        <ChainRig active={idx === 1} cmd={idx === 1 ? cmd : { id: '', n: cmd.n }} accent={heroScenes[1].accent} hi={tier >= 1} sparkles={q.sparkles} />
      )}
      {showRig('neural') && (
        <NeuralRig active={idx === 2} cmd={idx === 2 ? cmd : { id: '', n: cmd.n }} accent={heroScenes[2].accent} />
      )}

      {/* 环境贴图：机械臂与人形的白壳/金属靠它，没这张图 PBR 就是死灰 */}
      <Environment resolution={tier >= 2 ? 128 : 64} frames={1}>
        <Lightformer form="rect" intensity={1.5} color="#dfeaf8" position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={0.95} color={accent} position={[-5, 2, 1]} rotation-y={Math.PI / 2} scale={[5, 2.4, 1]} />
        <Lightformer form="rect" intensity={0.85} color="#cfe2ff" position={[5, 2.4, 0]} rotation-y={-Math.PI / 2} scale={[5, 2.6, 1]} />
        <Lightformer form="rect" intensity={0.95} color="#e8f2ff" position={[0, 2.4, -6]} scale={[10, 3, 1]} />
      </Environment>

      <CameraRig idx={idx} cmd={cmd} />

      {(AB ? AB.fx : true) && (
        <EffectComposer multisampling={0}>
          {/* 阈值再抬到 1.8：1.55 仍然吃得到环境层那些 ×1.3~×1.6 的发光件（乘上
              光照与白平衡后能到 1.6+），于是一整排天花灯带、机柜灯珠、工位屏都在泛光，
              mipmapBlur 把它们摊成一层幕 —— “没有质感”的第一成因。
              只让真正的 LED、内核、数据包过阈值：泛光要落在点上，不是落在面上。 */}
          <Bloom intensity={q.bloom} luminanceThreshold={1.8} luminanceSmoothing={0.1} mipmapBlur radius={q.bloomRadius} levels={q.bloomLevels} />
          {q.dof && <DepthOfField worldFocusDistance={4.6} worldFocusRange={6.2} bokehScale={0.7} resolutionScale={0.3} />}
          {/* AGX 必须在泛光之后、收尾效果之前：EffectComposer 会把渲染器的 toneMapping
              强制成 NoToneMapping，不显式挂这个效果，线性值 >1 就直接削成死白 ——
              真 Chrome 实测：白壳机械臂糊成一团、AI 内核炸成一个大白球。 */}
          <ToneMapping mode={ToneMappingMode.AGX} />
          <Vignette eskil={false} offset={0.3} darkness={0.92} />
          {tier >= 1 && <Noise opacity={0.022} />}
          {q.smaa && <SMAA />}
        </EffectComposer>
      )}
    </>
  )
}

export default function HeroStage({ idx, cmd, onContextLost, onContextRestored, onPainted }) {
  /* 屏外停帧：首屏滚走以后不该再吃 GPU */
  const { ref, visible } = useCanvasVisibility('-140px')
  const [tier, setTier] = useState(Q_TIER !== null && Number.isFinite(Q_TIER) ? Q_TIER : guessStartTier)
  const lock = useRef(Q_TIER !== null && Number.isFinite(Q_TIER) ? 2 : 0)
  const bad = useRef(0)
  const bootAt = useRef(typeof performance !== 'undefined' ? performance.now() : 0)

  /* 自适应降档：连续两个窗口超预算才动手（单窗抖动多是切屏那一瞬的编译尖峰），
     降完把 lock 拉高，之后即使很闲也不升 —— 见文件头的理由。

     片头期间只攒证据、不动手：出厂动画那 5.4s 里，帧时的组成有 GLB 落地、
     着色器首次编译、DOM 看板挂载 —— 都不是“这个机器跑不动这画面”的证据。
     而降档本身要重建 composer，dof/smaa 一开关就是整套后处理重编译（火焰图上
     (program) 自时间 879ms）：在片头里降档，等于在用户看第一段动画时把他卡一下
     —— 比不降还糟。降档推到片头结束之后，那时他要么已经在往下读、要么画面
     已经静止，那一跳他看不见。
     但计数不能停：弱机整个片头都在超预算，那正是该降的硬证据。所以片头里把
     阀门抬到 4 个连续窗口（单窗尖峰会把计数归零，能凑足 4 个就不是编译抖的），
     片头一结束立刻照办 —— 不因为“不在片中降”就把弱机多卡六秒。
     15s 是兜底：极端情况下模型一直不落地，不能因此把自适应整个锁死 */
  const onWindow = useCallback(
    (ms) => {
      if (lock.current > 1) return
      const budget = budgetOf(TIERS[Math.max(0, tier - 1)]?.cap ?? 60)
      bad.current = ms > budget ? bad.current + 1 : 0
      const cine = idx === 0 && buildClock.t < BUILD_END && performance.now() - bootAt.current < 15000
      if (bad.current >= (cine ? 4 : 2)) {
        bad.current = 0
        lock.current += 1
        setTier((t) => Math.max(0, t - 1))
      }
    },
    [tier, idx],
  )

  /* 体检开关：现场遇到「卡」要能不改代码就把帧率/纹理/调用数读出来，
     所以 prod 也留一个入口令（?dbg=1）—— tmp/hero-audit.mjs 量 prod 靠的就是它 */
  useEffect(() => {
    if (!DBG) return
    const c = ref.current
    if (c) c.dataset.tier = String(tier)
  }, [tier, ref])

  return (
    <Canvas
      ref={ref}
      frameloop={visible ? 'demand' : 'never'}
      dpr={Q_DPR && Q_DPR > 0 ? Q_DPR : TIERS[tier].dpr}
      camera={{ position: heroScenes[0].cam.pos, fov: heroScenes[0].cam.fov || 40 }}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMappingExposure: 1.02 }}
      /* 点空白（射线没打中任何拾取靶）= 解锁回全景：聚焦态需要一个不藏菜单的退出口。
         R3F 自带 delta 门控，拖拽 orbit 不会误触发；非具身屏本来就在 wide。
         但这里得自己再挡一道：链屏那六块牌是 DOM（drei <Html>），R3F 的射线打不到 DOM，
         于是在它这套语义里“点了牌”永远等于“点了空白”；而 missed 比牌自己的 click 晚一步，
         实测正好把刚选上的那块打回 wide（out=pool → +60ms=wide，牌纹丝不动）。
         按事件落点判：“空白”应该是“落在画布本体上”，而不是“射线没命中” */
      onPointerMissed={(e) => {
        const t = e && e.target
        if (t && t.closest && t.closest('.chain-board')) return
        selectDevice('wide')
      }}
    >
      <Suspense fallback={null}>
        <Scene idx={idx} cmd={cmd} tier={tier} />
      </Suspense>
      {/* 故意放在 Suspense 外面：挡在里面会跟着 GLB 一起被挂起，那“第三帧”
         就变成“模型到位那一帧”，比用户选的那条界晚了一整跳网络 */}
      <StageReady onPainted={onPainted} />
      <ContextGuard onLost={onContextLost} onRestored={onContextRestored} />
      <DevBridge onWindow={onWindow} tier={tier} />
      <FrameDriver cap={Q_CAP && Q_CAP > 0 ? Q_CAP : TIERS[tier].cap} />
    </Canvas>
  )
}

/** 把 Canvas 内部的帧统计接回外部：useFrame 只能在 Canvas 里用，
    而 setTier 必须在外面 —— 中间这一层就是那根线。 */
function DevBridge({ onWindow, tier }) {
  const { gl, scene } = useThree()
  const seen = useRef(false)
  const prev = useRef({ calls: 0, tris: 0 })
  const win = useRef({ t0: 0, n: 0, s: [] })
  useEffect(() => {
    seen.current = false
    if (DBG) window.__heroDbg = { tier }
  }, [tier])
  /* three 默认每次 renderer.render() 重置 info —— 而 composer 一帧里要 render 好几次，
     读到的永远是最后一个全屏 pass（实测：calls=3、tris=6，跟真值差两个量级）。
     改成手动不重置，取增量才是这一帧真正提交了多少东西 */
  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])
  useFrame((state, delta) => {
    if (!DBG) return
    const d = (window.__heroDbg ||= {})
    const i = gl.info
    /* 帧率窗口在应用内部算：上一版是另在页内挂一条 rAF 去量帧间隔，
       结果那条 rAF 与 FrameDriver 抢同一个调度，又得靠一个长驻 promise 把结果
       送回 CDP —— 主线程一满就两分钟不应答。现在量的是“真的画了几帧”，
       而且外部只需一次廉价读。 */
    const w = win.current
    const now = state.clock.elapsedTime
    if (!w.t0) w.t0 = now
    w.n += 1
    w.s.push(delta)
    const span = now - w.t0
    /* 窗口 4.2s：看板一拍是 1.5s，1.6s 的窗口只能接住 0~1 次重绘，
       同一段代码重测一次能从 23fps 摆到 18fps（实测过）—— 读数分不清是改动
       还是噪声。拉到 4.2s 后一个窗口稳定含 2~3 拍，p95 才有可比性；
       卡顿计数一律归一成「每秒」，不随窗口长度变。 */
    if (span >= 4.2 && w.n >= 3) {
      const s = w.s.slice().sort((a, b) => a - b)
      d.fps = Math.round(w.n / span)
      d.median = +(s[(s.length / 2) | 0] * 1000).toFixed(1)
      d.p95 = +(s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] * 1000).toFixed(1)
      d.max = +(s[s.length - 1] * 1000).toFixed(1)
      /* jank = 掉了限帧预算的帧；hitch = 一眼能看见的硬卡顿（拖影） */
      d.jank = +(s.filter((v) => v > 0.028).length / span).toFixed(1)
      d.hitch = +(s.filter((v) => v > 0.09).length / span).toFixed(2)
      d.winFrames = w.n
      d.span = +span.toFixed(2)
      w.t0 = now
      w.n = 0
      w.s = []
    }
    /* 把 scene 递出去是给 tmp/hero-ablate.mjs 用的：按 name 逐块藏掉再量帧率，
       才能把「卡」拆到具体哪一层贵 —— 光看帧率只能知道卡，不能知道卡在哪。
       camera 一并递出：tmp/device-click.mjs 要拿它把设备世界坐标投影成屏幕点 */
    d.scene = scene
    d.camera = state.camera
    d.ab = AB
    d.tier = tier
    d.calls = i.render.calls - prev.current.calls
    d.tris = i.render.triangles - prev.current.tris
    prev.current = { calls: i.render.calls, tris: i.render.triangles }
    d.geoms = i.memory.geometries
    d.texs = i.memory.textures
    d.programs = i.programs ? i.programs.length : 0
    d.dpr = gl.getPixelRatio()
    /* 场景对象数只在第一次算：traverse 是 O(n)，不该逐帧跑 */
    if (!seen.current) {
      let n = 0
      let draw = 0
      scene.traverse((o) => {
        n++
        /* 可渲染且未被祖先藏掉的个数 —— 这才是这一帧 draw call 的上限，
           比 raw 对象数有用：消融实验要看的恰好就是“关掉一层少几个 call” */
        if (o.visible && (o.isMesh || o.isLine || o.isPoints || o.isLineSegments)) {
          let p = o
          let hidden = false
          while (p) {
            if (!p.visible) {
              hidden = true
              break
            }
            p = p.parent
          }
          if (!hidden) draw++
        }
      })
      d.objs = n
      d.drawables = draw
      seen.current = true
    }
  })
  return <FrameGauge onWindow={onWindow} />
}
