// Runde 17: Wächter für den Totenkopf mit Zylinder (src/scripts/scenes/totenkopf.js) und die Bokkenrijders-Geschichte
// (scenes/bokkenrijders.js). Marc: „muss genau die räumliche Tiefe der echten Bokkenrijders-3D-Maske haben“. Geprüft wird
// gegen die echte Maske (public/media/projekte/bokkenrijders/formation.json): Tiefe und Punktdichte wie dort, gleichmäßige
// Abstände, die Teile aus der Show (Säulen des Zylinders, Krempe, Zahnreihen, Tränen, Licht in den Augenhöhlen). Dazu die
// Geschichte: Farbwechsel unterwegs ohne Sprung an den Bildgrenzen (mit und ohne Paketfarbe), Hut lüften mit
// Schädeldecke, Bluttränen, Glühen, die Maske mit dem Grinsen am Anfang und am Ende, Bewegung in Drohnengrenzen, und
// der Farb- und Nahtlos-Haken der Engine (show-field.js). Aufruf: node --test scripts/totenkopf.test.mjs
import { simulate } from './show-sim.mjs'; // stellt die Attrappen für show-field.js bereit
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { skullHatBody } = await import('../src/scripts/scenes/totenkopf.js');
const { buildSequence } = await import('../src/scripts/show-scenes.js');
const { createField } = await import('../src/scripts/show-field.js');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { SHOW_PACKAGES } = await import('../src/content/show-packages.ts');
const { LIMITS } = await import('../src/scripts/show-flight.js');
void simulate;

const MASK = (() => {
  const d = JSON.parse(readFileSync(new URL('../public/media/projekte/bokkenrijders/formation.json', import.meta.url), 'utf8'));
  const mx = Math.max(...d.dots.map((q) => Math.max(Math.abs(q[0]), Math.abs(q[1]))));
  return d.dots.map(([x, y, , , , , z]) => [x / mx, y / mx, (z ?? 0) / mx]);
})();
const nearest = (pts) => pts.map((p, i) => { let m = Infinity; for (let j = 0; j < pts.length; j++) if (j !== i) m = Math.min(m, Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1], p[2] - pts[j][2])); return m; });
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const extent = (pts, k) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
const nearWhite = (c) => Math.min(...c) > 190 && Math.max(...c) - Math.min(...c) < 45;
const dist3 = (a, b, o = 0) => Math.hypot(a[o] - b[o], a[o + 1] - b[o + 1], a[o + 2] - b[o + 2]);

const motif = OCCASIONS.find((o) => o.id === 'kultur').motifs.find((m) => m.id === 'teufel');
const story = async (n, tint) => (await buildSequence([motif], 'ODYSSEY', n, tint, 'kultur')).beats.filter((b) => !b.interlude);
const raw = (b) => b.steady?.raw ?? b.live;
const end = (b) => b.steady?.end ?? b.hold;
/** Lage, Licht, Farbe nach t Sekunden der eigenen Uhr eines Bildes: [x, y, z, Licht, r, g, b]. */
const pose = (b, t) => b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1, NaN, 0, 0]; raw(b)?.(p, j, t, o); if (!(o[4] === o[4])) { o[4] = p[3]; o[5] = p[4]; o[6] = p[5]; } return o; });

test('Körper: genau k Drohnen, gleichmäßige Abstände, kein Paar zu nah', () => {
  for (const k of [400, 450, 500, 550, 600]) {
    const { pts, tags, D } = skullHatBody(k);
    assert.equal(pts.length, k);
    assert.ok(pts.every((p) => p.length === 3 && p.every(Number.isFinite)), `${k}: ungültige Punkte`);
    const nn = nearest(pts);
    assert.ok(Math.min(...nn) >= 0.7 * D, `${k}: zwei Drohnen ${Math.min(...nn).toFixed(3)} auseinander (D ${D.toFixed(3)})`);
    // die freien Flächen stehen so dicht wie die festen Linien (Säulen, Ringe, Zahnreihen)
    const free = median(nn.filter((_, j) => tags[j] === 'schaedel' || tags[j] === 'kiefer')) / D;
    assert.ok(free > 0.8 && free < 1.15, `${k}: Schädel im Median ${free.toFixed(2)} · D`);
  }
});

