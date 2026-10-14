import { PageHero, InnerNav, PageSection, PageCTA } from '../components/PageShell'
import { Reveal } from '../components/ui'
import { deviceTypes, devices } from '../data/devices'
import CircularCarousel from '../components/reactbits/CircularCarousel'

/* ============================================================
 * 产品设备页
 * ------------------------------------------------------------
 * 复用内页同一套骨架（暗底 PageHero → 吸顶 InnerNav → 若干 PageSection
 * → 暗色收口 CTA），保证从首页点进来「不掉进另一个网站」。
 * 组织维度 = 设备类型：一类一屏，屏内是设备卡片网格。
 * 每张卡：暗底 HUD 舞台放产品图（透明底 500×500 落在深色上更立体），
 * 下面是我方口径的名称 / 简介 / 参数。命名一律类目通用名，不带外部品牌。
 * ============================================================ */

const SECTIONS = deviceTypes.map((t) => ({ id: t.id, label: t.zh }))

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
   · fadeColor 取暗底同款 #04070d，离正面越远越融进背景，边界不留白块；
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
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#04070d]">
      {/* 品牌蓝底辉（压得很低）+ 极淡网格 HUD：与 PageHero 同一套氛围，但不给白卡染色 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[42%] h-[320px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.12),transparent)] blur-[6px]" />
        <div className="absolute inset-0 opacity-[0.1] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(80%_76%_at_50%_42%,#000,transparent)]" />
      </div>

      <div className="relative h-[300px] w-full sm:h-[340px] lg:h-[376px]">
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
          fadeColor="#04070d"
          innerShade={0.55}
          cornerRadius={16}
          captions
        />
      </div>

      {/* 底部交互提示 + 前位聚焦辉，收口一行说明 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#04070d]" />
      <p className="relative border-t border-white/[0.06] py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
        拖拽 · 滚轮 · 点击设备 —— 环绕浏览精选装备
      </p>
    </div>
  )
}

export default function Devices() {
  return (
    <>
      <PageHero
        eyebrow="PRODUCT HARDWARE"
        crumbs="产品设备"
        title="把产业现场，搬进每一间实训室"
        sub="从超融合算力工作站、XR 虚实融合交互、智能机器人，到工业物联网实训台与智能制造产线 —— 按设备类型整理的可交付教学装备。参数摆在明面上，型号可按场地、专业与人数在方案阶段成套配置。"
        stats={[
          { k: '设备类型', v: '7 类' },
          { k: '精选设备', v: '20+' },
          { k: '覆盖专业', v: '商科 · 工科' },
          { k: '交付形态', v: '软硬一体' },
        ]}
        cta={[
          { label: '索取设备清单', to: '/#contact', primary: true },
          { label: '看实训实验室', to: '/laboratories' },
        ]}
      >
        <HeroCarousel />
      </PageHero>

      <InnerNav items={SECTIONS} />

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

      {/* ―― 定制收口：把「以上为代表性型号」讲清楚 ―― */}
      <PageSection tone="dark" className="!py-16 md:!py-20">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Icon0 />
          <h3 className="text-[19px] font-semibold tracking-tight text-white">页面所列为主力代表性型号</h3>
          <p className="text-[13.5px] text-white/55">完整设备清单、规格与配置数量按专业方向与场地人数在方案阶段确定。</p>
        </div>
      </PageSection>

      <PageCTA
        title="把专业方向和场地条件发我们"
        sub="告诉我们开什么课、有多少工位、房间多大，我们先出设备选型与布局清单，再谈配置与预算。这一步不收费。"
        back={{ label: '看解决方案', to: '/solutions' }}
      />
    </>
  )
}

/* 收口小图标：单独抽出来，避免在 map 里内联一串 SVG 打乱阅读 */
function Icon0() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-300">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <path d="M20 7 9 18l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
