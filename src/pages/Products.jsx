import ProductMatrix from '../components/sections/ProductMatrix'

/* ============================================================
 * 产品体系页
 * ------------------------------------------------------------
 * 去掉独立的 PageHero 首屏：进入本页，第一屏直接就是「七大产品体系」
 * 整屏轮播模块（ProductMatrix，id="matrix"）。该模块自带暗底（night 近黑 #06080d）
 * 与 sticky 钉屏（top-[64px]），这里只补一层同色顶垫，让首屏顶部那 64px
 * 不被固定顶栏压住内容 —— 顶垫底色与模块顶部同色（#06080d），顶栏透明浮在上头。
 * ============================================================ */

export default function Products() {
  return (
    <div className="pt-[64px]" style={{ background: '#06080d' }}>
      <ProductMatrix />
    </div>
  )
}
