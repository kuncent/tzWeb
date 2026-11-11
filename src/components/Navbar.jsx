import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Menu, X, Search, Compass, ChevronDown, ArrowRight, Sparkles } from 'lucide-react'
import SiteSearch from './SiteSearch'
import { BrandLockup } from './Brand'
import { nav, navCta, productMatrix } from '../data/site'
import { solutionPlans } from '../data/pages'
import { deviceTypes } from '../data/devices'
import { requestMatrixIndex } from '../lib/matrixNav'

/* 这些页的第一屏是暗底 PageHero（与首页首屏同一底色）。顶栏在
   页首要保持透明 + 浅色字，否则深色 logo 压在暗底上读不出来。 */
const DARK_HERO_PATHS = new Set(['/solutions', '/products', '/devices', '/about'])

/* 这些页整页都是暗底（产品页第一屏是 sticky 钉死的暗色矩阵，其后没有
   浅色内容）：顶栏要一路保持透明 + 浅色字，不能按普通页那样滚一点就翻白底，
   否则浅色 bar 压在暗画面上会很突兀。 */
const DARK_THROUGHOUT_PATHS = new Set(['/products'])

/* 「智云平台」是外链：新标签打开外部登录页，不占用站内路由。 */
const CLOUD_URL = 'https://zycloud.sztzjy.com/Login'

/* 顶栏悬停下拉：解决方案 / 产品体系 两项带二级菜单。
   方案项走站内锁点（/solutions#plan-<id>，App 的 ScrollToTop 会滚过去）；
   产品项走 matrixNav 总线（滚到矩阵并切到该产品）。
   每项 = 线性图标 + 标题 + 一行描述（tagline），两列排布；
   描述过长就单行省略 —— 下拉是导航，不承担介绍页的信息量。 */
const FLYOUTS = {
  '/solutions': {
    head: '解决方案',
    en: 'SOLUTIONS',
    all: { label: '全部解决方案', desc: '查看完整方案与交付清单', to: '/solutions' },
    items: solutionPlans.map((p) => ({ label: p.short, icon: p.icon, to: `/solutions#plan-${p.id}`, desc: p.tagline })),
  },
  '/products': {
    head: '产品体系',
    en: 'PRODUCT MATRIX',
    all: { label: '进入产品矩阵', desc: '按实验室类型浏览产品体系', to: '/products' },
    items: productMatrix.map((p, i) => ({ label: p.title, icon: p.icon, index: i, desc: p.tagline })),
  },
  /* 教学设备：把设备页页内的子导航（智能装备 + 7 类设备）提取到顶栏悬停下拉。
     每项走锁点 /devices#<id>（与解决方案同一套：App 的 ScrollToTop 会 scrollToId 滚过去）。 */
  '/devices': {
    head: '教学设备分类',
    en: 'TEACHING EQUIPMENT',
    all: { label: '浏览全部设备', desc: '按设备类型查看可交付教学装备与参数', to: '/devices' },
    items: [
      { label: '智能装备', icon: Sparkles, to: '/devices#smart', desc: '具身机器人六类成套实机' },
      ...deviceTypes.map((t) => ({ label: t.zh, icon: t.icon, to: `/devices#${t.id}`, desc: t.note })),
    ],
  },
}

