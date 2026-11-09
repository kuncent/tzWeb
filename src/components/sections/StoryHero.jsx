import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { heroScenes, heroMeta } from '../../data/heroScenes'
import { useHeroScenes, useContent } from '../../lib/contentStore'
import { productMatrix, brand } from '../../data/site'
import { requestMatrixIndex } from '../../lib/matrixNav'
import { getBuildStage, markHeroReady, selectDevice, skipBuild } from '../three/hero/buildBus'
import { hasWebGL } from '../../lib/capability'

/* ============================================================
 * 首屏：企业型单屏（AI 3D 作背景）
 * ------------------------------------------------------------
 * 左栏 = 公司简介 + 六大产品体系入口色块；右栏 = 服务网络地图
 * （HeroCoverage：六服务枢纽向全国辐射的暗色中国地图航线）；身后保留 AI 3D 舞台。
 * 桌面端 sticky 钉屏，移动 / 平板纵向堆叠、不挂 WebGL。
 *
 * 两条硬约束：
 * 1. WebGL 一定要懒加载 + 延迟挂载。首屏的 LCP 是文案，不是 three.js。
 * 2. cmd 仍按节拍自演、驱动身后 3D —— 看板下线了，但舞台不能静止。
 * ============================================================ */

const HeroStage = lazy(() => import('../three/HeroStage'))
/* 服务网络：复用现成的暗色中国地图 + 辐射航线组件（ECharts，单独切 chunk） */
const HeroCoverage = lazy(() => import('./HeroCoverage'))

/* 3D 出错不能影响整页。
   站点本来一个错误边界都没有，
   而实测（真 Chrome）一个非法 children 就能让 React 卸载整棵树 ——
   首屏直接白屏。挂在这儿，退化成 CSS 动底 + 文案 + 看板照常。
   onDead 是跟下面那块 CSS 动底的卸载门控配套的：舞台进坑了就得把动底接着
   亮回去（scrimGone 只按时间轴走，不然降级到 CSS 那一档会拿到一块黑底） */
class StageGuard extends Component {
  constructor(props) {
    super(props)
    this.state = { dead: false }
  }
  static getDerivedStateFromError() {
    return { dead: true }
  }
  componentDidCatch(err) {
    console.warn('[hero] 3D 舞台已降级为静态背景：', err?.message || err)
    this.props.onDead?.(err)
  }
  render() {
    return this.state.dead ? null : this.props.children
  }
}

const N = heroScenes.length
const LAST = N - 1
/* 每屏 76vh 滚动行程：太短切屏像被抽了一下，太长手指划到底会累 */
const STEP_VH = 76
const EASE = [0.22, 1, 0.36, 1]

/* 六大产品入口色块：蓝→青等距阶梯，明度逐档对齐，读作一条刻意的光谱而非随机蓝；
   与 3D 展板的 HUES 同族、各自一套（这一套略深，适合贴在近黑首屏上的小色块） */
const PRODUCT_HUES = ['#4C7DFF', '#3D93FF', '#2BA9F5', '#1FBEDF', '#25CFC6', '#1DE8B7']
/* 色块用简称：取 title 「·」前的第一段，够短也够认 */
const shortName = (t) => (t.includes('·') ? t.split('·')[0] : t).trim()

/* 算“用户自己动了”的手势。不监听 scroll：那是程序化跳屏（下面的 jump、
   锚点链接）也会发的，用户没动我们就快进片头，等于自己掰自己 */
const GESTURES = ['wheel', 'touchmove', 'keydown', 'pointerdown']

