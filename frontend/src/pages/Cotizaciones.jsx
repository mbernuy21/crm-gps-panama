// Módulo de Cotizaciones — GPS Tracker Panamá
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const COLORES_ESTADO = {
  borrador:  { bg: '#f3f4f6', color: '#6b7280', label: 'Borrador' },
  enviada:   { bg: '#dbeafe', color: '#2563eb', label: 'Enviada' },
  vista:     { bg: '#fef3c7', color: '#d97706', label: 'Vista' },
  aceptada:  { bg: '#dcfce7', color: '#16a34a', label: 'Aceptada' },
  rechazada: { bg: '#fee2e2', color: '#dc2626', label: 'Rechazada' },
};

export default function Cotizaciones() {
  const navigate = useNavigate();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    try {
      const r = await api.get('/cotizaciones');
      setCotizaciones(r.data.data || []);
    } catch { toast.error('Error cargando cotizaciones'); }
    finally { setCargando(false); }
  }

  async function cambiarEstado(id, estado) {
    try {
      await api.patch(`/cotizaciones/${id}/estado`, { estado });
      toast.success(`Estado actualizado: ${estado}`);
      cargar();
    } catch { toast.error('Error actualizando estado'); }
  }

  async function eliminar(id, numero) {
    if (!window.confirm(`¿Eliminar cotización #${numero}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/cotizaciones/${id}`);
      toast.success('Cotización eliminada');
      cargar();
    } catch { toast.error('Error eliminando cotización'); }
  }

  async function enviarEmailDesdeListado(cotizacion) {
    const email = cotizacion.email_cliente;
    if (!email) {
      toast.warning('Esta cotización no tiene email de cliente registrado');
      return;
    }
    try {
      await api.post(`/cotizaciones/${cotizacion.id}/email`, { email });
      toast.success(`📧 Email enviado a ${email}`);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error enviando email');
    }
  }

  async function descargarPDF(id, numero) {
    try {
      toast.info('Generando PDF...', { autoClose: 1500 });
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const resp = await fetch(`${apiUrl}/api/cotizaciones/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotizacion-${numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setTimeout(cargar, 1000); // refrescar estado
    } catch (err) {
      toast.error('Error descargando PDF: ' + err.message);
    }
  }

  function compartirWhatsApp(cotizacion) {
    const numero = cotizacion.whatsapp_cliente?.replace(/\D/g, '') || '';
    const telefono = numero.startsWith('507') ? numero : `507${numero}`;
    const items = (() => { try { return JSON.parse(cotizacion.items_json || '[]'); } catch { return []; } })();
    const lineas = items.map(i => `• ${i.nombre}: B/. ${parseFloat(i.precio || 0).toFixed(2)}`).join('\n');
    const mensaje = `Estimado/a ${cotizacion.nombre_cliente}, le hacemos llegar la Estimación #${cotizacion.numero} de GPS Tracker Panamá:\n\n${lineas}\n\n*Total: B/. ${parseFloat(cotizacion.total).toFixed(2)}*\n\nPara cualquier consulta estamos a su disposición. 📍 GPS Tracker Panamá`;
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
    cambiarEstado(cotizacion.id, 'enviada');
  }

  const filtradas = cotizaciones.filter(c => {
    const txt = filtro.toLowerCase();
    const coincide = !txt || c.nombre_cliente?.toLowerCase().includes(txt) || String(c.numero).includes(txt);
    const estado = !filtroEstado || c.estado === filtroEstado;
    return coincide && estado;
  });

  const stats = {
    total: cotizaciones.length,
    enviadas: cotizaciones.filter(c => c.estado === 'enviada').length,
    aceptadas: cotizaciones.filter(c => c.estado === 'aceptada').length,
    pendientes: cotizaciones.filter(c => ['borrador','enviada','vista'].includes(c.estado)).length,
  };

  if (cargando) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gris)' }}>Cargando...</div>;

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Cotizaciones</h1>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>{cotizaciones.length} cotizaciones registradas</p>
        </div>
        <button
          onClick={() => navigate('/cotizaciones/nueva')}
          style={{ background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
        >
          + Nueva Cotización
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total', valor: stats.total, color: '#4F6EF7', icono: '📄' },
          { label: 'Pendientes', valor: stats.pendientes, color: '#f59e0b', icono: '⏳' },
          { label: 'Enviadas', valor: stats.enviadas, color: '#2563eb', icono: '📤' },
          { label: 'Aceptadas', valor: stats.aceptadas, color: '#16a34a', icono: '✅' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: 'var(--radio)', padding: '16px', boxShadow: 'var(--sombra)', borderLeft: `4px solid ${k.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--gris)', fontWeight: 500 }}>{k.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 700 }}>{k.valor}</p>
              </div>
              <span style={{ fontSize: '24px' }}>{k.icono}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '16px', boxShadow: 'var(--sombra)', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          placeholder="🔍 Buscar por nombre o número..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }}
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }}
        >
          <option value=''>Todos los estados</option>
          {Object.entries(COLORES_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        {filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--gris)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
            <p style={{ fontWeight: 600 }}>No hay cotizaciones</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Crea tu primera cotización</p>
            <button
              onClick={() => navigate('/cotizaciones/nueva')}
              style={{ marginTop: '16px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
            >
              + Nueva Cotización
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--borde)' }}>
                  {['#', 'Cliente', 'Total', 'Estado', 'Fecha', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '12px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c, i) => {
                  const est = COLORES_ESTADO[c.estado] || COLORES_ESTADO.borrador;
                  const items = (() => { try { return JSON.parse(c.items_json || '[]'); } catch { return []; } })();
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--borde)', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--azul)' }}>#{c.numero}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{c.nombre_cliente}</div>
                        {c.email_cliente && <div style={{ fontSize: '11px', color: 'var(--gris)' }}>{c.email_cliente}</div>}
                        <div style={{ fontSize: '11px', color: 'var(--gris)' }}>{items.length} producto{items.length !== 1 ? 's' : ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>B/. {parseFloat(c.total).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={c.estado}
                          onChange={e => cambiarEstado(c.id, e.target.value)}
                          style={{ background: est.bg, color: est.color, border: 'none', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {Object.entries(COLORES_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--gris)', fontSize: '12px' }}>
                        {new Date(c.created_at).toLocaleDateString('es-PA')}
                        {c.fecha_vencimiento && <div style={{ fontSize: '11px' }}>Vence: {new Date(c.fecha_vencimiento).toLocaleDateString('es-PA')}</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => navigate(`/cotizaciones/${c.id}/editar`)}
                            title="Editar"
                            style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}
                          >✏️</button>
                          <button
                            onClick={() => descargarPDF(c.id, c.numero)}
                            title="Descargar PDF"
                            style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}
                          >📄</button>
                          {(c.whatsapp_cliente || c.telefono_cliente) && (
                            <button
                              onClick={() => compartirWhatsApp(c)}
                              title="Compartir por WhatsApp"
                              style={{ background: '#dcfce7', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}
                            >💬</button>
                          )}
                          {c.email_cliente && (
                            <button
                              onClick={() => enviarEmailDesdeListado(c)}
                              title={`Enviar email a ${c.email_cliente}`}
                              style={{ background: '#dbeafe', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}
                            >📧</button>
                          )}
                          {c.estado === 'aceptada' && !c.cliente_id && (
                            <button
                              onClick={() => convertirCliente(c.id)}
                              title="Convertir a cliente"
                              style={{ background: '#dbeafe', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#2563eb' }}
                            >👤 Cliente</button>
                          )}
                          <button
                            onClick={() => eliminar(c.id, c.numero)}
                            title="Eliminar"
                            style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  async function convertirCliente(id) {
    try {
      const r = await api.post(`/cotizaciones/${id}/convertir-cliente`);
      toast.success('✅ Cliente creado exitosamente');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error convirtiendo a cliente');
    }
  }
}
