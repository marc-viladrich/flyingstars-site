// Runde 10b (Marc 20.11.2026: „der ganze Drachenflug sieht sehr scheiße aus … im Vergleich mit den Delfinen sieht der
// Drache mega krass 2D aus“). Wächter für scenes/catalog-3d/drache.js: aufsteigender Drache (3D 200–290, als Drachenflug in
// 3D+ ab 400) und Azteken-Kopf (3D+ 300–1000). Genau n Drohnen bei jeder einstellbaren Zahl, keine Klumpen, keine
// verstreuten Punkte, Bewegung in Drohnengrenzen, ein Tiefenmaß (damit der Drache nie wieder flach wird), mehr Teile bei
// mehr Drohnen, schneller Aufbau.
// Aufruf: node --test scripts/drache.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { BUILDERS } = await import('../src/scripts/scenes/index.js');
const { builders, riseModel, headModel, headLevel, RISE_MAX } = await import('../src/scripts/scenes/catalog-3d/drache.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');

const STOPS = { rise: droneStops('3d'), plus: droneStops('story') };
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], (p[2] || 0) - (pts[j][2] || 0))); return m; });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
/** Lage aller Drohnen eines Bildes zur Zeit t (Lichter unter 0,05 zählen als dunkel und fehlen). */
const frame = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, j, t, o); return o; }).filter((o) => o[3] > 0.05);
/** Maßstab der Bühne wie fit() in show-field.js (LIMITS gelten in Anzeigeeinheiten). */
function scaleOf(b, n) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return (0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75)) * Math.min(1, Math.sqrt(n / 300));
}
function motion(b, n, every = 1) {
  const s = scaleOf(b, n), dt = 1 / 30, hold = b.hold ?? 6; let v = 0, a = 0, jump = 0;
  for (let j = 0; j < b.pts.length; j += every) {
    const p = b.pts[j]; let prev = null, pv = null;
    for (let t = 0; t <= hold; t += dt) {
      const o = [p[0], p[1], p[2] || 0, 1]; b.live(p, j, t, o);
      if (t === 0) jump = Math.max(jump, Math.hypot(o[0] - p[0], o[1] - p[1], o[2] - (p[2] || 0)));
      if (prev) { const w = [0, 1, 2].map((c) => ((o[c] - prev[c]) / dt) * s); v = Math.max(v, Math.hypot(...w)); if (pv) a = Math.max(a, Math.hypot(...w.map((x, c) => (x - pv[c]) / dt))); pv = w; }
      prev = o;
    }
  }
  return { v, a, jump };
}
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));

