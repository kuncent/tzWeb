import {
  Briefcase,
  Network,
  Bot,
  Cpu,
  GraduationCap,
  Building2,
  FlaskConical,
  Code2,
  GaugeCircle,
  Layers3,
  BookOpenCheck,
  UserRound,
  Users,
  Clapperboard,
  Sparkles,
  Repeat2,
  FileSearch,
  ShieldCheck,
  Landmark,
  DatabaseZap,
  ScanSearch,
  Blocks,
  Target,
  Send,
} from 'lucide-react'

/* ---------------- 品牌与导航 ---------------- */
export const brand = {
  name: '天择教育科技有限公司', // 法定全称：页脚版权、SEO 标题、正文里需要正式指代公司时用
  short: '天择教育',           // 日常口径：logo 副行、卡片标题等紧凑位置
  en: 'TIANZE',
  tagline: 'Infrastructure for Future Talent',
  positioning: '构建下一代人才培养基础设施',
}

export const nav = [
  { label: '首页', to: '/' },
  { label: '解决方案', to: '/solutions' },
  { label: '技术方向', to: '/technology' },
  { label: '实训实验室', to: '/laboratories' },
  { label: '高校案例', to: '/cases' },
  { label: '关于我们', to: '/about' },
]
export const navCta = { label: '预约演示', to: '/#contact' }

/* 页内锚点导航（参考极光产品页骨架）
   首屏不在这里：三屏业务特效（StoryHero）是开场而不是目录项，
   导航栏的板块模式也要等滚过 problems 才接管，把它放进来会让
   页面导航在首屏就消失。advisor = 原首屏 Hero，现改名「一站式 AI 方案顾问」。 */
/* 顶栏「板块」导航与滚动高亮共用这一份顺序：必须与 Home 里各屏的实际
   DOM 上下顺序一致（见 pages/Home.jsx）。此前 advisor 被排在倒数、matrix 与
   architecture 又颠倒，导致滚到哪儿高亮就往哪儿乱跳——现按真实页序对齐。 */
export const anchorSections = [
  { id: 'problems', label: '挑战与问题' },
  { id: 'advisor', label: 'AI 方案顾问' },
  { id: 'matrix', label: '产品矩阵' },
  { id: 'architecture', label: '技术架构' },
  { id: 'features', label: '平台能力' },
  { id: 'ai', label: 'AI 能力' },
  { id: 'delivery', label: '交付路径' },
  { id: 'customers', label: '合作高校' },
  { id: 'value', label: '价值账' },
  { id: 'resources', label: '资源专区' },
  { id: 'contact', label: '联系我们' },
]

/* ---------------- 一站式 AI 方案顾问（原首屏 Hero，现位于痛点之后、产品矩阵之前）---------------- */
export const advisorKicker = '构建下一代人才培养基础设施'
export const advisorTitle = ['用科技重塑教育', '让培养的人才', '站在时代前沿']
export const advisorDesc =
  '我们为高校提供人工智能、具身智能、区块链与工程实训等全学科融合的未来教育解决方案，助力高校打造面向未来的实验室、课程体系与产业实践平台。'
export const advisorCtas = [
  { label: '免费开通试用', primary: true },
  { label: '方案咨询', primary: false },
  { label: '技术文档', primary: false },
  { label: 'Demo 下载', primary: false },
]
export const advisorConsoleUrl = 'console.sztzjy.com / ai-engine'
export const advisorStats = [
  { value: 100, suffix: '+', label: '合作高校' },
  { value: 30, suffix: '+', label: '覆盖学科' },
  { value: 10000, suffix: '+', label: '培养学员' },
  { value: 98, suffix: '%', label: '课堂互动率提升' },
]

/* 方案引擎三步演示（方案顾问面板四周的悬浮卡，与面板流程一一对应） */
export const advisorPills = [
  { demo: 'typing', icon: ScanSearch, title: '需求智能理解', desc: '从一句话提取院系 · 规模 · 周期' },
  { demo: 'score', icon: Target, title: '方案实时匹配', desc: '模块组合与匹配度由引擎计算' },
  { demo: 'handoff', icon: Send, title: '就方案联系我们', desc: '一键带入表单 · 顾问跟进' },
]

