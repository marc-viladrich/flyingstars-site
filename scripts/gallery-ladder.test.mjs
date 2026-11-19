// Bildleitern (Gallery.astro, Marc Runde 7): eine Leiter hat drei Bilder, zwei Leitern übereinander sechs (nur Werbung).
// Alle Bilder einer Galerie haben dieselbe Form, jedes Bild gibt es im Manifest als Standbild, keines doppelt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GALLERY_LAYOUTS, GALLERY_SETS, GALLERY_TEXT } from '../src/components/gallery/layouts.mjs';
const manifest = JSON.parse(readFileSync(new URL('../public/media/galerie/manifest.json', import.meta.url), 'utf8'));
const images = new Set(manifest.entries.filter((e) => e.kind === 'image').map((e) => e.slug));

test('jede Galerie: drei oder sechs Standbilder aus dem Manifest, keines doppelt', () => {
  for (const set of GALLERY_SETS) {
    const { items, ar } = GALLERY_LAYOUTS[set];
    assert.ok([3, 6].includes(items.length), `${set}: ${items.length} Bilder`);
    assert.match(ar, /^\d+ \/ \d+$/, `${set}: eine Form für alle Bilder`);
    assert.equal(new Set(items.map((i) => i.slug)).size, items.length, `${set}: doppeltes Bild`);
    for (const { slug } of items) assert.ok(images.has(slug), `${set}: ${slug} fehlt im Manifest`);
  }
});

test('Werbung und Über uns haben zwei Leitern, Indoor eine', () => {
  assert.equal(GALLERY_LAYOUTS.logos.items.length, 6);
  assert.equal(GALLERY_LAYOUTS.indoor.items.length, 3);
  // Runde 9 (Marc: „noch mehr Bilder“ zur Nachhaltigkeit): sechs Shows mit Umwelt- oder Haltungsbezug
  assert.equal(GALLERY_LAYOUTS.willkommen.items.length, 6);
  for (const off of ['hochzeit-1', 'frieden-1']) assert.ok(!GALLERY_LAYOUTS.willkommen.items.some((i) => i.slug === off), off);
});

test('Jedes Galeriebild hat Bildzeile und Alt-Texte in EN/NL; neue Bilder nennen ihre Quelle', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/media/galerie/manifest.json', import.meta.url), 'utf8'));
  for (const set of GALLERY_SETS) for (const { slug } of GALLERY_LAYOUTS[set].items) {
    const t = GALLERY_TEXT[slug]; assert.ok(t?.alt?.en && t?.alt?.nl, `${slug}: Alt-Text EN/NL`);
    const e = manifest.entries.find((x) => x.slug === slug); assert.ok(e.alt && (e.source?.url || e.source?.repoPath), `${slug}: Alt-Text DE und Quelle`);
  }
});

test('Sustainability gibt der Galerie ihren Kopf (zwei Leitern steigen daneben)', () => {
  const src = readFileSync(new URL('../src/components/sections/Sustainability.astro', import.meta.url), 'utf8');
  assert.match(src, /<Gallery set=\{gallery\} class="eco-gallery"><SectionHead slot="head"/);
});

test('Gallery.astro lässt nur 3 oder 6 Bilder zu', () => {
  const src = readFileSync(new URL('../src/components/gallery/Gallery.astro', import.meta.url), 'utf8');
  assert.match(src, /items\.length !== 3 && layout\.items\.length !== 6\) throw/);
});

test('Werbung #marketing ohne Schwarm-Formation (Marc, Runde 7: nur die Bilder)', () => {
  const src = readFileSync(new URL('../src/scripts/himmel/schwarm.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /sel: '#marketing'/);
});

test('Zwei Leitern steigen neben den Kopf (Marc, Runde 8: „alle gerne noch ein Stück weiter hoch“)', () => {
  const src = readFileSync(new URL('../src/components/gallery/Gallery.astro', import.meta.url), 'utf8');
  assert.match(src, /\.gal\.has-head\.two-rows \.g-ladder \{ grid-row: 1 \/ span 2; margin-top: 0; \}/);
  assert.match(src, /\.gal\.has-head\.two-rows \{ grid-template-rows: auto 1fr; \}/);
});
