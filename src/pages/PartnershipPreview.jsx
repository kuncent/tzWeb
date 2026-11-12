import { Link } from 'react-router-dom'
import { Reveal } from '../components/ui'
import NewsSection from '../components/sections/NewsSection'
import CooperationAtlas from '../components/sections/CooperationAtlas'

/* ============================================================
 * 校企合作页 · 预览副本（/partnership-preview）
 * ------------------------------------------------------------
 * 正式页 /partnership 保持原样，这里只用于确认新版「合作档案」板块。
 * 页面头部与新闻资讯沿用正式页现有内容，方便在真实上下文里看衔接；
 * 下方换成 CooperationAtlas（数据与组件均为新增文件）。
 * ============================================================ */

export default function PartnershipPreview() {
  return (
    <div className="bg-white pt-[64px]">
      <div className="sticky top-[64px] z-40 border-b border-white/10 bg-ink-900 text-white">
        <div className="container-x flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2.5">
          <p className="flex items-center gap-2.5 text-ui-sm text-white/80">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 animate-pingslow rounded-full bg-brand-400 motion-reduce:animate-none" />
            <span>
              <span className="font-semibold text-white">预览副本</span>
              <span className="mx-2 text-white/25">/</span>
              校企合作页下方「合作档案」板块 · 正式页未替换
            </span>
          </p>
          <div className="flex items-center gap-4">
            <a href="#cooperation-archive" className="text-ui-sm text-white/60 transition-colors hover:text-white">
              直接看合作板块 ↓
            </a>
            <Link
              to="/partnership"
              className="text-ui-sm font-medium text-brand-300 transition-colors hover:text-brand-200"
            >
              查看现有正式页 →
            </Link>
          </div>
        </div>
      </div>

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

      <NewsSection />

      <CooperationAtlas />
    </div>
  )
}
