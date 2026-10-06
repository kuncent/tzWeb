/* ============================================================
 * 天择官网 · 管理后台服务端（零依赖，挂在既有 /api/ai 代理下的 /admin/*）
 * ------------------------------------------------------------
 * 设计要点（与方案一致）：
 *   · 口令用 node 内置 scrypt 加盐哈希，校验走 timingSafeEqual。
 *   · 会话是无状态签名 token（HMAC(AUTH_SECRET)），放 httpOnly + SameSite=Strict
 *     cookie；token 里带 uid + 该用户 tokenVersion(tv) + 过期，改密/禁用/删除即
 *     自增 tv 让旧 cookie 当场失效，不需要服务端会话表。
 *   · 权限用「能力串」而非写死角色枚举：角色=一组串，用户可再追加；未来加模块
 *     只是多注册一条权限串与一个 handler，天然兼容扩展。
 *   · Secure cookie 只在显式声明生产时开启（AUTH_COOKIE_SECURE=1）：本机 dev/preview
 *     是 http，开了 Secure 浏览器不会回传，登录就废了。
 * ============================================================ */
import crypto from 'node:crypto'
import { FILES, readJson, writeJsonAtomic, readJsonl, writeJsonlAtomic } from './data.mjs'

const COOKIE = 'tianze_admin'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

/* ---------- 配置 ----------
   env 惰性读取：被 Vite 的 config 加载器挂进来时，.env 只在 ai-proxy 里手动解析、
   不会进 process.env，且本模块的 import 求值早于 ai-proxy 运行 —— 所以在模块作用域抓
   env 会拿空。做法：ai-proxy 调 configureAdmin(ENV) 注入一份回落表，这里每次现读。 */
let FALLBACK_ENV = {}
export function configureAdmin(map) {
  FALLBACK_ENV = map || {}
}
const env = (k) => process.env[k] || FALLBACK_ENV[k] || ''
const AUTH_SECRET = () => env('AUTH_SECRET')
/* 生产部署（Nginx TLS + 反代）在进程环境里置 AUTH_COOKIE_SECURE=1；本地 dev/preview 不要置 */
const SECURE_COOKIE = () => /^(1|true|yes)$/i.test(env('AUTH_COOKIE_SECURE'))
export const adminEnabled = () => !!env('AUTH_SECRET')

/* ---------- 权限模型 ---------- */
export const PERMS = [
  'leads.read', 'leads.update',
  'content.read', 'content.manage',
  'users.manage',
  'settings.manage',
]
export const ROLES = {
  owner: ['*'],
  admin: ['leads.*', 'users.manage', 'content.*', 'settings.manage'],
  editor: ['leads.*', 'content.*'],
  viewer: ['leads.read', 'content.read'],
}
export const MODULES = {
  leads: { read: 'leads.read', write: 'leads.update' },
  content: { read: 'content.read', write: 'content.manage' },
  users: { read: 'users.manage', write: 'users.manage' },
  settings: { read: null, write: null }, // 任何登录用户可用（本人资料/改密）
}

function effectivePerms(user) {
  const role = ROLES[user.role] || []
  return Array.from(new Set([...role, ...(Array.isArray(user.perms) ? user.perms : [])]))
}
function hasPerm(user, need) {
  if (!need) return !!user // 仅需登录（settings 自助）
  const eff = effectivePerms(user)
  if (eff.includes('*')) return true
  if (eff.includes(need)) return true
  const dot = need.lastIndexOf('.')
  if (dot > 0 && eff.includes(need.slice(0, dot) + '.*')) return true
  return false
}

/* ---------- 口令 ---------- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16)
  const N = 16384, r = 8, p = 1, keylen = 32
  const hash = crypto.scryptSync(pw, salt, keylen, { N, r, p })
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`
}
function verifyPassword(pw, stored) {
  try {
    const [tag, N, r, p, saltHex, hashHex] = String(stored).split('$')
    if (tag !== 'scrypt') return false
    const salt = Buffer.from(saltHex, 'hex')
    const want = Buffer.from(hashHex, 'hex')
    const got = crypto.scryptSync(pw, salt, want.length, { N: +N, r: +r, p: +p })
    return got.length === want.length && crypto.timingSafeEqual(got, want)
  } catch {
    return false
  }
}
/* 邮箱不存在时也拿它跑一次同量级 scrypt，抹平「命中/未命中」的耗时差，防计时枚举账号 */
const DUMMY_HASH = hashPassword('tianze-dummy-' + crypto.randomUUID())

