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

/** Punkt-Reveal: das Foto in seinen Farben, nur durch die Kreise des Rasters sichtbar, auf dem Seitengrund. */
async function reveal(n, name, { width = 1600, height = 1000, position = 'attention', ...opts } = {}) {
  const values = { ...DEFAULTS, ...opts };
  const pts = createPoints(null, { ...values, effect: 'punkt-reveal', width, height });
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${pts.map(({ x, y, r }) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('')}</svg>`;
  const img = await sharp(await photo(n)).resize(width, height, { fit: 'cover', position }).ensureAlpha().composite([{ input: Buffer.from(mask), blend: 'dest-in' }]).png().toBuffer();
  await sharp(img).flatten({ background: GROUND }).webp({ quality: 76 }).toFile(new URL(`${name}.webp`, OUT).pathname);
  console.log('Punkt-Reveal', name, `${width}×${height}`);
}

// Titelbild: Nachtfoto, Lichtraster. Format 1600 × 1000 wie im Labor (Kopf 2:1 und Karte 16:9 schneiden per object-fit).
// Gamma höher als im Rezept-Standard: der Nebel um die Lampe würde sonst die ganze Fläche füllen, die Person verschwinden
await lichtraster('058', 'titel-058', { gamma: 2.2, peakMix: 0.3 });
// Erstes Bild im Text: Tagbild mit vielen Mitteltönen → Punkt-Reveal
await reveal('012', 'reveal-012', { cellSize: 11, pointSize: 0.98 });
// Bildleiter (quadratisch): vom Stativ am Tag zu zwei fertigen Formationen. Das Startraster bei Nacht (#010) fällt weg: im
// quadratischen Ausschnitt bleibt vom Feld nur ein schmales Band
await lichtraster('006', 'leiter-006', { width: 1000, height: 1000, cellSize: 11 });
await lichtraster('018', 'leiter-018', { width: 1000, height: 1000, cellSize: 11, position: 'centre' });
await lichtraster('034', 'leiter-034', { width: 1000, height: 1000, cellSize: 11, position: 'north' });

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

// Poster 1600 × 900: die fertige Formation, rechts der Mitte wie im breiten Layout (Text links darüber)
{
  const W = 1600, H = 900, s = Math.min(W * 0.5 / (Math.max(...xs) - Math.min(...xs)), H * 0.7 / (Math.max(...ys) - Math.min(...ys)));
  const ox = W * 0.66, oy = H * 0.46, core = Math.max(2.4, s * 0.0105);
  const glow = dots.map(([x, y, r, g, b]) => `<circle cx="${(ox + x * s).toFixed(1)}" cy="${(oy - y * s).toFixed(1)}" r="${(core * 4.5).toFixed(1)}" fill="url(#g${r}-${g}-${b})"/>`);
  const ids = [...new Set(dots.map(([, , r, g, b]) => `${r}-${g}-${b}`))];
  const defs = ids.map((id) => { const c = id.split('-').join(','); return `<radialGradient id="g${id}"><stop offset="0" stop-color="rgb(${c})" stop-opacity="0.22"/><stop offset="0.35" stop-color="rgb(${c})" stop-opacity="0.07"/><stop offset="1" stop-color="rgb(${c})" stop-opacity="0"/></radialGradient>`; });
  const cores = dots.map(([x, y, r, g, b]) => `<circle cx="${(ox + x * s).toFixed(1)}" cy="${(oy - y * s).toFixed(1)}" r="${core.toFixed(2)}" fill="rgb(${Math.min(255, r + 25)},${Math.min(255, g + 25)},${Math.min(255, b + 25)})"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="sky" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#13100e"/><stop offset="0.7" stop-color="#0a0807"/></radialGradient>${defs.join('')}</defs><rect width="100%" height="100%" fill="url(#sky)"/>${glow.join('')}${cores.join('')}</svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(new URL('flyingstars-formation.webp', OUT).pathname);
  console.log('Poster flyingstars-formation.webp');
}
