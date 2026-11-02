// One storage record for all languages. Bump the version when purposes change.
export const CONSENT_VERSION = 1;
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

export function consentRecord(choices, config, now = Date.now()) {
  return {
    version: CONSENT_VERSION, config: JSON.stringify(config),
    analytics: Boolean(config.ga && choices.analytics), ads: Boolean(config.ads && choices.ads),
    updatedAt: now, expiresAt: now + CONSENT_LIFETIME,
  };
}

/** Storage is an external boundary: old, corrupt or future-dated records deny access. */
export function readConsent(raw, config, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== CONSENT_VERSION || value.config !== JSON.stringify(config)
      || typeof value.analytics !== 'boolean' || typeof value.ads !== 'boolean'
      || !Number.isFinite(value.updatedAt) || !Number.isFinite(value.expiresAt)
      || value.updatedAt > now || value.expiresAt <= now
      || value.expiresAt - value.updatedAt !== CONSENT_LIFETIME) return null;
    return consentRecord(value, config, value.updatedAt);
  } catch { return null; }
}

export function consentSignals(choices) {
  return {
    ...DENIED,
    analytics_storage: choices.analytics ? 'granted' : 'denied',
    ad_storage: choices.ads ? 'granted' : 'denied',
    ad_user_data: choices.ads ? 'granted' : 'denied',
    // No remarketing/personalized advertising in this prototype.
  };
}
