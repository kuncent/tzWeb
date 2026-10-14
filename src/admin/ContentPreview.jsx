/* ============================================================
 * 内容编辑右侧的官网实时预览（同域 iframe）
 * ------------------------------------------------------------
 * 语义：iframe 显示的是「已发布态」—— 编辑未点发布前 iframe 不变，
 * 与官网访客看到的一致；发布后点"刷新预览"重新加载 iframe。
 * 焦点定位：外层 Content.jsx 在每次 Field/Textarea focus 时把对应的
 * 锚点 id 送过来，用 postMessage 让 iframe 里 main.jsx 挂的 scrollToId
 * 滚过去；不重载 iframe，避免每次点表单都拉整站 chunk。
 * 埋点短路：iframe src 带 ?admin_preview=1，useTracker 会走 iframe 与
 * 预览模式两道锁，不污染访问统计。
 * ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, RotateCw } from 'lucide-react'
import { anchorSections } from '../data/site'
import { Btn, Skeleton, cx } from './ui'

const PREVIEW_SRC = '/?admin_preview=1'

/* 锁点面包屑：从 anchorSections 派生，加 products 别名兼容旧引用 */
const ANCHOR_LABEL = Object.fromEntries(anchorSections.map((s) => [s.id, s.label]))
ANCHOR_LABEL.products = '产品矩阵' // 别名

export default function ContentPreview({ anchor, refreshKey, onLoadChange }) {
  const iframeRef = useRef(null)
  const [ready, setReady] = useState(false)

  /* anchor 变化时把滚动指令送进 iframe（未 ready 前只更新最新值，ready 时补发一次） */
  const pendingAnchor = useRef(anchor)
  pendingAnchor.current = anchor

  useEffect(() => {
    if (!ready) return
    const id = pendingAnchor.current
    if (!id) return
    const win = iframeRef.current?.contentWindow
    if (!win) return
    try { win.postMessage({ type: 'admin:scrollTo', id }, window.location.origin) } catch { /* ignore */ }
  }, [anchor, ready])

  /* 外层 refreshKey++（发布后）与内部手动刷新都映射到 reloadNonce；
     两条通道共同触发 iframe 重载，确保发布后预览同步反映新内容。 */
  const [innerNonce, setInnerNonce] = useState(0)
  const lastRefreshKey = useRef(refreshKey)
  useEffect(() => {
    if (refreshKey !== lastRefreshKey.current) {
      lastRefreshKey.current = refreshKey
      setInnerNonce((n) => n + 1)
    }
  }, [refreshKey])
  const src = useMemo(() => `${PREVIEW_SRC}#_r=${innerNonce}`, [innerNonce])
  useEffect(() => {
    setReady(false)
    if (onLoadChange) onLoadChange(false)
  }, [src, onLoadChange])

  const handleLoad = useCallback(() => {
    setReady(true)
    if (onLoadChange) onLoadChange(true)
    // ready 后立刻补发一次当前 anchor
    const id = pendingAnchor.current
    const win = iframeRef.current?.contentWindow
    if (id && win) {
      try { win.postMessage({ type: 'admin:scrollTo', id }, window.location.origin) } catch { /* ignore */ }
    }
  }, [onLoadChange])

  const forceReload = () => setInnerNonce((n) => n + 1)

  return (
    <div className="sticky top-20 flex h-[calc(100vh-6rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-ink-900/8 bg-white shadow-elev">
      <div className="flex items-center justify-between gap-2 border-b border-ink-900/6 bg-mist-50/80 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-ink-900">官网实时预览</p>
          <p className="mt-0.5 truncate text-[11.5px] text-ink-400">
            {anchor ? `定位到：${ANCHOR_LABEL[anchor] || anchor}` : '点左侧任一字段可自动滚动到对应区块'}
            {' · '}显示的是已发布态
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Btn variant="ghost" size="sm" onClick={forceReload} title="重新加载 iframe"><RotateCw className="h-3.5 w-3.5" />刷新</Btn>
          <a href="/" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-xl border border-ink-900/12 bg-white px-3 py-1.5 text-[13px] text-ink-700 transition-colors hover:border-ink-900/25 hover:text-ink-900">
            <ExternalLink className="h-3.5 w-3.5" />在浏览器打开
          </a>
        </div>
      </div>
      <div className={cx('relative min-h-0 flex-1 bg-mist-100/40', !ready && 'overflow-hidden')}>
        <iframe
          ref={iframeRef}
          key={src}
          src={src}
          title="官网预览"
          onLoad={handleLoad}
          className="h-full w-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          referrerPolicy="no-referrer"
        />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-sm">
            <div className="w-[280px]">
              <p className="mb-3 text-center text-[12.5px] text-ink-500">正在加载官网预览…</p>
              <Skeleton lines={5} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
