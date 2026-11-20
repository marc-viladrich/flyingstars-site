// Wächter für die Bewegung der 2D-Katalogmotive (Runde 10b, docs/katalog-2d.md). Marc (20.11.2026): „bei den
// 2D-Animationen … wirken Sachen, die sich drehen oder bewegen, einfach nicht so nice. Es wirkt falsch oder kaputt.“
// Die Tests laufen über ALLE 2D-Motive aus catalog-motifs.json (neue Motive sind automatisch dabei) und prüfen die Klasse:
//   1. Teile bewegen sich starr (kein Morphing): jede Drohne behält zu mindestens einem Nachbarn ihren Abstand.
//   2. Räder drehen auf der Stelle: der ganze Ring dreht, nichts fliegt vom Ring weg, der Drehpunkt ist die Ringmitte.
//   3. Die Nadel dreht um die Mitte ihres Nabenrings wie in 3D.
//   4. Zahnräder greifen: kein Zahn dringt in ein anderes Rad, Drehzahl umgekehrt proportional zur Zähnezahl.
//   5. Handschlag: zwei starre Hände, erst getrennt, dann ineinander.
//   6. Was sich als Ganzes in der Bildebene dreht, ist rund (sonst eiert es: Galaxie war 2 : 1,3 gestaucht).
import '../../../scripts/show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogScene, CATALOG, catalogMinDrones, flatVariant, WHOLE_TURN, wheelRing, needleHub } from './catalog.js';
import { GEARS_2D, gearPhases } from './catalog-actions.js';

const FLAT = Object.keys(CATALOG).filter((k) => CATALOG[k].dimension !== '3D');
const read = (id) => JSON.parse(readFileSync(new URL(`../../../public/media/katalog/${id}.json`, import.meta.url), 'utf8'));
const reserve = (p) => p[3] === 60 && p[4] === 60 && p[5] === 60;
const pose = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live(p, j, t, o); return o; });
const dist = (a, c) => Math.hypot(a[0] - c[0], a[1] - c[1], (a[2] || 0) - (c[2] || 0));
const spacing = (P, idx) => { const d = idx.map((i) => Math.min(...idx.map((k) => (k === i ? Infinity : dist(P[i], P[k]))))); return d.sort((a, c) => a - c)[d.length >> 1]; };
const scene = async (key, n = 200) => (await catalogScene(key, 'SPARK', Math.max(n, catalogMinDrones(key)), key)).beats[0];

// Gewollte Verformungen (keine starren Teile): Stoff, Partikel, das Lid beim Zwinkern
const DEFORM = { fahnen: 'Stoff weht', konfetti: 'Konfetti fliegt aus', sektflasche: 'Perlen steigen', anstossen: 'Funken springen', smiley: 'Lid schließt sich' };

test('2D: jede Bewegung bewegt starre Teile, nichts morpht (alle 2D-Motive)', async () => {
  const bad = [];
  for (const key of FLAT) {
    if (DEFORM[key]) continue;
    const b = await scene(key), T = Array.from({ length: 21 }, (_, i) => i * 0.4), P = T.map((t) => pose(b, t));
    const idx = b.pts.flatMap((p, j) => (reserve(p) ? [] : [j])), sp = spacing(P[0], idx);
    // lose: hat Nachbarn auf der Linie (bis 2,6 Abstände), bleibt aber zu keinem von ihnen im festen Abstand
    let loose = 0;
    for (const i of idx) {
      const near = idx.filter((k) => k !== i && dist(P[0][i], P[0][k]) <= 2.6 * sp);
      if (near.length && !near.some((k) => { const d0 = dist(P[0][i], P[0][k]); return P.every((Q) => Math.abs(dist(Q[i], Q[k]) - d0) < 0.01 * d0 + 1e-9); })) loose++;
    }
    if (loose > Math.max(2, 0.01 * idx.length)) bad.push(`${key}: ${loose} von ${idx.length} Drohnen morphen`);
  }
  assert.deepEqual(bad, []);
});

