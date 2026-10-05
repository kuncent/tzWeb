import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useCanvasVisibility } from '../../hooks/useCanvasVisibility'

/* ---------- 中央能量核心：Fresnel + FBM Noise Shader ---------- */
const coreVert = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vViewV;
varying vec3 vPos;
void main() {
  vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vViewV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`
const coreFrag = /* glsl */ `
uniform float uTime;
varying vec3 vNormalV;
varying vec3 vViewV;
varying vec3 vPos;

float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

void main() {
  float fres = pow(1.0 - clamp(dot(normalize(vNormalV), normalize(vViewV)), 0.0, 1.0), 2.0);
  float n = fbm(vPos * 2.6 + vec3(0.0, uTime * 0.22, uTime * 0.14));
  vec3 deep = vec3(0.04, 0.32, 0.92);
  vec3 bright = vec3(0.62, 0.86, 1.0);
  vec3 col = mix(deep, bright, smoothstep(0.32, 0.82, n));
  col += fres * vec3(0.42, 0.76, 1.0) * 1.5;
  float alpha = 0.72 + fres * 0.28;
  gl_FragColor = vec4(col, alpha);
}
`

/* ---------- 粒子系统：漂浮 / 汇聚 / 鼠标扰动 ---------- */
const particleVert = /* glsl */ `
attribute float aSize;
attribute float aSeed;
uniform float uTime;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.5 + aSeed * 6.283) * 0.10;
  p.x += cos(uTime * 0.34 + aSeed * 6.283) * 0.08;
  p.z += sin(uTime * 0.42 + aSeed * 12.566) * 0.06;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * (150.0 / -mv.z);
  vAlpha = 0.25 + 0.55 * (0.5 + 0.5 * sin(uTime * 0.9 + aSeed * 20.0));
}
`
const particleFrag = /* glsl */ `
varying float vAlpha;
void main() {
  float d = distance(gl_PointCoord, vec2(0.5));
  float a = smoothstep(0.5, 0.06, d) * vAlpha;
  vec3 col = mix(vec3(0.16, 0.55, 1.0), vec3(0.62, 0.86, 1.0), vAlpha);
  gl_FragColor = vec4(col, a);
}
`

function Particles({ count }) {
  const ref = useRef()
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = 1.5 + Math.random() * 2.0
      const theta = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 1.5
      pos[i * 3] = Math.cos(theta) * r
      pos[i * 3 + 1] = y * 0.62
      pos[i * 3 + 2] = Math.sin(theta) * r
      size[i] = 1.2 + Math.random() * 2.6
      seed[i] = Math.random()
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry: geo, material: mat }
  }, [count])

  useFrame((state, delta) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    ref.current.rotation.y -= delta * 0.05
    /* 鼠标扰动：粒子层轻微跟随指针 */
    ref.current.position.x += (state.pointer.x * 0.22 - ref.current.position.x) * 0.04
    ref.current.position.y += (state.pointer.y * 0.14 - ref.current.position.y) * 0.04
  })
  return <points ref={ref} geometry={geometry} material={material} />
}

function Core() {
  const mat = useRef()
  const inner = useRef()
  const shell = useRef()
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    uniforms.uTime.value = t
    const s = 1 + Math.sin(t * 1.4) * 0.03
    inner.current.scale.setScalar(s)
    shell.current.rotation.y = t * 0.12
    shell.current.rotation.x = Math.sin(t * 0.2) * 0.2
  })
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.82, 64, 64]} />
        <shaderMaterial
          ref={mat}
          vertexShader={coreVert}
          fragmentShader={coreFrag}
          uniforms={uniforms}
          transparent
        />
      </mesh>
      {/* 白热内核（Bloom 拾取） */}
      <mesh ref={inner} scale={0.98}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color="#dff1ff" toneMapped={false} />
      </mesh>
      {/* 精密线框壳 */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.08, 2]} />
        <meshBasicMaterial color="#65bfff" wireframe transparent opacity={0.22} />
      </mesh>
    </group>
  )
}

function Rings() {
  const a = useRef()
  const b = useRef()
  const c = useRef()
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    a.current.rotation.z += delta * 0.12
    b.current.rotation.z -= delta * 0.08
    c.current.rotation.z += delta * 0.05
    a.current.rotation.x = Math.PI / 2.15 + Math.sin(t * 0.25) * 0.08
    b.current.rotation.x = Math.PI / 1.75 + Math.cos(t * 0.2) * 0.08
  })
  const ring = (radius, opacity) => (
    <mesh rotation={[Math.PI / 2.1, 0, 0]}>
      <torusGeometry args={[radius, 0.006, 8, 160]} />
      <meshBasicMaterial color="#65bfff" transparent opacity={opacity} />
    </mesh>
  )
  return (
    <group>
      <group ref={a}>{ring(1.5, 0.4)}</group>
      <group ref={b} rotation={[0.5, 0.3, 0]}>{ring(1.95, 0.28)}</group>
      <group ref={c} rotation={[-0.4, 0.2, 0]}>{ring(2.45, 0.18)}</group>
    </group>
  )
}

function Scene({ progress, lowPower }) {
  const parallax = useRef()
  const root = useRef()
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const p = progress ? progress.get() : 0
    /* 鼠标视差 */
    parallax.current.rotation.y += (state.pointer.x * 0.16 - parallax.current.rotation.y) * 0.05
    parallax.current.rotation.x += (-state.pointer.y * 0.1 - parallax.current.rotation.x) * 0.05
    /* 滚动驱动：核心旋转 + 粒子场展开 */
    root.current.rotation.y = t * 0.06 + p * 1.5
    const s = 0.94 + p * 0.16
    root.current.scale.setScalar(s)
  })
  return (
    <group ref={parallax}>
      <group ref={root}>
        <Core />
        <Rings />
        <Particles count={lowPower ? 600 : 1800} />
      </group>
      {!lowPower && (
        <EffectComposer>
          <Bloom intensity={0.85} luminanceThreshold={0.72} luminanceSmoothing={0.25} mipmapBlur />
        </EffectComposer>
      )}
    </group>
  )
}

export default function MatrixScene({ progress, lowPower = false }) {
  /* 滚出视口就停掉渲染循环：页面里同时有两个 WebGL 画布，不能让它们在屏外继续吃帧 */
  const { ref, frameloop } = useCanvasVisibility('320px')
  return (
    <Canvas
      ref={ref}
      frameloop={frameloop}
      dpr={lowPower ? [1, 1.35] : [1, 1.75]}
      camera={{ position: [0, 0, 6.2], fov: 40 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.6} />
      <Scene progress={progress} lowPower={lowPower} />
    </Canvas>
  )
}
