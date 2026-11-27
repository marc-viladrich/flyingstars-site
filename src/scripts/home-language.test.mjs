import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { LOCALES, LOCALE_CHOICE_KEY, localizedHref } from '../i18n/routing.mjs';

const script = readFileSync(new URL('./home-language.js', import.meta.url), 'utf8');
const homeLocaleRoutes = JSON.stringify(Object.fromEntries(LOCALES.map((locale) => [locale, localizedHref('/', locale)])));

function entry({ languages = ['en-GB'], language, preference = null, path = '/', referrer = '', search = '', hash = '', storageBlocked = false } = {}) {
  const redirects = [];
  runInNewContext(script, {
    location: { origin: 'https://flyingstars.example', pathname: path, search, hash, replace: (target) => redirects.push(target) },
    navigator: { languages, language },
    document: { referrer, currentScript: { dataset: { homeLocaleRoutes, localeChoiceKey: LOCALE_CHOICE_KEY } } },
    sessionStorage: { getItem(key) {
      assert.equal(key, LOCALE_CHOICE_KEY);
      if (storageBlocked) throw new Error('Storage blocked');
      return preference;
    } },
  });
  return redirects;
}

test('root resolves regional browser languages in preference order with German fallback', () => {
  assert.deepEqual(entry({ languages: ['en-US'] }), ['/en/']);
  assert.deepEqual(entry({ languages: ['fr-CA', 'nl-BE', 'en'] }), ['/nl/']);
  assert.deepEqual(entry({ languages: ['de-AT', 'en-GB'] }), []);
  assert.deepEqual(entry({ languages: ['fr-CA'] }), []);
  assert.deepEqual(entry({ languages: [] }), []);
  assert.deepEqual(entry({ languages: [], language: 'EN-GB', storageBlocked: true }), ['/en/']);
});

test('an explicit choice survives later entries in the same session', () => {
  assert.deepEqual(entry({ preference: 'de' }), []);
  assert.deepEqual(entry({ preference: 'nl' }), ['/nl/']);
  assert.deepEqual(entry({ preference: 'other' }), ['/en/']);
});

test('language selection respects explicit and internal URLs', () => {
  assert.deepEqual(entry({ path: '/nl/' }), []);
  assert.deepEqual(entry({ path: '/blog/artikel/' }), []);
  assert.deepEqual(entry({ referrer: 'https://flyingstars.example/blog/' }), []);
  assert.deepEqual(entry({ referrer: 'https://flyingstars.example.invalid/' }), ['/en/']);
});

test('language selection preserves query and fragment', () => {
  assert.deepEqual(entry({ search: '?utm_source=campaign', hash: '#konfigurator' }), ['/en/?utm_source=campaign#konfigurator']);
});
