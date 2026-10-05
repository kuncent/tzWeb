import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Reveal } from '../ui'
import { archLayers } from '../../data/business'
import { scrollToId } from '../../hooks/useLenis'

/* ============================================================
 * 业务架构四层栈（从首页「系统架构」屏迁来，作为解决方案页的开篇目录）
 * ------------------------------------------------------------
 * 原来的双 Tab 里，业务架构讲「给谁、值多少」，和决策人路由绑在一起；
 * 解决方案页本就是按对象 / 按场景组织的，把这四层栈放这儿更顺 ——
 * 它读起来就是这一页的目录：底座 → 产品 → 场景对象 → 交付，每一层
 * 都能对上下文的某一节。右侧图例把这层对应关系点明，避免「硬搬一块
 * 架构图过来」。数据仍取 data/business.js 那份单一真源。
 * ============================================================ */

/* 层与层之间的连接：竖线 + 沿线跑动的光点。周期 14+46=60，正好等于
   .arch-flow 的默认 --flow，循环落在图案边界上，不会回跳。 */
function LayerLink({ active }) {
  return (
    <svg viewBox="0 0 2 60" preserveAspectRatio="none" className="absolute -top-[26px] left-[26px] h-[26px] w-0.5" aria-hidden>
      <line x1="1" y1="0" x2="1" y2="60" stroke="#0b1220" strokeOpacity="0.14" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {active && (
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="60"
          stroke="#1677FF"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="14 46"
          className="arch-flow"
        />
      )}
    </svg>
  )
}

/* scenario 层的落点就在本页「按对象」这一节，用平滑滚动而不是自跳链接 */
function goToAnchor(id) {
  scrollToId(id, -116)
}

function LayerCard({ layer, i, hot, onHot }) {
  const Icon = layer.icon
  const lit = hot === layer.id
  const cta = layer.anchor
  const Cta = (
    <>
      {cta.label}
      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
    </>
  )
  return (
    <div onMouseEnter={() => onHot(layer.id)} onFocus={() => onHot(layer.id)} className="relative">
      {i > 0 && <LayerLink active={lit || hot === archLayers[i - 1].id} />}
      <Reveal delay={i * 0.09}>
        <div
          className={`group block rounded-2xl border bg-white px-5 py-4 transition-all duration-500 ${
            lit ? '-translate-y-0.5 border-brand/40 shadow-lift' : 'border-ink-900/[0.07] shadow-card'
          }`}
        >
          <div className="flex items-start gap-4">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${
                lit ? 'bg-brand text-white' : 'bg-brand-50 text-brand'
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-[10.5px] tabular-nums tracking-[0.2em] text-ink-400">{layer.n}</span>
                <h3 className="text-[16.5px] font-semibold tracking-tight text-ink-900">{layer.name}</h3>
                <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400 sm:inline">
                  {layer.en}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] leading-[1.7] text-ink-500">{layer.desc}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {layer.items.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-ink-900/[0.08] bg-mist-100 px-2.5 py-1 text-[12px] text-ink-700 transition-colors duration-300 group-hover:border-brand/25 group-hover:bg-brand-50 group-hover:text-brand-700"
                  >
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand">
                {layer.id === 'scenario' ? (
                  <button type="button" onClick={() => goToAnchor('audiences')} className="inline-flex items-center gap-1.5">
                    {Cta}
                  </button>
                ) : (
                  <Link to={cta.to} className="inline-flex items-center gap-1.5">
                    {Cta}
                  </Link>
                )}
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  )
}

/* 右侧图例：把四层和本页接下来各节对上号，让这块读作「目录」而非孤图 */
function StackLegend() {
  const rows = [
    { n: 'L4', t: '交付与认证层', hint: '对应下面「交付与部署」', to: '/#delivery' },
    { n: 'L3', t: '场景与对象层', hint: '对应下面「按场景 / 按学科 / 按对象」', scroll: 'scenes' },
    { n: 'L2', t: '产品体系层', hint: '五大产品体系见首页产品矩阵', to: '/#matrix' },
    { n: 'L1', t: '技术与算力底座', hint: '全栈自研细节见技术方向', to: '/technology' },
  ]
  return (
    <Reveal>
      <div className="rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-soft md:p-7">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand">HOW TO READ</p>
        <h3 className="mt-1.5 text-[17px] font-semibold tracking-tight text-ink-900">这四层，就是这一页的目录</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          自下而上：底座把技术做扎实，产品把它封装成能开课的体系，场景与对象决定同一套东西怎么讲给不同的人，交付负责把它落到能验收的成果。下面每一节都能对回这里的一层。
        </p>
        <ul className="mt-5 space-y-1">
          {rows.map((r) => {
            const inner = (
              <>
                <span className="mt-[3px] grid h-6 w-9 shrink-0 place-items-center rounded-md bg-brand-50 font-mono text-[10.5px] font-semibold text-brand">
                  {r.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold tracking-tight text-ink-900">{r.t}</span>
                  <span className="block text-[12px] text-ink-400">{r.hint}</span>
                </span>
                <span className="ml-auto shrink-0 self-center text-ink-300 transition-transform duration-300 group-hover:translate-x-1">→</span>
              </>
            )
            const cls =
              'group flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-300 hover:bg-mist-100'
            return (
              <li key={r.n}>
                {r.scroll ? (
                  <button type="button" onClick={() => goToAnchor(r.scroll)} className={`w-full text-left ${cls}`}>
                    {inner}
                  </button>
                ) : (
                  <Link to={r.to} className={cls}>
                    {inner}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Reveal>
  )
}

export default function BusinessArchitecture() {
  const [hot, setHot] = useState(null)
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
      <div className="space-y-[26px]" onMouseLeave={() => setHot(null)}>
        {archLayers.map((l, i) => (
          <LayerCard key={l.id} layer={l} i={i} hot={hot} onHot={setHot} />
        ))}
      </div>
      <div className="lg:sticky lg:top-[136px] lg:self-start">
        <StackLegend />
      </div>
    </div>
  )
}
