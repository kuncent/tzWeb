import { ArrowRight, Briefcase, ReceiptText, ShieldCheck, TrendingUp, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../ui'

/* ============================================================
 * 竞赛四大环节（首页 / 竞赛页共用）
 * ------------------------------------------------------------
 * 逐行条目式排版：序号是描边大字，悬停时整行浮起、序号转金、
 * 图标底色翻成鎏金，底线从左抽出。动画全部走 transform / opacity / color，
 * 不触发重排，humming 在三屏 3D 之下也不会掉帧。
 * bg 需由调用方给：首页接在首屏羽化色 #0a1a2e 上；竞赛页让它透明，
 * 由页面那层贯穿整页的渐变透出来，保持无缝。
 * ============================================================ */

const MODULES = [
  { n: '01', en: 'DIGITAL OPERATION', title: '企业数字化经营', icon: Briefcase, items: ['战略规划', '市场竞争', '资源配置'] },
  { n: '02', en: 'FINANCE', title: '财务', icon: Wallet, items: ['账务处理', '报表分析', '资金管理'] },
  { n: '03', en: 'TAXATION', title: '税务', icon: ReceiptText, items: ['纳税申报', '税务筹划', '合规风控'] },
  { n: '04', en: 'INVESTMENT', title: '金融投资', icon: TrendingUp, items: ['投融资决策', '碳金融'] },
]

const ABILITIES = ['数据分析', '业务洞察', '管理决策', '团队协作']

export default function CompetitionModules({
  id = 'content',
  bg = 'bg-transparent',
  no = '02',
  kicker = 'COMPETITION MODULES',
  title = '四个环节，一场连续博弈',
  sub = '在高度仿真的市场环境里完成多期经营决策，与对手实时竞争。',
  link = null,
  className = '',
}) {
  return (
    <section id={id} className={`relative overflow-hidden ${bg} py-24 md:py-32 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[10%] h-[520px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(59,156,255,0.10),transparent_72%)]" />
        <div className="absolute bottom-[-10%] right-[-8%] h-[440px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(217,189,131,0.07),transparent_72%)]" />
      </div>

      <div className="container-x relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              {no && <span className="font-mono text-[12px] tabular-nums tracking-[0.18em] text-[#d9bd83]">{no}</span>}
              <span className="h-px w-8 bg-[#d9bd83]/35" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">{kicker}</span>
            </div>
            <h2 className="mt-4 text-[30px] font-bold leading-[1.18] tracking-tight text-white md:text-[42px]">{title}</h2>
            <p className="mt-4 text-[15px] leading-[1.9] text-white/50">{sub}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {ABILITIES.map((a) => (
              <span key={a} className="rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12px] text-white/55">
                {a}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-14">
          {MODULES.map((m, i) => {
            const Icon = m.icon
            return (
              <Reveal key={m.n} delay={i * 0.05}>
                <div className="group relative flex flex-col gap-4 rounded-3xl px-5 py-8 transition-colors duration-500 hover:bg-[#0d1d33] md:flex-row md:items-center md:gap-10 md:px-8 md:py-9">
                  <span
                    aria-hidden
                    className="w-[92px] shrink-0 font-mono text-[54px] font-bold leading-none tracking-[-0.04em] text-transparent [-webkit-text-stroke:1.2px_rgba(126,174,220,0.30)] transition-all duration-500 group-hover:text-[#d9bd83]/10 group-hover:[-webkit-text-stroke:1.2px_rgba(217,189,131,0.55)] md:text-[64px]"
                  >
                    {m.n}
                  </span>

                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.07] text-[#62e5ff] transition-colors duration-300 group-hover:bg-[#d9bd83] group-hover:text-[#111b29]">
                      <Icon className="h-5 w-5" strokeWidth={1.85} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[24px] font-bold tracking-tight text-white md:text-[28px]">{m.title}</h3>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">{m.en}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:max-w-[38%] md:justify-end">
                    {m.items.map((it, k) => (
                      <span key={it} className="flex items-center gap-3 text-[14px] text-white/55">
                        {k > 0 && <span className="h-1 w-1 rounded-full bg-white/25" aria-hidden />}
                        {it}
                      </span>
                    ))}
                  </div>

                  <ArrowRight
                    className="hidden h-4 w-4 shrink-0 -translate-x-1 text-white/25 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-[#d9bd83] group-hover:opacity-100 md:block"
                    aria-hidden
                  />

                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-[linear-gradient(90deg,rgba(217,189,131,0.75),rgba(217,189,131,0))] transition-transform duration-500 group-hover:scale-x-100"
                  />
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="flex items-center gap-2.5 text-[13px] text-white/35">
              <ShieldCheck className="h-4 w-4 text-[#d9bd83]" strokeWidth={1.9} />
              全程动态博弈 · 多期经营决策 · 与对手实时竞争
            </span>
            {link && (
              <Link
                to={link.to}
                className="group ml-auto inline-flex items-center gap-2 text-[13.5px] font-medium text-[#f5e4bd] transition-colors hover:text-white"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
