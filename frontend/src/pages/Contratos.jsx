import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';
import ExportButton from '../components/ExportButton';
import Paginacion from '../components/Paginacion';

const ITEMS_POR_PAGINA = 50;

function ModalContrato({ contrato, clientes, onGuardar, onCerrar }) {
  const hoy = new Date().toISOString().split('T')[0];

  // Las fechas del servidor vienen como "2024-01-15T05:00:00.000Z"
  // El input[type=date] necesita solo "2024-01-15"
  function formatFecha(fecha) {
    if (!fecha) return hoy;
    return new Date(fecha).toISOString().split('T')[0];
  }

  const [form, setForm] = useState(contrato ? {
    ...contrato,
    fecha_inicio: formatFecha(contrato.fecha_inicio),
    fecha_proximo_pago: formatFecha(contrato.fecha_proximo_pago),
  } : {
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
  const [plantillas, setPlantillas] = useState([]);
  const [modal, setModal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(50);

  function cargar() {
    setCargando(true);
    Promise.all([api.get('/contratos'), api.get('/clientes?limit=500'), api.get('/plantillas')])
      .then(([c, cl, pl]) => {
        setContratos(c.data.data);
        setClientes(cl.data.data);
        setPlantillas(pl.data.data || []);
        setCargando(false);
      }).catch(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []);

  // Enviar recordatorio de pago por WhatsApp usando la plantilla adecuada
  function enviarRecordatorio(c) {
    const numero = (c.cliente_whatsapp || '').replace(/\D/g, '');
    if (!numero) { toast.warning('Este cliente no tiene WhatsApp registrado'); return; }
    const telefono = numero.startsWith('507') ? numero : `507${numero}`;

    // Elegir tipo de plantilla según el vencimiento
    const vencido = c.dias_para_vencer < 0;
    const tipoBuscado = vencido ? 'mora' : 'recordatorio';
    const plantilla = plantillas.find(p => p.tipo === tipoBuscado && p.activa) || plantillas.find(p => p.activa);

    let mensaje;
    const monto = parseFloat(c.monto_total).toFixed(2);
    const fechaVenc = new Date(c.fecha_proximo_pago).toLocaleDateString('es-PA');
    const diasMora = vencido ? Math.abs(c.dias_para_vencer) : 0;

    if (plantilla) {
      mensaje = plantilla.contenido
        .replaceAll('[nombre_cliente]', c.cliente_nombre || '')
        .replaceAll('[monto]', monto)
        .replaceAll('[fecha_vencimiento]', fechaVenc)
        .replaceAll('[dias_mora]', diasMora)
        .replaceAll('[empresa]', 'GPS Tracker Panamá');
    } else {
      // Fallback si no hay plantillas configuradas
      mensaje = vencido
        ? `Estimado/a ${c.cliente_nombre}, su pago de B/.${monto} venció hace ${diasMora} días. Le pedimos regularizarlo para evitar la suspensión del servicio. GPS Tracker Panamá.`
        : `Estimado/a ${c.cliente_nombre}, le recordamos que su pago de B/.${monto} vence el ${fechaVenc}. Gracias por su preferencia. GPS Tracker Panamá.`;
    }
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

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

  // Filtrado de contratos por búsqueda y estado
  const contratosFiltrados = contratos.filter(c => {
    const q = buscar.toLowerCase();
    const matchBuscar = !q || (c.cliente_nombre || '').toLowerCase().includes(q) || (c.frecuencia || '').toLowerCase().includes(q);
    const matchEstado = !filtroEstado || c.estado === filtroEstado;
    return matchBuscar && matchEstado;
  });
  const contratosPagina = contratosFiltrados.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Contratos</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <ExportButton modulo="contratos" label="📊 Exportar Excel" />
          <button onClick={() => setModal({})}
            style={{ padding: '8px 18px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            + Nuevo contrato
          </button>
        </div>
      </div>

      {/* Buscador y filtros */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '14px 16px', marginBottom: '16px', boxShadow: 'var(--sombra)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gris)', fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por cliente o frecuencia..."
            value={buscar}
            onChange={e => { setBuscar(e.target.value); setPagina(1); }}
            style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1); }}
          style={{ padding: '7px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px', minWidth: '140px' }}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
          <option value="cancelado">Cancelado</option>
        </select>
        {(buscar || filtroEstado) && (
          <button onClick={() => { setBuscar(''); setFiltroEstado(''); }}
            style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid var(--borde)', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>
            Limpiar
          </button>
        )}
        <span style={{ fontSize: '12px', color: 'var(--gris)', whiteSpace: 'nowrap' }}>
          {contratosFiltrados.length} de {contratos.length} contratos
        </span>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {['Cliente', 'Frecuencia', 'Monto', 'Saldo favor', 'Próximo pago', 'Días', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>Cargando...</td></tr>
            ) : contratosFiltrados.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>
                {buscar || filtroEstado ? 'Sin resultados para la búsqueda' : 'Sin contratos registrados'}
              </td></tr>
            ) : contratosPagina.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>
                  {c.cliente_nombre}
                  <div style={{ fontSize: '11px', color: 'var(--gris)' }}>{c.cliente_estado}</div>
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px', textTransform: 'capitalize' }}>{c.frecuencia}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>B/. {parseFloat(c.monto_total).toFixed(2)}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px' }}>
                  {parseFloat(c.saldo_favor || 0) > 0 ? (
                    <span style={{ color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>
                      ✅ B/. {parseFloat(c.saldo_favor).toFixed(2)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--gris)', fontSize: '12px' }}>—</span>
                  )}
                </td>
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
                    <button onClick={() => enviarRecordatorio(c)}
                      title={c.dias_para_vencer < 0 ? 'Enviar aviso de mora' : 'Enviar recordatorio de pago'}
                      style={{ padding: '4px 10px', background: '#25d366', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                      💬 {c.dias_para_vencer < 0 ? 'Mora' : 'Recordar'}
                    </button>
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
        <Paginacion
          pagina={pagina}
          totalItems={contratosFiltrados.length}
          itemsPorPagina={itemsPorPagina}
          onChange={p => setPagina(p)}
          onChangeItems={n => setItemsPorPagina(n)}
        />
        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--borde)', fontSize: '12px', color: 'var(--gris)' }}>
          {contratosFiltrados.length} de {contratos.length} contrato(s)
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