test('2D-Fahrzeuge: der ganze Radring dreht auf der Stelle, kein Punkt verlässt Ring oder Nabe', async () => {
  for (const key of FLAT.filter((k) => CATALOG[k].motion === 'drive')) for (const n of [catalogMinDrones(key), 200, 300]) {
    const b = await scene(key, n), f = read(flatVariant(key, n).id), wheels = f.groups.wheels.map((w) => wheelRing(f.points, w.idx));
    const P0 = pose(b, 0);
    for (const w of wheels) {
      const ring = P0.flatMap((p, j) => (!reserve(b.pts[j]) && Math.abs(Math.hypot(p[0] - w.cx, p[1] - w.cy) - w.r) < 0.12 * w.r ? [j] : []));
      assert.ok(ring.length >= 5, `${key}@${n}: Rad ohne Ring`);
      for (const t of [0.7, 1.9, 3.3]) {
        const P = pose(b, t);
        // Traktor (vorher): der obere Bogen des Hinterrads stand still, der Rest drehte sich darunter durch
        for (const j of ring) assert.ok(dist(P[j], P0[j]) > 1e-3, `${key}@${n}: Ringpunkt ${j} steht still`);
        // vorher: Mitte = Schwerpunkt der Punkte eines angeschnittenen Rads, das Rad eierte und warf Punkte ab
        for (const j of ring) assert.ok(Math.abs(Math.hypot(P[j][0] - w.cx, P[j][1] - w.cy) - Math.hypot(P0[j][0] - w.cx, P0[j][1] - w.cy)) < 1e-9, `${key}@${n}: Rad eiert`);
      }
    }
  }
});

test('Drehzahlmesser 2D: nur die Nadel dreht, um die Mitte ihres Nabenrings, von der Ruhelage bis rechts oben und zurück', async () => {
  const key = 'drehzahl';
  for (const n of [catalogMinDrones(key), 200, 300]) {
    const b = await scene(key, n), f = read(flatVariant(key, n).id), hub = needleHub(f.points, f.groups.needle.idx, [f.groups.needle.cx, f.groups.needle.cy]);
    // der Nabenring der Katalogpunkte liegt auf diesem Kreis (vorher: Drehpunkt 0,1 daneben am Nadelende)
    const ring = f.groups.needle.idx.filter((j) => Math.abs(Math.hypot(f.points[j][0] - hub.cx, f.points[j][1] - hub.cy) - hub.r) < 0.025);
    assert.ok(ring.length >= 6 && hub.r > 0.06 && hub.r < 0.2, `Nabe: ${ring.length} Punkte, r ${hub.r.toFixed(3)}`);
    const P0 = pose(b, 0), Pm = pose(b, 3.25), Pe = pose(b, 6.5);
    const moved = P0.flatMap((p, j) => (dist(Pm[j], p) > 1e-6 ? [j] : []));
    assert.ok(moved.length > 10, 'Nadel bewegt sich');
    for (const j of moved) assert.ok(Math.abs(Math.hypot(Pm[j][0] - hub.cx, Pm[j][1] - hub.cy) - Math.hypot(P0[j][0] - hub.cx, P0[j][1] - hub.cy)) < 1e-9, 'dreht um die Nabe');
    for (const j of moved) assert.ok(dist(Pe[j], P0[j]) < 1e-9, 'nach 6,5 s wieder in der Ruhelage (wie in 3D)');
    // Spitze zeigt auf halber Strecke nach rechts oben (12°, wie NEEDLE_PEAK in 3D)
    const tip = moved.reduce((m, j) => (Math.hypot(P0[j][0] - hub.cx, P0[j][1] - hub.cy) > Math.hypot(P0[m][0] - hub.cx, P0[m][1] - hub.cy) ? j : m), moved[0]);
    const a = (Math.atan2(Pm[tip][1] - hub.cy, Pm[tip][0] - hub.cx) * 180) / Math.PI;
    assert.ok(Math.abs(a - 12) < 6, `Spitze bei ${a.toFixed(1)}°`);
    // Skala steht
    for (let j = 0; j < P0.length; j++) if (!moved.includes(j)) assert.ok(dist(Pm[j], P0[j]) < 1e-9);
  }
});

