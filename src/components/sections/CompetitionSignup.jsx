import { useEffect, useState } from 'react'
import { AlertCircle, Check, Clock, Loader2, Send } from 'lucide-react'

/* ============================================================
 * 大赛报名表
 * ------------------------------------------------------------
 * 提交链路：前端校验（学校 / 队长 / 手机号 / 4 名成员）→ POST /api/ai/lead，
 * 服务端持久化到 leads.jsonl（后台「线索」可见）。
 * 服务端只收 name / phone / org / region / role / product / note，
 * 队伍名、成员、指导教师、邮箱按约定压进 note（≤480 字）。
 * 表单按「学校 → 队长 → 成员 → 指导教师 → 备注」分区，输入框 14px / 高 44px，
 * 不用三列小格子，避免上一次那种拥挤感。
 * ============================================================ */

/* 表单按「学校 → 队长 → 成员 → 指导教师 → 备注」分区；
   放在白色卡里，分区用编号胶囊 + 虚线分隔，输入框浅底细边框。 */

/* 报名通道 2026-11-23 00:00（UTC+8）开启；开启前按钮显示倒计时并禁用 */
const OPEN_AT = new Date('2026-11-23T00:00:00+08:00').getTime()
const pad2 = (n) => String(n).padStart(2, '0')

const inputCls =
  'w-full rounded-[11px] border border-[#dbe3ee] bg-[#fbfdff] px-3.5 py-2.5 text-[14px] text-[#0b2038] outline-none transition-all placeholder:text-[#a9b6c7] focus:border-[#2f7fd1] focus:bg-white focus:ring-4 focus:ring-[#2f7fd1]/10'

const labelCls = 'mb-1.5 block text-[12.5px] font-semibold text-[#3c4f68]'

const EMPTY = {
  school: '',
  region: '',
  team: '',
  captain: '',
  phone: '',
  phone2: '',
  phone3: '',
  phone4: '',
  email: '',
  m2: '',
  m3: '',
  m4: '',
  a1: '',
  a2: '',
  extra: '',
}

