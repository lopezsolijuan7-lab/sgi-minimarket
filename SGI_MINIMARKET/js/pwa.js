// PWA opcional: solo se almacenan recursos visuales estaticos, no datos ni sesiones.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(error => {
      console.info('La instalación como PWA no está disponible:', error.message);
    });
  });
}