const TAU = Math.PI * 2;
function outline({ c, pitch, teeth }, phase) {
  const tip = pitch + 0.07, root = pitch - 0.07, pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = phase + (i / teeth) * TAU, d = TAU / teeth;
    for (const [u, r] of [[0, root], [0.12, root], [0.22, tip], [0.48, tip], [0.58, root], [0.72, root], [0.86, root]]) pts.push([c[0] + Math.cos(a + u * d) * r, c[1] + Math.sin(a + u * d) * r]);
  }
  return pts.flatMap((p, i) => { const q = pts[(i + 1) % pts.length]; return Array.from({ length: 8 }, (_, k) => [p[0] + ((q[0] - p[0]) * k) / 8, p[1] + ((q[1] - p[1]) * k) / 8]); });
}
const inside = (p, P) => { let s = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) s = !s; } return s; };

test('Zahnräder 2D: Zahn greift in Lücke, kein Rad dringt ins andere, Drehzahl umgekehrt proportional zur Zähnezahl', async () => {
  const ph = gearPhases(), W = -0.32;
  for (let k = 1; k < GEARS_2D.length; k++) {
    const a = GEARS_2D[k - 1], c = GEARS_2D[k];
    assert.ok(Math.abs(Math.hypot(c.c[0] - a.c[0], c.c[1] - a.c[1]) - (a.pitch + c.pitch)) < 0.02, 'Achsabstand = Summe der Teilkreise');
    assert.ok(Math.abs(c.w / a.w + a.teeth / c.teeth) < 1e-9, 'gegenläufig, Drehzahl ∝ 1/Zähne');
  }
  for (let t = 0; t < 12; t += 0.04) {
    const P = GEARS_2D.map((g, i) => outline(g, ph[i] + W * g.w * t));
    for (let a = 0; a < P.length; a++) for (let c = 0; c < P.length; c++) if (a !== c) assert.ok(!P[a].some((p) => inside(p, P[c])), `t=${t.toFixed(2)}: Rad ${a} steckt in Rad ${c}`);
  }
  for (const n of [catalogMinDrones('zahnraeder'), 200, 300, 399]) {
    const b = await scene('zahnraeder', n), P0 = pose(b, 0);
    assert.equal(new Set(b.parts).size, n < 170 ? 2 : 3, `${n}: Räder`);
    // jede Drohne fährt starr mit ihrem Rad (Abstand zur Achse bleibt)
    for (const t of [0.5, 1.3, 2.9]) { const P = pose(b, t); b.parts.forEach((g, j) => { const C = GEARS_2D[g].c; assert.ok(Math.abs(Math.hypot(P[j][0] - C[0], P[j][1] - C[1]) - Math.hypot(P0[j][0] - C[0], P0[j][1] - C[1])) < 1e-9); }); }
    // nach einer Zahnteilung des großen Rads (alle Räder drehen genau eine Teilung weiter) steht dasselbe Bild: jede Drohne
    // liegt wieder auf der Ausgangskontur (höchstens einen halben Linienabstand neben einer Ausgangsdrohne)
    const T = TAU / 10 / 0.32, P = pose(b, T), lit = P0.filter((_, j) => !reserve(b.pts[j]));
    const sp = spacing(P0, P0.map((_, i) => i).filter((i) => !reserve(b.pts[i])));
    const off = P.filter((p, j) => !reserve(b.pts[j]) && !lit.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.6 * sp)).length;
    assert.ok(off <= 0.03 * n, `${n}: nach einer Teilung ${off} Drohnen neben dem Ausgangsbild`);
  }
});

