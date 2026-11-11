import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildClock } from './buildBus'
import { THEME } from '../../../theme'

/* ============================================================
 * 实验室环境层（三屏共用的"世界"）
 * ------------------------------------------------------------
 * 参照公司真实交付的高校实验室产品图（public/images/d_lab.png）重排：
 * 那间实验室读得出"高校"二字，靠的不是设备多，而是空间结构 ——
 *   · 中央演示岛：机器人站在抬起来的台面上，四周是标线；
 *   · 两列学生桌：显示器亮着，朝演示岛与视频墙；
 *   · 一面 LED 视频墙 + 两根柱屏：墙上在跑东西，间才是活的；
 *   · 天花桁架与桥架：抬头是机房，不是黑洞；
 *   · 储物架 / 工具柜 / 动捕立杆：边角有"有人在用"的痕迹。
 * 上一版只有天花灯 + 隔断 + 三个工位 + 两台机柜，相机一动就是黑洞 ——
 * 「太简陋」说的就是这个：没有间，只有件。
 *
 * 性能边界不变：整层静态件合并成 frame / panel / glow / screen 四个桶，
 * 加视频墙与贴花共 ~6 个 draw call。消融实测过：这台机器上贵的是提交次数。
 * 合并件没有独立 node，所以巡逻 AMR 与动捕镜头这类"要动的"单独画。
 *
 * 颜色不跟主题色走：一间实验室的墙漆不会因为你切了业务屏就换色，
 * 而跟着 accent 就意味着每次切屏重建合并几何体 —— 那是切屏时的一次尖峰。
 * ============================================================ */

const STRIP_Z = [-4.5, -7.5, -10.5, -13.5]
/* 学生桌两列四排：放在演示岛后面、玻璃隔断前面 ——
   DOM 文案占左 42%、遥测看板占右 29%，可见 3D 窗口只有中间一条；
   桌列摆两侧永远在窗口外读作“背景黑块”，摆岛后才能整排进窗口 */
const BENCH_COLS = [-1.6, -0.2, 1.2, 2.6]
const BENCH_ROWS = [-3.1, -4.2]
const MULLION_X = [-7, -4.9, -2.8, 2.6, 5.6]
const RACK_X = [-6.4, 6.9]
/* 原先前两档颜色是 accent，现在钉死成机房冷白蓝 */
const LAB_ACCENT = THEME.sky
/* 演示岛：人形 + 机械臂站的那块抬高地台（_flush_ 只抬 3cm，不顶脚） */
const ISLE = { c: [0.3, -0.25], w: 4.4, d: 2.4 }
/* 机柜后墙：链屏/AI 屏的“房间尽头”是一排面朝相机的机柜 + 它头上的视频墙 ——
   侧列机柜在可见窗口外永远读作黑块，后墙整排进窗口，
   门上的 LED 列正对镜头：机房的第一信号是“设备成行”，不是“两侧有黑块” */
const CAB_BACK_X = [-2.4, -1.2, 0, 1.2, 2.4]

const MAT = {
  frame: new THREE.MeshStandardMaterial({ color: '#0b111a', roughness: 0.62, metalness: 0.42 }),
  panel: new THREE.MeshStandardMaterial({ color: '#141d29', roughness: 0.5, metalness: 0.55 }),
  /* 学生桌台面：白桌是参考图里最强的"教学"信号，深色桌上读不出屏幕光 */
  desk: new THREE.MeshStandardMaterial({ color: '#c9d4df', roughness: 0.38, metalness: 0.08, envMapIntensity: 0.7 }),
  glass: new THREE.MeshStandardMaterial({ color: '#9fc4ff', transparent: true, opacity: 0.045, roughness: 0.1, metalness: 0.2 }),
  /* 演示岛台面：纯哑光黑漆。frame 的 metalness 0.42 在水平面上会把
     天花 Lightformer 整块反进来（分镜实测一片灰），向上的面必须零金属 */
  isle: new THREE.MeshStandardMaterial({ color: '#0d141c', roughness: 0.9, metalness: 0.0, envMapIntensity: 0.25 }),
  /* 所有自发光件共用：顶点色 + 顶点 alpha，toneMapped=false 才过得了 Bloom 阈值。
     fog 关掉：自发光不该被距离雾吃掉 —— 实测 fog 8~21 把远排天花灯压成灰板，
     灯是光源，光源在雾里应该更清楚而不是更灰 */
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }),
  wall: new THREE.MeshBasicMaterial({ color: '#060b12' }),
}

const _m4 = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _eu = new THREE.Euler()
const _pv = new THREE.Vector3()
const _sv = new THREE.Vector3()

/** 把一件零件的变换烘进几何体：合并以后没有 node 可以挂 transform 了 */
function place(geo, position = [0, 0, 0], rotation = [0, 0, 0]) {
  _eu.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0)
  _q.setFromEuler(_eu)
  _pv.set(position[0] || 0, position[1] || 0, position[2] || 0)
  _sv.set(1, 1, 1)
  geo.applyMatrix4(_m4.compose(_pv, _q, _sv))
  return geo
}

const box = (size, position, rotation) => place(new THREE.BoxGeometry(...size), position, rotation)
const cyl = (args, position, rotation) => place(new THREE.CylinderGeometry(...args), position, rotation)
/** 把自发光色烘进任意几何体的顶点色：不限于平面 ——
    圆台座边环、投影锥光这些曲面件也要进 glow 桶 */
function glowGeo(geo, hex, { mul = 1, opacity = 1 } = {}) {
  const c = new THREE.Color(hex)
  if (mul !== 1) c.multiplyScalar(mul)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 4)
  for (let i = 0; i < n * 4; i += 4) {
    arr[i] = c.r
    arr[i + 1] = c.g
    arr[i + 2] = c.b
    arr[i + 3] = opacity
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 4))
  return geo
}
/** 一块自发光面板：颜色与透明度直接烘进顶点色 */
function glow(size, position, hex, { mul = 1, opacity = 1, rotation = [0, 0, 0] } = {}) {
  return glowGeo(place(new THREE.PlaneGeometry(...size), position, rotation), hex, { mul, opacity })
}

/* ============================================================
 * 两张 canvas 纹理：视频墙的 UI 与地面标线
 * ------------------------------------------------------------
 * 不用图片资源：标线与屏内容都是"字与色块"，canvas 画一次比拉一张
 * 设计稿更可控（字号、对齐、配色都能跟站点走），也少一个网络请求。
 * ============================================================ */

/** 视频墙 / 柱屏共用的屏面纹理：纯图形数据面板，字全部去掉 ——
    墙上出现大字就和 DOM 标题打架（两个“标题”互抢第一视觉，
    分镜里“具身智能实验室”七个字被文案压住一半，读起来是叠字错误）。
    ―― 三间房三张图（用户：根据不同业务定制不同背景墙）
    旧版三屏共用一张图只换一个 seed 相位：切屏时墙上的东西没跟着换业务，
    读作“同一张壁纸搬进三间房”。现在每间房画自己那一行的读数：
    具身 = 关节条 / 轨迹样条 / 激光极坐标 / 臂骨架，
    链 = 区块列表 / 共识环 / TPS 柱列，AI = 注意力热力 / 收敛曲线 / 掌握漏斗。
    配色也各走各的 accent（墙不跟主题色走的是漆，不是屏上的数据）。
    代价为零：三张纹理本来就是按 variant 各自缓存的，draw call 一个不多 */
const WALL_SEED = { embodied: 1, chain: 2, ai: 3 }
const WALL_INK = {
  embodied: { bg: '#04101f', grid: 'rgba(95,168,255,0.07)', line: 'rgba(95,168,255,0.4)', wash: 'rgba(8,22,40,0.72)', soft: 'rgba(95,168,255,0.16)', a: THEME.sky, b: '#2DD4BF' },
  /* 链屏的墙墨跟主题色一起换成琥珀金：墙上那些区块列表 / TPS 柱列
     是屏上的数据，不是漆 —— 业务换色而墙还是薄荷绿，就是两套路灯装在同一个房间里。
     b 从原来的冷蓝换成更淡的一档，给金墙留一个能喘气的互补色 */
  chain: { bg: '#0f0a04', grid: 'rgba(242,183,92,0.07)', line: 'rgba(242,183,92,0.36)', wash: 'rgba(28,19,7,0.72)', soft: 'rgba(242,183,92,0.14)', a: '#F2B75C', b: '#8FC4FF' },
  ai: { bg: '#0a1b36', grid: 'rgba(37,212,255,0.1)', line: 'rgba(37,212,255,0.46)', wash: 'rgba(10,28,56,0.7)', soft: 'rgba(37,212,255,0.18)', a: THEME.ice, b: THEME.sky },
}
/* 确定性伪随机：同一个 variant 每次刷新画出来是同一张图 ——
   拿 Math.random 的话切一屏回来墙上东西全变了，读作贴图而不是读数 */
function rng(seed) {
  let s = seed * 7919 + 13
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
}

/** 具身屏：机器人仿真软件的一个工作区（用户：背景墙 UI 不符合产品，改成机器人仿真软件的页面）
    旧版画的是「运控读数」：一列关节条 + 一扇激光极坐标 + 一台臂骰架 ——
    三块都是散点图，拼在一起不像一台在跑的软件，像一块仪表盘壁纸。
    现在按真仿真器（Gazebo / Isaac Sim / Webots 那一类）的三栏工作区画：
    左 = 3D 视口（透视地网 + 被选中的机器 + 激光扇 + 轨迹样条 + 坐标纽），
    中 = 关节控制列 + 多通道示波器，右 = 场景树 + 属性行 + 仿真时间轴与走带控件。
    依旧一个字都不写（理由见上方 labScreenTexture）：标题用短横条占位，
    图标用几何形 —— 播放三角 / 暂停双竖条 / 展开三角，这三个形状本身就读作软件 */
