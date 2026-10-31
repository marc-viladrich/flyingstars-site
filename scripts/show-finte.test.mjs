// Vierzehnte Fassung (Marc, 30.10.2026 abends: „Finten … mega kacke … bitte überall raus“). Wächter: Keine Drohne holt
// aus, bevor sie in ihre eigentliche Richtung fliegt, und keine schießt über ihr Ziel hinaus und kehrt zurück.
// Geprüft wird jede Show (alle Anlässe × Pakete, Drohnenzahlen an den Bereichsgrenzen), in drei Teilen:
//   1. Flug: die echte Engine (show-field.js, über scripts/show-sim.mjs in Node) fliegt die ganze Runde; je Bildwechsel
//      und Drohne wird die Bahn bis zur Ankunft gegen die Netto-Verschiebung gemessen (rückwärts, über das Ziel hinaus).
//      Drohnen, die durch die lebendige Wolke fliegen, sind ausgenommen: Ihre gekrümmte Bahn über einen zufälligen
//      Mittelpunkt ist gewollt (zwölfte Fassung).
//   2. Eigenbewegung im Bild: live() jeder Drohne über die Haltezeit; eine kleine Bewegung in die Gegenrichtung direkt
//      vor oder nach einer großen (Ausholen, Überschwingen) ist eine Finte. Gleichmäßiges Pendeln, Drehen und Atmen hat
//      gleich lange Hin- und Rückwege und fällt nicht darunter.
//   3. Teile über die Bilder einer Geschichte: Der Schwerpunkt jedes benannten Teils darf nicht erst ein Stück in die
//      eine und dann weiter in die andere Richtung wandern (die alten Lotusblüten: erst auseinander, dann zueinander).
// Aufruf mit FINTE_REPORT=1 listet alle Treffer statt nur zu prüfen.
import { simulate } from './show-sim.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { DRONE_RANGES, PACKAGE_NAMES } = await import('../src/content/show-packages.ts');
const { buildSequence } = await import('../src/scripts/show-scenes.js');
const { lift } = await import('../src/scripts/show-tempo.js');

const REPORT = Boolean(process.env.FINTE_REPORT);
const ONLY = process.env.FINTE_ONLY, DEBUG = process.env.FINTE_DEBUG; // z. B. "launch/ODYSSEY/300"
/** Anzeigeeinheiten: die Bühne ist ±1,15 breit und ±0,75 hoch. Im Flug zählt ein Ausholen ab 0,03 (2 % der Bühnenhöhe),
 * wenn es mehr als 12 % der eigentlichen Strecke ausmacht. Innerhalb eines Teils (Bein, Flügel) ab 0,045: Die
 * Rechnung, die die gemeinsame Bewegung des Teils abzieht, hinterlässt bei Figuren, deren Körper mitgeht (der
 * Oberkörper lehnt sich beim Schuss), Reste bis etwa 0,04. Ein ganzes Teil (Schwerpunkt) ab 0,04. */
export const FINTE = { abs: 0.03, rel: 0.12, ratio: 2.5, big: 0.1, part: 0.04, limb: 0.045 };
const TILT = 0.14, ct = Math.cos(TILT), st = Math.sin(TILT);
const screen = (x, y, z) => [x, y * ct - z * st];

const shows = [];
for (const pkg of PACKAGE_NAMES) for (const n of [...new Set([DRONE_RANGES[pkg].min, DRONE_RANGES[pkg].max])]) for (const o of OCCASIONS) {
  if (ONLY && !`${o.id}/${pkg}/${n}`.startsWith(ONLY)) continue;
  shows.push({ o, pkg, n });
}
const label = ({ o, pkg, n }, k, b) => `${o.id} ${pkg} ${n}, Bild ${k} „${b.caption}“`;

