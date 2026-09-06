import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const RoadmapPage   = lazy(() => import('../../ui/pages/RoadmapPage'))
const SectionHub    = lazy(() => import('../../ui/pages/SectionHub'))
const ChapterPage   = lazy(() => import('../../ui/pages/ChapterPage'))
const TestsHub      = lazy(() => import('../../ui/pages/TestsHub'))
const QuizPage      = lazy(() => import('../../ui/pages/QuizPage'))
const ProgressPage  = lazy(() => import('../../ui/pages/ProgressPage'))
const BookmarksPage = lazy(() => import('../../ui/pages/BookmarksPage'))
const CasesPage     = lazy(() => import('../../ui/pages/CasesPage'))

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 'calc(100vh - 52px)', color: 'var(--tx3)',
      fontFamily: 'var(--fm)', fontSize: '.78rem', letterSpacing: '.1em',
    }}>
      ЗАГРУЗКА…
    </div>
  )
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/"  element={<Navigate to="/roadmap" replace />} />

        {/* ── KB Roadmap ── */}
        <Route path="/roadmap"        element={<RoadmapPage />} />
        <Route path="/section/:sId"   element={<SectionHub source="kb" />} />
        <Route path="/section/:sId/*" element={<ChapterPage source="kb" />} />

        {/* ── Cases ── */}
        <Route path="/cases"          element={<CasesPage />} />
        <Route path="/cases/:sId"     element={<SectionHub source="cases" />} />
        <Route path="/cases/:sId/*"   element={<ChapterPage source="cases" />} />

        {/* ── Общие ── */}
        <Route path="/tests"          element={<TestsHub />} />
        <Route path="/quiz/*"         element={<QuizPage />} />
        <Route path="/bookmarks"      element={<BookmarksPage />} />
        <Route path="/progress"       element={<ProgressPage />} />
        <Route path="*"               element={<Navigate to="/roadmap" replace />} />
      </Routes>
    </Suspense>
  )
}
