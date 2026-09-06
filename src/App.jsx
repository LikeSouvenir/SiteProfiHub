import React, { useState, useCallback } from 'react'
import { AppProvider } from './core/context/AppContext'
import AppRouter from './core/routing/AppRouter'
import Header from './ui/components/Header'
import SearchModal from './ui/components/SearchModal'
import LoadingScreen from './ui/components/LoadingScreen'
import { useApp } from './core/context/AppContext'

function Inner() {
  const { appState, loadProgress, loadStatus, loadError, boot } = useApp()
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch  = useCallback(() => setSearchOpen(true),  [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  if (appState === 'loading') return <LoadingScreen progress={loadProgress} status={loadStatus} />
  if (appState === 'error')   return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  height:'100vh', gap:16, padding:24, textAlign:'center', color:'var(--tx2)', fontFamily:'var(--fm)' }}>
      <div style={{ fontSize:'1.1rem', color:'var(--cr2)' }}>{loadError}</div>
      <button onClick={boot} style={{ padding:'10px 24px', background:'var(--cr)', color:'#fff',
                                      border:'none', borderRadius:8, cursor:'pointer', fontFamily:'var(--fm)' }}>
        Повторить
      </button>
    </div>
  )

  return (
    <>
      <Header onSearch={openSearch} />
      <AppRouter />
      {searchOpen && <SearchModal onClose={closeSearch} />}
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  )
}
