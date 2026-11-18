import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pruneCss, requiredCids, splitRouteCss } from './route-css.mjs';

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
  await writeFile(path.join(dist, '_astro/base.css'), 'body{margin:0}');
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
