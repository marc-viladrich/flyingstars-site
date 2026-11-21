import { t as message } from '../../../i18n/ui.mjs';
// Countdown von 10 bis 0 (Runde 11, Marc 20.11.2026 ausdrücklich gewünscht), Stufe 400 (Runde 11b, vorher 900), Anlass Winter & Silvester. Steigerung
// der Uhr: Das Motiv steht in der Motivliste direkt hinter `uhr`; aus dem Zifferblatt mit zwölf Strichen wird ein Sekundenring
// mit zehn Strichen, aus den Zeigern die „10“. Die Engine ordnet die Drohnen dabei nach Nähe zu, der Rand bleibt Rand.
//
// Bauweise wie Fahrzeuge und Drache (catalog-3d/): jede Linie liegt zweimal, vorn und hinten (im Profil eine saubere Linie, im
// Schwenk ein Körper), keine Füllung. Die Ziffern sind FlyingStars' eigene Einstrich-Schrift „FS Einstrich“
// (formwerk/font.js, Ziffern hier abgeschrieben, damit dieses Modul den Textplaner nicht nachlädt).
//
//   countdown3d (3D, ab 400): Sekundenring mit zehn Strichen, darin die Ziffer als Körper. Jede Ziffer entsteht aus der
//     vorigen: Die Linie fließt in die neue Form und taucht dabei kurz in die Tiefe (die Drohnen folgen der Linie in
//     Schreibreihenfolge, Nachbarn bleiben Nachbarn, keine Wolke). Braucht die neue Ziffer mehr Linie, fließt Licht aus dem
//     Ring hinein, braucht sie weniger, geht es dorthin zurück. Ein Lichtkopf läuft den Ring ab wie ein Sekundenzeiger und
//     lässt die verstrichene Zeit gedimmt zurück. Bei 0 läuft das Licht einmal festlich um den Ring.
//   countdownStory (3D+, ab 400): zwei Akte ohne Wolke, dieselben Drohnen. Akt 1 wie 3D bis zur 3; die letzten drei Wechsel
//     drehen die Ziffer um ihre Hochachse durch die Tiefe (die neue Form entsteht, während die Ziffer auf der Kante steht),
//     die Ziffern werden heller und heißer, der Ring pulsiert mit jeder Sekunde. Akt 2: Die Null steht, die Kamera tritt
//     zurück, Null und Ring falten sich zu einer Feuerwerkskugel aus Meridianen (wie die Schneeflocke, die sich räumlich
//     auffaltet), die Kugel dreht sich, zündet und zerspringt zu einem Lichtschirm, dessen Funken als Goldregen sinken.
// Tempo: eine Sekunde Countdown ≈ 1,3 s Show (ein Wechsel braucht in den Drohnengrenzen knapp eine Sekunde, dazu der Halt,
// in dem die Ziffer lesbar steht); die Drehungen der letzten drei Sekunden dauern länger, das ist die Steigerung.
// Wächter: scripts/countdown.test.mjs.
import { TAU, GOLD, ORANGE, WARM, mix, smooth, hash, yaw, pitch, part, act } from '../../show-motion.js';
import { assign } from '../../show-flight.js';

// ---------------------------------------------------------------------------------------------------------------------
// FS Einstrich, Ziffern (Versalhöhe 6, Grundlinie 0; [x, y] Ecke, [x, y, "s"] glatter Punkt; erster = letzter Punkt: geschlossen)
const s = 's';
const O_LOOP = [[2, 6, s], [3.1, 5.8, s], [3.8, 5, s], [4, 3.8, s], [4, 2.2, s], [3.8, 1, s], [3.1, 0.2, s], [2, 0, s], [0.9, 0.2, s], [0.2, 1, s], [0, 2.2, s], [0, 3.8, s], [0.2, 5, s], [0.9, 5.8, s], [2, 6, s]];
const GLYPH = {
  0: { w: 3.4, strokes: [O_LOOP.map((q) => [q[0] * 0.85, q[1], q[2]])] },
  1: { w: 3.2, strokes: [[[0.8, 4.9], [2, 6], [2, 0]], [[0.8, 0], [3.2, 0]]] },
  2: { w: 4, strokes: [[[0.1, 4.8], [0.8, 5.7, s], [2, 6, s], [3.2, 5.7, s], [3.8, 4.7, s], [3.5, 3.6, s], [2.4, 2.5, s], [0, 0], [4, 0]]] },
  3: { w: 3.9, strokes: [[[0.2, 5.1], [1, 5.8, s], [2.1, 6, s], [3.2, 5.7, s], [3.7, 4.8, s], [3.3, 3.6, s], [2.1, 3.1]], [[2.1, 3.1], [3.4, 2.5, s], [3.9, 1.3, s], [3.3, 0.3, s], [2, 0, s], [0.9, 0.2, s], [0.1, 0.9]]] },
  4: { w: 3.5, strokes: [[[0, 6], [0, 3], [3.5, 3]], [[3.5, 6], [3.5, 0]]] },
  5: { w: 3.9, strokes: [[[3.7, 6], [0.4, 6], [0.1, 3.5], [1.4, 3.9, s], [2.8, 3.8, s], [3.7, 3, s], [3.9, 1.6, s], [3.3, 0.4, s], [2.1, 0, s], [0.9, 0.2, s], [0, 0.9]]] },
  6: { w: 4, strokes: [[[3.6, 5.5], [2.8, 6, s], [1.6, 5.9, s], [0.6, 5.1, s], [0.1, 3.8, s], [0, 2.6, s], [0.3, 0.9, s], [1.1, 0.1, s], [2.3, 0, s], [3.4, 0.4, s], [4, 1.5, s], [3.8, 2.8, s], [2.9, 3.6, s], [1.6, 3.7, s], [0.5, 3.3, s], [0, 2.6]]] },
  7: { w: 4, strokes: [[[0, 6], [4, 6], [1.6, 0]]] },
  8: { w: 4, strokes: [[[2, 3.1, s], [3.2, 3.8, s], [3.6, 4.8, s], [3.2, 5.7, s], [2, 6, s], [0.8, 5.7, s], [0.4, 4.8, s], [0.8, 3.8, s], [2, 3.1, s], [3.4, 2.4, s], [4, 1.3, s], [3.4, 0.3, s], [2, 0, s], [0.6, 0.3, s], [0, 1.3, s], [0.6, 2.4, s], [2, 3.1, s]]] },
  9: { w: 4, strokes: [[[0.4, 0.5], [1.2, 0, s], [2.4, 0.1, s], [3.4, 0.9, s], [3.9, 2.2, s], [4, 3.4, s], [3.7, 5.1, s], [2.9, 5.9, s], [1.7, 6, s], [0.6, 5.6, s], [0, 4.5, s], [0.2, 3.2, s], [1.1, 2.3, s], [2.4, 2.3, s], [3.5, 2.7, s], [4, 3.4]]] },
};

