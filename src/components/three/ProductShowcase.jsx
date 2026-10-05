import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  PerformanceMonitor,
  RoundedBox,
  Sparkles,
  useGLTF,
} from '@react-three/drei'
import { Bloom, DepthOfField, EffectComposer, Noise, SMAA, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useCanvasVisibility } from '../../hooks/useCanvasVisibility'
import { boostModelMaterials } from './boost'

const damp = THREE.MathUtils.damp

/* ---------- 包围盒量测（局部空间，不受父级旋转影响） ----------
   6 台机型真实尺寸差异极大（1.75m 人形 vs 0.4m 视觉模组），
   手工 scale 很难同时兼顾，故按包围盒把每台归一到同一舞台尺度并贴回台面。 */
const _box = new THREE.Box3()
const _tmp = new THREE.Box3()
const _size = new THREE.Vector3()
const _center = new THREE.Vector3()
function measureLocalBox(root) {
  root.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  _box.makeEmpty()
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
    _tmp
      .copy(o.geometry.boundingBox)
      .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))
    _box.union(_tmp)
  })
  return _box.isEmpty() ? null : _box
}

/* 支撑面投影：只取高度底部 18% 的顶点算 XZ 包围盒。
   机械臂这类「底座在一侧、臂身探出去」的机型，按整体包围盒居中会把底座推离台心、看起来悬空。 */
const _v = new THREE.Vector3()
function measureSupport(root, box) {
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const rel = new THREE.Matrix4()
  const h = box.max.y - box.min.y
  const yTop = box.min.y + Math.max(0.05, h * 0.18)
  const s = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
  root.traverse((o) => {
    const pos = o.isMesh && o.geometry && o.geometry.attributes.position
    if (!pos) return
    rel.multiplyMatrices(inv, o.matrixWorld)
    for (let i = 0; i < pos.count; i += 3) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(rel)
      if (_v.y > yTop) continue
      if (_v.x < s.minX) s.minX = _v.x
      if (_v.x > s.maxX) s.maxX = _v.x
      if (_v.z < s.minZ) s.minZ = _v.z
      if (_v.z > s.maxZ) s.maxZ = _v.z
    }
  })
  return Number.isFinite(s.minX) ? s : null
}

/* LED 推到 HDR（>1）：配合 Bloom 高阈值，只有指示灯/灯条发光，白壳不再整体发虚 */
const hdr = (hex, mul) => new THREE.Color(hex).multiplyScalar(mul)
/* ---------- 共享 PBR 材质（与 GLB 白壳/枪灰金属同语言，保证整机一致性） ---------- */
const M = {
  /* 白瓷壳：清漆 + 低粗糙，产品渲染的关键 */
  shell: new THREE.MeshPhysicalMaterial({
    color: '#eef2f7',
    roughness: 0.22,
    metalness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    reflectivity: 0.5,
    envMapIntensity: 1.05,
  }),
  /* 枪灰结构金属 */
  metal: new THREE.MeshPhysicalMaterial({
    color: '#0d131b',
    roughness: 0.3,
    metalness: 0.92,
    clearcoat: 0.3,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.02,
  }),
  /* 深色工程塑料（展台面板也用它：压住顶光回反射，不抢机身） */
  dark: new THREE.MeshPhysicalMaterial({
    color: '#151d27',
    roughness: 0.52,
    metalness: 0.22,
    clearcoat: 0.22,
    clearcoatRoughness: 0.38,
    envMapIntensity: 0.6,
  }),
  /* 阳极氧化铝（拉丝感靠 roughness + 高光拉伸） */
  alu: new THREE.MeshPhysicalMaterial({
    color: '#7d8894',
    roughness: 0.36,
    metalness: 1,
    envMapIntensity: 0.82,
  }),
  /* 抛光钢（边缘高光条） */
  steel: new THREE.MeshPhysicalMaterial({
    color: '#c8d3de',
    roughness: 0.14,
    metalness: 1,
    envMapIntensity: 1.18,
  }),
  /* 铜热管 */
  copper: new THREE.MeshPhysicalMaterial({
    color: '#c9784a',
    roughness: 0.26,
    metalness: 1,
    envMapIntensity: 1.05,
  }),
  /* 黑橡胶 / 线缆 */
  rubber: new THREE.MeshPhysicalMaterial({
    color: '#0a0d12',
    roughness: 0.68,
    metalness: 0.1,
    clearcoat: 0.2,
    envMapIntensity: 0.8,
  }),
  /* PCB */
  pcb: new THREE.MeshPhysicalMaterial({
    color: '#0c2a24',
    roughness: 0.5,
    metalness: 0.25,
    envMapIntensity: 1.05,
  }),
  /* 镜头玻璃：高反射深色玻璃 */
  glass: new THREE.MeshPhysicalMaterial({
    color: '#05070b',
    roughness: 0.05,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    reflectivity: 0.9,
    ior: 1.52,
    envMapIntensity: 1.5,
  }),
  ledBlue: new THREE.MeshBasicMaterial({ color: hdr('#5FA8FF', 2.6), toneMapped: false }),
  ledGreen: new THREE.MeshBasicMaterial({ color: hdr('#3EE0A4', 2.6), toneMapped: false }),
  ledWarm: new THREE.MeshBasicMaterial({ color: hdr('#FFC46B', 2.6), toneMapped: false }),
}
/* 暗部渐变防条纹（与 boost.js 保持一致） */
Object.values(M).forEach((m) => {
  m.dithering = true
})

