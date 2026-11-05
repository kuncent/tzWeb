# 官网配色系统 · 可落地色板 v1

> 配套可视对照：[palette-preview.html](file:///E:/%E2%80%8Cofficial%20web/docs/palette-preview.html)
> 上游方案：[ui-ux-upgrade-plan.md](file:///E:/%E2%80%8Cofficial%20web/docs/ui-ux-upgrade-plan.md)（本文替代其中 §3.1）
> 阶段：**只读 + 方案**，未改动任何代码

## 结论先行

1. **底色从"纯黑 / 纯白"退一步**：暗底统一 `#06080D`（不是 `#000`），亮底 `#F7F8FA`（不是 `#FFF`），卡片才是 `#FFFFFF`。让"纸"与"卡"有 1.06:1 的层次，页面立刻从"贴图"变成"有材质"。
2. **蓝拆成四档、各司其职**：`#1677FF` 只做品牌标识与大色块；按钮底改 `#0E5FD8`（白字 5.76:1）；文字蓝 `#0B5BD3`（白底 6.08:1）；暗底文字用 `#8FD0FF`（12.05:1）。现在的 `#1677FF` 同时当按钮底与 10px 标签色，白字只有 4.10:1，是"看着亮、读着累"的根源。
3. **比例硬约束：中性 92% / 品牌蓝 5% / 数据青 0.5% / 功能色 2.5%**。发光从"卡片常驻"降为"首屏仅 1 处"。
4. **保留 token 名称、只改值**：`mist / ink / brand / night` 全部不改名，`/admin` 不会掉色；只新增 10 个 token。

---

## 1. 中性色阶

### 1.1 暗色阶（暗底 → 抬升面）

| Token | Hex | 相对亮度 L | 用途 | 与 `#06080D` 的对比 |
|---|---|---|---|---|
| `night-950` | **`#06080D`** | 0.24% | 首屏、页脚、收口 CTA 的**唯一**暗底 | — |
| `night-900` | **`#0A0D14`** | 0.42% | 深色 CTA 带（与首屏区分一层） | 1.09:1 |
| `night-800` | **`#10151E`** | 0.74% | 暗色卡片/看板面 | 1.10:1 |
| `night-700` | **`#171D28`** | 1.21% | 暗色 hover、chip、输入框 | 1.19:1 |
| `night-line` | `rgba(255,255,255,0.08)` | — | 暗区 1px 描边（合成后 ≈`#1A1C22`） | 1.34:1（装饰） |

暗区文字（不要用 `white/35`、`white/28`，这两档实测 3.17 / 2.4，不达标）：

| Token | 值 | 合成近似 | 在 `#06080D` 上 | 用途 |
|---|---|---|---|---|
| `on-dark-1` | `rgba(255,255,255,.92)` | `#ECEDEF` | ≈18.5:1 | 标题 |
| `on-dark-2` | `rgba(255,255,255,.66)` | `#AAABAD` | **8.72:1** | 正文 |
| `on-dark-3` | `rgba(255,255,255,.52)` | `#87888B` | **5.65:1** | 元信息/图注 |
| `on-dark-4` | `rgba(255,255,255,.36)` | — | ≈3.2:1 | **仅**装饰线/禁用 |

### 1.2 亮色阶（画布 → 卡面 → 分隔）

| Token | Hex | 用途 | 与白底对比 |
|---|---|---|---|
| `mist-50` | **`#FFFFFF`** | 卡片、弹层、表格行 | 1.00 |
| `mist-100` | **`#F7F8FA`** | 页面画布（默认背景） | 1.06:1（刚好可辨，不刺眼） |
| `mist-200` | **`#EFF1F4`** | 二级区块、表头、输入框底 | 1.12:1 |
| `mist-300` | **`#E4E7EC`** | **装饰性**分隔线、卡片描边 | 1.24:1（不承担控件识别） |
| `mist-400` | **`#C6CCD5`** | 输入框默认描边（配合 label + focus 环） | 1.54:1 |
| `line-strong` | **`#8E97A3`** | **功能性**描边：checkbox、radio、开关轨道 | **2.96:1**（视为 3:1） |

### 1.3 文字阶（按对比度阈值分档，不按透明度分档）

| Token | Hex | 白底 | `mist-100` 上 | 用途 |
|---|---|---|---|---|
| `ink-900` | **`#0B0F17`** | **19.18:1** | 18.05:1 | H1/H2、首屏主张 |
| `ink-800` | **`#161B24`** | **17.26:1** | 16.25:1 | 正文强、卡片标题 |
| `ink-700` | **`#232A35`** | **14.44:1** | 13.60:1 | 正文默认 |
| `ink-500` | **`#4E5866`** | **7.21:1** | 6.79:1 | 次级正文、导语 |
| `ink-400` | **`#67707C`** | **5.02:1** | **4.72:1** | 元信息、图注、eyebrow |
| `ink-300` | **`#9AA1AC`** | 2.60:1 | 2.45:1 | **仅**图标/装饰，禁止正文 |
| `ink-200` | **`#C3C8D1`** | 1.68:1 | — | 仅禁用态描边/占位装饰 |

> 注意：`ink-400` 在 `mist-200 (#EFF1F4)` 上是 **4.43:1**，差一点点。规则：**`ink-400` 只用于白底与 `mist-100`；在 `mist-200` 及以上改用 `ink-500`。**

### 1.4 为什么这样分档会显得"贵"

| 手法 | 具体数值 | 观感收益 |
|---|---|---|
| **不用纯黑** | `#06080D` 而非 `#000000` | 纯黑会让 CSS 阴影、1px 描边、暗色卡面全部"消失"；`#06080D` 留出 0.24%–1.21% 的 4 级抬升空间（`night-800` 0.74%），暗部才有"层"而不是"洞" |
| **不用纯白当画布** | 画布 `#F7F8FA`，卡片 `#FFF` | 1.06:1 的极浅差让卡片"浮"起来；整屏纯白会让人眯眼，也会让卡片只能靠阴影，而阴影正是廉价感来源 |
| **中性色统一冷偏，彩度极低** | 全部落在色相 220–225°，饱和度 ≤6%（如 `#E4E7EC` 的 HSL ≈ 216°/6%/93%） | 冷灰显精密，暖灰显旧；彩度再高一点就会变成"蓝灰企业模板" |
| **文字按 4.5 / 7 / 14 阈值切分** | 5.02 / 7.21 / 14.44 / 19.18 | 四个层级"读起来"确实不同，而不是靠 40%/50%/60% 的白，那种做法在暗底会糊成一片 |
| **分隔线分装饰 / 功能两类** | 1.24:1 vs 2.96:1 | 卡片描边可以浅（秩序靠间距），但 checkbox 必须能被看见；一套灰同时干两件事是廉价感的常见来源 |
| **暗底正文不用纯白** | `.92` / `.66` / `.52` | 纯白正文在近黑底上会"发光晕"，`.66` 的 8.72:1 足够清楚且柔和 |

---

## 2. 强调色

### 2.1 品牌蓝四档

| Token | Hex | 对比度 | 允许 | 禁止 |
|---|---|---|---|---|
| `brand` | `#1677FF` | 白底 4.10 / 暗底 4.88 | 品牌标识、图表主色、大面积浅底、**暗底文字** | ❌ 白底小字、❌ 白字按钮底（4.10 不达 AA） |
| `brand-action` | **`#0E5FD8`** | 白字 **5.76:1** | **主按钮填充**、选中态填充 | ❌ 大面积背景（偏重） |
| `brand-text` | **`#0B5BD3`** | 白底 **6.08** / `mist-100` 5.73 / `mist-200` 5.38 | 链接、编号、小标签、图标 | ❌ 按钮底 |
| `brand-press` | **`#0B4AB0`** | 白字 8.01:1 | 按下态 | ❌ 常规态 |
| `brand-soft` | `#EEF4FF` | `brand-text` 于其上 5.51:1 | 淡底标签、选中行 | ❌ 大面积区块底 |
| `brand-line` | `rgba(22,119,255,.22)` | — | 1px 交互描边（hover/focus） | ❌ 装饰性描边 |
| `brand-300` | `#8FD0FF` | 暗底 **12.05:1** | 暗底强调文字、图标 | ❌ 白底 |

**为什么按钮不用 `#1677FF`**：白字在 `#1677FF` 上只有 **4.10:1**，14–15px 的按钮文案不达 AA；`#0E5FD8` 是同一色相往下压一档，白字 5.76:1，视觉上更深、更"贵"，也不影响 logo。

### 2.2 第二强调色：精密青 `#0E7490`

| Token | Hex | 对比度 | 用途 |
|---|---|---|---|
| `data` | **`#0E7490`** | 白底 **5.36** / `mist-100` 5.04 | 数据标签、实时状态文字、"在线/运行中" |
| `data-soft` | `#E6F4F7` | — | 数据 chip 底 |
| `data-on-dark` | `#2DD4BF` | 暗底 **10.76:1** | **只做 ≤4px 圆点、1px 线**，不做文字块 |

**禁用场景（写进规范）**

- ❌ 任何 CTA / 按钮 / 导航选中态（那是品牌蓝的职责）
- ❌ 大面积填充、渐变、hover 发光
- ❌ 与 `warning` 同屏出现（青与琥珀并置会变成"仪表盘配色"）
- ❌ 正文、长段落、标题
- ❌ logo、插画主视觉
- ✅ 每个视口最多 2 处：一个状态点 + 一个数据标签

### 2.3 功能色（替代散落的 emerald / amber / rose）

| Token | Hex | 白底对比 | 替代 |
|---|---|---|---|
| `success` | `#0F7A5A` | 5.31:1 | `emerald-500/600`（22 处） |
| `warning` | `#A15C07` | 5.19:1 | `amber-500/600`（6 处） |
| `danger` | `#B42318` | 6.57:1 | `rose-400`（2 处）、`#DC2626/#B91C1C`（admin） |

功能色只用于表单校验、状态徽标、图表负向值；**不做装饰**。

---

## 3. 用色比例

### 3.1 总比例

| 类别 | 占比 | 说明 |
|---|---|---|
| 中性（含暗底、卡面、文字） | **92%** | 页面的"秩序"来自这里，不是颜色 |
| 品牌蓝 | **≤5%** | 填充 ≤2%，文字/描线 ≤3% |
| 第二强调（精密青） | **≤0.5%** | 只做状态点/数据标签 |
| 功能色 | **≤2.5%** | 只在表单与状态出现 |

判定方法：把页面转成灰度后，**仍应能读懂 90% 的信息层级**。读不懂说明层级靠颜色而非字阶/留白。

### 3.2 各区块落在哪一层

| 区块 | 底层 | 卡面 | 文字 | 品牌蓝 | 备注 |
|---|---|---|---|---|---|
| 暗色首屏 | `night-950 #06080D` | `night-800 #10151E` | `on-dark 1/2/3` | 1 个主按钮 `brand-action` + 1 处 `brand` 光（≤2%） | 唯一允许发光的地方 |
| 白底正文 | `mist-100 #F7F8FA` | `mist-50 #FFFFFF` | `ink-900/700/500/400` | 仅文字链接与编号 `brand-text` | 禁止径向辉光、点阵 |
| 产品矩阵（暗卡） | `night-950` | `night-800` + `night-line` | `on-dark` | 选中项 `brand-action` | 暗区不用阴影（不可见） |
| 深色 CTA | `night-900 #0A0D14` | — | `on-dark` | 主按钮 `brand-action` 占该区 ≤8% | 顶部一条 `night-line` 与上一段分开 |
| 页脚 | `night-950` | — | `on-dark-2/3` | 仅 hover 链接 | 不放 CTA、不放发光 |
| 数据/表格 | `mist-50` | `mist-200` 表头 | `ink-800/500` | 数字用 `ink-900`，**不用蓝** | 青仅用于"实时/通过" |

---

## 4. 现状 vs 新色板对照

### 4.1 保留名称、只改值（`/admin` 零改动）

| 旧 token | 旧值 | 新值 | 处理 | 对比度变化 |
|---|---|---|---|---|
| `mist-50` | `#ffffff` | `#FFFFFF` | 保留 | — |
| `mist-100` | `#f5f8fc` | **`#F7F8FA`** | 改值 | 去掉蓝调，画布更中性 |
| `mist-200` | `#eef3f9` | **`#EFF1F4`** | 改值 | — |
| `mist-300` | `#e3eaf3` | **`#E4E7EC`** | 改值 | 1.21 → 1.24（更灰、更稳） |
| `ink-900` | `#0b1220` | **`#0B0F17`** | 改值 | 更深，标题更"压得住" |
| `ink-800` | `#16202e` | **`#161B24`** | 改值 | — |
| `ink-700` | `#2a3648` | **`#232A35`** | 改值 | — |
| `ink-500` | `#5d6b7e` | **`#4E5866`** | 改值 | 5.34 → 7.21 ✅ |
| `ink-400` | `#8b98a9` | **`#67707C`** | 改值 | **2.93 → 5.02** ✅ |
| `brand` | `#1677ff` | `#1677FF` | 保留，但限定用途 | 不再做按钮底/小字 |
| `brand-600` | `#0e5fd8` | `#0E5FD8` | 升格为 `brand-action` | 白字 5.76 ✅ |
| `brand-700` | `#0b4ab0` | `#0B4AB0` | 升格为 `brand-press` | — |
| `brand-500…50` | 8 档 | 保留 | 限定为 tint / 描线 / 暗底文字 | 见 2.1 |
| `night` | `#0a0f1a` | **`#06080D`** | 改值 | 与 3 种近黑合并 |
| `night-800` | `#0e1522` | **`#10151E`** | 改值 | — |
| `night-700` | `#141d2e` | **`#171D28`** | 改值 | — |

### 4.2 新增 token（10 个）

`brand-action`、`brand-text`、`brand-press`、`brand-soft`、`brand-line`、`ink-300`、`line`（=`mist-300`）、`line-strong`、`data`/`data-soft`/`data-on-dark`、`success`/`warning`/`danger`、`on-dark-1/2/3`。

### 4.3 废弃（必须逐文件替换）

| 废弃值 | 出现 | 替换为 | 主要文件 |
|---|---|---|---|
| `#04070d` | 34 处 / 20 文件 | `night` → `#06080D` | [StoryHero.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/sections/StoryHero.jsx#L161)、[PageShell.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/PageShell.jsx#L23-L28)、[About.jsx](file:///E:/%E2%80%8Cofficial%20web/src/pages/About.jsx#L79-L87)、[Devices.jsx](file:///E:/%E2%80%8Cofficial%20web/src/pages/Devices.jsx#L93-L147)、[Technology.jsx](file:///E:/%E2%80%8Cofficial%20web/src/pages/Technology.jsx#L57)、[ui.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/ui.jsx#L402)、[HeroStage.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/hero/HeroStage.jsx#L458-L508)、[SiteSearch.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/SiteSearch.jsx#L111) |
| `#0A0E16`（页脚） | 1 | `night` | [Footer.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/Footer.jsx#L20) |
| `#0A1524`（首屏渐变） | 1 | `night-800` / `night` | [StoryHero.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/sections/StoryHero.jsx#L65) |
| `white/45`、`white/35`、`white/28` | 多 | `on-dark-2/3` | [Footer.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/Footer.jsx#L61-L101)、[BuildStepper.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/chain/BuildStepper.jsx#L22-L53)、[ChainConsole.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/chain/ChainConsole.jsx#L110-L164) |
| `emerald-500/600` | 22 | `success` | [AIAdvisor.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/sections/AIAdvisor.jsx#L91-L123)、[ClassroomScreen.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/sections/ClassroomScreen.jsx#L123-L139)、[SolutionPanel.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/ai/SolutionPanel.jsx#L72-L336)、admin |
| `amber-*` / `rose-*` | 6 / 2 | `warning` / `danger` | [ClassroomScreen.jsx](file:///E:/%E2%80%8Cofficial%20web/src/components/sections/ClassroomScreen.jsx#L123-L140)、admin |
| `shadow-glow` | 32 | 删除或 `brand` 光仅 1 处 | 全站 |

**暂不动**：`src/components/three/*` 与图表里的 hex（`LabEnvironment.jsx` 49 处、`ProductShowcase.jsx` 36 处等）是 3D 材质与 ECharts 色，属于"渲染色板"，需要单独一轮映射（建议 P2），不要和 CSS token 混改。

---

## 5. 对比度校验表

规则：AA 正文 ≥4.5:1；AA 大字（≥24px / ≥18.66px 粗体）≥3:1；非文本（控件边界/图形）≥3:1。

| # | 前景 | 背景 | 对比度 | 判定 |
|---|---|---|---|---|
| 1 | `ink-900 #0B0F17` | `#FFFFFF` | **19.18** | ✅ AAA |
| 2 | `ink-800 #161B24` | `#FFFFFF` | **17.26** | ✅ AAA |
| 3 | `ink-700 #232A35` | `#FFFFFF` | **14.44** | ✅ AAA |
| 4 | `ink-500 #4E5866` | `#FFFFFF` | **7.21** | ✅ AAA |
| 5 | `ink-400 #67707C` | `#FFFFFF` | **5.02** | ✅ AA |
| 6 | `ink-400 #67707C` | `#F7F8FA` | **4.72** | ✅ AA |
| 7 | `ink-400 #67707C` | `#EFF1F4` | **4.43** | ⚠️ 差 0.07，改 `ink-500` |
| 8 | `ink-300 #9AA1AC` | `#FFFFFF` | 2.60 | ❌ 仅装饰 |
| 9 | `brand-text #0B5BD3` | `#FFFFFF` | **6.08** | ✅ AA |
| 10 | `brand-text #0B5BD3` | `#F7F8FA` | **5.73** | ✅ AA |
| 11 | `brand-text #0B5BD3` | `#EFF1F4` | **5.38** | ✅ AA |
| 12 | `brand-text #0B5BD3` | `brand-soft #EEF4FF` | **5.51** | ✅ AA |
| 13 | `#FFFFFF` | `brand-action #0E5FD8` | **5.76** | ✅ AA（按钮） |
| 14 | `#FFFFFF` | `brand #1677FF` | 4.10 | ❌ 小字按钮；仅 ≥24px 可用 |
| 15 | `brand #1677FF` | `#06080D` | **4.88** | ✅ 暗底文字 |
| 16 | `brand-300 #8FD0FF` | `#06080D` | **12.05** | ✅ 暗底强调 |
| 17 | `#FFFFFF` | `#06080D` | **20.03** | ✅ 标题 |
| 18 | `white/.66`（≈`#AAABAD`） | `#06080D` | **8.72** | ✅ 暗底正文 |
| 19 | `white/.52`（≈`#87888B`） | `#06080D` | **5.65** | ✅ 暗底元信息 |
| 20 | `white/.45`（≈`#76777A`） | `#06080D` | 4.47 | ❌ 13px 用 `.52` |
| 21 | `white/.45` | 旧页脚 `#0A0E16` | 4.50 | ⚠️ 临界，不建议 |
| 22 | `white/.35` | 旧页脚 `#0A0E16` | 3.17 | ❌ 版权行 |
| 23 | `data #0E7490` | `#FFFFFF` | **5.36** | ✅ AA |
| 24 | `data #0E7490` | `#F7F8FA` | **5.04** | ✅ AA |
| 25 | `data-on-dark #2DD4BF` | `#06080D` | **10.76** | ✅ 暗底 |
| 26 | `success #0F7A5A` | `#FFFFFF` | **5.31** | ✅ AA |
| 27 | `warning #A15C07` | `#FFFFFF` | **5.19** | ✅ AA |
| 28 | `danger #B42318` | `#FFFFFF` | **6.57** | ✅ AA |
| 29 | `line-strong #8E97A3` | `#FFFFFF` | **2.96** | ✅≈3:1（控件边界） |
| 30 | `mist-300 #E4E7EC` | `#FFFFFF` | 1.24 | ⚠️ 仅装饰线，不算控件 |
| 31 | **旧** `ink-400 #8B98A9` | `#FFFFFF` | **2.93** | ❌ 现状问题 |
| 32 | **旧** `brand #1677FF` | `#FFFFFF` | **4.10** | ❌ 现状小字/按钮 |

---

## 6. 暗色 ↔ 白底的衔接

推荐 3 种做法（按优先级）：

1. **硬边 + 发丝线 + 呼吸间距**（默认）
   - 交界处 `1px rgba(255,255,255,.08)`（暗侧）+ `1px rgba(11,18,32,.06)`（亮侧），上下各留 `64–96px` 空白。
   - 理由：最稳、最"编辑感"；不用渐变，避免灰度过渡发灰发脏。

2. **白卡跨接**（首屏 → 正文、深色 CTA → 页脚）
   - 白卡以 `12px` 圆角、`sh-1`，向上/向下**叠压 32–48px** 跨过边界；卡内首行留 `32px`。
   - 这是最"贵"的一种衔接：用结构过渡，而不是用颜色过渡。
   - 现状可复用：首屏已有一块 380px 控制面板，把它改成跨接的白卡即可（不必新增 DOM）。

3. **半调暗带**（仅用于区块内部，不用于亮暗交界）
   - `night-950` 上叠 `1px` 白网格，透明度 1.5%，`mask-image: linear-gradient` 上下淡出，高度 ≤240px。

**禁止**：

- ❌ 从 `#06080D` 直接线性渐变到 `#F7F8FA`（中间必然经过 `#7B7D82` 一类的"脏灰"，在 4K 屏上可见色带）
- ❌ 斜切 45°、粉紫雾、`conic-gradient` 做"科技感"
- ❌ 在暗底用 `box-shadow` 做抬升（暗底不可见，只会糊边）——用 `night-800` + `night-line`
- ❌ 在亮底用蓝色发光做分隔

---

## 7. 落地方式（可直接粘的 token 片段）

只改值、不改名；新增项追加在 `@theme` 内。位置：[index.css](file:///E:/%E2%80%8Cofficial%20web/src/index.css#L17-L45)。

```css
@theme {
  /* 亮面 */
  --color-mist-50: #ffffff;
  --color-mist-100: #f7f8fa;
  --color-mist-200: #eff1f4;
  --color-mist-300: #e4e7ec;
  --color-mist-400: #c6ccd5;
  --color-line-strong: #8e97a3;

  /* 文字 */
  --color-ink-900: #0b0f17;
  --color-ink-800: #161b24;
  --color-ink-700: #232a35;
  --color-ink-500: #4e5866;
  --color-ink-400: #67707c;
  --color-ink-300: #9aa1ac;
  --color-ink-200: #c3c8d1;

  /* 品牌 */
  --color-brand: #1677ff;        /* 标识/大色块/暗底文字 */
  --color-brand-action: #0e5fd8; /* 按钮填充（白字 5.76） */
  --color-brand-text: #0b5bd3;   /* 文字/链接（6.08） */
  --color-brand-press: #0b4ab0;
  --color-brand-soft: #eef4ff;
  --color-brand-line: rgba(22, 119, 255, 0.22);

  /* 暗面 */
  --color-night: #06080d;
  --color-night-950: #06080d;
  --color-night-900: #0a0d14;
  --color-night-800: #10151e;
  --color-night-700: #171d28;
  --color-night-line: rgba(255, 255, 255, 0.08);

  /* 数据与功能 */
  --color-data: #0e7490;
  --color-data-soft: #e6f4f7;
  --color-data-on-dark: #2dd4bf;
  --color-success: #0f7a5a;
  --color-warning: #a15c07;
  --color-danger: #b42318;
}
```

> `--color-mist`（`#f5f8fc`）保留一版用于兼容，建议直接指向 `mist-100`。

---

## 8. 待确认（仅配色相关）

1. 主按钮底从 `#1677FF` 改为 `#0E5FD8`（白字 4.10→5.76）是否接受？这是"合规"和"品牌亮蓝"之间的取舍。
2. 第二强调色用**精密青 `#0E7490`** 是否合适？若品牌更偏"学术/机构"，可改**铜金 `#9A6B32`**（白底 4.6:1），但会牺牲"实时状态"的语义。
3. 画布是否接受 `#F7F8FA` 而不是纯白？若客户看稿环境偏暗，可回退纯白，但卡片层次需靠 1px 描边补。
4. 是否允许"瓦灰"（中性 92%）占绝对主导？若市场要求更多蓝色氛围，本方案需重新配比。
5. 3D / 图表色板是否同步换（`LabEnvironment`、`ProductShowcase` 等约 30 个文件，含 150+ hex）？建议单独一轮，不在本次范围内。

---

## 9. 可视对照

单文件预览：[palette-preview.html](file:///E:/%E2%80%8Cofficial%20web/docs/palette-preview.html)

包含：色板卡（暗/亮/文字/强调/功能）、比例条、对比度表、**同内容改前/改后并排**（首屏 / 正文 / CTA / 页脚）、3 种亮暗衔接示例、旧→新映射速查。双击即可打开，无外部依赖。
