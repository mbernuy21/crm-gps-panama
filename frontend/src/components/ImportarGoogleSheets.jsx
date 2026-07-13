// Modal para importar datos — GPS Tracker Panamá
// Soporta: subir CSV directo O pegar URL de Google Sheets
import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function ImportarGoogleSheets({ tipo, onImportado, onCerrar }) {
  const [metodo, setMetodo] = useState('csv'); // 'csv' | 'sheets'
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef();

  const esDispositivos = tipo === 'dispositivos';
  const titulo = esDispositivos ? 'Importar GPS / SIM Cards' : 'Importar Clientes';
  const endpointCSV = esDispositivos ? '/importar/dispositivos-csv' : '/importar/clientes-csv';
  const endpointSheets = esDispositivos ? '/importar/dispositivos' : '/importar/clientes';
  const plantillaEndpoint = esDispositivos ? '/importar/plantilla/dispositivos' : '/importar/plantilla/clientes';

  const columnaEsperadas = esDispositivos
    ? ['serial_gps', 'simcard', 'placa_vehiculo', 'modelo_auto', 'tipo_producto', 'modalidad', 'valor_equipo_usd']
    : ['nombre_razon_social', 'tipo_cliente', 'ruc', 'telefono_principal', 'whatsapp', 'email', 'provincia'];

  function descargarPlantilla() {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const token = localStorage.getItem('token');
    window.open(`${base}/api${plantillaEndpoint}?token=${token}`, '_blank');
  }

  // ── Importar desde CSV subido ─────────────────────────────────────────────
  async function importarCSV() {
    const archivo = fileRef.current?.files?.[0];
    if (!archivo) { toast.error('Selecciona un archivo CSV primero'); return; }
    if (!archivo.name.endsWith('.csv')) { toast.error('Solo se aceptan archivos .csv'); return; }

    setImportando(true);
    try {
      const texto = await archivo.text();
      const r = await api.post(endpointCSV, { csv: texto });
      setResultado(r.data.data);
      toast.success(r.data.message);
      if (r.data.data.importados > 0) onImportado?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error importando CSV');
    } finally { setImportando(false); }
  }

  // ── Preview desde Google Sheets URL ──────────────────────────────────────
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

  // ── Importar desde Google Sheets URL ─────────────────────────────────────
  async function importarSheets() {
    setImportando(true);
    try {
      const r = await api.post(endpointSheets, { url: url.trim() });
      setResultado(r.data.data);
      toast.success(r.data.message);
      if (r.data.data.importados > 0) onImportado?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error importando');
    } finally { setImportando(false); }
  }

  const tabStyle = (activo) => ({
    flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600,
    fontSize: '13px', borderRadius: '8px',
    background: activo ? '#4F6EF7' : '#f3f4f6',
    color: activo ? 'white' : '#6b7280',
    transition: 'all 0.15s'
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '580px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📊 {titulo}</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Elige cómo importar los datos</p>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        {/* Tabs de método */}
        {!resultado && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: '#f3f4f6', padding: '4px', borderRadius: '10px' }}>
            <button style={tabStyle(metodo === 'csv')} onClick={() => { setMetodo('csv'); setPreview(null); }}>
              📁 Subir archivo CSV
            </button>
            <button style={tabStyle(metodo === 'sheets')} onClick={() => { setMetodo('sheets'); setPreview(null); }}>
              🔗 Google Sheets URL
            </button>
          </div>
        )}

        {/* Plantilla + columnas */}
        {!resultado && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Columnas requeridas:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {columnaEsperadas.map(c => (
                <span key={c} style={{ background: 'white', border: '1px solid #d1d5db', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#374151' }}>
                  {c}
                </span>
              ))}
            </div>
            <button onClick={descargarPlantilla}
              style={{ background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
              📥 Descargar plantilla .csv
            </button>
          </div>
        )}

        {/* ── MÉTODO CSV ── */}
        {metodo === 'csv' && !resultado && (
          <div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#1e40af' }}>
              <strong>Pasos:</strong>
              <ol style={{ margin: '6px 0 0 16px', lineHeight: 1.9 }}>
                <li>Descarga la plantilla de arriba</li>
                <li>Ábrela en Excel o Google Sheets y llénala con tus datos</li>
                <li>En Google Sheets: <strong>Archivo → Descargar → CSV</strong></li>
                <li>Selecciona el archivo CSV aquí abajo y haz clic en Importar</li>
              </ol>
            </div>

            <div style={{ border: '2px dashed #d1d5db', borderRadius: '10px', padding: '24px', textAlign: 'center', marginBottom: '16px', background: '#fafafa' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>📄 Selecciona tu archivo CSV</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                style={{ display: 'block', margin: '0 auto', fontSize: '13px' }}
                onChange={e => {
                  const nombre = e.target.files?.[0]?.name;
                  if (nombre) toast.info(`Archivo: ${nombre}`);
                }}
              />
            </div>

            <button onClick={importarCSV} disabled={importando}
              style={{ width: '100%', padding: '12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: importando ? 'wait' : 'pointer', fontWeight: 700, fontSize: '14px' }}>
              {importando ? '⏳ Importando...' : '✅ Importar CSV'}
            </button>
          </div>
        )}

        {/* ── MÉTODO GOOGLE SHEETS ── */}
        {metodo === 'sheets' && !resultado && (
          <div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#1e40af' }}>
              <strong>Requisito:</strong> El Sheet debe ser público.
              <br />Archivo → Compartir → <strong>"Cualquiera con el enlace (Lector)"</strong>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                value={url}
                onChange={e => { setUrl(e.target.value); setPreview(null); }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
              />
              <button onClick={verPreview} disabled={cargandoPreview}
                style={{ background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}>
                {cargandoPreview ? '...' : '👁 Ver datos'}
              </button>
            </div>

            {/* Preview */}
            {preview && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginBottom: '8px' }}>
                  ✅ {preview.total} fila(s) detectadas
                </p>
                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {preview.columnas.map(c => (
                          <th key={c} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((fila, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          {preview.columnas.map(c => (
                            <td key={c} style={{ padding: '5px 8px', borderBottom: '1px solid #f3f4f6', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {fila[c] || <span style={{ color: '#d1d5db' }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={importarSheets} disabled={importando}
                  style={{ width: '100%', padding: '11px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
                  {importando ? '⏳ Importando...' : `✅ Importar ${preview.total} registro(s)`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resultado final */}
        {resultado && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontWeight: 700, color: '#15803d', marginBottom: '10px', fontSize: '15px' }}>✅ Importación completada</p>
            <p style={{ fontSize: '14px', color: '#166534' }}>Importados: <strong>{resultado.importados}</strong></p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Omitidos (ya existían): <strong>{resultado.omitidos}</strong></p>
            {resultado.errores?.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>Filas con error ({resultado.errores.length}):</p>
                {resultado.errores.slice(0, 5).map((e, i) => (
                  <p key={i} style={{ fontSize: '11px', color: '#dc2626', marginLeft: '8px' }}>• {e}</p>
                ))}
              </div>
            )}
            <button onClick={onCerrar}
              style={{ marginTop: '14px', width: '100%', padding: '10px', background: '#4F6EF7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              Cerrar
            </button>
          </div>
        )}

        {!resultado && (
          <button onClick={onCerrar}
            style={{ width: '100%', padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151', marginTop: '8px' }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
