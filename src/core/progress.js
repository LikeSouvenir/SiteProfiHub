import { CFG } from './config'

const DEFAULTS = {
  done:        [],
  bookmarks:   [],
  qs:          {},
  achievements:[],
  last:        null,
  // Speedrun — хранится отдельно
  srDone:      [],
  srBookmarks: [],
  srLast:      null,
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(CFG.progressKey)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveProgress(data) {
  try { localStorage.setItem(CFG.progressKey, JSON.stringify(data)) } catch {}
}

// ── KB ──
export function markDone(prog, key) {
  if (prog.done.includes(key)) return prog
  return { ...prog, done: [...prog.done, key], last: key }
}

export function toggleBookmark(prog, key) {
  const bm = prog.bookmarks || []
  return bm.includes(key)
    ? { ...prog, bookmarks: bm.filter(b => b !== key) }
    : { ...prog, bookmarks: [...bm, key] }
}

// ── Speedrun ──
export function markSrDone(prog, key) {
  const srDone = prog.srDone || []
  if (srDone.includes(key)) return prog
  return { ...prog, srDone: [...srDone, key], srLast: key }
}

export function toggleSrBookmark(prog, key) {
  const bm = prog.srBookmarks || []
  return bm.includes(key)
    ? { ...prog, srBookmarks: bm.filter(b => b !== key) }
    : { ...prog, srBookmarks: [...bm, key] }
}

// ── Универсальные (по source) ──
export function toggleDone(prog, key) {
  const done = prog.done || []
  return done.includes(key)
    ? { ...prog, done: done.filter(k => k !== key) }
    : { ...prog, done: [...done, key], last: key }
}

export function toggleSrDone(prog, key) {
  const srDone = prog.srDone || []
  return srDone.includes(key)
    ? { ...prog, srDone: srDone.filter(k => k !== key) }
    : { ...prog, srDone: [...srDone, key], srLast: key }
}

export function markDoneBySource(prog, source, key) {
  if (source === 'speedrun') return markSrDone(prog, key)
  return markDone(prog, key)
}

export function toggleDoneBySource(prog, source, key) {
  if (source === 'speedrun') return toggleSrDone(prog, key)
  return toggleDone(prog, key)
}

export function toggleBookmarkBySource(prog, source, key) {
  if (source === 'speedrun') return toggleSrBookmark(prog, key)
  return toggleBookmark(prog, key)
}

export function isDoneBySource(prog, source, key) {
  if (source === 'speedrun') return (prog.srDone || []).includes(key)
  return (prog.done || []).includes(key)
}

export function isBookmarkedBySource(prog, source, key) {
  if (source === 'speedrun') return (prog.srBookmarks || []).includes(key)
  return (prog.bookmarks || []).includes(key)
}

export function getLastBySource(prog, source) {
  if (source === 'speedrun') return prog.srLast || null
  return prog.last || null
}

// ── Квизы ──
export function saveQuizResult(prog, qbPath, score, total) {
  return {
    ...prog,
    qs: {
      ...prog.qs,
      [qbPath]: {
        score,
        total,
        date: new Date().toLocaleDateString('ru'),
        pct:  Math.round(score / total * 100),
      },
    },
  }
}

// ── Резервное копирование и перенос ──
export function exportProgressJSON(prog) {
  const exportData = {
    app: 'ATLANT',
    version: CFG.cacheVersion,
    exportedAt: new Date().toISOString(),
    progress: prog,
  }
  return JSON.stringify(exportData, null, 2)
}

export function importProgressJSON(jsonString) {
  const parsed = JSON.parse(jsonString)
  const p = parsed.progress || parsed
  if (!p || typeof p !== 'object' || (!Array.isArray(p.done) && !Array.isArray(p.srDone))) {
    throw new Error('Некорректный формат файла резервной копии прогресса.')
  }
  const clean = {
    ...DEFAULTS,
    ...p,
    done: Array.isArray(p.done) ? p.done : [],
    bookmarks: Array.isArray(p.bookmarks) ? p.bookmarks : [],
    achievements: Array.isArray(p.achievements) ? p.achievements : [],
    qs: p.qs && typeof p.qs === 'object' ? p.qs : {},
    srDone: Array.isArray(p.srDone) ? p.srDone : [],
    srBookmarks: Array.isArray(p.srBookmarks) ? p.srBookmarks : [],
  }
  saveProgress(clean)
  return clean
}