/** Glatte Kurve durch die Punkte eines Strichs (Hermite; an Ecken die Sehne als Tangente, also gerade Stücke). */
function strokeCurve(st) {
  const closed = st.length > 2 && st[0][0] === st[st.length - 1][0] && st[0][1] === st[st.length - 1][1];
  const P = closed ? st.slice(0, -1) : st, m = P.length, get = (i) => (closed ? P[((i % m) + m) % m] : P[Math.max(0, Math.min(m - 1, i))]);
  const smoothAt = (i) => (closed ? true : i > 0 && i < m - 1) && get(i)[2] === s;
  const out = [], K = 14;
  for (let i = 0; i < (closed ? m : m - 1); i++) {
    const a = get(i), b = get(i + 1), chord = [b[0] - a[0], b[1] - a[1]];
    const ta = smoothAt(i) ? [(b[0] - get(i - 1)[0]) / 2, (b[1] - get(i - 1)[1]) / 2] : chord;
    const tb = smoothAt(i + 1) ? [(get(i + 2)[0] - a[0]) / 2, (get(i + 2)[1] - a[1]) / 2] : chord;
    for (let k = 0; k < K; k++) {
      const u = k / K, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      out.push([h00 * a[0] + h10 * ta[0] + h01 * b[0] + h11 * tb[0], h00 * a[1] + h10 * ta[1] + h01 * b[1] + h11 * tb[1]]);
    }
  }
  if (!closed) out.push([P[m - 1][0], P[m - 1][1]]);
  return { pts: out, closed };
}
const lengthOf = ({ pts, closed }) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (closed) L += Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]); return L; };
/** Punkt an Bogenlänge d (0 … L) einer Polylinie (kumulierte Längen einmal je Linie, dann binäre Suche). */
function pointAt(st, d) {
  if (!st.cum) { const src = st.closed ? [...st.pts, st.pts[0]] : st.pts, cum = [0]; for (let i = 1; i < src.length; i++) cum.push(cum[i - 1] + Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1])); st.src = src; st.cum = cum; }
  const { src, cum } = st; let lo = 1, hi = cum.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < d) lo = mid + 1; else hi = mid; }
  const a = src[lo - 1], b = src[lo], l = cum[lo] - cum[lo - 1], u = l ? Math.max(0, Math.min(1, (d - cum[lo - 1]) / l)) : 0;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

// ---------------------------------------------------------------------------------------------------------------------
// Bühne: Ring (Radius 1) mit zehn Strichen außen, Ziffer innen. Zwei Ebenen: vorn z = +D, hinten −D (Ring ±DR).
export const CAP = 1.4, RING = 1, TICK = [0.045, 0.105], DEPTH = 0.15, DR = 0.1, BEZEL = 1.16;
/** Runde 11b (Marc 21.11.2026: „kann mit viiiiiel viel weniger Drohnen auch schon super funktionieren, einfach deutlich
 * geringere Liniendichte“): ab 400 Drohnen, lockere Linie. Mehr Drohnen kaufen ein Teil (ab 600 eine Lünette außen um die
 * Sekundenstriche, im 3D+-Feuerwerk mehr Meridiane und Strahlen), nicht dichtere Linien: der Abstand bleibt von 400 bis
 * 1000 etwa gleich (Wächter). */
