// Runde 11b (große Motive): Wächter für scenes/gross/pralinen.js, die geöffnete Pralinenschachtel (Hochzeit, 3D und 3D+ ab
// 600, Kandidat FSK-074). Genau n Drohnen bei jeder einstellbaren Zahl, keine Drohnen aufeinander und keine verstreuten
// Punkte (jede halbe Sekunde jedes Bildes), Bewegung in Drohnengrenzen, die Geschichte erzählt mit denselben Drohnen weiter,
// das Bild füllt die Bühne, jede Praline ist als eigene Form unterscheidbar, mehr Drohnen bringen mehr Pralinen und Teile.
// Aufruf: node --test scripts/pralinen.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, model, level } = await import('../src/scripts/scenes/gross/pralinen.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');

const from400 = (art) => droneStops(art).filter((n) => n >= 400);
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) { const d = Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], p[2] - pts[j][2]); if (d < m) m = d; } return m; });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t, dark = false) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, j, t, o); return o; }).filter((o) => dark || o[3] > 0.05);
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
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

test('im Konfigurator: Hochzeit, 3D und 3D+ ab 400 (Runde 11c, vorher 600), nachgeladen', async () => {
  const h = OCCASIONS.find((o) => o.id === 'hochzeit'), m = h.motifs.find((x) => x.id === 'pralinen');
  assert.ok(m, 'Pralinenschachtel fehlt in der Hochzeit');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'pralinen3d'); assert.equal(m.tiers.HORIZON.minDrones, 400);
  assert.equal(m.tiers.ODYSSEY.build, 'pralinenStory'); assert.equal(m.tiers.ODYSSEY.minDrones, 400);
  for (const b of ['pralinen3d', 'pralinenStory']) assert.equal((await GROSS[b]()).builders[b], builders[b]);
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl ab 400, Punkte gültig, Teile vollständig', async () => {
  for (const [name, stops] of [['pralinen3d', from400('3d')], ['pralinenStory', from400('story')]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
    }
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (jede halbe Sekunde jedes Bildes)', async () => {
  for (const [name, ns] of [['pralinen3d', [400, 550, 800, 1000]], ['pralinenStory', [400, 500, 800, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const t of [...Array.from({ length: Math.floor(b.hold / 0.5) + 1 }, (_, i) => i * 0.5), b.hold]) {
      const pts = frame(b, t, true), nn = nearest(pts), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t.toFixed(1)}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t.toFixed(1)}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['pralinen3d', 400], ['pralinen3d', 1000], ['pralinenStory', 400], ['pralinenStory', 1000]]) {
    const { beats } = await builders[name](n, ''), s = scaleOf(beats).k * Math.min(1, Math.sqrt(n / 300));
    for (const [k, b] of beats.entries()) {
      const m = motion(b, s, 2);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)} bei t = 0`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('Geschichte mit denselben Drohnen: jedes Bild beginnt, wo das vorige endet; keine Wolke mitten im Motiv', async () => {
  for (const n of [400, 1000]) {
    const { beats } = await builders.pralinenStory(n, '');
    assert.equal(beats.length, 4);
    for (const [k, b] of beats.entries()) {
      assert.deepEqual(b.groups, beats[0].groups, `Bild ${k}: andere Teile`);
      assert.ok(b.groups.every((g) => g.rigid), `Bild ${k}: Teile nicht starr`);
      assert.ok(!b.cloud && !b.frame, `Bild ${k}: Wolke oder eigener Bildausschnitt`);
      if (!k) continue;
      const end = frame(beats[k - 1], beats[k - 1].hold, true);
      const gap = Math.max(...b.pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(gap < 0.03, `${n}: Bild ${k} beginnt ${gap.toFixed(3)} neben dem Ende von Bild ${k - 1}`);
    }
  }
});

test('das Bild füllt die Bühne: breit, Schachtel und Deckel nebeneinander; im Höhepunkt liegen die Pralinen im Deckelherz', async () => {
  for (const [name, n] of [['pralinen3d', 400], ['pralinen3d', 1000], ['pralinenStory', 400], ['pralinenStory', 1000]]) {
    const { beats } = await builders[name](n, ''), fit = scaleOf(beats);
    assert.ok(fit.w / fit.h >= 0.7 * (1.15 / 0.75), `${name} ${n}: Seitenverhältnis ${(fit.w / fit.h).toFixed(2)}`);
    const b = beats[beats.length - 1], f = frame(b, b.hold, true);
    assert.ok(extent(f, 0) >= 0.85 * fit.w && extent(f, 1) >= 0.8 * fit.h, `${name} ${n}: das letzte Bild füllt den Ausschnitt nicht`);
  }
  // Höhepunkt: am Ende liegen alle Pralinen im Rechteck um den Deckel (sie schweben ein Stück vor ihm, in der Ansicht von
  // oben rücken sie dadurch etwas nach unten: 0,15 Spielraum)
  for (const n of [400, 1000]) {
    const M = model(n), { beats } = await builders.pralinenStory(n, ''), b = beats[3], f = frame(b, b.hold, true), P0 = M.nb + M.nl + M.nc;
    const lid = f.slice(M.nb, M.nb + M.nl), pr = f.slice(P0), lo = (k) => Math.min(...lid.map((p) => p[k])), hi = (k) => Math.max(...lid.map((p) => p[k]));
    const out = pr.filter((p) => p[0] < lo(0) - 0.15 || p[0] > hi(0) + 0.15 || p[1] < lo(1) - 0.15 || p[1] > hi(1) + 0.15);
    assert.equal(out.length, 0, `${n}: ${out.length} Pralinendrohnen außerhalb des Deckels`);
  }
});

test('unterscheidbar: vier Pralinenformen, jede Praline eine eigene Form mit genug Drohnen, Fächer dazu', () => {
  for (const n of [400, 600, 800, 1000]) {
    const M = model(n), per = new Map();
    M.owner.forEach((o) => { if (o >= 0) per.set(o, (per.get(o) ?? 0) + 1); });
    assert.equal(per.size, M.prl.length, `${n}: Pralinen ohne Drohnen`);
    assert.ok(Math.min(...per.values()) >= 8, `${n}: eine Praline hat nur ${Math.min(...per.values())} Drohnen`);
    assert.deepEqual([...new Set(M.prl.map((p) => p.kind))].sort(), ['herz', 'kegel', 'trueffel', 'wuerfel'], `${n}: Formen`);
    assert.ok(M.nc >= 6 * M.prl.length, `${n}: Fächer zu dünn (${M.nc} Drohnen für ${M.prl.length} Fächer)`);
  }
});

test('mehr Drohnen bringen mehr Pralinen und Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([600, 749, 750, 899, 900, 1000].map(level), [0, 0, 1, 1, 2, 2]);
  const count = (n) => model(n).prl.length;
  assert.ok(count(400) >= 10 && count(400) < count(600) && count(600) < count(800) && count(800) < count(1000), `Pralinen ${[400, 600, 800, 1000].map(count).join(' / ')}`);
  const med = (n) => { const M = model(n); return quantile(nearest(M.pts.slice(0, M.nb)), 0.5); };
  // ab der früheren Schwelle 600 (darunter trägt die Schachtel weniger Drohnen, ihre Linien sind lockerer)
  assert.ok(med(1000) >= 0.5 * med(600), `Schachtel: Abstand ${med(600).toFixed(3)} → ${med(1000).toFixed(3)}`);
});

test('Aufbau schnell genug für den Anlasswechsel (erster Aufbau einer neuen Zahl)', async () => {
  for (const [name, n, ms] of [['pralinen3d', 650, 300], ['pralinenStory', 1000, 500]]) {
    const t0 = performance.now(); await builders[name](n, ''); const dt = performance.now() - t0;
    assert.ok(dt < ms, `${name} ${n}: ${dt.toFixed(1)} ms`);
  }
});
