import messages from './ui.json' with { type: 'json' };
import { LOCALES } from './routing.mjs';

/** No HTML interpolation. Callers render links/emphasis, values are plain text. */
export function createTranslator(locale = 'de') {
  return (key, values = {}) => {
    const message = messages[key]?.[locale];
    if (typeof message !== 'string') throw new Error(`Missing ${locale} UI message: ${key}`);
    return message.replace(/\{(\w+)\}/g, (_, name) => {
      if (!(name in values)) throw new Error(`Missing ${name} in UI message ${key}`);
      return String(values[name]);
    });
  };
}
/** Browser modules (including lazy scene builders); safe for deterministic Node unit tests. */
export function t(key, values = {}) {
  const language = typeof document === 'undefined' ? undefined : document.documentElement?.lang;
  const locale = LOCALES.includes(language) ? language : 'de';
  return createTranslator(locale)(key, values);
}
