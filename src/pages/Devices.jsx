import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { PageHero, PageSection, HeroFrame } from '../components/PageShell'
import { Reveal } from '../components/ui'
import { deviceTypes, devices } from '../data/devices'
import { embodiedProducts } from '../data/site'
import ProductViewer from '../components/three/ProductViewer'
import CircularCarousel from '../components/reactbits/CircularCarousel'

/* ============================================================
 * 教学设备页
 * ------------------------------------------------------------
 * 复用内页同一套骨架（暗底 PageHero → 吸顶 InnerNav → 若干 PageSection
 * → 暗色收口 CTA），保证从首页点进来「不掉进另一个网站」。
 * 组织维度 = 设备类型：一类一屏，屏内是设备卡片网格。
 * 每张卡：暗底 HUD 舞台放产品图（透明底 500×500 落在深色上更立体），
 * 下面是我方口径的名称 / 简介 / 参数。命名一律类目通用名，不带外部品牌。
 * ============================================================ */

/* 页内子导航已提取到顶栏「教学设备」悬停下拉（见 components/Navbar.jsx 的
   FLYOUTS['/devices']）：下拉项走锁点 /devices#<id>，直接滚到对应分区。*/

/* 产品舞台：浅色「图纸」底 + 品牌蓝微辉光 + 极淡网格 + 角标。
   下载回来的设备图多为白底，放在浅色舞台上融合自然，不致「白块糊在黑底」。 */
function DeviceStage({ d }) {
  return (
    <div className="relative aspect-[5/4] overflow-hidden border-b border-ink-900/[0.07] bg-gradient-to-b from-white to-mist-100">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 bottom-[-40px] h-[200px] w-[300px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.14),transparent)]" />
        <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:30px_30px] [mask-image:radial-gradient(76%_76%_at_50%_44%,#000,transparent)]" />
        <span className="absolute left-3 top-3 h-4 w-4 border-l border-t border-brand/30" />
        <span className="absolute right-3 top-3 h-4 w-4 border-r border-t border-brand/30" />
        <span className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-brand/30" />
        <span className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-brand/30" />
      </div>
      <img
        src={d.img}
        alt={d.name}
        width={500}
        height={500}
        loading="lazy"
        decoding="async"
        className="relative z-10 h-full w-full object-contain p-5 transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
      />
      {/* 专业 / 用途标签 */}
      <span className="absolute left-3 top-3 z-20 rounded-full border border-ink-900/10 bg-white/85 px-2.5 py-1 text-[11px] font-medium text-ink-600 backdrop-blur">
        {d.tag}
      </span>
    </div>
  )
}

function DeviceCard({ d }) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-card transition-all duration-500 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift">
      <DeviceStage d={d} />
      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand">{d.en}</p>
        <h3 className="mt-1.5 text-[17px] font-semibold tracking-tight text-ink-900">{d.name}</h3>
        <p className="mt-2.5 text-[13px] leading-[1.75] text-ink-500">{d.blurb}</p>
        {d.specs.length > 0 && <SpecList specs={d.specs} />}
      </div>
    </div>
  )
}

