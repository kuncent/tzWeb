/* ============================================================
 * 操作日志：一行一条审计，content.publish 可展开逐条 diff
 * ------------------------------------------------------------
 * 数据源：GET /admin/audit?days=&user=&action=&limit=&offset=
 * 需要 audit.read；ops 侧栏本就隐藏该项，直接访问 URL 也走 403。
 * 用户下拉：有 users.read 才拉列表；否则只显示"我自己"。
 * ============================================================ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollText, RefreshCw, ChevronRight, Copy, Download } from 'lucide-react'
import * as api from '../lib/adminApi'
import { useAuth } from './AuthContext'
import { Card, Banner, Btn, Select, Badge, Skeleton, EmptyState, PageFade, cx, toBaseMs } from './ui'

const DAY_OPTIONS = [7, 30, 90]
const PAGE_SIZE = 50

const ACTION_LABEL = {
  'content.publish': '发布内容',
  'auth.login': '登录',
  'auth.logout': '登出',
  'user.create': '新建用户',
  'user.update': '修改用户',
  'user.delete': '删除用户',
  'user.password.reset': '重置密码',
  'user.password.self_reset': '自改密码',
}
const ACTION_TONE = {
  'content.publish': 'brand',
  'auth.login': 'neutral',
  'auth.logout': 'neutral',
  'user.create': 'green',
  'user.update': 'amber',
  'user.delete': 'red',
  'user.password.reset': 'amber',
  'user.password.self_reset': 'neutral',
}

const fmtTs = (ts) => { const b = toBaseMs(ts); return Number.isFinite(b) ? new Date(b).toISOString().slice(0, 19).replace('T', ' ') : '—' }

function prettyVal(v) {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try { return JSON.stringify(v) } catch { return String(v) }
}

/* 一行审计的展开区：diff 数组 → path/from/to 三列表，path 可点击复制 */
function DiffRows({ diff }) {
  if (!diff || !diff.length) {
    return <p className="px-5 py-3 text-[12.5px] text-ink-400">本次发布无实际改动（点了发布但内容一致）。</p>
  }
  const copyPath = (p) => navigator.clipboard?.writeText(p).catch(() => {})
  return (
    <ul className="divide-y divide-ink-900/6 border-t border-ink-900/6 bg-mist-50/60">
      {diff.map((d, i) => (
        <li key={i} className="grid gap-1 px-5 py-2.5 font-mono text-[12px] md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,1fr)] md:items-baseline md:gap-3">
          <button
            type="button"
            className="group inline-flex items-center gap-1 truncate text-left text-ink-500 hover:text-brand"
            onClick={() => copyPath(d.path)}
            title="复制路径"
          >
            {d.path}
            <Copy className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60" />
          </button>
          <span className="truncate text-ink-400 line-through decoration-ink-300">{prettyVal(d.from)}</span>
          <span className="truncate font-semibold text-emerald-700">{prettyVal(d.to)}</span>
        </li>
      ))}
    </ul>
  )
}

