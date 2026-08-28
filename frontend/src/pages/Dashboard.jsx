import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title
} from 'chart.js';
import api from '../services/api';
import WhatsAppButton from '../components/WhatsAppButton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

const REFRESH_INTERVAL = 60; // segundos para auto-refresh

// ─── Helpers de formato ───────────────────────────────────────────────────────
const bal = (v) => `B/. ${parseFloat(v || 0).toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Tarjeta Hero (degradado, impacto visual alto) ────────────────────────────
function KpiHero({ icono, titulo, valor, sub, sub2, gradiente, onClick, badge }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', borderRadius: '16px', padding: '22px',
        background: gradiente, boxShadow: '0 10px 24px -8px rgba(16,24,40,0.30)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease', overflow: 'hidden'
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(16,24,40,0.42)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 10px 24px -8px rgba(16,24,40,0.30)'; e.currentTarget.style.transform = 'translateY(0)'; }}}
    >
      <div style={{ position: 'absolute', top: '-28px', right: '-28px', width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
      {badge !== undefined && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.25)', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', color: 'white', fontWeight: 700 }}>
          {badge}
        </div>
      )}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{titulo}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'white', lineHeight: 1.05 }}>{valor}</p>
          {sub  && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '6px' }}>{sub}</p>}
          {sub2 && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.70)', marginTop: '2px' }}>{sub2}</p>}
        </div>
        <span style={{ fontSize: '22px', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)', flexShrink: 0 }}>
          {icono}
        </span>
      </div>
    </div>
  );
}

// ─── Tarjeta KPI estándar ─────────────────────────────────────────────────────
function KpiCard({ icono, titulo, valor, sub, color = 'var(--azul)', onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', background: 'white', borderRadius: 'var(--radio)',
        padding: '18px', boxShadow: 'var(--sombra)', border: '1px solid var(--borde)',
        cursor: onClick ? 'pointer' : 'default', borderLeft: `4px solid ${color}`,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease', overflow: 'hidden'
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--sombra-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--sombra)'; e.currentTarget.style.transform = 'translateY(0)'; }}}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--gris)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{titulo}</p>
          <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{valor}</p>
          {sub && <p style={{ fontSize: '11px', color: 'var(--gris)', marginTop: '5px' }}>{sub}</p>}
        </div>
        <span style={{ fontSize: '18px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: typeof color === 'string' && color.startsWith('var') ? 'var(--azul-light)' : `${color}1a`, flexShrink: 0 }}>
          {icono}
        </span>
      </div>
    </div>
  );
}

// ─── Tarjeta GPS compacta ─────────────────────────────────────────────────────
function GpsStat({ icono, label, valor, color = '#4F6EF7', onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'white', borderRadius: '10px', padding: '14px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`, cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.15s, box-shadow 0.15s', display: 'flex', alignItems: 'center', gap: '12px'
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}>
      <span style={{ fontSize: '22px', flexShrink: 0 }}>{icono}</span>
      <div>
        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '24px', fontWeight: 800, color, lineHeight: 1.1 }}>{valor}</p>
      </div>
    </div>
  );
}

// ─── Fila de resumen financiero ───────────────────────────────────────────────
function ResumenFila({ label, valor, color, sub }) {
  return (
    <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--borde)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: '15px', fontWeight: 700, color }}>{valor}</span>
      </div>
      {sub && <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', textAlign: 'right' }}>{sub}</p>}
    </div>
  );
}

