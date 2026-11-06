/* ============================================================
 * 内页数据层：解决方案 · 技术 · 实验室 · 案例 · 关于
 * ------------------------------------------------------------
 * 与 business.js 同一条纪律：这里只组织「关系与说法」，凡是要落到
 * 具体数字的地方，一律从 site.js 的既有出口取（productMatrix 的
 * stats、embodiedProducts 的参数、advisorStats 的规模）。内页和首页
 * 说出不一样的一套数，是 B 端官网最容易被客户当场抓住的事故。
 *
 * 另一个刻意：案例墙只写学校的公开属性（类型、所在城市），不写
 * 「某校买了某系统」—— 那类归属我们没有授权口径，写死了就是编造。
 * 深度案例只保留 site.js 里已经写明的北京理工大学一条。
 * ============================================================ */
import {
  Bot,
  Blocks,
  GraduationCap,
  Landmark,
  DatabaseZap,
  Cpu,
  FlaskConical,
  ShieldCheck,
  Network,
  Users,
  Building2,
  Sparkles,
  Server,
  Layers,
  Workflow,
  Radar,
  Boxes,
  Activity,
  BrainCircuit,
  CircuitBoard,
  Lock,
  BadgeCheck,
  MapPin,
  Phone,
  Mail,
  School,
  Lightbulb,
  Wrench,
  Factory,
  Orbit,
  Target,
  Award,
  Rocket,
  PenTool,
  ClipboardList,
  GaugeCircle,
  ScanSearch,
  BookOpenCheck,
  Code2,
  Repeat2,
  FileSearch,
  UserRound,
  Clapperboard,
  Briefcase,
  HardDrive,
  Database,
  GitBranch,
  LineChart,
  Timer,
  Zap,
  KeyRound,
  MonitorSmartphone,
  Handshake,
  Microscope,
  Library,
  Palette,
  Calculator,
  Scale,
  Stethoscope,
  Newspaper,
  Waypoints,
  Globe,
} from 'lucide-react'
import { productMatrix, embodiedProducts, labModules, advisorStats, strengths, customers, caseFeatured } from './site'
import { PRODUCT_NAMES, SOLUTION_NAMES, solutionFullName } from './vocabulary'

/* 从 productMatrix 抠现成的统计，避免内页手抄一份数字 */
const pm = (id) => productMatrix.find((p) => p.id === id)
const stat = (id, k) => {
  const p = pm(id)
  const hit = p?.stats?.find((s) => s.k === k)
  return hit ? hit.v : ''
}

/* 旧的「按场景进入 5 类实验室 / 中心」已随页脚改版下线：
   导航、页脚与搜索统一使用下面的 5 套学科方案（solutionPlans），
   这里不再保留第二套场景名。 */

/* ---------------- 五大实验教学方案（源自公司《天择教育科技·实验教学解决方案》）----------------
   按专业方向整页组织，是解决方案页的唯一主线；方案名与简称统一取自 vocabulary.js。
   每个方案五段式，全部照文档原样录入、不做数字加工：
     · tagline 方案总览口号 + goal 建设目标与定位 + mainline 四位一体主线
     · layers 课程体系建设（基础/核心/进阶/综合四层 × 课程模块↔实验项目↔支撑产品）
     · labs 实验室建设 · practice 实践教学四阶递进
   metrics 的四个数都由本方案自身的结构汇总（课程模块数 / 支撑产品去重数 / 实训空间数 / 实践阶段数）。 */
