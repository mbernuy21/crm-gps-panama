import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import ExportButton from '../components/ExportButton';

function ModalPago({ onGuardar, onCerrar }) {
  const [clientes, setClientes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
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
        if (r.data.data.length > 0) {
          setForm(f => ({ ...f, contrato_id: r.data.data[0].id, monto: r.data.data[0].monto_total }));
        }
      });
    }
  }, [form.cliente_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/pagos', form);
      toast.success('Pago registrado correctamente');
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error registrando pago');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '480px', boxShadow: 'var(--sombra-md)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>Registrar pago</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Cliente *</label>
              <select required value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value, contrato_id: '', monto: '' })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Contrato *</label>
              <select required value={form.contrato_id} onChange={e => {
                const cont = contratos.find(c => c.id == e.target.value);
                setForm({ ...form, contrato_id: e.target.value, monto: cont?.monto_total || '' });
              }}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="">Seleccionar contrato</option>
                {contratos.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.frecuencia} — B/. {parseFloat(c.monto_total).toFixed(2)} — vence {new Date(c.fecha_proximo_pago).toLocaleDateString('es-PA')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Fecha de pago *</label>
              <input type="date" required value={form.fecha_pago} onChange={e => setForm({ ...form, fecha_pago: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Monto (B/.) *</label>
              <input type="number" step="0.01" required value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Método de pago</label>
              <select value={form.metodo} onChange={e => setForm({ ...form, metodo: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="transferencia">Transferencia</option>
                <option value="yappy">Yappy</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Link comprobante</label>
              <input type="url" value={form.link_comprobante} onChange={e => setForm({ ...form, link_comprobante: e.target.value })}
                placeholder="https://..." style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Notas</label>
              <textarea rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px', resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCerrar}
              style={{ padding: '9px 20px', background: 'white', border: '1px solid var(--borde)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '9px 24px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              Registrar pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Pagos() {
  const [pagos, setPagos] = useState([]);
  const [totalPeriodo, setTotalPeriodo] = useState(0);
  const [modal, setModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({ fecha_desde: '', fecha_hasta: '' });

  function cargar() {
    setCargando(true);
    const params = new URLSearchParams();
    if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
    api.get(`/pagos?${params}`).then(r => {
      setPagos(r.data.data);
      setTotalPeriodo(r.data.total_periodo);
      setCargando(false);
    }).catch(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [filtros]);

  const iconoMetodo = { transferencia: '🏦', yappy: '📱', efectivo: '💵', cheque: '📝' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Pagos</h1>
          {totalPeriodo > 0 && (
            <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '14px' }}>
              Total período: B/. {parseFloat(totalPeriodo).toLocaleString('es-PA', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportButton modulo="pagos" filtros={filtros} />
          <button onClick={() => setModal(true)}
            style={{ padding: '8px 18px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            + Registrar pago
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '14px 16px', marginBottom: '16px', boxShadow: 'var(--sombra)', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>Desde:</label>
        <input type="date" value={filtros.fecha_desde} onChange={e => setFiltros({ ...filtros, fecha_desde: e.target.value })}
          style={{ padding: '7px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>Hasta:</label>
        <input type="date" value={filtros.fecha_hasta} onChange={e => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
          style={{ padding: '7px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
        <button onClick={() => setFiltros({ fecha_desde: '', fecha_hasta: '' })}
          style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid var(--borde)', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
          Limpiar
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {['Cliente', 'Fecha', 'Monto', 'Método', 'Registrado por', 'Comprobante'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>Cargando...</td></tr>
            ) : pagos.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>Sin pagos en el período</td></tr>
            ) : pagos.map((p, i) => (
              <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{p.cliente_nombre}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px' }}>{new Date(p.fecha_pago).toLocaleDateString('es-PA')}</td>
                <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>
                  B/. {parseFloat(p.monto).toFixed(2)}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '13px' }}>
                  {iconoMetodo[p.metodo]} {p.metodo}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--gris)' }}>{p.registrado_por_nombre || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                  {p.link_comprobante
                    ? <a href={p.link_comprobante} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--azul)', textDecoration: 'none' }}>Ver comprobante</a>
                    : '—'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--borde)', fontSize: '12px', color: 'var(--gris)' }}>
          {pagos.length} pago(s) registrado(s)
        </div>
      </div>

      {modal && <ModalPago onGuardar={() => { setModal(false); cargar(); }} onCerrar={() => setModal(false)} />}
    </div>
  );
}
