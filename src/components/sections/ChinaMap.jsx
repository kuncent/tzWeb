import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { Check, Hammer } from 'lucide-react'
import chinaJson from '../../data/china.json'

/* ============================================================
 * 中国地图（Apache ECharts · 浅色 · 无边界 · 动态状态图标）
 * ------------------------------------------------------------
 * 真实省份轮廓（geo）用极淡蓝底 + 细描边 + 柔投影，安静地浮在浅色背景上。
 * ECharts 只负责三件事：省份底图、悬停 tooltip、点击/标签（城市点用透明
 * symbol 做命中区 + 名称标签）。真正的「状态图标」是一层 pointer-events:none
 * 的 HTML overlay，用 chart.convertToPixel 把经纬度折算成像素后绝对定位：
 *   ① 已部署：品牌蓝对勾徽标，静态稳重
 *   ② 建设中：琥珀色锤子徽标，锤头抬起再下击（敲打）+ 外圈脉冲 —— 读作“正在施工”
 * 图标是真实内联 SVG / lucide，CSS 动画能跑（ECharts 的 image symbol 里动画不执行）；
 * prefers-reduced-motion 下全部静止。组件懒加载，只在 08 进入视口时挂载。
 * ============================================================ */

let registered = false
function ensureMap() {
  if (!registered) {
    echarts.registerMap('china', chinaJson)
    registered = true
  }
}

function buildOption(cities, reduced) {
  const byCity = Object.fromEntries(cities.map((c) => [c.city, c.schools]))
  const data = cities.map((c, i) => ({ name: c.city, value: [c.lng, c.lat], __i: i, status: c.status }))

  return {
    backgroundColor: 'transparent',
    animation: !reduced,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      confine: true,
      transitionDuration: reduced ? 0 : 0.2,
      backgroundColor: '#ffffff',
      borderColor: 'rgba(11,18,32,0.08)',
      borderWidth: 1,
      padding: 0,
      extraCssText: 'border-radius:12px;box-shadow:0 12px 32px rgba(11,18,32,0.12);overflow:hidden;',
      formatter: (p) => {
        const schools = byCity[p.name]
        if (!schools) return ''
        return (
          '<div style="min-width:168px">' +
          '<div style="display:flex;align-items:baseline;gap:8px;padding:10px 14px 8px;border-bottom:1px solid rgba(11,18,32,0.06)">' +
          `<span style="font-size:15px;font-weight:700;letter-spacing:-0.01em;color:#0b1220">${p.name}</span>` +
          `<span style="font-size:12px;font-weight:600;color:#1677ff">${schools.length} 所院校</span>` +
          '</div>' +
          '<ul style="list-style:none;margin:0;padding:9px 14px 11px;display:flex;flex-direction:column;gap:7px">' +
          schools
            .map(
              (s) =>
                '<li style="display:flex;align-items:center;gap:8px;font-size:13px;color:#334155">' +
                '<span style="width:6px;height:6px;flex:none;border-radius:9999px;background:#1677ff;box-shadow:0 0 8px rgba(22,119,255,0.6)"></span>' +
                `${s}</li>`
            )
            .join('') +
          '</ul></div>'
        )
      },
    },
    geo: {
      map: 'china',
      roam: false,
      zoom: 1.18,
      center: [104.5, 35.0],
      label: { show: false },
      itemStyle: {
        areaColor: '#e9f1fb',
        borderColor: '#cdddf2',
        borderWidth: 1,
        shadowColor: 'rgba(40,90,170,0.12)',
        shadowBlur: 18,
        shadowOffsetY: 10,
      },
      emphasis: { label: { show: false }, itemStyle: { areaColor: '#dbe9fb' } },
      select: { disabled: true },
    },
    series: [
      {
        // 命中区 + 标签：透明圆点（图标本体在 HTML overlay 里画），保留 hover tooltip / 点击 / 名称
        name: 'cities',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        symbolSize: 30,
        itemStyle: { color: 'rgba(0,0,0,0)' },
        label: {
          show: true,
          formatter: '{b}',
          position: 'right',
          offset: [14, 0],
          color: '#334155',
          fontSize: 13,
          fontWeight: 600,
          textShadowColor: '#ffffff',
          textShadowBlur: 4,
        },
        emphasis: { label: { color: '#1677ff', fontWeight: 700 } },
        // 苏皖一带城市密集，常显名称会互压；重叠时自动隐藏标签（图钉保留，悬停看详情）
        labelLayout: { hideOverlap: true },
        data,
      },
    ],
  }
}

/* overlay 单个城市徽标：x/y 为 convertToPixel 得到的容器内像素坐标 */
function CityPin({ city, x, y, status, on, reduced }) {
  const building = status === 'building'
  return (
    <div
      className="absolute z-[2]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      aria-hidden
    >
      {/* 选中环：点看板/地图时把当前城市框出来 */}
      {on && (
        <span
          className={`absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
            building ? 'border-amber-400/70' : 'border-brand/60'
          }`}
        />
      )}
      {/* 建设中：外圈脉冲，读作“正在进行”；减弱动效下不脉 */}
      {building && !reduced && (
        <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pingslow rounded-full bg-amber-400/40" />
      )}
      <span
        className={`relative grid h-7 w-7 place-items-center rounded-full text-white shadow-[0_2px_10px_rgba(11,18,32,0.22)] ${
          building ? 'bg-amber-500' : 'bg-brand'
        }`}
      >
        {building ? (
          /* 建设中：锤子以柄端为轴抬起再下击，读作现场在敲打施工；减弱动效下静止 */
          <Hammer
            className={`h-4 w-4 ${reduced ? '' : 'origin-bottom-right animate-[hammer_1.35s_ease-in-out_infinite]'}`}
            strokeWidth={2.4}
          />
        ) : (
          <Check className="h-4 w-4" strokeWidth={3} />
        )}
      </span>
    </div>
  )
}

export default function ChinaMap({ cities, active, onSelect, reduced }) {
  const elRef = useRef(null)
  const chartRef = useRef(null)
  const [pts, setPts] = useState([])

  // 经纬度 → 容器内像素（图标 overlay 用）。地图不 roam，只有尺寸变化时坐标才动。
  const measure = () => {
    const chart = chartRef.current
    if (!chart) return
    const next = cities.map((c, i) => {
      const px = chart.convertToPixel({ seriesIndex: 0 }, [c.lng, c.lat])
      return px ? { key: c.city, city: c.city, x: px[0], y: px[1], status: c.status, i } : null
    })
    setPts(next.filter(Boolean))
  }

  useEffect(() => {
    ensureMap()
    const chart = echarts.init(elRef.current, null, { renderer: 'canvas' })
    chartRef.current = chart
    chart.setOption(buildOption(cities, reduced))
    chart.on('click', (p) => {
      if (p.data && p.data.__i != null) onSelect(p.data.__i)
    })
    const ro = new ResizeObserver(() => {
      chart.resize()
      measure()
    })
    if (elRef.current) ro.observe(elRef.current)
    // 入场动画结束后再量一次，确保 convertToPixel 落在最终布局上
    const t = setTimeout(measure, 400)
    measure()
    return () => {
      clearTimeout(t)
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative h-full w-full">
      <div ref={elRef} className="h-full w-full" />
      {/* 图标层不吃指针事件：hover/click 全部穿透给下面的 ECharts canvas */}
      <div className="pointer-events-none absolute inset-0">
        {pts.map((pt) => (
          <CityPin key={pt.key} city={pt.city} x={pt.x} y={pt.y} status={pt.status} on={pt.i === active} reduced={reduced} />
        ))}
      </div>
    </div>
  )
}
