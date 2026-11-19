/* ===== Artchive // pantalla de arranque y acceso =====
   Al abrir la portada aparece una secuencia de encendido de terminal: chequeo del sistema,
   montaje de cada sección, acceso y carga del archivo desde la base de datos.

   - Con la sesión ya guardada en el navegador, pasa directo a cargar.
   - Sin sesión, pide USER y PASSWORD (login de Supabase, js/db.js). Mientras no se entre,
     no se ve nada: la página entera queda detrás de esta pantalla.
   - La barra DECRYPTING ARCHIVE se llena de verdad mientras llegan las entradas.
   - Si el servidor no responde, lo dice y deja reintentar.

   Si la página se abre en una sección (o con "reducir movimiento"), no hay animación de
   encendido: solo el acceso (si hace falta) y la carga, al instante.
   Cualquier tecla o clic acelera la secuencia, pero nunca se salta el acceso.

   Artchive.boot.done: promesa que se cumple cuando la pantalla empieza a apagarse, con el
   archivo ya cargado; en ese momento js/app.js hace la entrada de la portada.
*/
window.Artchive = window.Artchive || {};

Artchive.boot = (() => {
  const { CATEGORIES, ui, db, library } = Artchive;
  let finish;
  const done = new Promise(resolve => { finish = resolve; });

  const key = decodeURIComponent(location.hash.replace(/^#\/?/, '')).toLowerCase();
  const inSection = Object.prototype.hasOwnProperty.call(CATEGORIES, key);
  const full = !ui.reducedMotion() && !inSection;   // secuencia completa, solo en la portada

  document.body.classList.add('booting');

  const wait = ms => new Promise(r => setTimeout(r, ms));
  let skipped = !full;

  const el = document.createElement('div');
  el.className = 'boot';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Loading Artchive');
  el.innerHTML = '<div class="boot-screen"><pre class="boot-log" aria-hidden="true"></pre></div>' +
                 (full ? '<p class="boot-skip" aria-hidden="true">PRESS ANY KEY TO SPEED UP</p>' : '');
  document.body.append(el);
  const screen = el.querySelector('.boot-screen');
  const log = el.querySelector('.boot-log');

  // Mientras escribe, las teclas y los clics no llegan a la página: solo aceleran.
  // Mientras pide la contraseña esto se desactiva (si no, no se podría escribir).
  const skip = e => {
    if (e.target.closest && e.target.closest('.boot-form')) return;
    e.preventDefault();
    e.stopPropagation();
    skipped = true;
  };
  const listen = on => {
    window[on ? 'addEventListener' : 'removeEventListener']('keydown', skip, true);
    el[on ? 'addEventListener' : 'removeEventListener']('pointerdown', skip);
  };
  listen(true);

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
    if (status) setStatus(row, status);
    log.append('\n');
    if (!skipped) await wait(20);
    return row;
  }

  function setStatus(row, status, cls = '') {
    const st = document.createElement('b');
    st.textContent = status;
    if (cls) st.className = cls;
    row.append(' ', st);
    ui.sfx(cls === 'boot-bad' ? 'error' : 'ok');
  }

  // Barra que avanza sola hasta el 90 % y espera a que termine "job" para llegar al 100 %
  async function progress(label, job) {
    const row = document.createElement('span');
    row.className = 'boot-line';
    log.append(row, '\n');
    const W = 24;
    const draw = p => {
      const n = Math.round(p / 100 * W);
      row.textContent = `${label} [${'█'.repeat(n)}${'░'.repeat(W - n)}] ${String(p).padStart(3)}%`;
    };
    let finished = false, failed = null, result;
    job.then(r => { result = r; finished = true; }, e => { failed = e; finished = true; });
    let p = 0;
    draw(p);
    while (!(finished && p >= 90)) {
      if (finished && (failed || skipped)) break;
      if (p < 90) { p += 5; draw(p); if (p % 20 === 0) ui.sfx('type'); }
      await wait(finished ? 8 : 16);
    }
    if (failed) { setStatus(row, 'FAILED', 'boot-bad'); throw failed; }
    draw(100);
    return result;
  }

  /* ---------- Acceso ---------- */

  // Formulario USER / PASSWORD bajo el registro. Se resuelve al entrar con éxito.
  function login() {
    return new Promise(resolve => {
      el.classList.add('asking');
      const form = document.createElement('form');
      form.className = 'boot-form';
      form.noValidate = true;
      form.innerHTML = `
        <label class="boot-field"><span>&gt; USER</span>
          <input type="email" name="email" autocomplete="username" spellcheck="false" autocapitalize="off" required></label>
        <label class="boot-field"><span>&gt; PASSWORD</span>
          <input type="password" name="password" autocomplete="current-password" required></label>
        <div class="boot-actions">
          <button type="submit" class="btn btn-solid">LOGIN</button>
          <p class="boot-msg" role="alert"></p>
        </div>`;
      screen.append(form);
      const [email, password] = form.querySelectorAll('input');
      const msg = form.querySelector('.boot-msg');
      const btn = form.querySelector('button');
      email.focus();

      const say = (text, bad = false) => {
        msg.textContent = text;
        msg.classList.toggle('bad', bad);
      };

      form.addEventListener('submit', async e => {
        e.preventDefault();
        if (btn.disabled) return;
        if (!email.value.trim() || !password.value) {
          say('ENTER USER AND PASSWORD', true);
          ui.sfx('error');
          (email.value.trim() ? password : email).focus();
          return;
        }
        btn.disabled = email.disabled = password.disabled = true;
        say('VERIFYING...');
        try {
          await db.signIn(email.value, password.value);
          form.remove();
          el.classList.remove('asking');
          resolve();
        } catch (err) {
          btn.disabled = email.disabled = password.disabled = false;
          say(err.message, true);
          ui.sfx('error');
          form.classList.remove('shake');
          void form.offsetWidth;
          form.classList.add('shake');
          password.value = '';
          password.focus();
        }
      });
    });
  }

  // Si el servidor falla: el error y un botón para reintentar
  function retry(message) {
    return new Promise(resolve => {
      el.classList.add('asking');
      const form = document.createElement('form');
      form.className = 'boot-form';
      form.innerHTML = `
        <p class="boot-msg bad" role="alert"></p>
        <div class="boot-actions"><button type="submit" class="btn btn-solid">RETRY</button></div>`;
      form.querySelector('.boot-msg').textContent = message;
      screen.append(form);
      form.querySelector('button').focus();
      form.addEventListener('submit', e => {
        e.preventDefault();
        form.remove();
        el.classList.remove('asking');
        resolve();
      });
    });
  }

  /* ---------- Secuencia ---------- */

  async function run() {
    if (full) {
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
    } else {
      await line('ARTCHIVE  //  SECURE TERMINAL', { cls: 'boot-head' });
      await line('');
    }

    // Acceso: con sesión guardada, directo; si no, se pide
    for (;;) {
      if (await db.session()) {
        await line('IDENTITY ........ SESSION RESTORED', { status: 'OK' });
      } else {
        await line('> AUTHENTICATION REQUIRED', { cls: 'boot-warn' });
        listen(false);
        await login();
        listen(true);
        await line('IDENTITY ........ VERIFIED', { status: 'OK' });
      }

      // Carga del archivo (reintenta mientras el servidor falle)
      try {
        const n = await progress('DECRYPTING ARCHIVE', library.load());
        await line(`RECORDS ......... ${String(n).padStart(4, '0')}`, { status: 'LOADED' });
        break;
      } catch (err) {
        await line(`[!] ${err.message}`, { cls: 'boot-bad-line' });
        if (/^SESSION EXPIRED/.test(err.message)) { await db.signOut(); continue; }
        listen(false);
        await retry('IF IT KEEPS FAILING, THE SUPABASE PROJECT MAY BE PAUSED: RESTORE IT AT SUPABASE.COM');
        listen(true);
      }
    }

    await line('');
    await line('> ACCESS GRANTED', { cls: 'boot-granted', chunk: 1, speed: 26 });
    ui.sfx('granted');
    if (!skipped) await wait(450);

    // Se apaga como un monitor: se pliega en una línea y desaparece, y detrás entra la portada
    listen(false);
    el.classList.add('boot-out');
    document.body.classList.remove('booting');
    finish();
    await wait(520);
    el.remove();
  }

  run();
  return { done };
})();
