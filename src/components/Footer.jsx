import { Link, useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle, Mail, Phone } from 'lucide-react'
import { BrandLockup } from './Brand'
import { footerNav, brand, contact, nav } from '../data/site'
import { PRODUCTS } from '../data/vocabulary'
import { useContent } from '../lib/contentStore'

/* ―― 页脚深色基调随所在页切换 ――
   让页脚与每页的深色模块同族，整页（含页脚）读作一套色系。
   值即 index.css 里对应 token 的等值，只是按路由在 <footer> 上作用域覆盖，
   子层仍用 var() 取用（React 支持 style 对象里的 CSS 自定义属性）。 */
const FOOTER_TONES = {
  /* 近黑 night：首页 3D 首屏 / 产品矩阵同一族 */
  night: {
    '--gradient-theme-deep': 'linear-gradient(180deg, #06080d 0%, #070e1d 25%, #0a1730 60%, #0b1934 82%, #070f1f 100%)',
    '--gradient-theme-seam': 'linear-gradient(90deg, transparent, rgba(127,184,255,0.5) 30%, rgba(37,212,255,0.42) 70%, transparent)',
    '--theme-halo': 'rgba(47,123,255,0.2)',
    '--theme-halo-cyan': 'rgba(37,212,255,0.15)',
    '--theme-halo-blue': 'rgba(62,139,255,0.13)',
  },
  /* 曜石靛蓝：设备页 HeroBackdrop / 关于页冷调 */
  indigo: {
    '--gradient-theme-deep': 'linear-gradient(180deg, #0a0e22 0%, #0e1430 26%, #141b3d 60%, #101838 82%, #0a0f24 100%)',
    '--gradient-theme-seam': 'linear-gradient(90deg, transparent, rgba(147,180,255,0.5) 30%, rgba(34,211,238,0.42) 70%, transparent)',
    '--theme-halo': 'rgba(75,107,255,0.22)',
    '--theme-halo-cyan': 'rgba(34,211,238,0.15)',
    '--theme-halo-blue': 'rgba(124,108,255,0.13)',
  },
  /* 墨蓝冰：解决方案 HeroBackdropIce */
  ice: {
    '--gradient-theme-deep': 'linear-gradient(180deg, #0a1a2e 0%, #0f2642 34%, #14325a 68%, #10294b 85%, #0a1a2e 100%)',
    '--gradient-theme-seam': 'linear-gradient(90deg, transparent, rgba(111,212,255,0.5) 30%, rgba(37,212,255,0.42) 70%, transparent)',
    '--theme-halo': 'rgba(47,123,255,0.2)',
    '--theme-halo-cyan': 'rgba(37,212,255,0.18)',
    '--theme-halo-blue': 'rgba(111,212,255,0.12)',
  },
}

/* 路由 → 基调。未列出的页（cases/partnership 等浅色页与 fallback 路由）走 night。 */
const ROUTE_TONE = {
  '/': 'night',
  '/products': 'night',
  /* 设备页底部提示条是近黑 night，页脚归 night 才与该板块无缝（靛蓝只留首屏） */
  '/devices': 'night',
  '/about': 'indigo',
  '/solutions': 'ice',
}

