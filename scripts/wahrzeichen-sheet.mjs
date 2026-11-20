// Kontaktbogen der Wahrzeichen (docs/katalog-wahrzeichen.md): je Wahrzeichen eine Zeile, Spalten = Fassung und
// Drohnenzahl, so wie der Konfigurator sie spielt (Bauname aus scenes/wahrzeichen.js, letzte Szene, Ruhelage bei t = 0;
// 3D-Spalten zusätzlich um +30° gedreht). Schreibt projizierte Punkte als JSON; scripts/wahrzeichen-sheet.py zeichnet.
// Aufruf: node scripts/wahrzeichen-sheet.mjs <aus.json> <spalten> [wahrzeichen …]
//   spalten z. B. "2d:100,2d:150,2d:200,2d:250,2d:300,3d:200,3d:300,plus:300,plus:600" oder "2d:100@3.5" (Zeit t)
import './show-node-env.mjs';
import { writeFileSync } from 'node:fs';

const { builders, LANDMARKS } = await import('../src/scripts/scenes/wahrzeichen.js');
const { yaw } = await import('../src/scripts/show-motion.js');
const [out, spec = '2d:100,2d:150,2d:200,2d:250,2d:300', ...only] = process.argv.slice(2);
const TILT = 0.14, ct = Math.cos(TILT), st = Math.sin(TILT); // wie render() in show-field.js
const cols = spec.split(',');
const keys = only.length ? only : Object.keys(LANDMARKS);

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
function project(list, s, c) {
  return list.map(([x, y, z, a, r, g, b]) => {
    x = (x - c[0]) * s; y = (y - c[1]) * s; z *= s;
    const Y = y * ct - z * st, Z = y * st + z * ct, pr = 3.4 / (3.4 - Z), depth = Math.max(0, Math.min(1, (Z + 0.6) / 1.2));
    return [x * pr, Y * pr, pr, a * (0.78 + 0.22 * depth), r, g, b];
  });
}
const rows = [];
for (const key of keys) {
  const cells = [];
  for (const col of cols) {
    const [what, rest] = col.split(':'), [nn, tt = '0', vv = '0'] = rest.split('@'), n = +nn, t = +tt, view = +vv;
    const build = LANDMARKS[key][what];
    if (!build) { cells.push(null); continue; }
    const scene = await builders[build](n, '');
    const beat = scene.beats.at(-1), list = frame(beat, t, view);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of list) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const s = 1.9 / Math.max(x1 - x0, y1 - y0, 1e-6);
    cells.push({ n: list.length, pts: project(list, s, [(x0 + x1) / 2, (y0 + y1) / 2]), note: `${list.length}/${beat.pts.length + (beat.offstageDrones ?? 0)}` });
  }
  rows.push({ key, cells });
  console.log(key, cells.map((c) => c?.note ?? '–').join(' '));
}
writeFileSync(out, JSON.stringify({ cols, rows }));
