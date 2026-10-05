import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Panel, CmdButton, Metric, Bars, Row, Led, wobble, useSeries, useTick } from './consoleBits'
import { chainLive } from '../three/hero/buildBus'

/* 区块链屏看板 = 一条真链的运维台。
   看板与 3D 环链吃同一个事件：点「发起交易」这里多一行内存池、那边就多一个
   沿环飞的数据包；点「立即出块」内存池清空、区块高度 +1、链真的长出一节。
   数字必须来自状态机，不能是三个各自跳的假表 —— 一眼假。 */

const HEX = '0123456789abcdef'
const hashOf = (n, len = 4) => Array.from({ length: len * 2 }, (_, i) => HEX[(n * (i + 7) * 31 + i * 13) % 16]).join('')
const short = (n) => `0x${hashOf(n, 3)}…${hashOf(n + 5, 2)}`
/* 入池写成幂等的：StrictMode 下 effect 会跑两遍，同一个 cmd.n 推两次
   就会得到两行同 key 的内存池（真 Chrome 实测报 duplicate key）。
   同一个指令只算一笔交易。 */
const pushPool = (pool, entry) => (pool.some((p) => p.k === entry.k) ? pool : [entry, ...pool].slice(0, 5))

export default function ChainConsole({ scene, cmd, fire, quiet = false }) {
  const accent = scene.accent
  const tick = useTick(1000)

  const [chain, setChain] = useState({ height: 29, tx: 134, contracts: 33, pool: [] })
  /* 指令落到链上：这一步是整个看板的真相来源 */
  useEffect(() => {
    if (!cmd.n) return
    setChain((c) => {
      const base = { ...c, pool: [...c.pool] }
      if (cmd.id === 'tx') return { ...base, pool: pushPool(base.pool, { k: cmd.n, name: `${short(cmd.n)} 转账` }) }
      if (cmd.id === 'contract') return { ...base, contracts: c.contracts + 1, pool: pushPool(base.pool, { k: cmd.n, name: `${short(cmd.n)} 部署 ERC20` }) }
      if (cmd.id === 'bridge') return { ...base, pool: pushPool(base.pool, { k: cmd.n, name: `侧链头 #${(1840 + cmd.n) % 2000} 同步` }) }
      if (cmd.id === 'block') return { ...base, height: c.height + 1, tx: c.tx + Math.max(1, c.pool.length), pool: [] }
      return c
    })
  }, [cmd.n, cmd.id])

  /* 空转时链也在走：每 6 拍自动出一个块，才像一条在跑的链 */
  useEffect(() => {
    if (tick === 0 || tick % 6 !== 0) return
    setChain((c) => ({ ...c, height: c.height + 1, tx: c.tx + (c.pool.length || 1), pool: c.pool.length ? [] : c.pool }))
  }, [tick])

  /* 共识轮值：6 节点每 3 秒换一个 leader。这里必须用墙上时钟而不是“挂载后第几拍”：
     3D 那六块节点铭牌画的是同一个 leader，两边各自从自己的 0 点起算就会出现
     “DOM 说 PEER-CTL 是 leader，场景里亮的是 PEER-TECH”——穿帮就在这一类地方 */
  const leader = Math.floor(Date.now() / 3000) % scene.nodes.length
  const lat = useSeries({ base: 38, amp: 9, seed: 4, n: 18, period: 1000, spike: cmd.id === 'block' ? cmd.n : 0, gain: 3.4 })
  const tps = useMemo(() => Math.max(0, Math.round(wobble(tick, 146, 38, 2) + (chain.pool.length ? chain.pool.length * 22 : 0))), [tick, chain.pool.length])

  /* ―― 把这一拍交给场景里那六块看板（见 buildBus.chainLive）――
     写在渲染体里而不是 effect：全是幂等赋值，StrictMode 双跑一次也只是把同一个值写两遍；
     而 history 那种 push 必须进 effect，不然一次渲染推一格，牌上的柱会跑得比数字快。
     quiet：移动/平板那一份不发布 —— 桌面那份才是与 WebGL 同屏的那一个，
     两份都活在 DOM 里（lg:hidden 只是不显示），都写就把同一个数字写出两个值 */
  if (!quiet) {
    chainLive.height = chain.height
    chainLive.tx = chain.tx
    chainLive.tps = tps
    chainLive.contracts = chain.contracts
    chainLive.pool = chain.pool
    chainLive.lat = lat
  }
  const last = useRef({ h: -1, t: -1, p: [] })
  useEffect(() => {
    if (quiet) return
    /* 只在真的走了一拍时入历史：同一个 tick 被重渲染带过两次不能记两遍 */
    const moved = last.current.h !== chain.height || last.current.t !== tps
    /* 出块会把内存池清空，而"清空"这件事本身也得有个落点：场景里那块 TX POOL 牌
       常态就是 0 PENDING（出块即清），不给它留一份刚被打包掉的单子，它就是一块死牌。
       压暗留在牌上 + 标一行 PACKED IN #h，这块牌于是永远有话可说 */
    if (moved && last.current.p.length && chain.pool.length === 0) {
      chainLive.lastPack = { h: chain.height, items: last.current.p }
    }
    if (moved) {
      last.current = { h: chain.height, t: tps, p: [...chain.pool] }
      chainLive.heightHist = [...chainLive.heightHist, chain.height].slice(-24)
      chainLive.tpsHist = [...chainLive.tpsHist, tps].slice(-24)
    }
  }, [chain.height, tps, quiet])

  return (
    <Panel
      title="CHAIN METRICS"
      code="ECO CHAIN · RAFT"
      accent={accent}
      right={
        <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: accent }}>
          <Led accent={accent} /> BLOCKING
        </span>
      }
    >
      {/* 上：四个核心读数 */}
      <div className="grid grid-cols-4 gap-3">
        <Metric k="区块高度" v={chain.height} accent={accent} />
        <Metric k="TPS" v={tps} accent={accent} />
        <Metric k="内存池" v={chain.pool.length} unit="tx" accent={accent} />
        <Metric k="合约" v={chain.contracts} unit="份" accent={accent} />
      </div>

      {/* 中：指令按钮 */}
      <div className="mt-3.5 grid gap-1.5 sm:grid-cols-2">
        {scene.commands.map((c) => (
          <CmdButton key={c.id} cmd={c} accent={accent} on={cmd.id === c.id} onClick={() => fire(c.id)} />
        ))}
      </div>

      <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
        {/* 左：共识节点轮值 */}
        <div>
          <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.16em] text-white/35">共识节点 · {scene.nodes.length} 个</p>
          <div className="grid grid-cols-3 gap-1.5">
            {scene.nodes.map((n, i) => {
              const on = i === leader
              return (
                <motion.div
                  key={n}
                  animate={{ borderColor: on ? `${accent}99` : 'rgba(255,255,255,0.08)', background: on ? `${accent}1f` : 'rgba(255,255,255,0.02)' }}
                  className="relative overflow-hidden rounded-md border px-1.5 py-1.5"
                >
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-white/45">{n}</p>
                  <p className="mt-0.5 font-mono text-[10px] tabular-nums" style={{ color: on ? accent : 'rgba(255,255,255,0.6)' }}>
                    {on ? 'LEADER' : 'OK'}
                  </p>
                  {on && (
                    <motion.span
                      key={tick}
                      initial={{ opacity: 0.55, scaleX: 0 }}
                      animate={{ opacity: 0, scaleX: 1 }}
                      transition={{ duration: 1.1 }}
                      className="absolute inset-x-0 bottom-0 h-[2px] origin-left"
                      style={{ background: accent }}
                    />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* 右：内存池 + 出块时延 */}
        <div>
          <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.16em] text-white/35">内存池 · 待打包</p>
          <div className="min-h-[68px]">
            <AnimatePresence initial={false} mode="popLayout">
              {chain.pool.length === 0 && (
                <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2 font-mono text-[10px] text-white/25">
                  空池 · 等待交易进来
                </motion.p>
              )}
              {chain.pool.map((p) => (
                <motion.div
                  key={p.k}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="border-b border-white/[0.05] py-[5px] font-mono text-[10px] text-white/70 last:border-0"
                >
                  <span className="truncate">{p.name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <p className="mb-1 mt-2 text-[9.5px] uppercase tracking-[0.16em] text-white/35">出块时延</p>
          <Bars data={lat} accent={accent} h={30} />
        </div>
      </div>

      {/* 底：规格 + 累计 */}
      <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/[0.07] pt-3 sm:grid-cols-4">
        {scene.specs.map(([k, v]) => (
          <Metric key={k} k={k} v={v} accent={accent} />
        ))}
      </div>
      <Row name="链上累计交易" value={`${chain.tx} 笔`} accent={accent} live />
    </Panel>
  )
}
