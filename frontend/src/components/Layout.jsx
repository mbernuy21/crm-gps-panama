import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  // Detectar si es móvil (< 768px)
  const [esMobile, setEsMobile] = useState(() => window.innerWidth < 768);
  // En desktop el sidebar arranca abierto; en móvil arranca cerrado
  const [sidebarAbierto, setSidebarAbierto] = useState(() => window.innerWidth >= 768);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  // Tamaño de letra elegido por el usuario (se guarda en el dispositivo)
  const [fontScale, setFontScale] = useState(() => localStorage.getItem('fontScale') || '1');

  // Escuchar cambios de tamaño de pantalla
  useEffect(() => {
    function onResize() {
      const movil = window.innerWidth < 768;
      setEsMobile(movil);
      // Al pasar a desktop, abrir; al pasar a móvil, cerrar
      setSidebarAbierto(!movil);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Aplicar/quitar dark mode
  useEffect(() => {
    if (darkMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Aplicar el tamaño de letra a todo el CRM (zoom escala también los px en línea)
  useEffect(() => {
    document.documentElement.style.zoom = fontScale;
    localStorage.setItem('fontScale', fontScale);
  }, [fontScale]);

  function toggleDark() { setDarkMode(prev => !prev); }
  function cerrarSidebar() { setSidebarAbierto(false); }
  // Al navegar en móvil, cerrar el sidebar automáticamente
  function alNavegar() { if (esMobile) setSidebarAbierto(false); }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gris-light)' }}>
      <Sidebar
        abierto={sidebarAbierto}
        onCerrar={cerrarSidebar}
        onNavegar={alNavegar}
        darkMode={darkMode}
        toggleDark={toggleDark}
        fontScale={fontScale}
        setFontScale={setFontScale}
      />

      {/* Fondo oscuro detrás del sidebar en móvil */}
      {esMobile && sidebarAbierto && (
        <div
          onClick={cerrarSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
        />
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        // En móvil el contenido NO se empuja (el sidebar va por encima)
        marginLeft: !esMobile && sidebarAbierto ? '240px' : '0',
        transition: 'margin-left 0.25s ease'
      }}>
        <Navbar
          onToggleSidebar={() => setSidebarAbierto(v => !v)}
          darkMode={darkMode}
          toggleDark={toggleDark}
        />
        <main style={{ flex: 1, padding: esMobile ? '14px' : '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