export const level = (n) => (n >= 800 ? 2 : n >= 600 ? 1 : 0);
/** ab 800: ein Strahlenkranz aus 60 kurzen Strahlen außen um die Lünette (wie die Minutenteilung einer Festuhr). */
export const RAYS = 60, RAY_R = [BEZEL + 0.05, BEZEL + 0.13];
/** Tiefe der Ziffer in 3D+: schlanker, weil sie sich dort um π dreht. Vorder- und Hinterebene laufen dabei auf Kreisen;
 * bei 0,15 begannen Drohnen nahe der Achse die Drehung sichtbar in der Gegenrichtung (Finten-Wächter), bei 0,08 bleibt das
 * unter der Schwelle, die Ziffer ist auf der Kante noch als Platte zu sehen. */
export const D_PLUS = 0.08;
export const LABELS = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0'];
/** Striche einer Zahl in Szeneneinheiten, mittig; die „10“ etwas kleiner, damit sie in den Ring passt. */
function numberStrokes(label) {
  const g = CAP / 6, gap = 0.6, glyphs = [...label].map((c) => GLYPH[c]), k = label.length > 1 ? 0.78 : 1;
  const width = glyphs.reduce((a, q) => a + q.w, 0) + gap * (glyphs.length - 1);
  const out = []; let x0 = -width / 2;
  for (const q of glyphs) {
    for (const st of q.strokes) { const c = strokeCurve(st); out.push({ pts: c.pts.map(([x, y]) => [(x + x0) * g * k, (y - 3) * g * k]), closed: c.closed }); }
    x0 += q.w + gap;
  }
  return out;
}
/** Liegt ein Endpunkt auf einer anderen Linie (oder weiter hinten auf der eigenen)? Dann sitzt dort schon eine Drohne. */
function touches(p, strokes, self, end) {
  for (const [k, st] of strokes.entries()) {
    if (k > self) break; // nur frühere Linien: am Stoß zweier Linien behält die erste ihre Enddrohne
    const pts = st.pts, lo = k === self ? (end ? 0 : 20) : 0, hi = k === self ? (end ? pts.length - 20 : pts.length) : pts.length;
    for (let i = lo; i < hi; i++) if (Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]) < 0.035) return true;
  }
  return false;
}
/** Drohnen einer Linie bei Abstand sigma: offene Linien mit Drohne an jedem freien Ende, geschlossene gleichmäßig. */
function sampleStroke(st, sigma, skip0, skip1) {
  const L = lengthOf(st);
  if (st.closed) { const c = Math.max(3, Math.round(L / sigma)); return Array.from({ length: c }, (_, i) => pointAt(st, (i * L) / c)); }
  const inner = Math.max(1, Math.round(L / sigma) - 1), c = inner + (skip0 ? 0 : 1) + (skip1 ? 0 : 1), denom = inner + 1;
  const ds = []; if (!skip0) ds.push(0); for (let i = 1; i <= inner; i++) ds.push((i * L) / denom); if (!skip1) ds.push(L);
  return ds.slice(0, c).map((d) => pointAt(st, d));
}
/** Nimmt Drohnen weg, die einer früheren näher als 0,6 σ kommen (Kreuzung der Acht, T-Stöße). */
function dedupe(list, sigma) {
  const out = [], cell = sigma * 0.6, grid = new Map(), key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  for (const p of list) {
    const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell); let near = false;
    for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1 && !near; b++) for (const q of grid.get(`${cx + a},${cy + b}`) ?? []) if (Math.hypot(q[0] - p[0], q[1] - p[1]) < cell) { near = true; break; }
    if (near) continue;
    out.push(p); const k = key(p[0], p[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p);
  }
  return out;
}
const TICK_N = 2; // Drohnen je Sekundenstrich
const tickPts = () => Array.from({ length: 10 }, (_, m) => { const a = Math.PI / 2 - ((m + 0.5) / 10) * TAU; /* Strich m erlischt, wenn seine Sekunde verstrichen ist */ return Array.from({ length: TICK_N }, (_, i) => { const r = RING + TICK[0] + ((TICK[1] - TICK[0]) * i) / (TICK_N - 1); return [Math.cos(a) * r, Math.sin(a) * r]; }); }).flat();
const RING_L = TAU * RING;

/**
 * Eine Zahl als Drohnenplätze einer Ebene: Linienstücke in allen Ausrichtungen (für die Wahl der Schreibreihenfolge),
 * Abstand sigma so, dass Ziffer, Striche und Ring zusammen genau N Drohnen ergeben (der Ring nimmt den Rest).
 */
function numberLayout(label, N, fixed) {
  const strokes = numberStrokes(label), L = strokes.reduce((a, q) => a + lengthOf(q), 0);
  const flags = strokes.map((st, k) => st.closed ? [false, false] : [touches(st.pts[0], strokes, k, false), touches(st.pts.at(-1), strokes, k, true)]);
  const count = (sigma) => dedupe(strokes.flatMap((st, k) => sampleStroke(st, sigma, ...flags[k])), sigma).length;
  const free = N - fixed;
  let lo = (L + RING_L) / free / 3, hi = (L + RING_L) / free * 3;
  for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (count(mid) + RING_L / mid > free) lo = mid; else hi = mid; }
  const sigma = hi, pieces = strokes.map((st, k) => ({ pts: sampleStroke(st, sigma, ...flags[k]), closed: st.closed }));
  return { label, sigma, pieces };
}
const angleOf = (x, y) => Math.atan2(y, x);
const wrap = (a) => a - TAU * Math.floor((a + Math.PI) / TAU); // auf (−π, π]

