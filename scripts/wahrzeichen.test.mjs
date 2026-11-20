// Runde 10 (Marc, 20.11.2026: „Beim Stadtfest brauchen wir … Wahrzeichen-Motive … in jeder Detailstufe, also 100, 150,
// 200, 250, 300 Drohnen und 2D vs 3D vs 3D+“). Wächter für scenes/wahrzeichen.js und scenes/catalog-3d/wahrzeichen.js
// (docs/katalog-wahrzeichen.md): jede Fassung jedes Wahrzeichens bei jeder einstellbaren Drohnenzahl genau n Drohnen,
// keine Klumpen, keine verstreuten Punkte, gleichmäßige Dichte in 2D, Bewegung in Drohnengrenzen, schneller Aufbau.
// Aufruf: node --test scripts/wahrzeichen.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, LANDMARKS, SHAPES, LEVELS, flat, level, BODY_MAX } = await import('../src/scripts/scenes/wahrzeichen.js');
const { WAHRZEICHEN_3D, clockLit } = await import('../src/scripts/scenes/catalog-3d/wahrzeichen.js');
const { CLEAR } = await import('../src/scripts/scenes/catalog-resample.js');
const { BUILDERS } = await import('../src/scripts/scenes/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops, TWO_D_LIMIT } = await import('../src/content/show-packages.ts');

const KEYS = Object.keys(SHAPES);
/** Einstellbare Drohnenzahlen je Show-Art (Preisstufen), 2D bis unter TWO_D_LIMIT. */
const STOPS = { '2d': droneStops('2d').filter((n) => n < TWO_D_LIMIT), '3d': droneStops('3d'), plus: droneStops('story') };
const nearest = (pts, dim = 3) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], dim === 3 ? (p[2] || 0) - (pts[j][2] || 0) : 0)); return m; });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

test('jede Fassung ist im Register der Motivbauer (scenes/index.js)', () => {
  for (const [key, v] of Object.entries(LANDMARKS)) for (const build of Object.values(v)) {
    assert.equal(typeof builders[build], 'function', `${key}: ${build} fehlt in wahrzeichen.js`);
    assert.equal(BUILDERS[build], builders[build], `${key}: ${build} nicht in scenes/index.js registriert`);
  }
});

test('genau n Drohnen in jeder Fassung bei jeder einstellbaren Drohnenzahl, Punkte gültig', async () => {
  for (const [key, v] of Object.entries(LANDMARKS)) for (const [art, build] of Object.entries(v)) for (const n of STOPS[art]) {
    const { beats } = await builders[build](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length + (b.offstageDrones ?? 0), n, `${key} ${art} ${n}, Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${key} ${art} ${n}: Punktformat`);
      // höchstens 1 % fehlt in 2D (Abstandsregel an Kreuzungen), außer die Linien tragen nicht mehr Lichter (capped, die
      // Lichtgröße steht schon am kleinsten); in 3D fehlen nur Drohnen über BODY_MAX
      if (art === '2d' && key !== 'jahre') assert.ok((b.pts.length >= n - Math.max(5, Math.ceil(0.01 * n)) || flat(key, n).capped) && b.pts.length <= n, `${key} 2D ${n}: ${b.pts.length} sichtbar`);
      // in 3D fehlen nur Drohnen über BODY_MAX (der flache Schlüssel: höchstens 2 % durch die Abstandsregel)
      if (art !== '2d') assert.ok(b.pts.length <= Math.min(n, BODY_MAX) && b.pts.length >= Math.min(n, BODY_MAX) - (key === 'schluessel' ? Math.ceil(0.02 * n) : 0), `${key} ${art} ${n}: ${b.pts.length} im Körper`);
    }
  }
});

test('2D: keine Klumpen, keine Streupunkte, gleichmäßige Dichte (100 bis 390 Drohnen)', () => {
  for (const key of KEYS) for (const n of STOPS['2d']) {
    const f = flat(key, n), nn = nearest(f.pts, 2), med = quantile(nn, 0.5);
    // kein Paar enger als die Abstandsregel der Abtastung (CLEAR · Linienabstand), mit Rundungsspiel
    assert.ok(Math.min(...nn) >= CLEAR * f.spacing * 0.95, `${key} ${n}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Linienabstand ${f.spacing.toFixed(4)}`);
    // keine Drohne steht allein (größter Nachbarabstand höchstens 2 Linienabstände)
    assert.ok(Math.max(...nn) <= 2 * f.spacing, `${key} ${n}: eine Drohne steht allein (${Math.max(...nn).toFixed(3)} bei ${f.spacing.toFixed(3)})`);
    // gleichmäßig: 90 % der Drohnen haben ihren Nachbarn zwischen 0,6 und 1,25 Linienabständen
    const even = nn.filter((d) => d >= 0.6 * f.spacing && d <= 1.25 * f.spacing).length / nn.length;
    assert.ok(even >= 0.9, `${key} ${n}: nur ${(even * 100).toFixed(0)} % gleichmäßig (Median ${med.toFixed(3)}, Linienabstand ${f.spacing.toFixed(3)})`);
  }
});

