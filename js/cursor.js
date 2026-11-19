/* ===== Artchive // cursor: mira que fija el blanco =====
   El cursor es una cruz pequeña (css/base.css) y unas esquinas lo siguen con un poco de
   retraso. Al pasar por algo que se puede pulsar (botones, nodos, tarjetas, campos,
   opciones de las listas) las esquinas lo rodean y aparece LOCK; si el objetivo se mueve
   (los nodos de la portada) lo siguen. Al hacer clic se cierran un poco.

   Solo con ratón: en pantallas táctiles se deja el comportamiento normal.
   Las esquinas van en la "capa superior" del navegador (popover) para quedar encima de las
   ventanas; Artchive.cursor.raise() las vuelve a subir cuando se abre una ventana nueva.
*/
window.Artchive = window.Artchive || {};

Artchive.cursor = (() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return { raise() {} };

  const TARGETS = 'a, button, input, textarea, [role="option"], .card';
  const SIZE = 34;          // tamaño de las esquinas sin objetivo
  const PAD = 6;            // margen alrededor del objetivo
  const reduced = Artchive.ui.reducedMotion();

  document.documentElement.classList.add('lock-cursor');

  const lock = document.createElement('div');
  lock.className = 'lock';
  lock.setAttribute('aria-hidden', 'true');
  lock.innerHTML = '<i></i><i></i><i></i><i></i><b>LOCK</b>';
  const popover = typeof lock.showPopover === 'function';
  if (popover) lock.popover = 'manual';
  document.body.append(lock);

  const isOpen = () => !popover || lock.matches(':popover-open');
  function show() { if (popover && !isOpen()) lock.showPopover(); }
  // La capa superior apila por orden de apertura: tras abrir una ventana, se vuelve a subir
  function raise() {
    if (!popover || !isOpen()) return;
    lock.hidePopover();
    lock.showPopover();
  }

  const mouse = { x: -100, y: -100 };
  const cur = { x: -100, y: -100, w: SIZE, h: SIZE };
  let target = null, visible = false, pressed = false, last = performance.now();

  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    const t = e.target.closest && e.target.closest(TARGETS);
    target = t && !t.disabled ? t : null;
    if (!visible) {
      visible = true;
      show();
      lock.classList.add('show');
      // al entrar en la ventana aparece donde está el ratón, sin viajar desde la esquina
      Object.assign(cur, { x: mouse.x - SIZE / 2, y: mouse.y - SIZE / 2 });
    }
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => {
    visible = false;
    target = null;
    lock.classList.remove('show', 'locked');
  });
  document.addEventListener('pointerdown', () => { pressed = true; lock.classList.add('press'); });
  document.addEventListener('pointerup', () => { pressed = false; lock.classList.remove('press'); });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;

    let want;
    if (target && target.isConnected) {
      const r = target.getBoundingClientRect();
      if (r.width && r.height) want = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
      else target = null;
    } else {
      target = null;
    }
    if (!want) want = { x: mouse.x - SIZE / 2, y: mouse.y - SIZE / 2, w: SIZE, h: SIZE };
    if (pressed) want = { x: want.x + 4, y: want.y + 4, w: want.w - 8, h: want.h - 8 };

    const k = reduced ? 1 : 1 - Math.exp(-dt * (target ? 22 : 16));
    for (const p of ['x', 'y', 'w', 'h']) cur[p] += (want[p] - cur[p]) * k;

    lock.classList.toggle('locked', !!target);
    lock.style.transform = `translate(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px)`;
    lock.style.width = `${cur.w.toFixed(1)}px`;
    lock.style.height = `${cur.h.toFixed(1)}px`;
  }
  requestAnimationFrame(frame);

  return { raise };
})();