test('Handschlag: zwei starre Hände, erst getrennt, dann gleiten sie ineinander (kein Morphing), in allen Show-Arten', async () => {
  for (const tier of ['SPARK', 'HORIZON', 'ODYSSEY']) for (const n of [catalogMinDrones('handschlag'), 200, 300]) {
    const b = (await catalogScene('handschlag', tier, n, '')).beats.at(-1), P0 = pose(b, 0), hands = [0, 1].map((h) => b.parts.flatMap((g, j) => (g === h ? [j] : [])));
    assert.ok(hands.every((h) => h.length > 0.3 * n), 'zwei Hände');
    // starr: jede Hand verschiebt sich als Ganzes (gleicher Versatz für alle ihre Drohnen)
    for (const t of [0.5, 1.5, 2.5, 3.5, 4.4, 5, 6.4]) {
      const P = pose(b, t);
      for (const h of hands) { const d = [P[h[0]][0] - P0[h[0]][0], P[h[0]][1] - P0[h[0]][1]]; for (const j of h) assert.ok(Math.abs(P[j][0] - P0[j][0] - d[0]) < 1e-9 && Math.abs(P[j][1] - P0[j][1] - d[1]) < 1e-9, `${tier}@${n} t=${t}: Hand verformt sich`); }
    }
    // erst getrennt: zwischen den Händen ist Luft (mehr als drei Linienabstände)
    const gap = (P) => Math.min(...hands[0].map((i) => Math.min(...hands[1].map((k) => Math.hypot(P[i][0] - P[k][0], P[i][1] - P[k][1])))));
    const sp = spacing(P0, [...hands[0], ...hands[1]]);
    assert.ok(gap(P0) > 3 * sp, `${tier}@${n}: Hände berühren sich am Anfang`);
    assert.ok(gap(pose(b, 0.8)) > 3 * sp, 'stehen erst getrennt');
    // dann ineinander: die Hände überlappen (die eine liegt in der anderen)
    const end = pose(b, 6.4), box = (h) => [Math.min(...h.map((j) => end[j][0])), Math.max(...h.map((j) => end[j][0]))];
    const [l, r] = hands.map(box); assert.ok(l[1] - r[0] > 0.4, 'Hände greifen ineinander');
    // langsam: Annäherung dauert mehrere Sekunden und beschleunigt sanft
    const x = (t) => pose(b, t)[hands[1][0]][0];
    assert.ok(Math.abs(x(0.8) - x(0)) < 1e-9 && Math.abs(x(4.3) - x(6.4)) < 0.05 && Math.abs(x(2.55) - x(0)) > 0.3 * Math.abs(x(4.3) - x(0)), 'gleiten über ~3,5 s');
    // verdeckt (hintere Hand an Kreuzungen) sind wenige, und nur dort, wo die andere Hand leuchtet
    assert.ok((b.hidden ?? 0) <= 0.08 * n, `${b.hidden} verdeckt`);
  }
});

test('Was sich als Ganzes in der Bildebene dreht, ist rund (Galaxie nicht mehr gestaucht), Mandala/Sonne/Basketball unverändert', async () => {
  for (const key of FLAT.filter((k) => WHOLE_TURN.has(CATALOG[k].motion))) {
    const b = await scene(key), P = pose(b, 0).filter((_, j) => !reserve(b.pts[j]));
    const n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n;
    let a = 0, c = 0, d = 0; for (const p of P) { a += (p[0] - mx) ** 2; c += (p[0] - mx) * (p[1] - my); d += (p[1] - my) ** 2; }
    const tr = (a + d) / n, det = (a * d - c * c) / n / n, l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
    assert.ok(Math.sqrt(l2 / l1) >= 0.84, `${key}: Seitenverhältnis ${Math.sqrt(l2 / l1).toFixed(2)} dreht sich als Oval`);
  }
  // die runden Motive behalten ihre Katalogform (keine Abbildung)
  for (const key of ['mandala', 'sonne', 'basketball']) assert.ok(!(await scene(key)).ownForm, `${key} umgeformt`);
  assert.ok((await scene('galaxie')).ownForm, 'Galaxie rund gezogen');
});
