// Runde 9, Punkt 3 (Marc 19.11.2026: „beim Spotify-Logo sind die Schallwellen noch nicht ganz straight“). Wächter über alle
// Beispiele: die Glättung quer zur Linie senkt die Wackelkurve, verschiebt keinen Punkt weiter als 0,3 Punktabstände und
// lässt Zahl, Reihenfolge, Farben und Elemente der Punkte, wie sie sind. Aufruf: node --test src/scripts/logo-rows.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodePoints } from './logo-v10/prepared.mjs';
import { smoothRows, rowSpacing, rowNeighbours } from './logo-rows.mjs';

const dir = new URL('../../public/media/logo-modus/beispiele/', import.meta.url);
const ids = JSON.parse(fs.readFileSync(new URL('sizes.json', dir))).map((x) => x.id);
/** Wackeln: Sehnenabstand eines Punkts gegen den Mittelwert seiner beiden Nachbarn (Krümmung zählt nicht, nur ihr Sprung). */
function roughness(pts) {
  const sp = rowSpacing(pts), pairs = rowNeighbours(pts, sp), off = new Map(), out = [];
  pairs.forEach((q, i) => { if (!q) return; const a = pts[q[0]], b = pts[q[1]], p = pts[i], cx = b.x - a.x, cy = b.y - a.y; off.set(i, Math.abs(((p.x - a.x) * cy - (p.y - a.y) * cx) / Math.hypot(cx, cy)) / sp); });
  pairs.forEach((q, i) => { if (q && off.has(q[0]) && off.has(q[1])) out.push(Math.abs(off.get(i) - (off.get(q[0]) + off.get(q[1])) / 2)); });
  out.sort((a, b) => a - b); return out.length ? out[Math.floor(0.9 * (out.length - 1))] : 0;
}
const read = (id, n) => { const d = JSON.parse(fs.readFileSync(new URL(`${id}.json`, dir))), f = d.formations[d.steps[n]], p = decodePoints(f.p), pts = []; for (let i = 0; i < p.length; i += 5) pts.push({ x: p[i] / 1000, y: p[i + 1] / 1000, c: d.palette[p[i + 2]], e: p[i + 3], cg: p[i + 4] }); pts.meta = { n }; return pts; };

for (const id of ids) test(`${id}: geglättet, ohne Punkte zu verlieren oder wegzuschieben`, () => {
  for (const n of [100, 150, 200]) {
    const pts = read(id, n), out = smoothRows(pts), sp = rowSpacing(pts);
    assert.equal(out.length, pts.length); assert.deepEqual(out.meta, pts.meta);
    out.forEach((q, i) => { assert.equal(q.c, pts[i].c); assert.equal(q.e, pts[i].e); assert.ok(Math.hypot(q.x - pts[i].x, q.y - pts[i].y) <= 0.3 * sp + 1e-9); });
    const before = roughness(pts), after = roughness(out);
    assert.ok(after <= before + 1e-9, `${id} ${n}: ${before.toFixed(3)} → ${after.toFixed(3)}`);
    assert.ok(after <= 0.13, `${id} ${n}: Wackelkurve p90 ${after.toFixed(3)} Punktabstände`);
  }
});

test('Spotify: die Schallwellen stehen glatt (p90 unter 0,02 Punktabständen, vorher 0,09)', () => {
  for (const n of [100, 150, 200]) assert.ok(roughness(smoothRows(read('spotify', n))) < 0.02);
});

// ---------------------------------------------------------------------------------------------------------------------
// Runde 10 (Marc 20.11.2026: „Spotify Logo ist immer noch broken“): schmale Bänder (dünne Striche als geschlossene
// Kontur) werden neu gelegt (regularRibbons). Wächter: ein von der Anpassung unabhängiges Unruhe-Maß je Strich, über alle
// Beispiele und alle vorberechneten Stufen; dazu Spotify live gerechnet bei den Liniendichte-Stufen 4–9, synthetische
// Formen, die NICHT angefasst werden dürfen (Linse, Sichel, Ring), und ein Rechteck, das eckig bleiben muss.
// Prüfbilder aller Logos × Stufen × Drohnenzahlen: /tmp/fs-r10/l/ (Runde 10, Agent L).
import { cleanRows, regularRibbons, contourChains, fitRibbon, equalTwins } from './logo-rows.mjs';

