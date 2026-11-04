// Runde 20 (04.11.2026): Header-Hover, Sprachwahl als Popover, Kontaktdaten aus einer Quelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hover-Marker im Kopf: keine :has()-Regel am ::after selbst (WebKit bricht den Gleit-Übergang sonst ab)', () => {
  const css = read('src/styles/global.css');
  for (const marker of ['.nav nav', '.glide-list']) {
    const rules = css.split('}').map((rule) => rule.split('{')[0]).filter((sel) => sel.includes(`${marker}`) && sel.includes('::after'));
    assert.ok(rules.length > 0, `Marker ${marker}::after fehlt`);
    for (const sel of rules) assert.doesNotMatch(sel, /:has\([^)]*\)[^,]*::after/, `:has() direkt am Marker: ${sel.trim()}`);
  }
  // ein wandernder Ankername statt umgeschaltetem position-anchor (springt in WebKit)
  assert.doesNotMatch(css, /:has\([^{]*\)::after\s*\{[^}]*position-anchor/, 'position-anchor wird per :has() umgeschaltet');
});

test('Sprachwahl ist ein natives Popover und kein JS-Menü', () => {
  const src = read('src/components/LanguageSwitch.astro');
  assert.match(src, /popovertarget=/);
  assert.match(src, /<div popover /);
  assert.doesNotMatch(src, /addEventListener\(['"]click/);
  const base = read('src/layouts/Base.astro');
  assert.equal((base.match(/<LanguageSwitch [^>]*id="/g) ?? []).length, 2, 'Kopf und Menü brauchen je eine eigene id (Popover- und Ankername)');
});

// Operative Nummern, Mail und Anschriften stehen in contact.json; CONTACT bleibt die Leseschnittstelle.
// Rechtstexte und der bestehende PoC bleiben eigenständig. Danke verwendet explizite Referenzen.
const CONTACT_FACTS = [/team@flyingstars\.art/, /883 065 62/, /4920988306562/, /260 86 72/, /4915792608672/, /Bulmker Stra(ß|ss)e/, /Katernberger Str/];
const ALLOWED = new Set(['src/content/contact.json', 'src/content/pages/impressum.yaml', 'src/content/pages/datenschutz.yaml']);
const files = (dir) => readdirSync(new URL(`../${dir}`, import.meta.url)).flatMap((name) => {
  const path = join(dir, name);
  return statSync(new URL(`../${path}`, import.meta.url)).isDirectory() ? files(path) : [path];
});

test('Operative Kontaktdaten stehen nur in contact.json', () => {
  const offenders = [];
  for (const file of files('src')) {
    if (!/\.(astro|ts|mjs|js|yaml|md|json)$/.test(file)) continue;
    const plain = file.replace(/^src\/content\/pages\/(en|nl)\//, 'src/content/pages/');
    if (ALLOWED.has(plain)) continue;
    const text = read(file);
    for (const fact of CONTACT_FACTS) if (fact.test(text)) offenders.push(`${file}: ${fact}`);
  }
  assert.deepEqual(offenders, []);
});

// Marc, 04.11.2026: Die PoC-Seiten (/poc/…, Video-Labor) sind gelöscht und sollen nicht zurückkommen. Die produktiven
// Hero-Videos liegen weiter unter public/media/video-lab/ und werden über src/data/video-lab.json ausgewählt.
test('Keine PoC-Routen mehr', () => {
  assert.throws(() => statSync(new URL('../src/pages/poc', import.meta.url)), /ENOENT/);
  assert.throws(() => statSync(new URL('../public/poc', import.meta.url)), /ENOENT/);
});
