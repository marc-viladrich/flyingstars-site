// festival motifs (Reise, Drache) of the eleventh version (see src/content/show-configurator.js for the build names).
// Reise: a compass rose whose needle settles on north; in the story an old town lies down and becomes a folded map,
// pins light up, a paper plane flies the route and circles the compass. Drache: an own, friendly dragon drawn as a
// line (head, a body of two strands, wings, a spade tail); in the story it rises from sparks along a path, circles
// once and breathes a firework. Everything that moves is a smooth path; fire and sparkle are light.
import { TAU, WARM, GOLD, PINK, CYAN, ORANGE, RED, GREEN, mix, paint, frac, smooth, hash, yaw, roll, pitch, breathe, glint, sparkle, chase, trace, burstLight, loosen, share, part, act } from "../show-motion.js";
import { sampleOutline } from "../show-geometry.js";
import { sample3d, starField } from "../show-shapes.js";

export const builders = {};

// ---------- shared helpers ----------
const line = (...pts) => ({ pts, closed: false });
const poly = (...pts) => ({ pts, closed: true });
const arcPts = (cx, cy, r, a0, a1, k = 24) => Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const lengthOf = (paths) => paths.reduce((s, { pts, closed = true }) => { let L = 0; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0)); } return s + L; }, 0);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** Corners of a box, so a beat whose live motion travels keeps the whole journey in view (fitPts). */
const box = (x0, x1, y0, y1) => [[x0, y0, 0], [x1, y0, 0], [x0, y1, 0], [x1, y1, 0]];

/**
 * A smooth path through 3D control points (Catmull-Rom), measured by arc length: at(σ) is the point σ along it, tan(σ)
 * the unit direction; beyond either end it continues straight. knot(i) is the length up to control point i.
 */
function pathOf(ctrl, per = 64) {
  const pts = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const u = k / per, u2 = u * u, u3 = u2 * u;
      pts.push([0, 1, 2].map((q) => 0.5 * (2 * p1[q] + (p2[q] - p0[q]) * u + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * u2 + (3 * p1[q] - p0[q] - 3 * p2[q] + p3[q]) * u3)));
    }
  }
  pts.push(ctrl[ctrl.length - 1].slice());
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub(pts[i], pts[i - 1])));
  const length = cum[cum.length - 1], end = (i) => unit(sub(pts[i + 1], pts[i]));
  const t0 = end(0), t1 = end(pts.length - 2);
  const at = (s) => {
    if (s <= 0) return [pts[0][0] + t0[0] * s, pts[0][1] + t0[1] * s, pts[0][2] + t0[2] * s];
    if (s >= length) { const d = s - length, p = pts[pts.length - 1]; return [p[0] + t1[0] * d, p[1] + t1[1] * d, p[2] + t1[2] * d]; }
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const u = (s - cum[lo]) / (cum[hi] - cum[lo] || 1), a = pts[lo], b = pts[hi];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  };
  const tan = (s, e = 0.14) => unit(sub(at(s + e), at(s - e))); // a wide window smooths the bends between control points, so rigid pieces turn without a jolt
  // the side of a flying body that faces the sky (square to the path; on a climb it leans back), taken from the
  // heading over a body length, so wings turn gradually rather than at a bend
  const ups = cum.map((c) => { const T = tan(c, 0.3); return unit([-T[1] * T[0], 1 - T[1] * T[1], -T[1] * T[2]]); });
  const up = (s) => {
    const c = Math.max(0, Math.min(length, s)); let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= c) lo = m; else hi = m; }
    const u = (c - cum[lo]) / (cum[hi] - cum[lo] || 1), a = ups[lo], b = ups[hi], T = tan(s), v = [0, 1, 2].map((q) => a[q] + (b[q] - a[q]) * u), d = v[0] * T[0] + v[1] * T[1] + v[2] * T[2];
    return unit([v[0] - d * T[0], v[1] - d * T[1], v[2] - d * T[2]]);
  };
  return { length, at, tan, up, knot: (i) => cum[Math.min(cum.length - 1, i * per)] };
}

// ---------- Reise · Kompass ----------
/**
 * The needle searching north: it arrives turned off north, swings back and forth with shrinking amplitude and rests
 * on north (a critically damped envelope, so it starts from rest). Before the period ends it turns off north again,
 * so a loop joins without a jump.
 */
function needleAngle(t, { start = 0.2, period = 12, amp = 0.6, decay = 0.9, swing = 1.8 } = {}) {
  const u = frac(Math.max(0, t - start) / period) * period, back = smooth((u - period + 2.5) / 2.5);
  return amp * (Math.cos((TAU * u) / swing) * (1 + u / decay) * Math.exp(-u / decay) * (1 - back) + back);
}
/** The needle as a slim rhombus: north half and south half (for their colours). */
const needleHalves = (len = 0.6, w = 0.075) => [line([-w, 0], [0, len], [w, 0]), line([w, 0], [0, -len], [-w, 0])];

/** SPARK compass: a ring with four spikes reaching outward (north the longest) and the needle. kind: 0 ring,
 * 1 spike, 2 north spike, 3 needle north, 4 needle south. */
