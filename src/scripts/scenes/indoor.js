// Indoor-Reihe (Runde 4, 18.11.2026): kleine Motive für die Show-Folge der Indoor-Seite (`#unterschied`, folge.js mit
// variant: "indoor"). Indoor fliegen real 20–50 Drohnen in einem Raum; darum wenige Punkte, einfache Linien, die mit
// 50 Lichtern eindeutig bleiben, und ruhige Eigenbewegung (Licht, ein kurzer Schwenk, eine laufende Welle). Ein Bild hat
// zwischen MIN_DRONES und n Drohnen; was ein Bild nicht braucht, fliegt dunkel unter die Bühne (Feld mit joinLate). Bewegung
// startet bei t = 0 aus der Ruhelage (keine Finte); folge.js legt die Show-Uhr darüber.
//
// Runde 10 (Marc, 20.11.2026: „Bei Indoor-Shows ist das eher ein Business-Event, deswegen sinnvoller, eher Marketingmotive
// zu nehmen … Smiley und Herz ist mir zu doll … Der Ring ist wieder weird … Mehr solche geometrischen Formen, die man mit
// 20 bis 50 Drohnen machen kann, oder mit wenigen Drohnen, die unterschiedliche geometrische Shapes ablaufen“): Herz,
// lachendes Gesicht, Initialen und Ring sind raus. Welle, Doppelhelix, Stern, Krone (Marcs „Wahrzeichen“), Noten und
// Diamant bleiben. Neu und ruhig-präzise: Würfel (44 Drohnen), Tetraeder (28), Formen-Morph Kreis → Dreieck → Quadrat →
// Sechseck (36), Raster mit Wellenring (50), Lissajous-Schleife, auf der 40 Drohnen umlaufen.
import { TAU, WARM, GOLD, PINK, VIOLET, CYAN, BLUE, DIAMOND, mix, paint, yaw, roll, pitch, glint, chase, wander, lightRank } from "../show-motion.js";
import { sampleOutline, star } from "../show-geometry.js";
import { share } from "../show-shapes.js";

const line = (...pts) => ({ pts, closed: false });
const settle = (u) => (1 - Math.cos(Math.min(1, Math.max(0, u)) * Math.PI)) / 2; // 0 → 1, sanft an und aus

/** Welle: eine Linie quer durch den Raum, über die eine Welle läuft (die Drohnen steigen und sinken nur). */
function welle(n) {
  const pts = Array.from({ length: n }, (_, i) => { const x = -1.15 + (2.3 * i) / (n - 1); return [x, 0.32 * Math.sin(x * 2.4), 0, ...mix(CYAN, BLUE, (x + 1.15) / 2.3)]; });
  return { pts, live: (b, j, t, o) => { const k = Math.min(1, t / 0.6); o[1] = 0.32 * Math.sin(b[0] * 2.4 - t * 2.6 * k); o[3] = chase(b[0], t, 0.9, 1.15, 0.95, 1.35); } };
}

/** Stern: fünf Zacken, dreht sich langsam in der Bildebene, Licht läuft die Zacken entlang. */
function stern(n) {
  const pts = paint(star(n).map(([x, y]) => [x * 0.95, y * 0.95, 0]), GOLD), rank = lightRank(pts);
  return { pts, live: (b, j, t, o) => { roll(o, -0.32 * t); o[3] = wander(rank[j], t, 2.2, 0.5, 0.1); } };
}

/** Noten: zwei Achtelnoten mit Balken (Indoor-Shows laufen zur Musik). Das FlyingStars-Zeichen las sich mit 50 Punkten
 *  nicht (geprüft im Kontaktbogen, 18.11.2026), darum keine Logo-Miniatur. Die Noten wiegen sich im Takt. */
function noten(n) {
  const head = (cx, cy) => ({ pts: Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU, x = Math.cos(a) * 0.2, y = Math.sin(a) * 0.13; return [cx + x * 0.94 - y * 0.34, cy + x * 0.34 + y * 0.94]; }) });
  const [nh, ns, nb] = share(n, [2.1, 1.75, 1.15]);
  const heads = sampleOutline([head(-0.55, -0.5), head(0.45, -0.3)], nh);
  const stems = sampleOutline([line([-0.37, -0.45], [-0.37, 0.62]), line([0.63, -0.25], [0.63, 0.82])], ns);
  const beam = sampleOutline([line([-0.37, 0.62], [0.63, 0.82]), line([-0.37, 0.48], [0.63, 0.68])], nb);
  const pts = [...paint(heads.map(([x, y]) => [x, y, 0]), CYAN), ...paint(stems.map(([x, y]) => [x, y, 0]), mix(CYAN, VIOLET, 0.5)), ...paint(beam.map(([x, y]) => [x, y, 0]), VIOLET)];
  return { pts, live: (b, j, t, o) => { roll(o, 0.12 * Math.sin(t * 2.4) * Math.min(1, t / 0.5), 0, -0.4); o[3] = j < nh ? 1 + 0.4 * Math.max(0, Math.sin(t * 4.8 + (b[0] > 0 ? 1.6 : 0))) : 1; } };
}

