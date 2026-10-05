import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, Mail, Phone } from 'lucide-react'
import { BrandLockup } from './Brand'
import { footerNav, brand, contact, nav } from '../data/site'
import { useContent, useSectionsMap } from '../lib/contentStore'

export default function Footer() {
  const navigate = useNavigate()
  /* 联系方式接运行时覆盖层：后台改了就用新的，取不到回落 site.js 默认 */
  const phone = useContent('contact.phone', contact.phone)
  const email = useContent('contact.email', contact.email)
  const address = useContent('contact.address', contact.address)
  /* 后台关掉某屏后，页脚里指向它的首页锚点（/#problems 等）一并隐去，避免死链 */
  const sections = useSectionsMap()
  const anchorOff = (to) => {
    const m = /^\/#([a-z]+)$/.exec(to || '')
    return m && sections[m[1]]?.enabled === false
  }
  return (
    <footer className="bg-[#0A0E16] text-white">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr_1fr]">
          {/* 品牌 */}
          <div>
            <BrandLockup tone="dark" />
            <p className="mt-5 max-w-xs text-xs leading-relaxed text-white/45">
              {brand.positioning}。为高校提供 AI 多智能体课堂、自然语言实验平台与数字孪生实验室的全栈未来教育基础设施。
            </p>
            {/* 社交位不装样：只有这三条是真的能拨出去 / 发出去 / 落到联系屏 */}
            <div className="mt-6 flex items-center gap-3">
              {[
                { Icon: MessageCircle, label: '在线咨询', to: '/#contact' },
                { Icon: Phone, label: '致电方案顾问', href: `tel:${phone.replace(/-/g, '')}` },
                { Icon: Mail, label: '发送邮件', href: `mailto:${email}` },
              ].map(({ Icon, label, to, href }) => {
                const cls = 'grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70 transition-all duration-300 hover:border-white/40 hover:bg-white/10 hover:text-white'
                return to ? (
                  <Link key={label} to={to} aria-label={label} title={label} className={cls}>
                    <Icon className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <a key={label} href={href} aria-label={label} title={label} className={cls}>
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* 多列链接 */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((col) => {
              const links = col.links.filter((l) => !anchorOff(l.to))
              if (!links.length) return null
              return (
              <div key={col.title}>
                <h4 className="text-xs font-semibold tracking-wider text-white/70">{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="text-[13px] text-white/45 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              )
            })}
          </div>

          {/* 联系 */}
          <div>
            <h4 className="text-xs font-semibold tracking-wider text-white/70">联系我们</h4>
            <div className="mt-4 space-y-3 text-[13px] text-white/45">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                {phone}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                {email}
              </div>
              <div className="leading-relaxed">{address}</div>
            </div>
            <button
              onClick={() => navigate('/#contact')}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-[13px] font-medium text-white transition-all duration-300 hover:bg-white/20"
            >
              预约产品演示
            </button>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/[0.08] pt-6">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-xs text-white/35 transition-colors hover:text-white/70">
              {n.label}
            </Link>
          ))}
          <span className="ml-auto text-xs text-white/35">© 2026 {brand.name} · {brand.en}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
