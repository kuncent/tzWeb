/* ============================================================
 * 访问统计聚合：把 visits/YYYYMMDD.jsonl 汇成后台要看的六张视图
 * ------------------------------------------------------------
 * 一次读、多次算：admin.mjs 里每个 stats 路由都通过 loadWindow(days) 拉一份 rows
 * 到内存（demo 量级：30 天 × ~几百行 = 万级），再走不同的 reducer。省 IO 也
 * 免得各路由对时间窗/日切理解不一致。真上生产可加一层 summary.json 缓存，
 * 本次按方案里"先不做"这条走。
 *
 * 真人 PV/UV 只算 kind==='real'；爬虫单列（search/ai/social/other），
 * 面板上把两套数字分开呈现，避免"AI 爬虫一天来 200 次"被误读成"访客 200"。
 *
 * UV 口径：vh 优先（sessionStorage 里前端生成，跨标签页共享会话），
 *   回落到 uv（服务端 ip+vh 哈希）—— 保证同一设备同一浏览器同一天算一个人；
 *   跨会话（关闭浏览器再打开）算新访客。
 * ============================================================ */
import { readVisitsRange, toKeyLocal } from './data.mjs'

const DAY = 86400000

/* 拉时间窗：days 天含"今天"往回推。fromKey/toKey 用 UTC+8 日切（与 data.mjs 同步）。 */
export function loadWindow(days = 30) {
  const to = toKeyLocal(Date.now())
  const from = toKeyLocal(Date.now() - (Math.max(1, days) - 1) * DAY)
  return { rows: readVisitsRange(from, to), from, to }
}

const uniq = (arr) => Array.from(new Set(arr))

/* 设备指纹归一：新行存字符串 "宽x高xdpr"，历史行的 screen 多为空数组 [] → 归空串。
   空串不参与区分，聚类自动退化到 IP+UA，不影响可用。 */
function screenKey(r) {
  const s = r.screen
  if (Array.isArray(s)) return s.filter((n) => Number(n) > 0).join('x')
  return String(s || '').trim()
}
/* 合成/探测流量：我们自己的脚本发的埋点会带一个非 UUID 的 vh 标记（curl/probe/test…）；
   真浏览器要么有 UUID 要么留空（隐私模式）。据此把探测从"人数"口径里剔掉，
   但不动 PV/UV 主口径（主口径是会话级，与"人数"是两个维度）。 */
const SYNTH_VH = /^(curl|probe|probing|test|seed|sim|node|undici|script|manual|self|dev[-_]|local[-_])/i
function isSynthetic(r) {
  const vh = String(r.vh || '')
  return vh ? SYNTH_VH.test(vh) : false
}

/* ---------- ① overview ---------- */
export function getOverview(rows) {
  const humans = rows.filter((r) => r.kind === 'real')
  const aiHits = rows.filter((r) => r.kind === 'ai')
  const searchHits = rows.filter((r) => r.kind === 'search')
  const socialHits = rows.filter((r) => r.kind === 'social')
  const uvSet = new Set(humans.map((r) => r.vh || r.uv))
  // 新访客：同 vh 在整个窗口内第一次出现的时刻 < 今天 00:00 视为"老"，否则"新"
  // 无 vh（早期或某些严格隐私模式）回落 uv 哈希
  const firstSeen = new Map()
  for (const r of humans) {
    const k = r.vh || r.uv
    if (!k) continue
    const cur = firstSeen.get(k)
    if (cur == null || r.ts < cur) firstSeen.set(k, r.ts)
  }
  const todayStart = startOfToday()
  let newVisitors = 0
  for (const ts of firstSeen.values()) if (ts >= todayStart) newVisitors++

  // 每访问页数：以 (vh|uv, dayKey) 分组，一次"会话"跨零点视作两次
  const sessMap = new Map()
  for (const r of humans) {
    const k = (r.vh || r.uv) + '@' + toKeyLocal(r.ts)
    sessMap.set(k, (sessMap.get(k) || 0) + 1)
  }
  let totalPages = 0
  let sessionCount = 0
  for (const c of sessMap.values()) {
    totalPages += c
    sessionCount++
  }
  const avgPagesPerVisit = sessionCount ? totalPages / sessionCount : 0

  // 最热页（真人口径）
  const pathCnt = new Map()
  for (const r of humans) pathCnt.set(r.path, (pathCnt.get(r.path) || 0) + 1)
  let topPage = ''
  let topPageCount = 0
  for (const [p, c] of pathCnt) if (c > topPageCount) { topPage = p; topPageCount = c }

  /* 去重"人/设备"估计（第2项）：真人 PV 里剔除合成探测后，按 IP + UA + 分辨率 聚类。
     比会话级 UV 更贴近"多少个人"（关标签页重开不再被当新人），但是估计值：
       · 共享出口（校园网/CGNAT）下一个 IP 后可能多人 → 低估；
       · 同型号同分辨率设备指纹碰撞 → 低估；一人换网/动态 IP 或多 IPv6 临时地址 → 高估。
     distinctIps 是独立出口 IP 数（人数的下界参考）。 */
  const cleanHumans = humans.filter((r) => !isSynthetic(r))
  const devSet = new Set()
  const ipSet = new Set()
  const devToday = new Set()
  for (const r of cleanHumans) {
    const ip = r.ip || ''
    const dev = `${ip}|${r.ua || ''}|${screenKey(r)}`
    if (ip) ipSet.add(ip)
    devSet.add(dev)
    if (r.ts >= todayStart) devToday.add(dev)
  }

  return {
    pv: humans.length,
    uv: uvSet.size,
    newVisitors,
    avgPagesPerVisit: Number(avgPagesPerVisit.toFixed(2)),
    aiCrawlerHits: aiHits.length,
    searchCrawlerHits: searchHits.length,
    socialCrawlerHits: socialHits.length,
    topPage: topPageCount ? { path: topPage, pv: topPageCount } : null,
    devices: devSet.size, // 去重"人/设备"估计（IP+UA+分辨率 聚类，已剔探测）
    devicesToday: devToday.size, // 今日新增去重设备（同口径，仅统计今天）
    distinctIps: ipSet.size, // 独立出口 IP 数（人数下界参考）
    probeExcluded: humans.length - cleanHumans.length, // 从人数口径剔除的合成探测条数
  }
}

