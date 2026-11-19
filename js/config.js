/* ===== Artchive // conexión con Supabase =====
   Dirección del proyecto y clave pública (publishable key).
   Las dos pueden estar a la vista en GitHub: por sí solas no dejan ver ni tocar nada.
   Quién puede leer y escribir lo deciden las reglas de seguridad (RLS) de la tabla
   "entries" en Supabase: solo el dueño de cada entrada, con su sesión iniciada.

   NUNCA pongas aquí la clave secreta (sb_secret_... o service_role).
*/
window.Artchive = window.Artchive || {};

Artchive.CONFIG = {
  supabaseUrl: 'https://nyemqnfblwrxpghlqrlz.supabase.co',
  supabaseKey: 'sb_publishable_yN5FT3N7qkkFDjHdYnDaqA_KwJilo58'
};
