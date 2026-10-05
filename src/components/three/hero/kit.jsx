import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { buildClock } from './buildBus'

/* ============================================================
 * 首屏三屏共用的舞台件
 * ------------------------------------------------------------
 * 三屏（具身 / 区块链 / AI）在同一个 Canvas、同一台相机、同一片地板里
 * 换布景。所以“换布景”这件事的公共语言放在这里：
 * 出现进度、LED 的 HDR 颜色、以及那片会走扫描环的网格地台。
 * ============================================================ */

export const damp = THREE.MathUtils.damp

/**
 * LED 推到 HDR（>1）：只有越过 Bloom 亮度阈值的东西才会发光。
 * 但别把它当“变亮”用：AGX 色调会把单通道 >1.5 的颜色往灰白里抽，
 * 所以“想保住色相的几何”（线框、描边、笼体）要留在阈值下，用透明度换可见度；
 * 只给真正的点光源（内核、数据包、灯珠）上 ×2.4 以上。
 */
export const hdr = (hex, mul = 2.6) => new THREE.Color(hex).multiplyScalar(mul)

/**
 * 布景进出场：整厅沿 Y 穿过地板交接（升降台），prog 0→1 同时供各 rig
 * 自己拿去算材质不透明度、亮灯时机。
 *
 * 三个参数都是拿帧序列调出来的（tmp/switch-shot.mjs 逐帧看）：
 *  1. 行程 2.2m 而不是 1.5m —— 最高的那台人形 1.8m，1.5m 行程走到一半时
 *     它还有大半个身子站在地板线上，与新厅并排。行程盖过厅高，两厅的
 *     交接就发生在地板线上下各一条，不碰面（地面不透明，线以下看不见）。
 *  2. 离场比进场快一倍多 —— 老厅「让位」要利落，新厅「登台」要从容。
 *     两边同速就是上一版的观感：新厅都长到位了、HUD 卡片都亮了，老厅还在
 *     它们中间慢慢往下磨。
 *  3. 位移不吃 damp 的原值：damp 是指数趋近，起步就是最大速度
 *     （1.5m × 3.2 ≈ 4.8m/s），厅读作「被弹出来」。过一道 smoothstep 之后
 *     两端速度归零，起步与落位都是静止的，中间才最快。
 *  4. 进场前先留 0.12s 的等一下 —— 老厅刚好收进地板线以下，新厅才开始
 *     探出头。实测（tmp/appear-probe.mjs）不留的时候两厅在地板线上有
 *     ~0.17s 并排，那一下就是「互穿」；留了之后读作一上一下接力的升降台。
 *
 * baseY：这套布景本来的离地高度。必须当参数传进来 ——
 * 之前是直接写 g.position.y = (1-p)*-1.5，于是 JSX 上给的 position={[0, 1.05, 0]}
 * 在第一帧就被抹成 0：AI 屏那套本来该飘在 1.05 的能量核，实际一直贴地摆着，
 * 而相机是对着 1.05 构图构的，整屏构图因此往下掉了一截。
 */
const TRAVEL = 2.2
const HOLD = 0.12
export function useAppear(active, speed = 3.2, baseY = 0) {
  const root = useRef(null)
  const prog = useRef(0)
  const hold = useRef(0)
  const prev = useRef(active)
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const g = root.current
    if (!g) return
    if (prev.current !== active) {
      prev.current = active
      if (active) hold.current = HOLD // 只在「刚翻成当前屏」那一下等，首帧载入不算 prev 变化
    }
    if (active && hold.current > 0) {
      hold.current -= dt
      g.visible = false // 等位期间还在地板以下，本来也不该画
      return
    }
    prog.current = damp(prog.current, active ? 1 : 0, active ? speed : speed * 2.2, dt)
    g.visible = prog.current > 0.02
    const p = prog.current
    g.position.y = baseY - (1 - p * p * (3 - 2 * p)) * TRAVEL
  })
  return [root, prog]
}

