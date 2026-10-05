/* ============================================================
 * 天择教育 · AI 课堂服务端代理
 * ------------------------------------------------------------
 * 唯一职责：把前端的课堂生成 / 问答请求转给通义千问（DashScope 的
 * OpenAI 兼容模式），并把 API Key 完完全全留在服务端。
 *
 * 为什么必须有这一层：Key 一旦出现在 src/ 里，就会被 Vite 打进
 * dist 的 JS 产物，任何人查看网页源码就能拿走它 —— 前端无秘密。
 * 所以浏览器只会看到 /api/ai/*，永远看不到 Authorization 头。
 *
 * 配置（项目根 .env，或进程环境变量）：
 *   QWEN_API_KEY   必填。也接受别名 DASHSCOPE_API_KEY
 *   QWEN_MODEL     默认 qwen-plus；换成别的只改这一行
 *   QWEN_BASE_URL  默认 https://dashscope.aliyuncs.com/compatible-mode/v1
 *   QWEN_ENABLE_THINKING  默认 false：qwen3.8-flash 这类带思考的模型，
 *                 实测生成一堂课 59.5s（关思考 17.8s），演示现场等不起
 *   QWEN_OFFLINE  默认空。置 1 则强制视为未配 key，用来验离线降级通路
 *
 * 两种跑法：
 *   1) 开发/预览：vite.config.js 里的插件已经把本文件挂到 /api/ai，
 *      npm run dev / npm run preview 都直接可用，不用额外起进程。
 *   2) 独立进程：node server/ai-proxy.mjs  （默认 8787，PORT 可改）
 *      生产静态站用 Nginx 把 /api/ai 反代到这里即可。
 *
 * /prepare（智能备课）是唯一走 SSE 的路由：OpenMAIC 的流水线是
 * 「大纲 1 次 + 逐页 N 次」调用，一次 HTTP 往返装不下，所以改成
 * 边生成边推：outline → slide×N → done，空闲 90s 无事件判失败。
 * ============================================================ */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateDeck, offlineDeckEvents } from './maic-deck.mjs'
import { handleAdmin, readPublishedContent, ensureAdminBoot, configureAdmin } from './admin.mjs'
import { FILES, appendJsonl } from './data.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
/* 找 .env 的候选目录：被 Vite 的 config 加载器打包时，import.meta.url 会指向
   项目根下那个临时 config 文件，dirname 就不再是 server/ 了 ——
   所以三个候选都试，第一个命中的算（npm 跑起来时 cwd 就是项目根）。 */
const ENV_DIRS = [path.resolve(HERE, '..'), HERE, process.cwd()]

/* ---------- 1. 读 .env（不引 dotenv：一个键值文件而已） ---------- */
function loadEnv() {
  const out = {}
  const file = ENV_DIRS.map((d) => path.join(d, '.env')).find((f) => fs.existsSync(f))
  if (!file) return out
  try {
    const txt = fs.readFileSync(file, 'utf8')
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const i = line.indexOf('=')
      if (i < 0) continue
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    /* 没有 .env 也照常工作：只是走离线演示 */
  }
  return out
}

const ENV = loadEnv()
const env = (k) => process.env[k] || ENV[k] || ''
/* 把解析好的 .env 表注入后台模块：admin.mjs 的 import 求值早于这里，
   只能靠 configureAdmin 传一份回落表，它内部每次现读（见 admin.mjs 说明）。 */
configureAdmin(ENV)
const ADMIN_BOOT = ensureAdminBoot()

/* 离线降级的验证闸：QWEN_OFFLINE=1 就当作压根没配 key。
   做这一步不能靠改 .env 或删环境变量 —— env() 优先读 process.env、
   再回落到 .env 文件，进程里抹不干净；只有这一行能把在线态关掉。 */
