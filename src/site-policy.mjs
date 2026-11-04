// Production identity and old media identity are separate roles, even while they share a host.
export const PRODUCTION_ORIGIN='https://flyingstars.art';
export const DEFAULT_BUILD_ORIGIN='https://example.invalid';
export const LEGACY_MEDIA_ORIGIN='https://flyingstars.art';
export const LEGACY_MEDIA_HOSTS=[new URL(LEGACY_MEDIA_ORIGIN).hostname,'flyingstars-relaunch.vercel.app'];
export const mediaHosts=(configuredHost='media.example.invalid')=>[...new Set([configuredHost,...LEGACY_MEDIA_HOSTS])];
