import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import chinaJson from '../../data/china.json'
import { SERVICE_HUBS, SERVICE_COVERAGE } from '../../data/mapCities'

/* ============================================================
 * 首屏「服务网络」——暗色中国地图 + 服务辐射航线
 * ------------------------------------------------------------
 * 配色跟随首屏的深空暗蓝体系（主题蓝为主），不推冰蓝：
 *   · 陆地：纵向渐变的暗面 + 细描边 + 外缘冷影，去掉一整块生硬实色；
 *   · 城市：静态柔光点打底，省会与枢纽按不同周期错峰呼吸（慢波纹）；
 *   · 航线：深色影线压底 + 低透明度光带 + 四组带拖尾的流光，周期各异；
 *   · 枢纽：可悬停放大，总部多一圈静态光晕，读作「当前焦点」。
 * 性能：只 setOption 一次；动效全交给 ECharts 内部 rAF，无 DOM 逐帧更新；
 * 动画按 zlevel 分层（底图 / 静态点 / 航线 / 枢纽），静态层不跟着逐帧重绘。
 * reduced：animation:false，去掉波纹与流光，只留静态航线与点。
 * ============================================================ */

let registered = false
function ensureMap() {
  if (!registered) {
    echarts.registerMap('china', chinaJson)
    registered = true
  }
}

/* 枢纽标签的落位：六个点在东部挤成一团，默认统一「右侧」会互相压字；
   按各自周边空位手工分流，再用 hideOverlap 兜底 */
const HUB_LABEL = {
  深圳总部: { position: 'bottom', offset: [0, 8] },
  北京: { position: 'top', offset: [0, -3] },
  郑州: { position: 'right', offset: [9, 2] },
  西安: { position: 'left', offset: [-9, 0] },
  重庆: { position: 'left', offset: [-9, 4] },
  长沙: { position: 'right', offset: [9, 1] },
}

