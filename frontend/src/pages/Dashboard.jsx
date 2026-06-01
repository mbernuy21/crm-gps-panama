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
        background: 'white',
        borderRadius: 'var(--radio)',
        padding: '20px',
        boxShadow: 'var(--sombra)',
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${color}`,
        transition: 'box-shadow 0.2s'
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = 'var(--sombra-md)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = 'var(--sombra)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'var(--gris)', fontWeight: 500, marginBottom: '6px' }}>{titulo}</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>{valor}</p>
          {sub && <p style={{ fontSize: '11px', color: 'var(--gris)', marginTop: '4px' }}>{sub}</p>}
        </div>
        <span style={{ fontSize: '28px' }}>{icono}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => {
      setDatos(r.data.data);
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  if (cargando) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gris)' }}>
      Cargando dashboard...
    </div>
  );

  if (!datos) return null;

  const { kpis, alertas_count, ingresos_mensuales, estados_clientes, ultimos_pagos, alertas_detalle } = datos;

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

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard icono="👥" titulo="Clientes activos" valor={kpis.clientes_activos} color="#22c55e" onClick={() => navigate('/clientes?estado=activo')} />
        <KpiCard icono="⚠️" titulo="Clientes morosos" valor={kpis.clientes_morosos} color="#f59e0b" onClick={() => navigate('/clientes?estado=moroso')} />
        <KpiCard icono="🎯" titulo="Leads activos" valor={kpis.leads_activos} color="#8b5cf6" onClick={() => navigate('/leads')} />
        <KpiCard
          icono="💰"
          titulo="Cobros este mes"
          valor={`B/. ${parseFloat(kpis.cobros_mes_actual || 0).toLocaleString('es-PA', { minimumFractionDigits: 2 })}`}
          sub={kpis.cobros_mes_anterior > 0 ? `Mes anterior: B/. ${parseFloat(kpis.cobros_mes_anterior).toLocaleString('es-PA', { minimumFractionDigits: 2 })}` : ''}
          color="#4F6EF7"
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
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
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

      {/* Alertas del día + Últimos pagos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
