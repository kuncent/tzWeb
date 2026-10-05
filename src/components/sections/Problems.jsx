import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { SectionHead, EASE } from '../ui'
import { problemsHead, problems } from '../../data/site'
import ProblemIcons from '../three/icons/ProblemIcons'
import { hasWebGL } from '../../lib/capability'

/* ============================================================
 * 挑战与问题：五张牌 + 一层 3D 图标
 * ------------------------------------------------------------
 * 原来的图标是 lucide 的 20px 线性符号，指针路过只把牌面刷成 brand 蓝 ——
 * 和同类 B2B 页面一模一样，读完不留印象。现在牌面上摆的是真几何体：
 * 五枚程序化模型（锥形瓶 / 摊开的教材 + 刷新环 / 学情漏斗 / 断了半截的桥 /
 * 递不出去的公文包），指针在牌上走它们跟着低头偏头，指针压住哪一张，那一张
 * 就把自己的深度层拉散，前后视差立刻变强。
 *
 * 这个反差原来挂在「点一下」上，而它得先教会人「可以点」—— 底下一行提示语就
 * 是干这件事的，写完自己就露怯了：一栏问题不需要一句操作说明。现在提示语整个
 * 撤掉，摊开改由 hover 驱动：指针路过就会碰上，不需要解释，也不需要有一张牌被
 * 记住是「选中的」。牌因此不再是按钮（role / tabIndex / aria-pressed 一起撤），
 * 它不承载任何动作，摊开只是指针的副产品 —— 看不见动画的人照样读得到标题与说明。
 *
 * 牌面（那个圆角方块）还是 DOM 的，只有符号交给 WebGL：
 * 颜色过渡、圆角、牌面底色推到 brand 交给 CSS 比在画布里画便宜得多，
 * 而「立体的那部分刚好比牌边溢出一圈」这件事只有 3D 能做。
 *
 * WebGL 不可用 / 用户要求减少动效时退回 lucide —— 这一栏的信息密度
 * 不该由一个图形能力决定。
 * ============================================================ */

const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v)