const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
const lineDist = (p, P) => { let m = Infinity; for (let i = 0; i < P.length - 1; i++) m = Math.min(m, segDist(p, P[i], P[i + 1])); return m; };
/**
 * Unruhe je Strich (geschlossene Kontur, höchstens 3 Punktabstände breit, mindestens 4-mal so lang wie breit), gemessen
 * ohne fitRibbon: Schwankung der Schrittweite entlang der Kontur (stepCV), größter Schritt (gap, offene Enden) und
 * Schwankung des Abstands Seite 1 → Seite 2 im Mittelteil (spread = (p90 − p10) / Median).
 */
function strokeUnrest(pts) {
  const out = [];
  for (const c of contourChains(pts)) {
    const N = c.length; if (N < 14) continue;
    const Q = c.map((i) => pts[i]), st = Q.map((p, t) => { const q = Q[(t + 1) % N]; return Math.hypot(p.x - q.x, p.y - q.y); });
    const h = [...st].sort((a, b) => a - b)[N >> 1]; if (!(h > 0) || Math.max(...st) > 2.5 * h) continue;
    let a = 0, b = 0, far = -1;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const d = Math.hypot(Q[i].x - Q[j].x, Q[i].y - Q[j].y); if (d > far) { far = d; a = i; b = j; } }
    const s1 = [], s2 = []; for (let i = a; ; i = (i + 1) % N) { s1.push(Q[i]); if (i === b) break; } for (let i = b; ; i = (i + 1) % N) { s2.push(Q[i]); if (i === a) break; }
    const inner = (S) => S.slice(Math.ceil(S.length * 0.15), Math.floor(S.length * 0.85));
    const w = [...inner(s1).map((p) => lineDist(p, s2)), ...inner(s2).map((p) => lineDist(p, s1))].map((d) => d / h).sort((x, y) => x - y);
    if (w.length < 4) continue;
    const mw = w[w.length >> 1]; if (mw > 3 || far / h < 4 * mw) continue;
    const mean = st.reduce((x, y) => x + y, 0) / N, sd = Math.sqrt(st.reduce((x, y) => x + (y - mean) ** 2, 0) / N);
    out.push({ chain: c, stepCV: sd / mean, gap: Math.max(...st) / h, spread: (w[Math.floor(0.9 * (w.length - 1))] - w[Math.floor(0.1 * (w.length - 1))]) / mw });
  }
  return out;
}
const allPrepared = (id) => {
  const d = JSON.parse(fs.readFileSync(new URL(`${id}.json`, dir))), refs = new Set([...Object.values(d.steps), ...Object.values(d.strict || {}).flatMap((x) => Object.values(x))]);
  return [...refs].map((ref) => { const f = d.formations[ref], p = decodePoints(f.p), pts = []; for (let i = 0; i < p.length; i += 5) pts.push({ x: p[i] / 1000, y: p[i + 1] / 1000, c: d.palette[p[i + 2]], e: p[i + 3], cg: p[i + 4] }); pts.meta = { ref }; return pts; });
};

for (const id of ids) test(`${id}: Bänder neu gelegt ohne Verlust, alle anderen Konturen unverändert, keine neue Unruhe`, () => {
  for (const pts of allPrepared(id)) {
    const rib = [], out = smoothRows(regularRibbons(pts, { ribbons: rib }));
    assert.equal(out.length, pts.length); assert.deepEqual(out.meta, pts.meta);
    out.forEach((q, i) => { assert.equal(q.c, pts[i].c); assert.equal(q.e, pts[i].e); assert.equal(q.cg, pts[i].cg); });
    // Runde 10b: cleanRows = Bänder, gleiche kleine Motive (equalTwins), Glättung; die Drohnenzahl bleibt
    const tw = [], full = cleanRows(pts, { twins: tw });
    assert.equal(full.length, pts.length);
    // ohne Band und ohne ungleiche Motive ist das Ergebnis genau die Glättung von Runde 9
    if (!rib.length && !tw.length) assert.deepEqual(full, smoothRows(pts));
    const moved = new Set(rib.flatMap((r) => r.chain)), sp = rowSpacing(regularRibbons(pts));
    pts.forEach((p, i) => { if (!moved.has(i)) assert.ok(Math.hypot(out[i].x - p.x, out[i].y - p.y) <= 0.3 * sp + 1e-9); });
    // jedes neu gelegte Band: gleichmäßige Schritte, keine Lücke, nichts weiter als 1,5 Punktabstände verschoben
    for (const r of rib) {
      const u = strokeUnrest(out).find((x) => x.chain.length === r.chain.length && x.chain.every((j, k) => j === r.chain[k]));
      if (u) { assert.ok(u.stepCV <= 0.08, `${id} ${pts.meta.ref}: Schrittweite schwankt (${u.stepCV.toFixed(3)})`); assert.ok(u.gap <= 1.5, `${id} ${pts.meta.ref}: Lücke ${u.gap.toFixed(2)}`); }
      r.chain.forEach((j, k) => assert.ok(Math.hypot(r.pts[k][0] - pts[j].x, r.pts[k][1] - pts[j].y) <= 1.5 * r.step, `${id}: Punkt ${j} zu weit verschoben`));
    }
    // über alle Striche: nachher nie unruhiger als vorher (Mittel über die Striche)
    const avg = (u, k) => (u.length ? u.reduce((t, x) => t + x[k], 0) / u.length : 0), b = strokeUnrest(smoothRows(pts)), a = strokeUnrest(out);
    for (const k of ['stepCV', 'gap', 'spread']) assert.ok(avg(a, k) <= avg(b, k) + 0.02, `${id} ${pts.meta.ref}: ${k} ${avg(b, k).toFixed(3)} → ${avg(a, k).toFixed(3)}`);
  }
});