function compassFlat(n) {
  const R = 0.78, spike = (d, tip) => line([Math.cos(d - 0.22) * R, Math.sin(d - 0.22) * R], [Math.cos(d) * tip, Math.sin(d) * tip], [Math.cos(d + 0.22) * R, Math.sin(d + 0.22) * R]);
  const groups = [[{ pts: arcPts(0, 0, R, 0, TAU, 72).slice(0, 72), closed: true }], [spike(0, 1.08), spike(Math.PI, 1.08), spike(-Math.PI / 2, 1.08)], [spike(Math.PI / 2, 1.32)], [needleHalves()[0]], [needleHalves()[1]]];
  const counts = share(n, groups.map(lengthOf)), pts = [], kind = [];
  groups.forEach((g, k) => sampleOutline(g, counts[k]).forEach(([x, y]) => { pts.push([x, y, 0]); kind.push(k); }));
  return { pts, kind };
}

/**
 * A pocket compass as a body: the case as two rings (front and back) joined by short struts, a bow on top, four
 * markers pointing inward from the rim (north larger), small ticks between them, and the needle a little in front.
 * Returns groups so that the story can fly them as its own parts: { case, rose, needle } with the needle split into
 * north and south half (needleNorth = how many of the needle's points are the north half).
 */
function compassBody(nCase, nRose, nNeedle, R = 0.85, depth = 0.18) {
  const ring = (z) => ({ pts: arcPts(0, 0, R, 0, TAU, 72).slice(0, 72).map(([x, y]) => [x, y, z]), closed: true });
  const struts = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU + TAU / 16; return line([Math.cos(a) * R, Math.sin(a) * R, depth / 2], [Math.cos(a) * R, Math.sin(a) * R, -depth / 2]); });
  const bow = { pts: arcPts(0, R + 0.13, 0.1, -Math.PI / 2 - 0.9, 1.5 * Math.PI + 0.9, 20).map(([x, y]) => [x, y, 0]) };
  const casePts = sample3d([ring(depth / 2), ring(-depth / 2), ...struts, bow], nCase);
  const marker = (d, tip, w) => line([Math.cos(d - w) * R * 0.97, Math.sin(d - w) * R * 0.97, 0], [Math.cos(d) * tip, Math.sin(d) * tip, 0], [Math.cos(d + w) * R * 0.97, Math.sin(d + w) * R * 0.97, 0]);
  const ticks = [1, 3, 5, 7].map((i) => { const a = (i / 8) * TAU; return line([Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, 0], [Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78, 0]); });
  const [north, rest] = share(nRose, [1.3, 3.6]);
  const rose = [...sample3d([marker(Math.PI / 2, R * 0.58, 0.2)], north), ...sample3d([marker(0, R * 0.66, 0.14), marker(Math.PI, R * 0.66, 0.14), marker(-Math.PI / 2, R * 0.66, 0.14), ...ticks], rest)];
  const [nN, nS] = share(nNeedle, [1, 1]), [hn, hs] = needleHalves(R * 0.7, 0.08);
  const needle = [...sampleOutline([hn], nN).map(([x, y]) => [x, y, 0.07]), ...sampleOutline([hs], nS).map(([x, y]) => [x, y, 0.07])];
  return { casePts, rose, roseNorth: north, needle, needleNorth: nN };
}
const compassColours = ({ casePts, rose, roseNorth, needle, needleNorth }) => [
  ...paint(casePts, GOLD), ...paint(rose, (p, i) => (i < roseNorth ? GOLD : WARM)), ...paint(needle, (p, i) => (i < needleNorth ? CYAN : WARM)),
];

builders.compass2d = (n, caption) => {
  const { pts, kind } = compassFlat(n);
  const colour = [WARM, WARM, GOLD, CYAN, WARM];
  return { beats: [{ pts: pts.map((p, j) => [...p, ...colour[kind[j]]]), caption, live: (b, j, t, o) => {
    const k = kind[j];
    if (k >= 3) { roll(o, needleAngle(t), 0, 0); o[3] = k === 3 ? 1 + 0.35 * Math.max(0, b[1] / 0.6) : 0.95; }
    else if (k === 2) o[3] = 1.05 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2)) * Math.max(0, (b[1] - 0.7) / 0.6); // light at the north tip
    else o[3] = glint(Math.atan2(b[1], b[0]), t, 5, 0.3, -Math.PI, Math.PI);
  } }] };
};

builders.compass3d = (n, caption) => {
  const [c, r] = share(n, [4.6, 3.4]), nNeedle = Math.max(26, Math.round(n * 0.13)), body = compassBody(c, r - nNeedle, nNeedle);
  const pts = compassColours(body), nc = body.casePts.length, needleFrom = nc + body.rose.length;
  // the compass lies tilted and turned away, then turns into the frontal view while the needle finds north
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    if (j >= needleFrom) { roll(o, needleAngle(t, { start: 1.2, amp: 0.55, swing: 1.9 }), 0, 0); o[3] = j - needleFrom < body.needleNorth ? 1.25 : 0.95; }
    else if (j >= nc && j < nc + body.roseNorth) o[3] = 1.1 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2));
    else if (j < nc) o[3] = glint(Math.atan2(b[1], b[0]), t, 4.5, 0.35, -Math.PI, Math.PI);
    const u = smooth(Math.max(0, t) / 3.2);
    yaw(o, 0.8 * (1 - u) + 0.18 * Math.sin((t * TAU) / 9) * smooth((t - 2.6) / 2));
    pitch(o, -0.95 * (1 - u));
  } }] };
};

