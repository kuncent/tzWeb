import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Reveal, StatBand } from './ui'
import { scrollToId } from '../hooks/useLenis'

/* ============================================================
 * 内页骨架
 * ------------------------------------------------------------
 * 五个内页共用一套：暗色 PageHero 开场（和首页首屏同一个底色，
 * 从首页点进来不会「掉进另一个网站」）→ 吸顶的页内板块导航 →
 * 若干 PageSection → 暗色收口 CTA。
 *
 * 为什么页内导航要吸顶：首页有顶栏的「板块模式」接管，内页没有；
 * 不补这一条，用户在长内页里滚两屏就不知道自己在哪了 —— 参考站
 * 那种「秩序感」有一半是靠常驻的位置提示撑的。
 * ============================================================ */

/* 暗底 + 双尺度网格 + 一条地平线光。
   原来那两团大半径蓝雾是「模板感」的来源：越大越糊，谁家的官网都长这样。
   改成结构先行 —— 光只留一道压在顶部的窄地平线（读作「画面上方有光源」），
   纵深交给顶部渐变与两级网格：88px 主格给秩序，22px 次格给精度。
   科技感来自刻度与层次，不来自亮度。 */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#06080d]" />
      <div className="absolute inset-x-0 top-0 h-[460px] bg-gradient-to-b from-[#0a0e16] via-[#080b12]/70 to-transparent" />
      {/* 地平线：1px 亮线 + 上方一道窄辉光，中心略亮、两端收干 */}
      <div className="absolute inset-x-0 top-[118px] h-px bg-gradient-to-r from-transparent via-brand-400/30 to-transparent" />
      <div className="absolute left-1/2 top-[94px] h-[150px] w-[min(1180px,96%)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(22,119,255,0.14),transparent_72%)] blur-[18px]" />
      {/* 88px 主格 + 22px 次格：只在顶部渐隐，像工程图纸而不是背景图 */}
      <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:88px_88px] [mask-image:radial-gradient(130%_85%_at_50%_-10%,#000_42%,transparent_80%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(90%_62%_at_50%_8%,#000,transparent_74%)]" />
      {/* 底边一道收口，避免暗块生硬切断 */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#06080d]" />
    </div>
  )
}

/* 浅色首屏底：与内页浅色分区同一色语言（白 → mist-100 微渐）。
   保留暗底那套「地平线 + 双级网格」结构，只把亮度反转：格线换成 ink 的极低不透明
   度（浅底上读作淡灰图纸格），辉光压到很淡的蓝。科技感保留，底不再黑。 */
function HeroBackdropLight() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-mist-100" />
      <div className="absolute inset-x-0 top-0 h-[460px] bg-gradient-to-b from-mist-100/70 via-white/40 to-transparent" />
      {/* 地平线：1px 细线 + 上方一道窄辉光，中心略亮、两端收干 */}
      <div className="absolute inset-x-0 top-[118px] h-px bg-gradient-to-r from-transparent via-brand/25 to-transparent" />
      <div className="absolute left-1/2 top-[94px] h-[150px] w-[min(1180px,96%)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(22,119,255,0.10),transparent_72%)] blur-[18px]" />
      {/* 88px 主格 + 22px 次格：ink 极低不透明度，只在顶部渐隐 */}
      <div className="absolute inset-0 opacity-[0.6] [background-image:linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:88px_88px] [mask-image:radial-gradient(130%_85%_at_50%_-10%,#000_42%,transparent_80%)]" />
      <div className="absolute inset-0 opacity-[0.4] [background-image:linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(90%_62%_at_50%_8%,#000,transparent_74%)]" />
      {/* 底边收口到 mist-100，给暗色产品矩阵屏让出一道干净的浅色过渡 */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-mist-100" />
    </div>
  )
}

/* 中文标题没有词边界，浏览器可以在任意两个字之间断行 ——
   「…四个引 / 擎」「…30+ / 省市」这种断法很廉价。按逗号切成小句，
   每句锁成不可断的整体，断行只会发生在逗号处；窄屏不锁，
   免得长句在手机上横向溢出。 */
