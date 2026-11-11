/* ============================================================
 * 荣誉墙牌匾 · 矢量重绘生成器
 * ------------------------------------------------------------
 * 输入：C:\Users\tz012\Pictures\合作院校 下 25 张实拍（已去重为 20 块牌匾），
 *       另加后期追加的「专精特新中小企业」1 块，共 21 块
 * 输出：public/images/honors/*.svg（1600×1200，正面平视、无透视、纯色背景）
 *       src/data/honors.js（文字 ↔ 文件名的唯一清单，页面直接引用）
 *
 * 为什么不用文生图：牌匾上全是机构全称与证书编号，扩散模型会写错字。
 * 这里用 SVG 逐字排版，文字 100% 等于识别结果，且任意放大不失真。
 * 校徽/公章按原牌匾的构图重绘为「简化徽记」（校名首字 + 英文环），
 * 不复制官方标志，避免把近似图形当作正式校徽使用。
 *
 * 运行：node scripts/gen-honors.mjs
 * ============================================================ */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/images/honors')

const W = 1600
const H = 1200

const SERIF = "'Songti SC','STSong','Noto Serif SC','Source Han Serif SC','SimSun',serif"
const SANS = "'PingFang SC','HarmonyOS Sans SC','Noto Sans SC','Microsoft YaHei',sans-serif"
const KAI = "'Kaiti SC','STKaiti','KaiTi','Noto Serif SC',serif"
const EN = "'Helvetica Neue',Helvetica,Arial,sans-serif"

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function txt(x, y, str, o = {}) {
  const {
    size = 48,
    fill = '#141414',
    font = SANS,
    weight = 400,
    anchor = 'middle',
    ls = 0,
    opacity = 1,
    italic = false,
  } = o
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${opacity}"${
    italic ? ' font-style="italic"' : ''
  }>${esc(str)}</text>`
}

/* 弧形文字：牌匾顶部的校名/称号常用弧排 */
function arc(id, cx, cy, r, str, o = {}) {
  const { size = 96, fill = '#1a1a1a', font = KAI, weight = 400, ls = 6 } = o
  return `<path id="${id}" d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none"/>` +
    `<text font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" letter-spacing="${ls}">` +
    `<textPath href="#${id}" xlink:href="#${id}" startOffset="50%" text-anchor="middle">${esc(str)}</textPath></text>`
}

/* 简化徽记：外环英文 + 内圈校名首字。不复制官方校徽 */
function emblem(id, cx, cy, r, chars, ring, o = {}) {
  const { ink = '#1c2b50', ringInk = null, charsSize = Math.round(r * 0.46), ringSize = Math.round(r * 0.135) } = o
  const rc = ringInk || ink
  return `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.10)" stroke="${ink}" stroke-width="5"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 30}" fill="none" stroke="${ink}" stroke-width="2" opacity=".55"/>
    <path id="${id}" d="M ${cx - r + 16} ${cy} A ${r - 16} ${r - 16} 0 0 1 ${cx + r - 16} ${cy}" fill="none"/>
    <text font-family="${EN}" font-size="${ringSize}" font-weight="600" fill="${rc}" letter-spacing="${Math.max(1, ringSize * 0.08)}">
      <textPath href="#${id}" xlink:href="#${id}" startOffset="50%" text-anchor="middle">${esc(ring)}</textPath>
    </text>
    <text x="${cx}" y="${cy + charsSize * 0.36}" font-family="${SERIF}" font-size="${charsSize}" font-weight="700" fill="${ink}" text-anchor="middle" letter-spacing="2">${esc(chars)}</text>
    <circle cx="${cx}" cy="${cy + r - 13}" r="4" fill="${ink}" opacity=".6"/>
  </g>`
}

/* 天择品牌标记：蓝底圆 + 白色衬线 Z（与站内 Brand 标记同构，不拉外部图片） */
function tzMark(cx, cy, r) {
  return `
  <g>
    <defs>
      <radialGradient id="tzg" cx=".34" cy=".28" r=".9">
        <stop offset="0" stop-color="#4b9bff"/><stop offset=".6" stop-color="#1677ff"/><stop offset="1" stop-color="#0b4ab0"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#tzg)"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/>
    <text x="${cx}" y="${cy + r * 0.40}" font-family="${SERIF}" font-size="${r * 0.98}" font-weight="700" fill="#ffffff" text-anchor="middle">Z</text>
  </g>`
}

/* ---------- 材质 ---------- */

const sheenDefs = (id, strength = 1) => `
  <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".14" stop-color="#fff" stop-opacity="${0.3 * strength}"/>
    <stop offset=".23" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".45" stop-color="#fff" stop-opacity="${0.18 * strength}"/>
    <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".74" stop-color="#fff" stop-opacity="${0.24 * strength}"/>
    <stop offset=".84" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>`

function woodGrain(op = 0.22) {
  let out = ''
  for (let i = 0; i < 20; i++) {
    const y = 18 + i * 62
    out += `<path d="M0 ${y} C 320 ${y - 26}, 760 ${y + 24}, 1600 ${y - 8}" stroke="#2a0705" stroke-opacity="${op}" stroke-width="${1 + (i % 3) * 0.7}" fill="none"/>`
  }
  return out
}

function foilSpeckle(id) {
  return `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse">
    <rect width="18" height="18" fill="none"/>
    <circle cx="3" cy="4" r="1" fill="#fffbe2" opacity=".55"/>
    <circle cx="11" cy="12" r=".8" fill="#9a6c1d" opacity=".38"/>
    <circle cx="15" cy="5" r=".7" fill="#fffbe2" opacity=".45"/>
    <circle cx="7" cy="15" r=".6" fill="#9a6c1d" opacity=".3"/>
  </pattern>`
}

/* 金箔面四角花饰 */
const ORNAMENT = `
  <g id="orn">
    <path d="M6 150 C6 66 66 6 150 6" fill="none" stroke="#a5721e" stroke-width="4"/>
    <path d="M28 150 C28 82 82 28 150 28" fill="none" stroke="#a5721e" stroke-width="2" opacity=".85"/>
    <path d="M150 6 C126 34 108 44 92 40 M40 92 C44 108 34 126 6 150" fill="none" stroke="#a5721e" stroke-width="2.4"/>
    <path d="M112 20 C120 40 136 48 152 46 M20 112 C40 120 48 136 46 152" fill="none" stroke="#a5721e" stroke-width="1.6" opacity=".7"/>
  </g>`

