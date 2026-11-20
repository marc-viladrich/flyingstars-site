// Runde 10 (Marc, 20.11.2026: „bei 3D+ einen seamless Übergang …, bei dem der Stern auf dem Weihnachtsbaum smoothly zum
// großen 3D-Stern wird“): Wächter für snowTreeStarStory (scenes/schnee.js). Der Übergang wird in der echten Engine
// (show-field.js über scripts/show-sim.mjs) Bild für Bild abgespielt. Geprüft wird in jedem Frame vom Ende des Baumbilds
// bis nach der Ankunft beim großen Stern:
//   - die Drohnen des Baumsterns bilden einen Stern (beste Ähnlichkeitsabbildung des Sternumrisses, Restfehler klein),
//   - der Stern wächst stetig (Größe und Lage ohne Sprung), keine Wolke dazwischen,
//   - es sind immer genau n Drohnen in der Luft, keine kommt dazu oder fliegt weg,
//   - keine Drohne ist schneller als die Grenzen der Engine erlauben.
// Aufruf: node --test scripts/baumstern-uebergang.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './show-sim.mjs';

const schnee = await import('../src/scripts/scenes/schnee.js');
const { builders, CROWN, starOutline, GROW, SETTLE } = schnee;
const { share } = await import('../src/scripts/show-shapes.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { buildSequence } = await import('../src/scripts/show-scenes.js');

const BUILD = 'snowTreeStarStory';
const motif = { id: 'schnee', label: 'Lichterbaum', tiers: { ODYSSEY: { build: BUILD, caption: 'Lichterbaum', minDrones: 0 } } };
const TILT = 0.14, ct = Math.cos(TILT), st = Math.sin(TILT);
/** Bildschirmlage wie render() in show-field.js: gekippte Bühne mit Perspektive. */
const screen = (x, y, z) => { const Y = y * ct - z * st, Z = y * st + z * ct, pr = 3.4 / (3.4 - Z); return [x * pr, Y * pr]; };

/** Beste Ähnlichkeitsabbildung (Verschieben, Drehen, Skalieren) von Q auf P in 2D; Restfehler relativ zur Größe. */
function similarity(Q, P) {
  const m = Q.length, mq = [0, 0], mp = [0, 0];
  for (let k = 0; k < m; k++) { mq[0] += Q[k][0] / m; mq[1] += Q[k][1] / m; mp[0] += P[k][0] / m; mp[1] += P[k][1] / m; }
  let a = 0, b = 0, qq = 0;
  for (let k = 0; k < m; k++) {
    const qx = Q[k][0] - mq[0], qy = Q[k][1] - mq[1], px = P[k][0] - mp[0], py = P[k][1] - mp[1];
    a += qx * px + qy * py; b += qx * py - qy * px; qq += qx * qx + qy * qy;
  }
  const s = Math.hypot(a, b) / qq, c = a / Math.hypot(a, b), d = b / Math.hypot(a, b);
  let err = 0;
  for (let k = 0; k < m; k++) {
    const qx = Q[k][0] - mq[0], qy = Q[k][1] - mq[1];
    err += (s * (c * qx - d * qy) + mp[0] - P[k][0]) ** 2 + (s * (d * qx + c * qy) + mp[1] - P[k][1]) ** 2;
  }
  const map = ([x, y]) => [s * (c * (x - mq[0]) - d * (y - mq[1])) + mp[0], s * (d * (x - mq[0]) + c * (y - mq[1])) + mp[1]];
  return { scale: s, centre: mp, error: Math.sqrt(err / m) / s, turn: Math.atan2(d, c), map };
}

test('3D+: Baumgeschichte und großer Stern; das letzte Bild hat dieselben Teile wie das Baumbild, starr, ohne Wolke', async () => {
  for (const n of [300, 450, 1000]) {
    const { beats } = await buildSequence([motif], 'ODYSSEY', n, null, 'silvester');
    assert.equal(beats.length, 6, `${n}: ${beats.length} Bilder`);
    for (const b of beats) assert.equal(b.pts.length, n, `${n}: ${b.caption} hat ${b.pts.length} Drohnen`);
    const tree = beats[4], grown = beats[5];
    assert.ok(grown.starGrow, `${n}: das letzte Bild ist nicht der wachsende Stern`);
    assert.ok(!grown.cloud && !tree.cloud, `${n}: Wolke beim Übergang`);
    assert.deepEqual(tree.groups.map((g) => [g.name, g.count]), grown.groups.map((g) => [g.name, g.count]), `${n}: Teile passen nicht`);
    assert.ok(grown.groups.every((g) => g.rigid), `${n}: Teile des großen Sterns nicht starr`);
    assert.equal(grown.groups.find((g) => g.name === 'star').count, CROWN.S);
  }
});

test('Winter & Silvester spielt den Übergang in 3D+ ab 300 Drohnen als erstes Motiv', async () => {
  const silvester = OCCASIONS.find((o) => o.id === 'silvester'), m = silvester.motifs.find((q) => q.tiers.ODYSSEY?.build === BUILD);
  assert.ok(m, 'kein Motiv mit dem Baumstern-Übergang');
  assert.ok(m.tiers.ODYSSEY.minDrones <= 300, `spielt erst ab ${m.tiers.ODYSSEY.minDrones}`);
});

for (const n of [300, 600, 1000]) {
  test(`Echte Engine, ${n} Drohnen: der Stern bleibt in jedem Frame ein Stern und wächst ohne Sprung`, async () => {
    const S = CROWN.S, L = n - S, [outer] = share(S, [1, CROWN.inner]);
    const ideal = Array.from({ length: outer }, (_, k) => starOutline((k / outer) * 10, 0, 0, 1, 0.44));
    let grow = -1, getOrder = null, frames = [];
    const fps = 60;
    await simulate({
      motifs: [motif], occasion: 'silvester', pkg: 'ODYSSEY', n, fps, seconds: 60,
      wrap: (get) => { getOrder = get; },
      onFrame: (t, pos, beat, active, scene) => {
        if (grow < 0) grow = scene.beats.findIndex((b) => b.starGrow);
        const order = getOrder?.() ?? [];
        if (beat >= grow - 1 && beat <= grow) frames.push({ t, pos: pos.slice(), beat, active, total: pos.length / 3, order });
      },
    });
    assert.ok(grow > 0, 'kein Übergangsbild gefunden');
    const into = frames.findIndex((f) => f.beat === grow);
    assert.ok(into > 0, 'der große Stern wurde nicht erreicht');
    // Fenster: die letzte Sekunde des Baumbilds bis zum Ende des Wachsens. Danach dreht sich der große Stern ganz um die
    // Hochachse (stern() 3D+), in der Seitenansicht ist er gewollt kein flacher Stern mehr. Ende des Wachsens: das Bild, in
    // dem der Umriss am größten ist (die Drehung verkürzt ihn danach).
    let win = frames.slice(Math.max(0, into - fps));
    let starDrones = null, prev = null, maxErr = 0, maxStep = 0, maxAcc = 0, lastScale = 0, shrink = 0, crowd = 0;
    for (const f of win) {
      assert.equal(f.active, n, `t=${f.t.toFixed(2)}: ${f.active} statt ${n} Drohnen tragen das Bild`);
      assert.equal(f.total, n, `t=${f.t.toFixed(2)}: ${f.total} Drohnen in der Luft`);
      // im großen Stern: welche Drohnen den äußeren Umriss tragen (lokaler Platz im Teil "star" = Platz im Baumstern)
      if (f.beat === grow && !starDrones && f.order.length === n) {
        starDrones = new Array(outer);
        f.order.forEach((j, i) => { if (j >= L && j - L < outer) starDrones[j - L] = i; });
      }
      prev = f;
    }
    assert.ok(starDrones && starDrones.every((i) => i !== undefined), 'Umriss-Drohnen nicht gefunden');
    const sizeOf = (f) => similarity(ideal, starDrones.map((i) => screen(f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]))).scale;
    let top = into;
    for (let q = into; q < frames.length && frames[q].beat === grow; q++) if (sizeOf(frames[q]) >= sizeOf(frames[top])) top = q;
    win = frames.slice(Math.max(0, into - fps), top + 1);
    console.log(`${n} Drohnen: Übergang ${(frames[top].t - frames[into].t).toFixed(2)} s`);
    // dieselben Drohnen tragen den Stern schon im Baumbild (starre Teile): Prüfung über das ganze Fenster
    const starSet = new Set(starDrones);
    prev = null;
    for (const f of win) {
      const P = starDrones.map((i) => screen(f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]));
      const s = similarity(ideal, P);
      maxErr = Math.max(maxErr, s.error);
      if (lastScale && s.scale < lastScale - 1e-3) shrink = Math.max(shrink, lastScale - s.scale);
      lastScale = s.scale;
      if (prev) {
        const dt = f.t - prev.t;
        // im Flug: ein Baumlicht, das weder steht (noch am Baum) noch mit dem wachsenden Stern mitfährt (schon gelandet)
        const ride = similarity(starDrones.map((i) => screen(prev.pos[i * 3], prev.pos[i * 3 + 1], prev.pos[i * 3 + 2])), P).map;
        let moving = 0;
        for (let i = 0; i < n; i++) {
          const v = [0, 1, 2].map((c) => (f.pos[i * 3 + c] - prev.pos[i * 3 + c]) / dt), sp = Math.hypot(...v);
          maxStep = Math.max(maxStep, sp);
          if (f.beat === grow && sp > 0.08 && !starSet.has(i)) {
            const was = ride(screen(prev.pos[i * 3], prev.pos[i * 3 + 1], prev.pos[i * 3 + 2])), now = screen(f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]);
            if (Math.hypot(now[0] - was[0], now[1] - was[1]) / dt > 0.08) moving++;
          }
          if (prev.v) maxAcc = Math.max(maxAcc, Math.hypot(...v.map((x, c) => (x - prev.v[i * 3 + c]) / dt)));
          (f.v ??= new Float64Array(n * 3)).set(v, i * 3);
        }
        crowd = Math.max(crowd, moving / (n - CROWN.S));
      }
      prev = f;
    }
    const first = similarity(ideal, starDrones.map((i) => screen(...win[0].pos.slice(i * 3, i * 3 + 3))));
    const last = similarity(ideal, starDrones.map((i) => screen(...win[win.length - 1].pos.slice(i * 3, i * 3 + 3))));
    console.log(`${n} Drohnen: Sternfehler max ${(maxErr * 100).toFixed(1)} %, Größe ${first.scale.toFixed(3)} → ${last.scale.toFixed(3)}, schnellste Drohne ${maxStep.toFixed(2)} (Grenze ${LIMITS.speed}), Beschleunigung ${maxAcc.toFixed(2)} (Grenze ${LIMITS.accel}), höchstens ${(crowd * 100).toFixed(0)} % der Baumlichter gleichzeitig im Flug`);
    assert.ok(maxErr < 0.1, `${n}: der Stern verliert seine Form (Restfehler ${(maxErr * 100).toFixed(1)} % des Halbmessers)`);
    assert.ok(last.scale > first.scale * 2.5, `${n}: der Stern wächst nur von ${first.scale.toFixed(3)} auf ${last.scale.toFixed(3)}`);
    assert.ok(shrink < 0.01, `${n}: der Stern schrumpft zwischendurch um ${shrink.toFixed(3)}`);
    assert.ok(maxStep < LIMITS.speed * 1.15, `${n}: eine Drohne fliegt ${maxStep.toFixed(2)} je Sekunde`);
    assert.ok(maxAcc < LIMITS.accel * 1.3, `${n}: eine Drohne beschleunigt mit ${maxAcc.toFixed(2)}`);
    // kein Knäuel: Die Lichterkette wird nacheinander eingezogen, nie fliegt der ganze Baum zugleich (erster Versuch: 100 %)
    assert.ok(crowd < 0.5, `${n}: ${(crowd * 100).toFixed(0)} % der Baumlichter gleichzeitig im Flug`);
  });
}

