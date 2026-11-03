import test from 'node:test';
import assert from 'node:assert/strict';
import { fittedVideoWidth, selectHeroPair, heroUpgrade, UPGRADE_STABLE_MS } from './hero-video-sizing.ts';

const pair = width => ({ preferred: { width, height: width * 9 / 16, codec: 'av1' }, fallback: { width, height: width * 9 / 16, codec: 'h264' } });
const sources = { desktop: [pair(960), pair(1280), pair(1440)], mobile: pair(640) };
test('cover uses both real element dimensions, contain uses the fitted image', () => {
  assert.equal(fittedVideoWidth(800, 720, 16 / 9, 'cover'), 1280);
  assert.ok(Math.abs(fittedVideoWidth(1440, 600, 16 / 9, 'contain') - 600 * 16 / 9) < .0001);
  assert.equal(fittedVideoWidth(1440, 600, 16 / 9, 'fill'), 1440);
});
test('initial tiers allow at most 10 percent upscale and never multiply by DPR', () => {
  for (const [width, expected] of [[900,960],[1056,960],[1057,1280],[1280,1280],[1408,1280],[1409,1440],[2400,1440]]) {
    assert.equal(selectHeroPair(sources, false, width, 400, 'cover').fallback.width, expected);
  }
  // A 960px viewport can still need 1280 because the 64%-wide video covers a 720px-tall hero.
  assert.equal(selectHeroPair(sources, false, 960 * .64, 720, 'cover').fallback.width, 1280);
  assert.equal(selectHeroPair(sources, false, 800, 900, 'cover').fallback.width, 1440);
  assert.equal(selectHeroPair(sources, true, 600, 375, 'cover').fallback.width, 640);
});
test('upgrade skips intermediate downloads, excludes small gains and never downsizes', () => {
  assert.equal(UPGRADE_STABLE_MS, 1000);
  assert.equal(heroUpgrade(sources, sources.desktop[0].fallback, false, 1200, 500, 'cover'), undefined);
  assert.equal(heroUpgrade(sources, sources.desktop[0].fallback, false, 1201, 500, 'cover').fallback.width, 1440);
  assert.equal(heroUpgrade(sources, sources.mobile.fallback, false, 900, 500, 'cover').fallback.width, 1440);
  assert.equal(heroUpgrade(sources, sources.desktop[1].fallback, false, 1900, 900, 'cover'), undefined);
  assert.equal(heroUpgrade(sources, sources.desktop[2].fallback, false, 3000, 1000, 'cover'), undefined);
  assert.equal(heroUpgrade(sources, sources.desktop[2].fallback, true, 350, 200, 'cover'), undefined);
});
