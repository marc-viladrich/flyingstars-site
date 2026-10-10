// hochzeit motifs of the eleventh version (see src/content/show-configurator.js for the build names).
import { TAU, WARM, GOLD, PINK, VIOLET, CYAN, BLUE, ORANGE, RED, GREEN, DIAMOND, mix, paint, place, frac, smooth, hash, yaw, roll, pitch, sway, swing, breathe, glint, sparkle, chase, trace, burstLight, loosen, rig, share, part, act } from "../show-motion.js";
import { sampleOutline } from "../show-geometry.js";
import { starField } from "../show-shapes.js";

// ---------- helpers ----------
const lerp = (a, b, u) => a + (b - a) * u;
/** Angle covered by a turn that starts from rest: the speed eases in over T seconds (no jolt when the drones arrive). */
const ease = (t, T) => { if (t <= 0) return 0; const u = t / T; return u < 1 ? T * (u ** 3 - u ** 4 / 2) : T / 2 + (t - T); };
/** Closed or open Catmull-Rom curve through control points, as a polyline with k points per segment. */
function spline(P, k = 10, closed = true) {
  const m = P.length, out = [], at = (i) => P[closed ? (i + m) % m : Math.max(0, Math.min(m - 1, i))];
  for (let i = 0; i < (closed ? m : m - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let q = 0; q < k; q++) { const s = q / k, s2 = s * s, s3 = s2 * s; out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * s + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * s2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * s3))); }
  }
  if (!closed) out.push(P[m - 1]);
  return { pts: out, closed };
}
/** The classic heart curve at unit size (x ±1); from t0 to t1 as an open line, the whole heart closed. */
const heartCurve = (k = 120, t0 = 0, t1 = TAU) => ({ pts: Array.from({ length: k + 1 }, (_, i) => { const t = t0 + ((t1 - t0) * i) / k; return [Math.sin(t) ** 3, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 + 0.1]; }), closed: t1 - t0 >= TAU - 1e-9 });

// ---------- Herz · Tunnel ----------
/**
 * Hearts one behind the other, each a little smaller and higher, so the outline reads as a tunnel into the sky
 * (FSR-042). A wave of light travels from the front heart to the back; the tunnel sways a little about the front
 * heart, which is what shows its depth: the far hearts swing further than the near ones.
 */
function heartTunnel(n, caption) {
  const RINGS = 5, scale = (i) => 0.77 ** i, counts = share(n, Array.from({ length: RINGS }, (_, i) => scale(i))), depth = [], pts = [];
  counts.forEach((c, i) => {
    const s = scale(i), z = 0.3 - i * 0.6, colour = mix(PINK, VIOLET, i / (RINGS - 1));
    for (const [x, y] of sampleOutline([heartCurve()], c)) { pts.push([x * s, (y + 0.1) * s - 0.1, z, ...colour]); depth.push(i / (RINGS - 1)); }
  });
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    const k = smooth(t / 2);
    o[3] = chase(depth[j], t, 0.42, 1.25, 0.7, 1.7); // one heart after the other lights up, front to back
    yaw(o, k * 0.1 * Math.sin((t * TAU) / 11), 0, 0.3); pitch(o, k * 0.05 * Math.sin((t * TAU) / 14), 0, 0.3); roll(o, k * 0.05 * Math.sin((t * TAU) / 9));
  } }] };
}

// ---------- Lotus ----------
/**
 * A petal drawn as a loop: its midline leaves the base at angle th0 (from upright) and bends by `bend` towards the
 * tip; the half-width swells and narrows to a point. s ∈ [0, 1] along the midline, side ±1. Returns [radial, up, across].
 */
