import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Menu, X, Search, Compass, ChevronDown, ArrowRight } from 'lucide-react'
import { scrollToId, scrollToTop } from '../hooks/useLenis'
import SiteSearch from './SiteSearch'
import { BrandLockup } from './Brand'
import { nav, navCta, anchorSections, productMatrix } from '../data/site'
import { solutionPlans } from '../data/pages'
import { requestMatrixIndex } from '../lib/matrixNav'
import { useSectionsMap } from '../lib/contentStore'

/* 顶栏高 64px：板块锚点一律让区块顶边紧贴导航栏下沿（offset = -64），
   不再留 120px 余量 —— 那 56px 缝会露出上一屏的尾巴，看着“没卡到边界”。
   matrix（sticky 钉屏整屏）本就是 -64，现与默认一致，无需再特判。 */
const HEADER_OFFSET = -64

/* 这些页的第一屏是暗底 PageHero（与首页首屏同一底色）。顶栏在
   页首要保持透明 + 浅色字，否则深色 logo 压在暗底上读不出来。 */
const DARK_HERO_PATHS = new Set(['/solutions', '/products', '/devices', '/about'])

/* 「智云平台」是外链：新标签打开外部登录页，不占用站内路由。 */
const CLOUD_URL = 'https://zycloud.sztzjy.com/Login'

/* 顶栏悬停下拉：解决方案 / 产品体系 两项带二级菜单。
   方案项走站内锁点（/solutions#plan-<id>，App 的 ScrollToTop 会滚过去）；
   产品项走 matrixNav 总线（滚到矩阵并切到该产品）。
   行内只留 icon + 标题 + 序号：英文副行（EMBODIED ROBOT LAB 那一类）干脆不挂 ——
   菜单是导航不是介绍页，多一行后缀只会把每行撑高、把卡片拖长。 */
const FLYOUTS = {
  '/solutions': {
    head: '五大解决方案',
    en: 'SOLUTIONS',
    all: { label: '全部解决方案', to: '/solutions' },
    items: solutionPlans.map((p) => ({ label: p.short, icon: p.icon, to: `/solutions#plan-${p.id}` })),
  },
  '/products': {
    head: '五大产品体系',
    en: 'PRODUCT MATRIX',
    all: { label: '进入产品矩阵', to: '/products' },
    items: productMatrix.map((p, i) => ({ label: p.title, icon: p.icon, index: i })),
  },
}

