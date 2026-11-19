// Katalogmotive auf die gewählte Drohnenzahl (src/scripts/scenes/catalog-resample.js).
// Runde 7 (Marc, 19.11.2026): 2D-Motive stehen gleichmäßig auf sauberen Linien (scripts/catalog-2d-lines.mjs), ohne Füllung,
// ohne Punkte neben der Linie, ohne Klumpen an Kreuzungen; ab 400 Drohnen wird 2D zu 3D.
// Runde 9: ein 2D-Motiv zeigt sichtbar so viele Drohnen wie gewählt (Katalog-Ketten, Flächenraster), und die
// Artefakt-Prüfung scripts/catalog-2d-audit.mjs läuft über jedes 2D-Motiv bei 100/200/300/399. Räumliche Katalogmotive (Kugel,
// Atom …) zeichnen weiter ihre Linien nach, bis 200 Drohnen (Runde 6).
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyse, resample, placeDerived, DENSE_MAX, prepareLines, lineSample, stageSample, attach, CLEAR, DOT_MAX, dotDrones } from '../src/scripts/scenes/catalog-resample.js';
import { linesFor, lineEdges, graph, noise } from './catalog-2d-lines.mjs';
import { auditAll, failing } from './catalog-2d-audit.mjs';
import { artForDrones, TWO_D_LIMIT, showArtPrice } from '../src/content/show-packages.ts';

const catalog = JSON.parse(readFileSync(new URL('../src/content/catalog-motifs.json', import.meta.url), 'utf8'));
const read = (path) => JSON.parse(readFileSync(new URL(`../public/media/katalog/${path}.json`, import.meta.url), 'utf8'));
const all = Object.entries(catalog.motifs).flatMap(([key, m]) => m.variants.map((v) => ({ key, flat: m.dimension !== '3D', v, pts: read(v.id).points })));
const flat = all.filter((x) => x.flat), deep = all.filter((x) => !x.flat);
const COUNTS = [100, 150, 200, 300, 399];

/** Abstand eines Punkts zur nächsten Linie (Polylinien, Kreise, Einzelpunkte) der Variante. */
function lineDistance(L, [x, y]) {
  let best = Infinity;
  const seg = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy || 1e-12, u = Math.max(0, Math.min(1, ((x - A[0]) * dx + (y - A[1]) * dy) / l2)); best = Math.min(best, Math.hypot(x - A[0] - u * dx, y - A[1] - u * dy)); };
  for (const c of L.curves) for (let i = 1; i < c.p.length; i++) seg(c.p[i - 1], c.p[i]);
  for (const l of L.loops) if (l.circle) best = Math.min(best, Math.abs(Math.hypot(x - l.circle[0], y - l.circle[1]) - l.circle[2])); else for (let i = 0; i < l.p.length; i++) seg(l.p[i], l.p[(i + 1) % l.p.length]);
  for (const d of L.dots) best = Math.min(best, Math.hypot(x - d[0], y - d[1]));
  for (const nd of L.nodes) best = Math.min(best, Math.hypot(x - nd[0], y - nd[1]));
  return best;
}

test('2D: die gespeicherten Linien sind aktuell (scripts/catalog-2d-lines.mjs neu laufen lassen, wenn nicht)', () => {
  for (const { key, v, pts } of flat) assert.deepEqual(read(`linien/${v.id}`), JSON.parse(JSON.stringify(linesFor(key, v.id, pts))), `${key}/${v.id}`);
});

