/* ============================================================
 * 访问统计：KPI / 日趋势 / 中国省级地图 / 国家条形 / 热门页 / 来源 / bot
 * ------------------------------------------------------------
 * 数据来源：GET /admin/stats/{overview,daily,regions,pages,sources,bots,devices}
 * 真人 PV/UV 只算 kind='real'（服务端已过滤）；爬虫分列到 bot 表。
 * echarts 实例、日趋势/地图/来源的 option 都从 charts.jsx 拿，与 Dashboard
 * 共用一份实现，保证后续 KPI 卡想加趋势图时不重复写 dispose/ResizeObserver。
 * ============================================================ */
import { useCallback, useEffect, useState } from 'react'
import { Eye, Users, UserPlus, UserCheck, Sparkles, RefreshCw, Map as MapIcon } from 'lucide-react'
import * as api from '../lib/adminApi'
import { Card, Banner, Btn, Spinner, PageFade, toBaseMs } from './ui'

import { Chart, useDailyOption, useChinaOption, useSourcesOption, normalizeProvince } from './charts'
const num = (v) => (Number.isFinite(v) ? v.toLocaleString('zh-CN') : String(v ?? '—'))
const fromTs = (ts) => { const b = toBaseMs(ts); return Number.isFinite(b) ? new Date(b).toISOString().slice(0, 16).replace('T', ' ') : '—' }

/* ---------- KPI 卡 ---------- */
function Kpi({ icon: Icon, label, value, sub, tone }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] text-ink-400">{label}</p>
        <p className="mt-0.5 truncate text-[22px] font-bold tabular-nums leading-none tracking-tight text-ink-900">{value}</p>
        {sub && <p className="mt-1 truncate text-[11.5px] text-ink-400">{sub}</p>}
      </div>
    </Card>
  )
}