export const solutionPlans = [
  {
    id: 'digital-economy',
    n: '01',
    icon: Network,
    name: solutionFullName('digital-economy'),
    short: SOLUTION_NAMES['digital-economy'],
    en: 'DIGITAL ECONOMY',
    tagline: '数实融合 · 场景驱动 · 面向数字经济人才培养',
    goal: '对接数字产业化与产业数字化发展需求，围绕“数据要素—数字产业—产业数字—数字治理”构建覆盖数字经济运行全链条的实验教学体系，培养懂技术、通业务、能决策的数字经济应用型人才。',
    mainline: ['数据要素', '数字产业', '产业数字', '数字治理'],
    positioning: '数字经济应用型人才',
    metrics: [
      { k: '课程模块', v: '9 个' },
      { k: '支撑产品', v: '8 套' },
      { k: '实训空间', v: '3 区' },
      { k: '实践阶段', v: '四阶' },
    ],
    products: ['数字经济基础综合实验平台', '数字供应链实验系统', '数字征信实验系统', '数字人民币实验系统', '数字营销实验系统', '数字经济与 AI 智能大数据综合实验系统', '电商互联网产品开发实验系统', '数字贸易实验系统'],
    layers: [
      { key: 'base', name: '基础课程层', en: 'FOUNDATION', modules: [
        { module: '数字经济基础', projects: ['数据采集实验', '数据确权与定价', '数据交易实验'], product: '数字经济基础综合实验平台 · 25 个实验项目' },
        { module: '数字技术认知', projects: ['图像识别 / OCR 实验', '语音与 NLP 实验', '5G 与云计算实验'], product: '数字经济基础综合实验平台' },
      ] },
      { key: 'core', name: '核心技能层', en: 'CORE SKILLS', modules: [
        { module: '数字供应链运营', projects: ['应收账款转让业务', '资信与债项调查', '数字债权凭证'], product: '数字供应链实验系统 · 7 个实验项目' },
        { module: '数字征信与风控', projects: ['征信画像 9 项实验', '个人征信评级', '企业征信评分卡'], product: '数字征信实验系统 · 19 个实验项目 / 14 学时' },
      ] },
      { key: 'adv', name: '进阶实战层', en: 'ADVANCED', modules: [
        { module: '数字货币与支付', projects: ['额度控制位演练', '智能合约演练', '数字人民币反洗钱'], product: '数字人民币实验系统 · 7 个实验项目 / 10 学时' },
        { module: '数字营销与贸易', projects: ['用户画像 RFM 分析', 'BI 可视化大屏', '跨境数字贸易实操'], product: '数字营销实验系统 · 14 个实验项目' },
        { module: '大数据与 AI', projects: ['数据获取与清洗', '分类 / 回归 / 聚类建模', '行业应用案例'], product: '数字经济与 AI 智能大数据综合实验系统 · 27 个实验项目 / 48 学时' },
      ] },
      { key: 'integrate', name: '综合创新层', en: 'INNOVATION', modules: [
        { module: '数字治理与碳金融', projects: ['碳配额 / 碳排放', '碳定价与碳交易'], product: '数字经济基础综合实验平台' },
        { module: '电商产品开发', projects: ['市场需求挖掘', '数据化选品与定价', '投放测试与优化'], product: '电商互联网产品开发实验系统 · 18 个实验项目' },
        { module: '数字贸易综合', projects: ['13 章 57 个实务项目', '多边央行数字货币桥'], product: '数字贸易实验系统 · 57 个实验项目' },
      ] },
    ],
    labs: [
      { name: '数字经济综合实训室', desc: '以数据可视化驾驶舱为核心，动态呈现区域数字经济运行指标。' },
      { name: '数字贸易实训平台', desc: '覆盖电商互联网产品开发全流程，支撑数字贸易业务实训。' },
      { name: 'AI 大数据分析平台', desc: 'Python 在线编程环境，内置超百个实验项目与行业数据仓库。' },
    ],
    practice: [
      { stage: '实验教学', en: 'TEACHING', systems: ['数字经济基础综合实验平台', '数字人民币实验系统'] },
      { stage: '实训教学', en: 'TRAINING', systems: ['数字供应链实验系统', '数字征信实验系统'] },
      { stage: '竞赛演练', en: 'COMPETITION', systems: ['数字经济与 AI 智能大数据综合实验系统', '数字营销实验系统'] },
      { stage: '科研创新', en: 'RESEARCH', systems: ['数字贸易实验系统', '电商互联网产品开发实验系统'] },
    ],
  },
  {
    id: 'fintech',
    n: '02',
    icon: Landmark,
    name: solutionFullName('fintech'),
    short: SOLUTION_NAMES.fintech,
    en: 'FINTECH',
    tagline: '数智融合 · 产教协同 · 面向金融科技人才培养',
    goal: '面向金融数字化转型的人才需求，构建“金融基础—智能投顾—风险量化—金融科技”四位一体的金融科技实验教学体系，培养既懂金融业务又能驾驭数据与算法的复合型金融科技人才。',
    mainline: ['金融基础', '智能投顾', '风险量化', '金融科技'],
    positioning: '复合型金融科技人才',
    metrics: [
      { k: '课程模块', v: '10 个' },
      { k: '支撑产品', v: '9 套' },
      { k: '实训空间', v: '3 区' },
      { k: '实践阶段', v: '四阶' },
    ],
    products: ['公司金融实验系统', '金融模拟交易系统', '智能理财分析教学系统', '金融风险管理实验平台', '量化投资交易系统 / 金融建模实验平台', '区块链基础实验平台', 'AI 智能投顾机器人', '供应链金融融资实验系统', '财商素养游戏互动系统'],
    layers: [
      { key: 'base', name: '基础课程层', en: 'FOUNDATION', modules: [
        { module: '金融业务基础', projects: ['收益与风险度量', '现值与价值评估', '投资决策分析', '融资决策分析'], product: '公司金融实验系统 · 18 个实验项目' },
        { module: '公司财务分析', projects: ['三大报表分析', '杜邦分析', '财务预警 Z 值模型'], product: '公司金融实验系统' },
      ] },
      { key: 'core', name: '核心技能层', en: 'CORE SKILLS', modules: [
        { module: '证券投资交易', projects: ['股票 / 基金 / 期货模拟交易', '技术分析与基本面分析'], product: '金融模拟交易系统 · 7 个实验项目' },
        { module: '智能理财规划', projects: ['家庭风险测评', '教育 / 消费 / 退休规划', '保险与投资规划', '税务筹划'], product: '智能理财分析教学系统 · 13 个实验项目' },
      ] },
      { key: 'adv', name: '进阶实战层', en: 'ADVANCED', modules: [
        { module: '金融风险管理', projects: ['波动率模型 ARCH / GARCH', '蒙特卡罗模拟', 'VaR 与压力测试', '希腊字母计算'], product: '金融风险管理实验平台 · 39 个实验项目' },
        { module: '量化策略开发', projects: ['双均线 / 布林线策略', '网格与跨品种套利', 'Tick 级回测'], product: '量化投资交易系统 / 金融建模实验平台' },
        { module: '区块链金融', projects: ['数字签名与区块', '智能合约模拟', '数字货币桥实验'], product: '区块链基础实验平台 · 17 个实验项目' },
      ] },
      { key: 'integrate', name: '综合创新层', en: 'INNOVATION', modules: [
        { module: 'AI 智能投顾实战', projects: ['用户画像构建', '投资组合优化', '智能调仓建议'], product: 'AI 智能投顾机器人' },
        { module: '供应链金融综合', projects: ['存货质押 / 保兑仓', '保理融资综合实验'], product: '供应链金融融资实验系统 · 7 种业务模式' },
        { module: '财商与竞赛', projects: ['财商游戏化实训', '金融模拟交易大赛'], product: '财商素养游戏互动系统 · 7 个实验项目' },
      ] },
    ],
    labs: [
      { name: '金融科技综合实训室', desc: '以交易大厅实景为核心，配备金融模拟交易系统与实时行情终端，还原真实金融业务场景。' },
      { name: 'AI 智能投顾体验区', desc: '部署 AI 智能投顾机器人与智能理财分析系统，开展智能资产配置与风险测评实训。' },
      { name: '金融场景学习地图', desc: '以可视化金融产品全景地图支撑产品认知与业务流程教学。' },
    ],
    practice: [
      { stage: '实验教学', en: 'TEACHING', systems: ['公司金融实验系统', '金融风险管理实验平台'] },
      { stage: '实训教学', en: 'TRAINING', systems: ['智能理财分析教学系统', '财商素养游戏互动系统'] },
      { stage: '竞赛演练', en: 'COMPETITION', systems: ['AI 智能投顾机器人', '金融模拟交易系统'] },
      { stage: '科研创新', en: 'RESEARCH', systems: ['量化投资交易系统 / 金融建模实验平台', '供应链金融融资实验系统'] },
    ],
  },
  {
    id: 'applied-statistics',
    n: '03',
    icon: LineChart,
    name: solutionFullName('applied-statistics'),
    short: SOLUTION_NAMES['applied-statistics'],
    en: 'APPLIED STATISTICS',
    tagline: '数据洞察 · 智能分析 · 面向数据科学人才培养',
    goal: '面向大数据与人工智能时代的数据人才需求，以“统计方法—编程实现—业务建模—决策支持”为主线构建应用统计实验教学体系，培养能够独立完成数据采集、建模分析与商业决策的数据科学应用型人才。',
    mainline: ['统计方法', '编程实现', '业务建模', '决策支持'],
    positioning: '数据科学应用型人才',
    metrics: [
      { k: '课程模块', v: '9 个' },
      { k: '支撑产品', v: '8 套' },
      { k: '实训空间', v: '3 区' },
      { k: '实践阶段', v: '四阶' },
    ],
    products: ['金融大数据分析挖掘平台', '数字营销实验系统', '机器学习实验系统', '金融风险管理实验平台', '量化投资交易系统 / 金融建模实验平台', '区块链基础实验平台', '数字经济与 AI 智能大数据综合实验系统', 'AI 智能陪练系统'],
    layers: [
      { key: 'base', name: '基础课程层', en: 'FOUNDATION', modules: [
        { module: 'Python 编程基础', projects: ['Python 基础语法', 'NumPy 数值计算', 'pandas 统计分析'], product: '金融大数据分析挖掘平台 · 35 个实验项目' },
        { module: '统计学基础', projects: ['描述性统计', '概率分布', '参数估计与检验'], product: '金融大数据分析挖掘平台' },
      ] },
      { key: 'core', name: '核心技能层', en: 'CORE SKILLS', modules: [
        { module: '数据可视化', projects: ['Matplotlib 绘图', 'BI 大屏设计', '多维数据呈现'], product: '数字营销实验系统 · BI 可视化分析模块' },
        { module: '机器学习建模', projects: ['线性 / 逻辑回归', '决策树与随机森林', '聚类与分群'], product: '机器学习实验系统 · 7 类模型实验' },
      ] },
      { key: 'adv', name: '进阶实战层', en: 'ADVANCED', modules: [
        { module: '金融大数据分析', projects: ['金融数据爬取', '时间序列建模', '风险指标计算'], product: '金融风险管理实验平台 · 39 个实验项目' },
        { module: '量化与建模', projects: ['因子回测框架', '策略绩效评估'], product: '量化投资交易系统 / 金融建模实验平台' },
        { module: '区块链数据应用', projects: ['Merkle 树与时间戳', '多边央行数字货币桥'], product: '区块链基础实验平台 · 17 个实验项目' },
      ] },
      { key: 'integrate', name: '综合创新层', en: 'INNOVATION', modules: [
        { module: '行业综合案例', projects: ['行业数据分析', 'AI 学情分析报告'], product: '数字经济与 AI 智能大数据综合实验系统 · 27 个实验项目 / 48 学时' },
        { module: '竞赛与毕设', projects: ['数据建模竞赛', '毕业综合实践'], product: 'AI 智能陪练系统 · 30+ 话术训练场景' },
      ] },
    ],
    labs: [
      { name: '数据可视化驾驶舱实训区', desc: '多维度数据大屏支撑数据呈现与商业分析教学。' },
      { name: '实时行情数据分析区', desc: '以实时行情跑马灯与多维行情数据开展时间序列与统计分析实训。' },
      { name: 'AI 智能陪练实训区', desc: '智能陪练系统提供人机对练与即时点评，强化数据分析应用能力。' },
    ],
    practice: [
      { stage: '实验教学', en: 'TEACHING', systems: ['金融大数据分析挖掘平台', '机器学习实验系统'] },
      { stage: '实训教学', en: 'TRAINING', systems: ['量化投资交易系统 / 金融建模实验平台', '金融风险管理实验平台'] },
      { stage: '竞赛演练', en: 'COMPETITION', systems: ['区块链基础实验平台', '数字经济与 AI 智能大数据综合实验系统'] },
      { stage: '科研创新', en: 'RESEARCH', systems: ['AI 智能陪练系统', '智能理财分析教学系统'] },
    ],
  },
  {
    id: 'business-analytics',
    n: '04',
    icon: Briefcase,
    name: solutionFullName('business-analytics'),
    short: SOLUTION_NAMES['business-analytics'],
    en: 'BUSINESS ANALYTICS',
    tagline: '商数融合 · 决策驱动 · 面向商业分析人才培养',
    goal: '面向企业数字化转型中的商科人才需求，以“业务提问—数据分析—可视化呈现—经营决策”为主线构建商务数据分析实验教学体系，培养能用真实经营数据讲好商业故事的复合型商业分析人才。',
    mainline: ['业务提问', '数据分析', '可视化呈现', '经营决策'],
    positioning: '复合型商业分析人才',
    metrics: [
      { k: '课程模块', v: '8 个' },
      { k: '支撑产品', v: '7 套' },
      { k: '实训空间', v: '3 区' },
      { k: '实践阶段', v: '四阶' },
    ],
    products: ['数字经济与 AI 智能大数据综合实验系统', '金融大数据分析挖掘平台', '数字营销实验系统', '数字供应链实验系统', '电商互联网产品开发实验系统', '机器学习实验系统', 'AI 智能陪练系统'],
    layers: [
      { key: 'base', name: '基础课程层', en: 'FOUNDATION', modules: [
        { module: '商业数据通识', projects: ['数据采集与标注', '数据质量评估', '商业指标体系认知'], product: '数字经济与 AI 智能大数据综合实验系统 · 27 个实验项目 / 48 学时' },
        { module: '分析工具入门', projects: ['Excel / BI 报表', 'SQL 取数', 'Python pandas 基础'], product: '金融大数据分析挖掘平台' },
      ] },
      { key: 'core', name: '核心技能层', en: 'CORE SKILLS', modules: [
        { module: '营销数据分析', projects: ['用户画像 RFM 分析', '投放效果复盘', '转化漏斗分析'], product: '数字营销实验系统 · 14 个实验项目' },
        { module: '运营与供应链分析', projects: ['库存周转分析', '需求预测', '履约路径优化'], product: '数字供应链实验系统 · 7 个实验项目' },
      ] },
      { key: 'adv', name: '进阶实战层', en: 'ADVANCED', modules: [
        { module: '电商经营分析', projects: ['数据化选品与定价', '流量结构分析', '投放测试与优化'], product: '电商互联网产品开发实验系统 · 18 个实验项目' },
        { module: '机器学习商业应用', projects: ['流失预警模型', '销量预测', '客户分群'], product: '机器学习实验系统 · 7 类模型实验' },
      ] },
      { key: 'integrate', name: '综合创新层', en: 'INNOVATION', modules: [
        { module: '经营决策综合', projects: ['经营决策沙盘推演', '商业分析报告撰写'], product: '数字经济与 AI 智能大数据综合实验系统' },
        { module: '竞赛与毕设', projects: ['商业分析案例大赛', '毕业综合实践'], product: 'AI 智能陪练系统 · 30+ 话术训练场景' },
      ] },
    ],
    labs: [
      { name: '商务大数据分析实训室', desc: '服务器集群 + 实训终端，内置真实企业经营数据集，支撑 40 人同堂实训。' },
      { name: '数字营销与用户洞察实训区', desc: '以数字营销实验系统开展用户画像、投放复盘的对抗式教学。' },
      { name: '数智经营决策创新空间', desc: '经营决策沙盘 + 分析报告工作坊，支持跨专业联合项目进驻。' },
    ],
    practice: [
      { stage: '实验教学', en: 'TEACHING', systems: ['数字经济与 AI 智能大数据综合实验系统', '机器学习实验系统'] },
      { stage: '实训教学', en: 'TRAINING', systems: ['数字营销实验系统', '数字供应链实验系统'] },
      { stage: '竞赛演练', en: 'COMPETITION', systems: ['电商互联网产品开发实验系统', '数字营销实验系统'] },
      { stage: '科研创新', en: 'RESEARCH', systems: ['AI 智能陪练系统', '数字经济与 AI 智能大数据综合实验系统'] },
    ],
  },
  {
    id: 'biz-tech-integration',
    n: '05',
    icon: Blocks,
    name: solutionFullName('biz-tech-integration'),
    short: SOLUTION_NAMES['biz-tech-integration'],
    en: 'BIZ-TECH INTEGRATION',
    tagline: '工商融合 · 软硬一体 · 面向复合应用人才培养',
    goal: '面向智能制造与数智经营交叉的人才需求，以“产线数据采集—数据治理—经营分析—优化决策”的闭环组织实验教学，让工科生懂经营、商科生懂技术，培养跨学科复合应用型人才。',
    mainline: ['工业认知', '数据采集', '治理分析', '经营决策'],
    positioning: '跨学科复合应用型人才',
    metrics: [
      { k: '课程模块', v: '8 个' },
      { k: '支撑产品', v: '6 套' },
      { k: '实训空间', v: '3 区' },
      { k: '实践阶段', v: '四阶' },
    ],
    products: ['智能制造产线', '工业数据采集实训台', '工业智能视觉实训台', '工业互联网基础实训箱', '工业大数据治理实训箱', '数字经济与 AI 智能大数据综合实验系统'],
    layers: [
      { key: 'base', name: '基础课程层', en: 'FOUNDATION', modules: [
        { module: '智能制造认知', projects: ['产线工位认知', '工业数据通识', '现场安全规范'], product: '智能制造产线 · 认知实训' },
        { module: '工业互联网基础', projects: ['传感器认知', '工业网络拓扑', '边缘网关入门'], product: '工业互联网基础实训箱' },
      ] },
      { key: 'core', name: '核心技能层', en: 'CORE SKILLS', modules: [
        { module: '工业数据采集', projects: ['PLC 数据接入', 'OPC UA 协议实训', '边缘采集部署'], product: '工业数据采集实训台 · 20+ 工业协议' },
        { module: '工业数据治理', projects: ['数据清洗与对齐', '时序数据存储', '数据资产编目'], product: '工业大数据治理实训箱' },
      ] },
      { key: 'adv', name: '进阶实战层', en: 'ADVANCED', modules: [
        { module: '机器视觉质检', projects: ['缺陷检测建模', '视觉工位联调', '良率统计分析'], product: '工业智能视觉实训台' },
        { module: '产线经营分析', projects: ['OEE 设备效率分析', '成本与能耗分析', '排产优化仿真'], product: '智能制造产线 · MES 数据看板' },
      ] },
      { key: 'integrate', name: '综合创新层', en: 'INNOVATION', modules: [
        { module: '工商科联合项目', projects: ['产线数据资产化', '数字孪生经营沙盘'], product: '数字经济与 AI 智能大数据综合实验系统' },
        { module: '竞赛与毕设', projects: ['智能制造大赛', '跨专业毕业设计'], product: '智能制造产线 + 工业大数据治理实训箱' },
      ] },
    ],
    labs: [
      { name: '工业互联网与数据采集实验室', desc: '以工业数据采集实训台与实训箱为核心，完成工业现场数据「采得到、传得回」的基础训练。' },
      { name: '智能制造产线实训中心', desc: '上料、输送、检测、装配、仓储全流程工位，真实产线跑起来，数据自然流出来。' },
      { name: '工商科融合运营创新空间', desc: '用产线真实数据做经营决策，商科与工科同上一堂课。' },
    ],
    practice: [
      { stage: '实验教学', en: 'TEACHING', systems: ['工业互联网基础实训箱', '工业数据采集实训台'] },
      { stage: '实训教学', en: 'TRAINING', systems: ['工业智能视觉实训台', '智能制造产线'] },
      { stage: '竞赛演练', en: 'COMPETITION', systems: ['智能制造产线', '工业大数据治理实训箱'] },
      { stage: '科研创新', en: 'RESEARCH', systems: ['工业大数据治理实训箱', '数字经济与 AI 智能大数据综合实验系统'] },
    ],
  },
]

