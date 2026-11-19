// Runde 9 (Marc 20.11.2026: „Bitte einheitlich 3D+ immer“): keine andere Schreibweise als „3D+“ in sichtbaren Texten
// (UI-Wörterbuch, Inhalte, Formular-Function). Zitate in docs/ und Code-Kommentare zählen nicht.
// Aufruf: node --test src/scripts/spelling-3d-plus.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const WRONG = /3\s*-?\s*D[\s-]*plus\b|3D\+\s*plus/i;
const files = (dir, ext) => fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map((f) => path.join(dir, f)).filter((f) => ext.test(f) && fs.statSync(f).isFile()) : [];

test('UI-Wörterbuch: nur „3D+“', () => {
  const ui = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/ui.json'), 'utf8'));
  for (const [key, value] of Object.entries(ui)) for (const [lang, text] of Object.entries(value)) assert.ok(!WRONG.test(String(text)), `${key}.${lang}: ${text}`);
  for (const art of ['de', 'en', 'nl']) assert.match(ui['preise.art.story'][art], /^3D\+$/);
});

test('Inhalte und Formular: nur „3D+“', () => {
  for (const f of [...files(path.join(root, 'src/content'), /\.(ya?ml|md|json)$/), ...files(path.join(root, 'functions'), /\.(ts|js|mjs)$/)]) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => assert.ok(!WRONG.test(line), `${path.relative(root, f)}:${i + 1}: ${line.trim()}`));
  }
});
