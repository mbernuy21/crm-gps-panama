import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const VARIABLES = ['[nombre_cliente]', '[monto]', '[dias_mora]', '[fecha_vencimiento]', '[empresa]'];

const TIPO_COLORES = {
  recordatorio: { bg: '#dbeafe', color: '#1d4ed8', label: 'Recordatorio' },
  mora:         { bg: '#fef9c3', color: '#854d0e', label: 'Mora' },
  suspension:   { bg: '#ffedd5', color: '#c2410c', label: 'Suspensión' },
  reactivacion: { bg: '#dcfce7', color: '#166534', label: 'Reactivación' },
};

export default function Plantillas() {
  const [plantillas, setPlantillas] = useState([]);
  const [editando, setEditando] = useState(null);
  const [preview, setPreview] = useState({ nombre_cliente: 'Juan Rodríguez', monto: '60.00', dias_mora: '5', fecha_vencimiento: '15/07/2024', empresa: 'GPS Tracker Panamá' });

  function cargar() {
    api.get('/plantillas').then(r => setPlantillas(r.data.data));
  }

  useEffect(() => { cargar(); }, []);

  async function guardar(plantilla) {
    try {
      await api.put(`/plantillas/${plantilla.id}`, plantilla);
      toast.success('Plantilla guardada');
      setEditando(null);
      cargar();
    } catch (err) {
      toast.error('Error guardando plantilla');
    }
  }

  function resolverVariables(texto) {
    return texto
      .replaceAll('[nombre_cliente]', preview.nombre_cliente)
      .replaceAll('[monto]', preview.monto)
      .replaceAll('[dias_mora]', preview.dias_mora)
      .replaceAll('[fecha_vencimiento]', preview.fecha_vencimiento)
      .replaceAll('[empresa]', preview.empresa);
  }

  function probarEnvio(plantilla) {
    const msg = resolverVariables(plantilla.contenido);
    const numero = '50766431330';
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Plantillas de WhatsApp</h1>
        <p style={{ color: 'var(--gris)', fontSize: '13px' }}>
          Edita el contenido de cada plantilla. Los botones de acción usan estas plantillas para generar los mensajes.
        </p>
      </div>

      {/* Variables disponibles */}
      <div style={{ background: 'var(--azul-light)', borderRadius: 'var(--radio)', padding: '14px 18px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--azul)', marginBottom: '8px' }}>
          Variables dinámicas disponibles:
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {VARIABLES.map(v => (
            <code key={v} style={{ background: 'white', border: '1px solid var(--azul)', color: 'var(--azul)', padding: '2px 8px', borderRadius: '5px', fontSize: '12px' }}>
              {v}
            </code>
          ))}
        </div>
      </div>

      {/* Preview de variables */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '16px 18px', marginBottom: '24px', boxShadow: 'var(--sombra)' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Vista previa — valores de prueba:</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(preview).map(([key, val]) => (
            <div key={key}>
              <label style={{ fontSize: '11px', color: 'var(--gris)', display: 'block', marginBottom: '2px' }}>[{key}]</label>
              <input value={val} onChange={e => setPreview({ ...preview, [key]: e.target.value })}
                style={{ padding: '5px 9px', border: '1px solid var(--borde)', borderRadius: '6px', fontSize: '12px', width: '140px' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Plantillas */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {plantillas.map(p => {
          const estiloTipo = TIPO_COLORES[p.tipo] || { bg: '#f3f4f6', color: '#374151', label: p.tipo };
          const estaEditando = editando?.id === p.id;

          return (
            <div key={p.id} style={{ background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: estiloTipo.bg, color: estiloTipo.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                    {estiloTipo.label}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>{p.nombre}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => probarEnvio(p)}
                    style={{ padding: '5px 12px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                    💬 Probar envío
                  </button>
                  <button onClick={() => setEditando(estaEditando ? null : { ...p })}
                    style={{ padding: '5px 12px', background: estaEditando ? '#fee2e2' : 'var(--azul-light)', color: estaEditando ? '#dc2626' : 'var(--azul)', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                    {estaEditando ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
              </div>

              <div style={{ padding: '16px 18px' }}>
                {estaEditando ? (
                  <div>
                    <textarea
                      rows={4}
                      value={editando.contenido}
                      onChange={e => setEditando({ ...editando, contenido: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid var(--azul)', borderRadius: '8px', fontSize: '13px', resize: 'vertical', lineHeight: 1.6 }}
                    />
                    <div style={{ marginTop: '12px', background: '#f0fdf4', borderRadius: '8px', padding: '12px', fontSize: '13px', lineHeight: 1.6, color: '#166534' }}>
                      <strong style={{ fontSize: '11px', color: '#16a34a', display: 'block', marginBottom: '6px' }}>Vista previa:</strong>
                      {resolverVariables(editando.contenido)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '8px' }}>
                      <button onClick={() => setEditando(null)}
                        style={{ padding: '8px 16px', background: 'white', border: '1px solid var(--borde)', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' }}>
                        Cancelar
                      </button>
                      <button onClick={() => guardar(editando)}
                        style={{ padding: '8px 20px', background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                        Guardar plantilla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>{p.contenido}</p>
                    <div style={{ marginTop: '10px', background: '#f9fafb', borderRadius: '8px', padding: '10px', fontSize: '12px', lineHeight: 1.6, color: '#6b7280' }}>
                      <strong style={{ color: '#374151', display: 'block', marginBottom: '4px' }}>Con valores de prueba:</strong>
                      {resolverVariables(p.contenido)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
