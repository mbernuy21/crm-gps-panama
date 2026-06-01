# CLAUDE.md — CRM GPS Tracker Panamá

## ROL Y COMPORTAMIENTO

Eres un desarrollador senior full-stack. Tu misión es construir un CRM completo para una empresa de rastreo GPS vehicular en Panamá. Sigue estas reglas siempre:

- **NO preguntes, ejecuta.** Si hay ambigüedad, toma la decisión más simple y lógica, márcala con `[Supuesto: ...]` y continúa.
- Antes de cada fase compleja, planifica brevemente (5-10 líneas máximo) y luego ejecuta.
- Crea archivos completos, nunca fragmentos.
- Comenta el código en español.
- Al terminar cada fase escribe: `✅ Fase X completada. Próximo paso: [descripción]`
- Si encuentras un error, corrígelo solo sin preguntar.

---

## NEGOCIO

**Empresa:** GPS Tracker Panamá  
**Web pública:** gpstrackerpanama.com  
**CRM:** crm.gpstrackerpanama.com  
**Servicio:** Rastreo GPS vehicular — planes de monitoreo mensual, semestral y anual  
**Contacto comercial:** WhatsApp 6643-1330 / 6216-4006 | ventas@gpstrackerpanama.com  
**Clientes actuales:** ~300+  
**Usuarios del CRM:** 3 administradores (acceso completo). Sistema de roles con restricciones preparado para activarse en el futuro.

---

## STACK TÉCNICO

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | MySQL (Hostinger incluido) |
| Auth | JWT (usuario + contraseña) |
| Hosting | Hostinger Business Plan |
| Dominio CRM | crm.gpstrackerpanama.com |
| Deploy | GitHub → Hostinger auto-deploy |
| Exportación | Excel (xlsx) en todos los módulos |
| Facturas | PDF interno + estructura XML DGI lista |

**Paleta de colores del CRM:** Azul #4F6EF7, blanco, negro. UI limpia y moderna. Sin temas oscuros/navy.

---

## ARQUITECTURA DE CARPETAS

```
crm-gps-panama/
├── CLAUDE.md
├── README.md
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   │   ├── Cliente.js
│   │   │   ├── Dispositivo.js
│   │   │   ├── Contrato.js
│   │   │   ├── Pago.js
│   │   │   ├── Factura.js
│   │   │   ├── Lead.js
│   │   │   └── Usuario.js
│   │   ├── routes/
│   │   │   ├── clientes.js
│   │   │   ├── dispositivos.js
│   │   │   ├── contratos.js
│   │   │   ├── pagos.js
│   │   │   ├── facturas.js
│   │   │   ├── leads.js
│   │   │   ├── alertas.js
│   │   │   ├── inventario.js
│   │   │   └── auth.js
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── whatsapp.js
│   │   │   ├── alertas.js
│   │   │   └── exportExcel.js
│   │   └── app.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Clientes.jsx
│   │   │   ├── ClienteDetalle.jsx
│   │   │   ├── Dispositivos.jsx
│   │   │   ├── Contratos.jsx
│   │   │   ├── Pagos.jsx
│   │   │   ├── Facturas.jsx
│   │   │   ├── Leads.jsx
│   │   │   ├── Inventario.jsx
│   │   │   ├── Alertas.jsx
│   │   │   ├── Plantillas.jsx
│   │   │   └── Login.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── AlertaBadge.jsx
│   │   │   ├── WhatsAppButton.jsx
│   │   │   └── ExportButton.jsx
│   │   ├── hooks/
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   └── package.json
└── docker-compose.yml
```

---

## BASE DE DATOS — ESQUEMA COMPLETO

### Tabla: usuarios
```sql
id, nombre, email, password_hash, rol (admin/sub_agente), activo, created_at
```

### Tabla: clientes
```sql
id, nombre_razon_social, tipo_cliente (natural/juridica),
ruc, telefono_principal, whatsapp, email, direccion,
provincia, distrito, contacto_secundario_nombre,
contacto_secundario_telefono, estado (activo/inactivo/moroso/suspendido/cortado),
notas_internas, created_at, updated_at
```

