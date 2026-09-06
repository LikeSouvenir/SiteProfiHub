import { CFG } from './config'

// TTL по типу ключа
const TTL = {
  tree:    60 * 60 * 1000,        // 1ч — структура репо
  meta:     6 * 60 * 60 * 1000,   // 6ч — метаданные разделов
  chapter: 24 * 60 * 60 * 1000,   // 24ч — текст конспекта
  quiz:     6 * 60 * 60 * 1000,   // 6ч — вопросы
  snap:    60 * 60 * 1000,         // 1ч — снапшот структуры
  secs:    60 * 60 * 1000,         // 1ч — список секций
}

function ttlFor(key) {
  if (key.includes('_tree_'))  return TTL.tree
  if (key.includes('_meta_'))  return TTL.meta
  if (key.includes('_ch_'))    return TTL.chapter
  if (key.includes('_qp_') || key.includes('quiz')) return TTL.quiz
  if (key.includes('_snap'))   return TTL.snap
  if (key.includes('_secs_'))  return TTL.secs
  return TTL.meta
}

export function getCached(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p.v !== CFG.cacheVersion) { localStorage.removeItem(key); return null }
    if (Date.now() - (p.t || 0) > ttlFor(key)) { localStorage.removeItem(key); return null }
    return p.d
  } catch { return null }
}

export function setCached(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: CFG.cacheVersion, t: Date.now(), d: data }))
  } catch {}
}

export function clearStaleCache() {
  try {
    Object.keys(localStorage).forEach(k => {
      if (!k.startsWith('atlant_v2_')) return
      if (k === CFG.progressKey) return
      try {
        const p = JSON.parse(localStorage.getItem(k))
        if (!p) { localStorage.removeItem(k); return }
        if (p.v && p.v !== CFG.cacheVersion) { localStorage.removeItem(k); return }
        if (Date.now() - (p.t || 0) > ttlFor(k)) localStorage.removeItem(k)
      } catch { localStorage.removeItem(k) }
    })
  } catch {}
}

// Полная очистка кэша (кроме прогресса) — для ручного sync
export function clearAllCache() {
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('atlant_v2_') && k !== CFG.progressKey) {
        localStorage.removeItem(k)
      }
    })
  } catch {}
}

// Снапшот всей структуры — для мгновенного старта
const SNAP_KEY = 'atlant_v2_snap'
const SNAP_TTL = 60 * 60 * 1000  // 1ч

export function saveSnapshot(data) {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify({
      v: CFG.cacheVersion, t: Date.now(), d: data,
    }))
  } catch {}
}

export function loadSnapshot() {
  try {
    const raw = localStorage.getItem(SNAP_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || p.v !== CFG.cacheVersion) return null
    if (Date.now() - (p.t || 0) > SNAP_TTL) return null
    return p.d
  } catch { return null }
}