function wallEmbodied(g, ink, panel, rand) {
  /* 三栏的位置：视口放中栏、关节列放左栏。两块代码各按自己那一栏的坐标写死，
     这里只换绘制原点（±320 = 整栏平移，两栏同为 300px 宽的面板）。
     为什么要换：视口是「这是一台仿真软件」最强的信号，而墙左三分之一
     在 1440 宽下正好被 DOM 标题与段落压住（w3-wall-0 实测：视口只剩右半边读得出）*/
  g.save()
  g.translate(320, 0)
  /* ―― 中：仿真视口 ――
     透视地网是这块屏的身份牌：没有它，中间的机器就是一张贴在蓝底上的贴纸 */
  panel(40, 52, 300, 284)
  const vx = 186
  const vy = 142
  g.save()
  g.beginPath()
  g.rect(42, 54, 296, 280)
  g.clip()
  g.strokeStyle = ink.grid
  g.lineWidth = 1
  for (let i = -7; i <= 7; i++) {
    // 纵线：从消失点射到视口下缘
    g.beginPath()
    g.moveTo(vx + i * 7, vy)
    g.lineTo(vx + i * 52, 336)
    g.stroke()
  }
  for (let k = 1; k <= 9; k++) {
    // 横线：间距按透视压缩（k^1.9）—— 等距就成了一张地砖，不是地面
    const y = vy + (336 - vy) * (k / 9) ** 1.9
    g.beginPath()
    g.moveTo(42, y)
    g.lineTo(338, y)
    g.stroke()
  }
  /* 轨迹样条：车走过的路。虚线 + 三个路点，仿真器里叫 path / waypoint */
  g.strokeStyle = ink.b
  g.lineWidth = 2
  g.setLineDash([8, 6])
  g.beginPath()
  g.moveTo(56, 322)
  g.bezierCurveTo(96, 306, 108, 268, 152, 258)
  g.stroke()
  g.setLineDash([])
  g.fillStyle = ink.b
  for (const [x, y] of [[56, 322], [104, 288], [152, 258]]) {
    g.beginPath()
    g.arc(x, y, 3.4, 0, Math.PI * 2)
    g.fill()
  }
  /* ―― 被选中的四足机器（与岛上那台狗同构：机身 + 四条两段腿 + 头）――
     视口里的机器得是线框/壳面而不是真渲染：仿真器的 viewport 在远景里
     读作的就是「一个有顶面与侧面的体块 + 关节圆点」 */
  const bx = 196
  const by = 214
  const w = 44
  const h = 15
  const d = 12
  g.fillStyle = 'rgba(0,0,0,0.45)' // 接触阴影：没它机器就是浮着的
  g.beginPath()
  g.ellipse(bx + 4, by + 44, 54, 11, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#9dc0e6'
  g.lineWidth = 3.4
  g.lineCap = 'round'
  for (const [dx, dz, ph] of [[-26, 7, -0.5], [-15, -7, 0.45], [23, 8, 0.25], [13, -7, -0.6]]) {
    const hx = bx + dx
    const hy = by + 12 + dz * 0.5
    const kx = hx + ph * 13
    const ky = hy + 15
    g.beginPath()
    g.moveTo(hx, hy)
    g.lineTo(kx, ky)
    g.lineTo(hx - ph * 9, ky + 14)
    g.stroke()
  }
  g.fillStyle = '#22405f' // 侧面
  g.beginPath()
  g.moveTo(bx - w, by)
  g.lineTo(bx + w, by)
  g.lineTo(bx + w, by + h)
  g.lineTo(bx - w, by + h)
  g.closePath()
  g.fill()
  g.fillStyle = '#3a6690' // 顶面
  g.beginPath()
  g.moveTo(bx - w, by)
  g.lineTo(bx - w + d, by - d * 0.62)
  g.lineTo(bx + w + d, by - d * 0.62)
  g.lineTo(bx + w, by)
  g.closePath()
  g.fill()
  g.strokeStyle = ink.a
  g.lineWidth = 1.4
  g.strokeRect(bx - w, by, w * 2, h)
  g.fillStyle = '#2b4d70' // 头
  g.fillRect(bx + w + 2, by - 4, 20, 13)
  g.fillStyle = ink.b
  g.fillRect(bx + w + 16, by - 1, 3, 3) // 鱼眼相机：一个亮点就够
  /* 选中框：虚线 + 八个控制点 —— 仿真器里「选了哪个物体」全靠这个 */
  g.strokeStyle = ink.b
  g.lineWidth = 1.3
  g.setLineDash([5, 4])
  g.strokeRect(bx - 62, by - 44, 148, 96)
  g.setLineDash([])
  g.fillStyle = ink.b
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 2; k++) g.fillRect(bx - 64 + i * 49, by - 46 + k * 94, 4, 4)
  /* 激光扇：从机头往右前扫一扇，带几条射线与命中点 */
  const lx = bx + w + 22
  const ly = by + 4
  const fan = g.createRadialGradient(lx, ly, 4, lx, ly, 78)
  fan.addColorStop(0, 'rgba(62,224,164,0.30)')
  fan.addColorStop(1, 'rgba(62,224,164,0)')
  g.fillStyle = fan
  g.beginPath()
  g.moveTo(lx, ly)
  g.arc(lx, ly, 78, 0.22, 1.24)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(62,224,164,0.5)'
  g.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const a = 0.22 + (i / 5) * 1.02
    const r = 40 + rand() * 34
    g.beginPath()
    g.moveTo(lx, ly)
    g.lineTo(lx + Math.cos(a) * r, ly + Math.sin(a) * r)
    g.stroke()
    g.fillStyle = ink.b
    g.fillRect(lx + Math.cos(a) * r - 1.5, ly + Math.sin(a) * r - 1.5, 3, 3)
  }
  /* 视口三件小东西：左上相机角标 + 右下坐标纽（仿真 viewport 的标配）*/
  g.strokeStyle = 'rgba(234,244,255,0.5)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(52, 74)
  g.lineTo(52, 64)
  g.lineTo(62, 64)
  g.moveTo(328, 64)
  g.lineTo(318, 64)
  g.moveTo(52, 312)
  g.lineTo(52, 322)
  g.lineTo(62, 322)
  g.stroke()
  const gz = [298, 306]
  g.lineWidth = 2.4
  g.strokeStyle = '#ff6b7a'
  g.beginPath(); g.moveTo(gz[0], gz[1]); g.lineTo(gz[0] + 15, gz[1] + 5); g.stroke()
  g.strokeStyle = '#5fe08a'
  g.beginPath(); g.moveTo(gz[0], gz[1]); g.lineTo(gz[0] - 2, gz[1] - 16); g.stroke()
  g.strokeStyle = THEME.sky
  g.beginPath(); g.moveTo(gz[0], gz[1]); g.lineTo(gz[0] - 13, gz[1] + 9); g.stroke()
  g.restore() // 解 clip
  g.restore() // 解视口的栏平移

  /* ―― 左：关节控制列 + 多通道示波器 ――
     这一栏是「软件在驱这台机器」的证据：每行一个轴，手柄位置就是当前角度 */
  g.save()
  g.translate(-320, 0)
  panel(360, 52, 300, 284)
  for (let i = 0; i < 9; i++) {
    const y = 72 + i * 15
    g.fillStyle = ink.soft
    g.fillRect(374, y - 2, 44, 5) // 轴名占位
    g.fillStyle = 'rgba(255,255,255,0.10)'
    g.fillRect(428, y, 128, 3) // 轨道
    const v = 0.16 + rand() * 0.68
    const kx = 428 + v * 128
    g.fillStyle = i === 2 ? ink.b : ink.a
    g.fillRect(428, y, kx - 428, 3)
    g.beginPath() // 手柄：第 3 行那个亮绿 = 正在拖的这一轴
    g.arc(kx, y + 1.5, 3.6, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = ink.line
    g.fillRect(566, y - 2, 32, 5) // 数值占位
  }
  g.fillStyle = 'rgba(0,0,0,0.34)' // 示波器底
  g.fillRect(372, 218, 276, 108)
  g.strokeStyle = ink.grid
  g.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    g.beginPath(); g.moveTo(372, 218 + i * 27); g.lineTo(648, 218 + i * 27); g.stroke()
  }
  for (let i = 1; i < 8; i++) {
    g.beginPath(); g.moveTo(372 + i * 34.5, 218); g.lineTo(372 + i * 34.5, 326); g.stroke()
  }
  const wave = (y0, amp, f, col, ph) => {
    g.strokeStyle = col
    g.lineWidth = 1.8
    g.beginPath()
    for (let i = 0; i <= 88; i++) {
      const x = 374 + i * 3.1
      const y = y0 + Math.sin(i * f + ph) * amp * (0.55 + 0.45 * Math.sin(i * 0.055 + ph))
      i ? g.lineTo(x, y) : g.moveTo(x, y)
    }
    g.stroke()
  }
  wave(240, 11, 0.34, ink.a, 0)
  wave(268, 8, 0.52, ink.b, 1.7)
  wave(298, 14, 0.21, 'rgba(224,196,106,0.85)', 3.1)
  g.strokeStyle = 'rgba(234,244,255,0.55)' // 游标：采样到的这一列
  g.lineWidth = 1.4
  g.beginPath()
  g.moveTo(556, 218)
  g.lineTo(556, 326)
  g.stroke()
  g.restore() // 解关节栏的平移

  /* ―― 右：场景树 + 属性 + 仿真时间轴 ――
     场景树与走带控件是仿真器最认得的两个东西，放同一栏里互相证实 */
  panel(680, 52, 300, 284)
  const depth = [0, 1, 1, 2, 1, 0, 1, 1]
  for (let i = 0; i < 8; i++) {
    const y = 70 + i * 15
    const x = 700 + depth[i] * 15
    if (i === 4) {
      g.fillStyle = 'rgba(95,168,255,0.16)' // 选中行：树里选了哪一台
      g.fillRect(692, y - 4, 268, 13)
    }
    if (depth[i]) {
      g.fillStyle = ink.line
      g.fillRect(x - 12, y + 2, 9, 1) // 缩进引导线
    }
    g.fillStyle = depth[i] === 2 ? ink.line : ink.a
    g.beginPath() // 展开三角
    g.moveTo(x - 9, y - 1)
    g.lineTo(x - 2, y + 3)
    g.lineTo(x - 9, y + 7)
    g.closePath()
    g.fill()
    g.fillStyle = i === 4 ? ink.b : ink.soft
    g.fillRect(x, y - 1, 8, 8) // 物体图标
    g.fillStyle = i === 4 ? ink.b : ink.line
    g.fillRect(x + 14, y + 1, 52 + ((i * 23) % 58), 4) // 名字占位
  }
  for (let i = 0; i < 4; i++) {
    // 属性行：质量 / 摩擦 / 控制周期 / 步长 —— 物理参数面板的样子
    const y = 196 + i * 13
    g.fillStyle = ink.soft
    g.fillRect(700, y, 58, 4)
    g.fillStyle = i === 1 ? ink.b : ink.a
    g.fillRect(772, y, 40 + ((i * 31) % 52), 4)
    g.fillStyle = ink.line
    g.fillRect(900, y, 40, 4)
  }
  /* 仿真时间轴：轨道 + 已播段 + 刻度 + 播放头 + 走带控件 */
  g.fillStyle = 'rgba(255,255,255,0.10)'
  g.fillRect(700, 268, 252, 4)
  g.fillStyle = ink.a
  g.fillRect(700, 268, 162, 4)
  g.fillStyle = ink.line
  for (let i = 0; i <= 9; i++) g.fillRect(700 + i * 28, 262, 2, 7)
  g.fillStyle = ink.b // 关键帧
  for (const k of [28, 90, 134, 162]) g.fillRect(700 + k, 260, 4, 11)
  g.beginPath() // 播放头：一个倒三角 + 一根针
  g.moveTo(856, 258)
  g.lineTo(864, 258)
  g.lineTo(860, 265)
  g.closePath()
  g.fill()
  g.fillRect(859, 265, 2, 12)
  g.fillStyle = 'rgba(0,0,0,0.32)' // 走带条
  g.fillRect(700, 288, 252, 40)
  g.strokeStyle = ink.b
  g.lineWidth = 1.6
  g.fillStyle = ink.b
  g.beginPath() // 播放三角
  g.moveTo(716, 300)
  g.lineTo(734, 308)
  g.lineTo(716, 316)
  g.closePath()
  g.fill()
  g.fillStyle = ink.a
  g.fillRect(748, 300, 4, 16) // 暂停双竖条
  g.fillRect(756, 300, 4, 16)
  g.beginPath() // 单步：竖条 + 三角
  g.moveTo(776, 300)
  g.lineTo(780, 300)
  g.lineTo(780, 316)
  g.lineTo(776, 316)
  g.closePath()
  g.fill()
  g.beginPath()
  g.moveTo(784, 302)
  g.lineTo(798, 308)
  g.lineTo(784, 314)
  g.closePath()
  g.fill()
  g.fillStyle = ink.soft
  g.fillRect(816, 306, 118, 5) // 时长/步数占位
  g.fillStyle = ink.a
  g.fillRect(816, 306, 74, 5)
  g.strokeStyle = ink.line
  g.lineWidth = 1.2
  g.strokeRect(700, 288, 252, 40)
}

