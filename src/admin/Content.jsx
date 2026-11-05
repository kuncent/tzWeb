/* ============================================================
 * 内容编辑：首页模块（开关 + 标题/描述） / 联系方式 / 产品文案
 * ------------------------------------------------------------
 * 真相仍是 site.js：这里只把「相对默认改过的叶子」发回，服务端把 content.json
 * 当嵌套 overlay 深合并，官网运行时同样合并覆盖。
 * · 载入：GET /content 拿已发布 overlay，与 site.js 默认合成当前值；
 * · 保存：与默认不同 → 写值；等于默认 / 清空 → 写 null（删该覆盖，回落 site.js）。
 * 首屏之下 11 屏（按锁点 id）：enabled 控制是否显示，title/desc 覆盖板块标题与描述。
 * 布尔 enabled：关 → 写 false；开 → 写 null（回落默认 true）。文本留空即不覆盖。
 * 右侧一栏同域 iframe 实时预览已发布态；Field.focus 时把锁点 id 传进去滚到对应区块。
 * ============================================================ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Save, RotateCcw, Eye, EyeOff, Undo2 } from 'lucide-react'
import { contact, productMatrix, anchorSections } from '../data/site'
import { heroScenes, heroMeta } from '../data/heroScenes'
import * as api from '../lib/adminApi'
import { useAuth } from './AuthContext'
import { Btn, Card, Input, Textarea, Field, Banner, Spinner, cx, useToast, PageFade } from './ui'
import ContentPreview from './ContentPreview'
import { diffContent } from '../lib/diffContent.js'

/* 文本型可编辑叶子：联系方式 + 产品卡文案。首屏板块标题/描述走下面的 sections 一套。 */
const TEXT_DEFAULTS = {
  'contact.phone': contact.phone,
  'contact.email': contact.email,
  'contact.address': contact.address,
  ...Object.fromEntries(
    productMatrix.flatMap((p) => [
      [`products.${p.id}.title`, p.title],
      [`products.${p.id}.tagline`, p.tagline],
      [`products.${p.id}.desc`, p.desc],
    ])
  ),
}

function readPath(obj, path) {
  let cur = obj
  for (const seg of path.split('.')) {
    if (cur == null) return undefined
    cur = cur[seg]
  }
  return typeof cur === 'string' ? cur : undefined
}

const overlayToForm = (published) => {
  const f = {}
  for (const key of Object.keys(TEXT_DEFAULTS)) {
    const v = readPath(published, key)
    f[key] = v === undefined ? TEXT_DEFAULTS[key] : v
  }
  return f
}

/* 与默认不同 → 写值；等于默认或清空 → 写 null（删覆盖，回落 site.js）。
   叶子 null 携带「删除」语义必须保留，只裁因此变空的纯对象分支由服务端 mergeContent 处理。 */
function formToPatch(form) {
  const patch = {}
  for (const [path, def] of Object.entries(TEXT_DEFAULTS)) {
    const v = (form[path] ?? '').trim()
    const segs = path.split('.')
    let node = patch
    for (let i = 0; i < segs.length - 1; i++) node = node[segs[i]] ??= {}
    node[segs[segs.length - 1]] = v === '' || v === def ? null : v
  }
  return patch
}

/* ---------- 首页模块（sections） ---------- */
const SEC_DEFAULT = { enabled: true, title: '', desc: '' }
const isOff = (b) => b === false

function publishedToSections(pub) {
  const src = (pub && pub.sections) || {}
  const out = {}
  for (const { id } of anchorSections) {
    const s = src[id] || {}
    out[id] = {
      enabled: !isOff(s.enabled), // 未发布 enabled 即视为启用
      title: typeof s.title === 'string' ? s.title : '',
      desc: typeof s.desc === 'string' ? s.desc : '',
    }
  }
  return out
}

function sectionsToPatch(sections) {
  const out = {}
  for (const { id } of anchorSections) {
    const s = sections[id] || SEC_DEFAULT
    const title = s.title.trim()
    const desc = s.desc.trim()
    out[id] = {
      enabled: s.enabled ? null : false, // 开=删覆盖回落默认 true；关=写 false
      title: title === '' ? null : title,
      desc: desc === '' ? null : desc,
    }
  }
  return { sections: out }
}

