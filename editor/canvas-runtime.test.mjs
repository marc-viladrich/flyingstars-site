import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { rgbOf } from '../src/lib/color-tokens.mjs';
import { registerCanvas } from '../src/scripts/canvas-runtime.mjs';

function environment(t) {
  const observers = [], frames = new Map(); let frameId = 0;
  class Observer {
    targets = [];
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target, options) { this.targets.push({ target, options }); }
    disconnect() { this.targets = []; }
  }
  const scope = new EventTarget(), button = new EventTarget(); scope.dataset = { runtime: 'one' };
  const makeCanvas = () => Object.assign(new EventTarget(), { nodeType: 1, isConnected: true, dataset: {}, closest: () => scope, matches: selector => selector === 'canvas', querySelector: () => null });
  const canvas = makeCanvas(), document = Object.assign(new EventTarget(), { documentElement: { classList: { toggle() {} } }, getElementById: () => null, querySelector: () => null, querySelectorAll: selector => ['canvas', 'canvas[data-orb]'].includes(selector) ? nodes.filter(node => node.isConnected) : [] });
  let nodes = [canvas];
  const prior = {};
  for (const [key, value] of Object.entries({ document, MutationObserver: Observer, requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame: id => frames.delete(id) })) {
    prior[key] = globalThis[key]; globalThis[key] = value;
  }
  t.after(() => { for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
  return { canvas, scope, button, frames, makeCanvas, document,
    attributes(target, attributeName) {
      for (const observer of [...observers]) if (observer.targets.some(item => item.target === target && item.options?.attributeFilter.includes(attributeName))) observer.callback([{ type: 'attributes', target, attributeName }]);
    },
    move() {
      for (const observer of observers) if (observer.targets.some(item => item.options?.childList)) observer.callback([{ addedNodes: nodes, removedNodes: nodes }]);
    },
    replace(next) {
      const removedNodes = nodes; removedNodes.forEach(node => node.isConnected = false); nodes = next;
      for (const observer of [...observers]) if (observer.targets.some(item => item.options?.childList)) observer.callback([{ addedNodes: next, removedNodes }]);
    }
  };
}

test('canvas settings reinitialize in place, preserve state, and release frames, observers and listeners', t => {
  const dom = environment(t); let mounts = 0, disposals = 0, clicks = 0;
  const stop = registerCanvas('canvas', (canvas, life, saved = 0) => {
    mounts++; life.preserve(() => saved + 1); life.cleanup(() => disposals++);
    life.listen(dom.button, 'click', () => { clicks += saved + 1; });
    life.observe({ observe() {}, disconnect() { disposals++; } }, canvas);
    life.raf(() => assert.fail('disposed frame executed'));
  }, { attributes: ['data-shape'], scope: 'section' });
  assert.equal(dom.canvas.dataset.nativeLive, 'true');
  dom.attributes(dom.canvas, 'data-shape');
  assert.equal(mounts, 2); assert.equal(disposals, 2); assert.equal(dom.frames.size, 1);
  dom.button.dispatchEvent(new Event('click')); assert.equal(clicks, 2);
  dom.attributes(dom.scope, 'data-runtime'); assert.equal(mounts, 3); assert.equal(dom.frames.size, 1);
  dom.canvas.dispatchEvent(new Event('native:canvas-update')); assert.equal(mounts, 4);
  stop(); assert.equal(dom.canvas.dataset.nativeLive, undefined); assert.equal(dom.frames.size, 0); assert.equal(disposals, 8);
  dom.button.dispatchEvent(new Event('click')); assert.equal(clicks, 2);
});

test('replacement starts a new controller, moving a connected canvas retains its controller', t => {
  const dom = environment(t); let mounts = 0, disposals = 0;
  const stop = registerCanvas('canvas', (_, life) => { mounts++; life.cleanup(() => disposals++); });
  dom.move(); assert.equal(mounts, 1); assert.equal(disposals, 0);
  const replacement = dom.makeCanvas(); dom.replace([replacement]);
  assert.equal(mounts, 2); assert.equal(disposals, 1); assert.equal(replacement.dataset.nativeLive, 'true');
  dom.attributes(replacement, 'data-running'); assert.equal(mounts, 2);
  stop(); assert.equal(disposals, 2);
});

test('actual site orb script re-reads shape, count and color on the same paused canvas', async t => {
  const controllers = [];
  t.after(() => controllers.forEach(stop => stop()));
  const dom = environment(t), draws = [], context = { clearRect() {}, beginPath() {}, fill() {}, arc(...args) { draws.push({ color: this.fillStyle, args }); } };
  Object.assign(dom.canvas, { dataset: { orb: 'sphere', n: '200', color: 'neon-violet' }, width: 96, height: 96,
    getBoundingClientRect: () => ({ width: 96, height: 96 }), getContext: () => context });
  const source = (await readFile(new URL('../src/scripts/site.ts', import.meta.url), 'utf8')).replace(/^import .+;$/gm, '');
  runInNewContext(source, {
    registerCanvas: (...args) => { const stop = registerCanvas(...args); controllers.push(stop); }, rgbOf,
    document: dom.document, window: {}, location: { hash: '' }, matchMedia: () => ({ matches: true }), Event,
    devicePixelRatio: 1, sessionStorage: { getItem: () => null },
    IntersectionObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} disconnect() {} },
  });
  assert.equal(draws.length, 200);
  const previousGeometry = draws.map(draw => draw.args.slice(0, 2));
  draws.length = 0;
  Object.assign(dom.canvas.dataset, { orb: 'torus', n: '230', color: 'neon-orange' });
  dom.attributes(dom.canvas, 'data-orb');
  assert.equal(draws.length, 230); // includes nonmultiples of 25, previously rounded down
  assert.ok(draws.every(draw => draw.color.startsWith('rgba(255,158,41,')));
  assert.notDeepEqual(draws.slice(0, 200).map(draw => draw.args.slice(0, 2)), previousGeometry);
  assert.equal(dom.canvas.dataset.nativeLive, 'true');
});
