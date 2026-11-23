// Runde 11 (große Motive, Marc 20.11.2026: Countdown ausdrücklich gewünscht): Wächter für scenes/gross/countdown.js, den
// Countdown von 10 bis 0 im Anlass Winter & Silvester (3D und 3D+ ab 900, direkt hinter der Uhr). Genau n Drohnen bei jeder
// einstellbaren Zahl, keine Klumpen und keine Begegnung auch mitten im Wechsel (optimale Zuordnung, gerade Bahnen),
// Bewegung in Drohnengrenzen, alle elf Zahlen in Reihenfolge, der Ring läuft ab, die letzten drei Wechsel drehen sich durch
// die Tiefe, die Null zerspringt ohne Wolke mit denselben Drohnen, das Tempo bleibt knapp, der Aufbau schnell.
// Aufruf: node --test scripts/countdown.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, countdownModel, timeline, LABELS, RING } = await import('../src/scripts/scenes/gross/countdown.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { hasBuilder } = await import('../src/scripts/scenes/index.js');

const MIN = 300, STOPS = { s3: droneStops('3d').filter((n) => n >= MIN), plus: droneStops('story').filter((n) => n >= MIN) };
/** Nächster Nachbar je Punkt (Gitter, sonst kostet es bei 1000 Drohnen zu lange). */
function nearest(pts) {
  const cell = 0.06, g = new Map(), key = (a, b, c) => `${a},${b},${c}`, out = [];
  pts.forEach((p, i) => { const k = key(...p.slice(0, 3).map((v) => Math.floor(v / cell))); if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
  pts.forEach((p, i) => {
    const [cx, cy, cz] = p.slice(0, 3).map((v) => Math.floor(v / cell)); let m = Infinity;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const j of g.get(key(cx + a, cy + b, cz + c)) ?? []) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], p[2] - pts[j][2]));
    out.push(Number.isFinite(m) ? m : cell * 2);
  });
  return out;
}
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live(p, j, t, o); return o; });
const lit = (f) => f.filter((o) => o[3] > 0.05);
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
function scaleOf(b) { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return 0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75); }
function motion(b, every = 1) {
  const s = scaleOf(b), dt = 1 / 30, hold = b.hold; let v = 0, a = 0, jump = 0;
  for (let j = 0; j < b.pts.length; j += every) {
    const p = b.pts[j]; let prev = null, pv = null;
    for (let t = 0; t <= hold + 1e-9; t += dt) {
      const o = [p[0], p[1], p[2], 1]; b.live(p, j, t, o);
      if (t === 0) jump = Math.max(jump, Math.hypot(o[0] - p[0], o[1] - p[1], o[2] - p[2]));
      if (prev) { const w = [0, 1, 2].map((c) => ((o[c] - prev[c]) / dt) * s); v = Math.max(v, Math.hypot(...w)); if (pv) a = Math.max(a, Math.hypot(...w.map((x, c) => (x - pv[c]) / dt))); pv = w; }
      prev = o;
    }
  }
  return { v, a, jump };
}

test('im Konfigurator: Winter & Silvester, direkt hinter der Uhr (Steigerung), 3D und 3D+ ab 300, nachgeladen', () => {
  const o = OCCASIONS.find((x) => x.id === 'silvester'), i = o.motifs.findIndex((m) => m.id === 'countdown'), m = o.motifs[i];
  assert.ok(m, 'Countdown fehlt');
  assert.equal(o.motifs[i - 1].id, 'uhr', 'Countdown steht nicht direkt hinter der Uhr');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'countdown3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'countdownStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of ['countdown3d', 'countdownStory']) { assert.equal(typeof GROSS[b], 'function', `${b} nicht in gross/index.js`); assert.equal(hasBuilder(b), false, `${b} im gemeinsamen Szenenpaket`); }
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl, Punkte gültig, kein Sprung bei t = 0', async () => {
  for (const [name, stops] of [['countdown3d', STOPS.s3], ['countdownStory', STOPS.plus]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      if (b.groups) assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n);
      const f = frame(b, 0); assert.ok(f.every((o, j) => Math.hypot(o[0] - b.pts[j][0], o[1] - b.pts[j][1], o[2] - b.pts[j][2]) < 1e-9), `${name} ${n} Bild ${k}: Sprung bei t = 0`);
    }
  }
});

