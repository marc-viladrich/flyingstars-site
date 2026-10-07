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
import { share, twoRings, shield, shield3d, crown, rocket, rocket3d, maskPair, maskPair3d, mask3d, curtain, clockRim, clockFace, hand, burst2d, sparkleShell, tower, tower3d, waves, TOWER_SPHERE, gate3d, moon, arrowPaths, inside } from "./show-shapes.js";

let hearts = null, figure = null;
const loadHearts = () => (hearts ||= import("./pricing-formations.js").then((m) => m.default).catch((e) => { hearts = null; throw e; }));
const loadFigure = () => (figure ||= fetch("/media/projekte/bokkenrijders/formation.json").then((r) => { if (!r.ok) throw new Error(`Formation HTTP ${r.status}`); return r.json(); }).catch((e) => { figure = null; throw e; }));
/** Loads the larger formation sources ahead of need, e.g. on the first interaction with the configurator. */
export function preloadScenes() { loadHearts().catch(() => {}); loadFigure().catch(() => {}); loadTextEngine().catch(() => {}); }

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
/** Heartbeat in light: a double flash every period seconds. */
const beatLight = (t, period = 1.2) => { const u = frac(t / period); return 0.55 + 0.45 * Math.max(Math.exp(-(((u - 0.08) / 0.05) ** 2)), 0.75 * Math.exp(-(((u - 0.3) / 0.05) ** 2))); };
/** A band of light travelling across a coordinate. */
const glint = (x, t, period = 3.6, low = 0.6, from = -1.4, to = 1.4) => low + (1 - low) * Math.exp(-(((x - (from + (to - from) * frac(t / period))) / 0.2) ** 2));
/** Sparkle: every drone flickers at its own pace. */
const sparkle = (j, t, low = 0.5) => low + (1 - low) * (0.5 + 0.5 * Math.sin(t * (2.5 + 4 * hash(j)) + hash(j + 7) * 20));
/** Light running along a coordinate in one direction (rain falling, rockets rising, waves spreading). */
const chase = (x, t, speed, spacing = 0.5, low = 0.4) => low + (1 - low) * Math.exp(-((((frac((x - t * speed) / spacing) - 0.5) * spacing) / 0.07) ** 2));

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
const ringShell = (n, cx, cy, R) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU, rr = R * (0.55 + 0.45 * ((i % 3) / 2)); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.45, Math.sin(a) * rr * 0.6]; });
/**
 * A firework shell the way drones can fly it: from a compact ball (never one point) the drones spread slowly to the
 * shell and gather again; the light is bright while the shell opens and dark while it closes, so it reads as one
 * burst after the other.
 */
