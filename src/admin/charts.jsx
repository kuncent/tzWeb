/* ============================================================
 * 后台共用图表原子：echarts 实例 + 常用 option
 * ------------------------------------------------------------
 * Analytics 与 Dashboard 都从这里拿 <Chart>，避免两份 dispose/ResizeObserver
 * 逻辑漂移；同时把「日趋势」与「迷你 sparkline」两个高频 option 集中，
 * 后面 KPI 卡想加趋势线只是多传一条 daily 数组。
 * ============================================================ */
import { useEffect, useMemo, useRef } from 'react'
import echarts from '../lib/echarts-admin'
import chinaJson from '../data/china.json'

let chinaRegistered = false
export function ensureChinaRegistered() {
  if (chinaRegistered) return
  echarts.registerMap('china', chinaJson)
  chinaRegistered = true
}

/* 通用容器：一次 init + ResizeObserver + option 变化时 setOption(true) */
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function Chart({ option, height = 260, className }) {
  const ref = useRef(null)
  const inst = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    inst.current = echarts.init(ref.current, null, { renderer: 'canvas' })
    const ro = new ResizeObserver(() => inst.current?.resize())
    ro.observe(ref.current)
    return () => { ro.disconnect(); inst.current?.dispose(); inst.current = null }
  }, [])
  useEffect(() => { if (inst.current && option) inst.current.setOption(REDUCED ? { ...option, animation: false } : option, true) }, [option])
  return <div ref={ref} style={{ height }} className={className || 'w-full'} />
}

const fmtDate = (s) => String(s).slice(5)

/* 日趋势（PV 面积 + UV 虚线）：Analytics 主视图 */
export function useDailyOption(daily) {
  return useMemo(() => {
    if (!daily?.length) return null
    return {
      backgroundColor: 'transparent',
      grid: { left: 40, right: 20, top: 32, bottom: 30 },
      tooltip: { trigger: 'axis', confine: true, backgroundColor: '#fff', borderColor: 'rgba(11,18,32,0.08)', textStyle: { color: '#0b1220', fontSize: 12 } },
      legend: { data: ['PV', 'UV'], top: 4, right: 6, textStyle: { color: '#64748b', fontSize: 12 }, itemWidth: 12, itemHeight: 8 },
      xAxis: {
        type: 'category',
        data: daily.map((d) => fmtDate(d.date)),
        axisLine: { lineStyle: { color: 'rgba(11,18,32,0.15)' } },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11, interval: Math.max(0, Math.floor(daily.length / 8) - 1) },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(11,18,32,0.06)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        { name: 'PV', type: 'line', smooth: true, showSymbol: false, data: daily.map((d) => d.pv), lineStyle: { color: '#1677ff', width: 2 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(22,119,255,0.22)' }, { offset: 1, color: 'rgba(22,119,255,0.02)' }]) } },
        { name: 'UV', type: 'line', smooth: true, showSymbol: false, data: daily.map((d) => d.uv), lineStyle: { color: '#0b1220', width: 2, type: 'dashed' } },
      ],
    }
  }, [daily])
}

/* KPI 卡迷你 sparkline：只一根线，无轴无网格，宽度撑满父容器 */
export function useSparkOption(values, { color = '#1677ff', fill = true } = {}) {
  return useMemo(() => {
    if (!values || values.length < 2) return null
    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: { left: 0, right: 0, top: 2, bottom: 2 },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: values.map((_, i) => i) },
      yAxis: { type: 'value', show: false, scale: true },
      series: [{
        type: 'line', smooth: true, showSymbol: false, data: values,
        lineStyle: { color, width: 1.6 },
        areaStyle: fill ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color + '55' }, { offset: 1, color: color + '00' }]) } : undefined,
      }],
    }
  }, [values, color, fill])
}

