// Keine nativen Tooltips an Illustrationen (Marc, Runde 7, 19.11.2026: „on hover wird immer die description der
// SVG-Illustration angezeigt, ist nervig“). Ein <title> im Inline-SVG oder ein title-Attribut an svg, img, figure,
// picture oder canvas zeigt der Browser beim Hovern als Tooltip. Barrierefreie Namen kommen über role="img" mit
// aria-label oder aria-labelledby auf ein verborgenes Element (LandingSite.astro).
// Geprüft werden die Quellen (immer) und, wenn vorhanden, das Build-HTML in dist/.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const walk = (dir, ext) => !existsSync(dir) ? [] : readdirSync(dir, {withFileTypes: true}).flatMap((e) => e.isDirectory()
  ? (e.name === 'node_modules' ? [] : walk(join(dir, e.name), ext)) : ext.test(e.name) ? [join(dir, e.name)] : []);

/** Fundstellen in einem Markup-Text: <title> innerhalb eines <svg> und title-Attribute an Bild-Elementen. */
export function tooltipFindings(text) {
  const found = [];
  for (const svg of text.matchAll(/<svg\b[\s\S]*?<\/svg>/g)) if (/<title[\s>]/.test(svg[0])) found.push(`<svg> mit <title>: ${svg[0].slice(0, 90)}…`);
  for (const tag of text.matchAll(/<(svg|img|figure|picture|canvas)\b(?:[^>{]|\{[^}]*\})*>/g)) if (/\stitle=/.test(tag[0])) found.push(`title-Attribut an <${tag[1]}>: ${tag[0].slice(0, 90)}…`);
  return found;
}

test('Fixture: <title> im SVG und title an Bildern werden gefunden, aria-Namen nicht', () => {
  assert.equal(tooltipFindings('<svg viewBox="0 0 1 1"><title>Plan</title><path d="M0 0"/></svg>').length, 1);
  assert.equal(tooltipFindings('<img src="a.jpg" alt="" title="Hinweis">').length, 1);
  assert.equal(tooltipFindings('<svg role="img" aria-labelledby="t"><path d="M0 0"/></svg><span id="t" hidden>Plan</span>').length, 0);
  // der Seitentitel im <head> ist kein Tooltip
  assert.equal(tooltipFindings('<head><title>FlyingStars</title></head>').length, 0);
});

test('Quellen: keine Tooltips an Illustrationen', () => {
  const files = [...walk(join(root, 'src'), /\.(astro|ts|js|mjs)$/)].filter((f) => !/\.test\.mjs$/.test(f));
  const found = files.flatMap((f) => tooltipFindings(readFileSync(f, 'utf8')).map((x) => `${relative(root, f)}: ${x}`));
  assert.deepEqual(found, []);
});

test('Build-HTML: keine Tooltips an Illustrationen', (t) => {
  const pages = walk(join(root, 'dist'), /\.html$/);
  if (!pages.length) return t.skip('kein dist/, erst npm run build');
  const found = pages.flatMap((f) => tooltipFindings(readFileSync(f, 'utf8')).map((x) => `${relative(root, f)}: ${x}`));
  assert.deepEqual(found.slice(0, 20), [], `${found.length} Fundstellen`);
});
