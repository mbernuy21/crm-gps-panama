// Rutas del módulo SIMcards — gestión de líneas/SIM con contrato
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const auditoria = require('../services/auditoria');

router.use(authMiddleware);

// GET /api/simcards — listar con filtros y búsqueda
router.get('/', async (req, res) => {
  try {
    const { estado, buscar } = req.query;
    const where = [];
    const params = [];
    if (estado) { where.push('s.estado = ?'); params.push(estado); }
    if (buscar) {
      where.push('(s.numero LIKE ? OR s.iccid LIKE ? OR s.operador LIKE ?)');
      const like = `%${buscar}%`;
      params.push(like, like, like);
    }
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT s.*, d.serial_gps, d.placa_vehiculo, c.nombre_razon_social AS cliente_nombre
       FROM simcards s
       LEFT JOIN dispositivos d ON d.id = s.dispositivo_id
       LEFT JOIN clientes c ON c.id = s.cliente_id
       ${whereSQL}
       ORDER BY s.numero ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error listando simcards:', err);
    res.status(500).json({ success: false, message: 'Error listando SIM cards' });
  }
});

// GET /api/simcards/stats — resumen para tarjetas
router.get('/stats', async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(estado='disponible') AS disponibles,
        SUM(estado='asignada') AS asignadas,
        SUM(estado='suspendida') AS suspendidas,
        SUM(estado='duplicada') AS duplicadas,
        SUM(estado='baja') AS bajas
      FROM simcards
    `);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error obteniendo estadísticas' });
  }
});

// POST /api/simcards — crear una SIM
router.post('/', async (req, res) => {
  try {
    const { numero, operador, iccid, plan, estado, notas } = req.body;
    if (!numero) return res.status(400).json({ success: false, message: 'El número de línea es requerido' });

    const [[dup]] = await db.query('SELECT id FROM simcards WHERE numero = ?', [numero.trim()]);
    if (dup) return res.status(400).json({ success: false, message: `La línea ${numero} ya existe` });

    const [r] = await db.query(
      `INSERT INTO simcards (numero, operador, iccid, plan, estado, notas) VALUES (?, ?, ?, ?, ?, ?)`,
      [numero.trim(), operador || null, iccid || null, plan || null, estado || 'disponible', notas || null]
    );
    await auditoria.registrar(req, 'crear', 'simcard', r.insertId, `Agregó SIM ${numero}`);
    res.status(201).json({ success: true, data: { id: r.insertId }, message: 'SIM card creada' });
  } catch (err) {
    console.error('Error creando simcard:', err);
    res.status(500).json({ success: false, message: 'Error creando SIM card' });
  }
});

// POST /api/simcards/importar — importación masiva (lista de números)
// Acepta { numeros: ["6000-0000", ...] } o { lineas: "texto con saltos de línea/comas" }
router.post('/importar', async (req, res) => {
  try {
    let { numeros, lineas, operador, plan } = req.body;

    // Si viene como texto plano, separar por saltos de línea, comas o punto y coma
    if (!numeros && lineas) {
      numeros = String(lineas).split(/[\n,;]+/);
    }
    if (!Array.isArray(numeros) || !numeros.length) {
      return res.status(400).json({ success: false, message: 'Debe enviar una lista de números' });
    }

    // Limpiar y deduplicar
    const limpios = [...new Set(
      numeros.map(n => String(n).trim()).filter(n => n.length > 0)
    )];

    let insertadas = 0;
    let duplicadas = 0;
    for (const numero of limpios) {
      try {
        const [[existe]] = await db.query('SELECT id FROM simcards WHERE numero = ?', [numero]);
        if (existe) { duplicadas++; continue; }
        await db.query(
          `INSERT INTO simcards (numero, operador, plan, estado) VALUES (?, ?, ?, 'disponible')`,
          [numero, operador || null, plan || null]
        );
        insertadas++;
      } catch { duplicadas++; }
    }
    await auditoria.registrar(req, 'crear', 'simcard', null, `Importó ${insertadas} SIM cards (${duplicadas} duplicadas omitidas)`);
    res.json({ success: true, message: `${insertadas} líneas importadas. ${duplicadas} ya existían (omitidas).`, data: { insertadas, duplicadas } });
  } catch (err) {
    console.error('Error importando simcards:', err);
    res.status(500).json({ success: false, message: 'Error importando SIM cards' });
  }
});

// POST /api/simcards/sincronizar — reconciliar con los dispositivos existentes
// Marca como 'asignada' toda SIM que ya esté en uso por un dispositivo, y libera las que no.
router.post('/sincronizar', async (req, res) => {
  try {
    // 1) Asignar las SIMs que están en algún dispositivo
    const [dispConSim] = await db.query(
      `SELECT id, simcard, cliente_id FROM dispositivos WHERE simcard IS NOT NULL AND simcard != ''`
    );
    let asignadas = 0, noEncontradas = 0;
    for (const d of dispConSim) {
      const [r] = await db.query(
        `UPDATE simcards SET estado='asignada', dispositivo_id=?, cliente_id=? WHERE numero=?`,
        [d.id, d.cliente_id || null, d.simcard.trim()]
      );
      if (r.affectedRows > 0) asignadas++; else noEncontradas++;
    }

    // 2) Liberar SIMs marcadas 'asignada' cuyo dispositivo ya no las usa
    const [liberadasRes] = await db.query(`
      UPDATE simcards s
      LEFT JOIN dispositivos d ON d.id = s.dispositivo_id AND d.simcard = s.numero
      SET s.estado='disponible', s.dispositivo_id=NULL, s.cliente_id=NULL
      WHERE s.estado='asignada' AND d.id IS NULL
    `);

    await auditoria.registrar(req, 'editar', 'simcard', null, `Sincronizó SIMs con dispositivos: ${asignadas} asignadas, ${liberadasRes.affectedRows} liberadas`);
    res.json({
      success: true,
      message: `✅ Sincronización lista: ${asignadas} líneas marcadas como asignadas, ${liberadasRes.affectedRows} liberadas.${noEncontradas ? ` ${noEncontradas} SIMs de dispositivos no estaban en el inventario.` : ''}`,
      data: { asignadas, liberadas: liberadasRes.affectedRows, noEncontradas }
    });
  } catch (err) {
    console.error('Error sincronizando simcards:', err);
    res.status(500).json({ success: false, message: 'Error sincronizando: ' + err.message });
  }
});

// PUT /api/simcards/:id — actualizar
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, operador, iccid, plan, estado, dispositivo_id, cliente_id, notas } = req.body;
    const [[existe]] = await db.query('SELECT id FROM simcards WHERE id = ?', [id]);
    if (!existe) return res.status(404).json({ success: false, message: 'SIM no encontrada' });

    await db.query(
      `UPDATE simcards SET numero=?, operador=?, iccid=?, plan=?, estado=?, dispositivo_id=?, cliente_id=?, notas=? WHERE id=?`,
      [numero, operador || null, iccid || null, plan || null, estado || 'disponible',
       dispositivo_id || null, cliente_id || null, notas || null, id]
    );
    await auditoria.registrar(req, 'editar', 'simcard', id, `Editó SIM ${numero} (estado: ${estado})`);
    res.json({ success: true, message: 'SIM actualizada' });
  } catch (err) {
    console.error('Error actualizando simcard:', err);
    res.status(500).json({ success: false, message: 'Error actualizando SIM card' });
  }
});

// DELETE /api/simcards/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [[sim]] = await db.query('SELECT numero FROM simcards WHERE id = ?', [id]);
    if (!sim) return res.status(404).json({ success: false, message: 'SIM no encontrada' });
    await db.query('DELETE FROM simcards WHERE id = ?', [id]);
    await auditoria.registrar(req, 'eliminar', 'simcard', id, `Eliminó SIM ${sim.numero}`);
    res.json({ success: true, message: 'SIM eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error eliminando SIM card' });
  }
});

module.exports = router;
