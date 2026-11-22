import StoryHero from '../components/sections/StoryHero'
import CompetitionModules from '../components/sections/CompetitionModules'

/* 首页 = 首屏那块三屏业务特效 + 2026 大赛的四个环节。
   环节区接在首屏羽化色 #0a1a2e 上（首屏底部渐变正好落到这个色），
   下方直接接页脚，整段没有色阶台阶。 */
export default function Home() {
  return (
    <>
      <StoryHero />
      <CompetitionModules
        id="competition-modules"
        bg="bg-[#0a1a2e]"
        no={null}
        kicker="2026 NATIONAL COMPETITION"
        title="赛场上的四个环节"
        sub="2026 年全国数智财经综合应用大赛：参赛团队在企业数字化经营、财务、税务、金融投资四个环节连续博弈。"
        link={{ to: '/competition', label: '了解赛事与报名' }}
      />
    </>
  )
}
