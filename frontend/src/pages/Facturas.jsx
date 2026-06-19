import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';
import ExportButton from '../components/ExportButton';

function ModalFactura({ onGuardar, onCerrar }) {
  const [clientes, setClientes] = useState([]);
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ cliente_id: '', fecha_emision: hoy, items: [{ descripcion: 'Servicio de monitoreo GPS', cantidad: 1, precio: 30 }] });

  useEffect(() => { api.get('/clientes?limit=500').then(r => setClientes(r.data.data)); }, []);

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

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.precio || 0) * parseInt(i.cantidad || 1)), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/facturas', form);
      toast.success('Factura creada');
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creando factura');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--sombra-md)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>Nueva factura</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Cliente *</label>
              <select required value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Fecha de emisión</label>
              <input type="date" value={form.fecha_emision} onChange={e => setForm({ ...form, fecha_emision: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
          </div>

          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Ítems de la factura</h3>
          {form.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <input value={item.descripcion} onChange={e => actualizarItem(idx, 'descripcion', e.target.value)}
                placeholder="Descripción" required
                style={{ flex: 3, padding: '7px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
              <input type="number" min="1" value={item.cantidad} onChange={e => actualizarItem(idx, 'cantidad', e.target.value)}
                placeholder="Cant." style={{ width: '70px', padding: '7px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
              <input type="number" step="0.01" value={item.precio} onChange={e => actualizarItem(idx, 'precio', e.target.value)}
                placeholder="Precio" style={{ width: '90px', padding: '7px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, width: '70px', textAlign: 'right' }}>
                B/. {(parseFloat(item.precio || 0) * parseInt(item.cantidad || 1)).toFixed(2)}
              </span>
              {form.items.length > 1 && (
                <button type="button" onClick={() => quitarItem(idx)}
                  style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                  ×
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={agregarItem}
            style={{ padding: '6px 14px', background: 'var(--azul-light)', color: 'var(--azul)', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', marginBottom: '16px' }}>
            + Agregar ítem
          </button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: 'var(--gris)' }}>Subtotal: B/. {subtotal.toFixed(2)}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>Total: B/. {subtotal.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCerrar}
              style={{ padding: '9px 20px', background: 'white', border: '1px solid var(--borde)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '9px 24px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              Crear factura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [modal, setModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');

  function cargar() {
    setCargando(true);
    api.get('/facturas').then(r => { setFacturas(r.data.data); setCargando(false); }).catch(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  async function cambiarEstado(id, estado) {
    try {
      await api.put(`/facturas/${id}/estado`, { estado });
      toast.success(`Factura marcada como: ${estado}`);
      cargar();
    } catch (err) {
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

  async function descargarPDF(id, numero) {
    try {
      const resp = await api.get(`/facturas/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `factura-${numero}.pdf`;
      link.click();
    } catch (err) {
      toast.error('Error descargando PDF');
    }
  }

  const facturasFiltradas = facturas.filter(f => {
    if (!buscar.trim()) return true;
    const q = buscar.toLowerCase();
    return (
      (f.numero_factura || '').toLowerCase().includes(q) ||
      (f.cliente_nombre || '').toLowerCase().includes(q) ||
      (f.estado || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Facturas</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <ExportButton modulo="facturas" />
          <button onClick={() => setModal(true)}
            style={{ padding: '8px 18px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            + Nueva factura
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '14px 16px', marginBottom: '16px', boxShadow: 'var(--sombra)', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gris)', fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por número, cliente, estado..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>
        {buscar && (
          <button onClick={() => setBuscar('')}
            style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid var(--borde)', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
            Limpiar
          </button>
        )}
        <span style={{ fontSize: '12px', color: 'var(--gris)', whiteSpace: 'nowrap' }}>
          {facturasFiltradas.length} de {facturas.length}
        </span>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {['Número', 'Cliente', 'Fecha', 'Total', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>Cargando...</td></tr>
            ) : facturasFiltradas.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>
                {buscar ? `Sin resultados para "${buscar}"` : 'Sin facturas registradas'}
              </td></tr>
            ) : facturasFiltradas.map((f, i) => (
              <tr key={f.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--azul)' }}>{f.numero_factura}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px' }}>{f.cliente_nombre}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px' }}>{new Date(f.fecha_emision).toLocaleDateString('es-PA')}</td>
                <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 700 }}>B/. {parseFloat(f.total).toFixed(2)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <select value={f.estado} onChange={e => cambiarEstado(f.id, e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid var(--borde)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    {['borrador', 'enviada', 'pagada', 'anulada'].map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => descargarPDF(f.id, f.numero_factura)}
                      style={{ padding: '4px 10px', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                      📄 PDF
                    </button>
                    <button onClick={() => eliminarFactura(f)}
                      title={f.estado === 'pagada' ? 'Anula la factura primero para eliminarla' : 'Eliminar factura'}
                      style={{
                        padding: '4px 8px',
                        background: f.estado === 'pagada' ? '#f3f4f6' : '#fee2e2',
                        color: f.estado === 'pagada' ? '#9ca3af' : '#dc2626',
                        border: 'none', borderRadius: '6px', cursor: f.estado === 'pagada' ? 'not-allowed' : 'pointer', fontSize: '12px'
                      }}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--borde)', fontSize: '12px', color: 'var(--gris)' }}>
          {facturas.length} factura(s)
        </div>
      </div>

      {modal && <ModalFactura onGuardar={() => { setModal(false); cargar(); }} onCerrar={() => setModal(false)} />}
    </div>
  );
}
