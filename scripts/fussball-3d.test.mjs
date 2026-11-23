// Runde 9: Wächter für den Fußballer und den Springer als Körper (src/scripts/scenes/catalog-3d/sport.js, Motive Fußball
// und Kopfsprung in scenes/jubilaeum.js). Wie bei den 3D-Katalogmotiven (scripts/catalog-3d.test.mjs): genau n Drohnen in jeder Fassung,
// keine zwei aufeinander, nichts verstreut, Eigenbewegung in Drohnengrenzen, Aufbau schnell genug. Dazu, was beim alten
// Fußballer falsch war: Der Fuß dringt nie in den Ball ein, und der Ball fliegt erst los, wenn der Fuß bei ihm ist.
// Aufruf: node --test scripts/fussball-3d.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders: BUILDERS } = await import('../src/scripts/scenes/jubilaeum.js');
const { spieler, ball, schuss, schuss2d, springer } = await import('../src/scripts/scenes/catalog-3d/sport.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const RANGES = { kick2d: [150, 170, 190], kickHorizon: [200, 250, 290], kickStory: [300, 450, 1000], diveHorizon: [200, 250, 290], diveStory: [300, 450, 1000] };

const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], (p[2] || 0) - (pts[j][2] || 0))); return m; });
/** Maßstab der Bühne wie fit() in show-field.js: Szeneneinheiten → Anzeigeeinheiten (LIMITS gelten in Anzeigeeinheiten). */
function scaleOf(b, n) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return (0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75)) * Math.min(1, Math.sqrt(n / 300));
}
/** Höchste Geschwindigkeit und Beschleunigung (Anzeigeeinheiten) über die Haltezeit, je Drohne. */
function motion(b, n, from = 0, to = b.hold ?? 6, litOnly = false) {
  const s = scaleOf(b, n), dt = 1 / 30; let v = 0, a = 0, at = 0;
  b.pts.forEach((p, j) => {
    let prev = null, pv = null;
    for (let t = from; t <= to; t += dt) {
      const o = [p[0], p[1], p[2] || 0, 1]; b.live(p, j, t, o);
      if (litOnly && !(o[3] > 0.2)) { prev = null; pv = null; continue; } // dunkel: sieht niemand
      if (prev) { const w = [0, 1, 2].map((c) => ((o[c] - prev[c]) / dt) * s); v = Math.max(v, Math.hypot(...w)); if (pv) { const q = Math.hypot(...w.map((x, c) => (x - pv[c]) / dt)); if (q > a) { a = q; at = t; } } pv = w; }
      prev = o;
    }
  });
  return { v, a, at };
}

test('genau n Drohnen in jeder Fassung und jedem Bild, endlich, Farben gültig', async () => {
  for (const [name, counts] of Object.entries(RANGES)) for (const n of counts) {
    const { beats } = await BUILDERS[name](n, '');
    for (const b of beats) {
      assert.equal(b.pts.length, n, `${name} ${n}: ${b.pts.length} Punkte`);
      for (const p of b.pts) assert.ok(p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255), `${name} ${n}: Punktformat`);
      if (b.groups) assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
    }
  }
});

test('Körper und Ball: keine zwei Drohnen aufeinander, keine verstreuten Punkte', () => {
  for (const n of [120, 170, 240, 320]) for (const outline of [false, true]) {
    const { pts } = spieler(n, { outline }), nn = nearest(pts), sorted = [...nn].sort((a, b) => a - b), med = sorted[n >> 1];
    assert.equal(pts.length, n);
    assert.ok(sorted[0] >= 0.4 * med, `Spieler ${n}${outline ? ' Kontur' : ''}: knappster Abstand ${sorted[0].toFixed(4)} bei Median ${med.toFixed(4)}`);
    assert.ok(sorted[n - 1] <= 4 * med, `Spieler ${n}${outline ? ' Kontur' : ''}: eine Drohne steht allein (${sorted[n - 1].toFixed(3)})`);
  }
  for (const k of [30, 36, 42, 50]) {
    const { pts, tags } = ball(k, 0.13), nn = nearest(pts), sorted = [...nn].sort((a, b) => a - b), med = sorted[k >> 1];
    assert.equal(pts.length, k);
    assert.ok(sorted[0] >= 0.35 * med, `Ball ${k}: knappster Abstand ${sorted[0].toFixed(4)} bei Median ${med.toFixed(4)}`);
    assert.ok(tags.filter((t) => t === 'muster').length >= 0.3 * k, `Ball ${k}: Muster fehlt (Fünfeck und Nähte)`);
  }
});

