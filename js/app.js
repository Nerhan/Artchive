/* ===== Artchive // arranque: navegación, guardar (Ctrl+S) y atajos de teclado =====
   La página es una sola. La dirección decide qué se ve:
     index.html#/         portada
     index.html#/music    sección "music" (cualquier clave de js/categories.js)
*/
(() => {
  const { CATEGORIES, library, orbit, archive, ui } = Artchive;
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
     La página es estática: los cambios viven en memoria hasta descargar un data.js nuevo
     con Ctrl+S y ponerlo en lugar de js/data.js. */

  function exportData() {
    ui.download('data.js', library.exportText(), 'text/javascript');
    library.markSaved();
    ui.sfx('save');
    toast('SAVED: data.js downloaded. Replace js/data.js with it to keep your changes.', { timeout: 9000 });
  }

  let hinted = false;
  library.onChange(() => {
    orbit.updateCounts();
    if (!viewArchive.hidden) archive.refresh();
    // La primera vez que algo cambia, se recuerda cómo guardarlo
    if (library.dirty && !hinted) {
      hinted = true;
      setTimeout(() => toast('TIP: press Ctrl+S to download data.js with your changes.', { timeout: 8000 }), 500);
    }
  });

  // Aviso del navegador al cerrar o recargar con cambios sin exportar
  window.addEventListener('beforeunload', e => {
    if (!library.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ---------- Atajos de teclado ---------- */

  document.addEventListener('keydown', e => {
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
