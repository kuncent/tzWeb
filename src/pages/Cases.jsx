import { lazy, Suspense, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useInView, useReducedMotion } from 'motion/react'
import { PageHero, InnerNav, PageSection, PageCTA, HeroFrame } from '../components/PageShell'
import { Reveal } from '../components/ui'
import LabCases from '../components/sections/LabCases'
import PartnerDirectory from '../components/sections/PartnerDirectory'
import { clientLogos } from '../data/pages'
import { offices } from '../data/site'

/* ECharts 地图 + 粒子扩散单独切 chunk，不为了一个首屏把图表库打进入口包 */
const HeroCoverage = lazy(() => import('../components/sections/HeroCoverage'))

const SECTIONS = [
  { id: 'labcases', label: '实验室案例集' },
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

/* 首屏右半：不讲「谁在用」，只讲「我们在哪、辐射到哪」——暗色中国地图上，
   六个自有服务点（深圳总部 + 五服务节点）持续向外扩散粒子与涟漪，
   读作「以服务节点为中心向全国辐射覆盖」。组件懒加载，ECharts 单独切 chunk。 */
function HeroCoveragePanel() {
  const reduced = useReducedMotion()
  const wrapRef = useRef(null)
  const inView = useInView(wrapRef, { once: true, margin: '160px' })
  return (
    <HeroFrame label="服务网络 · Coverage" hint="6 城服务节点 · 辐射全国">
      <div ref={wrapRef} className="relative h-[340px] w-full sm:h-[360px]">
        {inView && (
          <Suspense fallback={<div className="grid h-full w-full place-items-center text-[12px] text-white/40">分布加载中…</div>}>
            <HeroCoverage reduced={reduced} />
          </Suspense>
        )}
      </div>
    </HeroFrame>
  )
}

export default function Cases() {
  return (
    <>
      <PageHero
        eyebrow="HIGHER EDUCATION CASES"
        crumbs="高校案例"
        title="180+ 所高校，26 个省市，30+ 学科"
        sub="这一页不打算用形容词。能公开的是院校名录与建设形态，需要授权才能讲的是具体采购内容 —— 所以我们把前者摆出来，后者按同类院校的案例集在洽谈阶段提供。"
        stats={[
          { k: '合作高校', v: '180+' },
          { k: '覆盖省市', v: '26' },
          { k: '覆盖学科', v: '30+' },
          { k: '培养学员', v: '100000+' },
        ]}
        cta={[
          { label: '索取同类院校案例集', to: '/#contact', primary: true },
          { label: '看四大方案', to: '/solutions#plans' },
        ]}
      >
        <HeroCoveragePanel />
      </PageHero>

      <InnerNav items={SECTIONS} />

      {/* ―― 标杆实验室建设案例集（浅色 · 自公司案例集迁移）―― */}
      <LabCases />

      {/* ―― 合作院校：完整名录（按省份聚类 + 层次分段 + 关键词检索，标杆院校并入其中）―― */}
      <PageSection
        id="wall"
        tone="light"
        head={{
          n: '02',
          en: 'PARTNER LIST',
          zh: '合作院校',
          sub: '可公开展示的合作院校完整名录：按省份聚类铺开，支持按本科 / 高职 / 中职层次分段与关键词检索，覆盖 24 个省级行政区、170+ 所院校，清华、浙大、上海交大等标杆院校亦在其中。',
        }}
      >
        <PartnerDirectory />

        <Reveal delay={0.1} className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-900/[0.07] bg-mist-100 px-6 py-5">
            <p className="text-[13.5px] text-ink-500">
              以上为公开名录中的一部分。全部 <span className="font-semibold text-ink-900">180+</span> 所院校与学科分布可在洽谈时提供清单。
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
          sub: '以下高校与金融机构的 logo 均为公开可核验的真实标识 —— 旧站案例墙沿用的白底 logo 原样保留，扩充院校的真实校徽取自公开图库；因只收录可核验的标识，故为全部 180+ 所合作院校中的一部分。院校之外，也把证券 / 期货 / 保险等行业客户一并列出，因为产业侧的实训需求同样是我们的一条主线。',
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
