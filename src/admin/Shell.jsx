/* ============================================================
 * 后台外壳：顶栏（品牌 / 回访官网 / 用户菜单）+ 左侧栏（按权限过滤）+ 内容区
 * ------------------------------------------------------------
 * 导航项集中在 NAV：加一个后台模块 = 加一条 {path,label,icon,perm}，
 * 侧栏与路由都据此渲染，与服务端 MODULES 的划分对齐。
 * ============================================================ */
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ExternalLink, LogOut, ChevronDown, ShieldCheck, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from './AuthContext'
import { cx, Badge, Spinner } from './ui'
import { ROLE_LABEL as roleLabel, ROLE_TONE as roleTone } from '../../server/roles.mjs'
import { NAV_GROUPS } from './nav.js'

export default function Shell() {
  const { user, can, logout } = useAuth()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((n) => can(n.perm)) }))
    .filter((g) => g.items.length)
  const itemCount = groups.reduce((n, g) => n + g.items.length, 0)

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
                    <Badge tone={roleTone[user?.role] || 'neutral'} className="mt-2">{roleLabel[user?.role] || user?.role}</Badge>
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
          <nav className="space-y-4">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="mb-1.5 px-3 text-[10.5px] uppercase tracking-wider text-ink-400">{g.title}</p>
                <div className="space-y-0.5">
                  {g.items.map((n) => (
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
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-auto space-y-1 px-3 pt-6 text-[11px] leading-relaxed text-ink-400">
            <p>共 {itemCount} 个模块・按角色可见</p>
            <p className="text-ink-300">v{import.meta.env.PKG_VERSION}・天择科技</p>
          </div>
        </aside>

        {/* 移动端顶部横滑导航 */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-1 overflow-x-auto border-t border-ink-900/8 bg-white/95 px-2 py-1.5 backdrop-blur md:hidden">
          {groups.flatMap((g) => g.items).map((n) => (
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
