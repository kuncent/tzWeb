import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  GraduationCap,
  Layers,
  LineChart,
  Phone,
  ReceiptText,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/ui'
import CompetitionSignup from '../components/sections/CompetitionSignup'
import CompetitionCountdown from '../components/sections/CompetitionCountdown'

/* ============================================================
 * 竞赛页 · 2026 年全国「数智财经综合应用大赛」
 * ------------------------------------------------------------
 * 文案来自组委会通知与赛事资料，不增补规则、不虚构数据。
 *
 * 版式：深色首屏 → 叠压数据条 → 白色正文分节。
 *   · 首屏居中：徽标 / 巨字（金色流光）/ 环节标签 / 双按钮 / 倒计时玻璃卡
 *   · 01 概览三卡、02 四大环节四卡、03 日程时间轴、04 奖项双卡
 *   · 05 报名：深色须知侧栏 + 白色表单卡
 * 卡片统一 18px 圆角、极细描边、悬浮上浮与图标变色。
 * ============================================================ */

const FEATURES = [
  {
    icon: Users,
    title: '以专业院校为单位',
    desc: '以专业院校为单位组织参赛，每支团队由 4 名学生组成，鼓励跨专业、跨系、跨学院组队，但不可跨校组队。',
  },
  {
    icon: Layers,
    title: '模拟真实市场博弈',
    desc: '依托模拟软件，在高度仿真、复杂多变的市场环境中开展多期经营决策，全程动态博弈、实时反馈。',
  },
  {
    icon: LineChart,
    title: '四维能力全面考查',
    desc: '考查选手的数据分析、业务洞察、管理决策与团队协作能力，实现「学、练、赛、评」一体化。',
  },
]

/* 四个竞赛环节 */
const STAGES = [
  {
    n: '01',
    icon: Briefcase,
    title: '企业数字化经营',
    desc: '战略规划、市场竞争与资源配置，在仿真市场中进行多期经营决策。',
    items: ['战略规划', '市场竞争', '资源配置'],
  },
  {
    n: '02',
    icon: ReceiptText,
    title: '财务',
    desc: '账务处理、报表分析与资金管理，构建企业财务全景视图。',
    items: ['账务处理', '报表分析', '资金管理'],
  },
  {
    n: '03',
    icon: ReceiptText,
    title: '税务',
    desc: '纳税申报、税务筹划与合规风控，把握政策边界与风险底线。',
    items: ['纳税申报', '税务筹划', '合规风控'],
  },
  {
    n: '04',
    icon: TrendingUp,
    title: '金融投资',
    desc: '投融资决策与碳金融，在资本与绿色金融的交汇处做出判断。',
    items: ['投融资决策', '碳金融'],
  },
]

const PHASES = [
  {
    n: '01',
    date: '2026.11.23 — 12.05',
    title: '报名阶段',
    desc: '以团队为单位登录大赛官网报名。组委会为参赛团队免费提供有限次数的训练账号和训练模板，供赛前练习使用。',
  },
  {
    n: '02',
    date: '2026.12.15',
    title: '区域赛',
    desc: '线上举行，时长 1 天。以区域赛实际参赛总团队数为基数，按得分排序评奖；一等奖团队原则上直接晋级总决赛，每所院校最多推荐 2 支队伍参加总决赛。',
  },
  {
    n: '03',
    date: '2026.12.16',
    title: '总决赛',
    desc: '时长 1 天，线上决赛，具体地点另行通知。晋级团队同台竞技，角逐最终奖项。',
  },
]

const ORGS = [
  { k: '指导单位', wide: false, items: ['广东省高等教育学会', '全国金融类专业虚仿课程虚拟教研室'] },
  { k: '主办单位', wide: false, items: ['广东省高等教育学会新商科实验教学专业委员会'] },
  {
    k: '承办单位',
    wide: true,
    items: [
      '金融虚拟仿真国家级实验教学中心（广东金融学院）',
      '山东大学',
      '深圳信息职业技术大学',
      '广州大学',
      '长春财经学院',
    ],
  },
  { k: '协办单位', wide: true, items: ['广州市黄埔区金融业协会', '粤港澳大湾区营商环境研究院', '深圳市天择教育科技有限公司'] },
]

