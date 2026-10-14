/* ============================================================
 * 合作高校分布 —— 重点交付城市（按城市分组 + 真实经纬度）
 * ------------------------------------------------------------
 * 单一真源：首页「合作高校」地图（sections/Customers）与高校案例内页
 * 首屏的分布大屏共用这一份。status：已交付多为 deployed，挑几个较新
 * 市场标 building 以体现「建设中」施工动画。院校名与 clientLogos 同源。
 * ============================================================ */
export const MAP_CITIES = [
  { city: '北京', lng: 116.4, lat: 39.9, status: 'deployed', schools: ['清华大学'] },
  { city: '上海', lng: 121.47, lat: 31.23, status: 'deployed', schools: ['上海立信会计金融学院', '上海杉达学院'] },
  { city: '深圳', lng: 114.06, lat: 22.55, status: 'deployed', schools: ['深圳职业技术大学', '深圳大学', '深圳信息职业技术学院', '深圳市龙岗区第二职业技术学校', '深圳北理莫斯科大学'] },
  { city: '广州', lng: 113.26, lat: 23.13, status: 'deployed', schools: ['广东金融学院', '广东第二师范学院', '广东技术师范大学', '广东财贸职业学院', '广东培正学院'] },
  { city: '福州', lng: 119.3, lat: 26.08, status: 'deployed', schools: ['福建师范大学', '阳光学院', '福州墨尔本理工职业学院'] },
  { city: '南京', lng: 118.8, lat: 32.06, status: 'deployed', schools: ['南京师范大学'] },
  { city: '合肥', lng: 117.28, lat: 31.86, status: 'deployed', schools: ['合肥师范学院', '安徽建筑大学'] },
  { city: '天津', lng: 117.2, lat: 39.13, status: 'deployed', schools: ['南开大学'] },
  { city: '长沙', lng: 112.94, lat: 28.23, status: 'deployed', schools: ['中南大学'] },
  { city: '成都', lng: 104.07, lat: 30.67, status: 'building', schools: ['西南财经大学'] },
  { city: '郑州', lng: 113.63, lat: 34.75, status: 'building', schools: ['郑州大学', '郑州西亚斯学院'] },
  { city: '青岛', lng: 120.38, lat: 36.07, status: 'building', schools: ['青岛大学'] },
  { city: '苏州', lng: 120.58, lat: 31.3, status: 'building', schools: ['苏州大学'] },
  { city: '南宁', lng: 108.37, lat: 22.82, status: 'deployed', schools: ['广西金融职业技术学院'] },
  { city: '徐州', lng: 117.28, lat: 34.26, status: 'deployed', schools: ['江苏师范大学'] },
  { city: '滁州', lng: 118.32, lat: 32.3, status: 'deployed', schools: ['滁州学院'] },
  { city: '六安', lng: 116.51, lat: 31.74, status: 'deployed', schools: ['皖西学院'] },
  /* ―― 以下来自《高校专业实验室建设案例集》新增的标杆交付城市 ―― */
  { city: '武汉', lng: 114.3, lat: 30.6, status: 'deployed', schools: ['湖北商贸学院'] },
  { city: '西安', lng: 108.94, lat: 34.34, status: 'deployed', schools: ['西安明德理工学院'] },
  { city: '兴义', lng: 104.9, lat: 25.09, status: 'building', schools: ['兴义民族师范学院'] },
]

/* ============================================================
 * 六大服务地点（与 site.js offices 同源）——真实经纬度
 * ------------------------------------------------------------
 * 高校案例首屏「覆盖扩散」粒子特效的辐射源点：从这 6 个点向外
 * 扩散出粒子与涟漪，表达「以服务节点为中心辐射全国」的覆盖。
 * hq 标记总部（深圳），视觉上更亮一档。
 * ============================================================ */
export const SERVICE_HUBS = [
  { city: '深圳', label: '深圳总部', lng: 114.06, lat: 22.55, hq: true },
  { city: '北京', label: '北京', lng: 116.4, lat: 39.9 },
  { city: '重庆', label: '重庆', lng: 106.55, lat: 29.56 },
  { city: '郑州', label: '郑州', lng: 113.63, lat: 34.75 },
  { city: '西安', label: '西安', lng: 108.94, lat: 34.34 },
  { city: '长沙', label: '长沙', lng: 112.94, lat: 28.23 },
]

/* ============================================================
 * 服务网络覆盖城市 —— 全国主要省会 + 热门城市（不含港澳台）
 * ------------------------------------------------------------
 * 只用于高校案例首屏「服务网络」航线落点：表达六大服务枢纽向全国
 * 辐射的覆盖半径，不代表这些城市都有合作院校（合作院校看 MAP_CITIES）。
 * capital 标记省会/首/自治区首府（落点略大），其余为计划单列市、
 * 经济强市与旅游热门城市。经纬度为城市中心近似值，足够地图落点。
 * ============================================================ */