/* ---------------- 按学科进入：学科群 → 能开什么 ----------------
   为什么要有这条线：场景是按「建什么」切的，但院系申报专业时是按
   学科目录想的。同一套系统，两个入口的说法必须都给。 */
export const disciplineGroups = [
  {
    id: 'info',
    name: '人工智能与信息学科',
    en: 'AI & INFORMATION',
    icon: BrainCircuit,
    majors: ['人工智能', '软件工程', '数据科学与大数据技术', '物联网工程', '网络空间安全'],
    use: [PRODUCT_NAMES.class, PRODUCT_NAMES['digital-economy'], PRODUCT_NAMES.blockchain],
    courses: '机器学习、AIGC 与大模型、大数据 ETL、分布式账本',
  },
  {
    id: 'finance',
    name: '经济与金融学科',
    en: 'ECONOMICS & FINANCE',
    icon: Landmark,
    majors: ['金融科技', '金融学', '金融工程', '经济学', '数字经济', '投资学'],
    use: [solutionFullName('fintech'), solutionFullName('digital-economy'), PRODUCT_NAMES['digital-finance']],
    courses: '金融产品设计、证券投资、金融大数据分析、量化交易',
  },
  {
    id: 'robot',
    name: '机器人与智能制造学科',
    en: 'ROBOTICS & MANUFACTURING',
    icon: Bot,
    majors: ['机器人工程', '自动化', '机械设计制造及其自动化', '智能制造工程'],
    use: [solutionFullName('biz-tech-integration'), PRODUCT_NAMES.embodied, '多机协同实验'],
    courses: '机器人学、运动控制、SLAM 导航、产线虚拟调试',
  },
  {
    id: 'math',
    name: '数学与统计学科',
    en: 'MATHEMATICS & STATISTICS',
    icon: Calculator,
    majors: ['应用数学', '统计学', '应用统计学', '数据计算及应用'],
    use: [solutionFullName('applied-statistics'), PRODUCT_NAMES['digital-economy'], '量化挖掘终端'],
    courses: '数值计算、统计建模、时间序列、最优化方法',
  },
  {
    id: 'biz',
    name: '管理与商务学科',
    en: 'MANAGEMENT & BUSINESS',
    icon: Briefcase,
    majors: ['工商管理', '市场营销', '电子商务', '供应链管理', '财务管理'],
    use: [solutionFullName('business-analytics'), '数字营销实战', solutionFullName('biz-tech-integration')],
    courses: '商业智能、用户运营、供应链数据分析、经营决策模拟',
  },
  {
    id: 'humanities',
    name: '新文科与艺术设计学科',
    en: 'LIBERAL ARTS & DESIGN',
    icon: Palette,
    majors: ['新闻传播学', '数字媒体艺术', '外语', '公共管理'],
    use: ['03 AI 多智能体课堂', 'AIGC 内容生成实验', '课件与作品导出'],
    courses: '数字内容生产、智能传播、虚拟展厅、AI 辅助设计',
  },
  {
    id: 'med',
    name: '医药与生命科学学科',
    en: 'MEDICINE & LIFE SCIENCE',
    icon: Stethoscope,
    majors: ['生物医学工程', '药学', '护理学', '临床医学'],
    use: [PRODUCT_NAMES['digital-economy'], PRODUCT_NAMES.class, '医学大数据实训'],
    courses: '医学影像处理、生理信号分析、虚拟解剖与操作',
  },
]