// Runde 6 (Marc, 18.11.2026: „die Anzahl und Art der Formen sollten schneller rotieren“): vier weitere Motive, abwechselnd
// flach und räumlich.

/** Diamant: die klassische Edelstein-Kontur (Krone, Rundiste, Spitze, zwei Facettenlinien), schwenkt leicht im Raum,
 *  Licht blitzt über die Facetten. Ein echter Brillantschliff las sich mit 50 Punkten nur als Punktwolke. */
function diamant(n) {
  const rim = { pts: [[-0.55, 0.62], [0.55, 0.62], [1, 0.18], [0, -0.95], [-1, 0.18]] };
  const facets = [line([-1, 0.18], [1, 0.18]), line([-0.25, 0.62], [-0.42, 0.18], [0, -0.95]), line([0.25, 0.62], [0.42, 0.18], [0, -0.95])];
  const [nr, nf] = share(n, [3.4, 1.6]);
  const pts = [...paint(sampleOutline([rim], nr).map(([x, y]) => [x, y, 0]), (p) => mix(DIAMOND, CYAN, (0.6 - p[1]) / 1.6)), ...paint(sampleOutline(facets, nf).map(([x, y]) => [x, y, 0]), mix(DIAMOND, WARM, 0.4))];
  return { pts, live: (b, j, t, o) => { yaw(o, -0.45 + 0.9 * settle(t / 1.6), 0, 0); o[3] = 1 + 0.7 * Math.max(0, Math.sin(t * 2.6 - b[0] * 2 + b[1])) ** 8; } };
}

/** Doppelspirale: zwei Stränge um eine Achse, die sich dreht; Licht läuft nach oben. */
function spirale(n) {
  const [na, nb] = share(n, [1, 1]), strand = (k, phase) => Array.from({ length: k }, (_, i) => { const u = i / (k - 1), a = u * TAU * 1.6 + phase; return [Math.cos(a) * 0.42, -0.95 + 1.9 * u, Math.sin(a) * 0.42]; });
  const pts = [...paint(strand(na, 0), CYAN), ...paint(strand(nb, Math.PI), VIOLET)];
  return { pts, live: (b, j, t, o) => { yaw(o, 0.9 * t, 0, 0); o[3] = chase(b[1], t, 0.55, 0.9, 0.9, 1.45); } };
}

/** Krone: fünf Zacken mit Kugeln an den Spitzen, ein Glanz läuft darüber. */
function krone(n) {
  const outline = { pts: [[-0.9, -0.5], [-0.9, 0.2], [-0.62, 0.62], [-0.42, 0.1], [0, 0.72], [0.42, 0.1], [0.62, 0.62], [0.9, 0.2], [0.9, -0.5]] };
  const [nb, nt] = share(n, [5, 1]), tips = [[-0.62, 0.62], [0, 0.72], [0.62, 0.62]];
  const jewels = Array.from({ length: nt }, (_, i) => { const [x, y] = tips[i % 3], k = Math.floor(i / 3), a = (k / Math.ceil(nt / 3)) * TAU; return [x + Math.cos(a) * 0.07, y + 0.12 + Math.sin(a) * 0.07, 0]; });
  const pts = [...paint(sampleOutline([outline], nb).map(([x, y]) => [x, y, 0]), GOLD), ...paint(jewels, PINK)];
  return { pts, live: (b, j, t, o) => { o[3] = glint(b[0] + b[1] * 0.3, t, 1.8, 0.55); } };
}

// Runde 10: geometrische Motive. Kanten werden mit festen Ecken gezeichnet (Ecke + gleich viele Drohnen je Kante), damit
// jede Ecke eine Drohne trägt und die Abstände auf allen Kanten gleich sind; die Drohnenzahl folgt daraus (44, 28, 36).

