/* ============================================================
 * 后台导航 & 路由的单一真相源
 * ------------------------------------------------------------
 * Shell 从此处取 NAV_GROUPS 渲染侧栏；
 * AdminRoot 从此处取 ROUTES 配置注册路由与权限门。
 * 新增模块只需在此加一行，两处自动对齐。
 * ============================================================ */
import {
  LayoutDashboard, Inbox, FileText, Users as UsersIcon, Settings as SettingsIcon,
  BarChart3, SearchCheck, Sparkles, ScrollText,
} from 'lucide-react'

/* 每项：{ path, label, icon, perm, end? }
   perm = null → 仅需登录；否则需 can(perm) */
export const NAV_GROUPS = [
  { title: '概览', items: [
    { path: '/admin', label: '总览', icon: LayoutDashboard, perm: null, end: true },
  ]},
  { title: '销售', items: [
    { path: '/admin/leads', label: '线索管理', icon: Inbox, perm: 'leads.read' },
  ]},
  { title: '运营', items: [
    { path: '/admin/analytics', label: '访问统计', icon: BarChart3, perm: 'analytics.read' },
    { path: '/admin/content', label: '内容编辑', icon: FileText, perm: 'content.read' },
    { path: '/admin/seo', label: 'SEO 体检', icon: SearchCheck, perm: 'audit.read' },
    { path: '/admin/geo', label: 'GEO 体检', icon: Sparkles, perm: 'audit.read' },
    { path: '/admin/audit', label: '操作日志', icon: ScrollText, perm: 'audit.read' },
  ]},
  { title: '系统', items: [
    { path: '/admin/users', label: '用户与权限', icon: UsersIcon, perm: 'users.read' },
    { path: '/admin/settings', label: '个人设置', icon: SettingsIcon, perm: null, end: true },
  ]},
]

/* AdminRoot 路由表：path（去掉 /admin 前缀）、perm、lazy key */
export const ROUTES = NAV_GROUPS.flatMap((g) => g.items).map((item) => ({
  path: item.path.replace('/admin', '') || '/',
  perm: item.perm,
  label: item.label,
}))
