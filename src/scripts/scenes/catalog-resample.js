// Katalogmotive auf die gewählte Drohnenzahl abtasten (Runde 5, Marc 18.11.2026: „Es macht visually keinen Unterschied
// bei den ganzen FlyingStars-eigenen Motiven … welche Anzahl an Drohnen wir haben … mehr Drohnen bringen mehr Schärfe“).
// Vorher zeigte jedes Katalogmotiv die Punkte seiner Katalogvariante; alle weiteren Drohnen warteten dunkel.
//
// Der Katalog liefert nur Punkte, keine Linien. Die Linien werden zurückgewonnen: Nachbarpunkte im Abstand einer
// gezeichneten Linie werden verbunden (Relative-Neighbourhood-Graph, also nur „direkte“ Nachbarn, keine Abkürzungen über
// Ecken; weite Sprünge wie Auge → Umriss bleiben unverbunden). Zusätzliche Drohnen kommen in dieser Reihenfolge dazu:
//   1. Außenkontur: Kanten am Außenrand werden zuerst und am dichtesten nachgezeichnet,
//   2. Binnenlinien: Kanten innen etwas weniger dicht (Gewicht INNER),
//   3. Füllung (nur flache Motive): ab dreifacher Liniendichte füllt ein gleichmäßiges Dreiecksraster die Innenfläche,
//      mit Abstand zu allen Linien und gedimmt, damit Umriss und Binnenzeichnung lesbar bleiben.
// Jede neue Drohne steht auf einer Linie zwischen zwei Katalogpunkten oder im Raster, nie auf einem belegten Punkt und
// nie zufällig verstreut. Die Katalogpunkte selbst behalten Platz und Index (Bewegungsgruppen, Aktionen und Masken in
// catalog-actions.js beziehen sich darauf); die neuen Drohnen folgen ihren Eltern-Punkten (derive()).
// Rechenzeit: ein Motiv mit 300 Punkten auf 1000 Drohnen < 5 ms (scripts/catalog-resample.test.mjs misst es).

const INNER = 0.72; // Binnenlinien relativ zur Außenkontur
const LINE_CAP = 3; // flache Motive mit großer Innenfläche: ab dreifacher Liniendichte kommt die Füllung dazu
const FILL_LIGHT = 0.5; // Helligkeit der Füllung
const FILL_SHARE = 0.16; // gefüllt wird nur eine Innenfläche ab diesem Anteil der Silhouette
const REACH = 2.1; // längste Kante in mittleren Punktabständen (weiter auseinander: eigene Punkte, z. B. Augen)
const SPAN = 1.7; // längste Kante im Verhältnis zum eigenen nächsten Nachbarn
const FEATURE = 4; // so kleine Punktgruppen sind Einzelheiten, keine Linien
const DOT = 0.32; // Radius des Lichtrings um einen Einzelpunkt, in mittleren Punktabständen

/**
 * Analyse einer Katalogvariante, unabhängig von der Drohnenzahl (einmal je Variante): mittlerer Punktabstand, Linien
 * (Kanten mit Gewicht außen/innen), bei flachen Motiven das Raster mit Außenraum und großen Innenflächen.
 */
export function analyse(pts, { flat = true } = {}) {
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
  // Außen und innen, Innenfläche (nur flach): Punkte als Scheiben in ein Raster, von außen fluten
  let grid = null;
  if (flat && edges.length) {
    grid = raster(pts, s0);
    const outer = new Uint8Array(m);
    for (let i = 0; i < m; i++) outer[i] = grid.touchesOutside(pts[i][0], pts[i][1]) ? 1 : 0;
    for (const e of edges) e.w = e.ring || !(outer[e.a] && outer[e.b]) ? INNER : 1;
    if (!grid.interior.count) grid = null;
  }
  return { m, s0, edges, grid };
}

/**
 * Neue Drohnen für eine Formation mit `pts.length` Katalogpunkten, damit sie `n` Drohnen hat.
 * pts: [[x, y, z, r, g, b], …]; flat: Motiv liegt in der Bildebene (Füllung möglich); analysis: analyse(pts) aus dem
 * Zwischenspeicher. Rückgabe: Liste { a, b, u, off: [dx, dy, dz], rgb: [r, g, b], light } mit
 * Lage = lerp(pts[a], pts[b], u) + off, genau n − pts.length Einträge (ohne Linien: keine, die Drohnen bleiben Reserve).
 * Ohne große Innenfläche gibt es keine Grenze für die Liniendichte: eine echte Show mit mehr Drohnen fliegt dasselbe Bild
 * größer; auf der Bühne steht es gleich groß, mit kleineren Lichtern und dichteren Linien.
 */
