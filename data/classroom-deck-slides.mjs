/* ============================================================
 * 智能备课 · 离线预制课件（Slide[] 版）
 * ------------------------------------------------------------
 * 为什么需要这个文件：备课 tab 的渲染路径只保留 <SlideCanvas> 一条。
 * 以前离线降级走的是自绘页组件（六类 kind 各画一套），那等于站内
 * 长期并存两套版式引擎，早晚腐掉。所以「服务端没配 QWEN_API_KEY」
 * 时不再退回自绘，而是直接交出一份预制的官方契约 Slide[] ——
 * 在线与离线在浏览器里走的是同一个组件、同一套坐标语义。
 *
 * 坐标全部按 @openmaic/generation 的官方提示词手算（画布 1000×562.5）：
 *   · 四边边距 ≥ 50px（上 ≥50，下 ≤512.5，左 ≥50，右 ≤950）
 *   · 文本框高度只取官方 Text Height Lookup Table 的合法值
 *     （按 dominant 字号 × 行数查表，line-height=1.5，含左右各 10px 内边距）
 *   · 行数 = Σ ceil(段落字符数 / ((width - 20) / 字号))，字符数留 75% 安全水位
 *   · 文本压在背景形状上时：text.wh = shape.wh - 40，且水平/垂直都居中
 *   · 等分列用完全相同的数值（人眼能看出 5px 的差）
 *   · LatexElement 只写 latex/color/align，path/viewBox/strokeWidth/fixedRatio
 *     由系统生成，模型或我们都不许填；官方渲染器只吃渲好的 html（见下）
 *   · 不用 LineElement（它的 width 是描边粗细不是线长，容易搞错），
 *     分隔线一律用薄 shape
 * server/maic-deck.mjs 的坐标守卫与本文件同一套算法，两边不会走出样。
 *
 * 公式的 html 从 ./classroom-deck-latex.mjs 拿（那是 `node
 * tmp/recorder/bake-latex.mjs` 的生成物）：官方 <SlideCanvas> 的 latex
 * 元素只认 elementInfo.html 或 path/viewBox，在线那份由
 * @openmaic/generation 的 processLatexElements 现填，手写这份没人填，
 * 少了 html 第 3 页的三个式子会被直接画成 null。
 * ============================================================ */
import { LATEX_HTML } from './classroom-deck-latex.mjs'

const W = 1000
const H = 562.5

/** 官方查表值：字号 → [1..5 行] 的文本框高度 */
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

const BG = { type: 'solid', color: '#ffffff' }
const THEME = {
  backgroundColor: '#ffffff',
  themeColors: ['#1677ff', '#0b4ab0', '#8fd0ff', '#f0b429', '#34d399'],
  fontColor: '#1f2a37',
  fontName: 'Microsoft YaHei',
}

/** 段落文本 → 官方表里的合法高度；行数超过 5 就按该字号的行距外推 */
function box(fontSize, paragraphs, width) {
  const rows = TEXT_HEIGHTS[fontSize]
  const perLine = Math.floor((width - 20) / fontSize)
  const lines = Math.max(1, paragraphs.reduce((a, t) => a + Math.ceil([...t].length / perLine), 0))
  const height = lines <= rows.length ? rows[lines - 1] : rows[rows.length - 1] + (lines - rows.length) * (rows[1] - rows[0])
  return {
    height,
    content: paragraphs.map((t) => `<p style="font-size: ${fontSize}px;">${t}</p>`).join(''),
  }
}

const text = (id, left, top, width, fontSize, paragraphs, extra = {}) => {
  const b = box(fontSize, paragraphs, width)
  return {
    id,
    type: 'text',
    left,
    top,
    width,
    height: b.height,
    rotate: 0,
    content: b.content,
    defaultFontName: '',
    defaultColor: '#1f2a37',
    ...extra,
  }
}

const rect = (id, left, top, width, height, fill, extra = {}) => ({
  id,
  type: 'shape',
  left,
  top,
  width,
  height,
  rotate: 0,
  path: 'M 0 0 L 1 0 L 1 1 L 0 1 Z',
  viewBox: [1, 1],
  fill,
  fixedRatio: false,
  ...extra,
})

