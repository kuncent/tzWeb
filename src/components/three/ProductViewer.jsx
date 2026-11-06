import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { useCanvasVisibility } from '../../hooks/useCanvasVisibility'
import { THEME } from '../../theme'
import {
  PRODUCTS,
  measureLocalBox,
  measureSupport,
} from './ProductShowcase'

/* ============================================================
 * 单机型 3D 查看器
 * ------------------------------------------------------------
 * 智能产品页「每卡一个独立查看器」用的最小舞台：把 ProductShowcase 里
 * 那 6 个机型组件（GLB + 程序化）与包围盒归一逻辑单独拎出来，一台一个
 * 画布。为省 GPU：不上后处理（辉光/景深），只留影棚灯光 + 离线环境贴图。
 *
 * 上下文预算：一屏 6 张画布会把 WebGL 上下文叠到浏览器上限，故照搬
 * 产品矩阵的做法 —— useInView(once:false) 离屏即卸载、useCanvasVisibility
 * 离屏停帧，滚走时释放上下文，回来时只剩重建（GLB 已由 useGLTF 缓存）。
 * ============================================================ */

const damp = THREE.MathUtils.damp
const _sz = new THREE.Vector3()
const _ct = new THREE.Vector3()

/* 机型：按包围盒归一到统一尺度、底面贴回地面，缓慢自转 + 按住水平拖动旋转 */
function Model({ productIndex, ctrl, still }) {
  const product = PRODUCTS[productIndex] || PRODUCTS[0]
  const Comp = product.Comp
  const target = product.target ?? 1.4
  const anchor = product.anchor || 'support'
  const root = useRef(null)
  const fit = useRef(null)

  useLayoutEffect(() => {
    const r = fit.current
    if (!r) return
    const box = measureLocalBox(r)
    if (!box) return
    box.getSize(_sz)
    box.getCenter(_ct)
    const k = target / Math.max(_sz.x, _sz.y, _sz.z)
    const sup = anchor === 'support' ? measureSupport(r, box) : null
    const cx = sup ? (sup.minX + sup.maxX) / 2 : _ct.x
    const cz = sup ? (sup.minZ + sup.maxZ) / 2 : _ct.z
    r.scale.setScalar(k)
    r.position.set(-cx * k, -box.min.y * k, -cz * k)
  }, [productIndex, target, anchor])

  useFrame((_, dt) => {
    const c = ctrl.current
    const idle = still ? 0 : 0.3
    if (root.current) root.current.rotation.y += c.vy + idle * dt
    if (!c.drag) c.vy = damp(c.vy, 0, 4, dt)
  })

  return (
    <group ref={root}>
      <group ref={fit}>
        <Comp />
      </group>
    </group>
  )
}

/* 指针控制：横向拖动改角速度，松手靠惯性滑停；竖向留给页面滚动 */
function DragCtl({ ctrl }) {
  const { gl } = useThree()
  useEffect(() => {
    const el = gl.domElement
    el.style.cursor = 'grab'
    el.style.touchAction = 'pan-y'
    const down = (e) => {
      ctrl.current.drag = true
      ctrl.current.last = e.clientX
      ctrl.current.vy = 0
      el.style.cursor = 'grabbing'
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    const move = (e) => {
      const c = ctrl.current
      if (!c.drag) return
      const dx = e.clientX - c.last
      c.last = e.clientX
      c.vy = -dx * 0.0075
    }
    const up = (e) => {
      const c = ctrl.current
      if (!c.drag) return
      c.drag = false
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
  }, [gl, ctrl])
  return null
}

function Rig() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    camera.position.set(0, 0.95, 4.3)
    camera.lookAt(0, 0.55, 0)
  }, [camera])
  return null
}

function Floor({ light }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <circleGeometry args={[7, 60]} />
        <meshStandardMaterial color={light ? '#e6ecf4' : '#070c14'} roughness={light ? 0.92 : 0.4} metalness={light ? 0 : 0.5} side={THREE.DoubleSide} />
      </mesh>
      <gridHelper args={[14, 28, light ? '#c3cede' : '#121b26', light ? '#d7dfec' : '#0a111a']} position={[0, 0.002, 0]} />
    </group>
  )
}