const REGION_AWARDS = [
  { m: '一', tone: 'from-[#ffe9a8] to-[#e8b863] text-[#5c3d05]', name: '一等奖', pct: '前 10%' },
  { m: '二', tone: 'from-[#eef2f7] to-[#c3ccd9] text-[#3b4a5e]', name: '二等奖', pct: '10% — 30%' },
  { m: '三', tone: 'from-[#f7d4b5] to-[#d69a63] text-[#5c3a17]', name: '三等奖', pct: '30% — 60%' },
  { m: '优', tone: 'from-[#e3f0ff] to-[#b9d8f7] text-[#1f5f9e]', name: '优秀奖', pct: '若干名' },
]

const FINAL_AWARDS = [
  { m: '一', tone: 'from-[#ffe9a8] to-[#e8b863] text-[#5c3d05]', name: '一等奖', pct: '前 40%' },
  { m: '二', tone: 'from-[#eef2f7] to-[#c3ccd9] text-[#3b4a5e]', name: '二等奖', pct: '后 60%' },
]

const NOTICES = [
  '每支参赛团队由 4 名学生组成，每位选手限参加一个团队。',
  '鼓励跨专业、跨系、跨学院组队，但不可跨校组队。',
  '每队可配 1–2 名指导教师，指导教师可同时指导多个团队。',
  '报名须提交完整、真实的团队及成员资料。',
  '区域赛、总决赛前一周原则上不得更换参赛选手和指导教师；确需更换的，须提前提交盖有单位公章的书面说明，经组委会核实后决定是否批准。',
  '所有参赛团队须遵守诚信原则，一经发现弄虚作假，立即取消获奖资格并予以通报。',
]

const CONTACTS = [
  { name: '张老师', tel: '13751059857' },
  { name: '陈老师', tel: '13533759386' },
]

const STATS = [
  { v: '4', unit: '大', k: '竞赛环节' },
  { v: '4', unit: '人', k: '团队组队' },
  { v: '3', unit: '个', k: '比赛回合' },
  { v: '60', unit: '%', k: '区域赛获奖覆盖面' },
]

/* ―― 居中章节头：两侧金线 + 金色强调词 ―― */
function SectionHead({ en, title, desc }) {
  return (
    <Reveal className="mx-auto max-w-[760px] text-center">
      <span className="inline-flex items-center gap-2.5 text-[11.5px] font-bold uppercase tracking-[0.22em] text-[#b0812f]">
        <span className="h-px w-7 bg-[linear-gradient(90deg,transparent,#e8b863)]" aria-hidden />
        {en}
        <span className="h-px w-7 bg-[linear-gradient(90deg,#e8b863,transparent)]" aria-hidden />
      </span>
      <h2 className="mt-4 text-[26px] font-extrabold leading-[1.3] tracking-[-0.015em] text-[#0b2038] md:text-[38px]">
        {title}
      </h2>
      {desc && <p className="mt-4 text-[14.5px] leading-[1.95] text-[#5b6b82] md:text-[15.5px]">{desc}</p>}
    </Reveal>
  )
}

