// Labor „Blogbilder ohne Stock“ (Runde 15, 21.11.2026): rechnet alle Titelbild-Varianten der Vergleichsseite
// /labor/blog-bilder/ vor. Nur für das Labor, nicht für den Blog.
//
// 1. Drohnenformationen als Standbild: Katalogmotive (scenes/catalog.js) und das Feuerwerk des Konfigurators
//    (scenes/winter.js → fireworkStory, Akt „Finale“) zu einem festen Zeitpunkt ausgewertet, leicht gedreht und
//    perspektivisch projiziert. Ausgabe: Punkte mit Größe und Helligkeit, Farbe wählt die Seite.
// 2. Drohnenschrift: Stichwort je Artikel mit dem Textplaner des Konfigurators (text-formation.js).
// 3. Fotos mit Marken-Behandlung, mit sharp vorgerechnet (kein CSS-filter, Safari 26 wendet ihn auf <img> nicht
//    zuverlässig an): Lichtpunkt-Raster im Logoverlauf und Duoton in Seitenfarben.
//
//   node tools/labor/blog-bilder.mjs
const netFetch = globalThis.fetch; // show-node-env ersetzt fetch durch Lesen aus public/
await import('../../scripts/show-node-env.mjs');
import sharp from 'sharp';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const { catalogScene } = await import('../../src/scripts/scenes/catalog.js');
const { BUILDERS } = await import('../../src/scripts/scenes/index.js');
const { loadTextEngine, textFormation } = await import('../../src/scripts/text-formation.js');

const OUT_DATA = new URL('../../src/components/labor/blog-bilder-daten.json', import.meta.url);
const OUT_MEDIA = new URL('../../public/media/labor/', import.meta.url);
mkdirSync(OUT_MEDIA, { recursive: true });
mkdirSync(new URL('.', OUT_DATA), { recursive: true });

const r3 = (v) => Math.round(v * 1000) / 1000 || 0;

/** Ein Bild der Show zum Zeitpunkt t: Lage nach live(), Helligkeit o[3]; dunkle Reserve fällt weg. */
function frame(beat, t) {
  const out = [], o = [0, 0, 0, 1];
  beat.pts.forEach((p, j) => {
    o[0] = p[0]; o[1] = p[1]; o[2] = p[2] || 0; o[3] = 1;
    if (beat.live) beat.live(p, j, t, o);
    if (o[3] > 0.08) out.push([o[0], o[1], o[2], Math.min(1.6, o[3]), p[3], p[4], p[5]]);
  });
  return out;
}

/** Leichte Drehung (Gieren, Nicken) und Perspektive, dann auf [-1, 1] eingepasst; y zeigt im Ergebnis nach unten. */
function project(pts, { yaw = 0, pitch = 0, dist = 4.5, flipY = false } = {}) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), zs = pts.map((p) => p[2]);
  const mid = (a) => (Math.min(...a) + Math.max(...a)) / 2, span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const cx = mid(xs), cy = mid(ys), cz = mid(zs), k = 2 / span;
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const P = pts.map(([x, y, z, a, r, g, b]) => {
    let X = (x - cx) * k, Y = (y - cy) * k * (flipY ? -1 : 1), Z = (z - cz) * k;
    [X, Z] = [X * cyw + Z * syw, -X * syw + Z * cyw];
    [Y, Z] = [Y * cp - Z * sp, Y * sp + Z * cp];
    const s = dist / (dist - Z); // näher = größer und heller
    return [X * s, -Y * s, s, a, r, g, b];
  });
  const px = P.map((p) => p[0]), py = P.map((p) => p[1]);
  const w = Math.max(...px) - Math.min(...px), h = Math.max(...py) - Math.min(...py), m = 2 / Math.max(w, h), ox = mid(px), oy = mid(py);
  return { aspect: r3(w / h), pts: P.map(([x, y, s, a, r, g, b]) => [r3((x - ox) * m), r3((y - oy) * m), r3(s), r3(a), r, g, b]) };
}

// ---------- 1. Formationen ----------
const formations = {};
async function catalogStill(id, key, tier, n, t, view) {
  const s = await catalogScene(key, tier, n, '');
  formations[id] = { source: `Katalog: ${key}`, ...project(frame(s.beats[0], t), view) };
}
await catalogStill('zahnraeder', 'zahnraeder', 'SPARK', 150, 1.2, { yaw: -0.42, pitch: 0.08 });
await catalogStill('atom', 'atom', 'SPARK', 162, 0.6, { yaw: 0.35, pitch: 0.5 });
{
  // Feuerwerk-Finale (alle Sterne zugleich), kurz nach dem Aufblühen
  const fw = BUILDERS.fireworkStory(300, '');
  formations.feuerwerk = { source: 'Konfigurator: Feuerwerk, Finale', ...project(frame(fw.beats[3], 1.1), { yaw: -0.18, pitch: 0.05 }) };
}
{
  // Startfeld: 12 × 8 Drohnen im 2-m-Raster wie vor dem Abheben, eine Reihe steigt schon auf (Testflug)
  const pts = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
    const lift = r === 3 && c >= 3 && c <= 8 ? 2.4 + 0.5 * Math.sin((c - 3) / 5 * Math.PI) : 0;
    pts.push([c * 2 - 11, lift, r * 2 - 7, lift ? 1.2 : 0.75, 246, 241, 232]);
  }
  formations.startfeld = { source: 'Startraster 12 × 8, eigene Geometrie', ...project(pts, { yaw: -0.22, pitch: 0.95, dist: 5 }) };
}

