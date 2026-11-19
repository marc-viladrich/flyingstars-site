import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getPackageDetails } from '../src/content/package-details.ts';
import { PACKAGE_NAMES } from '../src/content/show-packages.ts';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('Leistungs-IDs besitzen jede Paketprojektion in DE, EN und NL', () => {
  let ids;
  for (const locale of ['de', 'en', 'nl']) {
    const { SERVICES, COMPARISON, PACKAGE_POINTS, PACKAGE_FEATURES, INCLUDED } = getPackageDetails(locale);
    assert.equal(new Set(SERVICES.map(s => s.id)).size, SERVICES.length);
    assert.deepEqual(COMPARISON.map(r => r.id), SERVICES.map(s => s.id));
    if (ids) assert.deepEqual(COMPARISON.map(r => r.id), ids); else ids = COMPARISON.map(r => r.id);
    for (const [i, name] of PACKAGE_NAMES.entries()) {
      const points = SERVICES.flatMap(s => s.summary?.[name] ?? []).sort((a,b) => a.order - b.order);
      assert.equal(points.length, 3);
      assert.deepEqual(PACKAGE_POINTS[name], points.map(p => p.text));
      const cards = SERVICES.flatMap(s => s.cards?.[name] ?? []).sort((a,b) => a.order - b.order);
      assert.deepEqual(PACKAGE_FEATURES[name].groups.flatMap(g => g.items), cards.map(p => p.text));
      for (const s of SERVICES) if (s.cards?.[name] || s.summary?.[name]) assert.ok(s.all || s.cells[i], `${s.id} in ${name} auch in der Matrix`);
    }
    assert.equal(INCLUDED.length, 4);
    for (const item of INCLUDED) {
      const service = SERVICES.find(s => s.id === item.id);
      assert.ok(service.cells.every(Boolean));
      assert.equal(item.text, service.included.text);
    }
  }
});
test('Paketansichten haben genau einen Kartenbesitzer; ungenutzter Altbestand bleibt entfernt', () => {
  for (const file of ['Packages', 'Pricing']) {
    const source = read(`src/components/sections/${file}.astro`);
    assert.match(source, /<PackageCard /);
    assert.doesNotMatch(source, /<canvas|class:list=\{\['(?:pack|tier)'/);
  }
  assert.ok(!existsSync(new URL('../src/components/pricing/PackageDetails.astro', import.meta.url)));
  assert.doesNotMatch(read('src/components/PackageCard.astro'), /sky\s*=\s*PACKAGE_DETAILS/, 'Optionale Seitenprosa darf nicht als neuer Karteninhalt erscheinen');
});

test('Alle Vergleiche delegieren Tabelle, Handyfassung und Statuszeichen an dieselben Besitzer', () => {
  // Ein Besitzer (ComparisonMatrix) für Desktop-Tabelle und Handyfassung; Aufrufer sind der eigene Abschnitt und die
  // Einbettung in die Nachhaltigkeits-Scrollstory. Die Preisseite zeigt seit Moritz' Preistext (17.11.2026) keinen
  // Leistungsvergleich mehr; baut sie wieder einen, dann nur über ComparisonMatrix, nie als eigene Tabelle.
  for (const path of ['src/components/sections/Comparison.astro', 'src/components/sections/Sustainability.astro', 'src/templates/PricingPage.astro']) {
    const source = read(path);
    if (path.includes('sections/')) assert.match(source, /<ComparisonMatrix /);
    assert.doesNotMatch(source, /<table|<td|role="(?:table|row|cell)"|class="cmp-panel"/);
  }
  assert.ok(!existsSync(new URL('../src/components/ComparisonTable.astro', import.meta.url)), 'kein zweiter Vergleichsrenderer');
  const matrix = read('src/components/ComparisonMatrix.astro');
  assert.equal((matrix.match(/<ComparisonCell /g) ?? []).length, 2, 'Tabellenzelle und Zelle der Handyfassung');
  // Handyfassung: ein Renderpfad, Spaltenzahl aus den Daten statt fester drei Spalten, keine Reiter-Tafeln mehr
  assert.doesNotMatch(matrix, /<MobileTabs |cmp-panel|data-mtab/);
  assert.match(matrix, /--cmp-cols:\$\{cols\.length\}/);
  assert.match(matrix, /repeat\(var\(--cmp-cols\), minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(matrix, /repeat\(3,/);
  assert.doesNotMatch(read('src/styles/global.css'), /\.cmp-panel|\.mtab-(?:only|hide)\b/);
  // Paketkarten behalten ihre aktiven Reiter
  assert.match(read('src/components/sections/Packages.astro'), /<MobileTabs /);
  // LandingSite zeigt seit Runde 3 (17.11.2026) keine Zuständigkeitstabelle mehr, nur die Zeichnung mit Popovern
  assert.doesNotMatch(read('src/components/landing/LandingSite.astro'), /<table|<td/);
  assert.doesNotMatch(read('src/components/ComparisonCell.astro'), /<svg|<path/);
});

test('Einzelbild-Rahmen, Presse-Einträge und CSS-Dauerschleifen haben je einen Besitzer', () => {
  // Einzelbild mit Leuchtpunkt-Unterlage: Seitenkopf und Text mit Bild setzen nur Bildmaß, Ladepriorität und Layoutklasse
  for (const file of ['sections/Hero', 'sections/TextMedia']) {
    const s = read(`src/components/${file}.astro`);
    assert.match(s, /<ImageFrame /);
    assert.doesNotMatch(s, /<DotField|<figure|data-curtain|<Picture /);
  }
  assert.match(read('src/components/ImageFrame.astro'), /<DotField \/><figure data-curtain><Picture /);
  assert.doesNotMatch(read('src/styles/global.css'), /\.(?:page-hero-media|tm-media)\b/);
  // Presse: Pressezeile und Presseraster rendern denselben Eintrag
  const bar = read('src/components/sections/LogoBar.astro');
  assert.equal((bar.match(/<PressItem /g) ?? []).length, 2);
  assert.doesNotMatch(bar, /<LocalImage |rel="noopener"/);
  // Dauerschleifen hängen am gemeinsamen Sichtbarkeits-/Bewegungsschalter
  assert.match(bar, /class="logo-marquee" data-loop/);
  assert.match(read('src/components/sections/FlightHero.astro'), /class="rec mono" data-loop/);
  for (const [name, file] of [['logo-slide', 'src/components/sections/LogoBar.astro'], ['rec', 'src/styles/global.css']]) assert.match(read(file), new RegExp(`animation: ${name} [^;]*infinite; animation-play-state: var\\(--loop-play, running\\);`));
  // Laufband- und Presseregeln gehören der LogoBar, nicht dem globalen Stylesheet
  assert.doesNotMatch(read('src/styles/global.css'), /\.logo-marquee|\.proof \.press|\.proof-h/);
});

test('Alle aktiven Reels verwenden den gemeinsamen Video-Controller', () => {
  for (const file of ['src/scripts/hero-reel.ts','src/components/landing/LandingHero.astro','src/components/projects/ProjectCard.astro']) {
    const source = read(file); assert.match(source, /createVideoController/); assert.doesNotMatch(source, /\.play\(|new IntersectionObserver|new MutationObserver/);
  }
});

test('Globales CSS hat keine mehrfachen Eigenschaftsbesitzer im selben Kontext', async () => {
  const { default: postcss } = await import('postcss');
  const seen = new Map(), duplicates = [];
  for (const sheet of ['global.css', 'facts.css', 'case.css', 'media-card.css']) postcss.parse(read(`src/styles/${sheet}`)).walkRules(rule => {
    const parents=[];for(let n=rule.parent;n.type!=='root';n=n.parent)parents.unshift(`@${n.name} ${n.params.replace(/\s+/g,'')}`);
    const local = new Set();
    for (const declaration of rule.nodes.filter(n=>n.type==='decl')) {
      for(const selector of postcss.list.comma(rule.selector)) {
        const key = parents.join('|')+'|'+selector+'|'+declaration.prop;
        if(seen.has(key)&&!local.has(key))duplicates.push(key);
        seen.set(key,declaration);local.add(key);
      }
    }
  });
  assert.deepEqual(duplicates, []);
  assert.doesNotMatch(read('src/styles/global.css'), /\.(?:inclusive|tier-facts|tl-item|faq-closing|ref-filter|ref-count|lang)\b/);
});

test('Filter und Textstile erben Auswahlzustände; alle aktiven Selects erben dieselbe Basis', () => {
  // Runde 22: die Konfigurator-Anlässe sind wieder Pills (Variante chips-quiet), kein <select> mehr
  for(const [path, cls] of [['src/components/sections/References.astro','rf-pills'],['src/components/configurator/ShowConfigurator.astro','cfg-styles'],['src/components/configurator/ShowConfigurator.astro','chips-quiet cfg-occasions']]) {
    const s=read(path);assert.match(s,new RegExp(`class="chips ${cls}"`));
    assert.doesNotMatch(s,new RegExp(`\\.${cls}[^\\n]*(?:input|:checked|:focus-visible|:hover)`));
  }
  assert.doesNotMatch(read('src/styles/show-configurator.css'),/\.cfg-occasions[^\n]*(?:input|:checked|:focus-visible|:hover)/);
  for(const path of ['src/components/sections/References.astro','src/components/sections/ContactForm.astro']) {
    const selects=read(path).replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g,'').match(/<select\b[^>]*>/g)??[];if(path.includes("References"))assert.ok(selects.length); // das Kontaktformular hat seit Runde 5 kein Select mehr (Herkunftsfrage steht auf der Danke-Seite)
    for(const s of selects)assert.match(s,/class="native-select"/);
  }
  assert.doesNotMatch(read('src/styles/global.css'),/\.field input[, {]|\.field select[, {]|\.field textarea[, {]/);
});

test('Alle redaktionellen Faktenlisten und Prozesslisten delegieren an ihre Besitzer', () => {
  for(const file of ['sections/Metrics','sections/Tempo','projects/CaseStudy','landing/LandingHero','landing/LandingStories','landing/LandingSpotlight','sections/Sustainability','sections/FlightHero']) {
    const s=read(`src/components/${file}.astro`);assert.match(s,/<FactList /);assert.doesNotMatch(s,/<dl\b/);
  }
  for(const file of ['sections/Steps','sections/Timeline','landing/LandingFlow','MetroLine']) {
    const s=read(`src/components/${file}.astro`);assert.match(s,/<ProcessList /);assert.doesNotMatch(s,/<ol\b/);
  }
  assert.doesNotMatch(read('src/styles/global.css'),/\.ruler li:nth-child\(\d/);
  assert.match(read('src/styles/global.css'), /\.steps \{[^}]*repeat\(var\(--n\)/);
  const script=read('src/components/projects/case.js');assert.match(script,/\.c-story \[data-story-step\]/);assert.doesNotMatch(script,/querySelectorAll\("\[data-step\]"\)/);
});

test('Section-Köpfe, Icon-Features, Medienkarten und Aufnahme-Ecken haben je einen Besitzer', () => {
  for(const file of ['sections/Faq','sections/ContactForm','sections/TextMedia','sections/Sustainability','sections/LogoBar','configurator/ShowConfigurator','projects/CaseStudy'])assert.match(read(`src/components/${file}.astro`),/<SectionHead /);
  for(const file of ['landing/LandingSite','sections/Sustainability','sections/LogoBar','pricing/Included','landing/LandingBento','pricing/Extras'])assert.match(read(`src/components/${file}.astro`),/<IconFeature /);
  const feature=read('src/components/IconFeature.astro');assert.match(feature,/\? 18 : 36/);assert.match(feature,/<H class="ic-h">/);
  for(const file of ['projects/ProjectCard','blog/PostCard','landing/LandingStories','sections/Occasions','sections/References'])assert.match(read(`src/components/${file}.astro`),/<MediaCard /);
  for(const file of ['sections/FlightHero','landing/LandingHero']){
    const s=read(`src/components/${file}.astro`);assert.match(s,/<MediaFrame /);assert.doesNotMatch(s,/<i><\/i>/);
  }
  assert.match(read('src/components/MediaCard.astro'),/\.\.\.rest/);
  assert.doesNotMatch(read('src/components/sections/References.astro'),/\.rf-ghost[^\n]*\{/);
  assert.match(read('src/components/MediaCard.astro'),/href && Astro.slots.has\('actions'\)/);
});
