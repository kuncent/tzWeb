import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { Check, Hammer } from 'lucide-react'
import chinaJson from '../../data/china.json'
import { clientLogos } from '../../data/pages'

/* ============================================================
 * 中国地图（Apache ECharts · 浅色 · 无边界 · 3D 状态徽标 + 舞台投影）
 * ------------------------------------------------------------
 * 真实省份轮廓（geo）用极淡蓝底 + 细描边 + 柔投影，安静地浮在浅色背景上。
 * ECharts 只负责底图与城市名标签（透明点做定位锚，silent 不吃事件）。
 * 真正可交互的「状态徽标」是一层 HTML overlay，用 chart.convertToPixel
 * 把经纬度折算成像素后绝对定位。徽标是干净的 2D 扁平圆形状态标：
 *   ① 已部署：品牌蓝圆标 + 对勾
 *   ② 建设中：琥珀圆标 + 锤子抬手敲打 + 外圈脉冲 —— 读作“正在施工”
 * 悬停任意徽标 → 从徽标处打出一道光锥（mapBeam），并把院校信息的全息板
 * （mapProj，含放大的院校 logo）沿透视“投”到光锥末端，像舞台追光投影；
 * 靠近地图顶部的城市光锥朝下投影，避免溢出。prefers-reduced-motion 下
 * 全部静止（不漂浮、不脉冲、投影瞬时出现）。组件懒加载，只在 08 进入视口时挂载。
 * ============================================================ */

let registered = false
function ensureMap() {
  if (!registered) {
    echarts.registerMap('china', chinaJson)
    registered = true
  }
}

/* 院校名 → logo 图（与 Cases 客户墙 / 产业 logo 带同源，25 所全覆盖） */
const SCHOOL_LOGO = Object.fromEntries(clientLogos.map((l) => [l.name, l.img]))

function buildOption(cities, reduced, dark) {
  const data = cities.map((c, i) => ({ name: c.city, value: [c.lng, c.lat], __i: i, status: c.status }))

  return {
    backgroundColor: 'transparent',
    animation: !reduced,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    geo: {
      map: 'china',
      roam: false,
      zoom: 1.18,
      center: [104.5, 35.0],
      label: { show: false },
      itemStyle: {
        areaColor: dark ? '#0e1a2e' : '#e9f1fb',
        borderColor: dark ? 'rgba(125,169,255,0.22)' : '#cdddf2',
        borderWidth: 1,
        shadowColor: dark ? 'rgba(0,0,0,0.45)' : 'rgba(40,90,170,0.12)',
        shadowBlur: 18,
        shadowOffsetY: 10,
      },
      emphasis: { label: { show: false }, itemStyle: { areaColor: dark ? '#16273f' : '#dbe9fb' } },
      select: { disabled: true },
    },
    series: [
      {
        // 透明点仅做城市名标签的锚；交互全部交给上层 HTML 徽标，故 silent
        name: 'cities',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        silent: true,
        symbolSize: 30,
        itemStyle: { color: 'rgba(0,0,0,0)' },
        label: {
          show: true,
          formatter: '{b}',
          position: 'right',
          offset: [16, 0],
          color: dark ? '#9fb6d9' : '#334155',
          fontSize: 13,
          fontWeight: 600,
          textShadowColor: dark ? 'rgba(4,7,13,0.7)' : '#ffffff',
          textShadowBlur: 4,
        },
        // 苏皖一带城市密集，常显名称会互压；重叠时自动隐藏标签（徽标保留，悬停看详情）
        labelLayout: { hideOverlap: true },
        data,
      },
    ],
  }
}

/* 2D 状态徽标 + 舞台投影。x/y 为 convertToPixel 得到的容器内像素坐标。
   徽标是干净的扁平圆形状态标（已部署蓝 / 建设中琥珀 + 图标）；
   悬停 → 从徽标打出一道光锥，把院校信息的全息板“投”到光锥末端（logo 放大）。 */
