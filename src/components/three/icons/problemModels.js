import * as THREE from 'three'

/* ============================================================
 * 「挑战与问题」的五枚 3D 图标：程序化模型工厂
 * ------------------------------------------------------------
 * 产物规范沿用 img2threejs（github.com/img2threejs/img2threejs）的输出契约：
 *   createXxxModel(mats) → THREE.Group
 *   · 只用原语几何（Lathe / Torus / Box / Cone / Cylinder / Capsule / Sphere）
 *   · 材质从外面传进来，工厂自己不 new 材质 —— 五枚图标共用一个小材质池
 *   · 不加载任何 .glb / 贴图，因此没有网络请求、没有解码开销、没有体积
 *   · 可动关节与视差层记在 userData.sculptRuntime 上，由外面逐帧驱动
 * 之所以手写而不跑它那条管道：它的输入契约是一张真实物体的参考照片，
 * 而这里五条议题（缺动手环境 / 内容更新慢 / 学情粗放 / 产教断裂 / 就业难）
 * 全是抽象概念，没有照片可对；再者项目立着「不引入新依赖」的规矩，
 * 那条管道要 Python + 一个能看图的语言模型，为一组 58px 的图标不值。
 *
 * ―― 视差是怎么来的 ――
 * 每个部件挂在离地（部件层）的位置上，写一份 userData.depth = 它自己的 z。
 * 外层用正交相机（1 世界单位 = 1 CSS 像素）把图标摆到 DOM 铭牌的正中央，
 * 然后整组跟着指针转：一个在 z 上的点绕 Y 转 θ 之后会挪到 x = z·sinθ ——
 * 越靠前的部件挪得越多。这就是视差本身，不需要额外的位移代码。
 * 「选中」时把每层的 z 乘开（EXPLODE），层与层拉开，视差立刻变强。
 *
 * 尺寸口径：模型画在 ±0.5 的方子里，外面按像素缩放（约 58px）。
 * 五枚都用同一圈背后的刻度环（halo）起步 —— 一个板块里五张牌该是一家人，
 * 这是「辨识度」最便宜的来源。
 * ============================================================ */

/* 部件在 z 上的基准间距。0.26 是这个单位制里「一眼看出前后」的下限：
   再小，倾斜时两层的相对位移不到 2px，读起来就是一张贴图 */
const D_BACK = -0.26
const D_MID = 0
const D_FRONT = 0.2
const D_NEAR = 0.32

const tag = (obj, z) => {
  obj.position.z = z
  obj.userData.depth = z
  return obj
}

/** 往组里塞一个部件：位置 (x,y) + 深度层 z，可选旋转 */
const put = (g, mesh, x, y, z = D_MID, rot = null) => {
  mesh.position.set(x, y, z)
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2])
  mesh.userData.depth = z
  g.add(mesh)
  return mesh
}

/* ―― 共享几何：反复用到的几种原语只 new 一次 ―― */
const GEO = {
  dot: new THREE.SphereGeometry(0.05, 14, 12),
  dotSm: new THREE.SphereGeometry(0.032, 12, 10),
  tick: new THREE.BoxGeometry(0.016, 0.06, 0.016),
  line: new THREE.BoxGeometry(0.2, 0.022, 0.014),
}

const vec2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y))

/* ============================================================
 * 背后那圈刻度环：五枚图标共用的家族特征
 * 260° 的弧 + 三枚刻度牙，故意留一个缺口 —— 它是「还没补齐」的那个语义，
 * 也顺手给每枚图标一个明确的最深层（视差里跑得最多的一块）
 * ============================================================ */
function halo(soft) {
  const g = new THREE.Group()
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.012, 6, 44, Math.PI * 1.45), soft)
  arc.rotation.z = -0.62
  g.add(arc)
  for (let i = 0; i < 3; i++) {
    const a = -0.62 + Math.PI * (0.24 + i * 0.5)
    const t = new THREE.Mesh(GEO.tick, soft)
    t.position.set(Math.cos(a) * 0.53, Math.sin(a) * 0.53, 0)
    t.rotation.z = a - Math.PI / 2
    g.add(t)
  }
  return tag(g, D_BACK)
}

/** 把根组里带 depth 的直接子节点收进 sculptRuntime，供外层逐帧拉开 */
function seal(group, tick) {
  const parts = group.children.filter((c) => c.userData.depth !== undefined)
  for (const p of parts) p.userData.baseDepth = p.userData.depth
  group.userData.sculptRuntime = { parts, tick }
  return group
}

