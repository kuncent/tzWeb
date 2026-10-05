import { heroScenes } from '../../../data/heroScenes'
import { chainLive } from './buildBus'

/* ============================================================
 * 链屏那六块看板的板面 —— 这一块是 DOM 画的，不是 canvas 画的
 * ------------------------------------------------------------
 * 为什么换掉纹理：牌上的字要过三道折损才到眼睛。先烤进一张纹理，再由
 * WebGL 按 canvas 自己的 dpr 贴出来（画质最低档是 0.8 —— 整块画面先被
 * 缩一遍再放大回屏幕），最后还要被 Bloom 那 1.8 的阈值糊一层。DOM 三道
 * 都不吃：浏览器按设备像素排一次版，字就是字，1px 的线就是 1px 的线。
 *
 * 挂法是 drei 的 <Html transform>：它把一块真 DOM 按相机透视摆进 3D 场景，
 * 换算 world = cssPx × distanceFactor / 400。所以 212×134 的板面配 DF=1.59
 * 是 0.842×0.532 米 —— 而这就是牌的全部实体：机箱、压条、牌背后那圈加色光片
 * 都拆了（用户：看板不要背后的 3D 框框、不要后面的色块），“这是一块装在框子里
 * 的屏”这件事整个交给 CSS：切角外框 + 那圈径向暗角就是玻璃的厚度。
 * 实测（tmp/html-probe.mjs）牌心落点与反投影预测对得上，hitTest 也落在板面上（点击归 DOM 管）。
 *
 * 但只有板面交给 DOM。飞行的数据包与空气里那点星尘仍然是 WebGL 的 —— 3D 的东西交给
 * 3D，字交给 DOM。那座转台与贴它台面走的涟漪也拆了（用户：去掉 dais 这层东西），
 * 所以牌外几乎什么都没剩下。牌飞上登台位时这块 DOM 跟着组的 matrixWorld 一起变换，
 * 所以它一路都是真透视，不是贴在镜头上的贴纸。
 *
 * 版式的硬约束：一块牌在屏上也就 173~199 × 108~119 像素（登台放大后 290×181）。
 * 塞进去的东西越多，每件东西越小 —— 糊与挤是同一个病因的两种症状。
 * 所以这里的规矩是：一个主读数、一张图、三行以内的辅助数，其余不做。
 * ============================================================ */

const SCENE = heroScenes[1]
const NODES = SCENE.nodes.length

/* ―― 板面尺寸：CSS 像素。改这里要同步改 DF，否则牌上的字与世界尺寸对不上 ――
   world = cssPx × DF / 400 → 212×1.59/400 = 0.842m，134×1.59/400 = 0.532m。
   DF 从 1.9 降到 1.59（用户：优化一下看板排列使其更舒服自然）：上一版六块牌
   在一条线上要零重叠就得铺满 1440 宽，最左那块直接被切出屏幕。缩一档之后
   实测这条线占 x 112~1329，两端各留 111/112px 呼吸，字靠阵列态扫读、点大了再读 */
export const PW = 212
export const PH = 134
export const DF = 1.59

/* 次色：六块牌一人一个图元色，外壳结构仍然统一 —— 一家人穿同款制服，
   各干各的活。ChainRig 那边还在飞的数据包吃的是同一份里的 pool 那一档 */