/* ---------- 条形组件（国家 & 设备） ---------- */
function Bars({ title, items, labelOf, accent = 'bg-brand', empty = '暂无数据' }) {
  const total = items.reduce((s, x) => s + x.count, 0) || 1
  return (
    <Card className="p-5">
      <h3 className="text-[14px] font-semibold text-ink-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-400">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((x, i) => (
            <li key={x.code || x.device || i}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
                <span className="min-w-0 truncate text-ink-700">{labelOf(x)}</span>
                <span className="shrink-0 tabular-nums text-ink-400">{x.count} · {Math.round((x.count / total) * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-mist-200">
                <div className={accent} style={{ width: `${Math.max(4, (x.count / total) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ---------- 主页面 ---------- */
const DAYS_OPTIONS = [7, 30, 90]

export default function Analytics() {
  const [days, setDays] = useState(30)
  const [ov, setOv] = useState(null)
  const [daily, setDaily] = useState([])
  const [regions, setRegions] = useState({ countries: [], provinces: [] })
  const [pages, setPages] = useState([])
  const [sources, setSources] = useState([])
  const [bots, setBots] = useState([])
  const [devices, setDevices] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async (d) => {
    setLoading(true)
    setErr('')
    try {
      const [o, dl, rg, pg, sc, bt, dv] = await Promise.all([
        api.statsOverview(d),
        api.statsDaily(d),
        api.statsRegions(d),
        api.statsPages(d, 20),
        api.statsSources(d),
        api.statsBots(d),
        api.statsDevices(d),
      ])
      setOv(o)
      setDaily(dl.items || [])
      setRegions({ countries: rg.countries || [], provinces: rg.provinces || [] })
      setPages(pg.items || [])
      setSources(sc.items || [])
      setBots(bt.items || [])
      setDevices(dv.items || [])
    } catch (e) {
      setErr(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch(days) }, [days, refetch])

  const dailyOpt = useDailyOption(daily)
  const chinaOpt = useChinaOption(regions.provinces, days)
  const sourcesOpt = useSourcesOption(sources)

  const humanBots = bots.filter((b) => b.kind !== 'ai')

  return (
    <PageFade className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">访问统计</h1>
          <p className="mt-1 text-[13px] text-ink-500">埋点：<code className="rounded bg-mist-200 px-1.5 py-0.5 text-[12.5px]">POST /api/ai/track</code>；地区走离线 ip2region（IPv4+IPv6）；地图/省份按去重设备统计</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-xl border border-ink-900/10 bg-white text-[13px]">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={
                  'px-3 py-1.5 transition-colors ' +
                  (days === d ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-mist-200')
                }
              >
                近 {d} 日
              </button>
            ))}
          </div>
          <Btn variant="ghost" onClick={() => refetch(days)} disabled={loading}>
            {loading ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
            刷新
          </Btn>
        </div>
      </div>

      {err && <Banner>加载访问统计失败：{err}</Banner>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi icon={Eye} label={`近 ${days} 日 PV`} value={num(ov?.pv ?? 0)} sub={ov?.topPage ? `最热：${ov.topPage.path}` : ''} tone="bg-brand-50 text-brand" />
        <Kpi icon={Users} label={`近 ${days} 日 UV`} value={num(ov?.uv ?? 0)} sub={ov ? `平均 ${ov.avgPagesPerVisit} 页/访问` : ''} tone="bg-emerald-50 text-emerald-600" />
        <Kpi icon={UserCheck} label={`近 ${days} 日 访客(设备)`} value={num(ov?.devices ?? 0)} sub={ov ? `独立 IP ${ov.distinctIps} · 剔探测 ${ov.probeExcluded}` : 'IP+机型+分辨率去重'} tone="bg-sky-50 text-sky-600" />
        <Kpi icon={UserPlus} label="今日新增设备" value={num(ov?.devicesToday ?? 0)} sub="IP+机型+分辨率去重" tone="bg-amber-50 text-amber-600" />
        <Kpi icon={Sparkles} label="AI 爬虫命中" value={num(ov?.aiCrawlerHits ?? 0)} sub={ov ? `搜索 ${ov.searchCrawlerHits} · 社媒 ${ov.socialCrawlerHits}` : ''} tone="bg-[#ede9fe] text-[#7c3aed]" />
      </div>

      <Card className="p-5">
        <h3 className="text-[14px] font-semibold text-ink-900">日趋势</h3>
        {dailyOpt ? <Chart option={dailyOpt} height={280} /> : <p className="mt-4 text-[13px] text-ink-400">暂无数据。打开官网任意页面即会打点。</p>}
      </Card>

      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
            <MapIcon className="h-4 w-4 text-brand" /> 中国省级分布 · 近 {days} 日
          </h3>
          {chinaOpt ? <Chart option={chinaOpt} height={380} /> : <p className="mt-4 text-[13px] text-ink-400">尚无 CN 境内访问记录，或 xdb 未加载。</p>}
        </Card>
        <Bars title={`国内省份 · 近 ${days} 日`} items={regions.provinces} labelOf={(x) => normalizeProvince(x.code) || x.code} accent="bg-ink-900" empty="暂无境内省份访问记录" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-[14px] font-semibold text-ink-900">热门页面</h3>
          {pages.length === 0 ? (
            <p className="mt-3 text-[13px] text-ink-400">暂无页面访问数据。</p>
          ) : (
            <table className="mt-3 w-full text-[13px]">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="pb-2 font-medium">路径</th>
                  <th className="pb-2 text-right font-medium">PV</th>
                  <th className="pb-2 text-right font-medium">UV</th>
                  <th className="pb-2 text-right font-medium">最近</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/6">
                {pages.map((p) => (
                  <tr key={p.path}>
                    <td className="py-2 pr-2 font-mono text-[12.5px] text-ink-900">{p.path}</td>
                    <td className="py-2 text-right tabular-nums text-ink-700">{p.pv}</td>
                    <td className="py-2 text-right tabular-nums text-ink-700">{p.uv}</td>
                    <td className="py-2 text-right text-[11.5px] tabular-nums text-ink-400">{fromTs(p.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-[14px] font-semibold text-ink-900">来源分布</h3>
          {sourcesOpt ? <Chart option={sourcesOpt} height={260} /> : <p className="mt-3 text-[13px] text-ink-400">尚无来源数据。</p>}
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Bars title="设备分布" items={devices.map((d) => ({ device: d.device, code: d.device, count: d.count }))} labelOf={(x) => ({ desktop: '桌面端', mobile: '移动端', tablet: '平板', bot: '爬虫/其他' })[x.device] || x.device} accent="bg-brand" empty="暂无设备数据" />
        <Card className="p-5">
          <h3 className="text-[14px] font-semibold text-ink-900">搜索引擎 & 社媒爬虫</h3>
          {humanBots.length === 0 ? (
            <p className="mt-3 text-[13px] text-ink-400">尚无外部 bot 到访记录。</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {humanBots.slice(0, 10).map((b) => (
                <li key={b.kind + b.bot} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-900">{b.bot}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-400">{b.kind} · 最近：{fromTs(b.lastSeen)}</p>
                  </div>
                  <span className="shrink-0 tabular-nums font-semibold text-ink-900">{b.hits}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageFade>
  )
}
