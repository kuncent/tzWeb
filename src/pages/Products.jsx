import ProductMatrix from '../components/sections/ProductMatrix'

/* ============================================================
 * 产品体系页
 * ------------------------------------------------------------
 * 去掉独立的 PageHero 首屏：进入本页，第一屏直接就是「五大产品体系」
 * 整屏轮播模块（ProductMatrix，id="matrix"）。该模块自带暗底（bg-night）
 * 与 sticky 钉屏（top-[64px]），这里只补一层同色顶垫，让首屏顶部那 64px
 * 不被固定顶栏压住内容 —— 底色与模块一致（夜蓝），顶栏透明浮在上头。
 * ============================================================ */

export default function Products() {
  return (
    <div className="bg-night pt-[64px]">
      <ProductMatrix />
    </div>
  )
}
