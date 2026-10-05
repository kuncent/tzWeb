import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { heroScenes } from '../../../data/heroScenes'
import { getDevice, selectDevice, subDevice } from './buildBus'
import { ContactGlow, damp, hdr, useAppear } from './kit'
import ChainBoard, { DF, PH, PW, SUB, leaderNow } from './ChainPanels'

/* ============================================================
 * 区块链屏布景：一座小圆形看台，台前一条环抱的浅弧挂着六块数据看板
 * ------------------------------------------------------------
 * 这一版把看板拆成了两层（用户：3D 看板有点糊，可以用 2D 看板加 3D 视图）：
 *
 *   板面 = 真 DOM。drei 的 <Html transform> 把一块 DOM 按相机透视摆进场景，
 *     于是字不再过"烤进纹理 → 按 canvas 的 dpr 贴出来 → 被 Bloom 糊一层"那三道
 *     折损（最低画质档 dpr 0.8，等于整块画面先缩一遍再放大回屏幕 —— 实测这一版
 *     在 tier 0 上拍出来的字仍是硬的，见 tmp/audit/chain-1.png）。换算
 *     world = cssPx × DF/400，所以 212×134 的板面配 DF 1.59 是 0.842×0.532 米。
 *     实测对得上：tmp/html-probe.mjs 量到阵列态六块牌屏幕 173~199 × 108~119px、
 *     零重叠、左端从 x=112 起、右端留 111px，hitTest 全部落在板面自己身上。
 *   板外 = WebGL。一座收小的圆形看台、台沿一圈静态边灯、出块那一下贴上来的
 *     涟漪、往上飞的数据包 —— 3D 的东西交给 3D。
 *     牌飞上登台位时那块 DOM 跟着组的 matrixWorld 一起变换，一路都是真透视，
 *     不是贴在镜头上的贴纸。
 *
 * 牌背后现在什么都没有（用户两轮各拆一样：看板不要背后的 3D 框框、不要后面的色块）：
 *   先是机箱、压条、眉灯脚灯那圈金属边，然后连最后剩下的那块加色光片也拆了 ——
 *   它贴的是无贴图的纯色，1.2×1.34 的矩形在牌边露出一圈硬边，读起来还是“框框”。
 *   光泽这件事整个交回 CSS：
 * 版式是本站大屏看板那一套（切角外框、HUD 角标、斜角标题片、细网格底、等宽读数，
 * 与 consoleBits.Panel 同族），玻璃是四层叠的：径向暗角（那圈黑就是玻璃的厚度）+
 * 顶膜 + 左上高光斑 + 下缘次色反打，本体半透。斜反射带单独成一个 span，因为它要能
 * 被 hover / 选中推满（吃 CSS 变量 --glint，不为 hover 重渲染六块牌）。
 * 不做 backdrop-filter —— 见 ChainPanels 里那段理由。
 *
 * 六块牌一条线（用户：看板排成一条线，再舒服自然一点）：等距直线全部正对镜头
 * 读作“一把尺贴在屏幕上”，所以套在一条极浅的环抱弧上 —— 两端高 0.05m、退 0.10m、
 * 朝中心转 7.4°（见 LINE_* / ARC_*）。点任意一块 → 从阵列里摘出来，沿一条弧线
 * 飞到画面中央的登台位转正、放大到 2.55×，其余五块淡出并沉下去让位；再点或点空白 → 飞回原位。
 * 这条交互实测过（tmp/board-stage.mjs），而它一度是死的：链屏的牌是 DOM，
 * R3F 的射线打不到 DOM → 点牌在它那套语义里永远算“点了空白”，onPointerMissed
 * 比牌的 click 晚一步，正好把刚选上的那块打回 wide。挡点在 HeroStage 的落点判定里，
 * 成因写在那一处。左端两块牌一度还点不到，凶手不在这份文件里：文案列是个
 * inset-y-0 的通高 pointer-events-auto 盒，把左半屏的事件整片截走了（StoryHero）。
 *
 * 这一屏是一层层往下减出来的（用户：去掉地上旋转的光带 → 展台不要地上转动的光线
 * → 不要中间旋转的射线 → 去掉 dais 这层东西 → 缩小圆形看台大小）：gossip 环、
 * 台沿那道转的光、台面两道刻线、中央转着的锁定刻度牙、地板 shader 里那条缓慢
 * 外扩的扫描环（kit.Floor），全拆了。台子本身拆到底试过，实测拍出来下半屏空了
 * 一片（牌只剩顶部一条细带，中间没人占），所以这一轮按“缩小”而不是“拆掉”收：
 * 半径从 2.95m 收到 1.95m（环境层那块 3.05m 的盘与它的亮边不跟着回来），
 * 它重新接住登台那块牌，而不再是一间舞池。
 * 一圈匀速转的光在停帧里就是一个呼啦圈，而且它转它的、牌跳牌的，两者没有因果
 * 关系 —— 这类东西一概不要；留在台面上的两样都被驱动：涟漪由出块触发，
 * 锁定环由“有没有牌在台上”触发。扫描环还多一条理由：它铺到透视深处留不下一个
 * 像素，抗锯齿失效，实测拍出来是一圈放射状锯齿纹。
 *
 * 遮挡的顺序现在是免费的：drei 按镜头距离给每块板面排 z-index，近的自然压在远的
 * 上面 —— 上一版纹理要自己操心"谁先画"，DOM 这层浏览器替我们做了。
 *
 * 看板与 ChainConsole 吃同一份状态（buildBus.chainLive）：
 * DOM 那台状态机才是被指令驱动的那一个，3D 只读不造。
 * 同一个屏上两处各算各的区块高度，迟早对不上 —— 数字打架比丑更糟。
 * ============================================================ */

