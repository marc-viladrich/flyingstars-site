// Wächter Ladezeit Himmel (docs/himmel.md → Performance): Der Schwarm darf den Seitenstart nicht wieder mitladen,
// das Hero-Video darf auf dem Handy nicht zum LCP-Element werden, das Canvas darf beim Mitwandern keinen CLS erzeugen.
// Quelltext-Prüfung ohne Build, Laufzeit wenige Millisekunden. Die Messung am Build: npm run perf:start.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const staticImports = (src) => [...src.matchAll(/^\s*import(?!\s+type\b)\s+(?:[^'"()]+\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);

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
  assert.match(src, /\.transform\s*=\s*'translate\('/);
  assert.doesNotMatch(src, /style\.(left|top)\s*=\s*(this\.|f\.)?(left|top|L|T)\b/, 'left/top am Canvas zählt als Layout-Verschiebung');
});

test('Runde 5: Zeichenflächen werden nur bei neuer Pixelgröße angelegt, Flug in Pixeldichte 1', () => {
  // WebKit-Messung 18.11.: Jedes Neuanlegen der seitenbreiten Fläche (gut 5 Mio. Pixel) beim Abflug, bei der Landung und beim
  // Mitwandern kostete Frames bis 200–700 ms an den Section-Grenzen (docs/himmel.md → Performance)
  const src = read('src/scripts/himmel/schwarm.ts');
  assert.match(src, /fly = surface\(\); stand = surface\(\)/, 'zwei feste Flächen');
  assert.match(src, /if \(f\.pw !== pw \|\| f\.ph !== ph\) \{ f\.cv\.width = /, 'width/height nur bei neuer Pixelgröße setzen');
  assert.equal((src.match(/\.cv\.width\s*=/g) ?? []).length, 1, 'kein weiteres Neuanlegen');
  assert.match(src, /const d = f === this\.stand \|\| crisp \? full : 1;/, 'Flugfläche in Pixeldichte 1');
});

test('Runde 5: Zeiger verdrängt (Feder wie Scrollstory), kein Aufleuchten; Himmelszeile entfernt', () => {
  const src = read('src/scripts/himmel/schwarm.ts');
  assert.match(src, /const f = \(1 - md \/ reach\) \*\* 2 \* push \*/);
  assert.doesNotMatch(src, /near \* Math\.exp/, 'Glow-Hover ist ersetzt');
  for (const f of ['src/scripts/himmel/index.ts', 'src/scripts/himmel/schwarm.ts', 'src/styles/himmel.css']) assert.doesNotMatch(read(f), /hm-zeile|zeileVorab|from '\.\/zeile'/, `${f}: Reste der Himmelszeile`);
});

test('Schwarm bestellt Bilder erst nahe ihrer Bühne', () => {
  const src = read('src/scripts/himmel/schwarm.ts');
  const ctor = src.slice(src.indexOf('constructor(defs: SlotDef[]'), src.indexOf('loadFolge(slot: Slot'));
  assert.match(ctor, /new IntersectionObserver/);
  assert.doesNotMatch(ctor.split('def.react?.')[0], /this\.want\(/, 'want() direkt im Konstruktor lädt alle Motive beim Start');
});

test('Runde 6: Punktübergänge an jeder Farbfläche, ohne Trennlinien, Masken vorhanden', () => {
  // Browserprüfung über alle Seiten: npm run check:uebergaenge (in npm run perf:start für sechs Seiten)
  // .c-setlist gehört seit Audit 4 (C2) der Fallstudien-Datei case.css, .team-sec der Komponente Team.astro
  const css = read('src/styles/himmel.css'), global = [read('src/styles/global.css'), read('src/styles/case.css'), read('src/components/sections/Team.astro')].join('\n');
  // Der Footer (Runde 7) läuft nur nach oben aus: in der ::before-Liste, nicht in der ::after-Liste (sein unteres Band läge unter dem Seitenende)
  const list = css.match(/:is\(\.section\.alt, \.c-setlist, \.team-sec, \.footer\)::before, :is\(\.section\.alt, \.c-setlist, \.team-sec\)::after \{[^}]*\}/)?.[0] ?? '';
  assert.match(list, /background-color: inherit/, 'Punkte tragen die Farbe der eigenen Fläche');
  assert.match(list, /mask: var\(--ueb-maske\)/);
  for (const sel of ['.section.alt', '.c-setlist', '.team-sec']) {
    const rule = global.split('\n').map((l) => l.trim()).find((l) => l.startsWith(`${sel} {`)) ?? '';
    assert.ok(rule, `${sel} fehlt in global.css/case.css/Team.astro`);
    assert.doesNotMatch(rule, /border-(top|bottom)/, `${sel}: Trennlinie an einer Farbkante bricht den Punktübergang`);
  }
  const footer = global.split('\n').map((l) => l.trim()).find((l) => l.startsWith('.footer {')) ?? '';
  assert.doesNotMatch(footer, /border-top/, '.footer: Punktübergang statt Linie (Runde 7)');
  assert.match(footer, /background: var\(--night\)/, '.footer: eigene Fläche, sonst ist der Übergang unsichtbar');
  for (const f of ['public/media/uebergang.svg', 'public/media/uebergang-schmal.svg']) assert.ok(statSync(new URL(`../${f}`, import.meta.url)).size > 1000, f);
});

test('Runde 6: Verdrängung sanft (kleiner Radius, Ausschlag rund ein Viertel, weich gesättigt, kritisch gedämpft)', () => {
  const src = read('src/scripts/himmel/schwarm.ts');
  assert.match(src, /const K = 5, C = 2 \* Math\.sqrt\(K\), reach = clamp\(Math\.min\(slot\.box\.w, slot\.box\.h\) \* 0\.32, 44, 84\), most = reach \* 0\.3,/);
  assert.match(src, /push \* Math\.max\(0, 1 - Math\.hypot\(this\.ox\[i\], this\.oy\[i\]\) \/ most\)/, 'Stoß sättigt weich am Höchstausschlag');
});
