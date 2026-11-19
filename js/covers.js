/* ===== Artchive // portadas generadas =====
   Cuando una entrada no tiene imagen (o el enlace está roto) se dibuja una portada
   propia a partir de su título: el mismo título da siempre el mismo dibujo.
   Artchive.cover(item, cuadrada) -> data URI con un SVG.
*/
window.Artchive = window.Artchive || {};

Artchive.cover = (() => {
  const G = '#00ff66';
  // Letra de la portada (js/cover-font.js); si faltara, usa una monoespaciada del sistema
  const FONT_FACE = Artchive.COVER_FONT
    ? `<style>@font-face{font-family:'Cover';src:url(${Artchive.COVER_FONT}) format('woff2');font-weight:600}</style>`
    : '';
  const FONT_FAMILY = "Cover,'Share Tech Mono',ui-monospace,monospace";
  const cache = new Map();
  const xml = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Generador pseudoaleatorio con semilla (mulberry32)
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Parte el título en líneas de ancho máximo, cortando con "…" si no cabe
  function wrap(str, max, maxLines) {
    const lines = [];
    let line = '';
    for (const word of str.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length <= max) { line = next; continue; }
      if (line) lines.push(line);
      line = word;
    }
    if (line) lines.push(line);
    const out = lines.slice(0, maxLines).map(l => l.length > max ? l.slice(0, max - 1) + '…' : l);
    if (lines.length > maxLines) out[maxLines - 1] = out[maxLines - 1].slice(0, max - 1).replace(/…$/, '') + '…';
    return out;
  }

  const n = v => Math.round(v * 10) / 10;

  function blocks(rand, W, top, areaH) {
    const cols = 6, size = 30, gap = 6;
    const rows = Math.max(3, Math.floor((areaH + gap) / (size + gap)));
    const x0 = (W - (cols * size + (cols - 1) * gap)) / 2;
    const y0 = top + (areaH - (rows * size + (rows - 1) * gap)) / 2;
    let out = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols / 2; c++) {
        if (rand() < 0.42) continue;
        const o = n(0.2 + rand() * 0.8);
        const y = n(y0 + r * (size + gap));
        [c, cols - 1 - c].forEach(col => {
          out += `<rect x="${n(x0 + col * (size + gap))}" y="${y}" width="${size}" height="${size}" fill="${G}" opacity="${o}"/>`;
        });
      }
    }
    return out;
  }

  function orbits(rand, W, top, areaH) {
    const cx = W / 2, cy = top + areaH / 2;
    const maxR = Math.min(W / 2 - 34, areaH / 2 - 6);
    let out = `<circle cx="${cx}" cy="${cy}" r="${n(maxR * 0.16)}" fill="${G}"/>`;
    const rings = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < rings; i++) {
      const rx = maxR * (0.42 + (i / (rings - 1)) * 0.58);
      const ry = rx * (0.22 + rand() * 0.5);
      const rot = Math.floor(rand() * 180);
      const a = rand() * Math.PI * 2;
      out += `<g transform="rotate(${rot} ${cx} ${cy})">` +
        `<ellipse cx="${cx}" cy="${cy}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="${G}" stroke-width="1.5" opacity="${n(0.3 + rand() * 0.45)}"/>` +
        `<circle cx="${n(cx + Math.cos(a) * rx)}" cy="${n(cy + Math.sin(a) * ry)}" r="${n(3.5 + rand() * 3)}" fill="${G}"/></g>`;
    }
    return out;
  }

  function bars(rand, W, top, areaH) {
    const count = 15, gap = 5;
    const bw = (W - 68 - (count - 1) * gap) / count;
    const base = top + areaH;
    let out = '', level = 0.5;
    for (let i = 0; i < count; i++) {
      level = Math.min(1, Math.max(0.08, level + (rand() - 0.5) * 0.7));
      const h = areaH * level;
      out += `<rect x="${n(34 + i * (bw + gap))}" y="${n(base - h)}" width="${n(bw)}" height="${n(h)}" fill="${G}" opacity="${n(0.3 + level * 0.7)}"/>`;
    }
    return out;
  }

  return function cover(item, square) {
    const title = String(item.title || 'UNTITLED');
    const creator = String(item.creator || '');
    const key = `${square ? 's' : 'p'}|${title}|${creator}`;
    if (cache.has(key)) return cache.get(key);

    const W = 300, H = square ? 300 : 450;
    const seed = hash(`${title}|${creator}`.toLowerCase());
    const rand = rng(seed);
    const lines = wrap(title.toUpperCase(), 17, 2);
    const textH = 66 + lines.length * 24;       // franja inferior para el texto
    const top = 46, areaH = H - top - textH - 14;
    const art = [blocks, orbits, bars][seed % 3](rand, W, top, areaH);

    let y = H - textH + 28;
    const titleText = lines.map(l => {
      const t = `<text x="24" y="${y}" font-size="21" font-weight="600" letter-spacing=".5" fill="#eafff1">${xml(l)}</text>`;
      y += 24;
      return t;
    }).join('');
    y -= 2;
    const creatorText = creator
      ? `<text x="24" y="${y}" font-size="13" fill="${G}" opacity=".75">${xml(wrap(creator, 30, 1)[0])}</text>` : '';

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT_FAMILY}" font-weight="600">` +
      FONT_FACE +
      `<rect width="${W}" height="${H}" fill="#020805"/>` +
      // Marco con las mismas esquinas cortadas que el resto de la página
      `<path d="M24.5 10.5H${W - 10.5}V${H - 24.5}L${W - 24.5} ${H - 10.5}H10.5V24.5Z" fill="none" stroke="${G}" stroke-opacity=".35"/>` +
      `<text x="24" y="33" font-size="11" fill="${G}" opacity=".6">NO_COVER</text>` +
      `<text x="${W - 24}" y="33" font-size="11" fill="${G}" opacity=".6" text-anchor="end">#${seed.toString(16).toUpperCase().padStart(8, '0').slice(0, 6)}</text>` +
      art +
      `<line x1="24" y1="${H - textH - 6}" x2="${W - 24}" y2="${H - textH - 6}" stroke="${G}" stroke-opacity=".35" stroke-dasharray="3 4"/>` +
      titleText + creatorText +
      '</svg>';

    const uri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    cache.set(key, uri);
    return uri;
  };
})();