/* ---------- 首屏三屏（heroScenes）的可编辑文案 ----------
   只编辑纯文本：标题两行 / 屏标签 / 描述 / 看板下小字 / 标签（每行一个）。
   title / tags 以数组存（整值替换），等于默认则写 null（删覆盖 → 回落 heroScenes）。 */
const HERO_DEFAULTS = Object.fromEntries(
  heroScenes.map((s) => [s.id, {
    l1: s.title?.[0] || '',
    l2: s.title?.[1] || '',
    nav: s.nav || '',
    desc: s.desc || '',
    hint: s.hint || '',
    tags: (s.tags || []).join('\n'),
  }]),
)

function publishedToHero(pub) {
  const src = (pub && pub.hero) || {}
  const out = {}
  for (const s of heroScenes) {
    const h = src[s.id] || {}
    const d = HERO_DEFAULTS[s.id]
    out[s.id] = {
      l1: Array.isArray(h.title) && typeof h.title[0] === 'string' ? h.title[0] : d.l1,
      l2: Array.isArray(h.title) && typeof h.title[1] === 'string' ? h.title[1] : d.l2,
      nav: typeof h.nav === 'string' ? h.nav : d.nav,
      desc: typeof h.desc === 'string' ? h.desc : d.desc,
      hint: typeof h.hint === 'string' ? h.hint : d.hint,
      tags: Array.isArray(h.tags) ? h.tags.join('\n') : d.tags,
    }
  }
  return out
}

function heroToPatch(hero, brand) {
  const scenesOut = {}
  for (const s of heroScenes) {
    const cur = hero[s.id]
    if (!cur) continue
    const d = HERO_DEFAULTS[s.id]
    const entry = {}
    const t0 = cur.l1.trim()
    const t1 = cur.l2.trim()
    if (t0 !== d.l1 || t1 !== d.l2) entry.title = [t0, t1]
    const nav = cur.nav.trim()
    if (nav !== d.nav) entry.nav = nav
    const desc = cur.desc.trim()
    if (desc !== d.desc) entry.desc = desc
    const hint = cur.hint.trim()
    if (hint !== d.hint) entry.hint = hint
    const tags = cur.tags.split('\n').map((x) => x.trim()).filter(Boolean)
    if (tags.join('\n') !== d.tags) entry.tags = tags
    if (Object.keys(entry).length) scenesOut[s.id] = entry
  }
  const patch = {}
  if (Object.keys(scenesOut).length) patch.hero = scenesOut
  if ((brand || '').trim() !== heroMeta.brand) patch.heroMeta = { brand: (brand || '').trim() }
  return patch
}

const textTrim = (v) => (v ?? '').trim()

