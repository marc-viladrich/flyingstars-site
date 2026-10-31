// Transitions between the motifs of a SPARK show (round 12, Marc: "das formlose Funkeln … wie so eine große breite
// Lichterkette, die an unterschiedlichen Stellen random aufblitzt … wie eine Art Glitter-Rain"). FlyingStars use it
// between pictures: the drones regroup without the next shape showing yet. A geometric figure only appears where it
// means something for the occasion (the fan for culture, the gate for a city festival), and a SPARK show passes
// through at most two transitions per round; more of them, without a link to the story, confused.
import { sampleOutline } from "../show-geometry.js";
import { GOLD, WARM, CYAN, mix, paint, trace, share } from "../show-motion.js";

const arc = (r, a0, a1, cx = 0, cy = 0, k = 40) => ({ pts: Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }), closed: false });
const line = (...pts) => ({ pts, closed: false });

/** A round gate of light: three offset arches on two pillars, revealed from the ground up. */
function gate(n) {
  const [a, p] = share(n, [3, 1]);
  const arches = sampleOutline([arc(1, 0, Math.PI, 0, 0), arc(0.78, 0.08, Math.PI - 0.08, 0, 0.06), arc(0.56, 0.16, Math.PI - 0.16, 0, 0.12)], a);
  const pillars = sampleOutline([line([-1, 0], [-1, -0.95]), line([1, 0], [1, -0.95])], p);
  const pts = [...pillars, ...arches].map(([x, y]) => [x, y, 0]);
  const order = pts.map(([x, y]) => (y + 0.95) / 2.1 + 0.02 * Math.abs(x)); // from the ground up along both sides
  return { pts: paint(pts, (q) => mix(GOLD, WARM, (q[1] + 0.95) / 2)), live: (b, j, t, o) => { o[3] = trace(order[j], t, 1.4); } };
}
/** A fan of seven rays from a common foot, their tips joined by arcs: a stage fan or an Art Deco sunrise. */
function fan(n) {
  const R = 1.05, rays = 7, paths = [];
  for (let i = 0; i < rays; i++) { const a = Math.PI * (0.12 + (0.76 * i) / (rays - 1)); paths.push(line([0, -0.55], [Math.cos(a) * R, -0.55 + Math.sin(a) * R])); }
  paths.push(arc(R, Math.PI * 0.12, Math.PI * 0.88, 0, -0.55, 60), arc(R * 0.55, Math.PI * 0.12, Math.PI * 0.88, 0, -0.55, 40));
  const pts = sampleOutline(paths, n).map(([x, y]) => [x, y, 0]);
  const order = pts.map(([x, y]) => Math.hypot(x, y + 0.55) / R); // from the foot outward
  return { pts: paint(pts, (q) => mix(CYAN, GOLD, Math.hypot(q[0], q[1] + 0.55) / R)), live: (b, j, t, o) => { o[3] = trace(order[j], t, 1.4); } };
}

/** The figure that belongs to an occasion (SPARK only, Marc round 12); every other transition is the living cloud. */
const FIGURE = { kultur: ["Übergang: ein Fächer", fan], festival: ["Übergang: ein Tor aus Licht", gate] };

/**
 * Where a SPARK show puts the occasion's figure (zwölfte Fassung): before the fourth motif, or, in a show of three,
 * before the loop starts again. The figure is entered through the living cloud. Since the thirteenth version this only
 * places the figures; how often the living cloud comes is decided by planClouds() below.
 * Returns [{ before: index among the shown motifs (k = before the loop), figure?: (n) => beat }].
 */
export function transitions(occasion, k, pkg = "SPARK") {
  // vierzehnte Fassung: der Rücksprung zum Anfang läuft immer durch die lebendige Wolke (show-field.js); eine Figur davor
  // ergab zwei Wolken hintereinander, darum steht die Figur nur noch vor dem vierten Motiv, nie vor dem Neustart
  const second = k > 3 ? 3 : null;
  return [1, ...(second !== null ? [second] : [])]
    .filter((before) => before < k)
    .map((before) => {
      const fig = before === second && pkg === "SPARK" ? FIGURE[occasion] : null;
      return { before, ...(fig ? { figure: (n) => ({ ...fig[1](n), caption: fig[0], interlude: true, frame: "interlude", hold: 2 }) } : {}) };
    });
}

/**
 * Dreizehnte Fassung (Marc, 30.10.2026: „alle drei bis vier, höchstens fünf Bilder“, in allen Paketen): where the show
 * passes through the living cloud. Beats that already ask for it stay (a builder's part rebuild inside a story, a
 * figure, the first picture after a dissolved spark cloud). Candidates are the first pictures of the motifs (also the
 * first motif, entered on the loop). Of all choices the one is taken whose gaps around the loop are closest to three
 * to four pictures, never more than five where possible; on a tie, fewer clouds. Marks the chosen beats cloud: true.
 * Returns the indices of all cloud beats.
 */
export function planClouds(beats) {
  const L = beats.length, fixed = [], cand = [];
  // vierzehnte Fassung: das erste Bild wird beim Rücksprung immer durch die Wolke erreicht (show-field.js)
  if (L > 1) beats[0].cloud ||= true;
  beats.forEach((b, k) => {
    if (b.cloud) fixed.push(k);
    else if (L > 1) { const prev = beats[(k - 1 + L) % L]; if (prev.segment !== b.segment && !prev.interlude) cand.push(k); }
  });
  const costOf = (set) => {
    if (!set.length) return Infinity;
    let cost = 0;
    set.forEach((k, i) => { const g = (i + 1 < set.length ? set[i + 1] : set[0] + L) - k; cost += g > 5 ? 100 * (g - 5) : g < 3 ? 10 * (3 - g) : g === 5 ? 1 : 0; });
    return cost;
  };
  let best = null, bestCost = Infinity;
  for (let mask = 0; mask < 1 << cand.length; mask++) {
    const set = [...fixed, ...cand.filter((_, i) => (mask >> i) & 1)].sort((a, b) => a - b), cost = costOf(set);
    if (!set.length) continue;
    // on a tie: fewer clouds, then the first cloud of the round as early as possible (the first view starts at 0)
    const first = (q) => q.find((k) => k > 0) ?? L;
    if (cost < bestCost || (cost === bestCost && (set.length < best.length || (set.length === best.length && first(set) < first(best))))) { best = set; bestCost = cost; }
  }
  for (const k of best ?? []) beats[k].cloud ||= true;
  return best ?? [];
}