test('alle vier Zahlen (3, 2, 1, 0) landen in Reihenfolge, jede steht lesbar und ohne Klumpen', () => {
  for (const flips of [new Set(), new Set([1, 2, 3])]) for (const n of [300, 700, 1000]) {
    const m = countdownModel(n, flips), tl = timeline(m);
    assert.equal(m.digits.length, LABELS.length);
    for (let k = 1; k < LABELS.length; k++) assert.ok(tl.land[k] > tl.land[k - 1] + 0.7, `${n}: ${LABELS[k]} landet ${tl.land[k].toFixed(2)}`);
    for (let k = 0; k < LABELS.length; k++) {
      const pts = Array.from({ length: n }, (_, j) => [m.X[k][j], m.Y[k][j], m.Z[k][j] * 0.15]), digit = pts.filter((_, j) => m.ROLE[k][j] === 0);
      // die Ziffer trägt mindestens ein Fünftel der Drohnen, nimmt gut die Hälfte der Ringhöhe ein und steht im Ring
      assert.ok(digit.length >= 0.1 * n, `${n} „${LABELS[k]}“: nur ${digit.length} Drohnen in der Ziffer`);
      assert.ok(extent(digit, 1) >= 1.0 * RING, `${n} „${LABELS[k]}“: Ziffer nur ${extent(digit, 1).toFixed(2)} hoch`);
      assert.ok(digit.every((p) => Math.hypot(p[0], p[1]) < 0.95 * RING), `${n} „${LABELS[k]}“: Ziffer berührt den Ring`);
      const nn = nearest(pts), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${n} „${LABELS[k]}“: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${n} „${LABELS[k]}“: Drohnen stehen allein`);
    }
  }
});

test('keine Begegnung, auch mitten im Wechsel und beim Zerspringen (alle 0,1 s)', async () => {
  for (const name of ['countdown3d', 'countdownStory']) for (const n of [300, 1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const med = quantile(nearest(lit(frame(b, 0))), 0.5);
      for (let t = 0; t <= b.hold; t += 0.1) {
        const nn = nearest(lit(frame(b, t)));
        assert.ok(Math.min(...nn) >= 0.25 * med, `${name} ${n} Bild ${k} t ${t.toFixed(1)}: ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      }
      for (const t of [0, b.hold / 2, b.hold]) { const nn = nearest(lit(frame(b, t))), m2 = quantile(nn, 0.5); assert.ok(quantile(nn, 0.995) <= 4.5 * m2, `${name} ${n} Bild ${k} t ${t.toFixed(1)}: Einzelgänger`); }
    }
  }
});