/* ---------- 真实机型 GLB ---------- */
function useModel(src) {
  const { scene } = useGLTF(src)
  return useMemo(() => {
    const cloned = scene.clone(true)
    boostModelMaterials(cloned)
    return cloned
  }, [scene])
}
function HumanoidModel() {
  const model = useModel('/models/t800-min.glb')
  return <primitive object={model} />
}
function ArmModel() {
  const model = useModel('/models/z1-min.glb')
  // GLB 本身底面贴地、沿 +Z 水平伸展；只绕 Y 转一个 3/4 位，不绕 X 仰（仰角会让臂展探到台面以下，看起来像摊在地上）
  return (
    <group rotation-y={0.78}>
      <primitive object={model} />
    </group>
  )
}
function MobileModel() {
  /* 换用与具身首屏同一台官方 go2-official.glb（urdf-to-glb 烘的干净壳面）。
     官方版机头在局部 +x、旧 go2-min 在 +z，差 90°：按「新 yaw = 旧 yaw − π/2」
     换算，保持原来那个 -0.5 的 3/4 侧脸机位不变（尺寸由 Station 的包围盒归一自动兜底）*/
  const model = useModel('/models/go2-official.glb')
  return (
    <group rotation-y={-0.5 - Math.PI / 2}>
      <primitive object={model} />
    </group>
  )
}
function WheeledModel() {
  const model = useModel('/models/turtlebot3-min.glb')
  return (
    <group rotation-y={-0.5}>
      <primitive object={model} />
    </group>
  )
}