/** Ecken und Kanten → Punkte: jede Ecke einmal, auf jeder Kante per Drohnen im gleichen Abstand. */
function edges(V, E, per) {
  const out = V.map((v) => [...v]);
  for (const [a, b] of E) for (let k = 1; k <= per; k++) { const u = k / (per + 1); out.push(V[a].map((q, i) => q + (V[b][i] - q) * u)); }
  return out;
}
/** Körper, der sich um seine Hochachse dreht und leicht von oben gesehen wird; ein Glanz läuft über die Kanten. */
function spinning(local, colour, { tilt, start, speed }) {
  const at = (j, a, o) => { o[0] = local[j][0]; o[1] = local[j][1]; o[2] = local[j][2]; yaw(o, a); pitch(o, tilt); };
  const pts = local.map((p, j) => { const o = [0, 0, 0]; at(j, start, o); return [o[0], o[1], o[2], ...colour(p)]; });
  return { pts, live: (b, j, t, o) => { at(j, start + speed * t, o); o[3] = glint(o[0] + 0.4 * o[1], t, 1.6, 0.45); } };
}

/** Würfel: 8 Ecken, 12 Kanten mit je drei Drohnen (44), dreht sich, von schräg oben gesehen. Mit zwei Drohnen je Kante
 *  (32) zerfiel er im Kontaktbogen in Einzelpunkte. */
function wuerfel() {
  const a = 0.56, V = [], E = [];
  for (let i = 0; i < 8; i++) V.push([i & 1 ? a : -a, i & 2 ? a : -a, i & 4 ? a : -a]);
  for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) E.push([i, i | bit]);
  return spinning(edges(V, E, 3), (p) => mix(CYAN, BLUE, (0.56 - p[1]) / 1.12), { tilt: 0.5, start: 0.62, speed: 0.7 });
}

/** Tetraeder: steht auf einer Fläche, Spitze oben, 4 Ecken und 6 Kanten mit je vier Drohnen (28), dreht sich. */
function tetraeder() {
  const e = 1.45, R = e / Math.sqrt(3), h = e * Math.sqrt(2 / 3), y0 = -h / 4 - 0.08;
  const V = [[0, y0 + h, 0], ...[0, 1, 2].map((k) => { const a = (k / 3) * TAU + 0.3; return [Math.cos(a) * R, y0, Math.sin(a) * R]; })];
  const E = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];
  return spinning(edges(V, E, 4), (p) => mix(GOLD, WARM, (p[1] - y0) / h), { tilt: 0.28, start: 0.2, speed: -0.85 });
}

/** Formen: 36 Drohnen laufen von Kreis zu Dreieck, Quadrat und Sechseck (36 ist durch 3, 4 und 6 teilbar: jede Ecke
 *  trägt eine Drohne, jede Seite gleich viele). Die Drohnen behalten ihre Reihenfolge rundum, die Form verwandelt sich. */
const FORM_N = 36;
const polygon = (m, R, start) => Array.from({ length: FORM_N }, (_, j) => {
  if (m === 0) { const a = start - (j / FORM_N) * TAU; return [Math.cos(a) * R, Math.sin(a) * R]; }
  const per = FORM_N / m, s = Math.floor(j / per), f = (j % per) / per, c = (k) => { const a = start - (k / m) * TAU; return [Math.cos(a) * R, Math.sin(a) * R]; };
  const [x0, y0] = c(s), [x1, y1] = c(s + 1); return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
});
const FORMS = [polygon(0, 0.82, Math.PI / 2), polygon(3, 1.0, Math.PI / 2).map(([x, y]) => [x, y - 0.12]), polygon(4, 0.98, (3 * Math.PI) / 4), polygon(6, 0.9, Math.PI / 2)];
/** Ablauf in Uhrzeit: Form k steht bis FORM_AT[k], dann 0,5 s Verwandlung zur nächsten. */
const FORM_AT = [0.45, 1.35, 2.25], FORM_MORPH = 0.5;
function formen() {
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : (1 - Math.cos(u * Math.PI)) / 2);
  const pts = FORMS[0].map(([x, y], j) => [x, y, 0, ...mix(CYAN, VIOLET, j / FORM_N)]);
  return { pts, live: (b, j, t, o) => {
    let k = 0; while (k < FORM_AT.length && t >= FORM_AT[k] + FORM_MORPH) k++;
    const u = k < FORM_AT.length ? ease((t - FORM_AT[k]) / FORM_MORPH) : 0, A = FORMS[k], B = FORMS[Math.min(k + 1, FORMS.length - 1)];
    o[0] = A[j][0] + (B[j][0] - A[j][0]) * u; o[1] = A[j][1] + (B[j][1] - A[j][1]) * u; o[2] = 0;
    o[3] = wander(j / FORM_N, t, 2.4, 0.4, 0.08);
  } };
}

