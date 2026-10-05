/* ============================================================
 * 用户与权限：列表 + 新增 + 改角色 + 禁用/启用 + 重置密码 + 删除
 * ------------------------------------------------------------
 * 「最后一个 owner 不能降级/删除/禁用」「不能操作自己」等红线由服务端把关，
 * 前端只负责把 409/403 的 message 如实回显，不自己演算规则（避免两边漂移）。
 * ============================================================ */
import { useCallback, useEffect, useState } from 'react'
import { UserPlus, KeyRound, Trash2, Pencil } from 'lucide-react'
import * as api from '../lib/adminApi'
import { useAuth } from './AuthContext'
import { Btn, Card, Input, Select, Field, Badge, Banner, Modal, Spinner, cx, useToast } from './ui'

const ROLE_LABEL = { owner: '超级管理员', admin: '管理员', editor: '编辑', viewer: '只读' }
const ROLE_DESC = {
  owner: '全部权限，含用户管理',
  admin: '线索、内容、用户、设置',
  editor: '线索与内容编辑',
  viewer: '只读线索与内容',
}
const roleTone = { owner: 'brand', admin: 'neutral', editor: 'green', viewer: 'neutral' }

export default function Users() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(null) // {mode:'create'} | {mode:'edit', u} | {mode:'reset', u}

  const load = useCallback(async () => {
    setErr('')
    try {
      const r = await api.listUsers()
      setItems(r.items || [])
    } catch (e) {
      setErr(e.message)
      setItems([]) // 收敛加载态：失败也落到空表 + 错误横幅，不让 spinner 永久停在
    }
  }, [])
  useEffect(() => { load() }, [load])

  const guard = (fn) => async (...a) => {
    try { await fn(...a); toast('已更新', 'success'); load(); setModal(null) }
    catch (e) { toast(e.message || '操作失败', 'error') }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">用户与权限</h1>
          <p className="mt-1 text-[13px] text-ink-500">{items ? `${items.length} 个账号` : '加载中…'}</p>
        </div>
        <Btn size="sm" onClick={() => setModal({ mode: 'create' })}><UserPlus className="h-4 w-4" />新增用户</Btn>
      </div>

      <Banner>{err}</Banner>

      <Card className="overflow-hidden">
        {!items ? (
          <div className="grid h-40 place-items-center text-ink-400"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead className="border-b border-ink-900/8 bg-mist-100/60 text-[12px] text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">姓名 / 邮箱</th>
                  <th className="px-4 py-2.5 font-medium">角色</th>
                  <th className="px-4 py-2.5 font-medium">状态</th>
                  <th className="px-4 py-2.5 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/6">
                {items.map((u) => (
                  <tr key={u.id} className={cx(u.disabled && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900">
                        {u.name}
                        {u.id === me?.id && <span className="ml-1.5 text-[11px] text-ink-400">（我）</span>}
                      </div>
                      <div className="text-ink-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={roleTone[u.role] || 'neutral'}>{ROLE_LABEL[u.role] || u.role}</Badge></td>
                    <td className="px-4 py-3">
                      {u.disabled ? <Badge tone="red">已禁用</Badge> : <Badge tone="green">正常</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="编辑角色 / 姓名" onClick={() => setModal({ mode: 'edit', u })}><Pencil className="h-4 w-4" /></IconBtn>
                        <IconBtn title="重置密码" onClick={() => setModal({ mode: 'reset', u })}><KeyRound className="h-4 w-4" /></IconBtn>
                        <IconBtn
                          title={u.disabled ? '启用' : '禁用'}
                          onClick={guard(async () => { await api.patchUser(u.id, { disabled: !u.disabled }); if (!u.disabled) toast('已禁用', 'success') })}
                        >
                          <span className="text-[12px] font-semibold">{u.disabled ? '启用' : '禁用'}</span>
                        </IconBtn>
                        <IconBtn danger title="删除" disabled={u.id === me?.id} onClick={() => confirm(`确认删除「${u.name}」？此操作不可撤销。`) && guard(() => api.deleteUser(u.id))()}>
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && <UserModal modal={modal} onClose={() => setModal(null)} guard={guard} />}
    </div>
  )
}

function IconBtn({ children, title, danger, disabled, onClick }) {
  return (
    <button
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'grid h-8 w-8 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        danger ? 'text-ink-400 hover:bg-[#DC2626]/10 hover:text-[#B91C1C]' : 'text-ink-500 hover:bg-mist-200 hover:text-ink-900',
      )}
    >
      {children}
    </button>
  )
}

function UserModal({ modal, onClose, guard }) {
  const isCreate = modal.mode === 'create'
  const isReset = modal.mode === 'reset'
  const u = modal.u || {}
  const [name, setName] = useState(u.name || '')
  const [email, setEmail] = useState(u.email || '')
  const [role, setRole] = useState(u.role || 'viewer')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const title = isCreate ? '新增用户' : isReset ? `重置「${u.name}」的密码` : `编辑「${u.name}」`

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    if (isReset) await guard(() => api.resetUserPassword(u.id, password))()
    else if (isCreate) await guard(() => api.createUser({ name, email, role, password }))()
    else await guard(() => api.patchUser(u.id, { name, role }))()
    setBusy(false)
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        {!isReset && (
          <>
            <Field label="姓名"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="张老师的名字" /></Field>
            {!isCreate ? null : (
              <Field label="邮箱" required hint="登录账号，需唯一">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@school.edu.cn" />
              </Field>
            )}
            <Field label="角色" hint={ROLE_DESC[role]}>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                {['owner', 'admin', 'editor', 'viewer'].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </Select>
            </Field>
          </>
        )}
        {(isCreate || isReset) && (
          <Field label={isReset ? '新密码' : '初始密码'} required hint="至少 8 位">
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        )}
        {isReset && <Banner kind="success">重置后该用户所有已登录会话将立即失效，需用新密码重新登录。</Banner>}
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" type="button" onClick={onClose}>取消</Btn>
          <Btn type="submit" loading={busy} disabled={!isReset && isCreate && (!email || password.length < 8)}>{isCreate ? '创建' : '保存'}</Btn>
        </div>
      </form>
    </Modal>
  )
}
