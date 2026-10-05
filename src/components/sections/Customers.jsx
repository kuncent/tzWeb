import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInView } from 'motion/react'
import { Hammer } from 'lucide-react'
import { Reveal, SectionHead } from '../ui'
import { customersHead } from '../../data/site'
import { clientLogos } from '../../data/pages'

/* ============================================================
 * 合作高校 —— 已交付院校分布（浅色 · 无边界 · 简洁）
 * ------------------------------------------------------------
 * 只保留两件事：左侧一张安静的 ECharts 中国地图（真实省份 + 比例圆点，
 * 圆点大小 = 该城院校数），右侧一块无边框的详情看板。
 * 点地图圆点 或 点看板城市标签，共享 active 状态双向联动。整屏铺满、留白充足。
 * ============================================================ */

const ChinaMap = lazy(() => import('./ChinaMap'))

/* 产业客户（金融机构）：与 Cases 页客户墙同源，不属于“院校地图”，
   故单独一条 logo 带体现，不混进合作高校地图。 */
const CORPS = clientLogos.filter((l) => l.kind === 'corp')

/* 重点交付城市（与 Cases 页「客户墙」的 25 所真实高校同源，按城市分组 + 真实经纬度）
   status：已交付的多为 deployed，挑 4 个较新市场标 building 以体现锤子施工动画 */
const CITIES = [
  { city: '北京', lng: 116.4, lat: 39.9, status: 'deployed', schools: ['清华大学'] },
  { city: '上海', lng: 121.47, lat: 31.23, status: 'deployed', schools: ['上海立信会计金融学院', '上海杉达学院'] },
  { city: '深圳', lng: 114.06, lat: 22.55, status: 'deployed', schools: ['深圳职业技术大学', '深圳大学', '深圳信息职业技术学院', '深圳市龙岗区第二职业技术学校'] },
  { city: '广州', lng: 113.26, lat: 23.13, status: 'deployed', schools: ['广东金融学院', '广东第二师范学院'] },
  { city: '福州', lng: 119.3, lat: 26.08, status: 'deployed', schools: ['福建师范大学', '阳光学院', '福州墨尔本理工职业学院'] },
  { city: '南京', lng: 118.8, lat: 32.06, status: 'deployed', schools: ['南京师范大学'] },
  { city: '合肥', lng: 117.28, lat: 31.86, status: 'deployed', schools: ['合肥师范学院', '安徽建筑大学'] },
  { city: '天津', lng: 117.2, lat: 39.13, status: 'deployed', schools: ['南开大学'] },
  { city: '长沙', lng: 112.94, lat: 28.23, status: 'deployed', schools: ['中南大学'] },
  { city: '成都', lng: 104.07, lat: 30.67, status: 'building', schools: ['西南财经大学'] },
  { city: '郑州', lng: 113.63, lat: 34.75, status: 'building', schools: ['郑州大学'] },
  { city: '青岛', lng: 120.38, lat: 36.07, status: 'building', schools: ['青岛大学'] },
  { city: '苏州', lng: 120.58, lat: 31.3, status: 'building', schools: ['苏州大学'] },
  { city: '南宁', lng: 108.37, lat: 22.82, status: 'deployed', schools: ['广西金融职业技术学院'] },
  { city: '徐州', lng: 117.28, lat: 34.26, status: 'deployed', schools: ['江苏师范大学'] },
  { city: '滁州', lng: 118.32, lat: 32.3, status: 'deployed', schools: ['滁州学院'] },
  { city: '六安', lng: 116.51, lat: 31.74, status: 'deployed', schools: ['皖西学院'] },
]

const STATUS = {
  deployed: { label: '已部署', color: '#1677ff' },
  building: { label: '建设中', color: '#f59e0b' },
}

/* 与地图上同款的状态徽标（内联 SVG，供图例 / 看板复用） */
function DeployIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" fill="#1677ff" />
      <path d="M7.4 12.3l3 3 6.2-6.7" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function BuildIcon({ className = '' }) {
  return (
    <span className={`grid place-items-center rounded-full bg-[#f59e0b] text-white ${className}`} aria-hidden>
      <Hammer className="h-[64%] w-[64%]" strokeWidth={2.4} />
    </span>
  )
}

