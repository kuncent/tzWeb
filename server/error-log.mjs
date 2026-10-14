/* ============================================================
 * 轻量错误日志：把服务端 catch 到的异常追加到 server/data/errors/YYYYMMDD.log
 * ------------------------------------------------------------
 * 与审计 jsonl 共用 dateKeyLocal 做 UTC+8 日切，不引入外部依赖。
 * 用法：import { logError } from './error-log.mjs'; logError(err, { req, ctx })
 * ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.ADMIN_DATA_DIR
  ? path.resolve(process.env.ADMIN_DATA_DIR)
  : path.join(HERE, 'data')
const ERR_DIR = path.join(DATA_DIR, 'errors')

const TZ_OFFSET_MS = 8 * 3600 * 1000
function dateKey() {
  const d = new Date(Date.now() + TZ_OFFSET_MS)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export function logError(err, ctx = {}) {
  try {
    fs.mkdirSync(ERR_DIR, { recursive: true })
    const file = path.join(ERR_DIR, `${dateKey()}.log`)
    const ts = new Date().toISOString()
    const msg = err instanceof Error ? `${err.message}\n${err.stack || ''}` : String(err)
    const extra = Object.keys(ctx).length ? ` ${JSON.stringify(ctx)}` : ''
    fs.appendFileSync(file, `[${ts}]${extra} ${msg}\n---\n`)
  } catch {
    // 日志写不进去就静默，绝不能再抛异常打断主流程
  }
}
