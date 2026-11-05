import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { PageHero, InnerNav, PageSection, PageCTA, HeroFrame } from '../components/PageShell'
import { scrollToId } from '../hooks/useLenis'
import { solutionPlans } from '../data/pages'
import PlanDetail from '../components/sections/SolutionConsole'

/* ―― 子导航即五大解决方案 ――
   去掉原来的「五大方案 / 学科对接 / 交付部署」三段式：子导航直接列出五个
   方案，点一条滚到对应那一屏；页面内容就是这五个方案各自完整展开、纵向堆叠。 */
const SECTIONS = solutionPlans.map((p) => ({ id: `plan-${p.id}`, label: p.short }))

/* 首屏右半：五大方案的「选路轨」。点一条滚到下方对应的方案屏。
   五条轨与下方方案块共享同一份 solutionPlans，说法与数字天然一致。 */
function HeroPlanRail({ plans }) {
  const [hover, setHover] = useState(0)
  const reduced = useReducedMotion()
  const pick = (p) => scrollToId(`plan-${p.id}`, -116)
  return (
    <HeroFrame index="01 / 06" label="五大实验教学方案 · FIVE SOLUTIONS" hint="悬停预览 · 点击跳转对应方案">
      <div className="pt-12">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 pb-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/32">Solution Matrix</p>
          <p className="font-mono text-[9px] tracking-[0.24em] text-brand-300/75">05 PLANS</p>
        </div>

        {plans.map((p, i) => {
          const Icon = p.icon
          const on = i === hover
          return (
            <motion.button
              key={p.id}
              type="button"
              initial={reduced ? false : { opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => pick(p)}
              className="group relative flex w-full items-center gap-3.5 border-b border-white/[0.05] px-5 py-[15px] text-left last:border-b-0"
            >
              {on && (
                <motion.span
                  layoutId="hero-plan-active"
                  transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                  className="pointer-events-none absolute inset-0 border-l-2 border-brand bg-brand/[0.07]"
                />
              )}
              <span className={`relative font-mono text-[10px] tabular-nums tracking-[0.18em] transition-colors duration-300 ${on ? 'text-brand-300' : 'text-white/28'}`}>
                {p.n}
              </span>
              <span className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors duration-300 ${on ? 'bg-brand text-white' : 'bg-white/[0.06] text-brand-300'}`}>
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-[15px] font-semibold tracking-tight text-white">{p.short}</span>
                  <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-white/28 xl:inline">{p.en}</span>
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] leading-snug text-white/45">{p.tagline}</span>
              </span>
              <ArrowRight
                className={`relative h-3.5 w-3.5 shrink-0 transition-all duration-300 ${on ? 'translate-x-0.5 text-brand-300' : '-translate-x-1 text-white/25'}`}
              />
            </motion.button>
          )
        })}
      </div>
    </HeroFrame>
  )
}

export default function Solutions() {
  return (
    <>
      <PageHero
        eyebrow="EXPERIMENTAL TEACHING SOLUTIONS"
        crumbs="解决方案"
        title="五大实验教学方案，把一个专业建进真实场景"
        sub="数字经济 · 金融科技 · 应用统计 · 大数据分析 · 工商科一体化平台 —— 每个方案都给全：建设目标、课程模块 ↔ 实验项目 ↔ 支撑产品的四层矩阵、实验室空间、实践教学四阶递进与一张方案架构图。选定一个，下方整份展开。"
        stats={[
          { k: '实验教学方案', v: '5 类' },
          { k: '在跑实训系统', v: '37 套' },
          { k: '适用专业', v: '25 个' },
          { k: '合作高校', v: '180+' },
        ]}
        cta={[
          { label: '预约方案沟通', to: '/#contact', primary: true },
          { label: '看产品体系', to: '/products' },
        ]}
      >
        <HeroPlanRail plans={solutionPlans} />
      </PageHero>

      <InnerNav items={SECTIONS} tone="light" />

      {/* ―― 五大方案纵向堆叠：一屏一个方案，各自完整展开 ―― */}
      {solutionPlans.map((p, i) => (
        <PageSection key={p.id} id={`plan-${p.id}`} tone={i % 2 === 0 ? 'mist' : 'light'}>
          <PlanDetail plan={p} />
        </PageSection>
      ))}

      <PageCTA
        title="把场地、专业和学生数告诉我们"
        sub="一次沟通通常能确定三件事：先建哪个方案、分几期、第一批课程能不能赶上这个学期的课表。方案初稿免费出。"
        back={{ label: '看产品体系', to: '/products' }}
      />
    </>
  )
}
