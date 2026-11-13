// Sprint 4 · Comprobante INTERNO para una entrada o salida de inventario.
// Solo recibe movimientos previamente autorizados por la capa Supabase en inventario.js.
// No es boleta de venta ni comprobante tributario de SUNAT.
(() => {
  const dialogo = document.getElementById('s4-boleta-dialog');
  if (!dialogo) return;

  const $ = id => document.getElementById(id);
  const numero = n => new Intl.NumberFormat('es-PE').format(Number(n) || 0);
  const escrito = (id, valor) => {
    const elemento = $(id);
    if (elemento) elemento.textContent = String(valor ?? '—');
  };

  const abrir = movimiento => {
    if (!movimiento || !Number.isSafeInteger(Number(movimiento.id)) ||
        Number(movimiento.id) <= 0) return;
    const esEntrada = movimiento.tipo === 'entrada';
    const tipo = esEntrada ? 'ENTRADA' : 'SALIDA';
    const fecha = movimiento.creado_en ? new Date(movimiento.creado_en) : null;
    const fechaTexto = fecha && !Number.isNaN(fecha.getTime())
      ? fecha.toLocaleString('es-PE', { dateStyle:'long', timeStyle:'short' })
      : 'Fecha no disponible';

    escrito('s4-boleta-numero', 'MOV-' + String(movimiento.id).padStart(6, '0'));
    escrito('s4-boleta-fecha', fechaTexto);
    escrito('s4-boleta-sucursal', movimiento.sucursal_nombre || 'Sucursal autorizada');
    escrito('s4-boleta-tipo', tipo);
    escrito('s4-boleta-codigo', movimiento.producto_codigo || '—');
    escrito('s4-boleta-producto', movimiento.producto_nombre || 'Producto archivado');
    escrito('s4-boleta-cantidad', (esEntrada ? '+' : '−') + numero(movimiento.cantidad) + ' unidades');
    escrito('s4-boleta-anterior', numero(movimiento.stock_anterior) + ' unidades');
    escrito('s4-boleta-nuevo', numero(movimiento.stock_nuevo) + ' unidades');
    escrito('s4-boleta-motivo', movimiento.motivo || 'Sin motivo registrado');
    const indicador = $('s4-boleta-tipo');
    if (indicador) indicador.className = esEntrada ? 's4-boleta-tipo s4-boleta-entrada' : 's4-boleta-tipo s4-boleta-salida';
    if (!dialogo.open) dialogo.showModal();
  };

  document.addEventListener('sgi:boleta-abrir', evento => abrir(evento.detail?.movimiento));
  $('s4-boleta-cerrar')?.addEventListener('click', () => dialogo.close());
  $('s4-boleta-imprimir')?.addEventListener('click', () => {
    if (!dialogo.open) return;
    document.body.classList.add('s4-imprimiendo-boleta');
    try {
      window.print(); // El diálogo de Chrome permite imprimir o guardar como PDF.
    } catch (error) {
      document.body.classList.remove('s4-imprimiendo-boleta');
      console.error('No fue posible abrir la impresión del comprobante:', error);
    }
  });
  window.addEventListener('afterprint', () => document.body.classList.remove('s4-imprimiendo-boleta'));
  dialogo.addEventListener('close', () => document.body.classList.remove('s4-imprimiendo-boleta'));
})();
