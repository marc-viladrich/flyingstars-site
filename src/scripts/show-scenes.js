// Builds the drone pictures of the configurator scenes from FlyingStars' own sources: the heart formations, the text
// planner, the FlyingStars mark and the Bokkenrijders show file. Generated scenes (stars, sparks, ring, globe) use a
// seeded random, so the same scene always looks the same.
import logo from "../data/logo-dots.json";
import { heartPicture } from "./heart-formation.js";
import { loadTextEngine, textFormation } from "./text-formation.js";

let hearts = null, figure = null;
const loadHearts = () => (hearts ||= import("./pricing-formations.js").then((m) => m.default));
const loadFigure = () => (figure ||= fetch("/media/projekte/bokkenrijders/formation.json").then((r) => { if (!r.ok) throw new Error(`Formation HTTP ${r.status}`); return r.json(); }));

/** Loads the larger formation sources ahead of need, e.g. on the first interaction with the configurator. */
export function preloadScenes() { loadHearts().catch(() => {}); loadFigure().catch(() => {}); }

const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const WARM = [246, 241, 232], GOLD = [255, 196, 92], PINK = [255, 92, 138], VIOLET = [219, 100, 232], CYAN = [51, 237, 242];
const mix = (a, b, u) => { const k = Math.max(0, Math.min(1, u)); return a.map((v, i) => Math.round(v + (b[i] - v) * k)); };
/** Evenly spread subset, so a smaller count keeps the whole outline. */
const take = (pts, n) => (pts.length <= n ? pts : Array.from({ length: n }, (_, i) => pts[Math.floor((i * pts.length) / n)]));

function stars(n) {
  const rnd = seeded(11), pts = [];
  for (let i = 0; i < n; i++) { const c = rnd() < 0.2 ? GOLD : WARM; pts.push([(rnd() - 0.5) * 3.2, (rnd() - 0.4) * 1.5, (rnd() - 0.5) * 0.2, ...c]); }
  return { pictures: [pts], anim: "twinkle" };
}
function sparks(n, dark) {
  const rnd = seeded(23), rays = 18, pts = [];
  for (let i = 0; i < n; i++) {
    const ray = i % rays, a = (ray / rays) * 6.283 + (rnd() - 0.5) * 0.08, r = 0.12 + rnd() * 0.88;
    pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.9, (rnd() - 0.5) * 0.3, ...(dark ? mix([255, 70, 70], [120, 20, 30], r) : mix(GOLD, [255, 120, 40], r))]);
  }
  return { pictures: [pts], anim: "burst" };
}
function ring(n) {
  return { pictures: [Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.283; return [Math.cos(a), Math.sin(a), 0, ...GOLD]; })], anim: null };
}
function globe(n) {
  const GA = Math.PI * (3 - Math.sqrt(5));
  const pts = Array.from({ length: n }, (_, i) => { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = GA * i; return [Math.cos(t) * r, y, Math.sin(t) * r, ...mix(CYAN, [90, 120, 255], (y + 1) / 2)]; });
  return { pictures: [pts], anim: "spin" };
}
async function heart(drones, depth) {
  const data = await loadHearts();
  // flat outline up to 140 drones, 3D shell from 160 (same steps as the price calculator)
  const pic = heartPicture(data, depth ? Math.max(160, drones) : Math.min(140, drones));
  const pts = pic.hearts.flatMap((h) => h.pts).map((p) => [p[0], p[1], depth ? p[2] : 0, ...(depth ? mix(PINK, VIOLET, (p[2] + 20) / 40) : PINK)]);
  return pts;
}
async function words(value, drones) {
  await loadTextEngine();
  const r = textFormation(value, drones);
  if (!r) return [];
  return r.pts.map((p) => [p[0], p[1], 0, ...WARM]);
}

/** Pictures for one scene of the configurator at the given drone count. */
export async function buildScene(scene, drones, text) {
  const value = (scene.editable && text ? text : scene.text || "").toUpperCase();
  switch (scene.kind) {
    case "sterne": return stars(Math.min(drones, 220));
    case "funken": return sparks(Math.min(drones, 260), scene.id === "unheil");
    case "ring": return ring(Math.min(drones, 120));
    case "kugel": return globe(Math.min(drones, 420));
    case "herz": return { pictures: [await heart(drones, false)], anim: null };
    case "herzschlag": return { pictures: [await heart(drones, false)], anim: "beat" };
    case "herz3d": return { pictures: [await heart(drones, true)], anim: "spin" };
    case "logo": return { pictures: [logo.dots.map(([x, y, r, g, b]) => [x, y, 0, r, g, b])], anim: null };
    case "figur3d": {
      const data = await loadFigure();
      const mx = Math.max(...data.dots.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1]))));
      const pts = data.dots.map(([x, y, r, g, b, , z]) => [x / mx, y / mx, (z ?? 0) / mx, ...(r + g + b === 0 ? [70, 70, 70] : [r, g, b])]);
      return { pictures: [take(pts, Math.max(300, drones))], anim: "sway" };
    }
    case "text": return { pictures: [await words(value, drones)], anim: null };
    case "verwandlung": return { pictures: [await words(scene.text, drones), await words(scene.to, drones)], anim: null };
    default: return { pictures: [[]], anim: null };
  }
}
