/* ============================================================
 * 内容编辑：按 contentSchema 渲染的可编辑面
 * ------------------------------------------------------------
 * 真相仍是 src/data/*：这里只把「相对默认改过的叶子」发回，服务端把
 * content.json 当嵌套 overlay 深合并，官网运行时同样合并覆盖。
 * · 载入：GET /content 拿已发布 overlay，与 schema 默认合成当前值；
 * · 保存：与默认不同 → 写值；等于默认 / 清空 → 写 null（删该覆盖，回落源码默认）。
 * 可编辑面分组见 lib/contentSchema.js：首页 / 解决方案 / 关于我们 / 联系方式 / 产品矩阵。
 * 首页主标题固定，不在可编辑字段内，只作为锁定信息展示。
 * 右侧一栏同域 iframe 实时预览已发布态；Field.focus 时把锁点 id 传进去滚到对应区块。
 * ============================================================ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Save, RotateCcw, Eye, EyeOff, Undo2, Plus, Trash2 } from 'lucide-react'
import * as api from '../lib/adminApi'
import { useAuth } from './AuthContext'
import { Btn, Card, Input, Textarea, Field, Banner, Spinner, cx, useToast, PageFade } from './ui'
import ContentPreview from './ContentPreview'
import { diffContent } from '../lib/diffContent.js'
import { CONTENT_FIELDS, CONTENT_GROUPS } from '../lib/contentSchema'
import { honorSlug, honors } from '../data/honors'
import { newsItems } from '../data/site'

/* 分组 → 首页预览的锁点（非首页内容没有对应锚点，不滚动） */
const GROUP_ANCHOR = { home: 'hero', contact: 'contact', matrix: 'matrix' }

function readRaw(obj, path) {
  let cur = obj
  for (const seg of path.split('.')) {
    if (cur == null) return undefined
    cur = cur[seg]
  }
  return cur
}

/* schema 叶子 → 表单文本：数组字段按行展开，其余按字符串读取 */
function rawToText(field, raw) {
  if (field.type === 'lines') {
    const arr = Array.isArray(raw) ? raw : field.default
    return arr.join('\n')
  }
  if (field.type === 'pairs') {
    const arr = Array.isArray(raw) ? raw : field.default
    return arr.map((s) => `${s.k} | ${s.v}`).join('\n')
  }
  return typeof raw === 'string' ? raw : field.default
}

const textTrim = (v) => (v ?? '').trim()

const overlayToForm = (published) => {
  const f = {}
  for (const field of CONTENT_FIELDS) {
    const raw = readRaw(published, field.path)
    f[field.path] = rawToText(field, raw === undefined ? field.default : raw)
  }
  return f
}

/* 与默认不同 → 写值；等于默认或清空 → 写 null（删覆盖，回落源码默认）。
   叶子 null 携带「删除」语义必须保留，只裁因此变空的纯对象分支由服务端 mergeContent 处理。 */
function formToPatch(form) {
  const patch = {}
  for (const field of CONTENT_FIELDS) {
    const v = textTrim(form[field.path])
    const segs = field.path.split('.')
    let node = patch
    for (let i = 0; i < segs.length - 1; i++) node = node[segs[i]] ??= {}

    if (field.type === 'lines') {
      const arr = v === '' ? [] : v.split('\n').map((s) => s.trim()).filter(Boolean)
      node[segs[segs.length - 1]] =
        arr.length === 0 || JSON.stringify(arr) === JSON.stringify(field.default) ? null : arr
    } else if (field.type === 'pairs') {
      const arr =
        v === ''
          ? []
          : v
              .split('\n')
              .map((line) => {
                const at = line.indexOf('|')
                if (at < 0) return null
                const k = line.slice(0, at).trim()
                const val = line.slice(at + 1).trim()
                return k && val ? { k, v: val } : null
              })
              .filter(Boolean)
      node[segs[segs.length - 1]] =
        arr.length === 0 || JSON.stringify(arr) === JSON.stringify(field.default) ? null : arr
    } else {
      node[segs[segs.length - 1]] = v === '' || v === field.default ? null : v
    }
  }
  return patch
}

