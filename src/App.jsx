import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'
import { ContentProvider } from './lib/contentStore'
import { markHeroReady } from './components/three/hero/buildBus'
import { useLenis, scrollToTop, scrollToId } from './hooks/useLenis'

/* ―― 内页按路由懒加载 ――
   原来这里静态 import 了 Solutions/Technology/Laboratories/Cases/About 五个页，
   它们又各自拖进一批 section 组件 —— 首访落地页的访客根本不会打开这些路由，
   却要为此下载并解析整棵内页树（入口 chunk 实测 1,289 KB 未压缩）。
   改成 lazy 后每个内页单独成块，只在真正导航过去时才取；首页保持静态 import，
   落地页零额外往返。（Navbar/Footer 仍静态：它们是全站骨架，不该闪。 ） */
const Solutions = lazy(() => import('./pages/Solutions'))
const Technology = lazy(() => import('./pages/Technology'))
const Laboratories = lazy(() => import('./pages/Laboratories'))
const Cases = lazy(() => import('./pages/Cases'))
const About = lazy(() => import('./pages/About'))

/* 管理后台整棵子树懒加载：/admin 才拉自己的块，不进营销首屏的 entry chunk。
   它自带登录守卫与独立外壳，不套营销 Navbar/Footer。 */
const AdminRoot = lazy(() => import('./admin/AdminRoot'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      /* 交给 scrollToId：它等得到那些延后一轮才挂的屏（见 pages/Home.jsx）。
         原来这里是一发 120ms 定时 + getElementById，拿不到就什么都不发生 ——
         带着锚点进来（首屏上那两个 CTA 按钮就是 /#contact、/#advisor）会静默停在顶部 */
      scrollToId(hash.slice(1))
      return
    }
    scrollToTop()
  }, [pathname, hash])
  return null
}

/* 内页没有具身布景要等：React 一挂上就把启动角标交棒掉。
   不接这一刀，/solutions 这类页面只能等 main.jsx 那条 6.5s 兜底定时器，
   角标会一直赖在首屏下方（实拍里看得见）。 */
function BootHandoff() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname === '/') return
    const r = requestAnimationFrame(() => markHeroReady('inner'))
    return () => cancelAnimationFrame(r)
  }, [pathname])
  return null
}

/* 内页 chunk 尚未到位时的占位：与全站骨架同色、居中一枚呼吸点，
   高度先撑住 min-h 以免页脚跳。减弱动效下降级为静点。 */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-mist-100" role="status" aria-live="polite">
      <span className="flex items-center gap-3 text-sm text-ink-400">
        <span className="h-2.5 w-2.5 animate-pingslow rounded-full bg-brand motion-reduce:animate-none" />
        页面加载中…
      </span>
    </div>
  )
}

/* 营销站点壳：全站头尾 + 路由 */
function SiteShell() {
  return (
    <div className="flex min-h-screen flex-col bg-mist-100">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/technology" element={<Technology />} />
            <Route path="/laboratories" element={<Laboratories />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/about" element={<About />} />
            {/* 兜底路由保留：导航里万一又少接一个页，Placeholder 会直接
                把路径显示出来（见 pages/Placeholder.jsx），比白屏好查 */}
            <Route path="*" element={<Placeholder />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

/* 按路径分流：/admin* 走独立后台壳（不套营销头尾），其余走站点壳 */
function AppShell() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <AdminRoot />
      </Suspense>
    )
  }
  return <SiteShell />
}

export default function App() {
  useLenis()
  return (
    <ContentProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <BootHandoff />
        <AppShell />
      </BrowserRouter>
    </ContentProvider>
  )
}