function Hero() {
  return (
    <>
      <section className="relative overflow-hidden bg-[radial-gradient(1200px_760px_at_50%_-12%,#1b4d80_0%,#0d2745_42%,#071426_100%)] px-6 pb-[120px] pt-[136px] text-center text-white">
        {/* 光斑 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="comp-float absolute -left-36 -top-32 h-[520px] w-[520px] rounded-full bg-[#4fd1ff]/25 blur-[90px]" />
          <div className="comp-float-slow absolute -bottom-36 -right-32 h-[460px] w-[460px] rounded-full bg-[#e8b863]/20 blur-[90px]" />
          <div className="comp-float absolute left-1/2 top-[58%] h-[380px] w-[380px] rounded-full bg-[#4878ff]/20 blur-[90px]" />
        </div>

        {/* 网格：只在中间显影 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(79,209,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(79,209,255,0.055)_1px,transparent_1px)] bg-[size:70px_70px] [mask-image:radial-gradient(circle_at_50%_42%,#000,transparent_74%)]"
        />

        <div className="relative mx-auto w-full max-w-[980px]">
          <Reveal>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.16] bg-white/[0.07] px-4 py-2 text-[12.5px] tracking-wide text-white/85 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-70 motion-reduce:animate-none" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
              </span>
              报名开放 · 11.23 00:00 — 12.05
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-7 font-black leading-[1.14] tracking-[-0.02em]">
              <span className="block text-[13px] font-semibold tracking-[0.32em] text-white/55">2026 全国</span>
              <span className="mt-4 block text-[clamp(32px,5.4vw,64px)]">
                <span className="hero-shine">数智财经</span>
                <span className="text-white">综合应用大赛</span>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mx-auto mt-6 max-w-[720px] text-[14.5px] leading-[1.95] text-white/70 md:text-[16.5px]">
              参赛团队扮演企业经营管理团队的不同角色，在高度仿真、复杂多变的市场环境中开展多期经营决策，
              企业数字化经营、财务、税务、金融投资四环节全程动态博弈。
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {['企业数字化经营', '财务', '税务', '金融投资'].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/[0.13] bg-white/[0.06] px-4 py-1.5 text-[12.5px] text-white/85"
                >
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="mt-9 flex flex-wrap justify-center gap-3.5">
              <Link
                to="/competition#signup"
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(135deg,#f9e2b4,#e8b863_60%,#cf9c37)] px-9 py-4 text-[15px] font-bold text-[#241704] shadow-[0_18px_40px_-14px_rgba(232,184,99,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-16px_rgba(232,184,99,1)]"
              >
                立即报名
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/competition#content"
                className="inline-flex items-center justify-center rounded-full border border-white/[0.22] bg-white/[0.07] px-9 py-4 text-[15px] font-semibold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.14]"
              >
                了解赛事
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="mt-11 inline-flex max-w-full flex-col items-center gap-4 rounded-[20px] border border-white/[0.11] bg-white/[0.045] px-8 py-6 backdrop-blur-xl">
              <CompetitionCountdown />
            </div>
          </Reveal>
        </div>

        <span
          aria-hidden
          className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] tracking-[0.26em] text-white/35"
        >
          SCROLL
          <span className="h-9 w-px bg-gradient-to-b from-white/50 to-transparent" />
        </span>
      </section>

      {/* 数据条：压住首屏底边 */}
      <div className="relative z-10 mx-auto -mt-14 w-full max-w-[1180px] px-6">
        <div className="grid grid-cols-2 gap-[2px] overflow-hidden rounded-[18px] bg-[#e3eaf3] shadow-[0_26px_60px_-32px_rgba(11,32,56,0.5)] md:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.k}
              className="bg-white px-5 py-7 text-center transition-colors duration-300 hover:bg-[linear-gradient(180deg,#fff,#f2f8ff)]"
            >
              <p className="bg-[linear-gradient(135deg,#0b2038,#2f6db0)] bg-clip-text text-[30px] font-extrabold leading-none tabular-nums text-transparent md:text-[36px]">
                {s.v}
                <span className="ml-1 text-[0.46em] font-bold">{s.unit}</span>
              </p>
              <p className="mt-2.5 text-[12.5px] tracking-wide text-[#5b6b82]">{s.k}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default function Competition() {
  return (
    <div className="bg-white">
      <Hero />

      {/* ―― 01 赛事概览 ―― */}
      <section id="about" className="scroll-mt-[96px] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <SectionHead
            en="About the Competition"
            title={
              <>
                以赛促学，<em className="not-italic text-[#b0812f]">四环节</em>全程博弈
              </>
            }
            desc="推动数字技术与财经教育深度融合，参赛团队在高度仿真的市场环境中连续完成企业数字化经营、财务、税务、金融投资四个环节的决策。"
          />

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <Reveal key={f.title} delay={i * 0.07}>
                  <div className="group relative h-full overflow-hidden rounded-[18px] border border-[#e3eaf3] bg-white p-7 transition-all duration-500 hover:-translate-y-2 hover:border-transparent hover:shadow-[0_28px_60px_-26px_rgba(11,32,56,0.32)]">
                    <span className="mb-5 grid h-[52px] w-[52px] place-items-center rounded-[14px] bg-[#eef6ff] text-[#1f5f9e] transition-all duration-500 group-hover:rotate-[-6deg] group-hover:bg-[#d9bd83] group-hover:text-[#241704]">
                      <Icon className="h-6 w-6" strokeWidth={1.9} />
                    </span>
                    <h3 className="text-[17.5px] font-extrabold text-[#0b2038]">{f.title}</h3>
                    <p className="mt-2.5 text-[13.5px] leading-[1.85] text-[#5b6b82]">{f.desc}</p>
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-[linear-gradient(90deg,#d9bd83,#4fd1ff)] transition-transform duration-500 group-hover:scale-x-100"
                    />
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ―― 组织机构 ―― */}
      <section id="org" className="bg-[linear-gradient(180deg,#fff,#f7fafe)] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <SectionHead
            en="Organizations"
            title="组织机构"
            desc="大赛设立组织委员会，下设专家委员会、裁判和仲裁委员会、竞赛秘书处，成员名单另行通知。"
          />

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {ORGS.map((o, i) => (
              <Reveal key={o.k} delay={i * 0.05} className={o.wide ? 'md:col-span-2' : ''}>
                <div className="group relative h-full overflow-hidden rounded-[18px] border border-[#e3eaf3] bg-white px-7 py-6 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_24px_50px_-28px_rgba(11,32,56,0.3)]">
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-0 top-0 w-[3px] bg-[linear-gradient(180deg,#e8b863,#2f6db0)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <h4 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#b0812f]">
                    <Building2 className="h-4 w-4" strokeWidth={1.9} />
                    {o.k}
                    <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(232,184,99,0.5),transparent)]" aria-hidden />
                  </h4>
                  <p className="mt-3.5 text-[14.5px] leading-[1.95] text-[#22364f]">
                    {o.items.map((t, k) => (
                      <span key={t}>
                        {k > 0 && <span className="mx-2.5 text-[#c3ccd9]">·</span>}
                        {t}
                      </span>
                    ))}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ―― 02 四大竞赛环节 ―― */}
      <section id="content" className="scroll-mt-[96px] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <SectionHead
            en="Competition Content"
            title={
              <>
                四大竞赛环节，<em className="not-italic text-[#b0812f]">全流程</em>实战演练
              </>
            }
            desc="竞赛聚焦数智财经综合应用，依托模拟软件在高度仿真、复杂多变的市场环境中开展多期经营决策。"
          />

          <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {STAGES.map((m, i) => {
              const Icon = m.icon
              return (
                <Reveal key={m.n} delay={i * 0.06}>
                  <div className="group relative h-full overflow-hidden rounded-[18px] border border-[#e3eaf3] bg-white p-7 transition-all duration-500 hover:-translate-y-2 hover:border-transparent hover:shadow-[0_28px_60px_-26px_rgba(11,32,56,0.32)]">
                    <span className="absolute right-5 top-3 select-none text-[46px] font-black leading-none tabular-nums text-[#0b2038]/[0.045]">
                      {m.n}
                    </span>
                    <span className="mb-5 grid h-[52px] w-[52px] place-items-center rounded-[14px] bg-[#eef6ff] text-[#1f5f9e] transition-all duration-500 group-hover:rotate-[-6deg] group-hover:bg-[#d9bd83] group-hover:text-[#241704]">
                      <Icon className="h-6 w-6" strokeWidth={1.9} />
                    </span>
                    <h3 className="text-[17.5px] font-extrabold text-[#0b2038]">{m.title}</h3>
                    <p className="mt-2.5 text-[13.5px] leading-[1.85] text-[#5b6b82]">{m.desc}</p>
                    <p className="mt-4 flex flex-wrap gap-x-2 text-[11px] text-[#9aa8bb]">
                      {m.items.map((it, k) => (
                        <span key={it}>
                          {k > 0 && <span className="mr-2 text-[#d5dde7]">/</span>}
                          {it}
                        </span>
                      ))}
                    </p>
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-[linear-gradient(90deg,#d9bd83,#4fd1ff)] transition-transform duration-500 group-hover:scale-x-100"
                    />
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ―― 03 竞赛日程 ―― */}
      <section id="schedule" className="scroll-mt-[96px] bg-[linear-gradient(180deg,#f7fafe,#fff)] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <SectionHead
            en="Schedule"
            title="竞赛日程"
            desc="组委会为参赛团队免费提供有限次数的训练账号和训练模板，建议报名后尽早开始模拟训练。"
          />

          <div className="relative mx-auto mt-14 max-w-[820px]">
            <span
              aria-hidden
              className="absolute bottom-2 left-[19px] top-2 w-[2px] bg-[linear-gradient(180deg,#e8b863,#4fd1ff,rgba(79,209,255,0.08))]"
            />

            {PHASES.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.07}>
                <div className="group relative pb-11 pl-16 last:pb-0 md:pl-[72px]">
                  <span className="absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border-2 border-[#d9bd83] bg-white text-[12.5px] font-extrabold tabular-nums text-[#b0812f] shadow-[0_0_0_6px_rgba(232,184,99,0.13)] transition-transform duration-300 group-hover:scale-110">
                    {p.n}
                  </span>

                  <div className="rounded-[14px] border border-[#e3eaf3] bg-white px-6 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#cfe0f2] hover:bg-[linear-gradient(180deg,#fff,#f8fbff)] hover:shadow-[0_20px_40px_-28px_rgba(11,32,56,0.35)]">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-[8px] bg-[#eef6ff] px-3 py-1 text-[12.5px] font-extrabold tabular-nums tracking-wide text-[#0b2038] transition-colors duration-300 group-hover:bg-[#e8b863]/15 group-hover:text-[#8a5c10]">
                        {p.date}
                      </span>
                      <h3 className="text-[16.5px] font-extrabold text-[#0b2038]">{p.title}</h3>
                    </div>
                    <p className="mt-2.5 text-[14px] leading-[1.85] text-[#5b6b82]">{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ―― 04 奖励办法 ―― */}
      <section id="award" className="scroll-mt-[96px] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <SectionHead
            en="Awards"
            title="奖励办法"
            desc="区域赛按得分排序设奖；另设优秀组织单位奖、优秀指导教师奖若干名。"
          />

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {/* 区域赛 */}
            <Reveal>
              <div className="h-full rounded-[18px] border border-[#e3eaf3] bg-white px-7 py-7 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_26px_54px_-30px_rgba(11,32,56,0.3)]">
                <h3 className="flex items-center gap-2.5 text-[18px] font-extrabold text-[#0b2038]">
                  <Trophy className="h-5 w-5 text-[#b0812f]" strokeWidth={1.9} />
                  区域赛
                </h3>
                <p className="mt-1.5 text-[12.5px] tracking-wide text-[#5b6b82]">
                  按得分排序 · 以实际参赛总团队数为基数
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  {REGION_AWARDS.map((a) => (
                    <div
                      key={a.name}
                      className="flex items-center gap-3.5 rounded-[12px] bg-[#f6f9fd] px-4 py-3 transition-all duration-300 hover:-translate-y-0 hover:translate-x-1 hover:bg-[#eef5ff]"
                    >
                      <span className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-gradient-to-br text-[15px] font-extrabold ${a.tone}`}>
                        {a.m}
                      </span>
                      <span className="flex-1 text-[14.5px] font-bold text-[#0b2038]">{a.name}</span>
                      <span className="text-[13px] font-semibold tabular-nums text-[#5b6b82]">{a.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* 总决赛 */}
            <Reveal delay={0.06}>
              <div className="relative h-full overflow-hidden rounded-[18px] bg-[linear-gradient(150deg,#0b2038,#123156_60%,#0a1c31)] px-7 py-7 text-white shadow-[0_30px_60px_-30px_rgba(11,32,56,0.7)]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-20 -top-20 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(232,184,99,0.28),transparent_70%)]"
                />
                <h3 className="relative flex items-center gap-2.5 text-[18px] font-extrabold">
                  <Trophy className="h-5 w-5 text-[#e8b863]" strokeWidth={1.9} />
                  总决赛
                </h3>
                <p className="relative mt-1.5 text-[12.5px] tracking-wide text-white/50">晋级团队同台竞技 · 线上决赛</p>

                <div className="relative mt-6 flex flex-col gap-3">
                  {FINAL_AWARDS.map((a) => (
                    <div
                      key={a.name}
                      className="flex items-center gap-3.5 rounded-[12px] bg-white/[0.06] px-4 py-3 transition-all duration-300 hover:translate-x-1 hover:bg-white/[0.11]"
                    >
                      <span className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-gradient-to-br text-[15px] font-extrabold ${a.tone}`}>
                        {a.m}
                      </span>
                      <span className="flex-1 text-[14.5px] font-bold">{a.name}</span>
                      <span className="text-[13px] font-semibold tabular-nums text-white/60">{a.pct}</span>
                    </div>
                  ))}
                </div>

                <div className="relative mt-7 flex items-center gap-2.5 border-t border-white/10 pt-5 text-[12.5px] text-white/45">
                  <CalendarDays className="h-4 w-4 text-[#e8b863]" strokeWidth={1.9} />
                  2026.12.16 · 1 天 · 线上
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <p className="mt-6 rounded-[14px] border border-dashed border-[#cfdcea] bg-[#f6f9fd] px-6 py-4 text-center text-[13.5px] text-[#5b6b82]">
              另设 <b className="font-bold text-[#0b2038]">优秀组织单位奖</b>、
              <b className="font-bold text-[#0b2038]">优秀指导教师奖</b> 若干名。获奖结果由主办单位以正式文件公布，并统一制作、颁发获奖证书。
            </p>
          </Reveal>
        </div>
      </section>

      {/* ―― 05 团队报名 ―― */}
      <section id="signup" className="scroll-mt-[96px] bg-[linear-gradient(180deg,#eef4fb,#f7fafe_60%,#fff)] py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <SectionHead
            en="Registration"
            title="团队报名"
            desc="报名时间：2026 年 11 月 23 日 — 12 月 05 日，请以团队为单位填写以下信息。"
          />

          <div className="mt-14 grid gap-7 lg:grid-cols-[330px_1fr]">
            {/* 须知侧栏：lg 起吸附在表单左侧，随表单滚动保持可见 */}
            <Reveal className="lg:h-full">
              <aside className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#0b2038,#123156)] px-7 py-7 text-white shadow-[0_30px_60px_-30px_rgba(11,32,56,0.65)] lg:sticky lg:top-[96px]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-24 -top-24 h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle,rgba(232,184,99,0.3),transparent_70%)]"
                />
                <h3 className="relative flex items-center gap-2.5 text-[17px] font-extrabold">
                  <span aria-hidden className="h-[17px] w-1 rounded-full bg-[linear-gradient(180deg,#f9e2b4,#e8b863)]" />
                  报名须知
                </h3>
                <ul className="relative mt-5 flex flex-col gap-4">
                  {NOTICES.map((t, i) => (
                    <li key={i} className="flex gap-3 text-[13px] leading-[1.8] text-white/75">
                      <span className="mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-[#e8b863]/[0.16] text-[10.5px] font-extrabold text-[#f7d9a0]">
                        {i + 1}
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative mt-6 border-t border-white/[0.11] pt-5">
                  <p className="text-[10.5px] uppercase tracking-[0.18em] text-white/40">报名咨询</p>
                  <div className="mt-3 flex flex-col">
                    {CONTACTS.map((c) => (
                      <a
                        key={c.tel}
                        href={`tel:${c.tel}`}
                        className="group flex items-center gap-2.5 py-2 text-[13.5px] font-semibold text-white transition-colors hover:text-[#f7d9a0]"
                      >
                        <Phone className="h-3.5 w-3.5 text-[#e8b863]" strokeWidth={2} />
                        {c.name}
                        <span className="tabular-nums">{c.tel}</span>
                        <span className="ml-auto text-[11px] font-normal text-white/35 transition-transform group-hover:translate-x-0.5">
                          点击拨打
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </aside>
            </Reveal>

            <Reveal delay={0.08}>
              <CompetitionSignup />
            </Reveal>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-[#8a97a8]">
            <GraduationCap className="h-4 w-4 text-[#b0812f]" strokeWidth={1.9} />
            主办单位：广东省高等教育学会新商科实验教学专业委员会
            <span className="ml-auto font-mono tabular-nums tracking-wide">2026.11.23</span>
          </div>
        </div>
      </section>
    </div>
  )
}
