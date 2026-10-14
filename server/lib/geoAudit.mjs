/* ============================================================
 * GEO 只读审计：Generative Engine Optimization（面向 AI 检索的收录与曝光）
 * ------------------------------------------------------------
 * 与 SEO 面板并列做，检查项完全分开：
 *   · SEO 关心 Google/Bing 的排名与富媒体；
 *   · GEO 关心 ChatGPT / Perplexity / Claude 在回答里能不能引到你的原话。
 * 关键抓手：
 *   ① llms.txt（https://llmstxt.org/）—— 网站根放一份纯文本，AI 抓一次就懂"你是谁"；
 *   ② robots.txt 允许 AI 爬虫 UA（OAI-SearchBot / ClaudeBot / PerplexityBot ...）；
 *   ③ 内容可 RAG 摘取（明确的段落化事实句、少动效多文字、结构化 JSON-LD）；
 *   ④ AI 爬虫有没有真的来过 —— 从 visits.jsonl 里 kind='ai' 的行直接给。
 * 面板输出：
 *   items[]：清单式条目，与 SEO 面板同一个 AuditList 组件渲染；
 *   aiBots：近 N 日 AI 爬虫命中排行 + 时间轴；
 *   llms：若存在则给字节数与前 400 字摘要。
 * ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getBots, getDaily } from '../stats.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const DIST = path.join(ROOT, 'dist')

const readIf = (p) => {
  try { return fs.readFileSync(p, 'utf8') } catch { return null }
}

/* 已知主流 AI 爬虫 UA 令牌：robots.txt 若显式 Disallow 了它们就是 GEO 阻断。 */
const AI_BOT_TOKENS = [
  'ChatGPT-User', 'OAI-SearchBot', 'GPTBot', 'ChatGPT',
  'ClaudeBot', 'Claude-Web', 'Claude-User', 'anthropic-ai',
  'Google-Extended', 'Gemini-Deep-Research',
  'PerplexityBot', 'Perplexity-User',
  'Applebot-Extended', 'YouBot', 'DuckAssistBot', 'cohere-ai',
  'MistralAI-Robot', 'Meta-ExternalAgent', 'Meta-ExternalFetcher',
  'CCBot', 'Bytespider', 'ai-with-cloak', 'Diffbot',
]

/* 解析 robots.txt 里针对具体 UA 的 Disallow；简化：只看 "User-agent: X" 后紧跟
   "Disallow: /"（或 /api 之外的整站拦）判为阻断。允许规则更宽松则视作 pass。 */
function parseRobotsBlock(robotsRaw) {
  const blocks = []
  const lines = String(robotsRaw || '').split(/\r?\n/)
  let cur = null
  for (const line of lines) {
    const s = line.trim()
    if (!s || s.startsWith('#')) continue
    const ua = s.match(/^user-agent:\s*(.+)$/i)?.[1]?.toLowerCase()
    if (ua) {
      cur = { ua, disallow: [], allow: [] }
      blocks.push(cur)
      continue
    }
    const d = s.match(/^disallow:\s*(.*)$/i)
    const a = s.match(/^allow:\s*(.*)$/i)
    if (d && cur) cur.disallow.push(d[1].trim())
    if (a && cur) cur.allow.push(a[1].trim())
  }
  return blocks
}
function blockedFor(blocks, token) {
  const t = token.toLowerCase()
  const hit = blocks.find((b) => b.ua === t) || blocks.find((b) => b.ua === '*')
  if (!hit) return false
  // Disallow: / 或 空 Disallow 视为整站拦；Disallow: /admin 等子路径不算拦 SEO 关键页
  return hit.disallow.some((x) => x === '/' || x === '')
}