test('Spotify (vorberechnet): alle drei Wellen sind Bänder mit runden Enden, gleichmäßigen Schritten und geschlossenen Enden', () => {
  for (const n of [100, 150, 200]) {
    const pts = read('spotify', n), rib = [], out = cleanRows(pts, { ribbons: rib });
    assert.equal(rib.length, 3, `${n}: ${rib.length} Bänder`);
    assert.ok(rib.every((r) => r.caps === 'round'));
    // die Breiten folgen dem Logo (oben breiteste Welle), konstant (Verjüngung unter 20 %)
    const w = rib.map((r) => r.width).sort((a, b) => a - b);
    assert.ok(w[0] < w[1] && w[1] < w[2] && rib.every((r) => Math.abs(r.taper) < 0.2));
    for (const u of strokeUnrest(out).filter((x) => rib.some((r) => r.chain.length === x.chain.length))) {
      assert.ok(u.stepCV <= 0.03, `${n}: Schrittweite ${u.stepCV.toFixed(3)} (vorher bis 0,24)`);
      assert.ok(u.gap <= 1.15, `${n}: Lücke ${u.gap.toFixed(2)} (vorher bis 2,3)`);
      assert.ok(u.spread <= 0.15, `${n}: Breite schwankt ${u.spread.toFixed(3)}`);
    }
  }
});

test('Spotify live gerechnet (Konverter v10) bei Liniendichte-Stufen 4–9: drei saubere Bänder', async () => {
  const V = new URL('./logo-v10/', import.meta.url);
  const { convert } = await import(new URL('converter/convert.mjs', V));
  const { contentPipeline } = await import(new URL('content-fit.mjs', V));
  const { fitToShow } = await import(new URL('formation-core.mjs', V));
  const { DENSITIES } = await import('./logo-density.mjs');
  const R = JSON.parse(fs.readFileSync(new URL('spotify.raster.json', dir)));
  const raster = async (size) => { const im = R[size]; assert.ok(im, `kein Raster ${size}`); return { width: im.width, height: im.height, data: new Uint8ClampedArray(Buffer.from(im.rgba, 'base64')) }; };
  for (let i = 4; i <= 9; i++) {
    const out = await contentPipeline(raster, convert, { flex: 'auto', part: 'auto', drones: 200, density: DENSITIES[i] }, {});
    const pts = await fitToShow(out.result, 200), rib = [], res = cleanRows(pts, { ribbons: rib });
    assert.equal(res.length, pts.length);
    assert.ok(rib.length >= (i <= 8 ? 3 : 2), `Stufe ${i}: ${rib.length} Bänder`);
    for (const r of rib) { assert.equal(r.caps, 'round'); assert.ok(r.err.mean < 0.1, `Stufe ${i}: Abweichung ${r.err.mean}`); }
    // (Sehnen in den runden Kappen sind etwas kürzer als auf den Seiten: daher 0,05 statt 0)
    for (const u of strokeUnrest(res).filter((x) => rib.some((r) => r.chain.length === x.chain.length))) assert.ok(u.stepCV <= 0.05 && u.gap <= 1.15, `Stufe ${i}: ${JSON.stringify({ ...u, chain: u.chain.length })}`);
  }
});

