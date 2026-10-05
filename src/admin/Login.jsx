/* ============================================================
 * 后台登录页：邮箱 + 口令，card-elev 居中，显式错误与限流提示
 * ============================================================ */
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Btn, Field, Input, Banner, Card } from './ui'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setErr('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      /* 成功后 AuthContext 转 ready，Shell 会接管渲染，这里无需跳转 */
    } catch (e2) {
      setErr(e2.status === 429 ? e2.message || '尝试过于频繁，请 1 分钟后再试' : e2.message || '登录失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-mist-100 to-mist-200 px-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-900 text-white shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-[22px] font-bold tracking-tight text-ink-900">天择 · 管理后台</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-500">使用管理员分配的账号登录</p>
        </div>
        <Card className="p-7">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="邮箱" required>
              <Input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="密码" required>
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Banner>{err}</Banner>
            <Btn type="submit" variant="dark" loading={busy} className="w-full" disabled={!email || !password}>
              {busy ? '登录中…' : '登录'}
            </Btn>
          </form>
        </Card>
        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ink-400">
          受保护区域 · 所有操作按角色权限记录 · 忘记口令请联络超级管理员
        </p>
      </div>
    </div>
  )
}
