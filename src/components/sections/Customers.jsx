import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInView, motion, AnimatePresence } from 'motion/react'
import { Hammer } from 'lucide-react'
import { Reveal, SectionHead, CountUp, EASE } from '../ui'
import LabShowcase from './LabShowcase'
import { customersHead } from '../../data/site'
import { clientLogos } from '../../data/pages'
import { MAP_CITIES } from '../../data/mapCities'

/* ============================================================
 * 合作高校 —— 已交付院校分布（浅色 · 无边界 · 简洁）
 * ------------------------------------------------------------
 * 只保留两件事：左侧一张安静的 ECharts 中国地图（真实省份 + 比例圆点，
 * 圆点大小 = 该城院校数），右侧一块无边框的详情看板。
 * 点地图圆点 或 点看板城市标签，共享 active 状态双向联动。整屏铺满、留白充足。
 * ============================================================ */

const ChinaMap = lazy(() => import('./ChinaMap'))

/* 产业客户（金融机构）：与 Cases 页客户墙同源，不属于“院校地图”，
   故单独一条 logo 带体现，不混进合作高校地图。 */
const CORPS = clientLogos.filter((l) => l.kind === 'corp')

/* 重点交付城市：与高校案例内页首屏的分布大屏共用同一份数据（data/mapCities）。
   status：已交付多为 deployed，挑几个较新市场标 building 以体现锤子施工动画。 */
const CITIES = MAP_CITIES

const STATUS = {
  deployed: { label: '已部署', color: '#1677ff' },
  building: { label: '建设中', color: '#f59e0b' },
}

/* 与地图上同款的状态徽标（内联 SVG，供图例 / 看板复用） */
function DeployIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" fill="#1677ff" />
      <path d="M7.4 12.3l3 3 6.2-6.7" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function BuildIcon({ className = '' }) {
  return (
    <span className={`grid place-items-center rounded-full bg-[#f59e0b] text-white ${className}`} aria-hidden>
      <Hammer className="h-[64%] w-[64%]" strokeWidth={2.4} />
    </span>
  )
}

/* 模拟点击轮播：每隔 CITY_MS 自动切到下一座城市 */
const CITY_MS = 3200

