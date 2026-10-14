/* ============================================================
 * 后台根：会话守卫 + 内层路由
 * ------------------------------------------------------------
 * loading → 静默骨架；anon → 登录页；ready → 外壳 + 各模块页。
 * 守卫只决定「看到什么」，每个接口调用仍会打到服务端二次鉴权，
 * 绕过这里也拿不到数据。
 * ============================================================ */
import { useEffect } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { ToastProvider, Spinner } from './ui'
import Shell from './Shell'
import Login from './Login'
import Dashboard from './Dashboard'
import Leads from './Leads'
import Content from './Content'
import Users from './Users'
import Settings from './Settings'
import Analytics from './Analytics'
import Seo from './Seo'
import Geo from './Geo'
import Audit from './Audit'

/* 路由级权限门：与侧栏 NAV 用同一套 perm，未命中的页直接不给渲染。
   数据边界始终在服务端（绕过这里照样 403），这里只是让「看不到的模块」
   也不会因为手输 URL 而露出一个空壳——最小授权的呈现要与实际一致。 */
function RequirePerm({ perm, children }) {
  const { can } = useAuth()
  if (can(perm)) return children
  return (
    <div className="card-elev mx-auto mt-10 max-w-md rounded-2xl p-8 text-center">
      <p className="text-[15px] font-semibold text-ink-900">没有访问权限</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-500">当前角色无权进入该模块。如需访问，请联系管理员调整角色权限。</p>
      <Link to="/admin" className="mt-5 inline-flex rounded-xl bg-ink-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-ink-800">
        返回概览
      </Link>
    </div>
  )
}

function Gate() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-mist-100 text-ink-400" role="status" aria-live="polite">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (status === 'anon') return <Login />

  return (
    <Routes>
      <Route path="/admin" element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<RequirePerm perm="leads.read"><Leads /></RequirePerm>} />
        <Route path="content" element={<RequirePerm perm="content.read"><Content /></RequirePerm>} />
        <Route path="analytics" element={<RequirePerm perm="analytics.read"><Analytics /></RequirePerm>} />
        <Route path="seo" element={<RequirePerm perm="audit.read"><Seo /></RequirePerm>} />
        <Route path="geo" element={<RequirePerm perm="audit.read"><Geo /></RequirePerm>} />
        <Route path="audit" element={<RequirePerm perm="audit.read"><Audit /></RequirePerm>} />
        <Route path="users" element={<RequirePerm perm="users.read"><Users /></RequirePerm>} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default function AdminRoot() {
  /* 后台标签页标题：营销 index.html 的 <title> 是全站统一那一份，进后台要换成
     专属标题（登录 / 骨架 / 外壳都在这棵子树里，一次设定即覆盖）。卸载时还原，
     避免切回营销站时残留。 */
  useEffect(() => {
    const prev = document.title
    document.title = '天择教育·管理后台'
    return () => { document.title = prev }
  }, [])
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  )
}
