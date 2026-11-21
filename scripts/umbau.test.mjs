// Runde 16: Wächter für das Zerlegen und Zusammensetzen (src/scripts/scenes/umbau.js) und die Geschichten, die es nutzen:
// Torte → Zahl (Jubiläum), Logo → Handy mit QR-Code, Drehzahlmesser → Sportwagen (Marketing), Bokkenrijders-Maske ↔
// Totenkopf mit Zylinder (Kultur). Je Geschichte: genau n Drohnen in jedem Bild, der Umbau beginnt dort, wo das Bild
// davor endet, und endet dort, wo das nächste beginnt; jede Drohne fliegt geradeaus (keine Umkehr), alle sind
// rechtzeitig vor dem Ende angekommen. Aufruf: node --test scripts/umbau.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { reassemble, poseAt } = await import('../src/scripts/scenes/umbau.js');
const { buildSequence } = await import('../src/scripts/show-scenes.js');
const { OCCASIONS } = await import('../src/content/show-configurator.js');

const total = (b) => b.pts.length + (b.offstageDrones ?? 0);
const close = (a, b, eps = 1e-6) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < eps;
const raw = (b) => b.steady?.raw ?? b.live;
/** Lage nach t Sekunden der rohen Uhr (steady() hat live in eine weiche Uhr gewickelt, steady.raw ist die eigene). */
const at = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; raw(b)?.(p, j, t, o); return o; });

test('Umbau: gerade Bahnen, Anfang = Ende des alten Bildes, Ende = Anfang des neuen', () => {
  const from = { pts: Array.from({ length: 60 }, (_, i) => [Math.cos(i), Math.sin(i), 0, 255, 0, 0]), hold: 2, live: (b, j, t, o) => { o[0] += 0.1 * t; } };
  const to = { pts: Array.from({ length: 80 }, (_, i) => [i / 40 - 1, (i % 7) / 7, 0.2, 0, 0, 255]) };
  const m = reassemble(from, to, { spread: 2, fly: 1.5 });
  assert.equal(m.pts.length, 80);
  const A = poseAt(from, 2), end = at(m, m.hold), start = at(m, 0);
  A.forEach((o, j) => assert.ok(close(start[j], o), `Drohne ${j} beginnt nicht am Ende des alten Bildes`));
  const B = poseAt(to, 0), used = new Set();
  for (const o of end.filter((o) => o[3] > 0.05)) { const i = B.findIndex((q, k) => !used.has(k) && close(o, q)); assert.ok(i >= 0, 'leuchtende Drohne steht nicht auf einem Platz des neuen Bildes'); used.add(i); }
  assert.equal(used.size, 80, 'jeder Platz des neuen Bildes ist besetzt');
});

const stories = [
  ['jubilaeum', 'jubeltorte', [300, 400, 1000]],
  ['launch', 'qr', [300, 600]],
  ['launch', 'drehzahl', [300, 500]],
  ['kultur', 'teufel', [400, 600, 1000]],
];
for (const [occasion, id, counts] of stories) for (const n of counts) {
  test(`${occasion}/${id} 3D+ bei ${n}: Drohnenzahl, Anschlüsse, gerade Bahnen`, async () => {
    const motif = OCCASIONS.find((o) => o.id === occasion).motifs.find((m) => m.id === id);
    const { beats } = await buildSequence([motif], 'ODYSSEY', n, null, occasion);
    const shown = beats.filter((b) => !b.interlude);
    const morphs = shown.filter((b) => b.umbau);
    assert.ok(morphs.length >= 1, 'die Geschichte enthält einen Umbau');
    for (const b of shown) assert.equal(total(b), n, `„${b.caption}“: ${total(b)} statt ${n} Drohnen`);
    for (const m of morphs) {
      const k = shown.indexOf(m), prev = shown[k - 1], next = shown[k + 1];
      const A = at(prev, prev.steady?.end ?? prev.hold ?? 2.2), S = at(m, 0);
      for (let j = 0; j < prev.pts.length; j++) if (A[j][3] > 0.05) assert.ok(close(A[j], S[j], 1e-4), `„${m.caption}“: Drohne ${j} springt beim Start des Umbaus`);
      const E = at(m, m.steady?.end ?? m.hold), B = at(next, 0);
      const lit = E.filter((o) => o[3] > 0.05).length, want = B.filter((o) => o[3] > 0.05).length;
      assert.ok(lit >= want * 0.98, `„${m.caption}“: nur ${lit} von ${want} Plätzen leuchten am Ende`);
      // geradeaus: jede Drohne bewegt sich nur in Richtung ihres Ziels (Abstand zum Ziel nimmt nie zu)
      const end = E, T = m.steady?.end ?? m.hold;
      for (let j = 0; j < m.pts.length; j += 7) {
        let last = Infinity;
        for (let q = 0; q <= 40; q++) { const p = m.pts[j], o = [p[0], p[1], p[2] || 0, 1]; raw(m)(p, j, (T * q) / 40, o); const d = Math.hypot(o[0] - end[j][0], o[1] - end[j][1], o[2] - end[j][2]); assert.ok(d <= last + 1e-9, `Drohne ${j} kehrt um`); last = d; }
      }
    }
  });
}