/* 在指定矩形内放四角花饰（花饰路径本身画在 0..150 的第一象限） */
function ornamentsIn(x, y, w, h, s = 1) {
  return `
  <use href="#orn" xlink:href="#orn" transform="translate(${x} ${y}) scale(${s})"/>
  <use href="#orn" xlink:href="#orn" transform="translate(${x + w} ${y}) scale(${-s} ${s})"/>
  <use href="#orn" xlink:href="#orn" transform="translate(${x} ${y + h}) scale(${s} ${-s})"/>
  <use href="#orn" xlink:href="#orn" transform="translate(${x + w} ${y + h}) scale(${-s} ${-s})"/>`
}

/* 黄铜 */
function brass() {
  return {
    defs: `
      <linearGradient id="brassBase" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f9f0cd"/>
        <stop offset=".16" stop-color="#e8d196"/>
        <stop offset=".32" stop-color="#fcf6d6"/>
        <stop offset=".5" stop-color="#dfc17b"/>
        <stop offset=".68" stop-color="#f6e9bb"/>
        <stop offset=".84" stop-color="#d2b169"/>
        <stop offset="1" stop-color="#eedaa4"/>
      </linearGradient>
      <linearGradient id="brassRim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c9a75f"/><stop offset=".45" stop-color="#8a692c"/><stop offset="1" stop-color="#d8ba78"/>
      </linearGradient>
      <radialGradient id="brassVig" cx=".5" cy=".42" r=".78">
        <stop offset=".5" stop-color="#5b3f10" stop-opacity="0"/><stop offset="1" stop-color="#4a3208" stop-opacity=".26"/>
      </radialGradient>
      ${sheenDefs('brassSheen', 1.15)}`,
    body: `
      <rect width="${W}" height="${H}" fill="url(#brassBase)"/>
      <rect width="${W}" height="${H}" fill="url(#brassSheen)"/>
      <rect width="${W}" height="${H}" fill="url(#brassVig)"/>
      <rect x="7" y="7" width="${W - 14}" height="${H - 14}" fill="none" stroke="url(#brassRim)" stroke-width="14"/>
      <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="#6b4d18" stroke-opacity=".36" stroke-width="2"/>`,
  }
}

/* 拉丝不锈钢 */
function steel() {
  return {
    defs: `
      <linearGradient id="steelBase" x1="0" y1="0" x2="1" y2=".18">
        <stop offset="0" stop-color="#f8fafb"/>
        <stop offset=".13" stop-color="#d3dbe0"/>
        <stop offset=".26" stop-color="#ffffff"/>
        <stop offset=".42" stop-color="#c1cad1"/>
        <stop offset=".58" stop-color="#eef2f4"/>
        <stop offset=".72" stop-color="#ccd5db"/>
        <stop offset=".87" stop-color="#f9fbfc"/>
        <stop offset="1" stop-color="#b7c1c8"/>
      </linearGradient>
      <pattern id="steelGrain" width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill="none"/>
        <rect x="0" width="2" height="7" fill="#ffffff" opacity=".28"/>
        <rect x="4" width="1" height="7" fill="#5b6770" opacity=".07"/>
      </pattern>
      <linearGradient id="steelRim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#8d979f"/><stop offset="1" stop-color="#e8eef2"/>
      </linearGradient>
      <radialGradient id="steelVig" cx=".5" cy=".42" r=".8">
        <stop offset=".55" stop-color="#33414b" stop-opacity="0"/><stop offset="1" stop-color="#33414b" stop-opacity=".18"/>
      </radialGradient>
      ${sheenDefs('steelSheen', 1.1)}`,
    body: `
      <rect width="${W}" height="${H}" fill="url(#steelBase)"/>
      <rect width="${W}" height="${H}" fill="url(#steelGrain)" opacity=".6"/>
      <rect width="${W}" height="${H}" fill="url(#steelSheen)"/>
      <rect width="${W}" height="${H}" fill="url(#steelVig)"/>
      <rect x="7" y="7" width="${W - 14}" height="${H - 14}" fill="none" stroke="url(#steelRim)" stroke-width="14"/>
      <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="#7d8890" stroke-opacity=".5" stroke-width="2"/>
      <rect x="33" y="33" width="${W - 66}" height="${H - 66}" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="1"/>`,
  }
}

/* 金箔面（红木框由 goldwood 统一加） */
function goldField(x, y, w, h, woodTone = 'red') {
  const frame = woodTone === 'dark'
    ? `<linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3c1210"/><stop offset=".3" stop-color="#5e1f18"/>
        <stop offset=".55" stop-color="#39100e"/><stop offset=".8" stop-color="#6a261c"/><stop offset="1" stop-color="#2f0c0b"/>
      </linearGradient>`
    : `<linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#5c1714"/><stop offset=".28" stop-color="#863026"/>
        <stop offset=".52" stop-color="#4d1210"/><stop offset=".78" stop-color="#8b3628"/><stop offset="1" stop-color="#440f0d"/>
      </linearGradient>`
  return {
    defs: `
      ${frame}
      <linearGradient id="goldBase" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f7e4ac"/>
        <stop offset=".22" stop-color="#e7c774"/>
        <stop offset=".44" stop-color="#f8e8b5"/>
        <stop offset=".62" stop-color="#d8b25f"/>
        <stop offset=".82" stop-color="#f2dda0"/>
        <stop offset="1" stop-color="#c9a253"/>
      </linearGradient>
      ${foilSpeckle('foil')}
      ${sheenDefs('goldSheen', 0.85)}
      ${ORNAMENT}`,
    body: `
      <rect width="${W}" height="${H}" fill="url(#wood)"/>
      ${woodGrain(0.2)}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#goldBase)"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#foil)" opacity=".85"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#goldSheen)"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#7a1e14" stroke-opacity=".55" stroke-width="6"/>
      <rect x="${x + 26}" y="${y + 26}" width="${w - 52}" height="${h - 52}" fill="none" stroke="#a5721e" stroke-width="3" opacity=".9"/>
      <rect x="${x + 40}" y="${y + 40}" width="${w - 80}" height="${h - 80}" fill="none" stroke="#a5721e" stroke-width="1.4" opacity=".7"/>
      ${ornamentsIn(x + 26, y + 26, w - 52, h - 52, 0.52)}`,
  }
}

