/* ============================================================
 * LaTeX → 可读纯文本
 * ------------------------------------------------------------
 * 官方画布里的 latex 元素存的是式子原文（\frac{Q K^T}{\sqrt{d}}），
 * <SlideCanvas> 走 katex 渲染没问题；但两个地方只能吃纯文本：
 *   1) 互动课堂的白板是逐字书写的 mono 文本，塞源码等于写乱码；
 *   2) 导出的 .pptx 里 pptxgenjs 不认 LaTeX。
 * 所以这里做一次有损但可读的转写：分数变 (a)/(b)、根号变 √、
 * 常用符号查表。式子丢了排版结构，但语义和字面都在，
 * 老师要精确版式就在 PowerPoint 里用公式编辑器重打一次。
 * ============================================================ */

const SYMBOLS = {
  times: '×',
  cdot: '·',
  div: '÷',
  pm: '±',
  approx: '≈',
  neq: '≠',
  leq: '≤',
  geq: '≥',
  equiv: '≡',
  propto: '∝',
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  rarr: '→',
  sum: 'Σ',
  prod: 'Π',
  int: '∫',
  oint: '∮',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
  mathbb: '',
  mathbf: '',
  mathrm: '',
  mathcal: '',
  text: '',
  operatorname: '',
  quad: ' ',
  qquad: '  ',
  ldots: '…',
  dots: '…',
  circ: '∘',
  bullet: '•',
  in: '∈',
  notin: '∉',
  subset: '⊂',
  cup: '∪',
  cap: '∩',
  forall: '∀',
  exists: '∃',
  pmod: ' mod ',
}

/** 找到与 openIdx 处 '{' 配对的 '}'（不考虑嵌套转义，式子够用了） */
function matchBrace(s, openIdx) {
  let depth = 0
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

export function latexToPlain(src) {
  let s = String(src || '').trim()
  if (!s) return ''

  /* \frac{A}{B} → (A)/(B)，支持嵌套：从里往外反复替换 */
  for (let guard = 0; guard < 24 && s.includes('\\frac'); guard++) {
    const at = s.indexOf('\\frac')
    const o1 = s.indexOf('{', at)
    if (o1 < 0) break
    const c1 = matchBrace(s, o1)
    const o2 = s.indexOf('{', c1 + 1)
    if (o2 < 0) break
    const c2 = matchBrace(s, o2)
    if (c2 < 0) break
    s = `${s.slice(0, at)}(${s.slice(o1 + 1, c1)})/(${s.slice(o2 + 1, c2)})${s.slice(c2 + 1)}`
  }
  /* \sqrt{X} → √(X)；\sqrt X → √X */
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)').replace(/\\sqrt\s*([^\s{}]+)/g, '√$1')
  /* \text{...} / \mathrm{...} 这类包裹直接取内容 */
  s = s.replace(/\\(?:text|mathrm|mathbf|mathbb|mathcal|operatorname)\s*\{([^{}]*)\}/g, '$1')
  /* 符号表 */
  s = s.replace(/\\([a-zA-Z]+)/g, (m, name) => (name in SYMBOLS ? SYMBOLS[name] : m))
  /* 上下标：^2 → ^2，^{n} → ^n */
  s = s.replace(/\^\{([^{}]*)\}/g, '^$1').replace(/_\{([^{}]*)\}/g, '_$1')
  /* 剩下没用的分组括号去掉，但函数名带的括号要留：\left \right 是排版指令 */
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg|,|;|!|:)/g, '')
  s = s.replace(/[{}]/g, '')
  s = s.replace(/\\[a-zA-Z]+/g, (m) => m.slice(1))
  s = s.replace(/\\\s*/g, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

export default latexToPlain
