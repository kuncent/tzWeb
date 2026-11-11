import { Suspense, lazy, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { productMatrix, embodiedProducts, labModules } from '../../data/site'
import { requestProductContact } from '../../lib/aiEngine'

/* 具身智能机器人实验室屏：3D 环形展台 + 六机型选型 + 实验室交付模块。
   原为产品矩阵 01 独立体系，现并入「智能产品」体系下的具身智能机器人产品 ——
   由 GalleryScreen 选中该产品时展开，整体展示效果与旧版完全一致。 */

/* 3D 环形展台（自 KUN 具身教育实验室项目复用）：体积较大，按需懒加载。
   importShowcase 提到具名变量并导出，ProductMatrix 在矩阵接近视口时先手动
   trigger 一次预热（chunk 下载 + 四个机型 GLB preload），等真正 live 挂载时
   只剩建 WebGL 上下文，把「滚到产品矩阵卡一下」摊到进入视口之前。 */
export const importShowcase = () => import('../three/ProductShowcase')
const ProductShowcase = lazy(importShowcase)

const LAST = productMatrix.length - 1
const EASE = [0.22, 1, 0.36, 1]
const pad = (i) => String(i + 1).padStart(2, '0')

export default function EmbodiedScreen({ p, i, withIndex }) {
  const Icon = p.icon
  const [active, setActive] = useState(0)
  const stageRef = useRef(null)
  /* once:false：滚离即卸掉 ProductShowcase、释放它的 WebGL 上下文
     （R3F 卸载会 forceContextLoss）——否则进过一次就常驻，与首屏/其它画布叠到
     浏览器上限就会把最旧的首屏顶掉（黑屏诱因）。机型 GLB 已由 useGLTF 缓存，
     回来时重建的主要是上下文与 GPU 资源，不是重新下载 */
  const live = useInView(stageRef, { once: false, margin: '160px' })
  const cur = embodiedProducts[active]

  return (
    <div className="relative flex h-full flex-col justify-center">
      <span className="pointer-events-none absolute -top-4 right-0 select-none text-[110px] font-bold leading-none text-white/[0.045] xl:text-[150px]">
        {pad(i)}
      </span>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* 标题区 */}
        <div className="shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-white shadow-glow">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-ui-sm font-semibold uppercase tracking-eyebrow text-accent-sky">{p.en}</p>
              {withIndex && (
                <p className="text-ui-sm tabular-nums text-ink-400">
                  {pad(i)} / {pad(LAST)}
                </p>
              )}
            </div>
          </div>
          <h3 className="mt-3 text-[23px] font-bold tracking-tight text-white md:text-[28px] xl:text-[34px] [@media(max-height:820px)]:xl:text-[28px]">{p.title}</h3>
          <p className="mt-1.5 text-ui font-medium text-accent-ice xl:text-ui-lg">{p.tagline}</p>
          <p className="mt-1.5 max-w-3xl text-ui-sm leading-[1.75] text-ink-400 [@media(max-height:820px)]:line-clamp-2">{p.desc}</p>
        </div>

        {/* 产品选择器 */}
        <div className="mt-3.5 flex shrink-0 flex-wrap gap-2">
          {embodiedProducts.map((pr, k) => {
            const on = k === active
            return (
              <button
                key={pr.code}
                onClick={() => setActive(k)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors duration-300 [@media(max-height:820px)]:py-1 ${
                  on ? 'border-accent/50 bg-accent/15 text-white' : 'border-white/[0.08] text-ink-400 hover:border-white/20 hover:text-white/80'
                }`}
              >
                <span className={`font-mono text-caption tabular-nums ${on ? 'text-accent-ice' : 'text-ink-500'}`}>{pad(k)}</span>
                <span className="text-ui font-medium">{pr.name}</span>
                <span className={`hidden font-mono text-caption tracking-[0.1em] sm:inline ${on ? 'text-accent-sky' : 'text-ink-500'}`}>
                  {pr.code}
                </span>
              </button>
            )
          })}
        </div>

        {/* 3D 展台 + 当前产品详情
            行轨锁 minmax(0,1fr)：grid 行默认 auto，右边那块详情会按内容长高，
            把下面的交付区顶出屏（详情面板自己已经是定高内滚，不该再长） */}
        <div className="mt-3.5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.15fr_1fr] lg:grid-rows-[minmax(0,1fr)]">
          <div
            ref={stageRef}
            className="relative min-h-[260px] overflow-hidden rounded-2xl border border-white/[0.08] bg-night lg:min-h-0"
          >
            {live ? (
              <Suspense fallback={null}>
                <div className="absolute inset-0">
                  <ProductShowcase active={active} />
                </div>
              </Suspense>
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-mono text-caption uppercase tracking-label text-ink-500">INITIALIZING PRODUCT RING…</span>
              </div>
            )}

            {/* HUD 角标 */}
            {['left-3 top-3 border-l border-t', 'right-3 top-3 border-r border-t', 'left-3 bottom-3 border-b border-l', 'right-3 bottom-3 border-b border-r'].map(
              (pos) => (
                <span key={pos} className={`pointer-events-none absolute h-4 w-4 border-accent/40 ${pos}`} />
              ),
            )}
            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pingslow rounded-full bg-accent-ice" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-ice" />
              </span>
              <span className="font-mono text-caption uppercase tracking-[0.16em] text-white/70">PRODUCT RING · {cur.code}</span>
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4">
              <span className="font-mono text-caption uppercase tracking-[0.16em] text-ink-500">⟳ DRAG TO ROTATE</span>
            </div>
            <div className="pointer-events-none absolute bottom-4 right-4">
              <span className="font-mono text-caption uppercase tracking-[0.16em] text-ink-500">{cur.en} · ON STAGE</span>
            </div>
          </div>

          {/* 详情面板（矮屏时内部滚动，不裁切内容） */}
          <div
            className="flex min-h-0 flex-col overflow-y-auto rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 xl:px-6 xl:py-5"
            data-lenis-prevent
          >
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="my-auto flex flex-col"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-ui-sm font-semibold uppercase tracking-label text-accent-sky">{cur.en}</p>
                <span className="font-mono text-caption text-ink-400">{cur.code}</span>
              </div>
              <h4 className="mt-1.5 text-title font-bold tracking-tight text-white">{cur.name}</h4>
              <p className="mt-0.5 text-ui-sm text-accent-ice">{cur.tag}</p>
              <p className="mt-2 text-ui-sm leading-[1.75] text-ink-400">{cur.desc}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-1">
                {cur.specs.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] pb-1">
                    <dt className="shrink-0 text-ui-sm text-ink-400">{k}</dt>
                    <dd className="whitespace-nowrap text-right text-ui-sm font-medium text-white/90">{v}</dd>
                  </div>
                ))}
              </dl>
              <a
                href="/about#contact"
                onClick={(e) => {
                  e.preventDefault()
                  requestProductContact({ name: cur.name, code: cur.code, intent: p.intent, source: `embodied-${cur.code}`, cta: `索取 ${cur.name} 参数手册` })
                }}
                className="group mt-4 inline-flex items-center gap-1.5 text-ui-sm text-accent-sky transition-colors hover:text-white"
              >
                索取 {cur.code} 完整参数手册
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
              <p className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-ui-sm text-ink-500">
                <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-accent-ice" />
                按住画面拖动可 360° 自由旋转机型 · 点击上方型号切换机型
              </p>
            </motion.div>
          </div>
        </div>

        {/* 实验室交付：一间实验室的完整交付 */}
        <div className="mt-3.5 shrink-0">
          <p className="text-ui-sm font-semibold uppercase tracking-label text-accent-sky">实验室交付 · 一间实验室的完整交付</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {labModules.map((m, mi) => (
              <li key={m.code} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-ui-sm font-semibold text-white">
                  <span className="mr-1.5 font-mono text-caption tabular-nums text-ink-500">{pad(mi)}</span>
                  {m.name}
                </p>
                <p className="mt-0.5 text-ui-sm uppercase tracking-[0.14em] text-accent-ice [@media(max-height:820px)]:hidden">{m.code}</p>
                <p className="mt-1 text-ui-sm leading-4 text-ink-400 line-clamp-4 [@media(max-height:820px)]:line-clamp-2">{m.desc}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* 底部：能力标签 + 指标 + 咨询 */}
        <div className="mt-4 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/[0.07] pt-4 [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:pt-3">
          <ul className="flex flex-wrap gap-2">
            {p.bullets.map((b) => (
              <li key={b} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-ui-sm text-white/75">
                {b}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-5 sm:ml-auto">
            {p.stats.map((s) => (
              <div key={s.k}>
                <p className="text-ui-sm text-ink-400">{s.k}</p>
                <p className="text-title font-bold tracking-tight text-white">{s.v}</p>
              </div>
            ))}
            <a
              href="/about#contact"
              onClick={(e) => {
                e.preventDefault()
                requestProductContact({ name: p.title, intent: p.intent, source: 'embodied-lab', cta: '咨询实验室方案' })
              }}
              className="group inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-ui font-medium text-accent-sky transition-colors hover:bg-accent hover:text-white"
            >
              咨询实验室方案
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}