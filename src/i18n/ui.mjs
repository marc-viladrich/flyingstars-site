import {translatorFor} from './ui-core.mjs';
import messages from './ui.json' with { type: 'json' };
import { LOCALES } from './routing.mjs';
const server = import.meta.env?.SSR ?? (typeof process !== 'undefined' && Boolean(process.versions?.node));
// Klassisches defer-Skript vor den Modulen, synchron gelesen (Runde 23, WebKit-Bug 242740).
function browserError(error) {
  // Auch dann sichtbar, wenn ein Aufrufer einen fehlgeschlagenen Lazy-Import abfängt.
  console.error(error);
}

/** No HTML interpolation. Callers render links/emphasis, values are plain text.
 * @returns {((key: string, values?: Record<string, unknown>) => string) & {afeAddress: (key: string) => {owner:{collection:string,id:string},part:string,path:string[],mode:string}}}
 */
export function createTranslator(locale = 'de') {
  if (server) return translatorFor(messages, locale);
  const browser = globalThis.__FS_UI__;
  if (!browser) {
    const error = new Error('UI-Wörterbuch fehlt vor den Browser-Modulen');
    browserError(error);
    throw error;
  }
  if (locale !== document.documentElement.lang) {
    const error = new Error(`UI-Wörterbuch der Seite passt nicht zur angefragten Sprache: ${locale}`);
    browserError(error);
    throw error;
  }
  return translatorFor(browser, locale, { flat: true, onMissing: browserError });
}

/** Browser modules (including lazy scene builders); safe for deterministic Node unit tests. */
export function t(key, values = {}) {
  const language = typeof document === 'undefined' ? undefined : document.documentElement?.lang;
  const locale = LOCALES.includes(language) ? language : 'de';
  return createTranslator(locale)(key, values);
}
