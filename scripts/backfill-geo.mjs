/* ============================================================
 * 一次性回填：给历史访问日志里「地区为空」的行补 IP 归属地
 * ------------------------------------------------------------
 * 背景：归属地是在访问写入时解析并存进 country/province 等字段的，
 * stats.getRegions 只读已存字段。接入 IPv6 库（ip2region_v6.xdb）之前
 * 落库的 IPv6 访客没有省份，会一直停在「未知地区」。本脚本用当前双栈
 * xdb 对这些行重跑 searchIp 并就地回填，让历史省份榜也能反映 IPv6。
 *
 * 安全：
 *   - 默认 dry-run，只统计与预览；带 --write 才原子写回。
 *   - 只改「country 与 province 当前都为空且 ip 能解析出结果」的行，
 *     已解析正确的历史行原样不动，绝不覆盖。
 *   - 逐日文件读写，writeJsonlAtomic 原子替换，中途失败不留半截。
 *
 * 用法：
 *   node scripts/backfill-geo.mjs            # 预览会改哪些、改多少
 *   node scripts/backfill-geo.mjs --write    # 实际写回
 * ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import { FILES, readJsonl, writeJsonlAtomic } from '../server/data.mjs'
import { loadXdb, searchIp } from '../server/lib/xdb.mjs'

const write = process.argv.includes('--write')

const { v4, v6 } = loadXdb(FILES.xdb, FILES.xdbV6)
console.log(`[backfill] xdb：IPv4=${v4 ? '已载入' : '缺失'} IPv6=${v6 ? '已载入' : '缺失'}；模式=${write ? 'WRITE' : 'DRY-RUN'}`)
if (!v4 && !v6) {
  console.error('[backfill] 双库都没载入，先跑 npm run pull-ipdb。退出。')
  process.exit(1)
}

let files = []
try {
  files = fs
    .readdirSync(FILES.visitsDir)
    .filter((f) => /^\d{8}\.jsonl$/.test(f))
    .sort()
} catch (e) {
  if (e.code === 'ENOENT') console.log('[backfill] 暂无访问日志目录，无需回填。')
  else throw e
  process.exit(0)
}

let totalRows = 0
let totalChanged = 0
const changedByProvince = new Map()

for (const f of files) {
  const file = path.join(FILES.visitsDir, f)
  const rows = readJsonl(file)
  totalRows += rows.length
  let changed = 0
  for (const r of rows) {
    if (!r || !r.ip) continue
    if (r.country || r.province) continue // 已有归属地，不动
    const g = searchIp(r.ip)
    if (!g || (!g.country && !g.province)) continue
    r.country = g.country || ''
    r.province = g.province || ''
    r.city = g.city || ''
    r.isp = g.isp || ''
    r.cc = g.cc || ''
    r.xdb_hit = true
    changed++
    const key = r.cc === 'CN' ? r.province || '未知省份' : `${r.country || '未知国家'}(海外)`
    changedByProvince.set(key, (changedByProvince.get(key) || 0) + 1)
  }
  if (changed) {
    totalChanged += changed
    if (write) writeJsonlAtomic(file, rows)
  }
  console.log(`  ${f}: ${rows.length} 行，回填 ${changed} 条${write ? '' : '（待写入）'}`)
}

console.log(`\n[backfill] 合计 ${totalRows} 行，命中回填 ${totalChanged} 条。${write ? '已写回。' : '（dry-run，加 --write 落盘）'}`)
if (changedByProvince.size) {
  console.log('[backfill] 回填行的归属地分布（按省份/国家）：')
  ;[...changedByProvince.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`   ${String(v).padStart(4)}  ${k}`))
}
