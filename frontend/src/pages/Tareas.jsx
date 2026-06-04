// Módulo de Tareas Pendientes — GPS Tracker Panamá
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import ModalConfirmar from '../components/ModalConfirmar';

const PRIORIDAD_COLORES = {
  alta:  { bg: '#fee2e2', color: '#dc2626', label: 'Alta' },
  media: { bg: '#fef3c7', color: '#d97706', label: 'Media' },
  baja:  { bg: '#f3f4f6', color: '#6b7280', label: 'Baja' },
};

const ESTADO_COLORES = {
  pendiente:    { bg: '#fef3c7', color: '#d97706', label: 'Pendiente' },
  en_progreso:  { bg: '#dbeafe', color: '#2563eb', label: 'En Progreso' },
  completada:   { bg: '#dcfce7', color: '#16a34a', label: 'Completada' },
};

const TAREA_VACIA = { titulo: '', descripcion: '', cliente_id: '', fecha_limite: '', prioridad: 'media', estado: 'pendiente' };

export default function Tareas() {
  const [tareas, setTareas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(TAREA_VACIA);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState({ visible: false, id: null, titulo: '' });

  useEffect(() => { cargar(); cargarClientes(); }, []);

  async function cargar() {
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroPrioridad) params.prioridad = filtroPrioridad;
      const r = await api.get('/tareas', { params });
      setTareas(r.data.data || []);
    } catch { toast.error('Error cargando tareas'); }
    finally { setCargando(false); }
  }

  async function cargarClientes() {
    try {
      const r = await api.get('/clientes');
      setClientes(r.data.data || []);
    } catch {}
  }

  useEffect(() => { if (!cargando) cargar(); }, [filtroEstado, filtroPrioridad]);

  function abrirNueva() {
    setForm(TAREA_VACIA);
    setEditandoId(null);
    setModal(true);
  }

  function abrirEditar(t) {
    setForm({
      titulo: t.titulo,
      descripcion: t.descripcion || '',
      cliente_id: t.cliente_id || '',
      fecha_limite: t.fecha_limite ? t.fecha_limite.substring(0, 10) : '',
      prioridad: t.prioridad,
      estado: t.estado,
    });
    setEditandoId(t.id);
    setModal(true);
  }

  async function guardar() {
    if (!form.titulo.trim()) { toast.error('El título es requerido'); return; }
    setGuardando(true);
    try {
      if (editandoId) {
        await api.put(`/tareas/${editandoId}`, form);
        toast.success('Tarea actualizada');
      } else {
        await api.post('/tareas', form);
        toast.success('Tarea creada ✅');
      }
      setModal(false);
      cargar();
    } catch { toast.error('Error guardando tarea'); }
    finally { setGuardando(false); }
  }

  async function completar(id) {
    try {
      await api.patch(`/tareas/${id}/completar`);
      toast.success('¡Tarea completada! ✅');
      cargar();
    } catch { toast.error('Error'); }
  }

  async function eliminar() {
    try {
      await api.delete(`/tareas/${confirmar.id}`);
      toast.success('Tarea eliminada');
      setConfirmar({ visible: false, id: null, titulo: '' });
      cargar();
    } catch { toast.error('Error eliminando tarea'); }
  }

  // Estadísticas rápidas
  const stats = {
    total: tareas.length,
    pendientes: tareas.filter(t => t.estado === 'pendiente').length,
    en_progreso: tareas.filter(t => t.estado === 'en_progreso').length,
    vencidas: tareas.filter(t => t.estado !== 'completada' && t.fecha_limite && new Date(t.fecha_limite) < new Date()).length,
  };

  if (cargando) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gris)' }}>Cargando...</div>;

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Tareas Pendientes</h1>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>Organiza y da seguimiento a las tareas del equipo</p>
        </div>
        <button
          onClick={abrirNueva}
          style={{ background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
        >
          + Nueva Tarea
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total', valor: stats.total, color: '#4F6EF7', icono: '📋' },
          { label: 'Pendientes', valor: stats.pendientes, color: '#d97706', icono: '⏳' },
          { label: 'En Progreso', valor: stats.en_progreso, color: '#2563eb', icono: '🔄' },
          { label: 'Vencidas', valor: stats.vencidas, color: '#dc2626', icono: '🚨' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: 'var(--radio)', padding: '16px', boxShadow: 'var(--sombra)', borderLeft: `4px solid ${k.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--gris)', fontWeight: 500 }}>{k.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 700 }}>{k.valor}</p>
              </div>
              <span style={{ fontSize: '24px' }}>{k.icono}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '16px', boxShadow: 'var(--sombra)', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }}>
          <option value=''>Todos los estados</option>
          {Object.entries(ESTADO_COLORES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }}>
          <option value=''>Todas las prioridades</option>
          {Object.entries(PRIORIDAD_COLORES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Lista de tareas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tareas.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '48px', textAlign: 'center', boxShadow: 'var(--sombra)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <p style={{ fontWeight: 600 }}>No hay tareas {filtroEstado || filtroPrioridad ? 'con esos filtros' : 'pendientes'}</p>
            <button onClick={abrirNueva}
              style={{ marginTop: '16px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
              + Crear primera tarea
            </button>
          </div>
        ) : (
          tareas.map(t => {
            const pColor = PRIORIDAD_COLORES[t.prioridad] || PRIORIDAD_COLORES.media;
            const eColor = ESTADO_COLORES[t.estado] || ESTADO_COLORES.pendiente;
            const vencida = t.estado !== 'completada' && t.fecha_limite && new Date(t.fecha_limite) < new Date();
            const diasRestantes = t.dias_restantes !== null ? parseInt(t.dias_restantes) : null;

            return (
              <div key={t.id} style={{
                background: 'white', borderRadius: 'var(--radio)', padding: '16px',
                boxShadow: 'var(--sombra)', display: 'flex', gap: '16px', alignItems: 'flex-start',
                borderLeft: `4px solid ${vencida ? '#dc2626' : pColor.color}`,
                opacity: t.estado === 'completada' ? 0.6 : 1
              }}>
                {/* Check button */}
                <button
                  onClick={() => t.estado !== 'completada' && completar(t.id)}
                  title="Marcar como completada"
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${t.estado === 'completada' ? '#16a34a' : '#d1d5db'}`,
                    background: t.estado === 'completada' ? '#dcfce7' : 'white',
                    cursor: t.estado !== 'completada' ? 'pointer' : 'default',
                    fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {t.estado === 'completada' ? '✓' : ''}
                </button>

                {/* Contenido */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: t.estado === 'completada' ? 'var(--gris)' : '#111827',
                      textDecoration: t.estado === 'completada' ? 'line-through' : 'none' }}>
                      {t.titulo}
                    </span>
                    <span style={{ background: pColor.bg, color: pColor.color, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                      {pColor.label}
                    </span>
                    <span style={{ background: eColor.bg, color: eColor.color, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                      {eColor.label}
                    </span>
                    {vencida && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>⚠️ Vencida</span>}
                  </div>
                  {t.descripcion && <p style={{ fontSize: '13px', color: 'var(--gris)', marginBottom: '6px' }}>{t.descripcion}</p>}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--gris)' }}>
                    {t.nombre_cliente && <span>👤 {t.nombre_cliente}</span>}
                    {t.fecha_limite && (
                      <span style={{ color: vencida ? '#dc2626' : diasRestantes === 0 ? '#d97706' : 'var(--gris)', fontWeight: vencida ? 600 : 400 }}>
                        📅 {new Date(t.fecha_limite).toLocaleDateString('es-PA')}
                        {diasRestantes !== null && (
                          <span> ({diasRestantes === 0 ? '¡hoy!' : diasRestantes < 0 ? `${Math.abs(diasRestantes)} días vencida` : `${diasRestantes} días`})</span>
                        )}
                      </span>
                    )}
                    {t.creado_por_nombre && <span>✍️ {t.creado_por_nombre}</span>}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {t.estado !== 'completada' && (
                    <button onClick={() => abrirEditar(t)} title="Editar"
                      style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}>
                      ✏️
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmar({ visible: true, id: t.id, titulo: t.titulo })}
                    title="Eliminar"
                    style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal nueva/editar tarea */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '480px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              {editandoId ? 'Editar Tarea' : 'Nueva Tarea'}
            </h2>

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Título *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="¿Qué hay que hacer?"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '14px', marginBottom: '14px', boxSizing: 'border-box' }} />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Detalles adicionales..."
              rows={3}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '14px', marginBottom: '14px', resize: 'vertical', boxSizing: 'border-box' }} />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Cliente (opcional)</label>
            <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '14px', marginBottom: '14px', boxSizing: 'border-box' }}>
              <option value=''>— Sin cliente (tarea general) —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Fecha Límite</label>
                <input type="date" value={form.fecha_limite} onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Prioridad</label>
                <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                  <option value='baja'>Baja</option>
                  <option value='media'>Media</option>
                  <option value='alta'>Alta</option>
                </select>
              </div>
            </div>

            {editandoId && (
              <>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Estado</label>
                <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '14px', marginBottom: '14px', boxSizing: 'border-box' }}>
                  <option value='pendiente'>Pendiente</option>
                  <option value='en_progreso'>En Progreso</option>
                  <option value='completada'>Completada</option>
                </select>
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setModal(false)}
                style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                style={{ flex: 1, padding: '10px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Crear Tarea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      <ModalConfirmar
        visible={confirmar.visible}
        titulo="¿Eliminar tarea?"
        mensaje={`La tarea "${confirmar.titulo}" será eliminada permanentemente.`}
        onConfirmar={eliminar}
        onCancelar={() => setConfirmar({ visible: false, id: null, titulo: '' })}
      />
    </div>
  );
}
