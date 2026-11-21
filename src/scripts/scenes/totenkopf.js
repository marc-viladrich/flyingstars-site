// Der Totenkopf mit Zylinder aus der Musical-Show Bokkenrijders 2026 (Runde 17, Marc 21.11.2026: „krass 2D und schlecht
// … muss genau die räumliche Tiefe der echten Bokkenrijders-3D-Maske haben und dem Motiv aus der echten Show
// entsprechen“). Vorbild: das Foto der Fallstudie (01.jpg „Totenkopf mit Zylinder“) und Aufnahmen der Show vom Juni 2026
// aus dem Publikum und aus der Luft (Auswertung in docs/show-konfigurator.md, Runde 17). Gebaut wie die echte Maske
// (public/media/projekte/bokkenrijders/formation.json): Drohnen gleichmäßig verteilt auf der Oberfläche eines Körpers,
// keine Linienzeichnung. Die Maske hat fast überall denselben Punktabstand und eine Tiefe von gut der halben Breite; der
// Totenkopf bekommt dieselbe Punktsprache.
//   - Schädel: Schale über Stirn, Schläfen, Wangenknochen und Oberkiefer (Querschnitte als Superellipsen, vorn flacher),
//     vorn und seitlich bis hinter die Ohren. Augenhöhlen und Nasenloch sind Löcher mit einem Rand aus Drohnen; tief in
//     jeder Augenhöhle steht ein Licht (wie in der Show).
//   - Oberkiefer mit zwei Zahnreihen auf dem Zahnbogen (vorn weiter zum Publikum als seitlich), Unterkiefer weit offen:
//     Kieferäste von den Gelenken unter den Wangenknochen hinab zum Kinn, untere Zahnreihe.
//   - Zylinder: Kopf als senkrechte Säulen aus Drohnen (wie in der Show), oben leicht ausgestellt; die Krempe als zwei
//     Ringe, an den Seiten hochgebogen. Er sitzt tief, über den Augenhöhlen bleibt ein schmaler Streifen Stirn.
//   - Bluttränen: zwei Streifen von den Augenhöhlen über die Wangen bis zum Kiefer (leuchten erst, wenn er weint).
//   - Schädeldecke unter dem Hut: dunkel, solange der Hut sitzt; zu sehen, wenn er ihn lüftet.
// Die freien Flächen (Schädel, Kiefer, Schädeldecke) füllt eine Farthest-Point-Auswahl aus einem dichten Raster, die
// Strukturen (Säulen, Ringe, Zahnreihen, Ränder, Tränen) stehen fest; so liegt jede Drohne etwa gleich weit von ihren
// Nachbarn. Die Koordinaten sind die des aufrechten Kopfes; das Publikum sieht ihn von unten (VIEW in bokkenrijders.js).
// Deterministisch, ein Ergebnis je Drohnenzahl (Zwischenspeicher). Wächter: scripts/totenkopf.test.mjs.

/** Teile, die mit dem Hut gehen. */
export const HAT_PARTS = new Set(['zylinder', 'krempe']);

// ---------- Maße (Einheiten wie die Maske, y oben, z zum Publikum) ----------
const BRIM_Y = 0.25; // Krempe am Kopfansatz
const HAT = { cz: -0.05, rx: 0.43, rz: 0.37, top: 1.03, flare: 0.07, brimX: 0.71, brimZ: 0.58, curl: 0.2, dip: 0.02, arc: 1.66 };
const TOP_Y = 0.62; // Scheitel der Schädeldecke (unter dem Hut)
/** So weit hebt er den Hut beim Lüften; so hoch reicht die Schädeldecke, die dann zu sehen ist. */
export const LIFT = 0.22;
// Zahnbogen: vorn weiter zum Publikum als seitlich, die Seiten höher (von unten gesehen ein Grinsen, wie in der Show)
const TEETH = { gum: -0.52, tip: -0.605, ax: 0.235, bz: 0.17, front: 0.405, arc: 1.25, smile: 0.17 };
const EYES = { x: 0.214, y: -0.075, rx: 0.16, ry: 0.17, tilt: 0.1, rim: 1.08 };
/** Höhe der Zahnreihen über ihrer Mitte an der Stelle a des Zahnbogens (Grinsen). */
const gumLift = (a) => TEETH.smile * (1 - Math.cos(a)) / (1 - Math.cos(TEETH.arc));

