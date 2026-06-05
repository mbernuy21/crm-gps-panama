import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';
import WhatsAppButton from '../components/WhatsAppButton';

const ESTADOS = ['activo', 'inactivo', 'moroso', 'suspendido', 'cortado'];

// ── Subcomponente: Estado de Cuenta ────────────────────────────────────────────
function EstadoCuentaTab({ clienteId, pagos = [], contrato = null, cliente }) {
  // Obtener años disponibles de los pagos
  const anos = [...new Set(pagos.map(p => new Date(p.fecha_pago).getFullYear()))].sort((a, b) => b - a);
  const anoActual = new Date().getFullYear();
  const [anoFiltro, setAnoFiltro] = useState(anos.includes(anoActual) ? anoActual : (anos[0] || anoActual));
  const [descargando, setDescargando] = useState('');

  // Filtrar pagos por año
  const pagosFiltrados = pagos.filter(p => new Date(p.fecha_pago).getFullYear() === anoFiltro);

  // Agrupar por mes
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const porMes = Array.from({ length: 12 }, (_, i) => {
    const pagosMes = pagosFiltrados.filter(p => new Date(p.fecha_pago).getMonth() === i);
    const total = pagosMes.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
    return { mes: i, nombre: meses[i], pagos: pagosMes, total };
  }).filter(m => m.pagos.length > 0);

  const totalAno = pagosFiltrados.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
  const totalGeneral = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);

  // Descargar PDF con autenticación
  async function descargarPDF() {
    setDescargando('pdf');
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const resp = await fetch(`${apiUrl}/api/reportes/estado-cuenta/${clienteId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estado_cuenta_${cliente?.nombre_razon_social?.replace(/\s+/g,'_') || clienteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch (err) {
      toast.error('Error descargando PDF: ' + err.message);
    } finally { setDescargando(''); }
  }

  // Descargar Excel con autenticación
  async function descargarExcel() {
    setDescargando('excel');
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const resp = await fetch(`${apiUrl}/api/reportes/estado-cuenta/${clienteId}/excel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estado_cuenta_${cliente?.nombre_razon_social?.replace(/\s+/g,'_') || clienteId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Excel descargado');
    } catch (err) {
      toast.error('Error descargando Excel: ' + err.message);
    } finally { setDescargando(''); }
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Encabezado con controles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Estado de Cuenta</h3>
          <p style={{ fontSize: '12px', color: 'var(--gris)' }}>Historial de pagos agrupado por mes</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtro año */}
          <select
            value={anoFiltro}
            onChange={e => setAnoFiltro(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
          >
            {anos.length === 0
              ? <option value={anoActual}>{anoActual}</option>
              : anos.map(a => <option key={a} value={a}>{a}</option>)
            }
          </select>
          {/* Descargar PDF */}
          <button
            onClick={descargarPDF}
            disabled={descargando === 'pdf'}
            style={{ padding: '8px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {descargando === 'pdf' ? '⏳' : '📄'} PDF
          </button>
          {/* Descargar Excel */}
          <button
            onClick={descargarExcel}
            disabled={descargando === 'excel'}
            style={{ padding: '8px 14px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {descargando === 'excel' ? '⏳' : '📊'} Excel
          </button>
        </div>
      </div>

      {/* Resumen financiero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: `Total ${anoFiltro}`, valor: `B/. ${totalAno.toFixed(2)}`, color: '#4F6EF7', icono: '📅' },
          { label: 'Total histórico', valor: `B/. ${totalGeneral.toFixed(2)}`, color: '#16a34a', icono: '💰' },
          { label: 'Pagos en el año', valor: pagosFiltrados.length, color: '#8b5cf6', icono: '🧾' },
          contrato ? { label: 'Cuota mensual', valor: `B/. ${parseFloat(contrato.monto_total || 0).toFixed(2)}`, color: '#f59e0b', icono: '📋' } : null,
        ].filter(Boolean).map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: 'var(--radio)', padding: '14px 16px', boxShadow: 'var(--sombra)', borderLeft: `4px solid ${k.color}` }}>
            <p style={{ fontSize: '10px', color: 'var(--gris)', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase' }}>
              {k.icono} {k.label}
            </p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: k.color }}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Contrato vigente */}
      {contrato && (
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '14px 16px', boxShadow: 'var(--sombra)', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--gris)', fontWeight: 500, textTransform: 'uppercase' }}>Frecuencia</p>
            <p style={{ fontSize: '13px', fontWeight: 600 }}>{contrato.frecuencia?.charAt(0).toUpperCase() + contrato.frecuencia?.slice(1)}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--gris)', fontWeight: 500, textTransform: 'uppercase' }}>Próximo pago</p>
            <p style={{ fontSize: '13px', fontWeight: 600 }}>
              {contrato.fecha_proximo_pago ? new Date(contrato.fecha_proximo_pago).toLocaleDateString('es-PA') : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--gris)', fontWeight: 500, textTransform: 'uppercase' }}>Estado contrato</p>
            <AlertaBadge estado={contrato.estado} />
          </div>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--gris)', fontWeight: 500, textTransform: 'uppercase' }}>Monto</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>B/. {parseFloat(contrato.monto_total || 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Sin pagos en ese año */}
      {porMes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
          <p style={{ fontWeight: 600 }}>Sin pagos en {anoFiltro}</p>
          {anos.length > 1 && <p style={{ fontSize: '12px', marginTop: '4px' }}>Prueba con otro año del filtro</p>}
        </div>
      )}

      {/* Pagos agrupados por mes */}
      {porMes.map(({ mes, nombre, pagos: pm, total }) => (
        <div key={mes} style={{ marginBottom: '16px', border: '1px solid var(--borde)', borderRadius: 'var(--radio)', overflow: 'hidden' }}>
          {/* Encabezado del mes */}
          <div style={{ background: '#f0f4ff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📅</span>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--azul)' }}>{nombre} {anoFiltro}</span>
              <span style={{ fontSize: '11px', color: 'var(--gris)', background: 'white', borderRadius: '20px', padding: '2px 8px' }}>
                {pm.length} pago{pm.length !== 1 ? 's' : ''}
              </span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#16a34a' }}>
              B/. {total.toFixed(2)}
            </span>
          </div>
          {/* Tabla de pagos del mes */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Fecha', 'Monto', 'Método', 'Registrado por', 'Notas'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pm.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--borde)', background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={{ padding: '10px 14px', fontSize: '13px' }}>{new Date(p.fecha_pago).toLocaleDateString('es-PA')}</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>B/. {parseFloat(p.monto).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.metodo}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.registrado_por_nombre || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--gris)' }}>{p.notas || '—'}</td>
                </tr>
              ))}
              {/* Total del mes */}
              <tr style={{ background: '#f0f4ff', borderTop: '2px solid var(--azul)' }}>
                <td colSpan={4} style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--azul)', textAlign: 'right' }}>
                  Total {nombre}:
                </td>
                <td colSpan={1} />
                <td style={{ display: 'none' }} />
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {/* Resumen anual al final */}
      {porMes.length > 0 && (
        <div style={{ background: 'var(--azul)', borderRadius: 'var(--radio)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
            📊 Total pagado en {anoFiltro}
          </span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '20px' }}>
            B/. {totalAno.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [tab, setTab] = useState('dispositivos');
  const [cargando, setCargando] = useState(true);

  function cargar() {
    api.get(`/clientes/${id}`).then(r => {
      setCliente(r.data.data);
      setCargando(false);
    }).catch(() => navigate('/clientes'));
  }

  useEffect(() => { cargar(); }, [id]);

  async function cambiarEstado(nuevoEstado) {
    if (!window.confirm(`¿Cambiar estado a "${nuevoEstado}"?`)) return;
    try {
      await api.put(`/clientes/${id}/estado`, { estado: nuevoEstado });
      toast.success(`Estado actualizado a: ${nuevoEstado}`);
      cargar();
    } catch (err) {
      toast.error('Error cambiando estado');
    }
  }

  if (cargando) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gris)' }}>Cargando...</div>;
  if (!cliente) return null;

  const TABS = [
    { key: 'dispositivos', label: `📡 Dispositivos (${cliente.dispositivos?.length || 0})` },
    { key: 'pagos',        label: `💳 Pagos (${cliente.pagos?.length || 0})` },
    { key: 'estado-cuenta',label: '📄 Estado de Cuenta' },
    { key: 'facturas',     label: `🧾 Facturas (${cliente.facturas?.length || 0})` },
    ...(cliente.notas_internas ? [{ key: 'notas', label: '📝 Notas' }] : []),
  ];

  const tabStyle = (activo) => ({
    padding: '8px 14px',
    background: activo ? 'var(--azul)' : 'white',
    color: activo ? 'white' : '#374151',
    border: '1px solid var(--borde)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: activo ? 600 : 400,
    whiteSpace: 'nowrap'
  });

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '24px' }}>
        <button onClick={() => navigate('/clientes')}
          style={{ padding: '7px 12px', background: 'white', border: '1px solid var(--borde)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          ← Volver
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{cliente.nombre_razon_social}</h1>
            <AlertaBadge estado={cliente.estado} />
          </div>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>
            {cliente.tipo_cliente} · RUC: {cliente.ruc || 'N/A'} · {cliente.provincia || 'Sin provincia'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {cliente.whatsapp && <WhatsAppButton numero={cliente.whatsapp} label={cliente.whatsapp} />}
          <select
            value={cliente.estado}
            onChange={e => cambiarEstado(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Info general */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Teléfono', valor: cliente.telefono_principal || '—' },
          { label: 'Email', valor: cliente.email || '—' },
          { label: 'Dirección', valor: cliente.direccion || '—' },
          { label: 'Dispositivos activos', valor: cliente.dispositivos?.length || 0 },
        ].map(item => (
          <div key={item.label} style={{ background: 'white', borderRadius: 'var(--radio)', padding: '14px 16px', boxShadow: 'var(--sombra)' }}>
            <p style={{ fontSize: '11px', color: 'var(--gris)', fontWeight: 500, marginBottom: '4px' }}>{item.label}</p>
            <p style={{ fontSize: '13px', fontWeight: 600 }}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={tabStyle(tab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido de tab */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>

        {/* ── Dispositivos ── */}
        {tab === 'dispositivos' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['Serial GPS', 'SIM Card', 'Placa', 'Modelo', 'Tipo', 'Estado'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {!cliente.dispositivos?.length ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--gris)' }}>Sin dispositivos asignados</td></tr>
              ) : cliente.dispositivos.map(d => (
                <tr key={d.id}>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{d.serial_gps}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.simcard || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.placa_vehiculo || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.modelo_auto || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{d.tipo_producto}</td>
                  <td style={{ padding: '10px 14px' }}><AlertaBadge estado={d.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Pagos ── */}
        {tab === 'pagos' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['Fecha', 'Monto', 'Método', 'Registrado por', 'Notas'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {!cliente.pagos?.length ? (
                <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--gris)' }}>Sin pagos registrados</td></tr>
              ) : cliente.pagos.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: '10px 14px', fontSize: '13px' }}>{new Date(p.fecha_pago).toLocaleDateString('es-PA')}</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>B/. {parseFloat(p.monto).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.metodo}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.registrado_por_nombre || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.notas || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Estado de Cuenta ── */}
        {tab === 'estado-cuenta' && (
          <EstadoCuentaTab
            clienteId={id}
            pagos={cliente.pagos || []}
            contrato={cliente.contratos?.[0] || null}
            cliente={cliente}
          />
        )}

        {/* ── Facturas ── */}
        {tab === 'facturas' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['Número', 'Fecha', 'Total', 'Estado'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {!cliente.facturas?.length ? (
                <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--gris)' }}>Sin facturas</td></tr>
              ) : cliente.facturas.map(f => (
                <tr key={f.id}>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>{f.numero_factura}</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px' }}>{new Date(f.fecha_emision).toLocaleDateString('es-PA')}</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>B/. {parseFloat(f.total).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px' }}><AlertaBadge estado={f.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Notas internas ── */}
        {tab === 'notas' && (
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap' }}>
              {cliente.notas_internas}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
