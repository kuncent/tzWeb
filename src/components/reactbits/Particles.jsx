import { useEffect, useRef } from 'react'
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl'

/* ============================================================
 * Particles（合流版）—— 基于 React Bits 的免费 Particles 组件
 * https://www.reactbits.dev/animations/particles
 * ------------------------------------------------------------
 * 原组件是一团缓慢自转的星尘；这里保留它的骨架（OGL + 球内撒点 + 柔边圆点 shader
 * + 逐粒尺寸/闪烁差异），把「旋转」换成「汇聚」：粒子从画面下半部生成，沿各自的
 * 弧线收向 uFocus（由调用方传入的 DOM 锚点换算而来，通常是中心徽标），抵达时淡出。
 * 进度由组件内部的时钟推进，完成后回调一次，因此收敛过程不会引发 React 逐帧重渲染。
 *
 * props 中 focusRef 是汇聚目标；gather 置 true 后按 gatherDuration 秒走完。
 *
 * lanes > 0 时改为「沿引导线下行」：粒子按 lanes 条竖直车道从画面上缘出发，
 * 沿一条与调用方 SVG 引导线同形的二次贝塞尔（起点竖直、控制点在中上部、
 * 终点收到 uFocus 外沿壳层）汇向中心。lanes = 0 保留原来的底部上浮行为。
 * ============================================================ */

const hexToRgb = (hex) => {
  const raw = String(hex).replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const int = parseInt(full, 16)
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255]
}

const vertex = /* glsl */ `
  precision highp float;

  attribute vec3 aRand;
  attribute vec3 aTarget;
  attribute vec3 color;
  attribute float aScale;
  attribute float aSeed;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform vec2 uFocus;
  uniform vec2 uBounds;
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uCamera;
  uniform float uLanes;
  uniform float uArrive;

  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vDir;
  varying float vPx;

  /* 沿车道下行的二次贝塞尔：起点在画面上缘、控制点在上部、终点收到聚焦点。
     同一车道内的侧向抖动压到极小——多道流光合在同一条曲线上才会融成一条光带，
     否则会散成一把「铅笔排线」。 */
  vec3 lanePos(float e) {
    float lane = floor(aRand.y * uLanes);
    float laneW = 2.0 * uBounds.x / uLanes;
    float laneX = (-uBounds.x + (lane + 0.5) * laneW) + (aRand.z - 0.5) * laneW * 0.002;
    vec2 n = normalize(vec2(laneX - uFocus.x, uBounds.y * 0.92));
    /* 终点落在徽标圈外沿：光带是「入圈」，不是被圆盘裁掉 */
    float rr = uArrive > 0.01 ? uArrive : 0.06;
    vec3 p0 = vec3(laneX, uBounds.y * 1.06, 0.0);
    vec3 p1 = vec3(laneX, uBounds.y * 0.34, 0.0);
    vec3 p2 = vec3(uFocus + n * rr + aTarget.xy * 0.1, 0.0);
    float m = 1.0 - e;
    return m * m * p0 + 2.0 * m * e * p1 + e * e * p2;
  }

  /* 起步的横向游移：极轻，到中途就衰减为零，不破坏「一条直线」的读感 */
  float wanderAt(float ee) {
    return sin(uTime * 1.6 + aSeed * 6.2831) * 0.03 * pow(1.0 - ee, 3.0);
  }

  void main() {
    vColor = color;

    /* 车道相位差：六条车道错开约 60ms（0.05 × 1.2s），不是齐步走 */
    float lane = floor(aRand.y * uLanes);
    float phase = uLanes > 1.5 ? (lane / uLanes) * 0.05 : 0.0;
    float t = clamp((uProgress - phase) / 0.95, 0.0, 1.0);
    /* 幂次加速：越靠近徽标越快，是「抵达」而不是匀速平移 */
    float e = pow(t, 1.55);

    vec3 pos;
    vec3 prev;

    if (uLanes > 0.5) {
      pos = lanePos(e);
      pos.x += wanderAt(e);
      float pe = max(0.0, e - 0.06);
      prev = lanePos(pe);
      prev.x += wanderAt(pe);
    } else {
      /* 起点：画面下缘到聚焦点下方之间横向铺开的薄层，越靠中间越密，形成漏斗 */
      float spread = 0.3 + 0.7 * aRand.z;
      float sx = (aRand.y * 2.0 - 1.0) * uBounds.x * spread;
      float sy = mix(-uBounds.y - 0.4, uFocus.y - 0.9, aRand.x);
      float sz = (aRand.z * 2.0 - 1.0) * 1.6;
      vec3 start = vec3(uFocus.x + sx, sy, sz);
      start.y += sin(uTime * 0.8 + aSeed * 6.2831) * 0.06;
      vec3 target = vec3(uFocus + aTarget.xy, aTarget.z);

      pos = mix(start, target, e);
      prev = mix(start, target, max(0.0, e - 0.06));
    }

    /* 屏幕坐标（y 向下）里的运动方向，供片元把点精灵旋转成光带 */
    vec2 dv = vec2(pos.x - prev.x, -(pos.y - prev.y));
    float dl = length(dv);
    vDir = dl > 1e-5 ? dv / dl : vec2(0.0, 1.0);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float size = uSize * aScale * uPixelRatio * (uCamera / max(-mv.z, 0.001)) * mix(1.0, 0.9, e);
    float ps = clamp(size, 8.0, 148.0 * uPixelRatio);
    gl_PointSize = ps;
    gl_Position = projectionMatrix * mv;
    /* 片元要按「设备像素 → CSS 像素」换算线宽与头径，所以要拿到真实精灵尺寸 */
    vPx = ps;

    /* 抵达前约 120ms 淡出：光带融进圆环，而不是突然断掉 */
    vAlpha = smoothstep(0.0, 0.05, e) * (1.0 - smoothstep(0.92, 1.0, e)) * (0.85 + 0.15 * aRand.x);
  }
`