/** 链屏：浏览器列表 + 共识环 + 吞吐柱列 */
function wallChain(g, ink, panel, rand) {
  panel(40, 52, 300, 284)
  for (let i = 0; i < 8; i++) {
    const y = 66 + i * 34
    g.fillStyle = i === 0 ? ink.a : ink.wash
    g.fillRect(56, y, 20, 20)
    g.strokeStyle = ink.line
    g.lineWidth = 1.4
    g.strokeRect(56, y, 20, 20)
    for (let k = 0; k < 6; k++) {
      g.fillStyle = i === 0 && k === 2 ? ink.b : ink.soft
      g.fillRect(86 + k * 33, y + 3, 20 + ((k * 7 + i * 5) % 11), 5) // 哈希纹：短段序列就是哈希的样子
    }
    g.fillStyle = ink.line
    g.fillRect(86, y + 14, 190, 3)
    g.fillStyle = i === 0 ? ink.a : ink.soft
    g.fillRect(86, y + 14, 44 + ((i * 29) % 148), 3)
  }
  panel(360, 52, 300, 284)
  const cx = 510
  const cy = 196
  const R = 104
  const pts = [...Array(6)].map((_, i) => {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2
    return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]
  })
  g.strokeStyle = ink.soft
  g.lineWidth = 1.4
  for (let i = 0; i < 6; i++)
    for (let k = i + 1; k < 6; k++) {
      g.beginPath()
      g.moveTo(pts[i][0], pts[i][1])
      g.lineTo(pts[k][0], pts[k][1])
      g.stroke()
    }
  g.strokeStyle = ink.a
  g.lineWidth = 2.6
  g.beginPath() // 环上一段亮弧：本轮出块走到的那一条
  g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI / 3)
  g.stroke()
  pts.forEach(([x, y], i) => {
    if (i === 0) {
      g.strokeStyle = ink.b
      g.lineWidth = 2
      g.beginPath()
      g.arc(x, y, 20, 0, Math.PI * 2)
      g.stroke() // leader 外圈：只有一个节点在打包
    }
    /* 3 号节点只留两成亮度：它是这一轮还没跟上来的那个 follower ——
       六个节点一样亮就只是花环，差一档才读作「在同步」 */
    g.fillStyle = i === 0 ? ink.b : i === 3 ? 'rgba(124,240,208,0.2)' : ink.a
    g.fillRect(x - 10, y - 10, 20, 20)
    g.strokeStyle = ink.line
    g.lineWidth = 1.4
    g.strokeRect(x - 10, y - 10, 20, 20)
  })
  g.fillStyle = ink.a
  for (let i = 0; i < 3; i++) g.fillRect(cx - 26 + i * 20, cy - 4, 14, 8) // 中心：一小节链
  panel(680, 52, 300, 284)
  let sum = 0
  const bars = [...Array(20)].map(() => 34 + Math.round(rand() * 158))
  bars.forEach((h) => (sum += h))
  bars.forEach((h, i) => {
    g.fillStyle = i % 5 === 4 ? ink.b : ink.a
    g.fillRect(698 + i * 14, 302 - h, 9, h)
  })
  const avg = sum / bars.length
  g.strokeStyle = 'rgba(224,196,106,0.85)'
  g.lineWidth = 1.6
  g.setLineDash([7, 5]) // 均值虚线：柱列没这条就只是花纹
  g.beginPath()
  g.moveTo(694, 302 - avg)
  g.lineTo(976, 302 - avg)
  g.stroke()
  g.setLineDash([])
  g.fillStyle = '#eaf4ff'
  g.beginPath()
  g.arc(966, 302 - Math.max(...bars), 4, 0, Math.PI * 2)
  g.fill()
}

/** AI 屏的背景墙：知识图谱 + 数据流 + 产业产线
    ------------------------------------------------------------
 * 换掉上一版的 9×9 注意力热力格：30px 的方格画在 7.2m 宽的大屏上，
 * 隔着玻璃斜看就是一片紫色马赛克，远看只剩"廉价的像素噪点"。
 * 这一版改画三样业务里真有的图形语言：
 * 1. 左右两簇知识图谱（节点 + 细连线 + 中央枢纽）—— 对应课程/学科的知识网络；
 * 2. 两条横贯屏面的数据流（贝塞尔带 + 脉冲点）—— 对应教学数据在链路里跑；
 * 3. 底边四段产线（采集 → 治理 → 分析 → 决策）—— 五大方案共用的那条主线。
 * 全部是矢量粗线、冷色低对比：墙在展板后面，任务是给纵深，不抢主体。
 * 不写字 —— 后景里任何小字都会被透视缩成噪点，读节奏比读字有用。 */
function wallAi(g) {
  const W = 1024
  const H = 384

  /* ―― 底：品牌深蓝渐变 + 中央冷光。远墙先要"亮得有层次"，不能是一块黑 ―― */
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0c1b38')
  bg.addColorStop(0.55, '#071127')
  bg.addColorStop(1, '#040a14')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  const halo = g.createRadialGradient(500, 150, 24, 500, 150, 360)
  halo.addColorStop(0, 'rgba(95,168,255,0.28)')
  halo.addColorStop(0.5, 'rgba(95,168,255,0.10)')
  halo.addColorStop(1, 'rgba(95,168,255,0)')
  g.fillStyle = halo
  g.fillRect(0, 0, W, H)

  /* ―― 稀疏经纬线：64px 一格、0.07 —— 给"这是一块屏"的尺度感，不做棋盘 ―― */
  g.strokeStyle = 'rgba(120,180,255,0.07)'
  g.lineWidth = 1
  for (let x = 0; x <= W; x += 64) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, H)
    g.stroke()
  }
  for (let y = 0; y <= H; y += 64) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(W, y)
    g.stroke()
  }

  /* ―― 知识图谱：左右各一簇，坐标写死（每块屏、每次刷新都同一张图）―― */
  const clusters = [
    [[98, 96], [188, 62], [286, 108], [120, 196], [216, 168], [300, 236], [150, 292]],
    [[926, 104], [836, 60], [738, 112], [904, 200], [806, 172], [724, 240], [872, 292]],
  ]
  const links = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 2], [3, 6], [4, 5], [6, 4]]
  g.lineWidth = 1.3
  clusters.forEach((nodes) => {
    g.strokeStyle = 'rgba(122,178,255,0.26)'
    links.forEach(([a, b]) => {
      g.beginPath()
      g.moveTo(nodes[a][0], nodes[a][1])
      g.lineTo(nodes[b][0], nodes[b][1])
      g.stroke()
    })
    nodes.forEach(([x, y], i) => {
      const big = i === 4
      g.fillStyle = big ? 'rgba(170,212,255,0.95)' : 'rgba(95,168,255,0.6)'
      g.beginPath()
      g.arc(x, y, big ? 6.5 : 4, 0, Math.PI * 2)
      g.fill()
      if (big) {
        g.strokeStyle = 'rgba(95,168,255,0.42)'
        g.lineWidth = 1.4
        g.beginPath()
        g.arc(x, y, 12, 0, Math.PI * 2)
        g.stroke()
      }
    })
  })

  /* ―― 中央枢纽：左右两簇都收束到这一点（多智能体共享同一套知识）―― */
  g.strokeStyle = 'rgba(150,200,255,0.34)'
  g.lineWidth = 1.6
  ;[270, 742].forEach((x) => {
    g.beginPath()
    g.moveTo(x, 168)
    g.quadraticCurveTo(512, 92, 512, 150)
    g.stroke()
  })
  g.fillStyle = 'rgba(235,245,255,0.92)'
  g.beginPath()
  g.arc(512, 150, 8, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(95,168,255,0.46)'
  g.lineWidth = 1.4
  ;[16, 28].forEach((r) => {
    g.beginPath()
    g.arc(512, 150, r, 0, Math.PI * 2)
    g.stroke()
  })

  /* ―― 数据流：两条横贯屏面，方向"从左到右"远看也成立 ―― */
  const flow = (y0, alpha, dash) => {
    g.strokeStyle = `rgba(95,168,255,${alpha})`
    g.lineWidth = 2.2
    if (dash) g.setLineDash([14, 10])
    g.beginPath()
    g.moveTo(24, y0)
    g.bezierCurveTo(240, y0 - 66, 404, y0 + 34, 566, y0 - 20)
    g.bezierCurveTo(722, y0 - 72, 880, y0 + 30, 1000, y0 - 24)
    g.stroke()
    if (dash) g.setLineDash([])
  }
  flow(244, 0.5, false)
  flow(270, 0.24, true)

  /* 脉冲点：落在流线上，静态提示"数据在跑"（零每帧开销）*/
  ;[
    [180, 214, 3.6, 0.9],
    [356, 262, 2.6, 0.58],
    [520, 226, 4.2, 0.95],
    [700, 220, 2.8, 0.6],
    [872, 258, 3.4, 0.84],
  ].forEach(([x, y, r, a]) => {
    g.fillStyle = `rgba(212,236,255,${a})`
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = `rgba(95,168,255,${a * 0.42})`
    g.lineWidth = 1.2
    g.beginPath()
    g.arc(x, y, r * 2.6, 0, Math.PI * 2)
    g.stroke()
  })

  /* ―― 底边产线：四段同宽、向右渐亮，段内一枚向右的 chevron ―― */
  const segs = 4
  const sw = 176
  const gap = 20
  for (let i = 0; i < segs; i++) {
    const x = 132 + i * (sw + gap)
    g.fillStyle = `rgba(95,168,255,${0.12 + i * 0.05})`
    g.strokeStyle = `rgba(95,168,255,${0.26 + i * 0.06})`
    g.lineWidth = 1.4
    g.beginPath()
    g.moveTo(x + 8, 330)
    g.lineTo(x + sw - 10, 330)
    g.lineTo(x + sw, 340)
    g.lineTo(x + sw - 10, 350)
    g.lineTo(x + 8, 350)
    g.lineTo(x, 340)
    g.closePath()
    g.fill()
    g.stroke()
    g.strokeStyle = `rgba(215,238,255,${0.4 + i * 0.1})`
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(x + sw / 2 - 8, 334)
    g.lineTo(x + sw / 2 + 2, 339)
    g.lineTo(x + sw / 2 - 8, 344)
    g.stroke()
  }
}

/* ―― 墙上的"正在运行的研发空间"：三块屏幕 —— 代码编辑器 / K 线 / 走势+指标 ――
   叠在上面那层网格与数据流上，做成一组错落的窗口：
   1. 左：代码编辑器（行号槽、语法高亮、当前行高亮 + 光标）—— 研发空间；
   2. 中：K 线面板（蜡烛 + 均线 + 成交量 + 报价牌）—— 金融科技；
   3. 右：折线/面积走势 + 两枚指标卡 + 一条进度条 —— 数据看板。
   窗口底色 0.90 不透明度：底下的图谱与流线只作若隐若现的衬底，
   既给"机器在跑"的密度，又不会和前景五块展板抢焦点。
   全部画在一次初始化里（纹理缓存），运行期零开销。 */
