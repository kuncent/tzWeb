import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { PageCTA } from '../components/PageShell'
import { embodiedProducts } from '../data/site'
import ProductViewer from '../components/three/ProductViewer'

/* ============================================================
 * 智能产品页
 * ------------------------------------------------------------
 * 导航位于「产品设备」之后。整页是一台 3D 展示框：
 *   左列 = 机型列表（点一条切换），右列 = 一台 3D 查看器 + 该机型的介绍。
 * 展示与介绍区落在浅色内容区（白 → mist 微渐），3D 舞台用浅色影棚底
 * （ProductViewer 的 light 模式），与浅色版面同调。数据与首页产品矩阵、
 * 3D 展台同源（embodiedProducts），说法天然一致。
 * 全程只挂一台画布：切机型只换模型（GLB 由 useGLTF 缓存），不把 WebGL
 * 上下文叠到浏览器上限。
 * ============================================================ */

const pad = (i) => String(i + 1).padStart(2, '0')

/* 机型列表：桌面竖排、窄屏横滑，选中项品牌色左条 + 白卡浮起 */
function ProductList({ items, idx, onPick }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
      {items.map((it, i) => {
        const on = i === idx
        return (
          <button
            key={it.code}
            type="button"
            onClick={() => onPick(i)}
            aria-pressed={on}
            className={`group relative shrink-0 rounded-xl border px-4 py-3 text-left transition-all duration-300 lg:w-full ${
              on
                ? 'border-brand/30 bg-white shadow-card'
                : 'border-ink-900/[0.07] bg-white/55 hover:border-ink-900/[0.12] hover:bg-white'
            }`}
          >
            {on && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand" />}
            <span className="flex items-center gap-3">
              <span className={`font-mono text-caption tabular-nums ${on ? 'text-brand' : 'text-ink-400'}`}>{pad(i)}</span>
              <span className="min-w-0">
                <span className={`block truncate text-ui font-semibold ${on ? 'text-ink-900' : 'text-ink-600 group-hover:text-ink-900'}`}>{it.name}</span>
                <span className={`block font-mono text-[10px] uppercase tracking-[0.12em] ${on ? 'text-brand-300' : 'text-ink-400'}`}>{it.code}</span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function SmartProducts() {
  const reduced = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const p = embodiedProducts[idx]

  return (
    <>
      {/* ―― 浅色展示区（无首屏，进页即展示）：左列表 · 右 3D + 介绍 ――
          顶垫避开 64px 固定导航栏，不再用 PageHero 开场。 */}
      <section className="relative bg-gradient-to-b from-white to-mist-100 pb-16 pt-24 md:pb-20 md:pt-28">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* 左：机型列表 */}
            <aside className="order-2 lg:order-1">
              <ProductList items={embodiedProducts} idx={idx} onPick={setIdx} />
            </aside>

            {/* 右：展示 + 介绍 */}
            <div className="order-1 grid gap-5 lg:order-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* 3D 舞台 */}
              <div className="relative overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-[#eef2f7] shadow-card">
                <ProductViewer
                  productIndex={idx}
                  reduced={!!reduced}
                  light
                  className="h-[360px] w-full sm:h-[440px] xl:h-[520px]"
                />
                {/* HUD 角标 */}
                {['left-3 top-3 border-l border-t', 'right-3 top-3 border-r border-t', 'left-3 bottom-3 border-b border-l', 'right-3 bottom-3 border-b border-r'].map((pos) => (
                  <span key={pos} className={`pointer-events-none absolute h-4 w-4 border-brand/40 ${pos}`} />
                ))}
                <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-pingslow rounded-full bg-brand-400" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">{pad(idx)} · {p.code}</span>
                </div>
                <div className="pointer-events-none absolute bottom-4 left-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">⟳ 拖动旋转 · 点左侧切换机型</span>
                </div>
              </div>

              {/* 介绍面板 */}
              <div className="flex flex-col rounded-2xl border border-ink-900/[0.07] bg-white p-6 shadow-card xl:p-7">
                <motion.div
                  key={idx}
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-1 flex-col"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand">{p.en}</p>
                    <span className="font-mono text-[10px] text-ink-400">{p.code}</span>
                  </div>
                  <h3 className="mt-2 text-[22px] font-bold tracking-tight text-ink-900">{p.name}</h3>
                  <p className="mt-1 text-ui font-medium text-brand">{p.tag}</p>
                  <p className="mt-3 text-[13.5px] leading-[1.8] text-ink-500">{p.desc}</p>

                  <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-ink-900/[0.07] pt-4 sm:grid-cols-2">
                    {p.specs.map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-2 border-b border-ink-900/[0.06] pb-1.5">
                        <dt className="shrink-0 text-[12.5px] text-ink-500">{k}</dt>
                        <dd className="whitespace-nowrap text-right text-[12.5px] font-medium text-ink-800">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <Link
                    to="/#contact"
                    className="group mt-6 inline-flex items-center gap-2 self-start rounded-xl border border-brand/40 bg-brand/[0.06] px-5 py-3 text-ui font-medium text-brand transition-colors hover:bg-brand hover:text-white"
                  >
                    索取 {p.code} 参数手册
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PageCTA
        title="把专业方向和场地条件发我们"
        sub="告诉我们开什么课、有多少工位、房间多大，我们先出机型选型与实验室布局清单，再谈配置与预算。这一步不收费。"
        back={{ label: '看产品体系', to: '/products' }}
      />
    </>
  )
}
