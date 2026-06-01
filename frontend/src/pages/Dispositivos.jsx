import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';
import ExportButton from '../components/ExportButton';

const ESTADOS_GPS = ['disponible', 'asignado', 'devuelto', 'perdido', 'duplicado'];

function ModalDispositivo({ dispositivo, clientes, onGuardar, onCerrar }) {
  const [form, setForm] = useState(dispositivo || {
    serial_gps: '', simcard: '', placa_vehiculo: '', modelo_auto: '',
    tipo_producto: 'fijo', modalidad: 'alquiler', valor_equipo_usd: 150,
    estado: 'disponible', cliente_id: '', notas: ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/dispositivos/${form.id}`, form);
        toast.success('Dispositivo actualizado');
      } else {
        await api.post('/dispositivos', form);
        toast.success('Dispositivo creado');
      }
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando dispositivo');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--sombra-md)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>
          {form.id ? 'Editar dispositivo' : 'Nuevo dispositivo GPS'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Serial GPS *</label>
              <input required value={form.serial_gps} onChange={e => setForm({ ...form, serial_gps: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            {[
              ['SIM Card', 'simcard'], ['Placa Vehículo', 'placa_vehiculo'], ['Modelo Auto', 'modelo_auto']
            ].map(([label, key]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>{label}</label>
                <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Tipo</label>
              <select value={form.tipo_producto} onChange={e => setForm({ ...form, tipo_producto: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="fijo">Fijo</option>
                <option value="portatil">Portátil</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Modalidad</label>
              <select value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="alquiler">Alquiler</option>
                <option value="venta">Venta</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Valor (USD)</label>
              <input type="number" step="0.01" value={form.valor_equipo_usd} onChange={e => setForm({ ...form, valor_equipo_usd: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                {ESTADOS_GPS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Cliente asignado</label>
              <select value={form.cliente_id || ''} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="">Sin asignar</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Notas</label>
              <textarea rows={2} value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px', resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCerrar}
              style={{ padding: '9px 20px', background: 'white', border: '1px solid var(--borde)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '9px 24px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              {form.id ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dispositivos() {
  const [dispositivos, setDispositivos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);
  const [filtros, setFiltros] = useState({ estado: '', buscar: '' });

  function cargar() {
    setCargando(true);
    const params = new URLSearchParams();
    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.buscar) params.append('buscar', filtros.buscar);
    Promise.all([
      api.get(`/dispositivos?${params}`),
      api.get('/clientes?limit=500')
    ]).then(([d, c]) => {
      setDispositivos(d.data.data);
      setClientes(c.data.data);
      setCargando(false);
    }).catch(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [filtros.estado]);
  useEffect(() => { const t = setTimeout(cargar, 350); return () => clearTimeout(t); }, [filtros.buscar]);

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este dispositivo?')) return;
    try {
      await api.delete(`/dispositivos/${id}`);
      toast.success('Dispositivo eliminado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error eliminando dispositivo');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Dispositivos GPS</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportButton modulo="dispositivos" />
          <button onClick={() => setModal({})}
            style={{ padding: '8px 18px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            + Nuevo dispositivo
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '14px 16px', marginBottom: '16px', boxShadow: 'var(--sombra)', display: 'flex', gap: '12px' }}>
        <input placeholder="Buscar por serial, SIM, placa, cliente..."
          value={filtros.buscar} onChange={e => setFiltros({ ...filtros, buscar: e.target.value })}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }} />
        <select value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
          style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }}>
          <option value="">Todos los estados</option>
          {ESTADOS_GPS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {['Serial GPS', 'SIM Card', 'Placa / Modelo', 'Tipo', 'Valor', 'Cliente', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>Cargando...</td></tr>
            ) : dispositivos.map((d, i) => (
              <tr key={d.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{d.serial_gps}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.simcard || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                  <div>{d.placa_vehiculo || '—'}</div>
                  <div style={{ color: 'var(--gris)', fontSize: '11px' }}>{d.modelo_auto || ''}</div>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.tipo_producto}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>B/. {parseFloat(d.valor_equipo_usd || 0).toFixed(2)}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.cliente_nombre || <span style={{ color: 'var(--gris)' }}>Sin asignar</span>}</td>
                <td style={{ padding: '10px 14px' }}>
                  <AlertaBadge estado={d.estado} />
                  {(d.estado === 'perdido' || d.estado === 'duplicado') && (
                    <span style={{ fontSize: '14px', marginLeft: '4px' }}>⚠️</span>
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setModal(d)}
                      style={{ padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      Editar
                    </button>
                    <button onClick={() => eliminar(d.id)}
                      style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--borde)', fontSize: '12px', color: 'var(--gris)' }}>
          {dispositivos.length} dispositivo(s)
        </div>
      </div>

      {modal !== null && (
        <ModalDispositivo
          dispositivo={modal.id ? modal : null}
          clientes={clientes}
          onGuardar={() => { setModal(null); cargar(); }}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
