// Runde 11b (große Motive): Wächter für scenes/gross/spalier.js, das Blütenspalier mit Lichterweg (Hochzeit, 3D und 3D+ ab
// 700, Kandidat FSK-075). Genau n Drohnen bei jeder einstellbaren Zahl, keine Drohnen aufeinander und keine verstreuten
// Punkte (jede halbe Sekunde jedes Bildes), Bewegung in Drohnengrenzen, die Geschichte erzählt mit denselben Drohnen weiter,
// das Bild füllt die Bühne, der Weg führt in die Tiefe, die Blüten öffnen sich paarweise von vorn nach hinten, mehr Drohnen
// bringen mehr Bögen und Blüten.
// Aufruf: node --test scripts/spalier.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, model, level } = await import('../src/scripts/scenes/gross/spalier.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');

const from500 = (art) => droneStops(art).filter((n) => n >= 500);
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) { const d = Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], p[2] - pts[j][2]); if (d < m) m = d; } return m; });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t, dark = false) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, j, t, o); return o; }).filter((o) => dark || o[3] > 0.05);
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
function scaleOf(beats) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const b of beats) for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return { k: 0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75), w: x1 - x0, h: y1 - y0 };
}
function motion(b, s, every = 1) {
  const dt = 1 / 30, hold = b.hold ?? 6; let v = 0, a = 0, jump = 0;
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

test('im Konfigurator: Hochzeit, 3D und 3D+ ab 500 (Runde 11c, vorher 700), direkt nach dem Tor, nachgeladen', async () => {
  const h = OCCASIONS.find((o) => o.id === 'hochzeit'), i = h.motifs.findIndex((x) => x.id === 'spalier'), m = h.motifs[i];
  assert.ok(m, 'Blütenspalier fehlt in der Hochzeit');
  assert.equal(h.motifs[i - 1].id, 'tor', 'nicht direkt nach dem Tor');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'spalier3d'); assert.equal(m.tiers.HORIZON.minDrones, 500);
  assert.equal(m.tiers.ODYSSEY.build, 'spalierStory'); assert.equal(m.tiers.ODYSSEY.minDrones, 500);
  for (const b of ['spalier3d', 'spalierStory']) assert.equal((await GROSS[b]()).builders[b], builders[b]);
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl ab 500, Punkte gültig, Teile vollständig', async () => {
  for (const [name, stops] of [['spalier3d', from500('3d')], ['spalierStory', from500('story')]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
    }
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (jede halbe Sekunde jedes Bildes)', async () => {
  for (const [name, ns] of [['spalier3d', [500, 650, 850, 1000]], ['spalierStory', [500, 600, 800, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const t of [...Array.from({ length: Math.floor(b.hold / 0.5) + 1 }, (_, i) => i * 0.5), b.hold]) {
      const pts = frame(b, t, true), nn = nearest(pts), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t.toFixed(1)}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t.toFixed(1)}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['spalier3d', 500], ['spalier3d', 1000], ['spalierStory', 500], ['spalierStory', 1000]]) {
    const { beats } = await builders[name](n, ''), s = scaleOf(beats).k;
    for (const [k, b] of beats.entries()) {
      const m = motion(b, s, 2);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)} bei t = 0`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('Geschichte mit denselben Drohnen: jedes Bild beginnt, wo das vorige endet; keine Wolke mitten im Motiv', async () => {
  for (const n of [500, 1000]) {
    const { beats } = await builders.spalierStory(n, '');
    assert.equal(beats.length, 4);
    for (const [k, b] of beats.entries()) {
      assert.deepEqual(b.groups, beats[0].groups, `Bild ${k}: andere Teile`);
      assert.ok(b.groups.every((g) => g.rigid), `Bild ${k}: Teile nicht starr`);
      assert.ok(!b.cloud && !b.frame, `Bild ${k}: Wolke oder eigener Bildausschnitt`);
      if (!k) continue;
      const end = frame(beats[k - 1], beats[k - 1].hold, true);
      const gap = Math.max(...b.pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(gap < 0.03, `${n}: Bild ${k} beginnt ${gap.toFixed(3)} neben dem Ende von Bild ${k - 1}`);
    }
  }
});

test('das Bild füllt die Bühne; der Weg führt in die Tiefe; am Ende stehen zwei Ringe im Tunnel', async () => {
  for (const [name, n] of [['spalier3d', 500], ['spalier3d', 1000], ['spalierStory', 500], ['spalierStory', 1000]]) {
    const { beats } = await builders[name](n, ''), fit = scaleOf(beats);
    assert.ok(fit.w / fit.h >= 0.55 * (1.15 / 0.75), `${name} ${n}: Seitenverhältnis ${(fit.w / fit.h).toFixed(2)}`);
    const b = beats[0], f = frame(b, b.hold, true);
    assert.ok(extent(f, 0) >= 0.7 * fit.w && extent(f, 1) >= 0.8 * fit.h, `${name} ${n}: füllt den Ausschnitt nicht`);
  }
  for (const n of [500, 1000]) {
    const M = model(n), zs = M.lights.map((p) => p[2]);
    assert.ok(Math.max(...zs) - Math.min(...zs) >= 4, `${n}: Weg zu kurz`);
    // der Weg wird nach hinten schmaler (die Tiefe), die Bögen werden kleiner
    const front = M.lights.filter((p) => p[3] === 0), back = M.lights.filter((p) => p[3] === Math.max(...M.lights.map((q) => q[3])));
    assert.ok(extent(back, 0) < 0.6 * extent(front, 0), `${n}: Weg wird nicht schmaler`);
    assert.ok(M.A.every((a, i) => !i || (a.a < M.A[i - 1].a && a.z < M.A[i - 1].z)), `${n}: Bögen nicht gestaffelt`);
    // am Ende: alle Lichter über dem Boden, im Tunnel (zwischen den Bögen), höher als die Weglichter vorher
    const { beats } = await builders.spalierStory(n, ''), b = beats[3], P = b.pts.map((p, j) => { const o = [p[0], p[1], p[2], 1]; b.live(p, j, b.hold, o); return o; }).slice(M.nw + M.nf);
    const first = beats[0].pts.slice(M.nw + M.nf), mean = (l) => l.reduce((a, p) => a + p[1], 0) / l.length;
    assert.ok(mean(P) > Math.max(...first.map((p) => p[1])) + 0.15, `${n}: die Lichter steigen nicht auf`);
  }
});

test('Blüten öffnen sich paarweise von vorn nach hinten (links und rechts zugleich)', async () => {
  for (const n of [500, 1000]) {
    const M = model(n), { beats } = await builders.spalier3d(n, ''), b = beats[0];
    // Öffnung einer Blüte: wie weit ihre Drohnen nach vorn (z) über den Mittelpunkt hinaus stehen (Kelch → flach)
    const cup = (t, fi) => { const js = M.slot.map((q, k) => (q.fi === fi ? M.nw + k : -1)).filter((j) => j >= 0); return js.length; };
    assert.ok(M.F.every((f, fi) => cup(0, fi) >= 2.6 * M.K), `${n}: Blüte mit zu wenig Drohnen`);
    const pairs = new Map(); M.F.forEach((f) => { if (f.sg) pairs.set(f.pair, (pairs.get(f.pair) ?? 0) + 1); });
    assert.ok([...pairs.values()].every((c) => c % 2 === 0), `${n}: Blüten nicht paarweise`);
    assert.equal(pairs.size, M.A.length, `${n}: nicht jeder Bogen hat ein Blütenpaar`);
  }
});

test('mehr Drohnen bringen mehr Bögen und Blüten, nicht nur dichtere Linien', () => {
  assert.deepEqual([700, 799, 800, 899, 900, 1000].map(level), [0, 0, 1, 1, 2, 2]);
  assert.deepEqual([500, 700, 800, 900].map((n) => model(n).A.length), [3, 4, 5, 6]);
  assert.ok(model(500).F.length < model(700).F.length && model(700).F.length < model(800).F.length && model(800).F.length < model(900).F.length, 'Blüten');
  const med = (n) => { const M = model(n); return quantile(nearest(M.walls), 0.5); };
  assert.ok(med(1000) >= 0.5 * med(500), `Bögen: Abstand ${med(500).toFixed(3)} → ${med(1000).toFixed(3)}`);
});

test('Aufbau schnell genug für den Anlasswechsel (erster Aufbau einer neuen Zahl)', async () => {
  for (const [name, n, ms] of [['spalier3d', 750, 300], ['spalierStory', 1000, 500]]) {
    const t0 = performance.now(); await builders[name](n, ''); const dt = performance.now() - t0;
    assert.ok(dt < ms, `${name} ${n}: ${dt.toFixed(1)} ms`);
  }
});
