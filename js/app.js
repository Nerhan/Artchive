/* ===== Artchive // arranque: navegación, copia de seguridad (Ctrl+S), sesión y atajos =====
   La página es una sola. La dirección decide qué se ve:
     index.html#/         portada
     index.html#/music    sección "music" (cualquier clave de js/categories.js)
*/
(() => {
  const { CATEGORIES, library, orbit, archive, ui, db } = Artchive;
  const { $, toast } = ui;

  const viewHome = $('viewHome');
  const viewArchive = $('viewArchive');

  /* ---------- Navegación ---------- */

  let currentView = null;

  function route() {
    const key = decodeURIComponent(location.hash.replace(/^#\/?/, '')).toLowerCase();
    const isArchive = Object.prototype.hasOwnProperty.call(CATEGORIES, key);

    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    viewHome.hidden = isArchive;
    viewArchive.hidden = !isArchive;

    if (currentView && (isArchive ? 'archive' : 'home') !== currentView) ui.sfx(isArchive ? 'enter' : 'back');
    if (isArchive) {
      orbit.stop();
      archive.open(key);
      document.title = `Artchive // ${CATEGORIES[key].name}`;
    } else {
      archive.close();
      orbit.start();
      document.title = 'Artchive';
    }

    // Animación de entrada solo al cambiar de vista (no al pasar de una sección a otra)
    const next = isArchive ? 'archive' : 'home';
    if (next !== currentView) {
      const el = isArchive ? viewArchive : viewHome;
      el.classList.remove('entering');
      void el.offsetWidth;
      el.classList.add('entering');
    }
    currentView = next;
  }

  window.addEventListener('hashchange', route);

  /* ---------- Guardar ----------
     Cada cambio se guarda solo en la base de datos (js/library.js). Ctrl+S descarga además
     una copia de seguridad con todo, en el formato de js/data.js de la versión sin base de
     datos: el plan gratis de Supabase no hace copias, así que conviene bajar una de vez en cuando. */

  function exportData() {
    if (!library.total()) { toast('NOTHING TO BACK UP: the archive is empty.', { kind: 'warn' }); return; }
    const day = new Date().toISOString().slice(0, 10);
    ui.download(`artchive-backup-${day}.js`, library.exportText(), 'text/javascript');
    ui.sfx('save');
    toast(`BACKUP: artchive-backup-${day}.js downloaded.`, { timeout: 6000 });
  }

  library.onChange(() => {
    orbit.updateCounts();
    if (!viewArchive.hidden) archive.refresh();
  });
  library.onError(err => toast(err.message, { kind: 'error', timeout: 8000 }));

  // Aviso del navegador al cerrar o recargar mientras algo se está guardando
  window.addEventListener('beforeunload', e => {
    if (!library.pending) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ---------- Cerrar sesión ----------
     Se borra la sesión de este navegador y se recarga: vuelve a pedir la contraseña. */

  async function logout() {
    if (library.pending) { toast('WAIT: still saving changes.', { kind: 'warn' }); return; }
    ui.sfx('back');
    await db.signOut();
    library.clear();
    location.hash = '#/';
    location.reload();
  }
  $('logoutBtn').addEventListener('click', logout);

  /* ---------- Atajos de teclado ---------- */

  document.addEventListener('keydown', e => {
    // Mientras la pantalla de arranque está (o pide la contraseña), los atajos no actúan
    if (document.body.classList.contains('booting')) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      exportData();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || archive.dialogOpen()) return;
    const typing = e.target.closest('input, textarea, select, [contenteditable]');

    // M: silenciar / activar el sonido
    if (!typing && (e.key === 'm' || e.key === 'M') && Artchive.sfx) { Artchive.sfx.toggle(); return; }

    if (!viewHome.hidden) {
      // Espacio: alinear / soltar (si el foco está en un botón o enlace, se deja actuar a ese)
      if (e.key === ' ' && !e.target.closest('a, button')) { e.preventDefault(); orbit.toggle(); }
      return;
    }

    if (typing) return;
    if (e.key === '/') { e.preventDefault(); archive.focusSearch(); }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); archive.openForm(null); }
    else if (e.key === 'Escape') { location.hash = '#/'; }
  });

  /* ---------- Inicio ---------- */

  route();

  // Entrada de la portada: los nodos salen del núcleo y el título se "decodifica".
  // Si hubo pantalla de arranque (js/boot.js), se hace cuando esta empieza a apagarse.
  // Si la página se abrió en una sección, route() ya hizo su entrada.
  Artchive.boot.done.then(() => {
    if (viewHome.hidden) return;
    viewHome.classList.remove('entering');
    void viewHome.offsetWidth;
    viewHome.classList.add('entering');
    orbit.intro();
    ui.decode(document.querySelector('.view-home .brand-name'));
  });
})();
