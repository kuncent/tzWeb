/**
 * 极简 Collada(.dae) / STL 读取器 —— 只为「官方 URDF 资产 → GLB」这条离线管线服务。
 * ------------------------------------------------------------
 * 为什么不直接用 three 自带的 ColladaLoader：它依赖全局 DOMParser，而 Node 22
 * 没有实现（浏览器才有），examples/jsm 那份在离线脚本里跑不起来；为了一个
 * 构建期工具去加 xml 依赖又不值得。好在这批 .dae 全是 Cinema 4D 导出器写的
 * 规整结构（单 geometry、polylist + vcount 全是 3、effect 只有 blinn 颜色），
 * 按标签扫一遍就够，不需要完整的 XML 树。
 *
 * 坐标系：转换藏在 visual_scene 的节点变换里 —— C4D 导出的 H2 写
 * <rotate sid="rotateX">1 0 0 90</rotate>，Blender 导出的 Go2/B2 写单个
 * <matrix sid="transform">，两者反推都等于 Rx(+90)，正好把几何落到 URDF 的
 * Z_UP 部件系。所以 parseDae 直接返回节点矩阵，装配阶段完全按 URDF 语义走，
 * 最后一刀统一转到 GLB 的 Y_UP。（<up_axis> 声明在这批文件里不可信，别拿它补刀。）
 */
import { Matrix4, Vector3, Euler } from 'three'

/**
 * 快速浮点扫描。为什么不用 split().map(Number)：H2 一台的 34 个 .dae 里，
 * float_array + <p> 合计约 5M 个数，拆字符串要先造 5M 个临时 string，
 * 实测 30MB 资产跑 4 分钟不收敛；逐字符扫零分配，同样的量秒级。
 * 得认科学计数（C4D 会写 3.15711e-05），不然法线里的小值会被当成 0。
 */
function scan(str) {
  const n = str.length
  let buf = new Float64Array(Math.max(16, (n / 9) | 0))
  let k = 0
  let i = 0
  while (i < n) {
    let c = str.charCodeAt(i)
    while (c === 32 || c === 9 || c === 10 || c === 13 || c === 44) { i++; c = str.charCodeAt(i) }
    if (i >= n) break
    let sign = 1
    if (c === 45) { sign = -1; i++; c = str.charCodeAt(i) } else if (c === 43) { i++; c = str.charCodeAt(i) }
    let v = 0
    while (c >= 48 && c <= 57) { v = v * 10 + (c - 48); i++; c = str.charCodeAt(i) }
    if (c === 46) {
      let mul = 0.1
      i++
      c = str.charCodeAt(i)
      while (c >= 48 && c <= 57) { v += (c - 48) * mul; mul *= 0.1; i++; c = str.charCodeAt(i) }
    }
    if (c === 101 || c === 69) {
      let es = 1
      let ed = 0
      i++
      c = str.charCodeAt(i)
      if (c === 45) { es = -1; i++; c = str.charCodeAt(i) } else if (c === 43) { i++; c = str.charCodeAt(i) }
      while (c >= 48 && c <= 57) { ed = ed * 10 + (c - 48); i++; c = str.charCodeAt(i) }
      v *= 10 ** (es * ed)
    }
    if (k === buf.length) {
      const bigger = new Float64Array(buf.length * 2)
      bigger.set(buf)
      buf = bigger
    }
    buf[k++] = sign * v
  }
  return buf.subarray(0, k)
}
const NUM = (s) => (s ? Array.from(scan(s)) : [])
const attr = (tag, name) => {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]*)"`).exec(tag)
  return m ? m[1] : null
}
/** 取 <tag ...> … </tag> 的内容；自闭合返回 null */
function* blocks(text, tag) {
  const re = new RegExp(`<${tag}(\\s[^>]*?)?(/?)>`, 'g')
  let m
  while ((m = re.exec(text))) {
    if (m[2] === '/') { yield { open: m[0], body: '', self: true }; continue }
    const close = text.indexOf(`</${tag}>`, re.lastIndex)
    if (close < 0) return
    yield { open: m[0], body: text.slice(re.lastIndex, close), self: false }
    re.lastIndex = close + tag.length + 3
  }
}

