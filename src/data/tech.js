/* ============================================================
 * 技术结构数据（单一真源）
 * ------------------------------------------------------------
 * 首页「技术架构剖面」与 /technology 内页共用这一份 —— 层名、组件、
 * 参数只在这里维护一处，两处渲染不会各说各话（口径一致的老规矩）。
 * 这里只放「关系与既有事实」：所有数字（120 TOPS、6 节点、±0.05mm、
 * 4 类、≤40s）都来自 site.js / pages.js 已确立的口径，不新造。
 * ============================================================ */
import {
  Blocks,
  Cpu,
  GraduationCap,
  Network,
  Server,
  Cloud,
  ShieldCheck,
  DatabaseZap,
  Lock,
  GitBranch,
  KeyRound,
  CalendarRange,
  FileJson,
  Braces,
} from 'lucide-react'

/* 四层技术栈：自上而下 A4→A1，读法是「谁调用谁」。
   call = 这一层向下一层发出的动作，用作剖面图层间箭头上的标签 */
export const techLayers = [
  {
    key: 'app',
    n: 'A4',
    name: '应用与交付',
    en: 'APPLICATION',
    icon: GraduationCap,
    items: ['AI 多智能体课堂', '实验沙箱与 IDE', '学情驾驶舱', '态势大屏', '课件与作品导出'],
    note: '教师与学生在这一层见面，验收材料也从这里出',
    call: '调用引擎',
  },
  {
    key: 'engine',
    n: 'A3',
    name: '引擎层 · 四大底座',
    en: 'ENGINE',
    icon: Cpu,
    items: ['多智能体课堂引擎', '自然语言实验引擎', '数字孪生与仿真', '可信账本与数据'],
    note: '全栈自研，4 项发明专利、60+ 软著落在这层',
    call: '编排服务',
  },
  {
    key: 'platform',
    n: 'A2',
    name: '平台与服务',
    en: 'PLATFORM',
    icon: Network,
    items: ['实验管理平台', '统一身份与权限', '多 LLM 调度网关', '内容安全审核', '数据仓与指标'],
    note: '对接教务系统、统一身份认证与校园算力集群',
    call: '调度算力',
  },
  {
    key: 'infra',
    n: 'A1',
    name: '算力与设备',
    en: 'INFRA',
    icon: Server,
    items: ['云端沙箱弹性算力', 'NEX-C1 边缘算力 120 TOPS', '联盟链共识节点', '机器人真机与孪生体'],
    note: '从共享算力到专属集群，按需弹性伸缩',
    call: '',
  },
]

/* 一堂课的生命周期：一句话到能上，中间五步（两阶段生成，教师能在中间插手） */
export const techPipeline = [
  { t: '主题 / 大纲', d: '一句话主题，或上传 PPT、PDF、教学大纲' },
  { t: '教学大纲生成', d: '先出结构：目标、知识点、课时切分' },
  { t: '课堂场景装配', d: '四类组件按堂排布：讲解幻灯、随堂提问、互动模拟、项目任务' },
  { t: '角色与节奏编排', d: '导演智能体决定谁在什么时候说话' },
  { t: '上课与沉淀', d: '白板推导、语音讲解、纪要与课件导出' },
]

/* 参考部署拓扑：校园网边界内（数据不出校）+ 可选云端（模型调用可出）。
   节点参数全部取自 techDetail / audiences / techAssurance 的既有口径 */
export const deployZones = {
  campus: {
    id: 'campus',
    label: '校园网 · 数据主权边界内',
    en: 'ON-CAMPUS · dataEgress: false',
    icon: ShieldCheck,
    nodes: [
      { name: '教务系统 / 统一身份认证', role: '对接点', icon: GitBranch, spec: '单点登录 · 直连' },
      { name: '私有化平台集群', role: '信创适配', icon: Server, spec: '国产芯片 / OS' },
      { name: 'NEX-C1 边缘算力', role: '端侧推理', icon: Cpu, spec: '120 TOPS' },
      { name: '联盟链共识节点', role: '链上存证', icon: Blocks, spec: '6 节点' },
      { name: '机器人真机 / 数字孪生体', role: '设备层', icon: GraduationCap, spec: '±0.05 mm' },
      { name: '学情 · 题库 · 课件 · 存证', role: '数据落库', icon: DatabaseZap, spec: '逻辑隔离 · 可审计' },
    ],
  },
  cloud: {
    id: 'cloud',
    label: '可选云端',
    en: 'OPTIONAL CLOUD',
    icon: Cloud,
    nodes: [
      { name: '云端实验沙箱', role: '弹性算力', icon: Cloud, spec: '按需伸缩' },
      { name: '多 LLM 调度网关', role: '模型可换', icon: Cpu, spec: '可本地化' },
    ],
  },
  /* 边界那条线要讲清的一件事：出去的只有模型调用，学生数据留在校内 */
  boundary: {
    icon: Lock,
    title: '模型调用可出 · 学生数据不出',
    desc: 'dataEgress:false —— 课堂数据、学生答案与生成内容全部留在校园网内。',
  },
}

