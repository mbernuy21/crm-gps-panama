import React from 'react';

// Abre WhatsApp con mensaje prellenado en nueva pestaña
export default function WhatsAppButton({ numero, mensaje, label = 'WhatsApp', size = 'sm' }) {
  if (!numero) return null;

  function abrir() {
    const numeroLimpio = numero.replace(/\D/g, '');
    const url = `https://wa.me/${numeroLimpio}${mensaje ? '?text=' + encodeURIComponent(mensaje) : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const esSmall = size === 'sm';

  return (
    <button
      onClick={abrir}
      title={`Abrir WhatsApp: ${numero}`}
      style={{
        padding: esSmall ? '5px 10px' : '8px 16px',
        background: '#25D366',
        color: 'white',
        border: 'none',
        borderRadius: '7px',
        cursor: 'pointer',
        fontSize: esSmall ? '12px' : '13px',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        whiteSpace: 'nowrap'
      }}
    >
      💬 {label}
    </button>
  );
}
