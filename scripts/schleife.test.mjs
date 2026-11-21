// Runde 17: Wächter für die Schleife des Startseiten-Teasers (show-teaser.js, LOOP_LINGER). Am Ende der Bokkenrijders-
// Geschichte steht das Grinsen länger allein, dann setzt es sich zum ersten Logo des Ablaufs zusammen; der nächste Durchlauf
// beginnt mit genau diesem Logo (loopJoined, kein zweiter Aufbau). Geprüft: Halten, Anschluss auf dem Bildschirm trotz
// verschiedener Bildausschnitte (refit), Drohnenzahl des Logos, nur im gemischten Ablauf und in 3D+.
// Aufruf: node --test scripts/schleife.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location ??= { pathname: '/' };
const { buildReel, LOOP_LINGER } = await import('../src/scripts/show-teaser.js');

const lit = (b, t) => b.pts.filter((p, j) => { const o = [p[0], p[1], p[2] || 0, 1, NaN, 0, 0]; b.live?.(p, j, t, o); return o[3] > 0.05; }).length;
/** Bildschirmlage wie restAt() in show-field.js (ohne Kippung, die für alle Bilder gleich ist). */
const screen = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1, NaN, 0, 0]; b.live?.(p, j, t, o); const f = b.fit; return [(o[0] - f.x) * f.k, (o[1] - f.y) * f.k, o[2] * f.k, o[3]]; });
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-9;

const mixed = await buildReel('start');

test('gemischter Ablauf: das Grinsen steht länger, dann baut es das erste Logo (100 Drohnen), Schleife ohne Wolke', () => {
  const { beats } = mixed, loop = beats.at(-1), mask = beats.at(-2), logo = beats[0];
  assert.equal(mixed.loopJoined, true);
  assert.equal(mixed.loopTo, 0);
  assert.ok(loop.umbau && mask.handoff, 'das letzte Bild ist der Umbau nach der Maske');
  assert.equal(logo.pts.length, 100, 'erstes Bild: Logo aus 100 Drohnen');
  assert.equal(loop.umbau.to, 100);
  assert.equal(loop.segment, logo.segment, 'der Umbau gehört schon zum Logo (Wireframe, Wahl der Art)');
  assert.equal(loop.reel.n, 100);
  // Halten: das Grinsen allein mindestens LOOP_LINGER Sekunden Show-Uhr (vorher rund 0,2 s)
  const grin = lit(mask, mask.hold), step = 0.1;
  let alone = 0;
  for (let t = mask.hold; t > 0 && lit(mask, t) === grin; t -= step) alone += step;
  assert.ok(alone >= LOOP_LINGER, `Grinsen steht nur ${alone.toFixed(1)} s allein`);
  assert.ok(grin >= 40 && grin < 600, `am Ende leuchten ${grin} Drohnen, erwartet nur Zähne und Augen`);
});

test('Schleife: Anfang = Maske auf dem Bildschirm, Ende = Logo auf dem Bildschirm, auch in verschiedenen Ausschnitten', () => {
  const { beats } = mixed, loop = beats.at(-1), mask = beats.at(-2), logo = beats[0];
  // Ausschnitte wie von show-field.js, bewusst verschieden
  mask.fit = { k: 0.7, x: 0.05, y: -0.1 }; logo.fit = { k: 1.4, x: -0.02, y: 0.3 }; loop.fit = { k: 0.9, x: 0.2, y: 0.1 };
  const A = screen(mask, mask.hold), S = screen(loop, 0);
  // der Umbau übernimmt die Drohnen in der Reihenfolge des alten Bildes (reassemble: pts = Lage des alten Bildes)
  A.forEach((o, j) => { if (o[3] > 0.05) assert.ok(near(o, S[j]), `Drohne ${j} springt beim Start der Schleife`); });
  const E = screen(loop, loop.hold).filter((o) => o[3] > 0.05), B = screen(logo, 0), used = new Set();
  assert.equal(E.length, 100, 'am Ende leuchten genau die 100 Drohnen des Logos');
  for (const o of E) { const i = B.findIndex((q, k) => !used.has(k) && near(o, q)); assert.ok(i >= 0, 'leuchtende Drohne steht nicht auf einem Platz des Logos'); used.add(i); }
  // jede leuchtende Drohne des Grinsens baut am Logo mit (keepLit); fehlende Plätze kommen dunkel dazu und gehen spät an
  const grin = A.map((o, j) => [o[3] > 0.05, j]).filter(([on]) => on).map(([, j]) => j);
  assert.ok(grin.every((j) => loop.umbau.slotOf[j] >= 0), 'das Logo entsteht aus dem Grinsen');
});

test('Wahl der Art: Schleife in 3D+ (Logo 300), in 2D und 3D die lebendige Wolke wie bisher', async () => {
  const odyssey = await buildReel('start', { art: '3d+' });
  assert.equal(odyssey.loopJoined, true);
  assert.equal(odyssey.beats.at(-1).umbau.to, odyssey.beats[0].pts.length);
  for (const art of ['2d', '3d']) {
    const scene = await buildReel('start', { art });
    assert.ok(!scene.loopJoined, `${art}: keine Schleife`);
    assert.ok(!scene.beats.some((b) => b.umbau && b.frame === 'schleife'), `${art}: kein Schleifen-Umbau`);
  }
  for (const reel of ['marke', 'hochzeit']) assert.ok(!(await buildReel(reel)).loopJoined, `${reel}: keine Schleife`);
});
