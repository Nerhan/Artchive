/* ===== Artchive // archivo: la vista de una sección =====
   Buscar, filtrar (género y estado), ordenar, ver la ficha, agregar, editar y borrar
   (con deshacer), y la pestaña de estadísticas de la sección (js/stats.js).
   Los datos los guarda Artchive.library; aquí solo se pintan y se piden cambios.
*/
window.Artchive = window.Artchive || {};

Artchive.archive = (() => {
  const { CATEGORIES, STATUSES, statusLabel, library, ui, cover } = Artchive;
  const { $, esc, pad, toast } = ui;

  const view = $('viewArchive');
  const grid = $('grid');
  const title = $('archTitle');
  const searchInput = $('searchInput');
  const genreFilter = $('genreFilter');
  const statusFilter = $('statusFilter');
  const sortFilter = $('sortFilter');
  const clearBtn = $('clearFilters');
  const detailDialog = $('detailDialog');
  const formDialog = $('formDialog');
  const form = $('entryForm');

  // Las ventanas se abren como una pantalla que se enciende y se apagan al cerrarse
  ui.animateDialog(detailDialog);
  ui.animateDialog(formDialog);

  let cat = null;       // sección abierta
  let def = null;       // su definición en CATEGORIES

  // Cada sección recuerda su búsqueda, filtros, orden y pestaña mientras la página esté abierta
  const states = {};
  const state = () => states[cat] || (states[cat] = { q: '', genre: 'ALL', status: 'ALL', sort: 'newest', pane: 'records' });

  const byText = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  const coverOf = item => item.cover || cover(item, def.squareCovers);

  const pips = rating =>
    `<span class="pips" role="img" aria-label="Rating ${rating} of 5">` +
    [1, 2, 3, 4, 5].map(n => `<i${n <= rating ? ' class="on"' : ''}></i>`).join('') + '</span>';

  // Etiqueta de estado (en la tarjeta, la ficha y el formulario)
  const statusBadge = item =>
    `<span class="status status-${item.status}">${esc(statusLabel(def, item.status))}</span>`;

  // Si una imagen no carga, se sustituye por la portada generada
  function guardImage(img, item) {
    img.addEventListener('error', () => { img.src = cover(item, def.squareCovers); }, { once: true });
  }

  /* ---------- Fondo: el mismo cielo de la portada (js/stars.js) ---------- */

  const sky = Artchive.starfield($('archiveStars'), view, view);

  /* ---------- Filtros ---------- */

  // Listas desplegables con el estilo de la página (ver ui.selectMenu)
  ui.selectMenu(genreFilter);
  ui.selectMenu(statusFilter);
  ui.selectMenu(sortFilter);

  function updateGenreFilter() {
    const s = state();
    const list = library.genres(cat);
    if (s.genre !== 'ALL' && !list.some(g => g.key === s.genre)) s.genre = 'ALL';
    genreFilter.innerHTML = `<option value="ALL">ALL GENRES</option>` +
      list.map(g => `<option value="${esc(g.key)}">${esc(g.label.toUpperCase())} (${g.count})</option>`).join('');
    genreFilter.value = s.genre;
  }

  function updateStatusFilter() {
    const s = state();
    const all = library.list(cat);
    statusFilter.innerHTML = `<option value="ALL">ALL STATUSES</option>` +
      STATUSES.map(st => `<option value="${st}">${esc(statusLabel(def, st))} (${all.filter(i => i.status === st).length})</option>`).join('');
    statusFilter.value = s.status;
  }

  function setGenre(key) {
    state().genre = key;
    genreFilter.value = key;
    render();
  }

  searchInput.addEventListener('input', () => { state().q = searchInput.value; render(); });
  searchInput.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (searchInput.value) { searchInput.value = ''; state().q = ''; render(); } else searchInput.blur();
  });
  genreFilter.addEventListener('change', () => setGenre(genreFilter.value));
  statusFilter.addEventListener('change', () => { state().status = statusFilter.value; render(); });
  sortFilter.addEventListener('change', () => { state().sort = sortFilter.value; render(); });
  clearBtn.addEventListener('click', () => {
    Object.assign(state(), { q: '', genre: 'ALL', status: 'ALL' });
    searchInput.value = '';
    genreFilter.value = 'ALL';
    statusFilter.value = 'ALL';
    render();
  });

  /* ---------- Rejilla ---------- */

  const SORTS = {
    newest:  (a, b) => b.year - a.year || byText(a.title, b.title),
    oldest:  (a, b) => a.year - b.year || byText(a.title, b.title),
    title:   (a, b) => byText(a.title, b.title),
    creator: (a, b) => byText(a.creator, b.creator) || a.year - b.year,
    rating:  (a, b) => b.rating - a.rating || byText(a.title, b.title),
    added:   (a, b) => b.added - a.added || b.id - a.id
  };

  function cardHTML(item, index) {
    return `
      <article class="card card-${item.status}" data-id="${item.id}" tabindex="0" style="--i:${Math.min(index, 18)}"
               aria-label="${esc(item.title)}, ${esc(item.creator)}, ${item.year}">
        <div class="card-cover">
          ${statusBadge(item)}
          <img src="${esc(coverOf(item))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
        </div>
        <div class="card-body">
          <div class="card-head">
            <h3 class="card-title" title="${esc(item.title)}">${esc(item.title)}</h3>
            ${item.rating ? pips(item.rating) : ''}
          </div>
          <p class="card-creator" title="${esc(item.creator)}">${esc(item.creator)}</p>
          <p class="card-extra" title="${esc(item.extra)}"><span>${esc(def.extra.label)}:</span> ${esc(item.extra)}</p>
          <div class="card-meta">
            <div class="tags">${item.genres.map(g =>
              `<button type="button" class="tag" data-genre="${esc(g.toLowerCase())}" title="Filter by ${esc(g)}">${esc(g)}</button>`).join('')}</div>
            <span class="card-year">${item.year || '----'}</span>
          </div>
        </div>
      </article>`;
  }

  function emptyHTML(total) {
    if (total) {
      return `<div class="empty">
        <strong>[!] NO_MATCH</strong>
        <p>No record matches the current search or filters.</p>
        <button type="button" class="btn" data-act="reset">RESET_FILTERS</button>
      </div>`;
    }
    return `<div class="empty">
<pre aria-hidden="true">  .-----------.
  |  .-----.  |
  |  |     |  |
  |  '-----'  |
  '-----------'</pre>
      <strong>[ ] ${esc(def.name.toUpperCase())} IS EMPTY</strong>
      <p>Nothing stored in this sector yet.</p>
      <button type="button" class="btn btn-solid" data-act="new">+ ADD_FIRST_ENTRY</button>
    </div>`;
  }

  function render(animate = false) {
    if (!cat) return;
    const s = state();
    const all = library.list(cat);
    const words = s.q.toLowerCase().split(/\s+/).filter(Boolean);

    const shown = all.filter(item => {
      if (s.genre !== 'ALL' && !item.genres.some(g => g.toLowerCase() === s.genre)) return false;
      if (s.status !== 'ALL' && item.status !== s.status) return false;
      if (!words.length) return true;
      const haystack = `${item.title} ${item.creator} ${item.extra} ${item.genres.join(' ')} ${item.year} ${item.notes} ${statusLabel(def, item.status)}`.toLowerCase();
      return words.every(w => haystack.includes(w));
    }).sort(SORTS[s.sort] || SORTS.newest);

    const filtered = words.length > 0 || s.genre !== 'ALL' || s.status !== 'ALL';
    $('resultCount').textContent = filtered
      ? `${pad(shown.length)} / ${pad(all.length)} MATCH`
      : `${pad(all.length)} ${all.length === 1 ? 'RECORD' : 'RECORDS'}`;
    clearBtn.hidden = !filtered;

    grid.classList.toggle('animate', animate && !ui.reducedMotion());
    grid.innerHTML = shown.length ? shown.map(cardHTML).join('') : emptyHTML(all.length);
    grid.querySelectorAll('.card').forEach(card => {
      guardImage(card.querySelector('img'), library.get(cat, Number(card.dataset.id)));
    });
  }

  function refresh(animate = false) {
    if (!cat) return;
    updateGenreFilter();
    updateStatusFilter();
    render(animate);
    if (state().pane === 'stats') Artchive.stats.render(statsPane, cat, def, animate);
  }

  /* ---------- Pestañas: registros / estadísticas ---------- */

  const recordsPane = $('recordsPane');
  const statsPane = $('statsPane');
  const viewTabs = [...document.querySelectorAll('.view-tab')];

  function showPane(pane, animate = true) {
    state().pane = pane;
    viewTabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.pane === pane)));
    recordsPane.hidden = pane !== 'records';
    // el contador y RESET son de la lista, no de las estadísticas (se oculta sin mover nada)
    $('archSub').style.visibility = pane === 'records' ? '' : 'hidden';
    statsPane.hidden = pane !== 'stats';
    if (pane === 'stats') Artchive.stats.render(statsPane, cat, def, animate);
    else render(animate);
  }

  viewTabs.forEach(t => t.addEventListener('click', () => {
    if (state().pane !== t.dataset.pane) showPane(t.dataset.pane);
  }));
  // Flechas izquierda/derecha entre las dos pestañas
  viewTabs.forEach(t => t.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const other = viewTabs.find(x => x !== t);
    other.focus();
    other.click();
  }));

  grid.addEventListener('click', e => {
    const actBtn = e.target.closest('[data-act]');
    if (actBtn && !actBtn.closest('.card')) {
      if (actBtn.dataset.act === 'new') openForm(null);
      if (actBtn.dataset.act === 'reset') clearBtn.click();
      return;
    }
    const card = e.target.closest('.card');
    if (!card) return;
    const item = library.get(cat, Number(card.dataset.id));
    if (!item) return;

    // Editar y borrar están en la ficha que se abre al pulsar la tarjeta
    const tag = e.target.closest('[data-genre]');
    if (tag) return setGenre(tag.dataset.genre);
    openDetail(item);
  });

  grid.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.classList.contains('card')) return;
    const item = library.get(cat, Number(e.target.dataset.id));
    if (item) openDetail(item);
  });

  /* ---------- Borrar con deshacer ---------- */

  function removeItem(item) {
    const section = cat;
    const removed = library.remove(section, item.id);
    if (!removed) return;
    ui.sfx('remove');
    toast(`RECORD_DELETED: ${item.title}`, {
      timeout: 7000,
      action: { label: 'UNDO', run: () => library.restore(section, removed.item, removed.index) }
    });
  }

  /* ---------- Ficha ---------- */

  let detailId = null;

  function openDetail(item) {
    detailId = item.id;
    const row = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
    detailDialog.innerHTML = `
      <div class="detail">
        <div class="detail-cover${def.squareCovers ? ' square' : ''}">
          <img src="${esc(coverOf(item))}" alt="Cover of ${esc(item.title)}" referrerpolicy="no-referrer">
        </div>
        <div class="detail-info">
          <div class="detail-head">
            <div>
              <p class="kicker">${esc(def.name)} // record ${pad(item.id, 4)}</p>
              <h2 id="detailTitle">${esc(item.title)}</h2>
            </div>
            <button type="button" class="dialog-close" data-act="close" aria-label="Close">&times;</button>
          </div>
          <dl class="kv">
            ${row(def.creator.label, esc(item.creator) || '-')}
            ${row(def.extra.label, esc(item.extra) || '-')}
            ${row('STATUS', statusBadge(item))}
            ${row('RELEASE_YEAR', item.year || '-')}
            ${row('RATING', item.rating ? `${pips(item.rating)} &nbsp;${item.rating}/5` : '<span class="unrated">UNRATED</span>')}
            ${row('GENRES', `<div class="tags">${item.genres.map(g =>
              `<button type="button" class="tag" data-genre="${esc(g.toLowerCase())}" title="Filter by ${esc(g)}">${esc(g)}</button>`).join('')}</div>`)}
          </dl>
          ${item.notes ? `<div class="detail-notes"><h3>&gt; NOTES</h3><p>${esc(item.notes)}</p></div>` : ''}
          <div class="dialog-actions">
            <button type="button" class="btn btn-danger" data-act="delete">DELETE</button>
            <span class="spacer"></span>
            <button type="button" class="btn" data-act="edit">EDIT</button>
            <button type="button" class="btn btn-solid" data-act="close">CLOSE</button>
          </div>
        </div>
      </div>`;
    guardImage(detailDialog.querySelector('img'), item);
    detailDialog.showModal();
    ui.decode(detailDialog.querySelector('#detailTitle'), item.title, 700);
    detailDialog.querySelector('.btn-solid').focus();
  }

  detailDialog.addEventListener('click', e => {
    if (e.target === detailDialog) return detailDialog.close();   // clic fuera de la ficha
    const item = library.get(cat, detailId);
    const tag = e.target.closest('[data-genre]');
    if (tag) { detailDialog.close(); return setGenre(tag.dataset.genre); }
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    detailDialog.close();
    if (!item) return;
    if (btn.dataset.act === 'edit') openForm(item);
    if (btn.dataset.act === 'delete') removeItem(item);
  });

  /* ---------- Formulario (nueva entrada / editar) ---------- */

  const f = {
    title: $('fTitle'), creator: $('fCreator'), extra: $('fExtra'), genres: $('fGenres'),
    year: $('fYear'), cover: $('fCover'), notes: $('fNotes')
  };
  const ratingBox = $('fRating');
  const chipsBox = $('genreChips');
  const preview = $('coverPreview');
  const warning = $('formWarning');
  const RATING_WORDS = ['UNRATED', '1/5 // WEAK', '2/5 // MEH', '3/5 // GOOD', '4/5 // GREAT', '5/5 // MASTERPIECE'];

  const statusBox = $('fStatus');

  let editingId = null;
  let rating = 0;
  let status = 'completed';

  function setStatus(value) {
    status = value;
    statusBox.querySelectorAll('.seg-btn').forEach(b => b.setAttribute('aria-checked', String(b.dataset.value === status)));
  }

  statusBox.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (btn) setStatus(btn.dataset.value);
  });
  // Flechas para moverse entre los estados, como un grupo de opciones normal
  statusBox.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const at = (STATUSES.indexOf(status) + step + STATUSES.length) % STATUSES.length;
    setStatus(STATUSES[at]);
    statusBox.querySelector(`[data-value="${STATUSES[at]}"]`).focus();
  });
  let duplicateAccepted = false;

  function setRating(value) {
    rating = value;
    ratingBox.querySelectorAll('button').forEach(b => {
      const on = Number(b.dataset.value) <= rating;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(Number(b.dataset.value) === rating));
    });
    $('fRatingText').textContent = RATING_WORDS[rating];
  }

  // Pulsar el mismo valor otra vez quita la valoración
  ratingBox.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn) setRating(Number(btn.dataset.value) === rating ? 0 : Number(btn.dataset.value));
  });

  // Géneros ya usados en la sección: se pulsan para añadirlos o quitarlos
  function renderChips() {
    const current = library.parseGenres(f.genres.value).map(g => g.toLowerCase());
    chipsBox.innerHTML = library.genres(cat)
      .sort((a, b) => b.count - a.count).slice(0, 14)
      .map(g => `<button type="button" class="tag" data-label="${esc(g.label)}" aria-pressed="${current.includes(g.key)}">${esc(g.label)}</button>`)
      .join('');
  }

  chipsBox.addEventListener('click', e => {
    const chip = e.target.closest('.tag');
    if (!chip) return;
    const label = chip.dataset.label;
    const list = library.parseGenres(f.genres.value);
    const at = list.findIndex(g => g.toLowerCase() === label.toLowerCase());
    if (at >= 0) list.splice(at, 1); else list.push(label);
    f.genres.value = list.join(', ');
    f.genres.setCustomValidity('');
    renderChips();
  });

  function updatePreview() {
    const draft = { title: f.title.value.trim() || 'UNTITLED', creator: f.creator.value.trim() };
    const generated = cover(draft, def.squareCovers);
    preview.onerror = () => { preview.onerror = null; preview.src = generated; };
    preview.src = f.cover.value.trim() || generated;
  }

  let previewTimer = 0;
  [f.title, f.creator, f.cover].forEach(input => input.addEventListener('input', () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 350);
  }));

  f.genres.addEventListener('input', () => { f.genres.setCustomValidity(''); renderChips(); });
  form.addEventListener('input', () => { duplicateAccepted = false; warning.hidden = true; });

  function openForm(item) {
    if (!cat) return;
    editingId = item ? item.id : null;
    duplicateAccepted = false;
    warning.hidden = true;
    form.reset();

    $('formKicker').textContent = `${def.name} archive`;
    ui.decode($('formTitle'), item ? '[~] EDIT_ENTRY' : '[+] NEW_ENTRY', 650);
    $('fCreatorLabel').textContent = `> ${def.creator.label} *`;
    $('fExtraLabel').textContent = `> ${def.extra.label} *`;
    f.title.placeholder = `e.g., ${def.examples.title}`;
    f.creator.placeholder = `e.g., ${def.creator.placeholder}`;
    f.extra.placeholder = `e.g., ${def.extra.placeholder}`;
    f.genres.placeholder = `e.g., ${def.examples.genres}`;
    f.year.placeholder = `e.g., ${def.examples.year}`;
    preview.classList.toggle('square', !!def.squareCovers);
    statusBox.innerHTML = STATUSES.map(st =>
      `<button type="button" class="seg-btn seg-${st}" role="radio" data-value="${st}">${esc(statusLabel(def, st))}</button>`).join('');

    if (item) {
      f.title.value = item.title;
      f.creator.value = item.creator;
      f.extra.value = item.extra;
      f.genres.value = item.genres.join(', ');
      f.year.value = item.year || '';
      f.cover.value = item.cover;
      f.notes.value = item.notes;
    }
    f.genres.setCustomValidity('');
    setRating(item ? item.rating : 0);
    setStatus(item ? item.status : 'completed');
    renderChips();
    updatePreview();

    if (detailDialog.open) detailDialog.close();
    formDialog.showModal();
    formDialog.scrollTop = 0;
    f.title.focus();
  }

  formDialog.addEventListener('click', e => { if (e.target.closest('[data-close]')) formDialog.close(); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const genres = library.parseGenres(f.genres.value);
    if (!genres.length) {
      f.genres.setCustomValidity('Enter at least one genre.');
      f.genres.reportValidity();
      return;
    }

    const fields = {
      title: f.title.value,
      creator: f.creator.value,
      extra: f.extra.value,
      genres,
      year: f.year.value,
      rating,
      status,
      cover: f.cover.value,
      notes: f.notes.value
    };

    // Aviso si ya existe una entrada igual; guardar otra vez la añade de todos modos
    if (!duplicateAccepted && library.isDuplicate(cat, { ...fields, title: fields.title.trim(), creator: fields.creator.trim(), year: parseInt(fields.year, 10) }, editingId)) {
      duplicateAccepted = true;
      warning.textContent = '[!] DUPLICATE: this record is already in the archive. Press SAVE_ENTRY again to keep both.';
      warning.hidden = false;
      return;
    }

    const title = fields.title.trim();
    if (editingId !== null) {
      library.update(cat, editingId, fields);
      toast(`RECORD_UPDATED: ${title}`);
    } else {
      library.add(cat, fields);
      toast(`RECORD_ADDED: ${title}`);
    }
    formDialog.close();
  });

  /* ---------- API de la vista ---------- */

  function open(key) {
    cat = key;
    def = CATEGORIES[key];
    const s = state();

    replayTitle();
    searchInput.placeholder = def.search;
    searchInput.value = s.q;
    sortFilter.value = s.sort;
    statusFilter.value = s.status;
    $('sortCreatorOption').textContent = `${def.creator.sort || def.creator.label}: A-Z`;
    grid.classList.toggle('covers-square', !!def.squareCovers);

    updateGenreFilter();
    updateStatusFilter();
    showPane(s.pane, true);
    view.scrollTop = 0;
    sky.start();
  }

  // El título se "decodifica" cuando la pantalla ya se encendió (la entrada dura ~0.4 s)
  function replayTitle() {
    if (def) ui.decode(title, def.name.toUpperCase(), 1300, { delay: 380, wobble: true });
  }

  const dialogOpen = () => formDialog.open || detailDialog.open;

  $('addBtn').addEventListener('click', () => openForm(null));

  // Al volver a la portada
  function close() {
    sky.stop();
  }

  return {
    open, close, refresh, openForm, dialogOpen, replayTitle,
    focusSearch() { searchInput.focus(); searchInput.select(); },
    get current() { return cat; }
  };
})();