function AuditRow({ row, expandable, open, onToggle }) {
  return (
    <>
      <tr className={cx('transition-colors even:bg-mist-50/40 hover:bg-mist-100/60', open && 'bg-mist-50/60')}>
        <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] tabular-nums text-ink-500">{fmtTs(row.ts)}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mist-200 text-[10.5px] font-semibold text-ink-500">
              {(row.userName || row.userEmail || '?').slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 truncate text-[13px] text-ink-900">{row.userName || row.userEmail || '匿名'}</span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <Badge tone={ACTION_TONE[row.action] || 'neutral'}>{ACTION_LABEL[row.action] || row.action}</Badge>
        </td>
        <td className="px-4 py-2.5 text-[12.5px] text-ink-500">
          <div className="flex items-center gap-1.5">
            {expandable && (
              <button
                onClick={onToggle}
                aria-expanded={open}
                className={cx('grid h-5 w-5 shrink-0 place-items-center rounded text-ink-400 transition-transform hover:bg-mist-200', open && 'rotate-90 text-ink-900')}
                title="展开/收起 diff"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="min-w-0 truncate">{row.note || row.target || '—'}</span>
          </div>
        </td>
      </tr>
      {expandable && open && (
        <tr className="bg-mist-50/60">
          <td colSpan={4} className="p-0">
            <DiffRows diff={row.diff} />
          </td>
        </tr>
      )}
    </>
  )
}

export default function Audit() {
  const { can } = useAuth()
  const canReadUsers = can('users.read')
  const [days, setDays] = useState(30)
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [items, setItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [users, setUsers] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [openKeys, setOpenKeys] = useState(() => new Set())

  const refetch = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const r = await api.listAudits({ days, user: userFilter || undefined, action: actionFilter || undefined, limit: PAGE_SIZE * 4 })
      setItems(r.items || [])
      setTotal(r.total || 0)
    } catch (e) {
      setErr(e.message || '加载失败')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [days, userFilter, actionFilter])

  useEffect(() => { refetch() }, [refetch])
  useEffect(() => {
    if (!canReadUsers) return
    api.listUsers().then((r) => setUsers(r.items || [])).catch(() => {})
  }, [canReadUsers])

  const toggle = (k) => setOpenKeys((prev) => {
    const next = new Set(prev)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    return next
  })

  const shown = useMemo(() => items || [], [items])

  return (
    <PageFade className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">操作日志</h1>
          <p className="mt-1 text-[13px] text-ink-500">记录每一次「谁 · 何时 · 改了官网哪一处」；发布内容会附带逐字段 diff</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={() => {
            const hdr = 'ts,user,action,target'
            const rows = shown.map((r) => [r.ts, r.userName || r.userEmail || '', r.action || '', r.target || ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
            const blob = new Blob([hdr + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `audit-${days}d.csv`; a.click()
          }}><Download className="h-3.5 w-3.5" />导出 CSV</Btn>
          <Btn variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} />刷新
          </Btn>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <span className="text-ink-500">时间窗</span>
          <div className="inline-flex overflow-hidden rounded-xl border border-ink-900/10 bg-white text-[13px]">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cx('px-3 py-1.5 transition-colors', days === d ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-mist-200')}
              >
                近 {d} 日
              </button>
            ))}
          </div>
          {canReadUsers && (
            <>
              <span className="ml-2 text-ink-500">用户</span>
              <Select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="w-40">
                <option value="">全部</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </Select>
            </>
          )}
          <span className="ml-2 text-ink-500">动作</span>
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-40">
            <option value="">全部</option>
            {Object.keys(ACTION_LABEL).map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
          </Select>
          <span className="ml-auto text-[12.5px] text-ink-400">共 {total} 条 · 已加载 {shown.length} 条</span>
        </div>
      </Card>

      {err && <Banner>加载操作日志失败：{err}</Banner>}

      <Card className="overflow-hidden">
        {loading && !shown.length ? (
          <div className="p-5"><Skeleton lines={8} /></div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="窗口内没有操作记录"
            hint="内容发布、用户增删、密码重置、登录登出都会留一行审计。放宽时间窗或清除筛选试试。"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="border-b border-ink-900/8 bg-mist-100/60 text-[12px] text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">时间</th>
                  <th className="px-4 py-2.5 font-medium">用户</th>
                  <th className="px-4 py-2.5 font-medium">动作</th>
                  <th className="px-4 py-2.5 font-medium">摘要 / 展开 diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/6">
                {shown.map((r, i) => {
                  const key = `${r.ts || ''}-${i}`
                  const expandable = r.action === 'content.publish' || Array.isArray(r.diff)
                  return <AuditRow key={key} row={r} expandable={expandable} open={openKeys.has(key)} onToggle={() => toggle(key)} />
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageFade>
  )
}
