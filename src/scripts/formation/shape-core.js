// Reine Rechnung ohne DOM: Raster → Farbflächen → Drohnenpunkte. Läuft im Web Worker
// (shape-worker.js), damit das Umrechnen eines Logos die Seite nicht blockiert, und als Rückfall im Hauptthread.

/**
 * Zerlegt ein Raster in Vordergrund und Farbflächen. Hintergrund: Transparenz, sonst die Randfarbe.
 * Liegt viel Leerraum um das Logo und canCrop ist gesetzt, kommt { crop: [x0, y0, x1, y1] } zurück:
 * Dann rastert der Aufrufer den Ausschnitt neu, sonst bekäme das Logo nur einen Bruchteil der Auflösung.
 * Ergebnis sonst: { w, h, rgba, label (Int16, -1 = Hintergrund), area[] je Fläche }
 */
export function analyze(rgba, w, h, M, { invert = false, canCrop = false } = {}) {
  const N = w * h, fg = new Uint8Array(N);

  // Vordergrund: Alpha, wenn das Bild Transparenz hat, sonst Abstand zur Randfarbe
  let transparent = 0, inner = 0;
  for (let y = M; y < h - M; y += 2) for (let x = M; x < w - M; x += 2) { inner++; if (rgba[(y * w + x) * 4 + 3] < 200) transparent++; }
  const useAlpha = transparent > inner * 0.04;
  let br = 0, bgc = 0, bb = 0, bn = 0;
  if (!useAlpha) {
    const edge = (x, y) => { const k = (y * w + x) * 4; br += rgba[k]; bgc += rgba[k + 1]; bb += rgba[k + 2]; bn++; };
    for (let x = M; x < w - M; x++) { edge(x, M); edge(x, h - M - 1); }
    for (let y = M; y < h - M; y++) { edge(M, y); edge(w - M - 1, y); }
    br /= bn; bgc /= bn; bb /= bn;
  }
  for (let i = 0, k = 0; i < N; i++, k += 4) {
    if (useAlpha) fg[i] = rgba[k + 3] > 110 ? 1 : 0;
    else if (rgba[k + 3] > 110) fg[i] = Math.hypot(rgba[k] - br, rgba[k + 1] - bgc, rgba[k + 2] - bb) > 60 ? 1 : 0;
  }
  // Viel Leerraum um das Logo (typisch bei PNG-Downloads): auf den Inhalt zuschneiden und neu rastern,
  // sonst bekommt das Logo nur einen Bruchteil der Auflösung und die Drohnen gehen die Kandidaten aus.
  if (canCrop) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (fg[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 > x0 && (x1 - x0 < (w - 2 * M) * 0.85 || y1 - y0 < (h - 2 * M) * 0.85)) return { crop: [x0, y0, x1, y1] };
  }
  if (!useAlpha) {
    // Hintergrund ist nur, was mit dem Rand verbunden ist. Große eingeschlossene Flächen in Hintergrundfarbe
    // (die weißen BMW-Viertel) gehören zur Form, kleine (Punzen in o, a, e) bleiben Löcher.
    const seen = new Uint8Array(N), stack = [];
    for (let i = 0; i < N; i++) {
      if (fg[i] || seen[i]) continue;
      const comp = []; let border = false; stack.push(i); seen[i] = 1;
      while (stack.length) { const j = stack.pop(); comp.push(j); const x = j % w, y = (j / w) | 0;
        if (x <= M || y <= M || x >= w - M - 1 || y >= h - M - 1) border = true;
        for (const k of [j - 1, j + 1, j - w, j + w]) if (k >= 0 && k < N && !fg[k] && !seen[k]) { seen[k] = 1; stack.push(k); } }
      if (!border && comp.length > N * 0.02) for (const j of comp) fg[j] = 1;
    }
  }
  if (invert) for (let i = 0; i < N; i++) fg[i] ^= 1;
  // der Rand gehört immer zum Hintergrund, auch nach dem Umkehren
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < M || y < M || x >= w - M || y >= h - M) fg[y * w + x] = 0;

  // Farbflächen: grobe Histogramm-Clusterung der Vordergrundfarben
  const bins = new Map();
  for (let i = 0, k = 0; i < N; i++, k += 4) if (fg[i]) { const key = (rgba[k] >> 5) << 6 | (rgba[k + 1] >> 5) << 3 | rgba[k + 2] >> 5; const b = bins.get(key) || [0, 0, 0, 0]; b[0] += rgba[k]; b[1] += rgba[k + 1]; b[2] += rgba[k + 2]; b[3]++; bins.set(key, b); }
  const total = [...bins.values()].reduce((a, b) => a + b[3], 0) || 1;
  const centers = [];
  for (const b of [...bins.values()].sort((a, b) => b[3] - a[3])) {
    if (b[3] < total * 0.01) break;
    const c3 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
    if (!centers.some(o => Math.hypot(o[0] - c3[0], o[1] - c3[1], o[2] - c3[2]) < 70)) centers.push(c3);
    if (centers.length >= 6) break;
  }
  if (!centers.length) centers.push([255, 255, 255]);
  const label = new Int16Array(N).fill(-1), area = new Array(centers.length).fill(0);
  for (let i = 0, k = 0; i < N; i++, k += 4) {
    if (!fg[i]) continue;
    let best = 0, bd = 1e9;
    for (let j = 0; j < centers.length; j++) { const o = centers[j]; const d = (rgba[k] - o[0]) ** 2 + (rgba[k + 1] - o[1]) ** 2 + (rgba[k + 2] - o[2]) ** 2; if (d < bd) { bd = d; best = j; } }
    label[i] = best; area[best]++;
  }
  // Grundplatte (Schild, Kachel, Badge): größte Fläche, die das ganze Logo umspannt und etwas anderes trägt.
  // Am Himmel zählt der Inhalt, nicht die Platte, also wird sie zum Hintergrund.
  const fgTotal = area.reduce((a, b) => a + b, 0), big = area.indexOf(Math.max(...area));
  if (centers.length > 1 && area[big] > fgTotal * 0.45 && fgTotal - area[big] > fgTotal * 0.06) {
    let ax = w, ay = h, bx = 0, by = 0, px0 = w, py0 = h, px1 = 0, py1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const L = label[y * w + x]; if (L < 0) continue; ax = Math.min(ax, x); ay = Math.min(ay, y); bx = Math.max(bx, x); by = Math.max(by, y); if (L === big) { px0 = Math.min(px0, x); py0 = Math.min(py0, y); px1 = Math.max(px1, x); py1 = Math.max(py1, y); } }
    const solid = area[big] > (px1 - px0 + 1) * (py1 - py0 + 1) * 0.5; // Ringe und Rahmen sind keine Platte
    if (solid && px1 - px0 >= (bx - ax) * 0.9 && py1 - py0 >= (by - ay) * 0.9) {
      for (let i = 0; i < N; i++) if (label[i] === big) label[i] = -1;
      area[big] = 0;
    }
  }
  return { w, h, rgba, label, area };
}



