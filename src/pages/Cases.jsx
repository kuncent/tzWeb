import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { PageHero, InnerNav, PageSection, PageCTA } from '../components/PageShell'
import { Reveal, EASE } from '../components/ui'
import { caseWall, caseFilters, caseFeatured, clientLogos } from '../data/pages'
import { offices } from '../data/site'

const SECTIONS = [
  { id: 'deep', label: '深度案例' },
  { id: 'wall', label: '合作院校' },
  { id: 'logos', label: '客户墙' },
  { id: 'outcomes', label: '成果出口' },
  { id: 'network', label: '服务网络' },
]

/* 成果出口：数字全部来自首页与内页已经写明的口径，这里只是换个角度摆 */
const outcomes = [
  {
    n: '01',
    title: '学生作品与作品集',
    desc: '每门课的终点是一个能演示的东西：一条链上的合约、一段机械臂轨迹、一份可回放的实验报告。毕业时拿得出手，面试才说得清。',
    metric: [{ k: '课程数量', v: '300+' }, { k: '课时包', v: '320+' }],
  },
  {
    n: '02',
    title: '学科竞赛',
    desc: '赛项选题、集训方案与器材保障一并交付，教师不必自己找题。竞赛成果同时回流成下一届的教学案例。',
    metric: [{ k: '赛项支持', v: '选题 + 集训' }, { k: '器材保障', v: '含备件' }],
  },
  {
    n: '03',
    title: '1+X 与职业证书',
    desc: '实验项目按可认证的岗位能力组织，学时与考核点能直接对接证书标准，避免「学完还得再报一个班」。',
    metric: [{ k: '证书出口', v: '1+X 对接' }, { k: '考核证据', v: '过程留痕' }],
  },
  {
    n: '04',
    title: '专业建设材料',
    desc: '现状诊断、岗位能力图谱、课程与专业映射表、学情报告 —— 申报与验收要的材料，是交付物的一部分，不是事后补的。',
    metric: [{ k: '适用专业', v: '25 个' }, { k: '实验项目', v: '492 条' }],
  },
]

