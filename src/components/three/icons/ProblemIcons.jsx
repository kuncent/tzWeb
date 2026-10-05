import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PROBLEM_MODELS } from './problemModels'

/* ============================================================
 * 挑战与问题：一层盖在网格上的 3D 图标
 * ------------------------------------------------------------
 * 为什么是「一层」而不是「每张牌一个 Canvas」：五张牌就是五个 WebGL 上下文，
 * 加上首屏那个已经六个，各自的渲染器状态与着色器程序都要重建一遍，
 * 而浏览器单页的上下文上限只有十几个 —— 代价花在了不该花的地方。
 * 现在一个 Canvas、一个渲染器、一套灯光，五枚图标只是同一个场景里
 * 摆在不同像素位置上的五个 group。
 *
 * 怎么和 DOM 对齐：相机用正交，左右上下边界直接设成这块网格的像素尺寸，
 * 于是 1 世界单位 = 1 CSS 像素，图标的落点就是铭牌 <span> 的中心减去网格中心。
 * 这套换算比「透视 + 反投影」少两个自由度，不会随滚动漂移。
 *
 * 视差不是在着色器里做的，是几何上做的：每个部件带一个 baseDepth（它自己的 z），
 * 外层 group 随指针转 θ，那个部件就在屏幕上挪 baseDepth·sinθ —— 越靠前挪得越多。
 * 指针压上哪张牌，那张就把 baseDepth 乘开（EX），层与层拉开，同一档转角下的
 * 视差立刻变强 —— 这个反差原来挂在「点一下」上，而它得先教人「可以点」；
 * 换成 hover 之后路过就会碰上，不需要一句操作说明挂在这栏底下。
 *
 * 只在板块进视口时跑帧（frameloop 切 never），首屏那台重活不在同一屏。
 * ============================================================ */

/* 图标在屏幕上的大小。铭牌本身是 44px，图标给到 58 —— 稍微漫出牌边，
   这一点溢出就是「它是立体的、不是牌上的贴图」的唯一线索 */
const PX = 58
const EX = 1.45 // hover 时深度层拉开的倍率
const damp = THREE.MathUtils.damp

/* 两套配色：静息态走在 mist-200 的牌面上，hover 态走在 brand 的牌面上。
   同一份几何靠插值换色，不做「hover 就换一个模型」那种割裂的开关。
   light 这一档最麻烦：它得同时活在浅灰牌面与深蓝牌面两种底上，
   所以静息给一个能压住 mist-200 的中调（再浅就没边了），hover 才给纯白 */
const OFF = {
  body: new THREE.Color('#2a3648'), // ink-700
  accent: new THREE.Color('#1677ff'), // brand
  soft: new THREE.Color('#8b98a9'), // ink-400
  glass: new THREE.Color('#9fb4d0'),
  light: new THREE.Color('#cdd8e6'),
}
const ON = {
  body: new THREE.Color('#ffffff'),
  accent: new THREE.Color('#bfdbfe'),
  soft: new THREE.Color('#93c5fd'),
  glass: new THREE.Color('#dbeafe'),
  light: new THREE.Color('#ffffff'),
}
const KEYS = Object.keys(OFF)

function makeMats() {
  const m = {}
  for (const k of KEYS) {
    m[k] = new THREE.MeshStandardMaterial({
      color: OFF[k].clone(),
      roughness: k === 'accent' ? 0.3 : k === 'glass' ? 0.14 : 0.44,
      metalness: 0.06,
    })
  }
  m.soft.transparent = true
  m.soft.opacity = 0.5
  m.soft.depthWrite = false
  m.glass.transparent = true
  m.glass.opacity = 0.34
  m.glass.depthWrite = false
  m.glass.side = THREE.DoubleSide
  return m
}

/** 把正交相机的取景范围钉成这块网格的像素尺寸：1 单位 = 1 像素 */
function PixelCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    camera.left = -size.width / 2
    camera.right = size.width / 2
    camera.top = size.height / 2
    camera.bottom = -size.height / 2
    camera.near = 0.1
    camera.far = 300
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

