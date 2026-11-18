// Indoor-Reihe (Runde 4, 18.11.2026): kleine Motive für die Show-Folge der Indoor-Seite (`#unterschied`, folge.js mit
// variant: "indoor"). Indoor fliegen real 20–50 Drohnen in einem Raum; darum wenige Punkte, einfache Linien, die mit
// 50 Lichtern eindeutig bleiben, und ruhige Eigenbewegung (Licht, ein kurzer Schwenk, eine laufende Welle). Jedes Bild
// hat genau n Drohnen. Bewegung startet bei t = 0 aus der Ruhelage (keine Finte); folge.js legt die Show-Uhr darüber.
import { TAU, WARM, GOLD, PINK, VIOLET, CYAN, BLUE, mix, paint, yaw, roll, glint, chase, wander, lightRank } from "../show-motion.js";
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

const MAKERS = { herz, welle, initialen, stern, ring, noten };

/** Szene eines Indoor-Motivs mit n Drohnen: { beats: [{ pts, live }] }. */
export function indoorScene(key, n) {
  const make = MAKERS[key];
  if (!make) throw new Error(`Indoor-Motiv ${key} fehlt`);
  const { pts, live } = make(n);
  if (pts.length !== n) throw new Error(`Indoor-Motiv ${key}: ${pts.length} statt ${n} Punkte`);
  return { beats: [{ pts, live }] };
}