/* ---------------- 技术方向内页：四大底座的展开 ----------------
   techBases（business.js）给的是架构图上的一句话，这里给可验证的
   组成与参数。参数全部来自 site.js 里已经写明的产品规格。 */
export const techDetail = [
  {
    id: 'agent',
    n: 'T1',
    icon: GraduationCap,
    name: '多智能体课堂引擎',
    en: 'MULTI-AGENT CLASSROOM',
    thesis: 'AI 不该只是一个聊天框。我们把课堂拆成四种角色，用状态机编排它们的发言与节奏，让「互动」是可设计的，而不是碰运气。',
    specs: [
      { k: '课堂角色', v: '4 类' },
      { k: '生成一堂课', v: stat('class', '生成一堂课') },
      { k: '课堂组件', v: stat('class', '课堂组件') },
    ],
    parts: [
      { t: '导演智能体', d: '基于状态机决定谁在什么时候说话，协调多智能体丝滑衔接' },
      { t: '教师 / 同学 / 助教', d: '语音讲解与白板板书、主动提问辩论、课后单独补课' },
      { t: '两阶段生成流水线', d: '先出教学大纲，再装配讲解幻灯、随堂提问、互动模拟与项目任务' },
      { t: '协议与二次开发', d: '开放的课堂协议与描述文件规范，支持私有化部署与扩展' },
    ],
    models: ['DeepSeek', 'GLM', 'Kimi', '通义千问', '可换 / 可本地化'],
  },
  {
    id: 'nl2exp',
    n: 'T2',
    icon: Code2,
    name: '自然语言实验引擎',
    en: 'LANGUAGE TO LAB',
    thesis: '实验的门槛应该是「说得清要做什么」，而不是「会写代码」。一句话描述任务，生成规范代码，在隔离沙箱里跑起来并给出评分。',
    specs: [
      { k: '支持语言', v: '3 种' },
      { k: '沙箱启动', v: '秒级' },
      { k: '报错处理', v: '自动定位讲解' },
    ],
    parts: [
      { t: '三语言生成', d: 'Python / C++ / Solidity，覆盖数据分析、机器人控制与智能合约' },
      { t: '云端隔离沙箱', d: '代码在受控环境执行，资源配额与网络隔离，结果可视化回放' },
      { t: '闭环研究引擎', d: '课堂数据 → AI 分析 → 参数网格搜索 → 内容迭代，形成自我强化的研究闭环' },
      { t: '查重与评分', d: '代码相似度检测与自动评分，教师拿到的是可复核的过程证据' },
    ],
    models: ['代码模型可配', '教师自定义模板', '校本题库注入'],
  },
  {
    id: 'twin',
    n: 'T3',
    icon: FlaskConical,
    name: '数字孪生与仿真底座',
    en: 'DIGITAL TWIN & SIM2REAL',
    thesis: '真机很贵，事故不可逆。设备先以 1:1 模型进虚拟环境，学生把错误都犯完，再碰真机器。',
    specs: [
      { k: '机械臂重复精度', v: '±0.05 mm' },
      { k: '端侧算力', v: '120 TOPS' },
      { k: '过程回放', v: '支持' },
    ],
    parts: [
      { t: '设备级孪生建模', d: '机械臂、移动底盘、产线设备按真实运动学参数建模' },
      { t: '操作风险预警', d: '碰撞检测与工作空间约束，异常动作先拦截再提示' },
      { t: '一键回滚与回放', d: '实训过程全量记录，可回退到任意时间点复盘' },
      { t: 'Sim2Real 数据通路', d: '仿真侧采集轨迹与图像数据，训练策略后迁移真机验证' },
    ],
    models: ['ROS 2 / SDK 对接', 'WebGL 实时渲染', '真机联动'],
  },
  {
    id: 'ledger',
    n: 'T4',
    icon: Blocks,
    name: '可信账本与数据底座',
    en: 'LEDGER & DATA INFRA',
    thesis: '教学系统里的数据也要能被信任。链上存证与多链聚合同源入仓，学情与实训记录可复查、不可篡改。',
    specs: [
      { k: '共识节点', v: '6 节点' },
      { k: '覆盖公链', v: stat('blockchain', '覆盖公链') },
      { k: '日度聚合', v: '933 组' },
    ],
    parts: [
      { t: '联盟链环境', d: '校内可部署的共识集群，合约 IDE、部署流水线与区块浏览器齐备' },
      { t: '多链数据聚合', d: '区块、交易、合约方法调用对齐到同一套时间坐标系，支持小时 / 日度下钻' },
      { t: '身份与凭证', d: '校园身份统一登录，钱包随身份签发，成绩与证书可上链存证' },
      { t: '算力与存储底座', d: 'NEX-C1 边缘算力单元与云端实验沙箱弹性调度' },
    ],
    models: ['ERC20 / 721 / 1155', '合约模板库', '态势大屏'],
  },
]

/* 技术内页的工程纪律段：B 端客户一定会问「稳不稳、安不安全」 */
export const techAssurance = [
  { icon: ShieldCheck, title: '数据主权', desc: '全栈私有化可选，数据不出校；逻辑隔离与操作审计留痕。' },
  { icon: Lock, title: '内容安全', desc: '生成内容审核与课堂发言护栏，敏感操作需教师确认。' },
  { icon: GaugeCircle, title: '高并发', desc: '万人同课上考无感体验，秒级任务下发，多点备份保障。' },
  { icon: KeyRound, title: '信创适配', desc: '国产芯片与操作系统环境适配，可对接统一身份认证。' },
  { icon: GitBranch, title: '开放接口', desc: '开放 API 与插件机制，支持二次开发、源码授权可选。' },
  { icon: Repeat2, title: '可回滚', desc: '实验环境一键回滚，版本与配置可追溯，教学事故可复盘。' },
]

/* ---------------- 实验室清单内页：设备与交付 ----------------
   embodiedProducts / labModules 是既有出口，这里只补「谁在用、
   怎么排」这两件首页没空间讲的事。model 字段指向 public/models
   下真实存在的 GLB，供 3D 转台取用。
   刻意不给 NEX-V1 / NEX-C1 配模型：仓库里没有相机模组与算力盒的
   资产，硬套一个人形或机械臂上去，就是把「示意」说成「实物」。
   这两台在页面上走参数卡，不装 3D。 */
