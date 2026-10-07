// Motif shapes of the show configurator, drawn as line paths the way drone shows draw them, plus 3D bodies built
// from them (extruded outlines, surfaces of revolution). Every builder returns exactly n points [x, y, z]; y is up.
// Pure functions without DOM or randomness, unit-tested in scripts/show-geometry.test.mjs.
import { sampleOutline, circle, evenSubset } from "./show-geometry.js";

const TAU = Math.PI * 2;
const line = (...pts) => ({ pts, closed: false });
const poly = (...pts) => ({ pts, closed: true });
const arc = (cx, cy, r, a0, a1, k = 24) => line(...Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }));
const flat = (pts, z = 0) => pts.map(([x, y]) => [x, y, z]);

/** Splits n over parts by weight, so the total is exact. */
export function share(n, weights) {
  const total = weights.reduce((a, b) => a + b, 0), out = weights.map((w) => Math.floor((n * w) / total));
  for (let i = 0; out.reduce((a, b) => a + b, 0) < n; i = (i + 1) % out.length) out[i]++;
  return out;
}
/** Front and back layer of the same outline: a simple, solid-looking 3D object. */
export function extrudePaths(paths, n, depth) {
  const [front, back] = share(n, [1, 1]);
  return [...flat(sampleOutline(paths, front), depth / 2), ...flat(sampleOutline(paths, back), -depth / 2)];
}
/** Surface of revolution around the y axis from a profile [[radius, y], …]: rings at evenly spaced heights. */
export function lathe(profile, n) {
  const weights = profile.map(([r]) => Math.max(0.15, r)), counts = share(n, weights), out = [];
  profile.forEach(([r, y], i) => { for (let k = 0; k < counts[i]; k++) { const a = (k / counts[i]) * TAU + i * 0.37; out.push([Math.cos(a) * r, y, Math.sin(a) * r]); } });
  return out;
}

// ---------- Hochzeit ----------
/** Kneeling figure holding up a ring, after FlyingStars' own proposal formation. */
export function proposal(n) {
  const paths = [
    circle(-0.25, 0.78, 0.13, 40), // head
    line([-0.25, 0.64], [-0.3, 0.12]), // back
    line([-0.3, 0.12], [-0.05, 0.1], [-0.02, -0.45]), // front leg, knee up
    line([-0.3, 0.12], [-0.55, -0.2], [-0.2, -0.45]), // kneeling leg
    line([-0.26, 0.5], [0.08, 0.55], [0.42, 0.78]), // arm reaching out
    circle(0.5, 0.86, 0.08, 30), // the ring
  ];
  return flat(sampleOutline(paths, n));
}
export const twoRings = (n) => flat(sampleOutline([circle(-0.42, 0, 0.62), circle(0.42, 0, 0.62)], n));

// ---------- Jubiläum ----------
const shieldPath = poly([-0.7, 0.8], [0.7, 0.8], [0.7, 0.1], [0.55, -0.35], [0.28, -0.68], [0, -0.85], [-0.28, -0.68], [-0.55, -0.35], [-0.7, 0.1]);
export const shield = (n) => flat(sampleOutline([shieldPath, line([-0.7, 0.55], [0.7, -0.25])], n));
export const shield3d = (n) => extrudePaths([shieldPath], n, 0.28);
export function crown(n, y = 1.18) {
  const p = poly([-0.45, y], [-0.45, y + 0.22], [-0.3, y + 0.1], [-0.15, y + 0.3], [0, y + 0.12], [0.15, y + 0.3], [0.3, y + 0.1], [0.45, y + 0.22], [0.45, y]);
  return extrudePaths([p], n, 0.16);
}
/** Zeche Zollverein, shaft XII: the double-trestle headframe with its two sheave wheels. */
const headframe = [
  line([-0.85, -0.9], [-0.25, 0.55]), line([0.85, -0.9], [0.25, 0.55]), // the two inclined legs
  line([-0.25, -0.9], [-0.25, 0.55]), line([0.25, -0.9], [0.25, 0.55]), // the shaft tower
  line([-0.62, -0.35], [0.62, -0.35]), line([-0.45, 0.1], [0.45, 0.1]), // cross beams
  line([-0.3, 0.55], [0.3, 0.55]),
  circle(-0.17, 0.72, 0.17, 40), circle(0.17, 0.72, 0.17, 40), // sheave wheels
  line([-0.9, -0.9], [0.9, -0.9]),
];
export const zollverein = (n) => flat(sampleOutline(headframe, n));
export const zollverein3d = (n) => extrudePaths(headframe, n, 0.35);