export const SUB = {
  ledger: '#FFD79A',
  tps: '#5FD9FF',
  pool: '#FF9D5C',
  contracts: '#6FE3B0',
  consensus: '#B49BFF',
  finality: '#8FC4FF',
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace'
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

/* ---------- 读数：全部由序号推出来 ----------
   随机数看着像噪声，有规律的抖才像仪表。而"同一个 beat 永远同一串"还有一条
   实测教训：切屏重挂会重跑一遍渲染，用 Math.random 的版每次回来都是一副新面孔，
   看着像数据在跳，其实只是组件在重挂 */
const jitter = (i, k = 1) => ((((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1)
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const HEX = '0123456789abcdef'
/* hash 必须逐位"看起来不相关"。HEX[(n*(i+7)*31+i*13)%16] 那种写法在 mod 16 下
   是个陷阱：展开后 i 的系数是 (13−n) mod 16，beat=5 时整串只在两个字符之间交替。
   换成带雪崩的整数混洗 */
const hashOf = (n, len) => {
  let h = (Math.imul(n + 1, 2654435761) ^ 0x9e3779b9) >>> 0
  let s = ''
  for (let i = 0; i < len * 2; i++) {
    h ^= h >>> 15
    h = Math.imul(h, 2246822519) >>> 0
    h ^= h >>> 13
    h = Math.imul(h, 3266489917) >>> 0
    s += HEX[h & 15]
  }
  return s
}
const latOf = (i, beat) => 11 + Math.round(Math.abs(Math.sin(i * 2.3 + beat * 0.61)) * 24 + Math.abs(Math.cos(i * 1.7 + beat * 0.27)) * 9)
/* leader 用墙上时钟而不是"挂载后第几拍"：DOM 那台看板与这六块牌要指同一个 leader */
export const leaderNow = () => Math.floor(Date.now() / 3000) % NODES
/* 只有这里才有的派生读数（块大小 / gas / 分片权重）：DOM 那边没有这些字段，
   由序号现算不存在对不上账的问题 —— 它们要的是"像"，不是"一致" */
const sizeOf = (h) => 178 + Math.round(jitter(h % 97, 5) * 62)
const gasOf = (b) => 7 + jitter(b % 53, 7) * 5
const SHARD = [0.44, 0.33, 0.23]
const ROLES = ['ORDERER', 'SEALER', 'SEALER', 'SEALER', 'SEALER', 'OBSERVER']
/* 提交时延的服务目标：牌上那两个分位数需要一个参照，否则 "45 ms" 只是一个数 */
const SLO_FINALITY = 50

/* ---------- 图元原子 ----------
   每个原子都只吃一个数组与一个颜色，尺寸全部按 flex/百分比给 ——
   板面会被登台放大 2.55×，写死像素的图元在那一刻会散架 */

/** 柱形：值数组 → 一排竖条。条高走 transition，所以数字一跳、柱子长一截，
 *  这是整块牌上最便宜的"活着"的信号 */
function Bars({ vals, color, hi, max: maxProp }) {
  const mx = maxProp || Math.max(1, ...vals) * 1.05
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: '100%' }}>
      {vals.map((v, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            minWidth: 0,
            height: `${Math.max(3, Math.min(100, (v / mx) * 100))}%`,
            background: i === vals.length - 1 ? color : `${color}7a`,
            boxShadow: i === vals.length - 1 && hi ? `0 0 6px ${color}` : 'none',
            borderRadius: 1,
            transition: hi ? `height .55s ${EASE}` : 'none',
          }}
        />
      ))}
    </div>
  )
}

/** 区块链：一排描边方块，块高 = 该块装了多少笔交易。
 *  与 Bars 的分工是「空心 vs 实心」—— 实心柱读的是流量（一个连续量），
 *  描边框读的是区块（离散、一块是一块）。上一版这里画的是区块高度的走势线，
 *  而区块高度每拍 +1，22 个点连出来是一条直线：一块 203px 的牌上摆一条斜线，
 *  既不读数也不像图，牌的中于是大片空。链的屏上该画链上的块 */
