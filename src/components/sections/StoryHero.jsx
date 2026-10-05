import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, ChevronDown, Radar } from 'lucide-react'
import { heroScenes, heroMeta } from '../../data/heroScenes'
import EmbodiedConsole from '../hero/EmbodiedConsole'
import BuildStepper from '../hero/BuildStepper'
import { getBuildStage, markHeroReady, selectDevice, skipBuild } from '../three/hero/buildBus'
import { hasWebGL } from '../../lib/capability'
import ChainConsole from '../hero/ChainConsole'
import NeuralConsole from '../hero/NeuralConsole'

/* ============================================================
 * 首屏：具身 / 区块链 / AI 三屏业务特效
 * ------------------------------------------------------------
 * 桌面端 = sticky 钉屏三切（外层撑出滚动行程，内层一整屏不动，
 * 滚动只负责换屏）；移动/平板 = 纵向堆叠，不挂 WebGL，只保留看板交互。
 *
 * 两条硬约束：
 * 1. WebGL 一定要懒加载 + 延迟挂载。首屏的 LCP 是文案，不是 three.js。
 * 2. 看板的按钮是「演出指令」，不是装饰 —— 点它，3D 与看板必须同时有事发生。
 * ============================================================ */

const HeroStage = lazy(() => import('../three/HeroStage'))

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
const CONSOLES = [EmbodiedConsole, ChainConsole, NeuralConsole]

/* 算“用户自己动了”的手势。不监听 scroll：那是程序化跳屏（下面的 jump、
   锚点链接）也会发的，用户没动我们就快进片头，等于自己掰自己 */
const GESTURES = ['wheel', 'touchmove', 'keydown', 'pointerdown']

/** 没有 WebGL（或用户要求减少动效）时的动底：多层渐变 + 缓慢漂移，纯 CSS，几十字节 */
function Scrim({ accent, still = false }) {
  const drift = (dur, x, y) => (still ? undefined : { x, y, transition: { duration: dur, repeat: Infinity, ease: 'linear' } })
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(125%_95%_at_18%_8%,#0a1524_0%,#050a13_52%,#03060c_100%)]" />
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

/** 一屏的文案层：进场用「上移 180px + 模糊」，退场收在下缘（参考站那套揭幕语言） */
function Copy({ scene, cmd, still }) {
  const cur = scene.commands.find((c) => c.id === cmd.id)
  const lines = [0, 1]
  return (
    <div className="relative max-w-[640px]">
      <span
        className="pointer-events-none absolute -top-24 -left-10 select-none text-[190px] font-bold leading-none text-white/[0.045] xl:text-[240px]"
        aria-hidden
      >
        {scene.no}
      </span>
      <motion.div
        className="relative flex items-center gap-2.5"
        initial={still ? false : { opacity: 0, y: 26, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: scene.accent, boxShadow: `0 0 12px ${scene.accent}` }} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: scene.accent }}>
          {scene.en}
        </span>
        <span className="font-mono text-[10.5px] tracking-[0.18em] text-white/30">{scene.no} / 0{N}</span>
      </motion.div>

      <h1 className="relative mt-4 text-[40px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[52px] xl:text-[62px] 2xl:text-[70px]">
        {scene.title.map((l, i) => (
          <span key={l} className="block overflow-hidden">
            <motion.span
              className="block"
              initial={still ? false : { y: '115%', filter: 'blur(5px)' }}
              animate={{ y: '0%', filter: 'blur(0px)' }}
              transition={{ duration: 0.62, delay: 0.04 + lines[i] * 0.09 + i * 0.04, ease: EASE }}
              style={i === 1 ? { color: scene.accent } : undefined}
            >
              {l}
            </motion.span>
          </span>
        ))}
      </h1>

      <motion.p
        className="mt-5 max-w-[560px] text-[13.5px] leading-[1.95] text-white/55 xl:text-[15px]"
        initial={still ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2, ease: EASE }}
      >
        {scene.desc}
      </motion.p>

      <motion.ul
        className="mt-6 flex flex-wrap gap-2"
        initial={still ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.26, ease: EASE }}
      >
        {scene.tags.map((t) => (
          <li key={t} className="rounded-full border px-3.5 py-1.5 text-[12px]" style={{ borderColor: `${scene.accent}33`, background: `${scene.accent}1f`, color: 'rgba(255,255,255,0.86)' }}>
            {t}
          </li>
        ))}
      </motion.ul>

      <motion.div
        className="pointer-events-auto mt-8 flex flex-wrap items-center gap-3"
        initial={still ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.32, ease: EASE }}
      >
        <a
          href="/#contact"
          className="group inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-[14px] font-semibold text-[#04070d] transition-transform duration-300 hover:-translate-y-0.5"
          style={{ background: scene.accent, boxShadow: `0 16px 40px -14px ${scene.accent}99` }}
        >
          预约这套方案
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
        <a href="/#advisor" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-[14px] font-medium text-white/85 transition-colors hover:border-white/45 hover:bg-white/[0.06]">
          让 AI 方案顾问先出一版
        </a>
      </motion.div>

      {/* 指令回执：看板点出来的一句话说明，读的是 heroScenes 里的 desc */}
      <div className="mt-7 flex items-center gap-2.5 border-l-2 pl-3 font-mono text-[11.5px]" style={{ borderColor: `${scene.accent}66` }}>
        <Radar className="h-3.5 w-3.5 shrink-0" style={{ color: scene.accent }} />
        <span className="min-w-0 truncate text-white/45">
          {cur ? `${cur.label} · ${cur.desc}` : '滚动切换业务 · 或点右侧看板下达指令'}
        </span>
        {!still && <span className="h-3.5 w-[6px] shrink-0 animate-pingslow" style={{ background: `${scene.accent}aa` }} />}
      </div>
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
    <span className="hidden shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30 lg:flex">
      <span>UPTIME <span className="tabular-nums text-white/55">{hh}:{mm}:{ss}</span></span>
      <span className="h-3 w-px bg-white/10" />
      <span style={{ color: `${accent}99` }}>AMBIENT {temp}°C</span>
    </span>
  )
}

