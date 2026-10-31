import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { Swarm } from './swarm.js';

let now;
let reduced;
let paused;

beforeEach(() => {
  now = 1000; reduced = false; paused = false;
  const globals = {
    matchMedia: () => ({ matches: reduced }),
    document: { documentElement: { classList: { contains: () => paused } } },
    requestAnimationFrame: () => 1,
    devicePixelRatio: 1,
    ResizeObserver: class { observe() {} },
    IntersectionObserver: class { observe() {} },
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    restorers.push(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  mock.method(performance, 'now', () => now);
});

const restorers = [];
afterEach(() => { mock.restoreAll(); while (restorers.length) restorers.pop()(); });

function settledSwarm() {
  const sw = new Swarm({
    getContext: () => null,
    getBoundingClientRect: () => ({ width: 600, height: 450 }),
  }, { count: 3 });
  sw.draw = () => {};
  sw.set([{ x: 0.7, y: 0.2 }, { x: -0.3, y: 0.4 }, { x: 0.4, y: -0.2 }], { mode: 'direct' });
  sw.frame(now + 1);
  return sw;
}

test('a turn can replace a cloud already in progress without jumping', () => {
  const sw = settledSwarm();
  sw.retarget(4000);
  sw.tx[0] = -0.7;
  now += 1500;
  sw.frame(now);
  const before = [...sw.x];
  sw.dynamic = (_T, tx, _ty, renderer) => { renderer.retarget(3200); tx[0] = 0.9; };
  now += 16;
  sw.frame(now);
  assert.deepEqual([...sw.x], before);
});

test('a retarget timestamp slightly after the animation timestamp cannot extrapolate before its source', () => {
  const sw = settledSwarm();
  const before = [...sw.x];
  sw.dynamic = (_T, tx, _ty, renderer) => { renderer.retarget(3200); tx[0] = -0.7; };
  now += 20;
  sw.frame(now - 4);
  assert.deepEqual([...sw.x], before);
  assert.equal(sw.b[0], 1, 'a negative progress value must not amplify the starting light');
});

for (const preference of ['reduced', 'paused']) {
  test(`${preference} motion uses the new pose directly without starting a cloud`, () => {
    const sw = settledSwarm();
    if (preference === 'reduced') reduced = true;
    else paused = true;
    sw.dynamic = (_T, tx, _ty, renderer) => { renderer.retarget(3200); tx[0] = -0.7; };
    now += 20;
    sw.frame(now);
    assert.equal(sw.x[0], sw.tx[0]);
    assert.equal(sw.b[0], 1);
    assert.equal(sw.mode, 'direct');
  });
}

for (const frameStep of [1000 / 30, 1000 / 60, 1000 / 120]) {
  test(`a dynamic turn starts at the rendered positions without a one-frame mirror at ${Math.round(1000 / frameStep)} fps`, () => {
    const sw = settledSwarm();
    const beforeX = [...sw.x], beforeY = [...sw.y];
    let turn = true;
    sw.dynamic = (_T, tx, _ty, renderer) => {
      if (!turn) return;
      turn = false;
      renderer.retarget(3200);
      for (let i = 0; i < tx.length; i++) tx[i] *= -1;
    };
    now += frameStep;
    sw.frame(now);
    assert.deepEqual([...sw.x], beforeX, 'turn frame must preserve the visible source, not flash the mirrored target');
    assert.deepEqual([...sw.y], beforeY);
    now += frameStep;
    sw.frame(now);
    const step = Math.max(...sw.x.map((x, i) => Math.hypot(x - beforeX[i], sw.y[i] - beforeY[i])));
    assert.ok(step < 0.01, `the next cloud frame must stay continuous, got ${step}`);
    now += 3200;
    sw.frame(now);
    assert.deepEqual([...sw.x], beforeX.map(x => -x), 'the cloud must finish at the mirrored target');
  });
}
