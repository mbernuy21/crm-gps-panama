// Modal de confirmación reutilizable — reemplaza window.confirm()
import React from 'react';

export default function ModalConfirmar({ visible, titulo, mensaje, onConfirmar, onCancelar, peligro = true }) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '32px',
        maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        {/* Ícono */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '48px' }}>{peligro ? '⚠️' : '❓'}</span>
        </div>

        {/* Título */}
        <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: '#111827' }}>
          {titulo || '¿Estás seguro?'}
        </h2>

        {/* Mensaje */}
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', marginBottom: '28px', lineHeight: 1.5 }}>
          {mensaje || 'Esta acción no se puede deshacer.'}
        </p>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1, padding: '11px', background: '#f3f4f6', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', color: '#374151'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              flex: 1, padding: '11px',
              background: peligro ? '#dc2626' : '#4F6EF7',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px', color: 'white'
            }}
          >
            {peligro ? 'Sí, eliminar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