/** Stückweise Tabelle [[y, Wert], …] nach fallendem y, dazwischen weich (smoothstep). */
const table = (rows) => (y) => {
  if (y >= rows[0][0]) return rows[0][1];
  for (let i = 1; i < rows.length; i++) {
    const [y1, v1] = rows[i];
    if (y >= y1) { const [y0, v0] = rows[i - 1], u = (y0 - y) / (y0 - y1), s = u * u * (3 - 2 * u); return v0 + (v1 - v0) * s; }
  }
  return rows[rows.length - 1][1];
};
// Kopf in Querschnitten: halbe Breite, vorderster und hinterster Punkt, Exponent (2 = Ellipse, mehr = kantiger), Winkel
// der Schale um die senkrechte Achse (± von vorn)
const WIDTH = table([[TOP_Y, 0.1], [0.56, 0.27], [0.46, 0.36], [0.34, 0.405], [0.2, 0.425], [0.04, 0.432], [-0.1, 0.425], [-0.22, 0.412], [-0.31, 0.372], [-0.4, 0.31], [-0.48, 0.278], [-0.56, 0.258]]);
const FRONT = table([[TOP_Y, 0.0], [0.56, 0.12], [0.46, 0.2], [0.34, 0.27], [0.2, 0.325], [0.04, 0.355], [-0.1, 0.33], [-0.22, 0.36], [-0.36, 0.385], [-0.5, 0.405], [-0.56, 0.405]]);
const BACK = table([[TOP_Y, -0.14], [0.46, -0.42], [0.3, -0.5], [0.04, -0.52], [-0.22, -0.44], [-0.4, -0.26], [-0.56, -0.12]]);
const EXP = table([[0.34, 2.25], [-0.2, 2.5], [-0.56, 2.9]]);
const SPAN = table([[0.34, 1.95], [-0.24, 1.95], [-0.42, 1.4], [-0.56, 1.3]]);

/** Punkt der Kopfschale in Höhe y unter dem Winkel φ (0 = zum Publikum, + = rechts). */
function head(y, phi) {
  const w = WIDTH(y), zf = FRONT(y), zb = BACK(y), e = 2 / EXP(y), s = Math.sin(phi), c = Math.cos(phi);
  return [w * Math.sign(s) * Math.abs(s) ** e, y, (zf + zb) / 2 + ((zf - zb) / 2) * Math.sign(c) * Math.abs(c) ** e];
}
/** Vorderfläche des Kopfes über (x, y): z dort, wo eine Drohne auf ihr steht. */
function frontZ(x, y) {
  const w = WIDTH(y), p = EXP(y), u = Math.min(0.999, Math.abs(x) / w), s = u ** (p / 2), c = Math.sqrt(1 - s * s);
  return (FRONT(y) + BACK(y)) / 2 + ((FRONT(y) - BACK(y)) / 2) * c ** (2 / p);
}
const onFace = (x, y, dz = 0) => [x, y, frontZ(x, y) + dz];