/* ---------- 程序化：视觉模组（双目 RGB-D）—— 补镜头罩/IR 投射器/排线/螺钉等细节 ---------- */
function VisionModel() {
  const cable = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.02, 0.3, -0.05),
        new THREE.Vector3(0.12, 0.22, -0.12),
        new THREE.Vector3(0.1, 0.12, -0.2),
        new THREE.Vector3(-0.02, 0.035, -0.23),
      ]),
    [],
  )
  return (
    <group>
      {/* 安装底座 + 云台关节 */}
      <mesh position={[0, 0.02, 0]} material={M.metal}>
        <cylinderGeometry args={[0.12, 0.15, 0.04, 40]} />
      </mesh>
      <mesh position={[0, 0.055, 0]} material={M.steel}>
        <cylinderGeometry args={[0.032, 0.032, 0.03, 28]} />
      </mesh>
      <mesh position={[0, 0.19, 0]} material={M.alu}>
        <cylinderGeometry args={[0.024, 0.036, 0.28, 24]} />
      </mesh>
      {/* 机身：白瓷上盖 + 深色骨架 */}
      <group position={[0, 0.37, 0]}>
        <RoundedBox args={[0.38, 0.1, 0.075]} radius={0.014} smoothness={4} material={M.shell} />
        <RoundedBox args={[0.38, 0.032, 0.078]} radius={0.008} smoothness={4} position={[0, -0.05, 0]} material={M.dark} />
        {/* 顶盖散热细槽 */}
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[-0.12 + i * 0.03, 0.051, 0]} material={M.dark}>
            <boxGeometry args={[0.006, 0.004, 0.056]} />
          </mesh>
        ))}
        {/* 双目镜头：镜筒 + 玻璃 + 光圈环 */}
        {[-0.095, 0.095].map((x, i) => (
          <group key={i} position={[x, 0, 0.038]}>
            <mesh rotation-x={Math.PI / 2} material={M.metal}>
              <cylinderGeometry args={[0.031, 0.035, 0.024, 32]} />
            </mesh>
            <mesh position={[0, 0, 0.014]} rotation-x={Math.PI / 2} material={M.glass}>
              <cylinderGeometry args={[0.024, 0.024, 0.006, 32]} />
            </mesh>
            <mesh position={[0, 0, 0.018]} material={M.steel}>
              <torusGeometry args={[0.026, 0.0035, 10, 40]} />
            </mesh>
            {/* 玻璃上的镀膜反光点 */}
            <mesh position={[0.008, 0.008, 0.018]} material={M.ledBlue}>
              <circleGeometry args={[0.0035, 12]} />
            </mesh>
          </group>
        ))}
        {/* IR 投射器 / 补光窗口 */}
        {[-0.035, 0.035].map((x, i) => (
          <mesh key={i} position={[x, 0.006, 0.039]} material={M.glass}>
            <boxGeometry args={[0.022, 0.014, 0.004]} />
          </mesh>
        ))}
        {/* 状态灯条 */}
        <mesh position={[0, -0.028, 0.039]} material={M.ledBlue}>
          <boxGeometry args={[0.1, 0.004, 0.002]} />
        </mesh>
        {/* 角螺钉 */}
        {[
          [-0.17, 0.04],
          [0.17, 0.04],
          [-0.17, -0.04],
          [0.17, -0.04],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.048, z * 0.6]} rotation-x={Math.PI / 2} material={M.steel}>
            <cylinderGeometry args={[0.005, 0.005, 0.004, 12]} />
          </mesh>
        ))}
      </group>
      {/* 排线 */}
      <mesh material={M.rubber}>
        <tubeGeometry args={[cable, 32, 0.008, 8, false]} />
      </mesh>
    </group>
  )
}

/* ---------- 程序化：AI 算力平台 —— 补鳍片/热管/接口/格栅/螺钉等细节 ---------- */
function ComputeModel() {
  return (
    <group>
      {/* 主机箱 */}
      <RoundedBox args={[0.46, 0.14, 0.36]} radius={0.014} smoothness={4} position={[0, 0.07, 0]} material={M.metal} />
      {/* 上盖铝板 + 密集鳍片 */}
      <RoundedBox args={[0.44, 0.014, 0.34]} radius={0.006} smoothness={4} position={[0, 0.146, 0]} material={M.alu} />
      {Array.from({ length: 21 }).map((_, i) => (
        <mesh key={i} position={[-0.2 + i * 0.02, 0.178, 0]} material={M.alu}>
          <boxGeometry args={[0.006, 0.05, 0.32]} />
        </mesh>
      ))}
      {/* 铜热管（横穿 + 两端弯折） */}
      {[-0.07, 0.02, 0.11].map((z, i) => (
        <group key={i}>
          <mesh position={[0, 0.205, z]} rotation-z={Math.PI / 2} material={M.copper}>
            <cylinderGeometry args={[0.007, 0.007, 0.4, 16]} />
          </mesh>
          <mesh position={[-0.2, 0.19, z]} rotation-x={Math.PI / 2} material={M.copper}>
            <torusGeometry args={[0.016, 0.007, 8, 20, Math.PI]} />
          </mesh>
          <mesh position={[0.2, 0.19, z]} rotation-x={Math.PI / 2} material={M.copper}>
            <torusGeometry args={[0.016, 0.007, 8, 20, Math.PI]} />
          </mesh>
        </group>
      ))}
      {/* 前面板：接口 + 状态灯 + 发光条 */}
      <group position={[0, 0, 0.181]}>
        <RoundedBox args={[0.17, 0.056, 0.008]} radius={0.004} smoothness={3} position={[0.07, 0.062, 0]} material={M.dark} />
        {[-0.02, 0.03, 0.08].map((x, i) => (
          <mesh key={i} position={[x, 0.062, 0.006]} material={M.steel}>
            <boxGeometry args={[0.026, 0.009, 0.004]} />
          </mesh>
        ))}
        <mesh position={[-0.15, 0.062, 0.006]} material={M.pcb}>
          <boxGeometry args={[0.05, 0.04, 0.004]} />
        </mesh>
        {[-0.166, -0.134].map((x, i) => (
          <mesh key={i} position={[x, 0.088, 0.006]} material={i ? M.ledGreen : M.ledBlue}>
            <circleGeometry args={[0.006, 16]} />
          </mesh>
        ))}
        {/* 底部发光条（Bloom 拾取） */}
        <mesh position={[0, 0.012, 0.006]} material={M.ledBlue}>
          <boxGeometry args={[0.42, 0.005, 0.002]} />
        </mesh>
      </group>
      {/* 侧面散热格栅 + 露出的 PCB */}
      <group position={[0.231, 0.075, 0]}>
        <mesh material={M.pcb}>
          <boxGeometry args={[0.004, 0.09, 0.28]} />
        </mesh>
        {Array.from({ length: 11 }).map((_, i) => (
          <mesh key={i} position={[0.006, 0, -0.12 + i * 0.024]} material={M.metal}>
            <boxGeometry args={[0.008, 0.07, 0.008]} />
          </mesh>
        ))}
      </group>
      {/* 角螺钉 + 天线座 */}
      {[
        [-0.2, -0.15],
        [0.2, -0.15],
        [-0.2, 0.15],
        [0.2, 0.15],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.004, z]} material={M.steel}>
          <cylinderGeometry args={[0.008, 0.008, 0.008, 12]} />
        </mesh>
      ))}
      {[-0.19, 0.19].map((x, i) => (
        <mesh key={i} position={[x, 0.15, -0.16]} material={M.copper}>
          <cylinderGeometry args={[0.008, 0.008, 0.022, 14]} />
        </mesh>
      ))}
    </group>
  )
}

