// Runde 10b (Marc 20.11.2026, Hochzeit „Herz mit Initialen“: „die Initialen sind nicht richtig im Herz drin“): das Motiv
// läuft über denselben Weg wie der eigene Text im Stil Initialen (scenes/text.js). Wächter: jede Drohne der Initialen steht
// innerhalb des Herzens, mit Abstand zur Linie, bei jeder Drohnenzahl der Stufen von 2D.
// Aufruf: node --test scripts/initials-heart.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { getConfiguratorContent } = await import('../src/content/show-configurator.js');
const { textScene } = await import('../src/scripts/scenes/text.js');

const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const distTo = (poly, x, y) => Math.min(...poly.map(([px, py]) => Math.hypot(px - x, py - y)));

test('Hochzeit: „Herz mit Initialen“ nutzt den Text-Weg (Stil Initialen) mit Standard „A & T“', () => {
  for (const locale of ['de', 'en', 'nl']) {
    const m = getConfiguratorContent(locale).OCCASIONS.find((o) => o.id === 'hochzeit').motifs.find((x) => x.id === 'initialen');
    assert.ok(m, `${locale}: Motiv fehlt`);
    assert.equal(m.tiers.SPARK.build, 'textSPARK');
    assert.deepEqual([m.tiers.SPARK.value, m.tiers.SPARK.style, m.tiers.SPARK.occasion], ['A & T', 'initials', 'hochzeit']);
    assert.equal(m.tiers.SPARK.minDrones, 100);
  }
});

for (const n of [100, 150, 200, 300]) test(`${n} Drohnen: alle Initialen innerhalb des Herzens`, async () => {
  const v = getConfiguratorContent('de').OCCASIONS.find((o) => o.id === 'hochzeit').motifs.find((x) => x.id === 'initialen').tiers.SPARK;
  const { beats: [b] } = await textScene(n, v.caption, v, 'SPARK');
  assert.equal(b.pts.length, n, 'genau n Drohnen');
  const pink = (p) => p[3] > 200 && p[5] > 100 && p[4] < 160; // der Rahmen ist pink, die Buchstaben warmweiß
  const heart = b.pts.filter(pink), letters = b.pts.filter((p) => !pink(p));
  assert.ok(heart.length > 20 && letters.length > 20, `${heart.length} Herz / ${letters.length} Buchstaben`);
  // Herzpunkte als Umriss ordnen (nach Winkel um die Mitte), dann Punkt-in-Polygon
  const cx = heart.reduce((s, p) => s + p[0], 0) / heart.length, cy = heart.reduce((s, p) => s + p[1], 0) / heart.length;
  const poly = heart.map((p) => [p[0], p[1]]).sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  const ys = heart.map((p) => p[1]), size = Math.max(...ys) - Math.min(...ys);
  for (const p of letters) {
    assert.ok(inside(poly, p[0], p[1]), `Buchstabenpunkt (${p[0].toFixed(2)}, ${p[1].toFixed(2)}) außerhalb des Herzens`);
    assert.ok(distTo(poly, p[0], p[1]) > 0.03 * size, `Buchstabenpunkt (${p[0].toFixed(2)}, ${p[1].toFixed(2)}) berührt die Linie`);
  }
});
