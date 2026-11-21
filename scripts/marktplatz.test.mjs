// Runde 11b (große Motive): Wächter für scenes/gross/marktplatz.js, Fest auf dem Marktplatz (geteilt in Winter & Silvester und im
// Stadtfest, 3D und 3D+ ab 700). Genau n Drohnen bei jeder einstellbaren Zahl, keine Drohnen aufeinander und keine verstreuten
// Punkte (jede halbe Sekunde; der Feuerwerksstern darf locker sein), Bewegung in Drohnengrenzen, die Geschichte erzählt mit
// denselben Drohnen weiter, die Laternen gehen vom Rand zur Mitte an, der Lichtkreis steigt über die Dächer und öffnet sich.
// Aufruf: node --test scripts/marktplatz.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, level, _internal, _tagOf } = await import('../src/scripts/scenes/gross/marktplatz.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');

const MIN = 700, from = (art) => droneStops(art).filter((n) => n >= MIN);
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

test('im Konfigurator: geteilt in Winter & Silvester und im Stadtfest, 3D und 3D+ ab 700, nachgeladen', async () => {
  for (const id of ['silvester', 'festival']) {
    const o = OCCASIONS.find((x) => x.id === id), m = o.motifs.find((x) => x.id === 'marktplatz');
    assert.ok(m, `Marktplatz fehlt in ${id}`);
    assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
    assert.equal(m.tiers.HORIZON.build, 'marketSquare3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
    assert.equal(m.tiers.ODYSSEY.build, 'marketSquareStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  }
  for (const b of ['marketSquare3d', 'marketSquareStory']) assert.equal((await GROSS[b]()).builders[b], builders[b]);
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl ab 700, Punkte und Teile gültig, keine Wolke im Motiv', async () => {
  for (const [name, stops] of [['marketSquare3d', from('3d')], ['marketSquareStory', from('story')]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
      assert.ok(!b.cloud, `${name} ${n} Bild ${k}: Wolke`);
    }
  }
});

// dunkle Drohnen (Laternen und Fenster vor dem Anschalten) sieht niemand, der Stern ist gewollt locker: beide zählen nur für den Mindestabstand
test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (jede halbe Sekunde jedes Bildes)', async () => {
  for (const [name, ns] of [['marketSquare3d', [700, 850, 1000]], ['marketSquareStory', [700, 800, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, '');
    const [r0, r1] = range(beats[0], 'lichtkreis');
    for (const [k, b] of beats.entries()) for (let t = 0; t <= b.hold + 1e-9; t += 0.5) {
      const all = frame(b, t), nnAll = nearest(all), keep = all.map((o, j) => j).filter((j) => all[j][3] > 0.2 && (j < r0 || j >= r1 || k < 3));
      const nnLit = nearest(keep.map((j) => all[j])), med = quantile(nnLit, 0.5);
      assert.ok(Math.min(...nnAll) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nnAll).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nnLit, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nnLit, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Bewegung in Drohnengrenzen, ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['marketSquare3d', 700], ['marketSquare3d', 1000], ['marketSquareStory', 700], ['marketSquareStory', 1000]]) {
    const { beats } = await builders[name](n, ''), s = fit(beats).k;
    for (const [k, b] of beats.entries()) {
      const m = motion(b, s, n > 800 ? 3 : 2);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)}`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('Geschichte mit denselben Drohnen: jedes Bild beginnt, wo das vorige endet', async () => {
  for (const n of [700, 1000]) {
    const { beats } = await builders.marketSquareStory(n, '');
    assert.equal(beats.length, 4);
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), gap = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(gap < 1e-6, `${n}: Bild ${k} beginnt ${gap.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
    }
  }
});

test('Szene füllt die Bühne: die Häuserzeile nimmt im 3D mindestens 70 % der Breite ein', async () => {
  for (const n of [700, 1000]) {
    const { beats } = await builders.marketSquare3d(n, ''), b = beats[0], f = fit(beats), fr = frame(b, 5);
    const houses = fr.filter((_, j) => _tagOf('marketSquare3d', n, j) === 'haus');
    assert.ok(extent(houses, 0) >= 0.7 * f.w * 0.75, `3D ${n}: Häuser ${(extent(houses, 0) / f.w * 100).toFixed(0)} % der Breite`);
  }
});

test('Laternen gehen vom Rand zur Mitte an; der Lichtkreis steigt über die Dächer und öffnet sich zum Stern', async () => {
  const n = 700, { beats } = await builders.marketSquareStory(n, ''), { ACT, T_LAMPS, T_RISE, T_BURST } = _internal;
  const at = (T) => { const a = ACT.findIndex((x, i) => T >= x && T < ACT[i + 1]); return frame(beats[a], T - ACT[a]); };
  const tags = Array.from({ length: n }, (_, j) => _tagOf('marketSquareStory', n, j));
  // je Laterne: Zeitpunkt, ab dem ihr Kopf leuchtet
  const heads = tags.map((t, j) => [t, j]).filter(([t]) => t === 'laterne').map(([, j]) => j);
  const list = _internal.squareList(_internal.model(n - Math.min(150, Math.round(n * 0.2)), level(n))), base = list.map((d) => d.p);
  const onAt = (j) => { for (let T = T_LAMPS[0] - 0.5; T < T_LAMPS[1] + 1; T += 0.1) if (at(T)[j][3] > 0.5) return T; return Infinity; };
  const outer = heads.filter((j) => Math.abs(base[j][0]) > 1.5), inner = heads.filter((j) => Math.abs(base[j][0]) < 1.3);
  assert.ok(outer.length && inner.length, 'keine Laternen außen und innen');
  assert.ok(Math.max(...outer.map(onAt)) < Math.min(...inner.map(onAt)), 'die äußeren Laternen gehen nicht zuerst an');
  const ring = tags.map((t, j) => [t, j]).filter(([t]) => t === 'ring').map(([, j]) => j), houses = tags.map((t, j) => [t, j]).filter(([t]) => t === 'haus').map(([, j]) => j);
  const top = Math.max(...houses.map((j) => at(T_RISE[1])[j][1])), low = Math.min(...ring.map((j) => at(T_RISE[1] + 0.3)[j][1]));
  assert.ok(low > top, `der Lichtkreis steht nicht über den Dächern (${low.toFixed(2)} gegen ${top.toFixed(2)})`);
  const spread = (T) => extent(ring.map((j) => at(T)[j]), 0);
  assert.ok(spread(T_BURST + 3) > 1.5 * spread(T_BURST - 0.2), 'der Stern öffnet sich nicht');
});

test('mehr Drohnen bringen mehr Teile', () => {
  assert.deepEqual([700, 890, 900, 1000].map(level), [0, 0, 1, 1]);
  const has = (n, tag) => Array.from({ length: n }, (_, j) => _tagOf('marketSquare3d', n, j)).includes(tag);
  assert.ok(!has(700, 'kette') && has(900, 'kette'), 'Lichterketten ab 900');
});

test('Aufbau schnell genug (erster Aufbau einer neuen Zahl)', async () => {
  for (const [name, n, ms] of [['marketSquare3d', 750, 300], ['marketSquareStory', 950, 400]]) {
    const t0 = performance.now(); await builders[name](n, ''); const dt = performance.now() - t0;
    assert.ok(dt < ms, `${name} ${n}: ${dt.toFixed(1)} ms`);
  }
});
