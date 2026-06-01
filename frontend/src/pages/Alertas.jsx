import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import WhatsAppButton from '../components/WhatsAppButton';

export default function Alertas() {
  const [alertas, setAlertas] = useState(null);
  const [plantillas, setPlantillas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('proximos');

  useEffect(() => {
    Promise.all([
      api.get('/alertas'),
      api.get('/plantillas')
    ]).then(([a, p]) => {
      setAlertas(a.data.data);
      setPlantillas(p.data.data);
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  async function ejecutarAlertas() {
    try {
      const r = await api.post('/alertas/ejecutar');
      toast.success(r.data.message);
      const r2 = await api.get('/alertas');
      setAlertas(r2.data.data);
    } catch (err) {
      toast.error('Error ejecutando alertas');
    }
  }

  async function enviarEmailAlerta(clienteId, tipo) {
    try {
      await api.post('/alertas/email', { tipo, cliente_id: clienteId });
      toast.success('Email de alerta enviado');
    } catch (err) {
      toast.error('Error enviando email');
    }
  }

  function generarLinkWA(cliente, tipoPlantilla) {
    const plantilla = plantillas.find(p => p.tipo === tipoPlantilla);
    if (!plantilla) return null;

    let msg = plantilla.contenido;
    msg = msg.replaceAll('[nombre_cliente]', cliente.cliente_nombre || '');
    msg = msg.replaceAll('[monto]', parseFloat(cliente.monto_total || 0).toFixed(2));
    msg = msg.replaceAll('[dias_mora]', cliente.dias_mora || '0');
    msg = msg.replaceAll('[fecha_vencimiento]', cliente.fecha_proximo_pago
      ? new Date(cliente.fecha_proximo_pago).toLocaleDateString('es-PA')
      : '');
    msg = msg.replaceAll('[empresa]', 'GPS Tracker Panamá');
    return msg;
  }

  if (cargando) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gris)' }}>Cargando alertas...</div>;
  if (!alertas) return null;

  const tabs = [
    { key: 'proximos', label: 'Próximos a vencer', data: alertas.proximos_a_vencer, color: '#f59e0b' },
    { key: 'vencidos', label: 'Vencidos hoy', data: alertas.vencidos_hoy, color: '#ef4444' },
    { key: 'morosos', label: 'Morosos', data: alertas.morosos, color: '#dc2626' },
    { key: 'suspendidos', label: 'Suspendidos', data: alertas.suspendidos, color: '#6b7280' },
  ];

  const tabActual = tabs.find(t => t.key === tab);

  function tipoPlantilla(key) {
    if (key === 'proximos' || key === 'vencidos') return 'recordatorio';
    if (key === 'morosos') return 'mora';
    if (key === 'suspendidos') return 'suspension';
    return 'recordatorio';
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Alertas y flujo de mora</h1>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>
            Total: {alertas.resumen.total} alertas pendientes
          </p>
        </div>
        <button onClick={ejecutarAlertas}
          style={{ padding: '8px 18px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          ⚡ Actualizar estados
        </button>
      </div>

      {/* Resumen cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {tabs.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)}
            style={{ background: 'white', borderRadius: 'var(--radio)', padding: '16px', boxShadow: 'var(--sombra)', cursor: 'pointer', borderLeft: `4px solid ${t.color}`, opacity: tab === t.key ? 1 : 0.75 }}>
            <p style={{ fontSize: '12px', color: 'var(--gris)', fontWeight: 500, marginBottom: '4px' }}>{t.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: t.color }}>{t.data?.length || 0}</p>
          </div>
        ))}
      </div>

      {/* Tabla del tab activo */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--borde)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '6px 14px', background: tab === t.key ? t.color : 'white', color: tab === t.key ? 'white' : '#374151', border: `1px solid ${t.color}`, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: tab === t.key ? 600 : 400 }}>
              {t.label} ({t.data?.length || 0})
            </button>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {['Cliente', 'Monto', 'Fecha pago / Vence', 'Días', 'Estado cliente', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {!tabActual?.data?.length ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>
                ✅ Sin alertas en esta categoría
              </td></tr>
            ) : tabActual.data.map((a, i) => (
              <tr key={a.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{a.cliente_nombre}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>B/. {parseFloat(a.monto_total).toFixed(2)}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px' }}>
                  {new Date(a.fecha_proximo_pago).toLocaleDateString('es-PA')}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: tabActual.color }}>
                  {a.dias_mora > 0 ? `${a.dias_mora}d mora` : `${a.dias_para_vencer}d`}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px', textTransform: 'capitalize', color: 'var(--gris)' }}>
                  {a.cliente_estado}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {a.whatsapp && (
                      <WhatsAppButton
                        numero={a.whatsapp}
                        mensaje={generarLinkWA(a, tipoPlantilla(tab))}
                        label="WA"
                        size="sm"
                      />
                    )}
                    {a.cliente_id && (
                      <button onClick={() => enviarEmailAlerta(a.cliente_id, tipoPlantilla(tab))}
                        style={{ padding: '4px 8px', background: 'var(--azul-light)', color: 'var(--azul)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                        📧 Email
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
