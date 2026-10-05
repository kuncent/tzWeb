/* ============================================================
 * AI 课堂 · 演示教案数据
 * ------------------------------------------------------------
 * 两件事：
 * 1) 板块首次进入时直接有一堂可放的课，不用等人去点「生成」；
 * 2) 服务端没配 QWEN_API_KEY（或上游挂了）时的降级剧本 —— 界面照常跑，
 *    只是气泡上会标「离线演示」，不假装是模型现生成的。
 *
 * 结构与服务端 server/ai-proxy.mjs 的 normalizeLesson() 输出完全一致：
 *   { title, subtitle, outline[], scenes[] }
 *   scenes: slides{title,bullets[],speech,board} | quiz{question,options[],answer,explain}
 *           | discussion{topic,turns[{who,text}]}
 * 这样在线生成拿到结果可以直接塞进同一个播放器，不需要两套渲染。
 * ============================================================ */
import { slideParts } from '../lib/slideText'
/* 预制的官方 Slide[]（6 页）不在这里转出去：那份数据带着烘好的
   KaTeX HTML，只给备课台（懒 chunk）用。从这儿转一手就会把它顶进
   首屏图里，让每个进门的人都替兜底课件付一次下载。要用它的地方直接
   import 仓库根目录的 data/classroom-deck-slides.mjs。 */

export const classroomAgents = [
  { id: 'teacher', name: 'AI 教师', role: '主讲 · 白板推导', color: 'text-brand-300', dot: 'bg-brand-400' },
  { id: 'p1', name: 'AI 同学 · 阿哲', role: '爱追问原理', color: 'text-[#7DD3FC]', dot: 'bg-[#7DD3FC]' },
  { id: 'p2', name: 'AI 同学 · 小满', role: '负责举反例', color: 'text-[#F0B429]', dot: 'bg-[#F0B429]' },
  { id: 'you', name: '你', role: '随时打断提问', color: 'text-[#34D399]', dot: 'bg-[#34D399]' },
]

export const classroomTopics = ['Transformer 注意力机制', '联盟链共识与智能合约', 'ROS 2 机械臂抓取']

