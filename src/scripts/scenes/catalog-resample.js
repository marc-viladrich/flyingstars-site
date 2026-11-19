// Katalogmotive auf die gewählte Drohnenzahl abtasten.
//
// 2D-Motive (Runde 7, Marc 19.11.2026: „alle deine ‚Auffüllungen‘ der 2D FlyingStars shapes sehen komplett scheiße aus …
// nimm die gleiche Logik wie bei den Logos, wo wir diese Liniendichte als Variable haben“): Aus den Katalogpunkten werden
// einmal je Variante saubere Linien gewonnen (scripts/catalog-2d-lines.mjs → public/media/katalog/linien/<id>.json:
// Mittellinien, Konturen von Flächen, Kreise, Geraden, Bögen). Zur Laufzeit tastet lineSample() sie gleichmäßig ab:
// Knoten (Enden, Kreuzungen, Ecken) bekommen genau eine Drohne, dazwischen gleiche Abstände. Die Liniendichte folgt der
// Drohnenzahl: wenige Drohnen = sparsam, mehr Drohnen = dichter; sichtbar sind so viele Drohnen wie gewählt (Runde 9,
// lineSample()), ab 400 Drohnen spielt die Show-Art 3D. Motive mit Katalog-Ketten (chain) laufen durch FlyingStars' Punkte. Keine Füllung,
// keine Punkte neben der Linie, an Kreuzungen hält jede Drohne Abstand (CLEAR). Die Katalogpunkte sind Vorlage: Farbe und
// Bewegungsgruppe erbt jede Drohne vom nächsten Katalogpunkt (attach()).
//
// 3D-Motive aus dem Katalog (Kugel, Atom …, Show-Art 2D): unten analyse()/resample(), Linien in 3D nachgezeichnet.

/** Kein Drohnenpaar steht enger als CLEAR · Linienabstand (an Kreuzungen und spitzen Winkeln). */
export const CLEAR = 0.55;
/**
 * Runde 9: ab diesem Abstand (in Motivgrößen) verschmelzen die Lichter zu einem Strich. Gemessen an der 3D-Geburtstagstorte
 * bei 300 Drohnen: Median 0,020, die engsten 10 % 0,008 der Motivgröße, dort stehen die Lichter noch einzeln.
 */
export const DOT_MERGE = 0.009;
/**
 * Drohnenzahl, nach der die Bühne die Lichtgröße bemisst (show-field.js dotRadius, Feld `drones` des Bilds): stehen die
 * Zwischenpunkte enger als DOT_MERGE, werden die Lichter im selben Verhältnis kleiner (show-field begrenzt auf 0,76).
 */
/** Kleinste Lichter der Bühne: show-field.js dotRadius dämpft mit √(300 / Drohnen), höchstens auf 0,76 (≈ 519 Drohnen). */
export const DOT_MAX = Math.floor(300 / 0.76 ** 2);
/**
 * Nachrunde Runde 9: n Drohnen für die Bühne. Reicht auch die kleinste Lichtgröße nicht, damit die Lichter einzeln
 * bleiben (Blume, Zuckerstange), leuchten nur so viele, wie die Linien tragen; die übrigen warten dunkel in Reserve.
 * Rückgabe wie lineSample(), dazu dots (Drohnenzahl für die Lichtgröße).
 */
export function stageSample(L, n) {
  const fits = (s) => dotDrones(s.pts.length, s.spacing, L.size) <= DOT_MAX;
  let best = lineSample(L, n);
  if (!fits(best) && !L.grid) {
    let lo = 1, hi = n;
    for (let it = 0; it < 14 && hi - lo > 1; it++) { const mid = Math.round((lo + hi) / 2), s = lineSample(L, mid); if (fits(s)) { lo = mid; best = s; } else hi = mid; }
    if (!fits(best)) best = lineSample(L, lo);
  }
  return { ...best, dots: Math.min(DOT_MAX, dotDrones(best.pts.length, best.spacing, L.size)) };
}
export function dotDrones(n, spacing, size) {
  const r = spacing / size;
  return r >= DOT_MERGE || !Number.isFinite(r) ? n : Math.round(n * (DOT_MERGE / r) ** 2);
}

