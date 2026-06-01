import React from 'react';

export default function Navbar({ onToggleSidebar }) {
  const usuarioStr = localStorage.getItem('usuario');
  const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;

  return (
    <header style={{
      height: '56px',
      background: 'white',
      borderBottom: '1px solid var(--borde)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--sombra)'
    }}>
      <button
        onClick={onToggleSidebar}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          padding: '4px 8px',
          borderRadius: '6px',
          color: '#374151'
        }}
        title="Abrir/cerrar menú"
      >
        ☰
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--gris)' }}>
          {usuario?.nombre || 'Administrador'}
        </span>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--azul)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '13px'
        }}>
          {usuario?.nombre?.charAt(0)?.toUpperCase() || 'A'}
        </div>
      </div>
    </header>
  );
}
