// The library owns the only consent record. Revision also binds it to the public targets.
export const CONSENT_VERSION = 2;
export const CONSENT_KEY = 'flyingstars:consent';
export const CONSENT_LIFETIME = 180 * 24 * 60 * 60 * 1000;
export const DENIED = Object.freeze({
  analytics_storage: 'denied', ad_storage: 'denied',
  ad_user_data: 'denied', ad_personalization: 'denied',
});

/** Public build-time identifiers, never account credentials. No implicit GTM container. */
export function trackingConfig({ ga = '', ads = '', label = '' } = {}) {
  for (const [name, value, pattern] of [
    ['PUBLIC_GA_ID', ga, /^G-[A-Z0-9]+$/],
    ['PUBLIC_GOOGLE_ADS_ID', ads, /^AW-\d+$/],
    ['PUBLIC_GOOGLE_ADS_LABEL', label, /^[A-Za-z0-9_-]+$/],
  ]) {
    if (value && !pattern.test(value)) throw new Error(`Invalid ${name}`);
  }
  if (label && !ads) throw new Error('PUBLIC_GOOGLE_ADS_LABEL requires PUBLIC_GOOGLE_ADS_ID');
  return { ga, ads, label };
}

export function consentRevision(config) {
  let hash = 2166136261;
  for (const char of JSON.stringify([CONSENT_VERSION, config.ga, config.ads, config.label])) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

/** Validate the library's persistent record at the storage boundary and before events. */
export function readConsent(raw, config, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    const updated = Date.parse(value?.lastConsentTimestamp);
    const created = Date.parse(value?.consentTimestamp);
    if (value?.revision !== consentRevision(config) || typeof value.consentId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.consentId)
      || !Array.isArray(value.categories)
      || !value.categories.includes('necessary')
      || value.categories.some((category) => !['necessary', 'analytics', 'marketing'].includes(category))
      || !Number.isFinite(created) || created > updated || !Number.isFinite(updated) || updated > now
      || !Number.isFinite(value.expirationTime) || value.expirationTime <= now
      || Math.abs(value.expirationTime - updated - CONSENT_LIFETIME) > 1000) return null;
    return {
      analytics: Boolean(config.ga && value.categories.includes('analytics')),
      marketing: Boolean(config.ads && value.categories.includes('marketing')),
      expiresAt: value.expirationTime,
    };
  } catch { return null; }
}

export function consentSignals(choices) {
  return {
    ...DENIED,
    analytics_storage: choices.analytics ? 'granted' : 'denied',
    ad_storage: choices.marketing ? 'granted' : 'denied',
    ad_user_data: choices.marketing ? 'granted' : 'denied',
    // No remarketing or personalized advertising, including after accepting all.
  };
}