// Chamfer-Distanz zur nächsten Saatzelle, in Pixeln
function distance(seed, w, h) {
  const D = new Float32Array(w * h), B = 1.4142;
  for (let i = 0; i < D.length; i++) D[i] = seed[i] ? 0 : 1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = D[i];
    if (x > 0) v = Math.min(v, D[i - 1] + 1);
    if (y > 0) { v = Math.min(v, D[i - w] + 1); if (x > 0) v = Math.min(v, D[i - w - 1] + B); if (x < w - 1) v = Math.min(v, D[i - w + 1] + B); }
    D[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = D[i];
    if (x < w - 1) v = Math.min(v, D[i + 1] + 1);
    if (y < h - 1) { v = Math.min(v, D[i + w] + 1); if (x < w - 1) v = Math.min(v, D[i + w + 1] + B); if (x > 0) v = Math.min(v, D[i + w - 1] + B); }
    D[i] = v;
  }
  return D;
}

// Farthest-Point-Sampling auf einer Kandidatenliste [x0,y0,x1,y1,...]; bereits gewählte Punkte zählen mit
function farthest(cand, k, chosen, kind, minDist = 1) {
  const m = cand.length / 2; if (!m || k <= 0) return;
  const d = new Float32Array(m).fill(1e12);
  for (const p of chosen) for (let j = 0; j < m; j++) { const dx = cand[2 * j] - p[0], dy = cand[2 * j + 1] - p[1]; const q = dx * dx + dy * dy; if (q < d[j]) d[j] = q; }
  let next = 0, best = -1;
  if (chosen.length) for (let j = 0; j < m; j++) if (d[j] > best) { best = d[j]; next = j; }
  for (let c = 0; c < Math.min(k, m); c++) {
    if (chosen.length && d[next] < minDist * minDist) break; // Kandidaten erschöpft oder Mindestabstand erreicht
    const cx = cand[2 * next], cy = cand[2 * next + 1];
    chosen.push([cx, cy, kind]);
    best = -1;
    for (let j = 0; j < m; j++) { const dx = cand[2 * j] - cx, dy = cand[2 * j + 1] - cy; const q = dx * dx + dy * dy; if (q < d[j]) d[j] = q; if (d[j] > best) { best = d[j]; next = j; } }
  }
}

