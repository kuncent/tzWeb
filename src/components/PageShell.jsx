import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
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

/* 暗底 + 品牌蓝辉光 + 极淡网格。网格用 CSS 渐变画，不引图片资源 */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#04070d]" />
      <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.28),transparent)] blur-[8px]" />
      <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(101,191,255,0.16),transparent)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(80%_60%_at_50%_0%,#000,transparent)]" />
      {/* 底边一道收口，避免暗块生硬切断 */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#04070d]" />
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

export function PageHero({ eyebrow, title, sub, stats, crumbs, cta, children }) {
  return (
    <section className="relative isolate overflow-hidden pt-[64px] text-white">
      <HeroBackdrop />
      <div className="container-x relative pb-16 pt-14 md:pb-20 md:pt-20">
        {crumbs && (
          <Reveal y={10}>
            <nav aria-label="面包屑" className="flex items-center gap-2 text-[12px] text-white/45">
              <Link to="/" className="transition-colors hover:text-white">首页</Link>
              <span aria-hidden>/</span>
              <span className="text-white/70">{crumbs}</span>
            </nav>
          </Reveal>
        )}

        <div className={`gap-12 ${children ? 'lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center' : ''}`}>
          <div className="min-w-0">
            <Reveal y={12}>
              <div className="mt-6 flex items-center gap-3">
                <span className="h-px w-8 bg-brand-400/70" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-300">{eyebrow}</span>
              </div>
            </Reveal>
            <Reveal delay={0.06} y={16}>
              <h1 className="mt-5 max-w-[26ch] text-[38px] font-bold leading-[1.1] tracking-tight text-balance md:text-[54px] md:leading-[1.06]">
                {cjkTitle(title)}
              </h1>
            </Reveal>
            {sub && (
              <Reveal delay={0.12}>
                <p className="mt-6 max-w-2xl text-[15px] leading-[1.85] text-white/60">{sub}</p>
              </Reveal>
            )}
            {cta && (
              <Reveal delay={0.18}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  {cta.map((c) =>
                    c.primary ? (
                      <Link
                        key={c.label}
                        to={c.to}
                        className="group inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-900 transition-all duration-300 hover:shadow-glow"
                      >
                        {c.label}
                        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </Link>
                    ) : (
                      <Link key={c.label} to={c.to} className="btn-outline-light">
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
          <div className="mt-14 border-t border-white/10 pt-8">
            <StatBand tone="dark" items={stats} cols="sm:grid-cols-4" />
          </div>
        )}
      </div>
    </section>
  )
}

/* 页内板块导航：吸顶在 64px 顶栏之下，滚动时高亮当前所在段。
   规则取「顶部已经越过基准线的最后一段」，不用 IntersectionObserver：
   IO 在滚回首屏之上、以及两段之间的空档里没有任何命中项，
   高亮会停在最后一次命中的那一格 —— 看着就是「导航点不动」。 */
export function InnerNav({ items }) {
  const [active, setActive] = useState(items[0]?.id)
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
    <div className="sticky top-[64px] z-40 border-b border-ink-900/[0.06] bg-white/85 backdrop-blur-xl">
      <div className="container-x flex gap-1 overflow-x-auto py-2.5 no-scrollbar">
        {items.map((s) => {
          const on = active === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                on ? 'text-white' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {on && (
                <motion.span
                  layoutId="inner-nav-active"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-ink-900"
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
                <span className={`font-mono text-[11px] tabular-nums tracking-[0.18em] ${tone === 'dark' ? 'text-brand-400' : 'text-brand'}`}>
                  {head.n}
                </span>
              )}
              <span className={`h-px w-6 ${tone === 'dark' ? 'bg-white/25' : 'bg-ink-900/15'}`} />
              {head.en && (
                <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone === 'dark' ? 'text-white/45' : 'text-ink-400'}`}>
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
    <section className="relative isolate overflow-hidden bg-[#04070d] py-20 text-white md:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-160px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.3),transparent)]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)]" />
      </div>
      <div className="container-x relative flex flex-wrap items-end justify-between gap-8">
        <Reveal className="min-w-0 max-w-2xl flex-1">
          <h2 className="text-[30px] font-bold leading-tight tracking-tight md:text-[40px]">{title}</h2>
          <p className="mt-4 text-[14.5px] leading-[1.85] text-white/55">{sub}</p>
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
