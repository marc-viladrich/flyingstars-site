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
export function sampleShape({ w, h, rgba, label, area }, n) {
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
