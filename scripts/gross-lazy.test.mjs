// Runde 11 (Marc 20.11.2026): große Motive dürfen den Seitenaufruf und das erste Motiv nicht verlangsamen. Jedes Modul in
// src/scripts/scenes/gross/ wird nur über die Zuordnung GROSS per import() geladen, nie statisch, und liefert genau
// die Baunamen, unter denen es eingetragen ist. Aufruf: node --test scripts/gross-lazy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { GROSS } from '../src/scripts/scenes/gross/index.js';

const dir = 'src/scripts/scenes/gross';
const modules = readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'index.js' && !f.endsWith('.test.js'));

test('kein Modul aus scenes/gross wird statisch importiert', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : e.name.match(/\.(m?js|ts|astro)$/) ? [join(d, e.name)] : []);
  for (const file of walk('src')) {
    const src = readFileSync(file, 'utf8');
    for (const m of modules) {
      const stat = new RegExp(`^\\s*import\\s[^;]*from\\s*["'][^"']*gross/${m.replace('.', '\\.')}["']`, 'm');
      assert.ok(!stat.test(src), `${file} importiert gross/${m} statisch`);
    }
  }
});

test('index.js enthält nur dynamische Importe', () => {
  const src = readFileSync(join(dir, 'index.js'), 'utf8');
  assert.ok(!/^\s*import\s/m.test(src), 'gross/index.js darf nichts statisch importieren');
});

test('jeder Eintrag lädt ein Modul, das genau diesen Baunamen liefert', async () => {
  for (const [key, load] of Object.entries(GROSS)) {
    const mod = await load();
    assert.equal(typeof mod.builders?.[key], 'function', `${key}: Modul liefert builders.${key} nicht`);
  }
});
