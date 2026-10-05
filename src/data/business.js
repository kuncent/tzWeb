/* ============================================================
 * 业务结构数据：架构分层 · 决策对象 · 交付路径
 * ------------------------------------------------------------
 * 这份文件只放「关系」，不放「事实」。所有系统名、条数、参数一律
 * 引用 site.js / legacySystems.js 的既有出口 —— 首页说 19 套 212 条，
 * 内页就不能说 20 套。造两套事实是 B 端官网最容易翻车的地方。
 * ============================================================ */
import {
  Bot,
  Landmark,
  DatabaseZap,
  Blocks,
  GraduationCap,
  Cpu,
  ShieldCheck,
  Network,
  FlaskConical,
  ClipboardList,
  PenTool,
  Rocket,
  Award,
  Users,
} from 'lucide-react'

/* ---------------- 业务架构：四层，自下而上 ----------------
   放在产品矩阵之前当目录：后面每一屏都是这里某一层展开。
   层级顺序刻意是「底座→产品→场景→交付」，读起来就是我们怎么
   把一门技术变成一间能开学的实验室的完整链路。 */
export const archLayers = [
  {
    id: 'delivery',
    n: 'L4',
    name: '交付与认证层',
    en: 'DELIVERY',
    icon: Award,
    desc: '六步交付路径，最后落到可被产业与主管部门认可的成果：学科竞赛、1+X 证书、学生工程作品集。',
    items: ['诊断→设计→建设→师资→运营→认证', '私有化与云端交付', '师资认证与驻校培训', '竞赛与证书出口'],
    anchor: { label: '看交付路径', to: '/#delivery' },
  },
  {
    id: 'scenario',
    n: 'L3',
    name: '场景与对象层',
    en: 'SCENARIO',
    icon: Users,
    desc: '同一套产品，教务处、二级学院、实训中心、信息中心各自关心的不是同一个东西。按人切，比按软件切更好卖。',
    items: ['教务处 · 专业与课程', '二级学院 · 课堂教学', '实训中心 · 设备与安全', '信息中心 · 数据与运维'],
    anchor: { label: '按对象进入', to: '/solutions' },
  },
  {
    id: 'product',
    n: 'L2',
    name: '产品体系层',
    en: 'PRODUCT',
    icon: Blocks,
    desc: '五大可单独使用、也可整体交付的产品体系，合计 37 套从旧平台迁移并在跑的实训系统。',
    items: ['具身智能 · 机器人实验室', '区块链 · 可信账本与量化', 'AI 多智能体课堂', '数字金融 · 19 套', '数字经济 · 18 套'],
    anchor: { label: '看产品矩阵', to: '/#matrix' },
  },
  {
    id: 'base',
    n: 'L1',
    name: '技术与算力底座',
    en: 'FOUNDATION',
    icon: Cpu,
    desc: '全栈自研：多智能体编排、代码沙箱、数字孪生引擎、链内核，以及支撑它们的算力与数据底座。',
    items: ['多智能体课堂引擎', '自然语言→可执行实验', '设备级数字孪生', 'NEX-C1 边缘算力 · 云端沙箱'],
    anchor: { label: '看技术方向', to: '/technology' },
  },
]

/* 五大产品体系在架构图里的坐标：id 必须与 productMatrix 对齐 */
export const archProducts = [
  { id: 'embodied', n: '01', name: '具身智能 · 机器人实验室', short: '具身智能', icon: Bot, to: '/laboratories' },
  { id: 'blockchain', n: '02', name: '区块链 · 可信账本与量化实训', short: '区块链', icon: Blocks, to: '/#matrix' },
  { id: 'class', n: '03', name: 'AI 多智能体课堂', short: 'AI 课堂', icon: GraduationCap, to: '/#matrix' },
  { id: 'digital-finance', n: '04', name: '数字金融 · 虚拟仿真实训体系', short: '数字金融', icon: Landmark, to: '/#matrix' },
  { id: 'digital-economy', n: '05', name: '数字经济 · 大数据与 AI 实训体系', short: '数字经济', icon: DatabaseZap, to: '/#matrix' },
]

