// Bilder der Cornerstone-Artikel aus Original + Reglerwerten (tools/blog/cornerstone-media.json), Runde 15, 22.11.2026.
// Entscheidung (Marc nicht erreichbar, pragmatisch): Die Originale liegen auf dem FlyingStars-Drive (bis 8192 px, mehrere MB
// je Foto) und kommen nicht ins Repo. Das Werkzeug lädt sie, rechnet und legt die fertigen, kleinen Dateien nach
// public/media/blog/<slug>/ (wie die übrigen Seitenmedien unter public/media/<thema>/). Der Build braucht so kein Netz;
// das Rezept bleibt nachvollziehbar und jederzeit neu rechenbar.
//
// Je Artikel: Titelbild im Lichtraster (Grund eingebrannt) als AVIF + WebP 1600 × 800 für den Artikelkopf, dazu JPG in 16:9,
// 4:3 und 1:1 für og:image und Article-Structured-Data (27-blog-bilder-2026-11-21/seo-interaktive-grafiken.md, Punkte 3 und 4).
// Fotos im Text als WebP. Dazu einmal für alle Artikel die FlyingStars-Logo-Formation (Formations-JSON + Poster).
//
//   node tools/blog/cornerstone-media.mjs            alle Artikel und die Formation
//   node tools/blog/cornerstone-media.mjs <slug>     nur ein Artikel
const netFetch = globalThis.fetch; // show-node-env ersetzt fetch durch Lesen aus public/
globalThis.location ??= { pathname: '/' };
await import('../../scripts/show-node-env.mjs');
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPoints, gridSize, rasterSvg, DEFAULTS } from '../labor/lichtraster.mjs';

const recipe = JSON.parse(readFileSync(new URL('./cornerstone-media.json', import.meta.url), 'utf8'));
const only = process.argv[2];
const CACHE = join(tmpdir(), 'fs-blog-artikel-fotos');
mkdirSync(CACHE, { recursive: true });
const outDir = (slug) => { const u = new URL(`../../public/media/blog/${slug}/`, import.meta.url); mkdirSync(u, { recursive: true }); return u; };

