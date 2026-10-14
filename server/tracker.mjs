/* ============================================================
 * 访问埋点：/api/ai/track 的 POST 处理器
 * ------------------------------------------------------------
 * 为什么前端上报而不是服务端拦截 GET /：
 *   本项目是 SPA，服务端只会看到首屏那一次 GET / 与 /admin；React Router 客户端跳转
 *   根本不经过服务端，靠服务端拦截会把 pv 打成一比十的漏采。sendBeacon 走
 *   POST /api/ai/track，客户端 useLocation 一变就打一发，pv 才准。
 *
 * 数据字段（写进 visits/YYYYMMDD.jsonl）：
 *   ts       服务端接收时间（不用客户端 Date，避免访客系统时钟漂移污染日切）
 *   path     当前路由，去掉 query 与 hash，只保留 pathname
 *   title    客户端 document.title（可选）
 *   ref      document.referrer 的 hostname；空表示直接访问
 *   vh       前端 sessionStorage 里的 UUID，跨会话新访客；服务端不存 cookie
 *   ip       真实客户端 IP（CF 头优先，回落 XFF 首段，回落 socket）
 *   ua       原始 UA（截 200 字防灌）
 *   tz       客户端 Intl 时区（粗判地区，与 xdb 结果互相印证）
 *   lang     navigator.language
 *   screen   规范化字符串 "宽x高xdpr"（兼容旧数组），仅供后台按设备去重用
 *   kind     real/search/ai/social/other
 *   bot      命中 UA 时的具体 bot 名，未命中为空
 *   device   real→desktop/mobile/tablet；其余归 bot
 *   cc       国家码（xdb 得到；本机演示 127.0.0.1 拿不到 → 空）
 *   country / province / city / isp  xdb 结果，缺则空串
 *   xdb_hit  是否命中 xdb（便于面板显式提示"IP 库未加载"降级）
 *
 * 不做的事：
 *   · 不设 cookie、不写死浏览器指纹 —— 隐私友好，也省掉 EU 弹窗；
 *   · 不做严格 anti-abuse，只按 IP 15/min 节流（正常用户切页 3s 一次到不了这阈值）；
 *   · 不异步富化（xdb 已在内存，同步 <1ms，反而简单）。
 * ============================================================ */
import crypto from 'node:crypto'
import { appendVisit, FILES } from './data.mjs'
import { classifyUA } from './lib/ua.mjs'
import { loadXdb, searchIp, isXdbLoaded } from './lib/xdb.mjs'

/* 首启 lazy 载入 v4/v6 xdb；任一缺失或读失败也不炸站 —— 只是对应栈的地区字段变空。 */
let xdbTried = false
function ensureXdb() {
  if (xdbTried) return isXdbLoaded()
  xdbTried = true
  try {
    const { v4, v6 } = loadXdb(FILES.xdb, FILES.xdbV6)
    console.log('[tracker] ip2region xdb：', `IPv4=${v4 ? '已载入' : '缺失'}`, `IPv6=${v6 ? '已载入' : '缺失'}`)
    if (!v4 && !v6) console.warn('[tracker] 未找到任何 xdb（跑一次 npm run pull-ipdb 即可），地区列降级为空')
    else if (!v6) console.warn('[tracker] 缺 IPv6 库，IPv6 访客地区会落「未知」（跑 npm run pull-ipdb 补齐）')
  } catch (e) {
    console.warn('[tracker] xdb 载入失败：', e.message)
  }
  return isXdbLoaded()
}

/* 真实客户端 IP：Cloudflare 隧道会给 cf-connecting-ip；反代链路上用 XFF 首段；
   本机直连时回落 socket.remoteAddress。与 admin.mjs 的 clientIp 保持同语义。 */
function clientIp(req) {
  const cf = String(req.headers['cf-connecting-ip'] || '').trim()
  if (cf) return cf.split(',')[0].trim()
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  if (xff) return xff
  return req.socket?.remoteAddress || ''
}

/* 按 IP 节流：15/min 覆盖 SPA 正常切页；灌包脚本很快被拒（429），不落盘。
   Map 表项随时间惰性清扫，无常驻泄漏。 */
const RATE = new Map()
const RATE_WINDOW_MS = 60000
const RATE_MAX = 15
function rateOk(ip) {
  const now = Date.now()
  if (RATE.size > 5000) for (const [k, v] of RATE) if (v.reset < now) RATE.delete(k)
  const rec = RATE.get(ip)
  if (!rec || rec.reset < now) {
    RATE.set(ip, { n: 1, reset: now + RATE_WINDOW_MS })
    return true
  }
  rec.n++
  return rec.n <= RATE_MAX
}

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max)

/* referrer 域名归一：只保留 hostname，去端口去尾点，方便后续按域名分桶。 */
function refHost(ref) {
  const s = str(ref, 300)
  if (!s) return ''
  try {
    const u = new URL(s)
    return u.hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return ''
  }
}

/* 归一化 path：剥 query/hash，压掉尾斜杠（保留根路径 '/'），
   防 /solutions/ 与 /solutions 被算作两条页面。 */
function normPath(p) {
  const s = str(p, 200).split('?')[0].split('#')[0] || '/'
  if (s.length > 1 && s.endsWith('/')) return s.slice(0, -1)
  return s
}

/* 分辨率归一：客户端传 "宽x高[dxdpr]" 字符串；也兼容旧的 [w,h,dpr] 数组。统一存紧凑字符串。 */
function normScreen(s) {
  if (Array.isArray(s)) return s.slice(0, 3).map((n) => Number(n) || 0).join('x')
  return String(s || '').replace(/\s+/g, '').slice(0, 24)
}

export function handleTrack(payload, req) {
  const ip = clientIp(req)
  if (!rateOk(ip || 'unknown')) {
    return { ok: false, status: 429, error: 'too-many' }
  }
  const uaRaw = str(req.headers['user-agent'], 300)
  const cls = classifyUA(uaRaw)

  let geo = { country: '', province: '', city: '', isp: '', cc: '' }
  let xdbHit = false
  if (ensureXdb()) {
    const r = searchIp(ip)
    if (r) {
      geo = r
      xdbHit = true
    }
  }

  const ts = Date.now()
  const row = {
    ts,
    path: normPath(payload.path || req.url || '/'),
    title: str(payload.title, 120),
    ref: refHost(payload.ref || req.headers.referer || ''),
    vh: str(payload.vh, 64),
    ip,
    ua: uaRaw,
    tz: str(payload.tz, 60),
    lang: str(payload.lang, 20),
    screen: normScreen(payload.screen),
    kind: cls.kind,
    bot: cls.bot,
    device: cls.device,
    country: geo.country,
    province: geo.province,
    city: geo.city,
    isp: geo.isp,
    cc: geo.cc,
    xdb_hit: xdbHit,
  }
  // 短哈希让前端"新访客"判定能一致（vh + day + ip 哈希，同一天同 IP 同 vh 视为同一人）
  row.uv = crypto.createHash('sha1').update(`${row.vh}|${ip}`).digest('hex').slice(0, 12)
  appendVisit(row)
  return { ok: true, status: 204 }
}

export function trackerStatus() {
  return { xdbLoaded: isXdbLoaded(), xdbPath: FILES.xdb, xdbV6Path: FILES.xdbV6 }
}
