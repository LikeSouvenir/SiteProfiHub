import React from 'react'

export default function InfoModal({ onClose }) {
  return (
    <div className="srch-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="srch-modal" style={{ top: 'auto', padding: '24px', maxWidth: '500px', cursor: 'default' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--tx)', fontFamily: 'var(--fs)' }}>О проекте</h2>
          <button className="srch-esc" onClick={onClose}>ESC</button>
        </div>
        <div style={{ color: 'var(--tx2)', lineHeight: '1.5', fontSize: '0.9rem', marginBottom: '24px' }}>
          <p style={{ marginBottom: '16px' }}>
            Добро пожаловать в <strong>blockchain champ</strong>! Это образовательная платформа для подготовки к чемпионату по блокчейн-технологиям. 
            Здесь вы найдете конспекты, разборы кейсов прошлых лет и тесты для проверки знаний.
          </p>
          <p>
            Материалы загружаются напрямую из открытого репозитория GitHub. Прогресс обучения сохраняется локально в вашем браузере.
          </p>
        </div>
        
        <div style={{ borderTop: '1px solid var(--br)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Сайт сделал:</span>
            <a href="https://t.me/DmitroZybroni" target="_blank" rel="noreferrer" style={{ color: 'var(--cr2)', textDecoration: 'none', fontWeight: 'bold' }}>@DmitroZybroni</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Задать вопрос / Связь:</span>
            <a href="https://t.me/SomeSouvenir" target="_blank" rel="noreferrer" style={{ color: 'var(--cr2)', textDecoration: 'none', fontWeight: 'bold' }}>@SomeSouvenir</a>
          </div>
        </div>
      </div>
    </div>
  )
}