/* ―――――――――――――――――――――― Collada ―――――――――――――――――――――― */

/** effect id → { diffuse, specular, shininess }（blinn/phong/lambert 通用取法）
    <color sid="diffuse"> 是 C4D 导出器的写法，标签带属性 —— 正则写死 <color>
    会整批改不到，手/腕那几块就退成中灰（实测 DefaultMaterial 就是这样丢的） */
function readEffects(text) {
  const out = new Map()
  for (const e of blocks(text, 'effect')) {
    const id = attr(e.open, 'id')
    if (!id) continue
    const grab = (name) => {
      const m = new RegExp(`<${name}>\\s*<color[^>]*>([^<]*)</color>`, 'i').exec(e.body)
        || new RegExp(`<${name}>[\\s\\S]*?<float[^>]*>([^<]*)</float>`, 'i').exec(e.body)
      return m ? NUM(m[1]) : null
    }
    out.set(id, { name: attr(e.open, 'name') || id, diffuse: grab('diffuse'), specular: grab('specular'), shininess: grab('shininess')?.[0] ?? 0.5 })
  }
  return out
}

/** material id → effect id：<instance_material target="#ID3"> 指的是 material，
    而颜色存在 effect 上。少了这一层中转，所有部件都会退到默认灰 */
function readMaterials(text) {
  const out = new Map()
  const start = text.indexOf('<library_materials')
  if (start < 0) return out
  const sect = text.slice(start, text.indexOf('</library_materials>', start))
  for (const m of blocks(sect, 'material')) {
    const id = attr(m.open, 'id')
    const eff = m.body && /<instance_effect[^>]*url="#([^"]+)"/.exec(m.body)
    if (id && eff) out.set(id, eff[1])
  }
  return out
}

/** source id → { arr, count, stride }；float_array 可能是 LongName（空格分隔） */
function readSources(section) {
  const map = new Map()
  for (const s of blocks(section, 'source')) {
    const id = attr(s.open, 'id')
    if (!id) continue
    const fa = /<float_array\s+([^>]*?)>([\s\S]*?)<\/float_array>/.exec(s.body)
    if (!fa) continue
    const acc = /<accessor\s+([^>]*?)>/.exec(s.body)
    const count = Number(attr(fa[1], 'count') || attr(acc?.[1] || '', 'count'))
    const stride = Number(attr(acc?.[1] || '', 'stride') || 3)
    map.set(id, { arr: scan(fa[2]), count, stride })
  }
  return map
}

/**
 * 一个 primitive → 位置/法线/UV/索引。
 * polylist 的 <p> 是「按 stride 交错」的分量下标，而 C4D 导出的下标有时直接就是
 * 元素下标 —— 不猜，用最大值判出来（resolveIdx）。
 * matSym 由调用方从**开标签**上取：<polylist count="…" material="Material1"> 的
 * material 在尖括号里，body 是从 '>' 之后开始的，从 body 里永远扫不到它。
 */
