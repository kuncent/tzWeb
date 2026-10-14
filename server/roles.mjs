/* ============================================================
 * 角色、权限与标签的单一真相源
 * ------------------------------------------------------------
 * server/admin.mjs 与前端 Users / Settings / Shell / AuthContext 都从这里取，
 * 避免 ROLES / ROLE_LABEL / IMPLIES 三处漂移。
 * 本文件同时是 ESM，可被 Node（服务端）与 Vite（前端）直接 import。
 * ============================================================ */

export const PERMS = [
  'leads.read', 'leads.update', 'leads.*',
  'content.read', 'content.manage', 'content.*',
  'users.read', 'users.manage',
  'analytics.read', 'audit.read',
  'settings.manage',
]

export const ROLES = {
  owner: ['*'],
  admin: ['leads.*', 'content.*', 'users.read', 'users.manage', 'analytics.read', 'audit.read', 'settings.manage'],
  manager: ['leads.*', 'content.*', 'users.read', 'analytics.read', 'audit.read', 'settings.manage'],
  ops: ['leads.read', 'leads.update', 'content.read', 'analytics.read', 'settings.manage'],
  /* 兼容旧账号 */
  editor: ['leads.*', 'content.*', 'content.read', 'users.read', 'analytics.read', 'settings.manage'],
  viewer: ['leads.read', 'content.read', 'analytics.read', 'settings.manage'],
}

/* 宽覆盖窄的隐含短路 */
export const IMPLIES = {
  'users.read': ['users.manage'],
  'content.read': ['content.manage'],
}

/* 可在角色下拉里选的（不暴露 owner 防自杀） */
export const ASSIGNABLE_ROLES = ['admin', 'manager', 'ops']

/* 显示标签 */
export const ROLE_LABEL = {
  owner: '平台超管',
  admin: '管理员',
  manager: '经理',
  ops: '运营/销售',
  editor: '编辑（旧）',
  viewer: '只读（旧）',
}

/* 描述（Users 页下拉 hint） */
export const ROLE_DESC = {
  owner: '全部权限，含用户管理（不可在新建下拉里选）',
  admin: '内容/线索/数据/SEO/GEO/操作日志 + 用户增删改',
  manager: '内容/线索/数据/SEO/GEO/操作日志 + 用户只读',
  ops: '内容只读 + 线索读写 + 总览与访问统计',
  editor: '旧角色兼容，建议升到经理',
  viewer: '旧角色兼容，建议降到运营/销售',
}

/* Badge 色调 */
export const ROLE_TONE = {
  owner: 'brand',
  admin: 'neutral',
  manager: 'green',
  ops: 'neutral',
  editor: 'neutral',
  viewer: 'neutral',
}

/* 服务端 effectivePerms 与前端 can() 都用 hasImplied 做短路 */
export function hasImplied(perms, need) {
  if (perms.includes('*') || perms.includes(need)) return true
  // 前缀通配 'ns.*'
  const dot = need.lastIndexOf('.')
  if (dot > 0 && perms.includes(need.slice(0, dot) + '.*')) return true
  // IMPLIES 短路：users.manage ⇒ users.read
  const implied = IMPLIES[need]
  if (implied && implied.some((p) => perms.includes(p))) return true
  return false
}
