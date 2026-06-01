import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';
import ExportButton from '../components/ExportButton';
import WhatsAppButton from '../components/WhatsAppButton';

const ESTADOS_LEAD = ['nuevo', 'contactado', 'interesado', 'cerrado', 'perdido'];
const PROVINCIAS = ['Panamá', 'Colón', 'Chiriquí', 'Bocas del Toro', 'Veraguas', 'Herrera', 'Los Santos', 'Coclé', 'Darién', 'Panamá Oeste'];

function ModalLead({ lead, usuarios, onGuardar, onCerrar }) {
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(lead || {
    nombre: '', telefono: '', whatsapp: '', email: '',
    tipo_gps_consultado: '', provincia: '', fecha_contacto: hoy,
    atendido_por: '', estado: 'nuevo', notas: ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/leads/${form.id}`, form);
        toast.success('Lead actualizado');
      } else {
        await api.post('/leads', form);
        toast.success('Lead creado');
      }
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando lead');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--sombra-md)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>
          {form.id ? 'Editar lead' : 'Nuevo lead'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            {[['Teléfono', 'telefono'], ['WhatsApp', 'whatsapp'], ['Email', 'email']].map(([label, key]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>{label}</label>
                <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>GPS consultado</label>
              <input value={form.tipo_gps_consultado || ''} onChange={e => setForm({ ...form, tipo_gps_consultado: e.target.value })}
                placeholder="GPS Fijo, Portátil, etc."
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Provincia</label>
              <select value={form.provincia || ''} onChange={e => setForm({ ...form, provincia: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="">Seleccionar</option>
                {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Fecha contacto</label>
              <input type="date" value={form.fecha_contacto} onChange={e => setForm({ ...form, fecha_contacto: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                {ESTADOS_LEAD.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Atendido por</label>
              <select value={form.atendido_por || ''} onChange={e => setForm({ ...form, atendido_por: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
                <option value="">Seleccionar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
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
              {form.id ? 'Actualizar' : 'Crear lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');

  function cargar() {
    setCargando(true);
    const params = filtroEstado ? `?estado=${filtroEstado}` : '';
    Promise.all([
      api.get(`/leads${params}`),
      api.get('/auth/me').then(r => [r.data.data])
    ]).then(([l]) => {
      setLeads(l.data.data);
      setCargando(false);
    }).catch(() => setCargando(false));
    api.get('/leads').then(() => {}).catch(() => {});
  }

  useEffect(() => {
    cargar();
    // Obtener lista de usuarios para el formulario
    // [Supuesto: usar los datos del usuario actual como base]
    const u = localStorage.getItem('usuario');
    if (u) setUsuarios([JSON.parse(u)]);
  }, [filtroEstado]);

  async function convertir(id, nombre) {
    if (!window.confirm(`¿Convertir "${nombre}" a cliente?`)) return;
    try {
      await api.post(`/leads/${id}/convertir`);
      toast.success('Lead convertido a cliente');
      cargar();
    } catch (err) {
      toast.error('Error convirtiendo lead');
    }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead eliminado');
      cargar();
    } catch (err) {
      toast.error('Error eliminando lead');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Leads — Pipeline</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportButton modulo="leads" />
          <button onClick={() => setModal({})}
            style={{ padding: '8px 18px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            + Nuevo lead
          </button>
        </div>
      </div>

      {/* Filtros por estado (kanban-style) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => setFiltroEstado('')}
          style={{ padding: '6px 14px', background: !filtroEstado ? 'var(--azul)' : 'white', color: !filtroEstado ? 'white' : '#374151', border: '1px solid var(--borde)', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: !filtroEstado ? 600 : 400 }}>
          Todos ({leads.length})
        </button>
        {ESTADOS_LEAD.map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            style={{ padding: '6px 14px', background: filtroEstado === e ? 'var(--azul)' : 'white', color: filtroEstado === e ? 'white' : '#374151', border: '1px solid var(--borde)', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: filtroEstado === e ? 600 : 400, textTransform: 'capitalize' }}>
            {e}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            {['Nombre', 'Teléfono', 'GPS Consultado', 'Provincia', 'Fecha', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>Cargando...</td></tr>
            ) : leads.map((l, i) => (
              <tr key={l.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500 }}>
                  {l.nombre}
                  {l.email && <div style={{ fontSize: '11px', color: 'var(--gris)' }}>{l.email}</div>}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                  <div>{l.telefono || '—'}</div>
                  {l.whatsapp && <WhatsAppButton numero={l.whatsapp} size="sm" label="" />}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{l.tipo_gps_consultado || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{l.provincia || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: '12px' }}>{new Date(l.fecha_contacto).toLocaleDateString('es-PA')}</td>
                <td style={{ padding: '10px 14px' }}>
                  <select value={l.estado} onChange={async e => {
                    await api.put(`/leads/${l.id}`, { ...l, estado: e.target.value });
                    cargar();
                  }}
                    style={{ padding: '3px 8px', border: '1px solid var(--borde)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    {ESTADOS_LEAD.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setModal(l)}
                      style={{ padding: '4px 8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      Editar
                    </button>
                    {l.estado !== 'cerrado' && (
                      <button onClick={() => convertir(l.id, l.nombre)}
                        style={{ padding: '4px 8px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        → Cliente
                      </button>
                    )}
                    <button onClick={() => eliminar(l.id)}
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
          {leads.length} lead(s)
        </div>
      </div>

      {modal !== null && (
        <ModalLead
          lead={modal.id ? modal : null}
          usuarios={usuarios}
          onGuardar={() => { setModal(null); cargar(); }}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