/** Linien einer Variante für die Abtastung vorbereiten (einmal je Variante): Längen, Ausdehnung. */
export function prepareLines(lines) {
  const seg = (p) => { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); return c; };
  const curves = lines.curves.map((c) => ({ a: c.a, b: c.b, p: c.p, c: seg(c.p), len: seg(c.p).at(-1), ci: c.ci }));
  const loops = lines.loops.map((l) => {
    if (l.circle) return { circle: l.circle, len: 2 * Math.PI * l.circle[2], ci: l.ci };
    // Start am obersten Punkt (symmetrische Formen bleiben symmetrisch abgetastet)
    let top = 0; l.p.forEach((q, i) => { if (q[1] > l.p[top][1]) top = i; });
    const p = [...l.p.slice(top), ...l.p.slice(0, top), l.p[top]];
    return { p, c: seg(p), len: seg(p).at(-1), ci: l.ci };
  });
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const see = (q) => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); };
  lines.nodes.forEach(see); lines.dots.forEach(see); (lines.grid?.p ?? []).forEach(see); lines.curves.forEach((c) => c.p.forEach(see));
  lines.loops.forEach((l) => (l.circle ? [[l.circle[0] - l.circle[2], l.circle[1] - l.circle[2]], [l.circle[0] + l.circle[2], l.circle[1] + l.circle[2]]].forEach(see) : l.p.forEach(see)));
  const used = new Set(curves.flatMap((c) => [c.a, c.b]));
  const nodeCi = new Map(); for (const c of curves) if (c.ci != null) { nodeCi.set(c.a, c.ci); nodeCi.set(c.b, c.ci); }
  const anchor = Boolean(lines.anchor), lone = anchor ? lines.nodes.filter((_, i) => !used.has(i)) : [];
  return { grid: lines.grid ?? null, anchor, bridges: lines.shape || anchor ? [] : bridgesOf(curves, loops, lines.s0), nodeCi, drop: new Set(lines.drop ?? []), s0: lines.s0, nodes: lines.nodes.filter((_, i) => used.has(i)), nodeIds: [...used].sort((a, b) => a - b), all: lines.nodes, curves, loops, dots: anchor ? lone : lines.dots, size: Math.max(x1 - x0, y1 - y0) || 1 };
}

const count = (L, s) => L.nodes.length + L.dots.length + L.curves.reduce((k, c) => k + Math.max(0, Math.round(c.len / s) - 1), 0) + L.loops.reduce((k, l) => k + Math.max(3, Math.round(l.len / s)), 0);
/** k gleich lange Stücke einer Polylinie (Bogenlänge c), Punkte i = from … to, mit Farbindex ci. */
function along(p, c, len, k, from, to, ci, out) {
  let j = 1;
  for (let i = from; i <= to; i++) {
    const d = (len * i) / k;
    while (j < c.length - 1 && c[j] < d) j++;
    const u = (d - c[j - 1]) / ((c[j] - c[j - 1]) || 1);
    out.push([p[j - 1][0] + (p[j][0] - p[j - 1][0]) * u, p[j - 1][1] + (p[j][1] - p[j - 1][1]) * u, ci]);
  }
}

/**
 * Runde 9 (Marc: „dass wir halt Artefakte noch haben“): freie Linienenden, die knapp vor einer anderen Linie aufhören
 * (Speiche am Rad, Arm am Körper). Im Katalog berühren sie sich fast; dichter abgetastet entstünde dort ein Loch. Je Ende
 * der nächste Punkt auf einer anderen Linie, wenn er näher liegt als 2 Katalog-Punktabstände.
 */
