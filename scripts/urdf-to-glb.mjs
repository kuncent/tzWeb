/**
 * 官方 URDF 资产 → 场景用 GLB（离线，构建期工具）
 * ------------------------------------------------------------
 * 为什么要这条管线：现场那三台 KUN 高模是「单网格 + 0 命名节点」，脸上的噪点
 * 和塌角在源文件里，不减面也救不回来（tmp/head-probe.mjs + 312k 面全精度对比
 * 都证过）。官方 unitree_ros 给的是**逐部件**的网格（H2 还带 Collada 材质），
 * 于是既能拿到干净的壳面，又保留了「哪块是头」的可寻址性。
 *
 * 干的事：读 URDF 关节树 → 按关节角摆位 → 逐部件读 .dae/.stl → 世界矩阵烘焙
 *   → 按材质合批 → Z_UP 转 Y_UP → 落地居中/定高 → GLB（可选：减面 + meshopt）。
 *
 * 用法：
 *   node scripts/urdf-to-glb.mjs H2                      # 只体检：bbox / 面数 / 材质
 *   BAKE=1 node scripts/urdf-to-glb.mjs H2               # 顺手出 public/models 成品
 *   TARGET=1.80 RATIO=0.12 node scripts/urdf-to-glb.mjs H2
 *   POSE="left_hip_roll_joint:0.08,right_hip_roll_joint:-0.08" node scripts/urdf-to-glb.mjs H2
 *   URDF=H2.urdf node scripts/urdf-to-glb.mjs H2         # 换 STL 那版描述
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Color, Euler, Matrix3, Matrix4, Quaternion, Vector3 } from 'three'
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, simplify, prune, meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { parseDae, parseStl, parseUrdf } from './collada-lite.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ASSETS = path.join(ROOT, 'tools', 'unitree_assets', 'robots')
const RAW_DIR = path.join(ROOT, 'tools', 'models-raw')
const OUT_DIR = path.join(ROOT, 'public', 'models')

const ID = (process.argv[2] || 'H2').toUpperCase()
const BAKE = process.env.BAKE === '1'
const RATIO = Number(process.env.RATIO || 0.12)
/* 减面误差预算（占包围盒最大边的比例）：本管线重算法线，画质主要由面数说话，
   所以预算给宽一点，让 TRIS 目标能真的跳住 */
const SIMP_ERROR = Number(process.env.ERROR || 0.005)
const TARGET = process.env.TARGET ? Number(process.env.TARGET) : null
/* BAKE 时一路不带法线：法线会让 weld 合不了点（STL 是三角汤，每面一个法线，
   同位置不同法线 → 合不上），拓扑不共享 meshopt 就减不动：H2 第一次只降到
   78.9%。所以上面只走位置，减完再按面积权重重算法线 */
const WANT_NRM = !BAKE
const URDF_ENV = process.env.URDF || ''
/* LIMIT=2 只装两个部件：定位“构建期卡死”时先用它把量压下去 */
const LIMIT = Number(process.env.LIMIT || 0)
/* TRIS=成品三角面预算：比 RATIO 好拍板 —— 现场那几台 hero 档在 50k 上下 */
const TRIS_TARGET = Number(process.env.TRIS || 0)
/* 计时日志写文件而不是 stdout：PowerShell 的重定向会把子进程输出扣到退出才吐，
   正好遮住“卡在 which 阶段”这件事 */
const TICK = process.env.DAE_DEBUG
  ? ((s) => (m) => fs.appendFileSync(path.join(ROOT, 'tmp', 'urdf-tick.log'), `[${(performance.now() - s).toFixed(0)}ms] ${m}\n`))(performance.now())
  : () => {}

/**
 * 机型表：kind 决定材质来源 —— dae 有 C4D 导出的 blinn 颜色，stl 只能靠部件名猜。
 * h 是真机高度（米），TARGET 不给就用它，保证「1.8m 的 H2 不会缩成 G1 的身板」。
 */
