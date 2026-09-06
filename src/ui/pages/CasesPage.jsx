import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../core/context/AppContext'
import { SectionIcon } from '../components/Icons'

function CaseCard({ sec, prog, chapCounts, delay }) {
  const navigate = useNavigate()
  const done  = prog.done.filter(k => k.startsWith('case:' + sec.id + '/')).length
  const total = chapCounts[sec.id] || 0
  const pct   = total ? Math.round(done / total * 100) : 0

  return (
    <div
      className="sec-card"
      style={{ animationDelay: delay + 'ms', '--sec-color': sec.color }}
      onClick={() => navigate(`/cases/${sec.id}`)}
    >
      <div className="sec-card-top">
        <span className="sec-card-ico" style={{ color: sec.color }}>
          <SectionIcon sec={sec} size={22} />
        </span>
        <span className="cases-tag">КЕЙС</span>
      </div>
      <div className="sec-card-title" style={{ color: sec.color }}>{sec.title}</div>
      <div className="sec-card-bar">
        <div className="sec-card-fill" style={{ width: pct + '%', background: sec.color }} />
      </div>
      <div className="sec-card-meta">
        {total ? `${done} / ${total} разделов · ${pct}%` : 'Открыть →'}
      </div>
    </div>
  )
}

function MobileCaseCard({ sec, prog, chapCounts, index }) {
  const navigate  = useNavigate()
  const total = chapCounts[sec.id] || 0

  return (
    <div
      className="mob-rm-card"
      style={{ '--card-color': sec.color, marginBottom: 10, animationDelay: index * 40 + 'ms' }}
      onClick={() => navigate(`/cases/${sec.id}`)}
    >
      <div className="mob-rm-card-top">
        <span className="mob-rm-icon" style={{ color: sec.color }}>
          <SectionIcon sec={sec} size={20} />
        </span>
        <span className="mob-rm-title" style={{ color: sec.color }}>{sec.title}</span>
        <span className="cases-tag">КЕЙС</span>
      </div>
      <div className="mob-rm-footer">
        <span className="mob-rm-meta">{total ? `${total} разделов` : 'Открыть →'}</span>
      </div>
    </div>
  )
}

export default function CasesPage() {
  const { casesSections, casesChapCounts, prog } = useApp()
  const mobile = window.innerWidth < 768

  return (
    <div className="page">
      <div className="sections-page">
        <div className="sections-header">
          <div className="sections-title">Кейсы</div>
          <div style={{ fontSize: '.74rem', color: 'var(--tx3)', fontFamily: 'var(--fm)', marginTop: 4, maxWidth: 480 }}>
            Разборы реальных приложений — архитектура, поэтапная разработка, технические решения
          </div>
        </div>

        {casesSections.length === 0 && (
          <div style={{ color: 'var(--tx3)', fontFamily: 'var(--fm)', fontSize: '.78rem', padding: '40px 0', textAlign: 'center' }}>
            Репозиторий кейсов пуст или ещё не заполнен.<br />
            <span style={{ opacity: .6 }}>Разборы приложений появятся здесь после добавления в репозиторий.</span>
          </div>
        )}

        {mobile
          ? <div className="mob-rm-list" style={{ padding: '0 16px' }}>
              {casesSections.map((sec, i) => (
                <MobileCaseCard key={sec.id} sec={sec} prog={prog} chapCounts={casesChapCounts} index={i} />
              ))}
            </div>
          : <div className="sections-grid">
              {casesSections.map((sec, i) => (
                <CaseCard key={sec.id} sec={sec} prog={prog} chapCounts={casesChapCounts} delay={i * 40} />
              ))}
            </div>
        }
      </div>
    </div>
  )
}
