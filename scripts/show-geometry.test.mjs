import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleOutline, circle, heartOutline, rings, clock, star, extrude, torusPair, burstSphere, evenSubset } from '../src/scripts/show-geometry.js';
import { OCCASIONS, STEPS, PACKAGE_ORDER } from '../src/content/show-configurator.js';
import * as shapes from '../src/scripts/show-shapes.js';

// The drone count of a package must be the drone count in the picture.
for (const n of [100, 200, 300]) {
  test(`Jede Form hat genau ${n} Punkte`, () => {
    for (const [name, pts] of Object.entries({ heart: heartOutline(n), rings: rings(n), clock: clock(n), star: star(n), torus: torusPair(n), burst: burstSphere(n), extrude: extrude(star(n), n, 0.3) })) {
      assert.equal(pts.length, n, name);
      assert.ok(pts.every((p) => p.every(Number.isFinite)), `${name} has non-finite coordinates`);
    }
  });
}

test('Punkte entlang einer Kontur liegen gleichmäßig', () => {
  const pts = sampleOutline([circle(0, 0, 1, 360)], 60);
  const gaps = pts.map((p, i) => Math.hypot(p[0] - pts[(i + 1) % 60][0], p[1] - pts[(i + 1) % 60][1]));
  assert.ok(Math.max(...gaps) / Math.min(...gaps) < 1.05);
});

test('Gleichmäßige Teilmenge behält die ganze Form', () => {
  const line = Array.from({ length: 600 }, (_, i) => [i, 0, 0]);
  const sub = evenSubset(line, 300);
  assert.equal(sub.length, 300);
  assert.ok(Math.max(...sub.map((p) => p[0])) > 590 && Math.min(...sub.map((p) => p[0])) < 10);
});

test('Motivformen haben genau die verlangte Punktzahl', () => {
  for (const n of [100, 200, 300]) for (const name of ['twoRings', 'shield', 'shield3d', 'tower', 'tower3d', 'waves', 'gate3d', 'rocket', 'rocket3d', 'maskPair', 'maskPair3d', 'mask3d', 'curtain', 'burst2d', 'bursts3d', 'sparkleShell', 'hand3d', 'hand2d', 'flute2d', 'flute3d', 'bubbles', 'trophy2d', 'trophy3d', 'bulb2d', 'bulbGlass', 'filament', 'notes2d', 'notes3d', 'clover2d', 'clover3d', 'brilliant', 'globe', 'rocketSolid', 'launchPad', 'moonHorizon', 'starField']) {
    const raw = shapes[name](n), pts = name.startsWith('maskPair') ? raw.flat() : raw;
    assert.equal(pts.length, n, `${name} ${n}`);
    assert.ok(pts.every((p) => p.every(Number.isFinite)), `${name} ${n} has non-finite coordinates`);
  }
  assert.equal(shapes.curtain(150, 1).length, 150);
  assert.equal(shapes.clockFace(200, 6, 0.3).length, 200);
  for (const n of [90, 100, 200, 300]) {
    assert.equal(shapes.engagementRing(n).flat().length, n, `engagementRing ${n}`);
    assert.equal(shapes.solitaire(n).flat().length, n, `solitaire ${n}`);
    assert.equal(shapes.torusLink(n).flat().length, n, `torusLink ${n}`);
    assert.equal(shapes.flagStar(n).flat().length, n, `flagStar ${n}`);
    assert.equal(shapes.bulb3d(n).flat().length, n, `bulb3d ${n}`);
    assert.equal(shapes.trophy3d(n, 0.2).length, n, `trophy3d base ${n}`);
    assert.equal(shapes.clover3d(n, 3).length, n, `clover3d three leaves ${n}`);
    const m = shapes.melody(n); assert.equal(m.staff.length + m.notes.flat().length, n, `melody ${n}`);
  }
});

test('Jeder Anlass spielt drei Motive mit je einer Fassung pro Paket', () => {
  assert.deepEqual(STEPS.map((s) => s.pkg), PACKAGE_ORDER);
  for (const occasion of OCCASIONS) {
    assert.equal(occasion.motifs.length, 3, occasion.id);
    for (const motif of occasion.motifs) {
      const builds = PACKAGE_ORDER.map((pkg) => motif.tiers[pkg]?.build);
      assert.ok(builds.every(Boolean), `${occasion.id}/${motif.id} misses a version`);
      assert.equal(new Set(builds).size, 3, `${occasion.id}/${motif.id}: every package needs its own version`);
    }
  }
  const all = OCCASIONS.flatMap((o) => o.motifs.flatMap((m) => Object.values(m.tiers).map((t) => t.build)));
  assert.equal(new Set(all).size, all.length, 'motif versions are not shared between occasions');
});
