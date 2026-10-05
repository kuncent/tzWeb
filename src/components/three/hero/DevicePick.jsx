import { useRef, useState, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { damp, hdr } from './kit'
import { getDevice, selectDevice, subDevice } from './buildBus'

/* ============================================================
 * 设备拾取代理：一个不画出来的盒子 + 选中/悬停时的那圈刻度环
 * ------------------------------------------------------------
 * 为什么不直接对 GLB 挂 onClick：R3F 的 hover 射线是逐帧打的，
 * 人形 26 万 / 狗 2.7 万三角形的网格当拾取靶，HD630 上鼠标一动
 * 就是一次全三角求交 —— 首屏的帧预算不允许。代理盒一打三角形，
 * 代价可以忽略，而且把「点哪儿都算点这台设备」的容差也给了。
 *
 * 点击与拖拽 orbit 的区分用 R3F 的 event.delta（按下到抬起的像素距）：
 * 拖过 8px 就是「我在转镜头」，不是「我要选设备」。
 * ============================================================ */

export default function DevicePick({ id, size = [1, 1, 1], position = [0, 0, 0], ring = 0.5, ringY = 0, accent = '#5FA8FF' }) {
  const sel = useSyncExternalStore(subDevice, getDevice)
  const [hover, setHover] = useState(false)
  const on = sel === id
  const spin = useRef(null)
  const stat = useRef(null)
  const fade = useRef(0)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const want = on ? 1 : hover ? 0.4 : 0
    fade.current = damp(fade.current, want, 8, dt)
    const g = spin.current
    if (g) {
      g.visible = fade.current > 0.02
      if (g.visible) {
        g.rotation.z = state.clock.elapsedTime * (0.5 + fade.current * 0.5)
        if (g.material) g.material.opacity = 0.9 * fade.current
      }
    }
    /* 静环同样走阻尼：硬开关在 hover 进出时是一闪一闪的噪 */
    if (stat.current && stat.current.material) stat.current.material.opacity = 0.62 * fade.current
  })

  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta < 8) selectDevice(id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={size} />
        {/* opacity 0 仍然进射线表、但不进颜色缓冲：
            visible=false 在部分版本会被事件系统跳过，不冒这个险 */}
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <group position={[0, ringY, 0]} rotation-x={-Math.PI / 2}>
        <mesh ref={stat}>
          <ringGeometry args={[ring - 0.018, ring, 56]} />
          <meshBasicMaterial color={hdr(accent, 1.5)} transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* 四枚转动的刻度牙：选中态要"在转"，静环读作贴图，转环读作系统应答 */}
        <mesh ref={spin} visible={false}>
          <ringGeometry args={[ring + 0.035, ring + 0.062, 1, 1, 0, Math.PI * 0.28]} />
          <meshBasicMaterial color={hdr(accent, 2.4)} transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}
