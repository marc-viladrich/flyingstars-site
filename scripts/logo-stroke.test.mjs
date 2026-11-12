// Runde 26: Wächter für den Strichgraph-Sampler (sampleShape in src/scripts/formation/shape-core.js), mit dem der
// Konfigurator hochgeladene Logos in Drohnen umrechnet. Synthetische Logos (Ring mit Kreuz, dünne Schrift-Striche,
// volle Fläche), gerastert wie im Browser. Geprüft: höchstens n Punkte, Mindestabstand 2 m bei 90 m Bildbreite
// (1/45 der Bildbreite) überall eingehalten, deterministisch, volle Flächen als Kontur statt als Gerüst.
// Aufruf: node --test scripts/logo-stroke.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, sampleShape } from '../src/scripts/formation/shape-core.js';

const W = 420, H = 300, M = 3;
/** RGBA-Raster: weiß auf transparent, gezeichnet über eine Funktion inside(x, y). */
function raster(inside) {
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) { const k = (y * W + x) * 4; rgba[k] = rgba[k + 1] = rgba[k + 2] = rgba[k + 3] = 255; }
  return analyze(rgba, W, H, M, {});
}
const ringCross = raster((x, y) => { const r = Math.hypot(x - 150, y - 150); return (r > 100 && r < 118) || (Math.abs(x - 150) < 8 && r < 100) || (Math.abs(y - 150) < 8 && r < 100); });
const strokes = raster((x, y) => [60, 120, 180, 240, 300, 360].some((cx) => Math.abs(x - cx) < 5 && y > 60 && y < 240) || (Math.abs(y - 150) < 5 && x > 60 && x < 360));
const blob = raster((x, y) => ((x - 210) / 150) ** 2 + ((y - 150) / 120) ** 2 < 1);

const minGap = (pts) => { let g = Infinity; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) g = Math.min(g, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)); return g; };

for (const [name, shape] of [['Ring mit Kreuz', ringCross], ['dünne Striche', strokes], ['volle Fläche', blob]]) {
  test(`${name}: höchstens n Punkte, Mindestabstand eingehalten, deterministisch`, () => {
    for (const n of [60, 100, 150]) {
      const a = sampleShape(shape, n), b = sampleShape(shape, n);
      assert.ok(a.length > 0 && a.length <= n, `${name} ${n}: ${a.length} Punkte`);
      // Koordinaten: die längere Bildseite ist 2 breit, also Mindestabstand 2/45
      assert.ok(minGap(a) >= 2 / 45 - 1e-6, `${name} ${n}: kleinster Abstand ${minGap(a).toFixed(4)}`);
      assert.deepEqual(a.map((p) => [p.x, p.y]), b.map((p) => [p.x, p.y]), `${name} ${n}: nicht deterministisch`);
    }
  });
}

test('Volle Fläche: Punkte liegen auf der Kontur (eine halbe Drohnenreihe innen), nicht als Gerüst in der Mitte', () => {
  const pts = sampleShape(blob, 100), sc = 2 / W;
  const nearEdge = pts.filter((p) => { const x = p.x / sc + W / 2, y = p.y / sc + H / 2, e = Math.hypot((x - 210) / 150, (y - 150) / 120); return e > 0.85; });
  assert.ok(nearEdge.length >= pts.length * 0.9, `${nearEdge.length} von ${pts.length} Punkten am Rand`);
  assert.ok(pts.length >= 40, `nur ${pts.length} Punkte für eine volle Ellipse`);
});
