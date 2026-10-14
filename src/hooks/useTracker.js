/* ============================================================
 * 前端访问埋点：SPA 路由与首屏各打一发 POST /api/ai/track
 * ------------------------------------------------------------
 * 为什么放在前端而不是服务端拦截 GET /：
 *   React Router 的客户端跳转不会产生 HTTP 请求，服务端只看到首屏一次
 *   GET /，其它路由就漏计了；用 sendBeacon 补一层，PV 与"热门页"才有意义。
 * sendBeacon 优先，fetch keepalive 兜底：
 *   beacon 天生异步、不受页面 unload 打断；Safari <15.4 对 application/json
 *   有兼容性坑，故用 Blob 包一层。若 beacon 返回 false（队列满或 URL 不可
 *   用）再走 fetch + keepalive，也不阻塞卸载。
 * vh（visit hash）：
 *   sessionStorage 里一份 UUID，关闭标签页即失效 —— 服务端拿它做 UV/新访客
 *   口径；同一浏览器同一会话 = 同一 vh，跨会话即"新访客"。存不下来时（严格
 *   隐私模式）留空，服务端回落到 sha1(ip+ua+日) 兜底。
 * 只上报公开可观察字段，不含任何 PII 与用户输入；服务端 handleTrack 会补
 * ip/ua/geo，前端不参与地理判定。
 * ============================================================ */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ENDPOINT = '/api/ai/track'
const VH_KEY = 'tz_vh'

function uuidV4() {
  if (typeof crypto !== 'undefined') {
    if (crypto.randomUUID) return crypto.randomUUID()
    if (crypto.getRandomValues) {
      const b = crypto.getRandomValues(new Uint8Array(16))
      b[6] = (b[6] & 0x0f) | 0x40
      b[8] = (b[8] & 0x3f) | 0x80
      const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
    }
  }
  // 极老环境兜底：时间戳 + Math.random，仅用于会话去重，非密码学
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getVh() {
  try {
    let v = sessionStorage.getItem(VH_KEY)
    if (!v) {
      v = uuidV4()
      sessionStorage.setItem(VH_KEY, v)
    }
    return v
  } catch {
    return ''
  }
}

function buildPayload(path) {
  const vh = getVh()
  let tz = ''
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { /* noop */ }
  const scr = (typeof window !== 'undefined' && window.screen)
    ? `${window.screen.width}x${window.screen.height}x${Math.round((window.devicePixelRatio || 1) * 100) / 100}`
    : ''
  return {
    path: path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    title: typeof document !== 'undefined' ? document.title : '',
    ref: typeof document !== 'undefined' ? document.referrer : '',
    tz,
    lang: typeof navigator !== 'undefined' ? (navigator.language || '') : '',
    screen: scr,
    vh,
  }
}

function fire(payload) {
  // iframe / 预览模式下不拉埋点：后台内容编辑右侧的预览 iframe 同域开 /
  // 会重新跑一遍 useTracker，不短路就会把“管理员自己反复看预览”当成
  // 真实PV计进访问统计，污染概览与地图。两道锁：
  //   1. window.top 不同 ⇒ iframe 内；
  //   2. <html data-admin-preview="1"> ⇒ main.jsx 已给预览模式挨上标记。
  try {
    if (typeof window !== 'undefined' && window.top !== window.self) return
    if (typeof document !== 'undefined' && document.documentElement?.dataset?.adminPreview === '1') return
  } catch { /* 跨域 window.top 报错，宁可不上报 */ return }
  const body = JSON.stringify(payload)
  // sendBeacon：Safari 老版本要求 Blob；其它 UA 用 Blob 也无损
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' })
      const ok = navigator.sendBeacon(ENDPOINT, blob)
      if (ok) return
    } catch { /* fallthrough */ }
  }
  // fetch keepalive 兜底：卸载时浏览器仍会尽量把请求带完
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit',
      mode: 'same-origin',
    }).catch(() => { /* 埋点失败静默 */ })
  } catch { /* noop */ }
}

/* 与 ScrollToTop / BootHandoff 一样：只挂一个 null-returning 组件，
   通过 useLocation 观察 pathname+hash 变化；hash 变化不算新 PV。 */
export default function useTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    // 首屏 title 可能在 mount 之后才被 React 页里的 useEffect 写定；
    // 延后一帧让 document.title 稳定，再打点。
    const id = requestAnimationFrame(() => fire(buildPayload(pathname)))
    return () => cancelAnimationFrame(id)
  }, [pathname])
}