// ---------- Reise · Geschichte ----------
const GROUND = -0.8, TILT = -0.95; // the city lies back about its ground line; the map lies at the same angle
const tilted = (x, v, w) => { const c = Math.cos(TILT), s = Math.sin(TILT), y = v - GROUND; return [x, GROUND + y * c - w * s, y * s + w * c]; };
const FOLDS = [-1.2, -0.6, 0, 0.6, 1.2];
/** The map is folded like a leporello: every other fold stands a little towards the audience. */
const foldW = (u) => { const k = Math.max(0, Math.min(3, Math.floor((u + 1.2) / 0.6))), f = (u - FOLDS[k]) / 0.6; return 0.11 * (k % 2 ? 1 - f : f); };
const onMap = (u, v, lift = 0) => tilted(u, v, foldW(u) + lift);
const MAP_TOP = 0.85;
const PINS = [[-0.95, -0.5], [-0.55, 0.12], [-0.05, 0.32], [0.4, 0.05], [0.85, 0.42]];

/** A generic old town: gabled houses, a church tower with a spire, a domed tower, a stepped gable. Closed, so the
 * ground line is drawn too. */
const SKYLINE = poly([-1.25, GROUND], [-1.25, -0.3], [-1.1, -0.1], [-0.95, -0.3], [-0.95, -0.2], [-0.8, 0.0], [-0.65, -0.2], [-0.65, -0.35], [-0.5, -0.35],
  [-0.5, 0.05], [-0.47, 0.05], [-0.36, 0.72], [-0.25, 0.05], [-0.22, 0.05], [-0.22, -0.15], [-0.08, -0.15], [0.04, 0.02], [0.16, -0.15], [0.16, -0.3], [0.3, -0.3],
  [0.3, 0.12], ...arcPts(0.42, 0.12, 0.12, Math.PI, 0, 8).slice(1, -1), [0.54, 0.12], [0.54, -0.22],
  [0.62, -0.22], [0.62, -0.08], [0.7, -0.08], [0.7, 0.04], [0.78, 0.04], [0.78, 0.14], [0.86, 0.14], [0.86, 0.04], [0.94, 0.04], [0.94, -0.08], [1.02, -0.08], [1.02, -0.22],
  [1.08, -0.22], [1.16, -0.06], [1.25, -0.22], [1.25, GROUND]);
const roofAt = (x) => { const p = SKYLINE.pts; let top = GROUND; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; if ((x - a[0]) * (x - b[0]) <= 0 && a[0] !== b[0]) top = Math.max(top, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])); else if (Math.abs(x - a[0]) < 0.02) top = Math.max(top, a[1]); } return top; };
/** Lit windows: a loose grid in the lower storeys, chosen by a fixed hash so it does not read as a pattern. */
function windows(k) {
  const cand = [];
  for (const y of [-0.43, -0.57, -0.71]) for (let i = 0; i < 24; i++) cand.push([-1.15 + i * 0.1 + (y === -0.57 ? 0.05 : 0), y]);
  return [[-0.36, -0.1], [-0.36, -0.24], [0.42, -0.05], ...cand.map((p, i) => [p, hash(i * 7.3 + 1)]).sort((a, b) => a[1] - b[1]).map((q) => q[0])].slice(0, k).map(([x, y]) => [x, y, 0]);
}
const moonPts = (k, cx = 1.0, cy = 0.82, r = 0.15) => sampleOutline([line(...arcPts(cx, cy, r, -0.35 * Math.PI, 0.85 * Math.PI, 20)), line(...arcPts(cx + r * 0.42, cy + r * 0.32, r * 0.82, 0.86 * Math.PI, -0.32 * Math.PI, 20))], k).map(([x, y]) => [x, y, 0]);
/** Stars above the roofs (never on the spire). */
const skyStars = (k) => starField(k * 3, -1.25, 1.25, 0.15, 1.05, 5).filter(([x, y]) => y > roofAt(x) + 0.14 && Math.hypot(x - 1.0, y - 0.82) > 0.28).slice(0, k);

/** A pin: a drop standing on its tip at the foot point. */
const pinShape = (k, foot, h = 0.3) => { const r = h * 0.3, cy = h - r; return sampleOutline([poly([0, 0], ...arcPts(0, cy, r, -0.3, Math.PI + 0.3, 14))], k).map(([x, y]) => [foot[0] + x, foot[1] + y, foot[2]]); };
/** The paper plane in its own frame: a nose forward (a), wing span (b), keel below (c). */
const PLANE = [line([0.24, 0, 0], [-0.17, 0.18, 0], [-0.17, 0, 0], [-0.17, -0.18, 0], [0.24, 0, 0]), line([0.24, 0, 0], [-0.17, 0, -0.08], [-0.17, 0, 0])];

