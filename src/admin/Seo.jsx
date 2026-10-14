/* ============================================================
 * SEO 体检：只读审计 + 建议清单
 * ------------------------------------------------------------
 * 每次进入或点"重新体检"都打一次 GET /admin/seo，服务端现读 dist/，
 * 无缓存 —— 用户按建议手改 public/robots.txt 等再重跑 `npm run build`
 * 之后，回到本页刷新就能看到红转绿。
 * 顶部 summary 三个数（总项 / 通过 / 待改），下面一条 AuditList。
 * ============================================================ */
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import * as api from '../lib/adminApi'
import { Card, Banner, Btn, Spinner, AuditList, PageFade } from './ui'

export default function Seo() {
  const [report, setReport] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const r = await api.seoReport()
      setReport(r)
    } catch (e) {
      setErr(e.message || '拉取失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const sum = report?.summary
  return (
    <PageFade className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">SEO 体检</h1>
          <p className="mt-1 text-[13px] text-ink-500">读 <code className="rounded bg-mist-200 px-1.5 py-0.5 text-[12.5px]">dist/</code> 构建产物；改动 <code className="rounded bg-mist-200 px-1.5 py-0.5 text-[12.5px]">index.html</code> 或 <code className="rounded bg-mist-200 px-1.5 py-0.5 text-[12.5px]">public/</code> 后请重跑 <code className="rounded bg-mist-200 px-1.5 py-0.5 text-[12.5px]">npm run build</code> 再看面板</p>
        </div>
        <Btn variant="ghost" onClick={refetch} disabled={loading}>
          {loading ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
          重新体检
        </Btn>
      </div>

      {err && <Banner>加载 SEO 报告失败：{err}</Banner>}

      {report && !report.built && (
        <Banner kind="error">{report.items?.[0]?.detail || '未构建 dist/'}<br />建议：{report.items?.[0]?.advice}</Banner>
      )}

      {report && report.built && (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-4 text-[13px]">
              <span className="text-ink-500">共 <b className="tabular-nums text-ink-900">{sum?.total ?? 0}</b> 项</span>
              <span className="text-emerald-600">通过 <b className="tabular-nums">{sum?.pass ?? 0}</b></span>
              <span className="text-[#B91C1C]">待改 <b className="tabular-nums">{sum?.warn ?? 0}</b></span>
              <span className="ml-auto truncate text-[12px] text-ink-400">读取路径：{report.distPath}</span>
            </div>
          </Card>
          <Card className="overflow-hidden py-0">
            <AuditList items={report.items || []} />
          </Card>
        </>
      )}
    </PageFade>
  )
}
