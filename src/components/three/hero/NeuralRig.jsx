import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { heroScenes } from '../../../data/heroScenes'
import { ContactGlow, FlowArc, damp, useAppear } from './kit'
import AgentPanel, { ADF, HERO, HUES, SAT, isHero, panelWorld } from './AgentPanels'
import { BEAT_MS, beatNow, speakerNow } from './buildBus'

/* ============================================================
 * AI 屏布景：空中五块智能体界面 + 它们之间在走的数据
 * ------------------------------------------------------------
 * 这一轮拆掉两样（用户：太像玩具；去掉最上方那个看板）：
 * 1. 五位智能体不再是原语几何拼的小人偶 —— 上一版是球头 + 倒锥座 + 一圈环，
 *    五个小人站在空中确实像个摆件。现在每一位是它自己那个产品的界面：
 *    AI 课堂的课件列与对话流、追问引擎的 think/tool/rank/branch trace、
 *    反例检验的逐条判定、圆桌调度的发言队列、学情采集的掌握漏斗。
 *    板面是 DOM（drei <Html transform>），与链屏那六块玻璃牌同一个家族：
 *    字过 canvas 纹理要吃三道折损（烤进纹理 → 按 dpr 0.8 贴出来 → 被 Bloom
 *    阈值糊一层），DOM 三道都不吃（见 AgentPanels 顶部那段）。
 * 2. 空中那块 3D 讲台屏（最上方的看板）整个删掉。它上面写的四件事
 *    （点名册 / 掌握漏斗 / 课程包阵面 / 备课流水线）现在由五块界面各自承担，
 *    右下角那台 DOM 看板也各自承担 —— 同一件事讲三遍就是玩具感来源之一。
 *
 * 席位不是猜的：tmp/ai-seat.cjs 拿相机矩阵反解出来的。做法是先定每块界面
 * 该落在屏幕哪儿（与 tmp/ai-flow.mjs 在真页面上量到的遮挡块留 30px 以上的缝），
 * 再沿视线取深度反解局部坐标。镜头有漂移，包络实测过（tmp/ai-env.mjs）：
 * 静置 x±18 y±5，鼠标视差与 FOV 呼吸再叠 ±25 —— 所以缝不能只按静帧留。
 *
 * 三条老规矩仍然生效：
 * 1. 席位固定，不绕圈 —— 上一版让它们上轨道，结果是牌撞 DOM 文案、
 *    链路拖成在画面里缓扫的长直线，读出来只剩"它们在飘"；
 * 2. 不做地上/空中多余的第二套符号系统，五块界面自己就是画面主体；
 * 3. group.visible 管不到 DOM，所以显隐逐帧按「DOM 上此刻是什么」写
 *    （同 ChainRig 那个死锁教训：不能先比缓存再取 el）。
 * ============================================================ */

const SCENE = heroScenes[2]
/* 布景离地高度。机位 look 在 y 1.02，这一层不动，镜头与构图的换算才成立 */
const CENTER = 1.45
/* 整组左偏量：算视线前得先把 rig 局部 x 偏回世界 */
const RIG_X = 0.15
const AGENTS = SCENE.agents.length
const MODES = ['prep', 'class', 'insight', 'hub']

/* ―― 空中席位（rig 局部坐标：x 右 / y 上 / z 朝镜头，yaw 是绕 Y 的那点朝向）――
   环序是 0 中央 → 1 左上 → 2 左下 → 3 右下 → 4 右上 → 回 0，
   数据沿这个环走一圈就是"一堂课转了一圈"，回流给主讲就是学情闭环。
   深度拉开：主讲 6.1m（最大最近）、观察员 7.3m（最小最远）—— 屏幕上的大小
   差就是"谁离这堂课更近"的那件事，不需要任何装饰来提示纵深 */
const SEATS = [
  { x: 0.308, y: 0.169, z: 0.466, yaw: -0.034 }, // 主讲 · AI 课堂（主块）
  { x: -1.521, y: 1.185, z: 0.053, yaw: 0.243 }, // 追问者 · 推理链
  { x: -0.739, y: -1.024, z: 0.594, yaw: 0.139 }, // 反例者 · 命题校验
  { x: 0.767, y: -1.027, z: 0.038, yaw: -0.101 }, // 主持人 · 圆桌调度
  /* 观察员从右上角 (2.325, 1.275) 往左收了 1.49m、往上抬了 0.10m：
     旧席位在屏幕上落在 x 1029~1218 / y 112~223，而右下角那台看板在课堂态是
     一面 1020~1400 / 200~772 的不透明墙（tmp/ai-flow.mjs 量到）—— 牌的下沿
     被切掉 23px，“迁移 43”那一行直接断在墙棱上。
     为什么不能往上躲：导航底沿 64、看板顶 200，中间只有 136px，而牌本身 111px
     高 —— 留 30px 缝再叠镜头漂移（±十几像素）根本装不下；往右躲也不行，
     看板一直顶到屏幕右缘。所以只能从看板左侧绕出去，与主持人那块同成一列：
     环还是那个环，只是右上那一角从“环”读作了“中心列上下各一块”。
     yaw 跟着新横位重推：-atan((x_world - cam.x)/depth) = -0.098 */
  { x: 0.835, y: 1.375, z: -0.894, yaw: -0.098 }, // 观察员 · 学情采集
]

