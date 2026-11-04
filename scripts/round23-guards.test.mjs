// Runde 23 (04.11.2026): Safari bis 26.6 wertet parallel importierte Module mit Top-Level-await fehlerhaft aus
// (WebKit-Bug 242740, volle Unterstützung laut MDN erst ab Safari 27). Bei Marcs Safari 18.6 lud dadurch der
// Konfigurator nicht. Kein Browser-Modul darf Top-Level-await enthalten; das UI-Wörterbuch kommt als klassisches Skript.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { transformSync } from 'esbuild';
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const files = (dir) => readdirSync(new URL(dir, root)).flatMap((name) => { const p = join(dir, name); return statSync(new URL(p, root)).isDirectory() ? files(p) : [p]; });
// esbuild lehnt Top-Level-await im CommonJS-Format ab; andere Syntax wird umgeschrieben, nicht abgelehnt.
const hasTopLevelAwait = (code, loader) => { try { transformSync(code, { loader, format: 'cjs', logLevel: 'silent' }); return false; } catch (e) { return /top-level await/i.test(String(e.message)); } };

test('Browser-Quellen ohne Top-Level-await', () => {
  const offenders = [];
  for (const dir of ['src/scripts', 'src/i18n', 'src/content', 'src/lib']) for (const file of files(dir)) {
    const m = file.match(/\.(m?js|ts)$/); if (!m || /\.test\.|\.d\.m?ts$/.test(file)) continue;
    if (hasTopLevelAwait(read(file), m[1] === 'ts' ? 'ts' : 'js')) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('Gebaute Browser-Chunks ohne Top-Level-await', { skip: !existsSync(new URL('dist/_astro', root)) && 'kein Build' }, () => {
  const offenders = files('dist/_astro').filter((f) => f.endsWith('.js') && hasTopLevelAwait(read(f), 'js'));
  assert.deepEqual(offenders, []);
});

test('UI-Wörterbuch als klassisches Skript vor den Modulen, ui.mjs liest synchron', () => {
  const base = read('src/layouts/Base.astro');
  assert.match(base, /<meta charset="utf-8" \/>\n[^\n]*\n\s*<script is:inline defer src=\{`\/media\/i18n\/\$\{locale\}\.js`\}><\/script>/);
  assert.match(read('src/pages/media/i18n/[locale].js.ts'), /globalThis\.__FS_UI__=/);
  assert.doesNotMatch(read('src/i18n/ui.mjs'), /^[^/\n]*\bawait\b/m);
});