/* 参数表：卡片与宽体 feature 卡共用 */
function SpecList({ specs }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-ink-900/[0.07] pt-4">
      {specs.map(([k, v]) => (
        <div key={k} className="border-l-2 border-brand/25 pl-2.5">
          <dt className="text-[11px] text-ink-500">{k}</dt>
          <dd className="mt-0.5 text-[12.5px] font-medium leading-snug text-ink-800">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/* 单机型分区（如智能制造产线）：横向大卡，避免一张卡孤零零占 1/3 行 */
function FeatureCard({ d }) {
  return (
    <div className="group grid overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-white shadow-card transition-all duration-500 hover:border-brand/30 hover:shadow-lift md:grid-cols-2">
      <DeviceStage d={d} />
      <div className="flex flex-col justify-center p-7">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">{d.en}</p>
        <h3 className="mt-2 text-[24px] font-bold tracking-tight text-ink-900">{d.name}</h3>
        <p className="mt-3 text-[13.5px] leading-[1.8] text-ink-500">{d.blurb}</p>
        {d.specs.length > 0 && <SpecList specs={d.specs} />}
      </div>
    </div>
  )
}

/* 首屏产品环：直接采用 React Bits 的 CircularCarousel（3D 圆环 +
   惯性拖拽 + 吸附 + 点击聚焦）。这里只做「选中式样」的色阶调校：
   · fadeColor 取首屏舞台的墨蓝底 #0e2238（与 HeroBackdrop 中段同档），离正面越远越融进背景，边界不留白块；
   · depthFade 拉开层次，正面选中项满不透明、邻位按角度分级衰减；
   · 品牌蓝底辉 + 前位聚焦光环，让被选中的设备在冷色舞台里「亮起来」。
   精选跨 7 类的代表机型，图各不相同，绕成一台会转的产品陈列。 */
const HERO_PICKS = [
  'ws-finance', 'xr-meta', 'rb-teach', 'ai-cabinet', 'sd-chain',
  'ii-vision', 'ln-smt', 'ws-research', 'xr-are', 'rb-agv', 'ai-screen', 'ii-box2',
]

function HeroCarousel() {
  const items = HERO_PICKS
    .map((id) => devices.find((d) => d.id === id))
    .filter(Boolean)
    .map((d) => ({
      src: d.img,
      alt: d.name,
      title: d.name,
      subtitle: d.en,
    }))

  return (
    /* 六页里唯一自带 3D 环的首页：外框仍走 HeroFrame，tag 与提示统一交给
       外壳，环体只负责转 —— 否则这一页在六页里会像另一个站。 */
    <HeroFrame index="03 / 06" label="精选装备 · PRODUCT RING" hint="拖拽 · 滚轮 · 点击设备环绕浏览">
      <div className="relative overflow-hidden pb-7 pt-9">
        {/* 品牌蓝底辉（压得很低）+ 极淡网格 HUD，给环一点纵深 */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[46%] h-[320px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--theme-halo-soft),transparent)] blur-[6px]" />
          <div className="absolute inset-0 opacity-[0.1] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(80%_76%_at_50%_46%,#000,transparent)]" />
        </div>

        <div className="relative h-[300px] w-full sm:h-[320px]">
          <CircularCarousel
            items={items}
            preset="cylinder"
            intro="rise"
            cardWidth={220}
            perspective={3400}
            aspectRatio={1}
            gap={26}
            autoplay="drift"
            speed={10}
            direction="left"
            pauseOnHover
            focusOnClick
            snap
            momentum={0.6}
            parallax={0.28}
            depthFade={0.5}
            fadeColor="#0e2238"
            innerShade={0.55}
            cornerRadius={16}
            captions
          />
        </div>

        {/* 环底收口：让远处的卡渐暗进背景的墨蓝，不留硬边 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#0e2238]" />
      </div>
    </HeroFrame>
  )
}

/* ―― 智能装备 · 具身机器人实机（自原「智能产品」页并入）――
   左列机型列表（点选切换），右列一台 3D 查看器 + 该机型介绍。
   全程只挂一台画布：切机型只换模型（GLB 由 useGLTF 缓存），不把 WebGL
   上下文叠到浏览器上限。展示与首页产品矩阵、3D 展台同源（embodiedProducts）。 */
const pad = (i) => String(i + 1).padStart(2, '0')

/* 机型列表：桌面竖排；窄屏两列铺开（不再横向滚动 —— 横滑的 min-content
   会把整块栅格撑到 700px+，正是 390 下内容被裁切的根因），选中项品牌色左条 + 白卡浮起 */
function GearList({ items, idx, onPick }) {
  return (
    <div className="grid grid-cols-2 gap-2 pb-1 lg:flex lg:flex-col lg:gap-1.5 lg:pb-0">
      {items.map((it, i) => {
        const on = i === idx
        return (
          <button
            key={it.code}
            type="button"
            onClick={() => onPick(i)}
            aria-pressed={on}
            className={`group relative min-w-0 rounded-xl border px-3 py-3 text-left transition-all duration-300 sm:px-4 lg:w-full ${
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

function SmartGearSection() {
  const reduced = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const p = embodiedProducts[idx]
  /* 这一段紧跟首屏，1440×900 下本来就在预热门距内；门控真正生效的是矮屏与窄屏
     （机型列表竖排后舞台被推到一屏之外），以及「滚过去之后」——once:false 让
     12000px 长页的后半程不再常驻一个 WebGL 上下文与整棵场景。
     门控必须放在这层常驻外框上，不能放进 ProductViewer 内部：它自己的 IO 要等
     Canvas 首帧挂上 ref 才接线，条件挂载会让 ref 恒为 null、frameloop 永远停在
     never（见 ProductViewer 注释）。 */
  const stageRef = useRef(null)
  const live = useInView(stageRef, { once: false, margin: '900px' })

  return (
    <PageSection
      id="smart"
      tone="white"
      head={{
        en: 'EMBODIED ROBOTS',
        zh: '智能装备 · 具身机器人实机',
        sub: '人形 / 机械臂 / 移动 / 轮式 / 视觉 / 算力六类成套装备，可 360° 旋转查看实机模型与关键参数。',
      }}
    >
      {/* min-w-0 一路贯通：栅格默认按 min-content 排，Canvas 与长参数行都会把它顶宽 */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* 左：机型列表 */}
        <aside className="order-2 min-w-0 lg:order-1">
          <GearList items={embodiedProducts} idx={idx} onPick={setIdx} />
        </aside>

        {/* 右：展示 + 介绍 */}
        <div className="order-1 grid min-w-0 grid-cols-1 gap-5 lg:order-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* 3D 舞台 */}
          <div ref={stageRef} className="relative min-w-0 overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-mist-200 shadow-card">
            {live ? (
              <ProductViewer
                productIndex={idx}
                reduced={!!reduced}
                light
                className="h-[360px] w-full sm:h-[440px] xl:h-[520px]"
              />
            ) : (
              <div className="grid h-[360px] w-full place-items-center sm:h-[440px] xl:h-[520px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">LOADING 3D VIEWER…</span>
              </div>
            )}
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
          <div className="flex min-w-0 flex-col rounded-2xl border border-ink-900/[0.07] bg-white p-5 shadow-card sm:p-6 xl:p-7">
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
                    {/* 长参数（尺寸/接口）在 390 下允许折行，不再用 nowrap 顶破卡片 */}
                    <dd className="min-w-0 break-words text-right text-[12.5px] font-medium text-ink-800">{v}</dd>
                  </div>
                ))}
              </dl>

              <Link
                to="/about#contact"
                className="group mt-6 inline-flex items-center gap-2 self-start rounded-xl border border-brand/40 bg-brand/[0.06] px-5 py-3 text-ui font-medium text-brand transition-colors hover:bg-brand hover:text-white"
              >
                索取 {p.code} 参数手册
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </PageSection>
  )
}

export default function Devices() {
  return (
    <>
      <PageHero
        eyebrow="TEACHING EQUIPMENT"
        crumbs="教学设备"
        title="把产业现场，搬进每一间实训室"
        sub="从超融合算力工作站、XR 虚实融合交互、智能机器人，到工业物联网实训台与智能制造产线 —— 按设备类型整理的可交付教学装备。参数摆在明面上，型号可按场地、专业与人数在方案阶段成套配置。"
        stats={[
          { k: '设备类型', v: '7 类' },
          { k: '精选设备', v: '20+' },
          { k: '覆盖专业', v: '商科 · 工科' },
          { k: '交付形态', v: '软硬一体' },
        ]}
        cta={[
          { label: '索取设备清单', to: '/about#contact', primary: true },
        ]}
      >
        <HeroCarousel />
      </PageHero>

      {/* 智能装备：具身机器人 3D 实机（自原「智能产品」页并入） */}
      <SmartGearSection />

      {deviceTypes.map((t, i) => {
        const list = devices.filter((d) => d.type === t.id)
        const n = list.length
        // 列数按卡数自适应 + 断点递进，任何宽度都不留半行空洞：
        // 2 卡 → sm 起两列；3 卡 → md 起三列（640–767 保持单列）；4 卡 → 2×2 两列
        const cols = n === 3 ? 'sm:grid-cols-1 md:grid-cols-3' : 'sm:grid-cols-2'
        return (
          <PageSection
            key={t.id}
            id={t.id}
            tone={i % 2 === 0 ? 'mist' : 'light'}
            head={{
              n: String(i + 1).padStart(2, '0'),
              en: t.en,
              zh: t.zh,
              sub: t.note,
            }}
          >
            {n === 1 ? (
              <Reveal>
                <FeatureCard d={list[0]} />
              </Reveal>
            ) : (
              <div className={`grid gap-5 grid-cols-1 ${cols}`}>
                {list.map((d, j) => (
                  <Reveal key={d.id} delay={(j % 2) * 0.06}>
                    <DeviceCard d={d} />
                  </Reveal>
                ))}
              </div>
            )}
          </PageSection>
        )
      })}
    </>
  )
}