/* ---------------- 挑战与问题 ---------------- */
export const problemsHead = {
  en: 'CHALLENGES',
  zh: '您的学校是否正在经历这些问题？',
  sub: '这五条不是编出来的清单，是走进高校教务处与二级学院最常听到的五句话 —— 每一条都对应一套已经在跑的工程解法。',
}
export const problems = [
  { icon: FlaskConical, title: '缺乏动手环境', desc: '机房设备老旧、软件许可与工位有限，AI / 机器人 / 区块链实训缺少能直接上手的工程环境；学生课上看懂了，课后没地方练，动手能力无从建立。' },
  { icon: BookOpenCheck, title: '课程内容更新慢', desc: 'AI / 机器人 / Web3 技术迭代以月计，教材与课程体系跟不上产业前沿，学生所学非所用。' },
  { icon: GaugeCircle, title: '学情分析粗放', desc: '评价停留在考勤与分数，无法感知每个学生的知识掌握漏斗，更谈不上个性化节奏调整。' },
  { icon: Network, title: '产教衔接断裂', desc: '实训场景与真实产业工程脱节，缺少企业级项目、数据与评价标准，学生成果难以被产业认可。' },
  { icon: Briefcase, title: '学生毕业难以就业', desc: '三年所学拿不出一份可展示的工程简历：只有课程作业，没有可交付的项目与成果背书，面试时说不清“我能干什么”，毕业求职处处被动。' },
]

/* ---------------- 产品矩阵（5 大产品体系 · 整屏轮播） ----------------
   学情分析不再单列为一个产品体系：它还没有自己的交付屏，摆在矩阵里就是一屏空白；
   能力本身仍在「核心功能」区（features 里的 analytics 条目）里讲。
   04 / 05 两条是从旧平台（平台自己的名字：智云经济金融虚拟仿真平台）迁过来的：
   系统数、技术领域划分、适用专业与课程全部取平台接口原文（见 tmp/audit/oldplat-apps.json），
   不是我们自己归纳的——旧平台自己给 44 个系统标了一二级分类，这里只是把它的分类摆进矩阵。 */
