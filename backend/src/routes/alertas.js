// Rutas del sistema de alertas y flujo de mora
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { enviarEmailAlerta } = require('../services/alertas');

router.use(authMiddleware);

// GET /api/alertas — obtener todas las alertas del día
router.get('/', async (req, res) => {
  try {
    // Días configurados desde la BD
    const [[configAlerta]] = await db.query(
      "SELECT valor FROM configuracion WHERE clave = 'dias_alerta_pago'"
    );
    const [[configMoroso]] = await db.query(
      "SELECT valor FROM configuracion WHERE clave = 'dias_moroso'"
    );

    const diasAlerta = parseInt(configAlerta?.valor || 5);
    const diasMoroso = parseInt(configMoroso?.valor || 3);

    // Próximos a vencer (dentro de los días de alerta)
    const [proximos] = await db.query(`
      SELECT con.*, c.nombre_razon_social AS cliente_nombre, c.whatsapp, c.estado AS cliente_estado,
        DATEDIFF(con.fecha_proximo_pago, CURDATE()) AS dias_para_vencer
      FROM contratos con
      INNER JOIN clientes c ON c.id = con.cliente_id
      WHERE con.estado = 'activo'
        AND c.estado = 'activo'
        AND DATEDIFF(con.fecha_proximo_pago, CURDATE()) BETWEEN 1 AND ?
      ORDER BY con.fecha_proximo_pago ASC
    `, [diasAlerta]);

    // Vencidos hoy
    const [vencidos_hoy] = await db.query(`
      SELECT con.*, c.nombre_razon_social AS cliente_nombre, c.whatsapp, c.estado AS cliente_estado
      FROM contratos con
      INNER JOIN clientes c ON c.id = con.cliente_id
      WHERE con.estado = 'activo'
        AND DATE(con.fecha_proximo_pago) = CURDATE()
      ORDER BY c.nombre_razon_social ASC
    `);

    // Morosos (vencidos hace más de X días)
    const [morosos] = await db.query(`
      SELECT con.*, c.nombre_razon_social AS cliente_nombre, c.whatsapp, c.estado AS cliente_estado,
        DATEDIFF(CURDATE(), con.fecha_proximo_pago) AS dias_mora
      FROM contratos con
      INNER JOIN clientes c ON c.id = con.cliente_id
      WHERE con.estado = 'activo'
        AND DATEDIFF(CURDATE(), con.fecha_proximo_pago) BETWEEN ? AND 30
      ORDER BY dias_mora DESC
    `, [diasMoroso]);

    // Suspendidos (más de 30 días de mora)
    const [suspendidos] = await db.query(`
      SELECT con.*, c.nombre_razon_social AS cliente_nombre, c.whatsapp, c.estado AS cliente_estado,
        DATEDIFF(CURDATE(), con.fecha_proximo_pago) AS dias_mora
      FROM contratos con
      INNER JOIN clientes c ON c.id = con.cliente_id
      WHERE (con.estado = 'suspendido' OR c.estado IN ('suspendido', 'cortado'))
      ORDER BY dias_mora DESC
    `);

    res.json({
      success: true,
      data: {
        proximos_a_vencer: proximos,
        vencidos_hoy,
        morosos,
        suspendidos,
        resumen: {
          proximos: proximos.length,
          vencidos_hoy: vencidos_hoy.length,
          morosos: morosos.length,
          suspendidos: suspendidos.length,
          total: proximos.length + vencidos_hoy.length + morosos.length
        }
      }
    });
  } catch (err) {
    console.error('Error obteniendo alertas:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo alertas' });
  }
});

// POST /api/alertas/ejecutar — actualizar estados automáticamente
router.post('/ejecutar', async (req, res) => {
  try {
    const [[configMoroso]] = await db.query(
      "SELECT valor FROM configuracion WHERE clave = 'dias_moroso'"
    );
    const diasMoroso = parseInt(configMoroso?.valor || 3);

    // Marcar como morosos
    const [morosos] = await db.query(`
      UPDATE clientes c
      INNER JOIN contratos con ON con.cliente_id = c.id
      SET c.estado = 'moroso'
      WHERE c.estado = 'activo'
        AND con.estado = 'activo'
        AND DATEDIFF(CURDATE(), con.fecha_proximo_pago) >= ?
    `, [diasMoroso]);

    res.json({
      success: true,
      message: `Estados actualizados. ${morosos.affectedRows} clientes marcados como morosos.`
    });
  } catch (err) {
    console.error('Error ejecutando alertas:', err);
    res.status(500).json({ success: false, message: 'Error ejecutando alertas' });
  }
});

// POST /api/alertas/email — enviar alerta por email
router.post('/email', async (req, res) => {
  try {
    const { tipo, cliente_id } = req.body;

    const [[cliente]] = await db.query(
      `SELECT c.*, con.monto_total, con.fecha_proximo_pago,
        DATEDIFF(CURDATE(), con.fecha_proximo_pago) AS dias_mora
       FROM clientes c
       LEFT JOIN contratos con ON con.cliente_id = c.id AND con.estado IN ('activo','suspendido')
       WHERE c.id = ?`,
      [cliente_id]
    );

    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

    await enviarEmailAlerta(cliente, tipo);
    res.json({ success: true, message: 'Email de alerta enviado' });
  } catch (err) {
    console.error('Error enviando email:', err);
    res.status(500).json({ success: false, message: 'Error enviando email' });
  }
});

module.exports = router;
