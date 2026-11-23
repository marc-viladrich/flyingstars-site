// Runde 11b (große Motive): Wächter für scenes/gross/foerderband.js, das Förderband im Marketing (3D und 3D+ ab 500).
// Genau n Drohnen bei jeder einstellbaren Zahl, keine Klumpen, keine verstreuten Punkte, Bewegung in Drohnengrenzen (auch
// auf den engen Bögen um die Rollen), Bilder schließen aneinander an, das Gehäuse fährt (der Bandlauf selbst ist Licht,
// Runde 11b, Finten-Wächter), Modul und Deckel werden übergeben, das Produkt hebt am Ende ab und füllt das Bild,
// mehr Drohnen bringen mehr Teile.
// Aufruf: node --test scripts/foerderband.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, beltModel, beltLevel } = await import('../src/scripts/scenes/gross/foerderband.js');
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

test('im Konfigurator: Marketing, direkt hinter den Zahnrädern, 3D und 3D+ ab 400 (Runde 11c), nachgeladen', () => {
  const launch = OCCASIONS.find((o) => o.id === 'launch'), i = launch.motifs.findIndex((m) => m.id === 'foerderband'), m = launch.motifs[i];
  assert.ok(m, 'Förderband fehlt im Marketing');
  assert.equal(launch.motifs[i - 1].id, 'zahnraeder', 'Förderband steht nicht direkt hinter den Zahnrädern');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'conveyor3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'conveyorStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of ['conveyor3d', 'conveyorStory']) { assert.equal(typeof GROSS[b], 'function', `${b} nicht in gross/index.js`); assert.equal(hasBuilder(b), false, `${b} im gemeinsamen Szenenpaket`); }
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl, Punkte und Teile gültig', async () => {
  for (const [name, stops] of [['conveyor3d', STOPS.s3], ['conveyorStory', STOPS.plus]]) for (const n of stops) {
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
  for (const name of ['conveyor3d', 'conveyorStory']) for (const n of [400, 700, 1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const t = f * (b.hold ?? 6), nn = nearest(frame(b, t)), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen (auch um die Rollen) und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['conveyor3d', 400], ['conveyor3d', 1000], ['conveyorStory', 400], ['conveyorStory', 1000]]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const m = motion(b, n > 600 ? 3 : 1);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)} bei t = 0`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('Bilder schließen aneinander an (starre Teile, keine Wolke)', async () => {
  for (const n of [400, 1000]) {
    const { beats } = await builders.conveyorStory(n, '');
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), d = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(d < 1e-6, `${n}: Bild ${k} beginnt ${d.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
      assert.deepEqual(beats[k].groups, beats[0].groups, `${n} Bild ${k}: andere Teile`);
    }
  }
});

test('Mechanik: das Band läuft, das Gehäuse fährt mit, Modul und Deckel wandern vom Werkzeug ins Gehäuse, das Produkt hebt ab', async () => {
  for (const n of [400, 1000]) {
    const m = beltModel(n), { beats } = await builders.conveyorStory(n, ''), B = m.B;
    const tagged = (b, t, tag) => frame(b, t, B).filter((_, k) => m.tags[k] === tag);
    const cx = (pts) => pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = (pts) => pts.reduce((s, p) => s + p[1], 0) / pts.length;
    // Akt 1: das Gehäuse fährt nach rechts, die Banddrohnen oben ebenfalls (gleiche Strecke)
    const box0 = cx(tagged(beats[0], 0, 'gehaeuse')), box1 = cx(tagged(beats[0], beats[0].hold, 'gehaeuse'));
    assert.ok(box1 - box0 > 0.4, `${n}: Gehäuse fährt nur ${(box1 - box0).toFixed(2)}`);
    // Modul: vorher über dem Gehäuse, nach Akt 2 im Gehäuse (Mitte des Moduls innerhalb des Gehäuses)
    const g = tagged(beats[2], 0, 'gehaeuse'), mod = tagged(beats[2], 0, 'modul');
    assert.ok(Math.abs(cx(mod) - cx(g)) < 0.03 && Math.abs(cy(mod) - cy(g)) < 0.06, `${n}: Modul sitzt nicht im Gehäuse`);
    assert.ok(cy(tagged(beats[0], 0, 'modul')) > cy(tagged(beats[0], 0, 'gehaeuse')) + 0.2, `${n}: Modul hängt anfangs nicht am Greifer`);
    // Deckel: nach Akt 3 oben auf dem Gehäuse
    const g3 = tagged(beats[3], 0, 'gehaeuse'), lid = tagged(beats[3], 0, 'deckel');
    assert.ok(Math.abs(cx(lid) - cx(g3)) < 0.03 && Math.abs(Math.max(...lid.map((p) => p[1])) - Math.max(...g3.map((p) => p[1]))) < 0.05, `${n}: Deckel liegt nicht auf dem Gehäuse`);
    // Höhepunkt: das fertige Produkt steigt über die Anlage und wird mindestens 1,8-mal so breit
    const end = tagged(beats[3], beats[3].hold, 'gehaeuse');
    assert.ok(cy(end) > cy(g3) + 0.6 && extent(end, 0) > 1.8 * extent(g3, 0), `${n}: Produkt steigt ${(cy(end) - cy(g3)).toFixed(2)}, Breite ${(extent(end, 0) / extent(g3, 0)).toFixed(2)}×`);
    // die Anlage füllt die Bühne: mindestens 80 % der Bildbreite
    assert.ok(extent(frame(beats[1], 0), 0) >= 0.8 * extent(beats[1].fitPts, 0), `${n}: Anlage nur ${(extent(frame(beats[1], 0), 0) / extent(beats[1].fitPts, 0) * 100).toFixed(0)} % der Breite`);
  }
});

test('mehr Drohnen bringen mehr Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([500, 699, 700, 899, 900, 1000].map(beltLevel), [0, 0, 1, 1, 2, 2]);
  const tags = (n) => new Set(beltModel(n).tags).size;
  assert.ok(tags(700) > tags(500) && tags(1000) > tags(700), `Teile ${[500, 700, 1000].map(tags).join(' / ')}`);
  const med = (n) => quantile(nearest(beltModel(n).pts), 0.5);
  assert.ok(med(1000) >= 0.5 * med(500), `Abstand ${med(500).toFixed(3)} → ${med(1000).toFixed(3)}`);
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['conveyor3d', 500, 150], ['conveyorStory', 1000, 400]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
