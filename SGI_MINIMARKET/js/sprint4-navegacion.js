// Sprint 4: navegación entre vistas sin desplazamiento por anclas.
// Los formularios y datos de Supabase permanecen montados; solo cambia su visibilidad.
(() => {
  const admin = document.body.classList.contains('admin-body');
  const empleado = document.body.classList.contains('empleado-body');
  if (!admin && !empleado) return;
  const nombres = admin
    ? {inicio:'Centro de control', productos:'Productos', registro:'Registrar producto',
       categorias:'Categorías', alertas:'Alertas de stock', movimientos:'Entradas y salidas',
       'administracion-sucursales':'Gestión de sucursales'}
    : {inicio:'Inicio', productos:'Productos', movimientos:'Movimientos'};
  const nav = document.querySelector(admin ? '.admin-nav' : '.menu-lateral nav');
  if (!nav) return;
  const etiqueta = document.getElementById('s4-titulo-vista');

  function vistaDesdeURL() {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    return Object.hasOwn(nombres, hash) ? hash : 'inicio';
  }
  function mostrarVista(vista, historial = false) {
    if (!Object.hasOwn(nombres, vista)) vista = 'inicio';
    document.body.dataset.s4View = vista;
    if (etiqueta) etiqueta.textContent = nombres[vista];
    for (const enlace of nav.querySelectorAll('a[href^="#"]')) {
      const activa = enlace.getAttribute('href') === '#' + vista;
      enlace.classList.toggle('active', activa);
      if (activa) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    }
    if (historial && window.location.hash !== '#' + vista) {
      window.history.pushState(null, '', '#' + vista);
    }
    // Evita que una ancla vuelva a desplazar la página hacia el formulario.
    window.requestAnimationFrame(() => window.scrollTo({top:0, left:0, behavior:'instant'}));
  }

  document.addEventListener('click', (evento) => {
    const enlace = evento.target.closest('a[href^="#"]');
    if (!enlace) return;
    const destino = enlace.getAttribute('href').slice(1);
    if (!Object.hasOwn(nombres, destino)) return;
    evento.preventDefault();
    mostrarVista(destino, true);
  });
  window.addEventListener('hashchange', () => mostrarVista(vistaDesdeURL()));
  window.addEventListener('popstate', () => mostrarVista(vistaDesdeURL()));
  mostrarVista(vistaDesdeURL());
})();