/* ============================================================
 * 01 缺乏动手环境 —— 一只还在冒泡的锥形瓶
 * 玻璃壳是「环境」，里面那层液体与三颗气泡是「有人在动手」。
 * 缺口朝上的刻度环说的是：这间机房还没被填上。
 * ============================================================ */
export function createFlaskModel(m) {
  const g = new THREE.Group()
  g.add(halo(m.soft))

  const shellGeo = new THREE.LatheGeometry(
    vec2([
      [0.05, 0.36],
      [0.05, 0.1],
      [0.36, -0.3],
      [0.36, -0.37],
      [0.0, -0.37],
    ]),
    30,
  )
  const shell = new THREE.Mesh(shellGeo, m.glass)
  put(g, shell, 0, 0, D_MID)
  /* 瓶口那圈唇：不封的话 lathe 顶端是个洞，倾斜时里面是黑的 */
  put(g, new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.016, 8, 22), m.body), 0, 0.36, D_MID, [Math.PI / 2, 0, 0])
  /* 液面比瓶身内廓窄一点，斜过来时不会穿帮 */
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.325, 0.2, 26), m.accent), 0, -0.27, D_MID)

  const bubbles = []
  for (const [x, y, s, z] of [[-0.09, -0.22, 1, D_FRONT], [0.06, -0.3, 0.78, D_NEAR], [0.01, -0.16, 0.6, D_FRONT]]) {
    const b = new THREE.Mesh(GEO.dot, m.light)
    b.scale.setScalar(s)
    put(g, b, x, y, z)
    bubbles.push(b)
  }

  return seal(g, (t, a) => {
    /* 气泡往上冒、到顶回到液面下。相位互相错开，否则三颗一起动像同一个东西在抖 */
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i]
      const p = (t * (0.3 + i * 0.11) + i * 0.37) % 1
      b.position.y = -0.3 + p * 0.5
      b.scale.setScalar((0.5 + i * 0.16) * (1 - p * 0.35))
    }
    g.rotation.y = Math.sin(t * 0.42) * 0.1 * (0.3 + a)
  })
}

/* ============================================================
 * 02 课程内容更新慢 —— 摊开的教材 + 头顶那圈永远转不满的刷新环
 * 刷新环故意只画了 280°，而且慢：一整圈才叫「在更新」，缺的那 80° 才是重点。
 * ============================================================ */
export function createCurriculumModel(m) {
  const g = new THREE.Group()
  g.add(halo(m.soft))

  /* 书得「看得见台面」。正交相机是正着看的，一页纸平躺在 XY 面上时
     朝镜头的只有 0.05 的厚度 —— 上一版实拍出来不是一个摊开的本子，
     是一个黑色对勾。整组绕 X 抬起 55°，台面朝上，才读得出「翻开」 */
  const book = new THREE.Group()
  book.rotation.x = -0.96
  const page = new THREE.BoxGeometry(0.42, 0.05, 0.46)
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(page, m.body)
    p.position.set(s * 0.2, 0.02, 0)
    p.rotation.z = s * -0.17
    book.add(p)
    /* 每侧再压两层窄一点的：边上一格格才叫厚，单张板子只叫塑料 */
    for (let i = 1; i <= 2; i++) {
      const u = new THREE.Mesh(page, m.soft)
      u.position.set(s * 0.2, 0.02 - i * 0.038, 0)
      u.rotation.z = s * -0.17
      u.scale.set(1 - i * 0.06, 0.55, 1 - i * 0.05)
      book.add(u)
    }
  }
  put(g, book, 0, -0.03, D_MID)
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.46), m.accent), 0, -0.03, D_MID)

  /* 三行字贴在右页台面上：跟着书一起抬，不另占深度层。
     前后层已经有 halo / 书 / 刷新环三道，不缺这一层 */
  const lg = new THREE.Group()
  lg.position.set(0.2, 0.05, 0)
  lg.rotation.z = -0.17
  for (let i = 0; i < 3; i++) {
    const l = new THREE.Mesh(GEO.line, m.light)
    l.position.set(-0.02, 0.012, (i - 1) * 0.12)
    l.scale.set(0.82 - i * 0.2, 1, 1)
    lg.add(l)
  }
  book.add(lg)

  /* 一只钟贴在书的右前上方。
     上一版这里是一根 280° 的刷新环，正正地坐在书口上 —— 实拍出来是一只
     提着手提包的书，而 05 本来就是一个包。同排五枚图标不能互相误读，
     所以把“更新”换成同样直译但形状不会撞车的钟：缺的那 80° 换成了两根针 */
  const clock = new THREE.Group()
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.04, 28), m.light)
  face.rotation.x = Math.PI / 2
  clock.add(face)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.024, 8, 30), m.accent)
  rim.position.z = 0.02
  clock.add(rim)
  /* 两根针各自挂在一个轴心上。针不能直接把 Box 放在 (0, 半长) 然后转自己 ——
     rotation 是绕自己的几何中心转的，那样拍出来是一根在原地打滚的棍 */
  const hand = (len, thick, z) => {
    const pivot = new THREE.Group()
    const bar = new THREE.Mesh(new THREE.BoxGeometry(thick, len, 0.016), m.body)
    bar.position.set(0, len / 2 - 0.014, z)
    pivot.add(bar)
    return pivot
  }
  const hour = hand(0.088, 0.024, 0.04)
  const minute = hand(0.128, 0.019, 0.05)
  clock.add(hour, minute)
  put(g, clock, 0.25, 0.24, D_NEAR, [0, 0, 0])

  return seal(g, (t, a) => {
    /* 分针慢、时针更慢：“慢”就是这一屏要说的。选中时稍微快一点，
       但绝不满速 —— 它要是转得欢了，牌面说的就不是“更新慢”了 */
    minute.rotation.z = -t * (0.32 + a * 0.2)
    hour.rotation.z = -t * 0.09
    book.rotation.z = Math.sin(t * 0.5) * 0.03 * (0.3 + a)
    clock.position.y = 0.24 + Math.sin(t * 0.95) * 0.016
  })
}

