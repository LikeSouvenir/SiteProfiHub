import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../core/context/AppContext'
import { toggleBookmark } from '../../core/progress'
import { Icons } from '../components/Icons'

export default function BookmarksPage() {
  const { sections, prog, setProg } = useApp()
  const navigate = useNavigate()
  const bm = prog.bookmarks || []

  const getInfo = key => {
    const parts = key.split('/')
    const sId   = parts[0]
    const sec   = sections.find(s => s.id === sId)
    return { sec, title: parts.slice(1).join('/').split('/').pop() }
  }

  return (
    <div className="page">
      <div className="bmpage">
        {bm.length === 0 ? (
          <div className="bmempty">
            Нет закладок<br/>
            <span style={{ fontSize: '.78rem', color: 'var(--tx3)' }}>
              Нажми на иконку закладки при чтении конспекта
            </span>
          </div>
        ) : (
          <div className="clist" style={{ marginTop: 20 }}>
            {bm.map((key, i) => {
              const { sec, title } = getInfo(key)
              return (
                <div key={key} className="crow" style={{ animationDelay: i * 20 + 'ms' }}>
                  <div onClick={() => { const parts = key.split('/'); navigate(`/section/${parts[0]}/${parts.slice(1).join('/').split('/').map(encodeURIComponent).join('/')}`); }}>
                    <div className="cname">{title}</div>
                    <div className="cnum" style={{ color: sec?.color, fontSize: '.7rem' }}>{sec?.title}</div>
                  </div>
                  <button
                    className="act-btn active"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setProg(p => toggleBookmark(p, key))}
                  >
                    {Icons.bookmark}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
