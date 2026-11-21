// Runde 11b (große Motive): Wächter für scenes/gross/robotergreifer.js, den Robotergreifer im Marketing (3D und 3D+ ab
// 800). Genau n Drohnen bei jeder einstellbaren Zahl, keine Klumpen, keine verstreuten Punkte, Bewegung in Drohnengrenzen,
// Bilder schließen aneinander an, die Kinematik stimmt (Glieder behalten ihre Länge, die Hand trifft Modul und Aufnahme),
// das Modul wird gegriffen, ausgerichtet und sitzt am Ende in der Aufnahme, mehr Drohnen bringen mehr Teile.
// Aufruf: node --test scripts/robotergreifer.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, armModel, armLevel, frames, Q } = await import('../src/scripts/scenes/gross/robotergreifer.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { BUILDERS } = await import('../src/scripts/scenes/index.js');

const MIN = 800, STOPS = { s3: droneStops('3d').filter((n) => n >= MIN), plus: droneStops('story').filter((n) => n >= MIN) };
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], (p[2] || 0) - (pts[j][2] || 0))); return m; });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t, from = 0, to = b.pts.length) => b.pts.slice(from, to).map((p, k) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, k + from, t, o); return o; });
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
const centre = (pts) => [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length);
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

test('im Konfigurator: Marketing, direkt hinter dem Kleinen Roboter, 3D und 3D+ ab 800, nachgeladen', () => {
  const launch = OCCASIONS.find((o) => o.id === 'launch'), i = launch.motifs.findIndex((m) => m.id === 'robotergreifer'), m = launch.motifs[i];
  assert.ok(m, 'Robotergreifer fehlt im Marketing');
  assert.equal(launch.motifs[i - 1].id, 'roboter', 'Robotergreifer steht nicht direkt hinter dem Kleinen Roboter');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'robotArm3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'robotArmStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of ['robotArm3d', 'robotArmStory']) { assert.equal(typeof GROSS[b], 'function', `${b} nicht in gross/index.js`); assert.equal(BUILDERS[b], undefined, `${b} im gemeinsamen Szenenpaket`); }
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl, Punkte und Teile gültig', async () => {
  for (const [name, stops] of [['robotArm3d', STOPS.s3], ['robotArmStory', STOPS.plus]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
      if (k) assert.ok(!b.cloud, `${name} ${n} Bild ${k}: Wolke mitten im Motiv`);
    }
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (Stufe, Mitte, 1000; mehrere Zeitpunkte)', async () => {
  for (const name of ['robotArm3d', 'robotArmStory']) for (const n of [800, 900, 1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const t = f * (b.hold ?? 6), nn = nearest(frame(b, t)), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['robotArm3d', 800], ['robotArm3d', 1000], ['robotArmStory', 800], ['robotArmStory', 1000]]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const m = motion(b, 3);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)} bei t = 0`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('Bilder schließen aneinander an (starre Teile, keine Wolke)', async () => {
  for (const n of [800, 1000]) {
    const { beats } = await builders.robotArmStory(n, '');
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), d = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(d < 1e-6, `${n}: Bild ${k} beginnt ${d.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
      assert.deepEqual(beats[k].groups, beats[0].groups, `${n} Bild ${k}: andere Teile`);
    }
  }
});

test('Kinematik: Glieder behalten ihre Länge, die Hand trifft Modul und Aufnahme', () => {
  const len = (f) => [Math.hypot(...[0, 1, 2].map((k) => f.fore.o[k] - f.upper.o[k])), Math.hypot(...[0, 1, 2].map((k) => f.wrist.o[k] - f.fore.o[k]))];
  const [a, b] = len(frames(Q.home));
  for (const q of Object.values(Q)) { const [c, d] = len(frames(q)); assert.ok(Math.abs(c - a) < 1e-9 && Math.abs(d - b) < 1e-9, 'Gliedlänge ändert sich'); }
  // die Hand zeigt beim Greifen und Einsetzen senkrecht nach unten
  for (const k of ['atPick', 'inserted']) assert.ok(frames(Q[k]).hand.X[1] < -0.999, `${k}: Hand nicht senkrecht`);
});

test('Ablauf: greifen, anheben, ausrichten, einsetzen; das Modul sitzt am Ende in der Aufnahme', async () => {
  for (const n of [800, 1000]) {
    const m = armModel(n), { beats } = await builders.robotArmStory(n, '');
    const mod = (b, t) => frame(b, t).filter((_, j) => m.tags[j] === 'modul'), sock = frame(beats[3], beats[3].hold).filter((_, j) => m.tags[j] === 'aufnahme');
    const c0 = centre(mod(beats[0], 0)), cLift = centre(mod(beats[1], 2)), cEnd = centre(mod(beats[3], beats[3].hold)), cs = centre(sock);
    assert.ok(cLift[1] > c0[1] + 0.2, `${n}: Modul wird nicht angehoben`);
    assert.ok(Math.hypot(cEnd[0] - cs[0], cEnd[2] - cs[2]) < 0.03 && cEnd[1] - cs[1] < 0.12, `${n}: Modul sitzt nicht in der Aufnahme`);
    assert.ok(Math.abs(extent(mod(beats[3], beats[3].hold), 0) - extent(sock, 0) * (2 * 0.085) / (2 * 0.12)) < 0.06, `${n}: Modul ist nicht ausgerichtet (Breite in x)`);
    // der Arm füllt das Bild: Szene mindestens 80 % der Ausschnittbreite
    assert.ok(extent(frame(beats[1], 0), 0) >= 0.8 * extent(beats[1].fitPts, 0), `${n}: Szene nur ${(extent(frame(beats[1], 0), 0) / extent(beats[1].fitPts, 0) * 100).toFixed(0)} % der Breite`);
  }
});

test('mehr Drohnen bringen mehr Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([800, 899, 900, 1000].map(armLevel), [0, 0, 1, 1]);
  const tags = (n) => new Set(armModel(n).tags).size;
  assert.ok(tags(900) > tags(800), `Teile ${tags(800)} → ${tags(900)}`);
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['robotArm3d', 800, 200], ['robotArmStory', 1000, 400]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