// Dunkle Logofarben würden am Nachthimmel verschwinden: Helligkeit anheben, Farbton behalten
export function liftColor([r, g, b], min = 0.62) {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, L = (mx + mn) / 2;
  if (L >= min) return [r, g, b];
  if (mx - mn < 0.1) return [236, 232, 224]; // Grau und Schwarz werden zu warmem Weiß
  const k = (min - L) / (1 - L);
  return [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k].map(Math.round);
}

/**
 * Verteilt n Drohnen auf eine gerasterte Form.
 * Linien zuerst: kräftige Flächen bekommen eine Kontur, dünne Striche (Schrift, Ringe) ihre
 * Mittellinie statt zweier Ränder, Grenzen zwischen Farbflächen eine Linie auf der kleineren Seite.
 * Der Rest füllt große Flächen locker und etwas gedimmt. Der Abstand entlang der Linien und in der
 * Fläche wird gemeinsam aus der Drohnenzahl bestimmt, damit nichts an den Rändern klumpt.
 */
export function sampleShapeLegacy({ w, h, rgba, label, area }, n) {
  const N = w * h;
  const big = i => label[i] < 0 ? Infinity : area[label[i]];
  // Grenzpixel: Nachbar hat eine andere Fläche; „ink“ ist nur die kleinere Seite (bzw. die Form gegen den Hintergrund)
  const seed = new Uint8Array(N), ink = new Uint8Array(N);
  let fgArea = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, L = label[i]; if (L < 0) continue;
    fgArea++;
    for (const j of [i - 1, i + 1, i - w, i + w]) if (label[j] !== L) { seed[i] = 1; if (big(i) < big(j) || (big(i) === big(j) && L < label[j])) ink[i] = 1; }
  }
  if (!fgArea) return [];
  const dIn = distance(seed, w, h); // Abstand zur nächsten Flächengrenze

  // Abstand entlang der Linien: so eng wie die Drohnenzahl erlaubt, aber nie enger als smin.
  // Was die Linien nicht brauchen, füllt die Flächen (gedimmt). So bleiben Konturen lesbar wie in echten Shows.
  const smin = Math.max(w, h) / 90;
  let s = smin, lines = [], fill = [];
  for (let pass = 0; pass < 3; pass++) {
    const r = Math.max(1.2, s * 0.8); // Striche schmaler als ~1,6 Drohnenabstände werden zur Mittellinie
    // dicke Bereiche: was eine Erosion um r übersteht, wieder um r ausgedehnt
    const core = new Uint8Array(N); for (let i = 0; i < N; i++) if (label[i] >= 0 && dIn[i] > r) core[i] = 1;
    const dCore = distance(core, w, h);
    lines = []; fill = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; if (label[i] < 0) continue;
      if (dCore[i] <= r + 1.5) { // +1,5 px Toleranz, sonst fallen Striche knapp über der Grenze ganz durch
        if (ink[i]) lines.push(x, y);                                       // Kontur
        else if (dIn[i] > s * 1.1 && (x + y) % 2 === 0) fill.push(x, y);    // Innenfläche (jedes zweite Pixel)
      } else {
        // dünner Strich: Mittellinie = lokales Maximum des Randabstands
        // (in mindestens einer Richtung Maximum, damit auch schräge und runde Striche durchgehend bleiben)
        const v = dIn[i], ridge = (a, b) => v >= a && v >= b && (v > a || v > b);
        if (ridge(dIn[i - 1], dIn[i + 1]) || ridge(dIn[i - w], dIn[i + w]) || ridge(dIn[i - w - 1], dIn[i + w + 1]) || ridge(dIn[i - w + 1], dIn[i + w - 1])) lines.push(x, y);
      }
    }
    s = Math.max(smin, lines.length / 2 * 0.85 / n);
  }
  const chosen = [];
  farthest(lines, Math.min(n, Math.round(lines.length / 2 * 0.85 / s)), chosen, 1);
  farthest(fill, n - chosen.length, chosen, 0, smin * 1.6); // Fläche locker, sonst verschwimmen die Konturen
  if (chosen.length < n) farthest(lines, n - chosen.length, chosen, 1);
  const sc = 2 / Math.max(w, h);
  return chosen.map(([x, y, kind]) => {
    const k = (y * w + x) * 4;
    return { x: (x - w / 2) * sc, y: (y - h / 2) * sc, c: [rgba[k], rgba[k + 1], rgba[k + 2]], wt: kind ? 1 : 0.6 };
  });
}

