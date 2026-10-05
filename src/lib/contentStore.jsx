/* ============================================================
 * 官网运行时内容覆盖（Content Overlay）
 * ------------------------------------------------------------
 * 真相仍是 src/data/site.js：它是构建默认值，保证零空屏、不动已调优的
 * 结构与钉屏。管理后台发布的 content.json 只作「嵌套 overlay」，深合并
 * 覆盖被编辑的叶子字段；拉不到（离线 / 预览 / 未配置）就静默用默认。
 *
 * 语义与服务端 admin.mjs 的 mergeContent 对齐：
 *   · 嵌套普通对象 → 递归合并；数组 / 标量 → 整值替换；null → 删除该键。
 * 只有接了 useContent 的组件会被覆盖影响，其余组件继续吃 site.js 默认，
 * 所以「接几个字段」是渐进的、非破坏的。
 * ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { contact } from '../data/site'

/* 可被后台编辑、且官网侧已接入 useContent 的命名空间默认值。
   · contact：页脚/联系区的电话邮箱地址；
   · products：按产品 id 的映射（只覆盖 title/tagline/desc，数组结构仍由 site.js 提供）；
   · sections：首屏之下 11 屏的开关与标题/描述（按锚点 id），默认空对象 → 全部启用、文案回落 site.js。 */
const DEFAULTS = { contact, products: {}, sections: {} }

const isPlainObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

function deepMerge(base, overlay) {
  if (!isPlainObj(overlay)) return overlay === undefined ? base : overlay
  const out = isPlainObj(base) ? { ...base } : {}
  for (const [k, v] of Object.entries(overlay)) {
    if (v === null) { delete out[k]; continue }
    if (isPlainObj(v)) out[k] = deepMerge(isPlainObj(out[k]) ? out[k] : {}, v)
    else out[k] = v === undefined ? out[k] : v
  }
  return out
}

function getByPath(obj, path) {
  if (!path) return undefined
  let cur = obj
  for (const seg of path.split('.')) {
    if (cur == null) return undefined
    cur = cur[seg]
  }
  return cur
}

const ContentCtx = createContext({ data: DEFAULTS, reload: () => {}, ready: false })

export function ContentProvider({ children }) {
  const [overlay, setOverlay] = useState(null) // null = 尚未加载（用默认）
  const [ready, setReady] = useState(false)

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/content', { credentials: 'same-origin' })
      if (res.ok) {
        const j = await res.json()
        setOverlay(j && typeof j === 'object' ? j : {})
      }
    } catch {
      /* 离线 / 预览无接口：保持默认，不打断渲染 */
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const data = useMemo(() => (overlay ? deepMerge(DEFAULTS, overlay) : DEFAULTS), [overlay])
  const value = useMemo(() => ({ data, reload, ready }), [data, reload, ready])
  return <ContentCtx.Provider value={value}>{children}</ContentCtx.Provider>
}

/* useContent('contact.phone', site.phone)：取不到（undefined/空串）回落 fallback。
 * fallback 建议直接传 site.js 的静态值，双保险，且能在 provider 之外安全使用。 */
export function useContent(path, fallback) {
  const { data } = useContext(ContentCtx)
  const v = getByPath(data, path)
  return v === undefined || v === null || v === '' ? fallback : v
}

/* 需要整块（如产品数组）时用 */
export const useContentData = () => useContext(ContentCtx).data

/* 首屏之下各屏的开关状态表：data.sections（后台没发布时为 {}）。
   Navbar / Footer 用它把被关闭的锚点从导航里过滤掉。 */
export const useSectionsMap = () => useContext(ContentCtx).data.sections || {}

/* 单块是否启用：未发布 enabled 即视为启用（默认 true），仅显式 false 才关。 */
export function useSectionEnabled(id) {
  return useContent(`sections.${id}.enabled`, true) !== false
}
