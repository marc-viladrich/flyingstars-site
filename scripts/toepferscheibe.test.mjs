// Runde 11b (große Motive): Wächter für scenes/gross/toepferscheibe.js, die Töpferscheibe in Kultur (3D und 3D+ ab 300, Runde 11c).
// Genau n Drohnen bei jeder einstellbaren Zahl, keine Klumpen, keine verstreuten Punkte, Bewegung in Drohnengrenzen, das
// Bild füllt die Bühne, die Vase wächst wirklich aus dem Klumpen (höher und mit Hals), die Scheibe dreht, mehr Drohnen
// bringen mehr Teile.
// Aufruf: node --test scripts/toepferscheibe.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, potModel, potLevel } = await import('../src/scripts/scenes/gross/toepferscheibe.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { hasBuilder } = await import('../src/scripts/scenes/index.js');

const MIN = 300, NAMES = ['potteryWheel3d', 'potteryWheelStory'];
const STOPS = { potteryWheel3d: droneStops('3d').filter((n) => n >= MIN), potteryWheelStory: droneStops('story').filter((n) => n >= MIN) };
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], (p[2] || 0) - (pts[j][2] || 0))); return m; });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t, from = 0, to = b.pts.length) => b.pts.slice(from, to).map((p, k) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, k + from, t, o); return o; });
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
function scaleOf(b) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return 0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75);
}
function motion(b, every = 1) {
  const s = scaleOf(b), dt = 1 / 30, hold = b.hold ?? 6; let v = 0, a = 0, jump = 0;
  for (let j = 0; j < b.pts.length; j += every) {
    const p = b.pts[j]; let prev = null, pv = null;
    for (let t = 0; t <= hold + 1e-9; t += dt) {
      const o = [p[0], p[1], p[2] || 0, 1]; b.live(p, j, t, o);
      if (t === 0) jump = Math.max(jump, Math.hypot(o[0] - p[0], o[1] - p[1], o[2] - (p[2] || 0)));
      if (prev) { const w = [0, 1, 2].map((c) => ((o[c] - prev[c]) / dt) * s); v = Math.max(v, Math.hypot(...w)); if (pv) a = Math.max(a, Math.hypot(...w.map((x, c) => (x - pv[c]) / dt))); pv = w; }
      prev = o;
    }
  }
  return { v, a, jump };
}
const groupRange = (b, name) => { let s = 0; for (const g of b.groups) { if (g.name === name) return [s, s + g.count]; s += g.count; } return [0, 0]; };

test('im Konfigurator: Kultur, 3D und 3D+ ab 300, nachgeladen', () => {
  const kultur = OCCASIONS.find((o) => o.id === 'kultur'), m = kultur.motifs.find((x) => x.id === 'toepferscheibe');
  assert.ok(m, 'Töpferscheibe fehlt in Kultur');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'potteryWheel3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'potteryWheelStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of NAMES) { assert.equal(typeof GROSS[b], 'function', `${b} nicht in gross/index.js`); assert.equal(hasBuilder(b), false, `${b} im gemeinsamen Szenenpaket`); }
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl, Punkte und Teile gültig', async () => {
  for (const name of NAMES) for (const n of STOPS[name]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      if (b.groups) assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
      if (k) assert.ok(!b.cloud, `${name} ${n} Bild ${k}: Wolke mitten im Motiv`);
    }
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (Ruhe, Mitte, Ende; Stufe, Mitte, 1000)', async () => {
  for (const name of NAMES) for (const n of [300, 600, 1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const t of [0, (b.hold ?? 6) / 2, b.hold ?? 6]) {
      const nn = nearest(frame(b, t)), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const name of NAMES) for (const n of [300, 1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const m = motion(b, n > 800 ? 3 : 2);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)} bei t = 0`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('Bilder schließen aneinander an: jedes Bild beginnt, wo das vorige endet (starre Teile, keine Wolke)', async () => {
  for (const n of [300, 1000]) {
    const { beats } = await builders.potteryWheelStory(n, '');
    assert.equal(beats.length, 4);
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), d = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(d < 1e-6, `${n}: Bild ${k} beginnt ${d.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
      assert.deepEqual(beats[k].groups, beats[0].groups, `${n} Bild ${k}: andere Teile`);
    }
  }
});

test('das Bild füllt die Bühne; die Vase wächst aus dem Klumpen, mit Bauch und schmalem Hals', async () => {
  for (const n of [300, 1000]) {
    const { beats: [b3] } = await builders.potteryWheel3d(n, ''), all = frame(b3, 0);
    const fw = extent(b3.fitPts, 0), fh = extent(b3.fitPts, 1);
    assert.ok(extent(all, 0) >= 0.85 * fw && extent(all, 1) >= 0.85 * fh, `3D ${n}: füllt nur ${(extent(all, 0) / fw * 100).toFixed(0)} % × ${(extent(all, 1) / fh * 100).toFixed(0)} %`);
    const { beats } = await builders.potteryWheelStory(n, ''), [v0, v1] = groupRange(beats[0], 'vase');
    const vase = (k, t) => frame(beats[k], t, v0, v1);
    const h0 = extent(vase(0, 0), 1), h3 = extent(vase(3, beats[3].hold), 1);
    assert.ok(h3 > 1.7 * h0, `3D+ ${n}: Vase ${h3.toFixed(2)} hoch gegen Klumpen ${h0.toFixed(2)}`);
    // oben schmal (Hals), in der Mitte breit (Bauch)
    const end = vase(3, beats[3].hold), ys = end.map((p) => p[1]), lo = Math.min(...ys), hi = Math.max(...ys);
    const width = (a, b) => extent(end.filter((p) => p[1] >= lo + a * (hi - lo) && p[1] <= lo + b * (hi - lo)), 0);
    assert.ok(width(0.7, 0.85) < 0.5 * width(0.25, 0.45), `3D+ ${n}: Hals ${width(0.7, 0.85).toFixed(2)} gegen Bauch ${width(0.25, 0.45).toFixed(2)}`);
    assert.ok(extent(frame(beats[3], beats[3].hold), 0) >= 0.8 * extent(beats[0].fitPts, 0), `3D+ ${n}: Ende füllt die Breite nicht`);
  }
});

test('die Scheibe dreht wirklich (Drohnen der Vase wandern um die Achse)', async () => {
  const { beats: [b] } = await builders.potteryWheel3d(500, ''), a = frame(b, 3), c = frame(b, 3.5);
  const moved = a.slice(0, 200).filter((p, j) => Math.hypot(p[0] - c[j][0], p[2] - c[j][2]) > 0.05).length;
  assert.ok(moved > 120, `nur ${moved} von 200 Vasendrohnen bewegen sich`);
});

test('mehr Drohnen bringen mehr Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([500, 699, 700, 899, 900, 1000].map(potLevel), [0, 0, 1, 1, 2, 2]);
  const tags = (n) => { const m = potModel(n); return new Set([...m.turning.tags, ...m.still.tags, ...(m.slots.some((q) => q.k < 0) ? ['ornament'] : [])]); };
  assert.ok(tags(700).size > tags(500).size && tags(1000).size > tags(700).size, `Teile ${[500, 700, 1000].map((n) => tags(n).size).join(' / ')}`);
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['potteryWheel3d', 500, 150], ['potteryWheel3d', 1000, 220], ['potteryWheelStory', 1000, 300]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
