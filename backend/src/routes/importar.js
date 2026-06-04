// Importación desde Google Sheets — GPS Tracker Panamá
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware: auth } = require('../middleware/auth');
const https = require('https');
const http = require('http');

// Función para extraer el ID de una URL de Google Sheets
function extraerSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Función para extraer el gid (pestaña) de la URL
function extraerGid(url) {
  const match = url.match(/[#&?]gid=(\d+)/);
  return match ? match[1] : '0';
}

// Función para descargar CSV desde una URL
function descargarCSV(url) {
  return new Promise((resolve, reject) => {
    const cliente = url.startsWith('https') ? https : http;
    cliente.get(url, (res) => {
      // Seguir redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return descargarCSV(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} al descargar el Sheet`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Parsear CSV simple (maneja comas dentro de comillas)
function parsearCSV(texto) {
  const lineas = texto.trim().split('\n').filter(l => l.trim());
  if (lineas.length < 2) return [];

  const encabezados = lineas[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
    .replace(/\s+/g, '_'));

  const filas = [];
  for (let i = 1; i < lineas.length; i++) {
    const valores = [];
    let dentroComillas = false;
    let valorActual = '';
    for (const char of lineas[i]) {
      if (char === '"') { dentroComillas = !dentroComillas; }
      else if (char === ',' && !dentroComillas) { valores.push(valorActual.trim()); valorActual = ''; }
      else { valorActual += char; }
    }
    valores.push(valorActual.trim());

    const fila = {};
    encabezados.forEach((h, idx) => { fila[h] = valores[idx] || ''; });
    filas.push(fila);
  }
  return filas;
}

// POST /api/importar/preview — vista previa sin guardar
router.post('/preview', auth, async (req, res) => {
  try {
    const { url, tipo } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL requerida' });

    const sheetId = extraerSheetId(url);
    if (!sheetId) return res.status(400).json({ success: false, message: 'URL de Google Sheets inválida' });

    const gid = extraerGid(url);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    const csvTexto = await descargarCSV(csvUrl);
    const filas = parsearCSV(csvTexto);

    if (!filas.length) return res.status(400).json({ success: false, message: 'El Sheet está vacío o no se pudo leer' });

    // Devolver primeras 5 filas como preview
    res.json({
      success: true,
      data: {
        total: filas.length,
        columnas: Object.keys(filas[0]),
        preview: filas.slice(0, 5),
        csvUrl
      }
    });
  } catch (err) {
    console.error('Error preview:', err.message);
    res.status(500).json({ success: false, message: 'No se pudo leer el Google Sheet. Verifica que sea público (Compartir → "Cualquiera con el enlace").' });
  }
});

// POST /api/importar/dispositivos — importar SIM cards y dispositivos GPS
router.post('/dispositivos', auth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL requerida' });

    const sheetId = extraerSheetId(url);
    if (!sheetId) return res.status(400).json({ success: false, message: 'URL inválida' });

    const gid = extraerGid(url);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const csvTexto = await descargarCSV(csvUrl);
    const filas = parsearCSV(csvTexto);

    let importados = 0, omitidos = 0, errores = [];

    for (const fila of filas) {
      const serial = fila.serial_gps || fila.serial || fila.serial_gps || '';
      if (!serial.trim()) { omitidos++; continue; }

      const simcard = fila.simcard || fila.sim_card || fila.sim || fila.numero_sim || null;
      const simLimpia = simcard && simcard.trim() ? simcard.trim() : null;

      // Verificar si ya existe por serial
      const [[yaExiste]] = await db.query('SELECT id FROM dispositivos WHERE serial_gps = ?', [serial.trim()]);
      if (yaExiste) { omitidos++; continue; }

      // Verificar SIM única
      if (simLimpia) {
        const [[simDup]] = await db.query('SELECT id FROM dispositivos WHERE simcard = ?', [simLimpia]);
        if (simDup) {
          errores.push(`SIM ${simLimpia} duplicada (fila: ${serial})`);
          omitidos++;
          continue;
        }
      }

      try {
        await db.query(
          `INSERT INTO dispositivos (serial_gps, simcard, placa_vehiculo, modelo_auto,
            tipo_producto, modalidad, valor_equipo_usd, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'disponible')`,
          [
            serial.trim(),
            simLimpia,
            fila.placa_vehiculo || fila.placa || null,
            fila.modelo_auto || fila.modelo || null,
            ['fijo','portatil'].includes(fila.tipo_producto) ? fila.tipo_producto : 'fijo',
            ['alquiler','venta'].includes(fila.modalidad) ? fila.modalidad : 'alquiler',
            parseFloat(fila.valor_equipo_usd || fila.valor || 0) || 0
          ]
        );
        importados++;
      } catch (e) {
        errores.push(`Error en fila ${serial}: ${e.message}`);
        omitidos++;
      }
    }

    res.json({
      success: true,
      data: { importados, omitidos, errores: errores.slice(0, 10) },
      message: `✅ ${importados} dispositivos importados, ${omitidos} omitidos${errores.length ? ` (${errores.length} errores)` : ''}`
    });
  } catch (err) {
    console.error('Error importando dispositivos:', err.message);
    res.status(500).json({ success: false, message: 'Error importando: ' + err.message });
  }
});

// POST /api/importar/clientes — importar clientes desde Google Sheets
router.post('/clientes', auth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL requerida' });

    const sheetId = extraerSheetId(url);
    if (!sheetId) return res.status(400).json({ success: false, message: 'URL inválida' });

    const gid = extraerGid(url);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const csvTexto = await descargarCSV(csvUrl);
    const filas = parsearCSV(csvTexto);

    let importados = 0, omitidos = 0, errores = [];

    for (const fila of filas) {
      const nombre = fila.nombre_razon_social || fila.nombre || fila.razon_social || '';
      if (!nombre.trim()) { omitidos++; continue; }

      // Verificar si ya existe por nombre o RUC
      const ruc = fila.ruc || null;
      if (ruc && ruc.trim()) {
        const [[yaExiste]] = await db.query('SELECT id FROM clientes WHERE ruc = ?', [ruc.trim()]);
        if (yaExiste) { omitidos++; continue; }
      }

      try {
        await db.query(
          `INSERT INTO clientes (nombre_razon_social, tipo_cliente, ruc, telefono_principal,
            whatsapp, email, direccion, provincia, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
          [
            nombre.trim(),
            ['natural','juridica'].includes(fila.tipo_cliente) ? fila.tipo_cliente : 'natural',
            ruc ? ruc.trim() : null,
            fila.telefono_principal || fila.telefono || null,
            fila.whatsapp || null,
            fila.email || null,
            fila.direccion || null,
            fila.provincia || null
          ]
        );
        importados++;
      } catch (e) {
        errores.push(`Error en fila ${nombre}: ${e.message}`);
        omitidos++;
      }
    }

    res.json({
      success: true,
      data: { importados, omitidos, errores: errores.slice(0, 10) },
      message: `✅ ${importados} clientes importados, ${omitidos} omitidos`
    });
  } catch (err) {
    console.error('Error importando clientes:', err.message);
    res.status(500).json({ success: false, message: 'Error importando: ' + err.message });
  }
});

// GET /api/importar/plantillas — descargar plantilla CSV de ejemplo
router.get('/plantilla/dispositivos', auth, (req, res) => {
  const csv = `serial_gps,simcard,placa_vehiculo,modelo_auto,tipo_producto,modalidad,valor_equipo_usd
GPS-2024-001,507-6789-001,PV-1234,Toyota Hilux 2022,fijo,alquiler,150
GPS-2024-002,507-6789-002,PV-5678,Honda Civic 2021,fijo,alquiler,150
GPS-2024-003,,,,portatil,venta,95`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_dispositivos.csv"');
  res.send(csv);
});

router.get('/plantilla/clientes', auth, (req, res) => {
  const csv = `nombre_razon_social,tipo_cliente,ruc,telefono_principal,whatsapp,email,direccion,provincia
Carlos Rodríguez,natural,8-123-456,6789-0001,50767890001,carlos@email.com,Calle 50 Panama,Panamá
Empresa Logística S.A.,juridica,155-789-1,264-1234,50764641234,logistica@empresa.com,Zona Industrial,Colón`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_clientes.csv"');
  res.send(csv);
});

module.exports = router;