function wallDemos(g) {
  const CODE = {
    kw: 'rgba(127,180,255,0.95)',
    id: 'rgba(214,232,255,0.92)',
    fn: 'rgba(95,224,200,0.95)',
    str: 'rgba(255,196,106,0.92)',
    num: 'rgba(255,176,140,0.92)',
    prop: 'rgba(156,192,255,0.85)',
    cm: 'rgba(110,130,160,0.8)',
    tx: 'rgba(168,190,220,0.85)',
  }
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  const rr = (x, y, w, h, r) => {
    g.beginPath()
    g.moveTo(x + r, y)
    g.arcTo(x + w, y, x + w, y + h, r)
    g.arcTo(x + w, y + h, x, y + h, r)
    g.arcTo(x, y + h, x, y, r)
    g.arcTo(x, y, x + w, y, r)
    g.closePath()
  }
  const card = (x, y, w, h, labelW) => {
    g.fillStyle = 'rgba(8,18,34,0.9)'
    rr(x, y, w, h, 8)
    g.fill()
    g.strokeStyle = 'rgba(120,180,255,0.30)'
    g.lineWidth = 1
    g.stroke()
    g.fillStyle = 'rgba(127,184,255,0.09)'
    rr(x + 1, y + 1, w - 2, 15, 7)
    g.fill()
    ;[THEME.sky, 'rgba(47,123,255,0.85)', 'rgba(37,212,255,0.85)'].forEach((c, i) => {
      g.fillStyle = c
      g.beginPath()
      g.arc(x + 11 + i * 11, y + 8, 2.6, 0, Math.PI * 2)
      g.fill()
    })
    g.fillStyle = 'rgba(160,196,240,0.26)'
    g.fillRect(x + 48, y + 5, labelW, 5)
    g.fillStyle = 'rgba(95,168,255,0.45)'
    g.fillRect(x + 48, y + 5, labelW * 0.4, 5)
  }
  const blk = (x, y, w, h, c = 'rgba(150,186,230,0.35)') => {
    g.fillStyle = c
    g.fillRect(x, y, w, h)
  }

  /* 三团冷光：先铺在窗口下面，让每块屏"亮起来"而不是贴上去 */
  ;[
    [200, 190, 190],
    [564, 190, 160],
    [872, 190, 150],
  ].forEach(([x, y, r]) => {
    const gr = g.createRadialGradient(x, y, 8, x, y, r)
    gr.addColorStop(0, 'rgba(95,168,255,0.16)')
    gr.addColorStop(1, 'rgba(95,168,255,0)')
    g.fillStyle = gr
    g.fillRect(x - r, y - r, r * 2, r * 2)
  })

  /* ―― 1. 代码编辑器 ―― */
  const ax = 32
  const ay = 46
  const aw = 366
  const ah = 292
  card(ax, ay, aw, ah, 120)
  g.fillStyle = 'rgba(255,255,255,0.035)'
  g.fillRect(ax + 1, ay + 17, 26, ah - 30)
  g.strokeStyle = 'rgba(120,180,255,0.14)'
  g.beginPath()
  g.moveTo(ax + 27, ay + 18)
  g.lineTo(ax + 27, ay + ah - 13)
  g.stroke()

  const lines = [
    [['const ', 'kw'], ['lab', 'id'], [' = ', 'tx'], ['await ', 'kw'], ['Agent', 'fn'], ['({', 'tx']],
    [['  model: ', 'prop'], ["'edu-graph'", 'str'], [',', 'tx']],
    [['  agents: ', 'prop'], ['5', 'num'], [',', 'tx']],
    [['  stream: ', 'prop'], ['true', 'num'], [',', 'tx']],
    [['})', 'tx']],
    [],
    [['for ', 'kw'], ['(', 'tx'], ['const ', 'kw'], ['a', 'id'], [' of ', 'kw'], ['agents', 'id'], [') {', 'tx']],
    [['  a.', 'tx'], ['run', 'fn'], ['(', 'tx'], ['lesson', 'id'], [');', 'tx']],
    [['}', 'tx']],
    [],
    [['// 5 agents · 1 graph', 'cm']],
    [['export ', 'kw'], ['default ', 'kw'], ['lab', 'id']],
  ]
  const lh = 17
  lines.forEach((tokens, i) => {
    const y = ay + 36 + i * lh
    g.font = `8px ${MONO}`
    g.fillStyle = 'rgba(140,170,210,0.42)'
    g.textAlign = 'right'
    g.fillText(String(i + 1), ax + 21, y)
    g.textAlign = 'left'
    if (i === 7) {
      g.fillStyle = 'rgba(95,168,255,0.13)'
      g.fillRect(ax + 28, y - 10, aw - 34, 14)
      g.fillStyle = 'rgba(95,168,255,0.7)'
      g.fillRect(ax + 28, y - 10, 2, 14)
    }
    let x = ax + 34
    tokens.forEach(([s, kind]) => {
      g.font = `${kind === 'cm' ? 'italic ' : ''}9px ${MONO}`
      g.fillStyle = CODE[kind]
      g.fillText(s, x, y)
      x += g.measureText(s).width
    })
    if (i === 7) {
      g.fillStyle = 'rgba(235,245,255,0.92)'
      g.fillRect(x + 2, y - 8, 1.5, 10)
    }
  })
  /* 底部状态行：分支 / 编译通过 / 行号——编辑器读作"在跑"的三枚信号 */
  g.font = `8px ${MONO}`
  g.fillStyle = 'rgba(95,224,200,0.7)'
  g.fillText('● ready', ax + 34, ay + ah - 10)
  g.fillStyle = 'rgba(160,196,240,0.4)'
  g.fillText('main', ax + 92, ay + ah - 10)
  g.textAlign = 'right'
  g.fillText('12:7', ax + aw - 12, ay + ah - 10)
  g.textAlign = 'left'

  /* ―― 2. K 线面板 ―― */
  const bx = 414
  const by = 46
  const bw = 300
  const bh = 292
  card(bx, by, bw, bh, 96)
  const px0 = bx + 16
  const py0 = by + 32
  const pw = bw - 40
  const ph = 148
  g.strokeStyle = 'rgba(120,180,255,0.12)'
  g.lineWidth = 1
  for (let i = 1; i <= 4; i++) {
    const y = py0 + (ph / 4) * i
    g.beginPath()
    g.moveTo(px0, y)
    g.lineTo(px0 + pw, y)
    g.stroke()
  }
  const candles = [
    [0.42, 0.58, 0.66, 0.38], [0.55, 0.47, 0.60, 0.42], [0.46, 0.60, 0.64, 0.44],
    [0.58, 0.68, 0.74, 0.52], [0.66, 0.58, 0.72, 0.54], [0.54, 0.44, 0.58, 0.40],
    [0.42, 0.52, 0.58, 0.36], [0.50, 0.64, 0.70, 0.46], [0.62, 0.74, 0.80, 0.58],
    [0.72, 0.66, 0.78, 0.60], [0.64, 0.54, 0.70, 0.50], [0.52, 0.62, 0.68, 0.46],
    [0.60, 0.72, 0.78, 0.54], [0.70, 0.64, 0.76, 0.56], [0.62, 0.56, 0.68, 0.48],
    [0.56, 0.66, 0.72, 0.50],
  ]
  const cw = 16
  candles.forEach(([o, c, hi, lo], i) => {
    const cx = px0 + 10 + i * cw
    const up = c >= o
    const col = up ? 'rgba(47,214,180,0.95)' : 'rgba(255,122,138,0.95)'
    const yh = py0 + ph * (1 - hi)
    const yl = py0 + ph * (1 - lo)
    const yo = py0 + ph * (1 - o)
    const yc = py0 + ph * (1 - c)
    g.strokeStyle = col
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(cx, yh)
    g.lineTo(cx, yl)
    g.stroke()
    g.fillStyle = col
    g.fillRect(cx - 3, Math.min(yo, yc), 6, Math.max(3, Math.abs(yc - yo)))
    /* 成交量：底部一列小柱，跟着涨跌同一支色 */
    blk(cx - 3, by + 214 - (hi - 0.2) * 46, 6, (hi - 0.2) * 46, up ? 'rgba(47,214,180,0.30)' : 'rgba(255,122,138,0.30)')
  })
  /* 均线：四条收盘价的滚动平均，横穿整张图 */
  g.strokeStyle = 'rgba(143,196,255,0.85)'
  g.lineWidth = 1.4
  g.beginPath()
  candles.forEach(([o, c], i) => {
    const win = candles.slice(Math.max(0, i - 3), i + 1)
    const avg = win.reduce((s, [, cl]) => s + cl, 0) / win.length
    const x = px0 + 10 + i * cw
    const y = py0 + ph * (1 - avg)
    i ? g.lineTo(x, y) : g.moveTo(x, y)
  })
  g.stroke()
  /* 报价牌：右上角一枚，数字不必逐字可读，形状与色阶才是信息 */
  g.fillStyle = 'rgba(47,214,180,0.16)'
  rr(px0 + pw - 70, by + 36, 68, 15, 4)
  g.fill()
  g.strokeStyle = 'rgba(47,214,180,0.45)'
  g.stroke()
  g.font = `8px ${MONO}`
  g.fillStyle = 'rgba(120,240,210,0.9)'
  g.fillText('1,284.60', px0 + pw - 64, by + 46)
  g.fillStyle = 'rgba(47,214,180,0.9)'
  g.beginPath()
  g.moveTo(px0 + pw - 14, by + 43)
  g.lineTo(px0 + pw - 9, by + 38)
  g.lineTo(px0 + pw - 4, by + 43)
  g.fill()

  /* ―― 3. 走势 + 指标卡 + 进度条 ―― */
  const cx0 = 730
  const cy0 = 46
  const cw0 = 262
  const ch0 = 292
  card(cx0, cy0, cw0, ch0, 84)
  const gx = cx0 + 14
  const gy = cy0 + 32
  const gw = cw0 - 28
  const gh = 86
  g.strokeStyle = 'rgba(120,180,255,0.12)'
  for (let i = 1; i <= 3; i++) {
    const y = gy + (gh / 3) * i
    g.beginPath()
    g.moveTo(gx, y)
    g.lineTo(gx + gw, y)
    g.stroke()
  }
  const vals = [0.34, 0.46, 0.40, 0.58, 0.50, 0.66, 0.60, 0.74, 0.82]
  const area = (fill) => {
    g.beginPath()
    vals.forEach((v, i) => {
      const x = gx + (gw / (vals.length - 1)) * i
      const y = gy + gh * (1 - v)
      i ? g.lineTo(x, y) : g.moveTo(x, y)
    })
    if (fill) {
      g.lineTo(gx + gw, gy + gh)
      g.lineTo(gx, gy + gh)
      g.closePath()
      const grad = g.createLinearGradient(0, gy, 0, gy + gh)
      grad.addColorStop(0, 'rgba(95,168,255,0.38)')
      grad.addColorStop(1, 'rgba(95,168,255,0.02)')
      g.fillStyle = grad
      g.fill()
    } else {
      g.strokeStyle = 'rgba(143,196,255,0.95)'
      g.lineWidth = 1.6
      g.stroke()
    }
  }
  area(true)
  area(false)
  /* 最新点：白心 + 蓝环，和五块展板的"当前节点"同一套标记 */
  const lastX = gx + gw
  const lastY = gy + gh * (1 - vals[vals.length - 1])
  g.fillStyle = 'rgba(235,245,255,0.95)'
  g.beginPath()
  g.arc(lastX, lastY, 2.6, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(95,168,255,0.6)'
  g.lineWidth = 1
  g.beginPath()
  g.arc(lastX, lastY, 6, 0, Math.PI * 2)
  g.stroke()

  /* 两枚指标卡：数值 + 箭头 + 迷你走势 */
  const tiles = [
    { x: cx0 + 14, w: 112, v: '+12.4%', up: true, spark: [0.3, 0.42, 0.38, 0.5, 0.62, 0.58, 0.7] },
    { x: cx0 + 136, w: 112, v: '98.2%', up: true, spark: [0.5, 0.46, 0.54, 0.58, 0.52, 0.64, 0.68] },
  ]
  tiles.forEach((t, ti) => {
    g.fillStyle = 'rgba(255,255,255,0.03)'
    rr(t.x, cy0 + 132, t.w, 58, 5)
    g.fill()
    g.strokeStyle = 'rgba(120,180,255,0.16)'
    g.lineWidth = 1
    g.stroke()
    blk(t.x + 10, cy0 + 142, 34, 4, 'rgba(160,196,240,0.33)')
    g.font = `600 12px ${MONO}`
    g.fillStyle = ti === 0 ? 'rgba(120,240,210,0.95)' : 'rgba(255,196,106,0.95)'
    g.fillText(t.v, t.x + 10, cy0 + 162)
    g.fillStyle = t.up ? 'rgba(120,240,210,0.8)' : 'rgba(255,122,138,0.8)'
    g.beginPath()
    g.moveTo(t.x + 73, cy0 + 153)
    g.lineTo(t.x + 79, cy0 + 160)
    g.lineTo(t.x + 67, cy0 + 160)
    g.fill()
    g.strokeStyle = t.up ? 'rgba(120,240,210,0.65)' : 'rgba(255,122,138,0.65)'
    g.lineWidth = 1.2
    g.beginPath()
    t.spark.forEach((v, i) => {
      const x = t.x + 10 + (t.w - 20) / (t.spark.length - 1) * i
      const y = cy0 + 180 - v * 14
      i ? g.lineTo(x, y) : g.moveTo(x, y)
    })
    g.stroke()
  })
  /* 进度条：一条轨道 + 72% 的填充 + 刻度 */
  blk(cx0 + 14, cy0 + 208, 120, 4, 'rgba(160,196,240,0.28)')
  rr(cx0 + 14, cy0 + 244, 234, 7, 3.5)
  g.fillStyle = 'rgba(255,255,255,0.08)'
  g.fill()
  const prog = g.createLinearGradient(cx0 + 14, 0, cx0 + 14 + 234 * 0.72, 0)
  prog.addColorStop(0, 'rgba(95,168,255,0.9)')
  prog.addColorStop(1, 'rgba(95,224,200,0.9)')
  g.fillStyle = prog
  rr(cx0 + 14, cy0 + 244, 234 * 0.72, 7, 3.5)
  g.fill()

  /* ―― 底部一行：五个节点连成一条链，亮两个（与前景五块展板同构）―― */
  g.strokeStyle = 'rgba(120,180,255,0.22)'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(70, 356)
  g.lineTo(954, 356)
  g.stroke()
  for (let i = 0; i < 5; i++) {
    const x = 70 + i * 221
    const on = i === 1 || i === 3
    g.fillStyle = on ? 'rgba(235,245,255,0.95)' : 'rgba(95,168,255,0.45)'
    g.beginPath()
    g.arc(x, 356, on ? 3.6 : 2.6, 0, Math.PI * 2)
    g.fill()
    if (on) {
      g.strokeStyle = 'rgba(95,168,255,0.5)'
      g.lineWidth = 1
      g.beginPath()
      g.arc(x, 356, 8, 0, Math.PI * 2)
      g.stroke()
    }
  }
}

function labScreenTexture(variant = 'embodied') {
  const ink = WALL_INK[variant] || WALL_INK.embodied
  /* 纹理分辨率：AI 屏是首屏最近的一面大屏（7.2m 宽、隔着玻璃斜看），
     1024×384 在 2x 屏上会读成马赛克。按 2 倍栅格画，逻辑坐标仍按 1024×384 写，
     画布本身 2048×768 —— 线与节点的边缘因此落在 1/2 逻辑像素上，干净一圈 */
  const k = variant === 'ai' ? 2 : 1
  const c = document.createElement('canvas')
  c.width = 1024 * k
  c.height = 384 * k
  const g = c.getContext('2d')
  g.scale(k, k)
  g.fillStyle = ink.bg
  g.fillRect(0, 0, 1024, 384)
  /* 底网格：屏要有像素感，纯色一块读作贴纸 */
  g.strokeStyle = ink.grid
  g.lineWidth = 1
  for (let x = 0; x < 1024; x += 32) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, 384)
    g.stroke()
  }
  for (let y = 0; y < 384; y += 32) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(1024, y)
    g.stroke()
  }
  /* 顶部窗控行：三间房共用的一条“这是一块在跑的屏”信号（无字） */
  ;[ink.a, 'rgba(224,196,106,0.75)', 'rgba(62,224,164,0.75)'].forEach((col, i) => {
    g.fillStyle = col
    g.beginPath()
    g.arc(26 + i * 19, 26, 5.4, 0, Math.PI * 2)
    g.fill()
  })
  g.fillStyle = ink.soft
  g.fillRect(96, 20, 240, 11)
  g.fillStyle = ink.a
  g.fillRect(96, 20, 148, 11)
  g.fillStyle = ink.soft
  g.fillRect(900, 22, 100, 7)
  g.fillStyle = ink.b
  g.fillRect(900, 22, 62, 7)
  const panel = (px, py, pw, ph) => {
    g.fillStyle = ink.wash
    g.fillRect(px, py, pw, ph)
    g.strokeStyle = ink.line
    g.lineWidth = 1.5
    g.strokeRect(px, py, pw, ph)
  }
  /* AI 屏 = 底层品牌图谱 / 数据流 + 上层三块错落的研发与金融窗口。
     先铺底，再盖窗口：窗口之间留出的缝里能看到图谱与流线，读作"墙后面还有东西" */
  const aiScreen = (gg, kk, pp, rand) => {
    wallAi(gg, kk, pp, rand)
    wallDemos(gg)
  }
  const draw = { embodied: wallEmbodied, chain: wallChain, ai: aiScreen }[variant] || wallEmbodied
  draw(g, ink, panel, rng(WALL_SEED[variant] || 1))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  /* 大屏是斜着看的：各向异性拉到 8 才能让斜向的流线与节点不糊成一条带 */
  t.anisotropy = 8
  return t
}

