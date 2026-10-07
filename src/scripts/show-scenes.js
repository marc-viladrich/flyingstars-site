// Builds every motif version of the configurator with exactly the package's drone count. Sources: FlyingStars' own
// heart formations, the FlyingStars mark, the real Bokkenrijders show file, the text planner and the shapes in
// show-shapes.js. A scene is { pictures: [pts, …], anim, hold }; several pictures play once, one into the next.
// anim "turn": a 3D object turns once around its own axis after it has formed, then rests.
import logo from "../data/logo-dots.json";
import { heartPicture } from "./heart-formation.js";
import { loadTextEngine, textFormation } from "./text-formation.js";
import { torusPair, burstSphere, star, extrude, evenSubset, sampleOutline, circle } from "./show-geometry.js";
import { share, proposal, twoRings, shield, shield3d, crown, zollverein, zollverein3d, rocket, rocket3d, exhaust, masks, mask3d, curtain, clockFace, burst2d, bursts3d, sparkleShell } from "./show-shapes.js";

let hearts = null, figure = null;
const loadHearts = () => (hearts ||= import("./pricing-formations.js").then((m) => m.default).catch((e) => { hearts = null; throw e; }));
const loadFigure = () => (figure ||= fetch("/media/projekte/bokkenrijders/formation.json").then((r) => { if (!r.ok) throw new Error(`Formation HTTP ${r.status}`); return r.json(); }).catch((e) => { figure = null; throw e; }));

/** Loads the larger formation sources ahead of need, e.g. on the first interaction with the configurator. */
export function preloadScenes() { loadHearts().catch(() => {}); loadFigure().catch(() => {}); loadTextEngine().catch(() => {}); }

const WARM = [246, 241, 232], GOLD = [255, 196, 92], PINK = [255, 92, 138], VIOLET = [219, 100, 232], CYAN = [51, 237, 242], BLUE = [90, 120, 255], ORANGE = [255, 140, 50];
const mix = (a, b, u) => { const k = Math.max(0, Math.min(1, u)); return a.map((v, i) => Math.round(v + (b[i] - v) * k)); };
const paint = (pts, color) => pts.map((p) => [p[0], p[1], p[2] || 0, ...(typeof color === "function" ? color(p) : color)]);
const still = (pts) => pts.map((p) => [...p.slice(0, 6), 0]); // these drones stay put while the object turns
const scale = (pts, s, dx = 0, dy = 0, dz = 0) => pts.map(([x, y, z, ...c]) => [x * s + dx, y * s + dy, (z || 0) * s + dz, ...c]);

async function heartsAt(n, depth) {
  const pic = heartPicture(await loadHearts(), n);
  const pts = pic.hearts.flatMap((h) => h.pts).map(([x, y, z]) => [x / 30, y / 30, depth ? z / 30 : 0]);
  return paint(evenSubset(pts, n), (p) => (depth ? mix(PINK, VIOLET, (p[2] + 0.6) / 1.2) : PINK));
}
/** Text points fitted into a box of the given half-width, centred on (cx, cy). */
async function textIn(value, n, halfWidth, cx = 0, cy = 0, z = 0) {
  await loadTextEngine();
  const r = textFormation(value, n);
  if (!r) return paint(sampleOutline([circle(cx, cy, halfWidth * 0.6, 120)], n).map(([x, y]) => [x, y, z]), GOLD);
  const pts = r.pts.slice(0, n), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2, k = (halfWidth * 2) / w;
  const out = pts.map(([x, y]) => [(x - mx) * k + cx, (y - my) * k + cy, z]);
  return paint(out.concat(sampleOutline([circle(cx, cy, halfWidth * 1.15, 120)], n - out.length).map(([x, y]) => [x, y, z])), GOLD);
}
const mark = (z = 0) => logo.dots.map(([x, y, r, g, b]) => [x, y, z, r, g, b]);
function logoFramed(n) { return [...mark(), ...paint(sampleOutline([circle(0, 0, 1.45, 180)], n - logo.dots.length), GOLD)]; }
function logo3d(n) {
  const layers = [...mark(0.22), ...mark(-0.22)], rest = n - layers.length;
  return [...layers, ...paint(sampleOutline([circle(0, 0, 1.45, 180)], rest), GOLD)];
}
async function devil(n) {
  const data = await loadFigure(), mx = Math.max(...data.dots.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1]))));
  return evenSubset(data.dots.map(([x, y, r, g, b, , z]) => [x / mx, y / mx, (z ?? 0) / mx, ...(r + g + b === 0 ? [70, 70, 70] : [r, g, b])]), n);
}
const star3d = (n, s = 0.5, dy = 0) => scale(paint(extrude(star(n), n, 0.35), GOLD), s, 0, dy);

