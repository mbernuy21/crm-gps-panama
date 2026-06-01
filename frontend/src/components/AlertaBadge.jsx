import React from 'react';

const COLORES = {
  activo:     { bg: '#dcfce7', color: '#16a34a' },
  inactivo:   { bg: '#f3f4f6', color: '#6b7280' },
  moroso:     { bg: '#fef9c3', color: '#ca8a04' },
  suspendido: { bg: '#ffedd5', color: '#ea580c' },
  cortado:    { bg: '#fee2e2', color: '#dc2626' },
  nuevo:      { bg: '#dbeafe', color: '#2563eb' },
  contactado: { bg: '#ede9fe', color: '#7c3aed' },
  interesado: { bg: '#dcfce7', color: '#16a34a' },
  cerrado:    { bg: '#dcfce7', color: '#15803d' },
  perdido:    { bg: '#fee2e2', color: '#dc2626' },
  asignado:   { bg: '#dcfce7', color: '#16a34a' },
  disponible: { bg: '#dbeafe', color: '#2563eb' },
  devuelto:   { bg: '#f3f4f6', color: '#6b7280' },
  duplicado:  { bg: '#fef3c7', color: '#d97706' },
  borrador:   { bg: '#f3f4f6', color: '#6b7280' },
  enviada:    { bg: '#dbeafe', color: '#2563eb' },
  pagada:     { bg: '#dcfce7', color: '#16a34a' },
  anulada:    { bg: '#fee2e2', color: '#dc2626' },
};

export default function AlertaBadge({ estado, texto }) {
  const estilos = COLORES[estado] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '11.5px',
      fontWeight: 600,
      background: estilos.bg,
      color: estilos.color,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap'
    }}>
      {texto || estado}
    </span>
  );
}
