import { useState } from 'react'
import { PageHero } from '../components/PageShell'
import RippleHero from '../components/RippleHero'
import Contact from '../components/sections/Contact'
import CoBuildFramework from '../components/sections/CoBuildFramework'
import HonorWall from '../components/sections/HonorWall'
import CopyrightGrid from '../components/sections/CopyrightGrid'
import { Reveal } from '../components/ui'
import { scrollToId } from '../hooks/useLenis'
import { advisorStats, newsItems } from '../data/site'


/* 首屏背景：光明科技金融大厦三张 2304×1296 外观（远景天际线 / 航拍俯瞰 /
   主塔立面近景），由 RippleHero 做 react-bits 风格的水波纹自动切换。
   三张同为 16:9、同一光比与冷调玻璃质感，避免切换时跳色。
   at = 标注在图像空间的比例坐标（RippleHero 按 cover 逆映射钉回屏幕）：
   前两张钉在主塔楼身上，第三张钉在正门入口的玻璃带上。 */
const towerShots = [
  { src: '/images/about/tower-01.webp', label: '光明科技金融大厦 · 凤凰城天际线', at: [0.618, 0.3] },
  { src: '/images/about/tower-02.webp', label: '光明科技金融大厦 · 航拍俯瞰', at: [0.498, 0.32] },
  { src: '/images/about/tower-03.webp', label: '光明科技金融大厦 · 主塔正门', at: [0.498, 0.62] },
]

/* 新闻资讯：紧凑编辑式版式 —— 左侧深色头条大卡 + 右侧分页新闻列表。
   头条固定为最新一条；其余条目进右侧列表，每页 4 条，板块高度恒定，
   新增新闻只改 site.js 的 newsItems，分页自动适配。整卡/整行可点，新窗口
   打开官网原文；只有抓到真实配图的条目才显示缩略图。 */
const NEWS_LIST_SIZE = 4