function cjkTitle(text) {
  if (typeof text !== 'string') return text
  const parts = text.split('，')
  return parts.map((p, i) => {
    const last = i === parts.length - 1
    return (
      <span key={i} className={last ? undefined : 'whitespace-nowrap'}>
        {p}
        {last ? '' : '，'}
      </span>
    )
  })
}

export function PageHero({ eyebrow, title, sub, stats, crumbs, cta, children, backdrop, tone = 'dark' }) {
  const dark = tone !== 'light'
  return (
    <section className={`relative isolate overflow-hidden pt-[64px] ${dark ? 'text-white' : 'text-ink-900'}`}>
      {backdrop || (dark ? <HeroBackdrop /> : <HeroBackdropLight />)}
      <div className="container-x relative pb-20 pt-14 md:pb-28 md:pt-24">
        {crumbs && (
          <Reveal y={10}>
            <nav aria-label="面包屑" className={`flex items-center gap-2 text-ui-sm ${dark ? 'text-white/52' : 'text-ink-400'}`}>
              <Link to="/" className={`transition-colors ${dark ? 'hover:text-white' : 'text-ink-500 hover:text-ink-900'}`}>首页</Link>
              <span aria-hidden>/</span>
              <span className={dark ? 'text-white/80' : 'text-ink-700'}>{crumbs}</span>
            </nav>
          </Reveal>
        )}

        <div className={`gap-12 ${children ? 'lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center' : ''}`}>
          <div className="min-w-0">
            <Reveal y={12}>
              {/* HUD 式标签行：菱形刻度 + 渐隐细线 + 小字，比原来一根 8px 短线更像仪表 */}
              <div className="mt-6 flex items-center gap-3">
                <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-brand-400/90" />
                <span aria-hidden className="h-px w-10 bg-gradient-to-r from-brand-400/60 to-transparent" />
                <span className={`text-caption font-semibold uppercase tracking-[0.3em] ${dark ? 'text-brand-300' : 'text-brand'}`}>{eyebrow}</span>
              </div>
            </Reveal>
            <Reveal delay={0.06} y={16}>
              <h1 className="mt-6 max-w-[26ch] text-[38px] font-bold leading-[1.1] tracking-[-0.025em] text-balance md:text-[52px] md:leading-[1.06] xl:text-[60px]">
                {cjkTitle(title)}
              </h1>
            </Reveal>
            {sub && (
              <Reveal delay={0.12}>
                <p className={`mt-6 max-w-[58ch] text-ui-lg leading-[1.9] ${dark ? 'text-white/66' : 'text-ink-500'}`}>{sub}</p>
              </Reveal>
            )}
            {cta && (
              <Reveal delay={0.18}>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  {cta.map((c) =>
                    c.primary ? (
                      <Link
                        key={c.label}
                        to={c.to}
                        className={`group inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 ${dark ? 'bg-white text-ink-900 hover:shadow-glow' : 'bg-ink-900 text-white hover:shadow-lift'}`}
                      >
                        {c.label}
                        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </Link>
                    ) : (
                      <Link key={c.label} to={c.to} className={dark ? 'btn-outline-light' : 'btn-ghost'}>
                        {c.label}
                      </Link>
                    )
                  )}
                </div>
              </Reveal>
            )}
          </div>

          {children && <Reveal delay={0.14} className="min-w-0">{children}</Reveal>}
        </div>

        {stats && stats.length > 0 && (
          <div className={`mt-16 border-t pt-10 ${dark ? 'border-white/10' : 'border-ink-900/10'}`}>
            <StatBand tone={dark ? 'dark' : 'light'} items={stats} cols="sm:grid-cols-4" />
          </div>
        )}
      </div>
    </section>
  )
}

/* ============================================================
 * 首屏统一外框 HeroFrame
 * ------------------------------------------------------------
 * 六个内页首屏共用同一台「仪器」的外壳：同一圆角 / 描边 / 顶部光条 /
 * 四角 HUD / 左右刻度尺 / 左上编号 / 右上状态 / 居中标签 / 底部提示。
 * 各页只往里塞自己那套按业务定制的动画（目录轨 / 科技核 / 轮播 /
 * 3D 转台 / 地图 / 实景拼贴），外壳一致、动效各异。
 *
 * 开机扫描只走一遍（1.6s 后收），不做常驻循环：首屏已经有轮播、
 * 轨道、地图流光这些常驻动画，外壳再加一条无限扫线只会更吵。
 * ============================================================ */
