// Katalogmotive auf die gewählte Drohnenzahl (src/scripts/scenes/catalog-resample.js).
// Runde 7 (Marc, 19.11.2026): 2D-Motive stehen gleichmäßig auf sauberen Linien (scripts/catalog-2d-lines.mjs), ohne Füllung,
// ohne Punkte neben der Linie, ohne Klumpen an Kreuzungen; ab 400 Drohnen wird 2D zu 3D. Räumliche Katalogmotive (Kugel,
// Atom …) zeichnen weiter ihre Linien nach, bis 200 Drohnen (Runde 6).
import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyse, resample, placeDerived, DENSE_MAX, prepareLines, lineSample, attach, CLEAR, DENSE_SPACING } from '../src/scripts/scenes/catalog-resample.js';
import { deriveLines, HINTS } from './catalog-2d-lines.mjs';
import { artForDrones, TWO_D_LIMIT, showArtPrice } from '../src/content/show-packages.ts';

const catalog = JSON.parse(readFileSync(new URL('../src/content/catalog-motifs.json', import.meta.url), 'utf8'));
const read = (path) => JSON.parse(readFileSync(new URL(`../public/media/katalog/${path}.json`, import.meta.url), 'utf8'));
const all = Object.entries(catalog.motifs).flatMap(([key, m]) => m.variants.map((v) => ({ key, flat: m.dimension !== '3D', v, pts: read(v.id).points })));
const flat = all.filter((x) => x.flat), deep = all.filter((x) => !x.flat);
const COUNTS = [100, 150, 200, 300, 390];

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
  for (const { key, v, pts } of flat) assert.deepEqual(read(`linien/${v.id}`), JSON.parse(JSON.stringify(deriveLines(pts, HINTS[key]))), `${key}/${v.id}`);
});

test('2D: höchstens n Drohnen, alle auf einer Linie, kein Paar enger als CLEAR · Linienabstand, mehr Drohnen nie weniger Licht', () => {
  for (const { key, v, pts } of flat) {
    const L = prepareLines(read(`linien/${v.id}`));
    if (L.keep) { // Katalogpunkte ohne Verdichtung: genau FlyingStars' Punkte, keiner fällt weg
      for (const n of COUNTS.filter((c) => c >= v.points)) assert.deepEqual(lineSample(L, n).pts.map((q) => [q[0], q[1]]), pts.map((p) => [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4]), `${key}@${n}: Katalogpunkte verändert`);
      continue;
    }
    let last = 0;
    for (const n of COUNTS.filter((c) => c >= v.points)) {
      const { pts: s, spacing } = lineSample(L, n);
      assert.ok(s.length <= n && s.length > 0, `${key}@${n}: ${s.length} Drohnen`);
      assert.ok(spacing >= DENSE_SPACING * L.size - 1e-12, `${key}@${n}: dichter als DENSE_SPACING`);
      for (const q of s) assert.ok(lineDistance(L, q) < 1e-3 * L.size, `${key}@${n}: Punkt neben der Linie`);
      // Mindestabstand (Raster mit Zellgröße = Mindestabstand)
      const gap = CLEAR * spacing, grid = new Map();
      for (const q of s) {
        const gx = Math.floor(q[0] / gap), gy = Math.floor(q[1] / gap);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of grid.get(`${gx + dx},${gy + dy}`) ?? []) assert.ok(Math.hypot(o[0] - q[0], o[1] - q[1]) >= gap - 1e-9, `${key}@${n}: Klumpen`);
        const k = `${gx},${gy}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(q);
      }
      assert.ok(s.length >= last, `${key}@${n}: weniger Licht als bei weniger Drohnen`);
      last = s.length;
    }
  }
});

test('2D: abgeleitete Linien bleiben beim Bild (jeder Punkt nahe an einem Katalogpunkt), von Hand idealisierte Formen im Rahmen', () => {
  for (const { key, v, pts } of flat) {
    const lines = read(`linien/${v.id}`), L = prepareLines(lines), s0 = lines.s0;
    const { pts: s } = lineSample(L, 390);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (const q of s) {
      if (lines.shape) { assert.ok(q[0] > x0 - 2 * s0 && q[0] < x1 + 2 * s0 && q[1] > y0 - 2 * s0 && q[1] < y1 + 2 * s0, `${key}: Form ragt aus dem Katalogbild`); continue; }
      const d = Math.min(...pts.map((p) => Math.hypot(p[0] - q[0], p[1] - q[1])));
      assert.ok(d < 1.25 * s0, `${key}/${v.id}: Punkt ${d.toFixed(3)} vom Katalogbild (s0 ${s0})`);
    }
  }
});

test('2D: Pflichtfälle sind idealisiert (Peace, Hochzeitstorte, Herz mit Initialen, Eheringe, Unendlich, Lachendes Gesicht, Doppelherz)', () => {
  for (const key of ['peace', 'torte', 'initialen', 'eheringe', 'unendlich', 'smiley', 'doppelherz']) for (const v of catalog.motifs[key].variants) assert.ok(read(`linien/${v.id}`).shape, `${key}: keine idealisierte Form`);
  const peace = read(`linien/${catalog.motifs.peace.variants[0].id}`);
  assert.equal(peace.curves.filter((c) => c.p.length === 2).length, 4, 'Peace: vier Geraden');
});

test('Rechenzeit je Motiv und Drohnenzahl: Linien vorbereiten, abtasten, Farben und Elternpunkte unter 1 ms im Mittel', () => {
  // vorher (Runde 6, gemessen am 19.11.2026): Analyse 0,29 ms je Variante + Abtastung 0,06 ms je Zahl; die Linien kommen
  // jetzt vorberechnet, zur Laufzeit bleibt nur das Abtasten (die Grenze ist großzügig, auch für langsame Rechner)
  let total = 0, runs = 0;
  for (let rep = 0; rep < 2; rep++) for (const { v, pts } of flat) {
    const lines = read(`linien/${v.id}`);
    let t = performance.now(); const L = prepareLines(lines); const prep = performance.now() - t;
    for (const n of COUNTS) { t = performance.now(); attach(lineSample(L, n).pts, pts); total += performance.now() - t + prep / COUNTS.length; runs++; }
  }
  assert.ok(total / runs < 1, `im Mittel ${(total / runs).toFixed(3)} ms`);
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
