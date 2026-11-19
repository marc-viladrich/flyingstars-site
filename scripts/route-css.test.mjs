import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { cssLinks, pruneCss, requiredCids, rewriteLinks, splitRouteCss } from './route-css.mjs';

const css = [
  '.a{color:red}',
  '.b[data-astro-cid-one]{color:blue}',
  '.c[data-astro-cid-two] .d[data-astro-cid-two]{color:green}',
  '.e[data-astro-cid-two],.f[data-astro-cid-one]{margin:0}',
  '.g:not([data-astro-cid-two]){padding:0}',
  ':is(.h[data-astro-cid-two],.i){gap:0}',
  '@media (width<=40em){.j[data-astro-cid-two]{display:none}}',
  '@media (width<=40em){.k[data-astro-cid-one]{display:block}}',
  '@keyframes spin{0%{opacity:0}to{opacity:1}}',
].join('');

test('Nur Regeln fallen weg, deren Scoping-Attribut auf der Seite fehlt', () => {
  const out = pruneCss(css, new Set(['one']));
  assert.match(out, /\.a\{color:red\}/, 'ungescopte Regel bleibt');
  assert.match(out, /\.b\[data-astro-cid-one\]/);
  assert.doesNotMatch(out, /\.c\[data-astro-cid-two\]/);
  assert.match(out, /\.e\[data-astro-cid-two\],\.f\[data-astro-cid-one\]/, 'ein passender Zweig hält die Regel');
  assert.match(out, /\.g:not\(\[data-astro-cid-two\]\)/, ':not() ist keine Bedingung');
  assert.match(out, /:is\(\.h\[data-astro-cid-two\],\.i\)/, ':is() ist keine Bedingung');
  assert.doesNotMatch(out, /\.j\[/);
  assert.equal((out.match(/@media/g) ?? []).length, 1, 'leere Medienabfrage fällt weg');
  assert.match(out, /@keyframes spin\{0%\{opacity:0\}to\{opacity:1\}\}/);
  assert.ok(out.indexOf('.a{') < out.indexOf('.b[') && out.indexOf('.b[') < out.indexOf('.e['), 'Reihenfolge bleibt');
});

test('Alle Scoping-Attribute vorhanden: Ausgabe gleich Eingabe', () => {
  assert.equal(pruneCss(css, new Set(['one', 'two'])), css);
});

test('Bedingungen je Zweig der Selektorliste', () => {
  assert.deepEqual(requiredCids('.x[data-astro-cid-a] .y[data-astro-cid-b], .z').map((s) => [...s].sort()), [['a', 'b'], []]);
});

test('dist: Varianten je Komponentenmenge, gemeinsame Datei bleibt, verwaiste Quelle fällt weg', async () => {
  const dist = await mkdtemp(path.join(tmpdir(), 'route-css-'));
  await mkdir(path.join(dist, '_astro'));
  await mkdir(path.join(dist, 'b'));
  await writeFile(path.join(dist, '_astro/base.css'), ':root{--head-gap-text:1rem}body{margin:0}');
  await writeFile(path.join(dist, '_astro/sections.css'), '.s[data-astro-cid-one]{color:red}.t[data-astro-cid-two]{color:blue}');
  await writeFile(path.join(dist, '_astro/app.js'), 'console.log(1)');
  const page = (cid) => `<html><head><link rel="stylesheet" href="/_astro/base.css"><link rel="stylesheet" href="/_astro/sections.css"></head><body><p class="s" data-astro-cid-${cid}></p></body></html>`;
  await writeFile(path.join(dist, 'index.html'), page('one'));
  await writeFile(path.join(dist, 'b/index.html'), page('one'));
  await writeFile(path.join(dist, '404.html'), page('two'));
  await splitRouteCss(dist);
  const files = (await readdir(path.join(dist, '_astro'))).filter((f) => f.endsWith('.css')).sort();
  assert.equal(files.length, 3, files.join());
  assert.ok(files.includes('base.css'));
  assert.ok(!files.includes('sections.css'), 'keine Seite verweist mehr auf das volle Bündel');
  const [home, b, missing] = await Promise.all(['index.html', 'b/index.html', '404.html'].map((f) => readFile(path.join(dist, f), 'utf8')));
  const href = (html) => html.match(/href="(\/_astro\/sections\.[^"]+)"/)[1];
  assert.equal(href(home), href(b), 'gleiche Komponentenmenge, gleiche Datei');
  assert.notEqual(href(home), href(missing));
  assert.equal(await readFile(path.join(dist, href(home)), 'utf8'), '.s[data-astro-cid-one]{color:red}');
  assert.match(home, /href="\/_astro\/base\.css"/);
});

