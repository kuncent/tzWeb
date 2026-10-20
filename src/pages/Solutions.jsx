import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { PageHero, InnerNav, PageSection, PageCTA, HeroFrame } from '../components/PageShell'
import { Reveal } from '../components/ui'
import { scrollToId } from '../hooks/useLenis'
import { solutionPlans, disciplineGroups } from '../data/pages'
import { deliveryPath } from '../data/business'
import SolutionConsole from '../components/sections/SolutionConsole'

const SECTIONS = [
  { id: 'plans', label: '四大方案' },
  { id: 'disciplines', label: '学科对接' },
  { id: 'delivery', label: '交付与部署' },
]

/* 首屏右半：四大方案的「目录轨」。不是装饰 —— 它是这一页的主入口，
   悬停/点击即把下方主控台切到对应方案，并平滑滚过去。四张卡与主控台
   左轨共享同一份 solutionPlans，说法与数字天然一致，不会两处打架。 */
function HeroPlanRail({ plans, onPick }) {
  const [hover, setHover] = useState(0)
  return (
    <HeroFrame label="四大实验教学方案 · FOUR SOLUTIONS">
      {/* 顶部留一行呼吸位，让居中的标签胶囊浮在网格之上而不压到卡片文字 */}
      <div className="pt-9">
        <div className="grid grid-cols-2 gap-px bg-white/[0.06]">
        {plans.map((p, i) => {
          const Icon = p.icon
          const on = i === hover
          return (
            <button
              key={p.id}
              type="button"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => onPick(i)}
              className="group relative overflow-hidden bg-[#070b14] p-5 text-left transition-colors duration-300 hover:bg-[#0b1220]"
            >
              {on && (
                <motion.span
                  layoutId="hero-plan-active"
                  transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                  className="pointer-events-none absolute inset-0 rounded-xl border border-brand/40 bg-brand/[0.07]"
                />
              )}
              <span className="relative flex items-center gap-2">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors duration-300 ${on ? 'bg-brand text-white' : 'bg-white/[0.06] text-brand-300'}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">方案 {p.n}</span>
                  <span className="block truncate text-[15px] font-semibold tracking-tight text-white">{p.short}</span>
                </span>
              </span>
              <span className="relative mt-3 block text-[11.5px] leading-snug text-white/50">{p.tagline}</span>
              <span className="relative mt-3 flex items-center gap-1.5 text-[11.5px] font-medium text-brand-300/90">
                展开主控台
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </button>
          )
        })}
      </div>
      </div>
    </HeroFrame>
  )
}