/* 每条指令把光打在谁身上：备课是主讲、学情是观察员、共建是主持人；
   课堂不加特写 —— 课堂的特写就是"此刻在发言的那一位"，它本来就在亮 */
const HOT_BY_MODE = { prep: 0, class: -1, insight: 4, hub: 3 }

/* ―― 每块界面朝镜头的那点俯仰 ――
   与链屏 PLACE 同一条式子（ChainRig: -atan2(CAM.y - y, sight) * 0.5）：同一个
   机房里两屏的看板不可能一种摆法。上一轮给 AI 屏补了背板厚度，但 NeuralRig
   没把 yaw/pitch 传进 <AgentPanel>，于是那五块界面至今是零厚度贴纸 ——
   只有左右转、没有上下转，斜切不出那个梯形，玻璃就没厚度可言。
   上面那三块（追问者 / 观察员，y +1.2）机位在它们下方 → 仰；下面那两块俯。
   量出来的转角约 ±0.09rad：背板溢出 t·sin(0.09)=26px → 2.3px，正好是
   “看得见一条棱、又不至于像挂了块板”那一档 */
const CAM = SCENE.cam.pos
const PITCH_GAIN = 0.5
const PITCH = SEATS.map((s) => {
  const y = CENTER + s.y
  const sight = Math.hypot(CAM[0] - (RIG_X + s.x), CAM[2] - s.z)
  return -Math.atan2(CAM[1] - y, sight) * PITCH_GAIN
})

/* ―― 数据链路：a → b 是"数据从谁流向谁"，on 是这条链路归哪条指令管 ――
   ex/en 是这条线接在两块界面的哪条边上（l/r/t/b），ak/bk 是沿那条边的位置
   （-0.5~0.5）。接在边线上而不是接在两块牌的中心，链路才不会从牌背后穿过 ——
   上一版端点取组坐标，线的一截埋在牌里，看着像线插在墙上 */
const EDGES = [
  { a: 0, b: 1, ex: 'l', en: 'r', ak: 0.35, bk: -0.3, on: ['class'] },
  { a: 1, b: 2, ex: 'b', en: 't', ak: -0.2, bk: -0.2, on: ['class'] },
  { a: 2, b: 3, ex: 'r', en: 'l', ak: 0.1, bk: 0.1, on: ['class', 'insight'] },
  { a: 3, b: 4, ex: 't', en: 'b', ak: 0.3, bk: -0.3, on: ['class', 'insight', 'hub'] },
  /* 观察员挪到主讲正上方后，回流那一条的接法变了：从“左侧进右侧”改成
     “下边进上边” —— 上下相邻的两块牌，线接在顶底棱上才不会从主讲脸前扫过 */
  { a: 4, b: 0, ex: 'b', en: 't', ak: -0.3, bk: 0.35, on: ['class', 'insight', 'hub'] },
  { a: 1, b: 0, ex: 'b', en: 'l', ak: 0.3, bk: -0.15, on: ['prep'] },
  { a: 4, b: 1, ex: 't', en: 'r', ak: -0.2, bk: 0.35, bend: 0.05, lift: 0.03, on: ['prep', 'insight'] },
  { a: 2, b: 0, ex: 'r', en: 'b', ak: -0.35, bk: -0.3, on: ['prep'] },
  { a: 0, b: 3, ex: 'b', en: 'r', ak: 0.3, bk: -0.25, on: ['hub'] },
  { a: 0, b: 2, ex: 'l', en: 't', ak: -0.4, bk: 0.35, on: ['hub'] },
]
/* 四态各点亮几条：备课 3、课堂 5、学情 4、共建 4 —— 按一个按钮换一组线，
   这是看板那四个按钮在场景里唯一的可见回执，所以常态不留底光 */

const seatCenter = (i) => new THREE.Vector3(SEATS[i].x, SEATS[i].y, SEATS[i].z)

/** 界面某条边上的接点（rig 局部坐标）：牌半宽半高 + 沿边位置，
    再绕 Y 转这块牌自己的 yaw，最后往外挪 2cm —— 线才不会埋在牌里 */