const LESSONS = {
  /* ────────── 1. AI 学科 ────────── */
  'Transformer 注意力机制': {
    title: 'Transformer 注意力机制',
    subtitle: '一堂 8 分钟的入门课：从「为什么」到一行公式',
    outline: ['为什么需要注意力', 'Q·K·V 的直觉', '多头与工程代价', '随堂提问', '课堂讨论'],
    scenes: [
      {
        type: 'slides',
        title: '为什么需要注意力',
        bullets: ['循环结构必须按顺序读完，句子越长、开头的信息被稀释得越厉害', '注意力让每个词一步看到整句话，路径长度从 O(n) 降到 O(1)', '代价是算力：序列翻倍，计算量翻四倍'],
        speech: '先说动机。老式循环网络读句子像读纸条，一次只看一个词，读到第三十个词时第一个词早被压没了。注意力换了个思路：每个词直接和全句所有词握一次手，谁跟谁相关一眼可见。',
        board: { kind: 'diagram', text: '顺序读 → 全连接握手' },
      },
      {
        type: 'slides',
        title: 'Q·K·V 的直觉',
        bullets: ['Query 是你的问题，Key 是书脊标签，Value 是书的正文', '打分 → softmax 归一 → 按权重把 Value 加起来', '三个矩阵同源不同投影，不是三份数据'],
        speech: '把一句话放进图书馆：你手里的问题是 Query，每本书脊上的标签是 Key，标签对得上，就把正文 Value 取一部分回来。softmax 负责把「有点相关」压成「相关性之和为一」。',
        board: { kind: 'formula', text: 'Attention(Q,K,V)=softmax(QKᵀ/√d)·V' },
      },
      {
        type: 'slides',
        title: '多头与工程代价',
        bullets: ['8 个头各看一种关系：指代、位置、句法、共现', '因果掩码保证自回归时不偷看未来 token', '长文本的主流优化都花在近似这个 O(n²) 上'],
        speech: '一个头只看一种关系容易漏，所以并行开多个头，各看各的再拼起来。训练时还要在注意力矩阵上盖一层掩码，禁止当前位置看到后文，否则自回归模型就是在作弊。',
        board: { kind: 'diagram', text: 'head₁ … head₈ → concat' },
      },
      {
        type: 'quiz',
        title: '随堂提问',
        question: '公式里为什么要除以 √d（d 为向量维度）？',
        options: ['防止点积过大把 softmax 推进梯度近乎为零的饱和区', '为了减少一次矩阵乘法的计算量', '让注意力权重之和恰好等于一', '抵消位置编码带来的数值漂移'],
        answer: 0,
        explain: '点积方差随维度线性增长，不缩放会让 softmax 几乎变成 one-hot，梯度消失。',
      },
      {
        type: 'discussion',
        title: '课堂讨论',
        topic: '如果注意力是「去图书馆找书」，那推理时的 KV 缓存对应什么？',
        turns: [
          { who: 'AI 同学 · 阿哲', text: '把已经查过的书连书架一起搬回工位，下一轮不用再跑图书馆？' },
          { who: 'AI 教师', text: '对。缓存的是历史 token 的 Key 与 Value，省掉重复计算，换来显存压力。' },
          { who: 'AI 同学 · 小满', text: '那长对话越来越占显存，是不是就是它撑爆的？' },
          { who: 'AI 教师', text: '正是。所以有滑窗、分层淘汰、量化缓存这一类工程手段来 trade-off。' },
        ],
      },
    ],
  },

  /* ────────── 2. 区块链学科 ────────── */
  '联盟链共识与智能合约': {
    title: '联盟链共识与智能合约',
    subtitle: '从「谁说了算」到「合约怎么跑」的一条完整链路',
    outline: ['联盟链为什么不用挖矿', '排序与终局性', '合约的确定性代价', '随堂提问', '课堂讨论'],
    scenes: [
      {
        type: 'slides',
        title: '联盟链为什么不用挖矿',
        bullets: ['成员实名、可追责，共识要解决的不是匿名对抗而是效率与故障容忍', 'PBFT 一类算法在已知节点集内做投票与签名聚合', '出块秒级，且不存在「算力军备」这条成本曲线'],
        speech: '公有链挖矿是为了在互不相识的人中间决出谁来记账。联盟链里每个节点都有身份和责任主体，问题变成：已知这六台机器里最多两台作恶，怎么快速达成一致。',
        board: { kind: 'diagram', text: '6 节点 · f=1 · 2f+1 通过' },
      },
      {
        type: 'slides',
        title: '排序与终局性',
        bullets: ['交易先由提案节点排序，再经背书与验证节点确认', '终局性来自多数签名，而不是「后面又叠了几层」', '教学环境里可人为延迟某个节点，观察链的分叉与恢复'],
        speech: '公链的确认是概率性的，等六个区块只是「大概率不返」。联盟链一旦凑够背书门限就终局，不会再返，这也是它能承接教务、成绩这类业务的前提。',
        board: { kind: 'formula', text: '背书策略：≥3/6 且含教师节点' },
      },
      {
        type: 'slides',
        title: '合约的确定性代价',
        bullets: ['每个节点重算同一笔交易，结果必须逐字节一致', '所以合约里禁止随机、系统时间、浮点与外部直连', '需要外部数据时走预言机，把不确定性收敛到链下'],
        speech: '智能合约不是普通后端代码。它是让所有节点各算一遍还要算出同一个结果，所以任何不确定输入都被禁掉了：不能取随机数，不能读本地时钟，更不能直接发 HTTP。',
        board: { kind: 'diagram', text: 'require → 全部节点重放 → 同一 stateRoot' },
      },
      {
        type: 'quiz',
        title: '随堂提问',
        question: '学生在合约里写 block.timestamp 做抽奖开奖时间，最核心的风险是什么？',
        options: ['出块时间由提案节点控制，可被小幅操纵且不可回改', '时间戳精度不够，会抛异常', '联盟链节点读不到任何区块头字段', '会导致 gas 费用翻倍'],
        answer: 0,
        explain: '时间戳来源是节点，可被排序者微调；开奖这类高价值随机必须用可验证随机数方案。',
      },
      {
        type: 'discussion',
        title: '课堂讨论',
        topic: '实训课上，把成绩写进链上，真正值得写的是什么？',
        turns: [
          { who: 'AI 同学 · 小满', text: '整张成绩单？这样学生可以自己出示证明，不用找学校开。' },
          { who: 'AI 教师', text: '成本上不合算。通常只写成绩摘要的哈希做存证，明细留在教务系统。' },
          { who: 'AI 同学 · 阿哲', text: '那隐私怎么保证？哈希不就能反查出来吗。' },
          { who: 'AI 教师', text: '好问题，所以要加盐或使用可验证承诺，配合授权披露 —— 这正是实践课的好切口。' },
        ],
      },
    ],
  },

  /* ────────── 3. 具身智能学科 ────────── */
  'ROS 2 机械臂抓取': {
    title: 'ROS 2 机械臂抓取',
    subtitle: '一条抓取流水线：感知、规划、执行、失败重试',
    outline: ['抓取流水线的四段', '位姿与坐标变换', '失败才是主课', '随堂提问', '课堂讨论'],
    scenes: [
      {
        type: 'slides',
        title: '抓取流水线的四段',
        bullets: ['感知：RGB-D 出点云 → 分割 → 目标位姿', '规划：抓取候选生成 + 逆运动学求解 + 无碰撞校验', '执行：轨迹下发，力/位混合控制收尾'],
        speech: '抓取不是一个动作，是四段流水线。任何一段单独看起来都对，接起来仍然会掉件 —— 所以教学时要把每一段的中间结果都可视化出来，问题才有地方落脚。',
        board: { kind: 'diagram', text: '点云 → 位姿 → IK → 轨迹 → 夹爪' },
      },
      {
        type: 'slides',
        title: '位姿与坐标变换',
        bullets: ['相机看到的位姿在 camera 系，执行要用 base 系', 'TF 树负责把两段标定串起来，标错就是系统性偏差', '手眼标定的残差要落到毫米级，否则补偿无从谈起'],
        speech: '绝大多数「抓偏了」不是算法错，是坐标系错了。相机说物体在 (x,y,z)，但机械臂只认自己基座坐标系下的数，中间那次变换一旦没标好，偏差会稳定地出现在同一个方向。',
        board: { kind: 'formula', text: 'T_obj^base = T_cam^base · T_obj^cam' },
      },
      {
        type: 'slides',
        title: '失败才是主课',
        bullets: ['失败模式分类：漏检、位姿偏、IK 无解、夹取滑落', '每类失败对应不同处置：重标定、换候选、降速、加力控', '批量实验 + 自动记录，才能把成功率从玄学变成曲线'],
        speech: '真实机器人课上，第一次抓起来只是开始。我们要学生把失败当成数据：掉件是滑落还是没夹住？是位姿偏还是力太小？分类清楚，改进才有靶子。',
        board: { kind: 'diagram', text: '成功率 = 检出 × 定位 × 规划 × 执行' },
      },
      {
        type: 'quiz',
        title: '随堂提问',
        question: '抓取总是稳定偏向同一方向、偏约 1.5cm，最应该先查什么？',
        options: ['手眼标定的外参 T_cam^base', '夹爪的最大开口宽度', '逆运动学的迭代上限', '相机的曝光时间'],
        answer: 0,
        explain: '方向固定的系统性偏差几乎都指向外参标定；随机散布才更像感知或规划抖动。',
      },
      {
        type: 'discussion',
        title: '课堂讨论',
        topic: '仿真里成功率 95%，真机只有 60%，该先补哪一段？',
        turns: [
          { who: 'AI 同学 · 阿哲', text: '把仿真器的物理参数调准一点？比如摩擦系数。' },
          { who: 'AI 教师', text: '参数是一方面，更常见的是真机延迟与接触模型：仿真一步到位，真机会弹、会滑。' },
          { who: 'AI 同学 · 小满', text: '那是不是应该先在仿真里加入执行噪声再训练？' },
          { who: 'AI 教师', text: '对，域随机化加动作延迟建模，是把它拉回 80% 最省事的两个手段。' },
        ],
      },
    ],
  },
}

