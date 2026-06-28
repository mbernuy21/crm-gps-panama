// Módulo de Pagos y Ventas/Cobros Únicos — GPS Tracker Panamá
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import ExportButton from '../components/ExportButton';

// ── Productos predefinidos para ventas/cobros únicos ────────────────────────
const PRODUCTOS_DEFECTO = [
  { tipo: 'GPS Fijo - Venta',           precio: 65,  icono: '📦' },
  { tipo: 'GPS Portátil - Venta',        precio: 105, icono: '📱' },
  { tipo: 'Instalación (alquiler)',      precio: 25,  icono: '🔧' },
  { tipo: 'Depósito garantía portátil',  precio: 85,  icono: '🔒' },
  { tipo: 'Mensualidad GPS',             precio: 12,  icono: '📅' },
  { tipo: 'Otro / Personalizado',        precio: 0,   icono: '✏️' },
];

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box'
};

// ── Modal Pago de Contrato ───────────────────────────────────────────────────
function ModalPago({ pago, onGuardar, onCerrar }) {
  const [clientes, setClientes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const esEdicion = !!pago?.id;
  const hoy = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState(pago ? {
    cliente_id: pago.cliente_id || '',
    contrato_id: pago.contrato_id || '',
    fecha_pago: pago.fecha_pago ? pago.fecha_pago.split('T')[0] : hoy,
    monto: pago.monto || '',
    metodo: pago.metodo || 'transferencia',
    link_comprobante: pago.link_comprobante || '',
    notas: pago.notas || ''
  } : {
    cliente_id: '', contrato_id: '', fecha_pago: hoy,
    monto: '', metodo: 'transferencia', link_comprobante: '', notas: ''
  });

  useEffect(() => {
    api.get('/clientes?limit=500').then(r => setClientes(r.data.data));
  }, []);

  useEffect(() => {
    if (form.cliente_id) {
      api.get(`/contratos?cliente_id=${form.cliente_id}`).then(r => {
        setContratos(r.data.data);
        if (!esEdicion && r.data.data.length > 0 && !form.contrato_id) {
          setForm(f => ({ ...f, contrato_id: r.data.data[0].id, monto: r.data.data[0].monto_total }));
        }
      });
    }
  }, [form.cliente_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (esEdicion) {
        await api.put(`/pagos/${pago.id}`, form);
        toast.success('Pago actualizado correctamente');
      } else {
        await api.post('/pagos', form);
        toast.success('Pago registrado correctamente');
      }
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando pago');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>
          {esEdicion ? '✏️ Editar pago de contrato' : '+ Registrar pago de contrato'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {!esEdicion && (
              <>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Cliente *</label>
                  <select required value={form.cliente_id}
                    onChange={e => setForm({ ...form, cliente_id: e.target.value, contrato_id: '', monto: '' })}
                    style={inputStyle}>
                    <option value="">Seleccionar cliente</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Contrato *</label>
                  <select required value={form.contrato_id}
                    onChange={e => {
                      const cont = contratos.find(c => c.id == e.target.value);
                      setForm({ ...form, contrato_id: e.target.value, monto: cont?.monto_total || '' });
                    }} style={inputStyle}>
                    <option value="">Seleccionar contrato</option>
                    {contratos.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.frecuencia} — B/. {parseFloat(c.monto_total).toFixed(2)} — vence {new Date(c.fecha_proximo_pago).toLocaleDateString('es-PA')}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {esEdicion && (
              <div style={{ gridColumn: '1/-1', background: '#f0fdf4', borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '12px', color: '#166534', fontWeight: 500 }}>
                  Editando pago de: <strong>{pago.cliente_nombre}</strong>
                </p>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Fecha de pago *</label>
              <input type="date" required value={form.fecha_pago}
                onChange={e => setForm({ ...form, fecha_pago: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Monto (B/.) *</label>
              <input type="number" step="0.01" required value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Método de pago</label>
              <select value={form.metodo} onChange={e => setForm({ ...form, metodo: e.target.value })} style={inputStyle}>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="yappy">📱 Yappy</option>
                <option value="efectivo">💵 Efectivo</option>
                <option value="cheque">📝 Cheque</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Link comprobante</label>
              <input type="url" value={form.link_comprobante}
                onChange={e => setForm({ ...form, link_comprobante: e.target.value })}
                placeholder="https://..." style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Notas</label>
              <textarea rows={2} value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCerrar}
              style={{ padding: '9px 20px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '9px 24px', background: esEdicion ? '#f59e0b' : '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              {esEdicion ? '💾 Actualizar' : '✓ Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Venta / Cobro Único ────────────────────────────────────────────────
function ModalVenta({ venta, onGuardar, onCerrar }) {
  const [clientes, setClientes] = useState([]);
  const esEdicion = !!venta?.id;
  const hoy = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState(venta ? {
    cliente_id: venta.cliente_id || '',
    tipo: venta.tipo || '',
    descripcion: venta.descripcion || '',
    cantidad: venta.cantidad || 1,
    precio_unitario: venta.precio_unitario || 0,
    metodo: venta.metodo || 'efectivo',
    fecha: venta.fecha ? venta.fecha.split('T')[0] : hoy,
    link_comprobante: venta.link_comprobante || '',
    notas: venta.notas || ''
  } : {
    cliente_id: '', tipo: '', descripcion: '', cantidad: 1,
    precio_unitario: 0, metodo: 'efectivo', fecha: hoy,
    link_comprobante: '', notas: ''
  });

  useEffect(() => {
    api.get('/clientes?limit=500').then(r => setClientes(r.data.data));
  }, []);

  // Calcular total
  const total = (parseFloat(form.cantidad) || 0) * (parseFloat(form.precio_unitario) || 0);

  // Al seleccionar producto predefinido — carga precio base
  function seleccionarProducto(prod) {
    setForm(f => ({
      ...f,
      tipo: prod.tipo,
      descripcion: prod.tipo,
      precio_unitario: prod.precio
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.tipo) return toast.error('Selecciona o escribe el tipo de cobro');
    try {
      const payload = { ...form, total };
      if (esEdicion) {
        await api.put(`/ventas/${venta.id}`, payload);
        toast.success('Cobro actualizado correctamente');
      } else {
        await api.post('/ventas', payload);
        toast.success('Cobro registrado correctamente');
      }
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando cobro');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '520px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>
          {esEdicion ? '✏️ Editar cobro' : '🛒 Registrar venta / cobro único'}
        </h2>
        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '18px' }}>
          Pagos únicos: venta de equipo, instalación, depósito — no afectan la mensualidad
        </p>

        {/* Selección rápida de productos */}
        {!esEdicion && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Selección rápida:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {PRODUCTOS_DEFECTO.map(prod => (
                <button key={prod.tipo} type="button"
                  onClick={() => seleccionarProducto(prod)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', border: '1px solid',
                    borderColor: form.tipo === prod.tipo ? '#4F6EF7' : '#d1d5db',
                    background: form.tipo === prod.tipo ? '#eef2ff' : 'white',
                    color: form.tipo === prod.tipo ? '#4F6EF7' : '#374151',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                    transition: 'all 0.15s'
                  }}>
                  {prod.icono} {prod.tipo}{prod.precio > 0 ? ` — B/.${prod.precio}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {/* Cliente */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Cliente *</label>
              {esEdicion ? (
                <div style={{ padding: '8px 10px', background: '#f9fafb', borderRadius: '7px', fontSize: '13px', color: '#374151' }}>
                  {venta.cliente_nombre}
                </div>
              ) : (
                <select required value={form.cliente_id}
                  onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                  style={inputStyle}>
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
                </select>
              )}
            </div>

            {/* Tipo */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Tipo de cobro *</label>
              <input type="text" required value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value, descripcion: e.target.value })}
                placeholder="Ej: GPS Fijo - Venta, Instalación..."
                style={inputStyle} />
            </div>

            {/* Descripción */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Descripción / Detalle</label>
              <input type="text" value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Detalles adicionales del cobro..."
                style={inputStyle} />
            </div>

            {/* Cantidad y precio */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Cantidad *</label>
              <input type="number" min="1" step="1" required value={form.cantidad}
                onChange={e => setForm({ ...form, cantidad: e.target.value })}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Precio unitario (B/.) *</label>
              <input type="number" step="0.01" min="0" required value={form.precio_unitario}
                onChange={e => setForm({ ...form, precio_unitario: e.target.value })}
                style={inputStyle} />
            </div>

            {/* Total calculado */}
            <div style={{ gridColumn: '1/-1', background: '#f0fdf4', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>Total a cobrar:</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>B/. {total.toFixed(2)}</span>
            </div>

            {/* Método */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Método de pago</label>
              <select value={form.metodo} onChange={e => setForm({ ...form, metodo: e.target.value })} style={inputStyle}>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="yappy">📱 Yappy</option>
                <option value="efectivo">💵 Efectivo</option>
                <option value="cheque">📝 Cheque</option>
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Fecha *</label>
              <input type="date" required value={form.fecha}
                onChange={e => setForm({ ...form, fecha: e.target.value })} style={inputStyle} />
            </div>

            {/* Comprobante */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Link comprobante</label>
              <input type="url" value={form.link_comprobante}
                onChange={e => setForm({ ...form, link_comprobante: e.target.value })}
                placeholder="https://..." style={inputStyle} />
            </div>

            {/* Notas */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Notas</label>
              <textarea rows={2} value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCerrar}
              style={{ padding: '9px 20px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '9px 24px', background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              {esEdicion ? '💾 Actualizar' : `🛒 Registrar B/. ${total.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal Pagos ───────────────────────────────────────────────────
export default function Pagos() {
  const [tab, setTab] = useState('contratos'); // 'contratos' | 'ventas'

  // Estado tab contratos
  const [pagos, setPagos] = useState([]);
  const [totalPagos, setTotalPagos] = useState(0);
  const [modalPago, setModalPago] = useState(null);
  const [cargandoPagos, setCargandoPagos] = useState(true);
  const [filtrosPagos, setFiltrosPagos] = useState({ fecha_desde: '', fecha_hasta: '' });
  const [buscarPagos, setBuscarPagos] = useState('');

  // Estado tab ventas
  const [ventas, setVentas] = useState([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [modalVenta, setModalVenta] = useState(null);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [filtrosVentas, setFiltrosVentas] = useState({ fecha_desde: '', fecha_hasta: '' });
  const [buscarVentas, setBuscarVentas] = useState('');

  // Cargar pagos de contrato
  function cargarPagos() {
    setCargandoPagos(true);
    const params = new URLSearchParams();
    if (filtrosPagos.fecha_desde) params.append('fecha_desde', filtrosPagos.fecha_desde);
    if (filtrosPagos.fecha_hasta) params.append('fecha_hasta', filtrosPagos.fecha_hasta);
    api.get(`/pagos?${params}`).then(r => {
      setPagos(r.data.data);
      setTotalPagos(r.data.total_periodo);
      setCargandoPagos(false);
    }).catch(() => setCargandoPagos(false));
  }

  // Cargar ventas/cobros únicos
  function cargarVentas() {
    setCargandoVentas(true);
    const params = new URLSearchParams();
    if (filtrosVentas.fecha_desde) params.append('fecha_desde', filtrosVentas.fecha_desde);
    if (filtrosVentas.fecha_hasta) params.append('fecha_hasta', filtrosVentas.fecha_hasta);
    api.get(`/ventas?${params}`).then(r => {
      setVentas(r.data.data);
      setTotalVentas(r.data.total_periodo);
      setCargandoVentas(false);
    }).catch(() => setCargandoVentas(false));
  }

  useEffect(() => { cargarPagos(); }, [filtrosPagos]);
  useEffect(() => { cargarVentas(); }, [filtrosVentas]);

  // Eliminar pago
  async function eliminarPago(p) {
    if (!window.confirm(`¿Eliminar el pago de B/. ${parseFloat(p.monto).toFixed(2)} de "${p.cliente_nombre}"?`)) return;
    try {
      await api.delete(`/pagos/${p.id}`);
      toast.success('Pago eliminado');
      cargarPagos();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error eliminando pago');
    }
  }

  // Eliminar venta
  async function eliminarVenta(v) {
    if (!window.confirm(`¿Eliminar el cobro de B/. ${parseFloat(v.total).toFixed(2)} de "${v.cliente_nombre}"?`)) return;
    try {
      await api.delete(`/ventas/${v.id}`);
      toast.success('Cobro eliminado');
      cargarVentas();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error eliminando cobro');
    }
  }

  const iconoMetodo = { transferencia: '🏦', yappy: '📱', efectivo: '💵', cheque: '📝' };

  // Filtros locales
  const pagosFiltrados = pagos.filter(p => {
    if (!buscarPagos.trim()) return true;
    const q = buscarPagos.toLowerCase();
    return (p.cliente_nombre || '').toLowerCase().includes(q) ||
      (p.metodo || '').toLowerCase().includes(q) ||
      (p.notas || '').toLowerCase().includes(q) ||
      String(p.monto).includes(q);
  });

  const ventasFiltradas = ventas.filter(v => {
    if (!buscarVentas.trim()) return true;
    const q = buscarVentas.toLowerCase();
    return (v.cliente_nombre || '').toLowerCase().includes(q) ||
      (v.tipo || '').toLowerCase().includes(q) ||
      (v.descripcion || '').toLowerCase().includes(q) ||
      String(v.total).includes(q);
  });

  // Estilo de tabs
  const tabStyle = (activo) => ({
    padding: '10px 22px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', border: 'none',
    borderBottom: activo ? '3px solid #4F6EF7' : '3px solid transparent',
    background: 'transparent', color: activo ? '#4F6EF7' : '#6b7280',
    transition: 'all 0.15s'
  });

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Pagos y Ventas</h1>
          <div style={{ display: 'flex', gap: '16px', marginTop: '2px' }}>
            {totalPagos > 0 && (
              <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '13px' }}>
                📅 Contratos: B/. {parseFloat(totalPagos).toLocaleString('es-PA', { minimumFractionDigits: 2 })}
              </span>
            )}
            {totalVentas > 0 && (
              <span style={{ color: '#4F6EF7', fontWeight: 600, fontSize: '13px' }}>
                🛒 Ventas: B/. {parseFloat(totalVentas).toLocaleString('es-PA', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <ExportButton modulo={tab === 'contratos' ? 'pagos' : 'ventas'} filtros={tab === 'contratos' ? filtrosPagos : filtrosVentas} />
          {tab === 'contratos' ? (
            <button onClick={() => setModalPago({})}
              style={{ padding: '8px 18px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              + Pago de contrato
            </button>
          ) : (
            <button onClick={() => setModalVenta({})}
              style={{ padding: '8px 18px', background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              🛒 Registrar venta / cobro
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderRadius: '10px 10px 0 0', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderBottom: '1px solid #e5e7eb', display: 'flex', marginBottom: '0' }}>
        <button style={tabStyle(tab === 'contratos')} onClick={() => setTab('contratos')}>
          📅 Pagos de Contrato
        </button>
        <button style={tabStyle(tab === 'ventas')} onClick={() => setTab('ventas')}>
          🛒 Ventas / Cobros Únicos
        </button>
      </div>

      {/* ── TAB: PAGOS DE CONTRATO ── */}
      {tab === 'contratos' && (
        <>
          {/* Filtros */}
          <div style={{ background: 'white', padding: '12px 16px', marginBottom: '0', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '14px' }}>🔍</span>
              <input type="text" placeholder="Buscar por cliente, método..."
                value={buscarPagos} onChange={e => setBuscarPagos(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <label style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>Desde:</label>
            <input type="date" value={filtrosPagos.fecha_desde}
              onChange={e => setFiltrosPagos({ ...filtrosPagos, fecha_desde: e.target.value })}
              style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px' }} />
            <label style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>Hasta:</label>
            <input type="date" value={filtrosPagos.fecha_hasta}
              onChange={e => setFiltrosPagos({ ...filtrosPagos, fecha_hasta: e.target.value })}
              style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px' }} />
            <button onClick={() => { setFiltrosPagos({ fecha_desde: '', fecha_hasta: '' }); setBuscarPagos(''); }}
              style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
              Limpiar
            </button>
          </div>

          {/* Tabla pagos */}
          <div style={{ background: 'white', borderRadius: '0 0 10px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Cliente', 'Fecha', 'Monto', 'Método', 'Registrado por', 'Comprobante', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cargandoPagos ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando...</td></tr>
                ) : pagosFiltrados.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Sin pagos en el período</td></tr>
                ) : pagosFiltrados.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{p.cliente_nombre}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px' }}>{new Date(p.fecha_pago).toLocaleDateString('es-PA')}</td>
                    <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>B/. {parseFloat(p.monto).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px' }}>{iconoMetodo[p.metodo]} {p.metodo}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#9ca3af' }}>{p.registrado_por_nombre || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                      {p.link_comprobante
                        ? <a href={p.link_comprobante} target="_blank" rel="noopener noreferrer" style={{ color: '#4F6EF7', textDecoration: 'none' }}>Ver</a>
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setModalPago(p)}
                          style={{ padding: '4px 10px', background: '#fef9c3', color: '#92400e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                          ✏️ Editar
                        </button>
                        <button onClick={() => eliminarPago(p)}
                          style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 14px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#9ca3af' }}>
              {pagosFiltrados.length} de {pagos.length} pago(s)
            </div>
          </div>
        </>
      )}

      {/* ── TAB: VENTAS / COBROS ÚNICOS ── */}
      {tab === 'ventas' && (
        <>
          {/* Info */}
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>ℹ️</span>
            <span style={{ fontSize: '12px', color: '#3730a3' }}>
              Cobros únicos: ventas de equipo, instalaciones, depósitos. <strong>No afectan el contrato mensual</strong> del cliente.
            </span>
          </div>

          {/* Filtros */}
          <div style={{ background: 'white', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '14px' }}>🔍</span>
              <input type="text" placeholder="Buscar por cliente, tipo de cobro..."
                value={buscarVentas} onChange={e => setBuscarVentas(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <label style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>Desde:</label>
            <input type="date" value={filtrosVentas.fecha_desde}
              onChange={e => setFiltrosVentas({ ...filtrosVentas, fecha_desde: e.target.value })}
              style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px' }} />
            <label style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>Hasta:</label>
            <input type="date" value={filtrosVentas.fecha_hasta}
              onChange={e => setFiltrosVentas({ ...filtrosVentas, fecha_hasta: e.target.value })}
              style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px' }} />
            <button onClick={() => { setFiltrosVentas({ fecha_desde: '', fecha_hasta: '' }); setBuscarVentas(''); }}
              style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
              Limpiar
            </button>
          </div>

          {/* Tabla ventas */}
          <div style={{ background: 'white', borderRadius: '0 0 10px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Cliente', 'Tipo de cobro', 'Cant.', 'Precio unit.', 'Total', 'Método', 'Fecha', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cargandoVentas ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando...</td></tr>
                ) : ventasFiltradas.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    Sin ventas/cobros registrados
                    <br /><span style={{ fontSize: '12px', marginTop: '6px', display: 'block' }}>Usa el botón "🛒 Registrar venta / cobro" para agregar</span>
                  </td></tr>
                ) : ventasFiltradas.map((v, i) => (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa'}>
                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{v.cliente_nombre}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px' }}>
                      <span style={{ background: '#eef2ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 }}>
                        {v.tipo}
                      </span>
                      {v.descripcion && v.descripcion !== v.tipo && (
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>{v.descripcion}</p>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', textAlign: 'center' }}>{v.cantidad}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px' }}>B/. {parseFloat(v.precio_unitario).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 700, color: '#4F6EF7' }}>B/. {parseFloat(v.total).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px' }}>{iconoMetodo[v.metodo]} {v.metodo}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px' }}>{new Date(v.fecha).toLocaleDateString('es-PA')}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setModalVenta(v)}
                          style={{ padding: '4px 10px', background: '#fef9c3', color: '#92400e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                          ✏️
                        </button>
                        <button onClick={() => eliminarVenta(v)}
                          style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 14px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
              <span>{ventasFiltradas.length} de {ventas.length} cobro(s)</span>
              {totalVentas > 0 && (
                <span style={{ fontWeight: 600, color: '#4F6EF7' }}>
                  Total período: B/. {parseFloat(totalVentas).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modales */}
      {modalPago !== null && (
        <ModalPago
          pago={modalPago.id ? modalPago : null}
          onGuardar={() => { setModalPago(null); cargarPagos(); }}
          onCerrar={() => setModalPago(null)}
        />
      )}
      {modalVenta !== null && (
        <ModalVenta
          venta={modalVenta.id ? modalVenta : null}
          onGuardar={() => { setModalVenta(null); cargarVentas(); }}
          onCerrar={() => setModalVenta(null)}
        />
      )}
    </div>
  );
}