function anchor(i, side, k = 0) {
  const s = SEATS[i]
  const { w, h } = panelWorld(i)
  let ax = 0
  let ay = 0
  if (side === 'l') [ax, ay] = [-w / 2, k * h]
  if (side === 'r') [ax, ay] = [w / 2, k * h]
  if (side === 't') [ax, ay] = [k * w, h / 2]
  if (side === 'b') [ax, ay] = [k * w, -h / 2]
  const c = Math.cos(s.yaw)
  const n = Math.sin(s.yaw)
  return new THREE.Vector3(s.x + ax * c + 0.02 * n, s.y + ay, s.z - ax * n + 0.02 * c)
}

const HERO_MID = seatCenter(0)

/** 每条弧的静态几何：端点、弯向、颜色。
    注：anchor() 只按 yaw 转，没跟着转 pitch —— 补上俯仰后接点会沿牌面法向
    挪出 ~2.8cm 的深度差，换算到屏幕是 0.3px（牌面离机位 6~7m），看不出来，
    所以不必把那条旋转链抄进端点计算里。
    弯向的默认规则是「离主讲中心越远越外」：环上那几条要绕开中间那块大牌（0.2），
    主讲进出的辐条只侧让一点（0.11）。不写这条规则，十条弧会一起往同一边鼓。
    颜色吃收方的通道色：数据“进了哪一家的界面”就用哪一家的颜色 ——
    于是这一屏的线与链屏那六块牌的图元色是同一套读法 */
const ARCS = EDGES.map((e) => {
  const a = anchor(e.a, e.ex, e.ak)
  const b = anchor(e.b, e.en, e.bk)
  let bend = e.bend
  if (bend === undefined) {
    const d = b.clone().sub(a)
    const perp = new THREE.Vector3(-d.y, d.x, 0).normalize()
    const away = a.clone().add(b).multiplyScalar(0.5).sub(HERO_MID)
    bend = (perp.dot(away) >= 0 ? 1 : -1) * (e.a === 0 || e.b === 0 ? 0.11 : 0.2)
  }
  return { a, b, bend, lift: e.lift ?? 0.06, tc: e.tc ?? 0.14, key: `${e.a}>${e.b}`, on: e.on, hue: HUES[e.b] }
})