function petal(s, side, L, W, th0, bend, r0 = 0) {
  const th = th0 + bend * s, w = W * Math.sin(Math.PI * s) ** 0.8 * (1 - 0.3 * s);
  const r = Math.abs(bend) < 1e-4 ? L * s * Math.sin(th0) : (L * (Math.cos(th0) - Math.cos(th))) / bend;
  const y = Math.abs(bend) < 1e-4 ? L * s * Math.cos(th0) : (L * (Math.sin(th) - Math.sin(th0))) / bend;
  return [r0 + r, y, side * w, th];
}
const loop = (u) => (u < 0.5 ? [2 * u, -1] : [2 - 2 * u, 1]); // up one edge of the petal, down the other

// 3D lotus: an inner ring of three petals and an outer ring of five around an upright axis, a golden ring in the
// middle. open = 0 is the bud (petals bend inwards), 1 the open flower.
const RINGS3D = [{ k: 3, L: 0.8, W: 0.26, r0: 0.05, phase: 0, bud: [0.42, -0.86], open: [0.26, 0.4], colour: PINK }, { k: 5, L: 0.96, W: 0.32, r0: 0.08, phase: TAU / 10, bud: [0.5, -0.8], open: [0.98, 0.42], colour: mix(PINK, VIOLET, 0.75) }];
// HORIZON: one ring of six petals, three upright and three opened wide in between; fewer
// petals than the story's flowers so every petal is a clear line with 200 drones.
const RINGS_H = [{ k: 3, L: 1.3, W: 0.27, r0: 0.05, phase: 0, bud: [0.42, -0.86], open: [0.2, 0.32], colour: PINK }, { k: 3, L: 0.86, W: 0.29, r0: 0.07, phase: TAU / 6, bud: [0.5, -0.8], open: [0.92, 0.38], colour: mix(PINK, VIOLET, 0.75) }];
const PAD = mix(VIOLET, BLUE, 0.45);
/** Drone slots of one flower: [ring, petal, u] for petals, [-1, 0, u] for the golden ring, [-2, 0, u] for the pad. */
function lotusSlots(m, rings = RINGS3D, pad = 0) {
  const core = Math.max(8, Math.round(m * 0.09)), padN = Math.round(m * pad), slots = [];
  share(m - core - padN, rings.map((r) => r.k * r.L)).forEach((c, ri) => { const per = share(c, Array(rings[ri].k).fill(1)); per.forEach((pc, k) => { for (let i = 0; i < pc; i++) slots.push([ri, k, (i + 0.5) / pc]); }); });
  for (let i = 0; i < core; i++) slots.push([-1, 0, i / core]);
  for (let i = 0; i < padN; i++) slots.push([-2, 0, i / padN]);
  return slots;
}
/** Flower-local point of a slot (axis = y), opened by `open`, turned by spin about its axis. */
function lotusLocal([ri, k, u], open, spin, rings = RINGS3D) {
  if (ri === -2) { const a = u * TAU; return [Math.cos(a) * 0.78, -0.03, Math.sin(a) * 0.78]; }
  if (ri < 0) { const a = u * TAU + spin, r = lerp(0.07, 0.15, open); return [Math.cos(a) * r, lerp(0.12, 0.1, open), Math.sin(a) * r]; }
  const R = rings[ri], [s, side] = loop(u), w = lerp(0.62, 1, open);
  const [r, y, across] = petal(s, side, R.L, R.W * w, lerp(R.bud[0], R.open[0], open), lerp(R.bud[1], R.open[1], open), R.r0);
  const phi = R.phase + (k / R.k) * TAU + spin, c = Math.cos(phi), sn = Math.sin(phi);
  return [r * c - across * sn, y, r * sn + across * c];
}
const lotusColour = ([ri], rings = RINGS3D) => (ri === -2 ? PAD : ri < 0 ? GOLD : rings[ri].colour);
const TILT = 0.32; // tipped towards the audience: the open cup shows its petals from above
/** Places a flower-local point: tipped, then moved to (cx, cy, cz). */
function seat(p, cx, cy = -0.25, cz = 0, tilt = TILT) {
  const c = Math.cos(tilt), s = Math.sin(tilt);
  return [p[0] + cx, p[1] * c - p[2] * s + cy, p[1] * s + p[2] * c + cz];
}
/** Petal light: a soft wave goes round the flower, petal after petal. */
const petalLight = ([ri, k, u], t, dir = 1, rings = RINGS3D) => (ri === -2 ? 0.8 + 0.35 * Math.max(0, Math.sin(u * TAU - t * 0.9)) ** 2 : ri < 0 ? sparkle(k * 7 + u * 31, t, 1.0, 1.5) : 0.9 + 0.45 * Math.max(0, Math.sin(t * 1.1 * dir - (k / rings[ri].k) * TAU - ri * 0.6)) ** 3);

