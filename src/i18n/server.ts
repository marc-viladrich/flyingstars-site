import { createTranslator } from './ui.mjs';
import { localeFromPath, localizedHref, localeFormat } from './routing.mjs';
import { contactText } from '../content/contact.mjs';
import { factText } from '../content/show-extras.mjs';
/** localHref löst auch das redaktionelle Linkziel {{contact.phone.href}} auf (editorialHref im Editor-Adapter);
 * fact projiziert die freigegebenen Faktenplatzhalter in Beschriftungen (Kontakt, Dauer, Angebot, Projekte). */
export function forPath(path: string) {
  const locale = localeFromPath(path);
  return { locale, t: createTranslator(locale), localHref: <T extends string | undefined>(href: T): T => (href === undefined ? href : localizedHref(contactText(href), locale)) as T, fact: (text: string) => factText(text, locale) as string, formatLocale: localeFormat(locale) };
}