/** Pictures for one motif version at the given drone count. */
export async function buildScene(version, n) {
  switch (version.build) {
    case "heart2d": return { pictures: [await heartsAt(n, false)] };
    case "heart3d": return { pictures: [await heartsAt(n, true)], anim: "turn" };
    case "hearts3d": return { pictures: [await heartsAt(n, true)], anim: "turn" };
    case "proposal": return { pictures: [paint(proposal(n), WARM), paint(twoRings(n), GOLD)], hold: [2.6] };
    case "rings3d": return { pictures: [paint(torusPair(n), (p) => mix(GOLD, WARM, (p[2] + 1) / 2))], anim: "turn" };
    case "rings3dSparkle": { const [r, s] = share(n, [3, 1]); return { pictures: [[...paint(torusPair(r), (p) => mix(GOLD, WARM, (p[2] + 1) / 2)), ...paint(sparkleShell(s, 2.1), WARM)]], anim: "turn" }; }
    case "shield": return { pictures: [paint(shield(n), WARM)] };
    case "shield3d": { const [a, b] = share(n, [3, 1]); return { pictures: [[...paint(shield3d(a), WARM), ...(await textIn("125", b, 0.38, 0, 0.05, 0.16))]], anim: "turn" }; }
    case "shieldCrown": { const [a, b, c, d] = share(n, [5, 2, 2, 2]); return { pictures: [[...paint(shield3d(a), WARM), ...(await textIn("125", b, 0.38, 0, 0.05, 0.16)), ...paint(crown(c), GOLD), ...scale(paint(sparkleShell(d, 1), GOLD), 1.5, 0, 0.1)]], anim: "turn" }; }
    case "zollverein": return { pictures: [paint(zollverein(n), WARM)] };
    case "zollverein3d": return { pictures: [paint(zollverein3d(n), WARM)], anim: "turn" };
    case "zollvereinSparks": { const [a, b] = share(n, [3, 1]); return { pictures: [[...paint(zollverein3d(a), WARM), ...scale(paint(sparkleShell(b, 1), (p) => mix(GOLD, ORANGE, p[1] + 0.5)), 0.6, 0, 1.25)]], anim: "turn" }; }
    case "rocket": return { pictures: [paint(rocket(n), WARM)] };
    case "rocket3d": return { pictures: [paint(rocket3d(n), (p) => mix(WARM, CYAN, (p[2] + 0.2) / 0.4))], anim: "turn" };
    case "rocketLaunch": { const [a, b] = share(n, [3, 1]); return { pictures: [paint(rocket3d(n), WARM), [...paint(rocket3d(a, 0.55), WARM), ...paint(exhaust(b, -0.05), (p) => mix(GOLD, ORANGE, -p[1]))]], hold: [2.2], anim: "turn" }; }
    case "logo": return { pictures: [logoFramed(n)] };
    case "logo3d": return { pictures: [logo3d(n)], anim: "turn" };
    case "logoFromSparks": return { pictures: [paint(burstSphere(n), GOLD), logo3d(n)], hold: [1.8], anim: "turn" };
    case "masks": return { pictures: [paint(masks(n), WARM)] };
    case "mask3d": return { pictures: [paint(mask3d(n), WARM)], anim: "turn" };
    case "devil": return { pictures: [paint(sparkleShell(n, 1.2), WARM), await devil(n)], hold: [1.8], anim: "turn" };
    case "curtain": return { pictures: [paint(curtain(n, 0), [220, 60, 70])] };
    case "curtainStar": { const [a, b] = share(n, [2, 1]); return { pictures: [paint(curtain(n, 0), [220, 60, 70]), [...still(paint(curtain(a, 1), [220, 60, 70])), ...star3d(b)]], hold: [2], anim: "turn" }; }
    case "curtainShower": { const [a, b] = share(n, [2, 1]); return { pictures: [paint(curtain(n, 0), [220, 60, 70]), [...still(paint(curtain(a, 1), [220, 60, 70])), ...scale(paint(bursts3d(b, [[-0.25, 0.2, 0.5], [0.3, -0.1, 0.4]]), GOLD), 1, 0, 0)]], hold: [2], anim: "turn" }; }
    case "burst2d": return { pictures: [paint(burst2d(n), (p) => mix(GOLD, ORANGE, Math.hypot(p[0], p[1])))] };
    case "burst3d": return { pictures: [paint(burstSphere(n), (p) => mix(GOLD, VIOLET, Math.hypot(p[0], p[1], p[2])))], anim: "turn" };
    case "bursts3d": return { pictures: [paint(bursts3d(n), (p) => (p[0] < -0.3 ? mix(GOLD, ORANGE, p[2] + 0.5) : p[0] > 0.3 ? mix(VIOLET, PINK, p[2] + 0.5) : mix(CYAN, BLUE, p[2] + 0.5)))], anim: "turn" };
    case "clock": return { pictures: [paint(clockFace(n, 6), WARM), paint(clockFace(n, 0), WARM)], hold: [2.4] };
    case "clock3d": return { pictures: [paint(clockFace(n, 6, 0.3), WARM), paint(clockFace(n, 0, 0.3), WARM)], hold: [2.4], anim: "turn" };
    case "clockBurst": return { pictures: [paint(clockFace(n, 0, 0.3), WARM), paint(bursts3d(n), (p) => (p[0] < -0.3 ? GOLD : p[0] > 0.3 ? VIOLET : CYAN))], hold: [2.2], anim: "turn" };
    default: return { pictures: [[]] };
  }
}
