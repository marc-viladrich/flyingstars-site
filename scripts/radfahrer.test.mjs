// Runde 11b (große Motive): Wächter für scenes/gross/radfahrer.js, Radfahrer im Zielbogen (3D und 3D+ ab 500), geteilt im
// Stadtfest und im Jubiläum. Genau n Drohnen bei jeder einstellbaren Zahl, keine Drohnen aufeinander und keine verstreuten
// Punkte (jede halbe Sekunde), Bewegung in Drohnengrenzen, die Geschichte erzählt mit denselben Drohnen weiter, das Bild füllt
// die Bühne, die Beine treten wirklich (Füße auf den Pedalen), die Ziellinie leuchtet erst, wenn das Vorderrad sie
// überfährt, der Fahrer reißt danach die Arme hoch, mehr Drohnen bringen mehr Teile.
// Aufruf: node --test scripts/radfahrer.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, riderModel, level, _internal } = await import('../src/scripts/scenes/gross/radfahrer.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');

const MIN = 500, from = (art) => droneStops(art).filter((n) => n >= MIN);
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) { const d = Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], p[2] - pts[j][2]); if (d < m) m = d; } return m; });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live(p, j, t, o); return o; });
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
const range = (b, name) => { let s = 0; for (const g of b.groups) { if (g.name === name) return [s, s + g.count]; s += g.count; } return [0, 0]; };
function fit(beats) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const b of beats) for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return { k: 0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75), w: x1 - x0, h: y1 - y0 };
}
function motion(b, s, every = 1) {
  const dt = 1 / 30; let v = 0, a = 0, jump = 0;
  for (let j = 0; j < b.pts.length; j += every) {
    const p = b.pts[j]; let prev = null, pv = null;
    for (let t = 0; t <= b.hold + 1e-9; t += dt) {
      const o = [p[0], p[1], p[2] || 0, 1]; b.live(p, j, t, o);
      if (t === 0) jump = Math.max(jump, Math.hypot(o[0] - p[0], o[1] - p[1], o[2] - (p[2] || 0)));
      if (prev) { const w = [0, 1, 2].map((c) => ((o[c] - prev[c]) / dt) * s); v = Math.max(v, Math.hypot(...w)); if (pv) a = Math.max(a, Math.hypot(...w.map((x, c) => (x - pv[c]) / dt))); pv = w; }
      prev = o;
    }
  }
  return { v, a, jump };
}

