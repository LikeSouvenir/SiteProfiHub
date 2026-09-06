import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icons } from './Icons'
import { useApp } from '../../core/context/AppContext'

const isMobile = () => window.innerWidth < 768

export default function Header({ onSearch }) {
  const navigate = useNavigate()
  const { syncStatus, syncNow } = useApp()
  const [mobile, setMobile] = useState(isMobile)

  useEffect(() => {
    const h = () => setMobile(isMobile())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    if (mobile) return
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onSearch() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onSearch, mobile])

  const syncBtn = (
    <button
      className={`nbtn sync-btn${syncStatus === 'syncing' ? ' syncing' : syncStatus === 'done' ? ' sync-done' : ''}`}
      onClick={syncNow}
      title="Обновить данные"
      disabled={syncStatus === 'syncing'}
    >
      {Icons.sync}
    </button>
  )

  if (mobile) {
    return (
      <>
        <div className="mob-search-bar">
          <div className="logo" onClick={() => navigate('/roadmap')}>
            blockchain <span className="logo-s">champ</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <a href="https://t.me/SomeSouvenir" target="_blank" rel="noreferrer" className="mob-search-btn donate-btn" title="Задать вопрос">💬</a>
            {syncBtn}
            <button className="mob-search-btn" onClick={onSearch}>{Icons.search}</button>
          </div>
        </div>
        <nav className="mob-tabnav">
          <NavLink to="/roadmap"   className={({ isActive }) => `mob-tab${isActive ? ' active' : ''}`}>
            <span className="mob-tab-ico">{Icons.map}</span>
            <span className="mob-tab-lbl">Разделы</span>
          </NavLink>
          <NavLink to="/cases"     className={({ isActive }) => `mob-tab${isActive ? ' active' : ''}`}>
            <span className="mob-tab-ico">{Icons.cases}</span>
            <span className="mob-tab-lbl">Кейсы</span>
          </NavLink>
          <NavLink to="/tests"     className={({ isActive }) => `mob-tab${isActive ? ' active' : ''}`}>
            <span className="mob-tab-ico">{Icons.check}</span>
            <span className="mob-tab-lbl">Тесты</span>
          </NavLink>
          <NavLink to="/bookmarks" className={({ isActive }) => `mob-tab${isActive ? ' active' : ''}`}>
            <span className="mob-tab-ico">{Icons.bookmarkO}</span>
            <span className="mob-tab-lbl">Закладки</span>
          </NavLink>
          <NavLink to="/progress"  className={({ isActive }) => `mob-tab${isActive ? ' active' : ''}`}>
            <span className="mob-tab-ico">{Icons.bars}</span>
            <span className="mob-tab-lbl">Прогресс</span>
          </NavLink>
        </nav>
      </>
    )
  }

  return (
    <header className="hdr">
      <div className="logo" onClick={() => navigate('/roadmap')}>
        blockchain <span className="logo-s">champ</span>
      </div>
      <nav className="hright">
        <NavLink to="/roadmap"   className={({ isActive }) => `nbtn${isActive ? ' non' : ''}`}>{Icons.map} Roadmap</NavLink>
        <NavLink to="/cases"     className={({ isActive }) => `nbtn${isActive ? ' non' : ''}`}>{Icons.cases} Кейсы</NavLink>
        <NavLink to="/tests"     className={({ isActive }) => `nbtn${isActive ? ' non' : ''}`}>{Icons.check} Тесты</NavLink>
        <NavLink to="/bookmarks" className={({ isActive }) => `nbtn${isActive ? ' non' : ''}`}>{Icons.bookmarkO} Закладки</NavLink>
        <NavLink to="/progress"  className={({ isActive }) => `nbtn${isActive ? ' non' : ''}`}>{Icons.bars} Прогресс</NavLink>
        <a href="https://t.me/SomeSouvenir" target="_blank" rel="noreferrer" className="nbtn donate-nav-btn" title="Задать вопрос">
          <span className="donate-nav-ico">💬</span> Вопрос
        </a>
        {syncBtn}
        <button className="sbtn" onClick={onSearch}>
          {Icons.search}
          <span className="kbd">⌘K</span>
        </button>
      </nav>
    </header>
  )
}
