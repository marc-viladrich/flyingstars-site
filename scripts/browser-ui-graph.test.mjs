import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { checkBrowserDictionaries, writeBrowserDictionaries, scriptDependencies } from './browser-ui-graph.mjs';
import { checkBrowserUiKeys } from './browser-ui-keys.mjs';
import { translatorFor } from '../src/i18n/ui-core.mjs';

test('Die Sprachdatei folgt statischen, dynamischen und eingebetteten Client-Imports', () => {
  const dist = mkdtempSync(path.join(os.tmpdir(), 'fs-browser-ui-'));
  try {
    mkdirSync(path.join(dist, '_astro'));
    writeFileSync(path.join(dist, '_astro/main.js'), 'export * from "./lazy.js";');
    writeFileSync(path.join(dist, '_astro/lazy.js'), 'if (window) import("./text.js");');
    writeFileSync(path.join(dist, '_astro/text.js'), 'message("contact.sending");');
    for (const locale of ['de', 'en', 'nl']) {
      const html = `<html lang="${locale}"><head><script defer data-fs-ui src="/media/i18n/${locale}.js"></script></head>
        <script type="module">import '/_astro/main.js'; message('contact.deliveryFailed');</script></html>`;
      writeFileSync(path.join(dist, `${locale}.html`), html);
    }
    writeFileSync(path.join(dist, 'only-server.html'), '<html lang="de"><script defer data-fs-ui src="/media/i18n/de.js"></script><p>contact.sending</p></html>');
    assert.equal(writeBrowserDictionaries(dist), 3);
    assert.equal(checkBrowserDictionaries(dist).dictionaries, 3);
    assert.doesNotMatch(readFileSync(path.join(dist, 'only-server.html'), 'utf8'), /data-fs-ui/);
    const file = path.join(dist, 'nl.html');
    const href = /src="([^"]+)"/.exec(readFileSync(file, 'utf8'))[1];
    const dictionary = path.join(dist, href);
    const code = readFileSync(dictionary, 'utf8');
    assert.match(code, /"contact.sending"/);
    assert.match(code, /"contact.deliveryFailed"/);
    assert.doesNotMatch(code, /contact.videoCall/);
    writeFileSync(dictionary, code.replace(/,"contact.sending":"[^"]+"/, ''));
    assert.throws(() => checkBrowserDictionaries(dist), /nl.html/);
  } finally { rmSync(dist, { recursive: true }); }
});

test('Unbekannte Schlüssel und unbeschränkte dynamische Aufrufe brechen die Prüfung ab', () => {
  const prefix = 'import { t as message } from "../i18n/ui.mjs";';
  const file = '/src/scripts/beispiel.js';
  assert.doesNotThrow(() => checkBrowserUiKeys(prefix + 'message(on ? "contact.sending" : "contact.deliveryFailed");', file));
  assert.throws(() => checkBrowserUiKeys(prefix + 'message("contact.typo");', file), /contact.typo/);
  assert.throws(() => checkBrowserUiKeys(prefix + 'message(`contact.${state}`);', file), /kein statischer UI-Schlüssel/);
  assert.throws(() => checkBrowserUiKeys(prefix + 'const read = message; read(path);', file), /direkt aufgerufen/);
  assert.throws(() => scriptDependencies('import(path)', file), /ohne statisches Ziel/);
});

test('Fehlende Browser-Texte werden auch bei abgefangener Ausnahme gemeldet', () => {
  const reported = [];
  const t = translatorFor({ 'contact.sending': 'Even wachten {n}' }, 'nl', { flat: true, onMissing: error => reported.push(error.message) });
  assert.equal(t('contact.sending', { n: 1 }), 'Even wachten 1');
  try { t('contact.deliveryFailed'); } catch {}
  assert.deepEqual(reported, ['Missing nl UI message: contact.deliveryFailed']);
});
