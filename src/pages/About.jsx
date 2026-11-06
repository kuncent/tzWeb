import { Fragment, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ZoomIn } from 'lucide-react'
import { PageHero, HeroFrame } from '../components/PageShell'
import RippleHero from '../components/RippleHero'
import Contact from '../components/sections/Contact'
import { EASE } from '../components/ui'
import { advisorStats } from '../data/site'


/* 首屏右半：公司实景。前台 / 文化墙 / 资质墙 / 荣誉墙四张实拍，
   用 bento 拼贴（竖图占满左列、文化墙做大块、两张小图压底）。小格里
   object-cover 会裁掉边缘、密集墙面照缩在小格中读不清，因此鼠标悬停
   （触屏点按）时浮出一块按原图比例尽量放大的预览面板看清细节；面板
   portal 到 body，避免被 HeroFrame 的 overflow-hidden 裁掉。硬指标数字
   在下方「资质与知识产权」段仍在，这里不重复。 */
const heroShots = [
  { src: '/images/about/reception.webp', label: '公司前台', en: 'Reception', span: 'col-span-1 row-span-3', iw: 619, ih: 1100 },
  { src: '/images/about/culture-wall.webp', label: '方案与产品文化墙', en: 'Solutions Wall', span: 'col-span-2 row-span-2', iw: 1100, ih: 619 },
  { src: '/images/about/qualification.webp', label: '企业资质墙', en: 'Qualifications', span: 'col-span-1 row-span-1', iw: 618, ih: 1100 },
  { src: '/images/about/honor.webp', label: '荣誉征程墙', en: 'Honors', span: 'col-span-1 row-span-1', iw: 1100, ih: 456 },
]

const PANEL_GAP = 14
const PANEL_MARGIN = 16

/* 首屏背景：光明科技金融大厦三张 2304×1296 外观（远景天际线 / 航拍俯瞰 /
   主塔立面近景），由 RippleHero 做 react-bits 风格的水波纹自动切换。
   三张同为 16:9、同一光比与冷调玻璃质感，避免切换时跳色。 */
const towerShots = [
  { src: '/images/about/tower-01.webp', label: '光明科技金融大厦 · 凤凰城天际线' },
  { src: '/images/about/tower-02.webp', label: '光明科技金融大厦 · 航拍俯瞰' },
  { src: '/images/about/tower-03.webp', label: '光明科技金融大厦 · 主塔立面' },
]

/* 悬停放大浮层：portal 到 body 的 fixed 面板，按视口空间与格子位置
 * 智能挑左右侧摆放（放不下时居中），按原图长宽比尽量放大到可读尺寸。
 * withBackdrop（触屏）时附半透明遮罩承接点按关闭；鼠标态面板本身
 * pointer-events-none，交由小格的 pointerleave 收起，避免 hover 抖动。 */
