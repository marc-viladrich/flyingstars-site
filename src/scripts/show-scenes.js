// The 30 motif versions of the configurator: SPARK a still 2D picture, HORIZON one 3D object that moves on its own,
// ODYSSEY a short story in acts with flowing effects. Every beat uses exactly the package's drone count.
// A scene is { beats: [{ pts, live?, hold?, caption }] } (see show-field.js); live(base, index, t, out) moves a drone
// around its resting place, t = seconds since the beat formed (negative while the drones still fly in).
// Sources: FlyingStars' heart formations, the FlyingStars mark, the real Bokkenrijders show file, the text planner
// and the line drawings in show-shapes.js; motifs and pacing follow FlyingStars' published show videos.
import logo from "../data/logo-dots.json";
import { heartPicture } from "./heart-formation.js";
import { loadTextEngine, textFormation } from "./text-formation.js";
import { burstSphere, star, extrude, evenSubset, sampleOutline, circle, torusPair, heartOutline } from "./show-geometry.js";
import { share, proposal, twoRings, shield, shield3d, crown, zollverein, frame3d, WHEELS, wheel, rocket, rocket3d, masks, masks3d, mask3d, curtain, clockRim, clockFace, hand, burst2d, torusRing } from "./show-shapes.js";

let hearts = null, figure = null;
const loadHearts = () => (hearts ||= import("./pricing-formations.js").then((m) => m.default).catch((e) => { hearts = null; throw e; }));
const loadFigure = () => (figure ||= fetch("/media/projekte/bokkenrijders/formation.json").then((r) => { if (!r.ok) throw new Error(`Formation HTTP ${r.status}`); return r.json(); }).catch((e) => { figure = null; throw e; }));
/** Loads the larger formation sources ahead of need, e.g. on the first interaction with the configurator. */
export function preloadScenes() { loadHearts().catch(() => {}); loadFigure().catch(() => {}); loadTextEngine().catch(() => {}); }

const WARM = [246, 241, 232], GOLD = [255, 196, 92], PINK = [255, 92, 138], VIOLET = [219, 100, 232], CYAN = [51, 237, 242], BLUE = [90, 120, 255], ORANGE = [255, 140, 50], RED = [220, 60, 70];
const TAU = Math.PI * 2;
const mix = (a, b, u) => { const k = Math.max(0, Math.min(1, u)); return a.map((v, i) => Math.round(v + (b[i] - v) * k)); };
const paint = (pts, color) => pts.map((p) => [p[0], p[1], p[2] || 0, ...(typeof color === "function" ? color(p) : color)]);
const move = (pts, s, dx = 0, dy = 0, dz = 0) => pts.map(([x, y, z = 0, ...c]) => [x * s + dx, y * s + dy, z * s + dz, ...c]);
const frac = (x) => x - Math.floor(x);
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

// ---------- live motion building blocks (all write into out = [x, y, z, alpha]) ----------
/** Turn about the vertical axis through (cx, cz). */
function yaw(out, a, cx = 0, cz = 0) { const x = out[0] - cx, z = out[2] - cz, c = Math.cos(a), s = Math.sin(a); out[0] = cx + x * c + z * s; out[2] = cz - x * s + z * c; }
/** Turn in the picture plane about (cx, cy). */
function roll(out, a, cx = 0, cy = 0) { const x = out[0] - cx, y = out[1] - cy, c = Math.cos(a), s = Math.sin(a); out[0] = cx + x * c - y * s; out[1] = cy + x * s + y * c; }
/** Gentle sway: the object turns a little to each side, which shows its depth better than a full turn. */
const sway = (out, t, amp = 0.45, period = 7, cx = 0, cz = 0) => yaw(out, Math.sin((t * TAU) / period) * amp, cx, cz);
/** Heartbeat: a double thump every period seconds. */
const thump = (t, period = 1.15) => { const u = frac(t / period); return 1 + 0.08 * Math.exp(-(((u - 0.08) / 0.05) ** 2)) + 0.05 * Math.exp(-(((u - 0.3) / 0.05) ** 2)); };
/** A band of light travelling across: alpha between low and 1. */
const glint = (x, t, period = 3.2, low = 0.55, from = -1.4, to = 1.4) => { const c = from + (to - from) * frac(t / period); return low + (1 - low) * Math.exp(-(((x - c) / 0.18) ** 2)); };
/**
 * A firework shell bursting from (cx, cy, cz): every drone flies outward along its direction (base − centre),
 * slows down, sinks a little and fades; then the shell starts again from the centre.
 */