/* 与产品体系数据同序：人形 / 机械臂 / 移动 / 轮式 / 视觉 / 算力
   target = 上台后的最长边（世界单位），保证 6 台机型视觉体量一致
   anchor = 'support'（默认）把底座投影对齐台心；'bbox' 则按整体包围盒居中 */
const PRODUCTS = [
  { Comp: HumanoidModel, target: 1.62 },
  { Comp: ArmModel, target: 1.22 },
  { Comp: MobileModel, target: 1.44 },
  { Comp: WheeledModel, target: 1.36 },
  /* 程序化机型：排线会探到主体下方，按包围盒居中更稳 */
  { Comp: VisionModel, target: 1.24, anchor: 'bbox' },
  { Comp: ComputeModel, target: 1.3, anchor: 'bbox' },
]

/* 软接地阴影贴图：径向渐变黑，比 ContactShadows 便宜一个整场景 pass（能保住 +40% 帧率） */
const shadowTex = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.9)')
  g.addColorStop(0.42, 'rgba(0,0,0,0.42)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()

/* ---------- 展台基座：拉丝金属台体 + 抛光边圈 + 光环 + 加色辉光 ---------- */
function Pedestal({ active }) {
  const ring = useRef(null)
  const glow = useRef(null)
  useFrame((_, dt) => {
    if (ring.current) ring.current.opacity = damp(ring.current.opacity, active ? 0.5 : 0.12, 4, dt)
    if (glow.current) glow.current.opacity = damp(glow.current.opacity, active ? 0.055 : 0.008, 4, dt)
  })
  return (
    <group>
      {/* 台体走深枪灰：避免金属白壳抢主体、也压住顶部过曝 */}
      <mesh position={[0, -0.025, 0]} material={M.metal}>
        <cylinderGeometry args={[0.6, 0.665, 0.05, 64]} />
      </mesh>
      <mesh position={[0, 0.004, 0]} material={M.dark}>
        <cylinderGeometry args={[0.575, 0.575, 0.014, 64]} />
      </mesh>
      <mesh position={[0, -0.006, 0]} rotation-x={Math.PI / 2} material={M.steel}>
        <torusGeometry args={[0.613, 0.005, 10, 96]} />
      </mesh>
      <mesh position={[0, 0.013, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.49, 0.555, 96]} />
        <meshBasicMaterial ref={ring} color="#5FA8FF" transparent opacity={0.2} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.011, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.62, 48]} />
        <meshBasicMaterial
          ref={glow}
          color="#1E6BFF"
          transparent
          opacity={0}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* ---------- 单个产品站（选中走向镜头前、放大并缓慢自转） ---------- */
function Station({ index, total, active, R, step, Comp, target, anchor = 'support' }) {
  const g = useRef(null)
  const spin = useRef(null)
  const fit = useRef(null)
  const blob = useRef(null)
  const blobMat = useRef(null)
  const speed = useRef(0)
  const a = (index / total) * Math.PI * 2
  const base = useMemo(() => new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), [a])
  const r = useRef(R)
  const s = useRef(0.82)

  /* 自动归一：按包围盒缩到统一舞台尺度，并将底面贴回展台上方 */
  useLayoutEffect(() => {
    const root = fit.current
    if (!root) return
    const box = measureLocalBox(root)
    if (!box) return
    box.getSize(_size)
    box.getCenter(_center)
    const k = target / Math.max(_size.x, _size.y, _size.z)
    /* 对齐基准：默认用底座投影中心，拿不到时退回整体包围盒中心 */
    const sup = anchor === 'support' ? measureSupport(root, box) : null
    const cx = sup ? (sup.minX + sup.maxX) / 2 : _center.x
    const cz = sup ? (sup.minZ + sup.maxZ) / 2 : _center.z
    root.scale.setScalar(k)
    root.position.set(-cx * k, 0.022 - box.min.y * k, -cz * k)
    /* 接地阴影跟占地面积走，小体积机型不会留一大块黑 */
    if (blob.current) blob.current.scale.setScalar(Math.max(_size.x, _size.z) * k * 1.55 + 0.1)
  }, [target])

  useFrame((_, dt) => {
    const d = THREE.MathUtils.damp
    r.current = d(r.current, active ? R + step : R, 3, dt)
    s.current = d(s.current, active ? 1.05 : 0.82, 3, dt)
    // 选中即转台慢转，未选中缓缓回到正面姿态
    speed.current = d(speed.current, active ? 0.34 : 0, 2.2, dt)
    if (blobMat.current) blobMat.current.opacity = d(blobMat.current.opacity, active ? 0.8 : 0.42, 4, dt)
    if (g.current) {
      g.current.position.set(base.x * r.current, 0, base.z * r.current)
      g.current.scale.setScalar(s.current)
    }
    if (spin.current) spin.current.rotation.y += speed.current * dt
  })

  return (
    <group ref={g} rotation-y={a}>
      <Pedestal active={active} />
      {/* 软接地阴影（不跟随自转，故放在 spin 外） */}
      <mesh ref={blob} position={[0, 0.019, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={blobMat}
          map={shadowTex}
          color="#000000"
          transparent
          opacity={0.42}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <group ref={spin}>
        <group ref={fit}>
          <Comp />
        </group>
      </group>
    </group>
  )
}

/* ---------- 环形组：整环旋转把选中项转到正面 ---------- */
function Carousel({ active }) {
  const ring = useRef(null)
  const total = PRODUCTS.length
  useFrame((_, dt) => {
    if (!ring.current) return
    const target = -((active / total) * Math.PI * 2)
    ring.current.rotation.y = damp(ring.current.rotation.y, target, 3.2, dt)
  })
  return (
    <group ref={ring} position={[0, 0, 0.3]}>
      {PRODUCTS.map((p, i) => (
        <Station
          key={i}
          index={i}
          total={total}
          active={i === active}
          R={2.3}
          step={1.05}
          Comp={p.Comp}
          target={p.target}
          anchor={p.anchor}
        />
      ))}
    </group>
  )
}

/* ---------- 地面：镜面反射 + 极淡网格（弱性能设备退化为普通地面） ---------- */
function Floor({ hi }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.004, 0]}>
        <circleGeometry args={[11, 72]} />
        {hi ? (
          <MeshReflectorMaterial
            resolution={64}
            mixBlur={1}
            mixStrength={11}
            blur={[0, 0]}
            mirror={0.2}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            roughness={0.7}
            metalness={0.55}
            side={THREE.DoubleSide}
            color="#070c14"
          />
        ) : (
          <meshStandardMaterial color="#070c14" roughness={0.34} metalness={0.62} side={THREE.DoubleSide} />
        )}
      </mesh>
      <gridHelper args={[22, 44, '#121b26', '#0a111a']} position={[0, 0.002, 0]} />
    </group>
  )
}

