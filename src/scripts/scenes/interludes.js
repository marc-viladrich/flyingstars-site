// Geometric interludes between the motifs of a SPARK show (Marc, round 11: "der geometrische Torbogen oder diese
// geometrischen Ornamente für zwischendurch, oder diese Pfeilformen"). Own designs in the spirit of the references
// FSR-037/038/039: a gate of light, a fan band, a wheel of arrows. Each is drawn by light first (the drones stand
// on the lines, a reveal runs along them), then breathes once; a real SPARK show also passes through such figures.
import { sampleOutline } from "../show-geometry.js";
import { GOLD, WARM, CYAN, TAU, paint, mix, trace, sparkle, share, smooth } from "../show-motion.js";

const arc = (r, a0, a1, cx = 0, cy = 0, k = 40) => ({ pts: Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }), closed: false });
const line = (...pts) => ({ pts, closed: false });

/** A round gate of light: three offset arches on two pillars, revealed from the ground up. */
function gate(n) {
  const [a, p] = share(n, [3, 1]);
  const arches = sampleOutline([arc(1, 0, Math.PI, 0, 0), arc(0.78, 0.08, Math.PI - 0.08, 0, 0.06), arc(0.56, 0.16, Math.PI - 0.16, 0, 0.12)], a);
  const pillars = sampleOutline([line([-1, 0], [-1, -0.95]), line([1, 0], [1, -0.95])], p);
  const pts = [...pillars, ...arches].map(([x, y]) => [x, y, 0]);
  // reveal order: from the ground up along both sides at once
  const order = pts.map(([x, y]) => (y + 0.95) / 2.1 + 0.02 * Math.abs(x));
  return { pts: paint(pts, (q) => mix(GOLD, WARM, (q[1] + 0.95) / 2)), order };
}
/** A fan band: five rays from a common foot, their tips joined by small arcs, like an Art Deco sunrise. */
function fan(n) {
  const R = 1.05, rays = 7, paths = [];
  for (let i = 0; i < rays; i++) { const a = Math.PI * (0.12 + (0.76 * i) / (rays - 1)); paths.push(line([0, -0.55], [Math.cos(a) * R, -0.55 + Math.sin(a) * R])); }
  paths.push(arc(R, Math.PI * 0.12, Math.PI * 0.88, 0, -0.55, 60), arc(R * 0.55, Math.PI * 0.12, Math.PI * 0.88, 0, -0.55, 40));
  const pts = sampleOutline(paths, n).map(([x, y]) => [x, y, 0]);
  const order = pts.map(([x, y]) => Math.hypot(x, y + 0.55) / R); // from the foot outward
  return { pts: paint(pts, (q) => mix(CYAN, GOLD, Math.hypot(q[0], q[1] + 0.55) / R)), order };
}
/** A wheel of arrows pointing to the centre, around a small ring. */
function arrows(n) {
  const k = 8, [ring, rest] = share(n, [1, 4]), paths = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * TAU, c = Math.cos(a), s = Math.sin(a), at = (r, side = 0) => [c * r - s * side, s * r + c * side];
    paths.push(line(at(1.05), at(0.42)), line(at(0.58, -0.12), at(0.42), at(0.58, 0.12)));
  }
  const pts = [...sampleOutline([{ pts: Array.from({ length: 40 }, (_, i) => [Math.cos((i / 40) * TAU) * 0.2, Math.sin((i / 40) * TAU) * 0.2]) }], ring), ...sampleOutline(paths, rest)].map(([x, y]) => [x, y, 0]);
  const order = pts.map(([x, y]) => 1 - Math.hypot(x, y) / 1.05); // from the rim to the centre, like the arrows
  return { pts: paint(pts, (q) => mix(WARM, GOLD, 1 - Math.hypot(q[0], q[1]))), order, ring };
}

const FIGURES = [["Zwischenbild: ein Tor aus Licht", gate], ["Zwischenbild: ein Fächer", fan], ["Zwischenbild: Pfeile zur Mitte", arrows]];

/** The k-th interlude of a show with n drones: drawn by light in 1.4 s, then it sparkles and breathes inward. */
export function interlude(k, n) {
  const [caption, figure] = FIGURES[k % FIGURES.length], { pts, order, ring = 0 } = figure(n);
  return { pts, caption, interlude: true, frame: "interlude", hold: 1.6, live: (b, j, t, o) => {
    o[3] = t < 1.6 ? trace(order[j], t, 1.4, { dim: 0.15 }) : sparkle(j, t, 0.85, 1.25);
    if (figure === arrows && j >= ring) { const s = 1 - 0.06 * smooth(Math.max(0, t - 1.2) / 1.2); o[0] *= s; o[1] *= s; } // the arrows close in a little
  } };
}
