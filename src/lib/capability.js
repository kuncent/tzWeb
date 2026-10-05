/* WebGL 能力探测 —— 全局只测一次。
   ------------------------------------------------------------
   绝不要把 `document.createElement('canvas').getContext('webgl')` 写进组件的
   useMemo / 渲染体：那样每次挂载或重渲染都会新建一个一次性 WebGL 上下文。
   浏览器对同时存活的 WebGL 上下文有硬上限（约 8~16 个，随驱动/显存变化），
   超限即「Oldest context will be lost」——最先创建的首屏画布被强制丢弃，
   表现为「首屏渲染完之后又黑屏」。这里做进程级单例，并在探测后立即用
   WEBGL_lose_context 释放那个临时上下文，把名额还给真正的画布。 */
let _gl

export function hasWebGL() {
  if (_gl !== undefined) return _gl
  if (typeof window === 'undefined') return (_gl = false)
  try {
    const c = document.createElement('canvas')
    const g = c.getContext('webgl2') || c.getContext('webgl')
    _gl = !!g
    /* 用完即弃：显式丢弃这个探测用的上下文，别让它占着名额 */
    if (g) g.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    _gl = false
  }
  return _gl
}
