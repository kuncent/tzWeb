import * as echarts from 'echarts/core'
import { LineChart, PieChart, MapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

/* 后台图表只用到折线 / 饼 / 中国地图三种，加 grid、tooltip、legend、visualMap 四个组件。
   与公开站那份（./echarts）分开注册：后台是登录后的独立 lazy 块，
   多注册的这几种不该出现在营销首屏的 china 块里。 */
echarts.use([LineChart, PieChart, MapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, GeoComponent, CanvasRenderer])

export default echarts