function CityPin({ city, x, y, status, schools, on, hovered, anyHover, onHover, reduced, onSelect, dark }) {
  const building = status === 'building'
  // 徽标靠近顶部时光锥朝下投影，避免全息板溢出地图顶部
  const above = y > 150
  // 悬停该城 → 投影；轮播选中该城且当前未悬停任何徽标 → 也投影（“模拟点击”轮播效果）
  const show = hovered || (on && !anyHover)

  const accent = '#1677ff'
  const soft = 'rgba(22,119,255,'

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ transform: `translate(${x}px, ${y}px)`, zIndex: hovered ? 40 : on ? 12 : 6 }}
    >
      {/* ―― 舞台投影：光锥 + 全息板（含放大的院校 logo）―― */}
      {show && (
        <div
          className="absolute left-0 top-0 flex flex-col items-center"
          style={{
            transform: above ? 'translate(-50%, calc(-100% - 14px))' : 'translate(-50%, 14px)',
            flexDirection: above ? 'column' : 'column-reverse',
          }}
        >
          {/* 全息板：从光锥末端沿透视“立起来”投出 */}
          <div
            className={reduced ? '' : 'animate-[mapProj_0.36s_cubic-bezier(0.2,0.7,0.3,1)_both]'}
            style={{ transformOrigin: above ? 'bottom center' : 'top center' }}
          >
            <div
              className={`relative w-[250px] overflow-hidden rounded-2xl border backdrop-blur-md ${dark ? 'bg-[#0b1424]/95 shadow-[0_20px_55px_rgba(0,0,0,0.55)]' : 'bg-white/92 shadow-[0_20px_55px_rgba(11,18,32,0.22)]'}`}
              style={{ borderColor: soft + '0.4)' }}
            >
              {/* 顶部状态光条 */}
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${soft}0))` }} />
              {/* 投影扫描线 */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.05]"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, #0b1220 0, #0b1220 1px, transparent 1px, transparent 3px)' }}
              />
              {/* 头部：城市 + 状态 */}
              <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
                <span className={`text-[16px] font-bold tracking-tight ${dark ? 'text-white' : 'text-ink-900'}`}>{city}</span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                  style={{ color: '#8ad0ff', background: 'rgba(22,119,255,0.12)' }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
                  {building ? '建设中' : '已部署'}
                </span>
              </div>
              {/* 院校：大 logo + 名称 */}
              <ul className="flex flex-col gap-3 px-4 pb-4 pt-1">
                {(schools || []).map((s) => (
                  <li key={s} className="flex items-center gap-3">
                    <span className={`grid h-14 w-[92px] shrink-0 place-items-center overflow-hidden rounded-xl border bg-white px-2 shadow-inner ${dark ? 'border-white/10' : 'border-ink-900/[0.08]'}`}>
                      {SCHOOL_LOGO[s] ? (
                        <img src={SCHOOL_LOGO[s]} alt={s} decoding="async" className="max-h-12 w-auto max-w-[80px] object-contain" />
                      ) : (
                        <span className="h-3 w-3 rounded-full bg-brand" />
                      )}
                    </span>
                    <span className={`text-[13.5px] font-medium leading-snug ${dark ? 'text-white/85' : 'text-ink-800'}`}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* 光锥：从徽标处（窄）张到全息板（宽），源端亮、末端淡 */}
          <div
            className={reduced ? '' : 'animate-[mapBeam_0.3s_ease-out_both]'}
            style={{ transformOrigin: above ? 'bottom center' : 'top center', width: 216, height: 46 }}
          >
            <div
              className="h-full w-full"
              style={{
                clipPath: above ? 'polygon(0% 0%, 100% 0%, 63% 100%, 37% 100%)' : 'polygon(37% 0%, 63% 0%, 100% 100%, 0% 100%)',
                background: above
                  ? `linear-gradient(to top, ${soft}0.55), ${soft}0)`
                  : `linear-gradient(to bottom, ${soft}0.55), ${soft}0)`,
                filter: 'blur(5px)',
              }}
            />
          </div>
        </div>
      )}

      {/* ―― 2D 扁平状态徽标（干净圆形，hover 轻微放大）―― */}
      <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
        <span
          className="grid h-7 w-7 place-items-center rounded-full transition-transform duration-200 ease-out"
          style={{
            background: building ? 'rgba(22,119,255,0.16)' : accent,
            color: building ? '#8ad0ff' : '#fff',
            border: building ? '1.5px solid rgba(125,169,255,0.6)' : '1.5px solid transparent',
            boxShadow: building ? 'none' : '0 2px 10px rgba(22,119,255,0.45)',
            transform: hovered ? 'scale(1.18)' : 'scale(1)',
          }}
        >
          {building ? (
            <Hammer
              className={`h-4 w-4 ${reduced ? '' : 'origin-bottom-right animate-[hammer_1.35s_ease-in-out_infinite]'}`}
              strokeWidth={2.4}
            />
          ) : (
            <Check className="h-4 w-4" strokeWidth={3} />
          )}
        </span>
      </div>

      {/* ―― 命中区（比立体牌大，方便悬停）+ 选中环 / 施工脉冲 ―― */}
      <div
        className="pointer-events-auto absolute left-0 top-0 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        onClick={() => onSelect?.()}
        tabIndex={0}
        role="button"
        aria-label={`${city} · ${(schools || []).length} 所院校`}
      >
        {on && (
          <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand/60" />
        )}
        {building && !reduced && (
          <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pingslow rounded-full bg-brand/40" />
        )}
      </div>
    </div>
  )
}

export default function ChinaMap({ cities, active, onSelect, reduced, dark }) {
  const elRef = useRef(null)
  const chartRef = useRef(null)
  const [pts, setPts] = useState([])
  const [hoveredI, setHoveredI] = useState(null)

  // 经纬度 → 容器内像素（徽标 overlay 用）。地图不 roam，只有尺寸变化时坐标才动。
  const measure = () => {
    const chart = chartRef.current
    if (!chart) return
    const next = cities.map((c, i) => {
      const px = chart.convertToPixel({ seriesIndex: 0 }, [c.lng, c.lat])
      return px ? { key: c.city, city: c.city, x: px[0], y: px[1], status: c.status, schools: c.schools, i } : null
    })
    setPts(next.filter(Boolean))
  }

  useEffect(() => {
    ensureMap()
    // 预热各城院校 logo：投影面板只在悬停时才挂载，若不提前进缓存，首次悬停会现拉现解码而“闪一下”。
    ;(cities || []).forEach((c) =>
      (c.schools || []).forEach((s) => {
        const src = SCHOOL_LOGO[s]
        if (src) {
          const im = new Image()
          im.src = src
        }
      })
    )
    const el = elRef.current
    if (!el) return
    let chart = null
    let entryTimer = 0

    /* 与 HeroCoverage 同一防线：容器 0×0 时不 init / resize，否则 zrender 在
       0 尺寸图层上跑动画会抛 InvalidStateError（rAF 异步错，错误边界接不住 → 黑屏）。 */
    const hasSize = () => el.clientWidth > 0 && el.clientHeight > 0
    const start = () => {
      if (chart || !hasSize()) return
      const prev = echarts.getInstanceByDom(el)
      if (prev) prev.dispose()
      chart = echarts.init(el, null, { renderer: 'canvas' })
      chartRef.current = chart
      chart.setOption(buildOption(cities, reduced, dark))
      measure()
      // 入场动画结束后再量一次，确保 convertToPixel 落在最终布局上
      entryTimer = setTimeout(measure, 400)
    }
    start()
    const ro = new ResizeObserver(() => {
      if (!chart) { start(); return }
      if (hasSize()) chart.resize()
      measure()
    })
    ro.observe(el)
    return () => {
      clearTimeout(entryTimer)
      ro.disconnect()
      if (chart) chart.dispose()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative h-full w-full">
      <div ref={elRef} className="h-full w-full" />
      {/* 徽标层：底图 canvas 在上层不吞事件，命中区各自 pointer-events-auto */}
      <div className="pointer-events-none absolute inset-0">
        {pts.map((pt) => (
          <CityPin
            key={pt.key}
            city={pt.city}
            x={pt.x}
            y={pt.y}
            status={pt.status}
            schools={pt.schools}
            on={pt.i === active}
            hovered={hoveredI === pt.i}
            anyHover={hoveredI != null}
            onHover={(v) => setHoveredI(v ? pt.i : null)}
            reduced={reduced}
            dark={dark}
            onSelect={() => onSelect?.(pt.i)}
          />
        ))}
      </div>
    </div>
  )
}