function startOfToday() {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime() - 8 * 3600 * 1000
}

/* ---------- ② daily：逐日 pv/uv/aiHits/searchHits ---------- */
export function getDaily(rows, days = 30) {
  // 先把空日填上（0 计数），保证前端折线 x 轴连续不"跳日"
  const buckets = new Map()
  const now = Date.now()
  for (let i = days - 1; i >= 0; i--) {
    const k = toKeyLocal(now - i * DAY)
    buckets.set(k, { date: fmtKey(k), pv: 0, uv: new Set(), aiHits: 0, searchHits: 0 })
  }
  for (const r of rows) {
    const k = toKeyLocal(r.ts)
    const b = buckets.get(k)
    if (!b) continue
    if (r.kind === 'real') {
      b.pv++
      const u = r.vh || r.uv
      if (u) b.uv.add(u)
    } else if (r.kind === 'ai') b.aiHits++
    else if (r.kind === 'search') b.searchHits++
  }
  return Array.from(buckets.values()).map((b) => ({
    date: b.date,
    pv: b.pv,
    uv: b.uv.size,
    aiHits: b.aiHits,
    searchHits: b.searchHits,
  }))
}
function fmtKey(k) {
  // YYYYMMDD → YYYY-MM-DD，前端折线 x 轴好读
  return `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`
}

/* ---------- ③ regions：国家 + 中国省级 ----------
   country 仍按真人 PV 计数（此视图已从"国家"切到"国内省份"，countries 仅作 API 兼容保留）。
   province 只在 cc==='CN' 且 province 非空时计入，且为「去重设备」口径（同省同一台设备
   IP+UA+分辨率 只算 1，合成探测剔除）：count=窗口内去重设备（驱动地图色阶），
   today=今日到访的去重设备数（地图悬浮显示）。today 是 count 的子集（今日 ⊆ 窗口）。 */
export function getRegions(rows) {
  const humans = rows.filter((r) => r.kind === 'real')
  const byCountry = new Map()
  const provDev = new Map()
  const provDevToday = new Map()
  const ts0 = startOfToday()
  for (const r of humans) {
    const code = r.cc || ''
    const ckey = code || r.country || ''
    byCountry.set(ckey, (byCountry.get(ckey) || 0) + 1)
    if (code === 'CN' && r.province && !isSynthetic(r)) {
      const dev = `${r.ip || ''}|${r.ua || ''}|${screenKey(r)}`
      if (!provDev.has(r.province)) provDev.set(r.province, new Set())
      provDev.get(r.province).add(dev)
      if (r.ts >= ts0) {
        if (!provDevToday.has(r.province)) provDevToday.set(r.province, new Set())
        provDevToday.get(r.province).add(dev)
      }
    }
  }
  const sortCount = (m) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, count }))
  const provinces = Array.from(provDev.entries())
    .map(([code, set]) => ({ code, count: set.size, today: provDevToday.has(code) ? provDevToday.get(code).size : 0 }))
    .sort((a, b) => b.count - a.count)
  return { countries: sortCount(byCountry), provinces }
}