test('dist ohne _astro (Minimalseite ohne CSS und Skript) bricht den Zuschnitt nicht ab', async () => {
  const dist = await mkdtemp(path.join(tmpdir(), 'route-css-leer-'));
  await writeFile(path.join(dist, 'index.html'), '<!doctype html><html><body><img src="/a.png" alt=""></body></html>');
  await splitRouteCss(dist);
  assert.equal(await readFile(path.join(dist, 'index.html'), 'utf8'), '<!doctype html><html><body><img src="/a.png" alt=""></body></html>');
});

// Audit 2, N3: Negativbelege des Zweitaudits als Fixtures
test('Benannte @layer behalten ihre Rangfolge, auch wenn ihr erster Block leer wird', () => {
  const before = '@layer layout{.x[data-astro-cid-gone]{color:green}}@layer theme{.x{color:blue}}@layer layout{.x{color:red}}';
  const out = pruneCss(before, new Set());
  assert.equal(out, '@layer layout;@layer theme{.x{color:blue}}@layer layout{.x{color:red}}');
  // schon im Original leerer Block: bleibt als Anweisung, die Reihenfolge layout vor theme gilt weiter
  assert.equal(pruneCss('@layer layout{}@layer theme{.x{color:blue}}@layer layout{.x{color:red}}', new Set()), '@layer layout;@layer theme{.x{color:blue}}@layer layout{.x{color:red}}');
  // verschachtelt und in einer Medienabfrage: die Ebene bleibt, die Abfrage damit auch
  assert.equal(pruneCss('@media print{@layer a{.y[data-astro-cid-gone]{color:red}}}', new Set()), '@media print{@layer a;}');
  // anonyme Ebenen tragen keinen Namen, den spätere Blöcke einordnen müssten
  assert.equal(pruneCss('@layer{.y[data-astro-cid-gone]{color:red}}.z{color:red}', new Set()), '.z{color:red}');
});

test('Links: Stylesheet und Preload werden erkannt und je Tag umgeschrieben', () => {
  const html = '<link rel="preload" as="style" href="/_astro/bundle.css"><link rel="stylesheet" href="/_astro/bundle.css"><link rel=stylesheet href=/_astro/other.css><a href="/_astro/bundle.css">Quelltext</a>';
  assert.deepEqual(cssLinks(html), [{ href: '/_astro/bundle.css', kind: 'preload' }, { href: '/_astro/bundle.css', kind: 'stylesheet' }, { href: '/_astro/other.css', kind: 'stylesheet' }]);
  const out = rewriteLinks(html, new Map([['/_astro/bundle.css', '/_astro/bundle.X.css'], ['/_astro/other.css', '/_astro/other.Y.css']]));
  assert.equal(out, '<link rel="preload" as="style" href="/_astro/bundle.X.css"><link rel="stylesheet" href="/_astro/bundle.X.css"><link rel=stylesheet href=/_astro/other.Y.css><a href="/_astro/bundle.css">Quelltext</a>');
});

