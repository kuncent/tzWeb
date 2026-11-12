import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, FileText, Images, X } from 'lucide-react'
import { Reveal } from '../ui'
import { atlasMeta, coopLanes } from '../../data/cooperationAtlas'

/* ============================================================
 * 校企合作 · 合作档案（预览副本专用）
 * ------------------------------------------------------------
 * 五条合作线各用一种版面：会议=时间轴、教材=封面墙+目录、
 * 产学研=拼贴+名录、师资培训=现场组图、赛事=深色数据舞台。
 * 素材与文案全部集中在 data/cooperationAtlas.js，正式页不受影响。
 * ============================================================ */

const mono = 'font-mono text-caption uppercase tracking-label'

function LaneHead({ lane, dark = false }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`font-mono text-caption tabular-nums tracking-label ${dark ? 'text-brand-400' : 'text-brand'}`}>
          {lane.n}
        </span>
        <span className={`h-px w-6 ${dark ? 'bg-white/25' : 'bg-ink-900/15'}`} />
        <span className={`text-caption font-semibold uppercase tracking-eyebrow ${dark ? 'text-white/45' : 'text-ink-400'}`}>
          {lane.en}
        </span>
      </div>
      <h3 className={`mt-3 text-h3 font-bold ${dark ? 'text-white' : 'text-ink-900'}`}>{lane.zh}</h3>
    </div>
  )
}

