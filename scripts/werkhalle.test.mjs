// Runde 11b (große Motive): Wächter für scenes/gross/werkhalle.js, Werkhalle wird Zukunftscampus im Jubiläum (3D und 3D+
// ab 1000). Genau n Drohnen, keine Klumpen, keine verstreuten Punkte, Bewegung in Drohnengrenzen, das Bild füllt die
// Bühne, die Neubauten richten sich wirklich auf (erst liegend, dann stehend, nacheinander), die alte Halle bleibt stehen.
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

const MIN = 1000, NAMES = ['factoryCampus3d', 'factoryCampusStory'];
const STOPS = { factoryCampus3d: droneStops('3d').filter((n) => n >= MIN), factoryCampusStory: droneStops('story').filter((n) => n >= MIN) };
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
  for (const name of NAMES) for (const n of [1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const t of [0, (b.hold ?? 6) / 2, b.hold ?? 6]) {
      const nn = nearest(frame(b, t)), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const name of NAMES) for (const n of [1000]) {
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
  for (const n of [1000]) {
    const { beats } = await builders.factoryCampusStory(n, '');
    assert.equal(beats.length, 4);
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), d = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(d < 1e-6, `${n}: Bild ${k} beginnt ${d.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
      assert.deepEqual(beats[k].groups, beats[0].groups, `${n} Bild ${k}: andere Teile`);
    }
  }
});

test('im Konfigurator: Jubiläum, nach den Wahrzeichen, 3D und 3D+ ab 1000, nachgeladen', () => {
  const jub = OCCASIONS.find((o) => o.id === 'jubilaeum'), i = jub.motifs.findIndex((x) => x.id === 'werkhalle'), m = jub.motifs[i];
  assert.ok(m, 'Werkhalle fehlt im Jubiläum');
  assert.equal(jub.motifs[i - 1].id, 'wahrzeichen');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'factoryCampus3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'factoryCampusStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of NAMES) { assert.equal(typeof GROSS[b], 'function', `${b} nicht in gross/index.js`); assert.equal(BUILDERS[b], undefined, `${b} im gemeinsamen Szenenpaket`); }
});

test('das Bild füllt die Bühne; die Neubauten richten sich nacheinander auf, die alte Halle bleibt', async () => {
  const { beats: [b3] } = await builders.factoryCampus3d(1000, ''), all = frame(b3, 0);
  assert.ok(extent(all, 0) >= 0.85 * extent(b3.fitPts, 0) && extent(all, 1) >= 0.85 * extent(b3.fitPts, 1), '3D füllt die Bühne nicht');
  const { beats } = await builders.factoryCampusStory(1000, ''), [n0, n1] = groupRange(beats[0], 'neu'), [a0, a1] = groupRange(beats[0], 'alt');
  const m = campusModel(1000), tower = m.tags.map((t, j) => (t === 'turm' || t === 'geschoss' ? j : -1)).filter((j) => j >= 0);
  const top = (k, t) => { const f = frame(beats[k], t); return Math.max(...tower.map((j) => f[j][1])); };
  assert.ok(top(3, 0) - top(0, 0) > 0.35, // in der Aufsicht: der liegende Turm liegt hinten und erscheint schon hoch
    `Turm richtet sich nicht auf: ${top(0, 0).toFixed(2)} → ${top(3, 0).toFixed(2)}`);
  // nacheinander: zur Mitte von Akt 3 steht der Würfel schon, die Welle liegt noch
  const cube = m.tags.map((t, j) => (t === 'wuerfel' ? j : -1)).filter((j) => j >= 0), wave = m.tags.map((t, j) => (t === 'welle' ? j : -1)).filter((j) => j >= 0);
  const my = (ids, k, t) => { const f = frame(beats[k], t); return ids.reduce((s, j) => s + f[j][1], 0) / ids.length; };
  assert.ok(my(cube, 2, 3.2) - my(cube, 0, 0) > 0.4 && my(wave, 2, 1.5) - my(wave, 0, 0) < 0.05 && my(wave, 3, 0) - my(wave, 0, 0) > 0.3, 'Würfel und Welle steigen nicht nacheinander auf');
  // die alte Halle bewegt sich nur mit der Ansicht (gleiche Form am Anfang und Ende)
  const alt = (k, t) => frame(beats[k], t, a0, a1);
  assert.ok(Math.abs(extent(alt(0, 0), 1) - extent(alt(3, beats[3].hold), 1)) < 0.25, 'die alte Halle verändert sich');
  assert.ok(n1 - n0 > 250, `nur ${n1 - n0} Drohnen in den Neubauten`);
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['factoryCampus3d', 1000, 220], ['factoryCampusStory', 1000, 300]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
