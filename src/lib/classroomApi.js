/* ============================================================
 * AI 课堂 · 前端调用层
 * ------------------------------------------------------------
 * 浏览器只看得见 /api/ai/*，QWEN_API_KEY 全程留在服务端
 * （server/ai-proxy.mjs）。这一层的职责是：调接口 + 把各种失败
 * 统一收敛成「降级到内置教案」，让组件那边只管渲染，不管在线离线。
 *
 * 所有函数都返回 { source: 'qwen' | 'builtin', ... }，
 * source 决定界面上是标「Qwen 实时生成」还是「离线演示」。
 *
 * /prepare（智能备课）不是普通的一枪一答：OpenMAIC 的流水线是
 * 「大纲 1 次 + 逐页 N 次」，服务端走 SSE 边生成边推，所以这一层
 * 要自己解流。上面的 call() 只处理 JSON，备课走下面那套流式读取。
 * ============================================================ */
import { pickLesson } from '../data/classroom'
/* 预制课件走动态 import：那 6 页 Slide 带着烘好的 KaTeX HTML，单独打出来
   约 20 kB（gzip 5 kB）。它只有备课台用得上，而备课台是点 tab
   才挂的懒 chunk —— 静态引进来就等于让每个首屏访客替这份兜底数据
   付费。ClassroomPrep 那边是静态 import，两处指向同一个模块，打包归到
   同一块（assets/renderer-*.js），不会下载两遍。 */
const deckModule = () => import('../../data/classroom-deck-slides.mjs')

const ENDPOINT = '/api/ai'
/* 前端超时必须比服务端那一层宽：服务端生成一堂课单次上限 55s、提问 25s，
   卡在下面这两个数之前失败，界面上就只能报「生成超时」而看不到真实原因。
   实测（qwen3.8-flash，关思考）：生成 ≈18s，提问 ≈4s。 */
const GEN_TIMEOUT = 70000
const ASK_TIMEOUT = 30000
/* 备课不再是「一次调用」，而是 1 + 页数次：拿总时长当预算怎么算都不对
   （串行最坏 9 次 × 55s = 495s）。改成盯「连接上还有没有事件」：
   服务端每 20s 一条 ping，90s 一个字节都没收到就是链路真断了。
   300s 是整场硬顶，跟服务端那个硬上限对齐 —— 抢在它前头放弃，
   用户就看不到服务端那句明确的「超过 5 分钟硬上限」。 */
const PREP_IDLE_MS = 90000
const PREP_HARD_MS = 300000

