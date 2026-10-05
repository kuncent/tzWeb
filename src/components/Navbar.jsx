import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Menu, X, Search, Compass } from 'lucide-react'
import { scrollToId } from '../hooks/useLenis'
import SiteSearch from './SiteSearch'
import { BrandLockup } from './Brand'
import { nav, navCta, anchorSections } from '../data/site'
import { useSectionsMap } from '../lib/contentStore'

/* 产品矩阵为 sticky 钉屏整屏，落点需恰好对齐页眉下方；其余区块留 120px 余量 */
const ANCHOR_OFFSET = { matrix: -64 }

/* 这些页的第一屏是暗底 PageHero（与首页首屏同一底色）。顶栏在
   页首要保持透明 + 浅色字，否则深色 logo 压在暗底上读不出来。 */
const DARK_HERO_PATHS = new Set(['/solutions', '/technology', '/laboratories', '/cases', '/about'])

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(false)
  const [mode, setMode] = useState('page') // page：站内页面链接；sections：首页板块链接
  const [active, setActive] = useState(anchorSections[0].id)
  const location = useLocation()
  const onHome = location.pathname === '/'

  /* 后台关掉某屏时，顶栏「板块」导航与滚动高亮同步隐去它（只列启用项）。 */
  const sections = useSectionsMap()
  const visible = anchorSections.filter((s) => sections[s.id]?.enabled !== false)
  const visibleKey = visible.map((s) => s.id).join(',')

  useEffect(() => {
    /* 首屏（StoryHero）是整屏暗底且被 sticky 钉住：只按 scrollY > 24 判定的话，
       镜屏三切期间顶栏会变成白底压在暗画面上。所以“实底”的界线 = 真的离开首屏：
       桌面端 = 钉屏行程走完（outer 高 - 一屏）；移动端首屏整段都是暗的，到底才算。 */
    let limit = 24
    const measure = () => {
      if (!onHome) {
        limit = 24
        return
      }
      const el = document.getElementById('hero')
      if (!el) {
        limit = 24
        return
      }
      limit = window.innerWidth >= 1024
        ? Math.max(120, el.offsetHeight - window.innerHeight - 8)
        : Math.max(120, el.offsetHeight - 64)
    }
    const onScroll = () => setScrolled(window.scrollY > limit)
    const onResize = () => {
      measure()
      onScroll()
    }
    measure()
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [onHome])

  useEffect(() => setOpen(false), [location.pathname])

  /* ⌘K / Ctrl+K 拉起搜索；Esc 交给面板自己处理 */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* 滚过首个板块后，顶栏自动接管板块导航（原第二条导航已合并进来）。
     坑：首屏之下的板块现在延后一轮才挂载（见 pages/Home.jsx），effect 跑的时候
     #problems 常常还不存在，一次性 measure 会拿到 MAX → 之后只有 resize 才重测量，
     于是“板块模式偶尔出不来”。改成：元素没出现前，每次滚动惰性补测一次。 */
  useEffect(() => {
    if (!onHome) {
      setMode('page')
      return
    }
    const measure = () => {
      const el = document.getElementById((visible[0] || anchorSections[0]).id)
      return el ? window.scrollY + el.getBoundingClientRect().top - 72 : null
    }
    let from = measure()
    const threshold = () => (from == null ? (from = measure()) : from) ?? Number.MAX_SAFE_INTEGER
    const onScroll = () => setMode(window.scrollY > threshold() ? 'sections' : 'page')
    const onResize = () => {
      from = measure()
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [onHome, visibleKey])

  useEffect(() => {
    if (mode !== 'sections') return
    const els = visible.map((s) => document.getElementById(s.id)).filter(Boolean)
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) if (en.isIntersecting) setActive(en.target.id)
      },
      { rootMargin: '-35% 0px -55% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [mode, visibleKey])

  const goSection = (id) => {
    setActive(id)
    setOpen(false)
    /* 不在这里自拼 getElementById + lenis：首屏之下那几屏现在延后一轮才挂
       （见 pages/Home.jsx），那一瞬元素还不存在。scrollToId 里带了轮询，
       而且只有它一处知道「拿到了才能飞」 */
    scrollToId(id, ANCHOR_OFFSET[id] ?? -120)
  }

  const solid = scrolled || open
  /* 新版首屏是深夜蓝整屏暗底，首屏内顶栏保持透明 + 浅色字；
     真正滚过首屏（或抽屉展开、进了其它白底页）才转成白底深色字。 */
  const light = !solid && (onHome || DARK_HERO_PATHS.has(location.pathname))

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid ? 'border-b border-ink-900/[0.06] bg-white/80 shadow-soft backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="container-x flex h-[64px] items-center justify-between">
        <BrandLockup tone={light ? 'dark' : 'light'} />

        {/* center nav：首屏内为页面导航，滚过首屏后自动切为板块导航 */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
          {mode === 'sections' ? (
            <div className="no-scrollbar flex min-w-0 items-center gap-0.5 overflow-x-auto">
              <span className="mr-1.5 flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                <Compass className="h-3.5 w-3.5" />
                板块
              </span>
              {visible.map((s) => {
                const isActive = active === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => goSection(s.id)}
                    className={`relative shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-ink-500 hover:text-ink-900'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-anchor-active"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-ink-900"
                      />
                    )}
                    <span className="relative z-10 whitespace-nowrap">{s.label}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                      isActive
                        ? light ? 'text-white' : 'text-ink-900'
                        : light
                          ? 'text-white/65 hover:text-white'
                          : 'text-ink-500 hover:text-ink-900'
                    }`
                  }
                >
                  {item.label}
                  {location.pathname === item.to && (
                    <span className={`absolute inset-x-4 -bottom-0.5 h-[2px] rounded-sm ${light ? 'bg-white' : 'bg-ink-900'}`} />
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            type="button"
            onClick={() => setSearch(true)}
            aria-label="站内搜索"
            title="站内搜索（Ctrl / ⌘ + K）"
            className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
              light ? 'text-white/65 hover:bg-white/10 hover:text-white' : 'text-ink-500 hover:bg-ink-900/[0.05] hover:text-ink-900'
            }`}
          >
            <Search className="h-[17px] w-[17px]" />
          </button>
          <Link
            to={navCta.to}
            className={`rounded-full px-5 py-2.5 text-[13px] font-medium transition-all ${
              light ? 'bg-white text-ink-900 hover:shadow-glow' : 'bg-ink-900 text-white hover:shadow-lift'
            }`}
          >
            {navCta.label}
          </Link>
        </div>

        <button
          className={`grid h-10 w-10 place-items-center rounded-full lg:hidden ${light ? 'text-white' : 'text-ink-900'}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-ink-900/[0.06] bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container-x flex flex-col gap-1 py-4">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setSearch(true)
                }}
                className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-[14px] font-medium text-ink-500 hover:bg-mist"
              >
                <Search className="h-4 w-4" />
                站内搜索
              </button>
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="rounded-xl px-4 py-3 text-[15px] font-medium text-ink-700 hover:bg-mist"
                >
                  {item.label}
                </NavLink>
              ))}
              <Link to={navCta.to} className="mt-2 rounded-full bg-ink-900 px-5 py-3 text-center text-sm font-medium text-white">
                {navCta.label}
              </Link>
              {onHome && (
                <div className="mt-4 border-t border-ink-900/[0.06] pt-3">
                  <p className="flex items-center gap-1.5 px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                    <Compass className="h-3.5 w-3.5" />
                    页面板块
                  </p>
                  <div className="flex flex-wrap gap-1 px-2">
                    {visible.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => goSection(s.id)}
                        className={`rounded-full px-3.5 py-2 text-[13px] transition-colors ${
                          active === s.id ? 'bg-ink-900 text-white' : 'bg-mist text-ink-700 hover:bg-mist-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <SiteSearch open={search} onClose={() => setSearch(false)} />
    </header>
  )
}