export const labRigs = [
  { code: 'NEX-H1', model: '/models/h2-official.glb', use: '双足步态、全身协调、人机交互课题' },
  { code: 'NEX-A6', model: '/models/z1-min.glb', use: '抓取与视觉伺服、力控示教、产线工位' },
  { code: 'NEX-M2', model: '/models/go2-official.glb', use: '四足运动控制、复杂地形通过、巡检演练' },
  { code: 'NEX-W1', model: '/models/turtlebot3-min.glb', use: 'SLAM 建图、路径规划、多机协同入门' },
  { code: 'NEX-V1', model: null, use: '标定与深度估计实验、具身数据采集与回放' },
  { code: 'NEX-C1', model: null, use: '端侧推理、模型量化与实时决策课题' },
]

export const labCourseStages = [
  { n: 'S1', name: '认知与基础', weeks: '第 1–4 周', desc: '设备认知、安全规范、基础编程与仿真环境上手。', out: '安全操作资格 + 仿真作业' },
  { n: 'S2', name: '单项技能', weeks: '第 5–10 周', desc: '抓取、建图、导航、控制四类单项实验，逐项打分。', out: '单项实验报告集' },
  { n: 'S3', name: '系统集成', weeks: '第 11–16 周', desc: '多设备协同完成一条完整任务链，小组制交付。', out: '可演示的系统作品' },
  { n: 'S4', name: '创新与竞赛', weeks: '第 17 周起', desc: '自选课题 + 赛项选题，接入企业真实数据集与需求。', out: '竞赛成果 / 孵化项目' },
]

export const labSafety = [
  { icon: Radar, title: '先虚拟后真机', desc: '所有真机操作前必须在孪生环境通过考核，系统卡住流程。' },
  { icon: Activity, title: '实时操作预警', desc: '碰撞、超程、超速在触发前提示，教师端同步收到事件。' },
  { icon: Timer, title: '过程可回放', desc: '每一次上电与执行都留痕，事故复盘能回到具体一帧。' },
  { icon: Users, title: '开放管理机制', desc: '预约、门禁、设备台账与耗材统计，支持课后开放时段。' },
]

/* ---------------- 案例墙 ----------------
   只写学校的公开属性（类型 / 城市），不写采购内容。 */
export const caseWall = [
  { name: '清华大学', type: '综合类', city: '北京', tag: 'top' },
  { name: '浙江大学', type: '综合类', city: '杭州', tag: 'top' },
  { name: '上海交通大学', type: '综合类', city: '上海', tag: 'top' },
  { name: '北京理工大学', type: '理工类', city: '北京', tag: 'deep' },
  { name: '华南理工大学', type: '理工类', city: '广州', tag: 'top' },
  { name: '哈尔滨工业大学（深圳）', type: '理工类', city: '深圳', tag: 'top' },
  { name: '北理莫斯科大学', type: '中外合作', city: '深圳', tag: 'foreign' },
  { name: '深圳职业技术大学', type: '职业本科', city: '深圳', tag: 'vocational' },
  /* ―― 以下为案例集里可对外展示的标杆实验室院校 ―― */
  { name: '广东技术师范大学', type: '师范类', city: '广州', tag: 'lab' },
  { name: '兴义民族师范学院', type: '民族师范', city: '兴义', tag: 'lab' },
  { name: '广东财贸职业学院', type: '职业学院', city: '广州', tag: 'lab' },
  { name: '广西金融职业技术学院', type: '高职', city: '南宁', tag: 'lab' },
  { name: '广东培正学院', type: '民办本科', city: '广州', tag: 'lab' },
  { name: '湖北商贸学院', type: '本科', city: '武汉', tag: 'lab' },
  { name: '郑州西亚斯学院', type: '本科', city: '郑州', tag: 'lab' },
  { name: '西安明德理工学院', type: '理工类', city: '西安', tag: 'lab' },
]

export const caseFilters = [
  { id: 'all', label: '全部院校' },
  { id: 'top', label: '双一流理工 / 综合' },
  { id: 'lab', label: '标杆实验室案例' },
  { id: 'vocational', label: '职业本科' },
  { id: 'foreign', label: '中外合作' },
]

/* ---------------- 标杆实验室建设案例集（源自公司《高校专业实验室设计建设案例集》）----------------
   与案例墙「只写公开属性」的纪律不同：这里的九条是公司自己整理、可对外展示的
   经典交付案例，内容（院校 / 实验室 / 面积机位 / 软硬件配置）均来自该案例集原文，
   不做数字加工。展示形态做成深色科技控制台：左轨点选、右板详情联动。 */
