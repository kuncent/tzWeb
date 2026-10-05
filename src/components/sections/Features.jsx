import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Play, Check, Sparkles } from 'lucide-react'
import { Reveal, SectionHead, SpotlightGlow, spotMove, EASE } from '../ui'
import { featuresHead, features } from '../../data/site'

/* ---------------- 产品界面 Mock ---------------- */
function MockFrame({ title, children }) {
  return (
    <div className="overflow-hidden rounded-xl card-elev">
      <div className="flex items-center gap-2 border-b border-ink-900/[0.06] bg-mist-200 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[11px] font-medium text-ink-400">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Bubble({ who, color, text, mine }) {
  return (
    <div className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
      <div
        className={
          'max-w-[80%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ' +
          (mine ? 'bg-ink-900 text-white' : 'bg-mist-200 text-ink-700')
        }
      >
        {!mine && (
          <span className={'mb-0.5 block text-[10px] font-semibold ' + color}>{who}</span>
        )}
        {text}
      </div>
    </div>
  )
}

function ClassroomMock() {
  return (
    <MockFrame title="天择教育 AI 课堂 · Transformer 注意力机制">
      <div className="space-y-3">
        <Bubble who="AI 教师 · 语音讲解中" color="text-brand" text="Q·K·V 就像图书馆：Query 是你的问题，Key 是书脊标签，Value 是书的内容。" />
        <Bubble who="AI 同学 · 阿强" color="text-[#B4690E]" text="老师我有保留意见：这个类比忽略了 softmax 归一化，我举个反例——" />
        <Bubble who="你" mine text="所以注意力其实是「加权的检索」？" />
        <Bubble who="AI 教师" color="text-brand" text="问到点子上了！我把公式写到白板上，现场推一遍给你看。" />
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-ink-900/[0.06] pt-3 text-[11px] text-ink-400">
        <Sparkles className="h-3.5 w-3.5 text-brand" />
        白板实时推演 · 课堂纪要已自动生成 · 随堂测验已插入第 3 节
      </div>
    </MockFrame>
  )
}

function IdeMock() {
  return (
    <MockFrame title="天择教育 实验 IDE · 自然语言实验">
      <div className="rounded-lg bg-mist-200 px-3.5 py-2.5 text-xs text-ink-700">
        “写一个 ROS 机械臂抓取策略，加入失败重试与位姿偏移补偿”
      </div>
      <div className="mt-3 overflow-hidden rounded-lg bg-[#0B1220] p-4 font-mono text-[11px] leading-[1.9]">
        <div>
          <span className="text-[#7DD3FC]">def</span>{' '}
          <span className="text-[#FDE68A]">grasp</span>
          <span className="text-white/70">(pose, retries=3):</span>
        </div>
        <div className="text-white/70">{'    '}for i in range(retries):</div>
        <div className="text-white/70">{'        '}result = arm.move_to(</div>
        <div className="text-[#86EFAC]">{'            '}pose + offset(i * 0.5cm)</div>
        <div className="text-white/70">{'        '})</div>
        <div className="text-[#94A3B8]">{'        '}# AI：指数退避 + 位姿补偿</div>
        <div className="text-white/70">
          {'        '}if result.ok:{' '}<span className="text-[#7DD3FC]">return</span>{' '}
          <span className="text-[#86EFAC]">"success"</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-medium text-brand">
          <Play className="h-3 w-3 fill-current" /> 沙箱运行中
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-[#16A34A]">
          <Check className="h-3 w-3" /> 3 项测试通过 · 评分 92
        </span>
        <span className="text-ink-400">耗时 1.2s</span>
      </div>
    </MockFrame>
  )
}

function AnalyticsMock() {
  const bars = [
    { k: '注意力计算', v: 92 },
    { k: '位置编码', v: 78 },
    { k: '多头机制', v: 61 },
    { k: '训练调参', v: 43 },
  ]
  return (
    <MockFrame title="学情引擎 · 班级知识掌握漏斗">
      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.k}>
            <div className="mb-1 flex justify-between text-[11px] text-ink-500">
              <span>{b.k}</span>
              <span className="font-semibold text-ink-900">{b.v}%</span>
            </div>
            <div className="h-2 rounded-full bg-mist-200">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${b.v}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: EASE }}
                className={'h-2 rounded-full ' + (b.v < 50 ? 'bg-[#F59E0B]' : 'bg-brand')}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-brand/20 bg-brand-50 p-3 text-[11px] leading-relaxed text-ink-700">
        <span className="font-semibold text-brand">AI 建议：</span>
        「训练调参」为全班薄弱点，建议插入 15 分钟实验 <span className="text-brand">lab-04 学习率网格搜索</span>，并对 6 名风险学生课后补课。
      </div>
    </MockFrame>
  )
}