/** 移动/平板那一屏：自带一份指令状态。
    不能复用桌面那个全局 cmd —— 桌面钉屏在 lg 以下根本没挂 scroll 监听，
    idx 会永远停在 0，二三屏的按钮就点不动了。 */
function MobileScene({ scene, index, still }) {
  const Console = CONSOLES[index]
  const [cmd, setCmd] = useState({ id: '', n: 0 })
  const fire = useCallback((id) => setCmd((c) => ({ id, n: c.n + 1 })), [])
  useEffect(() => {
    if (still) return
    const t = setInterval(() => setCmd((c) => {
      const i = scene.commands.findIndex((x) => x.id === c.id)
      return { id: scene.commands[(i + 1) % scene.commands.length].id, n: c.n + 1 }
    }), 6400)
    return () => clearInterval(t)
  }, [scene, still])
  return (
    <div className="relative overflow-hidden border-b border-white/[0.06] px-6 py-12">
      <Scrim accent={scene.accent} still={still} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(3,6,12,0.55),rgba(3,6,12,0.15)_40%,rgba(3,6,12,0.8))]" />
      <div className="relative">
        <Copy scene={scene} cmd={cmd} still={still} />
        <div className="mt-8">
          {/* quiet：这一份只是堆叠版里的看板，不往 3D 总线里写状态
              （桌面那份与 WebGL 同屏，两份都写就把同一个数字写出两个值） */}
          <Console scene={scene} cmd={cmd} fire={fire} quiet />
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
  /* 进度条走 DOM 而不是 state：滚动每帧 setState 会把整块看板重渲一遍，
     看板里十几个动画子树，那是白白拿 60fps 去换一条 2px 的线 */
  const barRef = useRef(null)
  const pctRef = useRef(null)
  const [cmd, setCmd] = useState({ id: '', n: 0 })
  const lastUser = useRef(0)

  /* 能力探测：WebGL / 减弱动效 / 视口宽度。三个都不满足时首屏退成纯 CSS + 看板 */
  const [env, setEnv] = useState({ gl: true, reduced: false, desktop: true })
  useEffect(() => {
    /* WebGL 能力走全局单例（capability.js）：只测一次、探测上下文用完即弃，
       不在此处 getContext 新建一个常驻的一次性上下文去挤占名额 */
    const gl = hasWebGL()
    const rq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setEnv({ gl, reduced: rq.matches, desktop: window.innerWidth >= 1024 })
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
    /* 必须等 stagePainted：canvas 未真在画就把动底拆了，会露出 #04070d 纯黑。
       帧不来（弱机首帧编译、后台失焦、GPU 被抢）则动底一直亮着 —— 读到的是
       设计好的深色渐变 + 文案，不是黑。淡入（1.4s）走完再加 0.3s 余量才摘 */
    if (!stageOn || stageDead || !stagePainted) return
    const id = setTimeout(() => setScrimGone(true), 1700)
    return () => clearTimeout(id)
  }, [stageOn, stageDead, stagePainted])

  const fire = useCallback((id) => {
    lastUser.current = Date.now()
    /* 看板按钮是“演出指令”，而装配未完时 3D 那边把指令门控掉了（一台还没装好
       的臂不该在跑轨迹）—— 于是片头期间点看板是死的。点它就是想看反应，
       那就先把片头快进完再给反应 */
    skipBuild()
    setCmd((c) => ({ id, n: c.n + 1 }))
  }, [])

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
      if (barRef.current) barRef.current.style.width = `${(v * 100).toFixed(1)}%`
      if (pctRef.current) pctRef.current.textContent = `${String(Math.round(v * 100)).padStart(3, '0')}%`
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
      /* 具身屏装配没走完不下发：3D 里臂还没吊装落位，看板却报「轨迹执行中」，
         两头说的不是一回事 —— 装配期间（stage 0~5）自动演示先憋着 */
      const bs = getBuildStage()
      if (idxRef.current === 0 && bs >= 0 && bs < 6) return
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

  const scene = heroScenes[idx]
  const Console = CONSOLES[idx]
  const still = env.reduced

  return (
    <section id="hero" className="relative bg-[#04070d] text-white">
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
                'linear-gradient(to top, rgba(3,6,12,0.92), transparent), radial-gradient(120% 100% at 100% 100%, rgba(3,6,12,0.9), transparent 72%), linear-gradient(90deg, rgba(3,6,12,0.86) 0%, rgba(3,6,12,0.62) 26%, rgba(3,6,12,0.46) 37%, rgba(3,6,12,0.12) 46%, rgba(3,6,12,0.03) 62%, rgba(3,6,12,0.22) 100%)',
              backgroundSize: '100% 160px, 48% 72%, 100% 100%',
              backgroundPosition: '0 100%, 100% 100%, 0 0',
              backgroundRepeat: 'no-repeat',
            }}
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
            <div className="pointer-events-none absolute inset-y-0 left-10 flex max-w-[640px] flex-col justify-center pt-[80px] pb-[150px] wide:max-w-[720px]">
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
                  <Copy scene={scene} cmd={cmd} still={still} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ―― 装配工序进度条：只在具身屏、装配未完时出现（自带显隐）――
                3D 里正在演「怎么搭一间实验室」，这条把它用文字钉住 */}
            <div className="pointer-events-none absolute bottom-[104px] left-10 hidden max-w-[600px] lg:block">
              <BuildStepper accent={scene.accent} />
            </div>

            {/* ―― 控制舱：右下角一枚，不再占据整列 ―― */}
            <div className="pointer-events-auto absolute bottom-[104px] right-10 w-[380px] max-w-[30vw]" data-lenis-prevent>
              {/* 高头按视口算而不是拍一个 vh 数：实测 54vh 在 900 高下正好
                  把面板最下面那一排规格条切成一半，看着像坏了 */}
              <div className="max-h-[calc(100vh-236px)] overflow-y-auto overscroll-contain no-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={scene.id}
                    initial={still ? false : { opacity: 0, y: 34 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -22, transition: { duration: 0.22, ease: 'easeIn' } }}
                    /* 比文案再晚一拍：右下角那块比主标题大得多，同起会抢 */
                    transition={{ duration: 0.44, delay: still ? 0 : 0.16, ease: EASE }}
                  >
                    <Console scene={scene} cmd={cmd} fire={fire} />
                    <p className="mt-2.5 flex items-center gap-2 pl-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/28">
                      <span className="inline-block h-[2px] w-4" style={{ background: `${scene.accent}88` }} />
                      {scene.hint || '看板指令实时驱动左侧场景'}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ―― 底部横条：三屏切换 + 进度 + 滚动提示 ―― */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[70] flex h-[92px] items-center">
            <div className="mx-auto flex w-full max-w-[1440px] items-center gap-6 px-10 2xl:max-w-[1640px] 3xl:max-w-[1780px]">
              <span className="hidden shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/32 xl:flex">
                <span className="h-[3px] w-[3px] rounded-full" style={{ background: scene.accent }} />
                LAB-01 · {scene.en}
              </span>

              <div className="pointer-events-auto flex items-center gap-1.5">
                {heroScenes.map((s, i) => {
                  const on = i === idx
                  return (
                    <button
                      key={s.id}
                      onClick={() => jump(i)}
                      aria-current={on}
                      className={`group relative flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] transition-colors duration-300 ${
                        on ? 'text-white' : 'text-white/45 hover:text-white/80'
                      }`}
                    >
                      {on && (
                        <motion.span layoutId="hero-scene-active" transition={{ type: 'spring', stiffness: 360, damping: 32 }} className="absolute inset-0 rounded-full border" style={{ borderColor: `${s.accent}55`, background: `${s.accent}1f` }} />
                      )}
                      <span className="relative font-mono text-[10px] tabular-nums" style={{ color: on ? s.accent : undefined }}>
                        {s.no}
                      </span>
                      <span className="relative whitespace-nowrap">{s.nav}</span>
                    </button>
                  )
                })}
              </div>

              <div className="pointer-events-none flex flex-1 items-center gap-3">
                <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-white/10">
                  <div ref={barRef} className="absolute inset-y-0 left-0 w-0 rounded-full" style={{ background: scene.accent, boxShadow: `0 0 12px ${scene.accent}` }} />
                </div>
                <span ref={pctRef} className="font-mono text-[10px] tabular-nums text-white/35">
                  000%
                </span>
              </div>

              <Uptime accent={scene.accent} still={still} />

              <div className="flex items-center gap-2 text-[11.5px] text-white/40">
                <ChevronDown className="h-4 w-4 animate-bounce" style={{ color: scene.accent }} />
                {idx === LAST ? '继续滚动，进入正片' : '滚动切换业务场景'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ―― 移动 / 平板：纵向堆叠，纯 CSS 动底 + 看板照旧可点 ―― */}
      <div className="lg:hidden">
        <div className="border-b border-white/[0.06] px-6 pb-3 pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">{heroMeta.eyebrow}</p>
          <p className="mt-1 text-[12px] text-white/50">{heroMeta.brand}</p>
        </div>
        {heroScenes.map((s, i) => (
          <MobileScene key={s.id} scene={s} index={i} still={still} />
        ))}
      </div>
    </section>
  )
}
