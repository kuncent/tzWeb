import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, ImageOff } from 'lucide-react'
import { PageHero, PageSection } from '../components/PageShell'
import { Reveal } from '../components/ui'
import { galleryProducts } from '../data/site'
import { PRODUCTS } from '../data/vocabulary'
import { detailIntroOf, hasDetail } from '../data/productDetails'
import { requestTrial, requestProductContact } from '../lib/aiEngine'

/* ============================================================
 * 产品详情页 /products/:slug
 * ------------------------------------------------------------
 * 入口来自产品矩阵的「查看详情」（底栏常驻 + 播放器 hover 蒙版）。
 * 开放判据与入口共用 hasDetail：有配图 + 有简介。正文优先用《产品简介.docx》
 * 原文，文档未覆盖的产品退回 site.js 里它自己的 desc；不重写、不扩写客户文案。
 * ============================================================ */

const systemOf = (slug) => {
  for (const [id, list] of Object.entries(galleryProducts)) {
    const p = list.find((x) => x.slug === slug)
    if (p) return { id, p }
  }
  return null
}

export default function ProductDetail() {
  const { slug } = useParams()
  const found = systemOf(slug)
  const [shot, setShot] = useState(0)

  /* 同一路由换 slug 时组件不重挂，选中的幕要跟着回到第一张 */
  useEffect(() => setShot(0), [slug])

  if (!found || !hasDetail(found.p)) return <Navigate to="/products" replace />

  const { p, id } = found
  const system = PRODUCTS.find((x) => x.id === id)
  const intro = detailIntroOf(p)
  const cover = p.shots[shot]?.src || p.shots[0]?.src || p.thumb

  return (
    <>
      <PageHero
        eyebrow={p.code}
        crumbs={`产品体系 / ${system?.short || ''}`}
        title={p.name}
        sub={p.tag}
        cta={[{ label: '返回产品体系', to: '/products' }]}
      />

      <PageSection tone="white">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
          {/* 配图：客户提供的真实界面截图；没有截图的产品不造假，用说明板承接 */}
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-mist-100 shadow-card">
              {cover ? (
                <img
                  src={cover}
                  alt={`${p.name} 操作界面`}
                  loading="eager"
                  decoding="async"
                  className="aspect-video w-full object-contain"
                />
              ) : (
                <div className="grid aspect-video w-full place-items-center bg-[radial-gradient(62%_54%_at_50%_44%,rgba(22,119,255,0.08),transparent_72%)]">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ImageOff className="h-5 w-5 text-ink-400" />
                    <p className="font-mono text-caption uppercase tracking-eyebrow text-ink-400">SCREENSHOT PENDING</p>
                    <p className="text-[12.5px] text-ink-500">界面截图整理中，欢迎索取演示</p>
                  </div>
                </div>
              )}
              <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-brand/30" />
              <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-brand/30" />
              <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-brand/30" />
              <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-brand/30" />
            </div>
            {/* 多幕产品：其余界面截图挂在封面下方，点一张换封面 */}
            {p.shots.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.shots.map((s, k) => (
                  <button
                    key={s.src}
                    type="button"
                    onClick={() => setShot(k)}
                    aria-label={`查看第 ${k + 1} 张界面截图`}
                    aria-current={k === shot}
                    className={`relative w-[104px] overflow-hidden rounded-lg border transition-colors ${
                      k === shot ? 'border-brand' : 'border-ink-900/[0.09] hover:border-brand/45'
                    }`}
                  >
                    <img src={s.src} alt="" loading="lazy" decoding="async" className="aspect-video w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Reveal>

          {/* 介绍：文档原文优先，缺文档时用产品自己的简介 */}
          <Reveal delay={0.06}>
            <div className="flex h-full flex-col">
              <p className="font-mono text-caption uppercase tracking-eyebrow text-brand">{p.en}</p>
              <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-ink-900 md:text-[30px]">{p.name}</h2>
              <p className="mt-2 text-ui font-medium text-brand">{p.tag}</p>

              <div className="mt-5 space-y-4 border-t border-ink-900/[0.07] pt-5">
                {intro.map((text, i) => (
                  <p key={i} className="text-[14px] leading-[1.9] text-ink-600">{text}</p>
                ))}
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-2 border-t border-ink-900/[0.07] pt-5 sm:grid-cols-2">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[12.5px] text-ink-500">适用专业</dt>
                  <dd className="text-right text-[12.5px] font-medium text-ink-800">{p.majors}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[12.5px] text-ink-500">产品编号</dt>
                  <dd className="font-mono text-[12.5px] font-medium text-ink-800">{p.code}</dd>
                </div>
              </dl>

              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => requestTrial({ name: p.name, code: p.code, intent: p.intent })}
                  className="rounded-xl bg-brand px-5 py-2.5 text-ui font-medium text-white shadow-glow transition-colors hover:bg-brand-600"
                >
                  申请体验
                </button>
                <button
                  type="button"
                  onClick={() =>
                    requestProductContact({
                      name: p.name,
                      code: p.code,
                      intent: p.intent,
                      source: `detail-${p.slug}`,
                      cta: `索取 ${p.name} 实训方案`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-900/15 bg-white px-5 py-2.5 text-ui font-medium text-ink-700 transition-colors hover:border-brand/40 hover:text-brand"
                >
                  索取实训方案
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <Link
                  to="/products"
                  className="group inline-flex items-center gap-1.5 px-2 py-2.5 text-ui font-medium text-ink-500 transition-colors hover:text-ink-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  返回产品体系
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </PageSection>
    </>
  )
}