export function resample(pts, n, { flat = true, analysis = analyse(pts, { flat }) } = {}) {
  const { m, s0, edges, grid } = analysis, budget = n - m;
  if (budget <= 0 || m < 2 || !edges.length) return [];
  const out = [];
  let fill = [], lineBudget = budget;
  if (grid) {
    const cap = s0 / LINE_CAP;
    lineBudget = Math.min(budget, lineCount(edges, cap));
    if (budget > lineBudget) fill = fillPoints(grid, pts, budget - lineBudget, cap * 1.15, s0 * 1.1);
    lineBudget = budget - fill.length; // was das Raster nicht aufnimmt, geht zurück auf die Linien (über die Grenze)
  }
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
  return out.concat(fill);
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

/** Raster der Zeichnung: Linienzellen (Scheiben um jeden Punkt), Außenraum per Flutung, Innenfläche = der Rest. */
function raster(pts, s0) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const pad = 2 * s0;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const cell = Math.max(s0 / 2.5, (x1 - x0) / 240, (y1 - y0) / 240);
  const W = Math.ceil((x1 - x0) / cell) + 1, H = Math.ceil((y1 - y0) / cell) + 1;
  const LINE = 1, OUT = 2, state = new Uint8Array(W * H);
  const R = 1.3 * s0, rc = Math.ceil(R / cell);
  const cx = (x) => Math.round((x - x0) / cell), cy = (y) => Math.round((y - y0) / cell);
  for (const p of pts) {
    const px = cx(p[0]), py = cy(p[1]);
    for (let dy = -rc; dy <= rc; dy++) for (let dx = -rc; dx <= rc; dx++) {
      const x = px + dx, y = py + dy;
      if (x < 0 || y < 0 || x >= W || y >= H || (dx * dx + dy * dy) * cell * cell > R * R) continue;
      state[y * W + x] = LINE;
    }
  }
  // Außenraum von allen Randzellen aus fluten (4er-Nachbarschaft)
  const stack = [];
  const push = (x, y) => { const i = y * W + x; if (!state[i]) { state[i] = OUT; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i - x) / W;
    if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1);
  }
  // Innenflächen als zusammenhängende Stücke; gefüllt werden nur große (≥ FILL_SHARE der Silhouette, z. B. der Körper des
  // Hundes). Kleine Stücke zwischen Binnenlinien (Gesicht, Knöpfe) blieben als graue Flecken stehen und bleiben leer.
  let silhouette = 0;
  for (let i = 0; i < state.length; i++) if (state[i] !== OUT) silhouette++;
  const SMALL = 3; let count = 0;
  for (let i0 = 0; i0 < state.length; i0++) {
    if (state[i0]) continue;
    const piece = [i0]; state[i0] = SMALL;
    for (let q = 0; q < piece.length; q++) {
      const i = piece[q], x = i % W, y = (i - x) / W;
      if (x > 0 && !state[i - 1]) { state[i - 1] = SMALL; piece.push(i - 1); }
      if (x < W - 1 && !state[i + 1]) { state[i + 1] = SMALL; piece.push(i + 1); }
      if (y > 0 && !state[i - W]) { state[i - W] = SMALL; piece.push(i - W); }
      if (y < H - 1 && !state[i + W]) { state[i + W] = SMALL; piece.push(i + W); }
    }
    if (piece.length >= FILL_SHARE * silhouette) { for (const i of piece) state[i] = 4; count += piece.length; }
  }
  const at = (x, y) => { const gx = cx(x), gy = cy(y); return gx < 0 || gy < 0 || gx >= W || gy >= H ? OUT : state[gy * W + gx]; };
  return {
    interior: { count },
    /** Liegt Außenraum gleich hinter der Scheibe dieses Punkts? Dann gehört er zur Außenkontur. */
    touchesOutside(x, y) {
      const r = R + cell * 1.5;
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; if (at(x + Math.cos(a) * r, y + Math.sin(a) * r) === OUT) return true; }
      return false;
    },
    isInterior: (x, y) => at(x, y) === 4,
    box: [x0, y0, x1, y1],
  };
}

/** Füllung: Dreiecksraster in der Innenfläche, so dicht wie nötig, höchstens `budget` Punkte, nie dichter als `minGap`. */
function fillPoints(grid, pts, budget, minGap, maxGap) {
  const [x0, y0, x1, y1] = grid.box;
  const lattice = (r, list = null) => {
    let c = 0; const h = r * Math.sqrt(3) / 2;
    for (let row = 0, y = y0; y <= y1; row++, y += h) for (let x = x0 + (row % 2 ? r / 2 : 0); x <= x1; x += r) if (grid.isInterior(x, y)) { c++; list?.push([x, y]); }
    return c;
  };
  let lo = minGap, hi = Math.max(x1 - x0, y1 - y0);
  if (lattice(maxGap) > budget) return []; // zu wenige Drohnen für eine geschlossene Fläche: lieber dichtere Linien
  if (lattice(lo) <= budget) hi = lo; // selbst dicht passt alles: dichtestes Raster nehmen
  else for (let it = 0; it < 18; it++) { const mid = (lo + hi) / 2; if (lattice(mid) > budget) lo = mid; else hi = mid; }
  const cells = []; lattice(hi, cells);
  return cells.map(([x, y]) => {
    let a = 0, best = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2; if (d < best) { best = d; a = i; } }
    const p = pts[a];
    return { a, b: a, u: 0, off: [x - p[0], y - p[1], 0], rgb: [p[3], p[4], p[5]], light: FILL_LIGHT };
  });
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