/* ============================================================
 * 荣誉墙：21 块牌匾是稳定有序集合，只覆盖图注。
 * overlay 形如 honors.<slug>.{org,title}，slug 由牌匾文件名派生；
 * 图片、材质与顺序仍归 data/honors.js，后台不提供增删与排序。
 * ============================================================ */
const HONOR_DEFAULTS = Object.fromEntries(
  honors.map((h) => [honorSlug(h.file), { org: h.org, title: h.title }]),
)

const overlayToHonors = (published) =>
  Object.fromEntries(
    honors.map((h) => {
      const key = honorSlug(h.file)
      const o = published?.honors?.[key]
      return [
        key,
        {
          org: typeof o?.org === 'string' ? o.org : h.org,
          title: typeof o?.title === 'string' ? o.title : h.title,
        },
      ]
    }),
  )

const honorsToPatch = (form) =>
  Object.fromEntries(
    honors.map((h) => {
      const key = honorSlug(h.file)
      const cur = form[key] || {}
      const org = textTrim(cur.org)
      const title = textTrim(cur.title)
      return [
        key,
        {
          org: org === '' || org === h.org ? null : org,
          title: title === '' || title === h.title ? null : title,
        },
      ]
    }),
  )

/* ============================================================
 * 新闻：整组数组覆盖（新增 / 编辑 / 删除都会写回完整列表）。
 * 默认值来自 data/site.js 的 newsItems；数组与默认完全一致时写 null，
 * 回落到源码默认，删除全部则发布空数组并由前端渲染空态。
 * ============================================================ */
const NEWS_FIELDS = ['date', 'tag', 'img', 'org', 'title', 'desc', 'url']

const normalizeNews = (n) =>
  Object.fromEntries(NEWS_FIELDS.map((k) => [k, k === 'img' ? (n?.img ? String(n.img) : null) : String(n?.[k] ?? '')]))

const blankNews = () => normalizeNews({})

const NEWS_DEFAULTS = newsItems.map(normalizeNews)

const newsToForm = (published) =>
  (Array.isArray(published?.news) ? published.news : newsItems).map(normalizeNews)

const newsToPatch = (items) => {
  const cur = items.map(normalizeNews)
  return JSON.stringify(cur) === JSON.stringify(NEWS_DEFAULTS) ? null : cur
}

const newsErrors = (items) =>
  items.map((n) => {
    const e = {}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(textTrim(n.date))) e.date = '请填写日期'
    if (!textTrim(n.title)) e.title = '请填写标题'
    if (!textTrim(n.org)) e.org = '请填写机构 / 合作方'
    return e
  })