export const matrixHead = {
  en: 'PRODUCT MATRIX',
  zh: '5 大产品体系',
  desc: '从一个机器人实验室、一堂 AI 多智能体课，到一整套金融与数字经济的实训系统 —— 五个可单独使用、也可整体交付的产品体系。',
}
export const productMatrix = [
  {
    id: 'embodied',
    en: 'EMBODIED ROBOT LAB',
    icon: Bot,
    title: '具身智能 · 机器人实验室',
    tagline: '从空间、硬件到软件，构建真正可以使用的机器人学习与实践环境',
    desc: '面向学校的完整具身机器人实验室方案：机器人硬件设备、实验管理平台、教学资源与技术支持一体交付，让学生在真实机器人环境中学习、实践与创新。',
    bullets: ['多机协同实验', '远程控制与监控', '数据采集与分析', '开放式开发接口'],
    stats: [{ k: '落地实验室', v: '200+' }, { k: '配套课程', v: '320+' }],
    intent: '数字孪生实验室',
    rich: 'embodied',
  },
  {
    id: 'blockchain',
    en: 'BLOCKCHAIN & LEDGER',
    icon: Blocks,
    title: '区块链 · 可信账本与量化实训',
    tagline: '一条真实的链，三套可直接进课堂的系统',
    desc: '学生从第一条交易开始就在真实链路上操作：联盟链上写合约、部署、看浏览器，公链侧做链上数据聚合与态势感知，再往上一层用事件驱动引擎把策略压进回测与执行。三套系统同源交付，覆盖联盟链搭建、链上数据聚合与量化回测实盘的完整链路。',
    bullets: ['联盟链 + 公链双环境', '合约 IDE 与区块浏览器', '链上数据聚合与态势大屏', '回测到实盘同内核'],
    stats: [{ k: '已部署合约', v: '33 份' }, { k: '覆盖公链', v: '10 条' }],
    intent: '区块链与联盟链实训',
    rich: 'chain',
  },
  {
    id: 'class',
    en: 'AI AGENT CLASSROOM',
    icon: GraduationCap,
    title: 'AI 多智能体课堂',
    tagline: '一句话生成一堂能讲的课，AI 教师与同学同堂互动',
    desc: '输入主题即由大模型先出教学大纲、再装配课堂场景：讲解幻灯、随堂提问、互动模拟与项目式任务四类组件按堂排布。课堂上 AI 教师主讲推导、多名 AI 同学追问举反例、组织讨论与圆桌辩论，学生随时打断提问；配套白板实时书写、教师语音与课件导出，模型可换、数据可不出校。',
    bullets: ['大纲 → 场景两阶段生成', '四类课堂组件', '多智能体讨论与白板推导', '深度交互与课件导出'],
    stats: [
      { k: '生成一堂课', v: '≤ 40s' },
      { k: '课堂组件', v: '4 类' },
    ],
    intent: 'AI 多智能体课堂',
    rich: 'class',
  },
  {
    id: 'digital-finance',
    en: 'DIGITAL FINANCE LAB',
    icon: Landmark,
    title: '数字金融 · 虚拟仿真实训体系',
    tagline: '按金融市场的真实链路排实验，五个环节 19 套系统',
    desc: '系统不按软件罗列，而是按旧平台自己标的市场链路分层：从国内外宏观经济运行与监管往下，经产品设计、发行承销、流通交易，到各类市场参与主体。每一行都是一套可直接开实验的实训系统，点开读它的适用专业、适用课程和实验项目大纲。',
    bullets: ['宏观运行与金融监管', '产品设计与估值定价', '发行与承销 · 并购重组', '流通交易与机构业务'],
    stats: [{ k: '实训系统', v: '19 套' }, { k: '实验项目', v: '212 条' }],
    intent: '自然语言实验平台',
    rich: 'systems',
    systems: 'finance',
  },
  {
    id: 'digital-economy',
    en: 'DIGITAL ECONOMY & AI LAB',
    icon: DatabaseZap,
    title: '数字经济 · 大数据与 AI 实训体系',
    tagline: '大数据、人工智能、云计算三个技术底座，18 套系统直接开课',
    desc: '按旧平台自己的技术分类收在三个篮子里：大数据技术 8 套、人工智能技术 7 套、云计算技术 3 套。列出来的都是平台在跑的系统，每套带自己的实验项目大纲与适用专业、适用课程；点一行展开，那套系统的原文就在下面。',
    bullets: ['大数据 ETL 与分析挖掘', '机器学习与 AIGC 大模型', '智能风控 · 投顾 · 交易', '云主机与金融 SaaS'],
    stats: [{ k: '实训系统', v: '18 套' }, { k: '实验项目', v: '280 条' }],
    intent: '自然语言实验平台',
    rich: 'systems',
    systems: 'economy',
  },
]

/* 具身智能产品体系（自 KUN 具身教育实验室项目复用：型号编码与参数为同一口径） */
export const embodiedProducts = [
  {
    code: 'NEX-H1',
    en: 'HUMANOID',
    name: '人形机器人',
    tag: '旗舰双足人形',
    desc: '24 自由度双足人形，支持上肢操作与全身动态平衡，是实验室的核心教学与科研平台。',
    specs: [['自由度', '24 DOF'], ['身高', '1.75 m'], ['续航', '2 h'], ['接口', 'ROS 2 / SDK']],
  },
  {
    code: 'NEX-A6',
    en: 'ROBOT ARM',
    name: '机械臂',
    tag: '6 轴协作机械臂',
    desc: '力控拖动示教与视觉伺服抓取，重复定位精度 ±0.05mm，适配桌面工位的操作类教学。',
    specs: [['自由度', '6 DOF'], ['负载', '5 kg'], ['臂展', '1300 mm'], ['重复精度', '±0.05 mm']],
  },
  {
    code: 'NEX-M2',
    en: 'MOBILE ROBOT',
    name: '移动机器人',
    tag: '自主移动底盘',
    desc: '激光 SLAM 建图与动态避障，开放二次开发，用于自主导航与多机协同实验。',
    specs: [['定位', '激光 SLAM'], ['避障', '动态规划'], ['最高速度', '1.5 m/s'], ['扩展', 'ROS 2']],
  },
  {
    code: 'NEX-W1',
    en: 'WHEELED ROBOT',
    name: '轮式底盘',
    tag: '开源轮式教学机器人',
    desc: '差速驱动轮式底盘，开源硬件与 ROS 2 生态，适配 SLAM 导航、路径规划与多机协同的入门到进阶实验。',
    specs: [['驱动', '差速双轮'], ['感知', '2D 激光雷达'], ['生态', 'ROS 2 / OpenCR'], ['扩展', '机械臂 / 深度相机']],
  },
  {
    code: 'NEX-V1',
    en: 'VISION SYSTEM',
    name: '视觉系统',
    tag: '双目 RGB-D 感知',
    desc: 'RGB + 深度 + 空间感知一体化，为抓取、识别与具身智能提供稳定感知输入。',
    specs: [['成像', 'RGB-D'], ['深度', '主动双目'], ['帧率', '30 fps'], ['接口', 'USB 3.0']],
  },
  {
    code: 'NEX-C1',
    en: 'AI COMPUTE',
    name: 'AI 算力平台',
    tag: '边缘推理单元',
    desc: '120 TOPS 端侧算力，本地运行大模型与感知推理，是机器人实时决策的大脑。',
    specs: [['算力', '120 TOPS'], ['模型', '端侧 LLM'], ['功耗', '45 W'], ['散热', '主动风冷']],
  },
]

