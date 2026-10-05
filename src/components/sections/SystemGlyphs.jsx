/* ============================================================
 * 系统清单的图形入口：25 枚自绘标记
 * ------------------------------------------------------------
 * 为什么不用 lucide：这套图形要担的是「37 个产品各自长什么样」，
 * 而 lucide 里没有「征信评级」「期货 K 线」「供应链金融」这些行业形状，
 * 只能拿通用几何凑 —— 凑出来的结果是：K 线画成 |oO| 三颗米，
 *  Boxes 画成一坨分子式，漏斗混在产品行里读起来就是个筛选按钮。
 * 更糟的是撞脸：大数据那一类 5 行全是同一个数据库筒，一眼看去像复制粘贴。
 *
 * 设计口径（每一枚都守这几条，不然又是一锅拼盘）：
 *   · 24 网格，视觉内容锁在 3.5~20.5 之间，四周留 2 单位呼吸；
 *   · 只描边不填充，strokeWidth 由调用方给（默认 1.6），端点与拐角全圆；
 *   · 一枚一个主形 + 最多一个辅形：主形负责 16px 下还能认出是什么，
 *     辅形负责区分同族（数据库筒 vs 放大镜找数据）；
 *   · 颜色一律 currentColor，压不压、亮不亮由 SystemsScreen 那侧决定。
 * ============================================================ */

const Svg = ({ children, className, strokeWidth = 1.6 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {children}
  </svg>
)

/* —— 银行 / 财务：立柱大厅与账簿 —— */
export const BankMark = (p) => (
  <Svg {...p}>
    <path d="M3.5 9 12 4.2 20.5 9" />
    <path d="M6.2 9.6v7.6M12 9.6v7.6M17.8 9.6v7.6" />
    <path d="M4 20h16" />
  </Svg>
)
export const LedgerMark = (p) => (
  <Svg {...p}>
    <rect x="4.2" y="3.6" width="15.6" height="16.8" rx="2" />
    <path d="M8.4 3.6v16.8" />
    <path d="M11.4 8.6h5.2M11.4 12h5.2M11.4 15.4h3.4" />
  </Svg>
)

/* —— 监管 / 征信：天平与评分仪表 —— */
export const RegulateMark = (p) => (
  <Svg {...p}>
    {/* 天平：横梁拉到 3.6~20.4，两个托盘各给 6.4 宽 ——
        17px 下横梁短了、托盘小了，整枚就读成一副哑铃 */}
    <path d="M12 4.2V18M3.6 6.8h16.8M8.4 18.8h7.2" />
    <path d="M6.8 6.8 3.6 13a3.3 3.3 0 0 0 6.4 0Z" />
    <path d="M17.2 6.8 14 13a3.3 3.3 0 0 0 6.4 0Z" />
  </Svg>
)
export const CreditMark = (p) => (
  <Svg {...p}>
    <path d="M4.2 16.8a7.8 7.8 0 1 1 15.6 0" />
    <path d="M12 16.8 16.2 10.4" />
    <circle cx="12" cy="16.8" r="1.2" />
    <path d="M6.6 10.2 8 11.2M17.4 10.2 16 11.2M12 5.4v1.8" />
  </Svg>
)

/* —— 交易 / 行情：K 线、撮合、兑换 —— */
export const CandlesMark = (p) => (
  <Svg {...p}>
    {/* 三根蜡烛：实体宽 4.4、圆角只给 0.6 —— 实体窄于 4 的时候，
        1.6 的描边把中间那点空隙填满了，三根蜡烛在屏上就变成三个图钉 */}
    <path d="M6.6 4.2v2.6M6.6 13.4v2.4M12.2 6.4v2.4M12.2 16.2v2.6M17.8 4v2.6M17.8 11.8v2.4" />
    <rect x="4.4" y="6.6" width="4.4" height="7" rx="0.6" />
    <rect x="10" y="8.6" width="4.4" height="7.8" rx="0.6" />
    <rect x="15.6" y="6.4" width="4.4" height="5.6" rx="0.6" />
  </Svg>
)
export const TradeMark = (p) => (
  <Svg {...p}>
    <path d="M3.6 9.2h12.2M12.8 5.8l3.4 3.4-3.4 3.4" />
    <path d="M20.4 15.2H8.2M11.2 11.8l-3.4 3.4 3.4 3.4" />
  </Svg>
)
export const FxMark = (p) => (
  <Svg {...p}>
    <path d="M4.4 11.2a7.6 7.6 0 0 1 13-4.2M19.6 12.8a7.6 7.6 0 0 1-13 4.2" />
    <path d="M17.8 3.6v3.6h-3.6M6.2 20.4v-3.6h3.6" />
  </Svg>
)

/* —— 供应链 / 保险：货车与伞 —— */
export const SupplyMark = (p) => (
  <Svg {...p}>
    {/* 供应链金融要的是「货在走」：两个圆角矩形横排读起来是一副眼镜（实拍里就这么错），
        换成货箱 + 驾驶室 + 两个轮，17px 下一眼就是物流 */}
    <path d="M2.8 7.8h10.6v8.2H2.8z" />
    <path d="M13.4 10.8h3.2l3 3.2v2h-6.2z" />
    <circle cx="7.2" cy="17.9" r="1.8" />
    <circle cx="16.6" cy="17.9" r="1.8" />
  </Svg>
)
export const InsureMark = (p) => (
  <Svg {...p}>
    <path d="M12 4.4a8.4 8.4 0 0 1 8.4 8.4H3.6A8.4 8.4 0 0 1 12 4.4Z" />
    <path d="M12 12.8v5.4a2.6 2.6 0 0 0 5.2 0" />
  </Svg>
)

/* —— 营销 / 众筹 / 网络融资：喇叭、人群、节点 —— */
export const MarketingMark = (p) => (
  <Svg {...p}>
    <path d="M3.6 10v4h3l7.2 4.4V5.6L6.6 10Z" />
    <path d="M17.6 9.2a4.4 4.4 0 0 1 0 5.6M20.2 6.4a8 8 0 0 1 0 11.2" />
  </Svg>
)
export const CrowdMark = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8.4" r="2.6" />
    <path d="M3.8 18.6a5.2 5.2 0 0 1 10.4 0" />
    <circle cx="17.2" cy="9.6" r="2" />
    <path d="M15.4 14.6a4.2 4.2 0 0 1 4.8 4" />
  </Svg>
)
export const P2pMark = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.2" />
    <circle cx="5" cy="5.6" r="1.8" />
    <circle cx="19" cy="5.6" r="1.8" />
    <circle cx="12" cy="20" r="1.8" />
    <path d="M6.3 7 10.4 10.5M17.7 7 13.6 10.5M12 14.2v4" />
  </Svg>
)