/* ---------- Runde 26: Strichgraph statt Flächenabtastung (Marc, 08.11.2026) ----------
 * Ziel: Logos mit 100–150 Drohnen scharf. Die Recherche (akomo-Hub, flyingstars/21-logo-algorithmus) zeigte: Am besten
 * liest sich ein Logo, wenn jede Linie genau eine Drohnenreihe bekommt (Mittellinie statt zweier Ränder) und Enden,
 * Kreuzungen und Ecken zuerst besetzt werden. Dazwischen stehen die Drohnen gleichmäßig nach Bogenlänge, nie enger als
 * der Mindestabstand (2 m bei 70 m Bildbreite = 1/35 der Breite). Kräftige Flächen bekommen eine eingerückte Kontur,
 * aber nur, wenn die Drohnenzahl dafür reicht; sonst auch dort die Mittellinie.
 * Deterministisch: keine Zufallszahlen, feste Reihenfolgen.
 */

const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/** Zhang-Suen-Verdünnung: Maske (Uint8Array, 1 = Form) → ein Pixel breite Mittellinie. */
function thin(mask, w, h) {
  const m = mask.slice(), del = [];
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]);
  for (let changed = true, iter = 0; changed && iter < 200; iter++) {
    changed = false;
    for (const pass of [0, 1]) {
      del.length = 0;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        if (!m[y * w + x]) continue;
        const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
        const B = p.reduce((a, b) => a + b, 0); if (B < 2 || B > 6) continue;
        let A = 0; for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) A++;
        if (A !== 1) continue;
        if (pass === 0 ? (p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) : (p[0] * p[2] * p[6] || p[0] * p[4] * p[6])) continue;
        del.push(y * w + x);
      }
      if (del.length) { changed = true; for (const i of del) m[i] = 0; }
    }
  }
  return m;
}

/** Übergänge 0→1 rund um ein Pixel: 1 = Ende, 2 = Linie, ≥ 3 = Kreuzung (robuster als die reine Nachbarzahl). */
function crossings(sk, w, x, y) {
  let c = 0;
  for (let k = 0; k < 8; k++) { const [ax, ay] = N8[k], [bx, by] = N8[(k + 1) % 8]; if (!sk[(y + ay) * w + x + ax] && sk[(y + by) * w + x + bx]) c++; }
  return c;
}

