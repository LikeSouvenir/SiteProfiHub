import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../core/context/AppContext'
import { getSectionMetaBySource } from '../../core/api'
import { isDoneBySource } from '../../core/progress'


function sourceBackPath(source) {
  if (source === 'cases')    return '/cases'
  return '/roadmap'
}

function sourceChapterPath(source, sId, slug) {
  if (source === 'speedrun') return `/speedrun/section/${sId}/${slug}`
  if (source === 'cases')    return `/cases/${sId}/${slug}`
  return `/section/${sId}/${slug}`
}

function useSectionsForSource(source) {
  const { sections, speedrunSections, casesSections } = useApp()
  if (source === 'speedrun') return speedrunSections
  if (source === 'cases')    return casesSections
  return sections
}

function SubGroup({ sub, sId, source, depth, prog, onNavigate, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const done = sub.chapters.filter(c => isDoneBySource(prog, source, sId + '/' + c.slug)).length
  const pct  = sub.chapters.length ? Math.round(done / sub.chapters.length * 100) : 0

  if (sub.id === '__root__') {
    return (
      <div className="clist" style={{ marginBottom: 10 }}>
        {sub.chapters.map((ch, i) => (
          <ChRow key={ch.slug} ch={ch} sId={sId} source={source} idx={i} prog={prog} onNavigate={onNavigate} />
        ))}
      </div>
    )
  }

  return (
    <div className={`sub-group depth-${depth}`}>
      <div
        className={`sub-header collapsible${open ? ' open' : ''}`}
        style={{ paddingLeft: 16 + depth * 14 }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="sub-chevron">{open ? '▾' : '▸'}</span>
        <span className="sub-title">{sub.title}</span>
        <span className="sub-stat">
          {done}/{sub.chapters.length}
          {pct > 0 && <span className="sub-pct"> · {pct}%</span>}
        </span>
      </div>
      {open && (
        <div className="sub-body">
          {sub.subsections?.length > 0 && (
            <div className="sub-children">
              {sub.subsections.map(child => (
                <SubGroup key={child.id} sub={child} sId={sId} source={source} depth={depth + 1} prog={prog} onNavigate={onNavigate} defaultOpen={false} />
              ))}
            </div>
          )}
          {sub.chapters?.length > 0 && (
            <div className="clist">
              {sub.chapters.map((ch, i) => (
                <ChRow key={ch.slug} ch={ch} sId={sId} source={source} idx={i} prog={prog} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ChRow({ ch, sId, source, idx, prog, onNavigate }) {
  const isDone = isDoneBySource(prog, source, sId + '/' + ch.slug)
  return (
    <div
      className={`crow${isDone ? ' done' : ''}`}
      style={{ animationDelay: idx * 14 + 'ms' }}
      onClick={() => onNavigate(ch.slug)}
    >
      <div className={`cchk${isDone ? ' done' : ''}`}>{isDone ? '✓' : ''}</div>
      <div className="cname">{ch.title}</div>
      <div className="cnum">{String(idx + 1).padStart(2, '0')}</div>
    </div>
  )
}

export default function SectionHub({ source = 'kb' }) {
  const { sId } = useParams()
  const { prog } = useApp()
  const navigate  = useNavigate()
  const sectionsForSource = useSectionsForSource(source)
  const sec = sectionsForSource.find(s => s.id === sId)

  const [meta, setMeta] = useState(null)
  const [err,  setErr]  = useState(null)

  useEffect(() => {
    setMeta(null); setErr(null)
    getSectionMetaBySource(source, sId).then(setMeta).catch(e => setErr(e.message))
  }, [source, sId])

  const flat = meta?.flat || []
  const done = flat.filter(c => isDoneBySource(prog, source, sId + '/' + c.slug)).length
  const pct  = flat.length ? Math.round(done / flat.length * 100) : 0

  const goChapter = (slug) => {
    const encoded = slug.split('/').map(encodeURIComponent).join('/')
    navigate(sourceChapterPath(source, sId, encoded))
  }

  return (
    <div className="page">
      <div className="hubpage">
        <button className="bbtn" onClick={() => navigate(sourceBackPath(source))}>← Назад</button>
        <div className="hubhead">
          <div className="hinfo">
            <h1 className="htitle" style={{ color: sec?.color }}>{sec?.title}</h1>
            {source === 'speedrun' && (
              <div className="hub-source-badge">⚡ Speedrun</div>
            )}
            <div className="hpbar">
              <div className="hpfill" style={{ width: pct + '%', background: sec?.color }} />
            </div>
            <div className="hplbl">
              {meta ? `${done} из ${flat.length} глав · ${pct}%` : 'Загрузка…'}
            </div>
          </div>
        </div>

        {err && <div style={{ color: 'var(--cr2)', padding: '20px', textAlign: 'center' }}>Ошибка: {err}</div>}
        {!meta && !err && <div style={{ color: 'var(--tx3)', padding: '40px', textAlign: 'center', fontFamily: 'var(--fm)', fontSize: '.78rem' }}>Загрузка…</div>}

        {meta && (
          meta.subsections.length > 0
            ? meta.subsections.map((sub, i) => (
                <SubGroup key={sub.id} sub={sub} sId={sId} source={source} depth={0} prog={prog} onNavigate={goChapter} defaultOpen={i === 0} />
              ))
            : <div className="clist">
                {flat.map((ch, i) => (
                  <ChRow key={ch.slug} ch={ch} sId={sId} source={source} idx={i} prog={prog} onNavigate={goChapter} />
                ))}
              </div>
        )}
      </div>
    </div>
  )
}