/* 六条工程纪律（部署/安全屏的收口清单，取自 techAssurance 的口径） */
export const deployAssurances = [
  { icon: ShieldCheck, t: '数据主权', d: '全栈私有化可选，数据不出校；逻辑隔离与操作审计留痕。' },
  { icon: Lock, t: '内容安全', d: '生成内容审核与课堂发言护栏，敏感操作需教师确认。' },
  { icon: Network, t: '高并发', d: '万人同课无感体验，秒级任务下发，多点备份保障。' },
  { icon: Server, t: '信创适配', d: '国产芯片与操作系统环境适配，可对接统一身份认证。' },
  { icon: GitBranch, t: '开放接口', d: '开放 API 与插件机制，支持二次开发、源码授权可选。' },
  { icon: Blocks, t: '可回滚', d: '实验环境一键回滚，版本与配置可追溯，教学事故可复盘。' },
]

/* 接口契约（技术架构 Tab 的「图 3」）：把「能接什么、什么出校、什么留下」摊开成表。
   只写站内既有口径里真实存在的能力与字段（site.js 私有化段 / tech.js 部署节点 /
   Technology.jsx 的 lesson.manifest 与开放接入屏）；凡无据的协议名与字段字典，
   统一标「按院校现网确认」，绝不新造端点 URL 或字段名。
   dir=数据流向；out=是否有东西越过校园边界（只有模型调用为 true）；egress=口径标签。 */
export const apiContracts = [
  {
    key: 'sso',
    domain: '统一身份认证 / SSO',
    en: 'IDENTITY',
    icon: KeyRound,
    dir: '入站',
    out: false,
    egress: '数据不出校',
    spec: '单点登录 · 直连校园统一身份平台，账号与权限不另起一套。',
    fields: ['身份令牌', '院系 / 班级归属', '角色与权限'],
    verify: '认证协议（标准单点登录）与字段字典按院校现网环境现场确认，不预设具体协议。',
  },
  {
    key: 'edu',
    domain: '教务数据对接',
    en: 'ACADEMIC AFFAIRS',
    icon: CalendarRange,
    dir: '双向',
    out: false,
    egress: '数据不出校',
    spec: '教务系统直连：课程 / 班级 / 名单可接入，实验与学情数据可回传沉淀。',
    fields: ['课程', '班级 / 教学班', '学生名单', '实验 / 学情回传'],
    verify: '具体接口与字段以教务系统现网字典为准；支持私有化内网直连。',
  },
  {
    key: 'manifest',
    domain: '课堂描述文件 / 备课协议',
    en: 'CLASS PROTOCOL',
    icon: FileJson,
    dir: '入站',
    out: false,
    egress: '数据不出校',
    spec: '校本课件与题库按标准描述文件接入，复用课堂运行时；协议 tianze-class/v1。',
    fields: ['protocol', 'topic', 'outline.goals / slices', 'components[]', 'agents.{teacher,students,director}', 'runtime.model / dataEgress'],
    verify: '字段与首页 lesson.manifest 一致（见 /technology「开放与二次开发」屏）。',
  },
  {
    key: 'api',
    domain: '开放 API / SDK',
    en: 'OPEN API',
    icon: Braces,
    dir: '双向',
    out: false,
    egress: '可全内网',
    spec: 'REST + SDK 开放接口与插件机制，支持二次开发与本地化定制；源码授权可选。',
    fields: ['REST + SDK', '端侧 ROS 2 / SDK', 'USB 3.0 设备接入'],
    verify: '接口清单与鉴权方式在技术对接阶段随环境提供；可整体留在校园网内。',
  },
  {
    key: 'llm',
    domain: '模型调度网关',
    en: 'MODEL GATEWAY',
    icon: Cpu,
    dir: '出站',
    out: true,
    egress: '仅模型调用可出',
    spec: '多 LLM 调度网关，模型可换、可本地化；dataEgress:false 时推理调用之外的数据一律不出校。',
    fields: ['runtime.model（local / 多家可换）', 'runtime.dataEgress:false'],
    verify: '现场可切本地模型，网络侧可核对仅模型调用出网。',
  },
  {
    key: 'sec',
    domain: '内容安全与审计',
    en: 'SAFETY & AUDIT',
    icon: Lock,
    dir: '平台内',
    out: false,
    egress: '全程留痕',
    spec: '生成内容审核与课堂发言护栏，敏感操作需教师确认；操作与内容均有审计日志。',
    fields: ['内容审核 / 发言护栏', '敏感操作二次确认', '操作审计日志', '逻辑隔离'],
    verify: '审计留痕与逻辑隔离为既有交付口径，演示现场可查日志样例。',
  },
  {
    key: 'chain',
    domain: '链上存证',
    en: 'ON-CHAIN PROOF',
    icon: Blocks,
    dir: '平台内',
    out: false,
    egress: '校内链',
    spec: '联盟链共识节点存证，合约 / 交易 / 区块调用可聚合上链，凭证可验真。',
    fields: ['6 共识节点', '合约 / 交易', '区块浏览器'],
    verify: '节点数与合约 / 交易口径取自区块链实训既有交付数据。',
  },
]
