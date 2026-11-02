import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSENT_LIFETIME, DENIED, trackingConfig, consentRecord, readConsent, consentSignals } from '../lib/consent.mjs';

test('Tracking configuration fails closed on malformed IDs and orphan labels', () => {
  assert.deepEqual(trackingConfig(), { ga: '', ads: '', label: '' });
  for (const config of [{ ga: 'https://evil.test' }, { ads: 'G-123' }, { label: 'orphan' }, { ads: 'AW-123', label: '<script>' }]) assert.throws(() => trackingConfig(config));
});

test('Consent expires, rejects stale configurations, corrupt storage and invalid timestamps', () => {
  const config = trackingConfig({ ga: 'G-TEST123', ads: 'AW-123' });
  const now = 1000;
  const record = consentRecord({ analytics: true, ads: false }, config, now);
  assert.deepEqual(readConsent(JSON.stringify(record), config, now), record);
  assert.equal(readConsent(JSON.stringify(record), config, now + CONSENT_LIFETIME), null);
  assert.equal(readConsent(JSON.stringify(record), { ...config, ga: 'G-CHANGED' }, now), null);
  for (const value of [null, '{', 'null', JSON.stringify({ ...record, version: 0 }), JSON.stringify({ ...record, analytics: 'true' }), JSON.stringify({ ...record, expiresAt: Infinity }), JSON.stringify({ ...record, updatedAt: now + 1 })]) assert.equal(readConsent(value, config, now), null);
});

test('Separate purposes grant only configured services; personalization stays denied', () => {
  assert.deepEqual(consentSignals({ analytics: false, ads: false }), DENIED);
  assert.deepEqual(consentSignals({ analytics: true, ads: false }), { ...DENIED, analytics_storage: 'granted' });
  assert.deepEqual(consentSignals({ analytics: false, ads: true }), { ...DENIED, ad_storage: 'granted', ad_user_data: 'granted' });
  assert.equal(consentRecord({ analytics: true, ads: true }, trackingConfig({ ga: 'G-TEST' })).ads, false);
});