/* ---------- 轨道相机：按住自由旋转 + 惯性，未拖动时保留指针视差 ----------
   约定与 OrbitControls 一致：「抓住画面跟手转」——
   向下拖 = 机台面向下拉 = 相机升高（俯视）；向右拖 = 相机左移。φ 为极角（自 +Y 起算），越小越高。
   区间以略低于水平（1.6）为下界、俯视 35° 为上界，默认 1.42 接近水平视角（地面为双面材质，压到水平线以下也不会看穿）。 */
const RADIUS = 4.312
const PHI_BASE = 1.42
const PHI_MIN = 0.62
const PHI_MAX = 1.6
const clampPhi = (v) => Math.min(PHI_MAX, Math.max(PHI_MIN, v))

function CameraRig() {
  const { camera, gl } = useThree()
  const target = useMemo(() => new THREE.Vector3(0, 0.7, 2.6), [])
  const off = useMemo(() => new THREE.Vector3(), [])
  const st = useRef({ theta: 0, phi: PHI_BASE, vTheta: 0, vPhi: 0, drag: false, px: 0, py: 0, pt: 'mouse' })

  useEffect(() => {
    const el = gl.domElement
    el.style.cursor = 'grab'
    /* pan-y：竖向交给页面滚动，横向拖动才转视角（触屏不会被卡住） */
    el.style.touchAction = 'pan-y'

    const down = (e) => {
      const s = st.current
      s.drag = true
      s.px = e.clientX
      s.py = e.clientY
      s.pt = e.pointerType
      s.vTheta = 0
      s.vPhi = 0
      el.style.cursor = 'grabbing'
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    const move = (e) => {
      const s = st.current
      if (!s.drag) return
      const dx = e.clientX - s.px
      const dy = e.clientY - s.py
      s.px = e.clientX
      s.py = e.clientY
      if (s.pt !== 'mouse' && Math.abs(dy) > Math.abs(dx)) return
      /* dy > 0（向下拖）→ 极角减小 → 相机抬高，与「跟手抓住画面」一致 */
      s.vTheta = -dx * 0.0062
      s.vPhi = -dy * 0.0034
      s.theta += s.vTheta
      s.phi = clampPhi(s.phi + s.vPhi)
    }
    const up = (e) => {
      const s = st.current
      if (!s.drag) return
      s.drag = false
      el.style.cursor = 'grab'
      try {
        if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('pointerleave', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('pointerleave', up)
    }
  }, [gl])

  useFrame((state, dt) => {
    const s = st.current
    /* 松手后靠惯性滑停 */
    if (!s.drag) {
      s.theta += s.vTheta
      s.phi = clampPhi(s.phi + s.vPhi)
      s.vTheta = damp(s.vTheta, 0, 4.2, dt)
      s.vPhi = damp(s.vPhi, 0, 4.2, dt)
    }
    /* 未拖动时叠加极小指针视差（方向与拖拽一致，松手不会反向弹一下），让画面“活”而不干扰主动旋转 */
    const par = s.drag ? 0 : 1
    const theta = s.theta - state.pointer.x * 0.05 * par
    const phi = clampPhi(s.phi + state.pointer.y * 0.03 * par)
    off.setFromSphericalCoords(RADIUS, phi, theta)
    camera.position.copy(target).add(off)
    camera.lookAt(target)
  })
  return null
}

function Scene({ active, hi }) {
  return (
    <>
      <color attach="background" args={['#060a11']} />
      <fog attach="fog" args={['#060a11', 11, 27]} />

      <Floor hi={hi} />
      <Suspense fallback={null}>
        <Carousel active={active} />
      </Suspense>

      {/* 空气微粒：让灯光有介质感（极淡，不能抢主体） */}
      <Sparkles count={hi ? 26 : 12} scale={[8, 3, 8]} position={[0, 1.4, 0]} size={1.1} speed={0.16} opacity={0.12} color="#9FCAFF" />

      {/* 接地阴影改为逐机型的软阴影贴片（见 Station），避开每帧多一个整场景 pass */}

      {/* 影棚灯光：主光 + 冷色侧光 + 背部轮廓光 + 前置补光（读清机身细节） */}
      <ambientLight intensity={0.22} color="#bcd2ff" />
      <hemisphereLight intensity={0.36} color="#54687f" groundColor="#04060a" />
      <directionalLight position={[4.5, 7.5, 5]} intensity={1.85} color="#f2f7ff" />
      <directionalLight position={[-5.5, 3.2, -1.5]} intensity={1.1} color="#5FA8FF" />
      <directionalLight position={[0, 2.4, -6.5]} intensity={1.35} color="#cfe4ff" />
      <directionalLight position={[-2.4, 1.8, 6]} intensity={0.75} color="#dbe9ff" />
      <pointLight position={[0, 2.6, 5]} intensity={0.7} color="#9FCAFF" distance={14} />

      {/* 环境贴图：顶部大柔光箱 + 两侧长条灯带 + 背后环形轮廓 */}
      <Environment resolution={hi ? 160 : 96} frames={1}>
        <Lightformer form="rect" intensity={1.6} color="#e8f0fa" position={[0, 3.4, 0]} rotation-x={Math.PI / 2} scale={[7, 7, 1]} />
        <Lightformer form="rect" intensity={1.05} color="#dce9f8" position={[-1.6, 2.6, 2.4]} rotation-x={Math.PI / 2.6} scale={[5, 0.9, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#cfe0f5" position={[2.2, 2.4, 1.6]} rotation-x={Math.PI / 2.8} rotation-z={0.4} scale={[4.5, 0.7, 1]} />
        <Lightformer form="rect" intensity={0.95} color="#5FA8FF" position={[-4.6, 1.6, -1]} rotation-y={Math.PI / 2} scale={[4.5, 2.2, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#cfe0f5" position={[4.6, 1.8, 0]} rotation-y={-Math.PI / 2} scale={[5, 2.6, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#dcefff" position={[0, 2.2, -5.5]} scale={[9, 3, 1]} />
        <Lightformer form="ring" intensity={0.95} color="#ffffff" position={[2.6, 3, 3]} scale={2.2} />
        <Lightformer form="ring" intensity={0.7} color="#8FC7FF" position={[-3, 2.4, 2.6]} scale={1.6} />
      </Environment>

      <CameraRig />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.62} luminanceThreshold={1.02} luminanceSmoothing={0.12} mipmapBlur radius={0.55} />
        {hi && <DepthOfField worldFocusDistance={3.6} worldFocusRange={3.6} bokehScale={0.95} resolutionScale={0.4} />}
        <Vignette eskil={false} offset={0.26} darkness={0.72} />
        <Noise opacity={0.022} />
        <SMAA />
      </EffectComposer>
    </>
  )
}

/** 机器人产品：3D 环形展台，active 决定哪个产品走到镜头前 */
export default function ProductShowcase({ active }) {
  const { ref, frameloop } = useCanvasVisibility()
  /* 弱性能设备（双核及以下）退化：去掉镜面反射与景深，保留材质与灯光 */
  const hi = typeof navigator === 'undefined' ? true : (navigator.hardwareConcurrency || 4) >= 4
  /* 核数 ≠ 显卡好坏：4 核的轻薄本常常是 Intel 集显，满 60fps + 全量后处理照样抽。
     运行时量真实帧率（PerformanceMonitor 要连续 2.5s 落在 40fps 以下才判掉帧，
     单帧毛刺不算），超预算就降 dpr 上限——只降不升：升档会让 composer 反复重建，
     观感是“画质在呼吸”，比一直低一点跑稳更糟。强机 onDecline 永不触发 → 分辨率不动、零回归。
     dpr 是同时给后处理 / 景深 / 辉光打折的那一个旋钮（与首屏消融同一结论：贵的是像素）。 */
  const [dprMax, setDprMax] = useState(hi ? 1.2 : 1)
  return (
    <Canvas
      ref={ref}
      frameloop={frameloop}
      dpr={[1, dprMax]}
      camera={{ position: [0, 1.02, 6.9], fov: 36 }}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMappingExposure: 0.98 }}
    >
      <Scene active={active} hi={hi} />
      <PerformanceMonitor onDecline={() => setDprMax((d) => Math.max(0.8, +(d - 0.2).toFixed(2)))} />
    </Canvas>
  )
}

useGLTF.preload('/models/t800-min.glb')
useGLTF.preload('/models/z1-min.glb')
useGLTF.preload('/models/go2-official.glb')
useGLTF.preload('/models/turtlebot3-min.glb')
