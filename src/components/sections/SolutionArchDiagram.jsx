import { useId } from 'react'

/* ============================================================
 * 方案架构图 —— 纯 SVG 自建，随方案数据参数化（浅色版）
 * ------------------------------------------------------------
 * 文档里「五、架构图」只有标题、没有内容。这里把它补成一张真能读懂
 * 的体系图，而不是贴一张装饰性流程截图。为什么用整张 SVG 而不是
 * 「HTML 卡片 + SVG 连线」两层拼：连线必须精确穿过每一层节点的圆心，
 * 一旦节点用 HTML 排版，它的实测中心就随字号/字重/换行漂移，靠肉眼
 * 对不齐（这是本项目踩过无数次的坑）。整张图落在同一套 viewBox 坐标
 * 里，坐标一次算死，线就一定穿得上。
 *
 * 四大方案的结构恰好同构，所以骨架固定、内容随 props 换：
 *   左轨 = 四位一体主线（mainline，4 段）
 *   中轴 = 课程四层（layers，基础→核心→进阶→综合，自下而上）
 *   右轨 = 实践教学四阶（practice，实验→实训→竞赛→科研）
 *   顶部 = 培养目标（positioning）；底部 = 实训空间（labs）
 * 浅色口径：白底节点 + 墨色文字 + 品牌蓝连线，图版底给浅灰衬托白卡。
 * 高亮跟随 hovered 层；减弱动效由全局 CSS 把 arch-flow 停成静帧。
 * ============================================================ */

// 画布与栅格坐标：一次算死，全部节点/连线都在这套坐标里
const W = 1000
const H = 648
const CX_MID = 470 // 中轴（课程层）列心
const CX_LEFT = 138 // 左轨（主线）列心
const CX_RIGHT = 802 // 右轨（实践阶）列心
const ROW_H = 96 // 行距
const ROW_TOP = 210 // 最上一行（综合创新层）的 y 中心
const CAP_Y = 44 // 培养目标条 y
const CAP_H = 52
const NODE_H = 66
const MID_W = 244
const SIDE_W = 196

