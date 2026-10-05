import { useLocation, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { nav } from '../data/site'

/* 兜底页：五个导航页都建好之后，这里只剩「真的走错了」一种情况。
   把实际路径显示出来 —— 少接一个路由时，这一页就是最快的报警。 */
export default function Placeholder() {
  const { pathname } = useLocation()
  return (
    <section className="flex min-h-[70svh] items-center bg-mist-100">
      <div className="container-x py-32 text-center">
        <div className="eyebrow">404 · NOT FOUND</div>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink-900 md:text-5xl">没有这个页面</h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ink-500">
          你访问的地址是
          <code className="mx-1.5 rounded bg-white px-1.5 py-0.5 font-mono text-[12.5px] text-ink-900 shadow-card">{pathname}</code>
          ，站内没有对应内容。可以从下面任一栏目进入，或告诉我们链接是从哪点来的。
        </p>

        <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2">
          {nav.map((n) => (
            <li key={n.to}>
              <Link
                to={n.to}
                className="inline-flex rounded-full border border-ink-900/10 bg-white px-4 py-2 text-[13px] font-medium text-ink-700 transition-all duration-300 hover:border-brand/40 hover:text-brand"
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link to="/" className="btn-dark group mt-10">
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          返回首页
        </Link>
      </div>
    </section>
  )
}
