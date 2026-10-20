import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { Reveal } from '../ui'
import { PARTNERS, PARTNER_TIERS, PROV_ORDER, TIER_COLOR } from '../../data/partners'

/* ============================================================
 * 合作院校名录 —— 按省份聚类的「地图式」花名册
 * ------------------------------------------------------------
 * 层次分段（本科 / 高职 / 中职）+ 关键词搜索双向过滤，命中后把院校
 * 重新聚到各省份卡里；省份卡按自东向西的 PROV_ORDER 排布，读起来像
 * 一张铺开的名录地图。只呈现公开属性（省份 / 层次 / 校名），不涉及
 * 任何采购与验收内容。院校量级以数据本身为准，与全站 180+ 口径互补
 * （这里是可公开展示的一部分）。
 * ============================================================ */

const tierLabel = { u: '本科', v: '高职', s: '中职' }

export default function PartnerDirectory() {
  const [tier, setTier] = useState('all')
  const [q, setQ] = useState('')

  /* 层次计数走全量，切换筛选时分段标签的数字保持稳定可读 */
  const tierCount = useMemo(() => {
    const c = { all: PARTNERS.length, u: 0, v: 0, s: 0 }
    for (const p of PARTNERS) c[p.tier] += 1
    return c
  }, [])

  const groups = useMemo(() => {
    const kw = q.trim()
    const matched = PARTNERS.filter(
      (p) => (tier === 'all' || p.tier === tier) && (!kw || p.name.includes(kw))
    )
    const map = new Map()
    for (const p of matched) {
      if (!map.has(p.prov)) map.set(p.prov, [])
      map.get(p.prov).push(p)
    }
    const orderIdx = (prov) => {
      const i = PROV_ORDER.indexOf(prov)
      return i === -1 ? PROV_ORDER.length : i
    }
    return [...map.entries()]
      .map(([prov, list]) => ({ prov, list }))
      .sort((a, b) => orderIdx(a.prov) - orderIdx(b.prov) || a.prov.localeCompare(b.prov, 'zh'))
  }, [tier, q])

  const shown = groups.reduce((n, g) => n + g.list.length, 0)

  return (
    <div>
      {/* ―― 工具条：层次分段 + 搜索 ―― */}
      <Reveal>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {PARTNER_TIERS.map((t) => {
              const on = t.key === tier
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTier(t.key)}
                  aria-pressed={on}
                  className={`relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-300 ${
                    on ? 'text-white' : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="partner-tier-active"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-ink-900"
                    />
                  )}
                  <span className="relative z-10 whitespace-nowrap">
                    {t.label}
                    <span className={`ml-1.5 text-[12px] tabular-nums ${on ? 'text-white/70' : 'text-ink-400'}`}>
                      {tierCount[t.key]}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索院校名称…"
              className="w-full rounded-full border border-ink-900/[0.1] bg-white py-2.5 pl-10 pr-4 text-[13.5px] text-ink-900 outline-none transition-colors duration-300 placeholder:text-ink-400 focus:border-brand/50 focus:ring-2 focus:ring-brand/15"
            />
          </div>
        </div>
      </Reveal>

      {/* ―― 概览 + 层次色例 ―― */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-ink-900/[0.07] pt-5">
        <p className="text-[13px] text-ink-500">
          当前展示 <span className="font-semibold text-ink-900">{shown}</span> 所，
          覆盖 <span className="font-semibold text-ink-900">{groups.length}</span> 个省级行政区
        </p>
        <div className="flex items-center gap-4">
          {['u', 'v', 's'].map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
              <span className="h-2 w-2 rounded-full" style={{ background: TIER_COLOR[k] }} />
              {tierLabel[k]}
            </span>
          ))}
        </div>
      </div>

      {/* ―― 省份聚类名录：一个整体面板 + 每省一行（左侧省份名/数量固定栏，右侧校名彩色标签流式换行），左右边缘对齐、底部收口整齐 ―― */}
      {groups.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-ink-900/[0.12] bg-mist-100/60 py-16 text-center">
          <p className="text-[14px] text-ink-500">没有匹配「{q.trim()}」的院校，换个关键词试试。</p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-ink-900/[0.06] overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-card">
          {groups.map((g) => (
            <div key={g.prov} className="flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:gap-5 sm:px-5">
              <div className="flex shrink-0 items-center gap-2 sm:w-[84px] sm:flex-col sm:items-start sm:gap-1 sm:pt-1">
                <h3 className="text-[14.5px] font-semibold tracking-tight text-ink-900">{g.prov}</h3>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-brand">
                  {g.list.length}
                </span>
              </div>
              <ul className="flex flex-1 flex-wrap gap-1.5">
                {g.list.map((p) => (
                  <li
                    key={p.name}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-mist-50 px-2.5 py-1 text-[13px] text-ink-700 ring-1 ring-inset ring-ink-900/[0.05] transition-colors duration-200 hover:bg-brand/[0.06] hover:text-ink-900"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TIER_COLOR[p.tier] }} />
                    <span className="leading-none">{p.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
