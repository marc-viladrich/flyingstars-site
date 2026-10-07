// The 30 motif versions of the configurator: SPARK a still 2D picture, HORIZON one 3D object that moves on its own,
// ODYSSEY a short story in acts. Every beat uses exactly the package's drone count.
// Only what real show drones can do: drones move smoothly within speed and acceleration limits (no jumps, also not in
// the dark); effects such as a heartbeat, sparks, rain or a flame are made with light, as real shows do: drones
// dimming, flashing or a light running along drones that stay in place. tests/show-physics.spec.ts checks this.
// A scene is { beats: [{ pts, live?, hold?, caption, lift?, swirl? }] } (see show-field.js).
// Sources: FlyingStars' heart formations, the FlyingStars mark, the real Bokkenrijders show file, the text planner
// and the line drawings in show-shapes.js; motifs follow FlyingStars' published shows and Marc's references.
import logo from "../data/logo-dots.json";
import { heartPicture } from "./heart-formation.js";
import { loadTextEngine, textFormation } from "./text-formation.js";
import { burstSphere, star, extrude, evenSubset, sampleOutline, circle, torusPair, heartOutline } from "./show-geometry.js";
import { engagementRing, ringSeat, hand3d, flute2d, flute3d, bubbles, trophy2d, trophy3d, bulb2d, bulb3d, bulbGlass, filament, notes2d, notes3d, notePath1, melody, clover2d, clover3d, extrudePaths } from "./show-shapes.js";
import { share, twoRings, shield, shield3d, crestStar3d, CREST_NUMBER, inCrestFlag, crown, rocket, rocket3d, flame, maskPair, maskPair3d, mask3d, MASKS, curtain, clockRim, clockDial, hand, burst2d, sparkleShell, tower, tower3d, waves, TOWER_SPHERE, gate3d, arrowPaths, inside, bottle3d, cork } from "./show-shapes.js";

let hearts = null, figure = null;
const loadHearts = () => (hearts ||= import("./pricing-formations.js").then((m) => m.default).catch((e) => { hearts = null; throw e; }));
const loadFigure = () => (figure ||= fetch("/media/projekte/bokkenrijders/formation.json").then((r) => { if (!r.ok) throw new Error(`Formation HTTP ${r.status}`); return r.json(); }).catch((e) => { figure = null; throw e; }));
/** Loads the larger formation sources ahead of need, e.g. on the first interaction with the configurator. */
export function preloadScenes() { loadHearts().catch(() => {}); loadFigure().catch(() => {}); loadTextEngine().catch(() => {}); }

const DIAMOND = [200, 235, 255], GREEN = [90, 222, 120];
const WARM = [246, 241, 232], GOLD = [255, 196, 92], PINK = [255, 92, 138], VIOLET = [219, 100, 232], CYAN = [51, 237, 242], BLUE = [90, 120, 255], ORANGE = [255, 140, 50], RED = [220, 60, 70], MOON = [235, 232, 210];
const TAU = Math.PI * 2;
const mix = (a, b, u) => { const k = Math.max(0, Math.min(1, u)); return a.map((v, i) => Math.round(v + (b[i] - v) * k)); };
const paint = (pts, color) => pts.map((p) => [p[0], p[1], p[2] || 0, ...(typeof color === "function" ? color(p) : color)]);
const place = (pts, s, dx = 0, dy = 0, dz = 0, a = 0) => pts.map(([x, y, z = 0, ...c]) => [(x * Math.cos(a) - y * Math.sin(a)) * s + dx, (x * Math.sin(a) + y * Math.cos(a)) * s + dy, z * s + dz, ...c]);
const frac = (x) => x - Math.floor(x);
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const hash = (j) => frac(Math.sin(j * 12.9898) * 43758.5453);

// ---------- motion within the limits of real drones (all write into out = [x, y, z, alpha]) ----------
/** Turn about the vertical axis through (cx, cz). */
function yaw(out, a, cx = 0, cz = 0) { const x = out[0] - cx, z = out[2] - cz, c = Math.cos(a), s = Math.sin(a); out[0] = cx + x * c + z * s; out[2] = cz - x * s + z * c; }
/** Turn in the picture plane about (cx, cy). */
function roll(out, a, cx = 0, cy = 0) { const x = out[0] - cx, y = out[1] - cy, c = Math.cos(a), s = Math.sin(a); out[0] = cx + x * c - y * s; out[1] = cy + x * s + y * c; }
/** Slow sway: the object turns a little to each side, which shows its depth. */
const sway = (out, t, amp = 0.3, period = 10) => yaw(out, Math.sin((t * TAU) / period) * amp);

// ---------- light effects (drones stay in place) ----------
// All light effects only brighten or rest near full light (Marc, round 8: "generell einfach heller"): a value above 1
// enlarges a drone's glow and whitens its core, so sparkle and shimmer stay visible without dimming the motif.
/** Calm breathing light, never below 0.9 (round 8: the heartbeat flashes were too hectic). */
const breathe = (t, period = 2.6, phase = 0) => 0.9 + 0.3 * (0.5 + 0.5 * Math.sin(((t + phase) * TAU) / period));
/** A band of light travelling across a coordinate; it brightens by up to strength. */
const glint = (x, t, period = 3.6, strength = 0.4, from = -1.4, to = 1.4) => 1 + strength * Math.exp(-(((x - (from + (to - from) * frac(t / period))) / 0.2) ** 2));
/** Sparkle: every drone flickers at its own pace between low and high. */
const sparkle = (j, t, low = 0.8, high = 1.25) => low + (high - low) * (0.5 + 0.5 * Math.sin(t * (2.5 + 4 * hash(j)) + hash(j + 7) * 20));
/** Light running along a coordinate in one direction (rain falling, waves spreading, a flame flickering). */
const chase = (x, t, speed, spacing = 0.5, low = 0.6, high = 1.4) => low + (high - low) * Math.exp(-((((frac((x - t * speed) / spacing) - 0.5) * spacing) / 0.07) ** 2));

// ---------- sources ----------
/** FlyingStars' 3D heart (honeycomb half-shell for 290 drones), unit size, thinned evenly to n. */
async function heart3d(n) {
  const pic = heartPicture(await loadHearts(), 290);
  const pts = pic.hearts.filter((h) => h.slot === 0).flatMap((h) => h.pts), mx = Math.max(...pts.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1]))));
  return evenSubset(pts.map(([x, y, z]) => [x / mx, y / mx - 0.1, z / mx]), n);
}
const heartColour = (p) => mix(PINK, VIOLET, (p[2] + 0.3) / 0.6);
const heartLine = (n) => heartOutline(n).map(([x, y]) => [x / 16, y / 16 + 0.05, 0]);
// a single outline (heartOutline adds an inner line from 160 points on) as the area in which the arrow stays dark
const HEART_POLY = heartOutline(150).map(([x, y]) => [x / 16, y / 16 + 0.05]);
async function words(value, n, halfWidth, cx = 0, cy = 0, z = 0) {
  await loadTextEngine();
  const r = textFormation(value, n);
  if (!r) return sampleOutline([circle(cx, cy, halfWidth * 0.6, 120)], n).map(([x, y]) => [x, y, z]);
  const pts = r.pts.slice(0, n), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const k = (halfWidth * 2) / (Math.max(...xs) - Math.min(...xs)), mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  const out = pts.map(([x, y]) => [(x - mx) * k + cx, (y - my) * k + cy, z]);
  return out.concat(sampleOutline([circle(cx, cy, halfWidth * 1.15, 120)], n - out.length).map(([x, y]) => [x, y, z]));
}
const mark = (z = 0) => logo.dots.map(([x, y, r, g, b]) => [x, y, z, r, g, b]);
const logo2d = (n) => [...mark(), ...paint(sampleOutline([circle(0, 0, 1.45, 180)], n - logo.dots.length), GOLD)];
function logo3d(n) { const layers = [...mark(0.22), ...mark(-0.22)]; return [...layers, ...paint(sampleOutline([circle(0, 0, 1.45, 180)], n - layers.length), GOLD)]; }
async function devil(n) {
  const data = await loadFigure(), mx = Math.max(...data.dots.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1]))));
  return evenSubset(data.dots.map(([x, y, r, g, b, , z]) => [x / mx, y / mx, (z ?? 0) / mx, ...(r + g + b === 0 ? [70, 70, 70] : [r, g, b])]), n);
}
const star3d = (n, s = 0.5, dx = 0, dy = 0) => place(paint(extrude(star(n), n, 0.35), GOLD), s, dx, dy);
/** Columns of drones (rain, rising rockets): positions stay, the light does the falling or rising. */
const columns = (n, xs, y0, y1, zs = () => 0) => Array.from({ length: n }, (_, i) => { const c = i % xs.length, k = Math.floor(i / xs.length), per = Math.ceil((n - c) / xs.length); return [xs[c], y0 + ((y1 - y0) * (k + 0.5)) / per, zs(c)]; });
/** Shell of a firework around (cx, cy) with radius R. */
const shell = (n, cx, cy, R) => burstSphere(n).map(([x, y, z]) => [cx + x * R, cy + y * R, z * R]);
/**
 * A firework shell the way drones can fly it: from a compact ball (never one point) the drones spread slowly to the
 * shell and gather again; the light is bright while the shell opens and softer while it closes, so it reads as one
 * burst after the other.
 */