function burst(out, base, j, t, { cx = 0, cy = 0, cz = 0, period = 3.4, delay = 0, droop = 0.25, spread = 0.05 } = {}) {
  const u = frac((t - delay) / period + ((j * 0.618) % 1) * spread), r = 1 - (1 - u) ** 3;
  out[0] = cx + (base[0] - cx) * r; out[1] = cy + (base[1] - cy) * r - droop * u * u; out[2] = cz + ((base[2] || 0) - cz) * r;
  out[3] = u < 0.06 ? 0.4 + (u / 0.06) * 0.6 : Math.max(0, 1 - ((u - 0.06) / 0.94) ** 1.4);
}
/** Drones flowing along y between y0 and y1 (rain, sparks, exhaust); base keeps x/z, its y sets the phase. */
function stream(out, base, t, { y0, y1, speed = 0.35, widen = 0, cx = 0, vary = 0, j = 0 }) {
  const v = speed * (1 + vary * (((j * 0.7548776662) % 1) - 0.5) * 2), span = y1 - y0, u = frac((base[1] - y0) / span + (t * v) / Math.abs(span));
  out[1] = y0 + span * u; out[0] = cx + (base[0] - cx) * (1 + widen * u);
  out[3] = Math.min(1, u * 6, (1 - u) * 4);
}

// ---------- sources ----------
/** FlyingStars' 3D heart (honeycomb half-shell for 290 drones), unit size, thinned evenly to n. */
async function heart3d(n) {
  const pic = heartPicture(await loadHearts(), 290);
  const pts = pic.hearts.filter((h) => h.slot === 0).flatMap((h) => h.pts), mx = Math.max(...pts.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1]))));
  return evenSubset(pts.map(([x, y, z]) => [x / mx, y / mx - 0.1, z / mx]), n);
}
const heartColour = (p) => mix(PINK, VIOLET, (p[2] + 0.3) / 0.6);
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
const star3d = (n, s = 0.5, dx = 0, dy = 0) => move(paint(extrude(star(n), n, 0.35), GOLD), s, dx, dy);
/** Evenly spread points in a box (glitter rain, exhaust and sparks start from here). */
const volume = (n, [x0, x1], [y0, y1], [z0, z1]) => Array.from({ length: n }, (_, i) => [x0 + (x1 - x0) * ((i * 0.618034) % 1), y0 + (y1 - y0) * ((i + 0.5) / n), z0 + (z1 - z0) * ((i * 0.381966) % 1)]);
/** Glitter rain: drones in loose columns at different depths; each column starts at its own height. */
const rain = (n) => Array.from({ length: n }, (_, i) => { const col = i % 23, h = ((i * 0.6180339) % 1); return [-0.6 + (col / 22) * 1.2 + Math.sin(i * 12.9898) * 0.025, -0.8 + 1.6 * h, Math.sin(col * 2.1) * 0.45]; });
/** Shell burst end positions around (cx, cy) with radius R. */
const shell = (n, cx, cy, R) => burstSphere(n).map(([x, y, z]) => [cx + x * R, cy + y * R, z * R]);
/** A flat ring burst ("ring shell"), tilted towards the audience. */
const ringShell = (n, cx, cy, R) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU, rr = R * (0.55 + 0.45 * ((i % 3) / 2)); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.45, Math.sin(a) * rr * 0.6]; });
/** Amor's arrow, pointing right, shaft from x0 to x1 (as in FlyingStars' proposal show). */
const arrow = (n, x0, x1, y) => sampleOutline([{ pts: [[x0, y], [x1, y]], closed: false }, { pts: [[x1 - 0.14, y + 0.09], [x1, y], [x1 - 0.14, y - 0.09]], closed: false }, { pts: [[x0, y], [x0 - 0.1, y + 0.08]], closed: false }, { pts: [[x0, y], [x0 - 0.1, y - 0.08]], closed: false }], n).map(([x, yy]) => [x, yy, 0]);

const still = (pts, caption) => ({ beats: [{ pts, caption }] });

