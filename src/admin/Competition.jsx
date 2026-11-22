/* ============================================================
 * 后台 · 竞赛报名
 * ------------------------------------------------------------
 * 官网报名表把队伍信息压进线索的 note：
 *   队伍:xxx | 成员:A、B、C、D | 指导:E、F | 邮箱:x | 备注:y
 * 这里按 source=competition-2026 取线索，再把 note 解析回队列表。
 * 状态流转复用 /leads/:id（同一份 leads.jsonl），权限仍走 leads.read/update。
 * 注意：详情里不提供改 note —— note 是队伍数据的载体，改它会拆掉成员信息。
 * ============================================================ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Download, GraduationCap, Inbox as InboxIcon, RefreshCw, Search, Trophy, Users } from 'lucide-react'
import * as api from '../lib/adminApi'
import { useAuth } from './AuthContext'
import {
  Badge, Banner, Btn, Card, EmptyState, Field, Input, Modal, PageFade, Select, Skeleton, cx, useToast,
} from './ui'

const SOURCE = 'competition-2026'
const LIMIT = 500

const STATUSES = [
  { value: 'new', label: '新报名', tone: 'brand' },
  { value: 'follow-up', label: '跟进中', tone: 'amber' },
  { value: 'contacted', label: '已联系', tone: 'green' },
  { value: 'invalid', label: '无效', tone: 'red' },
]
const statusMeta = (v) => STATUSES.find((s) => s.value === v) || STATUSES[0]

const fmtTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/* note 是「键:值 | 键:值」的扁平串，按分隔符拆回队伍字段 */
function parseNote(note = '') {
  const out = { team: '', members: [], advisors: [], email: '', extra: '' }
  for (const part of String(note).split(' | ')) {
    const at = part.indexOf(':')
    if (at < 0) continue
    const k = part.slice(0, at).trim()
    const v = part.slice(at + 1).trim()
    if (k === '队伍') out.team = v
    else if (k === '成员') out.members = v.split('、').map((s) => s.trim()).filter(Boolean)
    else if (k === '指导') out.advisors = v.split('、').map((s) => s.trim()).filter(Boolean)
    else if (k === '邮箱') out.email = v
    else if (k === '备注') out.extra = v
  }
  return out
}

