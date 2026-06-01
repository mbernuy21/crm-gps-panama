# CRM GPS Tracker Panamá

Sistema CRM completo para gestión de clientes, dispositivos GPS, contratos, pagos y facturas de GPS Tracker Panamá.

## Stack Técnico

- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express
- **Base de datos:** MySQL
- **Auth:** JWT
- **Hosting:** Hostinger Business Plan

## Estructura del Proyecto

```
crm-gps-panama/
├── backend/          # API REST Node.js + Express
├── frontend/         # App React
└── docker-compose.yml
```

## Instalación (Desarrollo Local)

### Opción 1: Docker (recomendado)

```bash
# Copiar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales

# Levantar todos los servicios
docker-compose up -d
```

App disponible en: http://localhost:3000  
API disponible en: http://localhost:3001

### Opción 2: Manual

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales MySQL
npm run migrate   # Crear tablas
npm run seed      # Datos de prueba
npm run dev       # Servidor en modo desarrollo
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## Variables de Entorno

Copiar `backend/.env.example` a `backend/.env` y completar:

| Variable | Descripción |
|----------|-------------|
| `DB_HOST` | Host MySQL (localhost o IP Hostinger) |
| `DB_USER` | Usuario MySQL |
| `DB_PASSWORD` | Contraseña MySQL |
| `DB_NAME` | `crm_gps_panama` |
| `JWT_SECRET` | Clave secreta para tokens JWT |
| `SMTP_HOST` | Servidor SMTP para emails |
| `SMTP_USER` | Email de envío |
| `SMTP_PASS` | Contraseña SMTP |

## Deploy en Hostinger

1. Subir código a GitHub
2. Configurar auto-deploy en Hostinger Business Panel
3. Crear base de datos MySQL en Hostinger
4. Configurar variables de entorno en el panel de Hostinger
5. Ejecutar migraciones: `npm run migrate`

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Dashboard | Resumen ejecutivo, alertas del día, gráficas |
| Clientes | CRUD completo, estados, historial |
| Dispositivos | GPS vinculados a clientes, historial de reasignaciones |
| Contratos y Pagos | Gestión de contratos, registro de pagos |
| Alertas y Mora | Flujo de mora por etapas con botones WhatsApp |
| WhatsApp | 4 plantillas editables con variables dinámicas |
| Facturas | PDF interno, estructura DGI lista |
| Leads | Pipeline de prospectos, conversión a cliente |
| Inventario | Estado de todos los equipos, valor total |

## Usuarios de Prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@gpstrackerpanama.com | Admin2024! | Administrador |

## Contacto

**GPS Tracker Panamá**  
WhatsApp: 6643-1330 / 6216-4006  
Email: ventas@gpstrackerpanama.com  
Web: gpstrackerpanama.com
