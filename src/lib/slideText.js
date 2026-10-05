/* ============================================================
 * 读平官方 Slide：把画布元素还原成「能当文本用」的样子
 * ------------------------------------------------------------
 * <SlideCanvas> 管画图，但界面上还有很多地方只要字：缩略图的一行标题、
 * 送进互动课堂的口播稿、导出 .pptx 时的文本框。这些地方都得从
 * elements[] 里把 text/latex 的内容抠出来。
 * 抠法只有一处定义，data/classroom.js 与备课台共用，避免两边跑偏。
 * ============================================================ */
import { latexToPlain } from './latexPlain'

export const stripHtml = (html) =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(?:p|h[1-6]|li|div)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/** 块级标签的字号（px）：官方 content 里 font-size 是内联样式，查表/换算都按它 */
export const blockSize = (openTag) => Number(/font-size:\s*(\d+(?:\.\d+)?)/.exec(openTag || '')?.[1]) || 18

/**
 * 单个元素拆出的段落：text 给它的每个块级标签，latex 给一条转写后的式子
 * （带 `latex` 原文，要回拼 LaTeX 的地方能拿到）。shape 里那个小标签不算，
 * 它只是形状的衍生物，当文本读会把「1／2／3」这种编号当成正文。
 */
export function elementBlocks(el) {
  if (el?.type === 'text') {
    const blocks = [...String(el.content || '').matchAll(/<(p|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    const body = blocks.length ? blocks : [['', String(el.content || '')]]
    return body
      .map((m) => ({
        text: stripHtml(m[2] ?? m[1]),
        size: blockSize(m[1]),
        bold: /(?:^<(h[1-6])\b)|<(?:strong|b)\b/i.test(m[1] || '') || /font-weight:\s*(?:bold|[6-9]00)/i.test(String(m[0] || '')),
        align: /text-align:\s*(left|center|right)/i.exec(String(m[0] || ''))?.[1]?.toLowerCase(),
        color: /color:\s*([^;"]+)/i.exec(String(m[0] || ''))?.[1]?.trim() || el.defaultColor,
      }))
      .filter((b) => b.text)
  }
  if (el?.type === 'latex' && el.latex) {
    const text = latexToPlain(el.latex)
    return text ? [{ text, size: 20, bold: false, align: 'center', color: el.color, latex: el.latex }] : []
  }
  return []
}

/**
 * 一页里所有文本元素拆出来的段落，按「块顶 → 块左」的阅读顺序排。
 * 比按字号排更贴眼睛看到的顺序（标题在上、正文在下），
 * 缩略图标题与口播稿拼出来才不会串位。
 */
export function slideParts(slide) {
  const out = []
  for (const el of slide?.elements || []) {
    elementBlocks(el).forEach((b, i) => out.push({ ...b, top: Number(el.top) + i * 4, left: Number(el.left) }))
  }
  return out.sort((a, b) => a.top - b.top || a.left - b.left)
}

/** 这一页叫什么：第一段文本，兜底给个不刺眼的占位 */
export function slideTitle(slide, fallback = '未命名页') {
  return slideParts(slide)[0]?.text || fallback
}

/** 把这页内容拼成一段可念的话（没有 slide.script 时才用） */
export function slidePlainText(slide, max = 220) {
  return slideParts(slide)
    .map((p) => p.text)
    .join('，')
    .slice(0, max)
}

/** 页型 → 界面标签：官方 Slide.type 只有这五种 */
export const TYPE_LABEL = { cover: '封面', contents: '目录', transition: '过渡', content: '正文', end: '收束' }
export const typeLabel = (type) => TYPE_LABEL[type] || '正文'
