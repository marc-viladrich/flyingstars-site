// Runde 9 (Marc 19.11.2026: „beim Spotify-Logo sind die Schallwellen noch nicht ganz straight“). Der Konverter setzt die
// Konturpunkte auf die Pixelkante des Rasters; entlang einer Linie springt dadurch jeder Punkt quer zur Linie um ein
// Stück der Pixeltreppe (gemessen bei Spotify: im Median 8 % des Punktabstands, an den Wellen bis 25 %). Am Himmel liest
// sich das als Wackelkurve. smoothRows glättet nur quer zur Linie und nur Punkte mit zwei Nachbarn in fast gerader
// Flucht: Abstände entlang der Linie, Ecken, Linienenden und Punktzahl bleiben, wie sie sind.
// Gilt für beide Wege (vorberechnete Beispiele und live gerechnete Logos, logo-mode.js), damit Logo-Modus und Show
// dieselbe Formation zeigen.

/** Mittlerer Abstand zum nächsten Nachbarn (Median), die Maßeinheit für „benachbart“. */
export function rowSpacing(pts) {
  const d = [];
  for (let i = 0; i < pts.length; i++) {
    let best = Infinity;
    for (let j = 0; j < pts.length; j++) if (j !== i) { const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y, q = dx * dx + dy * dy; if (q < best) best = q; }
    if (best < Infinity) d.push(Math.sqrt(best));
  }
  d.sort((a, b) => a - b);
  return d.length ? d[d.length >> 1] : 0;
}

const sameRow = (a, b) => (a.e == null || b.e == null || a.e === b.e) && (a.cg == null || b.cg == null || a.cg === b.cg);

/**
 * Für jeden Punkt das Nachbarpaar auf seiner Linie: die beiden nächsten Punkte derselben Linie (Element, Farbstück), die
 * auf entgegengesetzten Seiten fast in einer Flucht liegen (Winkel am Punkt ≥ 140°), beide näher als 1,7 Punktabstände.
 * Ohne solches Paar (Ecke, Linienende, Einzelpunkt) null.
 */
export function rowNeighbours(pts, spacing = rowSpacing(pts)) {
  const reach = 1.7 * spacing, out = new Array(pts.length).fill(null), COS = Math.cos((140 * Math.PI) / 180);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], near = [];
    for (let j = 0; j < pts.length; j++) {
      if (j === i || !sameRow(p, pts[j])) continue;
      const dx = pts[j].x - p.x, dy = pts[j].y - p.y, d = Math.hypot(dx, dy);
      if (d > 0 && d <= reach) near.push({ j, d, ux: dx / d, uy: dy / d });
    }
    near.sort((a, b) => a.d - b.d);
    let best = null;
    for (let a = 0; a < near.length; a++) for (let b = a + 1; b < near.length; b++) {
      const A = near[a], B = near[b];
      if (A.ux * B.ux + A.uy * B.uy > COS) continue; // nicht in einer Flucht
      if (!best || A.d + B.d < best.s) best = { a: A.j, b: B.j, s: A.d + B.d };
    }
    if (best) out[i] = [best.a, best.b];
  }
  return out;
}

/** Abweichung quer zur Linie je Punkt mit Nachbarpaar, in Punktabständen (Wächter-Maß der Wackelkurve). */
export function rowWobble(pts, spacing = rowSpacing(pts), pairs = rowNeighbours(pts, spacing)) {
  const out = [];
  pairs.forEach((q, i) => {
    if (!q || !spacing) return;
    const a = pts[q[0]], b = pts[q[1]], p = pts[i], cx = b.x - a.x, cy = b.y - a.y, L = Math.hypot(cx, cy);
    if (!L) return;
    // Abstand des Punkts von der Sehne seiner Nachbarn, abzüglich der Krümmung, die drei Punkte auf einem Bogen ohnehin haben
    out.push(Math.abs(((p.x - a.x) * cy - (p.y - a.y) * cx) / L) / spacing);
  });
  return out;
}

/**
 * Glättet die Punkte einer Formation quer zu ihren Linien (gibt neue Punkt-Objekte zurück, meta bleibt). Drei Runden, je
 * halber Schritt zur Sehnenmitte der Nachbarn, nur die Komponente senkrecht zur Sehne, höchstens 0,3 Punktabstände.
 * Ein Kreis mit 80 Punkten schrumpft dabei um weniger als 0,1 % seines Radius.
 */
export function smoothRows(pts, { rounds = 3, step = 0.5, cap = 0.3 } = {}) {
  if (!pts?.length || pts.length < 3) return pts;
  const spacing = rowSpacing(pts), pairs = rowNeighbours(pts, spacing);
  const x0 = pts.map((p) => p.x), y0 = pts.map((p) => p.y);
  let x = x0.slice(), y = y0.slice();
  for (let r = 0; r < rounds; r++) {
    const nx = x.slice(), ny = y.slice();
    pairs.forEach((q, i) => {
      if (!q) return;
      const ax = x[q[0]], ay = y[q[0]], bx = x[q[1]], by = y[q[1]], cx = bx - ax, cy = by - ay, L = Math.hypot(cx, cy);
      if (!L) return;
      const nxu = -cy / L, nyu = cx / L, mx = (ax + bx) / 2 - x[i], my = (ay + by) / 2 - y[i], off = mx * nxu + my * nyu;
      nx[i] = x[i] + step * off * nxu; ny[i] = y[i] + step * off * nyu;
    });
    x = nx; y = ny;
  }
  const lim = cap * spacing;
  const out = pts.map((p, i) => {
    let dx = x[i] - x0[i], dy = y[i] - y0[i]; const d = Math.hypot(dx, dy);
    if (d > lim) { dx *= lim / d; dy *= lim / d; }
    return { ...p, x: x0[i] + dx, y: y0[i] + dy };
  });
  // (Eigenschaften am Array wie meta, frame, minimum bleiben erhalten)
  for (const key of Object.keys(pts)) if (!/^\d+$/.test(key)) out[key] = pts[key];
  return out;
}
