// Drohnen-Formationen aus Bild, SVG oder Text: geteilt von Designsprache-Probe und Show-Konfigurator.
// Deterministisch: gleiche Quelle und Drohnenzahl ergeben immer dieselbe Formation.
// Rechnen im Web Worker (shape-worker.js / shape-core.js), Text über FlyingStars' Einstrich-Textplaner.
import { liftColor } from './shape-core.js';
export { liftColor };

// Hash 0..1, stabil je (a, b)
export function hash(a, b = 0) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Hilbert-Index für lokalitätserhaltende Reihenfolge (Zuordnung zweier Formationen, Lichtlauf)
function hilbert(x, y, n) {
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const t = x; x = y; y = t; }
  }
  return d;
}
export function hilbertSort(points) {
  const n = 1024;
  return points
    .map(p => ({ p, k: hilbert(Math.round((p.x + 1.2) / 2.4 * (n - 1)), Math.round((p.y + 1.2) / 2.4 * (n - 1)), n) }))
    .sort((a, b) => a.k - b.k)
    .map(o => o.p);
}

/* ---------- Quelle → Raster mit Farbflächen ---------- */

const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });

/** Zeichnet eine Quelle (kind 'image' | 'svg' | 'text') auf höchstens `box` Pixel Kantenlänge. Nur das braucht den Hauptthread. */
async function paint(source, box) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true });
  const M = 3; // Rand, damit Konturen am Bildrand geschlossen bleiben
  let w, h, meta = null;
  if (source.kind === 'text') {
    const font = source.font || `700 160px "Space Grotesk", sans-serif`;
    await document.fonts.load(font).catch(() => {});
    g.font = font;
    const px0 = parseFloat(font.match(/(\d+)px/)[1]);
    if (source.spacing && 'letterSpacing' in g) g.letterSpacing = `${source.spacing * px0}px`; // Sperrung in em
    const lines = String(source.text).split('\n');
    const lh = parseFloat(font.match(/(\d+)px/)[1]);
    const tw = Math.max(...lines.map(l => g.measureText(l).width));
    const s = Math.min(1, (box - 2 * M) / Math.max(tw, lh * lines.length));
    w = Math.ceil(tw * s) + 2 * M; h = Math.ceil(lh * lines.length * s) + 2 * M;
    c.width = w; c.height = h;
    g.setTransform(s, 0, 0, s, M, M);
    g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'center';
    if (source.spacing && 'letterSpacing' in g) g.letterSpacing = `${source.spacing * px0}px`;
    lines.forEach((l, i) => g.fillText(l, tw / 2, lh * (i + 0.5)));
  } else {
    const url = source.kind === 'svg' ? URL.createObjectURL(new Blob([source.markup], { type: 'image/svg+xml' })) : source.src;
    const img = await loadImage(url);
    if (source.kind === 'svg') URL.revokeObjectURL(url);
    const [sx, sy, iw, ih] = source.crop || [0, 0, img.naturalWidth || 300, img.naturalHeight || 300];
    const s = (box - 2 * M) / Math.max(iw, ih);
    w = Math.max(8, Math.round(iw * s)) + 2 * M; h = Math.max(8, Math.round(ih * s)) + 2 * M;
    c.width = w; c.height = h;
    g.drawImage(img, sx, sy, iw, ih, M, M, w - 2 * M, h - 2 * M);
    meta = { scale: s, img: [sx, sy, iw, ih] };
  }
  const rgba = g.getImageData(0, 0, w, h).data;
  return { rgba, w, h, M, meta };
}