const MACHINES = {
  H2: { dir: 'h2_description', urdf: 'H2_dae.urdf', kind: 'dae', h: 1.80, out: 'h2-official', human: true },
  GO2: { dir: 'go2_description', urdf: 'urdf/go2_description.urdf', kind: 'dae', h: 0.40, out: 'go2-official', dog: true },
  Z1: { dir: 'z1_description', urdf: 'xacro/z1.urdf', kind: 'dae', h: 0.70, out: 'z1-official' },
  B2: { dir: 'b2_description', urdf: 'urdf/b2_description.urdf', kind: 'dae', h: 0.70, out: 'b2-official', dog: true },
  R1: { dir: 'r1_description', urdf: 'R1.urdf', kind: 'stl', h: 1.15, out: 'r1-official', human: true },
  AS2: { dir: 'as2_description', urdf: 'urdf/as2.urdf', kind: 'stl', h: 0.40, out: 'as2-official', dog: true },
  /* G1 只有 STL（173 个）没有 DAE —— 颜色全靠 URDF 内联 material 或部件名推 */
  G1: { dir: 'g1_description', urdf: 'g1_29dof.urdf', kind: 'stl', h: 1.32, out: 'g1-official', human: true },
}

/* 四足关节角全 0 时是一条“直腿海星”，定高后躯干会浮在一米上。
   官方 URDF 只给行程不给默认位，所以这里按关节名补一个站姿。 */
const DOG_STAND = [[/calf/i, -1.5], [/thigh/i, 0.75]]
/* 人形零位是“军姿并腿”，手臂贴住躯干会糊成一块（实拍验过）：
   肩外掠开一点 + 肘微弯，既分开轮廓又不破坏“站直”的读法 */
const HUMAN_STAND = [[/shoulder_roll/i, 0.16], [/elbow/i, 0.12]]

/* STL 没有材质：按部件名给色。顺序敏感 —— 先具体后泛化 */
const STL_MAT = [
  [/foot|tire|wheel|rubber/i, { rgb: [0.05, 0.05, 0.06], rough: 0.85, metal: 0.0 }],
  [/hand|finger|dex/i, { rgb: [0.55, 0.57, 0.6], rough: 0.5, metal: 0.15 }],
  [/head|torso|chest|pelvis|base|link_1|shell|cover/i, { rgb: [0.78, 0.8, 0.84], rough: 0.42, metal: 0.05 }],
  [/hip|knee|ankle|shoulder|elbow|wrist|thigh|calf|arm|leg/i, { rgb: [0.24, 0.25, 0.27], rough: 0.38, metal: 0.6 }],
]
const STL_DEFAULT = { rgb: [0.35, 0.37, 0.4], rough: 0.45, metal: 0.35 }
/* URDF 只给了颜色没给质感时按明度给一档：白壳走漆塑料（metal 0），深色走阳极氧化铝。
   直接沿部件名猜的那套会出事：G1 的 shoulder 既在 /arm|shoulder/ 里（metal 0.6）
   又被 URDF 涂成 white → 一块金属白漆壳在暗环境里发灰发油，而且同一个 white
   会因部件名不同裂成七档材质（实测量：G1 一次烘出 7 组） */
const finishByLum = (rgb) => {
  const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
  return lum > 0.5 ? { rough: 0.34, metal: 0.05 } : { rough: 0.45, metal: 0.22 }
}

const M = MACHINES[ID]
if (!M) {
  console.error(`未知机型 ${ID}，可选：${Object.keys(MACHINES).join(' / ')}`)
  process.exit(1)
}

/* ―――――――――――――――― 1. 读描述、摆姿势 ―――――――――――――――― */

const machineDir = path.join(ASSETS, M.dir)
const urdfPath = path.join(machineDir, URDF_ENV || M.urdf)
if (!fs.existsSync(urdfPath)) {
  console.error(`缺 URDF：${urdfPath}\n（先跑 node tmp/fetch-assets.mjs get ${M.dir}）`)
  process.exit(1)
}
const urdf = parseUrdf(fs.readFileSync(urdfPath, 'utf8'))

