/* 校企合作 · 合作档案（预览副本）
   ------------------------------------------------------------
   本文件只服务 /partnership-preview 的「合作板块」预览，不替换正式页。
   所有图片、机构名、活动名、数字均来自用户提供的《官网整理》资料：
   - 01 学术会议：8 张现场照片
   - 02 出版教材：8 部教材封面
   - 03 产学研合作：8 张现场照片（含「广东培正学院来访调研」）
   - 04 师资培训：7 张现场照片
   - 05 以赛促学：23 张现场照片 + 3 份官方文件截图
   资料中没有的机构、数量与成果一律不补。 */

export const atlasMeta = {
  eyebrow: 'COOPERATION ARCHIVE',
  period: '2019 — 2026',
  title: '五条线，都有现场',
  desc: '会议、教材、产学研、师资培训、赛事 —— 按五个方向归档公司活动资料。每个方向都能打开完整的现场照片与文件，图片与文字均来自现有存档。',
  counts: [
    { k: '归档图片', v: '54', suffix: '张' },
    { k: '教材', v: '8', suffix: '部' },
    { k: '文件存档', v: '3', suffix: '份' },
  ],
}

const conferenceGallery = [
  { src: '/images/coop-atlas/conf-ai-2026.webp', caption: '2026 AI+ 数字经济与金融科技研讨会' },
  { src: '/images/coop-atlas/conf-newbiz-2023.webp', caption: '2023 广东省高等教育学会新商科实验教学专业委员会成立大会' },
  { src: '/images/coop-atlas/conf-guangxi-2024.webp', caption: '2024 全国（广西）数字金融行业产教融合共同体成立大会暨数字金融产教融合发展研讨会' },
  { src: '/images/coop-atlas/conf-icft-2019.webp', caption: '2019 金融科技国际会议（ICFT）' },
  { src: '/images/coop-atlas/conf-practice-2019.webp', caption: '2019 金融科技实践教学暨金融机构调研参访研讨会' },
  { src: '/images/coop-atlas/conf-guide-2023.webp', caption: '2023 全国金融职业教育教学指导委员会工作会议暨“双高计划”建设研讨会' },
  { src: '/images/coop-atlas/conf-chuzhou-2019.webp', caption: '2019 金融数据与金融工程学科建设研讨会 · 滁州学院' },
  { src: '/images/coop-atlas/conf-alliance-2026.webp', caption: '2026 第四届全国数字经济学科建设联盟会议暨数字经济赋能海南自贸港建设研讨会' },
]

const textbookItems = [
  { src: '/images/coop-atlas/book-fintech.webp', caption: '金融科技实务教程' },
  { src: '/images/coop-atlas/book-fin-bigdata.webp', caption: '金融大数据分析与应用' },
  { src: '/images/coop-atlas/book-quant.webp', caption: 'Python 量化交易实战' },
  { src: '/images/coop-atlas/book-securities.webp', caption: '证券投资学' },
  { src: '/images/coop-atlas/book-investment-bank.webp', caption: '投资银行实验教程' },
  { src: '/images/coop-atlas/book-intl-finance.webp', caption: '国际金融' },
  { src: '/images/coop-atlas/book-supply-chain.webp', caption: '供应链金融导论' },
  { src: '/images/coop-atlas/book-econometrics.webp', caption: '计量经济模型 EViews 应用' },
]

const industryGallery = [
  { src: '/images/coop-atlas/ind-caict.webp', caption: '九江市数字经济产业研究院（中国信通院）· 交流合影' },
  { src: '/images/coop-atlas/ind-huaen.webp', caption: '华闻期货深圳分公司 · 参访交流' },
  { src: '/images/coop-atlas/ind-group.webp', caption: '中信证券 · 参访交流合影' },
  { src: '/images/coop-atlas/ind-peizheng.webp', caption: '广东培正学院 · 来访调研交流' },
  { src: '/images/coop-atlas/ind-forum.webp', caption: '经济学院应用型人才培养方案研讨会' },
  { src: '/images/coop-atlas/ind-visit-books.webp', caption: '天择教育科技 · 参访交流' },
  { src: '/images/coop-atlas/ind-visit-laptops.webp', caption: '校企座谈交流现场' },
  { src: '/images/coop-atlas/ind-seminar.webp', caption: '研讨与授课现场' },
]

const trainingGallery = [
  { src: '/images/coop-atlas/train-opening.webp', caption: 'AI+ 数字经济与金融场景应用实战师资研修班 · 开班致辞' },
  { src: '/images/coop-atlas/train-national.webp', caption: '全国金融科技与金融实务师资培训 · 第一期' },
  { src: '/images/coop-atlas/train-cohort.webp', caption: 'AI+ 数字经济与金融场景应用实战师资研修班 · 合影' },
  { src: '/images/coop-atlas/train-class.webp', caption: '师资培训 · 集中授课现场' },
  { src: '/images/coop-atlas/train-lab-wide.webp', caption: '师资培训 · 实训室上手' },
  { src: '/images/coop-atlas/train-lab.webp', caption: '师资培训 · 平台实操' },
  { src: '/images/coop-atlas/train-vr-lab.webp', caption: '大数据虚拟仿真实训室 · 培训现场' },
]

