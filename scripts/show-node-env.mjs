// Lädt die Motivbauer des Show-Konfigurators in Node (für schnelle Tests ohne Browser): JSON-Importe ohne
// Importattribut werden als JSON geladen, fetch() auf Seitenpfade liest aus public/. Nur für Tests.
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';

registerHooks({
  load(url, context, next) {
    if (url.endsWith('.json')) return next(url, { ...context, importAttributes: { type: 'json' } });
    return next(url, context);
  },
});

const publicDir = new URL('../public/', import.meta.url);
globalThis.fetch = async (path) => {
  const body = await readFile(new URL(String(path).replace(/^\//, ''), publicDir), 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(body) };
};