/** geschlossene Kontur aus einer Breitenfunktion entlang einer Mittellinie c(t), t ∈ [0, 1], gleichmäßig abgetastet */
function band(center, half, { n = 40, noise = 0, seed = 1 } = {}) {
  const M = 400, up = [], down = [];
  for (let k = 0; k <= M; k++) { const t = k / M, p = center(t), q = center(Math.min(1, t + 1e-3)), o = center(Math.max(0, t - 1e-3)), tx = q[0] - o[0], ty = q[1] - o[1], l = Math.hypot(tx, ty), r = half(t); up.push([p[0] - (ty / l) * r, p[1] + (tx / l) * r]); down.push([p[0] + (ty / l) * r, p[1] - (tx / l) * r]); }
  const ring = [...up, ...down.reverse()], s = [0]; for (let i = 1; i < ring.length; i++) s.push(s[i - 1] + Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]));
  let r = seed; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
  const out = []; let j = 0;
  for (let k = 0; k < n; k++) { const u = (s.at(-1) * k) / n; while (s[j + 1] < u) j++; const t = (u - s[j]) / (s[j + 1] - s[j] || 1); out.push({ x: ring[j][0] + t * (ring[j + 1][0] - ring[j][0]) + noise * rnd(), y: ring[j][1] + t * (ring[j + 1][1] - ring[j][1]) + noise * rnd() }); }
  return out;
}
const arc = (t) => [Math.cos(Math.PI * (0.25 + 0.5 * t)) * 3, -Math.sin(Math.PI * (0.25 + 0.5 * t)) * 3];

test('synthetisch: verrauschter Bogen wird ein gleichmäßiges Band mit runden Enden', () => {
  const pts = band(arc, () => 0.12, { n: 44, noise: 0.03 }), rib = [], out = regularRibbons(pts, { ribbons: rib });
  assert.equal(rib.length, 1); assert.equal(rib[0].caps, 'round');
  const u = strokeUnrest(out)[0], b = strokeUnrest(pts)[0];
  assert.ok(u.stepCV < b.stepCV / 2 && u.stepCV < 0.05, `${b.stepCV} → ${u.stepCV}`);
  assert.ok(Math.abs(rib[0].width - 0.24) < 0.03, `Breite ${rib[0].width}`);
});

test('synthetisch: Linse, Sichel und kurze Formen bleiben unverändert', () => {
  const line = (t) => [t * 2 - 1, 0];
  for (const [name, pts] of [
    ['Linse', band(line, (t) => 0.2 * Math.sin(Math.PI * t) + 0.005, { n: 30 })],
    ['Sichel', band(arc, (t) => 0.25 * Math.sin(Math.PI * t) + 0.005, { n: 40 })],
    ['zu wenige Punkte', band(arc, () => 0.12, { n: 12 })],
  ]) assert.deepEqual(regularRibbons(pts), pts.map((p) => ({ ...p })), name);
  // Ring (zwei getrennte Konturen um ein Loch) ist kein Band
  const ring = [];
  for (let k = 0; k < 60; k++) ring.push({ x: Math.cos((k / 60) * 2 * Math.PI), y: Math.sin((k / 60) * 2 * Math.PI) });
  for (let k = 0; k < 50; k++) ring.push({ x: 0.85 * Math.cos((k / 50) * 2 * Math.PI), y: 0.85 * Math.sin((k / 50) * 2 * Math.PI) });
  assert.deepEqual(regularRibbons(ring), ring.map((p) => ({ ...p })));
});

test('synthetisch: schmales Rechteck (Buchstabenstamm, Innenraum) behält gerade Enden und seine Lage', () => {
  const pts = []; const W = 0.1, H = 1, step = 0.05;
  for (let k = 0; k < 20; k++) pts.push({ x: 0, y: k * step });
  for (let k = 0; k < 2; k++) pts.push({ x: k * step, y: H });
  for (let k = 0; k < 20; k++) pts.push({ x: W, y: H - k * step });
  for (let k = 0; k < 2; k++) pts.push({ x: W - k * step, y: 0 });
  const r = fitRibbon(pts.map((p) => [p.x, p.y]));
  assert.ok(r, 'als Band erkannt'); assert.equal(r.caps, 'square');
  r.pts.forEach((q, k) => assert.ok(Math.hypot(q[0] - pts[k].x, q[1] - pts[k].y) < 0.6 * step, `Punkt ${k} verschoben`));
  // alle vier Ecken sind besetzt, alle Punkte liegen auf dem Rechteck
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) assert.ok(r.pts.some((q) => Math.hypot(q[0] - x, q[1] - y) < 0.1 * step), `Ecke ${x},${y}`);
  for (const q of r.pts) assert.ok(Math.min(Math.abs(q[0]), Math.abs(q[0] - W), Math.abs(q[1]), Math.abs(q[1] - H)) < 0.1 * step);
});

