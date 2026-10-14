/* ============================================================
 * ip2region xdb 的极简双栈查询器（零依赖，同步内存模式）
 * ------------------------------------------------------------
 * 只保留营销站访问量统计要用的那一条路径：整库常驻 Buffer、二分索引、纯同步。
 * 同时支持 IPv4 与 IPv6 —— 二者是两份独立的 xdb 文件（ip2region_v4.xdb /
 * ip2region_v6.xdb），二进制布局差异只在三点：
 *   ① IP 字节数：v4=4、v6=16；
 *   ② 段索引条目大小 indexSize：v4=14(4+4+2+4)、v6=38(16+16+2+4)；
 *   ③ 段边界比较：v4 沿用历史「大端入参 vs 小端索引」的反向逐字节比较
 *      （ipSubCompareBEagainstLE），v6 直接用 Buffer.compare 大端正序比较。
 * vector index 两者一致：都取 IP 前 2 字节定位 (il0*256+il1)*8 处的 sPtr/ePtr。
 *
 * 官方参考实现（Apache-2.0）：
 *   https://github.com/lionsoul2014/ip2region/blob/master/binding/javascript/
 * 这里按其同结构重写，剥离 fd 直读 / vectorIndex 单独缓存等用不上的分支。
 *
 * region 字符串分隔：国家|省份|城市|ISP|国家码（CN/US/...）；老数据可能是
 * 国家|省份|城市|ISP（无国家码）或 国家|区域|省份|城市|ISP —— searchIp 都兼容。
 * ============================================================ */
import fs from 'node:fs'

const HEADER_INFO_LENGTH = 256
const VECTOR_INDEX_COLS = 256
const VECTOR_INDEX_SIZE = 8
const IPV4_INDEX_SIZE = 14 // 4 + 4 + 2 + 4
const IPV6_INDEX_SIZE = 38 // 16 + 16 + 2 + 4

let v4Buff = null
let v6Buff = null