const POSE = {}
for (const kv of (process.env.POSE || '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':')
  if (k && v !== undefined) POSE[k.trim()] = Number(v)
}

/* 关节树：root = 从没当过 child 的 link */
const childOf = new Map()
const kids = new Map()
for (const j of urdf.joints) {
  childOf.set(j.child, j)
  if (!kids.has(j.parent)) kids.set(j.parent, [])
  kids.get(j.parent).push(j)
}
const parents = new Set(urdf.joints.map((j) => j.parent))
let root = [...parents].find((p) => !childOf.has(p))
if (!root) root = [...urdf.links.keys()][0]

/* URDF 的 rpy 是「绕固定轴 X→Y→Z」，等价于矩阵 Rz·Ry·Rx —— three 里对应
   order 'ZYX'。写成 'XYZ' 会得到 Rx·Ry·Rz，腿的 -30° 外撇会跑到大腿上，
   整机歪成醉汉（这个坑用 H2 的 hip rpy 一眼能看出来） */
const rpyQuat = (rpy) => new Quaternion().setFromEuler(new Euler(rpy[0], rpy[1], rpy[2], 'ZYX'))

const placed = [] /* { link, file, scale, material, matrix } */
{
  const seen = new Set()
  const walk = (name, M0) => {
    if (seen.has(name)) return /* URDF 不该有环，但官方文件里有重复挂接的写法 */
    seen.add(name)
    for (const v of urdf.links.get(name) || []) {
      placed.push({ link: name, file: v.file, scale: v.scale, urdfMaterials: v.materials, matrix: M0.clone() })
    }
    for (const j of kids.get(name) || []) {
      const origin = new Matrix4().compose(new Vector3(...j.xyz), rpyQuat(j.rpy), new Vector3(1, 1, 1))
      /* 优先级：命令行 POSE > URDF 自带 default > 站姿兵补位；最后夹进行程 */
      const AUTO = M.dog ? DOG_STAND : M.human ? HUMAN_STAND : []
      const auto = AUTO.find(([re]) => re.test(j.name))?.[1] ?? 0
      let q = POSE[j.name] ?? (j.home || auto)
      if (j.lower !== null) q = Math.min(Math.max(q, j.lower), j.upper)
      const axis = new Vector3(...j.axis)
      const rot = axis.lengthSq() > 1e-9 && j.type !== 'fixed' ? new Matrix4().makeRotationAxis(axis.normalize(), q) : new Matrix4()
      walk(j.child, new Matrix4().copy(M0).multiply(origin).multiply(rot))
    }
  }
  walk(root, new Matrix4())
}
TICK(`walk 完成：placed=${placed.length} links=${urdf.links.size} joints=${urdf.joints.length} root=${root}`)
/* DUMP=1 打每个 link 原点在 URDF 空间的位置：整机“碎成一地”时先看是不是某个
   joint 的 xyz/rpy 读歪了 —— 比对着 3D 截图猜快得多 */
if (process.env.DUMP === '1') {
  for (const it of placed) {
    const t = new Vector3().setFromMatrixPosition(it.matrix)
    console.log(`  ${it.link.padEnd(30)} ${[t.x, t.y, t.z].map((v) => v.toFixed(3).padStart(7)).join(' ')}  ${it.file}`)
  }
}

/* ―――――――――――――――― 2. 逐部件读网格 ―――――――――――――――― */

const meshCache = new Map()
/** URDF 的 filename 有两种写法：H2 给相对路径 meshes/x.dae，GO2/Z1 给包内路径
    dae/x.dae，而 urdf 文件在子目录 urdf/ 里 —— 只按 urdf 同级解就会全部落空，
    必须再回退到机型根目录试一次 */
function resolveMesh(rel) {
  const dir = path.dirname(urdfPath)
  for (const c of [path.resolve(dir, rel), path.resolve(machineDir, rel)]) {
    if (fs.existsSync(c)) return c
  }
  return null
}
function loadMesh(rel) {
  if (meshCache.has(rel)) return meshCache.get(rel)
  const abs = resolveMesh(rel)
  if (!abs) {
    meshCache.set(rel, null)
    return null
  }
  if (/\.dae$/i.test(abs)) {
    const d = parseDae(fs.readFileSync(abs, 'utf8'))
    meshCache.set(rel, { kind: 'dae', ...d, file: path.basename(abs) })
  } else {
    const s = parseStl(fs.readFileSync(abs))
    meshCache.set(rel, {
      kind: 'stl',
      file: path.basename(abs),
      parts: [{ matrix: new Matrix4(), primitives: [{ material: '', position: s.position, normal: s.normal, index: null }] }],
      effects: new Map(),
    })
  }
  return meshCache.get(rel)
}

/* 材质按「颜色签名」合批：同一台机器里 ID2/ID4 这类 C4D 编号跨文件会撞号
   （head_yaw 的 ID2 和 hand 的 ID2 不是一个东西），但同色的必须合成一份，
   否则 34 个部件 = 34 个 GLTF 材质，逐件 draw call 白涨一倍 */
const matByKey = new Map()
function effectMat(effect, fallback) {
  const src = effect || fallback
  const rgb = src.rgb || [0.5, 0.5, 0.5]
  const rough = src.rough ?? 0.5
  const metal = src.metal ?? 0
  const key = `${rgb.map((v) => v.toFixed(3)).join(',')}|${rough.toFixed(2)}|${metal.toFixed(2)}`
  if (matByKey.has(key)) return matByKey.get(key)
  const c = new Color().setRGB(rgb[0], rgb[1], rgb[2]) /* sRGB 显示值 → linear 工作值 */
  const rec = { key, base: [c.r, c.g, c.b, src.alpha ?? 1], rough, metal, tris: 0, name: src.name || key }
  matByKey.set(key, rec)
  return rec
}

const groups = new Map() /* matKey → { pos, nrm, idx, mat, links:Set } */
const linkBox = new Map() /* link → 世界盒（用来核对头/躯干位置，也用来确认坐标系转换没歪） */
let missing = 0
let loadedParts = 0

const toYup = new Matrix4().makeRotationX(-Math.PI / 2) /* URDF Z_UP → glTF Y_UP */
const nmTmp = new Matrix3()
const items = LIMIT ? placed.slice(0, LIMIT) : placed
for (const item of items) {
  const mesh = loadMesh(item.file)
  TICK(`${item.link} ${item.file}`)
  if (!mesh) { missing++; continue }
  /* link 世界矩阵（含 URDF 的 <mesh scale>）；再乘 toYup 落到 glTF 上方向 */
  const local = new Matrix4().makeScale(item.scale[0] || 1, item.scale[1] || 1, item.scale[2] || 1)
  const world = new Matrix4().copy(toYup).multiply(item.matrix).multiply(local)
  const normalM = nmTmp.getNormalMatrix(world)

  for (const part of mesh.parts) {
    const pm = new Matrix4().copy(world).multiply(part.matrix)
    const pn = new Matrix3().getNormalMatrix(pm)
    for (const prim of part.primitives) {
      /* URDF 内联材质色：一个 visual 挂几档材质时按下标对位（对不上就用首档），
         名字里没 rgba 的再拿去全局 materials 表里找 */
      const mList = item.urdfMaterials || []
      const mm = mList[part.primitives.indexOf(prim)] || mList[0]
      const urdfRgb = (mm?.rgba || (mm?.name && urdf.materials.get(mm.name)) || null) || undefined
      /* 部件名推断的兼容档：STL 只能靠它，DAE 在「没上色」时也回退到这里 */
      const guessHit = STL_MAT.find(([re]) => re.test(item.link))
      const guess = { ...(guessHit ? guessHit[1] : STL_DEFAULT), name: `stl_${item.link.replace(/_link$/i, '')}` }
      /* URDF 涂了色就用它的色；质感只认「胶粒/轮胎」这类名字（橡胶哑光与颜色无关），
         其余一律按明度走一档 —— 不然 G1 的 white 会因部件名落在
         shoulder/torso/foot 三档里而裂成七份材质，draw call 白涨一倍 */
      const rubber = /foot|tire|wheel|rubber/i.test(item.link)
      const fromUrdf = (rgb, name) => ({
        ...(rubber ? { rough: guess.rough, metal: guess.metal } : finishByLum(rgb)),
        rgb: rgb.slice(0, 3),
        name: name || guess.name,
      })
      let mat
      if (mesh.kind === 'dae') {
        const e = mesh.effects.get(prim.material)
        const d = e && e.diffuse
        /* C4D 的 DefaultMaterial 把 diffuse 写成 1,1,1 —— 那是「根本没上色」，
           不是白壳：直接烘成纯白会在灯下烤糊，退到按部件名猜色更贴实机 */
        const painted = d && !(d[0] >= 0.985 && d[1] >= 0.985 && d[2] >= 0.985)
        mat = effectMat(
          painted && {
            rgb: d.slice(0, 3),
            alpha: d[3] ?? 1,
            /* C4D 的 shininess 是 0..1 归一值，不是 Blinn 指数：0.5 → 半光，
               0.85 → 亮壳。直接当指数用会得到一块磨砂塑料 */
            rough: Math.min(0.8, Math.max(0.22, 0.68 - (e.shininess ?? 0.5) * 0.45)),
            metal: 0.0,
            name: mm?.name || `dae_${e.name}`,
          },
          urdfRgb ? fromUrdf(urdfRgb, mm?.name) : guess,
        )
      } else {
        mat = effectMat(urdfRgb ? fromUrdf(urdfRgb, mm?.name) : guess)
      }

      let g = groups.get(mat.key)
      if (!g) {
        g = { mat, pos: [], nrm: [], idx: [], links: new Set() }
        groups.set(mat.key, g)
      }
      g.links.add(item.link)

      const base = g.pos.length / 3
      const p = prim.position
      const n = prim.normal
      const v = new Vector3()
      const nv = new Vector3()
      const bb = linkBox.get(item.link) || { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] }
      /* 逐顶点变换 + 包围盒一次扫完。这里不能开第二轮：H2 一台 240 万角点，
         而 [x,y,z].forEach() 每个顶点还要分配一个数组 —— GC 能吃到分钟级 */
      for (let i = 0; i < p.length; i += 3) {
        v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(pm)
        g.pos.push(v.x, v.y, v.z)
        if (bb.min[0] > v.x) bb.min[0] = v.x
        if (bb.max[0] < v.x) bb.max[0] = v.x
        if (bb.min[1] > v.y) bb.min[1] = v.y
        if (bb.max[1] < v.y) bb.max[1] = v.y
        if (bb.min[2] > v.z) bb.min[2] = v.z
        if (bb.max[2] < v.z) bb.max[2] = v.z
        if (WANT_NRM && n) {
          nv.set(n[i], n[i + 1], n[i + 2]).applyMatrix3(pn).normalize()
          g.nrm.push(nv.x, nv.y, nv.z)
        }
      }
      linkBox.set(item.link, bb)
      const triCount = prim.index ? prim.index.length / 3 : p.length / 9
      mat.tris += triCount
      if (prim.index) for (const x of prim.index) g.idx.push(x + base)
      else for (let k = 0; k < p.length / 3; k++) g.idx.push(base + k)

      /* 没带法线源、又确实要写法线（非 BAKE）时补平法线：每 3 个顶点一张面 */
      if (WANT_NRM && !n) {
        const a = new Vector3()
        const b = new Vector3()
        const c = new Vector3()
        const ab = new Vector3()
        const ac = new Vector3()
        for (let i = base; i < g.pos.length / 3; i += 3) {
          a.fromArray(g.pos, i * 3)
          b.fromArray(g.pos, (i + 1) * 3)
          c.fromArray(g.pos, (i + 2) * 3)
          ab.subVectors(b, a)
          ac.subVectors(c, a)
          nv.crossVectors(ab, ac).normalize()
          for (let k = 0; k < 3; k++) g.nrm.push(nv.x, nv.y, nv.z)
        }
      }
      loadedParts++
    }
  }
}

