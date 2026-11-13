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
  BarChart3,
  ShoppingCart,
} from 'lucide-react'
import { PRODUCTS, PRODUCT_NAMES, SOLUTIONS, SOLUTION_NAMES } from './vocabulary'

/* ---------------- 品牌与导航 ---------------- */
export const brand = {
  name: '天择教育科技有限公司', // 法定全称：页脚版权、SEO 标题、正文里需要正式指代公司时用
  short: '天择科技',           // 日常口径：logo 副行、卡片标题等紧凑位置
  en: 'TIANZE',
  tagline: 'Infrastructure for Future Talent',
  positioning: '构建下一代人才培养基础设施',
}

/* ---------------- 新闻资讯：真实校企合作新闻，全部来自各校官网公开报道，
   点击跳转官网原文（新窗口）。只保留有详情页的条目；img 仅放官网抓取的真实
   配图，抓不到就置 null（列表不显示缩略图）。新增/删除只改这份数组：按日期
   倒序插入即可，第一条自动成为头条，其余进右侧分页列表，年份区间与分页
   全自动适配，条目数量不限。 ---------------- */
export const newsItems = [
  { date: '2025-06-25', tag: '课程共建', img: '/images/news/2025-06-25.webp', org: '培华学院经济金融学院', title: '校政企携手，共筑《国际金融》课程建设新篇章',
    desc: '公司西北区负责人走进校园，与院校师生（含留学生）同上一堂校企共建的《国际金融》课。',
    url: 'https://www.peihua.cn/phkjjrxy/info/1106/7981.htm' },
  { date: '2025-05-08', tag: '实习基地', img: '/images/news/2025-05-08.webp', org: '广州华商学院数字金融学院', title: '金融科技系师生走访，落实专业实习岗位',
    desc: '系主任带队走访公司，公司计划为金融科技专业学生提供实习岗位。',
    url: 'https://www.gzhs.edu.cn/info/1010/3672.htm' },
  { date: '2025-03-14', tag: '实习基地', img: '/images/news/2025-03-14.webp', org: '贵州农业职业学院经济管理学院', title: '共建「AI+数字经管人才实习就业服务基地」',
    desc: '院长王亚新一行来访，就基地共建、人才培养、学科与专业建设展开深入探讨。',
    url: 'http://www.gzasc.edu.cn/jgxy/info/1496/3689.htm' },
  { date: '2024-04-26', tag: '师资培训', img: '/images/news/2024-04-26.webp', org: '贵州商学院', title: 'AI 金融与数字经济实践课程 · 师资研修沙龙',
    desc: '行业专家进校授课，覆盖金融大数据教学经验与 AI 大模型应用教学，学院教师全员参训。',
    url: 'https://bs.gznc.edu.cn/info/1008/7541.htm' },
  { date: '2024-03-20', tag: '来访交流', img: '/images/news/2024-03-20.webp', org: '湖南人文科技学院金融学院', title: '校企合作交流',
    desc: '公司湖南总经理一行到访，金融工程教研室与教师代表参加，交流实训与就业合作。',
    url: 'https://www.huhst.edu.cn/sxx/info/1004/10998.htm' },
  { date: '2024-01-02', tag: '实践参访', img: '/images/news/2024-01-02.webp', org: '广州工商学院投资学教研室', title: '校外实践基地师生走访',
    desc: '投资学专业师生走进公司，了解行业用人需求与金融科技岗位实践。',
    url: 'https://www.gzgs.edu.cn/sxy/info/1180/4168.htm' },
  { date: '2023-04-10', tag: '来访交流', img: '/images/news/2023-04-10.webp', org: '广东第二师范学院数学学院', title: '企业进校访问交流',
    desc: '公司到访学院，围绕校企协同育人与实践教学展开交流。',
    url: 'https://www.gdei.edu.cn/2023/0412/c1325a81683/page.htm' },
  { date: '2019-12-20', tag: '产教论坛', img: '/images/news/2019-12-20.webp', org: '南方科技大学数学系', title: '金融科技实践教学暨金融机构调研参访研讨会',
    desc: '南科大主办、天择科技承办，清华 SIGS、平安科技等机构共议金融科技实践教学。',
    url: 'https://math.sustech.edu.cn/news/11717.html?lang=zh' },
]

export const nav = [
  { label: '首页', to: '/' },
  { label: '解决方案', to: '/solutions' },
  { label: '产品体系', to: '/products' },
  { label: '教学设备', to: '/devices' },
  { label: '高校案例', to: '/cases' },
  { label: '校企合作', to: '/partnership' },
  { label: '关于我们', to: '/about' },
]
export const navCta = { label: '预约演示', to: '/about#contact' }

/* ---------------- 一站式 AI 方案顾问（原首屏 Hero，现位于痛点之后、产品矩阵之前）---------------- */
export const advisorKicker = '构建下一代人才培养基础设施'
export const advisorTitle = ['用科技重塑教育', '让培养的人才', '站在时代前沿']
export const advisorDesc =
  '我们为高校提供区块链、数字金融、创新金融、数字经济、新商科大数据、数智电商、智能产品七大产品体系，以及数字经济、金融科技、应用统计、新商科大数据、工商科一体化五套实验教学方案，助力高校打造面向未来的实验室、课程体系与产业实践平台。'
