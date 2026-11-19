// Katalogmotive auf die gewählte Drohnenzahl abtasten.
//
// 2D-Motive (Runde 7, Marc 19.11.2026: „alle deine ‚Auffüllungen‘ der 2D FlyingStars shapes sehen komplett scheiße aus …
// nimm die gleiche Logik wie bei den Logos, wo wir diese Liniendichte als Variable haben“): Aus den Katalogpunkten werden
// einmal je Variante saubere Linien gewonnen (scripts/catalog-2d-lines.mjs → public/media/katalog/linien/<id>.json:
// Mittellinien, Konturen von Flächen, Kreise, Geraden, Bögen). Zur Laufzeit tastet lineSample() sie gleichmäßig ab:
// Knoten (Enden, Kreuzungen, Ecken) bekommen genau eine Drohne, dazwischen gleiche Abstände. Die Liniendichte folgt der
// Drohnenzahl: wenige Drohnen = sparsam, mehr Drohnen = dichter, bis DENSE_SPACING (dann ist eine Linie so dicht, dass
// weitere Drohnen nichts mehr zeigen; sie bleiben dunkel in Reserve, ab 400 Drohnen spielt die Show-Art 3D). Keine Füllung,
// keine Punkte neben der Linie, an Kreuzungen hält jede Drohne Abstand (CLEAR). Die Katalogpunkte sind Vorlage: Farbe und
// Bewegungsgruppe erbt jede Drohne vom nächsten Katalogpunkt (attach()).
//
// 3D-Motive aus dem Katalog (Kugel, Atom …, Show-Art 2D): unten analyse()/resample(), Linien in 3D nachgezeichnet.

/** Dichtester Linienabstand in Motivgrößen (größere Ausdehnung), etwa 48 Drohnen über die Breite des Motivs. */
export const DENSE_SPACING = 0.021;
/** Kein Drohnenpaar steht enger als CLEAR · Linienabstand (an Kreuzungen und spitzen Winkeln). */
export const CLEAR = 0.55;

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
  lines.nodes.forEach(see); lines.dots.forEach(see); lines.curves.forEach((c) => c.p.forEach(see));
  lines.loops.forEach((l) => (l.circle ? [[l.circle[0] - l.circle[2], l.circle[1] - l.circle[2]], [l.circle[0] + l.circle[2], l.circle[1] + l.circle[2]]].forEach(see) : l.p.forEach(see)));
  const used = new Set(curves.flatMap((c) => [c.a, c.b]));
  return { keep: Boolean(lines.keep), s0: lines.s0, nodes: lines.nodes.filter((_, i) => used.has(i)), nodeIds: [...used].sort((a, b) => a - b), all: lines.nodes, curves, loops, dots: lines.dots, size: Math.max(x1 - x0, y1 - y0) || 1 };
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
 * Höchstens n Drohnen gleichmäßig auf den Linien (prepareLines()). Rückgabe { pts: [[x, y, ci?]], spacing }; ci = Index
 * des Katalogpunkts, dessen Farbe die Linie trägt (nur bei von Hand idealisierten Formen).
 * Der Abstand ist der kleinste, bei dem die Zahl noch passt, aber nie enger als DENSE_SPACING · Motivgröße.
 */
export function lineSample(L, n) {
  // Katalogpunkte ohne Verdichtung (keep): alle Punkte, wie FlyingStars sie gesetzt haben
  if (L.keep) return { pts: L.dots.slice(0, n), spacing: DENSE_SPACING * L.size };
  const sMin = DENSE_SPACING * L.size;
  let s = sMin;
  if (count(L, sMin) > n) {
    let lo = sMin, hi = L.size * 4;
    for (let it = 0; it < 26; it++) { const mid = (lo + hi) / 2; if (count(L, mid) > n) lo = mid; else hi = mid; }
    s = hi;
  }
  // Knoten tragen die Farbe einer ihrer Linien (falls die Linien eine feste Farbe haben, sonst die des Katalogs)
  const nodeCi = new Map(); for (const c of L.curves) if (c.ci != null) { nodeCi.set(c.a, c.ci); nodeCi.set(c.b, c.ci); }
  const raw = [...L.dots, ...L.nodeIds.map((i) => [...L.all[i], nodeCi.get(i)])];
  for (const c of L.curves) { const k = Math.max(1, Math.round(c.len / s)); along(c.p, c.c, c.len, k, 1, k - 1, c.ci, raw); }
  for (const l of L.loops) {
    const k = Math.max(3, Math.round(l.len / s));
    if (!l.circle) { along(l.p, l.c, l.len, k, 0, k - 1, l.ci, raw); continue; }
    const [cx, cy, r] = l.circle;
    for (let i = 0; i < k; i++) { const a = Math.PI / 2 + (2 * Math.PI * i) / k; raw.push([cx + r * Math.cos(a), cy + r * Math.sin(a), l.ci]); }
  }
  // Abstand halten: wer einer schon gesetzten Drohne zu nahe kommt, fällt weg (Kreuzungen, spitze Winkel, Ränder)
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
    if (pts.length >= n) break;
  }
  return { pts, spacing: s };
}

/**
 * Farbe, Tiefe und Elternpunkt je Drohne aus den Katalogpunkten (src: [[x, y, z, r, g, b]]). Farbe: Mischung der zwei
 * nächsten Katalogpunkte (Verläufe bleiben weich), bei deutlich verschiedenen Farben die des nächsten (harte Kanten).
 * Rückgabe { pts: [[x, y, z, r, g, b]], parent: Int32Array }.
 */
export function attach(sampled, src) {
  const parent = new Int32Array(sampled.length), pts = [];
  sampled.forEach(([x, y, ci], j) => {
    let a = -1, b = -1, da = Infinity, db = Infinity;
    for (let i = 0; i < src.length; i++) {
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