export default function Content() {
  const { can } = useAuth()
  const toast = useToast()
  const editable = can('content.manage')

  const [published, setPublished] = useState(null) // null=未加载
  const [form, setForm] = useState({})
  const [honorsForm, setHonorsForm] = useState({})
  const [newsForm, setNewsForm] = useState([])
  const [groupId, setGroupId] = useState('home')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  /* 预览面板：当前锁点 + 发布后递增的 refreshKey + 小屏开关 */
  const [anchor, setAnchor] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPreview, setShowPreview] = useState(true)

  const applyPub = useCallback((pub) => {
    setPublished(pub)
    setForm(overlayToForm(pub))
    setHonorsForm(overlayToHonors(pub))
    setNewsForm(newsToForm(pub))
  }, [])

  const load = useCallback(async () => {
    setErr('')
    try {
      const r = await api.getContent()
      applyPub((r && r.content) || {})
    } catch (e) {
      setErr(e.message)
    }
  }, [applyPub])
  useEffect(() => { load() }, [load])

  const textDirty = useMemo(
    () =>
      CONTENT_FIELDS.reduce((n, field) => {
        const cur = textTrim(form[field.path])
        const raw = published ? readRaw(published, field.path) : undefined
        const init = textTrim(rawToText(field, raw === undefined ? field.default : raw))
        return cur !== init ? n + 1 : n
      }, 0),
    [form, published],
  )

  const honorDirty = useMemo(
    () =>
      honors.reduce((n, h) => {
        const key = honorSlug(h.file)
        const cur = honorsForm[key] || {}
        const pub = published?.honors?.[key]
        const effOrg = typeof pub?.org === 'string' ? pub.org : h.org
        const effTitle = typeof pub?.title === 'string' ? pub.title : h.title
        return (
          n +
          (textTrim(cur.org) !== textTrim(effOrg) ? 1 : 0) +
          (textTrim(cur.title) !== textTrim(effTitle) ? 1 : 0)
        )
      }, 0),
    [honorsForm, published],
  )

  const newsDirty = useMemo(
    () => JSON.stringify(newsForm.map(normalizeNews)) !== JSON.stringify(newsToForm(published)),
    [newsForm, published],
  )

  const newsInvalid = useMemo(() => newsErrors(newsForm).filter((e) => Object.keys(e).length).length, [newsForm])

  /* 指标卡是「名称 | 数值」逐行编辑，格式不完整的行不能被静默丢弃 */
  const pairInvalid = useMemo(
    () =>
      CONTENT_FIELDS.filter((f) => f.type === 'pairs').reduce((n, field) => {
        const rows = String(form[field.path] ?? '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
        return (
          n +
          rows.filter((line) => {
            const at = line.indexOf('|')
            return at < 0 || !line.slice(0, at).trim() || !line.slice(at + 1).trim()
          }).length
        )
      }, 0),
    [form],
  )

  const dirtyCount = textDirty + honorDirty + (newsDirty ? 1 : 0)

  /* 分组角标：切换分组前也能看到别处还有未发布调整 */
  const dirtyByGroup = useMemo(() => {
    const out = {}
    for (const group of CONTENT_GROUPS) {
      if (group.kind === 'honors') {
        out[group.id] = honorDirty
        continue
      }
      if (group.kind === 'news') {
        out[group.id] = newsDirty ? 1 : 0
        continue
      }
      out[group.id] = (group.sections || []).reduce(
        (n, s) =>
          n +
          s.fields.reduce((m, field) => {
            const cur = textTrim(form[field.path])
            const raw = published ? readRaw(published, field.path) : undefined
            const init = textTrim(rawToText(field, raw === undefined ? field.default : raw))
            return cur !== init ? m + 1 : m
          }, 0),
        0,
      )
    }
    return out
  }, [form, published, honorDirty, newsDirty])

  /* 发布载荷：文本叶子按默认回落；集合只看是否脏，未脏时原样保留已发布 overlay */
  const buildPatch = useCallback(() => {
    const patch = formToPatch(form)
    if (honorDirty > 0) patch.honors = honorsToPatch(honorsForm)
    if (newsDirty) patch.news = newsToPatch(newsForm)
    return patch
  }, [form, honorsForm, newsForm, honorDirty, newsDirty])

  /* 待发布变更预览：当前 form 生成的 patch vs 已发布 overlay */
  const pendingDiff = useMemo(() => {
    if (dirtyCount === 0) return []
    const patch = buildPatch()
    const after = JSON.parse(JSON.stringify(published || {}))
    // 简易深合并得到 “发布后会变成什么”
    const merge = (obj, src) => {
      for (const [k, v] of Object.entries(src)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if (!obj[k]) obj[k] = {}
          merge(obj[k], v)
        } else if (v === null) { delete obj[k] }
        else obj[k] = v
      }
    }
    merge(after, patch)
    return diffContent(published || {}, after)
  }, [published, dirtyCount, buildPatch])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const resetOne = (field) => setForm((f) => ({ ...f, [field.path]: rawToText(field, field.default) }))
  const focusField = (field) => () => setAnchor(GROUP_ANCHOR[groupId] || '')

  const save = async () => {
    if (saving) return
    if (newsInvalid > 0) {
      setErr('新闻集合中有未填完的条目，请先补全日期、标题与机构。')
      return
    }
    if (pairInvalid > 0) {
      setErr('产品指标卡中有格式不正确的行，请按“名称 | 数值”填写。')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await api.publishContent(buildPatch())
      const r = await api.getContent()
      applyPub((r && r.content) || {})
      setRefreshKey((n) => n + 1) // 发布后令 iframe 重载，反映新的发布态
      toast('已发布，官网与预览将同步生效', 'success')
    } catch (e) {
      setErr(e.message)
      toast(e.message || '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const rollback = async () => {
    if (saving) return
    if (!confirm('确认回滚到上一次发布快照？当前未保存的编辑将丢失。')) return
    setSaving(true)
    setErr('')
    try {
      const r = await api.rollbackContent()
      applyPub(r?.content || {})
      setRefreshKey((n) => n + 1)
      toast('已回滚到上一次发布版本', 'success')
    } catch (e) {
      setErr(e.message)
      toast(e.message || '回滚失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!published && !err) {
    return <div className="grid h-40 place-items-center text-ink-400"><Spinner /></div>
  }

  const group = CONTENT_GROUPS.find((g) => g.id === groupId) || CONTENT_GROUPS[0]

  return (
    <PageFade className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">内容编辑</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            标题 / 描述留空即沿用官网默认文案。共 {dirtyCount} 处相对当前发布有调整。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <Btn variant="ghost" size="sm" onClick={rollback} disabled={saving} title="回滚到上一次发布快照">
              <Undo2 className="h-4 w-4" />回滚
            </Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={() => setShowPreview((v) => !v)} className="lg:hidden" title={showPreview ? '隐藏预览' : '展开预览'}>
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? '隐藏预览' : '展开预览'}
          </Btn>
          {editable && (
            <Btn size="sm" onClick={save} loading={saving} disabled={dirtyCount === 0 || newsInvalid > 0 || pairInvalid > 0}>
              <Save className="h-4 w-4" />发布更改
            </Btn>
          )}
        </div>
      </div>

      <Banner>{err}</Banner>
      {!editable && <Banner kind="success">你当前为只读角色，可预览内容但无法编辑发布。</Banner>}

      {dirtyCount > 0 && pendingDiff.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[13px]">
          <summary className="cursor-pointer font-medium text-amber-800">待发布变更（{pendingDiff.length} 处）</summary>
          <ul className="mt-2 space-y-1 font-mono text-[12px]">
            {pendingDiff.slice(0, 20).map((d, i) => (
              <li key={i} className="grid gap-1 md:grid-cols-[minmax(0,160px)_minmax(0,1fr)_minmax(0,1fr)]">
                <span className="truncate text-ink-500">{d.path}</span>
                <span className="truncate text-ink-400 line-through">{JSON.stringify(d.from) || '—'}</span>
                <span className="truncate font-semibold text-emerald-700">{JSON.stringify(d.to) || '—'}</span>
              </li>
            ))}
            {pendingDiff.length > 20 && <li className="text-ink-400">…还有 {pendingDiff.length - 20} 处</li>}
          </ul>
        </details>
      )}

      {/* 分组：可编辑面按站点区块收拢，脏字段在组角标上提示 */}
      <div className="flex flex-wrap gap-2">
        {CONTENT_GROUPS.map((g) => {
          const on = g.id === group.id
          const n = dirtyByGroup[g.id] || 0
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => { setGroupId(g.id); setAnchor(GROUP_ANCHOR[g.id] || '') }}
              aria-pressed={on}
              className={cx(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors',
                on
                  ? 'border-brand bg-brand text-white'
                  : 'border-ink-900/10 bg-white text-ink-600 hover:border-brand/40 hover:text-brand',
              )}
            >
              {g.label}
              {n > 0 && (
                <span className={cx(
                  'rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums',
                  on ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand',
                )}>
                  {n}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* 左栏：表单 */}
        <div className="space-y-5 min-w-0">
          {group.kind === 'honors' ? (
            <HonorsEditor form={honorsForm} setForm={setHonorsForm} editable={editable} />
          ) : group.kind === 'news' ? (
            <NewsEditor form={newsForm} setForm={setNewsForm} editable={editable} />
          ) : (
            (group.sections || []).map((section) => (
              <Section key={section.id} title={section.title} desc={section.desc}>
                {section.locked && (
                  <div className="rounded-xl border border-ink-100 bg-mist-50/70 px-3.5 py-3">
                    <p className="text-[12px] font-medium text-ink-500">{section.locked.label}</p>
                    <p className="mt-1.5 text-[15px] font-bold leading-snug text-ink-900">
                      {section.locked.lines.map((line) => (
                        <span key={line} className="block">{line}</span>
                      ))}
                    </p>
                  </div>
                )}
                {section.fields.map((field) =>
                  field.type === 'textarea' || field.type === 'lines' || field.type === 'pairs' ? (
                    <AreaField
                      key={field.path}
                      field={field}
                      editable={editable}
                      form={form}
                      set={set}
                      resetOne={resetOne}
                      onFocus={focusField(field)}
                    />
                  ) : (
                    <TextField
                      key={field.path}
                      field={field}
                      editable={editable}
                      form={form}
                      set={set}
                      resetOne={resetOne}
                      onFocus={focusField(field)}
                    />
                  ),
                )}
              </Section>
            ))
          )}
        </div>

        {/* 右栏：实时预览（一份 iframe，小屏隐藏、大屏固定顶栏 5rem 下方） */}
        {showPreview && (
          <div className="min-w-0">
            <ContentPreview anchor={anchor} refreshKey={refreshKey} />
          </div>
        )}
      </div>
    </PageFade>
  )
}

function Section({ title, desc, children }) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
        {desc && <p className="mt-0.5 text-[12.5px] text-ink-400">{desc}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  )
}

function isChanged(form, field) {
  return textTrim(form[field.path]) !== textTrim(rawToText(field, field.default))
}

function TextField({ field, editable, form, set, resetOne, onFocus }) {
  const changed = isChanged(form, field)
  return (
    <Field label={field.label} hint={changed && editable ? <ChangedHint onReset={() => resetOne(field)} /> : undefined}>
      <Input
        value={form[field.path] ?? ''}
        disabled={!editable}
        onFocus={onFocus}
        onChange={set(field.path)}
        className={cx(changed && editable && 'border-brand/40')}
      />
    </Field>
  )
}

function AreaField({ field, editable, form, set, resetOne, onFocus }) {
  const changed = isChanged(form, field)
  return (
    <Field label={field.label} hint={changed && editable ? <ChangedHint onReset={() => resetOne(field)} /> : undefined}>
      <Textarea
        rows={field.rows || 4}
        value={form[field.path] ?? ''}
        disabled={!editable}
        onFocus={onFocus}
        onChange={set(field.path)}
        className={cx(changed && editable && 'border-brand/40')}
      />
      {field.type === 'pairs' && (
        <p className="mt-1 text-[11px] text-ink-400">每行一条，格式：名称 | 数值</p>
      )}
    </Field>
  )
}

function ChangedHint({ onReset }) {
  return (
    <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-brand hover:underline">
      <RotateCcw className="h-3 w-3" />改回默认
    </button>
  )
}

/* 荣誉墙：稳定有序集合，只编辑图注。图片与顺序不在后台改动。 */
function HonorsEditor({ form, setForm, editable }) {
  const setField = (key, field) => (e) =>
    setForm((f) => ({ ...f, [key]: { ...f[key], [field]: e.target.value } }))

  const resetAll = () =>
    setForm(Object.fromEntries(Object.entries(HONOR_DEFAULTS).map(([k, v]) => [k, { ...v }])))

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">牌匾图注</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-400">
            共 {honors.length} 块 · 顺序与图片绑定；只改机构与图注标题，留空回落默认。
          </p>
        </div>
        {editable && (
          <Btn variant="ghost" size="sm" onClick={resetAll}>
            <RotateCcw className="h-3.5 w-3.5" />恢复默认
          </Btn>
        )}
      </div>

      <div className="hidden grid-cols-[56px_minmax(0,1.05fr)_minmax(0,0.95fr)] gap-3 px-1 pb-1.5 text-[11px] font-medium text-ink-400 sm:grid">
        <span>牌匾</span>
        <span>图注标题</span>
        <span>机构 / 合作方</span>
      </div>

      <ul className="divide-y divide-ink-900/[0.06]">
        {honors.map((h) => {
          const key = honorSlug(h.file)
          const cur = form[key] || {}
          const changed = textTrim(cur.org) !== h.org || textTrim(cur.title) !== h.title
          return (
            <li
              key={h.file}
              className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-3 py-3 sm:grid-cols-[56px_minmax(0,1.05fr)_minmax(0,0.95fr)] sm:items-center"
            >
              <img
                src={h.file}
                alt=""
                loading="lazy"
                className={cx(
                  'h-9 w-[52px] rounded-md border bg-white object-contain p-0.5',
                  changed ? 'border-brand/50' : 'border-ink-900/10',
                )}
              />
              <div className="space-y-1.5">
                <span className="block text-[11px] text-ink-400 sm:hidden">图注标题</span>
                <Input
                  aria-label={`${h.org} 图注标题`}
                  value={cur.title ?? ''}
                  disabled={!editable}
                  onChange={setField(key, 'title')}
                  className={cx(changed && editable && 'border-brand/40')}
                />
              </div>
              <div className="col-start-2 space-y-1.5 sm:col-start-auto">
                <span className="block text-[11px] text-ink-400 sm:hidden">机构 / 合作方</span>
                <Input
                  aria-label={`${h.file} 机构 / 合作方`}
                  value={cur.org ?? ''}
                  disabled={!editable}
                  onChange={setField(key, 'org')}
                  className={cx(changed && editable && 'border-brand/40')}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* 新闻：完整集合编辑，新增 / 编辑 / 删除都在同一份数组里，随发布 / 回滚生效。 */
function NewsEditor({ form, setForm, editable }) {
  const errors = newsErrors(form)
  const invalid = errors.filter((e) => Object.keys(e).length).length

  const setField = (i, field) => (e) =>
    setForm((f) => f.map((n, idx) => (idx === i ? { ...n, [field]: e.target.value } : n)))

  const add = () => setForm((f) => [blankNews(), ...f])

  const remove = (i) => {
    if (!confirm('删除这条新闻？发布后官网将不再展示它。')) return
    setForm((f) => f.filter((_, idx) => idx !== i))
  }

  const resetAll = () => setForm(NEWS_DEFAULTS.map((n) => ({ ...n })))

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-900">新闻条目</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-400">
              共 {form.length} 条 · 官网按日期倒序展示；新增条目需补全日期、标题与机构后才能发布。
            </p>
          </div>
          {editable && (
            <div className="flex items-center gap-2">
              <Btn variant="ghost" size="sm" onClick={resetAll}>
                <RotateCcw className="h-3.5 w-3.5" />恢复默认
              </Btn>
              <Btn variant="ghost" size="sm" onClick={add}>
                <Plus className="h-3.5 w-3.5" />新增新闻
              </Btn>
            </div>
          )}
        </div>
        {invalid > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            有 {invalid} 条新闻缺少必填信息，补全后才能发布。
          </p>
        )}
      </Card>

      {form.length === 0 && (
        <Card className="p-8 text-center text-[13px] text-ink-400">
          暂无新闻条目，点击“新增新闻”开始。
        </Card>
      )}

      {form.map((n, i) => (
        <Card key={i} className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 font-mono text-[11px] font-semibold text-brand">
                {i + 1}
              </span>
              <h3 className="line-clamp-1 text-[14px] font-semibold text-ink-900">{n.title || '未命名新闻'}</h3>
            </div>
            {editable && (
              <Btn variant="ghost" size="sm" onClick={() => remove(i)}>
                <Trash2 className="h-3.5 w-3.5" />删除
              </Btn>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="日期" hint={errors[i].date && <span className="text-rose-600">{errors[i].date}</span>}>
              <Input type="date" value={n.date} disabled={!editable} onChange={setField(i, 'date')} />
            </Field>
            <Field label="标签">
              <Input value={n.tag} disabled={!editable} onChange={setField(i, 'tag')} placeholder="课程共建 / 实习基地" />
            </Field>
            <Field label="机构 / 合作方" hint={errors[i].org && <span className="text-rose-600">{errors[i].org}</span>}>
              <Input value={n.org} disabled={!editable} onChange={setField(i, 'org')} />
            </Field>
            <Field label="标题" hint={errors[i].title && <span className="text-rose-600">{errors[i].title}</span>}>
              <Input value={n.title} disabled={!editable} onChange={setField(i, 'title')} />
            </Field>
          </div>

          <div className="mt-4 space-y-4">
            <Field label="摘要">
              <Textarea rows={3} value={n.desc} disabled={!editable} onChange={setField(i, 'desc')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="原文链接">
                <Input value={n.url} disabled={!editable} onChange={setField(i, 'url')} placeholder="https://" />
              </Field>
              <Field label="配图路径（可空）">
                <Input value={n.img ?? ''} disabled={!editable} onChange={setField(i, 'img')} placeholder="/images/news/....webp" />
              </Field>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

