// Runde 11 (große Motive, Kandidat FSK-001): Wächter für scenes/gross/adventskranz.js, den Adventskranz mit vier Kerzen im
// Anlass Winter & Silvester (2D, 3D und 3D+ ab 300, direkt nach dem Lichterbaum). Genau n Drohnen bei jeder einstellbaren
// Zahl, keine Klumpen und keine Begegnung (auch nicht, wenn das Band zu den Flammen fliegt), Bewegung in Drohnengrenzen,
// das Bild füllt die Bühne, in 2D verdeckt keine Kerze eine andere, in 3D+ brennen die Kerzen nacheinander und am Ende alle
// vier, mehr Drohnen bringen mehr Teile, der Aufbau ist schnell.
// Aufruf: node --test scripts/adventskranz.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, wreathModel, level } = await import('../src/scripts/scenes/gross/adventskranz.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops, TWO_D_LIMIT } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { BUILDERS } = await import('../src/scripts/scenes/index.js');

const MIN = { SPARK: 150, HORIZON: 200, ODYSSEY: 300 }; // Runde 11c // Runde 11b: lockerer, mit weniger Drohnen
const STOPS = { flat: droneStops('2d').filter((n) => n >= MIN.SPARK && n < TWO_D_LIMIT), s3: droneStops('3d').filter((n) => n >= MIN.HORIZON), plus: droneStops('story').filter((n) => n >= MIN.ODYSSEY) };
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], (p[2] || 0) - (pts[j][2] || 0))); return m; });
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const frame = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, j, t, o); return o; });
const lit = (f) => f.filter((o) => o[3] > 0.05);
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
function scaleOf(b) { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return 0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75); }
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
const ALL = [['adventskranz2d', STOPS.flat], ['adventskranz3d', STOPS.s3], ['adventskranzStory', STOPS.plus]];

test('im Konfigurator: Winter & Silvester, nach dem Lichterbaum, 2D ab 150, 3D ab 200, 3D+ ab 300, nachgeladen', () => {
  const o = OCCASIONS.find((x) => x.id === 'silvester'), i = o.motifs.findIndex((m) => m.id === 'adventskranz'), m = o.motifs[i];
  assert.ok(m, 'Adventskranz fehlt');
  assert.equal(o.motifs[i - 1].id, 'schnee', 'Adventskranz steht nicht direkt nach dem Lichterbaum');
  assert.deepEqual(Object.keys(m.tiers), ['SPARK', 'HORIZON', 'ODYSSEY']);
  for (const [tier, build] of [['SPARK', 'adventskranz2d'], ['HORIZON', 'adventskranz3d'], ['ODYSSEY', 'adventskranzStory']]) {
    assert.equal(m.tiers[tier].build, build); assert.equal(m.tiers[tier].minDrones, MIN[tier], `${tier} ab ${m.tiers[tier].minDrones}`);
    assert.equal(typeof GROSS[build], 'function', `${build} nicht in gross/index.js`); assert.equal(BUILDERS[build], undefined, `${build} im gemeinsamen Szenenpaket`);
  }
});