/** Maßstab der Engine (fit() in show-field.js): je Motiv und Bildausschnitt ein Faktor, Szeneneinheiten → Anzeige. */
function fitOf(beats, n) {
  const size = Math.min(1, Math.sqrt(n / 300)), seg = new Map(), out = new Map();
  for (const b of beats) { const key = `${b.segment ?? 0}|${b.frame ?? ''}`; if (!seg.has(key)) seg.set(key, []); seg.get(key).push(b); }
  for (const list of seg.values()) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const b of list) for (const p of b.fitPts ?? b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const k = ((list.some((b) => b.live) ? 0.9 : 1) * (list[0].zoom ?? 1)) / Math.max((x1 - x0) / 2 / 1.15, (y1 - y0) / 2 / 0.75, 1e-6);
    for (const b of list) out.set(b, k * size);
  }
  return out;
}

/** Monotone Läufe einer Koordinate (mit Hysterese h): Lauflängen mit Vorzeichen und Zeitpunkten. Ein Lauf endet auch,
 * wenn die Drohne mindestens `pause` s stillsteht (ein neuer Ansatz, etwa das Ausholen vor einem Schuss). Der erste
 * Lauf gilt als angeschnitten, wenn die Drohne am Fensteranfang schon in Bewegung war, der letzte immer. */
function runs(values, times, h = 0.004, pause = 0.3) {
  const out = [];
  let dir = 0, start = values[0], ext = values[0], t0 = times[0], te = times[0], rest = true;
  const moving = values.length > 2 && Math.abs(values[1] - values[0]) / (times[1] - times[0]) > 0.02;
  if (moving) rest = false;
  const close = (open, toRest) => { out.push({ len: ext - start, t0, t1: te, open, fromRest: rest, toRest }); };
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (!dir) { if (Math.abs(v - start) > h) { dir = Math.sign(v - start); ext = v; te = times[i]; } else if (times[i] - t0 > pause) rest = true; continue; }
    if ((v - ext) * dir > 0) { ext = v; te = times[i]; continue; }
    if ((ext - v) * dir > h) { close(!out.length && moving, false); start = ext; t0 = te; dir = -dir; ext = v; te = times[i]; rest = false; continue; }
    if (times[i] - te > pause) { close(!out.length && moving, true); start = ext; t0 = te = times[i]; dir = 0; rest = true; }
  }
  if (dir) close(true, false);
  return out;
}
/** Ausholen (kurz gegen, dann lang mit) oder Überschwingen (lang, dann kurz zurück) in einer Folge von Läufen. Nicht
 * dazu zählt: ein angeschnittener Lauf am Rand des Fensters, und ein kurzer Lauf, der nur der Einstieg in ein
 * fortlaufendes Pendeln oder Kreisen ist (der lange Lauf hat auf seiner anderen Seite einen etwa gleich langen
 * Nachbarn, und die Bewegung startet nicht aus dem Stand bzw. endet nicht im Stand). */
function feints(list, { abs = FINTE.abs, ratio = FINTE.ratio, big = FINTE.big } = {}) {
  const hits = [], similar = (r, len) => r && Math.abs(r.len) > len / 1.6 && Math.abs(r.len) < len * 1.6;
  for (let q = 0; q + 1 < list.length; q++) {
    const A = list[q], B = list[q + 1];
    if (A.toRest) continue; // dazwischen lag eine Pause: zwei Bewegungen, keine Gegenbewegung
    const a = Math.abs(A.len), b = Math.abs(B.len), small = Math.min(a, b), large = Math.max(a, b);
    if (small < abs || large < big || large < ratio * small) continue;
    const ahead = a < b, s = ahead ? A : B, beyond = ahead ? list[q + 2] : list[q - 1], near = ahead ? list[q - 1] : list[q + 2];
    if (s.open) continue;
    const deliberate = ahead ? s.fromRest : s.toRest; // aus dem Stand ausholen / nach dem Überschwingen stehen bleiben
    if (!deliberate && similar(beyond, large)) continue;
    if (!deliberate && near && !near.toRest && Math.abs(near.len) < ratio * small && Math.abs(near.len) > small / ratio) continue; // kleines Pendeln
    hits.push({ small, large, kind: ahead ? 'Ausholen' : 'Überschwingen', t: s.t0 });
  }
  return hits;
}