/* 在线生成失败时按关键词挑最贴近的一堂，实在不中就用第一堂 */
export function pickLesson(topic) {
  const key = Object.keys(LESSONS)
  const t = String(topic || '').trim()
  const hit = key.find((k) => k === t) || key.find((k) => t && (k.includes(t) || t.includes(k.split(' ')[0])))
  const fallback = LESSONS[classroomTopics[0]]
  const lesson = LESSONS[hit] || fallback
  return { ...lesson, topicKey: hit || classroomTopics[0], source: 'builtin' }
}

export const builtinLessons = LESSONS

/* ============================================================
 * 智能备课系统（第二个 tab）
 * ------------------------------------------------------------
 * 课件的数据契约就是 @openmaic/dsl 的 Slide[]：
 *   { title, subtitle, outline[], slides: Slide[] }
 *   Slide = { id, viewportSize, viewportRatio, theme, elements[], background, type, script }
 * 旧那套自己发明的 kind/bullets/note 高层 deck 已拆：渲染路径只有
 * <SlideCanvas> 一条，两套版式长期并存必被腐掉。坐标类质量由服务端
 * server/maic-deck.mjs 的守卫保证，离线兜底页在 data/classroom-deck-slides.mjs。
 * ============================================================ */

export const prepLevels = ['大一 · 专业入门', '大三 · 专业课', '研究生 · 研讨课', '高职 · 实训课']
export const prepStyles = ['讲透原理', '案例驱动', '工程实战', '考研/竞赛强度']

