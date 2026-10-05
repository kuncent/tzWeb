import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, BookOpenCheck, ChevronRight, GraduationCap } from 'lucide-react'
import {
  BankMark,
  CandlesMark,
  ChainMark,
  ChartMark,
  CloudMark,
  CodeMark,
  CoinMark,
  CubeMark,
  CreditMark,
  CrowdMark,
  DocMark,
  EcomMark,
  EtlMark,
  FxMark,
  GameMark,
  InsureMark,
  LedgerMark,
  MarketingMark,
  MiningMark,
  NeuralMark,
  P2pMark,
  RegulateMark,
  SupplyMark,
  TradeMark,
  VizMark,
} from './SystemGlyphs'
import { legacyPacks } from '../../data/legacySystems'
import { productMatrix } from '../../data/site'
import { requestProductContact } from '../../lib/aiEngine'

/* 旧平台迁移过来的两套体系（04 数字金融 / 05 数字经济）专用屏。
   要解决的问题：37 套系统不能写成一段话 —— 得能一眼看到有哪些、按什么分层、
   点开某套能读到它到底开哪些实验。

   形式为什么是「导轨 + 清单 + 就地展开」，不是卡片网格：
   钉屏那层里，竖立导航先吃掉一大半宽度，实测每屏只有 788×672（1280 视口）。
   这个宽度切掉 190 的导轨只剩 580，卡片网格排到两列就没地方了 —— 八套系统
   叠成两列卡片会把详情挤成一条缝。清单是这里唯一装得下的形式：一行一套、
   图标 + 名字 + 二级分类 + 实验条数，点一行就地展开它的原文清单。

   1) 左导轨不是普通 tab。金融那 5 类是平台自己标的市场链路（宏观监管→产品设计→
      发行→流通→参与主体），所以画成一条自上而下的脊线，顺序本身就是信息；
      经济那 3 类是三个技术篮子，同一条脊线也立得住。
   2) 图形入口按系统名 + 二级分类关键词映射到 25 个桶（见 legacySystems.js）。
      图标只当提示用：默认压成 ink-400，展开那行才升到 brand，避免一屏彩色图标糊成剪贴画墙。
   3) 展开区放平台原文（简介首句 / 适用专业 / 适用课程 / 实验项目章节 + 学时），不改写不归纳。
      内容装不下就内部滚动（data-lenis-prevent），不裁字 —— 钉屏高度是死的。 */

const pad = (i) => String(i + 1).padStart(2, '0')
const EASE = [0.22, 1, 0.36, 1]
/* 与 ProductMatrix 内同一口径：传入 0 基索引，序号条打的是 1 基 */
const LAST = productMatrix.length - 1

/* 图形入口注册表：桶名 ← legacySystems.js 的 glyph 字段（映射表在生成器
   tmp/gen-legacy-systems.mjs 的 GLYPHS 里）。标记本体在同目录 SystemGlyphs.jsx，
   不在 lucide 里 —— 行业形状（征信仪表 / K 线 / 供应链链节）没有现成可用的。
   桶名两边必须对得上，跑 node tmp/glyph-check.mjs 校。 */
const ICONS = {
  bank: BankMark,
  ledger: LedgerMark,
  regulate: RegulateMark,
  credit: CreditMark,
  candles: CandlesMark,
  trade: TradeMark,
  fx: FxMark,
  supply: SupplyMark,
  insure: InsureMark,
  marketing: MarketingMark,
  crowd: CrowdMark,
  p2p: P2pMark,
  etl: EtlMark,
  mining: MiningMark,
  viz: VizMark,
  chart: ChartMark,
  cloud: CloudMark,
  cube: CubeMark,
  nn: NeuralMark,
  code: CodeMark,
  doc: DocMark,
  ecom: EcomMark,
  game: GameMark,
  chain: ChainMark,
  coin: CoinMark,
}
const glyph = (key) => ICONS[key] || CubeMark
const groupGlyph = (g) => glyph(g.systems[0]?.glyph)