test('2D: die Detailstufe folgt der Drohnenzahl (100 schlicht, 150 und 250 mehr Linien)', () => {
  assert.deepEqual([100, 140, 150, 240, 250, 390].map(level), [0, 0, 1, 1, 2, 2]);
  assert.deepEqual([100, 199, 200, 279, 280].map(LEVELS.schluessel), [0, 0, 1, 1, 2]);
  for (const key of KEYS) {
    const len = (lv) => SHAPES[key](lv).reduce((s, { pts, closed }) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s + L + (closed ? Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) : 0); }, 0);
    assert.ok(len(0) < len(1) && len(1) <= len(2), `${key}: Linienlänge je Stufe ${[0, 1, 2].map((l) => len(l).toFixed(2)).join(' / ')}`);
  }
});

test('3D und 3D+: keine zwei Drohnen aufeinander, keine verstreuten Punkte', () => {
  for (const key of KEYS) for (const n of [200, 300, BODY_MAX]) for (const stufe of ['3D', '3D+']) {
    const { pts } = WAHRZEICHEN_3D[key](n, stufe), nn = nearest(pts), med = quantile(nn, 0.5);
    assert.ok(pts.length <= n && pts.length >= n - (key === 'schluessel' ? Math.ceil(0.02 * n) : 0), `${key} ${stufe} ${n}: ${pts.length}`);
    assert.ok(Math.min(...nn) >= 0.4 * med, `${key} ${stufe} ${n}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
    assert.ok(Math.max(...nn) <= 4 * med, `${key} ${stufe} ${n}: eine Drohne steht allein (${Math.max(...nn).toFixed(3)})`);
  }
});

test('Eigenbewegung in Drohnengrenzen (Geschwindigkeit, Beschleunigung) und ohne Sprung bei t = 0', async () => {
  const dt = 1 / 30;
  for (const [key, v] of Object.entries(LANDMARKS)) for (const art of ['2d', '3d', 'plus']) {
    const { beats } = await builders[v[art]](300, '');
    for (const b of beats) {
      let vmax = 0, amax = 0, jump = 0;
      b.pts.forEach((p, j) => {
        let prev = null, pv = null;
        for (let i = 0; i <= 420; i++) {
          const o = [p[0], p[1], p[2], 1]; b.live?.(p, j, i * dt, o);
          if (i === 0) jump = Math.max(jump, Math.hypot(o[0] - p[0], o[1] - p[1], o[2] - p[2]));
          if (prev) { const w = [0, 1, 2].map((c) => (o[c] - prev[c]) / dt); vmax = Math.max(vmax, Math.hypot(...w)); if (pv) amax = Math.max(amax, Math.hypot(...w.map((x, c) => (x - pv[c]) / dt))); pv = w; }
          prev = o;
        }
      });
      assert.ok(jump < 1e-9, `${key} ${art}: Sprung bei t = 0 (${jump})`);
      assert.ok(vmax < LIMITS.speed * 0.8, `${key} ${art}: ${vmax.toFixed(2)} Einheiten/s`);
      assert.ok(amax < LIMITS.accel, `${key} ${art}: Beschleunigung ${amax.toFixed(2)}`);
    }
  }
});

test('Aufbau schnell genug für den Anlasswechsel (2D und Körper je Zahl < 25 ms)', () => {
  for (const key of KEYS) {
    for (const n of [130, 290]) { let best = Infinity; for (let r = 0; r < 3; r++) { const t0 = performance.now(); SHAPES[key](level(n)); flat(`${key}`, n + r); best = Math.min(best, performance.now() - t0); } assert.ok(best < 25, `${key} 2D ${n}: ${best.toFixed(1)} ms`); }
    for (const n of [200, BODY_MAX]) for (const stufe of ['3D', '3D+']) { let best = Infinity; for (let r = 0; r < 3; r++) { const t0 = performance.now(); WAHRZEICHEN_3D[key](n, stufe); best = Math.min(best, performance.now() - t0); } assert.ok(best < 25, `${key} ${stufe} ${n}: ${best.toFixed(1)} ms`); }
  }
});

test('Lichtzeituhr: zeigt die Uhrzeit dezimal, Trenner zwischen den Ziffern', () => {
  // Start 23:58:47, nach 7 s also 23:58:54 → Sekunden-Einer 4 von 9 Lichtern, Sekunden-Zehner 5 von 5, Minuten-Einer 8 von 9 …
  const total = 9 + 5 + 9 + 5 + 9 + 2 + 5, lit = (k) => clockLit((k + 0.5) / total, 7);
  const groups = [[0, 9], [10, 5], [16, 9], [26, 5], [32, 9], [42, 2]].map(([a, m]) => Array.from({ length: m }, (_, i) => lit(a + i)).filter(Boolean).length);
  assert.deepEqual(groups, [4, 5, 8, 5, 3, 2]);
  for (const k of [9, 15, 25, 31, 41]) assert.equal(lit(k), null, `Stelle ${k} ist ein Trenner`);
});

test('Jahreszahl: der Wert kommt aus der Fassung, ab 150 Drohnen steht JAHRE darunter', async () => {
  const small = (await builders.jahre2d(100, '', { value: '30' })).beats[0], big = (await builders.jahre2d(200, '', { value: '30' })).beats[0];
  assert.equal(small.pts.length, 100);
  assert.equal(big.pts.length, 200);
  const height = (b) => Math.max(...b.pts.map((p) => p[1])) - Math.min(...b.pts.map((p) => p[1])), width = (b) => Math.max(...b.pts.map((p) => p[0])) - Math.min(...b.pts.map((p) => p[0]));
  assert.ok(height(big) / width(big) > height(small) / width(small) * 1.3, 'mit JAHRE ist das Bild höher');
});

test('Stadtfest: jedes Wahrzeichen und die Jahreszahl spielen in 2D ab 100 (Skyline, Siegessäule ab 150), in 3D ab 200, in 3D+ ab 300 (Stufe 3D)', async () => {
  const { OCCASIONS, stufeOf } = await import('../src/content/show-configurator.js');
  const { STUFE_EIGEN } = await import('../src/scripts/scenes/catalog-3d/stufen.js');
  const MOTIF = { fernsehturm: 'fernsehturm', tor: 'brandenburgertor', dom: 'koelnerdom', elphi: 'elbphilharmonie', rheinturm: 'rheinturm', schwebebahn: 'schwebebahn', jahre: 'jahreszahl', schluessel: 'bremerschluessel', skyline: 'frankfurtskyline', siegessaeule: 'siegessaeule' };
  // Einstieg in 2D: wo das Motiv am Kontaktbogen sauber erkennbar ist (Skyline und Siegessäule erst ab 150)
  const FROM = { skyline: 150, siegessaeule: 150 };
  const festival = OCCASIONS.find((o) => o.id === 'festival');
  for (const [key, id] of Object.entries(MOTIF)) {
    const m = festival.motifs.find((x) => x.id === id);
    assert.ok(m, `${id} fehlt im Stadtfest`);
    assert.deepEqual(Object.fromEntries(Object.entries(m.tiers).map(([p, v]) => [p, [v.build, v.minDrones]])), { SPARK: [LANDMARKS[key]['2d'], FROM[key] ?? 100], HORIZON: [LANDMARKS[key]['3d'], 200], ODYSSEY: [LANDMARKS[key].plus, 300] }, id);
    assert.equal(stufeOf(m), '3D', `${id}: Stufe`);
    assert.ok(STUFE_EIGEN[id], `${id}: Begründung in STUFE_EIGEN`);
  }
});

test('Jubiläum: das Motiv Wahrzeichen spielt denselben Fernsehturm wie das Stadtfest (Runde 10b)', async () => {
  const { OCCASIONS } = await import('../src/content/show-configurator.js');
  const m = OCCASIONS.find((o) => o.id === 'jubilaeum').motifs.find((x) => x.id === 'wahrzeichen');
  assert.deepEqual(Object.values(m.tiers).map((v) => v.build), Object.values(LANDMARKS.fernsehturm));
});
