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
export const twoRings = (n) => flat(sampleOutline([circle(-0.42, 0, 0.62), circle(0.42, 0, 0.62)], n));

// ---------- Jubiläum ----------
const shieldPath = poly([-0.7, 0.8], [0.7, 0.8], [0.7, 0.1], [0.55, -0.35], [0.28, -0.68], [0, -0.85], [-0.28, -0.68], [-0.55, -0.35], [-0.7, 0.1]);
export const shield = (n) => flat(sampleOutline([shieldPath, line([-0.7, 0.55], [0.7, -0.25])], n));
export const shield3d = (n) => extrudePaths([shieldPath], n, 0.28);
export function crown(n, y = 1.18) {
  const p = poly([-0.45, y], [-0.45, y + 0.22], [-0.3, y + 0.1], [-0.15, y + 0.3], [0, y + 0.12], [0.15, y + 0.3], [0.3, y + 0.1], [0.45, y + 0.22], [0.45, y]);
  return extrudePaths([p], n, 0.16);
}
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
/** Closed crescent between two arcs over the same chord: eye and mouth shapes of the classic theatre masks. */
function crescent(cx, cy, w, bulge, thickness) {
  const k = 12, pts = [];
  for (let i = 0; i <= k; i++) { const u = i / k; pts.push([cx - w + 2 * w * u, cy + Math.sin(Math.PI * u) * bulge]); }
  for (let i = k; i >= 0; i--) { const u = i / k; pts.push([cx - w + 2 * w * u, cy + Math.sin(Math.PI * u) * (bulge - Math.sign(bulge) * thickness)]); }
  return poly(...pts);
}
/** Rotates 2D paths about (cx, cy). */
const turn2d = (paths, cx, cy, a) => paths.map((path) => ({ ...path, pts: path.pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]) }));
/** The classic theatre mask: wide, slightly arched brow, cheeks narrowing to a rounded chin. */
function maskFace(cx, cy) {
  const right = [[0.47, 0.42], [0.46, 0.2], [0.42, -0.05], [0.35, -0.28], [0.24, -0.47], [0.1, -0.6], [0, -0.63]];
  const brow = Array.from({ length: 9 }, (_, i) => { const u = i / 8; return [-0.47 + 0.94 * u, 0.42 + Math.sin(Math.PI * u) * 0.08]; });
  const pts = [...brow, ...right.slice(1), ...right.slice(0, -1).reverse().map(([x, y]) => [-x, y]).slice(0, -1)];
  return poly(...pts.map(([x, y]) => [cx + x, cy + y]));
}
/** Comedy laughs (arched eyes, wide grin); tragedy weeps (drooping eyes and brows, open frown). */
export function maskPaths(cx, cy, tilt, sad) {
  const face = maskFace(cx, cy);
  const feats = sad
    ? [crescent(cx - 0.17, cy + 0.12, 0.11, -0.06, 0.035), crescent(cx + 0.17, cy + 0.12, 0.11, -0.06, 0.035), line([cx - 0.29, cy + 0.25], [cx - 0.08, cy + 0.32]), line([cx + 0.29, cy + 0.25], [cx + 0.08, cy + 0.32]), crescent(cx, cy - 0.36, 0.2, 0.15, 0.09)]
    : [crescent(cx - 0.17, cy + 0.12, 0.11, 0.08, 0.04), crescent(cx + 0.17, cy + 0.12, 0.11, 0.08, 0.04), crescent(cx, cy - 0.14, 0.27, -0.22, 0.12)];
  return turn2d([face, ...feats], cx, cy, tilt);
}
const inside = (poly2, x, y) => { let c = false; for (let i = 0, j = poly2.length - 1; i < poly2.length; j = i++) { const [xi, yi] = poly2[i], [xj, yj] = poly2[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
export const MASKS = { tragedy: [-0.33, -0.12, -0.28], comedy: [0.3, 0.12, 0.22] };
/** The pair as in the classic icon: tragedy behind on the left, comedy overlapping it on the right; whatever of the
 * tragedy lies behind the comedy stays out of the picture. Returns [tragedy points, comedy points]. */
export function maskPair(n) {
  const [trag, com] = share(n, [1, 1.15]), front = maskPaths(...MASKS.comedy, false);
  const hidden = front[0].pts, back = sampleOutline(maskPaths(...MASKS.tragedy, true), trag * 2).filter(([x, y]) => !inside(hidden, x, y));
  return [flat(evenSubset(back.map(([x, y]) => [x, y, 0]), trag).map(([x, y]) => [x, y])), flat(sampleOutline(front, com))];
}
/** A mask as a 3D body: features on the front, the face rim repeated behind it to show the depth. */
export function mask3d(n, sad = false, cx = 0, cy = 0, tilt = 0, depth = 0.24) {
  const [front, back] = share(n, [3, 1]), paths = maskPaths(cx, cy, tilt, sad);
  return [...flat(sampleOutline(paths, front), depth / 2), ...flat(sampleOutline([paths[0]], back), -depth / 2)];
}
/** The pair in 3D: tragedy further back, comedy in front. Returns [tragedy points, comedy points]. */
export function maskPair3d(n) {
  const [trag, com] = share(n, [1, 1.15]);
  return [mask3d(trag, true, ...MASKS.tragedy).map(([x, y, z]) => [x - 0.08, y, z - 0.25]), mask3d(com, false, ...MASKS.comedy).map(([x, y, z]) => [x + 0.05, y, z + 0.15])];
}

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

// ---------- parts that move on their own ----------
/** One ring as a torus (three strands around the tube). */
export function torusRing(n, R = 1, tube = 0.12) {
  const strands = 3, around = Math.ceil(n / strands);
  return Array.from({ length: n }, (_, i) => { const u = (Math.floor(i / strands) / around) * TAU, v = ((i % strands) / strands) * TAU, r = R + tube * Math.cos(v); return [r * Math.cos(u), r * Math.sin(u), tube * Math.sin(v)]; });
}
/** Clock rim and ticks without hands, as a 3D body. */
export function clockRim(n, depth) {
  const ticks = Array.from({ length: 12 }, (_, i) => { const t = (i / 12) * TAU; return line([Math.sin(t) * 0.78, Math.cos(t) * 0.78], [Math.sin(t) * 0.9, Math.cos(t) * 0.9]); });
  return depth ? extrudePaths([circle(0, 0, 1, 120), ...ticks], n, depth) : flat(sampleOutline([circle(0, 0, 1, 120), ...ticks], n));
}
/** A clock hand pointing at twelve, n drones from the centre outwards; turned by the live motion. */
export const hand = (n, length, z = 0) => Array.from({ length: n }, (_, i) => [0, (length * (i + 0.5)) / n, z]);

// ---------- Berlin: Fernsehturm and Brandenburger Tor ----------
const towerProfile = [[0.09, -0.95], [0.075, -0.4], [0.06, 0.2], [0.13, 0.25], [0.2, 0.33], [0.225, 0.42], [0.2, 0.51], [0.13, 0.59], [0.05, 0.63], [0.035, 0.68]];
export const TOWER_SPHERE = [0, 0.42, 0.225];
/** Berliner Fernsehturm, front view: shaft, sphere with its band, antenna. */
export function tower(n) {
  const shaft = [line([-0.09, -0.95], [-0.06, 0.24]), line([0.09, -0.95], [0.06, 0.24])];
  const paths = [...shaft, circle(0, 0.42, 0.225, 60), line([-0.225, 0.4], [0.225, 0.4]), line([-0.2, 0.47], [0.2, 0.47]), line([-0.05, 0.63], [-0.035, 0.7]), line([0.05, 0.63], [0.035, 0.7]), line([0, 0.7], [0, 1.25]), line([-0.15, -0.95], [0.15, -0.95])];
  return flat(sampleOutline(paths, n));
}
/** The tower as a 3D wireframe: six profile lines, rings around the sphere, the antenna. */
export function tower3d(n) {
  const M = 6, [body, rings, ant] = share(n, [5, 2.4, 1]);
  const per = share(body, Array(M).fill(1)), profile = line(...towerProfile.map(([r, y]) => [r, y]));
  const meridians = per.flatMap((m, k) => { const a = (k / M) * TAU; return sampleOutline([profile], m).map(([r, y]) => [Math.cos(a) * r, y, Math.sin(a) * r]); });
  const lat = lathe([[0.16, 0.3], [0.215, 0.37], [0.225, 0.42], [0.215, 0.47], [0.16, 0.54]], rings);
  const antenna = Array.from({ length: ant }, (_, i) => [0, 0.7 + (0.55 * (i + 0.5)) / ant, 0]);
  return [...meridians, ...lat, ...antenna];
}
/** Radio waves around the sphere: three arcs open towards the ground. */
export const waves = (n) => flat(sampleOutline([0.42, 0.62, 0.82].map((r) => arc(0, 0.42, r, -0.5, Math.PI + 0.5, 30)), n));
/** Brandenburger Tor: six columns, entablature, attic and the quadriga on top. */
export function gatePaths() {
  const cols = [-0.9, -0.56, -0.2, 0.2, 0.56, 0.9].map((x) => line([x, -0.7], [x, 0.18]));
  const quadriga = [arc(-0.18, 0.62, 0.07, 0, Math.PI, 6), arc(-0.06, 0.64, 0.07, 0, Math.PI, 6), arc(0.06, 0.64, 0.07, 0, Math.PI, 6), arc(0.18, 0.62, 0.07, 0, Math.PI, 6), line([0, 0.6], [0, 0.86]), circle(0, 0.9, 0.05, 10)];
  return [line([-1.05, -0.7], [1.05, -0.7]), ...cols, poly([-1.05, 0.18], [1.05, 0.18], [1.05, 0.38], [-1.05, 0.38]), poly([-0.45, 0.38], [0.45, 0.38], [0.45, 0.56], [-0.45, 0.56]), ...quadriga];
}
export const gate3d = (n) => extrudePaths(gatePaths(), n, 0.35);

// ---------- Launch: rocket to the moon ----------
/** The moon: a disc rim and three craters. */
export const moon = (n, cx, cy, r) => flat(sampleOutline([circle(cx, cy, r, 80), circle(cx - r * 0.35, cy + r * 0.25, r * 0.18, 20), circle(cx + r * 0.3, cy - r * 0.15, r * 0.24, 24), circle(cx - r * 0.1, cy - r * 0.5, r * 0.12, 16)], n));

// ---------- Hochzeit: heart with Amor's arrow ----------
/** Amor's arrow from (x0, y0) (head) to (x1, y1) (fletching), as one line of drones with head and feathers. */
export function arrowPaths(x0, y0, x1, y1) {
  const a = Math.atan2(y1 - y0, x1 - x0), c = Math.cos(a), s2 = Math.sin(a), at = (u, v) => [x0 + c * u - s2 * v, y0 + s2 * u + c * v];
  const L = Math.hypot(x1 - x0, y1 - y0);
  return [line(at(0, 0), at(L, 0)), poly(at(0, 0), at(0.14, 0.07), at(0.14, -0.07)), ...[0, 0.08].flatMap((d) => [line(at(L - 0.12 - d, 0), at(L - d, 0.08)), line(at(L - 0.12 - d, 0), at(L - d, -0.08))])];
}
export { inside };