// ---------------------------------------------------------------------------------------------------------------------
// Runde 10b (Lead nach Sichtung des Kontaktbogens, Nieheim: „die vier Kugeln sind nicht gleich“). Wächter: gleiche kleine
// Motive gleich gezeichnet (equalTwins), über alle vorberechneten Fassungen von Nieheim, und synthetisch; dazu: Formen,
// die nur ähnlich sind (Strichspitzen, dünn besetzte Buchstaben), bleiben unangetastet.
const discsOf = (pts) => { const xs = pts.map((q) => q.x), cx = (Math.min(...xs) + Math.max(...xs)) / 2; return contourChains(pts).map((c) => c.map((i) => pts[i])).filter((g) => g.length >= 3 && g.length <= 8).map((g) => ({ g, mx: g.reduce((t, q) => t + q.x, 0) / g.length, my: g.reduce((t, q) => t + q.y, 0) / g.length })).filter((d) => Math.abs(d.mx - cx) > 0.25 && Math.abs(d.my) > 0.2); };
test('Nieheim: in jeder Fassung (Automatik und vereinfacht) vier gleiche Kugeln, zwei Farben', () => {
  const d = JSON.parse(fs.readFileSync(new URL('nieheim.json', dir)));
  assert.equal(new Set(d.palette.map((c) => c.join())).size, 2, 'Rot und Gelb, keine Mischfarben an den Kanten');
  for (const pts of allPrepared('nieheim')) {
    const discs = discsOf(cleanRows(pts));
    assert.equal(discs.length, 4, `${pts.meta.ref}: ${discs.length} Kugeln`);
    const pat = discs.map(({ g, mx, my }) => g.map((q) => [q.x - mx, q.y - my]));
    for (const P of pat) { assert.equal(P.length, pat[0].length, `${pts.meta.ref}: Punktzahlen ${pat.map((x) => x.length)}`); for (const a of P) assert.ok(pat[0].some((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.012), `${pts.meta.ref}: Kugeln verschieden ausgelegt`); }
  }
});
test('flächige neue Beispiele ohne Mischfarben (nur die Farben des Logos)', () => {
  // Runde 12: Ford nur Schriftzug, Berlin nur der Bär (ohne rote Zunge und Krallen) → je eine Farbe
  for (const [id, n] of [['ford', 1], ['nieheim', 2], ['berlin', 1]]) assert.equal(new Set(JSON.parse(fs.readFileSync(new URL(`${id}.json`, dir))).palette.map((c) => c.join())).size, n, id);
  // Runde 14: Bremen ist der Stadtfest-Schlüssel mit dessen Farben (warmweiß, gelbes Ornament), logo-landmark.test.mjs
  for (const id of ['eon']) { const p = JSON.parse(fs.readFileSync(new URL(`${id}.json`, dir))).palette; for (const c of p) assert.ok(Math.hypot(c[0] - p[0][0], c[1] - p[0][1], c[2] - p[0][2]) <= 8, `${id}: ${c} weicht ab`); }
});
const ring = (cx, cy, r, n, rot = 0, c = [252, 221, 9]) => Array.from({ length: n }, (_, k) => ({ x: cx + r * Math.sin(rot + (2 * Math.PI * k) / n), y: cy - r * Math.cos(rot + (2 * Math.PI * k) / n), c }));
test('synthetisch: vier Kugeln mit 5/4/4/4 Punkten werden gleich, ein Punkt wandert in die längste Kontur', () => {
  const big = ring(0, 0, 0.9, 60, 0, [255, 138, 126]), pts = [...big, ...ring(-0.4, -0.4, 0.06, 5), ...ring(0.4, -0.4, 0.06, 4), ...ring(-0.4, 0.4, 0.06, 4), ...ring(0.4, 0.4, 0.06, 4)];
  const tw = [], out = equalTwins(pts, { twins: tw });
  assert.equal(out.length, pts.length); assert.equal(tw.length, 4); assert.ok(tw.every((t) => t.n === 4));
  assert.equal(out.filter((q) => q.c[0] === 255).length, 61, 'der überzählige Punkt gehört jetzt zum Rand (rot)');
});
test('synthetisch: gespiegelt gesetzte Fünfecke werden gleich ausgerichtet', () => {
  const pts = [...ring(0, 0, 0.9, 60, 0, [255, 138, 126]), ...ring(-0.4, -0.4, 0.06, 5, Math.PI / 2), ...ring(0.4, -0.4, 0.06, 5, -Math.PI / 2), ...ring(-0.4, 0.4, 0.06, 5, Math.PI / 2), ...ring(0.4, 0.4, 0.06, 5, -Math.PI / 2)];
  const discs = discsOf(equalTwins(pts)), pat = discs.map(({ g, mx, my }) => g.map((q) => [q.x - mx, q.y - my]));
  assert.equal(discs.length, 4);
  for (const P of pat) for (const a of P) assert.ok(pat[0].some((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6));
});
test('synthetisch: nur zwei gleiche Formen, Dreiecke oder schon gleiche Motive bleiben unangetastet', () => {
  const big = ring(0, 0, 0.9, 60, 0, [255, 138, 126]);
  for (const [name, pts] of [
    ['zwei Kugeln', [...big, ...ring(-0.4, 0, 0.06, 5), ...ring(0.4, 0, 0.06, 4)]],
    ['Dreiecke', [...big, ...ring(-0.4, -0.4, 0.06, 3), ...ring(0.4, -0.4, 0.06, 3, 1), ...ring(-0.4, 0.4, 0.06, 3, 2)]],
    ['schon gleich', [...big, ...ring(-0.4, -0.4, 0.06, 5), ...ring(0.4, -0.4, 0.06, 5), ...ring(-0.4, 0.4, 0.06, 5)]],
  ]) assert.deepEqual(equalTwins(pts), pts, name);
});

// ---------------------------------------------------------------------------------------------------------------------
// Runde 12 (Marc 21.11.2026: „Spotify ist IMMER NOCH broken“; Beispiele Berlin, Bremen, Ford, REWE neu, VW raus).
// 1) Striche, die schmaler sind als der Punktabstand (Spotify bei Liniendichte 1–3), werden eine Reihe auf der Mittellinie
//    statt zweier Reihen, die sich zum Punktgitter vermischen (thinStrokes). 2) Die vereinfachten Fassungen für ein
//    kleineres Show-Budget zeigen denselben Logoteil wie die Automatik (Spotify: nur die Bildmarke, nicht der Schriftzug).
import { thinStrokes, thinStroke, splitLoops } from './logo-rows.mjs';

test('Spotify live bei Liniendichte 1–3: die Wellen sind je eine Reihe, gleichmäßig, im Kreis', async () => {
  const V = new URL('./logo-v10/', import.meta.url);
  const { convert } = await import(new URL('converter/convert.mjs', V));
  const { contentPipeline } = await import(new URL('content-fit.mjs', V));
  const { fitToShow } = await import(new URL('formation-core.mjs', V));
  const { DENSITIES } = await import('./logo-density.mjs');
  const R = JSON.parse(fs.readFileSync(new URL('spotify.raster.json', dir)));
  const raster = async (size) => { const im = R[size] ?? R[512]; return { width: im.width, height: im.height, data: new Uint8ClampedArray(Buffer.from(im.rgba, 'base64')) }; };
  for (const [i, want] of [[1, 3], [2, 3], [3, 2]]) {
    const out = await contentPipeline(raster, convert, { flex: 'auto', part: 'auto', drones: 200, density: DENSITIES[i] }, {});
    const pts = await fitToShow(out.result, 200), strokes = [], res = cleanRows(pts, { strokes });
    assert.ok(strokes.length >= want, `Stufe ${i}: ${strokes.length} Wellen als Reihe (vorher 0: zwei Reihen enger als der Punktabstand)`);
    assert.equal(res.length, pts.length - strokes.reduce((t, s) => t + s.chain.length - s.line.length, 0));
    // je Reihe gleiche Schritte, ungefähr im Punktabstand der Kontur; alle Wellen innerhalb des Kreises
    const r = Math.max(...pts.map((p) => Math.hypot(p.x, p.y)));
    for (const s of strokes) {
      const st = s.line.slice(1).map((q, k) => Math.hypot(q[0] - s.line[k][0], q[1] - s.line[k][1]));
      assert.ok(Math.max(...st) - Math.min(...st) < 0.12 * s.step, `Stufe ${i}: ungleiche Schritte`);
      assert.ok(s.line.every(([x, y]) => Math.hypot(x, y) < 0.9 * r), `Stufe ${i}: Welle außerhalb des Kreises`);
    }
  }
});

test('Spotify vorberechnet: jede vereinfachte Fassung zeigt nur die Bildmarke wie die Automatik', () => {
  const d = JSON.parse(fs.readFileSync(new URL('spotify.json', dir)));
  for (const [n, ref] of Object.entries(d.steps)) assert.equal(d.formations[ref].part, 'mark', `Automatik ${n}`);
  for (const [n, m] of Object.entries(d.strict)) for (const [b, ref] of Object.entries(m)) assert.equal(d.formations[ref].part, 'mark', `${n} → ${b} Drohnen: ${d.formations[ref].part}`);
});

test('schmale Striche: in keiner vorberechneten Fassung eines Beispiels (dort trägt die Kontur selbst)', () => {
  for (const id of ids) for (const pts of allPrepared(id)) { const s = []; thinStrokes(regularRibbons(pts), { strokes: s }); assert.equal(s.length, 0, `${id} ${pts.meta.ref}`); }
});

test('synthetisch: schmaler Bogen wird eine Reihe im Punktabstand, breiter Bogen und kurze Formen bleiben', () => {
  const thin = band(arc, () => 0.04, { n: 40 }), r = thinStroke(thin.map((p) => [p.x, p.y]));
  const h = Math.hypot(thin[1].x - thin[0].x, thin[1].y - thin[0].y);
  assert.ok(r, 'als Strich erkannt'); assert.ok(Math.abs(r.step - h) < 0.15 * h, `Schritt ${r.step} statt ${h}`);
  const out = thinStrokes(thin); assert.equal(out.length, r.line.length);
  // (die Enden liegen bis zur halben Breite neben der Mittellinie: die fernsten Konturpunkte sind Ecken einer Seite)
  assert.ok(out.every((q) => Math.abs(Math.hypot(q.x, q.y) - 3) < 0.045), 'auf der Mittellinie');
  for (const [name, pts] of [['breit', band(arc, () => 0.12, { n: 44 })], ['kurz', band(arc, () => 0.04, { n: 6 })]]) assert.deepEqual(thinStrokes(pts), pts, name);
});

test('synthetisch: drei hintereinander ausgegebene schmale Konturen werden getrennt (splitLoops)', () => {
  const off = (pts, dy) => pts.map((p) => ({ ...p, y: p.y + dy }));
  const one = band(arc, () => 0.05, { n: 10 }), pts = [...one, ...off(one, 2), ...off(one, 4)];
  assert.deepEqual(splitLoops(pts, pts.map((_, i) => i)).map((c) => c.length), [10, 10, 10]);
});

test('Beispiel-Logos Runde 12/14: Bremen und Berlin ohne Schild, Volkswagen und REWE raus', async () => {
  // Bremen und Berlin ohne Wappenschild: kein Punkt auf einer Linie über die ganze Breite oben (die Schildkante). Runde 14:
  // Bremen ist der Stadtfest-Schlüssel (logo-landmark.mjs), geprüft bei 200 und bei seiner vollen Zeichnung (300)
  const { landmarkFormation } = await import('./logo-landmark.mjs');
  for (const [id, pts] of [['bremen', landmarkFormation('bremen', 200)], ['bremen', landmarkFormation('bremen', 300)], ['berlin', read('berlin', 200)]]) {
    const ys = pts.map((p) => p.y), xs = pts.map((p) => p.x), top = Math.min(...ys), w = Math.max(...xs) - Math.min(...xs);
    const row = pts.filter((p) => Math.abs(p.y - top) < 0.02 * w);
    assert.ok(Math.max(...row.map((p) => p.x)) - Math.min(...row.map((p) => p.x)) < 0.6 * w, `${id}: oberste Reihe über die ganze Breite (Schild?)`);
  }
  assert.ok(!ids.includes('volkswagen') && !fs.existsSync(new URL('volkswagen.json', dir)));
  assert.ok(!ids.includes('rewe') && !fs.existsSync(new URL('rewe.json', dir))); // Runde 14 (Marc)
});
