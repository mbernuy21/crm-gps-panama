import React, { useState } from 'react';
import api from '../services/api';

export default function ExportButton({ modulo, filtros = {}, label = 'Exportar Excel' }) {
  const [cargando, setCargando] = useState(false);

  async function exportar() {
    setCargando(true);
    try {
      const params = new URLSearchParams(filtros).toString();
      const url = `/exportar/${modulo}${params ? '?' + params : ''}`;

      const resp = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${modulo}-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
    } catch (err) {
      console.error('Error exportando:', err);
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      onClick={exportar}
      disabled={cargando}
      style={{
        padding: '8px 16px',
        background: '#16a34a',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: cargando ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        opacity: cargando ? 0.7 : 1
      }}
    >
      {cargando ? '⏳ Exportando...' : `📥 ${label}`}
    </button>
  );
}
