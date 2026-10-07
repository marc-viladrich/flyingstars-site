// Builds the drone pictures of the configurator scenes with exactly the package's drone count, from FlyingStars' own
// sources (3D heart formations, text planner, FlyingStars mark, Bokkenrijders show file) and the pure shapes in
// show-geometry.js. A scene is { pictures: [pts, …], anim }; more than one picture means one transforms into the next.
import logo from "../data/logo-dots.json";
import { heartPicture } from "./heart-formation.js";
import { loadTextEngine, textFormation } from "./text-formation.js";
import { circle, sampleOutline, heartOutline, rings, clock, star, extrude, torusPair, burstSphere, evenSubset } from "./show-geometry.js";

let hearts = null, figure = null;
const loadHearts = () => (hearts ||= import("./pricing-formations.js").then((m) => m.default));
const loadFigure = () => (figure ||= fetch("/media/projekte/bokkenrijders/formation.json").then((r) => { if (!r.ok) throw new Error(`Formation HTTP ${r.status}`); return r.json(); }));

/** Loads the larger formation sources ahead of need, e.g. on the first interaction with the configurator. */
export function preloadScenes() { loadHearts().catch(() => { hearts = null; }); loadFigure().catch(() => { figure = null; }); loadTextEngine().catch(() => {}); }

const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const WARM = [246, 241, 232], GOLD = [255, 196, 92], PINK = [255, 92, 138], VIOLET = [219, 100, 232], CYAN = [51, 237, 242], BLUE = [90, 120, 255];
const mix = (a, b, u) => { const k = Math.max(0, Math.min(1, u)); return a.map((v, i) => Math.round(v + (b[i] - v) * k)); };
const paint = (pts, color) => pts.map((p) => [p[0], p[1], p[2] || 0, ...(typeof color === "function" ? color(p) : color)]);

function stars(n) {
  const rnd = seeded(11);
  return Array.from({ length: n }, () => [(rnd() - 0.5) * 3, (rnd() - 0.5) * 1.6, (rnd() - 0.5) * 0.2, ...(rnd() < 0.2 ? GOLD : WARM)]);
}
function sparks(n) {
  const rnd = seeded(23), rays = 18;
  return Array.from({ length: n }, (_, i) => { const a = ((i % rays) / rays) * 6.283 + (rnd() - 0.5) * 0.08, r = 0.12 + rnd() * 0.88; return [Math.cos(a) * r, Math.sin(a) * r * 0.9, (rnd() - 0.5) * 0.3, ...mix(GOLD, [255, 120, 40], r)]; });
}
function globe(n) {
  const GA = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = GA * i; return [Math.cos(t) * r, y, Math.sin(t) * r, ...mix(CYAN, BLUE, (y + 1) / 2)]; });
}
async function heart3d(n) {
  const pic = heartPicture(await loadHearts(), Math.max(160, n));
  // FlyingStars' own heart formation for this drone count: from 300 drones small hearts join the big one
  return paint(evenSubset(pic.hearts.flatMap((h) => h.pts), n), (p) => mix(PINK, VIOLET, (p[2] + 20) / 40));
}
/** Text with exactly n drones. A text stays at most 80 m high (FlyingStars' rule in the text planner); the drones it
 * cannot use form a ring around it, so the picture still shows the whole package. */
async function words(value, n) {
  await loadTextEngine();
  const r = textFormation(value, n);
  if (!r) return paint(sampleOutline([circle(0, 0, 1, 180)], n), GOLD); // a text the planner rejects still shows the package's drones
  const pts = r.pts.slice(0, n), rest = n - pts.length;
  if (rest <= 0) return paint(pts, WARM);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const radius = 0.62 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return [...paint(pts, WARM), ...paint(sampleOutline([circle(cx, cy, radius, 180)], rest), GOLD)];
}
/** The FlyingStars mark inside a ring of the remaining drones, so every drone of the package is in the picture. */
function logoFramed(n) {
  const mark = logo.dots.map(([x, y, r, g, b]) => [x, y, 0, r, g, b]), rest = Math.max(0, n - mark.length);
  return [...mark, ...paint(sampleOutline([circle(0, 0, 1.45, 180)], rest), GOLD)];
}
function logo3d(n) {
  const depth = 0.35, mark = logo.dots, ringCount = Math.max(0, n - mark.length * 2);
  const layers = [depth, -depth].flatMap((z) => mark.map(([x, y, r, g, b]) => [x, y, z, r, g, b]));
  const ring = sampleOutline([circle(0, 0, 1.45, 180)], ringCount).map(([x, y]) => [x, y, 0, ...GOLD]);
  return [...layers, ...ring];
}

/** Pictures for one scene at the given drone count. */
export async function buildScene(scene, n) {
  switch (scene.kind) {
    case "stars": return { pictures: [stars(n)], anim: "twinkle", fullSize: true }; // a sky stays sky-sized; more drones = denser
    case "sparks": return { pictures: [sparks(n)], anim: "burst" };
    case "heart": return { pictures: [paint(heartOutline(n), PINK)], anim: null };
    case "heartbeat": return { pictures: [paint(heartOutline(n), PINK)], anim: "beat" };
    case "heart3d": return { pictures: [await heart3d(n)], anim: "spin" };
    case "rings": return { pictures: [paint(rings(n), GOLD)], anim: null };
    case "rings3d": return { pictures: [paint(torusPair(n), (p) => mix(GOLD, WARM, (p[2] + 1) / 2))], anim: "spin" };
    case "clock": return { pictures: [paint(clock(n), WARM)], anim: null };
    case "star3d": return { pictures: [paint(extrude(star(n), n, 0.35), GOLD)], anim: "spin" };
    case "globe": return { pictures: [globe(n)], anim: "spin" };
    case "burst3d": return { pictures: [paint(burstSphere(n), (p) => mix(GOLD, VIOLET, Math.hypot(p[0], p[1], p[2])))], anim: "burst3d" };
    case "logo": return { pictures: [logoFramed(n)], anim: null };
    case "logo3d": return { pictures: [paint(burstSphere(n), GOLD), logo3d(n)], anim: "sway", hold: [1.6, 4] };
    case "text": return { pictures: [await words(scene.text, n)], anim: null };
    case "text3d": {
      const front = (await words(scene.text, Math.floor(n / 2))).map((p) => [p[0], p[1], 0]);
      if (!front.length) return { pictures: [globe(n)], anim: "spin" };
      const depth = Math.max(...front.map((p) => Math.abs(p[1]))) * 0.35;
      // the globe it grows out of is drawn at the text's size (text is in metres, the globe in units)
      const span = Math.max(...front.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])))) * 0.8;
      const ball = globe(n).map(([x, y, z, r, g, b]) => [x * span, y * span, z * span, r, g, b]);
      return { pictures: [ball, paint(extrude(front, n, depth), GOLD)], anim: "sway", hold: [1.6, 4] };
    }
    case "morph": return { pictures: await Promise.all(scene.texts.map((t) => words(t, n))), anim: null };
    case "figure": {
      const data = await loadFigure();
      const mx = Math.max(...data.dots.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1]))));
      const pts = data.dots.map(([x, y, r, g, b, , z]) => [x / mx, y / mx, (z ?? 0) / mx, ...(r + g + b === 0 ? [70, 70, 70] : [r, g, b])]);
      return { pictures: [stars(n), evenSubset(pts, n)], anim: "sway", hold: [1.4, 4.2] };
    }
    default: return { pictures: [[]], anim: null };
  }
}
