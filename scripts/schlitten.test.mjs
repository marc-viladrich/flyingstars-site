// Runde 11b (große Motive, Kandidat FSK-006): Wächter für scenes/gross/schlitten.js, den Schlitten über einer Hügelkette im
// Anlass Winter & Silvester (3D und 3D+ ab 500). Genau n Drohnen bei jeder einstellbaren Zahl, keine Klumpen und keine
// Begegnung (auch nicht, wenn der Schlitten über die Spuren gleitet oder die Spuren aufsteigen), Bewegung in Drohnengrenzen,
// lockere Linie bei jeder Drohnenzahl (mehr Drohnen kaufen Teile), 3D gleitet und bleibt am Boden, 3D+ hebt ab und wendet.
// Aufruf: node --test scripts/schlitten.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, sleighModel, level, ground, SIGMA } = await import('../src/scripts/scenes/gross/schlitten.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { BUILDERS } = await import('../src/scripts/scenes/index.js');

const MIN = 400, STOPS = { s3: droneStops('3d').filter((n) => n >= MIN), plus: droneStops('story').filter((n) => n >= MIN) };
function nearest(pts) {
  const cell = 0.08, g = new Map(), key = (a, b, c) => `${a},${b},${c}`;
  pts.forEach((p, i) => { const k = key(...p.slice(0, 3).map((v) => Math.floor(v / cell))); if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
  return pts.map((p, i) => { const [cx, cy, cz] = p.slice(0, 3).map((v) => Math.floor(v / cell)); let m = Infinity; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const j of g.get(key(cx + a, cy + b, cz + c)) ?? []) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], p[2] - pts[j][2])); return Number.isFinite(m) ? m : cell * 2; });
}
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live(p, j, t, o); return o; });
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
function scaleOf(b) { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return 0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75); }
function motion(b, every = 1) {
  const s = scaleOf(b), dt = 1 / 30; let v = 0, a = 0;
  for (let j = 0; j < b.pts.length; j += every) {
    const p = b.pts[j]; let prev = null, pv = null;
    for (let t = 0; t <= b.hold + 1e-9; t += dt) { const o = [p[0], p[1], p[2], 1]; b.live(p, j, t, o); if (prev) { const w = [0, 1, 2].map((c) => ((o[c] - prev[c]) / dt) * s); v = Math.max(v, Math.hypot(...w)); if (pv) a = Math.max(a, Math.hypot(...w.map((x, c) => (x - pv[c]) / dt))); pv = w; } prev = o; }
  }
  return { v, a };
}

test('im Konfigurator: Winter & Silvester, 3D und 3D+ ab 400, nachgeladen', () => {
  const o = OCCASIONS.find((x) => x.id === 'silvester'), m = o.motifs.find((x) => x.id === 'schlitten');
  assert.ok(m, 'Schlitten fehlt');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'sleigh3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'sleighStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of ['sleigh3d', 'sleighStory']) { assert.equal(typeof GROSS[b], 'function'); assert.equal(BUILDERS[b], undefined); }
});

test('genau n Drohnen bei jeder einstellbaren Zahl, Punkte gültig, kein Sprung bei t = 0', async () => {
  for (const [name, stops] of [['sleigh3d', STOPS.s3], ['sleighStory', STOPS.plus]]) for (const n of stops) {
    const b = (await builders[name](n, '')).beats[0];
    assert.equal(b.pts.length, n, `${name} ${n}`);
    assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite)), `${name} ${n}: Punktformat`);
    assert.ok(frame(b, 0).every((o, j) => Math.hypot(o[0] - b.pts[j][0], o[1] - b.pts[j][1], o[2] - b.pts[j][2]) < 1e-9), `${name} ${n}: Sprung`);
  }
});