// Ein Worker für alle Bühnen; ohne Worker-Unterstützung rechnet der Hauptthread
let worker = null, seq = 0;
const pending = new Map();
function core(job) {
  if (worker === null) {
    try {
      worker = new Worker(new URL('./shape-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = e => { const p = pending.get(e.data.id); pending.delete(e.data.id); p?.(e.data); };
    } catch { worker = false; }
  }
  if (!worker) return import('./shape-core.js').then(c => {
    const a = c.analyze(job.rgba, job.w, job.h, job.M, job);
    return a.crop ? a : { points: c.sampleShape(a, job.n) };
  });
  return new Promise(res => { const id = ++seq; pending.set(id, res); worker.postMessage({ ...job, id }, [job.rgba.buffer]); });
}

const cache = new WeakMap(); // je Quellobjekt und Drohnenzahl nur einmal rechnen
/**
 * Formation aus einer Quelle: deterministisch, gleiche Quelle und Drohnenzahl ergeben dieselben Punkte.
 * @returns {Promise<Array<{ x: number, y: number, c: number[], wt: number }>>}
 */
export function formation(source, n, opts = {}) {
  let byN = cache.get(source); if (!byN) cache.set(source, byN = new Map());
  if (!byN.has(n)) byN.set(n, compute(source, n, opts.box || 420).catch(e => { byN.delete(n); throw e; }));
  return byN.get(n);
}
// Text fliegt wie in echten FlyingStars-Shows in der Einstrich-Schrift ihres eigenen Textplaners
// (Drohne auf jeder Ecke und jedem Ende, gleichmäßige Abstände), nicht als abgetastete Pixelschrift.
async function strokeText(text, n) {
  const tf = await import('../text-formation.js');
  await tf.loadTextEngine();
  const r = tf.textFormation(String(text).replace(/\s*\n\s*/g, ' ').trim(), n);
  if (!r || !r.pts.length) return null;
  const sc = 2 / Math.max(r.size[0], r.size[1], 1e-6);
  return r.pts.map(([x, y]) => ({ x: x * sc, y: -y * sc, c: null, wt: 1 }));
}
async function compute(source, n, box) {
  if (source.kind === 'text' && !source.raster) {
    const pts = await strokeText(source.text, n);
    if (pts) return hilbertSort(pts);
  }
  let r = await paint(source, box);
  const canCrop = !!r.meta && !source.noCrop;
  let out = await core({ rgba: new Uint8ClampedArray(r.rgba), w: r.w, h: r.h, M: r.M, invert: !!source.invert, canCrop, n });
  if (out.crop) {
    // Leerraum abschneiden (3 % Rand bleiben, damit die Randfarbe erkennbar bleibt) und neu rastern
    const [x0, y0, x1, y1] = out.crop, [sx, sy, iw, ih] = r.meta.img, k = r.meta.scale, M = r.M, pad = Math.max(x1 - x0, y1 - y0) * 0.03 / k;
    const cx0 = Math.max(sx, sx + (x0 - M) / k - pad), cy0 = Math.max(sy, sy + (y0 - M) / k - pad);
    const cx1 = Math.min(sx + iw, sx + (x1 - M + 1) / k + pad), cy1 = Math.min(sy + ih, sy + (y1 - M + 1) / k + pad);
    r = await paint({ ...source, crop: [cx0, cy0, cx1 - cx0, cy1 - cy0] }, box);
    out = await core({ rgba: new Uint8ClampedArray(r.rgba), w: r.w, h: r.h, M: r.M, invert: !!source.invert, canCrop: false, n });
  }
  return hilbertSort(out.points);
}

/**
 * Reihenfolge für den Lichtlauf: ein Weg von Punkt zu nächstem Nachbarn, der den Linien der Form folgt.
 * Die Hilbert-Reihenfolge (für die Zuordnung zwischen Formationen) springt zwischen Bildvierteln und ließ
 * den Lichtlauf „quadrantenweise“ wandern. Ergebnis: Rang 0..1 je Punkt (gleiche Reihenfolge wie points).
 */
export function lightOrder(points) {
  const n = points.length, rank = new Float32Array(n); if (!n) return rank;
  const used = new Uint8Array(n);
  // Start links unten wie beim Schreiben einer Zeile
  let cur = 0; for (let i = 1; i < n; i++) if (points[i].x - points[i].y < points[cur].x - points[cur].y) cur = i;
  for (let step = 0; step < n; step++) {
    used[cur] = 1; rank[cur] = step / Math.max(1, n - 1);
    let best = -1, bd = Infinity; const px = points[cur].x, py = points[cur].y;
    for (let j = 0; j < n; j++) if (!used[j]) { const dx = points[j].x - px, dy = points[j].y - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = j; } }
    if (best < 0) break; cur = best;
  }
  return rank;
}
