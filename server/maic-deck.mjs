/* ============================================================
 * 智能备课 · OpenMAIC 官方流水线适配层
 * ------------------------------------------------------------
 * 这一层的存在理由：「做出和 OpenMAIC 一样的效果」靠的不是自己写版式器，
 * 而是复用它的官方提示词与逐步流水线。@openmaic/generation 把 OpenMAIC
 * 生成 PPT 用的提示词直接打进了 npm 包（templates/slide-content/system.md
 * 共 938 行：1000×562.5 画布、≥50px 边距、文本高度查表、居中公式、LaTeX
 * 自动缩放、出稿前 P0 自检清单），而 @openmaic/dsl 的 normalize* 明确不管
 * left/top/width/height（注释原文：those are producer-supplied）。
 * 也就是说坐标必须由「模型逐页直出 + 我们事后校验」这条路产生，
 * 所以我们做三件事：
 *   1) 把站点现成的 chat() 包成官方要的 AICallFn；
 *   2) 两步流水线：需求 → 场景大纲（1 次） → 逐页内容（并发 4）；
 *   3) 官方 P0 清单的确定性复核 + 定向重修 + 兜底回填。
 *
 * 硬约束：本文件只能被 server/*.mjs 引用。@openmaic/generation 用
 * node:fs.readFileSync 读 templates/，一旦出现在 src/** 里 Vite 直接打挂。
 * ============================================================ */
import {
  applyOutlineFallbacks,
  buildCompleteScene,
  generateSceneContent,
  generateSceneOutlinesFromRequirements,
  withGenerationRetry,
} from '@openmaic/generation'
import { normalizeSlideWith } from '@openmaic/dsl'
import { builtinDeck } from '../data/classroom-deck-slides.mjs'

/* ---------- 0. 画布与官方查表（与 data/classroom-deck-slides.mjs 同源） ---------- */
export const CANVAS_W = 1000
export const CANVAS_H = 562.5
export const MARGIN = 50
export const MAX_PAGES = 8
export const CONCURRENCY = 4
export const SLIDE_TIMEOUT_MS = 55000

const TEXT_HEIGHTS = {
  14: [43, 64, 85, 106, 127],
  16: [46, 70, 94, 118, 142],
  18: [49, 76, 103, 130, 157],
  20: [52, 82, 112, 142, 172],
  24: [58, 94, 130, 166, 202],
  28: [64, 106, 148, 190, 232],
  32: [70, 118, 166, 214, 262],
  36: [76, 130, 184, 238, 292],
}

/** 能安全渲染的元素类型：没有素材池，image/video/audio 一律不收 */
const RENDERABLE = new Set(['text', 'shape', 'line', 'latex', 'table', 'chart'])

/* ---------- 1. 官方模型缝 ---------- */
/* 单页 token 上限。这里原定 2600，实测不成立：11 页里有 5 页的 finish_reason
   是 length（都是正好吐满 2600），那就是「JSON 在上限处被切断」—— 后面的元素直接
   没了，剩下的半截页看起来完全正常。抬到 4200 不拿没触顶的页多付一个字段：
   max_tokens 是天花板不是目标，模型写完就停。实测重出的那 5 页全部在 4200 内写完。 */
const PAGE_MAX_TOKENS = 4200

/**
 * AICallFn = (systemPrompt, userPrompt, images?) => Promise<string>
 * ai-proxy 的 chat() 收 messages 数组，这里包一层，参数按官方调过的口径固定。
 * @param {(s: string) => void} [note] 把「模型侧但不影响控制流」的事报出去（见下面 token 上限那条）
 */
export function createAICall(chat, note = () => {}) {
  return async (systemPrompt, userPrompt) => {
    const { text, finishReason, usage } = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: PAGE_MAX_TOKENS, timeoutMs: SLIDE_TIMEOUT_MS },
    )
    /* finish_reason=length 是说「JSON 在 token 上限处被切断」：后面那些元素直接没了，
       末尾那个字符串还会被官方 jsonrepair 补上引号 —— 实测那条解析不了的
       path（"M 0 0 L 1 0 L 1 1 L 0"，官例是 …L 0 1 Z）就是这么来的。
       抬上限把它变成罕见事，但罕见不等于零，所以还是报一句 + 由 repairSlide 兜底。 */
    if (finishReason === 'length') note(`输出触到 ${PAGE_MAX_TOKENS} token 上限（实收 ${usage?.completion_tokens ?? '?'}），这一页可能只出到一半`)
    return text
  }
}

