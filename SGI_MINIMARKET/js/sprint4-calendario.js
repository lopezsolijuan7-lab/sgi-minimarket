// Sprint 4 · Calendario de movimientos.
// Los filtros activan nuevas consultas autorizadas por Supabase (no cambian el inventario).
(() => {
  const admin = document.body.classList.contains('admin-body');
  const empleado = document.body.classList.contains('empleado-body');
  if (!admin && !empleado) return;

  const $ = id => document.getElementById(id);
  const ahora = () => new Date();
  const isoLocal = fecha => [fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0')].join('-');

  function estado(mensaje, error = false) {
    const destino = $('s4-filtro-estado');
    if (destino) {
      destino.textContent = mensaje;
      destino.classList.toggle('s4-error', error);
    }
  }

  function anunciar(desde, hasta, descripcion = '') {
    const detalle = { desde: desde || null, hasta: hasta || null };
    document.dispatchEvent(new CustomEvent('sgi:filtro-fechas', {detail:detalle}));
    if (!desde && !hasta) {
      estado('Mostrando los movimientos más recientes de la sucursal seleccionada.');
    } else {
      const formato = fecha => fecha.split('-').reverse().join('/');
      estado((descripcion ? descripcion + ' · ' : '') +
        'Movimientos del ' + formato(desde) + ' al ' + formato(hasta) + '.');
    }
  }

  if (admin) {
    const formulario = $('s4-filtro-form');
    const desde = $('s4-fecha-desde');
    const hasta = $('s4-fecha-hasta');
    const limpiar = $('s4-limpiar-filtro');
    const exportar = $('s4-exportar-movimientos');

    if (formulario && desde && hasta) {
      formulario.addEventListener('submit', evento => {
        evento.preventDefault();
        const inicio = desde.value;
        const fin = hasta.value;
        if (!inicio || !fin) {
          estado('Selecciona ambas fechas para consultar el período.', true);
          return;
        }
        if (inicio > fin) {
          estado('La fecha inicial no puede ser posterior a la final.', true);
          return;
        }
        anunciar(inicio, fin);
      });
      // Mantener los valores seleccionados visibles hasta pulsar Actualizar.
      limpiar?.addEventListener('click', () => {
        formulario.reset();
        anunciar(null, null);
      });
    }
    exportar?.addEventListener('click', () =>
      document.dispatchEvent(new CustomEvent('sgi:exportar-movimientos')));
  }

  if (empleado) {
    const botones = [...document.querySelectorAll('[data-s4-periodo]')];
    const dia = $('s4-dia-empleado');
    function seleccionarBoton(activo) {
      botones.forEach(boton => {
        const seleccionado = boton.dataset.s4Periodo === activo;
        boton.classList.toggle('s4-periodo-activo', seleccionado);
        boton.setAttribute('aria-pressed', String(seleccionado));
      });
    }
    botones.forEach(boton => boton.addEventListener('click', () => {
      const periodo = boton.dataset.s4Periodo;
      seleccionarBoton(periodo);
      if (dia) dia.value = '';
      if (periodo === 'todos') {
        anunciar(null, null);
        return;
      }
      const fin = ahora();
      const inicio = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
      const dias = periodo === 'hoy' ? 1 : periodo === '7dias' ? 7 : 30;
      inicio.setDate(inicio.getDate() - (dias - 1));
      anunciar(isoLocal(inicio), isoLocal(fin),
        periodo === 'hoy' ? 'Hoy' : 'Últimos ' + dias + ' días');
    }));
    dia?.addEventListener('change', () => {
      if (!dia.value) return;
      seleccionarBoton('');
      anunciar(dia.value, dia.value, 'Fecha seleccionada');
    });
    seleccionarBoton('todos');
  }
})();
