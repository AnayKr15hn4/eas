/* Intro: the page starts behind fogged glass, gets sprayed, and a squeegee wipes it clean.
   About 1.2 seconds, once per browser session (a reload replays it). Any scroll, tap,
   click, or key press skips it. The decision to play is made by the inline script in <head>. */
(() => {
  'use strict';
  const root = document.documentElement;
  if (!root.classList.contains('has-intro')) return;

  const layer = document.getElementById('introLayer');
  const blade = document.getElementById('introBlade');
  const canvas = document.getElementById('introSpray');
  const ctx = canvas && canvas.getContext('2d');
  if (!layer || !blade || !ctx) { root.classList.remove('has-intro'); return; }

  const SPRAY_START = 80, SPRAY_DUR = 380;
  const WIPE_START = 480, WIPE_DUR = 640;
  const TOTAL = WIPE_START + WIPE_DUR + 60;
  const SLANT = 7; // percent of screen width the blade leans

  const W = window.innerWidth, H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // One pre-drawn droplet, stamped at many sizes
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const s = sprite.getContext('2d');
  const body = s.createRadialGradient(30, 28, 2, 32, 32, 30);
  body.addColorStop(0, 'rgba(226,243,255,.30)');
  body.addColorStop(.72, 'rgba(205,232,255,.46)');
  body.addColorStop(.93, 'rgba(244,251,255,.92)');
  body.addColorStop(1, 'rgba(244,251,255,0)');
  s.fillStyle = body;
  s.beginPath(); s.arc(32, 32, 30, 0, Math.PI * 2); s.fill();
  s.fillStyle = 'rgba(255,255,255,.95)';
  s.beginPath(); s.ellipse(23, 21, 6, 4, -.7, 0, Math.PI * 2); s.fill();

  // Droplets land in a front spreading from a nozzle just below the screen
  const ox = W / 2, oy = H * 1.1;
  const far = Math.hypot(Math.max(ox, W - ox), oy);
  const count = Math.max(130, Math.min(360, Math.round(W * H / 4200)));
  const drops = Array.from({ length: count }, () => {
    const x = Math.random() * W, y = Math.random() * H;
    const big = Math.pow(Math.random(), 3);
    const r = 2.5 + big * 20;
    return { x, y, r, slide: r > 11 ? 8 + Math.random() * 26 : 0,
      delay: (Math.hypot(x - ox, y - oy) / far) * SPRAY_DUR * .86 + Math.random() * 45 };
  });

  const easeInOut = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const easeOutBack = k => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);

  const draw = t => {
    ctx.clearRect(0, 0, W, H);
    const spray = Math.min(1, Math.max(0, (t - SPRAY_START) / SPRAY_DUR));
    if (spray > 0) {
      const radius = Math.max(1, far * 1.15 * Math.min(1, spray * 1.15));
      const mist = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
      mist.addColorStop(0, 'rgba(214,236,255,.34)');
      mist.addColorStop(.8, 'rgba(190,224,255,.17)');
      mist.addColorStop(1, 'rgba(190,224,255,0)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, 0, W, H);
    }
    for (const d of drops) {
      const age = t - SPRAY_START - d.delay;
      if (age <= 0) continue;
      const size = d.r * 2 * easeOutBack(Math.min(1, age / 110));
      const y = d.y + d.slide * Math.min(1, age / 800);
      ctx.drawImage(sprite, d.x - size / 2, y - size / 2, size, size);
    }
  };

  const wipe = t => {
    if (t < WIPE_START) return;
    const p = -16 + 132 * easeInOut(Math.min(1, (t - WIPE_START) / WIPE_DUR));
    const top = p + SLANT, bottom = p - SLANT;
    const path = `polygon(${top}% 0,140% 0,140% 100%,${bottom}% 100%)`;
    layer.style.clipPath = path;
    layer.style.webkitClipPath = path;
    const angle = Math.atan2((2 * SLANT / 100) * W, H);
    blade.style.opacity = '1';
    blade.style.transform = `translateX(${(p / 100) * W}px) rotate(${angle}rad)`;
  };

  let raf = 0, done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    skipEvents.forEach(ev => window.removeEventListener(ev, skip));
    layer.remove();
    blade.remove();
    root.classList.remove('has-intro');
    try { sessionStorage.setItem('eas-intro', '1'); } catch (e) { /* private mode */ }
  };
  const skipEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  function skip() {
    cancelAnimationFrame(raf);
    skipEvents.forEach(ev => window.removeEventListener(ev, skip));
    blade.style.opacity = '0';
    layer.style.transition = 'opacity .16s ease-out';
    layer.style.opacity = '0';
    setTimeout(cleanup, 180);
  }
  skipEvents.forEach(ev => window.addEventListener(ev, skip, { passive: true }));

  let start = 0;
  const frame = now => {
    if (!start) start = now;
    const t = now - start;
    draw(t);
    wipe(t);
    if (t >= TOTAL) cleanup();
    else raf = requestAnimationFrame(frame);
  };

  // Give the hero photo a brief moment to be ready so the wipe reveals the finished page
  const heroes = Array.from(document.querySelectorAll('.hero-bg,.hero-car'));
  const ready = Promise.all(heroes.map(i => (i.decode ? i.decode().catch(() => {}) : null)));
  const cap = new Promise(resolve => setTimeout(resolve, 450));
  Promise.race([ready, cap]).then(() => { if (!done) raf = requestAnimationFrame(frame); });
})();