export const labCases = [
  {
    id: 'sinos-moscow', n: '01', icon: Landmark,
    school: '深圳北理莫斯科大学', lab: '数字经管实验教学中心', en: 'DIGITAL ECONOMICS & MANAGEMENT EXPERIMENT CENTER',
    city: '深圳', province: '广东', year: '2025.07', type: '中外合作 · 研究中心',
    summary: '基于毛坯条件整体建设，依托虚拟仿真、云计算、区块链、大数据，把四个实验室合成一个统一的经济管理实验教学中心，集教学、实验、科研、资源于一体。',
    specs: [ { k: '中心面积', v: '955㎡' }, { k: '下设实验室', v: '4 个' }, { k: '支撑专业', v: '3 个' } ],
    regions: ['金融投资与分析实验室', '金融科技与创新实验室', '智能决策与分析实验室', '运营管理与模拟实验室'],
    hardware: ['LED 显示屏 · 弧形金融行情跑马灯', '精品录播 · 高清投影 · 服务器', 'E-Prime · 眼动追踪 · 脑电采集 · Plux 生理信号', 'XR 感知智能研创平台 · 4D 数字工厂 AR 智能沙盘'],
    software: ['区块链金融研究系统', '投资银行 / 量化投资交易', '智能投顾 · Python 金融分析', '多模态行为数据采集分析'],
    highlight: '中心揭牌仪式 2025 年 11 月，覆盖应用经济学、国际经济与贸易、金融科技三专业学科建设与前沿科研。',
    imgs: ['/images/labcases/lab-01-1.webp', '/images/labcases/lab-01-2.webp', '/images/labcases/lab-01-3.webp', '/images/labcases/lab-01-4.webp', '/images/labcases/lab-01-5.webp', '/images/labcases/lab-01-6.webp', '/images/labcases/lab-01-7.webp', '/images/labcases/lab-01-8.webp'],
  },
  {
    id: 'gpnu-digital', n: '02', icon: BrainCircuit,
    school: '广东技术师范大学', lab: '数字经济创新实验室', en: 'DIGITAL ECONOMY INNOVATION LAB',
    city: '广州', province: '广东', year: '2025.04', type: '师范类 · 本科',
    summary: '服务财经学院数字经济、金融科技专业的实践与创新实验室，高仿真场景 + 全球行情实时展示，兼顾沙盘体验与虚拟仿真教学。',
    specs: [ { k: '面积', v: '160㎡' }, { k: '学生机位', v: '56' }, { k: '教师机位', v: '1' } ],
    regions: ['金融数据实时可视化分析', '智能投研模拟', '区块链技术应用', '虚拟仿真教学'],
    hardware: ['LED 数据可视化大屏', '金融行情跑马灯 · 多点触控平台', 'AI 云平台摄像机 · 录播系统'],
    software: ['金融行情数据可视化系统', '金融模拟交易系统', '金融科技实训教学平台', '区块链金融应用平台', '数字经济多点触控虚拟仿真平台'],
    highlight: '多屏交互 + AI 云平台 + 智能环境控制，打造教学、科研、产业应用一体的数字化平台。',
    imgs: ['/images/labcases/lab-02-1.webp', '/images/labcases/lab-02-2.webp'],
  },
  {
    id: 'xysu-fintech', n: '03', icon: Network,
    school: '兴义民族师范学院', lab: '数字经济与金融科技实验室', en: 'DIGITAL ECONOMY & FINTECH LAB',
    city: '兴义', province: '贵州', year: '2025.12', type: '民族师范 · 本科',
    summary: '一站式金融实训平台，支撑学生从理论认知到看盘、技术分析、模拟下单的全流程实践，同时服务教师科研与产学研协同转化。',
    specs: [ { k: '面积', v: '200㎡' }, { k: '学生机位', v: '66' }, { k: '教师机位', v: '1' } ],
    regions: ['学生实践创新能力', '教师科研与教学优化', '产学研协同转化'],
    hardware: ['LED 数据可视化大屏', '金融资讯行情跑马灯', '教学一体机 · 精品录播设备'],
    software: ['投资银行教学系统', '金融衍生品交易教学系统', '金融数据分析终端系统', '金融量化交易分析系统', '企业投融资分析实训系统', '金融科技风控管理综合平台'],
    highlight: '促进学院从「教学—科研」向「产学研用」一体化成果转化，服务地方经济。',
    imgs: ['/images/labcases/lab-03-1.webp', '/images/labcases/lab-03-2.webp', '/images/labcases/lab-03-3.webp', '/images/labcases/lab-03-4.webp'],
  },
  {
    id: 'gdcm-literacy', n: '04', icon: GaugeCircle,
    school: '广东财贸职业学院', lab: '智慧财经素养沁润中心', en: 'SMART FINANCIAL LITERACY CENTER',
    city: '广州', province: '广东', year: '2025.12', type: '高职 · 职业学院',
    summary: '以《中国财经素养教育标准框架》为指导，打造集五大区域于一体的财经素养沁润中心，面向学生与中小学生开展科普与实训。',
    specs: [ { k: '功能区域', v: '5 区' }, { k: '指导标准', v: '国家框架' }, { k: '出口', v: '财商大讲堂' } ],
    regions: ['币海探秘区', '财金智趣区', '风险透视区', '财智实战区', '财经风云区'],
    hardware: ['智能导览机器人', '数字人民币实训柜台', '财金智趣交互压感数字集成系统', '互动魔镜打卡'],
    software: ['财经素养测评系统', '金融实时行情系统', '数字经济可视化系统', '财经素养动画游戏互动系统'],
    highlight: '数字人民币教学业务、证券模拟交易、保险业务拓展三者融合，还原真实现代金融场景。',
    imgs: ['/images/labcases/lab-04-1.webp', '/images/labcases/lab-04-2.webp', '/images/labcases/lab-04-3.webp', '/images/labcases/lab-04-4.webp', '/images/labcases/lab-04-5.webp', '/images/labcases/lab-04-6.webp'],
  },
  {
    id: 'gxtc-aimarketing', n: '05', icon: Sparkles,
    school: '广西金融职业技术学院', lab: 'AI 数字金融营销开放产教融合中心', en: 'AI DIGITAL FINANCE MARKETING HUB',
    city: '南宁', province: '广西', year: '2025.12', type: '高职 · 国家级产教融合',
    summary: '定位为国家级开放型区域产教融合实践中心，集教学、实训、科研、社会服务一体，培养复合型 AI 金融营销人才。',
    specs: [ { k: '定位', v: '国家级' }, { k: '区域面积', v: '147㎡ × 2' }, { k: '功能', v: '展示+体验+教学' } ],
    regions: ['AI 金融营销实战中心', '金融新媒体营销实践中心', '数字营销直播间'],
    hardware: ['金融数据可视化展示', '一体化智能直播录播设备', 'AI 智能陪练终端'],
    software: ['数字金融培训系统', 'AI 智能陪练', '金融新媒体营销业务实践'],
    highlight: '「金融 + 科技 + 职业」三位一体，线上线下金融营销模式全场景模拟。',
    imgs: ['/images/labcases/lab-05-1.webp', '/images/labcases/lab-05-2.webp', '/images/labcases/lab-05-3.webp', '/images/labcases/lab-05-4.webp'],
  },
  {
    id: 'pzxy-quant', n: '06', icon: LineChart,
    school: '广东培正学院', lab: '金融证券与量化投资实验室', en: 'SECURITIES & QUANTITATIVE INVESTMENT LAB',
    city: '广州', province: '广东', year: '2024.03', type: '民办本科',
    summary: '以模拟证券交易环境为核心，为金融专业学生打造「一站式」证券模拟与量化投资实训平台，同时服务教师教学与科研。',
    specs: [ { k: '面积', v: '174㎡' }, { k: '工位', v: '50 人' }, { k: '核心', v: '证券模拟' } ],
    regions: ['证券模拟交易', '量化投资实训', '大数据分析'],
    hardware: ['LED 数据可视化大屏 · 跑马灯', '纳米触控智慧黑板 · 电子白板', '录播 · 互动视频会议 · 飞屏器 · 数位手写板'],
    software: ['金融模拟交易系统', '投资银行教学系统', '大数据分析挖掘系统', '金融行情可视化系统'],
    highlight: '前沿金融证券教学实践环境，学生实操与教师科研设备双提升。',
    imgs: ['/images/labcases/lab-06-1.webp', '/images/labcases/lab-06-2.webp', '/images/labcases/lab-06-3.webp'],
  },
  {
    id: 'hbsy-factory', n: '07', icon: Building2,
    school: '湖北商贸学院', lab: '新金融智慧学习工厂', en: 'NEW FINANCE SMART LEARNING FACTORY',
    city: '武汉', province: '湖北', year: '2022.10', type: '本科 · 省级首个',
    summary: '湖北省首个「新金融智慧学习工厂」，约 800㎡ 两层 144 机位，全场景全时段模拟世界主要证券交易所的行情与交易环境。',
    specs: [ { k: '面积', v: '约 800㎡' }, { k: '楼层', v: '2 层' }, { k: '学生机位', v: '144' } ],
    regions: ['证券仿真交易实训室', '金融大数据实验室', '金融职业素养实验室', '金融创新创业实践基地'],
    hardware: ['DS-C21N 分布式多屏控制器', '全息投影 · 多屏金融分析工作站', 'LED 滚动柔性屏 · 金融可视化大屏'],
    software: ['量化投资交易 / 智能理财分析', '区块链金融实训 · 商业银行综合业务', '全球金融数据终端', '财经大数据竞赛平台'],
    highlight: '24 小时不间断真实反映深交所、上交所、纽交所、纳斯达克的信息流、资金流与数据流，获多家媒体报道。',
    imgs: ['/images/labcases/lab-07-1.webp', '/images/labcases/lab-07-2.webp', '/images/labcases/lab-07-3.webp', '/images/labcases/lab-07-4.webp'],
  },
  {
    id: 'sias-fintech', n: '08', icon: Cpu,
    school: '郑州西亚斯学院', lab: '金融科技实验室', en: 'FINTECH LAB',
    city: '郑州', province: '河南', year: '—', type: '本科 · 新金融学习工厂',
    summary: '依据专业发展与人培方案建设的新一代金融智慧学习工厂，并依托该实验教学平台申报虚拟仿真实验教学项目。',
    specs: [ { k: '面积', v: '200+㎡' }, { k: '学生机位', v: '100' }, { k: '教师机位', v: '2' } ],
    regions: ['智慧银行经营决策', '智能理财分析', '金融模拟交易', '量化投资'],
    hardware: ['LED 数据可视化大屏 · 金融行情跑马灯', '智慧处理器 · 摄像头 · 飞屏器', '信息展示屏 · 音响功放'],
    software: ['智慧银行经营决策软件', '智能理财分析教学系统', '量化投资交易平台', '金融大数据分析实验平台 · 实时行情'],
    highlight: '支撑现有专业实验教学需求，同时作为虚拟仿真实验教学项目的建设底座。',
    imgs: ['/images/labcases/lab-08-1.webp', '/images/labcases/lab-08-2.webp', '/images/labcases/lab-08-3.webp'],
  },
  {
    id: 'xa-mingde', n: '09', icon: Server,
    school: '西安明德理工学院', lab: '数字化综合金融实验室', en: 'DIGITAL COMPREHENSIVE FINANCE LAB',
    city: '西安', province: '陕西', year: '2024.12', type: '本科 · 理工',
    summary: '面向综合金融教学的数字化实验室，覆盖量化投资、大数据分析、银行国际结算与外汇交易，软硬件一体交付。',
    specs: [ { k: '面积', v: '160㎡' }, { k: '学生机位', v: '50' }, { k: '教师机位', v: '1' } ],
    regions: ['量化投资交易', '金融大数据分析', '国际结算与外汇交易'],
    hardware: ['可视化大屏幕系统 · LED 跑马灯', '纳米触控智慧黑板 · 录播 · 互动视频会议', '飞屏器 · 数位手写板'],
    software: ['量化投资交易平台', '金融大数据分析挖掘系统', '银行国际结算及外汇交易系统', '金融数据终端'],
    highlight: '可视化大屏与智慧课堂设备一体化，兼顾讲授、实训与数据分析。',
    imgs: ['/images/labcases/lab-09-1.webp', '/images/labcases/lab-09-2.webp', '/images/labcases/lab-09-3.webp'],
  },
]

