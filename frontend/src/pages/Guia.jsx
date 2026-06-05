// Guía del CRM — Flujo jerárquico de trabajo — GPS Tracker Panamá
import React, { useState } from 'react';

// ── Componente: paso de flujo ─────────────────────────────────────────────────
function Paso({ num, icono, modulo, color, acciones, nota }) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      {/* Número + línea vertical */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: color, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '16px', boxShadow: `0 3px 10px ${color}55`
        }}>{num}</div>
        <div style={{ width: '2px', flex: 1, background: '#e5e7eb', minHeight: '24px', marginTop: '4px' }} />
      </div>
      {/* Contenido */}
      <div style={{ flex: 1, paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>{icono}</span>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: color }}>
              Módulo
            </span>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e', marginTop: '1px' }}>{modulo}</h3>
          </div>
        </div>
        <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {acciones.map((a, i) => (
            <li key={i} style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{a}</li>
          ))}
        </ul>
        {nota && (
          <div style={{ marginTop: '8px', background: '#fef3c7', borderLeft: '3px solid #f59e0b', padding: '8px 12px', borderRadius: '0 6px 6px 0', fontSize: '12px', color: '#92400e' }}>
            💡 {nota}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente: tarjeta de módulo ────────────────────────────────────────────
function ModuloCard({ icono, nombre, frecuencia, desc, color, badge }) {
  const badgeColor = {
    'Diario': '#ef4444',
    'Frecuente': '#f59e0b',
    'Ocasional': '#6b7280',
  }[frecuencia] || '#6b7280';

  return (
    <div style={{
      background: 'white', borderRadius: '10px', padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderTop: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '24px' }}>{icono}</span>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px',
          borderRadius: '20px', background: badgeColor + '20', color: badgeColor
        }}>{frecuencia}</span>
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '13px', color: '#1a1a2e' }}>{nombre}</p>
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px', lineHeight: 1.4 }}>{desc}</p>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Guia() {
  const [escenario, setEscenario] = useState('A'); // A = directo, B = lead

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>📘 Guía del CRM</h1>
        <p style={{ color: 'var(--gris)', fontSize: '13px' }}>
          Flujo jerárquico de trabajo · GPS Tracker Panamá
        </p>
      </div>

      {/* ── SECCIÓN 1: Jerarquía de módulos ───────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '24px', boxShadow: 'var(--sombra)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>🗂️ Jerarquía de módulos</h2>
        <p style={{ fontSize: '12px', color: 'var(--gris)', marginBottom: '20px' }}>Qué módulo depende de cuál — de arriba hacia abajo</p>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '600px' }}>
            {/* Nivel 0: Lead (opcional) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <div style={{ background: '#fef3c7', border: '2px dashed #f59e0b', borderRadius: '10px', padding: '10px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#92400e' }}>
                🎯 Lead (prospecto) → 📝 Cotización
                <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '3px', color: '#b45309' }}>Solo si el cliente aún no ha confirmado</div>
              </div>
            </div>

            {/* Flecha */}
            <div style={{ textAlign: 'center', fontSize: '20px', color: '#9ca3af', marginBottom: '4px' }}>↓ Convertir a cliente</div>

            {/* Nivel 1: Cliente */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <div style={{ background: '#eff6ff', border: '2px solid #4F6EF7', borderRadius: '10px', padding: '12px 28px', textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#4F6EF7', minWidth: '220px' }}>
                👥 CLIENTE
                <div style={{ fontSize: '11px', fontWeight: 400, color: '#6b7280', marginTop: '3px' }}>Registro maestro — todo parte de aquí</div>
              </div>
            </div>

            {/* Flechas hacia 3 módulos */}
            <div style={{ textAlign: 'center', fontSize: '16px', color: '#9ca3af', marginBottom: '4px' }}>↙ ↓ ↘</div>

            {/* Nivel 2: Dispositivo + Contrato + Factura */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '8px' }}>
              {[
                { icono: '📡', label: 'Dispositivo GPS', sub: 'Serial, SIM, placa, vehículo', color: '#7c3aed', bg: '#f5f3ff', borde: '#7c3aed' },
                { icono: '📋', label: 'Contrato', sub: 'Frecuencia, monto, fecha pago', color: '#0891b2', bg: '#ecfeff', borde: '#0891b2' },
                { icono: '🧾', label: 'Factura', sub: 'Documento de cobro formal', color: '#059669', bg: '#ecfdf5', borde: '#059669' },
              ].map(m => (
                <div key={m.label} style={{ background: m.bg, border: `1px solid ${m.borde}40`, borderRadius: '8px', padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px' }}>{m.icono}</div>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: m.color, marginTop: '4px' }}>{m.label}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Flecha hacia Pago */}
            <div style={{ textAlign: 'center', fontSize: '16px', color: '#9ca3af', marginBottom: '4px' }}>↓ (del Contrato)</div>

            {/* Nivel 3: Pago */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <div style={{ background: '#dcfce7', border: '2px solid #16a34a', borderRadius: '10px', padding: '10px 24px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#166534', minWidth: '200px' }}>
                💳 PAGO
                <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '2px', color: '#166534' }}>Cada vez que el cliente abona</div>
              </div>
            </div>

            {/* Flecha hacia Estado de cuenta */}
            <div style={{ textAlign: 'center', fontSize: '16px', color: '#9ca3af', marginBottom: '4px' }}>↓</div>

            {/* Nivel 4: Estado de cuenta */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: '#f0f4ff', border: '1px solid #4F6EF7', borderRadius: '10px', padding: '10px 24px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#3730a3', minWidth: '200px' }}>
                📄 Estado de Cuenta
                <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '2px', color: '#6b7280' }}>Historial agrupado por mes · PDF · Excel</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 2: Pasos del flujo ─────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '24px', boxShadow: 'var(--sombra)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>🚀 Pasos para ingresar un nuevo cliente</h2>

        {/* Selector de escenario */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', marginTop: '12px' }}>
          {[
            { key: 'A', label: '✅ Ya confirmó el servicio', color: '#4F6EF7' },
            { key: 'B', label: '🎯 Primero es un prospecto', color: '#f59e0b' },
          ].map(s => (
            <button key={s.key} onClick={() => setEscenario(s.key)} style={{
              padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, border: 'none',
              background: escenario === s.key ? s.color : '#f3f4f6',
              color: escenario === s.key ? 'white' : '#374151',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Escenario A */}
        {escenario === 'A' && (
          <div>
            <Paso num="1" icono="👥" modulo="Clientes → + Nuevo Cliente" color="#4F6EF7"
              acciones={[
                'Nombre / Razón Social',
                'Tipo: Natural o Jurídica',
                'RUC, teléfono, WhatsApp, email',
                'Dirección, provincia',
                'Estado: Activo',
              ]}
              nota="Este es el registro maestro. Todo lo demás se cuelga de aquí." />

            <Paso num="2" icono="📡" modulo="Dispositivos GPS → + Nuevo Dispositivo" color="#7c3aed"
              acciones={[
                'Serial del GPS y número de SIM Card (único)',
                'Placa del vehículo y modelo del auto',
                'Tipo: Fijo o Portátil · Modalidad: Alquiler o Venta',
                'Vincular al cliente del paso 1',
                'Estado se pone en Asignado automáticamente',
              ]}
              nota="Si el cliente tiene 3 vehículos, repite este paso 3 veces." />

            <Paso num="3" icono="📋" modulo="Contratos → + Nuevo Contrato" color="#0891b2"
              acciones={[
                'Seleccionar el cliente',
                'Frecuencia de pago: Mensual / Semestral / Anual',
                'Monto del contrato',
                'Fecha de inicio y fecha del próximo pago',
                'Días de alerta (3 o 5 días antes de vencer)',
              ]}
              nota="Un solo contrato agrupa TODOS los dispositivos del cliente. No se crea uno por GPS." />

            <Paso num="4" icono="💳" modulo="Pagos → + Registrar Pago" color="#16a34a"
              acciones={[
                'Seleccionar cliente y contrato',
                'Monto, fecha, método (Yappy / Transferencia / Efectivo / Cheque)',
                'Link del comprobante (opcional)',
              ]}
              nota="Repite este paso cada vez que el cliente pague. El historial queda en Cliente → Estado de Cuenta." />
          </div>
        )}

        {/* Escenario B */}
        {escenario === 'B' && (
          <div>
            <Paso num="1" icono="🎯" modulo="Leads → + Nuevo Lead" color="#f59e0b"
              acciones={[
                'Nombre, teléfono, WhatsApp, email',
                'Tipo de GPS consultado y provincia',
                'Quién lo atendió',
                'Estado: Nuevo',
              ]}
              nota="Usa esto cuando alguien pregunta por el servicio pero todavía no ha confirmado." />

            <Paso num="2" icono="📝" modulo="Cotizaciones → + Nueva Cotización" color="#6366f1"
              acciones={[
                'Origen: "Desde lead" → seleccionar el lead',
                'Agregar productos del catálogo o línea manual',
                'Revisar totales, descuentos y fecha de validez',
                'Guardar y descargar PDF · enviar por Email o WhatsApp',
              ]}
              nota="El cliente recibe la cotización membretada de GPS Tracker Panamá." />

            <Paso num="3" icono="👤" modulo="Convertir a Cliente" color="#16a34a"
              acciones={[
                'Desde la cotización: botón "👤 Cliente"',
                'O desde Leads: botón "Convertir a cliente"',
                'Sus datos se migran al módulo Clientes',
                'El lead queda marcado como Cerrado automáticamente',
              ]}
              nota="A partir de aquí sigue igual que el Escenario A: Paso 2 (GPS), 3 (Contrato), 4 (Pago)." />

            <Paso num="4" icono="📡" modulo="Dispositivos GPS → + Nuevo Dispositivo" color="#7c3aed"
              acciones={['(igual que Escenario A — Paso 2)']} nota={null} />
            <Paso num="5" icono="📋" modulo="Contratos → + Nuevo Contrato" color="#0891b2"
              acciones={['(igual que Escenario A — Paso 3)']} nota={null} />
            <Paso num="6" icono="💳" modulo="Pagos → + Registrar Pago" color="#16a34a"
              acciones={['(igual que Escenario A — Paso 4)']} nota={null} />
          </div>
        )}
      </div>

      {/* ── SECCIÓN 3: Flujo de mora ───────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '24px', boxShadow: 'var(--sombra)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>⚠️ Flujo de mora — qué hacer si el cliente no paga</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { dia: '−5 días',  color: '#f59e0b', icono: '🔔', accion: 'CRM alerta "próximo a vencer"',     modulo: 'Dashboard + Email automático',  bg: '#fffbeb' },
            { dia: 'Día 0',    color: '#f97316', icono: '⏰', accion: 'Pago vencido — aparece en Alertas', modulo: 'Alertas → enviar WhatsApp de recordatorio', bg: '#fff7ed' },
            { dia: '+3 días',  color: '#ef4444', icono: '📛', accion: 'Cambiar estado a Moroso',           modulo: 'Clientes → cambiar estado → Moroso', bg: '#fef2f2' },
            { dia: '+15 días', color: '#dc2626', icono: '⏸️', accion: 'Suspensión temporal del servicio',  modulo: 'Alertas → enviar aviso de suspensión', bg: '#fef2f2' },
            { dia: '+30 días', color: '#991b1b', icono: '✂️', accion: 'Corte definitivo — SIM duplicada', modulo: 'Dispositivos → marcar SIM · Cliente → Cortado', bg: '#fff1f2' },
            { dia: 'Paga',     color: '#16a34a', icono: '✅', accion: 'Reactivar: registrar pago, nuevo GPS si aplica', modulo: 'Pagos → Clientes → estado Activo', bg: '#f0fdf4' },
          ].map((f, i, arr) => (
            <div key={i} style={{
              display: 'flex', gap: '16px', alignItems: 'stretch',
              background: f.bg, borderRadius: i === 0 ? '8px 8px 0 0' : i === arr.length - 1 ? '0 0 8px 8px' : '0',
              borderBottom: i < arr.length - 1 ? '1px solid #e5e7eb' : 'none',
              padding: '12px 16px'
            }}>
              <div style={{ width: '72px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: f.color, textAlign: 'center', lineHeight: 1.3 }}>{f.dia}</span>
              </div>
              <div style={{ fontSize: '18px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>{f.icono}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '13px', color: '#1a1a2e' }}>{f.accion}</p>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{f.modulo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECCIÓN 4: Uso diario de módulos ──────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 'var(--radio)', padding: '24px', boxShadow: 'var(--sombra)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🗓️ ¿Con qué frecuencia uso cada módulo?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
          <ModuloCard icono="📊" nombre="Dashboard"       frecuencia="Diario"    color="#4F6EF7" desc="Ver resumen, alertas y cobros del día" />
          <ModuloCard icono="🔔" nombre="Alertas"         frecuencia="Diario"    color="#ef4444" desc="Actuar sobre morosos y vencimientos" />
          <ModuloCard icono="💳" nombre="Pagos"           frecuencia="Diario"    color="#16a34a" desc="Registrar cada cobro recibido" />
          <ModuloCard icono="✅" nombre="Tareas"          frecuencia="Diario"    color="#8b5cf6" desc="Pendientes del equipo con fecha límite" />
          <ModuloCard icono="🎯" nombre="Leads"           frecuencia="Frecuente" color="#f59e0b" desc="Seguimiento a prospectos nuevos" />
          <ModuloCard icono="📝" nombre="Cotizaciones"    frecuencia="Frecuente" color="#6366f1" desc="Enviar propuestas formales de servicio" />
          <ModuloCard icono="👥" nombre="Clientes"        frecuencia="Frecuente" color="#0891b2" desc="Consultar, editar estado, ver historial" />
          <ModuloCard icono="🧾" nombre="Facturas"        frecuencia="Frecuente" color="#059669" desc="Generar documentos de cobro" />
          <ModuloCard icono="📡" nombre="Dispositivos"    frecuencia="Ocasional" color="#7c3aed" desc="Asignar o reasignar GPS entre clientes" />
          <ModuloCard icono="📋" nombre="Contratos"       frecuencia="Ocasional" color="#0369a1" desc="Crear o ajustar condiciones del contrato" />
          <ModuloCard icono="📦" nombre="Inventario"      frecuencia="Ocasional" color="#b45309" desc="Revisar stock, pérdidas y duplicados" />
          <ModuloCard icono="💬" nombre="Plantillas WA"   frecuencia="Ocasional" desc="Editar textos de recordatorio y mora" color="#16a34a" />
          <ModuloCard icono="🤖" nombre="Asistente IA"    frecuencia="Ocasional" color="#6366f1" desc="Consultas rápidas sobre datos del CRM" />
        </div>
      </div>
    </div>
  );
}
