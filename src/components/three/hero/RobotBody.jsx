import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/* ============================================================
 * T800 人形真机（首屏具身屏的画面主体）
 * ------------------------------------------------------------
 * 为什么单拆一个文件：布景里到处要按“人有多高”定位 —— 胸芯、自检扫描环、
 * 测试台半径、相机机位。GLB 的原始单位谁也不保证，所以把包围盒归一这件事
 * 关在这里，对外只暴露一个常量 HUMAN_H：外面写的每一个 y 都是真米。
 *
 * 归一做法：量世界包围盒 → 按 y 高度缩放到 HUMAN_H → 底面贴地、xz 居中。
 *
 * 关键取舍：这里**不**跑 boostModelMaterials。那个函数把每个材质升成
 * MeshPhysicalMaterial + clearcoat，产品展示区（单主体、小屏幅）值得，
 * 但首屏这台人形占 1/6 屏幅、还要与机械臂同屏 —— clearcoat 等于给这些
 * 像素再跑一遍高光波。直接用 GLB 自带的 MeshStandardMaterial，
 * 只把 envMapIntensity 抬上去：壳靠环境反射就够亮，省下的全是片元开销。
 * ============================================================ */

/* 众擎机体定高。1.72 → 1.58（用户：机体稍微小一点）：
   当时岛上一排只 0.46m 的机器狗与 1.2m 的 G1 同屏，原尺寸在镜头里读作
   “一尊雕像站在玩具堆里”。1.58 仍是全场最高，但不顶画面。
   外面那些按“人有多高”定位的量（胸芯、扫描环、代理盒、特写机位）
   全部跟着这个常量走
   —— 中岛换成 1.45m 的 H2 之后这条线收紧了：领先量从 0.38m 缩到 0.13m，
   1.58 那一档不能再抬（抬上去顶画面，而且与 H2 读不出主次）*/
export const HUMAN_H = 1.58

const _box = new THREE.Box3()
const _size = new THREE.Vector3()
const _center = new THREE.Vector3()

export default function RobotBody({ height = HUMAN_H, rotationY = 0 }) {
  const { scene } = useGLTF('/models/t800-min.glb')

  const { obj, scale, offset } = useMemo(() => {
    /* clone 不复制材质，所以这里改的是 GLTFLoader 缓存里的那份 ——
       产品展示区也在读同一个 scene，但 envMapIntensity 两边要的都是“高”，不冲突 */
    const cloned = scene.clone(true)
    cloned.traverse((o) => {
      if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
        o.material.envMapIntensity = 1.25
        o.material.dithering = true
      }
    })
    _box.setFromObject(cloned)
    _box.getSize(_size)
    _box.getCenter(_center)
    /* 量不到高度就原样上台，别让一次失败的比例计算把整台人形压成 0 */
    const s = _size.y > 1e-4 ? height / _size.y : 1
    return {
      obj: cloned,
      scale: s,
      offset: [-_center.x * s, -_box.min.y * s, -_center.z * s],
    }
  }, [scene, height])

  return (
    <group name="t800" position={offset} scale={scale} rotation-y={rotationY}>
      <primitive object={obj} />
    </group>
  )
}

useGLTF.preload('/models/t800-min.glb')
