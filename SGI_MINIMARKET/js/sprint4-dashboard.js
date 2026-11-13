// Sprint 4: indicadores de apoyo basados únicamente en los datos autorizados por Supabase.
// La vista muestra hasta 40 movimientos recientes, NO un historial completo.
(() => {
  if (!document.body.matches('.admin-body, .empleado-body')) return;

  const formato = new Intl.NumberFormat('es-PE');
  const $ = (id) => document.getElementById(id);
  const numero = (valor) => Math.max(0, Number(valor) || 0);

  function elemento(tipo, clase, texto) {
    const nodo = document.createElement(tipo);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = String(texto);
    return nodo;
  }

  function mensajeVacio(destino, mensaje) {
    if (!destino) return;
    destino.replaceChildren(elemento('p', 's4-empty-state', mensaje));
  }

  function pintarAlertas(destino, registros, limite) {
    if (!destino) return;
    const bajos = registros.filter(p => numero(p.stock) <= numero(p.stock_minimo))
      .sort((a, b) => numero(a.stock) - numero(b.stock));
    destino.replaceChildren();
    if (!bajos.length) {
      destino.append(elemento('p', 's4-empty-state s4-empty-ok',
        'Todo en orden: no hay productos con stock bajo en la sucursal seleccionada.'));
      return;
    }
    const visibles = typeof limite === 'number' ? bajos.slice(0, limite) : bajos;
    for (const producto of visibles) {
      const fila = elemento('div', 's4-insight-row');
      const icono = elemento('span', 's4-insight-icon s4-insight-warning', producto.stock === 0 ? '!' : '↓');
      icono.setAttribute('aria-hidden', 'true');
      const info = elemento('div', 's4-insight-content');
      info.append(elemento('strong', '', producto.nombre || 'Producto'));
      info.append(elemento('small', '', (producto.sucursal_nombre || 'Sucursal') +
        ' · ' + (producto.stock === 0 ? 'Agotado' : 'Stock bajo')));
      const cifra = elemento('span', 's4-insight-value s4-text-warning',
        formato.format(numero(producto.stock)) + ' / ' + formato.format(numero(producto.stock_minimo)));
      cifra.title = 'Unidades disponibles / stock mínimo';
      fila.append(icono, info, cifra);
      destino.append(fila);
    }
    if (typeof limite === 'number' && bajos.length > limite) {
      destino.append(elemento('p', 's4-dashboard-note',
        'Hay ' + (bajos.length - limite) + ' producto(s) adicionales por revisar.'));
    }
  }

  function actualizarInventario(registros) {
    const datos = Array.isArray(registros) ? registros : [];
    const categorias = $('s4-total-categorias');
    if (categorias) categorias.textContent = formato.format(new Set(datos.map(p => p.categoria)).size);
    pintarAlertas($('s4-alertas-resumen'), datos, 3);
    pintarAlertas($('s4-alertas-empleado'), datos);
  }

  function pintarComparacion(movimientos) {
    const destino = $('s4-grafico-movimientos');
    if (!destino) return;
    destino.replaceChildren();
    if (!movimientos.length) {
      mensajeVacio(destino, 'Todavía no hay movimientos para mostrar.');
      return;
    }
    const entrada = movimientos.filter(m => m.tipo === 'entrada')
      .reduce((total, m) => total + numero(m.cantidad), 0);
    const salida = movimientos.filter(m => m.tipo === 'salida')
      .reduce((total, m) => total + numero(m.cantidad), 0);
    const mayor = Math.max(entrada, salida, 1);
    for (const [tipo, cantidad, clase] of [
      ['Entradas', entrada, 's4-fill-entrada'], ['Salidas', salida, 's4-fill-salida']
    ]) {
      const fila = elemento('div', 's4-compare-row');
      const cabecera = elemento('div', 's4-compare-label');
      cabecera.append(elemento('span', '', tipo));
      cabecera.append(elemento('strong', '', formato.format(cantidad) + ' uds.'));
      const pista = elemento('div', 's4-compare-track');
      const barra = elemento('div', 's4-compare-fill ' + clase);
      barra.style.width = (cantidad / mayor * 100).toFixed(1) + '%';
      barra.setAttribute('role', 'meter');
      barra.setAttribute('aria-label', tipo + ': ' + formato.format(cantidad) + ' unidades');
      barra.setAttribute('aria-valuemin', '0');
      barra.setAttribute('aria-valuemax', String(mayor));
      barra.setAttribute('aria-valuenow', String(cantidad));
      pista.append(barra);
      fila.append(cabecera, pista);
      destino.append(fila);
    }
  }

  function pintarActividad(movimientos) {
    const destino = $('s4-actividad-reciente');
    if (!destino) return;
    destino.replaceChildren();
    if (!movimientos.length) {
      mensajeVacio(destino, 'Los movimientos registrados aparecerán aquí.');
      return;
    }
    for (const movimiento of movimientos.slice(0, 5)) {
      const esEntrada = movimiento.tipo === 'entrada';
      const fila = elemento('div', 's4-insight-row');
      const icono = elemento('span', 's4-insight-icon ' +
        (esEntrada ? 's4-insight-positive' : 's4-insight-negative'), esEntrada ? '↗' : '↘');
      icono.setAttribute('aria-hidden', 'true');
      const texto = elemento('div', 's4-insight-content');
      texto.append(elemento('strong', '', movimiento.producto_nombre || 'Producto'));
      let fecha = 'Fecha no disponible';
      if (movimiento.creado_en) {
        const valor = new Date(movimiento.creado_en);
        if (!Number.isNaN(valor.getTime())) {
          fecha = valor.toLocaleString('es-PE', {dateStyle:'short', timeStyle:'short'});
        }
      }
      texto.append(elemento('small', '',
        (esEntrada ? 'Entrada' : 'Salida') + ' · ' + fecha));
      const cantidad = elemento('strong', 's4-insight-value ' +
        (esEntrada ? 's4-text-positive' : 's4-text-negative'),
        (esEntrada ? '+' : '−') + formato.format(numero(movimiento.cantidad)));
      cantidad.title = 'Unidades ' + (esEntrada ? 'ingresadas' : 'retiradas');
      fila.append(icono, texto, cantidad);
      destino.append(fila);
    }
  }

  function actualizarMovimientos(movimientos, metadatos = {}) {
    const datos = Array.isArray(movimientos) ? movimientos : [];
    const cantidad = $('s4-movimientos-contador');
    if (cantidad) cantidad.textContent = formato.format(datos.length);
    const nota = $('s4-nota-movimientos');
    if (nota) {
      nota.textContent = metadatos.error
        ? 'No se pudo consultar Supabase. Revisa tu conexión e inténtalo de nuevo.'
        : (metadatos.filtrado
          ? 'Gráfico basado en hasta ' + (metadatos.limite || 500) +
            ' movimientos de las fechas elegidas, autorizados para esta sucursal.'
          : 'Gráfico basado en hasta 40 movimientos recientes de la sucursal seleccionada.');
    }
    pintarComparacion(datos);
    pintarActividad(datos);
  }

  document.addEventListener('sgi:inventario-actualizado', e => actualizarInventario(e.detail?.registros));
  document.addEventListener('sgi:movimientos-actualizados', e =>
    actualizarMovimientos(e.detail?.movimientos, e.detail || {}));
})();
