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

// ---------------------------------------------------------------------------------------------------------------------
// Runde 10 (Marc 20.11.2026: „Spotify Logo ist immer noch broken“). Die Glättung quer zur Linie (oben) nahm nur die
// Pixeltreppe heraus. Das eigentliche Problem liegt eine Ebene höher: Ein dünner Strich (Spotify-Welle, Lochkontur im
// grünen Kreis) wird als geschlossene Kontur abgetastet, deren beide Seiten nur ein bis drei Punktabstände auseinander
// liegen. Der Konverter verteilt die Punkte je Seite für sich: die Innenseite bekommt weniger Punkte als die Außenseite,
// der Abstand der beiden Linien schwankt (gemessen bis ±40 %), und an den Enden bleibt die Kontur offen oder läuft schräg
// zusammen. Am Himmel liest sich das als zwei unruhige Linien statt als ein Band.
// regularRibbons erkennt solche Bänder (geschlossene Kontur, lang und schmal im Verhältnis zum Punktabstand) und legt
// dieselben Punkte neu auf ein sauberes Band: geglättete Mittellinie, Breite konstant oder gleichmäßig verjüngt (lineare
// Anpassung, damit Keile wie die Shell-Strahlen keil bleiben), runde Enden, gleiche Abstände entlang der Kontur.
// Punktzahl, Farben, Elemente und die Reihenfolge der Punkte entlang der Kontur bleiben; nur die Lage ändert sich, und
// nur, wenn das neue Band die alten Punkte gut trifft (sonst bleibt die Kontur unverändert).

const hyp = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

/**
 * Konturzüge in der Reihenfolge des Konverters (er gibt jede Kontur als zusammenhängende Folge aus). Ein Zug endet bei
 * einem Sprung (mehr als 1,8 lokale Punktabstände) oder beim Wechsel von Element/Farbstück. Einzelne versprengte Punkte
 * (Züge mit höchstens 3 Punkten) werden in den nächsten Zug eingefügt, wenn sie höchstens 1,6 seiner Punktabstände
 * entfernt liegen, an der Stelle, die den Zug am wenigsten verlängert. → [[Index, …], …]
 */
export function contourChains(pts) {
  const n = pts.length; if (!n) return [];
  const st = []; for (let i = 1; i < n; i++) st.push(hyp(pts[i].x, pts[i].y, pts[i - 1].x, pts[i - 1].y));
  const chains = []; let cur = [0];
  for (let i = 1; i < n; i++) {
    const s = st[i - 1], w = median([...st.slice(Math.max(0, i - 5), i - 1), ...st.slice(i, i + 4)]);
    if (!sameRow(pts[i], pts[i - 1]) || (w > 0 && s > 1.8 * w)) { chains.push(cur); cur = []; }
    cur.push(i);
  }
  chains.push(cur);
  const big = chains.filter((c) => c.length > 3), small = chains.filter((c) => c.length <= 3);
  const stepOf = (c) => median(c.slice(1).map((j, t) => hyp(pts[j].x, pts[j].y, pts[c[t]].x, pts[c[t]].y)));
  const steps = new Map(big.map((c) => [c, stepOf(c)]));
  const added = new Map();
  for (const c of small) for (const i of c) {
    let best = null;
    for (const b of big) {
      if (!sameRow(pts[i], pts[b[0]]) || (added.get(b) || 0) >= Math.max(2, 0.15 * b.length)) continue;
      const h = steps.get(b);
      for (let t = 0; t < b.length; t++) {
        const a = pts[b[t]], z = pts[b[(t + 1) % b.length]], d = hyp(pts[i].x, pts[i].y, a.x, a.y);
        if (d > 1.6 * h) continue;
        const add = d + hyp(pts[i].x, pts[i].y, z.x, z.y) - hyp(a.x, a.y, z.x, z.y);
        if (!best || add < best.add) best = { b, t, add };
      }
    }
    if (best) { best.b.splice(best.t + 1, 0, i); added.set(best.b, (added.get(best.b) || 0) + 1); } else big.push([i]);
  }
  return big;
}

