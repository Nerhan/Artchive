/* ===== Artchive // icono animado de la pestaña =====
   favicon.svg es el icono fijo. Los navegadores no animan los iconos (un GIF solo se mueve
   en Firefox), así que aquí se dibuja el mismo icono en un lienzo pequeño unas 12 veces por
   segundo y se pone como icono de la pestaña: el nodo da vueltas alrededor del núcleo,
   pasando por detrás y por delante, y el núcleo late.
   Con "reducir movimiento" se queda el icono fijo.
*/
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;

  const S = 64, C = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const GREEN = '#00ff66', DARK = '#020a05', WHITE = '#eafff1';
  const RX = 21, RY = 8, TILT = -20 * Math.PI / 180;
  const PERIOD = 3200;         // ms por vuelta
  const FPS = 12;

  function plate() {
    ctx.beginPath();
    [[15, 2], [62, 2], [62, 49], [49, 62], [2, 62], [2, 15]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = DARK;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.lineJoin = 'bevel';
    ctx.strokeStyle = GREEN;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(50, 2); ctx.lineTo(62, 2); ctx.lineTo(62, 14);
    ctx.fillStyle = GREEN;
    ctx.fill();
  }

  // mitad de la órbita: atrás (arriba, más tenue) o delante (abajo)
  function ring(front) {
    ctx.beginPath();
    ctx.ellipse(C, C, RX, RY, TILT, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = GREEN;
    ctx.globalAlpha = front ? 1 : 0.45;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function core(pulse) {
    const glow = ctx.createRadialGradient(C, C, 4, C, C, 19 + pulse * 3);
    glow.addColorStop(0, `rgba(0,255,102,${0.3 + pulse * 0.2})`);
    glow.addColorStop(1, 'rgba(0,255,102,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, S, S);
    ctx.beginPath();
    ctx.arc(C, C, 10.5, 0, Math.PI * 2);
    ctx.fillStyle = GREEN;
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = DARK;
    ctx.fillRect(23, 27.7, 18, 1.6);
    ctx.fillRect(22, 34.7, 20, 1.6);
    ctx.beginPath();                    // meridiano: que se lea como globo y no como planeta
    ctx.ellipse(C, C, 4.2, 10.5, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = DARK;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // nodo: cuadradito con las esquinas cortadas, más grande cuando pasa por delante
  function shape(x, y, s) {
    const c = s * 0.4;
    ctx.beginPath();
    ctx.moveTo(x - s + c, y - s); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y + s - c);
    ctx.lineTo(x + s - c, y + s); ctx.lineTo(x - s, y + s); ctx.lineTo(x - s, y - s + c);
    ctx.closePath();
  }
  function node(x, y, depth) {
    const s = 4.2 + depth * 1.4;
    shape(x, y, s + 1.8);              // hueco oscuro alrededor, para que se separe de la órbita
    ctx.fillStyle = DARK;
    ctx.fill();
    shape(x, y, s);
    ctx.fillStyle = depth > 0 ? WHITE : GREEN;
    ctx.globalAlpha = 0.55 + 0.45 * (depth + 1) / 2;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    const a = (now / PERIOD) * Math.PI * 2;
    const lx = Math.cos(a) * RX, ly = Math.sin(a) * RY;
    const x = C + lx * Math.cos(TILT) - ly * Math.sin(TILT);
    const y = C + lx * Math.sin(TILT) + ly * Math.cos(TILT);
    const depth = Math.sin(a);            // > 0: por delante del núcleo
    const pulse = (Math.sin(now / 450) + 1) / 2;

    ctx.clearRect(0, 0, S, S);
    plate();
    ring(false);
    if (depth <= 0) node(x, y, depth);
    core(pulse);
    ring(true);
    if (depth > 0) node(x, y, depth);
    return canvas.toDataURL('image/png');
  }

  link.type = 'image/png';
  const tick = () => { link.href = draw(performance.now()); };
  tick();
  setInterval(tick, 1000 / FPS);
})();
