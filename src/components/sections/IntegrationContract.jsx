import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { Reveal, EASE, FigureCaption } from '../ui'
import { apiContracts } from '../../data/tech'

/* ============================================================
 * 接口契约表（技术架构 Tab 的「图 3」）
 * ------------------------------------------------------------
 * 图 1 讲「怎么搭」，图 2 讲「数据落在哪」，这张补信息中心 / 集成方
 * 最后要问的一句：「我拿什么接口接进来、什么会出校、什么留下」。
 * 主语是那条数据主权边界：整列「是否出校」里只有模型网关点亮成品牌色
 * （出站），其余一律留在校内 —— 和图 2 边界的 dataEgress:false 同频。
 * 事实全部来自 data/tech.js 那份单一真源；无据的字段字典统一标「现网确认」，
 * 不新造端点 URL 或字段名。交互沿用图 2 的 arch-flow 光轨 + hover 高亮，
 * 再叠一层点击展开：收起时读「口径」，展开看「关键字段 + 怎么核对」。
 * ============================================================ */

function ContractRow({ row, i, hot, onHot, open, onToggle }) {
  const Icon = row.icon
  const lit = hot === row.key || open
  return (
    <Reveal delay={i * 0.05}>
      <div
        onMouseEnter={() => onHot(row.key)}
        onMouseLeave={() => onHot(null)}
        className={`relative -mx-2 rounded-xl px-2 transition-colors duration-300 ${lit ? 'bg-brand-50/50' : ''}`}
      >
        {/* 左侧接点：与图 2 校园节点同一套光轨语言 */}
        <span
          className={`absolute -left-[15px] top-[22px] h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-4 ring-white transition-colors duration-300 ${
            lit ? 'bg-brand' : 'bg-ink-900/25'
          }`}
          aria-hidden
        />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-start gap-3.5 py-3 text-left"
        >
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-300 ${
              lit ? 'bg-brand text-white shadow-glow' : 'border border-ink-900/[0.07] bg-white text-brand'
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="text-[14.5px] font-semibold tracking-tight text-ink-900">{row.domain}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">{row.en}</span>
            </span>
            <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-500">{row.spec}</span>
          </span>
          {/* 方向 + 是否出校：只有模型调用越界，用品牌色点出来 */}
          <span className="hidden shrink-0 items-center gap-1.5 self-center sm:flex">
            <span className="rounded-full border border-ink-900/10 bg-white px-2 py-0.5 font-mono text-[10.5px] text-ink-500">
              {row.dir}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10.5px] ${
                row.out ? 'bg-brand text-white' : 'border border-ink-900/[0.07] bg-mist-100 text-ink-500'
              }`}
            >
              {row.egress}
            </span>
          </span>
          <ChevronDown
            className={`mt-2.5 h-4 w-4 shrink-0 text-ink-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="pb-4 pl-[54px] pr-2">
                <div className="flex flex-wrap gap-1.5">
                  {row.fields.map((f) => (
                    <span
                      key={f}
                      className="rounded-md border border-ink-900/[0.07] bg-white px-2 py-1 font-mono text-[11.5px] text-ink-700"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <p className="mt-2.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-400">
                  <span className="mt-[1px] shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-brand">核对</span>
                  {row.verify}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  )
}

export default function IntegrationContract() {
  const [hot, setHot] = useState(null)
  const [open, setOpen] = useState(null)

  return (
    <figure className="mt-16">
      <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">接口契约 · 能接什么、什么出校、什么留下</p>

      <div className="overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white p-6 pl-10 shadow-card">
        {/* 表头 */}
        <div className="mb-1 flex items-center justify-between border-b border-ink-900/[0.07] pb-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-400">对接域</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">方向 · 是否出校</span>
        </div>

        {/* 竖向数据流导轨：与图 2 同一语言 —— 打底线不淡出（保证首/末行接点都在线上），
            只有流动的彗尾两端 mask 淡出。外层 div 撑高度，避免 svg 按 viewBox 比例塔缩。 */}
        <div className="relative" onMouseLeave={() => setHot(null)}>
          <div aria-hidden className="pointer-events-none absolute bottom-4 left-[-24px] top-4 w-0.5">
            <div className="absolute inset-0 bg-ink-900/[0.14]" />
            <svg viewBox="0 0 2 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ maskImage: 'linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)' }}>
              <line x1="1" y1="0" x2="1" y2="100" stroke="#1677FF" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeDasharray="26 74" className="arch-flow" style={{ '--flow': '100' }} />
            </svg>
          </div>
          <div className="divide-y divide-ink-900/[0.05]">
            {apiContracts.map((row, i) => (
              <ContractRow
                key={row.key}
                row={row}
                i={i}
                hot={hot}
                onHot={setHot}
                open={open === row.key}
                onToggle={() => setOpen(open === row.key ? null : row.key)}
              />
            ))}
          </div>
        </div>

        {/* 收口：整列只有模型调用越界 */}
        <div className="mt-3 flex items-start gap-1.5 border-t border-ink-900/[0.07] pt-4 text-[12px] leading-relaxed text-ink-500">
          <span className="font-mono text-[11px] text-brand">dataEgress:false</span>
          <span>—— 全表仅「模型调度网关」一项有东西出校，且只是推理调用；课堂数据与学生答案一律留在校园网内。</span>
        </div>
      </div>

      <FigureCaption
        n={3}
        title="接口契约表"
        desc="能力/字段取自站内既有口径（lesson.manifest 与开放接入屏）；无据的协议与字段字典标「现网确认」，点击行可展开明细"
      />
    </figure>
  )
}
