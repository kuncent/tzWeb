import * as echarts from 'echarts/core'
import { LinesChart, EffectScatterChart, ScatterChart } from 'echarts/charts'
import { GeoComponent } from 'echarts/components'
import { LabelLayout } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

/* 公开站只需要「地图 + 航线 + 涟漪点」这一套。
   `import * as echarts from 'echarts'` 会把全部图表类型与 SVG 渲染器一起拉进来
   （实测首屏 china 块 379 KB gzip）；按需注册后降到 218 KB。
   LabelLayout 必留：枢纽标签靠 labelLayout.hideOverlap 去重叠。
   后台的折线/饼图/地图在 ./echarts-admin，两份互不相拉。 */
echarts.use([LinesChart, EffectScatterChart, ScatterChart, GeoComponent, LabelLayout, CanvasRenderer])

export default echarts