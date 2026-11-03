import test from 'node:test';
import assert from 'node:assert/strict';
import { whenNear } from './when-near.mjs';
function mockObserver(t, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
  globalThis.IntersectionObserver = value;
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'IntersectionObserver', previous);
    else delete globalThis.IntersectionObserver;
  });
}

test('optional modules wait for proximity, coalesce interaction triggers and clean up', async (t) => {
  let observer;
  mockObserver(t, class {
    constructor(callback, options) { this.callback = callback; this.options = options; observer = this; }
    observe(element) { this.element = element; }
    disconnect() { this.disconnected = true; }
  });
  const element = new EventTarget();
  let calls = 0;
  const go = whenNear(element, () => { calls++; return 'ready'; });
  assert.equal(calls, 0);
  assert.equal(observer.element, element);
  assert.deepEqual(observer.options, { rootMargin: '600px 0px' });
  observer.callback([{ isIntersecting: false }]);
  assert.equal(calls, 0);
  observer.callback([{ isIntersecting: true }]);
  element.dispatchEvent(new Event('focusin'));
  element.dispatchEvent(new Event('pointerdown'));
  assert.equal(await go(), 'ready');
  assert.equal(calls, 1);
  assert.equal(observer.disconnected, true);
  element.dispatchEvent(new Event('pointerenter'));
  assert.equal(await go(), 'ready');
  assert.equal(calls, 1);
});

test('failed downloads remain retryable', async (t) => {
  mockObserver(t, class { observe() {} disconnect() {} });
  let calls = 0;
  const go = whenNear(new EventTarget(), () => {
    if (++calls === 1) throw new Error('offline');
    return 'retried';
  });
  await assert.rejects(go(), /offline/);
  assert.equal(await go(), 'retried');
  assert.equal(calls, 2);
});

test('browsers without IntersectionObserver still enhance', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
  delete globalThis.IntersectionObserver;
  try {
    let calls = 0;
    const go = whenNear(new EventTarget(), () => ++calls);
    assert.equal(await go(), 1);
    assert.equal(calls, 1);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'IntersectionObserver', previous);
  }
});