test('im Konfigurator: 3D ab 200 aufsteigend, 3D+ ab 300 der Kopf, ab 400 zusätzlich der Drachenflug', () => {
  const fest = OCCASIONS.find((o) => o.id === 'festival'), m = fest.motifs.find((x) => x.id === 'drache'), flug = fest.motifs.find((x) => x.id === 'drachenflug');
  assert.equal(m.tiers.HORIZON.build, 'dragonRise'); assert.equal(m.tiers.HORIZON.minDrones, 200);
  assert.equal(m.tiers.ODYSSEY.build, 'dragonHead'); assert.equal(m.tiers.ODYSSEY.minDrones, 300);
  assert.deepEqual(Object.keys(flug.tiers), ['ODYSSEY']); assert.equal(flug.tiers.ODYSSEY.build, 'dragonRise'); assert.equal(flug.tiers.ODYSSEY.minDrones, 400);
  for (const b of ['dragonRise', 'dragonHead']) assert.equal(BUILDERS[b], builders[b], `${b} nicht in scenes/index.js`);
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl, Punkte gültig', async () => {
  for (const [name, stops] of [['dragonRise', [...STOPS.rise, 400, 700, 1000]], ['dragonHead', STOPS.plus]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length + (b.offstageDrones ?? 0), n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      if (b.groups) assert.equal(b.groups.reduce((s, g) => s + g.count, 0), b.pts.length, `${name} ${n}: Teile`);
    }
    if (name === 'dragonRise') assert.equal(beats[0].pts.length, Math.min(n, RISE_MAX), `${name} ${n}: Drohnen im Körper`);
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (Ruhelage und in Bewegung)', async () => {
  for (const [name, ns] of [['dragonRise', [200, 250, 290, 400, 1000]], ['dragonHead', [300, 400, 500, 700, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const t of [0, (b.hold ?? 6) / 2, b.hold ?? 6]) {
      const pts = frame(b, t), nn = nearest(pts), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['dragonRise', 200], ['dragonRise', 290], ['dragonRise', 1000], ['dragonHead', 300], ['dragonHead', 1000]]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const m = motion(b, n, n > 500 ? 3 : 1);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)} bei t = 0`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('räumlich, nicht flach: Rumpf mit Querschnitt, Flügel in die Tiefe gepfeilt, Kopf mit Seitenflächen', async () => {
  // Ein bloßes Tiefenmaß (z-Ausdehnung / Breite) reicht nicht: die alte Fassung (scenes/festival.js dragon3d) kam auf 0,52,
  // weil sie flache Flügel schräg stellt; ihr Rumpf sind zwei Stränge in EINER Ebene (Anteil vorn/hinten nach Bauart 0).
  // Gemessen wird darum, was den Körper räumlich macht (Ruhelage im eigenen Rahmen, Stand Runde 10b: Rumpf 38–50 %,
  // Flügel 0,47, Kopf 47–62 %).
  for (const n of [200, 250, 290, 400, 1000]) {
    const m = riseModel(n), body = m.pts.filter((_, j) => m.tags[j] === 'body');
    // Anteil der Rumpfdrohnen, die vor oder hinter dem Rückgrat stehen (Kammlinie, Reifen), nicht nur seitlich daneben
    const front = body.filter((p) => { let best = Infinity, q = null; for (const s of m.spine) { const d = Math.hypot(p[0] - s[0], p[1] - s[1], p[2] - s[2]); if (d < best) { best = d; q = s; } } return Math.abs(p[2] - q[2]) > 0.5 * best; }).length / body.length;
    const wing = m.pts.filter((_, j) => m.tags[j] === 'wingR' || m.tags[j] === 'boneR'), sweep = extent(wing, 2) / extent(wing, 0);
    assert.ok(front >= 0.3, `Drache ${n}: nur ${(front * 100).toFixed(0)} % des Rumpfs vor/hinter dem Rückgrat`);
    assert.ok(sweep >= 0.35, `Drache ${n}: Flügel Tiefe/Spannweite ${sweep.toFixed(2)}`);
  }
  for (const n of [300, 500, 1000]) {
    const h = headModel(n), pts = h.pts.slice(0, h.B), w = extent(pts, 0), off = pts.filter((p) => Math.abs(p[2]) > 0.1 * w).length / pts.length;
    assert.ok(off >= 0.35, `Kopf ${n}: nur ${(off * 100).toFixed(0)} % abseits der Mittelebene`);
  }
  // die Drehung zum Publikum zeigt die Tiefe: die Breite des Kopfes ändert sich sichtbar im zweiten Akt
  // (Oberkopf und Kiefer ohne Federn; Stand Runde 10b bei 300: 1,46 → 1,19)
  const { beats } = await builders.dragonHead(300, ''), tags = headModel(300).tags, B = beats[1].groups[0].count;
  const head = { ...beats[1], pts: beats[1].pts.slice(0, B), live: (p, j, t, o) => { beats[1].live(p, j, t, o); if (tags[j] !== 'kopf' && tags[j] !== 'kiefer') o[3] = 0; } };
  const w0 = extent(frame(head, 0), 0), w1 = extent(frame(head, beats[1].hold), 0);
  assert.ok((w0 - w1) / w0 > 0.12, `Kopf: Breite ${w0.toFixed(2)} → ${w1.toFixed(2)} beim Drehen`);
});

test('mehr Drohnen bringen mehr Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([300, 399, 400, 699, 700, 1000].map(headLevel), [0, 0, 1, 1, 2, 2]);
  const parts = (n) => new Set(headModel(n).tags).size, riseParts = (n) => new Set(riseModel(n).tags).size;
  assert.ok(parts(300) < parts(500) && parts(500) < parts(1000), `Kopf: Teile ${[300, 500, 1000].map(parts).join(' / ')}`);
  assert.ok(riseParts(200) < riseParts(400), `Drache: Teile ${riseParts(200)} / ${riseParts(400)}`);
  // die Linien werden nicht beliebig dicht: Medianabstand bei 1000 mindestens 45 % dessen bei 300
  const med = (n) => { const h = headModel(n); return quantile(nearest(h.pts.slice(0, h.B)), 0.5); };
  assert.ok(med(1000) >= 0.45 * med(300), `Kopf: Abstand ${med(300).toFixed(3)} → ${med(1000).toFixed(3)}`);
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['dragonRise', 290, 60], ['dragonHead', 300, 80], ['dragonHead', 1000, 250]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