/* ---------- 2. 需求串：把 UI 参数拼成官方大纲提示词吃得下的中文需求 ---------- */
export function buildRequirement({ content, level, style, focus, pages }) {
  const n = clampPages(pages)
  /* 官方提示词按「1-2 scenes per minute」推页数，所以这里同时给出
     时长和确切页数，并把页数钉死 —— 只说时长会摇摆出 5~10 页。 */
  const minutes = Math.max(4, Math.ceil(n * 0.8))
  return [
    `课程内容（讲义原文，以此为准，不要另起话题）：${String(content || '').trim()}`,
    level ? `学段与受众：${level}` : '',
    style ? `讲课风格：${style}` : '',
    focus ? `侧重：${focus}` : '',
    `时长与页数：约 ${minutes} 分钟，最终产出 ${n} 页，每个场景就是一页幻灯，不要多也不要少。`,
    '场景类型：所有场景一律 "type": "slide"。不要出现 quiz / interactive / pbl —— 这三种播放器本期不加载。',
    /* 实测坐标很稳，不稳的是「要不要开公式页」：同主题四份产出里
       三份有 latex 元素、一份一个没有（式子全用纯文本写）。官方
       提示词只定了“latex 怎么写”，没定“有式子就必须用 latex”，所以在
       需求串里钉一句。注：纯文本写 O(1) 不算违规，官方禁的是把
       \frac 这类命令混进正文，那条由 [no-latex-in-text] 守。 */
    '公式：讲义原文里出现数学式子（如 O(1)、2f+1、√d、softmax 的展开式）时，必须单独做成 latex 元素，不得把反斜杠命令写进正文。',
    '语言：全中文教学与文案，专业术语保留英文原词。',
  ]
    .filter(Boolean)
    .join('\n')
}

const clampPages = (pages) => Math.min(MAX_PAGES, Math.max(4, Number(pages) || 6))

/* ---------- 3. 坐标复核：把官方 P0/P1 清单变成确定性检查 ---------- */
const stripTags = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

/** content 里出现过的字号，取最大的那个作为 dominant */
function dominantFontSize(content) {
  const found = [...String(content || '').matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
  return found.length ? Math.max(...found) : 18
}

/**
 * 段落列表：一个 <p>/<h1>-<h6> 就是一段（官方 Rule 2 按 <p> 计数）。
 * 每段带上它自己的字号：实测一个文本框里常同时有 20px 标题 + 18px 注释，
 * 全部按最大字号算行数会把行数多估一行，墨迹框就贴到了声明框，
 * 假阳性又回来了。
 */
function paragraphsOf(content) {
  const blocks = [...String(content || '').matchAll(/<(?:p|h[1-6])\b[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>/gi)]
  const parts = blocks
    .map((m) => {
      const text = stripTags(m[1]).replace(/\s+/g, ' ').trim()
      const sizes = [...String(m[1]).matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]))
      return text ? { text, size: sizes.length ? Math.max(...sizes) : 0 } : null
    })
    .filter(Boolean)
  if (parts.length) return parts
  const one = stripTags(content).replace(/\s+/g, ' ').trim()
  return one ? [{ text: one, size: 0 }] : []
}

/* 官方公式 chars_per_line = (width - 20) / font_size 是按全角字宽定的，
   拉丁/数字/半角标点只占半宽；不区分就会把英文短语的行数翻倍。 */
const FULLWIDTH = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uffef]/
const units = (s) => [...s].reduce((a, ch) => a + (FULLWIDTH.test(ch) ? 1 : 0.5), 0)

const tableRows = (size) => {
  let key = size
  if (!TEXT_HEIGHTS[key]) {
    const keys = Object.keys(TEXT_HEIGHTS).map(Number)
    key = keys.reduce((a, b) => (Math.abs(b - size) < Math.abs(a - size) ? b : a), keys[0])
  }
  return TEXT_HEIGHTS[key]
}

const linesFor = (parts, width, fallbackSize) =>
  Math.max(1, parts.reduce((a, p) => a + Math.ceil(units(p.text) / Math.max(1, (width - 20) / (p.size || fallbackSize))), 0))

/** 该字号/行数在官方表里的合法高度；超过 5 行按行距外推 */
function legalHeight(size, lines) {
  const rows = tableRows(size)
  if (lines <= rows.length) return rows[lines - 1]
  return rows[rows.length - 1] + (lines - rows.length) * (rows[1] - rows[0])
}

/* 「合法高度」的口径必须和 legalHeight 一致：官方表只硬编码到 5 行，
   第 6 行起按行距外推。两边口径不一样就会出现「166 不在表内，应为 166」
   这种自相矛盾的违规，把每一页都推进重修，白花一次调用。 */
const legalHeightSet = (size) => {
  const rows = tableRows(size)
  const step = rows[1] - rows[0]
  const out = new Set(rows)
  for (let n = rows.length + 1; n <= 16; n++) out.add(rows[rows.length - 1] + (n - rows.length) * step)
  return out
}

