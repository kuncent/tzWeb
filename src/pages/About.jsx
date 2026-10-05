import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageHero, InnerNav, PageSection, PageCTA } from '../components/PageShell'
import { Reveal, StatBand, EASE } from '../components/ui'
import { aboutBeliefs, aboutProof, aboutServices } from '../data/pages'
import { brand, contact, offices, advisorStats, productMatrix } from '../data/site'

const SECTIONS = [
  { id: 'who', label: '我们做什么' },
  { id: 'beliefs', label: '四条主张' },
  { id: 'proof', label: '资质与知识产权' },
  { id: 'service', label: '服务方式' },
  { id: 'network', label: '公司与联系' },
]

/* 首屏右半：把「拿得出手的硬东西」先摆上桌。
   合作高校那一行不重复放 —— 它已经在下方数字带里了。 */
function HeroProofCard() {
  const rows = aboutProof.filter((p) => p.k !== '合作高校')
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
      <div className="px-6 pb-1 pt-5 font-mono text-[10px] uppercase tracking-[0.26em] text-white/40">Hard assets</div>
      <dl>
        {rows.map((p, i) => (
          <motion.div
            key={p.k}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.26 + i * 0.08, duration: 0.5, ease: EASE }}
            className="flex items-baseline gap-4 border-t border-white/[0.06] px-6 py-4"
          >
            <dt className="w-[88px] shrink-0 text-[12.5px] text-white/50">{p.k}</dt>
            <dd className="text-[22px] font-bold leading-none tracking-tight text-white tabular-nums">{p.v}</dd>
            <span className="ml-auto hidden min-w-0 text-right text-[11px] leading-snug text-white/45 sm:block">{p.note}</span>
          </motion.div>
        ))}
      </dl>
      <div className="border-t border-white/[0.06] px-6 py-5">
        <p className="text-[11px] text-white/35">服务网络</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {offices.map((o) => (
            <span key={o} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11.5px] text-white/65">
              {o}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="ABOUT US"
        crumbs="关于我们"
        title="立足高校，构建下一代人才培养基础设施"
        sub="天择教育科技有限公司 —— 一家面向高校的教育科技企业：我们做实验室、做课程、做平台，也做把技术送进课表的那段最难的工程。"
        stats={advisorStats}
        cta={[
          { label: '联系我们', to: '/#contact', primary: true },
          { label: '看解决方案', to: '/solutions' },
        ]}
      >
        <HeroProofCard />
      </PageHero>

      <InnerNav items={SECTIONS} />

      {/* ―― 我们做什么 ―― */}
      <PageSection
        id="who"
        tone="mist"
        head={{
          n: '01',
          en: 'WHAT WE DO',
          zh: '一家把技术翻译成课表的公司',
          sub: '五项产品体系是我们的全部家当：它们各自能单独使用，合起来是一条从算力设备到学生作品的完整链路。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {productMatrix.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.id} delay={i * 0.06}>
                <Link
                  to="/#matrix"
                  className="group flex h-full flex-col rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">{p.en}</p>
                  <h3 className="mt-1 text-[15.5px] font-semibold leading-snug tracking-tight text-ink-900">{p.title}</h3>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">{p.tagline}</p>
                  <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 border-t border-ink-900/[0.07] pt-4">
                    {p.stats.map((s) => (
                      <span key={s.k} className="text-[12px] text-ink-400">
                        {s.k} <span className="font-semibold text-ink-900">{s.v}</span>
                      </span>
                    ))}
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.1} className="mt-8">
          <div className="rounded-2xl border border-ink-900/[0.07] bg-white p-7 shadow-soft md:p-9">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-brand">METHOD</p>
            <div className="mt-4 grid gap-8 md:grid-cols-3">
              {[
                { t: '从岗位能力倒推', d: '先看这个行业现在在招什么人、要什么技能，再定课程，最后才选设备与系统。顺序反了就会建成一间展示厅。' },
                { t: '让教师能自己开新课', d: '交付的终点不是培训签到表，而是教师不依赖我们也能把下一门课搭出来。' },
                { t: '可验证才算完成', d: '作品、证书、竞赛、学情报告 —— 四项里至少两项要能拿给别人看，项目才算闭环。' },
              ].map((x) => (
                <div key={x.t}>
                  <h3 className="text-[16px] font-semibold tracking-tight text-ink-900">{x.t}</h3>
                  <p className="mt-2 text-[13.5px] leading-[1.8] text-ink-500">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </PageSection>

      {/* ―― 四条主张 ―― */}
      <PageSection
        id="beliefs"
        tone="light"
        head={{
          n: '02',
          en: 'WHAT WE BELIEVE',
          zh: '四条主张，写在产品里的那种',
          sub: '不是墙上的标语：每一条都能对回到某个具体设计决定上。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {aboutBeliefs.map((b, i) => {
            const Icon = b.icon
            return (
              <Reveal key={b.title} delay={i * 0.07}>
                <div className="group relative flex h-full gap-5 overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-mist-100 p-7 transition-all duration-500 hover:border-brand/30 hover:bg-white hover:shadow-lift">
                  <span className="pointer-events-none absolute -right-4 -top-8 font-mono text-[86px] font-bold leading-none text-ink-900/[0.04] transition-colors duration-500 group-hover:text-brand/[0.09]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-card">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="relative min-w-0">
                    <h3 className="text-[17px] font-semibold tracking-tight text-ink-900">{b.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-[1.8] text-ink-500">{b.desc}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </PageSection>

      {/* ―― 资质与知识产权 ―― */}
      <PageSection
        id="proof"
        tone="mist"
        head={{
          n: '03',
          en: 'QUALIFICATIONS',
          zh: '资质与知识产权',
          sub: '高校采购要看的第三样东西（前两样是方案与案例）就是这些。证书编号与清单在投标与洽谈阶段按需提供。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {aboutProof.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.k} delay={i * 0.07}>
                <div className="h-full rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-white">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-5 text-[28px] font-bold leading-none tracking-tight text-ink-900">{p.v}</p>
                  <p className="mt-2 text-[14px] font-semibold tracking-tight text-ink-900">{p.k}</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">{p.note}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.1} className="mt-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-ink-900/[0.07] bg-white px-6 py-5 shadow-card">
            {[
              '开放的多智能体课堂协议',
              '信创环境适配',
              '全栈私有化交付能力',
              '源码授权可选',
            ].map((t) => (
              <p key={t} className="flex items-center gap-2.5 text-[13.5px] text-ink-700">
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" className="shrink-0 text-brand">
                  <path d="M2 6.5 4.8 9 10 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </p>
            ))}
          </div>
        </Reveal>
      </PageSection>

      {/* ―― 服务方式 ―― */}
      <PageSection
        id="service"
        tone="light"
        head={{
          n: '04',
          en: 'HOW WE SERVE',
          zh: '四个阶段，四拨人',
          sub: '售前、交付、教研、运营各自有明确的责任人与产出物。项目结束不等于服务结束 —— 学期陪跑是常态。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {aboutServices.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.stage} delay={i * 0.07}>
                <div className="group flex h-full flex-col rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <h3 className="text-[17px] font-semibold tracking-tight text-ink-900">{s.stage}</h3>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {s.items.map((x) => (
                      <li key={x} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-700">
                        <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-brand" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )
          })}
        </div>
      </PageSection>

      {/* ―― 公司与联系 ―― */}
      <PageSection
        id="network"
        tone="mist"
        head={{
          n: '05',
          en: 'COMPANY & CONTACT',
          zh: '公司信息与服务网络',
          sub: `${brand.name}，${brand.tagline}。`,
        }}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Reveal>
            <div className="h-full rounded-2xl border border-ink-900/[0.07] bg-white p-7 shadow-soft">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-ink-400">LEGAL NAME</p>
              <h3 className="mt-2 text-[22px] font-bold tracking-tight text-ink-900">{brand.name}</h3>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-brand">{brand.en} · {brand.tagline}</p>
              <p className="mt-5 text-[13.5px] leading-[1.85] text-ink-500">
                法定全称用于合同、发票与投标材料；日常与产品口径使用「{brand.short}」。需要正式文件的，请在联系时说明用途，我们按主体出具。
              </p>
              <div className="mt-7 space-y-3 border-t border-ink-900/[0.07] pt-6">
                {[
                  { k: '咨询热线', v: contact.phone },
                  { k: '商务邮箱', v: contact.email },
                  { k: '总部地址', v: contact.address },
                ].map((r) => (
                  <div key={r.k} className="flex flex-wrap items-baseline gap-x-4 text-[14px]">
                    <span className="w-[5em] shrink-0 text-ink-400">{r.k}</span>
                    <span className="min-w-0 font-medium text-ink-900">{r.v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-7">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-400">服务网络</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {offices.map((o) => (
                    <span key={o} className="rounded-full border border-ink-900/[0.08] bg-mist-100 px-3 py-1.5 text-[12.5px] text-ink-700">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <div className="space-y-5">
            <Reveal delay={0.06}>
              <div className="rounded-2xl border border-ink-900/[0.07] bg-white p-7 shadow-soft">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-ink-400">SCALE</p>
                <StatBand items={advisorStats} cols="sm:grid-cols-2" className="mt-4 gap-y-6" />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="h-full rounded-2xl border border-ink-900/[0.07] bg-[#04070d] p-7 text-white shadow-soft">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-brand-300">JOIN & PARTNER</p>
                <h3 className="mt-2 text-[19px] font-semibold tracking-tight">合作与招聘</h3>
                <p className="mt-3 text-[13.5px] leading-[1.8] text-white/60">
                  我们长期欢迎三类合作：院校共建课程与实验室、区域教育集成商的项目协作、以及教研 / 算法 / 实施方向的候选人。
                  简历与意向请寄商务邮箱，注明方向即可。
                </p>
                <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
                  {[
                    { k: '教研方向', v: '课程设计、实验手册、教师培训' },
                    { k: '算法方向', v: '多智能体编排、代码生成、仿真' },
                    { k: '实施方向', v: '驻校部署、设备联调、教务对接' },
                  ].map((x) => (
                    <li key={x.k} className="flex flex-wrap items-baseline gap-x-3 text-[13.5px]">
                      <span className="font-semibold text-white">{x.k}</span>
                      <span className="text-white/45">{x.v}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/#contact"
                  className="group mt-6 inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-medium text-ink-900 transition-all duration-300 hover:shadow-glow"
                >
                  发一封邮件
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </PageSection>

      <PageCTA
        title="需要正式材料，直接说用途"
        sub="投标、申报、共建协议 —— 不同用途要的东西不一样。写清场景，我们按主体出材料，不在官网上放通用模板。"
        back={{ label: '看交付路径', to: '/#delivery' }}
      />
    </>
  )
}
