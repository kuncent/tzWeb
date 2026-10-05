/* ============================================================
 * 后台外壳：顶栏（品牌 / 回访官网 / 用户菜单）+ 左侧栏（按权限过滤）+ 内容区
 * ------------------------------------------------------------
 * 导航项集中在 NAV：加一个后台模块 = 加一条 {path,label,icon,perm}，
 * 侧栏与路由都据此渲染，与服务端 MODULES 的划分对齐。
 * ============================================================ */
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Inbox, FileText, Users as UsersIcon, Settings as SettingsIcon, ExternalLink, LogOut, ChevronDown, ShieldCheck } from 'lucide-react'
import { useAuth } from './AuthContext'
import { cx, Badge, Spinner } from './ui'

const NAV = [
  { path: '/admin', label: '概览', icon: LayoutDashboard, perm: null, end: true },
  { path: '/admin/leads', label: '线索管理', icon: Inbox, perm: 'leads.read' },
  { path: '/admin/content', label: '内容编辑', icon: FileText, perm: 'content.read' },
  { path: '/admin/users', label: '用户与权限', icon: UsersIcon, perm: 'users.manage' },
  { path: '/admin/settings', label: '个人设置', icon: SettingsIcon, perm: null, end: true },
]

const roleLabel = { owner: '超级管理员', admin: '管理员', editor: '编辑', viewer: '只读' }

export default function Shell() {
  const { user, can, logout } = useAuth()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const items = NAV.filter((n) => can(n.perm))

  const doLogout = async () => {
    setLoggingOut(true)
    await logout()
    setLoggingOut(false)
    navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-mist-100 text-ink-900">
      {/* 顶栏 */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-900/8 bg-white/85 px-4 backdrop-blur-md">
        <Link to="/admin" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="text-[15px]">天择 <span className="text-ink-400">·</span> 后台</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <a href="/" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-ink-500 transition-colors hover:bg-mist-200 hover:text-ink-900">
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">回访官网</span>
          </a>
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-lg py-1.5 pl-2 pr-1 transition-colors hover:bg-mist-200" aria-haspopup="menu" aria-expanded={menu}>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand">{(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}</span>
              <span className="hidden max-w-[140px] truncate text-[13px] font-medium sm:inline">{user?.name}</span>
              <ChevronDown className={cx('h-3.5 w-3.5 text-ink-400 transition-transform', menu && 'rotate-180')} />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden />
                <div className="absolute right-0 z-20 mt-1.5 w-60 overflow-hidden rounded-xl border border-ink-900/8 bg-white shadow-elev-lg">
                  <div className="border-b border-ink-900/6 px-4 py-3">
                    <p className="truncate text-[13px] font-semibold text-ink-900">{user?.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-400">{user?.email}</p>
                    <Badge tone="brand" className="mt-2">{roleLabel[user?.role] || user?.role}</Badge>
                  </div>
                  <Link to="/admin/settings" onClick={() => setMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink-700 transition-colors hover:bg-mist-100">
                    <SettingsIcon className="h-4 w-4 text-ink-400" /> 个人设置
                  </Link>
                  <button onClick={doLogout} disabled={loggingOut} className="flex w-full items-center gap-2.5 border-t border-ink-900/6 px-4 py-2.5 text-left text-[13px] text-[#B91C1C] transition-colors hover:bg-mist-100 disabled:opacity-60">
                    {loggingOut ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4" />} 退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 侧栏 */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-ink-900/8 bg-white/60 px-3 py-4 md:flex">
          <nav className="space-y-0.5">
            {items.map((n) => (
              <NavLink
                key={n.path}
                to={n.path}
                end={n.end || n.path === '/admin'}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                    isActive ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-mist-200 hover:text-ink-900',
                  )
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <p className="mt-auto px-3 pt-6 text-[11px] leading-relaxed text-ink-400">
            共 {items.length} 个模块<br />按角色权限可见
          </p>
        </aside>

        {/* 移动端顶部横滑导航 */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-1 overflow-x-auto border-t border-ink-900/8 bg-white/95 px-2 py-1.5 backdrop-blur md:hidden">
          {items.map((n) => (
            <NavLink
              key={n.path}
              to={n.path}
              end={n.end || n.path === '/admin'}
              className={({ isActive }) =>
                cx('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors', isActive ? 'bg-ink-900 text-white' : 'text-ink-500')
              }
            >
              <n.icon className="h-3.5 w-3.5" />
              {n.label}
            </NavLink>
          ))}
        </div>

        <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <div className="mx-auto max-w-[1100px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
