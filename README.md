# ARTCHIVE

Archivo personal de todo lo que veo, escucho, leo y juego, con estética de terminal retro (fósforo verde).

Tiene 8 secciones: **Music, Films, Series, Anime, Manga, Books, Videogames y Anything**. Cada entrada tiene portada, creador, géneros, año, nota de 0 a 5, estado (en curso, terminado, pendiente o abandonado) y comentarios. Cada sección tiene también su página de estadísticas.

Es una página **estática**: HTML, CSS y JavaScript sin nada que instalar, sin servidor y sin base de datos.

## Cómo abrirlo

Doble clic en `index.html`. Se abre en el navegador y funciona sin internet.

También se puede publicar tal cual en GitHub Pages, Netlify, Render (Static Site) o Cloudflare Pages.

## Dónde se guardan los datos

Todo vive en **`js/data.js`**.

1. Agrega, edita o borra entradas desde la página.
2. Pulsa **Ctrl+S**: se descarga un `data.js` nuevo.
3. Reemplaza `js/data.js` por el descargado.

> Lo que cambies en la página queda solo en la pestaña abierta. **Si la cierras o la recargas sin Ctrl+S, se pierde.**

Para que la copia de GitHub quede al día, después del paso 3:

```bash
git add js/data.js
git commit -m "Actualizar colección"
git push
```

## Atajos

| Tecla | Dónde | Qué hace |
|---|---|---|
| `Ctrl+S` | en todas | descarga `data.js` con tus cambios |
| `M` | en todas | sonido sí / no |
| `Espacio` o doble clic en el fondo | portada | detiene los nodos / los vuelve a girar |
| Arrastrar | portada | gira la cámara |
| `/` | sección | ir al buscador |
| `N` | sección | nueva entrada |
| `Esc` | sección | volver a la portada |
| `←` `→` | pestañas RECORDS / STATS | cambiar de pestaña |

Cualquier tecla o clic se salta la pantalla de arranque.

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
js/
  data.js           TU COLECCIÓN
  categories.js     las 8 secciones y los estados
  ascii-art.js      dibujo del globo
  library.js        lee, valida y guarda las entradas
  app.js            navegación, Ctrl+S y atajos
  orbit.js          portada 3D (órbitas, nodos, globo ASCII)
  archive.js        secciones: tarjetas, filtros, formulario y ficha
  stats.js          estadísticas de cada sección
  boot.js           pantalla de arranque
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

Tipografías bajo licencia [SIL Open Font License 1.1](https://openfontlicense.org) (los textos de licencia están en `fonts/`):

- [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) — The Chakra Petch Project Authors
- [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono) — Carrois Type Design, Ralph du Carrois
- [Michroma](https://fonts.google.com/specimen/Michroma) — The Michroma Project Authors
