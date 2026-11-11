import { Boxes, BookOpen, Compass, FlaskConical, GraduationCap, Handshake } from 'lucide-react'

/* ============================================================
 * 专业共建框架 · 数据真源
 * ------------------------------------------------------------
 * 原先六个节点的文案与坐标写死在 CoBuildFramework.jsx 内部，后台没有入口。
 * 抽到这里，让组件与后台内容 schema 共用同一份默认值：
 *   · 坐标 / 图标 / side 属于版式结构，只对组件生效；
 *   · title / sub 是纯文案，允许被 content overlay 按节点编号覆盖。
 * ============================================================ */

export const coBuildTitle = '专业共建框架'

export const coBuildNodes = [
  { n: '01', title: '专业建设与评估', sub: '人才培养方案修订', icon: Compass, x: 500, y: 131, side: 'top' },
  { n: '02', title: '师资提升', sub: '企业顶岗实践', icon: GraduationCap, x: 205, y: 230, side: 'left' },
  { n: '03', title: '科研及创新', sub: '横向课题', icon: FlaskConical, x: 795, y: 230, side: 'right' },
  { n: '04', title: '课程建设', sub: '虚拟仿真课程资源', icon: BookOpen, x: 205, y: 510, side: 'left' },
  { n: '05', title: '实践教学', sub: '实验室建设', icon: Boxes, x: 795, y: 510, side: 'right' },
  { n: '06', title: '社会服务', sub: '会议联合举办', icon: Handshake, x: 500, y: 605, side: 'bottom' },
]
