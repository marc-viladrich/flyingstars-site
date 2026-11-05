// Token-Besitzer statt neuer Marken-/Motion-Kopien; betrifft ausschließlich Site-CSS und Astro-Styles.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import postcss from 'postcss';
import {cssMedia, expandMedia, mediaAliases} from './css-media.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(join(root, file), 'utf8');
function files(dir) {
  return readdirSync(join(root, dir), {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : /\.(css|astro)$/.test(e.name) ? [join(dir, e.name)] : []);
}
function regions(source, file) {
  if (file.endsWith('.css')) return [source];
  return [...source.matchAll(/<style\b(?![^>]*\/>)[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1])
    .concat([...source.matchAll(/\bstyle=(?:"([^"]*)"|'([^']*)'|\{`((?:\\.|[^`])*)`\})/g)].map(m => `.inline{${(m[1] ?? m[2] ?? m[3]).replace(/\$\{[^}]*\}/g, '0')}}`));
}
const channels = [...read('src/styles/global.css').matchAll(/--rgb-[\w-]+:\s*(\d+) (\d+) (\d+);/g)].map(m => m.slice(1).map(Number));
const brand = new Set(channels.map(c => c.join(' ')));
// Keine pauschale Datei-Ausnahme: diese Protokollwerte dürfen keine sichtbare Animation erzeugen.
const motionExceptions = new Map([
  [0, 'Keine Verzögerung / sofortiger Zustandswechsel; Teil des bestehenden Bewegungsprotokolls.'],
  [0.00001, '0.01ms erhält animationend/transitionend bei globaler Pause und reduced motion (Runde 20).'],
]);
function numericColors(value) {
  return [...value.matchAll(/#[\da-f]{3,8}\b|\brgba?\([^()]*\)/gi)].map(m => {
    if (m[0][0] === '#') {
      let hex = m[0].slice(1); if (hex.length === 3 || hex.length === 4) hex = [...hex].map(c => c+c).join('');
      return [0,2,4].map(i => parseInt(hex.slice(i,i+2), 16)).join(' ');
    }
    return m[0].slice(m[0].indexOf('(')+1).split(/[,/\s]+/).filter(Boolean).slice(0,3).map(Number).join(' ');
  });
}
function declarations(sources) {
  const out = [];
  for (const {file, css} of sources) postcss.parse(css, {from: file}).walkDecls(d => {
    out.push({file, prop: d.prop, value: d.value, owner: file === 'src/styles/global.css' && d.parent.selector === ':root'});
  });
  return out;
}
// Masken tragen nur Deckkraft, keine Farbe: dort bleiben feste Werte (#000, rgba(0,0,0,…)). Mit var() in der
// -webkit-mask-Kurzschreibweise setzt WebKit das folgende mask-composite zurück, und die Verlaufsrahmen (CtaBox,
// empfohlenes Paket, Gates) verschwinden (Claude, 04.11.2026, Pixelvergleich nach der Token-Umstellung).
const MASK = /^(?:-webkit-)?mask(?:-image)?$/;
function violations(decls) {
  const durations = new Map(), curves = new Map();
  for (const d of decls) {
    d.times = [...d.value.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)].map(m => Number(m[1]) / (m[2] === 'ms' ? 1000 : 1));
    d.curves = [...d.value.matchAll(/cubic-bezier\([^)]*\)|(?<![\w-])(?:ease-in-out|ease-out|ease-in|ease|linear)(?![\w(-])/g)].map(m => m[0].replace(/\s+/g,'').replace(/-?\d*\.?\d+/g,n=>String(Number(n))));
    for (const n of d.times) durations.set(n, (durations.get(n) ?? 0)+1);
    for (const c of d.curves) curves.set(c, (curves.get(c) ?? 0)+1);
  }
  return decls.filter(d => !d.owner).flatMap(d => [
    ...(MASK.test(d.prop) ? [] : numericColors(d.value).filter(c => brand.has(c)).map(() => `${d.file}: Markenfarbe in ${d.prop}: ${d.value}`)),
    ...d.times.filter(n => !motionExceptions.has(n) && durations.get(n)>1).map(n => `${d.file}: wiederholte Dauer ${n}s in ${d.prop}`),
    ...d.curves.filter(c => curves.get(c)>1).map(c => `${d.file}: wiederholte Kurve ${c} in ${d.prop}`),
  ]);
}
test('CSS und Astro-Inline-Styles verwenden die zentralen Marken- und Motion-Tokens', () => {
  const sources = files('src').flatMap(file => regions(read(file), file).map(css => ({file, css})));
  assert.deepEqual(violations(declarations(sources)), []);
});
// SVG-Präsentationsattribute und eigenständige Diagrammdaten bleiben außerhalb der CSS-Migration.
// Die Allowlist zählt die vorhandenen Markenliterale genau; sie erlaubt keine neue Farbkopie in derselben Datei.
const astroColorExceptions = [
  {file:'src/layouts/Base.astro', line:/<svg.*linearGradient id="fs-grad"/, count:3, reason:'Fester SVG-Verlauf, auch von SVG-url()-Referenzen genutzt.'},
  {file:'src/components/sections/References.astro', line:/<defs><linearGradient/, count:3, reason:'SVG-Gradient-Stops im eigenen Benutzerkoordinatensystem.'},
  {file:'src/components/sections/References.astro', line:/f\.sky\.map/, count:1, reason:'SVG-Lichtpunkte mit pro Punkt gesetzter Deckkraft.'},
  {file:'src/components/landing/LandingSite.astro', line:/^const colors =/, count:4, reason:'Eigenständige Zwischenstufen der SVG-Zonenillustration.'},
  {file:'src/components/landing/LandingSite.astro', line:/^const zoneColor:/, count:2, reason:'Zonenfarben sind Diagrammdaten, kein globales CSS.'},
];
test('Astro erlaubt Markenliterale außerhalb von CSS nur in belegten SVG-Daten', () => {
  const used = new Map(), errors = [];
  for (const file of files('src').filter(f=>f.endsWith('.astro'))) {
    const source=read(file).replace(/<style\b(?![^>]*\/>)[^>]*>[\s\S]*?<\/style>/g,'');
    for (const line of source.split('\n')) {
      const count=numericColors(line).filter(c=>brand.has(c)).length;
      if (!count) continue;
      const exception=astroColorExceptions.find(e=>e.file===file && e.line.test(line));
      if (exception) used.set(exception,(used.get(exception)??0)+count);
      else errors.push(file+': '+line.trim());
    }
  }
  assert.deepEqual(errors,[]);
  for (const exception of astroColorExceptions) assert.equal(used.get(exception),exception.count,exception.reason);
});
test('Gemeinsame Token-Verweise haben genau einen Root-Besitzer', () => {
  const sources=files('src').flatMap(file=>regions(read(file),file).map(css=>({file,css})));
  const decls=declarations(sources), owners=new Map();
  const family=/^--(?:rgb-|dur-|ease-|space-|radius-)/;
  for (const d of decls.filter(d=>family.test(d.prop))) {
    assert.ok(d.owner, d.file+': '+d.prop+' braucht einen Root-Besitzer');
    assert.ok(!owners.has(d.prop), d.prop+' ist mehrfach definiert'); owners.set(d.prop,d.value);
  }
  for (const d of decls) for (const m of d.value.matchAll(/var\((--[\w-]+)/g)) if (family.test(m[1])) assert.ok(owners.has(m[1]),d.file+': unbekannter Token '+m[1]);
});
test('Token-Wächter erkennt neue Hex-/RGBA-Kopien, äquivalente Dauern und Kurven', () => {
  const css = ':root{--dur:0.2s;--ease:cubic-bezier(.3,.7,.2,1)}.a{color:#f6f1e8;background:rgba(15,13,12,.5);transition:color 200ms cubic-bezier(.3, .7, .2, 1)}';
  assert.equal(violations(declarations([{file:'src/styles/global.css',css}])).length,4);
  assert.equal(violations(declarations([{file:'src/future.css',css:'.a{animation:foo 1.3s ease}.b{transition:opacity 1300ms ease}'}])).length,4);
  assert.deepEqual(violations(declarations([{file:'src/future.astro',css:'.a{color:rgb(var(--rgb-text) / .4);transition:opacity var(--dur-control) var(--ease-default);animation-delay:0s;transition-duration:0.01ms}'}])),[]);
});
test('Custom Media löst die zentralen em-Grenzen in jedem Astro-/CSS-Modul auf', async () => {
  const aliases = mediaAliases();
  const input = [...aliases.keys()].map(name => `@media (${name}){.a{color:red}}`).join('');
  const result = await postcss([cssMedia()]).process(input, {from: 'component.astro'});
  assert.doesNotMatch(result.css, /\(--|@custom-media/);
  for (const query of aliases.values()) assert.ok(result.css.includes('@media '+query));
  assert.ok(result.messages.some(m => m.type === 'dependency' && m.file.endsWith('/src/styles/media.css')));
  assert.equal(expandMedia('(hover: hover) and (--nav-expanded)'), '(hover: hover) and (min-width: 62.5625em)');
  assert.equal(expandMedia('not all and (--mobile)'), 'not all and (max-width: 43.75em)');
  assert.throws(() => expandMedia('(--typo)'), /Unbekannt/);
  assert.throws(() => mediaAliases('@custom-media --x (max-width: 40em);@custom-media --x (max-width: 41em);'), /eindeutig/);
  assert.throws(() => mediaAliases('@custom-media --x (width < 40em);'), /einzelne em-Grenze/);
});
test('Mobile und Navigation behalten bei Root 16/20/32 ihre ursprünglichen Grenzen', () => {
  for (const font of [16,20,32]) {
    const bound = name => Number(mediaAliases().get(name).match(/[\d.]+/)[0]) * font;
    assert.equal(bound('--mobile'), 43.75 * font);
    assert.equal(bound('--nav-collapsed'), 62.5 * font);
    assert.equal(bound('--nav-expanded'), 62.5625 * font);
  }
});

test('Masken enthalten keine Variablen (WebKit verliert sonst mask-composite und damit die Verlaufsrahmen)', () => {
  const sources = files('src').flatMap(file => regions(read(file), file).map(css => ({file, css})));
  const bad = declarations(sources).filter(d => MASK.test(d.prop) && /var\(/.test(d.value)).map(d => d.file + ': ' + d.prop);
  assert.deepEqual(bad, []);
});

test('Dynamische selbstschließende Styles verschlucken keine nachfolgenden CSS- und SVG-Quellen', () => {
 const source='<style is:inline set:html={processedCss} /><svg fill="#ff9e29" /><style>.sample { color: red; }</style>';
 assert.deepEqual(regions(source,'sample.astro'), ['.sample { color: red; }']);
 assert.equal(declarations(regions(source,'sample.astro').map(css=>({file:'sample.astro',css})))[0].value,'red');
});