export const advisorCtas = [
  { label: '免费开通试用', primary: true },
  { label: '方案咨询', primary: false },
  { label: '技术文档', primary: false },
  { label: 'Demo 下载', primary: false },
]
export const advisorConsoleUrl = 'console.sztzjy.com / ai-engine'
export const advisorStats = [
  { value: 800, suffix: '+', label: '合作高校' },
  { value: 30, suffix: '+', label: '覆盖专业' },
  { value: 300000, suffix: '+', label: '服务学生' },
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

/* ---------------- 产品矩阵（7 大产品体系 · 整屏轮播） ----------------
   七个体系名与顺序对齐客户《产品体系和截图》的文件夹：0 区块链、1 数字金融、
   2 创新金融、3 数字经济、4 新商科大数据、5 数智电商、6.智能产品。每个体系下的
   产品也严格按各自文件夹的子目录名称与序号排列，没有对应文件夹的产品已删除。
   表现形式统一为 GalleryScreen 图片画廊（区块链前两套沿用上版真实录屏），
   界面截图取该文件夹内的真实系统截图（public/images/products/）。
   原独立的「具身智能」3D 展台体系已并入「智能产品」
   下的具身智能机器人产品 —— 展示效果原样保留，见 embodiedSystem 与 EmbodiedScreen。 */
export const matrixHead = {
  en: 'PRODUCT MATRIX',
  zh: '产品体系',
  desc: '从一条真实联盟链，到金融、数字经济、新商科与智能装备的整套实训系统 —— 七个可单独使用、也可整体交付的产品体系。',
}

/* 具身智能机器人实验室：原 01 独立体系的完整展示数据。现作为「智能产品」体系下
   具身智能机器人产品的展开内容（3D 环形展台 + 六机型选型），整体展示
   效果与旧版一致，仅咨询意向归口到智能产品体系。 */
export const embodiedSystem = {
  id: 'embodied',
  en: 'EMBODIED ROBOT LAB',
  icon: Bot,
  title: '具身智能 · 机器人实验室',
  tagline: '从空间、硬件到软件，构建真正可以使用的机器人学习与实践环境',
  desc: '面向学校的完整具身机器人实验室方案：机器人硬件设备、实验管理平台、教学资源与技术支持一体交付，让学生在真实机器人环境中学习、实践与创新。',
  bullets: ['多机协同实验', '远程控制与监控', '数据采集与分析', '开放式开发接口'],
  stats: [{ k: '落地实验室', v: '200+' }, { k: '配套课程', v: '320+' }],
  intent: PRODUCT_NAMES['smart-products'],
}

export const productMatrix = [
  {
    id: 'blockchain',
    en: 'BLOCKCHAIN & LEDGER',
    icon: Blocks,
    title: PRODUCT_NAMES.blockchain,
    tagline: '从联盟链搭建到链上数据与数字人民币，七套系统覆盖区块链全链路',
    desc: '七套系统按区块链的真实技术栈排布：FISCO 联盟链搭建与智能合约部署打底，链上数据 ETL 聚合与态势分析展开，再到数字人民币、区块链发票与区块链供应链的应用实训收口。前两套配上真实操作录屏，其余各套均带界面实景与适用专业。',
    bullets: ['FISCO 联盟链 · 合约部署', '链上数据 ETL · 态势大屏', '数字人民币 · 发行兑换支付', '区块链发票 · 供应链溯源'],
    stats: [{ k: '实训系统', v: '7 套' }, { k: '实景演示', v: '2 录屏 · 13 图' }],
    intent: PRODUCT_NAMES.blockchain,
    rich: 'gallery',
  },
  {
    id: 'digital-finance',
    en: 'DIGITAL FINANCE',
    icon: Landmark,
    title: PRODUCT_NAMES['digital-finance'],
    tagline: '从量化交易到征信风控，把数字金融的完整链路搬进课堂',
    desc: '七套系统按数字金融的真实链路排布：量化投资与数智财经运营决策打底，风险管理、数字营销与金融大数据挖掘展开，再到机器学习与数字征信收口。每套系统都带真实界面实景与适用专业，点缩略图即可逐幕查看。',
    bullets: ['量化投资交易平台', '数智财经运营决策', '风险管理 · 数字营销', '大数据挖掘 · 机器学习 · 征信'],
    stats: [{ k: '实训系统', v: '7 套' }, { k: '界面实景', v: '14 张' }],
    intent: PRODUCT_NAMES['digital-finance'],
    rich: 'gallery',
  },
  {
    id: 'innovation-finance',
    en: 'INNOVATION FINANCE',
    icon: Briefcase,
    title: PRODUCT_NAMES['innovation-finance'],
    tagline: '银行、保险、投资到供应链金融，经典金融业务逐岗位仿真',
    desc: '从财商素养游戏化通识到商业银行、保险、风险投资、供应链金融与公司金融等经典业务：按真实机构岗位流程设计，案例数据内置、规则校验自动评分，学生在校内即可走完一笔完整业务。',
    bullets: ['商业银行 · 保险综合业务', '风险投资 · 模拟交易', '供应链金融 · 公司金融', '智能理财 · 财商素养'],
    stats: [{ k: '实训系统', v: '8 套' }, { k: '界面实景', v: '21 张' }],
    intent: PRODUCT_NAMES['innovation-finance'],
    rich: 'gallery',
  },
  {
    id: 'digital-economy',
    en: 'DIGITAL ECONOMY',
    icon: DatabaseZap,
    title: PRODUCT_NAMES['digital-economy'],
    tagline: '数字贸易、产业数字化到 AI 大数据，数字经济四大领域一体实训',
    desc: '围绕数据价值化、数字产业化、产业数字化与数字化治理四大领域：企业数字化转型、数字经济基础、数字营销、数字贸易与 AI 智能大数据五套系统，支撑从数字经济概论到专项实训的完整课程链。',
    bullets: ['企业数字化转型', '数字经济基础 · 双碳实验', '数字营销 · 数字贸易', 'AI 智能大数据综合实验'],
    stats: [{ k: '实训系统', v: '5 套' }, { k: '界面实景', v: '12 张' }],
    intent: PRODUCT_NAMES['digital-economy'],
    rich: 'gallery',
  },
  {
    id: 'new-business-data',
    en: 'NEW BUSINESS BIG DATA',
    icon: BarChart3,
    title: PRODUCT_NAMES['new-business-data'],
    tagline: '财务、期货到文本挖掘，新商科的数据分析底座',
    desc: '面向新商科的数据分析底座：Python 基础与大数据分析方法论 + 文本挖掘与金融数据可视化 + 财务、期货行业场景 + 机器学习与应用计量经济工具链，共用一套实训、考核与学情统计口径。',
    bullets: ['大数据分析实训', '财务 · 期货场景', '文本挖掘 · 数据可视化', '机器学习 · 应用计量经济'],
    stats: [{ k: '实训平台', v: '7 套' }, { k: '界面实景', v: '15 张' }],
    intent: PRODUCT_NAMES['new-business-data'],
    rich: 'gallery',
  },
  {
    id: 'ecommerce',
    en: 'E-COMMERCE',
    icon: ShoppingCart,
    title: PRODUCT_NAMES['ecommerce'],
    tagline: '从产品开发到大数据运营，电商核心岗位全流程实训',
    desc: '对接数智电商核心业务岗位：互联网产品开发、网店运营、跨境电商与电商大数据分析四套系统，从数据化选品到投放评估全流程实训，配 BI 大屏与学情分析。',
    bullets: ['互联网产品开发', '网店运营全岗位', '跨境电商综合实训', '电商大数据综合分析'],
    stats: [{ k: '实训系统', v: '4 套' }, { k: '界面实景', v: '8 张' }],
    intent: PRODUCT_NAMES['ecommerce'],
    rich: 'gallery',
  },
  {
    id: 'smart-products',
    en: 'INTELLIGENT PRODUCTS',
    icon: Cpu,
    title: PRODUCT_NAMES['smart-products'],
    tagline: '从具身机器人实验室到 AI 数字人课件，软硬件结合的智能装备',
    desc: '软硬件结合的智能产品系列：具身智能机器人实验室以人形、机械臂、移动与视觉成套装备构建真实机器人实践环境（3D 展台选型），配 AI 金融智能陪练、AI 保险智能体、智能投顾机器人、AI 数字人应用智能课件平台与视觉分拣实训设备，把前沿 AI 能力压缩成可直接开课的教学装备。',
    bullets: ['具身机器人实验室 · 3D 展台', 'AI 陪练 · 保险智能体', '智能投顾 · 数字人课件', '机器视觉 · 分拣实训'],
    stats: [{ k: '智能产品', v: '6 项' }, { k: '交付形态', v: '软硬件结合' }],
    intent: PRODUCT_NAMES['smart-products'],
    rich: 'gallery',
  },
]

/* ---------------- 图片画廊体系的产品目录 ----------------
   体系与产品严格对齐客户《产品体系和截图》文件夹：体系 = 一级目录（0 区块链 …
   6.智能产品），产品 = 该体系下的子目录，顺序按子目录序号，名称逐字取子目录名，
   没有对应子目录的产品已删除。描述取自《产品简介.docx》原文（截到句读），无原文
   的按界面实景或产品形态撰写；截图为该文件夹内的真实系统界面
   （public/images/products/<slug>/），thumb 为缩略图条封面。shots 的 label/cap 供
   舞台底栏分幕刻度使用。n=0 表示无界面截图：仅具身智能机器人豁免（它走 3D 环形
   展台而非截图画廊），thumb 置空、shots 为空数组。 */
const gal = (slug, code, en, name, tag, desc, majors, n, intent) => ({
  slug,
  code,
  en,
  name,
  tag,
  desc,
  majors,
  intent,
  thumb: n > 0 ? `/images/products/${slug}/thumb.webp` : null,
  shots: Array.from({ length: n }, (_, k) => ({
    src: `/images/products/${slug}/${String(k + 1).padStart(2, '0')}.webp`,
    label: `VIEW ${String(k + 1).padStart(2, '0')}`,
    cap: `${name} · 操作界面实景 ${k + 1}`,
  })),
})

export const galleryProducts = {
  blockchain: [
    gal('fisco-chain', 'FISCO', 'FISCO BCOS CHAIN', 'FISCO联盟链技术开发实验平台', 'FISCO BCOS · 4 阶段 19 实验', '基于 FISCO BCOS 联盟链的技术开发实训：从区块链认知、环境搭建到智能合约编写部署、账户与钱包管理、链上管理，按 4 阶段 19 个实验由浅入深，配实训状态与学习路径进度看板。', '金融科技、区块链工程', 3, PRODUCT_NAMES.blockchain),
    gal('crypto-etl', 'CRYPTO-ETL', 'CRYPTO DATA ETL', '数字货币ETL数据分析实验平台', '全球多链 · 链上数据 ETL 聚合', '面向全球主流公链的链上数据 ETL 与智能分析网络：实时聚合市值、交易、节点与合约指标，提供多链对比、下钻分析与态势大屏，支撑数据素养与链上风控实训。', '金融科技、数据科学与大数据技术', 3, PRODUCT_NAMES.blockchain),
    gal('blockchain-tech', 'BC-TECH', 'BLOCKCHAIN TECH & APP', '区块链技术与应用实验系统', '联盟链 · 合约 · NFT 全流程', '区块链技术与应用全流程实训：联盟链搭建、智能合约编写部署到 NFT 市场应用，覆盖数字经济、数字藏品、企业资产管理、征信、农产品溯源、跨境贸易与保险七大应用场景，配 AI 智能助手。', '金融科技、区块链工程', 3, PRODUCT_NAMES.blockchain),
    gal('e-cny-lab', 'E-CNY', 'DIGITAL RMB LAB', '数字人民币实验平台', '央行 → 商行 → 企业 → 个人四层模拟', '系统参照央行数字人民币专利文件设计，模拟数字人民币生成、发行、兑换、支付、钱包管理全流程，含四层业务模拟与流通可视化监控大屏。', '金融科技、数字经济', 3, PRODUCT_NAMES.blockchain),
    gal('digital-invoice', 'D-INV', 'BLOCKCHAIN INVOICE', '数字发票（区块链发票）实验系统', '多角色协同 · 发票上链溯源', '区块链发票业务仿真：企业、税务局、消费者等多角色协同，还原发票开具、流转、报销与查验全链路，票面信息上链可溯源。', '金融科技、数字经济', 3, PRODUCT_NAMES.blockchain),
    gal('digital-supply-chain', 'D-SC', 'BLOCKCHAIN SUPPLY CHAIN', '数字供应链（区块链供应链）实验系统', '四大角色 · 交易上链溯源', '系统模拟区块链在供应链运作中的应用，构建核心企业、一级/二级供应商、保理商四大角色，交易环节上链溯源，内置真实供应链融资合同表单。', '金融科技、供应链管理', 2, PRODUCT_NAMES.blockchain),
    gal('e-cny-app', 'E-CNY-APP', 'DIGITAL RMB APPLICATION', '数字人民币综合应用实验系统', '央行 → 商行 → 用户全链路实验', '数字人民币综合应用实验：覆盖中国人民银行生成与发行数字货币、商业银行兑换、用户开通钱包与兑换支付等全流程实验，内置实验中心与成绩报告，支撑数字货币综合实训。', '金融科技、数字经济', 2, PRODUCT_NAMES.blockchain),
  ],
  'digital-finance': [
    gal('quant-invest', 'QUANT-INV', 'QUANT INVESTMENT', '量化投资交易平台', '策略开发 · 回测到实盘全流程', '系统面向学术机构、投资机构及高端个人投资者，提供策略开发、历史回测、仿真交易、实盘交易、风险控制和资产管理全流程量化投资解决方案。', '金融工程、金融数学', 3, PRODUCT_NAMES['digital-finance']),
    gal('smart-biz-ops', 'BIZ-OPS', 'SMART BUSINESS OPS', '数智财经运营决策实战系统', '虚拟商业社会 · 跨专业分岗实训', '平台构建虚拟商业社会环境，以数字经济时代智能制造企业运营为主线开展跨专业综合实训，含撮合交易竞争机制与碳定价碳交易沙盘模拟。', '工商管理、财务管理等跨专业', 3, PRODUCT_NAMES['digital-finance']),
    gal('fin-risk-mgmt', 'FIN-RISK', 'FIN RISK MANAGEMENT', '金融风险管理系统', '109 套案例 · 218 套模型代码', '平台以在线 Python 编译器为工具，从教、学、练、考、赛五方面模块化设计，内置 109 套案例、218 套模型代码，将抽象风险概念可视化。', '金融工程、金融科技', 2, PRODUCT_NAMES['digital-finance']),
    gal('fin-digital-marketing', 'FIN-MKT', 'FIN DIGITAL MARKETING', '金融数字营销教学实训系统', '营销技术 · 算法 · 画像 · BI 五大板块', '系统面向大数据、人工智能、大模型背景下的金融营销人才培养，涵盖数字营销技术、营销算法、用户画像、BI 可视化与综合实训五大板块。', '金融学、市场营销', 2, PRODUCT_NAMES['digital-finance']),
    gal('fin-bigdata-mining', 'FIN-MINING', 'FIN BIG DATA MINING', '金融大数据挖掘分析系统', '在线 Python · 项目化任务化实训', '平台采用 BS 架构，以在线 Python 编译器为基础，以"项目化、任务化、步骤化"为学习单元，涵盖 Python 语言基础到行业应用系列场景。', '金融科技、数字经济、统计学', 2, PRODUCT_NAMES['digital-finance']),
    gal('ml-lab', 'ML-LAB', 'MACHINE LEARNING', '机器学习实验系统', '考练学一体 · 近 80 个案例集锦', '系统以在线 Python 编译器为工具，机器学习实验实操为主体、考练学一体，内置回归、决策树、随机森林、神经网络等案例与近 80 个案例集锦。', '人工智能、数据科学与大数据技术', 1, PRODUCT_NAMES['digital-finance']),
    gal('credit-reporting', 'CREDIT', 'CREDIT REPORTING', '数字征信实训系统', '征信画像 · 个人与企业征信三模块', '系统包含征信画像、个人征信、企业征信三大模块，基于大数据构建用户画像，利用 Python 统计分析识别优质客户，内置企业和个人案例数据。', '经济与金融、信用管理', 1, PRODUCT_NAMES['digital-finance']),
  ],
  'innovation-finance': [
    gal('fin-literacy-game', 'FIN-GAME', 'FIN LITERACY GAME', '财商素养动画游戏互动系统', '沉浸式财商游戏 · 9 大精品动画', '系统采用沉浸式财商模拟游戏形式，以"财富自由"为核心目标，集成资产配置、风险应对、现金流管控等金融逻辑，配 9 大财商精品动画。', '经济金融类课程', 2, PRODUCT_NAMES['innovation-finance']),
    gal('venture-capital', 'VC', 'VENTURE CAPITAL', '风险投资虚拟仿真系统', '注册制一级市场募投管退', '系统模拟注册制下一级市场基金投资运作，完整覆盖私募股权投资募、投、管、退四个流程，含财务尽调、估值、IPO 发行与择机退出收益分配。', '投资学、金融学、财务管理', 3, PRODUCT_NAMES['innovation-finance']),
    gal('fin-sim-trading', 'SIM-TRADE', 'SIMULATED TRADING', '金融模拟交易教学系统', '六大交易所实时行情 · 精准撮合', '系统严格按真实交易所规则设计，接入国内六大交易所实时行情，清算中心与撮合引擎分离，提供股票、基金、期货模拟交易与竞赛排名机制。', '投资学、金融工程', 3, PRODUCT_NAMES['innovation-finance']),
    gal('corporate-fin', 'CORP-FIN', 'CORPORATE FINANCE', '公司金融实训系统', '七大模块 · 18 个教学任务', '系统涵盖收益与风险、价值评估、投资决策、融资决策、营运资本管理、公司财务分析、财务预警七大模块共 18 个教学任务，引入 Python 计算与可视化。', '金融学、财务管理', 3, PRODUCT_NAMES['innovation-finance']),
    gal('supply-chain-fin', 'SCF', 'SUPPLY CHAIN FINANCE', '供应链金融教学系统', '五种供应链融资业务模式实验', '系统涵盖存货质押、保兑仓、应收账款质押、正向保理、反向保理五种融资业务模式实验，支持个人与分组分角色团队实验，自动评分统计成绩。', '金融学、供应链管理', 2, PRODUCT_NAMES['innovation-finance']),
    gal('wealth-planning', 'WEALTH', 'WEALTH PLANNING', '智能理财分析教学系统', '理财顾问岗位全流程规划', '系统参照真实理财机构要求、基于理财顾问岗位流程设计，涵盖风险测评、家庭财务报表分析到投资、保险、税务、传承规划的完整理财规划流程。', '金融学、财务管理', 2, PRODUCT_NAMES['innovation-finance']),
    gal('insurance-biz', 'INS', 'INSURANCE BUSINESS', '保险综合业务教学系统', '十八险种 · 九大角色全流程', '系统以保险公司内部经营为模板，涵盖财险寿险十八个险种、九大角色，实现从保险计划书制作、承保到理赔的全流程实验，内置全仿真单据。', '保险学、精算学', 3, PRODUCT_NAMES['innovation-finance']),
    gal('commercial-bank', 'BANK', 'COMMERCIAL BANKING', '商业银行综合业务', '七大业务模块 · 多岗位柜面模拟', '系统涵盖个人银行卡、存取款、贷款、对公活期、对公贷款、支付结算、国际结算七大业务模块，支持柜员、信贷员、国际结算专员等岗位模拟。', '金融学、投资学', 2, PRODUCT_NAMES['innovation-finance']),
  ],
  'digital-economy': [
    gal('enterprise-dx', 'DX', 'ENTERPRISE DIGITALIZATION', '企业数字化转型实验平台', '网络化 · 数字化 · 智能化 · 平台化', '平台遵循"网络化、数字化、智能化、平台化"方法论构建，涵盖物联网组网、数据治理、行业智能算法与大模型、AI 智能体与项目管理。', '数字经济、工商管理', 3, PRODUCT_NAMES['digital-economy']),
    gal('de-foundation', 'DE-BASE', 'DIGITAL ECONOMY BASE', '数字经济基础综合实验平台', '数据价值化等四大领域实验', '平台围绕数据价值化、数字产业化、产业数字化、数字化治理四大领域构建实验体系，含数据确权定价交易与碳配额、碳定价、碳交易双碳实验。', '金融科技、数字经济', 2, PRODUCT_NAMES['digital-economy']),
    gal('digital-marketing', 'D-MKT', 'DIGITAL MARKETING', '数字营销实验系统', '营销全链路数据分析实战', '数字营销实验环境覆盖营销环境分析、用户洞察、活动策划与效果评估的完整营销链路，内置数据分析工具与实战任务。', '电子商务、市场营销', 3, PRODUCT_NAMES['digital-economy']),
    gal('digital-trade', 'D-TRADE', 'DIGITAL TRADE', '数字贸易实验系统', '十三章 · 50+ 实务项目', '系统以数字教材框架模式为设计蓝图，涵盖十三个章节、50 多个实务项目，涉及数字贸易标准规则、法律法规、知识产权保护与数据要素交易。', '数字经济、国际经济与贸易', 2, PRODUCT_NAMES['digital-economy']),
    gal('de-ai-bigdata', 'DE-AI', 'DIGITAL ECONOMY & AI', '数字经济与AI智能大数据综合实验系统', '100+ 实验 · Python 与 AI 全流程', '系统构建理论学习、代码实践与行业应用一体的 Python 数据分析与 AI 应用实训体系，一站式在线编程环境内置超 100 个实验项目。', '数字经济、人工智能', 2, PRODUCT_NAMES['digital-economy']),
  ],
  'new-business-data': [
    gal('text-mining', 'TEXT', 'TEXT BIG DATA MINING', '文本大数据挖掘分析处理', '采集 · 分词 · 情感 · 知识图谱', '系统着眼商业文本数据全流程挖掘分析，训练数据采集、清洗、词性标注、情感分析、文本摘要、相似度计算等能力，可自动生成知识图谱。', '金融科技、人工智能', 3, PRODUCT_NAMES['new-business-data']),
    gal('fin-dataviz', 'FIN-VIZ', 'FIN DATA VISUALIZATION', '金融数据可视化展示系统', '拼接大屏 · 跑马灯与驾驶舱', '系统面向高校实验室提供集成性信息展示方案，支持跑马灯与驾驶舱项目，提供柱形图、折线图、饼图、雷达图、散点图、仪表盘等丰富图表类型。', '金融学、数据科学与大数据技术', 2, PRODUCT_NAMES['new-business-data']),
    gal('python-basics', 'PY', 'PYTHON BASICS', 'Python基础实训教学系统', '实训 · 考核 · 考试 · 资源四板块', 'Python 编程入门实训环境：实训演练、实战考核、理论考试与资源中心四大板块，配学习数据统计分析，支撑编程基础与数据处理入门实验。', '人工智能、数据科学与大数据技术', 2, PRODUCT_NAMES['new-business-data']),
    gal('bigdata-analytics', 'BD-ANALYTICS', 'BIG DATA ANALYTICS', '大数据分析实训教学平台', '采集 · 清洗 · 分析 · 可视化全流程', '大数据分析实训教学平台：实训演练、实战考核、理论考试与资源中心一体，配学习数据统计分析，支撑数据采集、清洗、分析与可视化全流程。', '数据科学与大数据技术、统计学', 2, PRODUCT_NAMES['new-business-data']),
    gal('ml-econometrics', 'ML-ECON', 'ML & ECONOMETRICS', '机器学习与应用计量经济学实训教学系统', '机器学习与计量建模一体化', '机器学习与应用计量经济学实训教学系统：实验进度与学习统计一屏总览，覆盖回归、分类与计量建模实验，支撑理论与实操一体化教学。', '人工智能、统计学', 2, PRODUCT_NAMES['new-business-data']),
    gal('fin-bigdata-analytics', 'FIN-BD', 'FINANCIAL BIG DATA', '财务大数据分析实训平台', '财务数据处理与指标可视化', '财务大数据分析实训平台：实训、考核、考试与资源中心一体，配学习数据统计分析，支撑财务数据处理、指标计算与可视化分析实验。', '财务管理、大数据管理与应用', 2, PRODUCT_NAMES['new-business-data']),
    gal('futures-bigdata', 'FUT-BD', 'FUTURES BIG DATA', '期货大数据分析教学平台', '期货行情采集与量化分析', '期货大数据分析教学平台：实训、考核、考试与资源中心一体，支撑期货行情数据采集、指标计算与量化分析实验。', '金融工程、统计学', 2, PRODUCT_NAMES['new-business-data']),
  ],
  ecommerce: [
    gal('ecom-product-dev', 'EC-DEV', 'E-COMMERCE PRODUCT DEV', '互联网产品开发实验系统', '选品 · 投放 · 供应 · 评估全岗位', '系统依托真实工作场景与电商核心业务岗位提炼技能点，实训涵盖市场需求挖掘、产品规划、投放测试、供应渠道管理与产品评估考核。', '电子商务、数字经济', 2, PRODUCT_NAMES['ecommerce']),
    gal('online-store', 'STORE-OPS', 'ONLINE STORE OPS', '网店运营实训系统', '开店 · 装修 · 推广 · 客服全岗位', '网店运营实训系统：覆盖网店开设、装修、商品管理、营销推广与客服售后等运营全岗位流程，支撑电子商务运营综合实训。', '电子商务', 2, PRODUCT_NAMES['ecommerce']),
    gal('cross-border-ecom', 'CB-ECOM', 'CROSS-BORDER E-COMMERCE', '跨境电商综合实训平台', '跨境开店 · 物流支付全流程', '跨境电商综合实训平台：覆盖跨境店铺开设、选品刊登、物流与海外仓、跨境支付结算与售后客服全流程，支撑跨境电商运营综合实训。', '电子商务、国际经济与贸易', 1, PRODUCT_NAMES['ecommerce']),
    gal('ecom-bigdata', 'EC-BD', 'E-COMMERCE BIG DATA', '电商大数据综合分析平台', '行业 · 竞争 · 用户数据分析', '电商大数据综合分析平台覆盖行业、竞争与用户数据分析实训，配考核、考试与资源中心，支撑数据化选品、运营与营销决策实验。', '电子商务、数字经济', 2, PRODUCT_NAMES['ecommerce']),
  ],
  'smart-products': [
    /* 具身智能机器人：原 01 独立体系并入此处，embodied 标记让画廊选中它时展开
       完整的 3D 环形展台（EmbodiedScreen），整体展示效果与旧版一致。放在首位以
       保留其旗舰展示地位，其余智能产品按 6.智能产品 文件夹序号走静态截图画廊。 */
    { ...gal('embodied-robot', 'EMBODIED', 'EMBODIED ROBOT', '具身智能 · 机器人', '人形 · 机械臂 · 移动视觉成套 · 3D 展台', '具身智能机器人实验室：人形、机械臂、移动与视觉成套装备，覆盖运动学、控制与抓取实训，配空间规划、课程体系与师资培训一体交付。选中即可进入 3D 环形展台逐型号查看。', '机器人工程、人工智能', 0, PRODUCT_NAMES['smart-products']), embodied: true },
    gal('ai-fin-coach', 'AI-COACH', 'AI FIN COACH', 'AI金融智能陪练实训系统', '数字人话术陪练 · 沉浸式对话训练', '系统融合语音合成与识别、大语言模型、智能体、数字人及数据分析等前沿 AI 技术，提供高度仿真的沉浸式对话训练场景与结构化话术陪练。', '金融学、数字经济', 2, PRODUCT_NAMES['smart-products']),
    gal('ai-insurance-agent', 'AI-INS', 'AI INSURANCE AGENT', 'AI保险智能体平台', '保险大模型 · 智能体问答', 'AI 保险智能体平台：以大模型与保险知识库驱动的智能体，覆盖产品讲解、投保咨询、核保理赔问答与话术陪练，支撑保险科技场景实训。', '保险学、金融科技', 1, PRODUCT_NAMES['smart-products']),
    gal('ai-advisor-robot', 'AI-ADVISOR', 'AI ADVISOR ROBOT', 'AI智能投顾机器人', '智能投顾 · 理财对话机器人', 'AI 智能投顾机器人：面向理财与投顾场景的对话机器人，结合用户画像与资产配置模型提供智能投顾问答与理财建议演示。', '金融学、投资学', 1, PRODUCT_NAMES['smart-products']),
    gal('ai-digital-human', 'DH-COURSE', 'AI DIGITAL HUMAN COURSEWARE', 'AI数字人应用智能课件平台', '一键备课 · 数字人课件生成', 'AI 数字人智能课件平台提供一键备课、PPT 生成、语音克隆、数字人视频与教学视频生成，把课程大纲变成可交付的数字人课件。', '数字媒体艺术、教育技术', 2, PRODUCT_NAMES['smart-products']),
    gal('vision-sorting', 'VISION-SORT', 'VISION SORTING', '智能视觉分拣教学实训设备', '机器视觉 · 分拣实训装备', '智能视觉分拣教学实训设备：以机器视觉识别与机械分拣一体的实训装备，覆盖图像采集、目标识别与分拣控制实验，支撑智能制造与机器视觉课程。', '人工智能、智能制造', 2, PRODUCT_NAMES['smart-products']),
  ],
}

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
    intent: PRODUCT_NAMES.blockchain,
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
    intent: PRODUCT_NAMES.blockchain,
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
    intent: PRODUCT_NAMES.blockchain,
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

/* 区块链画廊前两套沿用上一版的真实操作录屏：FISCO 联盟链 ↔ 联盟链搭建实训（chain.mp4），
   数字货币 ETL ↔ 链上态势感知平台（chainlens.mp4）。带 clip 的产品在画廊里走影片舞台
   （FilmStage）与悬停即播缩略图（ClipThumb），故清空静态 shots、保留录屏海报与体验入口；
   其余五套仍走静态截图。clip/demo 直接复用上一版数据，不另抄一份分幕文案。 */
;[
  [0, 0],
  [1, 1],
].forEach(([gi, bi]) => {
  const g = galleryProducts.blockchain[gi]
  g.clip = blockchainProducts[bi].clip
  g.demo = blockchainProducts[bi].demo
  g.shots = []
})

/* ---------------- 产品价值 ----------------
   这四句是全站的价值口径，不是单独一屏：它住在「差异化优势」的收口条里
   （见 sections/Strengths.jsx）。原来那一屏「价值轨道图」是个转圈装饰，
   信噪比太低，已经合掉。 */
export const valueHead = {
  en: 'CORE VALUE',
  zh: '天择科技可以为您做什么',
  desc: '帮助高校把合适的知识，在合适的课堂节奏里，用合适的方式，交给合适的学生 —— 让教学质量第一次变得可度量、可优化、可复制。',
}
export const valueNodes = [
  { en: 'KNOWLEDGE', zh: '合适的知识' },
  { en: 'PACING', zh: '合适的课堂节奏' },
  { en: 'METHOD', zh: '合适的方式' },
  { en: 'LEARNER', zh: '合适的学生' },
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
export const customersHead = { en: 'PARTNER INSTITUTIONS', zh: '已合作院校', sub: '已服务全国 800+ 高校，覆盖 26 个省市' }
export const customers = ['清华大学', '浙江大学', '上海交通大学', '华南理工大学', '北京理工大学', '深圳职业技术大学', '北理莫斯科大学', '哈尔滨工业大学（深圳）']
export const caseFeatured = {
  school: '北京理工大学',
  img: '/images/d_casephoto.webp',
  tags: [SOLUTION_NAMES['digital-economy'], SOLUTION_NAMES['biz-tech-integration'], '具身智能'],
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
      { label: '平台简介与技术栈', to: '/products', kind: '在线' },
      { label: '多智能体课堂引擎', to: '/products', kind: '在线' },
      { label: '实验沙箱与代码生成', to: '/products', kind: '在线' },
      { label: '部署、安全与运维约束', to: '/products', kind: '在线' },
    ],
  },
  {
    title: '开发者指南',
    items: [
      { label: '开放课堂协议接入', to: '/products', kind: '在线' },
      { label: '三条接入路径与源码授权', to: '/products', kind: '在线' },
      { label: '教务系统对接与统一认证', to: '/partnership', kind: '在线' },
      { label: '课堂描述文件字段说明', to: '/products', kind: '在线' },
    ],
  },
  {
    title: '下载与体验',
    items: [
      { label: '《高校 AI 实训建设方案》模板', to: '/about#contact', kind: '洽谈提供' },
      { label: 'Demo 体验环境申请', to: '/about#contact', kind: '申请开通' },
      { label: '同类院校案例集', to: '/cases', kind: '洽谈提供' },
      { label: '产品实机演示（链 / 课堂 / 具身）', to: '/products', kind: '在线' },
    ],
  },
]

