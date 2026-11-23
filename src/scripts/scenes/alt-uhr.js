import { t as message } from "../../i18n/ui.mjs";
import { TAU, WARM, GOLD, PINK, ORANGE, mix, paint, place, smooth, hash, yaw, roll, sway, breathe, sparkle, part, act } from "../show-motion.js";
import { sampleOutline, circle } from "../show-geometry.js";
import { share, clockRim, clockDial, hand, bottle3d, cork } from "../show-shapes.js";
import { words } from "./words.js";

/** Quadratic Bézier point and unit tangent. */
const bez = (P0, P1, P2, s) => { const u = 1 - s; return [u * u * P0[0] + 2 * u * s * P1[0] + s * s * P2[0], u * u * P0[1] + 2 * u * s * P1[1] + s * s * P2[1]]; };
const bezDir = (P0, P1, P2, s) => { const dx = 2 * (1 - s) * (P1[0] - P0[0]) + 2 * s * (P2[0] - P1[0]), dy = 2 * (1 - s) * (P1[1] - P0[1]) + 2 * s * (P2[1] - P1[1]), l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
/** Evenly covered sphere surface (golden-angle spiral), like a mirror ball or a planet. */
const fib = (n, R, cx = 0, cy = 0, cz = 0) => { const GA = Math.PI * (3 - Math.sqrt(5)); return Array.from({ length: n }, (_, i) => { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), a = GA * i; return [cx + Math.cos(a) * r * R, cy + y * R, cz + Math.sin(a) * r * R]; }); };

function clockScene(n, caption) {
  const [rim, mh, hh] = share(n, [7, 1.4, 0.9]), pts = [...paint(clockDial(rim), WARM), ...paint(hand(mh, 0.72), GOLD), ...paint(hand(hh, 0.46), GOLD)];
  // the hands run from five to twelve up to midnight
  return { beats: [{ pts, caption, live: (b, j, t, o) => { if (j >= rim) roll(o, (1 - smooth(t / 8)) * (j < rim + mh ? 5 / 60 : 5 / 720) * TAU); } }] };
}

function clock3dScene(n, caption) {
  const [rim, mh, hh] = share(n, [7, 1.4, 0.9]), pts = [...paint(clockRim(rim, 0.3), WARM), ...paint(hand(mh, 0.72, 0.18), GOLD), ...paint(hand(hh, 0.46, 0.18), GOLD)];
  // the minute hand sweeps once in 20 s, the hour hand a twelfth of that
  return { beats: [{ pts, caption, live: (b, j, t, o) => { if (j >= rim) roll(o, -(j < rim + mh ? t / 20 : t / 240) * TAU); sway(o, t, 0.3); } }] };
}

async function clockStoryScene(n, caption) {
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
  return { beats: [
    act([clock, sparks(glowRing)], { caption: message('showScenes.fiveToMidnight'), hold: 4.2, live: (b, j, t, o) => { hands(j, t, o, 4); if (j >= face) o[3] = breathe(t); } }),
    act([clock, sparks(swarm, (p) => mix(GOLD, ORANGE, hash(p[0] * 31)))], { caption: message('showScenes.midnightSparksSwirlOut'), hold: 2.6, live: (b, j, t, o) => {
      if (j >= face) { yaw(o, t * 0.35, C[0], 0); o[3] = sparkle(j, t); } else if (j < rim) o[3] = breathe(t, 1.6);
    } }),
    act([clock, sparks(year)], { caption: message('showScenes.theyWriteTheNewYear'), hold: 2.6, live: (b, j, t, o) => { if (j >= face) o[3] = sparkle(j, t, 0.95, 1.3); } }),
    act([clock, sparks(Array.from({ length: sp }, (_, i) => atom(i, 0)), (p) => mix(GOLD, PINK, (p[2] + 0.9) / 1.8))], { caption: message('showScenes.swirlAroundTheClockAgain'), hold: 3, live: (b, j, t, o) => {
      if (j >= face) { const [x, y, z] = atom(j - face, t); o[0] = x; o[1] = y; o[2] = z; o[3] = sparkle(j, t); }
    } }),
    champagneBeat(face, sp),
  ] };
}

function champagneBeat(face, sp) {
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
  return act(champagne, { caption: message('showScenes.andTheCorkPops'), live: (b, j, t, o) => {
    const s = flight(t);
    if (j >= face && j < face + cn) { const [x, y, z] = corkAt(corkLocal[j - face], s); o[0] = x; o[1] = y + (s >= 1 ? Math.sin((t - 3.5) * 0.9) * 0.02 : 0); o[2] = z; }
    else if (j >= face + cn) { const [x, y, z] = foamAt(j - face - cn, s); o[0] = x; o[1] = y; o[2] = z; o[3] = sparkle(j, t, 0.85, 1.3); }
  } });
}

function champagneStoryScene(n) {
  const [rim, mh, hh, sp] = share(n, [4, 1, 0.7, 4]);
  const pop = champagneBeat(rim + mh + hh, sp);
  return { beats: [{ ...pop, caption: message('showScenes.aChampagneBottleTheCorkPops'), hold: 4.5 }] };
}

export const builders = { clock: clockScene, clock3d: clock3dScene, clockStory: clockStoryScene, champagneStory: champagneStoryScene };