function bridgesOf(curves, loops, s0) {
  const deg = new Map(); for (const c of curves) { deg.set(c.a, (deg.get(c.a) ?? 0) + 1); deg.set(c.b, (deg.get(c.b) ?? 0) + 1); }
  const lines = [...curves.map((c) => c.p), ...loops.filter((l) => l.p).map((l) => l.p)], out = [];
  curves.forEach((c, ci) => {
    for (const [k, e] of [[c.a, c.p[0]], [c.b, c.p.at(-1)]]) {
      if (deg.get(k) !== 1) continue;
      let best = null, bd = 2 * s0;
      lines.forEach((p, li) => {
        if (li === ci) return;
        for (let i = 1; i < p.length; i++) {
          const A = p[i - 1], B = p[i], dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy || 1e-12, u = Math.max(0, Math.min(1, ((e[0] - A[0]) * dx + (e[1] - A[1]) * dy) / l2));
          const q = [A[0] + u * dx, A[1] + u * dy], d = Math.hypot(q[0] - e[0], q[1] - e[1]);
          if (d < bd) { bd = d; best = q; }
        }
      });
      if (best && bd > 1e-6) out.push({ from: e, to: best, d: bd, ci: c.ci });
    }
  });
  return out;
}

/**
 * Auf genau n auffüllen: Die letzten fehlenden Drohnen (Rundung, Abstandsregel an Kreuzungen) kommen dorthin, wo zwischen
 * den gesetzten am meisten Platz ist (Kandidaten: dieselben Linien bzw. dieselbe Fläche halb so dicht abgetastet).
 */
function topUp(pts, cand, n, gap) {
  const k = n - pts.length;
  if (k <= 0 || !cand.length) return pts;
  const far = cand.map((c) => { let d = Infinity; for (const p of pts) d = Math.min(d, (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2); return d; });
  const out = pts.slice();
  for (let i = 0; i < k; i++) {
    let j = 0; for (let q = 1; q < cand.length; q++) if (far[q] > far[j]) j = q;
    if (!(far[j] >= gap * gap)) break; // nur wo die Abstandsregel es erlaubt
    const c = cand[j]; out.push(c);
    for (let q = 0; q < cand.length; q++) far[q] = Math.min(far[q], (cand[q][0] - c[0]) ** 2 + (cand[q][1] - c[1]) ** 2);
  }
  return out;
}

/** Rohpunkte bei Linienabstand s: Knoten, Einzelpunkte, gleichmäßige Stücke je Linie und Schleife. */
function rawAt(L, s) {
  // Knoten tragen die Farbe einer ihrer Linien (falls die Linien eine feste Farbe haben, sonst die des Katalogs)
  const raw = [...L.dots, ...L.nodeIds.map((i) => [...L.all[i], L.nodeCi.get(i)])];
  for (const c of L.curves) { const k = Math.max(1, Math.round(c.len / s)); along(c.p, c.c, c.len, k, 1, k - 1, c.ci, raw); }
  // Brücken über Lücken, die bei diesem Abstand sichtbar würden (zwischen 1,2 und 2,6 Abständen)
  for (const b of L.bridges ?? []) {
    if (b.d <= 1.2 * s || b.d >= 2.6 * s) continue;
    const k = Math.max(2, Math.round(b.d / s));
    for (let i = 1; i < k; i++) raw.push([b.from[0] + ((b.to[0] - b.from[0]) * i) / k, b.from[1] + ((b.to[1] - b.from[1]) * i) / k, b.ci]);
  }
  for (const l of L.loops) {
    const k = Math.max(3, Math.round(l.len / s));
    if (!l.circle) { along(l.p, l.c, l.len, k, 0, k - 1, l.ci, raw); continue; }
    const [cx, cy, r] = l.circle;
    for (let i = 0; i < k; i++) { const a = Math.PI / 2 + (2 * Math.PI * i) / k; raw.push([cx + r * Math.cos(a), cy + r * Math.sin(a), l.ci]); }
  }
  return raw;
}
/**
 * Ankermotiv (Runde 9): alle Katalogpunkte bleiben exakt (Knoten und Einzelpunkte), die übrigen n − Anker Drohnen verteilen
 * sich gleichmäßig auf die Ankerkanten: je Kante k = runde(Länge / s) − 1 Zwischenpunkte, s so gelöst, dass die Summe
 * passt; der Rest geht an die Kanten mit den größten Abständen. Genau n Drohnen, solange es Kanten gibt.
 */
function anchorSample(L, n) {
  const anchors = [...L.nodeIds.map((i) => [...L.all[i]]), ...L.dots.map((q) => [...q])], want = n - anchors.length;
  if (want <= 0 || !L.curves.length) return { pts: anchors.slice(0, Math.max(n, 0)), spacing: Infinity, anchors: anchors.length };
  const sum = (s) => L.curves.reduce((t, c) => t + Math.max(0, Math.round(c.len / s) - 1), 0);
  let lo = 1e-6, hi = Math.max(...L.curves.map((c) => c.len)) * 2;
  for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2; if (sum(mid) > want) lo = mid; else hi = mid; }
  const k = L.curves.map((c) => Math.max(0, Math.round(c.len / hi) - 1));
  let left = want - k.reduce((a, b) => a + b, 0);
  // Rest: immer die Kante, deren Abstände gerade am größten sind (deterministisch, Gleichstand nach Index)
  while (left > 0) { let j = 0; for (let q = 1; q < k.length; q++) if (L.curves[q].len / (k[q] + 1) > L.curves[j].len / (k[j] + 1)) j = q; k[j]++; left--; }
  const pts = [...anchors];
  L.curves.forEach((c, i) => { if (k[i]) along(c.p, c.c, c.len, k[i] + 1, 1, k[i], c.ci, pts); });
  // typischer Abstand (Median der Kantenabstände mit Zwischenpunkten), für die Lichtgröße in scenes/catalog.js
  const gaps = L.curves.flatMap((c, i) => (k[i] ? [c.len / (k[i] + 1)] : [])).sort((a, b) => a - b);
  return { pts, spacing: gaps[gaps.length >> 1] ?? hi, anchors: anchors.length };
}