const SCENE = heroScenes[1]
const BOARDS = SCENE.boards
/* 整组左偏。看板那条线另外用 LINE_X 找自己的中心（见下），不在这里调 ——
   挂在 root 上的每一分位移会把数据包与星尘一起搬走，而那两样是按屏幕位置对过账的 */
const RIG_X = -0.15
/* 登台位的深度。牌往后飞才读作“走上台”，而登台态实测 290×181 @50.2/37.9
   就是按这个深度量的；看台也坐在这个 z 上，台心就是落牌点 */
const STAGE_Z = -1.25
/* ―― 圆形看台（用户：缩小圆形看台大小）――
   上一版是半径 2.95m 的一整块地（叠上环境层那块 3.05m 的盘与它的亮边），
   两个盘加起来把画面下半截全占满，比任何看板都抢戏。台子的本分只是
   “牌落上去的一个落点”：半径收到 1.95m，刚好接住登台那块牌 2.15m 的宽度；
   DAIS_X 与 STAGE.x 同一个值，台心就是落牌点 */
const DAIS_R = 1.95
const DAIS_Y = 0.05
const DAIS_X = 0.15
/* 板面自己的世界尺寸：world = cssPx × DF/400。212×134 配 DF 1.59 就是一张
   0.842×0.532 米的玻璃片 —— 背后不再有机箱也不再有光片，这个尺寸就是牌的全部实体 */
