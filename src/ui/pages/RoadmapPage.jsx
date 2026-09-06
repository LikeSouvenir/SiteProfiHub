import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../core/context/AppContext'
import { getLastBySource } from '../../core/progress'
import { SectionIcon, Icons } from '../components/Icons'

const checkMobile = () => window.innerWidth < 768

// ── helpers ──
const srDoneOf  = prog => prog.srDone  || []
const kbDoneOf  = prog => prog.done    || []
const doneOf    = (prog, mode) => mode === 'speedrun' ? srDoneOf(prog) : kbDoneOf(prog)



// ══════════════════════════════════════════════
//  LAYOUT BUILDER FOR SVG CANVAS (SNAKE ZIGZAG)
// ══════════════════════════════════════════════
function buildLayout(sections, cols = 4) {
  if (!sections || sections.length === 0) {
    return { positions: [], conns: [], totalW: 0, totalH: 0, NW: 204, NH: 96 }
  }
  const NW = 204, NH = 96, CW = 264, CH = 175, PAD = 50
  const COLS = Math.max(1, Math.min(cols, sections.length))

  const positions = sections.map((sec, i) => {
    const row = Math.floor(i / COLS)
    const isReverse = row % 2 === 1
    const col = isReverse ? (COLS - 1 - (i % COLS)) : (i % COLS)
    
    // Add organic stagger effect
    const yStagger = (i % 2 === 0) ? -15 : 15
    const xStagger = (row % 2 === 0) ? 0 : 20
    
    return {
      id: sec.id,
      index: i,
      row,
      col,
      isReverse,
      x: PAD + col * CW + xStagger,
      y: PAD + row * CH + yStagger,
    }
  })

  const conns = []
  for (let i = 0; i < positions.length - 1; i++) {
    const from = positions[i]
    const to   = positions[i + 1]

    let fromPt, toPt
    if (from.row === to.row) {
      if (!from.isReverse) {
        // Left to Right
        fromPt = { x: from.x + NW, y: from.y + NH / 2 }
        toPt   = { x: to.x,        y: to.y + NH / 2 }
      } else {
        // Right to Left
        fromPt = { x: from.x,      y: from.y + NH / 2 }
        toPt   = { x: to.x + NW,   y: to.y + NH / 2 }
      }
    } else {
      // Drop to Next Row
      fromPt = { x: from.x + NW / 2, y: from.y + NH }
      toPt   = { x: to.x + NW / 2,   y: to.y }
    }

    conns.push({
      fromId: from.id,
      toId: to.id,
      fromSec: sections[i],
      toSec: sections[i + 1],
      fromPt,
      toPt,
      isVertical: from.row !== to.row,
    })
  }

  const numRows = Math.ceil(sections.length / COLS)
  const totalW  = PAD * 2 + (COLS - 1) * CW + NW
  const totalH  = PAD * 2 + (numRows - 1) * CH + NH

  return { positions, conns, totalW, totalH, NW, NH }
}

