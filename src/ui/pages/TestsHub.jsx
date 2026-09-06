import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../core/context/AppContext'
import { loadQuizSections } from '../../core/api'
import { SectionIcon } from '../components/Icons'

export default function TestsHub() {
  const { prog } = useApp()
  const navigate = useNavigate()
  const [quizSecs, setQuizSecs] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    loadQuizSections().then(setQuizSecs).catch(e => setErr(e.message))
  }, [])

  const renderCard = (sec, i, depth) => {
    const score   = prog.qs[sec.qbPath]
    const pct     = score ? Math.round(score.score / score.total * 100) : 0
    const hasSubs = sec.subsections?.length > 0

    return (
      <div key={sec.qbPath} style={{ animationDelay: i * 35 + 'ms' }}>
        <div className="tcard" onClick={() => navigate(`/quiz/${encodeURIComponent(sec.qbPath)}`)}>
          <span className="tcard-ico" style={{ color: sec.color || 'var(--acc)' }}>
            <SectionIcon sec={sec} size={20} />
          </span>
          <div className="tcard-info">
            <div className="tcard-title">{sec.title}</div>
            {score ? (
              <>
                <div className="tcard-bar">
                  <div className="tcard-fill" style={{ width: pct + '%', background: sec.color }} />
                </div>
                <div className="tcard-meta">Последний: {score.score}/{score.total} · {score.date}</div>
              </>
            ) : (
              <div className="tcard-meta" style={{ color: 'var(--tx3)' }}>
                {sec.count ? `${sec.count} вопросов` : 'Нет вопросов'}
              </div>
            )}
          </div>
          {score && (
            <div className="tcard-score">
              <div className="tcard-pct" style={{ color: pct >= 80 ? 'var(--ok2)' : pct >= 60 ? 'var(--go)' : 'var(--cr2)' }}>{pct}%</div>
              <div className="tcard-lbl">результат</div>
            </div>
          )}
          <button className="tcard-start"
            onClick={e => { e.stopPropagation(); navigate(`/quiz/${encodeURIComponent(sec.qbPath)}`) }}>
            {score ? 'Повторить' : 'Начать'}
          </button>
        </div>
        {hasSubs && (
          <div className="quiz-subs" style={{ paddingLeft: 16 + depth * 12 }}>
            {sec.subsections.map((sub, j) => renderCard({ ...sub, color: sec.color }, j, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="tests-page">
        {err && <div style={{ color: 'var(--cr2)', padding: 20, textAlign: 'center' }}>{err}</div>}
        {!quizSecs && !err && (
          <div style={{ color: 'var(--tx3)', padding: '40px', textAlign: 'center', fontFamily: 'var(--fm)', fontSize: '.78rem' }}>
            Загрузка тестов…
          </div>
        )}
        {quizSecs && (
          <div className="tests-grid">
            {quizSecs.map((sec, i) => renderCard(sec, i, 0))}
          </div>
        )}
      </div>
    </div>
  )
}
