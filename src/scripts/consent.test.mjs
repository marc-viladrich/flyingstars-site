import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSENT_LIFETIME, DENIED, trackingConfig, consentRevision, readConsent, consentSignals } from '../lib/consent.mjs';

test('Tracking configuration rejects malformed IDs and account IDs', () => {
  assert.deepEqual(trackingConfig(), { ga: '', ads: '', label: '' });
  for (const config of [{ ga: '194466424' }, { ads: '281-224-6991' }, { ga: 'https://evil.test' }, { ads: 'G-123' }, { label: 'orphan' }, { ads: 'AW-123', label: '<script>' }]) assert.throws(() => trackingConfig(config));
});

test('Library records expire and revisions bind consent to purposes and public targets', () => {
  const config = trackingConfig({ ga: 'G-TEST123', ads: 'AW-123' });
  const now = Date.now();
  const record = { consentId: '12345678-1234-4123-8123-123456789abc', revision: consentRevision(config), categories: ['necessary', 'analytics'], consentTimestamp: new Date(now).toISOString(), lastConsentTimestamp: new Date(now).toISOString(), expirationTime: now + CONSENT_LIFETIME };
  assert.deepEqual(readConsent(JSON.stringify(record), config, now), { analytics: true, marketing: false, expiresAt: record.expirationTime });
  assert.equal(readConsent(JSON.stringify(record), config, now + CONSENT_LIFETIME), null);
  assert.equal(readConsent(JSON.stringify(record), { ...config, ga: 'G-CHANGED' }, now), null);
  assert.equal(readConsent(JSON.stringify(record), { ...config, label: 'CHANGED' }, now), null);
  for (const value of [null, '{', 'null', JSON.stringify({ ...record, revision: 0 }), JSON.stringify({ ...record, consentId: null }), JSON.stringify({ ...record, categories: ['necessary', 'unknown'] }), JSON.stringify({ ...record, expirationTime: Infinity }), JSON.stringify({ ...record, lastConsentTimestamp: new Date(now + 1).toISOString() })]) assert.equal(readConsent(value, config, now), null);
});

test('Separate purposes grant only their signals; personalization stays denied', () => {
  assert.deepEqual(consentSignals({ analytics: false, marketing: false }), DENIED);
  assert.deepEqual(consentSignals({ analytics: true, marketing: false }), { ...DENIED, analytics_storage: 'granted' });
  assert.deepEqual(consentSignals({ analytics: false, marketing: true }), { ...DENIED, ad_storage: 'granted', ad_user_data: 'granted' });
});