function lotus3d(n, caption) {
  // two flowers turn against each other about their axes, side by side; then they glide towards each other, one in
  // front of the other, turn into each other for a while and part again. One cycle, held long enough to be seen whole.
  const per = Math.floor(n / 2), slots = [...lotusSlots(per, RINGS_H), ...lotusSlots(n - per, RINGS_H)];
  const APART = 1.6, MOVE = 2.6, TOGETHER = 3, into = (t) => smooth((t - APART) / MOVE) - smooth((t - APART - MOVE - TOGETHER) / MOVE);
  const where = (j, t) => { const left = j < per, k = into(t), d = lerp(0.9, 0.32, k); return [left ? -d : d, -0.3, (left ? 1 : -1) * 0.38 * k]; };
  const pts = slots.map((sl, j) => [...seat(lotusLocal(sl, 1, 0, RINGS_H), ...where(j, 0)), ...lotusColour(sl, RINGS_H)]);
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    const left = j < per, spin = (left ? 1 : -1) * ease(t, 3) * 0.32, p = seat(lotusLocal(slots[j], 1, slots[j][0] === -2 ? 0 : spin, RINGS_H), ...where(j, t));
    o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = petalLight(slots[j], t, left ? 1 : -1, RINGS_H);
  }, hold: APART + 2 * MOVE + TOGETHER + 0.6 }] };
}

