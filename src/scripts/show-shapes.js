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
/** A crest in the spirit of club and city crests (own design, no club's): a shield with a raised middle at the top,
 * a field with a river, a field with a flag and a lower field with a star (or, from HORIZON on, your number). */
const shieldPath = poly([-0.72, 0.72], [-0.36, 0.78], [0, 0.92], [0.36, 0.78], [0.72, 0.72], [0.72, 0.12], [0.6, -0.3], [0.36, -0.62], [0, -0.88], [-0.36, -0.62], [-0.6, -0.3], [-0.72, 0.12]);
const wave = (y) => line(...Array.from({ length: 13 }, (_, i) => { const x = -0.6 + i * 0.04; return [x, y + Math.sin(i * 1.05) * 0.035]; }));
const crestFields = [
  line([-0.72, 0.28], [0.72, 0.28]), line([0, 0.28], [0, 0.88]), // the band and the upper division
  wave(0.44), wave(0.6), // left field: a river in two waves
  line([0.2, 0.34], [0.2, 0.78]), poly([0.2, 0.78], [0.56, 0.68], [0.2, 0.58]), // right field: a flag on its pole
];
const crestStar = { pts: Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU, r = i % 2 ? 0.11 : 0.26; return [Math.sin(a) * r, -0.22 + Math.cos(a) * r]; }), closed: true };
export const shield = (n) => flat(sampleOutline([shieldPath, ...crestFields, crestStar], n));
export const shield3d = (n) => extrudePaths([shieldPath, ...crestFields], n, 0.28);
/** Where the number sits in the crest's lower field, and which drones form the flag (they wave in the wind). */
export const CREST_NUMBER = { cx: 0, cy: -0.25, halfWidth: 0.34 };
export const inCrestFlag = (x, y) => x > 0.22 && y > 0.56 && y < 0.8;
/** The crest's star, extruded like the crest, as its own part. */
export const crestStar3d = (n) => extrudePaths([crestStar], n, 0.28);
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
/** A small flame under the nozzle (top): a narrow teardrop of points, 3D if depth. */
export function flame(n, top, depth = 0) {
  return Array.from({ length: n }, (_, i) => { const u = (i + 0.5) / n, a = i * 2.39996, w = 0.11 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7 * Math.sqrt(((i * 7) % 10) / 10 + 0.1); return [Math.cos(a) * w, top - u * 0.42, depth ? Math.sin(a) * w : 0]; });
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
function curtainPaths(open) {
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
  return [...valance, ...drapes];
}
const pathLength = ({ pts, closed = true }) => pts.slice(0, closed ? pts.length : -1).reduce((s, a, i) => { const b = pts[(i + 1) % pts.length]; return s + Math.hypot(b[0] - a[0], b[1] - a[1]); }, 0);
/** Stage curtain, open ∈ [0, 1]. Every path keeps its drones for every opening, so drone j moves smoothly while the
 * curtain opens: the drapes gather to the sides like cloth instead of drones jumping between lines. */
export function curtain(n, open = 0) {
  const counts = share(n, curtainPaths(0.5).map(pathLength));
  return curtainPaths(open).flatMap((p, i) => flat(sampleOutline([p], counts[i])));
}

// ---------- Silvester ----------
/** Clock rim, ticks and both hands; minutes before twelve as an angle offset. */
export function clockFace(n, minutesToTwelve = 0, depth = 0) {
  const a = (minutesToTwelve / 60) * TAU, ticks = Array.from({ length: 12 }, (_, i) => { const t = (i / 12) * TAU; return line([Math.sin(t) * 0.78, Math.cos(t) * 0.78], [Math.sin(t) * 0.9, Math.cos(t) * 0.9]); });
  const paths = [circle(0, 0, 1, 120), ...ticks, line([0, 0], [-Math.sin(a) * 0.72, Math.cos(a) * 0.72]), line([0, 0], [-Math.sin(a / 12) * 0.48, Math.cos(a / 12) * 0.48])];
  return depth ? extrudePaths(paths, n, depth) : flat(sampleOutline(paths, n));
}
/** Clock dial without hands: rim and twelve ticks. */
export const clockDial = (n) => { const ticks = Array.from({ length: 12 }, (_, i) => { const t = (i / 12) * TAU; return line([Math.sin(t) * 0.78, Math.cos(t) * 0.78], [Math.sin(t) * 0.9, Math.cos(t) * 0.9]); }); return flat(sampleOutline([circle(0, 0, 1, 120), ...ticks], n)); };
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

// ---------- Silvester: champagne ----------
const bottleProfile = [[0.17, -0.62], [0.18, -0.55], [0.18, 0.08], [0.15, 0.2], [0.08, 0.3], [0.055, 0.38], [0.055, 0.52], [0.065, 0.56]];
/** Champagne bottle as a 3D wireframe (six profile lines, two rings), standing upright, neck top at y ≈ 0.56. */
export function bottle3d(n) {
  const M = 6, [body, rings] = share(n, [5, 1.4]), per = share(body, Array(M).fill(1)), profile = line(...bottleProfile.map(([r, y]) => [r, y]));
  const meridians = per.flatMap((m, k) => { const a = (k / M) * TAU; return sampleOutline([profile], m).map(([r, y]) => [Math.cos(a) * r, y, Math.sin(a) * r]); });
  return [...meridians, ...lathe([[0.18, -0.35], [0.18, 0.02], [0.06, 0.45]], rings)];
}
/** The cork: a small mushroom shape around its centre. */
export const cork = (n) => lathe([[0.04, -0.05], [0.05, 0.0], [0.07, 0.04], [0.05, 0.08]], n);

// ---------- Hochzeit: hand, engagement ring, flutes ----------
/** One finger as an open outline (right side up, round tip, left side down), base centre (cx, cy), tilt a. */
function finger(cx, cy, w, len, a) {
  const d = [Math.sin(a), Math.cos(a)], nrm = [Math.cos(a), -Math.sin(a)], h = w / 2, top = [cx + d[0] * (len - h), cy + d[1] * (len - h)];
  const pts = [[cx + nrm[0] * h, cy + nrm[1] * h], [top[0] + nrm[0] * h, top[1] + nrm[1] * h]];
  for (let i = 1; i < 12; i++) { const u = (i / 12) * Math.PI, c = Math.cos(u), s = Math.sin(u); pts.push([top[0] + (nrm[0] * c + d[0] * s) * h, top[1] + (nrm[1] * c + d[1] * s) * h]); }
  pts.push([top[0] - nrm[0] * h, top[1] - nrm[1] * h], [cx - nrm[0] * h, cy - nrm[1] * h]);
  return pts;
}
/** Fingers of the hand: [base x, width, length, tilt]; index, middle, ring, little finger from the left. */
export const FINGERS = [[-0.33, 0.19, 0.62, -0.1], [-0.11, 0.2, 0.74, -0.03], [0.11, 0.19, 0.68, 0.04], [0.31, 0.16, 0.52, 0.13]];
const FINGER_BASE = 0.05;
/** A raised open hand, palm towards the audience, thumb on the left: one outline from the wrist around to the wrist. */
export function handPath() {
  const pts = [[0.3, -0.95], [0.38, -0.6], [0.41, -0.25], [0.4, -0.02]];
  for (let k = FINGERS.length - 1; k >= 0; k--) { const [x, w, len, a] = FINGERS[k]; pts.push(...finger(x, FINGER_BASE, w, len, a)); }
  pts.push([-0.43, 0.0], [-0.44, -0.16]);
  // the thumb, pointing up and out to the left: out along its inner side, back along its outer side
  pts.push(...finger(-0.53, -0.44, 0.21, 0.5, -0.8), [-0.44, -0.66], [-0.34, -0.82], [-0.3, -0.95]);
  return line(...pts);
}
/** Where the ring sits on the ring finger: centre, finger direction and half width. */
export function ringSeat(up = 0.2) { const [x, w, , a] = FINGERS[2]; return { c: [x + Math.sin(a) * up, FINGER_BASE + Math.cos(a) * up], d: [Math.sin(a), Math.cos(a)], h: w / 2 }; }
export const hand3d = (n) => extrudePaths([handPath()], n, 0.16);
export const hand2d = (n) => flat(sampleOutline([handPath()], n));
/** Engagement ring: a band (circle in the picture plane, radius R) and a stone on top; returns [band, stone]. */
export function engagementRing(n, R = 0.5) {
  const [band, stone] = share(n, [4, 1]), out = [];
  for (let i = 0; i < band; i++) { const a = (i / band) * TAU, layer = i % 2 ? 0.045 : -0.045; out.push([Math.sin(a) * R, Math.cos(a) * R, layer]); }
  // the stone: a small brilliant sitting on the band, front and back layer
  const k = R / 0.5, gem = poly([0, R + 0.02 * k], [0.12 * k, R + 0.13 * k], [0.07 * k, R + 0.2 * k], [-0.07 * k, R + 0.2 * k], [-0.12 * k, R + 0.13 * k]);
  const [front, back] = share(stone, [1, 1]);
  out.push(...flat(sampleOutline([gem], front), 0.05 * k), ...flat(sampleOutline([gem], back), -0.05 * k));
  return [out.slice(0, band), out.slice(band)];
}
const fluteProfile = [[0.22, -0.8], [0.04, -0.76], [0.025, -0.68], [0.025, -0.28], [0.1, -0.22], [0.15, 0.0], [0.165, 0.3], [0.16, 0.55]];
/** Champagne flute outline (2D), foot at y = −0.8, rim at y = 0.55. */
export const flutePath = () => line(...fluteProfile.slice().reverse().map(([r, y]) => [-r, y]), ...fluteProfile.map(([r, y]) => [r, y]));
export const flute2d = (n) => flat(sampleOutline([flutePath()], n));
/** Champagne flute as a wireframe (six profile lines and the rim). */
export function flute3d(n) {
  const M = 6, [body, rim] = share(n, [5, 1]), per = share(body, Array(M).fill(1)), profile = line(...fluteProfile.map(([r, y]) => [r, y]));
  const meridians = per.flatMap((m, k) => { const a = (k / M) * TAU; return sampleOutline([profile], m).map(([r, y]) => [Math.cos(a) * r, y, Math.sin(a) * r]); });
  return [...meridians, ...lathe([[0.16, 0.55]], rim)];
}
/** Bubbles inside a flute: columns of points in the bowl (the light rises along them). */
export const bubbles = (n) => Array.from({ length: n }, (_, i) => { const c = i % 3, k = Math.floor(i / 3), per = Math.ceil((n - c) / 3); return [(c - 1) * 0.06, -0.18 + (0.68 * (k + 0.5)) / per, (c - 1) * 0.03]; });

// ---------- Jubiläum: trophy ----------
const trophyProfile = [[0.32, -0.92], [0.3, -0.82], [0.1, -0.76], [0.06, -0.5], [0.12, -0.42], [0.07, -0.32], [0.18, -0.2], [0.34, 0.05], [0.42, 0.35], [0.45, 0.62]];
const trophyHandles = [1, -1].map((s) => line([s * 0.43, 0.52], [s * 0.62, 0.55], [s * 0.7, 0.42], [s * 0.64, 0.24], [s * 0.48, 0.12], [s * 0.36, 0.06]));
export const trophyPath = () => line(...trophyProfile.slice().reverse().map(([r, y]) => [-r, y]), ...trophyProfile.map(([r, y]) => [r, y]));
export const trophy2d = (n) => flat(sampleOutline([trophyPath(), ...trophyHandles, line([-0.45, 0.62], [0.45, 0.62])], n));
/** Trophy as a wireframe (eight profile lines, rim ring) with both handles; upTo cuts it at a height (it grows). */
export function trophy3d(n, upTo = 1) {
  const M = 8, [body, rim, handles] = share(n, [6, 1.2, 1.4]), per = share(body, Array(M).fill(1)), prof = trophyProfile.filter(([, y]) => y <= upTo - 0.38 || upTo >= 1);
  const profile = line(...prof.map(([r, y]) => [r, y]));
  const meridians = per.flatMap((m, k) => { const a = (k / M) * TAU + 0.2; return sampleOutline([profile], m).map(([r, y]) => [Math.cos(a) * r, y, Math.sin(a) * r]); });
  const top = prof[prof.length - 1];
  return [...meridians, ...lathe([[top[0], top[1]]], rim), ...flat(sampleOutline(upTo >= 1 ? trophyHandles : [line([-0.3, -0.85], [0.3, -0.85])], handles))];
}

// ---------- Launch: light bulb ----------
const bulbProfile = [[0.12, -0.82], [0.13, -0.6], [0.15, -0.45], [0.3, -0.18], [0.42, 0.12], [0.45, 0.36], [0.38, 0.6], [0.22, 0.76], [0.0, 0.81]];
export const bulbPath = () => line(...bulbProfile.slice().reverse().map(([r, y]) => [-r, y]), ...bulbProfile.map(([r, y]) => [r, y]));
const thread = line(...Array.from({ length: 9 }, (_, i) => [i % 2 ? 0.13 : -0.13, -0.8 + i * 0.04]));
/** The filament: two posts and a zigzag coil, in the middle of the bulb. */
export const filamentPath = () => line([-0.08, -0.42], [-0.08, 0.02], ...Array.from({ length: 7 }, (_, i) => [-0.08 + (i * 0.16) / 6, i % 2 ? 0.1 : 0.02]), [0.08, -0.42]);
export const bulb2d = (n) => { const [g, f] = share(n, [4, 1.2]); return [...flat(sampleOutline([bulbPath(), thread], g)), ...flat(sampleOutline([filamentPath()], f))]; };
/** Bulb as a wireframe (six profile lines) plus the filament; returns [glass, filament]. */
export function bulb3d(n) {
  const [g, f] = share(n, [4, 1]), M = 6, per = share(g, Array(M).fill(1)), profile = line(...bulbProfile.map(([r, y]) => [r, y]));
  const glass = per.flatMap((m, k) => { const a = (k / M) * TAU; return sampleOutline([profile], m).map(([r, y]) => [Math.cos(a) * r, y, Math.sin(a) * r]); });
  return [glass, flat(sampleOutline([filamentPath()], f))];
}

// ---------- Kultur: notes ----------
const head = (cx, cy) => ({ pts: Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * TAU, x = Math.cos(a) * 0.15, y = Math.sin(a) * 0.1; return [cx + x * 0.94 - y * 0.34, cy + x * 0.34 + y * 0.94]; }) });
/** Two beamed eighth notes (♫). */
export const notePaths = () => [head(-0.32, -0.5), head(0.38, -0.3), line([-0.18, -0.46], [-0.18, 0.5]), line([0.52, -0.26], [0.52, 0.7]), line([-0.18, 0.5], [0.52, 0.7]), line([-0.18, 0.38], [0.52, 0.58])];
/** One eighth note (♪) with its flag. */
export const notePath1 = () => [head(-0.05, -0.45), line([0.09, -0.41], [0.09, 0.6]), line([0.09, 0.6], [0.2, 0.45], [0.32, 0.3], [0.3, 0.12])];
export const notes2d = (n) => flat(sampleOutline(notePaths(), n));
export const notes3d = (n) => extrudePaths(notePaths(), n, 0.2);