test('im Konfigurator: geteilt im Stadtfest und im Jubiläum, 3D und 3D+ ab 500, nachgeladen', async () => {
  for (const id of ['festival', 'jubilaeum']) {
    const o = OCCASIONS.find((x) => x.id === id), m = o.motifs.find((x) => x.id === 'radfahrer');
    assert.ok(m, `Radfahrer fehlt in ${id}`);
    assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
    assert.equal(m.tiers.HORIZON.build, 'cyclist3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
    assert.equal(m.tiers.ODYSSEY.build, 'cyclistStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  }
  for (const b of ['cyclist3d', 'cyclistStory']) assert.equal((await GROSS[b]()).builders[b], builders[b]);
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl ab 500, Punkte und Teile gültig, keine Wolke im Motiv', async () => {
  for (const [name, stops] of [['cyclist3d', from('3d')], ['cyclistStory', from('story')]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
      assert.ok(!b.cloud, `${name} ${n} Bild ${k}: Wolke`);
    }
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (jede halbe Sekunde jedes Bildes)', async () => {
  for (const [name, ns] of [['cyclist3d', [500, 700, 1000]], ['cyclistStory', [500, 800, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (let t = 0; t <= b.hold + 1e-9; t += 0.5) {
      // die Funken sind gewollt verstreut (wie die Sterne beim Satelliten): sie zählen nur für den Mindestabstand
      const [f0, f1] = range(b, 'funken'), all = frame(b, t), lit = all.map((o, j) => [o, j]).filter(([o]) => o[3] > 0.05);
      const nnAll = nearest(lit.map(([o]) => o)), nn = nnAll.filter((_, q) => lit[q][1] < f0 || lit[q][1] >= f1), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nnAll) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nnAll).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Bewegung in Drohnengrenzen, ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['cyclist3d', 500], ['cyclist3d', 1000], ['cyclistStory', 500], ['cyclistStory', 1000]]) {
    const { beats } = await builders[name](n, ''), s = fit(beats).k;
    for (const [k, b] of beats.entries()) {
      const m = motion(b, s, n > 600 ? 3 : 2);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)}`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('Geschichte mit denselben Drohnen: jedes Bild beginnt, wo das vorige endet', async () => {
  for (const n of [500, 1000]) {
    const { beats } = await builders.cyclistStory(n, '');
    assert.equal(beats.length, 3);
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), gap = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(gap < 1e-6, `${n}: Bild ${k} beginnt ${gap.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
      assert.deepEqual(beats[k].groups, beats[0].groups);
    }
  }
});

test('das Bild füllt die Bühne: der Fahrer im 3D mindestens 70 % der Höhe, im 3D+ Bogen und Fahrer zusammen', async () => {
  for (const n of [500, 1000]) {
    const { beats } = await builders.cyclist3d(n, ''), b = beats[0], f = fit(beats), [r0, r1] = range(b, 'fahrer');
    const rider = frame(b, b.hold / 2).slice(r0, r1);
    assert.ok(extent(rider, 1) >= 0.7 * f.h, `3D ${n}: Fahrer ${(extent(rider, 1) / f.h * 100).toFixed(0)} % der Höhe`);
    const s = await builders.cyclistStory(n, ''), g = fit(s.beats), [a0, a1] = range(s.beats[0], 'bogen');
    const arch = frame(s.beats[1], 0).slice(a0, a1);
    assert.ok(extent(arch, 1) >= 0.6 * g.h, `3D+ ${n}: Bogen ${(extent(arch, 1) / g.h * 100).toFixed(0)} % der Höhe`);
    // der Fahrer am Ende groß genug: mindestens 30 % der Bildhöhe
    const [f0, f1] = range(s.beats[2], 'fahrer'), end = frame(s.beats[2], s.beats[2].hold).slice(f0, f1);
    assert.ok(extent(end, 1) >= 0.3 * g.h, `3D+ ${n}: Fahrer am Ende nur ${(extent(end, 1) / g.h * 100).toFixed(0)} % der Höhe`);
  }
});

test('die Beine treten: Füße kreisen mit der Kurbel, die Beinlänge bleibt', async () => {
  const { beats } = await builders.cyclist3d(500, ''), b = beats[0], M = riderModel(Math.round(500 * 0.8), level(500));
  // Schuhdrohnen des linken Beins: ihr Weg über eine Kurbelumdrehung ist ein geschlossener Bogen mit deutlicher Höhe
  const shoe = M.body.tags.map((t, j) => [t, j]).filter(([t, j]) => t === 'uschL' && M.body.pts[j][1] < -0.5).map(([, j]) => j);
  assert.ok(shoe.length >= 2, 'keine Fußdrohnen');
  const ys = Array.from({ length: 31 }, (_, i) => frame(b, 2 + i * 0.05)[shoe[0]][1]);
  assert.ok(extent(ys.map((y) => [y]), 0) > 0.12, `Fuß hebt sich nur ${extent(ys.map((y) => [y]), 0).toFixed(3)}`);
});

test('Ziellinie leuchtet erst, wenn das Vorderrad sie überfährt; danach Arme hoch und Funken', async () => {
  const { beats, meta } = await builders.cyclistStory(500, ''), [l0, l1] = range(beats[0], 'ziellinie');
  const at = (T) => { const a = _internal.ACT.findIndex((x, i) => T >= x && T < _internal.ACT[i + 1]); return frame(beats[a], T - _internal.ACT[a]); };
  const mean = (T) => { const f = at(T).slice(l0, l1); return f.reduce((s, o) => s + o[3], 0) / f.length; };
  assert.ok(mean(meta.crossT - 0.5) < 0.5 && mean(meta.crossT + 0.6) > 1.1, `Ziellinie ${mean(meta.crossT - 0.5).toFixed(2)} → ${mean(meta.crossT + 0.6).toFixed(2)}`);
  // Arme hoch: die Hände stehen am Ende über dem Helm
  const [f0] = range(beats[0], 'fahrer'), M = riderModel(meta.nr, level(500)), end = at(_internal.ACT[3] - 0.01);
  const ys = (tags) => M.body.tags.map((t, j) => [t, j]).filter(([t]) => tags.includes(t)).map(([, j]) => end[f0 + j][1]);
  assert.ok(Math.max(...ys(['uarmL', 'uarmR'])) > Math.max(...ys(['kopf'])), 'die Hände sind nicht über dem Kopf');
  const [s0, s1] = range(beats[0], 'funken'), before = at(meta.upT - 0.1).slice(s0, s1), after = at(_internal.ACT[3] - 0.01).slice(s0, s1);
  assert.ok(extent(after, 1) > 2.5 * extent(before, 1), `Funken sprühen nicht (${extent(before, 1).toFixed(2)} → ${extent(after, 1).toFixed(2)})`);
});

test('mehr Drohnen bringen mehr Teile', () => {
  assert.deepEqual([500, 690, 700, 890, 900].map(level), [0, 0, 1, 1, 2]);
  const tags = (m, lv) => new Set(riderModel(m, lv).body.tags);
  assert.ok(!tags(400, 0).has('kette') && tags(560, 1).has('kette') && tags(560, 1).has('nummer'), 'Kettenblatt und Startnummer ab 700');
});

test('Aufbau schnell genug (erster Aufbau einer neuen Zahl)', async () => {
  for (const [name, n, ms] of [['cyclist3d', 550, 250], ['cyclistStory', 950, 400]]) {
    const t0 = performance.now(); await builders[name](n, ''); const dt = performance.now() - t0;
    assert.ok(dt < ms, `${name} ${n}: ${dt.toFixed(1)} ms`);
  }
});