function readPrimitive(body, sources, vertices, matSym) {
  const inputs = []
  for (const i of blocks(body, 'input')) {
    if (!i.self) continue
    const semantic = attr(i.open, 'semantic')
    const src = (attr(i.open, 'source') || '').replace('#', '')
    const offset = Number(attr(i.open, 'offset'))
    if (!semantic || !src || Number.isNaN(offset)) continue
    if (semantic === 'VERTEX') {
      const pos = vertices.get(src) /* vertices 里唯一一条：POSITION 的 source id */
      if (pos) inputs.push({ semantic, offset, src: pos })
    } else {
      const s = sources.get(src)
      if (s) inputs.push({ semantic, offset, src: s })
    }
  }
  const vc = /<vcount>([\s\S]*?)<\/vcount>/.exec(body)
  const p = /<p>([\s\S]*?)<\/p>/.exec(body)
  if (!p) return null

  const flat = scan(p[1])
  const counts = vc ? scan(vc[1]) : null /* vcount 缺省 = 全三角形 */
  if (!inputs.length) return null

  /* polylist 的每个顶点由 step 个分量交错描述，step = 最大 offset + 1 */
  const step = Math.max(...inputs.map((i) => i.offset)) + 1
  const posIn = inputs.find((m) => m.semantic === 'VERTEX' || m.semantic === 'POSITION')
  if (!posIn) return null
  const nrmIn = inputs.find((m) => m.semantic === 'NORMAL')

  /* 索引约定判定：同一 offset 位置上扫出最大原始下标 —— 小于元素数就是「元素
     下标」（要乘 stride），否则导出器已经直接给了「分量下标」。C4D 给前者，
     部分 Blender 导出给后者，写死一种就会有一半部件错位。 */
  const maxAt = (offset) => { let a = 0; for (let k = offset; k < flat.length; k += step) if (flat[k] > a) a = flat[k]; return a }
  const mulOf = (inp) => (maxAt(inp.offset) < inp.src.count ? inp.src.stride : 1)
  const mP = mulOf(posIn)
  const mN = nrmIn ? mulOf(nrmIn) : 0

  const faces = counts ? counts.length : Math.floor(flat.length / (step * 3))
  /* 不走去重：这里要是去重就得给每个角点算一个组合键（5M 个字符串），比后面
     gltf-transform 的 weld 慢一个量级。先按角点展开、让 weld 去焊，代价只是
     中间产物胖三倍 */
  let cornerTotal = 0
  let triTotal = 0
  for (let f = 0; f < faces; f++) {
    const n = counts ? counts[f] : 3
    cornerTotal += n
    triTotal += n > 2 ? n - 2 : 0
  }
  const position = new Float32Array(cornerTotal * 3)
  const normal = mN ? new Float32Array(cornerTotal * 3) : null
  const index = new Uint32Array(triTotal * 3)
  const pArr = posIn.src.arr
  const nArr = nrmIn ? nrmIn.src.arr : null
  const pOff = posIn.offset
  const nOff = nrmIn ? nrmIn.offset : 0
  let vi = 0
  let ii = 0
  let cursor = 0
  for (let f = 0; f < faces; f++) {
    const n = counts ? counts[f] : 3
    const start = vi
    for (let v = 0; v < n; v++, vi++) {
      const base = cursor + v * step
      const o = vi * 3
      const ip = flat[base + pOff] * mP
      position[o] = pArr[ip]
      position[o + 1] = pArr[ip + 1]
      position[o + 2] = pArr[ip + 2]
      if (normal) {
        const iN = flat[base + nOff] * mN
        normal[o] = nArr[iN]
        normal[o + 1] = nArr[iN + 1]
        normal[o + 2] = nArr[iN + 2]
      }
    }
    /* 扇形剖分：这批文件 vcount 全是 3，但导出器不保证 */
    for (let v = 1; v < n - 1; v++) {
      index[ii++] = start
      index[ii++] = start + v
      index[ii++] = start + v + 1
    }
    cursor += n * step
  }
  return {
    material: matSym || '',
    position,
    normal,
    /* 角点展开后顶点号就是连续的，这里直接给下标段（Uint32Array，装配时只读） */
    index,
    tris: triTotal,
  }
}

/**
 * 视觉场景节点的变换。必须按文档顺序左乘：C4D 导出的是
 * translate → rotateY → rotateX → rotateZ → scale，按类型分三轮扫会把
 * 90° 的 X 转置排到了 Y 之后，整个部件歪 90°。
 * Blender 系（Go2/Z1/B2）只写一个 <matrix sid="transform">：不接这个分支的话
 * 节点就是单位阵，四肢会脱离躯干“满天飞”（实拍验过）。Collada 的 matrix 是
 * 行主序，three 的 fromArray 是列主序 —— 用 Matrix4.set（行主序入参）读。
 */