// ─── Barra de progreso con % ──────────────────────────────────────────────────
function BarraProgreso({ valor, max = 100, color = '#4F6EF7', label, sublabel }) {
  const pctVal = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '12px', color, fontWeight: 700 }}>{pctVal}%</span>
      </div>
      <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pctVal}%`, background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
      </div>
      {sublabel && <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>{sublabel}</p>}
    </div>
  );
}

// ─── Indicador de tendencia vs mes anterior ───────────────────────────────────
function Tendencia({ actual, anterior, prefijo = '' }) {
  if (!anterior || anterior === 0) return null;
  const diff = actual - anterior;
  const pctDiff = Math.round(Math.abs(diff / anterior) * 100);
  const subiendo = diff >= 0;
  return (
    <span style={{ fontSize: '11px', color: subiendo ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
      {subiendo ? '▲' : '▼'} {pctDiff}% vs mes ant.
    </span>
  );
}

// ─── Contador de segundos desde último refresh ────────────────────────────────
function ContadorActualizacion({ ultimaActualizacion, onRefresh, cargando }) {
  const [segs, setSegs] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setSegs(Math.floor((Date.now() - ultimaActualizacion) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [ultimaActualizacion]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '11px', color: segs > 50 ? '#f59e0b' : '#9ca3af' }}>
        🔄 Actualizado hace {segs}s
      </span>
      <button
        onClick={onRefresh}
        disabled={cargando}
        style={{
          background: 'transparent', border: '1px solid var(--borde)', borderRadius: '6px',
          padding: '4px 10px', fontSize: '11px', color: 'var(--gris)', cursor: 'pointer',
          opacity: cargando ? 0.5 : 1
        }}
      >
        {cargando ? '⏳' : '↻'} Refrescar
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(Date.now());

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    api.get('/dashboard').then(r => {
      setDatos(r.data.data);
      setCargando(false);
      setUltimaActualizacion(Date.now());
    }).catch(err => {
      console.error('Dashboard error:', err);
      setError(err.response?.data?.message || 'No se pudo conectar al servidor');
      setCargando(false);
    });
  }, []);

  // Carga inicial
  useEffect(() => { cargar(); }, [cargar]);

  // Auto-refresh cada REFRESH_INTERVAL segundos
  useEffect(() => {
    const iv = setInterval(() => { cargar(); }, REFRESH_INTERVAL * 1000);
    return () => clearInterval(iv);
  }, [cargar]);

  if (cargando && !datos) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gris)' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Cargando dashboard...
    </div>
  );

  if (error && !datos) return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Error al cargar el dashboard</h2>
      <p style={{ color: 'var(--gris)', fontSize: '13px', marginBottom: '20px' }}>{error}</p>
      <button onClick={cargar} style={{ background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }}>
        🔄 Reintentar
      </button>
    </div>
  );

  if (!datos) return null;

  const {
    kpis, alertas_count, ingresos_mensuales, estados_clientes,
    ultimos_pagos, alertas_detalle, pareto, pareto_corte, total_ingresos,
    tareas_stats, gps_stats = {}, sim_stats = {}, gps_por_plataforma = [],
    ventas_stats = {}, anualidades_stats = {}, mrr_stats = {},
    clientes_nuevos = {}, ticket_stats = {}, tasa_cobro_mes = 0
  } = datos;

  const mob = window.innerWidth < 768;
  const colGraficas = mob ? '1fr' : '2fr 1fr';
  const colDoble    = mob ? '1fr' : '1fr 1fr';
  const col3        = mob ? '1fr' : '1fr 1fr 1fr';

  // Datos gráfica barras (ingresos 6 meses)
  const barData = {
    labels: ingresos_mensuales.map(m => m.mes_label),
    datasets: [{ label: 'Ingresos (B/.)', data: ingresos_mensuales.map(m => parseFloat(m.total)), backgroundColor: '#4F6EF7', borderRadius: 6 }]
  };

  // Datos gráfica dona (estados clientes)
  const coloresEstado = { activo: '#22c55e', moroso: '#f59e0b', suspendido: '#f97316', cortado: '#ef4444', inactivo: '#9ca3af' };
  const donutData = {
    labels: estados_clientes.map(e => e.estado),
    datasets: [{ data: estados_clientes.map(e => e.cantidad), backgroundColor: estados_clientes.map(e => coloresEstado[e.estado] || '#9ca3af'), borderWidth: 2, borderColor: 'white' }]
  };

  // Datos pareto
  const topClientes = (pareto || []).slice(0, 10);
  const paretoData = {
    labels: topClientes.map(c => (c.nombre_razon_social || '').length > 18 ? c.nombre_razon_social.slice(0, 18) + '…' : c.nombre_razon_social),
    datasets: [{ label: 'Pagado (B/.)', data: topClientes.map(c => parseFloat(c.total_pagado)), backgroundColor: topClientes.map(c => c.es_top20 ? '#4F6EF7' : '#c7d2fe'), borderRadius: 5 }]
  };

  const totalAlertasDia = (alertas_count.proximos_vencer || 0) + (alertas_count.vencidos || 0);
  const mrrVal = parseFloat(mrr_stats.mrr || 0);
  const cobrosActual = parseFloat(kpis.cobros_mes_actual || 0);
  const ventasActual = parseFloat(ventas_stats.ventas_mes_actual || 0);
  const ingresoTotalMes = cobrosActual + ventasActual;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>
            {new Date().toLocaleDateString('es-PA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <ContadorActualizacion ultimaActualizacion={ultimaActualizacion} onRefresh={cargar} cargando={cargando} />
          {totalAlertasDia > 0 && (
            <button onClick={() => navigate('/alertas')} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              🔔 {totalAlertasDia} alertas
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BLOQUE 1 — INGRESOS DEL MES (el más importante arriba)
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>

        {/* COBROS DEL MES — pagos recurrentes (contratos) */}
        <KpiHero
          icono="💰"
          titulo="Cobros del mes (Pagos)"
          valor={bal(kpis.cobros_mes_actual)}
          sub={<Tendencia actual={cobrosActual} anterior={parseFloat(kpis.cobros_mes_anterior || 0)} />}
          sub2={`Mes anterior: ${bal(kpis.cobros_mes_anterior)}`}
          gradiente="linear-gradient(135deg, #3d5ce0 0%, #4F6EF7 100%)"
          onClick={() => navigate('/pagos')}
        />

        {/* VENTAS DEL MES — cobros únicos (ventas_cobros) */}
        <KpiHero
          icono="🛒"
          titulo="Ventas del mes"
          valor={bal(ventas_stats.ventas_mes_actual)}
          sub={<Tendencia actual={ventasActual} anterior={parseFloat(ventas_stats.ventas_mes_anterior || 0)} />}
          sub2={`${ventas_stats.cantidad_ventas_mes || 0} transacciones · Mes ant: ${bal(ventas_stats.ventas_mes_anterior)}`}
          gradiente="linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)"
          onClick={() => navigate('/pagos')}
        />

        {/* TOTAL INGRESOS MES — suma de ambos */}
        <KpiHero
          icono="📊"
          titulo="Total ingresos del mes"
          valor={bal(ingresoTotalMes)}
          sub={`Cobros + Ventas combinados`}
          sub2={`MRR proyectado: ${bal(mrrVal)}`}
          gradiente="linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
          badge={tasa_cobro_mes > 0 ? `${tasa_cobro_mes}% cobrado` : null}
        />

        {/* ANUALIDADES POR COBRAR ESTE MES */}
        <KpiHero
          icono="📅"
          titulo="Anualidades este mes"
          valor={`${anualidades_stats.cantidad_anualidades || 0} contratos`}
          sub={`Total: ${bal(anualidades_stats.monto_anualidades)}`}
          sub2={anualidades_stats.anualidades_vencidas > 0
            ? `⚠️ ${anualidades_stats.anualidades_vencidas} vencidas sin pagar`
            : `✅ Al día`}
          gradiente={anualidades_stats.anualidades_vencidas > 0
            ? 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)'
            : 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)'}
          onClick={() => navigate('/contratos')}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BLOQUE 2 — KPIs OPERATIVOS
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(6, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KpiCard icono="👥" titulo="Clientes activos" valor={kpis.clientes_activos || 0} color="#16a34a" onClick={() => navigate('/clientes?estado=activo')} />
        <KpiCard icono="⚠️" titulo="Morosos" valor={kpis.clientes_morosos || 0} color="#f59e0b"
          sub={`+${clientes_nuevos.nuevos_mes_actual || 0} nuevos hoy`} onClick={() => navigate('/clientes?estado=moroso')} />
        <KpiCard icono="📡" titulo="GPS activos" valor={gps_stats.gps_activos || 0} color="#4F6EF7"
          sub={`${gps_stats.total_gps || 0} total en inventario`} onClick={() => navigate('/dispositivos')} />
        <KpiCard icono="🔔" titulo="Por vencer" valor={alertas_count.proximos_vencer || 0} color="#f59e0b" onClick={() => navigate('/alertas')} />
        <KpiCard icono="❌" titulo="Vencidos" valor={alertas_count.vencidos || 0} color="#ef4444" onClick={() => navigate('/alertas')} />
        <KpiCard icono="✅" titulo="Tareas pend." valor={tareas_stats?.pendientes || 0} color="#7c3aed"
          sub={tareas_stats?.vencidas ? `${tareas_stats.vencidas} vencidas` : ''} onClick={() => navigate('/tareas')} />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BLOQUE 3 — MÉTRICAS FINANCIERAS AVANZADAS
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: col3, gap: '16px', marginBottom: '24px' }}>

        {/* MRR + Tasa de cobro */}
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)', border: '1px solid var(--borde)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>📈 Ingresos recurrentes (MRR)</h3>
          <p style={{ fontSize: '11px', color: 'var(--gris)', marginBottom: '16px' }}>Proyección mensual de contratos activos</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#4F6EF7', marginBottom: '8px' }}>{bal(mrrVal)}</p>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span>📋 {mrr_stats.contratos_activos || 0} contratos activos</span>
            <span>· Mensual: {mrr_stats.contratos_mensuales || 0}</span>
            <span>· Anual: {mrr_stats.contratos_anuales || 0}</span>
          </div>
          <BarraProgreso
            valor={cobrosActual}
            max={mrrVal}
            color="#4F6EF7"
            label="Tasa de cobro del mes"
            sublabel={`${bal(cobrosActual)} cobrado de ${bal(mrrVal)} proyectado`}
          />
        </div>

        {/* Ticket promedio y estadísticas de cobros */}
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)', border: '1px solid var(--borde)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: '#374151' }}>🎫 Estadísticas de pagos del mes</h3>
          <p style={{ fontSize: '11px', color: 'var(--gris)', marginBottom: '16px' }}>Análisis de los pagos registrados este mes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Ticket promedio</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#4F6EF7' }}>{bal(ticket_stats.ticket_promedio)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f0fdf4', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Pago más alto</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>{bal(ticket_stats.pago_max)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#fef2f2', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Pago más bajo</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626' }}>{bal(ticket_stats.pago_min)}</span>
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
              {ticket_stats.cantidad_pagos_mes || 0} pagos registrados este mes
            </p>
          </div>
        </div>

        {/* Nuevos clientes + resumen financiero */}
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)', border: '1px solid var(--borde)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '16px', color: '#374151' }}>📊 Resumen financiero</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ResumenFila label="Ingresos históricos totales" valor={bal(total_ingresos)} color="#16a34a" />
            <ResumenFila label="Cobros este mes" valor={bal(kpis.cobros_mes_actual)} color="#4F6EF7"
              sub={`vs ${bal(kpis.cobros_mes_anterior)} el mes pasado`} />
            <ResumenFila label="Ventas este mes" valor={bal(ventas_stats.ventas_mes_actual)} color="#0d9488" />
            <ResumenFila label="Nuevos clientes este mes" valor={clientes_nuevos.nuevos_mes_actual || 0} color="#7c3aed"
              sub={`Mes anterior: ${clientes_nuevos.nuevos_mes_anterior || 0}`} />
            <ResumenFila label="GPS perdidos" valor={kpis.dispositivos_perdidos || 0} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BLOQUE 4 — GRÁFICAS
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: colGraficas, gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>Ingresos últimos 6 meses (B/.)</h3>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => 'B/. ' + v } } } }} />
        </div>
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>Estado de clientes</h3>
          <Doughnut data={donutData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }} />
        </div>
      </div>

      {/* Pareto + Resumen financiero */}
      <div style={{ display: 'grid', gridTemplateColumns: colGraficas, gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Top 10 clientes por ingresos (Pareto 80/20)</h3>
          <p style={{ fontSize: '11px', color: 'var(--gris)', marginBottom: '14px' }}>
            En azul: los clientes que generan el 80% de tus ingresos {pareto_corte ? `(${pareto_corte} clientes)` : ''}
          </p>
          {topClientes.length === 0 ? (
            <p style={{ color: 'var(--gris)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin datos de pagos aún</p>
          ) : (
            <Bar data={paretoData} options={{ indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { callback: v => 'B/.' + v } } } }} />
          )}
        </div>

        {/* Anualidades detalle */}
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>📅 Anualidades — {new Date().toLocaleString('es-PA', { month: 'long', year: 'numeric' })}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ textAlign: 'center', padding: '14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Por cobrar</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>{anualidades_stats.anualidades_por_cobrar || 0}</p>
              </div>
              <div style={{ textAlign: 'center', padding: '14px', background: anualidades_stats.anualidades_vencidas > 0 ? '#fef2f2' : '#f8fafc', borderRadius: '10px', border: anualidades_stats.anualidades_vencidas > 0 ? '1px solid #fecaca' : '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '10px', color: anualidades_stats.anualidades_vencidas > 0 ? '#dc2626' : '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Vencidas</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: anualidades_stats.anualidades_vencidas > 0 ? '#dc2626' : '#9ca3af' }}>{anualidades_stats.anualidades_vencidas || 0}</p>
              </div>
            </div>
            <div style={{ padding: '14px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, marginBottom: '4px' }}>MONTO TOTAL DEL MES</p>
              <p style={{ fontSize: '22px', fontWeight: 800, color: '#0369a1' }}>{bal(anualidades_stats.monto_anualidades)}</p>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
              Total contratos anuales activos: <strong>{anualidades_stats.cantidad_anualidades || 0}</strong>
            </div>
            <button onClick={() => navigate('/contratos')} style={{ background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              Ver contratos →
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BLOQUE 5 — INVENTARIO GPS
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📡 Inventario de GPS
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <GpsStat icono="📡" label="GPS Activos" valor={gps_stats.gps_activos || 0} color="#4F6EF7" onClick={() => navigate('/dispositivos')} />
          <GpsStat icono="🛒" label="En Venta" valor={gps_stats.gps_en_venta || 0} color="#16a34a" onClick={() => navigate('/dispositivos')} />
          <GpsStat icono="🔄" label="En Alquiler" valor={gps_stats.gps_en_alquiler || 0} color="#7c3aed" onClick={() => navigate('/dispositivos')} />
          <GpsStat icono="🎒" label="Portátiles" valor={gps_stats.gps_portatiles || 0} color="#f59e0b" onClick={() => navigate('/dispositivos')} />
          <GpsStat icono="📦" label="Disponibles" valor={kpis.dispositivos_disponibles || 0} color="#64748b" onClick={() => navigate('/dispositivos')} />
          <GpsStat icono="📶" label="SIM Activas" valor={sim_stats.sims_activas || 0} color="#0891b2" onClick={() => navigate('/inventario')} />
          <GpsStat icono="📦" label="SIM Disponibles" valor={sim_stats.sims_disponibles || 0} color="#9ca3af" onClick={() => navigate('/inventario')} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Distribución de GPS</h3>
            <p style={{ fontSize: '11px', color: 'var(--gris)', marginBottom: '14px' }}>Por tipo y modalidad</p>
            <Doughnut
              data={{
                labels: ['Fijo Alquiler', 'Fijo Venta', 'Portátil Alquiler', 'Portátil Venta'],
                datasets: [{ data: [gps_stats.fijos_alquiler || 0, gps_stats.fijos_venta || 0, gps_stats.portatiles_alquiler || 0, (gps_stats.gps_portatiles || 0) - (gps_stats.portatiles_alquiler || 0)], backgroundColor: ['#4F6EF7', '#16a34a', '#f59e0b', '#7c3aed'], borderWidth: 2, borderColor: 'white' }]
              }}
              options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} unidades` } } } }}
            />
          </div>

          <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>GPS por Plataforma</h3>
            <p style={{ fontSize: '11px', color: 'var(--gris)', marginBottom: '14px' }}>Equipos por plataforma de rastreo</p>
            {gps_por_plataforma.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gris)' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📡</div>
                <p style={{ fontSize: '13px' }}>Sin datos de plataforma aún</p>
              </div>
            ) : (
              <Bar
                data={{
                  labels: gps_por_plataforma.map(p => { const icons = { sinotrack: '📡 Sinotrack', gpspos: '🗺️ GPS Pos', yogu: '📍 Yogu', otra: '🔧 Otra', 'Sin plataforma': '❓ Sin plataforma' }; return icons[p.plataforma] || p.plataforma; }),
                  datasets: [{ label: 'Equipos', data: gps_por_plataforma.map(p => p.cantidad), backgroundColor: ['#4F6EF7', '#16a34a', '#7c3aed', '#f59e0b', '#9ca3af'], borderRadius: 6 }]
                }}
                options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BLOQUE 6 — ALERTAS + ÚLTIMOS PAGOS
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: colDoble, gap: '20px' }}>
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>Alertas del día</h3>
          {alertas_detalle.length === 0 ? (
            <p style={{ color: 'var(--gris)', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>✅ Sin alertas pendientes</p>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {alertas_detalle.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--borde)', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cliente_nombre}</p>
                    <p style={{ fontSize: '11px', color: 'var(--gris)' }}>
                      {a.dias_mora > 0
                        ? `${a.dias_mora} días de mora — B/. ${parseFloat(a.monto_total).toFixed(2)}`
                        : `Vence en ${a.dias_para_vencer} días — B/. ${parseFloat(a.monto_total).toFixed(2)}`
                      }
                    </p>
                  </div>
                  <WhatsAppButton numero={a.whatsapp} size="sm" label="" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>Últimos pagos registrados</h3>
          {ultimos_pagos.length === 0 ? (
            <p style={{ color: 'var(--gris)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>Sin pagos registrados</p>
          ) : (
            <div>
              {ultimos_pagos.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--borde)' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500 }}>{p.cliente_nombre}</p>
                    <p style={{ fontSize: '11px', color: 'var(--gris)' }}>{new Date(p.fecha_pago).toLocaleDateString('es-PA')} · {p.metodo}</p>
                  </div>
                  <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>B/. {parseFloat(p.monto).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
