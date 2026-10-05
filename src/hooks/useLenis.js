import { useEffect } from 'react'
import Lenis from 'lenis'
import { markHeroReady } from '../components/three/hero/buildBus'

/* 全局平滑滚动；尊重 prefers-reduced-motion */
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({
      /* 时长越短，“跟手”越紧；1.15 在长页面上会让每帧的动画时长拉满，手感发黏 */
      duration: 0.92,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    })
    window.__lenis = lenis
    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    })
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])
}

export function scrollToTop() {
  if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true })
  else window.scrollTo(0, 0)
}

/* 滚到某个板块。tries 是「落点纠偏」的余量，见下面 onComplete 那段；
   immediate 只在纠偏补飞时为 true —— 首飞走平滑动画，补飞瞬移到位 */
function fly(el, offset, tries = 3, immediate = false) {
  const lenis = window.__lenis
  if (!lenis) {
    el.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'start' })
    return
  }
  /* 飞之前强制重测尺寸：scrollTo 是把「元素此刻的视口位置 + 当前 scroll」折算成
     一个绝对数字、再夹到 this.limit 上的，而 limit 走的是 Dimensions 里那份被
     防抖 250ms 的缓存。延后挂载那一批刚把页面撑高几百像素，缓存里还是旧值 ——
     实测带着锚点进来就被夹到 1833px（只有首屏那一段行程），看着像点了没反应。
     resize() 是它给的正口：同步重读 content.scrollHeight，不等防抖 */
  lenis.resize()
  lenis.scrollTo(el, {
    offset,
    immediate,
    onComplete: () => {
      /* 落点到了，启动遮罩就该收 —— 这一条是给「带 hash 直达」的人留的出口：
         遮罩等的是首屏装配时钟开始走表，而他压根没落在首屏，那台布景连 GLB
         都不会去取（见 EmbodiedRig 的 showGLB 门控）—— 不等这一步，他只能干等
         main.jsx 那个兜底定时器。遮罩不该挡住用户要去的地方。
         （buildBus 无依赖、无 three，从这儿 import 不会把 3D 拉进入口 chunk） */
      markHeroReady('nav')
      /* 飞完不等于落点就对了：我们飞过的那几屏里有 useInView 门控的内容刚挂上
         （录屏、备课台、图表），字体也在这一两秒里换完 —— 锚点会被继续顶偏，
         实测能飘到 300px。所以小步多次纠：每轮飞完隔 220ms 再看一次，偏差超过
         160px 才再纠（十几像素的飘移不值得把用户再动一次），最多 3 轮。
         纠偏这一跳用 immediate 瞬移而不是再飞一段平滑：再飞会被看成点了导航后
         「往回拉一下」，瞬移则是悄悄放准，落点对了、观感不抖 */
      if (tries <= 0) return
      setTimeout(() => {
        const want = -offset
        if (el.isConnected && Math.abs(el.getBoundingClientRect().top - want) > 160) fly(el, offset, tries - 1, true)
      }, 220)
    },
  })
}

/* 滚到某个板块。不是「找到就滚」而是一次短轮询：首屏之下那几屏现在延后一轮
   才挂（见 pages/Home.jsx 那段归因），拿不到元素不等于没这个板块。
   原来 Navbar 与路由跳转都是直接 getElementById，拿不到就 return —— 首屏刚出来
   那一下点导航会静默失灵，这比多等 200ms 严重点 */
export function scrollToId(id, offset = -120) {
  const t0 = performance.now()
  let lastTop = -1
  let stable = 0
  let foundAt = -1
  const tick = () => {
    const late = performance.now() - t0
    const el = document.getElementById(id)
    /* 元素根本还没挂上：接着等。延后那 11 屏走的是 idle + startTransition，
       React 在 transition 里可以逐帧让出主线程 —— 拥塞的机器上它们真能拖到
       四五秒才齐（实测：第 3000ms 放弃就拿到了 y=0）。这一支不读 rect：
       元素都不在，读了也是白读。8s 是给“这个 hash 根本不存在”兜的底 */
    if (!el) {
      if (late < 8000) requestAnimationFrame(tick)
      return
    }
    if (foundAt < 0) foundAt = late
    /* 等「锚点在文档里的绝对位置」不再变才飞，比等文档总高更对症：真正会弄歪
       落点的是锚点之上的内容还在长（图解码、入场位移），锚点之下的长多少都无所谓。
       连续 4 帧不动 = 排布停了；拿不准就最多再等 1.5s，这比猜一个总时长靠谱 */
    const top = Math.round(el.getBoundingClientRect().top + window.scrollY)
    if (top !== lastTop) {
      lastTop = top
      stable = 0
    } else stable++
    if (stable >= 4 || late - foundAt > 1500) return fly(el, offset)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