const WW = (PW * DF) / 400
const WH = (PH * DF) / 400
/* ―― 六块牌的原位：一条环抱的浅弧（rig 局部 x, y, z, yaw）――
   用户：看板排成一条线 + 更舒服自然 + 不要那么空洞 + 挂得太高（两轮）。等距直线
   全部正对镜头读作“一把尺贴在屏幕上”，而更早那版这条线贴在顶边（两端 y 66、
   中间 y 104），下面整片都是空的 —— 所以这条线现在是一条垂下来的链形：
   两端钉在 2.85m 不动，中间自基下坠 0.7m（LINE_Y 2.15 + ARC_LIFT·u²）。六块牌
   因此铺到 y 75~325 而不是 66~222，顶上那条细带拉开了，看台与牌之间不再空。
   俯仰给一半（不是上一版的零）：上一版一律正对镜头是怕“拼成 V 形屏”把两端
   牌面斜切掉 —— 但完全不俯仰的代价是六块牌在屏幕上一样大、一样平，
   “环抱的弧”只写在注释里。现在按视线算俯仰并且只给 0.5：牌读作“挂在链子上
   而且朝着看它的人”，而 3~4° 的斜面不咬字（cos4° = 0.998）。
   两端不跟着往下：实测眉标那行（BLOCKCHAIN · 02/03）占屏幕 y 185~198、x 47~215，
   左端牌底已经到 183，再往下就压到它头上；文案层又画在牌之上（z-[70] vs 牌 ≤60），
   一碰就是字叠在面板上。而中间两块牌 x 在 500~900，文案列碰不到，所以只有它们能往下。
   间距 1.02m > 牌宽 0.842m，邻牌之间留 0.18m 空隙；上一版两列三行踩过的坑不能在
   这里重踏：重叠哪怕只有十几像素，被吃掉的也是牌边上那两格读数。
   LINE_X 居中靠右：镜头 off-axis 让右端牌比左端大 17%（实测 176 vs 206 屏幕 px），
   世界等距的线在屏幕上是右疏左密，所以中心得往回找 —— 实测这条线占 x 112~1329 */
const LINE_X = 0.22
const LINE_Y = 2.15
const LINE_Z = 1.62
const LINE_GAP = 1.02
const ARC_LIFT = 0.7
/* 两端往后退：0.2 → 0.42。这是“3D 感不强”的头一号病因 —— 六块牌都在同一个
   深度上，透视就没有近大远小，一条线再弯也拍不弯。退 42cm 后两端比中间远
   半米，屏幕上尺寸差从 17% 拉到 27%，弧才真的环抱起来 */
const ARC_BACK = 0.42
/* yaw 0.16 → 0.22：牌边转过来一点，斜切出的那个梯形就是“这块玻璃有厚度”
   的第二条证据（第一条是 ChainPanels 里那层错开的背板） */
const ARC_YAW = 0.22
const PITCH_GAIN = 0.5
const CAM = SCENE.cam.pos
const PLACE = Object.fromEntries(
  BOARDS.map((b, i) => {
    const u = (i - (BOARDS.length - 1) / 2) / ((BOARDS.length - 1) / 2)
    const x = LINE_X + u * ((BOARDS.length - 1) / 2) * LINE_GAP
    const y = LINE_Y + ARC_LIFT * u * u
    const z = LINE_Z - ARC_BACK * u * u
    /* 朝向镜头的那点俯仰：rig 局部坐标得先把整组的 RIG_X 偏回世界再算视线。
       中间那块在视线下方的（仰）、两端在上面的（俯），同一个式子自动分掉 */
    const sight = Math.hypot(CAM[0] - (RIG_X + x), CAM[2] - z)
    const pitch = -Math.atan2(CAM[1] - y, sight) * PITCH_GAIN
    return [b.id, [x, y, z, -ARC_YAW * u, pitch]]
  }),
)
/* 登台位（rig 局部）：被点中的牌飞到这里并转回正对镜头。镜头不跟着推 ——
   一推，牌就要往左右两块 DOM 面板底下钻。牌面 0.842m 放大到 2.55× 是 2.15m，
   在这个深度上约合 290 屏幕像素（实测 tmp/audit/stage6.txt：290×181 @50.2/37.9），
   正是“不点扫一眼、点了读得清”那一档：DOM 面板走 CSS 缩放，字不会糊 */
const STAGE = new THREE.Vector3(0.15, 1.45, STAGE_Z)
const STAGE_SCALE = 2.55
/* 让位的牌往下沉一点同时淡掉。没有机箱了，DOM 板面淡到零就是真的没了，
   所以不再需要上一版那 2.6m 的“收进台子里” —— 那一段位移是为了藏一台机器 */
const SINK = 0.34

