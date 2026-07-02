// Componente de paginación reutilizable con selector de items por página
import React from 'react';

export default function Paginacion({ pagina, totalItems, itemsPorPagina = 50, onChange, onChangeItems }) {
  const totalPaginas = Math.ceil(totalItems / itemsPorPagina);
  const desde = totalItems === 0 ? 0 : (pagina - 1) * itemsPorPagina + 1;
  const hasta = Math.min(pagina * itemsPorPagina, totalItems);

  // Generar números de página visibles (máx 5)
  const paginas = [];
  let inicio = Math.max(1, pagina - 2);
  let fin = Math.min(totalPaginas, inicio + 4);
  if (fin - inicio < 4) inicio = Math.max(1, fin - 4);
  for (let i = inicio; i <= fin; i++) paginas.push(i);

  const btnBase = {
    padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px', fontWeight: 500, background: 'white',
    transition: 'all 0.15s'
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 16px', borderTop: '1px solid #e5e7eb',
      flexWrap: 'wrap', gap: '8px', background: '#fafafa'
    }}>
      {/* Info + selector de items por página */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          Mostrando <strong>{desde}–{hasta}</strong> de <strong>{totalItems}</strong>
        </span>
        {onChangeItems && (
          <select
            value={itemsPorPagina}
            onChange={e => { onChangeItems(Number(e.target.value)); onChange(1); }}
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#374151' }}
          >
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
            <option value={500}>500 por página</option>
          </select>
        )}
      </div>

      {/* Botones de navegación — solo si hay más de 1 página */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={() => onChange(1)} disabled={pagina === 1}
            style={{ ...btnBase, color: pagina === 1 ? '#d1d5db' : '#374151' }}>«</button>
          <button onClick={() => onChange(pagina - 1)} disabled={pagina === 1}
            style={{ ...btnBase, color: pagina === 1 ? '#d1d5db' : '#374151' }}>‹</button>

          {paginas.map(n => (
            <button key={n} onClick={() => onChange(n)}
              style={{
                ...btnBase, minWidth: '34px',
                background: n === pagina ? '#4F6EF7' : 'white',
                color: n === pagina ? 'white' : '#374151',
                border: n === pagina ? '1px solid #4F6EF7' : '1px solid #d1d5db',
              }}>
              {n}
            </button>
          ))}

          <button onClick={() => onChange(pagina + 1)} disabled={pagina === totalPaginas}
            style={{ ...btnBase, color: pagina === totalPaginas ? '#d1d5db' : '#374151' }}>›</button>
          <button onClick={() => onChange(totalPaginas)} disabled={pagina === totalPaginas}
            style={{ ...btnBase, color: pagina === totalPaginas ? '#d1d5db' : '#374151' }}>»</button>
        </div>
      )}
    </div>
  );
}