const competitionGallery = [
  { src: '/images/coop-atlas/comp-stage-group-1.webp', caption: '全国证券投资模拟实训大赛冠军邀请赛 · 参赛队伍合影' },
  { src: '/images/coop-atlas/comp-trophies-wide.webp', caption: '冠军邀请赛 · 奖杯陈列' },
  { src: '/images/coop-atlas/comp-award-first.webp', caption: '铜奖 · 职教组颁奖现场' },
  { src: '/images/coop-atlas/comp-stage-group-2.webp', caption: '冠军邀请赛 · 参赛队伍合影' },
  { src: '/images/coop-atlas/comp-finals-group.webp', caption: '冠军邀请赛 · 决赛合影' },
  { src: '/images/coop-atlas/comp-finals-stage.webp', caption: '冠军邀请赛 · 决赛舞台' },
  { src: '/images/coop-atlas/comp-award-contribution.webp', caption: '特别贡献奖 · 颁奖现场' },
  { src: '/images/coop-atlas/comp-award-second.webp', caption: '银奖 · 本科组颁奖现场' },
  { src: '/images/coop-atlas/comp-award-third.webp', caption: '金奖 · 颁奖现场' },
  { src: '/images/coop-atlas/comp-result-screen-1.webp', caption: '冠军邀请赛 · 比赛结果发布' },
  { src: '/images/coop-atlas/comp-result-screen-2.webp', caption: '冠军邀请赛 · 比赛结果发布' },
  { src: '/images/coop-atlas/comp-trophies.webp', caption: '冠军邀请赛 · 奖杯' },
  { src: '/images/coop-atlas/comp-audience-1.webp', caption: '冠军邀请赛 · 赛场观众' },
  { src: '/images/coop-atlas/comp-audience-2.webp', caption: '冠军邀请赛 · 赛场观众' },
  { src: '/images/coop-atlas/comp-judges.webp', caption: '冠军邀请赛 · 评审现场' },
  { src: '/images/coop-atlas/comp-judge-desk.webp', caption: '冠军邀请赛 · 评审与计分现场' },
  { src: '/images/coop-atlas/comp-judge-team.webp', caption: '冠军邀请赛 · 评审与计分现场' },
  { src: '/images/coop-atlas/comp-coach-1.webp', caption: '参赛选手现场陈述' },
  { src: '/images/coop-atlas/comp-coach-2.webp', caption: '参赛选手现场陈述' },
  { src: '/images/coop-atlas/comp-speaker-1.webp', caption: '参赛选手现场陈述' },
  { src: '/images/coop-atlas/comp-speaker-2.webp', caption: '参赛选手现场陈述' },
  { src: '/images/coop-atlas/comp-lab-1.webp', caption: '证券投资模拟实训机房' },
  { src: '/images/coop-atlas/comp-lab-2.webp', caption: '证券投资模拟实训机房' },
]