// ---------- Silvester: four-leaf clover ----------
const leaf = (rot) => { const pts = Array.from({ length: 60 }, (_, i) => { const t = (i / 60) * TAU, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); return [x / 40, (y + 17) / 40]; }); return { pts: pts.map(([x, y]) => [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)]) }; };
/** Leaves of the clover (heart-shaped, tips in the middle) and the stem, as separate paths. */
export const cloverLeaves = (k = 4) => Array.from({ length: k }, (_, i) => leaf((i * TAU) / k));
/** The stem, leaving the middle in direction a (radians) with a slight bend. */
export const cloverStem = (a = -Math.PI / 4) => line(...Array.from({ length: 5 }, (_, i) => { const r = 0.05 + i * 0.22, b = a - 0.15 * (i / 4); return [Math.cos(b) * r, Math.sin(b) * r]; }));
export const clover2d = (n) => flat(sampleOutline([...cloverLeaves(), cloverStem()], n));
export const clover3d = (n, k = 4) => extrudePaths([...cloverLeaves(k), cloverStem(k === 4 ? -Math.PI / 4 : -Math.PI / 2)], n, 0.18);
/** A short melody: five staff lines and five notes (head and stem); returns { staff, notes: [pts per note] }. */
export function melody(n) {
  const [st, nt] = share(n, [2, 3]), per = share(nt, Array(5).fill(1)), ys = [-0.5, -0.2, 0.1, -0.1, 0.2];
  const staff = flat(sampleOutline([0, 1, 2, 3, 4].map((k) => line([-1.3, -0.5 + k * 0.2], [1.3, -0.5 + k * 0.2])), st));
  const notes = ys.map((y, k) => { const x = -1.0 + k * 0.5; return flat(sampleOutline([head(x, y), line([x + 0.14, y + 0.05], [x + 0.14, y + 0.62])], per[k])); });
  return { staff, notes };
}
export const MELODY_X = [-1.0, -0.5, 0, 0.5, 1.0];
/** Only the glass of the bulb (six profile lines). */
export function bulbGlass(n) { const M = 6, per = share(n, Array(M).fill(1)), profile = line(...bulbProfile.map(([r, y]) => [r, y])); return per.flatMap((m, k) => { const a = (k / M) * TAU; return sampleOutline([profile], m).map(([r, y]) => [Math.cos(a) * r, y, Math.sin(a) * r]); }); }
export const filament = (n) => flat(sampleOutline([filamentPath()], n));
