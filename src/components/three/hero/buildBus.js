/* ============================================================
 * 装配工序总线：3D 布景的「搭建时钟」→ DOM 进度条
 * ------------------------------------------------------------
 * 具身首屏的动画是一段装配序列（场地供电 → … → 人形联调）。
 * 时钟跑在 WebGL 的 useFrame 里（每帧推进，不能进 React state），
 * 而工序进度条是 DOM。两头要指同一道工序，又不能把每帧的 stage
 * 塞进 state（那会把整块看板拖成 60 次/秒重渲染）。
 *
 * 所以这里做一个最小的发布订阅：rig 每帧写 stage，只在「跨道工序」
 * 时才通知；DOM 用 useSyncExternalStore 订阅，一道工序只重渲一次。
 * stage = -1 表示具身屏不在场，进度条整体隐藏。
 * ============================================================ */

let stage = -1
const subs = new Set()

/* 装配时钟的逐帧值：相机与视频墙都要读，但它们是每帧读、不需要通知 ——
   走可变对象而不是订阅，避免每帧触发 React。stage 才走订阅（一道工序一次）
   ff = 快进倍率，见 skipBuild() */
export const buildClock = { t: 0, active: false, ff: 1 }

/* ―― 片头快进：用户一开始动，就把剩下的工序走完 ――
   为什么不是「立即跳到终态」：buildClock.t 是相机轨道、工序号、指令门控、
   地台字标浮现共同的自变量，一步跳到终点 = 整机瞬移 + 镜头硬切，比慢慢演
   还廉价。抬倍率到 3.2x 读作「快进」，不到 1s 落定，中途每一道还是演过的。
   为什么值得做：整段片头 4.4s，而真人平均 2~3s 就开始滚 —— 不给他一个出口，
   他就是「没看完」而不是「看完了」。滚 = 不想看片头 = 想看正片，那就直接给他终态。
   置位了就不回落：一场访问只演一次片头，滚回具身屏时别再来一遍 */
export function skipBuild(rate = 3.2) {
  if (buildClock.ff > 1) return
  buildClock.ff = rate
}

/* 片头是否已被跳过：DOM 那边拿它决定还要不要提「滚动可跳过」 */
export const buildSkipped = () => buildClock.ff > 1

/* ―― 首屏就绪信号：给启动遮罩收口用 ――
   遮罩要盖的是「页面已经出来、首屏动画还没得演」那一段。React 画完文案只是
   第一帧：3D 舞台是等浏览器空闲才挂（见 StoryHero 那段归因），three 的 chunk 还要一跳
   网络。界放在「舞台真的在画且帧距回到正常」（HeroStage 的 StageReady）：
   不等模型 —— GLB 那一跳是用户看不见的下载，为它多盖一秒不划算；但也不比
   第三帧更早 —— 第一帧的 render 里藏着着色器编译那次 ~1.2s 长任务，在那儿收
   遮罩等于把一帧冻住的画面递给人。

   六条放行路径，缺一条就会把人锁在门外：
     stage    舞台画出第三帧（正常路径）
     nostage  这台设备根本不挂 3D（无 WebGL / 减弱动效 / 窄屏）
     inner    当前路由是内页，这一屏没有布景要等（见 App 的 BootHandoff）
     dead     舞台渲染出错进了错误边界
     user     用户在遮罩上还等着就先动了（他不想等）
     nav      带 hash 直达的落点到了（他没落在首屏，那台布景连 GLB 都不会去取）
     timeout  main.jsx 的兜底定时器（上面几条全哑）
   置位后不回落，也不取消订阅者：遮罩只摘一次 */
let ready = null
const rsubs = new Set()

export function markHeroReady(reason) {
  if (ready) return
  ready = reason
  /* 把是哪条出口放行的挂在窗上：tmp/boot-verify.mjs 要拿它分“正常路径”
     与“兜底路径”，这两者在日志里长得一模一样，不记下来就看不出来退化 */
  if (typeof window !== 'undefined') window.__bootReady = reason
  rsubs.forEach((fn) => fn(reason))
  rsubs.clear()
}