/** Zerlegt die Mittellinie in Wege zwischen Knoten (Enden, Kreuzungen) und geschlossene Schleifen. */
function trace(sk, w, h) {
  const node = new Uint8Array(w * h), used = new Uint8Array(w * h), paths = [], nodes = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (!sk[i]) continue;
    const c = crossings(sk, w, x, y); if (c !== 2) { node[i] = c === 1 ? 1 : 2; nodes.push([x, y, node[i]]); }
  }
  const nbrs = (x, y) => { const out = []; for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]]) { const j = (y + dy) * w + x + dx; if (sk[j]) out.push([x + dx, y + dy]); } return out; };
  const walk = (sx, sy, nx, ny) => {
    const path = [[sx, sy]], start = sy * w + sx; let x = nx, y = ny;
    for (let guard = 0; guard < w * h; guard++) {
      path.push([x, y]); const i = y * w + x;
      if (node[i]) break;
      used[i] = 1;
      const nb = nbrs(x, y);
      // ein angrenzender Knoten beendet den Weg (nicht der Startknoten direkt nach dem Start); sonst weiter auf der Linie
      const toNode = nb.find(([qx, qy]) => { const j = qy * w + qx; return node[j] && (j !== start || path.length > 3); });
      const next = toNode ?? nb.find(([qx, qy]) => { const j = qy * w + qx; return !node[j] && !used[j]; });
      if (!next) break;
      [x, y] = next;
    }
    return path;
  };
  for (const [x, y] of nodes) for (const [nx, ny] of nbrs(x, y)) {
    const j = ny * w + nx; if (used[j]) continue;
    if (node[j]) { if (x < nx || (x === nx && y < ny)) paths.push([[x, y], [nx, ny]]); continue; }
    paths.push(walk(x, y, nx, ny));
  }
  // übrige Pixel liegen auf Schleifen ohne Knoten (o, Ring): oben links beginnen
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (!sk[i] || used[i] || node[i]) continue;
    used[i] = 1; const n0 = nbrs(x, y).find(([qx, qy]) => !used[qy * w + qx]);
    if (!n0) continue;
    const p = walk(x, y, n0[0], n0[1]); p.loop = true; paths.push(p);
  }
  return { paths, nodes };
}

const len = (p) => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };
/** Douglas–Peucker: Indizes der Ecken eines Weges (Anfang und Ende immer dabei). */
function corners(p, eps) {
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const rec = (a, b) => {
    const [ax, ay] = p[a], [bx, by] = p[b], L = Math.hypot(bx - ax, by - ay) || 1e-9; let best = -1, bd = eps;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - p[i][1]) - (ax - p[i][0]) * (by - ay)) / L; if (d > bd) { bd = d; best = i; } }
    if (best >= 0) { keep[best] = 1; rec(a, best); rec(best, b); }
  };
  if (p.length > 2) rec(0, p.length - 1);
  return [...keep.keys()].filter((i) => keep[i]);
}
/** Punkte im Abstand ≈ s entlang eines Teilwegs, ohne seine beiden Enden. */
function along(p, a, b, s) {
  const seg = p.slice(a, b + 1), L = len(seg), k = Math.max(1, Math.round(L / s)), out = [];
  if (k < 2) return out;
  let acc = 0, j = 1, target = L / k;
  for (let q = 1; q < k; q++) {
    const want = (q * L) / k;
    while (j < seg.length && acc + Math.hypot(seg[j][0] - seg[j - 1][0], seg[j][1] - seg[j - 1][1]) < want) { acc += Math.hypot(seg[j][0] - seg[j - 1][0], seg[j][1] - seg[j - 1][1]); j++; }
    if (j >= seg.length) break;
    const l = Math.hypot(seg[j][0] - seg[j - 1][0], seg[j][1] - seg[j - 1][1]) || 1, u = (want - acc) / l;
    out.push([seg[j - 1][0] + (seg[j][0] - seg[j - 1][0]) * u, seg[j - 1][1] + (seg[j][1] - seg[j - 1][1]) * u]);
  }
  void target;
  return out;
}
/** Kurze Äste (Sporne der Verdünnung an Ecken dicker Striche) entfernen: Wege mit freiem Ende kürzer als minLen. */
function pruneSpurs(sk, w, h, minLen) {
  for (let round = 0; round < 3; round++) {
    const { paths } = trace(sk, w, h); let removed = false;
    for (const p of paths) {
      if (p.loop || len(p) >= minLen) continue;
      const end = (q) => crossings(sk, w, q[0], q[1]) === 1, a = end(p[0]), b = end(p[p.length - 1]);
      if (a === b) continue; // freistehende kurze Linie oder Brücke zwischen zwei Kreuzungen bleibt
      for (const q of p.slice(a ? 0 : 1, b ? p.length : p.length - 1)) sk[q[1] * w + q[0]] = 0;
      removed = true;
    }
    if (!removed) break;
  }
  return sk;
}

