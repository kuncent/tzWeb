import { useEffect, useState } from 'react'
import { Users, BookOpenCheck, Microscope, GraduationCap, Award } from 'lucide-react'
import { Reveal } from '../components/ui'
import { scrollToId } from '../hooks/useLenis'
import NewsSection from '../components/sections/NewsSection'

/* ============================================================
 * 校企合作页
 * ------------------------------------------------------------
 * 导航位于「关于我们」之前。按「会议 / 教材 / 课题 / 培训 / 比赛」五个
 * 板块展开，做成数据驱动的图文版式：一条 partnershipBlocks 数组即整页
 * 内容 —— 加/删/改一个板块只动这一份，版式（左右交替、图注、要点清单）
 * 自动跟着走。每个板块留了 img 字段：填了放真图，留空则渲染主题视觉板，
 * 后续替换成实景照片不必再动结构。
 * ============================================================ */

const partnershipBlocks = [
  {
    id: 'conference',
    n: '01',
    icon: Users,
    en: 'CONFERENCES & FORUMS',
    zh: '学术会议 · 产教论坛',
    hue: '#7fb8ff',
    img: null,
    lead: '与企业、学会与高校共建行业口径的学术会议与产教融合论坛：把真实产业议题带进会场，把会议成果带回课堂。学校可挂牌承办、教师可提交论文、学生可随队观摩。',
    points: ['联合承办学科年会 / 闭门研讨会', '产业专家进校做主题报告', '会议论文集与案例回流教学资源'],
  },
  {
    id: 'textbook',
    n: '02',
    icon: BookOpenCheck,
    en: 'TEXTBOOK CO-BUILD',
    zh: '教材与课程资源共建',
    hue: '#4FC0E8',
    img: null,
    lead: '把在跑的实训系统、实验项目与企业真实案例，沉淀成可申报、可出版的教材与活页式课程资源。产业工程师与学校教师双主编，配套课件、实验手册与评价标准一体交付。',
    points: ['新形态教材 / 活页式实训指导书', '配套课程包、课件与实验手册', '对接 1+X 与专业教学标准'],
  },
  {
    id: 'project',
    n: '03',
    icon: Microscope,
    en: 'RESEARCH PROJECTS',
    zh: '科研课题与产学研合作',
    hue: '#3D7BFA',
    img: null,
    lead: '围绕纵向课题与横向企业需求，校企联合申报、共同攻关：企业提供场景与数据，学校出研究与人才，我们在中间做工程化与平台支撑，成果共享。',
    points: ['纵 / 横向课题联合申报', '产业真实数据与验证场景', '专利、软著与成果转化的工程支撑'],
  },
  {
    id: 'training',
    n: '04',
    icon: GraduationCap,
    en: 'FACULTY DEVELOPMENT',
    zh: '师资培训与认证',
    hue: '#9CC0FF',
    img: null,
    lead: '教师是先学会用、再学会教、最后能带项目。驻校培训 + 认证体系，把新设备、新课程与新的教法一次交给老师，并陪跑头几轮开课。',
    points: ['设备与平台上手培训', '教学法与课程设计工作坊', '双师素质认证与跟岗陪跑'],
  },
  {
    id: 'competition',
    n: '05',
    icon: Award,
    en: 'COMPETITIONS',
    zh: '学科竞赛与以赛促学',
    hue: '#6fd4ff',
    img: null,
    lead: '从赛项选题、集训方案到器材与场地保障一并交付，老师不必自己找题组队。竞赛成果再回流成下一届的教学案例，形成「学 — 练 — 赛 — 用」闭环。',
    points: ['赛项选题与集训方案设计', '器材、备件与场地保障', '获奖成果转化为教学案例'],
  },
]

const SECTIONS = partnershipBlocks.map((b) => ({ id: `pe-${b.id}`, label: b.zh.split(' · ')[0], n: b.n }))

/* 左侧竖直悬浮二级导航：sticky 在左栏，随滚动高亮当前板块，点击滚到对应位置。
   规则与顶部 InnerNav 一致（取顶部已越过基准线的最后一段）；窄屏没有左侧留白则隐藏，
   板块纵向堆叠靠滚动即可。 */
