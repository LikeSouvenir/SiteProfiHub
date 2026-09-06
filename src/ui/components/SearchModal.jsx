import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCached } from '../../core/cache'
import { useApp } from '../../core/context/AppContext'
import { Icons } from './Icons'

export default function SearchModal({ onClose }) {
  const { sections } = useApp()
  const navigate = useNavigate()
  const [q, setQ]         = useState('')
  const [items, setItems] = useState([])
  const [results, setResults] = useState([])
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const idx = []
    sections.forEach(sec => {
      // Новый формат ключа: atlant_v2_meta_kb_<sId>
      const cKey = `atlant_v2_meta_kb_${sec.id.replace(/\W/g, '_')}`
      const raw  = getCached(cKey)
      if (!raw) return
      const chapters = Array.isArray(raw) ? raw : (Array.isArray(raw.flat) ? raw.flat : [])
      chapters.forEach(ch => {
        const ck  = `atlant_v2_ch_${('kb_' + sec.id + '_' + ch.slug).replace(/\W/g, '_').slice(0, 80)}`
        const txt = getCached(ck)
        idx.push({
          id:     sec.id + '/' + ch.slug,
          title:  ch.title,
          sId:    sec.id,
          sTtl:   sec.title,
          sColor: sec.color,
          txt:    txt ? txt.slice(0, 500).toLowerCase() : '',
          path:   `/section/${sec.id}/${ch.slug.split('/').map(encodeURIComponent).join('/')}`,
        })
      })
    })
    setItems(idx)
  }, [sections])

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const ql = q.toLowerCase()
    setResults(
      items
        .filter(it => it.title.toLowerCase().includes(ql) || it.txt.includes(ql) || it.sTtl.toLowerCase().includes(ql))
        .slice(0, 12)
    )
  }, [q, items])

  const go = (path) => { navigate(path); onClose() }

  return (
    <div className="srch-overlay" onClick={onClose}>
      <div className="srch-modal" onClick={e => e.stopPropagation()}>
        <div className="srch-top">
          <span style={{ color: 'var(--tx3)' }}>{Icons.search}</span>
          <input
            ref={inputRef}
            className="srch-input"
            placeholder="Поиск по конспектам…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button className="srch-esc" onClick={onClose}>ESC</button>
        </div>
        {results.length > 0 && (
          <div className="srch-results">
            {results.map((it, i) => (
              <div key={it.id} className="srch-item" style={{ animationDelay: i * 18 + 'ms' }}
                onClick={() => go(it.path)}>
                <span className="srch-sec" style={{ color: it.sColor }}>{it.sTtl}</span>
                <span className="srch-title">{it.title}</span>
              </div>
            ))}
          </div>
        )}
        {q && results.length === 0 && (
          <div className="srch-empty">Ничего не найдено по «{q}»</div>
        )}
      </div>
    </div>
  )
}