function Blocks({ vals, color, hi }) {
  const mx = Math.max(1, ...vals) * 1.06
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: '100%' }}>
      {vals.map((v, i) => {
        const last = i === vals.length - 1
        return (
          <span
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              height: `${Math.max(20, Math.min(100, (v / mx) * 100))}%`,
              boxSizing: 'border-box',
              border: `1px solid ${last ? color : `${color}5c`}`,
              background: last ? `${color}40` : `${color}12`,
              boxShadow: last && hi ? `0 0 8px ${color}` : 'none',
              borderRadius: 1,
              transition: hi ? `height .55s ${EASE}` : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

/** 环形量表：一段弧 = 一个占比。stroke-dasharray 走 transition，值一跳弧就长 */
function Ring({ frac, color, size = 34, label }) {
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${c * Math.min(1, frac)} ${c}`}
          style={{ transition: `stroke-dasharray .6s ${EASE}` }}
        />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 9, color, letterSpacing: 0.2 }}>
        {label}
      </span>
    </div>
  )
}

/** 链路格：账本同步的那一排小格，游标一格一格往前跳（一拍一格）。
 *  不给它 continuous 扫光：一拍 1.5s 的东西扫起来只会读作闪烁 */
function LinkStrip({ n, colors, hot }) {
  return (
    <div style={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 3,
            borderRadius: 1,
            background: i === hot ? '#fff' : colors[i % colors.length],
            opacity: i === hot ? 1 : 0.34,
            boxShadow: i === hot ? '0 0 5px rgba(255,255,255,0.8)' : 'none',
            transition: `opacity .3s ${EASE}`,
          }}
        />
      ))}
    </div>
  )
}

/** 一行键值。label 一律 8.5px 大写，value 吃等宽 + tabular-nums：
 *  数字位数一变就跳排，是运维台最掉价的一件事 */
function KV({ k, v, color, strong }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4, lineHeight: 1.32, minWidth: 0 }}>
      <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.5, color: 'rgba(255,255,255,0.42)', whiteSpace: 'nowrap' }}>{k}</span>
      <span style={{ fontFamily: MONO, fontSize: strong ? 11 : 9.5, color: color || 'rgba(255,255,255,0.82)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
    </div>
  )
}

/** 主读数：一块牌一个，26px。这是隔着两米看这块牌时唯一该被看见的东西 */
function Big({ v, unit, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, minWidth: 0 }}>
      <span style={{ fontFamily: MONO, fontSize: 26, lineHeight: 1, fontWeight: 700, color: '#fff', letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 12px ${color}55` }}>{v}</span>
      {unit && <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.9, color, whiteSpace: 'nowrap' }}>{unit}</span>}
    </div>
  )
}

/** 切角：右上角裁掉一块。与 consoleBits.clipCorner 同一句polygon，
   只是这里的牌在屏幕上只有 203px 宽，切口从 18px 收到 10px ——
   同一个语言，不同的字号 */
const cut = (px = 10) => `polygon(0 0, calc(100% - ${px}px) 0, 100% ${px}px, 100% 100%, 0 100%)`

/* ―― 公共外壳：大屏看板那一套 + 一块玻璃 ――
   版式沿用本站首屏看板的家族语汇（consoleBits.Panel）：切角外框、HUD 角标、
   斜角标题片、细网格底、等宽读数 —— 场景里那六块牌与右下角那台看板必须是一家人。

   玻璃怎么来的：四样叠的，都不是背景模糊。
   ① 本体是半透的冷色（a 0.82~0.93）—— 机房从牌后面透出来一点；
   ② 顶膜：上边 0~24% 一道由亮到无的白，玻璃的上表面吃机房顶灯；
   ③ 一道带硬边的斜反射带（cb-glint 那枚 span）—— 灯管在玻璃上的倒影。
      这一枚单独成元素而不是并进 background，是因为它要能变亮：hover / 选中
      时 opacity 从 0.42 走到 1，读作「光在玻璃上挪了一下」；
   ④ 四道 inset：上边一刀白（表面膜）、左右两道磨边、下边一道次色（脚灯），
      再加一层压在反光之上、文字之下的径向暗角 —— 那圈黑就是玻璃的厚度。
   ⑤ 一块从近侧棱溢出来的背板（THK 那层）—— DOM 平面是零厚度的，这是这几块牌
      “像贴纸”的头一号原因。真玻璃片转一个角度就会露出侧面：近侧那条棱对着
      镜头，背面那层就从它外面溢出几个 px。方向与宽度都由这块牌自己的 yaw / pitch
      算（dx = -sin(θ)·t），所以左端的牌往左溢、右端的往右溢、正对镜头的中间
      那块几乎不溢 —— 六块牌一起就把这条弧的厚度画出来了。登台那块转回正面，
      溢出处自动收成 0，不是两套样式。
      不走真 3D（translateZ）：drei 给这层 DOM 写的 matrix 中间没有 preserve-3d，
      子节点的 translateZ 不在这个 3D 上下文里，拿不到视差，只能白拿一层合成成本。
   为什么不用 backdrop-filter：本站实测过（见 consoleBits 里那段注释），
   看板叠在一块逐帧变的 canvas 上，浏览器就得每帧重算一次高斯模糊 ——
   那是 6fps 的头号成因。而这里要糊的东西是一整间机房。
   牌后面那团外发光也整个不做了：它原本挂在 ChainRig 那块加色光片 mesh 上，而那块
   是没有贴图的纯色矩形 —— 在牌边露出一圈硬边，读起来就是另一个“框框”
   （用户：看板不要后面的色块）。玻璃自己的光就只留在这四层渐变与那道吃
   --glint 的斜反射带里，牌外什么都不叠。 */