test('der Baumstern und der große Stern leuchten, solange sie stehen (Licht ≥ 0,9)', async () => {
  for (const n of [300, 1000]) {
    const beats = builders[BUILD](n, '').beats, tree = beats[beats.length - 2], grown = beats[beats.length - 1], L = n - CROWN.S;
    let low = Infinity;
    for (const [b, t] of [[tree, 0], [tree, 1.5], [tree, 3], [grown, 0], [grown, 1.7], [grown, 3.9]]) for (let j = L; j < n; j++) {
      const p = b.pts[j], o = [p[0], p[1], p[2], 1]; b.live(p, j, t, o); low = Math.min(low, o[3]);
    }
    assert.ok(low >= 0.9, `${n}: Sterndrohne mit Licht ${low.toFixed(2)}`);
  }
});

// Die Finten-Prüfung je Teil (show-finte.test.mjs) lässt den Teil "lights" aus (writes), weil die Lichter einzeln
// nacheinander fliegen und der Teil keine gemeinsame Bewegung hat. Hier darum jede Bahn für sich, im Bezugssystem des
// Sterns (beste Ähnlichkeitsabbildung des Baumstern-Umrisses je Zeitpunkt, wie die Finten-Prüfung die Bewegung des
// eigenen Teils abzieht): Bis zum Abflug steht das Licht am Baum, im Flug holt es nicht aus und schießt nicht über seinen
// Platz hinaus (Maß wie dort: 0,03 oder 12 % der Strecke, hier in Halbmessern des Sterns), nach der Landung fährt es
// genau mit dem Stern mit, und vor der Drehung stehen alle.
test('jedes Baumlicht fliegt ohne Ausholen und Überschwingen in den Stern, fährt danach mit ihm und steht vor der Drehung', () => {
  const { REEL_FROM, REEL, FLY } = schnee;
  for (const n of [300, 1000]) {
    const beats = builders[BUILD](n, '').beats, b = beats[beats.length - 1], L = n - CROWN.S, dt = 1 / 30, [outer] = share(CROWN.S, [1, CROWN.inner]);
    const ideal = Array.from({ length: outer }, (_, k) => starOutline((k / outer) * 10, 0, 0, 1, 0.44));
    const at = (j, t) => { const p = b.pts[j], o = [p[0], p[1], p[2], 1]; b.live(p, j, t, o); return screen(o[0], o[1], o[2]); };
    const times = []; for (let t = 0; t <= GROW + 1e-9; t += dt) times.push(t);
    const frame = times.map((t) => similarity(Array.from({ length: outer }, (_, k) => at(L + k, t)), ideal).map); // Bild → Stern
    let bad = 0, worst = 0, drift = 0, early = 0;
    for (let j = 0; j < L; j++) {
      const path = times.map((t, q) => [t, at(j, t), frame[q](at(j, t))]);
      const go = path.findIndex(([, p]) => Math.hypot(p[0] - path[0][1][0], p[1] - path[0][1][1]) > 1e-9);
      if (go >= 0 && times[go] < REEL_FROM - 1e-9) early++;
      const land = path.findIndex(([t], q) => q > go && path.slice(q).every(([, , r]) => Math.hypot(r[0] - path[q][2][0], r[1] - path[q][2][1]) < 1e-3));
      const fly = path.slice(Math.max(0, go - 1), land + 1).map(([, , r]) => r), a = fly[0], z = fly[fly.length - 1];
      const D = Math.hypot(z[0] - a[0], z[1] - a[1]), ux = (z[0] - a[0]) / (D || 1), uy = (z[1] - a[1]) / (D || 1);
      let back = 0, over = 0;
      for (const r of fly) { const s = (r[0] - a[0]) * ux + (r[1] - a[1]) * uy; back = Math.max(back, -s); over = Math.max(over, s - D); }
      const excess = Math.max(back, over) - Math.max(0.03, 0.12 * D);
      if (excess > 0) { bad++; worst = Math.max(worst, excess); }
      drift = Math.max(drift, times[land] - (REEL_FROM + REEL + FLY));
      const end = at(j, GROW), still = at(j, GROW + SETTLE * 0.9);
      assert.ok(Math.hypot(still[0] - end[0], still[1] - end[1]) < 1e-9, `${n}: Licht ${j} steht nach der Landung nicht`);
    }
    assert.equal(early, 0, `${n}: ${early} Lichter fliegen vor dem Einzug los`);
    assert.ok(drift < 1e-6, `${n}: ein Licht landet erst ${drift.toFixed(2)} s nach dem Ende des Einzugs`);
    assert.equal(bad, 0, `${n}: ${bad} Lichter holen aus oder schießen über (bis ${worst.toFixed(3)} Halbmesser)`);
  }
});
