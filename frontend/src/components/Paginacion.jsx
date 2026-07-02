// Componente de paginación reutilizable — GPS Tracker Panamá
// Muestra controles de navegación entre páginas con info de resultados
import React from 'react';

export default function Paginacion({ pagina, totalItems, itemsPorPagina = 50, onChange }) {
  const totalPaginas = Math.ceil(totalItems / itemsPorPagina);
  if (totalPaginas <= 1) return null;

  const desde = (pagina - 1) * itemsPorPagina + 1;
  const hasta = Math.min(pagina * itemsPorPagina, totalItems);

  // Generar números de página visibles (máx 5)
  const paginas = [];
  let inicio = Math.max(1, pagina - 2);
  let fin = Math.min(totalPaginas, inicio + 4);
  if (fin - inicio < 4) inicio = Math.max(1, fin - 4);
  for (let i = inicio; i <= fin; i++) paginas.push(i);

  const btnBase = {
    padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s'
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 16px', borderTop: '1px solid #e5e7eb',
      flexWrap: 'wrap', gap: '8px'
    }}>
      {/* Info */}
      <span style={{ fontSize: '12px', color: '#6b7280' }}>
        Mostrando <strong>{desde}–{hasta}</strong> de <strong>{totalItems}</strong> registros
      </span>

      {/* Botones */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* Primera */}
        <button onClick={() => onChange(1)} disabled={pagina === 1}
          style={{ ...btnBase, background: pagina === 1 ? '#f9fafb' : 'white', color: pagina === 1 ? '#d1d5db' : '#374151' }}>
          «
        </button>
        {/* Anterior */}
        <button onClick={() => onChange(pagina - 1)} disabled={pagina === 1}
          style={{ ...btnBase, background: pagina === 1 ? '#f9fafb' : 'white', color: pagina === 1 ? '#d1d5db' : '#374151' }}>
          ‹
        </button>

        {/* Números */}
        {paginas.map(n => (
          <button key={n} onClick={() => onChange(n)}
            style={{
              ...btnBase,
              background: n === pagina ? '#4F6EF7' : 'white',
              color: n === pagina ? 'white' : '#374151',
              border: n === pagina ? '1px solid #4F6EF7' : '1px solid #d1d5db',
              minWidth: '34px'
            }}>
            {n}
          </button>
        ))}

        {/* Siguiente */}
        <button onClick={() => onChange(pagina + 1)} disabled={pagina === totalPaginas}
          style={{ ...btnBase, background: pagina === totalPaginas ? '#f9fafb' : 'white', color: pagina === totalPaginas ? '#d1d5db' : '#374151' }}>
          ›
        </button>
        {/* Última */}
        <button onClick={() => onChange(totalPaginas)} disabled={pagina === totalPaginas}
          style={{ ...btnBase, background: pagina === totalPaginas ? '#f9fafb' : 'white', color: pagina === totalPaginas ? '#d1d5db' : '#374151' }}>
          »
        </button>
      </div>
    </div>
  );
}
