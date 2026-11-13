import { useEffect } from 'react'
import Lenis from 'lenis'
import { markHeroReady } from '../components/three/hero/buildBus'

/* 全局平滑滚动；尊重 prefers-reduced-motion */
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({
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
  lenis.resize()
  lenis.scrollTo(el, {
    offset,
    immediate,
    onComplete: () => {
      markHeroReady('nav')
      if (tries <= 0) return
      setTimeout(() => {
        const want = -offset
        if (el.isConnected && Math.abs(el.getBoundingClientRect().top - want) > 160) fly(el, offset, tries - 1, true)
      }, 220)
    },
  })
}

export function scrollToId(id, offset = -64) {
  const t0 = performance.now()
  let lastTop = -1
  let stable = 0
  let foundAt = -1
  const tick = () => {
    const late = performance.now() - t0
    const el = document.getElementById(id)
    if (!el) {
      if (late < 8000) requestAnimationFrame(tick)
      return
    }
    if (foundAt < 0) foundAt = late
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