/* 展开区：一列读起来太长的三块内容并排 —— 左边适用范围，右边实验大纲
   roomy = 当前分类只有一两套。只有这种情况下清单区才有富余高度，
   让展开面板把它吃掉；十几套的时候必须封顶（152px），否则第一行的详情
   一个人占满整个清单窗口，其余各行全被顶到滚动区下面去 */
function Expanded({ s, group, roomy }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.34, ease: EASE }}
      className={`flex flex-col overflow-hidden ${roomy ? 'grow' : ''}`}
    >
      <div className={`flex flex-col border-t border-white/[0.06] pb-3.5 pt-2.5 pl-[34px] ${roomy ? 'min-h-0 grow' : ''}`}>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="font-mono text-[11px] tracking-[0.14em] text-brand-300">{s.code}</span>
          {s.tag && <span className="text-[12.5px] text-ink-400">‹ {s.tag} ›</span>}
          <span className="ml-auto flex items-center gap-2">
            {s.hours && <span className="font-mono text-[11.5px] tabular-nums text-brand-200">{s.hours} 学时</span>}
            <span className="font-mono text-[11.5px] tabular-nums text-ink-400">{s.projectCount} 条实验</span>
          </span>
        </div>
        <p className="mt-1.5 text-[13px] leading-[1.7] text-ink-400">{s.intro}</p>

        <div className={`mt-2.5 grid gap-4 md:grid-cols-2 ${roomy ? 'min-h-0 grow' : ''}`}>
          <div className="min-w-0 space-y-2.5">
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-400">
                <GraduationCap className="h-3 w-3" /> 适用专业
                {s.majorTotal > s.majors.length && <span className="font-mono tracking-normal text-ink-500">共 {s.majorTotal} 个</span>}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1">
                {s.majors.map((m) => (
                  <li key={m} className="rounded-md border border-white/[0.08] bg-white/[0.035] px-1.5 py-0.5 text-[12.5px] text-white/70">
                    {m}
                  </li>
                ))}
                {s.majorTotal > s.majors.length && (
                  <li className="rounded-md border border-dashed border-white/[0.12] px-1.5 py-0.5 text-[12.5px] text-ink-400">
                    +{s.majorTotal - s.majors.length}
                  </li>
                )}
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-400">
                <BookOpenCheck className="h-3 w-3" /> 适用课程
                {s.courseTotal > s.courses.length && <span className="font-mono tracking-normal text-ink-500">共 {s.courseTotal} 门</span>}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                {s.courses.map((c) => (
                  <li key={c} className="flex items-start gap-1 text-[12.5px] leading-snug text-white/70">
                    <span className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-brand/60" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <p className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-400">
              实验项目大纲 <span className="font-mono tracking-normal text-ink-500">· 平台原文</span>
            </p>
            {s.chapters.length ? (
              <div className={`mt-1.5 space-y-2 overflow-y-auto pr-1 ${roomy ? 'min-h-0 max-h-[420px] grow' : 'max-h-[152px] shrink-0'}`} data-lenis-prevent>
                {s.chapters.map((ch) => (
                  <div key={ch.t}>
                    <p className="text-[12.5px] font-semibold text-white/85">{ch.t}</p>
                    <ul className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
                      {ch.items.map((it, k) => (
                        <li key={it} className="flex items-baseline gap-1 text-[12.5px] text-ink-400">
                          <span className="font-mono text-[11px] text-ink-500">{pad(k)}</span>
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-ink-500">该平台未在此系统下标注实验项目清单，只保留了分类与适用课程口径。</p>
            )}
          </div>
        </div>
        <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-500">{group.l1} · 平台一级分类原文</p>
      </div>
    </motion.div>
  )
}

function Row({ s, g, open, onPick, roomy }) {
  const Icon = glyph(s.glyph)
  return (
    /* 展开那一行 grow：只在分类里套数很少时给 —— 见 Expanded 上方那段注释。
       行多的时候富余是负的，给了 grow 也只会把第一行详情撑满整屏 */
    <div className={`flex min-w-0 flex-col ${open && roomy ? 'grow' : ''}`}>
      <button
        onClick={() => onPick(s.code)}
        aria-expanded={open}
        className={`group/row relative flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/70 ${
          open ? 'border-brand/40 bg-brand/[0.1]' : 'border-transparent hover:border-white/15 hover:bg-white/[0.04]'
        }`}
      >
        <span
          className={`grid h-[28px] w-[28px] shrink-0 place-items-center rounded-lg border transition-colors duration-300 ${
            open ? 'border-brand/40 bg-brand text-white' : 'border-white/[0.07] bg-white/[0.04] text-ink-400 group-hover/row:text-brand-200'
          }`}
        >
          <Icon className="h-[17px] w-[17px]" strokeWidth={1.6} />
        </span>
        <span className={`min-w-0 flex-1 truncate text-[13.5px] ${open ? 'text-white' : 'text-white/80'}`}>{s.name}</span>
        <span className="hidden shrink-0 truncate text-[12.5px] text-ink-500 sm:block sm:w-[86px]">{s.tag}</span>
        <span className={`w-[34px] shrink-0 text-right font-mono text-[12px] tabular-nums ${open ? 'text-brand-200' : 'text-ink-400'}`}>
          {s.projectCount || '—'}
        </span>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-ink-500 transition-transform duration-300 ${open ? 'rotate-90 text-brand-300' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>{open && <Expanded s={s} group={g} roomy={roomy} />}</AnimatePresence>
    </div>
  )
}

export default function SystemsScreen({ p, i, withIndex }) {
  const pack = legacyPacks[p.systems] || legacyPacks.finance
  const Icon = p.icon
  const [sel, setSel] = useState(0)
  /* open 存的是系统编号：切分类时重置成该分类第一套，屏上永远有一段可读详情，
     不会出现「点开这屏只见列表不见内容」的空档 */
  const [open, setOpen] = useState(pack.groups[0].systems[0].code)
  const allOn = sel === -1
  const group = pack.groups[sel] || pack.groups[0]
  /* 全部那一档：每行要带自己的一级分类，展开区右下角那行来源得跟着变 */
  const flat = useMemo(() => pack.groups.flatMap((g) => g.systems.map((s) => ({ ...s, g }))), [pack])
  const rows = allOn ? flat : group.systems

  const pickGroup = (k) => {
    setSel(k)
    setOpen((k === -1 ? flat[0] : pack.groups[k].systems[0]).code)
  }

  return (
    <div className="relative flex h-full flex-col justify-center">
      <span className="pointer-events-none absolute -top-6 right-0 select-none text-[110px] font-bold leading-none text-white/[0.04] xl:text-[150px]">
        {pad(i)}
      </span>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* 标题带 */}
        <div className="shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-white shadow-glow">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-brand-400">{p.en}</p>
              {withIndex && (
                <p className="text-[12.5px] tabular-nums text-ink-400">
                  {pad(i)} / {pad(LAST)}
                </p>
              )}
            </div>
          </div>
          <h3 className="mt-3 text-[23px] font-bold tracking-tight text-white md:text-[28px] xl:text-[34px]">{p.title}</h3>
          <p className="mt-1.5 text-[14px] font-medium text-brand-300 xl:text-[15px]">{p.tagline}</p>
          <p className="mt-1.5 max-w-3xl text-[13px] leading-[1.75] text-ink-400">{p.desc}</p>
        </div>

        {/* 导轨 + 清单
            grid-rows-[minmax(0,1fr)] 不能省：grid 的行默认是 auto，挂了 min-h-0 也会被
            内容撑高，整屏就溢出到 sticky 底边外面被裁 —— 钉屏里看着“没报错”但底下缺一段 */}
        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,190px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] xl:gap-5">
          {/* 左：分类脊线 */}
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0">
            {pack.groups.map((g, k) => {
              const on = k === sel
              return (
                <button
                  key={g.id}
                  onClick={() => pickGroup(k)}
                  aria-pressed={on}
                  className={`relative flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors duration-300 lg:rounded-none lg:border-0 lg:bg-transparent lg:py-3 ${
                    on ? 'border-brand/40 bg-brand/[0.12] lg:bg-transparent' : 'border-white/[0.07] hover:border-white/20'
                  }`}
                >
                  {/* 脊线段与节点：只有桌面端有，hover/选中点亮自己这一段 */}
                  <span
                    className={`absolute left-[7px] hidden h-full w-px lg:block ${k === 0 ? 'top-1/2' : 'top-0'} ${
                      on ? 'bg-brand/55' : 'bg-white/[0.09]'
                    }`}
                  />
                  <span
                    className={`absolute left-[7px] top-1/2 hidden h-[7px] w-[7px] -translate-x-[3px] -translate-y-1/2 rounded-full border transition-colors duration-300 lg:block ${
                      on ? 'border-brand bg-brand' : 'border-white/25 bg-night'
                    }`}
                  />
                  <span className="ml-5 min-w-0 flex-1 lg:ml-6">
                    <span className={`block truncate text-[13.5px] font-medium ${on ? 'text-white' : 'text-white/70'}`}>{g.name}</span>
                    {/* 说明只在选中那一条露出：五条都写两行，导轨就把清单挤没了 */}
                    {on && <span className="mt-0.5 hidden text-[12.5px] leading-snug text-ink-500 lg:block">{g.note}</span>}
                  </span>
                  <span className={`shrink-0 font-mono text-[11.5px] tabular-nums ${on ? 'text-brand-200' : 'text-ink-500'}`}>
                    {g.systems.length}
                  </span>
                </button>
              )
            })}
            {/* 全部：清单形式下这一档很便宜，19 行靠列表内部滚动，不用挨个点分类 */}
            <button
              onClick={() => pickGroup(-1)}
              aria-pressed={allOn}
              className={`relative mt-1.5 flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors duration-300 lg:ml-[7px] lg:w-[calc(100%-7px)] ${
                allOn ? 'border-brand/40 bg-brand/[0.12] text-white' : 'border-dashed border-white/[0.1] text-ink-400 hover:border-white/25 hover:text-white/75'
              }`}
            >
              <span className="min-w-0 flex-1 whitespace-nowrap text-[13px]">全部系统</span>
              <span className="shrink-0 font-mono text-[11.5px] tabular-nums">{pack.total}</span>
            </button>
          </div>

          {/* 右：系统清单 */}
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">
                {allOn ? `全部体系 · ${pack.total} 套` : `${group.name} · ${group.systems.length} 套`}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">实验条数</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pt-1.5" data-lenis-prevent>
              {rows.map((s) => (
                <Row key={s.code} s={s} g={s.g || group} open={s.code === open} onPick={setOpen} roomy={rows.length <= 2} />
              ))}
            </div>
          </div>
        </div>

        {/* 指标条：数字直接取生成包，别让站点文案和源头各说一遍 */}
        <div className="mt-3 flex shrink-0 flex-wrap items-stretch gap-2.5">
          {[
            ['实训系统', `${pack.total} 套`],
            ['实验项目', `${pack.projects} 条`],
            ['适用课程', `${pack.courseTotal} 门`],
            ['覆盖专业', `${pack.majorTotal} 个`],
          ].map(([k, v]) => (
            <div key={k} className="min-w-[104px] flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 lg:flex-none">
              <p className="text-[12.5px] text-ink-400">{k}</p>
              <p className="mt-0.5 text-[17px] font-bold tabular-nums tracking-tight text-white">{v}</p>
            </div>
          ))}
          <a
            href="/#contact"
            onClick={(e) => {
              e.preventDefault()
              requestProductContact({ name: p.title, intent: p.intent, source: `systems-${p.id}`, cta: '咨询产品体系' })
            }}
            className="group inline-flex items-center gap-2 self-center rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-[13.5px] font-medium text-brand-200 transition-colors hover:bg-brand hover:text-white"
          >
            咨询该产品体系
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
