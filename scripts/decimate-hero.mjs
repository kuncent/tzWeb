// 英雄屏专用轻量模型：tools/models-raw/{go2,g1} → public/models/*-hero.glb
//
// 为什么单独一条管线：首屏里 Go2 只占约 1/12 屏高，
// 但 public/models/*-min.glb（35% 面数）是给产品展示区放大看用的 ——
// go2-min 117k tris，挂进首屏等于把稳态 tris
// 从 120k 抬到 344k（实测 tier0 帧率 25→20），meshopt 解码还多一个 364ms 长任务。
// 英雄屏版再减一刀。RATIO 0.08 → 0.15（用户：首屏模型是异步加载的，
// 质量可以稍微提一点）：两台居民 55k → 104k tris、241KB → 449KB。
// 它们本来就不在 LCP 路径上（lazy + Suspense + 模块级 preload），
// 而特写镜头（DEV_CAMS.go2 框内 0.67m）下 8% 那版的狗头是明显多面体。
// 代价实测：scene0 稳态帧时 +1~3ms（三角形不是首屏的贵项，dpr 才是）。
//
// turtlebot3 不再出 hero 版（用户：去掉底盘模型）：首屏里轮式设备
// 由三台程序几何 AGV 演，-min 那份继续留给产品展示区
//
// 用法：node scripts/decimate-hero.mjs
//   RATIO=0.15 ERROR=0.012 可调
//   误差 0.012 是量出来的：0.0025 时 turtlebot 的 CAD 薄壁会顶住误差阈值
//   只减到 33.7%（等于没减），放宽到 0.012 才落到面数下限
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

const RATIO = Number(process.env.RATIO || 0.15)
const ERROR = Number(process.env.ERROR || 0.012)
/* 只出首屏居民的；人形/机械臂在首屏是主体，继续用 -min。
   g1（宇树开源人形，源自 jushen2）358k tris 不减没法进首屏 */
const TARGETS = (process.env.TARGETS || 'go2,g1').split(',')

await MeshoptDecoder.ready
await MeshoptEncoder.ready
await MeshoptSimplifier.ready

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

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

/* 与 decimate-models 同：某轴跨度为 0 = 量化出错，模型会塌成一条线 */
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
      if (span.filter((v) => v > 1e-6).length < 2) bad.push({ mesh: mesh.getName() || '?', span: span.map((v) => +v.toFixed(4)) })
    }
  }
  return bad
}

for (const name of TARGETS) {
  const src = path.join(SRC_DIR, `${name}-min.glb`)
  const out = path.join(OUT_DIR, `${name}-hero.glb`)
  if (!fs.existsSync(src)) {
    console.error(`✖ 缺源文件 ${src}`)
    process.exitCode = 1
    continue
  }
  const before = countTris(await io.read(src))
  const doc = await io.read(src)
  await doc.transform(
    dequantize(),
    weld({ overwrite: false }),
    simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: ERROR }),
    prune({ keepSolid: true }),
    meshopt({ encoder: MeshoptEncoder }),
  )
  const bad = degeneratePrims(doc)
  if (bad.length) {
    console.error(`✖ ${name} 量化后包围盒退化，拒绝写出：`, JSON.stringify(bad))
    process.exitCode = 1
    continue
  }
  await io.write(out, doc)
  const after = countTris(await io.read(out))
  console.log(
    `${name}-hero.glb`.padEnd(22) +
      ` ${String(before).padStart(7)} → ${String(after).padStart(6)}tris (${((after / before) * 100).toFixed(1)}%)` +
      `   ${Math.round(fs.statSync(out).size / 1024)}KB`,
  )
}
