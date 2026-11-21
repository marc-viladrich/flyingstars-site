// Labor „Blogartikel-Prototyp“ (Runde 15, 21.11.2026): rechnet die Bilder und die Logo-Formation für
// /labor/blog-artikel/wie-programmiert-man-eine-drohnenshow/ vor. Nur für das Labor.
//
// 1. Eigene FlyingStars-Fotos (Drive-Sichtung im Kundenordner 27-blog-bilder-2026-11-21/foto-auswahl) im Lichtraster
//    bzw. als Punkt-Reveal, mit dem Rezept aus Marcs Bildeffekt-Labor (./lichtraster.mjs). Beides zur Build-Zeit mit
//    sharp, kein CSS-filter. Punkt-Reveal für Tagbilder mit vielen Mitteltönen, die im Lichtraster zu Brei werden.
// 2. Das FlyingStars-Logo mit Schriftzug als Drohnenformation (dieselbe Komposition wie die Marken-Stufe im Startseiten-
//    Teaser, show-teaser.js logoBeat bei 600 Drohnen) im Format der Fallstudien-Formation (case.js: dots [x, y, r, g, b, v]),
//    dazu ein Standbild als Poster für HTML, Suche und reduzierte Bewegung.
//
//   node tools/labor/blog-artikel.mjs
const netFetch = globalThis.fetch; // show-node-env ersetzt fetch durch Lesen aus public/
globalThis.location ??= { pathname: '/' }; // show-teaser.js liest die Sprache aus dem Pfad
await import('../../scripts/show-node-env.mjs');
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPoints, gridSize, rasterSvg, GROUND, DEFAULTS } from './lichtraster.mjs';

