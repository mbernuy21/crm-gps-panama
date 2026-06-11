import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title
} from 'chart.js';
import api from '../services/api';
import AlertaBadge from '../components/AlertaBadge';
import WhatsAppButton from '../components/WhatsAppButton';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

function KpiCard({ icono, titulo, valor, sub, color = 'var(--azul)', onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'white',
        borderRadius: 'var(--radio)',
        padding: '20px',
        boxShadow: 'var(--sombra)',
        border: '1px solid var(--borde)',
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${color}`,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        overflow: 'hidden'
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--sombra-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--sombra)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'var(--gris)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{titulo}</p>
          <p style={{ fontSize: '30px', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{valor}</p>
          {sub && <p style={{ fontSize: '11px', color: 'var(--gris)', marginTop: '6px' }}>{sub}</p>}
        </div>
        {/* Ícono dentro de un círculo de color tenue */}
        <span style={{
          fontSize: '20px',
          width: '42px', height: '42px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '10px',
          background: typeof color === 'string' && color.startsWith('var') ? 'var(--azul-light)' : `${color}1a`,
          flexShrink: 0
        }}>{icono}</span>
      </div>
    </div>
  );
}

// Tarjeta KPI destacada — fondo en degradado de color, alto impacto visual
function KpiHero({ icono, titulo, valor, sub, gradiente, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: '16px',
        padding: '22px',
        background: gradiente,
        boxShadow: '0 10px 24px -8px rgba(16,24,40,0.30)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        overflow: 'hidden'
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(16,24,40,0.42)'; e.currentTarget.style.transform = 'translateY(-3px)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 10px 24px -8px rgba(16,24,40,0.30)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
    >
      {/* Círculo decorativo de fondo */}
      <div style={{ position: 'absolute', top: '-28px', right: '-28px', width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{titulo}</p>
          <p style={{ fontSize: '32px', fontWeight: 800, color: 'white', lineHeight: 1.05 }}>{valor}</p>
          {sub && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '6px' }}>{sub}</p>}
        </div>
        <span style={{
          fontSize: '22px',
          width: '46px', height: '46px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.22)',
          backdropFilter: 'blur(4px)',
          flexShrink: 0
        }}>{icono}</span>
      </div>
    </div>
  );
}

// Fila del resumen financiero
function ResumenFila({ label, valor, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--borde)' }}>
      <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: '15px', fontWeight: 700, color }}>{valor}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  function cargar() {
    setCargando(true);
    setError(null);
    api.get('/dashboard').then(r => {
      setDatos(r.data.data);
      setCargando(false);
    }).catch(err => {
      console.error('Dashboard error:', err);
      setError(err.response?.data?.message || 'No se pudo conectar al servidor');
      setCargando(false);
    });
  }

  useEffect(() => { cargar(); }, []);

  if (cargando) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gris)' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      Cargando dashboard...
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Error al cargar el dashboard</h2>
      <p style={{ color: 'var(--gris)', fontSize: '13px', marginBottom: '20px' }}>{error}</p>
      <button
        onClick={cargar}
        style={{ background: 'var(--azul)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }}
      >
        🔄 Reintentar
      </button>
    </div>
  );

  if (!datos) return null;

  const { kpis, alertas_count, ingresos_mensuales, estados_clientes, ultimos_pagos, alertas_detalle, pareto, pareto_corte, total_ingresos, tareas_stats } = datos;
  const mob = window.innerWidth < 768;
  const colGraficas = mob ? '1fr' : '2fr 1fr';
  const colDoble = mob ? '1fr' : '1fr 1fr';

  // Datos para gráfica de barras (ingresos)
  const barData = {
    labels: ingresos_mensuales.map(m => m.mes_label),
    datasets: [{
      label: 'Ingresos (B/.)',
      data: ingresos_mensuales.map(m => parseFloat(m.total)),
      backgroundColor: '#4F6EF7',
      borderRadius: 6
    }]
  };

  // Datos para gráfica de dona (estados)
  const coloresEstado = {
    activo: '#22c55e', moroso: '#f59e0b',
    suspendido: '#f97316', cortado: '#ef4444', inactivo: '#9ca3af'
  };

  const donutData = {
    labels: estados_clientes.map(e => e.estado),
    datasets: [{
      data: estados_clientes.map(e => e.cantidad),
      backgroundColor: estados_clientes.map(e => coloresEstado[e.estado] || '#9ca3af'),
      borderWidth: 2,
      borderColor: 'white'
    }]
  };

  const totalAlertasDia = (alertas_count.proximos_vencer || 0) + (alertas_count.vencidos || 0);

  // Gráfica Pareto — top clientes por ingresos (80/20)
  const topClientes = (pareto || []).slice(0, 10);
  const paretoData = {
    labels: topClientes.map(c => (c.nombre_razon_social || '').length > 18 ? c.nombre_razon_social.slice(0, 18) + '…' : c.nombre_razon_social),
    datasets: [{
      label: 'Pagado (B/.)',
      data: topClientes.map(c => parseFloat(c.total_pagado)),
      backgroundColor: topClientes.map(c => c.es_top20 ? '#4F6EF7' : '#c7d2fe'),
      borderRadius: 5
    }]
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ color: 'var(--gris)', fontSize: '13px' }}>
            {new Date().toLocaleDateString('es-PA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {totalAlertasDia > 0 && (
          <button
            onClick={() => navigate('/alertas')}
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            🔔 {totalAlertasDia} alertas pendientes
          </button>
        )}
      </div>

      {/* KPIs principales — tarjetas destacadas con degradado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiHero icono="👥" titulo="Clientes activos" valor={kpis.clientes_activos}
          gradiente="linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" onClick={() => navigate('/clientes?estado=activo')} />
        <KpiHero icono="⚠️" titulo="Clientes morosos" valor={kpis.clientes_morosos}
          gradiente="linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" onClick={() => navigate('/clientes?estado=moroso')} />
        <KpiHero icono="🎯" titulo="Leads activos" valor={kpis.leads_activos}
          gradiente="linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" onClick={() => navigate('/leads')} />
        <KpiHero
          icono="💰"
          titulo="Cobros este mes"
          valor={`B/. ${parseFloat(kpis.cobros_mes_actual || 0).toLocaleString('es-PA', { minimumFractionDigits: 2 })}`}
          sub={kpis.cobros_mes_anterior > 0 ? `Mes anterior: B/. ${parseFloat(kpis.cobros_mes_anterior).toLocaleString('es-PA', { minimumFractionDigits: 2 })}` : ''}
          gradiente="linear-gradient(135deg, #3d5ce0 0%, #4F6EF7 100%)"
          onClick={() => navigate('/pagos')}
        />
      </div>

      {/* Segunda fila de KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <KpiCard icono="🔴" titulo="Morosos" valor={kpis.clientes_morosos} color="#ef4444" />
        <KpiCard icono="⏸️" titulo="Suspendidos" valor={kpis.clientes_suspendidos} color="#f97316" />
        <KpiCard icono="📡" titulo="Disp. disponibles" valor={kpis.dispositivos_disponibles} color="#3b82f6" />
        <KpiCard icono="🔔" titulo="Próximos a vencer" valor={alertas_count.proximos_vencer || 0} color="#f59e0b" onClick={() => navigate('/alertas')} />
        <KpiCard icono="❌" titulo="Vencidos" valor={alertas_count.vencidos || 0} color="#ef4444" onClick={() => navigate('/alertas')} />
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: colGraficas, gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
            Ingresos últimos 6 meses (B/.)
          </h3>
          <Bar data={barData} options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'B/. ' + v } } }
          }} />
        </div>

        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
            Estado de clientes
          </h3>
          <Doughnut data={donutData} options={{
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
          }} />
        </div>
      </div>

      {/* Pareto de clientes + Resumen financiero */}
      <div style={{ display: 'grid', gridTemplateColumns: colGraficas, gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
            Top 10 clientes por ingresos (Pareto 80/20)
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--gris)', marginBottom: '14px' }}>
            En azul intenso: los clientes que generan el 80% de tus ingresos {pareto_corte ? `(${pareto_corte} clientes)` : ''}
          </p>
          {topClientes.length === 0 ? (
            <p style={{ color: 'var(--gris)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin datos de pagos aún</p>
          ) : (
            <Bar data={paretoData} options={{
              indexAxis: 'y',
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { x: { beginAtZero: true, ticks: { callback: v => 'B/.' + v } } }
            }} />
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>Resumen financiero</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <ResumenFila label="Ingresos totales (histórico)" valor={`B/. ${parseFloat(total_ingresos || 0).toLocaleString('es-PA', { minimumFractionDigits: 2 })}`} color="#16a34a" />
            <ResumenFila label="Cobros este mes" valor={`B/. ${parseFloat(kpis.cobros_mes_actual || 0).toLocaleString('es-PA', { minimumFractionDigits: 2 })}`} color="#4F6EF7" />
            <ResumenFila label="Cobros mes anterior" valor={`B/. ${parseFloat(kpis.cobros_mes_anterior || 0).toLocaleString('es-PA', { minimumFractionDigits: 2 })}`} color="#6b7280" />
            <ResumenFila label="Tareas pendientes" valor={`${tareas_stats?.pendientes || 0}${tareas_stats?.vencidas ? ` (${tareas_stats.vencidas} vencidas)` : ''}`} color="#f59e0b" />
            <ResumenFila label="GPS perdidos" valor={kpis.dispositivos_perdidos || 0} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Alertas del día + Últimos pagos */}
      <div style={{ display: 'grid', gridTemplateColumns: colDoble, gap: '20px' }}>
        {/* Alertas */}
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
            Alertas del día
          </h3>
          {alertas_detalle.length === 0 ? (
            <p style={{ color: 'var(--gris)', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>
              ✅ Sin alertas pendientes
            </p>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {alertas_detalle.map(a => (
                <div key={a.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--borde)',
                  gap: '8px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.cliente_nombre}
                    </p>
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

        {/* Últimos pagos */}
        <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '20px', boxShadow: 'var(--sombra)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
            Últimos pagos registrados
          </h3>
          {ultimos_pagos.length === 0 ? (
            <p style={{ color: 'var(--gris)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
              Sin pagos registrados
            </p>
          ) : (
            <div>
              {ultimos_pagos.map(p => (
                <div key={p.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--borde)'
                }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500 }}>{p.cliente_nombre}</p>
                    <p style={{ fontSize: '11px', color: 'var(--gris)' }}>
                      {new Date(p.fecha_pago).toLocaleDateString('es-PA')} · {p.metodo}
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>
                    B/. {parseFloat(p.monto).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