/* 一间实验室的完整交付（六大交付模块） */
export const labModules = [
  { code: 'SPACE DESIGN', name: '空间规划', desc: '依据场地与人数定制实验室布局、工位、安全动线与视觉系统。' },
  { code: 'HARDWARE', name: '硬件设备', desc: '人形 / 机械臂 / 移动 / 视觉 / 算力成套设备，开箱即可开展教学实验。' },
  { code: 'SOFTWARE', name: '软件平台', desc: '一体化实验管理平台，编程、任务、数据、仿真一站贯通。' },
  { code: 'CURRICULUM', name: '课程体系', desc: '四阶段进阶课程与实验手册，配套教师用书与评价标准。' },
  { code: 'TRAINING', name: '师资培训', desc: '驻校培训与认证体系，帮助教师从会用到会教、会带项目。' },
  { code: 'COMPETITION', name: '竞赛支持', desc: '赛项选题、集训方案与器材保障，支撑学生机器人竞赛。' },
]

/* 区块链产品体系：三套可交付系统，clip 为真实环境的操作录屏（登录 → 首页 → 专项页）。
   录屏由 Playwright 在有头浏览器里跑真实前端 + 真实后端采得，30fps、剪到 16~25s / 段 ≤ 1MB；
   chapters.t 是成片时间轴上的秒数，与剪辑窗口累加长度对齐，改窗口必须同步改这里
   （record.mjs 每次合成会把这张表写到 tmp/recorder/raw/<name>/edit.log）。
   peek 是缩略图悬停时切入的那一秒，挑各自最有辨识度的一幕，三张图放一起才分得开。
   画面上的两个按钮靠这两个字段：intent 是「申请体验」预填的意向方向（必须命中
   contactProducts，否则表单会把它当成未选），demo 是「前往体验」的项目地址 ——
   已上线的填真实地址（新窗口打开），没配的写 '#' 或不填，按钮会自动置灰并在
   title 上提示待配置，不会把人带到死链上去。 */
