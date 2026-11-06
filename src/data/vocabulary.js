/* ============================================================
 * 全站唯一词表（single source of truth）
 * ------------------------------------------------------------
 * 方案名、产品名、联系表单的意向方向只在这里定义一次；
 * 导航 / 页脚 / 表单 / 搜索 / 预填都从这里引用，不再手写中文名。
 * 改名字时只改这一处，避免再出现「四套命名」并存的漂移。
 *
 * 顺序即展示顺序：5 大方案与 5 大产品体系一一对应当前在跑的交付。
 * ============================================================ */

/* ---------------- 5 大解决方案（学科方案）---------------- */
export const SOLUTIONS = [
  { id: 'digital-economy', name: '数字经济' },
  { id: 'fintech', name: '金融科技' },
  { id: 'applied-statistics', name: '应用统计' },
  { id: 'business-analytics', name: '商务数据分析' },
  { id: 'biz-tech-integration', name: '工商科一体化' },
]

export const SOLUTION_NAMES = Object.fromEntries(SOLUTIONS.map((s) => [s.id, s.name]))

/* 方案全称（页脚/搜索里需要完整指代时用） */
export const solutionFullName = (id) => `${SOLUTION_NAMES[id]}实验教学方案`

/* ---------------- 5 大产品体系 ---------------- */
export const PRODUCTS = [
  { id: 'embodied', name: '具身智能 · 机器人实验室', short: '具身智能' },
  { id: 'blockchain', name: '区块链 · 可信账本与量化实训', short: '区块链' },
  { id: 'class', name: 'AI 多智能体课堂', short: 'AI 多智能体课堂' },
  { id: 'digital-finance', name: '数字金融 · 虚拟仿真实训体系', short: '数字金融' },
  { id: 'digital-economy', name: '数字经济 · 大数据与 AI 实训体系', short: '数字经济' },
]

export const PRODUCT_NAMES = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.name]))
export const PRODUCT_SHORT_NAMES = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.short]))

/* ---------------- 联系 / 预约表单的意向方向 ----------------
   前 5 项与产品体系同名（预填值必须逐字命中），后 3 项是非产品类合作方向。 */
export const COOPERATION_INTENTS = ['课程资源共建', '私有化部署', '其他合作']
export const CONTACT_INTENTS = [...PRODUCTS.map((p) => p.name), ...COOPERATION_INTENTS]
