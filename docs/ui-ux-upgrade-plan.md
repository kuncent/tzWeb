# 官网 UI/UX 升级方案 · 从「信息堆叠」到「克制的精密感」

> 工作区：`E:\official web`（Vite 5 + React 18 + Tailwind 4 + motion + three/R3F）
> 阶段：**只读分析 + 方案**，本文不含任何代码改动
> 结论：**不要再加效果，而是收系统**。当前站点的问题不是"不够炫"，而是 51 档字号、7 套阴影、251 个胶囊、69 处持续动画共同冲淡了专业感。

---

## 0. 结论先行

### 0.1 三件事决定 80% 的观感

| # | 动作 | 为什么 | 影响面 |
|---|---|---|---|
| 1 | **把视觉 token 真正收敛**：字号 51→9 档、圆角 8→4 档、阴影 7→3 档、近黑 4→1 个 | 现在的 `@theme` 只定义了一部分，业务代码仍大量写 `text-[12.5px]`、`rounded-full`、`shadow-glow`。系统在，但没被执行 | 纯样式层，`src/index.css` + 全站类名替换 |
| 2 | **把品牌蓝从"装饰色"降回"动作色"** | `shadow-glow` 32 处、渐变辉光遍布亮色区、hover 同时变边框+阴影+发光。蓝色一多，页面就从"高端"滑向"模板" | 样式层，可 P0 完成 |
| 3 | **砍掉首屏的表演性信息**（252vh 钉屏、每秒 uptime、百分比、190–300px 水印数字、3 个看板） | 首屏在替用户做决定。高端站的首屏只做一件事：一句主张 + 一个证据 + 一个动作 | 结构层，P2 |

### 0.2 推荐方向

**「克制的科技精密感」**——保留暗色首屏与实验室气质，但把装饰密度降到现在的 1/3；用留白、字阶、细描线和单一强调色建立秩序，而不是靠 3D、辉光和大数字水印。

### 0.3 不做的事

- 不推翻现有信息（产品矩阵、案例、实验室都是资产）
- 不重做 3D（P2 只决定"要不要留在首屏"，不做技术重写）
- 不改 `section id`（后台内容覆盖 `sections.<id>.*` 与所有 `/#contact` 链接都依赖它）

---

## 1. 现状速览

### 1.1 技术栈与构建

| 项 | 现状 | 出处 |
|---|---|---|
| 框架 | React 18.3 + React Router 6，SPA | `package.json:14-32` |
| 构建 | Vite 5 + `@tailwindcss/vite`（Tailwind 4，无 tailwind.config.js，token 全在 CSS `@theme`） | `vite.config.js:25-57` |
| 样式入口 | `src/index.css` 单文件，`@import 'tailwindcss' source(none)` + `@source` 显式扫描 | `src/index.css:12-15` |
| 动效 | `motion` 12、`lenis` 1.1、`three` + R3F + postprocessing、`echarts`、`@openmaic/*` | `package.json:14-31` |
| 分包 | 内页 lazy；首页 9 屏为 `import()` 动态块 + idle 挂载；three 不进入口 | `src/App.jsx:13-28`、`src/pages/Home.jsx:19-41`、`vite.config.js:58-79` |
| 字体 | Google Fonts `Inter` 300–700，异步加载；**无中文 Web 字体** | `index.html:25-32`、`src/index.css:46-48` |
| 后台 | `/admin` 独立壳，13 个文件共用同一套 token（`bg-mist-100` 等） | `src/App.jsx:99-112`、`src/admin/*` |

### 1.2 路由与信息架构

| 路由 | 页面 | 结构 |
|---|---|---|
| `/` | 首页 | 暗色 3 场景钉屏 → 9 个锚点区块（`problems / advisor / matrix / architecture / ai / delivery / customers / resources / contact`） |
| `/solutions` | 解决方案 | PageHero + InnerNav + 6 段 + PageCTA |
| `/technology` | 技术方向 | 6 段（stack / bases / pipeline / agents / assurance / open） |
| `/devices` | 产品设备 | 5 类设备 + 规格段 |
| `/laboratories` | 实训实验室 | rigs + 课程 + 交付 |
| `/cases` | 高校案例 | wall / logos / outcomes / network |
| `/about` | 关于我们 | who / beliefs / proof / service / network |
| `/admin` | 后台 | 独立路由树，不套营销头尾 |

- 首页锚点清单：`src/data/site.js:55-65`；主导航 7 项：`src/data/site.js:37-45`。
- 首页实际挂载顺序：`src/pages/Home.jsx:88-100`。

### 1.3 现有视觉系统（实测值）

| 维度 | 现状 | 证据 |
|---|---|---|
| 中性色 | 亮色 `mist #f5f8fc / #eef3f9 / #e3eaf3`；墨色 `#0b1220 / #16202e / #2a3648 / #5d6b7e / #8b98a9` | `src/index.css:19-30` |
| 品牌色 | `#1677ff` + 8 档蓝（`2e8bff / 65bfff / 8fd0ff / bfe3ff / d6e9ff / eaf4ff / 0e5fd8 / 0b4ab0`） | `src/index.css:32-40` |
| 暗色 | **4 种近黑**：`#04070d`（34 处，首屏/内页首屏）、`#0a0f1a`（night）、`#0A0E16`（页脚）、渐变里的 `#050a13 / #0a1524` | `src/index.css:42-44`、`src/components/Footer.jsx:20`、`src/components/sections/StoryHero.jsx:65` |
| 字阶 | token 有 `body-lg / h3 / h2 / h1 / display / stat` 6 档；**业务代码另有 51 个任意值**，共 247 处 | `src/index.css:55-73` + 全站 grep |
| 字号分布 | `12.5px`×135、`13px`×132、`11px`×104、`12px`×82、`13.5px`×65、`10.5px`×57、`11.5px`×51、`14px`×48、`10px`×48、`9.5px`×28、`8.5px`×1 … | 同上 |
| 字距 | 0.14em–0.30em 至少 8 档（eyebrow 0.22em / 首屏 0.30em / 内页首屏 0.28em） | `src/index.css:328-330`、`src/components/sections/StoryHero.jsx:109`、`src/components/PageShell.jsx:71` |
| 圆角 | `rounded-full` 251、`xl` 97、`2xl` 95、`lg` 39、`md` 16、`sm` 8、`3xl` 8，加 4 个硬编码 | 全站 grep |
| 阴影 | `card` 49、`lift` 28、`glow` 32、`elev` 6、`glass`、`soft`、`elev-lg`，另有 12 处内联 `shadow-[…]` | `src/index.css:75-83`、`src/components/ui.jsx:294-310` |
| 容器 | 1280 / 1440 / 1680 / 1780 四档；首屏另用 1440 / 1640 / 1780 + `px-10` | `src/index.css:325-327`、`src/components/sections/StoryHero.jsx:501,561` |
| 模糊层 | `backdrop-blur-*` 23 处 | 全站 grep |
| 图标 | lucide 线性图标（16–20px 混用）+ 5 枚程序化 3D 图标 + 2 个 React Bits 动效组件 + 自绘 SVG | `src/components/sections/Problems.jsx:118`、`src/pages/Technology.jsx:143`、`src/pages/Devices.jsx:122` |
| 图片 | 18 张设备 PNG 合计 ≈3.3 MB；38 张案例图 JPG/PNG 混用；72 个 logo WebP | `public/images/devices/*`、`public/images/cases/*` |

