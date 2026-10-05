import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import DevicePick from './DevicePick'

/* ============================================================
 * 实验室「居民」：Go2 四足 + 宇树 H2 人形（官方 URDF 烘的 GLB）
 * ------------------------------------------------------------
 * 参考交付实拍里，高校具身实验室从来不是"一台人形 + 一条臂"：
 * 设备阵容本身就是产品力（6 大设备平台）。这两台的网格取自宇树
 * 官方描述包（go2_description / h2_description，BSD-3），由
 * scripts/urdf-to-glb.mjs 走 URDF → DAE/STL → 分件赋材 → 合并减面烘成
 * GLB。上一档 go2-hero / g1-hero 出自第三方 jushen2，壳面有一层烘不掉
 * 的噪点，手指、面罩、Go2 字样这些辨识度全靠糊。烘出来的成品 0 骨骼，
 * 摆着不动就是它们最对的用法 —— 居民不需要演，需要在场。
 *
 * 归一做法与 RobotBody 同：量世界包围盒 → 定高 → 底面贴地、xz 居中。
 * 材质不跑 boost：首屏片元预算紧，壳靠 envMap 反射就够亮。
 *
 * 体量口径不变：居民是首屏 tris 的大头，-min 那档（go2 117k tris）
 * 把稳态 tris 抬到 344k（tier0 帧率 25→20），所以官方成品一律烘到 hero
 * 档以下：狗 398k → 39k tris / 178KB，人形 → 50k tris / 218KB，两台合计
 * 89k tris / 396KB，比替掉的两台（104k / 449KB）还小一圈。它们不在 LCP
 * 路径上（lazy + Suspense + 下面的模块级 preload），而狗的特写镜头只框
 * 0.67m —— 再往下压就要在多面体上露馅。
 *
 * TurtleBot3 底盘已整台去掉（用户：去掉底盘模型）：轮式设备的在场感
 * 由岛后那三台巡回 AGV 演（它们是程序几何，不吃 GLB 预算），
 * 岛前那条停位湾因此空着 —— 湾本来就是画给「走过去的车」的，
 * 摆一台常驻机反而把它读成了一个停车位 */

const _box = new THREE.Box3()
const _size = new THREE.Vector3()
const _center = new THREE.Vector3()

function useNormed(url, height) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const cloned = scene.clone(true)
    cloned.traverse((o) => {
      if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
        o.material.envMapIntensity = 1.2
        o.material.dithering = true
      }
    })
    _box.setFromObject(cloned)
    _box.getSize(_size)
    _box.getCenter(_center)
    const s = _size.y > 1e-4 ? height / _size.y : 1
    return { obj: cloned, scale: s, offset: [-_center.x * s, -_box.min.y * s, -_center.z * s] }
  }, [scene, height])
}

function Go2({ height = 0.46, rotationY = 0, position = [0, 0, 0] }) {
  /* go2-official：scripts/urdf-to-glb.mjs 从官方 go2_description 的 DAE 烘出来
     （398k → 39k tris / 178KB），壳面干净、带 “Go2” 字样，替掉带噪点的 go2-hero */
  const { obj, scale, offset } = useNormed('/models/go2-official.glb', height)
  /* name 是给探针挂的：tmp/go2-orient.mjs 要在运行时改这一组的 rotation.y 试朝向，
     没有名字就只能按坐标猜哪个 group 是狗 */
  return (
    <group name="resident-go2" position={position} rotation-y={rotationY}>
      <group position={offset} scale={scale}>
        <primitive object={obj} />
      </group>
    </group>
  )
}

/* 宇树 H2 替 G1（用户：可以使其他型号的模型，或者更新型号的模型）：
   官方 g1_description 是纯 STL、无材质库，补齐缺件后重烘实拍仍判不如现场
   g1-hero（腿细、膝有缝、腰一节灰圆柱），而 h2_description 出来是干净的
   1.80m 白色人形（黑面罩、有手指、有鞋、轮廓分离）—— 换 H2。
   定高 1.22 → 1.45：真机 1.80m 其实比众擎的 1.72m 还高，但岛上阵型是量好的
   （众擎 1.58 为全场最高），按它压到 0.81 倍。沿用 1.22 不行 —— 那是 H2 的
   0.68 倍，紧挨着 0.92 倍的 T800 会读成「一个缩水版小人」而不是两台不同的机器 */
function H2({ height = 1.45, rotationY = 0, position = [0, 0, 0] }) {
  const { obj, scale, offset } = useNormed('/models/h2-official.glb', height)
  return (
    <group position={position} rotation-y={rotationY}>
      <group position={offset} scale={scale}>
        <primitive object={obj} />
      </group>
    </group>
  )
}

/* 充电桩已移出演示岛前方（用户：去掉站台前面的杂物）——
   固定设施退到侧廊，岛前标线湾里不再摆东西 */

