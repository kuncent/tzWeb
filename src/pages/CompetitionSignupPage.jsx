import { ArrowLeft, GraduationCap, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/ui'
import CompetitionSignup from '../components/sections/CompetitionSignup'

/* ============================================================
 * 竞赛报名页 · /competition/signup
 * ------------------------------------------------------------
 * 原先是竞赛页末尾的 05 板块，现在单独成页：浅色底 + 报名须知侧栏 + 报名表。
 * 提交成功后由报名表内部提示「报名成功」，5 秒后自动回到竞赛页。
 * ============================================================ */

const NOTICES = [
  '每支参赛团队由 4 名学生组成，每位选手限参加一个团队。',
  '每所学校最多只能报名 4 支队伍。',
  '鼓励跨专业、跨系、跨学院组队，但不可跨校组队。',
  '每队可配 1–2 名指导教师，指导教师可同时指导多个团队。',
  '报名须提交完整、真实的团队及成员资料。',
  '初赛、决赛前一周原则上不得更换参赛选手和指导教师；确需更换的，须提前提交盖有单位公章的书面说明，经组委会核实后决定是否批准。',
  '所有参赛团队须遵守诚信原则，一经发现弄虚作假，立即取消获奖资格并予以通报。',
]

const CONTACTS = [
  { name: '张老师', tel: '13751059857' },
  { name: '陈老师', tel: '13533759386' },
]

export default function CompetitionSignupPage() {
  return (
    <div className="bg-[linear-gradient(180deg,#eef4fb,#f7fafe_45%,#fff)] pb-20 pt-[120px]">
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <Link
          to="/competition"
          className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#5b6b82] transition-colors hover:text-[#b0812f]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          返回竞赛页
        </Link>

        <Reveal className="mx-auto mt-9 max-w-[760px] text-center">
          <span className="inline-flex items-center gap-2.5 text-[11.5px] font-bold uppercase tracking-[0.22em] text-[#b0812f]">
            <span className="h-px w-7 bg-[linear-gradient(90deg,transparent,#e8b863)]" aria-hidden />
            Registration
            <span className="h-px w-7 bg-[linear-gradient(90deg,#e8b863,transparent)]" aria-hidden />
          </span>
          <h1 className="mt-4 text-[28px] font-extrabold leading-[1.3] tracking-[-0.015em] text-[#0b2038] md:text-[38px]">
            团队<em className="not-italic text-[#b0812f]">报名</em>
          </h1>
          <p className="mt-4 text-[14.5px] leading-[1.95] text-[#5b6b82] md:text-[15.5px]">
            报名时间：2026 年 11 月 23 日 — 12 月 10 日，请以团队为单位填写以下信息。
          </p>
        </Reveal>

        <div className="mt-12 grid gap-7 lg:grid-cols-[330px_1fr]">
          {/* 须知侧栏：lg 起吸附在表单左侧，随表单滚动保持可见 */}
          <Reveal className="lg:h-full">
            <aside className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#0b2038,#123156)] px-7 py-7 text-white shadow-[0_30px_60px_-30px_rgba(11,32,56,0.65)] lg:sticky lg:top-[96px]">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle,rgba(232,184,99,0.3),transparent_70%)]"
              />
              <h2 className="relative flex items-center gap-2.5 text-[17px] font-extrabold">
                <span aria-hidden className="h-[17px] w-1 rounded-full bg-[linear-gradient(180deg,#f9e2b4,#e8b863)]" />
                报名须知
              </h2>
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
    </div>
  )
}
