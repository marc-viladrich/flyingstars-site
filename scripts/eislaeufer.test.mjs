// Runde 11b (große Motive): Wächter für scenes/gross/eislaeufer.js, Eisläuferpaar auf der Winterbahn (Winter & Silvester, 3D
// und 3D+ ab 700). Genau n Drohnen bei jeder einstellbaren Zahl, keine Drohnen aufeinander und keine verstreuten Punkte (jede
// halbe Sekunde), Bewegung in Drohnengrenzen, die Geschichte erzählt mit denselben Drohnen weiter, das Paar füllt die Bühne,
// die Hände fassen sich in der Pirouette, die Spuren leuchten erst, wenn eine Kufe vorbeizog, am Ende leuchtet das Herz.
// Aufruf: node --test scripts/eislaeufer.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, level, _internal } = await import('../src/scripts/scenes/gross/eislaeufer.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');

// Runde 11c: Schwelle gesenkt (Kontaktbogen)
const MIN = 400, from = (art) => droneStops(art).filter((n) => n >= MIN);
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

test('im Konfigurator: Winter & Silvester, 3D und 3D+ ab der Schwelle, nachgeladen', async () => {
  const o = OCCASIONS.find((x) => x.id === 'silvester'), m = o.motifs.find((x) => x.id === 'eislaeufer');
  assert.ok(m, 'Eisläufer fehlen im Winter');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'skaters3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'skatersStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of ['skaters3d', 'skatersStory']) assert.equal((await GROSS[b]()).builders[b], builders[b]);
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl ab der Schwelle, Punkte und Teile gültig, keine Wolke im Motiv', async () => {
  for (const [name, stops] of [['skaters3d', from('3d')], ['skatersStory', from('story')]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
      assert.ok(!b.cloud, `${name} ${n} Bild ${k}: Wolke`);
    }
  }
});

// dunkle Spurdrohnen (noch nicht befahren) sieht niemand: sie zählen nur für den Mindestabstand
test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (jede halbe Sekunde jedes Bildes)', async () => {
  for (const [name, ns] of [['skaters3d', [400, 700, 850, 1000]], ['skatersStory', [400, 700, 800, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (let t = 0; t <= b.hold + 1e-9; t += 0.5) {
      const all = frame(b, t), nnAll = nearest(all), lit = all.map((o, j) => j).filter((j) => all[j][3] > 0.2);
      const litPts = lit.map((j) => all[j]), nnLit = nearest(litPts), med = quantile(nnLit, 0.5);
      assert.ok(Math.min(...nnAll) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nnAll).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nnLit, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nnLit, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Bewegung in Drohnengrenzen, ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['skaters3d', 400], ['skaters3d', 1000], ['skatersStory', 400], ['skatersStory', 1000]]) {
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
    const { beats } = await builders.skatersStory(n, '');
    assert.equal(beats.length, 4);
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), gap = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(gap < 1e-6, `${n}: Bild ${k} beginnt ${gap.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
    }
  }
});

test('das Paar füllt die Bühne (3D mindestens 70 % der Höhe), im 3D+ trennen sie sich weit (mindestens 45 % der Bildbreite)', async () => {
  for (const n of [700, 1000]) {
    const { beats } = await builders.skaters3d(n, ''), b = beats[0], f = fit(beats), [p0, p1] = range(b, 'paar');
    assert.ok(extent(frame(b, 4).slice(p0, p1), 1) >= 0.7 * f.h, `3D ${n}: Paar ${(extent(frame(b, 4).slice(p0, p1), 1) / f.h * 100).toFixed(0)} % der Höhe`);
    const s = await builders.skatersStory(n, ''), g = fit(s.beats), [q0, q1] = range(s.beats[1], 'paar'), apart = frame(s.beats[1], 2.5).slice(q0, q1);
    assert.ok(extent(apart, 0) >= 0.45 * g.w, `3D+ ${n}: getrennt nur ${(extent(apart, 0) / g.w * 100).toFixed(0)} % der Breite`);
  }
});

test('Pirouette: die Hände fassen sich (Lücke klein, aber keine Berührung), das Kleid schwingt auf', async () => {
  const { beats } = await builders.skaters3d(700, ''), b = beats[0], { m, np } = { m: Math.round(700 * 0.66 / 1.97), np: 0 };
  void np;
  const tagOf = (await import('../src/scripts/scenes/gross/eislaeufer.js'))._tagOf;
  const f = frame(b, 5), hands = (who) => f.map((o, j) => [o, tagOf('skaters3d', 700, j)]).filter(([, t]) => t === `${who}:uarmL` || t === `${who}:uarmR`).map(([o]) => o);
  const he = hands('er'), she = hands('sie');
  let gap = Infinity; for (const a of he) for (const c of she) gap = Math.min(gap, Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]));
  assert.ok(gap < 0.15, `Hände ${gap.toFixed(3)} auseinander`);
  void m;
  const skirt = (t) => { const g = frame(b, t).filter((_, j) => tagOf('skaters3d', 700, j) === 'kleid'); return extent(g, 1); };
  assert.ok(skirt(6) < 0.8 * skirt(0), `Kleid hebt sich nicht (${skirt(0).toFixed(2)} → ${skirt(6).toFixed(2)})`);
});

test('Spuren: dunkel, bis die Kufe vorbeizieht; am Ende leuchtet das ganze Herz', async () => {
  const { beats } = await builders.skatersStory(700, ''), [s0, s1] = range(beats[0], 'spur');
  const lit = (b, t) => frame(b, t).slice(s0, s1).filter((o) => o[3] > 0.4).length / (s1 - s0);
  assert.ok(lit(beats[0], 0) < 0.25, `zu Beginn leuchten schon ${(lit(beats[0], 0) * 100).toFixed(0)} %`);
  assert.ok(lit(beats[1], 0) > lit(beats[0], 0) + 0.2, 'die Spur wächst nicht');
  assert.ok(lit(beats[3], beats[3].hold) > 0.97, `am Ende leuchten nur ${(lit(beats[3], beats[3].hold) * 100).toFixed(0)} %`);
});

test('mehr Drohnen bringen mehr Teile', async () => {
  assert.deepEqual([700, 890, 900, 1000].map(level), [0, 0, 1, 1]);
  const tagOf = (await import('../src/scripts/scenes/gross/eislaeufer.js'))._tagOf;
  const has = (n, tag) => Array.from({ length: n }, (_, j) => tagOf('skaters3d', n, j)).includes(tag);
  assert.ok(!has(700, 'er:schal') && has(900, 'er:schal'), 'Schal ab 900');
});

test('Aufbau schnell genug (erster Aufbau einer neuen Zahl)', async () => {
  for (const [name, n, ms] of [['skaters3d', 750, 300], ['skatersStory', 950, 500]]) {
    const t0 = performance.now(); await builders[name](n, ''); const dt = performance.now() - t0;
    assert.ok(dt < ms, `${name} ${n}: ${dt.toFixed(1)} ms`);
  }
});
