/* ============================================================
 * 后台内容编辑 · 可编辑面 schema
 * ------------------------------------------------------------
 * 单一清单：后台表单按这份 schema 渲染，不再在各处手写字段。
 * 每条 field 只描述「一个文本叶子」：
 *   path     overlay 路径（服务端按这个路径深合并）
 *   default  官网源码里的默认值（等于默认 / 清空 → 写 null，回落默认）
 * 结构、数组、图标、坐标不在这里定义 —— 它们仍归各自的 data 文件。
 * 新增可编辑面时先加数据默认值，再在这里登记，最后在组件接 useContent。
 * ============================================================ */
import { contact, contactHead, matrixHead, productMatrix } from '../data/site'
import { heroMeta } from '../data/heroScenes'
import { solutionPlans } from '../data/pages'
import { coBuildNodes, coBuildTitle } from '../data/coBuild'

const text = (path, label, def, extra) => ({ path, label, type: 'text', default: def, ...extra })
const area = (path, label, def, rows = 4) => ({ path, label, type: 'textarea', rows, default: def })
const lines = (path, label, def, rows = 4) => ({ path, label, type: 'lines', rows, default: def })
const pairs = (path, label, def, rows = 2) => ({ path, label, type: 'pairs', rows, default: def })

export const CONTENT_GROUPS = [
  {
    id: 'home',
    label: '首页',
    sections: [
      {
        id: 'hero',
        title: '首屏文案',
        desc: '眉标、品牌行与公司简介段落；留空即沿用源码默认。',
        locked: {
          label: '主标题（固定，不在后台编辑）',
          lines: ['天择科技，AI', '与数字产教的', '创新实践者'],
        },
        fields: [
          text('heroMeta.eyebrow', '眉标（英文）', heroMeta.eyebrow),
          text('heroMeta.brand', '品牌行（移动端顶部）', heroMeta.brand),
          area('heroMeta.intro', '公司简介段落', heroMeta.intro, 5),
        ],
      },
    ],
  },
  {
    id: 'solutions',
    label: '解决方案',
    sections: solutionPlans.map((p) => ({
      id: `solution-${p.id}`,
      title: `${p.n} ${p.short}`,
      desc: '仅建设目标可在这里编辑；方案名称、定位、产业主线与首屏 3D 展板共用代码内定义。',
      fields: [area(`solutions.${p.id}.goal`, '建设目标', p.goal, 5)],
    })),
  },
  {
    id: 'about',
    label: '关于我们',
    sections: [
      {
        id: 'co-build-title',
        title: '专业共建框架 · 区块',
        desc: '区块标题与六个共建维度的名称、说明。',
        fields: [text('about.coBuild.title', '区块标题', coBuildTitle)],
      },
      ...coBuildNodes.map((n) => ({
        id: `co-build-${n.n}`,
        title: `${n.n} ${n.title}`,
        fields: [
          text(`about.coBuild.nodes.${n.n}.title`, '维度名称', n.title),
          text(`about.coBuild.nodes.${n.n}.sub`, '维度说明', n.sub),
        ],
      })),
    ],
  },
  {
    id: 'honors',
    label: '荣誉资质',
    kind: 'honors',
  },
  {
    id: 'news',
    label: '新闻资讯',
    kind: 'news',
  },
  {
    id: 'contact',
    label: '联系方式',
    sections: [
      {
        id: 'contact-head',
        title: '联系区文案',
        desc: '关于页联系区块的标题与描述。',
        fields: [
          text('sections.contact.title', '标题', contactHead.zh),
          area('sections.contact.desc', '描述', contactHead.desc, 3),
        ],
      },
      {
        id: 'contact-info',
        title: '联系信息',
        desc: '联系区与页脚共用的电话、邮箱、地址。',
        fields: [
          text('contact.phone', '咨询电话', contact.phone),
          text('contact.email', '邮箱', contact.email),
          text('contact.address', '地址', contact.address),
        ],
      },
    ],
  },
  {
    id: 'matrix',
    label: '产品矩阵',
    sections: [
      {
        id: 'matrix-head',
        title: '矩阵标题',
        desc: '产品体系页矩阵区的标题与描述。',
        fields: [
          text('sections.matrix.title', '标题', matrixHead.zh),
          area('sections.matrix.desc', '描述', matrixHead.desc, 3),
        ],
      },
      ...productMatrix.map((p) => ({
        id: `product-${p.id}`,
        title: p.en || p.title,
        desc: `产品：${p.title}`,
        fields: [
          text(`products.${p.id}.title`, '标题', p.title),
          text(`products.${p.id}.tagline`, '一句话定位', p.tagline),
          area(`products.${p.id}.desc`, '详细介绍', p.desc, 4),
          lines(`products.${p.id}.bullets`, '能力标签（每行一条）', p.bullets, 4),
          pairs(`products.${p.id}.stats`, '指标卡（每行“名称 | 数值”）', p.stats, 2),
        ],
      })),
    ],
  },
]

export const CONTENT_FIELDS = CONTENT_GROUPS.flatMap((g) => (g.sections || []).flatMap((s) => s.fields))