export default function Footer() {
  const navigate = useNavigate()
  const location = useLocation()
  /* 页脚基调跟随当前页的深色模块；未命中的路由缺省 night。 */
  const tone = FOOTER_TONES[ROUTE_TONE[location.pathname] || 'night']
  /* 联系方式接运行时覆盖层：后台改了就用新的，取不到回落 site.js 默认 */
  const phone = useContent('contact.phone', contact.phone)
  const email = useContent('contact.email', contact.email)
  const address = useContent('contact.address', contact.address)
  return (
    <footer className="relative overflow-hidden text-white" style={tone}>
      {/* ―― 底色：纵向四段深色，基调按所在页切换（见 FOOTER_TONES / ROUTE_TONE）――
          近黑页（首页 / 产品体系）走 night 蓝黑，靛蓝页（设备 / 关于）走曜石靛蓝，
          解决方案走墨蓝冰——页脚与本页深色模块同族，整页读作一套色系。
          顶部接住上方暗底、往下抬一档再收，靠明度分层取纵深，而非死黑一片。 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--gradient-theme-deep)' }}
      />
      {/* 顶部接缝：一条冷光横线 + 一团向下散开的辉光。
          横线是“接缝”，辉光是首屏机位的光继续漏下来，滚动时不会突然换底 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: 'var(--gradient-theme-seam)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-[86%] -translate-x-1/2"
        style={{ background: 'radial-gradient(55% 100% at 50% 0%,var(--theme-halo),transparent 72%)' }}
      />
      {/* 网格与两团环境光：给深色一层“空间”，压得很轻，不抢文字。
          56px 与首屏的 3D 地格同一步长，视觉重心不会跳 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right,var(--theme-grid-line) 1px,transparent 1px),linear-gradient(to bottom,var(--theme-grid-line) 1px,transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(82% 62% at 50% 0%,black,transparent 78%)',
          WebkitMaskImage: 'radial-gradient(82% 62% at 50% 0%,black,transparent 78%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-[-140px] h-[440px] w-[540px] rounded-full"
        style={{ background: 'radial-gradient(closest-side,var(--theme-halo-cyan),transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-44 bottom-[-180px] h-[440px] w-[540px] rounded-full"
        style={{ background: 'radial-gradient(closest-side,var(--theme-halo-blue),transparent)' }}
      />

      <div className="container-x relative py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr_1fr]">
          {/* 品牌 */}
          <div>
            <BrandLockup tone="dark" />
            <p className="mt-5 max-w-xs text-[12.5px] leading-[1.9] text-white/62">
              {brand.positioning}。为高校提供{PRODUCTS.map((p) => p.short).join('、')}五大产品体系，全栈私有化交付。
            </p>
            {/* 社交位不装样：只有这三条是真的能拨出去 / 发出去 / 落到联系屏 */}
            <div className="mt-6 flex items-center gap-3">
              {[
                { Icon: MessageCircle, label: '在线咨询', to: '/about#contact' },
                { Icon: Phone, label: '致电方案顾问', href: `tel:${phone.replace(/-/g, '')}` },
                { Icon: Mail, label: '发送邮件', href: `mailto:${email}` },
              ].map(({ Icon, label, to, href }) => {
                const cls = 'grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/72 transition-all duration-300 hover:border-accent-ice/50 hover:bg-accent-ice/10 hover:text-white'
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

          {/* 多列链接：一块浅玻璃托住四列。
              上一版四列直接挂在黑底上，标题和链接同亮度、行距又紧，
              读起来是一片压在一起的灰字。现在有了卡片边界、行 hover 和更亮的标题 */}
          <div className="rounded-2xl border border-accent-line bg-accent-soft p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(92px,1fr))]">
              {footerNav.map((col) => {
                return (
                  <div key={col.title}>
                    <h4 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-white/85">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-accent-ice shadow-[0_0_8px_var(--theme-ice-glow)]" />
                      {col.title}
                    </h4>
                    <ul className="mt-3.5 space-y-0.5">
                      {col.links.map((l) => (
                        <li key={l.label}>
                          <Link
                            to={l.to}
                            className="-mx-2 block rounded-md px-2 py-1.5 text-[13px] leading-relaxed text-white/62 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 联系：做成一块更亮的玻璃卡，把页脚里唯一“要动作”的内容提出来 */}
          <div className="rounded-2xl border border-accent-line-strong bg-accent-soft-strong p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <h4 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-white/85">
              <span className="h-1 w-1 shrink-0 rounded-full bg-accent-ice shadow-[0_0_8px_var(--theme-ice-glow)]" />
              联系我们
            </h4>
            <div className="mt-4 space-y-3 text-[13px] text-white/66">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-accent-ice/75" />
                {phone}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-accent-ice/75" />
                {email}
              </div>
              <div className="leading-relaxed">{address}</div>
            </div>
            <button
              onClick={() => navigate('/about#contact')}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-accent-ink transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
              style={{ background: 'var(--gradient-theme-cta)', boxShadow: 'var(--shadow-theme-cta)' }}
            >
              预约产品演示
            </button>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/[0.08] pt-6 shadow-[0_-1px_0_0_rgba(127,184,255,0.1)]">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-xs text-white/52 transition-colors hover:text-white">
              {n.label}
            </Link>
          ))}
          <span className="ml-auto text-xs text-white/48">© 2026 {brand.name} · {brand.en}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
