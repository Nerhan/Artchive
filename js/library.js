/* ===== Artchive // biblioteca =====
   Guarda en memoria todas las entradas de todas las secciones y las mantiene al día con
   Supabase (js/db.js): load() las trae al iniciar sesión, y cada alta, edición o borrado se
   guarda en la base de datos al momento.

   Entrada = { id, title, creator, extra, genres[], year, rating (0-5), status, cover, notes, added }
   status: 'completed' | 'progress' | 'planned' | 'dropped' (si falta, cuenta como completed)

   add() y update() esperan a que la base de datos confirme (devuelven una promesa).
   remove() quita la entrada al instante y, si la base de datos falla, la vuelve a poner y
   avisa con onError(). exportText() arma una copia de seguridad en formato data.js.
*/
window.Artchive = window.Artchive || {};

Artchive.library = (() => {
  const KEYS = Object.keys(Artchive.CATEGORIES);
  const data = Object.fromEntries(KEYS.map(k => [k, []]));
  const listeners = new Set();
  const errorListeners = new Set();
  let pending = 0;      // guardados en curso (al cerrar la pestaña con alguno, el navegador avisa)

  const text = v => String(v ?? '').trim();

  // "Rock, Blues" o ['Rock', 'Blues'] -> ['Rock', 'Blues'] (sin vacíos ni repetidos)
  function parseGenres(value) {
    const parts = Array.isArray(value) ? value : String(value ?? '').split(',');
    const seen = new Set();
    return parts.map(text).filter(g => {
      const key = g.toLowerCase();
      if (!g || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Convierte cualquier objeto (fila de la base de datos o formulario) en campos limpios.
  // También acepta el formato antiguo de música (artist/album) y "genre" como texto.
  function clean(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const title = text(raw.title);
    if (!title) return null;
    const year = parseInt(raw.year, 10);
    const rating = Math.round(Number(raw.rating));
    return {
      title,
      creator: text(raw.creator ?? raw.artist),
      extra: text(raw.extra ?? raw.album),
      genres: parseGenres(raw.genres ?? raw.genre),
      year: Number.isFinite(year) ? year : 0,
      rating: rating >= 1 && rating <= 5 ? rating : 0,
      status: Artchive.STATUSES.includes(raw.status) ? raw.status : 'completed',
      cover: text(raw.cover),
      notes: text(raw.notes),
      added: Number(raw.added) || 0
    };
  }

  const keyOf = i => `${i.title}|${i.creator}|${i.year}`.toLowerCase();
  const emit = () => listeners.forEach(fn => fn());
  const fail = err => errorListeners.forEach(fn => fn(err));

  // Fila de la base de datos <-> entrada en memoria
  function fromRow(row) {
    const fields = clean(row);
    if (!fields) return null;
    return { ...fields, id: row.id, added: Date.parse(row.added) || 0 };
  }
  // (sin id ni fecha: los pone la base de datos)
  const toRow = fields => {
    const { id, added, ...rest } = fields;
    return rest;
  };

  // Cuenta los guardados en curso
  async function track(promise) {
    pending++;
    try { return await promise; }
    finally { pending--; }
  }

  /* ---------- Carga desde la base de datos ---------- */

  async function load() {
    const rows = await Artchive.db.fetchAll();
    KEYS.forEach(k => { data[k] = []; });
    rows.forEach(row => {
      const item = data[row.category] && fromRow(row);
      if (item) data[row.category].push(item);
    });
    emit();
    return total();
  }

  /* ---------- Lectura ---------- */

  const list = cat => data[cat] || [];
  const get = (cat, id) => list(cat).find(i => i.id === id) || null;
  const count = cat => list(cat).length;
  const total = () => KEYS.reduce((n, k) => n + data[k].length, 0);

  // Géneros usados en una sección: [{ key, label, count }] ordenados por nombre
  function genres(cat) {
    const map = new Map();
    list(cat).forEach(i => i.genres.forEach(g => {
      const key = g.toLowerCase();
      const entry = map.get(key) || { key, label: g, count: 0 };
      entry.count++;
      map.set(key, entry);
    }));
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  function isDuplicate(cat, fields, exceptId = null) {
    const key = keyOf(fields);
    return list(cat).some(i => i.id !== exceptId && keyOf(i) === key);
  }

  /* ---------- Escritura ---------- */

  async function add(cat, raw) {
    const fields = clean(raw);
    if (!fields || !data[cat]) return null;
    const row = await track(Artchive.db.insert({ category: cat, ...toRow(fields) }));
    const item = fromRow(row);
    data[cat].push(item);
    emit();
    return item;
  }

  async function update(cat, id, raw) {
    const item = get(cat, id);
    const fields = clean(raw);
    if (!item || !fields) return null;
    const row = await track(Artchive.db.update(id, toRow(fields)));
    Object.assign(item, fromRow(row));
    emit();
    return item;
  }

  // Se quita al instante; si la base de datos no lo borra, vuelve a su sitio y se llama a onFail.
  // Devuelve lo necesario para deshacer: { item, index }
  function remove(cat, id, onFail) {
    const index = list(cat).findIndex(i => i.id === id);
    if (index < 0) return null;
    const [item] = data[cat].splice(index, 1);
    emit();
    track(Artchive.db.remove(id)).catch(err => {
      if (!get(cat, item.id)) data[cat].splice(Math.min(index, data[cat].length), 0, item);
      emit();
      if (onFail) onFail(err);
      fail(err);
    });
    return { item, index };
  }

  // Deshacer un borrado: se guarda de nuevo (la base de datos le da un id nuevo)
  async function restore(cat, item, index) {
    if (!data[cat] || get(cat, item.id)) return;
    const row = await track(Artchive.db.insert({ category: cat, ...toRow(item), added: new Date(item.added || Date.now()).toISOString() }));
    data[cat].splice(Math.min(index, data[cat].length), 0, fromRow(row));
    emit();
  }

  // Al cerrar sesión no queda nada en memoria
  function clear() {
    KEYS.forEach(k => { data[k] = []; });
    emit();
  }

  /* ---------- Copia de seguridad (Ctrl+S) ----------
     Mismo formato que js/data.js de la versión sin base de datos (rama "static"):
     ese archivo sirve tal cual allí. */

  function exportText() {
    const out = {};
    KEYS.forEach(k => { out[k] = data[k].map(({ id, ...fields }) => fields); });
    return '/* Artchive // copia de seguridad del ' + new Date().toISOString().slice(0, 10) + '\n' +
      '   Sirve como js/data.js en la versión sin base de datos (rama "static"). */\n' +
      'window.Artchive = window.Artchive || {};\n' +
      'Artchive.DATA = ' + JSON.stringify(out, null, 2) + ';\n';
  }

  return {
    list, get, count, total, genres, isDuplicate, parseGenres,
    load, add, update, remove, restore, clear,
    exportText,
    get pending() { return pending; },
    onChange(fn) { listeners.add(fn); },
    onError(fn) { errorListeners.add(fn); }
  };
})();
