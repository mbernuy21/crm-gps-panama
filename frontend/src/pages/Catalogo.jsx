// Módulo de Catálogo de Productos — GPS Tracker Panamá
// Permite crear, editar y eliminar productos del catálogo de cotizaciones
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box'
};

// ── Modal crear / editar producto ───────────────────────────────────────────
function ModalProducto({ producto, onGuardar, onCerrar }) {
  const esEdicion = !!producto?.id;
  const [form, setForm] = useState(producto ? {
    nombre: producto.nombre || '',
    descripcion: producto.descripcion || '',
    precio: producto.precio || '',
    activo: producto.activo !== undefined ? producto.activo : 1
  } : {
    nombre: '', descripcion: '', precio: '', activo: 1
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre) return toast.error('El nombre es requerido');
    try {
      if (esEdicion) {
        await api.put(`/catalogo/${producto.id}`, form);
        toast.success('Producto actualizado correctamente');
      } else {
        await api.post('/catalogo', form);
        toast.success('Producto agregado al catálogo');
      }
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando producto');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '440px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>
          {esEdicion ? '✏️ Editar producto' : '+ Agregar producto al catálogo'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Nombre del producto / servicio *</label>
              <input type="text" required value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: GPS Fijo, Instalación, Mensualidad..."
                style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Descripción</label>
              <textarea rows={2} value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción detallada del producto o servicio..."
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>Precio (B/.) *</label>
              <input type="number" step="0.01" min="0" required value={form.precio}
                onChange={e => setForm({ ...form, precio: e.target.value })}
                placeholder="0.00"
                style={inputStyle} />
            </div>
            {esEdicion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="activo" checked={!!form.activo}
                  onChange={e => setForm({ ...form, activo: e.target.checked ? 1 : 0 })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="activo" style={{ fontSize: '13px', cursor: 'pointer' }}>
                  Producto activo (visible en cotizaciones)
                </label>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCerrar}
              style={{ padding: '9px 20px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '9px 24px', background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              {esEdicion ? '💾 Actualizar' : '+ Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal Catálogo ────────────────────────────────────────────────
export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null); // null=cerrado, {}=nuevo, {id,...}=editar
  const [buscar, setBuscar] = useState('');

  function cargar() {
    setCargando(true);
    // Obtener todos (incluyendo inactivos) para poder reactivarlos
    api.get('/catalogo?todos=1').then(r => {
      setProductos(r.data.data || []);
      setCargando(false);
    }).catch(() => {
      // Si no soporta ?todos=1, usar el endpoint normal
      api.get('/catalogo').then(r => {
        setProductos(r.data.data || []);
        setCargando(false);
      }).catch(() => setCargando(false));
    });
  }

  useEffect(() => { cargar(); }, []);

  async function eliminar(p) {
    if (!window.confirm(`¿Desactivar "${p.nombre}" del catálogo? Podrás reactivarlo editándolo.`)) return;
    try {
      await api.delete(`/catalogo/${p.id}`);
      toast.success('Producto desactivado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error eliminando producto');
    }
  }

  const productosFiltrados = productos.filter(p => {
    if (!buscar.trim()) return true;
    const q = buscar.toLowerCase();
    return (p.nombre || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q) ||
      String(p.precio).includes(q);
  });

  // Agrupar en activos e inactivos
  const activos = productosFiltrados.filter(p => p.activo);
  const inactivos = productosFiltrados.filter(p => !p.activo);

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Catálogo de Productos</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
            Productos y servicios disponibles para cotizaciones. Edita precios o agrega nuevos.
          </p>
        </div>
        <button onClick={() => setModal({})}
          style={{ padding: '9px 20px', background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          + Agregar producto
        </button>
      </div>

      {/* Buscador */}
      <div style={{ background: 'white', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
          <input type="text" placeholder="Buscar producto por nombre, descripción o precio..."
            value={buscar} onChange={e => setBuscar(e.target.value)}
            style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        {buscar && (
          <button onClick={() => setBuscar('')}
            style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
            Limpiar
          </button>
        )}
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Cargando catálogo...</div>
      ) : (
        <>
          {/* Productos activos */}
          <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                ✅ Productos activos
                <span style={{ marginLeft: '8px', background: '#dcfce7', color: '#16a34a', fontSize: '12px', padding: '2px 8px', borderRadius: '10px' }}>
                  {activos.length}
                </span>
              </h2>
            </div>

            {activos.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                No hay productos activos. Agrega el primero.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0', padding: '0' }}>
                {activos.map((p, i) => (
                  <div key={p.id} style={{
                    padding: '16px 18px', borderBottom: '1px solid #f3f4f6',
                    borderRight: (i + 1) % 2 === 0 ? 'none' : '1px solid #f3f4f6',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{p.nombre}</p>
                      {p.descripcion && (
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{p.descripcion}</p>
                      )}
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#4F6EF7' }}>
                        B/. {parseFloat(p.precio).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                      <button onClick={() => setModal(p)} title="Editar"
                        style={{ padding: '6px 12px', background: '#fef9c3', color: '#92400e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminar(p)} title="Desactivar"
                        style={{ padding: '6px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Productos inactivos */}
          {inactivos.length > 0 && (
            <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#6b7280' }}>
                  ⚫ Inactivos / Desactivados
                  <span style={{ marginLeft: '8px', background: '#f3f4f6', color: '#6b7280', fontSize: '12px', padding: '2px 8px', borderRadius: '10px' }}>
                    {inactivos.length}
                  </span>
                </h2>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Edítalos y marca "activo" para reactivarlos</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0' }}>
                {inactivos.map((p, i) => (
                  <div key={p.id} style={{
                    padding: '14px 18px', borderBottom: '1px solid #f3f4f6',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    opacity: 0.6
                  }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', textDecoration: 'line-through' }}>{p.nombre}</p>
                      <span style={{ fontSize: '14px', color: '#9ca3af' }}>B/. {parseFloat(p.precio).toFixed(2)}</span>
                    </div>
                    <button onClick={() => setModal(p)} title="Reactivar editando"
                      style={{ padding: '5px 10px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      ↩ Reactivar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {modal !== null && (
        <ModalProducto
          producto={modal.id ? modal : null}
          onGuardar={() => { setModal(null); cargar(); }}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