builders.travelStory = (n) => {
  const PL = 40, PN = 50, RT = 60, LD = n - PL - PN - RT, perPin = share(PN, PINS.map(() => 1));
  // act 1: the town at night
  const town = sampleOutline([SKYLINE], LD).map(([x, y]) => [x, y, 0]), lit = windows(PN), stars = skyStars(RT), moon = moonPts(PL);
  // act 3–5: the folded map, pins on it, the route between them as dashes on the paper
  const mapLines = [line(...FOLDS.map((u) => onMap(u, GROUND))), line(...FOLDS.map((u) => onMap(u, MAP_TOP))), line(onMap(-1.2, GROUND), onMap(-1.2, MAP_TOP)), line(onMap(1.2, GROUND), onMap(1.2, MAP_TOP)), ...FOLDS.slice(1, -1).map((u) => line(onMap(u, GROUND), onMap(u, MAP_TOP)))];
  const map = sample3d(mapLines, LD);
  const pins = PINS.flatMap(([u, v], k) => pinShape(perPin[k], onMap(u, v)));
  const route = pathOf(PINS.map(([u, v]) => [u, v, 0])), DASH = 12, per = share(RT, Array(DASH).fill(1)), routeU = [];
  const dashes = per.flatMap((m, d) => Array.from({ length: m }, (_, i) => { const s = ((d + (0.6 * (i + 0.5)) / m) / DASH) * route.length, [u, v] = route.at(s); routeU.push(s / route.length); return onMap(u, v, 0.01); }));
  const pinSigma = PINS.map((_, k) => route.knot(k));
  // the plane: placed on the map at σ along the route, nose along the route, hovering a little above the paper
  const model = sample3d(PLANE, PL);
  const planeOnRoute = (q, s) => { const [u, v] = route.at(s), tn = route.tan(s, 0.25), a = q[0] * 1.15, b = q[1] * 1.15; const pu = u + a * tn[0] - b * tn[1], pv = v + a * tn[1] + b * tn[0]; return tilted(pu, pv, 0.27 + q[2] * 1.15); }; // a level flight above the folds
  const S0 = -0.3, S1 = route.length + 0.12, FLY = 7, flown = (t) => S0 + (S1 - S0) * smooth((t - 0.3) / FLY);
  const parked = model.map((q) => planeOnRoute(q, S0));
  // act 6: the compass, the plane on an orbit around it
  const body = compassBody(LD, RT, PN, 0.82), CY = 0.0; // land → case, route → rose, pins → needle
  const compass = compassColours(body).map(([x, y, z, ...c]) => [x, y + CY, z, ...c]);
  const RX = 1.3, RZ = 0.95, W = TAU / 9;
  const orbit = (ph) => [RX * Math.cos(ph), CY + 0.12 * Math.sin(ph), RZ * Math.sin(ph)];
  const planeOnOrbit = (q, ph) => {
    const c = orbit(ph), T = unit(sub(orbit(ph + 0.01), orbit(ph - 0.01))), inward = unit([-Math.cos(ph), 0, -Math.sin(ph)]);
    const S = unit([inward[0] * 0.8, -0.6, inward[2] * 0.8]); // banked into the turn, so the wings show from the front
    let K = cross(T, S); if (K[1] > 0) K = K.map((x) => -x);
    return [0, 1, 2].map((i) => c[i] + (T[i] * q[0] + S[i] * q[1] + K[i] * q[2]) * 1.3);
  };
  const PH0 = 0.15, phase = (t) => { const tt = Math.max(0, t); return PH0 + W * (tt < 2 ? (tt * tt) / 4 : tt - 1); }; // the orbit starts gently
  const circling = model.map((q) => planeOnOrbit(q, PH0));
  const plane = (pts, rigid = false) => part("plane", paint(pts, WARM), { rigid });
  const fold = (t) => smooth(Math.max(0, t) / 2.6);
  const mapColour = mix(GOLD, WARM, 0.5); // pale paper, apart from the cyan route
  const pinLight = (j0, j, t, at) => { const k = Math.min(PINS.length - 1, Math.floor((j - j0) / perPin[0])); const tk = at(k); return t < tk ? 0.18 : 1 + 0.7 * Math.exp(-(t - tk) / 0.35); };
  const L = LD, P = LD + PN; // part offsets: land, pins, route, plane
  return { beats: [
    act([part("land", paint(town, WARM)), part("pins", paint(lit, GOLD)), part("route", paint(stars, WARM)), plane(moon)], { caption: "Eine Stadt bei Nacht", hold: 1.6, live: (b, j, t, o) => {
      if (j >= L && j < P) o[3] = 0.85 + 0.35 * sparkle(j, t, 0, 1); else if (j >= P && j < P + RT) o[3] = sparkle(j, t, 0.5, 1.2); else if (j >= P + RT) o[3] = 1.1;
    } }),
    act([part("land", paint(town, WARM)), part("pins", paint(lit, GOLD)), part("route", paint(stars, WARM)), plane(moon)], { caption: "sie legt sich flach", hold: 3, live: (b, j, t, o) => {
      if (j < P) pitch(o, TILT * fold(t), GROUND, 0); // the town tips back about its ground line
      if (j >= L && j < P) o[3] = 1; else if (j >= P && j < P + RT) o[3] = sparkle(j, t, 0.5, 1.2); else if (j >= P + RT) o[3] = 1.1;
    } }),
    act([part("land", paint(map, mapColour)), part("pins", paint(pins, PINK)), part("route", paint(dashes, CYAN)), plane(parked, true)], { caption: "und wird zur Karte, Pins leuchten auf", hold: 3.2, live: (b, j, t, o) => {
      if (j >= L && j < P) o[3] = pinLight(L, j, t, (k) => 0.3 + 0.55 * k); else if (j >= P && j < P + RT) o[3] = 0.15;
    } }),
    act([part("land", paint(map, mapColour)), part("pins", paint(pins, PINK)), part("route", paint(dashes, CYAN)), plane(parked, true)], { caption: "eine Route verbindet die Orte", hold: 3, live: (b, j, t, o) => {
      if (j >= L && j < P) o[3] = breathe(t, 2.6, (j - L) * 0.02); else if (j >= P && j < P + RT) o[3] = trace(routeU[j - P], t, 2.4, { delay: 0.2, dim: 0.15 });
    } }),
    act([part("land", paint(map, mapColour)), part("pins", paint(pins, PINK)), part("route", paint(dashes, CYAN)), plane(parked, true)], { caption: "ein Papierflieger fliegt die Route ab", hold: FLY + 1, live: (b, j, t, o) => {
      const s = flown(t);
      if (j >= P + RT) { const [x, y, z] = planeOnRoute(model[j - P - RT], s); o[0] = x; o[1] = y; o[2] = z; o[3] = 1.2; }
      else if (j >= L && j < P) { const k = Math.min(PINS.length - 1, Math.floor((j - L) / perPin[0])); o[3] = 1 + 0.7 * Math.exp(-(((s - pinSigma[k]) / 0.15) ** 2)); } // each pin flashes as the plane passes
      else if (j >= P) o[3] = 1;
    } }),
    { ...act([part("land", compass.slice(0, LD)), part("pins", compass.slice(LD + RT)), part("route", compass.slice(LD, LD + RT)), plane(circling, true)], { caption: "…und kreist um den Kompass, der nach Norden zeigt", live: (b, j, t, o) => {
      if (j >= P + RT) { const [x, y, z] = planeOnOrbit(model[j - P - RT], phase(t)); o[0] = x; o[1] = y; o[2] = z; o[3] = 1.15; }
      else if (j >= L && j < P) { roll(o, needleAngle(t, { start: 0.3, amp: 0.45, swing: 2.0, decay: 1.0 }), 0, CY); if (j - L < body.needleNorth) o[3] = 1.25; }
      else if (j < L) o[3] = glint(Math.atan2(b[1] - CY, b[0]), t, 4.5, 0.35, -Math.PI, Math.PI);
      else if (j - P < body.roseNorth) o[3] = 1.1 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2));
    } }), fitPts: [...compass, ...box(-RX - 0.2, RX + 0.2, -0.85, 0.85)] },
  ] };
};

