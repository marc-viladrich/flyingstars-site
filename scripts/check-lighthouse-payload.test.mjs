import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPayload} from './check-lighthouse-payload.mjs';
const budget = {nonMediaBytes: 1000000, approvedMedia: {path: '/hero.mp4', bytes: 2842185, transferBuffer: 0.02}};
const report = (nonMedia, media = 2842546, url = '/hero.mp4') => ({audits: {
  'network-requests': {details: {items: media ? [{resourceType: 'Media', url: `https://site.test${url}`, transferSize: media}] : []}},
  'total-byte-weight': {numericValue: nonMedia + media},
}});
test('Only the approved video is exempt from the unchanged non-media budget', () => {
  assert.deepEqual(checkPayload(report(1000000), budget), {nonMediaBytes: 1000000, mediaBytes: 2842546});
  assert.throws(() => checkPayload(report(1000001), budget), /Nicht-Media/);
  assert.throws(() => checkPayload(report(1, 2899030), budget), /Hero-Video/);
  assert.throws(() => checkPayload(report(1, 1, '/other.mp4'), budget), /Nicht freigegebene/);
  assert.deepEqual(checkPayload(report(1000000, 0), budget), {nonMediaBytes: 1000000, mediaBytes: 0});
});
