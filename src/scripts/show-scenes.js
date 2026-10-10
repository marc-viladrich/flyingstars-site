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
import { TAU, DIAMOND, GREEN, WARM, GOLD, PINK, VIOLET, CYAN, BLUE, ORANGE, RED, MOON, mix, paint, place, frac, smooth, hash, yaw, roll, pitch, sway, breathe, glint, sparkle, chase, part, act } from "./show-motion.js";
import { interlude } from "./scenes/interludes.js";
import { burstSphere, star, extrude, evenSubset, sampleOutline, circle, torusPair, heartOutline } from "./show-geometry.js";
import { engagementRing, ringSeat, hand3d, hand2d, flute2d, flute3d, bubbles, trophy2d, trophy3d, bulb2d, bulb3d, bulbGlass, filament, notes2d, notes3d, notePath1, melody, clover2d, clover3d, extrudePaths } from "./show-shapes.js";
import { solitaire, rocketSolid, globe, launchPad, moonHorizon, flagStar, starField, torusLink, brilliant, band } from "./show-shapes.js";
import { share, twoRings, shield, shield3d, crestStar3d, CREST_NUMBER, inCrestFlag, crown, rocket, rocket3d, flame, maskPair, maskPair3d, mask3d, MASKS, curtain, clockRim, clockDial, hand, sparkleShell, tower, tower3d, waves, TOWER_SPHERE, gate3d, arrowPaths, inside, bottle3d, cork } from "./show-shapes.js";

let hearts = null, figure = null, extra = null;
const loadExtra = () => (extra ||= import("./scenes/index.js").then((m) => m.BUILDERS).catch((e) => { extra = null; throw e; }));
const loadHearts = () => (hearts ||= import("./pricing-formations.js").then((m) => m.default).catch((e) => { hearts = null; throw e; }));
const loadFigure = () => (figure ||= fetch("/media/projekte/bokkenrijders/formation.json").then((r) => { if (!r.ok) throw new Error(`Formation HTTP ${r.status}`); return r.json(); }).catch((e) => { figure = null; throw e; }));
/** Loads the larger formation sources ahead of need, e.g. on the first interaction with the configurator. */
export function preloadScenes() { loadExtra().catch(() => {}); loadHearts().catch(() => {}); loadFigure().catch(() => {}); loadTextEngine().catch(() => {}); }

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
/** Quadratic Bézier point and unit tangent. */
const bez = (P0, P1, P2, s) => { const u = 1 - s; return [u * u * P0[0] + 2 * u * s * P1[0] + s * s * P2[0], u * u * P0[1] + 2 * u * s * P1[1] + s * s * P2[1]]; };
const bezDir = (P0, P1, P2, s) => { const dx = 2 * (1 - s) * (P1[0] - P0[0]) + 2 * s * (P2[0] - P1[0]), dy = 2 * (1 - s) * (P1[1] - P0[1]) + 2 * s * (P2[1] - P1[1]), l = Math.hypot(dx, dy); return [dx / l, dy / l]; };