// ---------- Drache ----------
/**
 * The dragon in its own coordinates. The body lies along a spine: (s, off) with s from the neck (0) to the tail tip
 * (len) and off across it (positive = back). Head and wings are rigid pieces in the local frame (a forward, b towards
 * the back) of the neck and the shoulder. Every drone keeps its model coordinates, so a pose is any spine: a still
 * S-curve for SPARK and HORIZON, a moving path in the story.
 */
const HEAD = [
  poly([0, 0.075], [0.07, 0.13], [0.18, 0.125], [0.3, 0.085], [0.38, 0.05], [0.38, 0.0], [0.23, -0.005], [0.34, -0.045], [0.31, -0.085], [0.15, -0.085], [0, -0.075]),
  line([0.07, 0.13], [0.0, 0.2], [-0.09, 0.24]), line([0.14, 0.13], [0.11, 0.21], [0.04, 0.27]),
];
const WING = (fingers) => {
  const scallop = (a, b, c) => Array.from({ length: 7 }, (_, i) => { const u = i / 6, v = 1 - u; return [v * v * a[0] + 2 * u * v * c[0] + u * u * b[0], v * v * a[1] + 2 * u * v * c[1] + u * u * b[1]]; });
  const R = [0, 0], Wr = [0.12, 0.42], Tp = [-0.2, 0.86], F1 = [-0.44, 0.52], F2 = [-0.46, 0.2], Rr = [-0.3, 0];
  const edge = line(R, Wr, Tp, ...scallop(Tp, F1, [-0.24, 0.6]).slice(1), ...scallop(F1, F2, [-0.33, 0.36]).slice(1), ...scallop(F2, Rr, [-0.28, 0.12]).slice(1));
  return fingers ? [edge, line(Wr, F1), line(Wr, F2)] : [edge];
};
function dragonModel(n, { len = 1.7, fingers = true, spikes = 5, eye = 2, slim = false } = {}) {
  const wd = (s) => 0.022 + 0.058 * Math.pow(Math.max(0, 1 - s / len), 0.85);
  const strand = (side) => line(...Array.from({ length: 41 }, (_, i) => { const s = (i / 40) * len; return [s, side * wd(s)]; }));
  const spikeLines = Array.from({ length: spikes }, (_, i) => { const s = len * (0.14 + (0.62 * i) / Math.max(1, spikes - 1)), h = 0.085 * (1 - (0.5 * s) / len); const w = slim ? 0 : wd(s); return line([s - 0.045, w], [s + 0.01, w + h], [s + 0.05, w]); });
  const spade = poly([len - 0.01, 0], [len + 0.06, 0.07], [len + 0.17, 0], [len + 0.06, -0.07]);
  const groups = [
    // slim (SPARK): the body as one line and of the far wing only its leading edge, so 100 drones stay legible
    { kind: "body", paths: slim ? [strand(0)] : [strand(1), strand(-1)], colour: (p) => mix(RED, ORANGE, p[0] / len) },
    { kind: "body", paths: spikeLines, colour: () => GREEN, tag: "spike" },
    { kind: "body", paths: [spade], colour: () => GOLD, tag: "tail" },
    { kind: "head", paths: [HEAD[0]], colour: () => mix(RED, ORANGE, 0.35) },
    { kind: "head", paths: HEAD.slice(1), colour: () => GOLD },
    { kind: "wing1", paths: slim ? [line(...WING(false)[0].pts.slice(0, 3))] : WING(fingers), colour: (p) => mix(GOLD, ORANGE, 0.35) }, // the far wing, a little smaller
    { kind: "wing0", paths: WING(fingers), colour: () => GOLD },
  ];
  const weights = groups.map((g) => lengthOf(g.paths) * (g.kind === "wing1" ? 0.85 : 1));
  const counts = share(n - eye, weights), meta = [];
  groups.forEach((g, k) => sampleOutline(g.paths, counts[k]).forEach((p) => meta.push({ kind: g.kind, p, c: g.colour(p), tag: g.tag })));
  for (let i = 0; i < eye; i++) meta.push({ kind: "head", p: [0.2 + i * 0.012, 0.05], c: GREEN, tag: "eye" });
  return { meta, len, wd };
}

