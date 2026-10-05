import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { markHeroReady, whenHeroReady } from './components/three/hero/buildBus'
import './index.css'

/* ―― 首屏 loading 角标的交棒时机 ――
   角标不挡页面（只一枚胶囊，pointer-events:none），它标的是「具身首屏还没得演」
   那一段：不是「React 说渲染完了」，也不是「那一帧上了屏」，而是「首屏动画能开始演」：
   3D 舞台是等浏览器空闲才挂的，three 的 chunk 还要一跳网络 —— 文案画完那一刻
   用户看到的还是一片 CSS 底图。就绪信号走 buildBus：舞台真的在画（过了着色器
   编译那一帧）那一拍 markHeroReady('stage')，见 HeroStage 的 StageReady。
   故意不等模型到位：那是用户看不见的一跳下载，为它多盖一秒不划算。

   不能只有一条正常路径，其余几条都是防止把人锁在门外的出口：
     nostage / dead  不挂 3D 的设备、舞台进了错误边界 —— StoryHero 立刻放行
     user            他在遮罩上还等着就先动了 —— 同上
     nav             带 hash 直达且落点不在首屏 —— useLenis 落地时放行
     timeout         上面全哑（网络抽风、帧循环没起来）—— 下面那个定时器放行
   只淡出不直接 display:none：0.55s opacity 交接给动画，角标“退下去”而不是
   “开关”；动画走完再从 DOM 摘掉，不给合成树留一个常驻层。
   index.html 里那条 9s 是入口 JS 整个挂了时的最后一道，它不看这个信号 */
const BOOT_TIMEOUT = 6500

function dismissBoot() {
  const el = document.getElementById('boot')
  if (!el || el.className === 'boot-gone') return
  el.classList.add('boot-gone')
  setTimeout(() => el.remove(), 700)
}

whenHeroReady(dismissBoot)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

/* 双 rAF = 第一帧排进渲染队列、第二帧已在绘制之后：从这里开始算「等首屏
   成形」的时限，而不是从文档解析算起 —— 入口 JS 自己就能占掉笔记本上的一秒多 */
requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => markHeroReady('timeout'), BOOT_TIMEOUT)))