test('dist: Preload vor dem Stylesheet zeigt danach auf dieselbe Variante, keine Referenz auf eine gelöschte Datei', async () => {
  const dist = await mkdtemp(path.join(tmpdir(), 'route-css-preload-'));
  await mkdir(path.join(dist, '_astro'));
  await writeFile(path.join(dist, '_astro/base.css'), ':root{--head-gap-text:1rem}');
  await writeFile(path.join(dist, '_astro/bundle.css'), '.p[data-astro-cid-present]{color:red}.q[data-astro-cid-absent]{color:blue}');
  await writeFile(path.join(dist, 'index.html'), '<link rel="stylesheet" href="/_astro/base.css"><link rel="preload" as="style" href="/_astro/bundle.css"><link rel="stylesheet" href="/_astro/bundle.css"><main data-astro-cid-present></main>');
  await splitRouteCss(dist);
  const html = await readFile(path.join(dist, 'index.html'), 'utf8');
  const links = cssLinks(html).slice(1);
  assert.equal(links.length, 2);
  assert.equal(links[0].href, links[1].href, 'Preload und Stylesheet nennen dieselbe Datei');
  assert.notEqual(links[1].href, '/_astro/bundle.css');
  assert.equal(await readFile(path.join(dist, links[1].href), 'utf8'), '.p[data-astro-cid-present]{color:red}');
  assert.deepEqual((await readdir(path.join(dist, '_astro'))).sort(), ['base.css', path.basename(links[1].href)].sort());
});

test('dist: ein Bündel, das eine andere Seite noch nennt (hier als Preload), wird nicht gelöscht', async () => {
  const dist = await mkdtemp(path.join(tmpdir(), 'route-css-ref-'));
  await mkdir(path.join(dist, '_astro'));
  await mkdir(path.join(dist, 'b'));
  await writeFile(path.join(dist, '_astro/base.css'), ':root{--head-gap-text:1rem}');
  await writeFile(path.join(dist, '_astro/bundle.css'), '.p[data-astro-cid-one]{color:red}.q[data-astro-cid-two]{color:blue}');
  await writeFile(path.join(dist, 'index.html'), '<link rel="stylesheet" href="/_astro/base.css"><link rel="stylesheet" href="/_astro/bundle.css"><p data-astro-cid-one></p>');
  await writeFile(path.join(dist, 'b/index.html'), '<link rel="preload" as="style" href="/_astro/bundle.css"><p></p>');
  await splitRouteCss(dist);
  assert.ok((await readdir(path.join(dist, '_astro'))).includes('bundle.css'), 'Preload der zweiten Seite hält die Quelle');
  assert.match(await readFile(path.join(dist, 'b/index.html'), 'utf8'), /href="\/_astro\/bundle\.css"/);
});

test('dist: Verweis auf ein fehlendes Stylesheet bricht den Zuschnitt ab', async () => {
  const dist = await mkdtemp(path.join(tmpdir(), 'route-css-fehlt-'));
  await mkdir(path.join(dist, '_astro'));
  await writeFile(path.join(dist, '_astro/base.css'), ':root{--head-gap-text:1rem}body{margin:0}');
  await writeFile(path.join(dist, 'index.html'), '<link rel="stylesheet" href="/_astro/base.css"><link rel="preload" as="style" href="/_astro/weg.css">');
  await assert.rejects(splitRouteCss(dist), /index\.html: preload \/_astro\/weg\.css/);
});

test('dist: Komponentenbündel vor dem Basis-Stylesheet bricht den Zuschnitt ab', async () => {
  const dist = await mkdtemp(path.join(tmpdir(), 'route-css-folge-'));
  await mkdir(path.join(dist, '_astro'));
  await mkdir(path.join(dist, 'preise'));
  await writeFile(path.join(dist, '_astro/Base.css'), ':root{--head-gap-text:1rem}body{margin:0}');
  await writeFile(path.join(dist, '_astro/IconFeature.css'), '.ic{gap:0}');
  await writeFile(path.join(dist, 'index.html'), '<link rel="stylesheet" href="/_astro/Base.css"><link rel="stylesheet" href="/_astro/IconFeature.css">');
  await writeFile(path.join(dist, 'preise/index.html'), '<link rel="stylesheet" href="/_astro/IconFeature.css"><link rel="stylesheet" href="/_astro/Base.css">');
  await assert.rejects(splitRouteCss(dist), (err) => /preise\/index\.html: Basis an Stelle 2/.test(err.message) && !/^index\.html/m.test(err.message));
});