// ---------- Launch ----------
const rocketProfile = [[0, 0.95], [0.08, 0.82], [0.15, 0.65], [0.19, 0.45], [0.2, 0.2], [0.2, -0.05], [0.2, -0.3], [0.18, -0.5], [0.12, -0.58]];
const rocketOutline = [
  poly(...rocketProfile.map(([r, y]) => [r, y]), ...rocketProfile.slice().reverse().map(([r, y]) => [-r, y])),
  poly([0.2, -0.2], [0.42, -0.55], [0.18, -0.48]), poly([-0.2, -0.2], [-0.42, -0.55], [-0.18, -0.48]),
  circle(0, 0.32, 0.08, 24),
];
export const rocket = (n) => flat(sampleOutline(rocketOutline, n));
/** Wireframe rocket: six profile lines around the axis (the silhouette stays readable), two rings, four fins. */
export function rocket3d(n, lift = 0) {
  const M = 6, [body, ring, fins] = share(n, [6, 1.5, 2]);
  const per = share(body, Array(M).fill(1)), profile = line(...rocketProfile.map(([r, y]) => [r, y]));
  const meridians = per.flatMap((m, k) => { const a = (k / M) * TAU; return sampleOutline([profile], m).map(([r, y]) => [Math.cos(a) * r, y, Math.sin(a) * r]); });
  const rings = lathe([[0.2, 0.2], [0.2, -0.3]], ring);
  const fin = sampleOutline([line([0.2, -0.2], [0.44, -0.58], [0.18, -0.5])], Math.ceil(fins / 4));
  const finPts = [0, 1, 2, 3].flatMap((k) => fin.map(([x, y]) => { const a = (k / 4) * TAU + TAU / 12; return [Math.cos(a) * x, y, Math.sin(a) * x]; })).slice(0, fins);
  return [...meridians, ...rings, ...finPts].map(([x, y, z]) => [x, y + lift, z]);
}
/** Exhaust cloud under a rising rocket: a widening cone of points. */
export function exhaust(n, top) {
  return Array.from({ length: n }, (_, i) => { const u = (i + 0.5) / n, a = i * 2.39996, r = 0.05 + u * 0.45; return [Math.cos(a) * r * Math.sqrt((i % 7) / 7), top - u * 1.1, Math.sin(a) * r * Math.sqrt((i % 5) / 5)]; });
}

// ---------- Kultur ----------
/** Theatre mask: oval face with a slightly pointed chin, brows, curved eyes; comedy smiles, tragedy frowns. */
const mask = (cx, sad) => {
  const face = poly(...Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU, c = Math.cos(a), sn = Math.sin(a); const w = c > 0 ? 0.4 : 0.4 * (1 + c * 0.22); return [cx + sn * w, 0.05 + c * (c > 0 ? 0.46 : 0.56)]; }));
  const eye = (dx) => (sad ? arc(cx + dx, 0.12, 0.08, 0.15, Math.PI - 0.15, 8) : arc(cx + dx, 0.06, 0.08, Math.PI + 0.15, TAU - 0.15, 8));
  const brow = (dx) => line([cx + dx - 0.1, 0.27 + (sad ? -Math.sign(dx) * 0.04 : 0)], [cx + dx + 0.1, 0.27 + (sad ? Math.sign(dx) * 0.04 : 0)]);
  const mouth = sad ? arc(cx, -0.42, 0.17, 0.35, Math.PI - 0.35, 14) : arc(cx, -0.14, 0.2, Math.PI + 0.25, TAU - 0.25, 14);
  return [face, eye(-0.15), eye(0.15), brow(-0.15), brow(0.15), mouth];
};
export const masks = (n) => flat(sampleOutline([...mask(-0.45, false), ...mask(0.45, true)], n));
export const mask3d = (n) => extrudePaths(mask(0, false), n, 0.3);