/**
 * Rastermotiv (Nachrunde Runde 9, wehende Fahne): das Katalogbild ist selbst ein Gitter (R Zeilen × C Spalten, siehe
 * scripts/catalog-2d-lines.mjs gridOf()). Verfeinert wird im Gitter: r × c Punkte mit (r − 1) : (c − 1) = (R − 1) : (C − 1),
 * r · c höchstens n und so groß wie möglich, die Lage bilinear zwischen den Katalog-Gitterpunkten. Die Welle bleibt, das
 * Ergebnis ist regelmäßig; die wenigen übrigen Drohnen bleiben dunkel in Reserve. Katalogpunkte sind Gitterknoten, wo
 * die Verfeinerung ganzzahlig ist.
 */
function gridSample(L, n) {
  const { R, C, p } = L.grid, at = (i, j) => p[i * C + j];
  let best = [R, C];
  for (let f = 1; f <= 8; f += 0.005) { const r = Math.round((R - 1) * f) + 1, c = Math.round((C - 1) * f) + 1; if (r * c <= n && r * c > best[0] * best[1]) best = [r, c]; }
  const [r, c] = best, pts = [];
  for (let a = 0; a < r; a++) for (let b = 0; b < c; b++) {
    const u = (a * (R - 1)) / (r - 1), v = (b * (C - 1)) / (c - 1), i = Math.min(R - 2, Math.floor(u)), j = Math.min(C - 2, Math.floor(v)), fu = u - i, fv = v - j;
    const A = at(i, j), B = at(i, j + 1), Cc = at(i + 1, j), D = at(i + 1, j + 1);
    pts.push([0, 1].map((k) => (1 - fu) * (1 - fv) * A[k] + (1 - fu) * fv * B[k] + fu * (1 - fv) * Cc[k] + fu * fv * D[k]));
  }
  let gap = 0; for (let a = 0; a < r; a++) for (let b = 1; b < c; b++) gap += Math.hypot(pts[a * c + b][0] - pts[a * c + b - 1][0], pts[a * c + b][1] - pts[a * c + b - 1][1]);
  return { pts, spacing: gap / (r * (c - 1)), rows: r, cols: c, anchors: 0 };
}