export const coopLanes = [
  {
    id: 'conference',
    n: '01',
    zh: '学术会议',
    en: 'CONFERENCES & FORUMS',
    tone: 'light',
    count: '8 场现场',
    lead: '会议现场从 2019 年延伸到 2026 年：金融科技国际会议、金融数据与金融工程学科建设、金融科技实践教学、新商科实验教学、数字金融产教融合，以及 AI+ 数字经济与数字经济学科建设。',
    visual: 'timeline',
    feature: conferenceGallery[0],
    support: [conferenceGallery[3], conferenceGallery[1]],
    timeline: [
      {
        year: '2026',
        text: '第四届全国数字经济学科建设联盟会议',
        photo: 7,
        topics: ['数字经济', '学科建设', '联盟会议'],
      },
      { year: '2026', text: 'AI+ 数字经济与金融科技研讨会', photo: 0, topics: ['AI+', '数字经济', '金融科技'] },
      {
        year: '2024',
        text: '全国（广西）数字金融行业产教融合共同体成立大会',
        photo: 2,
        topics: ['数字金融', '产教融合', '共同体'],
      },
      {
        year: '2023',
        text: '全国金融职业教育教学指导委员会工作会议暨“双高计划”建设研讨会',
        photo: 5,
        topics: ['职业教育', '双高计划', '专业建设'],
      },
      {
        year: '2023',
        text: '广东省高等教育学会新商科实验教学专业委员会成立大会',
        photo: 1,
        topics: ['新商科', '实验教学', '专委会'],
      },
      {
        year: '2019',
        text: '金融科技实践教学暨金融机构调研参访研讨会',
        photo: 4,
        topics: ['实践教学', '机构调研', '参访交流'],
      },
      {
        year: '2019',
        text: '金融数据与金融工程学科建设研讨会',
        photo: 6,
        place: '滁州学院',
        topics: ['学科建设', '金融数据', '金融工程'],
      },
      { year: '2019', text: '金融科技国际会议（ICFT）', photo: 3, topics: ['金融科技', '国际交流', '人才培养'] },
    ],
    gallery: conferenceGallery,
  },
  {
    id: 'textbook',
    n: '02',
    zh: '出版教材',
    en: 'TEXTBOOKS',
    tone: 'light',
    count: '8 部教材',
    lead: '8 部已出版教材，覆盖金融科技、金融大数据、量化投资、证券投资、投资银行、国际金融、供应链金融与计量经济八个方向。',
    visual: 'shelf',
    gallery: textbookItems,
  },
  {
    id: 'industry',
    n: '03',
    zh: '产学研合作',
    en: 'RESEARCH & INDUSTRY',
    tone: 'light',
    count: '8 组现场',
    lead: '产学研以参访、座谈、研讨与课堂的形式落在现场。可识别的机构包括九江市数字经济产业研究院（中国信通院）、中信证券、华闻期货深圳分公司与广东培正学院。',
    visual: 'collage',
    feature: industryGallery[0],
    support: [industryGallery[1], industryGallery[2]],
    timeline: [
      { year: '单位', text: '九江市数字经济产业研究院（中国信通院）', photo: 0 },
      { year: '单位', text: '中信证券', photo: 2 },
      { year: '单位', text: '华闻期货深圳分公司', photo: 1 },
      { year: '单位', text: '广东培正学院', photo: 3 },
      { year: '现场', text: '经济学院应用型人才培养方案研讨会', photo: 4 },
      { year: '现场', text: '天择教育科技 · 参访交流', photo: 5 },
      { year: '现场', text: '校企座谈交流', photo: 6 },
      { year: '现场', text: '研讨与授课', photo: 7 },
    ],
    gallery: industryGallery,
  },
  {
    id: 'training',
    n: '04',
    zh: '师资培训',
    en: 'FACULTY DEVELOPMENT',
    tone: 'light',
    count: '7 场现场',
    lead: '师资培训围绕 AI+ 数字经济与金融场景应用、金融科技与金融实务展开：从开班致辞、集中授课，到实训室里的平台上手，形成完整的培训现场。',
    visual: 'workshop',
    feature: trainingGallery[0],
    support: [trainingGallery[1], trainingGallery[6], trainingGallery[3]],
    timeline: [
      { year: '研修班', text: 'AI+ 数字经济与金融场景应用实战师资研修班', photo: 0 },
      { year: '第一期', text: '全国金融科技与金融实务师资培训', photo: 1 },
      { year: '实训室', text: '大数据虚拟仿真实训室 · 培训现场', photo: 6 },
      { year: '课堂', text: '集中授课 · 平台实操 · 结业合影', photo: 3 },
    ],
    gallery: trainingGallery,
  },
  {
    id: 'competition',
    n: '05',
    zh: '以赛促学',
    en: 'COMPETITIONS',
    tone: 'dark',
    count: '23 张现场 · 3 份文件',
    lead: '全国证券投资模拟实训大赛由全国金融职业教育教学指导委员会主办、河南经贸职业学院承办，深圳市天择教育科技有限公司提供技术支持。2022 年第九届赛事共有全国 400 多所院校、18000 多支队伍参赛，100 支队伍进入冠军邀请赛。',
    visual: 'competition',
    stats: [
      { value: 400, suffix: '+', label: '参赛院校' },
      { value: 18000, suffix: '+', label: '参赛队伍' },
      { value: 100, suffix: '支', label: '进入冠军邀请赛' },
      { value: 35, suffix: '支', label: '金 / 银 / 铜奖' },
      { value: 54, suffix: '支', label: '优秀奖' },
      { value: 45, suffix: '所', label: '获奖院校' },
    ],
    credit: [
      { k: '主办', v: '全国金融职业教育教学指导委员会' },
      { k: '承办', v: '河南经贸职业学院' },
      { k: '技术支持', v: '深圳市天择教育科技有限公司' },
    ],
    feature: competitionGallery[0],
    support: [competitionGallery[1], competitionGallery[8]],
    docs: [
      {
        src: '/images/coop-atlas/doc-result.webp',
        title: '冠军邀请赛比赛结果通报',
        meta: '全国金融职业教育教学指导委员会 · 金融行指委〔2022〕14 号',
        note: '2022 年第九届全国证券投资模拟实训大赛（冠军邀请赛）于 11 月 17 日—18 日举行，公布金、银、铜奖及优秀奖名单。',
      },
      {
        src: '/images/coop-atlas/doc-notice.webp',
        title: '2022 全国证券投资模拟实训大赛通知',
        meta: '全国金融职业教育教学指导委员会 · 金融行指委〔2021〕11 号',
        note: '明确赛项组织、赛项时间与参赛安排。',
      },
      {
        src: '/images/coop-atlas/doc-workshop.webp',
        title: '新金融智慧学习工场（2020）确认结果',
        meta: '教育部学校规划建设发展中心',
        note: '南阳师范学院、福州大学至诚学院、上海立信会计金融学院、北京财贸职业学院、江苏经贸职业技术学院 5 所院校获授“新金融智慧学习工场（2020）”称号。',
      },
    ],
    gallery: competitionGallery,
  },
]