/* 首页那三个「拿来试一下」的课程内容：真材实料的一段讲义，不是一句话主题 */
export const prepSamples = [
  {
    label: '注意力机制',
    content:
      '循环神经网络必须按时间步依次读完句子，序列越长，开头那份信息被稀释得越厉害，梯度也越难传回去。注意力换一种做法：让当前位置直接对整句话的每个位置打分，归一化后把各处的表示加权求和，路径长度从 O(n) 降到 O(1)。工程上用 Q、K、V 三个同源不同投影的矩阵实现：Query 是当前词发出的查询，Key 像书脊标签，Value 是正文内容。点积分数要除以根号 d 做缩放，否则维度一高 softmax 就饱和、梯度消失。多头则是把投影切成若干份，每个头各看一种关系：指代、位置、句法、共现。',
  },
  {
    label: '联盟链共识',
    content:
      '联盟链的成员是实名且可追责的，共识要解决的不是匿名环境下的算力对抗，而是已知节点集合内的效率与故障容忍，所以不需要挖矿。流程是：客户端把交易发给排序节点排序，再依次经过背书节点、排序节点、验证节点确认，最后按规则写入账本并反馈结果。PBFT 一类算法在视图内做预准备、准备、确认三阶段投票，收集到 2f+1 个一致签名即可定序，容忍 f 个拜占庭节点。终局性来自多数签名，而不是「后面又叠了几层」，所以出块可以做到秒级。合约里禁止随机数、系统时间、浮点与外部直连，因为每个节点都要重算出逐字节一致的结果；需要外部数据时走预言机。',
  },
  {
    label: '机械臂抓取',
    content:
      '一条完整的抓取流水线是感知、定位、规划、执行、失败重试。相机给出的是目标在 camera 坐标系下的位姿，机械臂只认自己基座坐标系，中间要靠手眼标定得到的外参 T_cam^base 做变换，标定一旦偏差就会稳定地出现在同一个方向。规划段先做逆运动学求关节角，无解或超限就要换候选位姿。真实课堂上失败才是主课：把失败分成漏检、位姿偏、IK 无解、夹取滑落四类，分别对应重标定、换候选、降速、加力控，再用批量实验与自动记录把成功率从玄学变成曲线。',
  },
]

/* Slide[] → 教案：备完课直接送去放映，两个 tab 共用一个播放器。
   播放器只认 scenes 那套字段，所以这里把官方画布「读平」：
   讲稿优先用 slide.script（模型写的这一页讲稿），没有再把文本元素
   拼出来；白板取这页第一个 latex 元素（转写成可读式子）。
   段落抠法在 lib/slideText（按阅读顺序排，第一段就是标题）。 */
function slideToScene(slide, index) {
  const parts = slideParts(slide)
  const formula = parts.find((p) => p.latex)
  const title = parts[0]?.text || `第 ${index + 1} 页`
  const speech = String(slide?.script || '').trim() || parts.map((p) => p.text).join('，') || title
  return {
    type: 'slides',
    title: index === 0 ? '开场' : title.slice(0, 30),
    bullets: parts.slice(1, 6).map((p) => p.text.slice(0, 60)),
    speech: speech.slice(0, 220),
    /* 白板逐字书写，吃不下 LaTeX 源码 */
    board: formula?.text ? { kind: 'formula', text: formula.text.slice(0, 40) } : null,
  }
}

export function deckToLesson(deck) {
  const slides = deck?.slides || []
  return {
    title: deck?.title || '未命名课件',
    subtitle: deck?.subtitle || '',
    outline: (deck?.outline || []).length ? deck.outline : slides.map((s, i) => `第 ${i + 1} 页`).slice(0, 6),
    scenes: slides.map(slideToScene),
    /* 原画布顺带带上：播放器今天只吃 scenes，以后想直出一页不用回服务端重跑 */
    slides,
    source: deck?.source || 'builtin',
    model: deck?.model,
  }
}
