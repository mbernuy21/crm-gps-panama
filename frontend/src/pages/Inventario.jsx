import React, { useEffect, useState } from 'react';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';
import ExportButton from '../components/ExportButton';

function KpiInv({ icono, label, valor, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '18px', boxShadow: 'var(--sombra)', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--gris)', fontWeight: 500, marginBottom: '4px' }}>{label}</p>
          <p style={{ fontSize: '24px', fontWeight: 700 }}>{valor}</p>
        </div>
        <span style={{ fontSize: '26px' }}>{icono}</span>
      </div>
    </div>
  );
}

export default function Inventario() {
  const [inv, setInv] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('disponibles');

  useEffect(() => {
    api.get('/inventario').then(r => { setInv(r.data.data); setCargando(false); }).catch(() => setCargando(false));
  }, []);

  if (cargando) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gris)' }}>Cargando...</div>;
  if (!inv) return null;

  const { totales, disponibles, alertas } = inv;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Inventario</h1>
        <ExportButton modulo="inventario" />
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <KpiInv icono="📡" label="Total equipos" valor={totales.total_equipos} color="var(--azul)" />
        <KpiInv icono="✅" label="Asignados" valor={totales.equipos_asignados} color="#22c55e" />
        <KpiInv icono="📦" label="Disponibles" valor={totales.equipos_disponibles} color="#3b82f6" />
        <KpiInv icono="❌" label="Perdidos" valor={totales.equipos_perdidos} color="#ef4444" />
        <KpiInv icono="⚠️" label="Duplicados/Corte" valor={totales.equipos_duplicados} color="#f59e0b" />
        <KpiInv
          icono="💰"
          label="Valor total inventario"
          valor={`B/. ${parseFloat(totales.valor_total_inventario || 0).toLocaleString('es-PA', { minimumFractionDigits: 2 })}`}
          color="var(--azul)"
        />
        <KpiInv
          icono="📉"
          label="Pérdidas (perdidos)"
          valor={`B/. ${parseFloat(totales.valor_perdidas || 0).toFixed(2)}`}
          color="#ef4444"
        />
      </div>

      {/* Alertas si hay duplicados o perdidos */}
      {alertas.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 'var(--radio)', padding: '14px 18px', marginBottom: '20px' }}>
          <p style={{ fontWeight: 600, color: '#92400e', fontSize: '13px', marginBottom: '8px' }}>
            ⚠️ {alertas.length} equipo(s) requieren atención (perdidos o duplicados)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {alertas.map(a => (
              <span key={a.id} style={{ fontSize: '12px', background: 'white', border: '1px solid #fcd34d', borderRadius: '6px', padding: '4px 10px' }}>
                {a.serial_gps} — <strong>{a.estado}</strong> {a.cliente_nombre ? `(${a.cliente_nombre})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {['disponibles', 'alertas'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 16px', background: tab === t ? 'var(--azul)' : 'white', color: tab === t ? 'white' : '#374151', border: '1px solid var(--borde)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: tab === t ? 600 : 400, textTransform: 'capitalize' }}>
            {t === 'disponibles' ? `Disponibles (${disponibles.length})` : `Alertas (${alertas.length})`}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {['Serial GPS', 'SIM Card', 'Tipo', 'Modalidad', 'Valor (B/.)', 'Estado', ...(tab === 'alertas' ? ['Cliente'] : [])].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {(tab === 'disponibles' ? disponibles : alertas).length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--gris)' }}>Sin datos</td></tr>
            ) : (tab === 'disponibles' ? disponibles : alertas).map((d, i) => (
              <tr key={d.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{d.serial_gps}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.simcard || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.tipo_producto}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.modalidad}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>B/. {parseFloat(d.valor_equipo_usd || 0).toFixed(2)}</td>
                <td style={{ padding: '10px 14px' }}><AlertaBadge estado={d.estado} /></td>
                {tab === 'alertas' && (
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.cliente_nombre || '—'}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