function goldwood(woodTone = 'red') {
  return goldField(62, 62, W - 124, H - 124, woodTone)
}

/* 红木金字 */
function rosewood() {
  return {
    defs: `
      <linearGradient id="rw" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#57120f"/><stop offset=".3" stop-color="#7c2318"/>
        <stop offset=".55" stop-color="#4a0f0d"/><stop offset=".8" stop-color="#7f281b"/><stop offset="1" stop-color="#3f0c0b"/>
      </linearGradient>
      ${sheenDefs('rwSheen', 0.5)}`,
    body: `
      <rect width="${W}" height="${H}" fill="url(#rw)"/>
      ${woodGrain(0.28)}
      <rect width="${W}" height="${H}" fill="url(#rwSheen)"/>
      <rect x="34" y="34" width="${W - 68}" height="${H - 68}" fill="none" stroke="#e6c584" stroke-width="4"/>
      <rect x="52" y="52" width="${W - 104}" height="${H - 104}" fill="none" stroke="#e6c584" stroke-width="1.6" opacity=".8"/>
      ${[0, 1, 2, 3].map((i) => {
        const xs = i % 2 === 0 ? 44 : W - 44
        const ys = i < 2 ? 44 : H - 44
        const sx = i % 2 === 0 ? 1 : -1
        const sy = i < 2 ? 1 : -1
        let motifs = ''
        for (let k = 0; k < 4; k++) {
          motifs += `<path d="M ${k * 16} 88 L ${k * 16 + 88} 0" stroke="#e6c584" stroke-width="2.4" opacity=".9"/>`
        }
        return `<g transform="translate(${xs} ${ys}) scale(${sx} ${sy})">${motifs}</g>`
      }).join('')}`,
  }
}

/* 银牌 + 红木框 */
function silverwood() {
  return {
    defs: `
      <linearGradient id="swWood" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4a1714"/><stop offset=".35" stop-color="#74271d"/>
        <stop offset=".62" stop-color="#3f100e"/><stop offset=".85" stop-color="#7d2c1f"/><stop offset="1" stop-color="#3a0d0b"/>
      </linearGradient>
      <linearGradient id="swField" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f2f5f7"/><stop offset=".24" stop-color="#dfe5ea"/>
        <stop offset=".5" stop-color="#fbfcfd"/><stop offset=".74" stop-color="#d7dee4"/>
        <stop offset="1" stop-color="#eef2f5"/>
      </linearGradient>
      ${sheenDefs('swSheen', 0.9)}
      ${ORNAMENT}`,
    body: `
      <rect width="${W}" height="${H}" fill="url(#swWood)"/>
      ${woodGrain(0.2)}
      <rect x="62" y="62" width="${W - 124}" height="${H - 124}" fill="url(#swField)"/>
      <rect x="62" y="62" width="${W - 124}" height="${H - 124}" fill="url(#swSheen)"/>
      <rect x="86" y="86" width="${W - 172}" height="${H - 172}" fill="none" stroke="#a9b2b9" stroke-width="6"/>
      <rect x="104" y="104" width="${W - 208}" height="${H - 208}" fill="none" stroke="#c3cbd1" stroke-width="2"/>
      ${ornamentsIn(86, 86, W - 172, H - 172, 0.62)}`,
  }
}

/* ---------- 版式 ---------- */

const inkFor = { brass: '#1b2a4e', steel: '#15181c', rosewood: '#f3d79a', goldwood: '#20140c', silverwood: '#1b1f24' }

/* A. 校徽 + 校名 + 称号 */
function layoutUniversity(s) {
  const ink = inkFor[s.material]
  const honors = s.honor.map((h) => ({
    text: h.text,
    size: h.size || 118,
    fill: h.fill || ink,
    font: h.font || SANS,
    weight: h.weight || 700,
    y: h.y,
    ls: h.ls ?? 6,
  }))
  return {
    body: `
      ${emblem('em', 320, 340, 116, s.emblem.chars, s.emblem.ring, { ink: s.emblem.ink || ink })}
      ${txt(494, 322, s.name, { size: s.nameSize || 102, font: KAI, fill: s.nameFill || ink, anchor: 'start', weight: 700 })}
      ${txt(496, 404, s.en, { size: s.enSize || 28, font: EN, fill: ink, anchor: 'start', ls: 1.6, opacity: 0.82, weight: 600 })}
      ${honors.map((h) => txt(800, h.y, h.text, { size: h.size, fill: h.fill, font: h.font, weight: h.weight, ls: h.ls })).join('')}
      ${s.sub ? txt(800, s.subY || 900, s.sub, { size: s.subSize || 44, font: EN, fill: s.subFill || ink, ls: 5, weight: 600 }) : ''}
      ${s.company ? txt(800, s.companyY || 950, s.company, { size: s.companySize || 46, font: SERIF, fill: ink, weight: 600 }) : ''}
      ${s.issuer ? txt(W - 150, 1072, s.issuer, { size: 30, font: SERIF, fill: ink, anchor: 'end', opacity: 0.9 }) : ''}
      ${s.corner ? txt(W - 132, 128, s.corner, { size: 40, font: EN, fill: ink, anchor: 'end', weight: 600 }) : ''}`,
  }
}