// ══════════════════════════════════════════════
//  SVG CONNECTIONS (ANIMATED CURVES & PARTICLES)
// ══════════════════════════════════════════════
const RmConns = memo(({ conns, totalW, totalH, prog, mode }) => {
  return (
    <svg
      className="rmsvg"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: totalW,
        height: totalH,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {conns.map((conn, i) => {
        const { fromPt, toPt, isVertical, fromSec, toSec } = conn
        let d = ''
        if (isVertical) {
          const dy = toPt.y - fromPt.y
          d = `M ${fromPt.x} ${fromPt.y} C ${fromPt.x} ${fromPt.y + dy * 0.45}, ${toPt.x} ${toPt.y - dy * 0.45}, ${toPt.x} ${toPt.y}`
        } else {
          const dx = toPt.x - fromPt.x
          d = `M ${fromPt.x} ${fromPt.y} C ${fromPt.x + dx * 0.45} ${fromPt.y}, ${toPt.x - dx * 0.45} ${toPt.y}, ${toPt.x} ${toPt.y}`
        }

        const fromDone = doneOf(prog, mode).some(k => k.startsWith(fromSec.id + '/'))
        const toDone   = doneOf(prog, mode).some(k => k.startsWith(toSec.id + '/'))
        const isPathDone = fromDone && toDone
        const isPathActive = fromDone && !toDone
        const strokeColor = mode === 'speedrun'
          ? 'var(--go)'
          : (toSec.color || fromSec.color || 'var(--cr2)')

        return (
          <g key={i}>
            {/* Ambient neon glow */}
            <path
              d={d}
              stroke={strokeColor}
              strokeWidth={isPathDone ? 6 : 4}
              strokeLinecap="round"
              fill="none"
              opacity={isPathDone ? 0.28 : isPathActive ? 0.2 : 0.08}
              className="rm-conn-glow"
            />
            {/* Main connecting line without directional arrows */}
            <path
              d={d}
              stroke={strokeColor}
              strokeWidth={isPathDone ? 2.5 : 1.8}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={isPathDone ? undefined : '6 5'}
              opacity={isPathDone ? 0.95 : isPathActive ? 0.8 : 0.38}
              className={!isPathDone ? 'rm-conn-anim' : undefined}
              style={{ animation: `dashDraw 1.1s ease ${i * 0.07}s both` }}
            />
            {/* Animated glowing particle traveling along bridge */}
            <circle
              r={isPathDone ? 3 : 2.5}
              fill={strokeColor}
              opacity={isPathDone ? 0.9 : isPathActive ? 0.85 : 0.4}
            >
              <animateMotion
                dur={`${2.4 + (i % 3) * 0.5}s`}
                repeatCount="indefinite"
                path={d}
              />
            </circle>
          </g>
        )
      })}
    </svg>
  )
})