export default function Customers() {
  const [active, setActive] = useState(0)
  const mapWrapRef = useRef(null)
  const mapInView = useInView(mapWrapRef, { once: true, margin: '160px' })
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const cur = CITIES[active]

  return (
    <section id="customers" className="relative overflow-hidden bg-gradient-to-b from-white to-mist-100 sec-y">
      {/* 极淡的品牌色氛围，地图后方一团柔光，保持干净 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.07),transparent_75%)]" />

      <div className="relative z-10 container-x">
        <SectionHead
          id="customers" n="08"
          en={customersHead.en}
          zh={customersHead.zh}
          sub={customersHead.sub}
          action={{ to: '/cases', children: '看完整案例墙' }}
        />

        <div className="mt-6 grid items-center gap-x-12 gap-y-8 lg:grid-cols-[1.55fr_1fr]">
          {/* ―― 左：中国地图（无边界，直接浮在浅色背景上）―― */}
          <Reveal>
            <div>
              <div ref={mapWrapRef} className="relative h-[400px] w-full sm:h-[480px] lg:h-[560px]">
                {mapInView && (
                  <Suspense fallback={<div className="grid h-full w-full place-items-center text-[13px] text-ink-400">地图加载中…</div>}>
                    <ChinaMap cities={CITIES} active={active} onSelect={setActive} reduced={reduced} />
                  </Suspense>
                )}
              </div>
              {/* 状态图例 */}
              <div className="mt-1 flex items-center justify-center gap-7 text-[12.5px] text-ink-500">
                <span className="inline-flex items-center gap-1.5">
                  <DeployIcon className="h-4 w-4" />
                  已部署
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BuildIcon className="h-4 w-4" />
                  建设中
                </span>
              </div>
            </div>
          </Reveal>

          {/* ―― 右：无边框详情看板 ―― */}
          <Reveal delay={0.08}>
            <div className="max-w-md">
              {/* 当前城市 */}
              <div className="flex items-center gap-3">
                <span className="h-5 w-[3px] rounded-full bg-brand" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-400">当前城市 · Detail</span>
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <h3 className="text-[34px] font-bold leading-none tracking-tight text-ink-900">{cur.city}</h3>
                <span className="text-[14px] font-medium text-brand">{cur.schools.length} 所院校</span>
              </div>
              <div className="mt-3.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                  style={{ color: STATUS[cur.status].color, background: cur.status === 'deployed' ? 'rgba(22,119,255,0.10)' : 'rgba(245,158,11,0.12)' }}
                >
                  {cur.status === 'deployed' ? <DeployIcon className="h-3.5 w-3.5" /> : <BuildIcon className="h-3.5 w-3.5" />}
                  {STATUS[cur.status].label}
                </span>
              </div>
              <ul className="mt-5 space-y-3">
                {cur.schools.map((s) => (
                  <li key={s} className="flex items-center gap-3 text-[15px] text-ink-800">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {s}
                  </li>
                ))}
              </ul>

              {/* 城市切换（点标签 → 地图对应圆点高亮） */}
              <div className="mt-8">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-400">选择城市</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CITIES.map((m, i) => {
                    const on = i === active
                    return (
                      <button
                        key={m.city}
                        type="button"
                        onClick={() => setActive(i)}
                        aria-pressed={on}
                        className={`rounded-full px-4 py-2 text-[13.5px] font-medium transition-all duration-300 ${
                          on ? 'bg-brand text-white shadow-glow' : 'bg-ink-900/[0.05] text-ink-500 hover:bg-ink-900/[0.09]'
                        }`}
                      >
                        {m.city}
                        <span className={`ml-1.5 text-[12px] tabular-nums ${on ? 'text-white/80' : 'text-ink-400'}`}>{m.schools.length}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <span className="mt-8 block h-px w-full bg-ink-900/10" />

              {/* 概览数字 */}
              <div className="mt-6 flex items-center gap-9">
                <div>
                  <div className="text-[26px] font-bold leading-none tracking-tight text-ink-900">100+</div>
                  <div className="mt-1.5 text-[12.5px] text-ink-500">合作高校</div>
                </div>
                <div>
                  <div className="text-[26px] font-bold leading-none tracking-tight text-ink-900">30+</div>
                  <div className="mt-1.5 text-[12.5px] text-ink-500">覆盖省市</div>
                </div>
                <div>
                  <div className="text-[26px] font-bold leading-none tracking-tight text-brand">{CITIES.length}</div>
                  <div className="mt-1.5 text-[12.5px] text-ink-500">重点城市</div>
                </div>
              </div>

              <Link to="/#contact" className="group mt-7 inline-flex items-center gap-2 text-[14px] font-medium text-brand transition-colors hover:text-ink-900">
                聊聊你所在的区域
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </Reveal>
        </div>

        {/* ―― 产业客户（金融机构）logo 带：与 Cases 页客户墙同源 ―― */}
        <Reveal delay={0.1} className="mt-12">
          <div className="flex flex-col gap-5 border-t border-ink-900/[0.07] pt-9">
            <div className="flex items-center gap-3">
              <span className="h-px w-6 bg-brand/40" />
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">产业客户 · 金融机构</h3>
              <span className="text-[12px] text-ink-400">{CORPS.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {CORPS.map((c) => (
                <div key={c.img} className="flex flex-col items-center justify-center rounded-2xl border border-ink-900/[0.07] bg-white p-4 shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift">
                  <div className="flex h-14 w-full items-center justify-center">
                    <img src={c.img} alt={c.name} loading="lazy" decoding="async" className="max-h-12 max-w-[80%] object-contain" />
                  </div>
                  <p className="mt-2.5 text-center text-[12.5px] leading-snug text-ink-500">{c.name}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
