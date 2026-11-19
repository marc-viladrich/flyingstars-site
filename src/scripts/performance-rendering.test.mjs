import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { localImageSize } from '../lib/local-image-size.mjs';

const root = path.resolve(process.env.FLYINGSTARS_AUDIT_DIST || 'dist');
function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else yield file;
  }
}

test('local logo dimensions come from the real SVG/PNG files', async () => {
  // Enumerate the actual logo directories, including future additions.
  for (const dir of ['public/brand/logos']) {
    for (const file of files(dir)) {
      if (!/\.(svg|png|jpe?g|webp)$/.test(file)) continue;
      const src = '/' + path.relative('public', file);
      const actual = await sharp(file).metadata();
      assert.deepEqual(await localImageSize(src), { width: actual.width, height: actual.height }, src);
    }
  }
  for (const src of ['https://example.test/a.png', '//example.test/a.png', '/../package.json']) {
    assert.throws(() => localImageSize(src), /local public image/);
  }
});

// Artefakt-Guards am gebauten Output (FLYINGSTARS_AUDIT_DIST=dist; CI nach dem Produktions-Build). Die Prüfregeln sind
// reine Funktionen über HTML/CSS und haben eigene Positiv-/Negativfälle, damit ein grünes Ergebnis nicht daran liegt,
// dass der Guard ein veraltetes Merkmal sucht (Audit 2, N9).
const attr = (tag, name) => new RegExp(`\\s${name}=["']`).test(tag);
const dimension = (tag, name) => new RegExp(`\\s${name}=["']\\d+(?:\\.\\d+)?["']`).test(tag);
/** `<img>`-Tags, die Fläche ohne reservierte Maße bekommen können. Ein Bild mit Quelle (`src`/`srcset`) braucht `width`
 * und `height`. Ein leerer Platzhalter ohne jede Quelle, den erst ein Skript befüllt (Logo-Minimap im Konfigurator),
 * lädt nichts und verschiebt nichts; seine Fläche gibt das CSS des Besitzers vor. */
export function imagesWithoutDimensions(html) {
  return [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
    .filter((tag) => (attr(tag, 'src') || attr(tag, 'srcset')) && !(dimension(tag, 'width') && dimension(tag, 'height')));
}
/** Marker des Konfigurators: die Section trägt die Klasse `cfg` als eigenes Token (nicht `cfg-…`, nicht der Teaser). */
export const hasConfigurator = (html) => /<section\b[^>]*\sclass="(?:[^"]*\s)?cfg(?:\s[^"]*)?"/.test(html);
/** Regel, die nur der Konfigurator besitzt (show-configurator.css). Sie zählt, egal ob das CSS eingebettet ist
 * (route-css bettet kleine Bündel ein) oder als Datei verlinkt. */
const CONFIGURATOR_RULE = /\.cfg-stage\b[^{]*\{/;
/** Eingebettetes und verlinktes CSS einer Seite; `readCss` liest eine verlinkte Datei (Pfad ab Wurzel). */
export function pageCss(html, readCss) {
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const linked = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0])
    .filter((tag) => /\srel=["']?stylesheet/.test(tag))
    .map((tag) => /\shref="([^"]+)"/.exec(tag)?.[1]).filter(Boolean).map(readCss);
  return [...inline, ...linked].join('\n');
}
export const hasConfiguratorStyles = (html, readCss) => CONFIGURATOR_RULE.test(pageCss(html, readCss));

test('guard rules: images with a source need dimensions, runtime placeholders do not', () => {
  assert.deepEqual(imagesWithoutDimensions('<img src="/a.avif" width="10" height="5" alt=""><img id="cfg-minimap-img" alt="">'), []);
  assert.deepEqual(imagesWithoutDimensions('<img data-src="/lazy.avif" alt="">'), [], 'data-src is not a source');
  assert.equal(imagesWithoutDimensions('<img src="/a.avif" alt="">').length, 1);
  assert.equal(imagesWithoutDimensions('<img src="/a.avif" width="10" alt="">').length, 1);
  assert.equal(imagesWithoutDimensions('<img srcset="/a.avif 1x" alt="">').length, 1);
  assert.equal(imagesWithoutDimensions('<img src="/a.avif" width="auto" height="5" alt="">').length, 1);
});

test('guard rules: configurator marker and its styles, inline or linked', () => {
  const css = { '/_astro/cfg.css': '.cfg-stage{position:relative}', '/_astro/base.css': '.cfg-teaser{display:grid}' };
  const read = (href) => css[href] ?? '';
  assert.equal(hasConfigurator('<section class="cfg is-individual has-head" id="konfigurator">'), true);
  assert.equal(hasConfigurator('<section class="section cfg">'), true);
  assert.equal(hasConfigurator('<section class="cfg-teaser">'), false);
  assert.equal(hasConfigurator('<div class="cfg">'), false);
  assert.equal(hasConfiguratorStyles('<style>.a{}.cfg-stage, .x{inset:0}</style>', read), true, 'inline');
  assert.equal(hasConfiguratorStyles('<link rel="stylesheet" href="/_astro/cfg.css">', read), true, 'linked');
  assert.equal(hasConfiguratorStyles('<link rel="preload" as="style" href="/_astro/cfg.css">', read), false, 'a preload is not applied');
  assert.equal(hasConfiguratorStyles('<link rel="stylesheet" href="/_astro/base.css"><style>.cfg-stages-note{}</style>', read), false);
});

const html = () => [...files(root)].filter((file) => file.endsWith('.html')).map((file) => ({ file: path.relative(root, file), html: fs.readFileSync(file, 'utf8') }));

test('every generated image with a source reserves both dimensions', { skip: !process.env.FLYINGSTARS_AUDIT_DIST }, () => {
  const pages = html();
  assert.ok(pages.length > 100, `Unexpectedly incomplete build: ${pages.length} HTML files`);
  assert.deepEqual(pages.flatMap(({ file, html }) => imagesWithoutDimensions(html).map((tag) => `${file}: ${tag}`)), []);
});

test('exactly the pages with a configurator carry its styles', { skip: !process.env.FLYINGSTARS_AUDIT_DIST }, () => {
  const cache = new Map();
  const read = (href) => {
    if (!cache.has(href)) cache.set(href, fs.readFileSync(path.join(root, href.split(/[?#]/)[0]), 'utf8'));
    return cache.get(href);
  };
  const pages = html(), withConfigurator = pages.filter((page) => hasConfigurator(page.html));
  // Die Preisseite in drei Sprachen; fehlt der Marker ganz, prüfte der Vergleich unten nichts
  assert.ok(withConfigurator.length >= 3, `configurator marker found on ${withConfigurator.length} pages`);
  for (const { file, html } of pages) assert.equal(hasConfiguratorStyles(html, read), hasConfigurator(html), file);
});