/** 没有 WebGL（或用户要求减少动效）时的动底：多层渐变 + 缓慢漂移，纯 CSS，几十字节 */
function Scrim({ accent, still = false }) {
  const drift = (dur, x, y) => (still ? undefined : { x, y, transition: { duration: dur, repeat: Infinity, ease: 'linear' } })
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          /* 底色压到页脚基座 night（#06080d）：与解决方案首屏主色调互换后，
             首页走深近黑——不再抬成冰蓝 */
          background:
            'linear-gradient(180deg, #06080d 0%, #06080d 58%, #070e1d 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(70% 42% at 50% 100%, rgba(37,212,255,0.06), transparent 70%)' }}
      />
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(75%_65%_at_38%_46%,black,transparent)]" />
      <motion.div
        className="absolute left-[8%] top-[6%] h-[560px] w-[560px] rounded-full opacity-70"
        style={{ background: `radial-gradient(closest-side, ${accent}33, transparent)` }}
        animate={drift(22, [0, 70, 0], [0, -34, 0])}
      />
      <motion.div
        className="absolute bottom-[4%] right-[10%] h-[480px] w-[480px] rounded-full opacity-60"
        style={{ background: `radial-gradient(closest-side, ${accent}26, transparent)` }}
        animate={drift(28, [0, -60, 0], [0, 26, 0])}
      />
      {/* 扫描线：一行行走过去，静态图也能读出“在运行” */}
      {!still && (
        <motion.div
          className="absolute inset-x-0 h-[1px] opacity-[0.18]"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
          animate={{ top: ['-5%', '105%'] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  )
}

/** 左侧：公司简介 + 六大产品体系入口色块（替代原业务文案层） */
function HeroIntro({ scene, still }) {
  const enter = (delay) => ({
    initial: still ? false : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: EASE },
  })
  const rise = (delay) => ({
    initial: still ? false : { y: '115%', filter: 'blur(5px)' },
    animate: { y: '0%', filter: 'blur(0px)' },
    transition: { duration: 0.62, delay, ease: EASE },
  })
  return (
    /* 整块文案的宽度上限 = 标题最长一行（8 个字 ≈ 7.9 × 字号）：
       桌面由外层列宽兜底（552/492），这一条负责窄屏堆叠版式 ——
       标题只有 8 字宽、正文却铺满整屏会显得上小下大，也违背"内容不宽于标题" */
    <div
      className="relative max-w-full"
      style={{ maxWidth: 'calc(7.9 * clamp(2.5rem, 1.5rem + 3.8vw, 4.4rem))' }}
    >
      {/* 品牌眉标 —— 提升存在感：圆点更大、字距更紧、色更亮 */}
      <motion.div className="relative flex items-center gap-3" {...enter(0)}>
        <span className="h-2 w-2 rounded-full" style={{ background: scene.accent, boxShadow: `0 0 16px ${scene.accent}` }} />
        <span className="text-[12px] font-semibold uppercase tracking-[0.26em]" style={{ color: scene.accent }}>
          {heroMeta.eyebrow}
        </span>
      </motion.div>

      {/* 公司主张 —— 一行最多 8 个字：max-w-[8em]（8 个字号宽）+ 三行语义硬断。
          原版「构建下一代人才培养基础设施」在 716px 的列里会排成 9 字一行，
          现在断成 5 / 5 / 8（最长一行正好 8 字），同时把整列收窄到标题的宽度，
          让出中间约 160px 给 3D 展示 */}
      <h1 className="relative mt-5 max-w-[8em] text-h1 font-bold leading-[1.08] tracking-[-0.03em] text-white">
        <span className="block overflow-hidden">
          <motion.span className="block" {...rise(0.06)}>天择教育，</motion.span>
        </span>
        <span className="block overflow-hidden">
          <motion.span className="block" style={{ color: scene.accent }} {...rise(0.14)}>构建下一代</motion.span>
        </span>
        <span className="block overflow-hidden">
          <motion.span className="block" style={{ color: scene.accent }} {...rise(0.2)}>人才培养基础设施</motion.span>
        </span>
      </h1>

      {/* 公司简介 —— 提升对比度到 text-white/70，字号升为 text-ui (14px) */}
      <motion.p className="mt-6 text-ui leading-[1.85] text-white/70" {...enter(0.2)}>
        {brand.short}（{brand.en}）面向高校与职业院校，把 AI 多智能体、数字孪生与真实链路实训做成能直接开课的人才培养基础设施——六大产品体系一体交付，让前沿产业能力变成学生上手的能力。
      </motion.p>

      {/* 六大产品体系入口色块 —— 按用户要求收一档：字号/图标/内边距/间距整体缩小，
          但 py-2.5 + 9 号图标仍保证整块 ≥ 44px 的可点高度。
          这一轮再收长度：色块栅格限宽 580px（原随文案列 660px），单块 285px 宽 ——
          比上一版窄约 32px，但 285 仍装得下 6 字中文 + 9px 英文名，不折行
          pointer-events-auto 必须显式加：整个左文案列是 pointer-events-none
          （让 orbit 拖拽能穿到 canvas），交互子块要各自接回 auto，否则点色块
          会穿到背后的 canvas，看着像点了没反应（与下方主 CTA 同一套做法） */}
      <motion.div className="pointer-events-auto mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2" {...enter(0.26)}>
        {productMatrix.map((p, i) => {
          const hue = PRODUCT_HUES[i % PRODUCT_HUES.length]
          const Icon = p.icon
          return (
            <Link
              key={p.id}
              to="/products"
              onClick={() => requestMatrixIndex(i)}
              className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(22,119,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              style={{ borderColor: `${hue}50`, background: `${hue}18` }}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ background: `${hue}28`, color: hue, boxShadow: `0 0 12px ${hue}20` }}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-white">{shortName(p.title)}</span>
                <span className="block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">{p.en}</span>
              </span>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/40 transition-all duration-300 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          )
        })}
      </motion.div>

      {/* 主 CTA */}
      <motion.div className="pointer-events-auto mt-7 flex flex-wrap items-center gap-3.5" {...enter(0.32)}>
        <a
          href="/about#contact"
          className="group inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-[14px] font-semibold text-night transition-all duration-300 hover:-translate-y-0.5"
          style={{ background: scene.accent, boxShadow: `0 20px 48px -16px ${scene.accent}b0` }}
        >
          预约这套方案
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
        <a href="/about" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-[13.5px] font-medium text-white/90 transition-all duration-300 hover:border-white/55 hover:bg-white/[0.08]">
          了解天择教育
        </a>
      </motion.div>
    </div>
  )
}