function bloom(out, base, t, { cx = 0, cy = 0, period = 12, delay = 0, rmin = 0.3 }) {
  const w = (TAU * (t - delay)) / period, r = rmin + (1 - rmin) * 0.5 * (1 - Math.cos(w));
  out[0] = cx + (base[0] - cx) * r; out[1] = cy + (base[1] - cy) * r; out[2] = (base[2] || 0) * r;
  out[3] = Math.sin(w) > 0 ? 0.55 + 0.65 * Math.sin(w) ** 0.6 : 0.55;
}

const still = (pts, caption) => ({ beats: [{ pts, caption }] });
/** A beat from named parts: part(name, pts, { rigid }) keeps its drones from beat to beat (object permanence). */
const part = (name, pts, opts = {}) => ({ name, pts, ...opts });
const act = (parts, extra = {}) => ({ pts: parts.flatMap((q) => q.pts), groups: parts.map((q) => ({ name: q.name, count: q.pts.length, rigid: Boolean(q.rigid) })), ...extra });
const TAU2 = Math.PI * 2;
/** Volumetric torus surface (as in the client's Vercel prototype), tilted towards the audience. */
function torusSurface(n, R = 0.75, r = 0.24, tilt = 1.05) {
  const U = Math.max(8, Math.round(Math.sqrt(n * 2.6))), V = Math.ceil(n / U), out = [];
  for (let i = 0; i < U && out.length < n; i++) for (let j = 0; j < V && out.length < n; j++) {
    const u = (i / U) * TAU2, v = (j / V) * TAU2 + i * 0.37, x = (R + r * Math.cos(v)) * Math.cos(u), y = r * Math.sin(v), z = (R + r * Math.cos(v)) * Math.sin(u);
    out.push([x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)]);
  }
  return out;
}
/** Trefoil knot as a tube of three strands. */
function trefoil(n, s = 0.36, tube = 0.11) {
  const C = (t) => [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)], out = [];
  for (let i = 0; i < n; i++) {
    const t = ((Math.floor(i / 3) + 0.5) / Math.ceil(n / 3)) * TAU2, a = C(t), b = C(t + 1e-3), T = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], tl = Math.hypot(...T);
    const Tn = T.map((q) => q / tl), N0 = [Tn[1], -Tn[0], 0], nl = Math.hypot(...N0) || 1, N = N0.map((q) => q / nl), B = [Tn[1] * N[2] - Tn[2] * N[1], Tn[2] * N[0] - Tn[0] * N[2], Tn[0] * N[1] - Tn[1] * N[0]];
    const ph = ((i % 3) / 3) * TAU2 + t * 2;
    out.push([0, 1, 2].map((q) => a[q] * s + (N[q] * Math.cos(ph) + B[q] * Math.sin(ph)) * tube));
  }
  return out;
}
/** Quadratic Bézier point and unit tangent. */
const bez = (P0, P1, P2, s) => { const u = 1 - s; return [u * u * P0[0] + 2 * u * s * P1[0] + s * s * P2[0], u * u * P0[1] + 2 * u * s * P1[1] + s * s * P2[1]]; };
const bezDir = (P0, P1, P2, s) => { const dx = 2 * (1 - s) * (P1[0] - P0[0]) + 2 * s * (P2[0] - P1[0]), dy = 2 * (1 - s) * (P1[1] - P0[1]) + 2 * s * (P2[1] - P1[1]), l = Math.hypot(dx, dy); return [dx / l, dy / l]; };

/** Evenly covered sphere surface (golden-angle spiral), like a mirror ball or a planet. */
const fib = (n, R, cx = 0, cy = 0, cz = 0) => { const GA = Math.PI * (3 - Math.sqrt(5)); return Array.from({ length: n }, (_, i) => { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), a = GA * i; return [cx + Math.cos(a) * r * R, cy + y * R, cz + Math.sin(a) * r * R]; }); };
/** Three firework shells side by side; which shell drone j belongs to, for staggered blooming. */
const SHELLS = [[-0.62, 0.2, 0.5, GOLD, VIOLET], [0.62, 0.3, 0.56, CYAN, BLUE], [0, -0.34, 0.46, PINK, GOLD]];
function shells(n) {
  const counts = share(n, SHELLS.map((q) => q[2] ** 2)), of = [];
  const pts = SHELLS.flatMap(([cx, cy, R, c0, c1], q) => { for (let k = 0; k < counts[q]; k++) of.push(q); return paint(shell(counts[q], cx, cy, R), (p) => mix(c0, c1, Math.hypot(p[0] - cx, p[1] - cy, p[2]) / R)); });
  const live = (b, j, t, o) => { const [cx, cy] = SHELLS[of[j]]; bloom(o, b, t, { cx, cy, period: 9, delay: of[j] * 3 }); };
  return { pts, live };
}
/** The crest's colours: a river field, a red flag, the rest warm white. */
const crestColour = (p) => (inCrestFlag(p[0], p[1]) ? RED : p[0] < -0.05 && p[1] > 0.36 && p[1] < 0.7 ? mix(WARM, CYAN, 0.55) : WARM);
/** The flag in the crest waves in the wind (in depth for 3D, in the picture plane for 2D). */
const flutter = (b, t, o, depth) => { if (inCrestFlag(b[0], b[1])) { const k = Math.sin(t * 2.2 - b[0] * 7) * ((b[0] - 0.2) / 0.36); if (depth) o[2] += k * 0.07; else o[1] += k * 0.025; } };
/** Gentle drapes: cloth moving in a breeze below the valance. */
const billow = (b, t, o) => { if (b[1] < 0.82) { const depth = (0.82 - b[1]) / 1.66; o[0] += Math.sin(b[1] * 3 - t * 0.9) * 0.04 * depth; o[2] += Math.cos(b[1] * 2.5 - t * 0.8) * 0.08 * depth; } };
/** The curtain opening while the audience watches: drone j of curtain(m, 0) slides to its place in curtain(m, open). */
function opening(m, begin = 0.5, duration = 2.4) {
  let at = NaN, pts = null;
  return (b, j, t, o) => {
    if (t !== at) { at = t; pts = curtain(m, smooth((t - begin) / duration)); } // one curtain per frame for all drones
    o[0] = pts[j][0]; o[1] = pts[j][1]; billow(pts[j], t, o);
  };
}
/** Rain in light: columns of drones stay in place while light falls along them. */
const RAIN_XS = Array.from({ length: 12 }, (_, i) => -0.55 + (i / 11) * 1.1);
const rain = (k, top = 0.78) => paint(columns(k, RAIN_XS, -0.8, top, (c) => Math.sin(c * 2.1) * 0.4), GOLD);
/** Fernsehturm colours, and its red warning light that blinks at the top. */
const towerPaint = (p) => (p[1] > 1.15 ? RED : p[1] > 0.25 && p[1] < 0.62 ? mix(WARM, CYAN, 0.35) : WARM);
const warning = (t) => 0.75 + 0.6 * Math.exp(-(((frac(t / 1.6) - 0.1) / 0.06) ** 2));
/** The two glasses touch rims now and then: each tips a little towards the other, around its foot. */
const clink = (o, t, side) => roll(o, side * 0.07 * Math.sin((Math.PI * t) / 3) ** 8, side * 0.47, -0.78);
const flameColour = (top) => (p) => mix(GOLD, ORANGE, (top - p[1]) / 0.42);