// ---------- Löcher: Augenhöhlen und Nasenloch (in der Ansicht von vorn) ----------
const eyeUV = (x, y, side) => { const dx = x - side * EYES.x, dy = y - EYES.y, a = side * EYES.tilt, c = Math.cos(a), s = Math.sin(a); return [(dx * c + dy * s) / EYES.rx, (-dx * s + dy * c) / EYES.ry]; };
const inEye = (x, y, grow = 1) => [-1, 1].some((side) => { const [u, v] = eyeUV(x, y, side); return u * u + v * v < grow * grow; });
// Nasenloch als umgedrehtes Herz: oben spitz, unten breit mit einer kleinen Spitze in der Mitte
const NOSE = [[0, -0.205], [0.05, -0.285], [0.08, -0.36], [0.072, -0.415], [0.03, -0.42], [0, -0.395], [-0.03, -0.42], [-0.072, -0.415], [-0.08, -0.36], [-0.05, -0.285]];
function inPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const NOSE_HOLE = NOSE.map(([x, y]) => [x * 1.18, -0.31 + (y + 0.31) * 1.18]);
const inHole = (x, y) => inEye(x, y, EYES.rim) || inPoly(NOSE_HOLE, x, y);

// ---------- Unterkiefer (weit offen) ----------
// Mittellinie vom linken Gelenk über den Kieferwinkel zum Kinn (rechts gespiegelt)
const JAW = [[-0.372, -0.34, -0.1], [-0.342, -0.55, -0.06], [-0.295, -0.76, 0.0], [-0.215, -0.93, 0.09], [-0.11, -1.02, 0.19], [0, -1.05, 0.24]];
const catmull = (P, s) => {
  const m = P.length - 1, f = Math.min(m - 1e-9, Math.max(0, s * m)), i = Math.floor(f), u = f - i;
  const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(m, i + 2)];
  return [0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** Kieferband: s ∈ [0, 1] linkes Gelenk → Kinn → rechtes Gelenk, v ∈ [−1, 1] quer zur Mittellinie. */
function jaw(s, v) {
  const t = s < 0.5 ? s * 2 : (1 - s) * 2;
  const c = catmull(JAW, t), d = norm(sub(catmull(JAW, Math.min(1, t + 0.01)), catmull(JAW, Math.max(0, t - 0.01))));
  // nach außen: an den Ästen zur Seite (etwas nach vorn), am Kinn nach unten-vorn
  const out = norm([-(1 - t), -0.55 * t * t, 0.25 + 0.6 * t * t]), across = norm(cross(d, out)), h = 0.066 + 0.018 * t;
  const q = [c[0] + across[0] * v * h, c[1] + across[1] * v * h, c[2] + across[2] * v * h];
  return [s < 0.5 ? q[0] : -q[0], q[1], q[2]];
}

// ---------- Hut ----------
const crownR = (y) => 1 + HAT.flare * ((y - BRIM_Y) / (HAT.top - BRIM_Y)) ** 2;
const crown = (y, phi) => { const f = crownR(y); return [HAT.rx * f * Math.sin(phi), y, HAT.cz + HAT.rz * f * Math.cos(phi)]; };
/** Krempe: r ∈ [0, 1] vom Kopf bis zum Rand; an den Seiten hochgebogen, vorn und hinten leicht gesenkt. */
const brim = (r, phi) => {
  const s = Math.sin(phi), c = Math.cos(phi);
  return [(HAT.rx + r * (HAT.brimX - HAT.rx)) * s, BRIM_Y + HAT.curl * r * r * s * s - HAT.dip * r * c * c, HAT.cz + (HAT.rz + r * (HAT.brimZ - HAT.rz)) * c];
};

// ---------- Bluttränen ----------
/** Bahn der Bluttränen (rechte Seite, Ansicht von vorn): vom äußeren unteren Rand der Augenhöhle über die Wange und den
 * Kieferast bis fast zum Kinn. */
const TEAR = [[0.302, -0.32], [0.318, -0.4], [0.318, -0.48], [0.312, -0.57], [0.298, -0.67], [0.275, -0.78]];

// ---------- Abtasten ----------
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
/** Punkte entlang einer Kurve f(u), u ∈ [0, 1], im Abstand step (gleiche Bogenlänge), offen oder geschlossen. */
function along(f, step, closed = false, fine = 400) {
  const P = Array.from({ length: fine + 1 }, (_, i) => f(i / fine)), L = [0];
  for (let i = 1; i <= fine; i++) L.push(L[i - 1] + Math.sqrt(dist2(P[i], P[i - 1])));
  const total = L[fine], m = Math.max(1, Math.round(total / step)), out = [];
  for (let k = 0; k < (closed ? m : m + 1); k++) {
    const target = (k / m) * total;
    let i = 1; while (i < fine && L[i] < target) i++;
    const u = (target - L[i - 1]) / (L[i] - L[i - 1] || 1);
    out.push(P[i - 1].map((v, q) => v + (P[i][q] - v) * u));
  }
  return out;
}
/**
 * Farthest-Point-Auswahl: aus den Kandidaten genau m, jeweils der, der von allem Gewählten (auch den festen Punkten)
 * am weitesten weg liegt. Ergibt gleichmäßige Abstände; die Ränder der Flächen bekommen dabei früh ihre Drohnen.
 */
function farthest(cands, fixed, m) {
  const n = cands.length, X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n), d = new Float64Array(n).fill(Infinity), out = [];
  cands.forEach((c, i) => { X[i] = c[0]; Y[i] = c[1]; Z[i] = c[2]; });
  const update = (q) => { for (let i = 0; i < n; i++) { const e = (X[i] - q[0]) ** 2 + (Y[i] - q[1]) ** 2 + (Z[i] - q[2]) ** 2; if (e < d[i]) d[i] = e; } };
  for (const q of fixed) update(q);
  for (let k = 0; k < m && k < n; k++) {
    let best = 0, bd = -1;
    for (let i = 0; i < n; i++) if (d[i] > bd) { bd = d[i]; best = i; }
    out.push(cands[best]); update(cands[best]); d[best] = -1;
  }
  return out;
}
/** z der dichtesten Stelle einer Kandidatenmenge über (x, y) (für die Tränen auf dem Kieferast). */
const zNear = (cands, x, y) => { let best = Infinity, z = 0; for (const c of cands) { const e = (c[0] - x) ** 2 + (c[1] - y) ** 2 - 0.02 * c[2]; if (e < best) { best = e; z = c[2]; } } return z; };

