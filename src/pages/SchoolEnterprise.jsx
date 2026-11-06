import { useEffect, useState } from 'react'
import { Users, BookOpenCheck, Microscope, GraduationCap, Award, Newspaper } from 'lucide-react'
import { Reveal } from '../components/ui'
import { scrollToId } from '../hooks/useLenis'

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

const SECTIONS = [
  ...partnershipBlocks.map((b) => ({ id: `pe-${b.id}`, label: b.zh.split(' · ')[0], n: b.n })),
  { id: 'pe-news', label: '合作动态', n: '06' },
]

/* 合作动态：真实校企合作新闻，全部来自各校官网公开报道与百度百科
   （词条引用源即天择教育科技公众号）。新增/删除只改这份数组；
   url 给官网原文，拿不到原文的引百科。按日期倒序排。 */
const BAIKE_URL = 'https://baike.baidu.com/item/%E6%B7%B1%E5%9C%B3%E5%B8%82%E5%A4%A9%E6%8B%A9%E6%95%99%E8%82%B2%E7%A7%91%E6%8A%80%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8/22226176'
const partnershipNews = [
  { date: '2025-06-25', org: '培华学院经济金融学院', title: '校政企携手，共筑《国际金融》课程建设新篇章',
    desc: '公司西北区负责人走进校园，与院校师生（含留学生）同上一堂校企共建的《国际金融》课。',
    src: { name: '培华学院官网', url: 'https://www.peihua.cn/phkjjrxy/info/1106/7981.htm' } },
  { date: '2025-06-18', org: '广州工商学院金融与贸易学院', title: '组织学生参访公司、国信证券投教基地与深圳证券交易所',
    desc: '金融科技认知实践课搬进企业一线，学生实地参访产业平台与交易所。',
    src: { name: '百度百科（引公众号）', url: BAIKE_URL } },
  { date: '2025-05-08', org: '广州华立学院数字金融学院', title: '金融科技系师生走访，落实专业实习岗位',
    desc: '系主任带队走访公司，公司计划为金融科技专业学生提供实习岗位。',
    src: { name: '广州华立学院官网', url: 'https://www.gzhs.edu.cn/info/1010/3672.htm' } },
  { date: '2025-04-16', org: '郑州科技学院财经学院', title: '走访公司，达成多项合作共识',
    desc: '围绕金融科技教育生态建设、专业课程优化、实训基地共建展开洽谈。',
    src: { name: '百度百科（引公众号）', url: BAIKE_URL } },
  { date: '2025-03-14', org: '贵州农业职业学院经济管理学院', title: '共建「AI+数字经管人才实习就业服务基地」',
    desc: '院长王亚新一行来访，就基地共建、人才培养、学科与专业建设展开深入探讨。',
    src: { name: '贵州农业职业学院官网', url: 'http://www.gzasc.edu.cn/jgxy/info/1496/3689.htm' } },
  { date: '2024-12-15', org: '广东省高等教育学会新商科实验教学专委会', title: '2024 学术年会 · 「天择奖」颁发',
    desc: '总经理曹阜兴围绕「AI 背景下新商科实验教学资源创新」主题发言，董事长曹胜利为获奖教师颁奖。',
    src: { name: '百度百科（引公众号）', url: BAIKE_URL } },
  { date: '2024-04-26', org: '贵州商学院', title: 'AI 金融与数字经济实践课程 · 师资研修沙龙',
    desc: '行业专家进校授课，覆盖金融大数据教学经验与 AI 大模型应用教学，学院教师全员参训。',
    src: { name: '贵州商学院官网', url: 'https://bs.gznc.edu.cn/info/1008/7541.htm' } },
  { date: '2024-03-20', org: '湖南人文科技学院金融学院', title: '校企合作交流',
    desc: '公司湖南总经理一行到访，金融工程教研室与教师代表参加，交流实训与就业合作。',
    src: { name: '湖南人文科技学院官网', url: 'https://www.huhst.edu.cn/sxx/info/1004/10998.htm' } },
  { date: '2024-01-02', org: '广州工商学院投资学教研室', title: '校外实践基地师生走访',
    desc: '投资学专业师生走进公司，了解行业用人需求与金融科技岗位实践。',
    src: { name: '广州工商学院官网', url: 'https://www.gzgs.edu.cn/sxy/info/1180/4168.htm' } },
  { date: '2023-04-10', org: '广东第二师范学院数学学院', title: '企业进校访问交流',
    desc: '公司到访学院，围绕校企协同育人与实践教学展开交流。',
    src: { name: '广东第二师范学院官网', url: 'https://www.gdei.edu.cn/2023/0412/c1325a81683/page.htm' } },
  { date: '2019-12-20', org: '南方科技大学数学系', title: '金融科技实践教学暨金融机构调研参访研讨会',
    desc: '南科大主办、天择教育科技承办，清华 SIGS、平安科技等机构共议金融科技实践教学。',
    src: { name: '南方科技大学数学系', url: 'https://math.sustech.edu.cn/news/11717.html?lang=zh' } },
]

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

