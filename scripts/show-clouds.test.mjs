import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

// Dreizehnte Fassung (Marc, 30.10.2026). Schnell, ohne Browser: baut jede Folge (alle Anlässe × Pakete × Drohnenzahlen
// an den Bereichs- und Freischaltgrenzen, seit der sechzehnten Fassung die Sprossen der Leiter) und prüft die Regeln aus docs/show-konfigurator.md, „Dreizehnte Fassung“.
const { buildSequence } = await import('../src/scripts/show-scenes.js');
const { OCCASIONS, UNLOCK, playable } = await import('../src/content/show-configurator.js');
const { DRONE_RANGES, PACKAGE_NAMES } = await import('../src/content/show-packages.ts');
const { lift } = await import('../src/scripts/show-tempo.js');

const counts = (pkg) => [...new Set([DRONE_RANGES[pkg].min, DRONE_RANGES[pkg].max, ...UNLOCK.filter((u) => u >= DRONE_RANGES[pkg].min && u <= DRONE_RANGES[pkg].max)])];
const shows = [];
for (const pkg of PACKAGE_NAMES) for (const n of counts(pkg)) for (const o of OCCASIONS) shows.push({ pkg, n, o, ...(await buildSequence(o.motifs, pkg, n, undefined, o.id)) });

/**
 * Anteil der Drohnen eines Bildes, die hell stehen und für sich allein funkeln: Kein Nachbar trägt dasselbe Licht (auch
 * nicht leicht verschoben, wie bei einem Lichtlauf), und ihr Rhythmus ist ein eigener (andere Frequenz als die Nachbarn,
 * wie bei sparkle()). Genau das ist die ruhende Funkelwolke. Ein Motiv mit eigenem Licht (Lichterkette, Wellen,
 * Feuerwerk, Lichtlauf) hat gemeinsame Rhythmen und zählt nicht.
 * Gemessen am Licht der Bewegung selbst (b.steady.raw, ohne die Uhr aus steadyClock, die nur die Zeit verzerrt).
 * Kalibrierung (Stand vor dieser Runde, Commit HEAD): die acht stehenden Wolken lagen bei 0,25 bis 0,43 (Kästchen 0,35,
 * Flügel 0,40, Funken 0,38, Funke 0,31, Nachrichten 0,25, Flocken 0,41, Funken am Boden 0,43; Raketen-Sternenhimmel
 * bei 600 Drohnen 0,31). Echte Motive liegen höchstens bei 0,18. Grenze: 0,22.
 */
function sparkleShare(b, idx) {
  const T = 80, LAG = 4, n = b.pts.length, A = new Map(), out = [0, 0, 0, 1], P = b.pts;
  const series = (j) => { if (!A.has(j)) { const a = new Float64Array(T), p = P[j]; for (let s = 0; s < T; s++) { out[0] = p[0]; out[1] = p[1]; out[2] = p[2] || 0; out[3] = 1; if (b.live) (b.steady?.raw ?? b.live)(p, j, 0.3 + s * 0.1, out); a[s] = lift(out[3]); } A.set(j, a); } return A.get(j); };
  const stats = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return [m, Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length)]; };
  const binOf = (a) => { const [m] = stats(a); let best = 0, bi = 0; for (let f = 1; f <= T / 4; f++) { let re = 0, im = 0; for (let i = 0; i < T; i++) { re += (a[i] - m) * Math.cos((2 * Math.PI * f * i) / T); im += (a[i] - m) * Math.sin((2 * Math.PI * f * i) / T); } const q = re * re + im * im; if (q > best) { best = q; bi = f; } } return bi; };
  let alone = 0;
  for (const j of idx) {
    const a = series(j), [ma, sa] = stats(a);
    if (ma < 0.5 || sa < 0.06) continue; // dunkel oder ruhig
    const near = []; for (let q = 0; q < n; q++) if (q !== j) near.push([(P[q][0] - P[j][0]) ** 2 + (P[q][1] - P[j][1]) ** 2 + ((P[q][2] || 0) - (P[j][2] || 0)) ** 2, q]);
    near.sort((x, y) => x[0] - y[0]);
    let best = -1, same = 0; const bj = binOf(a);
    for (const [, q] of near.slice(0, 6)) {
      const c = series(q), [mc, sc] = stats(c); if (sc < 0.02) continue;
      if (binOf(c) === bj) same++;
      for (let lag = -LAG; lag <= LAG; lag++) { let s = 0, k = 0; for (let i = Math.max(0, -lag); i < T - Math.max(0, lag); i++) { s += (a[i] - ma) * (c[i + lag] - mc); k++; } best = Math.max(best, s / k / sa / sc); }
    }
    if (best < 0.6 && same < 2) alone++;
  }
  return alone / idx.length;
}