function readNodeTransforms(nodeBody) {
  const m = new Matrix4()
  const re = /<(translate|rotate|scale|matrix)(\s[^>]*?)?>([\s\S]*?)<\/\1>/g
  let x
  while ((x = re.exec(nodeBody))) {
    const v = NUM(x[3])
    if (x[1] === 'translate' && v.length >= 3) m.multiply(new Matrix4().makeTranslation(v[0], v[1], v[2]))
    else if (x[1] === 'rotate' && v.length >= 4) {
      const axis = new Vector3(v[0], v[1], v[2]).normalize()
      m.multiply(new Matrix4().makeRotationAxis(axis, (v[3] * Math.PI) / 180))
    } else if (x[1] === 'scale' && v.length >= 3) m.multiply(new Matrix4().makeScale(v[0], v[1], v[2]))
    else if (x[1] === 'matrix' && v.length >= 16) {
      const mm = new Matrix4()
      mm.set(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], v[12], v[13], v[14], v[15])
      m.multiply(mm)
    }
  }
  return m
}

/** .dae 文本 → { effects, parts: [{ geometry, matrix, primitives }] } */
export function parseDae(text) {
  /* DAE_DEBUG=1 时分阶段计时：这类“构建期越跑越慢”的问题只能靠分段看，
     否则根本猜不到是正则、扫描还是装配 */
  const t0 = performance.now()
  const dbg = process.env.DAE_DEBUG
    ? (msg) => console.error(`    [dae ${(performance.now() - t0).toFixed(0)}ms] ${msg}`)
    : () => {}
  const effects = readEffects(text)
  const matToEffect = readMaterials(text)
  dbg('effects')

  /* <vertices> 只带 POSITION：记住它，polylist 的 VERTEX 下标就指到这里 */
  const geoBodies = []
  for (const g of blocks(text, 'geometry')) {
    const id = attr(g.open, 'id')
    const meshStart = g.body.indexOf('<mesh>')
    if (!id || meshStart < 0) continue
    const mesh = g.body.slice(meshStart)
    const sources = readSources(mesh)
    dbg('sources')
    const vertices = new Map()
    for (const v of blocks(mesh, 'vertices')) {
      for (const i of blocks(v.body, 'input')) {
        if (!i.self) continue
        const semantic = attr(i.open, 'semantic')
        const src = (attr(i.open, 'source') || '').replace('#', '')
        if (semantic === 'POSITION' && sources.get(src)) vertices.set(attr(v.open, 'id'), sources.get(src))
      }
      break /* 一个 geometry 只有一组顶点 */
    }
    const primitives = []
    /* 先剔掉 <vertices>，否则它的 input 会被当成 primitive 的输入混进来 */
    const meshNoVertices = mesh.replace(/<vertices[\s\S]*?<\/vertices>/g, '')
    dbg(`geometry ${id} 切走 vertices（${(mesh.length / 1024) | 0}k 字符）`)
    for (const kind of ['polylist', 'triangles']) {
      for (const pr of blocks(meshNoVertices, kind)) {
        const one = readPrimitive(pr.body, sources, vertices, attr(pr.open, 'material'))
        if (one && one.position.length) primitives.push(one)
        dbg(`  ${kind} → ${one ? one.tris : 0} tris`)
      }
    }
    if (primitives.length) geoBodies.push({ id, primitives })
  }

  /* visual_scene：node 矩阵 + instance_geometry；没有节点就把几何直接摆原点 */
  const parts = []
  const sceneStart = text.indexOf('<library_visual_scenes>')
  const used = new Set()
  if (sceneStart >= 0) {
    const scene = text.slice(sceneStart)
    for (const n of blocks(scene, 'node')) {
      const nodeM = readNodeTransforms(n.body)
      for (const ig of blocks(n.body, 'instance_geometry')) {
        const url = (attr(ig.open, 'url') || '').replace('#', '')
        const geo = geoBodies.find((g) => g.id === url)
        if (!geo) continue
        used.add(url)
        /* polylist 上的 material 只是局部符号（"Material1"），得靠 bind_material
           翻成 effect id（"#ID2"）才能查到颜色 */
        const bind = new Map()
        for (const im of blocks(ig.body, 'instance_material')) {
          const sym = attr(im.open, 'symbol')
          const tgt = (attr(im.open, 'target') || '').replace('#', '')
          if (sym && tgt) bind.set(sym, tgt)
        }
        /* 部件矩阵 = 节点矩阵本身，不再按 <up_axis> 补刀：不管文件声明 Y_UP
           还是 Z_UP，导出器都已经把「几何自身轴系 → URDF 的 Z_UP 部件系」那一刀
           写进了节点变换（H2 的 C4D 给 rotate(1 0 0 90)，Go2 的 Blender 给
           <matrix>，反推出来都是 Rx(+90)）。再补一刀 Rx(-90) 会把 H2 歪成
           “躯干横躺、整机纵深 1.1m”—— tmp/dae-orient.mjs 的单件包围盒验的 */
        const matrix = nodeM
        const primitives = geo.primitives.map((pr) => {
          const t = bind.get(pr.material)
          /* target 可能直接指 effect，也可能指 material（要靠 library_materials 中转） */
          const eff = t && (effects.has(t) ? t : matToEffect.get(t))
          return { ...pr, material: eff || t || pr.material }
        })
        parts.push({ geometry: url, matrix, primitives })
      }
    }
  }
  for (const g of geoBodies) if (!used.has(g.id)) parts.push({ geometry: g.id, matrix: new Matrix4(), primitives: g.primitives })
  return { effects, parts, matToEffect }
}

