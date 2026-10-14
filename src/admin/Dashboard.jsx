/* ============================================================
 * 总览：一屏看完访问 / 线索 / 操作
 * ------------------------------------------------------------
 * 数据源：
 *   · statsOverview(30) + statsDaily(30) —— analytics.read
 *   · listLeads({limit:5}) —— leads.read（ops/manager/admin 都有）
 *   · listAudits({days:7,limit:5}) —— audit.read（仅 admin/manager）
 * 每块独立容错：任何一路挂掉只让对应卡变空态，不让整页 500。
 * ops 无 audit.read → 底部操作块自然隐藏，不显示"无权访问"占位。
 * ============================================================ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Eye, Users, UserPlus, Sparkles, Inbox, Clock, TrendingUp, RefreshCw,
  FileText, BarChart3, SearchCheck, ScrollText, ArrowUpRight, ArrowDownRight,
  Users as UsersIcon,
} from 'lucide-react'
import * as api from '../lib/adminApi'
import { useAuth } from './AuthContext'
import { Card, Banner, Btn, Skeleton, EmptyState, PageFade, cx, toBaseMs } from './ui'
import { Chart, useDailyOption, useSparkOption } from './charts'

const DAY = 86400000
const num = (v) => (Number.isFinite(v) ? v.toLocaleString('zh-CN') : String(v ?? '—'))
const fromTs = (ts) => { const b = toBaseMs(ts); return Number.isFinite(b) ? new Date(b).toISOString().slice(5, 16).replace('T', ' ') : '—' }

/* ---------- KPI 卡：图标 + 主数字 + 副标签 + 迷你 sparkline + 环比箭头 ---------- */
function KpiCard({ icon: Icon, label, value, sub, tone, trend, series }) {
  const spark = useSparkOption(series, { color: tone?.spark || '#1677ff' })
  const arrow = trend == null ? null : (
    <span className={cx(
      'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
      trend > 0 ? 'bg-emerald-50 text-emerald-600' : trend < 0 ? 'bg-[#DC2626]/10 text-[#B91C1C]' : 'bg-mist-200 text-ink-400',
    )}>
      {trend > 0 && <ArrowUpRight className="h-3 w-3" />}
      {trend < 0 && <ArrowDownRight className="h-3 w-3" />}
      {trend === 0 && '·'}
      {trend !== 0 && `${Math.abs(trend)}%`}
    </span>
  )
  return (
    <Card hover className="p-5">
      <div className="flex items-center gap-3">
        <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tone?.bg, tone?.fg)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] text-ink-400">{label}</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p className="truncate text-[22px] font-bold tabular-nums leading-none tracking-tight text-ink-900">{value}</p>
            {arrow}
          </div>
        </div>
      </div>
      {spark && <Chart option={spark} height={38} className="mt-3 -mb-1" />}
      {sub && <p className="mt-2 truncate text-[11.5px] text-ink-400">{sub}</p>}
    </Card>
  )
}