test('Keine ruhende Wolke: in keinem Bild steht ein großer Teil der Drohnen hell als Funkelwolke', () => {
  const bad = [];
  for (const { pkg, n, o, beats } of shows) beats.forEach((b, k) => {
    const all = Array.from({ length: b.pts.length }, (_, j) => j), every = Math.max(1, Math.floor(b.pts.length / 150));
    const whole = sparkleShare(b, all.filter((j) => j % every === 0));
    if (whole >= 0.22) bad.push(`${o.id} ${pkg} ${n}, Bild ${k} „${b.caption}“: ${whole.toFixed(2)}`);
    // auch kein einzelner großer Teil (ein Drittel der Drohnen) als Funkelwolke über einem Motiv
    let start = 0;
    for (const g of b.groups ?? []) {
      if (g.count >= b.pts.length / 3) { const ids = all.slice(start, start + g.count).filter((_, i) => i % Math.max(1, Math.floor(g.count / 80)) === 0), s = sparkleShare(b, ids); if (s > 0.6) bad.push(`${o.id} ${pkg} ${n}, Bild ${k}, Teil ${g.name}: ${s.toFixed(2)}`); }
      start += g.count;
    }
  });
  assert.deepEqual(bad, []);
});

test('Lebendige Wolke alle drei bis vier Bilder, höchstens fünf, in jedem Paket', () => {
  for (const { pkg, n, o, beats } of shows) {
    const at = beats.map((b, k) => (b.cloud ? k : -1)).filter((k) => k >= 0), L = beats.length, label = `${o.id} ${pkg} ${n}`;
    assert.ok(at.length >= 1, `${label}: mindestens eine Wolke`);
    const gaps = at.map((k, i) => (i + 1 < at.length ? at[i + 1] : at[0] + L) - k);
    assert.ok(Math.max(...gaps) <= 5, `${label}: höchstens fünf Bilder ohne Wolke (${gaps.join('/')})`);
    if (L >= 6) assert.ok(Math.min(...gaps) >= 2, `${label}: nicht zwei Wolken direkt hintereinander (${gaps.join('/')})`);
  }
});

test('Teil-Umbau: die Wolke nennt nur Teile, die es im Bild gibt, und lässt einen Teil stehen', () => {
  let partial = 0;
  for (const { pkg, n, o, beats } of shows) beats.forEach((b, k) => {
    if (!Array.isArray(b.cloud)) return;
    partial++;
    const names = (b.groups ?? []).map((g) => g.name);
    for (const name of b.cloud) assert.ok(names.includes(name), `${o.id} ${pkg} ${n} Bild ${k}: Teil ${name}`);
    assert.ok(names.some((name) => !b.cloud.includes(name)), `${o.id} ${pkg} ${n} Bild ${k}: ein Teil bleibt stehen`);
  });
  assert.ok(partial >= 6, `Teil-Umbauten vorhanden (${partial})`);
  // Marcs Beispiele: das Buch in Kultur/ODYSSEY (Zeilen und Band werden zum Stern) und der Vorhang (Kultur)
  const kultur = shows.find((s) => s.o.id === 'kultur' && s.pkg === 'ODYSSEY' && s.n === 300).beats;
  assert.deepEqual(kultur.find((b) => b.caption.includes('werden ein Stern')).cloud, ['star']);
  assert.deepEqual(kultur.find((b) => b.caption.includes('Stern steigt daraus auf')).cloud, ['star']);
});

test('Freischalten: Motive erst ab ihrer Drohnenzahl (minDrones an der Fassung), die Folge spielt genau sie', () => {
  for (const o of OCCASIONS) for (const pkg of PACKAGE_NAMES) {
    for (const n of counts(pkg)) {
      const { beats } = shows.find((s) => s.o === o && s.pkg === pkg && s.n === n), segs = new Set(beats.map((b) => b.segment).filter((x) => x >= 0));
      o.motifs.forEach((m, i) => assert.equal(segs.has(i), playable(m, pkg, n), `${o.id} ${pkg} ${n}: ${m.id}`));
      assert.ok(segs.size >= 3, `${o.id} ${pkg} ${n}: ${segs.size} Motive`);
    }
  }
  // Leiter-Regeln ohne Motivbau: scripts/show-unlock.test.mjs (sechzehnte Fassung)
});

test('Lichtlauf nur bei Linien und Konturen ohne eigenes Licht', () => {
  let runs = 0, all = 0;
  for (const { beats } of shows) for (const b of beats) {
    all++;
    if (!b.run) continue;
    runs++;
    assert.ok(!b.interlude, 'keine Figur');
  }
  assert.ok(runs > 0 && runs / all < 0.25, `Lichtlauf bei ${runs} von ${all} Bildern`);
  // Formen mit eingebautem Licht bekommen keinen (Herz atmet, Feuerwerk, Lichterkette)
  const any = (id, pkg, cap) => shows.find((s) => s.o.id === id && s.pkg === pkg).beats.find((b) => b.caption.includes(cap));
  assert.equal(any('hochzeit', 'SPARK', 'Ein Herz').run, false);
  assert.equal(any('silvester', 'ODYSSEY', 'Lichterkette').run, false);
});
