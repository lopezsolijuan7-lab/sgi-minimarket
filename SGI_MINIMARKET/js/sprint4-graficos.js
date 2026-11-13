// Sprint 4: barras de inventario real por categoría, sin datos simulados.
(() => {
  const contenedor = document.getElementById('s4-barras-categorias');
  if (!contenedor) return;
  const nota = document.getElementById('s4-bar-total');
  const colores = ['#00884a','#11a959','#2cbd65','#4eca7d','#70d597','#96dfb1','#b1e3c4'];
  const formato = new Intl.NumberFormat('es-PE');

  document.addEventListener('sgi:inventario-actualizado', (evento) => {
    const registros = Array.isArray(evento.detail?.registros) ? evento.detail.registros : [];
    const categorias = new Map();
    for (const producto of registros) {
      const nombre = String(producto.categoria || 'Sin categoría');
      const unidades = Math.max(0, Number(producto.stock) || 0);
      categorias.set(nombre, (categorias.get(nombre) || 0) + unidades);
    }
    const orden = [...categorias].sort((a,b)=>b[1]-a[1]).slice(0,7);
    const maximo = Math.max(1,...orden.map(([,unidades])=>unidades));
    contenedor.replaceChildren();
    if (!orden.length) {
      const vacio = document.createElement('p');
      vacio.className = 's4-bar-vacio';
      vacio.textContent = 'Todavía no hay inventario para la sucursal seleccionada.';
      contenedor.append(vacio);
    } else {
      orden.forEach(([nombre, unidades], indice) => {
        const fila = document.createElement('div');
        fila.className = 's4-bar-fila';
        const etiqueta = document.createElement('span');
        etiqueta.className = 's4-bar-etiqueta';
        etiqueta.textContent = nombre;
        etiqueta.title = nombre;
        const pista = document.createElement('div');
        pista.className = 's4-bar-pista';
        const barra = document.createElement('div');
        barra.className = 's4-bar-relleno';
        barra.style.width = (unidades / maximo * 100).toFixed(2) + '%';
        barra.style.backgroundColor = colores[indice % colores.length];
        barra.setAttribute('role','meter');
        barra.setAttribute('aria-label', nombre + ': ' + formato.format(unidades) + ' unidades');
        barra.setAttribute('aria-valuemin','0');
        barra.setAttribute('aria-valuemax',String(maximo));
        barra.setAttribute('aria-valuenow',String(unidades));
        pista.append(barra);
        const cantidad = document.createElement('strong');
        cantidad.className = 's4-bar-cantidad';
        cantidad.textContent = formato.format(unidades);
        fila.append(etiqueta,pista,cantidad);
        contenedor.append(fila);
      });
    }
    if (nota) nota.textContent = 'Unidades disponibles por categoría en la selección actual. Datos de Supabase.';
  });
})();