/** Abstand halten: wer einer schon gesetzten Drohne näher kommt als CLEAR · s, fällt weg (Kreuzungen, Kettenenden). */
function clear(raw, s) {
  const gap = CLEAR * s, gap2 = gap * gap, grid = new Map(), pts = [], key = (gx, gy) => (gx + 4096) * 8192 + gy + 4096;
  for (const q of raw) {
    const gx = Math.floor(q[0] / gap), gy = Math.floor(q[1] / gap);
    let ok = true;
    for (let dx = -1; dx <= 1 && ok; dx++) for (let dy = -1; dy <= 1 && ok; dy++) {
      const cell = grid.get(key(gx + dx, gy + dy));
      if (cell) for (const o of cell) if ((o[0] - q[0]) ** 2 + (o[1] - q[1]) ** 2 < gap2) { ok = false; break; }
    }
    if (!ok) continue;
    const k = key(gx, gy), cell = grid.get(k); if (cell) cell.push(q); else grid.set(k, [q]);
    pts.push(q);
  }
  return pts;
}

/**
 * n Drohnen gleichmäßig auf den Linien (prepareLines()). Rückgabe { pts: [[x, y, ci?]], spacing }; ci = Index des
 * Katalogpunkts, dessen Farbe die Linie trägt (nur bei von Hand idealisierten Formen).
 * Runde 9 (Marc, 19.11.2026: „dass die aber halt jetzt nicht nach 300 Drohnen aussehen … da brauchen wir mehr
 * Consistency“): ein 2D-Motiv zeigt sichtbar so viele Drohnen, wie gewählt sind, so dicht wie ein 3D-Motiv derselben Zahl.
 * Der Abstand wird darum auf n gelöst (höchstens n, im Mittel weniger als ein halbes Prozent darunter), keine Dichtegrenze
 * mehr. Ab 400 Drohnen spielt ohnehin die Show-Art 3D.
 */
export function lineSample(L, n) {
  if (L.grid) return gridSample(L, n);
  if (L.anchor) return anchorSample(L, n);
  let lo = L.size * 1e-4, hi = L.size * 4;
  for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (count(L, mid) > n) lo = mid; else hi = mid; }
  // die Abstandsregel nimmt an Kreuzungen ein paar Drohnen heraus: nachregeln, bis die sichtbare Zahl n trifft
  // (Abstand und Zahl: halber Abstand ≈ doppelte Zahl; erst schätzen, dann zwischen zu dicht und zu dünn halbieren)
  let s = hi, best = null, tooDense = 0, tooThin = Infinity;
  const tol = Math.max(1, Math.round(0.004 * n));
  for (let it = 0; it < 24; it++) {
    const pts = clear(rawAt(L, s), s);
    if (pts.length <= n && (!best || pts.length > best.pts.length)) best = { pts, spacing: s };
    if (pts.length <= n && n - pts.length <= tol) break;
    if (pts.length > n) tooDense = Math.max(tooDense, s); else tooThin = Math.min(tooThin, s);
    const guess = s * (pts.length / n);
    s = tooDense && tooThin < Infinity ? (guess > tooDense && guess < tooThin ? guess : (tooDense + tooThin) / 2) : guess;
  }
  const out = best ?? { pts: clear(rawAt(L, hi * 4), hi * 4).slice(0, n), spacing: hi * 4 };
  return { pts: topUp(out.pts, rawAt(L, out.spacing / 2), n, CLEAR * out.spacing), spacing: out.spacing };
}