export default function Cases() {
  const [filter, setFilter] = useState('all')
  const shown = caseWall.filter((c) => filter === 'all' || (filter === 'top' ? c.tag === 'top' : c.tag === filter))

  return (
    <>
      <PageHero
        eyebrow="HIGHER EDUCATION CASES"
        crumbs="高校案例"
        title="100+ 所高校，30+ 省市，30+ 学科"
        sub="这一页不打算用形容词。能公开的是院校名录与建设形态，需要授权才能讲的是具体采购内容 —— 所以我们把前者摆出来，后者按同类院校的案例集在洽谈阶段提供。"
        stats={[
          { k: '合作高校', v: '100+' },
          { k: '覆盖省市', v: '30+' },
          { k: '覆盖学科', v: '30+' },
          { k: '培养学员', v: '10000+' },
        ]}
        cta={[
          { label: '索取同类院校案例集', to: '/#contact', primary: true },
          { label: '看建设形态', to: '/solutions#forms' },
        ]}
      >
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <img
            src="/images/campus_map.webp"
            alt="合作高校分布示意"
            width={520}
            height={200}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      </PageHero>

      <InnerNav items={SECTIONS} />

      {/* ―― 深度案例 ―― */}
      <PageSection
        id="deep"
        tone="mist"
        head={{
          n: '01',
          en: 'FEATURED CASE',
          zh: '一个已经公开的完整案例',
          sub: '北京理工大学：AI 实验室、具身智能实验室与工程实训中心三馆同建。以下数据为已对外公开口径。',
        }}
      >
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-soft">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="relative min-h-[240px] overflow-hidden bg-night">
                <img
                  src={caseFeatured.img}
                  alt={caseFeatured.school}
                  width={220}
                  height={82}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04070d]/85 via-[#04070d]/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-brand-300">CASE 01</p>
                  <h3 className="mt-1.5 text-[24px] font-bold tracking-tight text-white md:text-[28px]">{caseFeatured.school}</h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {caseFeatured.tags.map((t) => (
                      <span key={t} className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11.5px] text-white/85">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <p className="text-[14px] leading-[1.85] text-ink-700">
                  三个实验室共用一套实验管理平台与课程体系：AI 实验室承担通识与专业核心课，具身智能实验室做操作与移动的单项和集成实验，
                  工程实训中心接全校工程训练。设备、课程、师资与竞赛四项同步交付，因此三馆能排进同一张教学日历。
                </p>
                <dl className="mt-6 grid grid-cols-3 gap-4">
                  {caseFeatured.metrics.map((m) => (
                    <div key={m.k} className="border-l-2 border-brand/30 pl-3">
                      <dd className="text-[22px] font-bold leading-none tracking-tight text-ink-900">{m.v}</dd>
                      <dt className="mt-1.5 text-[11.5px] text-ink-400">{m.k}</dt>
                    </div>
                  ))}
                </dl>
                <div className="mt-7 space-y-2.5 border-t border-ink-900/[0.07] pt-6">
                  {[
                    { k: '建设形态', v: '院系级实训群（3 馆）' },
                    { k: '产品体系', v: '01 具身智能 · 03 AI 课堂 · 04 数字金融' },
                    { k: '部署方式', v: '校内私有化 + 统一身份认证对接' },
                  ].map((r) => (
                    <div key={r.k} className="flex flex-wrap items-baseline gap-x-4 text-[13.5px]">
                      <span className="w-[5.5em] shrink-0 text-ink-400">{r.k}</span>
                      <span className="min-w-0 text-ink-900">{r.v}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/#contact"
                  className="group mt-7 inline-flex items-center gap-2.5 rounded-full bg-ink-900 px-5 py-2.5 text-[13.5px] font-medium text-white transition-all duration-300 hover:bg-ink-800 hover:shadow-lift"
                >
                  索取该案例完整方案书
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08} className="mt-5">
          <p className="text-[12px] leading-relaxed text-ink-400">
            说明：院校名称与建设内容以对方对外公开口径为准。涉及具体采购范围、金额与验收细节的案例集，在商务洽谈阶段按需提供。
          </p>
        </Reveal>
      </PageSection>

      {/* ―― 合作院校墙 ―― */}
      <PageSection
        id="wall"
        tone="light"
        head={{
          n: '02',
          en: 'PARTNER LIST',
          zh: '部分合作院校',
          sub: '按院校类型看：不同定位的学校要解决的不是同一个问题 —— 双一流要新工科与科研支撑，职业本科要岗位能力与证书，中外合作要英文课程与引进体系。',
        }}
      >
        <Reveal>
          <div className="flex flex-wrap gap-2">
            {caseFilters.map((f) => {
              const on = f.id === filter
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={on}
                  className={`relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-300 ${
                    on ? 'text-white' : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="case-filter-active"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-ink-900"
                    />
                  )}
                  <span className="relative z-10 whitespace-nowrap">{f.label}</span>
                </button>
              )
            })}
          </div>
        </Reveal>

        <motion.div layout className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CaseTiles items={shown} />
        </motion.div>

        <Reveal delay={0.1} className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-900/[0.07] bg-mist-100 px-6 py-5">
            <p className="text-[13.5px] text-ink-500">
              以上为公开名录中的一部分。全部 <span className="font-semibold text-ink-900">100+</span> 所院校与学科分布可在洽谈时提供清单。
            </p>
            <Link to="/solutions" className="group inline-flex items-center gap-2 text-[13.5px] font-medium text-brand transition-colors hover:text-ink-900">
              按场景看解决方案
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </Reveal>
      </PageSection>

      {/* ―― 客户 logo 墙（自旧站「客户案例 · 合作客户」迁移）―― */}
      <PageSection
        id="logos"
        tone="light"
        head={{
          n: '03',
          en: 'CLIENT WALL',
          zh: '我们服务过的单位',
          sub: '以下 logo 来自旧站公开的客户案例墙，是这些年真实交付过的高校与金融机构 —— 白底 logo 原样保留，未经美化。院校之外，也把证券 / 期货 / 保险等行业客户一并列出，因为产业侧的实训需求同样是我们的一条主线。',
        }}
      >
        <ClientWall logos={clientLogos} />
      </PageSection>

      {/* ―― 成果出口 ―― */}
      <PageSection
        id="outcomes"
        tone="mist"
        head={{
          n: '04',
          en: 'WHAT COMES OUT',
          zh: '建完之后，成果从这四个口子出来',
          sub: '实验室的验收不该停在「设备到位」。四类出口是我们在方案阶段就与校方一起定下来的验收项。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {outcomes.map((o, i) => (
            <Reveal key={o.n} delay={i * 0.07}>
              <div className="group flex h-full flex-col rounded-2xl border border-ink-900/[0.07] bg-white p-7 shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] tabular-nums tracking-[0.2em] text-brand">{o.n}</span>
                  <h3 className="text-[18px] font-semibold tracking-tight text-ink-900">{o.title}</h3>
                </div>
                <p className="mt-3 text-[13.5px] leading-[1.85] text-ink-500">{o.desc}</p>
                <div className="mt-auto flex flex-wrap gap-x-8 gap-y-3 border-t border-ink-900/[0.07] pt-5">
                  {o.metric.map((m) => (
                    <div key={m.k}>
                      <p className="text-[18px] font-bold leading-none tracking-tight text-ink-900">{m.v}</p>
                      <p className="mt-1.5 text-[11.5px] text-ink-400">{m.k}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </PageSection>

      {/* ―― 服务网络 ―― */}
      <PageSection
        id="network"
        tone="light"
        head={{
          n: '05',
          en: 'SERVICE NETWORK',
          zh: '六城服务网络，驻校支持半径',
          sub: '实训设备的售后不是快递能解决的。深圳总部之外设五个服务节点，实施与教研按区域排人。',
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {offices.map((o, i) => (
            <Reveal key={o} delay={i * 0.05}>
              <div className="group relative overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-mist-100 px-5 py-6 text-center transition-all duration-500 hover:border-brand/30 hover:bg-white hover:shadow-lift">
                <span className="mx-auto block h-2 w-2 rounded-full bg-brand transition-transform duration-500 group-hover:scale-150" />
                <p className="mt-4 text-[14.5px] font-semibold tracking-tight text-ink-900">{o}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                  {i === 0 ? 'HEADQUARTERS' : 'SERVICE NODE'}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.12} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { k: '技术支持', v: '5×8 起，可升至 7×24 专人' },
              { k: '现场支持', v: '关键节点驻校，含开学首周' },
              { k: '备件与器材', v: '区域仓就近调拨' },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl border border-ink-900/[0.07] bg-white px-6 py-5 shadow-card">
                <p className="text-[12px] uppercase tracking-[0.16em] text-ink-400">{x.k}</p>
                <p className="mt-2 text-[14.5px] font-medium leading-snug text-ink-900">{x.v}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </PageSection>

      <PageCTA
        title="想看和你学校同类的那一份案例"
        sub="告诉我学校类型、专业方向与场地情况，我们按同类院校准备案例集与初版方案 —— 这一步不需要你先决定是否采购。"
        back={{ label: '看关于我们', to: '/about' }}
      />
    </>
  )
}

/* 案例墙：过滤时卡片位移而不是整块重绘，所以外层要 layout、
   内层要 key 稳定。AnimatePresence 只跟踪它直接子节点里带 key 的
   motion 元素，所以它得放在 map 的外面、grid 的里面 —— 拿一个
   自定义组件去包它，退场动画会静默失效 */
function CaseTiles({ items }) {
  return (
    <AnimatePresence mode="popLayout">
      {items.map((c) => (
        <motion.div
          key={c.name}
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.36, ease: EASE }}
          className="group relative overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white p-5 shadow-card transition-shadow duration-500 hover:shadow-lift"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15.5px] font-semibold leading-snug tracking-tight text-ink-900">{c.name}</h3>
            <span className="shrink-0 rounded-full bg-mist-100 px-2 py-0.5 text-[11px] text-ink-500">{c.type}</span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-400">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden className="text-brand">
              <path d="M6 10.5S2 7.2 2 4.6a4 4 0 1 1 8 0c0 2.6-4 5.9-4 5.9Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            {c.city}
          </p>
          <span className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-brand-600 to-brand-400 transition-transform duration-500 group-hover:scale-x-100" />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

/* 客户 logo 墙：旧站是白底 logo 卡，这里沿用“白卡 + object-contain”保证 logo 不变形。
   院校与产业客户分两组，中间用一行小标签隔开，避免 30 个 logo 混成一团。 */
function ClientWall({ logos }) {
  const schools = logos.filter((l) => l.kind === 'school')
  const corps = logos.filter((l) => l.kind === 'corp')
  return (
    <div className="space-y-8">
      <LogoGroup title="高校" items={schools} />
      <LogoGroup title="金融机构与产业客户" items={corps} />
    </div>
  )
}

function LogoGroup({ title, items }) {
  if (!items.length) return null
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px w-6 bg-brand/40" />
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">{title}</h3>
        <span className="text-[12px] text-ink-400">{items.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((l, i) => (
          <Reveal key={l.img} delay={i * 0.03}>
            <div className="group flex h-full flex-col items-center justify-center rounded-2xl border border-ink-900/[0.07] bg-white p-4 shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift">
              <div className="flex h-16 w-full items-center justify-center">
                <img
                  src={l.img}
                  alt={l.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-14 max-w-[82%] object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <p className="mt-3 line-clamp-2 text-center text-[12px] leading-snug text-ink-500">{l.name}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