/** Linienmaske: Striche, deren halbe Breite höchstens T Pixel misst, werden zur Mittellinie; dickere Bereiche zur
 * eingerückten Kontur (eine halbe Drohnenreihe innerhalb des Randes). */
function lineMask(fg, dIn, w, h, d, T) {
  const N = w * h, core = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (fg[i] && dIn[i] > T) core[i] = 1;
  const dCore = distance(core, w, h), thickRegion = new Uint8Array(N), thinPart = new Uint8Array(N), ring = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (fg[i]) { if (dCore[i] <= T + 1) thickRegion[i] = 1; else thinPart[i] = 1; }
  for (let i = 0; i < N; i++) if (thickRegion[i] && dIn[i] >= 0.5 * d - 0.5 && dIn[i] < 0.5 * d + 1.5) ring[i] = 1;
  const a = pruneSpurs(thin(thinPart, w, h), w, h, d * 0.9), b = thin(ring, w, h);
  for (let i = 0; i < N; i++) if (b[i]) a[i] = 1;
  return a;
}

/**
 * Verteilt höchstens n Drohnen auf eine gerasterte Form (Ergebnis von analyze). Weniger als n, wenn das Logo mit
 * Mindestabstand nicht mehr braucht; die übrigen Drohnen bleiben dunkel. Rückgabe wie bisher { x, y, c, wt }.
 * Zusätzlich an der Liste: .meta = { mode, spacing, simplified } (simplified: Linien mussten ausgedünnt werden).
 */
