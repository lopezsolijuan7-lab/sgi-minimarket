const CACHE_NAME = 'sgi-minimarket-recursos-v1';
const IMAGENES = ['./icons/sgi-192.png','./icons/sgi-512.png','./img/minimarket.jpg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(IMAGENES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(k => k.startsWith('sgi-minimarket-recursos-') && k !== CACHE_NAME)
    .map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// API de Supabase, credenciales, HTML y JS nunca se almacenan en caché aquí.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  if (!(/\/icons\/sgi-(192|512)\.png$/.test(u.pathname) || /\/img\/minimarket\.jpg$/.test(u.pathname))) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