/**
 * Das Modell: je Zahl k und Drohne j die Lage in der Bildebene (X, Y), die Ebene (±1) und die Rolle (0 Ziffer, 1 Ring,
 * 2 Strich). Zwei Ebenen mit derselben Lage. Jeder Wechsel ordnet die Drohnen einer Ebene optimal zu (kleinste Summe der
 * Quadratwege): Fliegen dann alle gleichzeitig auf geraden Bahnen, kommen sich zwei nie näher als in Start- und Zielbild
 * (Turpin u. a., CAPT), es gibt also keine Kreuzung und kein Knäuel. Ziffer und Ring tauschen dabei, so viele Drohnen
 * die neue Ziffer mehr oder weniger braucht, und zwar die, die am nächsten stehen.
 * flips: Wechsel (Index der Zielzahl), die sich um die Hochachse drehen. Die Ziffer wird dort in ihrem eigenen Rahmen zur
 * gespiegelten neuen Ziffer und dreht sich um π; ihre vordere Ebene landet hinten. Ring und Tausch fliegen gerade.
 */
export function countdownModel(n, flips = new Set()) {
  const half = [Math.ceil(n / 2), Math.floor(n / 2)], K = LABELS.length;
  const X = LABELS.map(() => new Float64Array(n)), Y = LABELS.map(() => new Float64Array(n)), Z = LABELS.map(() => new Int8Array(n)), ROLE = LABELS.map(() => new Uint8Array(n));
  // feste Teile je Ebene: Sekundenstriche, ab 600 die Lünette (ihre Drohnenzahl beim Abstand, den der Rest ergibt)
  const ticks = tickPts().map((p) => [...p, 2]), lv = level(n);
  if (lv >= 2) for (let q = 0; q < RAYS; q++) { const a = Math.PI / 2 + ((q + 0.5) / RAYS) * TAU; for (const r of RAY_R) ticks.push([Math.cos(a) * r, Math.sin(a) * r, 3]); }
  if (lv >= 1) { const est = (RING_L + 4.3 + TAU * BEZEL) / (half[1] - ticks.length), b = Math.round((TAU * BEZEL) / est); for (let q = 0; q < b; q++) { const a = Math.PI / 2 + ((q + 0.5) / b) * TAU; ticks.push([Math.cos(a) * BEZEL, Math.sin(a) * BEZEL, 3]); } }
  const T = ticks.length;
  const lay = LABELS.map((l) => numberLayout(l, half[1], T));
  const digits = lay.map((l) => dedupe(l.pieces.flatMap((p) => p.pts), l.sigma));
  const put = (k, j, p, L, role) => { X[k][j] = p[0]; Y[k][j] = p[1]; Z[k][j] = L ? -1 : 1; ROLE[k][j] = role; };
  const ringSlots = (r, ph) => Array.from({ length: r }, (_, q) => { const a = ph + (q / r) * TAU; return [Math.cos(a) * RING, Math.sin(a) * RING]; });
  const flat = (list) => Float64Array.from(list.flatMap((p) => [p[0], p[1], 0]));
  // je Ebene: Drohnen-IDs je Ziffernplatz und je Ringplatz
  const st = [0, 1].map((L) => {
    const N = half[L], d = digits[0].length, r = N - d - T, first = L ? half[0] : 0;
    const ids = Array.from({ length: N }, (_, i) => first + i), phase = Math.PI / 2 + Math.PI / r; // Ringplätze versetzt zu den Strichen
    const s0 = { N, digit: ids.slice(0, d), ring: ids.slice(d, d + r), phase };
    ids.slice(d + r).forEach((j, i) => { for (let k = 0; k < K; k++) put(k, j, ticks[i], L, ticks[i][2]); });
    s0.digit.forEach((j, i) => put(0, j, digits[0][i], L, 0));
    const rs = ringSlots(r, phase); s0.ring.forEach((j, i) => put(0, j, rs[i], L, 1));
    return s0;
  });
  /** Ring nach einem Wechsel: Ringdrohnen und Rückkehrer der Reihe nach (Winkel) auf die gleichmäßigen Plätze, mit dem
   * Versatz, der die Wege am kürzesten macht; so überholt sich auf dem Ring niemand. */
  const settleRing = (k, L, ids, slots, out) => {
    const ang = ids.map((j) => Math.atan2(Y[k - 1][j], X[k - 1][j])), order = ids.map((_, q) => q).sort((p, q) => ang[p] - ang[q]);
    const sa = slots.map(([x, y]) => Math.atan2(y, x)), so = slots.map((_, q) => q).sort((p, q) => sa[p] - sa[q]), m = so.length;
    const wrapA = (a) => a - TAU * Math.round(a / TAU);
    let best = 0, cost = Infinity;
    for (let o = 0; o < m; o++) { let c = 0; for (let q = 0; q < m && c < cost; q++) c += wrapA(ang[order[q]] - sa[so[(q + o) % m]]) ** 2; if (c < cost) { cost = c; best = o; } }
    order.forEach((q, r) => { const slot = so[(r + best) % m]; out[slot] = ids[q]; put(k, ids[q], slots[slot], L, 1); });
  };
  for (let k = 1; k < K; k++) {
    const A = digits[k - 1], B = digits[k], flip = flips.has(k);
    // Ziffer → Ziffer optimal (bei der Drehung zur gespiegelten neuen Ziffer im eigenen Rahmen; die Ebenen tauschen)
    const target = flip ? B.map(([x, y]) => [-x, y]) : B, pairs = [];
    if (A.length <= B.length) { const a = assign(flat(A), flat(target)); A.forEach((_, f) => pairs.push([f, a[f]])); }
    else { const a = assign(flat(target), flat(A)); B.forEach((_, g) => pairs.push([a[g], g])); }
    const usedA = new Set(pairs.map(([f]) => f)), usedB = new Set(pairs.map(([, g]) => g));
    const restA = A.map((_, f) => f).filter((f) => !usedA.has(f)), restB = B.map((_, g) => g).filter((g) => !usedB.has(g));
    const old = st.map((x) => x.digit); // vor dem Umbau beider Ebenen festhalten (die Drehung holt aus der anderen Ebene)
    for (const L of [0, 1]) {
      const r = st[L].N - B.length - T, digit = new Array(B.length), ring = new Array(r), slots = ringSlots(r, st[L].phase);
      for (const [f, g] of pairs) { const j = old[flip ? 1 - L : L][f]; digit[g] = j; put(k, j, B[g], L, 0); }
      let pool = st[L].ring;
      if (restB.length) { // die nächsten Ringdrohnen füllen die freien Ziffernplätze
        const a = assign(flat(restB.map((g) => B[g])), flat(pool.map((j) => [X[k - 1][j], Y[k - 1][j]]))), taken = new Set();
        restB.forEach((g, q) => { const j = pool[a[q]]; digit[g] = j; taken.add(j); put(k, j, B[g], L, 0); });
        pool = pool.filter((j) => !taken.has(j));
      }
      settleRing(k, L, [...pool, ...restA.map((f) => old[L][f])], slots, ring); // wer die Ziffer verlässt, bleibt in seiner Ebene
      st[L].digit = digit; st[L].ring = ring;
    }
  }
  return { n, outer: lv >= 2 ? RAY_R[1] : lv >= 1 ? BEZEL : RING + TICK[1], X, Y, Z, ROLE, digits, sigma: lay.map((l) => l.sigma), flips };
}

