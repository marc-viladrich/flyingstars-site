// Runde 11 (große Motive): Wächter für scenes/gross/tintenfisch.js, den Tintenfisch im Stadtfest (seit Runde 11b ohne Korallen) (3D
// und 3D+ ab 400). Genau n Drohnen bei jeder einstellbaren Zahl, keine Klumpen, keine verstreuten Punkte (außer den
// Blasen), Bewegung in Drohnengrenzen, das Bild füllt die Bühne, die Arme rollen sich wirklich ein (von der Spitze her) und
// öffnen sich nacheinander, der Rückstoß hebt ihn, mehr Drohnen bringen mehr Teile.
// Aufruf: node --test scripts/tintenfisch.test.mjs
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { builders, octoModel, octoLevel } = await import('../src/scripts/scenes/gross/tintenfisch.js');
const { GROSS } = await import('../src/scripts/scenes/gross/index.js');
const { LIMITS } = await import('../src/scripts/show-flight.js');
const { droneStops } = await import('../src/content/show-packages.ts');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { BUILDERS } = await import('../src/scripts/scenes/index.js');

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
const groupRange = (b, name) => { let s = 0; for (const g of b.groups) { if (g.name === name) return [s, s + g.count]; s += g.count; } return [0, 0]; };

test('im Konfigurator: Stadtfest, direkt hinter dem Delfin, 3D und 3D+ ab 400, nachgeladen', () => {
  const fest = OCCASIONS.find((o) => o.id === 'festival'), i = fest.motifs.findIndex((m) => m.id === 'tintenfisch'), m = fest.motifs[i];
  assert.ok(m, 'Tintenfisch fehlt im Stadtfest');
  assert.equal(fest.motifs[i - 1].id, 'delfin', 'Tintenfisch steht nicht direkt hinter dem Delfin');
  assert.deepEqual(Object.keys(m.tiers), ['HORIZON', 'ODYSSEY']);
  assert.equal(m.tiers.HORIZON.build, 'octopus3d'); assert.equal(m.tiers.HORIZON.minDrones, MIN);
  assert.equal(m.tiers.ODYSSEY.build, 'octopusStory'); assert.equal(m.tiers.ODYSSEY.minDrones, MIN);
  for (const b of ['octopus3d', 'octopusStory']) { assert.equal(typeof GROSS[b], 'function', `${b} nicht in gross/index.js`); assert.equal(BUILDERS[b], undefined, `${b} im gemeinsamen Szenenpaket`); }
});

test('genau n Drohnen in jedem Bild bei jeder einstellbaren Zahl, Punkte und Teile gültig', async () => {
  for (const [name, stops] of [['octopus3d', STOPS.s3], ['octopusStory', STOPS.plus]]) for (const n of stops) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      assert.equal(b.pts.length, n, `${name} ${n} Bild ${k}`);
      assert.ok(b.pts.every((p) => p.length === 6 && p.every(Number.isFinite) && p.slice(3).every((c) => c >= 0 && c <= 255)), `${name} ${n}: Punktformat`);
      assert.equal(b.groups.reduce((s, g) => s + g.count, 0), n, `${name} ${n}: Teile`);
      if (k) assert.ok(!b.cloud, `${name} ${n} Bild ${k}: Wolke mitten im Motiv`);
    }
  }
});

test('keine zwei Drohnen aufeinander, keine verstreuten Punkte (Ruhe, Mitte, Ende; Stufe, Mitte, 1000)', async () => {
  for (const name of ['octopus3d', 'octopusStory']) for (const n of [400, 700, 1000]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const [b0] = groupRange(b, 'blasen');
      for (const t of [0, (b.hold ?? 6) / 4, (b.hold ?? 6) / 2, (3 * (b.hold ?? 6)) / 4, b.hold ?? 6]) {
        const all = frame(b, t), nn = nearest(all), med = quantile(nn.slice(0, b0), 0.5);
        assert.ok(Math.min(...nn) >= 0.3 * med, `${name} ${n} Bild ${k} t ${t}: knappster Abstand ${Math.min(...nn).toFixed(4)} bei Median ${med.toFixed(4)}`);
        // ohne die Blasen (die treiben absichtlich einzeln)
        assert.ok(quantile(nn.slice(0, b0), 0.995) <= 4.5 * med, `${name} ${n} Bild ${k} t ${t}: Drohnen stehen allein (${quantile(nn.slice(0, b0), 0.995).toFixed(3)} bei Median ${med.toFixed(3)})`);
      }
    }
  }
});