function Fieldset({ num, title, hint, children }) {
  return (
    <div className="mt-9 border-t border-dashed border-[#dfe7f1] pt-7">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="rounded-[8px] bg-[linear-gradient(135deg,#fdf3dd,#fae9c4)] px-2.5 py-1 font-mono text-[11px] font-extrabold tracking-[0.08em] text-[#b0812f]">
          {num}
        </span>
        <h4 className="text-[16px] font-extrabold text-[#0b2038]">{title}</h4>
        {hint && <span className="ml-auto text-[12px] text-[#9aa8bb]">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function CompetitionSignup() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState('')
  const [done, setDone] = useState(false)
  const [hp, setHp] = useState('')
  const [openLeft, setOpenLeft] = useState(() => Math.max(0, OPEN_AT - Date.now()))
  const opened = openLeft <= 0

  useEffect(() => {
    if (opened) return
    const id = window.setInterval(() => {
      setOpenLeft((v) => (v <= 1000 ? 0 : v - 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [opened])

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy || !opened) return
    const err = {}
    if (!form.school.trim()) err.school = '请填写学校全称'
    if (!form.captain.trim()) err.captain = '请填写队长姓名'
    // 4 名成员（含队长）每人都要填手机号，且队内不能重复
    const phones = [
      ['phone', form.phone],
      ['phone2', form.phone2],
      ['phone3', form.phone3],
      ['phone4', form.phone4],
    ]
    for (const [k, v] of phones) {
      if (!/^1\d{10}$/.test((v || '').trim())) err[k] = '请输入正确的 11 位手机号'
    }
    const names = [form.captain, form.m2, form.m3, form.m4]
    if (names.some((n) => !(n || '').trim())) err.members = '请填齐 4 名参赛成员（含队长）'
    // 队内去重：手机号 / 姓名都不能重复
    const seenP = new Map()
    for (const [k, v] of phones) {
      const p = (v || '').trim()
      if (!p) continue
      if (seenP.has(p)) {
        err[k] = '该手机号与队内其他成员重复'
        err[seenP.get(p)] = '该手机号与队内其他成员重复'
      } else seenP.set(p, k)
    }
    const seenN = new Map()
    for (const [k, v] of [['captain', form.captain], ['m2', form.m2], ['m3', form.m3], ['m4', form.m4]]) {
      const n = (v || '').trim()
      if (!n) continue
      if (seenN.has(n)) err.members = '队内成员姓名重复，请核对'
      else seenN.set(n, k)
    }
    setErrors(err)
    if (Object.keys(err).length) return

    const members = [form.captain.trim(), form.m2.trim(), form.m3.trim(), form.m4.trim()]
    const advisors = [form.a1.trim(), form.a2.trim()].filter(Boolean)
    const parts = []
    if (form.team.trim()) parts.push(`队伍:${form.team.trim()}`)
    parts.push(`成员:${members.join('、')}`)
    if (advisors.length) parts.push(`指导:${advisors.join('、')}`)
    if (form.email.trim()) parts.push(`邮箱:${form.email.trim()}`)
    if (form.extra.trim()) parts.push(`备注:${form.extra.trim()}`)

    setBusy(true)
    setFail('')
    try {
      const res = await fetch('/api/ai/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.captain.trim(),
          phone: form.phone.trim(),
          phone2: form.phone2.trim(),
          phone3: form.phone3.trim(),
          phone4: form.phone4.trim(),
          org: form.school.trim(),
          region: form.region.trim(),
          role: '队长',
          product: '2026 数智财经大赛',
          note: parts.join(' | ').slice(0, 480),
          source: 'competition-2026',
          company_website: hp,
        }),
      })
      if (res.status === 422) {
        const j = await res.json().catch(() => null)
        if (j?.fields) {
          setErrors({ ...j.fields, school: j.fields.school || j.fields.org, captain: j.fields.name })
          return
        }
      }
      if (res.status === 429) {
        const j = await res.json().catch(() => null)
        setFail(j?.message || '提交过于频繁，请稍后再试。')
        return
      }
      if (!res.ok) throw new Error('submit failed')
      setDone(true)
    } catch {
      setFail('提交未成功，可能是网络或服务短暂不可用，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-[20px] border border-[#e3eaf3] bg-white px-7 py-10 text-center shadow-[0_30px_70px_-40px_rgba(11,32,56,0.5)] md:px-10">
        <span className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-[linear-gradient(135deg,#4ade80,#16a34a)] text-white shadow-[0_16px_34px_-14px_rgba(22,163,74,0.8)]">
          <Check className="h-9 w-9" strokeWidth={2.4} />
        </span>
        <h3 className="mt-6 text-[21px] font-extrabold tracking-tight text-[#0b2038]">报名信息已提交</h3>
        <p className="mx-auto mt-2.5 max-w-md text-[13.5px] leading-[1.9] text-[#5b6b82]">
          组委会将按您预留的手机号对接后续事宜。报名截止前如需修改队伍信息，可直接联系组委会老师。
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY)
            setDone(false)
          }}
          className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full bg-[#0b2038] px-6 py-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#123156]"
        >
          再提交一支队伍
          <span aria-hidden>→</span>
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="relative overflow-hidden rounded-[20px] border border-[#0b2038]/[0.06] bg-white p-6 shadow-[0_30px_70px_-40px_rgba(11,32,56,0.5)] md:p-10"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-[21px] font-extrabold tracking-tight text-[#0b2038]">报名表</h3>
        <span className="text-[12px] text-[#9aa8bb]">同一队伍提交一次即可</span>
      </div>
      <p className="mt-1.5 text-[12.5px] text-[#9aa8bb]">
        报名时间 2026.11.23 – 12.05 · 带 <span className="text-[#e2554f]">*</span> 为必填
      </p>

      <Fieldset num="01" title="院校与团队信息" hint="带 * 为必填">
        <div className="grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelCls}>
            学校全称 <span className="text-[#9a7220]">*</span>
          </span>
          <input
            value={form.school}
            onChange={set('school')}
            placeholder="例如：广东金融学院"
            className={inputCls}
            aria-invalid={!!errors.school}
          />
          {errors.school && <span className="mt-1.5 block text-[12px] text-red-500">{errors.school}</span>}
        </label>

        <label className="block">
          <span className={labelCls}>所在赛区 / 省份</span>
          <input value={form.region} onChange={set('region')} placeholder="例如：广东" className={inputCls} />
        </label>

        <label className="block">
          <span className={labelCls}>队伍名称</span>
          <input value={form.team} onChange={set('team')} placeholder="例如：数智先锋队" className={inputCls} />
        </label>
      </div>
      </Fieldset>

      <Fieldset num="02" title="队长信息">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>
              队长姓名（成员 01）<span className="text-[#9a7220]">*</span>
            </span>
            <input
              value={form.captain}
              onChange={set('captain')}
              placeholder="姓名"
              className={inputCls}
              aria-invalid={!!errors.captain}
            />
            {errors.captain && <span className="mt-1.5 block text-[12px] text-red-500">{errors.captain}</span>}
          </label>

          <label className="block">
            <span className={labelCls}>
              手机号 <span className="text-[#9a7220]">*</span>
            </span>
            <input
              value={form.phone}
              onChange={set('phone')}
              inputMode="tel"
              placeholder="11 位手机号"
              className={inputCls}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <span className="mt-1.5 block text-[12px] text-red-500">{errors.phone}</span>}
          </label>

          <label className="block sm:col-span-2">
            <span className={labelCls}>电子邮箱</span>
            <input
              value={form.email}
              onChange={set('email')}
              type="email"
              placeholder="用于接收赛事通知"
              className={inputCls}
            />
          </label>
        </div>
      </Fieldset>

      <Fieldset num="03" title="团队成员" hint="含队长共 4 名 · 每人都需填写手机号">
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            ['m2', 'phone2', '成员 02'],
            ['m3', 'phone3', '成员 03'],
            ['m4', 'phone4', '成员 04'],
          ].map(([nk, pk, label]) => (
            <div key={nk} className="contents">
              <label className="block">
                <span className={labelCls}>
                  {label} 姓名 <span className="text-[#9a7220]">*</span>
                </span>
                <input
                  value={form[nk]}
                  onChange={set(nk)}
                  placeholder="姓名"
                  className={inputCls}
                  aria-invalid={!!errors.members}
                />
              </label>
              <label className="block">
                <span className={labelCls}>
                  {label} 手机号 <span className="text-[#9a7220]">*</span>
                </span>
                <input
                  value={form[pk]}
                  onChange={set(pk)}
                  inputMode="tel"
                  placeholder="11 位手机号"
                  className={inputCls}
                  aria-invalid={!!errors[pk]}
                />
                {errors[pk] && <span className="mt-1.5 block text-[12px] text-red-500">{errors[pk]}</span>}
              </label>
            </div>
          ))}
        </div>
        {errors.members && <span className="mt-2 block text-[12px] text-red-500">{errors.members}</span>}
      </Fieldset>

      <Fieldset num="04" title="指导教师" hint="1–2 名 · 可选">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] text-ink-500">指导教师 01</span>
            <input value={form.a1} onChange={set('a1')} placeholder="姓名" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] text-ink-500">指导教师 02</span>
            <input value={form.a2} onChange={set('a2')} placeholder="可不填" className={inputCls} />
          </label>
        </div>
      </Fieldset>

      <Fieldset num="05" title="备注" hint="可选">
        <textarea
          value={form.extra}
          onChange={set('extra')}
          rows={3}
          placeholder="跨专业组队情况、训练账号需求等，可留空"
          className={`${inputCls} resize-none`}
        />
      </Fieldset>

      {/* 蜜罐：真人不填 */}
      <input
        type="text"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {fail && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-500/15 bg-red-500/[0.04] px-4 py-3 text-[12.5px] leading-relaxed text-red-600">
          <AlertCircle className="mt-[2px] h-4 w-4 shrink-0" />
          {fail}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !opened}
        className={
          opened
            ? 'mt-9 flex w-full items-center justify-center gap-2.5 rounded-[13px] bg-[linear-gradient(135deg,#f9e2b4,#e8b863_55%,#cf9c37)] px-8 py-4 text-[16px] font-extrabold text-[#241704] shadow-[0_18px_36px_-16px_rgba(232,184,99,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_46px_-16px_rgba(232,184,99,1)] disabled:cursor-not-allowed disabled:opacity-60'
            : 'mt-9 flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-[13px] border border-[#dbe3ee] bg-[#eef3f9] px-8 py-4 text-[15px] font-bold tabular-nums text-[#7b8a9d]'
        }
      >
        {opened ? (
          busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
        {opened
          ? busy
            ? '提交中…'
            : '提交报名'
          : `距报名开放 ${pad2(Math.floor(openLeft / 3600000))}:${pad2(Math.floor((openLeft % 3600000) / 60000))}:${pad2(Math.floor((openLeft % 60000) / 1000))}`}
      </button>
      <p className="mt-3 text-center text-[11.5px] leading-relaxed text-[#9aa8bb]">
        {opened
          ? '提交即表示团队信息真实有效，组委会将按预留方式联系。'
          : '报名通道 2026 年 11 月 23 日 00:00 开启，现在可先填写信息，开启后即可提交。'}
      </p>
    </form>
  )
}
