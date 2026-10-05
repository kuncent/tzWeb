import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { heroScenes } from '../../../data/heroScenes'
import { ContactGlow, ContactShade, damp, hdr, useAppear } from './kit'
import { buildClock, getDevice, setBuildStage } from './buildBus'
import RobotBody, { HUMAN_H } from './RobotBody'
import LabResidents from './LabResidents'
import DevicePick from './DevicePick'

/* ============================================================
 * 具身屏布景：一台真机（T800 人形）+ 一个会动的作业单元（6 轴臂）
 * ------------------------------------------------------------
 * 上一版只有那根程序化圆柱堆出来的臂 —— 它承担了全部演出，于是整幅画
 * 读起来像"一张 plumbing 图飘在黑洞里"：没有主体、没有纵深、没有地方感。
 * jushen2 那一版的首屏之所以立得住，是因为画面里先有一个"人"（完整人形），
 * 臂与工位只是它身边的环境。所以这一版把主次换过来：
 *
 *   T800 人形（真机 GLB）  = 主体，站测试台，随指令转头/升扫描环/亮胸芯
 *   6 轴臂（程序化 FK）    = 作业单元，看板的四条指令仍然打在它身上
 *   AGV 编队               = 前场，swarm 指令时列队跑圈
 *
 * 仓库里四个 GLB 都是 1~2 mesh / 0 skin / 0 animation（实测过），
 * 关节驱动不了 —— 所以会抓东西的那台必须还是程序化 FK 链，
 * 真机只能整机摆着。姿态目标全部取自 data/heroScenes 的 poses 表，
 * 看板上的关节条吃的是同一张表：手臂动一下，看板度数一定跟着变。
 * ============================================================ */

const SCENE = heroScenes[0]
/* 六轴臂缩成桌面教学臂（scale 0.38）摆到后排学生桌上：
   作业单元不再是岛的主角 —— 岛让给人形与机器狗，
   臂变成“学生工位上那台机械臂”，这才是高校实验室的真实形态：
   桌面臂（myCobot/EQ-B6 那一类）本来就是这个尺寸。
   0.3→0.38：上一档在镜头里读作“桌上一粒玩具”，教学臂该能看清关节。
   x 从 -0.2 挪到桌列 1.2：桌列最左两档投进左 42% 的文案区，
   臂会被 DOM 盖住选不中 —— 摆到窗口内的档，点击才可达。
   再改 0.55（同一张桌的左半，桌面 x∈[0.45,1.95]）：众擎换到岛右之后，
   1.2 那一档正好落在它与宇树之间 —— 拿 tmp/pick-ray.mjs 的手框采样量过，
   27 个点里有两个低肘点被宇树机身吃掉；臂往左让开，夹爪那一段全空 */
const CELL = [0.55, 0.7705, -3.02]
/* 第二台教学臂：后排左列（-0.2,-3.1）。实测全景下它投在屏宽 42.5%、高 41%：
   那块 DOM 是空的（标题只到 27% 宽、段落从 44% 高起），所以看得见。
   直接放臂后排中档（1.2,-4.2）会与主臂在屏幕上叠成一台 —— 副臂不进指令回路，
   只看不得叠影。（旧注里「右列两档留给可点的 TurtleBot」早已作废：
   那台底盘整个从首屏拿掉了，右后两档现在只是空桌）*/
const CELL2 = [-0.2, 0.7705, -3.1]
const CELL_SCALE = 0.38
/* 关节安装位（父局部）与转轴：与下方 JSX 的嵌套严格一一对应 */
const JOINTS = [
  { at: [0, 0.16, 0], axis: 'y' }, // J1 底座回转
  { at: [0, 0.3, 0], axis: 'z' }, // J2 大臂俯仰（肩）
  { at: [0, 0.76, 0], axis: 'z' }, // J3 小臂俯仰（肘）
  { at: [0, 0.6, 0], axis: 'y' }, // J4 腕旋
  { at: [0, 0.16, 0], axis: 'z' }, // J5 腕摆
]
const TIP = [0, 0.15, 0]
/* 「放件位」：抓取模式里手臂带着工件走过去的那个姿态，不在数据表里
   因为它纯粹是布景内的几何关系，看板不需要显示它 */
const PLACE = [-0.5, 0.75, 0.9, 0.2, -0.6, 0.62]
/* 副臂的自摆姿态：五个关节各吃一个不可公度的慢频 —— 与主臂的指令回路无关，
   也永远不重复同一个读数（读数循环一遍就会被看成 GIF） */
const arm2Pose = (t) => [
  Math.sin(t * 0.29) * 0.55,
  -0.34 + Math.sin(t * 0.23 + 1.1) * 0.2,
  0.72 + Math.sin(t * 0.19 + 0.4) * 0.26,
  Math.sin(t * 0.31 + 2.0) * 0.4,
  -0.5 + Math.sin(t * 0.26 + 0.9) * 0.22,
]

/* ============================================================
 * 「搭建一间具身实验室」的装配时间轴（秒，从布景激活起算）
 * ------------------------------------------------------------
 * 上一版所有设备从第一帧就同时在场：没有先后就没有主次，读起来是
 * 一堆零件摊在地上，而不是一间被搭起来的实验室 —— 「杂乱无章」的
 * 一半成因就在这里。改成六道工序，每道只让一个新东西成为主角：
 *
 *   01 场地供电   测试台环 + 地面光池点亮
 *   02 网络总线   地面光池与台缘灯带点亮（总线是灯，不是拉线）
 *   03 机械臂落位 六轴臂从上方吊装落下、坐实
 *   04 工位视觉   料台/放置台落下，双目视锥做一次标定扫掠
 *   05 移动底盘   三台 AGV 从镜头外驶入停位
 *   06 人形联调   人形升上测试台、胸芯点亮、扫描环走一遍
 *   live          进入运行态，交还给看板的四条指令
 *
 * 工序号通过 buildBus 递给 DOM 的进度条，两头指同一道工序。
 * ============================================================ */
/* 6.5 → 4.4（用户：动画时间还是太长了，用户看不完就开始滚动）。
   缩的办法和上次一样：六道工序一道不少，抽的是工序之间的空转（每道间隔
   1.05 → 0.65），同时每道自身的时长只跟着收 ~15%（1.0 → 0.85 那一档）——
   收得比间隔少，动作本体才不会读成快进。真正的出口不是“再快一点”而是
   下面那个 ff：开始滚的人拿 3.2x 快进，不想等的人下一秒就能看到终态。
   live 4.4 + 0.7 沉降 = 5.1，与 HeroStage 的 BUILD_END 5.4 接得上 */
