// Runde 10b (Marc 20.11.2026: „der ganze Drachenflug sieht sehr scheiße aus … im Vergleich mit den Delfinen sieht der
// Drache mega krass 2D aus“), Runde 11 („Bei den ganzen Drachenmotiven … musst du dir echt mal mehr Mühe machen“: Kopf bei
// 300 zu dicht und fischartig, Sonnenscheibe und Drachenflug raus). Wächter für scenes/catalog-3d/drache.js: aufsteigender
// Drache (3D ab 200; Runde 11b neu als östlicher Drache in Windungen, Marc 21.11.: „3D Drache ist noch mega whack“) und Drachenkopf (3D+ 300–1000; Runde 11b: eine Silhouette statt Parallelstrichen, füllt die Bühne,
// Feuerstoß als Höhepunkt mit eigenem Bildausschnitt). Genau n Drohnen bei jeder einstellbaren Zahl, keine Klumpen, keine
// verstreuten Punkte, Bewegung in Drohnengrenzen, räumlich statt flach, Lesbarkeit (die Zeichen eines Drachen, wenige
// Linien bei 300, kein zweites Auge wie eine Brille, der Kopf füllt das Bild, die Flamme den halben Himmel), Übergang ohne
// Wolke mit denselben Drohnen, mehr Teile bei mehr Drohnen.
// Aufruf: node --test scripts/drache.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { BUILDERS } = await import('../src/scripts/scenes/index.js');
const { builders, riseModel, risePoseAt, headModel, headLevel, headLineCount } = await import('../src/scripts/scenes/catalog-3d/drache.js');
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

