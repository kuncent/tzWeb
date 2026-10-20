/* ============================================================
 * 合作高校分布 —— 按城市分组 + 真实经纬度
 * ------------------------------------------------------------
 * 单一真源：首页「合作高校」地图（sections/Customers）。已与《客户名单》
 * 新增合作学校 + 此前公开展示过的标杆院校全量同步（按校名去重），
 * 覆盖约 77 城 / 24+ 省级行政区。status：多为 deployed，挑成都/郑州/
 * 青岛/苏州 4 城标 building 以保留「建设中」锤子施工动画。珠三角等密集
 * 区对相邻城市坐标做了轻微散开，配合地图 labelLayout.hideOverlap 防针重叠，
 * 悬停看该城院校详情（全息板只列前几所，其余以「等 N 所」收口）。
 * 院校名与 Cases 页名录（data/partners）、clientLogos 同源。
 * ============================================================ */
export const MAP_CITIES = [
  /* ―― 直辖市 ―― */
  { city: '北京', lng: 116.4, lat: 39.9, status: 'deployed', schools: ['清华大学', '北京理工大学', '北京财贸职业学院'] },
  { city: '天津', lng: 117.2, lat: 39.13, status: 'deployed', schools: ['天津大学', '天津师范大学', '南开大学'] },
  { city: '上海', lng: 121.47, lat: 31.23, status: 'deployed', schools: ['上海财经大学', '上海商学院', '上海交通大学', '上海立信会计金融学院', '上海杉达学院'] },
  { city: '重庆', lng: 106.55, lat: 29.56, status: 'deployed', schools: ['重庆城市科技学院', '重庆外语外事学院', '重庆第二师范学院', '重庆移通学院', '重庆对外经贸学院', '重庆工商职业学院', '重庆化工职业学院'] },
  /* ―― 华北 ―― */
  { city: '石家庄', lng: 114.51, lat: 38.04, status: 'deployed', schools: ['河北地质大学', '河北政法职业学院', '河北工业职业技术学院'] },
  { city: '保定', lng: 115.48, lat: 38.87, status: 'deployed', schools: ['河北软件职业学院'] },
  { city: '廊坊', lng: 116.7, lat: 39.53, status: 'deployed', schools: ['防灾科技学院'] },
  { city: '承德', lng: 117.93, lat: 40.97, status: 'deployed', schools: ['河北民族师范学院'] },
  /* ―― 东北 ―― */
  { city: '沈阳', lng: 123.43, lat: 41.8, status: 'deployed', schools: ['沈阳工业大学', '辽宁金融职业学院'] },
  { city: '鞍山', lng: 122.99, lat: 41.11, status: 'deployed', schools: ['辽宁科技大学'] },
  { city: '哈尔滨', lng: 126.53, lat: 45.8, status: 'deployed', schools: ['黑龙江工商学院', '黑龙江财经学院'] },
  { city: '齐齐哈尔', lng: 123.92, lat: 47.35, status: 'deployed', schools: ['齐齐哈尔工程学院'] },
  /* ―― 华东 ―― */
  { city: '南京', lng: 118.8, lat: 32.06, status: 'deployed', schools: ['江苏第二师范学院', '南京师范大学', '江苏经贸职业技术学院'] },
  { city: '苏州', lng: 120.58, lat: 31.3, status: 'building', schools: ['苏州大学', '苏州科技大学', '苏州城市学院'] },
  { city: '南通', lng: 120.86, lat: 31.98, status: 'deployed', schools: ['南通理工学院'] },
  { city: '徐州', lng: 117.28, lat: 34.26, status: 'deployed', schools: ['江苏师范大学'] },
  { city: '淮安', lng: 119.02, lat: 33.59, status: 'deployed', schools: ['淮阴工学院'] },
  { city: '杭州', lng: 120.15, lat: 30.27, status: 'deployed', schools: ['浙江大学', '浙江理工大学科技与艺术学院'] },
  { city: '宁波', lng: 121.55, lat: 29.88, status: 'deployed', schools: ['宁波工程学院'] },
  { city: '湖州', lng: 120.09, lat: 30.89, status: 'deployed', schools: ['湖州学院'] },
  { city: '温州', lng: 120.7, lat: 28.0, status: 'deployed', schools: ['温州商学院'] },
  { city: '合肥', lng: 117.28, lat: 31.86, status: 'deployed', schools: ['安徽大学', '安徽建筑大学', '合肥工业大学', '合肥师范学院'] },
  { city: '蚌埠', lng: 117.36, lat: 32.92, status: 'deployed', schools: ['安徽科技学院'] },
  { city: '淮南', lng: 117.0, lat: 32.63, status: 'deployed', schools: ['淮南师范学院'] },
  { city: '铜陵', lng: 117.81, lat: 30.94, status: 'deployed', schools: ['铜陵学院'] },
  { city: '六安', lng: 116.51, lat: 31.74, status: 'deployed', schools: ['皖西学院'] },
  { city: '滁州', lng: 118.32, lat: 32.3, status: 'deployed', schools: ['滁州学院'] },
  { city: '福州', lng: 119.3, lat: 26.08, status: 'deployed', schools: ['福州大学', '福州大学至诚学院', '福建师范大学', '阳光学院', '福州墨尔本理工职业学院'] },
  { city: '厦门', lng: 118.09, lat: 24.48, status: 'deployed', schools: ['集美大学'] },
  { city: '泉州', lng: 118.59, lat: 24.9, status: 'deployed', schools: ['华侨大学'] },
  { city: '漳州', lng: 117.65, lat: 24.51, status: 'deployed', schools: ['闽南师范学院'] },
  { city: '南昌', lng: 115.86, lat: 28.68, status: 'deployed', schools: ['江西财经职业学院'] },
  { city: '赣州', lng: 114.93, lat: 25.85, status: 'deployed', schools: ['江西理工大学'] },
  { city: '济南', lng: 117.0, lat: 36.65, status: 'deployed', schools: ['山东大学', '济南大学', '山东商业职业技术学院'] },
  { city: '青岛', lng: 120.38, lat: 36.07, status: 'building', schools: ['青岛大学'] },
  { city: '潍坊', lng: 119.1, lat: 36.62, status: 'deployed', schools: ['山东畜牧兽医职业学院'] },
  /* ―― 华中 ―― */
  { city: '郑州', lng: 113.63, lat: 34.75, status: 'building', schools: ['河南工业大学', '郑州大学', '郑州西亚斯学院', '郑州师范学院', '郑州经贸学院', '郑州工商学院', '中原科技学院'] },
  { city: '信阳', lng: 114.09, lat: 32.12, status: 'deployed', schools: ['信阳师范学院', '信阳学院'] },
  { city: '南阳', lng: 112.53, lat: 33.0, status: 'deployed', schools: ['南阳师范学院'] },
  { city: '新乡', lng: 113.93, lat: 35.3, status: 'deployed', schools: ['新乡学院'] },
  { city: '安阳', lng: 114.39, lat: 36.1, status: 'deployed', schools: ['安阳学院'] },
  { city: '商丘', lng: 115.66, lat: 34.41, status: 'deployed', schools: ['商丘学院'] },
  { city: '许昌', lng: 113.85, lat: 34.03, status: 'deployed', schools: ['许昌职业技术学院'] },
  { city: '武汉', lng: 114.3, lat: 30.6, status: 'deployed', schools: ['湖北商贸学院', '武昌工学院', '武汉文理学院', '武汉华夏理工学院', '汉口学院'] },
  { city: '黄石', lng: 115.0, lat: 30.2, status: 'deployed', schools: ['湖北师范大学文理学院'] },
  { city: '长沙', lng: 112.94, lat: 28.23, status: 'deployed', schools: ['湖南大学', '湖南工商大学', '中南林业科技大学', '中南大学'] },
  { city: '常德', lng: 111.69, lat: 29.04, status: 'deployed', schools: ['湖南文理学院'] },
  { city: '衡阳', lng: 112.57, lat: 26.9, status: 'deployed', schools: ['湖南工学院'] },
  /* ―― 华南（总部所在，密度最高；珠三角相邻城坐标已轻微散开）―― */
  { city: '广州', lng: 113.35, lat: 23.28, status: 'deployed', schools: ['暨南大学', '华南农业大学', '华南师范大学', '华南理工大学', '广东金融学院', '广东工业大学', '广东技术师范大学', '广东第二师范学院', '广东白云学院', '广东培正学院', '广东新华学院', '广州大学', '广州航海学院', '广州华商学院', '广州理工学院', '广州商学院', '广州应用科技学院', '仲恺农业工程学院', '广东交通职业技术学院', '广东工贸职业技术学院', '广东机电职业技术学院', '广东理工职业学院', '广东科贸职业学院', '广东财贸职业学院', '广东省外语艺术职业学院', '广州科技贸易职业学院', '广州市财经商贸职业学院', '广州市财经商贸职业学校'] },
  { city: '深圳', lng: 114.28, lat: 22.55, status: 'deployed', schools: ['深圳大学', '南方科技大学', '深圳北理莫斯科大学', '深圳职业技术大学', '深圳信息职业技术大学', '哈尔滨工业大学（深圳）', '深圳市龙岗区第二职业技术学校'] },
  { city: '东莞', lng: 113.8, lat: 23.12, status: 'deployed', schools: ['东莞理工学院', '广东科技学院', '东莞职业技术学院'] },
  { city: '佛山', lng: 112.85, lat: 23.02, status: 'deployed', schools: ['佛山大学', '顺德职业技术大学', '广东职业技术学院', '佛山职业技术学院'] },
  { city: '珠海', lng: 113.45, lat: 22.15, status: 'deployed', schools: ['珠海科技学院', '广东科学技术职业学院'] },
  { city: '中山', lng: 113.32, lat: 22.45, status: 'deployed', schools: ['电子科技大学中山学院', '中山职业技术学院'] },
  { city: '江门', lng: 112.95, lat: 22.45, status: 'deployed', schools: ['五邑大学'] },
  { city: '肇庆', lng: 112.47, lat: 23.05, status: 'deployed', schools: ['肇庆学院'] },
  { city: '韶关', lng: 113.6, lat: 24.81, status: 'deployed', schools: ['广东松山职业技术学院'] },
  { city: '河源', lng: 114.7, lat: 23.75, status: 'deployed', schools: ['河源职业技术学院'] },
  { city: '汕头', lng: 116.68, lat: 23.35, status: 'deployed', schools: ['汕头职业技术学院'] },
  { city: '清远', lng: 113.06, lat: 23.7, status: 'deployed', schools: ['清远职业技术学院'] },
  { city: '湛江', lng: 110.36, lat: 21.27, status: 'deployed', schools: ['广东海洋大学'] },
  { city: '茂名', lng: 110.93, lat: 21.66, status: 'deployed', schools: ['广东石油化工学院'] },
  { city: '南宁', lng: 108.37, lat: 22.82, status: 'deployed', schools: ['广西农业职业技术大学', '广西金融职业技术学院'] },
  { city: '柳州', lng: 109.42, lat: 24.31, status: 'deployed', schools: ['柳州工学院'] },
  /* ―― 西南 ―― */
  { city: '成都', lng: 104.07, lat: 30.67, status: 'building', schools: ['西南财经大学', '四川财经职业学院'] },
  { city: '乐山', lng: 103.77, lat: 29.55, status: 'deployed', schools: ['乐山师范学院'] },
  { city: '甘孜', lng: 101.96, lat: 30.05, status: 'deployed', schools: ['四川民族学院'] },
  { city: '贵阳', lng: 106.63, lat: 26.65, status: 'deployed', schools: ['贵阳学院', '贵州财经职业学院'] },
  { city: '兴义', lng: 104.9, lat: 25.09, status: 'deployed', schools: ['兴义民族师范学院'] },
  { city: '昆明', lng: 102.83, lat: 24.88, status: 'deployed', schools: ['云南财经大学'] },
  /* ―― 西北 ―― */
  { city: '西安', lng: 108.94, lat: 34.34, status: 'deployed', schools: ['西安财经大学', '西安工程学院', '西安欧亚学院', '西安明德理工学院', '陕西科技大学镐京学院'] },
  { city: '延安', lng: 109.49, lat: 36.6, status: 'deployed', schools: ['延安大学'] },
  { city: '咸阳', lng: 108.71, lat: 34.33, status: 'deployed', schools: ['咸阳师范学院'] },
  { city: '兰州', lng: 103.83, lat: 36.06, status: 'deployed', schools: ['西北民族大学', '兰州理工大学'] },
  { city: '石河子', lng: 86.08, lat: 44.31, status: 'deployed', schools: ['石河子大学'] },
  { city: '昌吉', lng: 87.31, lat: 44.01, status: 'deployed', schools: ['昌吉学院'] },
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