const isLegalHeight = (size, h) => legalHeightSet(size).has(Math.round(h))

/** 元素占位框；line 的 width 是描边粗细，几何要看 start/end */
function boxOf(el) {
  if (el.type === 'line') {
    const [sx, sy] = el.start || [0, 0]
    const [ex, ey] = el.end || [0, 0]
    const x = Math.min(sx, ex)
    const y = Math.min(sy, ey)
    return { left: el.left + x, top: el.top + y, width: Math.abs(ex - sx), height: Math.abs(ey - sy) }
  }
  return { left: el.left, top: el.top, width: el.width, height: el.height }
}

const LATEX_SYNTAX = /\\(?:frac|lim|int|sum|sqrt|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|Omega|cdot|times|approx|neq|leq|geq|infty|partial|nabla|mathrm|mathbf|mathrm|begin)\b|\^\{|_\{/

/**
 * 墨迹框：文字在框里是顶部对齐的，所以真正会压到别人的高度是
 * 「内容实际行数」对应的高度，而不是模型声明的框高。
 * 模型经常给比内容更高的合法框（比如 20px 给了 3 行的 112），
 * 那是留白不是碰撞；按声明框查相交会得到一堆假阳性。
 */
function inkBox(el) {
  const b = boxOf(el)
  if (el.type !== 'text') return b
  const size = dominantFontSize(el.content)
  const h = legalHeight(size, linesFor(paragraphsOf(el.content), el.width, size))
  return { ...b, height: Math.min(b.height, h) }
}

/**
 * 找出「标签对」：官方 Rule 5 讲的是一形状配一段文字（卡片中间就一句说明），
 * 那种情况下必须水平+垂直居中。
 * 但模型实际大量产出「大卡片里放标题+正文好几段」，这是合理的版式，
 * 如果按字面把每段都要求居中，就会满屏假阳性（实测“偏 0.0,95.5px”
 * 就是卡片顶部的标题），还会把本来好的版式让模型改坏。
 * 所以只认两个硬条件：形状内只有一段文字 + 该文字宽度命中官方公式
 * shape.width - 40（命中就证明模型确实是按 Rule 5 配的对）。
 */
const insideBox = (s, b) => s.left <= b.left + 2 && s.top <= b.top + 2 && s.left + s.width >= b.left + b.width - 2 && s.top + s.height >= b.top + b.height - 2

function labelPairs(elements) {
  const texts = (elements || []).filter((el) => el.type === 'text').map((el) => ({ el, box: boxOf(el) }))
  const shapes = (elements || []).filter((el) => el.type === 'shape').map((el) => ({ el, box: boxOf(el) }))
  const out = []
  for (const t of texts) {
    const hosts = shapes.filter((s) => insideBox(s.box, t.box))
    /* 一个形状里只装了一段文字，才谈得上「给它居中」；多段就是容器卡片 */
    if (hosts.length !== 1) continue
    if (texts.filter((x) => insideBox(hosts[0].box, x.box)).length !== 1) continue
    const host = hosts[0]
    /* 宽度命中 shape.width - 40 （留 16px 容差）才是标签对；
       明显窄于公式值的，是模型故意做的左对齐摆放，不插手 */
    if (Math.abs(t.box.width - (host.box.width - 40)) > 16) continue
    /* 文字比形状还高/宽时，居中反而会造出溢出，不动 */
    if (t.box.width > host.box.width - 20 || t.box.height > host.box.height - 20) continue
    out.push({ text: t, host })
  }
  return out
}

/**
 * 复核一页，返回违规清单（形如 `[text-height] text_3：高度 71 不在 18px 的表内，应为 76`）。
 * 清单既用于定向重修，也直接进日志，方便肉眼判断是模型不行还是我们算错。
 */
export function auditSlide(slide) {
  const v = []
  for (const el of slide.elements || []) {
    const box = boxOf(el)
    const id = el.id || el.type
    /* margins */
    if (box.left < MARGIN - 1 || box.top < MARGIN - 1 || box.left + box.width > CANVAS_W - MARGIN + 1 || box.top + box.height > CANVAS_H - MARGIN + 1) {
      v.push(`[margins] ${id}：占位 ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}×${Math.round(box.height)} 越出 ${MARGIN}px 边距`)
    }
    if (el.type === 'text') {
      const size = dominantFontSize(el.content)
      const paras = paragraphsOf(el.content)
      /* text-height */
      if (!isLegalHeight(size, el.height)) {
        v.push(`[text-height] ${id}：${size}px 的高度 ${Math.round(el.height)} 不在官方表内，应为 ${legalHeight(size, linesFor(paras, el.width, size))}`)
      }
      /* text-width（P0：单段不得超过 5 行容量） */
      for (const p of paras) {
        const cap = ((el.width - 20) / (p.size || size)) * 5
        if (units(p.text) > cap) v.push(`[text-width] ${id}：${p.size || size}px 在宽 ${Math.round(el.width)} 下单段 ${units(p.text)} 字宽超出 5 行容量`)
      }
      /* no-latex-in-text */
      if (LATEX_SYNTAX.test(String(el.content || ''))) v.push(`[no-latex-in-text] ${id}：正文里出现 LaTeX 语法，必须拆成独立 latex 元素`)
    }
    if (el.type === 'line' && Number(el.width) > 6) {
      v.push(`[line-stroke] ${id}：width=${el.width} 被当成了线长；官方口径是描边粗细 2-6`)
    }
    /* 形状的路径串本身得能被浏览器解析 —— d 是字符串，normalize* 不管它，
       越界/高度那些守卫也看不见它，只有这里会拦 */
    if (el.type === 'shape') {
      const issue = pathIssue(el.path)
      if (issue) v.push(`[path-parse] ${id}：${issue}`)
    }
    if (el.type === 'latex') {
      const bad = ['path', 'viewBox', 'strokeWidth', 'fixedRatio'].filter((k) => el[k] !== undefined)
      if (bad.length) v.push(`[latex-fields] ${id}：填了系统生成的字段 ${bad.join('/')}`)
    }
    if (el.type === 'table') {
      for (const row of el.data || []) {
        for (const cell of row || []) {
          if (LATEX_SYNTAX.test(String(cell?.text || ''))) v.push(`[latex-in-table] ${id}：单元格文本里含 LaTeX，官方不支持`)
        }
      }
    }
  }
  /* no-overlap：只查文本框两两相交（形状本来就是拿来垫的，不算违规），
     且用墨迹框而不是声明框，见 inkBox */
  const inks = (slide.elements || []).filter((el) => el.type === 'text').map((el) => ({ id: el.id, box: inkBox(el) }))
  for (let i = 0; i < inks.length; i++) {
    for (let j = i + 1; j < inks.length; j++) {
      const a = inks[i].box
      const b = inks[j].box
      const hit = a.left < b.left + b.width - 2 && b.left < a.left + a.width - 2 && a.top < b.top + b.height - 2 && b.top < a.top + a.height - 2
      if (hit) v.push(`[no-overlap] ${inks[i].id} 与 ${inks[j].id} 文本框相交`)
    }
  }
  /* text-bg-pair：只查「标签对」（见 labelPairs 的适用边界） */
  for (const { text, host } of labelPairs(slide.elements)) {
    const dx = Math.abs(host.box.left + host.box.width / 2 - (text.box.left + text.box.width / 2))
    const dy = Math.abs(host.box.top + host.box.height / 2 - (text.box.top + text.box.height / 2))
    if (dx > 3 || dy > 3) v.push(`[text-bg-pair] ${text.el.id} 在 ${host.el.id} 上未居中（偏 ${dx.toFixed(1)},${dy.toFixed(1)}px）`)
  }
  return v
}

/* SVG 每条路径命令要吃几个数（绝对/相对同数）。这张表跟官方渲染器
   BaseShapeElement 里的 pathCoordBBox 一个口径 —— 它按同样的规则数坐标，
   我们按同样的规则判断模型给的 d 能不能被浏览器解析。 */
const PATH_ARITY = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, Q: 4, S: 4, A: 7, Z: 0 }

/**
 * 模型写歪的 path：返回 null 是能用，否则给一句错因（进违规清单/日志）。
 * 踩过的两种：① 官方示例那条单位矩形被抄成 "M 0 0 L 1 0 L 1 1 L 0"（少了 1 Z，
 * 是输出被 token 上限切断的产物），浏览器会红一句
 * `Error: <path> attribute d: Unexpected end of attribute`；② 命令字母写飞。
 * 注：连续命令可以省略字母（M 0 0 1 1 就是 M+L），所以 cmd 是延续的。
 */
export function pathIssue(d) {
  const tokens = String(d || '').match(/-?\d*\.?\d+(?:e[-+]?\d+)?|[a-zA-Z]/gi)
  if (!tokens) return '路径串是空的或一个 token 都没有'
  if (!/^[mM]/.test(tokens[0])) return `第一个命令是「${tokens[0]}」，路径必须从 M/m 起笔`
  let i = 1
  let cmd = tokens[0].toUpperCase()
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) {
      cmd = tokens[i].toUpperCase()
      i++
      if (!(cmd in PATH_ARITY)) return `第 ${i} 个 token 处：未知命令「${cmd}」`
    }
    const need = PATH_ARITY[cmd]
    if (i + need > tokens.length) return `${cmd} 要 ${need} 个数，串尾只剩 ${tokens.length - i} 个`
    i += need
  }
  return null
}