/** How long the last picture of a motif stays before the next motif forms, per package. */
const HOLD = { SPARK: 3.5, HORIZON: 5, ODYSSEY: 3.5 };
const nearWhite = (r, g, b) => Math.min(r, g, b) > 190 && Math.max(r, g, b) - Math.min(r, g, b) < 45;
/**
 * The show for one occasion and package: the occasion's motifs in order, each in its version for the package, as one
 * scene that starts again after the last motif. Every beat carries its motif (segment) for the controller. Drones that
 * would light warm white take the package's colour (Marc, round 9: SPARK orange, HORIZON pink, ODYSSEY blue); motifs
 * with their own colours keep them. Every version gets the soft light shimmer.
 */
export async function buildSequence(motifs, pkg, n, tint) {
  const beats = [];
  for (const [segment, m] of motifs.entries()) {
    const scene = await buildBeats(m.tiers[pkg], n);
    scene.beats.forEach((b, i, all) => {
      b.segment = segment; b.motif = m.label; b.shimmer ??= true;
      if (i === all.length - 1) b.hold ??= HOLD[pkg];
      if (tint) b.pts = b.pts.map((p) => (nearWhite(p[3], p[4], p[5]) ? [p[0], p[1], p[2], ...mix(WARM, tint, 0.7)] : p));
      beats.push(b);
    });
  }
  return { beats, loopTo: 0 };
}
async function buildBeats(version, n) {
  const caption = version.caption;
  switch (version.build) {
    // ---- Hochzeit · Ring ----
    case "rings2d": {
      const per = Math.floor(n / 2); // each ring turns about its own axis, the two in opposite directions
      return { beats: [{ pts: paint(twoRings(n), GOLD), caption, live: (b, j, t, o) => {
        const side = j < per ? -1 : 1;
        o[3] = 0.85 + 0.45 * Math.max(0, Math.cos(Math.atan2(b[1], b[0] - side * 0.42) - t * 1.2 * side)) ** 3;
        yaw(o, Math.sin((t * TAU) / 7) * 0.7 * side, side * 0.42, 0);
      } }] };
    }
    case "rings3d": {
      const [band, stone] = engagementRing(n, 0.75), k = band.length;
      return { beats: [{ pts: [...paint(band, (p) => mix(GOLD, WARM, (p[1] + 0.75) / 3)), ...paint(stone, DIAMOND)], caption, live: (b, j, t, o) => {
        yaw(o, t * 0.45); if (j >= k) o[3] = sparkle(j, t, 0.95, 1.4);
      } }] };
    }
    case "ringsStory": {
      const ringN = Math.round(n * 0.3), [band, stone] = engagementRing(ringN, 0.55), [h, g] = share(n - ringN, [6, 1]);
      const ringPts = [...paint(band, (p) => mix(GOLD, WARM, (p[1] + 0.55) / 2.2)), ...paint(stone, DIAMOND)];
      const seat = ringSeat(0.2), r = seat.h + 0.035, s = r / 0.55, onFinger = (up, tip = 0.3) => ringPts.map(([x, y, z, ...c]) => {
        // the band lies around the finger: picture plane → horizontal ring, the stone towards the audience; tipped
        // towards the audience by tip, so that it reads as a ring while it hovers
        const X = x * s, Y0 = z * s, Z0 = y * s, Y = Y0 * Math.cos(tip) + Z0 * Math.sin(tip), Z = -Y0 * Math.sin(tip) + Z0 * Math.cos(tip);
        return [seat.c[0] + seat.d[0] * up + X, seat.c[1] + seat.d[1] * up + Y, Z, ...c];
      });
      const handPts = paint(hand3d(h), WARM), glitter = (k, R, cy = 0) => paint(sparkleShell(k, R).map(([x, y, z]) => [x, y + cy, z]), WARM);
      const burst = Array.from({ length: g }, (_, i) => { const a = (i / g) * TAU, R = 0.16 + 0.08 * (i % 2); return [seat.c[0] + Math.cos(a) * R, seat.c[1] + Math.sin(a) * R * 0.8, 0.25]; });
      const spin = (b, j, t, o) => { if (j < ringN) yaw(o, t * 0.5, 0, 0); else o[3] = sparkle(j, t); };
      return { beats: [
        act([part("ring", ringPts.map(([x, y, z, ...c]) => [x, y + 0.1, z, ...c]), { rigid: true }), part("glitter", glitter(n - ringN, 0.95, 0.1))], { caption: "Ein Ring funkelt", hold: 1.6, live: spin }),
        act([part("ring", onFinger(0.82, 1.1), { rigid: true }), part("hand", handPts), part("glitter", glitter(g, 0.95))], { caption: "eine Hand, der Ring schwebt darüber", hold: 0.6, live: (b, j, t, o) => { if (j < ringN) o[1] += Math.sin(t * 1.1) * 0.02; else if (j >= ringN + h) o[3] = sparkle(j, t); } }),
        act([part("ring", onFinger(0), { rigid: true }), part("hand", handPts), part("glitter", glitter(g, 0.95))], { caption: "er gleitet auf den Ringfinger", hold: 1, live: (b, j, t, o) => { if (j >= ringN + h) o[3] = sparkle(j, t); } }),
        act([part("ring", onFinger(0), { rigid: true }), part("hand", handPts), part("glitter", paint(burst, DIAMOND))], { caption: "…und der Stein funkelt", live: (b, j, t, o) => {
          if (j >= ringN + h) { o[3] = sparkle(j, t, 0.9, 1.5); const k = 1 + 0.12 * Math.sin(t * 1.4 + j); o[0] = seat.c[0] + (b[0] - seat.c[0]) * k; o[1] = seat.c[1] + (b[1] - seat.c[1]) * k; } // sparks around the stone breathe outward
          else if (j >= ringN - stone.length && j < ringN) o[3] = sparkle(j, t, 1, 1.5);
        } }),
      ] };
    }
    // ---- Hochzeit · Herz ----
    case "heart2d": return { beats: [{ pts: paint(heartLine(n), PINK), caption, live: (b, j, t, o) => { o[3] = breathe(t); } }] };
    case "heart3d": return { beats: [{ pts: paint(await heart3d(n), heartColour), caption, live: (b, j, t, o) => { o[3] = breathe(t); sway(o, t); } }] };
    case "heartsStory": {
      const [h, a] = share(n, [5, 1]);
      // Amor's arrow flies through the heart in one piece and on out of it; the heart takes its drones in and fills
      const arrow = (hx, hy) => part("arrow", paint(sampleOutline(arrowPaths(hx, hy, hx + 1.13, hy + 0.65), a).map(([x, y]) => [x, y, 0.05]), GOLD), { rigid: true });
      // FlyingStars' 3D heart is a formation for 290 drones: the arrow's drones become a ring of sparks around it
      const full = await heart3d(h), half = await heart3d(Math.ceil(n / 2)), ring = paint(sparkleShell(a, 1.3), GOLD);
      const couple = [...place(half.slice(0, Math.floor(n / 2)), 0.62, -0.58, 0, 0), ...place(half.slice(0, Math.ceil(n / 2)), 0.62, 0.58, 0, 0)];
      return { beats: [
        act([part("heart", paint(heartLine(h), PINK)), arrow(0.9, 0.55)], { caption: "Ein Herz, Amor zielt", hold: 0.6, frame: "aim" }),
        act([part("heart", paint(heartLine(h), PINK)), arrow(-2.0, -1.15)], { caption: "der Pfeil fliegt mitten hindurch", hold: 0.2, frame: "aim" }),
        act([part("heart", paint(full, heartColour)), part("arrow", ring)], { caption: "das Herz wird voll und atmet", hold: 2, live: (b, j, t, o) => { if (j < h) { o[3] = breathe(t); sway(o, t, 0.25); } else { yaw(o, t * 0.2); o[3] = sparkle(j, t); } } }),
        act([part("heart", paint(couple, heartColour))], { caption: "…und wird zu zwei Herzen, die sich umkreisen", live: (b, j, t, o) => { yaw(o, t * 0.35); o[3] = breathe(t, 2.6, j < n / 2 ? 0 : 1.3); } }),
      ] };
    }
    // ---- Hochzeit · Sektgläser ----
    case "flutes2d": {
      const per = Math.floor(n / 2), glass = (k, side) => place(flute2d(k), 1, side * 0.3, 0, 0, side * 0.22);
      return { beats: [{ pts: paint([...glass(per, -1), ...glass(n - per, 1)], WARM), caption, live: (b, j, t, o) => clink(o, t, j < per ? -1 : 1) }] };
    }
    case "flutes3d": {
      // each glass: its wireframe, then the bubbles inside; the light rises along the bubbles
      const per = Math.floor(n / 2), glasses = [[per, -1], [n - per, 1]].map(([k, side]) => { const [g, q] = share(k, [4, 1]); return { g, pts: place([...paint(flute3d(g), WARM), ...paint(bubbles(q), GOLD)], 1, side * 0.3, 0, 0, side * 0.22) }; });
      const isBubble = (j) => (j < per ? j >= glasses[0].g : j - per >= glasses[1].g);
      return { beats: [{ pts: [...glasses[0].pts, ...glasses[1].pts], caption, live: (b, j, t, o) => { if (isBubble(j)) o[3] = chase(b[1], t, 0.35, 0.22, 0.7, 1.4); clink(o, t, j < per ? -1 : 1); sway(o, t, 0.3); } }] };
    }
    case "flutesStory": {
      const [gl, gr, q] = share(n, [2, 2, 1.1]), glass = (k, side, apart) => paint(place(flute3d(k), 1, side * (apart ? 0.75 : 0.3), 0, 0, apart ? 0 : side * 0.22), WARM);
      const inside = (k, apart) => [-1, 1].flatMap((side, i) => place(bubbles(share(k, [1, 1])[i]), 1, side * (apart ? 0.75 : 0.3), 0, 0, apart ? 0 : side * 0.22));
      const rising = place(heartLine(q), 0.42, 0, 1.0);
      const fizz = (b, j, t, o) => { if (j >= gl + gr) o[3] = chase(b[1], t, 0.35, 0.22, 0.7, 1.4); };
      return { beats: [
        act([part("left", glass(gl, -1, true), { rigid: true }), part("right", glass(gr, 1, true), { rigid: true }), part("bubbles", paint(inside(q, true), GOLD))], { caption: "Zwei Gläser", hold: 1, live: fizz }),
        act([part("left", glass(gl, -1, false), { rigid: true }), part("right", glass(gr, 1, false), { rigid: true }), part("bubbles", paint(inside(q, false), GOLD))], { caption: "sie stoßen an", hold: 1.4, live: (b, j, t, o) => { fizz(b, j, t, o); if (j < gl + gr) clink(o, t, j < gl ? -1 : 1); } }),
        act([part("left", glass(gl, -1, false), { rigid: true }), part("right", glass(gr, 1, false), { rigid: true }), part("bubbles", paint(rising, PINK))], { caption: "…und die Perlen steigen als Herz auf", live: (b, j, t, o) => { if (j >= gl + gr) o[3] = breathe(t); else clink(o, t, j < gl ? -1 : 1); sway(o, t, 0.2); } }),
      ] };
    }
    // ---- Jubiläum · Pokal ----
    case "trophy2d": {
      const [a, s] = share(n, [6, 1]), stars = Array.from({ length: s }, (_, i) => { const u = (i + 0.5) / s, ang = Math.PI * (0.15 + 0.7 * u); return [Math.cos(ang) * 0.95, 0.35 + Math.sin(ang) * 0.75, 0]; });
      return { beats: [{ pts: [...paint(trophy2d(a), WARM), ...paint(stars, GOLD)], caption, live: (b, j, t, o) => { o[3] = j >= a ? sparkle(j, t, 0.85, 1.4) : glint(b[0] + b[1] * 0.4, t, 4, 0.35); } }] };
    }
    case "trophy3d": return { beats: [{ pts: paint(trophy3d(n), (p) => (p[1] > 0.55 ? GOLD : WARM)), caption, live: (b, j, t, o) => { o[3] = glint(b[1], t, 4, 0.4, -1.2, 1.2); yaw(o, t * 0.3); } }] };
    case "trophyStory": {
      const [a, b, s] = share(n, [5, 1.4, 1.2]), number = await words("125", b, 0.42, 0, 1.05, 0);
      const cloud = (k, cy, R) => paint(fib(k, R, 0, cy).map(([x, y, z], i) => [x, y, z + (hash(i) - 0.5) * 0.1]), GOLD);
      const confetti = (k) => paint(sparkleShell(k, 1.25).map(([x, y, z]) => [x, y + 0.15, z]), (p) => [GOLD, PINK, CYAN][Math.floor(hash(p[0] * 31) * 3)]);
      return { beats: [
        act([part("trophy", paint(trophy3d(a, 0.2), WARM)), part("sparks", cloud(n - a, 0.35, 0.5))], { caption: "Der Sockel, darüber sammeln sich Funken", hold: 0.8, live: (bs, j, t, o) => { if (j >= a) { yaw(o, t * 0.4); o[3] = sparkle(j, t); } } }),
        act([part("trophy", paint(trophy3d(a), (p) => (p[1] > 0.55 ? GOLD : WARM))), part("sparks", cloud(n - a, 1.05, 0.38))], { caption: "der Pokal wächst aus den Funken", hold: 1.2, live: (bs, j, t, o) => { if (j >= a) { yaw(o, t * 0.4); o[3] = sparkle(j, t); } else yaw(o, t * 0.25); } }),
        act([part("trophy", paint(trophy3d(a), (p) => (p[1] > 0.55 ? GOLD : WARM))), part("number", paint(number, GOLD)), part("sparks", confetti(s))], { caption: "…und eure Zahl steigt heraus, Konfetti funkelt", live: (bs, j, t, o) => {
          if (j >= a + b) { yaw(o, t * 0.15); o[3] = sparkle(j, t, 0.85, 1.4); } else if (j < a) yaw(o, t * 0.25); else o[3] = glint(bs[0], t, 3, 0.4);
        } }),
      ] };
    }
    // ---- Launch · Glühbirne ----
    case "bulb2d": {
      const [g] = share(n, [4, 1.2]); // the filament glows, light runs over the glass
      return { beats: [{ pts: paint(bulb2d(n), (p) => (Math.abs(p[0]) < 0.09 && p[1] > -0.43 && p[1] < 0.12 ? GOLD : WARM)), caption, live: (b, j, t, o) => { o[3] = j >= g ? breathe(t, 1.8) + 0.15 : glint(b[0] - b[1] * 0.3, t, 4, 0.3); } }] };
    }
    case "bulb3d": {
      const [glass, fil] = bulb3d(n);
      return { beats: [{ pts: [...paint(glass, WARM), ...paint(fil, GOLD)], caption, live: (b, j, t, o) => { yaw(o, t * 0.3); if (j >= glass.length) o[3] = breathe(t, 1.8) + 0.2; } }] };
    }
    case "bulbStory": {
      const [g, f, r] = share(n, [3.4, 0.8, 1.6]), glassAll = bulbGlass(g + r), glass = bulbGlass(g);
      const wire = paint(filament(f), GOLD), spark = paint(fib(g + r, 0.3, 0, -0.15).map(([x, y, z], i) => [x * (0.6 + hash(i) * 0.6), y, z]), GOLD);
      const RAYS = 12, rays = Array.from({ length: r }, (_, i) => { const k = i % RAYS, u = Math.floor(i / RAYS) / Math.max(1, Math.ceil(r / RAYS) - 1), a = (k / RAYS) * TAU + 0.13; return [Math.cos(a) * (0.62 + 0.38 * u), 0.15 + Math.sin(a) * (0.62 + 0.38 * u), 0]; });
      return { beats: [
        act([part("filament", wire), part("glass", spark)], { caption: "Ein Funke", hold: 1, live: (b, j, t, o) => { if (j >= f) { yaw(o, t * 0.5); o[3] = sparkle(j, t); } else o[3] = breathe(t, 1.6) + 0.2; } }),
        act([part("filament", wire), part("glass", paint(glassAll, WARM))], { caption: "um ihn formt sich die Glühbirne", hold: 1, live: (b, j, t, o) => { if (j < f) o[3] = breathe(t, 1.6) + 0.2; yaw(o, t * 0.25); } }),
        act([part("filament", wire), part("glass", paint(glass, WARM)), part("rays", paint(rays, GOLD))], { caption: "…und sie strahlt", live: (b, j, t, o) => {
          if (j < f) o[3] = 1.35;
          else if (j >= f + g) { const k = 1 + 0.1 * Math.sin(t * 1.3 - Math.hypot(b[0], b[1] - 0.15) * 4); o[0] = b[0] * k; o[1] = 0.15 + (b[1] - 0.15) * k; o[3] = 1.1; } // the rays reach out and back
        } }),
      ] };
    }
    // ---- Kultur · Noten ----
    case "notes2d": return { beats: [{ pts: paint(notes2d(n), GOLD), caption, live: (b, j, t, o) => roll(o, Math.sin((t * TAU) / 2.4) * 0.07, 0.17, 0.1) }] };
    case "notes3d": return { beats: [{ pts: paint(notes3d(n), GOLD), caption, live: (b, j, t, o) => { roll(o, Math.sin((t * TAU) / 2.4) * 0.07, 0.17, 0.1); sway(o, t, 0.4); o[3] = glint(b[0], t, 3.2, 0.35); } }] };
    case "notesStory": {
      const { staff, notes } = melody(n), starts = [staff.length]; for (const q of notes) starts.push(starts[starts.length - 1] + q.length);
      const noteOf = (j) => starts.findIndex((s, k) => j >= s && j < (starts[k + 1] ?? Infinity));
      return { beats: [
        act([part("notes", paint(extrudePaths(notePath1(), n, 0.2), GOLD))], { caption: "Ein Ton", hold: 1, live: (b, j, t, o) => sway(o, t, 0.4) }),
        act([part("notes", paint(notes3d(n), GOLD))], { caption: "zwei Töne", hold: 1, live: (b, j, t, o) => { roll(o, Math.sin((t * TAU) / 2.4) * 0.07, 0.17, 0.1); sway(o, t, 0.4); } }),
        act([part("staff", paint(staff, WARM)), part("notes", paint(notes.flat(), GOLD))], { caption: "…eine Melodie, die Noten hüpfen nacheinander", live: (b, j, t, o) => {
          if (j >= staff.length) { const k = noteOf(j), u = frac(t / 3 - k * 0.12); o[1] += 0.12 * Math.sin(Math.PI * Math.min(1, u / 0.25)) ** 2; } // one note after the other hops and lands
          sway(o, t, 0.25);
        } }),
      ] };
    }
    // ---- Silvester · Kleeblatt ----
    case "clover2d": return { beats: [{ pts: paint(clover2d(n), GREEN), caption, live: (b, j, t, o) => { roll(o, t * 0.12); o[3] = glint(b[0] + b[1], t, 4, 0.3); } }] };
    case "clover3d": return { beats: [{ pts: paint(clover3d(n), GREEN), caption, live: (b, j, t, o) => { yaw(o, t * 0.35); o[3] = glint(b[1], t, 3.6, 0.35); } }] };
    case "cloverStory": {
      const [a, r] = share(n, [4, 1]);
      return { beats: [
        act([part("clover", paint(clover3d(n, 3), GREEN))], { caption: "Ein Kleeblatt mit drei Blättern", hold: 1, live: (b, j, t, o) => sway(o, t, 0.35) }),
        act([part("clover", paint(clover3d(n), GREEN))], { caption: "ein viertes kommt dazu: Glück", hold: 1.2, live: (b, j, t, o) => sway(o, t, 0.35) }),
        act([part("clover", paint(clover3d(a), GREEN)), part("rain", paint(sparkleShell(r, 1.35), GOLD))], { caption: "…für das neue Jahr, umringt von Funken", live: (b, j, t, o) => { if (j < a) yaw(o, t * 0.35); else { yaw(o, -t * 0.12); o[3] = sparkle(j, t, 0.85, 1.4); } } }),
      ] };
    }
    // ---- Jubiläum · Wappen ----
    case "shield": return { beats: [{ pts: paint(shield(n), (p) => (p[1] < 0.06 && p[1] > -0.5 && Math.abs(p[0]) < 0.28 ? GOLD : crestColour(p))), caption, live: (b, j, t, o) => flutter(b, t, o, false) }] };
    case "shield3d": {
      const [a, b] = share(n, [3, 1]), { cx, cy, halfWidth } = CREST_NUMBER;
      const pts = [...paint(shield3d(a), crestColour), ...paint(await words("125", b, halfWidth, cx, cy, 0.2), GOLD)];
      return { beats: [{ pts, caption, live: (bs, j, t, o) => { o[3] = glint(bs[0] + bs[1] * 0.5, t); if (j < a) flutter(bs, t, o, true); sway(o, t, 0.35); } }] };
    }
    case "shieldStory": {
      const [a, b, c, d] = share(n, [5, 2.2, 1.2, 1.6]), { cx, cy, halfWidth } = CREST_NUMBER;
      const number = await words("125", b, halfWidth, cx, cy, 0.2);
      const wreath = Array.from({ length: d }, (_, i) => { const ang = (i / d) * TAU; return [Math.cos(ang) * 1.25, 0.02 + Math.sin(ang) * 1.12, 0]; });
      const crest = (k) => part("crest", paint(shield3d(k), crestColour));
      const waving = (bs, j, t, o, k) => { if (j < k) flutter(bs, t, o, true); sway(o, t, 0.25); };
      return { beats: [
        act([crest(n - b), part("emblem", paint(crestStar3d(b), GOLD))], { caption: "Das Wappen", hold: 1.2, live: (bs, j, t, o) => waving(bs, j, t, o, n - b) }),
        act([crest(n - b), part("emblem", paint(place(number, 1, 0, 0, 0.25), GOLD))], { caption: "aus dem Stern wird eure Zahl", hold: 1.4, live: (bs, j, t, o) => waving(bs, j, t, o, n - b) }),
        act([crest(a), part("emblem", paint(place(number, 1, 0, 0, 0.1), GOLD)), part("crown", paint(crown(c, 1.0), GOLD)), part("wreath", paint(wreath, GOLD))], { caption: "…mit Krone und kreisendem Sternenkranz", live: (bs, j, t, o) => {
          if (j >= a + b + c) { roll(o, t * 0.12, 0, 0.02); o[3] = sparkle(j, t); } // the wreath turns slowly around the crest
          else if (j >= a + b) o[3] = glint(bs[0], t, 3, 0.4);
          waving(bs, j, t, o, a);
        } }),
      ] };
    }
    // ---- Jubiläum · Wahrzeichen (Berliner Fernsehturm) ----
    case "tower": return { beats: [{ pts: paint(tower(n), (p) => (p[1] > 1.15 ? RED : WARM)), caption, live: (b, j, t, o) => { if (b[1] > 1.15) o[3] = warning(t); } }] };
    case "tower3d": return { beats: [{ pts: paint(tower3d(n), towerPaint), caption, live: (b, j, t, o) => {
      if (b[1] > 0.25 && b[1] < 0.62) o[3] = glint(Math.atan2(b[2], b[0]), t, 4, 0.45, -Math.PI, Math.PI); // light runs around the sphere
      else if (b[1] > 1.15) o[3] = warning(t);
      yaw(o, t * 0.2);
    } }] };
    case "towerStory": {
      const [a, w] = share(n, [2, 1]);
      return { beats: [
        { pts: paint(tower3d(n), towerPaint), caption: "Der Fernsehturm", hold: 1.4, live: (b, j, t, o) => { if (b[1] > 1.15) o[3] = warning(t); sway(o, t, 0.3); } },
        { pts: [...paint(tower3d(a), towerPaint), ...paint(waves(w), CYAN)], caption: "sendet über die Stadt", hold: 4.5, live: (b, j, t, o) => {
          if (j >= a) { // each wave arc moves slowly outward and back again, one after the other
            const dx = b[0] - TOWER_SPHERE[0], dy = b[1] - TOWER_SPHERE[1], r0 = Math.hypot(dx, dy), k = 1 + 0.2 * Math.sin((t * TAU) / 4.5 - r0 * 5);
            o[0] = TOWER_SPHERE[0] + dx * k; o[1] = TOWER_SPHERE[1] + dy * k;
          } else if (b[1] > 1.15) o[3] = warning(t);
          sway(o, t, 0.25);
        } },
        { pts: paint(gate3d(n), (p) => (p[1] > 0.56 ? GOLD : WARM)), caption: "…und wird zum Brandenburger Tor", live: (b, j, t, o) => { o[3] = glint(b[0], t, 4, 0.35); sway(o, t, 0.3); } },
      ] };
    }
    // ---- Launch · Rakete ----
    case "rocket": {
      const [r, f] = share(n, [5, 1]), pts = [...paint(rocket(r), WARM), ...paint(flame(f, -0.6), flameColour(-0.6))];
      return { beats: [{ pts, caption, live: (b, j, t, o) => { o[1] += Math.sin(t * 0.6) * 0.03; if (j >= r) o[3] = chase(-b[1], t, 0.9, 0.2, 0.75, 1.4); } }] };
    }
    case "rocket3d": {
      const [r, f] = share(n, [6, 1]), pts = [...paint(rocket3d(r), (p) => mix(WARM, CYAN, (p[2] + 0.2) / 0.4)), ...paint(flame(f, -0.6, 0.08), flameColour(-0.6))];
      return { beats: [{ pts, caption, live: (b, j, t, o) => { yaw(o, t * 0.25); o[1] += Math.sin(t * 0.6) * 0.04; if (j >= r) o[3] = chase(-b[1], t, 0.9, 0.2, 0.75, 1.4); } }] };
    }
    case "rocketStory": {
      const [r, f] = share(n, [110, 190]);
      const P0 = [-0.95, -0.62], P1 = [-0.9, 0.5], P2 = [0.55, 0.78], scale = 0.42;
      const local = rocket3d(r), body = place(local, scale); // nose up, the nozzle at about y = −0.24
      const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
      // the rocket follows its path and straightens up before landing
      const angle = (s) => { const [dx, dy] = bezDir(P0, P1, P2, s); return -Math.atan2(dx, dy) * (1 - smooth((s - 0.7) / 0.3)); };
      const tail = (s) => { const [cx, cy] = bez(P0, P1, P2, s), [tx, ty] = rot(0, -0.27, angle(s)); return [cx + tx, cy + ty]; };
      const travel = (t) => smooth(Math.max(0, t) / 6); // the flight takes six seconds
      // the trail drones follow the rocket with a lag each: at the start they are its flame, then its sparkling trail
      const lag = (k) => 0.03 + 0.5 * (k / f), side = (k) => (hash(k) - 0.5) * 0.07;
      // one smooth formula: the drone's flame offset fades out while the rocket picks it up (soft start, no jolt)
      const soft = (x) => (x + Math.sqrt(x * x + 0.0036)) / 2, fade = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
      const [d0x, d0y] = bezDir(P0, P1, P2, 0);
      const trailAt = (k, s) => { const l = lag(k), q = Math.max(0, soft(s - l) - soft(-l)), [x, y] = tail(q), [dx, dy] = bezDir(P0, P1, P2, q), back = l * 0.55 * (1 - fade(s / l)); return [x - dy * side(k) - d0x * back, y + dx * side(k) - d0y * back, (hash(k + 4) - 0.5) * 0.08]; };
      const rocketAt = (p, s) => { const [x, y] = rot(p[0], p[1], angle(s)), [cx, cy] = bez(P0, P1, P2, s); return [x + cx, y + cy, p[2] || 0]; };
      const start = [...paint(body.map((p) => rocketAt(p, 0)), WARM)], trail = paint(Array.from({ length: f }, (_, k) => trailAt(k, 0)), (q) => mix(GOLD, ORANGE, hash(q[0] * 97)));
      const flying = (b, j, t, o) => {
        const s = travel(t);
        if (j < r) { const [x, y, z] = rocketAt(body[j], s); o[0] = x; o[1] = y + (s >= 1 ? Math.sin((t - 6) * 0.9) * 0.025 : 0); o[2] = z; }
        else { const [x, y, z] = trailAt(j - r, s); o[0] = x; o[1] = y; o[2] = z; o[3] = sparkle(j, t); }
      };
      // the moon as a sphere with darker craters; the rocket stands on top
      const M = [0.62, 0.02], MR = 0.42, CRATERS = [[0.4, 0.5, 0.6], [-0.5, 0.1, 0.75], [0.1, -0.55, 0.8]].map((v) => v.map((q) => q / Math.hypot(...v)));
      const moonPts = paint(fib(f, MR, M[0], M[1]), (p) => { const v = [(p[0] - M[0]) / MR, (p[1] - M[1]) / MR, p[2] / MR]; return CRATERS.some((c) => c[0] * v[0] + c[1] * v[1] + c[2] * v[2] > 0.93) ? mix(MOON, [120, 118, 105], 0.55) : MOON; });
      const landed = place(local, scale, M[0], M[1] + MR + 0.25);
      // the solar system: the sun, two tilted orbits, three planets on them; the rocket circles on an outer orbit. Seen
      // from further away the rocket needs fewer drones (otherwise it becomes a white blot): the others join the sun.
      const r2 = Math.round(r * 0.55), [sunN, ring1, ring2, pl1, pl2, pl3] = share(n - r2, [80, 44, 60, 16, 16, 14]), far = rocket3d(r2);
      const S = [0, 0.02], orbit = (R, a, out = [0, 0, 0]) => { out[0] = S[0] + R * Math.cos(a); out[1] = S[1] + R * Math.sin(a) * 0.34; out[2] = R * Math.sin(a) * 0.95; return out; };
      const ringPts = (k, R) => Array.from({ length: k }, (_, i) => orbit(R, (i / k) * TAU));
      const PLANETS = [[0.64, 0.4, TAU / 12, 0.085, CYAN, pl1], [1.02, 2.4, TAU / 20, 0.1, ORANGE, pl2], [1.02, 5.2, TAU / 20, 0.075, BLUE, pl3]];
      const planetLocal = PLANETS.map(([, , , pr, , k]) => fib(k, pr));
      const planetPts = PLANETS.flatMap(([R, a0, , , colour], q) => paint(planetLocal[q].map(([x, y, z]) => { const c = orbit(R, a0); return [c[0] + x, c[1] + y, c[2] + z]; }), colour));
      const small = 0.32, R3 = 1.36, A3 = 0.9, W3 = TAU / 16, spot = [0, 0, 0];
      const orbiting = (p, a) => { orbit(R3, a, spot); const [dx, dy] = [-Math.sin(a) * R3, Math.cos(a) * R3 * 0.34], turn = -Math.atan2(dx, dy), [x, y] = rot(p[0] * small, p[1] * small, turn); return [spot[0] + x, spot[1] + y, spot[2] + (p[2] || 0) * small]; };
      const cosmos = [part("rocket", paint(far.map((p) => orbiting(p, A3)), WARM)), part("sun", paint(fib(sunN, 0.32, S[0], S[1]), (p) => mix(GOLD, ORANGE, (p[1] - S[1] + 0.32) / 0.64))),
        part("orbits", paint([...ringPts(ring1, 0.64), ...ringPts(ring2, 1.02)], WARM)), part("planets", planetPts)];
      const p0 = r2 + sunN + ring1 + ring2, firstOf = [p0, p0 + pl1, p0 + pl1 + pl2];
      return { beats: [
        act([part("rocket", start, { rigid: true }), part("trail", trail)], { caption: "Startklar", hold: 1.2, live: (b, j, t, o) => { if (j >= r) o[3] = sparkle(j, t); } }),
        act([part("rocket", start, { rigid: true }), part("trail", trail)], { caption: "die Rakete hebt ab und zieht ihre Spur", hold: 7, live: flying }),
        act([part("rocket", paint(landed, WARM), { rigid: true }), part("moon", moonPts)], { caption: "aus der Spur wird der Mond, die Rakete landet", hold: 2.2, live: (b, j, t, o) => { if (j >= r) yaw(o, t * 0.2, M[0], 0); } }),
        act(cosmos, { caption: "…und fliegt weiter durchs Sonnensystem", live: (b, j, t, o) => {
          const tt = t <= 0 ? 0 : t < 2.5 ? (t * t) / 5 : t - 1.25; // the orbits speed up gently over 2.5 s
          if (j < r2) { const [x, y, z] = orbiting(far[j], A3 + W3 * tt); o[0] = x; o[1] = y; o[2] = z; }
          else if (j < r2 + sunN) { yaw(o, t * 0.25, S[0], 0); o[3] = sparkle(j, t, 0.95, 1.35); }
          else if (j < p0) o[3] = 0.8;
          else { const q = j >= firstOf[2] ? 2 : j >= firstOf[1] ? 1 : 0, [R, a0, w] = PLANETS[q], c = orbit(R, a0 + w * tt), lp = planetLocal[q][j - firstOf[q]]; o[0] = c[0] + lp[0]; o[1] = c[1] + lp[1]; o[2] = c[2] + lp[2]; }
        } }),
      ] };
    }
    // ---- Launch · Logo ----
    case "logo": {
      const dots = logo.dots.length; // a light runs around the ring of the logo
      return { beats: [{ pts: logo2d(n), caption, live: (b, j, t, o) => { if (j >= dots) o[3] = 0.85 + 0.5 * Math.max(0, Math.cos(Math.atan2(b[1], b[0]) - t * 0.8)) ** 4; } }] };
    }
    case "logo3d": return { beats: [{ pts: logo3d(n), caption, live: (b, j, t, o) => { o[3] = glint(b[0] + b[1] * 0.4, t); sway(o, t, 0.35); } }] };
    case "logoStory": {
      const disk = paint(Array.from({ length: n }, (_, i) => { const r = 0.25 + 1.15 * Math.sqrt((i + 0.5) / n), a = i * 2.39996; return [Math.cos(a) * r, Math.sin(a) * r, Math.sin(i) * 0.15]; }), (p) => mix(GOLD, VIOLET, Math.hypot(p[0], p[1]) / 1.4));
      // the vortex spins up (inner drones a little faster than outer ones) and the picture forms in the same direction
      const spin = (t) => (t <= 0 ? t : t + 0.35 * Math.min(t, 2.6) ** 2 + 0.7 * 2.6 * Math.max(0, t - 2.6));
      const vortex = (caption) => ({ pts: disk, caption, hold: 2.4, live: (b, j, t, o) => roll(o, spin(t) * (0.24 / (0.3 + Math.hypot(b[0], b[1])))) });
      const ring = paint(torusSurface(n, 0.95, 0.3), (p) => mix(CYAN, VIOLET, (p[1] + 0.6) / 1.2));
      return { beats: [
        vortex("Ein Funkenwirbel"),
        { pts: logo3d(n), caption: "…dreht sich ein und wird zu eurem Logo", swirl: -0.9, hold: 3.4, live: (b, j, t, o) => sway(o, t, 0.3) },
        vortex("…löst sich wieder in einen Wirbel"),
        { pts: ring, caption: "…und wird zu einem Ring aus Licht in 3D", swirl: -0.6, hold: 3.4, live: (b, j, t, o) => yaw(o, t * 0.3) },
      ] };
    }
    // ---- Kultur · Maske ----
    case "masks": {
      const [trag, com] = maskPair(n);
      // the two masks sway against each other, like two actors on stage
      return { beats: [{ pts: [...paint(trag, RED), ...paint(com, GOLD)], caption, live: (b, j, t, o) => {
        const side = j < trag.length ? -1 : 1, [cx, cy] = side < 0 ? MASKS.tragedy : MASKS.comedy, ph = (t * TAU) / 7;
        roll(o, Math.sin(ph) * 0.07 * side, cx, cy); o[0] += Math.sin(ph) * 0.025 * side; o[1] += Math.cos(ph * 0.8) * 0.02 * side;
      } }] };
    }
    case "masks3d": { const [trag, com] = maskPair3d(n); return { beats: [{ pts: [...paint(trag, RED), ...paint(com, GOLD)], caption, live: (b, j, t, o) => sway(o, t, 0.35) }] }; }
    case "maskStory": {
      const [trag, com] = maskPair3d(n), pair = (t, c) => [part("tragedy", paint(t, RED), { rigid: true }), part("comedy", paint(c, GOLD), { rigid: true })];
      const apart = [trag.map(([x, y, z]) => [x - 0.62, y - 0.05, z + 0.25]), com.map(([x, y, z]) => [x + 0.55, y + 0.05, z - 0.15])];
      return { beats: [
        act([part("comedy", paint(mask3d(n, false), GOLD))], { caption: "Die Komödie", hold: 1.2, live: (b, j, t, o) => sway(o, t, 0.3) }),
        act(pair(...apart), { caption: "die Tragödie tritt dazu", hold: 1, live: (b, j, t, o) => sway(o, t, 0.3) }),
        act(pair(trag, com), { caption: "sie verbinden sich zum Theaterzeichen", hold: 1.6, live: (b, j, t, o) => { sway(o, t, 0.3); o[3] = glint(b[0], t, 3.4, 0.35); } }),
        { pts: await devil(n), caption: "…und werden zum Teufel aus unserer Show Bokkenrijders", live: (b, j, t, o) => { if (b[3] > 200 && b[4] > 100) o[3] = 0.8 + 0.5 * Math.abs(Math.sin(t * 1.5)); sway(o, t, 0.35); } },
      ] };
    }
    // ---- Kultur · Vorhang ----
    case "curtain": return { beats: [{ pts: paint(curtain(n, 0), RED), caption, live: (b, j, t, o) => billow(b, t, o) }] };
    case "curtainStar": {
      const [a, b] = share(n, [2, 1]);
      return { beats: [
        act([part("curtain", paint(curtain(n, 0), RED))], { caption: "Vorhang auf", hold: 3, live: opening(n) }),
        act([part("curtain", paint(curtain(a, 1), RED)), part("star", star3d(b))], { caption: "…ein 3D-Stern löst sich aus dem Vorhang", live: (bs, j, t, o) => { if (j < a) billow(bs, t, o); else { sway(o, t, 0.5, 8); o[3] = sparkle(j, t, 0.9, 1.3); } } }),
      ] };
    }
    case "curtainStory": {
      const [a, r, s] = share(n, [2, 0.9, 1.2]);
      return { beats: [
        act([part("curtain", paint(curtain(n, 0), RED))], { caption: "Vorhang auf", hold: 3, live: opening(n) }),
        act([part("curtain", paint(curtain(a, 1), RED)), part("rain", rain(r + s))], { caption: "aus dem Vorhang fällt Goldregen", hold: 3, live: (b, j, t, o) => { if (j < a) billow(b, t, o); else o[3] = chase(-b[1], t, 0.45, 0.55); } }),
        act([part("curtain", paint(curtain(a, 1), RED)), part("rain", rain(r, -0.2)), part("star", star3d(s, 0.4, 0, 0.3))], { caption: "…und ein Stern steigt daraus auf", live: (b, j, t, o) => {
          if (j < a) billow(b, t, o);
          else if (j < a + r) o[3] = chase(-b[1], t, 0.45, 0.55);
          else { yaw(o, t * 0.3); o[1] += Math.sin(t * 0.7) * 0.03; o[3] = sparkle(j, t, 0.9, 1.3); }
        } }),
      ] };
    }
    // ---- Silvester · Feuerwerk ----
    case "burst2d": return { beats: [{ pts: paint(burst2d(n), (p) => mix(GOLD, ORANGE, Math.hypot(p[0], p[1]))), caption, live: (b, j, t, o) => { roll(o, t * 0.12); o[3] = sparkle(j, t, 0.85, 1.25); } }] };
    case "burst3d": { const { pts, live } = shells(n); return { beats: [{ pts, caption, live }] }; }
    case "ballStory": {
      const R = 0.46, sphere = paint(fib(n, R, 0, 0.6), (p) => mix(GOLD, WARM, (p[2] + R) / (2 * R))), fireworks = shells(n);
      const spin = (o, t, w = 0.35) => { const y = o[1]; yaw(o, t * w); o[1] = y; };
      return { beats: [
        { pts: fireworks.pts, caption: "Feuerwerk in 3D", hold: 4.5, live: fireworks.live },
        { pts: sphere, caption: "die Funken sammeln sich zur Silvesterkugel", hold: 0.6, live: (b, j, t, o) => spin(o, t) },
        { pts: sphere, caption: "sie sinkt Sekunde um Sekunde", hold: 5.6, live: (b, j, t, o) => { spin(o, t); o[1] -= 0.8 * smooth(Math.max(0, t) / 5); } },
        { pts: paint(torusSurface(n, 0.85, 0.24).map(([x, y, z]) => [x, y - 0.2, z]), (p) => mix(GOLD, VIOLET, (p[2] + 0.8) / 1.6)), caption: "Mitternacht: sie öffnet sich zum Ring", hold: 3, live: (b, j, t, o) => yaw(o, t * 0.3) },
        { pts: paint(trefoil(n).map(([x, y, z]) => [x, y - 0.15, z]), (p) => mix(CYAN, PINK, (p[2] + 0.4) / 0.8)), caption: "…und verschlingt sich zum Knoten aus Licht", live: (b, j, t, o) => yaw(o, t * 0.25) },
      ] };
    }
    // ---- Silvester · Uhr ----
    case "clock": {
      const [rim, mh, hh] = share(n, [7, 1.4, 0.9]), pts = [...paint(clockDial(rim), WARM), ...paint(hand(mh, 0.72), GOLD), ...paint(hand(hh, 0.46), GOLD)];
      // the hands run from five to twelve up to midnight
      return { beats: [{ pts, caption, live: (b, j, t, o) => { if (j >= rim) roll(o, (1 - smooth(t / 8)) * (j < rim + mh ? 5 / 60 : 5 / 720) * TAU); } }] };
    }
    case "clock3d": {
      const [rim, mh, hh] = share(n, [7, 1.4, 0.9]), pts = [...paint(clockRim(rim, 0.3), WARM), ...paint(hand(mh, 0.72, 0.18), GOLD), ...paint(hand(hh, 0.46, 0.18), GOLD)];
      // the minute hand sweeps once in 20 s, the hour hand a twelfth of that
      return { beats: [{ pts, caption, live: (b, j, t, o) => { if (j >= rim) roll(o, -(j < rim + mh ? t / 20 : t / 240) * TAU); sway(o, t, 0.3); } }] };
    }
    case "clockStory": {
      const [rim, mh, hh, sp] = share(n, [4, 1, 0.7, 4]), C = [0, 0.3], K = 0.6, face = rim + mh + hh;
      const at = (pts) => place(pts, K, C[0], C[1]);
      const clock = part("clock", [...paint(at(clockRim(rim, 0.3)), WARM), ...paint(at(hand(mh, 0.72, 0.18)), GOLD), ...paint(at(hand(hh, 0.46, 0.18)), GOLD)]);
      const hands = (j, t, o, k) => { if (j >= rim && j < face) roll(o, (1 - smooth(t / k)) * (j < rim + mh ? 5 / 60 : 5 / 720) * TAU, C[0], C[1]); };
      const sparks = (pts, colour = GOLD) => part("sparks", paint(pts, colour));
      const glowRing = sampleOutline([circle(C[0], C[1], 1.12 * K, 120)], sp).map(([x, y]) => [x, y, 0]);
      const swarm = fib(sp, 1.5 * K, C[0], C[1]).map(([x, y, z], i) => [x + (hash(i) - 0.5) * 0.12, y, z]);
      const year = await words(String(new Date().getFullYear() + 1), sp, 0.62, 0, -0.62, 0.1);
      // two tilted rings crossing around the clock, like an atom; the sparks run along them
      const atom = (i, t) => { const q = i % 2, a = (Math.floor(i / 2) / Math.ceil(sp / 2)) * TAU + t * 0.5 * (q ? -1 : 1), tilt = q ? 0.5 : -0.5, x = Math.cos(a) * 1.0, y = Math.sin(a) * 0.32; return [C[0] + x * Math.cos(tilt) - y * Math.sin(tilt), C[1] + x * Math.sin(tilt) + y * Math.cos(tilt), Math.sin(a) * 0.9]; };
      // the champagne bottle, tilted towards the upper right; the cork pops and flies like the rocket, foam behind it
      const tilt = -0.55, B = [-0.4, -0.32], BK = 1.15, cn = 16;
      const bottle = place(paint(bottle3d(face), (p) => (p[1] > 0.3 ? GOLD : mix(WARM, [140, 230, 170], 0.5))), BK, B[0], B[1], 0, tilt);
      const corkLocal = cork(cn).map(([x, y, z]) => [x * 1.8, y * 1.8, z * 1.8]);
      const P0 = place([[0, 0.62, 0]], BK, B[0], B[1], 0, tilt)[0], dir = [-Math.sin(tilt), Math.cos(tilt)];
      const Q1 = [P0[0] + dir[0] * 0.8, P0[1] + dir[1] * 0.8], Q2 = [1.0, 0.78];
      const flight = (t) => smooth(Math.max(0, t - 0.9) / 2.6); // a short wait, then the pop
      const corkAt = (p, s) => { const [x, y] = place([p], BK, 0, 0, 0, tilt + s * TAU)[0], [cx, cy] = bez(P0, Q1, Q2, s); return [cx + x, cy + y, (p[2] || 0) * BK]; };
      const foamN = sp - cn, lagOf = (k) => 0.04 + 0.5 * (k / foamN), sideOf = (k) => (hash(k) - 0.5) * 0.12;
      const softC = (x) => (x + Math.sqrt(x * x + 0.0036)) / 2, fadeC = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
      const [e0x, e0y] = bezDir(P0, Q1, Q2, 0);
      const foamAt = (k, s) => { const l = lagOf(k), q = Math.max(0, softC(s - l) - softC(-l)), [x, y] = bez(P0, Q1, Q2, q), [dx, dy] = bezDir(P0, Q1, Q2, q), back = l * 0.45 * (1 - fadeC(s / l)); return [x - dy * sideOf(k) - e0x * back, y + dx * sideOf(k) - e0y * back, (hash(k + 4) - 0.5) * 0.1]; };
      const champagne = [part("clock", bottle), part("cork", paint(corkLocal.map((p) => corkAt(p, 0)), WARM), { rigid: true }), part("sparks", paint(Array.from({ length: foamN }, (_, k) => foamAt(k, 0)), (q) => mix(GOLD, WARM, hash(q[0] * 53))))];
      return { beats: [
        act([clock, sparks(glowRing)], { caption: "Fünf vor zwölf", hold: 4.2, live: (b, j, t, o) => { hands(j, t, o, 4); if (j >= face) o[3] = breathe(t); } }),
        act([clock, sparks(swarm, (p) => mix(GOLD, ORANGE, hash(p[0] * 31)))], { caption: "Mitternacht: die Funken schwärmen aus", hold: 2.6, live: (b, j, t, o) => {
          if (j >= face) { yaw(o, t * 0.35, C[0], 0); o[3] = sparkle(j, t); } else if (j < rim) o[3] = breathe(t, 1.6);
        } }),
        act([clock, sparks(year)], { caption: "sie schreiben das neue Jahr", hold: 2.6, live: (b, j, t, o) => { if (j >= face) o[3] = sparkle(j, t, 0.95, 1.3); } }),
        act([clock, sparks(Array.from({ length: sp }, (_, i) => atom(i, 0)), (p) => mix(GOLD, PINK, (p[2] + 0.9) / 1.8))], { caption: "wirbeln wieder um die Uhr", hold: 3, live: (b, j, t, o) => {
          if (j >= face) { const [x, y, z] = atom(j - face, t); o[0] = x; o[1] = y; o[2] = z; o[3] = sparkle(j, t); }
        } }),
        act(champagne, { caption: "…und der Korken knallt", live: (b, j, t, o) => {
          const s = flight(t);
          if (j >= face && j < face + cn) { const [x, y, z] = corkAt(corkLocal[j - face], s); o[0] = x; o[1] = y + (s >= 1 ? Math.sin((t - 3.5) * 0.9) * 0.02 : 0); o[2] = z; }
          else if (j >= face + cn) { const [x, y, z] = foamAt(j - face - cn, s); o[0] = x; o[1] = y; o[2] = z; o[3] = sparkle(j, t, 0.85, 1.3); }
        } }),
      ] };
    }
    default: return { beats: [{ pts: [], caption: "" }] };
  }
}
