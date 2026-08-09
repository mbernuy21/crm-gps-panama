// Gestión de sub-agentes — solo visible para admins
// Permite crear/editar sub-agentes y asignarles SIM cards del inventario
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

// ── Modal crear/editar sub-agente ────────────────────────────────────────────
function ModalAgente({ agente, onGuardar, onCerrar }) {
  const esNuevo = !agente?.id;
  const [form, setForm] = useState({
    nombre: agente?.nombre || '',
    email: agente?.email || '',
    password: '',
    activo: agente?.activo !== undefined ? agente.activo : 1,
  });
  const [guardando, setGuardando] = useState(false);

  function cambiar(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.email.trim()) {
      toast.error('Nombre y email son requeridos');
      return;
    }
    if (esNuevo && !form.password) {
      toast.error('La contraseña es requerida para el nuevo agente');
      return;
    }
    setGuardando(true);
    try {
      if (esNuevo) {
        await api.post('/agentes', form);
        toast.success('Sub-agente creado correctamente');
      } else {
        await api.put(`/agentes/${agente.id}`, form);
        toast.success('Sub-agente actualizado');
      }
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando');
    } finally { setGuardando(false); }
  }

  const inp = { border: '1px solid #d1d5db', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
  const lbl = { fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '460px', maxWidth: '95%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{esNuevo ? '➕ Nuevo Sub-Agente' : '✏️ Editar Sub-Agente'}</h2>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={lbl}>Nombre completo</label>
            <input name="nombre" value={form.nombre} onChange={cambiar} placeholder="Ej: Jean Pierre Bernuy" style={inp} />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input name="email" type="email" value={form.email} onChange={cambiar} placeholder="jeanpierre@gpstrackerpanama.com" style={inp} />
          </div>
          <div>
            <label style={lbl}>{esNuevo ? 'Contraseña' : 'Nueva contraseña (dejar vacío = no cambiar)'}</label>
            <input name="password" type="password" value={form.password} onChange={cambiar} placeholder={esNuevo ? 'Mínimo 6 caracteres' : '(sin cambios)'} style={inp} />
          </div>
          {!esNuevo && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" name="activo" checked={form.activo === 1} onChange={cambiar} />
              <span>Cuenta activa (puede ingresar al CRM)</span>
            </label>
          )}

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#1e40af' }}>
            <strong>📋 Permisos del sub-agente:</strong>
            <ul style={{ margin: '6px 0 0 16px', lineHeight: 1.9 }}>
              <li>✅ Crear y ver sus propios clientes</li>
              <li>✅ Crear contratos y registrar pagos</li>
              <li>✅ Crear dispositivos GPS</li>
              <li>✅ Ver SIM cards que tú le asignes</li>
              <li>❌ No ve clientes ni datos del admin</li>
              <li>❌ No accede a Inventario, Auditoría ni Configuración</li>
            </ul>
          </div>

          <button onClick={guardar} disabled={guardando}
            style={{ padding: '11px', background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
            {guardando ? '⏳ Guardando...' : (esNuevo ? '✅ Crear Sub-Agente' : '💾 Guardar Cambios')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal asignar SIM cards a un agente ──────────────────────────────────────
function ModalAsignarSIM({ agente, onCerrar, onActualizar }) {
  const [simsAgente, setSimsAgente] = useState([]);
  const [simsDisponibles, setSimsDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get(`/agentes/${agente.id}/simcards`),
        api.get('/agentes/simcards/disponibles'),
      ]);
      setSimsAgente(r1.data.data || []);
      setSimsDisponibles(r2.data.data || []);
    } catch { toast.error('Error cargando SIM cards'); }
    finally { setCargando(false); }
  }

  async function asignar(simId) {
    try {
      await api.post('/agentes/asignar-simcard', { simcard_id: simId, agente_id: agente.id });
      toast.success('SIM asignada');
      cargar();
      onActualizar();
    } catch (err) { toast.error(err.response?.data?.message || 'Error asignando SIM'); }
  }

  async function quitar(simId) {
    try {
      await api.delete(`/agentes/simcard/${simId}/quitar`);
      toast.success('SIM desasignada');
      cargar();
      onActualizar();
    } catch { toast.error('Error desasignando SIM'); }
  }

  const badgeEstado = (e) => {
    const colores = { disponible: '#16a34a', asignada: '#4F6EF7', suspendida: '#f59e0b', duplicada: '#dc2626', baja: '#6b7280' };
    return (
      <span style={{ background: colores[e] || '#9ca3af', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{e}</span>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '680px', maxWidth: '95%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📱 SIM Cards — {agente.nombre}</h2>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Asigna las líneas disponibles que podrá usar este agente</p>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        {cargando ? <p style={{ textAlign: 'center', color: '#9ca3af' }}>Cargando...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* SIMs ya asignadas al agente */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
                ✅ Asignadas a {agente.nombre} ({simsAgente.length})
              </h3>
              {simsAgente.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>Ninguna SIM asignada aún</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {simsAgente.map(s => (
                    <div key={s.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{s.numero}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.operador} {badgeEstado(s.estado)}</div>
                        {s.cliente_nombre && <div style={{ fontSize: '11px', color: '#4F6EF7' }}>📡 {s.cliente_nombre}</div>}
                      </div>
                      {s.estado === 'disponible' && (
                        <button onClick={() => quitar(s.id)}
                          style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                          Quitar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SIMs disponibles para asignar */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
                🔓 Disponibles para asignar ({simsDisponibles.length})
              </h3>
              {simsDisponibles.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No hay SIM cards disponibles sin asignar</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {simsDisponibles.map(s => (
                    <div key={s.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{s.numero}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.operador} {badgeEstado(s.estado)}</div>
                      </div>
                      <button onClick={() => asignar(s.id)}
                        style={{ background: '#dcfce7', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                        Asignar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal de Agentes ───────────────────────────────────────────────
export default function Agentes() {
  const [agentes, setAgentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAgente, setModalAgente] = useState(null); // null | 'nuevo' | {agente}
  const [modalSIM, setModalSIM] = useState(null);       // null | {agente}

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try {
      const r = await api.get('/agentes');
      setAgentes(r.data.data || []);
    } catch { toast.error('Error cargando sub-agentes'); }
    finally { setCargando(false); }
  }

  async function desactivar(agente) {
    if (!window.confirm(`¿Desactivar la cuenta de ${agente.nombre}? Podrás reactivarla después.`)) return;
    try {
      await api.delete(`/agentes/${agente.id}`);
      toast.success('Sub-agente desactivado');
      cargar();
    } catch { toast.error('Error desactivando'); }
  }

  async function reactivar(agente) {
    try {
      await api.put(`/agentes/${agente.id}`, { ...agente, activo: 1 });
      toast.success('Sub-agente reactivado');
      cargar();
    } catch { toast.error('Error reactivando'); }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>👥 Sub-Agentes</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
            Gestiona las cuentas de colaboradores — cada uno ve solo sus propios clientes y datos
          </p>
        </div>
        <button onClick={() => setModalAgente('nuevo')}
          style={{ background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
          + Nuevo Sub-Agente
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: '#1e40af' }}>
        <strong>💡 ¿Cómo funciona?</strong> Cada sub-agente entra al CRM con su propio usuario y solo ve los clientes, contratos y pagos que él mismo crea.
        Tú (admin) puedes asignarle SIM cards del inventario para que las use en nuevos dispositivos. El sub-agente <strong>no ve</strong> tus clientes ni tus datos.
      </div>

      {/* Lista de agentes */}
      {cargando ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Cargando sub-agentes...</p>
      ) : agentes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #e5e7eb', borderRadius: '12px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👤</div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>No hay sub-agentes aún</p>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>Crea el primero con el botón de arriba</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {agentes.map(ag => (
            <div key={ag.id} style={{
              background: 'white',
              border: `1px solid ${ag.activo ? '#e5e7eb' : '#fca5a5'}`,
              borderRadius: '12px',
              padding: '20px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              opacity: ag.activo ? 1 : 0.7,
            }}>
              {/* Avatar */}
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: ag.activo ? '#eff6ff' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', flexShrink: 0
              }}>
                👤
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 700, fontSize: '16px' }}>{ag.nombre}</span>
                  {!ag.activo && (
                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>INACTIVO</span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>✉️ {ag.email}</div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    <strong style={{ color: '#4F6EF7' }}>{ag.total_clientes}</strong> clientes
                  </span>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    <strong style={{ color: '#4F6EF7' }}>{ag.total_dispositivos}</strong> dispositivos
                  </span>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    <strong style={{ color: '#16a34a' }}>B/. {parseFloat(ag.cobros_mes || 0).toFixed(2)}</strong> este mes
                  </span>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    <strong style={{ color: '#f59e0b' }}>{ag.simcards_disponibles}</strong> SIM disponibles
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => setModalSIM(ag)}
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                  📱 SIM Cards
                </button>
                <button onClick={() => setModalAgente(ag)}
                  style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
                  ✏️ Editar
                </button>
                {ag.activo ? (
                  <button onClick={() => desactivar(ag)}
                    style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                    🔒 Desactivar
                  </button>
                ) : (
                  <button onClick={() => reactivar(ag)}
                    style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                    🔓 Reactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {modalAgente && (
        <ModalAgente
          agente={modalAgente === 'nuevo' ? null : modalAgente}
          onGuardar={() => { setModalAgente(null); cargar(); }}
          onCerrar={() => setModalAgente(null)}
        />
      )}
      {modalSIM && (
        <ModalAsignarSIM
          agente={modalSIM}
          onCerrar={() => setModalSIM(null)}
          onActualizar={cargar}
        />
      )}
    </div>
  );
}