export default function NeuralRig({ active, cmd, accent = SCENE.accent }) {
  /* 第三参是这套布景的离地高度：useAppear 每帧写 root.position.y，
     不传进来就会把下面 JSX 的 position={[0, CENTER, 0]} 抹成 0 */
  const [root, prog] = useAppear(active, 3.2, CENTER)
  const boards = useRef([])
  const panels = useRef([])
  const flow = useRef(EDGES.map(() => 0))
  const flash = useRef(SEATS.map(() => 0))
  const opLast = useRef(SEATS.map(() => -1))
  const modeId = MODES.includes(cmd.id) ? cmd.id : 'prep'

  /* 面板重挂的节拍：对齐到墙。上一版用 setInterval(1500) 从挂载起算，
     与看板那台的 1.5s 是两套零点 —— 于是看板说「反例者在说」、画面里亮着观察员。
     现在 beat 与发言轮值都由 buildBus 那两个纯函数从 Date.now() 推，
     SPEAK_MS = 2×BEAT_MS 保证发言边界必定落在面板重挂的那一拍上 */
  const [beat, setBeat] = useState(() => beatNow())
  useEffect(() => {
    if (!active) return
    setBeat(beatNow())
    let id = null
    const schedule = () => {
      id = setTimeout(() => {
        setBeat(beatNow())
        schedule()
      }, BEAT_MS - (Date.now() % BEAT_MS))
    }
    schedule()
    return () => clearTimeout(id)
  }, [active])

  /* 每块牌按景深的那点沉底：近侧满亮，远侧压到 0.78。
     DOM 不吃 three 的 fog，也不参与泛光，纵深只能靠不透明度做 */
  const deep = useMemo(() => SEATS.map((s) => 0.78 + 0.22 * THREE.MathUtils.clamp((s.z + 0.95) / 1.5, 0, 1)), [])

  /* ―― 面板显隐以「DOM 上此刻是什么」为准 ――
     同 ChainRig 那条血泪：group.visible 管不到 DOM，而 drei 把内层 div 放在
     root.render() 里异步渲染 —— 先比缓存再取 el 会留一个死锁窗口
     （第一帧 el=null 而缓存已写 0，此后每帧都早退），漏一块就是
     一张浮在别家场景上的界面 */
  const setPanelOp = (i, v) => {
    const el = panels.current[i]
    if (!el) return
    if (opLast.current[i] === v) return
    opLast.current[i] = v
    el.style.display = v > 0.02 ? '' : 'none'
    if (v > 0.02) el.style.opacity = v
  }
  const hideAll = () => {
    for (let i = 0; i < SEATS.length; i++) {
      const el = panels.current[i]
      if (!el || el.style.display === 'none') continue
      opLast.current[i] = 0
      el.style.display = 'none'
    }
  }

  useFrame((state, delta) => {
    if (!active && prog.current < 0.01) {
      hideAll()
      return
    }
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const appear = prog.current
    const live = appear > 0.5 ? 1 : 0
    const sp = speakerNow(AGENTS)

    /* 链路强度：只点亮当前指令名下那几条，淡入淡出交给 FlowArc 自己 damp */
    for (let i = 0; i < EDGES.length; i++) {
      flow.current[i] = damp(flow.current[i], EDGES[i].on.includes(modeId) ? live : 0, 3.2, dt)
    }

    for (let i = 0; i < SEATS.length; i++) {
      const g = boards.current[i]
      const s = SEATS[i]
      flash.current[i] = damp(flash.current[i], 0, 3.4, dt)
      const fl = flash.current[i]
      const on = i === sp ? 1 : 0
      const hot = HOT_BY_MODE[modeId] === i ? 1 : 0
      if (g) {
        /* 只做上下浮动与一点偏航，不做缩放：缩放会让牌边与链路的静态端点脱开，
           而 DOM 被 matrix3D 放大还会糊字 —— 强调全交给亮度与发光 */
        g.position.set(s.x, s.y + Math.sin(t * 0.9 + i * 1.3) * 0.01 + on * 0.012, s.z)
        g.rotation.y = s.yaw + Math.sin(t * 0.5 + i * 2.1) * 0.012
      }
      const v = appear * (deep[i] + on * 0.05 + hot * 0.06 + fl * 0.1)
      setPanelOp(i, Math.round(Math.min(1, v) * 50) / 50)
    }
  })

  const speaker = speakerNow(AGENTS)

  return (
    <group ref={root} name="rig-neural" position={[0.15, CENTER, 0]}>
      {/* 地上那团接触光留着：五块界面都飘在空中，没有它整个布景就是浮的 */}
      <ContactGlow radius={1.7} color={accent} opacity={0.07} y={-CENTER + 0.012} />

      {/* ―― 数据链路：弯管 + 沿线短划 + 两枚离散数据包 + 到站回执 ――
          直线读不出"在流"，而一条匀速扫过的亮带读不出"是一条数据"。
          现在一根管上有三件事：管身那串断开行走的短划（有一串数据正在过）、
          两枚错半拍的光点包（离散的一条条数据）、包绕回终点那一下点亮收方
          （数据真的被接住了）。颜色吃收方的通道色 */}
      {ARCS.map((c, i) => (
        <FlowArc
          key={c.key}
          a={c.a}
          b={c.b}
          bend={c.bend}
          lift={c.lift}
          towardCamera={c.tc}
          color={c.hue}
          radius={0.0055}
          opacity={0.82}
          speed={0.3 + i * 0.018}
          size={isHero(EDGES[i].b) ? 0.1 : 0.075}
          active={() => flow.current[i]}
          onDeliver={() => {
            flash.current[EDGES[i].b] = 1
          }}
        />
      ))}

      {/* ―― 五块智能体界面：真 DOM，按相机透视摆在这里 ――
          pointerEvents 关掉：这一屏不需要点牌聚焦，而一块吃射线的 DOM 牌
          会挡住 R3F 的拾取，把 HeroStage 里那点 onPointerMissed 落点判定带偏。
          zIndexRange 与链屏同一段：高于左右两块 scrim、低于 StoryHero 的
          排版层（z-[70]）—— 文案与右下角那台看板永远压得住牌，
          这也是构图必须避开那几块地方的原因 */}
      {SEATS.map((s, i) => {
        const css = isHero(i) ? HERO : SAT
        /* rotation-x 单独一条而不是 rotation={[..]}：下面 useFrame 每帧只写 .y，
           传数组会让每 1.5s 一次的面板重挂把 .y 顶回 s.yaw（下一帧才落回来） */
        return (
          <group key={SCENE.agents[i]} ref={(el) => (boards.current[i] = el)} position={[s.x, s.y, s.z]} rotation-x={PITCH[i]} rotation-y={s.yaw} visible={false}>
            <Html
              ref={(el) => (panels.current[i] = el)}
              transform
              distanceFactor={ADF}
              zIndexRange={[60, 20]}
              pointerEvents="none"
              style={{ width: css.w, height: css.h, pointerEvents: 'none' }}
            >
              <AgentPanel index={i} mode={modeId} beat={beat} live={i === speaker} hot={HOT_BY_MODE[modeId] === i} yaw={s.yaw} pitch={PITCH[i]} />
            </Html>
          </group>
        )
      })}
    </group>
  )
}