/* 确定性伪随机：切屏重挂不会换一副面孔 */
const jitter = (i, k = 1) => ((((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1)

const MAT = {
  /* 台面必须“不反”。三次实测各撞了一面墙：#0b1420 / metalness 0.72 / roughness 0.42
     拍出来是一片水泥灰加机架的镜面剪影（实测涂红一看就是半镜）；收到 metalness
     0.34 / roughness 0.68 仍是一片灰；干脆 roughness 拉满、metalness 归零、envMap
     几乎不接 —— 还灰。因为问题从来不在金属度也不在环境贴图，而在掠射角：镜头几乎
     贴着台面看过去（法线与视线夹角 74°），费斯涅把任何介质的 F 都推向 1，于是平行光
     与点光全铺在这块面上，albedo 多黑都白搭。所以这一版换 Physical 把介质镜面那一项
     直接乘零（不是 clearcoat —— 那是第二遍 BRDF，HD 630 上才要省；specularIntensity
     只是一个乘数）。只留 diffuse 加一点点自发光抬它半档：“这里有个台”交给台沿那圈
     边灯与脚下的接触光，不交给反光 */
  dais: new THREE.MeshPhysicalMaterial({
    color: '#0a1018',
    roughness: 0.98,
    metalness: 0,
    specularIntensity: 0,
    envMapIntensity: 0.15,
    emissive: new THREE.Color(SCENE.accent).multiplyScalar(0.03),
  }),
}

/* 看板指令 → 该弹哪块牌。这些指令的落点一路搬过三次家：最早是链环与灯柱（多长
   一节、哪根柱子亮），那两样拆掉后搬到台面涟漪，台子收小之后涟漪跟着回来。
   但主回执必须在牌上：那才是指令直接改动的读数 */
const POP_BY_CMD = { tx: 'pool', contract: 'contracts', block: 'ledger', bridge: 'tps' }

/* 逐帧用的临时向量：这个循环每帧要跑六次贝塞尔，不能在里面 new */
const _p0 = new THREE.Vector3()
const _p1 = new THREE.Vector3()
const _pos = new THREE.Vector3()
const dotGeo = new THREE.SphereGeometry(0.032, 10, 10)
/* 牌背后现在什么都没有：机箱、压条、眉灯脚灯、还有一直留到这一轮的加色光片。
   用户：看板不要后面的色块 —— 那六块 planeGeometry 贴的是无贴图的纯色加色矩形，
   所以它不是“柔光”而是一块比牌还大一圈的硬边色块（上一张实测图里 TX POOL 背后
   那团橙色矩形就是它）。牌背干净了，射线在这一屏的牌区再也打不到东西，
   拾取全交给 DOM 板面自己 */

export default function ChainRig({ active, cmd, accent = SCENE.accent, hi = true, sparkles = hi }) {
  const [root, prog] = useAppear(active)
  const boards = useRef([])
  const panels = useRef([])
  const packets = useRef([])
  const wave = useRef(null)
  const stageGrp = useRef(null)
  const stageRing = useRef(null)

  /* 内存池里飞着几笔待打包的交易、出块涟漪的计时、以及给 jitter 换面孔的 seed。
     bridgeAmt 那一项跟着跨链侧波一起拆了：两道反向的环在同一座小台子上只会打转 */
  const st = useRef({ popT: 9, pool: 0, seed: 0 })
  /* 看板节拍。板面是 DOM，重排一次是浏览器的事，但每拍仍然只该重渲染一次：
     1.5s 一拍比一帧慢两个量级，六块牌一起换数也压不出可见的抖动。
     上一版这块节拍还兼着"什么时候重画纹理、什么时候上传纹理"两件事 ——
     六张 320×193 的 RGBA 一起同步上传，在 HD 630 上就是实测报表里 p95 那一档、
     每两秒一次的可见卡顿。纹理这条路整条拆了，这个坑跟着没了 */
  const [beat, setBeat] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setBeat((b) => b + 1), 1500)
    return () => clearInterval(id)
  }, [active])
  const leader = leaderNow()
  /* 选中态订阅成 state：板面上"在台上"那颗灯、那道扫描带、那块跑马灯都吃它。
     逐帧的动画量另外用 getDevice() 现取，不走这条闭包 */
  const sel = useSyncExternalStore(subDevice, getDevice)

  /* 看板动画量：u 飞上登台位 0→1，bk 让位下沉 0→1，hv 悬停 0→1，pop 指令回执 */
  const anim = useRef(BOARDS.map(() => ({ u: 0, bk: 0, hv: 0, pop: 0 })))
  const hover = useRef(BOARDS.map(() => false))
  /* 有没有牌在台上 0→1：台心那圈锁定标吃它。它是被“牌上没上台”驱动的那一个，
     不是自己转的那一类 —— 转的那几样都拆了 */
  const focusAmt = useRef(0)
  /* 板面的显隐与透明度是逐帧写 DOM style 的 —— 每块牌存一份上一次写过的值，
     只在变了的时候动手。逐帧给六个元素各写一条 style 是白花的布局开销 */
  const opLast = useRef(BOARDS.map(() => -1))
  /* 拖拽门控：板面是真 DOM，点它不会走到 R3F 的射线拾取，于是"这是点击还是
     我在转镜头"得自己判 —— 按下记一下坐标，抬起时位移过 8px 就不算点。
     机箱拆了之后点牌只剩 DOM 这一道入口，selectDevice 的 toggle 语义（再点同一块
     = 解锁）于是也不会再被第二次调用抵消了 */
  const press = useRef(null)

  /* 显隐以「DOM 上此刻是什么」为准，不是以缓存为准。上一版是先比缓存、再取 el，
     于是留了一个死锁窗口：drei 的 <Html transform> 把内层 div（就是这个 ref）放在
     `root.render()` 里渲染，那是 useLayoutEffect 里的一次异步渲染，比 R3F 的第一帧
     晚一步 —— 第一帧 hideAll 拿到 el=null，可缓存已经写成 0，此后每一帧都在
     「缓存相等」那句早退。实测后果（tmp/audit/leak2.txt，滚到 idx=2）：六块链屏牌
     computed opacity 全是 1，那个 ref 的 inline style 只剩 width/height 一个字没被写过，
     六块 LEDGER / THROUGHPUT / TX POOL 就浮在 AI 屏画面里。
     group.visible=false 管不到 DOM，所以这一层只能自己逐帧确认 */
  const setPanelOp = (i, v) => {
    const el = panels.current[i]
    if (!el) return
    if (opLast.current[i] === v) return
    opLast.current[i] = v
    el.style.display = v > 0.02 ? '' : 'none'
    if (v > 0.02) el.style.opacity = v
  }

  /* 指令落到场景里：弹那块管事的牌；出块顺带在台面放一圈涟漪、并清掉内存池
     （打包进块了），其余指令往池里添一笔 */
  useEffect(() => {
    if (!cmd.n) return
    const s = st.current
    s.seed += 1
    const i = BOARDS.findIndex((b) => b.id === POP_BY_CMD[cmd.id])
    if (i >= 0) anim.current[i].pop = 1
    if (cmd.id === 'block') {
      s.popT = 0
      s.pool = 0
    } else s.pool = Math.min(6, s.pool + 1)
  }, [cmd.n, cmd.id])

  /* 空转也在出块：与看板的 6 拍心跳同一节奏 */
  useEffect(() => {
    const id = setInterval(() => {
      if (!active) return
      const s = st.current
      s.popT = 0
      s.pool = 0
      const i = BOARDS.findIndex((b) => b.id === 'ledger')
      if (i >= 0) anim.current[i].pop = 1
    }, 6000)
    return () => clearInterval(id)
  }, [active])

  /* 不在这一屏了：六块板面整排收掉。DOM 那层不归 three 的 visible 管，
     group.visible=false 只管得到数据包与星尘 —— 漏一块就是一张浮在别家
     场景上的看板。切屏时 prog 会先归零走到这里，兜底再收一次 */
  const hideAll = () => {
    for (let i = 0; i < BOARDS.length; i++) {
      const el = panels.current[i]
      if (!el || el.style.display === 'none') continue
      opLast.current[i] = 0
      el.style.display = 'none'
    }
  }

  useFrame((state, delta) => {
    /* 不是当前屏、也已经沉到底了 —— 逐帧一行都不跑。三套 rig 常驻一个 Canvas，
       切到区块链屏时具身那套还在算几十个关节插值，这部分 CPU 是白花花的 */
    if (!active && prog.current < 0.01) {
      hideAll()
      return
    }
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const s = st.current
    const P = prog.current

    /* ―― 六块看板：原位 / 飞上登台位 / 沉下去让位 ――
       device 这条通道是和具身屏共用的，所以里面会出现链屏没有的 id（那些拾取靶）。
       不归一化的话 cur !== 'wide' 对六块牌全成立、而 on 对六块全为假 ——
       整排一起 bk→1 沉下去，实测点一下画布空白六块牌全灭就是这么来的 */
    const raw = getDevice()
    const cur = BOARDS.some((b) => b.id === raw) ? raw : 'wide'
    focusAmt.current = damp(focusAmt.current, cur !== 'wide' ? 1 : 0, 4.5, dt)
    for (let i = 0; i < BOARDS.length; i++) {
      const g = boards.current[i]
      if (!g) continue
      const id = BOARDS[i].id
      const a = anim.current[i]
      const on = cur === id
      /* 进场比退让慢半拍：牌被摘走时别的牌要先把位置腾出来，
         两头同速就是六块牌一起在画面里搅 */
      a.u = damp(a.u, on ? 1 : 0, 2.7, dt)
      a.bk = damp(a.bk, cur !== 'wide' && !on ? 1 : 0, 3.6, dt)
      a.hv = damp(a.hv, hover.current[i] && !on ? 1 : 0, 9, dt)
      a.pop = damp(a.pop, 0, 3.1, dt)
      /* 位移过一道 smoothstep：damp 起步就是最大速度，牌读作"被弹出去"；
         两端速度归零才读作"摘起来、放下去" */
      const e = a.u * a.u * (3 - 2 * a.u)
      const pl = PLACE[id]
      const bk = 1 - (1 - a.bk) * (1 - a.bk)
      _p0.set(pl[0], pl[1] + Math.sin(t * 0.8 + i * 1.7) * 0.016 - SINK * bk, pl[2])
      _p1.set((_p0.x + STAGE.x) * 0.5, Math.max(_p0.y, STAGE.y) + 0.42, (_p0.z + STAGE.z) * 0.5)
      _pos.lerpVectors(_p0, _p1, e).lerp(STAGE, e)
      g.position.copy(_pos)
      /* 指令回执那一下弹跳：只有还在原位上的牌会弹，飞着的牌不掺和 */
      const bump = (1 - e) * Math.sin(Math.min(1, a.pop) * Math.PI) * 0.05
      const sc = (1 + (STAGE_SCALE - 1) * e) * (1 + 0.035 * a.hv + bump)
      g.scale.setScalar(sc)
      /* 微环抱的那点 yaw 与俯仰跟着飞入量收掉：牌一上台就转回正对镜头。
         上一版这点朝向是个参数（“分散排列”的内八与歪斜），现在它是弧的结果 */
      g.rotation.y = pl[3] * (1 - e)
      g.rotation.x = pl[4] * (1 - e)
      const op = (1 - bk) * P
      g.visible = op > 0.02
      setPanelOp(i, Math.round(op * 50) / 50)
    }

    /* 台心的锁定标：有牌在台上才亮。那道绕着中心转的刻度牙仍是拆掉的（用户：
       不要中间旋转的射线）—— 锁定与否交给环的亮暗：它是被驱动的那一个 */
    const f = focusAmt.current
    if (stageGrp.current) stageGrp.current.visible = f > 0.02
    if (stageRing.current && stageRing.current.material) stageRing.current.material.opacity = 0.5 * f * P

    /* 出块冲击波：贴着台面从台心往外推。台子收到 1.95m 之后行程也跟着收：
       上一版 scale 推到 3.1（环外径 1m → 3.1m）会直接溢出台面、在地板上拖一圈白光 */
    s.popT += dt
    if (wave.current) {
      const k = Math.min(1, s.popT * 0.5)
      wave.current.visible = k < 1 && P > 0.05
      wave.current.scale.setScalar(0.35 + k * 1.5)
      wave.current.material.opacity = (1 - k) * 0.34 * P
    }

    /* 内存池：待打包的交易从看台上冒出来，往上飞进池牌所在的位置。
       上一版它们从灯柱飞向链环 —— 那两头现在都不在了，起点是台心 */
    const ph = PLACE.pool
    packets.current.forEach((m, i) => {
      if (!m) return
      const live = i < s.pool && P > 0.05
      m.visible = live
      if (!live) return
      const fr = (((t * 0.3 + i * 0.19 + jitter(i, s.seed)) % 1) + 1) % 1
      const sx = ph[0] - WW * 1.1 + jitter(i, 2) * WW * 2.2
      const sz = STAGE_Z - 0.7 + jitter(i, 6) * 1.4
      m.position.set(sx + (ph[0] - sx) * fr, 0.1 + fr * (ph[1] - WH / 2 - 0.1), sz + (ph[2] - sz) * fr)
      m.scale.setScalar(0.5 + Math.sin(fr * Math.PI) * 0.7)
    })
  })

  /* 台沿边灯与台心环共用一支：主色已经是金的了，再画一圈蓝就是两盏灯串在一根线上 */
  const led = useMemo(() => hdr(accent, 2.2), [accent])

  return (
    /* 整组左偏挂在 root 的 position-x 上：useAppear 每帧只写 .y，
       用 position={[x,0,0]} 会在每次重画时把 y 顶回 0，闪一帧才落回来 */
    <group ref={root} name="rig-chain" position-x={RIG_X}>
      {/* ―― 圆形看台：一座收小了的台子（用户：缩小圆形看台大小）――
          半径从 2.95m 收到 1.95m、坐在登台位那个深度上，台心就是落牌点：
          台子的本分是接住那块牌，不是占满下半屏。台沿那道转的光与台面刻线仍不回来，
          台沿改成一圈静态边灯（它不转，只把“这里有个台”交代清楚），加上脚下那团
          接触光与被指令触发的涟漪。环境层（LabEnvironment chain）那块 3.05m 的盘
          与它的亮边也拆了：两个盘叠在一起就是上一版“看台比看板抢戏”的真因 */}
      <group position={[DAIS_X, 0, STAGE_Z]}>
        <mesh position={[0, DAIS_Y / 2, 0]} material={MAT.dais}>
          <cylinderGeometry args={[DAIS_R, DAIS_R - 0.05, DAIS_Y, 64]} />
        </mesh>
        {/* 台沿一圈静态边灯：半径落在台面内侧，不溢出去糊地格 */}
        <mesh rotation-x={-Math.PI / 2} position={[0, DAIS_Y + 0.003, 0]}>
          <ringGeometry args={[DAIS_R - 0.06, DAIS_R - 0.025, 72]} />
          <meshBasicMaterial color={led} transparent opacity={0.42} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* 接触光：把台子"焊"在地板上。它必须在台面之下（y 0.012）：上一版把它
            摆在台面之上，于是那团加色光斑直接画在台面心上当了一鼓亮疤。现在大
            半个盘把它遮住，只余外那一圈光晕溢到地上 —— 那才是"落地"的读法 */}
        <ContactGlow radius={DAIS_R + 0.3} color={accent} opacity={0.12} y={0.012} />

        {/* 出块冲击波：贴台面走，不悬在半空。上一版它立在 y=0.62 的链环高度上，
            停帧里就是一条 60px 宽的白带横吃半个画面 */}
        <mesh ref={wave} rotation-x={-Math.PI / 2} position={[0, DAIS_Y + 0.008, 0]}>
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial color={led} transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* 台心的锁定标：有牌登台才浮出来。只留一圈静定的环，不转 */}
        <group ref={stageGrp} position={[0, DAIS_Y + 0.01, 0]} rotation-x={-Math.PI / 2} visible={false}>
          <mesh ref={stageRing}>
            <ringGeometry args={[0.5, 0.524, 64]} />
            <meshBasicMaterial color={led} transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      </group>
      {/* ―― 六块数据看板：一条横线，纯 DOM 玻璃片 ――
          用户：看板不要背后的 3D 框框。机箱、压条、眉灯脚灯整批拆了 ——
          牌现在就是那张玻璃，就飘在那里。以前“看板是个物件”全靠那 14cm 厚的
          背板与露出来那一圈金属边，现在它交给玻璃自己：切角、磨边 inset、顶膜，
          还有那道随 hover 变亮的斜反射带（都在 ChainPanels 里）。
          拾取也只剩一条路：板面自己的 DOM 事件。点空白退出登台态因此重新可用 ——
          射线在牌背后再也打不到东西，onPointerMissed 才轮得到（见 HeroStage 那道落点判定） */}
      {BOARDS.map((b, i) => {
        const pl = PLACE[b.id]
        const dom = {
          onPointerEnter: () => {
            hover.current[i] = true
          },
          onPointerLeave: () => {
            hover.current[i] = false
          },
          onPointerDown: (e) => {
            press.current = { x: e.clientX, y: e.clientY }
          },
          onClick: (e) => {
            const p = press.current
            if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) return
            press.current = null
            selectDevice(b.id)
          },
        }
        return (
          <group key={b.id} ref={(el) => { boards.current[i] = el }} position={[pl[0], pl[1], pl[2]]} rotation={[pl[4], pl[3], 0]}>
            {/* ―― 板面：一块真 DOM，按相机透视摆在这里 ――
                牌背后那一圈加色光片拆了（用户：看板不要后面的色块）：它贴的是
                无贴图的纯色，1.2×1.34 的矩形在牌边上露出一圈硬边色块，读起来
                就是另一个“框框”—— 与刚拆掉的机箱同病。玻璃自己的光交回 CSS 那四层
                渐变与那道吃 --glint 的斜反射带（都在 ChainPanels 里）。
                distanceFactor 与 PW/PH 是一对，改一个必须改另一个，
                否则牌上的字与 WW/WH 那个世界尺寸就对不上了 */}
            <Html
              ref={(el) => { panels.current[i] = el }}
              transform
              distanceFactor={DF}
              /* 按镜头距离排 z-index：近的自然压在远的上面。区间留在 20~60 ——
                 高于左右两块 scrim（无 z-index，DOM 序靠后也压不住有值的），
                 低于 StoryHero 那块排版层（z-[70]，文案与右下角看板不能被牌盖住） */
              zIndexRange={[60, 20]}
              style={{ width: PW, height: PH }}
            >
              <ChainBoard board={b} index={i} beat={beat} leader={leader} hot={sel === b.id} hi={hi} dom={dom} yaw={pl[3]} pitch={pl[4]} />
            </Html>
          </group>
        )
      })}

      {/* 内存池里的交易：亮度推到 ×3.2 —— AGX 会把 >1 的颜色往白里压，
          ×2.2 拍出来是几颗死灰的球，不像正在飞的数据包 */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} geometry={dotGeo} ref={(el) => { packets.current[i] = el }} visible={false}>
          <meshBasicMaterial color={hdr(SUB.pool, 3.2)} toneMapped={false} transparent opacity={0.95} />
        </mesh>
      ))}

      {sparkles && <Sparkles count={16} scale={[5.4, 2.4, 4.6]} position={[0.65, 1.3, 1.4]} size={1.4} speed={0.16} opacity={0.16} color={accent} />}
    </group>
  )
}
