import StoryHero from '../components/sections/StoryHero'

/* 首页现在只有首屏那一块：具身 / 区块链 / AI 三屏业务特效（钉屏三切，看板可交互）。
   原来的「挑战与问题 / AI 方案顾问 / 技术架构 / AI 能力 / 联系我们」五屏已下线：
   前四个模块整块去掉，「联系我们」表单迁到关于我们页（/about#contact，见 pages/About.jsx）。
   没有首屏之下的延后挂载屏，这里也就不再需要那套动态 import + idle 门控的机制
   （旧版靠它把首屏之下的重依赖摘出入口 chunk —— 现在摘无可摘，直接留静态首屏）。 */
export default function Home() {
  return <StoryHero />
}
