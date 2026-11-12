// Runde 24: Wächter für die Motive aus dem FlyingStars-Katalog (scripts/import-catalog.mjs). Prüft die ausgelieferten
// Daten, nicht den Import selbst: Jede Variante liegt als Datei vor, hat genau so viele Punkte wie angegeben, endliche
// Koordinaten in Einheitsgröße und gültige Farben. Jedes Katalogmotiv im Konfigurator spielt erst ab der gezählten
// Punktzahl seiner kleinsten Variante, und mehr Drohnen wählen nie eine kleinere Variante.
// Aufruf: node --test scripts/catalog-motifs.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync(new URL('../src/content/catalog-motifs.json', import.meta.url), 'utf8'));
const { OCCASIONS, PACKAGE_ORDER } = await import('../src/content/show-configurator.js');
const { variantFor } = await import('../src/scripts/scenes/catalog.js');
const { DRONE_RANGES, DRONE_STEP, DRONES_MAX } = await import('../src/content/show-packages.ts');

test('Jede Katalogvariante liegt vor: Punktzahl wie angegeben, endlich, Einheitsgröße, Farben 0–255', () => {
  for (const [key, m] of Object.entries(catalog.motifs)) {
    assert.ok(m.variants.length, `${key}: keine Variante`);
    assert.ok(['de', 'en', 'nl'].every((l) => typeof m.name[l] === 'string' && m.name[l]), `${key}: Name in allen Sprachen`);
    for (const v of m.variants) {
      const f = JSON.parse(fs.readFileSync(new URL(`../public/media/katalog/${v.id}.json`, import.meta.url), 'utf8'));
      assert.equal(f.points.length, v.points, `${key}/${v.id}: Punktzahl`);
      assert.ok(f.points.length > 0, `${key}/${v.id}: leer`);
      for (const p of f.points) {
        assert.equal(p.length, 6, `${key}/${v.id}: Punktformat`);
        assert.ok(p.every(Number.isFinite), `${key}/${v.id}: endlich`);
        assert.ok(Math.abs(p[0]) <= 1.001 && Math.abs(p[1]) <= 1.001, `${key}/${v.id}: Einheitsgröße`);
        assert.ok(p.slice(3).every((c) => c >= 0 && c <= 255), `${key}/${v.id}: Farbe`);
      }
    }
  }
});

test('Katalogmotive im Konfigurator spielen ab ihrer gezählten Punktzahl (auf Zehner), nicht ab der Katalogbeschriftung', () => {
  let seen = 0;
  for (const o of OCCASIONS) for (const m of o.motifs) {
    if (!m.catalog) continue;
    seen++;
    const min = Math.ceil(catalog.motifs[m.catalog].variants[0].points / DRONE_STEP) * DRONE_STEP;
    for (const pkg of PACKAGE_ORDER) {
      const tier = m.tiers[pkg];
      if (!tier?.build.startsWith('catalog:')) continue;
      assert.ok(tier.minDrones >= min, `${o.id}/${m.id} ${pkg}: ab ${tier.minDrones}, braucht ${min}`);
      assert.ok(tier.minDrones <= Math.max(min, DRONE_RANGES[pkg].min), `${o.id}/${m.id} ${pkg}: spielt zu spät (${tier.minDrones})`);
    }
  }
  assert.ok(seen >= 30, `nur ${seen} Katalogmotive im Konfigurator`);
});

test('Mehr Drohnen wählen nie eine kleinere Katalogvariante', () => {
  for (const key of Object.keys(catalog.motifs)) {
    let last = 0;
    for (let n = 70; n <= DRONES_MAX; n += DRONE_STEP) {
      const v = variantFor(key, n);
      if (!v) continue;
      assert.ok(v.points <= n && v.points >= last, `${key} bei ${n}: ${v.points} Punkte nach ${last}`);
      last = v.points;
    }
  }
});

test('SPARK (100–150 Drohnen) hat je Anlass deutlich mehr Motive als vor dem Katalog', () => {
  const { playable } = OCCASIONS.length ? { playable: (m, pkg, n) => Boolean(m.tiers[pkg]) && m.tiers[pkg].minDrones <= n } : {};
  for (const o of OCCASIONS) {
    const at100 = o.motifs.filter((m) => playable(m, 'SPARK', 100)).length, at150 = o.motifs.filter((m) => playable(m, 'SPARK', 150)).length;
    assert.ok(at150 >= 6, `${o.id}: bei 150 Drohnen nur ${at150} Motive`);
    assert.ok(at100 >= 5, `${o.id}: bei 100 Drohnen nur ${at100} Motive`);
  }
});