// ---------- Aufbau ----------
const arch = (y, z0, ax, bz, arc) => (u) => { const a = -arc + 2 * arc * u; return [ax * Math.sin(a), y + gumLift(a), z0 - bz + bz * Math.cos(a)]; };
const eyeRim = (side) => (u) => { const a = u * 2 * Math.PI, c = Math.cos(side * EYES.tilt), s = Math.sin(side * EYES.tilt), ex = Math.cos(a) * EYES.rx * EYES.rim, ey = Math.sin(a) * EYES.ry * EYES.rim; return onFace(side * EYES.x + ex * c - ey * s, EYES.y + ex * s + ey * c, 0.01); };
const noseRim = (u) => { const P = NOSE_HOLE, f = u * P.length, i = Math.floor(f) % P.length, v = f - Math.floor(f), a = P[i], b = P[(i + 1) % P.length]; return onFace(a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, 0.01); };
const tearLine = (side, dx) => (u) => { const f = u * (TEAR.length - 1), i = Math.min(TEAR.length - 2, Math.floor(f)), v = f - i; return [side * (TEAR[i][0] + (TEAR[i + 1][0] - TEAR[i][0]) * v + dx), TEAR[i][1] + (TEAR[i + 1][1] - TEAR[i][1]) * v, 0]; };
/** Feste Linien: [Teil, Kurve, Abstand in D, geschlossen]. Die Zahnspitzen stehen etwas dichter (lesen sich als Zähne). */
const LINES = [
  // Krempe: Außenrand ringsum, ein zweiter Ring halb hinaus (hinten verdeckt der Hutkopf ihn)
  ['krempe', (u) => brim(1, u * 2 * Math.PI), 1.02, true],
  ['krempe', (u) => brim(0.5, -2.0 + 4.0 * u), 1.05, false],
  // Zahnreihen oben auf dem Zahnbogen, untere Zahnreihe auf dem Kinnbogen
  ['zaehne', arch(TEETH.gum, TEETH.front, TEETH.ax, TEETH.bz, TEETH.arc), 0.95, false],
  ['zaehne', arch(TEETH.tip, TEETH.front + 0.005, TEETH.ax * 0.97, TEETH.bz, TEETH.arc * 0.88), 0.85, false],
  ['zaehneUnten', (u) => { const a = -1.12 + 2.24 * u; return [0.19 * Math.sin(a), -0.935 + 0.12 * (1 - Math.cos(a)), 0.26 - 0.15 * (1 - Math.cos(a))]; }, 0.88, false],
  // Ränder der Augenhöhlen und des Nasenlochs auf der Vorderfläche
  ['rand', eyeRim(-1), 0.95, true], ['rand', eyeRim(1), 0.95, true], ['rand', noseRim, 0.95, true],
  // Tränen: zwei Reihen nebeneinander je Seite (z kommt erst beim Setzen dazu: oben die Wange, unten der Kieferast)
  ...[-1, 1].flatMap((side) => [-0.032, 0.032].map((dx) => ['traene', tearLine(side, dx), 0.86, false])),
];
const lengthOf = (f, fine = 400) => { let L = 0, a = f(0); for (let i = 1; i <= fine; i++) { const b = f(i / fine); L += Math.sqrt(dist2(a, b)); a = b; } return L; };
const CAP_SHARE = 0.055; // Anteil der Drohnen in der Schädeldecke
/** Einmal je Sitzung: Kandidaten der freien Flächen in feinem Raster, ihre Flächen, die Längen der festen Linien. */
let SURF = null;
function surfaces() {
  if (SURF) return SURF;
  const step = 0.019, shell = [], cap = [], band = [];
  let aShell = 0, aCap = 0, aJaw = 0;
  // Schädeldecke nur so hoch, dass sie unter dem gelüfteten Hut ganz zu sehen ist
  for (let y = BRIM_Y + LIFT - 0.045; y >= -0.56; y -= step) {
    const span = SPAN(y), w = WIDTH(y), m = Math.ceil((span * (w + (FRONT(y) - BACK(y)) / 2)) / step);
    for (let i = 0; i <= m; i++) {
      const phi = -span + (2 * span * i) / m, p = head(y, phi), q = head(y - step, phi), r = head(y, phi + (2 * span) / m);
      if (Math.abs(phi) < 1.3 && inHole(p[0], p[1])) continue;
      if (Math.abs(p[0]) < TEETH.ax && p[1] < TEETH.gum + gumLift(Math.asin(p[0] / TEETH.ax)) + 0.02) continue; // im Mund
      const area = Math.sqrt(dist2(p, q)) * Math.sqrt(dist2(p, r));
      if (y > BRIM_Y - 0.015) { if (Math.abs(phi) < 1.7) { cap.push(p); aCap += area; } } else { shell.push(p); aShell += area; }
    }
  }
  const ds = step / 1.6, dv = step / 0.075;
  for (let s = 0; s <= 1.0001; s += ds) for (let v = -1; v <= 1.001; v += dv) {
    const p = jaw(s, v);
    if (p[1] < -0.4 || Math.abs(p[0]) > 0.33) { band.push(p); aJaw += Math.sqrt(dist2(p, jaw(s + ds, v))) * Math.sqrt(dist2(p, jaw(s, v + dv))); }
  }
  return (SURF = { shell, cap, band, aFree: aShell + aJaw, lens: LINES.map(([, f]) => lengthOf(f)) });
}
const crownGrid = (D) => ({ H: HAT.top - BRIM_Y - 0.07, cols: Math.max(7, Math.round((HAT.arc * (HAT.rx + HAT.rz)) / (1.85 * D)) + 1), rows: Math.max(5, Math.round((HAT.top - BRIM_Y - 0.07) / (1.1 * D))) });
/** Zahl der festen Drohnen bei Abstand D (wie along() sie setzt). */
function fixedCount(D, lens) {
  const { cols, rows } = crownGrid(D);
  return cols * (rows + 1) + 2 + LINES.reduce((n, [, , f, closed], i) => n + Math.max(1, Math.round(lens[i] / (f * D))) + (closed ? 0 : 1), 0);
}

