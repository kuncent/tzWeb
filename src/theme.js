/* ============================================================
 * 主题色 JS 镜像
 * ------------------------------------------------------------
 * 唯一来源是 src/index.css 的 @theme（--color-night-* / --color-accent-*）。
 * three.js 的 THREE.Color、canvas 纹理与部分内联渐变拿不到 CSS 变量，
 * 只能收一份等值的 JS 常量；改主题色时两处一起改（值必须逐字一致）。
 * ============================================================ */
export const THEME = {
  night: '#06080d',
  night900: '#070e1d',
  night800: '#0a1730',
  night700: '#0b1934',
  primary: '#2f7bff',
  cyan: '#25d4ff',
  ice: '#6fd4ff',
  sky: '#7fb8ff',
  onAccent: '#04101f',
}

/* 五块 3D 展板的通道色：冰蓝主导，青蓝次之，accent 蓝作辅助；
   明度/冷暖只在这一族里拉，不引入杂色 */
export const PANEL_HUES = [THEME.ice, THEME.cyan, THEME.sky, THEME.primary, '#5c7cff', '#3dddc4']

/* 首屏八大产品入口色块：与展板同源，冰蓝/青在前，蓝作辅助 */
export const PRODUCT_HUES = [THEME.ice, THEME.cyan, THEME.sky, '#9cc0ff', THEME.primary, '#1de8b7', '#4ade80', '#a3e635']
