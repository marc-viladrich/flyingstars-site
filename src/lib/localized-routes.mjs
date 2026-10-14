export const locales = ['de','en','nl'];
export const localeFormat = locale => ({de:'de-DE',en:'en-GB',nl:'nl-NL'}[locale] || 'de-DE');
export const localeFromPath = pathname => /^\/(en|nl)(?:\/|$)/.exec(pathname)?.[1] || 'de';
export const sourcePath = pathname => pathname.replace(/^\/(en|nl)(?=\/|$)/,'') || '/';
export function localizedHref(href, locale = 'de') {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return href;
  const path = sourcePath(href);
  if (/^\/(?:assets|media|_astro|api|editor)(?:\/|$)|\.[a-z0-9]+(?:[?#]|$)/i.test(path)) return href;
  return locale === 'de' ? path : `/${locale}${path}`;
}