/* —— 数据：库筒、挖掘、看板、折线、云、资源箱 —— */
export const EtlMark = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6.6" rx="7.2" ry="2.8" />
    <path d="M4.8 6.6v10.8c0 1.5 3.2 2.8 7.2 2.8s7.2-1.3 7.2-2.8V6.6" />
    <path d="M4.8 12c0 1.5 3.2 2.8 7.2 2.8s7.2-1.3 7.2-2.8" />
  </Svg>
)
export const MiningMark = (p) => (
  <Svg {...p}>
    <circle cx="10.4" cy="10.4" r="6.2" />
    <path d="M15 15l5 5" />
    <path d="M8 12.4V9.8M10.4 12.4V7.8M12.8 12.4v-3" />
  </Svg>
)
export const VizMark = (p) => (
  <Svg {...p}>
    <path d="M4.4 4v16h15.6" />
    <path d="M8.4 16.4v-4.2M12.4 16.4V8.6M16.4 16.4v-6" />
    <path d="M7.4 9.6 11 6.2l2.8 2.2 4.4-4.2" />
  </Svg>
)
export const ChartMark = (p) => (
  <Svg {...p}>
    <rect x="3.6" y="4.2" width="16.8" height="15.6" rx="2" />
    <path d="M7 15.6l3.4-4 2.6 2.2 4.2-5.4" />
    <circle cx="17.2" cy="8.4" r="1" />
  </Svg>
)
export const CloudMark = (p) => (
  <Svg {...p}>
    <path d="M7.6 18.4h9.2a4.2 4.2 0 0 0 .6-8.4 6 6 0 0 0-11.4-1.2 3.9 3.9 0 0 0 1.6 9.6Z" />
  </Svg>
)
export const CubeMark = (p) => (
  <Svg {...p}>
    <path d="M12 3.6 20 8v8l-8 4.4L4 16V8Z" />
    <path d="M4 8l8 4.4L20 8M12 12.4v8" />
  </Svg>
)

/* —— 电商 / 互动：购物袋与手柄 —— */
export const EcomMark = (p) => (
  <Svg {...p}>
    <path d="M5.6 8.4h12.8l-1.1 10.2a1.7 1.7 0 0 1-1.7 1.5H8.4a1.7 1.7 0 0 1-1.7-1.5Z" />
    <path d="M9.2 8.4V7a2.8 2.8 0 0 1 5.6 0v1.4" />
  </Svg>
)
export const GameMark = (p) => (
  <Svg {...p}>
    <rect x="3.2" y="8" width="17.6" height="9.6" rx="4.6" />
    <path d="M8.4 11.2v3.2M6.8 12.8h3.2" />
    <path d="M15.2 12.4h.01M17.4 15h.01" />
  </Svg>
)

/* —— 智能 / 编程 / 文本 / 区块链 / 数字货币 —— */
export const NeuralMark = (p) => (
  <Svg {...p}>
    <circle cx="5.4" cy="6.6" r="1.7" />
    <circle cx="5.4" cy="17.4" r="1.7" />
    <circle cx="12.6" cy="12" r="1.9" />
    <circle cx="19.4" cy="7.6" r="1.7" />
    <circle cx="19.4" cy="16.4" r="1.7" />
    <path d="M6.9 7.6l4.2 3.4M6.9 16.4l4.2-3.4M14.4 11l3.4-2.4M14.4 13l3.4 2.4" />
  </Svg>
)
export const CodeMark = (p) => (
  <Svg {...p}>
    <path d="M9 7.4 4.4 12 9 16.6M15 7.4 19.6 12 15 16.6" />
    <path d="M13.2 5.4l-2.4 13.2" />
  </Svg>
)
export const DocMark = (p) => (
  <Svg {...p}>
    <path d="M14 3.8H7.4a2 2 0 0 0-2 2v12.4a2 2 0 0 0 2 2h9.2a2 2 0 0 0 2-2V8.8Z" />
    <path d="M14 3.8v5h4.6" />
    <path d="M8.6 13h6.8M8.6 16.2h4.4" />
  </Svg>
)
export const ChainMark = (p) => (
  <Svg {...p}>
    {/* 区块之间的链接：两个开口相对的环加中间一横。
        上一版是两块方块加一根线，与 SupplyMark 同形，17px 下分不出谁是谁 */}
    <path d="M9.6 8.6H7.2a3.4 3.4 0 0 0 0 6.8h2.4" />
    <path d="M14.4 8.6h2.4a3.4 3.4 0 0 1 0 6.8h-2.4" />
    <path d="M9 12h6" />
  </Svg>
)
export const CoinMark = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M9.4 7.8 12 11.2l2.6-3.4M12 11.2v5.6M9.8 13h4.4M9.8 15.2h4.4" />
  </Svg>
)
