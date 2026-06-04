// Modal para importar datos desde Google Sheets — GPS Tracker Panamá
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function ImportarGoogleSheets({ tipo, onImportado, onCerrar }) {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const esDispositivos = tipo === 'dispositivos';
  const titulo = esDispositivos ? 'Importar GPS / SIM Cards' : 'Importar Clientes';
  const endpoint = esDispositivos ? '/importar/dispositivos' : '/importar/clientes';
  const plantillaEndpoint = esDispositivos ? '/importar/plantilla/dispositivos' : '/importar/plantilla/clientes';

  const columnaEsperadas = esDispositivos
    ? ['serial_gps', 'simcard', 'placa_vehiculo', 'modelo_auto', 'tipo_producto', 'modalidad', 'valor_equipo_usd']
    : ['nombre_razon_social', 'tipo_cliente', 'ruc', 'telefono_principal', 'whatsapp', 'email', 'provincia'];

  async function verPreview() {
    if (!url.trim()) { toast.error('Pega la URL del Google Sheet'); return; }
    setCargandoPreview(true);
    setPreview(null);
    setResultado(null);
    try {
      const r = await api.post('/importar/preview', { url: url.trim() });
      setPreview(r.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo leer el Sheet. ¿Está compartido como público?');
    } finally { setCargandoPreview(false); }
  }

  async function importar() {
    setImportando(true);
    try {
      const r = await api.post(endpoint, { url: url.trim() });
      setResultado(r.data.data);
      toast.success(r.data.message);
      if (r.data.data.importados > 0) onImportado?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error importando');
    } finally { setImportando(false); }
  }

  function descargarPlantilla() {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const token = localStorage.getItem('token');
    window.open(`${base}/api${plantillaEndpoint}?token=${token}`, '_blank');
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '580px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📊 {titulo}</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Desde Google Sheets</p>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        {/* Instrucciones */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#1e40af' }}>
          <strong>Pasos:</strong>
          <ol style={{ margin: '6px 0 0 16px', lineHeight: 1.8 }}>
            <li>Abre tu Google Sheet con los datos</li>
            <li>Menú <strong>Archivo → Compartir → Cualquiera con el enlace (Lector)</strong></li>
            <li>Copia la URL completa y pégala abajo</li>
          </ol>
        </div>

        {/* Columnas esperadas */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Columnas que debe tener tu Sheet (en la primera fila):
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {columnaEsperadas.map(c => (
              <span key={c} style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#374151' }}>
                {c}
              </span>
            ))}
          </div>
          <button onClick={descargarPlantilla}
            style={{ marginTop: '8px', background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', color: '#374151' }}>
            📥 Descargar plantilla de ejemplo (.csv)
          </button>
        </div>

        {/* Input URL */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            URL del Google Sheet
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={url}
              onChange={e => { setUrl(e.target.value); setPreview(null); setResultado(null); }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
            />
            <button onClick={verPreview} disabled={cargandoPreview}
              style={{ background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}>
              {cargandoPreview ? '...' : '👁 Ver datos'}
            </button>
          </div>
        </div>

        {/* Preview */}
        {preview && !resultado && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#16a34a' }}>
              ✅ Sheet leído correctamente — {preview.total} fila(s) encontradas
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
              Columnas detectadas: <span style={{ fontFamily: 'monospace' }}>{preview.columnas.join(', ')}</span>
            </p>

            {/* Mini tabla preview */}
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {preview.columnas.map(c => (
                      <th key={c} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((fila, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      {preview.columnas.map(c => (
                        <td key={c} style={{ padding: '5px 8px', color: '#374151', borderBottom: '1px solid #f3f4f6', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fila[c] || <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.total > 5 && (
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                Mostrando 5 de {preview.total} filas
              </p>
            )}

            <button onClick={importar} disabled={importando}
              style={{ marginTop: '14px', width: '100%', padding: '11px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
              {importando ? 'Importando...' : `✅ Importar ${preview.total} registro(s)`}
            </button>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, color: '#15803d', marginBottom: '8px' }}>Importación completada</p>
            <p style={{ fontSize: '13px', color: '#166534' }}>✅ Importados: <strong>{resultado.importados}</strong></p>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>⏭ Omitidos (ya existían): <strong>{resultado.omitidos}</strong></p>
            {resultado.errores?.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>Errores ({resultado.errores.length}):</p>
                {resultado.errores.map((e, i) => (
                  <p key={i} style={{ fontSize: '11px', color: '#dc2626', marginLeft: '8px' }}>• {e}</p>
                ))}
              </div>
            )}
            <button onClick={onCerrar}
              style={{ marginTop: '12px', width: '100%', padding: '10px', background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              Cerrar
            </button>
          </div>
        )}

        {/* Botón cancelar */}
        {!resultado && (
          <button onClick={onCerrar}
            style={{ width: '100%', padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
