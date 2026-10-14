/* ============================================================
 * 管理后台前端 API 封装（同源 cookie 会话，零新依赖）
 * ------------------------------------------------------------
 * · 所有请求走 /api/ai/admin/*，credentials:'same-origin' 让 httpOnly
 *   会话 cookie 自动随请求带上（浏览器不暴露 token，前端无从伪造）。
 * · 非 GET 一律加 x-admin:1 —— 与服务端的 CSRF-lite 对应：跨站的
 *   表单/自动请求发不出这个自定义头。
 * · 统一把非 2xx 抛成 ApiError（带 status 与后端 message），页面据此显错。
 * ============================================================ */
const BASE = '/api/ai/admin'

export class ApiError extends Error {
  constructor(status, payload) {
    super((payload && payload.message) || (payload && payload.error) || `请求失败（${status}）`)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload || null
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (method !== 'GET') headers['x-admin'] = '1'
  if (body !== undefined) headers['content-type'] = 'application/json'
  const res = await fetch(BASE + path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const ct = res.headers.get('content-type') || ''
  const payload = ct.includes('application/json') ? await res.json().catch(() => null) : null
  if (!res.ok) throw new ApiError(res.status, payload)
  return payload
}

/* ---------- 鉴权 ---------- */
export const login = (email, password) => request('/login', { method: 'POST', body: { email, password } })
export const logout = () => request('/logout', { method: 'POST' })
export const me = () => request('/me')
export const updateProfile = (patch) => request('/profile', { method: 'PATCH', body: patch })
export const changePassword = (current, password) => request('/password', { method: 'POST', body: { current, password } })

/* ---------- 线索 ----------
 * GET 走 fetch（带 cookie）；CSV 是附件下载，直接给 <a href> 用同一份
 * 同源 cookie 即可，不必过 fetch。 */
export const listLeads = (params = {}) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
  const s = q.toString()
  return request(`/leads${s ? `?${s}` : ''}`)
}
export const updateLead = (id, patch) => request(`/leads/${id}`, { method: 'PATCH', body: patch })
/* CSV 是附件下载，直接给 <a href> 用同源 cookie；带上与列表同一套筛选参数。 */
export const leadsCsvUrl = (params = {}) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
  const s = q.toString()
  return `${BASE}/leads.csv${s ? `?${s}` : ''}`
}

/* ---------- 用户 ---------- */
export const listUsers = () => request('/users')
export const createUser = (body) => request('/users', { method: 'POST', body })
export const patchUser = (id, body) => request(`/users/${id}`, { method: 'PATCH', body })
export const deleteUser = (id) => request(`/users/${id}`, { method: 'DELETE' })
export const resetUserPassword = (id, password) => request(`/users/${id}/password`, { method: 'POST', body: { password } })

/* ---------- 内容 ---------- */
export const getContent = () => request('/content')
/* publishContent(patch, note)：note 会写成 body._note，服务端剥出后进审计、
   不会污染发布 overlay。 */
export const publishContent = (patch, note) => {
  const body = note ? { ...patch, _note: String(note).slice(0, 200) } : patch
  return request('/content', { method: 'PUT', body })
}
export const rollbackContent = () => request('/content/rollback', { method: 'POST' })

/* ---------- 操作日志 ---------- */
export const listAudits = (params = {}) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return request(`/audit${s ? `?${s}` : ''}`)
}

/* ---------- 访问统计 / SEO / GEO ----------
 * days 默认 30；pages 可额外传 limit。后端统一取 content.read 权限门，
 * 无数据时给空项、不会 500；前端渲染要容错。 */
const daysQS = (days) => (days ? `?days=${encodeURIComponent(days)}` : '')
export const statsOverview = (days = 30) => request(`/stats/overview${daysQS(days)}`)
export const statsDaily = (days = 30) => request(`/stats/daily${daysQS(days)}`)
export const statsRegions = (days = 30) => request(`/stats/regions${daysQS(days)}`)
export const statsPages = (days = 30, limit = 20) => request(`/stats/pages?days=${days}&limit=${limit}`)
export const statsSources = (days = 30) => request(`/stats/sources${daysQS(days)}`)
export const statsBots = (days = 30) => request(`/stats/bots${daysQS(days)}`)
export const statsDevices = (days = 30) => request(`/stats/devices${daysQS(days)}`)
export const seoReport = () => request('/seo')
export const geoReport = (days = 30) => request(`/geo${daysQS(days)}`)