/** Zieht von jeder Drohne die gemeinsame Bewegung ihres Teils ab (beste affine Abbildung: Verschieben, Drehen, Kippen,
 * Skalieren). Übrig bleibt, was sich innerhalb des Teils bewegt (Flügel, Bein, Rocksaum). So zählt ein Teil, das sich
 * dreht und dabei gleitet (zwei Lotusblüten), nicht als Finte, ein Bein, das ausholt, schon. Robust gerechnet (wenige
 * Durchgänge mit Gewichten nach Huber): Ein kleines Stück, das sich anders bewegt (der Ball vor dem Fuß), zieht die
 * gemeinsame Bewegung des großen Rests nicht mit. frames: [n][3] je Zeit. */
function residual(frames) {
  const n = frames[0].length, base = frames[0], row = (p) => [p[0], p[1], p[2], 1];
  const fitAffine = (P, w) => {
    const G = Array.from({ length: 4 }, () => [0, 0, 0, 0]), M = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    let W = 0;
    for (let j = 0; j < n; j++) { const r = row(base[j]); W += w[j]; for (let u = 0; u < 4; u++) { for (let v = 0; v < 4; v++) G[u][v] += w[j] * r[u] * r[v]; for (let c = 0; c < 3; c++) M[c][u] += w[j] * P[j][c] * r[u]; } }
    for (let u = 0; u < 4; u++) G[u][u] += 1e-6 * W;
    const Gi = invert4(G);
    return M.map((m) => [0, 1, 2, 3].map((v) => m.reduce((sum, x, u) => sum + x * Gi[u][v], 0)));
  };
  const apply = (A, P) => P.map((p, j) => { const r = row(base[j]); return [0, 1, 2].map((c) => p[c] - (A[c][0] * r[0] + A[c][1] * r[1] + A[c][2] * r[2] + A[c][3])); });
  return frames.map((P) => {
    let w = new Array(n).fill(1), res = null;
    for (let it = 0; it < 4; it++) {
      res = apply(fitAffine(P, w), P);
      const d = res.map((r) => Math.hypot(...r)), med = [...d].sort((x, y) => x - y)[Math.floor(n / 2)], k = Math.max(0.01, 1.5 * med);
      w = d.map((x) => (x <= k ? 1 : k / x));
    }
    return res;
  });
}
function invert4(m) {
  const a = m.map((r, i) => [...r, ...[0, 1, 2, 3].map((k) => (k === i ? 1 : 0))]);
  for (let c = 0; c < 4; c++) {
    let p = c; for (let r = c + 1; r < 4; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    const d = a[c][c] || 1e-12; for (let k = 0; k < 8; k++) a[c][k] /= d;
    for (let r = 0; r < 4; r++) if (r !== c) { const f = a[r][c]; for (let k = 0; k < 8; k++) a[r][k] -= f * a[c][k]; }
  }
  return a.map((r) => r.slice(4));
}

// ---------- 1. Flug ----------
async function flightFeints(show) {
  const { o, pkg, n } = show, bad = [];
  let cur = -1, start = 0, arrive = Infinity, path = [], judged = true, scene = null, orderNow = [], calls = 0;
  const judge = () => {
    if (judged || cur < 0 || !path.length) return;
    judged = true;
    const b = scene.beats[cur], P0 = path[0], P1 = path[path.length - 1], act = P1.active;
    // welche Drohnen fliegen durch die Wolke? cloud: true = alle, Liste = die Drohnen der genannten Teile
    const owner = []; for (const g of b.groups ?? [{ name: '*', count: b.pts.length }]) for (let q = 0; q < g.count; q++) owner.push(g.name);
    const loose = (i) => b.cloud === true || (Array.isArray(b.cloud) && b.cloud.includes(owner[P1.order[i]])) || P0.loop;
    let flagged = 0, worst = null, cloudBack = 0, cloudN = 0;
    for (let i = 0; i < act; i++) {
      if (i >= P0.active) continue; // neu von außen
      if (loose(i)) {
        // Wolke (nur gemeldet, nicht geprüft): Wie viele Drohnen fliegen über ihren zufälligen Mittelpunkt erst ein Stück
        // zurück? Das liegt am Mittelpunkt in show-field.js (startBeat), siehe Bericht an Worker A.
        const [x0, y0] = screen(P0.pos[i * 3], P0.pos[i * 3 + 1], P0.pos[i * 3 + 2]), [x1, y1] = screen(P1.pos[i * 3], P1.pos[i * 3 + 1], P1.pos[i * 3 + 2]), D = Math.hypot(x1 - x0, y1 - y0);
        if (D > 0.05) { let back = 0; for (const f of path) { const [x, y] = screen(f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]); back = Math.max(back, -((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / D); } cloudN++; if (back > Math.max(FINTE.abs, FINTE.rel * D)) cloudBack++; }
        continue;
      }
      const [x0, y0] = screen(P0.pos[i * 3], P0.pos[i * 3 + 1], P0.pos[i * 3 + 2]), [x1, y1] = screen(P1.pos[i * 3], P1.pos[i * 3 + 1], P1.pos[i * 3 + 2]);
      const D = Math.hypot(x1 - x0, y1 - y0), ux = D > 1e-9 ? (x1 - x0) / D : 0, uy = D > 1e-9 ? (y1 - y0) / D : 0;
      let back = 0, over = 0;
      for (const f of path) {
        const [x, y] = screen(f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]), p = (x - x0) * ux + (y - y0) * uy;
        if (D > 1e-9) { back = Math.max(back, -p); over = Math.max(over, p - D); } else back = Math.max(back, Math.hypot(x - x0, y - y0));
      }
      const excess = Math.max(back, over) - Math.max(FINTE.abs, FINTE.rel * D);
      if (excess > 0) { flagged++; if (!worst || excess > worst.excess) worst = { excess, D, back, over }; if (DEBUG && b.caption.includes(DEBUG)) console.log(`  Drohne ${i} → Punkt ${P1.order[i]}: D ${D.toFixed(3)} rückwärts ${back.toFixed(3)} über ${over.toFixed(3)}; x ${path.filter((_, q) => q % 6 === 0).map((f) => f.pos[i * 3].toFixed(2)).join(' ')} | y ${path.filter((_, q) => q % 6 === 0).map((f) => f.pos[i * 3 + 1].toFixed(2)).join(' ')} | z ${path.filter((_, q) => q % 6 === 0).map((f) => f.pos[i * 3 + 2].toFixed(2)).join(' ')}`); }
    }
    if (cloudN >= 20) cloudReport.push(`${label(show, cur, b)}: Wolke, ${cloudBack} von ${cloudN} Drohnen fliegen erst rückwärts`);
    if (flagged >= Math.max(2, act * 0.01)) bad.push(`${label(show, cur, b)}: Flug, ${flagged} Drohnen, schlimmste ${worst.back > worst.over ? 'rückwärts ' + worst.back.toFixed(3) : 'über das Ziel ' + worst.over.toFixed(3)} bei Strecke ${worst.D.toFixed(3)}`);
  };
  const res = await simulate({ motifs: o.motifs, occasion: o.id, pkg, n, wrap: (record) => { orderNow = record; }, onFrame: (t, pos, beat, active, sc, field) => {
    scene = sc;
    if (beat !== cur) { judge(); const loop = cur > beat; cur = beat; start = t; arrive = Infinity; path = []; judged = false; path.loop = loop; }
    const tl = field.timeline(), el = t - start;
    if (arrive === Infinity && tl.frac > 0 && el > 0.05) arrive = start + el / tl.frac - (sc.beats[beat].hold ?? 2.2);
    if (!judged) { path.push({ pos: Float64Array.from(pos), active, order: Int32Array.from(orderNow()), loop: path.loop }); if (t >= arrive) judge(); }
  } });
  return { bad, beats: res.scene.beats };
}

// ---------- 2. und 3. Eigenbewegung und Teile ----------
// Ein Bild, das sich bewegt, läuft nach steadyClock() (show-motion.js): die Uhr steht im Anflug, läuft an und bremst
// vor dem Wechsel. Das verzerrt nur die Zeit, nicht die Bahn; geprüft wird darum die Bahn der Bewegung selbst (live
// ohne Uhr) über den Abschnitt, den die Uhr durchläuft. Für die Entscheidung, ob ein kurzer Lauf nur der Einstieg in ein
// Pendeln ist, wird die Bahn 8 s davor und danach mitgelesen.
function liveFeints(show, beats) {
  const bad = [], fit = fitOf(beats, show.n), out = [0, 0, 0, 1], dt = 1 / 30, PAD = 8;
  const tracks = new Map();
  beats.forEach((b, k) => {
    const s = fit.get(b), n = b.pts.length;
    const owner = []; for (const g of b.groups ?? [{ name: '*', count: n }]) for (let q = 0; q < g.count; q++) owner.push(g.name);
    // ohne steadyClock (älterer Stand, Bilder nur mit Licht): die Bewegung von 0 bis zur Haltezeit
    const { raw, from, end } = b.steady ?? (b.live ? { raw: b.live, from: 0, end: b.hold ?? 2.2 } : { raw: null, from: 0, end: 0 });
    const at = (j, t) => { const p = b.pts[j]; out[0] = p[0]; out[1] = p[1]; out[2] = p[2] || 0; out[3] = 1; raw?.(p, j, t, out); return [out[0] * s, out[1] * s, out[2] * s, lift(out[3])]; };
    // 2. je Drohne, ohne die gemeinsame Bewegung ihres Teils
    if (raw) {
      let flagged = 0, worst = null, start = 0, sampled = 0;
      const times = []; for (let t = from - PAD; t <= end + PAD; t += dt) times.push(t);
      for (const g of b.groups ?? [{ name: '*', count: n }]) {
        if (b.writes?.includes(g.name)) { start += g.count; continue; }
        const ids = Array.from({ length: g.count }, (_, q) => start + q).filter((j, q) => q % Math.max(1, Math.floor(g.count / 160)) === 0);
        start += g.count;
        if (ids.length < 4) continue;
        const lit = new Set();
        const frames = times.map((t) => ids.map((j) => { const r = at(j, t); if (t >= from && t <= end && r[3] >= 0.2) lit.add(j); return r; }));
        const res = residual(frames);
        ids.forEach((j, q) => {
          if (!lit.has(j)) return; // dunkel: sieht niemand
          sampled++;
          const xs = [], ys = [];
          for (const f of res) { const [X, Y] = screen(f[q][0], f[q][1], f[q][2]); xs.push(X); ys.push(Y); }
          const hits = [...feints(runs(xs, times), { abs: FINTE.limb }), ...feints(runs(ys, times), { abs: FINTE.limb })].filter((h) => h.t >= from - 1e-9 && h.t < end);
          if (hits.length) { flagged++; const h = hits.sort((x, y) => y.small - x.small)[0]; if (!worst || h.small > worst.small) worst = h; if (DEBUG && b.caption.includes(DEBUG)) console.log(`  Drohne ${j} (${g.name}): ${h.kind} ${h.small.toFixed(3)}/${h.large.toFixed(3)} bei ${h.t.toFixed(2)}; Bahn x ${xs.filter((_, q) => q % 15 === 0).map((v) => v.toFixed(2)).join(' ')} | y ${ys.filter((_, q) => q % 15 === 0).map((v) => v.toFixed(2)).join(' ')}`); }
        });
      }
      // eine Finte sieht man an einem Teil (Bein, Flügel, Flamme), nicht an zwei einzelnen Drohnen eines drehenden Körpers
      if (flagged >= Math.max(3, sampled * 0.03)) bad.push(`${label(show, k, b)}: Eigenbewegung, ${flagged} Drohnen, ${worst.kind} ${worst.small.toFixed(3)} vor/nach ${worst.large.toFixed(3)} bei Uhr ${worst.t.toFixed(2)} s`);
    }
    // 3. Schwerpunkt je Teil, über die Bewegung des Bildes (wie bei 2. mit 8 s davor und danach als Zusammenhang, damit ein
    // Kreis oder eine Umlaufbahn als Kreisen zählt). Gezählt werden nur leuchtende Drohnen; ist der größte Teil dunkel
    // (der Delfin unter Wasser), endet die Spur dort. Zwischen zwei Bildern steht jedes Teil (steadyClock bremst, dann
    // die Haltezeit): eine Bewegung über zwei Bilder sind zwei Bewegungen.
    if (raw) for (const name of new Set(owner)) {
      if (b.writes?.includes(name)) continue; // Schreiben: die Feder fährt Zeilen hin und her, das ist der Inhalt
      const idx = owner.map((g, j) => (g === name ? j : -1)).filter((j) => j >= 0).filter((j, q, all) => q % Math.max(1, Math.floor(all.length / 120)) === 0);
      const segs = [{ xs: [], ys: [], ts: [] }];
      for (let t = from - PAD; t <= end + PAD; t += 3 * dt) {
        let sx = 0, sy = 0, m = 0; for (const j of idx) { const r = at(j, t); if (r[3] < 0.2) continue; const [X, Y] = screen(r[0], r[1], r[2]); sx += X; sy += Y; m++; }
        let cur = segs[segs.length - 1];
        if (m < idx.length * 0.5) { if (cur.xs.length) segs.push({ xs: [], ys: [], ts: [] }); continue; }
        // gehen viele Drohnen an oder aus (die Flagge leuchtet auf), springt der Schwerpunkt, ohne dass sich etwas bewegt
        if (cur.m !== undefined && Math.abs(m - cur.m) > idx.length * 0.08) { segs.push({ xs: [], ys: [], ts: [] }); cur = segs[segs.length - 1]; }
        cur.m = m; cur.xs.push(sx / m); cur.ys.push(sy / m); cur.ts.push(t);
      }
      for (const seg of segs) {
        if (seg.xs.length < 3) continue;
        if (DEBUG && name === DEBUG) console.log(`  Teil ${name} Bild ${k}: runs x ${runs(seg.xs, seg.ts).map((r) => r.len.toFixed(2) + (r.toRest ? '|' : '')).join(' ')} / y ${runs(seg.ys, seg.ts).map((r) => r.len.toFixed(2) + (r.toRest ? '|' : '')).join(' ')}`);
        for (const h of [...feints(runs(seg.xs, seg.ts), { abs: FINTE.part, ratio: 2, big: FINTE.big }), ...feints(runs(seg.ys, seg.ts), { abs: FINTE.part, ratio: 2, big: FINTE.big })].filter((q) => q.t >= from - 1e-9 && q.t < end))
          bad.push(`${label(show, k, b)}: Teil ${name}, ${h.kind} ${h.small.toFixed(3)} vor/nach ${h.large.toFixed(3)}`);
      }
    }
  });
  return bad;
}

const results = [], cloudReport = [];
for (const show of shows) {
  const { bad, beats } = await flightFeints(show);
  results.push(...bad, ...liveFeints(show, beats));
}
if (REPORT) { console.log(results.join('\n')); console.log(`\n${results.length} Treffer`); if (process.env.FINTE_CLOUD) console.log(cloudReport.join('\n')); }

test('Keine Finte: kein Ausholen, keine Gegenbewegung, kein Überschwingen, in allen Anlässen × Paketen × Übergängen', () => {
  assert.deepEqual(results, []);
});
