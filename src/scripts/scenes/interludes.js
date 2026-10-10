// Transitions between the motifs of a SPARK show (round 12, Marc: "das formlose Funkeln … wie so eine große breite
// Lichterkette, die an unterschiedlichen Stellen random aufblitzt … wie eine Art Glitter-Rain"). FlyingStars use it
// between pictures: the drones regroup without the next shape showing yet. A geometric figure only appears where it
// means something for the occasion (the fan for culture, the gate for a city festival), and a SPARK show passes
// through at most two transitions per round; more of them, without a link to the story, confused.
import { sampleOutline } from "../show-geometry.js";
import { GOLD, WARM, CYAN, mix, paint, hash, frac, smooth, trace, sparkle, share } from "../show-motion.js";

const arc = (r, a0, a1, cx = 0, cy = 0, k = 40) => ({ pts: Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }), closed: false });
const line = (...pts) => ({ pts, closed: false });

/**
 * Glitter: a wide, loose band of drones (no shape), dim, where single drones flash up at random places, several at
 * once; after a moment the flashes run downward like glittering rain. The drones drift only a little.
 */
function glitter(n) {
  const cols = Math.ceil(Math.sqrt(n * 3.2)), rows = Math.ceil(n / cols), pts = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const x = -1.45 + 2.9 * ((c + 0.2 + 0.6 * hash(i * 1.7)) / cols);
    const y = 0.42 - 0.84 * ((r + 0.2 + 0.6 * hash(i * 2.9)) / rows) + 0.1 * Math.sin(x * 1.8);
    pts.push([x, y, (hash(i * 4.3) - 0.5) * 0.8]);
  }
  const live = (b, j, t, o) => {
    o[0] += 0.03 * Math.sin(t * 0.6 + hash(j) * 6.3); o[1] += 0.02 * Math.cos(t * 0.5 + hash(j + 3) * 6.3); // a slow drift
    const flash = Math.exp(-(((frac(t * (0.55 + 0.6 * hash(j + 11)) + hash(j * 7)) - 0.5) / 0.035) ** 2)); // random flashes
    const rain = smooth((t - 0.9) / 0.8) * Math.exp(-((((frac((-b[1] + t * 0.9 + hash(Math.round(b[0] * 9)) * 0.6) / 0.55) - 0.5) * 0.55) / 0.05) ** 2));
    o[3] = 0.14 + 1.3 * Math.max(flash, rain * (0.6 + 0.6 * hash(j + 5)));
  };
  return { pts: paint(pts, (p, i) => mix(GOLD, WARM, hash(i * 9.1))), live };
}

/** A round gate of light: three offset arches on two pillars, revealed from the ground up. */
function gate(n) {
  const [a, p] = share(n, [3, 1]);
  const arches = sampleOutline([arc(1, 0, Math.PI, 0, 0), arc(0.78, 0.08, Math.PI - 0.08, 0, 0.06), arc(0.56, 0.16, Math.PI - 0.16, 0, 0.12)], a);
  const pillars = sampleOutline([line([-1, 0], [-1, -0.95]), line([1, 0], [1, -0.95])], p);
  const pts = [...pillars, ...arches].map(([x, y]) => [x, y, 0]);
  const order = pts.map(([x, y]) => (y + 0.95) / 2.1 + 0.02 * Math.abs(x)); // from the ground up along both sides
  return { pts: paint(pts, (q) => mix(GOLD, WARM, (q[1] + 0.95) / 2)), live: (b, j, t, o) => { o[3] = t < 1.6 ? trace(order[j], t, 1.4, { dim: 0.15 }) : sparkle(j, t, 0.85, 1.25); } };
}
/** A fan of seven rays from a common foot, their tips joined by arcs: a stage fan or an Art Deco sunrise. */
function fan(n) {
  const R = 1.05, rays = 7, paths = [];
  for (let i = 0; i < rays; i++) { const a = Math.PI * (0.12 + (0.76 * i) / (rays - 1)); paths.push(line([0, -0.55], [Math.cos(a) * R, -0.55 + Math.sin(a) * R])); }
  paths.push(arc(R, Math.PI * 0.12, Math.PI * 0.88, 0, -0.55, 60), arc(R * 0.55, Math.PI * 0.12, Math.PI * 0.88, 0, -0.55, 40));
  const pts = sampleOutline(paths, n).map(([x, y]) => [x, y, 0]);
  const order = pts.map(([x, y]) => Math.hypot(x, y + 0.55) / R); // from the foot outward
  return { pts: paint(pts, (q) => mix(CYAN, GOLD, Math.hypot(q[0], q[1] + 0.55) / R)), live: (b, j, t, o) => { o[3] = t < 1.6 ? trace(order[j], t, 1.4, { dim: 0.15 }) : sparkle(j, t, 0.85, 1.25); } };
}

const GLITTER = ["Übergang: Funkeln", (n) => ({ ...glitter(n), zoom: 1.55 })]; // a wide band across the sky, wider than a 100-drone picture
/** The figure that belongs to an occasion; occasions without one use the glitter only. */
const FIGURE = { kultur: ["Übergang: ein Fächer", fan], festival: ["Übergang: ein Tor aus Licht", gate] };

/**
 * Where a SPARK show of k motifs passes through a transition: glitter before the second motif, and before the fourth
 * (or, in a show of three, before the loop starts again) the occasion's figure or glitter once more. At most two.
 * Returns [{ before: index among the shown motifs (k = before the loop), build: (n) => beat }].
 */
export function transitions(occasion, k) {
  const second = k >= 4 ? 3 : k === 3 && FIGURE[occasion] ? 3 : null;
  return [[1, GLITTER], ...(second !== null ? [[second, FIGURE[occasion] ?? GLITTER]] : [])]
    .filter(([before]) => before < k || before === k)
    .map(([before, [caption, figure]]) => ({ before, build: (n) => ({ ...figure(n), caption, interlude: true, frame: "interlude", hold: 2 }) }));
}
