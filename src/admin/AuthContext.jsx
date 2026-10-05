/* ============================================================
 * 后台会话上下文：挂载即拉 /me，之后各处用 useAuth() 读写
 * ------------------------------------------------------------
 * status：loading（首帧）/ anon（未登录）/ ready（已登录）
 * perms 来自服务端（角色展开 + 个人追加），前端 can() 与服务端 hasPerm 同规则：
 * 支持 '*' 通配与 '命名空间.*' 前缀。前端据此过滤导航与按钮只是体验，
 * 真正的边界永远在服务端二次校验——这里少显一个按钮不代表就多一分权限。
 * ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../lib/adminApi'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [perms, setPerms] = useState([])

  const apply = (r) => {
    setUser(r.user)
    setPerms(r.perms || [])
    setStatus('ready')
  }

  const refresh = useCallback(async () => {
    try {
      apply(await api.me())
    } catch {
      setUser(null)
      setPerms([])
      setStatus('anon')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    apply(await api.login(email, password))
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* 忽略登出失败：本地照样清态 */
    }
    setUser(null)
    setPerms([])
    setStatus('anon')
  }, [])

  const can = useCallback(
    (perm) => {
      if (!perm) return !!user
      if (perms.includes('*') || perms.includes(perm)) return true
      const dot = perm.lastIndexOf('.')
      return dot > 0 && perms.includes(perm.slice(0, dot) + '.*')
    },
    [perms, user],
  )

  const value = useMemo(() => ({ status, user, perms, can, login, logout, refresh }), [status, user, perms, can, login, logout, refresh])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