/** Raster: 5 × 10 Drohnen als Fläche im Raum (schräg von oben), ein Wellenring läuft aus der Mitte nach außen. */
function raster(n) {
  const cols = 10, rows = Math.max(2, Math.min(5, Math.floor(n / cols))), grid = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid.push([-0.98 + (1.96 * c) / (cols - 1), 0, -0.8 + (1.6 * r) / (rows - 1)]);
  const lift = (x, z, t) => { const d = Math.hypot(x, z), k = Math.min(1, t / 0.5); return 0.3 * k * Math.sin(d * 3.6 - t * 4.2) * Math.exp(-d * 0.45); };
  const at = (j, t, o) => { const [x, , z] = grid[j]; o[0] = x; o[1] = lift(x, z, t) - 0.1; o[2] = z; pitch(o, 0.72); };
  const pts = grid.map((p, j) => { const o = [0, 0, 0]; at(j, 0, o); return [o[0], o[1], o[2], ...mix(BLUE, CYAN, (p[0] + 0.98) / 1.96)]; });
  return { pts, live: (b, j, t, o) => { at(j, t, o); o[3] = 0.85 + 2.2 * Math.max(0, lift(grid[j][0], grid[j][2], t)); } };
}

/** Lissajous-Schleife 1 : 2 (liegende Acht): 40 Drohnen laufen gleichmäßig auf ihr entlang, die Schleife kippt dabei
 *  sacht im Raum. Die räumliche Figur 3 : 2 war mit 40 Drohnen zu lang und zerfiel im Kontaktbogen in Einzelpunkte. */
const LISSA_N = 40;
function lissajous() {
  const curve = (u) => [Math.sin(u) * 1.12, Math.sin(2 * u) * 0.55, Math.cos(u) * 0.35];
  // Bogenlänge einmal tabellieren: gleiche Abstände auf der Kurve (das Kippen ändert sie nicht)
  const K = 720, arc = [0];
  for (let i = 1; i <= K; i++) { const a = curve(((i - 1) / K) * TAU), b = curve((i / K) * TAU); arc.push(arc[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
  const total = arc[K], uAt = (s) => { const d = (((s % 1) + 1) % 1) * total; let lo = 0, hi = K; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arc[m] < d) lo = m; else hi = m; } return ((lo + (d - arc[lo]) / (arc[hi] - arc[lo] || 1)) / K) * TAU; };
  const at = (j, t, o) => { const [x, y, z] = curve(uAt(j / LISSA_N + 0.09 * t)); o[0] = x; o[1] = y; o[2] = z; yaw(o, 0.25 * Math.sin(0.9 * t)); };
  const pts = Array.from({ length: LISSA_N }, (_, j) => { const o = [0, 0, 0]; at(j, 0, o); return [o[0], o[1], o[2], ...mix(VIOLET, CYAN, 0.5 + 0.5 * Math.sin((j / LISSA_N) * TAU))]; });
  return { pts, live: (b, j, t, o) => { at(j, t, o); o[3] = chase(j / LISSA_N, t, 0.25, 0.5, 0.85, 1.35); } };
}

const MAKERS = { welle, wuerfel, stern, spirale, formen, raster, diamant, tetraeder, noten, lissajous, krone };
/** Weniger Drohnen als hier sehen indoor wie eine Panne aus (Marc: „20 bis 50 Drohnen“). */
export const MIN_DRONES = 20;

/** Szene eines Indoor-Motivs mit höchstens n Drohnen: { beats: [{ pts, live }] }. */
export const INDOOR_MOTIFS = Object.keys(MAKERS);
export function indoorScene(key, n) {
  const make = MAKERS[key];
  if (!make) throw new Error(`Indoor-Motiv ${key} fehlt`);
  const { pts, live } = make(n);
  if (pts.length > n || pts.length < Math.min(n, MIN_DRONES)) throw new Error(`Indoor-Motiv ${key}: ${pts.length} Punkte, erlaubt ${MIN_DRONES}–${n}`);
  return { beats: [{ pts, live }] };
}
