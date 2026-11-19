// Kontaktbogen der 2D-Katalogmotive (docs/katalog-2d.md): je Motiv eine Zeile mit der Katalogvariante und der Show-Art 2D
// (SPARK, scenes/catalog.js) bei mehreren Drohnenzahlen, Ruhelage t = 0. Schreibt projizierte Punkte als JSON;
// scripts/catalog-2d-sheet.py zeichnet daraus das Bild.
// Aufruf: node scripts/catalog-2d-sheet.mjs <aus.json> <zahlen, z. B. 100,200,300,390> [motiv1 motiv2 …]
// Ohne Motive: alle 2D-Motive.
import './show-node-env.mjs';
import { writeFileSync } from 'node:fs';

const { catalogScene, CATALOG, variantFor, catalogMinDrones } = await import('../src/scripts/scenes/catalog.js');
const [out, countsArg = '100,200,300,390', ...given] = process.argv.slice(2);
const counts = countsArg.split(',').map(Number);
const keys = given.length ? given : Object.keys(CATALOG).filter((k) => CATALOG[k].dimension !== '3D');
const { readFile } = await import('node:fs/promises');

/** Leuchtende Drohnen eines Bildes zur Zeit t (dunkle Reserve fällt weg). */
function frame(beat, t = 0) {
  const res = [];
  beat.pts.forEach((p, j) => {
    const o = [p[0], p[1], p[2] || 0, 1];
    beat.live?.(p, j, t, o);
    if (!(o[3] > 0.02)) return;
    res.push([o[0], o[1], Math.min(1.3, o[3]), p[3], p[4], p[5]]);
  });
  return res;
}
const rows = [];
for (const key of keys) {
  const m = CATALOG[key], min = catalogMinDrones(key);
  const big = m.variants.at(-1), f = JSON.parse(await readFile(new URL(`../public/media/katalog/${big.id}.json`, import.meta.url), 'utf8'));
  const cells = [{ label: `Katalog ${big.points}`, pts: f.points.map((p) => [p[0], p[1], 1, p[3], p[4], p[5]]) }];
  for (const n of counts) {
    if (n < min) { cells.push({ label: `${n}: ab ${min}`, pts: [] }); continue; }
    const t0 = performance.now(), beat = (await catalogScene(key, 'SPARK', n, key)).beats[0], ms = performance.now() - t0;
    const pts = frame(beat);
    cells.push({ label: `${n}: ${pts.length} hell · ${variantFor(key, n)?.points}`, pts, ms });
  }
  rows.push({ key, name: m.name.de, cells });
  console.log(key, cells.map((c) => c.label).join(' | '));
}
writeFileSync(out, JSON.stringify({ counts, rows }));
