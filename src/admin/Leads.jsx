/* ============================================================
 * 线索管理：列表 + 关键词/状态/产品/来源筛选 + 状态流转 + 详情抽屉 + CSV 导出
 * ------------------------------------------------------------
 * id 是行号（服务端 readJsonl 后按索引编的号），PATCH 直接用它定位。
 * CSV 走 <a href>：GET 带同源 httpOnly cookie 即可下载，不需要 fetch。
 * ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Search, RefreshCw, Inbox as InboxIcon } from 'lucide-react'
import * as api from '../lib/adminApi'
import { useAuth } from './AuthContext'
import { Btn, Card, Input, Select, Textarea, Field, Badge, Banner, Modal, Spinner, cx, useToast } from './ui'

const STATUSES = [
  { value: 'new', label: '新线索', tone: 'brand' },
  { value: 'follow-up', label: '跟进中', tone: 'amber' },
  { value: 'contacted', label: '已联系', tone: 'green' },
  { value: 'invalid', label: '无效', tone: 'red' },
]
const statusMeta = (v) => STATUSES.find((s) => s.value === v) || STATUSES[0]

const PAGE = 50 // 分页拉取颗粒：服务端最多回 500，这里按 50 逐页「加载更多」

const fmtTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function Leads() {
  const { can } = useAuth()
  const toast = useToast()
  const canWrite = can('leads.update')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [err, setErr] = useState('')
  const [filters, setFilters] = useState({ q: '', status: '', product: '', source: '' })
  const [active, setActive] = useState(null)
  const rowsRef = useRef([])

  const load = useCallback(async (mode = 'reset') => {
    if (mode === 'reset') setLoading(true)
    else setLoadingMore(true)
    setErr('')
    try {
      const offset = mode === 'reset' ? 0 : rowsRef.current.length
      const r = await api.listLeads({ ...filters, offset, limit: PAGE })
      const page = r.items || []
      const next = mode === 'reset' ? page : [...rowsRef.current, ...page]
      rowsRef.current = next
      setItems(next)
      setTotal(r.total || 0)
    } catch (e) {
      setErr(e.message)
      if (mode === 'reset') { rowsRef.current = []; setItems([]) }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filters])

  /* load 只随 filters 变；rows 不进依赖（用 rowsRef 拿当前长度做 offset），
     否则加载完一改 rows 就换 load 身份 → effect 再跑 → 无限循环。 */
  useEffect(() => {
    const t = setTimeout(() => load('reset'), filters.q ? 260 : 0)
    return () => clearTimeout(t)
  }, [load, filters.q])

  /* 产品 / 来源下拉的候选：从当前结果里现取，不额外发请求 */
  const { productOpts, sourceOpts } = useMemo(() => {
    const ps = new Set()
    const ss = new Set()
    for (const r of items) {
      if (r.product) ps.add(r.product)
      if (r.source) ss.add(r.source)
    }
    return { productOpts: [...ps], sourceOpts: [...ss] }
  }, [items])

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  const saveLead = async (patch) => {
    try {
      const r = await api.updateLead(active.id, patch)
      const next = rowsRef.current.map((x) => (x.id === active.id ? { ...x, ...r.item } : x))
      rowsRef.current = next
      setItems(next)
      setActive((a) => ({ ...a, ...r.item }))
      toast('已保存', 'success')
    } catch (e) {
      toast(e.message || '保存失败', 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">线索管理</h1>
          <p className="mt-1 text-[13px] text-ink-500">共 {total} 条留资线索 · 状态按跟进流转</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={() => load('reset')}><RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} />刷新</Btn>
          <a href={api.leadsCsvUrl(filters)}><Btn variant="dark" size="sm"><Download className="h-3.5 w-3.5" />导出 CSV</Btn></a>
        </div>
      </div>

      {/* 筛选条 */}
      <Card className="p-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input className="pl-9" placeholder="搜索姓名 / 电话 / 单位 / 备注" value={filters.q} onChange={setF('q')} aria-label="搜索线索" />
          </div>
          <Select value={filters.status} onChange={setF('status')} aria-label="按状态筛选">
            <option value="">全部状态</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Select value={filters.product} onChange={setF('product')} aria-label="按意向筛选">
            <option value="">全部意向</option>
            {productOpts.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={filters.source} onChange={setF('source')} aria-label="按来源筛选">
            <option value="">全部来源</option>
            {sourceOpts.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </Card>

      <Banner>{err}</Banner>

      {/* 表 */}
      <Card className="overflow-hidden">
        {loading && !items.length ? (
          <div className="grid h-52 place-items-center text-ink-400"><Spinner /></div>
        ) : !items.length ? (
          <div className="flex h-52 flex-col items-center justify-center gap-2 text-ink-400">
            <InboxIcon className="h-8 w-8" />
            <p className="text-[13px]">{filters.q || filters.status || filters.product || filters.source ? '没有符合条件的线索' : '还没有线索'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead className="border-b border-ink-900/8 bg-mist-100/60 text-[12px] text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">时间</th>
                  <th className="px-4 py-2.5 font-medium">姓名 / 电话</th>
                  <th className="px-4 py-2.5 font-medium">单位</th>
                  <th className="px-4 py-2.5 font-medium">意向方向</th>
                  <th className="px-4 py-2.5 font-medium">来源</th>
                  <th className="px-4 py-2.5 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/6">
                {items.map((r) => {
                  const sm = statusMeta(r.status)
                  return (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`查看 ${r.name || '该条'} 线索详情`}
                      onClick={() => setActive(r)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(r) } }}
                      className="cursor-pointer transition-colors hover:bg-mist-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
                    >
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-500">{fmtTime(r.ts)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900">{r.name || '—'}</div>
                        <div className="tabular-nums text-ink-400">{r.phone || '—'}</div>
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-ink-700"><div className="truncate">{r.org || '—'}</div></td>
                      <td className="px-4 py-3 text-ink-700">{r.product || '—'}</td>
                      <td className="px-4 py-3"><code className="rounded bg-mist-200 px-1.5 py-0.5 text-[11.5px] text-ink-500">{r.source || '—'}</code></td>
                      <td className="px-4 py-3"><Badge tone={sm.tone}>{sm.label}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {items.length > 0 && items.length < total && (
        <div className="flex justify-center">
          <Btn variant="ghost" size="sm" onClick={() => load('more')} loading={loadingMore}>
            加载更多（已显示 {items.length} / {total}）
          </Btn>
        </div>
      )}

      {/* 详情抽屉 */}
      <Modal open={!!active} onClose={() => setActive(null)} title="线索详情">
        {active && <LeadDetail lead={active} canWrite={canWrite} onSave={saveLead} />}
      </Modal>
    </div>
  )
}

function LeadDetail({ lead, canWrite, onSave }) {
  const [status, setStatus] = useState(lead.status || 'new')
  const [note, setNote] = useState(lead.note || '')
  useEffect(() => { setStatus(lead.status || 'new'); setNote(lead.note || '') }, [lead])
  const dirty = status !== (lead.status || 'new') || note !== (lead.note || '')
  const [saving, setSaving] = useState(false)

  const rows = [
    ['提交时间', fmtTime(lead.ts)],
    ['姓名', lead.name],
    ['手机号', lead.phone],
    ['单位', lead.org],
    ['职位', lead.role],
    ['意向方向', lead.product],
    ['来源', lead.source],
    ['IP', lead.ip],
    ['浏览器', lead.ua],
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

      <Field label="跟进状态">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canWrite}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </Field>
      <Field label="备注" hint="记录沟通进展，仅后台可见">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} disabled={!canWrite} placeholder="尚未记录" />
      </Field>

      {lead.updatedBy && <p className="text-[12px] text-ink-400">最近更新：{lead.updatedBy} · {fmtTime(lead.updatedAt)}</p>}

      {canWrite ? (
        <div className="flex justify-end gap-2 pt-1">
          <Btn
            variant="primary"
            loading={saving}
            disabled={!dirty}
            onClick={async () => { setSaving(true); await onSave({ status, note }); setSaving(false) }}
          >
            保存
          </Btn>
        </div>
      ) : (
        <Banner kind="success">当前角色为只读，无法修改线索状态。</Banner>
      )}
    </div>
  )
}