if (!groups.size) {
  console.error('一个三角面都没读到 —— 检查 ONLY 过滤是否把网格文件漏掉了')
  process.exit(1)
}
if (process.env.DUMP === '1') {
  console.log('单件包围盒（glTF 空间，按纵深 z 跨度排序 —— 哪件轴转错了看这里）：')
  const rows = [...linkBox.entries()].map(([n, b]) => ({
    n,
    s: [0, 1, 2].map((k) => b.max[k] - b.min[k]),
    c: [0, 1, 2].map((k) => (b.max[k] + b.min[k]) / 2),
  }))
  for (const r of rows.sort((a, b) => b.s[2] - a.s[2]).slice(0, 10)) {
    console.log(`  ${r.n.padEnd(30)} 尺 ${r.s.map((v) => v.toFixed(2).padStart(5)).join('×')} 心 ${r.c.map((v) => v.toFixed(2).padStart(6)).join(',')}`)
  }
}

/* ―――――――――――――――― 3. 落地 / 居中 / 定高 ―――――――――――――――― */

const box = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] }
for (const g of groups.values()) {
  for (let i = 0; i < g.pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const c = g.pos[i + k]
      if (c < box.min[k]) box.min[k] = c
      if (c > box.max[k]) box.max[k] = c
    }
  }
}
const span = box.max.map((v, k) => v - box.min[k])
const scale = TARGET ? TARGET / span[1] : (M.h ? M.h / span[1] : 1)
const cx = (box.min[0] + box.max[0]) / 2
const cz = (box.min[2] + box.max[2]) / 2
for (const g of groups.values()) {
  for (let i = 0; i < g.pos.length; i += 3) {
    g.pos[i] = (g.pos[i] - cx) * scale
    g.pos[i + 1] = (g.pos[i + 1] - box.min[1]) * scale
    g.pos[i + 2] = (g.pos[i + 2] - cz) * scale
  }
  /* 法线归一单独一轮：上一版把它写进了顶点循环里，124k 顶点×124k 法线
     = 150 亿次迭代，构建直接看起像死锁 */
  for (let k = 0; k < g.nrm.length; k += 3) {
    const l = Math.hypot(g.nrm[k], g.nrm[k + 1], g.nrm[k + 2]) || 1
    g.nrm[k] /= l
    g.nrm[k + 1] /= l
    g.nrm[k + 2] /= l
  }
}

