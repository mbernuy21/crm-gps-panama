// Servicio de filtros por rol — caché de IDs de sub-agentes para evitar subqueries lentas
// Los IDs se cachean 5 minutos para no hacer SELECT en cada petición
const db = require('../config/database');

let _subAgenteIds = null;
let _cacheTime = 0;
const TTL = 5 * 60 * 1000; // 5 minutos

async function getSubAgenteIds() {
  if (_subAgenteIds && Date.now() - _cacheTime < TTL) return _subAgenteIds;
  try {
    const [rows] = await db.query("SELECT id FROM usuarios WHERE rol = 'sub_agente' AND activo = 1");
    _subAgenteIds = rows.map(r => r.id);
    _cacheTime = Date.now();
  } catch { _subAgenteIds = []; }
  return _subAgenteIds;
}

// Invalidar caché (llamar cuando se crea/edita/elimina un sub-agente)
function invalidarCache() {
  _subAgenteIds = null;
  _cacheTime = 0;
}

/**
 * Retorna el fragmento SQL y parámetros para filtrar por rol.
 * @param {object} req - request de Express
 * @param {string} alias - alias de la tabla (ej: 'c', 'd', 'p')
 * @param {string} campo - nombre del campo (default: 'creado_por')
 */
async function filtroRol(req, alias = '', campo = 'creado_por') {
  const col = alias ? `${alias}.${campo}` : campo;

  if (req.usuario.rol === 'sub_agente') {
    return { sql: `AND ${col} = ?`, params: [req.usuario.id] };
  }

  // Admin: excluir registros de sub-agentes
  const ids = await getSubAgenteIds();
  if (ids.length === 0) {
    return { sql: '', params: [] }; // Sin sub-agentes → sin filtro, máxima velocidad
  }
  const placeholders = ids.join(',');
  return { sql: `AND (${col} IS NULL OR ${col} NOT IN (${placeholders}))`, params: [] };
}

module.exports = { filtroRol, getSubAgenteIds, invalidarCache };