const BUILD = { power: 0.15, bus: 0.75, arm: 1.35, fixture: 2.0, agv: 2.65, human: 3.3, live: 4.4 }
/* smoothstep 版的 0→1：线性进场读作「滑进来」，smoothstep 读作「落位」 */
const stageAmt = (bt, t0, dur = 1.0) => {
  const x = (bt - t0) / dur
  return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)
}
/* AGV 停位：搬到背景墙那一侧 —— 岛后到学生桌之间的那条过道（z≈-2）。
   为什么不是贴着视频墙：桌列是连排的（1.5m 桌宽 / 1.4m 间距，中间不留缝），
   后排桌面以下的地板从这个机位高度看被整排桌子完挡（拿 band 模式反解过：
   要看见 z=-5 的地面，相机得抬到 17m 外）—— 贴墙那块“背景”其实是死区。
   岛后这条过道才是背景里唯一读得见的地板：可见带在 z=-2 是 x∈[-0.28,2.32]。
   但那条带上的三台车不是平均排开的 —— 它们得停在前面三台机器「腿间」的空隙里：
   狗压在 y=0.15~0.46 是实心挡（它的阴影在过道上宽 0.71m），而人形到了车高度那一档
   只剩两条腿（腿宽 0.26~0.32）→ 拿 tmp/pick-ray.mjs 的 agvfit 扫出来是三条车道：
   x∈[0.28,0.71] / [1.13,1.50] / [2.00,2.32]，一辆 0.44m 的车刚好一条一条
   → 三台取 0.48 / 1.34 / 2.16，屏上 50.5% / 60.0% / 69.4%（屏距 9.5 / 9.4）。
   众擎因此从 1.5 让到 1.45：它再右移半格，第三条车道就被它的腿压到 0.25m，
   最右那台车只能停在带边（看板下）；让这 0.05m 换来腿部间隙 +0.032 → +0.082。
   z 不能再往后：学生凳在 z=-2.48（半径 0.17）+ 车体半深 0.18（转向时
   对角 0.26），再退就坐进凳子；往前则压上岛缘（岛后缘 z=-1.45）
   第三个分量是停位角（用户：扫地机器人要有 3D 感）：旧版三台都是
   rotation.y = π，一模一样朝向、同一个矩形背对镜头 —— 读作复制粘贴。
   现在三台各歪一个角（左后 / 右前 / 正侧），轮廓一台一个样，
   轮子与载货台也才露得出来 */
const AGV_PARK = [
  [0.48, -1.86, 2.35],
  [1.34, -1.93, 0.62],
  [2.16, -1.83, -1.42],
]
/* 巡回带：一车一道，只在自家那格里动。
   可用带是算出来的，不是调出来的：车体 0.44×0.36 → 转向时外接圆半径
   0.283，凳脚前缘 -2.31、岛后缘 -1.45 ⇒ 中心 z 只能落在 [-2.00, -1.76]；
   相邻两道的中心距最小 0.68（1.34-0.07 与 2.16-0.07）> 两台外接圆
   0.566 + 余量 0.08 ⇒ x 摆幅上限 0.07。
   旧版不是这样：三台共用一条以 x=1.32 为中心的嵌套椭圆（幅度 0.84），
   注释里写「同心嵌套椭圆互不相交 → 永不撞」—— 椭圆确实不相交，
   但车是椭圆上的点：三台在同一条 z 带上各按各的相位跑，
   最外一圈正好盖住 0.48~2.16，点与点必然重合 → 穿模（用户）*/

/* 布景材质：一律 MeshStandardMaterial，不用 Physical。
   clearcoat 是再跑一遍高光波，而首屏这两台机器占了一半屏幕 ——
   拆屏实测里壳体的片元开销是 GPU 端的大头。壳靠 envMap 的反射就够亮了。 */