function Scene({ productIndex, ctrl, still, hi, light }) {
  return (
    <>
      <color attach="background" args={[light ? '#eef2f7' : THEME.night]} />
      <fog attach="fog" args={[light ? '#eef2f7' : THEME.night, 8, 20]} />

      <ambientLight intensity={light ? 0.5 : 0.22} color="#bcd2ff" />
      <hemisphereLight intensity={0.36} color={light ? '#aebfd6' : '#54687f'} groundColor={light ? '#cdd8e6' : '#04060a'} />
      <directionalLight position={[4.5, 7.5, 5]} intensity={light ? 1.5 : 1.85} color="#f2f7ff" />
      <directionalLight position={[-5.5, 3.2, -1.5]} intensity={1.1} color={THEME.sky} />
      <directionalLight position={[0, 2.4, -6.5]} intensity={1.35} color="#cfe4ff" />

      <Floor light={light} />
      <Suspense fallback={null}>
        <Model productIndex={productIndex} ctrl={ctrl} still={still} />
      </Suspense>

      {/* 离线影棚：顶箱 + 两侧灯带 + 背后轮廓，不依赖外部 HDR 文件 */}
      <Environment resolution={hi ? 120 : 80} frames={1}>
        <Lightformer form="rect" intensity={1.6} color="#e8f0fa" position={[0, 3.4, 0]} rotation-x={Math.PI / 2} scale={[7, 7, 1]} />
        <Lightformer form="rect" intensity={1.05} color="#dce9f8" position={[-1.6, 2.6, 2.4]} rotation-x={Math.PI / 2.6} scale={[5, 0.9, 1]} />
        <Lightformer form="rect" intensity={0.95} color={THEME.sky} position={[-4.6, 1.6, -1]} rotation-y={Math.PI / 2} scale={[4.5, 2.2, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#cfe0f5" position={[4.6, 1.8, 0]} rotation-y={-Math.PI / 2} scale={[5, 2.6, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#dcefff" position={[0, 2.2, -5.5]} scale={[9, 3, 1]} />
      </Environment>

      <Rig />
      <DragCtl ctrl={ctrl} />
    </>
  )
}

/** 单机型查看器：productIndex 对应 embodiedProducts / PRODUCTS 的 0-5 序；light 切浅色影棚底 */
export default function ProductViewer({ productIndex = 0, reduced = false, light = false, className = '' }) {
  /* 可见性只由 useCanvasVisibility 一处门控 frameloop：进视口画、出视口停帧。
     这里不再叠加第二个「挂载级」门控：旧版用 useInView 条件挂载 Canvas，但
     useCanvasVisibility 的 IntersectionObserver 只在首帧 ref 已挂上时才接线，条件
     挂载下首帧 Canvas 还没渲染、ref 为 null → IO 永不接管 → frameloop 恒为 never
     → 画布空白。本页只有一台查看器，常驻挂载成本可接受。 */
  const { ref, frameloop } = useCanvasVisibility()
  const hi = typeof navigator === 'undefined' ? true : (navigator.hardwareConcurrency || 4) >= 4
  /* 高清优先：把 dpr 上限放到 2（高分屏按设备像素渲染，不再把模型“磨砂”地放大）。
     旧版上限 1.1、降级到 0.8 —— 在 2x 屏上等于把画面拉伸一倍，看着发雾不高清。 */
  const [dprMax, setDprMax] = useState(hi ? 2 : 1.5)
  const ctrl = useRef({ drag: false, vy: 0, last: 0 })

  return (
    <div className={className}>
      <Canvas
        ref={ref}
        frameloop={frameloop}
        dpr={[1, dprMax]}
        camera={{ position: [0, 0.95, 4.3], fov: 34 }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 0.98 }}
      >
        <Scene productIndex={productIndex} ctrl={ctrl} still={reduced} hi={hi} light={light} />
        <PerformanceMonitor onDecline={() => setDprMax((d) => Math.max(1.25, +(d - 0.25).toFixed(2)))} />
      </Canvas>
    </div>
  )
}
