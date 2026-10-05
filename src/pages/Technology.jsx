import { Link } from 'react-router-dom'
import { PageHero, InnerNav, PageSection, PageCTA } from '../components/PageShell'
import { Reveal, StatBand } from '../components/ui'
import { techDetail, techAssurance } from '../data/pages'
import { aiAgents, aiEngine } from '../data/site'
import { techLayers, techPipeline } from '../data/tech'

const SECTIONS = [
  { id: 'stack', label: '技术栈' },
  { id: 'bases', label: '四大底座' },
  { id: 'pipeline', label: '生成流水线' },
  { id: 'agents', label: '智能体与引擎' },
  { id: 'assurance', label: '安全与可靠性' },
  { id: 'open', label: '开放与二次开发' },
]

/* 四层技术栈与生成流水线已提到 data/tech.js 作单一真源，
   首页「技术架构剖面」共用同一份 —— 层名/组件/参数只维护一处 */
const stackLayers = techLayers
const pipeline = techPipeline

function StackRow({ layer, i }) {
  return (
    <Reveal delay={i * 0.08}>
      <div className="group relative grid gap-4 rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card transition-all duration-500 hover:border-brand/30 hover:shadow-lift md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-center">
        <div className="flex items-center gap-3 md:block">
          <span className="font-mono text-[10.5px] tabular-nums tracking-[0.2em] text-brand">{layer.n}</span>
          <h3 className="text-[17px] font-semibold tracking-tight text-ink-900 md:mt-1">{layer.name}</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 md:mt-0.5">{layer.en}</p>
        </div>
        <div>
          <ul className="flex flex-wrap gap-1.5">
            {layer.items.map((it) => (
              <li
                key={it}
                className="rounded-lg border border-ink-900/[0.07] bg-mist-100 px-2.5 py-1.5 text-[12.5px] text-ink-700 transition-colors duration-300 group-hover:border-brand/20 group-hover:bg-brand-50 group-hover:text-brand-700"
              >
                {it}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-400">{layer.note}</p>
        </div>
      </div>
    </Reveal>
  )
}

function BaseBlock({ base, i }) {
  const Icon = base.icon
  return (
    <Reveal delay={i * 0.05}>
      <div id={`base-${base.id}`} className="scroll-mt-[132px] overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="relative bg-[#04070d] p-7 text-white md:p-9">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 -top-16 h-[280px] w-[280px] rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.32),transparent)]" />
              <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(80%_80%_at_20%_10%,#000,transparent)]" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-[11px] tabular-nums tracking-[0.22em] text-white/40">{base.n}</span>
              </div>
              <h3 className="mt-5 text-[22px] font-bold leading-tight tracking-tight md:text-[25px]">{base.name}</h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brand-300/80">{base.en}</p>
              <p className="mt-4 text-[13.5px] leading-[1.85] text-white/60">{base.thesis}</p>
              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
                {base.specs.map((s) => (
                  <div key={s.k}>
                    <dd className="text-[16px] font-bold leading-none tracking-tight text-white">{s.v}</dd>
                    <dt className="mt-1.5 text-[11px] text-white/45">{s.k}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="p-7 md:p-9">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-400">由哪些部分组成</p>
            <ul className="mt-4 space-y-4">
              {base.parts.map((p) => (
                <li key={p.t} className="flex gap-3">
                  <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold tracking-tight text-ink-900">{p.t}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-500">{p.d}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-1.5 border-t border-ink-900/[0.07] pt-5">
              {base.models.map((m) => (
                <span key={m} className="rounded-full bg-mist-100 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  )
}

export default function Technology() {
  return (
    <>
      <PageHero
        eyebrow="TECHNOLOGY STACK"
        crumbs="技术方向"
        title="全栈自研的四个引擎，和它们撑起的课表"
        sub="多智能体编排、自然语言生成实验、设备级数字孪生、可信账本与数据底座 —— 四项都是自研内核，因此可以私有化、可以替换模型、可以按院系改流程。技术方向不是名词罗列，往下每一层都有可验证的参数。"
        stats={[
          { k: '自研引擎', v: '4 项' },
          { k: '发明专利', v: '4 项' },
          { k: '软件著作权', v: '60+' },
          { k: '可接入大模型', v: '4+ 家' },
        ]}
        cta={[
          { label: '索取技术白皮书', to: '/#contact', primary: true },
          { label: '看 AI 能力屏', to: '/#ai' },
        ]}
      >
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <img
            src="/images/tech_orb.webp"
            alt="全栈式技术矩阵示意"
            width={531}
            height={318}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      </PageHero>

      <InnerNav items={SECTIONS} />

      {/* ―― 技术栈 ―― */}
      <PageSection
        id="stack"
        tone="mist"
        head={{
          n: '01',
          en: 'STACK',
          zh: '四层技术栈，谁调用谁',
          sub: '从算力设备到课堂应用，中间隔着两层我们自己写的东西。这也是为什么同一套系统能同时给出云端版与全栈私有化版。',
        }}
      >
        <div className="space-y-4">
          {stackLayers.map((l, i) => (
            <StackRow key={l.n} layer={l} i={i} />
          ))}
        </div>
      </PageSection>

      {/* ―― 四大底座 ―― */}
      <PageSection
        id="bases"
        tone="light"
        head={{
          n: '02',
          en: 'FOUR ENGINES',
          zh: '四大底座逐个拆开',
          sub: '每一块给三样东西：它解决什么问题、由哪些部分组成、可验证的参数是多少。',
        }}
      >
        <div className="space-y-6">
          {techDetail.map((b, i) => (
            <BaseBlock key={b.id} base={b} i={i} />
          ))}
        </div>
      </PageSection>

      {/* ―― 生成流水线 ―― */}
      <PageSection
        id="pipeline"
        tone="mist"
        head={{
          n: '03',
          en: 'GENERATION PIPELINE',
          zh: '一句话到一堂课，中间只有五步',
          sub: '两阶段生成：先把大纲定下来，再装配课堂。分两阶段是为了让教师能在中间插手 —— 直接一步出课的系统的，老师改不动。',
        }}
      >
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white p-7 shadow-soft md:p-10">
            {/* 跑动的光段：一条实线打底，上面叠一段走动的虚线 */}
            <svg aria-hidden viewBox="0 0 1000 8" preserveAspectRatio="none" className="absolute left-0 right-0 top-[64px] hidden h-2 w-full lg:block">
              <line x1="0" y1="4" x2="1000" y2="4" stroke="#0b1220" strokeOpacity="0.1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="4" x2="1000" y2="4" stroke="#1677FF" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="90 910" className="arch-flow" />
            </svg>
            <div className="relative grid gap-6 lg:grid-cols-5">
              {pipeline.map((p, i) => (
                <div key={p.t} className="relative">
                  <span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-ink-900/10 bg-white font-mono text-[13px] font-semibold tabular-nums text-brand shadow-card">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 text-[15.5px] font-semibold tracking-tight text-ink-900">{p.t}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{p.d}</p>
                </div>
              ))}
            </div>
            <div className="relative mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-900/[0.07] pt-5 text-[12.5px] text-ink-500">
              <span>端到端耗时 <span className="font-semibold text-ink-900">≤ 40s</span></span>
              <span>课堂组件 <span className="font-semibold text-ink-900">4 类</span></span>
              <span>模型 <span className="font-semibold text-ink-900">可换 / 可本地化</span></span>
              <Link to="/#matrix" className="group ml-auto inline-flex items-center gap-2 font-medium text-brand transition-colors hover:text-ink-900">
                回看 AI 多智能体课堂
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </PageSection>

      {/* ―― 智能体与引擎 ―― */}
      <PageSection
        id="agents"
        tone="light"
        head={{
          n: '04',
          en: 'AGENTS & ENGINE',
          zh: '四种角色，四件事在后台跑',
          sub: '课堂里看得见的是角色，看不见的是引擎：调度、闭环、记忆与校准。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {aiAgents.map((a, i) => {
            const Icon = a.icon
            return (
              <Reveal key={a.role} delay={i * 0.06}>
                <div className="group h-full rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-[16px] font-semibold tracking-tight text-ink-900">{a.role}</h3>
                  <p className="mt-2 text-[13.5px] leading-[1.75] text-ink-500">{a.desc}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {aiEngine.map((e, i) => {
            const Icon = e.icon
            return (
              <Reveal key={e.title} delay={0.08 + i * 0.06}>
                <div className="flex h-full items-start gap-4 rounded-2xl bg-mist-100 p-6">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold tracking-tight text-ink-900">{e.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{e.desc}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </PageSection>

      {/* ―― 安全与可靠性 ―― */}
      <PageSection
        id="assurance"
        tone="mist"
        head={{
          n: '05',
          en: 'RELIABILITY & SECURITY',
          zh: '校园环境里的六条硬约束',
          sub: '信息中心问的问题就这六个。答案不在话术里，在部署形态与接口清单里。',
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {techAssurance.map((a, i) => {
            const Icon = a.icon
            return (
              <Reveal key={a.title} delay={i * 0.06}>
                <div className="group flex h-full items-start gap-4 rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900 text-white transition-colors duration-300 group-hover:bg-brand">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[15.5px] font-semibold tracking-tight text-ink-900">{a.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{a.desc}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </PageSection>

      {/* ―― 开放与二次开发 ―― */}
      <PageSection
        id="open"
        tone="light"
        head={{
          n: '06',
          en: 'OPEN & EXTENSIBLE',
          zh: '协议开放，接口开放，源码可选',
          sub: '开放的多智能体课堂协议与接口 —— 你可以只用我们的引擎，也可以只用自己的课件接进来。',
        }}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Reveal>
            <div className="h-full rounded-2xl border border-ink-900/[0.07] bg-white p-7 shadow-soft">
              <h3 className="text-[19px] font-semibold tracking-tight text-ink-900">给学校的三条接入路径</h3>
              <ul className="mt-5 space-y-4">
                {[
                  { t: '整包使用', d: '直接用平台已有课程与实验，教师只做取舍。最快，一学期能跑起来。' },
                  { t: '协议接入', d: '校本已有的课件与题库按标准描述文件接入，复用我们的课堂运行时。' },
                  { t: '源码授权', d: '需要深度定制或对外产品的院校，可谈源码授权与二次开发边界。' },
                ].map((x) => (
                  <li key={x.t} className="flex gap-3">
                    <span className="mt-[3px] inline-block h-4 w-[3px] shrink-0 rounded-full bg-brand/70" />
                    <span>
                      <span className="block text-[15px] font-semibold text-ink-900">{x.t}</span>
                      <span className="mt-1 block text-[13.5px] leading-relaxed text-ink-500">{x.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-ink-900/[0.07] pt-5">
                <StatBand
                  items={[
                    { k: '开放 API', v: 'REST + SDK' },
                    { k: '对接系统', v: '教务 / 统一认证' },
                    { k: '部署方式', v: '私有化 / 云端' },
                  ]}
                  cols="sm:grid-cols-3"
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            {/* 描述文件片段：B 端技术页最有说服力的一块东西就是真代码。
                这里给的是课堂描述文件的骨架，字段与首页 AI 屏一致 */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#04070d] shadow-soft">
              <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-2 font-mono text-[11px] text-white/40">lesson.manifest.json</span>
              </div>
              <pre className="no-scrollbar overflow-x-auto px-5 py-5 font-mono text-[12px] leading-[1.85] text-white/70">
{`{
  "protocol": "tianze-class/v1",
  "topic": "机械臂逆运动学",
  "outline": {
    "goals": ["理解 DH 参数", "推导正解", "实现逆解并上机"],
    "slices": 4
  },
  "components": ["slides", "quiz", "simulation", "project"],
  "agents": {
    "teacher": { "voice": "zh-CN-f", "board": true },
    "students": [{ "level": "advanced" }, { "level": "basic" }],
    "director": { "policy": "state-machine" }
  },
  "runtime": { "model": "local | deepseek | glm", "dataEgress": false }
}`}
              </pre>
              <div className="border-t border-white/[0.08] px-5 py-4">
                <p className="text-[12.5px] leading-relaxed text-white/45">
                  <span className="text-brand-300">dataEgress: false</span> —— 这一行是私有化部署的开关：课堂数据、学生答案与生成内容全部留在校园网内。
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </PageSection>

      <PageCTA
        title="要不要先看一次真实运行？"
        sub="技术沟通可以只讲架构，也可以直接开一堂课：现场给一个主题，看它 40 秒内变成能上的课，再看数据到底存在哪。"
        back={{ label: '看实验室清单', to: '/laboratories' }}
      />
    </>
  )
}
