/* ============================================================
 * 操作日志：记录每一次「谁 · 何时 · 改了官网哪一处」
 * ------------------------------------------------------------
 * 三类事件：
 *   · content.publish —— 深 diff before/after，只把叶子级 {path,from,to} 记下来，
 *     空 diff 也留一条 pass-through（便于回溯"这次点了发布但没实际改动"）；
 *   · auth.login/logout —— 只记 email，不记 hash、不记密码；
 *   · user.create/update/delete/password.reset —— 记 target=用户 id，diff 只列
 *     name/role/disabled 的字面变化，绝不涉及 hash。
 * 落盘按 UTC+8 日切（与 visits 对齐），一行一 JSON 到 server/data/audit/YYYYMMDD.jsonl。
 * ============================================================ */
import { appendAudit, readAuditRange, toKeyLocal } from './data.mjs'

const DAY = 86400000

/* 内容 overlay 深 diff：递归普通对象，其他类型（数组/标量/null）按整值比较。
   输出 [{ path:'sections.hero.title', from:'旧', to:'新' }]，path 用点号拼便于前端一行显示。
   null 视为"删覆盖"，diff 里也当作值参与比较（旧 null、新 'x'；旧 'x'、新 null）。*/
const isPlainObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
export function diffContent(before, after, prefix = '', out = []) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  for (const k of keys) {
    const b = (before || {})[k]
    const a = (after || {})[k]
    // 两边都是普通对象：递归；否则按整值比较
    if (isPlainObj(b) && isPlainObj(a)) {
      diffContent(b, a, prefix ? `${prefix}.${k}` : k, out)
      continue
    }
    if (JSON.stringify(b ?? null) === JSON.stringify(a ?? null)) continue
    const path = prefix ? `${prefix}.${k}` : k
    out.push({ path, from: clipVal(b), to: clipVal(a) })
  }
  return out
}
/* 值裁剪：长字符串截 240 字符，数组保留长度与前 8 元素摘要，避免单行 diff 撑爆 */
function clipVal(v) {
  if (v == null) return null
  if (typeof v === 'string') {
    // email 掩码：a***@domain 格式，防审计文件 PII 外泄
    if (v.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      const at = v.indexOf('@')
      const local = v.slice(0, at)
      const domain = v.slice(at)
      return (local[0] || '') + '***' + domain
    }
    return v.length > 240 ? v.slice(0, 240) + '…' : v
  }
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (Array.isArray(v)) return { _arr: v.length, _sample: v.slice(0, 8).map(clipVal) }
  if (typeof v === 'object') {
    const keys = Object.keys(v)
    return { _obj: keys.length, _keys: keys.slice(0, 12) }
  }
  return String(v)
}

/* 追加一行审计：actor 可为 null（未登录尝试），但一般由调用方保证是已登录用户 public 视图。
   row.ts 存 ISO，dateKey 由 data.mjs 内部按 UTC+8 换算。*/
export function recordAudit({ actor, action, target, diff, note, ip }) {
  const row = {
    ts: new Date().toISOString(),
    userId: actor?.id || null,
    userEmail: actor?.email || null,
    userName: actor?.name || null,
    role: actor?.role || null,
    action: String(action || '').slice(0, 40),
    target: target == null ? null : String(target).slice(0, 120),
    diff: Array.isArray(diff) ? diff.slice(0, 200) : null,
    note: note == null ? null : String(note).slice(0, 500),
    ip: ip == null ? null : String(ip).slice(0, 64),
  }
  try {
    appendAudit(row)
  } catch (e) {
    // 审计写失败绝不阻断业务；只打日志
    console.error('[audit] append failed:', e && e.message)
  }
  return row
}

/* 查询：days 时间窗（含当天），userId/action 过滤；返回 items（新→旧）与 total。
   与 visits 类似拼日期区间，然后 filter。 */
export function listAudits({ days = 30, userId, action, limit = 100, offset = 0 } = {}) {
  const d = Math.min(180, Math.max(1, Number(days) || 30))
  const now = Date.now()
  const fromKey = toKeyLocal(now - (d - 1) * DAY)
  const toKey = toKeyLocal(now)
  let rows = readAuditRange(fromKey, toKey)
  if (userId) rows = rows.filter((r) => r.userId === userId)
  if (action) rows = rows.filter((r) => r.action === action)
  const total = rows.length
  const lim = Math.min(500, Math.max(1, Number(limit) || 100))
  const off = Math.max(0, Number(offset) || 0)
  return { items: rows.slice(off, off + lim), total, days: d, fromKey, toKey }
}

/* 供 admin.mjs 里 PUT /content 使用：把 body 与前后 state 一次算完。 */
export function auditContentPublish({ actor, before, after, note, ip }) {
  const diff = diffContent(before, after)
  return recordAudit({ actor, action: 'content.publish', target: 'site', diff, note, ip })
}
