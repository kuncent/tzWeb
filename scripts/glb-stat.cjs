// 一次性探针：统计 GLB 的三角面数 / 顶点数 / 压缩扩展，用于确认减面前后体量
// 用法：node scripts/glb-stat.cjs [相对或绝对路径...]  不带参数则扫描 tools/models-raw 与 public/models 与 tmp
const fs = require('fs')
const path = require('path')

function stat(file) {
  const buf = fs.readFileSync(file)
  if (buf.readUInt32LE(0) !== 0x46546c67) return { file, err: 'not glb' }
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'))
  const acc = json.accessors || []
  let tris = 0
  let verts = 0
  let prims = 0
  let withIndex = 0
  const meshesSeen = new Set()
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (n.mesh !== undefined) {
        const m = json.meshes[n.mesh]
        if (!m) continue
        for (const p of m.primitives) {
          if (p.mode !== undefined && p.mode !== 4) continue
          prims++
          const pos = acc[p.attributes.POSITION]
          if (!pos) continue
          verts += pos.count
          if (p.indices !== undefined) {
            withIndex++
            tris += (acc[p.indices].count || 0) / 3
          } else {
            tris += pos.count / 3
          }
        }
        meshesSeen.add(n.mesh)
      }
      walk(n.children)
    }
  }
  const roots = (json.scenes || [])
    .map((s) => s.nodes || [])
    .flat()
    .map((i) => (typeof i === 'number' ? (json.nodes || [])[i] : i))
    .filter(Boolean)
  walk(roots.length ? roots : json.nodes)
  const binLen = jsonLen % 4 === 0 ? 0 : 0
  let chunks = 0
  let off = 20 + jsonLen
  const binTotal = []
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off)
    const type = buf.readUInt32LE(off + 4)
    chunks++
    if (type === 0x004e4942) binTotal.push(len)
    off += 8 + len
  }
  return {
    file: path.basename(file),
    dir: path.basename(path.dirname(file)),
    kb: Math.round(buf.length / 1024),
    meshes: meshesSeen.size,
    prims,
    indexed: withIndex,
    tris: Math.round(tris),
    verts,
    ext: (json.extensionsUsed || []).concat(json.extensionsRequired || []),
    mats: (json.materials || []).length,
    imgs: (json.images || []).length,
    binKb: Math.round(binTotal.reduce((a, b) => a + b, 0) / 1024),
  }
}

const targets = process.argv.slice(2)
const files = targets.length
  ? targets
  : ['../tools/models-raw', '../public/models', '../tmp']
      .flatMap((d) => {
        const abs = path.resolve(__dirname, d)
        if (!fs.existsSync(abs)) return []
        return fs
          .readdirSync(abs)
          .filter((f) => f.endsWith('.glb'))
          .map((f) => path.join(abs, f))
      })

for (const f of files) {
  try {
    const s = stat(f)
    console.log(
      `${(s.dir + '/' + s.file).padEnd(30)} ${String(s.kb).padStart(6)}KB  tris=${String(s.tris).padStart(7)}  verts=${String(s.verts).padStart(7)}  prims=${String(s.prims).padStart(3)}  idx=${s.indexed}/${s.prims}  mat=${s.mats} img=${s.imgs}  ext=${s.ext.join(',') || '-'}`,
    )
  } catch (e) {
    console.log(f, 'ERR', e.message)
  }
}
