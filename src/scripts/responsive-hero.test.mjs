import test from 'node:test';
import assert from 'node:assert/strict';
import { mountResponsiveHero } from './responsive-hero.ts';
import { VIDEO_MOBILE_QUERY } from './video-controller.ts';
import { UPGRADE_STABLE_MS } from './hero-video-sizing.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
const pair = width => {
  const rendition = codec => ({ id: `${codec}-${width}`, src: `/${codec}-${width}.mp4`, codec, width, height: width * 9 / 16, fps: 25, bitrate: 100000, contentType: `video/mp4; codecs="${codec}"` });
  return { preferred: rendition('av1'), fallback: rendition('h264') };
};
const sources = { desktop: [pair(960), pair(1280), pair(1440)], mobile: pair(640) };

test('Responsive hero uses the real controller and bounded source lifecycle', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  class Query extends EventTarget { matches = false; change(value) { this.matches = value; this.dispatchEvent(new Event('change')); } }
  const reduced = new Query(), mobile = new Query(), pointer = new Query(), widthQuery = new Query();
  widthQuery.matches = true; pointer.matches = true;
  const doc = new EventTarget(), win = new EventTarget(), connection = new EventTarget();
  const classes = new Set(); let visibleCallback, observerCount = 0, decodingInfo;
  const classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) };
  doc.documentElement = { classList }; doc.hidden = false; connection.saveData = false;
  const fixture = {
    document: doc, window: win,
    navigator: { connection, mediaCapabilities: { decodingInfo: config => decodingInfo(config) } },
    matchMedia: query => query === '(prefers-reduced-motion: reduce)' ? reduced : query === VIDEO_MOBILE_QUERY ? mobile : query.includes('pointer') ? pointer : widthQuery,
    getComputedStyle: () => ({ objectFit: 'cover' }),
    MutationObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class { constructor(callback) { observerCount++; visibleCallback = value => callback([{ isIntersecting: value, intersectionRatio: value ? 1 : 0 }]); } observe() {} disconnect() { observerCount--; } },
    ResizeObserver: class { observe() {} disconnect() {} },
  };
  win.IntersectionObserver = fixture.IntersectionObserver;
  const saved = Object.fromEntries(Object.keys(fixture).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(fixture)) Object.defineProperty(globalThis, key, { configurable: true, value });
  class Video extends EventTarget {
    _src = ''; requests = []; playTimes = []; currentTime = 0; duration = 16.72; readyState = 0; paused = true; width = 900; height = 500; autoMetadata = true; loads = 0;
    host = Object.assign(new EventTarget(), { classList, contains: () => false });
    get src() { return this._src; }
    set src(value) { this._src = value; if (value) this.requests.push(value); }
    closest() { return this.host; }
    getBoundingClientRect() { return { width: this.width, height: this.height }; }
    removeAttribute(name) { if (name === 'src') this._src = ''; }
    pause() { this.paused = true; }
    load() { this.loads++; this.readyState = 0; this.currentTime = 0; if (this.src && this.autoMetadata) queueMicrotask(() => this.metadata()); }
    metadata() { this.readyState = 1; this.dispatchEvent(new Event('loadedmetadata')); }
    play() { this.paused = false; this.readyState = 1; this.playTimes.push(this.currentTime); return Promise.resolve(); }
    resize(width, height = 500) { this.width = width; this.height = height; win.dispatchEvent(new Event('resize')); }
  }
  const reset = () => { classes.clear(); reduced.matches = false; mobile.matches = false; connection.saveData = false; doc.hidden = false; decodingInfo = async () => ({ supported: false }); };
  try {
    await t.test('no source/probe under policy block; first permitted request uses latest geometry', async () => {
      reset(); reduced.matches = true; let probes = 0; decodingInfo = async () => { probes++; return { supported: false }; };
      const video = new Video(), controller = await mountResponsiveHero(video, sources);
      visibleCallback(true); await tick(); video.resize(1300); await tick();
      assert.deepEqual(video.requests, []); assert.equal(probes, 0);
      reduced.change(false); await tick(); assert.deepEqual(video.requests, ['/h264-1280.mp4']);
      controller.dispose(); assert.equal(observerCount, 0);
    });
    await t.test('geometry changed during the AV1 probe uses current H264, without a second probe', async () => {
      reset(); let resolve, probes = 0; decodingInfo = () => { probes++; return new Promise(r => { resolve = r; }); };
      const video = new Video(), controller = await mountResponsiveHero(video, sources);
      visibleCallback(true); await tick(); video.resize(1300); resolve({ supported: true, smooth: true, powerEfficient: true }); await tick();
      assert.deepEqual(video.requests, ['/h264-1280.mp4']); assert.equal(probes, 1); controller.dispose();
    });
    await t.test('pause while probing cancels assignment; resume measures afresh', async () => {
      reset(); let resolve; decodingInfo = () => new Promise(r => { resolve = r; });
      const video = new Video(), controller = await mountResponsiveHero(video, sources, { trigger: 'manual' });
      visibleCallback(true); controller.setChoice(true); await tick(); controller.setChoice(false);
      resolve({ supported: true, smooth: true, powerEfficient: true }); await tick(); assert.deepEqual(video.requests, []);
      decodingInfo = async () => ({ supported: false }); video.resize(1300); controller.setChoice(true); await tick();
      assert.deepEqual(video.requests, ['/h264-1280.mp4']); controller.dispose();
    });
    await t.test('switch to mobile during the probe never assigns a desktop file', async () => {
      reset(); let resolve; decodingInfo = () => new Promise(r => { resolve = r; });
      const video = new Video(), controller = await mountResponsiveHero(video, sources);
      visibleCallback(true); await tick(); mobile.change(true); video.resize(390,244);
      resolve({ supported: true, smooth: true, powerEfficient: true }); await tick();
      assert.deepEqual(video.requests, ['/h264-640.mp4']); controller.dispose();
    });
    await t.test('hung AV1 probe falls back after the existing 250ms deadline', async () => {
      reset(); decodingInfo = () => new Promise(() => {});
      const video = new Video(), controller = await mountResponsiveHero(video, sources);
      visibleCallback(true); await tick(); t.mock.timers.tick(249); await tick(); assert.deepEqual(video.requests, []);
      t.mock.timers.tick(1); await tick(); assert.deepEqual(video.requests, ['/h264-960.mp4']); controller.dispose();
    });
    await t.test('stable growth makes exactly one upgrade, preserves time, never downsizes', async () => {
      reset(); const video = new Video(), controller = await mountResponsiveHero(video, sources);
      visibleCallback(true); await tick(); assert.deepEqual(video.requests, ['/h264-960.mp4']); video.currentTime = 6.4;
      video.resize(1300); t.mock.timers.tick(900); video.resize(1350); t.mock.timers.tick(999); await tick(); assert.equal(video.requests.length, 1);
      t.mock.timers.tick(1); await tick(); assert.deepEqual(video.requests, ['/h264-960.mp4','/h264-1440.mp4']); assert.equal(video.playTimes.at(-1), 6.4); assert.equal(observerCount, 1);
      for (const w of [900,1800,800,2000]) { video.resize(w); t.mock.timers.tick(UPGRADE_STABLE_MS); await tick(); }
      assert.equal(video.requests.length, 2); controller.dispose(); assert.equal(observerCount, 0);
    });
    await t.test('upgrade probe leaves old video playing and cancels on geometry or SaveData change', async () => {
      for (const block of ['geometry','saveData','dispose']) {
        reset(); const video = new Video(), controller = await mountResponsiveHero(video, sources, { trigger: 'manual' });
        visibleCallback(true); controller.setChoice(true); await tick(); video.currentTime = 3.5;
        let resolve; decodingInfo = () => new Promise(r => { resolve = r; });
        video.resize(1400); t.mock.timers.tick(UPGRADE_STABLE_MS); await tick();
        assert.equal(video.src, '/h264-960.mp4'); assert.equal(video.paused, false);
        if (block === 'geometry') video.resize(900);
        if (block === 'saveData') { connection.saveData = true; connection.dispatchEvent(new Event('change')); }
        if (block === 'dispose') controller.dispose();
        resolve({ supported: true, smooth: true, powerEfficient: true }); await tick(); assert.equal(video.requests.length, 1, block);
        if (block !== 'dispose') controller.dispose();
      }
    });
    await t.test('upgraded AV1 needs its own positive decoder report and has a matching real-error fallback', async () => {
      for (const efficient of [true,false]) {
        reset(); const probes = []; decodingInfo = async config => { probes.push(config.video.width); return { supported: true, smooth: true, powerEfficient: config.video.width === 960 || efficient }; };
        const video = new Video(), controller = await mountResponsiveHero(video, sources); visibleCallback(true); await tick(); video.currentTime = 9.3;
        video.resize(1400); t.mock.timers.tick(UPGRADE_STABLE_MS); await tick();
        assert.deepEqual(probes, [960,1440]); assert.equal(video.src, efficient ? '/av1-1440.mp4' : '/h264-1440.mp4'); assert.equal(video.playTimes.at(-1), 9.3);
        if (efficient) { video.dispatchEvent(new Event('error')); await tick(); assert.equal(video.src, '/h264-1440.mp4'); assert.equal(video.playTimes.at(-1), 9.3); }
        video.resize(1900); t.mock.timers.tick(UPGRADE_STABLE_MS); await tick(); assert.equal(video.requests.length, efficient ? 3 : 2); controller.dispose();
      }
    });
    await t.test('manual pause survives resize; resumed 1280 never buys a marginal 1440 upgrade', async () => {
      reset(); const video = new Video(); video.width = 1300;
      const controller = await mountResponsiveHero(video, sources, { trigger: 'manual' });
      visibleCallback(true); controller.setChoice(true); await tick(); video.currentTime = 4;
      controller.setChoice(false); video.resize(1900); t.mock.timers.tick(5000); await tick();
      assert.equal(video.playTimes.length, 1); assert.deepEqual(video.requests, ['/h264-1280.mp4']);
      controller.setChoice(true); await tick(); t.mock.timers.tick(UPGRADE_STABLE_MS); await tick();
      assert.equal(video.playTimes.at(-1), 4); assert.equal(video.requests.length, 1); controller.dispose();
    });
    await t.test('SaveData, reduced motion, global pause, hidden tab and offscreen block pending upgrades', async () => {
      for (const block of ['saveData','reduced','globalPaused','pageVisible','visible']) {
        reset(); const video = new Video(), controller = await mountResponsiveHero(video, sources, { trigger: 'manual' });
        visibleCallback(true); controller.setChoice(true); await tick(); video.resize(1400);
        if (block === 'saveData') { connection.saveData = true; connection.dispatchEvent(new Event('change')); }
        if (block === 'reduced') reduced.change(true);
        if (block === 'globalPaused') { classes.add('motion-paused'); doc.dispatchEvent(new Event('flyingstars:motion-change')); }
        if (block === 'pageVisible') { doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); }
        if (block === 'visible') visibleCallback(false);
        t.mock.timers.tick(UPGRADE_STABLE_MS); await tick(); assert.equal(video.requests.length, 1, block); controller.dispose();
      }
    });
    await t.test('real AV1 error retries H264 at each size once, preserving time and controller', async () => {
      for (const size of [640,960,1280,1440]) {
        reset(); mobile.matches = size === 640; decodingInfo = async () => ({ supported: true, smooth: true, powerEfficient: true });
        const video = new Video(); video.width = size; video.height = 400;
        const controller = await mountResponsiveHero(video, sources, { trigger: 'manual' }); visibleCallback(true); controller.setChoice(true); await tick();
        assert.equal(video.src, `/av1-${size}.mp4`); video.currentTime = 7.2;
        video.dispatchEvent(new Event('error')); assert.equal(video.src, `/av1-${size}.mp4`);
        await tick(); assert.equal(video.src, `/h264-${size}.mp4`); assert.equal(video.playTimes.at(-1), 7.2); assert.equal(observerCount, 1);
        video.dispatchEvent(new Event('error')); await tick(); assert.equal(video.requests.length, 2); controller.dispose();
      }
    });
    await t.test('pause between AV1 failure and fallback does not request or restart playback', async () => {
      reset(); decodingInfo = async () => ({ supported: true, smooth: true, powerEfficient: true });
      const video = new Video(), controller = await mountResponsiveHero(video, sources, { trigger: 'manual' });
      visibleCallback(true); controller.setChoice(true); await tick(); video.currentTime = 5.1;
      video.dispatchEvent(new Event('error')); controller.setChoice(false); await tick();
      assert.equal(video.requests.length, 1); assert.equal(video.playTimes.length, 1);
      controller.setChoice(true); await tick(); assert.equal(video.src, '/h264-960.mp4'); assert.equal(video.playTimes.at(-1), 5.1); controller.dispose();
    });
    await t.test('a decoder NotSupportedError falls back, while an autoplay denial does not retry', async () => {
      for (const name of ['NotSupportedError','NotAllowedError']) {
        reset(); decodingInfo = async () => ({ supported: true, smooth: true, powerEfficient: true });
        const video = new Video(), play = video.play.bind(video);
        video.play = () => video.src.startsWith('/av1') ? Promise.reject(Object.assign(new Error('play rejected'), { name })) : play();
        const controller = await mountResponsiveHero(video, sources); visibleCallback(true); await tick();
        assert.equal(video.src, name === 'NotSupportedError' ? '/h264-960.mp4' : '/av1-960.mp4'); controller.dispose();
      }
    });
    await t.test('pause/dispose during replacement metadata wait cannot restart playback', async () => {
      reset(); const video = new Video(), controller = await mountResponsiveHero(video, sources, { trigger: 'manual' });
      visibleCallback(true); controller.setChoice(true); await tick(); video.currentTime = 8.2; video.autoMetadata = false;
      video.resize(1400); t.mock.timers.tick(UPGRADE_STABLE_MS); await tick(); assert.equal(video.requests.length, 2); assert.equal(video.playTimes.length, 1);
      controller.setChoice(false); video.metadata(); await tick(); assert.equal(video.playTimes.length, 1);
      controller.setChoice(true); await tick(); assert.equal(video.playTimes.at(-1), 8.2);
      controller.dispose(); video.metadata(); await tick(); assert.equal(video.playTimes.length, 2); assert.equal(observerCount, 0);
    });
    await t.test('resuming before replacement metadata does not restart its download', async () => {
      reset(); const video = new Video(), controller = await mountResponsiveHero(video, sources, { trigger: 'manual' });
      visibleCallback(true); controller.setChoice(true); await tick(); video.currentTime = 10.4; video.autoMetadata = false;
      video.resize(1400); t.mock.timers.tick(UPGRADE_STABLE_MS); await tick(); const loads = video.loads;
      controller.setChoice(false); controller.setChoice(true); await tick(); assert.equal(video.loads, loads); assert.equal(video.playTimes.length, 1);
      video.metadata(); await tick(); assert.equal(video.playTimes.at(-1), 10.4); assert.equal(video.requests.length, 2); controller.dispose();
    });
    await t.test('mobile source remains 640 until stable desktop growth, then jumps once to 1440', async () => {
      reset(); mobile.matches = true; const video = new Video(); video.width = 390; video.height = 244;
      const controller = await mountResponsiveHero(video, sources); visibleCallback(true); await tick(); assert.equal(video.src, '/h264-640.mp4');
      mobile.change(false); video.resize(900, 640); t.mock.timers.tick(UPGRADE_STABLE_MS); await tick(); assert.equal(video.src, '/h264-1440.mp4');
      mobile.change(true); video.resize(390, 244); t.mock.timers.tick(UPGRADE_STABLE_MS); await tick(); assert.equal(video.requests.length, 2); controller.dispose();
    });
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});