### 1.4 关键交互与动效

- 平滑滚动：Lenis `duration 0.92`，减弱动效下不启用（`src/hooks/useLenis.js:9-15`）。
- 全局缓动**号称收敛，实际三套**：
  - `ui.jsx` `EASE = [0.16,1,0.3,1]`（`src/components/ui.jsx:13`）
  - `StoryHero.jsx` `EASE = [0.22,1,0.36,1]`（`src/components/sections/StoryHero.jsx:53`）
  - `ProductMatrix.jsx` `EASE = [0.22,1,0.36,1]`（`src/components/sections/ProductMatrix.jsx:21`）
  - `index.css` 的 `card-elev` 又用 `cubic-bezier(0.16,1,0.3,1)`，`.btn-*` 用 Tailwind 默认 `ease`（`src/index.css:332-341,355`）
- **69 处** `repeat: Infinity` / `animate-*` / `infinite` 命中：`animate-floaty`、`animate-pingslow`、`animate-breathe`、`hammer`、`mapBeam`、`mapProj`、`cbSweep`、`cbMarquee`、`arch-flow`、`flowX`、`flowUp`、`drift`、`animate-bounce`，以及 `AIAdvisor` 三个无限演示循环（`src/components/sections/AIAdvisor.jsx:71-131`）。
- 揭示：`LineMask` 0.9s + `Reveal` 0.8s（`src/components/ui.jsx:29-59`），卡片 `hover` 常同时改 阴影 + 位移 + 边框色 + 发光。

### 1.5 响应式

| 断点 | 值 | 用法 |
|---|---|---|
| 默认 | 640 / 768 / 1024 / 1280 / 1536 | 全站 |
| 自定义 | `wide 1900`、`3xl 2200` | 仅容器与首屏宽度（`src/index.css:100-101`） |

- 首屏：`lg` 以上钉屏三切并挂 WebGL；`lg` 以下**三屏完整堆叠**（每屏含文案 + 看板），见 `src/components/sections/StoryHero.jsx:612-620`。
- 产品矩阵：`lg` 以上钉屏 5 屏 ×52vh；以下变成长列表（`src/components/sections/ProductMatrix.jsx:393,484`）。

### 1.6 性能与可访问性基础

- 首屏 3D 仅桌面挂载；three 不进入口（`vite.config.js:61-69`），移动端不下载 —— 这点做得对。
- 入口 JS 拆到 motion/router 两组；内页 lazy；首屏下 9 屏 idle + `startTransition`（`src/pages/Home.jsx:66-82`）。
- 构建缓存 `dist` 最近一次产物体量 4.94 MB / 114 文件（2026-10-20）；`react-three-fiber` 单块 792 KB 未压缩。
- 已有：`:focus-visible` 2px 品牌环（`src/index.css:297-306`）、全站 `prefers-reduced-motion` 降级（`src/index.css:491-499`）、`aria-label` 49 处、`#boot role=status`。
- 缺失/风险：无跳过导航链接；表单无显式 `<label>` 关联；页脚无 ICP 备案号；首屏移动端存在多 `<h1>`（见 D10）。

---

## 2. 现状诊断（按对"高端感/简洁感"的破坏力排序）

### D1 · 视觉 token 在，但没被真正执行 ★★★★★

`@theme` 已经定义了字阶（`src/index.css:55-73`），但全站仍有 **247 处硬编码字号、51 个不同值**；圆角有 8 档、阴影有 7 个命名 + 12 个内联值。最典型的是同一层级出现 12px / 12.5px / 13px / 13.5px 四种"正文小字"：

- `text-[12.5px]`：`src/components/Navbar.jsx:160,198`、`src/components/sections/ProductMatrix.jsx:48`
- `text-[13px]`：`src/components/Footer.jsx:61`、`src/components/Navbar.jsx:183`
- `text-[13.5px]`：`src/components/sections/StoryHero.jsx:132`、`src/pages/About.jsx:65`
- `text-[14px]`：`src/components/sections/AIAdvisor.jsx`（多处）

人眼不会读出错位，但会读到"不整齐"。这是高端感损失的第一来源，也是最容易修的一项。

### D2 · 品牌蓝变成装饰色，发光滥用 ★★★★★

- `shadow-glow` 32 处，`shadow-card` 49 处，卡片 hover 还额外把描边变成品牌蓝：`src/index.css:357-360`（`border-color: rgba(22,119,255,.28)`）。
- 亮色区普遍叠径向辉光：`src/components/sections/Customers.jsx:24-28`（3 团光 + 点阵 + 顶部光条）、`src/components/sections/Contact.jsx:100`、`src/components/PageShell.jsx:257-259`。
- 首屏的强调色随场景切换（`scene.accent`），同一个页面出现 3 套强调色（`StoryHero.jsx:108,147,162,550`）。

**判断**：蓝色应当是"可点击/可聚焦"的信号，不是氛围灯。当前它同时承担 CTA、状态、装饰、发光、边框，导致层级失效。

### D3 · 四种近黑 + 亮暗拼接，暗色不"贵" ★★★★☆

`#04070d`（34 处）、`#0a0f1a`（night 系列）、`#0A0E16`（页脚）、渐变 `#050a13 / #0a1524`。三者亮度差在暗场里几乎不可辨，但当页脚与首屏上下相邻时，会读成"两个不同团队做的"。

同时 `index.html:6` 的 `theme-color` 是 `#F5F8FC`，而首屏底色是 `#04070d`（`index.html:111-113`），移动端浏览器地址栏与页面首屏不一致。

### D4 · 首屏信息过载 + 滚动劫持 ★★★★★

`src/components/sections/StoryHero.jsx`：

- 钉屏行程 `100vh + 2×76vh = 252vh`（L52、L443），用户要滚 1.5 屏才看到第二屏，2.5 屏才进正文。
- 同屏并存：190–240px 幽灵数字（L96-100）、英文 kicker + 编号、H1 两行、描述、3 个标签、2 个 CTA、指令回执条（L172-179）、右下 380px 看板（L535）、装配进度条（L530）、底部三屏切换 + 进度条 + 百分比 + uptime + 室温 + 滚动提示（L560-607）。
- 自动演示每 5.6s 切一次（L405-422）；`Uptime` 每秒重渲（L187-205）。

**结果**：首屏没有"视觉焦点"，任何一块都不够大；而高端站的首屏通常只有一个焦点。

### D5 · 导航双模式 + 首页 9 段 ★★★★☆

- 顶栏在首屏内是"页面导航"（7 项），滚过 `problems` 后切换成"板块导航"（9 项）（`src/components/Navbar.jsx:24,86-108,147-199`）。
- 用户在同一位置看到两套完全不同的链接，且切换时机不可预期；移动端抽屉里两套同时出现（L253-285）。
- 首页 9 个锚点 + 首屏 3 场景，整页约 14–16 屏；其中首屏与产品矩阵两处钉屏合计 **约 560vh**（252 + 308）。

