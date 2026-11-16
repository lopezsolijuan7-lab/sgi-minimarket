(function() {
  const contenedor = document.getElementById('fondo-emojis');
  if (!contenedor) return;
  const emojis = ['🛒', '😺', '😸', '🧑‍💼', '👩‍💼', '📦', '🍎', '🥐', '🥛', '🏷️', '💳', '🧃'];
  const particulas = [];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('span');
    el.className = 'emoji-rebote';
    el.textContent = emojis[i % emojis.length];
    contenedor.appendChild(el);
    const size = 28 + Math.random() * 18;
    el.style.fontSize = size + 'px';
    particulas.push({
      el,
      x: Math.random() * (window.innerWidth - 60),
      y: Math.random() * (window.innerHeight - 60),
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.9),
      vy: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.9),
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

const jazzBtn = document.getElementById('jazzToggle');
if (jazzBtn) {
  jazzBtn.addEventListener('click', () => {
    document.getElementById('jazzWidget').classList.toggle('abierto');
  });
}
