// Runde 11 (große Motive): Wächter für scenes/gross/erster-tanz.js, Erster Tanz auf einem Parkettkreis (Hochzeit, 3D und 3D+
// ab 500). Genau n Drohnen bei jeder einstellbaren Zahl, keine Drohnen aufeinander und keine verstreuten Punkte (in Ruhe,
// in der Mitte und am Ende jedes Bildes), Bewegung in Drohnengrenzen, die Geschichte erzählt mit denselben Drohnen weiter
// (jedes Bild beginnt, wo das vorige endet, keine Wolke mitten im Motiv), das Paar füllt die Bühnenhöhe, das Kleid schwingt
// mit Nachlauf, mehr Drohnen bringen mehr Teile.
// Aufruf: node --test scripts/erster-tanz.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, model, level } = await import('../src/scripts/scenes/gross/erster-tanz.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');

// Runde 11c (Marc: „nicht alles in 500+ reinforcen“): Schwelle 300 in 3D und 3D+
const from500 = (art) => droneStops(art).filter((n) => n >= 300);
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) { const d = Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], p[2] - pts[j][2]); if (d < m) m = d; } return m; });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t, dark = false) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, j, t, o); return o; }).filter((o) => dark || o[3] > 0.05);
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
/** Maßstab der Bühne wie fit() in show-field.js: ein Maßstab je Motiv aus den fitPts aller Bilder. */
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

test('im Konfigurator: Hochzeit, 3D und 3D+ ab 300, direkt nach dem Antrag, nachgeladen', async () => {
  const h = OCCASIONS.find((o) => o.id === 'hochzeit'), i = h.motifs.findIndex((x) => x.id === 'erstertanz'), m = h.motifs[i];
  assert.ok(m, 'Erster Tanz fehlt in der Hochzeit');
  assert.equal(h.motifs[i - 1].id, 'antrag', 'nicht direkt nach dem Antrag');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'firstDance3d'); assert.equal(m.tiers.HORIZON.minDrones, 300);
  assert.equal(m.tiers.ODYSSEY.build, 'firstDanceStory'); assert.equal(m.tiers.ODYSSEY.minDrones, 300);
  for (const b of ['firstDance3d', 'firstDanceStory']) assert.equal((await GROSS[b]()).builders[b], builders[b]);
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl ab 300, Punkte gültig, Teile vollständig', async () => {
  for (const [name, stops] of [['firstDance3d', from500('3d')], ['firstDanceStory', from500('story')]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
    }
  }
});

