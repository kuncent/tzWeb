import { useEffect, useRef, useState } from 'react'

/**
 * 按视口可见性门控 R3F 渲染循环（自 KUN 具身教育实验室项目复用）。
 * 画布进入视口 → frameloop="always"；滚出视口 → frameloop="never"（停 RAF 释放 CPU/GPU）。
 * 页面同时存在多个 WebGL 画布时，确保任意时刻只有一个在满帧渲染。
 *
 * 用法：<Canvas ref={ref} frameloop={frameloop} />
 *
 * @param rootMargin 预激活边距，负值=更晚激活；正值=提前预热
 */
export function useCanvasVisibility(rootMargin = '200px') {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // 无 IntersectionObserver 时保持渲染，避免画面空白
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin,
      threshold: 0,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  const frameloop = visible ? 'always' : 'never'
  return { ref, visible, frameloop }
}