/** A sphere of twisted bands (loxodrome-like): every band winds from pole to pole; drones evenly by length. */
function twistedBand(m, band, bands, R = 1, twist = 1.4, lat = 1.3, dphi = 0) {
  const f = (s) => { const la = -lat + 2 * lat * s, ph = (band / bands) * TAU + twist * la + dphi; return [R * Math.cos(la) * Math.cos(ph), R * Math.sin(la), R * Math.cos(la) * Math.sin(ph)]; };
  const STEPS = 240, cum = [0];
  for (let i = 1; i <= STEPS; i++) { const a = f((i - 1) / STEPS), b = f(i / STEPS); cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
  return Array.from({ length: m }, (_, i) => { const d = ((i + 0.5) / m) * cum[STEPS]; let q = 1; while (cum[q] < d) q++; const s = (q - 1 + (d - cum[q - 1]) / (cum[q] - cum[q - 1])) / STEPS; return { s, p: f(s) }; });
}

function lotusStory(n) {
  const per = Math.floor(n / 2), sl = [lotusSlots(per), lotusSlots(n - per)];
  // reorder into named parts: left petals, right petals, both golden rings together as the core
  const petals = sl.map((list) => list.filter((s) => s[0] >= 0)), cores = sl.map((list) => list.filter((s) => s[0] < 0));
  const order = [...petals[0].map((s) => [0, s]), ...petals[1].map((s) => [1, s]), ...cores[0].map((s) => [0, s]), ...cores[1].map((s) => [1, s])];
  const nl = petals[0].length, nr = petals[1].length, nc = n - nl - nr;
  const APART = 1.02, BUD_APART = 0.62, INTO = 0.3;
  const pose = (open, spinOf, gapOf, t) => order.map(([f, s]) => { const d = gapOf(t), into = Math.max(0, (APART - d) / (APART - INTO)); return seat(lotusLocal(s, open(t), (f ? -1 : 1) * spinOf(t)), f ? d : -d, -0.25, (f ? -1 : 1) * 0.16 * into); });
  const parts = (pts) => [part("left", pts.slice(0, nl)), part("right", pts.slice(nl, nl + nr)), part("core", pts.slice(nl + nr))];
  const colourOf = (j) => lotusColour(order[j][1]);
  const flowerBeat = (open, spinOf, gapOf, { light, ...extra }) => {
    const base = pose(open, spinOf, gapOf, 0).map((p, j) => [...p, ...colourOf(j)]);
    return act(parts(base), { ...extra, live: (b, j, t, o) => { const [f, s] = order[j], d = gapOf(t), into = Math.max(0, (APART - d) / (APART - INTO)), p = seat(lotusLocal(s, open(t), (f ? -1 : 1) * spinOf(t)), f ? d : -d, -0.25, (f ? -1 : 1) * 0.16 * into); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = light(s, t, f); } });
  };
  const bloomAt = (t) => smooth((t - 0.2) / 2.6), budGap = (t) => lerp(BUD_APART, APART, bloomAt(t));
  const intoGap = (t) => lerp(APART, INTO, smooth((t - 0.3) / 3.4));

  // the sphere: the left flower's drones become the pink bands, the right flower's the violet ones, wound into each
  // other; the two golden rings become one small golden heart in the middle, facing the audience
  // six bands, each winding a whole turn from pole to pole (less twist leaves a bare side, more reads as rings)
  const BANDS = 6, half = (m, off) => { const per2 = share(m, Array(BANDS / 2).fill(1)); return per2.flatMap((c, i) => twistedBand(c, off + 2 * i, BANDS, 1, 2.3, 1.3)); };
  const left = half(nl, 0), right = half(nr, 1), sphere = [...left, ...right];
  const coreHeart = sampleOutline([heartCurve()], nc).map(([x, y]) => [x * 0.3, y * 0.3 - 0.01, 0]);
  const ST = 0.14, place3 = (p, spin) => { const o = [p[0], p[1], p[2]]; yaw(o, spin); pitch(o, ST); return o; };
  const ballPts = [...sphere.map(({ p }, j) => [...place3(p, 0), ...(j < nl ? PINK : VIOLET)]), ...coreHeart.map((p) => [...place3(p, 0), ...GOLD])];

  return { beats: [
    flowerBeat(() => 0, () => 0, () => BUD_APART, { caption: "Zwei Knospen", hold: 1.4, light: (s, t, f) => breathe(t, 2.8, f * 1.4) }),
    flowerBeat(bloomAt, () => 0, budGap, { caption: "sie blühen auf", hold: 2.8, light: (s, t, f) => (t < 2.8 ? breathe(t, 2.8, f * 1.4) : petalLight(s, t, f ? -1 : 1)) }),
    flowerBeat(() => 1, (t) => ease(t, 2.5) * 0.45, intoGap, { caption: "drehen sich ineinander", hold: 3.4, light: (s, t, f) => petalLight(s, t, f ? -1 : 1) }),
    act(parts(ballPts), { caption: "…und werden eine Kugel aus Licht", live: (b, j, t, o) => {
      const spin = ease(t, 3) * 0.3;
      if (j < nl + nr) { const p = place3(sphere[j].p, spin); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = chase(sphere[j].s, t, j < nl ? 0.28 : -0.28, 0.5, 0.65, 1.5); }
      else { const p = place3(coreHeart[j - nl - nr], 0.3 * smooth(t / 2) * Math.sin(t * 0.7)); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = breathe(t, 2.6) + 0.2; }
    } }),
  ] };
}

// ---------- Schmetterling ----------
// Right wings in body coordinates (body along y, head up); the left wings mirror them.
const FORE = [[0.04, 0.08], [0.28, 0.4], [0.58, 0.68], [0.9, 0.74], [1.0, 0.56], [0.84, 0.32], [0.54, 0.12], [0.24, 0.01], [0.05, -0.01]];
const HIND = [[0.05, -0.04], [0.32, -0.06], [0.6, -0.18], [0.7, -0.42], [0.56, -0.66], [0.32, -0.7], [0.16, -0.5], [0.05, -0.24]];
const BODY = [{ pts: [[0, 0.2], [0, -0.48]], closed: false }, { pts: Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU; return [Math.cos(a) * 0.05, 0.27 + Math.sin(a) * 0.05]; }), closed: true }, spline([[0.02, 0.31], [0.07, 0.48], [0.18, 0.62], [0.24, 0.64]], 8, false), spline([[-0.02, 0.31], [-0.07, 0.48], [-0.18, 0.62], [-0.24, 0.64]], 8, false)];
/** Butterfly points in body coordinates: [x, y, kind] with kind 0 forewing, 1 hindwing, 2 body. */
function butterflyLocal(n) {
  const [fore, hind, body] = share(n, [0.42, 0.36, 0.22]), out = [];
  for (const side of [-1, 1]) {
    for (const [x, y] of sampleOutline([spline(FORE)], side < 0 ? Math.floor(fore / 2) : Math.ceil(fore / 2))) out.push([x * side, y, 0]);
    for (const [x, y] of sampleOutline([spline(HIND)], side < 0 ? Math.floor(hind / 2) : Math.ceil(hind / 2))) out.push([x * side, y, 1]);
  }
  for (const [x, y] of sampleOutline(BODY, body)) out.push([x, y, 2]);
  return out;
}
const wingColour = ([x, , kind]) => (kind === 2 ? GOLD : kind === 0 ? mix(PINK, VIOLET, Math.abs(x) * 1.1 - 0.1) : mix(VIOLET, PINK, 0.25));
/** A butterfly pose: wings turned by α about the body axis (both towards the audience), then the whole body turned. */
function flutter([x, y, kind], a, s, turn, tilt, at) {
  const p = kind === 2 ? [x * s, y * s, 0] : [x * Math.cos(a) * s, y * s, Math.abs(x) * Math.sin(a) * s];
  yaw(p, turn); pitch(p, tilt);
  return [p[0] + at[0], p[1] + at[1], p[2] + at[2]];
}
/** Wing angle: a resting dihedral plus a slow, small beat that eases in after arrival. */
const beat = (t, period = 2.6, amp = 0.3, rest = 0.22, phase = 0) => rest + amp * smooth(t / 1.5) * Math.sin(((t + phase) * TAU) / period);
const wingShine = (b, t) => (b[2] === 2 ? breathe(t, 2.2) + 0.1 : glint(Math.abs(b[0]), t, 3.4, 0.55, -0.3, 1.3));

