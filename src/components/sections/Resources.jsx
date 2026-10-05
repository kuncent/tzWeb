import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Reveal, SectionHead, SpotlightGlow, spotMove } from '../ui'
import { resourcesHead, resources } from '../../data/site'
import { useSectionsMap } from '../../lib/contentStore'

/* 资源专区：每一条都得真的能点。
   「在线」走站内锚点（App 的 ScrollToTop 会交给 scrollToId 飞过去），
   「洽谈提供 / 申请开通」统一落到联系我们 —— 不拿 preventDefault 装样。 */
export default function Resources() {
  /* 与页脚同一套规则：指向被关闭板块的首页锚点（如 /#matrix）从资源列表里隐去，避免死链 */
  const sections = useSectionsMap()
  const anchorOff = (to) => {
    const m = /^\/#([a-z]+)$/.exec(to || '')
    return m && sections[m[1]]?.enabled === false
  }
  return (
    <section id="resources" className="bg-white sec-y">
      <div className="container-x">
        <SectionHead
          id="resources" n="11"
          en={resourcesHead.en}
          zh={resourcesHead.zh}
          sub="能在线看的技术栈、引擎与对接约束都摆在页面上；需要盖章的方案模板与案例集，留个联系方式即可获取。"
          action={{ to: '/technology', children: '看全部技术文档' }}
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {resources.map((r, i) => {
            const items = r.items.filter((it) => !anchorOff(it.to))
            if (!items.length) return null
            return (
              <Reveal key={r.title} delay={i * 0.08}>
                <div onMouseMove={spotMove} className="group relative h-full overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-mist-100/60 p-7 transition-all duration-300 hover:border-brand/25 hover:bg-white hover:shadow-lift">
                  <SpotlightGlow />
                  <div className="relative flex items-baseline justify-between gap-3">
                    <h3 className="text-base font-semibold text-ink-900">{r.title}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <ul className="relative mt-5 space-y-1">
                    {items.map((it) => (
                      <li key={it.label}>
                        <Link
                          to={it.to}
                          className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-[13px] text-ink-500 transition-colors hover:bg-white hover:text-brand"
                        >
                          <span className="min-w-0">{it.label}</span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <span className="rounded-full border border-ink-900/[0.08] px-1.5 py-0.5 text-[10.5px] text-ink-400 transition-colors group-hover:border-brand/30 group-hover:text-brand">
                              {it.kind}
                            </span>
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
