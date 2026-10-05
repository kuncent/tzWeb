import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { PageHero, InnerNav, PageSection, PageCTA } from '../components/PageShell'
import { Reveal, StatBand, EASE } from '../components/ui'
import { scrollToId } from '../hooks/useLenis'
import { solutionScenes, disciplineGroups, buildForms } from '../data/pages'
import { audiences, deliveryPath } from '../data/business'
import BusinessArchitecture from '../components/sections/BusinessArchitecture'

const SECTIONS = [
  { id: 'architecture', label: '业务架构' },
  { id: 'scenes', label: '按场景' },
  { id: 'disciplines', label: '按学科' },
  { id: 'audiences', label: '按对象' },
  { id: 'forms', label: '建设形态' },
  { id: 'delivery', label: '交付与部署' },
]

/* 左列选中态的滑动底色：layoutId 让它从上一行滑到下一行，
   而不是每行各自淡入淡出 —— 这类「连续位移」是动感的主要来源 */
function SceneRow({ scene, i, on, onPick }) {
  const Icon = scene.icon
  return (
    <button
      type="button"
      onMouseEnter={() => onPick(scene.id)}
      onFocus={() => onPick(scene.id)}
      onClick={() => onPick(scene.id)}
      aria-pressed={on}
      className="relative block w-full rounded-2xl px-5 py-4 text-left transition-colors duration-300"
    >
      {on && (
        <motion.span
          layoutId="scene-active"
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          className="absolute inset-0 rounded-2xl border border-brand/30 bg-white shadow-lift"
        />
      )}
      {!on && <span className="absolute inset-0 rounded-2xl border border-transparent" />}
      <span className="relative z-10 flex items-start gap-4">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${
            on ? 'bg-brand text-white' : 'bg-mist-200 text-ink-500'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-[10.5px] tabular-nums tracking-[0.18em] text-ink-400">{scene.n}</span>
            <span className={`text-[16px] font-semibold tracking-tight transition-colors ${on ? 'text-ink-900' : 'text-ink-700'}`}>
              {scene.name}
            </span>
          </span>
          <span className={`mt-1 block text-[12.5px] leading-relaxed ${on ? 'text-ink-500' : 'text-ink-400'}`}>{scene.en}</span>
        </span>
      </span>
    </button>
  )
}

function SceneDetail({ scene }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={scene.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.42, ease: EASE }}
        className="overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-soft"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-night">
          <img
            src={scene.img}
            alt={scene.name}
            width={scene.imgW}
            height={scene.imgH}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04070d]/85 via-[#04070d]/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-brand-300">{scene.en}</p>
            <h3 className="mt-1.5 text-[22px] font-bold tracking-tight text-white md:text-[26px]">{scene.name}</h3>
          </div>
          <div className="absolute right-5 top-5 hidden gap-4 rounded-xl border border-white/15 bg-black/25 px-4 py-2.5 backdrop-blur-sm sm:flex">
            {scene.metrics.map((m) => (
              <div key={m.k} className="text-center">
                <p className="text-[16px] font-bold leading-none tracking-tight text-white">{m.v}</p>
                <p className="mt-1 text-[10.5px] text-white/55">{m.k}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 md:p-7">
          <p className="text-[14.5px] leading-[1.85] text-ink-700">{scene.line}</p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-400">交付清单</p>
              <ul className="mt-3 space-y-2">
                {scene.deliver.map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-700">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-[3px] shrink-0 text-brand">
                      <path d="M2 6.5 4.8 9 10 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-400">建成后能拿到</p>
              <ul className="mt-3 space-y-2">
                {scene.outcome.map((o) => (
                  <li key={o} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-900">
                    <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand/70" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {scene.stack.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="rounded-full border border-ink-900/[0.08] bg-mist-100 px-3 py-1.5 text-[12px] text-ink-700 transition-colors duration-300 hover:border-brand/40 hover:bg-brand-50 hover:text-brand-700"
              >
                {s.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 border-t border-ink-900/[0.07] pt-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-400">常见对接院系</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-700">{scene.fit.join(' · ')}</p>
          </div>

          <Link
            to="/#contact"
            className="group mt-6 inline-flex items-center gap-2.5 rounded-full bg-ink-900 px-5 py-2.5 text-[13.5px] font-medium text-white transition-all duration-300 hover:bg-ink-800 hover:shadow-lift"
          >
            索取这套场景的方案书
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/* 首屏右半不是装饰：五类场景的目录直接摆在这里。点一行 = 选中那个场景
   + 跳到下方详情，省掉「先滚下去、再找是哪一格」那两步。 */
function HeroSceneRail({ scenes, onPick }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-white/40">Five scenarios</span>
        <span className="text-[11px] text-white/35">点击直达</span>
      </div>
      <ul>
        {scenes.map((s, i) => (
          <motion.li
            key={s.id}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.26 + i * 0.07, duration: 0.5, ease: EASE }}
          >
            <button
              type="button"
              onClick={() => onPick(s.id)}
              className="group flex w-full items-center gap-4 border-b border-white/[0.05] px-5 py-3 text-left transition-colors duration-300 hover:bg-white/[0.05] last:border-0"
            >
              <span className="font-mono text-[10.5px] tabular-nums text-brand-400/80">{s.n}</span>
              <span className="h-7 w-px shrink-0 bg-white/10 transition-colors duration-300 group-hover:bg-brand-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-white/85 transition-colors group-hover:text-white">{s.name}</span>
                <span className="mt-0.5 block truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/30">{s.en}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-white/25 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-brand-400" />
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

export default function Solutions() {
  const [pick, setPick] = useState(solutionScenes[0].id)
  const cur = solutionScenes.find((s) => s.id === pick)
  const [aud, setAud] = useState(audiences[0].id)
  const curAud = audiences.find((a) => a.id === aud)
  const AudIcon = curAud.icon

  const goScene = (id) => {
    setPick(id)
    scrollToId('scenes', -116)
  }

  return (
    <>
      <PageHero
        eyebrow="SOLUTIONS FOR UNIVERSITIES"
        crumbs="解决方案"
        title="按场景建实验室，按学科落课程"
        sub="五类建设场景、六个学科群、四类决策人 —— 同一套产品体系，从三个入口都能对号入座。选定之后看交付清单：里面每一项都是能验收的东西，不是概念。"
        stats={[
          { k: '建设场景', v: '5 类' },
          { k: '在跑实训系统', v: '37 套' },
          { k: '适用专业', v: '25 个' },
          { k: '合作高校', v: '100+' },
        ]}
        cta={[
          { label: '预约方案沟通', to: '/#contact', primary: true },
          { label: '看产品矩阵', to: '/#matrix' },
        ]}
      >
        <HeroSceneRail scenes={solutionScenes} onPick={goScene} />
      </PageHero>
      <InnerNav items={SECTIONS} />

      {/* ―― 业务架构：全页目录 ―― */}
      <PageSection
        id="architecture"
        tone="light"
        head={{
          n: '01',
          en: 'BUSINESS ARCHITECTURE',
          zh: '先看整套体系怎么搭',
          sub: '解决方案不是单个软件。从技术与算力底座，到产品体系，到面向不同处室的场景与对象，再到交付与成果认证 —— 四层自下而上，下面的每一节都对得上这里的一层。',
        }}
      >
        <BusinessArchitecture />
      </PageSection>

      {/* ―― 按场景 ―― */}
      <PageSection
        id="scenes"
        tone="mist"
        head={{
          n: '02',
          en: 'BY SCENARIO',
          zh: '先说清楚要建什么',
          sub: '左侧选一个场景，右侧换一整份交付内容。五个场景可以单独建，也可以叠成院系级实训群或校级创新中心。',
        }}
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-10">
          <div className="lg:sticky lg:top-[136px] lg:self-start">
            <div className="space-y-1 rounded-2xl bg-white/60 p-1.5">
              {solutionScenes.map((s, i) => (
                <SceneRow key={s.id} scene={s} i={i} on={s.id === pick} onPick={setPick} />
              ))}
            </div>
            <p className="mt-4 px-2 text-[12px] leading-relaxed text-ink-400">
              没找到对应场景？多数院校的第一版方案都是在已有场景上改出来的 —— 直接说场地和人数，我们出图。
            </p>
          </div>
          <SceneDetail scene={cur} />
        </div>
      </PageSection>

      {/* ―― 按学科 ―― */}
      <PageSection
        id="disciplines"
        tone="light"
        head={{
          n: '03',
          en: 'BY DISCIPLINE',
          zh: '按学科目录看：这个专业能开什么',
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

      {/* ―― 按对象 ―― */}
      <PageSection
        id="audiences"
        tone="mist"
        head={{
          n: '04',
          en: 'BY ROLE',
          zh: '同一件事，四个处关心的不一样',
          sub: '教务处要材料、学院要课堂、实训中心要设备与安全、信息中心要数据与运维。选一个身份，看我们准备的那一份说法。',
        }}
      >
        <Reveal>
          <div className="flex flex-wrap gap-2">
            {audiences.map((a) => {
              const on = a.id === aud
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAud(a.id)}
                  aria-pressed={on}
                  className={`relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-300 ${
                    on ? 'text-white' : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="sol-aud-active"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-ink-900"
                    />
                  )}
                  <span className="relative z-10 whitespace-nowrap">{a.role}</span>
                </button>
              )
            })}
          </div>
        </Reveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={curAud.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mt-8 rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-soft md:p-9"
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-white">
                    <AudIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-400">{curAud.en}</p>
                    <h3 className="text-[19px] font-semibold tracking-tight text-ink-900">{curAud.role}</h3>
                  </div>
                </div>
                <p className="mt-5 border-l-2 border-brand/40 pl-4 text-[14.5px] leading-[1.8] text-ink-700">{curAud.pain}</p>
                <div className="mt-6">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-400">他真正要的</p>
                  <ul className="mt-3 space-y-2">
                    {curAud.want.map((w) => (
                      <li key={w} className="flex items-start gap-2 text-[13.5px] leading-snug text-ink-700">
                        <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-brand" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-2xl bg-mist-100 p-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-400">对应产品</p>
                <ul className="mt-3 space-y-2.5">
                  {curAud.match.map((m) => (
                    <li key={m} className="flex items-start gap-2.5 text-[14.5px] font-medium leading-snug text-ink-900">
                      <span className="mt-[3px] inline-block h-4 w-[3px] shrink-0 rounded-full bg-brand/70" />
                      {m}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-ink-900/[0.07] pt-5">
                  <StatBand items={curAud.proof} cols="grid-cols-1 gap-y-5 sm:grid-cols-1" />
                </div>
                <Link
                  to={curAud.cta.to}
                  className="group mt-6 inline-flex items-center gap-2 text-[13.5px] font-medium text-brand transition-colors hover:text-ink-900"
                >
                  {curAud.cta.label}
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </PageSection>

      {/* ―― 建设形态 ―― */}
      <PageSection
        id="forms"
        tone="light"
        head={{
          n: '05',
          en: 'BUILDING FORMS',
          zh: '三种建设形态，对应三种预算周期',
          sub: '从一间实验室快建，到院系级实训群，再到全校开放的创新中心。规模不同，共用同一套技术底座，因此可以分期，不会推倒重来。',
        }}
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {buildForms.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal key={f.id} delay={i * 0.08}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white p-7 shadow-card transition-all duration-500 hover:-translate-y-1 hover:shadow-lift">
                  <span className="pointer-events-none absolute -right-6 -top-8 font-mono text-[92px] font-bold leading-none text-ink-900/[0.04] transition-colors duration-500 group-hover:text-brand/[0.09]">
                    {f.n}
                  </span>
                  <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-white transition-transform duration-500 group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="relative mt-5 text-[19px] font-semibold tracking-tight text-ink-900">{f.name}</h3>
                  <p className="relative mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-500">
                    <span>周期 <span className="font-medium text-ink-900">{f.cycle}</span></span>
                    <span>规模 <span className="font-medium text-ink-900">{f.scale}</span></span>
                  </p>
                  <p className="relative mt-4 text-[13.5px] leading-[1.8] text-ink-500">{f.line}</p>
                  <ul className="relative mt-5 space-y-2 border-t border-ink-900/[0.07] pt-5">
                    {f.parts.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-700">
                        <span className="mt-[6px] inline-block h-1 w-1 shrink-0 rounded-full bg-brand" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="relative mt-auto pt-6 text-[12px] text-ink-400">适合：{f.fitFor}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </PageSection>

      {/* ―― 交付与部署 ―― */}
      <PageSection
        id="delivery"
        tone="mist"
        head={{
          n: '06',
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
        sub="一次沟通通常能确定三件事：先建哪个场景、分几期、第一批课程能不能赶上这个学期的课表。方案初稿免费出。"
        back={{ label: '看技术底座', to: '/technology' }}
      />
    </>
  )
}
