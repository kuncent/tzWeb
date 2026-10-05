/* ============================================================
 * 天择教育 需求智能分析引擎（真实可运行的纯前端功能）
 * 老师描述需求 → 解析学科/场景/规模 → 生成解决方案 → 就方案联系我们
 * 无需后端，所有结果均由输入实时计算
 * ============================================================ */

const SUBJECT_RULES = [
  { key: 'ai', label: '人工智能', product: 'AI 多智能体课堂', match: [/人工智能|机器学习|深度学习|神经网络|transformer|大模型|llm|ai\b/i] },
  { key: 'blockchain', label: '区块链', product: '自然语言实验平台', match: [/区块链|web3|智能合约|solidity|链上|比特币|以太坊|共识/i] },
  { key: 'robotics', label: '具身智能 / 机器人', product: '数字孪生实验室', match: [/机器人|具身|运动学|机械臂|伺服|pid|控制|robot/i] },
  { key: 'data', label: '数据工程', product: '自然语言实验平台', match: [/大数据|数据分析|sql|pandas|统计|可视化|数仓/i] },
  { key: 'engineering', label: '工程实训', product: '数字孪生实验室', match: [/工程|制造|数控|电气|自动化|实训中心|金工/i] },
]
const DEFAULT_SUBJECT = { key: 'general', label: '前沿科技', product: '其他合作' }

const SCENE_RULES = [
  { key: 'lab', label: '实验室 / 实训基地建设', match: /实验室|实训基地|实践基地|中心建设|场地|设备|算力/ },
  { key: 'course', label: '课程与教学改革', match: /课程|课堂|教学|开课|教改|一门课|门课|上课/ },
  { key: 'curriculum', label: '专业与培养体系', match: /专业|培养方案|培养体系|学科建|院系|新专业/ },
  { key: 'competition', label: '竞赛与创新人才培养', match: /竞赛|大赛|集训|训练营|揭榜|创新人才|拔尖/ },
  { key: 'teacher', label: '师资赋能与培训', match: /师资|教师培训|工作坊|双师|教研/ },
  { key: 'private', label: '私有化部署与数据安全', match: /私有|部署|本地化|数据安全|内网|信创/ },
]

const SCENE_MODULES = {
  lab: [
    { name: '未来实验室整体设计', desc: '空间规划、设备选型、数字孪生一体化，附投资预算框架与申报佐证材料' },
    { name: '虚实结合实训环境', desc: '机器人 / 区块链 / AI 沙箱浏览器内直接实操，学生零部署成本' },
    { name: '实验室管理与开放平台', desc: '预约、耗材、设备利用率看板，支撑开放课题与竞赛集训排期' },
  ],
  course: [
    { name: 'AI 多智能体课堂平台', desc: '一句话或一份大纲生成互动课堂，AI 教师 / 同学 / 助教同屏' },
    { name: '新型课程资源包', desc: '课件、项目案例、题库、实验手册四件套，覆盖 30+ 学科方向' },
    { name: '学情后效分析中心', desc: '课堂行为与成绩数据回流，自动生成教改论文与成果奖证据链' },
  ],
  curriculum: [
    { name: '人才培养方案共建', desc: '对标工程教育认证与新专业设置要求，输出课程集群地图与毕业要求支撑矩阵' },
    { name: '产教融合项目库', desc: '企业真实课题进课堂，形成四年递进式项目链' },
    { name: '活页式教材共建', desc: '配套数字化资源与持续更新的学科案例库' },
  ],
  competition: [
    { name: '竞赛训练营体系', desc: '选题指导、导师匹配、算力与场地打包，覆盖主流学科竞赛赛道' },
    { name: '以赛促学资源反哺', desc: '获奖方案沉淀为教学案例，形成招生宣传与成果申报素材' },
  ],
  teacher: [
    { name: '师资赋能培训计划', desc: 'AI 教学工具工作坊、双师课堂共建、教学能力认证，按学期排期' },
    { name: '教学学术支持', desc: '教改课题申报与教学成果奖培育全程陪跑' },
  ],
  private: [
    { name: '校本专属私有云', desc: '全栈信创适配，支持内网离线部署与等保合规' },
    { name: '数据主权与集成', desc: '对接学校教务 / 一卡通系统，数据不出校' },
  ],
}