// ══════════════════════════════════════════════
//  SVG ROADMAP NODE CARD
// ══════════════════════════════════════════════
function RmNode({ sec, pos, NW, NH, prog, chapCounts, delay, mode }) {
  const navigate = useNavigate()
  const done   = doneOf(prog, mode).filter(k => k.startsWith(sec.id + '/')).length
  const total  = chapCounts[sec.id] || 0
  const pct    = total ? Math.round(done / total * 100) : 0
  const isDone = total > 0 && done >= total
  const path   = mode === 'speedrun' ? `/speedrun/section/${sec.id}` : `/section/${sec.id}`

  return (
    <div
      className={`rnode${isDone ? ' done' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: NW,
        minHeight: NH,
        position: 'absolute',
        animationDelay: delay + 'ms',
        '--ng': sec.color ? `${sec.color}55` : undefined,
      }}
      onClick={() => navigate(path)}
    >
      {isDone && <div className="rbadge">✓</div>}
      {mode === 'speedrun' && !isDone && (
        <div className="rbadge sr" style={{ color: 'var(--go)', borderColor: 'rgba(201,168,76,.4)' }}>⚡</div>
      )}
      <div className="rnode-top">
        <span style={{ color: sec.color }}><SectionIcon sec={sec} size={20} /></span>
        <span className="rnode-num">{String(pos.index + 1).padStart(2, '0')}</span>
      </div>
      <div className="rnode-title" style={{ color: sec.color }}>{sec.title}</div>
      <div className="rnode-bar">
        <div
          className="rnode-fill"
          style={{ width: pct + '%', background: mode === 'speedrun' ? 'var(--go)' : sec.color }}
        />
      </div>
      <div className="rnode-meta">
        {total ? `${done} / ${total} · ${pct}%` : 'Загрузка…'}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
//  DESKTOP SVG ROADMAP CANVAS
// ══════════════════════════════════════════════
function DesktopRoadmapCanvas({
  sections, chapCounts, totalChaps, prog, mode,
  setRoadmapMode, onToggleView,
}) {
  const navigate = useNavigate()
  const cvs = useRef(null)
  const drag = useRef(null)
  const touch = useRef(null)

  const [cols, setCols] = useState(() => (window.innerWidth >= 1200 ? 4 : 3))
  const [tr, setTr] = useState({ x: 0, y: 0, s: 0.85 })

  useEffect(() => {
    const handleResize = () => {
      setCols(window.innerWidth >= 1200 ? 4 : 3)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const layout = useMemo(() => buildLayout(sections, cols), [sections, cols])
  const { positions, conns, totalW, totalH, NW, NH } = layout

  const fitToScreen = useCallback(() => {
    if (!totalW || !totalH) return
    const vw = window.innerWidth
    const vh = window.innerHeight - 52
    const padX = 140
    const padY = 170
    const s = Math.min(1.2, Math.max(0.4, Math.min(
      (vw - padX) / totalW,
      (vh - padY) / totalH
    )))
    setTr({
      x: (vw - totalW * s) / 2,
      y: Math.max(70, (vh - totalH * s) / 2 + 10),
      s,
    })
  }, [totalW, totalH])

  useEffect(() => {
    fitToScreen()
  }, [fitToScreen])

  // Mouse pan handlers
  const onMD = e => {
    if (e.button !== 0) return
    drag.current = { x: e.clientX - tr.x, y: e.clientY - tr.y }
  }
  const onMM = e => {
    if (!drag.current) return
    setTr(t => ({ ...t, x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }))
  }
  const onMU = () => { drag.current = null }

  // Wheel zoom handler
  const onWheel = useCallback(e => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.08 : 0.92
    setTr(t => {
      const newScale = Math.max(0.3, Math.min(2.5, t.s * factor))
      const scaleRatio = newScale / t.s
      return {
        s: newScale,
        x: e.clientX - (e.clientX - t.x) * scaleRatio,
        y: e.clientY - (e.clientY - t.y) * scaleRatio,
      }
    })
  }, [])

  useEffect(() => {
    const el = cvs.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // Touch handlers for tablet / touchscreen
  const onTS = e => {
    if (e.touches.length === 1) {
      touch.current = { type: 'pan', x: e.touches[0].clientX - tr.x, y: e.touches[0].clientY - tr.y }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touch.current = {
        type: 'pinch',
        dist: Math.hypot(dx, dy),
        cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        initialScale: tr.s,
        initialX: tr.x,
        initialY: tr.y,
      }
    }
  }
  const onTM = e => {
    if (!touch.current) return
    if (e.touches.length === 1 && touch.current.type === 'pan') {
      setTr(t => ({ ...t, x: e.touches[0].clientX - touch.current.x, y: e.touches[0].clientY - touch.current.y }))
    } else if (e.touches.length === 2 && touch.current.type === 'pinch') {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const scaleRatio = dist / touch.current.dist
      const newScale = Math.max(0.3, Math.min(2.5, touch.current.initialScale * scaleRatio))
      const factor = newScale / touch.current.initialScale
      setTr({
        s: newScale,
        x: touch.current.cx - (touch.current.cx - touch.current.initialX) * factor,
        y: touch.current.cy - (touch.current.cy - touch.current.initialY) * factor,
      })
    }
  }
  const onTE = () => { touch.current = null }

  const lastKey = getLastBySource(prog, mode)
  const doneCount = doneOf(prog, mode).length
  const gPct = totalChaps > 0 ? Math.round(doneCount / totalChaps * 100) : 0

  return (
    <div className="rmpage">
      <div className="rmbg" />
      <div className="rmgrid" />



      {/* Overall Progress Badge */}
      {totalChaps > 0 && (
        <div className="rm-badge">
          Прогресс <b style={{ color: mode === 'speedrun' ? 'var(--go)' : 'var(--cr2)' }}>{gPct}%</b> · {doneCount}/{totalChaps}
        </div>
      )}

      {/* Empty State */}
      {sections.length === 0 && (
        <div className="rm-empty" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
          {mode === 'speedrun'
            ? 'Репозиторий Speedrun пока пуст — добавь конспекты в knowledge-base-spidran'
            : 'Загрузка разделов…'}
        </div>
      )}

      {/* Interactive SVG Canvas */}
      <div
        className="rmcanvas"
        ref={cvs}
        onMouseDown={onMD}
        onMouseMove={onMM}
        onMouseUp={onMU}
        onMouseLeave={onMU}
        onTouchStart={onTS}
        onTouchMove={onTM}
        onTouchEnd={onTE}
      >
        <div
          className="rminner"
          style={{
            transform: `translate(${tr.x}px, ${tr.y}px) scale(${tr.s})`,
            position: 'relative',
            width: totalW,
            height: totalH,
          }}
        >
          <RmConns conns={conns} totalW={totalW} totalH={totalH} prog={prog} mode={mode} />
          {sections.map((sec, i) => {
            const pos = positions.find(p => p.id === sec.id) || { x: 0, y: 0, index: i }
            return (
              <RmNode
                key={sec.id}
                sec={sec}
                pos={pos}
                NW={NW}
                NH={NH}
                prog={prog}
                chapCounts={chapCounts}
                delay={i * 55}
                mode={mode}
              />
            )
          })}
        </div>
      </div>

      {/* Zoom & View Controls */}
      <div className="rmctrl">
        <button className="rmc" onClick={() => setTr(t => ({ ...t, s: Math.min(2.5, t.s * 1.15) }))} title="Приблизить">＋</button>
        <button className="rmc" onClick={() => setTr(t => ({ ...t, s: Math.max(0.3, t.s * 0.85) }))} title="Отдалить">－</button>
        <button className="rmc" onClick={fitToScreen} title="По центру">⌖</button>
        {onToggleView && (
          <button className="rmc" onClick={onToggleView} title="Переключить на список">
            ▦
          </button>
        )}
      </div>

      {/* Hint */}
      <div className="rmhint">Перетаскивай · Скролл = зум · Клик = раздел</div>

      {/* Quick Resume Button */}
      {lastKey && (
        <div
          className="continue-btn"
          onClick={() => {
            const parts   = lastKey.split('/')
            const encoded = parts.slice(1).join('/').split('/').map(encodeURIComponent).join('/')
            const base    = mode === 'speedrun' ? '/speedrun/section' : '/section'
            navigate(parts.length === 1 ? `${base}/${parts[0]}` : `${base}/${parts[0]}/${encoded}`)
          }}
        >
          <div>
            <div className="continue-btn-t">Продолжить обучение</div>
            <div className="continue-btn-v">{lastKey.split('/').pop()}</div>
          </div>
          <div className="continue-btn-arrow">→</div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
//  DESKTOP SECTION CARD (GRID ITEM)
// ══════════════════════════════════════════════
function SectionCard({ sec, prog, chapCounts, delay, mode }) {
  const navigate = useNavigate()
  const done   = doneOf(prog, mode).filter(k => k.startsWith(sec.id + '/')).length
  const total  = chapCounts[sec.id] || 0
  const pct    = total ? Math.round(done / total * 100) : 0
  const isDone = total > 0 && done >= total
  const path   = mode === 'speedrun' ? `/speedrun/section/${sec.id}` : `/section/${sec.id}`

  return (
    <div
      className={`sec-card${isDone ? ' done' : ''}`}
      style={{ animationDelay: delay + 'ms', '--sec-color': sec.color }}
      onClick={() => navigate(path)}
    >
      <div className="sec-card-top">
        <span className="sec-card-ico" style={{ color: sec.color }}>
          <SectionIcon sec={sec} size={22} />
        </span>
        {isDone && <span className="sec-card-check">✓</span>}
        {mode === 'speedrun' && !isDone && <span className="sec-card-sr-badge">⚡</span>}
      </div>
      <div className="sec-card-title" style={{ color: sec.color }}>{sec.title}</div>
      <div className="sec-card-bar">
        <div className="sec-card-fill" style={{ width: pct + '%', background: sec.color }} />
      </div>
      <div className="sec-card-meta">
        {total ? `${done} / ${total} · ${pct}%` : 'Загрузка…'}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
//  DESKTOP GRID SECTIONS
// ══════════════════════════════════════════════
function DesktopSections({ sections, chapCounts, totalChaps, prog, mode, onToggleView }) {
  const navigate = useNavigate()
  const lastKey  = getLastBySource(prog, mode)

  return (
    <div className="sections-page">
      {sections.length === 0 && (
        <div className="rm-empty">
          {mode === 'speedrun'
            ? 'Репозиторий Speedrun пока пуст — добавь конспекты в knowledge-base-spidran'
            : 'Загрузка разделов…'}
        </div>
      )}

      <div className="sections-grid">
        {sections.map((sec, i) => (
          <SectionCard key={sec.id} sec={sec} prog={prog} chapCounts={chapCounts} delay={i * 40} mode={mode} />
        ))}
      </div>

      {lastKey && (
        <div className="continue-btn" onClick={() => {
          const parts   = lastKey.split('/')
          const encoded = parts.slice(1).join('/').split('/').map(encodeURIComponent).join('/')
          const base    = mode === 'speedrun' ? '/speedrun/section' : '/section'
          navigate(parts.length === 1 ? `${base}/${parts[0]}` : `${base}/${parts[0]}/${encoded}`)
        }}>
          <div>
            <div className="continue-btn-t">Продолжить обучение</div>
            <div className="continue-btn-v">{lastKey.split('/').pop()}</div>
          </div>
          <div className="continue-btn-arrow">→</div>
        </div>
      )}

      {onToggleView && (
        <div className="rmctrl">
          <button className="rmc" onClick={onToggleView} title="Переключить на граф">
            🗺
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
//  MOBILE SECTION CARD
// ══════════════════════════════════════════════
function MobileCard({ sec, prog, chapCounts, index, isLast, mode }) {
  const navigate = useNavigate()
  const done   = doneOf(prog, mode).filter(k => k.startsWith(sec.id + '/')).length
  const total  = chapCounts[sec.id] || 0
  const pct    = total ? Math.round(done / total * 100) : 0
  const isDone = total > 0 && done >= total
  const inProg = done > 0 && !isDone
  const path   = mode === 'speedrun' ? `/speedrun/section/${sec.id}` : `/section/${sec.id}`

  return (
    <div className="mob-rm-item" style={{ animationDelay: index * 40 + 'ms' }}>
      <div className="mob-rm-track">
        <div
          className={`mob-rm-dot${isDone ? ' done' : inProg ? ' active' : ''}`}
          style={{
            borderColor: isDone || inProg ? sec.color : undefined,
            background:  isDone ? sec.color : undefined,
          }}
        >
          {isDone
            ? <span style={{ color: '#fff', fontSize: '.6rem', fontWeight: 700 }}>✓</span>
            : <span style={{ color: sec.color, fontSize: '.7rem' }}><SectionIcon sec={sec} size={14} /></span>
          }
        </div>
        {!isLast && (
          <div className="mob-rm-line"
            style={{ background: isDone ? `linear-gradient(to bottom, ${sec.color}, var(--br))` : 'var(--br)' }}
          />
        )}
      </div>

      <div
        className={`mob-rm-card${isDone ? ' done' : inProg ? ' active' : ''}`}
        onClick={() => navigate(path)}
        style={{ '--card-color': sec.color }}
      >
        <div className="mob-rm-card-top">
          <span className="mob-rm-icon" style={{ color: sec.color }}><SectionIcon sec={sec} size={20} /></span>
          <span className="mob-rm-title" style={{ color: sec.color }}>{sec.title}</span>
          {isDone && <span className="mob-rm-badge-done">✓</span>}
        </div>
        <div className="mob-rm-bar">
          <div className="mob-rm-bar-fill" style={{
            width: pct + '%',
            background: mode === 'speedrun' ? 'var(--go)' : sec.color,
          }} />
        </div>
        <div className="mob-rm-footer">
          <span className="mob-rm-meta">{total ? `${done} из ${total} конспектов` : 'Загрузка…'}</span>
          <span className="mob-rm-pct" style={{ color: pct > 0 ? sec.color : 'var(--tx3)' }}>{pct}%</span>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
//  MOBILE LAYOUT
// ══════════════════════════════════════════════
function MobileRoadmap({ sections, chapCounts, totalChaps, prog, mode }) {
  const navigate = useNavigate()
  const lastKey  = getLastBySource(prog, mode)
  const isSr     = mode === 'speedrun'

  return (
    <div className="mob-rmpage">
      {lastKey && (
        <div className="mob-rm-continue" onClick={() => {
          const parts   = lastKey.split('/')
          const encoded = parts.slice(1).join('/').split('/').map(encodeURIComponent).join('/')
          const base    = isSr ? '/speedrun/section' : '/section'
          navigate(parts.length === 1 ? `${base}/${parts[0]}` : `${base}/${parts[0]}/${encoded}`)
        }}>
          <div className="mob-rm-continue-ico" style={isSr ? { background: 'var(--go)', color: '#000' } : undefined}>
            {isSr ? '⚡' : '▶'}
          </div>
          <div>
            <div className="mob-rm-continue-label">Продолжить</div>
            <div className="mob-rm-continue-title">{lastKey.split('/').pop()}</div>
          </div>
          <div className="mob-rm-continue-arrow">→</div>
        </div>
      )}

      {sections.length === 0 && (
        <div className="rm-empty">
          {isSr ? 'Репозиторий Speedrun пока пуст' : 'Загрузка…'}
        </div>
      )}

      <div className="mob-rm-list">
        {sections.map((sec, i) => (
          <MobileCard key={sec.id} sec={sec} prog={prog} chapCounts={chapCounts}
            index={i} isLast={i === sections.length - 1} mode={mode} />
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════
export default function RoadmapPage() {
  const {
    sections, chapCounts, totalChaps,
    prog,
  } = useApp()

  const [mobile, setMobile] = useState(checkMobile)
  const [desktopView, setDesktopView] = useState('map') // 'map' (SVG animated graph) or 'grid'

  useEffect(() => {
    const h = () => setMobile(checkMobile())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const mode = 'kb'
  const activeSections = sections
  const activeChapCounts = chapCounts
  const activeTotalChaps = totalChaps

  if (mobile) {
    return (
      <div className="rm-root page mobile">
        <MobileRoadmap
          sections={activeSections} chapCounts={activeChapCounts}
          totalChaps={activeTotalChaps} prog={prog} mode={mode}
        />
      </div>
    )
  }

  return (
    <div className="rm-root desktop-root">
      {desktopView === 'map' ? (
        <DesktopRoadmapCanvas
          sections={activeSections}
          chapCounts={activeChapCounts}
          totalChaps={activeTotalChaps}
          prog={prog}
          mode={mode}
          setRoadmapMode={() => {}}
          onToggleView={() => setDesktopView('grid')}
          viewMode={desktopView}
        />
      ) : (
        <div className="sections-page-wrap">
          <DesktopSections
            sections={activeSections}
            chapCounts={activeChapCounts}
            totalChaps={activeTotalChaps}
            prog={prog}
            mode={mode}
            onToggleView={() => setDesktopView('map')}
            viewMode={desktopView}
          />
        </div>
      )}
    </div>
  )
}