/**
 * Farbe, Tiefe und Elternpunkt je Drohne aus den Katalogpunkten (src: [[x, y, z, r, g, b]]). Farbe: Mischung der zwei
 * nächsten Katalogpunkte (Verläufe bleiben weich), bei deutlich verschiedenen Farben die des nächsten (harte Kanten).
 * Rückgabe { pts: [[x, y, z, r, g, b]], parent: Int32Array }.
 */
export function attach(sampled, src, drop = new Set()) {
  const parent = new Int32Array(sampled.length), pts = [];
  sampled.forEach(([x, y, ci], j) => {
    let a = -1, b = -1, da = Infinity, db = Infinity;
    for (let i = 0; i < src.length; i++) {
      if (drop.has(i)) continue; // Auslese-Reste einer Bild-Variante sind keine Elternpunkte
      const d = (src[i][0] - x) ** 2 + (src[i][1] - y) ** 2;
      if (d < da) { b = a; db = da; a = i; da = d; } else if (d < db) { b = i; db = d; }
    }
    da = Math.sqrt(da); db = Math.sqrt(db);
    const A = ci != null ? src[ci] : src[a], B = ci != null ? A : b >= 0 ? src[b] : A;
    const far = Math.hypot(A[3] - B[3], A[4] - B[4], A[5] - B[5]) > 110, w = far ? 0 : da / (da + db || 1);
    parent[j] = a;
    pts.push([x, y, A[2] || 0, Math.round(A[3] + (B[3] - A[3]) * w), Math.round(A[4] + (B[4] - A[4]) * w), Math.round(A[5] + (B[5] - A[5]) * w)]);
  });
  return { pts, parent };
}

// ——— 3D-Motive aus dem Katalog (räumliche Formationen in der Show-Art 2D) ———
// Linien werden zurückgewonnen (Relative-Neighbourhood-Graph) und nachgezeichnet, verdichtet bis DENSE_MAX Drohnen
// (Runde 6); die Katalogpunkte behalten Platz und Index, neue Drohnen folgen ihren Eltern (derive()).
export const DENSE_MAX = 200;
const REACH = 2.1; // längste Kante in mittleren Punktabständen (weiter auseinander: eigene Punkte, z. B. Augen)
const SPAN = 1.7; // längste Kante im Verhältnis zum eigenen nächsten Nachbarn
const FEATURE = 4; // so kleine Punktgruppen sind Einzelheiten, keine Linien
const DOT = 0.32; // Radius des Lichtrings um einen Einzelpunkt, in mittleren Punktabständen

