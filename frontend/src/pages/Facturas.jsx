import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import ExportButton from '../components/ExportButton';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ── Colores de estado ──────────────────────────────────────────────────────
const ESTADO_ESTILOS = {
  borrador: { bg: '#f3f4f6', color: '#6b7280', label: '📝 Borrador' },
  enviada:  { bg: '#dbeafe', color: '#1d4ed8', label: '📤 Enviada'  },
  pagada:   { bg: '#dcfce7', color: '#15803d', label: '✅ Pagada'   },
  anulada:  { bg: '#fee2e2', color: '#dc2626', label: '❌ Anulada'  },
};

// ── Modal de previsualización PDF ──────────────────────────────────────────
function ModalPrevisualizacion({ factura, onCerrar }) {
  const token  = localStorage.getItem('token');
  const pdfUrl = `${API_URL}/api/facturas/${factura.id}/pdf?token=${token}`;

  // Deshabilitar scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function descargar() {
    try {
      const resp = await api.get(`/facturas/${factura.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href  = URL.createObjectURL(blob);
      link.download = `factura-${factura.numero_factura}.pdf`;
      link.click();
    } catch {
      toast.error('Error descargando PDF');
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 300, padding: '20px', boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', width: '100%', maxWidth: '860px',
        maxHeight: '95vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>
              📄 {factura.numero_factura}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              {factura.cliente_nombre} · B/. {parseFloat(factura.total).toFixed(2)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={descargar}
              style={{
                padding: '7px 16px', background: '#1d4ed8', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              }}>
              ⬇️ Descargar
            </button>
            <button onClick={onCerrar}
              style={{
                padding: '7px 14px', background: '#f3f4f6', color: '#374151',
                border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
              }}>
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* PDF iframe */}
        <div style={{ flex: 1, minHeight: 0, padding: '0', background: '#525659' }}>
          <iframe
            src={pdfUrl}
            title={`Factura ${factura.numero_factura}`}
            style={{ width: '100%', height: '100%', minHeight: '600px', border: 'none', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Modal para crear nueva factura ─────────────────────────────────────────
function ModalNuevaFactura({ onGuardar, onCerrar }) {
  const [clientes, setClientes] = useState([]);
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    cliente_id: '',
    fecha_emision: hoy,
    items: [{ descripcion: 'Servicio de monitoreo GPS', cantidad: 1, precio: 30 }],
    notas: '',
  });

  useEffect(() => {
    api.get('/clientes?limit=500').then(r => setClientes(r.data.data)).catch(() => {});
  }, []);

  function agregarItem() {
    setForm({ ...form, items: [...form.items, { descripcion: '', cantidad: 1, precio: 0 }] });
  }

  function actualizarItem(idx, campo, valor) {
    const items = [...form.items];
    items[idx] = { ...items[idx], [campo]: valor };
    setForm({ ...form, items });
  }

  function quitarItem(idx) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }

  const subtotal = form.items.reduce((s, i) =>
    s + (parseFloat(i.precio || 0) * parseInt(i.cantidad || 1)), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/facturas', form);
      toast.success('Factura creada correctamente');
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creando factura');
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
    borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>🧾 Nueva factura</h2>
        <form onSubmit={handleSubmit}>
          {/* Cliente + Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Cliente *</label>
              <select required value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Fecha de emisión</label>
              <input type="date" value={form.fecha_emision} onChange={e => setForm({ ...form, fecha_emision: e.target.value })} style={inputStyle} />
            </div>
          </div>

          {/* Ítems */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Ítems de la factura</label>
            {form.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input value={item.descripcion} onChange={e => actualizarItem(idx, 'descripcion', e.target.value)}
                  placeholder="Descripción del servicio" required
                  style={{ flex: 3, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px' }} />
                <input type="number" min="1" value={item.cantidad} onChange={e => actualizarItem(idx, 'cantidad', e.target.value)}
                  placeholder="Cant." style={{ width: '65px', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px' }} />
                <input type="number" step="0.01" min="0" value={item.precio} onChange={e => actualizarItem(idx, 'precio', e.target.value)}
                  placeholder="Precio" style={{ width: '85px', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px' }} />
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, width: '68px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  B/. {(parseFloat(item.precio || 0) * parseInt(item.cantidad || 1)).toFixed(2)}
                </span>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => quitarItem(idx)}
                    style={{ padding: '4px 9px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={agregarItem}
              style={{ padding: '6px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px dashed #93c5fd', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
              + Agregar ítem
            </button>
          </div>

          {/* Notas */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Notas (opcional)</label>
            <textarea rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
              placeholder="Ej: Pago en efectivo al momento de la instalación"
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* Total */}
          <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Subtotal: B/. {subtotal.toFixed(2)}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>Total: B/. {subtotal.toFixed(2)}</div>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCerrar}
              style={{ padding: '9px 20px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '9px 24px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
              Crear factura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Facturas() {
  const [facturas, setFacturas]         = useState([]);
  const [modalNueva, setModalNueva]     = useState(false);
  const [previsualizando, setPrevisualizando] = useState(null); // factura objeto
  const [cargando, setCargando]         = useState(true);
  const [buscar, setBuscar]             = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  function cargar() {
    setCargando(true);
    api.get('/facturas')
      .then(r => { setFacturas(r.data.data || []); setCargando(false); })
      .catch(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  async function cambiarEstado(id, estado) {
    try {
      await api.put(`/facturas/${id}/estado`, { estado });
      toast.success(`Factura marcada como: ${estado}`);
      cargar();
    } catch {
      toast.error('Error actualizando factura');
    }
  }

  async function eliminarFactura(f) {
    if (f.estado === 'pagada') {
      toast.warning('No puedes eliminar una factura pagada. Anúlala primero.');
      return;
    }
    if (!window.confirm(`¿Eliminar la factura ${f.numero_factura} de "${f.cliente_nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/facturas/${f.id}`);
      toast.success('Factura eliminada correctamente');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error eliminando factura');
    }
  }

  const facturasFiltradas = facturas.filter(f => {
    const q = buscar.toLowerCase();
    const matchBuscar = !buscar.trim() ||
      (f.numero_factura || '').toLowerCase().includes(q) ||
      (f.cliente_nombre || '').toLowerCase().includes(q);
    const matchEstado = filtroEstado === 'todos' || f.estado === filtroEstado;
    return matchBuscar && matchEstado;
  });

  const totalFiltrado = facturasFiltradas.reduce((s, f) => s + parseFloat(f.total || 0), 0);

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>🧾 Facturas</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <ExportButton modulo="facturas" />
          <button onClick={() => setModalNueva(true)}
            style={{ padding: '8px 18px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            + Nueva factura
          </button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Total', valor: facturas.length, color: '#1d4ed8', bg: '#dbeafe' },
          { label: 'Borradores', valor: facturas.filter(f => f.estado === 'borrador').length, color: '#6b7280', bg: '#f3f4f6' },
          { label: 'Enviadas',   valor: facturas.filter(f => f.estado === 'enviada').length,  color: '#1d4ed8', bg: '#dbeafe' },
          { label: 'Pagadas',    valor: facturas.filter(f => f.estado === 'pagada').length,   color: '#15803d', bg: '#dcfce7' },
        ].map(({ label, valor, color, bg }) => (
          <div key={label} style={{ background: 'white', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color }}>{valor}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Buscador + Filtro estado */}
      <div style={{ background: 'white', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '14px' }}>🔍</span>
          <input
            type="text" placeholder="Buscar por número o cliente..."
            value={buscar} onChange={e => setBuscar(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', background: 'white' }}>
          <option value="todos">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="enviada">Enviada</option>
          <option value="pagada">Pagada</option>
          <option value="anulada">Anulada</option>
        </select>
        {(buscar || filtroEstado !== 'todos') && (
          <button onClick={() => { setBuscar(''); setFiltroEstado('todos'); }}
            style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
            Limpiar
          </button>
        )}
        <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
          {facturasFiltradas.length} resultado(s)
        </span>
      </div>

      {/* Tabla de facturas */}
      <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Número', 'Cliente', 'Fecha', 'Total', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} style={{ padding: '50px', textAlign: 'center', color: '#9ca3af' }}>Cargando facturas...</td></tr>
            ) : facturasFiltradas.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '50px', textAlign: 'center', color: '#9ca3af' }}>
                {buscar || filtroEstado !== 'todos' ? 'Sin resultados para este filtro' : 'Sin facturas registradas aún'}
              </td></tr>
            ) : facturasFiltradas.map((f, i) => {
              const est = ESTADO_ESTILOS[f.estado] || ESTADO_ESTILOS.borrador;
              return (
                <tr key={f.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>

                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>
                    {f.numero_factura}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '13px' }}>{f.cliente_nombre}</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280' }}>
                    {new Date(f.fecha_emision).toLocaleDateString('es-PA')}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 800, color: '#15803d' }}>
                    B/. {parseFloat(f.total).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select value={f.estado} onChange={e => cambiarEstado(f.id, e.target.value)}
                      style={{
                        padding: '4px 8px', border: 'none', borderRadius: '6px', fontSize: '12px',
                        fontWeight: 600, cursor: 'pointer', background: est.bg, color: est.color,
                      }}>
                      <option value="borrador">📝 Borrador</option>
                      <option value="enviada">📤 Enviada</option>
                      <option value="pagada">✅ Pagada</option>
                      <option value="anulada">❌ Anulada</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* 👁️ Previsualizar */}
                      <button onClick={() => setPrevisualizando(f)}
                        title="Previsualizar factura"
                        style={{
                          padding: '5px 12px', background: '#eff6ff', color: '#1d4ed8',
                          border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                        👁️ Ver
                      </button>
                      {/* ⬇️ Descargar directo */}
                      <button onClick={async () => {
                          try {
                            const resp = await api.get(`/facturas/${f.id}/pdf`, { responseType: 'blob' });
                            const blob = new Blob([resp.data], { type: 'application/pdf' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `factura-${f.numero_factura}.pdf`;
                            link.click();
                          } catch { toast.error('Error descargando PDF'); }
                        }}
                        title="Descargar PDF"
                        style={{
                          padding: '5px 10px', background: '#f0fdf4', color: '#15803d',
                          border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                        }}>
                        ⬇️
                      </button>
                      {/* 🗑️ Eliminar */}
                      <button onClick={() => eliminarFactura(f)}
                        title={f.estado === 'pagada' ? 'Anula la factura primero' : 'Eliminar factura'}
                        style={{
                          padding: '5px 9px',
                          background: f.estado === 'pagada' ? '#f9fafb' : '#fef2f2',
                          color: f.estado === 'pagada' ? '#d1d5db' : '#dc2626',
                          border: `1px solid ${f.estado === 'pagada' ? '#e5e7eb' : '#fecaca'}`,
                          borderRadius: '6px', cursor: f.estado === 'pagada' ? 'not-allowed' : 'pointer', fontSize: '12px',
                        }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer con total */}
        {facturasFiltradas.length > 0 && (
          <div style={{
            padding: '10px 14px', borderTop: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#f9fafb',
          }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {facturasFiltradas.length} factura(s) mostrada(s)
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
              Total: B/. {totalFiltrado.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Modal nueva factura */}
      {modalNueva && (
        <ModalNuevaFactura
          onGuardar={() => { setModalNueva(false); cargar(); }}
          onCerrar={() => setModalNueva(false)}
        />
      )}

      {/* Modal previsualización PDF */}
      {previsualizando && (
        <ModalPrevisualizacion
          factura={previsualizando}
          onCerrar={() => setPrevisualizando(null)}
        />
      )}
    </div>
  );
}