export default function SolutionArchDiagram({ plan, hovered }) {
  const uid = useId().replace(/:/g, '')
  const litKey = hovered

  // 统一行 y：layers[0]=基础 放最下，最后一层放最上（自下而上的能力递进）
  const rowY = (idx) => ROW_TOP + (plan.layers.length - 1 - idx) * ROW_H

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${plan.name} · 实验教学体系架构图`}
      >
        <defs>
          <linearGradient id={`cap-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0e5fd8" />
            <stop offset="1" stopColor="#1677ff" />
          </linearGradient>
          <linearGradient id={`mid-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(22,119,255,0.10)" />
            <stop offset="1" stopColor="rgba(22,119,255,0.04)" />
          </linearGradient>
        </defs>

        {/* ―― 中轴竖梁：贯穿四层，光从底层一路汇到培养目标 ―― */}
        <line x1={CX_MID} y1={rowY(0)} x2={CX_MID} y2={CAP_Y + CAP_H} stroke="#1677ff" strokeOpacity="0.16" strokeWidth="2" />
        <line
          x1={CX_MID}
          y1={rowY(0)}
          x2={CX_MID}
          y2={CAP_Y + CAP_H}
          stroke="#1677ff"
          strokeWidth="2"
          strokeDasharray="12 48"
          className="arch-flow"
          style={{ '--flow': 60 }}
        />

        {/* ―― 顶部：培养目标条 ―― */}
        <g>
          <rect x={CX_MID - MID_W / 2} y={CAP_Y} width={MID_W} height={CAP_H} rx={12} fill={`url(#cap-${uid})`} />
          <text x={CX_MID} y={CAP_Y + 21} textAnchor="middle" className="fill-white/75" style={{ font: '600 11px ui-sans-serif, system-ui' }}>
            培养目标 · TARGET
          </text>
          <text x={CX_MID} y={CAP_Y + 40} textAnchor="middle" className="fill-white" style={{ font: '700 16px ui-sans-serif, system-ui', letterSpacing: '-0.01em' }}>
            {plan.positioning}
          </text>
        </g>

        {/* ―― 四层课程行：左主线 / 中课程层 / 右实践阶，同行用流动光线串起来 ―― */}
        {plan.layers.map((ly, i) => {
          const y = rowY(i)
          const cy = y
          const ml = plan.mainline[i]
          const pr = plan.practice[i]
          const lit = litKey === ly.key
          const lineTop = cy - NODE_H / 2
          const segs = [
            { x1: CX_LEFT + SIDE_W / 2, x2: CX_MID - MID_W / 2 },
            { x1: CX_MID + MID_W / 2, x2: CX_RIGHT - SIDE_W / 2 },
          ]
          return (
            <g key={ly.key}>
              {/* 横向连线（打底 + 流动） */}
              {segs.map((s, k) => {
                const per = 10 + 34
                return (
                  <g key={k}>
                    <line x1={s.x1} y1={cy} x2={s.x2} y2={cy} stroke="#8b98a9" strokeOpacity={lit ? 0.5 : 0.3} strokeWidth="1.5" />
                    <line
                      x1={s.x1}
                      y1={cy}
                      x2={s.x2}
                      y2={cy}
                      stroke="#1677ff"
                      strokeOpacity={lit ? 1 : 0.7}
                      strokeWidth="2"
                      strokeDasharray="10 34"
                      className="arch-flow"
                      style={{ '--flow': per }}
                    />
                    <path
                      d={`M${s.x2 - 7} ${cy - 4} L${s.x2} ${cy} L${s.x2 - 7} ${cy + 4}`}
                      fill="none"
                      stroke="#1677ff"
                      strokeOpacity={lit ? 1 : 0.7}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )
              })}

              {/* 左：主线段节点 */}
              <SideNode cx={CX_LEFT} cy={cy} title={ml} kicker={`主线 ${String(i + 1).padStart(2, '0')}`} align="center" lit={lit} width={SIDE_W} />

              {/* 中：课程层节点 */}
              <g>
                <rect
                  x={CX_MID - MID_W / 2}
                  y={lineTop}
                  width={MID_W}
                  height={NODE_H}
                  rx={14}
                  fill={lit ? `url(#mid-${uid})` : '#ffffff'}
                  stroke={lit ? '#1677ff' : 'rgba(11,18,32,0.10)'}
                  strokeWidth={lit ? 1.6 : 1}
                />
                <text x={CX_MID - MID_W / 2 + 18} y={cy - 6} className="fill-ink-900" style={{ font: '700 15.5px ui-sans-serif, system-ui', letterSpacing: '-0.01em' }}>
                  {ly.name}
                </text>
                <text x={CX_MID - MID_W / 2 + 18} y={cy + 16} className="fill-ink-400" style={{ font: '500 11px ui-sans-serif, system-ui', letterSpacing: '0.06em' }}>
                  {ly.en}
                </text>
                <text x={CX_MID + MID_W / 2 - 18} y={cy - 4} textAnchor="end" className={lit ? 'fill-brand' : 'fill-ink-700'} style={{ font: '700 18px ui-sans-serif, system-ui' }}>
                  {ly.modules.length}
                </text>
                <text x={CX_MID + MID_W / 2 - 18} y={cy + 15} textAnchor="end" className="fill-ink-400" style={{ font: '500 10.5px ui-sans-serif, system-ui' }}>
                  课程模块
                </text>
                <circle cx={CX_MID} cy={cy} r={4} fill={lit ? '#1677ff' : '#8b98a9'} className="transition-all duration-300" />
              </g>

              {/* 右：实践阶节点 */}
              <SideNode cx={CX_RIGHT} cy={cy} title={pr.stage} kicker={pr.en} sub={pr.systems.slice(0, 2).join(' · ')} align="start" lit={lit} width={SIDE_W} />
            </g>
          )
        })}

        {/* ―― 底部：实训空间 ―― */}
        <g>
          {plan.labs.map((lb, i) => {
            const bw = (W - 80 - 2 * 16) / 3
            const x = 40 + i * (bw + 16)
            return (
              <g key={lb.name}>
                <rect x={x} y={H - 78} width={bw} height={58} rx={12} fill="#ffffff" stroke="rgba(11,18,32,0.09)" />
                <circle cx={x + 20} cy={H - 78 + 29} r={5} fill="#1677ff" />
                <text x={x + 36} y={H - 78 + 25} className="fill-ink-900" style={{ font: '600 12.5px ui-sans-serif, system-ui' }}>
                  {truncate(lb.name, 12)}
                </text>
                <text x={x + 36} y={H - 78 + 42} className="fill-ink-400" style={{ font: '500 11px ui-sans-serif, system-ui' }}>
                  实训空间 {String(i + 1).padStart(2, '0')}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-400">
        {plan.en} · EXPERIMENTAL TEACHING ARCHITECTURE
      </p>
    </div>
  )
}

/* 左右两侧的辅助节点：主线段 / 实践阶。白底 + 墨字，lit 时转品牌蓝。 */
function SideNode({ cx, cy, title, kicker, sub, align = 'center', lit, width }) {
  const x = cx - width / 2
  const top = cy - NODE_H / 2
  const tx = align === 'start' ? x + 18 : cx
  const anchor = align === 'start' ? 'start' : 'middle'
  return (
    <g className="transition-opacity duration-300" opacity={lit ? 1 : 0.92}>
      <rect
        x={x}
        y={top}
        width={width}
        height={NODE_H}
        rx={12}
        fill={lit ? 'rgba(22,119,255,0.06)' : '#ffffff'}
        stroke={lit ? 'rgba(22,119,255,0.5)' : 'rgba(11,18,32,0.09)'}
        strokeWidth="1"
      />
      <text x={tx} y={cy - 8} textAnchor={anchor} className="fill-ink-400" style={{ font: '600 9.5px ui-sans-serif, system-ui', letterSpacing: '0.14em' }}>
        {kicker}
      </text>
      <text x={tx} y={cy + 10} textAnchor={anchor} className="fill-ink-900" style={{ font: '700 13.5px ui-sans-serif, system-ui' }}>
        {title}
      </text>
      {sub && (
        <text x={tx} y={cy + 26} textAnchor={anchor} className="fill-ink-500" style={{ font: '500 10px ui-sans-serif, system-ui' }}>
          {truncate(sub, 20)}
        </text>
      )}
    </g>
  )
}

/* SVG <text> 不会自动换行，装饰性长串按宽度粗略截断，避免溢出到相邻节点 */
function truncate(s, max) {
  const str = String(s)
  return str.length > max ? str.slice(0, max) + '…' : str
}
