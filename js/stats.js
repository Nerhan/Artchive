/* ===== Artchive // estadísticas de una sección =====
   La pestaña STATS de cada sección: totales por estado, nota media, reparto de notas,
   géneros más usados, décadas y lo último agregado. Todo sale de los datos en memoria,
   así que se actualiza solo al agregar, editar o borrar.

   Artchive.stats.render(contenedor, clave, definición, animar)
*/
window.Artchive = window.Artchive || {};

Artchive.stats = (() => {
  const { STATUSES, statusLabel, library, ui } = Artchive;
  const { esc, pad } = ui;

  // Barras: --v es el largo (0 a 1) y --i el orden en que crecen
  function bars(rows, { vertical = false, empty = 'NO DATA' } = {}) {
    const max = Math.max(1, ...rows.map(r => r.value));
    if (!rows.length) return `<p class="stat-empty">${empty}</p>`;
    return `<ol class="bars ${vertical ? 'bars-v' : 'bars-h'}">` + rows.map((r, i) => `
      <li class="bar-row" title="${esc(r.label)}: ${r.value} ${r.value === 1 ? 'record' : 'records'}">
        <span class="bar-label">${r.html || esc(r.label)}</span>
        <span class="bar-track">${r.value ? `<span class="bar" style="--v:${(r.value / max).toFixed(3)};--i:${i}"></span>` : ''}</span>
        <span class="bar-value">${r.value}</span>
      </li>`).join('') + '</ol>';
  }

  function tile(label, value, { decimals = 0, suffix = '', hot = false } = {}) {
    return `<div class="stat-tile${hot ? ' stat-hot' : ''}">
      <span class="stat-label">${esc(label)}</span>
      <span class="stat-value"><b data-count="${value}" data-decimals="${decimals}">${value.toFixed(decimals)}</b>${suffix}</span>
    </div>`;
  }

  // Los números cuentan desde 0 hasta su valor
  function countUp(root) {
    const els = root.querySelectorAll('[data-count]');
    if (ui.reducedMotion()) return;
    const t0 = performance.now(), duration = 900;
    (function step(now) {
      const p = Math.min(1, (now - t0) / duration);
      const k = 1 - Math.pow(1 - p, 3);
      els.forEach(el => {
        el.textContent = (Number(el.dataset.count) * k).toFixed(Number(el.dataset.decimals));
      });
      if (p < 1 && root.isConnected) requestAnimationFrame(step);
    })(t0);
  }

  function render(root, cat, def, animate = true) {
    const items = library.list(cat);
    const by = st => items.filter(i => i.status === st).length;
    const rated = items.filter(i => i.rating);
    const avg = rated.length ? rated.reduce((n, i) => n + i.rating, 0) / rated.length : 0;

    if (!items.length) {
      root.innerHTML = `<div class="empty"><strong>[ ] NO DATA YET</strong>
        <p>Add records to ${esc(def.name.toLowerCase())} and their stats will show up here.</p></div>`;
      return;
    }

    // Notas: de 5 a 1
    const pips = n => `<span class="pips" aria-hidden="true">${[1, 2, 3, 4, 5].map(k => `<i${k <= n ? ' class="on"' : ''}></i>`).join('')}</span>`;
    const ratings = [5, 4, 3, 2, 1].map(n => ({ label: `${n}/5`, html: pips(n), value: items.filter(i => i.rating === n).length }));

    // Géneros más usados (los 8 primeros)
    const genres = library.genres(cat).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 8).map(g => ({ label: g.label.toUpperCase(), value: g.count }));

    // Décadas de estreno, en orden
    const decades = new Map();
    items.filter(i => i.year).forEach(i => {
      const d = Math.floor(i.year / 10) * 10;
      decades.set(d, (decades.get(d) || 0) + 1);
    });
    const decadeRows = [...decades.entries()].sort((a, b) => a[0] - b[0])
      .map(([d, n]) => ({ label: `${String(d).slice(-2)}s`, value: n }));

    // Últimos agregados
    const latest = [...items].sort((a, b) => b.added - a.added || b.id - a.id).slice(0, 5);

    root.innerHTML = `
      <div class="stat-tiles">
        ${tile('TOTAL', items.length, { hot: true })}
        ${STATUSES.map(st => tile(statusLabel(def, st), by(st))).join('')}
        ${tile('AVG RATING', avg, { decimals: 1, suffix: '<small>/5</small>' })}
      </div>

      <div class="stat-panels">
        <section class="stat-panel">
          <h3>&gt; TOP GENRES</h3>
          ${bars(genres)}
        </section>

        <section class="stat-panel">
          <h3>&gt; RATINGS <small>${rated.length} rated · ${items.length - rated.length} unrated</small></h3>
          ${bars(ratings)}
        </section>

        <section class="stat-panel">
          <h3>&gt; RELEASE DECADES</h3>
          ${bars(decadeRows, { vertical: true, empty: 'NO YEARS' })}
        </section>

        <section class="stat-panel">
          <h3>&gt; LATEST ADDED</h3>
          <ol class="latest">${latest.map((i, k) => `
            <li style="--i:${k}">
              <span class="latest-n">${pad(k + 1, 2)}</span>
              <span class="latest-title">${esc(i.title)}</span>
              <span class="status status-${i.status}">${esc(statusLabel(def, i.status))}</span>
            </li>`).join('')}
          </ol>
        </section>
      </div>`;

    root.classList.toggle('animate', animate && !ui.reducedMotion());
    if (animate) countUp(root);
  }

  return { render };
})();
