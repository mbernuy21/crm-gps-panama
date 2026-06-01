import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';

function ModalContrato({ contrato, clientes, onGuardar, onCerrar }) {
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(contrato || {
    cliente_id: '', frecuencia: 'mensual', monto_total: 30,
    fecha_inicio: hoy, fecha_proximo_pago: hoy, dias_alerta: 5, estado: 'activo'
  });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/contratos/${form.id}`, form);
        toast.success('Contrato actualizado');
      } else {
        await api.post('/contratos', form);
        toast.success('Contrato creado');
      }
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando contrato');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '480px', boxShadow: 'var(--sombra-md)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>
          {form.id ? 'Editar contrato' : 'Nuevo contrato'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Cliente *</label>
              <select required value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Frecuencia</label>
              <select value={form.frecuencia} onChange={e => setForm({ ...form, frecuencia: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="mensual">Mensual</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Monto total (B/.)</label>
              <input type="number" step="0.01" required value={form.monto_total} onChange={e => setForm({ ...form, monto_total: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Fecha inicio</label>
              <input type="date" required value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Próximo pago</label>
              <input type="date" required value={form.fecha_proximo_pago} onChange={e => setForm({ ...form, fecha_proximo_pago: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Días de alerta</label>
              <select value={form.dias_alerta} onChange={e => setForm({ ...form, dias_alerta: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="3">3 días</option>
                <option value="5">5 días</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
                <option value="cancelado">Cancelado</option>
              </select>
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

export default function Contratos() {
  const [contratos, setContratos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [modal, setModal] = useState(null);
  const [cargando, setCargando] = useState(true);

  function cargar() {
    setCargando(true);
    Promise.all([api.get('/contratos'), api.get('/clientes?limit=500')])
      .then(([c, cl]) => {
        setContratos(c.data.data);
        setClientes(cl.data.data);
        setCargando(false);
      }).catch(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este contrato?')) return;
    try {
      await api.delete(`/contratos/${id}`);
      toast.success('Contrato eliminado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  }

  function colorVencimiento(dias) {
    if (dias < 0) return '#ef4444';
    if (dias <= 5) return '#f59e0b';
    return '#22c55e';
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Contratos</h1>
        <button onClick={() => setModal({})}
          style={{ padding: '8px 18px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          + Nuevo contrato
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {['Cliente', 'Frecuencia', 'Monto', 'Próximo pago', 'Días', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>Cargando...</td></tr>
            ) : contratos.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>
                  {c.cliente_nombre}
                  <div style={{ fontSize: '11px', color: 'var(--gris)' }}>{c.cliente_estado}</div>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px', textTransform: 'capitalize' }}>{c.frecuencia}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>B/. {parseFloat(c.monto_total).toFixed(2)}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px' }}>
                  {new Date(c.fecha_proximo_pago).toLocaleDateString('es-PA')}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: colorVencimiento(c.dias_para_vencer) }}>
                    {c.dias_para_vencer < 0 ? `${Math.abs(c.dias_para_vencer)}d vencido` : `${c.dias_para_vencer}d`}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}><AlertaBadge estado={c.estado} /></td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setModal(c)}
                      style={{ padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      Editar
                    </button>
                    <button onClick={() => eliminar(c.id)}
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
          {contratos.length} contrato(s)
        </div>
      </div>

      {modal !== null && (
        <ModalContrato
          contrato={modal.id ? modal : null}
          clientes={clientes}
          onGuardar={() => { setModal(null); cargar(); }}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
