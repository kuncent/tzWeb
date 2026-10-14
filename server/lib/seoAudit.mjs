/* ============================================================
 * SEO 只读审计：读 dist/ 构建产物 + 源 index.html，逐条给 pass/detail/advice
 * ------------------------------------------------------------
 * 为什么读 dist 而不是源 index.html：
 *   Vite build 会对 index.html 做后处理（hash 文件名、内联 style、modulepreload 注入），
 *   爬虫看到的实际是 dist 里的形态；源文件里 <meta> 会被原样搬到 dist，若两边有差
 *   以 dist 为准（构建过程最近事实）。robots/sitemap/llms 也从 dist/ 读（Vite 会把
 *   public/ 整目录拷贝到 dist/ 根），源文件改了没重新 build 时面板要能立刻"红字"提示
 *   "记得重跑构建"。
 * 每一项都是 { key, label, pass, detail, advice }；面板按 pass 分色，advice 折叠展开。
 * 检查不引 cheerio/hast —— 只是若干条正则抠 head 里的 tag，够稳；不解析全文。
 * ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const DIST = path.join(ROOT, 'dist')

const readIf = (p) => {
  try { return fs.readFileSync(p, 'utf8') } catch { return null }
}

const metaRe = (name) => new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, 'i')
const metaContent = (html, name) => {
  const tag = html.match(metaRe(name))?.[0]
  if (!tag) return ''
  const m = tag.match(/content=["']([^"']*)["']/i)
  return m ? m[1] : ''
}
const propContent = (html, prop) => {
  const tag = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]*>`, 'i'))?.[0]
  if (!tag) return ''
  const m = tag.match(/content=["']([^"']*)["']/i)
  return m ? m[1] : ''
}
const linkHref = (html, rel) => {
  const tag = html.match(new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*>`, 'i'))?.[0]
  if (!tag) return ''
  const m = tag.match(/href=["']([^"']*)["']/i)
  return m ? m[1] : ''
}
const charLen = (s) => Array.from(String(s || '')).length

export function seoAudit() {
  const items = []
  const idxPath = path.join(DIST, 'index.html')
  const html = readIf(idxPath)
  if (!html) {
    return {
      items: [{
        key: 'dist-missing',
        label: '找不到 dist/index.html',
        pass: false,
        detail: '审计读取的是构建产物；请先跑 `npm run build` 让 dist 就位。',
        advice: 'npm run build',
      }],
      built: false,
    }
  }
  const head = html.slice(0, Math.min(html.length, html.indexOf('</head>') > -1 ? html.indexOf('</head>') + 7 : html.length))

  /* 1. 基础 */
  const title = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
  items.push({
    key: 'title',
    label: '页面标题 <title>',
    pass: !!title && charLen(title) >= 10 && charLen(title) <= 60,
    detail: title ? `当前 ${charLen(title)} 字：${title}` : '缺失 <title>',
    advice: !title ? '补上带品牌的独特标题' : charLen(title) > 60 ? '建议压到 60 字以内，搜索结果里不会被截断' : charLen(title) < 10 ? '标题偏短，可加一个副关键词' : '',
  })
  const desc = metaContent(head, 'description')
  items.push({
    key: 'description',
    label: 'Meta 描述',
    pass: !!desc && charLen(desc) >= 40 && charLen(desc) <= 160,
    detail: desc ? `当前 ${charLen(desc)} 字` : '缺失 <meta name="description">',
    advice: !desc ? '补一句业务定位 + 一句核心特性，控制在 80-140 字' : charLen(desc) > 160 ? '建议压到 160 字以内' : charLen(desc) < 40 ? '描述偏短，可再补一段价值点' : '',
  })
  const canonical = linkHref(head, 'canonical')
  items.push({
    key: 'canonical',
    label: 'Canonical 链接',
    pass: !!canonical && /^https?:\/\//.test(canonical),
    detail: canonical || '缺失 <link rel="canonical">',
    advice: canonical ? '' : '加一行 <link rel="canonical" href="https://<你的域名>/" />，避免带 UTM 的重复 URL 分散权重',
  })
  const langAttr = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1] || ''
  items.push({
    key: 'lang',
    label: 'HTML lang 属性',
    pass: !!langAttr,
    detail: langAttr ? `lang="${langAttr}"` : 'html 标签缺 lang',
    advice: langAttr ? '' : '<html lang="zh-CN">，非中文搜索引擎与屏幕阅读器都需要它',
  })
  const viewport = metaContent(head, 'viewport')
  items.push({
    key: 'viewport',
    label: '移动端 viewport',
    pass: !!viewport,
    detail: viewport || '缺失 <meta name="viewport">',
    advice: viewport ? '' : '加 width=device-width, initial-scale=1.0',
  })
  const theme = metaContent(head, 'theme-color')
  items.push({
    key: 'theme-color',
    label: '主题色 theme-color',
    pass: !!theme,
    detail: theme || '（可选）未设置',
    advice: theme ? '' : '可选：与品牌色对齐，Android 地址栏会跟着变色',
  })

  /* 2. 社交卡片 */
  const ogPairs = [
    ['og:title', propContent(head, 'og:title')],
    ['og:description', propContent(head, 'og:description')],
    ['og:image', propContent(head, 'og:image')],
    ['og:url', propContent(head, 'og:url')],
    ['og:type', propContent(head, 'og:type')],
    ['og:site_name', propContent(head, 'og:site_name')],
  ]
  const ogMissing = ogPairs.filter(([, v]) => !v).map(([k]) => k)
  items.push({
    key: 'og',
    label: 'Open Graph 卡片',
    pass: ogMissing.length === 0,
    detail: ogMissing.length ? `缺失 ${ogMissing.join(', ')}` : '完整',
    advice: ogMissing.length ? `补齐 ${ogMissing.length} 条 <meta property="og:..." />，微信/推特/FB 分享才有卡片` : '',
  })
  const twCard = metaContent(head, 'twitter:card')
  items.push({
    key: 'twitter',
    label: 'Twitter Card',
    pass: !!twCard,
    detail: twCard || '缺失 <meta name="twitter:card">',
    advice: twCard ? '' : 'twitter:card=summary_large_image；X/Threads 分享才有大图',
  })

  /* 3. 抓取与索引 */
  const robotsRaw = readIf(path.join(DIST, 'robots.txt'))
  items.push({
    key: 'robots',
    label: 'robots.txt 存在',
    pass: !!robotsRaw,
    detail: robotsRaw ? `dist/robots.txt（${robotsRaw.length} 字节）` : '未构建 dist/robots.txt',
    advice: robotsRaw ? '' : '在 public/robots.txt 放一份，Vite 会拷进 dist/；至少要有 User-agent: * 与 Allow: /',
  })
  if (robotsRaw) {
    const hasSitemapLine = /^Sitemap:\s*\S+/im.test(robotsRaw)
    items.push({
      key: 'robots-sitemap',
      label: 'robots.txt 指向 sitemap',
      pass: hasSitemapLine,
      detail: hasSitemapLine ? robotsRaw.match(/^Sitemap:\s*\S+/im)[0] : '缺 Sitemap 行',
      advice: hasSitemapLine ? '' : 'robots.txt 里加一行 Sitemap: https://<域名>/sitemap.xml',
    })
    const blockAll = /user-agent:\s*\*/i.test(robotsRaw) && /disallow:\s*\/\s*$/im.test(robotsRaw)
    items.push({
      key: 'robots-noindex',
      label: '未被整站 Disallow',
      pass: !blockAll,
      detail: blockAll ? 'robots.txt 有 User-agent: * 且 Disallow: /' : '允许抓取',
      advice: blockAll ? '上线前记得把 Disallow: / 撤掉，否则搜索引擎看不到你' : '',
    })
  }
  const sitemapRaw = readIf(path.join(DIST, 'sitemap.xml'))
  const urlCount = sitemapRaw ? (sitemapRaw.match(/<loc>/g) || []).length : 0
  items.push({
    key: 'sitemap',
    label: 'sitemap.xml 存在',
    pass: !!sitemapRaw,
    detail: sitemapRaw ? `含 ${urlCount} 条 <loc>` : '未构建 dist/sitemap.xml',
    advice: sitemapRaw ? (urlCount < 5 ? 'URL 太少，覆盖不全营销站的 6-7 个路由' : '') : '在 public/sitemap.xml 放一份，把所有可索引路由都列上',
  })
  const noindex = /content=["'][^"']*\bnoindex\b[^"']*/i.test(head)
  items.push({
    key: 'noindex',
    label: '未被 noindex',
    pass: !noindex,
    detail: noindex ? 'meta robots 含 noindex' : '允许索引',
    advice: noindex ? '去掉 noindex，或只在预发布环境上开' : '',
  })

  /* 4. 结构化数据 */
  const ld = Array.from(head.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)).map((m) => m[1])
  let types = []
  for (const raw of ld) {
    try {
      const j = JSON.parse(raw)
      const arr = Array.isArray(j) ? j : [j]
      for (const one of arr) {
        if (one['@type']) types = types.concat(Array.isArray(one['@type']) ? one['@type'] : [one['@type']])
      }
    } catch { /* JSON 错则视作缺失 */ }
  }
  const needTypes = ['Organization', 'WebSite']
  const hasAll = needTypes.every((t) => types.includes(t))
  items.push({
    key: 'json-ld',
    label: 'JSON-LD 结构化数据',
    pass: ld.length > 0 && hasAll,
    detail: ld.length === 0 ? '缺失 <script type="application/ld+json">' : `已声明 @type: ${Array.from(new Set(types)).join(', ')}`,
    advice: hasAll ? '' : '补 Organization 与 WebSite 两块 schema.org 数据；Knowledge Graph 卡片依赖它',
  })

  /* 5. 图片 alt 覆盖（粗判：<img 数量 vs 带 alt 的数量） */
  const imgs = Array.from(html.matchAll(/<img\b[^>]*>/gi))
  const withAlt = imgs.filter((m) => /\balt=/i.test(m[0])).length
  items.push({
    key: 'img-alt',
    label: '图片 alt 覆盖',
    pass: imgs.length === 0 || withAlt === imgs.length,
    detail: imgs.length ? `${withAlt}/${imgs.length} 张 <img> 有 alt` : '（构建产物里无静态 <img>，多为动态渲染）',
    advice: imgs.length && withAlt !== imgs.length ? '为装饰性图写 alt=""，为内容图写描述性 alt；对可访问性与图片搜索都必要' : '',
  })

  /* 6. SPA 页级 title/description 唯一性：本项目只有 index.html 一份静态标题，
     每页 title/desc 通过 React useEffect 客户端注头 —— 对爬虫不可见。
     这是一个"提示级"警告：pass=false，但明确说是结构性限制。 */
  items.push({
    key: 'spa-pages',
    label: 'SPA 客户端注头',
    pass: false,
    detail: '路由页的 <title>/<meta> 由 React 在浏览器里写入，搜索引擎抓到的都是 index.html 那份统一标题',
    advice: '若要真做 SEO：给内页引预渲染（vite-plugin-ssr/prerender）或输出静态片段；本面板只提醒不阻塞',
  })

  return {
    items,
    built: true,
    distPath: DIST,
    summary: {
      total: items.length,
      pass: items.filter((i) => i.pass).length,
      warn: items.filter((i) => !i.pass).length,
    },
  }
}
