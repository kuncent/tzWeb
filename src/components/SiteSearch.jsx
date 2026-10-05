import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Search, CornerDownLeft } from 'lucide-react'
import { nav, anchorSections } from '../data/site'
import { solutionScenes, techDetail, disciplineGroups } from '../data/pages'
import { productMatrix } from '../data/site'

/* ============================================================
 * 站内搜索（⌘K）
 * ------------------------------------------------------------
 * 顶栏那个放大镜以前是个没有 onClick 的死按钮 —— B 端官网上最掉价
 * 的一处：承诺了一个能力，然后不交付。要么删掉它，要么做成真的。
 * 这里做成真的：索引全部来自现有数据出口，不额外维护一份关键词表，
 * 所以内容改了搜索不会说谎。
 * ============================================================ */

/* 索引：页面 · 首页板块 · 场景 · 技术底座 · 学科群 · 产品体系 */
function buildIndex() {
  const out = []
  nav.forEach((n) => out.push({ label: n.label, kind: '页面', to: n.to }))
  anchorSections.forEach((s) => out.push({ label: s.label, kind: '首页板块', to: `/#${s.id}` }))
  productMatrix.forEach((p) => out.push({ label: p.title, kind: '产品体系', to: '/#matrix', sub: p.tagline }))
  solutionScenes.forEach((s) => out.push({ label: s.name, kind: '解决方案', to: `/solutions#${s.id}`, sub: s.line }))
  disciplineGroups.forEach((g) => out.push({ label: g.name, kind: '学科', to: '/solutions#disciplines', sub: g.majors.join('、') }))
  techDetail.forEach((t) => out.push({ label: t.name, kind: '技术底座', to: '/technology#bases', sub: t.thesis }))
  out.push({ label: '交付路径', kind: '首页板块', to: '/#delivery' })
  out.push({ label: '联系我们 / 预约演示', kind: '页面', to: '/#contact' })
  return out
}

const INDEX = buildIndex()

/* 子序列匹配 + 前缀加权：搜「区链」能命中「区块链实验室」，
   搜「lab」能命中英文串，比 indexOf 单串更符合这类面板的用法 */
function score(text, q) {
  const t = text.toLowerCase()
  const s = q.toLowerCase()
  if (!s) return 0
  const direct = t.indexOf(s)
  let base = direct === 0 ? 100 : direct > 0 ? 70 : 0
  if (base === 0) {
    let i = 0
    for (const ch of t) if (ch === s[i]) i += 1
    if (i === s.length) base = 30
    else return -1
  }
  return base + (t.length < 24 ? 6 : 0)
}

export default function SiteSearch({ open, onClose }) {
  const [q, setQ] = useState('')
  const [cur, setCur] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const list = q.trim()
      ? INDEX.map((it) => ({ ...it, s: Math.max(score(it.label, q), score(`${it.kind} ${it.sub || ''}`, q) - 12) }))
          .filter((it) => it.s >= 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 8)
      : INDEX.filter((it) => it.kind === '页面' || it.kind === '产品体系').slice(0, 7)
    return list
  }, [q])

  useEffect(() => setCur(0), [q])
  useEffect(() => {
    if (open) {
      setQ('')
      setCur(0)
      // 面板是动画挂载的，等它出现再抢焦点
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  const go = (item) => {
    if (!item) return
    onClose()
    navigate(item.to)
  }

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCur((v) => (results.length ? (v + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCur((v) => (results.length ? (v - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[cur])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-start justify-center bg-[#04070d]/70 px-4 pt-[14vh]"
          onClick={onClose}
          onKeyDown={onKey}
          role="dialog"
          aria-modal="true"
          aria-label="站内搜索"
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/12 bg-white shadow-[0_30px_80px_rgba(4,7,13,0.35)]"
          >
            <div className="flex items-center gap-3 border-b border-ink-900/[0.07] px-5 py-4">
              <Search className="h-[18px] w-[18px] shrink-0 text-ink-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜产品、场景、技术、页面板块…"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-400"
                aria-label="搜索关键词"
              />
              <kbd className="hidden shrink-0 rounded-md border border-ink-900/10 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-400 sm:block">
                ESC
              </kbd>
            </div>

            <ul className="max-h-[52vh] overflow-y-auto py-2">
              {results.length === 0 && (
                <li className="px-5 py-8 text-center text-[13.5px] text-ink-400">
                  没有匹配的条目。可以试试「区块链」「实验室」「私有化」「交付」。
                </li>
              )}
              {results.map((r, i) => (
                <li key={`${r.kind}-${r.to}-${r.label}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setCur(i)}
                    onClick={() => go(r)}
                    className={`flex w-full items-center gap-4 px-5 py-3 text-left transition-colors ${
                      i === cur ? 'bg-mist-100' : 'hover:bg-mist-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-medium text-ink-900">{r.label}</span>
                      {r.sub && <span className="mt-0.5 block truncate text-[12px] text-ink-400">{r.sub}</span>}
                    </span>
                    <span className="shrink-0 rounded-full border border-ink-900/[0.08] px-2 py-0.5 text-[11px] text-ink-500">{r.kind}</span>
                    {i === cur && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-brand" />}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 border-t border-ink-900/[0.07] bg-mist-100 px-5 py-2.5 text-[11.5px] text-ink-400">
              <span>↑ ↓ 选择</span>
              <span>Enter 打开</span>
              <span className="ml-auto">{results.length} 条结果</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
