// Formulario de Cotización — Crear / Editar — GPS Tracker Panamá
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const ITEM_VACIO = { nombre: '', descripcion: '', cantidad: 1, precio: 0, descuento: 0 };

export default function CotizacionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = !!id;

  // Datos del formulario
  const [form, setForm] = useState({
    nombre_cliente: '', email_cliente: '', telefono_cliente: '',
    whatsapp_cliente: '', notas: '', fecha_vencimiento: '',
    cliente_id: '', lead_id: ''
  });
  const [items, setItems] = useState([{ ...ITEM_VACIO }]);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);

  // Datos auxiliares
  const [catalogo, setCatalogo] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [origen, setOrigen] = useState('libre'); // 'libre' | 'cliente' | 'lead'

  useEffect(() => {
    cargarAuxiliares();
    if (esEdicion) cargarCotizacion();
  }, [id]);

  async function cargarAuxiliares() {
    try {
      const [catR, cliR, leadR] = await Promise.all([
        api.get('/catalogo'),
        api.get('/clientes'),
        api.get('/leads')
      ]);
      setCatalogo(catR.data.data || []);
      setClientes(cliR.data.data || []);
      setLeads(leadR.data.data || []);
    } catch { toast.error('Error cargando datos'); }
  }

  async function cargarCotizacion() {
    try {
      const r = await api.get(`/cotizaciones/${id}`);
      const c = r.data.data;
      setForm({
        nombre_cliente: c.nombre_cliente || '',
        email_cliente: c.email_cliente || '',
        telefono_cliente: c.telefono_cliente || '',
        whatsapp_cliente: c.whatsapp_cliente || '',
        notas: c.notas || '',
        fecha_vencimiento: c.fecha_vencimiento ? c.fecha_vencimiento.split('T')[0] : '',
        cliente_id: c.cliente_id || '',
        lead_id: c.lead_id || ''
      });
      setItems(c.items?.length ? c.items : [{ ...ITEM_VACIO }]);
      setDescuentoGlobal(parseFloat(c.descuento_global) || 0);
      if (c.cliente_id) setOrigen('cliente');
      else if (c.lead_id) setOrigen('lead');
    } catch { toast.error('Error cargando cotización'); }
  }

  // Cuando selecciona un cliente del CRM
  function seleccionarCliente(clienteId) {
    const c = clientes.find(cl => cl.id == clienteId);
    if (c) {
      setForm(f => ({
        ...f,
        cliente_id: c.id,
        lead_id: '',
        nombre_cliente: c.nombre_razon_social,
        email_cliente: c.email || '',
        telefono_cliente: c.telefono_principal || '',
        whatsapp_cliente: c.whatsapp || ''
      }));
    }
  }

  // Cuando selecciona un lead
  function seleccionarLead(leadId) {
    const l = leads.find(ld => ld.id == leadId);
    if (l) {
      setForm(f => ({
        ...f,
        lead_id: l.id,
        cliente_id: '',
        nombre_cliente: l.nombre,
        email_cliente: l.email || '',
        telefono_cliente: l.telefono || '',
        whatsapp_cliente: l.whatsapp || ''
      }));
    }
  }

  // Agregar producto del catálogo
  function agregarDelCatalogo(producto) {
    setItems(prev => [...prev, {
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      cantidad: 1,
      precio: parseFloat(producto.precio) || 0,
      descuento: 0
    }]);
    setMostrarCatalogo(false);
    toast.success(`"${producto.nombre}" agregado`);
  }

  // Modificar item
  function actualizarItem(idx, campo, valor) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [campo]: valor } : item));
  }

  function agregarItemVacio() {
    setItems(prev => [...prev, { ...ITEM_VACIO }]);
  }

  function eliminarItem(idx) {
    if (items.length === 1) return toast.warning('Debe haber al menos un producto');
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  // Calcular totales
  const subtotal = items.reduce((acc, item) => {
    return acc + (parseFloat(item.precio) || 0) * (parseFloat(item.cantidad) || 1) - (parseFloat(item.descuento) || 0);
  }, 0);
  const total = Math.max(0, subtotal - parseFloat(descuentoGlobal || 0));

  async function guardar(e) {
    e.preventDefault();
    if (!form.nombre_cliente.trim()) return toast.error('El nombre del cliente es requerido');
    if (!items.some(i => i.nombre.trim())) return toast.error('Debe agregar al menos un producto');

    setGuardando(true);
    const payload = {
      ...form,
      items: items.filter(i => i.nombre.trim()),
      subtotal,
      descuento_global: parseFloat(descuentoGlobal) || 0,
      total
    };

    try {
      if (esEdicion) {
        await api.put(`/cotizaciones/${id}`, payload);
        toast.success('Cotización actualizada');
      } else {
        const r = await api.post('/cotizaciones', payload);
        toast.success(r.data.message || 'Cotización creada');
      }
      navigate('/cotizaciones');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando cotización');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarYDescargarPDF(e) {
    e.preventDefault();
    if (!form.nombre_cliente.trim()) return toast.error('El nombre del cliente es requerido');
    setGuardando(true);
    const payload = {
      ...form,
      items: items.filter(i => i.nombre.trim()),
      subtotal,
      descuento_global: parseFloat(descuentoGlobal) || 0,
      total
    };
    try {
      let cotizacionId = id;
      if (esEdicion) {
        await api.put(`/cotizaciones/${id}`, payload);
      } else {
        const r = await api.post('/cotizaciones', payload);
        cotizacionId = r.data.data.id;
      }
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      window.open(`${apiUrl}/api/cotizaciones/${cotizacionId}/pdf`, '_blank');
      navigate('/cotizaciones');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando');
    } finally {
      setGuardando(false);
    }
  }

  async function enviarEmail() {
    if (!form.email_cliente) return toast.error('Ingresa un email de destino primero');
    if (!esEdicion) return toast.warning('Guarda la cotización primero');
    setEnviandoEmail(true);
    try {
      await api.post(`/cotizaciones/${id}/email`, { email: form.email_cliente });
      toast.success(`Email enviado a ${form.email_cliente}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error enviando email');
    } finally {
      setEnviandoEmail(false);
    }
  }

  const estiloInput = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--borde)',
    borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box'
  };
  const estiloLabel = { fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' };

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{esEdicion ? 'Editar Cotización' : 'Nueva Cotización'}</h1>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>
            {esEdicion ? 'Modifica los datos de la cotización' : 'Crea una cotización nueva'}
          </p>
        </div>
        <button
          onClick={() => navigate('/cotizaciones')}
          style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
        >
          ← Volver
        </button>
      </div>

      <form onSubmit={guardar}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>

          {/* Columna principal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Origen de la cotización */}
            <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Origen de la cotización</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[
                  { key: 'libre', label: '✏️ Libre' },
                  { key: 'cliente', label: '👥 Desde cliente CRM' },
                  { key: 'lead', label: '🎯 Desde lead' },
                ].map(o => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => { setOrigen(o.key); setForm(f => ({ ...f, cliente_id: '', lead_id: '' })); }}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                      background: origen === o.key ? 'var(--azul)' : '#f3f4f6',
                      color: origen === o.key ? 'white' : '#374151',
                      border: 'none'
                    }}
                  >{o.label}</button>
                ))}
              </div>

              {origen === 'cliente' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={estiloLabel}>Seleccionar cliente del CRM</label>
                  <select onChange={e => seleccionarCliente(e.target.value)} style={estiloInput}>
                    <option value=''>-- Selecciona un cliente --</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
                  </select>
                </div>
              )}

              {origen === 'lead' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={estiloLabel}>Seleccionar lead</label>
                  <select onChange={e => seleccionarLead(e.target.value)} style={estiloInput}>
                    <option value=''>-- Selecciona un lead --</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.nombre} — {l.estado}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Datos del cliente */}
            <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Datos del cliente</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={estiloLabel}>Nombre / Razón social *</label>
                  <input value={form.nombre_cliente} onChange={e => setForm(f => ({ ...f, nombre_cliente: e.target.value }))}
                    placeholder="Nombre completo o empresa" style={estiloInput} required />
                </div>
                <div>
                  <label style={estiloLabel}>Email</label>
                  <input type="email" value={form.email_cliente} onChange={e => setForm(f => ({ ...f, email_cliente: e.target.value }))}
                    placeholder="correo@ejemplo.com" style={estiloInput} />
                </div>
                <div>
                  <label style={estiloLabel}>Teléfono</label>
                  <input value={form.telefono_cliente} onChange={e => setForm(f => ({ ...f, telefono_cliente: e.target.value }))}
                    placeholder="6000-0000" style={estiloInput} />
                </div>
                <div>
                  <label style={estiloLabel}>WhatsApp (con código de país)</label>
                  <input value={form.whatsapp_cliente} onChange={e => setForm(f => ({ ...f, whatsapp_cliente: e.target.value }))}
                    placeholder="50760000000" style={estiloInput} />
                </div>
                <div>
                  <label style={estiloLabel}>Válida hasta</label>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                    style={estiloInput} />
                </div>
              </div>
            </div>

            {/* Productos */}
            <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Productos / Servicios</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarCatalogo(!mostrarCatalogo)}
                    style={{ background: 'var(--azul-light)', color: 'var(--azul)', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >📋 Del catálogo</button>
                  <button
                    type="button"
                    onClick={agregarItemVacio}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >+ Línea manual</button>
                </div>
              </div>

              {/* Catálogo desplegable */}
              {mostrarCatalogo && (
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '16px', maxHeight: '280px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gris)', marginBottom: '8px' }}>Clic para agregar al presupuesto:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {catalogo.map(p => (
                      <div
                        key={p.id}
                        onClick={() => agregarDelCatalogo(p)}
                        style={{ background: 'white', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', border: '1px solid var(--borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--azul)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--borde)'}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.nombre}</div>
                          {p.descripcion && <div style={{ fontSize: '11px', color: 'var(--gris)', marginTop: '2px' }}>{p.descripcion.substring(0, 60)}...</div>}
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--azul)', fontSize: '14px', whiteSpace: 'nowrap', marginLeft: '12px' }}>B/. {parseFloat(p.precio).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Encabezado tabla */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 40px', gap: '8px', marginBottom: '8px' }}>
                {['Producto', 'Cant.', 'Precio', 'Desc.', ''].map(h => (
                  <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gris)', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>

              {/* Filas de items */}
              {items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '12px', background: '#f9fafb', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 40px', gap: '8px', alignItems: 'start' }}>
                    <input
                      value={item.nombre}
                      onChange={e => actualizarItem(idx, 'nombre', e.target.value)}
                      placeholder="Nombre del producto/servicio"
                      style={{ ...estiloInput, fontWeight: 600 }}
                    />
                    <input
                      type="number" min="1" step="1"
                      value={item.cantidad}
                      onChange={e => actualizarItem(idx, 'cantidad', e.target.value)}
                      style={{ ...estiloInput, textAlign: 'center' }}
                    />
                    <input
                      type="number" min="0" step="0.01"
                      value={item.precio}
                      onChange={e => actualizarItem(idx, 'precio', e.target.value)}
                      style={{ ...estiloInput, textAlign: 'right' }}
                    />
                    <input
                      type="number" min="0" step="0.01"
                      value={item.descuento}
                      onChange={e => actualizarItem(idx, 'descuento', e.target.value)}
                      style={{ ...estiloInput, textAlign: 'right' }}
                    />
                    <button
                      type="button"
                      onClick={() => eliminarItem(idx)}
                      style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}
                    >✕</button>
                  </div>
                  <textarea
                    value={item.descripcion}
                    onChange={e => actualizarItem(idx, 'descripcion', e.target.value)}
                    placeholder="Descripción opcional del producto..."
                    rows={2}
                    style={{ ...estiloInput, marginTop: '6px', resize: 'vertical', fontSize: '12px', color: '#6b7280' }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--gris)', marginTop: '4px' }}>
                    Importe: <strong>B/. {((parseFloat(item.precio) || 0) * (parseFloat(item.cantidad) || 1) - (parseFloat(item.descuento) || 0)).toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Notas */}
            <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
              <label style={estiloLabel}>Notas / Condiciones adicionales</label>
              <textarea
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Condiciones, términos de pago, observaciones..."
                rows={3}
                style={{ ...estiloInput, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Columna lateral — Resumen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '80px' }}>

            {/* Totales */}
            <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Resumen</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gris)' }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>B/. {subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gris)' }}>Descuento global</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={descuentoGlobal}
                    onChange={e => setDescuentoGlobal(e.target.value)}
                    style={{ width: '80px', padding: '4px 8px', border: '1px solid var(--borde)', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }}
                  />
                </div>
                <div style={{ borderTop: '2px solid var(--borde)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '16px' }}>TOTAL</span>
                  <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--azul)' }}>B/. {total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Acciones</h3>

              <button
                type="submit"
                disabled={guardando}
                style={{ background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', padding: '11px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
              >
                {guardando ? '⏳ Guardando...' : '💾 Guardar cotización'}
              </button>

              <button
                type="button"
                onClick={guardarYDescargarPDF}
                disabled={guardando}
                style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '11px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
              >
                📄 Guardar y descargar PDF
              </button>

              {esEdicion && form.email_cliente && (
                <button
                  type="button"
                  onClick={enviarEmail}
                  disabled={enviandoEmail}
                  style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '8px', padding: '11px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                >
                  {enviandoEmail ? '⏳ Enviando...' : '📧 Enviar por email'}
                </button>
              )}

              {esEdicion && (form.whatsapp_cliente || form.telefono_cliente) && (
                <button
                  type="button"
                  onClick={() => {
                    const numero = (form.whatsapp_cliente || form.telefono_cliente).replace(/\D/g, '');
                    const telefono = numero.startsWith('507') ? numero : `507${numero}`;
                    const lineas = items.filter(i => i.nombre).map(i =>
                      `• ${i.nombre}: B/. ${((parseFloat(i.precio)||0)*(parseFloat(i.cantidad)||1)-(parseFloat(i.descuento)||0)).toFixed(2)}`
                    ).join('\n');
                    const mensaje = `Estimado/a ${form.nombre_cliente}, le hacemos llegar nuestra propuesta de servicio GPS:\n\n${lineas}\n\n*Total: B/. ${total.toFixed(2)}*\n\nGracias por su preferencia. 📍 GPS Tracker Panamá`;
                    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
                  }}
                  style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '11px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                >
                  💬 Compartir por WhatsApp
                </button>
              )}
            </div>

            {/* Vista previa del PDF */}
            <div style={{ background: '#f0f4ff', borderRadius: 'var(--radio)', padding: '16px', border: '1px dashed var(--azul)' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--azul)', marginBottom: '8px' }}>📄 Vista previa del PDF</p>
              <div style={{ background: 'white', borderRadius: '6px', padding: '12px', fontSize: '11px', color: '#374151' }}>
                <div style={{ fontWeight: 700, color: '#4F6EF7', fontSize: '13px' }}>ESTIMACIÓN</div>
                <div style={{ color: 'var(--gris)' }}>GPS Tracker Panamá</div>
                <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
                <div style={{ fontWeight: 700 }}>{form.nombre_cliente || 'Nombre del cliente'}</div>
                {form.email_cliente && <div style={{ color: 'var(--gris)' }}>{form.email_cliente}</div>}
                <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
                {items.filter(i => i.nombre).map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{item.nombre}</span>
                    <span>B/. {((parseFloat(item.precio)||0)*(parseFloat(item.cantidad)||1)-(parseFloat(item.descuento)||0)).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>TOTAL</span>
                  <span>B/. {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
