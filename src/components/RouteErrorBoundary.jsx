import { Component } from 'react'
import { Link, useLocation } from 'react-router-dom'

/* ============================================================
 * 路由级错误边界 —— 修「点某个内页就黑屏」
 * ------------------------------------------------------------
 * 根因：index.html 为 3D 首屏把 <html> 底色钉成近黑 #06080d（body/root 才是亮色），
 * 而内页全是 React.lazy 动态块。一旦某个内页 chunk 取不到（dev 里 Vite 重新预打包
 * 换了 hash、prod 里重新部署后旧标签页还指向失效 chunk），或页面渲染抛错，整棵
 * React 树会卸载、#root 变空 → 露出 <html> 的黑底 = 一片黑屏，用户只能手动刷新。
 *
 * 这类 chunk 取不到不是代码 bug，刷一次拿新 chunk 就好：所以命中「动态导入失败」
 * 时自动整页重载一次（用时间戳挡住重载循环，10s 内不重复触发）。其余渲染错误则
 * 兜一个亮色、可自救的失败页（刷新 / 回首页），绝不再把人留在黑底上。
 *
 * 用 pathname 作 key 包一层：出错停在失败页时，点导航去别的页会换 key 重挂边界，
 * 自动从错误态恢复，不用刷新。
 * ============================================================ */

const RELOAD_TS_KEY = 'route-chunk-reload-ts'

function isChunkLoadError(err) {
  const msg = String((err && (err.message || err)) || '')
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk \S+ failed/i.test(msg)
}

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    if (!isChunkLoadError(error)) return
    try {
      const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) || 0)
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()))
        window.location.reload()
      }
    } catch {
      /* sessionStorage 不可用（隐私模式等）：跳过自动重载，落到失败页 */
    }
  }
  render() {
    if (this.state.error) return <RouteFailure />
    return this.props.children
  }
}

function RouteFailure() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-mist-100 px-6 py-24">
      <div className="w-full max-w-md rounded-2xl border border-ink-900/[0.07] bg-white p-8 text-center shadow-card">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 3.5 21 19H3l9-15.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M12 10v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
          </svg>
        </span>
        <h1 className="mt-5 text-[18px] font-semibold tracking-tight text-ink-900">这一页没能加载出来</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
          多半是页面资源在更新，刷新一下就好；也可以先回首页，再从导航进来。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-600"
          >
            刷新重试
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-ink-900/[0.1] px-5 py-2.5 text-[13.5px] font-medium text-ink-700 transition-colors hover:border-brand/40 hover:text-ink-900"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}

/* 对外出口：按路由换 key，导航即从错误态自愈 */
export default function RoutedContent({ children }) {
  const { pathname } = useLocation()
  return <RouteErrorBoundary key={pathname}>{children}</RouteErrorBoundary>
}