/* 案例集聚合口径：数字全部由上面 9 条真实数据汇总，不另立说法 */
export const labCaseStats = [
  { k: '标杆院校', v: 9, suffix: ' 所' },
  { k: '实验室 / 中心', v: 12, suffix: '+' },
  { k: '累计实训机位', v: 470, suffix: '+' },
  { k: '累计建设面积', v: 2700, suffix: '㎡+' },
  { k: '覆盖省市', v: 6, suffix: ' 个' },
]

/* ---------------- 客户 logo 墙（院校 + 金融机构）----------------
   院校 101 所 + 金融机构 5 家。旧站迁移的标杆 logo 多为白底 / 透明，原样保留；
   合作名录扩充院校的真实校徽取自 Wikimedia 共享资源，经 /images/logos/ 规范化为 webp。
   kind 分 school / corp；公开可核验的院校才带 logo，未核验者仅在 Cases 页名录中以文字呈现。 */
export const clientLogos = [
  { name: '清华大学', img: '/images/cases/case-10.png', kind: 'school', cat: '综合' },
  { name: '南开大学', img: '/images/cases/case-09.jpg', kind: 'school', cat: '综合' },
  { name: '中南大学', img: '/images/cases/case-08.jpg', kind: 'school', cat: '综合' },
  { name: '深圳大学', img: '/images/cases/case-25.png', kind: 'school', cat: '综合' },
  { name: '苏州大学', img: '/images/cases/case-20.jpg', kind: 'school', cat: '综合' },
  { name: '青岛大学', img: '/images/cases/case-19.png', kind: 'school', cat: '综合' },
  { name: '郑州大学', img: '/images/cases/case-11.png', kind: 'school', cat: '综合' },
  { name: '西南财经大学', img: '/images/cases/case-05.jpg', kind: 'school', cat: '财经' },
  { name: '上海立信会计金融学院', img: '/images/cases/case-02.jpg', kind: 'school', cat: '财经' },
  { name: '广东金融学院', img: '/images/cases/case-13.png', kind: 'school', cat: '财经' },
  { name: '南京师范大学', img: '/images/cases/case-12.jpg', kind: 'school', cat: '师范' },
  { name: '江苏师范大学', img: '/images/cases/case-18.png', kind: 'school', cat: '师范' },
  { name: '福建师范大学', img: '/images/cases/case-22.png', kind: 'school', cat: '师范' },
  { name: '合肥师范学院', img: '/images/cases/case-17.jpg', kind: 'school', cat: '师范' },
  { name: '广东第二师范学院', img: '/images/cases/case-16.jpg', kind: 'school', cat: '师范' },
  { name: '安徽建筑大学', img: '/images/cases/case-14.jpg', kind: 'school', cat: '理工' },
  { name: '深圳职业技术大学', img: '/images/cases/case-03.jpg', kind: 'school', cat: '职业本科' },
  { name: '深圳信息职业技术学院', img: '/images/cases/case-07.jpg', kind: 'school', cat: '高职' },
  { name: '广西金融职业技术学院', img: '/images/cases/case-04.jpg', kind: 'school', cat: '高职' },
  { name: '福州墨尔本理工职业学院', img: '/images/cases/case-23.png', kind: 'school', cat: '中外合作' },
  { name: '阳光学院', img: '/images/cases/case-24.jpg', kind: 'school', cat: '民办本科' },
  { name: '上海杉达学院', img: '/images/cases/case-06.jpg', kind: 'school', cat: '民办本科' },
  { name: '皖西学院', img: '/images/cases/case-01.jpg', kind: 'school', cat: '本科' },
  { name: '滁州学院', img: '/images/cases/case-15.jpg', kind: 'school', cat: '本科' },
  { name: '深圳市龙岗区第二职业技术学校', img: '/images/cases/case-21.jpg', kind: 'school', cat: '中职' },
  /* ―― 案例集新增院校（校徽取自维基共享 / 各校官网），补齐地图全息板 logo ―― */
  { name: '深圳北理莫斯科大学', img: '/images/cases/case-31.png', kind: 'school', cat: '中外合作' },
  { name: '广东技术师范大学', img: '/images/cases/case-32.png', kind: 'school', cat: '师范' },
  { name: '广东财贸职业学院', img: '/images/cases/case-33.png', kind: 'school', cat: '高职' },
  { name: '广东培正学院', img: '/images/cases/case-34.png', kind: 'school', cat: '民办本科' },
  { name: '郑州西亚斯学院', img: '/images/cases/case-35.png', kind: 'school', cat: '民办本科' },
  { name: '湖北商贸学院', img: '/images/cases/case-36.png', kind: 'school', cat: '民办本科' },
  { name: '西安明德理工学院', img: '/images/cases/case-37.png', kind: 'school', cat: '民办本科' },
  { name: '兴义民族师范学院', img: '/images/cases/case-38.png', kind: 'school', cat: '师范' },
  /* ―― 合作名录扩充院校真实校徽（取自维基共享，公开可核验的部分；未抓到者仅在名录中以文字呈现）―― */
  { name: '安徽大学', img: '/images/logos/p025.webp', kind: 'school', cat: '本科' },
  { name: '北京理工大学', img: '/images/logos/p001.webp', kind: 'school', cat: '本科' },
  { name: '重庆城市科技学院', img: '/images/logos/p088.webp', kind: 'school', cat: '本科' },
  { name: '重庆第二师范学院', img: '/images/logos/p090.webp', kind: 'school', cat: '本科' },
  { name: '重庆移通学院', img: '/images/logos/p091.webp', kind: 'school', cat: '本科' },
  { name: '东莞理工学院', img: '/images/logos/p078.webp', kind: 'school', cat: '本科' },
  { name: '防灾科技学院', img: '/images/logos/p006.webp', kind: 'school', cat: '本科' },
  { name: '佛山大学', img: '/images/logos/p079.webp', kind: 'school', cat: '本科' },
  { name: '福州大学', img: '/images/logos/p030.webp', kind: 'school', cat: '本科' },
  { name: '福州大学至诚学院', img: '/images/logos/p031.webp', kind: 'school', cat: '本科' },
  { name: '广东白云学院', img: '/images/logos/p066.webp', kind: 'school', cat: '本科' },
  { name: '广东工业大学', img: '/images/logos/p064.webp', kind: 'school', cat: '本科' },
  { name: '广东石油化工学院', img: '/images/logos/p065.webp', kind: 'school', cat: '本科' },
  { name: '广州大学', img: '/images/logos/p069.webp', kind: 'school', cat: '本科' },
  { name: '广州航海学院', img: '/images/logos/p070.webp', kind: 'school', cat: '本科' },
  { name: '广州商学院', img: '/images/logos/p073.webp', kind: 'school', cat: '本科' },
  { name: '广州应用科技学院', img: '/images/logos/p074.webp', kind: 'school', cat: '本科' },
  { name: '贵阳学院', img: '/images/logos/p095.webp', kind: 'school', cat: '本科' },
  { name: '哈尔滨工业大学（深圳）', img: '/images/logos/p085.webp', kind: 'school', cat: '本科' },
  { name: '合肥工业大学', img: '/images/logos/p027.webp', kind: 'school', cat: '本科' },
  { name: '河北民族师范学院', img: '/images/logos/p005.webp', kind: 'school', cat: '本科' },
  { name: '河南工业大学', img: '/images/logos/p038.webp', kind: 'school', cat: '本科' },
  { name: '湖南大学', img: '/images/logos/p049.webp', kind: 'school', cat: '本科' },
  { name: '湖南工学院', img: '/images/logos/p052.webp', kind: 'school', cat: '本科' },
  { name: '湖州学院', img: '/images/logos/p022.webp', kind: 'school', cat: '本科' },
  { name: '华南理工大学', img: '/images/logos/p062.webp', kind: 'school', cat: '本科' },
  { name: '华南农业大学', img: '/images/logos/p060.webp', kind: 'school', cat: '本科' },
  { name: '华南师范大学', img: '/images/logos/p061.webp', kind: 'school', cat: '本科' },
  { name: '华侨大学', img: '/images/logos/p033.webp', kind: 'school', cat: '本科' },
  { name: '集美大学', img: '/images/logos/p032.webp', kind: 'school', cat: '本科' },
  { name: '济南大学', img: '/images/logos/p037.webp', kind: 'school', cat: '本科' },
  { name: '暨南大学', img: '/images/logos/p059.webp', kind: 'school', cat: '本科' },
  { name: '江苏第二师范学院', img: '/images/logos/p015.webp', kind: 'school', cat: '本科' },
  { name: '江西理工大学', img: '/images/logos/p035.webp', kind: 'school', cat: '本科' },
  { name: '兰州理工大学', img: '/images/logos/p104.webp', kind: 'school', cat: '本科' },
  { name: '乐山师范学院', img: '/images/logos/p094.webp', kind: 'school', cat: '本科' },
  { name: '南方科技大学', img: '/images/logos/p083.webp', kind: 'school', cat: '本科' },
  { name: '南阳师范学院', img: '/images/logos/p041.webp', kind: 'school', cat: '本科' },
  { name: '宁波工程学院', img: '/images/logos/p020.webp', kind: 'school', cat: '本科' },
  { name: '山东大学', img: '/images/logos/p036.webp', kind: 'school', cat: '本科' },
  { name: '汕头职业技术学院', img: '/images/logos/p131.webp', kind: 'school', cat: '高职' },
  { name: '上海财经大学', img: '/images/logos/p012.webp', kind: 'school', cat: '本科' },
  { name: '上海交通大学', img: '/images/logos/q068.webp', kind: 'school', cat: '本科' },
  { name: '上海商学院', img: '/images/logos/p013.webp', kind: 'school', cat: '本科' },
  { name: '深圳信息职业技术大学', img: '/images/logos/p084.webp', kind: 'school', cat: '本科' },
  { name: '沈阳工业大学', img: '/images/logos/p008.webp', kind: 'school', cat: '本科' },
  { name: '石河子大学', img: '/images/logos/p105.webp', kind: 'school', cat: '本科' },
  { name: '顺德职业技术大学', img: '/images/logos/p081.webp', kind: 'school', cat: '本科' },
  { name: '四川民族学院', img: '/images/logos/p093.webp', kind: 'school', cat: '本科' },
  { name: '苏州城市学院', img: '/images/logos/p017.webp', kind: 'school', cat: '本科' },
  { name: '苏州科技大学', img: '/images/logos/p018.webp', kind: 'school', cat: '本科' },
  { name: '天津大学', img: '/images/logos/p002.webp', kind: 'school', cat: '本科' },
  { name: '天津师范大学', img: '/images/logos/p003.webp', kind: 'school', cat: '本科' },
  { name: '铜陵学院', img: '/images/logos/p029.webp', kind: 'school', cat: '本科' },
  { name: '温州商学院', img: '/images/logos/p023.webp', kind: 'school', cat: '本科' },
  { name: '五邑大学', img: '/images/logos/p076.webp', kind: 'school', cat: '本科' },
  { name: '武昌工学院', img: '/images/logos/p055.webp', kind: 'school', cat: '本科' },
  { name: '西安工程学院', img: '/images/logos/p098.webp', kind: 'school', cat: '本科' },
  { name: '新乡学院', img: '/images/logos/p042.webp', kind: 'school', cat: '本科' },
  { name: '信阳师范学院', img: '/images/logos/p040.webp', kind: 'school', cat: '本科' },
  { name: '延安大学', img: '/images/logos/p100.webp', kind: 'school', cat: '本科' },
  { name: '云南财经大学', img: '/images/logos/p096.webp', kind: 'school', cat: '本科' },
  { name: '肇庆学院', img: '/images/logos/p080.webp', kind: 'school', cat: '本科' },
  { name: '浙江大学', img: '/images/logos/p024.webp', kind: 'school', cat: '本科' },
  { name: '中南林业科技大学', img: '/images/logos/p053.webp', kind: 'school', cat: '本科' },
  { name: '中原科技学院', img: '/images/logos/p045.webp', kind: 'school', cat: '本科' },
  { name: '仲恺农业工程学院', img: '/images/logos/p075.webp', kind: 'school', cat: '本科' },
  { name: '珠海科技学院', img: '/images/logos/p077.webp', kind: 'school', cat: '本科' },
  { name: '招商证券', img: '/images/cases/case-26.jpg', kind: 'corp', cat: '证券' },
  { name: '中国银河证券', img: '/images/cases/case-28.jpg', kind: 'corp', cat: '证券' },
  { name: '广发期货', img: '/images/cases/case-29.jpg', kind: 'corp', cat: '期货' },
  { name: '中国平安', img: '/images/cases/case-30.jpg', kind: 'corp', cat: '保险' },
  { name: '道富资本', img: '/images/cases/case-27.jpg', kind: 'corp', cat: '投资' },
]