/** 读入单个 xdb 文件到 Buffer；文件不存在返回 null（不抛），其它错误照抛。 */
function readXdbFile(dbPath) {
  if (!dbPath) return null
  try {
    const buff = fs.readFileSync(dbPath)
    if (buff.length < HEADER_INFO_LENGTH) throw new Error(`xdb 文件过小或损坏：${dbPath}`)
    return buff
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}

/**
 * 载入 v4 / v6 两份库到内存 Buffer（同进程各只 load 一次）。
 * 任一缺失都不炸站：只把对应族的地区字段降级为空。
 * @returns {{ v4: boolean, v6: boolean }} 各栈是否成功载入
 */
export function loadXdb(v4Path, v6Path) {
  let loadedV4 = false
  let loadedV6 = false
  if (!v4Buff) {
    const b = readXdbFile(v4Path)
    if (b) {
      v4Buff = b
      loadedV4 = true
    }
  } else loadedV4 = true
  if (!v6Buff) {
    const b = readXdbFile(v6Path)
    if (b) {
      v6Buff = b
      loadedV6 = true
    }
  } else loadedV6 = true
  return { v4: loadedV4, v6: loadedV6 }
}

export function isXdbLoaded() {
  return v4Buff !== null || v6Buff !== null
}

/* ---------- IP 解析 ---------- */

/** 字符串 IPv4 → 4 字节大端 Buffer；非 IPv4 或非法返回 null。 */
function parseIPv4Bytes(s) {
  const parts = s.split('.')
  if (parts.length !== 4) return null
  const bytes = Buffer.alloc(4)
  for (let i = 0; i < 4; i++) {
    const v = Number(parts[i])
    if (!Number.isInteger(v) || v < 0 || v > 255) return null
    bytes[i] = v
  }
  return bytes
}

/** 字符串 IPv6 → 16 字节大端 Buffer；非法返回 null。支持 :: 缩写与 ::ffff: 已在上游剥离。 */
function parseIPv6Bytes(v6String) {
  const ps = v6String.split(':', 8)
  if (ps.length < 3) return null
  let dcNum = 0
  let offset = 0
  const ipBytes = Buffer.alloc(16)
  for (let i = 0; i < ps.length; i++) {
    let s = ps[i].trim()
    if (s.length === 0) {
      // 双冒号只允许一次
      if (dcNum > 0) return null
      const start = i
      const mi = ps.length - 1
      for (i++; ; ) {
        s = (ps[i] || '').trim()
        if (s.length > 0) {
          i--
          break
        }
        if (i >= mi) break
        i++
      }
      dcNum = 1
      const padding = 8 - start - (mi - i)
      offset += 2 * padding
      continue
    }
    const v = parseInt(s, 16)
    if (Number.isNaN(v) || v < 0 || v > 0xffff) return null
    if (offset + 2 > 16) return null
    ipBytes.writeUInt16BE(v, offset)
    offset += 2
  }
  return ipBytes
}

/** 字符串 IP → 字节 Buffer（4 或 16）；::ffff: 前缀按 IPv4 处理；无法解析返回 null。 */
function parseIP(ip) {
  let s = String(ip || '').trim()
  if (!s) return null
  if (s.startsWith('::ffff:')) s = s.slice(7)
  if (s.includes(':')) return parseIPv6Bytes(s)
  return parseIPv4Bytes(s)
}

/* ---------- 段边界比较 ---------- */

/** v4 兼容层：ip1 大端 vs xdb 里小端存的段边界，反向逐字节对齐再比。 */
function ipSubCompareBEagainstLE(ipBytes, buff, offset) {
  const end = offset + ipBytes.length - 1
  for (let i = 0; i < ipBytes.length; i++) {
    const a = ipBytes[i] & 0xff
    const b = buff[end - i] & 0xff
    if (a < b) return -1
    if (a > b) return 1
  }
  return 0
}

/* ---------- 主查询 ---------- */

/** 在指定 Buffer（v4 或 v6 库）里对 ipBytes 做 vector index 定位 + 段索引二分，返回 region 串。 */
function searchInBuff(buff, ipBytes) {
  const bytes = ipBytes.length
  const isV6 = bytes === 16
  const indexSize = isV6 ? IPV6_INDEX_SIZE : IPV4_INDEX_SIZE
  const dBytes = bytes << 1

  // 1) vector index 定段位（前 2 字节）
  const il0 = ipBytes[0]
  const il1 = ipBytes[1]
  const vIdx = HEADER_INFO_LENGTH + il0 * VECTOR_INDEX_COLS * VECTOR_INDEX_SIZE + il1 * VECTOR_INDEX_SIZE
  const sPtr = buff.readUInt32LE(vIdx)
  const ePtr = buff.readUInt32LE(vIdx + 4)
  if (sPtr === 0 || ePtr === 0) return ''

  // 2) 段索引块二分，找覆盖本 ip 的那条
  const tmp = Buffer.alloc(indexSize)
  const cmpStart = isV6
    ? (t) => ipBytes.compare(t, 0, bytes)
    : (t) => ipSubCompareBEagainstLE(ipBytes, t, 0)
  const cmpEnd = isV6
    ? (t) => ipBytes.compare(t, bytes, bytes + bytes)
    : (t) => ipSubCompareBEagainstLE(ipBytes, t, bytes)

  let l = 0
  let h = (ePtr - sPtr) / indexSize
  let dLen = 0
  let dPtr = 0
  while (l <= h) {
    const m = (l + h) >> 1
    const p = sPtr + m * indexSize
    buff.copy(tmp, 0, p, p + indexSize)
    if (cmpStart(tmp) < 0) {
      h = m - 1
    } else if (cmpEnd(tmp) > 0) {
      l = m + 1
    } else {
      dLen = tmp.readUInt16LE(dBytes)
      dPtr = tmp.readUInt32LE(dBytes + 2)
      break
    }
  }
  if (dLen === 0) return ''

  // 3) 取 region 字符串
  return buff.slice(dPtr, dPtr + dLen).toString('utf-8')
}

/** 通用查询：ip 字符串 → region 字符串；未加载对应库 / 未命中返回空串。 */
export function searchRegion(ip) {
  const ipBytes = parseIP(ip)
  if (!ipBytes) return ''
  const buff = ipBytes.length === 16 ? v6Buff : v4Buff
  if (!buff) return ''
  return searchInBuff(buff, ipBytes)
}

/**
 * 结构化解析：`国家|省份|城市|ISP|国家码`（新，v4/v6 皆此格式）；
 * 也兼容 `国家|省份|城市|ISP`（4 段无国家码）与老 `国家|区域|省份|城市|ISP`。
 * 空/保留/0 归空串，前端把「未知地区」分组渲染。
 */
const CC_MAP = {
  中国: 'CN', 美国: 'US', 日本: 'JP', 韩国: 'KR', 英国: 'GB', 法国: 'FR', 德国: 'DE',
  加拿大: 'CA', 澳大利亚: 'AU', 新西兰: 'NZ', 新加坡: 'SG', 马来西亚: 'MY', 泰国: 'TH',
  越南: 'VN', 印度: 'IN', 印度尼西亚: 'ID', 菲律宾: 'PH', 俄罗斯: 'RU', 乌克兰: 'UA',
  巴西: 'BR', 墨西哥: 'MX', 阿根廷: 'AR', 意大利: 'IT', 西班牙: 'ES', 荷兰: 'NL',
  比利时: 'BE', 瑞士: 'CH', 瑞典: 'SE', 挪威: 'NO', 丹麦: 'DK', 芬兰: 'FI', 波兰: 'PL',
  土耳其: 'TR', 以色列: 'IL', 沙特阿拉伯: 'SA', 阿拉伯联合酋长国: 'AE', 埃及: 'EG',
  南非: 'ZA', 爱尔兰: 'IE', 葡萄牙: 'PT', 希腊: 'GR', 奥地利: 'AT', 捷克: 'CZ',
  匈牙利: 'HU', 罗马尼亚: 'RO', 保加利亚: 'BG', 克罗地亚: 'HR', 斯洛伐克: 'SK',
  巴基斯坦: 'PK', 孟加拉国: 'BD', 斯里兰卡: 'LK',
}
const NULLY = new Set(['0', '', 'null', undefined])

export function searchIp(ip) {
  const raw = searchRegion(ip)
  if (!raw) return null
  const seg = raw.split('|').map((x) => (NULLY.has(x) ? '' : x.trim()))
  const country = seg[0] || ''
  let province = ''
  let city = ''
  let isp = ''
  let cc = ''
  const last = seg[4] || ''
  if (/^[A-Z]{2}$/.test(last)) {
    // 新格式：country|province|city|isp|cc
    province = seg[1] || ''
    city = seg[2] || ''
    isp = seg[3] || ''
    cc = last
  } else if (seg.length === 4) {
    // 4 段无国家码：country|province|city|isp
    province = seg[1] || ''
    city = seg[2] || ''
    isp = seg[3] || ''
    cc = CC_MAP[country] || ''
  } else {
    // 老格式：country|region|province|city|isp
    province = seg[2] || ''
    city = seg[3] || ''
    isp = seg[4] || ''
    cc = CC_MAP[country] || ''
  }
  return { country, province, city, isp, cc }
}
