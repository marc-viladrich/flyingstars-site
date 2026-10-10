// Shared motion and light vocabulary of the show configurator. Motif builders (show-scenes.js and the occasion modules
// in src/scripts/scenes/) describe a picture as points and a live(base, j, t, out) function; everything here writes
// into out = [x, y, z, alpha] and stays within what real show drones can do: smooth motion with bounded speed and
// acceleration (tests/show-physics.spec.ts), effects made with light on drones that stay in place.
// Calibrated on FlyingStars' own shows (freelance/clients/flyingstars/06-show-animationen-2026-10, rounds 1 and 2).

import { share } from "./show-shapes.js";

export { share };
export const TAU = Math.PI * 2;
export const DIAMOND = [200, 235, 255], GREEN = [90, 222, 120];
export const WARM = [246, 241, 232], GOLD = [255, 196, 92], PINK = [255, 92, 138], VIOLET = [219, 100, 232], CYAN = [51, 237, 242], BLUE = [90, 120, 255], ORANGE = [255, 140, 50], RED = [220, 60, 70], MOON = [235, 232, 210];
export const mix = (a, b, u) => { const k = Math.max(0, Math.min(1, u)); return a.map((v, i) => Math.round(v + (b[i] - v) * k)); };
export const paint = (pts, color) => pts.map((p, i) => [p[0], p[1], p[2] || 0, ...(typeof color === "function" ? color(p, i) : color)]);
export const place = (pts, s, dx = 0, dy = 0, dz = 0, a = 0) => pts.map(([x, y, z = 0, ...c]) => [(x * Math.cos(a) - y * Math.sin(a)) * s + dx, (x * Math.sin(a) + y * Math.cos(a)) * s + dy, z * s + dz, ...c]);
export const frac = (x) => x - Math.floor(x);
export const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const hash = (j) => frac(Math.sin(j * 12.9898) * 43758.5453);

// ---------- motion ----------
/** Turn about the vertical axis through (cx, cz). */
export function yaw(out, a, cx = 0, cz = 0) { const x = out[0] - cx, z = out[2] - cz, c = Math.cos(a), s = Math.sin(a); out[0] = cx + x * c + z * s; out[2] = cz - x * s + z * c; }
/** Turn in the picture plane about (cx, cy). */
export function roll(out, a, cx = 0, cy = 0) { const x = out[0] - cx, y = out[1] - cy, c = Math.cos(a), s = Math.sin(a); out[0] = cx + x * c - y * s; out[1] = cy + x * s + y * c; }
/** Turn about the horizontal axis through (cy, cz): tips the object towards or away from the audience. */
export function pitch(out, a, cy = 0, cz = 0) { const y = out[1] - cy, z = out[2] - cz, c = Math.cos(a), s = Math.sin(a); out[1] = cy + y * c - z * s; out[2] = cz + y * s + z * c; }
/** Slow sway: the object turns a little to each side, which shows its depth. */
export const sway = (out, t, amp = 0.3, period = 10) => yaw(out, Math.sin((t * TAU) / period) * amp);
/** Ease in and out between two poses over a cycle: 0 → 1 → 0, resting a moment at each end (for kicks, waves). */
export const swing = (t, period, rest = 0.3) => {
  const u = frac(t / period), k = (1 - rest) / 2, h = rest / 2;
  return u < k ? smooth(u / k) : u < k + h ? 1 : u < 2 * k + h ? 1 - smooth((u - k - h) / k) : 0;
};

// ---------- light (drones stay in place) ----------
// Light effects brighten or rest near full light (Marc, round 8): above 1 a drone's glow grows and its core whitens.
/** Calm breathing light, never below 0.9. */
export const breathe = (t, period = 2.6, phase = 0) => 0.9 + 0.3 * (0.5 + 0.5 * Math.sin(((t + phase) * TAU) / period));
/** A band of light travelling across a coordinate; it brightens by up to strength. */
export const glint = (x, t, period = 3.6, strength = 0.4, from = -1.4, to = 1.4) => 1 + strength * Math.exp(-(((x - (from + (to - from) * frac(t / period))) / 0.2) ** 2));
/** Sparkle: every drone flickers at its own pace between low and high. */
export const sparkle = (j, t, low = 0.8, high = 1.25) => low + (high - low) * (0.5 + 0.5 * Math.sin(t * (2.5 + 4 * hash(j)) + hash(j + 7) * 20));
/** Light running along a coordinate in one direction (rain falling, waves spreading, a flame flickering). */
export const chase = (x, t, speed, spacing = 0.5, low = 0.6, high = 1.4) => low + (high - low) * Math.exp(-((((frac((x - t * speed) / spacing) - 0.5) * spacing) / 0.07) ** 2));

