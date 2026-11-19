/* ===== Artchive // portada: sistema orbital 3D =====
   Cada nodo tiene su propia órbita. Las 8 órbitas son iguales en forma y están giradas
   45° una de otra, con la inclinación alternada (una hacia arriba, la siguiente hacia abajo).
   Todos los nodos avanzan al mismo ritmo, así que el conjunto es simétrico:
   cuando uno pasa por delante del núcleo, el opuesto pasa por detrás.

   El núcleo es un globo ASCII con tu arte pintado encima, y gira con la cámara.
   Las estrellas del fondo se apartan del ratón.

   - Arrastrar: gira la cámara.
   - Pasar el ratón por un nodo: el sistema se detiene para poder pulsarlo.
   - Espacio o doble clic en el fondo: los nodos se detienen en su órbita, en una pose ordenada;
     otra vez, siguen girando.
*/
window.Artchive = window.Artchive || {};

Artchive.orbit = (() => {
  const { CATEGORIES, library, ui } = Artchive;
  const { $, pad } = ui;

  const stage = $('orbitStage');
  const core = $('core');
  const coreArt = $('coreArt');
  const nav = $('satellites');
  const back = $('orbitBack');     // lienzo detrás del núcleo
  const front = $('orbitFront');   // lienzo delante del núcleo
  const bctx = back.getContext('2d');
  const fctx = front.getContext('2d');

  const TAU = Math.PI * 2;
  const GREEN = '0, 255, 102';
  const WHITE = '234, 255, 241';
  const ORBIT_SPEED = TAU / 40;    // una vuelta cada 40 s
  const DRIFT = 0.03;              // giro lento de la cámara (rad/s)
  const DOCK_SECONDS = 1.4;
  const DOCK_PITCH_MIN = 0.42;
  const RING_STEPS = 120;
  const INCLINATION = 0.55;        // inclinación de cada órbita (rad)
  const RADII = [1, 0.8];          // radio de las órbitas pares / impares
  const STAR_COUNT = 800;
  const MOUSE_RADIUS = 120;        // px alrededor del ratón donde las estrellas se apartan
  const MOUSE_FORCE = 1500;        // cuánto se apartan (poco: es un efecto sutil)

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const nearestTurn = (value, target) => target + TAU * Math.round((value - target) / TAU);
  const reduced = ui.reducedMotion();

  /* ---------- Nodos y sus órbitas ---------- */

  const slotOf = key => Number.isInteger(CATEGORIES[key].slot) ? CATEGORIES[key].slot : 99;
  const keys = Object.keys(CATEGORIES).sort((a, b) => slotOf(a) - slotOf(b));
  const N = Math.max(8, keys.length);

  const sats = keys.map((key, i) => {
    const def = CATEGORIES[key];
    const el = document.createElement('a');
    el.className = 'sat';
    el.href = `#/${key}`;
    el.draggable = false;
    el.textContent = def.name;
    // Marco del nodo en SVG (lo ajusta fitFrames): como los nodos se agrandan y achican con la
    // profundidad, un marco vectorial se ve igual de nítido a cualquier escala
    el.insertAdjacentHTML('afterbegin',
      '<svg class="sat-frame" aria-hidden="true"><polygon class="sat-edge"/><polygon class="sat-tick"/></svg>');
    nav.append(el);

    const turn = -(i / N) * TAU;                 // cada órbita girada 45° respecto a la anterior
    const incl = i % 2 ? -INCLINATION : INCLINATION;
    return {
      key, def, el,
      r: RADII[i % 2],
      ct: Math.cos(turn), st: Math.sin(turn),
      ci: Math.cos(incl), si: Math.sin(incl)
    };
  });

  /* ---------- Estrellas ---------- */

  const stars = Array.from({ length: STAR_COUNT }, () => {
    const u = Math.random() * 2 - 1, t = Math.random() * TAU, d = 1.4 + Math.random() * 2.4;
    const q = Math.sqrt(1 - u * u);
    const big = Math.random() < 0.05;
    return {
      x: q * Math.cos(t) * d, y: u * d, z: q * Math.sin(t) * d,
      size: big ? 2 : Math.random() < 0.3 ? 1.5 : 1,
      big, white: Math.random() < 0.3,
      tw: 0.5 + Math.random() * 2.8, ph: Math.random() * TAU,
      ox: 0, oy: 0, vx: 0, vy: 0     // desvío por el ratón (px) y su velocidad
    };
  });

  /* ---------- Núcleo: globo ASCII ---------- */

  // El dibujo está en js/ascii-art.js. Se quitan las líneas vacías de arriba y de abajo
  // (las de en medio se respetan) y se ignoran los espacios que sobren a la derecha.
  const ART = String(Artchive.ASCII_ART || 'ARTCHIVE').replace(/\t/g, '    ').split(/\r?\n/).map(l => l.replace(/\s+$/, ''));
  while (ART.length > 1 && !ART[0]) ART.shift();
  while (ART.length > 1 && !ART[ART.length - 1]) ART.pop();
  const ART_W = Math.max(...ART.map(l => l.length));
  const ART_H = ART.length;
  ART.forEach((l, i) => { ART[i] = l.padEnd(ART_W); });

  const COLS = 40, ROWS = 24;            // 40 caracteres de 0.6em = 24 líneas de 1em: un círculo
  const ART_LON = 0.8, ART_LAT = 0.86;   // cuánto del globo ocupa el arte (rad, medio ancho / medio alto)
  const GRID = Math.PI / 6;              // meridianos y paralelos cada 30°
  const LIGHT = (() => { const v = [-0.38, 0.48, 0.79], l = Math.hypot(...v); return v.map(c => c / l); })();

  /* ---------- Estado ---------- */

  let W = 0, H = 0, cx = 0, cy = 0;
  let R = 1, F = 1, aspectX = 1, aspectY = 1, coreR = 0;
  let dockPitch = DOCK_PITCH_MIN;
  let dockAspectX = 1;    // ensanche al detener (en pantallas estrechas, para que quepan los nodos laterales)
  let ax = 1;             // ensanche en uso: entre aspectX y dockAspectX según lo detenido

  let running = false, raf = 0, last = 0, clock = 0;
  let theta = 0;          // posición de todos los nodos en sus órbitas
  let speed = 1;          // 1 = girando, 0 = quieto
  let spawn = 0;          // entrada: los nodos salen del núcleo
  let spin = 0, coreTimer = 0;

  let docked = false;     // el usuario pidió detener
  let dockT = 1;          // progreso del viaje a la pose ordenada
  let dockVis = 0;        // 0 girando · 1 detenido (para suavizar el aspecto)
  let from = null, to = null, cameraTween = false;

  let yaw = -0.3, pitch = 0.36;
  let framed = false;     // la primera vez se ajusta la inclinación a la forma de la pantalla
  let vyaw = 0, vpitch = 0;
  let cyw = 1, syw = 0, cp = 1, sp = 0;
  let gcp = 1, gsp = 0;   // inclinación con la que se ve el globo (al detener, desde el ecuador)
  let dragging = false, dragDX = 0, dragDY = 0, lastX = 0, lastY = 0;
  let hovered = null;

  // Ratón: posición real y una versión suavizada para el paralaje de las estrellas
  const mouse = { x: 0, y: 0, in: false, sx: 0, sy: 0, power: 0 };

  const P = { x: 0, y: 0, k: 1, z: 0 };   // resultado de la última proyección

  /* ---------- Geometría ---------- */

  // Gira un punto con la cámara y lo proyecta en pantalla. P.z > 0: delante del núcleo.
  function project(x, y, z) {
    const x3 = x * cyw + z * syw, z3 = -x * syw + z * cyw;
    const y4 = y * cp - z3 * sp, z4 = y * sp + z3 * cp;
    const k = F / (F - z4);
    P.z = z4; P.k = k;
    P.x = cx + x3 * k * ax;
    P.y = cy - y4 * k * aspectY;
  }

  // Punto de la órbita de s en el ángulo a
  function orbitPoint(s, a, grow) {
    const rr = s.r * R * grow;
    const px = Math.cos(a) * rr, sa = Math.sin(a) * rr;
    const py = sa * s.si, pz = sa * s.ci;                          // inclinación
    project(px * s.ct + pz * s.st, py, -px * s.st + pz * s.ct);    // giro de la órbita
  }

  // Marco de cada nodo: contorno con las esquinas cortadas (--cut) y el triangulito (--tick).
  // La línea va medio píxel hacia dentro para que quede entera y nítida.
  function fitFrames() {
    for (const { el } of sats) {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) continue;
      const css = getComputedStyle(el);
      const c = parseFloat(css.getPropertyValue('--cut')) || 0;
      const t = parseFloat(css.getPropertyValue('--tick')) || 0;
      const svg = el.firstElementChild;
      const a = 0.5, r = w - 0.5, b = h - 0.5;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.children[0].setAttribute('points', `${c + a},${a} ${r},${a} ${r},${b - c} ${r - c},${b} ${a},${b} ${a},${a + c}`);
      svg.children[1].setAttribute('points', `${w - t},0 ${w},0 ${w},${t}`);
    }
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    W = rect.width; H = rect.height;
    cx = W / 2; cy = H / 2;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    [[back, bctx], [front, fctx]].forEach(([canvas, ctx]) => {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
    });

    fitFrames();
    coreR = core.offsetWidth / 2;
    const widest = Math.max(...sats.map(s => s.el.offsetWidth));
    const tall = Math.max(...sats.map(s => s.el.offsetHeight));
    const titleEl = document.querySelector('.view-home .hud-top');
    const titleH = titleEl ? titleEl.offsetHeight : 0;
    const roomX = W / 2 - widest / 2 - 12;                 // que nada se corte a los lados
    const roomY = H / 2 - Math.max(titleH, tall) - 6;      // ni choque con el título
    R = Math.max(coreR + 50, Math.min(roomX / 1.15, roomY / 1.2));
    F = R * 3.2;
    aspectX = clamp(roomX / (R * 1.15), 1, 1.45);          // pantallas anchas: se ensancha
    aspectY = clamp(roomY / (R * 1.2), 1, 2.4);            // pantallas altas (móvil): se alarga
    dockAspectX = R * aspectX < coreR + widest / 2 + 16 ? Math.max(aspectX, roomX / R) : aspectX;

    // Al detener: el nodo de atrás debe quedar por encima del núcleo y el de delante dentro de la pantalla
    const need = Math.max(coreR + 18 + tall / 2, roomY * 0.55);
    dockPitch = DOCK_PITCH_MIN;
    for (let p = DOCK_PITCH_MIN; p < 1.2; p += 0.02) {
      const kBack = F / (F + R * Math.cos(p)), kFront = F / (F - R * Math.cos(p));
      if (R * Math.sin(p) * kFront * aspectY > roomY - tall / 2) break;
      dockPitch = p;
      if (R * Math.sin(p) * kBack * aspectY >= need) break;
    }
    if (!framed) { framed = true; pitch = Math.max(pitch, dockPitch - 0.3); }
    if (to) to.pitch = dockPitch;
    if (running) tick(0);                                  // al cambiar el tamaño el lienzo se borra
  }

  /* ---------- Dibujo ---------- */

  function drawStars(dt, grow) {
    // Suaviza el ratón; si sale de la pantalla, el efecto se apaga poco a poco
    const follow = 1 - Math.exp(-dt * 4);
    mouse.power += ((mouse.in ? 1 : 0) - mouse.power) * (1 - Math.exp(-dt * 5));
    mouse.sx += ((mouse.in ? mouse.x : cx) - mouse.sx) * follow;
    mouse.sy += ((mouse.in ? mouse.y : cy) - mouse.sy) * follow;
    const parX = (mouse.sx - cx) / (W || 1), parY = (mouse.sy - cy) / (H || 1);

    for (const st of stars) {
      project(st.x * R, st.y * R, st.z * R);
      if (P.z > R * 1.6) continue;
      const near = clamp((P.z / (R * 3.8) + 1) / 2, 0, 1);

      // Paralaje: las estrellas cercanas se mueven más que las lejanas
      let x = P.x - parX * (8 + near * 26);
      let y = P.y - parY * (8 + near * 26);

      // Se apartan del ratón y vuelven con un pequeño rebote
      if (dt > 0) {
        let ax = -st.ox * 16 - st.vx * 4.5, ay = -st.oy * 16 - st.vy * 4.5;
        if (mouse.power > 0.01) {
          const dx = x + st.ox - mouse.x, dy = y + st.oy - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_RADIUS && d > 0.01) {
            const push = 1 - d / MOUSE_RADIUS;
            const f = push * push * MOUSE_FORCE * mouse.power;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }
        st.vx += ax * dt; st.vy += ay * dt;
        st.ox += st.vx * dt; st.oy += st.vy * dt;
      }
      x += st.ox; y += st.oy;
      if (x < -6 || x > W + 6 || y < -6 || y > H + 6) continue;

      const twinkle = 0.5 + 0.5 * Math.sin(clock * st.tw + st.ph);
      const a = (0.14 + 0.72 * near) * (0.35 + 0.65 * twinkle) * grow;
      const rgb = st.white ? WHITE : GREEN;
      if (st.big) {
        bctx.fillStyle = `rgba(${rgb}, ${(a * 0.18).toFixed(3)})`;
        bctx.beginPath();
        bctx.arc(x + 0.5, y + 0.5, 3 + twinkle * 2, 0, TAU);
        bctx.fill();
      }
      bctx.fillStyle = `rgba(${rgb}, ${a.toFixed(3)})`;
      bctx.fillRect(x, y, st.size, st.size);
    }
  }

  // Una órbita: la mitad lejana va al lienzo trasero y la cercana al delantero,
  // así el núcleo tapa solo lo que de verdad queda detrás.
  function drawOrbit(s, aBack, aFront, width, grow) {
    bctx.strokeStyle = `rgba(${GREEN}, ${aBack.toFixed(3)})`;
    fctx.strokeStyle = `rgba(${GREEN}, ${aFront.toFixed(3)})`;
    bctx.lineWidth = fctx.lineWidth = width;

    orbitPoint(s, 0, grow);
    let px = P.x, py = P.y, pz = P.z, cur = null;
    for (let i = 1; i <= RING_STEPS; i++) {
      orbitPoint(s, (i / RING_STEPS) * TAU, grow);
      const ctx = pz + P.z > 0 ? fctx : bctx;
      if (ctx !== cur) {
        if (cur) cur.stroke();
        cur = ctx;
        cur.beginPath();
        cur.moveTo(px, py);
      }
      cur.lineTo(P.x, P.y);
      px = P.x; py = P.y; pz = P.z;
    }
    cur.stroke();
  }

  function renderCore() {
    const cs = Math.cos(spin), ss = Math.sin(spin);
    let html = '';
    for (let r = 0; r < ROWS; r++) {
      const y = 1 - ((r + 0.5) / ROWS) * 2;
      let cls = '';
      for (let c = 0; c < COLS; c++) {
        const x = ((c + 0.5) / COLS) * 2 - 1;
        const d = x * x + y * y;
        let ch = ' ', k = '';
        if (d < 1) {
          const z = Math.sqrt(1 - d);
          // vista -> mundo (deshace la cámara) -> objeto (deshace el giro propio del globo)
          const wy = y * gcp + z * gsp;
          const z3 = -y * gsp + z * gcp;
          const wx = x * cyw - z3 * syw;
          const wz = x * syw + z3 * cyw;
          const ox = wx * cs - wz * ss;
          const oz = wx * ss + wz * cs;
          const lon = Math.atan2(ox, oz);
          const lat = Math.asin(clamp(wy, -1, 1));
          const l = 0.18 + 0.82 * Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]);

          // El arte está pintado dos veces, por delante y por detrás del globo
          let L = lon;
          if (L > Math.PI / 2) L -= Math.PI; else if (L < -Math.PI / 2) L += Math.PI;
          const ac = Math.floor(((L + ART_LON) / (2 * ART_LON)) * ART_W);
          const ar = Math.floor(((ART_LAT - lat) / (2 * ART_LAT)) * ART_H);
          const art = ac >= 0 && ac < ART_W && ar >= 0 && ar < ART_H ? ART[ar][ac] : ' ';

          if (art !== ' ') {
            ch = art;
            k = l > 0.62 ? 'a3' : l > 0.34 ? 'a2' : 'a1';
          } else {
            const m = lon / GRID, p = lat / GRID;
            const onGrid = Math.abs(m - Math.round(m)) * GRID * Math.cos(lat) < 0.035 ||
                           Math.abs(p - Math.round(p)) * GRID < 0.035;
            ch = onGrid ? ':' : '.';
            k = onGrid ? 'g' : l > 0.62 ? 's3' : l > 0.36 ? 's2' : 's1';
          }
        }
        if (k !== cls) {
          if (cls) html += '</span>';
          if (k) html += `<span class="${k}">`;
          cls = k;
        }
        html += ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;
      }
      if (cls) html += '</span>';
      html += '\n';
    }
    coreArt.innerHTML = html;
  }

  /* ---------- Cuadro a cuadro ---------- */

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    tick(dt);
  }

  // Avanza dt segundos y dibuja. tick(0) solo redibuja.
  function tick(dt) {
    clock += dt;

    // Pausa suave al pasar por un nodo o al detener
    const wantSpeed = hovered || docked ? 0 : 1;
    speed += (wantSpeed - speed) * (1 - Math.exp(-dt * 6));
    spawn = Math.min(1, spawn + dt / 1.8);
    dockVis = clamp(dockVis + (docked ? dt : -dt) / DOCK_SECONDS, 0, 1);
    const grow = easeOut(spawn);
    const e = easeInOut(dockVis);
    ax = lerp(aspectX, dockAspectX, e);

    // Cámara: arrastre con inercia + giro lento
    if (dragging) {
      if (dt > 0) {
        vyaw = lerp(vyaw, clamp((dragDX * 0.0055) / dt, -3, 3), 0.35);
        vpitch = lerp(vpitch, clamp((dragDY * 0.0045) / dt, -3, 3), 0.35);
      }
      dragDX = dragDY = 0;
    } else {
      const decay = Math.exp(-dt * 2.6);
      yaw += vyaw * dt + DRIFT * dt * speed;
      pitch += vpitch * dt;
      vyaw *= decay;
      vpitch *= decay;
    }

    // Órbitas: avanzan, o viajan hasta la pose ordenada
    if (docked && dockT < 1) {
      dockT = Math.min(1, dockT + dt / DOCK_SECONDS);
      const t = easeInOut(dockT);
      theta = lerp(from.theta, to.theta, t);
      if (cameraTween) {
        yaw = lerp(from.yaw, to.yaw, t);
        pitch = lerp(from.pitch, to.pitch, t);
      }
    } else if (!docked) {
      theta += ORBIT_SPEED * dt * speed;
    }

    pitch = clamp(pitch, -1.25, 1.25);
    cyw = Math.cos(yaw); syw = Math.sin(yaw);
    cp = Math.cos(pitch); sp = Math.sin(pitch);

    // Núcleo (unas 30 veces por segundo basta). Gira de lado con la cámara, pero siempre se ve
    // casi de frente, desde el ecuador: de la inclinación de la cámara solo toma una cuarta parte
    // (para que arrastrar arriba/abajo se note un poco), y al detener nada.
    const globePitch = pitch * 0.25 * (1 - e);
    gcp = Math.cos(globePitch); gsp = Math.sin(globePitch);
    spin += dt * 0.3;
    coreTimer -= dt;
    if (coreTimer <= 0 || dt === 0) { coreTimer = 1 / 30; renderCore(); }

    bctx.clearRect(0, 0, W, H);
    fctx.clearRect(0, 0, W, H);
    drawStars(dt, grow);

    // Órbitas: algo más visibles al detener; la del nodo bajo el ratón, resaltada
    const ringBoost = 0.55 + 0.45 * e;
    for (const s of sats) {
      if (s === hovered) drawOrbit(s, 0.45 * grow, 0.95 * grow, 1.7, grow);
      else drawOrbit(s, 0.1 * ringBoost * grow, 0.26 * ringBoost * grow, 1, grow);
    }

    bctx.setLineDash([4, 5]);
    bctx.lineDashOffset = -clock * 14;

    for (const s of sats) {
      orbitPoint(s, theta, grow);
      const { x, y, k, z } = P;
      const depth = clamp(z / R, -1, 1);                       // -1 lejos · 1 cerca
      const near = (depth + 1) / 2;
      const hot = s === hovered;
      const scale = lerp(1 + (k - 1) * 0.62, 1 + (k - 1) * 0.3, e);
      const alpha = hot ? 1 : lerp(0.4 + 0.6 * near, 0.8 + 0.2 * near, e) * grow;

      // Línea punteada del núcleo al nodo
      const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy);
      const fromR = coreR + 13;
      if (dist > fromR + 4) {
        const la = hot ? 0.95 : lerp(0.12 + 0.2 * near, 0.32 + 0.2 * near, e) * grow;
        bctx.strokeStyle = `rgba(${GREEN}, ${la.toFixed(3)})`;
        bctx.lineWidth = hot ? 1.7 : 1.1;
        bctx.beginPath();
        bctx.moveTo(cx + (dx / dist) * fromR, cy + (dy / dist) * fromR);
        bctx.lineTo(x, y);
        bctx.stroke();
      }

      const style = s.el.style;
      style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      style.setProperty('--a', alpha.toFixed(3));
      style.zIndex = hot ? 990 : z >= 0 ? 510 + Math.round(near * 200) : 10 + Math.round(near * 400);
    }
    bctx.setLineDash([]);
  }

  /* ---------- Nodo bajo el ratón ---------- */

  const setHover = s => { hovered = s; };

  sats.forEach(s => {
    s.el.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') setHover(s); });
    s.el.addEventListener('pointerleave', () => { if (hovered === s) setHover(null); });
    s.el.addEventListener('focus', () => setHover(s));
    s.el.addEventListener('blur', () => { if (hovered === s) setHover(null); });
  });

  /* ---------- Detener / soltar ---------- */

  // Pose ordenada: cada nodo en el ecuador de su órbita, a 45° uno de otro, con el primero
  // ("slot" 0) arriba al fondo y la vista inclinada para que se lean todos.
  function poseFor(fromTheta, fromYaw) {
    const half = Math.round(fromTheta / Math.PI);          // en 0 y π el nodo cruza el ecuador
    const baseYaw = Math.PI / 2 + (half % 2 ? Math.PI : 0);
    return { theta: half * Math.PI, yaw: nearestTurn(fromYaw, baseYaw), pitch: dockPitch };
  }

  function setDocked(on) {
    if (on === docked) return;
    docked = on;
    ui.sfx(on ? 'dock' : 'undock');
    stage.classList.toggle('docked', on);
    if (!on) return;
    dockT = 0;
    from = { theta, yaw, pitch };
    to = poseFor(theta, yaw);
    cameraTween = true;
    vyaw = vpitch = 0;
  }

  const toggle = () => setDocked(!docked);

  /* ---------- Ratón: arrastrar y apartar estrellas ---------- */

  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('a, button')) return;
    dragging = true;
    if (docked && dockT < 1) { dockT = 1; theta = to.theta; }   // agarrar a mitad del viaje lo termina
    cameraTween = false;
    dragDX = dragDY = 0;
    vyaw = vpitch = 0;
    lastX = e.clientX; lastY = e.clientY;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('dragging');
  });

  stage.addEventListener('pointermove', e => {
    const rect = stage.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.in = true;
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    yaw += dx * 0.0055;
    pitch = clamp(pitch + dy * 0.0045, -1.25, 1.25);
    dragDX += dx; dragDY += dy;
  });

  stage.addEventListener('pointerleave', () => { mouse.in = false; });

  const endDrag = e => {
    dragging = false;
    stage.classList.remove('dragging');
    if (e && e.pointerType === 'touch') mouse.in = false;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', endDrag);

  // Doble clic (o doble toque en el móvil) en el fondo: detener / soltar
  stage.addEventListener('dblclick', e => { if (!e.target.closest('a')) toggle(); });

  /* ---------- Ciclo de vida ---------- */

  function updateCounts() {
    sats.forEach(s => {
      // El número no se muestra en el nodo (con 100+ registros se vería enorme); solo lo leen los lectores de pantalla
      const n = library.count(s.key);
      s.el.setAttribute('aria-label', `${s.def.name}: ${n} ${n === 1 ? 'record' : 'records'}`);
    });
  }

  function start() {
    if (running) return;
    running = true;
    setHover(null);
    mouse.in = false;
    if (document.activeElement && document.activeElement.classList.contains('sat')) document.activeElement.blur();
    resize();
    if (reduced && docked && dockT >= 1) pitch = dockPitch;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    endDrag();
  }

  new ResizeObserver(resize).observe(stage);
  // Los nodos cambian de ancho cuando termina de cargar su tipografía: se vuelve a medir
  if (document.fonts) document.fonts.ready.then(resize);

  // Con "reducir movimiento" activado en el sistema, la portada arranca detenida y ordenada
  if (reduced) {
    docked = true;
    dockT = 1; dockVis = 1; spawn = 1;
    to = poseFor(0, yaw);
    theta = to.theta; yaw = to.yaw;
    stage.classList.add('docked');
  }
  updateCounts();

  // Vuelve a hacer la entrada (los nodos salen del núcleo): al terminar la pantalla de arranque
  function intro() {
    if (!reduced) spawn = 0;
  }

  return { start, stop, toggle, intro, updateCounts };
})();