const SCENE_PAINS = {
  lab: '实训设备利用率低、建设方案难申报、建成后没有配套课程',
  course: '备课成本高、课堂抬头率低、教改缺少数据支撑',
  curriculum: '新专业缺师资与课程体系、培养方案同质化',
  competition: '竞赛靠少数尖子生、缺乏系统化训练与选题来源',
  teacher: '教师 AI 工具使用能力参差、双师资源不足',
  private: '数据安全顾虑、公有云难以通过校内合规审查',
}

const CASE_BY_SUBJECT = {
  ai: { school: '北京理工大学', note: 'AI 实验室 · 300+ 课程 · 5,000 学生' },
  robotics: { school: '北京理工大学', note: '具身智能实验室 · 虚实结合实训' },
  blockchain: { school: '深圳职业技术大学', note: '区块链沙箱实验 · 链上清算课程' },
  data: { school: '哈尔滨工业大学（深圳）', note: '数据工程课程集群共建' },
  engineering: { school: '北京理工大学', note: '工程实训中心 · 数字孪生联动' },
  general: { school: '华南理工大学', note: 'AI 通识课堂与学情分析试点' },
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/* ---------- 1. 需求解析 ---------- */
export function analyzeNeed(raw) {
  const text = (raw || '').trim()
  const subject = SUBJECT_RULES.find((r) => r.match.some((re) => re.test(text))) || DEFAULT_SUBJECT
  const scenes = SCENE_RULES.filter((r) => r.match.test(text))
  if (scenes.length === 0) scenes.push({ key: 'course', label: '课程与教学改革' })

  const studentM = text.match(/(\d[\d,，.]*)\s*(?:名|个)?\s*(?:学生|学员|人次)/)
  const courseM = text.match(/(\d+)\s*门/)
  const labM = text.match(/(\d+)\s*(?:个|间)?\s*(?:实验室|基地|中心)/)
  const students = studentM ? Number(studentM[1].replace(/[，,]/g, '')) : null

  const schoolM = text.match(/([\u4e00-\u9fa5A-Za-z]{2,12}(?:大学|学院|学校))/)

  return {
    text,
    subjectKey: subject.key,
    subjectLabel: subject.label,
    product: subject.product,
    school: schoolM?.[1] || null,
    scenes: scenes.map((s) => ({ key: s.key, label: s.label })),
    scale: { students, courses: courseM ? Number(courseM[1]) : null, labs: labM ? Number(labM[1]) : null },
    deadline: /一学期|本学期|下学期|今年|年内/.test(text) ? '本学年内' : /三个月|3个月|尽快|急/.test(text) ? '3 个月内' : null,
  }
}

/* ---------- 2. 方案生成 ---------- */
export function generateSolution(a) {
  const primary = a.scenes[0]
  const modules = []
  for (const s of a.scenes.slice(0, 3)) {
    for (const m of SCENE_MODULES[s.key] || []) modules.push({ ...m, from: s.label })
  }
  // 学科实验资源始终加入
  modules.push({ name: `${a.subjectLabel}学科沙箱资源`, desc: '预置该方向实验模板、数据集与项目案例，教师可直接排课', from: a.subjectLabel })

  const n = a.scale.students || 120
  const hasCourseScene = a.scenes.some((s) => s.key === 'course' || s.key === 'curriculum')
  const courseCount = a.scale.courses || (hasCourseScene ? 8 : 4)
  const phases = [
    { name: '试点共创', dur: '第 1—2 月', items: [`选取 ${Math.max(2, Math.round(courseCount / 4))} 门课程 / 1 个场景试点`, '平台账号与沙箱环境开通', '骨干教师 2 场工作坊'] },
    { name: '规模化落地', dur: `第 3—${a.deadline === '3 个月内' ? 3 : 6} 月`, items: [`覆盖 ${courseCount} 门课程的课堂与实验`, `支撑约 ${n.toLocaleString()} 名学生实训`, '学情数据看板上线'] },
    { name: '成果沉淀', dur: '第 6—12 月', items: ['教学成果与竞赛成绩联合打磨', '共建教材 / 案例 / 教改论文', '申报产教融合示范项目'] },
  ]

  const completeness =
    40 + (a.scale.students ? 15 : 0) + (a.scale.courses || a.scale.labs ? 10 : 0) + (a.school ? 10 : 0) + a.scenes.length * 8 + (a.deadline ? 8 : 0)
  const score = Math.round(clamp(completeness, 55, 98))

  const metrics = [{ v: `${courseCount}`, k: '规划课程' }]
  if (a.scenes.some((s) => s.key === 'course' || s.key === 'curriculum')) metrics.push({ v: '+38%', k: '课堂互动率' })
  if (a.scenes.some((s) => s.key === 'lab')) metrics.push({ v: '92%', k: '实验室利用率' })
  if (a.scenes.some((s) => s.key === 'competition')) metrics.push({ v: '10+', k: '竞赛选题' })
  if (a.scenes.some((s) => s.key === 'teacher')) metrics.push({ v: '4 场', k: '师资工作坊' })
  metrics.push({ v: `-70%`, k: '备课耗时' })

  return {
    title: `${a.subjectLabel} × ${primary.label}解决方案`,
    summary: `面向${a.school || '贵校'}的${a.scenes.map((s) => s.label).join('、')}需求，整合平台、资源、师资与服务四个层面，给出如下可落地的共建方案。`,
    diagnosis: buildDiagnosis(a),
    modules: modules.slice(0, 6),
    phases,
    metrics: metrics.slice(0, 4),
    score,
    caseRef: CASE_BY_SUBJECT[a.subjectKey] || CASE_BY_SUBJECT.general,
  }
}

function buildDiagnosis(a) {
  const d = [`学科方向：${a.subjectLabel}`, `核心诉求：${a.scenes.map((s) => s.label).join(' + ')}`]
  if (a.school) d.push(`需求单位：${a.school}`)
  if (a.scale.students) d.push(`覆盖规模：约 ${a.scale.students.toLocaleString()} 名学生`)
  if (a.scale.courses) d.push(`建设体量：${a.scale.courses} 门课程`)
  if (a.scale.labs) d.push(`空间需求：${a.scale.labs} 个实验室 / 基地`)
  if (a.deadline) d.push(`期望周期：${a.deadline}完成`)
  d.push(`典型痛点：${SCENE_PAINS[a.scenes[0].key] || SCENE_PAINS.course}`)
  return d
}

/* ---------- 3. 历史记忆（localStorage） ---------- */
const HISTORY_KEY = 'tianze.solution.history'

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').filter((x) => x && x.text)
  } catch {
    return []
  }
}

