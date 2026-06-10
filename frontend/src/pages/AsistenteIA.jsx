// Asistente de IA con Groq (Llama 3) — GPS Tracker Panamá
import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const SUGERENCIAS = [
  '¿Cuántos clientes morosos hay ahora mismo?',
  'Dame el estado de cuenta de [nombre del cliente]',
  '¿Qué pagos vencen esta semana?',
  '¿Cuánto cobré este mes?',
  'Busca el dispositivo con placa [placa]',
  'Redacta un mensaje de cobro para un cliente con 15 días de mora',
];

// Aplica negritas **texto** dentro de una línea
function aplicarFormato(texto) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

// Renderiza el contenido del asistente: detecta tablas Markdown y las dibuja como tablas reales
function RenderMensaje({ texto }) {
  const lineas = (texto || '').split('\n');
  const bloques = [];
  let i = 0;
  while (i < lineas.length) {
    const linea = lineas[i];
    // ¿Inicio de tabla Markdown? (línea con | y la siguiente es separador |---|)
    const esFilaTabla = /^\s*\|.*\|\s*$/.test(linea);
    const sepSiguiente = lineas[i + 1] && /^\s*\|[\s:|-]+\|\s*$/.test(lineas[i + 1]);
    if (esFilaTabla && sepSiguiente) {
      const filas = [];
      let j = i;
      while (j < lineas.length && /^\s*\|.*\|\s*$/.test(lineas[j])) { filas.push(lineas[j]); j++; }
      const parseFila = (f) => f.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const encabezado = parseFila(filas[0]);
      const cuerpo = filas.slice(2).map(parseFila);
      bloques.push(
        <div key={`t${i}`} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
            <thead>
              <tr>{encabezado.map((c, k) => (
                <th key={k} style={{ background: '#4F6EF7', color: 'white', padding: '7px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{aplicarFormato(c)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {cuerpo.map((fila, r) => (
                <tr key={r} style={{ background: r % 2 === 0 ? '#f8faff' : 'white' }}>
                  {fila.map((c, k) => (
                    <td key={k} style={{ padding: '7px 10px', borderBottom: '1px solid #e5e7eb' }}>{aplicarFormato(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j;
    } else {
      bloques.push(<div key={`l${i}`} style={{ whiteSpace: 'pre-wrap' }}>{aplicarFormato(linea)}</div>);
      i++;
    }
  }
  return <>{bloques}</>;
}

export default function AsistenteIA() {
  const [mensajes, setMensajes] = useState([
    { rol: 'asistente', contenido: '¡Hola! Soy tu asistente de GPS Tracker Panamá 📡\nPuedo responder preguntas sobre tus clientes, pagos, dispositivos y más. ¿En qué te ayudo?' }
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  async function enviar(texto) {
    const msg = (texto || input).trim();
    if (!msg || cargando) return;
    setInput('');
    setError(null);

    // Agregar mensaje del usuario
    const nuevosMensajes = [...mensajes, { rol: 'usuario', contenido: msg }];
    setMensajes(nuevosMensajes);
    setCargando(true);

    try {
      // Construir historial para el backend (excluir el primer mensaje del asistente)
      const historial = nuevosMensajes.slice(1, -1); // todo excepto el último (el que acabamos de agregar)
      const r = await api.post('/asistente/chat', { mensaje: msg, historial });
      setMensajes(prev => [...prev, { rol: 'asistente', contenido: r.data.data.respuesta }]);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error conectando con el asistente';
      setError(msg);
      setMensajes(prev => [...prev, {
        rol: 'asistente',
        contenido: `⚠️ ${msg}`,
        esError: true
      }]);
    } finally {
      setCargando(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function limpiarChat() {
    setMensajes([{ rol: 'asistente', contenido: '¡Hola! Soy tu asistente de GPS Tracker Panamá 📡\nPuedo responder preguntas sobre tus clientes, pagos, dispositivos y más. ¿En qué te ayudo?' }]);
    setError(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Asistente IA</h1>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>Powered by Groq AI — Consulta datos del CRM en lenguaje natural</p>
        </div>
        <button onClick={limpiarChat}
          style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
          🗑️ Limpiar chat
        </button>
      </div>

      {/* Sugerencias rápidas */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {SUGERENCIAS.map((s, i) => (
          <button key={i} onClick={() => enviar(s)}
            style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Área de chat */}
      <div style={{
        flex: 1, background: 'white', borderRadius: 'var(--radio)', boxShadow: 'var(--sombra)',
        overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        {mensajes.map((m, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: m.rol === 'usuario' ? 'flex-end' : 'flex-start',
            gap: '10px', alignItems: 'flex-start'
          }}>
            {m.rol === 'asistente' && (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4F6EF7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                📡
              </div>
            )}
            <div style={{
              maxWidth: m.rol === 'usuario' ? '70%' : '85%', padding: '12px 16px', borderRadius: m.rol === 'usuario' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.rol === 'usuario' ? '#4F6EF7' : m.esError ? '#fef2f2' : '#f9fafb',
              color: m.rol === 'usuario' ? 'white' : m.esError ? '#dc2626' : '#111827',
              fontSize: '14px', lineHeight: 1.6, overflowWrap: 'anywhere'
            }}>
              {m.rol === 'asistente' && !m.esError
                ? <RenderMensaje texto={m.contenido} />
                : <span style={{ whiteSpace: 'pre-wrap' }}>{m.contenido}</span>}
            </div>
            {m.rol === 'usuario' && (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                👤
              </div>
            )}
          </div>
        ))}

        {/* Indicador de carga */}
        {cargando && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4F6EF7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              📡
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: '#f9fafb', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0,1,2].map(n => (
                <div key={n} style={{
                  width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af',
                  animation: 'pulse 1.2s ease-in-out infinite',
                  animationDelay: `${n * 0.2}s`
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input de mensaje */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
          placeholder="Escribe tu pregunta... (Enter para enviar)"
          disabled={cargando}
          style={{
            flex: 1, padding: '12px 16px', border: '1px solid var(--borde)', borderRadius: '10px',
            fontSize: '14px', outline: 'none', boxSizing: 'border-box'
          }}
        />
        <button onClick={() => enviar()} disabled={cargando || !input.trim()}
          style={{
            background: cargando || !input.trim() ? '#e5e7eb' : '#4F6EF7',
            color: cargando || !input.trim() ? '#9ca3af' : 'white',
            border: 'none', borderRadius: '10px', padding: '12px 20px',
            cursor: cargando || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '14px', transition: 'all 0.15s'
          }}>
          {cargando ? '...' : 'Enviar ➤'}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
