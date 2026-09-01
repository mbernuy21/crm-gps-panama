import React from 'react';

/**
 * Componente de valoración con estrellas (1.0 a 5.0, pasos de 0.5)
 * Muestra estrellas llenas, medias y vacías según el valor.
 */
export default function Estrellas({ valor = 0, size = 'md', mostrarNumero = true, mostrarLabel = false }) {
  const v = Math.max(0, Math.min(5, parseFloat(valor) || 0));

  const fontSize = { sm: '13px', md: '16px', lg: '22px' }[size] || '16px';
  const numSize  = { sm: '11px', md: '13px', lg: '16px' }[size] || '13px';

  const color = v >= 4.5 ? '#16a34a'   // verde — excelente
              : v >= 3.5 ? '#4F6EF7'   // azul  — bueno
              : v >= 2.5 ? '#f59e0b'   // naranja — regular
              :             '#ef4444'; // rojo — malo

  const label = v >= 4.5 ? 'Excelente'
              : v >= 3.5 ? 'Bueno'
              : v >= 2.5 ? 'Regular'
              : v >= 1.5 ? 'Deficiente'
              :             'Sin historial';

  // Renderizar 5 posiciones
  const estrellas = [];
  for (let i = 1; i <= 5; i++) {
    if (v >= i) {
      // Estrella llena
      estrellas.push(<span key={i} style={{ color: '#f59e0b', fontSize }}>★</span>);
    } else if (v >= i - 0.5) {
      // Media estrella (★ con clip o usando unicode half-star)
      estrellas.push(
        <span key={i} style={{ position: 'relative', display: 'inline-block', fontSize }}>
          <span style={{ color: '#e5e7eb' }}>★</span>
          <span style={{
            position: 'absolute', left: 0, top: 0,
            width: '50%', overflow: 'hidden', color: '#f59e0b'
          }}>★</span>
        </span>
      );
    } else {
      // Estrella vacía
      estrellas.push(<span key={i} style={{ color: '#e5e7eb', fontSize }}>★</span>);
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ display: 'inline-flex', gap: '1px', lineHeight: 1 }}>
        {estrellas}
      </span>
      {mostrarNumero && (
        <span style={{ fontSize: numSize, fontWeight: 700, color, minWidth: '28px' }}>
          {v.toFixed(1)}
        </span>
      )}
      {mostrarLabel && (
        <span style={{
          fontSize: '10px', fontWeight: 600, color,
          background: `${color}18`, borderRadius: '20px',
          padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.04em'
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
