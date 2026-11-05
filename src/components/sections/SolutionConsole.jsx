import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Target, FlaskConical, Boxes, Layers, Waypoints, ChevronRight, GraduationCap } from 'lucide-react'
import { spotMove, SpotlightGlow } from '../ui'
import SolutionArchDiagram from './SolutionArchDiagram'

/* ============================================================
 * 单个实验教学方案的完整展开（浅色 · 全宽编辑式叙事）
 * ------------------------------------------------------------
 * 供解决方案页纵向堆叠调用：方案横幅（口号 / 主线链 / 目标 + 2×2 指标）
 * → 课程体系四层并排全展开（悬停某层联动架构图高亮）
 * → 实验室 / 实践四阶 / 架构图 / CTA 各自成带。
 * 每个方案块各自持有 hotLayer（课程层 ↔ 架构图联动），互不干扰。
 *
 * 浅色视觉纪律：分区底 mist，成段用白卡 + hairline 边框 + 柔和投影立
 * 层次；卡内再分格用 gap-px 发丝线（父层给 ink 底色、子格给白底）；
 * 品牌蓝只做点睛（当前段、层头计数、图标、培养目标）。动效在
 * prefers-reduced-motion 下由全局 CSS 收敛为静帧。
 * ============================================================ */

export default function PlanDetail({ plan }) {
  const [hotLayer, setHotLayer] = useState(null)
  return (
    <div className="space-y-5 md:mt-6 md:space-y-6">
      <PlanBanner plan={plan} />
      <CurriculumMatrix plan={plan} hotLayer={hotLayer} setHotLayer={setHotLayer} />
      <LabBand plan={plan} />
      <PracticeBand plan={plan} />
      <ArchBand plan={plan} hotLayer={hotLayer} />
      <PlanCTA plan={plan} />
    </div>
  )
}

