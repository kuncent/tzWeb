import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useCanvasVisibility } from '../../hooks/useCanvasVisibility'
import { boostModelMaterials } from './boost'

/* ============================================================
 * 轻量 3D 转台（实验室清单内页用）
 * ------------------------------------------------------------
 * 为什么不复用 ProductShowcase：那张是整馆舞台（环境层 + 特效链 +
 * 多机位），单台设备展示用它是拿 60k 三角码换一张产品图。这里只
 * 留三样：归一化取景、一盏环境光、一个自动转的相机。
 * 三条纪律：
 *   1) 不引外部 HDR —— 光照全靠 <Environment> 里的 Lightformer 自
 *      渲染（frames={1}，烘一次就常驻），断网也不掉相。
 *   2) 出视口停帧 —— useCanvasVisibility 把 frameloop 打成 never。
 *   3) 尺寸归一 —— 6 台机型真实尺寸从 0.4m 到 1.75m，按包围盒统一
 *      缩到 1.4 单位高并贴回台面，否则切一台就飞出画面。
 * ============================================================ */

const TARGET_H = 1.4

function Rig({ src }) {
  const { scene } = useGLTF(src)
  const group = useRef(null)

  const { object, scale, offset } = useMemo(() => {
    const cloned = scene.clone(true)
    boostModelMaterials(cloned)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const s = size.y > 0.001 ? TARGET_H / size.y : 1
    return {
      object: cloned,
      scale: s,
      // 缩完之后把中心拉回原点，再让最低点坐到 y=0 的台面上
      offset: [-center.x * s, -box.min.y * s, -center.z * s],
    }
  }, [scene])

  /* 极轻的呼吸感：整组绕 Y 慢转由 OrbitControls 负责，这里只补一点
     上下浮动，让静止画面不至于像贴图 */
  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.012
  })

  return (
    <group ref={group}>
      <group position={offset} scale={scale}>
        <primitive object={object} />
      </group>
    </group>
  )
}

function Disc() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.002}>
      <circleGeometry args={[1.25, 64]} />
      <meshBasicMaterial color="#0e1522" transparent opacity={0.55} />
    </mesh>
  )
}

export default function ModelViewer({ src, label = '', className = '' }) {
  const { ref, frameloop } = useCanvasVisibility('160px')
  return (
    <div ref={ref} className={className}>
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0.1, 1.05, 2.9], fov: 34 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 2]} intensity={1.1} />
        <Suspense fallback={null}>
          <Rig src={src} />
          <Disc />
          <Environment resolution={128} frames={1}>
            <Lightformer form="rect" intensity={1.7} color="#e8f0fa" position={[0, 3.4, 0]} rotation-x={Math.PI / 2} scale={[7, 7, 1]} />
            <Lightformer form="rect" intensity={1.1} color="#dce9f8" position={[-1.8, 2.4, 2.2]} rotation-x={Math.PI / 2.6} scale={[5, 0.9, 1]} />
            <Lightformer form="rect" intensity={0.85} color="#9fc6ff" position={[2.4, 2.2, -1.6]} rotation-x={Math.PI / 2.9} rotation-z={0.5} scale={[4.5, 0.7, 1]} />
          </Environment>
        </Suspense>
        <OrbitControls
          makeDefault
          autoRotate
          autoRotateSpeed={0.9}
          enablePan={false}
          enableDamping
          minDistance={1.6}
          maxDistance={4.6}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0.7, 0]}
        />
      </Canvas>
      {label && <p className="sr-only">{label}</p>}
    </div>
  )
}
