import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const menu = [
  { path: '/dashboard',    label: 'Dashboard',       icono: '📊' },
  { path: '/clientes',     label: 'Clientes',         icono: '👥' },
  { path: '/dispositivos', label: 'Dispositivos GPS', icono: '📡' },
  { path: '/contratos',    label: 'Contratos',        icono: '📋' },
  { path: '/pagos',        label: 'Pagos',            icono: '💳' },
  { path: '/facturas',     label: 'Facturas',         icono: '🧾' },
  { path: '/leads',        label: 'Leads',            icono: '🎯' },
  { path: '/cotizaciones', label: 'Cotizaciones',     icono: '📝' },
  { path: '/tareas',       label: 'Tareas',           icono: '✅' },
  { path: '/asistente',    label: 'Asistente IA',     icono: '🤖' },
  { path: '/inventario',   label: 'Inventario',       icono: '📦' },
  { path: '/alertas',      label: 'Alertas',          icono: '🔔' },
  { path: '/plantillas',   label: 'Plantillas WA',    icono: '💬' },
];

export default function Sidebar({ abierto, onCerrar, darkMode, toggleDark }) {
  const navigate = useNavigate();

  function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  }

  // Colores del sidebar según el modo
  const sidebarBg    = darkMode ? '#161b22' : 'white';
  const sidebarBorde = darkMode ? '#30363d' : 'var(--borde)';
  const textoNormal  = darkMode ? '#c9d1d9' : '#374151';
  const activeBg     = darkMode ? '#1c2d4f' : 'var(--azul-light)';

  const estiloBase = {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: '240px',
    background: sidebarBg,
    borderRight: `1px solid ${sidebarBorde}`,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    transform: abierto ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.25s ease, background 0.3s',
    boxShadow: '2px 0 8px rgba(0,0,0,0.08)'
  };

  return (
    <aside style={estiloBase}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: `1px solid ${sidebarBorde}`,
        background: 'var(--azul)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📡</span>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '14px', lineHeight: 1.2 }}>GPS Tracker</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px' }}>Panamá — CRM</div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {menu.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--azul)' : textoNormal,
              background: isActive ? activeBg : 'transparent',
              borderRight: isActive ? '3px solid var(--azul)' : '3px solid transparent',
              transition: 'all 0.15s'
            })}
          >
            <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icono}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer del sidebar: dark mode + cerrar sesión */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${sidebarBorde}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Botón Dark Mode */}
        <button
          onClick={toggleDark}
          style={{
            width: '100%',
            padding: '9px',
            background: darkMode ? '#21262d' : '#f3f4f6',
            border: `1px solid ${sidebarBorde}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            color: darkMode ? '#c9d1d9' : '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'space-between',
            transition: 'all 0.2s'
          }}
          title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {darkMode ? '☀️' : '🌙'} {darkMode ? 'Modo claro' : 'Modo oscuro'}
          </span>
          {/* Toggle pill */}
          <span style={{
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            background: darkMode ? 'var(--azul)' : '#d1d5db',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0
          }}>
            <span style={{
              position: 'absolute',
              top: '3px',
              left: darkMode ? '19px' : '3px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'white',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </span>
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={cerrarSesion}
          style={{
            width: '100%',
            padding: '9px',
            background: 'transparent',
            border: `1px solid ${sidebarBorde}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--gris)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center'
          }}
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