// alle halbe Sekunde, nicht nur in Ruhe, Mitte und Ende: Arme, die sich heben oder senken, streifen sonst unbemerkt den
// eigenen Rumpf (Runde 11: Schultergelenke als unsichtbare Kugeln in erster-tanz.js)
test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (Ruhe, Mitte, Ende und jede halbe Sekunde jedes Bildes)', async () => {
  for (const [name, ns] of [['firstDance3d', [300, 500, 750, 1000]], ['firstDanceStory', [300, 500, 700, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const t of [...Array.from({ length: Math.floor(b.hold / 0.5) + 1 }, (_, i) => i * 0.5), b.hold]) {
      const pts = frame(b, t, true), nn = nearest(pts), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t.toFixed(1)}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t.toFixed(1)}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['firstDance3d', 300], ['firstDance3d', 1000], ['firstDanceStory', 300], ['firstDanceStory', 1000]]) {
    const { beats } = await builders[name](n, ''), s = scaleOf(beats).k;
    for (const [k, b] of beats.entries()) {
      const m = motion(b, s, n > 600 ? 3 : 2);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)} bei t = 0`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('Geschichte mit denselben Drohnen: jedes Bild beginnt, wo das vorige endet; keine Wolke mitten im Motiv', async () => {
  for (const n of [300, 1000]) {
    const { beats } = await builders.firstDanceStory(n, '');
    assert.equal(beats.length, 4);
    for (const [k, b] of beats.entries()) {
      assert.deepEqual(b.groups, beats[0].groups, `Bild ${k}: andere Teile`);
      assert.ok(!b.cloud && !b.frame, `Bild ${k}: Wolke oder eigener Bildausschnitt`);
      if (!k) continue;
      const end = frame(beats[k - 1], beats[k - 1].hold, true);
      const gap = Math.max(...b.pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(gap < 0.03, `${n}: Bild ${k} beginnt ${gap.toFixed(3)} neben dem Ende von Bild ${k - 1}`);
    }
  }
});

test('das Bild füllt die Bühne: das Paar trägt die Höhe, der Parkettkreis die Breite', async () => {
  for (const [name, n] of [['firstDance3d', 300], ['firstDance3d', 1000], ['firstDanceStory', 300], ['firstDanceStory', 1000]]) {
    const { beats } = await builders[name](n, ''), M = model(n), fit = scaleOf(beats);
    for (const [k, b] of beats.entries()) {
      const f = frame(b, b.hold * 0.5, true), couple = f.slice(0, M.nb + M.nd), floor = f.slice(M.nb + M.nd + M.nv);
      assert.ok(extent(couple, 1) >= 0.68 * fit.h, `${name} ${n} Bild ${k}: Paar nur ${(extent(couple, 1) / fit.h * 100).toFixed(0)} % der Höhe`);
      assert.ok(extent(floor, 0) >= 0.85 * fit.w, `${name} ${n} Bild ${k}: Parkett nur ${(extent(floor, 0) / fit.w * 100).toFixed(0)} % der Breite`);
    }
    // die Bühne ist breit: das Motiv nutzt mindestens 55 % der Breite, die seine Höhe zuließe
    assert.ok(fit.w / fit.h >= 0.55 * (1.15 / 0.75), `${name} ${n}: Seitenverhältnis ${(fit.w / fit.h).toFixed(2)}`);
  }
});

test('das Kleid schwingt mit Nachlauf: weiter Saum in der Drehung, nach dem Anhalten legt er sich erst später', async () => {
  for (const n of [300, 1000]) {
    const { beats } = await builders.firstDance3d(n, ''), b = beats[0], M = model(n);
    // Weite des Saums: größter Abstand einer Saumdrohne von der Achse des Kleides (Mittel der Taillendrohnen)
    const hemWidth = (t) => {
      const f = frame(b, t, true), dress = f.slice(M.nb, M.nb + M.nd), waist = dress.filter((_, i) => M.dress[i][2] === 0), hem = dress.filter((_, i) => M.dress[i][2] === 1);
      const c = [0, 2].map((k) => waist.reduce((s, p) => s + p[k], 0) / waist.length);
      return Math.max(...hem.map((p) => Math.hypot(p[0] - c[0], p[2] - c[1])));
    };
    const rest = hemWidth(0), spin = hemWidth(5), stop = hemWidth(9.4), still = hemWidth(b.hold);
    assert.ok(spin > rest * 1.35, `${n}: Saum in der Drehung ${spin.toFixed(2)} gegen Ruhe ${rest.toFixed(2)}`);
    assert.ok(stop > rest * 1.12, `${n}: kein Nachlauf (beim Anhalten ${stop.toFixed(2)}, Ruhe ${rest.toFixed(2)})`);
    assert.ok(still < stop, `${n}: der Saum legt sich nicht (${stop.toFixed(2)} → ${still.toFixed(2)})`);
  }
});

test('mehr Drohnen bringen mehr Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([500, 690, 700, 890, 900, 1000].map(level), [0, 0, 1, 1, 2, 2]);
  assert.equal(model(500).nv, 0); assert.ok(model(700).nv >= 30, 'Schleier ab 700');
  assert.ok(model(700).tags.includes('m.frack') && !model(500).tags.includes('m.frack'), 'Frack ab 700');
  assert.ok(model(1000).floor.kind.includes('intarsie') && !model(700).floor.kind.includes('intarsie'), 'Intarsie ab 900');
  const med = (n) => quantile(nearest(model(n).body.map((p) => p.slice(0, 3))), 0.5);
  assert.ok(med(1000) >= 0.5 * med(500), `Körper: Abstand ${med(500).toFixed(3)} → ${med(1000).toFixed(3)}`);
});

test('Aufbau schnell genug für den Anlasswechsel (erster Aufbau einer neuen Zahl)', async () => {
  for (const [name, n, ms] of [['firstDance3d', 550, 300], ['firstDanceStory', 950, 700]]) {
    const t0 = performance.now(); await builders[name](n, ''); const dt = performance.now() - t0;
    assert.ok(dt < ms, `${name} ${n}: ${dt.toFixed(1)} ms`);
  }
});
