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
      { label: '自然语言实验平台', to: '/#ai' },
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
      { label: '数字孪生与实训安全包', to: '/#matrix' },
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
      { label: '校级学情驾驶舱', to: '/#ai' },
      { label: '全栈私有化交付', to: '/#architecture' },
    ],
    deliver: ['公共讲授与研讨空间', '跨学科项目工坊', '校级学情与设备利用驾驶舱', '成果展陈与竞赛区', '私有化算力与数据底座'],
    outcome: ['面向全校的 AI 素养课程群', '跨学院联合毕设与孵化项目', '可对外接待与申报的建设成果'],
    metrics: [
      { k: '覆盖学科', v: '30+' },
      { k: '合作高校', v: '300+' },
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

/* ---------------- 客户 logo 墙（自旧站 sztzjy.com「客户案例 · 合作客户」迁移）----------------
   38 家真实服务过的单位：33 所院校 + 5 家金融机构。多为白底 / 透明 logo，故在浅色卡片里
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
  /* ―― 案例集新增院校（校徽取自维基共享 / 各校官网），补齐地图全息板 logo ―― */
  { name: '深圳北理莫斯科大学', img: '/images/cases/case-31.png', kind: 'school', cat: '中外合作' },
  { name: '广东技术师范大学', img: '/images/cases/case-32.png', kind: 'school', cat: '师范' },
  { name: '广东财贸职业学院', img: '/images/cases/case-33.png', kind: 'school', cat: '高职' },
  { name: '广东培正学院', img: '/images/cases/case-34.png', kind: 'school', cat: '民办本科' },
  { name: '郑州西亚斯学院', img: '/images/cases/case-35.png', kind: 'school', cat: '民办本科' },
  { name: '湖北商贸学院', img: '/images/cases/case-36.png', kind: 'school', cat: '民办本科' },
  { name: '西安明德理工学院', img: '/images/cases/case-37.png', kind: 'school', cat: '民办本科' },
  { name: '兴义民族师范学院', img: '/images/cases/case-38.png', kind: 'school', cat: '师范' },
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
  { icon: Network, k: '合作高校', v: '300+', note: '覆盖 26 个省市与 30+ 学科' },
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