async function call(path, { method = 'POST', body, timeout = ASK_TIMEOUT } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(`${ENDPOINT}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    /* 静态站没配反代时，/api/ai/* 会被 SPA fallback 成一张 HTML ——
       这里先探 content-type，避免把整页 HTML 当 JSON 去 parse 报错 */
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      const e = new Error('offline')
      e.code = 'offline'
      throw e
    }
    const data = await res.json()
    if (!res.ok) {
      const e = new Error(data?.message || `HTTP ${res.status}`)
      e.code = res.status === 501 ? 'offline' : 'upstream'
      throw e
    }
    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('生成超时')
      e.code = 'timeout'
      throw e
    }
    throw err
  }
}

/* 服务端在不在线：只影响右上角那枚徽标的措辞，不阻塞任何交互 */
export async function aiStatus() {
  try {
    const d = await call('/health', { method: 'GET', timeout: 6000 })
    return { online: !!d.online, model: d.model || '', endpoint: d.endpoint || '' }
  } catch {
    return { online: false, model: '', endpoint: '' }
  }
}

/* 没配 key 时就别去发这一枪：/classroom 会回 501，浏览器要在控制台
   记一条红的（这个抖不掉），而一个 GET /health 是 200。先探再发，
   降级结果一样，控制台干净。探的结果缓存 20s，不每次点生成都跑一趟。 */
let cached = null
async function online() {
  if (cached && Date.now() - cached.at < 20000) return cached.online
  const s = await aiStatus()
  cached = { at: Date.now(), online: s.online }
  return s.online
}

/**
 * 生成一堂课。失败一律回退到内置教案（pickLesson 保证一定有课可放），
 * 并把原因带回去，界面上如实标注，不假装是模型现生成的。
 */
export async function generateLesson(topic, level = '') {
  const t = String(topic || '').trim()
  if (!(await online())) {
    return { ...pickLesson(t), reason: '服务端未配置模型密钥', source: 'builtin' }
  }
  try {
    const d = await call('/classroom', { body: { topic: t, level }, timeout: GEN_TIMEOUT })
    const lesson = d.lesson
    if (!lesson || !Array.isArray(lesson.scenes) || !lesson.scenes.length) throw new Error('返回的课堂脚本为空')
    return { ...lesson, topicKey: t, source: 'qwen', model: d.model || '' }
  } catch (e) {
    return { ...pickLesson(t), reason: e.code === 'offline' ? '服务端未配置模型密钥' : e.message, source: 'builtin' }
  }
}

/* 离线 / 失败时的备课兜底：直接拿预制的官方 Slide[]。
   这里不能再翻成旧的高层 deck：前端渲染路径只有 <SlideCanvas> 一条，
   两套版式长期并存必被腐掉（计划 C1 写死了这一条）。 */
async function offlineDeck(reason) {
  const { builtinDeck } = await deckModule()
  return { ...builtinDeck(), reason, source: 'builtin' }
}

/**
 * 手工解 SSE。不用 EventSource：它是 GET，而这一枪是 POST + JSON body。
 * 每解出一条完整事件就回调，同时间接帮调用方把「收到字节的时刻」报回去。
 */
async function readEventStream(res, onEvent) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let cut
    while ((cut = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, cut)
      buf = buf.slice(cut + 2)
      /* 开头那行 `: open retry=90` 是注释，没有 event: 字段，跳过 */
      const type = /^event:\s*(.+)$/m.exec(block)?.[1]?.trim()
      if (!type) continue
      const raw = /^data:\s*(.*)$/m.exec(block)?.[1]
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = { message: String(raw || '').slice(0, 200) }
      }
      onEvent(type, data)
    }
  }
}

/**
 * 智能备课：一段课程内容 → 一份官方 Slide[]（逐页推）。
 * input: { content, level, pages, style, focus }
 * @param {(e:{type:string, [k:string]: any}) => void} [onProgress]
 *        进度的事件类型与服务端一致：phase / outline / slide / slide-error / done / ping
 * @returns {Promise<{title:string, slides:Array, source:string, reason?:string, stats?:object}>}
 */
export async function prepareDeck(input = {}, onProgress) {
  const content = String(input.content || '').trim()
  /* 进度回调是 UI 里抽出去的 React setState，它报错不能把生成弄挂 */
  const emit = (type, data) => {
    try {
      onProgress?.({ type, ...data })
    } catch {
      /* 忽略 */
    }
  }
  if (!content) return await offlineDeck('没填课程内容')
  if (!(await online())) return await offlineDeck('服务端未配置模型密钥')

  const ctrl = new AbortController()
  let idleTimer = null
  const bump = () => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => ctrl.abort(), PREP_IDLE_MS)
  }
  const hardTimer = setTimeout(() => ctrl.abort(), PREP_HARD_MS)
  let deck = null
  let failure = null
  let stats = null
  /* 逐页存下来：下标就是页序（服务端并发 4，事件到达顺序不等于页序）。 */
  const partial = []
  let outlineTitle = ''
  try {
    bump()
    const res = await fetch(`${ENDPOINT}/prepare`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify({ content, level: input.level, pages: input.pages, style: input.style, focus: input.focus }),
      signal: ctrl.signal,
    })
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/event-stream')) {
      /* 两种情形：参数错（服务端在 SSE 头之前就 400），或静态站没配反代
         被 SPA fallback 成了整页 HTML —— 后者归入离线，不报错误消息 */
      const text = await res.text()
      if (res.status === 400) {
        let msg = `HTTP ${res.status}`
        try {
          msg = JSON.parse(text).error || msg
        } catch {
          /* 保留默认 */
        }
        failure = { code: 'badreq', message: msg }
      } else {
        failure = { code: 'offline', message: '服务端不可用' }
      }
    } else {
      await readEventStream(res, (type, data) => {
        bump()
        if (type === 'done') {
          deck = data.deck
          stats = data.stats
        } else if (type === 'error') {
          failure = data
        } else {
          if (type === 'outline') outlineTitle = String(data.title || '')
          if (type === 'slide') partial[data.index] = data.slide
          emit(type, data)
        }
      })
    }
  } catch (e) {
    /* abort() 招来的 AbortError 不是真错误，上面两个定时器已经说明了原因 */
    failure = failure || (e.name === 'AbortError' ? { code: 'timeout', message: `已超过 ${Math.round(PREP_IDLE_MS / 1000)} 秒没有新进展` } : { code: e.code || 'network', message: String(e.message || e).slice(0, 160) })
  } finally {
    clearTimeout(idleTimer)
    clearTimeout(hardTimer)
  }

  /* 已经推出的页不能丢：流断了但拿到 ≥ 3 页，就交这些真页。
     拿一份讲「注意力机制」的预制课件去替用户刚写的「联盟链」，
     那才是真的骗人 —— reason 里如实写明后 N 页没出来。 */
  const got = partial.filter(Boolean)
  if (!deck && got.length >= 3) {
    deck = { title: outlineTitle || content.slice(0, 18), slides: got, source: 'qwen' }
    stats = { requested: partial.length, produced: got.length, dropped: partial.length - got.length }
  }
  if (deck && Array.isArray(deck.slides) && deck.slides.length >= 3) {
    emit('done', { deck, stats })
    return { ...deck, source: deck.source || 'qwen', model: '', stats, reason: failure ? `${failure.message}（已交付 ${deck.slides.length} 页）` : undefined }
  }
  if (failure && failure.code === 'badreq') return await offlineDeck(failure.message)
  return await offlineDeck(failure ? failure.message : '返回的课件页数不足')
}

/* 离线时的课堂问答：不联网，从当前这堂课里挑最贴的一句作答。
   宁可答案朴素，也不要拿假数据冒充模型输出 —— 界面上会标「离线演示」。 */
function offlineAnswer(question, lesson) {
  const q = String(question || '')
  const words = (lesson?.outline || []).concat(lesson?.title || '')
  const scene =
    (lesson?.scenes || []).find((s) => s.bullets?.some((b) => words.some((w) => w && (q.includes(w) || b.includes(w))))) ||
    (lesson?.scenes || []).find((s) => s.type === 'quiz') ||
    lesson?.scenes?.[0] ||
    null
  if (!scene) return '这堂课还没有可引用的内容，先点「生成这堂课」换一条主题试试。'
  if (scene.type === 'quiz') return `先把这道随堂题记下：${scene.question} —— 官方口径是「${scene.explain}」，这就是你这个问题最接近的落点。`
  const bullet = scene.bullets?.[0] || scene.speech || ''
  return `就当前这堂课（${lesson?.title || '未命名'}）而言，最相关的一条是：${bullet}。离线演示模式下我只能复述教案原文，配好模型密钥后可以直接对话展开。`
}

/**
 * 课堂提问。history 只带最近 4 轮，服务端会截断。
 */
export async function ask(question, { history = [], lesson } = {}) {
  const q = String(question || '').trim()
  if (!q) return { text: '', source: 'builtin' }
  if (!(await online())) {
    return { text: offlineAnswer(q, lesson), source: 'builtin', reason: '服务端未配置模型密钥' }
  }
  try {
    const d = await call('/chat', { body: { question: q, history }, timeout: ASK_TIMEOUT })
    return { text: d.text, source: 'qwen', model: d.model || '' }
  } catch (e) {
    return { text: offlineAnswer(q, lesson), source: 'builtin', reason: e.code === 'offline' ? '服务端未配置模型密钥' : e.message }
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