/* 三类典型建设形态：不指向具体学校，讲的是我们的标准交付组合 */
export const buildForms = [
  {
    id: 'quick',
    n: '01',
    icon: Rocket,
    name: '单实验室快建',
    cycle: '4–6 周',
    scale: '1 间 · 40–60 工位',
    line: '一个专业方向先跑通：一套产品体系 + 一批课程 + 师资培训，本学期就能排进课表。',
    parts: ['单一产品体系（5 选 1）', '20–40 门配套课程', '云端或共建部署', '2 周集中师资培训'],
    fitFor: '首次建设、需要快速看到效果的院系',
  },
  {
    id: 'group',
    n: '02',
    icon: Layers,
    name: '院系级实训群',
    cycle: '8–12 周',
    scale: '3–5 间 · 覆盖一个学院',
    line: '按专业链排实验室：基础实训、专业实训、综合创新三级贯通，设备与课程共用一套底座。',
    parts: ['2–3 个产品体系组合', '四阶段进阶课程体系', '统一实验管理平台', '学期陪跑式教研服务'],
    fitFor: '整机学院、专业群建设与验收周期明确',
  },
  {
    id: 'hub',
    n: '03',
    icon: Orbit,
    name: '校级创新中心',
    cycle: '12–20 周',
    scale: '整层 / 整栋 · 全校开放',
    line: '面向全校的公共入口：AI 素养通识、跨学科工坊、成果展陈与竞赛训练共处一馆，私有化算力与数据底座支撑。',
    parts: ['五大产品体系按需接入', '校级学情与设备驾驶舱', '全栈私有化部署', '竞赛与证书出口共建'],
    fitFor: '双一流与职业本科的校级平台、产教融合项目',
  },
]

/* ---------------- 关于我们 ---------------- */
export const aboutBeliefs = [
  { icon: Lightbulb, title: '技术要能进课表', desc: '一项技术只有变成一节有人上的课，才算真的落到了学校。我们所有产品都以「可排课」为交付终点。' },
  { icon: Wrench, title: '真实优于仿真', desc: '真链、真机、真数据。学生做的东西要能跑在真实环境里，而不是只活在演示视频里。' },
  { icon: Users, title: '教师是主角', desc: '系统替教师做重复劳动，不替教师做判断。赋能的路径是让老师自己能开新课，而不是永远依赖厂商。' },
  { icon: BadgeCheck, title: '成果要可验证', desc: '可展示的作品的可量化的学情的可被产业认可的证书 —— 说不清效果的投入都是浪费。' },
]

export const aboutProof = [
  { icon: BookOpenCheck, k: '发明专利', v: '4 项', note: '多智能体编排、代码沙箱、数字孪生引擎方向' },
  { icon: FileSearch, k: '软件著作权', v: '60+', note: '覆盖平台各子系统与实验模块' },
  { icon: Network, k: '合作高校', v: '180+', note: '覆盖 26 个省市与 30+ 学科' },
  { icon: Boxes, k: '在跑实训系统', v: '37 套', note: '自旧平台迁移并持续使用，含 492 条实验项目' },
]

export const aboutServices = [
  { icon: ClipboardList, stage: '售前', items: ['现状诊断与场地勘察', '专业建设方案论证', '预算与分期建议'] },
  { icon: Server, stage: '交付', items: ['硬件进场与联调', '平台部署与教务对接', '验收测试与运维交接'] },
  { icon: PenTool, stage: '教研', items: ['驻校师资培训与认证', '首批课程共建', '教学日历与评价标准'] },
  { icon: Zap, stage: '运营', items: ['排课与并发保障', '学情驾驶舱周会复盘', '内容滚动迭代与赛项支持'] },
]

export const aboutContactBits = [
  { icon: Phone, label: '咨询热线' },
  { icon: Mail, label: '商务邮箱' },
  { icon: MapPin, label: '总部地址' },
]

/* 顺手把这些既有出口再导一次，页面里就不必各自 import 两份 */
export { embodiedProducts, labModules, advisorStats, strengths, customers, caseFeatured }
