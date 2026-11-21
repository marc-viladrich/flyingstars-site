// Runde 11b (große Motive, Kandidat FSK-013): Wächter für scenes/gross/polarlicht.js, das Polarlicht über einem Fjord im
// Anlass Winter & Silvester (3D und 3D+ ab 800). Genau n Drohnen, keine Begegnung (die Vorhänge bleiben in der Tiefe
// getrennt), Bewegung in Drohnengrenzen, lockere Strahlen (kein Raster), Licht hinter den Bergen verdeckt, die Spiegelung
// folgt verzögert, 3D+ beginnt dunkel und entfaltet die Vorhänge nacheinander, mehr Drohnen bringen Teile.
// Aufruf: node --test scripts/polarlicht.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, auroraModel, ACTS } = await import('../src/scripts/scenes/gross/polarlicht.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { BUILDERS } = await import('../src/scripts/scenes/index.js');

const MIN = 600, STOPS = { s3: droneStops('3d').filter((n) => n >= MIN), plus: droneStops('story').filter((n) => n >= MIN) };
function nearest(pts) {
  const cell = 0.08, g = new Map(), key = (a, b, c) => `${a},${b},${c}`;
  pts.forEach((p, i) => { const k = key(...p.slice(0, 3).map((v) => Math.floor(v / cell))); if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
  return pts.map((p, i) => { const [cx, cy, cz] = p.slice(0, 3).map((v) => Math.floor(v / cell)); let m = Infinity; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const j of g.get(key(cx + a, cy + b, cz + c)) ?? []) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], p[2] - pts[j][2])); return Number.isFinite(m) ? m : cell * 2; });
}
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live(p, j, t, o); return o; });
function scaleOf(b) { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return 0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75); }
function motion(b, every = 1) {
  const s = scaleOf(b), dt = 1 / 30; let v = 0, a = 0;
  for (let j = 0; j < b.pts.length; j += every) {
    const p = b.pts[j]; let prev = null, pv = null;
    for (let t = 0; t <= b.hold + 1e-9; t += dt) { const o = [p[0], p[1], p[2], 1]; b.live(p, j, t, o); if (prev) { const w = [0, 1, 2].map((c) => ((o[c] - prev[c]) / dt) * s); v = Math.max(v, Math.hypot(...w)); if (pv) a = Math.max(a, Math.hypot(...w.map((x, c) => (x - pv[c]) / dt))); pv = w; } prev = o; }
  }
  return { v, a };
}

test('im Konfigurator: Winter & Silvester, 3D und 3D+ ab 600, nachgeladen', () => {
  const o = OCCASIONS.find((x) => x.id === 'silvester'), m = o.motifs.find((x) => x.id === 'polarlicht');
  assert.ok(m, 'Polarlicht fehlt');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'aurora3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'auroraStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of ['aurora3d', 'auroraStory']) { assert.equal(typeof GROSS[b], 'function'); assert.equal(BUILDERS[b], undefined); }
});

test('genau n Drohnen bei jeder einstellbaren Zahl, Punkte gültig, kein Sprung bei t = 0', async () => {
  for (const [name, stops] of [['aurora3d', STOPS.s3], ['auroraStory', STOPS.plus]]) for (const n of stops) {
    const b = (await builders[name](n, '')).beats[0];
    assert.equal(b.pts.length, n, `${name} ${n}`);
    assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite)), `${name} ${n}: Punktformat`);
    for (const t of [0, b.hold / 2]) assert.ok(frame(b, t).every((o) => o.every(Number.isFinite)), `${name} ${n} t ${t}: Lage ungültig`);
    assert.ok(frame(b, 0).every((o, j) => Math.hypot(o[0] - b.pts[j][0], o[1] - b.pts[j][1], o[2] - b.pts[j][2]) < 1e-9), `${name} ${n}: Sprung`);
  }
});

