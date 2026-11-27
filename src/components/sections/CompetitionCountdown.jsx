import { useEffect, useState } from 'react'

/* ============================================================
 * 赛事看板：报名截止倒计时
 * ------------------------------------------------------------
 * 倒计时按通知口径算到 12-10 结束（即 12-11 00:00，UTC+8）。
 * 秒级 tick 只影响本组件自身 —— 状态关在这里，
 * 不会带动整个竞赛页每秒重渲染。
 * ============================================================ */

const DEADLINE = new Date('2026-12-11T00:00:00+08:00').getTime()

function remain(now) {
  const ms = DEADLINE - now
  if (ms <= 0) return null
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  }
}

const pad = (n) => String(n).padStart(2, '0')

function Unit({ value, label, en }) {
  return (
    <span className="flex flex-col items-center gap-2">
      <span className="bg-[linear-gradient(180deg,#f5e4bd,#d9bd83_60%,rgba(217,189,131,0.62))] bg-clip-text font-serif text-[34px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-transparent md:text-[44px]">
        {pad(value)}
      </span>
      <span className="text-[10px] font-medium tracking-[0.18em] text-white/28">{en || label}</span>
    </span>
  )
}

export default function CompetitionCountdown() {
  const [left, setLeft] = useState(() => remain(Date.now()))

  useEffect(() => {
    const id = window.setInterval(() => setLeft(remain(Date.now())), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-8 md:gap-x-14">
      {/* 倒计时：不套框，直接以大字站在暗底上 */}
      <div>
        <p className="flex items-center gap-2 text-[11.5px] font-medium tracking-[0.14em] text-white/40">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d9bd83] opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#d9bd83]" />
          </span>
          距报名截止 · 12 月 10 日
        </p>

        {left ? (
          <div className="mt-4 flex items-end gap-3 md:gap-4">
            <Unit value={left.d} en="DAYS" />
            <span className="pb-6 font-mono text-[20px] leading-none text-white/12" aria-hidden>:</span>
            <Unit value={left.h} en="HOURS" />
            <span className="pb-6 font-mono text-[20px] leading-none text-white/12" aria-hidden>:</span>
            <Unit value={left.m} en="MINS" />
            <span className="pb-6 font-mono text-[20px] leading-none text-white/12" aria-hidden>:</span>
            <Unit value={left.s} en="SECS" />
          </div>
        ) : (
          <p className="mt-4 text-[26px] font-semibold text-white">报名已结束</p>
        )}
      </div>
    </div>
  )
}
