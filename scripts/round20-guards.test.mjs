import {read} from './test-support/read.mjs';
// Runde 20 (04.11.2026): Header-Hover, Sprachwahl als Popover, Kontaktdaten aus einer Quelle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';


test('Hover im Kopf: Unterstrich je Link, gleitende Box als echtes Element (WebKit-Falle)', () => {
  const css = read('src/styles/global.css');
  // Unterstrich je Hauptpunkt (Marc 04.11.: „in sich geschlossen“) über den zentralen Unterstrich-Effekt, kein gemeinsamer Marker
  assert.match(css, /:where\(\.hover-line, \.link, \.nav nav > a, \.nav-drop > a,/);
  assert.doesNotMatch(css, /\.nav nav::after/);
  // Box in Auswahllisten: echtes Element, kein Pseudo-Element; WebKit bricht Übergänge an Pseudo-Elementen ab, sobald
  // eine :has()-Regel sie neu berechnet
  assert.doesNotMatch(css, /\.glide-list::(after|before)/);
  const selectors = css.split('}').map((rule) => rule.split('{')[0]);
  for (const sel of selectors) if (/glide/.test(sel)) assert.doesNotMatch(sel, /:has\([^{]*::(after|before)/, sel.trim());
  for (const file of ['src/layouts/Base.astro', 'src/components/LanguageSwitch.astro']) assert.match(read(file), /<li class="glide-mark" aria-hidden="true"><\/li>/, file);
  // ein wandernder Ankername statt umgeschaltetem position-anchor (springt in WebKit)
  assert.doesNotMatch(css, /:has\([^{]*\)[^{,]*\{[^}]*position-anchor/, 'position-anchor wird per :has() umgeschaltet');
});

test('Sprachwahl öffnet wie „Anlässe“: Zeigen und Fokus, reines CSS, Liste absolut unter dem Knopf', () => {
  const src = read('src/components/LanguageSwitch.astro');
  assert.match(src, /\.language-switch:is\(:hover, :focus-within\) \.lang-pop/);
  assert.match(src, /\.lang-pop \{ position: absolute;/);
  // Safari 18 kennt kein Anchor Positioning, ein natives Popover landete dort neben dem Knopf (Marc, 04.11.2026)
  assert.doesNotMatch(src, /popovertarget|<div popover|position-anchor|anchor\(/);
  assert.doesNotMatch(src, /addEventListener\(['"](click|mouseenter|pointerenter)/);
  const base = read('src/layouts/Base.astro');
  assert.equal((base.match(/<LanguageSwitch [^>]*id="/g) ?? []).length, 2, 'Kopf und Menü brauchen je eine eigene id');
});

test('Gleitende Box: Anchor Positioning als Standard, Index-Ersatz für Browser ohne (Safari 18)', () => {
  const css = read('src/styles/global.css');
  assert.match(css, /@supports \(anchor-name: --a\) \{\s*\.glide-list \{ anchor-scope/);
  assert.match(css, /\.glide-mark \{[^}]*transform: translateY\(calc\(var\(--gi\) \* 100%\)\)/);
  for (const [file, re] of [['src/layouts/Base.astro', /class="glide-list" style=\{`--n: /], ['src/components/LanguageSwitch.astro', /class="glide-list" style=\{`--n: /]]) assert.match(read(file), re, file);
});

test('Ein Unterstrich-Effekt für alle eigenständigen Textlinks, Grundregel ohne Spezifität', () => {
  const css = read('src/styles/global.css');
  assert.match(css, /:where\(\.hover-line, \.link, \.nav nav > a,[^{]*\) \{ background-image: var\(--grad\)/, 'Grundregel in :where(), sonst schlägt sie die Auslöser (Kartentitel blieb unterstrichlos)');
  assert.match(read('src/components/MediaCard.astro'), /<span class="hover-line" set:html=\{titleHtml\} \/>/);
  assert.doesNotMatch(read('src/styles/media-card.css'), /text-decoration: underline/);
  assert.doesNotMatch(css, /\.nav nav > a::after|\.member:hover h3, \.member:focus-within h3 \{ background-size/);
});

test('Bewegung: ein Schalter für die ganze Seite (Pause-Knopf und prefers-reduced-motion)', () => {
  const css = read('src/styles/global.css');
  assert.match(css, /html\.motion-paused \*, html\.motion-paused \*::before, html\.motion-paused \*::after \{ animation-duration: 0\.01ms !important;[^}]*transition-duration: 0\.01ms !important/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*html \*, html \*::before, html \*::after \{ animation-duration: 0\.01ms !important/);
  assert.match(read('src/layouts/Base.astro'), /if\(still\)document\.documentElement\.classList\.add\('motion-paused'\)/, 'Klasse vor dem ersten Bild');
});

test('Social-Logos im Footer aus brand-icons.ts, nicht aus Lucide', async () => {
  const { BRAND_ICONS } = await import('../src/components/brand-icons.ts');
  for (const name of ['whatsapp', 'instagram', 'youtube', 'tiktok', 'facebook']) assert.ok(BRAND_ICONS[name]?.paths.length, name);
  assert.match(read('src/layouts/Base.astro'), /<ul class="social">\{SOCIAL\.map/);
});

// Operative Nummern, Mail und Anschriften stehen in contact.json; CONTACT bleibt die Leseschnittstelle.
// Rechtstexte bleiben eigenständig. Danke verwendet explizite Referenzen.
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
