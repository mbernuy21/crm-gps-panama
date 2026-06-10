// Módulo de Auditoría — historial de quién hizo cada cambio en el CRM
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import ExportButton from '../components/ExportButton';

const ACCION_COLORES = {
  crear:          { bg: '#dcfce7', color: '#16a34a', label: 'Creó', icono: '➕' },
  editar:         { bg: '#dbeafe', color: '#2563eb', label: 'Editó', icono: '✏️' },
  eliminar:       { bg: '#fee2e2', color: '#dc2626', label: 'Eliminó', icono: '🗑️' },
  cambiar_estado: { bg: '#fef3c7', color: '#d97706', label: 'Cambió estado', icono: '🔄' },
};

const ENTIDADES = ['cliente', 'dispositivo', 'contrato', 'pago', 'simcard'];

export default function Auditoria() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEntidad, setFiltroEntidad] = useState('');

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [filtroEntidad]);

  async function cargar() {
    setCargando(true);
    try {
      const params = {};
      if (filtroEntidad) params.entidad = filtroEntidad;
      const r = await api.get('/auditoria', { params });
      setRegistros(r.data.data || []);
    } catch { toast.error('Error cargando auditoría'); }
    finally { setCargando(false); }
  }

  function fechaHora(f) {
    const d = new Date(f);
    return d.toLocaleString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function verificarEmail() {
    try {
      const r = await api.get('/reportes/diagnostico-email');
      if (r.data.configurado) toast.success(r.data.message, { autoClose: 6000 });
      else toast.warning(r.data.message, { autoClose: 8000 });
    } catch { toast.error('Error verificando email'); }
  }

  async function enviarReporteAhora() {
    toast.info('Generando y enviando reporte...', { autoClose: 2000 });
    try {
      const r = await api.post('/reportes/semanal');
      toast.success(r.data.message, { autoClose: 6000 });
    } catch (err) { toast.error(err.response?.data?.message || 'Error enviando reporte'); }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>🛡️ Auditoría y respaldos</h1>
        <p style={{ color: 'var(--gris)', fontSize: '13px' }}>Quién hizo cada cambio + respaldo de datos a Excel</p>
      </div>

      {/* Panel de respaldo de datos */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '18px', boxShadow: 'var(--sombra)', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>📦 Respaldo de la base de datos (Excel)</h3>
        <p style={{ fontSize: '12px', color: 'var(--gris)', marginBottom: '12px' }}>
          Descarga tus datos en Excel cuando quieras. Recomendado: hazlo cada semana como respaldo.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <ExportButton modulo="clientes" label="👥 Clientes" />
          <ExportButton modulo="contratos" label="📋 Contratos" />
          <ExportButton modulo="pagos" label="💳 Pagos" />
          <ExportButton modulo="dispositivos" label="📡 Dispositivos" />
          <ExportButton modulo="simcards" label="📱 SIMs" />
          <ExportButton modulo="leads" label="🎯 Leads" />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--borde)' }}>
          <button onClick={verificarEmail}
            style={{ padding: '8px 14px', background: '#f3f4f6', border: '1px solid var(--borde)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            🔍 Verificar email semanal
          </button>
          <button onClick={enviarReporteAhora}
            style={{ padding: '8px 14px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            ✉️ Enviar reporte ahora
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Actividad reciente</h3>

      {/* Filtros por tipo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => setFiltroEntidad('')}
          style={chip(filtroEntidad === '')}>Todo</button>
        {ENTIDADES.map(e => (
          <button key={e} onClick={() => setFiltroEntidad(e)} style={chip(filtroEntidad === e)}>
            {e.charAt(0).toUpperCase() + e.slice(1)}s
          </button>
        ))}
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris)' }}>Cargando...</div>
      ) : registros.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris)', background: 'white', borderRadius: '12px' }}>
          Aún no hay actividad registrada. Cuando alguien cree o edite datos, aparecerá aquí.
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--sombra)' }}>
          {registros.map((r, i) => {
            const acc = ACCION_COLORES[r.accion] || ACCION_COLORES.editar;
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', borderBottom: i < registros.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>{acc.icono}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: '#111827' }}>
                    <strong>{r.usuario_nombre || 'Sistema'}</strong> — {r.descripcion}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gris)', marginTop: '2px' }}>
                    <span style={{ background: acc.bg, color: acc.color, padding: '1px 8px', borderRadius: '10px', fontWeight: 600, marginRight: '8px' }}>{acc.label}</span>
                    {fechaHora(r.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function chip(activo) {
  return {
    padding: '7px 14px',
    background: activo ? 'var(--azul)' : '#f3f4f6',
    color: activo ? 'white' : '#374151',
    border: 'none', borderRadius: '20px', cursor: 'pointer',
    fontSize: '13px', fontWeight: 600
  };
}