export function whenHeroReady(fn) {
  if (ready) {
    fn(ready)
    return () => {}
  }
  rsubs.add(fn)
  return () => rsubs.delete(fn)
}

/* 量测用：tmp/boot-verify.mjs 要拿它判“遮罩是不是真的等到就绪才摘” */
export const heroReadyReason = () => ready

export function setBuildStage(next) {
  if (next === stage) return
  stage = next
  subs.forEach((fn) => fn(stage))
}

export const getBuildStage = () => stage

export function subBuildStage(fn) {
  subs.add(fn)
  fn(stage)
  return () => subs.delete(fn)
}

/* 六道工序的名字：3D 与 DOM 共用一份，避免两边各写一遍对不上 */
export const BUILD_STEPS = ['场地供电', '网络总线', '机械臂落位', '工位与视觉', '移动底盘', '人形联调']

/* ―― 设备选中通道：点 3D 里的设备 → 镜头聚焦锁定 + 看板展示那台设备 ――
   与 stage 同理走发布订阅而不是 props：选中只在点击那一瞬变一次，
   但布景里的拾取代理、相机机位与看板都要知道 —— 经 React 树传要重渲整棵 Canvas
   wide = 未聚焦的全景位（默认态，也是再点同一设备/点空白的解锁落点） */
let device = 'wide'
const dsubs = new Set()

export const getDevice = () => device

/* 点已聚焦的设备 = 解锁回全景：聚焦/解锁共用一个入口，手势语义自洽 */
export function selectDevice(id) {
  const next = id === device ? 'wide' : id
  if (next === device) return
  device = next
  dsubs.forEach((fn) => fn(next))
}

export function subDevice(fn) {
  dsubs.add(fn)
  return () => dsubs.delete(fn)
}

/* ―― 链状态通道：DOM 看板写，3D 那六块看板读 ――
   为什么需要：链屏现在有两处地方在报同一批数字（右下角 DOM 台 + 场景里那六块牌）。
   各自从自己的 0 点起算就会穿帮：DOM 说区块高度 31、场景里那块说 18472。
   所以真相只留一份 —— DOM 那台状态机（它才是被指令驱动的那个）逐拍写进来，
   3D 只读不造。不是响应式：看板一拍 1.5s 重画一次，画的时候现取就够 */
export const chainLive = {
  height: 29, // 区块高度
  tx: 134, // 链上累计交易
  tps: 150, // 当前吞吐
  contracts: 33, // 已部署合约
  pool: [], // 内存池（与 DOM 同一批条目，含 name）
  lastPack: null, // 上一批被打包进块的交易 { h, items }：出块把池清空，牌上不能只剩个 0
  lat: [], // 出块时延采样（与 DOM 那排柱同一序列）
  heightHist: [], // 高度历史：牌上那道阶梯走势
  tpsHist: [], // 吞吐历史：牌上那排柱
}

/* ―― AI 屏的节拍与发言轮值：DOM 看板与场景里那五块界面同源 ――
   与 chainLive 同一个理由，只是这里不需要一个可变的对象：两处的数字
   全是「由此刻的墙上时钟推出来」的纯函数，所以永远不会对不上。
   为什么不能用「挂载后第几拍」：右下角那台看板每 760ms 重渲染一次、
   场景里那五块面板每 1500ms 一次，两边各自从自己的 0 点起算，
   「谁在发言」就会一个说主讲、另一个说观察员 —— 实测过那种穿帮。
   发言轮值取 3s 一人：比一拍粗，读得出「一个人在说完一段话」而不是在跳。 */
export const BEAT_MS = 1500
export const SPEAK_MS = 3000
export const beatNow = () => Math.floor(Date.now() / BEAT_MS)
export const speakerNow = (n) => Math.floor(Date.now() / SPEAK_MS) % n
