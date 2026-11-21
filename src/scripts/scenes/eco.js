// Nachhaltigkeit auf der Startseite (Runde 14, 21.11.2026): Moritz will die Nachhaltigkeit „erwähnt, aber nicht so viel
// Raum“; Marc: eine kompakte Section, rechts eine Drohnenformation, die durch die Figuren der bisherigen Scrollstory
// rotiert. Dieselbe Technik wie die Indoor-Reihe (folge.js, variant: "eco"), keine eigene Render-Engine. Die Figuren
// stammen aus der Scrollstory (effects/eco-scrolly.js) und tragen wie dort den Logoverlauf von links nach rechts:
//   schall  die ruhige, leicht wellige Schallwelle („Kein Knall“): drei Linien, über die eine flache Welle läuft
//   flotte  die geparkte Flotte in Reihen („Kein Müll“, die Drohnen sind wiederverwendbar), von schräg oben gesehen;
//           eine Lichtwelle läuft durch die Reihen wie beim Aufladen
//   blitz   der Blitz („Ökostrom“), ein Lichtlauf von oben nach unten
// Die Null aus der Scrollstory fehlt: ohne die Zahl daneben liest sie sich als Ring und sagt nichts.
// Koordinaten wie die Indoor-Motive: y zeigt nach oben, das Feld passt jedes Bild in seine Bühne ein.
import { VIOLET, CYAN, mix, pitch, yaw, chase, glint } from "../show-motion.js";
import { sampleOutline } from "../show-geometry.js";

/** Logoverlauf amber → orchid → cyan (--grad), u von 0 (links) bis 1 (rechts). */
const AMBER = [255, 158, 41];
const grad = (u) => (u < 0.5 ? mix(AMBER, VIOLET, u * 2) : mix(VIOLET, CYAN, u * 2 - 1));
const across = (x, x0, x1) => grad((x - x0) / (x1 - x0 || 1));

/** Schallwelle: drei Linien übereinander, die Welle ist flach und läuft an den Enden aus (leise). */
function schall(n) {
  const per = Math.floor(n / 3), pts = [];
  // Die drei Linien laufen fast phasengleich (Versatz 0,35) und mit wenig unterschiedlicher Höhe: Sie schwingen gemeinsam
  // und kreuzen sich nie (in der Scrollstory kreuzten sie sich, zwei Drohnen lagen dort aufeinander). Wächter:
  // scripts/eco-motive.test.mjs
  const shape = (u, L, t) => Math.sin(u * Math.PI * 3 + t * 1.6 + L * 0.35) * (0.22 - L * 0.03) * Math.sin(u * Math.PI) + (L - 1) * 0.17;
  for (let L = 0; L < 3; L++) for (let i = 0; i < per; i++) { const u = i / (per - 1), x = (u - 0.5) * 2.3; pts.push([x, shape(u, L, 0), 0, ...across(x, -1.15, 1.15)]); }
  return { pts, live: (b, j, t, o) => {
    const L = Math.floor(j / per), u = (j % per) / (per - 1), k = Math.min(1, t / 0.6); // aus der Ruhelage an, keine Finte
    o[1] = shape(u, L, t * k);
    o[3] = chase(u, t, 0.22, 0.5, 0.85, 1.3);
  } };
}

/** Geparkte Flotte: Reihen von Drohnen auf dem Boden, von schräg oben gesehen; nichts bleibt zurück. */
function flotte(n) {
  const rows = 5, cols = Math.floor(n / rows), grid = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid.push([-1.15 + (2.3 * c) / (cols - 1), 0, -0.62 + (1.24 * r) / (rows - 1)]);
  const at = (j, t, o) => { const [x, , z] = grid[j]; o[0] = x; o[1] = 0; o[2] = z; yaw(o, 0.06 * Math.sin(t * 0.5)); pitch(o, 0.62); };
  const pts = grid.map((p, j) => { const o = [0, 0, 0]; at(j, 0, o); return [o[0], o[1], o[2], ...across(p[0], -1.15, 1.15)]; });
  return { pts, live: (b, j, t, o) => { at(j, t, o); o[3] = chase(grid[j][0] * 0.5 + grid[j][2] * 0.3, t, 0.35, 0.9, 0.7, 1.35); } };
}

/** Blitz: Umriss wie in der Scrollstory, ein Licht läuft von oben nach unten (Strom fließt). */
function blitz(n) {
  const outline = { pts: [[-0.05, 1], [0.45, 1], [0.1, 0.15], [0.5, 0.15], [-0.25, -1], [0, -0.1], [-0.45, -0.1]].map(([x, y]) => [x * 1.05, y * 1.05]) };
  const pts = sampleOutline([outline], n).map(([x, y]) => [x, y, 0, ...across(x, -0.5, 0.55)]);
  // fill: der schmale Blitz füllt die Bühnenhöhe fast ganz (Marc, Runde 15: „ein ganzes Stück größer“); die breiten Figuren
  // bleiben beim fill der Variante (folge.js), sonst stoßen sie seitlich an
  return { pts, fill: 0.98, live: (b, j, t, o) => { o[3] = glint(-b[1], t, 1.8, 0.7, -1.4, 1.4); } };
}

const MAKERS = { schall, flotte, blitz };
/** Reihenfolge der Rotation (folge.js, ECO_ROW). */
export const ECO_MOTIFS = Object.keys(MAKERS);

/** Szene einer Nachhaltigkeits-Figur mit höchstens n Drohnen: { beats: [{ pts, live }] }. */
export function ecoScene(key, n) {
  const make = MAKERS[key];
  if (!make) throw new Error(`Nachhaltigkeits-Figur ${key} fehlt`);
  const { pts, live, fill } = make(n);
  if (pts.length > n || pts.length < n * 0.8) throw new Error(`Nachhaltigkeits-Figur ${key}: ${pts.length} Punkte bei ${n}`);
  return { beats: [{ pts, live, ...(fill ? { fill } : {}) }] };
}