export function geoAudit({ rows = [] } = {}) {
  const items = []
  const idxPath = path.join(DIST, 'index.html')
  const html = readIf(idxPath)

  /* 1. llms.txt */
  const llmsRaw = readIf(path.join(DIST, 'llms.txt'))
  items.push({
    key: 'llms-txt',
    label: 'llms.txt 存在',
    pass: !!llmsRaw,
    detail: llmsRaw ? `dist/llms.txt（${llmsRaw.length} 字节）` : '未构建 dist/llms.txt',
    advice: llmsRaw
      ? ''
      : '在 public/llms.txt 放一份：顶部一段讲"你是谁/做什么/给谁用"，下面列关键页 URL + 一句话摘要；ChatGPT/Perplexity/Claude 都会优先读这份',
  })
  if (llmsRaw) {
    const hasHeading = /^#\s+\S+/m.test(llmsRaw)
    const hasList = /^\s*-\s+\[.+?\]\(.+?\)/m.test(llmsRaw)
    items.push({
      key: 'llms-shape',
      label: 'llms.txt 结构合规',
      pass: hasHeading && hasList,
      detail: `${hasHeading ? '有 H1 标题' : '缺 H1 标题'} / ${hasList ? '有链接列表' : '缺链接列表'}`,
      advice: hasHeading && hasList ? '' : 'llms.txt 规范：首行一行「# 网站名」，一段摘要，然后「## 章节」下每条「- [页面标题](https://...): 一句话说明」',
    })
  }

  /* 2. robots.txt 对 AI 爬虫的策略 */
  const robotsRaw = readIf(path.join(DIST, 'robots.txt'))
  const blocks = parseRobotsBlock(robotsRaw)
  const blockedBots = AI_BOT_TOKENS.filter((t) => blockedFor(blocks, t))
  items.push({
    key: 'ai-robots-open',
    label: 'AI 爬虫未被 Disallow',
    pass: !!robotsRaw && blockedBots.length === 0,
    detail: !robotsRaw
      ? '未构建 robots.txt（默认所有 UA 可抓）'
      : blockedBots.length
        ? `被拦：${blockedBots.join(', ')}`
        : '允许主流 AI 爬虫抓取',
    advice: !robotsRaw
      ? '补一份 robots.txt 至少显式 User-agent: * / Allow: /，避免因浏览器默认策略被限'
      : blockedBots.length
        ? '想让 ChatGPT/Perplexity 在回答里引到你的原话，就要允许它们的 bot 抓站点内容'
        : '',
  })

  /* 3. 内容结构：JSON-LD 中是否含 Product/FAQPage/BreadcrumbList（AI 引用靠这些） */
  const ldScripts = html ? Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)).map((m) => m[1]) : []
  const ldTypes = new Set()
  for (const raw of ldScripts) {
    try {
      const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [JSON.parse(raw)]
      for (const one of arr) {
        const t = one['@type']
        if (t) (Array.isArray(t) ? t : [t]).forEach((x) => ldTypes.add(x))
      }
    } catch { /* ignore */ }
  }
  const geoWant = ['Organization', 'WebSite', 'Product', 'FAQPage', 'BreadcrumbList']
  const geoHave = geoWant.filter((t) => ldTypes.has(t))
  const geoMiss = geoWant.filter((t) => !ldTypes.has(t))
  items.push({
    key: 'geo-jsonld',
    label: 'AI 友好 JSON-LD',
    pass: geoHave.length >= 2,
    detail: ldTypes.size ? `已有：${geoHave.join(', ') || '无（其他 type 已声明）'} / 缺：${geoMiss.join(', ') || '无'}` : '缺失 JSON-LD',
    advice: ldTypes.size === 0 ? '最少给 Organization + WebSite 两块；进阶加 Product / FAQPage / BreadcrumbList' : (geoMiss.length ? `再补：${geoMiss.join(', ')}` : ''),
  })

  /* 4. 语义 HTML：内容里要有 <main>/<article>/<h1>，AI 才摘得准 */
  const hasMain = /<main\b/i.test(html || '')
  const hasH1 = /<h1\b/i.test(html || '')
  const articleCount = ((html || '').match(/<article\b/gi) || []).length
  items.push({
    key: 'semantic',
    label: '语义 HTML 骨架',
    pass: hasMain || hasH1 || articleCount > 0,
    detail: `<main> ${hasMain ? '✓' : '✗'} / <h1> ${hasH1 ? '✓' : '✗'} / <article> ${articleCount} 处`,
    advice: (hasMain && hasH1) ? '' : '营销首屏大量用 <div> 排布，爬虫会失去层级线索；至少保证 <main> 与一个 <h1>（本项目走 React.lazy，服务端 index.html 拿不到动态内容属预期，考虑加预渲染）',
  })

  /* 5. AI 爬虫命中：过去 N 天里 kind='ai' 的行 */
  const botRows = getBots(rows)
  const aiRows = botRows.filter((b) => b.kind === 'ai')
  const aiTotal = aiRows.reduce((s, b) => s + b.hits, 0)
  items.push({
    key: 'ai-hits',
    label: 'AI 爬虫近 30 日到访',
    pass: aiTotal > 0,
    detail: aiTotal ? `命中 ${aiTotal} 次，跨 ${aiRows.length} 家 bot` : '30 日内无 AI 爬虫记录',
    advice: aiTotal
      ? ''
      : '站点还没被 AI 侧关注。三个抓手：① llms.txt 落地；② 允许 AI 爬虫；③ 到 https://perplexity.com/submit 与 OpenAI 站长入口主动提交 sitemap',
  })

  /* 6. 摘要：把 llms.txt 前 400 字截出来，方便在面板里预览 */
  const llmsPreview = llmsRaw ? llmsRaw.slice(0, 400) : ''

  return {
    items,
    aiBots: aiRows.map((b) => ({ bot: b.bot, hits: b.hits, lastSeen: b.lastSeen, paths: b.paths })),
    searchBots: botRows.filter((b) => b.kind === 'search').map((b) => ({ bot: b.bot, hits: b.hits, lastSeen: b.lastSeen })),
    aiDaily: getDaily(rows, 30).map((d) => ({ date: d.date, aiHits: d.aiHits })),
    llms: {
      exists: !!llmsRaw,
      bytes: llmsRaw ? llmsRaw.length : 0,
      preview: llmsPreview,
    },
    summary: {
      total: items.length,
      pass: items.filter((i) => i.pass).length,
      warn: items.filter((i) => !i.pass).length,
      aiHits30d: aiTotal,
    },
  }
}
