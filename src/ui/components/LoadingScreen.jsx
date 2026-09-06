import React from 'react'

export default function LoadingScreen({ progress, status, error, onRetry }) {
  if (error) return (
    <div className="load-screen">
      <div className="load-box">
        <div className="load-logo">blockchain champ</div>
        <div style={{ color: 'var(--cr2)', marginBottom: 16, whiteSpace: 'pre-line', fontSize: '.84rem' }}>{error}</div>
        <button className="load-retry" onClick={onRetry}>Повторить</button>
      </div>
    </div>
  )

  return (
    <div className="load-screen">
      <div className="load-box">
        <div className="load-logo">blockchain champ</div>
        <div className="load-sub">Knowledge Hub & Roadmap</div>
        <div className="load-bar-wrap">
          <div className="load-bar-fill" style={{ width: progress + '%' }} />
        </div>
        <div className="load-status">{status}</div>
        <div className="load-pct">{progress}%</div>
      </div>
    </div>
  )
}
