/* ============================================================
 * 荣誉墙 · 牌匾清单（唯一真源）
 * ------------------------------------------------------------
 * 由 scripts/gen-honors.mjs 生成；每块牌匾的文字与 SVG 文件名一一对应。
 * org/title 为页面图注，material 记录原牌匾材质，source 指向去重后保留的原图。
 * ============================================================ */

/* 牌匾的稳定键：由 SVG 文件名派生，不含斜杠与点，可直接作为 overlay 路径段。
   后台按这个键覆盖图注，牌匾顺序与图片文件仍由下方 honors 数组决定。 */
export const honorSlug = (file) => String(file).split('/').pop().replace(/\.svg$/i, '')

export const honors = [
  {
    file: '/images/honors/nankai-university.svg',
    org: '南开大学',
    title: '“红色文化育人”社会实践基地',
    material: '黄铜',
    source: '微信图片_20261110164934_12_5.jpg',
  },
  {
    file: '/images/honors/credit-rating-aaa.svg',
    org: '企业信用等级',
    title: '信用等级证书 AAA',
    material: '金箔木框',
    source: '微信图片_20261110164930_9_5.jpg',
  },
  {
    file: '/images/honors/iso9001-certification.svg',
    org: '质量管理体系',
    title: 'ISO9001:2015 认证证书',
    material: '金箔木框',
    source: '微信图片_20261110164931_10_5.jpg',
  },
  {
    file: '/images/honors/specialty-sme.svg',
    org: '深圳市中小企业服务局',
    title: '专精特新中小企业',
    material: '黄铜',
    source: '专精特新中小企业.jpg',
  },
  {
    file: '/images/honors/hit-shenzhen.svg',
    org: '哈尔滨工业大学（深圳）',
    title: '校外实习基地',
    material: '拉丝不锈钢',
    source: '微信图片_20261110164932_11_5.jpg',
  },
  {
    file: '/images/honors/shenzhen-software-association.svg',
    org: '深圳市软件行业协会',
    title: '会员单位',
    material: '红木金字',
    source: '微信图片_20261110164935_13_5.jpg',
  },
  {
    file: '/images/honors/gba-digital-business-consortium.svg',
    org: '粤港澳数字商业产教融合共同体',
    title: '副理事长单位',
    material: '金箔木框',
    source: '微信图片_20261110164936_14_5.jpg',
  },
  {
    file: '/images/honors/sustc.svg',
    org: '南方科技大学',
    title: '实习实践基地',
    material: '黄铜',
    source: '微信图片_20261110164937_15_5.jpg',
  },
  {
    file: '/images/honors/zhaoqing-university-major.svg',
    org: '肇庆学院',
    title: '专业实习基地',
    material: '拉丝不锈钢',
    source: '微信图片_20261110164938_16_5.jpg',
  },
  {
    file: '/images/honors/gdcm-hr-project.svg',
    org: '广东财贸职业学院',
    title: '人力资源提升项目',
    material: '金箔木框',
    source: '微信图片_20261110164939_17_5.jpg',
  },
  {
    file: '/images/honors/shenzhen-fintech-association.svg',
    org: '深圳市金融科技协会',
    title: '会员单位',
    material: '银牌木框',
    source: '微信图片_20261110164940_18_5.jpg',
  },
  {
    file: '/images/honors/gdcm-practice-base.svg',
    org: '广东财贸职业学院',
    title: '大学生校外实践教学基地',
    material: '拉丝不锈钢',
    source: '微信图片_20261110164941_19_5.jpg',
  },
  {
    file: '/images/honors/xiamen-institute-of-technology.svg',
    org: '厦门工学院',
    title: '双师双能型基地',
    material: '拉丝不锈钢',
    source: '微信图片_20261110164941_20_5.jpg',
  },
  {
    file: '/images/honors/zhaoqing-university-lab.svg',
    org: '肇庆学院',
    title: '实验教学中心',
    material: '拉丝不锈钢',
    source: '微信图片_20261110164942_21_5.jpg',
  },
  {
    file: '/images/honors/shenzhen-university.svg',
    org: '深圳大学',
    title: '实习基地',
    material: '拉丝不锈钢',
    source: '微信图片_20261110164943_22_5.jpg',
  },
  {
    file: '/images/honors/shenzhen-intl-business-school.svg',
    org: '深圳国际商学院',
    title: '校企合作单位',
    material: '黄铜',
    source: '微信图片_20261110164945_24_5.jpg',
  },
  {
    file: '/images/honors/guangzhou-college-of-commerce.svg',
    org: '广州商学院',
    title: '产学研合作示范基地',
    material: '拉丝不锈钢',
    source: '微信图片_20261110164946_25_5.jpg',
  },
  {
    file: '/images/honors/swufe-national-base.svg',
    org: '西南财经大学',
    title: '国家级大学生校外实践教育基地',
    material: '黄铜',
    source: '微信图片_20261110164947_26_5.jpg',
  },
  {
    file: '/images/honors/hunan-institute-of-technology.svg',
    org: '湖南工学院',
    title: '实践教学基地',
    material: '金箔木框',
    source: '微信图片_20261110164948_28_5.jpg',
  },
  {
    file: '/images/honors/longgang-vocational-school.svg',
    org: '深圳市龙岗区第二职业技术学校',
    title: '校企合作单位',
    material: '金箔木框',
    source: '微信图片_20261110164949_29_5.jpg',
  },
  {
    file: '/images/honors/wanxi-university.svg',
    org: '皖西学院',
    title: '产学研合作基地',
    material: '拉丝不锈钢',
    source: '微信图片_20261110164951_30_5.jpg',
  },
]