test('genau n Drohnen bei jeder einstellbaren Zahl, Punkte gültig, kein Sprung bei t = 0', async () => {
  for (const [name, stops] of ALL) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      assert.ok(frame(b, 0).every((o, j) => Math.hypot(o[0] - b.pts[j][0], o[1] - b.pts[j][1], o[2] - b.pts[j][2]) < 1e-9), `${name} ${n}: Sprung bei t = 0`);
    }
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (Ruhe, Mitte, Ende; 3D+ alle 0,1 s)', async () => {
  for (const [name, ns] of [['adventskranz2d', [150, 200, 390]], ['adventskranz3d', [200, 250, 500, 750, 1000]], ['adventskranzStory', [300, 600, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, ''), b = beats[0], hold = b.hold ?? 6, med0 = quantile(nearest(lit(frame(b, 0))), 0.5);
    const times = name === 'adventskranzStory' ? Array.from({ length: Math.floor(hold / 0.1) + 1 }, (_, i) => i * 0.1) : [0, hold / 2, hold];
    for (const t of times) {
      const nn = nearest(lit(frame(b, t)));
      assert.ok(Math.min(...nn) >= 0.25 * med0, `${name} ${n} t ${t.toFixed(1)}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med0.toFixed(4)}`);
    }
    for (const t of [0, hold / 2, hold]) { const nn = nearest(lit(frame(b, t))), med = quantile(nn, 0.5); assert.ok(Math.min(...nn) >= 0.3 * med && quantile(nn, 0.995) <= 4.5 * med, `${name} ${n} t ${t.toFixed(1)}: Abstände`); }
  }
});

test('Eigenbewegung in Drohnengrenzen', async () => {
  for (const [name, ns] of [['adventskranz2d', [150]], ['adventskranz3d', [200, 1000]], ['adventskranzStory', [300, 600, 1000]]]) for (const n of ns) {
    const { beats } = await builders[name](n, ''), m = motion(beats[0], n > 500 ? 2 : 1);
    assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n}: ${m.v.toFixed(2)} Einheiten/s`);
    assert.ok(m.a < LIMITS.accel, `${name} ${n}: Beschleunigung ${m.a.toFixed(2)}`);
  }
});

test('lesbar: vier Kerzen mit Flammen, der Kranz trägt das Bild, das Bild füllt die Bühne', async () => {
  for (const n of [200, 1000]) {
    const m = wreathModel(n), count = (pre) => m.tags.filter((t) => t.startsWith(pre)).length;
    for (let c = 0; c < 4; c++) { assert.ok(count(`kerze${c}`) >= 10, `${n}: Kerze ${c} hat ${count(`kerze${c}`)} Drohnen`); assert.ok(count(`flamme${c}`) >= 8, `${n}: Flamme ${c}`); }
    assert.ok(count('zweig') + count('spitze') >= 0.4 * n, `${n}: der Kranz trägt weniger als 40 % der Drohnen`);
  }
  // Breite und Höhe: der Kranz füllt mindestens 85 % des Bildausschnitts in der Breite (Bühne 16:10)
  for (const [name, n] of [['adventskranz2d', 150], ['adventskranz3d', 200], ['adventskranzStory', 600]]) {
    const bb = (await builders[name](n, '')).beats[0], f = lit(frame(bb, bb.hold ?? 3)), fit = bb.fitPts ?? bb.pts;
    assert.ok(extent(f, 0) >= 0.85 * extent(fit, 0), `${name} ${n}: ${(extent(f, 0) / extent(fit, 0) * 100).toFixed(0)} % der Breite`);
    assert.ok(extent(fit, 0) / extent(fit, 1) > 1.05, `${name} ${n}: hochkant (${(extent(fit, 0) / extent(fit, 1)).toFixed(2)}), die Bühne ist breit`);
  }
});

test('2D: Kerzen und Flammen stehen frei nebeneinander', async () => {
  const mod = await import('../src/scripts/scenes/gross/adventskranz.js');
  const { beats } = await mod.builders.adventskranz2d(200, ''), b = beats[0];
  // Kerzen erkennt man an der Farbe (rot), Flammen an Gold/Orange über den Kerzen; je Kerze eine eigene x-Spalte
  const red = b.pts.filter((p) => p[3] > 180 && p[4] < 110), cols = [...new Set(red.map((p) => Math.round(p[0] * 10)))].sort((a, c) => a - c);
  const groups = []; for (const x of cols) { if (!groups.length || x - groups.at(-1).at(-1) > 2) groups.push([x]); else groups.at(-1).push(x); }
  assert.equal(groups.length, 4, `2D: ${groups.length} Kerzenspalten statt vier`);
});

test('3D+: die Lichtspur zündet die Kerzen nacheinander, am Ende brennen alle vier; dieselben Drohnen, keine Wolke', async () => {
  for (const n of [300, 1000]) {
    const { beats } = await builders.adventskranzStory(n, ''), b = beats[0], m = wreathModel(n);
    assert.equal(beats.length, 1, 'eine Szene ohne Bildwechsel (keine Wolke, kein Neuaufbau)');
    // Flammen-Drohnen: anfangs als Band auf dem Kranz (unterhalb der Kerzenoberkante), am Ende auf ihren Flammenplätzen
    const start = frame(b, 0), end = frame(b, b.hold), flames = m.pts.map((_, j) => j).filter((j) => m.tags[j].startsWith('flamme'));
    const away = flames.filter((j) => Math.hypot(start[j][0] - end[j][0], start[j][1] - end[j][1], start[j][2] - end[j][2]) < 0.15).length;
    assert.equal(away, 0, `${n}: ${away} Flammen-Drohnen stehen schon am Anfang auf ihrem Platz`);
    // Zündfolge: Kerze c brennt, wenn ihre Flammen-Drohnen stehen; die Zeiten steigen
    // (der Kranz dreht sich: verglichen werden Abstände zum eigenen Docht und zum Docht der Nachbarkerze, die bleiben bei der Drehung gleich)
    const wick = [0, 1, 2, 3].map((c) => m.tags.indexOf(`docht${c}`)), d = (f, j, w) => Math.hypot(f[j][0] - f[w][0], f[j][1] - f[w][1], f[j][2] - f[w][2]);
    const litAt = [0, 1, 2, 3].map((c) => { const ids = flames.filter((j) => m.tags[j] === `flamme${c}`), w2 = wick[(c + 1) % 4]; for (let t = 0; t <= b.hold; t += 0.05) { const f = frame(b, t); if (ids.every((j) => Math.abs(d(f, j, wick[c]) - d(end, j, wick[c])) < 0.03 && Math.abs(d(f, j, w2) - d(end, j, w2)) < 0.03)) return t; } return Infinity; });
    for (let c = 1; c < 4; c++) assert.ok(litAt[c] > litAt[c - 1] + 0.6, `${n}: Kerze ${c} brennt ${litAt[c].toFixed(2)} s, Kerze ${c - 1} ${litAt[c - 1].toFixed(2)} s`);
    assert.ok(litAt[3] < b.hold - 1.5, `${n}: die vierte Flamme brennt zu spät (${litAt[3].toFixed(2)} von ${b.hold.toFixed(2)} s)`);
    assert.ok(b.hold <= 11, `${n}: ${b.hold.toFixed(1)} s`);
  }
});

test('mehr Drohnen bringen mehr Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([300, 499, 500, 749, 750, 1000].map(level), [0, 0, 1, 1, 2, 2]);
  const parts = (n) => new Set(wreathModel(n).tags.map((t) => t.replace(/\d/g, ''))).size;
  assert.ok(parts(300) < parts(500), `Teile ${parts(300)} → ${parts(500)}`);
  const med = (n) => { const m = wreathModel(n); return quantile(nearest(m.pts.filter((_, j) => m.tags[j] === 'zweig')), 0.5); };
  assert.ok(med(1000) >= 0.45 * med(300), `Kranz: Abstand ${med(300).toFixed(3)} → ${med(1000).toFixed(3)}`);
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['adventskranz2d', 390, 40], ['adventskranz3d', 1000, 120], ['adventskranzStory', 1000, 150]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