const FORCED_OFFLINE = /^(1|true|yes)$/i.test(env('QWEN_OFFLINE'))
const API_KEY = FORCED_OFFLINE ? '' : env('QWEN_API_KEY') || env('DASHSCOPE_API_KEY')
const MODEL = env('QWEN_MODEL') || 'qwen-plus'
const BASE_URL = (env('QWEN_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '')
/* qwen3.8-flash 这类「先思考再作答」的模型，默认要憋两千多个 reasoning token：
   实测生成一堂课 59.5s（关思考 17.8s），演示现场等不起，所以默认关。
   想用推理质量换时间，就 .env 里写 QWEN_ENABLE_THINKING=true。 */
const THINKING = /^(1|true|yes)$/i.test(env('QWEN_ENABLE_THINKING') || 'false')

/* ---------- 1.1 线索落地（联系表单的真实去向） ----------
   整站转化漏斗的最后一步：访客留资必须真的存下来，否则「提交成功」只是自欺。
   默认落一份 JSON Lines（服务端本地、不进仓库）；生产要接邮件 / 企业微信 / CRM，
   只改 sinkLead 这一个函数即可，前端与路由都不动。 */
/* 落地统一走 data.mjs：线索 JSONL 追加（默认 server/data/leads.jsonl，LEADS_FILE 可覆盖）。
   生产要接邮件 / 企业微信 / CRM，只改 sinkLead 这一个函数即可，前端与路由都不动。 */
function sinkLead(record) {
  appendJsonl(FILES.leads, record)
  console.log('[lead]', record.ts, record.phone, record.org, '→', record.product)
}

/* 公开 /lead 的按 IP 节流：留资是全站唯一的公网写入口，没有防护就会被脚本灌爆
   （PII 洪水 + 后台可用性）。人正常填表不会一分钟提交好几条，6/min 足够宽松；
   与蜜罐、前端耗时门组合作三档防线。表项随时间惰性清扫，不留常驻 Map。 */
const LEAD_RATE = new Map()
const LEAD_WINDOW_MS = 60000
const LEAD_MAX = 6
function leadRateOk(ip) {
  const now = Date.now()
  if (LEAD_RATE.size > 5000) for (const [k, v] of LEAD_RATE) if (v.reset < now) LEAD_RATE.delete(k)
  const rec = LEAD_RATE.get(ip)
  if (!rec || rec.reset < now) {
    LEAD_RATE.set(ip, { n: 1, reset: now + LEAD_WINDOW_MS })
    return true
  }
  rec.n++
  return rec.n <= LEAD_MAX
}

/* ---------- 2. 提示词：把「一堂课」压成可校验的 JSON ---------- */
const LESSON_SYSTEM = `你是高校教研中心的课程设计助手，为教师生成可直接开讲的互动课堂脚本。
只输出一个 JSON 对象，不要 markdown 代码块，不要任何解释文字。结构必须是：
{
 "title": "课程标题（不超过 18 字）",
 "subtitle": "一句话定位（不超过 26 字）",
 "outline": ["3-5 个大纲条目，每条不超过 14 字"],
 "scenes": [
   {"type":"slides","title":"这一页的标题","bullets":["2-4 条要点，每条不超过 22 字"],"speech":"教师口播稿，60-110 字，口语化、有例子、不要念要点原文","board":{"kind":"formula|diagram","text":"要在白板上书写的一行内容，不超过 24 字"}},
   {"type":"quiz","title":"随堂提问","question":"一个问题","options":["3-4 个选项"],"answer":0,"explain":"答案解析，不超过 40 字"},
   {"type":"discussion","title":"讨论话题","topic":"一个开放问题","turns":[{"who":"AI 同学 · 昵称","text":"发言，不超过 40 字"},{"who":"AI 教师","text":"回应，不超过 50 字"}]}
 ]
}
scenes 至少 5 个：3 个 slides（含开场与收束）、1 个 quiz、1 个 discussion。
面向中国高校学生，术语准确，例子贴近课堂与产业实践。`

const ASK_SYSTEM = `你是天择教育 AI 课堂里的授课教师，正在给中国高校学生讲一个知识点。
要求：先一句话给结论，再给一个具体例子或类比，最后补一条易错点。
全程中文，不超过 120 字，不使用 markdown 标记，不自我介绍。`

/* 备课（讲课 PPT）的提示词不再写在这里：本期直接复用
   @openmaic/generation 打进去的官方提示词，见 server/maic-deck.mjs。 */


/* ---------- 3. 调模型 ---------- */
async function chat(messages, { temperature = 0.7, maxTokens = 900, timeoutMs = 30000 } = {}) {
  if (!API_KEY) {
    const e = new Error('missing-api-key')
    e.code = 'offline'
    throw e
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const payload = { model: MODEL, messages, temperature, max_tokens: maxTokens }
  const send = (body) =>
    fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    }).then(async (res) => ({ res, text: await res.text() }))
  try {
    /* enable_thinking 不是所有模型都认（qwen-plus / qwen-flash 会当未知参数），
       所以先按配置带上，被 400 顶回来就摘掉这个字段再打一次 */
    let { res, text } = await send({ ...payload, enable_thinking: THINKING })
    if (!res.ok && res.status === 400 && /thinking/i.test(text)) ({ res, text } = await send(payload))
    if (!res.ok) {
      const e = new Error(`upstream ${res.status}: ${text.slice(0, 300)}`)
      e.code = 'upstream'
      e.status = res.status
      throw e
    }
    const j = JSON.parse(text)
    const choice = j?.choices?.[0]
    const content = choice?.message?.content
    if (!content) {
      const e = new Error('模型只给了思考过程，没给出正文')
      e.code = 'upstream'
      throw e
    }
    /* finish_reason 必须带出去：备课那一条流水线是「模型直出 JSON」，
       回了一句 length 就是说正文在 max_tokens 处被切断了，后面的元素根本没生成。
       官方 jsonrepair 会替它把末尾的引号补上，于是一页残缺的课件看起来完全正常。 */
    return { text: String(content).trim(), finishReason: choice?.finish_reason || '', usage: j.usage || null }
  } finally {
    clearTimeout(timer)
  }
}

/* 模型偶尔会裹一层 ```json，或被寒暄污染 —— 抠出第一个花括号配对的 JSON */
function extractJson(s) {
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)) } catch { return null }
      }
    }
  }
  return null
}

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max)
function normalizeLesson(raw, topic) {
  const scenes = Array.isArray(raw.scenes) ? raw.scenes : []
  const out = {
    title: str(raw.title, 40) || str(topic, 40),
    subtitle: str(raw.subtitle, 60),
    outline: (Array.isArray(raw.outline) ? raw.outline : []).slice(0, 6).map((x) => str(x, 30)).filter(Boolean),
    scenes: [],
  }
  for (const s of scenes.slice(0, 8)) {
    const type = ['slides', 'quiz', 'discussion'].includes(s?.type) ? s.type : 'slides'
    if (type === 'quiz') {
      const options = (Array.isArray(s.options) ? s.options : []).slice(0, 4).map((x) => str(x, 40)).filter(Boolean)
      if (options.length < 2) continue
      out.scenes.push({
        type,
        title: str(s.title, 30) || '随堂提问',
        question: str(s.question, 80),
        options,
        answer: Math.min(Math.max(Number(s.answer) || 0, 0), options.length - 1),
        explain: str(s.explain, 80),
      })
    } else if (type === 'discussion') {
      const turns = (Array.isArray(s.turns) ? s.turns : []).slice(0, 6).map((t) => ({ who: str(t.who, 20), text: str(t.text, 90) })).filter((t) => t.text)
      if (!turns.length) continue
      out.scenes.push({ type, title: str(s.title, 30) || '课堂讨论', topic: str(s.topic, 60), turns })
    } else {
      const bullets = (Array.isArray(s.bullets) ? s.bullets : []).slice(0, 4).map((x) => str(x, 40)).filter(Boolean)
      const speech = str(s.speech, 220)
      if (!bullets.length && !speech) continue
      out.scenes.push({
        type: 'slides',
        title: str(s.title, 30) || '讲解',
        bullets,
        speech,
        board: s.board ? { kind: s.board.kind === 'formula' ? 'formula' : 'diagram', text: str(s.board.text, 30) } : null,
      })
    }
  }
  return out.scenes.length ? out : null
}