/* 图片位：统一裁切、悬停微推近、底部渐变托字 */
function PhotoTile({ item, onClick, className = '', eager = false, overlay = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block overflow-hidden rounded-xl bg-ink-900/5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${className}`}
    >
      <img
        src={item.src}
        alt={item.caption}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="img-duo absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
      />
      {overlay && (
        <>
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/10 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 line-clamp-2 p-3 text-caption leading-snug text-white/90">
            {item.caption}
          </span>
        </>
      )}
    </button>
  )
}

function TimelineList({ lane, onOpen }) {
  return (
    <ol className="mt-6 border-t border-ink-900/10">
      {lane.timeline.map((it, i) => (
        <li key={`${it.year}-${i}`}>
          <button
            type="button"
            onClick={() => onOpen(it.photo ?? i)}
            className="group flex w-full items-baseline gap-3 border-b border-ink-900/10 py-2.5 text-left transition-colors hover:bg-white/70"
          >
            <span className="w-14 shrink-0 font-mono text-caption tabular-nums text-brand">{it.year}</span>
            <span className="min-w-0 flex-1 text-ui-sm leading-relaxed text-ink-700 transition-colors group-hover:text-ink-900">
              {it.text}
            </span>
            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300 transition-colors group-hover:text-brand" />
          </button>
        </li>
      ))}
    </ol>
  )
}

function Shelf({ lane, onOpen }) {
  return (
    <div className="relative h-full px-1 py-2 md:px-3 md:py-4">
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {lane.gallery.map((it, i) => (
          <button
            key={it.src}
            type="button"
            onClick={() => onOpen(i)}
            className="group text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span className="relative block overflow-hidden rounded-[4px] bg-white shadow-[0_10px_24px_-14px_rgba(11,18,32,0.5)] ring-1 ring-ink-900/10 transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_18px_34px_-16px_rgba(11,18,32,0.45)]">
              <img
                src={it.src}
                alt={it.caption}
                loading="eager"
                decoding="async"
                className="img-duo aspect-[3/4] w-full object-cover"
              />
            </span>
            <span className="mt-1.5 block truncate text-micro text-ink-500 transition-colors group-hover:text-ink-900 md:text-caption">
              {it.caption}
            </span>
          </button>
        ))}
      </div>
      <span aria-hidden className="mt-4 hidden h-px bg-gradient-to-r from-transparent via-ink-900/15 to-transparent md:block" />
    </div>
  )
}

function LightVisual({ lane, onOpen }) {
  if (lane.visual === 'shelf') return <Shelf lane={lane} onOpen={onOpen} />

  if (lane.visual === 'collage') {
    return (
      <div className="grid gap-3 md:h-[420px] md:grid-cols-[1.45fr_1fr] md:grid-rows-2">
        <PhotoTile
          item={lane.feature}
          onClick={() => onOpen(0)}
          eager
          className="aspect-[4/3] md:row-span-2 md:aspect-auto md:h-full"
        />
        {lane.support.map((it) => (
          <PhotoTile
            key={it.src}
            item={it}
            onClick={() => onOpen(lane.gallery.findIndex((g) => g.src === it.src))}
            eager
            className="aspect-[4/3] md:aspect-auto md:h-full"
          />
        ))}
      </div>
    )
  }

  if (lane.visual === 'workshop') {
    return (
      <div className="grid gap-3">
        <PhotoTile item={lane.feature} onClick={() => onOpen(0)} eager className="aspect-[16/9]" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {lane.support.map((it, i) => (
            <PhotoTile
              key={it.src}
              item={it}
              onClick={() => onOpen(lane.gallery.findIndex((g) => g.src === it.src))}
              eager
              className={
                i === 2
                  ? 'col-span-2 aspect-[16/9] md:col-span-1 md:aspect-[4/3]'
                  : 'aspect-[4/3]'
              }
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <PhotoTile item={lane.feature} onClick={() => onOpen(0)} eager className="aspect-[16/10]" />
      <div className="grid grid-cols-2 gap-3">
        {lane.support.map((it) => (
          <PhotoTile
            key={it.src}
            item={it}
            onClick={() => onOpen(lane.gallery.findIndex((g) => g.src === it.src))}
            eager
            className="aspect-[16/10]"
          />
        ))}
      </div>
    </div>
  )
}

function LightStage({ lane, onOpen }) {
  const isShelf = lane.visual === 'shelf'
  return (
    <div className="grid lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)]">
      <div className="p-2.5 md:p-4">
        <LightVisual lane={lane} onOpen={onOpen} />
      </div>
      <div className="flex flex-col border-t border-ink-900/10 p-6 md:p-8 lg:border-l lg:border-t-0 lg:p-9">
        <LaneHead lane={lane} />
        <p className="mt-4 text-ui leading-[1.9] text-ink-500">{lane.lead}</p>

        {isShelf ? (
          <ul className="mt-6 border-t border-ink-900/10">
            {lane.gallery.map((it, i) => (
              <li key={it.src}>
                <button
                  type="button"
                  onClick={() => onOpen(i)}
                  className="group flex w-full items-center gap-3 border-b border-ink-900/10 py-2.5 text-left"
                >
                  <span className="w-6 shrink-0 font-mono text-caption tabular-nums text-ink-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ui-sm text-ink-700 transition-colors group-hover:text-brand">
                    {it.caption}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-300 transition-colors group-hover:text-brand" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <TimelineList lane={lane} onOpen={onOpen} />
        )}

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={() => onOpen(0)}
            className="group inline-flex items-center gap-2 rounded-full border border-ink-900/12 px-4 py-2 text-ui-sm font-medium text-ink-700 transition-colors hover:border-brand/50 hover:bg-brand-50 hover:text-brand"
          >
            <Images className="h-4 w-4" strokeWidth={1.7} />
            查看本线全部 {lane.gallery.length} {isShelf ? '部封面' : '张现场'}
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          </button>
          <p className="mt-2.5 text-caption text-ink-400">点击任意图片可放大浏览，支持方向键切换。</p>
        </div>
      </div>
    </div>
  )
}

function CompetitionStage({ lane, onOpenPhoto, onOpenDoc }) {
  return (
    <div className="relative isolate overflow-hidden bg-night-900">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_80%_at_12%_0%,rgba(75,107,255,0.22),transparent_60%),radial-gradient(70%_60%_at_92%_18%,rgba(34,211,238,0.12),transparent_65%)]"
      />
      <span aria-hidden className="dark-grain pointer-events-none absolute inset-0" />

      <div className="relative p-6 md:p-9 lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
          <div className="max-w-2xl">
            <LaneHead lane={lane} dark />
            <p className="mt-4 text-ui leading-[1.9] text-white/60">{lane.lead}</p>
          </div>
          <dl className="grid shrink-0 gap-2 border-l border-white/10 pl-5">
            {lane.credit.map((c) => (
              <div key={c.k} className="flex gap-3 text-ui-sm">
                <dt className="w-16 shrink-0 text-white/35">{c.k}</dt>
                <dd className="text-white/75">{c.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-white/10 pt-7 md:grid-cols-3 lg:grid-cols-6">
          {lane.stats.map((s) => (
            <div key={s.label} className="relative pl-3.5">
              <span aria-hidden className="absolute left-0 top-1 h-[calc(100%-6px)] w-px bg-white/12" />
              <p className="text-ui-sm text-white/40">{s.label}</p>
              <p className="mt-1.5 font-mono text-[clamp(1.35rem,1.1rem+0.9vw,1.9rem)] font-semibold leading-none tracking-tight text-white">
                {s.value}{s.suffix}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-micro leading-relaxed text-white/35">
          数据口径：2022 年第九届全国证券投资模拟实训大赛（冠军邀请赛）比赛结果通报；现场照片为冠军邀请赛现场存档。
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <PhotoTile item={lane.feature} onClick={() => onOpenPhoto(0)} eager className="aspect-[4/3]" />
          {lane.support.map((it) => (
            <PhotoTile
              key={it.src}
              item={it}
              onClick={() => onOpenPhoto(lane.gallery.findIndex((g) => g.src === it.src))}
              eager
              className="aspect-[4/3]"
            />
          ))}
        </div>

        <div className="mt-9 border-t border-white/10 pt-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={`${mono} text-white/40`}>DOCUMENTS</p>
              <h4 className="mt-2 text-title font-semibold text-white">文件存档</h4>
            </div>
            <p className="text-ui-sm text-white/40">3 份官方文件截图 · 点击查看原文</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {lane.docs.map((doc, i) => (
              <button
                key={doc.src}
                type="button"
                onClick={() => onOpenDoc(i)}
                className="group card-elev-dark flex flex-col overflow-hidden rounded-xl text-left transition-colors hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span className="relative block h-40 overflow-hidden bg-white md:h-44">
                  <img
                    src={doc.src}
                    alt={doc.title}
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  />
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-night/45 to-transparent" />
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-night/70 px-2 py-0.5 text-micro text-white/85 backdrop-blur">
                    <FileText className="h-3 w-3" />
                    文件 0{i + 1}
                  </span>
                </span>
                <span className="flex flex-1 flex-col p-4">
                  <span className="text-ui-sm font-semibold leading-snug text-white">{doc.title}</span>
                  <span className="mt-1.5 text-micro leading-relaxed text-white/40">{doc.meta}</span>
                  <span className="mt-3 line-clamp-3 text-caption leading-relaxed text-white/55">{doc.note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ArchiveLightbox({ kind, items, index, onClose, onStep }) {
  const item = items[index]
  const isDoc = kind === 'doc'

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onStep(-1)
      else if (e.key === 'ArrowRight') onStep(1)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, onStep])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isDoc ? item.title : item.caption}
      className="fixed inset-0 z-[95] flex flex-col bg-night/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <p className="min-w-0 truncate font-mono text-caption uppercase tracking-label text-white/45">
          {isDoc ? 'DOCUMENT ARCHIVE' : 'ON-SITE ARCHIVE'}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-caption tabular-nums text-white/55">
            {index + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-12 md:px-20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onStep(-1)}
          aria-label="上一张"
          className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-5"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <img
          key={item.src}
          src={item.src}
          alt={isDoc ? item.title : item.caption}
          className={`max-h-full max-w-full rounded-lg object-contain shadow-2xl ${isDoc ? 'bg-white' : ''}`}
        />
        <button
          type="button"
          onClick={() => onStep(1)}
          aria-label="下一张"
          className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-5"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <div className="px-6 pb-5 pt-4 text-center">
        <p className="text-ui text-white/85">{isDoc ? item.title : item.caption}</p>
        {isDoc && (
          <>
            <p className="mt-1 text-caption text-white/45">{item.meta}</p>
            <p className="mx-auto mt-2 max-w-3xl text-ui-sm leading-relaxed text-white/55">{item.note}</p>
          </>
        )}
      </div>
    </div>
  )
}

/* ―― 五条线导航（桌面）――
   竖排贴在板块左侧，sticky 吸顶；顶部预留 120px（固定导航 64 + 预览条），
   与页面其他固定元素不重叠；导航独占一列，不压正文。只保留线名与一根短标记。 */
function LaneRail({ active, onSelect }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[120px]">
        <nav role="tablist" aria-orientation="vertical" aria-label="校企合作方向" className="flex flex-col gap-0.5">
          {coopLanes.map((l) => {
            const on = l.id === active
            return (
              <button
                key={l.id}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => onSelect(l.id)}
                className={`group flex items-center gap-2.5 py-2 text-left text-ui transition-colors duration-300 ${
                  on ? 'font-semibold text-ink-900' : 'text-ink-400 hover:text-ink-900'
                }`}
              >
                <span aria-hidden className="relative block h-[2px] w-4 shrink-0">
                  <span
                    className={`absolute inset-0 rounded-full bg-brand transition-opacity duration-300 ${
                      on ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </span>
                {l.zh}
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

/* ―― 五条线导航（窄屏退化）――
   横向滑条，不吸顶：避免与顶部固定导航/预览条抢位置，也不改动页面高度。 */
function LaneTabs({ active, onSelect }) {
  return (
    <div
      role="tablist"
      aria-label="校企合作方向（窄屏）"
      className="-mx-6 flex snap-x scroll-pl-6 gap-2 overflow-x-auto px-6 pb-2 no-scrollbar md:-mx-10 md:scroll-pl-10 md:px-10 lg:hidden"
    >
      {coopLanes.map((l) => {
        const on = l.id === active
        return (
          <button
            key={l.id}
            role="tab"
            aria-selected={on}
            type="button"
            onClick={() => onSelect(l.id)}
            className={`min-w-[152px] shrink-0 snap-start border-t-2 pt-3 text-left transition-colors ${
              on ? 'border-brand' : 'border-ink-900/10 hover:border-ink-900/30'
            }`}
          >
            <span className={`font-mono text-caption tabular-nums tracking-label ${on ? 'text-brand' : 'text-ink-300'}`}>
              {l.n}
            </span>
            <span className={`mt-1.5 block text-ui font-semibold ${on ? 'text-ink-900' : 'text-ink-500'}`}>{l.zh}</span>
            <span className={`mt-0.5 block text-micro ${on ? 'text-ink-400' : 'text-ink-300'}`}>{l.count}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ―― 学术会议：左侧会议清单 + 右侧会议纪要示意页 ――
   图片一律取该场会议在 gallery 中的现有现场照片；纪要文字为结构占位，
   不写具体结论、人数与决议，避免被当成真实记录。 */
function ConferenceSegment({ lane, onOpen }) {
  const [selected, setSelected] = useState(0)
  const item = lane.timeline[selected]
  const photo = lane.gallery[item.photo]

  return (
    <div className="border-t border-ink-900/10 pt-7 md:pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-caption uppercase tracking-label text-brand">CONFERENCE MINUTES</p>
          <h3 className="mt-2 text-h3 font-bold text-ink-900">学术会议</h3>
          <p className="mt-2 max-w-xl text-ui-sm leading-[1.8] text-ink-500">
            左侧为 8 场会议清单，按时间倒序排列；点选任一条，右侧查看该场现场照片与会议纪要。
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-caption uppercase tracking-label text-ink-400">8 MEETINGS</p>
            <p className="text-micro text-ink-300 lg:hidden">左右滑动查看</p>
          </div>

          <div
            role="tablist"
            aria-label="会议清单"
            className="-mx-6 mt-2.5 flex snap-x scroll-pl-6 gap-2 overflow-x-auto px-6 pb-2 no-scrollbar md:-mx-10 md:scroll-pl-10 md:px-10 lg:mx-0 lg:mt-3 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:border-ink-900/10 lg:px-0 lg:pb-0"
          >
            {lane.timeline.map((it, i) => {
              const on = i === selected
              return (
                <button
                  key={`${it.year}-${i}`}
                  role="tab"
                  aria-selected={on}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`relative w-[236px] shrink-0 snap-start rounded-xl border p-3 text-left transition-colors md:w-[264px] lg:w-auto lg:rounded-none lg:border-0 lg:border-b lg:border-ink-900/10 lg:px-0 lg:py-3.5 lg:pl-4 ${
                    on
                      ? 'border-brand/35 bg-brand-50/70 lg:bg-transparent'
                      : 'border-ink-900/10 bg-white hover:border-ink-900/25 lg:hover:bg-mist-100/70'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute bottom-3 left-0 top-3 hidden w-[2px] rounded-full lg:block ${
                      on ? 'bg-brand' : 'bg-transparent'
                    }`}
                  />
                  <span className="flex items-baseline gap-2.5">
                    <span className={`font-mono text-caption tabular-nums ${on ? 'text-brand' : 'text-ink-300'}`}>
                      {it.year}
                    </span>
                    {it.place && <span className="text-micro text-ink-400">{it.place}</span>}
                  </span>
                  <span
                    className={`mt-1 block text-ui-sm leading-relaxed ${
                      on ? 'font-semibold text-ink-900' : 'text-ink-500'
                    }`}
                  >
                    {it.text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <article className="min-w-0 overflow-hidden rounded-[18px] border border-ink-900/10 bg-white shadow-lift">
          <div className="flex items-center justify-between gap-3 border-b border-ink-900/10 bg-mist-100 px-4 py-2.5 md:px-5">
            <span className="font-mono text-caption uppercase tracking-label text-ink-400">
              MINUTES / {String(selected + 1).padStart(2, '0')}
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 text-micro text-ink-400 ring-1 ring-ink-900/10">示意</span>
          </div>

          <div key={selected} className="coop-swap">
            <button
              type="button"
              onClick={() => onOpen(item.photo)}
              className="group relative block aspect-[16/9] w-full overflow-hidden bg-ink-900/5 text-left"
            >
              <img
                src={photo.src}
                alt={photo.caption}
                loading="eager"
                decoding="async"
                className="img-duo absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
              />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/60 via-transparent to-transparent" />
              <span className="absolute left-3 top-3 rounded-full bg-night/60 px-2 py-0.5 font-mono text-micro tabular-nums text-white/85 backdrop-blur">
                PHOTO {String(item.photo + 1).padStart(2, '0')} / {String(lane.gallery.length).padStart(2, '0')}
              </span>
              <span className="absolute bottom-3 right-3 rounded-full bg-white/15 px-2.5 py-1 text-micro text-white/85 backdrop-blur">
                点击查看原图
              </span>
            </button>

            <div className="p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption text-ink-400">
                <span className="font-mono tabular-nums text-brand">{item.year}</span>
                <span aria-hidden className="h-3 w-px bg-ink-900/10" />
                <span>{item.place ?? '地点未在资料中标注'}</span>
                <span aria-hidden className="h-3 w-px bg-ink-900/10" />
                <span>纪要结构示意</span>
              </div>
              <h4 className="mt-2 text-title font-semibold leading-snug text-ink-900">{item.text}</h4>

              <div className="mt-4">
                <p className="font-mono text-micro uppercase tracking-label text-ink-400">议题</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {item.topics.map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-ink-900/10 bg-mist-100 px-2.5 py-0.5 text-micro text-ink-500"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <p className="font-mono text-micro uppercase tracking-label text-ink-400">要点（占位）</p>
                <ul className="mt-1.5 divide-y divide-ink-900/[0.07]">
                  {['背景与目的', '讨论要点', '后续跟进'].map((k) => (
                    <li key={k} className="flex items-baseline gap-3 py-2 text-ui-sm">
                      <span className="shrink-0 text-ink-500">{k}</span>
                      <span aria-hidden className="min-w-0 flex-1 border-b border-dashed border-ink-200/80" />
                      <span className="shrink-0 text-micro text-ink-300">待补充</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

export default function CooperationAtlas() {
  const initialLane = new URLSearchParams(window.location.search).get('lane')
  const [active, setActive] = useState(
    coopLanes.some((l) => l.id === initialLane) ? initialLane : coopLanes[0].id
  )
  const [viewer, setViewer] = useState(null)
  const lane = coopLanes.find((l) => l.id === active)

  const openPhoto = useCallback((i) => setViewer({ kind: 'photo', index: i }), [])
  const openDoc = useCallback((i) => setViewer({ kind: 'doc', index: i }), [])
  const close = useCallback(() => setViewer(null), [])
  const step = useCallback(
    (d) => {
      setViewer((v) => {
        if (!v) return v
        const items = v.kind === 'doc' ? lane.docs : lane.gallery
        return { ...v, index: (v.index + d + items.length) % items.length }
      })
    },
    [lane]
  )

  const viewerItems = viewer ? (viewer.kind === 'doc' ? lane.docs : lane.gallery) : null

  return (
    <section id="cooperation-archive" className="relative overflow-x-clip bg-white pb-16 pt-12 md:pb-24 md:pt-16">
      <div className="container-x">
        <Reveal>
          <div className="flex flex-col gap-8 border-t border-ink-900/10 pt-8 md:flex-row md:items-end md:justify-between md:pt-10">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
                <span className="font-mono text-caption font-semibold uppercase tracking-label text-brand">
                  {atlasMeta.eyebrow}
                </span>
                <span aria-hidden className="h-px w-8 bg-ink-900/15" />
                <span className="font-mono text-caption tabular-nums tracking-label text-ink-400">
                  {atlasMeta.period}
                </span>
              </div>
              <h2 className="mt-4 text-h2 font-bold text-ink-900">{atlasMeta.title}</h2>
              <p className="mt-4 max-w-2xl text-ui-lg leading-[1.85] text-ink-500">{atlasMeta.desc}</p>
            </div>

            <dl className="grid shrink-0 grid-cols-3 gap-5 md:gap-8">
              {atlasMeta.counts.map((c) => (
                <div key={c.k} className="border-l border-ink-900/10 pl-4">
                  <dt className="text-ui-sm text-ink-500">{c.k}</dt>
                  <dd className="mt-1 text-stat font-bold tabular-nums text-ink-900">
                    {c.v}
                    <span className="ml-0.5 text-[0.55em] font-semibold text-ink-400">{c.suffix}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>

      <div className="container-x mt-9 md:mt-11">
        <div className="lg:grid lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[180px_minmax(0,1fr)] xl:gap-12">
          <LaneRail active={active} onSelect={setActive} />

          <div className="min-w-0">
            <LaneTabs active={active} onSelect={setActive} />

            {active === 'conference' ? (
              <ConferenceSegment lane={lane} onOpen={openPhoto} />
            ) : (
              <>
                <div
                  className={`mt-5 overflow-hidden rounded-[24px] border md:mt-7 md:rounded-[28px] lg:mt-0 ${
                    lane.tone === 'dark' ? 'border-white/10 bg-night-900 shadow-lift' : 'border-ink-900/10 bg-mist-100'
                  }`}
                >
                  <div key={lane.id} className="coop-swap">
                    {lane.tone === 'dark' ? (
                      <CompetitionStage lane={lane} onOpenPhoto={openPhoto} onOpenDoc={openDoc} />
                    ) : (
                      <LightStage lane={lane} onOpen={openPhoto} />
                    )}
                  </div>
                </div>

                <div className="mt-10 md:mt-14">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-caption uppercase tracking-label text-ink-400">ON-SITE ARCHIVE</p>
                      <h3 className="mt-2 text-title font-semibold text-ink-900">本线现场存档</h3>
                    </div>
                    <p className="text-ui-sm text-ink-400">
                      横向滑动浏览 · 共 {lane.gallery.length} {lane.visual === 'shelf' ? '部' : '张'} · 点击放大
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="-mx-6 flex snap-x scroll-pl-6 gap-3 overflow-x-auto px-6 pb-3 no-scrollbar md:-mx-10 md:scroll-pl-10 md:px-10 lg:mx-0 lg:scroll-pl-0 lg:px-0">
                      {lane.gallery.map((it, i) => (
                        <button
                          key={it.src}
                          type="button"
                          onClick={() => openPhoto(i)}
                          className={`group shrink-0 snap-start text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                            lane.visual === 'shelf' ? 'w-[116px] md:w-[138px]' : 'w-[210px] md:w-[248px]'
                          }`}
                        >
                          <span className="relative block overflow-hidden rounded-lg bg-ink-900/5">
                            <img
                              src={it.src}
                              alt={it.caption}
                              loading="lazy"
                              decoding="async"
                              className={`img-duo w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${
                                lane.visual === 'shelf' ? 'aspect-[3/4]' : 'aspect-[4/3]'
                              }`}
                            />
                            <span className="absolute left-2 top-2 rounded bg-night/55 px-1.5 py-0.5 font-mono text-micro tabular-nums text-white/85 backdrop-blur">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                          </span>
                          <span className="mt-2 line-clamp-2 block text-caption leading-relaxed text-ink-500 transition-colors group-hover:text-ink-900">
                            {it.caption}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container-x mt-9">
        <p className="flex flex-col gap-1 border-t border-ink-900/10 pt-4 text-caption leading-relaxed text-ink-400 md:flex-row md:items-center md:gap-3">
          <span className="font-mono uppercase tracking-label text-ink-500">资料说明</span>
          <span>
            本板块为预览副本，图片、机构与数字均取自《官网整理》资料（2019—2026），未作虚构补充；正式页面暂未替换。
          </span>
        </p>
      </div>

      {viewer && (
        <ArchiveLightbox
          kind={viewer.kind}
          items={viewerItems}
          index={viewer.index}
          onClose={close}
          onStep={step}
        />
      )}
    </section>
  )
}
