import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Panel, CmdButton, Metric, Sparkline, Row, wobble, useSeries, useTick } from './consoleBits'
import { getDevice, selectDevice, subDevice } from '../three/hero/buildBus'

/* 具身屏看板 = 实验室的设备控制台：
   点 3D 场景里的设备（臂/人形/H2/狗）→ 镜头聚焦锁定 + 看板切到那台
   设备的信息与状态；全景（wide）态看板吃臂遥测；
   点下面的按钮 = 往作业单元下发一条任务 —— 关节条立刻走向新角度
   （同一张 pose 表也驱动 3D 臂），队列里多一行任务，曲线跟着冲一次。 */

const RAD2DEG = 180 / Math.PI

export default function EmbodiedConsole({ scene, cmd, fire }) {
  const accent = scene.accent
  const tick = useTick(820)
  const poseKey = cmd.id || 'idle'
  /* 选中设备：3D 点击与看板 chip 行都写这条（buildBus 发布订阅） */
  const dev = useSyncExternalStore(subDevice, getDevice)
  const devs = scene.devices || {}
  const d = devs[dev] || devs.arm || { name: '作业单元', code: 'RIG · LIVE' }
  /* wide（全景）与臂都吃遥测视图；其余设备吃档案 + 实时状态 */
  const isArm = dev === 'arm' || dev === 'wide'
  /* pose 表里 track 是三个路点，取当前跑到第几个（按 tick 推，路点之间 3 拍） */
  const leg = useMemo(() => {
    const p = scene.poses[poseKey]
    return Array.isArray(p[0]) ? p[Math.floor(tick / 3) % p.length] : p
  }, [scene.poses, poseKey, tick])
  /* 只有 track 这种“多路点”姿态才走路点计数：其它姿态也是数组（6 个关节角），
     拿 Array.isArray 当判据会把它当成 6 个路点，读数就冒出「6/3」这种鬼数 */
  const waypoints = scene.poses[poseKey]
  const legIndex = Array.isArray(waypoints[0]) ? (Math.floor(tick / 3) % waypoints.length) + 1 : 0

  /* 波形读数：臂用 TCP 速度，其它设备用档案里的口径；
     只在指令下发时冲一次（spike 吃 cmd.n，切设备不诈冲） */
  const speed = useSeries({ base: isArm ? 46 : d.base ?? 46, amp: isArm ? 12 : d.amp ?? 12, seed: isArm ? 9 : d.seed ?? 9, n: 26, period: 820, spike: cmd.n, gain: 3.2 })
  /* 目标值走到位，显示值用补间：关节条不会「瞬移」，像真的在转。
     用 90ms 的定时而不是 rAF —— 这是一串读数，不是动画：rAF 会把整块看板
     拖成每秒 60 次 React 重渲染，白白吃掉首屏主线程。 */
  const [shown, setShown] = useState(leg)
  useEffect(() => {
    const id = setInterval(() => setShown((cur) => cur.map((v, i) => v + (leg[i] - v) * 0.3)), 90)
    return () => clearInterval(id)
  }, [leg])

  /* 任务队列：每次指令入队一条，跑完 4 拍标为 DONE。
     入队前先按 cmd.n 去重：换屏时 scene.commands 换了引用，本 effect 会带着
     同一个 n 再跑一遍，不去重就入两条同 key 的任务（React 报 duplicate key） */
  const [jobs, setJobs] = useState([])
  useEffect(() => {
    if (!cmd.n) return
    const c = scene.commands.find((x) => x.id === cmd.id)
    setJobs((j) =>
      j[0]?.k === cmd.n ? j : [{ k: cmd.n, code: `T-${String(417 + cmd.n).padStart(4, '0')}`, name: c?.label || cmd.id, age: 0 }, ...j].slice(0, 4),
    )
  }, [cmd.n, cmd.id, scene.commands])
  useEffect(() => setJobs((j) => j.map((x) => ({ ...x, age: x.age + 1 }))), [tick])

  return (
    <Panel title={isArm ? 'ROBOT TELEMETRY' : 'DEVICE CONSOLE'} code={d.code} accent={accent} right={<span className="font-mono text-[9.5px] text-white/35">{isArm ? scene.readouts[poseKey] : d.name}</span>}>
      {/* 设备 chip 行：与 3D 点击同一通道，给“看板能切设备”一个可见入口 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {Object.entries(devs).map(([k, v]) => (
          <button
            key={k}
            type="button"
            onClick={() => selectDevice(k)}
            className="rounded-full border px-2.5 py-[3px] font-mono text-[9.5px] tracking-[0.08em] transition-colors"
            style={
              dev === k
                ? { borderColor: `${accent}66`, color: accent, background: `${accent}14` }
                : { borderColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.42)' }
            }
          >
            {v.name}
          </button>
        ))}
      </div>
      {/* 上：臂 = 关节角 + TCP；其它设备 = 静态档案 + 实时状态条 */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        {isArm ? (
          <div className="space-y-1.5">
            {scene.joints.map((j, i) => {
              const deg = shown[i] * RAD2DEG
              return (
                <div key={j} className="flex items-center gap-2">
                  <span className="w-[54px] shrink-0 font-mono text-[9.5px] uppercase tracking-[0.1em] text-white/40">{j}</span>
                  <span className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    {/* 中轴对称条：负角向左、正角向右，一眼看出关节在哪一侧 */}
                    <span className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
                    <motion.span
                      className="absolute inset-y-0 rounded-full"
                      style={{ background: accent, boxShadow: `0 0 10px ${accent}aa` }}
                      animate={{
                        left: deg >= 0 ? '50%' : `${50 + (deg / 180) * 50}%`,
                        width: `${Math.min(50, Math.abs(deg / 180) * 50)}%`,
                      }}
                      transition={{ duration: 0.25, ease: 'linear' }}
                    />
                  </span>
                  <span className="w-[46px] shrink-0 text-right font-mono text-[10.5px] tabular-nums text-white/80">{deg.toFixed(1)}°</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 self-center sm:grid-cols-4">
            {(d.info || []).map(([k, v]) => (
              <Metric key={k} k={k} v={v} accent={accent} />
            ))}
          </div>
        )}
        {!isArm && (
          <div className="space-y-1 sm:col-span-2">
            {(d.live || []).map(([k, base, unit, jit], i) => {
              const num = typeof base === 'number'
              const v = num ? wobble(tick + i * 3, base, jit ?? 1.5, i + 2) : base
              const pct = num && unit === '%'
              const shownV = num ? (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(1)) : v
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-[88px] shrink-0 font-mono text-[9.5px] uppercase tracking-[0.1em] text-white/40">{k}</span>
                  {pct ? (
                    <span className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <motion.span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: accent, boxShadow: `0 0 10px ${accent}aa` }}
                        animate={{ width: `${Math.max(2, Math.min(100, v))}%` }}
                        transition={{ duration: 0.7, ease: 'linear' }}
                      />
                    </span>
                  ) : (
                    <span className="flex-1" />
                  )}
                  <span className="w-[64px] shrink-0 text-right font-mono text-[10.5px] tabular-nums text-white/80">
                    {shownV}
                    {num && <span className="ml-0.5 text-[9px] text-white/40">{unit}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex flex-col justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
          <p className="text-[9.5px] uppercase tracking-[0.16em] text-white/35">{isArm ? 'TCP 速度' : d.wave}</p>
          <div className="h-[38px]">
            <Sparkline data={speed} accent={accent} h={38} />
          </div>
          <p className="font-mono text-[13px] font-semibold tabular-nums text-white">
            {Math.round(speed[speed.length - 1])}
            <span className="ml-0.5 text-[9.5px] font-normal" style={{ color: accent }}>{isArm ? 'mm/s' : d.unit}</span>
          </p>
        </div>
      </div>

      {/* 中：指令按钮 —— 按钮是作业单元的指令，点它顺手把看板切回臂。
          注意 selectDevice 是「同 id 再点 = 解锁」的 toggle 语义，
          写成 dev !== 'wide' 会在已经聚焦臂的时候把它解锁回全景 */}
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {scene.commands.map((c) => (
          <CmdButton key={c.id} cmd={c} accent={accent} on={cmd.id === c.id} onClick={() => { if (dev !== 'arm' && dev !== 'wide') selectDevice('arm'); fire(c.id) }} />
        ))}
      </div>

      {/* 下：任务队列 + 状态 */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[9.5px] uppercase tracking-[0.16em] text-white/35">任务队列</p>
          <div className="min-h-[62px]">
            <AnimatePresence initial={false}>
              {jobs.length === 0 && (
                <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2 font-mono text-[10px] text-white/25">
                  待机 · 点击上方按钮下发任务
                </motion.p>
              )}
              {jobs.map((x) => (
                <motion.div
                  key={x.k}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 border-b border-white/[0.05] py-[5px] font-mono text-[10px] last:border-0"
                >
                  <span className="text-white/40">{x.code}</span>
                  <span className="min-w-0 flex-1 truncate text-white/75">{x.name}</span>
                  <span style={{ color: x.age > 3 ? '#3EE0A4' : accent }}>{x.age > 3 ? 'DONE' : 'RUN'}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div>
          <p className="mb-1 text-[9.5px] uppercase tracking-[0.16em] text-white/35">回路状态</p>
          <Row name="SERVO 伺服" value="ON" accent={accent} live />
          <Row name="SAFETY 安全" value={poseKey === 'grasp' ? '12 N' : 'OK'} accent="#3EE0A4" live={poseKey === 'grasp'} />
          <Row name="RTT 网络" value={`${Math.round(wobble(tick, 6.4, 1.6, 3))} ms`} accent={accent} />
          <Row name="路点 WP" value={legIndex ? `${legIndex}/3` : '—'} accent={accent} dim={!legIndex} />
        </div>
      </div>

      {/* 底：规格条（跟着选中设备走） */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/[0.07] pt-3 sm:grid-cols-4">
        {(d.specs || scene.specs).map(([k, v]) => (
          <Metric key={k} k={k} v={v} accent={accent} />
        ))}
      </div>
    </Panel>
  )
}