/* 合作城市 → 取最近的服务枢纽（可取前 n 个，做更密的网络）；按经纬度平方距离排序即可 */
function hubsFor(c, n) {
  return SERVICE_HUBS
    .map((h) => ({ h, d: (h.lng - c.lng) ** 2 + (h.lat - c.lat) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.h)
}

/* 四组航线各自的流光周期（秒）：比上一版更慢、振幅更小，读作「数据在走」而不是「屏在闪」 */
const PERIODS = [3.8, 4.6, 5.4, 6.2]

/* 参与呼吸的城市：挑大区中心，且不含六个枢纽（枢纽自己有更慢的波纹） */
const PULSE_CITIES = ['上海', '天津', '沈阳', '南京', '杭州', '武汉', '广州', '成都', '昆明', '乌鲁木齐', '拉萨', '哈尔滨']

const INK = {
  hub: '#dcecff',
  hubGlow: 'rgba(78,168,255,0.9)',
  spark: '#eaf6ff',
  border: 'rgba(112,158,232,0.26)',
  route: 'rgba(78,168,255,0.26)',
  routeAura: 'rgba(47,123,255,0.13)',
  routeShadow: 'rgba(6,14,28,0.72)',
}

function buildOption(reduced, compact) {
  // 覆盖城市 = 全国主要省会 + 热门城市，剔除本身即枢纽的城市；每个连到最近的枢纽
  const coverage = SERVICE_COVERAGE.filter((c) => !SERVICE_HUBS.some((h) => h.city === c.city))
  const routes = []
  for (const c of coverage) {
    const h = hubsFor(c, 1)[0]
    routes.push({ coords: [[h.lng, h.lat], [c.lng, c.lat]] })
  }
  const groups = [[], [], [], []]
  routes.forEach((r, i) => groups[i % 4].push(r))

  /* 城市呼吸分两组、周期错开：两组相位会自然漂移，不会整屏同时闪 */
  const pulseNames = new Set(PULSE_CITIES)
  const pulse = coverage.filter((c) => pulseNames.has(c.city))
  const pulseA = pulse.filter((_, i) => i % 2 === 0)
  const pulseB = pulse.filter((_, i) => i % 2 === 1)
  const pulseData = (list) => list.map((c) => ({ name: c.city, value: [c.lng, c.lat] }))

  const hq = SERVICE_HUBS.find((h) => h.hq) || SERVICE_HUBS[0]

  /* 贴地「影线」：更平、更暗、无流光，压在亮弧下方 → 亮弧像浮在地面上方，形成立体感 */
  const groundSeries = {
    type: 'lines',
    coordinateSystem: 'geo',
    zlevel: 1,
    polyline: false,
    silent: true,
    effect: { show: false },
    lineStyle: { color: INK.routeShadow, width: 1, opacity: 0.55, curveness: 0.1 },
    data: routes,
  }

  /* 光带：把 58 条航线整体再罩一层极淡的宽线，远看是一团冷光，近看才是一根根航线 */
  const auraSeries = {
    type: 'lines',
    coordinateSystem: 'geo',
    zlevel: 1,
    polyline: false,
    silent: true,
    effect: { show: false },
    lineStyle: { color: INK.routeAura, width: 2.2, opacity: 0.72, curveness: 0.36 },
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
      trailLength: 0.32,
      symbol: 'circle',
      symbolSize: 3.6,
      color: INK.spark,
    },
    lineStyle: { color: INK.route, width: 0.95, opacity: 0.84, curveness: 0.36 },
    data: g,
  }))

  const pulseSeries = reduced
    ? []
    : [
        {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 2,
          silent: true,
          showEffectOn: 'render',
          symbolSize: 3.2,
          rippleEffect: { period: 5.4, scale: 2.6, brushType: 'stroke', number: 1 },
          itemStyle: { color: 'rgba(120,190,255,0.55)' },
          data: pulseData(pulseA),
        },
        {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 2,
          silent: true,
          showEffectOn: 'render',
          symbolSize: 3.2,
          rippleEffect: { period: 7.2, scale: 2.6, brushType: 'stroke', number: 1 },
          itemStyle: { color: 'rgba(120,190,255,0.45)' },
          data: pulseData(pulseB),
        },
      ]

  return {
    backgroundColor: 'transparent',
    animation: !reduced,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    geo: {
      map: 'china',
      roam: false,
      zoom: 1.06,
      center: [104.0, 35.5],
      silent: true,
      label: { show: false },
      itemStyle: {
        /* 纵向渐变的暗面：底图上沿略亮、下沿沉下去，读作地形而不是一块实色；
           整体仍半透明，身后 3D 实验室要透得过来 */
        areaColor: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(18,32,58,0.6)' },
            { offset: 0.52, color: 'rgba(10,20,38,0.46)' },
            { offset: 1, color: 'rgba(5,11,22,0.34)' },
          ],
        },
        borderColor: INK.border,
        borderWidth: 0.9,
        /* 冷影兜住陆地外缘：描边不会硬邦邦地贴在面板上 */
        shadowColor: 'rgba(12,40,90,0.55)',
        shadowBlur: 16,
        shadowOffsetY: 8,
      },
      emphasis: { disabled: true },
      select: { disabled: true },
    },
    series: [
      // 覆盖城市落点（省会略大）：径向渐变自带柔光边，不额外吃 shadowBlur
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 1,
        silent: true,
        symbolSize: (v, p) => (p.data && p.data.capital ? 6.4 : 4.8),
        itemStyle: {
          color: {
            type: 'radial',
            x: 0.5,
            y: 0.5,
            r: 0.5,
            colorStops: [
              { offset: 0, color: 'rgba(236,246,255,1)' },
              { offset: 0.42, color: 'rgba(140,190,255,0.9)' },
              { offset: 1, color: 'rgba(78,168,255,0)' },
            ],
          },
        },
        data: coverage.map((c) => ({ name: c.city, value: [c.lng, c.lat], capital: c.capital })),
      },

      // 总部静态光晕：一块慢呼吸的底光，标出「当前城市」
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 1,
        silent: true,
        symbolSize: 30,
        itemStyle: {
          color: {
            type: 'radial',
            x: 0.5,
            y: 0.5,
            r: 0.5,
            colorStops: [
              { offset: 0, color: 'rgba(78,168,255,0.3)' },
              { offset: 0.58, color: 'rgba(78,168,255,0.08)' },
              { offset: 1, color: 'rgba(78,168,255,0)' },
            ],
          },
        },
        data: [{ name: hq.label, value: [hq.lng, hq.lat] }],
      },

      ...pulseSeries,

      groundSeries,
      auraSeries,
      ...lineSeries,

      // 六个服务枢纽（带涟漪亮点 + 名称；悬停放大，东缘枢纽名标在左侧防溢出）
      {
        type: reduced ? 'scatter' : 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        showEffectOn: 'render',
        rippleEffect: { period: 4.6, scale: 3.2, brushType: 'stroke', number: 2 },
        symbolSize: (v, p) => (p.data && p.data.hq ? 9.5 : 7.4),
        itemStyle: { color: INK.hub, shadowColor: INK.hubGlow, shadowBlur: 10 },
        emphasis: {
          scale: 1.7,
          itemStyle: { color: '#ffffff', shadowBlur: 18, shadowColor: 'rgba(120,190,255,0.95)' },
          label: { color: '#ffffff', fontSize: 13, fontWeight: 700 },
        },
        data: SERVICE_HUBS.map((h) => {
          const pos = HUB_LABEL[h.label] || { position: 'right', offset: [9, 0] }
          /* 紧凑面板（1024–1279）只留总部标签：280px 宽里六个名字必然互压 */
          return {
            name: h.label,
            value: [h.lng, h.lat],
            hq: h.hq,
            label: { show: compact ? !!h.hq : true, position: pos.position, offset: pos.offset },
          }
        }),
        labelLayout: { hideOverlap: true },
        label: {
          show: true,
          formatter: '{b}',
          color: '#cfe6ff',
          fontSize: compact ? 9 : 10.5,
          fontWeight: 600,
          padding: compact ? [1, 3] : [2, 4],
          borderRadius: 3,
          backgroundColor: 'rgba(5,10,20,0.6)',
          textShadowColor: 'rgba(4,7,13,0.85)',
          textShadowBlur: 5,
        },
      },
    ],
  }
}

export default function HeroCoverage({ reduced, compact = false }) {
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
      chart.setOption(buildOption(reduced, compact))
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
  }, [reduced, compact])

  return <div ref={elRef} className="h-full w-full" />
}
