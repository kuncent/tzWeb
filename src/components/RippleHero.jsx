import { useEffect, useRef, useState } from 'react'

/* ============================================================
 * RippleHero —— react-bits 风格的「水波纹涟漪扩散切换」全幅背景
 * ------------------------------------------------------------
 * 两张纹理 + 一个 ripple 位移着色器：切换时一道波前从圆心向四周扩散，
 * 波前环带内对 UV 做径向阻尼正弦位移（新旧两图反向偏移，模拟水面折射），
 * 内侧换上新生图；伴随缓慢 Ken-Burns 缩放让画面「呼吸」。纯 WebGL1，
 * 无三方依赖；拿不到 WebGL 时退化为静态首图（object-cover），保证不白屏。
 * 默认 5.2s 自动切一张；某张图加载失败只会被踢出轮换，不会卡死整个轮播；
 * 滚出视口 / 标签页隐藏 / 用户偏好减少动态 时暂停，省电。
 * 用法：<PageHero backdrop={<RippleHero images={[{src,label}]} />} … />
 * ============================================================ */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uCur;
uniform sampler2D uNext;
uniform float uProgress;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uImg;
vec2 coverUV(vec2 uv, float A, float B){
  uv -= 0.5;
  if (A > B) { uv.y *= B / A; } else { uv.x *= A / B; }
  return uv + 0.5;
}
void main(){
  float A = uRes.x / uRes.y;
  float B = uImg.x / uImg.y;
  float t = clamp(uProgress, 0.0, 1.0);
  float e = t * t * (3.0 - 2.0 * t);

  /* 缩放只由时间驱动：过渡开始/结束时不改 z，避免切图瞬间画面回弹一下 */
  float z = 1.0 + 0.015 * sin(uTime * 0.12);
  vec2 c = coverUV(vUv, A, B);
  c = (c - 0.5) / z + 0.5;

  vec2 p = vUv - 0.5; p.x *= A;
  float d = length(p);
  vec2 dir = d > 0.0001 ? p / d : vec2(0.0);

  /* 波前：从圆心匀速扩散到四角之外（按画面对角线归一） */
  float maxD = length(vec2(A * 0.5, 0.5));
  float front = e * (maxD + 0.3);

  /* 波前环带内的涟漪位移：高斯包络 × 阻尼正弦，振幅随进度起落（两端为 0，
     静止时绝不留双影）；旧图顺位移、新图逆位移，波带里读出折射拉丝感 */
  float band = 0.30;
  float x = (d - front) / band;
  float ripple = exp(-x * x) * sin(x * 6.0) * 0.045 * sin(3.14159265 * e);
  vec2 disp = dir * ripple;

  /* 波前内侧已换成新图，外侧仍是旧图（柔和边界，非硬圆） */
  float f = 1.0 - smoothstep(front - 0.06, front + 0.06, d);
  vec3 col = mix(texture2D(uCur, c + disp).rgb, texture2D(uNext, c - disp).rgb, f);

  /* 波前一道轻冷色高光，强化「水波荡开」的 crest */
  float crest = exp(-2.0 * x * x);
  col += vec3(0.55, 0.72, 0.95) * crest * 0.10 * sin(3.14159265 * e);

  gl_FragColor = vec4(col, 1.0);
}`

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh)
    return null
  }
  return sh
}

function makeTex(gl) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  // 1x1 占位，避免纹理未加载完采样到空
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([6, 8, 13, 255]))
  return tex
}

export default function RippleHero({ images = [], interval = 5200, duration = 1600, caption }) {
  const canvasRef = useRef(null)
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || images.length === 0) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) { setOk(false); return }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()
    if (!vs || !fs) { setOk(false); return }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setOk(false); return }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const U = {
      cur: gl.getUniformLocation(prog, 'uCur'),
      next: gl.getUniformLocation(prog, 'uNext'),
      progress: gl.getUniformLocation(prog, 'uProgress'),
      time: gl.getUniformLocation(prog, 'uTime'),
      res: gl.getUniformLocation(prog, 'uRes'),
      img: gl.getUniformLocation(prog, 'uImg'),
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    const n = images.length
    const texs = []
    const dims = []          // 每张图真实宽高比（cover 映射用，不再硬编 16:9）
    const pool = []          // 加载成功的纹理序号：坏图踢出轮换，不卡死轮播
    let settledCount = 0
    let settled = false
    let dead = false
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const settle = () => {
      if (++settledCount < n) return
      settled = true
      if (pool.length === 0 && !dead) setOk(false) // 全挂 → 降级 <img> 静态首图
    }

    for (let i = 0; i < n; i++) {
      const tex = makeTex(gl)
      texs.push(tex)
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        if (dead) return
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        dims[i] = [img.naturalWidth || 16, img.naturalHeight || 9]
        pool.push(i)
        settle()
      }
      img.onerror = () => { if (!dead) settle() }
      img.src = images[i].src
    }

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr))
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; gl.viewport(0, 0, pw, ph) }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let poolIdx = 0, inTrans = false, hold = 0, trans = 0, last = 0, time = 0, raf = 0, visible = true

    const draw = (progress) => {
      const curI = pool[poolIdx] ?? 0
      const nextI = pool[(poolIdx + 1) % (pool.length || 1)] ?? curI
      gl.uniform1i(U.cur, 0); gl.uniform1i(U.next, 1)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texs[curI])
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texs[inTrans ? nextI : curI])
      gl.uniform1f(U.progress, progress)
      gl.uniform1f(U.time, time)
      gl.uniform2f(U.res, canvas.width, canvas.height)
      const dim = dims[curI] || [16, 9]
      gl.uniform2f(U.img, dim[0], dim[1])
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (!last) last = now
      const dt = Math.min(64, now - last); last = now
      if (!visible || document.hidden) return
      time += dt / 1000
      if (!settled) { draw(0); return }
      if (pool.length < 2 || reduce) { draw(0); return }
      if (!inTrans) {
        hold += dt
        if (hold >= interval) { inTrans = true; hold = 0 }
        draw(0)
      } else {
        trans += dt
        let p = trans / duration
        if (p >= 1) { p = 1; poolIdx = (poolIdx + 1) % pool.length; inTrans = false; trans = 0 }
        draw(p)
      }
    }
    raf = requestAnimationFrame(frame)

    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting }, { threshold: 0.02 })
    io.observe(canvas)

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      ro.disconnect(); io.disconnect()
      texs.forEach((t) => gl.deleteTexture(t))
      gl.deleteBuffer(buf); gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs)
    }
  }, [images, interval, duration])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-night" />
      {ok ? (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      ) : (
        images[0] && <img src={images[0].src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* 左侧 + 底部压暗，保证叠加文案可读 */}
      <div className="absolute inset-0 bg-gradient-to-r from-night/92 via-night/55 to-night/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/10 to-night/35" />
      {caption && (
        <span className="absolute bottom-4 right-5 hidden items-center gap-2 font-mono text-micro uppercase tracking-label text-white/45 md:inline-flex">
          <span className="h-1 w-1 rounded-full bg-brand-400/80" />
          {caption}
        </span>
      )}
    </div>
  )
}
