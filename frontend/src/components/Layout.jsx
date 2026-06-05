import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Aplicar/quitar clase dark en <body> al montar y al cambiar
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  function toggleDark() {
    setDarkMode(prev => !prev);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gris-light)' }}>
      <Sidebar
        abierto={sidebarAbierto}
        onCerrar={() => setSidebarAbierto(false)}
        darkMode={darkMode}
        toggleDark={toggleDark}
      />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        marginLeft: sidebarAbierto ? '240px' : '0',
        transition: 'margin-left 0.25s ease'
      }}>
        <Navbar
          onToggleSidebar={() => setSidebarAbierto(!sidebarAbierto)}
          darkMode={darkMode}
          toggleDark={toggleDark}
        />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
