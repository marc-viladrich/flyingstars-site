import {translatorFor} from './ui-core.mjs';
import messages from './ui.json' with { type: 'json' };
import { LOCALES } from './routing.mjs';
const server = import.meta.env?.SSR ?? (typeof process !== 'undefined' && Boolean(process.versions?.node));
// Im Browser liegt das Wörterbuch der Seitensprache schon global bereit: /media/i18n/<sprache>.js, ein klassisches
// Skript mit defer im <head> (Base.astro), läuft vor allen Modul-Skripten. Kein Top-Level-await (Runde 23): Safari bis
// 26.6 wertet parallel importierte Module mit Top-Level-await fehlerhaft aus (WebKit-Bug 242740), dort lud u. a. der
// Konfigurator gar nicht.
function dictionary() {
  if (server) return messages;
  const browser = globalThis.__FS_UI__;
  if (!browser) throw new Error('UI-Wörterbuch fehlt: /media/i18n/<sprache>.js wurde nicht vor den Modulen geladen');
  return browser;
}
/** Build-time projection; browser consumers do not receive the other languages. */
export function messagesForLocale(locale) {
  if (!LOCALES.includes(locale)) throw new Error(`Unknown UI locale: ${locale}`);
  return Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, { [locale]: value[locale] }]));
}

/** No HTML interpolation. Callers render links/emphasis, values are plain text.
 * @returns {((key: string, values?: Record<string, unknown>) => string) & {afeAddress: (key: string) => {owner:{collection:string,id:string},part:string,path:string[],mode:string}}}
 */
export function createTranslator(locale = 'de') { return translatorFor(dictionary(),locale); }

/** Browser modules (including lazy scene builders); safe for deterministic Node unit tests. */
export function t(key, values = {}) {
  const language = typeof document === 'undefined' ? undefined : document.documentElement?.lang;
  const locale = LOCALES.includes(language) ? language : 'de';
  return createTranslator(locale)(key, values);
}
