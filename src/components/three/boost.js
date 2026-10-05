import * as THREE from 'three'

/**
 * 统一提升真实 GLB 机型（T800 / Z1 / Go2 / Turtlebot3）的材质质感（自 KUN 具身教育实验室项目复用并强化）。
 *
 * 做法：把 GLB 自带的 MeshStandardMaterial 升级为带清漆/光泽的 MeshPhysicalMaterial ——
 * 白壳走「陶瓷 + 清漆」路线、金属件走「沉底高光 + 薄清漆」、深色结构件压低漫反射抬镜面，
 * 并统一加大 envMapIntensity（依赖 drei <Environment> 注入的 scene.environment）。
 *
 * 原材质 → 升级材质用 WeakMap 缓存：GLB 材质按引用共享、clone() 不复制材质，
 * 因此同一台机型多次上台只会升级一次，也不会污染原始资产。
 */
const upgraded = new WeakMap()

/* 需要从原材质继承的贴图与渲染标记 */
const COPY = [
  'map',
  'alphaMap',
  'aoMap',
  'aoMapIntensity',
  'bumpMap',
  'displacementMap',
  'displacementScale',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'emissiveIntensity',
  'transparent',
  'opacity',
  'alphaTest',
  'depthWrite',
  'side',
  'vertexColors',
  'flatShading',
  'toneMapped',
  'name',
]

const luma = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

function toPhysical(src) {
  if (upgraded.has(src)) return upgraded.get(src)

  const base = { color: src.color, emissive: src.emissive }
  for (const k of COPY) if (src[k] !== undefined) base[k] = src[k]

  const metal = (src.metalness ?? 0) > 0.5
  const light = luma(src.color) > 0.42
  let out

  if (metal) {
    // 金属件：更沉、高光更锐、反射更强，再覆一薄层清漆拉长反射
    out = new THREE.MeshPhysicalMaterial({
      ...base,
      metalness: Math.min(1, (src.metalness ?? 1) * 1.04),
      roughness: Math.max(0.18, (src.roughness ?? 0.5) * 0.6),
      envMapIntensity: 1.1,
      clearcoat: 0.34,
      clearcoatRoughness: 0.2,
    })
  } else if (light) {
    // 白色壳体：清漆抛光的陶瓷感 + 极轻 sheen，去掉塑料味
    out = new THREE.MeshPhysicalMaterial({
      ...base,
      metalness: 0.04,
      roughness: Math.min(0.24, (src.roughness ?? 0.3) * 0.68),
      envMapIntensity: 1.12,
      clearcoat: 1,
      clearcoatRoughness: 0.09,
      specularIntensity: 0.62,
      reflectivity: 0.5,
      sheen: 0.3,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#dbe8ff'),
    })
  } else {
    // 深色结构件：保留漫反射对比度（太亮会糊成一团），只抬镜面反射与清漆边缘
    out = new THREE.MeshPhysicalMaterial({
      ...base,
      metalness: Math.max(0.26, src.metalness ?? 0.2),
      roughness: Math.min(0.56, Math.max(0.3, (src.roughness ?? 0.5) * 0.88)),
      envMapIntensity: 0.95,
      clearcoat: 0.34,
      clearcoatRoughness: 0.26,
      specularIntensity: 0.55,
    })
  }

  if (base.normalMap) out.normalScale.copy(src.normalScale)
  const tex = out.map || out.roughnessMap || out.normalMap || out.emissiveMap
  if (tex) tex.anisotropy = 8
  out.dithering = true // 暗部渐变不出现条纹

  upgraded.set(src, out)
  return out
}

export function boostModelMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return
    const multi = Array.isArray(o.material)
    const mats = multi ? o.material : [o.material]
    const next = mats.map((m) => {
      if (!m.isMeshStandardMaterial) return m // 自发光/基础材质留给 Bloom 拾取
      if (m.isMeshPhysicalMaterial) {
        m.envMapIntensity = (m.metalness ?? 0) > 0.5 ? 1.1 : 1.15
        if (typeof m.clearcoat === 'number') {
          m.clearcoat = 1
          m.clearcoatRoughness = Math.min(m.clearcoatRoughness ?? 0.1, 0.07)
        }
        m.needsUpdate = true
        return m
      }
      return toPhysical(m)
    })
    o.material = multi ? next : next[0]
  })
}