export const blockchainProducts = [
  {
    code: 'CHAIN-EDU',
    en: 'ALLIANCE CHAIN',
    name: '联盟链搭建实训',
    tag: '联盟链 · 合约到浏览器全链路',
    desc: '学生在一条真实联盟链上写 Solidity、编译部署、发交易，并用自己的钱包查看余额与 NFT；教师端按班级下发实验、自动采集成绩。',
    intent: '区块链与联盟链实训',
    demo: 'https://ecosim.sztzjy.com:8443/#/login',
    specs: [['共识节点', '6 节点'], ['已部署合约', '33 份'], ['链上交易', '134 笔'], ['交付形态', '校内私有化']],
    clip: {
      src: '/img/products/chain.mp4',
      poster: '/img/products/chain.webp',
      domain: 'chain.tianze.local',
      peek: 21.0,
      chapters: [
        { t: 0.0, label: 'LOGIN', cap: '校园身份统一登录 · 钱包随身份签发' },
        { t: 4.5, label: 'OVERVIEW', cap: '教学总览：链上资产、实训进度 10/10 与今日任务' },
        { t: 11.7, label: 'REPORT', cap: '实训综合报告：按学习路径自动评分并导出 Manifest' },
        { t: 15.9, label: 'EXPLORER', cap: '区块浏览器：29 个区块 / 134 笔交易逐条可查' },
        { t: 19.7, label: 'ECO CHAIN', cap: '绿色低碳联盟链：6 节点状态与 ERC20/721/1155 合约' },
      ],
    },
  },
  {
    code: 'CHAINLENS',
    en: 'ON-CHAIN SITUATION',
    name: '链上态势感知平台',
    tag: '多链聚合 · 实时大屏',
    desc: '把多条公链的区块、交易、合约方法调用聚合到同一套时间坐标系里，支持小时/日度下钻，用于数据素养与风控课程的真景实训。',
    intent: '区块链与联盟链实训',
    demo: 'https://ecosim.sztzjy.com:8443/#/login',
    specs: [['覆盖公链', '10 条'], ['日度聚合', '933 组'], ['明细交易', '百万级'], ['更新频率', '小时级']],
    clip: {
      src: '/img/products/chainlens.mp4',
      poster: '/img/products/chainlens.webp',
      domain: 'chainlens.tianze.local',
      peek: 13.5,
      chapters: [
        { t: 0.0, label: 'TERMINAL', cap: '接入终端：四角色入口与全域指标' },
        { t: 5.7, label: 'WORKBENCH', cap: '分析工作台：多链指标对比与合约方法排行' },
        { t: 11.1, label: 'BIGSCREEN', cap: '全域态势大屏：世界节点分布 + 实时交易流' },
      ],
    },
  },
  {
    code: 'QUANT-TERM',
    en: 'QUANT TERMINAL',
    name: '量化挖掘终端',
    tag: '事件驱动回测 · 执行台',
    desc: '上层应用：同一套执行内核跑回测与仿真，撮合引擎还原排队与冲击成本；课堂里学生改一个参数就能看到夏普、回撤、换手的真实变化。',
    intent: '区块链与联盟链实训',
    demo: '#',
    specs: [['回测引擎', '事件驱动'], ['历史深度', '8.4 年'], ['参数网格', '3,240 组'], ['下单延迟', '≤ 6ms']],
    clip: {
      src: '/img/products/quantterm.mp4',
      poster: '/img/products/quantterm.webp',
      domain: 'quantterm.tianze.local',
      peek: 11.0,
      chapters: [
        { t: 0.0, label: 'TERMINAL', cap: '终端登录：行情源实时接入 · 事件驱动内核' },
        { t: 4.4, label: 'DESK', cap: '执行台：净值与回撤、盘口深度、因子归因与执行日志' },
        { t: 9.4, label: 'BACKTEST', cap: '回测中心：K线信号、参数网格排行与月度收益热力' },
      ],
    },
  },
]

/* ---------------- 产品价值 ----------------
   这四句是全站的价值口径，不是单独一屏：它住在「差异化优势」的收口条里
   （见 sections/Strengths.jsx）。原来那一屏「价值轨道图」是个转圈装饰，
   信噪比太低，已经合掉。 */
export const valueHead = {
  en: 'CORE VALUE',
  zh: '天择教育可以为您做什么',
  desc: '帮助高校把合适的知识，在合适的课堂节奏里，用合适的方式，交给合适的学生 —— 让教学质量第一次变得可度量、可优化、可复制。',
}
export const valueNodes = [
  { en: 'KNOWLEDGE', zh: '合适的知识' },
  { en: 'PACING', zh: '合适的课堂节奏' },
  { en: 'METHOD', zh: '合适的方式' },
  { en: 'LEARNER', zh: '合适的学生' },
]

