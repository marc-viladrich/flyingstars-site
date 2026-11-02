import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import messages from '../src/i18n/ui.json' with { type: 'json' };
import { createTranslator } from '../src/i18n/ui.mjs';
import { LOCALES, localizedHref, localeFromPath, localeOfId, sourceId, entryPath } from '../src/i18n/routing.mjs';
import { getConfiguratorContent } from '../src/content/show-configurator.js';
import { getPackageDetails } from '../src/content/package-details.ts';
import { onRequestPost } from '../functions/api/contact.ts';

const readEntry = (file) => {
  const text = readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  return { raw: text, data: parse(match ? match[1] : text) };
};

test('Locale URLs keep page, query and anchor identities; assets and external URLs stay unchanged', () => {
  for (const locale of LOCALES) {
    const path = localizedHref('/drohnenshow-preise/?paket=HORIZON&drohnen=250#konfigurator', locale);
    assert.equal(localizedHref(path, locale), path);
    assert.equal(localeFromPath(path), locale);
    assert.ok(path.endsWith('?paket=HORIZON&drohnen=250#konfigurator'));
    for (const asset of ['/api/contact', '/media/logo.svg', '/brand/logos/foo.svg', '/_astro/a.js', '//external.test/en/', 'https://example.test/', 'mailto:test@example.test', '#anfrage']) assert.equal(localizedHref(asset, locale), asset);
  }
  assert.equal(entryPath('en/index'), '/en/');
  assert.equal(entryPath('nl/kontakt'), '/nl/kontakt/');
  assert.equal(sourceId('en/faq'), 'faq');
  assert.equal(localeOfId('kontakt'), 'de');
});

test('Every UI message has all locales and exactly the same interpolation fields', () => {
  const tokens = (text) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();
  for (const [key, values] of Object.entries(messages)) for (const locale of LOCALES) {
    assert.equal(typeof values[locale], 'string', `${key}: ${locale}`);
    assert.ok(values[locale].trim(), `${key}: ${locale}`);
    assert.deepEqual(tokens(values[locale]), tokens(values.de), `${key}: ${locale}`);
  }
  assert.throws(() => createTranslator('nl')('missing-key'), /Missing nl UI/);
  assert.throws(() => createTranslator('en')('references.drones'), /Missing count/);
});

test('All real source entries have current EN/NL content and stable structural identities', () => {
  const identity = new Set(['type', 'id', 'href', 'src', 'file', 'logo', 'video', 'heroVideo', 'route', 'nextRoute', 'icon', 'shape', 'color', 'accent', 'variant', 'zone', 'loop', 'reel', 'occasion', 'package', 'mediaSide']);
  const sameStructure = (source, target, at = '') => {
    if (source === null || typeof source !== 'object') {
      assert.equal(typeof target, typeof source, at);
      if (typeof source !== 'string' || identity.has(at.split('.').at(-1))) assert.deepEqual(target, source, at);
      return;
    }
    assert.deepEqual(Object.keys(target).filter((key) => key !== 'translationSourceHash').sort(), Object.keys(source).sort(), at);
    for (const key of Object.keys(source)) sameStructure(source[key], target[key], `${at}.${key}`);
  };
  for (const collection of ['pages', 'posts', 'projects', 'faq']) {
    const base = new URL(`../src/content/${collection}/`, import.meta.url);
    const files = readdirSync(base, { withFileTypes: true }).filter((entry) => entry.isFile() && /\.(yaml|md)$/.test(entry.name));
    for (const file of files) {
      const source = readEntry(new URL(file.name, base));
      const expectedHash = createHash('sha256').update(source.raw).digest('hex');
      for (const locale of ['en', 'nl']) {
        const translated = readEntry(new URL(`${locale}/${file.name}`, base));
        assert.equal(translated.data.translationSourceHash, expectedHash, `${locale}: stale ${collection}/${file.name}`);
        sameStructure(source.data, translated.data, `${locale}/${collection}/${file.name}`);
      }
    }
  }
});

test('Localized configurators and pricing preserve every motif, package, price and extra ID', () => {
  const shape = (content) => content.OCCASIONS.map((o) => ({ id: o.id, anlass: o.anlass, motifs: o.motifs.map((m) => ({ id: m.id, minDrones: m.minDrones, versions: Object.values(m.tiers).map((v) => [v.build, v.minDrones]) })) }));
  const original = getConfiguratorContent('de');
  for (const locale of ['en', 'nl']) {
    const translated = getConfiguratorContent(locale);
    assert.deepEqual(shape(translated), shape(original));
    assert.notEqual(translated.STEPS[0].label, original.STEPS[0].label);
    assert.deepEqual(getPackageDetails(locale).EXTRAS.map((x) => x.id), getPackageDetails('de').EXTRAS.map((x) => x.id));
    assert.match(getPackageDetails(locale).dronesLine('SPARK'), /100.+150/);
  }
});

test('Contact endpoint returns localized errors and locale-safe no-JS redirects', async () => {
  const make = (locale, email, accept) => {
    const body = new FormData();
    for (const [key, value] of Object.entries({ locale, name: 'Test', email, anlass: 'firma', paket: 'HORIZON', ort: 'Osnabrück' })) body.set(key, value);
    return new Request('https://example.test/api/contact', { method: 'POST', body, headers: { Accept: accept } });
  };
  for (const locale of ['en', 'nl']) {
    const invalid = await onRequestPost({ request: make(locale, 'invalid', 'application/json'), env: {} });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).detail, createTranslator(locale)('contactAPI.email'));
    const redirect = await onRequestPost({ request: make(locale, 'test@example.test', 'text/html'), env: {} });
    assert.equal(redirect.status, 303);
    assert.equal(new URL(redirect.headers.get('location')).pathname, `/${locale}/danke/`);
    assert.equal(new URL(redirect.headers.get('location')).searchParams.get('state'), 'not-configured');
  }
  const untrusted = await onRequestPost({ request: make('//external.test', 'test@example.test', 'text/html'), env: {} });
  assert.equal(new URL(untrusted.headers.get('location')).pathname, '/danke/');
});

// Content schemas validate every language; visible defaults belong to locale-aware renderers.
test('Content schemas do not inject language-specific default text into translated entries', () => {
  const schema = readFileSync(new URL('../src/content.config.ts', import.meta.url), 'utf8');
  const defaults = [...schema.matchAll(/z\.string\(\)(?:\.\w+\([^)]*\))*\.default\((['"])(.*?)\1\)/g)];
  assert.deepEqual(defaults.filter((match) => match[2].trim()).map((match) => match[2]), []);
});