function IconSlot({ index, build, frameRef, stateRef }) {
  const wrap = useRef(null)
  const amt = useRef(0)
  const mats = useMemo(makeMats, [])
  const model = useMemo(() => build(mats), [build, mats])

  useEffect(
    () => () => {
      for (const k of KEYS) mats[k].dispose()
    },
    [mats],
  )

  useFrame((s, delta) => {
    const dt = Math.min(delta, 0.05)
    const g = wrap.current
    const f = frameRef.current
    const st = stateRef.current
    const p = f.pts[index]
    if (!g) return
    /* 还没测到位置（首帧 / 铭牌不在 DOM 里）就整层不画，别在左上角挤一坨 */
    const ok = !!p && f.w > 0
    g.visible = ok
    if (!ok) return

    const want = st.hover === index ? 1 : 0
    amt.current = damp(amt.current, want, 7, dt)
    const a = amt.current
    const t = st.reduced ? 0 : s.clock.elapsedTime

    g.position.set(p[0] - f.w / 2, -(p[1] - f.h / 2) + a * 3, 0)
    g.scale.setScalar(PX * (1 + a * 0.13))

    /* 转角只跟着“指针真正压着的那张牌”走。指针在 st.px 里是一份全局值，
       上一版拿它同时呲给了 hover 与 active 两层 —— 拍出来就是：鼠标在 01 上
       横扫，选中了的 03 在屏幕另一头同步同角度地跟着转，读作“它们被一根线
       拉着”，而不是“我在看哪张、哪张才理我”。现在只剩 hover 一层，串味从源头
       消失了：一张牌只在指针落在它上面时转头，其余时候靠那一档 0.1 的自呼吸站着 */
    const aiming = st.hover === index && !st.reduced
    g.rotation.x = damp(g.rotation.x, aiming ? -st.py * 0.4 : 0, 7, dt)
    g.rotation.y = damp(g.rotation.y, aiming ? st.px * 0.52 : Math.sin(t * 0.3 + index) * 0.1, 7, dt)

    const rt = model.userData.sculptRuntime
    const ex = 1 + a * EX
    for (const part of rt.parts) part.position.z = part.userData.baseDepth * ex
    rt.tick(t, a)

    for (const k of KEYS) mats[k].color.lerpColors(OFF[k], ON[k], a)
    mats.soft.opacity = 0.5 + 0.35 * a
    mats.glass.opacity = 0.34 + 0.28 * a
    /* 探针（tmp/problems-shot.mjs）要读实际转角：视差“有没有动”靠肉眼看
       两张 440px 的裁切图分不出来。只进 DEV 分支，生产包不会多挂这个全局 */
    if (import.meta.env.DEV) (window.__probDbg || (window.__probDbg = []))[index] = [g.rotation.x, g.rotation.y, a, p[0], p[1]]
  })

  return (
    <group ref={wrap} visible={false}>
      <primitive object={model} />
    </group>
  )
}

export default function ProblemIcons({ frameRef, stateRef, live }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <Canvas
        orthographic
        flat
        camera={{ position: [0, 0, 120], zoom: 1 }}
        dpr={[1, 2]}
        frameloop={live ? 'always' : 'never'}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        /* 这一行是必须的，不是保险：R3F 的 Canvas 会在自己外层那个 div 上写
           pointerEvents: 'auto'（见 fiber 源码里那句 eventSource ? 'none' : 'auto'），
           而 style 是排在它后面的，所以外层那个 pointer-events-none 拦不住它 ——
           实测整块网格的 hover 都被这层透明画布吃了，五张牌永远进不了摊开态 */
        style={{ pointerEvents: 'none' }}
      >
        <PixelCamera />
        {/* 三点光：主光给体积、逆光把边缘从牌面上拎出来、正面补光压住死黑。
            透明背景上没有环境贴图可用，全靠这三盏 */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[2.5, 3.5, 6]} intensity={1.5} />
        <directionalLight position={[-3.5, -1.2, 2]} intensity={0.5} color="#a9c6f2" />
        {PROBLEM_MODELS.map((build, i) => (
          <IconSlot key={i} index={i} build={build} frameRef={frameRef} stateRef={stateRef} />
        ))}
      </Canvas>
    </div>
  )
}