/** 把一块平面几何的 u 重映射到纹理的左/右半：一张 1024×320 的图集里
    装两个不同画面 → 两种屏内容只多两个 draw call，不多分桶 */
function planeUV(geo, u0, u1) {
  const uv = geo.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0))
  uv.needsUpdate = true
  return geo
}

/* ------------------------------------------------------------
 * 学生桌显示器：在跑东西的那两面小屏
 * ------------------------------------------------------------
 * 上一版八台显示器与视频墙共用 labScreenTexture（那张被刻意去字）——
 * 桌屏上没字就没人在干活，读作“贴了八张同样的壁纸”。用户：电脑要显示
 * 仿真或者迁移代码。所以桌屏单独两个桶、两张图集（每张左右两版）。
 * 去字规则只管视频墙：墙上出大字与 DOM 标题互抢第一视觉；桌屏在全景下
 * 只有 ~110px 宽（字读作纹理），在臂部特写里 ~370px（10px 字成像 ~7px，
 * 可辨）—— 两个尺度上都不会与 DOM 打架，所以这里可以放真代码。
 * ============================================================ */
const MONO = 'ui-monospace, Consolas, "Courier New", monospace'
const CODE_INK = { kw: THEME.ice, fn: THEME.sky, str: '#5FE0C0', com: '#4f6b86', num: '#9CC0FF', def: '#C9DCF2' }
/* 一行 = 若干 [文本, 色名] 段：手写分段比正则分词便宜且可控（能故意留错行缩进） */
const CODE_PANELS = [
  {
    file: 'ros2_bridge.py',
    lines: [
      [['# ROS1 pkg -> ROS2 migration', 'com']],
      [['import ', 'kw'], ['rclpy', 'def']],
      [['from ', 'kw'], ['rclpy.node ', 'def'], ['import ', 'kw'], ['Node', 'fn']],
      [['from ', 'kw'], ['sensor_msgs.msg ', 'def'], ['import ', 'kw'], ['Image', 'fn']],
      [],
      [['class ', 'kw'], ['Bridge', 'fn'], ['(', 'def'], ['Node', 'fn'], ['):', 'def']],
      [['    def ', 'kw'], ['__init__', 'fn'], ['(self):', 'def']],
      [['        super().', 'def'], ['__init__', 'fn'], ['(', 'def'], ["'bridge_ns'", 'str'], [')', 'def']],
      [['        self.pub = self.', 'def'], ['create_publisher', 'fn'], ['(', 'def']],
      [['            Image, ', 'def'], ["'/cam/image_raw'", 'str'], [', ', 'def'], ['10', 'num'], [')', 'def']],
      [['        self.sub = self.', 'def'], ['create_subscription', 'fn']],
      [['            (Image, ', 'def'], ["'/rgb/image'", 'str'], [', self.cb, ', 'def'], ['10', 'num'], [')', 'def']],
      [['    def ', 'kw'], ['cb', 'fn'], ['(self, msg):', 'def']],
      [['        msg.header.stamp = self.', 'def'], ['get_clock', 'fn'], ['().now()', 'def']],
    ],
    term: [['$ colcon build --packages-select bridge', 'def'], ['[ 88%] Built target bridge_core', 'str'], ['Finished <<< bridge [12.4s]', 'kw']],
  },
  {
    file: 'pid_tuner.cpp',
    lines: [
      [['#include ', 'str'], ['<rclcpp/rclcpp.hpp>', 'str']],
      [['#include ', 'str'], ['<nav_msgs/msg/odometry.hpp>', 'str']],
      [],
      [['class ', 'kw'], ['PidNode : ', 'def'], ['public', 'kw'], [' rclcpp::Node {', 'def']],
      [[' public:', 'kw']],
      [['  PidNode() : ', 'fn'], ['Node', 'fn'], ['(', 'def'], ['"pid_tuner"', 'str'], [') {', 'def']],
      [['    pub_ = ', 'def'], ['create_publisher', 'fn'], ['<Twist>(', 'def']],
      [['        ', 'def'], ['"/cmd_vel"', 'str'], [', ', 'def'], ['10', 'num'], [');', 'def']],
      [['    timer_ = ', 'def'], ['create_wall_timer', 'fn'], ['(', 'def']],
      [['        ', 'def'], ['50ms', 'num'], [', [this]{ ', 'def'], ['tick', 'fn'], ['(); });', 'def']],
      [['  }', 'def']],
      [['  void ', 'kw'], ['tick', 'fn'], ['() {', 'def']],
      [['    const double e = tgt_ - pose_.x();', 'def']],
      [['    cmd_.linear.x = kp_ * e; ', 'def'], ['// P', 'com']],
    ],
    term: [['$ ros2 run pid pid_node --ros-args -p kp', 'def'], ['[pid_tuner] tracking /cmd_vel  ok', 'str'], ['[pid_tuner] err=0.031m  kp=1.40', 'kw']],
  },
]

/** 桌屏 A：代码编辑器 + 底部终端（迁移中的 ROS 工程） */
function deskCodeTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 320
  const g = c.getContext('2d')
  const panel = (ox, p) => {
    g.fillStyle = '#0a1421'
    g.fillRect(ox, 0, 512, 320)
    /* 标题条：三个窗控点 + 一个亮着的文件名 tab —— 没有它读作一张图，不读作一个窗口 */
    g.fillStyle = '#122033'
    g.fillRect(ox, 0, 512, 22)
    ;['#e06c60', '#e0b050', '#54d38f'].forEach((col, i) => {
      g.fillStyle = col
      g.beginPath()
      g.arc(ox + 13 + i * 14, 11, 3.4, 0, Math.PI * 2)
      g.fill()
    })
    g.fillStyle = '#0a1421'
    g.fillRect(ox + 60, 3, 118, 19)
    g.font = `10px ${MONO}`
    g.textBaseline = 'middle'
    g.fillStyle = '#8fb0d0'
    g.fillText(p.file, ox + 66, 13)
    /* 行号槽 */
    g.fillStyle = '#0d1826'
    g.fillRect(ox, 22, 26, 320 - 22)
    g.font = `11px ${MONO}`
    p.lines.forEach((_, i) => {
      g.fillStyle = '#3b5a7a'
      g.fillText(String(i + 1), ox + 9, 32 + i * 15)
    })
    /* 当前行底纹 + 光标块：一个静止的画面也要读作“有人正敲到这里” */
    const cur = 12
    g.font = `11px ${MONO}`
    let cx = ox + 34
    for (const [txt] of p.lines[cur]) cx += g.measureText(txt).width
    g.fillStyle = 'rgba(95,168,255,0.07)'
    g.fillRect(ox + 26, 25 + cur * 15, 486, 14)
    g.fillStyle = '#cfe4ff'
    g.fillRect(cx + 1, 26 + cur * 15, 6, 11)
    p.lines.forEach((segs, i) => {
      if (!segs.length) return
      let x = ox + 34
      for (const [txt, key] of segs) {
        g.fillStyle = CODE_INK[key]
        g.fillText(txt, x, 32 + i * 15)
        x += g.measureText(txt).width
      }
    })
    /* 终端：占底部三成，与编辑器隔一条分隔线 —— “跑起来了”这件事的证据 */
    g.fillStyle = '#060d16'
    g.fillRect(ox, 240, 512, 80)
    g.fillStyle = 'rgba(95,168,255,0.25)'
    g.fillRect(ox, 240, 512, 1)
    g.font = `10px ${MONO}`
    p.term.forEach((ln, i) => {
      g.fillStyle = CODE_INK[ln[1]]
      g.fillText(ln[0], ox + 8, 253 + i * 14)
    })
    /* 进度条：终端下面一条亮段，读作 build 在走 */
    g.fillStyle = 'rgba(95,168,255,0.18)'
    g.fillRect(ox + 8, 298, 496, 6)
    g.fillStyle = 'rgba(62,224,164,0.75)'
    g.fillRect(ox + 8, 298, 400, 6)
  }
  CODE_PANELS.forEach((p, i) => panel(i * 512, p))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** 桌屏 B：仿真视口 —— 透视地面格 + 一台六轴臂线框 + 轨迹样条 + HUD。
    没有文字也能读作“在跑仿真”：地平线、收敛格线、样条与目标框是
    Gazebo/Isaac 类视口的通用形状，比再多的字都直接 */
function deskSimTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 320
  const g = c.getContext('2d')
  const panel = (ox, seed) => {
    const grd = g.createLinearGradient(ox, 0, ox, 320)
    grd.addColorStop(0, '#0b1826')
    grd.addColorStop(0.42, '#0d2033')
    grd.addColorStop(1, '#081320')
    g.fillStyle = grd
    g.fillRect(ox, 0, 512, 320)
    const hy = 132
    /* 地面：收敛到灭点的竖线 + 间距递缩的横线（灭点偏左，画面才有透视） */
    g.strokeStyle = 'rgba(95,168,255,0.2)'
    g.lineWidth = 1
    for (let i = -7; i <= 7; i++) {
      g.beginPath()
      g.moveTo(ox + 200 + i * 12, hy)
      g.lineTo(ox + 256 + i * 96, 320)
      g.stroke()
    }
    for (let k = 1; k < 9; k++) {
      const t = k / 9
      const y = hy + (320 - hy) * t * t
      g.globalAlpha = 0.35 + t * 0.65
      g.beginPath()
      g.moveTo(ox, y)
      g.lineTo(ox + 512, y)
      g.stroke()
    }
    g.globalAlpha = 1
    /* 地平线：远端的雾 */
    g.fillStyle = 'rgba(120,170,230,0.16)'
    g.fillRect(ox, hy - 1, 512, 2)
    /* 六轴臂：一条关节链，粗暗线 + 细亮线 = 壳体描边 */
    const j = [
      [150, 252],
      [150, 214 - seed * 6],
      [196 + seed * 10, 168],
      [244, 192 + seed * 8],
      [268 + seed * 6, 176],
    ]
    const chain = (w, col) => {
      g.strokeStyle = col
      g.lineWidth = w
      g.lineJoin = 'round'
      g.beginPath()
      j.forEach(([x, y], i) => (i ? g.lineTo(ox + x, y) : g.moveTo(ox + x, y)))
      g.stroke()
    }
    g.fillStyle = '#16283c'
    g.fillRect(ox + 122, 250, 58, 16)
    g.fillRect(ox + 132, 236, 38, 16)
    chain(9, '#16283c')
    chain(3, '#9dc0e6')
    g.fillStyle = '#9dc0e6'
    j.forEach(([x, y], i) => {
      if (!i) return
      g.beginPath()
      g.arc(ox + x, y, 3.4, 0, Math.PI * 2)
      g.fill()
    })
    /* 接触阴影：没有它臂是贴在画面上的贴纸 */
    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.beginPath()
    g.ellipse(ox + 151, 268, 44, 9, 0, 0, Math.PI * 2)
    g.fill()
    /* 轨迹样条：末端 → 目标框，三段贝塞尔 + 路点 + 目标框 */
    const tx = 372 + seed * 12
    const ty = 214 - seed * 10
    g.strokeStyle = '#3ee0a4'
    g.lineWidth = 2
    g.setLineDash([7, 5])
    g.beginPath()
    g.moveTo(ox + 272, 176)
    g.bezierCurveTo(ox + 300, 120, tx - 40, ty - 70, tx, ty)
    g.stroke()
    g.setLineDash([])
    g.fillStyle = '#3ee0a4'
    for (let i = 1; i <= 3; i++) {
      const u = i / 4
      const bx = (1 - u) ** 3 * 272 + 3 * (1 - u) ** 2 * u * 300 + 3 * (1 - u) * u * u * (tx - 40) + u ** 3 * tx
      const by = (1 - u) ** 3 * 176 + 3 * (1 - u) ** 2 * u * 120 + 3 * (1 - u) * u * u * (ty - 70) + u ** 3 * ty
      g.beginPath()
      g.arc(ox + bx, by, 3, 0, Math.PI * 2)
      g.fill()
    }
    /* 目标框：一个立方体线框（等轴测三面） */
    g.strokeStyle = 'rgba(224,196,106,0.9)'
    g.lineWidth = 1.6
    g.strokeRect(ox + tx - 14, ty - 12, 28, 22)
    g.beginPath()
    g.moveTo(ox + tx - 14, ty - 12)
    g.lineTo(ox + tx - 6, ty - 20)
    g.lineTo(ox + tx + 22, ty - 20)
    g.lineTo(ox + tx + 14, ty - 12)
    g.moveTo(ox + tx + 22, ty - 20)
    g.lineTo(ox + tx + 22, ty + 2)
    g.lineTo(ox + tx + 14, ty + 10)
    g.stroke()
    /* HUD：左上状态块 + 右上播放键 + 右下小地图 */
    g.fillStyle = 'rgba(10,26,42,0.82)'
    g.fillRect(ox + 10, 10, 108, 34)
    g.strokeStyle = 'rgba(95,168,255,0.35)'
    g.strokeRect(ox + 10, 10, 108, 34)
    for (let i = 0; i < 3; i++) {
      g.fillStyle = 'rgba(127,184,255,0.2)'
      g.fillRect(ox + 16, 17 + i * 9, 78, 4)
      g.fillStyle = i === 1 ? THEME.cyan : THEME.sky
      g.fillRect(ox + 16, 17 + i * 9, [58, 70, 34][i], 4)
    }
    g.fillStyle = '#9dc0e6'
    g.beginPath()
    g.moveTo(ox + 494, 14)
    g.lineTo(ox + 494, 30)
    g.lineTo(ox + 480, 22)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgba(10,26,42,0.82)'
    g.fillRect(ox + 430, 258, 72, 50)
    g.strokeStyle = 'rgba(95,168,255,0.35)'
    g.strokeRect(ox + 430, 258, 72, 50)
    g.strokeStyle = 'rgba(62,224,164,0.7)'
    g.beginPath()
    g.moveTo(ox + 440, 298)
    g.quadraticCurveTo(ox + 462, 292, 470 + ox, 274)
    g.stroke()
    g.fillStyle = '#eaf4ff'
    g.beginPath()
    g.arc(ox + 440, 298, 2.6, 0, Math.PI * 2)
    g.fill()
  }
  panel(0, 0)
  panel(512, 1)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** 地面标线贴花：真实实验室的地面是有“交通法规”的 —— 这是参考图里
    最容易被漏掉、却最能说明“这是一间交付出去的实验室”的一笔。
    三间房各一版：具身是作业区/AGV 湾，链是冷通道，AI 是算力区边界 */
