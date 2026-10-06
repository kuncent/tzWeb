import { useEffect, useState } from 'react'
import { Phone, Mail, MapPin, Check, Send, ClipboardList, X } from 'lucide-react'
import { Reveal } from '../ui'
import { contactHead, contactProducts, contact, offices } from '../../data/site'
import { PREFILL_KEY } from '../../lib/aiEngine'
import { useContent } from '../../lib/contentStore'

const inputCls =
  'w-full rounded-xl border border-ink-900/10 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400/70 focus:border-brand focus:ring-4 focus:ring-brand/10'

export default function Contact() {
  /* 运行时内容覆盖：拉不到后台发布版时回落到 site.js 默认（传第二个参数），
     保证离线/预览零空屏；拉到则以后台为准。 */
  const phone = useContent('contact.phone', contact.phone)
  const email = useContent('contact.email', contact.email)
  const address = useContent('contact.address', contact.address)
  const headTitle = useContent('sections.contact.title', contactHead.zh)
  const headDesc = useContent('sections.contact.desc', contactHead.desc)
  const [form, setForm] = useState({ name: '', phone: '', org: '', region: '', role: '', product: '', note: '' })
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const [prefill, setPrefill] = useState(null)
  const [source, setSource] = useState('site-contact')
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState('')
  const [hp, setHp] = useState('') // 蜜罐：真人不填，填了即判为机器人

  /* 首屏方案面板「就此方案联系我们」、产品屏「申请体验」→ 自动带入意向方向与备注 */
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(PREFILL_KEY)
        if (!raw) return
        const p = JSON.parse(raw)
        localStorage.removeItem(PREFILL_KEY)
        setPrefill(p)
        setSource(p.source || 'site-contact')
        setForm((f) => ({ ...f, product: p.product || f.product, note: p.note || '' }))
        setDone(false)
      } catch {
        /* ignore */
      }
    }
    read()
    window.addEventListener('tianze:prefill', read)
    return () => window.removeEventListener('tianze:prefill', read)
  }, [])

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const err = {}
    if (!form.name.trim()) err.name = '请填写您的姓名'
    if (!/^1\d{10}$/.test(form.phone.trim())) err.phone = '请输入正确的 11 位手机号码'
    if (!form.org.trim()) err.org = '请填写学校 / 单位名称'
    if (!form.product) err.product = '请选择意向方向'
    setErrors(err)
    if (Object.keys(err).length > 0) return
    /* 真把线索交到后端 /api/ai/lead（服务端持久化）；失败不静默 ——
       给出重试 + 电话/邮件兑底，不让一次网络抖动丢掉一条意向 */
    setBusy(true)
    setFail('')
    try {
      const res = await fetch('/api/ai/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, source, company_website: hp }),
      })
      if (!res.ok) {
        if (res.status === 422) {
          const j = await res.json().catch(() => null)
          if (j?.fields) {
            setErrors(j.fields)
            setFail('')
            return
          }
        }
        if (res.status === 429) {
          const j = await res.json().catch(() => null)
          setFail(j?.message || '提交过于频繁，请稍后再试。')
          return
        }
        throw new Error('提交未成功')
      }
      setDone(true)
    } catch {
      setFail('提交未成功，可能是网络或服务短暂不可用。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="contact" className="relative overflow-hidden bg-gradient-to-b from-mist-100 to-mist-200 sec-y">
      <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[480px] w-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.10),transparent_70%)]" />
      <div className="container-x relative grid gap-14 lg:grid-cols-[1fr_minmax(0,520px)]">
        {/* 左：信息 */}
        <Reveal>
          <div className="eyebrow">{contactHead.en}</div>
          <h2 className="text-h2 mt-4 font-bold text-ink-900">
            {headTitle}
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-[1.7] text-ink-500">{headDesc}</p>

          <ul className="mt-10 space-y-5">
            <li className="flex items-center gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand shadow-card"><Phone className="h-[18px] w-[18px]" /></span>
              <div>
                <div className="text-[11px] text-ink-400">咨询热线（工作日 9:00-18:00）</div>
                <div className="text-base font-semibold text-ink-900">{phone}</div>
              </div>
            </li>
            <li className="flex items-center gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand shadow-card"><Mail className="h-[18px] w-[18px]" /></span>
              <div>
                <div className="text-[11px] text-ink-400">商务合作</div>
                <div className="text-base font-semibold text-ink-900">{email}</div>
              </div>
            </li>
            <li className="flex items-center gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand shadow-card"><MapPin className="h-[18px] w-[18px]" /></span>
              <div>
                <div className="text-[11px] text-ink-400">公司地址</div>
                <div className="text-base font-semibold text-ink-900">{address}</div>
              </div>
            </li>
          </ul>

          <div className="mt-10 flex flex-wrap gap-2">
            {offices.map((o) => (
              <span key={o} className="rounded-full border border-ink-900/[0.08] bg-white px-3.5 py-1.5 text-xs text-ink-500">
                {o}
              </span>
            ))}
          </div>
        </Reveal>

        {/* 右：表单 */}
        <Reveal delay={0.12}>
          <div className="rounded-2xl bg-white p-8 shadow-elev-lg">
            {done ? (
              <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand">
                  <Check className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-ink-900">提交成功</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500">
                  感谢您的信任，{form.name}。方案顾问将在 1 个工作日内致电 {form.phone}
                  {form.note ? <>，并携带《需求建议书》与您沟通：{form.note.slice(0, 28)}{form.note.length > 28 ? '…' : ''}</> : '，为您安排 Demo 体验'}。
                </p>
                <button onClick={() => { setDone(false); setSource('site-contact'); setHp(''); setForm({ name: '', phone: '', org: '', region: '', role: '', product: '', note: '' }) }} className="btn-ghost mt-8 text-[13px]">
                  再提交一条
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-4">
                {/* 蜜罐：离屏隐藏、禁自动填充、不可聚焦；只有机器人会读到并填，真人无感 */}
                <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="company-website-hp">公司网站（请留空）</label>
                  <input id="company-website-hp" type="text" name="company_website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
                </div>
                {prefill && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand-50 px-4 py-3">
                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div className="flex-1">
                      {/* 同一个入口服务两种带法：方案与体验申请的开场白不能混为一谈 */}
                      <p className="text-[12.5px] font-bold text-brand">
                        {prefill.kind === 'trial' ? '已带入您的体验申请' : prefill.kind === 'product' ? '已带入您咨询的产品' : '已带入您在首屏生成的方案'}
                      </p>
                      {/* 备注已经落进下面的输入框（可改），这里不再重复一遍 */}
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{prefill.title}</p>
                    </div>
                    <button type="button" onClick={() => setPrefill(null)} className="text-ink-400 transition-colors hover:text-ink-900" aria-label="移除带入内容">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <input
                      type="text"
                      name="name"
                      autoComplete="given-name"
                      aria-label="姓名"
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={errors.name ? 'err-name' : undefined}
                      placeholder="姓名 *"
                      value={form.name}
                      onChange={set('name')}
                      className={inputCls}
                    />
                    {errors.name && <p id="err-name" className="mt-1.5 text-xs text-[#DC2626]">{errors.name}</p>}
                  </div>
                  <div>
                    <input
                      type="tel"
                      name="phone"
                      inputMode="numeric"
                      autoComplete="tel"
                      aria-label="手机号"
                      aria-invalid={errors.phone ? true : undefined}
                      aria-describedby={errors.phone ? 'err-phone' : undefined}
                      placeholder="手机号 *"
                      value={form.phone}
                      onChange={set('phone')}
                      maxLength={11}
                      className={inputCls}
                    />
                    {errors.phone && <p id="err-phone" className="mt-1.5 text-xs text-[#DC2626]">{errors.phone}</p>}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <input
                      type="text"
                      name="org"
                      autoComplete="organization"
                      aria-label="学校 / 单位名称"
                      aria-invalid={errors.org ? true : undefined}
                      aria-describedby={errors.org ? 'err-org' : undefined}
                      placeholder="学校 / 单位名称 *"
                      value={form.org}
                      onChange={set('org')}
                      className={inputCls}
                    />
                    {errors.org && <p id="err-org" className="mt-1.5 text-xs text-[#DC2626]">{errors.org}</p>}
                  </div>
                  {/* 所在地区：线索分配 / 区域统计用，选填但落盘 */}
                  <div>
                    <input
                      type="text"
                      name="region"
                      autoComplete="address-level1"
                      aria-label="所在地区"
                      placeholder="所在地区（省 / 市，选填）"
                      value={form.region}
                      onChange={set('region')}
                      maxLength={40}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <select name="role" aria-label="职位（选填）" value={form.role} onChange={set('role')} className={inputCls + (form.role ? '' : ' text-ink-400/70')}>
                    <option value="">职位（选填）</option>
                    <option>院系负责人</option>
                    <option>一线教师</option>
                    <option>实验室管理员</option>
                    <option>教务处 / 信息中心</option>
                    <option>其他</option>
                  </select>
                  <select
                    name="product"
                    aria-label="意向方向"
                    aria-invalid={errors.product ? true : undefined}
                    aria-describedby={errors.product ? 'err-product' : undefined}
                    value={form.product}
                    onChange={set('product')}
                    className={inputCls + (form.product ? '' : ' text-ink-400/70')}
                  >
                    <option value="">意向方向 *</option>
                    {contactProducts.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                {errors.product && <p id="err-product" className="text-xs text-[#DC2626]">{errors.product}</p>}
                {/* 备注一直是表单字段（成功页会读它），但没有输入框；
                    产品屏「申请体验」要把体验项目带过来，必须给它一个落点 */}
                <div>
                  <textarea
                    name="note"
                    aria-label="备注（选填）"
                    rows={3}
                    placeholder="备注（选填）：想体验哪个产品、期望时间、学校与专业规模…"
                    value={form.note}
                    onChange={set('note')}
                    className={`${inputCls} min-h-[84px] resize-none leading-relaxed`}
                  />
                </div>
                {fail && (
                  <div className="rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/[0.06] px-4 py-3 text-[13px] leading-relaxed text-[#B91C1C]">
                    {fail}也可以直接
                    <a href={`tel:${phone.replace(/[^\d]/g, '')}`} className="mx-1 font-medium underline">致电 {phone}</a>
                    或
                    <a href={`mailto:${email}`} className="mx-1 font-medium underline">邮件联系</a>。
                  </div>
                )}
                <button type="submit" disabled={busy} className="btn-dark group w-full justify-center disabled:cursor-not-allowed disabled:opacity-70">
                  {busy ? '提交中…' : '提交，获取专属方案'}
                  {!busy && <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
                </button>
                <p className="text-center text-[11px] leading-relaxed text-ink-400">
                  提交即表示同意《隐私政策》，我们承诺信息仅用于方案沟通
                </p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