/**
 * Places the dragon along a spine. spine(s) → { p, T, N } with T forward (towards the head) and N towards the back.
 * Wings stand in the plane of T and N of the shoulder, tipped out of it by ±tilt (near wing towards the audience) and
 * turned by flap(t) about the body axis; head = rigid in the neck's frame.
 */
function dragonPose(model, spine, { shoulder = 0.55, tilt = 0.45, flap = 0, head = 1.15, headTurn = 0, wingScale = 1, wingTurn = 0, fan = 0.3, wave = null } = {}) {
  const hc = Math.cos(headTurn), hs = Math.sin(headTurn);
  const neck = spine(0), sh = spine(shoulder), B0 = cross(neck.T, neck.N), Bs = cross(sh.T, sh.N);
  return (m, out) => {
    if (m.kind === "body") {
      const f = spine(m.p[0]); let off = m.p[1], bz = 0;
      if (wave) { const [dn, db] = wave(m.p[0]); off += dn; bz = db; }
      const B = cross(f.T, f.N);
      for (let i = 0; i < 3; i++) out[i] = f.p[i] + f.N[i] * off + B[i] * bz;
    } else if (m.kind === "head") {
      const a = (m.p[0] * hc - m.p[1] * hs) * head, b = (m.p[0] * hs + m.p[1] * hc) * head;
      for (let i = 0; i < 3; i++) out[i] = neck.p[i] + neck.T[i] * a + neck.N[i] * b;
    } else {
      const far = m.kind === "wing1", k = (far ? 0.85 : 1) * wingScale, turn = wingTurn + (far ? fan : 0), c = Math.cos(turn), s = Math.sin(turn);
      const a0 = m.p[0] * k + (far ? -0.16 : 0), b0 = m.p[1] * k, a = a0 * c - b0 * s, b = a0 * s + b0 * c;
      const ang = (far ? -1 : 1) * (tilt + flap), ca = Math.cos(ang), sa = Math.sin(ang);
      for (let i = 0; i < 3; i++) out[i] = sh.p[i] + sh.T[i] * a + (sh.N[i] * ca + Bs[i] * sa) * b;
    }
    return out;
  };
}
/** A spine along a path whose head is at σ = head: N is the side of the back. In the picture plane ("plane") the back
 * is to the left of the direction of travel; in flight ("up") it faces the sky. */
const spineOn = (path, headAt, mode = "plane") => (s) => {
  const p = path.at(headAt - s), T = path.tan(headAt - s);
  const N = mode === "plane" ? unit([-T[1], T[0], 0]) : path.up(headAt - s);
  return { p, T, N };
};

// The still pose: the tail curls up at the left, the body runs low and level under the wings, the neck rises to the head.
const STILL = [[-1.25, -0.02, 0], [-1.05, -0.3, 0], [-0.7, -0.42, 0], [-0.3, -0.3, 0], [0.05, -0.28, 0], [0.3, -0.2, 0], [0.48, 0.02, 0], [0.55, 0.28, 0]];
const STILL_POSE = { shoulder: 0.75, head: 1.45, headTurn: -1.0, wingScale: 1.12 };
const STILL3D = STILL.map(([x, y], i) => [x, y, 0.28 * Math.sin(i * 1.1)]);

builders.dragon2d = (n, caption) => {
  const model = dragonModel(n, { fingers: false, spikes: 3, eye: 1, slim: true }), path = pathOf(STILL), L = path.length;
  const scaled = { ...model, meta: model.meta.map((m) => (m.kind === "body" ? { ...m, p: [m.p[0] * (L / model.len), m.p[1]] } : m)) };
  const place = dragonPose(scaled, spineOn(path, L), { ...STILL_POSE, tilt: 0, wingScale: 1.3, fan: 0.45, head: 1.7 }), pts = scaled.meta.map((m) => [...place(m, [0, 0, 0]), ...m.c]);
  const tailFrom = L * 0.72, tailPivot = path.at(L - tailFrom);
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    const m = scaled.meta[j];
    if (m.kind === "body") {
      const s = m.p[0];
      if (s > tailFrom) roll(o, 0.07 * Math.sin((t * TAU) / 3.2) * smooth((s - tailFrom) / (L - tailFrom)), tailPivot[0], tailPivot[1]); // the tail tip sways a little
      o[3] = m.tag === "spike" ? 1.1 : 1 + 0.5 * Math.exp(-(((frac(t / 3) * 1.4 * L - s) / 0.18) ** 2)); // a glint runs down the scales
    } else if (m.tag === "eye") o[3] = 1.3;
  } }] };
};

