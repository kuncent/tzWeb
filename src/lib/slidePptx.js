/* ============================================================
 * 官方 Slide[] → .pptx
 * ------------------------------------------------------------
 * 画布是 1000 × 562.5，PPT 的 16:9 版面是 13.333 × 7.5 英寸，
 * 两者比例完全相同，所以映射就是一条等比换算：
 *   1px = 13.333 / 1000 英寸，1px 字号 = 0.75pt。
 * 元素按数组顺序画（后面的盖前面的），与官方渲染器的层叠一致。
 *
 * 映射得到的照画；映射不到的（图表、图片这类本期流水线不产的）
 * 只要元素身上还有可读文本就降级成文本框，内容不丢。
 * ============================================================ */
import { elementBlocks } from './slideText'

const IN_PER_PX = 13.333 / 1000
const toIn = (v) => Math.max(0, Math.round(Number(v || 0) * IN_PER_PX * 1000) / 1000)
const toPt = (px) => Math.max(6, Math.round((Number(px) || 18) * 0.75 * 10) / 10)

/** pptxgenjs 吃的是不带 # 的六位十六进制 */
const hex = (color, fallback = '333333') => {
  const c = String(color || '').trim().replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(c)) return c.toUpperCase()
  if (/^[0-9a-f]{3}$/i.test(c)) return c.split('').map((x) => x + x).join('').toUpperCase()
  return fallback
}

/** 形状只有 path，没有类型字段 —— 按路径里有没有曲线指令判矩形/圆 */
function shapeKind(el) {
  const formula = String(el.pathFormula || '').toLowerCase()
  if (formula.includes('ellipse') || formula.includes('circle') || formula.includes('oval')) return 'ellipse'
  if (formula.includes('rect')) return 'rect'
  return /[CAQcaq]/.test(String(el.path || '')) ? 'ellipse' : 'rect'
}

/** 元素自己的填充底色（文本框的 fill 也是一层背景） */
function bgOf(slide) {
  const bg = slide?.background
  if (bg?.type === 'solid' && bg.color) return hex(bg.color, 'FFFFFF')
  return hex(slide?.theme?.backgroundColor, 'FFFFFF')
}

function addTextElement(sl, el) {
  const blocks = elementBlocks(el)
  if (!blocks.length) return
  sl.addText(
    blocks.map((b) => ({
      text: b.text,
      options: {
        fontSize: toPt(b.size),
        bold: b.bold || undefined,
        align: b.align,
        color: b.color ? hex(b.color) : undefined,
        breakLine: true,
      },
    })),
    {
      x: toIn(el.left),
      y: toIn(el.top),
      w: toIn(el.width),
      h: toIn(el.height),
      valign: el.vAlign || 'top',
      lineSpacingMultiple: el.lineHeight && el.lineHeight > 0.4 ? el.lineHeight : undefined,
      fill: el.fill ? { color: hex(el.fill, 'FFFFFF') } : undefined,
      isTextBox: true,
      fontFace: 'Microsoft YaHei',
      defaultFontSize: toPt(blocks[0].size),
      defaultColor: hex(el.defaultColor, '333333'),
    },
  )
}

function addShapeElement(sl, pptx, el) {
  const ellipse = shapeKind(el) === 'ellipse'
  const kind = ellipse ? pptx.ShapeType.ellipse : pptx.ShapeType.rect
  sl.addShape(kind, {
    x: toIn(el.left),
    y: toIn(el.top),
    w: toIn(el.width),
    h: toIn(el.height),
    fill: el.fill ? { color: hex(el.fill, 'FFFFFF'), transparency: Math.round((1 - (el.opacity ?? 1)) * 100) } : undefined,
    line: !el.outline?.color || el.outline.style === 'none' ? undefined : { color: hex(el.outline.color), width: toPt(el.outline.width || 1) },
  })
  /* 形状自带的小标签（Rule 5 那种 1:1 标签对）：content 也是 HTML，
     跟 text 元素走同一个抠法，居中压在形状上 */
  const labelBlocks = el.text?.content ? elementBlocks({ type: 'text', content: el.text.content, defaultColor: el.text.defaultColor }) : []
  if (labelBlocks.length) {
    sl.addText(
      labelBlocks.map((b) => ({ text: b.text, options: { fontSize: toPt(b.size), bold: b.bold || undefined, breakLine: true } })),
      {
        x: toIn(el.left),
        y: toIn(el.top),
        w: toIn(el.width),
        h: toIn(el.height),
        align: el.text.align === 'left' || el.text.align === 'right' ? el.text.align : 'center',
        valign: 'middle',
        color: hex(el.text.defaultColor, 'FFFFFF'),
        fontFace: 'Microsoft YaHei',
      },
    )
  }
}