export const SERVICE_COVERAGE = [
  // —— 4 直辖市 ——
  { city: '北京', lng: 116.40, lat: 39.90, capital: true },
  { city: '天津', lng: 117.20, lat: 39.13, capital: true },
  { city: '上海', lng: 121.47, lat: 31.23, capital: true },
  { city: '重庆', lng: 106.55, lat: 29.56, capital: true },
  // —— 省会 / 自治区首府 ——
  { city: '石家庄', lng: 114.51, lat: 38.04, capital: true },
  { city: '太原', lng: 112.55, lat: 37.87, capital: true },
  { city: '呼和浩特', lng: 111.75, lat: 40.84, capital: true },
  { city: '沈阳', lng: 123.43, lat: 41.80, capital: true },
  { city: '长春', lng: 125.32, lat: 43.82, capital: true },
  { city: '哈尔滨', lng: 126.53, lat: 45.80, capital: true },
  { city: '南京', lng: 118.80, lat: 32.06, capital: true },
  { city: '杭州', lng: 120.15, lat: 30.27, capital: true },
  { city: '合肥', lng: 117.28, lat: 31.86, capital: true },
  { city: '福州', lng: 119.30, lat: 26.08, capital: true },
  { city: '南昌', lng: 115.86, lat: 28.68, capital: true },
  { city: '济南', lng: 117.00, lat: 36.65, capital: true },
  { city: '郑州', lng: 113.63, lat: 34.75, capital: true },
  { city: '武汉', lng: 114.30, lat: 30.60, capital: true },
  { city: '长沙', lng: 112.94, lat: 28.23, capital: true },
  { city: '广州', lng: 113.26, lat: 23.13, capital: true },
  { city: '南宁', lng: 108.37, lat: 22.82, capital: true },
  { city: '海口', lng: 110.20, lat: 20.04, capital: true },
  { city: '成都', lng: 104.07, lat: 30.67, capital: true },
  { city: '贵阳', lng: 106.63, lat: 26.65, capital: true },
  { city: '昆明', lng: 102.83, lat: 24.88, capital: true },
  { city: '拉萨', lng: 91.11, lat: 29.65, capital: true },
  { city: '西安', lng: 108.94, lat: 34.34, capital: true },
  { city: '兰州', lng: 103.83, lat: 36.06, capital: true },
  { city: '西宁', lng: 101.78, lat: 36.62, capital: true },
  { city: '银川', lng: 106.23, lat: 38.49, capital: true },
  { city: '乌鲁木齐', lng: 87.62, lat: 43.79, capital: true },
  // —— 热门城市（计划单列市 / 经济强市 / 旅游热门 / 区域中心）——
  { city: '深圳', lng: 114.06, lat: 22.55 },
  { city: '大连', lng: 121.62, lat: 38.91 },
  { city: '青岛', lng: 120.38, lat: 36.07 },
  { city: '厦门', lng: 118.09, lat: 24.48 },
  { city: '宁波', lng: 121.55, lat: 29.88 },
  { city: '苏州', lng: 120.58, lat: 31.30 },
  { city: '无锡', lng: 120.30, lat: 31.57 },
  { city: '佛山', lng: 113.12, lat: 23.02 },
  { city: '东莞', lng: 113.75, lat: 23.05 },
  { city: '珠海', lng: 113.55, lat: 22.27 },
  { city: '温州', lng: 120.70, lat: 28.00 },
  { city: '泉州', lng: 118.59, lat: 24.90 },
  { city: '烟台', lng: 121.39, lat: 37.52 },
  { city: '唐山', lng: 118.18, lat: 39.63 },
  { city: '洛阳', lng: 112.45, lat: 34.62 },
  { city: '宜昌', lng: 111.29, lat: 30.69 },
  { city: '徐州', lng: 117.28, lat: 34.26 },
  { city: '桂林', lng: 110.29, lat: 25.27 },
  { city: '三亚', lng: 109.51, lat: 18.25 },
  { city: '丽江', lng: 100.23, lat: 26.87 },
  { city: '张家界', lng: 110.48, lat: 29.12 },
  { city: '绵阳', lng: 104.68, lat: 31.47 },
  { city: '遵义', lng: 106.93, lat: 27.73 },
  { city: '柳州', lng: 109.42, lat: 24.31 },
  { city: '赣州', lng: 114.93, lat: 25.85 },
  { city: '襄阳', lng: 112.14, lat: 32.04 },
  { city: '南通', lng: 120.86, lat: 31.98 },
  { city: '常州', lng: 119.97, lat: 31.81 },
  { city: '惠州', lng: 114.42, lat: 23.11 },
  { city: '中山', lng: 113.39, lat: 22.52 },
  { city: '汕头', lng: 116.68, lat: 23.35 },
  { city: '包头', lng: 109.84, lat: 40.66 },
  { city: '大庆', lng: 125.10, lat: 46.59 },
  { city: '大理', lng: 100.27, lat: 25.61 },
  { city: '喀什', lng: 75.99, lat: 39.47 },
  { city: '芜湖', lng: 118.38, lat: 31.35 },
  { city: '吉林', lng: 126.55, lat: 43.84 },
  { city: '连云港', lng: 119.16, lat: 34.59 },
  { city: '湛江', lng: 110.36, lat: 21.27 },
  { city: '曲靖', lng: 103.80, lat: 25.49 },
]
