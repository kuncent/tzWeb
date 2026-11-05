import { useEffect, useRef, useState } from 'react'

/* ============================================================
 * RippleHero —— react-bits 风格的「水波纹切换」全幅背景
 * ------------------------------------------------------------
 * 两张纹理 + 一个 ripple 位移着色器：切换时从中心荡开一圈涟漪，
 * 涟漪经过处把旧图替换成新图，同时给一点缓慢的 Ken-Burns 缩放让
 * 画面「呼吸」。纯 WebGL1，无三方依赖；拿不到 WebGL 时退化为静态
 * 首图（object-cover），保证不白屏。默认 5.2s 自动切一张，滚出视口
 * / 标签页隐藏 / 用户偏好减少动态 时暂停，省电。
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
  vec2 p = vUv - 0.5; p.x *= A;
  float d = length(p);
  float amp = 0.10 * sin(3.14159265 * e);
  float wave = sin(d * 20.0 - e * 15.0);
  float ring = wave * amp * exp(-d * 2.0);
  vec2 dir = normalize(p + vec2(1e-5, 0.0));
  vec2 duv = dir * ring; duv.x /= A;
  float z = 1.0 + 0.02 * sin(uTime * 0.12) + 0.02 * e;
  vec2 c = coverUV(vUv, A, B);
  c = (c - 0.5) / z + 0.5;
  vec2 uvCur = c + duv;
  vec2 uvNext = c - duv;
  float front = e * 1.35;
  float mask = smoothstep(front + 0.10, front - 0.10, d);
  vec3 col = mix(texture2D(uCur, uvCur).rgb, texture2D(uNext, uvNext).rgb, mask);
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

export default function RippleHero({ images = [], interval = 5200, duration = 1200, caption }) {
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
    let loaded = 0
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    for (let i = 0; i < n; i++) {
      const tex = makeTex(gl)
      texs.push(tex)
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        loaded++
      }
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

    let idx = 0, next = 1 % n, inTrans = false, hold = 0, trans = 0, last = 0, time = 0, raf = 0, visible = true

    const draw = (progress) => {
      gl.uniform1i(U.cur, 0); gl.uniform1i(U.next, 1)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texs[idx])
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texs[inTrans ? next : idx])
      gl.uniform1f(U.progress, progress)
      gl.uniform1f(U.time, time)
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform2f(U.img, 16, 9)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (!last) last = now
      const dt = Math.min(64, now - last); last = now
      if (!visible || document.hidden) return
      time += dt / 1000
      if (n < 2 || reduce) { draw(0); return }
      if (!inTrans) {
        hold += dt
        if (hold >= interval) { inTrans = true; hold = 0; next = (idx + 1) % n }
        draw(0)
      } else {
        trans += dt
        let p = trans / duration
        if (p >= 1) { p = 1; idx = next; inTrans = false; trans = 0 }
        draw(p)
      }
    }
    raf = requestAnimationFrame(frame)

    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting }, { threshold: 0.02 })
    io.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect(); io.disconnect()
      texs.forEach((t) => gl.deleteTexture(t))
      gl.deleteBuffer(buf); gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs)
    }
  }, [images, interval, duration])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#06080d]" />
      {ok ? (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      ) : (
        images[0] && <img src={images[0].src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* 左侧 + 底部压暗，保证叠加文案可读 */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#06080d]/92 via-[#06080d]/55 to-[#06080d]/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-[#06080d]/10 to-[#06080d]/35" />
      {caption && (
        <span className="absolute bottom-4 right-5 hidden items-center gap-2 font-mono text-micro uppercase tracking-label text-white/45 md:inline-flex">
          <span className="h-1 w-1 rounded-full bg-brand-400/80" />
          {caption}
        </span>
      )}
    </div>
  )
}
