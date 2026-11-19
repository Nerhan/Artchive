/* ===== Artchive // base de datos (Supabase) =====
   Sesión (iniciar / cerrar) y la tabla "entries". Todo devuelve promesas.
   El navegador recuerda la sesión: no hace falta escribir la contraseña cada vez.

   Si algo falla se lanza un Error con un mensaje corto de terminal (ver friendly()).
*/
window.Artchive = window.Artchive || {};

Artchive.db = (() => {
  const { supabaseUrl, supabaseKey } = Artchive.CONFIG;
  const client = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'artchive-session' }
  });

  const TABLE = 'entries';
  const COLUMNS = 'id, category, title, creator, extra, genres, year, rating, status, cover, notes, added';
  const PAGE = 1000;   // Supabase entrega como mucho 1000 filas por pedido

  // Errores de Supabase o de la red -> mensaje de terminal
  function friendly(error) {
    const msg = String((error && (error.message || error.error_description)) || error || '');
    let text;
    if (/invalid login credentials/i.test(msg)) text = 'ACCESS DENIED: wrong user or password';
    else if (/email not confirmed/i.test(msg)) text = 'ACCESS DENIED: account not confirmed';
    else if (/too many|rate limit/i.test(msg)) text = 'TOO MANY ATTEMPTS: wait a minute and try again';
    else if (/failed to fetch|network|load failed|timeout/i.test(msg)) text = 'SERVER UNREACHABLE: check your connection';
    else if (/coerce the result to a single|0 rows/i.test(msg)) text = 'NOT FOUND: this record no longer exists. Reload the page';
    else if (/jwt|token|not authenticated|permission denied/i.test(msg)) text = 'SESSION EXPIRED: reload the page and log in again';
    else text = `SERVER ERROR: ${msg || 'unknown'}`;
    const err = new Error(text);
    err.cause = error;
    return err;
  }
  const check = ({ data, error }) => { if (error) throw friendly(error); return data; };
  const guard = promise => promise.then(check, e => { throw friendly(e); });

  /* ---------- Sesión ---------- */

  async function session() {
    try {
      const { data } = await client.auth.getSession();
      return data.session || null;
    } catch (e) {
      return null;
    }
  }

  async function signIn(email, password) {
    const data = await guard(client.auth.signInWithPassword({ email: email.trim(), password }));
    return data.session;
  }

  async function signOut() {
    try { await client.auth.signOut(); }
    catch (e) { /* aunque falle la red, la sesión local se borra igual */ }
  }

  /* ---------- Entradas ---------- */

  async function fetchAll() {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const page = await guard(client.from(TABLE).select(COLUMNS)
        .order('added', { ascending: true }).order('id', { ascending: true })
        .range(from, from + PAGE - 1));
      rows.push(...page);
      if (page.length < PAGE) return rows;
    }
  }

  const insert = row => guard(client.from(TABLE).insert(row).select(COLUMNS).single());
  const update = (id, row) => guard(client.from(TABLE).update(row).eq('id', id).select(COLUMNS).single());
  const remove = id => guard(client.from(TABLE).delete().eq('id', id));

  return { session, signIn, signOut, fetchAll, insert, update, remove };
})();
