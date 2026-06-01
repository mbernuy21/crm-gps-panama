# Guía de Deploy — Hostinger Business Plan

## Pre-requisitos

- Acceso SSH al servidor Hostinger
- Node.js 18+ disponible en el servidor
- MySQL creado desde el panel de Hostinger
- Dominio `crm.gpstrackerpanama.com` apuntando al servidor

---

## Paso 1 — Subir el código

```bash
# Opción A: GitHub Actions (recomendado)
# Conectar repo GitHub → Hostinger auto-deploy desde el panel

# Opción B: SFTP / SCP manual
scp -r crm-gps-panama/ usuario@servidor:/home/usuario/crm-gps-panama/
```

---

## Paso 2 — Configurar base de datos MySQL en Hostinger

1. Ir a **Panel Hostinger → MySQL Databases**
2. Crear base de datos: `crm_gps_panama`
3. Crear usuario y asignar todos los permisos
4. Anotar: host, usuario, contraseña

---

## Paso 3 — Variables de entorno en el servidor

```bash
cd /home/usuario/crm-gps-panama/backend
cp .env.example .env
nano .env
# Completar con credenciales reales de producción:
# DB_HOST=127.0.0.1  (o el host MySQL de Hostinger)
# DB_USER=tu_usuario
# DB_PASSWORD=tu_contraseña
# JWT_SECRET=clave_aleatoria_larga_de_64_chars
# SMTP_HOST=smtp.hostinger.com
# SMTP_USER=ventas@gpstrackerpanama.com
# SMTP_PASS=contraseña_email
# NODE_ENV=production
# FRONTEND_URL=https://crm.gpstrackerpanama.com
```

---

## Paso 4 — Instalar dependencias y migrar BD

```bash
# Backend
cd /home/usuario/crm-gps-panama/backend
npm install --production
node src/config/migrate.js   # Crear tablas
node src/config/seed.js      # Datos iniciales (solo primera vez)

# Frontend — build de producción
cd /home/usuario/crm-gps-panama/frontend
npm install
npm run build
# El build se genera en frontend/build/
```

---

## Paso 5 — Iniciar el servidor con PM2

```bash
# Instalar PM2 globalmente (una vez)
npm install -g pm2

cd /home/usuario/crm-gps-panama/backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Para que arranque automáticamente
```

---

## Paso 6 — Configurar subdomain crm.gpstrackerpanama.com

### En el panel de Hostinger:
1. **Domains → Subdomains** → Crear `crm.gpstrackerpanama.com`
2. Apuntar al directorio `frontend/build/`

### Configurar proxy reverso para la API:
En el archivo `.htaccess` del subdominio o en la configuración de Apache/Nginx:

```
# Proxy API al puerto 3001
ProxyPass /api http://localhost:3001/api
ProxyPassReverse /api http://localhost:3001/api
```

O configurar en el **Node.js App Manager** de Hostinger:
- Application root: `/backend`
- Application URL: `/api`
- Application startup file: `src/app.js`

---

## Paso 7 — Verificar

```bash
# Verificar que el backend está corriendo
curl https://crm.gpstrackerpanama.com/api/health

# Ver logs
pm2 logs crm-gps-panama
```

---

## Acceso inicial

| Campo | Valor |
|-------|-------|
| URL | https://crm.gpstrackerpanama.com |
| Email | admin@gpstrackerpanama.com |
| Contraseña | Admin2024! |

**⚠️ Cambiar la contraseña inmediatamente después del primer acceso.**

---

## Mantenimiento

```bash
# Actualizar código desde GitHub
git pull origin main
npm install --production
pm2 restart crm-gps-panama

# Ver logs en tiempo real
pm2 logs crm-gps-panama --lines 100
```
