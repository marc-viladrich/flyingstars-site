import { createTranslator } from './ui.mjs';
import { localeFromPath, localizedHref, localeFormat } from './routing.mjs';
export function forPath(path: string) {
  const locale = localeFromPath(path);
  return { locale, t: createTranslator(locale), localHref: <T extends string | undefined>(href: T): T => (href === undefined ? href : localizedHref(href, locale)) as T, formatLocale: localeFormat(locale) };
}
