/* ============================================================
 * 管理后台的极简集合存储层（零依赖，Node 内置 fs）
 * ------------------------------------------------------------
 * 两类落盘：
 *   · JSON Lines（leads.jsonl）—— 追加为主、可整表原子重写，天然适合一条一份
 *   · JSON（users.json / content.json）—— 读改整份、原子替换（写临时文件再 rename）
 * 目录 server/data/ 已在 .gitignore：里面是线索（含手机号等 PII）与口令哈希，绝不入库。
 * 原子写用「同目录临时文件 + rename」，避免写一半进程被杀留下损坏 JSON。
 * ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = process.env.ADMIN_DATA_DIR
  ? path.resolve(process.env.ADMIN_DATA_DIR)
  : path.join(HERE, 'data')

export const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  content: path.join(DATA_DIR, 'content.json'),
  leads: (process.env.LEADS_FILE && path.resolve(process.env.LEADS_FILE)) || path.join(DATA_DIR, 'leads.jsonl'),
  /* 访问日志按日切分：server/data/visits/YYYYMMDD.jsonl
     单日一个文件 → 读取时间窗只拼命中那几天、清理只要 rm 一天、单文件体量可控；
     目录本身就在 server/data/ 下，.gitignore 已整目录忽略，PII 不会入库。 */
  visitsDir: path.join(DATA_DIR, 'visits'),
  /* 操作日志：与 visits 同一子目录风格，按 UTC+8 日切分 audit/YYYYMMDD.jsonl。
     一行一个事件（登录、内容发布 diff、用户增删改、密码重置），
     只存 email/id，绝不存 hash。 */
  auditDir: path.join(DATA_DIR, 'audit'),
  /* ip2region v4/v6 二进制：npm run pull-ipdb 一次性拉到 server/data/ 下，
     与 leads/content 同层；v4 ~11MB、v6 ~13MB。缺失时 tracker 会把对应栈的
     country/province 归为空串，不阻断埋点。 */
  xdb: path.join(DATA_DIR, 'ip2region_v4.xdb'),
  xdbV6: path.join(DATA_DIR, 'ip2region_v6.xdb'),
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

/* ---------- JSON 整份读写 ---------- */
export function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    if (!raw.trim()) return fallback
    return JSON.parse(raw)
  } catch (e) {
    if (e.code === 'ENOENT') return fallback
    throw e
  }
}

export function writeJsonAtomic(file, obj) {
  ensureDir()
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2))
  fs.renameSync(tmp, file)
}

/* ---------- JSONL 读写 ---------- */
export function readJsonl(file) {
  let raw
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
  const out = []
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim()
    if (!s) continue
    try {
      out.push(JSON.parse(s))
    } catch {
      /* 半行（崩溃留下的尾巴）跳过，不连带整表不可用 */
    }
  }
  return out
}

export function appendJsonl(file, obj) {
  ensureDir()
  fs.appendFileSync(file, JSON.stringify(obj) + '\n')
}

export function writeJsonlAtomic(file, arr) {
  ensureDir()
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, arr.map((x) => JSON.stringify(x)).join('\n') + (arr.length ? '\n' : ''))
  fs.renameSync(tmp, file)
}

/* ---------- 访问日志：按日切分 ----------
   日期键走 UTC+8：营销站的"日 PV"要跟国内业务日历对齐，不能用 UTC（跨零点会
   把当天 08 前的访问错划到前一天）。写入时把 Date 换算到 Asia/Shanghai 的 YYYYMMDD。 */
const TZ_OFFSET_MS = 8 * 3600 * 1000
function dateKeyLocal(tsMs) {
  // 容错：numeric epoch 直接用；ISO / 可 Date() 解析的字符串先转回 ms（审计行就存 ISO）
  const base = typeof tsMs === 'number' ? tsMs : new Date(tsMs).getTime()
  const d = new Date((Number.isFinite(base) ? base : Date.now()) + TZ_OFFSET_MS)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}
export function visitsFileFor(tsMs) {
  return path.join(FILES.visitsDir, `${dateKeyLocal(tsMs)}.jsonl`)
}
export function appendVisit(row) {
  fs.mkdirSync(FILES.visitsDir, { recursive: true })
  fs.appendFileSync(visitsFileFor(row.ts || Date.now()), JSON.stringify(row) + '\n')
}
/* 列目录里形如 YYYYMMDD.jsonl 的文件名段；不匹配的一律忽略，防手工丢进来的备份
   或异常文件被误当成当天数据算进 KPI。 */
function listVisitDates() {
  try {
    return fs
      .readdirSync(FILES.visitsDir)
      .filter((f) => /^\d{8}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 8))
      .sort()
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
}
/* 读 [fromKey, toKey] 区间（含端点）内的全部行；未存在的日期直接跳过，不抛。 */
export function readVisitsRange(fromKey, toKey) {
  const all = listVisitDates()
  const out = []
  for (const k of all) {
    if (k < fromKey || k > toKey) continue
    const arr = readJsonl(path.join(FILES.visitsDir, `${k}.jsonl`))
    for (const r of arr) out.push(r)
  }
  return out
}
export const toKeyLocal = (d) => dateKeyLocal(typeof d === 'number' ? d : d.getTime())

/* ---------- 操作日志：与 visits 同层日切，新 → 旧返回 ---------- */
export function auditFileFor(tsMs) {
  return path.join(FILES.auditDir, `${dateKeyLocal(tsMs)}.jsonl`)
}
export function appendAudit(row) {
  fs.mkdirSync(FILES.auditDir, { recursive: true })
  fs.appendFileSync(auditFileFor(row.ts || Date.now()), JSON.stringify(row) + '\n')
}
function listAuditDates() {
  try {
    return fs
      .readdirSync(FILES.auditDir)
      .filter((f) => /^\d{8}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 8))
      .sort()
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
}
export function readAuditRange(fromKey, toKey) {
  const all = listAuditDates()
  const out = []
  for (const k of all) {
    if (k < fromKey || k > toKey) continue
    const arr = readJsonl(path.join(FILES.auditDir, `${k}.jsonl`))
    for (const r of arr) out.push(r)
  }
  out.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')))
  return out
}