test('Eigenbewegung in Drohnengrenzen und ohne Sprung bei t = 0', async () => {
  for (const [name, n] of [['octopus3d', 400], ['octopus3d', 1000], ['octopusStory', 400], ['octopusStory', 1000]]) {
    const { beats } = await builders[name](n, '');
    for (const [k, b] of beats.entries()) {
      const m = motion(b, n > 600 ? 3 : 1);
      assert.ok(m.jump < 1e-6, `${name} ${n} Bild ${k}: Sprung ${m.jump.toFixed(4)} bei t = 0`);
      assert.ok(m.v < LIMITS.speed * 0.8, `${name} ${n} Bild ${k}: ${m.v.toFixed(2)} Einheiten/s`);
      assert.ok(m.a < LIMITS.accel, `${name} ${n} Bild ${k}: Beschleunigung ${m.a.toFixed(2)}`);
    }
  }
});

test('Bilder schließen aneinander an (starre Teile, keine Wolke), nur der Rückstoß hat einen eigenen Ausschnitt', async () => {
  for (const n of [400, 1000]) {
    const { beats } = await builders.octopusStory(n, '');
    assert.deepEqual(beats.map((b) => b.frame ?? null), [null, null, null, 'aufstieg']);
    for (let k = 1; k < beats.length; k++) {
      const end = frame(beats[k - 1], beats[k - 1].hold), d = Math.max(...beats[k].pts.map((p, j) => Math.hypot(p[0] - end[j][0], p[1] - end[j][1], p[2] - end[j][2])));
      assert.ok(d < 1e-6, `${n}: Bild ${k} beginnt ${d.toFixed(4)} neben dem Ende von Bild ${k - 1}`);
      assert.deepEqual(beats[k].groups, beats[0].groups, `${n} Bild ${k}: andere Teile`);
    }
  }
});

test('lesbar: acht Arme mit Saugnapf-Innenseite, Augen, keine Korallen (Marc 21.11.); der Tintenfisch füllt das Bild', async () => {
  for (const n of [400, 700, 1000]) {
    const m = octoModel(n), arms = new Set(m.slots.map((q) => q.k)), count = (t) => m.body.tags.filter((x) => x === t).length;
    assert.equal(arms.size, 8, `${n}: ${arms.size} Arme`);
    assert.ok(m.slots.every((q) => q.side === 1 || q.side === -1) && m.slots.filter((q) => q.side > 0).length > 0.4 * m.A, `${n}: Innenseite`);
    for (const [t, min] of [['mantel', 34], ['auge', 6]]) assert.ok(count(t) >= min, `${n}: ${t} hat nur ${count(t)} Drohnen`);
    assert.equal(count('koralle') + count('knospe'), 0, `${n}: Korallen sind wieder da`);
    assert.ok(m.A >= 0.75 * n, `${n}: nur ${m.A} Drohnen in den Armen`);
    // offen (3D bei t = 0, 3D+ nach dem Öffnen): der Tintenfisch nimmt mindestens 70 % der Bildbreite ein
    const { beats: [b3] } = await builders.octopus3d(n, ''), { beats } = await builders.octopusStory(n, '');
    const body = (b, t) => frame(b, t, 0, m.A + m.Bd);
    assert.ok(extent(body(b3, 0), 0) >= 0.7 * extent(b3.fitPts, 0), `3D ${n}: ${(extent(body(b3, 0), 0) / extent(b3.fitPts, 0) * 100).toFixed(0)} % der Breite`);
    assert.ok(extent(body(beats[2], 0), 0) >= 0.7 * extent(beats[2].fitPts, 0), `3D+ ${n}: ${(extent(body(beats[2], 0), 0) / extent(beats[2].fitPts, 0) * 100).toFixed(0)} % der Breite`);
  }
});