/** 卡片：先定形状，再按 Rule 5 把文本算成水平+垂直都居中、四边留 20px */
function card(id, left, top, width, height, fill, fontSize, paragraphs) {
  const b = box(fontSize, paragraphs, width - 40)
  const textWidth = width - 40
  return [
    rect(`${id}_bg`, left, top, width, height, fill),
    {
      id: `${id}_text`,
      type: 'text',
      left: left + (width - textWidth) / 2,
      top: top + Math.round((height - b.height) / 2),
      width: textWidth,
      height: b.height,
      rotate: 0,
      content: `<p style="font-size: ${fontSize}px; text-align: center;">${paragraphs.join(' ')}</p>`,
      defaultFontName: '',
      defaultColor: '#1f2a37',
    },
  ]
}

const latex = (id, left, top, width, height, code, color = '#1f2a37', align = 'center') => ({
  id,
  type: 'latex',
  left,
  top,
  width,
  height,
  rotate: 0,
  latex: code,
  color,
  align,
  /* 烘好的 KaTeX HTML：没烘上（表里缺键）就是空串，渲染器会当这一页
     没有式子画 null —— bake-latex.mjs --check 就是钉这一条的 */
  html: LATEX_HTML[code] || '',
})

const slide = (n, type, elements, script) => ({
  id: `builtin-slide-${n}`,
  viewportSize: W,
  viewportRatio: 0.5625,
  theme: THEME,
  background: BG,
  type,
  elements,
  script,
})