builders.dragon3d = (n, caption) => {
  const model = dragonModel(n, { fingers: true, spikes: 5, eye: 2 }), path = pathOf(STILL3D), L = path.length;
  const meta = model.meta.map((m) => (m.kind === "body" ? { ...m, p: [m.p[0] * (L / model.len), m.p[1]] } : m));
  const spine = spineOn(path, L), rest = dragonPose(model, spine, { ...STILL_POSE, tilt: 0.5 });
  const pts = meta.map((m) => [...rest(m, [0, 0, 0]), ...m.c]);
  // the wings beat slowly with a small stroke; a gentle wave runs down the body from the shoulders to the tail
  const WAVE = 0.045, swim = (t) => (s) => { const e = smooth((s - 0.45) / (L * 0.5)), ph = TAU * (s / 0.95 - t / 2.8); return [WAVE * Math.sin(ph) * e, 1.4 * WAVE * Math.cos(ph) * e]; };
  let at = NaN, pose = null;
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    if (t !== at) { at = t; pose = dragonPose(model, spine, { ...STILL_POSE, tilt: 0.5, flap: 0.42 * Math.sin((t * TAU) / 2.4), wave: swim(t) }); }
    const m = meta[j]; pose(m, o);
    if (m.tag === "eye") o[3] = 1.3; else if (m.kind === "body" && !m.tag) o[3] = 1 + 0.4 * Math.exp(-(((frac(t / 3.4) * 1.4 * L - m.p[0]) / 0.2) ** 2));
    yaw(o, 0.3 * Math.sin((t * TAU) / 10));
  } }] };
};