function ZoomPreview({ shot, rect, reduce, withBackdrop, onClose }) {
  const geo = useMemo(() => {
    if (!shot || !rect || typeof window === 'undefined') return null
    const vw = window.innerWidth
    const vh = window.innerHeight
    const maxW = Math.min(600, vw * 0.5)
    const maxH = Math.min(560, vh * 0.7)
    let w = maxW
    let h = (w * shot.ih) / shot.iw
    if (h > maxH) { h = maxH; w = (h * shot.iw) / shot.ih }
    w = Math.min(w, vw - PANEL_MARGIN * 2)
    h = Math.min(h, vh - PANEL_MARGIN * 2)
    const spaceRight = vw - rect.right
    const spaceLeft = rect.left
    let left
    if (spaceRight >= w + PANEL_GAP) left = rect.right + PANEL_GAP
    else if (spaceLeft >= w + PANEL_GAP) left = rect.left - w - PANEL_GAP
    else left = Math.min(Math.max((vw - w) / 2, PANEL_MARGIN), vw - w - PANEL_MARGIN)
    let top = rect.top + rect.height / 2 - h / 2
    top = Math.min(Math.max(top, PANEL_MARGIN), vh - h - PANEL_MARGIN)
    return { w, h, left, top }
  }, [shot, rect])

  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {shot && geo && (
        <Fragment key={shot.src}>
          {withBackdrop && (
            <motion.div
              aria-hidden
              className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              onClick={onClose}
            />
          )}
          <motion.div
            className="pointer-events-none fixed z-[60] overflow-hidden rounded-2xl border border-white/15 bg-night shadow-[var(--shadow-theme-soft)]"
            style={{ left: geo.left, top: geo.top, width: geo.w, height: geo.h }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
          >
            <img src={shot.src} alt={`天择科技 · ${shot.label}`} className="h-full w-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 flex items-baseline gap-2 bg-gradient-to-t from-night/90 to-transparent p-3">
              <span className="text-ui-sm font-medium text-white/95">{shot.label}</span>
              <span className="font-mono text-micro uppercase tracking-label text-white/45">{shot.en}</span>
            </div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function HeroGallery() {
  const reduce = !!useReducedMotion()
  const canHover = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
  const [pv, setPv] = useState(null) // { i, rect }

  useEffect(() => {
    if (!pv) return
    const close = () => setPv(null)
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [pv])

  const toggle = (i, el) => setPv((p) => (p && p.i === i ? null : { i, rect: el.getBoundingClientRect() }))

  return (
    <HeroFrame index="06 / 06" label="走进天择 · 实景" hint="悬停 / 点按放大细节">
      <div className="relative pb-6 pt-12">
        {/* 周期掠光：一道斜向高光从左扫到右，给静态图组一点活着的光影。
            周期从 ~7.8s 拉到 ~12s，光更淡 —— 常驻动效在这儿只该是「呼吸」，不该抢图。 */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-y-4 left-0 z-20 w-1/3 bg-gradient-to-r from-transparent via-white/[0.10] to-transparent"
          style={{ transform: 'skewX(-18deg)' }}
          initial={{ x: '-120%' }}
          animate={reduce ? undefined : { x: '460%' }}
          transition={{ duration: 5.4, repeat: reduce ? 0 : Infinity, repeatDelay: 6.8, ease: 'easeInOut' }}
        />
        <div className="grid h-[380px] grid-cols-3 grid-rows-3 gap-2.5 md:h-[448px]">
          {heroShots.map((s, i) => (
            <motion.figure
              key={s.src}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: pv && pv.i !== i ? 0.42 : 1, y: 0, scale: 1 }}
              transition={{ delay: pv ? 0 : 0.24 + i * 0.08, duration: 0.5, ease: EASE }}
              onPointerEnter={(e) => { if (canHover && e.pointerType === 'mouse') setPv({ i, rect: e.currentTarget.getBoundingClientRect() }) }}
              onPointerLeave={() => { if (canHover) setPv((p) => (p && p.i === i ? null : p)) }}
              onClick={canHover ? undefined : (e) => toggle(i, e.currentTarget)}
              className={`group relative overflow-hidden rounded-xl ring-1 ring-inset transition-shadow duration-300 ${pv && pv.i === i ? 'ring-brand/45' : 'ring-white/10'} ${canHover ? 'cursor-zoom-in' : 'cursor-pointer'} ${s.span}`}
            >
              <img
                src={s.src}
                alt={`天择科技 · ${s.label}`}
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/10 to-transparent" />
              <span aria-hidden className="pointer-events-none absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                <ZoomIn className="h-3.5 w-3.5" />
              </span>
              <figcaption className="absolute inset-x-0 bottom-0 flex items-baseline gap-1.5 p-2.5">
                <span className="text-caption font-medium text-white/95">{s.label}</span>
                <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/45">{s.en}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
      <ZoomPreview shot={pv ? heroShots[pv.i] : null} rect={pv?.rect} reduce={reduce} withBackdrop={!canHover} onClose={() => setPv(null)} />
    </HeroFrame>
  )
}

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="ABOUT US"
        crumbs="关于我们"
        title="立足高校，构建下一代人才培养基础设施"
        sub="深圳市天择教育科技有限公司成立于 2017 年 10 月，国家级高新技术企业、省市级专精特新中小企业、A 级纳税人。公司专注教育科技，从事教育信息化平台、教育实训仿真软件、教学资源库与现代教育装备的技术开发与集成服务，为高校提供实验室建设、课程开发与人才培养的全栈解决方案。"
        stats={advisorStats}
        cta={[
          { label: '联系我们', to: '#contact', primary: true },
          { label: '看解决方案', to: '/solutions' },
        ]}
        backdrop={<RippleHero images={towerShots} caption="深圳市光明区 · 光明科技金融大厦" />}
      />


      {/* 原首屏右栏的公司实景 bento 图组下移到此处，内容不丢 */}
      <section className="container-x py-14 md:py-16">
        <HeroGallery />
      </section>

      {/* ―― 联系我们：原首页最后一屏迁入本页（表单 id="contact"，全站 /about#contact 锁点指这里）―― */}
      <Contact />

    </>
  )
}
