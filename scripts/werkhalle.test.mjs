// Runde 11b/11c (große Motive): Wächter für scenes/gross/werkhalle.js, Werkhalle wird Zukunftscampus im Jubiläum. Genau n
// Drohnen, keine Klumpen, keine verstreuten Punkte, Bewegung in Drohnengrenzen, das Bild füllt die Bühne; in 3D+ wird der
// Rauch ein Lichtstrom, der Strom baut Haus für Haus, der Kranz steigt im Höhepunkt über den Campus.
// Aufruf: node --test scripts/werkhalle.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, campusModel } = await import('../src/scripts/scenes/gross/werkhalle.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { BUILDERS } = await import('../src/scripts/scenes/index.js');

// Runde 11c: 3D und 3D+ ab 700 (vorher 1000)
const MIN = { factoryCampus3d: 700, factoryCampusStory: 700 }, NAMES = ['factoryCampus3d', 'factoryCampusStory'];
const STOPS = { factoryCampus3d: droneStops('3d').filter((n) => n >= MIN.factoryCampus3d), factoryCampusStory: droneStops('story').filter((n) => n >= MIN.factoryCampusStory) };
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
/** Alle Neubauten zusammen (je Haus ein Teil neu:<haus>, zusammenhängend). */
const neuRange = (b) => { let s = 0, lo = -1, hi = -1; for (const g of b.groups) { if (g.name.startsWith('neu:')) { if (lo < 0) lo = s; hi = s + g.count; } s += g.count; } return [lo, hi]; };

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
  for (const name of NAMES) for (const n of [MIN[name], 900, 1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const t of [0, (b.hold ?? 6) / 2, b.hold ?? 6]) {
      const nn = nearest(frame(b, t)), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const name of NAMES) for (const n of [MIN[name], 1000]) {
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
  for (const n of [MIN.factoryCampusStory, 1000]) {
    const { beats } = await builders.factoryCampusStory(n, '');
    assert.equal(beats.length, 4);
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), d = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(d < 1e-6, `${n}: Bild ${k} beginnt ${d.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
      assert.deepEqual(beats[k].groups, beats[0].groups, `${n} Bild ${k}: andere Teile`);
    }
  }
});

test('im Konfigurator: Jubiläum, nach den Wahrzeichen, 3D und 3D+ ab 700, nachgeladen', () => {
  const jub = OCCASIONS.find((o) => o.id === 'jubilaeum'), i = jub.motifs.findIndex((x) => x.id === 'werkhalle'), m = jub.motifs[i];
  assert.ok(m, 'Werkhalle fehlt im Jubiläum');
  assert.equal(jub.motifs[i - 1].id, 'wahrzeichen');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'factoryCampus3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN.factoryCampus3d);
  assert.equal(m.tiers.ODYSSEY.build, 'factoryCampusStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN.factoryCampusStory);
  for (const b of NAMES) { assert.equal(typeof GROSS[b], 'function', `${b} nicht in gross/index.js`); assert.equal(BUILDERS[b], undefined, `${b} im gemeinsamen Szenenpaket`); }
});

test('das Bild füllt die Bühne; Rauch wird Strom, der Strom baut Haus für Haus, der Kranz steigt (Runde 11c)', async () => {
  for (const n of [MIN.factoryCampusStory, 1000]) {
    const { beats: [b3] } = await builders.factoryCampus3d(n, ''), all = frame(b3, 0);
    assert.ok(extent(all, 0) >= 0.85 * extent(b3.fitPts, 0) && extent(all, 1) >= 0.8 * extent(b3.fitPts, 1), `3D ${n} füllt die Bühne nicht`);
    const { beats } = await builders.factoryCampusStory(n, ''), [n0, n1] = neuRange(beats[0]), [k0, k1] = groupRange(beats[0], 'kranz'), [a0, a1] = groupRange(beats[0], 'alt');
    assert.ok(n1 - n0 > 0.4 * n, `${n}: nur ${n1 - n0} Drohnen im Rauch, Strom und den Neubauten`);
    const neu = (k, t) => frame(beats[k], t, n0, n1), my = (pts) => pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const hall = frame(beats[0], 0, a0, a1), roof = Math.max(...hall.map((p) => p[1]));
    // Akt 1: Rauch über der Halle; Akt 3 beginnt mit dem Strom am Boden (tiefer als das Hallendach); Akt 4: die Häuser stehen
    assert.ok(Math.min(...neu(0, 0).map((p) => p[1])) > roof, `${n}: der Rauch hängt nicht über der Halle`);
    const stream = neu(2, 0), built = neu(3, 0);
    assert.ok(Math.max(...stream.map((p) => p[1])) < roof && extent(stream, 0) > 0.6 * extent(hall.concat(stream), 0), `${n}: kein Strom über die Straße`);
    assert.ok(extent(built, 1) > 2.5 * extent(stream, 1), `${n}: die Häuser erheben sich nicht aus dem Strom`);
    // Haus für Haus: das erste Haus steht, bevor das letzte beginnt
    const { slots } = campusModel(n, true), first = slots.map((s, i) => (s.bi === 0 ? i : -1)).filter((i) => i >= 0), last = slots.map((s, i) => (s.bi === 3 ? i : -1)).filter((i) => i >= 0);
    const at = neu(2, 2.6), base = neu(2, 0), rise = (ids) => ids.reduce((s, i) => s + at[i][1] - base[i][1], 0) / ids.length; // Mittel: die Drehung der Wendel hebt sich auf
    assert.ok(rise(first) > 0.25 && Math.abs(rise(last)) < 0.03, `${n}: nicht Haus für Haus (${rise(first).toFixed(2)} / ${rise(last).toFixed(2)})`);
    // Höhepunkt: der Kranz wird weit und steht über dem Campus
    const k3 = frame(beats[3], 0, k0, k1), kEnd = frame(beats[3], beats[3].hold, k0, k1);
    assert.ok(extent(kEnd, 0) > 3 * extent(k3, 0) && my(kEnd) > Math.max(...built.map((p) => p[1])), `${n}: der Kranz steigt nicht über den Campus`);
    assert.ok(beats[0].frame !== beats[2].frame, 'eigener Bildausschnitt für Fabrik und Campus');
    assert.deepEqual(beats[0].groups.map((g) => g.name), ['alt', 'neu:turm', 'neu:welle', 'neu:turm2', 'neu:wuerfel', 'kranz'], 'je Haus ein Teil');
  }
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['factoryCampus3d', 1000, 220], ['factoryCampusStory', 1000, 300]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