/* B. 居中竖排（无校徽或以弧排校名开头） */
function layoutStack(s) {
  const ink = inkFor[s.material]
  const out = []
  /* arcY 是弧顶的 y，圆心 = 弧顶 + 半径；半径给大一点，弧线才平缓 */
  if (s.arcText) out.push(arc('arc1', 800, (s.arcY || 420) + (s.arcR || 900), s.arcR || 900, s.arcText, { size: s.arcSize || 108, font: KAI, fill: s.arcFill || ink, weight: 700, ls: 10 }))
  if (s.en) out.push(txt(800, s.enY || 470, s.en, { size: s.enSize || 44, font: EN, fill: s.enFill || ink, ls: 4, weight: 600 }))
  if (s.emblem) out.push(emblem('em', 800, s.emblemY || 300, s.emblemR || 100, s.emblem.chars, s.emblem.ring, { ink: s.emblem.ink || ink }))
  for (const l of s.lines) {
    out.push(txt(l.x || 800, l.y, l.text, { size: l.size, fill: l.fill || ink, font: l.font || SERIF, weight: l.weight || 700, anchor: l.anchor || 'middle', ls: l.ls || 0 }))
  }
  if (s.foot) out.push(txt(s.footX || W - 150, s.footY || 1072, s.foot, { size: s.footSize || 40, font: SERIF, fill: s.footFill || ink, anchor: 'end', opacity: 0.9 }))
  return { body: out.join('') }
}

/* C. 会员单位 */
function layoutMembership(s) {
  const ink = inkFor[s.material]
  const out = []
  if (s.emblem) out.push(emblem('em', 800, s.emblemY || 290, s.emblemR || 104, s.emblem.chars, s.emblem.ring, { ink: s.emblem.ink || ink }))
  out.push(txt(800, s.orgY || 470, s.org, { size: s.orgSize || 76, font: KAI, fill: ink, weight: 700 }))
  if (s.orgEn) out.push(txt(800, (s.orgY || 470) + 54, s.orgEn, { size: 26, font: EN, fill: ink, ls: 2.5, opacity: 0.8, weight: 600 }))
  out.push(txt(800, s.companyY || 640, s.company, { size: 46, font: SERIF, fill: ink, weight: 600 }))
  out.push(txt(800, s.honorY || 850, s.honor, { size: s.honorSize || 132, font: SERIF, fill: s.honorFill || '#b3121b', weight: 700, ls: s.honorLs || 16 }))
  if (s.date) out.push(txt(800, s.dateY || 1000, s.date, { size: 42, font: SERIF, fill: ink, anchor: s.dateAnchor || 'middle' }))
  return { body: out.join('') }
}

/* D. 双品牌合作牌（校徽 + 天择标记） */
function layoutJoint(s) {
  const ink = inkFor[s.material]
  const out = []
  out.push(emblem('em', 430, 300, 104, s.emblem.chars, s.emblem.ring, { ink: s.emblem.ink || ink }))
  out.push(txt(430, 490, s.name, { size: s.nameSize || 58, font: KAI, fill: ink, weight: 700 }))
  out.push(txt(430, 528, s.en, { size: s.enSize || 18, font: EN, fill: ink, ls: 1.4, opacity: 0.85, weight: 600 }))
  out.push(tzMark(1170, 300, 96))
  out.push(txt(1170, 490, '天择教育科技', { size: 58, font: SANS, fill: '#1f6fd0', weight: 700 }))
  out.push(txt(1170, 528, 'TIANZE EDUCATION TECHNOLOGY', { size: 18, font: EN, fill: '#1f6fd0', ls: 1.4, weight: 600 }))
  for (const l of s.lines) {
    out.push(txt(800, l.y, l.text, { size: l.size, fill: l.fill || ink, font: l.font || SANS, weight: l.weight || 700, ls: l.ls || 0 }))
  }
  return { body: out.join('') }
}

/* E. 信用等级证书（亚克力装裱的白纸证书） */
function certAAA() {
  const paper = '#fbf9f1'
  return {
    defs: `
      <linearGradient id="acrylic" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eef2f5"/><stop offset=".28" stop-color="#fdfefe"/>
        <stop offset=".55" stop-color="#e3e9ee"/><stop offset=".8" stop-color="#fafcfd"/><stop offset="1" stop-color="#dfe6eb"/>
      </linearGradient>
      <linearGradient id="paperG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fdfbf4"/><stop offset=".5" stop-color="${paper}"/><stop offset="1" stop-color="#f6f2e6"/>
      </linearGradient>
      ${sheenDefs('acSheen', 0.7)}
      ${ORNAMENT}`,
    body: `
      <rect width="${W}" height="${H}" fill="url(#acrylic)"/>
      <rect width="${W}" height="${H}" fill="url(#acSheen)"/>
      <rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="#ffffff" stroke-opacity=".85" stroke-width="6"/>
      <rect x="34" y="34" width="${W - 68}" height="${H - 68}" fill="none" stroke="#b9c6d1" stroke-width="3"/>
      <rect x="66" y="62" width="${W - 132}" height="${H - 124}" fill="url(#paperG)"/>
      <rect x="66" y="62" width="${W - 132}" height="${H - 124}" fill="none" stroke="#cfc9b2" stroke-width="2"/>
      <rect x="128" y="120" width="${W - 256}" height="${H - 240}" fill="none" stroke="#6f6a4c" stroke-width="5"/>
      <rect x="144" y="136" width="${W - 288}" height="${H - 272}" fill="none" stroke="#6f6a4c" stroke-width="1.8"/>
      ${ornamentsIn(128, 120, W - 256, H - 240, 0.62)}
      ${txt(800, 236, '信用等级证书', { size: 96, font: SERIF, fill: '#a8481c', weight: 700, ls: 18 })}
      ${txt(800, 286, 'CERTIFICATE OF CREDIF GRADE', { size: 30, font: EN, fill: '#7b5a36', ls: 8, weight: 600 })}
      ${txt(800, 346, '证书编号：CPED-SA30413', { size: 30, font: SERIF, fill: '#4b4b4b' })}
      ${txt(800, 452, '深圳市天择教育科技有限公司', { size: 74, font: SERIF, fill: '#171717', weight: 700, ls: 2 })}
      ${txt(800, 510, '注册地址：深圳市南山区粤海街道科园路软件产业基地5栋E座701', { size: 27, font: SERIF, fill: '#3f3f3f' })}
      ${txt(800, 588, '针对企业的企业素质、经营水平、外部环境、财务状况、发展前景、以及可能出现的各种风险，', { size: 28, font: SERIF, fill: '#2f2f2f' })}
      ${txt(800, 636, '结合行业现状及行业政策对其信用状况进行客观、科学、公正的评估确定该企业信用等级为：', { size: 28, font: SERIF, fill: '#2f2f2f' })}
      ${txt(800, 800, 'AAA', { size: 196, font: EN, fill: '#c2451c', weight: 700, ls: 30 })}
      ${txt(800, 874, '评级目的：投标、商务洽谈', { size: 32, font: SERIF, fill: '#2b2b2b' })}
      ${txt(400, 930, '证书编号：CPED-SA30413', { size: 25, font: SERIF, fill: '#3a3a3a', anchor: 'start' })}
      ${txt(400, 966, '有效期：2017.12—2019.12', { size: 25, font: SERIF, fill: '#3a3a3a', anchor: 'start' })}
      ${txt(400, 1002, '查询网址：www.chinacped.org', { size: 25, font: SERIF, fill: '#3a3a3a', anchor: 'start' })}
      ${seal(1020, 958, 74)}
      ${seal(1268, 958, 74)}
      ${txt(1020, 1052, '中国企业发展促进委员会', { size: 18, font: SERIF, fill: '#2b2b2b' })}
      ${txt(1268, 1052, '中国中小企业质量保障中心', { size: 18, font: SERIF, fill: '#2b2b2b' })}`,
  }
}

