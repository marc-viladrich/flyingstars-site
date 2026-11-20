// Runde 10 (Marc 20.11.2026: „Einige von den 110er/120er Motiven könnten wir auf die 100-Drohnen-Kategorie runterbringen“):
// Seit die Schwellen gebündelt und einzelne Motive unter ihre Katalog-Punktzahl gesenkt sind (SPARK_AB in
// src/content/show-configurator.js), baut dieser Wächter jedes Katalogmotiv jedes Anlasses in 2D bei seiner Schwelle:
// genau n Drohnen im Bild, und kein Motiv verliert Teile, weil es mehr verankerte Katalogpunkte hat als Drohnen
// (scenes/catalog-resample.js anchorSample schneidet dann ab; das Raster der Fahnen braucht 117 Punkte).
// Ob ein Motiv bei 100 gut AUSSIEHT, entscheidet der Kontaktbogen, nicht dieser Test.
// Aufruf: node --test scripts/show-unlock-render.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { OCCASIONS, SPARK_AB } = await import('../src/content/show-configurator.js');
const { catalogScene, CATALOG } = await import('../src/scripts/scenes/catalog.js');

test('jedes Katalogmotiv spielt in 2D ab seiner Schwelle vollständig mit genau so vielen Drohnen', async () => {
  const seen = new Map();
  for (const o of OCCASIONS) for (const m of o.motifs) if (m.catalog && m.tiers.SPARK?.build.startsWith('catalog:')) {
    const n = m.tiers.SPARK.minDrones;
    if (seen.get(m.catalog) <= n) continue;
    seen.set(m.catalog, n);
    const beat = (await catalogScene(m.catalog, 'SPARK', n, m.label)).beats[0];
    assert.equal(beat.pts.length, n, `${o.id} ${m.catalog} bei ${n}: ${beat.pts.length} Punkte`);
    assert.ok((beat.anchors ?? 0) <= n, `${o.id} ${m.catalog} bei ${n}: ${beat.anchors} verankerte Katalogpunkte, es fehlen Teile`);
  }
  assert.ok(seen.size > 40, `nur ${seen.size} Katalogmotive geprüft`);
});

test('gesenkte Schwellen nur für flache Motive, nur auf einer Stufe unter der Katalog-Punktzahl', () => {
  for (const [key, n] of SPARK_AB) {
    assert.notEqual(CATALOG[key].dimension, '3D', `${key}: räumliche Formationen behalten jeden Katalogpunkt`);
    assert.ok([100, 150].includes(n) && n < CATALOG[key].variants[0].points, `${key}: ${n} ist keine Senkung`);
  }
});
