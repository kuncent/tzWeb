import { useState } from 'react'
import { Reveal, SectionHead, FigureCaption, Tilt, SpotlightGlow, spotMove } from '../ui'
import { techLayers, techPipeline } from '../../data/tech'
import DeploymentTopology from './DeploymentTopology'
import IntegrationContract from './IntegrationContract'

/* ============================================================
 * 技术架构（首页第 4 屏，产品矩阵之后）
 * ------------------------------------------------------------
 * 这一屏只留技术架构三张图：技术剖面（图1）· 参考部署拓扑（图2）·
 * 接口契约表（图3）。原来的「业务架构 + 按决策人进入」已挪到
 * /solutions（解决方案页本就按对象组织，四层业务栈在那里更顺）。
 * 数据全部来自 data/tech.js 那份单一真源，与 /technology 内页同口径。
 * ============================================================ */

/* ―― 技术架构视图：生命周期流水线 + 四层自研栈剖面 ―― */

/* 一堂课的五步生命周期：lg 上一条横向流动的光带穿过节点，窄屏退回竖排 */
function LifecycleRibbon() {
  return (
    <div className="relative">
      <svg
        aria-hidden
        viewBox="0 0 1000 8"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-[22px] hidden h-2 w-full lg:block"
      >
        <line x1="0" y1="4" x2="1000" y2="4" stroke="#0b1220" strokeOpacity="0.1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {/* 光带周期 90+910=1000，动画位移量必须等于周期，否则每圈会「跳」一下 */}
        <line x1="0" y1="4" x2="1000" y2="4" stroke="#1677FF" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="90 910" className="arch-flow" style={{ '--flow': '1000', animationDuration: '2.6s' }} />
      </svg>
      <div className="relative grid gap-6 lg:grid-cols-5">
        {techPipeline.map((p, i) => (
          <Reveal key={p.t} delay={i * 0.07}>
            <div className="relative">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-ink-900/10 bg-white font-mono text-[12.5px] font-semibold tabular-nums text-brand shadow-card">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h4 className="mt-3.5 text-[14px] font-semibold tracking-tight text-ink-900">{p.t}</h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{p.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

/* 层与层之间的「调用」连接：竖线 + 沿线跑动的光点 + 动作标签 */
function StackCall({ label, active }) {
  return (
    <div className="relative h-[38px]">
      <svg viewBox="0 0 2 38" preserveAspectRatio="none" className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2" aria-hidden>
        <line x1="1" y1="0" x2="1" y2="38" stroke="#0b1220" strokeOpacity="0.14" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="38"
          stroke="#1677FF"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="9 29"
          className="arch-flow"
          /* 周期 9+29=38：位移量对齐周期才不会每圈回跳 */
          style={{ '--flow': '38', opacity: active ? 1 : 0.55 }}
        />
      </svg>
      {label && (
        <span
          className={`absolute left-[calc(50%+14px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-300 ${
            active ? 'border-brand/40 bg-brand-50 text-brand-700' : 'border-ink-900/10 bg-white text-ink-400'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  )
}

function StackBand({ layer, i, hot, onHot }) {
  const Icon = layer.icon
  const lit = hot === layer.key
  const next = techLayers[i + 1]
  return (
    <div className="relative" onMouseEnter={() => onHot(layer.key)} onFocus={() => onHot(layer.key)}>
      <Reveal delay={i * 0.06}>
        {/* 卡片 3D 交互：光标位置驱动微倾斜（Tilt）+ 跟随光斑（SpotlightGlow），
            由原「差异化优势」屏（已下线）搬来；max 给到 4° 保证宽卡上的正文不发虚 */}
        <Tilt max={4}>
          <div
            onMouseMove={spotMove}
            className={`group relative grid gap-4 overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-500 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-center md:p-6 ${
              lit ? '-translate-y-0.5 border-brand/40 shadow-lift' : 'border-ink-900/[0.07] shadow-card'
            }`}
          >
            <SpotlightGlow />
            <div className="relative flex items-center gap-3 md:block">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${
                lit ? 'bg-brand text-white' : 'bg-brand-50 text-brand'
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 md:mt-2.5">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[10.5px] tabular-nums tracking-[0.2em] text-brand">{layer.n}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">{layer.en}</span>
              </div>
              <h3 className="mt-0.5 text-[16.5px] font-semibold tracking-tight text-ink-900">{layer.name}</h3>
            </div>
          </div>
          <div>
            <ul className="flex flex-wrap gap-1.5">
              {layer.items.map((t) => (
                <li
                  key={t}
                  className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] transition-colors duration-300 ${
                    lit ? 'border-brand/25 bg-brand-50 text-brand-700' : 'border-ink-900/[0.07] bg-mist-100 text-ink-700'
                  }`}
                >
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-400">{layer.note}</p>
          </div>
        </div>
        </Tilt>
      </Reveal>
      {next && <StackCall label={layer.call} active={lit || hot === next.key} />}
    </div>
  )
}

export default function Architecture() {
  const [hot, setHot] = useState(null)
  return (
    <section id="architecture" className="relative overflow-hidden bg-gradient-to-b from-white to-mist-100 sec-y">
      <div className="container-x">
        <SectionHead
          id="architecture" n="04"
          en="TECHNICAL ARCHITECTURE"
          zh="技术架构"
          sub="三张图把系统讲给技术负责人与信息中心：剖面回答「四层怎么搭、谁调用谁」，部署拓扑回答「数据落在哪、能不能出校」，接口契约回答「拿什么接进来、什么会出校」。四层全栈自研，可出云端版，也可全栈私有化。"
        />

        <figure className="mt-12">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">一堂课的生命周期 · 一句话到能上，五步</p>
          <LifecycleRibbon />

          <p className="mb-5 mt-14 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
            四层自研栈 · 谁调用谁
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] tracking-[0.08em] text-brand-700">4 项发明专利 · 60+ 软著</span>
          </p>
          <div onMouseLeave={() => setHot(null)}>
            {techLayers.map((l, i) => (
              <StackBand key={l.key} layer={l} i={i} hot={hot} onHot={setHot} />
            ))}
          </div>

          <FigureCaption
            n={1}
            title="技术架构剖面"
            desc="上层调用下层，四大引擎自研；同一套栈可出云端版，也可全栈私有化（数据不出校）"
          />
        </figure>
        <DeploymentTopology />
        <IntegrationContract />
      </div>
    </section>
  )
}
