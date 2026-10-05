// 离线减面管线：tools/models-raw/*.glb（KUN 具身教育实验室项目的高模）
//   → weld（重建索引共享）→ simplify（meshoptimizer 二次误差度量减面）→ prune → meshopt（量化 + 压缩）
//   → public/models/*.glb
//
// 用法：
//   node scripts/decimate-models.mjs                 # 默认保留 35% 面数
//   RATIO=0.3 node scripts/decimate-models.mjs       # 自定义比例
//   node scripts/decimate-models.mjs --check         # 只报告，不写文件
//
// 说明：减面必须在构建前离线完成（运行时不做简化）；EXT_meshopt_compression 由
// drei 的 useGLTF + MeshoptDecoder 在浏览器侧解压，因此产物体积远小于同面数的裸 GLB。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, simplify, prune, meshopt, dequantize } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'tools', 'models-raw')
const OUT_DIR = path.join(ROOT, 'public', 'models')

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const RATIO = Number(process.env.RATIO || 0.35)
const ERROR = Number(process.env.ERROR || 0.0012)

await MeshoptDecoder.ready
await MeshoptEncoder.ready
await MeshoptSimplifier.ready

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

/** 统计文档三角面数（含索引时按 indices 计） */
function countTris(doc) {
  let tris = 0
  const seen = new Set()
  for (const mesh of doc.getRoot().listMeshes()) {
    if (seen.has(mesh.cid)) continue
    seen.add(mesh.cid)
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices()
      const pos = prim.getAttribute('POSITION')
      if (idx) tris += idx.getCount() / 3
      else if (pos) tris += pos.getCount() / 3
    }
  }
  return Math.round(tris)
}

/** 体检：POSITION 包围盒退化（某一轴跨度为 0）意味着量化出错，模型会“消失” */
function degeneratePrims(doc) {
  const bad = []
  const min = [0, 0, 0]
  const max = [0, 0, 0]
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      if (!pos) continue
      pos.getMin(min)
      pos.getMax(max)
      const span = max.map((v, i) => v - min[i])
      const axes = span.filter((v) => v > 1e-6).length
      if (axes < 2) bad.push({ mesh: mesh.getName() || '?', span: span.map((v) => +v.toFixed(4)) })
    }
  }
  return bad
}

const files = fs
  .readdirSync(SRC_DIR)
  .filter((f) => f.endsWith('.glb'))
  .sort()

let sumBefore = 0
let sumAfter = 0
let sumBytesBefore = 0
let sumBytesAfter = 0

for (const f of files) {
  const src = path.join(SRC_DIR, f)
  const out = path.join(OUT_DIR, f)
  const before = countTris(await io.read(src))
  const bytesBefore = fs.statSync(src).size

  if (checkOnly) {
    const cur = fs.existsSync(out) ? fs.statSync(out) : null
    const curTris = cur ? countTris(await io.read(out)) : 0
    console.log(
      `${f.padEnd(22)} raw=${String(before).padStart(7)}tris ${Math.round(bytesBefore / 1024)}KB` +
        (cur ? `  →  now=${String(curTris).padStart(7)}tris (${((curTris / before) * 100).toFixed(1)}%) ${Math.round(cur.size / 1024)}KB` : '  →  缺失'),
    )
    continue
  }

  const doc = await io.read(src)
  await doc.transform(
    // 源模型带 KHR_mesh_quantization，gltf-transform 读到的是原始整数（非归一化）；
    // 必须先还原为 float，否则末尾 meshopt 的再量化会算错包围盒（模型直接塌成一条线）
    dequantize(),
    // 共享顶点：减面算法需要索引化 + 焊接后的流形拓扑
    weld({ overwrite: false }),
    simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: ERROR }),
    prune({ keepSolid: true }),
    // 量化 + EXT_meshopt_compression：面数降下来后，体积主要靠这一步收回
    meshopt({ encoder: MeshoptEncoder }),
  )
  const bad = degeneratePrims(doc)
  if (bad.length) {
    console.error(`✖ ${f} 量化后包围盒退化，拒绝写出：`, JSON.stringify(bad))
    process.exitCode = 1
    continue
  }
  await io.write(out, doc)

  const after = countTris(await io.read(out))
  const bytesAfter = fs.statSync(out).size
  sumBefore += before
  sumAfter += after
  sumBytesBefore += bytesBefore
  sumBytesAfter += bytesAfter
  console.log(
    `${f.padEnd(22)} ${String(before).padStart(7)} → ${String(after).padStart(7)}tris ` +
      `(${((after / before) * 100).toFixed(1)}%)   ${String(Math.round(bytesBefore / 1024)).padStart(5)} → ${String(Math.round(bytesAfter / 1024)).padStart(5)}KB`,
  )
}

if (!checkOnly) {
  console.log(
    `\n合计 ${sumBefore} → ${sumAfter} tris (${((sumAfter / sumBefore) * 100).toFixed(1)}%)  ` +
      `${(sumBytesBefore / 1048576).toFixed(2)}MB → ${(sumBytesAfter / 1048576).toFixed(2)}MB`,
  )
}
