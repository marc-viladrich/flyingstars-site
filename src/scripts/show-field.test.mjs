import test from 'node:test';
import assert from 'node:assert/strict';
import { createField } from './show-field.js';

const points = (n) => Array.from({ length: n }, (_, i) => [
  Math.cos(i * 2.399) * Math.sqrt((i + 1) / n),
  Math.sin(i * 2.399) * Math.sqrt((i + 1) / n) * 0.7, 0, 240, 180, 90,
]);
const scene = (n, extra = {}) => ({ beats: [{ pts: points(n), hold: Infinity, ...extra }] });

function fixture(t) {
  const saved = new Map();
  const set = (key, value) => { saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); };
  t.after(() => { for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  let callback, ms = 0;
  const ctx = { setTransform() {}, clearRect() {}, fillRect() {}, createRadialGradient: () => ({ addColorStop() {} }),
    drawImage(_image, ...coords) { assert.ok(coords.every(Number.isFinite), 'every painted coordinate is finite'); } };
  set('window', { __showTrace: [] }); set('devicePixelRatio', 1);
  set('matchMedia', () => ({ matches: false, addEventListener() {} }));
  set('document', { hidden: false, documentElement: { classList: { contains: () => false } }, addEventListener() {}, createElement: () => ({ getContext: () => ctx }) });
  set('IntersectionObserver', class { observe() {} });
  set('requestAnimationFrame', (fn) => { callback = fn; return 1; });
  set('cancelAnimationFrame', () => { callback = null; });
  const canvas = { dataset: {}, getContext: () => ctx, getBoundingClientRect: () => ({ width: 900, height: 600 }) };
  const field = createField(canvas);
  const advance = (frames = 1, delta = 100) => { for (let i = 0; i < frames && callback; i++) { const fn = callback; callback = null; fn(ms += delta); } };
  const complete = (n) => {
    assert.equal(canvas.dataset.lit, String(n));
    const coords = field.screenOf();
    assert.equal(coords.length, n);
    assert.ok(coords.every((p) => p?.length === 2 && p.every(Number.isFinite)));
    assert.equal(new Set(coords.map((p) => p.join(','))).size, n, 'all distinct places are assigned');
  };
  return { field, canvas, advance, complete };
}

test('capacity grows beyond 1,000 twice, renders every point and clears the tail on instant shrink', (t) => {
  const { field, complete } = fixture(t);
  for (const n of [300, 1001, 11761, 100, 1000]) { field.show(scene(n), n, 1, { instant: true }); complete(n); }
});

test('growth during a running flight preserves airborne positions and initializes new drones dark', (t) => {
  const { field, canvas, advance, complete } = fixture(t);
  field.show(scene(300), 300, 1, { instant: true });
  field.show(scene(400), 400, 1, { cloud: true }); advance(5);
  const before = window.__showTrace.at(-1)[1];
  field.show(scene(11761), 11761, 1, { cloud: true });
  assert.ok(Number(canvas.dataset.lit) <= 400, 'new capacity is dark until takeoff');
  advance(1, 0);
  const after = window.__showTrace.at(-1)[1];
  assert.deepEqual(after.slice(0, before.length), before, 'growth preserves positions at the transition boundary');
  assert.ok(after.every(Number.isFinite));
  advance(120); complete(11761);
  field.show(scene(100), 100); advance(120); complete(100);
});

test('future beats reserve capacity and normal large transitions assign every slot', (t) => {
  const { field, advance, complete } = fixture(t);
  field.show({ beats: [{ pts: points(100), segment: 0, hold: Infinity }, { pts: points(1001), segment: 1, hold: Infinity }, { pts: points(11761), segment: 2, hold: Infinity }] }, 100, 1, { instant: true });
  complete(100);
  field.goto(1); advance(120); complete(1001);
  field.goto(2); advance(120); complete(11761);
  field.goto(0); advance(120); complete(100);
});

for (const [label, first, second, cloud] of [
  ['growing group', 1100, 11761, false],
  ['shrinking group', 11761, 1100, false],
  ['partial cloud', 1100, 11761, ['rebuilt']],
]) test(`Hilbert matching covers rectangular ${label} transitions`, (t) => {
  const { field, advance, complete } = fixture(t);
  const beat = (n) => ({ pts: points(n), groups: [{ name: 'kept', count: Math.floor(n / 2) }, { name: 'rebuilt', count: n - Math.floor(n / 2) }], hold: Infinity, cloud });
  field.show({ beats: [{ ...beat(first), segment: 0 }, { ...beat(second), segment: 1 }] }, first, 1, { instant: true });
  field.goto(1); advance(120); complete(second);
  // Automatic changes also exercise partial-cloud matching, unlike goto().
  field.show({ beats: [{ ...beat(first), segment: 0, hold: 0, shimmer: true }, { ...beat(second), segment: 1 }] }, first, 1, { instant: true });
  advance(150); complete(second);
});

test('growth retains drones still leaving after an interrupted shrink', (t) => {
  const { field, advance, complete } = fixture(t);
  field.show(scene(1001), 1001, 1, { instant: true });
  field.show(scene(100), 100); advance(4);
  assert.equal(window.__showTrace.at(-1)[4], 1001, 'the old tail is still airborne');
  field.show(scene(11761), 11761); advance(120); complete(11761);
  field.show(scene(300), 300); advance(120); complete(300);
});