/* ―――――――――――――――――――――― STL ―――――――――――――――――――――― */

/** 二/ASCII STL → 位置 + 面法线（STL 只有面法线，平滑法线交给管线里的 weld 之后重算） */
export function parseStl(buf) {
  const isBinary = (() => {
    if (buf.length < 84) return false
    const n = buf.readUInt32LE(80)
    return buf.length === 84 + n * 50
  })()
  const position = []
  const normal = []
  if (isBinary) {
    const n = buf.readUInt32LE(80)
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50
      const nx = buf.readFloatLE(o), ny = buf.readFloatLE(o + 4), nz = buf.readFloatLE(o + 8)
      for (let v = 0; v < 3; v++) {
        const p = o + 12 + v * 12
        position.push(buf.readFloatLE(p), buf.readFloatLE(p + 4), buf.readFloatLE(p + 8))
        normal.push(nx, ny, nz)
      }
    }
  } else {
    const t = buf.toString('utf8')
    const re = /facet normal([^\n]*)\nouter loop([\s\S]*?)endloop\nendfacet/g
    let m
    while ((m = re.exec(t))) {
      const nv = NUM(m[1])
      const vs = [...m[2].matchAll(/vertex([^\n]*)/g)].map((x) => NUM(x[1]))
      for (const v of vs) {
        position.push(v[0], v[1], v[2])
        normal.push(nv[0] || 0, nv[1] || 1, nv[2] || 0)
      }
    }
  }
  return { position: new Float32Array(position), normal: new Float32Array(normal) }
}

/* ―――――――――――――――――――――― URDF ―――――――――――――――――――――― */

const rpyToQuat = (rpy) => new Euler(rpy[0], rpy[1], rpy[2]).clone()
export { rpyToQuat }
/**
 * URDF 文本 → { links, joints, materials }
 * 只取管线用得上的三样：link 的 visual（origin/mesh/material）、joint 的
 * parent-child-origin-axis-limit。质量惯量一概不管。
 */
