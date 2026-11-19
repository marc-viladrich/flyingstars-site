// Runde 7 (Marc, 19.11.2026): kein Schein an Überschriften, Verlaufsworte gewinnen stattdessen an Schriftstärke; Fallstudien-
// Konturzeile nur als direktes Kind (die frühere Buchstaben-Zerlegung machte jeden zweiten Buchstaben zur Kontur).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('kein Glow und kein Lichtlauf an Überschriften', () => {
  assert.equal(existsSync(new URL('../src/scripts/himmel/lichtlauf.ts', import.meta.url)), false);
  const css = read('src/styles/himmel.css');
  assert.doesNotMatch(css, /text-shadow|hm-licht|hm-lauf/);
  assert.doesNotMatch(read('src/scripts/himmel/index.ts'), /lichtlauf/);
  for (const f of ['src/styles/global.css', 'src/styles/case.css']) assert.doesNotMatch(read(f), /(^|[^-])text-shadow\s*:/m, `${f}: text-shadow`);
});

test('Verlaufsworte: dünner Start nur mit Bewegung, Endstärke sonst sofort', () => {
  const css = read('src/styles/himmel.css');
  assert.match(css, /html\.reveal:not\(\.motion-paused\) :is\(h1, h2, h3\) \.grad:not\(\.st-an\) \{ font-weight: 300;/);
  assert.match(css, /html\.motion-paused :is\(h1, h2, h3\) \.grad \{ transition: none; \}/);
  // 300 ist die untere Grenze der Gewichtsachse der geladenen Schrift
  assert.match(read('src/styles/fonts.css'), /font-family: 'Space Grotesk';[\s\S]*?font-weight: 300 700;/);
});

test('Fallstudien: Konturzeile greift nur an der zweiten Titelzeile', () => {
  const css = read('src/styles/case.css');
  assert.doesNotMatch(css, /\.c-name span:nth-child\(2\)/);
  assert.match(css, /\.c-name > span:nth-child\(2\)/);
});