/* ―― 方案横幅：左叙事（口号 / 目标 / 主线链）+ 右指标（2×2）―― */
function PlanBanner({ plan }) {
  const Icon = plan.icon
  return (
    <section className="relative overflow-hidden rounded-3xl border border-ink-900/[0.06] bg-white shadow-card">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-brand/[0.07] blur-3xl" />
      <div className="relative grid gap-8 p-6 md:p-9 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand text-white shadow-glow">
              <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
            </span>
            <p className="font-mono text-caption uppercase tracking-[0.24em] text-brand">方案 {plan.n} · {plan.en}</p>
          </div>
          <h3 className="mt-4 text-[26px] font-bold leading-[1.15] tracking-tight text-ink-900 md:text-[34px]">{plan.name}</h3>
          <p className="mt-2 text-ui text-ink-500">{plan.tagline}</p>

          <div className="mt-6 flex flex-wrap items-center gap-1.5">
            {plan.mainline.map((m, i) => (
              <div key={m} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-2 rounded-lg border border-ink-900/[0.07] bg-mist-100 px-3 py-1.5 text-ui-sm font-medium text-ink-800">
                  <span className="font-mono text-micro tabular-nums text-brand">{String(i + 1).padStart(2, '0')}</span>
                  {m}
                </span>
                {i < plan.mainline.length - 1 && <ChevronRight className="h-4 w-4 shrink-0 text-brand/50" strokeWidth={2.5} />}
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-ui leading-[1.9] text-ink-500">{plan.goal}</p>
        </div>

        <div className="flex flex-col">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink-900/[0.08]">
            {plan.metrics.map((m) => (
              <div key={m.k} className="bg-white p-5">
                <p className="text-ui-sm text-ink-400">{m.k}</p>
                <p className="mt-1.5 text-[26px] font-bold leading-none tracking-tight text-ink-900 md:text-[30px]">{m.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand/15 bg-brand-50 p-4">
            <GraduationCap className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.9} />
            <p className="text-ui-sm leading-snug text-ink-700">培养目标：<span className="font-semibold text-ink-900">{plan.positioning}</span></p>
          </div>
        </div>
      </div>
    </section>
  )
}

const LAYER_DESC = {
  base: '打底层：专业认知与基础方法，先会用、再懂原理。',
  core: '核心层：主干课程的实验技能，对应岗位核心能力。',
  adv: '进阶层：真实业务与综合建模，敢上强度、能出结果。',
  integrate: '创新层：综合项目、竞赛与科研，产出可展示的成果。',
}

/* ―― 课程体系建设：四层并排全展开，悬停联动架构图 ―― */
function CurriculumMatrix({ plan, hotLayer, setHotLayer }) {
  return (
    <section className="rounded-3xl border border-ink-900/[0.06] bg-white p-6 shadow-card md:p-9">
      <SectionHead icon={Layers} title="课程体系建设" en="Curriculum Matrix" hint="四层并排 · 悬停某层联动下方架构图" />
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plan.layers.map((layer, li) => {
          const on = hotLayer === layer.key
          return (
            <div
              key={layer.key}
              onMouseEnter={() => setHotLayer(layer.key)}
              onMouseLeave={() => setHotLayer(null)}
              onFocus={() => setHotLayer(layer.key)}
              className={`flex flex-col rounded-2xl border p-3 transition-all duration-300 ${on ? 'border-brand/40 bg-brand/[0.04]' : 'border-ink-900/[0.06] bg-mist-100/70'}`}
            >
              <div className="rounded-xl border border-ink-900/[0.06] bg-white px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-micro tabular-nums tracking-[0.16em] ${on ? 'text-brand' : 'text-ink-400'}`}>LAYER {String(li + 1).padStart(2, '0')}</span>
                  <span className={`rounded-full px-2 py-0.5 text-caption font-medium tabular-nums ${on ? 'bg-brand text-white' : 'bg-mist-200 text-ink-500'}`}>{layer.modules.length} 模块</span>
                </div>
                <h4 className="mt-1.5 text-ui-lg font-semibold tracking-tight text-ink-900">{layer.name}</h4>
                <p className="font-mono text-micro uppercase tracking-[0.16em] text-ink-400">{layer.en}</p>
              </div>
              <p className="mt-3 px-1 text-caption leading-relaxed text-ink-400">{LAYER_DESC[layer.key]}</p>
              <div className="mt-3 flex flex-col gap-2.5">
                {layer.modules.map((m) => (
                  <ModuleCard key={m.module} m={m} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ModuleCard({ m }) {
  return (
    <div onMouseMove={spotMove} className="group relative flex flex-col overflow-hidden rounded-xl border border-ink-900/[0.06] bg-white p-3.5 transition-all duration-300 hover:border-brand/30 hover:shadow-card">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <h5 className="text-ui font-semibold leading-snug tracking-tight text-ink-900">{m.module}</h5>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {m.projects.map((p) => (
          <span key={p} className="rounded-md bg-mist-100 px-1.5 py-0.5 text-caption leading-relaxed text-ink-500">{p}</span>
        ))}
      </div>
      <div className="mt-3 flex items-start gap-1.5 border-t border-ink-900/[0.06] pt-2.5 text-caption leading-snug text-ink-500">
        <Boxes className="mt-px h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2} />
        <span className="min-w-0">{m.product}</span>
      </div>
    </div>
  )
}

/* ―― 实验室建设：一块被发丝线切成三格的面板 ―― */
function LabBand({ plan }) {
  return (
    <section className="rounded-3xl border border-ink-900/[0.06] bg-white p-6 shadow-card md:p-9">
      <SectionHead icon={FlaskConical} title="实验室建设" en="Lab Spaces" hint="把课程落到能开门的真实空间" />
      <div className="mt-6 grid gap-px overflow-hidden rounded-2xl bg-ink-900/[0.08] sm:grid-cols-3">
        {plan.labs.map((lb, i) => (
          <div key={lb.name} onMouseMove={spotMove} className="group relative overflow-hidden bg-white p-5">
            <span className="font-mono text-caption tabular-nums tracking-label text-brand">SPACE {String(i + 1).padStart(2, '0')}</span>
            <h5 className="mt-2 text-ui-lg font-semibold leading-snug tracking-tight text-ink-900">{lb.name}</h5>
            <p className="mt-2 text-ui-sm leading-relaxed text-ink-500">{lb.desc}</p>
            <SpotlightGlow />
          </div>
        ))}
      </div>
    </section>
  )
}

/* ―― 实践教学四阶：编号流程面板 ―― */
function PracticeBand({ plan }) {
  return (
    <section className="rounded-3xl border border-ink-900/[0.06] bg-white p-6 shadow-card md:p-9">
      <SectionHead icon={Waypoints} title="实践教学体系建设" en="Four-Stage Practice" hint="实验教学 → 实训教学 → 竞赛演练 → 科研创新" />
      <div className="mt-6 grid gap-px overflow-hidden rounded-2xl bg-ink-900/[0.08] sm:grid-cols-2 lg:grid-cols-4">
        {plan.practice.map((st, i) => (
          <div key={st.stage} onMouseMove={spotMove} className="group relative overflow-hidden bg-white p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 font-mono text-ui-sm font-bold text-brand ring-1 ring-inset ring-brand/20">{i + 1}</span>
              <div>
                <h5 className="text-ui font-semibold tracking-tight text-ink-900">{st.stage}</h5>
                <p className="font-mono text-micro uppercase tracking-[0.16em] text-ink-400">{st.en}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {st.systems.map((s) => (
                <li key={s} className="flex items-start gap-2 text-ui-sm leading-snug text-ink-500">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                  <span className="min-w-0">{s}</span>
                </li>
              ))}
            </ul>
            <SpotlightGlow />
          </div>
        ))}
      </div>
    </section>
  )
}

/* ―― 架构图：带框图版 ―― */
function ArchBand({ plan, hotLayer }) {
  return (
    <section className="rounded-3xl border border-ink-900/[0.06] bg-white p-6 shadow-card md:p-9">
      <SectionHead icon={Target} title="方案架构图" en="Architecture" hint="自下而上：课程四层 → 培养目标，横向对齐主线与实践四阶" />
      <figure className="mt-6 rounded-2xl border border-ink-900/[0.06] bg-mist-100 p-4 md:p-7">
        <SolutionArchDiagram plan={plan} hovered={hotLayer} />
      </figure>
    </section>
  )
}

function PlanCTA({ plan }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-brand/15 bg-gradient-to-br from-brand-50 to-white p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <h4 className="text-title font-semibold tracking-tight text-ink-900 md:text-title">要把「{plan.short}」这套落到贵校？</h4>
          <p className="mt-1.5 text-ui text-ink-500">留下场地、专业与年级人数，方案顾问按这套体系出一份可对接课表的初稿。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/#contact" className="group inline-flex items-center gap-2.5 rounded-full bg-brand-action px-6 py-3 text-ui font-semibold text-white transition-all duration-300 hover:bg-brand-press hover:shadow-glow">
            索取完整方案书
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function SectionHead({ icon: Icon, title, en, hint }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand ring-1 ring-inset ring-brand/15">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <h4 className="text-[16.5px] font-semibold tracking-tight text-ink-900">{title}</h4>
      <span className="font-mono text-micro uppercase tracking-label text-ink-400">{en}</span>
      {hint && <span className="ml-auto hidden text-caption text-ink-400 lg:block">{hint}</span>}
    </div>
  )
}