/** Polylinie [x, y][] → kumulierte Länge */
function cumul(P) { const s = [0]; for (let i = 1; i < P.length; i++) s.push(s[i - 1] + hyp(P[i][0], P[i][1], P[i - 1][0], P[i - 1][1])); return s; }
/** gleichmäßig nach Bogenlänge abgetastet, m Punkte inkl. beider Enden */
function resample(P, m) {
  const s = cumul(P), L = s.at(-1), out = []; let j = 0;
  for (let k = 0; k < m; k++) {
    const u = (L * k) / (m - 1); while (j < P.length - 2 && s[j + 1] < u) j++;
    const t = s[j + 1] > s[j] ? (u - s[j]) / (s[j + 1] - s[j]) : 0;
    out.push([P[j][0] + t * (P[j + 1][0] - P[j][0]), P[j][1] + t * (P[j + 1][1] - P[j][1])]);
  }
  return out;
}
/** nächster Punkt auf einer offenen Polylinie: { s (Bogenlänge), d (vorzeichenbehaftet, links positiv), dist } */
function project(P, s, x, y) {
  let best = null;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-12;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), px = ax + t * dx, py = ay + t * dy, dist = hyp(x, y, px, py);
    if (!best || dist < best.dist) { const L = Math.sqrt(L2); best = { s: s[i] + t * L, d: ((x - ax) * dy - (y - ay) * dx) / L * -1, dist, t, i }; }
  }
  return best;
}

/** Abstand (in Punktabständen), den ein Strich vor seinen Enden frei haben muss. */
export const FREE_END = 2;

/** Gerade Enden nur, wenn ihr mittlerer Abstand zu den alten Punkten höchstens diesen Anteil der runden Enden hat. */
export const SQUARE_GAIN = 0.3;

/** Schnitt eines Strahls (o + t·d, t > 0) mit dem geschlossenen Polygon Q: kleinstes t oder Infinity */
function rayHit(Q, ox, oy, dx, dy) {
  let best = Infinity;
  for (let i = 0; i < Q.length; i++) {
    const a = Q[i], b = Q[(i + 1) % Q.length], ex = b[0] - a[0], ey = b[1] - a[1], den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - ox) * ey - (a[1] - oy) * ex) / den, u = ((a[0] - ox) * dy - (a[1] - oy) * dx) / den;
    if (t > 1e-9 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return best;
}
/** Taubin-Glättung einer offenen Linie (schrumpft nicht), Enden fest */
function taubin(C, its) {
  for (let it = 0; it < its; it++) for (const f of [0.5, -0.53]) {
    const n = C.map((p) => p.slice());
    for (let k = 1; k < C.length - 1; k++) for (const c of [0, 1]) n[k][c] = C[k][c] + f * ((C[k - 1][c] + C[k + 1][c]) / 2 - C[k][c]);
    C = n;
  }
  return C;
}

/**
 * Passt ein Band an eine geschlossene Kontur (Punkte in Konturreihenfolge). Gibt null zurück, wenn die Kontur kein
 * schmales, langes Band mit gleichmäßiger Breite ist. → { pts: neue Lagen in derselben Reihenfolge, width, taper,
 * step, err, L, caps: 'round' | 'square' }
 */