/* ---------- 签名会话 token ---------- */
const b64u = (s) => Buffer.from(s).toString('base64url')
function sig(payloadStr) {
  return crypto.createHmac('sha256', AUTH_SECRET()).update(payloadStr).digest('base64url')
}
function makeToken(user) {
  const p = b64u(JSON.stringify({ uid: user.id, tv: user.tv || 0, exp: Date.now() + SESSION_TTL_MS }))
  return `${p}.${sig(p)}`
}
function parseToken(tok) {
  if (!tok || !tok.includes('.')) return null
  const [p, s] = tok.split('.')
  const expect = sig(p)
  const a = Buffer.from(s || '', 'utf8')
  const b = Buffer.from(expect, 'utf8')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
    if (!d.uid || !d.exp || d.exp < Date.now()) return null
    return d
  } catch {
    return null
  }
}

/* ---------- cookie ---------- */
function parseCookies(req) {
  const out = {}
  const raw = req.headers.cookie
  if (!raw) return out
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}
function setCookie(res, value, maxAgeSec) {
  const attrs = [`${COOKIE}=${encodeURIComponent(value)}`, 'Path=/api/ai', 'HttpOnly', 'SameSite=Strict']
  if (SECURE_COOKIE()) attrs.push('Secure')
  attrs.push(`Max-Age=${maxAgeSec}`)
  const prev = res.getHeader('set-cookie')
  const arr = prev ? (Array.isArray(prev) ? prev : [prev]) : []
  res.setHeader('set-cookie', [...arr, attrs.join('; ')])
}

/* ---------- 用户库 ---------- */
function loadUsers() {
  return readJson(FILES.users, [])
}
function saveUsers(list) {
  writeJsonAtomic(FILES.users, list)
}
/* 首启建 owner（env 提供口令）；没配 ADMIN_EMAIL/ADMIN_PASSWORD 则不建，后台保持禁用 */
function bootstrap() {
  const users = loadUsers()
  if (users.length) return users
  const email = env('ADMIN_EMAIL').trim().toLowerCase()
  const pw = env('ADMIN_PASSWORD')
  if (!email || !pw) return []
  const owner = {
    id: crypto.randomUUID(),
    email,
    name: '初始管理员',
    role: 'owner',
    perms: [],
    tv: 0,
    disabled: false,
    hash: hashPassword(pw),
    createdAt: new Date().toISOString(),
  }
  saveUsers([owner])
  console.log('[admin] 已用 ADMIN_EMAIL 建立初始 owner：', email)
  return [owner]
}
function findUser(pred) {
  return loadUsers().find(pred)
}
/* 会话 -> 当前用户（校验 tv，禁用/改密即吊销） */
function currentUser(req) {
  const d = parseToken(parseCookies(req)[COOKIE])
  if (!d) return null
  const u = findUser((x) => x.id === d.uid)
  if (!u || u.disabled) return null
  if ((u.tv || 0) !== d.tv) return null
  return u
}
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, perms: u.perms || [], disabled: !!u.disabled, createdAt: u.createdAt })

/* ---------- 登录限流（内存，按 IP） ---------- */
const RATE = new Map()
const RATE_WINDOW_MS = 60000
const RATE_MAX = 8
function rateOk(ip) {
  const now = Date.now()
  if (RATE.size > 5000) for (const [k, v] of RATE) if (v.reset < now) RATE.delete(k) // 惰性清扫，防常驻 Map 慢漏
  const rec = RATE.get(ip)
  if (!rec || rec.reset < now) {
    RATE.set(ip, { n: 1, reset: now + RATE_WINDOW_MS })
    return true
  }
  rec.n++
  return rec.n <= RATE_MAX
}
/* 只有确认在反向代理后（生产，AUTH_COOKIE_SECURE=1）才采信 X-Forwarded-For：
   本地直连时 socket 地址就是真实客户端，误信可伪造的 XFF 会让限流被绕过。 */
function clientIp(req) {
  const sock = req.socket?.remoteAddress || '?'
  if (!SECURE_COOKIE()) return sock
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || sock
}

