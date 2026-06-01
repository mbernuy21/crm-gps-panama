import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';
import WhatsAppButton from '../components/WhatsAppButton';

const ESTADOS = ['activo', 'inactivo', 'moroso', 'suspendido', 'cortado'];

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [tab, setTab] = useState('dispositivos');
  const [cargando, setCargando] = useState(true);

  function cargar() {
    api.get(`/clientes/${id}`).then(r => {
      setCliente(r.data.data);
      setCargando(false);
    }).catch(() => navigate('/clientes'));
  }

  useEffect(() => { cargar(); }, [id]);

  async function cambiarEstado(nuevoEstado) {
    if (!window.confirm(`¿Cambiar estado a "${nuevoEstado}"?`)) return;
    try {
      await api.put(`/clientes/${id}/estado`, { estado: nuevoEstado });
      toast.success(`Estado actualizado a: ${nuevoEstado}`);
      cargar();
    } catch (err) {
      toast.error('Error cambiando estado');
    }
  }

  if (cargando) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gris)' }}>Cargando...</div>;
  if (!cliente) return null;

  const tabStyle = (activo) => ({
    padding: '8px 18px',
    background: activo ? 'var(--azul)' : 'white',
    color: activo ? 'white' : '#374151',
    border: '1px solid var(--borde)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: activo ? 600 : 400
  });

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '24px' }}>
        <button onClick={() => navigate('/clientes')}
          style={{ padding: '7px 12px', background: 'white', border: '1px solid var(--borde)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          ← Volver
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{cliente.nombre_razon_social}</h1>
            <AlertaBadge estado={cliente.estado} />
          </div>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>
            {cliente.tipo_cliente} · RUC: {cliente.ruc || 'N/A'} · {cliente.provincia || 'Sin provincia'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {cliente.whatsapp && <WhatsAppButton numero={cliente.whatsapp} label={cliente.whatsapp} />}
          <select
            value={cliente.estado}
            onChange={e => cambiarEstado(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Info general */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Teléfono', valor: cliente.telefono_principal || '—' },
          { label: 'Email', valor: cliente.email || '—' },
          { label: 'Dirección', valor: cliente.direccion || '—' },
          { label: 'Dispositivos activos', valor: cliente.dispositivos?.length || 0 },
        ].map(item => (
          <div key={item.label} style={{ background: 'white', borderRadius: 'var(--radio)', padding: '14px 16px', boxShadow: 'var(--sombra)' }}>
            <p style={{ fontSize: '11px', color: 'var(--gris)', fontWeight: 500, marginBottom: '4px' }}>{item.label}</p>
            <p style={{ fontSize: '13px', fontWeight: 600 }}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['dispositivos', 'pagos', 'facturas'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({cliente[t]?.length || 0})
          </button>
        ))}
        {cliente.notas_internas && (
          <button onClick={() => setTab('notas')} style={tabStyle(tab === 'notas')}>
            Notas internas
          </button>
        )}
      </div>

      {/* Contenido de tab */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        {tab === 'dispositivos' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['Serial GPS', 'SIM Card', 'Placa', 'Modelo', 'Tipo', 'Estado'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {cliente.dispositivos?.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--gris)' }}>Sin dispositivos asignados</td></tr>
              ) : cliente.dispositivos?.map(d => (
                <tr key={d.id}>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{d.serial_gps}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.simcard || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.placa_vehiculo || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.modelo_auto || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.tipo_producto}</td>
                  <td style={{ padding: '10px 14px' }}><AlertaBadge estado={d.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'pagos' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['Fecha', 'Monto', 'Método', 'Registrado por', 'Notas'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {cliente.pagos?.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--gris)' }}>Sin pagos registrados</td></tr>
              ) : cliente.pagos?.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: '10px 14px', fontSize: '13px' }}>{new Date(p.fecha_pago).toLocaleDateString('es-PA')}</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>B/. {parseFloat(p.monto).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.metodo}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.registrado_por_nombre || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.notas || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'facturas' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['Número', 'Fecha', 'Total', 'Estado'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {cliente.facturas?.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--gris)' }}>Sin facturas</td></tr>
              ) : cliente.facturas?.map(f => (
                <tr key={f.id}>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{f.numero_factura}</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px' }}>{new Date(f.fecha_emision).toLocaleDateString('es-PA')}</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>B/. {parseFloat(f.total).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px' }}><AlertaBadge estado={f.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'notas' && (
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap' }}>
              {cliente.notas_internas}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
