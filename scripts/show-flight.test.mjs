import test from 'node:test';
import assert from 'node:assert/strict';
import { assign, flightTime, ease, flow, along, LIMITS } from '../src/scripts/show-flight.js';

const flat = (pts) => Float64Array.from(pts.flat());
const cost = (a, b, order) => { let s = 0; for (let i = 0; i < order.length; i++) for (let k = 0; k < 3; k++) s += (a[i * 3 + k] - b[order[i] * 3 + k]) ** 2; return s; };

test('Zuordnung ist eine Permutation und findet das Optimum', () => {
  const a = flat([[0, 0, 0], [1, 0, 0], [2, 0, 0]]), b = flat([[2.1, 0, 0], [0.1, 0, 0], [1.1, 0, 0]]);
  assert.deepEqual([...assign(a, b)], [1, 2, 0]);
  // brute force on random sets of 6
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const perms = (xs) => xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
  for (let trial = 0; trial < 20; trial++) {
    const A = flat(Array.from({ length: 6 }, () => [rnd(), rnd(), rnd()])), B = flat(Array.from({ length: 6 }, () => [rnd(), rnd(), rnd()]));
    const best = Math.min(...perms([0, 1, 2, 3, 4, 5]).map((p) => cost(A, B, p)));
    assert.ok(Math.abs(cost(A, B, assign(A, B)) - best) < 1e-9);
  }
});

test('Zuordnung von 300 Drohnen bleibt schnell genug', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const A = Float64Array.from({ length: 900 }, rnd), B = Float64Array.from({ length: 900 }, rnd);
  const t0 = performance.now(), order = assign(A, B), ms = performance.now() - t0;
  assert.equal(new Set(order).size, 300);
  assert.ok(ms < 250, `assignment took ${ms.toFixed(0)} ms`);
});

test('Alle Drohnen kommen gleichzeitig und exakt an', () => {
  const out = [0, 0, 0];
  along(0, 0, 0, 1, 2, 3, 1, 5, out);
  assert.deepEqual(out.map((v) => +v.toFixed(9)), [1, 2, 3]);
  along(0, 0, 0, 1, 2, 3, 0, 5, out);
  assert.deepEqual(out.map((v) => +v.toFixed(9)), [0, 0, 0]);
  assert.equal(ease(0.5), 0.5);
  const a = flat([[0, 0, 0]]), b = flat([[1.5, 0, 0]]);
  const T = flightTime(a, b, [0]);
  assert.ok((1.875 * 1.5) / T <= LIMITS.speed + 1e-9 && (5.7735 * 1.5) / T ** 2 <= LIMITS.accel + 1e-9, 'peak speed and acceleration within limits');
  assert.equal(flightTime(a, a, [0]), 2.4);
});

test('Das Strömungsfeld ist divergenzfrei', () => {
  const h = 1e-4, o1 = [0, 0, 0], o2 = [0, 0, 0];
  for (const [x, y, z] of [[0.1, 0.2, 0.3], [-0.7, 0.4, 1.1], [1.3, -0.9, 0.2]]) {
    const dx = (flow(x + h, y, z, 2, o1)[0] - flow(x - h, y, z, 2, o2)[0]) / (2 * h);
    const dy = (flow(x, y + h, z, 2, o1)[1] - flow(x, y - h, z, 2, o2)[1]) / (2 * h);
    const dz = (flow(x, y, z + h, 2, o1)[2] - flow(x, y, z - h, 2, o2)[2]) / (2 * h);
    assert.ok(Math.abs(dx + dy + dz) < 1e-6);
  }
});