test('der Fuß dringt nie in den Ball ein, und der Ball fliegt erst los, wenn der Fuß bei ihm ist', () => {
  for (const n of [200, 250, 290]) {
    const r = schuss(n);
    assert.ok(r.clear >= 0.02, `${n}: Fuß kommt dem Ball auf ${r.clear.toFixed(3)} nahe (Ballrand)`);
    assert.ok(r.touch <= 0.2, `${n}: Ball fliegt los, bevor der Fuß ihn erreicht (Abstand ${r.touch.toFixed(3)})`);
    assert.ok(r.kickAt > 1.0 && r.kickAt < 2.2, `${n}: Abflug ${r.kickAt.toFixed(2)} s`);
    // ruhige Pause vorher, danach steht das Bild: Ball am Ende fast still
    const a = r.ballAt(r.hold - 0.2), b = r.ballAt(r.hold);
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2 < 0.12, `${n}: Ball fliegt am Ende noch`);
  }
});

test('Eigenbewegung in Drohnengrenzen (Anzeigeeinheiten); der Abflug des Balls ist die eine begrenzte Ausnahme', async () => {
  for (const [name, n] of [['kick2d', 160], ['kickHorizon', 200], ['kickHorizon', 290]]) {
    const b = (await BUILDERS[name](n, '')).beats[0], m = b.groups[0].count;
    const body = motion({ ...b, pts: b.pts.slice(0, m) }, n);
    assert.ok(body.v < LIMITS.speed * 0.8, `${name} ${n} Spieler: ${body.v.toFixed(2)} Einheiten/s`);
    assert.ok(body.a < LIMITS.accel, `${name} ${n} Spieler: Beschleunigung ${body.a.toFixed(2)}`);
    const ballOnly = { ...b, pts: b.pts.slice(m), live: (p, j, t, o) => b.live(p, j + m, t, o) }, ba = motion(ballOnly, n);
    assert.ok(ba.v < LIMITS.speed * 0.8, `${name} ${n} Ball: ${ba.v.toFixed(2)} Einheiten/s`);
    // Ein Schuss ist ein Impuls: Der Ball nimmt den Schwung des Fußes in gut 0,2 s auf. Höchstens 1,7 × Grenze, und nur
    // in der halben Sekunde nach dem Abflug; danach bremst er sanft.
    assert.ok(ba.a < LIMITS.accel * 1.7, `${name} ${n} Ball: Beschleunigung ${ba.a.toFixed(2)}`);
    if (name === 'kickHorizon') { const r = schuss(n), late = motion(ballOnly, n, r.kickAt + 0.5, b.hold); assert.ok(late.a < LIMITS.accel, `${name} ${n} Ball nach dem Abflug: ${late.a.toFixed(2)}`); }
  }
});

test('Aufbau schnell genug für den Anlasswechsel (< 30 ms, bester von drei)', async () => {
  for (const [f, n] of [[schuss, 250], [schuss2d, 170]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); f(n); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < 30, `${f.name} ${n}: ${best.toFixed(1)} ms`);
  }
});

test('Springer: ein Körper ohne Klumpen, Kopf zwischen den Armen lesbar, Bewegung in Drohnengrenzen', async () => {
  const g = { torso: 0, arms: 0, thigh: 0, shin: 0, foot: Math.PI / 2 };
  for (const n of [120, 150, 200, 300]) {
    const sp = springer(n), pts = sp.pts.map((_, j) => sp.at(j, g, [0, 0, 0], Math.PI / 2));
    const nn = nearest(pts), sorted = [...nn].sort((a, b) => a - b), med = sorted[n >> 1];
    assert.equal(pts.length, n);
    assert.ok(sorted[n - 1] <= 4 * med, `Springer ${n}: eine Drohne steht allein (${sorted[n - 1].toFixed(3)})`);
    // Kopf: genug eigene Drohnen, und die Hände stehen über ihm
    const tags = spieler(n, { kind: 'springer', outline: n < 140, headWeight: 1.6 }).tags, head = tags.filter((t) => t === 'kopf').length;
    assert.ok(head >= 12, `Springer ${n}: Kopf hat nur ${head} Drohnen`);
    const hand = sp.hand(g, [0, 0, 0], Math.PI / 2), top = Math.max(...pts.filter((_, j) => tags[j] === 'kopf').map((p) => p[1]));
    assert.ok(hand[1] > top, `Springer ${n}: Hände (${hand[1].toFixed(2)}) nicht über dem Kopf (${top.toFixed(2)})`);
  }
  for (const n of [200, 290]) {
    // nur leuchtende Drohnen: der Rückweg hinter dem Wasser läuft dunkel (unverändert seit der elften Fassung)
    const b = (await BUILDERS.diveHorizon(n, '')).beats[0], m = b.groups[0].count, body = motion({ ...b, pts: b.pts.slice(0, m) }, n, 0, b.hold, true);
    assert.ok(body.v < LIMITS.speed * 0.8, `diveHorizon ${n} Springer: ${body.v.toFixed(2)} Einheiten/s`);
    assert.ok(body.a < LIMITS.accel, `diveHorizon ${n} Springer: Beschleunigung ${body.a.toFixed(2)} bei ${body.at.toFixed(2)} s`);
  }
});