// ---------- 2. Drohnenschrift ----------
await loadTextEngine();
const texts = {};
for (const [id, word, n] of [['technik', 'TECHNIK', 230], ['ohne-knall', 'OHNE KNALL', 300], ['code', 'CODE', 160], ['testflug', 'TESTFLUG', 250]]) {
  const f = textFormation(word, n);
  if (!f || !f.pts.length) throw new Error(`Keine Formation für ${word}`);
  texts[id] = { word, drones: f.pts.length, style: f.style, ...project(f.pts.map((p) => [p[0], p[1], 0, 1, 246, 241, 232]), { flipY: false }) };
}

writeFileSync(OUT_DATA, JSON.stringify({ formations, texts }));
console.log('Formationen', Object.keys(formations).join(', '), '· Schrift', Object.keys(texts).join(', '));

// ---------- 3. Fotos ----------
const PHOTOS = [
  ['funktioniert', 'https://flyingstars.art/wp-content/uploads/2025/01/lehrer-zeigt-wie-drohnenshow-funktioniert.jpg'],
  ['feuerwerk', 'https://flyingstars.art/wp-content/uploads/2025/03/drohnen-feuerwerk-alternative.jpg'],
  ['programmierung', 'https://flyingstars.art/wp-content/uploads/2025/05/drohnenprogrammierung-1.jpg'],
  // Testflug hat heute kein Titelbild: eigenes Showfoto aus der Galerie
  ['testflug', 'public/media/galerie/willkommen/abendhimmel-1-1600.webp'],
];
const W = 1600, H = 1000; // 16:10, Karte (16:9) und Artikelkopf (2:1) schneiden per object-fit
const GROUND = [15, 13, 12];
const GRAD = [[0, [255, 158, 41]], [0.5, [219, 100, 232]], [1, [51, 237, 242]]]; // --grad
const at = (stops, u) => { u = Math.max(0, Math.min(1, u)); for (let i = 1; i < stops.length; i++) if (u <= stops[i][0]) { const [u0, a] = stops[i - 1], [u1, b] = stops[i], k = (u - u0) / (u1 - u0); return a.map((v, j) => Math.round(v + (b[j] - v) * k)); } return stops.at(-1)[1]; };
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

async function source(src) {
  if (src.startsWith('http')) { const r = await netFetch(src); if (!r.ok) throw new Error(`${src}: HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
  return readFileSync(new URL(`../../${src}`, import.meta.url));
}
/** Graustufen in Zielgröße, Kontrast auf 1.–99. Perzentil gespreizt (0..1). */
async function luma(buf, w, h) {
  const { data } = await sharp(buf).resize(w, h, { fit: 'cover', position: 'attention' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const sorted = Float32Array.from(data).sort(), lo = sorted[Math.floor(sorted.length * 0.01)], hi = sorted[Math.floor(sorted.length * 0.99)];
  return Float32Array.from(data, (v) => Math.max(0, Math.min(1, (v - lo) / Math.max(1, hi - lo))));
}

for (const [id, src] of PHOTOS) {
  const buf = await source(src);
  // a) Lichtpunkt-Raster: je Zelle ein Leuchtpunkt, Fläche nach Helligkeit, Farbe nach Logoverlauf (links Bernstein,
  //    rechts Cyan). Punkte, keine Quadrate: dieselbe Sprache wie die Drohnen.
  //    Je Zelle Mittelwert und Maximum aus 4 × 4 Abtastpunkten gemischt, sonst verschwinden einzelne Lichter (Drohnen
  //    am Nachthimmel) im Mittelwert.
  const C = 12, cols = Math.ceil(W / C), rows = Math.ceil(H / C), S = 4, L = await luma(buf, cols * S, rows * S);
  const cell = (x, y) => { let sum = 0, max = 0; for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const v = L[(y * S + j) * cols * S + x * S + i]; sum += v; max = Math.max(max, v); } return 0.5 * sum / (S * S) + 0.5 * max; };
  let dots = '';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const v = Math.pow(cell(x, y), 1.4);
    if (v < 0.04) continue;
    const r = (C / 2) * 0.96 * Math.sqrt(v), col = hex(at(GRAD, (x + y * 0.35) / (cols + rows * 0.35)));
    dots += `<circle cx="${x * C + C / 2}" cy="${y * C + C / 2}" r="${r.toFixed(2)}" fill="${col}" fill-opacity="${(0.45 + 0.55 * v).toFixed(2)}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${hex(GROUND)}"/>${dots}</svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 70 }).toFile(new URL(`raster-${id}.webp`, OUT_MEDIA).pathname);

  // b) Duoton: Schatten im Seitengrund, Mitten Orchidee, Lichter warmes Weiß mit Bernsteinstich (wie Fließtext und Akzent)
  const DUO = [[0, GROUND], [0.5, [128, 52, 140]], [0.82, [240, 150, 90]], [1, [250, 238, 220]]];
  const D = await luma(buf, W, H), rgb = Buffer.alloc(W * H * 3);
  for (let i = 0; i < D.length; i++) { const c = at(DUO, Math.pow(D[i], 1.1)); rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]; }
  await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 74 }).toFile(new URL(`duoton-${id}.webp`, OUT_MEDIA).pathname);
  console.log('Foto', id);
}
