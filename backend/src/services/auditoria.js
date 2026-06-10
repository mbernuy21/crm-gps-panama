// Servicio de auditoría — registra qué usuario crea/edita/elimina cada dato
const db = require('../config/database');

/**
 * Registra una acción en la tabla auditoria.
 * No lanza errores (si falla, solo lo loguea) para no romper la operación principal.
 * @param {object} req - request de Express (usa req.usuario)
 * @param {string} accion - 'crear' | 'editar' | 'eliminar' | 'cambiar_estado'
 * @param {string} entidad - 'cliente' | 'dispositivo' | 'contrato' | 'pago' | 'simcard' | etc.
 * @param {number} entidadId - id del registro afectado
 * @param {string} descripcion - texto legible de lo que pasó
 */
async function registrar(req, accion, entidad, entidadId, descripcion) {
  try {
    const usuarioId = req.usuario?.id || null;
    const usuarioNombre = req.usuario?.nombre || 'Sistema';
    await db.query(
      `INSERT INTO auditoria (usuario_id, usuario_nombre, accion, entidad, entidad_id, descripcion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId, usuarioNombre, accion, entidad, entidadId || null, (descripcion || '').substring(0, 500)]
    );
  } catch (err) {
    console.error('Error registrando auditoría:', err.message);
  }
}

module.exports = { registrar };