test('keine Begegnung (alle 0,1 s), keine verstreuten Punkte außer den Sternen', async () => {
  for (const [name, ns] of [['sleigh3d', [400, 700, 1000]], ['sleighStory', [400, 1000]]]) for (const n of ns) {
    const b = (await builders[name](n, '')).beats[0], m = sleighModel(n), med0 = quantile(nearest(frame(b, 0)), 0.5);
    for (let t = 0; t <= b.hold; t += 0.1) { const nn = nearest(frame(b, t)); assert.ok(Math.min(...nn) >= 0.25 * med0, `${name} ${n} t ${t.toFixed(1)}: ${Math.min(...nn).toFixed(4)} bei Median ${med0.toFixed(4)}`); }
    for (const t of [0, b.hold / 2, b.hold]) {
      const f = frame(b, t), nn = nearest(f), med = quantile(nn, 0.5), lines = nn.filter((_, j) => m.tags[j] !== 'stern');
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} t ${t.toFixed(1)}: knappster Abstand`);
      assert.ok(quantile(lines, 0.995) <= 4.5 * med, `${name} ${n} t ${t.toFixed(1)}: Drohnen stehen allein`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen', async () => {
  for (const [name, n] of [['sleigh3d', 400], ['sleigh3d', 1000], ['sleighStory', 400], ['sleighStory', 1000]]) {
    const m = motion((await builders[name](n, '')).beats[0], n > 600 ? 2 : 1);
    assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n}: ${m.v.toFixed(2)} Einheiten/s`);
    assert.ok(m.a < LIMITS.accel, `${name} ${n}: Beschleunigung ${m.a.toFixed(2)}`);
  }
});

test('lockere Linie: der Abstand bleibt von 500 bis 1000 gleich, mehr Drohnen bringen Teile', () => {
  const med = (n) => { const m = sleighModel(n); return quantile(nearest(m.pts.map((p, j) => (m.body[j] ? [p[0] * 0.9, p[1] * 0.9, p[2] * 0.9] : p)).filter((_, j) => m.tags[j] !== 'stern')), 0.5); };
  // Stand 11b: die Linien werden von 500 bis 1000 höchstens um ein Drittel dichter, der Rest geht in neue Teile
  for (const n of [600, 700, 800, 900, 1000]) assert.ok(med(n) >= 0.7 * med(500), `${n}: Linienabstand ${med(n).toFixed(3)} gegen ${med(500).toFixed(3)} bei 500`);
  assert.ok(med(500) >= 0.7 * SIGMA, `500: Linienabstand ${med(500).toFixed(3)}`);
  assert.deepEqual([500, 699, 700, 899, 900].map(level), [0, 0, 1, 1, 2]);
  const parts = (n) => new Set(sleighModel(n).tags).size;
  assert.ok(parts(500) < parts(700) && parts(700) < parts(900), `Teile ${parts(500)} → ${parts(700)} → ${parts(900)}`);
});

test('3D gleitet auf dem Kamm von links nach rechts, 3D+ hebt ab, wendet und lässt Lichtbahnen am Himmel', async () => {
  for (const n of [400, 1000]) {
    const m = sleighModel(n), body = m.pts.map((_, j) => j).filter((j) => m.body[j]);
    const centre = (b, t) => { const f = frame(b, t); return [0, 1].map((k) => body.reduce((s, j) => s + f[j][k], 0) / body.length); };
    const a = (await builders.sleigh3d(n, '')).beats[0], s = (await builders.sleighStory(n, '')).beats[0];
    assert.ok(centre(a, a.hold)[0] - centre(a, 0)[0] > 1.5, `${n}: 3D gleitet nicht über die Kämme`);
    // 3D bleibt auf dem Boden: Kufenpunkte nie mehr als eine Handbreit über dem Schnee
    assert.ok(centre(s, s.hold)[1] - centre(a, a.hold)[1] > 0.8, `${n}: 3D+ hebt nicht ab`);
    // Wende: am Ende zeigt die Nase (vorderste Kufenspitze) nach links
    const nose = (b, t) => { const f = frame(b, t), tips = body.filter((j) => m.tags[j] === 'kufeV' && m.pts[j][0] > 0.6); return tips.reduce((acc, j) => acc + f[j][0], 0) / tips.length - centre(b, t)[0]; };
    assert.ok(nose(a, a.hold) > 0 && nose(s, s.hold) < 0, `${n}: Nase 3D ${nose(a, a.hold).toFixed(2)}, 3D+ ${nose(s, s.hold).toFixed(2)}`);
    // Lichtbahnen: ein Teil der Spurdrohnen steht am Ende hoch über dem Schnee, der Rest liegt noch als Spur
    const end = frame(s, s.hold), tracks = m.pts.map((_, j) => j).filter((j) => m.tags[j] === 'spurV' || m.tags[j] === 'spurH');
    const up = tracks.filter((j) => end[j][1] - ground(m.pts[j][0]) > 0.4).length;
    assert.ok(up > 0.2 * tracks.length && up < tracks.length, `${n}: ${up} von ${tracks.length} Spurdrohnen am Himmel`);
  }
});

test('Aufbau schnell genug (bester von drei)', async () => {
  for (const [name, n, ms] of [['sleigh3d', 1000, 60], ['sleighStory', 1000, 80]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
