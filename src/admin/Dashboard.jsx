/* ============================================================
 * 概览仪表盘：复用线索接口在前端聚合，不引图表库（首屏体积敏感）
 * ------------------------------------------------------------
 * · 总线索数 / 近 7 日新增 / 待跟进（new）数
 * · 按「意向方向」与「来源」的分布条形，取前 6 项
 * 只读页，任何登录角色都可进（can(null) 恒真）。
 * ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Clock, Inbox } from 'lucide-react'
import * as api from '../lib/adminApi'
import { Card, Banner, Spinner } from './ui'

const DAY = 86400000
const num = (v) => (Number.isFinite(v) ? v.toLocaleString('zh-CN') : String(v))

function dist(list, key) {
  const map = new Map()
  for (const r of list) {
    const k = r[key] || '（未标注）'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
}

function Bars({ title, data, total, accent }) {
  if (!data.length) return null
  return (
    <Card className="p-5">
      <h3 className="text-[14px] font-semibold text-ink-900">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {data.map(([k, v]) => (
          <li key={k}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
              <span className="min-w-0 truncate text-ink-700">{k}</span>
              <span className="shrink-0 tabular-nums text-ink-400">{v} · {Math.round((v / (total || 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-mist-200">
              <div className={accent} style={{ width: `${Math.max(4, (v / (total || 1)) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Dashboard() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    api
      .listLeads({})
      .then((r) => alive && setRows(r.items || []))
      .catch((e) => alive && setErr(e.message))
    return () => {
      alive = false
    }
  }, [])

  const stats = useMemo(() => {
    if (!rows) return null
    const now = Date.now()
    const recent = rows.filter((r) => now - new Date(r.ts).getTime() <= 7 * DAY).length
    const pending = rows.filter((r) => (r.status || 'new') === 'new').length
    return { total: rows.length, recent, pending }
  }, [rows])

  if (err) return <Banner>加载概览失败：{err}</Banner>
  if (!stats) {
    return (
      <div className="grid h-64 place-items-center text-ink-400">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  const cards = [
    { icon: Inbox, k: '线索总量', v: num(stats.total), tone: 'bg-brand-50 text-brand' },
    { icon: TrendingUp, k: '近 7 日新增', v: num(stats.recent), tone: 'bg-emerald-50 text-emerald-600' },
    { icon: Clock, k: '待跟进', v: num(stats.pending), tone: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-ink-900">概览</h1>
        <p className="mt-1 text-[13px] text-ink-500">官网留资线索的实时快照</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.k} className="flex items-center gap-4 p-5">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${c.tone}`}>
              <c.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[12.5px] text-ink-400">{c.k}</p>
              <p className="mt-0.5 text-[24px] font-bold tabular-nums leading-none tracking-tight text-ink-900">{c.v}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Bars title="按意向方向" data={dist(rows, 'product')} total={rows.length} accent="bg-brand" />
        <Bars title="按来源（归因）" data={dist(rows, 'source')} total={rows.length} accent="bg-ink-900" />
      </div>

      {rows.length === 0 && (
        <Card className="p-8 text-center text-[13px] text-ink-400">
          还没有线索。官网访客在联系表单留资、或点各产品屏的咨询按钮后，会实时汇总到这里。
        </Card>
      )}
    </div>
  )
}
