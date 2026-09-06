import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../core/context/AppContext'
import { getSectionMetaBySource, loadChapterBySource } from '../../core/api'
import {
  toggleDoneBySource, toggleBookmarkBySource,
  isDoneBySource, isBookmarkedBySource,
} from '../../core/progress'
import { mdHtml } from '../../core/markdown'
import { Icons } from '../components/Icons'

function sourceChapterPath(source, sId, slug) {
  if (source === 'speedrun') return `/speedrun/section/${sId}/${slug}`
  if (source === 'cases')    return `/cases/${sId}/${slug}`
  return `/section/${sId}/${slug}`
}

function sourceSectionPath(source, sId) {
  if (source === 'speedrun') return `/speedrun/section/${sId}`
  if (source === 'cases')    return `/cases/${sId}`
  return `/section/${sId}`
}

function useSectionsForSource(source) {
  const { sections, speedrunSections, casesSections } = useApp()
  if (source === 'speedrun') return speedrunSections
  if (source === 'cases')    return casesSections
  return sections
}

function SbSubGroup({ sub, sId, source, chSlug, depth, prog, onNavigate, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  if (sub.id === '__root__') {
    return sub.chapters.map(ch => (
      <SbItem key={ch.slug} ch={ch} sId={sId} source={source} chSlug={chSlug} depth={depth} prog={prog} onNavigate={onNavigate} />
    ))
  }
  const hasActive = sub.chapters.some(c => c.slug === chSlug)
  return (
    <>
      <div
        className={`sb-sub-label${open || hasActive ? ' open' : ''}`}
        style={{ paddingLeft: 14 + depth * 10 }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="sb-chevron">{open || hasActive ? '▾' : '▸'}</span>
        {sub.title}
      </div>
      {(open || hasActive) && (
        <>
          {sub.subsections?.length > 0
            ? sub.subsections.map(child => (
                <SbSubGroup key={child.id} sub={child} sId={sId} source={source} chSlug={chSlug} depth={depth + 1} prog={prog} onNavigate={onNavigate} defaultOpen={false} />
              ))
            : sub.chapters.map(ch => (
                <SbItem key={ch.slug} ch={ch} sId={sId} source={source} chSlug={chSlug} depth={depth + 1} prog={prog} onNavigate={onNavigate} />
              ))
          }
        </>
      )}
    </>
  )
}

function SbItem({ ch, sId, source, chSlug, depth, prog, onNavigate }) {
  const active = ch.slug === chSlug
  const cDone  = isDoneBySource(prog, source, sId + '/' + ch.slug)
  return (
    <div
      className={`sbit${active ? ' on' : ''}${cDone ? ' done' : ''}`}
      style={{ paddingLeft: 18 + depth * 10 }}
      onClick={() => onNavigate(ch.slug)}
    >
      <span className="sbdot" />
      <span style={{ flex: 1 }}>{ch.title}</span>
      {cDone && <span className="sbchk">✓</span>}
    </div>
  )
}

function Sidebar({ source, sId, chSlug, meta }) {
  const { prog } = useApp()
  const navigate  = useNavigate()
  const sectionsForSource = useSectionsForSource(source)
  const sec  = sectionsForSource.find(s => s.id === sId)
  const flat = meta?.flat || []
  const done = flat.filter(c => isDoneBySource(prog, source, sId + '/' + c.slug)).length
  const pct  = flat.length ? Math.round(done / flat.length * 100) : 0

  const goChapter = slug => {
    const encoded = slug.split('/').map(encodeURIComponent).join('/')
    navigate(sourceChapterPath(source, sId, encoded))
  }

  return (
    <>
      <div className="sbhd" onClick={() => navigate(sourceSectionPath(source, sId))}>
        <span style={{ fontSize: '.7rem', color: 'var(--cr)' }}>←</span>
        <span className="sbtitle">{sec?.title}</span>
        {source === 'speedrun' && <span className="sb-sr-badge">⚡</span>}
      </div>
      <div className="sbpbar">
        <div className="sbpfill" style={{ width: pct + '%', background: sec?.color }} />
      </div>
      {meta && (
        meta.subsections.length > 0
          ? meta.subsections.map((sub, i) => (
              <SbSubGroup key={sub.id} sub={sub} sId={sId} source={source} chSlug={chSlug} depth={0} prog={prog} onNavigate={goChapter} defaultOpen={i === 0} />
            ))
          : flat.map(ch => (
              <SbItem key={ch.slug} ch={ch} sId={sId} source={source} chSlug={chSlug} depth={0} prog={prog} onNavigate={goChapter} />
            ))
      )}
    </>
  )
}

export default function ChapterPage({ source = 'kb' }) {
  const { sId, '*': rest } = useParams()
  const chSlug = rest ? decodeURIComponent(rest) : ''
  const { prog, setProg } = useApp()
  const navigate = useNavigate()
  const sectionsForSource = useSectionsForSource(source)
  const sec = sectionsForSource.find(s => s.id === sId)

  const [meta,    setMeta]    = useState(null)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState(null)
  const [msb,     setMsb]     = useState(false)

  useEffect(() => {
    setLoading(true); setErr(null); setContent(null)
    Promise.all([
      getSectionMetaBySource(source, sId),
      loadChapterBySource(source, sId, chSlug),
    ])
      .then(([m, cnt]) => { setMeta(m); setContent(cnt); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [source, sId, chSlug])

  const chapters = meta?.flat || null
  const key    = sId + '/' + chSlug
  const isDone = isDoneBySource(prog, source, key)
  const bm     = isBookmarkedBySource(prog, source, key)
  const idx    = chapters ? chapters.findIndex(c => c.slug === chSlug) : -1
  const ch     = chapters && idx >= 0 ? chapters[idx] : null
  const next   = chapters && idx >= 0 ? chapters[idx + 1] : null
  const prev   = chapters && idx > 0  ? chapters[idx - 1] : null

  const markRead = useCallback(() => {
    setProg(p => toggleDoneBySource(p, source, key))
  }, [source, key, setProg])

  const toggleBm = useCallback(() => {
    setProg(p => toggleBookmarkBySource(p, source, key))
  }, [source, key, setProg])

  const goChapter = slug => {
    const encoded = slug.split('/').map(encodeURIComponent).join('/')
    navigate(sourceChapterPath(source, sId, encoded))
  }

  const sidebar = (
    <div className="sb">
      <Sidebar source={source} sId={sId} chSlug={chSlug} meta={meta} />
    </div>
  )

  const handleArticleClick = useCallback((e) => {
    const btn = e.target.closest('.md-copy-btn')
    if (!btn) return
    const wrap = btn.closest('.md-code-wrap')
    if (!wrap) return
    const code = wrap.querySelector('code')
    if (!code) return

    const textToCopy = code.textContent || ''
    navigator.clipboard.writeText(textToCopy).then(() => {
      btn.classList.add('copied')
      const textSpan = btn.querySelector('.copy-text')
      if (textSpan) textSpan.textContent = 'Скопировано!'
      setTimeout(() => {
        btn.classList.remove('copied')
        if (textSpan) textSpan.textContent = 'Копировать'
      }, 2000)
    }).catch(() => {})
  }, [])

  return (
    <div className="chpage">
      {sidebar}
      {msb && (
        <div className="sb-overlay" onClick={() => setMsb(false)}>
          <div className="sb" onClick={e => e.stopPropagation()}>
            <Sidebar source={source} sId={sId} chSlug={chSlug} meta={meta} />
          </div>
        </div>
      )}
      <div className="chcontent">
        <div className="chbar">
          <button className="chbar-menu" onClick={() => setMsb(s => !s)}>☰</button>
          <div className="chbar-crumb">
            <span
              className="crumb-sec"
              style={{ color: sec?.color }}
              onClick={() => navigate(sourceSectionPath(source, sId))}
            >
              {sec?.title}
            </span>
            {source === 'speedrun' && <span className="crumb-sr-badge">⚡</span>}
            <span className="crumb-sep">›</span>
            <span className="crumb-ch">{ch?.title || chSlug.split('/').pop()}</span>
          </div>
          <div className="chbar-acts">
            <button
              className={`act-btn${bm ? ' active' : ''}`}
              onClick={toggleBm}
              title={bm ? 'Удалить из избранного' : 'Добавить в избранное'}
            >
              <span className="act-btn-ico">{bm ? Icons.bookmark : Icons.bookmarkO}</span>
              <span className="act-btn-text">{bm ? 'В избранном' : 'В избранное'}</span>
            </button>
            <button
              className={`act-btn${isDone ? ' done' : ''}`}
              onClick={markRead}
              title={isDone ? 'Отметить как неизученное' : 'Отметить как изученное'}
            >
              <span className="act-btn-ico">
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
              </span>
              <span className="act-btn-text">{isDone ? 'Изучено' : 'Изучить'}</span>
            </button>
          </div>
        </div>

        <div className="ch-body">
          {loading && <div className="ch-loading">Загрузка…</div>}
          {err     && <div className="ch-err">Ошибка: {err}</div>}
          {content && (
            <article
              className="md-article"
              onClick={handleArticleClick}
              dangerouslySetInnerHTML={{ __html: mdHtml(content) }}
            />
          )}
          {!loading && !err && (
            <div className="ch-nav">
              {prev
                ? <button className="ch-nav-btn prev" onClick={() => goChapter(prev.slug)} title={prev.title}>
                    <span className="ch-nav-arrow">{Icons.chevronL}</span>
                    <span className="ch-nav-label">{prev.title}</span>
                  </button>
                : <div />
              }
              {isDone
                ? <div className="ch-done-badge" onClick={markRead} style={{ cursor: 'pointer' }} title="Нажмите, чтобы отменить">
                    <span className="ch-done-badge-ico">✓</span> Изучено
                  </div>
                : <button className="ch-done-btn" onClick={markRead}>
                    Отметить изученным ✓
                  </button>
              }
              {next
                ? <button className="ch-nav-btn next" onClick={() => goChapter(next.slug)} title={next.title}>
                    <span className="ch-nav-label">{next.title}</span>
                    <span className="ch-nav-arrow">{Icons.chevronR}</span>
                  </button>
                : <div />
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
