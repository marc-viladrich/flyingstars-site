import messages from './ui.json' with { type: 'json' };
import { LOCALES } from './routing.mjs';
const server = import.meta.env?.SSR ?? (typeof document === 'undefined');
let browserDictionary;
if (!server) {
  const language = document.documentElement.lang;
  const locale = LOCALES.includes(language) ? language : 'de';
  // A per-language static module, generated from the editor's canonical dictionary.
  browserDictionary = (await import(/* @vite-ignore */ `/media/ui/${locale}.js`)).default;
}
function dictionary() { return server ? messages : browserDictionary; }
/** Build-time projection; browser consumers do not receive the other languages. */
export function messagesForLocale(locale) {
  if (!LOCALES.includes(locale)) throw new Error(`Unknown UI locale: ${locale}`);
  return Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, { [locale]: value[locale] }]));
}

/** No HTML interpolation. Callers render links/emphasis, values are plain text.
 * @returns {((key: string, values?: Record<string, unknown>) => string) & {afeAddress: (key: string) => {owner:{collection:string,id:string},part:string,path:string[],mode:string}}}
 */
export function createTranslator(locale = 'de') {
  const source = dictionary();
  const translate = (key, values = {}) => {
    const message = source[key]?.[locale];
    if (typeof message !== 'string') throw new Error(`Missing ${locale} UI message: ${key}`);
    return message.replace(/\{(\w+)\}/g, (_, name) => {
      if (!(name in values)) throw new Error(`Missing ${name} in UI message ${key}`);
      return String(values[name]);
    });
  };
  // Render-time provenance for the dictionary actually used by this translator.
  translate.afeAddress=key=>({owner:{collection:'siteUi',id:'ui'},part:'data',path:[key,locale],mode:/\{\w+\}/.test(source[key]?.[locale]||'')?'panel':'inline'});
  return translate;
}
/** Browser modules (including lazy scene builders); safe for deterministic Node unit tests. */
export function t(key, values = {}) {
  const language = typeof document === 'undefined' ? undefined : document.documentElement?.lang;
  const locale = LOCALES.includes(language) ? language : 'de';
  return createTranslator(locale)(key, values);
}
