/* ===== Artchive // pantalla de arranque =====
   Al abrir la página aparece una secuencia de encendido de terminal (unos 3 s):
   chequeo del sistema, montaje de cada sección, barra de descifrado y ACCESS GRANTED.
   Cualquier tecla, clic o toque la salta. Solo sale al abrir la portada: si la página se
   abre (o se recarga) en una sección, entra directo. Con "reducir movimiento" no se muestra.

   Mientras dura, la portada está oculta (clase "booting" en <body>).
   Artchive.boot.done: promesa que se cumple cuando la pantalla empieza a apagarse;
   en ese momento js/app.js hace la entrada de la portada, así se ve una sola transición.
*/
window.Artchive = window.Artchive || {};

Artchive.boot = (() => {
  const { CATEGORIES, ui } = Artchive;
  let finish;
  const done = new Promise(resolve => { finish = resolve; });

  const key = decodeURIComponent(location.hash.replace(/^#\/?/, '')).toLowerCase();
  const inSection = Object.prototype.hasOwnProperty.call(CATEGORIES, key);
  if (ui.reducedMotion() || inSection) { finish(); return { done }; }

  document.body.classList.add('booting');

  const wait = ms => new Promise(r => setTimeout(r, ms));
  let skipped = false;

  const el = document.createElement('div');
  el.className = 'boot';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Loading Artchive');
  el.innerHTML = '<div class="boot-screen"><pre class="boot-log" aria-hidden="true"></pre></div>' +
                 '<p class="boot-skip" aria-hidden="true">PRESS ANY KEY TO SKIP</p>';
  document.body.append(el);
  const log = el.querySelector('.boot-log');

  // Mientras arranca, las teclas y los clics no llegan a la página: solo saltan la secuencia
  const skip = e => {
    e.preventDefault();
    e.stopPropagation();
    skipped = true;
  };
  window.addEventListener('keydown', skip, true);
  el.addEventListener('pointerdown', skip);

  // Escribe una línea letra a letra; status = texto a la derecha (OK...)
  // chunk = letras que aparecen de golpe en cada paso (más = más rápido)
  async function line(text, { status = '', cls = '', chunk = 3, speed = 16 } = {}) {
    const row = document.createElement('span');
    row.className = `boot-line ${cls}`;
    log.append(row);
    if (skipped) { row.textContent = text; }
    else {
      for (let i = chunk; i < text.length + chunk; i += chunk) {
        row.textContent = text.slice(0, i);
        ui.sfx('type');
        await wait(speed);
        if (skipped) { row.textContent = text; break; }
      }
    }
    if (status) {
      const st = document.createElement('b');
      st.textContent = status;
      row.append(' ', st);
      ui.sfx('ok');
    }
    log.append('\n');
    if (!skipped) await wait(20);
  }

  async function progress(label) {
    const row = document.createElement('span');
    row.className = 'boot-line';
    log.append(row, '\n');
    const W = 24;
    for (let p = 0; p <= 100; p += skipped ? 100 : 5) {
      const full = Math.round(p / 100 * W);
      row.textContent = `${label} [${'█'.repeat(full)}${'░'.repeat(W - full)}] ${String(p).padStart(3)}%`;
      if (p % 20 === 0) ui.sfx('type');
      if (!skipped) await wait(16);
    }
  }

  async function run() {
    await wait(200);
    await line('ARTCHIVE BIOS v3.12  //  PHOSPHOR SYSTEMS', { cls: 'boot-head', chunk: 4 });
    await line('');
    await line('CPU ............. P-8 @ 4.77 MHZ', { status: 'OK' });
    await line('MEMORY .......... 640K', { status: 'OK' });
    await line('DISPLAY ......... CRT // GREEN PHOSPHOR', { status: 'OK' });
    await line('');
    await line('MOUNTING SECTORS', { cls: 'boot-dim' });
    const names = Object.values(CATEGORIES).sort((a, b) => a.slot - b.slot).map(c => c.name.toUpperCase());
    for (const name of names) await line(`  /${name.padEnd(13, '.')}`, { status: 'OK', chunk: 8 });
    await line('');
    await progress('DECRYPTING ARCHIVE');
    await line('');
    await line('> ACCESS GRANTED', { cls: 'boot-granted', chunk: 1, speed: 26 });
    ui.sfx('granted');
    if (!skipped) await wait(450);

    // Se apaga como un monitor: se pliega en una línea y desaparece, y detrás entra la portada
    window.removeEventListener('keydown', skip, true);
    el.classList.add('boot-out');
    document.body.classList.remove('booting');
    finish();
    await wait(520);
    el.remove();
  }

  run();
  return { done };
})();