function TimingMock() {
  return (
    <MockFrame title="智能调度 · 个人学习节奏">
      <div className="relative ml-2 border-l-2 border-mist-300 pl-5">
        {[
          { t: '09:00', x: 'Transformer 直播课', done: true },
          { t: '14:00', x: '实验：注意力代码实现', done: true },
          { t: '19:30', x: 'AI 预测最佳复习窗口 → 推送错题', hi: true },
          { t: '次日 08:00', x: '遗忘曲线复检 · 掌握度 +12%', done: false },
        ].map((s) => (
          <div key={s.t} className="relative mb-5 last:mb-0">
            <span
              className={
                'absolute -left-[27px] top-0.5 h-3 w-3 rounded-full border-2 border-white ' +
                (s.hi ? 'bg-brand shadow-glow' : s.done ? 'bg-ink-400' : 'bg-mist-300')
              }
            />
            <div className="text-[11px] text-ink-400">{s.t}</div>
            <div className={'text-xs font-medium ' + (s.hi ? 'text-brand' : 'text-ink-800')}>{s.x}</div>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 300 48" className="mt-2 w-full" aria-hidden>
        <path d="M0 40 C40 38 60 10 90 12 S150 42 180 30 S240 6 300 14" fill="none" stroke="#1677FF" strokeWidth="2" strokeOpacity="0.6" />
        <circle cx="180" cy="30" r="3.5" fill="#1677FF" />
      </svg>
      <div className="text-[10px] text-ink-400">专注度曲线（AI 预测）</div>
    </MockFrame>
  )
}

function TwinMock() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-900/[0.08] shadow-lift">
      {/* 尺寸必须写死：这是一张 550×288 的位图，而它是这个容器的唯一非绝对定位孩子
          —— 没尺寸属性时容器高度先按 0 排，图解码完再撑到 ~330px。延后挂载之后
          这个跳变动到了用户已经在往下滚的时候（实测把 #advisor 的落点顶偏 329px），
          写 width/height 浏览器就能自己按宽高比预留那块位置 */}
      <img src="/images/d_labiso.webp" alt="数字孪生实验室" loading="lazy" decoding="async" width={550} height={288} className="img-duo h-auto w-full" />
      <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-[#0B1220]/80 to-transparent p-4">
        {['虚拟试错', '真机联动', '过程回放'].map((t) => (
          <span key={t} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function PrivateMock() {
  return (
    <MockFrame title="校本专属云 · 部署拓扑">
      <div className="space-y-2.5">
        {[
          { t: '校园算力集群', d: 'GPU 池化调度 · 信创环境适配' },
          { t: '统一身份 & 教务直连', d: 'CAS / 企业微信 / 正方教务' },
          { t: '数据不出校', d: '全栈私有化 · 审计日志 · 源码授权可选' },
        ].map((c) => (
          <div key={c.t} className="flex items-center justify-between rounded-lg border border-ink-900/[0.07] bg-mist-100 px-4 py-3">
            <div>
              <div className="text-xs font-semibold text-ink-900">{c.t}</div>
              <div className="mt-0.5 text-[11px] text-ink-500">{c.d}</div>
            </div>
            <Check className="h-4 w-4 text-[#16A34A]" />
          </div>
        ))}
      </div>
    </MockFrame>
  )
}

const VISUALS = {
  classroom: ClassroomMock,
  ide: IdeMock,
  analytics: AnalyticsMock,
  timing: TimingMock,
  twin: TwinMock,
  private: PrivateMock,
}

/* ---------------- Section ----------------
   原来这六块是六个上下排列的图文交替屏，滚完要三屏多 —— 读者到第二块
   就已经忘了第一块。改成「选一项看一项」：左标单常驻，右边换界面。
   六块 mock 本身不动（它们是这个站信息密度最高的地方），动的只是容器。 */
function CapRow({ f, i, on, onPick }) {
  return (
    <li>
      <button
        type="button"
        onMouseEnter={() => onPick(f.id)}
        onFocus={() => onPick(f.id)}
        onClick={() => onPick(f.id)}
        aria-pressed={on}
        className="relative block w-full rounded-xl px-4 py-3.5 text-left transition-colors duration-300"
      >
        {on && (
          <motion.span
            layoutId="cap-active"
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="absolute inset-0 rounded-xl border border-brand/25 bg-white shadow-lift"
          />
        )}
        {!on && <span className="absolute inset-0 rounded-xl border border-transparent" />}
        <span className="relative z-10 flex items-baseline gap-3">
          <span className={`font-mono text-[10.5px] tabular-nums tracking-[0.16em] ${on ? 'text-brand' : 'text-ink-400'}`}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0">
            <span className={`block text-[14.5px] font-semibold tracking-tight ${on ? 'text-ink-900' : 'text-ink-600'}`}>
              {f.title}
            </span>
            <span className={`mt-0.5 block text-[11.5px] ${on ? 'text-brand' : 'text-ink-400'}`}>{f.tag}</span>
          </span>
        </span>
      </button>
    </li>
  )
}

export default function Features() {
  const [pick, setPick] = useState(features[0].id)
  const cur = features.find((f) => f.id === pick) || features[0]
  const Visual = VISUALS[cur.visual]

  return (
    <section id="features" className="bg-white sec-y">
      <div className="container-x">
        <SectionHead
          id="features" n="05"
          en={featuresHead.en}
          zh="六项能力，覆盖备课到评价的全链路"
          sub={featuresHead.sub}
          action={{ to: '/technology', children: '看技术底座' }}
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,0.66fr)_minmax(0,1.34fr)] lg:gap-12">
          <Reveal className="lg:sticky lg:top-[96px] lg:self-start">
            <ul className="space-y-0.5 rounded-2xl bg-mist-100/80 p-1.5">
              {features.map((f, i) => (
                <CapRow key={f.id} f={f} i={i} on={f.id === pick} onPick={setPick} />
              ))}
            </ul>
            <p className="mt-5 text-[12.5px] leading-[1.8] text-ink-400">
              六项能力共用同一套底座：一套身份、一份数据、一条审计链。开哪一项都不必重新对接一次。
            </p>
          </Reveal>

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={cur.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {/* 界面本体：给一层淡底把 mock 托起来，不然白卡贴白底没边界 */}
                <div onMouseMove={spotMove} className="group relative overflow-hidden rounded-2xl border border-ink-900/[0.07] bg-gradient-to-b from-mist-100 to-white p-5 md:p-8">
                  <SpotlightGlow />
                  <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,0.1),transparent)]" />
                  <div className="relative">{Visual ? <Visual /> : null}</div>
                </div>

                <div className="mt-8">
                  <h3 className="text-[22px] font-bold leading-snug tracking-tight text-ink-900 md:text-[26px]">{cur.title}</h3>
                  <p className="mt-4 max-w-2xl text-[14.5px] leading-[1.9] text-ink-500">{cur.desc}</p>
                  <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-2.5">
                    {cur.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-50 text-brand">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/#contact"
                    className="group mt-8 inline-flex items-center gap-2 text-[13.5px] font-medium text-brand transition-colors hover:text-ink-900"
                  >
                    要一份这一项的开通清单
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