const MAT = {
  shell: new THREE.MeshStandardMaterial({ color: '#eef2f7', roughness: 0.24, metalness: 0.06, envMapIntensity: 1.15 }),
  metal: new THREE.MeshStandardMaterial({ color: '#101823', roughness: 0.3, metalness: 0.92, envMapIntensity: 1.15 }),
  alu: new THREE.MeshPhysicalMaterial({ color: '#7d8894', roughness: 0.36, metalness: 1, envMapIntensity: 0.95 }),
  /* 中间那台换中性灰壳：旧版是 MAT.dark（#141c26、metalness 0.72），
     在暗地板上直接融成一块黑斑，三台车读成一坨。白/灰/黑三档明度
     才读得出「三台」与前后层次 */
  shell2: new THREE.MeshStandardMaterial({ color: '#8f9cad', roughness: 0.36, metalness: 0.42, envMapIntensity: 1.0 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#0a0d12', roughness: 0.85, metalness: 0.05 }),
  dark: new THREE.MeshStandardMaterial({ color: '#141c26', roughness: 0.42, metalness: 0.72, envMapIntensity: 1.15 }),
}

/* 站位三角（用户：机器狗放左边，宇树放中间，众擎放右边）：
   机器狗岛左、宇树 H2 岛中前、众擎 T800 岛右 —— 实测全景下三台落在
   屏宽 44.2% / 55.2% / 65.4%（相邻间距 11.0 / 10.2，逐台推导与拾取包络
   见 LabResidents 顶部注释）。狗后来又被往前拉了一格（z=-0.3 → 0.3，
   三台里它最矮，同排站就被两个高个压成背景），落点跟着重算成
   43.7 / 55.2 / 65.4 —— 间隙没花掉一分（report 全表最坏 +0.118m）。
   三条约束：① 测试台环半径 0.926 + 接触光池 0.95 要整个落在岛面里
   → HUMAN 的 x ≤ 1.55、z ∈ [-0.5, 0]，且别的机器不能站进这个圈；
   ② 拾取射线互不挡 + 不挡桌面臂的夹爪 —— 相机是个漂移束不是定点，
   收敛条件由 tmp/pick-ray.mjs 的 swap 模式扫包络把关；
   ③ 众擎的 x 还决定岛后那条过道的第三条车道宽不宽（见上方 AGV_PARK）——
   1.45 是「屏上够右」与「不埋住身后那台车」两边的交点 */
const HUMAN = [1.45, 0, -0.2]
/* 「主角圈」落点表（用户：mvp圈要移动到聚焦的设备上）：
   工序 01 那两道通电环 + 接触光池原本钉在人形脚下不动 —— 点狗的时候
   镜头飞到狗那儿，圈还围着人形，读作「聚焦的是人形」而不是「是狗」。
   现在选中谁就滑到谁脚下（阻尼 k=2.6，约 1s 到位），解锁回人形。
   x/z 取各机 DevicePick 的脚底点；s 按机身水平尺度收（环基础半径
   0.72/0.92 是按人形 0.8m 站位框给的，狗只有 0.6m）。
   y 是这个组自己的偏移，不是环的高度：环与光池在组局部 y=0.038/0.036
   上自带 8mm 离地量（缩放只走 x/z，见下方跟随块）→ 岛面机位取 0，
   而 arm 那台在桌上：圈落到地板就藏进桌沿与凳腿后面，等于没有。
   arm 的 s=0.30 是量出来的，不是试出来的：桌面臂本体只有 CELL_SCALE=0.38，
   底座半径 0.42×0.38=0.16m。0.42 档（外环 0.39m）在 e10follow-arm 里
   把臂压成了一个点，弧还甩到桌左沿外 0.29m；0.30 档外环 0.278m
   = 底座 1.7 倍，正好是「一圈光环套住这台机器」的比例，
   越界那 0.18m 落在邻桌上（桌列连排：1.5m 桌宽 / 1.4m 间距，不留缝，
   台面同高 0.77）→ 不会悬空。h2 的 0.86 让外环压到岛前缘外 0.4m：
   岛是 _flush_（只抬 3cm），光池本来就该漫出地台，不算穿帮。
   tb 那一档随底盘模型一起删了（用户：去掉底盘模型）*/
const MARK = {
  human: { p: [1.45, 0, -0.2], s: 1 },
  h2: { p: [0.7, 0, 0.55], s: 0.86 },
  go2: { p: [0, 0, 0.3], s: 0.62 },
  arm: { p: [0.55, 0.736, -3.02], s: 0.3 },
}
/* 胸芯高度：真机胸口大约在总高的 3/4 处，跟着 HUMAN_H 走而不是写死 */
const CORE_Y = HUMAN_H * 0.773

/* ---------- 测量用的同构链：只算末端位置，不进渲染 ----------
   轨迹管、料台位置都靠它，保证「画出来的」和「装出来的」是同一个点。 */
function buildChain() {
  const root = new THREE.Object3D()
  const nodes = []
  let p = root
  for (const j of JOINTS) {
    const g = new THREE.Object3D()
    g.position.set(...j.at)
    p.add(g)
    nodes.push(g)
    p = g
  }
  const tip = new THREE.Object3D()
  tip.position.set(...TIP)
  p.add(tip)
  return { root, nodes, tip }
}
const _p = new THREE.Vector3()
function tcpOf(chain, q) {
  chain.nodes.forEach((g, i) => {
    g.rotation.set(0, 0, 0)
    g.rotation[JOINTS[i].axis] = q[i]
  })
  chain.root.updateMatrixWorld(true)
  return chain.tip.getWorldPosition(_p).clone()
}

/* ---------- 主体：T800 人形 ----------
   没有骨骼，所以"活"只能靠整机：呼吸、朝指令转头、胸芯脉冲、
   一道从脚底升到头顶的自检扫描环。扫描环是一个细环面沿 y 走，
   比任何贴图都便宜，而且"机器人在做自检"这件事一眼就读得出来。 */
function Humanoid({ accent, cmd, active, riseRef }) {
  const outer = useRef(null)
  const inner = useRef(null)
  const scan = useRef(null)
  const core = useRef(null)
  const halo = useRef(null)
  const scanT = useRef(1)
  const led = useMemo(() => hdr(accent, 2.2), [accent])

  useEffect(() => {
    if (!cmd.n) return
    scanT.current = 0
  }, [cmd.n])

  useFrame((state, delta) => {
    /* 布景藏起来就别白跑：呼吸与转头的幅度低到看不出来，却要每帧改五个矩阵 */
    if (!active) return
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    if (outer.current) {
      /* 待机时缓慢转向镜头，收到指令时朝作业单元偏一点 —— 像听见了 */
      const want = active ? -0.42 + Math.sin(t * 0.21) * 0.1 : -0.15
      outer.current.rotation.y = damp(outer.current.rotation.y, want, 1.6, dt)
    }
    if (inner.current) {
      /* 装配工序 06：人形从测试台下方升上来。rise 由父级逐帧写进 riseRef
         （不能当 props 传：那会每帧重渲染整棵 GLB 子树） */
      const rise = riseRef ? riseRef.current : 1
      /* -1.75 而不是 -1.35：人形总高 ~1.5，只压 -1.35 会让头顶露出地板一截，
         拍出来是「一尊半身像坐在地上」而不是「还没进场」 */
      inner.current.position.y = (1 - rise) * -1.75 + Math.sin(t * 1.15) * 0.007
      inner.current.rotation.z = damp(inner.current.rotation.z, active ? state.pointer.x * 0.018 : 0, 3, dt)
      /* 没升上来之前胸芯不亮：一台还没就位的机器不该有心跳 */
      const lit = rise > 0.55
      if (core.current) core.current.visible = lit
      if (halo.current) halo.current.visible = lit
    }
    if (core.current) {
      const k = 1 + Math.sin(t * 2.1) * 0.07
      core.current.scale.setScalar(k)
    }
    if (halo.current) {
      halo.current.rotation.z = t * 0.6
      const k = 1 + Math.sin(t * 1.4) * 0.06
      halo.current.scale.setScalar(k)
    }
    /* 扫描环：0→1 用 1.6 秒走完，走完就藏起来等下一次 */
    if (scan.current) {
      scanT.current = Math.min(1.25, scanT.current + dt * 0.62)
      const k = scanT.current
      const on = k < 1
      scan.current.visible = on
      if (on) {
        scan.current.position.y = 0.06 + k * (HUMAN_H + 0.06)
        /* 两头淡、中间实：一条硬边贴在人形上像被套了个呼啦圈 */
        const fade = Math.sin(k * Math.PI)
        scan.current.scale.setScalar(1 + fade * 0.06)
        if (scan.current.material) scan.current.material.opacity = 0.5 * fade
      }
    }
  })

  return (
    <group ref={outer}>
      <group ref={inner}>
        <RobotBody rotationY={0} />
        {/* 胸芯：金属压圈 + 没进去的发光球（平贴一个圆片会像贴纸） */}
        <group position={[0, CORE_Y, 0.145]}>
          <mesh>
            <torusGeometry args={[0.036, 0.01, 14, 34]} />
            <meshStandardMaterial color="#243040" metalness={0.95} roughness={0.22} />
          </mesh>
          <mesh ref={core} position={[0, 0, -0.009]}>
            <sphereGeometry args={[0.027, 20, 20]} />
            <meshBasicMaterial color={led} toneMapped={false} />
          </mesh>
          <mesh ref={halo} position={[0, 0, 0.004]}>
            <ringGeometry args={[0.046, 0.052, 32]} />
            <meshBasicMaterial color={led} transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
        {/* 自检扫描环 */}
        <mesh ref={scan} rotation-x={-Math.PI / 2} position={[0, 0.2, 0]} visible={false}>
          <torusGeometry args={[0.34, 0.0045, 8, 56]} />
          <meshBasicMaterial color={led} transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
      {/* 测试台的两道环与光池已上提到 rig 层（工序 01 场地供电）：
          它们属于「场地」，不属于人形 —— 人形还没进场时台子就该先亮着，
          而且环不该跟着 outer 的转头一起转 */}
    </group>
  )
}

/* ---------- 教学臂本体（同一份几何两台用） ----------
   抽成组件是因为要放第二台：复制一份 JSX 的话，下次改关节尺寸就会
   只改到一台（两台必须同型，否则不是“一排工位”是“两台不同的机器”）。
   ref 全部由调用方传进来：主臂的关节被看板指令驱动，副臂自己慢摆。
   手上的那两片双目视锥（一片实锥 + 一片 wireframe）已整组删掉：
   用户反馈那是“手上的光栅”—— 一个半透网格漏斗吊在夹爪下，
   在桌面臂这个尺度上只读作噪声。“视觉伺服”这件事交给料台上的靶环去演 */
function ArmMesh({ accent, jointRefs, fingerL, fingerR, heldPart }) {
  const setJoint = (i) => (el) => {
    jointRefs.current[i] = el
  }
  return (
    <group>
      <ContactGlow radius={1.4} color={accent} opacity={0.2} y={0.004} />

      <mesh position={[0, 0.05, 0]} material={MAT.metal}>
        <cylinderGeometry args={[0.34, 0.42, 0.1, 40]} />
      </mesh>
      <mesh position={[0, 0.13, 0]} material={MAT.alu}>
        <cylinderGeometry args={[0.23, 0.25, 0.07, 32]} />
      </mesh>
      <mesh position={[0, 0.158, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.27, 0.295, 64]} />
        <meshBasicMaterial color={hdr(accent, 2.4)} transparent opacity={0.8} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <group ref={setJoint(0)}>
        <mesh position={[0, 0.16, 0]} material={MAT.shell}>
          <cylinderGeometry args={[0.14, 0.18, 0.3, 28]} />
        </mesh>
        <mesh position={[0, 0.16, 0.13]} material={MAT.rubber}>
          <boxGeometry args={[0.09, 0.22, 0.02]} />
        </mesh>

        <group ref={setJoint(1)} position={JOINTS[1].at}>
          <mesh material={MAT.metal} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.115, 0.115, 0.26, 28]} />
          </mesh>
          {/* 大臂：壳 + 一道发光条 */}
          <mesh position={[0, 0.38, 0]} material={MAT.shell}>
            <cylinderGeometry args={[0.072, 0.098, 0.76, 24]} />
          </mesh>
          <mesh position={[0, 0.38, 0.075]} material={MAT.rubber}>
            <boxGeometry args={[0.03, 0.6, 0.02]} />
          </mesh>
          <mesh position={[0, 0.38, 0.086]}>
            <boxGeometry args={[0.014, 0.52, 0.006]} />
            <meshBasicMaterial color={hdr(accent, 1.7)} toneMapped={false} />
          </mesh>

          <group ref={setJoint(2)} position={JOINTS[2].at}>
            <mesh material={MAT.metal} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.09, 0.09, 0.21, 24]} />
            </mesh>
            <mesh position={[0, 0.3, 0]} material={MAT.shell}>
              <cylinderGeometry args={[0.052, 0.072, 0.6, 20]} />
            </mesh>
            <mesh position={[0, 0.3, -0.06]} material={MAT.alu}>
              <boxGeometry args={[0.024, 0.44, 0.02]} />
            </mesh>

            <group ref={setJoint(3)} position={JOINTS[3].at}>
              <mesh position={[0, 0.08, 0]} material={MAT.metal}>
                <cylinderGeometry args={[0.066, 0.072, 0.16, 22]} />
              </mesh>

              <group ref={setJoint(4)} position={JOINTS[4].at}>
                <mesh position={[0, 0.06, 0]} material={MAT.shell}>
                  <cylinderGeometry args={[0.05, 0.06, 0.12, 20]} />
                </mesh>

                {/* ―― 末端法兰：夹爪 ―― */}
                <group position={TIP}>
                  <mesh position={[0, 0.02, 0]} material={MAT.alu}>
                    <cylinderGeometry args={[0.046, 0.052, 0.05, 18]} />
                  </mesh>
                  <mesh position={[0, 0.035, 0.048]} material={MAT.rubber}>
                    <boxGeometry args={[0.07, 0.035, 0.03]} />
                  </mesh>
                  {[-0.019, 0.019].map((x) => (
                    <mesh key={x} position={[x, 0.035, 0.066]}>
                      <sphereGeometry args={[0.009, 12, 12]} />
                      <meshBasicMaterial color={hdr(accent, 1.9)} toneMapped={false} />
                    </mesh>
                  ))}

                  <group ref={fingerL} position={[-0.05, 0.07, 0]}>
                    <mesh position={[0, 0.035, 0]} material={MAT.shell}>
                      <boxGeometry args={[0.016, 0.09, 0.036]} />
                    </mesh>
                    <mesh position={[0, 0.078, 0]}>
                      <boxGeometry args={[0.016, 0.012, 0.036]} />
                      <meshBasicMaterial color={hdr(accent, 1.6)} toneMapped={false} />
                    </mesh>
                  </group>
                  <group ref={fingerR} position={[0.05, 0.07, 0]}>
                    <mesh position={[0, 0.035, 0]} material={MAT.shell}>
                      <boxGeometry args={[0.016, 0.09, 0.036]} />
                    </mesh>
                    <mesh position={[0, 0.078, 0]}>
                      <boxGeometry args={[0.016, 0.012, 0.036]} />
                      <meshBasicMaterial color={hdr(accent, 1.6)} toneMapped={false} />
                    </mesh>
                  </group>

                  <mesh ref={heldPart} position={[0, -0.1, 0]} visible={false}>
                    <boxGeometry args={[0.09, 0.09, 0.09]} />
                    <meshStandardMaterial color="#dbe7f5" roughness={0.35} metalness={0.5} emissive={accent} emissiveIntensity={0.25} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