export const builtinDeckSlides = [
  /* ① 封面 */
  slide(
    1,
    'cover',
    [
      rect('cover_bar', 60, 120, 72, 6, '#1677ff'),
      text('cover_title', 60, 150, 880, 36, ['注意力机制：从顺序读到全局握手']),
      text('cover_sub', 60, 256, 880, 20, ['Transformer 核心思想 · 8 分钟讲透']),
      rect('cover_divider', 60, 338, 880, 1, '#e3eaf3'),
      text('cover_meta', 60, 368, 880, 16, ['天择教育 · 智能备课 · 面向大三专业课']),
      text('cover_page', 760, 460, 190, 14, ['01 / 06'], { defaultColor: '#8b98a9' }),
    ],
    '先看动机。老式循环网络读句子像读纸条，一次只看一个词，读到第三十个词时第一个词早被压没了。注意力换了个思路：每个词直接和全句所有词握一次手。',
  ),

  /* ② 要点：三卡等分 + 高亮条（演示 Rule 4 对称与 Rule 5 文本压形状） */
  slide(
    2,
    'content',
    [
      text('points_title', 60, 60, 880, 28, ['一句话记住注意力']),
      rect('points_underline', 60, 134, 880, 3, '#1677ff'),
      ...card('pt1', 60, 190, 280, 130, '#eaf4ff', 18, ['当前位置直接对整句每个位置打分']),
      ...card('pt2', 360, 190, 280, 130, '#eaf4ff', 18, ['路径长度从 O(n) 降到 O(1)']),
      ...card('pt3', 660, 190, 280, 130, '#eaf4ff', 18, ['代价是算力：翻倍长度四倍计算']),
      ...card('pt_note', 60, 350, 880, 116, '#f5f8fc', 18, ['softmax 把相关性的强弱压成一组和为一的权重']),
    ],
    '三个卡片是一条链：先打分、再归一、最后加权求和。第三张是代价，学生最容易漏 —— 路径变短不是免费的，序列一长算力按平方涨。',
  ),

  /* ③ 推导：主公式 + 两步拆分（LatexElement 单独成元素，正文里不留任何 LaTeX） */
  slide(
    3,
    'content',
    [
      text('derive_title', 60, 60, 880, 28, ['从打分到加权求和']),
      text('derive_intro', 60, 140, 880, 18, ['点积打分 → 缩放 → 归一 → 按权重把 Value 加起来']),
      latex('derive_main', 240, 205, 520, 86, '\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}\\left(\\frac{QK^{T}}{\\sqrt{d_k}}\\right)V', '#1677ff'),
      latex('derive_a', 140, 320, 320, 64, 's_{ij}=q_i \\cdot k_j'),
      latex('derive_b', 540, 320, 320, 64, 'a_{ij}=\\frac{e^{s_{ij}/\\sqrt{d_k}}}{\\sum_m e^{s_{im}/\\sqrt{d_k}}}'),
      rect('derive_mark', 50, 425, 4, 37, '#f0b429'),
      text('derive_cap', 65, 420, 875, 16, ['d_k 是 Key 的维度；不缩放会让 softmax 过早饱和、梯度消失']),
    ],
    '把式子拆成三件事：q 和 k 做点积得到分数，除以根号 d 是把方差拉回一档，softmax 之后拿这组权重去加权求和 V。三个矩阵同源不同投影，不是三份数据。',
  ),

  /* ④ 案例：左右对称两栏（Rule 4：对应属性用完全相同的数值） */
  slide(
    4,
    'content',
    [
      text('case_title', 60, 60, 880, 28, ['工程代价：先算清这笔账']),
      rect('case_l_bg', 60, 150, 430, 290, '#f5f8fc'),
      text('case_l_text', 80, 230, 390, 18, ['序列长度翻倍，', '注意力矩阵要算四倍，', '显存也跟着四倍。', '长文本优化都在这一项。']),
      rect('case_r_bg', 510, 150, 430, 290, '#f5f8fc'),
      text('case_r_text', 530, 230, 390, 18, ['稀疏注意、分块窗口、', '低秩近似、线性注意，', '都在省这一项的钱。', '选哪个取决于任务长度。']),
      text('case_foot', 60, 460, 880, 16, ['课堂练习：估算 n=4096 时注意力矩阵的显存量级']),
    ],
    '真实项目里 80% 的长文本方案都在改这一项。让学生先算数量级，再谈选型：4096 的平方是一千六百多万，乘以头和层数就知道为什么不能硬算。',
  ),

  /* ⑤ 随堂提问（本期只出 slide 页，quiz 靠版式表达，不进播放器交互） */
  slide(
    5,
    'content',
    [
      text('quiz_title', 60, 60, 880, 28, ['随堂提问']),
      text('quiz_q', 60, 140, 880, 24, ['公式里为什么要除以 √d（d 为向量维度）？']),
      ...card('quiz_a', 60, 200, 880, 56, '#f5f8fc', 16, ['A. 防止点积过大把 softmax 推进梯度近乎为零的饱和区']),
      ...card('quiz_b', 60, 265, 880, 56, '#f5f8fc', 16, ['B. 为了少算一次矩阵乘法']),
      ...card('quiz_c', 60, 330, 880, 56, '#f5f8fc', 16, ['C. 让注意力权重之和恰好等于一']),
      ...card('quiz_d', 60, 395, 880, 56, '#f5f8fc', 16, ['D. 抵消位置编码带来的数值漂移']),
      text('quiz_x', 60, 468, 880, 14, ['解析：点积方差随维度线性增长，不缩放会让 softmax 近似 one-hot，梯度消失。'], { defaultColor: '#5d6b7e' }),
    ],
    '这题考的是数值而不是算力。四个选项里只有 A 讲方差；C 是 softmax 的性质、跟缩放无关，是最多人错的那一个。',
  ),

  /* ⑥ 收束 */
  slide(
    6,
    'end',
    [
      rect('end_bar', 60, 70, 72, 4, '#1677ff'),
      text('end_title', 60, 100, 880, 36, ['三条要带走的话']),
      rect('end_divider', 60, 200, 880, 1, '#e3eaf3'),
      text('end_1', 60, 230, 880, 20, ['① 注意力把「顺序读」换成「一次握手」']),
      text('end_2', 60, 300, 880, 20, ['② Q 是问题、K 是标签、V 是正文']),
      text('end_3', 60, 370, 880, 20, ['③ 缩放与掩码不是细节，是能不能训起来的前提']),
      text('end_next', 60, 455, 880, 16, ['下一讲：多头注意力与因果掩码'], { defaultColor: '#5d6b7e' }),
    ],
    '收一句：注意力买的是「一步看到全句」，付的是平方级的钱。下一讲的多头与掩码，就是在这个约束下把表达力再买回来一点。',
  ),
]

/** 离线时交给前端的完整备课结果（与在线 done 事件同构） */
export const builtinDeckMeta = {
  title: '注意力机制：从顺序读到全局握手',
  subtitle: 'Transformer 核心思想 · 8 分钟讲透',
  outline: ['为什么需要注意力', '打分到加权求和', '工程代价', '随堂提问', '收束'],
}

export function builtinDeck() {
  return { ...builtinDeckMeta, slides: builtinDeckSlides, source: 'builtin' }
}
