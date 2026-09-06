import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { loadSectionsByKey, loadMetaByKey, invalidateRepoTree, loadQuizSections } from '../api'
import { loadProgress, saveProgress } from '../progress'
import { clearStaleCache, clearAllCache, saveSnapshot, loadSnapshot } from '../cache'

const AppContext = createContext(null)

// Общий ключ для режима Roadmap/Speedrun — используется и на странице обучения, и на странице прогресса
const MODE_KEY = 'atlant_roadmap_mode'

// ── Per-repo chapCounts loader ──
async function loadChapCounts(repoKey, sections, onProgress) {
  const counts = {}
  let done = 0
  await Promise.all(sections.map(async sec => {
    try {
      const m = await loadMetaByKey(repoKey, sec.id)
      counts[sec.id] = m.flat.length
    } catch { counts[sec.id] = 0 }
    done++
    onProgress?.(done, sections.length)
  }))
  return counts
}

export function AppProvider({ children }) {
  const [appState,      setAppState]      = useState('loading')
  const [loadProgress_, setLoadProgress]  = useState(0)
  const [loadStatus,    setLoadStatus]    = useState('Подключение…')
  const [loadError,     setLoadError]     = useState(null)
  const [syncStatus,    setSyncStatus]    = useState('idle') // 'idle' | 'syncing' | 'done'

  // KB
  const [sections,      setSections]      = useState([])
  const [chapCounts,    setChapCounts]    = useState({})

  // Speedrun
  const [speedrunSections,   setSpeedrunSections]   = useState([])
  const [speedrunChapCounts, setSpeedrunChapCounts] = useState({})

  // Cases
  const [casesSections,   setCasesSections]   = useState([])
  const [casesChapCounts, setCasesChapCounts] = useState({})

  const [prog,     setProg_]    = useState(loadProgress)

  // ── Общий режим Roadmap / Speedrun (используется RoadmapPage и ProgressPage) ──
  const [roadmapMode, setRoadmapMode_] = useState(() => localStorage.getItem(MODE_KEY) || 'kb')
  const setRoadmapMode = useCallback((m) => {
    setRoadmapMode_(m)
    try { localStorage.setItem(MODE_KEY, m) } catch {}
  }, [])
  const prevAchs = useRef(new Set(loadProgress().achievements || []))

  const setProg = useCallback(updater => {
    setProg_(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveProgress(next)
      return next
    })
  }, [])

  const totalChaps = Object.values(chapCounts).reduce((s, v) => s + v, 0)

  // ── Silent background refresh (won't flash loading screen) ──
  const silentRefresh = useCallback(async () => {
    setSyncStatus('syncing')
    try {
      // Parallel fetch all 3 repos
      const [kbSecs, srSecs, csSecs] = await Promise.all([
        loadSectionsByKey('kb').catch(() => []),
        loadSectionsByKey('speedrun').catch(() => []),
        loadSectionsByKey('cases').catch(() => []),
      ])

      setSections(kbSecs)
      setSpeedrunSections(srSecs)
      setCasesSections(csSecs)

      // Load chapCounts in parallel across all repos
      const [kbCounts, srCounts, csCounts] = await Promise.all([
        loadChapCounts('kb',       kbSecs),
        loadChapCounts('speedrun', srSecs),
        loadChapCounts('cases',    csSecs),
      ])

      setChapCounts(kbCounts)
      setSpeedrunChapCounts(srCounts)
      setCasesChapCounts(csCounts)

      // Save new snapshot
      saveSnapshot({
        kb: { sections: kbSecs, chapCounts: kbCounts },
        sr: { sections: srSecs, chapCounts: srCounts },
        cs: { sections: csSecs, chapCounts: csCounts },
      })

      setSyncStatus('done')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch {
      setSyncStatus('idle')
    }
  }, [])

  // ── Full boot ──
  const boot = useCallback(async (forceRefresh = false) => {
    clearStaleCache()

    // ── Fast path: snapshot exists and not force-refreshing ──
    if (!forceRefresh) {
      const snap = loadSnapshot()
      if (snap) {
        setSections(snap.kb?.sections || [])
        setChapCounts(snap.kb?.chapCounts || {})
        setSpeedrunSections(snap.sr?.sections || [])
        setSpeedrunChapCounts(snap.sr?.chapCounts || {})
        setCasesSections(snap.cs?.sections || [])
        setCasesChapCounts(snap.cs?.chapCounts || {})
        setAppState('ready')
        // Background refresh for latest data
        setTimeout(silentRefresh, 500)
        return
      }
    }

    // ── Slow path: no snapshot or force refresh ──
    if (forceRefresh) {
      invalidateRepoTree('kb')
      invalidateRepoTree('speedrun')
      invalidateRepoTree('cases')
      clearAllCache()
    }

    setAppState('loading')
    setLoadError(null)
    setLoadProgress(5)
    setLoadStatus('Получение структуры репозиториев…')

    try {
      // Parallel fetch sections of all 3 repos
      const [kbSecs, srSecs, csSecs] = await Promise.all([
        loadSectionsByKey('kb').catch(() => []),
        loadSectionsByKey('speedrun').catch(() => []),
        loadSectionsByKey('cases').catch(() => []),
      ])

      setSections(kbSecs)
      setSpeedrunSections(srSecs)
      setCasesSections(csSecs)

      const totalSecs = kbSecs.length + srSecs.length + csSecs.length
      let done = 0

      setLoadStatus(`Найдено разделов: ${totalSecs}. Загружаем структуру…`)
      setLoadProgress(20)

      const onProg = () => {
        done++
        setLoadProgress(20 + Math.round(done / totalSecs * 75))
        setLoadStatus(`Загружено: ${done}/${totalSecs}`)
      }

      // Parallel across all 3 repos
      const [kbCounts, srCounts, csCounts] = await Promise.all([
        loadChapCounts('kb',       kbSecs, onProg),
        loadChapCounts('speedrun', srSecs, onProg),
        loadChapCounts('cases',    csSecs, onProg),
      ])

      setChapCounts(kbCounts)
      setSpeedrunChapCounts(srCounts)
      setCasesChapCounts(csCounts)

      saveSnapshot({
        kb: { sections: kbSecs, chapCounts: kbCounts },
        sr: { sections: srSecs, chapCounts: srCounts },
        cs: { sections: csSecs, chapCounts: csCounts },
      })

      setLoadProgress(100)
      setLoadStatus('Готово!')
      setTimeout(() => setAppState('ready'), 300)
    } catch (e) {
      setLoadError('Не удалось загрузить данные с GitHub. Проверь соединение.\n' + e.message)
      setAppState('error')
    }
  }, [silentRefresh])

  // ── Manual sync (Header button) ──
  const syncNow = useCallback(async () => {
    if (syncStatus === 'syncing') return
    setSyncStatus('syncing')
    invalidateRepoTree('kb')
    invalidateRepoTree('speedrun')
    invalidateRepoTree('cases')
    await silentRefresh()
  }, [syncStatus, silentRefresh])

  useEffect(() => { boot() }, [boot])

  return (
    <AppContext.Provider value={{
      appState, loadProgress: loadProgress_, loadStatus, loadError,
      syncStatus, syncNow,
      // KB
      sections, chapCounts,
      // Speedrun
      speedrunSections, speedrunChapCounts,
      // Cases
      casesSections, casesChapCounts,
      totalChaps,
      prog, setProg,
      roadmapMode, setRoadmapMode,
      boot,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