/** 底部现场 telemetry：一个走秒的 uptime + 室温。
    单独一个组件、单独一份 state —— 让它每秒只重渲这四个节点，
    不要把整块看板跟着重渲一遍（上一版的长任务有一半是这么来的）。 */
function Uptime({ accent, still }) {
  const [s, setS] = useState(0)
  useEffect(() => {
    if (still) return
    const id = setInterval(() => setS((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [still])
  const hh = String(Math.floor(s / 3600) + 2).padStart(2, '0')
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  /* 室温：拿秒数做个确定性微抖，看着像传感器而不是写死的字 */
  const temp = (22.4 + Math.sin(s * 0.31) * 0.12).toFixed(1)
  return (
    <span className="hidden shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/52 lg:flex">
      <span>UPTIME <span className="tabular-nums text-white/55">{hh}:{mm}:{ss}</span></span>
      <span className="h-3 w-px bg-white/10" />
      <span style={{ color: `${accent}99` }}>AMBIENT {temp}°C</span>
    </span>
  )
}

/** 移动 / 平板：纵向堆叠 —— 公司简介 + 色块在上，服务网络在下，不挂 WebGL */
function MobileHero({ scene, still }) {
  return (
    <div className="relative overflow-hidden border-b border-white/[0.06] px-6 py-14">
      <Scrim accent={scene.accent} still={still} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(3,6,12,0.6),rgba(3,6,12,0.15)_40%,rgba(3,6,12,0.82))]" />
      <div className="relative">
        <HeroIntro scene={scene} still={still} />
        <div className="relative mt-10 rounded-2xl border border-white/12 p-5 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* 独立暗底隔离下方 3D */}
          <div className="absolute inset-0 bg-night-900 rounded-2xl" aria-hidden />
          <div className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]" aria-hidden />
          <div className="relative">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em]" style={{ color: scene.accent }}>服务网络</p>
            <p className="mt-1.5 text-[13px] text-white/60">以深圳总部为中心，六大服务枢纽辐射全国</p>
            <div className="relative mt-4 h-[320px] overflow-hidden rounded-xl border border-white/[0.08] bg-night-900">
              <Suspense fallback={null}>
                <HeroCoverage reduced={still} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StoryHero() {
  const outerRef = useRef(null)
  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  idxRef.current = idx /* 自动演示定时器里读「现在第几屏」而不进依赖数组，
                          省得每滚一格就把 interval 重挂一遍 */
  const [cmd, setCmd] = useState({ id: '', n: 0 })
  const lastUser = useRef(0)
  /* 首屏可编辑文案：从发布 overlay 取（后台"内容编辑 → 首屏三屏"改了就生效），
     拉不到即回落 heroScenes / heroMeta 默认。scenes 与 heroScenes 同长、同结构，
     只多了被覆盖的文本字段；索引与 3D 指令仍按 heroScenes 原序对齐。 */
  const scenes = useHeroScenes()
  const heroBrand = useContent('heroMeta.brand', heroMeta.brand)
  const heroEyebrow = useContent('heroMeta.eyebrow', heroMeta.eyebrow)

  /* 能力探测：WebGL / 减弱动效 / 视口宽度。三个都不满足时首屏退成纯 CSS + 看板 */
  const [env, setEnv] = useState({ gl: true, reduced: false, desktop: true, wide: true, loose: true })
  useEffect(() => {
    /* WebGL 能力走全局单例（capability.js）：只测一次、探测上下文用完即弃，
       不在此处 getContext 新建一个常驻的一次性上下文去挤占名额 */
    const gl = hasWebGL()
    const rq = window.matchMedia('(prefers-reduced-motion: reduce)')
    /* desktop 决定挂不挂 3D；wide（≥1280）决定服务地图用完整版还是紧凑版；
       loose（≥1440）决定 3D 展板用原始席位还是 1024–1439 的专用排布 */
    const read = () => setEnv({ gl, reduced: rq.matches, desktop: window.innerWidth >= 1024, wide: window.innerWidth >= 1280, loose: window.innerWidth >= 1440 })
    read()
    window.addEventListener('resize', read)
    rq.addEventListener?.('change', read)
    return () => {
      window.removeEventListener('resize', read)
      rq.removeEventListener?.('change', read)
    }
  }, [])

  /* 舞台延迟挂载：先让文案与看板落地，再取 three.js。
     ―― 160ms 定时器改成“等浏览器空闲”：实测（tmp/boot-perf.mjs）入口那
     301KB gzip 的解析+首次渲染是一整块 1201ms 的长任务，而旧写法的 160ms
     正好砸在它尾巴上 —— three 的 1MB chunk 下载、编译、着色器编译全叠在
     用户读标题的那两秒里，手感受到的是“页面在拽”。总之就是把这堆编译忙乱
     推给 idle：timeout 保证最迟 1.6s 一定挂（不能无限等，那就不叫延迟而
     叫丢了）；没有 requestIdleCallback 的浏览器退回一个拍定的 700ms */
  const [stageOn, setStageOn] = useState(false)
  useEffect(() => {
    if (!env.gl || env.reduced || !env.desktop) {
      /* 这台设备根本不挂 3D：遮罩没有可等的东西，文案落地就收。
         （env 初值是“全都能”，窄屏会在下一个 effect 里读到真实值再走到这儿） */
      markHeroReady('nostage')
      return
    }
    const go = () => setStageOn(true)
    const ric = window.requestIdleCallback
    const id = ric ? requestIdleCallback(go, { timeout: 1600 }) : setTimeout(go, 700)
    return () => (ric ? cancelIdleCallback(id) : clearTimeout(id))
  }, [env.gl, env.reduced, env.desktop])

  /* ―― 滚动即跳过片头（用户：动画时间还是太长了，用户看不完就开始滚动）――
     看不完不是把动画调更快就能解的，得给一个出口：用户一动，装配时钟改按
     3.2x 走（skipBuild → buildClock.ff，见 buildBus），不到 1s 落回全景运行态。
     不硬切、不另做一套“跳过逻辑”：相机轨道、工序号、指令门控、地板铭牌全读
     同一个 buildClock.t，时钟快了就全线快。
     判“还要不要守”只看“演完没”：stage 6 = live。不能拿 stage < 0 当“不在
     片头里”—— 刚进来那会儿它就是 -1（rig 未挂载，而 -1 兼作“不在场”），
     把它当退出条件会把监听摘干净而一次也没快进过 */
  useEffect(() => {
    if (env.reduced) return
    const off = () => GESTURES.forEach((e) => window.removeEventListener(e, hit))
    function hit() {
      if (getBuildStage() < 6) skipBuild()
      /* 他在遮罩还没收的时候就先动了：那就是不想在门口等，立刻放行。
         不这么做的话滚轮会“页面在遮罩后面滚、人看着一块黑” */
      markHeroReady('user')
      off()
    }
    GESTURES.forEach((e) => window.addEventListener(e, hit, { passive: true }))
    return off
  }, [env.reduced])

  /* ―― CSS 动底的按时卸载 ――
     canvas 是不透明的（Scene 里有 <color attach="background">），它淡入到位以后，
     身后那一整块 Scrim 就成了看不见的东西 —— 但它还在合成队列里：四层全屏
     渐变 + 一个 mask-image 网格 + 两团 560/480px 辉光。上一轮只停了那几笔
     无限动画（still），层本身一层没拆。实测（tmp/glass-cost.mjs，链屏）：
     藏掉排版层与 Scrim 各约省 9~10ms/帧。现在淡入（1.4s）走完再加 0.3s 余量，
     整块从 DOM 摘掉。WebGL 进坑（stageDead）时它跟着回来 */
  const [stageDead, setStageDead] = useState(false)
  const [stageLost, setStageLost] = useState(false)
  /* 画布真的画出第一帧的凭据（StageReady 回调）。动底拆不拆以此为门，
     不再拿一个盲定时器去赌帧会不会来 */
  const [stagePainted, setStagePainted] = useState(false)
  const [scrimGone, setScrimGone] = useState(false)
  useEffect(() => {
    /* 必须等 stagePainted：canvas 未真在画就把动底拆了，会露出 #06080d 纯黑。
       帧不来（弱机首帧编译、后台失焦、GPU 被抢）则动底一直亮着 —— 读到的是
       设计好的深色渐变 + 文案，不是黑。淡入（1.4s）走完再加 0.3s 余量才摘 */
    if (!stageOn || stageDead || !stagePainted) return
    const id = setTimeout(() => setScrimGone(true), 1700)
    return () => clearTimeout(id)
  }, [stageOn, stageDead, stagePainted])

  /* 看板已下线，不再需要 fire；cmd 由下面的节拍定时器自演，继续驱动身后 3D */

  /* 滚动 → 屏序号（只在首屏附近挂监听，做法与产品矩阵一致） */
  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    let raf = 0
    let bound = false
    const update = () => {
      raf = 0
      const rect = outer.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      if (span <= 0) return
      const v = Math.min(1, Math.max(0, -rect.top / span))
      setIdx((cur) => {
        const i = Math.min(LAST, Math.floor(v * N))
        return cur === i ? cur : i
      })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const attach = () => {
      if (bound) return
      bound = true
      update()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
    }
    const detach = () => {
      if (!bound) return
      bound = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
    const io = new IntersectionObserver(([en]) => (en.isIntersecting ? attach() : detach()), { rootMargin: '300px 0px' })
    io.observe(outer)
    return () => {
      io.disconnect()
      detach()
    }
  }, [])

  /* 换屏：清掉上一屏的指令，同时把 n 进一格 —— 镜头会因此轻轻一推，像换台的动作。
     顺带解掉 3D 里的聚焦：上一屏还锁在某台设备 / 某块看板上，切过来镜头就停在特写里
     出不去（而两屏的选中 id 不是一套，留在总线上就是个悬空引用） */
  const prevIdx = useRef(0)
  useEffect(() => {
    if (prevIdx.current === idx) return
    prevIdx.current = idx
    setCmd((c) => ({ id: '', n: c.n + 1 }))
    selectDevice('wide')
  }, [idx])

  /* 无人操作时自己演：每 5.6s 换一条指令，被人碰过就安静 7s */
  useEffect(() => {
    if (env.reduced) return
    const id = setInterval(() => {
      if (Date.now() - lastUser.current < 7000) return
      setCmd((c) => {
        const list = heroScenes[idxRef.current].commands
        const i = list.findIndex((x) => x.id === c.id)
        const nx = list[(i + 1) % list.length]
        return { id: nx.id, n: c.n + 1 }
      })
    }, 5600)
    return () => clearInterval(id)
  }, [env.reduced])

  const jump = (i) => {
    skipBuild() // 点屏标签 = 要切屏，不是在等片头
    const outer = outerRef.current
    if (!outer) return
    const rect = outer.getBoundingClientRect()
    const span = rect.height - window.innerHeight
    if (span <= 0) return
    const y = window.scrollY + rect.top + span * ((i + 0.5) / N)
    if (window.__lenis) window.__lenis.scrollTo(y)
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  const scene = scenes[idx]
  const still = env.reduced

  return (
    <section id="hero" className="relative bg-night-900 text-white">
      {/* ―― 桌面：钉屏三切 ―― */}
      <div ref={outerRef} className="hidden lg:block" style={{ height: `calc(100vh + ${LAST * STEP_VH}vh)` }}>
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* 静态渐变底：canvas 淡入前、WebGL 报错降级（stageDead）、以及
              WebGL 上下文被丢弃尚未恢复（stageLost）时它就是底。后两者是黑屏的
              直接兜底 —— 上下文丢失不会抛异常进错误边界，只能靠这层盖住黑底。
              淡入走完后整块摘掉，理由见上面那段 */}
          {(!scrimGone || stageDead || stageLost) && <Scrim accent={scene.accent} still={still || (stageOn && !stageLost)} />}

          {stageOn && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: stageLost ? 0 : 1 }}
              transition={{ duration: stageLost ? 0.2 : 1.4, ease: 'easeOut' }}
            >
              <Suspense fallback={null}>
                <StageGuard
                  onDead={() => {
                    setStageDead(true)
                    /* 舞台进了错误边界：等下去没有头，遮罩得跟着收 */
                    markHeroReady('dead')
                  }}
                >
                  <HeroStage
                    idx={idx}
                    cmd={cmd}
                    panelLayout={env.desktop && !env.loose ? (env.wide ? 'wide' : 'narrow') : false}
                    onContextLost={() => setStageLost(true)}
                    onContextRestored={() => setStageLost(false)}
                    onPainted={() => setStagePainted(true)}
                  />
                </StageGuard>
              </Suspense>
            </motion.div>
          )}

          {/* 左侧压一层暗 scrim，保证标题在任何机位下都读得清。
              右尾那一档比原来收得快很多：链屏那六块看板是 DOM 的，它们按 z-index
              画在这层 scrim 之上，scrim 管不到牌面，却还管着牌后面那圈机箱与辉光 ——
              于是原来那个 40% 处还有 0.58 的长尾巴会把左列三块牌的框子压成右列
              的一半亮，两列读起来就不是同一间机房了。现在 46% 就收到 0.12。
              ―― 三块沉底渐变现在合成一块：三个叠在全屏 canvas 上的绝对定位层是
              三笔全屏混合。合并后一条 background-image 列三层，配 size/position
              各自定位：底层那 160px 靠下、右那块 48%×72% 靠右下、左 scrim 铺满。
              书写顺序从上层往下走（与原 DOM 顺序相反），渐变本体一个像素没改 */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(70% 40% at 50% 100%, rgba(37,212,255,0.05), transparent 72%), linear-gradient(to top, rgba(6,8,13,0.86), rgba(6,8,13,0.34) 15%, transparent 34%), radial-gradient(120% 100% at 100% 100%, rgba(6,8,13,0.74), transparent 72%), linear-gradient(90deg, rgba(6,8,13,0.9) 0%, rgba(6,8,13,0.74) 26%, rgba(6,8,13,0.5) 37%, rgba(6,8,13,0.07) 48%, rgba(6,8,13,0.02) 62%, rgba(6,8,13,0.14) 100%)',
              /* 左侧那层仍压到 0.9：白字对比度是硬约束；色相收到近黑（night），与解决方案首屏主色调互换 */
              backgroundSize: '100% 100%, 100% 260px, 50% 76%, 100% 100%',
              backgroundPosition: '50% 100%, 0 100%, 100% 100%, 0 0',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* 1024–1279 补一层左侧压暗：这一档地图已收成窄面板，3D 展板比 ≥1280
              时更靠近文案，全靠原来那条 scrim 会在 40%–66% 区间偏亮。只加深左半段，
              到 84% 处完全透明，不影响右侧面板与 3D 主体。 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden lg:block xl:hidden"
            style={{ background: 'linear-gradient(90deg, rgba(6,8,13,0.86) 0%, rgba(6,8,13,0.82) 30%, rgba(6,8,13,0.72) 50%, rgba(6,8,13,0.6) 62%, rgba(6,8,13,0.28) 74%, transparent 84%)' }}
          />

          {/* 底沿羽化：首屏是近黑 #06080d，页脚顶是墨蓝 #0a1a2e——两者直接相接会
              在接缝处出现“下缘突然亮一档”的台阶。用一层透明→#0a1a2e 的向下晕影
              把最后一段化开，让 3D 地台收束到页脚顶色，接缝零台阶——页脚自身的冷
              光缝线就落在两者交汇的同一档蓝上，读作“同一间机房往外延伸”。
              这层在 canvas/scrim 之上、z-[70] 文案与地图面板之下，只染背景不染内容。 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[160px]"
            style={{ background: 'linear-gradient(to bottom, transparent, #0a1a2e)' }}
          />

          {/* 这层排版容器必须 pointer-events-none：它铺满整屏且叠在 canvas 之上，
              默认 auto 会把全部指针事件截走 —— orbit 拖不动、设备点不到（实测
              elementFromPoint 在画面正中返回的就是它）。真正要交互的子块各自接回 auto */}
          <div className="pointer-events-none relative z-[70] mx-auto h-full w-full max-w-[1440px] px-10 2xl:max-w-[1640px] 3xl:max-w-[1780px]">
            {/* ―― 文案：左侧一条竖带 ――
               上一版是 grid 两列（1fr / 420px），结果 3D 被夹在中间一条窄带里，
               三屏都像“两张海报中间塞了一张贴图”。现在改成绝对定位分层：
               文案只占左 43%，右下角放控制舱，中间到右边整片都是场景的自由带。
               这一列本身必须 pointer-events-none：它是 inset-y-0 的通高盒，auto 会把
               左半屏的指针事件全截走 —— 链屏那条看板线伸到 x 230 起，左边几块牌
               点不到就是这么被吃掉的（实测 elementFromPoint 在牌心返回的是文案
               那个 motion 容器）。真正要交互的只有下面那两个按钮，它们自己接回 auto */}
            {/* 左文案列：宽度直接跟标题字号走 —— 8 个字 ≈ 7.9 倍字号，
                这样 1024、1280、1920每一档都刚好装下 8 字一行，不会在
                1279 这种中间宽度把「人才培养基础设施」再折一次。
                比原来的 716px 窄了约 160px，中间 3D 展板因此宽松 */}
            <div
              className="pointer-events-none absolute inset-y-0 left-10 flex flex-col justify-center pt-[132px] pb-[156px]"
              style={{ width: 'calc(7.9 * clamp(2.5rem, 1.5rem + 3.8vw, 4.4rem))' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={scene.id}
                  initial={still ? false : { opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -36, transition: { duration: 0.24, ease: 'easeIn' } }}
                  /* mode="wait"：老文案上提退完，新文案才从下方浮起。
                     退场比进场短很多（写在 exit.transition 里，挂在 transition 上
                     会把进场一起改掉）：退场是「让位」，得在新厅升起来之前清场；
                     进场带着整块看板的内部错峰，要跟着 3D 落位的拍子走 */
                  transition={{ duration: 0.46, delay: 0.08, ease: EASE }}
                >
                  <HeroIntro scene={scene} still={still} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ―― 服务网络：贴着右下角的地图面板（半透明，尽量不遮挡 3D 实验室）――
                位置在这一轮又上移了 20px（bottom-0 → bottom-[20px]），与首屏底沿拉开
                一点呼吸，也给低位的商务数据分析展板让出下沿 */}
            {/* 1024–1279 用紧凑版：280px 窄面板 + 更矮的地图 + 精简标签，只保住
                「6 枢纽 / 52 城」这组背书，不再挤占文案列；≥1280 恢复完整尺寸 */}
            <div className="pointer-events-none absolute bottom-[20px] right-10 hidden w-[280px] lg:block xl:right-0 xl:w-[clamp(340px,30vw,460px)]" data-lenis-prevent>
              <motion.div
                className="pointer-events-auto relative overflow-hidden rounded-2xl border border-white/12 p-3 shadow-[0_16px_48px_-18px_rgba(0,0,0,0.55)] xl:p-4"
                initial={still ? false : { opacity: 0, y: 34 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: still ? 0 : 0.16, ease: EASE }}
              >
                {/* 玻璃底：深空蓝半透明，透出身后的 3D 实验室；外框透明度不变 */}
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(180deg, rgba(10,20,38,0.5), rgba(5,9,17,0.42))' }} aria-hidden />
                {/* 细网格纹理：低对比度，只给玻璃一点「仪器面板」的质感 */}
                <div className="absolute inset-0 rounded-2xl opacity-60" style={{ backgroundImage: 'linear-gradient(to right, rgba(120,160,220,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,160,220,0.05) 1px, transparent 1px)', backgroundSize: '18px 18px' }} aria-hidden />
                {/* 左上冷光 + 内发光/内描边 */}
                <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(80% 70% at 0% 0%, rgba(47,123,255,0.14), transparent 62%)' }} aria-hidden />
                <div className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_0_26px_rgba(47,123,255,0.08)]" aria-hidden />

                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: scene.accent }}>服务网络</p>
                      <p className="mt-1 text-[12px] text-white/55">六大服务枢纽辐射全国</p>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">
                      <span className="h-1 w-1 rounded-full" style={{ background: scene.accent, boxShadow: `0 0 6px ${scene.accent}` }} />
                      live
                    </div>
                  </div>
                  <div className="relative mt-3 h-[190px] overflow-hidden rounded-xl border border-white/[0.06] bg-[rgba(10,17,31,0.22)] xl:h-[clamp(240px,32vh,340px)]">
                    {/* 地图背后的冷光晕：陆地描边外再垫一层柔光，避免面板里出现一块硬边 */}
                    <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(62% 56% at 50% 46%, rgba(47,123,255,0.14), transparent 72%)' }} aria-hidden />
                    <Suspense fallback={null}>
                      <HeroCoverage reduced={still} compact={!env.wide} />
                    </Suspense>
                  </div>
                  {/* 数据条：6 个枢纽在线 + 覆盖城市数，给面板一个「在运行」的状态锚点 */}
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
                        <span>NODES</span>
                        <span className="text-white/70">6 / 6</span>
                      </div>
                      <div className="mt-1.5 flex gap-1">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <span key={i} className="h-[3px] w-4 rounded-full" style={{ background: `linear-gradient(90deg, ${scene.accent}80, ${scene.accent})`, boxShadow: `0 0 6px ${scene.accent}55` }} />
                        ))}
                      </div>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">52 城覆盖</span>
                  </div>
                  <div className="mt-3 hidden items-center gap-4 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45 xl:flex">
                    <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: '#CFE6FF', boxShadow: '0 0 6px #CFE6FF' }} />总部</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full" style={{ background: scene.accent }} />枢纽</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/35" />城市</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* ―― 底部横条：仅在多屏时显示切换按钮，否则完全移除 ―― */}
          {scenes.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[70] flex h-[64px] items-center">
            <div className="mx-auto flex w-full max-w-[1440px] items-center gap-6 px-10 2xl:max-w-[1640px] 3xl:max-w-[1780px]">
              <div className="pointer-events-auto flex items-center gap-2">
                {scenes.map((s, i) => {
                  const on = i === idx
                  return (
                    <button
                      key={s.id}
                      onClick={() => jump(i)}
                      aria-current={on}
                      className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-[13px] transition-colors duration-300 ${
                        on ? 'text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {on && (
                        <motion.span layoutId="hero-scene-active" transition={{ type: 'spring', stiffness: 360, damping: 32 }} className="absolute inset-0 rounded-full border" style={{ borderColor: `${s.accent}55`, background: `${s.accent}1f` }} />
                      )}
                      <span className="relative font-mono text-[11px] tabular-nums" style={{ color: on ? s.accent : undefined }}>
                        {s.no}
                      </span>
                      <span className="relative whitespace-nowrap">{s.nav}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ―― 移动 / 平板：纵向堆叠，纯 CSS 动底 + 看板照旧可点 ―― */}
      <div className="lg:hidden">
        <div className="border-b border-white/[0.06] px-6 pb-3 pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/52">{heroEyebrow}</p>
          <p className="mt-1 text-[12px] text-white/50">{heroBrand}</p>
        </div>
        <MobileHero scene={scenes[0]} still={still} />
      </div>
    </section>
  )
}
