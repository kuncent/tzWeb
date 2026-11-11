import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useInView } from 'motion/react'
import { MapPin, ArrowUpRight, Cpu, Blocks, ChevronLeft, ChevronRight } from 'lucide-react'
import { Reveal, EASE } from '../ui'
import { labCases } from '../../data/pages'

/* ============================================================
 * 合作院校 · 部分建设方案与成果实景 —— 双层自动轮播
 * ------------------------------------------------------------
 * 放在首页 08「合作高校」板块内，作为地图看板的延伸：地图给「在哪
 * 建了」的宏观分布，这里给「建成什么样」的真实照片与建设方案。
 * 两层自动轮播：
 *   1) 图片层 —— 当前院校的成果照片每隔 IMG_MS 逐张推进；
 *   2) 院校层 —— 一所的照片放完，自动切到下一所（仅在有照片的院校间循环）。
 * 轮播顺序按 SHOWCASE 定制（重点院校前置），不改动 Cases 页深色看板的原始编号。
 * 交互：悬停暂停 / 移开恢复、点击或左右滑动 / 箭头切图后长期锁定，不抢用户操作；
 * prefers-reduced-motion 下彻底停自动轮播，只留手动切换。
 * 卡片在 lg 定高，杜绝不同尺寸照片 / 不等高文案切换时的整屏抖动。
 * ============================================================ */

const IMG_MS = 3600
/* 手动暂停后，从最后一次操作起隔这么久无进一步操作即自动恢复轮播 */
const RESUME_MS = 5000

/* 展示顺序按业务指定：深圳北理莫斯科 → 兴义民族师范 → 湖北商贸 → 广东财贸 →
   广西金融职业 → 广东技术师范 → 郑州西亚斯 → 广东培正。数据里没列进的案例不再展示 */
const ORDER = [
  'sinos-moscow', 'xysu-fintech', 'hbsy-factory', 'gdcm-literacy',
  'gxtc-aimarketing', 'gpnu-digital', 'sias-fintech', 'pzxy-quant',
]
const SHOWCASE = ORDER.map((id) => labCases.find((c) => c.id === id)).filter(Boolean)