export function HeroFrame({ index, label, hint, status = 'LIVE', children, bodyClass = '', className = '' }) {
  const reduced = useReducedMotion()
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.75)] ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />

      {/* 开机扫描：一道横光自上而下走一遍即止 */}
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30"
          style={{
            background:
              'linear-gradient(to bottom, transparent 38%, rgba(120,190,255,0.07) 48%, rgba(190,225,255,0.15) 50%, rgba(120,190,255,0.07) 52%, transparent 62%)',
          }}
          initial={{ y: '-100%' }}
          animate={{ y: '100%' }}
          transition={{ duration: 1.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      {/* 左右刻度尺：12px 短线 + 60px 长线，中段显形、上下消隐 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-10 left-2 z-20 w-1.5 opacity-40 [background-image:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.28)_0_1px,transparent_1px_12px),repeating-linear-gradient(to_bottom,rgba(120,190,255,0.45)_0_1px,transparent_1px_60px)] [mask-image:linear-gradient(to_bottom,transparent,#000_16%,#000_84%,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-10 right-2 z-20 w-1.5 opacity-40 [background-image:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.28)_0_1px,transparent_1px_12px),repeating-linear-gradient(to_bottom,rgba(120,190,255,0.45)_0_1px,transparent_1px_60px)] [mask-image:linear-gradient(to_bottom,transparent,#000_16%,#000_84%,transparent)]"
      />

      <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
        <span className="absolute left-3.5 top-3.5 h-4 w-4 border-l border-t border-white/[0.14]" />
        <span className="absolute right-3.5 top-3.5 h-4 w-4 border-r border-t border-white/[0.14]" />
        <span className="absolute bottom-3.5 left-3.5 h-4 w-4 border-b border-l border-white/[0.14]" />
        <span className="absolute bottom-3.5 right-3.5 h-4 w-4 border-b border-r border-white/[0.14]" />
      </div>

      {index && (
        <div className="pointer-events-none absolute left-9 top-[13px] z-30 hidden items-center gap-2 font-mono text-micro tabular-nums tracking-eyebrow text-white/30 sm:flex">
          <span aria-hidden className="h-1 w-1 rounded-full bg-brand-400/90" />
          {index}
        </div>
      )}
      {status && (
        <div className="pointer-events-none absolute right-9 top-[13px] z-30 hidden items-center gap-1.5 font-mono text-micro uppercase tracking-eyebrow text-white/28 sm:flex">
          <span aria-hidden className="h-1 w-1 animate-pulse rounded-full bg-brand-300/90 motion-reduce:animate-none" />
          {status}
        </div>
      )}

      {label && (
        <div className="pointer-events-none absolute left-1/2 top-3.5 z-30 -translate-x-1/2">
          <span className="whitespace-nowrap rounded-full border border-brand/25 bg-[#06080d]/70 px-3 py-1 text-caption font-semibold uppercase tracking-[0.14em] text-brand-300 backdrop-blur-sm">{label}</span>
        </div>
      )}
      {hint && (
        <div className="pointer-events-none absolute bottom-3.5 left-1/2 z-30 -translate-x-1/2">
          <p className="whitespace-nowrap font-mono text-micro uppercase tracking-eyebrow text-white/35">{hint}</p>
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  )
}

/* 页内板块导航：吸顶在 64px 顶栏之下，滚动时高亮当前所在段。
   规则取「顶部已经越过基准线的最后一段」，不用 IntersectionObserver：
   IO 在滚回首屏之上、以及两段之间的空档里没有任何命中项，
   高亮会停在最后一次命中的那一格 —— 看着就是「导航点不动」。 */
export function InnerNav({ items, tone = 'light' }) {
  const [active, setActive] = useState(items[0]?.id)
  const dark = tone === 'dark'
  useEffect(() => {
    const ids = items.map((s) => s.id)
    let raf = 0
    const measure = () => {
      raf = 0
      const line = 150 // 顶栏 64 + 吸顶导航 ~46 + 余量
      let cur = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) cur = id
      }
      // 滚到页底时最后一段自己可能永远够不到基准线，补一刀
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = ids[ids.length - 1]
      setActive((prev) => (prev === cur ? prev : cur))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [items])

  const jump = (id) => scrollToId(id, -116)

  return (
    <div className={`sticky top-[64px] z-40 border-b backdrop-blur-xl ${dark ? 'border-white/[0.06] bg-[#06080d]/85' : 'border-ink-900/[0.06] bg-white/85'}`}>
      <div className="container-x flex gap-1 overflow-x-auto py-2.5 no-scrollbar">
        {items.map((s) => {
          const on = active === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-ui-sm font-medium transition-colors ${
                on ? 'text-white' : dark ? 'text-white/55 hover:text-white' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {on && (
                <motion.span
                  layoutId="inner-nav-active"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className={`absolute inset-0 rounded-full ${dark ? 'bg-white/12 ring-1 ring-inset ring-white/15' : 'bg-ink-900'}`}
                />
              )}
              <span className="relative z-10 whitespace-nowrap">{s.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* 内页分区：三档底色，与首页同一套节奏（py-24 / md:py-28） */
export function PageSection({ id, tone = 'light', head, children, className = '' }) {
  const bg = tone === 'mist' ? 'bg-mist-100' : tone === 'dark' ? 'bg-night text-white' : 'bg-white'
  return (
    <section id={id} className={`relative scroll-mt-[132px] py-24 md:py-28 ${bg} ${className}`}>
      <div className="container-x">
        {head && (
          <div className="mb-12">
            <div className="flex items-center gap-3">
              {head.n && (
                <span className={`font-mono text-caption tabular-nums tracking-label ${tone === 'dark' ? 'text-brand-400' : 'text-brand'}`}>
                  {head.n}
                </span>
              )}
              <span className={`h-px w-6 ${tone === 'dark' ? 'bg-white/25' : 'bg-ink-900/15'}`} />
              {head.en && (
                <span className={`text-caption font-semibold uppercase tracking-eyebrow ${tone === 'dark' ? 'text-white/45' : 'text-ink-400'}`}>
                  {head.en}
                </span>
              )}
            </div>
            <h2 className={`mt-4 max-w-[24ch] text-3xl font-bold tracking-tight md:text-[38px] md:leading-[1.18] ${tone === 'dark' ? 'text-white' : 'text-ink-900'}`}>
              {head.zh}
            </h2>
            {head.sub && (
              <p className={`mt-4 max-w-2xl text-sm leading-relaxed ${tone === 'dark' ? 'text-white/55' : 'text-ink-500'}`}>{head.sub}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

/* 收口 CTA：每个内页最后都回到同一句话 —— 先聊需求，再谈方案 */
export function PageCTA({ title = '先聊聊贵校的情况，再谈方案', sub = '留下联系方式，方案顾问与教研老师会在 1 个工作日内对接；也可以直接索取一份同类院校的建设方案初稿。', to = '/#contact', link = '预约演示', back = null }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#06080d] py-20 text-white md:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-160px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.3),transparent)]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)]" />
      </div>
      <div className="container-x relative flex flex-wrap items-end justify-between gap-8">
        <Reveal className="min-w-0 max-w-2xl flex-1">
          <h2 className="text-[30px] font-bold leading-tight tracking-tight md:text-[40px]">{title}</h2>
          <p className="mt-4 text-ui leading-[1.85] text-white/55">{sub}</p>
        </Reveal>
        <Reveal delay={0.1} className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            to={to}
            className="group inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-900 transition-all duration-300 hover:shadow-glow"
          >
            {link}
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
          {back && (
            <Link to={back.to} className="btn-outline-light">
              {back.label}
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  )
}

/* 内页只共用上面这四件。分区标题不另封组件：内页的 head 形状
   （编号 / 英文标 / 中文标 / 副标）固定写死在 PageSection 里，
   比再抽一层 props 更好读 —— 与首页那套 SectionHead 同形。 */
