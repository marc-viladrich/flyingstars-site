// Marc, 21.11.2026: „alle Slider sollten nur horizontally draggable sein.“ Ein Block mit overflow-x: auto/scroll macht
// overflow-y automatisch zu auto; ragt dann irgendein Kind nach unten heraus (Einblende-Versatz, Schatten, Fokusring),
// lässt sich die Reihe auf dem Handy auch senkrecht schieben. Darum braucht jeder solche Block overflow-y: hidden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
const walk = (dir) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.(css|astro)$/.test(name)) files.push(path); } };
walk(new URL('../src', import.meta.url).pathname);

test('jeder waagerechte Scroll-Bereich sperrt die senkrechte Achse', () => {
  const offenders = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const block of text.matchAll(/([^{};]+)\{([^{}]*overflow-x:\s*(?:auto|scroll)[^{}]*)\}/g)) {
      if (!/overflow-y:\s*(?:hidden|clip)/.test(block[2])) offenders.push(`${file.split('/src/')[1]}: ${block[1].trim()}`);
    }
  }
  assert.ok(files.length > 50, 'Quelldateien gefunden');
  assert.deepEqual(offenders, []);
});