/* ---------------- 联系我们 ---------------- */
export const contactHead = { en: 'CONTACT', zh: '联系我们', desc: '留下您的联系方式，我们的方案专家与教育顾问将在 1 个工作日内与您联系。' }
/* 意向方向统一走词表：前 7 项 = 产品体系全名，后 3 项 = 合作方向 */
export { CONTACT_INTENTS as contactProducts } from './vocabulary'
export const contact = {
  phone: '400-000-0000',
  email: 'contact@sztzjy.com',
  address: '深圳市光明区 · 科技金融大厦',
}
export const offices = ['深圳总部', '北京', '重庆', '郑州', '西安', '长沙', '广州']

/* ---------------- 页脚 ----------------
   产品与方案两列都从词表生成：产品 = 7 大产品体系，方案 = 5 套学科方案，
   链接落到各自的真实锚点，不再挂旧场景名与死链。 */
export const footerNav = [
  {
    title: '产品',
    links: PRODUCTS.map((p) => ({ label: p.short, to: '/products' })),
  },
  {
    title: '解决方案',
    links: SOLUTIONS.map((s) => ({ label: s.name, to: `/solutions#plan-${s.id}` })),
  },
  {
    title: '公司',
    links: [
      { label: '关于我们', to: '/about' },
      { label: '联系我们', to: '/about#contact' },
      { label: '加入我们', to: '/about' },
      { label: '合作生态', to: '/about' },
    ],
  },
]