/* ---------------- 平台能力（选一看一） ---------------- */
export const featuresHead = { en: 'PLATFORM CAPABILITIES', zh: '平台能力', sub: '六项能力共用一套身份、一份数据、一条审计链 —— 覆盖备课、授课、实训、评价、运营全链路' }
export const features = [
  {
    id: 'classroom',
    tag: 'AI 课堂',
    title: '一键生成多智能体互动课堂',
    desc: '输入教学主题或上传大纲 / PPT / PDF，两阶段流水线自动生成"幻灯片 + 讲解 + 测验 + 项目任务"的完整课程。AI 教师语音讲解并实时板书，AI 同学主动举手辩论，助教课后单独补课 —— 像真实学习小组一样上课。',
    bullets: ['3-10 分钟出课', '白板推演与标注', '课堂纪要自动沉淀'],
    visual: 'classroom',
  },
  {
    id: 'ide',
    tag: 'AI 实训',
    title: '自然语言生成实验代码',
    desc: '学生用大白话描述任务，如"写一个 ROS 机械臂抓取策略并加入失败重试"，AI 即时生成规范的 Python / C++ / Solidity 代码，在云端沙箱直接运行、可视化回放评分，把实验门槛从"会写代码"降到"会说人话"。',
    bullets: ['云端沙箱秒级运行', '报错自动定位讲解', '代码查重与评分'],
    visual: 'ide',
  },
  {
    id: 'analytics',
    tag: '学情分析',
    title: '结构化 AI 学情分析报告',
    desc: '不止分数：AI 基于答题行为、代码提交、课堂发言多维数据，输出每个知识点掌握度、班级薄弱点漏斗与个性化补救建议，支持历史回顾与校准，让教学改进有据可依。',
    bullets: ['知识点掌握漏斗', '薄弱项班级对比', 'AI 生成辅导建议'],
    visual: 'analytics',
  },
  {
    id: 'timing',
    tag: '智能调度',
    title: '最佳教学时机预测',
    desc: 'AI 算法引擎预测每位学生的专注曲线与遗忘曲线，智能安排复习提醒、测验下发与实验任务推送时机，降低打扰的同时提升完课率与留存。',
    bullets: ['遗忘曲线复习调度', '任务智能下发', '预警辍学风险学生'],
    visual: 'timing',
  },
  {
    id: 'twin',
    tag: '数字孪生',
    title: '实验室数字孪生与安全包',
    desc: '机械臂、机器人、产线设备 1:1 数字孪生，学生先在虚拟环境试错再到真机执行；内置内容安全审核、实验操作预警与一键回滚，为实训安全保驾护航。',
    bullets: ['设备级虚拟仿真', '操作风险预警', '实训过程可回放'],
    visual: 'twin',
    img: '/images/d_labiso.webp',
  },
  {
    id: 'private',
    tag: '私有部署',
    title: '校本专属云与源码级定制',
    desc: '为数据安全要求高的院校提供全功能私有化部署，支持对接教务系统、统一身份认证与校园算力集群；开放 API 与插件机制，支持二次开发和本地化定制。',
    bullets: ['信创环境适配', '教务系统直连', '源码授权可选'],
    visual: 'private',
  },
]

/* ---------------- AI 能力 ---------------- */
export const aiHead = {
  en: 'AI CAPABILITIES',
  zh: 'AI 贯穿教学研全链路',
  desc: '从备课到迭代，教学研的每一步都有 AI 在场。下面这堂课，正被系统实时生成、讲授并被数据反哺 —— 你可以当堂计时验证。',
}
export const aiAgents = [
  { icon: UserRound, role: 'AI 教师', desc: '语音讲解、操控幻灯片与白板，根据学生回应现场重组讲法、动态调整节奏' },
  { icon: Users, role: 'AI 同学', desc: '不同基础与观点的虚拟学生，主动提问、发起辩论，制造真实课堂社交动力学' },
  { icon: GraduationCap, role: 'AI 助教', desc: '随堂巡视答题状态，课后对薄弱学生"悄悄补课"，不当众让人难堪' },
  { icon: Clapperboard, role: '导演智能体', desc: '基于状态机编排发言顺序与课堂节奏，协调多智能体丝滑衔接' },
]
export const aiEngine = [
  { icon: Code2, title: '自然语言 → 可执行实验', desc: '一句话描述生成策略 / 控制 / 合约代码，附带解释与回测曲线' },
  { icon: Repeat2, title: '闭环研究引擎', desc: '课堂数据 → AI 分析 → 参数网格搜索 → 内容迭代，全自动演进' },
  { icon: Sparkles, title: '多模型智能调度', desc: 'DeepSeek / GLM / Kimi / 通义等多 LLM 接入，自动健康检测与故障切换' },
  { icon: FileSearch, title: '分析记忆与校准', desc: '历史学情报告可复查、可校准，越用越懂这个班' },
]

