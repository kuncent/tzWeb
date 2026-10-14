/* ============================================================
 * 拉取 ip2region v4 / v6 xdb 数据库到 server/data/
 * ------------------------------------------------------------
 * v4 解 IPv4、v6 解 IPv6，两份独立文件；营销站访问统计双栈都要，
 * 否则走 IPv6 的国内访客会全落「未知地区」、省份榜失真。
 * 为什么要走 shell out curl：
 *   Node 原生 fetch/https 不认 WinINET 系统代理，本机演示环境又必须走
 *   127.0.0.1:7897 才连得通 GitHub raw。curl.exe 是 Win10+ 自带工具，
 *   它会读 HTTPS_PROXY 环境变量、也支持 --proxy 显式指定；比请用户配
 *   npm proxy-agent 更省事。
 * 为什么失败不 exit 非 0：
 *   tracker.mjs 里 ensureXdb() 已经对文件缺失做了静默降级（country/province
 *   归为空、xdb_hit=false），后台"未知地区"分组照样出图；离线机器 / CI 环境
 *   拉不到 xdb 不应该卡住 postinstall 或 build。
 * 目标 URL 与备用源：
 *   主：https://raw.githubusercontent.com/lionsoul2014/ip2region/master/data/ip2region_v4.xdb
 *   备：https://cdn.jsdelivr.net/gh/lionsoul2014/ip2region@master/data/ip2region_v4.xdb
 *   若主失败自动切备；两个都不通才报失败并给出 curl 手动命令。
 * 幂等：
 *   已存在且 size > 5MB 就跳过；--force 才覆盖；--no-proxy 关闭代理。
 * ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')

const RAW_BASE = 'https://raw.githubusercontent.com/lionsoul2014/ip2region/master/data/'
const MIRROR_BASE = 'https://cdn.jsdelivr.net/gh/lionsoul2014/ip2region@master/data/'
const TARGETS = [
  { name: 'IPv4', file: 'ip2region_v4.xdb' },
  { name: 'IPv6', file: 'ip2region_v6.xdb' },
].map((t) => ({ ...t, out: path.join(ROOT, 'server', 'data', t.file), main: RAW_BASE + t.file, mirror: MIRROR_BASE + t.file }))

const args = process.argv.slice(2)
const force = args.includes('--force')
const noProxy = args.includes('--no-proxy')
const proxy = noProxy ? '' : (process.env.HTTPS_PROXY || process.env.https_proxy || 'http://127.0.0.1:7897')

// curl 在 Windows 是 curl.exe（PowerShell 里 curl 是 Invoke-WebRequest 别名）；
// Linux/macOS 直接 curl。用 where/which 探一次；找不到就退回提示手工下载。
const curlBin = (() => {
  const which = process.platform === 'win32' ? 'where' : 'which'
  const r = spawnSync(which, ['curl'], { encoding: 'utf8' })
  if (r.status !== 0) return null
  const first = (r.stdout || '').split(/\r?\n/)[0]
  if (!first) return null
  // Windows 上若解析到 PowerShell 的 curl alias 是空文件；只要真实 curl.exe 路径
  if (process.platform === 'win32' && !/\\curl\.exe$/i.test(first)) return 'curl.exe'
  return first
})()

function validFile(p) {
  try {
    const st = fs.statSync(p)
    // v4 xdb 大约 11MB；给个保守下限 5MB，容错小版本
    return st.isFile() && st.size > 5 * 1024 * 1024
  } catch {
    return false
  }
}

function mkdirp(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
}

function download(url, dest) {
  if (!curlBin) {
    console.error('· 未检测到 curl 可执行文件；请手动下载：')
    console.error(`    ${url}`)
    console.error(`  保存到：${dest}`)
    return false
  }
  const tmp = dest + '.part'
  const a = ['-L', '--fail', '--retry', '2', '--connect-timeout', '15', '--max-time', '180', '-o', tmp, url]
  if (proxy) a.unshift('--proxy', proxy)
  console.log(`· curl ${proxy ? '(代理 ' + proxy + ') ' : ''}拉取 ${url}`)
  const r = spawnSync(curlBin, a, { stdio: 'inherit' })
  if (r.status !== 0) {
    try { fs.unlinkSync(tmp) } catch { /* ignore */ }
    return false
  }
  if (!validFile(tmp)) {
    console.error('· 下载完成但文件校验失败（过小或损坏）')
    try { fs.unlinkSync(tmp) } catch { /* ignore */ }
    return false
  }
  mkdirp(dest)
  fs.renameSync(tmp, dest)
  return true
}

console.log('[pull-ipdb] 目标：', TARGETS.map((t) => t.file).join(', '))
let anyFail = false
for (const t of TARGETS) {
  if (validFile(t.out) && !force) {
    const st = fs.statSync(t.out)
    console.log(`[pull-ipdb] ${t.name} 已存在（${(st.size / 1024 / 1024).toFixed(2)} MB），跳过。`)
    continue
  }
  console.log(`[pull-ipdb] 拉取 ${t.name} → ${t.out}`)
  let ok = download(t.main, t.out)
  if (!ok) {
    console.log(`[pull-ipdb] ${t.name} 主源失败，尝试镜像 jsDelivr ...`)
    ok = download(t.mirror, t.out)
  }
  if (ok) {
    const st = fs.statSync(t.out)
    console.log(`[pull-ipdb] ✓ ${t.name} 完成：${(st.size / 1024 / 1024).toFixed(2)} MB`)
  } else {
    anyFail = true
    console.warn(`[pull-ipdb] ⚠ 未能自动下载 ${t.file}；该栈访客“地区分布”会落到「未知」。`)
    console.warn(`            手动指令：curl -L --proxy ${proxy || '<你的代理>'} -o "${t.out}" ${t.main}`)
  }
}
// 不 exit 非 0：npm run pull-ipdb 失败不该阻塞 dev/build/preview
void anyFail