/* 合作动态时间线：左侧竖线 + 节点，一条新闻一张卡；原文外链新窗口打开。 */
function PartnershipNews() {
  return (
    <section id="pe-news" className="scroll-mt-24 border-t border-ink-900/[0.07] py-12 md:py-14">
      <Reveal>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-white shadow-glow">
            <Newspaper className="h-[22px] w-[22px]" strokeWidth={1.8} />
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">06 · PARTNERSHIP NEWS</p>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900 md:text-[30px]">合作动态</h2>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-[15px] leading-[1.9] text-ink-500">
          校企合作的真实脚步：来访交流、课程共建、实习就业基地、产教融合论坛 —— 以下内容均来自各校官网公开报道与公司公众号，点击可查原文。
        </p>
      </Reveal>
      <ol className="relative mt-9 max-w-3xl border-l border-ink-900/[0.10] pl-6">
        {partnershipNews.map((news, i) => (
          <li key={`${news.date}-${news.org}`} className={`group relative ${i === partnershipNews.length - 1 ? '' : 'pb-8'}`}>
            <span className="absolute -left-[31px] top-[5px] h-2.5 w-2.5 rounded-full border-2 border-brand bg-white transition-colors group-hover:bg-brand" />
            <p className="font-mono text-[12px] tabular-nums text-ink-400">{news.date}</p>
            <h3 className="mt-1.5 text-[17px] font-semibold leading-snug tracking-tight text-ink-900">{news.title}</h3>
            <p className="mt-1 text-ui-sm font-medium text-brand">{news.org}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{news.desc}</p>
            <a
              href={news.src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center gap-1.5 text-ui-sm text-ink-400 underline-offset-4 transition-colors hover:text-brand hover:underline"
            >
              来源 · {news.src.name}
              <span aria-hidden className="text-[11px]">↗</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function SchoolEnterprise() {
  return (
    <>
      {/* 无首屏：进页即内容。顶垫避开 64px 固定导航栏；二级导航改为左侧竖直悬浮栏。 */}
      <div className="bg-white pt-[64px]">
        <div className="container-x py-12 md:py-16">
          <Reveal className="mb-10 md:mb-12">
            <h1 className="max-w-[24ch] text-3xl font-bold tracking-tight text-ink-900 md:text-[38px] md:leading-[1.18]">
              与学校全方位合作
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-[1.9] text-ink-500">
              会议、教材、课题、培训、比赛 —— 校企合作不是一次签约，而是这五条线持续地跑。每条线都有可交付的东西与清晰的对接方式，学校按自己的节奏挑着开始。
            </p>
          </Reveal>

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
              <PartnershipNews />
            </div>
          </div>
        </div>
      </div>

    </>
  )
}
