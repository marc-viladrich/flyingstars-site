// Wächter für Runde 19 (Marc, 03.11.2026). Jeder Test hält eine Klasse fest, nicht einen Einzelfall.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import {landingSiteContent} from '../src/content/shared-blocks.mjs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('Reveals starten spätestens bei einem halben rem im Bild, und die Kurve öffnet sofort', async () => {
  const { REVEAL_REM, REVEAL_MARGIN } = await import('../src/scripts/reveal-point.js');
  assert.ok(REVEAL_REM <= 0.5, `Auslösepunkt ${REVEAL_REM} rem ist zu spät`);
  assert.match(REVEAL_MARGIN, /^0px 0px -\d+px 0px$/);
  const css=read('src/styles/global.css');
  const tokens=Object.fromEntries([...css.matchAll(/(--(?:dur|ease)-[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2]]));
  const resolved=css.replace(/var\((--(?:dur|ease)-[\w-]+)\)/g,(_,name)=>tokens[name]);
  const curtain = resolved.match(/\[data-curtain\] \{[^}]*transition: clip-path [\d.]+s cubic-bezier\(([\d.]+),/);
  assert.ok(curtain && Number(curtain[1]) <= 0.3, 'Vorhang-Kurve beginnt langsam (ease-in), der Start wirkt verspätet');
  assert.doesNotMatch(read('src/scripts/effects/dotimage.js'), /setTimeout\(show, [1-9]\d{3}\)/, 'Lichtpunkt-Reveal lässt das Foto über eine Sekunde leer');
});

test('Reiterwechsel auf dem Handy lässt die Scrollposition stehen', () => {
  const src = read('src/components/MobileTabs.astro');
  assert.match(src, /scrollTo\(\{ top: y,/, 'Position vor dem Wechsel wird zurückgesetzt');
  assert.doesNotMatch(src, /getBoundingClientRect\(\)\.top \+ scrollY/, 'Sprung an den Anfang der Tafel ist zurück');
});

test('Anlässe im Menü: nur Seiten, die es gibt, kein „Unternehmen“ auf die Startseite', () => {
  const nav = JSON.parse(read('src/content/navigation.json')).nav;
  const occasions = nav.find((item) => item.label === 'base.occasions').children;
  assert.deepEqual(occasions.map((c) => c.label), ['site.brandsAdvertising', 'site.agencies', 'site.wedding', 'Indoor']);
  assert.ok(occasions.every((c) => c.href !== '/'), 'Anlass verlinkt auf die Startseite');
});

test('Jeder horizontale Slider hat Pfeile unter sich, auf allen Breiten', () => {
  for (const file of ['src/components/sections/Occasions.astro', 'src/components/projects/CaseStudy.astro']) {
    assert.match(read(file), /<SliderNav\b/, `${file} ohne SliderNav`);
  }
  const css = read('src/styles/global.css');
  assert.doesNotMatch(css, /@media[^{]*\{[^}]*\.slider-nav \{ display: none/, 'Pfeile auf schmalen Breiten ausgeblendet');
  assert.doesNotMatch(css, /\.occ-nav|\.c-reel-head \.ctrl/, 'alte Pfeile oberhalb des Sliders sind zurück');
});

test('Zuständigkeiten: jede Aufgabe, die ihr übernehmt, nennt ein Verb', () => {
  const dir = new URL('../src/content/pages/', import.meta.url);
  const rows = readdirSync(dir).filter((f) => f.endsWith('.yaml')).flatMap((f) =>
    (parse(readFileSync(new URL(f, dir), 'utf8')).sections || []).flatMap((s) => ((s.type === 'landingSite' ? landingSiteContent(s,'de') : s).responsibilities || []).map((r) => ({ f, ...r }))));
  assert.ok(rows.length >= 20, 'keine Zuständigkeitstabellen gefunden');
  for (const r of rows.filter((r) => r.you === 'full')) {
    const words = r.task.replace(/\([^)]*\)/g, '').trim().split(/\s+/);
    assert.match(words.at(-1), /^[a-zäöü]+$/, `${r.f}: „${r.task}“ endet ohne Verb`);
  }
});

test('Marken & Werbung hat die Zuständigkeitstabelle wie Hochzeit und Indoor', () => {
  for (const f of ['drohnenshow-werbung', 'drohnenshow-hochzeit', 'drohnenshow-indoor']) {
    assert.ok(parse(read(`src/content/pages/${f}.yaml`)).sections.some((s) => s.type === 'landingSite' && landingSiteContent(s,'de').responsibilities?.length), f);
  }
});

test('Zonen-Zeichnung: Farben wie im Datenblatt, Zeigen wählt nur bei echter Mausbewegung', () => {
  const src = read('src/components/landing/LandingSite.astro');
  for (const zone of ['safety', 'operative', 'drones', 'start', 'guests']) assert.match(src, new RegExp(`${zone}: '#[0-9a-f]{6}'`), zone);
  assert.match(src, /clientX !== last\.x \|\| p\.clientY !== last\.y/, 'Zuklappen unter dem Zeiger wählt sonst die falsche Zone');
});

test('Cookie-Entscheidung in einer kleinen Karte mit Schaltern, kein zweiter Dialog', () => {
  const src = read('src/scripts/consent.ts');
  assert.match(src, /role="switch" data-purpose=/, 'Schalter stehen in der Karte');
  assert.doesNotMatch(src, /showPreferences\(|showPreferencesBtn/, 'großer Einstellungsdialog ist zurück');
  assert.match(src, /copy\.save : copy\.accept/, 'geänderte Auswahl wird als „Auswahl speichern“ benannt');
  assert.match(read('src/styles/consent.css'), /#cc-main \{ font-size: 1rem; \}/, 'Bibliothek setzt sonst 16px fest');
});

test('Beobachtete Reveal-Elemente sind im Startzustand nicht verschoben (sonst misst der Observer die verschobene Box)', () => {
  const css = ['src/styles/global.css', 'src/styles/facts.css', 'src/styles/media-card.css'].map(read).join('\n');
  // Regeln, die das Element selbst im Zustand „noch nicht drin“ treffen (kein Kind, kein Pseudo-Element danach)
  for (const [, selector, body] of css.matchAll(/([^{}]*:not\(\.is-in\))\s*\{([^}]*)\}/g)) {
    assert.doesNotMatch(body, /transform|translate/, `${selector.trim()} verschiebt das beobachtete Element`);
  }
});

test('404: Text ohne ch-Begrenzung, Schriftgrößen in rem', () => {
  const block = read('src/styles/global.css').split('\n').filter((l) => l.startsWith('.chopper')).join('\n');
  assert.doesNotMatch(block, /max-width: \d+ch/);
  assert.doesNotMatch(block, /font(-size)?:[^;]*\d+px/);
});

test('Auto-Raster erzwingen keine Mindestspalte breiter als der Platz (Reflow bei 320 px und großer Schrift)', () => {
  const files = ['src/styles/global.css', 'src/styles/facts.css', 'src/styles/media-card.css',
    ...readdirSync(new URL('../src/components/', import.meta.url), { recursive: true }).filter((f) => f.endsWith('.astro')).map((f) => `src/components/${f}`)];
  for (const f of files) {
    const bad = read(f).match(/repeat\((auto-fit|auto-fill), minmax\((?!min\()[0-9.]+(rem|px|em)/g);
    assert.equal(bad, null, `${f}: ${bad} — minmax(min(X, 100%), 1fr) verwenden`);
  }
});
