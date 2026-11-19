/* ===== Artchive // cielo de estrellas de las secciones =====
   Igual que en la portada: las estrellas están repartidas en una esfera alrededor de la cámara,
   que gira despacio. Se mueven un poco con el ratón (las cercanas más que las lejanas), se
   apartan de él y vuelven con un pequeño rebote. Al bajar por la página el cielo se inclina.

   const sky = Artchive.starfield(canvas, zonaDelRatón, elementoQueHaceScroll);
   sky.start(); sky.stop();
*/
window.Artchive = window.Artchive || {};

Artchive.starfield = (canvas, area, scroller) => {
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const GREEN = '0, 255, 102';
  const WHITE = '234, 255, 241';
  const DRIFT = 0.03;           // giro lento (rad/s), el mismo de la portada
  const PITCH = 0.32;           // inclinación de la cámara
  const STAR_COUNT = 800;         // los mismos valores que la portada (js/orbit.js)
  const MOUSE_RADIUS = 120;
  const MOUSE_FORCE = 1500;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const stars = Array.from({ length: STAR_COUNT }, () => {
    const u = Math.random() * 2 - 1, t = Math.random() * TAU, d = 1.4 + Math.random() * 2.4;
    const q = Math.sqrt(1 - u * u);
    const big = Math.random() < 0.05;
    return {
      x: q * Math.cos(t) * d, y: u * d, z: q * Math.sin(t) * d,
      size: big ? 2 : Math.random() < 0.3 ? 1.5 : 1,
      big, white: Math.random() < 0.3,
      tw: 0.5 + Math.random() * 2.8, ph: Math.random() * TAU,
      ox: 0, oy: 0, vx: 0, vy: 0
    };
  });

  const mouse = { x: 0, y: 0, in: false, sx: 0, sy: 0, power: 0 };
  let W = 0, H = 0, cx = 0, cy = 0, R = 1, F = 1, ax = 1;
  let yaw = Math.random() * TAU, tilt = 0, clock = 0, last = 0, raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H / 2;
    R = Math.min(W, H) * 0.36;
    F = R * 3.2;
    ax = clamp(W / H, 1, 1.45);
    mouse.sx = cx; mouse.sy = cy;
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    clock += dt;
    yaw += DRIFT * dt;
    // Al bajar por la página el cielo se inclina un poco (con suavidad)
    const want = scroller ? scroller.scrollTop * 0.0006 : 0;
    tilt += (want - tilt) * (1 - Math.exp(-dt * 4));
    const pitch = PITCH + tilt;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);

    const follow = 1 - Math.exp(-dt * 4);
    mouse.power += ((mouse.in ? 1 : 0) - mouse.power) * (1 - Math.exp(-dt * 5));
    mouse.sx += ((mouse.in ? mouse.x : cx) - mouse.sx) * follow;
    mouse.sy += ((mouse.in ? mouse.y : cy) - mouse.sy) * follow;
    const parX = (mouse.sx - cx) / W, parY = (mouse.sy - cy) / H;

    for (const st of stars) {
      const x0 = st.x * R, y0 = st.y * R, z0 = st.z * R;
      const x3 = x0 * cyw + z0 * syw, z3 = -x0 * syw + z0 * cyw;
      const y4 = y0 * cp - z3 * sp, z4 = y0 * sp + z3 * cp;
      if (z4 > R * 1.6) continue;
      const k = F / (F - z4);
      const near = clamp((z4 / (R * 3.8) + 1) / 2, 0, 1);

      let x = cx + x3 * k * ax - parX * (8 + near * 26);
      let y = cy - y4 * k - parY * (8 + near * 26);

      if (dt > 0) {
        let fx = -st.ox * 16 - st.vx * 4.5, fy = -st.oy * 16 - st.vy * 4.5;
        if (mouse.power > 0.01) {
          const dx = x + st.ox - mouse.x, dy = y + st.oy - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_RADIUS && d > 0.01) {
            const push = 1 - d / MOUSE_RADIUS;
            const f = push * push * MOUSE_FORCE * mouse.power;
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }
        }
        st.vx += fx * dt; st.vy += fy * dt;
        st.ox += st.vx * dt; st.oy += st.vy * dt;
      }
      x += st.ox; y += st.oy;
      if (x < -6 || x > W + 6 || y < -6 || y > H + 6) continue;

      const twinkle = 0.5 + 0.5 * Math.sin(clock * st.tw + st.ph);
      const a = (0.14 + 0.72 * near) * (0.35 + 0.65 * twinkle);
      const rgb = st.white ? WHITE : GREEN;
      if (st.big) {
        ctx.fillStyle = `rgba(${rgb}, ${(a * 0.18).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x + 0.5, y + 0.5, 3 + twinkle * 2, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${rgb}, ${a.toFixed(3)})`;
      ctx.fillRect(x, y, st.size, st.size);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    draw(dt);
  }

  area.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.in = e.pointerType !== 'touch';
  });
  area.addEventListener('pointerleave', () => { mouse.in = false; });
  window.addEventListener('resize', () => { if (raf) { resize(); draw(0); } });

  return {
    start() {
      if (raf) return;
      resize();
      if (Artchive.ui.reducedMotion()) { draw(0); return; }
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      mouse.in = false;
    }
  };
};