/* 板厚（CSS px）：牌宽 212px = 0.842m → 1px ≈ 4mm，26px 就是 10cm 厚的一块玻璃 */
const THK = 26

function Chrome({ board, sub, beat, hot, hi, node, lat, dom, yaw = 0, pitch = 0, children }) {
  /* 溢出量 = t·sin(转角)：yaw 0.22 那一端溢出 5.6px，中间那块 0 —— 与真东西一致 */
  const tx = hot ? 0 : -Math.sin(yaw) * THK
  const ty = hot ? 0 : -Math.sin(pitch) * THK
  return (
    <div style={{ position: 'relative', width: PW, height: PH }}>
      {/* 背板：先画，所以永远在玻璃面之下。它只从近侧棱外溢出那么几 px，
          剩下大部分藏在半透的玻璃后面 —— 那一层透出来的暗反而止对了：
          磨边玻璃后面本来就有个框 */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`,
          clipPath: cut(10),
          background: 'linear-gradient(168deg,rgba(13,23,38,0.96) 0%,rgba(6,11,20,0.97) 46%,rgba(2,5,11,0.98) 100%)',
          boxShadow: `0 14px 30px -14px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 16px ${sub}14`,
        }}
      />
      <div
      className="chain-board"
      data-on={hot ? '1' : '0'}
      {...dom}
      style={{
        '--edge': `${sub}b3`,
        position: 'relative',
        width: PW,
        height: PH,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 6px 4px',
        clipPath: cut(10),
        overflow: 'hidden',
        color: '#fff',
        background: [
          /* 暗角压在反光与网格之上、文字之下（background 永远在 children 下面）：
             一圈黑就是这块玻璃有多厚 */
          'radial-gradient(125% 105% at 50% 46%,rgba(0,0,0,0) 52%,rgba(0,0,0,0.42) 100%)',
          /* 顶膜 */
          'linear-gradient(180deg,rgba(255,255,255,0.17) 0%,rgba(255,255,255,0.055) 11%,rgba(255,255,255,0) 24%)',
          /* 左上角一枚高光斑：球面反射的收口，斜反射带照顾到的那个角 */
          'radial-gradient(150px 70px at 8% -14%,rgba(255,255,255,0.2),rgba(255,255,255,0) 70%)',
          /* 下缘反上来的次色光：磨边玻璃吃脚灯 */
          `linear-gradient(0deg,${sub}2e 0%,${sub}12 6%,${sub}00 15%)`,
          'repeating-linear-gradient(0deg,rgba(255,255,255,0.02) 0 1px,transparent 1px 12px)',
          'repeating-linear-gradient(90deg,rgba(255,255,255,0.02) 0 1px,transparent 1px 12px)',
          /* 本体 */
          'linear-gradient(168deg,rgba(17,31,50,0.82) 0%,rgba(8,15,26,0.88) 50%,rgba(3,9,16,0.93) 100%)',
        ].join(','),
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.34)',
          'inset 1px 0 0 rgba(255,255,255,0.09)',
          `inset -1px 0 0 ${sub}1a`,
          `inset 0 -1px 0 ${sub}47`,
          `inset 0 0 18px ${sub}1a`,
        ].join(','),
        userSelect: 'none',
      }}
    >
      {/* 斜反射带。它是本元素的第一层，后面那些 static 的内容会画在它下面一层
          —— 反光本来就该盖在字上，0.11 的白提不亮什么，只会让那块玻璃像玻璃 */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 'var(--glint, 0.42)',
          transition: `opacity .38s ${EASE}`,
          background: `linear-gradient(112deg,rgba(255,255,255,0) 24%,${sub}12 33%,rgba(255,255,255,0.11) 39%,${sub}0d 46%,rgba(255,255,255,0) 55%)`,
        }}
      />
      {/* 顶边那道 2px：底色是这条轨，亮的一段是游标，一拍往前走一格。
          不做连续扫光 —— 一拍 1.5s 的东西扫起来只会读作闪烁，而离散地跳
          正好把"它在按拍子更新"这件事说清楚了 */}
      <div style={{ position: 'relative', height: 2, margin: '0 -6px', background: `${sub}22`, overflow: 'hidden', flexShrink: 0 }}>
        <span
          key={beat}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '16%',
            left: `${(beat % 6) * 16.67}%`,
            background: sub,
            boxShadow: `0 0 6px ${sub}`,
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 18, flexShrink: 0 }}>
        {/* 斜角小片：大屏看板标题前那一枚，比圆点更像"一个通道的指示灯" */}
        <span style={{ width: 3, height: 9, flexShrink: 0, background: sub, boxShadow: `0 0 6px ${sub}`, transform: 'skewX(-16deg)' }} />
        <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: 1.1, color: '#fff', opacity: 0.94, whiteSpace: 'nowrap' }}>{board.en}</span>
        <span style={{ fontSize: 8.5, letterSpacing: 0.6, color: 'rgba(255,255,255,0.42)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{board.zh}</span>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 7.5, letterSpacing: 0.7, padding: '1px 4px', background: `${sub}24`, clipPath: cut(4), color: hot ? '#fff' : sub, whiteSpace: 'nowrap' }}>{board.status}</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {children}
        {/* 登台那一块才有这两样：扫描带在阵列里只会糊成噪线，放大到 290px 宽才读得出
            是一条高光在玻璃面上走；跑马灯同理 —— 一块牌上最多八个字在跑 */}
        {hot && hi && <span className="cb-sweep" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 14, pointerEvents: 'none', background: `linear-gradient(180deg,transparent,${sub}2e,transparent)` }} />}
        {hot && hi && (
          <span style={{ position: 'absolute', left: 0, bottom: 15, right: 0, height: 10, overflow: 'hidden', pointerEvents: 'none', maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)' }}>
            <span className="cb-marquee" style={{ position: 'absolute', whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: `${sub}cc` }}>
              {`◆ ${board.en} · ${board.zh} · NODE ${SCENE.nodes[leaderNow()]} LEADING · HEIGHT ${fmt(chainLive.height)} · TX ${fmt(chainLive.tx)} · TPS ${fmt(chainLive.tps)} · CONTRACTS ${chainLive.contracts} · `}
            </span>
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 13, flexShrink: 0 }}>
        <span style={{ width: 2, height: 7, background: sub, opacity: 0.8, flexShrink: 0 }} />
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 0.4, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node} · {lat} ms
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <LinkStrip n={6} colors={[sub, '#5FD9FF', '#B49BFF']} hot={beat % 6} />
        </span>
      </div>

      {/* HUD 三角角标：左上、左下、右下三枚（右上被切口裁掉了，所以不给）。
          与 consoleBits.Panel 同一套摆法 —— 大屏看板的"框"就是这么读的 */}
      {[[2, 'lt'], [PH - 7, 'lb'], [PW - 7, 'rb']].map(([pos, k]) => (
        <span
          key={k}
          style={{
            position: 'absolute',
            width: 6,
            height: 6,
            pointerEvents: 'none',
            borderColor: `${sub}88`,
            top: k === 'lt' ? 4 : PH - 10,
            [k === 'rb' ? 'right' : 'left']: 3,
            borderLeft: k === 'rb' ? 'none' : '1px solid',
            borderTop: k === 'lt' ? '1px solid' : 'none',
            borderBottom: k === 'lt' ? 'none' : '1px solid',
          }}
        />
      ))}
      </div>
    </div>
  )
}

/* 冷启动时历史数组还是空的：给一段递增的斜坡顶上，不然第一拍那些图元
   是零高度的一条线，看着像坏了。斜坡末端的值就是当前读数 */
const ramp = (arr, n = 20, step = 1) =>
  arr.length > 3 ? arr : Array.from({ length: n }, (_, i) => Math.max(0, (arr[arr.length - 1] || 1) - (n - 1 - i) * step))

/* ---------- 六块牌面 ----------
   每块牌一个主读数、一张图、三行以内的辅助数。多一件少一件都试过，
   少一件是可惜，多一件是糊 */

function Ledger({ beat, hi }) {
  const h = chainLive.height
  /* 每块的笔数：14 块窗口。最新那块高亮 —— 大屏上“刚出的一块”必须一眼找得到 */
  const blk = Array.from({ length: 14 }, (_, i) => 8 + Math.round(jitter(((h - 13 + i) % 97) + 1, 3) * 26))
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
        <Big v={fmt(h)} unit="BLOCKS" color={SUB.ledger} />
        <Ring frac={Math.min(1, (h % 5) / 4 + 0.25)} color={SUB.ledger} size={30} label={`${sizeOf(h)}B`} />
      </div>
      <div style={{ flex: 1, minHeight: 26 }}>
        <Blocks vals={blk} color={SUB.ledger} hi={hi} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
        <KV k="TX TOTAL" v={fmt(chainLive.tx)} />
        <KV k="SHARD" v={`A ${Math.round(SHARD[0] * 100)}%`} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.5, color: 'rgba(255,255,255,0.42)' }}>LATEST</span>
        {/* 哈希跟着 chainLive 里那个真实高度走：DOM 报哪个块，牌上就印哪个块的指纹 */}
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: `${SUB.ledger}dd`, whiteSpace: 'nowrap' }}>0x{hashOf(h, 5)}…</span>
      </div>
    </>
  )
}

function Tps({ beat, hi }) {
  const hist = ramp(chainLive.tpsHist, 22, 40)
  const peak = Math.max(...hist)
  const avg = hist.reduce((a, b) => a + b, 0) / hist.length
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Big v={fmt(chainLive.tps)} unit="TX/S" color={SUB.tps} />
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.4, color: 'rgba(255,255,255,0.36)' }}>60 S WINDOW</span>
      </div>
      <div style={{ flex: 1, minHeight: 30 }}>
        <Bars vals={hist} color={SUB.tps} hi={hi} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <KV k="PEAK" v={fmt(peak)} />
        <KV k="AVG" v={fmt(avg)} />
        {/* gas 单独占一格：上一版它与 "60 S WINDOW" 同锚一个右边界，两行字叠成
            "GAS 9.51GWEI" 那样一串 */}
        <KV k="GAS" v={`${gasOf(beat).toFixed(1)}`} color={SUB.tps} />
      </div>
    </>
  )
}

function Pool({ beat }) {
  const pool = chainLive.pool
  const packed = chainLive.lastPack
  /* 出块会把池清空，而“清空”这件事本身也得有个落点：刚被打包掉的那一批
     以残影留在容量条上（虚边、压暗），这块牌于是永远有话可说 */
  const ghosts = pool.length ? [] : packed ? packed.items : []
  const rows = (pool.length ? pool : ghosts).slice(0, 2)
  const live = pool.length > 0
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Big v={pool.length} unit={live ? 'PENDING' : 'IDLE'} color={SUB.pool} />
        {/* 右上角那一格说的是“容量条上现在亮着的是谁”：真单子、刚被打包掉的
            残影，还是什么都没有。牌上就这么点地方，一句话得同时交代三态 */}
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.36)', whiteSpace: 'nowrap' }}>
          {live ? 'MAX 5' : packed ? `PACKED #${packed.h}` : 'AWAITING'}
        </span>
      </div>
      {/* 容量条：内存池就是一个只有五个位的容器，那就把它画成容器。
          空池是这块牌的常态（出块即清），常态不该读成半张白 */}
      <div style={{ display: 'flex', gap: 2, height: 13, flexShrink: 0 }}>
        {Array.from({ length: 5 }, (_, i) => {
          const on = i < pool.length
          const ghost = !on && i < ghosts.length
          return (
            <span
              key={i}
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 2,
                border: `1px solid ${on ? SUB.pool : ghost ? `${SUB.pool}52` : 'rgba(255,255,255,0.12)'}`,
                background: on ? `${SUB.pool}5c` : ghost ? `${SUB.pool}14` : 'transparent',
                boxShadow: on ? `0 0 7px ${SUB.pool}59, inset 0 1px 0 rgba(255,255,255,0.2)` : 'none',
                transition: `background .4s ${EASE}, border-color .4s ${EASE}`,
              }}
            />
          )
        })}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 2 }}>
        {rows.map((p, i) => (
          <div key={`${p.k}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, opacity: live ? 1 : 0.44 }}>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: live ? SUB.pool : 'transparent', border: `1px solid ${live ? SUB.pool : `${SUB.pool}88`}`, boxShadow: live ? `0 0 4px ${SUB.pool}` : 'none', flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 8.5, color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 7.5, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{fmt((p.k % 900 + 120) * 430)}</span>
          </div>
        ))}
        {!rows.length && (
          <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 0.4, color: 'rgba(255,255,255,0.26)' }}>出块即清 · 等待下一笔</div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
        <KV k="NEXT BLOCK" v={`#${chainLive.height + 1}`} />
        <KV k="QUEUED" v={`${(pool.length * 1.4 + 0.2).toFixed(1)} KB`} color={SUB.pool} />
      </div>
    </>
  )
}

function Contracts({ beat, hi }) {
  const c = chainLive.contracts
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
        <Big v={c} unit="DEPLOYED" color={SUB.contracts} />
        <Ring frac={Math.min(1, c / 60)} color={SUB.contracts} size={30} label={`${Math.round((c / 60) * 100)}%`} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 1 }}>
        {['SHARD A', 'SHARD B', 'SHARD C'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 34, fontFamily: MONO, fontSize: 7.5, letterSpacing: 0.4, color: 'rgba(255,255,255,0.4)' }}>{s}</span>
            <span style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${SHARD[i] * 100}%`, background: i === 0 ? SUB.contracts : `${SUB.contracts}7f`, transition: `width .6s ${EASE}` }} />
            </span>
            <span style={{ width: 22, textAlign: 'right', fontFamily: MONO, fontSize: 8.5, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(c * SHARD[i])}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.32)', letterSpacing: 0.5 }}>LATEST BYTECODE</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: `${SUB.contracts}e6`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>0x{hashOf(c, 6)}…</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
        <KV k="ABI" v="ERC20" />
        <KV k="GAS USED" v={fmt(21 + jitter(beat, 9) * 9)} />
      </div>
    </>
  )
}

function Consensus({ beat, hi, leader }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Big v={NODES} unit="NODES · RAFT" color={SUB.consensus} />
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8.5, color: 'rgba(255,255,255,0.36)' }}>LEADER {SCENE.nodes[leader]}</span>
      </div>
      {/* 六个节点一人一格：格里的条是它的投票进度，leader 那格整条点亮 */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridAutoRows: '1fr', gap: 3 }}>
        {SCENE.nodes.map((n, i) => {
          const on = i === leader
          const frac = on ? 1 : 0.42 + jitter(i * 3 + beat, 2) * 0.5
          return (
            <div key={n} style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2px 3px', borderRadius: 2, background: on ? `${SUB.consensus}1f` : 'rgba(255,255,255,0.035)', border: `1px solid ${on ? `${SUB.consensus}66` : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden', transition: `background .4s ${EASE}` }}>
              <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 0.3, color: on ? '#fff' : 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{n}</span>
              <span style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: 0.3, color: on ? SUB.consensus : 'rgba(255,255,255,0.26)', whiteSpace: 'nowrap' }}>{ROLES[i]}</span>
              <span style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: `${frac * 100}%`, background: on ? SUB.consensus : `${SUB.consensus}66`, transition: `width .6s ${EASE}` }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
        <KV k="QUORUM" v={`${Math.ceil(NODES / 2) + 1}/${NODES}`} color={SUB.consensus} strong />
        <KV k="TERM" v={12 + (beat % 7)} />
      </div>
    </>
  )
}

