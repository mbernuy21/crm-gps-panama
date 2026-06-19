# Configuración de Railway — CRM GPS Tracker Panamá

## Problema: Deploy Crashed
El servidor crasheaba porque **Railway no tenía configuradas las variables de entorno** para conectar a MySQL.

## Solución

### Paso 1: Crear servicio de MySQL en Railway
1. En el dashboard de Railway (`railway.app`)
2. Crear nuevo servicio → Base de datos → MySQL
3. Railway generará automáticamente estas variables:
   - `DATABASE_URL` (o configurar manualmente)
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`

### Paso 2: Configurar variables de entorno en Railway

En el dashboard de Railway, ir a **Variables**:

```
# Base de datos
DB_HOST=<tu-host-mysql-railway>
DB_USER=<usuario-mysql>
DB_PASSWORD=<contraseña-mysql>
DB_NAME=crm_gps_panama
DB_PORT=3306

# JWT
JWT_SECRET=gps_tracker_panama_jwt_secret_2024_produccion_clave_super_segura_64chars!
JWT_EXPIRES_IN=8h

# Email
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=ventas@gpstrackerpanama.com
SMTP_PASS=<contraseña-email>
EMAIL_FROM=ventas@gpstrackerpanama.com

# App
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://crm.gpstrackerpanama.com
REACT_APP_API_URL=https://api.gpstrackerpanama.com
```

### Paso 3: Conectar repositorio GitHub

1. En Railway, seleccionar el servicio del backend
2. **Settings → Deploy from GitHub**
3. Conectar tu repositorio `mbernuy21/crm-gps-panama`
4. Rama: `main`

### Paso 4: Configurar comando de build

En **Deploy → Build Command**:
```bash
cd backend && npm install
```

En **Deploy → Start Command**:
```bash
cd backend && node src/app.js
```

### Paso 5: Verifica el healthcheck

Railway debe verificar automáticamente:
- Ruta: `/api/health`
- Método: GET
- El servidor responde: `{ success: true, message: "CRM GPS Tracker Panamá API funcionando", timestamp: "..." }`

### Paso 6: Ejecutar migraciones

Después de que el servicio esté corriendo:

```bash
# En la terminal de Railway:
cd backend && npm run migrate
cd backend && npm run seed
```

O via comando custom en Railway:
```bash
railway run "cd backend && npm run migrate && npm run seed"
```

## Verificación

### Check 1: ¿API responde?
```bash
curl https://tu-railway-url/api/health
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "CRM GPS Tracker Panamá API funcionando",
  "timestamp": "2026-06-18T..."
}
```

### Check 2: ¿BD conectada?
```bash
# En logs de Railway, deberías ver:
✅ Conexión a MySQL establecida
```

### Check 3: ¿Login funciona?
- Acceder a `crm.gpstrackerpanama.com` (frontend)
- Probar login con credenciales de admin (creadas en seed.js)

## Solucionar crash futuro

El código fue actualizado en `backend/src/config/database.js`:
- **Antes:** crash si no conectaba a MySQL
- **Ahora:** inicia en modo degradado y reintenta conectar

Si ves logs como:
```
⚠️ No se pudo conectar a MySQL. El servidor iniciará en modo degradado.
```

Verifica:
1. ¿MySQL está corriendo?
2. ¿Las credenciales en variables de entorno son correctas?
3. ¿El firewall/network permite la conexión?

## Variables de entorno seguras

⚠️ **NUNCA** commities `.env` a Git. El proyecto incluye `.env.example` como template.

Para desarrollo local, copia `.env.example` → `.env` y llena los valores.

```bash
cp backend/.env.example backend/.env
# Editar con valores locales
```

---

**Última actualización:** 2026-06-18
**Próximo paso:** Configurar variables en Railway dashboard y triggear nuevo deploy