export function parseUrdf(raw) {
  /* 注释里埋着整套备用写法（world link、collision、另一款关节）：不剔掉就会
     凭空多出一批部件，root link 也会被注释里的 floating_base_joint 带歪 */
  const text = raw.replace(/<!--[\s\S]*?-->/g, '')
  const links = new Map()
  const joints = []
  for (const l of blocks(text, 'link')) {
    const name = attr(l.open, 'name')
    if (!name || !l.body) continue
    const visuals = []
    for (const v of blocks(l.body, 'visual')) {
      if (!v.body) continue
      /* 属性匹配一律用 [^>]*：filename="meshes/pelvis.dae" 里带斜杠，
         写成 [^/>]* 会在路径第一个 / 处断开 → 整个 link 没有 visual */
      const o = /<origin\b([^>]*)>/.exec(v.body)
      const mesh = /<mesh\b([^>]*)>/.exec(v.body)
      if (!mesh) continue
      /* 内联材质（GO2/R1/AS2 的写法）：<material name="深色橡胶"><color rgba="…"/>，
           比按部件名猜色准确得多，而且比网格里的 effect 更贴近 URDF 语义 */
      const mats = []
      for (const mb of blocks(v.body, 'material')) {
        const c = mb.body && (/<color\b[^>]*rgba="([^"]*)"/.exec(mb.body) || /<color[^>]*>([^<]*)<\/color>/.exec(mb.body))
        mats.push({ name: attr(mb.open, 'name') || null, rgba: c ? NUM(c[1]) : null })
      }
      visuals.push({
        xyz: NUM(attr(o?.[1] || '', 'xyz') || '0 0 0'),
        rpy: NUM(attr(o?.[1] || '', 'rpy') || '0 0 0'),
        /* package://<pkg>/ 整段剥掉（不是只剔协议头）：剩下的 dae/base.dae 能直接
           对到机型根目录，剔一半会把包名当子目录拼错 → 一个网格都读不到 */
        file: (attr(mesh[1], 'filename') || '').replace(/^package:\/\/[^/]+\//, ''),
        scale: NUM(attr(mesh[1], 'scale') || '1 1 1'),
        materials: mats,
        material: mats[0]?.name || null,
      })
    }
    if (visuals.length) links.set(name, visuals)
  }
  for (const j of blocks(text, 'joint')) {
    if (!j.body) continue
    const parent = /<parent\s+link="([^"]+)"/.exec(j.body)
    const child = /<child\s+link="([^"]+)"/.exec(j.body)
    if (!parent || !child) continue
    const o = /<origin\b([^>]*)>/.exec(j.body)
    const ax = /<axis\b([^>]*)>/.exec(j.body)
    const lm = /<limit\b([^>]*)>/.exec(j.body)
    const ty = attr(j.open, 'type') || 'fixed'
    joints.push({
      name: attr(j.open, 'name') || `${parent[1]}_${child[1]}`,
      type: ty,
      parent: parent[1],
      child: child[1],
      xyz: NUM(attr(o?.[1] || '', 'xyz') || '0 0 0'),
      rpy: NUM(attr(o?.[1] || '', 'rpy') || '0 0 0'),
      axis: NUM(attr(ax?.[1] || '', 'xyz') || '0 0 1'),
      home: Number(attr(ax?.[1] || '', 'default') || 0),
      /* 官方 URDF 给的是行程，不是默认位：摆姿势时得拿它夹一下，
         否则“膝盖 -1.5”遇到某台止于 -0.8 的胳关节就会穿模 */
      lower: lm && attr(lm[1], 'lower') !== null ? Number(attr(lm[1], 'lower')) : null,
      upper: lm && attr(lm[1], 'upper') !== null ? Number(attr(lm[1], 'upper')) : null,
    })
  }
  const mats = new Map()
  for (const m of blocks(text, 'material')) {
    const name = attr(m.open, 'name')
    const c = m.body && (/<color\b[^>]*rgba="([^"]*)"/.exec(m.body) || /<color>([^<]*)<\/color>/.exec(m.body))
    if (name && c) mats.set(name, NUM(c[1]))
  }
  return { links, joints, materials: mats }
}