test('Eigenbewegung in Drohnengrenzen', async () => {
  for (const [name, n] of [['countdown3d', 300], ['countdown3d', 1000], ['countdownStory', 300], ['countdownStory', 1000]]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const m = motion(b, 3);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('der Ring läuft ab wie ein Sekundenzeiger: voll bei 3, leer bei 0', async () => {
  const { beats } = await builders.countdown3d(300, ''), b = beats[0], m = countdownModel(300), tl = timeline(m);
  const ringLit = (t) => { const f = frame(b, t), on = f.filter((o, j) => m.ROLE[0][j] === 2 && o[3] > 0.6).length; return on; };
  assert.equal(ringLit(0.5), 48, 'bei 3 leuchten alle zwölf Striche (je zwei Drohnen, vorn und hinten)');
  assert.ok(ringLit(tl.land[1] + 0.05) <= 34 && ringLit(tl.land[1] + 0.05) >= 30, `bei 2 leuchten zwei Drittel (${ringLit(tl.land[1] + 0.05)})`);
  assert.equal(ringLit(tl.land[3] - 0.02), 0, 'bei 0 ist kein Strich mehr hell');
});

test('3D+: jeder Wechsel dreht die Ziffer durch die Tiefe, dann zerspringt die Null ohne Wolke', async () => {
  for (const n of [300, 1000]) {
    const { beats } = await builders.countdownStory(n, '');
    assert.equal(beats.length, 2);
    assert.deepEqual(beats.map((b) => b.groups.map((g) => [g.name, g.count, g.rigid])), [[['drohnen', n, true]], [['drohnen', n, true]]], 'dieselben Drohnen in einem starren Teil');
    assert.ok(!beats[1].cloud, 'Wolke vor dem Feuerwerk');
    assert.equal(beats[1].frame, 'feuerwerk');
    // Bild 2 beginnt genau dort, wo Bild 1 endet
    const end = frame(beats[0], beats[0].hold);
    assert.ok(beats[1].pts.every((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2]) < 1e-9), 'Feuerwerk beginnt nicht am Ende des Countdowns');
    // Drehung: mitten im Wechsel 1 → 0 steht die Ziffer auf der Kante (Tiefe der Ziffer größer als ihre Breite)
    const m = countdownModel(n, new Set([1, 2, 3])), tl = timeline(m), mid = (tl.start[3] + tl.land[3]) / 2, f = frame(beats[0], mid);
    const digit = f.filter((_, j) => m.ROLE[2][j] === 0 && m.ROLE[3][j] === 0);
    assert.ok(extent(digit, 2) > extent(digit, 0), `${n}: Ziffer dreht sich nicht durch die Tiefe (Tiefe ${extent(digit, 2).toFixed(2)}, Breite ${extent(digit, 0).toFixed(2)})`);
    // der Schirm füllt seinen Bildausschnitt: auf dem Höhepunkt mindestens 85 % der Breite
    const b = beats[1], peak = lit(frame(b, 0.4 + 1.7 + 0.5 + 1.3));
    assert.ok(extent(peak, 0) >= 0.85 * extent(b.fitPts, 0), `${n}: Schirm nur ${(extent(peak, 0) / extent(b.fitPts, 0) * 100).toFixed(0)} % breit`);
  }
});

test('Tempo: drei Sekunden Countdown, knapp (Runde 11c: von 10 war es zu lang)', async () => {
  const a = (await builders.countdown3d(300, '')).beats, b = (await builders.countdownStory(300, '')).beats;
  assert.ok(a[0].hold <= 8, `3D: ${a[0].hold.toFixed(1)} s`);
  const total = b.reduce((s, x) => s + x.hold, 0);
  assert.ok(total <= 17, `3D+: ${total.toFixed(1)} s`);
});

test('Runde 11b: lockere Linie, mehr Drohnen kaufen Teile statt Dichte', () => {
  // Abstand auf Ring und Ziffer bleibt zwischen 400 und 1000 Drohnen etwa gleich (Stand 11b: 0,046–0,072)
  const sig = (n) => countdownModel(n).sigma[0];
  for (const n of [300, 400, 500, 600, 700, 800, 900, 1000]) assert.ok(sig(n) >= 0.042 && sig(n) <= 0.095, `${n}: Abstand ${sig(n).toFixed(3)}`);
  const parts = (n) => new Set(countdownModel(n).ROLE[0]).size;
  assert.ok(parts(400) < parts(600), 'ab 600 kommt die Lünette dazu');
  const fixed = (n) => countdownModel(n).ROLE[0].filter((r) => r >= 2).length;
  assert.ok(fixed(800) > fixed(700) + 100, 'ab 800 kommt der Strahlenkranz dazu');
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['countdown3d', 1000, 160], ['countdownStory', 1000, 200]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