/** Analyse einer räumlichen Katalogvariante, unabhängig von der Drohnenzahl (einmal je Variante): Punktabstand, Linien. */
export function analyse(pts, { flat = false } = {}) {
  const m = pts.length, D = flat ? 2 : 3;
  const dist = new Float64Array(m * m);
  for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) {
    let q = 0; for (let k = 0; k < D; k++) { const v = pts[i][k] - pts[j][k]; q += v * v; }
    dist[i * m + j] = dist[j * m + i] = Math.sqrt(q);
  }
  // nächster Nachbar je Punkt, mittlerer Abstand s0
  const nn = new Float64Array(m).fill(Infinity);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) { const d = dist[i * m + j]; if (j !== i && d > 1e-9 && d < nn[i]) nn[i] = d; }
  const s0 = Array.from(nn).filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(m / 2)] || 0.05;
  // Nachbarn je Punkt innerhalb der Reichweite (für die RNG-Prüfung reichen sie: ein Sperrpunkt liegt näher als d)
  const reach = REACH * s0, near = [];
  for (let i = 0; i < m; i++) { const l = []; for (let j = 0; j < m; j++) if (j !== i && dist[i * m + j] <= reach) l.push(j); near.push(l); }
  // Kanten: nah genug und ohne dritten Punkt, der beiden näher ist (RNG)
  const edges = [];
  for (let i = 0; i < m; i++) for (const j of near[i]) {
    if (j <= i) continue;
    const d = dist[i * m + j];
    if (d < 1e-9 || d > SPAN * Math.max(nn[i], nn[j])) continue;
    let blocked = false;
    for (const k of near[i]) if (k !== j && Math.max(dist[i * m + k], dist[j * m + k]) < d) { blocked = true; break; }
    if (!blocked) edges.push({ a: i, b: j, len: d, w: 1 });
  }
  // Einzelne Punkte ohne Linie (Augen, Knöpfe, Sterne) wachsen als kleiner Lichtring mit, sonst gingen sie zwischen dichter
  // werdenden Linien unter; bei vielen Drohnen liest sich der Ring als gefüllter Punkt
  // Das gilt auch für winzige Gruppen aus bis zu FEATURE Punkten (zwei Augen und ein Mund würden sonst zu Querstrichen)
  const comp = new Int32Array(m).fill(-1), adj = Array.from({ length: m }, () => []);
  for (const e of edges) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
  const size = [];
  for (let i = 0; i < m; i++) {
    if (comp[i] >= 0) continue;
    const c = size.length, stack = [i]; comp[i] = c; let k = 0;
    while (stack.length) { const q = stack.pop(); k++; for (const r of adj[q]) if (comp[r] < 0) { comp[r] = c; stack.push(r); } }
    size.push(k);
  }
  const lines = edges.filter((e) => size[comp[e.a]] > FEATURE);
  edges.length = 0; edges.push(...lines);
  for (let i = 0; i < m; i++) if (size[comp[i]] <= FEATURE) {
    const near = []; for (let j = 0; j < m; j++) if (j !== i && dist[i * m + j] < 2 * DOT * s0) near.push(j);
    edges.push({ a: i, b: i, ring: DOT * s0, near, len: 2 * Math.PI * DOT * s0, w: 1 });
  }
  return { m, s0, edges };
}

/**
 * Neue Drohnen für eine Formation mit `pts.length` Katalogpunkten, damit sie `n` Drohnen hat (höchstens DENSE_MAX).
 * Rückgabe: Liste { a, b, u, off: [dx, dy, dz], rgb: [r, g, b], light } mit Lage = lerp(pts[a], pts[b], u) + off.
 */
export function resample(pts, n, { flat = false, analysis = analyse(pts, { flat }) } = {}) {
  const { m, edges } = analysis, budget = Math.min(n, DENSE_MAX) - m;
  if (budget <= 0 || m < 2 || !edges.length) return [];
  const out = [];
  const lineBudget = budget;
  const placed = []; // Ringpunkte, damit benachbarte Ringe einander ausweichen
  for (const [e, k] of allocate(edges, lineBudget)) {
    const A = pts[e.a], B = pts[e.b];
    if (e.ring) {
      // den Ring so drehen, dass keiner seiner Punkte auf einen Nachbarpunkt fällt (Einzelheiten liegen oft dicht beisammen)
      let best = 0, bestGap = -1;
      for (let r = 0; r < 12; r++) {
        const rot = (r / 12) * ((Math.PI * 2) / k);
        let gap = Infinity;
        for (let i = 0; i < k; i++) {
          const t = (i / k) * Math.PI * 2 + rot, x = A[0] + Math.cos(t) * e.ring, y = A[1] + Math.sin(t) * e.ring;
          for (const j of e.near) gap = Math.min(gap, Math.hypot(pts[j][0] - x, pts[j][1] - y));
          for (const q of placed) if (Math.abs(q[0] - x) < 3 * e.ring && Math.abs(q[1] - y) < 3 * e.ring) gap = Math.min(gap, Math.hypot(q[0] - x, q[1] - y));
        }
        if (gap > bestGap + 1e-12) { bestGap = gap; best = rot; }
      }
      for (let i = 0; i < k; i++) { const t = (i / k) * Math.PI * 2 + best, off = [Math.cos(t) * e.ring, Math.sin(t) * e.ring, 0]; placed.push([A[0] + off[0], A[1] + off[1]]); out.push({ a: e.a, b: e.a, u: 0, off, rgb: [A[3], A[4], A[5]], light: 1 }); }
      continue;
    }
    for (let i = 1; i <= k; i++) {
      const u = i / (k + 1);
      out.push({ a: e.a, b: e.b, u, off: [0, 0, 0], rgb: [Math.round(A[3] + (B[3] - A[3]) * u), Math.round(A[4] + (B[4] - A[4]) * u), Math.round(A[5] + (B[5] - A[5]) * u)], light: 1 });
    }
  }
  return out;
}

