import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const [sidebarAbierto, setSidebarAbierto] = useState(true);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gris-light)' }}>
      <Sidebar abierto={sidebarAbierto} onCerrar={() => setSidebarAbierto(false)} />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        marginLeft: sidebarAbierto ? '240px' : '0',
        transition: 'margin-left 0.25s ease'
      }}>
        <Navbar onToggleSidebar={() => setSidebarAbierto(!sidebarAbierto)} />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