/* ---------- 内容（发布版，供后台读与官网公开读） ---------- */
export function readPublishedContent() {
  return readJson(FILES.content, {})
}

/* 内容补丁的深合并：
   · 嵌套普通对象 → 递归合并（只覆盖被编辑的叶子，其余保留），深度钳 8 层防病态入参；
   · 数组 / string / number / boolean → 整值替换（数组作为产品条目、标签列表等，不做逐项并）；
   · null → 删除该键（回落到 site.js 默认）；
   这样官网侧只需把 content.json 当作嵌套 overlay 深合并到默认上，两边同构。
   函数、undefined、超长字符串在写入前钳掉。 */
const isPlainObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
function mergeContent(base, patch, depth = 0) {
  // 只在 patch 为普通对象时递归合并；基座不是对象就当作空对象（新建分支）
  const out = isPlainObj(base) ? { ...base } : {}
  if (depth > 8 || !isPlainObj(patch)) return out
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) { delete out[k]; continue }
    if (isPlainObj(v)) {
      out[k] = mergeContent(isPlainObj(out[k]) ? out[k] : {}, v, depth + 1)
    } else if (typeof v === 'function' || v === undefined) {
      /* 忽略不可序列化值 */
    } else if (typeof v === 'string') {
      out[k] = v.slice(0, 4000)
    } else if (typeof v === 'number' || typeof v === 'boolean' || Array.isArray(v)) {
      out[k] = v
    }
  }
  return out
}

/* ---------- 工具：字段钳制 ---------- */
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max)
const cleanEmail = (v) => str(v, 120).toLowerCase()

