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
import AsistenteIA from './pages/AsistenteIA';
import Guia from './pages/Guia';

// Ruta protegida — redirige al login si no hay token
function RutaProtegida({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
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
          <Route path="facturas" element={<Facturas />} />
          <Route path="leads" element={<Leads />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="plantillas" element={<Plantillas />} />
          <Route path="cotizaciones" element={<Cotizaciones />} />
          <Route path="cotizaciones/nueva" element={<CotizacionForm />} />
          <Route path="cotizaciones/:id/editar" element={<CotizacionForm />} />
          <Route path="tareas" element={<Tareas />} />
          <Route path="asistente" element={<AsistenteIA />} />
          <Route path="guia" element={<Guia />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
