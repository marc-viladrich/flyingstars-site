import test from 'node:test';
import assert from 'node:assert/strict';
import { videoWanted, createPlayback } from './video-controller.ts';
import { subscribeMotionPolicy } from './motion-policy.ts';
const policy = { reduced: false, globalPaused: false, pageVisible: true, saveData: false };
const state = { trigger: 'ambient', policy, visible: true, choice: null, hovered: false, touch: false, wide: true };
const tick = () => new Promise(resolve => setImmediate(resolve));
class Video extends EventTarget {
  src = ''; plays = 0; pauses = 0; resolve; reject;
  play() { this.plays++; return new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); }
  pause() { this.pauses++; }
}
test('Alle Startarten folgen Sichtbarkeit, globaler Pause, reduced motion und Save-Data', () => {
  assert.equal(videoWanted(state), true);
  for (const trigger of ['ambient', 'manual', 'hover']) {
    const active = { ...state, trigger, hovered: true };
    assert.equal(videoWanted({ ...active, visible: false }), false);
    for (const [key, value] of [['globalPaused', true], ['pageVisible', false], ['reduced', true], ['saveData', true]]) assert.equal(videoWanted({ ...active, policy: { ...policy, [key]: value } }), false);
  }
  assert.equal(videoWanted({ ...state, trigger: 'hover' }), false);
  assert.equal(videoWanted({ ...state, trigger: 'hover', touch: true }), true);
  assert.equal(videoWanted({ ...state, trigger: 'manual', wide: false }), false);
  assert.equal(videoWanted({ ...state, trigger: 'manual', choice: true, wide: false, policy: { ...policy, reduced: true, saveData: true } }), true);
  for (const change of [{ globalPaused: true }, { pageVisible: false }]) assert.equal(videoWanted({ ...state, trigger: 'manual', choice: true, policy: { ...policy, ...change } }), false);
});
test('Spätes play nach Pause, neuem Wunsch und Dispose kann keinen falschen Playing-Zustand setzen', async () => {
  const v = new Video(), states = []; let loads = 0;
  const p = createPlayback(v, { source: () => { loads++; return '/film.mp4'; }, onState: on => states.push(on) });
  p.update(true); p.update(true); await tick(); assert.equal(v.plays, 1);
  const first = v.resolve;
  p.update(false); first(); await tick(); assert.equal(states.at(-1), false); assert.ok(v.pauses >= 2);
  p.update(true); await tick(); const second = v.resolve;
  p.update(false); p.update(true); await tick(); const third = v.resolve;
  second(); await tick(); assert.equal(states.at(-1), false);
  third(); await tick(); assert.equal(states.at(-1), true); assert.equal(loads, 1);
  p.update(false); p.update(true); await tick(); const last = v.resolve;
  p.dispose(); last(); await tick(); assert.equal(states.at(-1), false);
});
test('Abgelehntes Play und Medienfehler bleiben ehrlich und retry-sicher', async () => {
  const v = new Video(), states = []; let errors = 0;
  const p = createPlayback(v, { source: () => '/film.mp4', onState: on => states.push(on), onError: () => errors++ });
  p.update(false); assert.equal(v.src, '');
  p.update(true); await tick(); v.reject(new Error('blocked')); await tick(); assert.equal(states.at(-1), false);
  p.update(true); await tick(); v.dispatchEvent(new Event('error')); v.resolve(); await tick();
  assert.equal(errors, 1); assert.equal(states.at(-1), false);
  const calls = v.plays; p.update(true); await tick(); assert.equal(v.plays, calls);
  p.dispose(); v.dispatchEvent(new Event('error')); assert.equal(errors, 1);
});
test('Ein Policy-Abonnement pro Browser, dynamische Änderungen und vollständige Abmeldung', () => {
  class Tracked extends EventTarget { registrations = 0; addEventListener(...a) { this.registrations++; super.addEventListener(...a); } removeEventListener(...a) { this.registrations--; super.removeEventListener(...a); } }
  const doc = new Tracked(), query = new Tracked(), connection = new Tracked();
  let paused = false, observer;
  doc.documentElement = { classList: { contains: () => paused } }; doc.hidden = false; query.matches = false; connection.saveData = false;
  const saved = Object.fromEntries(['document','navigator','matchMedia','MutationObserver'].map(k => [k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: doc }, navigator: { configurable: true, value: { connection } }, matchMedia: { configurable: true, value: () => query },
    MutationObserver: { configurable: true, value: class { constructor(callback) { observer=this; this.callback=callback; } observe() {} disconnect() { this.disconnected=true; } } },
  });
  try {
    const first=[], second=[]; const a=subscribeMotionPolicy(p=>first.push(p)); const b=subscribeMotionPolicy(p=>second.push(p));
    assert.equal(doc.registrations,2); assert.equal(query.registrations,1); assert.equal(connection.registrations,1);
    doc.hidden=true; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(first.at(-1).pageVisible,false);
    query.matches=true; query.dispatchEvent(new Event('change')); assert.equal(second.at(-1).reduced,true);
    paused=true; observer.callback(); assert.equal(first.at(-1).globalPaused,true);
    connection.saveData=true; connection.dispatchEvent(new Event('change')); assert.equal(second.at(-1).saveData,true);
    a(); assert.equal(doc.registrations,2); b(); assert.equal(doc.registrations,0); assert.equal(query.registrations,0); assert.equal(connection.registrations,0); assert.equal(observer.disconnected,true);
  } finally { for (const [k,d] of Object.entries(saved)) if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k]; }
});
