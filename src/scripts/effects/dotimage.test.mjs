// Wächter für den Lichtpunkt-Versatz (Marc, 31.10.2026): Ein Bildpunkt muss im Foto (object-fit: cover + object-position)
// und in den Lichtpunkten an derselben Stelle des Rahmens landen, für jede Rahmengröße und jede object-position.
// Vorher verrutschten die Lichtpunkte bei srcset (falscher Maßstab), bei object-position ≠ Mitte (Team auf dem Handy)
// und um bis zu eine Zelle (Ausschnitt über das Raster statt über den Rahmen gerechnet).
import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.document ??= { documentElement: { classList: { contains: () => false } } };
globalThis.matchMedia ??= () => ({ matches: false });
const { coverCrop } = await import('./dotimage.js');

// Wo landet Bildpunkt (u, v) im Rahmen? Foto: CSS-Regel für object-fit: cover
const photoAt = (nw, nh, W, H, pos, u, v) => { const k = Math.max(W / nw, H / nh); return [(u - (nw - W / k) * pos.x) * k, (v - (nh - H / k) * pos.y) * k]; };
// Lichtpunkte: Zelle des Rasters, aus der der Bildpunkt abgetastet wird
const dotsAt = (c, u, v, step, cols, rows) => [c.gx + ((u - c.sx) / c.sw) * cols * step, c.gy + ((v - c.sy) / c.sh) * rows * step];

const cases = [
  [1920, 1281, 429, 322, { x: 0.5, y: 0.5 }, 8],
  [640, 480, 340, 255, { x: 0.5, y: 0.5 }, 8],
  [800, 1000, 342, 256, { x: 0.5, y: 0.25 }, 6], // Team-Porträt auf dem Handy (4:3-Rahmen, Ausschnitt oben)
  [800, 1000, 120, 120, { x: 0.5, y: 0.22 }, 4], // Gesichter an der Anfrage
  [2544, 1493, 1100, 619, { x: 0, y: 1 }, 10],
];
for (const [nw, nh, W, H, pos, step] of cases) {
  test(`gleiche Stelle in Foto und Lichtpunkten: ${nw}×${nh} in ${W}×${H}, Position ${pos.x}/${pos.y}`, () => {
    const cols = Math.ceil(W / step), rows = Math.ceil(H / step), c = coverCrop(nw, nh, W, H, cols, rows, step, pos);
    for (const [u, v] of [[nw * 0.5, nh * 0.5], [nw * 0.3, nh * 0.4], [nw * 0.62, nh * 0.55]]) {
      const [px, py] = photoAt(nw, nh, W, H, pos, u, v), [dx, dy] = dotsAt(c, u, v, step, cols, rows);
      assert.ok(Math.abs(px - dx) < 0.01 && Math.abs(py - dy) < 0.01, `Foto ${px.toFixed(2)}/${py.toFixed(2)} vs. Lichtpunkte ${dx.toFixed(2)}/${dy.toFixed(2)}`);
    }
  });
}

test('Raster deckt den ganzen Rahmen ab (kein dunkler Rand, kein Schnappen beim Zurückwechseln)', () => {
  for (const [W, H, step] of [[342, 428, 6], [429, 322, 8], [120, 120, 4], [1101, 619, 10]]) {
    const cols = Math.ceil(W / step), rows = Math.ceil(H / step), c = coverCrop(800, 1000, W, H, cols, rows, step);
    assert.ok(c.gx <= 0 && c.gy <= 0, `Raster beginnt innerhalb des Rahmens: ${c.gx}/${c.gy}`);
    assert.ok(cols * step >= W && rows * step >= H);
  }
});