/* 中国地图 option（Analytics 独占） */
const PROV_SUFFIX = /(维吾尔自治区|壮族自治区|回族自治区|特别行政区|自治区|省|市)$/
export function normalizeProvince(name) {
  if (!name) return ''
  return name.replace(PROV_SUFFIX, '')
}
export function useChinaOption(provinces, days = 30) {
  return useMemo(() => {
    if (!provinces?.length) return null
    ensureChinaRegistered()
    const data = provinces
      .map((p) => ({ name: normalizeProvince(p.code), value: Number(p.count) || 0, today: Number(p.today) || 0 }))
      .filter((x) => x.name && Number.isFinite(x.value) && x.value > 0)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fff',
        borderColor: 'rgba(11,18,32,0.08)',
        textStyle: { color: '#0b1220', fontSize: 12 },
        formatter: (p) => {
          // 无数据省份不在 data 里，p.data/p.value 为 undefined → 一律兜 0，不出 NaN
          const today = Number.isFinite(p?.data?.today) ? p.data.today : 0
          const win = Number.isFinite(p?.value) ? p.value : 0
          return `${p.name}<br/>今日新增访客：<b>${today}</b><br/>近${days}日访问人数：${win}`
        },
      },
      visualMap: {
        show: true,
        min: 0,
        max: Math.max(1, ...data.map((d) => d.value)),
        left: 8,
        bottom: 12,
        calculable: false,
        itemWidth: 12,
        itemHeight: 100,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        inRange: { color: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'] },
      },
      series: [{
        name: '访问省份',
        type: 'map',
        map: 'china',
        roam: false,
        zoom: 1.15,
        center: [104.5, 35.0],
        label: { show: false },
        itemStyle: { areaColor: '#eef2f7', borderColor: '#cdddf2', borderWidth: 1 },
        emphasis: { label: { show: true, color: '#0b1220', fontSize: 11, fontWeight: 600 }, itemStyle: { areaColor: '#bfdbfe' } },
        data,
      }],
    }
  }, [provinces, days])
}

/* 来源饼 */
export function useSourcesOption(sources) {
  return useMemo(() => {
    if (!sources?.length) return null
    const labels = { direct: '直接访问', search: '搜索引擎', social: '社交媒体', ai: 'AI 摘要', internal: '站内自跳', external: '外部链接' }
    const colors = { direct: '#0b1220', search: '#1677ff', social: '#f59e0b', ai: '#7c3aed', internal: '#94a3b8', external: '#10b981' }
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', confine: true, backgroundColor: '#fff', borderColor: 'rgba(11,18,32,0.08)', textStyle: { color: '#0b1220', fontSize: 12 } },
      legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie',
        radius: ['50%', '72%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        data: sources.map((s) => ({
          name: labels[s.bucket] || s.bucket,
          value: s.count,
          itemStyle: { color: colors[s.bucket] || '#94a3b8' },
        })),
      }],
    }
  }, [sources])
}

/* AI 命中趋势（Geo 用） */
export function useAiTrendOption(daily) {
  return useMemo(() => {
    if (!daily?.length) return null
    return {
      backgroundColor: 'transparent',
      grid: { left: 40, right: 20, top: 24, bottom: 30 },
      tooltip: { trigger: 'axis', confine: true, backgroundColor: '#fff', borderColor: 'rgba(11,18,32,0.08)', textStyle: { color: '#0b1220', fontSize: 12 } },
      xAxis: {
        type: 'category',
        data: daily.map((d) => fmtDate(d.date)),
        axisLine: { lineStyle: { color: 'rgba(11,18,32,0.15)' } },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11, interval: Math.max(0, Math.floor(daily.length / 8) - 1) },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(11,18,32,0.06)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [{
        name: 'AI 命中', type: 'line', smooth: true, showSymbol: false, data: daily.map((d) => d.ai || 0),
        lineStyle: { color: '#7c3aed', width: 2 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(124,58,237,0.25)' }, { offset: 1, color: 'rgba(124,58,237,0.02)' }]) },
      }],
    }
  }, [daily])
}