function floorDecalTexture(variant = 'embodied', scale = 1) {
  const c = document.createElement('canvas')
  c.width = 2048 * scale
  c.height = 1536 * scale
  const g = c.getContext('2d')
  /* 画布缩放而不是改坐标：下面所有像素常量（线宽、虚线节距、字号、圆弧半径）
     都按 2048×1536 这套世界→像素映射写死，整体 scale 才能一处降分辨率而不动标线几何 */
  g.scale(scale, scale)
  g.clearRect(0, 0, 2048, 1536)
  /* 世界 24×18、中心 [0,-3] → 像素：px = (x+12)/24*2048, py = (z+12)/18*1536 */
  const X = (x) => ((x + 12) / 24) * 2048
  const Z = (z) => ((z + 12) / 18) * 1536
  const rect = (x0, z0, x1, z1) => g.strokeRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0))
  const text = (s, x, z, size = 62, col = 'rgba(95,168,255,0.42)', rot = 0) => {
    g.fillStyle = col
    g.font = `bold ${size}px "Microsoft YaHei", sans-serif`
    if (!rot) return g.fillText(s, X(x), Z(z))
    g.save()
    g.translate(X(x), Z(z))
    g.rotate(rot)
    g.fillText(s, 0, 0)
    g.restore()
  }
  if (variant === 'chain') {
    /* 冷通道双线：机柜列内侧各一条，通道成轴 */
    g.strokeStyle = 'rgba(95,168,255,0.34)'
    g.lineWidth = 10
    g.beginPath()
    g.moveTo(X(-2.2), Z(3.4))
    g.lineTo(X(-2.2), Z(-4.6))
    g.moveTo(X(2.2), Z(3.4))
    g.lineTo(X(2.2), Z(-4.6))
    g.stroke()
    /* 展台边界圆删了（用户：去掉 dais 这层东西）：它标的是一个已经不在的台子，
       地上凭空一圈蓝线只会读成“给一个看不见的东西围了个栏” */
    g.strokeStyle = 'rgba(201,151,29,0.55)'
    g.lineWidth = 12
    g.setLineDash([40, 26])
    g.beginPath()
    g.moveTo(X(-2.2), Z(3.4))
    g.lineTo(X(2.2), Z(3.4))
    g.stroke()
    g.setLineDash([])
    text('冷通道 COLD AISLE', -2.1, 0.6, 56, 'rgba(95,168,255,0.3)', -Math.PI / 2)
    text('节点机房 NODE HALL', 2.5, -0.6, 62, 'rgba(95,168,255,0.42)', -Math.PI / 2)
    text('共识区 CONSENSUS', -1.5, 4.3, 74)
  } else if (variant === 'ai') {
    /* 算力区边界：黄黑虚线框 + 运维通道线
       （原来那圈基座圆改成了地坪喷绘的品牌 logo，见组件里的 logo 面片） */
    g.strokeStyle = 'rgba(201,151,29,0.5)'
    g.lineWidth = 12
    g.setLineDash([46, 30])
    rect(-2.7, -2.4, 2.7, 2.4)
    g.setLineDash([])
    g.strokeStyle = 'rgba(95,168,255,0.3)'
    g.lineWidth = 10
    g.beginPath()
    g.moveTo(X(-2.2), Z(1.6))
    g.lineTo(X(-2.2), Z(-4.4))
    g.moveTo(X(2.2), Z(1.6))
    g.lineTo(X(2.2), Z(-4.4))
    g.stroke()
    text('算力区 COMPUTE', 1.6, -3.2, 62, 'rgba(201,151,29,0.5)')
    text('智能体运维 AGENT OPS', 2.6, -0.4, 56, 'rgba(95,168,255,0.3)', -Math.PI / 2)
  } else {
    /* 演示岛边线 */
    g.strokeStyle = 'rgba(95,168,255,0.5)'
    g.lineWidth = 8
    rect(-1.95, -1.5, 2.55, 1.0)
    /* AGV 主通道：两条平行线 */
    g.strokeStyle = 'rgba(95,168,255,0.34)'
    g.lineWidth = 10
    g.beginPath()
    g.moveTo(X(-2.35), Z(3.5))
    g.lineTo(X(-2.35), Z(-4.6))
    g.moveTo(X(2.95), Z(3.5))
    g.lineTo(X(2.95), Z(-4.6))
    g.stroke()
    /* 停位湾：尺寸跟着真实居民走 —— 充电桩湾 0.96×1.3、轮式湾 0.6×0.6。
       湾画在岛前可见带里：居民摆进湾里才读作“停在规定位置”，
       摆在窗口外就等于没摆 */
    g.strokeStyle = 'rgba(201,151,29,0.55)'
    g.lineWidth = 8
    rect(0.42, 1.05, 1.38, 2.35)
    rect(0.15, 1.55, 0.75, 2.15)
    /* AGV 车位（岛后那条过道）：编队搬到背景墙那一侧之后，地上没湾就等于
       「车随便停在过道上」。三格跟着 EmbodiedRig 的 AGV_PARK 走：
       0.48 / 1.34 / 2.16 —— 不是等距，而是前面三台机器腿间三条车道的中心
       （推导与扫描见那边的注释）。间隔不等但屏上 50.5/60/69.4 是匀的。
       这道标线原先画的是机械臂作业区黄框（z=-2.05 那条虚线）—— 两台桌面臂现在
       都在学生桌上，地面那道框没了主人，而 AGV 恰好要停进这条过道：
       与其让两道标线叠在一起，不如把它改成真正的停车排。
       格子 0.64×0.72 套 0.44×0.36 的车身（整圈扫描时外接圆半径 0.283 →
       两头各让 ~0.08）；车现在只在自家这一格里动（一车一道，不共享路径），
       巡回中心 z=-1.88 → 格子跟着从 [-2.32,-1.64] 往前挪到 [-2.24,-1.52]：
       后缘躲学生凳（凳心 z=-2.48、半径 0.17 → 前缘 -2.31），
       前缘躲岛缘（-1.45）。最右那格的右沿 2.48 已经在可见带（2.32）之外 ——
       那半条线会被看板压住，读作「车位一直排到面板后面」，而那一格本来就只停得下半台车*/
    g.strokeStyle = 'rgba(201,151,29,0.55)'
    g.lineWidth = 12
    g.setLineDash([46, 30])
    for (const bx of [0.48, 1.34, 2.16]) rect(bx - 0.32, -2.24, bx + 0.32, -1.52)
    g.setLineDash([])
    /* 区域字标：字要大到在机位下读得出来，小了就是又一类亚像素噪声 */
    text('教学区 TEACHING', 2.2, -2.5, 74)
    text('仓储区 STAGING', -6.9, -2.2, 74)
    text('作业区 OPERATION', -1.7, -2.62, 62, 'rgba(201,151,29,0.5)')
    text('AGV 通道', -2.62, 2.6, 56, 'rgba(95,168,255,0.3)', -Math.PI / 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** 一台学生桌：白台面 + 四腿 + 亮着的显示器 + 两张凳。
    显示器屏幕朝 +z（朝学生、也朝相机）—— 背对相机的黑屏等于没画。
    kind 决定屏上是什么（'code' 迁移代码 / 'sim' 仿真视口），half 决定取
    图集的左还是右半 —— 八台桌子不能是八张同样的壁纸 */
function bench(x, z, kind, half) {
  const frame = [
    box([1.5, 0.05, 0.7], [x, 0.72, z]),
    ...[[-0.68, -0.28], [0.68, -0.28], [-0.68, 0.28], [0.68, 0.28]].map(([dx, dz]) => box([0.04, 0.7, 0.04], [x + dx, 0.35, z + dz])),
    /* 显示器：背板 + 支颈 + 底座 */
    box([0.52, 0.34, 0.02], [x, 1.08, z - 0.2]),
    cyl([0.02, 0.03, 0.16, 8], [x, 0.82, z - 0.2]),
    box([0.2, 0.02, 0.14], [x, 0.755, z - 0.2]),
    /* 两张凳 */
    ...[-0.45, 0.45].flatMap((dx) => [cyl([0.16, 0.17, 0.05, 14], [x + dx, 0.46, z + 0.62]), cyl([0.03, 0.04, 0.44, 8], [x + dx, 0.22, z + 0.62])]),
  ]
  const desk = [box([1.46, 0.03, 0.66], [x, 0.755, z])]
  const scr = [planeUV(new THREE.PlaneGeometry(0.48, 0.3), half ? 0.5 : 0, half ? 1 : 0.5)]
  place(scr[0], [x, 1.08, z - 0.188])
  /* 主机指示灯：一颗就够，读作"这台开着" */
  const gl = [glow([0.02, 0.02], [x + 0.62, 0.78, z + 0.3], '#3EE0A4', { mul: 2.2 })]
  return { frame, desk, glow: gl, [kind]: scr }
}

/** 算力机柜：远景两侧各一台。灯珠每层一颗、留在 Bloom 阈值下：
    机柜只该读作"有设备"，不该读作"有一堆 LED 在闪" */
function rack(x) {
  const z = -6.4
  const frame = []
  const lights = []
  for (let i = 0; i < 6; i++) {
    const y = 0.32 + i * 0.26
    frame.push(box([0.8, 0.16, 0.02], [x, y, z + 0.36]))
    lights.push(glow([0.07, 0.035], [x - 0.3, y + 0.02, z + 0.374], i % 3 === 1 ? '#3EE0A4' : LAB_ACCENT, { mul: 0.9, opacity: 0.85 }))
  }
  return { frame, panel: [box([0.9, 1.9, 0.7], [x, 0.95, z])], glow: lights }
}

/** 机柜列里的一台：箱体 + 网门 + 门上一条连续 LED 竖灯带 + 每柜一颗过阈亮灯。
    上一版竖排是 8~12 颗 5cm 灯珠：后墙在机位下每颗不足 2px，
    整排机柜读作黑碑。灯带是连续的，5~12 米外仍是一条可读的亮线 ——
    机房后墙的第一信号是“每台设备都亮着一条”，不是灯珠颗粒。
    mul 1.4 压在 Bloom 阈值 1.8 下：带子泛光会糊成一根灯管；
    该过阈的只有顶上那颗状态灯 */
function cab(x, z, yaw, tall, leds) {
  const fx = Math.sin(yaw) * 0.45
  const fz = Math.cos(yaw) * 0.45
  const lx = Math.cos(yaw)
  const lz = -Math.sin(yaw)
  /* 网门厚 2cm（前面在 z+fz+0.01）：灯带与状态灯必须再往前贴 1.6cm。
     上一版灯在 z+fz，正好埋进门板里被深度测试吃掉 ——
     分镜里整排机柜读作黑碑，不是灯不够亮，是灯根本没画出来 */
  const nx = Math.sin(yaw) * 0.016
  const nz = Math.cos(yaw) * 0.016
  const frame = [box([0.78, tall, 0.86], [x, tall / 2, z], [0, yaw, 0]), box([0.84, 0.06, 0.92], [x, tall + 0.03, z], [0, yaw, 0])]
  const panel = [box([0.66, tall - 0.3, 0.02], [x + fx, tall / 2, z + fz], [0, yaw, 0])]
  const lights = [
    glow([0.028, tall - 0.4], [x + fx + nx - lx * 0.24, tall / 2, z + fz + nz - lz * 0.24], leds > 10 ? '#7fd4ff' : LAB_ACCENT, { mul: 1.4, opacity: 0.9, rotation: [0, yaw, 0] }),
    glow([0.06, 0.06], [x + fx + nx + lx * 0.24, tall - 0.16, z + fz + nz + lz * 0.24], '#3EE0A4', { mul: 2.3, rotation: [0, yaw, 0] }),
  ]
  return { frame, panel, glow: lights }
}

/** 收集整层零件，按材质分桶 */
function collect(variant) {
  const desks = variant === 'embodied'
  const parts = { frame: [], panel: [], desk: [], glow: [], screen: [], isle: [], code: [], sim: [] }
  const add = (b) => {
    for (const k of ['frame', 'panel', 'desk', 'glow', 'screen', 'isle', 'code', 'sim']) if (b[k]) parts[k].push(...b[k])
  }

  /* ―― 天花：一排离散的箱式灯具 ――
     连续灯带在 10~19 米机位下只有 1~3px，浅角光栅化逐行开关，拍出来是
     一排排明暗阶梯短横。改成离散灯具、发光面立着朝镜头；mul 3.4 是因为
     这条管线 Bloom 阈值 1.8、AGX 在合成器末端统一 tonemap：×1.25/×2.0
     过不了阈又被压成中灰，拍出来是没光晕的灰板，不溢光就读作板材 */
  for (const z of STRIP_Z) {
    for (let i = 0; i < 5; i++) {
      const x = -6.4 + i * 3.2
      parts.frame.push(box([1.82, 0.16, 0.1], [x, 3.02, z]))
      parts.glow.push(glow([1.7, 0.12], [x, 3.0, z + 0.052], '#cfe0f2', { mul: 3.4 }))
    }
  }

  /* ―― 天花桁架 + 桥架：抬头是机房结构，不是黑洞 ――
     桁架弦杆 5cm 见方、斜腹杆 3cm：在 3.35 米高、8~14 米距上仍有 4~6px，
     过得了「最小成像尺寸」线；再细就又是上一版那类光栅化噪声 */
  for (const x of [-2.6, 2.6]) {
    parts.frame.push(box([0.05, 0.05, 18], [x, 3.45, -5]), box([0.05, 0.05, 18], [x, 3.22, -5]))
    for (let i = 0; i < 20; i++) {
      const z = -13.6 + i * 0.92
      parts.frame.push(box([0.03, 0.03, 0.42], [x, 3.335, z], [i % 2 ? 0.72 : -0.72, 0, 0]))
    }
  }
  parts.frame.push(box([0.36, 0.02, 18], [0, 3.16, -5]), box([0.02, 0.08, 18], [-0.18, 3.2, -5]), box([0.02, 0.08, 18], [0.18, 3.2, -5]))

  /* ―― 远景冷蓝背光板 + 墙上灯槽：给"房间的尽头"一个色温 ―― */
  parts.glow.push(glow([5.4, 2.6], [-6.6, 1.7, -15.85], '#0b1c30', { opacity: 0.9 }))
  parts.glow.push(glow([4.2, 2.2], [6.4, 1.5, -15.85], '#0a1828', { opacity: 0.9 }))
  parts.glow.push(glow([24, 0.11], [0, 2.55, -15.8], LAB_ACCENT, { opacity: 0.32 }))

  /* ―― 玻璃隔断 + 竖梃：中景与远景的分层线 ―― */
  for (const x of MULLION_X) parts.frame.push(box([0.035, 2.6, 0.035], [x, 1.3, -5.2]))
  parts.frame.push(box([17, 0.035, 0.035], [0, 2.6, -5.2]))

  /* ―― LED 视频墙：三间房共用的“尽头那面墙”，内容按 variant 换 ——
     挂在玻璃隔断后面半米，竖梃从它前面过：隔着玻璃看大屏，
     正是交付实拍里的样子。屏面单独一个桶（带 canvas 纹理） */
  parts.frame.push(box([7.5, 2.6, 0.12], [-0.6, 1.75, -5.78]))
  parts.screen.push(place(new THREE.PlaneGeometry(7.2, 2.35), [-0.6, 1.75, -5.7]))
  /* 两根柱屏：竖梃上各挂一面，内容同纹理。隔断前的中景不再只有玻璃 */
  parts.frame.push(box([1.62, 1.06, 0.06], [2.6, 1.75, -5.24]), box([1.62, 1.06, 0.06], [-4.9, 1.75, -5.24]))
  parts.screen.push(place(new THREE.PlaneGeometry(1.5, 0.95), [2.6, 1.75, -5.2]), place(new THREE.PlaneGeometry(1.5, 0.95), [-4.9, 1.75, -5.2]))

  if (desks) {
    /* ―― 学生桌两列：屏幕朝相机亮着，中轴让给演示岛 ――
       屏内容按位交替：一半在写迁移代码、一半在跑仿真（同一张图集的左右半），
       八台全同一张图读作贴图，两种内容才读作“一个班各干各的” */
    BENCH_COLS.forEach((x, i) =>
      BENCH_ROWS.forEach((z, j) => {
        const n = i * BENCH_ROWS.length + j
        add(bench(x, z, n % 2 ? 'sim' : 'code', Math.floor(n / 2) % 2))
      }),
    )

    /* ―― 演示岛：3cm 抬高地台 + 一圈边灯 ――
       不抬更多：人形与臂的 FK 表都按 y=0 算，台子抬高了脚就悬着。
       台面用哑光黑漆：半金属材质在顶光下是一整块灰板（分镜实测），
       黑漆 + 一圈边灯才读作「抬起来的演示台」 */
    parts.isle.push(box([ISLE.w, 0.03, ISLE.d], [ISLE.c[0], 0.015, ISLE.c[1]]))
    const hw = ISLE.w / 2
    const hd = ISLE.d / 2
    parts.glow.push(
      glow([ISLE.w, 0.05], [ISLE.c[0], 0.034, ISLE.c[1] + hd], LAB_ACCENT, { mul: 1.7, opacity: 0.85, rotation: [-Math.PI / 2, 0, 0] }),
      glow([ISLE.w, 0.05], [ISLE.c[0], 0.034, ISLE.c[1] - hd], LAB_ACCENT, { mul: 1.7, opacity: 0.85, rotation: [-Math.PI / 2, 0, 0] }),
      glow([0.05, ISLE.d], [ISLE.c[0] - hw, 0.034, ISLE.c[1]], LAB_ACCENT, { mul: 1.7, opacity: 0.85, rotation: [-Math.PI / 2, 0, 0] }),
      glow([0.05, ISLE.d], [ISLE.c[0] + hw, 0.034, ISLE.c[1]], LAB_ACCENT, { mul: 1.7, opacity: 0.85, rotation: [-Math.PI / 2, 0, 0] }),
    )

    /* ―― 储物架 + 料箱 + 工具柜：左墙边，"有人在用"的痕迹 ―― */
    const sx = -6.3
    for (const [dx, dz] of [
      [-0.25, -0.85],
      [0.25, -0.85],
      [-0.25, 0.85],
      [0.25, 0.85],
    ])
      parts.frame.push(box([0.04, 1.8, 0.04], [sx + dx, 0.9, -4.2 + dz]))
    for (const y of [0.4, 0.95, 1.5]) parts.panel.push(box([0.52, 0.03, 1.8], [sx, y, -4.2]))
    const bins = ['#2a4a6a', '#3a5a4a', '#4a4a52', '#2a4a6a', '#54424a', '#3a5a4a']
    bins.forEach((col, i) => {
      const y = i < 2 ? 0.5 : i < 4 ? 1.05 : 1.6
      const z = -4.85 + (i % 2) * 0.7 + (i > 3 ? 0.35 : 0)
      parts.desk.push(place(new THREE.BoxGeometry(0.24, 0.17, 0.32), [sx, y, z]))
    })
    parts.panel.push(box([0.5, 1.0, 0.85], [sx, 0.5, -2.5]))
    parts.glow.push(glow([0.02, 0.5], [sx + 0.26, 0.62, -2.5], LAB_ACCENT, { mul: 1.4, opacity: 0.8, rotation: [0, Math.PI / 2, 0] }))
    /* 动捕立杆已删：四根细杆在分镜里读作“插在房间里的棍”，
       是“物料堆叠杂乱”的一员；真实实验室的动捕是天花吊轨，不是落地杆 */
  }

  for (const x of RACK_X) add(rack(x))

  if (variant === 'chain') {
    /* ―― 机柜后墙 ――
       墙下那圈圆展台与它那一圈边灯拆了（用户：去掉 dais 这层东西）。它原本是
       给共识环当基座的（“没基座它就是一圈漂在雾里的盒子”），而链环与 ChainRig
       那座转台都已经拆完 —— 基座如今底下什么都不托，只剩一大块抬高了 6cm 的
       黑漆圆盘和一圈亮边，在画面里比任何看板都抢戏 */
    for (const x of CAB_BACK_X) add(cab(x, -5.0, 0, 1.9, 8))
  } else if (variant === 'ai') {
    /* ―― GPU 算力架后墙（矮一档、灯珠密一档）――
       那块“投影基座”拆了（用户：AI 首屏要干净整洁）：一个半径 0.5m 的黑圆台
       顶面一块 #bcd0ff×2.6 的亮疤，实测拍出来是一座水泥墩压在画面正中，
       它想说的“核心是投出来的全息”一个字也没送到，反而把刚腾出来的下半屏
       （智能体席位与业务产线）全占掉了。锥光跟着拆：它得底下有个台才读作投影 */
    for (const x of CAB_BACK_X) add(cab(x * 1.1, -5.0, 0, 1.5, 12))
  }

  return parts
}

/* 合并几何体按 variant 缓存：这一层的零件全是静态的，重算一次就是浪费 */
const CACHE = new Map()
function labGeo(variant) {
  if (CACHE.has(variant)) return CACHE.get(variant)
  const p = collect(variant)
  const packed = (list) => {
    if (!list.length) return null
    const g = mergeGeometries(list, false)
    list.forEach((x) => x.dispose())
    if (!g) return null
    g.computeBoundingSphere()
    return g
  }
  const out = {
    frame: packed(p.frame),
    panel: packed(p.panel),
    desk: packed(p.desk),
    isle: packed(p.isle),
    glow: packed(p.glow),
    screen: packed(p.screen),
    code: packed(p.code),
    sim: packed(p.sim),
    glass: new THREE.PlaneGeometry(17, 2.6),
    decal: new THREE.PlaneGeometry(24, 18),
  }
  CACHE.set(variant, out)
  return out
}

/* 纹理也缓存：canvas 画一次 2048×1536 不便宜，切屏不该重画 */
const TEX = {}
function tex(name, make) {
  if (!TEX[name]) TEX[name] = make()
  return TEX[name]
}

/** 一台在背景里慢慢巡走的 AMR：整层唯一动的东西，让"间"是活的 */
function PatrollingAmr() {
  const ref = useRef(null)
  useFrame((state) => {
    const g = ref.current
    if (!g) return
    const t = state.clock.elapsedTime * 0.11
    g.position.x = Math.sin(t) * 3.4
    g.position.z = -3.1 + Math.cos(t) * 0.5
    g.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI
  })
  return (
    <group ref={ref} position={[0, 0, -3.1]} name="amr">
      <mesh position={[0, 0.11, 0]} material={MAT.panel}>
        <boxGeometry args={[0.44, 0.16, 0.34]} />
      </mesh>
      <mesh position={[0, 0.22, 0]} material={MAT.frame}>
        <cylinderGeometry args={[0.045, 0.055, 0.08, 12]} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.46, 0.02, 0.36]} />
        <meshBasicMaterial color={new THREE.Color(LAB_ACCENT).multiplyScalar(2.4)} toneMapped={false} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

export default function LabEnvironment({ variant = 'embodied', amr = variant === 'embodied', lite = false }) {
  const geo = useMemo(() => labGeo(variant), [variant])
  const scrRef = useRef(null)
  const codeRef = useRef(null)
  const simRef = useRef(null)
  /* 视频墙与桌屏（代码屏 / 仿真屏）在工序 01「场地供电」里从黑屏亮起：供电这件事
     要在墙上有一个应答，不然「通电」只剩地上一圈环在自说自话。
     1.05 → 0.85：跟片头一起压缩的（供电收在 0.15 + 0.75 = 0.9），还是
     “在工序落位前一刻亮起来”那个相位 —— 这个数读的是装配时钟而不是墙钟，
     skipBuild() 快进时它跟着提前，不需要另外改 */
  const scrRefs = [scrRef, codeRef, simRef]
  useFrame(() => {
    const on = !buildClock.active || buildClock.t > 0.85
    for (const r of scrRefs) if (r.current) r.current.visible = on
  })
  const screenMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex('screen:' + variant, () => labScreenTexture(variant)),
        /* ×1.45：屏要亮过 AGX 的中灰段，但又压在 Bloom 阈值 1.8 下 ——
           大屏泛光会把整面墙糊成一团幕，"在跑东西"就读不出了 */
        color: new THREE.Color(1.45, 1.45, 1.45),
        toneMapped: false,
        fog: false,
      }),
    [variant],
  )
  /* 桌屏两张图集：代码 / 仿真。只在具身屏有桌子，其余两屏不生成 canvas */
  const codeMat = useMemo(
    () => (geo.code ? new THREE.MeshBasicMaterial({ map: tex('code', deskCodeTexture), color: new THREE.Color(1.45, 1.45, 1.45), toneMapped: false, fog: false }) : null),
    [geo],
  )
  const simMat = useMemo(
    () => (geo.sim ? new THREE.MeshBasicMaterial({ map: tex('sim', deskSimTexture), color: new THREE.Color(1.45, 1.45, 1.45), toneMapped: false, fog: false }) : null),
    [geo],
  )
  /* 玻璃隔断是整层里最贵的透明 overdraw，弱档收掉。
     地面标线不再跟着一起收：它是「这是一间真的交付过的实验室」在地上的唯一证据，
     收掉之后弱机看到的是一块光板，与强机像两个产品（用户实测：别的机器有划线、这台没有）。
     它本身只是一个 quad + 一次采样，与玻璃不在一个量级；弱档只把贴图降到半分辨率
     （1024×768），省的是 canvas 绘制、上传与显存，不是逐像素成本。 */
  const decalScale = lite ? 0.5 : 1
  const decalMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex(`decal:${variant}:${decalScale}`, () => floorDecalTexture(variant, decalScale)), transparent: true, depthWrite: false, toneMapped: false }),
    [decalScale, variant],
  )
  /* 地坪喷绘 logo：替掉原来那圈基座圆，尺寸沿用圆的外径（r=0.85m → 1.7m）。
     贴图直接取品牌标记的 512 位图，比画进 85px/m 的地坪图里清晰得多；
     喷绘是印在地上的，所以压到 0.78 透明度、不写深度、不参与色调映射 */
  const logoMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex('brand:floor-logo', () => {
          const t = new THREE.TextureLoader().load('/images/brand-mark-512.png')
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 4
          return t
        }),
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  return (
    <group name="lab">
      {geo.frame && <mesh geometry={geo.frame} material={MAT.frame} />}
      {geo.panel && <mesh geometry={geo.panel} material={MAT.panel} />}
      {geo.desk && <mesh geometry={geo.desk} material={MAT.desk} />}
      {geo.isle && <mesh geometry={geo.isle} material={MAT.isle} />}
      {geo.glow && <mesh geometry={geo.glow} material={MAT.glow} />}
      {geo.screen && <mesh ref={scrRef} geometry={geo.screen} material={screenMat} />}
      {geo.code && <mesh ref={codeRef} geometry={geo.code} material={codeMat} />}
      {geo.sim && <mesh ref={simRef} geometry={geo.sim} material={simMat} />}
      {!lite && <mesh geometry={geo.glass} material={MAT.glass} position={[0, 1.3, -5.2]} />}
      <mesh geometry={geo.decal} material={decalMat} rotation-x={-Math.PI / 2} position={[0, 0.006, -3]} />
      {variant === 'ai' && (
        <mesh material={logoMat} rotation-x={-Math.PI / 2} position={[0, 0.008, 0]}>
          <planeGeometry args={[1.7, 1.7]} />
        </mesh>
      )}
      <mesh material={MAT.wall} position={[0, 4, -16]}>
        <planeGeometry args={[60, 12]} />
      </mesh>
      {/* AMR 只在具身屏跑：它是实验室的零件，不是链与模型的零件 */}
      {amr && <PatrollingAmr />}
    </group>
  )
}