/* ---------- ④ pages：真人 PV Top N ---------- */
export function getPages(rows, limit = 20) {
  const humans = rows.filter((r) => r.kind === 'real')
  const m = new Map()
  for (const r of humans) {
    const e = m.get(r.path) || { path: r.path, pv: 0, uv: new Set(), lastSeen: 0 }
    e.pv++
    if (r.vh || r.uv) e.uv.add(r.vh || r.uv)
    if (r.ts > e.lastSeen) e.lastSeen = r.ts
    m.set(r.path, e)
  }
  return Array.from(m.values())
    .map((e) => ({ path: e.path, pv: e.pv, uv: e.uv.size, lastSeen: e.lastSeen }))
    .sort((a, b) => b.pv - a.pv)
    .slice(0, limit)
}

/* ---------- ⑤ sources：ref 域名分桶 ----------
   直接访问 / 搜索引擎 / 社媒 / AI 摘要 / 站内自跳 / 外部其他。 */
const SEARCH_DOMAINS = ['google.', 'bing.', 'baidu.', 'sogou.', 'so.com', '360.cn', 'duckduckgo.', 'yandex.', 'search.brave.', 'ecosia.']
const SOCIAL_DOMAINS = ['facebook.', 'twitter.', 'x.com', 't.co', 'linkedin.', 'weixin.', 'wechat.', 'weibo.', 'zhihu.', 'xiaohongshu.', 'douyin.', 'tiktok.', 'reddit.', 'youtube.', 'bilibili.']
const AI_DOMAINS = ['chatgpt.', 'openai.', 'perplexity.', 'claude.', 'anthropic.', 'copilot.', 'gemini.', 'bard.', 'you.com', 'cohere.']

function bucketRef(ref, ownHosts) {
  if (!ref) return 'direct'
  const r = ref.toLowerCase()
  if (ownHosts.some((h) => r === h || r.endsWith('.' + h))) return 'internal'
  if (SEARCH_DOMAINS.some((d) => r.includes(d))) return 'search'
  if (SOCIAL_DOMAINS.some((d) => r.includes(d))) return 'social'
  if (AI_DOMAINS.some((d) => r.includes(d))) return 'ai'
  return 'external'
}

export function getSources(rows, ownHosts = []) {
  const humans = rows.filter((r) => r.kind === 'real')
  const m = new Map()
  for (const r of humans) {
    const b = bucketRef(r.ref, ownHosts)
    m.set(b, (m.get(b) || 0) + 1)
  }
  const order = ['direct', 'search', 'social', 'ai', 'internal', 'external']
  return order.filter((k) => m.has(k)).map((bucket) => ({ bucket, count: m.get(bucket) }))
}

/* ---------- ⑥ bots：AI 与搜索引擎 bot 排行 + 各自 Top 路径 ---------- */
export function getBots(rows) {
  const bots = rows.filter((r) => r.kind !== 'real' && r.bot)
  const m = new Map()
  for (const r of bots) {
    const k = `${r.kind}::${r.bot}`
    const e = m.get(k) || { bot: r.bot, kind: r.kind, hits: 0, lastSeen: 0, paths: new Map() }
    e.hits++
    if (r.ts > e.lastSeen) e.lastSeen = r.ts
    e.paths.set(r.path, (e.paths.get(r.path) || 0) + 1)
    m.set(k, e)
  }
  return Array.from(m.values())
    .map((e) => ({
      bot: e.bot,
      kind: e.kind,
      hits: e.hits,
      lastSeen: e.lastSeen,
      paths: Array.from(e.paths.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    }))
    .sort((a, b) => b.hits - a.hits)
}

/* ---------- ⑦ devices：真人访问端分布 ---------- */
export function getDevices(rows) {
  const humans = rows.filter((r) => r.kind === 'real')
  const m = new Map()
  for (const r of humans) {
    const d = r.device || 'desktop'
    m.set(d, (m.get(d) || 0) + 1)
  }
  return Array.from(m.entries()).map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count)
}

/* 前端要展示"近 N 日 AI 爬虫逐日命中"，用 daily 里 aiHits 已足够；不重复。 */
export { uniq as _uniq }
