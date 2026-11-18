// Drohnen-Zuordnung beim Bildwechsel (src/scripts/show-flight.js, assign): seit dem 18.11.2026 mit Spaltenreduktion nach
// Jonker-Volgenant als Start. Die Summe der Abstandsquadrate muss optimal bleiben; geprüft gegen eine Suche ohne Start.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assign } from '../src/scripts/show-flight.js';

/** Referenz: dieselbe Suche ohne Spaltenreduktion (der Stand vor dem 18.11.2026). */
function reference(from, to) {
  const n = from.length / 3, m = to.length / 3, INF = Infinity;
  const u = new Float64Array(n + 1), v = new Float64Array(m + 1), minv = new Float64Array(m + 1), p = new Int32Array(m + 1), way = new Int32Array(m + 1), used = new Uint8Array(m + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0; minv.fill(INF); used.fill(0);
    do {
      used[j0] = 1; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) { if (used[j]) continue; let c = 0; for (let k = 0; k < 3; k++) c += (from[(i0 - 1) * 3 + k] - to[(j - 1) * 3 + k]) ** 2; const cur = c - u[i0] - v[j]; if (cur < minv[j]) { minv[j] = cur; way[j] = j0; } if (minv[j] < delta) { delta = minv[j]; j1 = j; } }
      for (let j = 0; j <= m; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const out = new Int32Array(n); for (let j = 1; j <= m; j++) if (p[j]) out[p[j] - 1] = j - 1; return out;
}
const cost = (f, t, a) => { let s = 0; a.forEach((j, i) => { for (let k = 0; k < 3; k++) s += (f[i * 3 + k] - t[j * 3 + k]) ** 2; }); return s; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test('optimal wie ohne Start: zufällige Punkte, Formen, Raster mit Gleichständen, auch rechteckig', () => {
  const cases = [];
  for (const n of [1, 2, 5, 40, 120, 250]) cases.push([Float64Array.from({ length: n * 3 }, rnd), Float64Array.from({ length: n * 3 }, rnd)]);
  for (const n of [60, 200]) { const ring = (r, o) => Float64Array.from({ length: n * 3 }, (_, q) => { const i = Math.floor(q / 3), a = (i / n) * 6.283 + o; return q % 3 === 0 ? Math.cos(a) * r : q % 3 === 1 ? Math.sin(a) * r : 0; }); cases.push([ring(1, 0.1), ring(0.7, 0.4)]); }
  const grid = (n, o) => Float64Array.from({ length: n * 3 }, (_, q) => { const i = Math.floor(q / 3); return q % 3 === 0 ? (i % 10) + o : q % 3 === 1 ? Math.floor(i / 10) : 0; });
  cases.push([grid(100, 0.5), grid(100, 0)]); // viele Gleichstände
  cases.push([Float64Array.from({ length: 30 * 3 }, rnd), Float64Array.from({ length: 45 * 3 }, rnd)]); // weniger Drohnen als Plätze
  for (const [n, m] of [[100, 300], [300, 450], [450, 600], [1, 5]]) cases.push([Float64Array.from({ length: n * 3 }, rnd), Float64Array.from({ length: m * 3 }, rnd)]);
  const grid2 = (n, o) => Float64Array.from({ length: n * 3 }, (_, q) => { const i = Math.floor(q / 3); return q % 3 === 0 ? (i % 12) * 0.1 + o : q % 3 === 1 ? Math.floor(i / 12) * 0.1 : 0; });
  cases.push([grid2(96, 0.05), grid2(144, 0)]); // rechteckig mit Gleichständen
  for (const [from, to] of cases) {
    const a = assign(from, to), b = reference(from, to), n = from.length / 3;
    assert.equal(new Set(a).size, n, 'jede Drohne einen eigenen Platz');
    assert.ok(Math.abs(cost(from, to, a) - cost(from, to, b)) <= 1e-9 * Math.max(1, cost(from, to, b)), `nicht optimal bei ${n} Drohnen`);
  }
});

// Runde 6: über 128 Drohnen Blockzuordnung in Hilbert-Reihenfolge (show-field.js, assignScalable), damit ein Bildwechsel mit
// 1000 Drohnen nicht den Hauptthread für Sekunden anhält. Gültige Zuordnung, nah am Optimum, schnell.
test('Blockzuordnung über 128 Drohnen: jede Drohne ein eigener Platz, nah am Optimum, in Millisekunden', async () => {
  globalThis.window ??= globalThis; globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {} });
  const { assignScalable } = await import('../src/scripts/show-field.js');
  const ring = (n, r, o) => Float64Array.from({ length: n * 3 }, (_, q) => { const i = Math.floor(q / 3), a = (i / n) * 6.283 + o; return q % 3 === 0 ? Math.cos(a) * r : q % 3 === 1 ? Math.sin(a) * r * 0.7 : 0.05 * Math.sin(7 * a); });
  for (const [n, m] of [[1000, 1000], [600, 1000], [450, 450], [200, 200], [129, 130]]) {
    const from = ring(n, 1, 0.2), to = ring(m, 0.8, 0.9);
    const t = performance.now(), a = assignScalable(from, to), ms = performance.now() - t;
    assert.equal(new Set(a).size, n, `${n}→${m}: doppelt belegte Plätze`);
    assert.ok([...a].every((j) => j >= 0 && j < m));
    if (n <= 450) { const opt = cost(from, to, reference(from, to)); assert.ok(cost(from, to, a) <= opt * 1.35, `${n}→${m}: ${cost(from, to, a)} gegen optimal ${opt}`); }
    assert.ok(ms < 200, `${n}→${m}: ${ms.toFixed(0)} ms`);
  }
});