### Tabla: dispositivos
```sql
id, cliente_id (FK), serial_gps, simcard, placa_vehiculo,
modelo_auto, tipo_producto (fijo/portatil),
modalidad (venta/alquiler), valor_equipo_usd,
estado (asignado/disponible/devuelto/perdido/duplicado),
fecha_asignacion, notas, created_at, updated_at
```

### Tabla: historial_dispositivos
```sql
id, dispositivo_id (FK), cliente_id (FK), accion, fecha, notas
```

### Tabla: contratos
```sql
id, cliente_id (FK), frecuencia (mensual/semestral/anual),
monto_total, fecha_inicio, fecha_proximo_pago,
dias_alerta (3 o 5), estado (activo/suspendido/cancelado),
created_at, updated_at
```

### Tabla: pagos
```sql
id, contrato_id (FK), cliente_id (FK), fecha_pago,
monto, metodo (transferencia/yappy/efectivo/cheque),
link_comprobante, registrado_por (usuario_id), notas, created_at
```

### Tabla: facturas
```sql
id, cliente_id (FK), numero_factura, fecha_emision,
items_json, subtotal, total, estado (borrador/enviada/pagada/anulada),
xml_dgi (reservado null por ahora), pdf_url, created_at
```

### Tabla: leads
```sql
id, nombre, telefono, whatsapp, email,
tipo_gps_consultado, provincia, fecha_contacto,
atendido_por (usuario_id), estado (nuevo/contactado/interesado/cerrado/perdido),
notas, created_at, updated_at
```

### Tabla: plantillas_whatsapp
```sql
id, nombre, tipo (recordatorio/mora/suspension/reactivacion),
contenido, variables_json, activa, created_at
```

### Tabla: configuracion
```sql
id, clave, valor
-- Ejemplos: dias_alerta_pago=5, dias_moroso=3, etc.
```

---

## MÓDULOS DEL CRM

### Módulo 1 — Dashboard
- Resumen: clientes activos, morosos, leads nuevos, cobros del mes
- Alertas del día: vencimientos próximos, clientes sin pagar
- Gráficas: ingresos mensuales, estado de clientes
- Accesos rápidos a las secciones principales

### Módulo 2 — Clientes
- CRUD completo de clientes
- Vista detalle: datos + dispositivos asignados + historial de pagos + facturas
- Filtros por estado, provincia, tipo
- Exportar a Excel
- Botón de cambio de estado con historial

### Módulo 3 — Dispositivos GPS
- CRUD completo vinculado a cliente
- Campos: serial GPS, SIM card, placa, modelo, tipo (fijo/portátil), modalidad (venta/alquiler), valor, estado
- Estados: asignado / disponible / devuelto / perdido / duplicado
- Historial de reasignaciones entre clientes
- Alerta visual si dispositivo está marcado como perdido o duplicado
- Exportar a Excel

### Módulo 4 — Contratos y Pagos
- Un contrato por cliente (agrupa todos sus dispositivos)
- Frecuencia: mensual / semestral / anual
- Registro de pagos con método y link opcional de comprobante
- Historial completo de pagos por cliente
- Exportar a Excel

### Módulo 5 — Alertas y Flujo de Mora
Flujo en etapas con botones de acción:
1. **Próximo a vencer** → generar mensaje WhatsApp de recordatorio
2. **Moroso** → generar mensaje WhatsApp de mora
3. **Suspensión temporal** → cambiar estado + mensaje WhatsApp
4. **Corte definitivo** → marcar SIM como duplicada, cambiar estado dispositivo
5. **Reactivación** → registrar deuda, asignar nueva SIM si aplica, reactivar cuenta

Alertas en: dashboard (badge contador) + email + mensaje WhatsApp con un clic
Días configurables desde panel de configuración (3 o 5 días)

### Módulo 6 — WhatsApp con Plantillas
4 plantillas editables con variables dinámicas:
- `[nombre_cliente]` `[monto]` `[dias_mora]` `[fecha_vencimiento]` `[empresa]`

**Plantilla 1 — Recordatorio de pago:**
> Estimado/a [nombre_cliente], le recordamos cordialmente que su pago de B/.[monto] con GPS Tracker Panamá vence el [fecha_vencimiento]. Para realizar su pago o consultas, estamos a su disposición. Gracias por su preferencia.