test('im Konfigurator: 3D ab 200 aufsteigend, 3D+ ab 300 der Kopf, kein Drachenflug (Marc 20.11.: „sieht mega weird aus“)', () => {
  const fest = OCCASIONS.find((o) => o.id === 'festival'), m = fest.motifs.find((x) => x.id === 'drache');
  assert.equal(m.tiers.HORIZON.build, 'dragonRise'); assert.equal(m.tiers.HORIZON.minDrones, 200);
  assert.equal(m.tiers.ODYSSEY.build, 'dragonHead'); assert.equal(m.tiers.ODYSSEY.minDrones, 300);
  assert.ok(!fest.motifs.some((x) => x.id === 'drachenflug'), 'Drachenflug ist wieder in der Liste');
  for (const b of ['dragonRise', 'dragonHead']) assert.equal(BUILDERS[b], builders[b], `${b} nicht in scenes/index.js`);
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl, Punkte gültig', async () => {
  for (const [name, stops] of [['dragonRise', STOPS.rise], ['dragonHead', STOPS.plus]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      if (b.groups) assert.equal(b.groups.reduce((s, g) => s + g.count, 0), b.pts.length, `${name} ${n}: Teile`);
    }
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (Ruhelage und in Bewegung)', async () => {
  for (const [name, ns] of [['dragonRise', [200, 400, 700, 1000]], ['dragonHead', [300, 400, 500, 700, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const t of [0, (b.hold ?? 6) / 2, b.hold ?? 6]) {
      const pts = frame(b, t), nn = nearest(pts), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['dragonRise', 200], ['dragonRise', 500], ['dragonRise', 1000], ['dragonHead', 300], ['dragonHead', 1000]]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const m = motion(b, n, n > 500 ? 3 : 1);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)} bei t = 0`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('räumlich, nicht flach: Rumpf und Schwanz schwingen in die Tiefe, Flügel gepfeilt, Kopf mit Seitenkonturen', async () => {
  // aufsteigender Drache: die Windungen liegen im Raum (Tiefe/Breite des Körpers mindestens 0,5; Stand 11b: 0,6–0,7) und
  // drehen sich, der Kopf hat Seitenkonturen (Augen, Brauen, Zähne, Hörner beidseits)
  for (const n of [200, 500, 1000]) for (const t of [0, 5, 10]) {
    const m = riseModel(n), p = risePoseAt(n, t), body = p.filter((_, j) => m.slots[j].kind === 'body');
    assert.ok(extent(body, 2) / extent(body, 0) >= 0.5, `Drache ${n} t ${t}: Windungen flach (${(extent(body, 2) / extent(body, 0)).toFixed(2)})`);
    const head = m.slots.filter((q) => q.kind === 'head'), off = head.filter((q) => Math.abs(q.p[2]) > 0.03).length / head.length;
    assert.ok(off >= 0.3, `Drache ${n}: Kopf nur ${(off * 100).toFixed(0)} % abseits der Mittelebene`);
  }
  for (const n of [300, 500, 1000]) {
    const h = headModel(n), pts = h.pts.slice(0, h.B), w = extent(pts, 0), off = pts.filter((p) => Math.abs(p[2]) > 0.1 * w).length / pts.length;
    assert.ok(off >= 0.3, `Kopf ${n}: nur ${(off * 100).toFixed(0)} % abseits der Mittelebene (Hörner, Augen, Brauen, Zähne, Barteln)`);
  }
  // die Drehung zum Publikum zeigt die Tiefe: die Hörner laufen auseinander (Stand 11b bei 300: Abstand der Hornspitzen in x 0,51 → 0,75)
  const { beats } = await builders.dragonHead(300, ''), h = headModel(300), b = beats[1];
  const tips = (t) => { const xs = []; b.pts.forEach((p, j) => { if (h.tags[j] === 'horn' && h.pts[j][0] > 0.7) { const o = [p[0], p[1], p[2], 1]; b.live(p, j, t, o); xs.push(o[0]); } }); return extent(xs.map((x) => [x]), 0); };
  assert.ok(tips(b.hold) > 1.3 * tips(0), `Hornspitzen: ${tips(0).toFixed(2)} → ${tips(b.hold).toFixed(2)} beim Drehen`);
});

test('lesbar: die Zeichen eines Drachen, wenige Linien bei 300, kein zweites Auge wie eine Brille, der Kopf füllt das Bild', async () => {
  for (const n of [300, 500, 1000]) {
    const h = headModel(n), count = (...t) => h.tags.filter((x) => t.includes(x)).length;
    // Hörner, Fangzähne, Auge mit Braue, Nüster, Mähne und Barteln tragen je eigene Drohnen (ohne sie ist es kein Drachenkopf)
    for (const [t, min] of [[['horn'], 40], [['zahn', 'kieferzahn'], 8], [['auge', 'pupille'], 10], [['braue'], 8], [['nuester'], 4], [['maehne'], 30], [['barteln'], 20]]) assert.ok(count(...t) >= min, `Kopf ${n}: ${t.join('/')} hat nur ${count(...t)} Drohnen`);
    // keine Sonnenscheibe, keine Voluten mehr (Marc 20.11.: Sonne raus; Runde 11b: Drohnen gehören in den Kopf, nicht in Beiwerk)
    assert.equal(count('sonne', 'atem'), 0, `Kopf ${n}: Sonne oder Voluten`);
    // Kopf und Feuer: wie viele Drohnen tragen später das Feuer (Mähne und Barteln), mindestens ein Viertel
    assert.ok(h.F >= 0.25 * n && h.F + h.B === n, `Kopf ${n}: ${h.F} Feuerdrohnen`);
  }
  // wenige Linien: bei 300 eine Silhouette und höchstens gut 20 Linien und Merkmale (Runde 11 waren es bei 300 über 40),
  // mit mehr Drohnen kommen prägnante Teile dazu
  assert.ok(headLineCount(300) <= 24, `Kopf 300: ${headLineCount(300)} Linien`);
  // der Kopf (ohne Mähne und Barteln) füllt in den ersten drei Akten das Bild: mindestens 75 % von Breite und Höhe des
  // Ausschnitts (Stand 11b: 80–86 %; Runde 11 waren es etwa 40 %, weil Voluten und Sonne das Bild weiteten); im Feuerakt
  // nimmt die Flamme mindestens 40 % der Breite ein, den halben Himmel (Stand 11b: 45–56 %)
  for (const n of [300, 1000]) {
    const { beats } = await builders.dragonHead(n, ''), B = headModel(n).B, f0 = frame(beats[0], beats[0].hold), f3 = frame(beats[3], 4.2);
    assert.ok(extent(f0.slice(0, B), 0) >= 0.75 * extent(beats[0].fitPts, 0) && extent(f0.slice(0, B), 1) >= 0.75 * extent(beats[0].fitPts, 1), `Kopf ${n}: füllt das Bild nicht`);
    assert.ok(extent(f3.slice(B), 0) >= 0.4 * extent(beats[3].fitPts, 0), `Kopf ${n}: Flamme nur ${(extent(f3.slice(B), 0) / extent(beats[3].fitPts, 0) * 100).toFixed(0)} % der Breite`);
  }
  // nach der Drehung leuchtet das ferne Auge höchstens ein Drittel so hell wie das nahe
  const { beats } = await builders.dragonHead(300, ''), h = headModel(300), b = beats[1];
  const eye = (sgn) => { const l = []; b.pts.forEach((p, j) => { if ((h.tags[j] === 'auge' || h.tags[j] === 'pupille') && Math.sign(h.pts[j][2]) === sgn) { const o = [p[0], p[1], p[2], 1]; b.live(p, j, b.hold, o); l.push(o[3]); } }); return l.reduce((s, a) => s + a, 0) / l.length; };
  assert.ok(eye(-1) <= eye(1) / 3, `ferne Augen ${eye(-1).toFixed(2)} gegen nahe ${eye(1).toFixed(2)}`);
  // aufsteigender Drache: der Kopf ist groß genug, um ihn zu lesen (mindestens 40 Drohnen, mindestens 30 % der Breite;
  // Runde 11b, Iteration 1 war er ein Knubbel oben auf der Spirale), er steht frei über den Windungen
  for (const n of [200, 500, 1000]) for (const t of [0, 7]) {
    const m = riseModel(n), p = risePoseAt(n, t), head = p.filter((_, j) => m.slots[j].kind === 'head'), body = p.filter((_, j) => m.slots[j].kind === 'body' && m.slots[j].s > 0.2);
    assert.ok(head.length >= 40 && extent(head, 0) >= 0.3 * extent(p, 0), `Drache ${n} t ${t}: Kopf ${head.length} Drohnen, ${(extent(head, 0) / extent(p, 0) * 100).toFixed(0)} % der Breite`);
    assert.ok(Math.min(...head.map((q) => q[1])) > Math.max(...body.map((q) => q[1])) - 0.05, `Drache ${n} t ${t}: Kopf liegt in den Windungen`);
  }
});

test('Übergang mit Bezug statt Wolke: Mähne und Barteln werden zum Feuer, die Kamera zieht nur für den Feuerstoß zurück', async () => {
  for (const n of [300, 1000]) {
    const { beats } = await builders.dragonHead(n, ''), h = headModel(n);
    assert.equal(beats[0].cloud, true, 'der Kopf kommt wie bisher aus der Wolke (Wolkenplan des Anlasses)');
    for (const [k, b] of beats.entries()) {
      assert.deepEqual(b.groups.map((g) => [g.name, g.count, g.rigid]), [['kopf', h.B, true], ['feuer', h.F, false]], `Bild ${k}: Teile`);
      if (k) assert.ok(!b.cloud, `Bild ${k}: Wolke mitten im Motiv`);
    }
    assert.deepEqual(beats.map((b) => b.frame ?? null), [null, null, null, 'feuer'], 'eigener Bildausschnitt nur für den Feuerstoß');
    // die Feuerdrohnen sind in den ersten Akten Mähne und Barteln
    assert.ok(h.tags.slice(h.B).every((t) => t === 'maehne' || t === 'barteln'), 'Feuerdrohnen sind nicht Mähne und Barteln');
    // der Feuerstoß beginnt als enger Strahl am Maul und bläht sich auf: Breite quer zum Strahl zuerst klein, dann groß
    const f = beats[3], B = h.B, spread = (t) => { const q = frame({ ...f, pts: f.pts.slice(B), live: (p, j, tt, o) => f.live(p, j + B, tt, o) }, t); return extent(q, 1); };
    assert.ok(spread(0) < 0.4 * spread(3.2), `${n}: Strahl ${spread(0).toFixed(2)} → Flamme ${spread(3.2).toFixed(2)}`);
  }
});

test('mehr Drohnen bringen mehr Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([300, 399, 400, 699, 700, 1000].map(headLevel), [0, 0, 1, 1, 2, 2]);
  // aufsteigender Drache: ab 400 Beine, Barteln, Bauchschuppen und Perle, ab 700 vier Beine und mehr Mähne
  const kinds = (n) => { const c = {}; for (const q of riseModel(n).slots) c[q.kind] = (c[q.kind] ?? 0) + 1; return c; };
  const legs = (n) => new Set(riseModel(n).slots.filter((q) => q.kind === 'leg').map((q) => q.g)).size, strands = (n) => new Set(riseModel(n).slots.filter((q) => q.kind === 'mane').map((q) => q.g)).size;
  assert.deepEqual([200, 400, 700].map(legs), [0, 2, 4]); assert.deepEqual([200, 400, 700].map(strands), [2, 4, 6]);
  for (const k of ['whisk', 'scale', 'pearl']) assert.ok(!kinds(200)[k] && kinds(400)[k] > 0, `Drache: ${k}`);
  assert.ok(headLineCount(300) < headLineCount(500) && headLineCount(500) < headLineCount(1000), `Kopf: Linien ${[300, 500, 1000].map(headLineCount).join(' / ')}`);
  // die Linien werden nicht beliebig dicht: Medianabstand bei 1000 mindestens 40 % dessen bei 300
  const med = (n) => { const h = headModel(n); return quantile(nearest(h.pts.slice(0, h.B)), 0.5); };
  assert.ok(med(1000) >= 0.4 * med(300), `Kopf: Abstand ${med(300).toFixed(3)} → ${med(1000).toFixed(3)}`);
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['dragonRise', 290, 60], ['dragonRise', 1000, 120], ['dragonHead', 300, 80], ['dragonHead', 1000, 250]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