export function sampleShape({ w, h, rgba, label, area }, n, { spacing = 1 / 45 } = {}) {
  // Abstand: 2 m bei rund 90 m Bildbreite. FlyingStars' Textplaner skaliert ein Bild mit der Drohnenzahl (2 m Abstand, bis
  // 80 m Höhe); 1/35 (70 m) war zu streng und machte volle Formen lichter als nötig.
  const N = w * h, d = Math.max(w, h) * spacing;
  // jede größere Farbfläche für sich: das schwarze Pferd auf gelbem Grund ist eine eigene Form, kein Loch in der Fläche.
  // Kleine Farbgruppen (Kantenglättung, Zwischentöne) gehören zur benachbarten großen Fläche, sonst zerfällt ein weißes
  // Logo mit grauen Kantenpixeln in lauter dünne Ränder.
  const counts = new Map(); let fgN = 0;
  for (let i = 0; i < N; i++) if (label[i] >= 0) { counts.set(label[i], (counts.get(label[i]) || 0) + 1); fgN++; }
  const major = new Set([...counts].filter(([, c]) => c >= fgN * 0.08).map(([L]) => L));
  if (!major.size && counts.size) major.add([...counts].sort((a, b) => b[1] - a[1])[0][0]);
  const own = new Int16Array(N).fill(-1), queue = [];
  for (let i = 0; i < N; i++) if (major.has(label[i])) { own[i] = label[i]; queue.push(i); }
  for (let q = 0; q < queue.length; q++) { const i = queue[q], x = i % w; for (const j of [i - 1, i + 1, i - w, i + w]) { if (j < 0 || j >= N || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue; if (label[j] >= 0 && own[j] < 0) { own[j] = own[i]; queue.push(j); } } }
  const masks = [...major].map((L) => {
    const fg = new Uint8Array(N), seed = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (own[i] === L) fg[i] = 1;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (fg[i] && (!fg[i - 1] || !fg[i + 1] || !fg[i - w] || !fg[i + w])) seed[i] = 1; }
    return { fg, dIn: distance(seed, w, h) };
  });
  if (!masks.length) return [];
  const build = (T) => {
    const sk = new Uint8Array(N);
    for (const { fg, dIn } of masks) { const m = lineMask(fg, dIn, w, h, d, T); for (let i = 0; i < N; i++) if (m[i]) sk[i] = 1; }
    const { paths, nodes } = trace(sk, w, h);
    let total = 0; for (const p of paths) total += len(p);
    return { paths, nodes, total, T };
  };
  // Die reichste Darstellung, die in n Drohnen passt: zuerst auch kräftige Schrift als Kontur (T klein), dann immer mehr
  // Striche als Mittellinie. Volle Flächen (halbe Breite über 4 Drohnenabstände: Apfel, Schild) bleiben immer Kontur,
  // ihre Mittellinie wäre nur ein Gerüst. Passt auch das nicht, rücken die Drohnen weiter auseinander (unten).
  let g = null;
  for (const k of [1, 1.6, 2.5, 4]) { g = build(k * d); if (g.total / d <= n * 1.3) break; } // bis 30 % lichter für die reichere Form
  const mode = `T=${(g.T / d).toFixed(1)}d`;
  if (!g.total && !g.nodes.length) return [];
  // Anker: Kreuzungen, Enden, Ecken (Douglas–Peucker). Längste Wege zuerst, damit bei Knappheit Kleines wegfällt.
  const eps = Math.max(1.5, d * 0.45); // Ecken erst ab einer halben Drohnenreihe Abweichung, sonst wird jede Pixeltreppe zur Ecke
  const paths = g.paths.map((p) => ({ p, L: len(p), c: p.length > 2 ? corners(p, eps) : [0, p.length - 1] })).sort((a, b) => b.L - a.L);
  const tryWith = (s) => {
    // alle Punkte, auch Knoten und Ecken, mindestens r auseinander: bei knappem Budget werden auch die Anker lichter, statt
    // alles andere zu verdrängen (vorher fehlte bei Ferrari das Schild, bei der NFL alles außer den Sternen)
    const r = Math.max(d, 0.8 * s), grid = new Map(), out = [], cell = r;
    const free = (x, y) => { const gx = Math.floor(x / cell), gy = Math.floor(y / cell); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of grid.get(`${gx + i},${gy + j}`) || []) if ((q[0] - x) ** 2 + (q[1] - y) ** 2 < r * r) return false; return true; };
    const put = (x, y) => { if (!free(x, y)) return false; const k = `${Math.floor(x / cell)},${Math.floor(y / cell)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push([x, y]); out.push([x, y]); return true; };
    for (const [x, y, kind] of [...g.nodes].sort((a, b) => b[2] - a[2] || a[1] - b[1] || a[0] - b[0])) if (kind === 2) put(x, y); // Kreuzungen
    for (const [x, y, kind] of g.nodes) if (kind === 1) put(x, y); // Enden
    for (const { p, c } of paths) for (const i of c) put(p[i][0], p[i][1]); // Ecken
    for (const { p, c } of paths) {
      const idx = p.loop && c.length < 3 ? [0, Math.floor(p.length / 3), Math.floor((2 * p.length) / 3), p.length - 1] : c;
      for (let k = 1; k < idx.length; k++) for (const [x, y] of along(p, idx[k - 1], idx[k], s)) put(x, y);
    }
    return out;
  };
  // Abstand s so wählen, dass möglichst viele, aber höchstens n Drohnen gesetzt werden (Bisektion; die Zahl fällt mit s)
  let s = d, pts = tryWith(s), simplified = false;
  if (pts.length > n) {
    let lo = d, hi = d * 2;
    while (tryWith(hi).length > n && hi < Math.max(w, h)) hi *= 2;
    for (let it = 0; it < 14; it++) { const mid = (lo + hi) / 2; if (tryWith(mid).length > n) lo = mid; else hi = mid; }
    s = hi; pts = tryWith(s);
  }
  if (pts.length > n) { pts = pts.slice(0, n); simplified = true; }
  if (s > d * 2.4) simplified = true; // Linien mehr als doppelt so licht wie der Mindestabstand: für n Drohnen sehr fein (VW, GitHub bei 100 lesen sich noch; Ferrari, NFL nicht)
  const sc = 2 / Math.max(w, h);
  const result = pts.map(([x, y]) => {
    const xi = Math.min(w - 1, Math.max(0, Math.round(x))), yi = Math.min(h - 1, Math.max(0, Math.round(y))), k = (yi * w + xi) * 4;
    return { x: (x - w / 2) * sc, y: (y - h / 2) * sc, c: [rgba[k], rgba[k + 1], rgba[k + 2]], wt: 1 };
  });
  result.meta = { mode, spacing: s / Math.max(w, h), simplified };
  return result;
}