function bloom(out, base, t, { cx = 0, cy = 0, period = 12, delay = 0, rmin = 0.3 }) {
  const w = (TAU * (t - delay)) / period, r = rmin + (1 - rmin) * 0.5 * (1 - Math.cos(w));
  out[0] = cx + (base[0] - cx) * r; out[1] = cy + (base[1] - cy) * r; out[2] = (base[2] || 0) * r;
  out[3] = Math.sin(w) > 0 ? 0.35 + 0.65 * Math.sin(w) ** 0.6 : 0.35;
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

/** Pictures for one motif version (name from show-configurator.js) at the given drone count. HORIZON and ODYSSEY
 * versions get the soft light shimmer on every act (Marc: "Lichtschimmer ist eine sehr gute Interaktion"). */
export async function buildScene(version, n) {
  const scene = await buildBeats(version, n);
  if (scene.beats.length > 1 || scene.beats.some((b) => b.live)) for (const b of scene.beats) b.shimmer ??= true;
  return scene;
}
async function buildBeats(version, n) {
  switch (version.build) {
    // ---- Hochzeit · Herz ----
    case "heart2d": return still(paint(heartLine(n), PINK), version.caption);
    case "heart3d": return { beats: [{ pts: paint(await heart3d(n), heartColour), caption: version.caption, live: (b, j, t, o) => { o[3] = beatLight(t); sway(o, t); } }] };
    case "heartsStory": {
      const [h, a] = share(n, [5, 1]), [m, s1, s2, s3] = share(h, [7, 1, 1, 1]);
      // the classic illustration: Amor's arrow through the heart, tip at the lower left, fletching out at the upper right
      const arrowPts = (dx, dy) => sampleOutline(arrowPaths(-1.05 + dx, -0.6 + dy, 1.4 + dx, 0.82 + dy), a).map(([x, y]) => [x, y, 0.05]);
      const outsideHeart = (k) => evenSubset(sampleOutline(arrowPaths(-1.05, -0.6, 1.4, 0.82), k * 5).filter(([x, y]) => !inside(HEART_POLY, x, y)).map(([x, y]) => [x, y, 0.05]), k);
      const arrow = (pts, rigid = true) => part("arrow", paint(pts, GOLD), { rigid });
      const pierced = outsideHeart(a), big = await heart3d(h), small = await heart3d(Math.max(s1, s2, s3));
      const sats = [s1, s2, s3].flatMap((k, q) => place(small.slice(0, k), 0.28, Math.cos((q / 3) * TAU) * 1.45, 0.15, Math.sin((q / 3) * TAU) * 1.45));
      return { beats: [
        act([part("heart", paint(heartLine(h), PINK)), arrow(arrowPts(0.75, 0.45))], { caption: "Ein Herz, Amor zielt", hold: 0.8 }),
        act([part("heart", paint(heartLine(h), PINK)), arrow(arrowPts(0, 0))], { caption: "der Pfeil fliegt", hold: 0, lift: [-0.04, 0.16] }),
        act([part("heart", paint(heartLine(h), PINK)), arrow(pierced, false)], { caption: "und trifft", hold: 1.6 }),
        act([part("heart", paint(big, heartColour)), arrow(pierced)], { caption: "das Herz wird voll und leuchtet im Takt", hold: 2.4, live: (b, j, t, o) => { if (j < h) { o[3] = beatLight(t); sway(o, t, 0.25); } } }),
        act([part("heart", paint(evenSubset(big, m), heartColour)), part("small", paint(sats, PINK)), arrow(pierced)], { caption: "…und kleine Herzen kreisen im Takt", live: (b, j, t, o) => {
          if (j < m) { o[3] = beatLight(t); sway(o, t, 0.25); }
          else if (j < h) { yaw(o, t * 0.18); o[3] = beatLight(t + 0.2); } // the small hearts orbit the big one, slowly
        } }),
      ] };
    }
    // ---- Hochzeit · Ringe ----
    case "rings2d": return still(paint(twoRings(n), GOLD), version.caption);
    case "rings3d": {
      const per = Math.floor(n / 2), pts = paint(torusPair(n), (p) => mix(GOLD, WARM, (p[2] + 1) / 2));
      return { beats: [{ pts, caption: version.caption, live: (b, j, t, o) => {
        const ang = j < per ? Math.atan2(b[1], b[0] + 0.6) : Math.atan2(b[2], b[0] - 0.6); // light runs around each ring
        o[3] = 0.45 + 0.55 * Math.max(0, Math.cos(ang - t * 1.6 * (j < per ? 1 : -1))) ** 3;
        sway(o, t, 0.35);
      } }] };
    }
    case "ringsStory": {
      const [rp, sp] = share(n, [3, 1]), per = Math.floor(rp / 2);
      return { beats: [
        { pts: paint(sampleOutline([circle(0, 0, 0.62, 120)], n).map(([x, y]) => [x, y, 0]), GOLD), caption: "Ein Ring", hold: 1.2 },
        { pts: paint(twoRings(n), GOLD), caption: "findet den zweiten", hold: 1.6 },
        { pts: [...paint(torusPair(rp), (p) => mix(GOLD, WARM, (p[2] + 1) / 2)), ...paint(sparkleShell(sp, 1.9), WARM)], caption: "…und sie verschlingen sich in 3D, umgeben von Funkeln", live: (b, j, t, o) => {
          if (j < rp) { const ang = j < per ? Math.atan2(b[1], b[0] + 0.6) : Math.atan2(b[2], b[0] - 0.6); o[3] = 0.45 + 0.55 * Math.max(0, Math.cos(ang - t * 1.6)) ** 3; }
          else o[3] = sparkle(j, t);
          sway(o, t, 0.3);
        } },
      ] };
    }
    // ---- Jubiläum · Wappen ----
    case "shield": return still(paint(shield(n), WARM), version.caption);
    case "shield3d": {
      const [a, b] = share(n, [3, 1]), pts = [...paint(shield3d(a), WARM), ...paint(await words("125", b, 0.38, 0, 0.05, 0.2), GOLD)];
      return { beats: [{ pts, caption: version.caption, live: (bs, j, t, o) => { o[3] = glint(bs[0] + bs[1] * 0.5, t); sway(o, t, 0.35); } }] };
    }
    case "shieldStory": {
      const [a, b, c, d] = share(n, [5, 2.2, 1.2, 1.6]);
      const number = await words("125", b, 0.38, 0, 0.05, 0.2);
      const wreath = Array.from({ length: d }, (_, i) => { const ang = (i / d) * TAU; return [Math.cos(ang) * 1.25, 0.02 + Math.sin(ang) * 1.12, 0]; });
      return { beats: [
        act([part("shield", paint(shield3d(n), WARM))], { caption: "Das Wappen", hold: 1.2, live: (bs, j, t, o) => sway(o, t, 0.3) }),
        act([part("shield", paint(shield3d(n - b), WARM)), part("number", paint(place(number, 1, 0, 0, 0.45), GOLD))], { caption: "eure Zahl tritt hervor", hold: 1.4, live: (bs, j, t, o) => sway(o, t, 0.3) }),
        act([part("shield", paint(shield3d(a), WARM)), part("number", paint(place(number, 1, 0, 0, 0.3), GOLD)), part("crown", paint(crown(c, 0.95), GOLD)), part("wreath", paint(wreath, GOLD))], { caption: "…mit Krone und kreisendem Sternenkranz", live: (bs, j, t, o) => {
          if (j >= a + b + c) { roll(o, t * 0.12, 0, 0.02); o[3] = sparkle(j, t, 0.5); } // the wreath turns slowly around the crest
          else if (j >= a + b) o[3] = glint(bs[0], t, 3, 0.6);
          sway(o, t, 0.25);
        } }),
      ] };
    }
    // ---- Jubiläum · Wahrzeichen (Berliner Fernsehturm) ----
    case "tower": return still(paint(tower(n), (p) => (p[1] > 1.15 ? RED : WARM)), version.caption);
    case "tower3d": return { beats: [{ pts: paint(tower3d(n), (p) => (p[1] > 1.15 ? RED : p[1] > 0.25 && p[1] < 0.62 ? mix(WARM, CYAN, 0.35) : WARM)), caption: version.caption, live: (b, j, t, o) => {
      if (b[1] > 0.25 && b[1] < 0.62) o[3] = glint(Math.atan2(b[2], b[0]), t, 4, 0.55, -Math.PI, Math.PI); // light runs around the sphere
      else if (b[1] > 1.15) o[3] = 0.4 + 0.6 * (frac(t / 1.6) < 0.15 ? 1 : 0); // red warning light at the top
      yaw(o, t * 0.2);
    } }] };
    case "towerStory": {
      const [a, w] = share(n, [2, 1]);
      const towerPaint = (p) => (p[1] > 1.15 ? RED : p[1] > 0.25 && p[1] < 0.62 ? mix(WARM, CYAN, 0.35) : WARM);
      return { beats: [
        { pts: paint(tower3d(n), towerPaint), caption: "Der Fernsehturm", hold: 1.4, live: (b, j, t, o) => sway(o, t, 0.3) },
        { pts: [...paint(tower3d(a), towerPaint), ...paint(waves(w), CYAN)], caption: "sendet über die Stadt", hold: 3, live: (b, j, t, o) => {
          if (j >= a) o[3] = chase(Math.hypot(b[0] - TOWER_SPHERE[0], b[1] - TOWER_SPHERE[1]), t, 0.25, 0.6); // waves spread outward in light
          sway(o, t, 0.25);
        } },
        { pts: paint(gate3d(n), (p) => (p[1] > 0.56 ? GOLD : WARM)), caption: "…und wird zum Brandenburger Tor", live: (b, j, t, o) => { o[3] = glint(b[0], t, 4, 0.65); sway(o, t, 0.3); } },
      ] };
    }
    // ---- Launch · Rakete ----
    case "rocket": return still(paint(rocket(n), WARM), version.caption);
    case "rocket3d": return { beats: [{ pts: paint(rocket3d(n), (p) => mix(WARM, CYAN, (p[2] + 0.2) / 0.4)), caption: version.caption, live: (b, j, t, o) => { yaw(o, t * 0.25); o[1] += Math.sin(t * 0.6) * 0.04; } }] };
    case "rocketStory": {
      const [r, f] = share(n, [3, 2]);
      const P0 = [-0.95, -0.62], P1 = [-0.9, 0.5], P2 = [0.55, 0.78], scale = 0.42;
      const body = place(rocket3d(r), scale); // nose up, the nozzle at about y = −0.24
      // the rocket follows its path and straightens up before landing
      const angle = (s) => { const [dx, dy] = bezDir(P0, P1, P2, s); return -Math.atan2(dx, dy) * (1 - smooth((s - 0.7) / 0.3)); };
      const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
      const tail = (s) => { const [cx, cy] = bez(P0, P1, P2, s), [tx, ty] = rot(0, -0.27, angle(s)); return [cx + tx, cy + ty]; };
      const travel = (t) => smooth(Math.max(0, t) / 6); // the flight takes six seconds
      // the trail drones follow the rocket with a lag each: at the start they are its flame, then its sparkling trail
      const lag = (k) => 0.03 + 0.5 * (k / f), side = (k) => (hash(k) - 0.5) * 0.07;
      // one smooth formula: the drone's flame offset fades out while the rocket picks it up (soft start, no jolt)
      const soft = (x) => (x + Math.sqrt(x * x + 0.0036)) / 2, fade = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
      const [d0x, d0y] = bezDir(P0, P1, P2, 0);
      const trailAt = (k, s) => { const l = lag(k), q = Math.max(0, soft(s - l) - soft(-l)), [x, y] = tail(q), [dx, dy] = bezDir(P0, P1, P2, q), back = l * 0.55 * (1 - fade(s / l)); return [x - dy * side(k) - d0x * back, y + dx * side(k) - d0y * back, (hash(k + 4) - 0.5) * 0.08]; };
      const rocketAt = (p, s) => { const [x, y] = rot(p[0], p[1], angle(s)), [cx, cy] = bez(P0, P1, P2, s); return [x + cx, y + cy, p[2] || 0]; };
      const start = [...paint(body.map((p) => rocketAt(p, 0)), WARM)], flame = paint(Array.from({ length: f }, (_, k) => trailAt(k, 0)), (q) => mix(GOLD, ORANGE, hash(q[0] * 97)));
      const moonC = [0.68, 0.16], moonR = 0.34, landed = place(body, 1, moonC[0], moonC[1] + moonR + 0.25);
      const flying = (b, j, t, o) => {
        const s = travel(t);
        if (j < r) { const [x, y, z] = rocketAt(body[j], s); o[0] = x; o[1] = y + (s >= 1 ? Math.sin((t - 6) * 0.9) * 0.025 : 0); o[2] = z; }
        else { const [x, y, z] = trailAt(j - r, s); o[0] = x; o[1] = y; o[2] = z; o[3] = sparkle(j, t); }
      };
      return { beats: [
        act([part("rocket", start, { rigid: true }), part("trail", flame)], { caption: "Startklar", hold: 1.2, live: (b, j, t, o) => { if (j >= r) o[3] = sparkle(j, t); } }),
        act([part("rocket", start, { rigid: true }), part("trail", flame)], { caption: "die Rakete hebt ab und zieht ihre Spur", hold: 7, live: flying }),
        act([part("rocket", paint(landed, WARM), { rigid: true }), part("moon", paint(moon(f, moonC[0], moonC[1], moonR), MOON))], { caption: "…aus der Spur wird der Mond, die Rakete landet", live: (b, j, t, o) => { if (j < r) o[1] += Math.sin(t * 0.7) * 0.012; } }),
      ] };
    }
    // ---- Launch · Logo ----
    case "logo": return still(logo2d(n), version.caption);
    case "logo3d": return { beats: [{ pts: logo3d(n), caption: version.caption, live: (b, j, t, o) => { o[3] = glint(b[0] + b[1] * 0.4, t); sway(o, t, 0.35); } }] };
    case "logoStory": {
      const disk = paint(Array.from({ length: n }, (_, i) => { const r = 0.25 + 1.15 * Math.sqrt((i + 0.5) / n), a = i * 2.39996; return [Math.cos(a) * r, Math.sin(a) * r, Math.sin(i) * 0.15]; }), (p) => mix(GOLD, VIOLET, Math.hypot(p[0], p[1]) / 1.4));
      // a slow vortex: inner drones turn a little faster than outer ones
      const vortex = (caption) => ({ pts: disk, caption, hold: 2.4, live: (b, j, t, o) => roll(o, t * (0.16 / (0.3 + Math.hypot(b[0], b[1])))) });
      const ring = paint(torusSurface(n, 0.95, 0.3), (p) => mix(CYAN, VIOLET, (p[1] + 0.6) / 1.2));
      return { loopTo: 0, beats: [
        vortex("Ein Funkenwirbel"),
        { pts: logo3d(n), caption: "…dreht sich ein und wird zu eurem Logo", swirl: 0.4, hold: 3.4, live: (b, j, t, o) => sway(o, t, 0.3) },
        vortex("…löst sich wieder in einen Wirbel"),
        { pts: ring, caption: "…und wird zu einem Ring aus Licht in 3D", swirl: 0.4, hold: 3.4, live: (b, j, t, o) => yaw(o, t * 0.3) },
      ] };
    }
    // ---- Kultur · Maske ----
    case "masks": { const [trag, com] = maskPair(n); return still([...paint(trag, RED), ...paint(com, GOLD)], version.caption); }
    case "masks3d": { const [trag, com] = maskPair3d(n); return { beats: [{ pts: [...paint(trag, RED), ...paint(com, GOLD)], caption: version.caption, live: (b, j, t, o) => sway(o, t, 0.35) }] }; }
    case "maskStory": return { beats: [
      { pts: paint(mask3d(n, false), GOLD), caption: "Die Komödie", hold: 1.6, live: (b, j, t, o) => sway(o, t, 0.3) },
      { pts: paint(mask3d(n, true), RED), caption: "wird zur Tragödie", hold: 1.6, live: (b, j, t, o) => sway(o, t, 0.3) },
      { pts: await devil(n), caption: "…und zum Teufel aus unserer Show Bokkenrijders", live: (b, j, t, o) => { if (b[3] > 200 && b[4] > 100) o[3] = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5)); sway(o, t, 0.35); } },
    ] };
    // ---- Kultur · Vorhang ----
    case "curtain": return still(paint(curtain(n, 0), RED), version.caption);
    case "curtainStar": {
      const [a, b] = share(n, [2, 1]);
      return { beats: [
        { pts: paint(curtain(n, 0), RED), caption: "Vorhang zu", hold: 1 },
        { pts: [...paint(curtain(a, 1), RED), ...star3d(b)], caption: "Vorhang auf für einen 3D-Stern", live: (bs, j, t, o) => { if (j >= a) { sway(o, t, 0.5, 8); o[3] = sparkle(j, t, 0.7); } } },
      ] };
    }
    case "curtainStory": {
      const [a, r, s] = share(n, [2, 1.2, 0.9]);
      const xs = Array.from({ length: 12 }, (_, i) => -0.55 + (i / 11) * 1.1);
      const rain = (k) => paint(columns(k, xs, -0.8, 0.78, (c) => Math.sin(c * 2.1) * 0.4), GOLD);
      // the drapes move gently like cloth in a breeze; the rain falls in light along columns that stay in place
      const billow = (b, t, o) => { if (b[1] < 0.82) { const depth = (0.82 - b[1]) / 1.66; o[0] += Math.sin(b[1] * 3 - t * 0.9) * 0.04 * depth; o[2] += Math.cos(b[1] * 2.5 - t * 0.8) * 0.08 * depth; } };
      return { beats: [
        act([part("curtain", paint(curtain(n, 0), RED))], { caption: "Vorhang zu", hold: 1 }),
        act([part("curtain", paint(curtain(a, 1), RED)), part("rain", rain(r + s))], { caption: "Vorhang auf, Goldregen fällt", hold: 3, live: (b, j, t, o) => { if (j < a) billow(b, t, o); else o[3] = chase(-b[1], t, 0.45, 0.55); } }),
        act([part("curtain", paint(curtain(a, 1), RED)), part("rain", rain(r)), part("star", star3d(s, 0.42, 0, 0.1))], { caption: "…und ein Stern steigt daraus auf", live: (b, j, t, o) => {
          if (j < a) billow(b, t, o);
          else if (j < a + r) o[3] = chase(-b[1], t, 0.45, 0.55);
          else { yaw(o, t * 0.3); o[1] += Math.sin(t * 0.7) * 0.03; }
        } }),
      ] };
    }
    // ---- Silvester · Feuerwerk ----
    case "burst2d": return still(paint(burst2d(n), (p) => mix(GOLD, ORANGE, Math.hypot(p[0], p[1]))), version.caption);
    case "burst3d": return { beats: [{ pts: paint(shell(n, 0, 0, 1), (p) => mix(GOLD, VIOLET, Math.hypot(p[0], p[1], p[2]))), caption: version.caption, live: (b, j, t, o) => bloom(o, b, t, {}) }] };
    case "ballStory": {
      const GA = Math.PI * (3 - Math.sqrt(5)), R = 0.46; // an evenly covered sphere surface, like a mirror ball
      const sphere = paint(Array.from({ length: n }, (_, i) => { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), a = GA * i; return [Math.cos(a) * r * R, y * R + 0.6, Math.sin(a) * r * R]; }), (p) => mix(GOLD, WARM, (p[2] + R) / (2 * R)));
      const spin = (o, t, w = 0.35, cy = 0) => { const y = o[1]; yaw(o, t * w); o[1] = y; };
      return { beats: [
        { pts: sphere, caption: "Die Silvesterkugel", hold: 0.6, live: (b, j, t, o) => spin(o, t) },
        { pts: sphere, caption: "sinkt Sekunde um Sekunde", hold: 5.6, live: (b, j, t, o) => { spin(o, t); o[1] -= 0.8 * smooth(Math.max(0, t) / 5); } },
        { pts: paint(torusSurface(n, 0.85, 0.24).map(([x, y, z]) => [x, y - 0.2, z]), (p) => mix(GOLD, VIOLET, (p[2] + 0.8) / 1.6)), caption: "Mitternacht: sie öffnet sich zum Ring", hold: 3, live: (b, j, t, o) => yaw(o, t * 0.3) },
        { pts: paint(trefoil(n).map(([x, y, z]) => [x, y - 0.15, z]), (p) => mix(CYAN, PINK, (p[2] + 0.4) / 0.8)), caption: "…und verschlingt sich zum Knoten aus Licht", live: (b, j, t, o) => yaw(o, t * 0.25) },
      ] };
    }
    // ---- Silvester · Uhr ----
    case "clock": return still(paint(clockFace(n, 5), WARM), version.caption);
    case "clock3d": {
      const [rim, mh, hh] = share(n, [7, 1.4, 0.9]), pts = [...paint(clockRim(rim, 0.3), WARM), ...paint(hand(mh, 0.72, 0.18), GOLD), ...paint(hand(hh, 0.46, 0.18), GOLD)];
      // the minute hand sweeps once in 20 s, the hour hand a twelfth of that
      return { beats: [{ pts, caption: version.caption, live: (b, j, t, o) => { if (j >= rim) roll(o, -(j < rim + mh ? t / 20 : t / 240) * TAU); sway(o, t, 0.3); } }] };
    }
    case "clockStory": {
      const [rim, mh, hh, sp] = share(n, [5.5, 1.2, 0.8, 2.5]);
      const clock = [...paint(clockRim(rim, 0.3), WARM), ...paint(hand(mh, 0.72, 0.18), GOLD), ...paint(hand(hh, 0.46, 0.18), GOLD)];
      const glowRing = paint(sampleOutline([circle(0, 0, 1.12, 120)], sp).map(([x, y]) => [x, y, 0]), GOLD); // a soft ring around the dial
      const halo = paint(Array.from({ length: sp }, (_, i) => { const a = (i / sp) * TAU, R = 1.45 + 0.15 * hash(i); return [Math.cos(a) * R, Math.sin(a) * R, (hash(i + 9) - 0.5) * 0.5]; }), (p) => mix(GOLD, ORANGE, Math.abs(p[2]) * 2));
      return { beats: [
        act([part("clock", clock), part("sparks", glowRing)], { caption: "Fünf vor zwölf", hold: 0.6, live: (b, j, t, o) => {
          if (j >= rim && j < rim + mh) roll(o, (1 - smooth(t / 6)) * (5 / 60) * TAU);
          else if (j >= rim + mh && j < rim + mh + hh) roll(o, (1 - smooth(t / 6)) * (5 / 720) * TAU);
          else if (j >= rim + mh + hh) o[3] = 0.55;
          sway(o, t, 0.18);
        } }),
        act([part("clock", clock), part("sparks", halo)], { caption: "…Mitternacht: die Funken schwärmen aus", live: (b, j, t, o) => {
          if (j >= rim + mh + hh) o[3] = sparkle(j, t);
          else if (j < rim) o[3] = 0.65 + 0.35 * Math.abs(Math.sin(t * 2));
          sway(o, t, 0.18);
        } }),
      ] };
    }
    default: return { beats: [{ pts: [], caption: "" }] };
  }
}
