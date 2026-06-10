// Servicio de exportación a Excel (todos los módulos)
const XLSX = require('xlsx');

// Formatear fecha para celdas de Excel en formato panameño DD/MM/YYYY
function formatFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function generarExcelClientes(clientes) {
  const datos = clientes.map(c => ({
    'ID': c.id,
    'Nombre / Razón Social': c.nombre_razon_social,
    'Tipo': c.tipo_cliente,
    'RUC': c.ruc || '',
    'Teléfono': c.telefono_principal || '',
    'WhatsApp': c.whatsapp || '',
    'Email': c.email || '',
    'Provincia': c.provincia || '',
    'Estado': c.estado,
    'Dispositivos': c.total_dispositivos || 0,
    'Registro': formatFecha(c.created_at)
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [
    { wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function generarExcelDispositivos(dispositivos) {
  const datos = dispositivos.map(d => ({
    'ID': d.id,
    'Serial GPS': d.serial_gps,
    'SIM Card': d.simcard || '',
    'Placa': d.placa_vehiculo || '',
    'Modelo Auto': d.modelo_auto || '',
    'Tipo': d.tipo_producto,
    'Modalidad': d.modalidad,
    'Valor (USD)': parseFloat(d.valor_equipo_usd || 0),
    'Estado': d.estado,
    'Cliente': d.cliente_nombre || 'Sin asignar',
    'Fecha Asignación': formatFecha(d.fecha_asignacion)
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [
    { wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 20 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 28 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Dispositivos');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function generarExcelPagos(pagos) {
  const datos = pagos.map(p => ({
    'ID': p.id,
    'Cliente': p.cliente_nombre,
    'Fecha Pago': formatFecha(p.fecha_pago),
    'Monto (B/.)': parseFloat(p.monto),
    'Método': p.metodo,
    'Registrado Por': p.registrado_por_nombre || '',
    'Notas': p.notas || '',
    'Comprobante': p.link_comprobante || ''
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [
    { wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
    { wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Pagos');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function generarExcelFacturas(facturas) {
  const datos = facturas.map(f => ({
    'Número': f.numero_factura,
    'Cliente': f.cliente_nombre,
    'Fecha': formatFecha(f.fecha_emision),
    'Subtotal (B/.)': parseFloat(f.subtotal),
    'Total (B/.)': parseFloat(f.total),
    'Estado': f.estado
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [
    { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function generarExcelLeads(leads) {
  const datos = leads.map(l => ({
    'ID': l.id,
    'Nombre': l.nombre,
    'Teléfono': l.telefono || '',
    'WhatsApp': l.whatsapp || '',
    'Email': l.email || '',
    'GPS Consultado': l.tipo_gps_consultado || '',
    'Provincia': l.provincia || '',
    'Fecha Contacto': formatFecha(l.fecha_contacto),
    'Estado': l.estado,
    'Atendido Por': l.atendido_por_nombre || '',
    'Notas': l.notas || ''
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [
    { wch: 6 }, { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 25 },
    { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function generarExcelInventario(dispositivos) {
  const datos = dispositivos.map(d => ({
    'Serial GPS': d.serial_gps,
    'SIM Card': d.simcard || '',
    'Placa': d.placa_vehiculo || '',
    'Tipo': d.tipo_producto,
    'Modalidad': d.modalidad,
    'Estado': d.estado,
    'Valor (USD)': parseFloat(d.valor_equipo_usd || 0),
    'Cliente Asignado': d.cliente_nombre || 'Sin asignar',
    'Fecha Asignación': formatFecha(d.fecha_asignacion)
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 28 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Excel de contratos
function generarExcelContratos(contratos) {
  const datos = contratos.map(c => ({
    'ID': c.id,
    'Cliente': c.cliente_nombre || '',
    'Frecuencia': c.frecuencia,
    'Monto (B/.)': parseFloat(c.monto_total).toFixed(2),
    'Fecha inicio': formatFecha(c.fecha_inicio),
    'Próximo pago': formatFecha(c.fecha_proximo_pago),
    'Días para vencer': c.dias_para_vencer,
    'Estado': c.estado,
    'Estado cliente': c.cliente_estado || ''
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Contratos');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Excel de SIM cards
function generarExcelSimcards(sims) {
  const datos = sims.map(s => ({
    'ID': s.id,
    'Número': s.numero,
    'Operador': s.operador || '',
    'ICCID': s.iccid || '',
    'Plan': s.plan || '',
    'Estado': s.estado,
    'GPS asignado': s.serial_gps || '',
    'Placa': s.placa_vehiculo || '',
    'Cliente': s.cliente_nombre || '',
    'Notas': s.notas || ''
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 26 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws, 'SIM Cards');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  generarExcelClientes,
  generarExcelDispositivos,
  generarExcelPagos,
  generarExcelFacturas,
  generarExcelLeads,
  generarExcelInventario,
  generarExcelContratos,
  generarExcelSimcards
};