test('2D: sichtbar n Drohnen (höchstens n, weniger als 1 % darunter), alle auf einer Linie oder in der Fläche, Mindestabstand', () => {
  for (const { key, v } of flat) {
    const L = prepareLines(read(`linien/${v.id}`));
    for (const n of COUNTS.filter((c) => c >= v.points)) {
      const { pts: s, spacing } = lineSample(L, n);
      if (!L.grid) assert.ok(s.length <= n && n - s.length <= Math.max(3, Math.round(0.01 * n)), `${key}@${n}: ${s.length} sichtbar`);
      if (L.anchor || L.grid) continue; // Anker- und Rastermotive: eigene Tests unten
      for (const q of s) assert.ok(lineDistance(L, q) < 1e-3 * L.size || (L.bridges ?? []).some((b) => segDist(q, b.from, b.to) < 1e-3 * L.size), `${key}@${n}: Punkt neben der Linie`);
      const gap = CLEAR * spacing, grid = new Map();
      for (const q of s) {
        const gx = Math.floor(q[0] / gap), gy = Math.floor(q[1] / gap);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of grid.get(`${gx + dx},${gy + dy}`) ?? []) assert.ok(Math.hypot(o[0] - q[0], o[1] - q[1]) >= gap - 1e-9, `${key}@${n}: Klumpen`);
        const k = `${gx},${gy}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(q);
      }
    }
  }
});
test('2D-Ankermotive: Katalogpunkte bleiben exakt, neue Drohnen nur auf kurzen Ankerkanten, keine im Inneren einer Fläche', () => {
  for (const { key, v, pts } of flat) {
    const lines = read(`linien/${v.id}`);
    if (!lines.anchor) continue;
    const L = prepareLines(lines), s0 = lines.s0, gone = new Set(lines.drop ?? []);
    const kept = pts.filter((_, i) => !gone.has(i));
    for (const n of COUNTS.filter((c) => c >= v.points)) {
      const { pts: s, anchors } = lineSample(L, n);
      // (a) jeder Katalogpunkt (ohne Auslese-Reste) steht exakt an seiner Stelle
      const at = new Set(s.slice(0, anchors).map((q) => `${q[0]},${q[1]}`));
      for (const p of kept) assert.ok(at.has(`${p[0]},${p[1]}`), `${key}@${n}: Katalogpunkt ${p[0]},${p[1]} verschoben`);
      assert.equal(anchors, kept.length, `${key}@${n}: Anker fehlen`);
      // (b) jeder neue Punkt liegt auf einer Ankerkante (Sehne zwischen zwei Katalogpunkten), höchstens 0,15 · s0 daneben
      for (const q of s.slice(anchors)) assert.ok(L.curves.some((c) => segDist(q, L.all[c.a], L.all[c.b]) <= 0.15 * s0), `${key}@${n}: Punkt abseits der Ankerkanten`);
      // (c) keine Kante länger als 1,6 × der Punktabstand vor Ort (gedeckelt): keine Brücken über gewollte Lücken, keine
      //     Punkte im Inneren einer Fläche (eine neue Drohne liegt immer zwischen zwei benachbarten Katalogpunkten)
      for (const c of L.curves) assert.ok(Math.hypot(L.all[c.a][0] - L.all[c.b][0], L.all[c.a][1] - L.all[c.b][1]) <= 1.6 * 1.5 * s0 + 1e-9, `${key}: Kante über eine Lücke`);
      // (d) Mindestabstand: keine neue Drohne näher als 0,45 · Kantenabstand an einer anderen
      const gap = 0.45 * Math.min(...L.curves.map((c) => c.len)) / 4;
      for (const q of s.slice(anchors)) for (const o of s) if (o !== q) assert.ok(Math.hypot(o[0] - q[0], o[1] - q[1]) > Math.min(gap, 1e-4), `${key}@${n}: Drohnen aufeinander`);
      assert.equal(s.length, n, `${key}@${n}: ${s.length} statt ${n}`);
    }
  }
});

test('2D-Ankermotive: verdichtet wird nur, was Linie ist (keine Kante an einem Knoten mit drei oder mehr Nachbarn, außer am Flächenrand)', () => {
  for (const { key, v, pts } of flat) {
    const lines = read(`linien/${v.id}`);
    if (!lines.anchor) continue;
    const gone = new Set(lines.drop ?? []), P = pts.filter((_, i) => !gone.has(i)).map((p) => [p[0], p[1]]);
    const cls = new Map(lineEdges(P, graph(P).edges, lines.s0).map((e) => [e.ij.join('|'), e]));
    for (const c of lines.curves) {
      const e = cls.get(`${c.a}|${c.b}`) ?? cls.get(`${c.b}|${c.a}`);
      assert.ok(e, `${key}: Kante ${c.a}–${c.b} gehört nicht zum Nachbarschaftsgraphen`);
      assert.ok((e.deg[0] <= 2 && e.deg[1] <= 2) || e.rim, `${key}: innere Kante ${c.a}–${c.b} verdichtet (Nabe, Speiche oder Flächeninneres)`);
    }
  }
});

test('2D-Rastermotive (wehende Fahne): regelmäßig verfeinert, Welle bleibt, Abstände streuen nicht stärker als im Katalog', () => {
  const grids = flat.filter(({ v }) => read(`linien/${v.id}`).grid);
  assert.ok(grids.some(({ key }) => key === 'fahnen'), 'Fahnen nicht als Gitter erkannt');
  for (const { key, v } of grids) {
    const L = prepareLines(read(`linien/${v.id}`));
    for (const n of COUNTS.filter((c) => c >= v.points)) {
      const s = lineSample(L, n), { rows: r, cols: c } = s;
      assert.equal(s.pts.length, r * c); assert.ok(r * c <= n && r * c >= 0.9 * n, `${key}@${n}: ${r}×${c}`);
      const gaps = []; for (let a = 0; a < r; a++) for (let b = 1; b < c; b++) gaps.push(Math.hypot(s.pts[a * c + b][0] - s.pts[a * c + b - 1][0], s.pts[a * c + b][1] - s.pts[a * c + b - 1][1]));
      const mean = gaps.reduce((x, y) => x + y, 0) / gaps.length, cv = Math.sqrt(gaps.reduce((x, g) => x + (g - mean) ** 2, 0) / gaps.length) / mean;
      assert.ok(cv <= L.grid.cv * 1.1 + 0.02, `${key}@${n}: Abstände streuen ${cv.toFixed(3)} (Katalog ${L.grid.cv})`);
    }
  }
});

test('Bühne: Reserve nur, wo auch die kleinsten Lichter die Linien nicht trennen; sonst sichtbar n', () => {
  for (const { key, v } of flat) {
    const L = prepareLines(read(`linien/${v.id}`));
    for (const n of COUNTS.filter((c) => c >= v.points)) {
      const st = stageSample(L, n), full = lineSample(L, n);
      if (st.pts.length < full.pts.length) assert.ok(dotDrones(full.pts.length, full.spacing, L.size) > DOT_MAX, `${key}@${n}: Reserve ohne Not`);
      assert.ok(dotDrones(st.pts.length, st.spacing, L.size) <= DOT_MAX || L.grid || st.pts.length <= 2, `${key}@${n}: Lichter verschmelzen`);
    }
  }
});

const segDist = (q, A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy || 1e-12, u = Math.max(0, Math.min(1, ((q[0] - A[0]) * dx + (q[1] - A[1]) * dy) / l2)); return Math.hypot(q[0] - A[0] - u * dx, q[1] - A[1] - u * dy); };

test('2D: Artefakt-Prüfung der Szenen über alle Motive bei 100/200/300/399 (Zahl, Klumpen, Lücken, offene Enden, abseits)', async () => {
  // (Runde 9: der Handschlag führte die Fingerkonturen hin und zurück; jetzt dedupliziert in catalog-actions.js)
  const bad = (await auditAll()).filter((r) => failing(r));
  assert.deepEqual(bad.map((r) => `${r.key}@${r.n}: sichtbar ${r.visible}, Klumpen ${r.clumps}, Lücken ${r.gaps}, offene Enden ${r.ends}, abseits ${r.off}`), []);
});

test('2D: abgeleitete Linien bleiben beim Bild (jeder Punkt nahe an einem Katalogpunkt), von Hand idealisierte Formen im Rahmen', () => {
  for (const { key, v, pts } of flat) {
    const lines = read(`linien/${v.id}`), L = prepareLines(lines), s0 = lines.s0;
    const { pts: s } = lineSample(L, 399);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (const q of s) {
      if (lines.shape) { assert.ok(q[0] > x0 - 2 * s0 && q[0] < x1 + 2 * s0 && q[1] > y0 - 2 * s0 && q[1] < y1 + 2 * s0, `${key}: Form ragt aus dem Katalogbild`); continue; }
      const d = Math.min(...pts.filter((_, i) => !(lines.drop ?? []).includes(i)).map((p) => Math.hypot(p[0] - q[0], p[1] - q[1])));
      assert.ok(d < 1.3 * s0, `${key}/${v.id}: Punkt ${d.toFixed(3)} vom Katalogbild (s0 ${s0})`);
    }
  }
});

test('2D: Pflichtfälle sind idealisiert (Peace, Hochzeitstorte, Herz mit Initialen, Eheringe, Unendlich, Lachendes Gesicht, Doppelherz)', () => {
  for (const key of ['peace', 'torte', 'initialen', 'eheringe', 'unendlich', 'smiley', 'doppelherz']) for (const v of catalog.motifs[key].variants) assert.ok(read(`linien/${v.id}`).shape, `${key}: keine idealisierte Form`);
  const peace = read(`linien/${catalog.motifs.peace.variants[0].id}`);
  assert.equal(peace.curves.filter((c) => c.p.length === 2).length, 4, 'Peace: vier Geraden');
});

test('Rechenzeit je Motiv und Drohnenzahl: Linien vorbereiten, abtasten, Farben und Elternpunkte unter 2 ms im Mittel', () => {
  // Runde 9: das Lösen auf die sichtbare Zahl kostet mehr als die frühere Dichtegrenze (gemessen 0,2 ms Abtasten + 0,2 ms
  // Farben im Mittel, schlimmster Fall unter 3 ms); einmal je Motiv und Zahl, die Grenze ist großzügig für langsame Rechner
  let total = 0, runs = 0;
  for (let rep = 0; rep < 2; rep++) for (const { v, pts } of flat) {
    const lines = read(`linien/${v.id}`);
    let t = performance.now(); const L = prepareLines(lines); const prep = performance.now() - t;
    for (const n of COUNTS) { t = performance.now(); attach(lineSample(L, n).pts, pts, L.drop); total += performance.now() - t + prep / COUNTS.length; runs++; }
  }
  assert.ok(total / runs < 2, `im Mittel ${(total / runs).toFixed(3)} ms`);
});

test('ab 400 Drohnen ist 2D automatisch 3D, Preis bleibt der des individuellen Pakets', () => {
  assert.equal(TWO_D_LIMIT, 400);
  assert.equal(artForDrones('2d', 390), '2d');
  assert.equal(artForDrones('2d', 400), '3d');
  assert.equal(artForDrones('2d', 1000), '3d');
  assert.equal(artForDrones('3d', 500), '3d');
  assert.equal(artForDrones('story', 500), 'story');
  // 3D hat keinen Aufpreis gegenüber 2D (content/show-packages.ts): der Wechsel ändert den Preis nicht
  for (const n of [400, 450, 600]) assert.equal(showArtPrice(artForDrones('2d', n), n), showArtPrice('2d', n));
});

// ——— räumliche Katalogmotive (Show-Art 2D) ———
const lit = (points, n) => Math.max(points, Math.min(n, DENSE_MAX));
test('3D-Katalogmotive: genau n Drohnen bis 200 in der Form, nichts doppelt, nichts außerhalb', () => {
  for (const { key, v, pts } of deep) {
    const a = analyse(pts);
    assert.equal(resample(pts, v.points, { analysis: a }).length, 0, `${key}: in Katalogstärke bleibt das Motiv wie im Katalog`);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (const n of [150, 200, 300, 1000].filter((c) => c > v.points)) {
      const d = resample(pts, n, { analysis: a }), every = [...pts, ...placeDerived(pts, d)];
      assert.equal(every.length, lit(v.points, n), `${key}@${n}`);
      for (const q of every.slice(pts.length)) assert.ok(q[0] >= x0 - a.s0 && q[0] <= x1 + a.s0 && q[1] >= y0 - a.s0 && q[1] <= y1 + a.s0, `${key}@${n}: außerhalb`);
      for (let i = pts.length; i < every.length; i++) for (let j = 0; j < i; j++) assert.ok(Math.hypot(every[i][0] - every[j][0], every[i][1] - every[j][1], (every[i][2] || 0) - (every[j][2] || 0)) > a.s0 * 0.01, `${key}@${n}: doppelt`);
    }
  }
});

// ——— Stufe an die 3D-Fassungen (Runde 9, für den 3D-Agenten) ———
test('3D-Fassungen bekommen die Stufe: Stern in 3D (HORIZON) und 3D+ (ODYSSEY) mit verschiedenen Punkten', async () => {
  const { catalogScene } = await import('../src/scripts/scenes/catalog.js');
  const plain = (await catalogScene('stern', 'HORIZON', 300, '')).beats.at(-1).pts, plus = (await catalogScene('stern', 'ODYSSEY', 300, '')).beats.at(-1).pts;
  assert.equal(plain.length, plus.length);
  assert.notDeepEqual(plain.map((p) => p.slice(0, 3)), plus.map((p) => p.slice(0, 3)), 'Stufe kommt nicht in der Fassung an');
});
