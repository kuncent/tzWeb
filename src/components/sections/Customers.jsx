import { Reveal, SectionHead } from '../ui'
import LabShowcase from './LabShowcase'
import LogoDriftWall from './LogoDriftWall'
import { customersHead } from '../../data/site'
import { clientLogos } from '../../data/pages'

/* ============================================================
 * 合作高校 —— 已服务院校（浅色 · 无边界 · 简洁）
 * ------------------------------------------------------------
 * 先「标杆院校」双层轮播（LabShowcase），再一块全宽的「校徽漂移墙」（LogoDriftWall）
 * 铺满展示合作院校 logo（reactbits Drift Wall 横向版），末尾单列产业客户（金融机构）logo 带。
 * 合作地图已按需求移除。
 * ============================================================ */

/* 产业客户（金融机构）：与 Cases 页客户墙同源，不属于院校，单独一条 logo 带体现。 */
const CORPS = clientLogos.filter((l) => l.kind === 'corp')

export default function Customers() {
  return (
    <section id="customers" className="relative overflow-hidden bg-gradient-to-b from-white to-mist-100 sec-y">
      {/* 极淡的品牌色氛围：一团柔光 + 四角柔晕（其中一团缓慢漂移注入呼吸感）+ 极淡网格
          + 右上角超大编号水印，干净之余给整屏一点「大场面」的纵深与秩序感 */}
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

        {/* ―― 标杆院校建设方案与成果实景：双层自动轮播（院校 + 图片）―― */}
        <div className="mt-6">
          <LabShowcase />
        </div>

        {/* ―― 校徽漂移墙：全宽铺满，横向多行展示合作院校 logo（与产业客户带同款样式，无卡片框）―― */}
        <Reveal delay={0.06} className="mt-12">
          <LogoDriftWall />
        </Reveal>

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