/* ---------- 地台：实心暗底 + 网格线 + 径向淡出 + 远处地平辉光 ----------
   用 fwidth 求线宽，网格在任何 dpr / 透视下都是恒定 1 屏幕像素，
   不会出现远处摩尔纹（这是这类科技地台最容易翻车的点）。

   上一版只有一层悬空的网格线，镜头一抬就看见「世界之外是纯黑」，
   三屏都像飘在虚空里 —— 所以补了实心暗底（接住主体）与地平辉光（给出纵深尽头）。

   这一版把「缓慢外扩的扫描环」删了（用户：去掉地上转的光带）。它跟链屏那圈
   gossip 环是一族东西：匀速的一圈光在停帧里就是一个呼啦圈，而且它跟任何业务
   事件都没有因果关系。还有一个更实在的理由：那个环在 r 上只有 0.03 宽，
   铺到透视深处就留不下一个像素，抗锯齿直接失效 —— 实测拍出来是地板上一圈
   放射状的锯齿纹（tmp/audit/chain-1.png），比看板还抢眼。 */
const floorVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const floorFrag = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uBase;
uniform float uSize;
varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  /* 每 5 格一道粗线：只有细线会像噪声，有主次才像测绘图 */
  vec2 g5 = abs(fract(p / 5.0 - 0.5) - 0.5) / fwidth(p / 5.0);
  float major = 1.0 - min(min(g5.x, g5.y), 1.0);

  float r = length(vUv - 0.5) * 2.0;
  float fade = 1.0 - smoothstep(0.18, 0.92, r);
  /* 网格自己也要淡出：上一版 line/major 根本不乘淡出项，46×46 的格子
     一路铺到画面四角，与实验室的透视灭点打架 —— 屏幕边缘那层“多余的格子”
     就是底噪。收到中心脚下，让地面只负责「把主体接住」 */
  float gridFade = 1.0 - smoothstep(0.10, 0.42, r);
  /* 中心脚下的一汪光：把主体「焊」在台上，替掉开销极高的真实反射 */
  float pool = exp(-r * r * 9.0);
  /* 远处地平线：越靠画面深处越亮一点，读得出「房间有尽头」 */
  float horizon = smoothstep(0.42, 1.0, r) * (1.0 - smoothstep(0.86, 1.0, r));

  /* 五项贡献继续往下拧：上一版拍出来不是“一张测绘网格”而是“一层雾”，
     而且这层雾把主体从背景里顶不出来的事做了反向 —— 主体应该是最亮的，
     地面应该是全场最暗的大块。思路：面全部压暗，只把对比留给线；
     线的权重再降一档、光池抬一档 —— 近景那格大蓝网格读作“廉价线框地板”，
     而脚下一汪光才读作“重量” */
  vec3 col = uBase * (1.0 - fade * 0.72)
    + uColor * ((line * 0.075 + major * 0.13) * gridFade + pool * 0.10 + horizon * 0.05);
  /* 不透明输出：底与线一次画完，省掉一整层 alpha 混合 */
  gl_FragColor = vec4(col, 1.0);
}
`

export function Floor({ accent = '#5FA8FF', size = 46 }) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(accent) },
      /* 与场景 background / fog 同色：不然这块 46×46 的方地会露出一个矩形边 */
      uBase: { value: new THREE.Color('#04070d') },
      uSize: { value: size },
    }),
    [size],
  )
  const target = useMemo(() => new THREE.Color(accent), [accent])
  useFrame((_, delta) => {
    /* 切屏时地台颜色跟着业务的主题色走，慢一点，别抢镜头 */
    uniforms.uColor.value.lerp(target, 1 - Math.exp(-1.8 * Math.min(delta, 0.05)))
  })
  return (
    <mesh name="floor" rotation-x={-Math.PI / 2} position-y={0} renderOrder={-1}>
      <planeGeometry args={[size, size, 1, 1]} />
      <shaderMaterial vertexShader={floorVert} fragmentShader={floorFrag} uniforms={uniforms} />
    </mesh>
  )
}

/** 贴地软光斑：给每个布景一个“落在台上”的接触感，比真阴影便宜得多 */
export function ContactGlow({ radius = 1.6, color = '#5FA8FF', opacity = 0.5, y = 0.012 }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grd.addColorStop(0, 'rgba(255,255,255,0.95)')
    grd.addColorStop(0.45, 'rgba(255,255,255,0.32)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  )
}

/* 贴地暗斑的共用贴图：一张 128² 的径向黑，全场几十个实例共用一份
   （ContactGlow 那份是 useMemo 每实例一张，这里不该再跟着复制） */
let _shadeTex = null
function shadeTex() {
  if (_shadeTex) return _shadeTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(0,0,0,0.92)')
  grd.addColorStop(0.42, 'rgba(0,0,0,0.5)')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  _shadeTex = new THREE.CanvasTexture(c)
  return _shadeTex
}

/** 贴地暗斑：ContactGlow 的反面。加色光斑只说“这里在发光”，
    而让一个小东西真正落地的是它自己遮住的那片暗 —— 没有它，
    0.2m 高的 AGV 在暗地板上就是一块贴上去的贴片（用户：要有 3D 感）*/
export function ContactShade({ radius = 0.4, opacity = 0.55, y = 0.004 }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={shadeTex()} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/* ---------- 地面品牌字标：把「天择教育」漆在三间房的地板上 ----------
   为什么漆在地上而不是叠在 DOM 上：首屏原本只在顶栏提过一次公司名，而这一屏
   最大的一块闲置权重就是脚下那片地板。先试过在排版层加一枚描边巨字 TIANZE，
   实测不成立：链屏与 AI 屏的上半屏本来就压着六块 DOM 牌与五块智能体界面，
   巨字横过牌面读作脏（z-[70] 那层画在 drei Html 牌之上，压不到牌后面去），
   而把描边降到看不脏的那一档，品牌存在感也就一并没了。

   漆在地面标线同一层，它就跟「冷通道 / 算力区」是同一族东西：一间真的交付
   出去的实验室，地上本来就该有归属铭牌。

   字高方向必须按俯仰角反拉伸（anamorphic）：机位对地板的掠射角只有 16~24°，
   正方形字原样打下去在屏幕上只剩三分之一高，读出来是一条糊带。三屏的拉伸量
   差得远（具身 3.9×、链 2.3×、AI 3.6×），所以是一张纹理配三组非等比缩放，
   而不是三张纹理。位量由 tmp/floor-brand.mjs 拿真相机矩阵反解（屏幕空带 → 地板）。

   只给四个汉字、不带六边形标：图形经不起单向 3.9× 拉伸（拉完就不是那个 logo 了），
   而拉丁字 TIANZE 在顶栏已经有它的位置。 */
const BRAND_QUAD = { w: 2.125, d: 0.531 } // 1360×340 画布的不拉伸字框（640 texel/m）
/* 反解算出来的是「这条空带塞得下多大」，不是「品牌该有多大」。按上限漆满，地上的
   铭牌就开始跟标题抢权重了 —— 它该读作房间里的标线，不是第二个 headline。
   整体回退一档：两轴同缩，掠射压缩的比例不动，字形不会变扁 */
const BRAND_SIZE = 0.8
/* pos = 字框中心 (x, z)；scale = [宽, 深度]，深度方向那一档就是反拉伸量。
   具身屏那一处落在演示岛上（岛面 y 0.03），所以 y 另给一档：漆在岛面以下会被抹掉 */
const BRAND_PLACE = {
  embodied: { pos: [-1.14, 0.47], scale: [0.694, 2.732], y: 0.05 },
  chain: { pos: [-1.53, 2.04], scale: [1.019, 2.337], y: 0.02 },
  ai: { pos: [-1.45, 1.5], scale: [0.823, 2.939], y: 0.02 },
}
/* 具身与 AI 的 z 在反解值上又往相机方向推了十几公分：反解只保证出厂机位下那一条
   屏幕空带，而镜头常驻漂移（±十几像素）。tmp/floor-live.mjs 量到原位的上缘离
   copy 那一列最后那行状态字只剩 2~7px —— 漂移再大一点就上脸了。往下让到 15~20px
   的余量，下方离底部条还有二十几像素，两边都不动 */
/* 具身屏的进场门控：装配分镜走完（BUILD_END 5.4s）再加半秒阻尼沉降。
   漂移那一档能靠挪位让出来，分镜那一档不能：开场那 5.4s 相机在俯视高位走曲线
   轨道，同一个地面坐标会被顶到文案底线上四十多像素 —— 要躲它就得把字标推去岛的
   右边、跟着机器进场的位置跑。地上的铭牌本来就属于「装完了之后的房间」：等机器
   落位再浮现，既不撞位也是节奏，而那 5.4s 里地上本来就在长东西，不缺这一块。
   注：时钟现在等 GLB 到位才走（EmbodiedRig），所以这一段量的是“看过多少戏”，
   不是“页面开了多久”—— 慢网下铭牌只会跟着晚出，不会提前压在没装完的地上。
   跟 BUILD_END 5.4 同一次压缩里从 8.1 收到 5.9：还是“轨道走完再迟 0.5s”，
   而 skipBuild() 快进时 bt 照样越过这里 —— 跳过片头的人直接拿到带铭牌的终态 */
const BRAND_REVEAL = 5.9
const BRAND_GEO = new THREE.PlaneGeometry(BRAND_QUAD.w, BRAND_QUAD.d)
const _fb = new THREE.Vector3()
let _brandTex = null
function brandTex() {
  if (_brandTex) return _brandTex
  const c = document.createElement('canvas')
  c.width = 1360
  c.height = 340
  const g = c.getContext('2d')
  g.clearRect(0, 0, c.width, c.height)
  g.font = 'bold 340px "Microsoft YaHei", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  /* 冷白偏蓝、半透：与地面区域字标同一家族。不取近白 —— Bloom 阈值 1.8 虽然
     吃不到它，但 AGX 会把近白往中性灰里抽，反而脏在辉光地板上 */
  g.fillStyle = 'rgba(203,224,250,0.62)'
  g.fillText('天择教育', c.width / 2, c.height / 2)
  _brandTex = new THREE.CanvasTexture(c)
  _brandTex.colorSpace = THREE.SRGBColorSpace
  _brandTex.anisotropy = 8 // 掠射角下各向异性就是远处那半个字的命
  return _brandTex
}

/** 地面品牌字标：一块贴地矩形，换屏时换漆位。
   不跟着画质档关掉：它是这一屏唯一的品牌位，而成本只是一块 400×100 像素的透明片。 */
export function FloorBrand({ variant = 'embodied' }) {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: brandTex(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }),
    [],
  )
  const ref = useRef(null)
  const placed = useRef('')
  useFrame((state, delta) => {
    const g = ref.current
    if (!g) return
    if (placed.current !== variant) {
      /* 换屏先就地抹掉，抹干净了再挪位：漆在地上的东西不该当着人滑过去，
         而切屏本来就在飞镜头 —— 看不见的那一瞬就是它被重漆的那一瞬 */
      if (mat.opacity > 0.02) {
        mat.opacity = damp(mat.opacity, 0, 16, delta)
        return
      }
      placed.current = variant
      const p = BRAND_PLACE[variant] || BRAND_PLACE.embodied
      g.position.set(p.pos[0], p.y, p.pos[1])
      g.scale.set(p.scale[0] * BRAND_SIZE, p.scale[1] * BRAND_SIZE, 1)
    }
    /* 分镜没走完就不浮现：只挡具身屏那一段曲线机位，链 / AI 屏不受影响，
       而滚回具身屏时 buildClock 会重演（EmbodiedRig 那边沉到底就归零）——
       重演再一次，字标也就再浮现一次，跟机器进场同拍 */
    const cine = variant === 'embodied' && buildClock.active && buildClock.t < BRAND_REVEAL
    mat.opacity = damp(mat.opacity, cine ? 0 : 1, cine ? 16 : 5, delta)
    /* 探针（tmp/floor-live.mjs）：把字框四角过一遍实时相机，读回屏幕矩形。
       BRAND_PLACE 那一组数是拿出厂机位静态反解的，而镜头还带漂移 —— 只看截图
       分不出「字标跑到 DOM 上」与「本来就没撞」。只进 DEV 分支，生产包不会
       多挂这个全局；分镜期间不报，免得把已经门控掉的机位算进包络 */
    if (import.meta.env.DEV && !cine) {
      const p = BRAND_PLACE[variant] || BRAND_PLACE.embodied
      const hw = (BRAND_QUAD.w / 2) * g.scale.x
      const hd = (BRAND_QUAD.d / 2) * g.scale.y
      let x0 = 1e9
      let x1 = -1e9
      let y0 = 1e9
      let y1 = -1e9
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        _fb.set(p.pos[0] + sx * hw, p.y, p.pos[1] + sz * hd).project(state.camera)
        const px = (_fb.x * 0.5 + 0.5) * state.size.width
        const py = (-_fb.y * 0.5 + 0.5) * state.size.height
        if (px < x0) x0 = px
        if (px > x1) x1 = px
        if (py < y0) y0 = py
        if (py > y1) y1 = py
      }
      window.__floorBrand = [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), +mat.opacity.toFixed(2)]
    }
  })
  return <mesh ref={ref} name="floor-brand" rotation-x={-Math.PI / 2} geometry={BRAND_GEO} material={mat} />
}

/* ============================================================
 * FlowArc：一段有弯向的数据链路（弯管 + 沿线跑的包）
 * ------------------------------------------------------------
 * 替掉原来的 FlowBeam（一根拉直的开口圆柱）。直的为什么不行：
 * 十几条两两相连的直线同时在场就是一张蜘蛛网，而且它们在屏幕上没有
 * 先后、也没有因果 —— 读不出"谁把什么交给谁"。弯管一次解决三件事：
 *   1. 弧能绕开中间那块大牌，线不从别人的脸前穿过去；
 *   2. 弯向本身就是方向感（数据从哪边绕过来），停帧里也读得出来；
 *   3. 弧的中点往镜头方向抬一点，同一平面上的几条线不会叠成一根。
 * 几何只在建的时候算一次：面板只做亮度与几毫米的微动，包沿曲线跑，
 * 代价与那根直筒相同（一个 mesh、两个 uniform、逐帧只改 transform）。
 * ============================================================ */
const arcVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const arcFrag = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  /* TubeGeometry 的 uv.x 就是沿管长（0=起点 a，1=终点 b），uv.y 绕管截面 */
  float x = vUv.x;
  float endFade = smoothstep(0.0, 0.07, x) * smoothstep(1.0, 0.93, x);
  float edge = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
  /* 彗头 + 拖在后面的尾：头的位置就是"这一条数据此刻走到哪" */
  float m = fract(x * 2.0 - uTime * uSpeed);
  float head = exp(-pow((m - 0.5) * 8.5, 2.0));
  float tail = smoothstep(0.0, 0.5, m) * (1.0 - m) * 0.45;
  /* 一格一格的短划往前挪：连续的一条亮带读作"这里有一根线"，
     断开行走的短划才读作"有一串数据正在过" */
  float dash = pow(0.5 + 0.5 * cos((x * 42.0 - uTime * uSpeed * 3.1) * 6.2831), 10.0);
  float body = 0.03 + dash * 0.20;
  float a = (body + head + tail) * edge * endFade * uOpacity;
  gl_FragColor = vec4(uColor * (0.42 + (head + tail) * 2.6 + dash * 0.7), a);
}
`