/* ---------------- 差异化优势 ----------------
   四条每一条都带一句 check：学校能在尽调 / 现场怎么验它。
   B 端采购听到「提升 10×」第一反应是怀疑，听到「您当堂计时」才是安心。 */
export const strengthsHead = { en: 'WHY TIANZE', zh: '差异化优势' }
export const strengths = [
  {
    icon: Cpu,
    title: '备课从 3–6 周压到 3–10 分钟',
    desc: '老师只做设计与引导，重复劳动交给智能体；一节课的课件、测验、项目任务一次生成。',
    check: '现场给一个主题，我们当堂出课，您计时。',
  },
  {
    icon: Layers3,
    title: '四套内核全栈自研',
    desc: '多智能体编排、自然语言实验、数字孪生引擎、可信账本都在自己手里，因此能私有化、能换模型、能改流程。',
    check: '可查 4 项发明专利与 60+ 项软著的登记号。',
  },
  {
    icon: Building2,
    title: '产业侧真实项目与数据集',
    desc: '与企业共建项目库，学生做的是真需求而不是习题集；旧平台 37 套系统、492 条实验项目持续在用。',
    check: '索取项目清单，抽一个专业核对来源。',
  },
  {
    icon: ShieldCheck,
    title: '数据主权留在学校',
    desc: '全栈私有化、信创环境适配、统一身份与教务直连，操作与内容都有审计日志，支持一键回滚。',
    check: '把部署边界与运维责任写进合同附件。',
  },
]

/* ---------------- 价值账（量化 ROI，可尽调） ----------------
   与 Strengths 的定性收口互补：那里讲“为什么选我们”，这里把价值算成
   一笔笔 from→to 的账，每笔附一句现场可核的话。数字均沿用站内既有口径。 */
export const ledgerHead = {
  en: 'VALUE LEDGER',
  zh: '价值度量与验收口径',
  sub: '高校采购不听“提升 10×”，只信能核对的数。下面每一笔都写清从哪到哪、以及现场怎么验。',
}
export const ledgerTop = [
  { k: '备课周期', a: '3–6 周', b: '3–10 分钟' },
  { k: '课堂互动率', a: '传统基线', b: '+38%' },
  { k: '实验室利用率', a: '< 40%', b: '92%' },
  { k: '首批开课', a: '一学年', b: '9–13 周' },
]
export const ledgerBooks = [
  {
    icon: GaugeCircle, name: '效率账', tag: '重复劳动交给智能体',
    rows: [
      { k: '一堂课的课件 / 测验 / 项目', a: '教师 3–6 周手工', b: '系统 3–10 分钟生成' },
      { k: '新开一门实验课', a: '要先会写代码', b: '自然语言描述即可' },
    ],
    check: '现场给一个主题，我们当堂出课，您计时。',
  },
  {
    icon: Target, name: '质量账', tag: '参与度与掌握度可量化',
    rows: [
      { k: '课堂互动率', a: '讲授型基线', b: '+38%（可回看）' },
      { k: '薄弱学生处理', a: '课后无人跟进', b: 'AI 助教单独补课' },
    ],
    check: '调取任一班级的学情看板逐条复查。',
  },
  {
    icon: Layers3, name: '成果账', tag: '可申报、可展示、可验收',
    rows: [
      { k: '学生出口', a: '一次性作业', b: '竞赛 / 1+X / 作品集' },
      { k: '验收材料', a: '临阵拼凑', b: '过程数据自动成链' },
    ],
    check: '索取成果清单，抽一个专业核对来源。',
  },
]
export const ledgerAsset = {
  title: '还有一笔资产账，越用越值钱',
  desc: '课堂行为、题库、课件与实验在项目里持续沉淀为校本资产；旧平台 37 套系统、492 条实验项目整体迁入复用，不推倒重来、不重录数据。',
  stats: [{ k: '迁入旧系统', v: '37 套' }, { k: '复用实验项目', v: '492 条' }, { k: '升级不换系统', v: '0 次' }],
}