export function fitRibbon(Q, { maxWidth = 3, minWidth = 0.9, minAspect = 4, minPoints = 14 } = {}) {
  const N = Q.length; if (N < minPoints) return null;
  const h = median(Q.map((p, i) => { const q = Q[(i + 1) % N]; return hyp(p[0], p[1], q[0], q[1]); }));
  if (!h) return null;
  // Erste Mittellinie: Spitzen = am weitesten entfernte Punkte, beide Seiten nach Bogenlänge gepaart
  let a = 0, b = 0, far = -1;
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const d = hyp(Q[i][0], Q[i][1], Q[j][0], Q[j][1]); if (d > far) { far = d; a = i; b = j; } }
  const side1 = [], side2 = [];
  for (let i = a; ; i = (i + 1) % N) { side1.push(Q[i]); if (i === b) break; }
  for (let i = a; ; i = (i - 1 + N) % N) { side2.push(Q[i]); if (i === b) break; }
  if (side1.length < 3 || side2.length < 3) return null;
  const K = Math.max(12, Math.round(N / 2)), r1 = resample(side1, K), r2 = resample(side2, K);
  let C = taubin(r1.map((p, k) => [(p[0] + r2[k][0]) / 2, (p[1] + r2[k][1]) / 2]), 12);
  // Verfeinerung: jeder Punkt der Mittellinie in die Mitte zwischen beide Seiten (entlang seiner Normalen), die Enden
  // auf die Kontur in Verlängerung der Linie. So liegt die Mittellinie auch dann richtig, wenn eine Spitze in einer Ecke
  // saß (gerades Band mit einem eckigen und einem spitzen Ende)
  for (let pass = 0; pass < 3; pass++) {
    C = resample(C, K);
    const nC = C.map((p) => p.slice());
    for (let k = 1; k < K - 1; k++) {
      let tx = C[k + 1][0] - C[k - 1][0], ty = C[k + 1][1] - C[k - 1][1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const t1 = rayHit(Q, C[k][0], C[k][1], -ty, tx), t2 = rayHit(Q, C[k][0], C[k][1], ty, -tx);
      if (Number.isFinite(t1) && Number.isFinite(t2) && t1 + t2 < 2 * maxWidth * h) { nC[k][0] += ((t1 - t2) / 2) * -ty; nC[k][1] += ((t1 - t2) / 2) * tx; }
    }
    for (const [e, i1, i2] of [[0, 1, 2], [K - 1, K - 2, K - 3]]) {
      let dx = nC[i1][0] - nC[i2][0], dy = nC[i1][1] - nC[i2][1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const t = rayHit(Q, nC[i1][0], nC[i1][1], dx, dy);
      if (Number.isFinite(t) && t < 4 * h) nC[e] = [nC[i1][0] + t * dx, nC[i1][1] + t * dy];
    }
    C = taubin(nC, 3);
  }
  C = resample(C, K);
  const sC = cumul(C), L = sC.at(-1);
  // Halbbreite je Punkt; lineare Anpassung über den Mittelteil (Enden zählen nicht, dort laufen die Seiten zusammen)
  const pr = Q.map((p) => project(C, sC, p[0], p[1]));
  const r0 = median(pr.map((q) => q.dist));
  if (!(r0 > 0) || 2 * r0 > maxWidth * h || 2 * r0 < minWidth * h || L < minAspect * 2 * r0) return null;
  const mid = pr.filter((q) => q.s > 1.5 * r0 && q.s < L - 1.5 * r0);
  if (mid.length < 4) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0; for (const q of mid) { sx += q.s; sy += q.dist; sxx += q.s * q.s; sxy += q.s * q.dist; }
  const den = mid.length * sxx - sx * sx, beta = den > 1e-12 ? (mid.length * sxy - sx * sy) / den : 0, alpha = (sy - beta * sx) / mid.length;
  // Breite gleichmäßig (konstant oder linear verjüngt)? Ein Blatt, eine Linse oder eine Sichel ist kein Band
  const res = Math.sqrt(mid.reduce((t, q) => t + (q.dist - alpha - beta * q.s) ** 2, 0) / mid.length);
  if (res > 0.2 * h) return null;
  // breiter als 3 Punktabstände (an einem der Enden): dann trägt die Kontur schon selbst, und eckige Enden (Buchstaben)
  // sind sichtbar; die bleiben, wie der Konverter sie setzt
  if (2 * Math.max(alpha, alpha + beta * L) > maxWidth * h) return null;
  const rad = (s) => Math.max(0.4 * h, alpha + beta * s);
  const at = (s) => {
    s = Math.max(0, Math.min(L, s)); let i = 0; while (i < K - 2 && sC[i + 1] < s) i++;
    const seg = sC[i + 1] - sC[i] || 1e-12, t = (s - sC[i]) / seg, tx = (C[i + 1][0] - C[i][0]) / seg, ty = (C[i + 1][1] - C[i][1]) / seg;
    return { x: C[i][0] + t * (C[i + 1][0] - C[i][0]), y: C[i][1] + t * (C[i + 1][1] - C[i][1]), tx, ty, nx: -ty, ny: tx };
  };
  const rA = rad(0), rB = rad(L);
  if (L - rA - rB < 2 * h) return null;
  // Krümmung der Mittellinie muss die Breite tragen (sonst faltet die Innenseite), und ein Strich biegt sich insgesamt
  // höchstens um 150° (Bögen wie die Spotify-Wellen; ein S, C oder U aus einer Schrift bleibt, wie es ist)
  let total = 0;
  for (let k = 1; k < K - 1; k++) {
    const ux = C[k][0] - C[k - 1][0], uy = C[k][1] - C[k - 1][1], vx = C[k + 1][0] - C[k][0], vy = C[k + 1][1] - C[k][1];
    const turn = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)), ds = (Math.hypot(ux, uy) + Math.hypot(vx, vy)) / 2;
    if (turn > 1e-6 && ds / turn < 1.15 * rad(sC[k])) return null;
    total += turn;
  }
  if (total > (150 * Math.PI) / 180) return null;
  const M = 64, side = (s0, s1, sign) => { const o = []; for (let k = 0; k <= M; k++) { const s = s0 + ((s1 - s0) * k) / M, p = at(s), r = rad(s); o.push([p.x + sign * r * p.nx, p.y + sign * r * p.ny]); } return o; };
  // Umriss mit runden Enden (Kappe um die Mittellinie bei rA bzw. L − rB, Scheitel auf der Kontur)
  function roundOutline() {
    const O = [], cA = at(rA), cB = at(L - rB);
    for (let k = 0; k <= M / 2; k++) { const ph = Math.PI * (k / (M / 2)), c = Math.cos(ph), s = Math.sin(ph); O.push([cA.x - c * rA * cA.nx - s * rA * cA.tx, cA.y - c * rA * cA.ny - s * rA * cA.ty]); }
    O.push(...side(rA, L - rB, 1).slice(1));
    for (let k = 1; k <= M / 2; k++) { const ph = Math.PI * (k / (M / 2)), c = Math.cos(ph), s = Math.sin(ph); O.push([cB.x + s * rB * cB.tx + c * rB * cB.nx, cB.y + s * rB * cB.ty + c * rB * cB.ny]); }
    O.push(...side(L - rB, rA, -1).slice(1, -1));
    return { O, start: M / 4, corners: [] };
  }
  // Umriss mit geraden Enden (Kante quer zur Mittellinie bei 0 bzw. L, Ecken als feste Punkte)
  function squareOutline() {
    const plus = side(0, L, 1), minus = side(L, 0, -1);
    const O = [...plus, ...minus];
    return { O, start: null, corners: [0, plus.length - 1, plus.length, O.length - 1] };
  }
  const fits = [roundOutline(), squareOutline()].map((f) => {
    const O = [...f.O, f.O[0]], sO = cumul(O), errs = Q.map((p) => project(O, sO, p[0], p[1]).dist);
    return { ...f, O, sO, P: sO.at(-1), err: { max: Math.max(...errs) / h, mean: errs.reduce((x, y) => x + y, 0) / N / h } };
  });
  // runde Enden haben Vorrang (bei wenigen Punkten passen beide Formen ähnlich); gerade nur, wenn sie deutlich besser
  // passen (Buchstabenstämme, Innenräume, Balken)
  const square = fits[1].err.mean < SQUARE_GAIN * fits[0].err.mean, fit = square ? fits[1] : fits[0], caps = square ? 'square' : 'round';
  if (globalThis.__ribbonDebug) globalThis.__ribbonDebug.push({ round: fits[0].err, square: fits[1].err });
  if (fit.err.max > 0.6 || fit.err.mean > 0.1) return null;
  const { O, sO, P } = fit, pos = (u) => { u = ((u % P) + P) % P; let i = 0; while (i < O.length - 2 && sO[i + 1] < u) i++; const t = (u - sO[i]) / (sO[i + 1] - sO[i] || 1e-12); return [O[i][0] + t * (O[i + 1][0] - O[i][0]), O[i][1] + t * (O[i + 1][1] - O[i][1])]; };
  // N Lagen: runde Enden gleichmäßig ab dem Scheitel von Kappe A; gerade Enden mit je einem Punkt auf jeder Ecke und den
  // übrigen gleichmäßig je Kante (Anteil nach Länge)
  const slots = [];
  if (caps === 'round') for (let k = 0; k < N; k++) slots.push(pos(sO[fit.start] + (P * k) / N));
  else {
    // je Kante so viele Abschnitte, wie ihrer Länge entspricht (zusammen N, je Kante mindestens einer)
    const cs = fit.corners.map((i) => sO[i]), lens = cs.map((u, i) => (i < 3 ? cs[i + 1] : P) - u);
    const raw = lens.map((l) => (N * l) / P), seg = raw.map((x) => Math.max(1, Math.floor(x)));
    let left = N - seg.reduce((x, y) => x + y, 0);
    for (const [, i] of raw.map((x, i) => [x - Math.floor(x), i]).sort((x, y) => y[0] - x[0])) { if (left <= 0) break; seg[i]++; left--; }
    if (left < 0) return null;
    cs.forEach((u, i) => { for (let k = 0; k < seg[i]; k++) slots.push(pos(u + (lens[i] * k) / seg[i])); });
  }
  let best = null;
  for (const dir of [1, -1]) for (let sh = 0; sh < N; sh++) {
    let cost = 0;
    for (let i = 0; i < N && (!best || cost < best.cost); i++) { const q = slots[(((sh + dir * i) % N) + N) % N]; cost += (q[0] - Q[i][0]) ** 2 + (q[1] - Q[i][1]) ** 2; }
    if (!best || cost < best.cost) best = { cost, dir, sh };
  }
  const out = Q.map((_, i) => slots[(((best.sh + best.dir * i) % N) + N) % N]);
  return { pts: out, width: 2 * alpha, taper: (beta * L) / Math.max(alpha, 1e-9), step: h, err: fit.err, L, caps, ends: [C[0], C[K - 1]] };
}

