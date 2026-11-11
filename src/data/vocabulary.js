/* ============================================================
 * 全站唯一词表（single source of truth）
 * ------------------------------------------------------------
 * 方案名、产品名、联系表单的意向方向只在这里定义一次；
 * 导航 / 页脚 / 表单 / 搜索 / 预填都从这里引用，不再手写中文名。
 * 改名字时只改这一处，避免再出现「四套命名」并存的漂移。
 *
 * 顺序即展示顺序：5 大方案与 8 大产品体系一一对应当前在跑的交付。
 * ============================================================ */

/* ---------------- 5 大解决方案（学科方案）---------------- */
export const SOLUTIONS = [
  { id: 'digital-economy', name: '数字经济' },
  { id: 'fintech', name: '金融科技' },
  { id: 'applied-statistics', name: '应用统计' },
  { id: 'business-analytics', name: '新商科大数据' },
  { id: 'biz-tech-integration', name: '工商科一体化' },
]

export const SOLUTION_NAMES = Object.fromEntries(SOLUTIONS.map((s) => [s.id, s.name]))

/* 方案全称（页脚/搜索里需要完整指代时用） */
export const solutionFullName = (id) => `${SOLUTION_NAMES[id]}实验教学方案`

/* ---------------- 8 大产品体系 ----------------
   对齐客户《产品体系.xlsx》的八个体系名。原独立的「具身智能」体系已并入
   「智能产品」下的具身智能机器人产品（3D 展台展示原样保留）；Excel 的
   「其他未分类」在此落为「其他」体系。 */
export const PRODUCTS = [
  { id: 'blockchain', name: '区块链', short: '区块链' },
  { id: 'digital-finance', name: '数字金融', short: '数字金融' },
  { id: 'innovation-finance', name: '创新金融', short: '创新金融' },
  { id: 'digital-economy', name: '数字经济', short: '数字经济' },
  { id: 'new-business-data', name: '新商科大数据', short: '新商科大数据' },
  { id: 'ecommerce', name: '电子商务', short: '电子商务' },
  { id: 'smart-products', name: '智能产品', short: '智能产品' },
  { id: 'other', name: '其他', short: '其他' },
]

export const PRODUCT_NAMES = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.name]))
export const PRODUCT_SHORT_NAMES = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.short]))

/* ---------------- 联系 / 预约表单的意向方向 ----------------
   前 8 项与产品体系同名（预填值必须逐字命中），后 3 项是非产品类合作方向。 */
export const COOPERATION_INTENTS = ['课程资源共建', '私有化部署', '其他合作']
export const CONTACT_INTENTS = [...PRODUCTS.map((p) => p.name), ...COOPERATION_INTENTS]