### D6 · 首屏与正文容器不对齐 ★★★★☆

- 正文：`container-x` 在 1440 宽屏是 `max-w-1280 + px-14`，文字左边缘 x≈136（`src/index.css:325-327`）。
- 首屏：`max-w-[1440px] + px-10`，文字左边缘 x≈40（`StoryHero.jsx:501`）。

**1440 宽屏相差 96px，1920 宽屏相差 116px**。滚动时标题会"横跳"，这是最容易被设计同行一眼看出的破绽。

### D7 · 中文排版是最大的"廉价感"来源 ★★★★★

- 只加载 Inter（`index.html:27-32`），中文一路落到 `HarmonyOS Sans SC → Source Han Sans SC → PingFang SC → Microsoft YaHei`（`src/index.css:46-48`）。
- Windows 上大概率命中 **Microsoft YaHei**：字形偏方、字重层级弱、与 Inter 并排时中英文字面大小不一致。
- 中文标题大量 `font-bold`（700）+ 负字距（`text-h2` -0.024em，`src/index.css:62`），宋体/黑体在 700 时笔画粘连，反而不如 600。
- 正文字号跨 13/13.5/14/15px，行高跨 1.7/1.75/1.8/1.85/1.9/1.95 —— 中文排版最忌这条。

### D8 · 卡片与胶囊同质化，缺"材质层级" ★★★★☆

- 251 个 `rounded-full`：导航项、标签、按钮、统计、图标底座、徽标、案例标全部是胶囊。
- `card-elev` 的 hover 同时改边框色 + 换成更大的双层阴影（`src/index.css:351-360`）；`Problems` 的图标牌 hover 又加 `shadow-lg shadow-brand/25 ring-1`（`src/components/sections/Problems.jsx:148-150`）。
- 一个页面里 4 种"卡片"：白卡、玻璃卡、暗场卡、带内高光的卡片。

**判断**：胶囊 + 发光 + 大圆角是 2021–2023 年 SaaS 模板的典型组合；要"高端"，应回到 8–12px 的克制圆角与 1px 描线。

### D9 · 动效语言不统一，且有"表演性"动画 ★★★★☆

- 缓动 3 套（见 1.4），入场时长 0.46–0.9s 混用。
- 69 处持续动画中，真正必要的只有"首屏环境光"与"加载条"。地图的锤子敲击、光锥投影、看板扫描、跑马灯、呼吸光环、浮动小卡、打字机演示 —— 都在争抢注意力（`src/index.css:125-208`、`AIAdvisor.jsx:37-131`）。
- `animate-bounce` 的 ChevronDown（`StoryHero.jsx:603`）是最典型的"廉价"信号。

### D10 · 对比度不达标（可访问性/专业度双输）★★★★☆

按 WCAG 2.1 计算（相对亮度法）：

| 组合 | 对比度 | 结论 |
|---|---|---|
| `ink-400 #8b98a9` on `#fff` | **2.93:1** | 小字不达标（需 4.5:1）；却用于 eyebrow、图注、说明（`src/index.css:329`） |
| `brand #1677ff` on `#fff` | **4.10:1** | 小字不达标；却用于 10–12px 的编号/标签（`src/components/ui.jsx:228-237`） |
| `white/45` on `#0A0E16` | **4.50:1** | 页脚 13px 链接临界（`Footer.jsx:61`） |
| `white/35` on `#0A0E16` | **3.17:1** | 版权行不达标（`Footer.jsx:97-101`） |
| `white/28` on `#0A0E16` | **≈2.4:1** | 首屏提示语不达标（`StoryHero.jsx:549`） |
| `ink-500 #5d6b7e` on `#fff` | **5.34:1** | 达标 |

其他：

- 移动端首屏 `MobileScene × 3`，每个都渲染 `<Copy>` 里的 `<h1>`（`StoryHero.jsx:115,227-236,617`）→ **一个页面 3 个 H1**，SEO 与屏幕阅读器都受损。
- 表单只有 placeholder，没有 `<label>`/`aria-invalid`/`aria-describedby`（`src/components/sections/Contact.jsx:8-9` 起）。
- 页脚无 ICP 备案号（境内官网合规项）。

### D11 · 图片资产不统一 ★★★☆☆

- 18 张设备图为 PNG，单张 98–280 KB，合计 ≈3.3 MB（`public/images/devices/`）。
- 38 张案例图 JPG/PNG 混用（`public/images/cases/`），大小 7–170 KB，色调未统一。
- 只有 `CoverCard` 用了 `img-duo` 降饱和（`src/index.css:379-385`），其它案例/背景图没有统一色温。
- 72 个彩色校徽铺在漂移墙上（`src/components/sections/LogoDriftWall.jsx`），色彩噪声大。

### D12 · 后台与官网共用 token 的连带风险 ★★★☆☆

`src/index.css` 的 `--color-mist-* / ink-*` 同时被 `/admin` 的 13 个文件使用。**只改值、不改名**是安全的；一旦重命名 token，后台会大面积掉色。这条要在实施时写进约束。

---

## 3. 视觉系统重构建议

### 3.1 色彩

#### 3.1.1 色板（终版见 color-system-spec.md）

