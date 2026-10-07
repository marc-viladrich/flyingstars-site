import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleOutline, circle, heartOutline, rings, clock, star, extrude, torusPair, burstSphere, evenSubset } from '../src/scripts/show-geometry.js';
import { occasions, showFor, STEPS, PACKAGE_ORDER } from '../src/content/show-configurator.js';

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

test('Jede höhere Stufe zeigt alles der niedrigeren und mindestens ein neues Motiv', () => {
  assert.deepEqual(STEPS.map((s) => s.pkg), PACKAGE_ORDER);
  for (const occasion of occasions()) {
    for (let k = 1; k < PACKAGE_ORDER.length; k++) {
      const lower = showFor(occasion, PACKAGE_ORDER[k - 1]).map((s) => s.id), higher = showFor(occasion, PACKAGE_ORDER[k]).map((s) => s.id);
      assert.ok(lower.every((id) => higher.includes(id)), `${occasion.id}: ${PACKAGE_ORDER[k]} drops a motif`);
      assert.ok(higher.length > lower.length, `${occasion.id}: ${PACKAGE_ORDER[k]} adds nothing`);
    }
  }
});

test('Anlässe zeigen unterschiedliche Motive', () => {
  const sets = occasions().map((o) => new Set(o.scenes.filter((s) => s.kind !== 'stars' && s.kind !== 'sparks').map((s) => s.kind + (s.text || s.texts?.join('') || ''))));
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    const shared = [...sets[i]].filter((x) => sets[j].has(x));
    assert.ok(shared.length <= 1, `occasions ${i} and ${j} share ${shared.join(', ')}`);
  }
});