const pad2 = (i) => String(i + 1).padStart(2, '0')

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [openFly, setOpenFly] = useState(null) // 顶栏悬停下拉当前打开的导航项 to
  const [openSub, setOpenSub] = useState(null) // 移动抽屉里展开的二级菜单导航项 to
  const flyTimers = useRef({ open: 0, close: 0 }) // 悬停意图的开关定时器
  const flyPanelRef = useRef(null) // 当前展开面板，键盘方向键在它内部找可聚焦项
  const flyAnchorRef = useRef(null) // 触发项，用来算面板的左对齐 / 屏幕边缘收边
  const suppressFocusOpen = useRef(false) // Esc 把焦点还给触发项时，别让 onFocus 又把面板弹开
  const [flyLeft, setFlyLeft] = useState(0) // 面板相对触发项的 left（px）
  const onHome = location.pathname === '/'
  const navRef = useRef(null)
  /* 选中项背景胶囊位置（measurePill 量出）；null = 不显 */
  const [pillBox, setPillBox] = useState(null)

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

  useEffect(() => {
    setOpen(false)
    /* 路由变了就收起下拉：点触发项本身会直接跳页，别让面板留在新页面上 */
    window.clearTimeout(flyTimers.current.open)
    window.clearTimeout(flyTimers.current.close)
    setOpenFly(null)
  }, [location.pathname])

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

  const solid = (scrolled && !DARK_THROUGHOUT_PATHS.has(location.pathname)) || open
  /* 整页暗底页（/products）：滚过首屏后不翻白、也不留纯透明，
     而是一条与矩阵同色的暗玻璃实底 bar —— 既避免浅色 bar 压在暗画面上突兀，
     又让顶栏在滚动态有明确边界，不再“透明得看不出有导航栏”。 */
  const solidDark = DARK_THROUGHOUT_PATHS.has(location.pathname) && scrolled && !open
  /* 新版首屏是深夜蓝整屏暗底，首屏内顶栏保持透明 + 浅色字；
     真正滚过首屏（或抽屉展开、进了其它白底页）才转成白底深色字。 */
  const light = !solid && (onHome || DARK_HERO_PATHS.has(location.pathname))

  /* 选中项背景胶囊：改用单例、自主沿 X 平移，不再用 framer 跨节点共享布局（layoutId）。
     共享布局在「页面已滚动」时的路由切换里，会把 fixed 头部里的锁点连同当时 scrollY
     一起算进位移，新页胶囊于是从刚才的滚动位置“从下面飞上来”。这里自己用视口 rect 相减：
     头部 fixed，rect 与 scrollY 无关，量出的 x 只剩水平差 → 永远只沿 X 平移。 */
  const measurePill = () => {
    const box = navRef.current
    if (!box) { setPillBox(null); return }
    const el = box.querySelector('a[aria-current="page"]')
    if (!el) { setPillBox(null); return }
    const br = box.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    setPillBox({ x: er.left - br.left, y: er.top - br.top, w: er.width, h: er.height })
  }
  useLayoutEffect(() => { measurePill() }, [location.pathname, light, openFly])
  useEffect(() => {
    measurePill()
    window.addEventListener('resize', measurePill)
    return () => window.removeEventListener('resize', measurePill)
  }, [location.pathname, light, openFly])

  /* ―― 悬停下拉的开关策略 ――
     进入 100ms 才开：鼠标只是扫过导航时不会一路弹面板；
     离开 180ms 才关：从触发项斜穿到面板、或临时扫到相邻项，不会「闪开又闪回」。
     键盘聚焦 / Esc / 方向键走立即开关，不吃这段延迟。 */
  const clearFlyTimers = () => {
    window.clearTimeout(flyTimers.current.open)
    window.clearTimeout(flyTimers.current.close)
  }
  const openFlyNow = (to, el) => {
    clearFlyTimers()
    if (el) flyAnchorRef.current = el
    setOpenFly(to)
  }
  const closeFlyNow = () => {
    clearFlyTimers()
    setOpenFly(null)
  }
  const hoverFly = (to, el) => {
    clearFlyTimers()
    if (el) flyAnchorRef.current = el
    flyTimers.current.open = window.setTimeout(() => setOpenFly(to), 100)
  }
  const leaveFly = (to) => {
    clearFlyTimers()
    flyTimers.current.close = window.setTimeout(() => setOpenFly((v) => (v === to ? null : v)), 180)
  }

  useEffect(() => clearFlyTimers, [])

  /* 面板默认与触发项左对齐；靠右的项会把面板顶出视口时整体回收，
     左右至少留 16px。窗口尺寸变化时重算，不靠猜。 */
  useLayoutEffect(() => {
    if (!openFly || !flyAnchorRef.current) return
    const place = () => {
      const r = flyAnchorRef.current.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const w = Math.min(600, vw - 32)
      setFlyLeft(Math.min(Math.max(r.left, 16), vw - w - 16) - r.left)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [openFly])

  /* 点击外部关闭：键盘打开或触控点击后，鼠标不在 wrapper 上，mouseleave 不会兜底 */
  useEffect(() => {
    if (!openFly) return
    const onDoc = (e) => {
      if (!e.target.closest('[data-flyout]')) setOpenFly(null)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [openFly])

  /* 键盘：↓/↑ 在面板内循环移动焦点，Esc 收起并把焦点还给触发项，Enter 交给焦点元素自身 */
  const onFlyKeyDown = (e, to) => {
    if (e.key === 'Escape') {
      if (openFly !== to) return
      e.stopPropagation()
      closeFlyNow()
      /* 焦点还给触发项；这一步会触发 wrapper 的 onFocus，先压住，别把面板又弹开 */
      suppressFocusOpen.current = true
      e.currentTarget.querySelector('a')?.focus()
      window.setTimeout(() => {
        suppressFocusOpen.current = false
      }, 0)
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    if (openFly !== to || !flyPanelRef.current) return
    const items = Array.from(flyPanelRef.current.querySelectorAll('button'))
    if (!items.length) return
    e.preventDefault()
    const at = items.indexOf(document.activeElement)
    const dir = e.key === 'ArrowDown' ? 1 : -1
    if (at === -1) {
      items[dir === 1 ? 0 : items.length - 1].focus()
    } else {
      items[(at + dir + items.length) % items.length].focus()
    }
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid
          ? 'border-b border-ink-900/[0.06] bg-white/80 shadow-soft backdrop-blur-xl'
          : solidDark
            ? 'border-b border-white/[0.07] bg-night/85 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl'
            : 'bg-transparent'
      }`}
    >
      {/* 左右两端对齐内容栅格：左 = logo + 紧接其后的一级导航组（成组左对齐、间距均匀），
          右 = 末端的主 CTA 与辅助入口；中间空白交给 ml-auto，不把导航推到右侧。
          窄屏（<lg）导航与辅助入口整体收起，只留汉堡。 */}
      <div className="container-x flex h-[64px] items-center gap-6 xl:gap-8">
        <BrandLockup tone={light ? 'dark' : 'light'} domains className="shrink-0" />

        {/* 一级导航：紧跟 logo 左侧成组，不折行靠 shrink-0 + whitespace-nowrap，
            而不是 overflow-x-auto —— 滚动容器会把下拉面板一起裁掉
            （实测 tmp/nav-probe.mjs，二级菜单只布局不绘制）。 */}
        <nav className="hidden min-w-0 lg:flex">
          <div ref={navRef} className="relative flex min-w-0 items-center gap-0.5 xl:gap-1.5">
              {/* 选中项背景：单例胶囊，自主沿 X 平移（见 measurePill）。放在 map 之前，
                  后续 NavLink 均为 relative，自然浮在它上面；pointer-events-none 不挡点击 */}
              {pillBox && (
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={{ x: pillBox.x, y: pillBox.y, width: pillBox.w, height: pillBox.h }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className={`pointer-events-none absolute left-0 top-0 rounded-full ${light ? 'bg-white/[0.18]' : 'bg-ink-900'}`}
                />
              )}
              {nav.map((item) => {
                const fl = FLYOUTS[item.to]
                const link = (
                  <NavLink
                    to={item.to}
                    end
                    aria-haspopup={fl ? 'true' : undefined}
                    aria-expanded={fl ? openFly === item.to : undefined}
                    className={({ isActive }) =>
                      `group/nav relative shrink-0 whitespace-nowrap rounded-full px-2 py-2 text-ui-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#7FB8FF]/60 xl:px-4 xl:py-2.5 ${
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
                        {/* 选中背景改由导航条里的单例胶囊负责（见 pillBox）；这里不再挂
                            layoutId，避免带滚动切换时共享布局把 fixed 头部误算进 scrollY。
                            悬停时下划线做光标指示（见下方 !isActive 分支） */}
                        {!isActive && (
                          <span
                            className="pointer-events-none absolute bottom-1.5 left-2 right-2 h-[2px] origin-left scale-x-0 rounded-full bg-current opacity-0 transition-[transform,opacity] duration-200 group-hover/nav:scale-x-100 group-hover/nav:opacity-70 group-focus-visible/nav:scale-x-100 group-focus-visible/nav:opacity-70 xl:bottom-2 xl:left-4 xl:right-4"
                            aria-hidden
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
                    data-flyout
                    className="relative flex"
                    onMouseEnter={(e) => hoverFly(item.to, e.currentTarget)}
                    onMouseLeave={() => leaveFly(item.to)}
                    onFocus={(e) => {
                      if (suppressFocusOpen.current) {
                        suppressFocusOpen.current = false
                        return
                      }
                      openFlyNow(item.to, e.currentTarget)
                    }}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) closeFlyNow()
                    }}
                    onKeyDown={(e) => onFlyKeyDown(e, item.to)}
                  >
                    {link}
                    <AnimatePresence>
                      {openFly === item.to && (
                        <motion.div
                          key="flyout"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4, transition: { duration: 0.12, ease: 'easeIn' } }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute top-full z-50 pt-2.5"
                          style={{ left: flyLeft }}
                        >
                          {/* 白底下拉（只借鉴极光的版式与层次，色值全用本站 token）：
                              轻描边 + 柔和浅灰投影 + 8px 圆角，顶部一条品牌色细线点睛；
                              两列 6 格 = 5 个二级项 + 1 个「全部」入口，图标左、标题与一行描述右。
                              白底不做发光、不做模糊；导航栏与首屏仍保持深色，只有这块面板转白。 */}
                          <div
                            ref={flyPanelRef}
                            className="relative w-[600px] max-w-[calc(100vw-32px)] overflow-hidden rounded-lg border border-ink-900/[0.07] bg-white shadow-[0_16px_40px_-16px_rgba(15,23,42,0.22),0_2px_8px_-4px_rgba(15,23,42,0.10)]"
                          >
                            <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,rgba(22,119,255,0.85),rgba(22,119,255,0.28)_55%,rgba(22,119,255,0))]" aria-hidden />

                            <div className="relative">
                              <div className="flex items-baseline gap-2 px-4 pb-2.5 pt-3.5">
                                <span className="text-[12px] font-semibold tracking-[0.02em] text-ink-900">{fl.head}</span>
                                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-300">{fl.en}</span>
                                <span className="ml-auto font-mono text-[9px] tabular-nums tracking-[0.12em] text-ink-300">
                                  {String(fl.items.length).padStart(2, '0')}
                                </span>
                              </div>
                              <div className="mx-4 h-px bg-ink-900/[0.06]" aria-hidden />

                              <div className="grid grid-cols-2 gap-1 p-2">
                                {fl.items.map((c, ci) => {
                                  const Icon = c.icon
                                  return (
                                    <button
                                      key={ci}
                                      type="button"
                                      onClick={() => {
                                        closeFlyNow()
                                        if (c.to) {
                                          navigate(c.to)
                                        } else {
                                          requestMatrixIndex(c.index)
                                          navigate('/products')
                                        }
                                      }}
                                      className="group/fo flex items-start gap-3 rounded-md px-3 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-brand-soft/60 focus-visible:ring-2 focus-visible:ring-brand/40"
                                    >
                                      {Icon && (
                                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-soft/70 text-brand/75 transition-colors duration-150 group-hover/fo:bg-brand-soft group-hover/fo:text-brand">
                                          <Icon className="h-4 w-4" strokeWidth={1.9} />
                                        </span>
                                      )}
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-semibold text-ink-700 transition-colors duration-150 group-hover/fo:text-ink-900">
                                          {c.label}
                                        </span>
                                        <span className="mt-0.5 block truncate text-[11px] leading-4 text-ink-400/90 transition-colors duration-150 group-hover/fo:text-ink-500">
                                          {c.desc}
                                        </span>
                                      </span>
                                    </button>
                                  )
                                })}

                                {/* 第 6 格：与二级项同格的「全部」入口，两列排布不留空位 */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    closeFlyNow()
                                    navigate(fl.all.to)
                                  }}
                                  className="group/fa flex items-start gap-3 rounded-md px-3 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-brand-soft/60 focus-visible:ring-2 focus-visible:ring-brand/40"
                                >
                                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-soft/70 text-brand/75 transition-colors duration-150 group-hover/fa:bg-brand-soft group-hover/fa:text-brand">
                                    <ArrowRight className="h-4 w-4" strokeWidth={1.9} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] font-semibold text-ink-700 transition-colors duration-150 group-hover/fa:text-ink-900">
                                      {fl.all.label}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[11px] leading-4 text-ink-400/90 transition-colors duration-150 group-hover/fa:text-ink-500">
                                      {fl.all.desc}
                                    </span>
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </nav>

          {/* 右端：辅助入口 + 主 CTA + 移动端汉堡。
              ml-auto 把整组推到右端，同时把「导航区」与「CTA 区」的空白拉开。 */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 xl:gap-2.5">
            {/* 与导航分隔的细线：让 CTA 区有明确边界，颜色跟随深浅两种顶栏状态 */}
            <span
              className={`mr-1 hidden h-5 w-px shrink-0 lg:block xl:mr-2 ${light ? 'bg-white/15' : 'bg-ink-900/10'}`}
              aria-hidden
            />
          <div className="hidden items-center gap-1.5 lg:flex xl:gap-2.5">
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
                          <div className="ml-4 flex flex-col gap-0.5 border-l border-ink-900/[0.06] py-1 pl-3">
                            {fl.items.map((c, ci) => {
                              const Icon = c.icon
                              return (
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
                                  className="group/sub flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-ui font-medium text-ink-500 outline-none transition-colors hover:bg-mist hover:text-ink-900 focus-visible:bg-mist"
                                >
                                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-ink-300 transition-colors group-hover/sub:text-brand" strokeWidth={1.9} />}
                                  <span className="min-w-0 flex-1 whitespace-nowrap">{c.label}</span>
                                  <span className="shrink-0 font-mono text-micro tabular-nums text-ink-300 transition-colors group-hover/sub:text-brand">{pad2(ci)}</span>
                                </button>
                              )
                            })}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <SiteSearch open={search} onClose={() => setSearch(false)} />
    </header>
  )
}