function SideNav({ items }) {
  const [active, setActive] = useState(items[0]?.id)
  useEffect(() => {
    const ids = items.map((s) => s.id)
    let raf = 0
    const measure = () => {
      raf = 0
      const line = 140
      let cur = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) cur = id
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = ids[ids.length - 1]
      setActive((prev) => (prev === cur ? prev : cur))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [items])

  const jump = (id) => scrollToId(id, -96)

  return (
    <nav className="sticky top-24 hidden self-start lg:block">
      <p className="mb-3 px-3 font-mono text-micro uppercase tracking-label text-ink-400">合作板块</p>
      <div className="flex flex-col gap-1">
        {items.map((s) => {
          const on = active === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              aria-current={on ? 'true' : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-ui transition-colors ${
                on ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:bg-white/70 hover:text-ink-900'
              }`}
            >
              <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`} />
              <span className={`font-mono text-caption tabular-nums ${on ? 'text-brand' : 'text-ink-400'}`}>{s.n}</span>
              <span className="min-w-0 truncate font-medium">{s.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* 板块视觉：填了 img 放真图（object-cover），留空则渲染主题视觉板。 */
function BlockFigure({ b }) {
  const Icon = b.icon
  if (b.img) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-ink-900/[0.07] shadow-card">
        <img src={b.img} alt={b.zh} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-ink-900/70 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-white backdrop-blur">{b.n}</span>
      </div>
    )
  }
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-night shadow-card">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[240px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[8px]" style={{ background: `radial-gradient(closest-side,${b.hue}33,transparent)` }} />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:38px_38px] [mask-image:radial-gradient(80%_80%_at_50%_40%,#000,transparent)]" />
        <span className="absolute right-4 top-2 select-none font-mono text-[92px] font-black leading-none text-white/[0.05]">{b.n}</span>
      </div>
      <div className="relative flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border" style={{ borderColor: `${b.hue}55`, background: `${b.hue}14`, color: b.hue }}>
          <Icon className="h-8 w-8" strokeWidth={1.7} />
        </span>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/45">{b.en}</p>
      </div>
    </div>
  )
}

export default function SchoolEnterprise() {
  return (
    <>
      {/* 无首屏：进页即内容。顶垫避开 64px 固定导航栏；二级导航改为左侧竖直悬浮栏。 */}
      <div className="bg-white pt-[64px]">
        <div className="container-x pt-12 md:pt-16">
          <Reveal className="mb-10 md:mb-12">
            <h1 className="max-w-[24ch] text-3xl font-bold tracking-tight text-ink-900 md:text-[38px] md:leading-[1.18]">
              与学校全方位合作
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-[1.9] text-ink-500">
              会议、教材、课题、培训、比赛 —— 校企合作不是一次签约，而是这五条线持续地跑。每条线都有可交付的东西与清晰的对接方式，学校按自己的节奏挑着开始。
            </p>
          </Reveal>
        </div>

        {/* 新闻资讯：原「关于我们」页的板块，现作为本页第一个板块 */}
        <NewsSection />

        <div className="container-x pb-12 md:pb-16">
          <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-12">
            <SideNav items={SECTIONS} />

            <div className="min-w-0">
              {partnershipBlocks.map((b, i) => {
                const Icon = b.icon
                const flip = i % 2 === 1
                return (
                  <section
                    key={b.id}
                    id={`pe-${b.id}`}
                    className={`scroll-mt-24 py-12 md:py-14 ${i === 0 ? 'pt-0' : 'border-t border-ink-900/[0.07]'}`}
                  >
                    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                      {/* 图文 */}
                      <Reveal className={flip ? 'lg:order-2' : ''}>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-glow" style={{ background: b.hue }}>
                              <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
                            </span>
                            <div>
                              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">{b.n} · {b.en}</p>
                              <h2 className="text-2xl font-bold tracking-tight text-ink-900 md:text-[30px]">{b.zh}</h2>
                            </div>
                          </div>
                          <p className="mt-5 text-[15px] leading-[1.9] text-ink-500">{b.lead}</p>
                          <ul className="mt-6 space-y-3">
                            {b.points.map((p) => (
                              <li key={p} className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-700">
                                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: b.hue }} />
                                <span className="min-w-0">{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Reveal>

                      {/* 图 */}
                      <Reveal delay={0.08} className={flip ? 'lg:order-1' : ''}>
                        <BlockFigure b={b} />
                      </Reveal>
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </div>
      </div>

    </>
  )
}