/* 红色公章：只为构图，不复制真实印章纹理 */
function seal(cx, cy, r) {
  return `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#c73a2a" stroke-width="4" opacity=".8"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 9}" fill="none" stroke="#c73a2a" stroke-width="1.4" opacity=".55"/>
    <path d="M ${cx} ${cy - 30} l 8.8 18 19.8 2.4 -14.4 13.8 3.6 19.6 -17.8 -9.6 -17.8 9.6 3.6 -19.6 -14.4 -13.8 19.8 -2.4 z" fill="#c73a2a" opacity=".8"/>
  </g>`
}

/* F. ISO9001 认证证书 */
function certISO() {
  const mat = goldwood('dark')
  return {
    defs: mat.defs,
    body: `
      ${mat.body}
      ${txt(800, 214, 'NOA', { size: 78, font: EN, fill: '#0f7a4a', weight: 700, ls: 10 })}
      ${txt(800, 250, 'CERTIFICATION', { size: 22, font: EN, fill: '#0f7a4a', ls: 7, weight: 600 })}
      ${txt(800, 352, '质量管理体系认证证书', { size: 64, font: SERIF, fill: '#1b1b1b', weight: 700, ls: 10 })}
      ${txt(800, 464, '深圳市天择教育科技有限公司', { size: 58, font: SERIF, fill: '#191919', weight: 700 })}
      ${txt(800, 522, '注册地址：深圳市南山区粤海街道科园路软件产业基地5栋E座701', { size: 25, font: SERIF, fill: '#333' })}
      ${txt(800, 560, '审核地址：深圳市南山区粤海街道科园路软件产业基地6栋410', { size: 25, font: SERIF, fill: '#333' })}
      ${txt(800, 626, '其质量管理体系已通过 NOA Certification 的审核', { size: 26, font: SERIF, fill: '#333' })}
      ${txt(800, 704, 'GB/T19001-2016 idt ISO9001:2015 标准', { size: 46, font: SERIF, fill: '#171717', weight: 700, ls: 1 })}
      ${txt(800, 754, '认证范围', { size: 26, font: SERIF, fill: '#333' })}
      ${txt(800, 812, '计算机应用软件研发和服务', { size: 44, font: SERIF, fill: '#171717', weight: 700, ls: 2 })}
      ${txt(300, 892, '认证证书编号：NOA1823205', { size: 23, font: SERIF, fill: '#2f2f2f', anchor: 'start' })}
      ${txt(300, 930, '统一社会信用代码：91440300MA5FTJEURL', { size: 23, font: SERIF, fill: '#2f2f2f', anchor: 'start' })}
      ${txt(300, 968, '证书签发日期：2018年03月28日', { size: 23, font: SERIF, fill: '#2f2f2f', anchor: 'start' })}
      ${txt(300, 1006, '本次证书有效日期：2019年03月09日', { size: 23, font: SERIF, fill: '#2f2f2f', anchor: 'start' })}
      <path d="M1120 900 C1160 860, 1180 960, 1215 905 C1235 875, 1250 950, 1285 900" fill="none" stroke="#1a1a1a" stroke-width="5"/>
      ${txt(1205, 968, '认证经理', { size: 22, font: SERIF, fill: '#2f2f2f' })}
      ${mark(560, 1062, 118, 44, 'NOA')}
      ${mark(760, 1062, 118, 44, 'CNAS')}
      ${mark(960, 1062, 118, 44, 'IAF')}
      ${txt(1225, 1070, 'NOA Certification Service', { size: 20, font: EN, fill: '#3a2a10', ls: 1.8, weight: 600 })}`,
  }
}

function mark(cx, cy, w, h, label) {
  return `
  <g opacity=".85">
    <ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="none" stroke="#1b1b1b" stroke-width="2.4"/>
    <text x="${cx}" y="${cy + 12}" font-family="${EN}" font-size="30" font-weight="700" fill="#1b1b1b" text-anchor="middle" letter-spacing="1">${label}</text>
  </g>`
}

