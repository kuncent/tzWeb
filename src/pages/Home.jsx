import { startTransition, useEffect, useState } from 'react'
import StoryHero from '../components/sections/StoryHero'
import { useSectionEnabled } from '../lib/contentStore'

/* ―― 首屏之下那 11 屏：从入口 chunk 里摘出去，改成「并行预取的异步块」 ――
   静态 import 会把整棵 section 树打进落地页的入口 JS（实测入口 347 KB gzip）。
   访客第一帧只看得到 StoryHero，下面 11 屏此刻既看不见、也不该挡着首屏下载。
   做法：每屏一条 () => import(...) 动态语句（Rollup 据此单独切块，dev 下 Vite
   也按需单发该模块），并在模块顶层立刻 forEach 触发一次 —— 于是这些块在首屏
   渲染的空档里就并行开始下载/编译，等下面那个 idle 门控放行时基本已就位。
   为什么不用 React.lazy：lazy + Suspense 在 dev 的 StrictMode 双挂载 × Vite 热模块图
   下会偶发「promise 已在首载前 settle、二次挂载时 lazy 内部 payload 不再回调」→ 该屏
   永久停在 fallback（实测：重启后首屏能出、之后每次刷新只剩 hero）。改成挂载后
   useEffect 里手动 import() —— import() 结果被浏览器/Vite 缓存，StrictMode 重挂时
   再取一次即刻命中，天然免疫这个竞态；prod 侧动态 import 分包收益一分不少。
   与旧的「延后挂载」互补：延后挂载解决首帧那次超长渲染任务（运行时），摘出入口
   解决首屏关键 JS 体积（下载/解析）—— 两头的账都要。
   锚点安全：带 hash 直达由 scrollToId 兜底轮询等元素挂上（见 hooks/useLenis.js），
   异步块稍晚到位不会让它失灵。 */
const importProblems = () => import('../components/sections/Problems')
const importAIAdvisor = () => import('../components/sections/AIAdvisor')
const importProductMatrix = () => import('../components/sections/ProductMatrix')
const importArchitecture = () => import('../components/sections/Architecture')
const importFeatures = () => import('../components/sections/Features')
const importAICapability = () => import('../components/sections/AICapability')
const importDelivery = () => import('../components/sections/Delivery')
const importCustomers = () => import('../components/sections/Customers')
const importValueLedger = () => import('../components/sections/ValueLedger')
const importResources = () => import('../components/sections/Resources')
const importContact = () => import('../components/sections/Contact')

/* 首屏渲染的空档就把这些并行拉下来；失败无妨（下面 useModule 会再取一次） */
;[
  importProblems,
  importAIAdvisor,
  importProductMatrix,
  importArchitecture,
  importFeatures,
  importAICapability,
  importDelivery,
  importCustomers,
  importValueLedger,
  importResources,
  importContact,
].forEach((m) => m())

/* 挂载后把动态块 import 进来取默认导出：import() 命中缓存即微任务级 resolve，
   StrictMode 的「挂载→卸载→重挂」两次都会各自跑一遍 effect，重挂那次直接拿到
   已就绪模块 —— 不像 React.lazy 那样可能被首挂的 settle 竞态卡死。 */
function useModule(loader) {
  const [Comp, setComp] = useState(null)
  useEffect(() => {
    let alive = true
    loader().then((m) => alive && setComp(() => m.default))
    return () => { alive = false }
  }, [loader])
  return Comp
}

/* 模块开关 + 异步块就位 双门控：后台把某屏 sections.<id>.enabled 置 false 时整屏
   不挂载（DOM 不存在，锚点导航随之消失）；默认 true——未发布开关时一切照旧。 */
function Sec({ id, loader }) {
  const enabled = useSectionEnabled(id)
  const Comp = useModule(loader)
  if (!enabled || !Comp) return null
  return <Comp />
}

export default function Home() {
  /* ―― 首屏之下那 12 屏，延后一轮再挂 ――
     归因（tmp/boot-perf.mjs）：入口 JS 的下载+解析只要 104ms（拿 /nowhere 那条
     空路由量的），而首页从顶到底一整棵树是 1262ms 的长任务 —— 差的 1.16s 全是
     用户此刻还看不见的 section。首屏文案因此压到 ~1.5s 才落地，这才是「首屏
     加载卡顿」的主体（three.js 反倒无辜：它压根不在入口里，见 vite.config.js）。
     为什么不用 IntersectionObserver 逐屏挂：量过了（tmp/frame-cadence.mjs）屏外
     section 不吃帧预算（摘掉 11 屏 rAF 中位数都是 16.7ms），要省的只有启动那一次
     提交；逐屏挂载就得给占位高度，而滚动条会跳、锚点会提前 —— 不划算。
     而且这一批包在 startTransition 里：React 18 在 transition 中可以逐帧让出
     主线程，那 1s 渲染被切成一片 ~5ms 的小块 —— 首屏装配动画照跑，不掉帧 */
  const [rest, setRest] = useState(false)
  useEffect(() => {
    const go = () => startTransition(() => setRest(true))
    const ric = window.requestIdleCallback
    const id = ric ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 500)
    return () => (ric ? cancelIdleCallback(id) : clearTimeout(id))
  }, [])

  return (
    <>
      {/* 首屏 = 具身 / 区块链 / AI 三屏业务特效（钉屏三切，看板可交互） */}
      <StoryHero />
      {rest && (
        <>
          <Sec id="problems" loader={importProblems} />
          {/* 一站式 AI 方案顾问前置：痛点之后先让方案顾问出场引导需求，再进产品矩阵 */}
          <Sec id="advisor" loader={importAIAdvisor} />
          <Sec id="matrix" loader={importProductMatrix} />
          <Sec id="architecture" loader={importArchitecture} />
          <Sec id="features" loader={importFeatures} />
          <Sec id="ai" loader={importAICapability} />
          <Sec id="delivery" loader={importDelivery} />
          <Sec id="customers" loader={importCustomers} />
          <Sec id="value" loader={importValueLedger} />
          <Sec id="resources" loader={importResources} />
          <Sec id="contact" loader={importContact} />
        </>
      )}
    </>
  )
}
