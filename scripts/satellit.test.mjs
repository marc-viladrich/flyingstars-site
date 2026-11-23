// Runde 11 (große Motive): Wächter für scenes/gross/satellit.js, den Satelliten im Marketing (3D und 3D+ ab 700). Genau n
// Drohnen bei jeder einstellbaren Zahl, keine Klumpen, keine verstreuten Punkte (außer den Sternen), Bewegung in
// Drohnengrenzen, das Bild füllt die Bühne, die Flügel klappen wirklich (erst links, dann rechts), die Impulsringe landen
// auf der Erde, mehr Drohnen bringen mehr Teile, und die Teile heißen wie in der Mondlandung (Übergang mit Bezug).
// Aufruf: node --test scripts/satellit.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, satModel, satLevel, storyModel } = await import('../src/scripts/scenes/gross/satellit.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { hasBuilder } = await import('../src/scripts/scenes/index.js');

const MIN = 400, STOPS = { s3: droneStops('3d').filter((n) => n >= MIN), plus: droneStops('story').filter((n) => n >= MIN) };
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

test('im Konfigurator: Marketing, direkt hinter der Mondlandung, 3D und 3D+ ab 400 (Runde 11c), nachgeladen', () => {
  const launch = OCCASIONS.find((o) => o.id === 'launch'), i = launch.motifs.findIndex((m) => m.id === 'satellit'), m = launch.motifs[i];
  assert.ok(m, 'Satellit fehlt im Marketing');
  assert.equal(launch.motifs[i - 1].id, 'mond', 'Satellit steht nicht direkt hinter der Mondlandung');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'satellite3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'satelliteStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of ['satellite3d', 'satelliteStory']) { assert.equal(typeof GROSS[b], 'function', `${b} nicht in gross/index.js`); assert.equal(hasBuilder(b), false, `${b} im gemeinsamen Szenenpaket`); }
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl, Punkte und Teile gültig', async () => {
  for (const [name, stops] of [['satellite3d', STOPS.s3], ['satelliteStory', STOPS.plus]]) for (const n of stops) {
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
  for (const name of ['satellite3d', 'satelliteStory']) for (const n of [400, 700, 1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const [s0] = b.groups ? groupRange(b, 'stars') : [n];
      for (const t of [0, (b.hold ?? 6) / 2, b.hold ?? 6]) {
        const all = frame(b, t), nn = nearest(all), med = quantile(nn.slice(0, s0), 0.5);
        assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
        // ohne die Sterne (die stehen absichtlich einzeln am Himmel)
        assert.ok(quantile(nn.slice(0, s0), 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn.slice(0, s0), 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
      }
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['satellite3d', 400], ['satellite3d', 1000], ['satelliteStory', 400], ['satelliteStory', 1000]]) {
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
  for (const n of [400, 1000]) {
    const { beats } = await builders.satelliteStory(n, '');
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), d = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(d < 1e-6, `${n}: Bild ${k} beginnt ${d.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
      assert.deepEqual(beats[k].groups, beats[0].groups, `${n} Bild ${k}: andere Teile`);
    }
  }
});

test('Übergang mit Bezug zur Mondlandung: Teile heißen wie dort (Rakete → Satellit, Mond → Erde, Sterne bleiben)', async () => {
  const { beats } = await builders.satelliteStory(700, '');
  assert.deepEqual(beats[0].groups.map((g) => g.name), ['rocket', 'trail', 'world', 'stars']);
  assert.ok(beats[0].groups.every((g) => g.rigid && g.count > 0));
});

test('das Bild füllt die Bühne, die Flügel klappen wirklich, erst links, dann rechts', async () => {
  for (const n of [400, 1000]) {
    // 3D: eingeklappt schmal, ausgeklappt mindestens 75 % der Bildbreite (der Ausschnitt enthält auch die geschwenkten Lagen)
    const { beats: [b3] } = await builders.satellite3d(n, ''), w0 = extent(frame(b3, 0), 0), w1 = extent(frame(b3, 6), 0);
    assert.ok(w1 >= 0.75 * extent(b3.fitPts, 0), `3D ${n}: ausgeklappt nur ${(w1 / extent(b3.fitPts, 0) * 100).toFixed(0)} % der Breite`);
    assert.ok(w0 <= 0.6 * w1, `3D ${n}: eingeklappt ${w0.toFixed(2)} gegen offen ${w1.toFixed(2)}`);
    // 3D+: Satellit (ohne Erde und Sterne) offen mindestens 70 % der Bildbreite; Akt 2 öffnet nur die linke Seite
    const { beats } = await builders.satelliteStory(n, ''), [r0, r1] = groupRange(beats[0], 'rocket');
    const sat = (k, t) => frame(beats[k], t, r0, r1), fit = extent(beats[0].fitPts, 0);
    assert.ok(extent(sat(3, 0), 0) >= 0.7 * fit, `3D+ ${n}: Satellit nur ${(extent(sat(3, 0), 0) / fit * 100).toFixed(0)} % der Breite`);
    // Bezug: Akt 2 beginnt eingeklappt in der Dreiviertelansicht (Akt 1 dreht ihn dorthin)
    const cx = (pts) => (Math.max(...pts.map((p) => p[0])) + Math.min(...pts.map((p) => p[0]))) / 2, mid = cx(sat(1, 0));
    const left = (pts) => mid - Math.min(...pts.map((p) => p[0])), right = (pts) => Math.max(...pts.map((p) => p[0])) - mid;
    assert.ok(left(sat(2, 0)) > 1.6 * left(sat(1, 0)) && right(sat(2, 0)) < 1.25 * right(sat(1, 0)), `3D+ ${n}: nach Akt 2 links ${left(sat(2, 0)).toFixed(2)}, rechts ${right(sat(2, 0)).toFixed(2)}`);
    assert.ok(right(sat(3, 0)) > 1.6 * right(sat(1, 0)), `3D+ ${n}: rechts nach Akt 3 ${right(sat(3, 0)).toFixed(2)}`);
  }
});

test('der Lichtimpuls: drei Ringe lösen sich aus der Schüssel und liegen am Ende auf der Erde', async () => {
  for (const n of [400, 1000]) {
    const { beats } = await builders.satelliteStory(n, ''), b = beats[3], [t0, t1] = groupRange(b, 'trail'), [w0, w1] = groupRange(b, 'world');
    assert.ok(t1 - t0 >= 0.07 * n, `${n}: nur ${t1 - t0} Ringdrohnen`); // anteilig (Runde 11c: ab 400)
    const start = frame(b, 0, t0, t1), end = frame(b, b.hold, t0, t1), earth = frame(b, b.hold, w0, w1);
    const lowest = Math.min(...earth.map((p) => p[1])), top = Math.max(...earth.map((p) => p[1]));
    assert.ok(Math.min(...start.map((p) => p[1])) > top, `${n}: Ringe stehen anfangs nicht in der Schüssel über der Erde`);
    assert.ok(end.every((p) => p[1] < top && p[1] > lowest - 0.3), `${n}: Ringe liegen am Ende nicht auf der Erdkappe`);
    assert.ok(extent(end, 0) > 2.5 * extent(start, 0), `${n}: Footprint ${extent(end, 0).toFixed(2)} nicht weiter als die Schüssel ${extent(start, 0).toFixed(2)}`);
  }
});

test('mehr Drohnen bringen mehr Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([700, 799, 800, 899, 900, 1000].map(satLevel), [0, 0, 1, 1, 2, 2]);
  const tags = (n) => new Set(satModel(n).tags);
  assert.ok(tags(800).size > tags(700).size && tags(1000).size > tags(800).size, `Teile ${[700, 800, 1000].map((n) => tags(n).size).join(' / ')}`);
  const med = (n) => quantile(nearest(satModel(n).pts), 0.5);
  assert.ok(med(1000) >= 0.55 * med(700), `Abstand ${med(700).toFixed(3)} → ${med(1000).toFixed(3)}`);
  const { earth } = storyModel(1000); assert.ok(earth.tags.includes('lat'), 'Gradnetz der Erde');
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['satellite3d', 700, 150], ['satellite3d', 1000, 220], ['satelliteStory', 1000, 300]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
