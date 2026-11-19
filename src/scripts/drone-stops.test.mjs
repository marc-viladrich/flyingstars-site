// Runde 9, Punkt 8 (Marc 20.11.2026): jede einstellbare Drohnenzahl ist eine Preisstufe, zwischen zwei benachbarten
// Stufen gibt es genau einen Preissprung. Aufruf: node --test src/scripts/drone-stops.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOW_ARTS, droneStops, stopAtLeast, stopNearest, stopStep, showArtPrice, artMin, DRONES_MIN, DRONES_MAX, DRONE_STEP, SHOW_PACKAGES, TWO_D_LIMIT } from '../content/show-packages.ts';

test('jede Stufe ist eine Preisstufe, zwischen Nachbarn genau ein Preissprung', () => {
  for (const art of SHOW_ARTS) {
    const s = droneStops(art);
    assert.equal(s[0], artMin(art)); assert.equal(s.at(-1), DRONES_MAX);
    for (let i = 1; i < s.length; i++) {
      assert.ok(showArtPrice(art, s[i]) > showArtPrice(art, s[i - 1]), `${art} ${s[i - 1]} → ${s[i]}: kein Preissprung`);
      for (let n = s[i - 1] + DRONE_STEP; n < s[i]; n += DRONE_STEP) assert.equal(showArtPrice(art, n), showArtPrice(art, s[i]), `${art} ${n}: zweiter Preissprung vor ${s[i]}`);
    }
  }
});

test('Stufen wie in der Preislogik: 2D bis 190 je 10, ab 200 je 50; 3D+ je 100', () => {
  assert.deepEqual(droneStops('2d').slice(0, 12), [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 250]);
  assert.deepEqual(droneStops('3d').slice(0, 4), [200, 250, 300, 350]);
  assert.deepEqual(droneStops('story').slice(0, 3), [300, 400, 500]);
  assert.ok(droneStops('2d').includes(TWO_D_LIMIT), 'Auto-3D ab 400 liegt auf einer Stufe');
  for (const name of Object.keys(SHOW_PACKAGES)) assert.ok(SHOW_ARTS.some((a) => droneStops(a).includes(SHOW_PACKAGES[name].base)), `${name}: Startwert keine Stufe`);
});

test('Runden landet immer auf einer Stufe; Bedarf (Logo, Text, Link) rundet auf und kostet dasselbe', () => {
  for (const art of SHOW_ARTS) for (let n = DRONES_MIN; n <= DRONES_MAX; n++) {
    const up = stopAtLeast(art, n), near = stopNearest(art, n);
    assert.ok(droneStops(art).includes(up) && droneStops(art).includes(near), `${art} ${n}`);
    if (n >= artMin(art)) { assert.ok(up >= n, `${art} ${n} → ${up}`); assert.equal(showArtPrice(art, up), showArtPrice(art, Math.ceil(n / DRONE_STEP) * DRONE_STEP), `${art} ${n}: Aufrunden ändert den Preis`); }
  }
  // Marcs Beispiele aus dem Logo-Modus
  assert.equal(stopAtLeast('3d', 114), 200); assert.equal(stopAtLeast('3d', 233), 250); assert.equal(stopAtLeast('2d', 114), 120); assert.equal(stopAtLeast('story', 233), 300);
});

test('Pfeiltasten gehen genau eine Stufe weiter', () => {
  for (const art of SHOW_ARTS) { const s = droneStops(art); for (let i = 0; i < s.length; i++) {
    assert.equal(stopStep(art, s[i], 1), s[Math.min(i + 1, s.length - 1)]);
    assert.equal(stopStep(art, s[i], -1), s[Math.max(i - 1, 0)]);
  } }
});