builders.dragonStory = (n) => {
  const F = 70, model = dragonModel(n - F, { fingers: true, spikes: 5, eye: 2 }), LEN = model.len, meta = model.meta, D = meta.length;
  // the flight: coiled on the ground, rising in a wide S, one circle in depth, out towards the upper right
  // one continuous spiral: coiled on the ground, then climbing round an ellipse, then level for the rest of the
  // circle, leaving it in front heading right (a falls along the way; no hairpins, no steep climbs)
  const G = -0.92, A0 = 5.3, A1 = 1.82, AS = A0 + Math.PI, Y1 = 0.22;
  const coil = Array.from({ length: 14 }, (_, i) => { const th = -1.08 - 13 * (1 - i / 13), r = 0.1 + 0.25 * (i / 13); return [-0.5 + Math.cos(th) * r, G, 0.655 + Math.sin(th) * r * 0.8]; });
  const ring = (a, y) => [0.05 + Math.cos(a) * 0.7, y, 0.55 * Math.sin(a) - 0.05];
  const rise = Array.from({ length: 7 }, (_, i) => { const u = (i + 1) / 7; return ring(AS - u * Math.PI, G + 0.05 + (Y1 - G - 0.05) * (0.5 * u + 0.5 * smooth(u))); });
  const loop = Array.from({ length: 7 }, (_, i) => ring(A0 - ((i + 1) / 7) * (A0 - A1), Y1 + 0.04 * Math.sin((i + 1) * 0.9)));
  const out = [[0.2, Y1 + 0.06, 0.5], [0.5, Y1 + 0.1, 0.42], [0.8, Y1 + 0.16, 0.3]];
  const ctrl = [...coil, ...rise, ...loop, ...out], path = pathOf(ctrl);
  const S1 = path.knot(coil.length - 1) + 0.1, S2 = path.knot(coil.length + rise.length - 1), S3 = path.knot(coil.length + rise.length + loop.length + 1);
  const RISE = 5.6, CIRCLE = 6.5;
  const flight = (from, to, dur) => (t) => from + (to - from) * smooth(Math.max(0, t) / dur);
  const flapAt = (t) => 0.22 * Math.sin((t * TAU) / 2.6);
  const posed = (headAt, t, extra = {}) => dragonPose(model, spineOn(path, headAt, "up"), { tilt: 0.45, head: 1.25, flap: flapAt(t), ...extra });
  // the sparks follow the tail like a comet's tail; at the end they are the fire and the firework
  const trail = (headAt, k) => { const s = headAt - LEN - 0.12 - 0.75 * (k / F), p = path.at(s); return [p[0] + (hash(k * 3.1) - 0.5) * 0.12, p[1] + (hash(k * 5.3) - 0.5) * 0.12, p[2] + (hash(k * 7.7) - 0.5) * 0.12]; };
  const poseAt = (headAt, t) => { const f = posed(headAt, t); return [...meta.map((m) => f(m, [0, 0, 0])), ...Array.from({ length: F }, (_, k) => trail(headAt, k))]; };
  const colours = [...meta.map((m) => m.c), ...Array.from({ length: F }, (_, k) => mix(GOLD, ORANGE, hash(k * 2.3)))];
  const withColour = (pts) => pts.map((p, j) => [...p, ...colours[j]]);
  // the last picture: fire from the mouth as a cone of drones, then a firework shell where the cone ends
  // the last picture: it settles side-on in the still pose (body level, wings up, head raised) and breathes fire
  const landing = pathOf(STILL.map(([x, y, z], i) => [x * 0.8 - 0.1, y * 0.8 - 0.05, 0.12 * Math.sin(i * 1.1)])), LAND = { ...STILL_POSE, tilt: 0.45, head: 1.3 };
  const landed = (t) => dragonPose(model, spineOn(landing, landing.length), { ...LAND, flap: flapAt(t) });
  const endF = landed(0), mouth = endF({ kind: "head", p: [0.39, 0.0] }, [0, 0, 0]), snout = endF({ kind: "head", p: [0.1, 0.0] }, [0, 0, 0]);
  const fwd = unit(sub(mouth, snout)), dir = unit([fwd[0] * 0.6, fwd[1] * 0.6 + 0.75, fwd[2] * 0.3]), side = unit(cross(dir, [0, 0, 1])), up2 = cross(side, dir);
  const CONE = 28, SH = F - CONE, BURST = [0, 1, 2].map((i) => mouth[i] + dir[i] * 1.0), BR = 0.5;
  const cone = Array.from({ length: CONE }, (_, k) => { const d = 0.08 + 0.7 * ((k + 0.5) / CONE), a = k * 2.4, r = d * 0.28 * Math.sqrt(hash(k + 4)); return [0, 1, 2].map((i) => mouth[i] + dir[i] * d + (side[i] * Math.cos(a) + up2[i] * Math.sin(a)) * r); });
  const GA = Math.PI * (3 - Math.sqrt(5)), shellPts = Array.from({ length: SH }, (_, k) => { const rays = 18, ray = k % rays, y = 1 - (ray / (rays - 1)) * 2, r = Math.sqrt(1 - y * y), a = GA * ray, along = 0.45 + 0.55 * ((Math.floor(k / rays) + 1) / (Math.ceil(SH / rays))); return [BURST[0] + Math.cos(a) * r * along * BR, BURST[1] + y * along * BR, BURST[2] + Math.sin(a) * r * along * BR]; });
  const fireColour = [...cone.map((p, k) => mix(GOLD, ORANGE, k / CONE)), ...shellPts.map((p, k) => (k % 3 === 0 ? RED : k % 3 === 1 ? GOLD : ORANGE))];
  const startPose = poseAt(S1, 0), riseEnd = poseAt(S2, 0);
  // what must stay in view: the dragon all along its flight (sampled), the fire and the firework
  const view = [...cone, ...shellPts, ...meta.map((m) => endF(m, [0, 0, 0]))];
  for (let h = S1; h <= S3; h += 0.12) view.push(...poseAt(h, 0).slice(0, D).filter((_, j) => j % 4 === 0));
  const parts = (pts, fire = null) => [part("dragon", pts.slice(0, D)), part("sparks", fire ?? pts.slice(D))];
  const glow = (m, j, t) => (m.tag === "eye" ? 1.3 : m.kind === "body" && !m.tag ? 1 + 0.35 * Math.exp(-(((frac(t / 2.8) * 2.2 - m.p[0]) / 0.2) ** 2)) : 1);
  const flying = (headFn) => { let at = NaN, f = null, h = 0; return (b, j, t, o) => {
    if (t !== at) { at = t; h = headFn(t); f = posed(h, t); }
    if (j < D) { f(meta[j], o); o[3] = glow(meta[j], j, t); } else { const [x, y, z] = trail(h, j - D); o[0] = x; o[1] = y; o[2] = z; o[3] = sparkle(j, t, 0.6, 1.4) * (1 - 0.5 * ((j - D) / F)); }
  }; };
  return { beats: [
    { ...act(parts(withColour(loosen(startPose, 0.35, 1)).map((p, j) => [p[0], Math.max(G - 0.05, p[1] - 0.1), p[2], ...(j < D ? mix(GOLD, ORANGE, hash(j)) : GOLD)])), { caption: "Funken am Boden", hold: 1.4, live: (b, j, t, o) => { o[3] = sparkle(j, t, 0.4, 1.3); } }), fitPts: view },
    { ...act(parts(withColour(startPose)), { caption: "ein Drache steigt auf", hold: RISE + 0.6, live: flying(flight(S1, S2, RISE)) }), fitPts: view },
    { ...act(parts(withColour(riseEnd)), { caption: "er dreht eine Runde", hold: CIRCLE + 0.6, live: flying(flight(S2, S3, CIRCLE)) }), fitPts: view },
    { ...act(parts(withColour(meta.map((m) => endF(m, [0, 0, 0]))), paint([...cone, ...shellPts], (p, k) => fireColour[k])), { caption: "…und speit ein Feuerwerk", live: (() => { let at = NaN, f = null; return (b, j, t, o) => {
      if (j < D) { if (t !== at) { at = t; f = landed(t); } f(meta[j], o); o[3] = glow(meta[j], j, t); return; }
      const k = j - D;
      if (k < CONE) o[3] = chase((k + 0.5) / CONE, t, 0.9, 0.35, 0.35, 1.5); // fire runs out of the mouth
      else { const r = Math.hypot(b[0] - BURST[0], b[1] - BURST[1], b[2] - BURST[2]) / BR, [a] = burstLight(r, t, 3.2, 0.4); o[3] = a; }
    }; })() }), fitPts: view },
  ] };
};