function Finality({ beat, hi }) {
  /* 取整！chainLive.lat 是 useSeries 直出来的浮点串，不 round 的话主读数会
     印成 "37.7760047747797" 十七位 —— 一块 185px 宽的牌上那串字比牌还长，
     整块牌直接拍碎。仪表不报小数点后八位 */
  const raw = (chainLive.lat.length > 3 ? chainLive.lat : Array.from({ length: 18 }, (_, i) => latOf(i, beat))).map((v) => Math.round(v))
  /* 分位数要排序，图元不能排：上一版把排完序的数组直接丢给 Bars，画出来是一坡
     单调上升的楼梯 —— 那不是时延走势，那是把数据排好序给人看。走势吃时间序，
     分位数吃排序序，两者本来就不是一个东西 */
  const s = raw.slice().sort((a, b) => a - b)
  const p50 = s[Math.floor(s.length * 0.5)]
  const p95 = s[Math.floor(s.length * 0.95)] ?? s[s.length - 1]
  /* p99 不能与 p95 同出一格：18 个样本时 floor(18*0.95)=17 就是最后一个元素，
     两格读数一模一样，看着像这块牌算坏了。分位数在这么短的窗里本来就不显著，
     所以 p99 取最大值再按拍子补一点尾巴，至少保证单调 */
  const p99 = Math.max(p95 + 3, s[s.length - 1] + Math.round(2 + jitter(beat, 11) * 4))
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Big v={p50} unit="MS P50" color={SUB.finality} />
        {/* 右上角不重复标题（上一版这里又写了一遍“提交时延”，读作一个没洗掉的
            水印）。大屏上这一块地方天生该放 SLO：有它，那两个分位数才有意义 */}
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8, letterSpacing: 0.4, color: p99 <= SLO_FINALITY ? '#6FE3B0' : SUB.pool, whiteSpace: 'nowrap' }}>
          SLO ≤ {SLO_FINALITY} MS
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 30 }}>
        <Bars vals={raw} color={SUB.finality} hi={hi} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
        <KV k="P95" v={`${p95} ms`} />
        <KV k="P99" v={`${p99} ms`} color={SUB.finality} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
        <KV k="BLOCKS" v={fmt(chainLive.height)} />
        <KV k="REORG" v="0" />
      </div>
    </>
  )
}

const BODY = { ledger: Ledger, tps: Tps, pool: Pool, contracts: Contracts, consensus: Consensus, finality: Finality }

/** 一块牌：外壳 + 对应那块板心。
    ChainRig 只负责把它挂到哪个组、多大、什么时候淡出，这里只管板面。
    dom 是 ChainRig 递下来的一组 DOM 事件（hover / 点击 / 8px 拖拽门控）——
    板面是真 DOM，事件就落在它身上，不走 R3F 那套射线拾取 */
export default function ChainBoard({ board, index, beat, leader, hot, hi, dom, yaw, pitch }) {
  const Body = BODY[board.id] || Ledger
  const sub = SUB[board.id] || SCENE.accent
  return (
    <Chrome board={board} sub={sub} beat={beat} hot={hot} hi={hi} dom={dom} yaw={yaw} pitch={pitch} node={SCENE.nodes[index % NODES]} lat={latOf(index, beat)}>
      <Body beat={beat} leader={leader} hi={hi} />
    </Chrome>
  )
}