/* 页码序列：总页数少时全列，多时收拢为 1 … cur-1 cur cur+1 … last */
function pageList(total, cur) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, cur - 1, cur, cur + 1])
  if (cur <= 3) [2, 3, 4].forEach((p) => set.add(p))
  if (cur >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => set.add(p))
  const arr = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out = []
  arr.forEach((p, i) => {
    if (i && p - arr[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

function NewsSection() {
  const [page, setPage] = useState(1)
  const [featured, ...rest] = newsItems
  const totalPages = Math.max(1, Math.ceil(rest.length / NEWS_LIST_SIZE))
  const cur = Math.min(page, totalPages)
  const slice = rest.slice((cur - 1) * NEWS_LIST_SIZE, cur * NEWS_LIST_SIZE)
  const years = `${newsItems[newsItems.length - 1].date.slice(0, 4)}—${newsItems[0].date.slice(0, 4)}`
  const goto = (p) => { setPage(p); scrollToId('news', -96) }

  return (
    <section id="news" className="container-x scroll-mt-24 py-10 md:py-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-400">NEWS & UPDATES · {years}</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink-900 md:text-[28px] md:leading-none">新闻资讯</h2>
          </div>
          <p className="max-w-md text-ui-sm leading-relaxed text-ink-500">
            来访交流、课程共建、实习就业基地、产教融合论坛 —— 点击新闻查看官网原文。
          </p>
        </div>
      </Reveal>

      <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:gap-6">
        <Reveal className="lg:col-span-5">
          <a
            href={featured.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-full flex-col overflow-hidden rounded-2xl bg-night text-white shadow-card transition-shadow duration-300 hover:shadow-lg"
          >
            <div className="relative aspect-[2/1] overflow-hidden">
              <img src={featured.img} alt={featured.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-transparent" />
              <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-medium backdrop-blur">{featured.tag}</span>
            </div>
            <div className="flex flex-1 flex-col p-4 md:p-5">
              <div className="flex items-center gap-2.5">
                <time className="font-mono text-[11px] tabular-nums text-white/50">{featured.date}</time>
                <span aria-hidden className="h-px w-6 bg-white/20" />
                <p className="line-clamp-1 text-[12px] text-white/70">{featured.org}</p>
              </div>
              <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug tracking-tight">{featured.title}</h3>
              <p className="mt-1 line-clamp-1 text-[12px] leading-relaxed text-white/55">{featured.desc}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[12px] text-white/45 transition-colors group-hover:text-white">
                阅读原文 <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
              </span>
            </div>
          </a>
        </Reveal>

        <Reveal delay={0.06} className="lg:col-span-7">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-card">
            <div className="flex flex-1 flex-col divide-y divide-ink-900/[0.07] px-5 md:px-6">
              {slice.map((n) => (
                <a
                  key={n.date}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group -mx-5 flex flex-1 items-center gap-4 px-5 py-2 transition-colors hover:bg-brand/[0.04] md:-mx-6 md:px-6"
                >
                  <time className="w-[86px] shrink-0 font-mono text-[12px] tabular-nums text-ink-400">{n.date}</time>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-[14px] font-semibold tracking-tight text-ink-900 transition-colors group-hover:text-brand">{n.title}</h3>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">
                      <span className="mr-2 inline-block rounded bg-brand/10 px-1.5 py-px align-[1px] text-[10px] font-medium text-brand">{n.tag}</span>
                      {n.org}
                    </p>
                  </div>
                  {n.img && (
                    <span className="hidden h-[44px] w-[72px] shrink-0 overflow-hidden rounded-md sm:block">
                      <img src={n.img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]" />
                    </span>
                  )}
                  <span aria-hidden className="shrink-0 text-[13px] text-ink-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand">↗</span>
                </a>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-ink-900/[0.07] px-5 py-2 md:px-6">
                <p className="font-mono text-[11px] tabular-nums text-ink-400">共 {rest.length} 条 · {cur} / {totalPages}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={cur === 1}
                    onClick={() => goto(cur - 1)}
                    aria-label="上一页"
                    className="grid h-7 w-7 place-items-center rounded-md border border-ink-900/10 bg-white text-ink-500 transition-colors hover:text-ink-900 disabled:pointer-events-none disabled:opacity-35"
                  >
                    ‹
                  </button>
                  {pageList(totalPages, cur).map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} className="px-0.5 text-[11px] text-ink-400">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goto(p)}
                        aria-current={p === cur ? 'page' : undefined}
                        className={`h-7 min-w-[28px] rounded-md px-1.5 font-mono text-[12px] tabular-nums transition-colors ${
                          p === cur ? 'bg-ink-900 text-white' : 'border border-ink-900/10 bg-white text-ink-500 hover:text-ink-900'
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    disabled={cur === totalPages}
                    onClick={() => goto(cur + 1)}
                    aria-label="下一页"
                    className="grid h-7 w-7 place-items-center rounded-md border border-ink-900/10 bg-white text-ink-500 transition-colors hover:text-ink-900 disabled:pointer-events-none disabled:opacity-35"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="ABOUT US"
        crumbs="关于我们"
        title="立足高校，构建下一代人才培养基础设施"
        sub="深圳市天择科技有限公司成立于 2017 年 10 月，国家级高新技术企业、省市级专精特新中小企业、A 级纳税人。公司专注教育科技，从事教育信息化平台、教育实训仿真软件、教学资源库与现代教育装备的技术开发与集成服务，为高校提供实验室建设、课程开发与人才培养的全栈解决方案。"
        stats={advisorStats}
        cta={[
          { label: '联系我们', to: '#contact', primary: true },
          { label: '看解决方案', to: '/solutions' },
        ]}
        backdrop={<RippleHero images={towerShots} />}
      />

      <CoBuildFramework />

      <HonorWall />

      <CopyrightGrid />

      <NewsSection />

      {/* ―― 联系我们：原首页最后一屏迁入本页（表单 id="contact"，全站 /about#contact 锁点指这里）―― */}
      <Contact />

    </>
  )
}