/* 回纹角饰：只画几何回字，不复制原牌匾的具体花纹。四角用 scale(±1,±1) 镜像 */
function fretCorner(x, y, sx, sy) {
  return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="#8a6722" stroke-linecap="square">
    <path d="M0 150 V0 H150" stroke-width="3.2" opacity=".9"/>
    <path d="M0 108 V42 H108 V108" stroke-width="2.6" opacity=".8"/>
    <path d="M42 108 V76 H74 V108" stroke-width="2.2" opacity=".7"/>
    <path d="M108 42 H74 V74" stroke-width="2.2" opacity=".7"/>
  </g>`
}

/* 细双线框 + 四角回纹：专精特新那块原匾就是这种“金面压细花边”的做法 */
function fretFrame(inset) {
  return `
    <rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}" fill="none" stroke="#8a6722" stroke-width="3.2" opacity=".9"/>
    <rect x="${inset + 18}" y="${inset + 18}" width="${W - (inset + 18) * 2}" height="${H - (inset + 18) * 2}" fill="none" stroke="#8a6722" stroke-width="1.6" opacity=".55"/>
    ${fretCorner(inset, inset, 1, 1)}
    ${fretCorner(W - inset, inset, -1, 1)}
    ${fretCorner(inset, H - inset, 1, -1)}
    ${fretCorner(W - inset, H - inset, -1, -1)}`
}

/* 二维码占位：确定性点阵 + 三个定位角，只为还原牌面构图，不可扫码 */
function qrMark(x, y, size) {
  const n = 25
  const m = size / n
  let seed = 20231231
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c > n - 8) || (r > n - 8 && c < 7)
  let dots = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (inFinder(r, c)) continue
      if (rnd() > 0.5) {
        dots += `<rect x="${(x + c * m).toFixed(1)}" y="${(y + r * m).toFixed(1)}" width="${m.toFixed(2)}" height="${m.toFixed(2)}"/>`
      }
    }
  }
  const finder = (fx, fy) => `
    <rect x="${fx}" y="${fy}" width="${7 * m}" height="${7 * m}" fill="none" stroke="#141414" stroke-width="${m}"/>
    <rect x="${fx + 2 * m}" y="${fy + 2 * m}" width="${3 * m}" height="${3 * m}" fill="#141414"/>`
  return `
  <g>
    <rect x="${x - m}" y="${y - m}" width="${size + 2 * m}" height="${size + 2 * m}" fill="#ffffff"/>
    <g fill="#141414">${dots}</g>
    ${finder(x, y)}${finder(x + 18 * m, y)}${finder(x, y + 18 * m)}
  </g>`
}

/* G. 专精特新中小企业：金面 + 回纹细框；红字标题左上、主体信息居中、左下二维码 */
function specialtySme() {
  const mat = brass()
  return {
    defs: mat.defs,
    body: `
      ${mat.body}
      <rect width="${W}" height="${H}" fill="#c79a3f" opacity=".14"/>
      ${fretFrame(78)}
      ${txt(178, 306, '专精特新中小企业', { size: 74, font: SERIF, fill: '#c0272d', anchor: 'start', weight: 700, ls: 6 })}
      ${txt(800, 604, '深圳市天择教育科技有限公司', { size: 96, font: SERIF, fill: '#141414', weight: 700, ls: 2 })}
      ${txt(800, 800, '深圳市中小企业服务局', { size: 64, font: SERIF, fill: '#1b1b1b', weight: 600, ls: 2 })}
      ${qrMark(158, 770, 196)}
      ${txt(408, 936, '有效期：2023年12月31日-2026年12月30日', { size: 44, font: SERIF, fill: '#1f1f1f', anchor: 'start' })}`,
  }
}

/* ---------- 数据：文字严格取自上一步识别结果 ---------- */

const items = [
  {
    slug: 'nankai-university',
    org: '南开大学',
    title: '“红色文化育人”社会实践基地',
    material: 'brass',
    tone: 'brass',
    source: '微信图片_20261110164934_12_5.jpg',
    layout: (m) => layoutUniversity({
      material: m,
      emblem: { chars: '南开', ring: 'NANKAI UNIVERSITY · 1919' },
      name: '南开大学',
      en: 'Nankai University',
      enSize: 40,
      honor: [
        { text: '“红色文化育人”', size: 88, y: 720 },
        { text: '社会实践基地', size: 124, y: 852 },
      ],
      issuer: '共青团南开大学委员会',
      corner: '021',
    }),
  },
  {
    slug: 'credit-rating-aaa',
    org: '企业信用等级',
    title: '信用等级证书 AAA',
    material: 'goldwood',
    tone: 'goldwood',
    source: '微信图片_20261110164930_9_5.jpg',
    layout: () => ({ defs: '', body: '' }),
    custom: certAAA,
  },
  {
    slug: 'iso9001-certification',
    org: '质量管理体系',
    title: 'ISO9001:2015 认证证书',
    material: 'goldwood',
    tone: 'goldwood',
    source: '微信图片_20261110164931_10_5.jpg',
    layout: () => ({ defs: '', body: '' }),
    custom: certISO,
  },
  {
    slug: 'specialty-sme',
    org: '深圳市中小企业服务局',
    title: '专精特新中小企业',
    material: 'brass',
    tone: 'brass',
    source: '专精特新中小企业.jpg',
    layout: () => ({ defs: '', body: '' }),
    custom: specialtySme,
  },
  {
    slug: 'hit-shenzhen',
    org: '哈尔滨工业大学（深圳）',
    title: '校外实习基地',
    material: 'steel',
    tone: 'steel',
    source: '微信图片_20261110164932_11_5.jpg',
    layout: (m) => layoutUniversity({
      material: m,
      emblem: { chars: '哈工', ring: 'HIT · SHENZHEN' },
      name: '哈尔滨工业大学（深圳）',
      nameSize: 86,
      en: 'HARBIN INSTITUTE OF TECHNOLOGY, SHENZHEN',
      enSize: 24,
      company: '深圳市天择教育科技有限公司',
      companySize: 54,
      companyY: 700,
      honor: [{ text: '校外实习基地', size: 132, fill: '#b3121b', y: 862 }],
    }),
  },
  {
    slug: 'shenzhen-software-association',
    org: '深圳市软件行业协会',
    title: '会员单位',
    material: 'rosewood',
    tone: 'rosewood',
    source: '微信图片_20261110164935_13_5.jpg',
    layout: (m) => ({
      body: `
        ${txt(800, 262, '深圳市天择教育科技有限公司', { size: 46, font: SERIF, fill: '#f3d79a', weight: 600, ls: 2 })}
        ${txt(800, 664, '会员单位', { size: 172, font: SERIF, fill: '#f3d79a', weight: 700, ls: 26 })}
        ${seal(310, 918, 92)}
        ${txt(1400, 900, '深圳市软件行业协会', { size: 52, font: SERIF, fill: '#f3d79a', anchor: 'end', weight: 600 })}
        ${txt(1400, 972, '二〇一九年四月', { size: 42, font: SERIF, fill: '#f3d79a', anchor: 'end' })}`,
    }),
  },
  {
    slug: 'gba-digital-business-consortium',
    org: '粤港澳数字商业产教融合共同体',
    title: '副理事长单位',
    material: 'goldwood',
    tone: 'goldwood',
    source: '微信图片_20261110164936_14_5.jpg',
    layout: (m) => layoutStack({
      material: m,
      lines: [
        { text: '粤港澳数字商业产教融合共同体', size: 80, y: 520 },
        { text: '副理事长单位', size: 138, fill: '#a81c12', y: 700, ls: 12 },
      ],
      foot: '二〇二四年六月',
    }),
  },
  {
    slug: 'sustc',
    org: '南方科技大学',
    title: '实习实践基地',
    material: 'brass',
    tone: 'brass',
    source: '微信图片_20261110164937_15_5.jpg',
    layout: (m) => layoutUniversity({
      material: m,
      emblem: { chars: '南科', ring: 'SUSTech · 2011' },
      name: '南方科技大学',
      nameSize: 108,
      en: 'SOUTHERN UNIVERSITY OF SCIENCE AND TECHNOLOGY',
      enSize: 26,
      honor: [{ text: '实习实践基地', size: 128, fill: '#a11c14', font: KAI, y: 780, ls: 10 }],
      sub: 'SUSTech Internship Base',
      subSize: 46,
      subFill: '#a11c14',
      subY: 880,
    }),
  },
  {
    slug: 'zhaoqing-university-major',
    org: '肇庆学院',
    title: '专业实习基地',
    material: 'steel',
    tone: 'steel',
    source: '微信图片_20261110164938_16_5.jpg',
    layout: (m) => layoutUniversity({
      material: m,
      emblem: { chars: '肇庆', ring: 'ZHAOQING UNIVERSITY', ink: '#1d4f8c' },
      name: '肇庆学院',
      nameSize: 112,
      nameFill: '#a11c14',
      en: '',
      honor: [{ text: '专业实习基地', size: 138, font: KAI, y: 780, fill: '#15181c' }],
    }),
  },
  {
    slug: 'gdcm-hr-project',
    org: '广东财贸职业学院',
    title: '人力资源提升项目',
    material: 'goldwood',
    tone: 'goldwood',
    source: '微信图片_20261110164939_17_5.jpg',
    layout: (m) => layoutJoint({
      material: m,
      emblem: { chars: '财贸', ring: 'GDCM · VOCATIONAL COLLEGE', ink: '#8a1b14' },
      name: '广东财贸职业学院',
      nameSize: 54,
      en: 'GUANGDONG FINANCE & TRADE VOCATIONAL COLLEGE',
      enSize: 16,
      lines: [
        { text: '教育部供需对接就业育人项目合作单位', size: 58, fill: '#b3121b', y: 690 },
        { text: '人力资源提升项目', size: 128, fill: '#b3121b', y: 850, ls: 8 },
      ],
    }),
  },
  {
    slug: 'shenzhen-fintech-association',
    org: '深圳市金融科技协会',
    title: '会员单位',
    material: 'silverwood',
    tone: 'silverwood',
    source: '微信图片_20261110164940_18_5.jpg',
    layout: (m) => layoutMembership({
      material: m,
      emblem: { chars: 'SFA', ring: 'SHENZHEN FINTECH ASSOC.', ink: '#1b4f93' },
      emblemY: 280,
      org: '深圳市金融科技协会',
      orgSize: 80,
      orgEn: 'Shenzhen FinTech Association',
      company: '深圳市天择教育科技有限公司',
      companyY: 660,
      honor: '会员单位',
      honorSize: 140,
      honorY: 870,
    }),
  },
  {
    slug: 'gdcm-practice-base',
    org: '广东财贸职业学院',
    title: '大学生校外实践教学基地',
    material: 'steel',
    tone: 'steel',
    source: '微信图片_20261110164941_19_5.jpg',
    layout: (m) => layoutUniversity({
      material: m,
      emblem: { chars: '财贸', ring: 'GDCM · VOCATIONAL COLLEGE', ink: '#7a1a15' },
      name: '广东财贸职业学院',
      nameSize: 92,
      en: 'GUANGDONG FINANCE & TRADE VOCATIONAL COLLEGE',
      enSize: 22,
      honor: [
        { text: '大学生校外实践', size: 112, y: 720 },
        { text: '教学基地', size: 126, y: 852 },
      ],
    }),
  },
  {
    slug: 'xiamen-institute-of-technology',
    org: '厦门工学院',
    title: '双师双能型基地',
    material: 'steel',
    tone: 'steel',
    source: '微信图片_20261110164941_20_5.jpg',
    layout: (m) => layoutUniversity({
      material: m,
      emblem: { chars: '厦工', ring: 'XIAMEN INSTITUTE OF TECH.', ink: '#8c1a14' },
      name: '厦门工学院',
      nameSize: 108,
      en: 'XIAMEN INSTITUTE OF TECHNOLOGY',
      enSize: 24,
      company: '深圳市天择教育科技有限公司',
      companySize: 56,
      companyY: 700,
      honor: [{ text: '双师双能型基地', size: 126, fill: '#b3121b', y: 862 }],
    }),
  },
  {
    slug: 'zhaoqing-university-lab',
    org: '肇庆学院',
    title: '实验教学中心',
    material: 'steel',
    tone: 'steel',
    source: '微信图片_20261110164942_21_5.jpg',
    layout: (m) => layoutStack({
      material: m,
      lines: [
        { text: '肇庆学院', size: 104, fill: '#a11c14', y: 400 },
        { text: '深圳市天择教育科技有限公司', size: 76, fill: '#a11c14', y: 570 },
        { text: '实验教学中心', size: 122, y: 790 },
      ],
    }),
  },
  {
    slug: 'shenzhen-university',
    org: '深圳大学',
    title: '实习基地',
    material: 'steel',
    tone: 'steel',
    source: '微信图片_20261110164943_22_5.jpg',
    layout: (m) => ({
      body: `
        ${emblem('em', 288, 430, 118, '深大', 'SHENZHEN UNIVERSITY · 1983', { ink: '#15181c' })}
        <line x1="944" y1="268" x2="944" y2="592" stroke="#15181c" stroke-width="3"/>
        ${txt(440, 452, '深圳大学', { size: 120, font: KAI, fill: '#15181c', anchor: 'start', weight: 700 })}
        ${txt(994, 446, '实习基地', { size: 106, fill: '#15181c', anchor: 'start', weight: 700, ls: 4 })}
        ${txt(440, 566, 'Internship Center of Shenzhen University', { size: 32, font: EN, fill: '#15181c', anchor: 'start', ls: 1.2, weight: 600 })}`,
    }),
  },
  {
    slug: 'shenzhen-intl-business-school',
    org: '深圳国际商学院',
    title: '校企合作单位',
    material: 'brass',
    tone: 'brass',
    source: '微信图片_20261110164945_24_5.jpg',
    layout: (m) => layoutStack({
      material: m,
      arcText: '深圳国际商学院',
      arcY: 400,
      arcR: 900,
      arcSize: 96,
      lines: [
        { text: '校企合作单位', size: 122, fill: '#a11c14', y: 850, ls: 10 },
      ],
      emblem: { chars: '深商', ring: 'SIBS · SHENZHEN', ink: '#8a1b14', ringInk: '#8a1b14' },
      emblemY: 660,
      emblemR: 92,
    }),
  },
  {
    slug: 'guangzhou-college-of-commerce',
    org: '广州商学院',
    title: '产学研合作示范基地',
    material: 'steel',
    tone: 'steel',
    source: '微信图片_20261110164946_25_5.jpg',
    layout: (m) => layoutStack({
      material: m,
      emblem: { chars: '广商', ring: 'GZCC · GUANGZHOU', ink: '#1b3f7a' },
      emblemY: 380,
      emblemR: 128,
      lines: [
        { text: '广州商学院产学研合作示范基地', size: 98, y: 720 },
      ],
    }),
  },
  {
    slug: 'swufe-national-base',
    org: '西南财经大学',
    title: '国家级大学生校外实践教育基地',
    material: 'brass',
    tone: 'brass',
    source: '微信图片_20261110164947_26_5.jpg',
    layout: (m) => layoutStack({
      material: m,
      arcText: '西南财经大学',
      arcY: 380,
      arcR: 900,
      arcSize: 112,
      en: 'SOUTHWESTERN UNIVERSITY OF FINANCE AND ECONOMICS',
      enY: 500,
      enSize: 26,
      lines: [
        { text: '国家级大学生校外', size: 104, y: 700 },
        { text: '实践教育基地', size: 112, y: 820 },
      ],
      foot: '二零一八年十月',
      footSize: 38,
    }),
  },
  {
    slug: 'hunan-institute-of-technology',
    org: '湖南工学院',
    title: '实践教学基地',
    material: 'goldwood',
    tone: 'goldwood',
    source: '微信图片_20261110164948_28_5.jpg',
    layout: (m) => layoutStack({
      material: m,
      arcText: '湖南工学院',
      arcY: 340,
      arcR: 900,
      arcSize: 116,
      emblem: { chars: '湖工', ring: 'HUNAN INSTITUTE OF TECHNOLOGY', ink: '#1c2b50', ringInk: '#1c2b50' },
      emblemY: 600,
      emblemR: 104,
      lines: [{ text: '实践教学基地', size: 128, y: 880, ls: 8 }],
    }),
  },
  {
    slug: 'longgang-vocational-school',
    org: '深圳市龙岗区第二职业技术学校',
    title: '校企合作单位',
    material: 'goldwood',
    tone: 'goldwood',
    source: '微信图片_20261110164949_29_5.jpg',
    layout: (m) => layoutStack({
      material: m,
      arcText: '校企合作单位',
      arcY: 420,
      arcR: 900,
      arcSize: 118,
      arcFill: '#a11c14',
      lines: [
        { text: '深圳市天择教育科技有限公司', size: 52, y: 720 },
        { text: '深圳市龙岗区第二职业技术学校', size: 52, y: 790 },
        { text: '二〇二一年十二月', size: 42, y: 880 },
      ],
    }),
  },
  {
    slug: 'wanxi-university',
    org: '皖西学院',
    title: '产学研合作基地',
    material: 'steel',
    tone: 'steel',
    source: '微信图片_20261110164951_30_5.jpg',
    layout: (m) => layoutJoint({
      material: m,
      emblem: { chars: '皖院', ring: 'WEST ANHUI UNIVERSITY', ink: '#1b4f93' },
      name: '皖西学院',
      nameSize: 80,
      en: 'WEST ANHUI UNIVERSITY',
      enSize: 24,
      lines: [
        { text: '产学研合作基地', size: 116, y: 800, font: SERIF, fill: '#15181c' },
        { text: 'Industry-University-Research Cooperation Base', size: 34, fill: '#b3121b', font: EN, y: 900, weight: 600 },
      ],
    }),
  },
]

/* ---------- 输出 ---------- */

function render(item) {
  const mat = item.tone === 'brass' ? brass()
    : item.tone === 'steel' ? steel()
      : item.tone === 'goldwood' ? goldwood()
        : item.tone === 'rosewood' ? rosewood()
          : silverwood()
  const content = item.custom ? item.custom() : item.layout(item.tone)
  const defs = `${mat.defs}${content.defs || ''}`
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(item.org)} · ${esc(item.title)}">
<defs>${defs}</defs>
${mat.body}
${content.body}
</svg>
`
}

mkdirSync(OUT, { recursive: true })

for (const item of items) {
  writeFileSync(resolve(OUT, `${item.slug}.svg`), render(item), 'utf8')
}

const manifest = `/* ============================================================
 * 荣誉墙 · 牌匾清单（唯一真源）
 * ------------------------------------------------------------
 * 由 scripts/gen-honors.mjs 生成；每块牌匾的文字与 SVG 文件名一一对应。
 * org/title 为页面图注，material 记录原牌匾材质，source 指向去重后保留的原图。
 * ============================================================ */

export const honors = [
${items.map((i) => `  {
    file: '/images/honors/${i.slug}.svg',
    org: '${i.org}',
    title: '${i.title}',
    material: '${i.material === 'goldwood' ? '金箔木框' : i.material === 'brass' ? '黄铜' : i.material === 'steel' ? '拉丝不锈钢' : i.material === 'rosewood' ? '红木金字' : '银牌木框'}',
    source: '${i.source}',
  },`).join('\n')}
]
`

writeFileSync(resolve(ROOT, 'src/data/honors.js'), manifest, 'utf8')

console.log(`generated ${items.length} plaques -> public/images/honors`)
