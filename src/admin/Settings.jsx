/* ============================================================
 * 个人设置：改自己的显示名 + 改密码（仅需登录，无需特殊权限）
 * ------------------------------------------------------------
 * 改密成功后服务端把 tokenVersion 自增并清 cookie —— 这里刷新会话即可，
 * /me 会 401、上下文转 anon，登录页自然接管，逼用户用新口令重登。
 * ============================================================ */
import { useState } from 'react'
import * as api from '../lib/adminApi'
import { useAuth } from './AuthContext'
import { Btn, Card, Input, Field, Banner, Badge, useToast } from './ui'

const ROLE_LABEL = { owner: '超级管理员', admin: '管理员', editor: '编辑', viewer: '只读' }

export default function Settings() {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [cur, setCur] = useState('')
  const [npw, setNpw] = useState('')
  const [npw2, setNpw2] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const saveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await api.updateProfile({ name })
      await refresh()
      toast('资料已更新', 'success')
    } catch (err) {
      toast(err.message || '保存失败', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPwErr('')
    if (npw.length < 8) { setPwErr('新密码至少 8 位'); return }
    if (npw !== npw2) { setPwErr('两次输入的新密码不一致'); return }
    setSavingPw(true)
    try {
      await api.changePassword(cur, npw)
      toast('密码已更新，请重新登录', 'success')
      await refresh() // 会话已被服务端吊销 → anon → 登录页
    } catch (err) {
      setPwErr(err.message || '修改失败')
      setSavingPw(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-ink-900">个人设置</h1>
        <p className="mt-1 text-[13px] text-ink-500">你的账号信息与登录凭据</p>
      </div>

      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-[15px] font-semibold text-brand">{(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}</span>
          <div>
            <p className="text-[14px] font-semibold text-ink-900">{user?.name}</p>
            <p className="text-[12.5px] text-ink-400">{user?.email}</p>
          </div>
          <Badge tone="brand" className="ml-auto">{ROLE_LABEL[user?.role] || user?.role}</Badge>
        </div>
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="显示名">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" maxLength={40} />
          </Field>
          <Btn type="submit" loading={savingProfile} disabled={!name.trim()}>保存资料</Btn>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-ink-900">修改密码</h2>
        <p className="mt-1 text-[12.5px] text-ink-400">修改后当前会话立即失效，需要用新密码重新登录。</p>
        <form onSubmit={savePassword} className="mt-4 max-w-md space-y-4">
          <Field label="原密码" required>
            <Input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="新密码" required hint="至少 8 位">
              <Input type="password" autoComplete="new-password" value={npw} onChange={(e) => setNpw(e.target.value)} />
            </Field>
            <Field label="确认新密码" required>
              <Input type="password" autoComplete="new-password" value={npw2} onChange={(e) => setNpw2(e.target.value)} />
            </Field>
          </div>
          <Banner>{pwErr}</Banner>
          <Btn type="submit" variant="dark" loading={savingPw} disabled={!cur || !npw}>修改密码</Btn>
        </form>
      </Card>
    </div>
  )
}