export function pushHistory(analysis, score) {
  const list = loadHistory().filter((x) => x.text !== analysis.text)
  list.unshift({ text: analysis.text, label: analysis.scenes[0]?.label || '方案', score, ts: Date.now() })
  const cut = list.slice(0, 5)
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(cut))
  } catch {
    /* 存储满时忽略 */
  }
  return cut
}

/* ---------- 4. 带着上下文跳到联系表单（预填） ---------- */
export const PREFILL_KEY = 'tianze.contact.prefill'

/* 联系表单只认 localStorage + 一个自定义事件，所以不管从哪个板块过去都走这一个口子。 */
function handoff(payload) {
  try {
    localStorage.setItem(PREFILL_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('tianze:prefill'))
  const el = document.getElementById('contact')
  if (el) {
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -120 })
    else el.scrollIntoView({ behavior: 'smooth' })
  }
}

export function handoffToContact(analysis, solution) {
  handoff({
    kind: 'solution',
    product: analysis.product,
    title: solution.title,
    note: `需求：${analysis.text}`,
    source: 'ai-advisor',
    ts: Date.now(),
  })
}

/* 产品体验申请：产品屏画面上的「申请体验」走这里。
   intent 必须命中 contactProducts 里的选项，否则意向方向会被表单判成未选；
   体验项目写进备注，用户到了表单里还能接着改。 */
export function requestTrial({ name, code, intent }) {
  handoff({
    kind: 'trial',
    product: intent,
    title: `申请体验：${name}`,
    note: `意向产品：${name}${code ? `（${code}）` : ''}。希望安排一次产品体验，并结合我校情况沟通实训方案。`,
    source: 'chain-trial',
    ts: Date.now(),
  })
}

/* 产品体系咨询带外归因：除区块链体验之外的各产品屏 CTA 均走这里。
   以前是裸 href="/#contact"，线索落库后分不清从哪个产品、哪个按钮过来，
   后台无法运营。现在把产品名 + intent + source 一并带进预填，
   Contact 提交时透传 source 写入 lead。 */
export function requestProductContact({ name, code, intent, source, cta, note }) {
  handoff({
    kind: 'product',
    product: intent,
    title: `${cta || '咨询'}：${name}`,
    note: note || `意向产品：${name}${code ? `（${code}）` : ''}。${cta ? `${cta}，` : ''}希望结合我校情况沟通具体方案。`,
    source,
    ts: Date.now(),
  })
}

/* ---------- 总入口 ---------- */
export function generateSolutionPackage(raw) {
  const analysis = analyzeNeed(raw)
  return { analysis, solution: generateSolution(analysis) }
}