/**
 * Legt schmale Bänder einer Formation neu (siehe oben). Gibt neue Punkt-Objekte zurück; Eigenschaften am Array (meta …)
 * bleiben. Über ribbons (Array) erfährt ein Aufrufer, welche Konturen neu gelegt wurden (für Wächter und Prüfbilder).
 */
export function regularRibbons(pts, { ribbons = null, ...opt } = {}) {
  if (!pts?.length || pts.length < 10) return pts;
  const out = pts.map((p) => ({ ...p }));
  for (const chain of contourChains(pts)) {
    if (chain.length < 10) continue;
    const Q = chain.map((i) => [pts[i].x, pts[i].y]);
    // nur geschlossene, lückenlose Konturen: kein Schritt (auch nicht vom letzten zum ersten Punkt) über 2,5 Punktabstände
    const st = Q.map((p, t) => { const q = Q[(t + 1) % Q.length]; return hyp(p[0], p[1], q[0], q[1]); }), h = median(st);
    if (!(h > 0) || Math.max(...st) > 2.5 * h) continue;
    // ein Stück einer längeren Kontur (U-Form, deren offene Enden nah beieinander liegen) ist kein Strich: an jeder
    // größeren Lücke im Zug darf kein fremder Punkt liegen, sonst läuft die Kontur dort weiter
    const inChain = new Set(chain);
    const open = st.some((d, t) => {
      if (d <= 1.4 * h) return false;
      const A = Q[t], B = Q[(t + 1) % Q.length], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
      return pts.some((p, j) => !inChain.has(j) && hyp(p.x, p.y, mx, my) < Math.max(1.5 * h, 0.75 * d));
    });
    if (open) continue;
    const r = fitRibbon(Q, opt);
    if (!r) continue;
    // ein Strich steht frei: vor keinem seiner Enden liegt ein fremder Punkt näher als 2 Punktabstände (sonst ist er
    // die Spitze einer längeren Form, etwa der Schwanz der Puma-Katze, und eine Kappe würde ihn vom Rest abschneiden)
    const near = r.ends.map(([ex, ey]) => Math.min(...pts.map((p, j) => (inChain.has(j) ? Infinity : hyp(p.x, p.y, ex, ey)))) / r.step);
    if (globalThis.__ribbonEnds) globalThis.__ribbonEnds.push(near);
    if (Math.min(...near) < FREE_END) continue;
    chain.forEach((i, k) => { out[i].x = r.pts[k][0]; out[i].y = r.pts[k][1]; });
    ribbons?.push({ chain, ...r });
  }
  for (const key of Object.keys(pts)) if (!/^\d+$/.test(key)) out[key] = pts[key];
  return out;
}

/** Die Nachbearbeitung jeder Logo-Formation: erst schmale Bänder neu legen, dann quer zur Linie glätten. */
export function cleanRows(pts, opt) { return smoothRows(regularRibbons(pts, opt)); }