export default function Problems() {
  const wrapRef = useRef(null)
  const gridRef = useRef(null)
  const plateRefs = useRef([])
  /* 边距取正值（进场前 200px 就点亮）：ProblemIcons 现在进视口才挂载，
     提前一档预热免得滚到位才建上下文、图标晚一拍才弹出来；
     离屏时卸载，把 WebGL 上下文释放回浏览器（R3F 卸载会 forceContextLoss）——
     否则它与首屏画布同时常驻，累积到上限就会把最旧的首屏顶掉（黑屏诱因） */
  const inView = useInView(wrapRef, { once: false, margin: '200px' })
  const [hover, setHover] = useState(-1)

  /* 有 WebGL 才把 lucide 摘掉；测量与跑帧也都跟着这个判断走。
     探测走模块级单例（capability.js）：全局只建一次一次性上下文并立即释放，
     绝不能在 useMemo 里 getContext —— 每次挂载/重渲染都会新建一个上下文，
     累积到浏览器硬上限就会把最旧的首屏画布顶掉（首屏黑屏的直接诱因）。 */
  const gl = hasWebGL()
  const reduced = useMemo(() => (typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches), [])

  /* 逐帧读的三个值不走 React state：指针每动一下就重排五张牌是纯粹的浪费。
     hover 仍然留一份 state，因为牌面的 CSS 底色要跟着换 */
  const stateRef = useRef({ hover: -1, px: 0, py: 0, reduced })
  const frameRef = useRef({ w: 0, h: 0, pts: [] })
  useEffect(() => {
    stateRef.current.hover = hover
  }, [hover])

  /* ―― 把铭牌的中心量成像素坐标 ――
     正交相机是按这块网格的像素尺寸开的，所以量出来的落点直接就是世界坐标，
     不需要投影。这里有个坑要绕：卡片自己的入场动画是 translateY(18→0)，
     带 delay 逐张错开 —— 挂载那一下量到的五个中心互相错位，而且这个变化
     不触发 ResizeObserver（transform 不改布局）。所以进视口后先连量 1.5s
     盖过入场动画，之后只在尺寸变化时补量一小段，平时一帧都不量。 */
  const measure = useCallback(() => {
    const g = gridRef.current
    if (!g) return
    const r = g.getBoundingClientRect()
    if (r.width <= 0) return
    const pts = plateRefs.current.map((el) => {
      if (!el) return null
      const b = el.getBoundingClientRect()
      return [b.left - r.left + b.width / 2, b.top - r.top + b.height / 2]
    })
    frameRef.current = { w: r.width, h: r.height, pts }
  }, [])

  useEffect(() => {
    if (!gl || !inView) return
    let raf = 0
    let until = performance.now() + 1500
    const loop = () => {
      measure()
      if (performance.now() < until) raf = requestAnimationFrame(loop)
      else raf = 0
    }
    loop()
    const g = gridRef.current
    const ro = new ResizeObserver(() => {
      until = performance.now() + 400
      if (!raf) loop()
    })
    if (g) ro.observe(g)
    window.addEventListener('resize', loop)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', loop)
    }
  }, [gl, inView, measure])

  const onMove = (e, i) => {
    const b = e.currentTarget.getBoundingClientRect()
    stateRef.current.px = clamp1(((e.clientX - b.left) / b.width) * 2 - 1)
    stateRef.current.py = clamp1(((e.clientY - b.top) / b.height) * 2 - 1)
  }

  return (
    <section id="problems" ref={wrapRef} className="bg-white sec-y">
      <div className="container-x">
        <SectionHead id="problems" n="01" en={problemsHead.en} zh={problemsHead.zh} sub={problemsHead.sub} />

        <div ref={gridRef} className="relative mt-14 grid gap-px overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-ink-900/[0.07] md:grid-cols-2 lg:grid-cols-5">
          {/* live 只跟着「在不在视口」，不跟着 reduced：要求减少动效的人
              仍然要看得见这五枚图标，只是不自动摆 —— 抑制动画在 useFrame 里
              由 stateRef.reduced 把时间钉在 0 上做，不在这里掉整层。
              整个 ProblemIcons 只在 inView 时挂载：离屏即卸掉画布、释放上下文 */}
          {gl && inView && <ProblemIcons frameRef={frameRef} stateRef={stateRef} live={inView} />}
          {problems.map((p, i) => {
            const Icon = p.icon
            const hv = hover === i
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: i * 0.07, ease: EASE }}
                onPointerMove={(e) => onMove(e, i)}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover((v) => (v === i ? -1 : v))}
                className={`group relative overflow-hidden bg-white p-6 transition-colors duration-300 hover:bg-mist-100 ${
                  hv ? 'bg-mist-100' : ''
                }`}
              >
                <span className="pointer-events-none absolute -right-2 -top-3 text-[52px] font-bold leading-none text-ink-900/[0.045] transition-colors duration-300 group-hover:text-brand/[0.08]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {/* 牌面归 DOM，符号归 WebGL。摊开这一态现在就走在指针上，那圈 ring
                    不再需要「这一张被点了」的确定回执；它现在的职责是先把牌面从浅灰
                    推到 brand 深蓝 —— 底色不压下去，白色图标就没有落处。
                    静息态仍给一圈极浅的描边：mist-200 比白底只重 5%，
                    没有这条边就看不出「立体物件比牌边溢出一圈」这件事 */}
                <span
                  ref={(el) => {
                    plateRefs.current[i] = el
                  }}
                  className={`relative grid h-11 w-11 place-items-center rounded-xl transition-all duration-300 ${
                    hv ? 'bg-brand shadow-lg shadow-brand/25 ring-1 ring-brand/40' : 'bg-mist-200 ring-1 ring-ink-900/[0.06]'
                  }`}
                >
                  {!gl && (
                    <Icon className={`h-5 w-5 transition-colors duration-300 ${hv ? 'text-white' : 'text-ink-700'}`} />
                  )}
                </span>
                <h3 className={`relative mt-5 text-[15px] font-semibold transition-colors duration-300 ${hv ? 'text-brand-700' : 'text-ink-900'}`}>{p.title}</h3>
                <p className="relative mt-2.5 text-xs leading-relaxed text-ink-500">{p.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