/* ―――――――――――――――― 4. 体检报告 ―――――――――――――――― */

const totalTris = [...matByKey.values()].reduce((a, m) => a + m.tris, 0)
console.log(`${ID}  urdf=${path.basename(urdfPath)}  kind=${M.kind}  root=${root}`)
console.log(`部件 ${placed.length} 个（读到网格 ${loadedParts}，缺文件 ${missing}）  三角面 ${totalTris}`)
console.log(`机身 ${span.map((v) => v.toFixed(3)).join(' × ')} m  → 定高系数 ${scale.toFixed(3)}`)
console.log(`成品包围盒 高 ${((box.max[1] - box.min[1]) * scale).toFixed(3)}m  宽 ${(span[0] * scale).toFixed(3)}m  厚 ${(span[2] * scale).toFixed(3)}m`)
console.log('材质：')
for (const g of [...groups.values()].sort((a, b) => b.pos.length - a.pos.length)) {
  const t = g.idx.length / 3
  console.log(
    `  ${g.mat.name.padEnd(16)} ${String(t).padStart(7)}tris  base=${g.mat.base.map((v) => v.toFixed(2)).join(',')}  ` +
      `rough=${g.mat.rough.toFixed(2)} metal=${g.mat.metal.toFixed(2)}  links=${g.links.size}`,
  )
}
console.log('关键部件高度带（定高后、未落地的相对值，用来看坐标转换有没有歪）：')
const tops = [...linkBox.entries()]
  .map(([n, b]) => ({ n, top: (b.max[1] - box.min[1]) * scale, h: (b.max[1] - b.min[1]) * scale }))
  .sort((a, b) => b.top - a.top)
  .slice(0, 6)