/* ---------------- 按对象进入：四类决策人 ----------------
   为什么是四类不是三类：实训中心和信息中心在高校是两个处，关心的
   东西完全不重叠（一个管设备与安全，一个管数据与运维），合并会让
   一方觉得「这不是说给我听的」。 */
export const audiences = [
  {
    id: 'academic',
    role: '教务处 · 学科建设处',
    en: 'ACADEMIC AFFAIRS',
    icon: PenTool,
    pain: '专业申报要新材料、人才培养方案要体现技术前沿，但课程供给跟不上产业迭代速度。',
    want: ['新专业申报与方案论证材料', '课程体系与岗位能力图谱', '教学成果与改革项目支撑'],
    match: ['03 AI 多智能体课堂', '04 数字金融 19 套', '05 数字经济 18 套'],
    proof: [
      { k: '备课周期', v: '3-6 周 → 3-10 分钟' },
      { k: '可直接开课', v: '105 套系统' },
      { k: '覆盖专业', v: '25 个' },
    ],
    cta: { label: '索取专业建设方案', to: '/#contact' },
  },
  {
    id: 'college',
    role: '二级学院 · 一线教师',
    en: 'SCHOOL & FACULTY',
    icon: GraduationCap,
    pain: '课上讲得清，课后没地方练；学生课上看懂了，动手仍不会。教师被重复性批改与备课拖住。',
    want: ['能上手的实验环境与学生作品', '课堂互动与随堂反馈', '把时间还给教学设计'],
    match: ['03 AI 多智能体课堂', '01 具身智能实验室', '自然语言实验平台'],
    proof: [
      { k: '课堂互动率', v: '98%' },
      { k: '生成一堂课', v: '≤ 40s' },
      { k: '适用课程', v: '58 门' },
    ],
    cta: { label: '预约课堂演示', to: '/#contact' },
  },
  {
    id: 'center',
    role: '实训中心 · 实验室',
    en: 'TRAINING CENTER',
    icon: FlaskConical,
    pain: '设备贵、台套少、开放管理难；机械臂与真机操作有安全风险，出事故要追责。',
    want: ['整间实验室一次交付', '设备利用率与开放课题管理', '先虚拟试错再上真机'],
    match: ['01 具身智能 · 6 机型', '实验室交付六模块', '数字孪生与安全包'],
    proof: [
      { k: '落地实验室', v: '200+' },
      { k: '单馆面积', v: '5,000㎡' },
      { k: '机械臂精度', v: '±0.05mm' },
    ],
    cta: { label: '索取实验室规划', to: '/laboratories' },
  },
  {
    id: 'it',
    role: '信息中心 · 数字化处',
    en: 'INFORMATION CENTER',
    icon: ShieldCheck,
    pain: '数据不能出校、要过等保与信创、要和教务系统与统一身份认证打通，还要接得住万人选课。',
    want: ['全栈私有化与数据主权', '教务直连与单点登录', '高并发下的稳定与可运维'],
    match: ['校本专属云与源码授权', '信创环境适配', '多 LLM 智能调度'],
    proof: [
      { k: '部署方式', v: '私有化 / 云端' },
      { k: '并发课堂', v: '万人同课' },
      { k: '数据', v: '不出校' },
    ],
    cta: { label: '查看部署与对接', to: '/#architecture' },
  },
]

/* ---------------- 交付路径：六步 ----------------
   每步都给周期、交付物、双方分工 —— 高校采购最想看的就是「签了之后
   到底怎么落地」，这一段没有，前面讲得再好都像在卖概念。 */
