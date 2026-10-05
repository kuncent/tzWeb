import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { aiProxy } from './server/ai-proxy.mjs'

/* 把 AI 代理挂进 Vite 自己：dev 与 preview 都能直接访问 /api/ai/*，
   不要求开发者额外起一个后端进程（Key 仍然只从 .env / 环境变量读，
   不写进任何前端代码）。生产部署则把 /api/ai 反代到 node server/ai-proxy.mjs。 */
function aiProxyPlugin() {
  /* 必须写成块级函数：connect 的 middlewares.use() 会返回 app 本身，
     而 Vite 把 configureServer 的返回值当「装完内部中间件后的回调」来调 ——
     直接返回箭头函数体的话，Vite 会去调这个 connect app，当场报 req.url undefined。 */
  const use = (server) => {
    server.middlewares.use('/api/ai', aiProxy)
  }
  return { name: 'tianze-ai-proxy', configureServer: use, configurePreviewServer: use }
}

/* 临时公网演示用的隧道域名：Vite 会校验 Host 头，来路不明的域名直接 403
   （"Blocked request. This host ... is not allowed"）。这里只放行隧道域，
   站点本身没有登录态与私有数据，/api/ai 的 Key 仍然只在服务端 .env。 */
const tunnelHosts = ['.lhr.life', '.serveo.net', '.pinggy.io', '.loca.lt', '.trycloudflare.com']

export default defineConfig({
  /* Tailwind 4 走官方 Vite 插件：postcss.config.js + autoprefixer 那条链路已拆，
     插件自己管编译与浏览器前缀。 */
  plugins: [tailwindcss(), react(), aiProxyPlugin()],
  server: { allowedHosts: tunnelHosts },
  preview: { allowedHosts: tunnelHosts },
  /* ―― 把「只被 lazy() 动态链触达的重依赖」显式列进预打包 ――
     Vite 冷启动扫描顺静态 import 图找依赖，但首屏之下那 11 屏是 React.lazy 动态
     块（见 pages/Home.jsx），echarts / @openmaic / katex / pptxgen 这些只在这些块
     底下出现，扫描够不着 → 浏览器首次滚到某屏触发 import() 时 Vite 才「现场发现新
     依赖」→ 重新优化并整页 reload。dev 下这一下会把在飞的 lazy 提交打断，表现就是
     hero 以下板块偶发全空白、要刷好几下才出来（prod 是 Rollup 预切好的静态块，无此问题）。
     显式 include 后启动一次性打包完，运行期零 re-optimize、零 reload。 */
  optimizeDeps: {
    include: [
      'echarts',
      '@openmaic/renderer',
      '@openmaic/dsl',
      '@openmaic/generation',
      'katex',
      'pptxgenjs',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'postprocessing',
      'motion/react',
      'lucide-react',
      'lenis',
      'react-router-dom',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        /* 3D 那一堆（three / @react-three/* / postprocessing）绝对不能写进
           manualChunks，object 与 function 两种形式都不行 —— 只要给它们起了
           组名，Rollup 就把这个组当静态共享块挂进入口，Vite 随即写进首屏
           modulepreload。实测（tmp/chunk-graph.mjs 顺着入口的静态 import 走）：
           分组时 index 静态依赖 three-*.js（1.6 MB 量级），去掉分组后入口只剩
           motion + router，three 全家落回一个只被 lazy() 触达的动态块。
           首屏现在是 3D 舞台，但移动端压根不挂 Canvas，那 334 kB gzip 纯浪费；
           代价是那个动态块的名字由 Rollup 挑（当前叫 useCanvasVisibility-*），
           且改一行文案就会重算它的 hash —— 营销站换文案频繁，值得这么换。 */
        manualChunks: (id) => {
          const p = id.replace(/\\/g, '/')
          if (!p.includes('/node_modules/')) return undefined
          if (/\/node_modules\/motion\//.test(p)) return 'motion'
          if (/\/node_modules\/react-router/.test(p)) return 'router'
          /* @openmaic / echarts 同理不列：它们只挂在备课台那条 lazy 链底下，
             交给 Rollup 自己切反而能拿到正确的动态边界。 */
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
})
