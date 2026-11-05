import { PageCTA } from '../components/PageShell'
import Customers from '../components/sections/Customers'

/* ============================================================
 * 高校案例页
 * ------------------------------------------------------------
 * 原案例长页（实验室案例集 / 合作名录 / 客户墙 / 成果 / 服务网络）已按要求清空，
 * 首屏 PageHero 也按要求去掉，进页直接以「已合作院校」模块（Customers，id="customers"：
 * 标杆院校轮播 + 校徽漂移墙 + 产业客户 logo 带）开场。
 * ============================================================ */

export default function Cases() {
  return (
    <>
      <Customers />
      <PageCTA
        title="想看和你学校同类的那一份案例"
        sub="告诉我学校类型、专业方向与场地情况，我们按同类院校准备案例集与初版方案 —— 这一步不需要你先决定是否采购。"
        back={{ label: '看关于我们', to: '/about' }}
      />
    </>
  )
}