function addLineElement(sl, pptx, el) {
  const [sx, sy] = el.start || [0, 0]
  const [ex, ey] = el.end || [el.width, 0]
  sl.addShape(pptx.ShapeType.line, {
    x: toIn(el.left + Math.min(sx, ex)),
    y: toIn(el.top + Math.min(sy, ey)),
    w: toIn(Math.abs(ex - sx)),
    h: toIn(Math.abs(ey - sy)),
    line: { color: hex(el.color, '333333'), width: toPt(el.strokeWidth || 2), dashType: el.style === 'dashed' ? 'dash' : undefined },
    /* 线的走向：局部坐标算出来的包围盒丢了方向，靠 flipV 补回来 */
    flipV: sx <= ex ? sy > ey : sy < ey,
  })
}

function addTableElement(sl, el) {
  const rows = (el.data || []).map((row) =>
    (row || []).map((cell) => ({
      text: String(cell?.text || ''),
      options: {
        colSpan: cell?.colspan > 1 ? cell.colspan : undefined,
        rowSpan: cell?.rowspan > 1 ? cell.rowspan : undefined,
        bold: !!cell?.style?.bold,
        color: cell?.style?.color ? hex(cell.style.color) : undefined,
        fill: cell?.style?.backcolor ? { color: hex(cell.style.backcolor) } : undefined,
        fontSize: cell?.style?.fontsize ? toPt(parseFloat(cell.style.fontsize)) : undefined,
        align: cell?.style?.align,
      },
    })),
  )
  if (!rows.length) return
  sl.addTable(rows, {
    x: toIn(el.left),
    y: toIn(el.top),
    w: toIn(el.width),
    h: toIn(el.height),
    valign: 'middle',
    border: el.outline?.color ? { type: 'solid', color: hex(el.outline.color, 'DDE3EC'), pt: Math.max(0.5, Number(el.outline.width) || 1) } : undefined,
    fontFace: 'Microsoft YaHei',
  })
}

/** 一页里所有元素按类型派给上面的映射；返回真正落进 pptx 的元素数 */
function addElements(sl, pptx, slide) {
  let drawn = 0
  for (const el of slide?.elements || []) {
    try {
      if (el.type === 'text') addTextElement(sl, el)
      else if (el.type === 'shape') addShapeElement(sl, pptx, el)
      else if (el.type === 'line') addLineElement(sl, pptx, el)
      else if (el.type === 'table') addTableElement(sl, el)
      else if (el.type === 'latex' && el.latex) {
        /* 转写成可读式子（(Q K^T)/(√(d))）而不是 \frac 源码：
           老师拿去改的是 PowerPoint，不是 LaTeX 编译器 */
        const [b] = elementBlocks(el)
        if (b) sl.addText(b.text, { x: toIn(el.left), y: toIn(el.top), w: toIn(el.width), h: toIn(el.height), align: 'center', valign: 'middle', fontSize: toPt(Math.max(16, Math.min(el.height * 0.6, 44))), color: hex(el.color, '333333'), italic: true })
      } else {
        /* 图表 / 图片这类本期流水线不产的：能抠出字就留个文本框，别静默丢内容 */
        const loose = String(el.text || el.content || el.src || '').trim()
        if (loose) sl.addText(loose, { x: toIn(el.left), y: toIn(el.top), w: toIn(el.width), h: toIn(el.height), fontSize: 12, color: '777777' })
        else continue
      }
      drawn += 1
    } catch {
      /* 单个元素映射失败不该毁掉整份导出 */
    }
  }
  return drawn
}

/**
 * deck: { title, subtitle, slides: Slide[] } → 触发浏览器下载 .pptx。
 * @returns {Promise<{pages:number, elements:number}>}
 */
export async function exportDeckPptx(deck) {
  const mod = await import('pptxgenjs')
  const PptxGenJS = mod.default || mod
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'W16x9', width: 13.333, height: 7.5 })
  pptx.layout = 'W16x9'
  pptx.author = '天择教育 · 智能备课系统'
  pptx.title = deck?.title || '讲课课件'

  let elements = 0
  const slides = deck?.slides || []
  slides.forEach((slide, i) => {
    const sl = pptx.addSlide()
    sl.background = { color: bgOf(slide) }
    elements += addElements(sl, pptx, slide)
    /* 讲稿进备注页 —— 教师开演示者视图就是照这个念 */
    const script = String(slide?.script || '').trim()
    if (script) sl.addNotes(script)
    else if (i === 0 && deck.subtitle) sl.addNotes(deck.subtitle)
  })

  await pptx.writeFile({ fileName: `${deck?.title || '讲课课件'}-讲课课件.pptx` })
  return { pages: slides.length, elements }
}
