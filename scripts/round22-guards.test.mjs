// Runde 22 (04.11.2026): 404-Seiten in allen Sprachen mit demselben Rahmen, genau ein <main>.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Der 404-Rahmen sitzt in der Komponente, keine Seite baut ein eigenes <main>', () => {
  assert.match(read('src/components/Chopper404.astro'), /<div class="page-404">/);
  for (const page of ['src/pages/404.astro', 'src/pages/[...slug].astro']) assert.doesNotMatch(read(page), /<main\b/, page);
});

test('Gebaute 404-Seiten (DE/EN/NL): ein <main>, Rahmen vorhanden', { skip: !existsSync(new URL('../dist/404.html', import.meta.url)) && 'kein Build' }, () => {
  for (const file of ['dist/404.html', 'dist/en/404/index.html', 'dist/nl/404/index.html']) {
    if (!existsSync(new URL(`../${file}`, import.meta.url))) continue;
    const html = read(file);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, file);
    assert.match(html, /class="page-404"/, file);
  }
});