const fragment = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vDir;
  varying float vPx;

  uniform float uGlow;
  uniform float uOpacity;
  uniform float uPixelRatio;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;

    /* 把点精灵旋到运动方向上：p.y 为「顺流」方向，正端是彗头 */
    vec2 d = normalize(vDir);
    vec2 p = vec2(d.y * uv.x + d.x * uv.y, -d.x * uv.x + d.y * uv.y);

    /* 换算到 CSS 像素：线宽、头径都是绝对尺寸，不随精灵大小漂移 */
    float cpx = max(vPx, 1.0) / max(uPixelRatio, 0.5);
    vec2 q = p * cpx;

    float headY = 0.19 * cpx;
    float tailY = -0.5 * cpx;
    float along = clamp((q.y - tailY) / (headY - tailY), 0.0, 1.0);

    /* 锥形：靠头约 1.7px 宽，往尾收到 0.8px，绝不是等宽线 */
    float halfW = mix(0.4, 0.85, pow(along, 2.0));
    float body = 1.0 - smoothstep(halfW * 0.45, halfW, abs(q.x));

    /* 沿长度的幂次衰减（非线性），尾巴几乎化进底色 */
    float fall = pow(along, 1.75);
    float a = body * fall;

    /* 头：约 3px 的亮核 + 约 8px 的柔光——全场景唯一的硬边 */
    float hd = length(vec2(q.x, q.y - headY));
    float core = 1.0 - smoothstep(1.0, 2.2, hd);
    float bloom = (1.0 - smoothstep(1.8, 7.0, hd)) * 0.4;
    a = max(a, max(core, bloom));

    if (a <= 0.004) discard;

    /* 颜色斜坡：深品牌蓝（尾）→ 饱和亮蓝（前段）→ 近白（核）。
       浅底上「更亮」等于更白、更饱和，所以不做加色混合。 */
    vec3 col = mix(vColor * 0.78, vec3(0.09, 0.46, 1.0), pow(along, 1.25));
    col = mix(col, vec3(0.97, 0.99, 1.0), core);

    gl_FragColor = vec4(col, a * vAlpha * uOpacity);
  }