export const deliveryPath = [
  {
    n: '01',
    icon: ClipboardList,
    title: '需求诊断',
    period: '1–2 周',
    desc: '读专业目录与培养方案，勘察场地与现有设备，盘点已购系统与数据接口，形成问题清单。',
    outputs: ['院系现状与缺口报告', '设备与场地勘察记录', '现有系统清单'],
    who: '我方顾问 + 院系负责人',
  },
  {
    n: '02',
    icon: PenTool,
    title: '方案设计',
    period: '2–3 周',
    desc: '按岗位能力倒推课程与实验，出空间布局与设备选型，定部署形态与分期预算。',
    outputs: ['实验室建设方案书', '课程体系与专业映射表', '部署与预算清单'],
    who: '我方方案组 + 教务处',
  },
  {
    n: '03',
    icon: Rocket,
    title: '建设部署',
    period: '4–8 周',
    desc: '硬件进场联调，平台按形态部署（云端 / 共建 / 全栈私有化），打通教务与统一身份认证。',
    outputs: ['验收测试报告', '对接与账号体系', '运维手册'],
    who: '我方实施 + 信息中心',
  },
  {
    n: '04',
    icon: Users,
    title: '师资赋能',
    period: '2 周集中 + 学期陪跑',
    desc: '驻校培训平台与课程设计方法，首批课程共建，考核后发认证教师，教师能自己开新课。',
    outputs: ['认证教师名单', '首批共建课程包', '教学日历模板'],
    who: '我方教研 + 一线教师',
  },
  {
    n: '05',
    icon: Network,
    title: '教学运营',
    period: '按学期持续',
    desc: '排课与并发保障，学情驾驶舱周会复盘，实验设备开放度与利用率统计，滚动迭代内容。',
    outputs: ['学期学情报告', '设备利用率看板', '内容迭代记录'],
    who: '双方共管 · 我方 5×8 / 7×24',
  },
  {
    n: '06',
    icon: Award,
    title: '成果认证',
    period: '按学年汇总',
    desc: '把学生作品推到学科竞赛与 1+X 证书出口，形成可展示、可交付、可被产业认可的成果集。',
    outputs: ['竞赛与证书成果清单', '学生工程作品集', '专业建设验收材料'],
    who: '我方资源 + 校方主管处室',
  },
]

/* 底座层的四块技术（技术方向内页的目录，也是架构图 L1 的展开） */
export const techBases = [
  {
    id: 'agent',
    icon: GraduationCap,
    name: '多智能体课堂引擎',
    en: 'MULTI-AGENT CLASSROOM',
    line: '开放的多智能体课堂协议，AI 教师 / 同学 / 助教 / 导演四角色由状态机编排',
    points: ['导演智能体编排发言顺序与节奏', '四类课堂组件按堂排布', '模型可换、数据不出校', '支持基于协议的二次开发'],
    to: '/technology',
  },
  {
    id: 'nl2exp',
    icon: Cpu,
    name: '自然语言实验引擎',
    en: 'NATURAL LANGUAGE TO LAB',
    line: '一句话描述生成可执行实验：策略、控制、合约代码附带解释与回测曲线',
    points: ['Python / C++ / Solidity 三语言', '代码沙箱隔离执行', '闭环研究引擎：数据→分析→参数网格→迭代', '结果可复查可校准'],
    to: '/technology',
  },
  {
    id: 'twin',
    icon: FlaskConical,
    name: '数字孪生与仿真底座',
    en: 'DIGITAL TWIN & SIM2REAL',
    line: '机械臂、机器人、产线设备 1:1 孪生，先在虚拟环境试错再到真机执行',
    points: ['设备级虚拟仿真', '操作风险预警与一键回滚', '实训过程可回放', '仿真数据采集与策略迁移'],
    to: '/laboratories',
  },
  {
    id: 'ledger',
    icon: Blocks,
    name: '可信账本与数据底座',
    en: 'LEDGER & DATA INFRA',
    line: '联盟链 + 公链双环境，链上与课堂行为数据同源入仓，支撑学情与态势分析',
    points: ['合约 IDE 与区块浏览器', '多链数据聚合与态势大屏', '云端实验沙箱弹性算力', 'NEX-C1 边缘算力 120 TOPS'],
    to: '/technology',
  },
]