/* 数据包那枚光点共用的贴图：一张 64² 的径向白，全场所有弧共用一份
   （ContactGlow 那种每实例 useMemo 一张的写法在这里会复制二十几张） */
let _glowTex = null
export function glowTex() {
  if (_glowTex) return _glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.28, 'rgba(255,255,255,0.72)')
  grd.addColorStop(0.62, 'rgba(255,255,255,0.16)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  _glowTex = new THREE.CanvasTexture(c)
  _glowTex.colorSpace = THREE.SRGBColorSpace
  return _glowTex
}
const PK_GEO = new THREE.PlaneGeometry(1, 1)
const _pk = new THREE.Vector3()

/**
 * 一条弧 + 沿它跑的两枚数据包。
 * a/b 是静态端点（世界或组内坐标），bend 是弯向的signed偏移，
 * active 是一个逐帧取值的函数（该弧此刻的强度 0~1），
 * onDeliver 在包跑到终点那一刻回调一次 —— 布景拿它去点亮收方。
 */
export function FlowArc({ a, b, bend = 0.16, lift = 0.1, towardCamera = 0.12, color = '#A98BFF', radius = 0.006, opacity = 0.9, speed = 0.34, size = 0.07, active, onDeliver }) {
  const tube = useRef(null)
  const packs = useRef([])
  const phase = useRef(0)
  const uni = useMemo(() => ({ uTime: { value: 0 }, uSpeed: { value: speed }, uOpacity: { value: 0 }, uColor: { value: hdr(color, 1.9) } }), [speed]) // eslint-disable-line react-hooks/exhaustive-deps
  const pkMat = useMemo(() => new THREE.MeshBasicMaterial({ map: glowTex(), color: hdr(color, 3.0), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), [color])
  /* 管身那份 shader 材质必须 memo：写在 JSX 里 material={new ...} 等于每次 render
     新造一份 —— 三个 rig 的 useFrame 每帧都在跑，一帧几十个 program 实例就这么漏出来了 */
  const arcMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: arcVert, fragmentShader: arcFrag, uniforms: uni, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }), [uni])
  const { geo, curve } = useMemo(() => {
    const A = a.clone()
    const B = b.clone()
    const d = B.clone().sub(A)
    /* 垂直于连线、留在 XY 面内的那一支 —— 弯向就是它的符号 */
    const perp = new THREE.Vector3(-d.y, d.x, 0).normalize()
    const mid = A.clone().add(B).multiplyScalar(0.5).addScaledVector(perp, bend)
    mid.y += lift
    mid.z += towardCamera
    const cv = new THREE.CatmullRomCurve3([A, mid, B], false, 'centripetal', 0.5)
    return { geo: new THREE.TubeGeometry(cv, 30, radius, 4, false), curve: cv }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b, bend, lift, towardCamera, radius])
  useEffect(() => () => geo.dispose(), [geo])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const m = tube.current
    if (!m) return
    uni.uTime.value = state.clock.elapsedTime
    const want = (active ? active() : 1) * opacity
    uni.uOpacity.value = damp(uni.uOpacity.value, want, 5, dt)
    const on = uni.uOpacity.value > 0.01
    m.visible = on
    if (!on) {
      for (const p of packs.current) if (p) p.visible = false
      return
    }
    /* 两枚包错开半拍：一枚读作"在走"，两枚读作"在流" */
    const t0 = (state.clock.elapsedTime * speed) % 1
    for (let i = 0; i < packs.current.length; i++) {
      const p = packs.current[i]
      if (!p) continue
      const f = (t0 + i * 0.5) % 1
      p.visible = true
      curve.getPoint(f, _pk)
      p.position.copy(_pk)
      p.quaternion.copy(state.camera.quaternion)
      p.scale.setScalar(size * uni.uOpacity.value * (0.35 + Math.sin(Math.PI * f) * 0.85))
      /* 绕回头部就是到站。只让第一枚记账：两枚一起报会把回执的频率抬到一倍，
         收方那块面板闪起来像抽搐 */
      if (i === 0) {
        if (f < phase.current && uni.uOpacity.value > opacity * 0.6) onDeliver?.()
        phase.current = f
      }
    }
  })
  return (
    <group>
      <mesh ref={tube} geometry={geo} material={arcMat} visible={false} renderOrder={2} />
      {[0, 1].map((i) => (
        <mesh key={i} ref={(el) => { packs.current[i] = el }} geometry={PK_GEO} material={pkMat} visible={false} renderOrder={2} />
      ))}
    </group>
  )
}