/** Pictures for one motif version (name from show-configurator.js) at the given drone count. */
export async function buildScene(version, n) {
  switch (version.build) {
    // ---- Hochzeit · Herz ----
    case "heart2d": return still(paint(heartOutline(n), PINK), version.caption);
    case "heart3d": {
      const pts = paint(await heart3d(n), heartColour);
      return { beats: [{ pts, caption: version.caption, live: (b, j, t, o) => { const s = thump(t); o[0] *= s; o[1] = (b[1] + 0.1) * s - 0.1; o[2] *= s; sway(o, t, 0.4, 8); } }] };
    }
    case "heartsStory": {
      const [h, a] = share(n, [4, 1]), [m, s1, s2, s3] = share(n, [7, 1, 1, 1]);
      const outline = paint(heartOutline(h).map(([x, y]) => [x / 17 + 0.3, y / 17, 0]), PINK);
      const small = await heart3d(Math.max(s1, s2, s3));
      const sats = [s1, s2, s3].flatMap((k, s) => move(small.slice(0, k), 0.28, Math.cos((s / 3) * TAU) * 1.45, 0.15, Math.sin((s / 3) * TAU) * 1.45));
      return { beats: [
        // the arrow flies into the heart, as in FlyingStars' proposal show
        { pts: [...outline, ...paint(arrow(a, -1.25, -0.55, 0), WARM)], caption: "Amors Pfeil", hold: 0.6, live: (b, j, t, o) => { if (j >= h) o[0] += 0.9 * smooth(t / 2.2); } },
        { pts: paint(await heart3d(n), heartColour), caption: "trifft: das Herz wird voll und schlägt", hold: 1.8, live: (b, j, t, o) => { const s = thump(t); o[0] *= s; o[1] = (b[1] + 0.1) * s - 0.1; o[2] *= s; sway(o, t, 0.35, 8); } },
        { pts: [...paint(evenSubset(await heart3d(n), m), heartColour), ...paint(sats, PINK)], caption: "…und kleine Herzen kreisen im Takt", live: (b, j, t, o) => {
          if (j < m) { const s = thump(t); o[0] *= s; o[1] = (b[1] + 0.1) * s - 0.1; o[2] *= s; sway(o, t, 0.3, 9); return; }
          yaw(o, t * 0.55); o[1] += Math.sin(t * 1.3 + j) * 0.02; // the small hearts orbit the big one
        } },
      ] };
    }
    // ---- Hochzeit · Ringe ----
    case "proposal": return { beats: [{ pts: paint(proposal(n), WARM), caption: "Der Antrag", hold: 2.4 }, { pts: paint(twoRings(n), GOLD), caption: "…aus dem Ring werden zwei" }] };
    case "rings3d": {
      const per = Math.floor(n / 2), pts = paint(torusPair(n), (p) => mix(GOLD, WARM, (p[2] + 1) / 2));
      return { beats: [{ pts, caption: version.caption, live: (b, j, t, o) => {
        const ang = j < per ? Math.atan2(b[1], b[0] + 0.6) : Math.atan2(b[2], b[0] - 0.6); // light runs around each ring
        o[3] = 0.45 + 0.55 * Math.max(0, Math.cos(ang - t * 2.2 * (j < per ? 1 : -1))) ** 3;
        sway(o, t, 0.55, 8);
      } }] };
    }
    case "ringsStory": {
      const [rp, sp] = share(n, [3, 1]), per = Math.floor(rp / 2);
      return { beats: [
        { pts: paint(proposal(n), WARM), caption: "Der Antrag", hold: 1.4 },
        { pts: paint(move(torusRing(n, 0.75, 0.1), 1, 0, 0.35), GOLD), caption: "der Ring steigt auf", hold: 1.4, live: (b, j, t, o) => { yaw(o, Math.sin(t * 1.4) * 0.7); o[1] += Math.sin(t * 1.2) * 0.05; } },
        { pts: [...paint(torusPair(rp), (p) => mix(GOLD, WARM, (p[2] + 1) / 2)), ...paint(shell(sp, 0, 0, 2), WARM)], caption: "…und wird zu zwei Ringen im Funkenregen", live: (b, j, t, o) => {
          if (j < rp) { const ang = j < per ? Math.atan2(b[1], b[0] + 0.6) : Math.atan2(b[2], b[0] - 0.6); o[3] = 0.45 + 0.55 * Math.max(0, Math.cos(ang - t * 2.2)) ** 3; sway(o, t, 0.5, 8); return; }
          burst(o, b, j, t, { period: 3, droop: 0.4, spread: 0.6 });
        } },
      ] };
    }
    // ---- Jubiläum · Wappen ----
    case "shield": return still(paint(shield(n), WARM), version.caption);
    case "shield3d": {
      const [a, b] = share(n, [3, 1]), pts = [...paint(shield3d(a), WARM), ...paint(await words("125", b, 0.38, 0, 0.05, 0.2), GOLD)];
      return { beats: [{ pts, caption: version.caption, live: (bs, j, t, o) => { o[3] = glint(bs[0] + bs[1] * 0.5, t); sway(o, t, 0.45, 8); } }] };
    }
    case "shieldStory": {
      const [a, b, c, d] = share(n, [5, 2.2, 1.2, 1.6]);
      const number = await words("125", b, 0.38, 0, 0.05, 0.2);
      const wreath = Array.from({ length: d }, (_, i) => { const ang = (i / d) * TAU; return [Math.cos(ang) * 1.25, 0.02 + Math.sin(ang) * 1.12, 0]; });
      return { beats: [
        { pts: paint(shield3d(n), WARM), caption: "Das Wappen", hold: 1.2, live: (bs, j, t, o) => sway(o, t, 0.35, 8) },
        { pts: [...paint(shield3d(n - b), WARM), ...paint(move(number, 1, 0, 0, 0.45), GOLD)], caption: "eure Zahl tritt hervor", hold: 1.4, live: (bs, j, t, o) => sway(o, t, 0.4, 8) },
        { pts: [...paint(shield3d(a), WARM), ...paint(move(number, 1, 0, 0, 0.3), GOLD), ...paint(crown(c, 0.95), GOLD), ...paint(wreath, GOLD)], caption: "…mit Krone und kreisendem Sternenkranz", live: (bs, j, t, o) => {
          if (j >= a + b + c) roll(o, t * 0.35, 0, 0.02); // the wreath turns around the crest
          else if (j >= a + b) o[3] = glint(bs[0], t, 2.4, 0.6);
          sway(o, t, 0.35, 9);
        } },
      ] };
    }
    // ---- Jubiläum · Wahrzeichen (Zeche Zollverein, Schacht XII) ----
    case "zollverein": return still(paint(zollverein(n), WARM), version.caption);
    case "zollverein3d": {
      const [f, w1, w2] = share(n, [6, 1, 1]), pts = [...paint(frame3d(f), WARM), ...paint(wheel(w1, ...WHEELS[0]), GOLD), ...paint(wheel(w2, ...WHEELS[1]), GOLD)];
      return { beats: [{ pts, caption: version.caption, live: (b, j, t, o) => {
        if (j >= f) { const [cx, cy] = WHEELS[j < f + w1 ? 0 : 1]; roll(o, t * 1.6 * (j < f + w1 ? 1 : -1), cx, cy); } // the sheave wheels turn
        sway(o, t, 0.4, 8);
      } }] };
    }
    case "zollvereinStory": {
      const [f, w1, w2, s, fo] = share(n, [5, 0.8, 0.8, 1.6, 1.4]);
      const wheels = (b, j, t, o) => { if (j >= f && j < f + w1 + w2) { const [cx, cy] = WHEELS[j < f + w1 ? 0 : 1]; roll(o, t * 1.6 * (j < f + w1 ? 1 : -1), cx, cy); } };
      const tower = [...paint(frame3d(f), WARM), ...paint(wheel(w1, ...WHEELS[0]), GOLD), ...paint(wheel(w2, ...WHEELS[1]), GOLD)];
      const sparks = (k) => paint(volume(k, [-0.15, 0.15], [0.95, 1.6], [-0.1, 0.1]), (p) => mix(GOLD, ORANGE, (p[1] - 0.95) / 0.65));
      return { beats: [
        { pts: [...paint(frame3d(n - w1 - w2), WARM), ...paint(wheel(w1, ...WHEELS[0]), GOLD), ...paint(wheel(w2, ...WHEELS[1]), GOLD)], caption: "Das Fördergerüst", hold: 1, live: (b, j, t, o) => { if (j >= n - w1 - w2) { const [cx, cy] = WHEELS[j < n - w2 ? 0 : 1]; roll(o, t * 1.6 * (j < n - w2 ? 1 : -1), cx, cy); } sway(o, t, 0.3, 9); } },
        { pts: [...tower, ...sparks(s + fo)], caption: "die Seilscheiben drehen, Funken steigen auf", hold: 2.4, live: (b, j, t, o) => { wheels(b, j, t, o); if (j >= f + w1 + w2) stream(o, b, t, { y0: 0.95, y1: 1.6, speed: 0.45 }); sway(o, t, 0.3, 9); } },
        { pts: [...tower, ...star3d(s, 0.42, 0, 1.95), ...sparks(fo)], caption: "…und werden zum Stern über der Zeche", live: (b, j, t, o) => {
          wheels(b, j, t, o);
          if (j >= f + w1 + w2 + s) stream(o, b, t, { y0: 0.95, y1: 1.6, speed: 0.45 });
          else if (j >= f + w1 + w2) yaw(o, t * 0.7);
          sway(o, t, 0.3, 9);
        } },
      ] };
    }
    // ---- Launch · Rakete ----
    case "rocket": return still(paint(rocket(n), WARM), version.caption);
    case "rocket3d": return { beats: [{ pts: paint(rocket3d(n), (p) => mix(WARM, CYAN, (p[2] + 0.2) / 0.4)), caption: version.caption, live: (b, j, t, o) => { yaw(o, t * 0.6); o[1] += Math.sin(t * 1.6) * 0.04; } }] };
    case "rocketStory": {
      const [r, e] = share(n, [3, 1]), [r2, e2] = share(n, [2.2, 1]);
      const exhaust = (k, top, len) => paint(volume(k, [-0.16, 0.16], [top - len, top], [-0.12, 0.12]), (p) => mix(GOLD, ORANGE, (top - p[1]) / len));
      const orbit = paint(Array.from({ length: e2 }, (_, i) => { const a = (i / e2) * TAU; return [Math.cos(a) * 1.15, 0.9 + Math.sin(a) * 0.3, Math.sin(a) * 0.9]; }), GOLD);
      return { beats: [
        { pts: [...paint(rocket3d(r, -0.6), WARM), ...exhaust(e, -1.25, 0.35)], caption: "Zündung", hold: 1.6, live: (b, j, t, o) => { if (j >= r) stream(o, b, t, { y0: -1.25, y1: -1.6, speed: 0.9, widen: 1.6 }); else o[0] += Math.sin(t * 30 + j) * 0.004; } },
        { pts: [...paint(rocket3d(r2, 0.9), WARM), ...exhaust(e2, 0.28, 1.3)], caption: "Start", hold: 1.6, live: (b, j, t, o) => { if (j >= r2) stream(o, b, t, { y0: 0.28, y1: -1.02, speed: 0.9, widen: 1.6 }); else yaw(o, t * 0.8); } },
        { pts: [...paint(rocket3d(r2, 0.9), WARM), ...orbit], caption: "…und erreicht die Sterne", live: (b, j, t, o) => { if (j < r2) { yaw(o, t * 0.8); o[1] += Math.sin(t * 1.4) * 0.04; } else { yaw(o, t * 0.5); o[3] = 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + j)); } } },
      ] };
    }
    // ---- Launch · Logo ----
    case "logo": return still(logo2d(n), version.caption);
    case "logo3d": return { beats: [{ pts: logo3d(n), caption: version.caption, live: (b, j, t, o) => { o[3] = glint(b[0] + b[1] * 0.4, t); sway(o, t, 0.5, 8); } }] };
    case "logoStory": {
      const disk = paint(Array.from({ length: n }, (_, i) => { const r = 0.25 + 1.15 * Math.sqrt((i + 0.5) / n), a = i * 2.39996; return [Math.cos(a) * r, Math.sin(a) * r, Math.sin(i) * 0.15]; }), (p) => mix(GOLD, VIOLET, Math.hypot(p[0], p[1]) / 1.4));
      return { beats: [
        // a vortex: inner drones turn faster than outer ones, like a whirlpool
        { pts: disk, caption: "Ein Funkenwirbel", hold: 2.6, live: (b, j, t, o) => roll(o, t * (1.6 / (0.4 + Math.hypot(b[0], b[1])))) },
        { pts: logo3d(n), caption: "…verdichtet sich zu eurem Logo", live: (b, j, t, o) => { const wave = Math.exp(-(((b[0] - (frac(t / 3) * 3.2 - 1.6)) / 0.25) ** 2)); o[2] += wave * 0.25; o[3] = 0.6 + 0.4 * wave; sway(o, t, 0.4, 9); } },
      ] };
    }
    // ---- Kultur · Maske ----
    case "masks": { const half = Math.ceil(n / 2); return still(masks(n).map((p, j) => [...p, ...(j < half ? GOLD : mix(BLUE, WARM, 0.35))]), version.caption); }
    case "masks3d": {
      const [trag, com] = share(n, [4, 4, 1.4]);
      const pts = masks3d(n).map((p, j) => [...p, ...(j < trag ? mix(BLUE, WARM, 0.35) : j < trag + com ? GOLD : WARM)]);
      return { beats: [{ pts, caption: version.caption, live: (b, j, t, o) => {
        if (j < trag) roll(o, Math.sin(t * 0.9) * 0.1, 0.5, 0.6); // the masks swing gently, each from its top
        else if (j < trag + com) roll(o, -Math.sin(t * 0.9 + 0.6) * 0.1, -0.5, 0.55);
        else o[0] += Math.sin(t * 2.2 + b[1] * 5) * 0.035;
        sway(o, t, 0.35, 9);
      } }] };
    }
    case "maskStory": return { beats: [
      { pts: paint(mask3d(n, false), GOLD), caption: "Die Komödie", hold: 1.6, live: (b, j, t, o) => sway(o, t, 0.35, 8) },
      { pts: paint(mask3d(n, true), mix(BLUE, WARM, 0.35)), caption: "wird zur Tragödie", hold: 1.6, live: (b, j, t, o) => sway(o, t, 0.35, 8) },
      { pts: await devil(n), caption: "…und zum Teufel aus unserer Show Bokkenrijders", live: (b, j, t, o) => { if (b[3] > 200 && b[4] > 100) o[3] = 0.4 + 0.6 * Math.abs(Math.sin(t * 2)); sway(o, t, 0.45, 8); } },
    ] };
    // ---- Kultur · Vorhang ----
    case "curtain": return still(paint(curtain(n, 0), RED), version.caption);
    case "curtainStar": {
      const [a, b] = share(n, [2, 1]);
      return { beats: [
        { pts: paint(curtain(n, 0), RED), caption: "Vorhang zu", hold: 1 },
        { pts: [...paint(curtain(a, 1), RED), ...star3d(b)], caption: "Vorhang auf für einen 3D-Stern", live: (bs, j, t, o) => { if (j >= a) { sway(o, t, 0.7, 6); o[3] = 0.75 + 0.25 * Math.sin(t * 3 + j); } } },
      ] };
    }
    case "curtainStory": {
      const [a, r, s] = share(n, [2, 1.2, 0.9]);
      const billow = (b, t, o) => { if (b[1] < 0.82) { const depth = (0.82 - b[1]) / 1.66; o[0] += Math.sin(b[1] * 4 - t * 2.4) * 0.05 * depth; o[2] += Math.cos(b[1] * 3 - t * 2) * 0.12 * depth; } };
      return { beats: [
        { pts: paint(curtain(n, 0), RED), caption: "Vorhang zu", hold: 1 },
        { pts: [...paint(curtain(a, 1), RED), ...paint(rain(r + s), GOLD)], caption: "Vorhang auf, Goldregen fällt", hold: 2.4, live: (b, j, t, o) => { if (j < a) billow(b, t, o); else stream(o, b, t, { y0: 0.8, y1: -0.8, speed: 0.32, vary: 0.45, j }); } },
        { pts: [...paint(curtain(a, 1), RED), ...paint(rain(r), GOLD), ...star3d(s, 0.42, 0, 0.1)], caption: "…und ein Stern steigt daraus auf", live: (b, j, t, o) => {
          if (j < a) billow(b, t, o);
          else if (j < a + r) stream(o, b, t, { y0: 0.8, y1: -0.8, speed: 0.32, vary: 0.45, j });
          else { yaw(o, t * 0.8); o[1] += Math.sin(t * 1.1) * 0.06; }
        } },
      ] };
    }
    // ---- Silvester · Feuerwerk ----
    case "burst2d": return still(paint(burst2d(n), (p) => mix(GOLD, ORANGE, Math.hypot(p[0], p[1]))), version.caption);
    case "burst3d": return { beats: [{ pts: paint(shell(n, 0, 0, 1), (p) => mix(GOLD, VIOLET, Math.hypot(p[0], p[1], p[2]))), caption: version.caption, live: (b, j, t, o) => burst(o, b, j, t, { period: 3.4 }) }] };
    case "fireworkStory": {
      const [a, b, c] = share(n, [1, 1, 1]), centres = [[-0.85, 0.25], [0.8, 0.45], [0, -0.05]];
      const which = (j) => (j < a ? 0 : j < a + b ? 1 : 2);
      return { beats: [
        { pts: paint([a, b, c].flatMap((k, s) => volume(k, [centres[s][0] - 0.03, centres[s][0] + 0.03], [-1.2, centres[s][1]], [-0.05, 0.05])), WARM), caption: "Drei Raketen steigen auf", hold: 0.6, live: (bs, j, t, o) => { const s = which(j); stream(o, bs, t, { y0: -1.2, y1: centres[s][1], speed: 0.9 }); } },
        { pts: [...paint(shell(a, ...centres[0], 0.55), (p) => mix(GOLD, ORANGE, p[2] + 0.5)), ...paint(ringShell(b, ...centres[1], 0.65), (p) => mix(VIOLET, PINK, p[2] + 0.5)), ...paint(shell(c, ...centres[2], 0.5), (p) => mix(CYAN, BLUE, p[2] + 0.5))], caption: "…und zünden nacheinander: Kugel, Ring, Kugel", live: (bs, j, t, o) => { const s = which(j); burst(o, bs, j, t, { cx: centres[s][0], cy: centres[s][1], period: 4.2, delay: s * 0.9, droop: s === 2 ? 0.45 : 0.25 }); } },
      ] };
    }
    // ---- Silvester · Uhr ----
    case "clock": return still(paint(clockFace(n, 5), WARM), version.caption);
    case "clock3d": {
      const [rim, mh, hh] = share(n, [7, 1.4, 0.9]), pts = [...paint(clockRim(rim, 0.3), WARM), ...paint(hand(mh, 0.72, 0.18), GOLD), ...paint(hand(hh, 0.46, 0.18), GOLD)];
      // the minute hand sweeps once in 12 s, the hour hand a twelfth of that
      return { beats: [{ pts, caption: version.caption, live: (b, j, t, o) => { if (j >= rim) roll(o, -(j < rim + mh ? t / 12 : t / 144) * TAU); sway(o, t, 0.35, 9); } }] };
    }
    case "clockStory": {
      const [rim, mh, hh, sp] = share(n, [5.5, 1.2, 0.8, 2.5]);
      const clock = [...paint(clockRim(rim, 0.3), WARM), ...paint(hand(mh, 0.72, 0.18), GOLD), ...paint(hand(hh, 0.46, 0.18), GOLD)];
      const hidden = paint(volume(sp, [-0.25, 0.25], [-0.25, 0.25], [-0.25, -0.15]), GOLD); // the spark drones wait dark behind the clock
      const sparks = paint(Array.from({ length: sp }, (_, i) => { const a = (i / sp) * TAU, R = 1.75; return [Math.cos(a) * R, Math.sin(a) * R, Math.sin(i * 1.7) * 0.6]; }), (p) => mix(GOLD, ORANGE, Math.abs(p[2])));
      return { beats: [
        { pts: [...clock, ...hidden], caption: "Kurz vor zwölf", hold: 0.6, live: (b, j, t, o) => {
          if (j >= rim && j < rim + mh) roll(o, (1 - smooth(t / 4)) * (5 / 60) * TAU);
          else if (j >= rim + mh && j < rim + mh + hh) roll(o, (1 - smooth(t / 4)) * (5 / 720) * TAU);
          else if (j >= rim + mh + hh) o[3] = 0;
          sway(o, t, 0.3, 9);
        } },
        { pts: [...clock, ...sparks], caption: "…Mitternacht: die Uhr sprüht Funken", live: (b, j, t, o) => {
          if (j >= rim + mh + hh) { const a = Math.atan2(b[1], b[0]); burst(o, b, j, t, { cx: Math.cos(a), cy: Math.sin(a), period: 2.4, droop: 0.3, spread: 0.3 }); }
          else if (j < rim) o[3] = 0.7 + 0.3 * Math.abs(Math.sin(t * 3));
          sway(o, t, 0.3, 9);
        } },
      ] };
    }
    default: return { beats: [{ pts: [], caption: "" }] };
  }
}
