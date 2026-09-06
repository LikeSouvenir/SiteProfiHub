import React, { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../core/context/AppContext'
import { exportProgressJSON, importProgressJSON } from '../../core/progress'
import { SectionIcon, Icons } from '../components/Icons'

const TAB_KEY = 'atlant_progress_tab'

const MODE_OPTIONS = [
  { key: 'kb',       label: 'Roadmap',  icon: Icons.map,      color: 'var(--cr2)', bg: 'var(--crs)',           border: 'rgba(192,57,43,.4)',  glow: 'rgba(192,57,43,.22)' },
  { key: 'speedrun', label: 'Speedrun', icon: Icons.speedrun, color: 'var(--go)',  bg: 'rgba(201,168,76,.16)', border: 'rgba(201,168,76,.45)', glow: 'rgba(201,168,76,.3)' },
]

const TAB_OPTIONS = [
  { key: 'notes', label: 'Темы',  icon: Icons.map },
  { key: 'tests', label: 'Тесты', icon: Icons.check },
]

// ══════════════════════════════════════════════
//  Строка раздела (конспекты)
// ══════════════════════════════════════════════
function SectionRow({ sec, done, total, onClick, delay }) {
  const pct = total ? Math.round(done / total * 100) : 0
  return (
    <div className="pg-row" style={{ animationDelay: delay + 'ms' }} onClick={onClick}>
      <span className="pg-ico" style={{ color: sec.color }}><SectionIcon sec={sec} size={16} /></span>
      <div className="pg-info">
        <div className="pg-name">{sec.title}</div>
        <div className="pg-sbar">
          <div className="pg-sfill" style={{ width: pct + '%', background: sec.color }} />
        </div>
      </div>
      <div className="pg-pct" style={{ color: pct >= 80 ? 'var(--ok2)' : 'var(--tx3)' }}>{pct}%</div>
      <div className="pg-cnt">{done}/{total}</div>
    </div>
  )
}

// ══════════════════════════════════════════════
//  Вкладка «Темы»
// ══════════════════════════════════════════════
function NotesTab({ mode, navigate }) {
  const { sections, chapCounts, totalChaps, speedrunSections, speedrunChapCounts, prog } = useApp()

  const isSr        = mode === 'speedrun'
  const activeSecs   = isSr ? speedrunSections   : sections
  const activeCounts = isSr ? speedrunChapCounts : chapCounts
  const activeTotal  = isSr ? Object.values(speedrunChapCounts).reduce((s, v) => s + v, 0) : totalChaps
  const doneList     = isSr ? (prog.srDone || []) : (prog.done || [])
  const totalDone    = doneList.length
  const gPct         = activeTotal > 0 ? Math.round(totalDone / activeTotal * 100) : 0
  const basePath     = isSr ? '/speedrun/section' : '/section'

  return (
    <>
      <div className="pg-header">
        <div className="pg-stats-row">
          <div className="pg-stats-left">
            <span className="pg-stats-cnt">{totalDone} / {activeTotal || '—'} тем</span>
            <span className="pg-stats-sep">·</span>
            <span className={`pg-stats-pct${isSr ? ' sr' : ''}`}>{gPct}%</span>
          </div>
          {isSr && <span className="pg-stats-badge">⚡ Speedrun</span>}
        </div>
        <div className="pg-bar-wrap">
          <div className="pg-bar-fill" style={{
            width: gPct + '%',
            background: isSr ? 'linear-gradient(90deg, var(--go), #f5c842)' : undefined,
          }} />
        </div>
      </div>

      {activeSecs.length === 0 ? (
        <div className="pg-empty">
          {isSr ? 'Репозиторий Speedrun пока пуст' : 'Разделы загружаются…'}
        </div>
      ) : (
        <div className="pg-sections">
          {activeSecs.map((sec, i) => {
            const done  = doneList.filter(k => k.startsWith(sec.id + '/')).length
            const total = activeCounts[sec.id] || 0
            return (
              <SectionRow
                key={sec.id} sec={sec} done={done} total={total} delay={i * 30}
                onClick={() => navigate(`${basePath}/${sec.id}`)}
              />
            )
          })}
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════
//  Вкладка «Тесты» — единый список, без деления на Speedrun
// ══════════════════════════════════════════════
function TestsTab({ navigate }) {
  const { sections, prog } = useApp()

  const qs = prog.qs || {}
  const quizEntries = Object.entries(qs)
  const totalQuizzes = quizEntries.length
  const avgPct = totalQuizzes > 0
    ? Math.round(quizEntries.reduce((s, [, v]) => s + v.pct, 0) / totalQuizzes)
    : null

  const quizLabel = path => {
    const parts = path.split('/')
    return parts[parts.length - 1].replace(/-?quiz$/i, '').replace(/-/g, ' ') || path
  }
  const sectionOfQuiz = path => sections.find(s => s.id === path.split('/')[0])

  if (totalQuizzes === 0) {
    return <div className="pg-empty">Тесты ещё не пройдены</div>
  }

  return (
    <>
      <div className="pg-quiz-summary">
        <div className="pg-quiz-summary-item">
          <div className="pg-quiz-summary-val">{totalQuizzes}</div>
          <div className="pg-quiz-summary-lbl">пройдено</div>
        </div>
        <div className="pg-quiz-summary-div" />
        <div className="pg-quiz-summary-item">
          <div className="pg-quiz-summary-val" style={{ color: avgPct >= 70 ? 'var(--ok2)' : 'var(--cr2)' }}>
            {avgPct}%
          </div>
          <div className="pg-quiz-summary-lbl">средний балл</div>
        </div>
      </div>

      <div className="pg-quiz-list">
        {quizEntries.map(([path, res], i) => {
          const sec = sectionOfQuiz(path)
          const pct = res.pct
          const color = pct >= 80 ? 'var(--ok2)' : pct >= 50 ? 'var(--go)' : 'var(--cr2)'
          return (
            <div key={path} className="pg-quiz-row" style={{ animationDelay: i * 25 + 'ms' }}
              onClick={() => navigate(`/quiz/${encodeURIComponent(path)}`)}>
              {sec && (
                <span className="pg-ico" style={{ color: sec.color }}>
                  <SectionIcon sec={sec} size={14} />
                </span>
              )}
              <div className="pg-info">
                <div className="pg-name" style={{ textTransform: 'capitalize' }}>{quizLabel(path)}</div>
                <div className="pg-sbar">
                  <div className="pg-sfill" style={{ width: pct + '%', background: color }} />
                </div>
              </div>
              <div className="pg-pct" style={{ color }}>{pct}%</div>
              <div className="pg-cnt" style={{ minWidth: 42 }}>{res.score}/{res.total}</div>
              <div className="pg-quiz-date">{res.date}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}



function BackupRestoreSection({ prog, setProg }) {
  const fileInputRef = useRef(null)
  const [msg, setMsg] = useState(null)

  const showMsg = (text, isErr = false) => {
    setMsg({ text, isErr })
    setTimeout(() => setMsg(null), 3500)
  }

  const handleExport = () => {
    try {
      const json = exportProgressJSON(prog)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `atlant-progress-${date}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showMsg('Файл прогресса успешно сохранен!')
    } catch (e) {
      showMsg('Ошибка экспорта: ' + e.message, true)
    }
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result
        if (typeof text !== 'string') return
        const clean = importProgressJSON(text)
        setProg(clean)
        showMsg('Прогресс успешно импортирован!')
      } catch (err) {
        showMsg('Не удалось импортировать файл: ' + err.message, true)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="pg-backup-wrap">
      <div className="pg-ach-title">Синхронизация и перенос</div>
      <div className="pg-backup-card">
        <div className="pg-backup-desc">
          Вы можете выгрузить свой прогресс, закладки и достижения в файл, чтобы перенести их на телефон, другое устройство или сохранить резервную копию.
        </div>
        <div className="pg-backup-actions">
          <button className="pg-backup-btn export" onClick={handleExport} type="button">
            <span className="pg-backup-btn-ico">📥</span>
            <span>Экспорт в JSON</span>
          </button>
          <button className="pg-backup-btn import" onClick={handleImportClick} type="button">
            <span className="pg-backup-btn-ico">📤</span>
            <span>Импорт из JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        {msg && (
          <div className={`pg-backup-msg${msg.isErr ? ' err' : ' ok'}`}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProgressPage() {
  const { prog, setProg } = useApp()
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="pgpage">
        <NotesTab mode="kb" navigate={navigate} />
        <BackupRestoreSection prog={prog} setProg={setProg} />
      </div>
    </div>
  )
}
