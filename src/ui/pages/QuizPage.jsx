import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../core/context/AppContext'
import { loadQuizSections, loadQuizByPath } from '../../core/api'
import { saveQuizResult } from '../../core/progress'

export default function QuizPage() {
  const { '*': pathParam } = useParams()
  const qbPath = decodeURIComponent(pathParam || '')
  const { prog, setProg, sections } = useApp()
  const navigate = useNavigate()

  const kbSec = sections.find(s => s.id === qbPath)
  const [quizSec, setQuizSec] = useState(null)
  const [qs,   setQs]   = useState(null)
  const [err,  setErr]  = useState(null)
  const [cur,  setCur]  = useState(0)
  const [sel,  setSel]  = useState(null)
  const [ans,  setAns]  = useState(false)
  const [score, setScore] = useState(0)
  const [done,  setDone]  = useState(false)

  useEffect(() => {
    setQs(null); setErr(null); setCur(0); setSel(null); setAns(false); setScore(0); setDone(false)
    loadQuizSections().then(secs => {
      const sec = secs.find(s => s.qbPath === qbPath || s.id === qbPath) ||
                  secs.flatMap(s => s.subsections || []).find(s => s.qbPath === qbPath)
      setQuizSec(sec || null)
      return loadQuizByPath(qbPath)
    }).then(data => {
      if (!data?.length) setErr('Тест для этого раздела ещё не добавлен.')
      else setQs(data)
    }).catch(e => setErr(e.message))
  }, [qbPath])

  const sec = quizSec || kbSec || { title: qbPath, color: 'var(--acc)' }

  const choose = optIdx => {
    if (ans) return
    setSel(optIdx)
    setAns(true)
    if (optIdx === qs[cur].a) setScore(s => s + 1)
  }

  const next = () => {
    if (cur + 1 >= qs.length) {
      const finalScore = score + (sel === qs[cur].a ? 1 : 0)
      const u = saveQuizResult(prog, qbPath, finalScore, qs.length)
      setProg(u)
      setDone(true)
    } else {
      setCur(c => c + 1); setSel(null); setAns(false)
    }
  }

  if (err) return (
    <div className="page"><div className="quiz-page">
      <button className="bbtn" onClick={() => navigate('/tests')}>← Все тесты</button>
      <div className="quiz-card" style={{ padding: 30, textAlign: 'center', color: 'var(--tx3)', lineHeight: 2 }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🚧</div>
        <div style={{ marginBottom: 8 }}>{err}</div>
        <div style={{ fontSize: '.78rem', background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px', textAlign: 'left', lineHeight: 1.8 }}>
          <b>Проверь:</b><br/>
          1. Репозиторий <code>question-base</code> публичный<br/>
          2. Папка <code>{qbPath}/</code> существует в репо<br/>
          3. .json файлы с вопросами внутри папки<br/>
          4. Формат: <code>[{'{'}"q","opts","a","exp"{'}'}]</code>
        </div>
      </div>
    </div></div>
  )

  if (!qs) return (
    <div className="page"><div className="quiz-page">
      <button className="bbtn" onClick={() => navigate('/tests')}>← Все тесты</button>
      <div style={{ color: 'var(--tx3)', padding: '40px', textAlign: 'center', fontFamily: 'var(--fm)', fontSize: '.78rem' }}>
        Загрузка вопросов…
      </div>
    </div></div>
  )

  const q    = qs[cur]
  const sPct = done ? Math.round((score) / qs.length * 100) : 0

  if (done) return (
    <div className="page"><div className="quiz-page">
      <div className="quiz-card qres">
        <div className="qres-ico">{sPct >= 80 ? '🏆' : sPct >= 60 ? '👍' : '📚'}</div>
        <div className="qres-t">{sec.title}</div>
        <div className="qres-score" style={{ color: sPct >= 80 ? 'var(--ok2)' : sPct >= 60 ? 'var(--go)' : 'var(--cr2)' }}>
          {score}/{qs.length}
        </div>
        <div className="qres-s">{sPct}% правильных</div>
        <div className="qres-btns">
          <button className="bs" onClick={() => { setCur(0); setSel(null); setAns(false); setScore(0); setDone(false) }}>
            Повторить
          </button>
          {kbSec && <button className="bs" onClick={() => navigate(`/section/${kbSec.id}`)}>К разделу</button>}
          <button className="bs" onClick={() => navigate('/tests')}>Все тесты</button>
        </div>
      </div>
    </div></div>
  )

  const progress = Math.round((cur / qs.length) * 100)

  return (
    <div className="page"><div className="quiz-page">
      <div className="quiz-top">
        <button className="bbtn" onClick={() => navigate('/tests')}>← Тесты</button>
        <div className="quiz-prog-wrap">
          <div className="quiz-prog-bar">
            <div className="quiz-prog-fill" style={{ width: progress + '%', background: sec.color }} />
          </div>
          <span className="quiz-counter">{cur + 1}/{qs.length}</span>
        </div>
        <span className="quiz-score-badge">✓ {score}</span>
      </div>

      <div className="quiz-card">
        <div className="quiz-q">{q.q}</div>
        <div className="quiz-opts">
          {q.opts.map((opt, i) => {
            let cls = 'qopt'
            if (ans) {
              if (i === q.a)   cls += ' correct'
              if (i === sel && i !== q.a) cls += ' wrong'
            } else if (i === sel) cls += ' sel'
            return (
              <div key={i} className={cls} onClick={() => choose(i)}>
                <span className="qopt-letter">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
              </div>
            )
          })}
        </div>
        {ans && q.exp && (
          <div className="quiz-exp">
            <span className="quiz-exp-icon">💡</span>
            <span>{q.exp}</span>
          </div>
        )}
        {ans && (
          <button className="quiz-next" onClick={next}>
            {cur + 1 >= qs.length ? 'Завершить' : 'Следующий →'}
          </button>
        )}
      </div>
    </div></div>
  )
}