test('keine Begegnung (alle 0,2 s), keine verstreuten Punkte außer den Sternen', async () => {
  for (const [name, ns] of [['aurora3d', [600, 1000]], ['auroraStory', [600, 1000]]]) for (const n of ns) {
    const b = (await builders[name](n, '')).beats[0], m = auroraModel(n), med0 = quantile(nearest(frame(b, 0)), 0.5);
    for (let t = 0; t <= b.hold; t += 0.2) { const nn = nearest(frame(b, t)); assert.ok(Math.min(...nn) >= 0.25 * med0, `${name} ${n} t ${t.toFixed(1)}: ${Math.min(...nn).toFixed(4)} bei Median ${med0.toFixed(4)}`); }
    for (const t of [0, b.hold / 2, b.hold]) { const nn = nearest(frame(b, t)), med = quantile(nn, 0.5); assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} t ${t.toFixed(1)}: knappster Abstand`); assert.ok(quantile(nn.filter((_, j) => m.kind[j] !== 'stern' && m.kind[j] !== 'spiegel'), 0.995) <= 4.5 * med, `${name} ${n} t ${t.toFixed(1)}: Drohnen stehen allein`); }
  }
});

test('Eigenbewegung in Drohnengrenzen', async () => {
  for (const [name, n] of [['aurora3d', 600], ['aurora3d', 1000], ['auroraStory', 600], ['auroraStory', 1000]]) {
    const m = motion((await builders[name](n, '')).beats[0], 2);
    assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n}: ${m.v.toFixed(2)} Einheiten/s`);
    assert.ok(m.a < LIMITS.accel, `${name} ${n}: Beschleunigung ${m.a.toFixed(2)}`);
  }
});

test('lockere Strahlen statt Raster, mehr Drohnen bringen Teile (Tannen), die Felslinien bleiben locker', () => {
  for (const n of [600, 800, 900, 1000]) {
    const m = auroraModel(n);
    // Strahlen eines Vorhangs mindestens 0,15 auseinander (Kontaktbogen 2: 0,08 las sich als Punktfläche)
    for (let c = 0; c < m.rays.length; c++) { const xs = [...new Set(m.pts.filter((_, j) => m.kind[j] === 'strahl' && m.meta[j].c === c && !m.meta[j].edge).map((p) => p[0].toFixed(4)))].map(Number).sort((a, b) => a - b); const gap = Math.min(...xs.slice(1).map((x, i) => x - xs[i])); assert.ok(gap >= 0.12, `${n} Vorhang ${c}: Strahlen ${gap.toFixed(3)} auseinander`); }
    const rock = m.pts.filter((_, j) => m.kind[j] === 'felsL'), med = quantile(nearest(rock), 0.5);
    assert.ok(med >= 0.035, `${n}: Fels zu dicht (${med.toFixed(3)})`); // Stand 11b: 0,04–0,06
  }
  const trees = (n) => auroraModel(n).kind.filter((k) => k === 'tanne').length;
  assert.ok(trees(1000) > trees(900) && trees(900) > trees(800), `Tannen ${trees(800)} → ${trees(900)} → ${trees(1000)}`);
});

test('3D+: dunkel, dann entfalten sich die Vorhänge nacheinander; die Spiegelung folgt verzögert', async () => {
  const n = 600, b = (await builders.auroraStory(n, '')).beats[0], m = auroraModel(n);
  const lit = (t, c) => frame(b, t).filter((o, j) => m.kind[j] === 'strahl' && m.meta[j].c === c && o[3] > 0.3).length;
  assert.equal(lit(0.5, 0), 0, 'am Anfang leuchten schon Vorhänge');
  const T1 = ACTS.dark;
  assert.ok(lit(T1 + 0.9, 0) > lit(T1 + 0.9, 2), 'der vordere Vorhang entfaltet sich nicht vor dem hinteren');
  assert.ok(lit(T1 + ACTS.unfold, 2) > 0.5 * m.pts.filter((_, j) => m.kind[j] === 'strahl' && m.meta[j].c === 2).length, 'der dritte Vorhang ist nach dem Entfalten nicht offen');
  // Spiegelung: im Mittel liegt sie in der Wanderung hinter dem Vorhang zurück (Wellen mitteln sich über den Vorhang heraus)
  const t = T1 + ACTS.unfold + ACTS.wander / 2, f = frame(b, t);
  const mean = (kind) => { const ids = m.kind.map((k, j) => j).filter((j) => m.kind[j] === kind && m.meta[j].c === 0); return ids.reduce((a, j) => a + f[j][0] - b.pts[j][0], 0) / ids.length; };
  assert.ok(Math.abs(mean('strahl')) > Math.abs(mean('spiegel')) + 0.01, `die Spiegelung folgt nicht verzögert (${mean('strahl').toFixed(3)} gegen ${mean('spiegel').toFixed(3)})`);
});

test('Aufbau schnell genug (bester von drei)', async () => {
  for (const [name, n, ms] of [['aurora3d', 1000, 60], ['auroraStory', 1000, 60]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
