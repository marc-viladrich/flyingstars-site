// Wächter Ladezeit Himmel (docs/himmel.md → Performance): Der Schwarm darf den Seitenstart nicht wieder mitladen,
// das Hero-Video darf auf dem Handy nicht zum LCP-Element werden, das Canvas darf beim Mitwandern keinen CLS erzeugen.
// Quelltext-Prüfung ohne Build, Laufzeit wenige Millisekunden. Die Messung am Build: npm run perf:start.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const staticImports = (src) => [...src.matchAll(/^\s*import\s+(?:[^'"()]+\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);

test('himmel/index.ts lädt den Schwarm nur dynamisch und bleibt klein', () => {
  const src = read('src/scripts/himmel/index.ts');
  const imports = staticImports(src);
  assert.ok(!imports.some((p) => /schwarm|folge|text-formation|catalog/.test(p)), `statischer Import im Erstbildschirm-Skript: ${imports.join(', ')}`);
  assert.match(src, /import\(\s*['"]\.\/schwarm['"]\s*\)/, 'Schwarm muss per import() nachladen');
  // Alles, was index.ts statisch zieht, gehört zum Skript des ersten Bildschirms: höchstens 8 KB Quelltext
  const bytes = ['index.ts', ...imports.map((p) => p.replace(/^\.\//, '') + '.ts')].reduce((s, f) => s + statSync(new URL(`../src/scripts/himmel/${f}`, import.meta.url)).size, 0);
  assert.ok(bytes < 8000, `Himmel im Erstbildschirm-Skript: ${bytes} Bytes Quelltext (Budget 8000)`);
});

test('Base.astro lädt Himmel nur über index.ts', () => {
  const src = read('src/layouts/Base.astro');
  assert.doesNotMatch(src, /scripts\/himmel\/(schwarm|folge)/);
});

test('Hero: Standbild ist das erste Bild, das Video wird auf dem Handy nicht zum LCP-Element', () => {
  const src = read('src/components/sections/FlightHero.astro');
  const video = src.match(/<video class="reel"[^>]*>/)?.[0] ?? '';
  assert.ok(video, 'Hero-Video fehlt');
  assert.doesNotMatch(video, /\bposter=/, 'poster lädt ein zweites Standbild im kritischen Pfad');
  assert.match(src, /<img [^>]*fetchpriority="high"/, 'Standbild ohne fetchpriority="high"');
  assert.match(src, /@media \(--mobile\)\s*\{[^}]*\.hero > \.reel\s*\{\s*clip-path:\s*inset\(/, 'Video muss auf dem Handy kleiner als das Standbild bleiben (clip-path)');
});

test('Schwarm-Canvas wandert per transform (kein CLS beim Scrollen)', () => {
  const src = read('src/scripts/himmel/schwarm.ts');
  assert.match(src, /s\.transform\s*=\s*'translate\('/);
  assert.doesNotMatch(src, /s\.(left|top)\s*=\s*this\.(left|top)/, 'left/top am Canvas zählt als Layout-Verschiebung');
});

test('Schwarm bestellt Bilder erst nahe ihrer Bühne', () => {
  const src = read('src/scripts/himmel/schwarm.ts');
  const ctor = src.slice(src.indexOf('constructor(defs: SlotDef[])'), src.indexOf('loadFolge(slot: Slot)'));
  assert.match(ctor, /new IntersectionObserver/);
  assert.doesNotMatch(ctor.split('def.react?.')[0], /this\.want\(/, 'want() direkt im Konstruktor lädt alle Motive beim Start');
});