/* ---------- 最近线索时间线：一行一条，点击进线索管理并 focus ---------- */
function RecentLeads({ items, empty }) {
  if (!items || items.length === 0) {
    return <EmptyState icon={Inbox} title={empty.title} hint={empty.hint} />
  }
  return (
    <ul className="divide-y divide-ink-900/6">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            to={`/admin/leads?focus=${encodeURIComponent(r.id)}`}
            className="flex items-center gap-3 px-5 py-3 text-[13px] transition-colors hover:bg-mist-100/60"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[11.5px] font-semibold text-brand">
              {(r.name || r.phone || '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink-900">
                {r.name || '匿名'}
                {r.org && <span className="ml-1.5 text-ink-400">· {r.org}</span>}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-ink-400">
                {r.product || '未标注意向'} · {fromTs(r.ts)}
              </p>
            </div>
            <span className={cx(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
              (r.status || 'new') === 'new' ? 'bg-amber-50 text-amber-600' : 'bg-mist-200 text-ink-500',
            )}>
              {(r.status || 'new') === 'new' ? '待跟进' : r.status}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/* ---------- 最近操作摘要：一行一条，admin/manager 才能看到（audit.read） ---------- */
const ACTION_LABEL = {
  'content.publish': '发布内容',
  'auth.login': '登录',
  'auth.logout': '登出',
  'user.create': '新建用户',
  'user.update': '修改用户',
  'user.delete': '删除用户',
  'user.password.reset': '重置他人密码',
  'user.password.self_reset': '修改自己密码',
}
function summarize(row) {
  if (row.action === 'content.publish') {
    const n = row.diff?.length || 0
    if (!n) return '发布（无实际改动）'
    const first = row.diff[0]
    return `${n} 处改动 · 首例 ${first.path}`
  }
  if (row.action?.startsWith('user.')) return row.target || ''
  if (row.action === 'auth.login') return '登录后台'
  if (row.action === 'auth.logout') return '退出登录'
  return row.target || ''
}
function RecentAudits({ items }) {
  if (!items || items.length === 0) return <EmptyState icon={ScrollText} title="近 7 日无操作" hint="内容发布、用户增删、登录登出都会留一行审计" />
  return (
    <ul className="divide-y divide-ink-900/6">
      {items.map((r, i) => (
        <li key={(r.ts || '') + i} className="flex items-center gap-3 px-5 py-3 text-[13px]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mist-200 text-[11.5px] font-semibold text-ink-500">
            {(r.userName || r.userEmail || '?').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-ink-900">
              <span className="font-medium">{r.userName || r.userEmail || '匿名'}</span>
              <span className="ml-1.5 text-[12px] text-ink-400">{ACTION_LABEL[r.action] || r.action}</span>
            </p>
            <p className="mt-0.5 truncate text-[12px] text-ink-400">{summarize(r)}</p>
          </div>
          <span className="shrink-0 tabular-nums text-[11.5px] text-ink-400">{fromTs(r.ts)}</span>
        </li>
      ))}
    </ul>
  )
}

/* ---------- 快捷入口：图标小方格，perm 缺项不渲染 ---------- */
const QUICK = [
  { path: '/admin/content', label: '内容编辑', icon: FileText, perm: 'content.read' },
  { path: '/admin/leads', label: '线索管理', icon: Inbox, perm: 'leads.read' },
  { path: '/admin/analytics', label: '访问统计', icon: BarChart3, perm: 'analytics.read' },
  { path: '/admin/seo', label: 'SEO 体检', icon: SearchCheck, perm: 'audit.read' },
  { path: '/admin/geo', label: 'GEO 体检', icon: Sparkles, perm: 'audit.read' },
  { path: '/admin/audit', label: '操作日志', icon: ScrollText, perm: 'audit.read' },
  { path: '/admin/users', label: '用户与权限', icon: UsersIcon, perm: 'users.read' },
]
function QuickLinks({ can }) {
  const items = QUICK.filter((q) => can(q.perm))
  if (!items.length) return null
  return (
    <Card className="p-5">
      <h3 className="text-[14px] font-semibold text-ink-900">快捷入口</h3>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((q) => (
          <Link
            key={q.path}
            to={q.path}
            className="flex items-center gap-2 rounded-xl border border-ink-900/8 bg-mist-50/60 px-3 py-2.5 text-[13px] text-ink-700 transition-colors hover:border-brand/40 hover:bg-white hover:text-brand"
          >
            <q.icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{q.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  )
}

/* ---------- 环比：近 7 日 vs 前 7 日 ---------- */
function trendPct(series) {
  if (!series || series.length < 14) return null
  const last7 = series.slice(-7).reduce((s, x) => s + (x || 0), 0)
  const prev7 = series.slice(-14, -7).reduce((s, x) => s + (x || 0), 0)
  if (prev7 === 0) return last7 === 0 ? 0 : 100
  return Math.round(((last7 - prev7) / prev7) * 100)
}

export default function Dashboard() {
  const { can } = useAuth()
  const [ov, setOv] = useState(null)
  const [daily, setDaily] = useState([])
  const [leads, setLeads] = useState(null)
  const [audits, setAudits] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  const canAnalytics = can('analytics.read')
  const canAudit = can('audit.read')
  const canLeads = can('leads.read')

  const refetch = useCallback(async () => {
    setLoading(true)
    setErr('')
    const jobs = []
    if (canAnalytics) {
      jobs.push(api.statsOverview(30).then(setOv).catch((e) => { setErr((prev) => prev || `统计：${e.message}`) }))
      jobs.push(api.statsDaily(30).then((r) => setDaily(r.items || [])).catch(() => {}))
    }
    if (canLeads) {
      jobs.push(api.listLeads({ limit: 5 }).then((r) => setLeads(r.items || [])).catch((e) => setErr((prev) => prev || `线索：${e.message}`)))
    } else {
      setLeads([])
    }
    if (canAudit) {
      jobs.push(api.listAudits({ days: 7, limit: 5 }).then((r) => setAudits(r.items || [])).catch(() => setAudits([])))
    }
    await Promise.allSettled(jobs)
    setLoading(false)
  }, [canAnalytics, canAudit, canLeads])

  useEffect(() => { refetch() }, [refetch])

  const pvSpark = useMemo(() => daily.map((d) => d.pv), [daily])
  const uvSpark = useMemo(() => daily.map((d) => d.uv), [daily])
  const dailyOpt = useDailyOption(daily.slice(-7))

  const aiSpark = useMemo(() => daily.map((d) => d.ai || 0), [daily])
  const pendingSpark = useMemo(() => {
    // 把近 7 日线索按 ts 分桶到 daily 数组的日期上（daily[i].date = YYYY-MM-DD），累加成一条线索/日的柱
    if (!daily.length || !leads) return []
    const map = new Map()
    // 拉全部线索会破坏 limit=5 的假设，这里只把「最近 5 条」按天点标出来即可
    for (const r of leads || []) {
      const k = (() => { const b = toBaseMs(r.ts); return Number.isFinite(b) ? new Date(b).toISOString().slice(0, 10) : '' })()
      map.set(k, (map.get(k) || 0) + 1)
    }
    return daily.slice(-7).map((d) => map.get(d.date) || 0)
  }, [daily, leads])

  if (loading && !ov && leads === null) {
    return (
      <div className="space-y-5">
        <Skeleton lines={2} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-5"><Skeleton lines={3} /></Card>
          ))}
        </div>
        <Card className="p-5"><Skeleton lines={6} /></Card>
      </div>
    )
  }

  const pendingCount = leads ? leads.filter((r) => (r.status || 'new') === 'new').length : 0
  const last7Pv = pvSpark.slice(-7).reduce((s, x) => s + (x || 0), 0)
  const last7Uv = uvSpark.slice(-7).reduce((s, x) => s + (x || 0), 0)
  const last7Ai = aiSpark.slice(-7).reduce((s, x) => s + (x || 0), 0)
  const recentNew = leads ? leads.filter((r) => Date.now() - new Date(r.ts).getTime() <= 7 * DAY).length : 0

  return (
    <PageFade className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">总览</h1>
          <p className="mt-1 text-[13px] text-ink-500">访问、线索与操作的一屏快照 · 近 30 日窗口</p>
        </div>
        <Btn variant="ghost" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} />刷新
        </Btn>
      </div>

      {err && <Banner>部分数据加载失败：{err}</Banner>}

      {/* KPI 4 张 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Eye} label="近 30 日 PV" value={num(ov?.pv ?? last7Pv)} sub={ov?.topPage ? `最热：${ov.topPage.path}` : ''}
          tone={{ bg: 'bg-brand-50', fg: 'text-brand', spark: '#1677ff' }}
          series={pvSpark.slice(-14)} trend={trendPct(pvSpark)}
        />
        <KpiCard
          icon={Users} label="近 30 日 UV" value={num(ov?.uv ?? last7Uv)} sub={ov ? `≈${ov.devices ?? '—'} 人/设备 · ${ov.distinctIps ?? '—'} IP` : ''}
          tone={{ bg: 'bg-emerald-50', fg: 'text-emerald-600', spark: '#10b981' }}
          series={uvSpark.slice(-14)} trend={trendPct(uvSpark)}
        />
        <KpiCard
          icon={Sparkles} label="AI 爬虫命中" value={num(ov?.aiCrawlerHits ?? last7Ai)} sub={ov ? `搜索 ${ov.searchCrawlerHits} · 社媒 ${ov.socialCrawlerHits}` : ''}
          tone={{ bg: 'bg-[#ede9fe]', fg: 'text-[#7c3aed]', spark: '#7c3aed' }}
          series={aiSpark.slice(-14)} trend={trendPct(aiSpark)}
        />
        <KpiCard
          icon={Clock} label="待跟进线索" value={num(pendingCount)} sub={`近 7 日新增 ${recentNew}`}
          tone={{ bg: 'bg-amber-50', fg: 'text-amber-600', spark: '#f59e0b' }}
          series={pendingSpark} trend={null}
        />
      </div>

      {/* 中部：趋势线 + 最近 5 线索 */}
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
              <TrendingUp className="h-4 w-4 text-brand" />近 7 日 PV / UV
            </h3>
            {canAnalytics && (
              <Link to="/admin/analytics" className="text-[12px] text-brand hover:underline">查看完整统计 →</Link>
            )}
          </div>
          {dailyOpt ? (
            <Chart option={dailyOpt} height={240} />
          ) : (
            <EmptyState
              icon={BarChart3}
              title="尚无访问数据"
              hint="打开官网任意页面即会自动打点；离线开发环境不会计入。"
              action={<a href="/" target="_blank" rel="noopener"><Btn variant="ghost" size="sm">回访官网</Btn></a>}
            />
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h3 className="text-[14px] font-semibold text-ink-900">最近 5 条线索</h3>
            {canLeads && (
              <Link to="/admin/leads" className="text-[12px] text-brand hover:underline">进入线索 →</Link>
            )}
          </div>
          <RecentLeads
            items={leads || []}
            empty={{ title: '还没有线索', hint: '官网留资表单提交后会实时汇总到这里。' }}
          />
        </Card>
      </div>

      {/* 底部：最近操作 + 快捷入口（audit 块仅 admin/manager 可见） */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        {canAudit && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h3 className="text-[14px] font-semibold text-ink-900">最近 7 日操作</h3>
              <Link to="/admin/audit" className="text-[12px] text-brand hover:underline">完整日志 →</Link>
            </div>
            <RecentAudits items={audits || []} />
          </Card>
        )}
        <QuickLinks can={can} />
      </div>
    </PageFade>
  )
}
