import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import chinaJson from '../../data/china.json'
import { SERVICE_HUBS, SERVICE_COVERAGE } from '../../data/mapCities'

/* ============================================================
 * 高校案例首屏「服务辐射航线」——暗色中国地图 + 抛物线流光
 * ------------------------------------------------------------
 * 底图沿用与首页一致的暗色 geo（无省界标签、不吃交互）。六个自有
 * 服务地点（深圳总部 + 五服务节点）是航线起点，全国主要省会与热门
 * 城市（不含港澳台）是落点：每个覆盖城市按「最近服务点」归到一个
 * 枢纽，从枢纽向该城市抛出一条抛物线（ECharts lines · curveness），线上
 * 跑一道带拖尾的流光（effect · trailLength），读作「服务网络覆盖全国」。
 * 航线分 4 组、周期各异，流光错峰出发，避免整齐划一。枢纽用带涟漪的亮点 + 城市名标注。
 *
 * prefers-reduced-motion：animation:false，流光停走，只留静态航线与点。
 * 组件懒加载，ECharts 单独切 chunk，不进入口包。
 * ============================================================ */

let registered = false
function ensureMap() {
  if (!registered) {
    echarts.registerMap('china', chinaJson)
    registered = true
  }
}

/* 合作城市 → 取最近的服务枢纽（可取前 n 个，做更密的网络）；按经纬度平方距离排序即可 */
function hubsFor(c, n) {
  return SERVICE_HUBS
    .map((h) => ({ h, d: (h.lng - c.lng) ** 2 + (h.lat - c.lat) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.h)
}

const PERIODS = [1.9, 2.4, 2.9, 3.4] // 四组航线各自的流光周期（秒）→ 更快 + 错峰

function buildOption(reduced) {
  // 覆盖城市 = 全国主要省会 + 热门城市，剔除本身即枢纽的城市；每个连到最近的枢纽
  const coverage = SERVICE_COVERAGE.filter((c) => !SERVICE_HUBS.some((h) => h.city === c.city))
  const routes = []
  for (const c of coverage) {
    const h = hubsFor(c, 1)[0]
    routes.push({ coords: [[h.lng, h.lat], [c.lng, c.lat]] })
  }
  const groups = [[], [], [], []]
  routes.forEach((r, i) => groups[i % 4].push(r))

  // 贴地「影线」：更平、更暗、无流光，压在亮弧下方 → 亮弧像浮在地面上方，形成立体感
  const groundSeries = {
    type: 'lines',
    coordinateSystem: 'geo',
    zlevel: 1,
    polyline: false,
    silent: true,
    effect: { show: false },
    lineStyle: { color: '#16324f', width: 1, opacity: 0.55, curveness: 0.1 },
    data: routes,
  }

  const lineSeries = groups.map((g, gi) => ({
    type: 'lines',
    coordinateSystem: 'geo',
    zlevel: 3,
    polyline: false,
    effect: {
      show: !reduced,
      period: PERIODS[gi],
      trailLength: 0.5,
      symbol: 'circle',
      symbolSize: 4.4,
      color: '#eaf6ff',
    },
    lineStyle: { color: '#4ea8ff', width: 1.1, opacity: 0.22, curveness: 0.36 },
    data: g,
  }))

  return {
    backgroundColor: 'transparent',
    animation: !reduced,
    geo: {
      map: 'china',
      roam: false,
      zoom: 1.06,
      center: [104.0, 35.5],
      silent: true,
      label: { show: false },
      itemStyle: {
        areaColor: '#0e1a2e',
        borderColor: 'rgba(125,169,255,0.22)',
        borderWidth: 1,
        shadowColor: 'rgba(0,0,0,0.45)',
        shadowBlur: 18,
        shadowOffsetY: 10,
      },
      emphasis: { disabled: true },
      select: { disabled: true },
    },
    series: [
      // 覆盖城市落点（省会略大）
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        silent: true,
        symbolSize: (v, p) => (p.data && p.data.capital ? 6 : 4),
        itemStyle: { color: 'rgba(120,190,255,0.9)', shadowColor: 'rgba(78,168,255,0.9)', shadowBlur: 8 },
        data: coverage.map((c) => ({ name: c.city, value: [c.lng, c.lat], capital: c.capital })),
      },
      // 六个服务枢纽（带涟漪亮点 + 名称；东缘枢纽名标在左侧防溢出）
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        rippleEffect: { scale: 3.2, brushType: 'stroke' },
        symbolSize: (v, p) => (p.data && p.data.hq ? 9 : 7),
        itemStyle: { color: '#eaf4ff', shadowColor: '#4ea8ff', shadowBlur: 12 },
        data: SERVICE_HUBS.map((h) => ({
          name: h.label,
          value: [h.lng, h.lat],
          hq: h.hq,
          label: { position: h.lng >= 114 ? 'left' : 'right' },
        })),
        label: {
          show: true,
          offset: [8, 0],
          formatter: '{b}',
          color: '#cfe6ff',
          fontSize: 12,
          fontWeight: 600,
          textShadowColor: 'rgba(4,7,13,0.85)',
          textShadowBlur: 5,
        },
      },
      groundSeries,
      ...lineSeries,
    ],
  }
}

export default function HeroCoverage({ reduced }) {
  const elRef = useRef(null)

  useEffect(() => {
    ensureMap()
    const el = elRef.current
    if (!el) return
    let chart = null

    /* 关键：容器为 0×0 时绝不能 init / resize。ECharts 的 canvas 渲染器
       在 0 宽高的图层上跑动画循环（涟漪 + 流光常驻）会走 zrender 的
       drawImage，尺寸为 0 时直接抛 InvalidStateError——那是 rAF 里的异步错，
       错误边界接不住，整棵 React 树会崩 → 黑屏。客户端路由切换（尤其 dev
       StrictMode 双挂）会有一帧容器还没布局、尺寸为 0，所以必须等真有了尺寸再建。 */
    const hasSize = () => el.clientWidth > 0 && el.clientHeight > 0
    const start = () => {
      if (chart || !hasSize()) return
      const prev = echarts.getInstanceByDom(el)
      if (prev) prev.dispose()
      chart = echarts.init(el, null, { renderer: 'canvas' })
      chart.setOption(buildOption(reduced))
    }
    start()

    const ro = new ResizeObserver(() => {
      if (!chart) { start(); return }
      if (hasSize()) chart.resize() // 0 尺寸直接跳过，不把画布缩成 0
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      if (chart) { chart.dispose(); chart = null }
    }
  }, [reduced])

  return <div ref={elRef} className="h-full w-full" />
}
