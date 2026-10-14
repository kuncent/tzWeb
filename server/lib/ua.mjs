/* ============================================================
 * User-Agent 分类：真人 / 搜索引擎 / AI 检索 / 社媒 / 其他
 * ------------------------------------------------------------
 * 决定两件事：
 *   ① 访问量统计里 PV/UV 只算 kind='real'；爬虫另开一列，不污染真实指标；
 *   ② GEO 面板把 kind='ai' 单独列出来（Generative Engine Optimization），
 *      ChatGPT / Perplexity / Claude / Google-Extended 这类是"AI 搜索有没有
 *      抓到我"的直接信号，比 SEO 面板里 GA 报的爬虫更贴近业务。
 * 名单按官方 UA 前缀写；匹配统一转小写，避免大小写敏感踩坑。
 * 顺序：越具体越前，先命中先归类；未命中即 'real'。
 * ============================================================ */

// kind ∈ 'real' | 'search' | 'ai' | 'social' | 'other'
const AI_UAS = [
  // OpenAI
  ['chatgpt-user', 'ChatGPT-User'],
  ['oai-searchbot', 'OAI-SearchBot'],
  ['gptbot', 'GPTBot'],
  ['chatgpt', 'ChatGPT'],
  // Anthropic
  ['claudebot', 'ClaudeBot'],
  ['claude-web', 'Claude-Web'],
  ['claudeuser', 'Claude-User'],
  ['anthropic-ai', 'Anthropic-AI'],
  // Google 系（AI 摘要抓取 + 传统搜索）
  ['google-extended', 'Google-Extended'],
  ['gemini-deep-research', 'Gemini-Deep-Research'],
  // Perplexity
  ['perplexitybot', 'PerplexityBot'],
  ['perplexity-user', 'Perplexity-User'],
  // You.com / DuckAssist / Cohere / Mistral / Meta / Apple
  ['youbot', 'YouBot'],
  ['duckassistbot', 'DuckAssistBot'],
  ['cohere-ai', 'Cohere-ai'],
  ['mistralai-robot', 'MistralAI-Robot'],
  ['meta-externalagent', 'Meta-ExternalAgent'],
  ['meta-externalfetcher', 'Meta-ExternalFetcher'],
  ['applebot-extended', 'Applebot-Extended'],
  // Common Crawl（常被 AI 训练复用）
  ['ccbot', 'CCBot'],
  // 字节 / 360 / ai-with-cloak 之类
  ['bytespider', 'Bytespider'],
  ['ai-with-cloak', 'AI-with-cloak'],
  ['diffbot', 'Diffbot'],
  ['tonybot', 'TonyBot'],
  ['f5-aebot', 'F5-AEBot'],
  ['zoombot', 'ZoomBot'],
  ['webinfoai', 'WebInfoAI'],
]

const SEARCH_UAS = [
  ['googlebot', 'Googlebot'],
  ['bingbot', 'Bingbot'],
  ['slurp', 'Yahoo (Slurp)'],
  ['baiduspider', 'Baiduspider'],
  ['sogou web spider', 'Sogou'],
  ['360spider', '360Spider'],
  ['yandexbot', 'YandexBot'],
  ['duckduckbot', 'DuckDuckBot'],
  ['haosouspider', 'HaoSouSpider'],
  ['yisouspider', 'YisouSpider'],
  ['applebot', 'Applebot'],
  ['petalbot', 'PetalBot'],
  ['seznambot', 'SeznamBot'],
  ['mojeekbot', 'MojeekBot'],
  ['qwantic', 'Qwantbot'],
]

const SOCIAL_UAS = [
  ['facebookexternalhit', 'Facebook'],
  ['facebot', 'Facebook'],
  ['twitterbot', 'Twitter'],
  ['linkedinbot', 'LinkedIn'],
  ['telegrambot', 'Telegram'],
  ['whatsapp', 'WhatsApp'],
  ['slackbot', 'Slack'],
  ['discordbot', 'Discord'],
  ['skypebot', 'Skype'],
  ['Pinterest', 'Pinterest'],
  ['pinterestbot', 'Pinterest'],
  ['slack-img-proxy', 'Slack Image'],
  ['keybase', 'Keybase'],
]

// 明确归到 'other'（不属真人的通用抓取工具、脚本、监控）
const OTHER_UAS = [
  ['curl/', 'curl'],
  ['wget/', 'wget'],
  ['python-requests', 'python-requests'],
  ['go-http-client', 'go-http-client'],
  ['okhttp', 'OkHttp'],
  ['java/', 'Java HttpClient'],
  ['node-fetch', 'node-fetch'],
  ['undici', 'undici'],
  ['axios', 'Axios'],
  ['phantomjs', 'PhantomJS'],
  ['headlesschrome', 'HeadlessChrome'],
  ['puppeteer', 'Puppeteer'],
  ['playwright', 'Playwright'],
  ['selenium', 'Selenium'],
  ['httpx', 'httpx'],
  ['scrapy', 'Scrapy'],
  ['masscan', 'Masscan'],
  ['zgrab', 'ZGrab'],
  ['nmap', 'Nmap'],
]

const pick = (ua) => {
  const s = String(ua || '').toLowerCase()
  for (const [k, name] of AI_UAS) if (s.includes(k)) return { kind: 'ai', bot: name }
  for (const [k, name] of SEARCH_UAS) if (s.includes(k)) return { kind: 'search', bot: name }
  for (const [k, name] of SOCIAL_UAS) if (s.includes(k)) return { kind: 'social', bot: name }
  for (const [k, name] of OTHER_UAS) if (s.includes(k)) return { kind: 'other', bot: name }
  return { kind: 'real', bot: '' }
}

/* 粗略判设备：只为前端"访问端"分组，不做严格 bot/mobile/desktop 三分；
   'other'/'ai'/'search'/'social' 都归 'bot'，与真实设备分开。 */
function deviceKind(ua, kind) {
  if (kind !== 'real') return 'bot'
  const s = String(ua || '').toLowerCase()
  if (/ipad|tablet/.test(s)) return 'tablet'
  if (/mobi|iphone|android.*mobile/.test(s)) return 'mobile'
  return 'desktop'
}

export function classifyUA(ua) {
  const { kind, bot } = pick(ua)
  return { kind, bot, device: deviceKind(ua, kind) }
}