/* ============================================================
 * 03 学情分析粗放 —— 知识掌握漏斗 + 底下三根还没长齐的柱
 * 首屏 AI 屏的「学情」工位用的就是漏斗，这里沿下来，
 * 让读过首屏的人在下一屏认出同一个记号。
 * ============================================================ */
export function createFunnelModel(m) {
  const g = new THREE.Group()
  g.add(halo(m.soft))

  /* 漏斗的嘴也得抬起来看：不抬的时候那一圈口沿在正交镜头下是一条
     0.018 厚的黑线，实拍读作「一根杠压在灰三角上」而不是一个容器 */
  const fu = new THREE.Group()
  fu.rotation.x = -0.4
  fu.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.075, 0.36, 28, 1, true), m.glass).translateY(0.12))
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.017, 8, 32), m.accent)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.3
  fu.add(rim)
  put(g, fu, 0, 0.03, D_MID)

  /* 四颗往里掉的点 = 每个学生 */
  const drops = []
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(GEO.dotSm, m.accent)
    put(g, d, (i - 1.5) * 0.12, 0.34 - i * 0.08, i % 2 ? D_FRONT : D_MID)
    drops.push(d)
  }

  /* 底下三根柱：高度各不相同，粗放的评估就是这样——只有三格。
     上一版中间那根正好接在漏斗的下料口上，两根叠成一个看不清的十字，
     所以柱往两边拉开、漏斗的尾巴直接不画 */
  const bars = []
  for (let i = 0; i < 3; i++) {
    const h = [0.13, 0.25, 0.18][i]
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.105, h, 0.05), i === 1 ? m.accent : m.light)
    put(g, b, (i - 1) * 0.2, -0.44 + h / 2, D_NEAR)
    bars.push({ mesh: b, h })
  }

  return seal(g, (t, a) => {
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]
      const p = (t * 0.36 + i * 0.25) % 1
      d.position.y = 0.34 - p * 0.5
      /* 漏斗越窄，点越往中轴挤 */
      d.position.x = (i - 1.5) * 0.12 * (1 - p * 0.85)
      d.scale.setScalar(1 - p * 0.3)
    }
    for (let i = 0; i < bars.length; i++) {
      const { mesh, h } = bars[i]
      const k = 1 + a * 0.35 + Math.sin(t * 1.4 + i) * 0.05 * (0.3 + a)
      mesh.scale.y = k
      mesh.position.y = -0.44 + (h * k) / 2
    }
    g.rotation.y = Math.sin(t * 0.36) * 0.12 * (0.3 + a)
  })
}

/* ============================================================
 * 04 产教衔接断裂 —— 两簇节点中间那截对不上的接口
 * 左边是学校、右边是产业，两簇都是满的；缺的是中间那一根。
 * 那枚飘在前面的插片会在选中的时候往缺口挪一步 —— 但还是没接上，
 * 「断裂」要靠差的那一点才读得出来。
 * ============================================================ */