/* ---------- CSV 注入转义：开头 = + - @ 或制表/回车前缀单引号 ---------- */
function csvCell(v) {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/* 线索查询：读全表→按行号标 id→按 q/status/product/source 过滤→新到旧。
   GET 分页与 CSV 导出共用同一套过滤，确保「筛完导出」与「屏上看到」的一致。 */
function queryLeads(search) {
  const q = new URLSearchParams(search || '')
  let rows = readJsonl(FILES.leads).map((r, i) => ({ id: String(i), ...r }))
  const term = str(q.get('q'), 60).toLowerCase()
  const status = str(q.get('status'), 20)
  const product = str(q.get('product'), 40)
  const source = str(q.get('source'), 40)
  if (term) rows = rows.filter((r) => [r.name, r.phone, r.org, r.region, r.note].join(' ').toLowerCase().includes(term))
  if (status) rows = rows.filter((r) => (r.status || 'new') === status)
  if (product) rows = rows.filter((r) => r.product === product)
  if (source) rows = rows.filter((r) => r.source === source)
  rows.reverse()
  return rows
}

/* ---------- 主处理器：url 形如 /admin/... ---------- */
export async function handleAdmin(req, res, url, deps) {
  const { json, readBody } = deps
  if (!adminEnabled()) return json(res, 503, { error: 'admin-disabled', message: '服务端未配置 AUTH_SECRET，管理后台未启用' })

  const sub = url.replace(/^\/admin/, '') || '/'
  const method = req.method
  const ip = clientIp(req)

  /* --- 公开（无需登录）：登录 / 登出 / 我 --- */
  if (sub === '/login' && method === 'POST') {
    if (!rateOk(ip)) return json(res, 429, { error: 'too-many', message: '尝试过于频繁，请 1 分钟后再试' })
    const body = await readBody(req).catch(() => ({}))
    const email = cleanEmail(body.email)
    const pw = String(body.password || '')
    const user = findUser((u) => u.email === email && !u.disabled)
    /* 无论账号是否存在都跑一次等量哈希校验，抹平耗时差（防计时枚举邮箱） */
    const ok = verifyPassword(pw, user ? user.hash : DUMMY_HASH)
    if (!user || !ok) return json(res, 401, { error: 'bad-credentials', message: '邮箱或密码不正确' })
    setCookie(res, makeToken(user), Math.floor(SESSION_TTL_MS / 1000))
    return json(res, 200, { user: publicUser(user), perms: effectivePerms(user) })
  }
  if (sub === '/logout' && method === 'POST') {
    setCookie(res, '', 0)
    return json(res, 200, { ok: true })
  }
  if (sub === '/me' && method === 'GET') {
    const u = currentUser(req)
    if (!u) return json(res, 401, { error: 'unauthorized' })
    return json(res, 200, { user: publicUser(u), perms: effectivePerms(u) })
  }

  /* --- 以下都要登录 --- */
  const user = currentUser(req)
  if (!user) return json(res, 401, { error: 'unauthorized', message: '未登录或会话已过期' })
  /* CSRF-lite：写操作要求自定义头（跨站表单发不出这个头，配合 SameSite=Strict 双保险） */
  if (method !== 'GET' && req.headers['x-admin'] !== '1') {
    return json(res, 403, { error: 'csrf', message: '缺少 x-admin 头' })
  }

  /* --- 本人自助（仅需登录）：改自己的资料 / 密码 --- */
  if (sub === '/profile' && method === 'PATCH') {
    const body = await readBody(req).catch(() => ({}))
    const users = loadUsers()
    const me = users.find((u) => u.id === user.id)
    me.name = str(body.name, 40) || me.name
    saveUsers(users)
    return json(res, 200, { user: publicUser(me), perms: effectivePerms(me) })
  }
  if (sub === '/password' && method === 'POST') {
    const body = await readBody(req).catch(() => ({}))
    const users = loadUsers()
    const me = users.find((u) => u.id === user.id)
    if (!verifyPassword(String(body.current || ''), me.hash)) return json(res, 400, { error: 'bad-current', message: '原密码不正确' })
    const npw = String(body.password || '')
    if (npw.length < 8) return json(res, 422, { error: 'weak', message: '新密码至少 8 位' })
    me.hash = hashPassword(npw)
    me.tv = (me.tv || 0) + 1 // 吊销包括自己在内的旧会话，需重新登录
    saveUsers(users)
    setCookie(res, '', 0)
    return json(res, 200, { ok: true, reauth: true })
  }

  /* --- 线索 --- */
  if (sub === '/leads' && method === 'GET') {
    if (!hasPerm(user, 'leads.read')) return json(res, 403, { error: 'forbidden' })
    const search = (req.url || '').split('?')[1] || ''
    const rows = queryLeads(search)
    const q = new URLSearchParams(search)
    const offset = Math.max(0, Number(q.get('offset')) || 0)
    const limit = Math.min(500, Math.max(1, Number(q.get('limit')) || 200))
    return json(res, 200, { total: rows.length, offset, limit, items: rows.slice(offset, offset + limit) })
  }
  if (sub === '/leads.csv' && method === 'GET') {
    if (!hasPerm(user, 'leads.read')) return json(res, 403, { error: 'forbidden' })
    /* 遵循当前筛选：与列表同一套 queryLeads，避免「筛完导出」与实际不一致 */
    const rows = queryLeads((req.url || '').split('?')[1] || '')
    const head = ['提交时间', '姓名', '手机号', '单位', '所在地区', '职位', '意向方向', '来源', '状态', '备注', 'IP']
    const body = rows
      .map((r) => [r.ts, r.name, r.phone, r.org, r.region, r.role, r.product, r.source, r.status || 'new', r.note, r.ip].map(csvCell).join(','))
      .join('\r\n')
    res.writeHead(200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="leads-${Date.now()}.csv"`,
      'cache-control': 'no-store',
    })
    return res.end('\ufeff' + head.join(',') + '\r\n' + body) // BOM 让 Excel 正确认 UTF-8
  }
  let m
  if ((m = sub.match(/^\/leads\/(\d+)$/)) && method === 'PATCH') {
    if (!hasPerm(user, 'leads.update')) return json(res, 403, { error: 'forbidden' })
    const idx = Number(m[1])
    const rows = readJsonl(FILES.leads)
    if (!rows[idx]) return json(res, 404, { error: 'not-found' })
    const body = await readBody(req).catch(() => ({}))
    if (body.status) rows[idx].status = str(body.status, 20)
    if (body.note != null) rows[idx].note = str(body.note, 500)
    rows[idx].updatedBy = user.email
    rows[idx].updatedAt = new Date().toISOString()
    writeJsonlAtomic(FILES.leads, rows)
    return json(res, 200, { ok: true, item: { id: String(idx), ...rows[idx] } })
  }

  /* --- 用户管理 --- */
  if (sub === '/users' && method === 'GET') {
    if (!hasPerm(user, 'users.manage')) return json(res, 403, { error: 'forbidden' })
    return json(res, 200, { items: loadUsers().map(publicUser), roles: Object.keys(ROLES) })
  }
  if (sub === '/users' && method === 'POST') {
    if (!hasPerm(user, 'users.manage')) return json(res, 403, { error: 'forbidden' })
    const body = await readBody(req).catch(() => ({}))
    const email = cleanEmail(body.email)
    const role = ROLES[body.role] ? body.role : 'viewer'
    const pw = String(body.password || '')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 422, { error: 'bad-email' })
    if (pw.length < 8) return json(res, 422, { error: 'weak', message: '初始密码至少 8 位' })
    const users = loadUsers()
    if (users.some((u) => u.email === email)) return json(res, 409, { error: 'exists' })
    const nu = { id: crypto.randomUUID(), email, name: str(body.name, 40) || email.split('@')[0], role, perms: [], tv: 0, disabled: false, hash: hashPassword(pw), createdAt: new Date().toISOString() }
    saveUsers([...users, nu])
    return json(res, 200, { user: publicUser(nu) })
  }
  if ((m = sub.match(/^\/users\/([\w-]+)(\/password)?$/))) {
    if (!hasPerm(user, 'users.manage')) return json(res, 403, { error: 'forbidden' })
    const users = loadUsers()
    const target = users.find((u) => u.id === m[1])
    if (!target) return json(res, 404, { error: 'not-found' })
    const owners = users.filter((u) => u.role === 'owner' && !u.disabled)
    if (method === 'PATCH') {
      const body = await readBody(req).catch(() => ({}))
      if (body.role && ROLES[body.role]) {
        if (target.role === 'owner' && body.role !== 'owner' && owners.length <= 1) return json(res, 409, { error: 'last-owner', message: '不能降级最后一个 owner' })
        target.role = body.role
      }
      if (body.name != null) target.name = str(body.name, 40) || target.name
      if (typeof body.disabled === 'boolean') {
        if (target.id === user.id) return json(res, 409, { error: 'self', message: '不能禁用自己' })
        if (target.role === 'owner' && body.disabled && owners.length <= 1) return json(res, 409, { error: 'last-owner' })
        target.disabled = body.disabled
        target.tv = (target.tv || 0) + 1
      }
      saveUsers(users)
      return json(res, 200, { user: publicUser(target) })
    }
    if (method === 'POST' && m[2] === '/password') {
      const body = await readBody(req).catch(() => ({}))
      const pw = String(body.password || '')
      if (pw.length < 8) return json(res, 422, { error: 'weak' })
      target.hash = hashPassword(pw)
      target.tv = (target.tv || 0) + 1
      saveUsers(users)
      return json(res, 200, { ok: true })
    }
    if (method === 'DELETE') {
      if (target.id === user.id) return json(res, 409, { error: 'self', message: '不能删除自己' })
      if (target.role === 'owner' && owners.length <= 1) return json(res, 409, { error: 'last-owner' })
      saveUsers(users.filter((u) => u.id !== target.id))
      return json(res, 200, { ok: true })
    }
  }

  /* --- 内容编辑 --- */
  if (sub === '/content' && method === 'GET') {
    if (!hasPerm(user, 'content.read')) return json(res, 403, { error: 'forbidden' })
    return json(res, 200, { content: readPublishedContent() })
  }
  if (sub === '/content' && method === 'PUT') {
    if (!hasPerm(user, 'content.manage')) return json(res, 403, { error: 'forbidden' })
    const body = await readBody(req).catch(() => ({}))
    if (!isPlainObj(body)) return json(res, 422, { error: 'bad-patch' })
    /* 嵌套 overlay：只把被编辑的叶子盖到已发布内容上，官网侧同样深合并到 site.js 默认 */
    const cur = mergeContent(readPublishedContent(), body)
    writeJsonAtomic(FILES.content, cur)
    return json(res, 200, { ok: true, content: cur })
  }

  return json(res, 404, { error: 'no-route' })
}

/* 供 ai-proxy 独立进程 / 测试：确保 owner 就绪 */
export function ensureAdminBoot() {
  if (!adminEnabled()) return { enabled: false, owners: 0 }
  const users = bootstrap()
  return { enabled: true, owners: users.filter((u) => u.role === 'owner' && !u.disabled).length }
}