function build(k) {
  const { shell, cap, band, aFree, lens } = surfaces(), capCount = Math.round(CAP_SHARE * k);
  // Punktabstand D so, dass die freien Flächen so dicht stehen wie die festen Linien: m Drohnen auf der Fläche A liegen
  // bei der Farthest-Point-Auswahl im Median rund 0,74 · √(A / m · 2/√3) auseinander (gemessen, scripts/totenkopf.test.mjs)
  // (je größer D, desto weniger feste und desto mehr freie Drohnen: eine Nullstelle, Bisektion)
  const gap = (D) => { const m = k - capCount - fixedCount(D, lens); return m <= 0 ? -1 : D - 0.78 * Math.sqrt((1.1547 * aFree) / m); };
  let lo = 0.02, hi = 0.3;
  for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2; if (gap(mid) < 0) lo = mid; else hi = mid; }
  const D = hi;
  const fixed = [], tags = [];
  const put = (pts, tag) => { for (const p of pts) { fixed.push(p); tags.push(tag); } };
  // Zylinder: senkrechte Säulen über ±arc, die Säulen weiter auseinander als die Drohnen in einer Säule (in der Show
  // rund elf Säulen von vorn)
  const { H, cols, rows } = crownGrid(D);
  for (let a = 0; a < cols; a++) {
    const phi = -HAT.arc + (2 * HAT.arc * a) / (cols - 1);
    for (let r = 0; r <= rows; r++) put([crown(BRIM_Y + 0.07 + (H * r) / rows, phi)], 'zylinder');
  }
  for (const [tag, f, sp, closed] of LINES) {
    const pts = along(f, sp * D, closed);
    put(tag === 'traene' ? pts.map(([x, y]) => [x, y, y > -0.4 && Math.abs(x) < WIDTH(y) * 0.97 ? frontZ(x, y) : zNear(band, x, y)]) : pts, tag);
  }
  // tief in jeder Augenhöhle ein Licht
  for (const side of [-1, 1]) put([onFace(side * (EYES.x - 0.01), EYES.y - 0.01, -0.15)], 'glut');
  // Schädeldecke: wenige Drohnen (sie leuchten nur, wenn der Hut gelüftet ist), mit Abstand zu allem Festen; dann die
  // freien Flächen bis genau k Drohnen
  const capPts = farthest(cap, fixed, capCount);
  const chosen = farthest([...shell, ...band], [...fixed, ...capPts], k - fixed.length - capPts.length);
  const kind = (p) => (p[1] < -0.45 && (Math.abs(p[0]) > 0.3 || p[1] < -0.62) ? 'kiefer' : 'schaedel');
  return { pts: [...fixed, ...capPts, ...chosen], tags: [...tags, ...capPts.map(() => 'decke'), ...chosen.map(kind)], D };
}

const cache = new Map();
/** Der Totenkopf mit Zylinder aus k Drohnen: Punkte [x, y, z] des aufrechten Kopfes (y oben, z zum Publikum),
 * Teilnamen, Punktabstand. */
export function skullHatBody(k) {
  if (!cache.has(k)) cache.set(k, build(k));
  const { pts, tags, D } = cache.get(k);
  return { pts: pts.map((p) => p.slice()), tags: tags.slice(), D };
}
/** Drehpunkt des Hutes beim Lüften: Mitte des Kopfansatzes. */
export const HAT_PIVOT = [0, BRIM_Y, HAT.cz];
/** Höhe der Krempe am Kopf (die Schädeldecke darüber ist nur bei gelüftetem Hut zu sehen). */
export const BRIM = BRIM_Y;