export default function Solutions() {
  const [planIndex, setPlanIndex] = useState(0)

  const goPlan = (i) => {
    setPlanIndex(i)
    scrollToId('plans', -116)
  }

  return (
    <>
      <PageHero
        eyebrow="EXPERIMENTAL TEACHING SOLUTIONS"
        crumbs="解决方案"
        title="四大实验教学方案，把一个专业建进真实场景"
        sub="数字金融 · 数字经济 · 应用统计 · 智能机器人 —— 每个方案都给全：建设目标、课程模块 ↔ 实验项目 ↔ 支撑产品的四层矩阵、实验室空间、实践教学四阶递进与一张方案架构图。选定一个，右侧主控台整份换过来。"
        stats={[
          { k: '实验教学方案', v: '4 类' },
          { k: '在跑实训系统', v: '37 套' },
          { k: '适用专业', v: '25 个' },
          { k: '合作高校', v: '180+' },
        ]}
        cta={[
          { label: '预约方案沟通', to: '/#contact', primary: true },
          { label: '看产品矩阵', to: '/#matrix' },
        ]}
      >
        <HeroPlanRail plans={solutionPlans} onPick={goPlan} />
      </PageHero>
      <InnerNav items={SECTIONS} tone="light" />

      {/* ―― 01 四大方案主控台：本页主线 ―― */}
      <PageSection
        id="plans"
        tone="mist"
        head={{
          n: '01',
          en: 'FOUR SOLUTIONS',
          zh: '选定方向，看一整套怎么落地',
          sub: '顶部目录轨切换方案，下方按「目标定位 → 四层课程矩阵 → 实验室空间 → 四阶实践 → 架构图」整套往下展开。所有课程与产品数据都取自公司《实验教学解决方案》，不做数字加工。',
        }}
      >
        <SolutionConsole plans={solutionPlans} index={planIndex} onIndex={setPlanIndex} />
      </PageSection>

      {/* ―― 02 学科对接：专业目录 ↔ 方案（精简保留，给申报口径）―― */}
      <PageSection
        id="disciplines"
        tone="light"
        head={{
          n: '02',
          en: 'BY DISCIPLINE',
          zh: '按学科目录看：这个专业能接哪个方案',
          sub: '专业申报与培养方案论证要回答的是「这门专业配哪些课、哪些实验」。下面按学科群给出可直接引用的系统与课程方向，专业名称对齐现行本科专业目录。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {disciplineGroups.map((g, i) => {
            const Icon = g.icon
            return (
              <Reveal key={g.id} delay={i * 0.06}>
                <div className="group flex h-full flex-col rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">{g.en}</p>
                      <h3 className="truncate text-[16px] font-semibold tracking-tight text-ink-900">{g.name}</h3>
                    </div>
                  </div>
                  <ul className="mt-5 flex flex-wrap gap-1.5">
                    {g.majors.map((m) => (
                      <li key={m} className="rounded-full bg-mist-100 px-2.5 py-1 text-[12px] text-ink-700">{m}</li>
                    ))}
                  </ul>
                  <div className="mt-5 space-y-3 border-t border-ink-900/[0.07] pt-4 text-[13px] leading-relaxed">
                    <p className="text-ink-500">
                      <span className="text-ink-900">开什么课：</span>
                      {g.courses}
                    </p>
                    <p className="text-ink-500">
                      <span className="text-ink-900">用哪几套：</span>
                      {g.use.join(' / ')}
                    </p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
        <Reveal delay={0.1} className="mt-8">
          <p className="text-[12.5px] text-ink-400">
            学科覆盖 30+，未列出的学科按同一套方法映射：先定岗位能力，再倒推课程与实验。
          </p>
        </Reveal>
      </PageSection>

      {/* ―― 03 交付与部署 ―― */}
      <PageSection
        id="delivery"
        tone="mist"
        head={{
          n: '03',
          en: 'DELIVERY & DEPLOYMENT',
          zh: '签了之后怎么落地',
          sub: '六步交付路径，把方案落到首批开课。周期按一个院系的首批建设估算，多院系并行时第 02 步之后可以拆开走。',
        }}
      >
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {deliveryPath.map((s, i) => {
              const Icon = s.icon
              return (
                <div
                  key={s.n}
                  className="group rounded-2xl border border-ink-900/[0.07] bg-white p-5 transition-all duration-500 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-lift"
                  style={{ transitionDelay: `${i * 20}ms` }}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-ink-900/10 bg-white text-ink-700 transition-colors duration-300 group-hover:border-brand group-hover:text-brand">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-4 font-mono text-[10.5px] tabular-nums tracking-[0.18em] text-ink-400">{s.n}</p>
                  <h3 className="mt-0.5 text-[15px] font-semibold tracking-tight text-ink-900">{s.title}</h3>
                  <p className="mt-1.5 text-[12px] font-medium text-brand">{s.period}</p>
                </div>
              )
            })}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-ink-900/[0.07] bg-white px-6 py-4 shadow-card">
            <p className="text-[13.5px] text-ink-500">
              诊断到首批开课约 <span className="font-semibold text-ink-900">9–13 周</span>，验收出口为学科竞赛、1+X 证书与学生作品集。
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-5 text-[13.5px]">
              <Link to="/#delivery" className="group inline-flex items-center gap-2 font-medium text-brand transition-colors hover:text-ink-900">
                看完整交付路径
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </PageSection>

      <PageCTA
        title="把场地、专业和学生数告诉我们"
        sub="一次沟通通常能确定三件事：先建哪个方案、分几期、第一批课程能不能赶上这个学期的课表。方案初稿免费出。"
        back={{ label: '看技术底座', to: '/technology' }}
      />
    </>
  )
}