/* ---------------- 合作高校 ---------------- */
export const customersHead = { en: 'PARTNER INSTITUTIONS', zh: '已合作院校', sub: '已服务全国 100+ 高校，覆盖 30+ 省市' }
export const customers = ['清华大学', '浙江大学', '上海交通大学', '华南理工大学', '北京理工大学', '深圳职业技术大学', '北理莫斯科大学', '哈尔滨工业大学（深圳）']
export const caseFeatured = {
  school: '北京理工大学',
  img: '/images/d_casephoto.webp',
  tags: ['AI实验室', '具身智能实验室', '工程实训中心'],
  metrics: [
    { k: '建设面积', v: '5,000㎡' },
    { k: '服务学生', v: '5,000+' },
    { k: '课程数量', v: '300+' },
  ],
}

/* ---------------- 资源专区 ----------------
   以前这 12 条是纯文字 + 一个 preventDefault 的空 <a>：看上去是个
   目录，点上什么都不会发生。现在每条都有真去处：能在线看的指到
   对应页面锚点，需要先给材料的指到联系我们，并用 kind 标出来 ——
   高校要白皮书与对接手册是常态，「留联系方式才给」本身就是入口。 */
export const resourcesHead = { en: 'RESOURCES', zh: '资源专区' }
export const resources = [
  {
    title: '产品文档',
    items: [
      { label: '平台简介与技术栈', to: '/technology#stack', kind: '在线' },
      { label: '多智能体课堂引擎', to: '/technology#bases', kind: '在线' },
      { label: '实验沙箱与代码生成', to: '/technology#bases', kind: '在线' },
      { label: '部署、安全与运维约束', to: '/technology#assurance', kind: '在线' },
    ],
  },
  {
    title: '开发者指南',
    items: [
      { label: '开放课堂协议接入', to: '/technology#open', kind: '在线' },
      { label: '三条接入路径与源码授权', to: '/technology#open', kind: '在线' },
      { label: '教务系统对接与统一认证', to: '/technology#assurance', kind: '在线' },
      { label: '课堂描述文件字段说明', to: '/technology#pipeline', kind: '在线' },
    ],
  },
  {
    title: '下载与体验',
    items: [
      { label: '《高校 AI 实训建设方案》模板', to: '/#contact', kind: '洽谈提供' },
      { label: 'Demo 体验环境申请', to: '/#contact', kind: '申请开通' },
      { label: '同类院校案例集', to: '/cases', kind: '洽谈提供' },
      { label: '产品实机演示（链 / 课堂 / 具身）', to: '/#matrix', kind: '在线' },
    ],
  },
]

/* ---------------- 联系我们 ---------------- */
export const contactHead = { en: 'CONTACT', zh: '联系我们', desc: '留下您的联系方式，我们的方案专家与教育顾问将在 1 个工作日内与您联系。' }
export const contactProducts = ['AI 多智能体课堂', '自然语言实验平台', '数字孪生实验室', '区块链与联盟链实训', '课程资源共建', '私有化部署', '其他合作']
export const contact = {
  phone: '400-000-0000',
  email: 'contact@sztzjy.com',
  address: '深圳市南山区 · 科技园',
}
export const offices = ['深圳总部', '北京', '重庆', '郑州', '西安', '长沙']

/* ---------------- 页脚 ---------------- */
export const footerNav = [
  {
    title: '产品',
    links: [
      { label: 'AI 多智能体课堂', to: '/#ai' },
      { label: '自然语言实验平台', to: '/#features' },
      { label: '数字孪生实验室', to: '/laboratories' },
      { label: '学情分析引擎', to: '/#features' },
    ],
  },
  {
    title: '解决方案',
    links: [
      { label: 'AI 人工智能实验室', to: '/solutions' },
      { label: '具身智能实验室', to: '/solutions' },
      { label: '区块链实验室', to: '/solutions' },
      { label: '工程实训中心', to: '/solutions' },
      { label: '未来校园 · 创新中心', to: '/solutions' },
    ],
  },
  {
    title: '资源',
    links: [
      { label: '技术文档', to: '/#resources' },
      { label: '白皮书下载', to: '/#resources' },
      { label: 'Demo 申请', to: '/#resources' },
      { label: '高校案例', to: '/cases' },
    ],
  },
  {
    title: '公司',
    links: [
      { label: '关于我们', to: '/about' },
      { label: '联系我们', to: '/#contact' },
      { label: '加入我们', to: '/about' },
      { label: '合作生态', to: '/about' },
    ],
  },
]
