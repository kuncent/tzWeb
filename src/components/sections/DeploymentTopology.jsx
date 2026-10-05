import { useState } from 'react'
import { Reveal, FigureCaption } from '../ui'
import { deployZones, deployAssurances } from '../../data/tech'

/* ============================================================
 * 参考部署拓扑（技术架构 Tab 的「图 2」）
 * ------------------------------------------------------------
 * 信息中心读技术页，最想知道的是「数据到底落在哪、能不能出校、
 * 和教务/统一认证怎么接」。所以这张图的主语是那条「数据主权边界」：
 * 边界内是校园网私有化栈（接入→平台→算力/链/设备→落库），边界外
 * 只有可选云端，且出去的只有模型调用 —— dataEgress:false。
 * 节点参数全部取自 tech.js 那份单一真源，不新造。
 * ============================================================ */

function CampusNode({ node, i, hot, onHot }) {
  const Icon = node.icon
  const lit = hot === node.name
  return (
    <Reveal delay={i * 0.05}>
      <div
        onMouseEnter={() => onHot(node.name)}
        onMouseLeave={() => onHot(null)}
        className="relative flex items-start gap-3.5"
      >
        <span
          className={`absolute -left-[26px] top-[18px] h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-4 ring-white transition-colors duration-300 ${
            lit ? 'bg-brand' : 'bg-ink-900/25'
          }`}
          aria-hidden
        />
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-300 ${
            lit ? 'bg-brand text-white shadow-glow' : 'border border-ink-900/[0.07] bg-white text-brand'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[14px] font-semibold tracking-tight text-ink-900">{node.name}</h4>
            <span className="shrink-0 rounded-full bg-mist-100 px-2 py-0.5 font-mono text-[10.5px] text-ink-500">{node.spec}</span>
          </div>
          <p className="mt-0.5 text-[11.5px] uppercase tracking-[0.1em] text-ink-400">{node.role}</p>
        </div>
      </div>
    </Reveal>
  )
}

function CloudNode({ node }) {
  const Icon = node.icon
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-900/[0.07] bg-white/70 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-900/[0.06] text-ink-700">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold tracking-tight text-ink-900">{node.name}</p>
        <p className="text-[11.5px] text-ink-400">{node.role}</p>
      </div>
      <span className="shrink-0 font-mono text-[10.5px] text-ink-500">{node.spec}</span>
    </div>
  )
}

export default function DeploymentTopology() {
  const { campus, cloud, boundary } = deployZones
  const [hot, setHot] = useState(null)
  return (
    <div className="mt-16">
      <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">参考部署拓扑 · 数据主权边界</p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* 校园网边界内 */}
        <div className="relative rounded-2xl border-2 border-dashed border-brand/35 bg-white/70 p-6 pl-10 shadow-card">
          <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white shadow-glow">
            <campus.icon className="h-3.5 w-3.5" />
            {campus.label}
          </span>
          {/* 竖向数据流导轨：打底连接线 + 沿线流动的彗尾高亮。
              外层 div 撑高度（svg 是替换元素，只给 top/bottom 会按 viewBox 比例塔缩）。
              打底线不淡出，保证首/末节点都坐在线上；只有彗尾两端 mask 淡出，
              避免光点在顶/底硬切「闪现」。 */}
          <div aria-hidden className="pointer-events-none absolute bottom-8 left-[13px] top-10 w-0.5">
            <div className="absolute inset-0 bg-ink-900/[0.14]" />
            <svg viewBox="0 0 2 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ maskImage: 'linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)' }}>
              <line x1="1" y1="0" x2="1" y2="100" stroke="#1677FF" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeDasharray="26 74" className="arch-flow" style={{ '--flow': '100' }} />
            </svg>
          </div>
          <div className="space-y-4">
            {campus.nodes.map((n, i) => (
              <CampusNode key={n.name} node={n} i={i} hot={hot} onHot={setHot} />
            ))}
          </div>
        </div>

        {/* 可选云端 */}
        <div className="relative rounded-2xl border-2 border-dashed border-ink-900/15 bg-mist-100/50 p-6 pt-8">
          <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1 text-[11px] font-semibold text-white">
            <cloud.icon className="h-3.5 w-3.5" />
            {cloud.label}
          </span>
          <p className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">{cloud.en}</p>
          <div className="space-y-3">
            {cloud.nodes.map((n) => (
              <CloudNode key={n.name} node={n} />
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-ink-900/[0.07] bg-white/60 px-4 py-3 text-[12px] leading-relaxed text-ink-500">
            云端只承接<span className="font-semibold text-ink-900">弹性算力与模型调用</span>；换私有化部署时，这两块同样落回校园网内。
          </div>
        </div>
      </div>

      {/* 边界那句话：全站技术可信度的锚点 */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-brand/25 bg-brand-50/60 px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-white animate-breathe">
          <boundary.icon className="h-[18px] w-[18px]" />
        </span>
        <p className="text-[14px] font-semibold tracking-tight text-ink-900">{boundary.title}</p>
        <p className="text-[12.5px] text-ink-500">{boundary.desc}</p>
      </div>

      <FigureCaption n={2} title="参考部署拓扑" desc="校园网边界内完成从接入到落库的全链路；边界外仅可选云端，且只出模型调用" />

      {/* 工程纪律收口 */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deployAssurances.map((a, i) => {
          const Icon = a.icon
          return (
            <Reveal key={a.t} delay={i * 0.05}>
              <div className="flex h-full items-start gap-3.5 rounded-xl border border-ink-900/[0.07] bg-white p-5 shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lift">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-900 text-white">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-semibold tracking-tight text-ink-900">{a.t}</h4>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{a.d}</p>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