export default function Content() {
  const { can } = useAuth()
  const toast = useToast()
  const editable = can('content.manage')

  const [published, setPublished] = useState(null) // null=未加载
  const [form, setForm] = useState({})
  const [sections, setSections] = useState({})
  const [secInit, setSecInit] = useState({}) // 已发布态，用于「未保存」计数
  const [hero, setHero] = useState({})
  const [heroInit, setHeroInit] = useState({})
  const [brand, setBrand] = useState('')
  const [brandInit, setBrandInit] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  /* 预览面板：当前锁点 + 发布后递增的 refreshKey + 小屏开关 */
  const [anchor, setAnchor] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPreview, setShowPreview] = useState(true)

  const applyPub = useCallback((pub) => {
    setPublished(pub)
    setForm(overlayToForm(pub))
    const sec = publishedToSections(pub)
    setSections(sec)
    setSecInit(sec)
    const h = publishedToHero(pub)
    setHero(h)
    setHeroInit(h)
    const b = pub && pub.heroMeta && typeof pub.heroMeta.brand === 'string' ? pub.heroMeta.brand : heroMeta.brand
    setBrand(b)
    setBrandInit(b)
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

  const textDirty = useMemo(() => {
    let n = 0
    for (const key of Object.keys(TEXT_DEFAULTS)) {
      const cur = textTrim(form[key])
      const init = published ? readPath(published, key) ?? TEXT_DEFAULTS[key] : TEXT_DEFAULTS[key]
      if (cur !== textTrim(init)) n++
    }
    return n
  }, [form, published])

  const secDirty = useMemo(() => {
    let n = 0
    for (const { id } of anchorSections) {
      const a = sections[id] || SEC_DEFAULT
      const b = secInit[id] || SEC_DEFAULT
      if (a.enabled !== b.enabled || textTrim(a.title) !== textTrim(b.title) || textTrim(a.desc) !== textTrim(b.desc)) n++
    }
    return n
  }, [sections, secInit])

  const heroDirty = useMemo(() => {
    let n = 0
    for (const s of heroScenes) {
      const a = hero[s.id]
      const b = heroInit[s.id] || HERO_DEFAULTS[s.id]
      if (!a) continue
      if (a.l1.trim() !== b.l1.trim() || a.l2.trim() !== b.l2.trim() || a.nav.trim() !== b.nav.trim() || a.desc.trim() !== b.desc.trim() || a.hint.trim() !== b.hint.trim() || a.tags.trim() !== b.tags.trim()) n++
    }
    if ((brand || '').trim() !== (brandInit || '').trim()) n++
    return n
  }, [hero, heroInit, brand, brandInit])

  const dirtyCount = textDirty + secDirty + heroDirty

  /* 待发布变更预览：当前 form+sections 生成的 patch vs 已发布 overlay */
  const pendingDiff = useMemo(() => {
    if (dirtyCount === 0) return []
    const patch = { ...formToPatch(form), ...sectionsToPatch(sections), ...heroToPatch(hero, brand) }
    const after = JSON.parse(JSON.stringify(published || {}))
    // 简易深合并得到 “发布后会变成什么”
    const merge = (obj, src, prefix = '') => {
      for (const [k, v] of Object.entries(src)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if (!obj[k]) obj[k] = {}
          merge(obj[k], v, prefix ? `${prefix}.${k}` : k)
        } else if (v === null) { delete obj[k] }
        else obj[k] = v
      }
    }
    merge(after, patch)
    return diffContent(published || {}, after)
  }, [form, sections, hero, brand, published, dirtyCount])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setSec = (id, key, value) => setSections((s) => ({ ...s, [id]: { ...(s[id] || SEC_DEFAULT), [key]: value } }))
  const setHeroF = (id, key, value) => setHero((h) => ({ ...h, [id]: { ...(h[id] || HERO_DEFAULTS[id]), [key]: value } }))
  const resetHero = (id) => setHero((h) => ({ ...h, [id]: { ...HERO_DEFAULTS[id] } }))
  const resetOne = (key) => setForm((f) => ({ ...f, [key]: TEXT_DEFAULTS[key] }))

  const save = async () => {
    if (saving) return
    setSaving(true)
    setErr('')
    try {
      await api.publishContent({ ...formToPatch(form), ...sectionsToPatch(sections), ...heroToPatch(hero, brand) })
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

  return (
    <PageFade className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">首页内容与模块</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            开关控制各屏是否显示，标题/描述留空即沿用官网默认文案。共 {dirtyCount} 处相对当前有调整。
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
            <Btn size="sm" onClick={save} loading={saving} disabled={dirtyCount === 0}>
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* 左栏：表单 */}
        <div className="space-y-5 min-w-0">
          <Section title="首屏文案" desc="AI 首屏的标题、描述、标签与看板小字（留空 / 等于默认即不覆盖 heroScenes）">
            <Field label="品牌行（首屏上方，heroMeta.brand）">
              <Input
                value={brand}
                disabled={!editable}
                onFocus={() => setAnchor('hero')}
                onChange={(e) => setBrand(e.target.value)}
                className={cx(brand.trim() !== heroMeta.brand && editable && 'border-brand/40')}
              />
            </Field>
            <div className="mt-4 space-y-4">
              {heroScenes.map((scene) => (
                <HeroRow
                  key={scene.id}
                  scene={scene}
                  value={hero[scene.id] || HERO_DEFAULTS[scene.id]}
                  editable={editable}
                  onChange={setHeroF}
                  onReset={resetHero}
                  onFocusAnchor={setAnchor}
                />
              ))}
            </div>
          </Section>

          <Section title="首页模块" desc="首屏之下 11 屏的显示开关与标题 / 描述（按页面顺序）">
            <div className="space-y-4">
              {anchorSections.map(({ id, label }) => (
                <ModuleRow
                  key={id}
                  id={id}
                  label={label}
                  editable={editable}
                  value={sections[id] || SEC_DEFAULT}
                  onChange={setSec}
                  onFocusAnchor={setAnchor}
                />
              ))}
            </div>
          </Section>

          <Section title="联系方式" desc="联系区与页脚的电话、邮箱、地址">
            <TextField editable={editable} form={form} set={set} resetOne={resetOne} k="contact.phone" label="咨询电话" anchor="contact" onFocusAnchor={setAnchor} />
            <TextField editable={editable} form={form} set={set} resetOne={resetOne} k="contact.email" label="邮箱" anchor="contact" onFocusAnchor={setAnchor} />
            <TextField editable={editable} form={form} set={set} resetOne={resetOne} k="contact.address" label="地址" anchor="contact" onFocusAnchor={setAnchor} />
          </Section>

          {productMatrix.map((p) => (
            <Section key={p.id} title={p.en} desc={`产品：${TEXT_DEFAULTS[`products.${p.id}.title`]}`}>
              <TextField editable={editable} form={form} set={set} resetOne={resetOne} k={`products.${p.id}.title`} label="标题" anchor="matrix" onFocusAnchor={setAnchor} />
              <TextField editable={editable} form={form} set={set} resetOne={resetOne} k={`products.${p.id}.tagline`} label="一句话定位" anchor="matrix" onFocusAnchor={setAnchor} />
              <AreaField editable={editable} form={form} set={set} resetOne={resetOne} k={`products.${p.id}.desc`} label="详细介绍" rows={4} anchor="matrix" onFocusAnchor={setAnchor} />
            </Section>
          ))}
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

/* 单屏一行：开关 + 标题 + 描述；留空 = 不覆盖官网默认 */
function ModuleRow({ id, label, editable, value, onChange, onFocusAnchor }) {
  const off = !value.enabled
  const focus = () => onFocusAnchor && onFocusAnchor(id)
  return (
    <div className={cx('rounded-xl border p-4 transition-colors', off ? 'border-ink-100 bg-mist-50' : 'border-ink-100 bg-white')}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-ink-900">{label}</span>
            {off && (
              <span className="rounded-full bg-ink-900/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink-400">已关闭</span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-ink-400">锁点 #<span className="font-mono">{id}</span>{off ? ' · 已从首页与导航移除' : ''}</p>
        </div>
        <Switch checked={value.enabled} disabled={!editable} onChange={(v) => onChange(id, 'enabled', v)} />
      </div>
      <div className={cx('mt-3 grid gap-3 sm:grid-cols-2', off && 'opacity-60')}>
        <Field label="标题（留空用默认）">
          <Input
            value={value.title}
            disabled={!editable}
            placeholder="不覆盖"
            onFocus={focus}
            onChange={(e) => onChange(id, 'title', e.target.value)}
            className={cx(textTrim(value.title) !== '' && editable && 'border-brand/40')}
          />
        </Field>
        <Field label="描述（留空用默认）">
          <Input
            value={value.desc}
            disabled={!editable}
            placeholder="不覆盖"
            onFocus={focus}
            onChange={(e) => onChange(id, 'desc', e.target.value)}
            className={cx(textTrim(value.desc) !== '' && editable && 'border-brand/40')}
          />
        </Field>
      </div>
    </div>
  )
}

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        checked ? 'bg-brand' : 'bg-ink-200',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
          checked ? 'left-[22px]' : 'left-0.5'
        )}
      />
    </button>
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

function isChanged(form, key) {
  return (form[key] ?? '').trim() !== TEXT_DEFAULTS[key]
}

function TextField({ editable, form, set, resetOne, k, label, anchor, onFocusAnchor }) {
  return (
    <Field label={label} hint={isChanged(form, k) && editable ? <ChangedHint onReset={() => resetOne(k)} /> : undefined}>
      <Input
        value={form[k] ?? ''}
        disabled={!editable}
        onFocus={() => onFocusAnchor && onFocusAnchor(anchor)}
        onChange={set(k)}
        className={cx(isChanged(form, k) && editable && 'border-brand/40')}
      />
    </Field>
  )
}

function AreaField({ editable, form, set, resetOne, k, label, rows, anchor, onFocusAnchor }) {
  return (
    <Field label={label} hint={isChanged(form, k) && editable ? <ChangedHint onReset={() => resetOne(k)} /> : undefined}>
      <Textarea
        rows={rows}
        value={form[k] ?? ''}
        disabled={!editable}
        onFocus={() => onFocusAnchor && onFocusAnchor(anchor)}
        onChange={set(k)}
        className={cx(isChanged(form, k) && editable && 'border-brand/40')}
      />
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

/* 首屏单屏一行：按场景主色打编号，标题两行 / 屏标签 / 小字 / 描述 / 标签逐项可编辑；
   任一字段偏离默认即标蓝并给「改回默认」。 */
function HeroRow({ scene, value, editable, onChange, onReset, onFocusAnchor }) {
  const d = HERO_DEFAULTS[scene.id]
  const focus = () => onFocusAnchor && onFocusAnchor('hero')
  const changed =
    value.l1.trim() !== d.l1 || value.l2.trim() !== d.l2 || value.nav.trim() !== d.nav ||
    value.desc.trim() !== d.desc || value.hint.trim() !== d.hint || value.tags.trim() !== d.tags
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 min-w-6 place-items-center rounded-md px-1.5 text-[11px] font-bold text-white" style={{ background: scene.accentDeep || scene.accent }}>{scene.no}</span>
          <span className="text-[14px] font-semibold text-ink-900">{scene.zh}</span>
          <span className="truncate text-[11px] uppercase tracking-wider text-ink-400">{scene.en}</span>
        </div>
        {changed && editable && (
          <button type="button" onClick={() => onReset(scene.id)} className="inline-flex shrink-0 items-center gap-1 text-[12px] text-brand hover:underline">
            <RotateCcw className="h-3 w-3" />改回默认
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="标题·第一行">
          <Input value={value.l1} disabled={!editable} onFocus={focus} onChange={(e) => onChange(scene.id, 'l1', e.target.value)} className={cx(value.l1.trim() !== d.l1 && editable && 'border-brand/40')} />
        </Field>
        <Field label="标题·第二行">
          <Input value={value.l2} disabled={!editable} onFocus={focus} onChange={(e) => onChange(scene.id, 'l2', e.target.value)} className={cx(value.l2.trim() !== d.l2 && editable && 'border-brand/40')} />
        </Field>
        <Field label="屏标签（底部切换短名）">
          <Input value={value.nav} disabled={!editable} onChange={(e) => onChange(scene.id, 'nav', e.target.value)} className={cx(value.nav.trim() !== d.nav && editable && 'border-brand/40')} />
        </Field>
        <Field label="看板下小字提示">
          <Input value={value.hint} disabled={!editable} onChange={(e) => onChange(scene.id, 'hint', e.target.value)} className={cx(value.hint.trim() !== d.hint && editable && 'border-brand/40')} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="段落描述">
          <Textarea rows={3} value={value.desc} disabled={!editable} onFocus={focus} onChange={(e) => onChange(scene.id, 'desc', e.target.value)} className={cx(value.desc.trim() !== d.desc && editable && 'border-brand/40')} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="标签（每行一个）" hint="留空即不覆盖；每行一枚胶囊，顺序即展示顺序">
          <Textarea rows={4} value={value.tags} disabled={!editable} onChange={(e) => onChange(scene.id, 'tags', e.target.value)} className={cx(value.tags.trim() !== d.tags && editable && 'border-brand/40')} />
        </Field>
      </div>
    </div>
  )
}
