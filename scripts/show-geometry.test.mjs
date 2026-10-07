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
  for (const n of [100, 200, 300]) for (const name of ['proposal', 'twoRings', 'shield', 'shield3d', 'zollverein', 'zollverein3d', 'rocket', 'rocket3d', 'masks', 'mask3d', 'curtain', 'burst2d', 'bursts3d', 'sparkleShell']) {
    const pts = shapes[name](n);
    assert.equal(pts.length, n, `${name} ${n}`);
    assert.ok(pts.every((p) => p.every(Number.isFinite)), `${name} ${n} has non-finite coordinates`);
  }
  assert.equal(shapes.curtain(150, 1).length, 150);
  assert.equal(shapes.clockFace(200, 6, 0.3).length, 200);
});

test('Jeder Anlass hat zwei Motive mit je einer Fassung pro Paket', () => {
  assert.deepEqual(STEPS.map((s) => s.pkg), PACKAGE_ORDER);
  for (const occasion of OCCASIONS) {
    assert.equal(occasion.motifs.length, 2, occasion.id);
    for (const motif of occasion.motifs) {
      const builds = PACKAGE_ORDER.map((pkg) => motif.tiers[pkg]?.build);
      assert.ok(builds.every(Boolean), `${occasion.id}/${motif.id} misses a version`);
      assert.equal(new Set(builds).size, 3, `${occasion.id}/${motif.id}: every package needs its own version`);
    }
  }
  const all = OCCASIONS.flatMap((o) => o.motifs.flatMap((m) => Object.values(m.tiers).map((t) => t.build)));
  assert.equal(new Set(all).size, all.length, 'motif versions are not shared between occasions');
});