async function photo(n, drive) {
  const file = join(CACHE, `${n}.jpg`);
  if (!existsSync(file)) {
    const r = await netFetch(`https://drive.google.com/uc?export=download&id=${drive}`);
    if (!r.ok) throw new Error(`Foto ${n}: HTTP ${r.status}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return sharp(readFileSync(file)).rotate().resize(3200, 3200, { fit: 'inside' }).toBuffer();
}
/** Lichtraster als Rastergrafik (PNG-Puffer) in der Zielgröße */
async function lichtraster(src, width, height, { position = 'attention', ...opts }) {
  const values = { ...DEFAULTS, ...opts };
  const { sampleWidth, sampleHeight } = gridSize(values.cellSize, width, height);
  const raw = await sharp(src).resize(sampleWidth, sampleHeight, { fit: 'cover', position }).greyscale().raw().toBuffer();
  return sharp(Buffer.from(rasterSvg(createPoints(raw, { ...values, width, height, channels: 1 }), width, height))).png().toBuffer();
}

for (const [slug, a] of Object.entries(recipe.articles)) {
  if (only && only !== slug && only !== 'formation') continue;
  if (only === 'formation') break;
  const out = outDir(slug);
  const src = await photo(a.cover.photo, a.cover.drive);
  const head = await lichtraster(src, 1600, 800, { position: a.cover.position, ...a.cover.lichtraster });
  await sharp(head).avif({ quality: 55, effort: 6 }).toFile(new URL('titel.avif', out).pathname);
  await sharp(head).webp({ quality: 74 }).toFile(new URL('titel.webp', out).pathname);
  for (const [name, w, h] of [['titel-16x9', 1280, 720], ['titel-4x3', 1200, 900], ['titel-1x1', 1200, 1200]]) {
    await sharp(await lichtraster(src, w, h, { position: a.cover.position, ...a.cover.lichtraster })).jpeg({ quality: 82, mozjpeg: true }).toFile(new URL(`${name}.jpg`, out).pathname);
  }
  for (const p of a.photos) {
    await sharp(await photo(p.photo, p.drive)).resize(p.width, p.height, { fit: 'cover', position: p.position ?? 'attention' }).webp({ quality: 78 }).toFile(new URL(`${p.name}.webp`, out).pathname);
  }
  console.log('Artikel', slug, 'Titelbild + Social + Fotos', a.photos.length);
}

// ---------- Logo-Formation (alle Artikel): weniger Drohnen als im Prototyp (Marc: „ein bisschen zu voll“) ----------
if (!only || only === 'formation') {
  const { logoPoints } = await import('../../src/scripts/show-teaser.js');
  const { lettering } = await import('../../src/scripts/scenes/text.js');
  const FS_GRAD = [[255, 158, 41], [219, 100, 232], [51, 237, 242]];
  const gradAt = (u) => { const t = Math.max(0, Math.min(1, u)) * 2, i = Math.min(1, Math.floor(t)), f = t - i; return FS_GRAD[i].map((v, c) => Math.round(v + (FS_GRAD[i + 1][c] - v) * f)); };
  const mark = logoPoints(recipe.formation.mark).map(([x, y, , r, g, b]) => [x * 0.6, y * 0.6 + 0.42, r, g, b]);
  const text = await lettering('FlyingStars', 'print', recipe.formation.text, 1.7);
  const top = Math.max(...text.map((p) => p[1])), x0 = Math.min(...text.map((p) => p[0])), x1 = Math.max(...text.map((p) => p[0]));
  const word = text.map(([x, y]) => [x, y - top - 0.34, ...gradAt((x - x0) / (x1 - x0 || 1))]);
  const all = [...mark, ...word];
  const mx = Math.max(...all.map((d) => Math.abs(d[0])), ...all.map((d) => Math.abs(d[1])));
  const cy = (Math.max(...all.map((d) => d[1])) + Math.min(...all.map((d) => d[1]))) / 2;
  const r4 = (v) => Math.round(v * 10000) / 10000;
  const dots = all.map(([x, y, r, g, b]) => [r4(x / mx), r4((y - cy) / mx), r, g, b, 1]);
  const xs = dots.map((d) => d[0]), ys = dots.map((d) => d[1]);
  const aspect = r4((Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys)));
  const out = outDir('').pathname;
  writeFileSync(join(out, 'flyingstars-formation.json'), JSON.stringify({ source: 'show', name: 'FlyingStars-Logo mit Schriftzug', drones: dots.length, aspect, dots }));
  // Poster 1200 × 600: wie die Engine auf einer nicht absolut liegenden Fläche (formation-play.js: 86 % × 80 %), durchsichtig
  const W = 1200, H = 600, bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys), s = Math.min(W * 0.86 / bw, H * 0.8 / bh);
  const ox = W / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * s, oy = H / 2 + ((Math.max(...ys) + Math.min(...ys)) / 2) * s, core = Math.max(2, s * 0.0105);
  const ids = [...new Set(dots.map(([, , r, g, b]) => `${r}-${g}-${b}`))];
  const defs = ids.map((id) => { const c = id.split('-').join(','); return `<radialGradient id="g${id}"><stop offset="0" stop-color="rgb(${c})" stop-opacity="0.2"/><stop offset="0.35" stop-color="rgb(${c})" stop-opacity="0.06"/><stop offset="1" stop-color="rgb(${c})" stop-opacity="0"/></radialGradient>`; });
  const glow = dots.map(([x, y, r, g, b]) => `<circle cx="${(ox + x * s).toFixed(1)}" cy="${(oy - y * s).toFixed(1)}" r="${(core * 5 + 3).toFixed(1)}" fill="url(#g${r}-${g}-${b})"/>`);
  const cores = dots.map(([x, y, r, g, b]) => `<circle cx="${(ox + x * s).toFixed(1)}" cy="${(oy - y * s).toFixed(1)}" r="${core.toFixed(2)}" fill="rgb(${Math.min(255, r + 25)},${Math.min(255, g + 25)},${Math.min(255, b + 25)})"/>`);
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs.join('')}</defs>${glow.join('')}${cores.join('')}</svg>`)).webp({ quality: 82, alphaQuality: 90 }).toFile(join(out, 'flyingstars-formation.webp'));
  console.log('Formation', dots.length, 'Drohnen, Seitenverhältnis', aspect);
}