async function buildLesson(topic, level) {
  const user = `主题：${topic}\n${level ? `学段与深度：${level}\n` : ''}请生成一堂 8 分钟可讲完的互动课堂脚本。`
  let last = null
  /* 两次机会：只用在「回了但 JSON 不可解析」上。超时不重试 ——
     再等 55s 只是把用户多吊一会儿，不如直接降级到内置教案。 */
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { text } = await chat(
        [
          { role: 'system', content: LESSON_SYSTEM },
          { role: 'user', content: user + (attempt ? '\n注意：只输出 JSON 对象本身。' : '') },
        ],
        { temperature: 0.75, maxTokens: 1800, timeoutMs: 55000 },
      )
      const parsed = extractJson(text)
      const lesson = parsed && normalizeLesson(parsed, topic)
      if (lesson) return lesson
      last = new Error('模型返回的不是可解析的课堂 JSON')
      last.code = 'badjson'
    } catch (e) {
      if (e.code === 'offline') throw e
      if (e.name === 'AbortError' || /abort|timeout/i.test(e.message)) throw e
      last = e
    }
  }
  throw last || new Error('生成失败')
}

/* 备课不再走「一次调用拼高层 deck」那条路：
   版式质感的来源是 OpenMAIC 那份 938 行的官方逐页提示词，
   所以迁到 server/maic-deck.mjs 的两步流水线 + SSE。 */

