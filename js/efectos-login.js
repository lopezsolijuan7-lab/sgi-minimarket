// Pantalla de bienvenida suave al cargar
window.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splashBienvenida');
  if (splash) {
    setTimeout(() => splash.classList.add('oculto'), 1450);
  }
});

// Emojis rebotando en el fondo
(function() {
  const contenedor = document.getElementById('fondo-emojis');
  if (!contenedor) return;
  const emojis = ['🛒', '😺', '😸', '🧑‍💼', '👩‍💼', '📦', '🍎', '🥐', '🥛', '🏷️', '💳', '🧃'];
  const particulas = [];
  for (let i = 0; i < 16; i++) {
    const el = document.createElement('span');
    el.className = 'emoji-rebote';
    el.textContent = emojis[i % emojis.length];
    contenedor.appendChild(el);
    const size = 26 + Math.random() * 16;
    el.style.fontSize = size + 'px';
    particulas.push({
      el,
      x: Math.random() * (window.innerWidth - 60),
      y: Math.random() * (window.innerHeight - 60),
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.75 + Math.random() * 0.8),
      vy: (Math.random() < 0.5 ? -1 : 1) * (0.75 + Math.random() * 0.8),
      size
    });
  }
  function animar() {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    for (const p of particulas) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x <= 0) { p.x = 0; p.vx *= -1; }
      else if (p.x + p.size >= maxW) { p.x = maxW - p.size; p.vx *= -1; }
      if (p.y <= 0) { p.y = 0; p.vy *= -1; }
      else if (p.y + p.size >= maxH) { p.y = maxH - p.size; p.vy *= -1; }
      p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    }
    requestAnimationFrame(animar);
  }
  animar();
})();

// Reproductor Noir Jazz Lounge
const playerCard = document.getElementById('jazzPlayerCard');
const playBtn = document.getElementById('jazzPlayBtn');
const iconPlay = document.getElementById('iconPlay');
const ytHolder = document.getElementById('yt-hidden-holder');
let sonando = false;

if (playBtn && playerCard) {
  playBtn.addEventListener('click', () => {
    sonando = !sonando;
    playerCard.classList.toggle('sonando', sonando);

    if (sonando) {
      iconPlay.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      if (window.location.protocol.startsWith('http')) {
        ytHolder.innerHTML = '<iframe width="1" height="1" src="https://youtube.com" allow="autoplay"></iframe>';
      } else {
        window.open('https://youtu.be', '_blank', 'noopener');
      }
    } else {
      iconPlay.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      ytHolder.innerHTML = '';
    }
  });
}