**Plantilla 2 — Aviso de mora:**
> Estimado/a [nombre_cliente], le informamos que su cuenta presenta un saldo pendiente de B/.[monto] con [dias_mora] días de mora. Le solicitamos amablemente regularizar su situación para evitar la suspensión del servicio. Quedamos atentos.

**Plantilla 3 — Aviso de suspensión:**
> Estimado/a [nombre_cliente], lamentamos informarle que debido a la falta de pago de B/.[monto], procederemos a la suspensión temporal de su servicio GPS. Para reactivarlo, realice su pago y comuníquese con nosotros. Estamos para servirle.

**Plantilla 4 — Reactivación / Bienvenida:**
> Estimado/a [nombre_cliente], nos complace informarle que su servicio GPS ha sido reactivado exitosamente. El saldo pendiente registrado es de B/.[monto]. Agradecemos su preferencia y quedamos a su disposición para cualquier consulta.

Cada plantilla abre `https://wa.me/507[numero]?text=[mensaje_codificado]` en nueva pestaña.

### Módulo 7 — Facturas
- Generación de factura interna en PDF
- Numeración automática correlativa
- Items, subtotal, total, estado
- Campo `xml_dgi` reservado (null por ahora) — listo para integración DGI futura
- Exportar a Excel

### Módulo 8 — Leads
- CRUD de prospectos
- Campos: nombre, teléfono, WhatsApp, email, tipo GPS consultado, provincia, fecha contacto, quién atendió, estado, notas
- Estados: nuevo → contactado → interesado → cerrado → perdido
- Botón "Convertir a cliente" que migra datos al módulo de clientes
- Exportar a Excel

### Módulo 9 — Inventario
- Vista de todos los dispositivos con su estado actual
- Valor total del inventario
- Valor de equipos perdidos (pérdidas)
- Alerta de duplicados
- Equipos disponibles para reasignar
- Exportar a Excel

---

## AUTENTICACIÓN
- Login con email + contraseña
- JWT con expiración de 8 horas
- Rutas protegidas en backend y frontend
- Pantalla de login limpia con logo GPS Tracker Panamá

---

## PLANTILLAS DE MENSAJE WHATSAPP — TONO
Siempre: formal, amable, en español panameño neutro. Firma siempre como "GPS Tracker Panamá".

---

## FASES DE CONSTRUCCIÓN

Ejecuta en este orden sin pausar entre fases:

**FASE 1** — Setup del proyecto (estructura de carpetas, package.json, .env.example, README)
**FASE 2** — Base de datos MySQL (schema completo, migraciones, datos de prueba)
**FASE 3** — Backend API REST completa (todos los endpoints CRUD + auth + alertas)
**FASE 4** — Frontend React (todas las páginas y componentes)
**FASE 5** — Integración WhatsApp (generador de links con plantillas)
**FASE 6** — Exportación Excel (todos los módulos)
**FASE 7** — Generación de PDF para facturas
**FASE 8** — Sistema de alertas (dashboard + email)
**FASE 9** — Configuración de deploy en Hostinger

Al terminar cada fase: `✅ Fase X completada. Próximo paso: Fase X+1 — [descripción]`

---

## VARIABLES DE ENTORNO (.env.example)

```
# Base de datos
DB_HOST=localhost
DB_USER=
DB_PASSWORD=
DB_NAME=crm_gps_panama
DB_PORT=3306

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=8h

# Email alertas
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=ventas@gpstrackerpanama.com

# App
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://crm.gpstrackerpanama.com
```

---

## REGLAS DE CÓDIGO

- Comentarios en español
- Manejo de errores en todos los endpoints (try/catch)
- Validación de inputs en backend
- Respuestas API siempre con formato `{ success, data, message }`
- Fechas en formato panameño: DD/MM/YYYY
- Moneda: Balboa panameño (B/.) = USD
- No usar librerías innecesarias — mantener el stack simple
- Responsive: el CRM debe funcionar en tablet y desktop

---

## FUTURO (NO construir ahora, solo dejar la arquitectura lista)

- Integración con gpspos.net (API propia a desarrollar)
- Facturación electrónica DGI Panamá (campo xml_dgi ya reservado)
- Sistema de roles con restricciones para sub-agentes
- App móvil

---

## PRIMER COMANDO AL ABRIR CLAUDE CODE

```
Lee el CLAUDE.md completo. Luego ejecuta la Fase 1 sin preguntar.
```