`

export default function Particles({
  particleCount = 220,
  particleColors = ['#1677ff'],
  particleBaseSize = 90,
  sizeRandomness = 1,
  glow = 0.6,
  opacity = 0.9,
  cameraDistance = 20,
  fov = 35,
  focusRef,
  gather = false,
  gatherDuration = 2.6,
  gatherRadius = 1.8,
  lanes = 0,
  arriveRadius = 0,
  onGatherComplete,
  className = '',
  style,
}) {
  const hostRef = useRef(null)
  const stateRef = useRef({ gather, gatherDuration, onGatherComplete })
  const completeRef = useRef(false)

  useEffect(() => {
    stateRef.current = { gather, gatherDuration, onGatherComplete }
    if (!gather) completeRef.current = false
  }, [gather, gatherDuration, onGatherComplete])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer
    try {
      renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) })
    } catch {
      return
    }
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    const canvas = gl.canvas
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    host.appendChild(canvas)

    const camera = new Camera(gl, { fov })
    camera.position.set(0, 0, cameraDistance)

    const count = Math.max(1, Math.round(particleCount))
    const rand = new Float32Array(count * 3)
    const target = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const seeds = new Float32Array(count)
    const palette = (particleColors.length ? particleColors : ['#1677ff']).map(hexToRgb)

    for (let i = 0; i < count; i++) {
      rand[i * 3] = Math.random()
      rand[i * 3 + 1] = Math.random()
      rand[i * 3 + 2] = Math.random()

      /* 汇聚落点：聚焦点外一圈发散的壳层，正好落在徽标外缘，不会被圆盘吞掉 */
      const a = Math.random() * Math.PI * 2
      const r = gatherRadius * (0.74 + Math.pow(Math.random(), 1.5) * 0.52)
      target[i * 3] = Math.cos(a) * r
      target[i * 3 + 1] = Math.sin(a) * r * 0.92
      target[i * 3 + 2] = (Math.random() - 0.5) * 0.5

      const [cr, cg, cb] = palette[Math.floor(Math.random() * palette.length)]
      const jitter = 0.94 + Math.random() * 0.12
      colors[i * 3] = Math.min(1, cr * jitter)
      colors[i * 3 + 1] = Math.min(1, cg * jitter)
      colors[i * 3 + 2] = Math.min(1, cb * jitter)

      scales[i] = Math.max(0.25, 1 + (Math.random() - 0.5) * sizeRandomness)
      seeds[i] = Math.random()
    }

    const geometry = new Geometry(gl, {
      aRand: { size: 3, data: rand },
      aTarget: { size: 3, data: target },
      color: { size: 3, data: colors },
      aScale: { size: 1, data: scales },
      aSeed: { size: 1, data: seeds },
    })

    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uFocus: { value: [0, 0] },
        uBounds: { value: [10, 6] },
        uPixelRatio: { value: renderer.dpr || 1 },
        uSize: { value: particleBaseSize * 0.03 },
        uCamera: { value: cameraDistance },
        uLanes: { value: Math.max(0, lanes) },
        uArrive: { value: 0 },
        uGlow: { value: glow },
        uOpacity: { value: opacity },
      },
    })

    /* 点图元：OGL 的 Mesh 默认按三角形画，必须显式改成 POINTS */
    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS })

    const resize = () => {
      const { clientWidth, clientHeight } = host
      if (!clientWidth || !clientHeight) return
      renderer.setSize(clientWidth, clientHeight)
      camera.perspective({ aspect: clientWidth / clientHeight })

      const hHalf = Math.tan(((fov / 2) * Math.PI) / 180) * cameraDistance
      const wHalf = hHalf * (clientWidth / clientHeight)
      program.uniforms.uBounds.value = [wHalf, hHalf]
      /* 抵达半径按 CSS 像素给，换算成 z=0 平面上的世界单位 */
      program.uniforms.uArrive.value = (arriveRadius / clientHeight) * 2 * hHalf

      /* 把锚点（中心徽标）的屏幕位置换算成 z=0 平面上的世界坐标 */
      const hostRect = host.getBoundingClientRect()
      const anchor = focusRef && focusRef.current
      if (anchor) {
        const r = anchor.getBoundingClientRect()
        const nx = (r.left + r.width / 2 - hostRect.left) / hostRect.width
        const ny = (r.top + r.height / 2 - hostRect.top) / hostRect.height
        program.uniforms.uFocus.value = [(nx * 2 - 1) * wHalf, (1 - ny * 2) * hHalf]
      }
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(host)

    let raf = 0
    let last = performance.now()
    let elapsed = 0
    let progress = 0
    let visible = false

    const frame = (now) => {
      raf = 0
      const dt = Math.min(64, now - last)
      last = now
      elapsed += dt / 1000
      program.uniforms.uTime.value = elapsed

      const s = stateRef.current
      if (s.gather && progress < 1) {
        progress = Math.min(1, progress + dt / Math.max(0.2, s.gatherDuration) / 1000)
        program.uniforms.uProgress.value = progress
        if (progress >= 1 && !completeRef.current) {
          completeRef.current = true
          if (s.onGatherComplete) s.onGatherComplete()
        }
      } else if (!s.gather && progress !== 0) {
        progress = 0
        program.uniforms.uProgress.value = 0
      }

      renderer.render({ scene: mesh, camera })
      /* 合流结束、粒子全部淡出后停帧，不再空转 */
      if (progress >= 1 && completeRef.current) return
      /* 离屏时不排下一帧 */
      if (visible) raf = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    /* 只在台上时渲染：离开视口就暂停，回来接着走 */
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) kick()
      },
      { threshold: 0 },
    )
    io.observe(host)

    renderer.render({ scene: mesh, camera })
    kick()

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      host.removeChild(canvas)
      const lose = gl.getExtension('WEBGL_lose_context')
      if (lose) lose.loseContext()
    }
  }, [particleCount, particleColors, particleBaseSize, sizeRandomness, glow, opacity, cameraDistance, fov, lanes, arriveRadius, gatherRadius, focusRef])

  return <div ref={hostRef} aria-hidden className={className} style={style} />
}