// ---------------------------------------------------------------------------------------------------------------------
// Zeitplan und Bewegung
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10)); // smootherstep wie die Flüge der Engine
const cubic = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const FIRST = 1.0, HOLD = 0.3, FLIP = 1.9, LAST = 2.2, DIP = 0.09;
/** Maßstab der Bühne für dieses Motiv (fit() in show-field.js: Ring mit Strichen bestimmt die Höhe). */
const kfit = (outer) => (0.9 * 0.75) / outer;
/** Dauer eines Wechsels: so kurz, wie die weiteste Drohne in den Drohnengrenzen fliegen kann (smootherstep: Spitze der
 * Beschleunigung 5,77·d/T², der Geschwindigkeit 1,875·d/T; Reserve für Tiefe und Schwenk), mindestens 0,8 s. */
const morphTime = (d, K) => Math.max(0.8, Math.sqrt((5.7735 * d * K) / 1.9), (1.875 * d * K) / 1.2);
/** Zeitplan: Landezeit jeder Zahl; Wechsel k (zur Zahl k) läuft von start[k] bis land[k]. */
export function timeline(model) {
  const land = [0], start = [0], { X, Y, ROLE, flips, n } = model;
  let t = FIRST;
  for (let k = 1; k < LABELS.length; k++) {
    let d = 0;
    for (let j = 0; j < n; j++) if (!(flips.has(k) && ROLE[k - 1][j] === 0 && ROLE[k][j] === 0)) d = Math.max(d, Math.hypot(X[k][j] - X[k - 1][j], Y[k][j] - Y[k - 1][j]));
    const K = kfit(model.outer); start.push(t); t += flips.has(k) ? Math.max(FLIP, morphTime(d, K)) : morphTime(d, K); land.push(t); t += HOLD;
  }
  return { start, land, end: land.at(-1) + LAST };
}
const STORY_FLIPS = new Set([8, 9, 10]); // 3 → 2, 2 → 1, 1 → 0
const DIGIT = mix(WARM, GOLD, 0.55), RINGC = mix(WARM, GOLD, 0.22), TICKC = GOLD, BEZELC = mix(GOLD, ORANGE, 0.25);

/** Gedimmter Anteil des Rings (0 … 1, im Uhrzeigersinn ab zwölf Uhr): stückweise linear zwischen den Landungen. */
function drained(tl, t) {
  const { land } = tl;
  if (t <= land[0]) return 0;
  for (let k = 1; k < land.length; k++) if (t <= land[k]) return (k - 1 + (t - land[k - 1]) / (land[k] - land[k - 1])) / 10;
  return 1;
}
/** Licht einer Ring- oder Strichdrohne an Winkelstelle f (0 … 1 ab zwölf Uhr im Uhrzeigersinn). */
function ringLight(f, d) {
  if (d <= 0) return 1;
  const lit = smooth((f - d + 0.012) / 0.024), head = d < 1 ? 0.75 * Math.exp(-(((f - d) / 0.02) ** 2)) : 0;
  return 0.18 + 0.82 * lit + head;
}
const clockFrac = (x, y) => { const a = Math.PI / 2 - Math.atan2(y, x); return a / TAU - Math.floor(a / TAU); };

