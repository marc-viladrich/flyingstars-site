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