/** 与官方示例同款的矩形（含 viewBox 各值），渲染器按 width/viewBox[0] 缩放 */
const rectPath = (w, h) => `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`

/** viewBox 是不含 0/NaN 的 [w, h] 对吗 */
const isPair = (v) => Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(Number(n)) && Number(n) > 0)

/* ---------- 4. 确定性回填：重修后仍违规时也要能出货 ---------- */
function clampInto(el) {
  const maxW = CANVAS_W - MARGIN * 2
  const maxH = CANVAS_H - MARGIN * 2
  const next = { ...el }
  if (el.type !== 'line') {
    if (next.width > maxW) next.width = maxW
    if (next.height > maxH) next.height = maxH
  }
  next.left = Math.min(Math.max(MARGIN, Number(next.left) || MARGIN), CANVAS_W - MARGIN - (next.width || 0))
  next.top = Math.min(Math.max(MARGIN, Number(next.top) || MARGIN), CANVAS_H - MARGIN - (next.height || 0))
  return next
}

/** code → text 降级：本期不装 shiki（含 wasm），但内容一个字都不能丢 */
function downgradeCode(el) {
  const size = Number(el.fontSize) || 14
  const lines = (Array.isArray(el.lines) ? el.lines : []).map((l) => String(l?.content ?? '')).filter((t) => t.length)
  const paragraphs = lines.length ? lines : [String(el.fileName || '代码片段')]
  /* 行数用同一套 units/linesFor 口径：等宽拉丁字实际只占 ~0.6em 宽 */
  const linesNeeded = linesFor(paragraphs.map((t) => ({ text: t, size })), el.width, size)
  const html = paragraphs
    .map((t) => `<p style="font-size: ${size}px; font-family: ui-monospace, Consolas, monospace;">${t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]) || '&nbsp;'}</p>`)
    .join('')
  return {
    id: el.id,
    type: 'text',
    left: el.left,
    top: el.top,
    width: el.width,
    height: legalHeight(size, linesNeeded),
    rotate: el.rotate || 0,
    content: (el.fileName ? `<p style="font-size: ${size}px; font-weight: bold;">${el.fileName}</p>` : '') + html,
    defaultFontName: '',
    defaultColor: '#1f2a37',
    fill: '#f5f8fc',
  }
}