/** Lage und Licht einer Drohne zur Zeit t (ohne die Sway-Drehung des Ganzen). out = [x, y, z, a]. */
function makePose(model, tl, plus) {
  const D = plus ? D_PLUS : DEPTH;
  const { X, Y, Z, ROLE } = model, K = LABELS.length;
  let at = NaN, k = 0, u = 0, phase = 0; // phase 0: Zahl k steht; 1: Wechsel zu k läuft (u)
  const locate = (t) => {
    if (t === at) return; at = t; phase = 0; k = 0;
    for (let q = 1; q < K; q++) { if (t >= tl.land[q]) { k = q; continue; } if (t > tl.start[q]) { k = q; phase = 1; u = (t - tl.start[q]) / (tl.land[q] - tl.start[q]); } break; }
  };
  return (j, t, o) => {
    locate(t);
    const kk = phase ? k - 1 : k, rA = ROLE[kk][j];
    let x = X[kk][j], y = Y[kk][j], z = Z[kk][j] * (rA === 0 ? D : DR), role = rA;
    if (phase) {
      const rB = ROLE[k][j], xB = X[k][j], yB = Y[k][j], zB = Z[k][j] * (rB === 0 ? D : DR), flip = model.flips.has(k);
      if (flip && rA === 0 && rB === 0) {
        // Drehung durch die Tiefe: im eigenen Rahmen bleibt die Ebene, die Form wird zur gespiegelten neuen Ziffer;
        // sie entsteht, während die Ziffer auf der Kante steht
        const th = Math.PI * cubic(u), w = ease((u - 0.12) / 0.76);
        x += (-xB - x) * w; y += (yB - y) * w; // z bleibt: −zB = z
        o[0] = x; o[1] = y; o[2] = z; yaw(o, th); x = o[0]; z = o[2];
      } else {
        // die Ziffer taucht beim Wechsel kurz in die Tiefe (alle Ziffern-Drohnen gleich, das ändert keinen Abstand)
        // bei der Drehung weichen Tauschdrohnen der sich drehenden Ziffer aus: wer geht, geht zuerst (die Ziffer steht noch
        // fast flach), wer dazukommt, kommt zuletzt (sie liegt wieder flach)
        // (der Ring rückt im selben Fenster nach, sonst rückt ein Nachbar auf einen Platz, der noch nicht frei ist)
        const grow = model.digits[k].length > model.digits[k - 1].length;
        const win = flip && rA < 2 && !(rA === 0 && rB === 0) ? (grow ? [0.5, 1] : [0, 0.5]) : [0, 1];
        const w = ease((u - win[0]) / (win[1] - win[0])), dip = rA === 0 && rB === 0 ? -DIP * Math.sin(Math.PI * w) : 0;
        x += (xB - x) * w; y += (yB - y) * w; z += (zB - z) * w + dip;
      }
      role = w2role(rA, rB, u);
    }
    o[0] = x; o[1] = y; o[2] = z;
    // Licht
    const dr = drained(tl, t);
    if (role >= 1) {
      o[3] = role === 3 ? 1 : ringLight(clockFrac(X[kk][j], Y[kk][j]), dr); // die Lünette läuft nicht ab
      // 3D+: ab der Drei pulsiert der ganze Ring mit jeder Sekunde (auch der schon verstrichene Teil leuchtet kurz auf)
      if (plus) { const last = phase ? k - 1 : k; if (last >= 7) o[3] += (0.35 + 0.25 * (last - 7)) * Math.exp(-Math.max(0, t - tl.land[last]) / 0.4); }
    }
    else {
      const since = t - tl.land[phase ? k - 1 : k];
      let a = 1.05 + 0.4 * Math.exp(-Math.max(0, since) / 0.35); // jede Zahl landet mit einem Aufleuchten
      if (plus) { const heat = Math.max(0, (k - 6) / 4); a += 0.25 * heat; }
      o[3] = a;
    }
    if (role > 0 && role < 1) o[3] = 1.05 * (1 - role) + ringLight(clockFrac(o[0], o[1]), dr) * role;
    return o;
  };
}
/** Rolle im Wechsel: Ziffer → Ring blendet das Licht über (Zwischenwerte für den Lichtübergang). */
const w2role = (a, b, u) => (a === b ? a : a >= 2 || b >= 2 ? Math.max(a, b) : a + (b - a) * ease(u));

// Ansicht: fest leicht von der Seite (Dreiviertel), damit Vorder- und Hinterebene als Körper lesbar sind. Ein langsamer
// Schwenk des Ganzen hielt die Drohnen nie an, zwischen zwei Wechseln gab es dann keine Ruhe, und der Finten-Wächter
// (scripts/show-finte.test.mjs) las den Schwenk vor einem Wechsel als Ausholen.
const VIEW = { d3: 0.3, plus: 0.22 };
const TILT = 0.09;

