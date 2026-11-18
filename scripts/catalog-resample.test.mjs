// Runde 5 (Marc, 18.11.2026: „mehr Drohnen bringen mehr Schärfe“): Katalogmotive werden auf die gewählte Drohnenzahl
// abgetastet (src/scripts/scenes/catalog-resample.js). Geprüft für jede Variante jedes Katalogmotivs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyse, resample, placeDerived } from '../src/scripts/scenes/catalog-resample.js';

const catalog = JSON.parse(readFileSync(new URL('../src/content/catalog-motifs.json', import.meta.url), 'utf8'));
const variants = Object.entries(catalog.motifs).flatMap(([key, m]) => m.variants.map((v) => ({ key, flat: m.dimension !== '3D', v, pts: JSON.parse(readFileSync(new URL(`../public/media/katalog/${v.id}.json`, import.meta.url), 'utf8')).points })));
const COUNTS = [200, 300, 500, 1000];

test('jede neue Drohne gehört zur Form: genau n Drohnen, nichts doppelt, nichts außerhalb', () => {
  for (const { key, flat, v, pts } of variants) {
    const a = analyse(pts, { flat });
    assert.equal(resample(pts, v.points, { flat, analysis: a }).length, 0, `${key}: in Katalogstärke bleibt das Motiv wie im Katalog`);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const pad = a.s0;
    for (const n of COUNTS.filter((c) => c > v.points)) {
      const d = resample(pts, n, { flat, analysis: a }), all = [...pts, ...placeDerived(pts, d)];
      assert.equal(all.length, n, `${key}@${n}: alle Drohnen in der Form`);
      for (const q of all.slice(pts.length)) assert.ok(q[0] >= x0 - pad && q[0] <= x1 + pad && q[1] >= y0 - pad && q[1] <= y1 + pad, `${key}@${n}: Punkt außerhalb der Form`);
      // keine doppelt belegten Punkte: kein neuer Punkt fällt auf einen anderen (Raster-Nachbarschaft, Abstand > 1 % von s0)
      const cell = a.s0 / 4, grid = new Map(), min = a.s0 * 0.01;
      for (const [i, q] of all.entries()) {
        const gx = Math.floor(q[0] / cell), gy = Math.floor(q[1] / cell);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
          const r = all[j], dz = flat ? 0 : (q[2] || 0) - (r[2] || 0);
          assert.ok(Math.hypot(q[0] - r[0], q[1] - r[1], dz) > min, `${key}@${n}: Drohnen ${j} und ${i} liegen aufeinander`);
        }
        const k = `${gx},${gy}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i);
      }
    }
  }
});

test('Reihenfolge: erst die Linien (außen dichter als innen), Füllung erst ab dreifacher Liniendichte', () => {
  for (const { key, flat, v, pts } of variants) {
    const a = analyse(pts, { flat });
    const lines = a.edges.filter((e) => !e.ring);
    if (!lines.length) continue;
    // doppelt: nur Linienpunkte, keine Füllung
    const few = resample(pts, Math.ceil(v.points * 2), { flat, analysis: a });
    assert.ok(few.every((q) => q.light === 1), `${key}: Füllung vor den Linien`);
  }
});

test('Vorrang an einer Testfigur: Quadrat mit Binnenkreuz, die Außenkontur wird dichter als das Kreuz', () => {
  const pts = [], line = (x0, y0, x1, y1, k) => { for (let i = 0; i < k; i++) pts.push([x0 + ((x1 - x0) * i) / k, y0 + ((y1 - y0) * i) / k, 0, 255, 255, 255]); };
  line(-1, -1, 1, -1, 20); line(1, -1, 1, 1, 20); line(1, 1, -1, 1, 20); line(-1, 1, -1, -1, 20); // Außenkontur, Abstand 0,1
  line(-0.6, 0, 0.65, 0, 13); line(0, -0.6, 0, -0.05, 6); line(0, 0.1, 0, 0.65, 6); // Binnenkreuz, frei stehend
  const a = analyse(pts, { flat: true }), d = resample(pts, 260, { flat: true, analysis: a });
  const outerSet = new Set(a.edges.filter((e) => e.w === 1 && !e.ring).map((e) => `${e.a}|${e.b}`));
  const onOuter = d.filter((q) => outerSet.has(`${q.a}|${q.b}`)).length, onInner = d.filter((q) => q.light === 1 && !outerSet.has(`${q.a}|${q.b}`)).length;
  // Längen: außen 8, innen ≈ 2,3; je Länge bekommt die Kontur mehr neue Punkte
  assert.ok(onOuter / 8 > onInner / 2.3, `außen ${onOuter}, innen ${onInner}`);
});

test('mehr Drohnen ändern das Bild sichtbar: die Liniendichte wächst mit der Zahl', () => {
  for (const { key, flat, v, pts } of variants) {
    const a = analyse(pts, { flat });
    if (!a.edges.length) continue;
    let previous = 0;
    for (const n of COUNTS.filter((c) => c > v.points)) {
      const lit = resample(pts, n, { flat, analysis: a }).length;
      assert.ok(lit > previous, `${key}@${n}: ${lit} neue Drohnen nach ${previous}`);
      previous = lit;
    }
  }
});

test('Rechenzeit: Analyse einmal je Variante, Abtastung je Drohnenzahl im Millisekundenbereich', () => {
  let analysis = 0, sampling = 0, runs = 0;
  for (const { flat, pts } of variants) {
    let t = performance.now(); const a = analyse(pts, { flat }); analysis += performance.now() - t;
    for (const n of COUNTS) { t = performance.now(); resample(pts, n, { flat, analysis: a }); sampling += performance.now() - t; runs++; }
  }
  // grobe Obergrenzen (auch auf langsamen Rechnern): im Mittel < 15 ms Analyse und < 5 ms je Abtastung
  assert.ok(analysis / variants.length < 15, `Analyse im Mittel ${(analysis / variants.length).toFixed(1)} ms`);
  assert.ok(sampling / runs < 5, `Abtastung im Mittel ${(sampling / runs).toFixed(2)} ms`);
});