/** Evenly covered sphere surface (golden-angle spiral), like a mirror ball or a planet. */
const fib = (n, R, cx = 0, cy = 0, cz = 0) => { const GA = Math.PI * (3 - Math.sqrt(5)); return Array.from({ length: n }, (_, i) => { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), a = GA * i; return [cx + Math.cos(a) * r * R, cy + y * R, cz + Math.sin(a) * r * R]; }); };
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
  let shown = 0;
  for (const [segment, m] of motifs.entries()) {
    if (!m.tiers[pkg]) continue; // not in this package (too few drones to read); segments keep the occasion's numbering
    // SPARK passes through a small geometric figure between two motifs (round 11), as part of the next motif
    if (pkg === "SPARK" && shown++ > 0) beats.push({ ...interlude(shown - 2, n), segment, motif: m.label, shimmer: true });
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
      // a solitaire as a body: torus band and a brilliant-cut stone; it turns about the vertical axis, so the band
      // foreshortens to a line and opens again, and tips a little towards the audience
      const [ringBand, stone] = solitaire(n, 0.8), k = ringBand.length;
      const pts = [...paint(ringBand, (p) => mix(GOLD, WARM, (p[1] + 0.8) / 3.2)), ...paint(stone, DIAMOND)];
      return { beats: [{ pts, caption, live: (b, j, t, o) => {
        if (j >= k) o[3] = sparkle(j, t, 0.95, 1.55); else o[3] = glint(Math.atan2(b[1], b[0]), t, 5, 0.45, -Math.PI, Math.PI);
        yaw(o, t * 0.32); pitch(o, 0.35 + 0.12 * Math.sin(t * 0.4));
      } }] };
    }
    case "ringsStory": {
      // Zwei Ringe → ein Solitär → eine Hand, der Ring gleitet auf den Ringfinger → sie sagt Ja (ein Herz steigt auf).
      // The ring is a torus with a brilliant on top in every act; sizes are what the drones can draw: the big solitaire
      // uses most of the fleet, on the finger it is a small ring and the rest of the fleet draws the hand.
      const SP = 40, [ra, rb] = torusLink(n - SP, 0.55, 0.42, 0.055);
      const stars = starField(SP, -1.3, 1.3, -0.95, 1.0, 11);
      const [bigBand, bigStone] = solitaire(n - SP, 0.78);
      // the hand, large, palm to the audience; the ring finger's seat and width give the small ring its size
      const HS = 1.3, HX = -0.18, HY = -0.02, handPts = hand2d(n - SP - 84).map(([x, y, z]) => [x * HS + HX, y * HS + HY, z]);
      const seat = ringSeat(0.2), R = seat.h * HS + 0.03, [smallBand, smallStone] = solitaire(84, R), small = [...smallBand, ...smallStone];
      const seatC = [seat.c[0] * HS + HX, seat.c[1] * HS + HY], dirF = seat.d, tipC = [seatC[0] + dirF[0] * 0.62, seatC[1] + dirF[1] * 0.62];
      // the ring on the finger: tipped so that the band circles the finger (axis along the finger) and the stone sits
      // in front, towards the audience
      const onFinger = (p, c, tip) => { const [x, y, z] = p, Y = y * Math.cos(tip) - z * Math.sin(tip), Z = y * Math.sin(tip) + z * Math.cos(tip); return [c[0] + x, c[1] + Y, Z]; };
      const seated = small.map((p) => onFinger(p, seatC, 1.25)), hovering = small.map((p) => onFinger(p, [tipC[0], tipC[1] + 0.3], 0.25));
      const slide = (t) => smooth((t - 0.6) / 3.2); // the ring waits a moment above the fingertip, then glides down
      const ringLive = (j, t, o, bandN) => {
        const u = slide(Math.max(0, t)), a = hovering[j], b = seated[j], tip = 0.25 + (1.25 - 0.25) * u;
        const [x, y, z] = onFinger(small[j], [a[0] + (seatC[0] - tipC[0]) * u, tipC[1] + 0.3 + (seatC[1] - tipC[1] - 0.3) * u], tip);
        o[0] = x; o[1] = y; o[2] = z; o[3] = j >= bandN ? sparkle(j, t, 0.95, 1.5) : 1 + 0.25 * Math.max(0, Math.sin(t * 1.3 + j * 0.4)) ** 3;
      };
      const heart = heartLine(SP).map(([x, y, z]) => [x * 0.42 + 0.95, y * 0.42 + 0.62, z]);
      const twinkle = (j, t, o) => { o[3] = sparkle(j, t, 0.6, 1.3); };
      return { beats: [
        act([part("ringA", paint(ra, GOLD)), part("ringB", paint(rb, (p) => mix(GOLD, WARM, 0.5))), part("stars", paint(stars, WARM))], { caption: "Zwei Ringe, ineinander", hold: 2.4, live: (b, j, t, o) => { if (j >= n - SP) twinkle(j, t, o); else { o[3] = glint(b[0], t, 4, 0.35); yaw(o, t * 0.3); pitch(o, 0.25); } } }),
        act([part("band", paint(bigBand, (p) => mix(GOLD, WARM, (p[1] + 0.78) / 3.1))), part("stone", paint(bigStone, DIAMOND)), part("stars", paint(stars, WARM))], { caption: "werden zu einem Ring mit Stein", hold: 3.2, live: (b, j, t, o) => {
          if (j >= n - SP) twinkle(j, t, o); else { o[3] = j >= bigBand.length ? sparkle(j, t, 0.95, 1.55) : glint(Math.atan2(b[1], b[0]), t, 5, 0.45, -Math.PI, Math.PI); yaw(o, t * 0.3); pitch(o, 0.3); }
        } }),
        act([part("ring", seated.map((p, j) => [...p, ...(j >= smallBand.length ? DIAMOND : GOLD)]), { rigid: true }), part("hand", paint(handPts, WARM)), part("stars", paint(stars, WARM))], { caption: "eine Hand: der Ring gleitet auf den Ringfinger", hold: 4.6, live: (b, j, t, o) => {
          if (j < 84) ringLive(j, t, o, smallBand.length); else if (j >= 84 + handPts.length) twinkle(j, t, o);
        } }),
        act([part("ring", seated.map((p, j) => [...p, ...(j >= smallBand.length ? DIAMOND : GOLD)]), { rigid: true }), part("hand", paint(handPts, WARM)), part("stars", paint(heart, PINK))], { caption: "…und sie sagt Ja", hold: 3.5, live: (b, j, t, o) => {
          if (j < 84) { if (j >= smallBand.length) o[3] = sparkle(j, t, 1.0, 1.6); else o[3] = 1 + 0.25 * Math.max(0, Math.sin(t * 1.3 + j * 0.4)) ** 3; }
          else if (j >= 84 + handPts.length) o[3] = breathe(t);
        } }),
      ] };
    }
    // ---- Hochzeit · Herz ----
    case "heart2d": return { beats: [{ pts: paint(heartLine(n), PINK), caption, live: (b, j, t, o) => { o[3] = breathe(t); } }] };
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
      // the rocket as a body (silhouette in two planes, hoops, fins) hovers, turns slowly about its axis and tips a
      // little; the flame is a cone of drones whose light runs downwards
      const [r, f] = share(n, [3, 1]), pts = [...paint(rocketSolid(r), (p) => mix(WARM, CYAN, (p[2] + 0.2) / 0.4)), ...paint(flame(f, -0.62, 0.12), flameColour(-0.62))];
      return { beats: [{ pts, caption, live: (b, j, t, o) => {
        if (j >= r) o[3] = chase(-b[1], t, 0.9, 0.2, 0.7, 1.45); else o[3] = glint(b[1], t, 4.5, 0.35, -0.8, 1.1);
        o[1] += Math.sin(t * 0.55) * 0.04; yaw(o, t * 0.3); pitch(o, 0.12 * Math.sin(t * 0.33));
      } }] };
    }
    case "rocketStory": {
      // Startklar auf der Rampe → Zündung, die Rampe fällt weg, die Spur wächst → im Orbit um einen Planeten → Landung
      // auf dem Mond, Flagge gehisst. The rocket is one rigid body in every act; the plume drones stay the plume (then
      // comet tail, then dust and flag); the pad drones become the planet and then the moon.
      const RK = 120, TR = 60, WD = 85, ST = n - RK - TR - WD;
      const body = rocketSolid(RK, 1), stars = starField(ST, -1.25, 1.25, 0.05, 1.0, 7);
      const at = (s, cx, cy, heading = 0) => body.map(([x, y, z]) => { const [X, Y] = heading ? [x * Math.cos(heading) - y * Math.sin(heading), x * Math.sin(heading) + y * Math.cos(heading)] : [x, y]; return [X * s + cx, Y * s + cy, z * s]; });
      const bodyColour = (p) => mix(WARM, CYAN, (p[2] + 0.3) / 0.6), plumeColour = (q) => mix(GOLD, ORANGE, hash(q[0] * 97 + q[1] * 13));
      // act 1 + 2: the rocket on the pad, then rising; the pad drops out of the picture (the world falls away)
      const S1 = 0.9, X1 = -0.2, Y0 = -0.72 + 0.62 * S1 + 0.02, RISE = 0.55, DROP = 0.95, T2 = 6;
      const pad = launchPad(WD, -0.72, 0.62, 0.4).map(([x, y, z]) => [Math.max(-0.8, Math.min(0.8, x)) + X1, y, z]);
      const idle = Array.from({ length: TR }, (_, k) => { const a = k * 2.39996, r = 0.06 * Math.sqrt((k + 0.5) / TR); return [X1 + Math.cos(a) * r, Y0 - 0.62 * S1 - 0.05 - 0.06 * ((k * 7) % 10) / 10, Math.sin(a) * r * 0.5]; });
      const lag = (k) => 0.05 + 2.2 * (k / TR), spread = (k) => (hash(k) - 0.5) * (0.14 + 0.3 * (k / TR));
      // the plume grows with a soft start (smooth), so ignition has no velocity jump
      const plumeAt = (k, t) => { const u = smooth(Math.max(0, t) / T2), y = Y0 + RISE * u - 0.62 * S1 - 0.04, l = lag(k) * smooth(Math.max(0, t) / 1.2); return [X1 + spread(k) * Math.sqrt(l + 0.05), y - l * (0.3 + RISE / T2), (hash(k + 3) - 0.5) * 0.05 * l]; };
      const plumeEnd = Array.from({ length: TR }, (_, k) => plumeAt(k, 99));
      // act 3: the planet and an orbit around it, the rocket smaller and heading along the orbit, the plume as its tail
      const G = [0.12, 0.05], GR = 0.52, A = 0.9, H = 0.3, W = TAU / 9, S3 = 0.46;
      const orbit = (ph) => [G[0] + A * Math.cos(ph), G[1] + H * Math.sin(ph), A * Math.sin(ph) * 0.9];
      // the rocket follows the orbit the way a picture does: it turns in the picture plane along the projected path,
      // the depth of the orbit (behind and in front of the planet) comes from the orbit itself
      const inOrbit = (p, ph) => { const c = orbit(ph), a = Math.atan2(H * Math.cos(ph), -A * Math.sin(ph)) - Math.PI / 2, [x, y, z] = p, X = x * Math.cos(a) - y * Math.sin(a), Y = x * Math.sin(a) + y * Math.cos(a); return [c[0] + X * S3, c[1] + Y * S3, c[2] + z * S3]; };
      const tailAt = (k, ph) => { const c = orbit(ph - 0.08 - 1.1 * (k / TR)); return [c[0] + spread(k) * 0.6, c[1] + (hash(k + 5) - 0.5) * 0.06, c[2]]; };
      const PH0 = 0.3;
      // the planet as real shows draw a sphere: its outline, the equator and two meridians that turn inside the outline
      const planet = globe(WD, GR, G[0], G[1]), planetTurns = (j) => j >= RK + TR + planet.length - 0.5 * WD; // the second half of the points are the meridians
      // act 4: the moon as a horizon, the rocket lands upright, the plume becomes dust and a flag
      const S4 = 0.66, XL = -0.05, YTOP = 0.95, YL = -0.45 + 0.62 * S4 + 0.03, T4 = 5;
      const moon = moonHorizon(WD, -2.35, 1.9), [pole, cloth] = flagStar(40, XL + 0.45, -0.46, 0.85, 0.46); // the crater rims use the fewer pad drones
      const dust = Array.from({ length: TR - 40 }, (_, k) => { const u = (k + 0.5) / (TR - 40), side = k % 2 ? 1 : -1; return [XL + side * (0.22 + 0.55 * u), -0.44 + 0.03 * Math.sin(u * 9) + 0.015 * (k % 3), (hash(k + 9) - 0.5) * 0.2]; });
      const trailRest4 = [...pole, ...cloth, ...dust];
      const descent = (t) => smooth(Math.max(0, t) / T4);
      const under = (k, t) => { const u = descent(t), y = YTOP + (YL - YTOP) * u - 0.62 * S4 - 0.04, l = lag(k) * 0.25; return [XL + spread(k) * 0.5, y - l * 0.6, (hash(k + 3) - 0.5) * 0.04]; };
      return { beats: [
        act([part("rocket", paint(at(S1, X1, Y0), bodyColour), { rigid: true }), part("trail", paint(idle, plumeColour)), part("world", paint(pad, WARM)), part("stars", paint(stars, WARM))], { caption: "Startklar", hold: 1.8, frame: "start", live: (b, j, t, o) => {
          if (j >= RK && j < RK + TR) o[3] = 0.55 + 0.3 * sparkle(j, t, 0, 1); else if (j >= RK + TR + WD) o[3] = sparkle(j, t, 0.6, 1.3);
        } }),
        act([part("rocket", paint(at(S1, X1, Y0 + RISE), bodyColour), { rigid: true }), part("trail", paint(plumeEnd, plumeColour)), part("world", paint(pad.map(([x, y, z]) => [x, y - DROP, z]), WARM), { offstage: true }), part("stars", paint(stars.map(([x, y, z]) => [x, y - 0.25, z]), WARM))], { caption: "Zündung: die Rakete hebt ab, die Rampe fällt weg", hold: 8, frame: "start", live: (b, j, t, o) => {
          const u = smooth(Math.max(0, t) / T2);
          if (j < RK) { o[1] = b[1] - RISE * (1 - u); o[3] = glint(b[1] - Y0, t, 4, 0.3, -0.8, 0.9); }
          else if (j < RK + TR) { const [x, y, z] = plumeAt(j - RK, t); o[0] = x; o[1] = y; o[2] = z; o[3] = (0.5 + 0.9 * Math.max(0, 1 - lag(j - RK) / 2.4)) * sparkle(j, t, 0.75, 1.2) + 0.1; }
          else if (j < RK + TR + WD) o[1] = b[1] + DROP * (1 - u);
          else { o[1] = b[1] + 0.25 * (1 - smooth(Math.max(0, t) / 8)); o[3] = sparkle(j, t, 0.6, 1.3); }
        } }),
        act([part("rocket", paint(at(S3, 0, 0).map((p, j) => inOrbit(body[j], PH0)), bodyColour), { rigid: true }), part("trail", paint(Array.from({ length: TR }, (_, k) => tailAt(k, PH0)), plumeColour)), part("world", paint(planet, (p) => mix(CYAN, BLUE, (p[1] - G[1] + GR) / (2 * GR)))), part("stars", paint(stars, WARM))], { caption: "im Orbit um einen Planeten", hold: 9.5, live: (b, j, t, o) => {
          const tt = Math.max(0, t), ph = PH0 + W * (tt < 2 ? (tt * tt) / 4 : tt - 1); // the orbit speeds up gently
          if (j < RK) { const [x, y, z] = inOrbit(body[j], ph); o[0] = x; o[1] = y; o[2] = z; }
          else if (j < RK + TR) { const k = j - RK, [x, y, z] = tailAt(k, ph); o[0] = x; o[1] = y; o[2] = z; o[3] = (0.45 + 0.9 * (1 - k / TR)) * sparkle(j, t, 0.8, 1.2); }
          else if (j < RK + TR + WD) { if (planetTurns(j)) yaw(o, t * 0.3, G[0], 0); o[3] = 0.85 + 0.35 * Math.max(0, (o[2] + GR) / (2 * GR)); }
          else o[3] = sparkle(j, t, 0.6, 1.3);
        } }),
        act([part("rocket", paint(at(S4, XL, YL), bodyColour), { rigid: true }), part("trail", paint(trailRest4, (q, i) => (i < 40 ? WARM : plumeColour(q)))), part("world", paint(moon, MOON)), part("stars", paint(stars, WARM))], { caption: "…und landet auf dem Mond. Flagge gehisst!", hold: 7.5, live: (b, j, t, o) => {
          const u = descent(t), tt = Math.max(0, t);
          if (j < RK) { o[1] = b[1] + (YTOP - YL) * (1 - u); o[3] = glint(b[1] - YL, t, 4, 0.3, -0.7, 0.8); }
          else if (j < RK + TR) {
            const k = j - RK, w = smooth((tt - T4 + 0.3) / 2.4); // after touchdown the plume settles into flag and dust
            if (w < 1) { const [x, y, z] = under(k, t); o[0] = x + (b[0] - x) * w; o[1] = y + (b[1] - y) * w; o[2] = z + (b[2] - z) * w; }
            if (k >= 40) o[3] = (w < 1 ? 1.2 : 0.6) * sparkle(j, t, 0.7, 1.2);
            else if (k >= 12) { const dx = b[0] - (XL + 0.42); o[2] += w * Math.sin(t * 2.4 - dx * 9) * 0.05 * dx; o[1] += w * Math.sin(t * 2.0 - dx * 9) * 0.015 * dx; o[3] = w < 1 ? sparkle(j, t, 0.8, 1.2) : glint(b[0], t, 3.5, 0.35, XL + 0.3, XL + 0.95); }
          }
          else if (j >= RK + TR + WD) o[3] = sparkle(j, t, 0.6, 1.3);
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
    default: {
      // newer motifs live in one module per occasion (src/scripts/scenes/)
      const build = (await loadExtra())[version.build];
      return build ? build(n, caption, version) : { beats: [{ pts: [], caption: "" }] };
    }
  }
}