/* ---------- AGV：从"灰蘑菇"改成读得出的移动机器人 ----------
   上一版是一个圆柱 + 一个圆环，镜头里就是一枚飞碟。
   现在给底盘、四组轮、激光雷达鼓包、前面板灯带与载货台，
   全是小尺寸基础体，代价是个位数 draw call。 */
function Agv({ accent, i }) {
  /* 三档明度（白 / 中性灰 / 黑）：三台全同一色时它们在屏上融成
     一坨（实测就是），而白壳那两台的轮廓又几乎一样 —— 拿不出一台一个样
     就读不出「三台车」。白/灰/黑三档同时把前后层次也带出来了 */
  const body = useMemo(() => (i === 1 ? MAT.shell2 : i === 2 ? MAT.dark : MAT.shell), [i])
  const led = useMemo(() => hdr(i === 0 ? '#3EE0A4' : accent, 2.4), [accent, i])
  return (
    <group>
      <RoundedBox args={[0.44, 0.11, 0.36]} radius={0.022} smoothness={2} position={[0, 0.085, 0]} material={body} />
      <RoundedBox args={[0.3, 0.05, 0.26]} radius={0.014} smoothness={2} position={[0, 0.155, 0]} material={MAT.dark} />
      {/* 载货台 */}
      <mesh position={[0, 0.185, 0]} material={MAT.alu}>
        <boxGeometry args={[0.34, 0.008, 0.3]} />
      </mesh>
      {/* 激光雷达 */}
      <mesh position={[0.13, 0.2, 0]} material={MAT.rubber}>
        <cylinderGeometry args={[0.042, 0.046, 0.05, 16]} />
      </mesh>
      <mesh position={[0.13, 0.226, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.03, 0.04, 20]} />
        <meshBasicMaterial color={led} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      {/* 前面板灯带 + 两侧轮 */}
      <mesh position={[0, 0.075, 0.183]}>
        <boxGeometry args={[0.3, 0.012, 0.006]} />
        <meshBasicMaterial color={led} toneMapped={false} />
      </mesh>
      {/* 轮子必须露出壳外：上一版轮在 x=±0.19、宽 0.028，而机身宽 0.44
          （±0.22）—— 四轮被壳完全包住，镜头下读作一个无轮的黑盒子 */}
      {[-0.235, 0.235].map((x) =>
        [-0.11, 0.11].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.055, z]} rotation-z={Math.PI / 2} material={MAT.rubber}>
            <cylinderGeometry args={[0.055, 0.055, 0.04, 14]} />
          </mesh>
        )),
      )}
      {/* 接触暗斑 + 光池（用户：要有 3D 感）：加色光池只说“这里在发光”，
          而让一个 0.2m 高的小东西落地的是它自己遮住的那片暗 ——
          旧版只有一团 accent 光斑，车体读作贴在地板上的一张片。
          暗斑紧、光晕宽：中心压黑、四周一圈还是亮，不会把车吞掉 */}
      <ContactShade radius={0.3} opacity={0.62} y={0.006} />
      <ContactGlow radius={0.52} color={accent} opacity={0.13} y={0.004} />
    </group>
  )
}