test('die Arme rollen sich von der Spitze her ein, öffnen sich nacheinander, der Rückstoß hebt ihn', async () => {
  for (const n of [400, 1000]) {
    const m = octoModel(n), { beats } = await builders.octopusStory(n, '');
    // Spitze eines Arms (Stelle s = L) gegen den Ansatz: eingerollt liegt die Spitze nah am Ansatz, offen weit weg
    const reach = (b, t, k) => { const f = frame(b, t, 0, m.A), idx = m.slots.map((q, j) => [q, j]).filter(([q]) => q.k === k); const tip = idx.reduce((a, c) => (c[0].s > a[0].s ? c : a)), base = idx.reduce((a, c) => (c[0].s < a[0].s ? c : a)); return Math.hypot(f[tip[1]][0] - f[base[1]][0], f[tip[1]][1] - f[base[1]][1]); };
    for (let k = 0; k < 8; k++) {
      assert.ok(reach(beats[2], 0, k) > 1.4 * reach(beats[0], 0, k), `${n} Arm ${k}: offen ${reach(beats[2], 0, k).toFixed(2)} gegen eingerollt ${reach(beats[0], 0, k).toFixed(2)}`);
      assert.ok(reach(beats[3], 0, k) < 0.85 * reach(beats[2], 0, k), `${n} Arm ${k}: rollt sich in Akt 3 nicht ein`);
    }
    // nacheinander: mitten im Öffnen sind nicht alle Arme gleich weit
    const mid = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => reach(beats[1], 1.8, k) / reach(beats[2], 0, k));
    assert.ok(Math.max(...mid) - Math.min(...mid) > 0.15, `${n}: die Arme öffnen sich gleichzeitig (${mid.map((x) => x.toFixed(2)).join(' ')})`);
    // Rückstoß: der Mantel steigt um mindestens 0,5
    const top = (b, t) => { const f = frame(b, t, m.A, m.A + m.Bd); return Math.max(...f.filter((_, j) => m.body.tags[j] === 'mantel').map((p) => p[1])); };
    assert.ok(top(beats[3], beats[3].hold) - top(beats[3], 0) >= 0.5, `${n}: steigt nur ${(top(beats[3], beats[3].hold) - top(beats[3], 0)).toFixed(2)}`);
  }
});

test('mehr Drohnen bringen mehr Teile, nicht nur dichtere Linien', () => {
  assert.deepEqual([400, 599, 600, 849, 850, 1000].map(octoLevel), [0, 0, 1, 1, 2, 2]);
  const tags = (n) => { const m = octoModel(n); return m.body.tags.length + 0 && new Set(m.body.tags).size; };
  assert.ok(tags(700) > tags(400), `Teile ${tags(400)} → ${tags(700)}`);
  const blasen = (n) => octoModel(n).bubbles.length;
  assert.ok(blasen(1000) > blasen(700) && blasen(700) > blasen(400), `Blasen ${[400, 700, 1000].map(blasen).join(' / ')}`);
  const med = (n) => { const m = octoModel(n); return quantile(nearest(m.body.pts), 0.5); };
  // seit Runde 11b gehen die Korallendrohnen in den Kraken: der Körper wird mit mehr Drohnen etwas dichter (2,5-fache Zahl)
  assert.ok(med(1000) >= 0.33 * med(400), `Abstand ${med(400).toFixed(3)} → ${med(1000).toFixed(3)}`);
});

test('Aufbau schnell genug für den Anlasswechsel (bester von drei)', async () => {
  for (const [name, n, ms] of [['octopus3d', 400, 120], ['octopusStory', 1000, 300]]) {
    let best = Infinity;
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); await builders[name](n, ''); best = Math.min(best, performance.now() - t0); }
    assert.ok(best < ms, `${name} ${n}: ${best.toFixed(1)} ms`);
  }
});
