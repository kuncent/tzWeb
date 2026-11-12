import { Reveal } from '../components/ui'
import NewsSection from '../components/sections/NewsSection'
import CoopShowcase from '../components/sections/CoopShowcase'

/* ============================================================
 * 校企合作页
 * ------------------------------------------------------------
 * 进页即内容：标题 → 新闻资讯 → 合作实景。合作板块不再纵向堆叠五个
 * 图文段，改为 CoopShowcase 的板块切换式实景画廊（照片拼贴 / 教材书架
 * + 灯箱），素材与文案集中在 src/data/cooperation.js。
 * ============================================================ */

export default function SchoolEnterprise() {
  return (
    <div className="bg-white pt-[64px]">
      <div className="container-x pt-12 md:pt-16">
        <Reveal className="mb-10 md:mb-12">
          <h1 className="max-w-[24ch] text-3xl font-bold tracking-tight text-ink-900 md:text-[38px] md:leading-[1.18]">
            与学校全方位合作
          </h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-[1.9] text-ink-500">
            会议、教材、课题、培训、比赛 —— 校企合作不是一次签约，而是这五条线持续地跑。每条线都有可交付的东西与清晰的对接方式，学校按自己的节奏挑着开始。
          </p>
        </Reveal>
      </div>

      {/* 新闻资讯：原「关于我们」页的板块，现作为本页第一个板块 */}
      <NewsSection />

      <Reveal>
        <CoopShowcase />
      </Reveal>
    </div>
  )
}