/** Stage curtain: two drapes under a scalloped valance; open = 0 closed, 1 gathered and tied back at the sides. */
export function curtain(n, open = 0) {
  const top = 0.72, bottom = -0.85;
  const valance = [line([-1.1, 0.88], [1.1, 0.88]), ...Array.from({ length: 6 }, (_, i) => arc(-0.92 + i * 0.367, 0.88, 0.183, Math.PI, TAU, 8))];
  const drapes = [-1, 1].flatMap((side) => {
    const inner = (t) => side * (0.02 + open * (0.8 - Math.sin(Math.PI * Math.min(1, t * 1.6)) * 0.22));
    const edge = line(...Array.from({ length: 16 }, (_, i) => { const t = i / 15; return [inner(t), top - t * (top - bottom)]; }));
    const outer = line([side * 1.05, top], [side * 1.05, bottom]);
    const hem = line(...Array.from({ length: 10 }, (_, i) => { const u = i / 9, x = inner(1) + (side * 1.05 - inner(1)) * u; return [x, bottom + Math.sin(u * Math.PI * 3) * 0.03]; }));
    const folds = [1 / 3, 2 / 3].map((f) => line(...Array.from({ length: 12 }, (_, i) => { const t = i / 11, x0 = inner(t), x = x0 + (side * 1.05 - x0) * f; return [x + Math.sin(t * 5 + f * 3) * 0.025, top - t * (top - bottom)]; })));
    return [edge, outer, hem, ...folds];
  });
  return flat(sampleOutline([...valance, ...drapes], n));
}

// ---------- Silvester ----------
/** Clock rim, ticks and both hands; minutes before twelve as an angle offset. */
export function clockFace(n, minutesToTwelve = 0, depth = 0) {
  const a = (minutesToTwelve / 60) * TAU, ticks = Array.from({ length: 12 }, (_, i) => { const t = (i / 12) * TAU; return line([Math.sin(t) * 0.78, Math.cos(t) * 0.78], [Math.sin(t) * 0.9, Math.cos(t) * 0.9]); });
  const paths = [circle(0, 0, 1, 120), ...ticks, line([0, 0], [-Math.sin(a) * 0.72, Math.cos(a) * 0.72]), line([0, 0], [-Math.sin(a / 12) * 0.48, Math.cos(a / 12) * 0.48])];
  return depth ? extrudePaths(paths, n, depth) : flat(sampleOutline(paths, n));
}
/** 2D firework: rays from the centre. */
export function burst2d(n) {
  const rays = 16;
  return Array.from({ length: n }, (_, i) => { const a = ((i % rays) / rays) * TAU, r = 0.15 + 0.85 * ((Math.floor(i / rays) + 1) / Math.ceil(n / rays)); return [Math.cos(a) * r, Math.sin(a) * r, 0]; });
}
/** Several 3D firework shells side by side, used for ODYSSEY. */
export function bursts3d(n, shells = [[-0.75, 0.15, 0.55], [0.7, 0.35, 0.65], [0, -0.35, 0.5]]) {
  const counts = share(n, shells.map((s) => s[2] ** 2)), GA = Math.PI * (3 - Math.sqrt(5)), out = [];
  shells.forEach(([cx, cy, R], s) => { const m = counts[s], rays = Math.max(8, Math.round(Math.sqrt(m) * 1.4)); for (let i = 0; i < m; i++) { const ray = i % rays, y = 1 - (ray / (rays - 1)) * 2, r = Math.sqrt(1 - y * y), t = GA * ray, along = 0.3 + 0.7 * ((Math.floor(i / rays) + 1) / (Math.ceil(m / rays) + 1)); out.push([cx + Math.cos(t) * r * along * R, cy + y * along * R, Math.sin(t) * r * along * R]); } });
  return out;
}
/** A shell of n points scattered evenly on a sphere: sparkles around an object. */
export function sparkleShell(n, R = 1.25) {
  const GA = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), t = GA * i; return [Math.cos(t) * r * R, y * R * 0.8, Math.sin(t) * r * R]; });
}
export { evenSubset };
