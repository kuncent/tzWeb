import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useInView } from 'motion/react'
import { ArrowUpRight, ChevronLeft, ChevronRight, ImageOff, Maximize2, Pause, Play, X } from 'lucide-react'
import { galleryProducts, productMatrix, embodiedSystem } from '../../data/site'
import { hasDetail } from '../../data/productDetails'
import { requestTrial, requestProductContact } from '../../lib/aiEngine'
import { ImageRail } from './ImageRail'
import { FilmStage } from './ChainScreen'
import EmbodiedScreen from './EmbodiedScreen'

/* 图片画廊屏：与 ChainScreen（02 区块链屏）同一版式，只是把录屏换成真实界面截图。
   标题带 + 16:9 舞台 + 产品缩略图条 + 说明/指标/咨询底栏，四段结构与链屏逐段对齐；
   舞台内截图按「幕」自动推进（chainShotBar 进度条与推进节奏同源），可暂停、可点刻度跳幕、
   可放大进影院。任何带 shots 字段的产品数组都能挂进来，后续新增体系不必再写一遍。 */

const EASE = [0.22, 1, 0.36, 1]
const SHOT_MS = 4500
const LAST = productMatrix.length - 1
const pad = (i) => String(i + 1).padStart(2, '0')
const z = (n) => String(n).padStart(2, '0')

