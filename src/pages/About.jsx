import { PageHero } from '../components/PageShell'
import RippleHero from '../components/RippleHero'
import Contact from '../components/sections/Contact'
import CoBuildFramework from '../components/sections/CoBuildFramework'
import HonorWall from '../components/sections/HonorWall'
import CopyrightGrid from '../components/sections/CopyrightGrid'
import { advisorStats } from '../data/site'


/* 首屏背景：光明科技金融大厦三张 2304×1296 外观（远景天际线 / 航拍俯瞰 /
   主塔立面近景），由 RippleHero 做 react-bits 风格的水波纹自动切换。
   三张同为 16:9、同一光比与冷调玻璃质感，避免切换时跳色。
   at = 标注在图像空间的比例坐标（RippleHero 按 cover 逆映射钉回屏幕）：
   前两张钉在主塔楼身上，第三张钉在正门入口的玻璃带上。 */
const towerShots = [
  { src: '/images/about/tower-01.webp', label: '光明科技金融大厦 · 凤凰城天际线', at: [0.618, 0.3] },
  { src: '/images/about/tower-02.webp', label: '光明科技金融大厦 · 航拍俯瞰', at: [0.498, 0.32] },
  { src: '/images/about/tower-03.webp', label: '光明科技金融大厦 · 主塔正门', at: [0.498, 0.62] },
]

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="ABOUT US"
        crumbs="关于我们"
        title="立足高校，构建下一代人才培养基础设施"
        sub="深圳市天择科技有限公司成立于 2017 年 10 月，国家级高新技术企业、深圳市专精特新企业、A 级纳税人。公司专注教育科技，从事教育信息化平台、教育实训仿真软件、教学资源库与现代教育装备的技术开发与集成服务，为高校提供实验室建设、课程开发与人才培养的全栈解决方案。"
        stats={advisorStats}
        cta={[
          { label: '联系我们', to: '#contact', primary: true },
          { label: '看解决方案', to: '/solutions' },
        ]}
        backdrop={<RippleHero images={towerShots} />}
      />

      <CoBuildFramework />

      <HonorWall />

      <CopyrightGrid />

      {/* ―― 联系我们：原首页最后一屏迁入本页（表单 id="contact"，全站 /about#contact 锁点指这里）―― */}
      <Contact />

    </>
  )
}
