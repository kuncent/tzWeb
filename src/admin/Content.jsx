/* ============================================================
 * 内容编辑：首页模块（开关 + 标题/描述） / 联系方式 / 产品文案
 * ------------------------------------------------------------
 * 真相仍是 site.js：这里只把「相对默认改过的叶子」发回，服务端把 content.json
 * 当嵌套 overlay 深合并，官网运行时同样合并覆盖。
 * · 载入：GET /content 拿已发布 overlay，与 site.js 默认合成当前值；
 * · 保存：与默认不同 → 写值；等于默认 / 清空 → 写 null（删该覆盖，回落 site.js）。
 * 首屏之下 11 屏（按锚点 id）：enabled 控制是否显示，title/desc 覆盖板块标题与描述。
 * 布尔 enabled：关 → 写 false；开 → 写 null（回落默认 true）。文本留空即不覆盖。
 * ============================================================ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { contact, productMatrix, anchorSections } from '../data/site'
import * as api from '../lib/adminApi'
import { useAuth } from './AuthContext'
import { Btn, Card, Input, Textarea, Field, Banner, Spinner, cx, useToast } from './ui'

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

const textTrim = (v) => (v ?? '').trim()

export default function Content() {
  const { can } = useAuth()
  const toast = useToast()
  const editable = can('content.manage')

  const [published, setPublished] = useState(null) // null=未加载
  const [form, setForm] = useState({})
  const [sections, setSections] = useState({})
  const [secInit, setSecInit] = useState({}) // 已发布态，用于「未保存」计数
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setErr('')
    try {
      const r = await api.getContent()
      const pub = (r && r.content) || {}
      setPublished(pub)
      setForm(overlayToForm(pub))
      const sec = publishedToSections(pub)
      setSections(sec)
      setSecInit(sec)
    } catch (e) {
      setErr(e.message)
    }
  }, [])
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

  const dirtyCount = textDirty + secDirty

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setSec = (id, key, value) => setSections((s) => ({ ...s, [id]: { ...(s[id] || SEC_DEFAULT), [key]: value } }))
  const resetOne = (key) => setForm((f) => ({ ...f, [key]: TEXT_DEFAULTS[key] }))

  const save = async () => {
    if (saving) return
    setSaving(true)
    setErr('')
    try {
      await api.publishContent({ ...formToPatch(form), ...sectionsToPatch(sections) })
      const r = await api.getContent()
      const pub = (r && r.content) || {}
      setPublished(pub)
      setForm(overlayToForm(pub))
      const sec = publishedToSections(pub)
      setSections(sec)
      setSecInit(sec)
      toast('已发布，官网将生效', 'success')
    } catch (e) {
      setErr(e.message)
      toast(e.message || '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!published && !err) {
    return <div className="grid h-40 place-items-center text-ink-400"><Spinner /></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">首页内容与模块</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            开关控制各屏是否显示，标题/描述留空即沿用官网默认文案。共 {dirtyCount} 处相对当前有调整。
          </p>
        </div>
        {editable && (
          <Btn size="sm" onClick={save} loading={saving} disabled={dirtyCount === 0}>
            <Save className="h-4 w-4" />发布更改
          </Btn>
        )}
      </div>

      <Banner>{err}</Banner>
      {!editable && <Banner kind="success">你当前为只读角色，可预览内容但无法编辑发布。</Banner>}

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
            />
          ))}
        </div>
      </Section>

      <Section title="联系方式" desc="联系区与页脚的电话、邮箱、地址">
        <TextField editable={editable} form={form} set={set} resetOne={resetOne} k="contact.phone" label="咨询电话" />
        <TextField editable={editable} form={form} set={set} resetOne={resetOne} k="contact.email" label="邮箱" />
        <TextField editable={editable} form={form} set={set} resetOne={resetOne} k="contact.address" label="地址" />
      </Section>

      {productMatrix.map((p) => (
        <Section key={p.id} title={p.en} desc={`产品：${TEXT_DEFAULTS[`products.${p.id}.title`]}`}>
          <TextField editable={editable} form={form} set={set} resetOne={resetOne} k={`products.${p.id}.title`} label="标题" />
          <TextField editable={editable} form={form} set={set} resetOne={resetOne} k={`products.${p.id}.tagline`} label="一句话定位" />
          <AreaField editable={editable} form={form} set={set} resetOne={resetOne} k={`products.${p.id}.desc`} label="详细介绍" rows={4} />
        </Section>
      ))}
    </div>
  )
}

/* 单屏一行：开关 + 标题 + 描述；留空 = 不覆盖官网默认 */
function ModuleRow({ id, label, editable, value, onChange }) {
  const off = !value.enabled
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
          <p className="mt-0.5 text-[12px] text-ink-400">锚点 #<span className="font-mono">{id}</span>{off ? ' · 已从首页与导航移除' : ''}</p>
        </div>
        <Switch checked={value.enabled} disabled={!editable} onChange={(v) => onChange(id, 'enabled', v)} />
      </div>
      <div className={cx('mt-3 grid gap-3 sm:grid-cols-2', off && 'opacity-60')}>
        <Field label="标题（留空用默认）">
          <Input
            value={value.title}
            disabled={!editable}
            placeholder="不覆盖"
            onChange={(e) => onChange(id, 'title', e.target.value)}
            className={cx(textTrim(value.title) !== '' && editable && 'border-brand/40')}
          />
        </Field>
        <Field label="描述（留空用默认）">
          <Input
            value={value.desc}
            disabled={!editable}
            placeholder="不覆盖"
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

function TextField({ editable, form, set, resetOne, k, label }) {
  return (
    <Field label={label} hint={isChanged(form, k) && editable ? <ChangedHint onReset={() => resetOne(k)} /> : undefined}>
      <Input value={form[k] ?? ''} disabled={!editable} onChange={set(k)} className={cx(isChanged(form, k) && editable && 'border-brand/40')} />
    </Field>
  )
}

function AreaField({ editable, form, set, resetOne, k, label, rows }) {
  return (
    <Field label={label} hint={isChanged(form, k) && editable ? <ChangedHint onReset={() => resetOne(k)} /> : undefined}>
      <Textarea rows={rows} value={form[k] ?? ''} disabled={!editable} onChange={set(k)} className={cx(isChanged(form, k) && editable && 'border-brand/40')} />
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
