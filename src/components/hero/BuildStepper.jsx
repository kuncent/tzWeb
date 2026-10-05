import { useSyncExternalStore } from 'react'
import { BUILD_STEPS, getBuildStage, subBuildStage } from '../three/hero/buildBus'

/* ============================================================
 * 装配工序进度条：把 3D 里正在演的「搭建实验室」用文字钉住
 * ------------------------------------------------------------
 * 3D 的装配时钟在 WebGL 的 useFrame 里跑，通过 buildBus 只在跨道工序时
 * 通知一次，所以这里一道工序只重渲一回，不会拖首屏主线程。
 *
 * 只在具身屏、且装配还没走完时出现；走完（进入运行态）就淡出收掉 ——
 * 它是一段解说，不是常驻 UI，留在画面上就是新的噪声。
 * ============================================================ */

export default function BuildStepper({ accent }) {
  const stage = useSyncExternalStore(subBuildStage, getBuildStage)
  if (stage < 0) return null
  const live = stage >= BUILD_STEPS.length

  return (
    <div className="pointer-events-none relative select-none" aria-hidden>
      <div className="transition-opacity duration-700" style={{ opacity: live ? 0 : 1 }}>
        <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.28em] text-white/35">
          BUILD SEQUENCE · 搭建一间具身实验室
        </p>
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {BUILD_STEPS.map((label, i) => {
          const done = stage > i
          const on = stage === i
          return (
            <li key={label} className="flex items-center gap-1.5">
              <span
                className="font-mono text-[10px] tabular-nums transition-colors duration-300"
                style={{ color: done || on ? accent : 'rgba(255,255,255,0.22)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className="text-[11px] transition-colors duration-300"
                style={{ color: on ? '#fff' : done ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.26)' }}
              >
                {label}
              </span>
              {/* 当前工序后面跟一个走动的点，读作「正在做」 */}
              {on && <span className="h-[3px] w-[3px] animate-pingslow rounded-full" style={{ background: accent }} />}
              {i < BUILD_STEPS.length - 1 && <span className="ml-1 h-px w-4" style={{ background: done ? `${accent}66` : 'rgba(255,255,255,0.1)' }} />}
            </li>
          )
        })}
        </ol>
        {/* 出口要写出来：用户平均 2~3s 就开始滚，而片头要 4.4s。
            不告诉他滚动能跳过，他就只是“错过”一段动画，而不是“选择跳过”它。
            跳过也不丢东西 —— 时钟只是快进 3.2x，剩下的工序还是一道道走完 */}
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-white/22">
          滚动即可跳过片头
        </p>
      </div>
      {/* 运行态：工序解说退场，视角操作提示接上 —— 拖拽 orbit 此刻才开放，
          提示早了是骗人（分镜期间拖了没反应），晚了没人发现能拖 */}
      <p
        className="absolute inset-x-0 top-0 flex items-center gap-2 transition-opacity duration-700 delay-500"
        style={{ opacity: live ? 1 : 0 }}
      >
        <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-white/45">
          拖拽旋转视角 · 双击回正 · 点击设备聚焦
        </span>
      </p>
    </div>
  )
}