const OUT = new URL('../../public/media/labor/artikel/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const CACHE = join(tmpdir(), 'fs-blog-artikel-fotos');
mkdirSync(CACHE, { recursive: true });

/** Fotos aus der Drive-Sichtung (Nummer = Kontaktbogen-Nummer in foto-auswahl/README.md) */
const PHOTOS = {
  '058': '1NNwPaP-i6J32jDM4hteSZ30CvnNEaKs_', // Person neben den leuchtenden Drohnenstapeln, Nacht
  '012': '1PGW9DpYEPurq3NuRQgJ9hruSEWseIXin', // Startunterlagen auf Pflaster, warmes Seitenlicht
  '006': '1VwRRfSEX5IShrCoDSZwbmXiJuhmJ7PnP', // Zwei Personen am Stativ, Gegenlicht
  '018': '1XGQ_NPDn4PD2utmT1SDyDZ5unTMbdTCw', // Blüte über Nieheim
  '034': '1VgjG974Mh0dgrp9Ujfj3d5lHqQZOQ5uS', // Doppelherz über Nieheim
  '030': '1WQr3zoWXZXfXkGI1QvIyQyP0LIVpO0yq', // Schriftzug NIEHEIM, Nacht
};
async function photo(n) {
  const file = join(CACHE, `${n}.jpg`);
  if (!existsSync(file)) {
    const r = await netFetch(`https://drive.google.com/uc?export=download&id=${PHOTOS[n]}`);
    if (!r.ok) throw new Error(`Foto ${n}: HTTP ${r.status}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  // EXIF-Drehung anwenden, dann eine handliche Arbeitskopie (die Originale haben bis 8192 px)
  return sharp(readFileSync(file)).rotate().resize(3200, 3200, { fit: 'inside' }).toBuffer();
}

/** Lichtraster nach dem Labor-Rezept: Graustufen in Abtastgröße per Sharp-Attention-Zuschnitt, Punkte, SVG, WebP. */
async function lichtraster(n, name, { width = 1600, height = 1000, position = 'attention', ...opts } = {}) {
  const values = { ...DEFAULTS, ...opts };
  const { sampleWidth, sampleHeight } = gridSize(values.cellSize, width, height);
  const raw = await sharp(await photo(n)).resize(sampleWidth, sampleHeight, { fit: 'cover', position }).greyscale().raw().toBuffer();
  const svg = rasterSvg(createPoints(raw, { ...values, width, height, channels: 1 }), width, height);
  await sharp(Buffer.from(svg)).webp({ quality: 72 }).toFile(new URL(`${name}.webp`, OUT).pathname);
  console.log('Lichtraster', name, `${width}×${height}`);
}

/** Normales Foto (Bilder im Text, Runde 15 Prototyp 2: Marc „normale Fotos, gern mit Punktraster-Hintergrund als Bühne“) */
async function plain(n, name, { width, height, position = 'attention' }) {
  await sharp(await photo(n)).resize(width, height, { fit: 'cover', position }).webp({ quality: 78 }).toFile(new URL(`${name}.webp`, OUT).pathname);
  console.log('Foto', name, `${width}×${height}`);
}

/** Punkt-Reveal: das Foto in seinen Farben, nur durch die Kreise des Rasters sichtbar, auf dem Seitengrund. */
async function reveal(n, name, { width = 1600, height = 1000, position = 'attention', ...opts } = {}) {
  const values = { ...DEFAULTS, ...opts };
  const pts = createPoints(null, { ...values, effect: 'punkt-reveal', width, height });
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${pts.map(({ x, y, r }) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('')}</svg>`;
  const img = await sharp(await photo(n)).resize(width, height, { fit: 'cover', position }).ensureAlpha().composite([{ input: Buffer.from(mask), blend: 'dest-in' }]).png().toBuffer();
  await sharp(img).flatten({ background: GROUND }).webp({ quality: 76 }).toFile(new URL(`${name}.webp`, OUT).pathname);
  console.log('Punkt-Reveal', name, `${width}×${height}`);
}

// Titelbild (Prototyp 2, Marc: „aktuell ist nicht erkennbar, was es zeigt“): Nachtformation statt Arbeitsszene. Der
// Schriftzug NIEHEIM ist im Lichtraster klar lesbar und zeigt, was Programmierung am Ende ergibt. Gamma und Schwelle höher
// als im Rezept-Standard, damit der Himmel ruhig bleibt und nur Schrift und Horizont leuchten. 2 : 1 wie der Titelkopf.
await lichtraster('030', 'titel-030', { width: 1600, height: 800, gamma: 1.8, threshold: 0.08, position: 'centre' });
// Bilder im Text: normale Fotos (kein Lichtraster mehr, Marc: „zu viel“)
await plain('012', 'foto-012', { width: 1600, height: 1000 });
await plain('006', 'foto-006', { width: 960, height: 1200 });
await plain('018', 'foto-018', { width: 960, height: 1200, position: 'centre' });
await plain('034', 'foto-034', { width: 960, height: 1200, position: 'centre' });
void reveal; // Punkt-Reveal bleibt als Rezept für andere Artikel verfügbar

// ---------- Logo-Formation ----------
const { logoPoints } = await import('../../src/scripts/show-teaser.js');
const { lettering } = await import('../../src/scripts/scenes/text.js');
const FS_GRAD = [[255, 158, 41], [219, 100, 232], [51, 237, 242]];
const gradAt = (u) => { const t = Math.max(0, Math.min(1, u)) * 2, i = Math.min(1, Math.floor(t)), f = t - i; return FS_GRAD[i].map((v, c) => Math.round(v + (FS_GRAD[i + 1][c] - v) * f)); };
// wie show-teaser.js logoBeat(600): Logo oben verkleinert, darunter der Schriftzug im FlyingStars-Verlauf
const mark = logoPoints(300).map(([x, y, , r, g, b]) => [x * 0.6, y * 0.6 + 0.42, r, g, b]);
const text = await lettering('FlyingStars', 'print', 300, 1.7);
const top = Math.max(...text.map((p) => p[1])), x0 = Math.min(...text.map((p) => p[0])), x1 = Math.max(...text.map((p) => p[0]));
const word = text.map(([x, y]) => [x, y - top - 0.34, ...gradAt((x - x0) / (x1 - x0 || 1))]);
const all = [...mark, ...word];
const mx = Math.max(...all.map((d) => Math.abs(d[0])), ...all.map((d) => Math.abs(d[1])));
const cy = (Math.max(...all.map((d) => d[1])) + Math.min(...all.map((d) => d[1]))) / 2;
const r4 = (v) => Math.round(v * 10000) / 10000;
const dots = all.map(([x, y, r, g, b]) => [r4(x / mx), r4((y - cy) / mx), r, g, b, 1]);
const xs = dots.map((d) => d[0]), ys = dots.map((d) => d[1]);
const aspect = r4((Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys)));
writeFileSync(new URL('flyingstars-formation.json', OUT), JSON.stringify({ source: 'show', name: 'FlyingStars-Logo mit Schriftzug', drones: dots.length, aspect, dots }));
console.log('Formation', dots.length, 'Drohnen, Seitenverhältnis', aspect);

// Poster 1200 × 600 (Prototyp 2: ruhige Formation im Textfluss): fertige Formation, zentriert und eingepasst wie die Engine
// auf einer nicht absolut liegenden Fläche (formation-play.js: 86 % × 80 %), durchsichtiger Grund, damit kein Kasten entsteht
{
  const W = 1200, H = 600, bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys), s = Math.min(W * 0.86 / bw, H * 0.8 / bh);
  const ox = W / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * s, oy = H / 2 + ((Math.max(...ys) + Math.min(...ys)) / 2) * s, core = Math.max(1.6, s * 0.0105);
  const glow = dots.map(([x, y, r, g, b]) => `<circle cx="${(ox + x * s).toFixed(1)}" cy="${(oy - y * s).toFixed(1)}" r="${(core * 5 + 3).toFixed(1)}" fill="url(#g${r}-${g}-${b})"/>`);
  const ids = [...new Set(dots.map(([, , r, g, b]) => `${r}-${g}-${b}`))];
  const defs = ids.map((id) => { const c = id.split('-').join(','); return `<radialGradient id="g${id}"><stop offset="0" stop-color="rgb(${c})" stop-opacity="0.2"/><stop offset="0.35" stop-color="rgb(${c})" stop-opacity="0.06"/><stop offset="1" stop-color="rgb(${c})" stop-opacity="0"/></radialGradient>`; });
  const cores = dots.map(([x, y, r, g, b]) => `<circle cx="${(ox + x * s).toFixed(1)}" cy="${(oy - y * s).toFixed(1)}" r="${core.toFixed(2)}" fill="rgb(${Math.min(255, r + 25)},${Math.min(255, g + 25)},${Math.min(255, b + 25)})"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs.join('')}</defs>${glow.join('')}${cores.join('')}</svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 82, alphaQuality: 90 }).toFile(new URL('flyingstars-formation.webp', OUT).pathname);
  console.log('Poster flyingstars-formation.webp');
}
