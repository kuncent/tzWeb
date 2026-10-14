/* ============================================================
 * GEO 体检：Generative Engine Optimization
 * ------------------------------------------------------------
 * 与 SEO 面板并列，关心 ChatGPT / Perplexity / Claude 能不能引到你的原话。
 * 面板结构：
 *   ① AuditList 清单（llms.txt / AI 爬虫允许 / JSON-LD / 语义 HTML / AI 命中）
 *   ② 一张 echarts 折线：近 30 日 AI 爬虫命中次数（与 pv/uv 折线同组件、不同 option）
 *   ③ AI 命中 top bot 表 + llms.txt 预览
 * 数据源与"访问统计 - 地区分布"正交：那边的地理维度只算真人；这边只算爬虫。
 * ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import * as echarts from 'echarts'
import * as api from '../lib/adminApi'
import { Card, Banner, Btn, Spinner, AuditList, PageFade, toBaseMs } from './ui'

const fmtDate = (s) => String(s).slice(5) // YYYY-MM-DD → MM-DD
const fromTs = (ts) => { const b = toBaseMs(ts); return Number.isFinite(b) ? new Date(b).toISOString().slice(0, 10) : '—' }

function AiTrend({ data }) {
  const ref = useRef(null)
  const inst = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    inst.current = echarts.init(ref.current, null, { renderer: 'canvas' })
    const ro = new ResizeObserver(() => inst.current?.resize())
    ro.observe(ref.current)
    return () => { ro.disconnect(); inst.current?.dispose(); inst.current = null }
  }, [])
  useEffect(() => {
    const c = inst.current
    if (!c) return
    c.setOption({
      backgroundColor: 'transparent',
      grid: { left: 36, right: 16, top: 24, bottom: 28 },
      tooltip: { trigger: 'axis', confine: true, backgroundColor: '#fff', borderColor: 'rgba(11,18,32,0.08)', textStyle: { color: '#0b1220', fontSize: 12 } },
      xAxis: {
        type: 'category',
        data: data.map((d) => fmtDate(d.date)),
        axisLine: { lineStyle: { color: 'rgba(11,18,32,0.15)' } },
        axisLabel: { color: '#64748b', fontSize: 11, interval: Math.max(0, Math.floor(data.length / 8) - 1) },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(11,18,32,0.06)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [{
        name: 'AI 命中',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: data.map((d) => d.aiHits),
        lineStyle: { color: '#7c3aed', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(124,58,237,0.28)' },
            { offset: 1, color: 'rgba(124,58,237,0.02)' },
          ]),
        },
      }],
    }, true)
  }, [data])
  return <div ref={ref} className="h-56 w-full" />
}

export default function Geo() {
  const [report, setReport] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const r = await api.geoReport(30)
      setReport(r)
    } catch (e) {
      setErr(e.message || '拉取失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const aiDaily = useMemo(() => report?.aiDaily || [], [report])
  const sum = report?.summary

  return (
    <PageFade className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-bold tracking-tight text-ink-900">
            <Sparkles className="h-5 w-5 text-[#7c3aed]" />
            GEO 体检
          </h1>
          <p className="mt-1 text-[13px] text-ink-500">Generative Engine Optimization：让 ChatGPT / Perplexity / Claude 能在回答里引到你的原话</p>
        </div>
        <Btn variant="ghost" onClick={refetch} disabled={loading}>
          {loading ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
          重新体检
        </Btn>
      </div>

      {err && <Banner>加载 GEO 报告失败：{err}</Banner>}

      {report && (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-4 text-[13px]">
              <span className="text-ink-500">共 <b className="tabular-nums text-ink-900">{sum?.total ?? 0}</b> 项</span>
              <span className="text-emerald-600">通过 <b className="tabular-nums">{sum?.pass ?? 0}</b></span>
              <span className="text-[#B91C1C]">待改 <b className="tabular-nums">{sum?.warn ?? 0}</b></span>
              <span className="ml-auto text-[12px] text-ink-400">近 30 日 AI 命中：<b className="tabular-nums text-ink-900">{sum?.aiHits30d ?? 0}</b></span>
            </div>
          </Card>

          <Card className="overflow-hidden py-0">
            <AuditList items={report.items || []} />
          </Card>

          <Card className="p-5">
            <h3 className="text-[14px] font-semibold text-ink-900">近 30 日 AI 爬虫逐日到访</h3>
            {aiDaily.length ? <AiTrend data={aiDaily} /> : <p className="mt-4 text-[13px] text-ink-400">暂无数据</p>}
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-[14px] font-semibold text-ink-900">AI 爬虫命中排行</h3>
              {(report.aiBots || []).length === 0 ? (
                <p className="mt-3 text-[13px] text-ink-400">尚无 AI 爬虫到访记录。</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {report.aiBots.map((b) => (
                    <li key={b.bot} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink-900">{b.bot}</p>
                        <p className="mt-0.5 truncate text-[11.5px] text-ink-400">最近：{fromTs(b.lastSeen)} · 主要页 {b.paths?.[0]?.path || '—'}</p>
                      </div>
                      <span className="shrink-0 tabular-nums text-[13px] font-semibold text-[#7c3aed]">{b.hits}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-[14px] font-semibold text-ink-900">llms.txt 预览</h3>
              {report.llms?.exists ? (
                <>
                  <p className="mt-1 text-[12px] text-ink-400">{report.llms.bytes} 字节</p>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-mist-100 p-3 text-[12px] leading-relaxed text-ink-700">{report.llms.preview}</pre>
                </>
              ) : (
                <p className="mt-3 text-[13px] leading-relaxed text-ink-400">
                  未构建 <code className="rounded bg-mist-200 px-1 py-0.5 text-[12px]">dist/llms.txt</code>。<br />
                  建议在 <code className="rounded bg-mist-200 px-1 py-0.5 text-[12px]">public/llms.txt</code> 放一份，重跑 <code className="rounded bg-mist-200 px-1 py-0.5 text-[12px]">npm run build</code> 生效。
                </p>
              )}
            </Card>
          </div>

          {(report.searchBots || []).length > 0 && (
            <Card className="p-5">
              <h3 className="text-[14px] font-semibold text-ink-900">搜索引擎爬虫近 30 日到访</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {report.searchBots.map((b) => (
                  <li key={b.bot} className="flex items-baseline justify-between gap-3 rounded-lg border border-ink-900/8 px-3 py-2 text-[13px]">
                    <span className="truncate text-ink-700">{b.bot}</span>
                    <span className="shrink-0 tabular-nums font-semibold text-ink-900">{b.hits}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </PageFade>
  )
}