完整色板、比例、映射与 WCAG 校验表见 [color-system-spec.md](file:///E:/%E2%80%8Cofficial%20web/docs/color-system-spec.md)。此处只保留结论速览：

| 层级 | 终值 | 用途 |
|---|---|---|
| 亮面 | `mist-50 #FFFFFF` / `mist-100 #F7F8FA` / `mist-200 #EFF1F4` / `mist-300 #E4E7EC` | 卡 / 画布 / 区块 / 装饰线 |
| 文字 | `ink-900 #0B0F17` → `ink-400 #67707C` 五档 | 标题 → 元信息，白底 19.18 / 5.02 ✅ |
| 品牌 | `brand #1677FF`（标识）/ `brand-action #0E5FD8`（按钮）/ `brand-text #0B5BD3`（文字） | 同一色相、三种职责 |
| 暗面 | `night-950 #06080D` / `night-900 #0A0D14` / `night-800 #10151E` / `night-700 #171D28` | 唯一暗底 + 三级抬升 |
| 第二强调 | `data #0E7490`（白底 5.36）/ `data-on-dark #2DD4BF` | 只做状态点与数据标签，≤0.5% |
| 功能 | `success #0F7A5A` / `warning #A15C07` / `danger #B42318` | 表单与状态，不做装饰 |

> 关键：`ink-400` 从 **2.93** 提到 **5.02**；主按钮底改 `#0E5FD8`（白字 4.10→**5.76**）；近黑从 4 种并为 1 种。

#### 3.1.2 三条硬约束

- 中性 92% / 品牌蓝 ≤5% / 数据青 ≤0.5% / 功能色 ≤2.5%
- 每视口**填充蓝元素 ≤1 个**；**发光 ≤1 处**（仅暗色首屏）
- 蓝色文字一律 `brand-text`；`#1677FF` 不做白底小字、不做白字按钮底

#### 3.1.3 语义色

现在只有 `emerald-500` 被硬编码（`AIAdvisor.jsx:91,123`）。统一替换为 `success / warning / danger`，只用于表单与状态点，不做装饰。

### 3.2 字体

| 项 | 建议 | 理由 |
|---|---|---|
| 拉丁 | **自托管 Inter 可变字体**（`wght 400–650`），`woff2` + `preload`，移除 Google Fonts 两个域名 | 去掉 2 个第三方连接与境内不可达风险；`index.html:25-32` 现为异步，但仍要等 DNS/TCP |
| 中文 | **自托管 HarmonyOS Sans SC**（免费商用）或 MiSans；只取 400/500/600 三个静态子集，`unicode-range` 切分 | 避免 Windows 落到雅黑；与 Inter 的字面高度更接近 |
| 备选 | 思源宋体（OFL）仅用于"编辑感"方向的大标题 | 见第 8 节方向 A |
| 字重 | 中文标题 **600**，不再 700；拉丁可 650 | 黑体 700 在大字号下笔画粘连 |
| 数字 | `font-variant-numeric: tabular-nums`，统计/价格/编号统一 | 现在 `tabular-nums` 零散使用 |
| 特性 | `font-synthesis: none; text-rendering: optimizeLegibility;` | 防止浏览器伪造字重 |

### 3.3 字阶（9 档，替代 51 个任意值）

| Token | 移动 | 桌面 | 行高 | 字距 | 字重 | 用途 |
|---|---|---|---|---|---|---|
| `display` | 36px | clamp 44→72px | 1.04 | -0.035em | 600 | 首屏主张（≤2 行） |
| `h1` | 32px | clamp 36→56px | 1.08 | -0.030em | 600 | 内页首屏 |
| `h2` | 26px | clamp 28→40px | 1.12 | -0.025em | 600 | 区块标题 |
| `h3` | 21px | clamp 22→28px | 1.20 | -0.020em | 600 | 卡片组标题 |
| `h4` | 17px | 18→20px | 1.30 | -0.010em | 600 | 卡片标题 |
| `lead` | 16px | 17→19px | 1.75 | 0 | 400 | 首屏副文/区块导语 |
| `body` | 15px | 15→16px | 1.75 | 0 | 400 | 正文 |
| `body-sm` | 13px | 13.5→14px | 1.65 | 0 | 400 | 卡片正文 |
| `caption` | 12px | 12→13px | 1.50 | 0.01em | 500 | 元信息/图注 |
| `micro` | 11px | 11px | 1.40 | 0.14em | 600 | 仅拉丁 eyebrow（大写） |

**替换映射**（按出现次数）：

| 现值 | 出现 | 归入 |
|---|---|---|
| 12.5px | 135 | `caption` 或 `body-sm`（按语义二选一） |
| 13px | 132 | `body-sm` |
| 11px | 104 | `micro` |
| 12px | 82 | `caption` |
| 13.5px | 65 | `body-sm` |
| 10.5px / 11.5px | 57 / 51 | `micro` / `caption` |
| 9.5px / 9px / 8.5px / 8px | 28 / 7 / 1 / 5 | 删除或并入 `micro`（中文 8px 不可读） |
| 14px / 14.5px / 15px | 48 / 10 / 29 | `body-sm` / `body` |
| 16–28px | 各 3–15 | `h4` / `h3` / `h2` |

**中文正文宽度**：现在 `max-w-2xl`（672px）。16px 中文约 42 字/行，偏长；建议 `max-w-[36em]`（≈576–608px，32–38 字/行），首屏副文 `max-w-[30em]`。

**eyebrow 统一**：`11px / 600 / 0.14em / uppercase`，颜色 `ink-400`（已提高到 AA）。中文小标不加 uppercase，改用 `6px 竖线 + 11px 中文`。

### 3.4 栅格与间距（8pt 体系）

#### 3.4.1 容器：从 4 档收到 2 档

| 场景 | 现值 | 建议 |
|---|---|---|
| 正文 | 1280 / 1440 / 1680 / 1780 | **1280**（≤1536）、**1440**（≥1536），左右留白自适应 |
| 首屏 | 1440 / 1640 / 1780 + px-10 | **复用 `container-x`**（删除独立 max-width） |
| 栅格 | 隐式 | **12 列 / gutter 24px**（≥lg），16px（<lg） |
| 边距 | 24 / 40 / 56 | **24 / 32 / 48**（移动/平板/桌面） |

#### 3.4.2 间距刻度（只用 10 个值）

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128`

替换：

- `gap-2.5`（10px，45 处）→ 8 或 12
- `mt-1.5` / `space-y-2.5`（49 / 8 处）→ 8 或 4
- `p-6`（24px，39 处）保留；移动端改 `p-5`（20px 例外，仅用于窄卡）
- 卡片内部节奏：标题→正文 **12**，正文→元信息 **16**，卡内边距 **24**
- 区块纵向：`--section-y: clamp(64px, 7vw, 120px)`；现在 `sec-y` 是 72→136（`src/index.css:371-374`），`PageSection` 是 96/112（`PageShell.jsx:222`），**两套节奏**，统一为一套
- 区块标题→内容 **48**（现在 56，`mt-14`）

#### 3.4.3 栅格修正

- `Problems` 在 `lg` 用 5 列（`Problems.jsx:113`）：1280 容器下每卡 ≈233px，减去 48px 内边距只剩 185px 文本宽。建议 **lg 3 列 + 2 张宽卡**，或 2×2 + 1 横跨。
- 案例/设备卡：`md:2 / lg:3 / xl:4`，不要 5 列。
- 统计条保持 `sm:grid-cols-4`（`ui.jsx:360`），但去掉竖分割线，改 32px 间距。

### 3.5 圆角 / 描边 / 阴影

#### 3.5.1 圆角：4 档 + 胶囊白名单

| Token | 值 | 用途 |
|---|---|---|
| `r-sm` | 4px | 标签、徽标、输入框内元素 |
| `r-md` | 8px | 按钮、输入框、导航项 |
| `r-lg` | 12px | 卡片、面板 |
| `r-xl` | 16px | 媒体、首屏大面板 |
| `r-pill` | 999px | **仅**：筛选 chip、状态点、头像、圆形图标钮 |

目标：`rounded-full` 从 251 降到 **<80**。主 CTA 由胶囊改 **8px** —— 这是与"模板 SaaS"最快的区隔。

#### 3.5.2 描边

| 场景 | 值 |
|---|---|
| 亮底 | `1px rgba(11,18,32,.08)` |
| 暗底 | `1px rgba(255,255,255,.07)` |
| 强调 | 仅 hover/focus：`1px rgba(22,119,255,.24)` |
| 分隔线 | `1px rgba(11,18,32,.06)`，不用渐变发光分割 |

#### 3.5.3 阴影：3 层，禁止发光当阴影

| Token | 值 | 用途 |
|---|---|---|
| `sh-1` | `0 1px 2px rgba(8,11,18,.04), 0 6px 16px -8px rgba(8,11,18,.08)` | 卡片静息 |
| `sh-2` | `0 2px 4px rgba(8,11,18,.05), 0 18px 40px -20px rgba(8,11,18,.16)` | 卡片 hover / 下拉 |
| `sh-3` | `0 40px 80px -32px rgba(8,11,18,.28)` | 模态/浮层（仅搜索、抽屉） |

删除：`shadow-glow`（32 处）、`shadow-glass`、`shadow-soft`、`shadow-lift`、`shadow-card`、`shadow-elev`、`shadow-elev-lg`、12 处内联 `shadow-[…]`。统一到 3 个名字。

#### 3.5.4 卡片材质：只保留 2 种

1. **亮卡**：`#fff` + 1px `ink/.08` + `sh-1`；hover → 边框 `ink/.14` + `sh-2`，**不再变蓝**
2. **暗卡**：`night-800` + 1px `white/.07`；无内高光、无渐变

删除"玻璃卡"（`glass-card`，`index.css:343-345`）与 `card-elev-dark` 的渐变底（`index.css:361-366`）。

### 3.6 图标与图片风格

**图标**

- 尺寸只留 2 个：**16px（行内）/ 20px（独立）**，`strokeWidth 1.5`（lucide 默认 2 偏粗）。
- 删除 `Problems` 的 5 枚 WebGL 程序化图标（`Problems.jsx:118`、`src/components/three/icons/ProblemIcons.jsx`）→ 换 28px 单色线性图标。理由：每屏多一个 WebGL 上下文，且"立体图标"与全站的细线语言冲突。
- 产品符号统一为**双色 SVG**（`ink-900 + brand`），用于产品矩阵与架构图。
- 技术示意图（架构/拓扑）统一"细线 + 单色填充 + 编号"，删除 HUD 四角括号（`PageShell.jsx:133-136`）。
- 不引入第二套图标库。

**图片**

- 统一输出 **WebP/AVIF**，`srcset` 640 / 1024 / 1600；设备图从 3.3 MB PNG 压到 ≤0.9 MB。
- 统一裁切：案例 4:3，实验室 16:9，设备 1:1；`object-position` 固定为视觉中心。
- 统一调色：`saturate(.78) contrast(1.03)`，hover 恢复（沿用现有 `img-duo` 思路，但推广到所有内容图，`index.css:379-385`）。
- 校徽墙：统一 **单色（ink 或白）+ 60% 不透明度**，hover 恢复本色；现在 72 个彩色 logo 是最大的色彩噪声源。
- 图片加 `width/height` 或 `aspect-ratio`，消除 CLS。

### 3.7 暗色的"克制"处理

**只保留 3 处暗场**：首屏、内页首屏、页脚/收口 CTA。

- 亮色区删除径向辉光、点阵、顶部光条（`Customers.jsx:23-31`、`Contact.jsx:100`、`PageShell.jsx:257-259`）。
- 暗场只允许：**1 个**径向渐变（品牌蓝 8–12% 透明度）+ **1 层** 1.5% 白网格，且网格必须 `mask` 淡出。
- 删除 190–300px 幽灵数字（`StoryHero.jsx:96-100`、`Customers.jsx:30`、`ProductMatrix.jsx:39`、`About.jsx:86px` 等）。大数字水印是"模板站"的强信号，且与高端感无关。
- 首屏底部 3 个业务的强调色收敛为 1 个品牌蓝（`heroScenes` 的 `accent` 只保留给数据点）。

---

## 4. 页面级改版建议

### 4.1 首屏 / Hero

| 改什么 | 为什么 | 怎么改 |
|---|---|---|
| 行程 252vh → **100vh** | 用户第一屏就该看懂"你是谁、能给我什么" | 删除 `STEP_VH` 钉屏（`StoryHero.jsx:52,443`），保留 1 屏；场景切换改为底部 3 个 tab，点击即换，不绑滚动 |
| 信息从 12 块 → **5 块** | 当前没有焦点 | 保留：eyebrow、H1（2 行）、1 段 ≤55 字描述、2 个 CTA、1 个产品视觉；删除幽灵数字、标签组（或降为 3 个纯文本）、指令回执、uptime、室温、百分比、`LAB-01`、滚动 chevron |
| 右下 380px 看板 → **1 个媒体面板**（16:10，≤560px） | 看板里的仿真数据是"看起来在动"，不是证据 | 用真实产品截图/录屏（已有 `public/img/products/*.mp4` 三个物料）；无视频时用静帧 + 1 个数据标注 |
| 强调色 3 套 → **1 套** | 三色同时出现削弱品牌 | `scene.accent` 只用于小数据点与进度，CTA 一律 `brand` |
| 容器与正文对齐 | D6 | 用 `container-x` 替换 `max-w-[1440px] px-10`（L501、L561） |
| 移动端 3 屏堆叠 → **1 屏 + 3 tab** | 现在要滑 3 屏才进正文，且 3 个 H1 | 删除 `MobileScene × 3` 循环（L617-619），只渲染当前场景；`<h1>` 唯一 |
| 保留品牌资产 | — | 3D 舞台、装配动画是差异化资产，**建议保留但降为"可选"**：桌面挂载，滚动即跳过（逻辑已存在，L304-316） |

**验收标准**：1440×900 下首屏可见 1 个 H1 + 1 个 CTA + 1 个媒体面板，无第二强调色，无持续跳动文字。

### 4.2 导航

| 改什么 | 为什么 | 怎么改 |
|---|---|---|
| 7 项 → **5 项** + CTA + 搜索 | 7 项在 1280 宽下已经挤（`Navbar.jsx:177-199`） | 首页 / 产品与方案 / 技术 / 案例 / 关于；"实验室"并入"产品与方案"的 mega menu（5 个产品 + 2 个入口） |
| 删除"页面/板块"双模式 | 同一位置两套链接，切换不可预期 | 主导航恒定；首页锚点改为**右侧竖排圆点导航**（仅 ≥lg，hover 显标签），或干脆取消——首页缩到 6 段后不需要目录 |
| 高度 64 → **72**（桌面）/ 56（移动） | 64px 配 13px 字显局促 | `h-[72px]`；滚动后白底 + `1px ink/.06` 底线，不用整块 `shadow-soft`（`Navbar.jsx:139-141`） |
| 滚动时才模糊 | 现在 `backdrop-blur-xl` 常驻在实底态 | 透明态无模糊；实底态 `bg-white/85 + blur(12px)` |
| 字号 13px → **14px**，字重 500 | 13px 导航字偏小 | 统一 `body-sm` |
| 移动抽屉 | 现在两套导航叠加 + 9 个锚点 chip | 只列 5 项 + 搜索 + CTA；锚点 chip 整块删除（L265-285） |
| CTA | "预约演示" 胶囊 | 改 8px 圆角实底按钮，高度 40，右侧留 24px |

**验收**：任何滚动位置，顶栏链接集合不变；1280 宽下无横向滚动。

### 4.3 产品与能力展示

| 改什么 | 为什么 | 怎么改 |
|---|---|---|
| 5 屏钉屏（308vh）→ **1 屏 tabbed 面板** | 与首屏合计 560vh 的"页面不动"体验，移动端又要滑很长 | 左列 5 个产品名（编号 + 1 行卖点），右侧 16:9 预览 + 3 个指标 + 1 个 CTA；`ProductMatrix.jsx:19-23,393` |
| 删除 130–170px 幽灵编号 | 同上 | L39、L110 |
| 暗色卡统一 | 现在 4 种卡面（`white/[0.03]`、`brand/10`、`#060a11`） | 全部 `night-800` + 1px 白 7% |
| "AI 能力"段 | 与产品矩阵信息重叠（矩阵 5 类 + AI 能力 6 卡） | 合并为"能力"3 列：课堂生成 / 实验沙箱 / 学情；其余移到 `/technology` |
| 3D 产品环 | 与首屏 3D 重复，且设备页也有一个 | 仅在 `/devices` 保留；首页用截图 |
| 内页承接 | 首页缩短后，深度内容不能丢 | `/solutions` 承接 5 个产品详情；首页每屏加"查看完整方案 →" |

**验收**：首页从 9 段降到 6 段后，产品信息仍可在 2 次点击内到达详情。

### 4.4 案例 / 数据区块

| 改什么 | 为什么 | 怎么改 |
|---|---|---|
| 先案例、后 logo 墙 | 现在 `LabShowcase` 轮播 → 漂移墙 → 金融机构墙，三段视觉都在"移动" | 顺序：1 个主案例（16:9 大图 + 3 个成果数字）→ 6 个案例卡（4:3）→ logo 墙（静态 2 行，去漂移） |
| 删除 300px "08" 水印 + 3 团辉光 + 点阵 | `Customers.jsx:23-30` 一屏 5 层装饰 | 只保留 `white → mist-100` 的极浅渐变 |
| 数字统一 | `StatBand` 有 2 套数据形状与 3 种呈现（`ui.jsx:318-378`） | 4 个数字，`h3` 字号，`tabular-nums`，后缀 0.55em；CountUp 1.2s 一次 |
| logo 墙 | 72 个彩色 logo 噪声大 | 单色 60% 透明度；每行 8–10 个，2 行；移动端 2 行 × 4 |
| 案例图统一 | JPG/PNG 混用、色调不一 | WebP + 统一 `saturate(.78)` + 4:3 |

**验收**：案例屏在首屏滚动后 2 屏内出现；logo 墙无持续位移。

### 4.5 CTA / 联系

| 改什么 | 为什么 | 怎么改 |
|---|---|---|
| 全站统一 1 个 CTA 组件 | 现在 `PageCTA`（`PageShell.jsx:254-283`）、`Contact`（`Contact.jsx:98+`）、页脚按钮三套文案与样式 | 抽 1 个 `CtaBand`：暗底 + 1 句主张 + 1 主按钮 + 1 次按钮；内页复用 |
| 表单卡去掉重阴影 | `shadow-elev-lg`（`Contact.jsx:145`）像浮层 | 白卡 + 1px 描线 + `sh-1`；宽度 480 |
| 输入框 40 → **48px** | 点击目标与呼吸感 | `h-12`，圆角 8，错误态 `danger` + 13px 文案 |
| 表单可访问性 | 无 label | `<label>` + `aria-invalid` + `aria-describedby`；错误摘要 `role="alert"` |
| 左侧信息 | 3 个图标块 + 4 个城市 chip | 图标降为 20px 无底座；电话/邮箱/地址用 `body`，去掉 11px 灰标（改 `caption`） |
| 信任要素 | 教育客户决策需要"证据" | 表单旁加 2 个短背书（合作院校数 / 交付周期），不要只用 logo |

### 4.6 页脚

| 改什么 | 为什么 | 怎么改 |
|---|---|---|
| 底色 `#0A0E16` → `night #06080e` | D3 | 与首屏同一暗底 |
| 文字 13px `white/45` → 14px `white/.66` | 4.31:1 不足 | 链接 14px / `.66`；分组标题 12px / `.52` |
| 4 列 → 品牌区 + 3 列 | 现在 1.2fr / 2fr / 1fr，链接又分 4 列 | 品牌 4 列宽 + 产品 / 公司 / 资源 3 列 |
| 删重复导航行 | 分组里已有同样链接（`Footer.jsx:95-101`） | 底栏只留：版权、隐私、条款、**ICP 备案号**（缺失，合规风险） |
| 社交三枚圆钮 | 3 个带边框圆钮视觉噪音 | 改为文字链接 `电话 / 邮箱 / 预约` + 一条竖线分隔 |
| 联系电话/邮箱 | 现在 `text-[13px] white/45` | 提到 `body` + `white/.8`，可点击 |

### 4.7 内页

| 问题 | 出处 | 建议 |
|---|---|---|
| H1 固定 38/54px，与首页 token 不一致 | `PageShell.jsx:75` | 用 `h1` token（36→56），`max-w-[24ch]` |
| 区块标题 `text-3xl md:text-[38px]` | `PageShell.jsx:239` | 改用与 `SectionHead` 同一个 `h2` token；现在同一个站有两种 H2 字号 |
| 区块纵向 96/112 | `PageShell.jsx:222` | 改用 `--section-y` |
| 四角 HUD 括号 | `PageShell.jsx:133-136`、`ProductMatrix.jsx:178-181` | 只保留在"产品设备/实验室"的真实设备图上，其余删除 |
| InnerNav 110px 高（64+46） | `PageShell.jsx:189` | 48px 高、下划线指示、4–6 项；与顶栏合计时不超过 120px |
| `ElectricBorder` 电流球 | `Technology.jsx:143` | 保留 1 处作为"技术方向"记忆点即可；其余页不新增同类效果 |
| `CircularCarousel` 3D 圆环 | `Devices.jsx:122` | 保留（设备页的核心交互），但去掉外部辉光 |
| 重复的 `head` 结构 | `PageShell.jsx:225-245` vs `ui.jsx:218-254` | 内页也用 `SectionHead`，删掉这一份重复实现 |

---

## 5. 交互与动效

### 5.1 动效规范（替换现在的 3 套缓动）

| 场景 | 时长 | 缓动 | 说明 |
|---|---|---|---|
| 颜色/透明度（hover、focus） | 120ms | `cubic-bezier(.2,0,0,1)` | 只改 1 个属性 |
| 位移/缩放（hover） | 220ms | 同上 | `translateY(-2px)` 上限 |
| 按下 | 100ms | 同上 | `scale(.985)`，不再 `.97` |
| 小元素进场 | 320ms | `cubic-bezier(.16,1,.3,1)` | tooltip、下拉 |
| 区块揭示 | 560ms | 同上 | `y 16px + opacity`，不再 22/26/60 |
| 首屏进场 | 720ms | 同上 | 最多 2 级错峰，间隔 80ms |
| 退出 | 200ms | `cubic-bezier(.4,0,1,1)` | 比进场短 40% |
| 指示器位移（选中 pill/下划线） | 320ms | spring `stiffness 320 / damping 34` | 现在 380/32 偏"弹" |
| 数字滚动 | 1200ms | `1-(1-p)^4` | 只跑一次 |

### 5.2 持续动画白名单

全站最多 **2 处**：

1. 首屏环境光/场景自身运动（已在 3D 内）
2. 加载指示（`#boot`，已有 reduced-motion 降级）

必须删除/改静态：

- `animate-bounce`（`StoryHero.jsx:603`）
- `animate-pingslow`（除加载）—— `src/index.css:115-124`
- `animate-breathe`（`index.css:191-199,399-401`）
- `animate-floaty`（`AIAdvisor.jsx:145`）
- `hammer / mapBeam / mapProj`（`index.css:128-189`）
- `cbSweep / cbMarquee`（`index.css:243-266`）：若要保留，改为仅"当前选中项"、周期 ≥8s
- `arch-flow / flowX / flowUp / drift`：改为 `once` 或静态连线
- `AIAdvisor` 三个无限演示（打字机/环形进度/文档飞入）：改为进入视口播放 1 次后定格

### 5.3 悬停与聚焦

- **悬停只做一件事**：卡片 = 边框加深 + `sh-1→sh-2`；不位移 + 不发光 + 不变蓝。
- 链接 = 下划线从左展开（120ms），颜色 `brand-text`。
- 按钮 = 亮度 ±6%，不用 `shadow-glow`。
- `Tilt`（`ui.jsx:157-186`）只用于**图片/媒体卡**，正文卡不做 3D 倾斜（现在 `Tilt` 的 5° 会让中文字发虚）。
- `Magnetic`（`ui.jsx:92-116`）保留在"查看全部"一处即可，其余删除。
- Focus：保持 2px 环 + 2px 偏移；暗底改用 `#8fd0ff`（`brand-300`）保证可见；所有自定义按钮补 `:focus-visible`。
- 移动端删除所有 hover-only 效果（`group-hover`）。

### 5.4 滚动

- Lenis `duration 0.92 → 0.8`，`touchMultiplier 1.6 → 1.2`（`useLenis.js:9-15`）：当前手感偏"黏"。
- 首屏不再劫持滚动；章节揭示统一 `once`，`margin -10%`。
- 锚点纠偏逻辑（`useLenis.js:77-106`）保留 —— 这是当前代码里做得最扎实的部分。

---

## 6. 响应式与移动端

### 6.1 断点策略

| 名 | 值 | 用途 |
|---|---|---|
| `sm` | 640 | 单列 → 双列 |
| `md` | 768 | 卡片 2 列 |
| `lg` | 1024 | 桌面布局起点；**钉屏与 3D 的唯一开关** |
| `xl` | 1280 | 卡片 3 列、导航完整 |
| `2xl` | 1536 | 容器封顶 1440 |

**删除 `wide 1900` / `3xl 2200`**（`index.css:100-101`）：它们只服务 1680/1780 容器，而 1780 的单行文字已超过 100 字，阅读性反而下降。

### 6.2 关键区块降级

| 区块 | ≥lg | <lg（建议） |
|---|---|---|
| 首屏 | 1 屏 + 媒体面板 + 3 tab | 同 1 屏，媒体改 16:10 静帧，tab 变横向 chip；**不再 3 屏堆叠** |
| 主导航 | 5 项 + 搜索 + CTA | 抽屉：5 项 + 搜索 + CTA，锚点 chip 删除 |
| 产品矩阵 | 1 屏 tabbed | 横向 scroll-snap 卡片（85vw 宽），不堆 5 段长文 |
| 问题 5 卡 | 3 列 + 2 宽卡 | 1 列，图标 24px，正文 `body-sm` |
| 案例 | 1 大 + 6 小 | 大图 + 2 列小卡；logo 墙 2 行 × 4 |
| 数据条 | 4 列 | 2×2，字号 `h4` |
| 表格/规格 | 定义列表 2 列 | 单列键值，`dt 12px / dd 15px` |
| 内页 InnerNav | 吸顶 48px | 隐藏，改为页内"回到顶部" |

### 6.3 移动端细则

- 触控目标 ≥44px（当前 `py-1.5` 的 chip 约 30px，需加大）。
- 正文字号不低于 13px；删除所有 8–10px 中文（`AIAdvisor` 里有 `text-[8px]`，`StoryHero` 有 9.5px）。
- 首屏高度用 `100dvh`，避免移动浏览器地址栏导致跳动（现在多处 `100vh`）。
- 图片 `sizes` + `srcset`；首屏媒体加 `poster`。
- 移动端不挂 WebGL（已有 `hasWebGL` + `innerWidth>=1024`，保留）。
- `prefers-reduced-motion` 下不启用 Lenis（已有）。

---

## 7. 实施路径

### P0 · 样式层 token 化（低风险，先做）

**范围（2–4 个文件）**

| 文件 | 改动 |
|---|---|
| `src/index.css` | `@theme` 色值、9 档字阶、4 档圆角、3 层阴影、容器、`--section-y`；删除 `shadow-glow/soft/lift/glass` 与发光 keyframes |
| `index.html` | 移除 Google Fonts；改自托管字体 `preload`；`theme-color` 改 `#06080e`（`/admin` 仍用同步脚本切浅色） |
| `src/components/sections/StoryHero.jsx` | L501/L561 容器改 `container-x`（仅 2 行） |
| `src/components/PageShell.jsx` | `PageSection` 的 `py-24 md:py-28` 改 `sec-y`（1 行） |

**产出**：全站字号/圆角/阴影/容器立刻统一，`ink-400` 达标，蓝光减少。

**风险与验证**

- 风险：token **改名**会波及 `/admin` 13 个文件（`src/admin/*`）。约束：**只改值、不改名**。
- 验证：`npm run build`；人工过 `/`、`/solutions`、`/cases`、`/admin` 各 1 次；对比 1440/1024/390 三档截图。

### P1 · 组件层归一（中风险）

**范围（约 10 个文件）**

| 文件 | 改动 |
|---|---|
| `src/components/ui.jsx` | 单一 `EASE` 导出；`SectionHead` 用新字阶；`StatBand` 去竖线；`CoverCard` 圆角/描边 |
| `src/components/Navbar.jsx` | 72px 高、14px 字、去双模式（先保留逻辑、只改视觉） |
| `src/components/Footer.jsx` | 暗底统一、对比度、删重复行、加备案位 |
| `src/components/sections/Problems.jsx` | 删 3D 图标、5 列改 3+2、卡片材质 |
| `src/components/sections/Customers.jsx` | 删水印/辉光/点阵；案例顺序调整 |
| `src/components/sections/AIAdvisor.jsx` | 三个无限演示改一次性；删 `animate-floaty` |
| `src/components/sections/Contact.jsx` | 表单 label/错误态/输入 48px/卡面 |
| `src/components/PageShell.jsx` | H1/H2 字阶、InnerNav、HUD 精简 |
| `src/pages/Technology.jsx`、`Devices.jsx` | 去掉外部辉光；字阶替换 |

**风险**：视觉回归面积大。建议按页面灰度：先首页 → 再内页 → 再后台。

### P2 · 结构层改版（高风险，需内容方确认）

| 改动 | 文件 | 风险 |
|---|---|---|
| 首页 9 段 → 6 段 | `src/pages/Home.jsx`、`src/data/site.js:55-65` | **锚点 id 不能删**：`#contact / #advisor / #matrix` 被首屏 CTA、PageCTA、页脚、追踪引用。保留 id 或做映射 |
| 首屏 252vh → 100vh | `StoryHero.jsx` | 3D 演出逻辑与滚动绑定耦合（L349-403）；需保留"用户一动即跳过" |
| 产品矩阵钉屏 → tabbed | `ProductMatrix.jsx` | 4 个定制屏（`ChainScreen/ClassroomScreen/SystemsScreen`）依赖整屏高度，需逐屏调 |
| 移动端首屏去堆叠 | `StoryHero.jsx:612-620` | 影响 3 个 `<h1>` 与看板交互 |
| 导航 IA 7→5 + mega menu | `Navbar.jsx`、`site.js` | 需产品/市场确认入口归属 |
| 删除 `Problems` 3D | `Problems.jsx`、`ProblemIcons.jsx` | 少一个 WebGL 上下文，稳定性提升；视觉需替代方案 |

**顺序建议**：P0 → 全站截图基线 → P1 首页 → P1 内页 → P2 首屏 → P2 产品矩阵 → P2 IA。

### 7.1 可先做的"纯样式"清单（不动结构）

1. 字号/圆角/阴影 token 替换
2. 蓝色发光降级 + hover 去蓝边
3. `ink-400` 提亮到 4.74:1
4. 容器对齐（首屏 2 行）
5. 字体自托管
6. 页脚对比度 + 备案位
7. 所有 ghost 大数字删除（纯删 DOM）
8. `animate-bounce` / `animate-floaty` / 呼吸环删除

**必须先动结构的**：首屏行程、产品矩阵钉屏、首页段数、导航模式、移动端堆叠。

### 7.2 验收指标（建议）

| 指标 | 现状 | 目标 |
|---|---|---|
| 首屏到正文的滚动距离 | 252vh | 100vh |
| 首页总长 | ≈14–16 屏 | 8–10 屏 |
| 唯一字号 | 51 | 9 |
| 圆角档位 | 8+ | 5（含 pill） |
| 阴影 token | 7+12 内联 | 3 |
| 持续动画 | 69 处命中 | ≤2 |
| 小字对比度 | 3.0–4.1:1 | ≥4.5:1 |
| 首页 H1 数 | 移动端 3 | 1 |
| 设备图体积 | 3.3 MB | ≤0.9 MB |

---

## 8. 两个视觉方向对比

### 方向 A：极简编辑感（Editorial Minimal）

| 维度 | 做法 |
|---|---|
| 底色 | 米白 `#faf9f6`，不用冷灰 |
| 主色 | 近黑 `#111318`，强调色仅 1 个（可保留蓝，也可换暖橙 `#c2410c`） |
| 字体 | 中文标题 **思源宋体**（600），正文思源黑体；拉丁 Inter |
| 圆角 | 4px（按钮/卡）/ 0（图片） |
| 结构 | 大留白、细横线分隔、案例全幅出血、几乎无阴影 |
| 动效 | 只有淡入与 120ms hover |
| 气质 | 学术、机构、可信、克制 |
| 风险 | 对"AI/机器人实验室"的技术感表达弱；宋体授权与屏幕渲染需调 |

### 方向 B：科技精密感（Precision Tech）

| 维度 | 做法 |
|---|---|
| 底色 | 亮 `#f7f8fa` + 3 处暗 `#06080e` |
| 主色 | `#1677ff`（仅动作）/ 文本 `#0b5bd3` |
| 字体 | Inter + HarmonyOS Sans SC，数字 tabular，编号 mono |
| 圆角 | 8 / 12 / 16 |
| 结构 | 12 栅格、1px 描线、技术示意图、单色校徽 |
| 动效 | 精密短动效（120/220/560ms），1 处环境光 |
| 气质 | 工程、实验室、硬核、可靠 |
| 风险 | 极易滑回"模板科技站"——当前站点已经在这个方向，但**装饰过量** |

### 推荐：B′ = B 的骨架 + A 的节制

**理由**

1. 业务是"实验室/机器人/AI 基础设施"，暗色首屏与精密线框是准确的产品隐喻，A 的宋体编辑感会削弱"可交付的工程能力"。
2. 目标读者是高校决策者与评审专家：他们判断"高端"的依据是**秩序与克制**，不是动效数量。
3. 现有资产（3D 实验室、产品矩阵、案例图）在 B 体系下可复用；换 A 需要重拍/重排大量图片。
4. B′ 的可执行定义（写进设计约束）：
   - **85% 页面是亮色**，暗色只做 3 个锚点
   - 蓝色像素占比 **≤5%**
   - 每个视口 **1 个焦点**
   - 每屏 **≤1 个持续动画**
   - 每屏 **≤1 条渐变**，其余用纯色与 1px 线

**如果品牌方更看重"学术权威/机构背书"**（例如主要面向校级领导与评审材料），则改推 A，并把首屏从 3D 换成实景实验室大图 + 宋体大标题。

---

## 9. 待确认项（会影响方案落地）

1. **品牌色是否可动**：logo 渐变固定为 `#1677ff → #65bfff`。方案只把**文本蓝**改为 `#0b5bd3`（满足对比度），主填充仍 `#1677ff`。是否接受"两种蓝"？
2. **首屏 3D 是否是甲方硬性要求**：若是，方案改为"保留 3D、行程压到 100vh、删除其余 7 类信息"；若非，建议改为产品实拍/短循环视频，首屏成本与稳定性都会更好。
3. **首页能否从 9 段压到 6 段**：涉及市场/销售的内容诉求（AI 顾问、资源专区、交付路径是否必须留在首页）。
4. **主要受众权重**：校级领导 / 院系主任 / 一线教师 / 学生 —— 决定首屏第一句是"基础设施"还是"一学期能开起来的实验室"。
5. **中文字体授权**：是否可采用 HarmonyOS Sans SC / MiSans（免费商用）或思源系列（OFL）？若有品牌指定字体，请提供文件。
6. **是否需要"暗色模式"开关**：当前只有暗色区块，没有主题切换。若要做真暗色模式，token 需改成双套（工作量 +30%）。
7. **`/admin` 是否允许跟随官网变色**：方案只改值不改名，后台会同步变色（更统一，但需回归测试）。
8. **浏览器基线**：是否仍需支持 Safari < 15.4 / 旧版安卓？决定能否使用 `:has()`、`backdrop-filter`、`dvh`、`color-mix()`。
9. **备案信息**：页脚当前无 ICP 备案号与公安备案，境内官网需补；请提供备案号。
10. **图片素材**：案例/设备是否有更高分辨率原图与使用授权？当前设备图多为 1000px 级 PNG，放大到 16:9 大图会糊。

---

### 附：本方案引用的关键文件

- 设计 token：[index.css](file:///E:/%E2%80%8Cofficial%20web/src/index.css)
- 组件基元：[ui.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/ui.jsx)
- 内页骨架：[PageShell.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/PageShell.jsx)
- 首屏：[StoryHero.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/sections/StoryHero.jsx)
- 顶栏 / 页脚：[Navbar.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/Navbar.jsx) · [Footer.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/Footer.jsx)
- 首页编排：[Home.jsx](file:///E:/%E2%80%8Cofficial%20web/src/pages/Home.jsx) · [site.js](file:///E:/%E2%80%8Cofficial%20web/src/data/site.js)
- 产品矩阵：[ProductMatrix.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/sections/ProductMatrix.jsx)
- 构建配置：[vite.config.js](file:///E:/%E2%80%8Cofficial%20web/vite.config.js)
- HTML 壳与 SEO：[index.html](file:///E:/%E2%80%8Cofficial%20web/index.html)