/**
 * Drawing with light (round 2, NFL and the FlyingStars light tracings): the drones already stand on the outline,
 * dimmed; a bright head travels along the drawing order and leaves the line lit behind it. u ∈ [0, 1] is the drone's
 * place in the drawing order, the head reaches the end after `duration` seconds. Before the head arrives a drone
 * glows faintly (so the picture is never made of drones that appear from nothing), afterwards it stays lit.
 */
export function trace(u, t, duration = 2.4, { delay = 0, dim = 0.12, head = 0.06, lit = 1 } = {}) {
  const at = (t - delay) / duration;
  if (at <= u - head) return dim;
  const d = at - u;
  if (d < 0) return dim + (1.6 - dim) * (1 + d / head); // the head arrives: brighter than the line it leaves
  return lit + 0.6 * Math.exp(-d / 0.05);
}

/**
 * A firework the way FlyingStars fly it (round 2, Frühlingsnacht 2:10–2:25): the drones barely move; the burst is
 * light. From the core a bright front runs outward along the rays, the colour cools from white-gold to the shell's
 * colour, then the shell glows out. r ∈ [0, 1] is the drone's distance from the core (fraction of the radius); the
 * cycle repeats every period. Returns [alpha, warmth] — warmth 1 = white-hot, 0 = shell colour.
 */
export function burstLight(r, t, period = 4.5, delay = 0) {
  const u = frac((t - delay) / period), front = u / 0.28; // the front reaches the rim after 28 % of the cycle
  if (front < r) return [0.18, 1]; // not lit yet: a faint ember on the ray, like a drone waiting dimmed
  const since = (u - (r * 0.28)) * period, fade = Math.exp(-since / 1.25);
  return [0.25 + 1.25 * fade + 0.15 * Math.max(0, 1 - since / 0.25), Math.exp(-since / 0.45)];
}

/**
 * Sparks between two pictures (round 2, Eisenhüttenstadt and #BöllerCiao): the old picture loosens into a cloud that
 * still shows its outline, flickering; the next picture then forms out of that cloud. Points of the dissolved picture,
 * pushed outward a little and scattered in depth.
 */
export const loosen = (pts, spread = 0.18, push = 1.12) => pts.map((p, i) => [p[0] * push + (hash(i * 3.1) - 0.5) * spread, p[1] * push + (hash(i * 5.7) - 0.5) * spread, (p[2] || 0) + (hash(i * 1.9) - 0.5) * spread * 2, ...p.slice(3)]);

/**
 * A figure with joints (round 2: the footballer kicking in Eisenhüttenstadt, the NFL catch, the faces of the
 * short animations). Limbs are polylines hung on a parent limb at a pivot; every limb turns by angle(t) about its
 * pivot, children turn with their parent (forward kinematics). Drones keep their place on their limb, so a kick is
 * drones flying a smooth arc, never light jumping between two poses.
 * rig(limbs, n) → { pts, live(base, j, t, out) }. limbs: [{ name, paths, pivot: [x, y], parent?, angle: (t) => rad,
 * weight? }]. Paths are polylines like in show-shapes (pts, closed).
 */
export function rig(limbs, n, sample) {
  const counts = share(n, limbs.map((l) => l.weight ?? pathLength(l.paths))), owner = [], pts = [];
  limbs.forEach((l, k) => { for (const p of sample(l.paths, counts[k])) { pts.push([p[0], p[1], p[2] || 0]); owner.push(k); } });
  const byName = new Map(limbs.map((l, k) => [l.name, k]));
  const chain = limbs.map((l) => { const c = []; let q = l; while (q) { c.push(byName.get(q.name)); q = q.parent ? limbs[byName.get(q.parent)] : null; } return c; });
  let at = NaN; const ang = new Float64Array(limbs.length);
  const live = (b, j, t, o) => {
    if (t !== at) { at = t; limbs.forEach((l, k) => { ang[k] = l.angle ? l.angle(t) : 0; }); }
    // innermost limb first: the point turns about its own joint, then about every parent joint outward
    for (const k of chain[owner[j]]) { if (ang[k]) roll(o, ang[k], limbs[k].pivot[0], limbs[k].pivot[1]); }
  };
  return { pts, owner, live };
}
const pathLength = (paths) => paths.reduce((s, { pts, closed = true }) => { let L = 0; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s + L; }, 0);

// ---------- beats ----------
/** A beat from named parts: part(name, pts, { rigid }) keeps its drones from beat to beat (object permanence). */
export const part = (name, pts, opts = {}) => ({ name, pts, ...opts });
/** A part marked offstage (it leaves the picture during the act) does not count for the picture's framing. */
export const act = (parts, extra = {}) => ({ pts: parts.flatMap((q) => q.pts), groups: parts.map((q) => ({ name: q.name, count: q.pts.length, rigid: Boolean(q.rigid) })), ...(parts.some((q) => q.offstage) ? { fitPts: parts.filter((q) => !q.offstage).flatMap((q) => q.pts) } : {}), ...extra });
