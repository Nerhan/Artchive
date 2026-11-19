/* ===== Artchive // sonidos =====
   Bips y barridos de terminal hechos con el sintetizador del navegador (Web Audio):
   no hay archivos de audio. El navegador no deja sonar nada hasta que la persona hace
   clic o pulsa una tecla en la página; desde ese momento se oye todo.

   Artchive.sfx.play('click')   ver SOUNDS más abajo
   Artchive.sfx.toggle()        silenciar / activar (tecla M)

   Pasar el ratón y hacer clic en botones, nodos, tarjetas, etc. suena solo (ver HOVER).
*/
window.Artchive = window.Artchive || {};

Artchive.sfx = (() => {
  const VOLUME = 0.32;
  let ctx = null, master = null, noiseBuf = null;
  let on = true;

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = VOLUME;
      master.connect(ctx.destination);
      // Ruido blanco para los "chasquidos" de encendido
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { capture: true, passive: true }));

  // Un tono: forma de onda, frecuencia inicial → final, duración (s), volumen, retraso (s)
  function tone(type, f0, f1, dur, vol, delay = 0) {
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.008, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Ráfaga de ruido filtrado (estática de pantalla)
  function noise(dur, vol, freq = 2400, delay = 0) {
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const SOUNDS = {
    hover:      () => tone('sine', 2600, 2600, 0.025, 0.035),
    click:      () => { tone('square', 660, 990, 0.05, 0.05); },
    open:       () => { tone('sawtooth', 110, 880, 0.26, 0.045); noise(0.18, 0.06, 3000); },
    close:      () => { tone('sawtooth', 700, 90, 0.2, 0.04); noise(0.1, 0.04, 1800); },
    listOpen:   () => { tone('square', 1100, 1100, 0.03, 0.035); tone('square', 1650, 1650, 0.03, 0.035, 0.04); },
    listClose:  () => { tone('square', 1650, 1650, 0.03, 0.03); tone('square', 1100, 1100, 0.03, 0.03, 0.04); },
    type:       () => tone('square', 2900 + Math.random() * 600, 2900, 0.012, 0.018),
    ok:         () => tone('square', 1320, 1320, 0.05, 0.03),
    granted:    () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.16, 0.06, i * 0.075)),
    enter:      () => { noise(0.22, 0.07, 3500); tone('sine', 90, 1400, 0.35, 0.04); },
    back:       () => { tone('sine', 1200, 120, 0.3, 0.04); noise(0.12, 0.04, 1500); },
    dock:       () => tone('sine', 260, 620, 0.35, 0.06),
    undock:     () => tone('sine', 620, 260, 0.35, 0.05),
    toast:      () => { tone('sine', 988, 988, 0.06, 0.04); tone('sine', 1319, 1319, 0.09, 0.04, 0.06); },
    save:       () => [784, 1047, 1568].forEach((f, i) => tone('triangle', f, f, 0.12, 0.05, i * 0.07)),
    remove:     () => { tone('square', 420, 140, 0.18, 0.04); noise(0.08, 0.04, 900); },
    error:      () => { tone('square', 150, 150, 0.12, 0.05); tone('square', 150, 150, 0.12, 0.05, 0.16); }
  };

  function play(name) {
    if (!on || !ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
    try { SOUNDS[name](); } catch (e) { /* sin sonido no pasa nada */ }
  }

  /* ---------- Sonidos automáticos al pasar y al pulsar ---------- */

  const HOVER = '.btn, .sat, .tag, .card, .select-button, .select-list li, .seg-btn, .view-tab, ' +
                '.dialog-close, .rating-input button, .link-btn';
  let lastHover = null, lastHoverAt = 0;

  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest(HOVER);
    if (!el || el === lastHover) return;
    lastHover = el;
    const now = performance.now();
    if (now - lastHoverAt < 45) return;
    lastHoverAt = now;
    play('hover');
  });
  document.addEventListener('pointerout', e => {
    if (lastHover && !lastHover.contains(e.relatedTarget)) lastHover = null;
  });
  document.addEventListener('click', e => {
    if (e.target.closest(HOVER)) play('click');
  }, true);

  /* ---------- Silenciar: tecla M (js/app.js) ---------- */

  function toggle() {
    on = !on;
    if (on) { unlock(); play('ok'); }
    if (Artchive.ui) Artchive.ui.toast(on ? 'SOUND: ON  [M]' : 'SOUND: OFF  [M]', { timeout: 1800 });
  }

  return { play, toggle, get on() { return on; } };
})();
