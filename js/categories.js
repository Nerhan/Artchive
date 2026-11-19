/* ===== Artchive // secciones =====
   Cada entrada define una sección del archivo. Para crear una nueva basta con
   añadirla aquí: aparece sola como nodo en la portada y como pestaña.

   slot:  posición del nodo cuando el sistema está alineado
          (0 = arriba, y sigue en el sentido del reloj cada 45°).
   doing: cómo se llama el estado "en curso" en esa sección (PLAYING, READING...).
   labels: (opcional) nombres propios para los estados de esa sección, si los de siempre
           no encajan. Ver Artchive.STATUSES al final.
*/
window.Artchive = window.Artchive || {};

Artchive.CATEGORIES = {
  music: {
    name: 'Music', slot: 7, squareCovers: true, doing: 'ON REPEAT',
    // Un disco no "se está escuchando" durante semanas como un juego: aquí los estados son
    // en bucle estos días / ya escuchado / en la cola para escuchar / lo saltaste
    labels: { progress: 'ON REPEAT', completed: 'LISTENED', planned: 'QUEUED', dropped: 'SKIPPED' },
    creator: { label: 'ARTIST_BAND', sort: 'ARTIST', placeholder: 'Metallica' },
    extra:   { label: 'ALBUM', placeholder: 'Master of Puppets' },
    examples: { title: 'Master of Puppets', genres: 'Heavy Metal, Thrash Metal', year: 1986 },
    search: 'Title, artist, album, genre...'
  },
  films: {
    name: 'Films', slot: 0, doing: 'WATCHING',
    creator: { label: 'DIRECTOR', placeholder: 'Ridley Scott' },
    extra:   { label: 'STARRING', placeholder: 'Harrison Ford' },
    examples: { title: 'Blade Runner', genres: 'Sci-Fi, Neo-noir', year: 1982 },
    search: 'Title, director, starring, genre...'
  },
  series: {
    name: 'Series', slot: 5, doing: 'WATCHING',
    creator: { label: 'CREATOR', placeholder: 'Vince Gilligan' },
    extra:   { label: 'SEASONS', placeholder: '5' },
    examples: { title: 'Breaking Bad', genres: 'Drama, Crime', year: 2008 },
    search: 'Title, creator, seasons, genre...'
  },
  anime: {
    name: 'Anime', slot: 3, doing: 'WATCHING',
    creator: { label: 'DIRECTOR', placeholder: 'Shinichiro Watanabe' },
    extra:   { label: 'STUDIO', placeholder: 'Sunrise' },
    examples: { title: 'Cowboy Bebop', genres: 'Sci-Fi, Action', year: 1998 },
    search: 'Title, director, studio, genre...'
  },
  manga: {
    name: 'Manga', slot: 4, doing: 'READING',
    creator: { label: 'AUTHOR', placeholder: 'Kentaro Miura' },
    extra:   { label: 'VOLUMES', placeholder: '41' },
    examples: { title: 'Berserk', genres: 'Dark Fantasy, Horror', year: 1989 },
    search: 'Title, author, volumes, genre...'
  },
  books: {
    name: 'Books', slot: 6, doing: 'READING',
    creator: { label: 'AUTHOR', placeholder: 'William Gibson' },
    extra:   { label: 'PUBLISHER', placeholder: 'Ace Books' },
    examples: { title: 'Neuromancer', genres: 'Cyberpunk, Science Fiction', year: 1984 },
    search: 'Title, author, publisher, genre...'
  },
  videogames: {
    name: 'Videogames', slot: 2, doing: 'PLAYING',
    creator: { label: 'DEVELOPER', placeholder: 'Team Cherry' },
    extra:   { label: 'PLATFORM', placeholder: 'PC' },
    examples: { title: 'Hollow Knight', genres: 'Metroidvania, Indie', year: 2017 },
    search: 'Title, developer, platform, genre...'
  },
  anything: {
    name: 'Anything', slot: 1, doing: 'IN PROGRESS',
    creator: { label: 'CREATOR', placeholder: 'Dan Carlin' },
    extra:   { label: 'TYPE', placeholder: 'Podcast' },
    examples: { title: 'Hardcore History', genres: 'History, Longform', year: 2006 },
    search: 'Title, creator, type, genre...'
  }
};

/* Estado de cada entrada, en el orden en que aparece en el formulario y los filtros:
     progress   en curso: toma el nombre de la sección (doing): PLAYING, READING, WATCHING...
     completed  terminado
     planned    pendiente, lo quieres ver/leer/jugar más adelante
     dropped    abandonado: lo empezaste y lo dejaste sin terminar
   Una sección puede ponerles otros nombres con "labels" (Music lo hace). */
Artchive.STATUSES = ['progress', 'completed', 'planned', 'dropped'];
Artchive.statusLabel = (def, status) => {
  if (!Artchive.STATUSES.includes(status)) status = 'completed';
  if (def && def.labels && def.labels[status]) return def.labels[status];
  if (status === 'progress') return (def && def.doing) || 'IN PROGRESS';
  return { completed: 'COMPLETED', planned: 'PLANNED', dropped: 'DROPPED' }[status];
};