/* ---------- 4. HTTP 层 ---------- */
const json = (res, status, obj) => {
  const body = JSON.stringify(obj)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

/* ---------- 4.1 SSE（只给 /prepare 用） ----------
   客户端与服务端盯的是两件不同的事：
   · 客户端只看「连接上还有没有事件」（含 ping），90s 无事件 = 链路断了；
   · 服务端只看「还有没有真实进度」（ping 不算），否则一个 20s 心跳
     就能把卡死的生成一直吊着不报错。
   单页最多两次 55s，所以 150s 无新页就是真卡住了；300s 是整场硬上限。 */
const SSE_PING_MS = 20000
const PREP_STALL_MS = 150000
const PREP_TOTAL_MS = 300000
const PREP_IDLE_HINT = 90000

function sseWriter(req, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store, no-transform',
    connection: 'keep-alive',
    /* 反代（Nginx）默认会缓冲整段响应再发，这行让它别缓冲 */
    'x-accel-buffering': 'no',
  })
  res.write(`: open retry=${Math.round(PREP_IDLE_HINT / 1000)}\n\n`)
  if (res.flushHeaders) res.flushHeaders()

  let closed = false
  let stallTimer = null
  const pingTimer = setInterval(() => write('ping', { at: Date.now(), idleLimitMs: PREP_IDLE_HINT }), SSE_PING_MS)
  const hardTimer = setTimeout(() => {
    write('error', { code: 'timeout', message: '备课超过 5 分钟硬上限，已中止' })
    close()
  }, PREP_TOTAL_MS)
  const kill = () => {
    clearInterval(pingTimer)
    clearTimeout(stallTimer)
    clearTimeout(hardTimer)
  }
  function write(event, data) {
    if (closed) return false
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    } catch {
      close()
      return false
    }
    return true
  }
  function bump() {
    clearTimeout(stallTimer)
    stallTimer = setTimeout(() => {
      write('error', { code: 'stall', message: '备课卡住了：150 秒内没有任何一页有新的进展' })
      close()
    }, PREP_STALL_MS)
  }
  function close() {
    if (closed) return
    closed = true
    kill()
    res.end()
  }
  req.on('close', close)
  bump()
  return {
    send(event, data) {
      if (event !== 'ping') bump()
      return write(event, data)
    },
    close,
    get dead() {
      return closed
    },
  }
}
const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > 64 * 1024) {
        reject(new Error('body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch { reject(new Error('bad json')) }
    })
    req.on('error', reject)
  })

