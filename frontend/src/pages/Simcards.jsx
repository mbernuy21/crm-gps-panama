// Módulo de SIM Cards / Líneas — GPS Tracker Panamá
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import ExportButton from '../components/ExportButton';

const ESTADO_COLORES = {
  disponible: { bg: '#dcfce7', color: '#16a34a', label: 'Disponible', icono: '🟢' },
  asignada:   { bg: '#dbeafe', color: '#2563eb', label: 'Asignada', icono: '🔵' },
  suspendida: { bg: '#fef3c7', color: '#d97706', label: 'Suspendida', icono: '🟡' },
  duplicada:  { bg: '#fee2e2', color: '#dc2626', label: 'Duplicada', icono: '🔴' },
  baja:       { bg: '#f3f4f6', color: '#6b7280', label: 'Baja', icono: '⚫' },
};

const SIM_VACIA = { numero: '', operador: '', iccid: '', plan: '', estado: 'disponible', notas: '' };

export default function Simcards() {
  const [sims, setSims] = useState([]);
  const [stats, setStats] = useState({});
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(SIM_VACIA);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [modalImport, setModalImport] = useState(false);
  const [textoImport, setTextoImport] = useState('');
  const [operadorImport, setOperadorImport] = useState('');
  const [importando, setImportando] = useState(false);

  const mob = window.innerWidth < 768;

  useEffect(() => { cargar(); cargarStats(); /* eslint-disable-next-line */ }, [filtroEstado]);

  async function cargar() {
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (buscar) params.buscar = buscar;
      const r = await api.get('/simcards', { params });
      setSims(r.data.data || []);
    } catch { toast.error('Error cargando SIM cards'); }
    finally { setCargando(false); }
  }

  async function cargarStats() {
    try { const r = await api.get('/simcards/stats'); setStats(r.data.data || {}); } catch {}
  }

  function abrirNueva() { setForm(SIM_VACIA); setEditandoId(null); setModal(true); }
  function abrirEditar(s) {
    setForm({ numero: s.numero, operador: s.operador || '', iccid: s.iccid || '', plan: s.plan || '', estado: s.estado, notas: s.notas || '' });
    setEditandoId(s.id); setModal(true);
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.numero.trim()) return toast.error('El número de línea es requerido');
    setGuardando(true);
    try {
      if (editandoId) { await api.put(`/simcards/${editandoId}`, form); toast.success('SIM actualizada'); }
      else { await api.post('/simcards', form); toast.success('SIM agregada'); }
      setModal(false); cargar(); cargarStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Error guardando'); }
    finally { setGuardando(false); }
  }

  async function eliminar(s) {
    if (!window.confirm(`¿Eliminar la línea ${s.numero}?`)) return;
    try { await api.delete(`/simcards/${s.id}`); toast.success('SIM eliminada'); cargar(); cargarStats(); }
    catch { toast.error('Error eliminando'); }
  }

  async function importar() {
    if (!textoImport.trim()) return toast.error('Pega la lista de números');
    setImportando(true);
    try {
      const r = await api.post('/simcards/importar', { lineas: textoImport, operador: operadorImport || null });
      toast.success(r.data.message);
      setModalImport(false); setTextoImport(''); setOperadorImport('');
      cargar(); cargarStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Error importando'); }
    finally { setImportando(false); }
  }

  const tarjetas = [
    { label: 'Total líneas', valor: stats.total || 0, color: '#4F6EF7' },
    { label: '🟢 Disponibles', valor: stats.disponibles || 0, color: '#16a34a' },
    { label: '🔵 Asignadas', valor: stats.asignadas || 0, color: '#2563eb' },
    { label: '🟡 Suspendidas', valor: stats.suspendidas || 0, color: '#d97706' },
    { label: '🔴 Duplicadas', valor: stats.duplicadas || 0, color: '#dc2626' },
  ];

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>SIM Cards / Líneas</h1>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>Control de líneas con contrato — disponibles vs. asignadas</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <ExportButton modulo="simcards" label="📊 Excel" />
          <button onClick={() => setModalImport(true)}
            style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
            📥 Importar lista
          </button>
          <button onClick={abrirNueva}
            style={{ background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
            + Agregar SIM
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {tarjetas.map((t, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: 'var(--sombra)' }}>
            <div style={{ fontSize: '12px', color: 'var(--gris)', marginBottom: '6px' }}>{t.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: t.color }}>{t.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar()}
          placeholder="🔍 Buscar número, ICCID u operador..."
          style={{ flex: '1 1 220px', padding: '9px 14px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '14px' }}
        />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '14px' }}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_COLORES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={cargar} style={{ padding: '9px 16px', background: '#f3f4f6', border: '1px solid var(--borde)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Buscar</button>
      </div>

      {/* Lista de SIMs */}
      {cargando ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris)' }}>Cargando...</div>
      ) : sims.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris)', background: 'white', borderRadius: '12px' }}>
          No hay líneas. Usa "Importar lista" para subir tus 600+ números de una vez.
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--sombra)', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8faff', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Estado</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Número</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Operador</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Asignada a (GPS / Cliente)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sims.map(s => {
                const est = ESTADO_COLORES[s.estado] || ESTADO_COLORES.disponible;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: est.bg, color: est.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {est.icono} {est.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>{s.numero}</td>
                    <td style={{ padding: '10px 14px', color: '#555' }}>{s.operador || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#555' }}>
                      {s.serial_gps ? (
                        <span>{s.serial_gps}{s.placa_vehiculo ? ` (${s.placa_vehiculo})` : ''}{s.cliente_nombre ? ` — ${s.cliente_nombre}` : ''}</span>
                      ) : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Libre</span>}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => abrirEditar(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '8px' }} title="Editar">✏️</button>
                      <button onClick={() => eliminar(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Eliminar">🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modal && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <form onSubmit={guardar} style={modalCaja}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>{editandoId ? 'Editar SIM' : 'Nueva SIM'}</h2>
            <Campo label="Número de línea *"><input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} style={inp} required /></Campo>
            <Campo label="Operador"><input value={form.operador} onChange={e => setForm({ ...form, operador: e.target.value })} placeholder="Tigo, +Móvil, Digicel..." style={inp} /></Campo>
            <Campo label="ICCID"><input value={form.iccid} onChange={e => setForm({ ...form, iccid: e.target.value })} style={inp} /></Campo>
            <Campo label="Plan"><input value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} style={inp} /></Campo>
            <Campo label="Estado">
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} style={inp}>
                {Object.entries(ESTADO_COLORES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Campo>
            <Campo label="Notas"><textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} style={{ ...inp, minHeight: '60px' }} /></Campo>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="button" onClick={() => setModal(false)} style={btnSec}>Cancelar</button>
              <button type="submit" disabled={guardando} style={btnPrim}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Importar masivo */}
      {modalImport && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setModalImport(false)}>
          <div style={{ ...modalCaja, maxWidth: '520px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>📥 Importar líneas masivamente</h2>
            <p style={{ fontSize: '13px', color: 'var(--gris)', marginBottom: '14px' }}>
              Pega tu lista de números (uno por línea, o separados por coma). Los duplicados se omiten automáticamente. Ideal para tus 600+ líneas.
            </p>
            <Campo label="Operador (opcional, se aplica a todas)">
              <input value={operadorImport} onChange={e => setOperadorImport(e.target.value)} placeholder="Ej: +Móvil" style={inp} />
            </Campo>
            <Campo label="Números de línea">
              <textarea value={textoImport} onChange={e => setTextoImport(e.target.value)}
                placeholder={"6000-0000\n6000-0001\n6000-0002\n..."}
                style={{ ...inp, minHeight: '180px', fontFamily: 'monospace', fontSize: '13px' }} />
            </Campo>
            <div style={{ fontSize: '12px', color: 'var(--gris)', marginBottom: '12px' }}>
              {textoImport.split(/[\n,;]+/).filter(n => n.trim()).length} números detectados
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setModalImport(false)} style={btnSec}>Cancelar</button>
              <button onClick={importar} disabled={importando} style={{ ...btnPrim, background: '#16a34a' }}>
                {importando ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponentes y estilos
function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '5px' }}>{label}</label>
      {children}
    </div>
  );
}
const inp = { width: '100%', padding: '9px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' };
const modalCaja = { background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const btnPrim = { flex: 1, padding: '11px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' };
const btnSec = { flex: 1, padding: '11px', background: '#f3f4f6', color: '#374151', border: '1px solid var(--borde)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' };
