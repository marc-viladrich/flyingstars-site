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
});

test('Alle Vergleiche delegieren Tabelle, Tafeln und Statuszeichen an dieselben Besitzer', () => {
  for (const path of ['src/components/sections/Comparison.astro', 'src/templates/PricingPage.astro']) {
    const source = read(path);
    assert.match(source, /<ComparisonMatrix /);
    assert.doesNotMatch(source, /<table|<td|class="cmp-panel"/);
  }
  const matrix = read('src/components/ComparisonMatrix.astro');
  assert.equal((matrix.match(/<ComparisonCell /g) ?? []).length, 3, 'Spannzelle, Einzelzelle und mobile Zelle');
  assert.match(matrix, /<MobileTabs /);
  assert.match(read('src/components/landing/LandingSite.astro'), /<ComparisonCell /);
  assert.doesNotMatch(read('src/components/ComparisonCell.astro'), /<svg|<path/);
});

test('Alle aktiven Reels verwenden den gemeinsamen Video-Controller', () => {
  for (const file of ['src/scripts/hero-reel.ts','src/components/landing/LandingHero.astro','src/components/projects/ProjectCard.astro']) {
    const source = read(file); assert.match(source, /createVideoController/); assert.doesNotMatch(source, /\.play\(|new IntersectionObserver|new MutationObserver/);
  }
});

test('Globales CSS hat keine mehrfachen Eigenschaftsbesitzer im selben Kontext', async () => {
  const { default: postcss } = await import('postcss');
  const seen = new Map(), duplicates = [];
  postcss.parse(read('src/styles/global.css')).walkRules(rule => {
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
  for(const [path, cls] of [['src/components/sections/References.astro','rf-pills'],['src/components/configurator/ShowConfigurator.astro','cfg-styles']]) {
    const s=read(path);assert.match(s,new RegExp(`class="chips ${cls}"`));
    assert.doesNotMatch(s,new RegExp(`\\.${cls}[^\\n]*(?:input|:checked|:focus-visible|:hover)`));
  }
  for(const path of ['src/components/sections/References.astro','src/components/sections/ContactForm.astro','src/components/configurator/ShowConfigurator.astro']) {
    const selects=read(path).replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g,'').match(/<select\b[^>]*>/g)??[];assert.ok(selects.length);for(const s of selects)assert.match(s,/class="native-select"/);
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
  const script=read('src/components/projects/case.js');assert.match(script,/\.c-story \[data-story-step\]/);assert.doesNotMatch(script,/querySelectorAll\("\[data-step\]"\)/);
});
