/* 纯前端内容 diff：与 server/audit.mjs 的 diffContent 同构，
   但不依赖 Node 内置模块，可被 Vite 安全打包。 */

const isPlainObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

function clipVal(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.length > 120 ? v.slice(0, 120) + '…' : v
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (Array.isArray(v)) return { _arr: v.length }
  if (typeof v === 'object') return { _obj: Object.keys(v).length }
  return String(v)
}

export function diffContent(before, after, prefix = '', out = []) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  for (const k of keys) {
    const b = (before || {})[k]
    const a = (after || {})[k]
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
