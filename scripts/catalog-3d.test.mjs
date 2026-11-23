// Runde 6: Wächter für die 3D-Fassungen der Katalogmotive (src/scripts/scenes/catalog-3d/, docs/katalog-3d.md).
// Für jedes Motiv im Register und jede Drohnenzahl der Show-Arten 3D und Storytelling: genau n Drohnen, keine zwei
// aufeinander, nichts verstreut, Eigenbewegung in Drohnengrenzen, Aufbau schnell genug für den Anlasswechsel.
// Aufruf: node --test scripts/catalog-3d.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { loadCatalog3d, LIT_MAX } = await import('../src/scripts/scenes/catalog-3d/index.js');
const CATALOG_3D = await loadCatalog3d();
const { catalogScene } = await import('../src/scripts/scenes/catalog.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const KEYS = Object.keys(CATALOG_3D);
const COUNTS = [200, 250, 300, 370, 450, 600];

/** Abstand jedes Punkts zu seinem nächsten Nachbarn (3D). */
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], p[2] - pts[j][2])); return m; });

test('genau n Drohnen in jeder Fassung, endlich, Farben gültig, Reserve dunkel', async () => {
  for (const key of KEYS) for (const n of COUNTS) for (const tier of ['HORIZON', 'ODYSSEY']) {
    const { beats } = await catalogScene(key, tier, n, '');
    for (const b of beats) {
      assert.equal(b.pts.length, n, `${key} ${tier} ${n}: ${b.pts.length} Punkte`);
      assert.ok(b.catalog3d, `${key} ${tier}: 3D-Fassung`);
      for (const p of b.pts) assert.ok(p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255), `${key} ${n}: Punktformat`);
      const o = [0, 0, 0, 1]; b.live(b.pts[n - 1], n - 1, 1, o);
      if (n > LIT_MAX) assert.equal(o[3], 0, `${key} ${n}: Reserve leuchtet`);
    }
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte', () => {
  for (const key of KEYS) for (const n of [200, 300, LIT_MAX]) for (const stufe of ['3D', '3D+']) {
    const { pts } = CATALOG_3D[key](n, stufe), nn = nearest(pts), sorted = [...nn].sort((a, b) => a - b), med = sorted[n >> 1];
    assert.ok(sorted[0] >= 0.4 * med, `${key} ${stufe} ${n}: knappster Abstand ${sorted[0].toFixed(4)} bei Median ${med.toFixed(4)}`);
    assert.ok(sorted[n - 1] <= 4 * med, `${key} ${stufe} ${n}: eine Drohne steht allein (${sorted[n - 1].toFixed(3)})`);
  }
});

test('Eigenbewegung in Drohnengrenzen (Geschwindigkeit, Beschleunigung) und ohne Sprung bei t = 0', () => {
  const dt = 1 / 30;
  for (const key of KEYS) for (const stufe of ['3D', '3D+']) {
    const { pts, live } = CATALOG_3D[key](300, stufe);
    let vmax = 0, amax = 0;
    pts.forEach((p, j) => {
      let prev = null, pv = null;
      for (let i = 0; i <= 300; i++) {
        const o = [p[0], p[1], p[2], 1]; live(p, j, i * dt, o);
        if (prev) { const v = [0, 1, 2].map((c) => (o[c] - prev[c]) / dt); vmax = Math.max(vmax, Math.hypot(...v)); if (pv) amax = Math.max(amax, Math.hypot(...v.map((x, c) => (x - pv[c]) / dt))); pv = v; }
        prev = o;
      }
    });
    assert.ok(vmax < LIMITS.speed * 0.8, `${key} ${stufe}: ${vmax.toFixed(2)} Einheiten/s`);
    assert.ok(amax < LIMITS.accel, `${key} ${stufe}: Beschleunigung ${amax.toFixed(2)}`);
  }
});

// Bestwert je Drohnenzahl statt Median: auf einem ausgelasteten Rechner schwankt der Median, der Bestwert misst den Code.
test('Aufbau je Motiv und Drohnenzahl schnell genug für den Anlasswechsel (< 12 ms, bei 4× CPU < 50 ms)', () => {
  for (const key of KEYS) {
    for (const n of [200, 350, LIT_MAX]) {
      let best = Infinity;
      for (let r = 0; r < 5; r++) { const t0 = performance.now(); CATALOG_3D[key](n); best = Math.min(best, performance.now() - t0); }
      assert.ok(best < 12, `${key} ${n}: ${best.toFixed(1)} ms`);
    }
  }
});

// Runde 9 (Marc: „der Unterschied zwischen 3D und 3D plus ist noch nicht krass genug“): jede 3D-Fassung ist eingestuft
// (stufen.js), die Stufe folgt aus der Formklasse, und es gibt keine Einstufung ohne Fassung.
test('jede 3D-Fassung hat eine Formklasse und daraus eine Stufe (3D einfach, 3D+ komplex)', async () => {
  const { KLASSE_KATALOG, STUFE_DER_KLASSE, stufeKatalog } = await import('../src/scripts/scenes/catalog-3d/stufen.js');
  for (const key of KEYS) {
    assert.ok(KLASSE_KATALOG[key], `${key}: keine Formklasse in stufen.js`);
    assert.ok(['3D', '3D+'].includes(stufeKatalog(key)), `${key}: Klasse ${KLASSE_KATALOG[key][0]} hat keine Stufe`);
  }
  for (const key of Object.keys(KLASSE_KATALOG)) assert.ok(CATALOG_3D[key], `${key}: eingestuft, aber ohne 3D-Fassung`);
  for (const [cls, st] of Object.entries(STUFE_DER_KLASSE)) assert.ok(['3D', '3D+'].includes(st), `${cls}: ${st}`);
});

// Runde 9 (Marc: „3D+ offensichtlich komplexer und refinter und more polished“): jedes einfache Motiv (Stufe 3D) läuft
// auch in 3D+ und baut dort eine andere, aufwendigere Fassung (mehr Linien = andere Punktlage), nicht dieselbe.
test('einfache Motive: die Fassung 3D+ unterscheidet sich von der Fassung 3D', async () => {
  const { stufeKatalog } = await import('../src/scripts/scenes/catalog-3d/stufen.js');
  const simple = KEYS.filter((k) => stufeKatalog(k) === '3D'), gleich = [];
  for (const key of simple) {
    const a = CATALOG_3D[key](400, '3D').pts, b = CATALOG_3D[key](400, '3D+').pts;
    if (a.every((p, j) => Math.hypot(p[0] - b[j][0], p[1] - b[j][1], p[2] - b[j][2]) < 1e-9)) gleich.push(key);
  }
  assert.deepEqual(gleich, [], `ohne eigene 3D+-Fassung: ${gleich.join(', ')}`);
});