test('Räumliche Tiefe und Punktdichte wie die echte Maske, die Teile aus der Show', () => {
  const { pts, tags } = skullHatBody(600);
  const depth = extent(pts, 2) / extent(pts, 0), maskDepth = extent(MASK, 2) / extent(MASK, 0);
  assert.ok(depth >= maskDepth, `Tiefe/Breite ${depth.toFixed(2)}, Maske ${maskDepth.toFixed(2)}`);
  // Punktdichte: Median-Abstand im Verhältnis zur Höhe der Figur, wie bei der Maske (±35 %)
  const rel = median(nearest(pts)) / extent(pts, 1), maskRel = median(nearest(MASK)) / extent(MASK, 1);
  assert.ok(Math.abs(rel / maskRel - 1) < 0.35, `Abstand/Höhe ${rel.toFixed(4)}, Maske ${maskRel.toFixed(4)}`);
  // ein Körper, keine Fläche: Drohnen auf der Vorderseite und weit hinten an den Seiten des Schädels
  const skull = pts.filter((_, j) => tags[j] === 'schaedel');
  assert.ok(extent(skull, 2) > 0.5, `Schädel nur ${extent(skull, 2).toFixed(2)} tief`);
  const count = (t) => tags.filter((x) => x === t).length;
  for (const t of ['zylinder', 'krempe', 'zaehne', 'zaehneUnten', 'rand', 'traene', 'decke', 'schaedel', 'kiefer']) assert.ok(count(t) >= 8, `${t}: ${count(t)}`);
  assert.equal(count('glut'), 2, 'ein Licht in jeder Augenhöhle');
  // Zylinder in senkrechten Säulen wie in der Show (rund elf von vorn)
  const columns = new Set(pts.filter((_, j) => tags[j] === 'zylinder').map((p) => Math.atan2(p[0], p[2] + 0.05).toFixed(3))).size;
  assert.ok(columns >= 9 && columns <= 15, `${columns} Säulen`);
});

test('Geschichte: Maske → Umbau → Totenkopf → Umbau → Maske, nahtlos, Maske im Original', async () => {
  for (const n of [400, 600, 1000]) {
    const beats = await story(n);
    assert.equal(beats.length, 5, `${n}: ${beats.length} Bilder`);
    const k = Math.min(n, 600);
    for (const b of beats) assert.equal(b.pts.length + (b.offstageDrones ?? 0), n);
    assert.ok(beats[1].umbau && beats[3].umbau, 'zwei Umbauten');
    assert.equal(beats[2].pts.length, k, 'der Totenkopf nutzt so viele Drohnen wie die Maske');
    for (const i of [1, 2, 3, 4]) assert.ok(beats[i].seamless, `Bild ${i} beginnt ohne Pause`);
    assert.equal(beats[0].frame, beats[2].frame, 'ein Bildausschnitt');
  }
});

for (const [label, tint] of [['ohne Paketfarbe', undefined], ['mit Paketfarbe ODYSSEY', SHOW_PACKAGES.ODYSSEY.color]]) {
  test(`Farbe wechselt unterwegs, ohne Sprung an den Bildgrenzen (${label})`, async () => {
    const beats = await story(600, tint);
    for (const i of [1, 3]) {
      const m = beats[i], prev = beats[i - 1], next = beats[i + 1], A = pose(prev, end(prev)), S = pose(m, 0), E = pose(m, end(m)), B = pose(next, 0);
      // Anfang = Ende des alten Bildes, auch in der Farbe (der Totenkopf endet glühend)
      for (let j = 0; j < prev.pts.length; j++) if (A[j][3] > 0.05) assert.ok(dist3(A[j], S[j], 4) < 1.5, `Umbau ${i}, Drohne ${j}: Farbe springt am Anfang`);
      // Ende = Anfang des neuen Bildes: jede leuchtende Drohne hat die Farbe ihres Platzes
      for (const o of E.filter((o) => o[3] > 0.05)) {
        const q = B.find((b) => dist3(o, b) < 1e-6);
        assert.ok(q, `Umbau ${i}: Drohne nicht auf einem Platz`);
        assert.ok(dist3(o, q, 4) < 1.5, `Umbau ${i}: kommt in [${o.slice(4).map(Math.round)}] statt [${q.slice(4).map(Math.round)}] an`);
      }
      // unterwegs dazwischen: zur Mitte ihres Flugs hat eine Drohne mit deutlichem Farbwechsel eine Zwischenfarbe
      const { leave, fly } = m.umbau;
      let mixed = 0, changing = 0;
      for (let j = 0; j < m.pts.length; j++) {
        if (S[j][3] < 0.05 || E[j][3] < 0.05 || dist3(S[j], E[j], 4) < 80) continue;
        changing++;
        const t = leave[j] + fly / 2, c = pose(m, t)[j];
        if (dist3(c, S[j], 4) > 15 && dist3(c, E[j], 4) > 15) mixed++;
      }
      assert.ok(changing > 50 && mixed / changing > 0.9, `Umbau ${i}: ${mixed} von ${changing} Drohnen mischen die Farbe im Flug`);
    }
  });
}

