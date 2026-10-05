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
