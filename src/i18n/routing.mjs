/** Locale and URL identities. Content IDs/slugs, anchors, query values and assets stay stable. */
export const LOCALES = ['de', 'en', 'nl'];
export const LOCALE_NAMES = { de: 'Deutsch', en: 'English', nl: 'Nederlands' };
export const localeFromPath = (path) => /^\/(en|nl)(?:\/|$)/.exec(path)?.[1] ?? 'de';
export const localeOfId = (id) => /^(en|nl)\//.exec(id)?.[1] ?? 'de';
export const sourceId = (id) => id.replace(/^(en|nl)\//, '');
export const sourcePath = (path) => path.replace(/^\/(en|nl)(?=\/|[?#]|$)/, '') || '/';
export const localeFormat = (locale) => ({ de: 'de-DE', en: 'en-GB', nl: 'nl-NL' })[locale] ?? 'de-DE';
export function localizedHref(href, locale = 'de') {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return href;
  const path = sourcePath(href);
  // API requests and media never receive a language prefix.
  if (/^\/(?:api|_astro|brand|fonts|media|poc)(?:\/|[?#]|$)|\.[a-z0-9]+(?:[?#]|$)/i.test(path)) return href;
  return locale === 'de' ? path : `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}
export const entryPath = (id) => localizedHref(sourceId(id) === 'index' ? '/' : `/${sourceId(id)}/`, localeOfId(id));