/* 画面顶栏：浏览器外壳 + 传输键浮在截图上沿，放映中让位给画面本身 */
function TopBar({ product, shot, total, playing, show, onToggle, onPrev, onNext, onExpand, onClose }) {
  const btn =
    'grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-accent/60 hover:bg-accent/20 hover:text-white'
  return (
    <div
      className={`absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-night/92 via-night/55 to-transparent px-3 pb-7 pt-2 transition-opacity duration-300 ${
        show ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-accent/70" />
      </span>
      <span className="ml-1 hidden min-w-0 shrink truncate font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400 sm:inline">
        {product.code.toLowerCase()}.tianze.local
      </span>
      <span className="ml-2 hidden min-w-0 shrink truncate text-[13px] font-medium text-white/85 lg:inline">
        {product.name}
        <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-accent-ice">{product.code}</span>
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        <span className="font-mono text-[11px] tabular-nums tracking-[0.1em] text-ink-400">
          {z(shot + 1)} / {z(total)}
        </span>
        <span className="relative flex h-1.5 w-1.5">
          {playing && <span className="absolute inline-flex h-full w-full animate-pingslow rounded-full bg-accent-ice" />}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-ice" />
        </span>
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-white/60 sm:inline">REAL SCREENS</span>
        <button type="button" onClick={onPrev} aria-label="上一幕" className={btn}>
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button type="button" onClick={onToggle} aria-label={playing ? '暂停轮播' : '播放轮播'} className={btn}>
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
        <button type="button" onClick={onNext} aria-label="下一幕" className={btn}>
          <ChevronRight className="h-3 w-3" />
        </button>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="退出全屏" className={btn}>
            <X className="h-3 w-3" />
          </button>
        ) : (
          <button type="button" onClick={onExpand} aria-label="放大观看" className={btn}>
            <Maximize2 className="h-3 w-3" />
          </button>
        )}
      </span>
    </div>
  )
}

/* 画面底栏：当前幕字幕 + 帧进度 + 分幕刻度（既是进度也是导航） */
function BottomBar({ product, shots, shot, running, onSeek }) {
  const at = shots[shot]
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night via-night/80 to-transparent px-3 pb-2 pt-6">
      <div className="flex items-center gap-2.5">
        <span className="h-3 w-[2px] shrink-0 rounded-full bg-brand" />
        <AnimatePresence mode="wait">
          <motion.p
            key={at.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="min-w-0 flex-1 truncate text-[13px] text-white/85"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-ice">{at.label}</span>
            <span className="mx-2 text-ink-500">/</span>
            {at.cap}
          </motion.p>
        </AnimatePresence>
        <span className="shrink-0 font-mono text-[11px] tabular-nums tracking-[0.12em] text-ink-400">
          {shot + 1} / {shots.length}
        </span>
      </div>
      <div className="relative mt-2 h-[3px] overflow-hidden rounded-full bg-white/12">
        <div
          key={`${product.code}-${shot}`}
          className="absolute inset-y-0 left-0 rounded-full bg-brand"
          style={{ animation: `chainShotBar ${SHOT_MS}ms linear forwards`, animationPlayState: running ? 'running' : 'paused' }}
        />
        {shots.map((c, k) => (
          <span
            key={c.label}
            className="absolute top-1/2 h-[7px] w-[2px] -translate-y-1/2 rounded-full bg-white/40"
            style={{ left: `${(k / shots.length) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-stretch gap-1.5">
        {shots.map((c, k) => (
          <button
            key={c.label}
            onClick={() => onSeek(k)}
            title={c.cap}
            className={`min-w-0 flex-1 truncate rounded-sm px-1 py-1 text-left font-mono text-[10px] uppercase tracking-[0.02em] transition-colors sm:px-1.5 sm:text-[11px] sm:tracking-[0.1em] ${
              k === shot ? 'bg-accent text-white' : 'text-ink-400 hover:bg-white/[0.08] hover:text-white/85'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* 一块屏：16:9 取景框，截图 object-contain 不裁界面；同产品各幕叠放交叉淡入 */
function Surface({ product, shots, shot, playing, running, theater, onToggle, onSeek, onPrev, onNext, onExpand, onClose }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative overflow-hidden border border-white/[0.09] bg-night aspect-video ${
        theater
          ? 'h-full w-auto max-w-full max-h-[calc(100vh-6rem)] rounded-xl shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]'
          : 'w-full max-h-full lg:h-full lg:w-auto lg:max-w-full rounded-2xl'
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(62%_54%_at_50%_44%,rgba(22,119,255,0.10),transparent_72%)]" />
      {shots.map((s, k) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.cap}
          loading={k === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${k === shot ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}

      {/* 整块画面即点击暂停热区，浮层在它之上另起 z-10 */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? '暂停轮播' : '播放轮播'}
        className="absolute inset-0 z-[5] cursor-pointer"
      />
      {!playing && !hover && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-none absolute inset-0 z-[6] grid place-items-center bg-night/40"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-accent/85 text-white shadow-glow">
            <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
          </span>
        </motion.span>
      )}

      {/* hover 蒙版：看完截图正是决策点，两个出口摆在画面之上；影院里不放。
          蒙版本体 pointer-events-none、只给按钮开指针事件，保住「点画面暂停」的手势 */}
      <AnimatePresence>
        {hover && !theater && (
          <motion.div
            key="trial-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            data-trial="veil"
            className="pointer-events-none absolute inset-0 z-[7] grid place-items-center bg-night/62"
          >
            <div className="flex flex-col items-center gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-ice">体验项目 · {product.name}</p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {hasDetail(product) && (
                  <Link
                    to={`/products/${product.slug}`}
                    data-trial="detail"
                    className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-accent/35 bg-accent/[0.08] px-4 py-2 text-[13.5px] font-medium text-accent-sky transition-colors hover:border-accent/60 hover:bg-accent/20 hover:text-white"
                  >
                    查看详情
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  data-trial="apply"
                  onClick={() => requestTrial({ name: product.name, code: product.code, intent: product.intent })}
                  className="pointer-events-auto rounded-xl bg-accent px-4 py-2 text-[13.5px] font-medium text-white shadow-glow transition-colors hover:bg-brand-500"
                >
                  申请体验
                </button>
                <button
                  type="button"
                  data-trial="plan"
                  onClick={() =>
                    requestProductContact({ name: product.name, code: product.code, intent: product.intent, source: `gallery-${product.code}`, cta: `索取 ${product.name} 实训方案` })
                  }
                  className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/[0.06] px-4 py-2 text-[13.5px] font-medium text-white/90 transition-colors hover:border-white/50 hover:bg-white/15"
                >
                  索取实训方案
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TopBar
        product={product}
        shot={shot}
        total={shots.length}
        playing={playing}
        show={hover || !playing}
        onToggle={onToggle}
        onPrev={onPrev}
        onNext={onNext}
        onExpand={onExpand}
        onClose={onClose}
      />
      <BottomBar product={product} shots={shots} shot={shot} running={running} onSeek={onSeek} />
    </div>
  )
}

/* 无截图产品的占位舞台：客户未提供界面（多为硬件装备）时不造假图，
   用一块设计过的说明板承接，保留申请体验 / 索取方案两个出口。 */
function PlaceholderSurface({ product }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.09] bg-night lg:h-full lg:w-auto lg:max-w-full">
      <div className="absolute inset-0 bg-[radial-gradient(62%_54%_at_50%_44%,rgba(22,119,255,0.12),transparent_72%)]" />
      <div className="absolute inset-0 grid place-items-center p-6">
        <div className="flex max-w-md flex-col items-center gap-2.5 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-white/[0.05] text-accent-ice">
            <ImageOff className="h-5 w-5" />
          </span>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-ice">{product.code}</p>
          <p className="text-[17px] font-semibold text-white">{product.name}</p>
          <p className="text-[12.5px] leading-relaxed text-ink-400">{product.tag} · 真实界面截图整理中，欢迎索取演示与实训方案。</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
            {hasDetail(product) && (
              <Link
                to={`/products/${product.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-accent/35 bg-accent/[0.08] px-4 py-2 text-[13.5px] font-medium text-accent-sky transition-colors hover:border-accent/60 hover:bg-accent/20 hover:text-white"
              >
                查看详情
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => requestTrial({ name: product.name, code: product.code, intent: product.intent })}
              className="rounded-xl bg-accent px-4 py-2 text-[13.5px] font-medium text-white shadow-glow transition-colors hover:bg-brand-500"
            >
              申请体验
            </button>
            <button
              type="button"
              onClick={() =>
                requestProductContact({ name: product.name, code: product.code, intent: product.intent, source: `gallery-${product.code}`, cta: `索取 ${product.name} 实训方案` })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/[0.06] px-4 py-2 text-[13.5px] font-medium text-white/90 transition-colors hover:border-white/50 hover:bg-white/15"
            >
              索取实训方案
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GalleryStage({ product, live, playing, setPlaying }) {
  const [shot, setShot] = useState(0)
  const [theater, setTheater] = useState(false)
  const shots = product.shots

  /* 换产品回到第一幕 */
  useEffect(() => setShot(0), [product.code])

  /* 自动推进：与进度条同源同节奏；暂停或滚出视野即停 */
  const running = playing && live
  useEffect(() => {
    if (!running || shots.length === 0) return
    const id = setInterval(() => setShot((s) => (s + 1) % shots.length), SHOT_MS)
    return () => clearInterval(id)
  }, [running, shots.length, shot])

  /* 影院期间锁死页面滚动（Lenis 平滑滚动光 overflow:hidden 拦不住）+ 键盘 */
  useEffect(() => {
    if (!theater) return
    const lenis = window.__lenis
    lenis?.stop()
    const onKey = (e) => {
      if (e.key === 'Escape') setTheater(false)
      if (e.key === 'ArrowRight') setShot((s) => (s + 1) % shots.length)
      if (e.key === 'ArrowLeft') setShot((s) => (s - 1 + shots.length) % shots.length)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      lenis?.start()
      window.removeEventListener('keydown', onKey)
    }
  }, [theater, shots.length])

  const toggle = useCallback(() => setPlaying((v) => !v), [setPlaying])
  const seek = useCallback((k) => {
    setShot(k)
    setPlaying(true)
  }, [setPlaying])
  const prev = useCallback(() => setShot((s) => (s - 1 + shots.length) % shots.length), [shots.length])
  const next = useCallback(() => setShot((s) => (s + 1) % shots.length), [shots.length])

  /* 带录屏的产品（区块链前两套沿用上版动态演示）：交给影片舞台，自带分幕/影院/重播 */
  if (product.clip) return <FilmStage clip={product.clip} product={product} live={live} playing={playing} setPlaying={setPlaying} />

  /* 无截图产品：占位板承接，不进入轮播 / 影院 */
  if (shots.length === 0) return <PlaceholderSurface product={product} />

  const shared = { product, shots, shot, playing, running, onToggle: toggle, onSeek: seek, onPrev: prev, onNext: next }

  return (
    <>
      <Surface
        {...shared}
        onExpand={() => {
          setTheater(true)
          setPlaying(true)
        }}
      />
      {createPortal(
        <AnimatePresence>
          {theater && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-night/94 p-4 backdrop-blur-sm md:p-8"
              onClick={(e) => e.target === e.currentTarget && setTheater(false)}
            >
              <Surface {...shared} theater onClose={() => setTheater(false)} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export default function GalleryScreen({ p, i, withIndex }) {
  const Icon = p.icon
  const products = galleryProducts[p.id] || []
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  /* 外壳同时承载「具身展台」与「截图舞台」，节点在两种状态下都存在，
     useInView 才能在挂载时就观察到一个真实节点。智能产品首项是具身展台，
     若把 ref 放在分支内部，切到其它产品后节点才出现，观察器不会再挂上去，
     表现为换台后永不自动播放。 */
  const stageRef = useRef(null)
  const inView = useInView(stageRef, { margin: '120px' })
  /* 进过一次视野才允许自动播放：滚出视野暂停，回来接着播（与链屏同口径） */
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (inView) setMounted(true)
  }, [inView])
  const live = mounted

  const cur = products[active] || products[0]

  /* 切产品时重播 */
  useEffect(() => setPlaying(true), [active])

  const play = playing && inView

  if (!cur) return null

  /* 具身智能机器人（原 01 独立体系并入智能产品）：选中即展开与旧版完全一致的
     3D 环形展台 + 六机型选型，下方保留产品缩略图条，可随时切回
     其它智能产品。展台自身管理 live/WebGL 生命周期，这里只负责给它整屏高度。 */
  return (
    <div ref={stageRef} className="relative flex h-full min-h-0 flex-col">
      {cur.embodied ? (
        <>
          <div className="min-h-0 flex-1">
            <EmbodiedScreen p={embodiedSystem} i={i} withIndex={withIndex} />
          </div>
          <div className="mt-2.5 shrink-0">
            <ImageRail products={products} active={active} onPick={setActive} />
          </div>
        </>
      ) : (
      <div className="relative flex h-full flex-col justify-center">
      <span className="pointer-events-none absolute -top-4 right-0 select-none text-[110px] font-bold leading-none text-white/[0.045] xl:text-[150px]">
        {pad(i)}
      </span>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* 标题带：产品切换交给下面的缩略图条，这里只留板块自述 */}
        <div className="shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-glow">
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-accent-ice">{p.en}</p>
            {withIndex && (
              <p className="text-[12.5px] tabular-nums text-ink-400">
                {pad(i)} / {pad(LAST)}
              </p>
            )}
          </div>
          <h3 className="mt-2.5 text-[22px] font-bold tracking-tight text-white md:text-[27px] xl:text-[32px]">{p.title}</h3>
          <p className="mt-1 text-[13.5px] font-medium text-accent-ice xl:text-[15px]">{p.tagline}</p>
        </div>

        {/* 截图舞台：减掉缩略图行后剩下的空间全给它。与链屏同口径无条件挂载，
            live 只闸门自动播放 —— 挂载等 IntersectionObserver 的话，首帧会是一块空框 */}
        <div className="mt-3 flex min-h-0 flex-1 items-center justify-start">
          <GalleryStage product={cur} live={live} playing={play} setPlaying={setPlaying} />
        </div>

        {/* 产品缩略图条：点击换台 */}
        <div className="mt-2.5">
          <ImageRail products={products} active={active} onPick={setActive} />
        </div>

        {/* 说明占满整宽第一行，适用专业与两个出口并列第二行；窄屏拆成两行避免挤压 */}
        <div className="mt-3 grid shrink-0 grid-cols-1 items-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-2.5 sm:grid-cols-[1fr_auto]">
          <p
            className="col-span-full line-clamp-2 min-w-0 text-[13px] leading-[1.65] text-ink-400 [@media(max-height:820px)]:line-clamp-1"
            title={cur.desc}
          >
            <span className="font-medium text-white/85">{cur.tag}</span>
            <span className="mx-2 text-ink-500">/</span>
            {cur.desc}
          </p>
          <p className="min-w-0 truncate text-[12.5px] text-ink-400">
            适用专业
            <span className="ml-1.5 text-[13px] font-medium text-white/85">{cur.majors || '金融科技 · 数字经济'}</span>
          </p>
          {/* 查看详情常驻这里，不只藏在画面 hover 蒙版里：触屏没有 hover，
              而且看完简介正是想读全文的时候。判据与详情页路由共用 hasDetail。 */}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:shrink-0">
            {hasDetail(cur) && (
              <Link
                to={`/products/${cur.slug}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-accent/45 bg-accent/10 px-4 py-2 text-[13px] font-medium text-accent-sky transition-colors hover:border-accent/70 hover:bg-accent/20 hover:text-white"
              >
                查看详情
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <a
              href="/about#contact"
              onClick={(e) => {
                e.preventDefault()
                requestProductContact({ name: cur.name, code: cur.code, intent: cur.intent || p.intent, source: `gallery-scheme-${cur.code}`, cta: `索取 ${cur.name} 实训方案` })
              }}
              className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/[0.05] px-4 py-2 text-[13px] font-medium text-white/85 transition-colors hover:border-accent/50 hover:bg-accent hover:text-white"
            >
              索取 {cur.code} 实训方案
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  )
}