test('Totenkopf: Hut lüften mit Schädeldecke, Bluttränen, Glühen; am Ende keine fast weißen eigenen Farben', async () => {
  const beats = await story(600), head = beats[2], tags = skullHatBody(600).tags, T = end(head);
  const at = (t) => pose(head, t);
  const p0 = at(0), up = at(2.0), cried = at(5.6), last = at(T);
  const idx = (t) => tags.map((x, j) => (x === t ? j : -1)).filter((j) => j >= 0);
  assert.ok(idx('decke').every((j) => p0[j][3] < 0.05), 'Schädeldecke dunkel, solange der Hut sitzt');
  assert.ok(tags.every((x, j) => x === 'decke' || p0[j][3] > 0.5), 'sonst leuchtet alles');
  const lift = Math.min(...idx('zylinder').map((j) => up[j][1] - p0[j][1]));
  assert.ok(lift > 0.12, `der Hut hebt sich nur um ${lift.toFixed(2)}`);
  const capLit = idx('decke').filter((j) => up[j][3] > 0.5).length / idx('decke').length;
  assert.ok(capLit > 0.8, `unter dem gelüfteten Hut leuchten nur ${(capLit * 100).toFixed(0)} % der Schädeldecke`);
  assert.ok(idx('traene').every((j) => cried[j][4] > 200 && cried[j][5] < 90), 'die Tränen sind rot');
  assert.ok(idx('schaedel').every((j) => cried[j][5] > 200), 'der Schädel selbst bleibt eisweiß, bis er glüht');
  assert.ok(tags.every((x, j) => x === 'decke' || (last[j][4] > 200 && last[j][5] < 110 && last[j][6] < 80)), 'am Ende glüht alles');
  // eigene Farben aus live bekommen keine Paketfarbe (show-scenes.js, nearWhite): am Ende, wo der Umbau die Farben
  // übernimmt, ist keine fast weiß (unterwegs beim Glühen darf ein Ton kurz weißlich sein; die Bildgrenzen prüft der Farbtest)
  for (const [j, p] of head.pts.entries()) {
    const o = [p[0], p[1], p[2], 1, NaN, 0, 0]; raw(head)(p, j, T, o);
    if (o[4] === o[4]) assert.ok(!nearWhite(o.slice(4)), `Drohne ${j}: am Ende fast weiß`);
  }
});

test('Maske: am Anfang erst das Grinsen, am Ende bleibt nur das Grinsen; dazwischen die ganze Maske', async () => {
  const beats = await story(600), first = beats[0], last = beats[4];
  const lit = (o) => o.filter((q) => q[3] > 0.05).length;
  const grin = first.pts.filter((p) => p[3] > 200 && p[4] > 100).length;
  assert.equal(lit(pose(first, 0)), grin, 'zuerst nur Zähne und Augen');
  assert.equal(lit(pose(first, end(first))), 600, 'dann die ganze Maske');
  assert.equal(lit(pose(last, 2.5)), 600, 'Standbild bei reduzierter Bewegung: die ganze Maske');
  assert.equal(lit(pose(last, end(last))), grin, 'am Ende nur das Grinsen');
});

test('Bewegung in Drohnengrenzen (Hut, Schwenk, Hörner)', async () => {
  const beats = await story(600);
  for (const [i, b] of beats.entries()) {
    if (b.umbau) continue; // Umbauten: scripts/umbau.test.mjs
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of b.fitPts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const s = 0.9 / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75), dt = 1 / 30;
    let v = 0, a = 0;
    for (let j = 0; j < b.pts.length; j += 3) {
      const p = b.pts[j]; let prev = null, pv = null;
      for (let t = 0; t <= b.hold + 1e-9; t += dt) {
        const o = [p[0], p[1], p[2] || 0, 1, NaN, 0, 0]; b.live(p, j, t, o);
        if (prev) { const w = [0, 1, 2].map((c) => ((o[c] - prev[c]) / dt) * s); v = Math.max(v, Math.hypot(...w)); if (pv) a = Math.max(a, Math.hypot(...w.map((x, c) => (x - pv[c]) / dt))); pv = w; }
        prev = o;
      }
    }
    assert.ok(v < LIMITS.speed * 0.8, `Bild ${i}: ${v.toFixed(2)} Einheiten/s`);
    assert.ok(a < LIMITS.accel, `Bild ${i}: Beschleunigung ${a.toFixed(2)}`);
  }
});

test('Engine: live setzt die Farbe einer Drohne; ein nahtloses Bild beginnt ohne Mindestflugzeit', () => {
  const canvas = document.createElement('canvas'), field = createField(canvas, {});
  const pts = [[0, 0, 0, 246, 241, 232], [0.3, 0, 0, 246, 241, 232], [0, 0.3, 0, 246, 241, 232]];
  const painted = { pts, hold: 2, segment: 0, live: (b, j, t, o) => { if (j === 1) { o[4] = 10; o[5] = 20; o[6] = 30; } } };
  // gleicher Bildausschnitt in beiden Abschnitten (wie in einer Geschichte): auch die beiden anderen Bilder haben live
  const still = () => {};
  const scene = { beats: [painted, { pts, hold: 2, segment: 1, seamless: true, live: still }, { pts, hold: 2, segment: 1, live: still }], loopTo: 0 };
  field.show(scene, 3, 1, { instant: true });
  const d = field.drones(3);
  assert.deepEqual(d[1].slice(3), [10, 20, 30], 'die Farbe aus live');
  assert.deepEqual(d[0].slice(3), [246, 241, 232], 'ohne eigene Farbe gilt die des Punkts');
  field.goto(1);
  assert.equal(canvas.dataset.flight, '0.00', 'alle Drohnen stehen schon an ihrem Platz: keine Wartezeit');
  field.goto(2);
  assert.notEqual(canvas.dataset.flight, '0.00', 'ohne seamless bleibt die Mindestflugzeit');
});
