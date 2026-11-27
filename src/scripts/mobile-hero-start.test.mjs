import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { mobileHeroStart } from './mobile-hero-start.ts';

const fallback = { src: '/mobile-h264.mp4', codec: 'h264' };
const preferred = { src: '/mobile-av1.mp4', codec: 'av1', contentType: 'video/mp4', width: 640, height: 360, bitrate: 390000, fps: 25 };

function start({ first = true, reduced = false, saveData = false, paused = false, hidden = false, redirecting = false, wide = false, hash = '', navigation = 'navigate', supportAV1 = false, probe } = {}) {
  let notify;
  class Observer {
    constructor(callback) { notify = callback; }
    observe() {}
    disconnect() {}
  }
  const requests = [];
  const reel = {
    isConnected: true,
    dataset: { reelSources: JSON.stringify({ mobile: { preferred, fallback } }) },
    set src(value) { requests.push(value); },
  };
  const context = {
    window: { MutationObserver: Observer },
    MutationObserver: Observer,
    location: { hash },
    scrollY: 0,
    performance: { getEntriesByType: () => [{ type: navigation }] },
    document: {
      hidden,
      documentElement: {
        hasAttribute: () => redirecting,
        classList: { contains: () => paused },
      },
      querySelector: () => first ? reel : null,
      addEventListener() {},
    },
    navigator: {
      connection: { saveData },
      mediaCapabilities: { decodingInfo: probe ?? (async () => ({ supported: supportAV1, smooth: true, powerEfficient: true })) },
    },
    matchMedia: query => ({ matches: query.includes('reduced-motion') ? reduced : !wide }),
    setTimeout,
    clearTimeout,
  };
  runInNewContext(mobileHeroStart, context);
  notify?.();
  return { context, requests, reel };
}

test('the parser starts one prepared mobile rendition with the normal decoder decision', async () => {
  for (const supportAV1 of [false, true]) {
    const { requests, reel } = start({ supportAV1 });
    const expected = supportAV1 ? preferred : fallback;
    assert.equal((await reel.mobileRendition).src, expected.src);
    assert.deepEqual(requests, [expected.src]);
    assert.equal(reel.preload, 'auto');
  }
});

test('preparation skips restricted and potentially offscreen navigations', async () => {
  for (const options of [
    { reduced: true }, { saveData: true }, { paused: true }, { hidden: true },
    { redirecting: true }, { first: false }, { wide: true }, { hash: '#anfrage' }, { navigation: 'back_forward' },
  ]) {
    const { requests, reel } = start({ ...options, probe: () => assert.fail('unexpected codec probe') });
    assert.equal(reel.mobileRendition, undefined);
    assert.deepEqual(requests, []);
  }
});

test('a policy change while probing cancels the source assignment', async () => {
  let finish;
  const { context, requests, reel } = start({ probe: () => new Promise(resolve => { finish = resolve; }) });
  context.navigator.connection.saveData = true;
  finish({ supported: true, smooth: true, powerEfficient: true });
  assert.equal(await reel.mobileRendition, undefined);
  assert.deepEqual(requests, []);
});