export default function LabShowcase() {
  const [pos, setPos] = useState({ school: 0, img: 0 })
  const [hovering, setHovering] = useState(false)
  const [locked, setLocked] = useState(false)
  const lockTimer = useRef(null)
  const wrapRef = useRef(null)
  const railRef = useRef(null)
  const dragX = useRef(null)
  const inView = useInView(wrapRef, { once: false, margin: '-15% 0px -15% 0px' })
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const cur = SHOWCASE[pos.school]
  const img = cur.imgs[Math.min(pos.img, cur.imgs.length - 1)]
  /* 是否正在自动轮播：入视 + 未悬停 + 未处于手动暂停（最后一次操作 5s 后自动恢复）+ 非降级 */
  const running = !reduced && !hovering && !locked && inView

  /* 双层步进：图片推进到本校最后一张后，切下一所并把图片归零 —— 纯函数更新，
     StrictMode 重放 updater 也安全（无嵌套 setState）。 */
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setPos(({ school, img }) => {
        const total = SHOWCASE[school].imgs.length
        if (img + 1 < total) return { school, img: img + 1 }
        return { school: (school + 1) % SHOWCASE.length, img: 0 }
      })
    }, IMG_MS)
    return () => clearInterval(t)
  }, [running])

  /* 手动操作（点院校 / 点图点 / 左右切图 / 拖拽）即暂停轮播，但不再永久锁定：
     从最后一次操作起 5s 内没有进一步操作，就自动恢复自动轮播。 */
  const lock = () => {
    setLocked(true)
    if (lockTimer.current) clearTimeout(lockTimer.current)
    lockTimer.current = setTimeout(() => setLocked(false), RESUME_MS)
  }
  useEffect(() => () => { if (lockTimer.current) clearTimeout(lockTimer.current) }, [])

  /* 闲置防卡死：切走标签页 / 窗口失焦时，鼠标 mouseleave 常常不会触发，hovering 会卡在
     true 使轮播永久暂停；这里在失焦或页面隐藏时强制复位悬停与手动暂停，回到页面即恢复自动轮播。 */
  useEffect(() => {
    const resume = () => { setHovering(false); setLocked(false) }
    const onVis = () => { if (document.hidden) resume() }
    window.addEventListener('blur', resume)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', resume)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const pickSchool = (i) => { setPos({ school: i, img: 0 }); lock() }
  const pickImg = (k) => { setPos((p) => ({ ...p, img: k })); lock() }

  /* 八所院校在窄屏放不下，切换轨要能横滑。Lenis 默认把滚轮整段吃掉，这里挂
     data-lenis-prevent 并自己把竖向滚量折成横向（与 HonorWall / ClipRail 同一套做法）；
     滑到端点就把属性摘掉一帧，把这一下滚轮交还页面，不把用户锁在轨道上 */
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    /* 只在真的放不下时才拦 Lenis：放得下的时候轨道上要能正常滚页面 */
    const sync = () => {
      if (rail.scrollWidth - rail.clientWidth > 2) rail.setAttribute('data-lenis-prevent', '')
      else rail.removeAttribute('data-lenis-prevent')
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(rail)
    const onWheel = (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const max = rail.scrollWidth - rail.clientWidth
      if (max <= 2) return
      const next = Math.min(max, Math.max(0, rail.scrollLeft + d))
      if (next !== rail.scrollLeft) {
        e.preventDefault()
        rail.scrollLeft = next
      } else {
        rail.removeAttribute('data-lenis-prevent')
        requestAnimationFrame(() => rail.setAttribute('data-lenis-prevent', ''))
      }
    }
    rail.addEventListener('wheel', onWheel, { passive: false })

    /* 鼠标左右拖拽（触屏走原生横滑）：只认左键。拖过 3px 才算拖拽，
       没拖动就照常触发点选；拖动松手后吞掉那一次 click，免得拖完还顺手切了院校 */
    let active = false
    let moved = false
    let startX = 0
    let startLeft = 0
    const onDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      active = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft
    }
    const onMove = (e) => {
      if (!active) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) > 3) {
        moved = true
        rail.setPointerCapture?.(e.pointerId)
      }
      if (!moved) return
      e.preventDefault()
      rail.scrollLeft = startLeft - dx
    }
    const onUp = () => { active = false }
    const onClickCapture = (e) => {
      if (!moved) return
      e.preventDefault()
      e.stopPropagation()
      moved = false
    }
    rail.addEventListener('pointerdown', onDown)
    rail.addEventListener('pointermove', onMove)
    rail.addEventListener('pointerup', onUp)
    rail.addEventListener('pointercancel', onUp)
    rail.addEventListener('click', onClickCapture, true)
    return () => {
      ro.disconnect()
      rail.removeEventListener('wheel', onWheel)
      rail.removeEventListener('pointerdown', onDown)
      rail.removeEventListener('pointermove', onMove)
      rail.removeEventListener('pointerup', onUp)
      rail.removeEventListener('pointercancel', onUp)
      rail.removeEventListener('click', onClickCapture, true)
    }
  }, [])

  /* 手动左右切图：越界则跨院校（向前到尾→下一所首图，向后到头→上一所末图） */
  const step = (dir) => {
    setPos(({ school, img }) => {
      const total = SHOWCASE[school].imgs.length
      let ns = school
      let ni = img + dir
      if (ni < 0) { ns = (school - 1 + SHOWCASE.length) % SHOWCASE.length; ni = SHOWCASE[ns].imgs.length - 1 }
      else if (ni >= total) { ns = (school + 1) % SHOWCASE.length; ni = 0 }
      return { school: ns, img: ni }
    })
    lock()
  }

  /* 在照片上按住横向拖拽 / 手机滑动即可切图（纵向仍走页面滚动） */
  const onDown = (e) => { dragX.current = e.clientX }
  const onUp = (e) => {
    if (dragX.current == null) return
    const dx = e.clientX - dragX.current
    dragX.current = null
    if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1)
  }

  return (
    <div ref={wrapRef} className="mt-14">
      {/* 小标题：与「产业客户」带同一套轻量标签语言 */}
      <Reveal>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gradient-to-r from-brand/60 to-transparent" />
            <h3 className="text-[13.5px] font-semibold uppercase tracking-[0.16em] text-ink-700">部分标杆院校 · 建设方案与成果实景</h3>
          </div>
          <Link to="/about#contact" className="group inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-brand transition-colors hover:text-ink-900 sm:self-auto">
            看完整案例集
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </Reveal>

      {/* 主卡：左照片轮播 / 右精简建设方案 —— lg 定高消除切换抖动 */}
      <Reveal delay={0.06} className="mt-5">
        <div className="relative">
          {/* 卡片后方一层品牌辉光，抬升质感 */}
          <div aria-hidden className="pointer-events-none absolute -inset-4 -z-10 rounded-[36px] bg-[radial-gradient(60%_60%_at_20%_0%,rgba(22,119,255,0.14),transparent_70%)] blur-xl" />
          <div
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className="grid overflow-hidden rounded-3xl border border-ink-900/[0.08] bg-white shadow-lift ring-1 ring-white/60 lg:h-[560px] lg:grid-cols-[1.6fr_1fr] xl:h-[600px] xl:grid-cols-[1.7fr_1fr]"
          >
            {/* ―― 照片舞台 ―― */}
            <div
              className="group/img relative aspect-[16/10] w-full touch-pan-y select-none overflow-hidden bg-night-900 lg:aspect-auto lg:h-full"
              data-photo-stage
              onPointerDown={onDown}
              onPointerUp={onUp}
              onPointerLeave={() => { dragX.current = null }}
            >
              {/* 悬停时整张照片小幅放大，轮播本身的缓推由 motion 控制，二者叠加不冲突 */}
              <div className="absolute inset-0 transition-transform duration-[1600ms] ease-out group-hover/img:scale-[1.035]">
                <AnimatePresence initial={false}>
                  <motion.img
                    key={img}
                    src={img}
                    alt={`${cur.school} ${cur.lab} 成果照片`}
                    initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                    animate={reduced ? { opacity: 1 } : { opacity: 1, scale: running ? 1.06 : 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0 }}
                    transition={{ opacity: { duration: 0.7, ease: EASE }, scale: { duration: IMG_MS / 1000 + 0.6, ease: 'linear' } }}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </AnimatePresence>
              </div>

              {/* 压图渐变 + 内阴影：只压暗底部文字区，照片主体保持敞亮 */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/75 via-night/6 to-transparent" />
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_90px_rgba(4,7,13,0.32)]" />

              {/* 左上：自动播放状态徽标 */}
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10.5px] font-medium tracking-wide text-white/80 backdrop-blur-sm md:left-5 md:top-5">
                <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-brand motion-safe:animate-pulse' : 'bg-white/40'}`} />
                {running ? '自动播放 · AUTO' : locked ? '已暂停 · 5s 后继续' : '悬停暂停 · HOVER'}
              </span>

              {/* 右上：图片序号 */}
              {cur.imgs.length > 1 && (
                <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 font-mono text-[10.5px] tabular-nums text-white/75 backdrop-blur-sm md:right-5 md:top-5">
                  {String(Math.min(pos.img + 1, cur.imgs.length)).padStart(2, '0')} / {String(cur.imgs.length).padStart(2, '0')}
                </span>
              )}

              {/* 压图抬头 */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-6">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand-300">CASE {String(pos.school + 1).padStart(2, '0')}</p>
                  <h4 className="mt-1 truncate text-[22px] font-bold leading-tight tracking-tight text-white drop-shadow md:text-[26px]">{cur.school}</h4>
                  <p className="mt-0.5 truncate text-[14px] text-white/80">{cur.lab}</p>
                </div>
                <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[11.5px] font-medium text-white/80 backdrop-blur-sm sm:inline-flex">
                  <MapPin className="h-3.5 w-3.5 text-brand-300" strokeWidth={2} />{cur.city}
                </span>
              </div>

              {/* 左右切换箭头：桌面悬停显形，移动端常驻 */}
              <CarouselArrow side="left" onClick={() => step(-1)} />
              <CarouselArrow side="right" onClick={() => step(1)} />

              {/* 图片圆点（多图时） */}
              {cur.imgs.length > 1 && (
                <div className="absolute inset-x-0 bottom-[92px] flex justify-center gap-1.5 md:bottom-[104px]">
                  {cur.imgs.map((s, k) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pickImg(k)}
                      aria-label={`第 ${k + 1} 张`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${k === pos.img ? 'w-6 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/75'}`}
                    />
                  ))}
                </div>
              )}

              {/* 底部进度条：与自动切图同周期，暂停时精确停在中途 */}
              <span
                key={`${pos.school}-${pos.img}`}
                className="lab-prog absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-brand via-brand-400 to-brand-300"
                style={{ animationDuration: `${IMG_MS}ms`, animationPlayState: running ? 'running' : 'paused' }}
              />
            </div>

            {/* ―― 建设方案面板 ―― */}
            <div className="flex flex-col p-6 md:p-7 lg:h-full lg:overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="h-4 w-[3px] rounded-full bg-brand" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">建设方案 · Plan</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={cur.id}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="flex flex-1 flex-col"
                >
                  <p className="mt-3 line-clamp-2 text-[13px] leading-[1.85] text-ink-500">{cur.summary}</p>

                  {/* 关键指标 */}
                  <div className="mt-5 grid grid-cols-3 gap-2.5">
                    {cur.specs.map((m) => (
                      <div key={m.k} className="rounded-xl border border-ink-900/[0.07] bg-mist-100/60 px-3 py-2.5">
                        <p className="text-[11px] text-ink-400">{m.k}</p>
                        <p className="mt-1 text-[16px] font-bold leading-none tracking-tight text-ink-900">{m.v}</p>
                      </div>
                    ))}
                  </div>

                  {/* 功能分区 */}
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">功能分区</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {cur.regions.map((r) => (
                        <span key={r} className="rounded-full border border-ink-900/[0.08] bg-white px-2.5 py-1 text-[12px] text-ink-600">{r}</span>
                      ))}
                    </div>
                  </div>

                  {/* 软硬件规模 */}
                  <div className="mt-4 flex items-center gap-5 text-[12.5px] text-ink-500">
                    <span className="inline-flex items-center gap-1.5"><Cpu className="h-4 w-4 text-brand" strokeWidth={1.9} />硬件 {cur.hardware.length} 项</span>
                    <span className="inline-flex items-center gap-1.5"><Blocks className="h-4 w-4 text-brand" strokeWidth={1.9} />软件 {cur.software.length} 项</span>
                  </div>

                  {/* 亮点 */}
                  {cur.highlight && (
                    <div className="mt-4 line-clamp-3 rounded-xl border border-brand/20 bg-brand/[0.06] px-3.5 py-3">
                      <p className="text-[12.5px] leading-relaxed text-ink-700">
                        <span className="font-semibold text-brand">亮点 · </span>{cur.highlight}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-5">
                    <Link
                      to="/about#contact"
                      className="group inline-flex items-center gap-2 self-start rounded-full bg-ink-900 px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-300 hover:bg-brand"
                    >
                      获取「{cur.school}」完整方案
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 院校切换轨：有照片的院校逐一点选，当前高亮 */}
      <Reveal delay={0.1} className="mt-5">
        <div ref={railRef} className="no-scrollbar flex cursor-grab gap-3 select-none overflow-x-auto overscroll-x-contain pb-1 active:cursor-grabbing">
          {SHOWCASE.map((c, i) => {
            const on = i === pos.school
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => pickSchool(i)}
                aria-pressed={on}
                className={`group relative h-[76px] w-[152px] shrink-0 overflow-hidden rounded-xl border transition-all duration-300 ${
                  on ? 'border-brand opacity-100 shadow-glow ring-1 ring-brand/30' : 'border-ink-900/[0.08] opacity-80 hover:opacity-100'
                }`}
              >
                <img src={c.imgs[0]} alt="" loading="lazy" decoding="async" className={`h-full w-full object-cover transition duration-500 ${on ? '' : 'grayscale-[0.35] group-hover:grayscale-0'}`} />
                <span className="absolute inset-0 bg-gradient-to-t from-night/85 to-transparent" />
                <span className="absolute left-2 top-2 font-mono text-[10px] tabular-nums tracking-wide text-white/60">{String(i + 1).padStart(2, '0')}</span>
                <span className={`absolute inset-x-2 bottom-2 truncate text-left text-[11.5px] font-semibold ${on ? 'text-white' : 'text-white/80'}`}>{c.school}</span>
                {on && <span className="absolute left-0 top-0 h-full w-[3px] bg-brand" />}
              </button>
            )
          })}
        </div>
      </Reveal>
    </div>
  )
}

/* 照片左右切换箭头：桌面悬停照片才显形，移动端常驻可点 */
function CarouselArrow({ side, onClick }) {
  const Left = side === 'left'
  const Icon = Left ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={Left ? '上一张' : '下一张'}
      className={`absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white/85 backdrop-blur-sm transition-all duration-300 hover:bg-brand hover:text-white hover:border-brand opacity-100 md:opacity-0 md:group-hover/img:opacity-100 ${
        Left ? 'left-3 md:-left-2 md:group-hover/img:left-4' : 'right-3 md:-right-2 md:group-hover/img:right-4'
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={2.2} />
    </button>
  )
}