const pad2 = (i) => String(i + 1).padStart(2, '0')

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(false)
  const [mode, setMode] = useState('page') // page：站内页面链接；sections：首页板块链接
  const [active, setActive] = useState(anchorSections[0].id)
  const location = useLocation()
  const navigate = useNavigate()
  const [openFly, setOpenFly] = useState(null) // 顶栏悬停下拉当前打开的导航项 to
  const [openSub, setOpenSub] = useState(null) // 移动抽屉里展开的二级菜单导航项 to
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
    scrollToId(id, HEADER_OFFSET)
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
      {/* 三段网格：两侧 1fr、中间 auto —— 导航因此是真正对齐页面中心，
          而不是“在剩下的空里居中”（左 160 右 240 时它会往左偏一大截）。
          移动端汉堡按钮归到右格，保证子元素始织是三列。 */}
      <div className="container-x grid h-[64px] grid-cols-[1fr_auto_1fr] items-center gap-4">
        <BrandLockup tone={light ? 'dark' : 'light'} className="justify-self-start" />

        {/* center nav：首屏内为页面导航，滚过首屏后自动切为板块导航 */}
        <nav className="hidden min-w-0 justify-self-center lg:flex">
          {mode === 'sections' ? (
            <div className="no-scrollbar flex min-w-0 items-center gap-0.5 overflow-x-auto">
              <span className="mr-1.5 flex shrink-0 items-center gap-1 text-micro font-semibold uppercase tracking-label text-ink-400">
                <Compass className="h-3.5 w-3.5" />
                板块
              </span>
              {/* 板块模式会整体隐去页面导航（含「首页」），这里补一个回到顶部的入口；
                 不进 anchorSections，避免污染滚动高亮 IO 与板块模式接管的触发阈值。 */}
              <button
                onClick={() => {
                  setOpen(false)
                  scrollToTop()
                }}
                className="relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-ui-sm font-medium text-ink-500 transition-colors hover:bg-ink-900/[0.05] hover:text-ink-900"
              >
                <span className="relative z-10">首页</span>
              </button>
              {visible.map((s) => {
                const isActive = active === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => goSection(s.id)}
                    className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-ui-sm font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-ink-500 hover:bg-ink-900/[0.05] hover:text-ink-900'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-anchor-active"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-ink-900"
                      />
                    )}
                    <span className="relative z-10">{s.label}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            /* 不折行靠 shrink-0 + whitespace-nowrap，而不是靠 overflow-x-auto：
               滚动容器会把 overflow-y 的 visible 一并算成 auto（CSS 规定：一个轴
               不是 visible，另一个轴的 visible 也失效），而下拉面板就挂在这个行里 ——
               实测（tmp/nav-probe.mjs）那样二级菜单只在 DOM 里有布局、根本不绘制。
               中间列是 auto、两侧是 1fr：真放不下时让网格去挤两侧，导航本身保持完整。 */
            <div className="flex min-w-0 items-center justify-center gap-0.5 xl:gap-1">
              {nav.map((item) => {
                const fl = FLYOUTS[item.to]
                const link = (
                  <NavLink
                    to={item.to}
                    end
                    className={({ isActive }) =>
                      `relative shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-ui-sm font-medium transition-colors xl:px-4 ${
                        isActive
                          ? 'text-white'
                          : light
                            ? 'text-white/60 hover:bg-white/[0.08] hover:text-white'
                            : 'text-ink-500 hover:bg-ink-900/[0.05] hover:text-ink-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* 选中态交给胶囊（与板块模式同一套语言），不再用那条 2px 下划线：
                            下划线只标当前页、悬停乻么反馈都没有，整排看着像没做完 */}
                        {isActive && (
                          <motion.span
                            layoutId="nav-page-active"
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            className={`absolute inset-0 rounded-full ${light ? 'bg-white/[0.18]' : 'bg-ink-900'}`}
                          />
                        )}
                        <span className="relative z-10">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                )
                /* 无二级菜单的项：原样渲染 */
                if (!fl) return <span key={item.to} className="contents">{link}</span>
                /* 带下拉的项：悬停（或键盘聚焦）展开二级卡片。
                   wrapper 必须是 flex，不能是裸 block：里面的 <a> 默认 inline，
                   inline 盒的高度按 font-size 的 em box 算（不吃 line-height），
                   还会在父行盒里跟 strut 做基线对齐 —— 实测（tmp/nav-baseline.mjs）
                   这两项盒高 31、文本 top 26.0，而其它直接做 flex item 的项是
                   35.4 / 24.3，整排字就差那 1.7px，看着像没对齐。
                   改成 flex 后 <a> 重新变回 flex item，跟旁边同一套行盒。 */
                return (
                  <div
                    key={item.to}
                    className="relative flex"
                    onMouseEnter={() => setOpenFly(item.to)}
                    onMouseLeave={() => setOpenFly((v) => (v === item.to ? null : v))}
                    onFocus={() => setOpenFly(item.to)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setOpenFly(null)
                    }}
                  >
                    {link}
                    <AnimatePresence>
                      {openFly === item.to && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.985 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute left-1/2 top-full z-50 origin-top -translate-x-1/2 pt-2.5"
                        >
                          {/* 宽度由内容定（w-max）+ 行内 whitespace-nowrap：
                              旧的固定 240px 会把“数字经济·大数据与 AI 实训体系”这类长标题
                              折成两行，第五行只剩一个孤字 —— 下拉菜单最丑的一种坏形。 */}
                          <div className="w-max max-w-[calc(100vw_-_40px)] overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-lift">
                            <div className="flex items-baseline justify-between gap-5 border-b border-ink-900/[0.05] bg-mist-100 px-4 py-2.5">
                              <span className="text-micro font-semibold uppercase tracking-label text-ink-500">{fl.head}</span>
                              <span className="font-mono text-micro uppercase tracking-[0.14em] text-ink-300">{fl.en}</span>
                            </div>
                            <div className="p-1.5">
                              {fl.items.map((c, ci) => {
                                const Icon = c.icon
                                return (
                                  <button
                                    key={ci}
                                    type="button"
                                    onClick={() => {
                                      setOpenFly(null)
                                      if (c.to) {
                                        navigate(c.to)
                                      } else {
                                        requestMatrixIndex(c.index)
                                        navigate('/products')
                                      }
                                    }}
                                    className="group/fo flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-mist-100"
                                  >
                                    {Icon && (
                                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ink-900/[0.06] bg-mist-100 text-ink-500 transition-colors duration-200 group-hover/fo:border-brand/25 group-hover/fo:bg-brand/10 group-hover/fo:text-brand">
                                        <Icon className="h-4 w-4" strokeWidth={2} />
                                      </span>
                                    )}
                                    {/* 一项一行，不挂英文副行：后缀已去掉，这里连条件分支也不留，
                                        免得留一段永远不会渲染的死 JSX */}
                                    <span className="min-w-0 flex-1 whitespace-nowrap text-ui font-medium text-ink-700 transition-colors group-hover/fo:text-ink-900">
                                      {c.label}
                                    </span>
                                    <span className="shrink-0 font-mono text-micro tabular-nums text-ink-300 transition-colors group-hover/fo:text-brand">{pad2(ci)}</span>
                                  </button>
                                )
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenFly(null)
                                navigate(fl.all.to)
                              }}
                              className="group flex w-full items-center justify-between gap-6 border-t border-ink-900/[0.05] px-4 py-2.5 text-left text-ui-sm font-medium text-ink-500 transition-colors hover:bg-mist-100 hover:text-ink-900"
                            >
                              {fl.all.label}
                              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </nav>

        {/* 右格：桌面动作区 + 移动端汉堡共用一个单元格，保证上面是干净的三列网格 */}
        <div className="flex items-center justify-end gap-2 xl:gap-3">
          <div className="hidden items-center gap-2.5 lg:flex">
            <a
              href={CLOUD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden whitespace-nowrap rounded-full px-4 py-2 text-ui-sm font-medium transition-colors xl:inline-flex ${
                light ? 'text-white/60 hover:bg-white/[0.08] hover:text-white' : 'text-ink-500 hover:bg-ink-900/[0.05] hover:text-ink-900'
              }`}
            >
              智云平台
            </a>
            <button
              type="button"
              onClick={() => setSearch(true)}
              aria-label="站内搜索"
              title="站内搜索（Ctrl / ⌘ + K）"
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
                light ? 'text-white/65 hover:bg-white/10 hover:text-white' : 'text-ink-500 hover:bg-ink-900/[0.05] hover:text-ink-900'
              }`}
            >
              <Search className="h-[17px] w-[17px]" />
            </button>
            <Link
              to={navCta.to}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-ui-sm font-medium transition-all xl:px-5 xl:py-2.5 ${
                light
                  ? 'bg-white text-ink-900 hover:shadow-glow'
                  : 'bg-ink-900 text-white hover:bg-ink-800 hover:shadow-lift'
              }`}
            >
              {navCta.label}
            </Link>
          </div>

          <button
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full lg:hidden ${light ? 'text-white' : 'text-ink-900'}`}
            onClick={() => setOpen((v) => !v)}
            aria-label="menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
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
                className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-ui font-medium text-ink-500 hover:bg-mist"
              >
                <Search className="h-4 w-4" />
                站内搜索
              </button>
              <a
                href={CLOUD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-ui font-medium text-ink-500 hover:bg-mist"
              >
                <Compass className="h-4 w-4" />
                智云平台
              </a>
              {nav.map((item) => {
                const fl = FLYOUTS[item.to]
                if (!fl) {
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="rounded-xl px-4 py-3 text-ui-lg font-medium text-ink-700 hover:bg-mist"
                    >
                      {item.label}
                    </NavLink>
                  )
                }
                const expanded = openSub === item.to
                return (
                  <div key={item.to}>
                    <div className="flex items-center justify-between rounded-xl hover:bg-mist">
                      <NavLink
                        to={item.to}
                        className="flex-1 rounded-xl px-4 py-3 text-ui-lg font-medium text-ink-700"
                      >
                        {item.label}
                      </NavLink>
                      <button
                        type="button"
                        aria-label={`展开${item.label}子菜单`}
                        onClick={() => setOpenSub((v) => (v === item.to ? null : item.to))}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-500"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-0.5 py-1 pl-4">
                            {fl.items.map((c, ci) => (
                              <button
                                key={ci}
                                type="button"
                                onClick={() => {
                                  setOpen(false)
                                  setOpenSub(null)
                                  if (c.to) {
                                    navigate(c.to)
                                  } else {
                                    requestMatrixIndex(c.index)
                                    navigate('/products')
                                  }
                                }}
                                className="rounded-lg px-4 py-2.5 text-left text-ui font-medium text-ink-500 hover:bg-mist hover:text-ink-900"
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
              <Link to={navCta.to} className="mt-2 rounded-full bg-ink-900 px-5 py-3 text-center text-sm font-medium text-white">
                {navCta.label}
              </Link>
              {onHome && (
                <div className="mt-4 border-t border-ink-900/[0.06] pt-3">
                  <p className="flex items-center gap-1.5 px-4 pb-1 text-caption font-semibold uppercase tracking-label text-ink-400">
                    <Compass className="h-3.5 w-3.5" />
                    页面板块
                  </p>
                  <div className="flex flex-wrap gap-1 px-2">
                    {visible.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => goSection(s.id)}
                        className={`rounded-full px-3.5 py-2 text-ui-sm transition-colors ${
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
