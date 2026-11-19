/* ===== Artchive // utilidades de interfaz ===== */
window.Artchive = window.Artchive || {};

Artchive.ui = (() => {
  const $ = id => document.getElementById(id);

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const pad = (num, len = 3) => String(num).padStart(len, '0');

  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sonido (js/sound.js); si no está cargado, no hace nada
  const sfx = name => { if (Artchive.sfx) Artchive.sfx.play(name); };

  /* Aviso breve abajo de la pantalla. action = { label, run } añade un botón (p. ej. UNDO). */
  function toast(message, { kind = 'info', action = null, timeout = 4200 } = {}) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    sfx(kind === 'error' || kind === 'warn' ? 'error' : 'toast');
    el.setAttribute('role', 'status');

    const label = document.createElement('span');
    label.textContent = message;
    el.append(label);

    let timer = 0;
    const close = () => {
      clearTimeout(timer);
      if (!el.isConnected) return;
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 220);
    };

    if (action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = action.label;
      btn.addEventListener('click', () => { action.run(); close(); });
      el.append(btn);
    }

    box.append(el);
    while (box.children.length > 4) box.firstElementChild.remove();
    timer = setTimeout(close, timeout);
    return close;
  }

  function download(filename, content, type = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* Texto que se "decodifica": letras al azar que se van fijando de izquierda a derecha.
     Si se vuelve a llamar sobre el mismo elemento, la animación anterior se cancela.
     Opciones:
       delay   ms antes de empezar a fijar letras (mientras tanto ya se ven letras al azar)
       wobble  al principio la señal es inestable: sobran o faltan letras, y cada letra se fija
               en su propio momento (no en fila perfecta) */
  const GLYPHS = '01<>/#$%&*+=?ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const decoding = new WeakMap();
  const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

  function decode(el, text = el.textContent, duration = 1100, { delay = 0, wobble = false } = {}) {
    const run = (decoding.get(el) || 0) + 1;
    decoding.set(el, run);
    el.setAttribute('aria-label', text);
    if (reducedMotion()) { el.textContent = text; return; }

    const chars = [...text];
    const n = chars.length;
    const lockAt = chars.map((_, i) => wobble
      ? 0.22 + (i / n) * 0.58 + Math.random() * 0.18
      : i / n * 0.8 + 0.2);
    const t0 = performance.now() + delay;

    (function step(now) {
      if (decoding.get(el) !== run) return;
      const p = Math.max(0, (now - t0) / duration);
      let out = chars.map((ch, i) => ch === ' ' || p > lockAt[i] ? ch : glyph()).join('');
      if (wobble && p < 0.5) {
        const extra = Math.round((Math.random() * 2 - 1) * 2.4 * (1 - p / 0.5));
        if (extra > 0) out += Array.from({ length: extra }, glyph).join('');
        else if (extra < 0) out = out.slice(0, n + extra);
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step); else el.textContent = text;
    })(performance.now());
  }

  /* Lista desplegable propia sobre un <select>.
     La lista nativa del navegador no se puede pintar con el estilo de la página, así que el
     <select> queda oculto (sigue guardando el valor y lanzando "change") y encima se pone
     un botón con su lista. Se maneja con ratón y con teclado (flechas, Enter, Esc, letras). */
  function selectMenu(select) {
    const wrap = document.createElement('div');
    wrap.className = 'select';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `${select.id}Button`;
    btn.className = 'select-button';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    const btnText = document.createElement('span');
    btnText.className = 'select-text';
    btn.append(btnText);

    const list = document.createElement('ul');
    list.id = `${select.id}List`;
    list.className = 'select-list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    list.hidden = true;
    btn.setAttribute('aria-controls', list.id);

    const labelId = select.getAttribute('aria-labelledby');
    if (labelId) {
      btn.setAttribute('aria-labelledby', `${labelId} ${btn.id}`);
      list.setAttribute('aria-labelledby', labelId);
    }

    select.hidden = true;
    select.tabIndex = -1;
    select.after(wrap);
    wrap.append(btn, list);

    const items = () => [...list.children];
    let active = -1;

    function sync() {
      const chosen = select.options[select.selectedIndex];
      btnText.textContent = chosen ? chosen.textContent : '';
      items().forEach(li => li.setAttribute('aria-selected', String(li.dataset.value === select.value)));
    }

    function build() {
      list.innerHTML = '';
      [...select.options].forEach((option, i) => {
        const li = document.createElement('li');
        li.id = `${list.id}-${i}`;
        li.style.setProperty('--n', Math.min(i, 12));   // orden de entrada al abrir
        li.setAttribute('role', 'option');
        li.dataset.value = option.value;
        li.textContent = option.textContent;
        list.append(li);
      });
      sync();
    }

    // Opciones que cambian (géneros de otra sección, etiqueta del creador) y valores puestos
    // desde el código (select.value = ...) también actualizan el botón.
    new MutationObserver(build).observe(select, { childList: true, subtree: true, characterData: true });
    const native = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(select, 'value', {
      configurable: true,
      get() { return native.get.call(this); },
      set(v) { native.set.call(this, v); sync(); }
    });
    select.addEventListener('change', sync);

    function setActive(i, scroll = true) {
      const all = items();
      if (!all.length) return;
      active = Math.max(0, Math.min(all.length - 1, i));
      all.forEach((li, k) => li.classList.toggle('active', k === active));
      list.setAttribute('aria-activedescendant', all[active].id);
      if (scroll) all[active].scrollIntoView({ block: 'nearest' });
    }

    const outside = e => { if (!wrap.contains(e.target)) close(false); };

    // Abrir: se despliega y las opciones entran una tras otra. Cerrar: se pliega (.closing)
    // y se oculta al terminar. Las animaciones están en css/base.css.
    const CLOSE_MS = 170;
    let closeTimer = 0;
    const isOpen = () => wrap.classList.contains('open');

    function hideNow() {
      clearTimeout(closeTimer);
      closeTimer = 0;
      wrap.classList.remove('closing');
      list.hidden = true;
    }

    function open() {
      if (isOpen()) return;
      hideNow();
      list.hidden = false;
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      sfx('listOpen');
      setActive(Math.max(0, select.selectedIndex));
      list.focus({ preventScroll: true });
      document.addEventListener('pointerdown', outside, true);
    }

    function close(refocus = true) {
      if (!isOpen()) return;
      wrap.classList.remove('open');
      sfx('listClose');
      if (reducedMotion()) hideNow();
      else {
        wrap.classList.add('closing');
        closeTimer = setTimeout(hideNow, CLOSE_MS);
      }
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', outside, true);
      if (refocus) btn.focus({ preventScroll: true });
    }

    function choose(i) {
      const li = items()[i];
      if (!li) return;
      const changed = select.value !== li.dataset.value;
      select.value = li.dataset.value;
      close();
      if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    btn.addEventListener('click', () => (isOpen() ? close() : open()));
    btn.addEventListener('keydown', e => {
      if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) return;
      e.preventDefault();
      open();
    });

    list.addEventListener('keydown', e => {
      const last = items().length - 1;
      switch (e.key) {
        case 'ArrowDown': setActive(active + 1); break;
        case 'ArrowUp': setActive(active - 1); break;
        case 'PageDown': setActive(active + 6); break;
        case 'PageUp': setActive(active - 6); break;
        case 'Home': setActive(0); break;
        case 'End': setActive(last); break;
        case 'Enter': case ' ': choose(active); break;
        case 'Escape': close(); break;
        case 'Tab': close(false); return;
        default: {
          if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
          // Saltar a la siguiente opción que empiece por esa letra
          const all = items();
          const ch = e.key.toLowerCase();
          for (let k = 1; k <= all.length; k++) {
            const at = (active + k) % all.length;
            if (all[at].textContent.trim().toLowerCase().startsWith(ch)) { setActive(at); break; }
          }
        }
      }
      e.preventDefault();
      e.stopPropagation();   // que Esc, "/" o "N" no lleguen a los atajos de la página
    });

    list.addEventListener('pointermove', e => {
      const li = e.target.closest('li');
      if (li) setActive(items().indexOf(li), false);
    });
    list.addEventListener('click', e => {
      const li = e.target.closest('li');
      if (li) choose(items().indexOf(li));
    });
    list.addEventListener('focusout', e => { if (!wrap.contains(e.relatedTarget)) close(false); });

    build();
    return { close };
  }

  /* Ventanas (<dialog>) que se apagan al cerrarse en vez de desaparecer de golpe.
     La entrada la pone el CSS (.dialog[open]); aquí se retrasa el cierre real hasta que
     termina la animación de salida (.dialog.closing). Esc también pasa por aquí. */
  const CLOSE_MS = 210;

  function animateDialog(dialog) {
    const nativeShow = HTMLDialogElement.prototype.showModal.bind(dialog);
    const nativeClose = HTMLDialogElement.prototype.close.bind(dialog);
    let timer = 0;

    const settle = () => { clearTimeout(timer); timer = 0; dialog.classList.remove('closing'); };

    dialog.showModal = () => {
      if (timer) { settle(); nativeClose(); }     // se estaba cerrando: se cierra ya y se abre de nuevo
      if (!dialog.open) {
        nativeShow();
        sfx('open');
        if (Artchive.cursor) Artchive.cursor.raise();   // el cursor queda por encima de la ventana
      }
    };
    dialog.close = value => {
      if (!dialog.open || timer) return;
      sfx('close');
      if (reducedMotion()) { nativeClose(value); return; }
      dialog.classList.add('closing');
      timer = setTimeout(() => { settle(); nativeClose(value); }, CLOSE_MS);
    };
    dialog.addEventListener('cancel', e => { e.preventDefault(); dialog.close(); });
    dialog.addEventListener('close', settle);
  }

  return { $, esc, pad, reducedMotion, sfx, toast, download, decode, selectMenu, animateDialog };
})();