export default function Competition() {
  const { can } = useAuth()
  const toast = useToast()
  const canWrite = can('leads.update')

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filters, setFilters] = useState({ q: '', status: '' })
  const [active, setActive] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const r = await api.listLeads({ ...filters, source: SOURCE, limit: LIMIT })
      setRows(r.items || [])
      setTotal(r.total || 0)
    } catch (e) {
      setErr(e.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const t = setTimeout(load, filters.q ? 260 : 0)
    return () => clearTimeout(t)
  }, [load, filters.q])

  const teams = useMemo(
    () =>
      rows.map((r) => {
        const p = parseNote(r.note)
        const members = p.members.length ? p.members : [r.name].filter(Boolean)
        return { ...r, team: p.team, members, advisors: p.advisors, email: p.email, extra: p.extra }
      }),
    [rows],
  )

  const stats = useMemo(() => {
    const players = teams.reduce((n, t) => n + t.members.length, 0)
    const advisors = teams.reduce((n, t) => n + t.advisors.length, 0)
    const schools = new Set(teams.map((t) => (t.org || '').trim()).filter(Boolean)).size
    return [
      { k: '报名队伍', v: total, icon: Trophy },
      { k: '参赛选手', v: players, icon: Users },
      { k: '指导教师', v: advisors, icon: GraduationCap },
      { k: '覆盖院校', v: schools, icon: Building2 },
    ]
  }, [teams, total])

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  const saveStatus = async (status) => {
    try {
      const r = await api.updateLead(active.id, { status })
      setRows((list) => list.map((x) => (x.id === active.id ? { ...x, ...r.item } : x)))
      setActive((a) => ({ ...a, ...r.item }))
      toast('状态已更新', 'success')
    } catch (e) {
      toast(e.message || '保存失败', 'error')
    }
  }

  return (
    <PageFade className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">竞赛报名</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            2026 全国数智财经综合应用大赛 · 报名期 2026.11.23 — 12.05
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={load}>
            <RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} />
            刷新
          </Btn>
          <a href={api.leadsCsvUrl({ source: SOURCE })}>
            <Btn variant="dark" size="sm">
              <Download className="h-3.5 w-3.5" />
              导出 CSV
            </Btn>
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.k} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-500">{s.k}</span>
                <Icon className="h-4 w-4 text-ink-300" strokeWidth={1.8} />
              </div>
              <p className="mt-2 text-[26px] font-bold leading-none tabular-nums text-ink-900">{s.v}</p>
            </Card>
          )
        })}
      </div>

      <Card className="p-3">
        <div className="grid gap-2.5 sm:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              className="pl-9"
              placeholder="搜索队伍 / 院校 / 队长 / 电话"
              value={filters.q}
              onChange={setF('q')}
              aria-label="搜索报名队伍"
            />
          </div>
          <Select value={filters.status} onChange={setF('status')} aria-label="按状态筛选">
            <option value="">全部状态</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Banner>{err}</Banner>

      <Card className="overflow-hidden">
        {loading && !teams.length ? (
          <div className="p-5"><Skeleton lines={8} /></div>
        ) : !teams.length ? (
          <EmptyState
            icon={InboxIcon}
            title={filters.q || filters.status ? '没有符合条件的队伍' : '还没有报名队伍'}
            hint={filters.q || filters.status ? '试着放宽关键词或状态。' : '官网报名表提交后会实时出现在这里。'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[13px]">
              <thead className="border-b border-ink-900/8 bg-mist-100/60 text-[12px] text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">提交时间</th>
                  <th className="px-4 py-2.5 font-medium">队伍</th>
                  <th className="px-4 py-2.5 font-medium">院校 / 赛区</th>
                  <th className="px-4 py-2.5 font-medium">队长</th>
                  <th className="px-4 py-2.5 font-medium">队员</th>
                  <th className="px-4 py-2.5 font-medium">指导教师</th>
                  <th className="px-4 py-2.5 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/6">
                {teams.map((t) => {
                  const sm = statusMeta(t.status)
                  return (
                    <tr
                      key={t.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`查看 ${t.team || t.org || '该'} 队伍详情`}
                      onClick={() => setActive(t)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(t) }
                      }}
                      className="cursor-pointer transition-colors even:bg-mist-50/40 hover:bg-mist-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
                    >
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-500">{fmtTime(t.ts)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900">{t.team || '未命名队伍'}</div>
                        <div className="text-[12px] text-ink-400">{t.email || '—'}</div>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <div className="truncate text-ink-700">{t.org || '—'}</div>
                        <div className="text-[12px] text-ink-400">{t.region || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900">{t.name || '—'}</div>
                        <div className="tabular-nums text-ink-400">{t.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cx('font-medium tabular-nums', t.members.length === 4 ? 'text-ink-700' : 'text-amber-600')}>
                          {t.members.length}
                        </span>
                        <span className="text-ink-400"> / 4</span>
                      </td>
                      <td className="max-w-[160px] px-4 py-3">
                        <div className="truncate text-ink-700">{t.advisors.join('、') || '—'}</div>
                      </td>
                      <td className="px-4 py-3"><Badge tone={sm.tone}>{sm.label}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {total > LIMIT && (
        <p className="text-center text-[12px] text-ink-400">
          共 {total} 支队伍，当前显示最近 {LIMIT} 支；请用搜索或状态筛选缩小范围。
        </p>
      )}

      <Modal open={!!active} onClose={() => setActive(null)} title="报名详情">
        {active && (
          <TeamDetail
            team={active}
            canWrite={canWrite}
            onStatus={saveStatus}
          />
        )}
      </Modal>
    </PageFade>
  )
}

function TeamDetail({ team, canWrite, onStatus }) {
  const [status, setStatus] = useState(team.status || 'new')
  const [saving, setSaving] = useState(false)
  useEffect(() => setStatus(team.status || 'new'), [team])
  const dirty = status !== (team.status || 'new')
  const sm = statusMeta(team.status)

  const rows = [
    ['队伍名称', team.team || '未命名队伍'],
    ['院校', team.org],
    ['所在赛区', team.region],
    ['队长', team.name],
    ['手机号', team.phone],
    ['电子邮箱', team.email],
    ['提交时间', fmtTime(team.ts)],
    ['来源', team.source],
  ]

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 rounded-xl border border-ink-900/8 bg-white px-4 py-3 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-400">{k}</dt>
            <dd className="min-w-0 break-words text-ink-900">{v || <span className="text-ink-400">—</span>}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="mb-2 flex items-center gap-2 text-[12px] font-medium text-ink-500">
          参赛成员
          <span className={cx('tabular-nums', team.members.length === 4 ? 'text-ink-400' : 'text-amber-600')}>
            {team.members.length} / 4
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {team.members.map((m, i) => (
            <span
              key={`${m}-${i}`}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-900/8 bg-mist-100 px-2.5 py-1.5 text-[12.5px] text-ink-800"
            >
              <span className="font-mono text-[10px] text-ink-400">{String(i + 1).padStart(2, '0')}</span>
              {m}
              {i === 0 && <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] text-brand">队长</span>}
            </span>
          ))}
        </div>
      </div>

      {team.advisors.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-medium text-ink-500">指导教师</p>
          <div className="flex flex-wrap gap-2">
            {team.advisors.map((a) => (
              <span key={a} className="rounded-lg border border-ink-900/8 bg-white px-2.5 py-1.5 text-[12.5px] text-ink-800">{a}</span>
            ))}
          </div>
        </div>
      )}

      {team.extra && (
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-ink-500">报名备注</p>
          <p className="rounded-xl bg-mist-100 px-4 py-3 text-[13px] leading-relaxed text-ink-700">{team.extra}</p>
        </div>
      )}

      <Field label="跟进状态" hint={`当前：${sm.label}`}>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canWrite}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </Field>

      {canWrite ? (
        <div className="flex justify-end gap-2 pt-1">
          <Btn
            variant="primary"
            loading={saving}
            disabled={!dirty}
            onClick={async () => {
              setSaving(true)
              await onStatus(status)
              setSaving(false)
            }}
          >
            保存
          </Btn>
        </div>
      ) : (
        <Banner kind="success">当前角色为只读，无法修改报名状态。</Banner>
      )}
    </div>
  )
}
