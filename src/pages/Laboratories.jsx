import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageHero, InnerNav, PageSection, PageCTA } from '../components/PageShell'
import { Reveal, StatBand, EASE } from '../components/ui'
import { embodiedProducts, labModules, labRigs, labCourseStages, labSafety } from '../data/pages'

/* 3D 转台单独切一个 chunk：three.js 不该为了一个内页进首页的入口包 */
const ModelViewer = lazy(() => import('../components/three/ModelViewer'))

const SECTIONS = [
  { id: 'rigs', label: '设备清单' },
  { id: 'modules', label: '交付六模块' },
  { id: 'courses', label: '课程体系' },
  { id: 'safety', label: '安全与开放' },
  { id: 'space', label: '空间与效果' },
]

/* 机型 = 产品参数（site.js）+ 3D 资产与用途（pages.js）按 code 拼一行 */
const rigs = embodiedProducts.map((p) => ({ ...p, ...(labRigs.find((r) => r.code === p.code) || { model: null, use: '' }) }))

function Stage({ rig }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#04070d]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-140px] h-[380px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.3),transparent)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(70%_70%_at_50%_45%,#000,transparent)]" />
      </div>

      {rig.model ? (
        <Suspense
          fallback={
            <div className="grid h-full min-h-[420px] place-items-center text-[12.5px] text-white/40">
              正在载入三维模型…
            </div>
          }
        >
          <ModelViewer src={rig.model} label={rig.name} className="relative h-[420px] w-full md:h-[520px]" />
        </Suspense>
      ) : (
        /* 没有对应三维资产的机型：宁可只摆参数，也不拿别的机型顶替 */
        <div className="relative grid min-h-[420px] place-items-center p-8 md:min-h-[520px]">
          <div className="w-full max-w-sm">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-brand-300">{rig.en}</p>
            <h4 className="mt-2 text-[22px] font-bold tracking-tight text-white">{rig.name}</h4>
            <p className="mt-3 text-[13.5px] leading-[1.8] text-white/55">{rig.desc}</p>
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4">
              {rig.specs.map(([k, v]) => (
                <div key={k} className="border-l border-white/12 pl-3">
                  <dt className="text-[11.5px] text-white/45">{k}</dt>
                  <dd className="mt-0.5 text-[16px] font-semibold tracking-tight text-white">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-[11.5px] leading-relaxed text-white/35">
              该机型为模组 / 单元形态，此处不附三维示意；实际外观与安装方式以方案书设备清单为准。
            </p>
          </div>
        </div>
      )}

      {/* HUD 角标：与首页首屏同一套语言，内页接得住首页的观感 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute left-4 top-4 h-5 w-5 border-l border-t border-white/20" />
        <span className="absolute right-4 top-4 h-5 w-5 border-r border-t border-white/20" />
        <span className="absolute bottom-4 left-4 h-5 w-5 border-b border-l border-white/20" />
        <span className="absolute bottom-4 right-4 h-5 w-5 border-b border-r border-white/20" />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">{rig.model ? 'drag to rotate · 可拖动旋转' : 'spec sheet · 参数卡'}</p>
      </div>
    </div>
  )
}

export default function Laboratories() {
  const [pick, setPick] = useState(rigs[0].code)
  const cur = rigs.find((r) => r.code === pick) || rigs[0]

  return (
    <>
      <PageHero
        eyebrow="LABORATORIES & TRAINING CENTERS"
        crumbs="实训实验室"
        title="实验室不是设备清单，是一整套能开课的系统"
        sub="空间、硬件、软件、课程、师资、竞赛六个模块一次交付。设备型号与参数全部公开，可拖动三维查看；课程按四阶段排到学期周次，验收时能拿出作品与证书。"
        stats={[
          { k: '落地实验室', v: '200+' },
          { k: '配套课程', v: '320+' },
          { k: '机器人机型', v: '6 类' },
          { k: '交付模块', v: '6 项' },
        ]}
        cta={[
          { label: '索取实验室规划', to: '/#contact', primary: true },
          { label: '看具身产品体系', to: '/#matrix' },
        ]}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          <img
            src="/images/iso_lab.webp"
            alt="高校科技实验室等距示意"
            width={448}
            height={272}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04070d]/70 via-transparent to-transparent" />
          <p className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            isometric layout · 交付形态示意
          </p>
        </div>
      </PageHero>

      <InnerNav items={SECTIONS} />

      {/* ―― 设备清单 + 3D ―― */}
      <PageSection
        id="rigs"
        tone="mist"
        head={{
          n: '01',
          en: 'HARDWARE ROSTER',
          zh: '六类机型，参数摆在明面上',
          sub: '从双足人形到开源轮式底盘，覆盖操作、移动、感知、算力四条实验线。选一型看三维与参数；成套配置按场地与人数在方案阶段定。',
        }}
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Reveal className="order-2 lg:order-1">
            <Stage rig={cur} />
          </Reveal>

          <div className="order-1 lg:order-2">
            <div className="space-y-1.5 rounded-2xl bg-white/70 p-1.5">
              {rigs.map((r) => {
                const on = r.code === pick
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setPick(r.code)}
                    onMouseEnter={() => setPick(r.code)}
                    aria-pressed={on}
                    className="relative block w-full rounded-xl px-4 py-3 text-left transition-colors"
                  >
                    {on && (
                      <motion.span
                        layoutId="lab-rig-active"
                        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-ink-900 shadow-lift"
                      />
                    )}
                    <span className={`relative z-10 flex items-baseline gap-3 ${on ? 'text-white' : 'text-ink-700'}`}>
                      <span className={`font-mono text-[10.5px] tabular-nums tracking-[0.14em] ${on ? 'text-brand-300' : 'text-ink-400'}`}>
                        {r.code}
                      </span>
                      <span className="text-[14.5px] font-semibold tracking-tight">{r.name}</span>
                      <span className={`ml-auto hidden text-[11.5px] sm:block ${on ? 'text-white/55' : 'text-ink-400'}`}>{r.tag}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-400">{cur.en}</p>
              <h3 className="mt-1.5 text-[20px] font-bold tracking-tight text-ink-900">{cur.name}</h3>
              <p className="mt-3 text-[13.5px] leading-[1.8] text-ink-500">{cur.desc}</p>
              <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
                {cur.specs.map(([k, v]) => (
                  <div key={k} className="border-l-2 border-brand/25 pl-3">
                    <dt className="text-[11.5px] text-ink-400">{k}</dt>
                    <dd className="mt-0.5 text-[15.5px] font-semibold tracking-tight text-ink-900">{v}</dd>
                  </div>
                ))}
              </dl>
              {cur.use && (
                <p className="mt-5 border-t border-ink-900/[0.07] pt-4 text-[13px] leading-relaxed text-ink-700">
                  <span className="font-medium text-ink-900">典型实验：</span>
                  {cur.use}
                </p>
              )}
            </div>
          </div>
        </div>
      </PageSection>

      {/* ―― 交付六模块 ―― */}
      <PageSection
        id="modules"
        tone="light"
        head={{
          n: '02',
          en: 'SIX DELIVERY MODULES',
          zh: '一间实验室的完整交付，是六件事',
          sub: '少任何一项，最后都会变成「设备到了但课开不起来」。这六项写进同一份合同，验收标准一并写清。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {labModules.map((m, i) => (
            <Reveal key={m.code} delay={i * 0.06}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift">
                <span className="pointer-events-none absolute -right-3 -top-6 font-mono text-[76px] font-bold leading-none text-ink-900/[0.045] transition-colors duration-500 group-hover:text-brand/[0.1]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="relative font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">{m.code}</p>
                <h3 className="relative mt-2 text-[18px] font-semibold tracking-tight text-ink-900">{m.name}</h3>
                <p className="relative mt-2.5 text-[13.5px] leading-[1.8] text-ink-500">{m.desc}</p>
                <span className="relative mt-5 block h-px w-10 bg-ink-900/12 transition-all duration-500 group-hover:w-full group-hover:bg-brand/40" />
              </div>
            </Reveal>
          ))}
        </div>
      </PageSection>

      {/* ―― 课程体系 ―― */}
      <PageSection
        id="courses"
        tone="mist"
        head={{
          n: '03',
          en: 'CURRICULUM LADDER',
          zh: '四阶段课程，直接排到学期周次',
          sub: '设备到位只是开始。每一阶段都给周次区间与产出物，教师拿到的是能写进教学日历的东西。',
        }}
      >
        <div className="relative">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, ease: EASE }}
            className="absolute left-0 right-0 top-[27px] hidden h-px origin-left bg-ink-900/12 lg:block"
          />
          <div className="grid gap-5 lg:grid-cols-4">
            {labCourseStages.map((s, i) => (
              <Reveal key={s.n} delay={0.1 + i * 0.08}>
                <div className="flex h-full flex-col rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="grid h-[54px] w-[54px] place-items-center rounded-full border border-ink-900/10 bg-white font-mono text-[13px] font-semibold tracking-[0.1em] text-brand">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-ink-900">{s.name}</h3>
                  <p className="mt-1.5 text-[12.5px] font-medium text-ink-400">{s.weeks}</p>
                  <p className="mt-3 text-[13.5px] leading-[1.75] text-ink-500">{s.desc}</p>
                  <p className="mt-auto pt-5 text-[12.5px] text-ink-700">
                    <span className="text-ink-400">产出：</span>
                    {s.out}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </PageSection>

      {/* ―― 安全与开放管理 ―― */}
      <PageSection
        id="safety"
        tone="light"
        head={{
          n: '04',
          en: 'SAFETY & OPEN ACCESS',
          zh: '设备越贵，越要把「不出事」写进流程',
          sub: '实训中心的追责压力比预算压力更大。四道机制把安全变成系统行为，而不是靠老师盯着。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {labSafety.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.title} delay={i * 0.07}>
                <div className="group h-full rounded-2xl border border-ink-900/[0.07] bg-mist-100 p-6 transition-all duration-500 hover:border-brand/30 hover:bg-white hover:shadow-lift">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand shadow-card transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-[16px] font-semibold tracking-tight text-ink-900">{s.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-[1.75] text-ink-500">{s.desc}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </PageSection>

      {/* ―― 空间与效果 ―― */}
      <PageSection
        id="space"
        tone="mist"
        head={{
          n: '05',
          en: 'SPACE & RESULT',
          zh: '建完之后长什么样',
          sub: '同一套模块在不同面积下的两种典型排布。实际布局按场地出图，这两张是方案阶段最常见的两种收敛结果。',
        }}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Reveal>
            <figure className="group overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-card">
              <div className="overflow-hidden">
                <img
                  src="/images/iso_lab.webp"
                  alt="院系级实训群等距示意"
                  width={448}
                  height={272}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="flex flex-wrap items-baseline gap-x-5 gap-y-1 px-6 py-4">
                <h3 className="text-[16px] font-semibold tracking-tight text-ink-900">院系级实训群</h3>
                <span className="text-[12.5px] text-ink-500">3–5 间 · 覆盖一个学院</span>
                <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-400">LAB GROUP</span>
              </figcaption>
            </figure>
          </Reveal>
          <Reveal delay={0.08}>
            <figure className="group overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-card">
              <div className="overflow-hidden">
                <img
                  src="/images/d_labiso.webp"
                  alt="数字孪生实验室等距示意"
                  width={550}
                  height={288}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="flex flex-wrap items-baseline gap-x-5 gap-y-1 px-6 py-4">
                <h3 className="text-[16px] font-semibold tracking-tight text-ink-900">虚实结合实训室</h3>
                <span className="text-[12.5px] text-ink-500">1 间 · 40–60 工位</span>
                <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-400">TWIN ROOM</span>
              </figcaption>
            </figure>
          </Reveal>
        </div>

        <Reveal delay={0.12} className="mt-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl border border-ink-900/[0.07] bg-white px-6 py-5 shadow-card">
            <StatBand
              items={[
                { k: '单馆建设面积', v: '5,000㎡' },
                { k: '服务学生', v: '5,000+' },
                { k: '课程数量', v: '300+' },
              ]}
              cols="sm:grid-cols-3"
              className="flex-1 gap-y-5"
            />
            <Link to="/cases" className="group inline-flex shrink-0 items-center gap-2 text-[13.5px] font-medium text-brand transition-colors hover:text-ink-900">
              看已建院校
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </Reveal>
      </PageSection>

      <PageCTA
        title="把场地照片和人数发我们"
        sub="方案阶段我们先出布局图与设备清单，再谈报价。这一步不收费，也不需要你先决定采购。"
        back={{ label: '看数字孪生底座', to: '/technology' }}
      />
    </>
  )
}