/**
 * 回填一页：越界收进来、off-table 高度查表、LaTeX 系统字段摘掉、
 * code 降级成等宽 text、不可渲染的媒体元素丢掉（带日志，不静默）。
 * 注意只在「不合法」时动刀，模型给的高度本来就命中表就原样保留 ——
 * 否则会把人家故意留的呼吸感压扁。
 */
export function repairSlide(slide, log = () => {}) {
  const dropped = []
  const repathed = []
  const elements = []
  for (const raw of slide.elements || []) {
    let el = clampInto(raw)
    if (el.type === 'code') el = downgradeCode(el)
    if (!RENDERABLE.has(el.type)) {
      dropped.push(`${el.type}#${el.id}`)
      continue
    }
    if (el.type === 'text') {
      const size = dominantFontSize(el.content)
      if (!isLegalHeight(size, el.height)) {
        el = { ...el, height: legalHeight(size, linesFor(paragraphsOf(el.content), el.width, size)) }
      }
      el = clampInto(el)
    }
    if (el.type === 'latex') {
      el = { ...el }
      for (const k of ['path', 'viewBox', 'strokeWidth', 'fixedRatio']) delete el[k]
      if (typeof el.latex !== 'string' || !el.latex.trim()) {
        dropped.push(`latex#${el.id}`)
        continue
      }
    }
    if (el.type === 'line' && Number(el.width) > 6) el = { ...el, width: 3 }
    /* 路径串不完整：按 viewBox 回填成矩形。矩形是官方示例里 9 成形状用的那一条
       （色块/分隔条/卡片底），拿它当兜底比丢元素少丢一层视觉；真画不出来的
       曲线（C/Q/A 写到一半）也没法猜回原形，至少位置尺寸是对的。 */
    if (el.type === 'shape') {
      const issue = pathIssue(el.path)
      if (issue) {
        const vb = isPair(el.viewBox) ? el.viewBox.map(Number) : [Math.max(1, Number(el.width) || 1), Math.max(1, Number(el.height) || 1)]
        el = { ...el, ...(isPair(el.viewBox) ? {} : { viewBox: vb }), path: rectPath(vb[0], vb[1]) }
        repathed.push(`${el.id}（${issue}）`)
      }
    }
    elements.push(el)
  }
  /* 标签对居中是官方 Rule 5 的开卷公式，不需要问模型：
     直接回填，省一次重修调用，也避免模型“改居中”时顺手把内容改。 */
  for (const { text, host } of labelPairs(elements)) {
    const dx = host.box.left + (host.box.width - text.box.width) / 2 - text.box.left
    const dy = host.box.top + (host.box.height - text.box.height) / 2 - text.box.top
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      const i = elements.findIndex((x) => x.id === text.el.id)
      elements[i] = { ...text.el, left: Math.round(text.box.left + dx), top: Math.round(text.box.top + dy) }
    }
  }
  if (dropped.length) log(`丢掉了 ${dropped.length} 个不可渲染元素：${dropped.join(', ')}`)
  if (repathed.length) log(`回填了 ${repathed.length} 个路径串不完整的形状：${repathed.join(', ')}`)
  return { ...slide, elements }
}

