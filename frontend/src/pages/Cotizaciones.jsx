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

// ── Modal de vista previa de cotización ──────────────────────────────────────
function ModalPreview({ cotizacion, onCerrar, onDescargar, onWhatsApp, onEmail }) {
  if (!cotizacion) return null;
  const items = (() => { const r = cotizacion.items_json; if (Array.isArray(r)) return r; if (typeof r === 'string') { try { return JSON.parse(r); } catch {} } return []; })();
  const subtotal = parseFloat(cotizacion.subtotal) || 0;
  const descuento = parseFloat(cotizacion.descuento_global) || 0;
  const total = parseFloat(cotizacion.total) || 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', overflowY: 'auto', padding: '24px 16px'
    }} onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '760px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Barra superior con acciones */}
        <div style={{ background: '#4F6EF7', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>
            Vista Previa — Estimación #{String(cotizacion.numero).padStart(4, '0')}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={onDescargar}
              style={{ background: 'white', color: '#4F6EF7', border: 'none', borderRadius: '8px', padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⬇ Descargar PDF
            </button>
            {(cotizacion.whatsapp_cliente || cotizacion.telefono_cliente) && (
              <button onClick={onWhatsApp}
                style={{ background: '#25d366', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                WhatsApp
              </button>
            )}
            {cotizacion.email_cliente && (
              <button onClick={onEmail}
                style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                Email
              </button>
            )}
            <button onClick={onCerrar}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>
          </div>
        </div>

        {/* Cuerpo del documento */}
        <div style={{ padding: '32px 40px', fontFamily: 'Arial, sans-serif' }}>

          {/* Encabezado: Logo + Datos empresa */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            {/* Logo real */}
            <img src="/logo.png" alt="GPS Tracker Panamá" style={{ height: '64px', maxWidth: '160px', objectFit: 'contain' }} />
            {/* Datos de empresa */}
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#555', lineHeight: 1.7 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>GPS Tracker Panamá</div>
              <div>Zona Industrial, Costa del Este, Ciudad de Panamá</div>
              <div>RUC: En trámite &nbsp;•&nbsp; Tel: 208-4205</div>
              <div>Cel: 6643-1330 / 6216-4006</div>
              <div>ventas@gpstrackerpanama.com</div>
              <div style={{ color: '#4F6EF7', fontWeight: 600 }}>www.gpstrackerpanama.com</div>
            </div>
          </div>

          {/* Línea azul divisora */}
          <div style={{ height: '2px', background: '#4F6EF7', marginBottom: '20px', borderRadius: '1px' }}></div>

          {/* Título cotización + número */}
          <div style={{ background: '#f0f4ff', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ color: '#4F6EF7', fontWeight: 800, fontSize: '18px' }}>ESTIMACIÓN / COTIZACIÓN</div>
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#374151' }}>
              <div style={{ fontWeight: 700 }}>N° {String(cotizacion.numero).padStart(4, '0')}</div>
              <div>Fecha: {new Date(cotizacion.created_at).toLocaleDateString('es-PA')}</div>
              {cotizacion.fecha_vencimiento && (
                <div style={{ color: '#dc2626', fontWeight: 600 }}>
                  Válida hasta: {new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-PA')}
                </div>
              )}
            </div>
          </div>

          {/* Datos del cliente */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Facturar a:</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>{cotizacion.nombre_cliente}</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px', lineHeight: 1.8 }}>
              {cotizacion.email_cliente && <div>Email: {cotizacion.email_cliente}</div>}
              {cotizacion.telefono_cliente && <div>Tel: {cotizacion.telefono_cliente}</div>}
              {cotizacion.whatsapp_cliente && <div>WhatsApp: {cotizacion.whatsapp_cliente}</div>}
            </div>
          </div>

          {/* Tabla de productos */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
            <thead>
              <tr style={{ background: '#4F6EF7' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: 'white', fontWeight: 700 }}>PROPUESTA DE SISTEMA DE LOCALIZACION GPS</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'white', fontWeight: 700, width: '80px' }}>PRECIO</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white', fontWeight: 700, width: '70px' }}>CANTIDAD</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'white', fontWeight: 700, width: '80px' }}>DESCUENTO</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'white', fontWeight: 700, width: '80px' }}>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>Sin productos</td></tr>
              ) : items.map((item, i) => {
                const precio = parseFloat(item.precio) || 0;
                const cantidad = parseFloat(item.cantidad) || 1;
                const desc = parseFloat(item.descuento) || 0;
                const importe = (precio * cantidad) - desc;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#f8faff' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{item.nombre || '—'}</div>
                      {item.descripcion && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px', lineHeight: 1.5 }}>{item.descripcion}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#374151' }}>B/. {precio.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#374151' }}>{cantidad}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#374151' }}>{desc > 0 ? `B/. ${desc.toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>B/. {importe.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Línea cierre tabla */}
          <div style={{ height: '2px', background: '#4F6EF7', borderRadius: '1px', marginBottom: '12px' }}></div>

          {/* Totales */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <div style={{ minWidth: '240px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#555' }}>
                <span>Subtotal:</span>
                <span>B/. {subtotal.toFixed(2)}</span>
              </div>
              {descuento > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#555' }}>
                  <span>Descuento:</span>
                  <span>- B/. {descuento.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#4F6EF7', borderRadius: '8px', marginTop: '6px' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>TOTAL:</span>
                <span style={{ color: 'white', fontWeight: 800, fontSize: '15px' }}>B/. {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {cotizacion.notas && (
            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px' }}>
              <span style={{ fontWeight: 700, color: '#374151' }}>Notas: </span>
              <span style={{ color: '#555' }}>{cotizacion.notas}</span>
            </div>
          )}

          {/* Términos */}
          <div style={{ fontSize: '11px', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginBottom: '16px' }}>
            Esta estimación es válida por 15 días a partir de su emisión. Los precios están en Balboas panameños (B/.) equivalentes a USD.
          </div>

          {/* Footer */}
          <div style={{ background: '#f0f4ff', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '2px solid #4F6EF7' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#4F6EF7' }}>GPS Tracker Panamá</div>
              <div style={{ color: '#555' }}>gpstrackerpanama.com &nbsp;•&nbsp; ventas@gpstrackerpanama.com</div>
            </div>
            <div style={{ textAlign: 'right', color: '#555' }}>
              <div>Tel: 208-4205 &nbsp;•&nbsp; WhatsApp: 6643-1330 / 6216-4006</div>
              <div>Ciudad de Panamá, República de Panamá</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function Cotizaciones() {
  const navigate = useNavigate();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [preview, setPreview] = useState(null); // cotización en preview

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

  async function enviarEmail(cotizacion) {
    const email = cotizacion.email_cliente;
    if (!email) { toast.warning('Esta cotización no tiene email de cliente'); return; }
    try {
      await api.post(`/cotizaciones/${cotizacion.id}/email`, { email });
      toast.success(`Email enviado a ${email}`);
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
      setTimeout(cargar, 1000);
    } catch (err) {
      toast.error('Error descargando PDF: ' + err.message);
    }
  }

  function compartirWhatsApp(cotizacion) {
    const numero = (cotizacion.whatsapp_cliente || cotizacion.telefono_cliente || '').replace(/\D/g, '');
    const telefono = numero.startsWith('507') ? numero : `507${numero}`;
    const items = (() => { const r = cotizacion.items_json; if (Array.isArray(r)) return r; if (typeof r === 'string') { try { return JSON.parse(r); } catch {} } return []; })();
    const lineas = items.map(i => `• ${i.nombre}: B/. ${parseFloat(i.precio || 0).toFixed(2)}`).join('\n');
    const msg = `Estimado/a ${cotizacion.nombre_cliente}, le hacemos llegar la Estimación #${cotizacion.numero} de GPS Tracker Panamá:\n\n${lineas}\n\n*Total: B/. ${parseFloat(cotizacion.total || 0).toFixed(2)}*\n\nPara consultas estamos a su disposición.\nGPS Tracker Panamá`;
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`, '_blank');
    cambiarEstado(cotizacion.id, 'enviada');
  }

  async function convertirCliente(id) {
    try {
      await api.post(`/cotizaciones/${id}/convertir-cliente`);
      toast.success('Cliente creado exitosamente');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error convirtiendo a cliente');
    }
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
      {/* Modal de vista previa */}
      {preview && (
        <ModalPreview
          cotizacion={preview}
          onCerrar={() => setPreview(null)}
          onDescargar={() => { descargarPDF(preview.id, preview.numero); setPreview(null); }}
          onWhatsApp={() => { compartirWhatsApp(preview); setPreview(null); }}
          onEmail={() => { enviarEmail(preview); setPreview(null); }}
        />
      )}

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
          placeholder="Buscar por nombre o número..."
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
                  const items = (() => { const r = c.items_json; if (Array.isArray(r)) return r; if (typeof r === 'string') { try { return JSON.parse(r); } catch {} } return []; })();
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--borde)', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--azul)' }}>
                        <button
                          onClick={() => setPreview(c)}
                          style={{ background: 'none', border: 'none', color: 'var(--azul)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '13px', textDecoration: 'underline' }}
                        >#{c.numero}</button>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{c.nombre_cliente}</div>
                        {c.email_cliente && <div style={{ fontSize: '11px', color: 'var(--gris)' }}>{c.email_cliente}</div>}
                        <div style={{ fontSize: '11px', color: 'var(--gris)' }}>{items.length} producto{items.length !== 1 ? 's' : ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>B/. {parseFloat(c.total || 0).toFixed(2)}</td>
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
                          {/* Vista previa */}
                          <button onClick={() => setPreview(c)} title="Vista previa"
                            style={{ background: '#f0f4ff', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}>
                            👁️
                          </button>
                          {/* Editar */}
                          <button onClick={() => navigate(`/cotizaciones/${c.id}/editar`)} title="Editar"
                            style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}>
                            ✏️
                          </button>
                          {/* PDF */}
                          <button onClick={() => descargarPDF(c.id, c.numero)} title="Descargar PDF"
                            style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}>
                            📄
                          </button>
                          {/* WhatsApp */}
                          {(c.whatsapp_cliente || c.telefono_cliente) && (
                            <button onClick={() => compartirWhatsApp(c)} title="Compartir por WhatsApp"
                              style={{ background: '#dcfce7', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}>
                              💬
                            </button>
                          )}
                          {/* Email */}
                          {c.email_cliente && (
                            <button onClick={() => enviarEmail(c)} title={`Enviar email a ${c.email_cliente}`}
                              style={{ background: '#dbeafe', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}>
                              📧
                            </button>
                          )}
                          {/* Convertir a cliente */}
                          {c.estado === 'aceptada' && !c.cliente_id && (
                            <button onClick={() => convertirCliente(c.id)} title="Convertir a cliente"
                              style={{ background: '#dbeafe', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>
                              👤 Cliente
                            </button>
                          )}
                          {/* Eliminar */}
                          <button onClick={() => eliminar(c.id, c.numero)} title="Eliminar"
                            style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}>
                            🗑️
                          </button>
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
}