export default function Customers() {
  const [active, setActive] = useState(0)
  const [hovering, setHovering] = useState(false)
  const mapWrapRef = useRef(null)
  const areaRef = useRef(null)
  const mapInView = useInView(mapWrapRef, { once: true, margin: '160px' })
  const areaInView = useInView(areaRef, { once: false, margin: '-10% 0px -10% 0px' })
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const cur = CITIES[active]

  /* 地图 + 当前城市看板「模拟点击」轮播：入视 + 未悬停 + 非降级时自动推进 active，
     看板与地图上的全息投影板随之逐城切换；鼠标移入整块区域即暂停。 */
  const running = !reduced && !hovering && areaInView
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setActive((a) => (a + 1) % CITIES.length), CITY_MS)
    return () => clearInterval(t)
  }, [running])

  /* 闲置防卡死：切走标签页 / 窗口失焦时 mouseleave 常不触发，hovering 会卡在 true 使
     轮播永久暂停；失焦或页面隐藏时强制复位悬停，回到页面即恢复自动巡览。 */
  useEffect(() => {
    const resume = () => setHovering(false)
    const onVis = () => { if (document.hidden) resume() }
    window.addEventListener('blur', resume)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', resume)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <section id="customers" className="relative overflow-hidden bg-gradient-to-b from-white to-mist-100 sec-y">
      {/* 极淡的品牌色氛围：地图后方一团柔光 + 四角柔晕（其中一团缓慢漂移注入呼吸感）
          + 极淡网格 + 右上角超大编号水印，干净之余给整屏一点「大场面」的纵深与秩序感 */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[620px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.07),transparent_75%)]" />
        <div className="absolute -left-40 top-10 h-[420px] w-[420px] animate-drift rounded-full bg-[radial-gradient(closest-side,rgba(101,191,255,0.10),transparent_70%)]" />
        <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.08),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.5] [background-image:radial-gradient(rgba(22,119,255,0.10)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(80%_60%_at_50%_0%,#000,transparent)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
        {/* 右上角编号水印：极淡的一枚「08」，给浅色区一点尺度与秩序 */}
        <span aria-hidden className="absolute right-2 top-0 select-none font-mono text-[170px] font-black leading-none tracking-tighter text-ink-900/[0.028] sm:text-[230px] lg:right-8 lg:top-4 lg:text-[300px]">08</span>
      </div>

      <div className="relative z-10 container-x">
        <SectionHead
          id="customers" n="07"
          en={customersHead.en}
          zh={customersHead.zh}
          sub={customersHead.sub}
          action={{ to: '/cases#labcases', children: '看标杆实验室案例集' }}
        />

        <div
          ref={areaRef}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="mt-6 grid items-start gap-x-10 gap-y-8 lg:min-h-[682px] lg:grid-cols-[1.32fr_1fr]"
        >
          {/* ―― 左：中国地图（无边界，直接浮在浅色背景上）―― */}
          <Reveal>
            <div>
              <div ref={mapWrapRef} className="relative h-[400px] w-full sm:h-[480px] lg:h-[560px]">
                {mapInView && (
                  <Suspense fallback={<div className="grid h-full w-full place-items-center text-[13px] text-ink-400">地图加载中…</div>}>
                    <ChinaMap cities={CITIES} active={active} onSelect={setActive} reduced={reduced} />
                  </Suspense>
                )}
              </div>
              {/* 状态图例 */}
              <div className="mt-1 flex items-center justify-center gap-7 text-[12.5px] text-ink-500">
                <span className="inline-flex items-center gap-1.5">
                  <DeployIcon className="h-4 w-4" />
                  已部署
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BuildIcon className="h-4 w-4" />
                  建设中
                </span>
              </div>
            </div>
          </Reveal>

          {/* ―― 右：详情看板 —— 从原先的「浮空文字」抬升到一层轻量玻璃卡上，
                 实体感与秩序感更强，读起来更高级；卡内再补一层极淡品牌辉光 + 顶部高光内描边 ―― */}
          <Reveal delay={0.08}>
            <div className="relative isolate w-full overflow-hidden rounded-[26px] border border-ink-900/[0.07] bg-white/70 p-7 shadow-elev backdrop-blur-md sm:p-8">
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(22,119,255,0.09),transparent_62%)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)]" />
              {/* 当前城市（静态标头 + 自动巡览指示） */}
              <div className="flex items-center gap-3">
                <span className="h-5 w-[3px] rounded-full bg-gradient-to-b from-brand to-brand-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-400">当前城市 · Detail</span>
                {running && (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-medium tracking-wide text-ink-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-pulse" />
                    自动巡览 · AUTO
                  </span>
                )}
              </div>
              {/* 高度随当前城市平滑过渡：用 motion 的 layout 动画驱动这块看板的高度，
                  AnimatePresence 以 popLayout 让旧内容脱离布局流淡出、新内容淡入并撑出真实高度，
                  既不留固定占位的空白，也不生硬跳变。 */}
              <motion.div layout initial={false} transition={{ duration: 0.4, ease: EASE }} style={{ originY: 0 }}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={active}
                    initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  >
                    <div className="mt-3 flex items-baseline gap-3">
                      <h3 className="text-[34px] font-bold leading-none tracking-tight text-ink-900">{cur.city}</h3>
                      <span className="text-[14px] font-medium text-brand">{cur.schools.length} 所院校</span>
                    </div>
                    <div className="mt-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                        style={{ color: STATUS[cur.status].color, background: cur.status === 'deployed' ? 'rgba(22,119,255,0.10)' : 'rgba(245,158,11,0.12)' }}
                      >
                        {cur.status === 'deployed' ? <DeployIcon className="h-3.5 w-3.5" /> : <BuildIcon className="h-3.5 w-3.5" />}
                        {STATUS[cur.status].label}
                      </span>
                    </div>
                    <ul className="mt-5 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
                      {cur.schools.map((s) => (
                        <li key={s} className="group/school -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-1 text-[14px] text-ink-800 transition-colors duration-300 hover:bg-brand/[0.05]">
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand shadow-[0_0_0_3px_rgba(22,119,255,0.12)]" />
                          <span className="leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* 城市切换（点标签 → 地图对应圆点高亮） */}
              <div className="mt-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-400">选择城市</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CITIES.map((m, i) => {
                    const on = i === active
                    return (
                      <button
                        key={m.city}
                        type="button"
                        onClick={() => setActive(i)}
                        aria-pressed={on}
                        className={`rounded-full px-4 py-2 text-[13.5px] font-medium transition-all duration-300 ${
                          on ? 'bg-brand text-white shadow-glow' : 'bg-ink-900/[0.05] text-ink-500 hover:bg-ink-900/[0.09]'
                        }`}
                      >
                        {m.city}
                        <span className={`ml-1.5 text-[12px] tabular-nums ${on ? 'text-white/80' : 'text-ink-400'}`}>{m.schools.length}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <span className="mt-8 block h-px w-full bg-gradient-to-r from-ink-900/[0.12] via-ink-900/[0.05] to-transparent" />

              {/* 概览数字：大号渐变数字 + 细分隔线，抬升整块的分量感 */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { to: 300, suffix: '+', label: '合作高校' },
                  { to: 26, suffix: '', label: '覆盖省市' },
                  { to: CITIES.length, suffix: '', label: '重点城市', brand: true },
                ].map((s, i) => (
                  <div key={s.label} className={i > 0 ? 'border-l border-ink-900/[0.08] pl-4' : ''}>
                    <div
                      className={`bg-clip-text text-[30px] font-bold leading-none tracking-tight text-transparent ${
                        s.brand ? 'bg-gradient-to-br from-brand to-brand-400' : 'bg-gradient-to-br from-ink-900 to-ink-700'
                      }`}
                    >
                      <CountUp to={s.to} suffix={s.suffix} />
                    </div>
                    <div className="mt-2 text-[12px] tracking-wide text-ink-500">{s.label}</div>
                  </div>
                ))}
              </div>

              <Link to="/#contact" className="group mt-7 inline-flex items-center gap-2 text-[14px] font-medium text-brand transition-colors hover:text-ink-900">
                聊聊你所在的区域
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </Reveal>
        </div>

        {/* ―― 标杆院校建设方案与成果实景：双层自动轮播（院校 + 图片）―― */}
        <LabShowcase />

        {/* ―― 产业客户（金融机构）logo 带：与 Cases 页客户墙同源 ―― */}
        <Reveal delay={0.1} className="mt-12">
          <div className="flex flex-col gap-5 border-t border-ink-900/[0.07] pt-9">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-brand/60 to-transparent" />
              <h3 className="text-[13.5px] font-semibold uppercase tracking-[0.16em] text-ink-700">产业客户 · 金融机构</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {CORPS.map((c) => (
                <div key={c.img} className="flex flex-col items-center justify-center rounded-2xl border border-ink-900/[0.07] bg-white p-4 shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift">
                  <div className="flex h-14 w-full items-center justify-center">
                    <img src={c.img} alt={c.name} loading="lazy" decoding="async" className="max-h-12 max-w-[80%] object-contain" />
                  </div>
                  <p className="mt-2.5 text-center text-[12.5px] leading-snug text-ink-500">{c.name}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
