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
export const publishContent = (patch) => request('/content', { method: 'PUT', body: patch })