console.log('最高 6 个部件：', tops.map((x) => `${x.n}@${x.top.toFixed(2)}m`).join('  '))
console.log('最低 3 个部件：', [...linkBox.entries()].map(([n, b]) => ({ n, bot: (b.min[1] - box.min[1]) * scale })).sort((a, b) => a.bot - b.bot).slice(0, 3).map((x) => `${x.n}@${x.bot.toFixed(2)}m`).join('  '))

/* ―――――――――――――――― 5. 写 GLB ―――――――――――――――― */

const doc = new Document()
/* 二进制资源必须挂在某个 Buffer 上，否则 NodeIO.write 直接报
   "Buffer required for Document resources"（v3 不会自动建根缓冲） */
const buffer = doc.createBuffer(`${ID}_buf`)
const scene = doc.createScene(ID)
const mesh = doc.createMesh(ID)
for (const g of groups.values()) {
  const m = doc
    .createMaterial(g.mat.name)
    .setBaseColorFactor(g.mat.base)
    .setRoughnessFactor(g.mat.rough)
    .setMetallicFactor(g.mat.metal)
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor('', buffer).setType('VEC3').setArray(new Float32Array(g.pos)))
    .setIndices(doc.createAccessor('', buffer).setType('SCALAR').setArray(new Uint32Array(g.idx)))
    .setMaterial(m)
  if (g.nrm.length) prim.setAttribute('NORMAL', doc.createAccessor('', buffer).setType('VEC3').setArray(new Float32Array(g.nrm)))
  mesh.addPrimitive(prim)
}
const node = doc.createNode(ID).setMesh(mesh)
scene.addChild(node)