/* 只有本机来源才给跨域：公网静态站走同源反代，不需要放开 */
function allowCors(req, res) {
  const origin = req.headers.origin || ''
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('access-control-allow-origin', origin)
    res.setHeader('access-control-allow-headers', 'content-type')
    res.setHeader('access-control-allow-methods', 'POST, GET, OPTIONS')
  }
}

/**
 * 处理器：既可被 node http.createServer 用，也可直接挂进 Vite 的 connect 中间件。
 * mount 在 /api/ai 下时，req.url 可能是 '/' 或 '/chat'（Vite 会剥掉前缀），
 * 独立进程下则是 '/api/ai/chat' —— 两种都归一化掉。
 */
export async function aiProxy(req, res, next) {
  const url = (req.url || '/').replace(/^\/api\/ai/, '').split('?')[0] || '/'

  /* 管理后台：挂在同一 /api/ai 下的 /admin/*，零新增 Nginx 规则。
     委派要在下面统一 readBody 之前——handleAdmin 自己按方法读体。 */
  if (url === '/admin' || url.startsWith('/admin/')) {
    allowCors(req, res)
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }
    return handleAdmin(req, res, url, { json, readBody })
  }
  /* 官网运行时内容覆盖：公开只读，免鉴权，返回已发布的 content.json */
  if (url === '/content') {
    allowCors(req, res)
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(readPublishedContent()))
    return
  }

  if (url !== '/health' && url !== '/chat' && url !== '/classroom' && url !== '/prepare' && url !== '/lead') {
    if (next) return next()
    res.writeHead(404).end()
    return
  }
  allowCors(req, res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }

  if (url === '/health') {
    json(res, 200, { ok: true, online: !!API_KEY, model: MODEL, endpoint: BASE_URL.replace(/^https?:\/\//, '').split('/')[0] })
    return
  }

  let body = {}
  try {
    body = await readBody(req)
  } catch (e) {
    json(res, 400, { error: e.message })
    return
  }

  try {
    if (url === '/lead') {
      /* 只收 POST；与前端表单同一套校验（姓名 / 11 位手机号 / 单位 / 意向方向） */
      if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' })
      /* 蜜罐：真人看不见也不会填这个隐藏字段，批量脚本常会填。填了就静默返回「成功」但不落库，
         不给爬虫可辨别的失败信号（比回 4xx 更能让脚本以为已得手、不再换姿势重试）。 */
      if (str(body.company_website, 200)) return json(res, 200, { ok: true })
      /* 按 IP 节流：假设生产在可信 Nginx 反代之后（XFF 由代理写入）；dev 直连时 XFF 缺失
         回落到 socket 地址，不影响本机正常演示。 */
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || ''
      if (!leadRateOk(ip)) return json(res, 429, { error: 'too-many', message: '提交过于频繁，请稍后再试' })
      const name = str(body.name, 40)
      const phone = str(body.phone, 20)
      const org = str(body.org, 60)
      const role = str(body.role, 20)
      const product = str(body.product, 40)
      const note = str(body.note, 500)
      const err = {}
      if (!name) err.name = '请填写您的姓名'
      if (!/^1\d{10}$/.test(phone)) err.phone = '请输入正确的 11 位手机号码'
      if (!org) err.org = '请填写学校 / 单位名称'
      if (!product) err.product = '请选择意向方向'
      if (Object.keys(err).length) return json(res, 422, { error: 'invalid', fields: err })
      const record = {
        ts: new Date().toISOString(),
        ip,
        ua: str(req.headers['user-agent'], 200),
        source: str(body.source, 40) || 'site-contact',
        name, phone, org, role, product, note,
      }
      try {
        sinkLead(record)
      } catch (e) {
        console.warn('[lead] 写入失败：', e.message)
        return json(res, 500, { error: 'persist-failed' })
      }
      return json(res, 200, { ok: true })
    }
    if (url === '/classroom') {
      const topic = str(body.topic, 80)
      if (!topic) return json(res, 400, { error: 'topic 不能为空' })
      const lesson = await buildLesson(topic, str(body.level, 40))
      return json(res, 200, { source: 'qwen', model: MODEL, lesson })
    }
    if (url === '/prepare') {
      const content = str(body.content, 900)
      /* 参数错还在头之前，照旧回 JSON；一旦开了 SSE 就只能回事件 */
      if (!content) return json(res, 400, { error: 'content 不能为空' })
      const sse = sseWriter(req, res)
      /* 没 key 不再回 501：顺着同一条 SSE 把预制的官方契约 Slide[] 推完。
         前端因此只有一条渲染路径（<SlideCanvas>），不必再养一套自绘页。 */
      if (!API_KEY) {
        for (const e of offlineDeckEvents()) sse.send(e.type, e)
        sse.close()
        return
      }
      try {
        await generateDeck({
          input: { content, level: str(body.level, 40), pages: body.pages, style: str(body.style, 40), focus: str(body.focus, 120) },
          chat,
          onEvent: (e) => sse.send(e.type, e),
          log: (m) => console.warn('[prepare]', m),
        })
      } catch (e) {
        console.warn('[prepare] 生成失败：', e.message)
        sse.send('error', { code: e.code || 'upstream', message: String(e.message || e).slice(0, 200) })
      }
      sse.close()
      return
    }
    const question = str(body.question, 500) || str(body.messages, 0)
    if (!question) return json(res, 400, { error: 'question 不能为空' })
    const messages = [{ role: 'system', content: ASK_SYSTEM }]
    /* 带上最近几轮上下文，追问才接得上 */
    for (const m of (Array.isArray(body.history) ? body.history.slice(-4) : [])) {
      if (m && (m.role === 'user' || m.role === 'assistant')) messages.push({ role: m.role, content: str(m.content, 600) })
    }
    messages.push({ role: 'user', content: question })
    const { text } = await chat(messages, { temperature: 0.6, maxTokens: 320, timeoutMs: 25000 })
    json(res, 200, { source: 'qwen', model: MODEL, text })
    return
  } catch (e) {
    if (e.code === 'offline') return json(res, 501, { error: 'offline', message: '服务端未配置 QWEN_API_KEY' })
    console.warn('[ai-proxy] 上游失败：', e.message)
    json(res, 502, { error: 'upstream', message: e.message.slice(0, 200) })
  }
}

/* ---------- 5. 独立进程模式 ---------- */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const port = Number(process.env.PORT || 8787)
  http.createServer((req, res) => {
    if (!req.url.startsWith('/api/ai')) {
      res.writeHead(404).end()
      return
    }
    aiProxy(req, res)
  }).listen(port, '127.0.0.1', () => {
    console.log(`[ai-proxy] http://127.0.0.1:${port}/api/ai  model=${MODEL}  key=${API_KEY ? '已配置' : '未配置（将返回 501 offline）'}`)
    console.log(`[ai-proxy] 管理后台：${ADMIN_BOOT.enabled ? (ADMIN_BOOT.owners ? `已启用（owner ${ADMIN_BOOT.owners} 名）` : '已启用但未建 owner——请配 ADMIN_EMAIL/ADMIN_PASSWORD 后重启') : '未启用（缺 AUTH_SECRET）'}`)
  })
}
