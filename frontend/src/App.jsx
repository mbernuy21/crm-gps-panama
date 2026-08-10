import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import ClienteDetalle from './pages/ClienteDetalle';
import Dispositivos from './pages/Dispositivos';
import Contratos from './pages/Contratos';
import Pagos from './pages/Pagos';
import Facturas from './pages/Facturas';
import Leads from './pages/Leads';
import Inventario from './pages/Inventario';
import Alertas from './pages/Alertas';
import Plantillas from './pages/Plantillas';
import Cotizaciones from './pages/Cotizaciones';
import CotizacionForm from './pages/CotizacionForm';
import Tareas from './pages/Tareas';
import Simcards from './pages/Simcards';
import Auditoria from './pages/Auditoria';
import AsistenteIA from './pages/AsistenteIA';
import Guia from './pages/Guia';
import Catalogo from './pages/Catalogo';
import Agentes from './pages/Agentes';

// Ruta protegida — redirige al login si no hay token
function RutaProtegida({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

// Ruta solo para admins — sub-agentes son redirigidos al dashboard
function RutaAdmin({ children }) {
  const usuario = (() => { try { return JSON.parse(localStorage.getItem('usuario') || '{}'); } catch { return {}; } })();
  if (usuario.rol === 'sub_agente') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/:id" element={<ClienteDetalle />} />
          <Route path="dispositivos" element={<Dispositivos />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="pagos" element={<Pagos />} />
          {/* Rutas solo para admin */}
          <Route path="facturas" element={<RutaAdmin><Facturas /></RutaAdmin>} />
          <Route path="inventario" element={<RutaAdmin><Inventario /></RutaAdmin>} />
          <Route path="plantillas" element={<RutaAdmin><Plantillas /></RutaAdmin>} />
          <Route path="cotizaciones" element={<Cotizaciones />} />
          <Route path="cotizaciones/nueva" element={<CotizacionForm />} />
          <Route path="cotizaciones/:id/editar" element={<CotizacionForm />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="asistente" element={<RutaAdmin><AsistenteIA /></RutaAdmin>} />
          <Route path="guia" element={<RutaAdmin><Guia /></RutaAdmin>} />
          <Route path="catalogo" element={<RutaAdmin><Catalogo /></RutaAdmin>} />
          <Route path="agentes" element={<RutaAdmin><Agentes /></RutaAdmin>} />
          {/* Rutas accesibles para todos (filtradas por rol en backend) */}
          <Route path="leads" element={<Leads />} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="tareas" element={<Tareas />} />
          <Route path="simcards" element={<Simcards />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
