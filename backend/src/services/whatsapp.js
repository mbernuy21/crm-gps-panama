// Servicio de generación de links de WhatsApp con plantillas
// Los mensajes se abren en nueva pestaña del navegador — no hay API de WhatsApp

function generarLinkWhatsApp(numero, mensaje) {
  // Limpiar número: solo dígitos
  const numeroLimpio = numero.replace(/\D/g, '');
  return `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
}

function resolverVariables(plantilla, variables) {
  let mensaje = plantilla;
  if (variables && typeof variables === 'object') {
    Object.keys(variables).forEach(key => {
      mensaje = mensaje.replaceAll(`[${key}]`, variables[key] !== undefined ? variables[key] : '');
    });
  }
  return mensaje;
}

module.exports = { generarLinkWhatsApp, resolverVariables };
