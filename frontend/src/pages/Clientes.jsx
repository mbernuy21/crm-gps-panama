import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';
import ExportButton from '../components/ExportButton';
import WhatsAppButton from '../components/WhatsAppButton';
import ModalConfirmar from '../components/ModalConfirmar';
import ImportarGoogleSheets from '../components/ImportarGoogleSheets';
import Paginacion from '../components/Paginacion';

const ITEMS_POR_PAGINA = 50;

const ESTADOS = ['activo', 'inactivo', 'moroso', 'suspendido', 'cortado'];
const PROVINCIAS = ['Panamá', 'Colón', 'Chiriquí', 'Bocas del Toro', 'Veraguas', 'Herrera', 'Los Santos', 'Coclé', 'Darién', 'Panamá Oeste'];

function ModalCliente({ cliente, onGuardar, onCerrar }) {
  const [form, setForm] = useState(cliente || {
    nombre_razon_social: '', tipo_cliente: 'natural', ruc: '',
    telefono_principal: '', whatsapp: '', email: '',
    direccion: '', provincia: '', estado: 'activo', notas_internas: ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/clientes/${form.id}`, form);
        toast.success('Cliente actualizado');
      } else {
        await api.post('/clientes', form);
        toast.success('Cliente creado');
      }
      onGuardar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando cliente');
    }
  }

  const campo = (label, key, tipo = 'text', opciones = null) => (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>{label}</label>
      {opciones ? (
        <select value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }}>
          {opciones.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
        </select>
      ) : (
        <input type={tipo} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--sombra-md)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>
          {form.id ? 'Editar cliente' : 'Nuevo cliente'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Nombre / Razón Social *</label>
              <input required value={form.nombre_razon_social} onChange={e => setForm({ ...form, nombre_razon_social: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
            </div>
            {campo('Tipo', 'tipo_cliente', 'text', [{ value: 'natural', label: 'Persona natural' }, { value: 'juridica', label: 'Persona jurídica' }])}
            {campo('RUC', 'ruc')}
            {campo('Teléfono', 'telefono_principal')}
            {campo('WhatsApp (con código país)', 'whatsapp')}
            {campo('Email', 'email', 'email')}
            {campo('Provincia', 'provincia', 'text', ['', ...PROVINCIAS])}
            {campo('Estado', 'estado', 'text', ESTADOS)}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Dirección</label>
            <input value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Notas internas</label>
            <textarea rows={2} value={form.notas_internas || ''} onChange={e => setForm({ ...form, notas_internas: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--borde)', borderRadius: '7px', fontSize: '13px', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCerrar}
              style={{ padding: '9px 20px', background: 'white', border: '1px solid var(--borde)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '9px 24px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              {form.id ? 'Actualizar' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Clientes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmar, setConfirmar] = useState({ visible: false, id: null, nombre: '' });
  const [importarModal, setImportarModal] = useState(false);
  const [filtros, setFiltros] = useState({ estado: searchParams.get('estado') || '', buscar: '', frecuencia: '', modalidad_gps: '' });
  const [pagina, setPagina] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(50);

  function cargar() {
    setCargando(true);
    const params = new URLSearchParams();
    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.buscar) params.append('buscar', filtros.buscar);
    if (filtros.frecuencia) params.append('frecuencia_contrato', filtros.frecuencia);
    if (filtros.modalidad_gps) params.append('modalidad_gps', filtros.modalidad_gps);

    api.get(`/clientes?${params}`).then(r => {
      setClientes(r.data.data);
      setCargando(false);
    }).catch(() => setCargando(false));
  }

  useEffect(() => { setPagina(1); cargar(); }, [filtros.estado, filtros.frecuencia, filtros.modalidad_gps]);

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => { setPagina(1); cargar(); }, 350);
    return () => clearTimeout(t);
  }, [filtros.buscar]);

  async function eliminar() {
    try {
      await api.delete(`/clientes/${confirmar.id}`);
      toast.success('Cliente eliminado');
      setConfirmar({ visible: false, id: null, nombre: '' });
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error eliminando cliente');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Clientes</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ExportButton modulo="clientes" filtros={{ estado: filtros.estado }} />
          <button onClick={() => setImportarModal(true)}
            style={{ padding: '8px 14px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            📊 Importar Sheets
          </button>
          <button onClick={() => setModal({})}
            style={{ padding: '8px 18px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '14px 16px', marginBottom: '16px', boxShadow: 'var(--sombra)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar por nombre, RUC, teléfono..."
          value={filtros.buscar}
          onChange={e => setFiltros({ ...filtros, buscar: e.target.value })}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }}
        />
        <select value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
          style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
        </select>
        <select value={filtros.frecuencia} onChange={e => setFiltros({ ...filtros, frecuencia: e.target.value })}
          style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }}>
          <option value="">Todas las frecuencias</option>
          <option value="mensual">Pago Mensual</option>
          <option value="semestral">Pago Semestral</option>
          <option value="anual">Pago Anual</option>
        </select>
        <select value={filtros.modalidad_gps} onChange={e => setFiltros({ ...filtros, modalidad_gps: e.target.value })}
          style={{ padding: '8px 12px', border: '1px solid var(--borde)', borderRadius: '8px', fontSize: '13px' }}>
          <option value="">GPS: todas las modalidades</option>
          <option value="alquiler">GPS en Alquiler</option>
          <option value="venta">GPS en Venta</option>
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Nombre / Razón Social', 'Teléfono / WhatsApp', 'Provincia', 'GPS', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid var(--borde)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>Cargando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--gris)' }}>No se encontraron clientes</td></tr>
            ) : clientes.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina).map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '11px 14px', fontSize: '13px' }}>
                  <span
                    style={{ fontWeight: 500, color: 'var(--azul)', cursor: 'pointer' }}
                    onClick={() => navigate(`/clientes/${c.id}`)}
                  >{c.nombre_razon_social}</span>
                  <div style={{ fontSize: '11px', color: 'var(--gris)' }}>{c.tipo_cliente} · {c.ruc || 'Sin RUC'}</div>
                </td>
                <td style={{ padding: '11px 14px', fontSize: '12px' }}>
                  <div>{c.telefono_principal || '—'}</div>
                  {c.whatsapp && <WhatsAppButton numero={c.whatsapp} size="sm" label={c.whatsapp} />}
                </td>
                <td style={{ padding: '11px 14px', fontSize: '13px' }}>{c.provincia || '—'}</td>
                <td style={{ padding: '11px 14px', fontSize: '13px', textAlign: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--azul)' }}>{c.total_dispositivos}</span>
                </td>
                <td style={{ padding: '11px 14px' }}><AlertaBadge estado={c.estado} /></td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => navigate(`/clientes/${c.id}`)}
                      style={{ padding: '4px 10px', background: 'var(--azul-light)', color: 'var(--azul)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      Ver
                    </button>
                    <button onClick={() => setModal(c)}
                      style={{ padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      Editar
                    </button>
                    <button onClick={() => setConfirmar({ visible: true, id: c.id, nombre: c.nombre_razon_social })}
                      style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
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
          totalItems={clientes.length}
          itemsPorPagina={itemsPorPagina}
          onChange={p => setPagina(p)}
          onChangeItems={n => setItemsPorPagina(n)}
        />
        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--borde)', fontSize: '12px', color: 'var(--gris)' }}>
          {clientes.length} cliente(s) encontrado(s)
        </div>
      </div>

      {importarModal && (
        <ImportarGoogleSheets
          tipo="clientes"
          onImportado={() => { cargar(); }}
          onCerrar={() => setImportarModal(false)}
        />
      )}

      <ModalConfirmar
        visible={confirmar.visible}
        titulo="¿Eliminar cliente?"
        mensaje={`El cliente "${confirmar.nombre}" y todos sus datos serán eliminados permanentemente.`}
        onConfirmar={eliminar}
        onCancelar={() => setConfirmar({ visible: false, id: null, nombre: '' })}
      />

      {modal !== null && (
        <ModalCliente
          cliente={modal.id ? modal : null}
          onGuardar={() => { setModal(null); cargar(); }}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
