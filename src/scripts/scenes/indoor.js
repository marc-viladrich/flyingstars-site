// Indoor-Reihe (Runde 4, 18.11.2026): kleine Motive für die Show-Folge der Indoor-Seite (`#unterschied`, folge.js mit
// variant: "indoor"). Indoor fliegen real 20–50 Drohnen in einem Raum; darum wenige Punkte, einfache Linien, die mit
// 50 Lichtern eindeutig bleiben, und ruhige Eigenbewegung (Licht, ein kurzer Schwenk, eine laufende Welle). Jedes Bild
// hat genau n Drohnen. Bewegung startet bei t = 0 aus der Ruhelage (keine Finte); folge.js legt die Show-Uhr darüber.
import { TAU, WARM, GOLD, PINK, VIOLET, CYAN, BLUE, DIAMOND, mix, paint, yaw, roll, glint, chase, wander, lightRank } from "../show-motion.js";
import { sampleOutline, heartOutline, star } from "../show-geometry.js";
import { sample3d, share } from "../show-shapes.js";

const line = (...pts) => ({ pts, closed: false });
const settle = (u) => (1 - Math.cos(Math.min(1, Math.max(0, u)) * Math.PI)) / 2; // 0 → 1, sanft an und aus

/** Herz: Umriss, ein ruhiger Herzschlag aus Licht und eine Spur Größe. */
function herz(n) {
  const pts = paint(heartOutline(n).map(([x, y]) => [x / 16, y / 16 + 0.05, 0]), (p) => mix(PINK, VIOLET, (0.9 - p[1]) / 1.8));
  const beat = (t) => { const u = (t % 1.6) / 1.6; return Math.exp(-(((u - 0.12) / 0.05) ** 2)) + 0.6 * Math.exp(-(((u - 0.3) / 0.05) ** 2)); };
  return { pts, live: (b, j, t, o) => { const k = beat(t) * Math.min(1, t / 0.4); o[0] = b[0] * (1 + 0.035 * k); o[1] = b[1] * (1 + 0.035 * k); o[3] = 1 + 0.45 * k; } };
}

/** Welle: eine Linie quer durch den Raum, über die eine Welle läuft (die Drohnen steigen und sinken nur). */
function welle(n) {
  const pts = Array.from({ length: n }, (_, i) => { const x = -1.15 + (2.3 * i) / (n - 1); return [x, 0.32 * Math.sin(x * 2.4), 0, ...mix(CYAN, BLUE, (x + 1.15) / 2.3)]; });
  return { pts, live: (b, j, t, o) => { const k = Math.min(1, t / 0.6); o[1] = 0.32 * Math.sin(b[0] * 2.4 - t * 2.6 * k); o[3] = chase(b[0], t, 0.9, 1.15, 0.95, 1.35); } };
}

/** Initialen „L ♥ M“ in einer Linie, ein Lichtlauf schreibt sie nach. */
function initialen(n) {
  const L = line([-1.12, 0.5], [-1.12, -0.5], [-0.74, -0.5]);
  const M = line([0.62, -0.5], [0.62, 0.5], [0.87, 0.02], [1.12, 0.5], [1.12, -0.5]);
  const heart = { pts: heartOutline(64).map(([x, y]) => [x / 16 * 0.36, y / 16 * 0.36 + 0.02]) };
  const [nl, nh, nm] = share(n, [1.25, 1.35, 2.3]);
  const pts = [...paint(sampleOutline([L], nl), WARM), ...paint(sampleOutline([heart], nh), PINK), ...paint(sampleOutline([M], nm), WARM)];
  const rank = lightRank(pts);
  return { pts: pts.map((p) => [p[0], p[1], 0, ...p.slice(3)]), live: (b, j, t, o) => { o[3] = wander(rank[j], t, 2.6, 0.55, 0.12); } };
}

/** Stern: fünf Zacken, dreht sich langsam in der Bildebene, Licht läuft die Zacken entlang. */
function stern(n) {
  const pts = paint(star(n).map(([x, y]) => [x * 0.95, y * 0.95, 0]), GOLD), rank = lightRank(pts);
  return { pts, live: (b, j, t, o) => { roll(o, -0.32 * t); o[3] = wander(rank[j], t, 2.2, 0.5, 0.1); } };
}

/** Ring: ein Ring mit Stein, im Dreiviertelprofil, schwenkt einmal weiter (zeigt, dass er im Raum steht). */
function ring(n) {
  const stone = Math.max(8, Math.round(n * 0.18)), band = n - stone, R = 0.72;
  const hoop = sample3d([{ pts: Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU + TAU / 4; return [Math.cos(a) * R, Math.sin(a) * R - 0.12, 0]; }), closed: true }], band);
  const gem = Array.from({ length: stone }, (_, i) => { const a = (i / stone) * TAU; return [Math.cos(a) * 0.15, R - 0.12 + 0.17 + Math.sin(a) * 0.12, 0]; });
  const pts = [...paint(hoop, GOLD), ...paint(gem, [215, 240, 255])];
  return { pts, live: (b, j, t, o) => { yaw(o, -0.75 + 0.55 * settle(t / 2.2), 0, 0); o[3] = j >= band ? 1.15 + 0.25 * Math.sin(t * 5 + j) : glint(Math.atan2(b[1] + 0.12, b[0]), t, 2.2, 0.45, -Math.PI, Math.PI); } };
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

/** Lachendes Gesicht: Kreis, zwei Augen, ein Lächeln; zwinkert einmal. */
function smiley(n) {
  const [nc, ne, nm] = share(n, [5.2, 0.8, 2]), circle = { pts: Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU; return [Math.cos(a), Math.sin(a)]; }) };
  const mouth = line(...Array.from({ length: 17 }, (_, i) => { const a = Math.PI * (1.15 + 0.7 * (i / 16)); return [Math.cos(a) * 0.58, 0.02 + Math.sin(a) * 0.58]; }));
  const eyes = Array.from({ length: ne }, (_, i) => { const side = i % 2 ? 1 : -1, k = Math.floor(i / 2); return [side * 0.34, 0.32 + (k - (ne / 4 - 0.5)) * 0.07, 0]; });
  const pts = [...paint(sampleOutline([circle], nc).map(([x, y]) => [x, y, 0]), GOLD), ...paint(eyes, WARM), ...paint(sampleOutline([mouth], nm).map(([x, y]) => [x, y, 0]), WARM)];
  return { pts, live: (b, j, t, o) => { if (j >= nc && j < nc + ne && b[0] > 0) { const w = Math.exp(-((((t % 2.4) - 1.2) / 0.09) ** 2)); o[1] = 0.32 + (b[1] - 0.32) * (1 - 0.85 * w); } } };
}

const MAKERS = { herz, welle, initialen, stern, ring, noten, diamant, spirale, krone, smiley };

/** Szene eines Indoor-Motivs mit n Drohnen: { beats: [{ pts, live }] }. */
export function indoorScene(key, n) {
  const make = MAKERS[key];
  if (!make) throw new Error(`Indoor-Motiv ${key} fehlt`);
  const { pts, live } = make(n);
  if (pts.length !== n) throw new Error(`Indoor-Motiv ${key}: ${pts.length} statt ${n} Punkte`);
  return { beats: [{ pts, live }] };
}