/* ---------- 5. 拼成官方 Slide ---------- */
const STAGE_ID = 'stage-prep'

/** 讲稿：本期不调 generateSceneActions（省 N 次调用），从大纲确定性生成 */
function deriveScript(outline, index, total) {
  const points = (Array.isArray(outline.keyPoints) ? outline.keyPoints : []).map((p) => String(p).trim()).filter(Boolean)
  const desc = String(outline.description || '').trim()
  const title = String(outline.title || '').trim()
  let head
  if (index === 0) head = `这一页开场，先把主线立起来：${desc || title}。`
  else if (index === total - 1) head = `收束回一句：${points[0] || desc || title}。`
  else head = `${title}。${desc}`
  const tail = points.length ? `要落的点有 ${points.length} 个：${points.join('；')}。` : ''
  return `${head}${tail}`.replace(/\s+/g, ' ').trim().slice(0, 200)
}

function assembleSlide(outline, content, index, total) {
  /* buildCompleteScene 是官方拼装口，canvas 的 viewportSize/viewportRatio/theme
     默认值都由它给，我们不自己发明（省掉一套会走样的常量）。 */
  const scene = buildCompleteScene(outline, { elements: content.elements || [], background: content.background }, [], STAGE_ID)
  const canvas = scene?.content?.canvas || {
    id: `slide-${index}`,
    viewportSize: CANVAS_W,
    viewportRatio: 0.5625,
    theme: { backgroundColor: '#ffffff', themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4'], fontColor: '#333333', fontName: 'Microsoft YaHei' },
    elements: content.elements || [],
    background: content.background,
  }
  const type = index === 0 ? 'cover' : index === total - 1 ? 'end' : 'content'
  return { ...canvas, type, script: deriveScript(outline, index, total) }
}

/* ---------- 5.1 确定性兜底页 ----------
   模型某一页彻底不出时，不丢页，而是拿大纲的标题 + 要点铺一页合规的版。
   这跟「降级到预制课件」是两件不同的事：兜底页讲的仍是用户自己那一题，
   只是版式朴素。代价换来的是页数永远等于请求页数，老师拿到的不是有洞的课件。 */
const FALLBACK_BG = { type: 'solid', color: '#ffffff' }

function fallbackText(id, left, top, width, size, text, extra = {}) {
  const lines = linesFor([{ text, size }], width, size)
  return {
    id,
    type: 'text',
    left,
    top,
    width,
    height: legalHeight(size, lines),
    rotate: 0,
    content: `<p style="font-size: ${size}px;">${String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</p>`,
    defaultFontName: '',
    defaultColor: '#333333',
    ...extra,
  }
}

export function fallbackSlide(outline, index, total, log = () => {}) {
  const size = index === 0 || index === total - 1 ? 36 : 32
  const title = String(outline?.title || '').trim() || `第 ${index + 1} 页`
  const elements = []
  let y = MARGIN + 10
  /* 标题也自适应：200 字的长标题按 36px 能吃掉整页，把后面的要素顶出画布。
     下限留 120px 给要点，不够就降字号。 */
  const maxTitleBottom = CANVAS_H - MARGIN - 120
  let titleSize = size
  let titleEl = fallbackText(`fb-t-${index}`, MARGIN, y, CANVAS_W - MARGIN * 2, titleSize, title)
  while (y + titleEl.height > maxTitleBottom && titleSize > 14) {
    titleSize = titleSize > 24 ? titleSize - 4 : titleSize - 2
    titleEl = fallbackText(`fb-t-${index}`, MARGIN, y, CANVAS_W - MARGIN * 2, titleSize, title)
  }
  elements.push(titleEl)
  y += titleEl.height + 20
  /* 一条细形做标题下划线：不用 LineElement，它的 width 是描边而不是线长，
     易踩 [line-stroke] 那条官方口径 */
  if (y + 6 <= CANVAS_H - MARGIN) {
    elements.push({
      id: `fb-a-${index}`,
      type: 'shape',
      left: MARGIN,
      top: y,
      width: 140,
      height: 6,
      rotate: 0,
      path: 'M 0 0 L 1 0 L 1 1 L 0 1 Z',
      viewBox: [1, 1],
      fill: '#1677ff',
      fixedRatio: false,
    })
    y += 6 + 28
  }
  const points = (Array.isArray(outline?.keyPoints) ? outline.keyPoints : []).map((p) => String(p).trim()).filter(Boolean)
  const body = points.length ? points : [String(outline?.description || '').trim()].filter(Boolean)
  /* 先按 20px 铺，装不下就依次降到 18/16/14 —— 宁可字小一点，
     也不能把后半截要点静悄悄弄丢（丢内容比丑更严） */
  let picked = []
  for (const size2 of [20, 18, 16, 14]) {
    const laid = []
    let cursor = y
    let fits = true
    for (const p of body) {
      const el = fallbackText(`fb-p-${index}-${laid.length}`, MARGIN, cursor, CANVAS_W - MARGIN * 2, size2, `• ${p}`)
      if (cursor + el.height > CANVAS_H - MARGIN) {
        fits = false
        break
      }
      laid.push(el)
      cursor += el.height + 12
    }
    if (fits) {
      picked = laid
      break
    }
    /* 降字号的意义就是多装几条：谁装得多留谁 */
    if (!picked || laid.length > picked.length) picked = laid
  }
  if (picked.length < body.length) log(`${index + 1} 页要点过多，14px 仍装不下，丢了 ${body.length - picked.length} 条`)
  elements.push(...picked)
  const slide = repairSlide({ ...assembleSlide(outline, { elements, background: FALLBACK_BG }, index, total), type: index === 0 ? 'cover' : index === total - 1 ? 'end' : 'content' }, log)
  const v = auditSlide(slide)
  if (v.length) log(`${index + 1} 页兜底版仍余 ${v.length} 条违规：${v[0]}`)
  return slide
}

/* ---------- 6. 逐页生成（含定向重修） ---------- */
async function buildOne(outline, aiCall, opts) {
  const gen = (directive, baseline) =>
    withGenerationRetry(
      () =>
        generateSceneContent(
          outline,
          aiCall,
          {
            languageDirective: opts.languageDirective,
            agents: [],
            visionEnabled: false,
            ...(directive ? { editDirective: directive, baselineContent: baseline } : {}),
          },
        ),
      {
        label: `scene-${outline.id}`,
        maxRetries: 1,
        shouldRetryResult: (r) => !r || !Array.isArray(r.elements) || r.elements.length === 0,
        onRetry: (e) => opts.log(`${opts.index + 1} 页重试（第 ${e.attempt}/${e.maxAttempts} 次）：${e.reason}`),
      },
    )

  let content = await gen()
  if (!content || !Array.isArray(content.elements) || !content.elements.length) return null

  const slideType = opts.index === 0 ? 'cover' : opts.index === opts.total - 1 ? 'end' : 'content'
  let slide = repairSlide({ ...assembleSlide(outline, content, opts.index, opts.total), type: slideType }, opts.log)
  let violations = auditSlide(slide)

  /* 带具体违规清单重修一次 —— 正好对应官方提示词里的 P0 出稿自检清单。
     走官方 EDIT MODE（editDirective + baselineContent），不是另起一套提示词。 */
  if (violations.length) {
    opts.log(`${opts.index + 1} 页有 ${violations.length} 处版式违规，带清单重修：${violations[0]}`)
    try {
      const redone = await gen(
        `上一版未通过官方出稿自检，必须逐条修好这些违规后重新输出整页 JSON（只输出 JSON，边距 ${MARGIN}px、文本高度必须取官方查表值）：\n- ${violations.join('\n- ')}`,
        content,
      )
      if (redone && Array.isArray(redone.elements) && redone.elements.length) {
        const retry2 = repairSlide({ ...assembleSlide(outline, redone, opts.index, opts.total), type: slideType }, opts.log)
        if (auditSlide(retry2).length <= violations.length) slide = retry2
      }
    } catch (e) {
      /* 重修失败不影响出货：上一版已经回填过，继续用 */
      opts.log(`${opts.index + 1} 页重修失败，沿用首版：${e.message}`)
    }
  }

  /* 官方 normalize 收口：坏元素丢单个而不是废整页 */
  const dropped = []
  const normalize = normalizeSlideWith({ onInvalid: 'drop', onDropped: (el) => dropped.push(String(el?.id || el?.type)) })
  const final = normalize(slide)
  if (dropped.length) opts.log(`${opts.index + 1} 页丢掉 ${dropped.length} 个不合法元素：${dropped.join(', ')}`)
  return final.elements.length ? final : null
}

/* 并发池：官方是逐页独立调用，页与页之间没有依赖，串行只是白等 */
async function pool(items, limit, worker) {
  const out = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++
      if (i >= items.length) return
      out[i] = await worker(items[i], i)
    }
  })
  await Promise.all(runners)
  return out
}