fs.mkdirSync(RAW_DIR, { recursive: true })
const rawFile = path.join(RAW_DIR, `${M.out}.glb`)
TICK('开始写 GLB')
/* gltf-transform v3 的 NodeIO 只有 read/write（writeFile 是 v4 才有的） */
await new NodeIO().write(rawFile, doc)
TICK('GLB 写完')
console.log(`\n原始 GLB → ${path.relative(ROOT, rawFile)}  ${(fs.statSync(rawFile).size / 1048576).toFixed(2)}MB`)

/** 减面后重算法线：用未归一的叉积累加 = 天然按面积加权，最后统一归一。
    放在 simplify 之后而不是之前：减面会把原法线的硬边一起磨掉，直接沿用旧法线
    只会得到一张“光滑过头”的塑料壳 */
function recomputeNormals(doc) {
  let fixed = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      if (!pos) continue
      const idx = prim.getIndices()
      const p = pos.getArray()
      const count = pos.getCount()
      const n = new Float32Array(count * 3)
      const triCount = idx ? idx.getCount() : count
      for (let t = 0; t + 2 < triCount; t += 3) {
        const a = idx ? idx.getScalar(t) : t
        const b = idx ? idx.getScalar(t + 1) : t + 1
        const c = idx ? idx.getScalar(t + 2) : t + 2
        const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2]
        const e1x = p[b * 3] - ax, e1y = p[b * 3 + 1] - ay, e1z = p[b * 3 + 2] - az
        const e2x = p[c * 3] - ax, e2y = p[c * 3 + 1] - ay, e2z = p[c * 3 + 2] - az
        const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x
        n[a * 3] += nx; n[a * 3 + 1] += ny; n[a * 3 + 2] += nz
        n[b * 3] += nx; n[b * 3 + 1] += ny; n[b * 3 + 2] += nz
        n[c * 3] += nx; n[c * 3 + 1] += ny; n[c * 3 + 2] += nz
      }
      for (let i = 0; i < count; i++) {
        const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2])
        if (l > 1e-8) { n[i * 3] /= l; n[i * 3 + 1] /= l; n[i * 3 + 2] /= l }
        else { n[i * 3 + 1] = 1 } /* 退化顶点（累加相消）给个朝上的法线，避免 NaN 把整块染黑 */
      }
      const acc = doc.createAccessor().setType('VEC3').setArray(n)
      acc.setBuffer(pos.getBuffer() || doc.createBuffer())
      prim.setAttribute('NORMAL', acc)
      fixed++
    }
  }
  return fixed
}

if (BAKE) {
  await MeshoptEncoder.ready
  await MeshoptSimplifier.ready
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
  const before = totalTris
  const ratio = TRIS_TARGET ? Math.min(1, TRIS_TARGET / before) : RATIO
  await doc.transform(
    weld({ overwrite: true }),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: SIMP_ERROR }),
    prune({ keepSolid: true }),
  )
  const nrmPrims = recomputeNormals(doc)
  await doc.transform(meshopt({ encoder: MeshoptEncoder }))
  let after = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices()
      after += idx ? idx.getCount() / 3 : (prim.getAttribute('POSITION')?.getCount() || 0) / 3
    }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const outFile = path.join(OUT_DIR, `${M.out}.glb`)
  await io.write(outFile, doc)
  /* 实到面数要报出来：meshopt 的 error 是「占包围盒最大边的比例」，超预算它就
     提前停手。只看 RATIO 会误以为减到了，H2 第一次就 0.11 → 实到 80% */
  console.log(`成品 GLB → ${path.relative(ROOT, outFile)}  ${(fs.statSync(outFile).size / 1048576).toFixed(2)}MB  tris ${before} → ${Math.round(after)} (${((after / before) * 100).toFixed(1)}%)  重算法线 ${nrmPrims} 组`)
  void io
}
