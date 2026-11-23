import messages from './ui.json' with { type: 'json' };
import { LOCALES } from './routing.mjs';

export function messagesForLocale(locale, keys = Object.keys(messages)) {
  if (!LOCALES.includes(locale)) throw new Error(`Unknown UI locale: ${locale}`);
  return Object.fromEntries([...keys].sort().map((key) => {
    const value = messages[key]?.[locale];
    if (typeof value !== 'string') throw new Error(`Missing ${locale} UI message: ${key}`);
    return [key, value];
  }));
}

export function browserDictionaryScript(locale, keys) {
  return `globalThis.__FS_UI__=Object.freeze(${JSON.stringify(messagesForLocale(locale, keys))});`;
}
