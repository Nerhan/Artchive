# ARTCHIVE

Archivo personal de todo lo que veo, escucho, leo y juego, con estética de terminal retro (fósforo verde).

Tiene 8 secciones: **Music, Films, Series, Anime, Manga, Books, Videogames y Anything**. Cada entrada tiene portada, creador, géneros, año, nota de 0 a 5, estado (en curso, terminado, pendiente o abandonado) y comentarios. Cada sección tiene también su página de estadísticas.

## Dos versiones

| Versión | Dónde está | Datos |
|---|---|---|
| **Con base de datos** | rama `main` (esta) | En **Supabase**, con login. Se guarda solo, desde cualquier dispositivo. |
| **Sin base de datos** | rama `static` y release `v1.0-static` | En `js/data.js`, se guarda con Ctrl+S. Funciona sin internet. |

Lo de abajo es de la versión **con base de datos**. La otra tiene su propio README en la rama `static`.

## Cómo funciona

HTML, CSS y JavaScript sin nada que instalar ni compilar. Los datos viven en [Supabase](https://supabase.com) (tabla `entries`).

- **Es privado.** Al abrir la página, la pantalla de arranque pide **USER** (correo) y **PASSWORD**. Sin eso no se ve nada.
- **La sesión se recuerda** en cada navegador hasta pulsar **LOGOUT** (abajo a la derecha en la portada).
- **Cada cambio se guarda solo** al instante. Si algo falla (sin internet, proyecto pausado), aparece un aviso en rojo y no se pierde nada de lo que había.
- **Copia de seguridad:** **Ctrl+S** descarga `artchive-backup-AAAA-MM-DD.js` con todo. El plan gratis de Supabase no hace copias, así que conviene bajar una de vez en cuando. Ese archivo sirve tal cual como `js/data.js` de la versión sin base de datos.

> El plan gratis de Supabase **pausa el proyecto tras 7 días sin uso**. Si la página dice que no puede cargar el archivo, entra a supabase.com y pulsa *Restore project*.

### Seguridad

`js/config.js` tiene la dirección del proyecto y la **publishable key**. Las dos son públicas a propósito, y por sí solas no dejan ver ni tocar nada.

Quién puede leer y escribir lo decide la base de datos con **RLS** (Row Level Security): cada entrada guarda de quién es, y solo su dueño, con la sesión iniciada, puede verla o cambiarla. Además, el registro de cuentas nuevas está cerrado.

**Nunca** pongas en el código la clave secreta (`sb_secret_...` / `service_role`).

### Montarlo desde cero

1. Crea un proyecto en Supabase.
2. En **Authentication → Users → Add user**, crea tu usuario (marca *Auto Confirm User*).
3. En **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up*.
4. Pega [`supabase/schema.sql`](supabase/schema.sql) en el **SQL Editor** y dale **Run**.
5. Pon tu Project URL y tu publishable key en `js/config.js`.
6. Publica la carpeta como sitio estático (Render, Netlify, Cloudflare Pages, GitHub Pages...), o abre `index.html` con doble clic.

## Atajos

| Tecla | Dónde | Qué hace |
|---|---|---|
| `Ctrl+S` | en todas | descarga una copia de seguridad |
| `M` | en todas | sonido sí / no |
| `Espacio` o doble clic en el fondo | portada | detiene los nodos / los vuelve a girar |
| Arrastrar | portada | gira la cámara |
| `/` | sección | ir al buscador |
| `N` | sección | nueva entrada |
| `Esc` | sección | volver a la portada |
| `←` `→` | pestañas RECORDS / STATS | cambiar de pestaña |

Cualquier tecla o clic acelera la pantalla de arranque (el login no se salta).

## Personalizar

- **Arte ASCII del globo** → `js/ascii-art.js`. Pega tu dibujo entre las dos comillas invertidas `` ` ``. Las reglas están escritas arriba del archivo.
- **Secciones** (nombre, orden en la órbita, nombres de los campos y de los estados) → `js/categories.js`. Si agregas una sección ahí, aparece sola como nodo nuevo.
- **Colores y tipografías** → `css/base.css`, al principio (`:root`).

## Archivos

```
index.html          la página (es una sola: #/ portada, #/music, #/films...)
favicon.svg         icono de la pestaña (fijo; js/favicon.js lo anima)
css/
  base.css          colores, tipografías, forma angular, botones, ventanas, cursor, arranque
  home.css          portada: órbitas, nodos y globo
  archive.css       secciones: tarjetas, filtros, estados y estadísticas
supabase/
  schema.sql        tabla y reglas de seguridad de la base de datos
js/
  config.js         dirección del proyecto de Supabase y clave pública
  db.js             sesión (login / logout) y lectura y escritura en la base de datos
  vendor/supabase.js  librería oficial de Supabase (copia local)
  categories.js     las 8 secciones y los estados
  ascii-art.js      dibujo del globo
  library.js        las entradas en memoria, sincronizadas con la base de datos
  app.js            navegación, copia de seguridad, logout y atajos
  orbit.js          portada 3D (órbitas, nodos, globo ASCII)
  archive.js        secciones: tarjetas, filtros, formulario y ficha
  stats.js          estadísticas de cada sección
  boot.js           pantalla de arranque, login y carga del archivo
  covers.js         portadas generadas cuando no hay imagen
  cover-font.js     tipografía incrustada para esas portadas
  cursor.js         cursor de mira
  sound.js          sonidos sintetizados (sin archivos de audio)
  stars.js          fondo de estrellas de las secciones
  favicon.js        icono animado
  ui.js             utilidades: avisos, listas desplegables, texto que se decodifica
fonts/              tipografías y sus licencias
```

## Créditos

- [supabase-js](https://github.com/supabase/supabase-js) — licencia MIT.

Tipografías bajo licencia [SIL Open Font License 1.1](https://openfontlicense.org) (los textos de licencia están en `fonts/`):

- [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) — The Chakra Petch Project Authors
- [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono) — Carrois Type Design, Ralph du Carrois
- [Michroma](https://fonts.google.com/specimen/Michroma) — The Michroma Project Authors