export default function LabResidents() {
  return (
    <group name="residents">
      {/* 三台在岛面上拉开三角（用户：机器狗放左边，宇树放中间，众擎放右边）：
          狗岛左、H2 岛中前、T800 岛右 —— 实测全景下三台落在屏宽
          44.2% / 55.2% / 65.4%，相邻间距 11.0% / 10.2%（上一版是
          46.8 / 58.3 / 67.1，间距 11.5 / 8.8 —— 右半那一段明显挤）。
          狗后来又被往前拉了一格（z=-0.3 → 0.3），屏上落点跟着重算。
          为什么只能拉到这里：DOM 文案占左 42%、看板占右 29%，可见 3D 窗
          只有中间那一条；那个深度上可见带只对应 x∈[-0.13,1.80] 那 1.9m ——
          岛有 4.4m 宽，但镜头前只有这一段读得见，真正拉开的是屏幕间距。
          换位后谁让谁：拾取射线是一束不是一条（全景相机绕 look 摆
          θ±0.05rad → 6.8m 半径上横向 ±0.34m，再叠指针视差），而往桌面臂
          夹爪的那束线在岛面上方 y≈1.0~1.2 通过 —— 高个（T800 1.58、H2 1.45）
          拦得住，矮个（狗 0.46、盒顶 0.56）拦不住。所以左中右三个坑里，
          能站在臂前面的只有狗。
          本表由 tmp/pick-ray.mjs 的 swap 模式选出：全表最小间隙 +0.118m，
          两台桌面臂的手框 54 个采样点里只剩 2 个低肘点被宇树让不掉（夹爪区 0 挡）。
          三条硬约束：① T800 脚下的测试台环 r=0.926 + 接触光池 0.95 要整个
          落在岛里 → x ≤ 1.55，且别的机器离环心 ≥ 1.05m；② 代理盒不出岛缘；
          ③ T800 取 1.45 而不是 1.55：它身后的岛后过道是三台 AGV 的停车排，
          再右半格就把最右边那条腿间车道埋掉了（见 EmbodiedRig 的 AGV_PARK）*/}
      {/* 头方向（用户：狗头的方向有问题）：官方那版（urdf-to-glb 烘的 go2-official）
          机头在局部 +x，而上一档 go2-hero 是 +z —— 差 90°，直接沿用旧 yaw 会把狗拧成
          侧身走路。符号不再靠看图猜：tmp/model-lab.html 的 yaw=0,90,180,270 模式把
          同一台狗四个姿态摆一排，一次成像定死“脸在哪根轴”。换算：新 yaw = 旧 yaw
          - π/2，于是世界机头方向不变（仍是 (0.77, 0, 0.64)：朝右前方斜对镜头，既
          看着观众又看着另外两台，同时还能拍到带 Go2 字样的左侧脸 */}
      <Go2 position={[0, 0.03, 0.3]} rotationY={Math.PI * 0.28 - Math.PI / 2} />
      {/* 宇树 H2 站岛中前：微朝左回镜，与右后的 T800 对角分开站。
          官方 URDF 的前向是 +x（toYup 那一刀不改 x），机头因此在局部 +x，
          比旧 g1-hero 的 +z 差 90° —— 换算同狗那一档：新 yaw = 旧 yaw - π/2，
          世界机头方向不变（定符号的办法见下面 Go2 的注释） */}
      <H2 position={[0.7, 0.03, 0.55]} rotationY={-0.3 - Math.PI / 2} />
      {/* 轮式底盘（TurtleBot3）已整台去掉（用户：去掉底盘模型）——
          它在岛前停位湾里那个位置现在空着：那个坑本来就是画给轮式设备的，
          而「多机协同」那三台巡回 AGV 已经把轮式这件事演了（还是程序几何，
          不吃 GLB 预算）。去掉后岛前那条带只剩标线，读作通道而不是堆场 */}
      {/* 可点设备：代理盒跟着新站位与新机高重算（环落在脚底平面上）。
          H2 的盒子收到 0.5 宽并且不贴着机身：拾取靶的大小受的是「别挡别人」
          的约束，不是机身 —— 1.2m 高、0.6m 宽的盒会把所有射向右后桌的低射线拦下 */}
      {/* 往镜头前站一点（用户）：z 从 -0.3 抬到 0.3 —— 三台里狗最矮，
          站在同一排上被两个高个压成背景。往前一格它才进第一排，
          而矮个子拦不住往桌面臂夹爪的那束高射线（那束线在岛面上方
          y≈1.0~1.2 通过）—— 前移不花掉任何一台的点击间隙。
          上限是岛前缘 z=0.95：代理盒半深 0.3 + 斜站时机身占的 z 跨度 0.28，
          再往前就踩下岛了；脚下的环（r=0.42）也还在岛面里。
          与 H2（x=0.7）在 x 上不交（狗盒右沿 0.3 < H2 盒左沿 0.45），
          与众擎脚下测试台环心的距离 1.52m ≫ 1.05m */}
      <DevicePick id="go2" position={[0, 0.31, 0.3]} size={[0.6, 0.5, 0.6]} ring={0.42} ringY={-0.26} accent="#5FA8FF" />
      {/* H2 抬到 1.45 之后靶子仍然只到胸口（0.03~1.23）：拾取靶吃的是「别挡
          别人」的约束，不是机身 —— 那束往桌面臂夹爪的线在岛面上方 y≈1.0~1.2
          通过，把盒子长到 1.45 就是把这条带整个占死。头不点，点身子 */}
      <DevicePick id="h2" position={[0.7, 0.63, 0.55]} size={[0.5, 1.2, 0.5]} ring={0.5} ringY={-0.58} accent="#5FA8FF" />
    </group>
  )
}

/* 居民是装配完成后才挂载的（showRes 延迟），不 preload 的话 fetch+meshopt 解码
   会落在运行态中途 —— Intel HD630 实测那一下是 497ms 的硬卡顿。
   模块级 preload 把它挪进初始加载期，与 RobotBody 对 t800 的做法一致 */
useGLTF.preload('/models/go2-official.glb')
useGLTF.preload('/models/h2-official.glb')
