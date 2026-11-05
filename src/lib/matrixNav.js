/* 产品体系「跳矩阵并切到指定产品」的跨组件总线
   ------------------------------------------------------------
   顶栏「产品体系」下拉里点某一产品时：先记下目标序号，再导航到 /products。
   - 若 ProductMatrix 尚未挂载（从别的页过来）：挂载后 takePending() 取走并跳。
   - 若已在 /products（ProductMatrix 已挂载）：subscribeMatrix 的回调即时收到并跳。
   两条路径都会把 pending 清空，避免下次挂载读到陈旧序号。 */

let pending = null
const subs = new Set()

export function requestMatrixIndex(i) {
  pending = i
  subs.forEach((f) => f(i))
}

export function subscribeMatrix(f) {
  subs.add(f)
  return () => subs.delete(f)
}

export function takePending() {
  const v = pending
  pending = null
  return v
}