function butterfly2d(n, caption) {
  const local = butterflyLocal(n), pts = local.map((p) => [p[0], p[1], 0, ...wingColour(p)]);
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    const p = local[j];
    o[3] = p[2] === 2 ? breathe(t, 2.6) + 0.1 : glint(Math.abs(p[0]) + p[1] * 0.25, t, 3.6, 0.55, -0.3, 1.3); // the wings shimmer outwards
    if (p[2] < 2) o[0] = p[0] * (1 - 0.04 * (0.5 - 0.5 * Math.cos((t * TAU) / 4))); // barely a breath of a wing beat
  } }] };
}

function butterfly3d(n, caption) {
  const local = butterflyLocal(n), TURN = 0.62, TILT3 = -0.18;
  const pts = local.map((p) => [...flutter(p, beat(0), 1, TURN, TILT3, [0, 0, 0]), ...wingColour(p)]);
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    const k = smooth(t / 2), bob = 0.035 * k * Math.sin((t * TAU) / 2.6 + 1.2); // the body rises a little as the wings beat down
    const p = flutter(local[j], beat(t), 1, TURN + k * 0.12 * Math.sin((t * TAU) / 12), TILT3, [0, bob, 0]);
    o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = wingShine(local[j], t);
  } }] };
}

function butterflyStory(n) {
  const [sp, b1, b2] = share(n, [0.6, 1.2, 1.2]), A = butterflyLocal(b1), B = butterflyLocal(b2), S = 0.62, RX = 0.86, RZ = 0.55;
  const stars = starField(sp, -1.5, 1.5, -1.0, 1.1, 17);
  // the dance: both fly round a common axis, half a turn apart, rising and sinking at their own pace
  const orbit = (k, t) => { const phi = (k ? 0 : Math.PI) + ease(t, 2.5) * 0.72; return { at: [RX * Math.cos(phi), 0.08 + 0.12 * Math.sin(2 * phi + k), RZ * Math.sin(phi)], turn: -0.6 * Math.cos(phi) }; }; // each turns its face towards the other, never edge-on
  const fly = (j, t, o, still) => {
    const k = j < b1 ? 0 : 1, p = k ? B[j - b1] : A[j], { at, turn } = still ? orbit(k, 0) : orbit(k, t);
    const q = flutter(p, beat(t, 2.6, 0.3, 0.22, k * 1.3), S, turn, -0.15, at); o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; o[3] = wingShine(p, t);
  };
  const flyPts = (still) => [...A, ...B].map((p, j) => { const o = [0, 0, 0, 1]; fly(j, 0, o, still); return [o[0], o[1], o[2], ...wingColour(p)]; });
  const twinkle = (j, t, o) => { o[3] = sparkle(j, t, 0.45, 1.1); };
  // the heart: after half a dance the first butterfly is on the right, so it becomes the right half
  const halfHeart = (m, right) => sampleOutline([heartCurve(80, right ? 0 : Math.PI, right ? Math.PI : TAU)], m).map(([x, y]) => [x, y, 0.06]);
  const heart = [...halfHeart(b1, true), ...halfHeart(b2, false)], inner = sampleOutline([{ pts: heartCurve().pts.map(([x, y]) => [x * 0.8, y * 0.8 - 0.02]) }], sp).map(([x, y]) => [x, y, -0.14]);
  const heartColour = (p) => mix(PINK, VIOLET, (0.85 - p[1]) / 1.9);
  const heartParts = (pts) => [part("sparks", pts.slice(0, sp)), part("b1", pts.slice(sp, sp + b1)), part("b2", pts.slice(sp + b1))];
  const all = [...paint(inner, GOLD), ...paint(heart, heartColour)];
  const flyParts = (still) => { const f = flyPts(still); return [part("sparks", paint(stars, mix(PINK, WARM, 0.55))), part("b1", f.slice(0, b1)), part("b2", f.slice(b1))]; };
  return { beats: [
    act(flyParts(true), { caption: "Zwei Schmetterlinge", hold: 1.4, live: (b, j, t, o) => { if (j < sp) twinkle(j, t, o); else fly(j - sp, t, o, true); } }),
    act(flyParts(false), { caption: "sie tanzen umeinander", hold: 4.5, live: (b, j, t, o) => { if (j < sp) twinkle(j, t, o); else fly(j - sp, t, o, false); } }),
    act(heartParts(paint(loosen(all, 0.4, 1.1), (p) => mix(GOLD, PINK, hash(p[0] * 13 + p[1] * 7)))), { caption: "ihre Flügel lösen sich in Funken", hold: 0.5, live: (b, j, t, o) => { o[3] = sparkle(j, t, 0.6, 1.4); yaw(o, smooth(t / 1.5) * 0.15 * Math.sin(t * 0.8)); } }),
    act(heartParts(all), { caption: "…und werden ein Herz", live: (b, j, t, o) => { o[3] = j < sp ? sparkle(j, t, 0.95, 1.5) : breathe(t, 2.8); yaw(o, smooth(t / 2) * 0.35 * Math.sin((t * TAU) / 10)); } }),
  ] };
}

export const builders = { heartTunnel, lotus3d, lotusStory, butterfly2d, butterfly3d, butterflyStory };
