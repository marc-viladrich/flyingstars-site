// Runde 9 (Marc): gestapelt (Tablet, Handy) hingen die Formationen der Show-Bühnen klein in der Spalte, weil die Bühnen eine
// feste Höhe hatten (Show-Folge #warum-drohnen bis 20rem, Indoor-Reihe bis 22rem) und die Folge ihre Motive in diese Höhe
// einpasst (folge.js: min(Breite / 2,3, Höhe / 1,5)). Beide Bühnen nehmen ihre Höhe jetzt aus der Spaltenbreite (3 : 2).
// Dazu: Scrollstory-Kopf in der Hero-Stufe (gemessener Wächter: layout-audit.mjs head-size) und der Lichtkegel der
// NRW-Karte mit Maus und Touch, wenn Bewegung erlaubt ist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('Show-Folge unter dem Text: Höhe aus der Breite, keine feste Höhe', () => {
  const rule = read('src/styles/himmel.css').match(/#warum-drohnen::after \{[^}]*\}/)?.[0] ?? '';
  assert.match(rule, /aspect-ratio: 3 \/ 2/);
  assert.doesNotMatch(rule, /(^|[ ;{])height:/, rule);
});

test('Indoor-Reihe gestapelt: dieselbe Regel', () => {
  const css = read('src/components/sections/Sustainability.astro');
  assert.match(css, /@media \(--grid-stacked\) \{[^\n]*\.eco-staged \{ --stage-min: 15rem; grid-template-columns: minmax\(0, 1fr\); \} \.eco-show \{ aspect-ratio: 3 \/ 2; max-height: 32rem; \}/);
});

test('Scrollstory-Kopf in der Hero-Stufe, Startseite mit benanntem Riesenformat (Runde 5)', () => {
  const css = read('src/styles/global.css');
  assert.match(css, /\.eco-title \{ font: 700 var\(--text-page\)/);
  assert.match(css, /\.eco-head-xl \.eco-title \{ font-size: clamp\(3rem, 8\.2vw, 8\.5rem\)/);
  const src = read('src/components/sections/Sustainability.astro');
  assert.match(src, /const home = \/\^\\\/\(\?:en\\\/\|nl\\\/\)\?\$\/\.test\(Astro\.url\.pathname\)/);
  assert.match(src, /'eco-head-xl': home/);
  assert.match(read('scripts/layout-audit.mjs'), /const EXEMPT = '\.eco-head-xl';/);
});

test('Lichtkegel der NRW-Karte: feste Punktmaske und nur bei erlaubter Bewegung', () => {
  const src = read('src/components/sections/Location.astro');
  assert.match(src, /\.loc-lit \{ display: none;/);
  assert.match(src, /@media \(prefers-reduced-motion: no-preference\) \{[^}]+\}\s*:global\(html:not\(\.motion-paused\)\) \.loc-lit \{ display: block;/);
  // Runde 15: Punktmaske geschnitten mit dem Lichtkreis (Darstellung wie Runde 9), Lage per Skript statt Zeigezellen
  assert.match(src, /mask-image: url\(\/media\/standort-nrw-maske\.svg\), radial-gradient\(circle 8\.5rem at var\(--sx\) var\(--sy\)/);
  assert.match(src, /stage\.style\.setProperty\('--sx'/);
  assert.doesNotMatch(src, /class="loc-hit"|:has\(\.hc\d/);
  assert.ok(existsSync(new URL('../public/media/standort-nrw-maske.svg', import.meta.url)));
});