/* ---------- 7. 主流程 ---------- */
/**
 * @param {object} p
 * @param {object} p.input            { content, level, pages, style, focus }
 * @param {Function} p.chat           ai-proxy 的 chat()
 * @param {(e: object) => void} p.onEvent  SSE 事件出口
 * @param {(s: string) => void} [p.log]
 */
export async function generateDeck({ input, chat, onEvent, log = () => {} }) {
  const aiCall = createAICall(chat, log)
  const requirement = buildRequirement({ ...input, pages: clampPages(input.pages) })

  onEvent({ type: 'phase', phase: 'outline' })
  const outlined = await generateSceneOutlinesFromRequirements({ requirement, interactiveMode: false, taskEngineMode: false }, undefined, undefined, aiCall, {})
  if (!outlined?.success || !outlined.data?.outlines?.length) {
    throw Object.assign(new Error(outlined?.error || '大纲生成失败'), { code: 'badjson' })
  }
  const { languageDirective, courseTitle, outlines: rawOutlines } = outlined.data
  /* 本期只有 slide 播放器：模型给的 quiz/interactive/pbl 一律收成 slide，
     大纲里的标题/描述/要点照样能撑起一页。 */
  const outlines = rawOutlines
    .slice(0, clampPages(input.pages))
    .map((o, i) => ({ ...applyOutlineFallbacks({ ...o, type: 'slide', order: i }, true), id: o.id || `scene_${i + 1}` }))
    .sort((a, b) => a.order - b.order)
  if (!outlines.length) throw Object.assign(new Error('大纲为空'), { code: 'badjson' })

  const title = String(courseTitle || '').trim() || String(input.content || '').trim().slice(0, 18)
  onEvent({ type: 'outline', count: outlines.length, title, scenes: outlines.map((o) => o.title) })

  const total = outlines.length
  let fallbacks = 0
  const slides = await pool(outlines, CONCURRENCY, async (outline, i) => {
    let slide = null
    let why = ''
    try {
      slide = await buildOne(outline, aiCall, { index: i, total, languageDirective, log })
    } catch (e) {
      if (e.code === 'offline') throw e
      why = String(e.message || e).slice(0, 160)
      log(`${i + 1} 页失败：${why}`)
    }
    if (!slide) {
      /* 不丢页：用大纲要点铺一页合规的兜底版，并在事件里标出来 */
      why = why || '这一页模型没给出可用元素'
      slide = fallbackSlide(outline, i, total, log)
      fallbacks++
    }
    onEvent({ type: 'slide', index: i, slide, ...(why ? { fallback: true, message: why } : {}) })
    return slide
  })

  const kept = slides.filter(Boolean)
  if (kept.length < 3) {
    throw Object.assign(new Error('可用页数不足 3 页，改走离线兜底'), { code: 'shortdeck' })
  }
  /* 重排后页序就是数组下标，不往 Slide 里塞契约外的字段 */
  const ordered = kept.map((s, i) => ({ ...s, type: i === 0 ? 'cover' : i === kept.length - 1 ? 'end' : s.type === 'end' ? 'content' : s.type }))
  const deck = {
    title,
    subtitle: String(outlines[0]?.description || '').slice(0, 60),
    outline: outlines.map((o) => String(o.title || '').slice(0, 30)).filter(Boolean),
    slides: ordered,
    source: 'qwen',
  }
  onEvent({ type: 'done', deck, stats: { requested: total, produced: kept.length, dropped: total - kept.length, fallback: fallbacks } })
  return deck
}

/** 离线兜底：也走一遍 SSE，前端就只有一条渲染路径 */
export function offlineDeckEvents() {
  const deck = builtinDeck()
  const events = [{ type: 'outline', count: deck.slides.length, title: deck.title, scenes: deck.slides.map((_, i) => `预制第 ${i + 1} 页`) }]
  deck.slides.forEach((slide, index) => events.push({ type: 'slide', index, slide }))
  events.push({ type: 'done', deck, stats: { requested: deck.slides.length, produced: deck.slides.length, dropped: 0, offline: true } })
  return events
}
