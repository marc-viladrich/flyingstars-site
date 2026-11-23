// Kontaktbogen für die 3D-Fassungen der Katalogmotive (docs/katalog-3d.md): je Motiv die 2D-Fassung (SPARK) und die
// 3D-Fassung (HORIZON) aus scenes/catalog.js, die 3D-Fassung bei mehreren Blickwinkeln und als Bewegungsspur. Schreibt
// projizierte Punkte als JSON; scripts/catalog-3d-sheet.py zeichnet daraus das Bild.
// Aufruf: node scripts/catalog-3d-sheet.mjs <aus.json> [n2d] [n3d] motiv1 motiv2 … (oder stufe:3D / stufe:3D+)
import './show-node-env.mjs';
import { writeFileSync } from 'node:fs';

const { catalogScene } = await import('../src/scripts/scenes/catalog.js');
const { yaw } = await import('../src/scripts/show-motion.js');
const [out, n2 = '200', n3 = '300', ...args] = process.argv.slice(2);
// Kurzform stufe:3D bzw. stufe:3D+ setzt alle Motive dieser Stufe ein (src/scripts/scenes/catalog-3d/stufen.js)
const { KLASSE_KATALOG, stufeKatalog } = await import('../src/scripts/scenes/catalog-3d/stufen.js');
const keys = args.flatMap((a) => (a.startsWith('stufe:') ? Object.keys(KLASSE_KATALOG).filter((k) => stufeKatalog(k) === a.slice(6)) : [a]));
const TILT = 0.14, ct = Math.cos(TILT), st = Math.sin(TILT); // wie render() in show-field.js
const VIEWS = [-0.52, 0, 0.52]; // −30°, 0°, +30°

/** Lage aller Drohnen eines Bildes zur Zeit t, um `view` gedreht; dunkle Reserve fällt weg. */
function frame(beat, t, view) {
  const res = [];
  beat.pts.forEach((p, j) => {
    const o = [p[0], p[1], p[2] || 0, 1];
    beat.live?.(p, j, t, o);
    if (!(o[3] > 0.02)) return;
    yaw(o, view);
    res.push([o[0], o[1], o[2], o[3], p[3], p[4], p[5]]);
  });
  return res;
}
/** Bühnenprojektion: Kippung, Perspektive und Tiefenschattierung wie im Konfigurator; s = Maßstab des Motivs. */
function project(list, s) {
  return list.map(([x, y, z, a, r, g, b]) => {
    x *= s; y *= s; z *= s;
    const Y = y * ct - z * st, Z = y * st + z * ct, pr = 3.4 / (3.4 - Z), depth = Math.max(0, Math.min(1, (Z + 0.6) / 1.2));
    return [x * pr, Y * pr, pr, a * (0.78 + 0.22 * depth), r, g, b];
  });
}
const extent = (lists) => { let m = 0; for (const l of lists) for (const p of l) m = Math.max(m, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2])); return m || 1; };

const rows = [];
// --paare (Runde 9, Marc: „3D+ offensichtlich komplexer und refinter“): je Motiv die Fassung 3D neben der Fassung 3D+,
// direkt aus dem Register (Ruhelage bei t = 0 wie in scenes/catalog.js). Spalten: 3D 0° | 3D +30° | 3D+ 0° | 3D+ +30° |
// 3D+ Bewegung. Die Spaltennamen stehen in jeder Zeile (cols); scripts/catalog-3d-sheet.py zeichnet noch seine festen
// Spaltenköpfe, bis es `cols = rows[0].get("cols") or [...]` liest.
if (process.argv.includes('--paare')) {
  const { loadCatalog3d, LIT_MAX } = await import('../src/scripts/scenes/catalog-3d/index.js');
  const CATALOG_3D = await loadCatalog3d();
  const beatOf = (key, stufe) => { const k = Math.min(+n3, LIT_MAX), { pts, live } = CATALOG_3D[key](k, stufe); return { pts, live: (b, j, t, o) => live(pts[j], j, t, o) }; };
  for (const key of keys.filter((k) => !k.startsWith('--'))) {
    const a = beatOf(key, '3D'), b = beatOf(key, '3D+');
    const va = [frame(a, 0, 0), frame(a, 0, 0.52)], vb = [frame(b, 0, 0), frame(b, 0, 0.52)];
    const trail = Array.from({ length: 14 }, (_, i) => frame(b, i * 0.9, 0)), s = 1 / extent([...va, ...vb, ...trail]);
    rows.push({ key, is3d: true, lit: vb[0].length, drones: b.pts.length, cols: ['3D 0°', '3D +30°', '3D+ 0°', '3D+ +30°', '3D+ Bewegung'], flat: project(va[0], s), views: [project(va[1], s), project(vb[0], s), project(vb[1], s)], trail: trail.map((v) => project(v, s)) });
    console.log(`${key}: 3D ${a.pts.length} | 3D+ ${b.pts.length}`);
  }
  writeFileSync(out, JSON.stringify(rows));
  process.exit(0);
}
for (const key of keys) {
  // 2D-Spalte: wenn die 2D-Abtastung gerade nicht baut (fremde Arbeit im Checkout), bleibt sie leer, die 3D-Spalten nicht
  const flat = await catalogScene(key, 'SPARK', +n2, key).then((s) => s.beats[0]).catch((e) => { console.warn(`${key}: 2D nicht verfügbar (${e.code ?? e.message})`); return { pts: [] }; });
  const body = (await catalogScene(key, 'HORIZON', +n3, key)).beats;
  const beat = body[body.length - 1], is3d = Boolean(beat.catalog3d);
  const f2 = frame(flat, 0, 0), s2 = 1 / extent([f2]);
  const views = VIEWS.map((v) => frame(beat, 0, v));
  const trail = Array.from({ length: 14 }, (_, i) => frame(beat, i * 0.9, 0));
  const s3 = 1 / extent([...views, ...trail]);
  rows.push({ key, is3d, lit: views[1].length, drones: beat.pts.length, flat: project(f2, s2), views: views.map((v) => project(v, s3)), trail: trail.map((v) => project(v, s3)) });
  console.log(`${key}: ${is3d ? '3D' : 'nur 2D'} · ${views[1].length} leuchtend von ${beat.pts.length}`);
}
writeFileSync(out, JSON.stringify(rows));
