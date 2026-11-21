// Runde 11b (große Motive): Wächter für scenes/gross/firmensitz.js, den Firmensitz im Jubiläum (3D und 3D+ ab 700).
// Genau n Drohnen bei jeder einstellbaren Zahl, keine Klumpen, keine verstreuten Punkte (die Säulen und Fenster stehen,
// solange sie dunkel sind, neben den Ringen), Bewegung in Drohnengrenzen, Bilder schließen aneinander an, das Haus wächst
// Etage für Etage nur nach oben, die Fenster folgen einen Takt später, der Kran wird zur Leuchtschrift, mehr Drohnen
// machen das Haus höher.
// Aufruf: node --test scripts/firmensitz.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, hqModel, hqLevel, timeline, FLOORS, Y0, FH } = await import('../src/scripts/scenes/gross/firmensitz.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { BUILDERS } = await import('../src/scripts/scenes/index.js');

const MIN = 700, STOPS = { s3: droneStops('3d').filter((n) => n >= MIN), plus: droneStops('story').filter((n) => n >= MIN) };
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

test('im Konfigurator: Jubiläum, direkt hinter dem LKW, 3D und 3D+ ab 700, nachgeladen', () => {
  const jub = OCCASIONS.find((o) => o.id === 'jubilaeum'), i = jub.motifs.findIndex((m) => m.id === 'firmensitz'), m = jub.motifs[i];
  assert.ok(m, 'Firmensitz fehlt im Jubiläum');
  assert.equal(jub.motifs[i - 1].id, 'lkw', 'Firmensitz steht nicht direkt hinter dem LKW');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'headquarters3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'headquartersStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of ['headquarters3d', 'headquartersStory']) { assert.equal(typeof GROSS[b], 'function', `${b} nicht in gross/index.js`); assert.equal(BUILDERS[b], undefined, `${b} im gemeinsamen Szenenpaket`); }
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl, Punkte und Teile gültig', async () => {
  for (const [name, stops] of [['headquarters3d', STOPS.s3], ['headquartersStory', STOPS.plus]]) for (const n of stops) {
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
  for (const name of ['headquarters3d', 'headquartersStory']) for (const n of [700, 850, 1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      const t = f * (b.hold ?? 6), nn = nearest(frame(b, t)), med = quantile(nn, 0.5);
      assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
      assert.ok(quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn, 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['headquarters3d', 700], ['headquarters3d', 1000], ['headquartersStory', 700], ['headquartersStory', 1000]]) {
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
  for (const n of [700, 1000]) {
    const { beats } = await builders.headquartersStory(n, '');
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), d = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(d < 1e-6, `${n}: Bild ${k} beginnt ${d.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
    }
  }
});

test('Etage für Etage: jeder Ring steigt nur nach oben und erreicht seine Etage, die Fenster folgen, der Kran wird zur Schrift', async () => {
  for (const n of [700, 1000]) {
    const m = hqModel(n), tl = timeline(m.N), { beats } = await builders.headquartersStory(n, '');
    // in Weltkoordinaten (ohne Bühnenschwenk): über die Zeitachse abtasten
    const T = (k, t) => ({ b: beats[k], t }), at = (T0) => { const k = tl.ACT.findIndex((a, i) => T0 >= a && T0 <= tl.ACT[i + 1]); return frame(beats[k], T0 - tl.ACT[k]); };
    const rings = m.ring.map((r, j) => [r, j]).filter(([r]) => r);
    let prev = at(0);
    for (let T0 = 0.25; T0 <= tl.ACT[2]; T0 += 0.25) {
      const cur = at(T0);
      for (const [, j] of rings) assert.ok(cur[j][1] >= prev[j][1] - 0.02, `${n}: Ring sinkt bei ${T0.toFixed(2)} s`); // der Bühnenschwenk verschiebt y kaum
      prev = cur;
    }
    void T;
    // nach dem Wachsen: Ring k steht auf Etage k (relativer Abstand zum Fundament, ohne Ansicht: Verhältnis der Höhen)
    const end = at(tl.ACT[2]), yOf = (k) => { const q = rings.filter(([r]) => r === k).map(([, j]) => end[j][1]); return q.reduce((a, b) => a + b, 0) / q.length; };
    const steps = Array.from({ length: m.N - 1 }, (_, k) => yOf(k + 2) - yOf(k + 1));
    assert.ok(Math.max(...steps) - Math.min(...steps) < 0.01, `${n}: Etagen ungleich hoch (${steps.map((s) => s.toFixed(3)).join(' ')})`);
    // Fenster: das Fenster der untersten Etage geht später an als die Etage steht (einen Takt)
    const win = m.tags.map((t, j) => [t, j]).filter(([t, j]) => t === 'fenster' && m.pts[j][1] < Y0 + FH).map(([, j]) => j);
    const lit = (T0) => { const k = tl.ACT.findIndex((a, i) => T0 >= a && T0 <= tl.ACT[i + 1]), b = beats[k]; return win.map((j) => { const o = [...b.pts[j].slice(0, 3), 1]; b.live(b.pts[j], j, T0 - tl.ACT[k], o); return o[3]; }); };
    assert.ok(Math.max(...lit(tl.land[1] + 0.1)) < 0.2 && Math.min(...lit(tl.land[1] + tl.beat + 0.6)) > 1, `${n}: Fenster folgen nicht einen Takt später`);
    // der Kran wird zur Leuchtschrift über dem Dach: alle Krandrohnen am Ende über dem obersten Ring
    const fin = frame(beats[3], beats[3].hold), crane = m.tags.map((t, j) => [t, j]).filter(([t]) => ['mast', 'ausleger', 'gewicht', 'seil', 'haken'].includes(t)).map(([, j]) => fin[j][1]);
    assert.ok(Math.min(...crane) > yOf(m.N) - 0.05, `${n}: Kran ist nicht zur Schrift über dem Dach geworden`);
  }
});

test('mehr Drohnen machen das Haus höher und bringen mehr Teile', () => {
  assert.deepEqual([700, 849, 850, 949, 950, 1000].map(hqLevel), [0, 0, 1, 1, 2, 2]);
  assert.ok(FLOORS[2] > FLOORS[1] && FLOORS[1] > FLOORS[0]);
  const tags = (n) => new Set(hqModel(n).tags.filter((t) => !t.startsWith('ring'))).size;
  assert.ok(tags(1000) > tags(850) && tags(850) > tags(700), `Teile ${[700, 850, 1000].map(tags).join(' / ')}`);
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['headquarters3d', 700, 150], ['headquartersStory', 1000, 500]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