export function createBridgeModel(m) {
  const g = new THREE.Group()
  g.add(halo(m.soft))

  /* 一根连杆：两端坐标算长度与朝向。用 Cylinder 而不是 Box，
     因为斜过来时 Box 会看到它的“侧面扁”，圆截面不管怎么转都是圆的 */
  const link = (p, q, mat) => {
    const a = new THREE.Vector2(p[0], p[1])
    const b = new THREE.Vector2(q[0], q[1])
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, a.distanceTo(b), 10), mat)
    mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0)
    mesh.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2
    return mesh
  }
  /* 一簇 = 一个主节点加两个次节点。主节点给得大一点，三颗一样大会读成一排钢珠 */
  const cluster = (pts, nodeMat, linkMat) => {
    const grp = new THREE.Group()
    for (let i = 0; i < pts.length; i++) {
      const s = new THREE.Mesh(GEO.dot, nodeMat)
      s.position.set(pts[i][0], pts[i][1], 0)
      s.scale.setScalar(i === 0 ? 1.5 : 1)
      grp.add(s)
      if (i) grp.add(link(pts[i - 1], pts[i], linkMat))
    }
    return grp
  }
  const L = [[-0.34, 0.17], [-0.45, -0.04], [-0.29, -0.22]]
  const R = [[0.34, 0.17], [0.45, -0.04], [0.29, -0.22]]
  put(g, cluster(L, m.body, m.body), 0, 0, D_MID)
  put(g, cluster(R, m.accent, m.accent), 0, 0, D_MID)
  const left = g.children[1]
  const right = g.children[2]
  /* 两簇各自伸向中间的那半根：差的就是中间那一截 */
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.22, 12), m.body), -0.16, 0, D_MID, [0, 0, Math.PI / 2])
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.22, 12), m.accent), 0.16, 0, D_MID, [0, 0, Math.PI / 2])

  /* 飘着的那枚插片：最前一层，选中时往缺口靠，但永远差一点 */
  const pin = new THREE.Group()
  pin.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.095, 0.06), m.light))
  pin.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.085, 12), m.light).rotateZ(-Math.PI / 2).translateX(0.12))
  pin.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.085, 12), m.light).rotateZ(Math.PI / 2).translateX(-0.12))
  put(g, pin, 0, 0.02, D_NEAR, [0, 0, 0.14])

  return seal(g, (t, a) => {
    /* 两簇反向往两边缩：选中时「断」得更明显 */
    left.position.x = -a * 0.05
    right.position.x = a * 0.05
    pin.position.x = a * 0.1 - 0.02
    pin.position.y = 0.02 + Math.sin(t * 0.9) * 0.022
    pin.rotation.z = 0.14 + Math.sin(t * 0.7) * 0.06
  })
}

/* ============================================================
 * 05 学生毕业难以就业 —— 公文包，和那份飘在外面递不出去的成果
 * 包是「岗位」，前面那张卡片是「可展示的工程成果」：它一直在够不着的前层。
 * ============================================================ */
export function createBriefcaseModel(m) {
  const g = new THREE.Group()
  g.add(halo(m.soft))

  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.44, 0.16), m.body), 0, -0.07, D_MID)
  /* 盖子那条缝与提手：没有这两样，它只是个蓝盒子 */
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.026, 0.17), m.soft), 0, 0.08, D_MID)
  put(g, new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.075, 0.05), m.accent), 0, 0.12, D_FRONT)
  put(g, new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.026, 8, 22, Math.PI), m.body), 0, 0.16, D_MID)

  /* 前置的简历卡：三行字 + 一条 accent 的题头 */
  const card = new THREE.Group()
  card.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.21, 0.022), m.light))
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.026, 0.024), m.accent)
  head.position.set(0, 0.06, 0.012)
  card.add(head)
  for (let i = 0; i < 2; i++) {
    const l = new THREE.Mesh(GEO.line, m.soft)
    l.scale.set(1.05 - i * 0.3, 0.62, 1)
    l.position.set(-0.02 * i, -0.01 - i * 0.055, 0.012)
    card.add(l)
  }
  put(g, card, 0.13, 0.29, D_NEAR, [0, 0, -0.2])

  return seal(g, (t, a) => {
    /* 选中的时候卡片往包口靠一点：递得近一点，但还在外面 */
    card.position.x = 0.13 - a * 0.09
    card.position.y = 0.29 + Math.sin(t * 1.05) * 0.026 - a * 0.04
    card.rotation.z = -0.2 + a * 0.16 + Math.sin(t * 0.8) * 0.03
    g.rotation.y = Math.sin(t * 0.4) * 0.09 * (0.3 + a)
  })
}

/* 五张牌按 DOM 顺序对应这五个工厂 —— Problems.jsx 按这个 key 取 */
export const PROBLEM_MODELS = [createFlaskModel, createCurriculumModel, createFunnelModel, createBridgeModel, createBriefcaseModel]