function countdownBeat(n, caption, plus) {
  const flips = plus ? STORY_FLIPS : new Set(), model = countdownModel(n, flips), tl = timeline(model), pose = makePose(model, tl, plus);
  const hold = plus ? tl.land.at(-1) + 0.5 : tl.end, view = plus ? VIEW.plus : VIEW.d3;
  const colour = (j) => { let dig = 0; for (let k = 0; k < LABELS.length; k++) if (model.ROLE[k][j] === 0) dig++; return model.ROLE[0][j] === 2 ? TICKC : model.ROLE[0][j] === 3 ? BEZELC : dig > LABELS.length / 2 ? DIGIT : RINGC; };
  const live = (b, j, t, o) => {
    pose(j, t, o);
    if (!plus && t > tl.land.at(-1)) { // 3D: bei Null läuft das Licht festlich einmal um den Ring, die Null funkelt
      const tau = t - tl.land.at(-1);
      if (model.ROLE[LABELS.length - 1][j]) o[3] = 0.4 + 1.1 * Math.exp(-(((clockFrac(o[0], o[1]) - (tau / 1.6)) / 0.06) ** 2)) + 0.7 * smooth(tau / 1.6);
      else o[3] = 1.15 + 0.25 * Math.sin(tau * 9 + hash(j) * 20);
    }
    yaw(o, view); pitch(o, TILT);
    return o;
  };
  const pts = Array.from({ length: n }, (_, j) => { const o = [0, 0, 0, 1]; live(null, j, 0, o); return [o[0], o[1], o[2], ...colour(j)]; });
  return { pts, caption, hold, live, shimmer: false, model, tl };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3D+, Akt 2: die Null wird zur Feuerwerkskugel und zerspringt zu einem Strahlenschirm, der als Goldregen absinkt
export const GLOBE = 0.8, BURST = 1.5, RAY = 12;
/** Meridiane der Feuerwerkskugel: mehr Drohnen, mehr Meridiane (der Abstand auf einem Meridian bleibt). */
const meridians = (count) => Math.max(4, Math.min(12, Math.round(count / 40)));
export const FOLD = [0.4, 1.7], FUSE = 0.8, BLAST = 1.3, RAIN = 2.8;
/** Plätze auf der Kugel aus Meridianen: vordere Halbkugel (z ≥ 0) für die vordere Ebene, hintere für die hintere. */
function globePts(count, sign) {
  const out = [];
  const M = meridians(count);
  for (let i = 0; i < M; i++) {
    const c = Math.floor((count * (i + 1)) / M) - Math.floor((count * i) / M), beta = ((i + 0.5) / M) * Math.PI, ph0 = 0.2;
    for (let q = 0; q < c; q++) { const ph = ph0 + ((Math.PI - 2 * ph0) * (q + 0.5)) / c; out.push([Math.sin(ph) * Math.cos(beta) * GLOBE, Math.cos(ph) * GLOBE, sign * Math.sin(ph) * Math.sin(beta) * GLOBE]); }
  }
  return out;
}
/** Strahlen des Schirms auf einer Halbkugel: Richtungen gleichmäßig (goldener Winkel), je Strahl RAY Drohnen von innen
 * nach außen; fu = Stelle auf dem Strahl (0 innen … 1 Spitze). */
function rayPts(count, sign) {
  const rays = Math.max(1, Math.round(count / RAY)), GA = Math.PI * (3 - Math.sqrt(5)), out = [];
  for (let i = 0; i < rays; i++) {
    const c = Math.floor((count * (i + 1)) / rays) - Math.floor((count * i) / rays), y = 1 - ((i + 0.5) / rays) * 2, rr = Math.sqrt(1 - y * y), a = GA * i;
    const dir = [Math.cos(a) * rr, y, sign * (0.12 + 0.88 * Math.abs(Math.sin(a))) * rr], l = Math.hypot(...dir);
    for (let q = 0; q < c; q++) { const fu = 0.42 + (0.58 * (q + 0.5)) / c; out.push([(dir[0] / l) * fu * BURST, (dir[1] / l) * fu * BURST, (dir[2] / l) * fu * BURST, fu]); }
  }
  return out;
}
/** Zuordnung in Blöcken: beide Mengen nach Winkel um die Mitte geordnet, je Block von 72 optimal (statt einer Zuordnung
 * über 500 Drohnen, die beim Aufbau zu lange rechnet). Kugel und Schirm sind beide strahlenförmig um die Mitte. */
function blocks(from, to, flat3) {
  const ang = (p) => Math.atan2(p[1], p[0]) + 0.001 * Math.hypot(p[0], p[1]), fi = from.map((_, i) => i).sort((p, q) => ang(from[p]) - ang(from[q])), ti = to.map((_, i) => i).sort((p, q) => ang(to[p]) - ang(to[q]));
  const out = new Int32Array(from.length), nb = Math.ceil(from.length / 72);
  for (let b = 0; b < nb; b++) {
    const r0 = Math.floor((b * from.length) / nb), r1 = Math.floor(((b + 1) * from.length) / nb), a = assign(flat3(fi.slice(r0, r1).map((i) => from[i])), flat3(ti.slice(r0, r1).map((i) => to[i])));
    for (let q = 0; q < r1 - r0; q++) out[fi[r0 + q]] = ti[r0 + a[q]];
  }
  return out;
}
function finaleBeat(n, caption, startPts) {
  // je Ebene (Vorzeichen von z am Ende von Akt 1) die Halbkugel derselben Seite; optimale Zuordnung je Halbkugel
  const globe = new Array(n), ray = new Array(n), groups = [[], []];
  startPts.forEach((p, j) => groups[p[2] >= 0 ? 0 : 1].push(j));
  for (const [L, ids] of groups.entries()) {
    const g = globePts(ids.length, L ? -1 : 1), r = rayPts(ids.length, L ? -1 : 1), flat3 = (l) => Float64Array.from(l.flatMap((p) => [p[0], p[1], p[2]]));
    const a = blocks(ids.map((j) => startPts[j]), g, flat3); ids.forEach((j, q) => { globe[j] = g[a[q]]; });
    const b = blocks(ids.map((j) => globe[j]), r, flat3); ids.forEach((j, q) => { ray[j] = r[b[q]]; });
  }
  const T1 = FOLD[0] + FOLD[1], T2 = T1 + FUSE, T3 = T2 + BLAST;
  const live = (b, j, t, o) => {
    const p = startPts[j], g = globe[j], q = ray[j], w = ease((t - FOLD[0]) / FOLD[1]), e = ease((t - T2) / BLAST);
    // Null und Ring → Kugel → Strahl (gerade Bahnen, zeitgleich: keine Kreuzung)
    let x = p[0] + (g[0] - p[0]) * w, y = p[1] + (g[1] - p[1]) * w, z = p[2] + (g[2] - p[2]) * w;
    x += (q[0] - x) * e; y += (q[1] - y) * e; z += (q[2] - z) * e;
    // Goldregen: die Strahlen neigen sich, die Spitzen sinken am weitesten (wie eine Trauerweide am Himmel)
    y -= 0.42 * q[3] * q[3] * cubic((t - T3 - 0.35) / RAIN); // erst stehen die Funken kurz, dann sinken sie (zwei Bewegungen, kein Überschwingen)
    // keine Drehung: die Strahlen zeigen die Tiefe selbst (eine Drehung des Schirms las der Finten-Wächter als Ausholen)
    o[0] = x; o[1] = y; o[2] = z;
    // Licht: die Kugel flackert wie eine Lunte, Blitz beim Zerspringen, die Spitzen glühen am längsten, dann glimmt alles aus
    const fuse = t > T1 - 0.3 && t < T2 + 0.1 ? 0.4 * Math.max(0, Math.sin(t * 21 + hash(j) * 40)) : 0;
    if (t < T2) { o[3] = 1.1 + fuse; return o; }
    const since = t - T2, flash = 1.2 * Math.exp(-since / 0.3);
    const ember = 0.22 + (0.55 + 0.6 * q[3]) * Math.exp(-since / (1.2 + 1.6 * q[3])) * (0.8 + 0.3 * Math.sin(t * (6 + 7 * hash(j + 3)) + hash(j) * 30));
    o[3] = ember + flash + fuse;
    return o;
  };
  // Bildausschnitt: der ausgebreitete Schirm samt Fall bestimmt den Maßstab dieses Akts (die Kamera tritt etwas zurück)
  // (Kontaktbogen 4: mit dem ganzen Schirm samt Fall stand die Null lange klein in der Mitte; die Spitzen dürfen bis an den Rand)
  const fitPts = [[-0.9 * BURST, 0.9 * BURST, 0], [0.9 * BURST, -0.9 * BURST - 0.15, 0]];
  return { pts: startPts, caption, hold: T3 + 0.35 + RAIN, live, shimmer: false, frame: 'feuerwerk', fitPts };
}

export const builders = {
  countdown3d: (n, caption) => {
    const b = countdownBeat(n, caption, false);
    return { beats: [{ pts: b.pts, caption, hold: b.hold, live: b.live, shimmer: false }] };
  },
  countdownStory: (n, caption) => {
    const a = countdownBeat(n, message('showConfigurator.countdown.storyCount'), true);
    const endPts = a.pts.map((p, j) => { const o = [p[0], p[1], p[2], 1]; a.live(p, j, a.hold, o); return [o[0], o[1], o[2], p[3], p[4], p[5]]; });
    const fin = finaleBeat(n, message('showConfigurator.countdown.storyZero'), endPts);
    const group = (pts) => [part('drohnen', pts, { rigid: true })];
    return { beats: [
      // writes (wie der Baumstern, scenes/schnee.js): die Drehung der Ziffer um π ist der Inhalt. Vorder- und Hinterebene laufen
      // dabei auf Kreisen; Drohnen nahe der Achse beginnen ihren Kreis zur Seite, bevor sie hinüberlaufen. Der Finten-Wächter
      // zieht die gemeinsame Bewegung eines Teils ab, hier dominiert aber der stehende Ring den Teil (eine Trennung in Ziffer und
      // Ring scheitert am Tausch zwischen beiden). Jede Bahn prüft scripts/countdown.test.mjs absolut (Abstand, Tempo, Beschleunigung).
      act(group(a.pts), { caption: a.caption, hold: a.hold, live: a.live, shimmer: false, writes: ['drohnen'] }),
      act(group(fin.pts), { caption: fin.caption, hold: fin.hold, live: fin.live, shimmer: false, frame: fin.frame, fitPts: fin.fitPts }),
    ] };
  },
};