/** Zahl der Linienpunkte bei Abstand s (je Kante gleichmäßig, Endpunkte sind die Katalogpunkte). */
function lineCount(edges, s) { let c = 0; for (const e of edges) c += Math.max(0, Math.floor((e.len * e.w) / s + 0.5) - (e.ring ? 0 : 1)); return c; }

/** Genau `budget` Linienpunkte: Abstand per Bisektion, Rest nach größtem Bruchteil (deterministisch). */
function allocate(edges, budget) {
  if (budget <= 0 || !edges.length) return [];
  let lo = 1e-6, hi = Math.max(...edges.map((e) => e.len)) * 2;
  for (let it = 0; it < 50; it++) { const mid = (lo + hi) / 2; if (lineCount(edges, mid) > budget) lo = mid; else hi = mid; }
  const s = hi, want = edges.map((e) => Math.max(0, (e.len * e.w) / s - (e.ring ? 0.5 : 1)));
  const k = want.map((q) => Math.floor(q));
  let left = budget - k.reduce((a, b) => a + b, 0);
  const order = want.map((q, i) => [q - Math.floor(q), i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  for (let r = 0; left > 0; r = (r + 1) % order.length) { k[order[r][1]]++; left--; }
  return edges.map((e, i) => [e, k[i]]).filter(([, c]) => c > 0);
}

/** Lage der neuen Drohnen aus den (schon vorbereiteten) Elternpunkten. */
export function placeDerived(base, derived) {
  return derived.map((d) => {
    const A = base[d.a], B = base[d.b], u = d.u;
    return [A[0] + (B[0] - A[0]) * u + d.off[0], A[1] + (B[1] - A[1]) * u + d.off[1], (A[2] || 0) + ((B[2] || 0) - (A[2] || 0)) * u + d.off[2], ...d.rgb];
  });
}

/**
 * Bewegung für die ganze Formation: die ersten m Drohnen wie bisher (live), jede neue Drohne folgt ihren Eltern: ihre
 * Lage ist die Mischung der beiden bewegten Elternpunkte (plus fester Versatz in der Füllung), ihr Licht das der Eltern.
 * So drehen Räder, Flügel und Gläser ihre Linien mit, und kein Lichtlauf springt.
 */
export function derive(live, base, derived) {
  if (!live || !derived.length) return live;
  const m = base.length, oa = [0, 0, 0, 1], ob = [0, 0, 0, 1];
  const run = (p, j, t, o) => { o[0] = p[0]; o[1] = p[1]; o[2] = p[2] || 0; o[3] = 1; live(p, j, t, o); };
  return (b, j, t, o) => {
    if (j < m) { live(b, j, t, o); return; }
    const d = derived[j - m];
    if (!d) { live(b, j, t, o); return; }
    run(base[d.a], d.a, t, oa);
    if (d.b === d.a) { o[0] = oa[0] + d.off[0]; o[1] = oa[1] + d.off[1]; o[2] = oa[2] + d.off[2]; o[3] = oa[3] * d.light; return; }
    run(base[d.b], d.b, t, ob);
    const u = d.u;
    o[0] = oa[0] + (ob[0] - oa[0]) * u; o[1] = oa[1] + (ob[1] - oa[1]) * u; o[2] = oa[2] + (ob[2] - oa[2]) * u;
    o[3] = (oa[3] + (ob[3] - oa[3]) * u) * d.light;
  };
}
