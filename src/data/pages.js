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

/* 从 productMatrix 抠现成的统计，避免内页手抄一份数字 */
const pm = (id) => productMatrix.find((p) => p.id === id)
const stat = (id, k) => {
  const p = pm(id)
  const hit = p?.stats?.find((s) => s.k === k)
  return hit ? hit.v : ''
}

/* ---------------- 按场景进入：5 类实验室 / 中心 ----------------
   这 5 个名字不是新造的：页脚「解决方案」那一列早就挂着这五条
   （site.js footerNav），以前点进去是 COMING SOON。id 与文案对齐，
   页脚的链接就从「装饰」变成了真入口。 */
export const solutionScenes = [
  {
    id: 'ai-lab',
    n: '01',
    name: 'AI 人工智能实验室',
    en: 'AI & LARGE MODEL LAB',
    icon: BrainCircuit,
    img: '/images/tech_orb.webp',
    imgW: 531,
    imgH: 318,
    line: '从大模型到课堂：AI 通识课、专业核心课与实训项目在同一条链路上配齐，模型可换、数据不出校。',
    fit: ['人工智能', '数据科学与大数据技术', '软件工程', '物联网工程', '全校 AI 通识'],
    stack: [
      { label: '03 AI 多智能体课堂', to: '/#matrix' },
      { label: '05 数字经济 · 大数据与 AI 实训体系', to: '/#matrix' },
      { label: '自然语言实验平台', to: '/#features' },
    ],
    deliver: ['AI 教学资源与课件平台', '多智能体课堂环境（教师 / 同学 / 助教 / 导演）', '推理算力调度与模型接入', '18 套大数据与 AI 实训系统', '课程包、实验手册与评价标准'],
    outcome: ['校本 AI 课程群与教材', '模型与数据的本地化部署', '学生 AI 项目作品集'],
    metrics: [
      { k: '可直接开课', v: stat('digital-economy', '实训系统') },
      { k: '实验项目', v: stat('digital-economy', '实验项目') },
      { k: '生成一堂课', v: stat('class', '生成一堂课') },
    ],
  },
  {
    id: 'embodied-lab',
    n: '02',
    name: '具身智能实验室',
    en: 'EMBODIED INTELLIGENCE LAB',
    icon: Bot,
    img: '/images/iso_lab.webp',
    imgW: 448,
    imgH: 272,
    line: '人形、四足、机械臂、移动底盘同馆协同：先在数字孪生里试错，再到真机上执行，操作风险与器材损耗一起降下来。',
    fit: ['机器人工程', '自动化', '机械电子工程', '智能制造工程', '人工智能'],
    stack: [
      { label: '01 具身智能 · 机器人实验室', to: '/laboratories' },
      { label: '数字孪生与实训安全包', to: '/#features' },
      { label: '实验室交付六模块', to: '/laboratories' },
    ],
    deliver: ['空间规划与安全动线', '6 类机器人设备成套进场', '一体化实验管理平台', '四阶段进阶课程', '驻校师资培训与认证', '赛项选题与器材保障'],
    outcome: ['可承接教学与科研双用的实验环境', '多机协同与数据采集课题', '学科竞赛与成果展项'],
    metrics: [
      { k: '落地实验室', v: stat('embodied', '落地实验室') },
      { k: '配套课程', v: stat('embodied', '配套课程') },
      { k: '端侧算力', v: '120 TOPS' },
    ],
  },
  {
    id: 'blockchain-lab',
    n: '03',
    name: '区块链实验室',
    en: 'BLOCKCHAIN & LEDGER LAB',
    icon: Blocks,
    img: '/img/products/chain.webp',
    imgW: 1280,
    imgH: 720,
    line: '一条真链进课堂：联盟链上写合约、部署、看浏览器，公链侧做数据聚合与态势感知，再往上一层跑量化回测。',
    fit: ['区块链工程', '金融科技', '信息安全', '会计学', '数字经济'],
    stack: [
      { label: '02 区块链 · 可信账本与量化实训', to: '/#matrix' },
      { label: '旧一代 7 套区块链实训系统', to: '/#matrix' },
      { label: '量化挖掘终端', to: '/#matrix' },
    ],
    deliver: ['联盟链集群（6 共识节点）', '合约 IDE 与区块浏览器', '链上态势感知大屏', '量化挖掘终端与回测中心', '教师端实验下发与自动评分'],
    outcome: ['学生自签发的校园身份与钱包', '可复现的链上项目与合约作品', '链上数据分析课程成果'],
    metrics: [
      { k: '已部署合约', v: stat('blockchain', '已部署合约') },
      { k: '覆盖公链', v: stat('blockchain', '覆盖公链') },
      { k: '适用专业', v: '8 个' },
    ],
  },
  {
    id: 'engineering-center',
    n: '04',
    name: '工程实训中心',
    en: 'ENGINEERING TRAINING CENTER',
    icon: Factory,
    img: '/images/d_labiso.webp',
    imgW: 550,
    imgH: 288,
    line: '把工程训练从「金工实习」升级成「智能产线」：机械、电气、控制与数据在同一工位上闭环，一份作业能同时评四门课。',
    fit: ['机械设计制造', '电气工程', '测控技术与仪器', '智能制造', '全校工程训练'],
    stack: [
      { label: '具身智能设备套件（6 机型）', to: '/laboratories' },
      { label: '设备级数字孪生产线', to: '/technology' },
      { label: '四阶段进阶课程体系', to: '/laboratories' },
    ],
    deliver: ['工位与产线布局', '协作机械臂与移动底盘', '数字孪生产线与虚拟调试', '工程训练项目库', '操作风险预警与过程回放'],
    outcome: ['工程能力评价与证书出口', '跨专业联合课程设计', '可展示的学生工程作品'],
    metrics: [
      { k: '重复定位精度', v: '±0.05 mm' },
      { k: '服务学生', v: '5,000+' },
      { k: '单馆建设面积', v: '5,000㎡' },
    ],
  },
  {
    id: 'future-campus',
    n: '05',
    name: '未来校园 · 创新中心',
    en: 'FUTURE CAMPUS INNOVATION HUB',
    icon: Orbit,
    img: '/images/campus_map.webp',
    imgW: 520,
    imgH: 200,
    line: '一个院系之外的校级入口：把 AI 素养通识、跨学科项目工坊与学生创新成果放在同一栋楼里，对全校开放排课。',
    fit: ['教务处', '创新创业学院', '研究生院', '图书馆 / 信息化处'],
    stack: [
      { label: '五大产品体系按需组合', to: '/#matrix' },
      { label: '校级学情驾驶舱', to: '/#features' },
      { label: '全栈私有化交付', to: '/#architecture' },
    ],
    deliver: ['公共讲授与研讨空间', '跨学科项目工坊', '校级学情与设备利用驾驶舱', '成果展陈与竞赛区', '私有化算力与数据底座'],
    outcome: ['面向全校的 AI 素养课程群', '跨学院联合毕设与孵化项目', '可对外接待与申报的建设成果'],
    metrics: [
      { k: '覆盖学科', v: '30+' },
      { k: '合作高校', v: '100+' },
      { k: '部署方式', v: '私有化 / 云端' },
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
    use: ['03 AI 多智能体课堂', '05 数字经济 · 18 套', '02 区块链 · 联盟链实训'],
    courses: '机器学习、AIGC 与大模型、大数据 ETL、分布式账本',
  },
  {
    id: 'finance',
    name: '经济与金融学科',
    en: 'ECONOMICS & FINANCE',
    icon: Landmark,
    majors: ['金融学', '金融工程', '经济学', '数字经济', '会计学', '投资学'],
    use: ['04 数字金融 · 19 套', '02 区块链 · 量化终端', '05 智能风控与投顾'],
    courses: '金融产品设计、证券投资、金融风险管理、量化交易',
  },
  {
    id: 'robot',
    name: '机器人与智能制造学科',
    en: 'ROBOTICS & MANUFACTURING',
    icon: Bot,
    majors: ['机器人工程', '自动化', '机械设计制造及其自动化', '智能制造工程'],
    use: ['01 具身智能 · 6 机型', '数字孪生产线', '多机协同实验'],
    courses: '机器人学、运动控制、SLAM 导航、产线虚拟调试',
  },
  {
    id: 'math',
    name: '数学与统计学科',
    en: 'MATHEMATICS & STATISTICS',
    icon: Calculator,
    majors: ['应用数学', '统计学', '数据计算及应用'],
    use: ['05 大数据 ETL 与分析挖掘', '量化挖掘终端', '自然语言实验平台'],
    courses: '数值计算、统计建模、时间序列、最优化方法',
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
    use: ['数字孪生与虚拟仿真', '03 AI 多智能体课堂', '医学大数据实训'],
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
]

export const caseFilters = [
  { id: 'all', label: '全部院校' },
  { id: 'top', label: '双一流理工 / 综合' },
  { id: 'vocational', label: '职业本科' },
  { id: 'foreign', label: '中外合作' },
]

/* ---------------- 客户 logo 墙（自旧站 sztzjy.com「客户案例 · 合作客户」迁移）----------------
   30 家真实服务过的单位：25 所院校 + 5 家金融机构。图为白底 logo，故在浅色卡片里
   object-contain 展示；kind 分 school / corp，cat 是给人看的简短类别。 */
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
  { icon: Network, k: '合作高校', v: '100+', note: '覆盖 30+ 省市与 30+ 学科' },
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