/** Suspense 边界里的“到位”哨兵：它自己不读任何异步资源，所以只有整块边界
    落地（GLB 取到并解码完）才会随兄弟一起 commit —— 它的 effect 就是
    “模型到位”的信号。把它放在 fallback 之外是不可能的：那一档它根本不渲染 */
function Ready({ onReady }) {
  useEffect(() => {
    onReady()
  }, [])
  return null
}

export default function EmbodiedRig({ mounted, active, cmd, accent = SCENE.accent, sparkles = true }) {
  const [root, prog] = useAppear(active)
  const joints = useRef([])
  const fingerL = useRef(null)
  const fingerR = useRef(null)
  /* 副臂（后排那台）自己的关节与夹爪：只吃 arm2Pose，不吃看板指令 */
  const joints2 = useRef([])
  const fingerL2 = useRef(null)
  const fingerR2 = useRef(null)
  const reticle = useRef(null)
  const tcpDot = useRef(null)
  const staticPart = useRef(null)
  const heldPart = useRef(null)
  const agvs = useRef([])
  /* 三台车各自的巡回自转角：逐帧累积而不是乘 t —— t 已经几十秒，
     拿 on * t 当角度的话 swarm 一按下去车头会瞬转到随机位置 */
  const agvSpin = useRef([0, 0, 0])
  const human = useRef(null)
  /* 装配进场的三个可动组：场地台 / 机械臂 / 工位视觉 */
  const platRef = useRef(null)
  const armRef = useRef(null)
  const fixRef = useRef(null)
  const trackRef = useRef(null)
  /* 人形升起进度：逐帧写，Humanoid 读（不当 props，避免每帧重渲染 GLB） */
  const rise = useRef(0)
  const [showGLB, setShowGLB] = useState(false)
  /* 居民（Go2 / H2）比人形再晚一点取：它们在画面边角，
     不该和人形抢首屏关键路径上的那一次 GLB 解码 */
  const [showRes, setShowRes] = useState(false)
  useEffect(() => {
    if (!mounted || showRes) return
    const t = setTimeout(() => setShowRes(true), 700)
    return () => clearTimeout(t)
  }, [mounted, showRes])

  /* ―― 出厂动画等模型到位再开演 ――
     过去时钟从「布景激活」那一帧就走，而真机 GLB 是激活后 240ms 才开始取、
     还要算网络与解码：冷加载时镜头已经飞过半个车间，人形才凭空出现 ——
     观众看到的是“演完了才开场的空场”。现在两批 GLB（人形 + 居民）的
     Suspense 都落地了才走表；watchdog 兜底，网再慢也不至于永远不开场 */
  const [glbIn, setGlbIn] = useState(false)
  const [resIn, setResIn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => {
      setGlbIn(true)
      setResIn(true)
    }, 5000)
    return () => clearTimeout(t)
  }, [])

  /* 几何真相：一次算好各模式的末端点 */
  const geo = useMemo(() => {
    const chain = buildChain()
    const grasp = tcpOf(chain, SCENE.poses.grasp)
    const place = tcpOf(chain, PLACE)
    const legs = SCENE.poses.track.map((q) => tcpOf(chain, q))
    const curve = new THREE.CatmullRomCurve3(legs, false, 'centripetal', 0.4)
    const tube = new THREE.TubeGeometry(curve, 64, 0.011, 8, false)
    return { grasp, place, legs, curve, tube }
  }, [])

  /* 料台高度 = 抓取位末端刚好够得着的地方，不靠手调 */
  const pad = useMemo(() => {
    const h = Math.max(0.06, geo.grasp.y - 0.2)
    return { xz: [geo.grasp.x, geo.grasp.z], h, pxz: [geo.place.x, geo.place.z], ph: Math.max(0.06, geo.place.y - 0.2) }
  }, [geo])

  const st = useRef({ amt: { track: 0, serve: 0, grasp: 0, swarm: 0 }, spread: 0.06, hold: false, gp: 0, seed: 0, bt: 0 })

  /* GLB 不进首屏关键路径：等这台布景真的站稳了再取 */
  useEffect(() => {
    if (!active || showGLB) return
    const t = setTimeout(() => setShowGLB(true), 240)
    return () => clearTimeout(t)
  }, [active, showGLB])

  useFrame((state, delta) => {
    /* 布景已经完全沉到地板下就别再算了：三套布景常驻同一个 Canvas，
       不挡掉的话每帧要空跑三遍遍历，这是上一版掉帧的隐性来源之一 */
    if (!active && prog.current < 0.01) return
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const s = st.current

    /* ―― 装配时钟：在场且模型都到位了才推进；沉到底归零，下次滚回来重演一遍 ――
       ff = 片头快进倍率（skipBuild 置位，见 buildBus）：没被跳过时是 1，与旧写法等价 */
    if (active && glbIn && resIn) s.bt += dt * buildClock.ff
    else if (prog.current < 0.02) s.bt = 0
    const bt = s.bt
    /* 逐帧值递给相机（分镜机位）与视频墙（开机门控）：走可变对象，不走 React */
    buildClock.t = bt
    buildClock.active = active
    /* 分镜脚本按装配时钟等采样：headless 低帧率下 dt clamp 会让 bt 慢于
       真实时间，按真实秒拍会拍错工序 */
    window.__heroBt = bt
    const aPower = stageAmt(bt, BUILD.power, 0.75)
    const aBus = stageAmt(bt, BUILD.bus, 0.8)
    const aArm = stageAmt(bt, BUILD.arm, 0.95)
    const aFix = stageAmt(bt, BUILD.fixture, 0.85)
    const aAgv = stageAmt(bt, BUILD.agv, 1.05)
    rise.current = stageAmt(bt, BUILD.human, 1.15)
    const aLive = stageAmt(bt, BUILD.live, 0.7)
    setBuildStage(
      active
        ? bt >= BUILD.live ? 6 : bt >= BUILD.human ? 5 : bt >= BUILD.agv ? 4 : bt >= BUILD.fixture ? 3 : bt >= BUILD.arm ? 2 : bt >= BUILD.bus ? 1 : 0
        : -1,
    )

    /* 运行态之前不下发指令：一台还没装好的臂不该在跑轨迹 */
    const mode = active && aLive > 0.4 ? cmd.id || 'idle' : 'idle'
    for (const k of Object.keys(s.amt)) s.amt[k] = damp(s.amt[k], mode === k ? 1 : 0, 3.2, dt)

    /* --- 姿态目标 --- */
    let q = SCENE.poses.idle
    let openFinger = null
    if (mode === 'track' && s.amt.track > 0.05) {
      const leg = Math.floor(t / 2.2) % geo.legs.length
      const nxt = (leg + 1) % geo.legs.length
      const f = (t / 2.2) % 1
      q = SCENE.poses.track[leg].map((v, i) => v + (SCENE.poses.track[nxt][i] - v) * f)
    } else if (mode === 'serve') q = SCENE.poses.serve
    else if (mode === 'grasp') {
      /* 抓取循环走时间轴，不走"到没到位"的反馈判定：
         反馈式状态机在 spread 还没张开的帧里永远满不了条件，会闭在手里出不来 */
      s.gp = (s.gp + dt * 0.24) % 1
      const p = s.gp
      q = p > 0.42 ? PLACE : SCENE.poses.grasp
      openFinger = p < 0.16 || p > 0.86 ? 0.055 : 0.014
      s.hold = p > 0.3 && p < 0.88
    } else if (mode === 'swarm') q = SCENE.poses.swarm

    /* 待机与视觉伺服给一点"活着"的抖动：伺服模式抖得密，像闭环在修正 */
    if (mode === 'idle') q = q.map((v, i) => v + (i === 0 ? Math.sin(t * 0.42) * 0.26 : Math.sin(t * 0.7 + i) * 0.014))
    if (mode === 'serve') q = q.map((v, i) => v + Math.sin(t * 5.2 + i * 1.7) * 0.012 * (0.4 + s.amt.serve))

    joints.current.forEach((g, i) => {
      if (!g) return
      const ax = JOINTS[i].axis
      g.rotation[ax] = damp(g.rotation[ax], q[i], mode === 'track' ? 3.4 : 2.6, dt)
    })

    /* --- 夹爪：抓取模式按时间轴开合，其它模式按姿态表里的张开度 --- */
    const wantSpread = openFinger !== null ? openFinger : 0.02 + Math.abs(q[5]) * 0.05
    s.spread = damp(s.spread, wantSpread, 6, dt)
    if (fingerL.current) fingerL.current.position.x = -s.spread
    if (fingerR.current) fingerR.current.position.x = s.spread
    if (mode !== 'grasp') s.hold = false
    if (staticPart.current) staticPart.current.visible = !s.hold
    if (heldPart.current) heldPart.current.visible = s.hold

    /* --- 副臂：不进指令回路，自己按一条慢轨迹往复 ---
       与主臂同型但不同相，读作“隔壁工位那台在练”。也走 damp：
       吊装与降档时它跟着 dt 走，不会瞬移 */
    const q2 = arm2Pose(t)
    joints2.current.forEach((g, i) => {
      if (!g) return
      g.rotation[JOINTS[i].axis] = damp(g.rotation[JOINTS[i].axis], q2[i], 1.2, dt)
    })
    const sp2 = 0.02 + Math.abs(Math.sin(t * 0.23)) * 0.028
    if (fingerL2.current) fingerL2.current.position.x = -sp2
    if (fingerR2.current) fingerR2.current.position.x = sp2

    /* --- 轨迹：末端沿样条跑一个亮点 --- */
    if (tcpDot.current) {
      const f = (t * 0.26) % 1
      geo.curve.getPointAt(f, tcpDot.current.position)
      tcpDot.current.visible = s.amt.track > 0.05
    }

    /* --- 视觉伺服：只留料台上的目标靶环（脉动）——
       臂手上那两片双目视锥（“光栅”）已整组删掉。
       工序 04 里先做一次标定扫掠（calib），之后才交还给 serve 指令 */
    const calib = bt > BUILD.fixture + 0.15 && bt < BUILD.fixture + 1.05 ? Math.sin(Math.min(1, (bt - BUILD.fixture - 0.15) / 0.9) * Math.PI) : 0
    const visAmt = Math.max(s.amt.serve, calib)
    if (reticle.current) {
      reticle.current.visible = visAmt > 0.04
      const k = 1 + Math.sin(t * 3.1) * 0.12
      reticle.current.scale.set(k, k, 1)
      reticle.current.rotation.z = t * 0.5
    }

    /* --- 装配进场：每道工序一个主角，落位即停 --- */
    if (platRef.current) {
      const pg = platRef.current
      pg.visible = aPower > 0.02
      /* 主角圈跟着聚焦设备走（用户：mvp圈要移动到聚焦的设备上）。
         未聚焦时 getDevice() = 'wide' → 回 MARK.human，与工序 01
         的落位一致：进场动画一行不改，只是运行态多了个跟随 */
      const m = MARK[getDevice()] || MARK.human
      const kM = 1 - Math.exp(-2.6 * dt)
      pg.position.x += (m.p[0] - pg.position.x) * kM
      pg.position.y += (m.p[1] - pg.position.y) * kM
      pg.position.z += (m.p[2] - pg.position.z) * kM
      /* 进场缩放照旧（0.55→1），只是乘上该机自己的尺度 —— 但只缩 x/z。
         d1-arm 实测：setScalar 把组局部 0.038 的离地量也乘成了 0.011，
         环沉进台面 23mm → 圈整个看不见（tb 那一档同理埋在地板下 6mm）。
         环与光池都是躺在 XZ 面上的一片，y 不缩既不变形也不掉高度，
         MARK.p[1] 的「它站的那块面 + 8mm」语义于是对所有尺度都成立 */
      const wantS = m.s * (0.55 + 0.45 * aPower)
      const kS = pg.scale.x + (wantS - pg.scale.x) * kM
      pg.scale.set(kS, 1, kS)
    }
    if (armRef.current) {
      armRef.current.visible = aArm > 0.02
      /* 吊装落下：从 +1.5 世界单位坐实到 0 */
      armRef.current.position.y = (1 - aArm) * 1.5
    }
    if (fixRef.current) {
      fixRef.current.visible = aFix > 0.02
      fixRef.current.position.y = (1 - aFix) * 1.1
    }
    /* 人形没升上来之前整棵 GLB 隐藏：只压位移会让头顶露出地板 */
    if (human.current) human.current.visible = rise.current > 0.02
    /* 轨迹样条只在 track / 标定时出现：常驻就是一条斜插画面的 stray wire */
    if (trackRef.current) trackRef.current.visible = s.amt.track > 0.05 || calib > 0.05

    /* --- AGV 编队：工序 05 从镜头外驶入停位湾；swarm 指令下整圈慢扫 ---
       一车一道（坐标与摆幅的推导见上方 AGV_PARK）：待命时 x±0.04 / z±0.04
       加停位角 ±0.28rad 的慢摇（读作“在等活”），swarm 时摆幅抬一档、
       再叠一个逐帧累积的整圈自转（0.5rad/s，一圈 12.6s）。
       朝向不再取速度向量：摆幅只几厘米时 atan2(vx,vz) 的两个分量在不同
       时刻各自过零 → 车头会莫名乱转；而原地整圈扫是这条 0.68m 间距里
       唯一既能演出「协同」又不越道的动作 */
    agvs.current.forEach((g, i) => {
      if (!g) return
      const on = s.amt.swarm
      g.visible = aAgv > 0.03
      if (!g.visible) return
      const [px, pz, pyaw] = AGV_PARK[i]
      const w1 = 0.13 + i * 0.021
      const w2 = 0.21 + i * 0.037
      const ph = i * 2.4
      agvSpin.current[i] += on * 0.5 * dt
      g.position.set(px + (0.04 + 0.03 * on) * Math.sin(t * w1 + ph), 0.001, pz + (0.035 + 0.035 * on) * Math.sin(t * w2 + ph * 1.7))
      g.rotation.y = pyaw + 0.28 * Math.sin(t * w1 * 0.7 + ph) + agvSpin.current[i]
      /* 进场：从镜头后（z=7）滑进停位湾。旧版这里还压了 -0.4 的 y，
         车是从地板下面“钻”出来的 —— 位移留在 z，y 恒定贴地 */
      g.position.z += (7 - g.position.z) * (1 - aAgv)
    })
  })

  return (
    <group ref={root} name="rig-embodied">
      {/* 工序 01 场地供电：人形测试台的两道环 + 光池。
          先于一切设备亮起来 —— 「这里将要放一台机器」是搭建的第一句话 */}
      <group ref={platRef} name="plat" position={HUMAN} visible={false}>
        {/* 环要读到「通电」：×1.5/0.42 在黑地板上只剩一圈若隐若现的描边，
            工序 01 全场只有它一个主角，压着亮度就等于这道工序没演。
            半径收到 0.72/0.92：人形退到岛后半，环再大就跨出岛缘了 */}
        <mesh rotation-x={-Math.PI / 2} position-y={0.038}>
          <ringGeometry args={[0.72, 0.745, 96]} />
          <meshBasicMaterial color={hdr(accent, 2.2)} transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.038}>
          <ringGeometry args={[0.92, 0.926, 96, 1, 0, Math.PI * 1.7]} />
          <meshBasicMaterial color={hdr(accent, 1.8)} transparent opacity={0.32} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <ContactGlow radius={0.95} color={accent} opacity={0.26} y={0.036} />
      </group>

      {/* ―― 主体：真机人形 ―― */}
      <group ref={human} position={HUMAN}>
        {mounted && showGLB ? (
          <Suspense fallback={null}>
            <Ready onReady={() => setGlbIn(true)} />
            <Humanoid accent={accent} cmd={cmd} active={active} riseRef={rise} />
          </Suspense>
        ) : null}
      </group>

      {/* ―― 作业单元：两台桌面 6 轴臂（工序 03 同批吊装）――
          主臂在学生桌 col 1.2：吃看板的四条指令；副臂在后排 col 2.6：自己慢摆。
          吊装位移写在世界层（不再嵌在缩放组里）：那里的 1.5 就是真 1.5 米 */}
      <group ref={armRef} visible={false}>
        <group position={CELL} scale={CELL_SCALE}>
          <ArmMesh accent={accent} jointRefs={joints} fingerL={fingerL} fingerR={fingerR} heldPart={heldPart} />
        </group>
        <group position={CELL2} scale={CELL_SCALE}>
          <ArmMesh accent={accent} jointRefs={joints2} fingerL={fingerL2} fingerR={fingerR2} />
        </group>
      </group>

      <group position={CELL} scale={CELL_SCALE}>
        {/* 工序 04：轨迹 + 料台 + 放置台，整组从上方落下 */}
        <group ref={fixRef} visible={false}>
        {/* 轨迹样条单独门控：只有 track / 标定时才画，常驻是 stray wire。
            样条管本体已删（用户：去掉设备之间的连线）：三个路点与跑动的
            末端指示足够读“轨迹规划”，连管子反而把桌面系成电线枛 */}
        <group ref={trackRef} visible={false}>
        {geo.legs.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.028, 16, 16]} />
            <meshBasicMaterial color={hdr('#ffffff', 1.4)} transparent opacity={0.75} toneMapped={false} />
          </mesh>
        ))}
        <mesh ref={tcpDot}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color={hdr(accent, 2.6)} toneMapped={false} />
        </mesh>
        </group>

        {/* ―― 工作台：料台 + 放置台 + 视觉靶环 ――
           薄台面 + 四根细腿，不用实心方柱：实心柱在镜头里像台冰箱，
           读不出"这是个能放东西的台面"。台面高度仍然由 FK 反算。 */}
        <group position={[pad.xz[0], 0, pad.xz[1]]}>
          <RoundedBox args={[0.4, 0.045, 0.4]} radius={0.012} smoothness={3} position={[0, pad.h, 0]} material={MAT.dark} />
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} position={[sx * 0.155, pad.h / 2, sz * 0.155]} material={MAT.alu}>
              <cylinderGeometry args={[0.013, 0.013, pad.h, 10]} />
            </mesh>
          ))}
          <mesh position={[0, pad.h + 0.024, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.12, 0.135, 40]} />
            <meshBasicMaterial color={hdr(accent, 1.5)} transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={staticPart} position={[0, pad.h + 0.068, 0]}>
            <boxGeometry args={[0.09, 0.09, 0.09]} />
            <meshStandardMaterial color="#dbe7f5" roughness={0.35} metalness={0.5} emissive={accent} emissiveIntensity={0.2} />
          </mesh>
          <mesh ref={reticle} position={[0, pad.h + 0.028, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.16, 0.185, 4, 1]} />
            <meshBasicMaterial color={hdr(accent, 1.8)} transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <group position={[pad.pxz[0], 0, pad.pxz[1]]}>
          <RoundedBox args={[0.34, 0.04, 0.34]} radius={0.012} smoothness={3} position={[0, pad.ph, 0]} material={MAT.dark} />
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} position={[sx * 0.13, pad.ph / 2, sz * 0.13]} material={MAT.alu}>
              <cylinderGeometry args={[0.012, 0.012, pad.ph, 10]} />
            </mesh>
          ))}
          <mesh position={[0, pad.ph + 0.022, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.1, 0.115, 40]} />
            <meshBasicMaterial color={hdr('#3EE0A4', 1.6)} transparent opacity={0.55} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
        </group>

      </group>

      {/* ―― 多机协同：三台 AGV ――
          编队住世界坐标（地板）：臂上桌后缩放组里塞不下移动底盘 ——
          AGV 不是臂的配件，是实验室的。
          到臂底座的三条 FlowBeam 链路已删（用户：去掉设备之间的连线）：
          swarm 的调度语义由三车同场巡回自己演，拉线只会把画面切碎 */}
      <group>
        {AGV_PARK.map((_, i) => (
          /* name 是给探针挂的：tmp/agv-sweep.mjs 要读三台车的实际世界坐标
             量两两间距（验「不穿模」），没名字就只能拿公式复算对不上实机 */
          <group key={i} name={`agv-${i}`} ref={(el) => { agvs.current[i] = el }} visible={false}>
            <Agv accent={accent} i={i} />
          </group>
        ))}
      </group>

      {/* 工序 02 的 conduit（臂座→人形台的地面线槽）与它的脉冲流光整条已删：
          用户反馈设备之间的连线让画面变复杂 —— 先铺线后进设备的叙事
          交给台缘灯带与地面光池点亮去演，不拉可见的线 */}
      {/* 工序 06 联调不再拉臂→胸口的直线：分镜里它就是一根斜穿画面的
          stray wire（「接错地方的电线」）。联调靠扫描环 + 胸芯点亮演，
          不靠一根线 —— 两个机器人在对话，不需要看得见的那根线 */}

      {showRes ? (
        <Suspense fallback={null}>
          <Ready onReady={() => setResIn(true)} />
          <LabResidents />
        </Suspense>
      ) : null}

      {/* ―― 可点设备：人形与桌面臂 ――
          代理盒带容差：桌面上那堆小零件直接当拾取靶，十次有八次会射空 */}
      <DevicePick id="human" position={[HUMAN[0], 0.8, HUMAN[2]]} size={[0.8, 1.6, 0.8]} ring={0.8} ringY={-0.76} accent={accent} />
      <DevicePick id="arm" position={[CELL[0], CELL[1] + 0.7, CELL[2]]} size={[1.0, 1.15, 1.0]} ring={0.5} ringY={-0.695} accent={accent} />

      {sparkles && (
        <Sparkles count={16} scale={[4.6, 2.8, 4.6]} position={[0.3, 1.4, -0.4]} size={1.05} speed={0.16} opacity={0.12} color="#9FCAFF" />
      )}
    </group>
  )
}

