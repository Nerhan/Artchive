/* ===== Artchive // biblioteca en memoria =====
   Guarda todas las entradas de todas las secciones mientras la página está abierta.
   Parte de js/data.js y exporta un data.js nuevo cuando se lo piden.

   Entrada = { id, title, creator, extra, genres[], year, rating (0-5), status, cover, notes, added }
   status: 'completed' | 'progress' | 'planned' | 'dropped' (si falta, cuenta como completed)
*/
window.Artchive = window.Artchive || {};

Artchive.library = (() => {
  const KEYS = Object.keys(Artchive.CATEGORIES);
  const data = Object.fromEntries(KEYS.map(k => [k, []]));
  const listeners = new Set();
  let nextId = 1;
  let dirty = 0; // cambios sin exportar

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

  // Convierte cualquier objeto (data.js o formulario) en campos limpios.
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
  const changed = () => { dirty++; emit(); };

  /* ---------- Carga inicial desde data.js ---------- */

  const seed = Artchive.DATA || {};
  KEYS.forEach(k => {
    (Array.isArray(seed[k]) ? seed[k] : []).forEach(raw => {
      const fields = clean(raw);
      if (fields) data[k].push({ id: nextId++, ...fields });
    });
  });

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

  function add(cat, raw) {
    const fields = clean(raw);
    if (!fields || !data[cat]) return null;
    const item = { id: nextId++, ...fields, added: Date.now() };
    data[cat].push(item);
    changed();
    return item;
  }

  function update(cat, id, raw) {
    const item = get(cat, id);
    const fields = clean(raw);
    if (!item || !fields) return null;
    Object.assign(item, fields, { added: item.added });
    changed();
    return item;
  }

  // Devuelve lo necesario para deshacer: { item, index }
  function remove(cat, id) {
    const index = list(cat).findIndex(i => i.id === id);
    if (index < 0) return null;
    const [item] = data[cat].splice(index, 1);
    changed();
    return { item, index };
  }

  function restore(cat, item, index) {
    if (!data[cat] || get(cat, item.id)) return;
    data[cat].splice(Math.min(index, data[cat].length), 0, item);
    changed();
  }

  /* ---------- Exportar (Ctrl+S descarga un data.js nuevo) ---------- */

  function exportText() {
    const out = {};
    KEYS.forEach(k => { out[k] = data[k].map(({ id, ...fields }) => fields); });
    return '/* Artchive // archivo de datos, exportado el ' + new Date().toISOString().slice(0, 10) + '\n' +
      '   Reemplaza js/data.js con este archivo para que los cambios queden guardados. */\n' +
      'window.Artchive = window.Artchive || {};\n' +
      'Artchive.DATA = ' + JSON.stringify(out, null, 2) + ';\n';
  }

  return {
    list, get, count, total, genres, isDuplicate, parseGenres,
    add, update, remove, restore,
    exportText,
    get dirty() { return dirty; },
    markSaved() { dirty = 0; emit(); },
    onChange(fn) { listeners.add(fn); }
  };
})();
