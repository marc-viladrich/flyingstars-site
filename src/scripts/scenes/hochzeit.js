// hochzeit motifs of the eleventh version (see src/content/show-configurator.js for the build names).
import { TAU, WARM, GOLD, PINK, VIOLET, CYAN, BLUE, ORANGE, RED, GREEN, DIAMOND, mix, paint, place, frac, smooth, hash, yaw, roll, pitch, sway, swing, breathe, glint, sparkle, chase, trace, burstLight, loosen, rig, share, part, act } from "../show-motion.js";
import { sampleOutline } from "../show-geometry.js";
import { starField, sample3d, brilliant } from "../show-shapes.js";

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

// ---------- Ring · Geschichte ----------
// Quaternions [w, x, y, z] for the ring as a rigid body: it turns from facing the audience to lying along the finger.
const qMul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2], a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
const qRot = (q, [x, y, z]) => { const r = qMul(qMul(q, [0, x, y, z]), [q[0], -q[1], -q[2], -q[3]]); return [r[1], r[2], r[3]]; };
function qFromBasis(X, Y, Z) { // columns X, Y, Z = where the ring's local axes point
  const tr = X[0] + Y[1] + Z[2];
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; return [0.25 * s, (Y[2] - Z[1]) / s, (Z[0] - X[2]) / s, (X[1] - Y[0]) / s]; }
  if (X[0] > Y[1] && X[0] > Z[2]) { const s = Math.sqrt(1 + X[0] - Y[1] - Z[2]) * 2; return [(Y[2] - Z[1]) / s, 0.25 * s, (Y[0] + X[1]) / s, (Z[0] + X[2]) / s]; }
  if (Y[1] > Z[2]) { const s = Math.sqrt(1 + Y[1] - X[0] - Z[2]) * 2; return [(Z[0] - X[2]) / s, (Y[0] + X[1]) / s, 0.25 * s, (Z[1] + Y[2]) / s]; }
  const s = Math.sqrt(1 + Z[2] - X[0] - Y[1]) * 2; return [(X[1] - Y[0]) / s, (Z[0] + X[2]) / s, (Z[1] + Y[2]) / s, 0.25 * s];
}
function slerp(a, b, u) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map((v) => -v); d = -d; }
  if (d > 0.9995) { const r = a.map((v, i) => v + (b[i] - v) * u), l = Math.hypot(...r); return r.map((v) => v / l); }
  const th = Math.acos(d), sa = Math.sin((1 - u) * th) / Math.sin(th), sb = Math.sin(u * th) / Math.sin(th);
  return a.map((v, i) => v * sa + b[i] * sb);
}
const Q0 = [1, 0, 0, 0];
const norm3 = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** The ring in its own frame: two band edges (axis = local z, so it faces the audience) and a stone cluster on top. */
function ringLocal(m, R = 0.14) {
  const stone = Math.round(m / 3), [e1, e2] = share(m - stone, [1, 1]);
  const edge = (k, z) => Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU + (z > 0 ? 0 : TAU / (2 * k)); return [Math.cos(a) * R, Math.sin(a) * R, z]; });
  const gem = brilliant(stone, 0.17).map(([x, y, z]) => [x, y + R + 0.075, z]);
  return { pts: [...edge(e1, 0.045), ...edge(e2, -0.045), ...gem], band: e1 + e2 };
}
const RING_GOLD = [255, 204, 118], ICE = mix(DIAMOND, CYAN, 0.25);

/** A rounded rectangle in the xz plane at height y (half sizes hw, hd, corner radius r), closed 3D polyline. */
function rrect(hw, hd, r, y, k = 5) {
  const pts = [];
  for (const [cx, cz, a0] of [[hw - r, hd - r, 0], [-(hw - r), hd - r, Math.PI / 2], [-(hw - r), -(hd - r), Math.PI], [hw - r, -(hd - r), 1.5 * Math.PI]])
    for (let i = 0; i <= k; i++) { const a = a0 + (i / k) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]); }
  return { pts, closed: true };
}
/**
 * A jewellery box: small, almost a cube with strongly rounded edges, a domed lid hinged at the back, gold edges where
 * lid and box meet, and inside a cushion with a slit in which the ring stands. Box-local, y up, the slit along x.
 */
const BOX = { hw: 0.4, hd: 0.34, r: 0.17, base: -0.38, rim: 0, hinge: [0.02, -0.34] };
function ringBox(nBase, nGold, nLid, nCushion) {
  const { hw, hd, r } = BOX, R = (inset, y, rr = r) => rrect(hw - inset, hd - inset, Math.max(0.04, rr - inset), y);
  const corners = (y0, y1, i0, i1) => [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => ({ pts: [0, 0.5, 1].map((u) => { const i = i0 + (i1 - i0) * u + 0.05 * Math.sin(Math.PI * u) * -1, k = 0.3; return [sx * (hw - r * k - i), y0 + (y1 - y0) * u, sz * (hd - r * k - i)]; }) }));
  // the base bulges a little: bottom and top rims are inset against its middle, which rounds the vertical silhouette
  const base = sample3d([R(0.05, BOX.base), R(0, -0.19), ...corners(BOX.base, -0.02, 0.05, 0.01)], nBase);
  const gold = sample3d([R(0.01, BOX.rim), R(0.01, 0.025)], nGold);
  const lid = sample3d([R(0.02, 0.1), R(0.1, 0.17, 0.12), { pts: [[-(hw - 0.12), 0.17, 0], [hw - 0.12, 0.17, 0]] }], nLid); // domed: it narrows towards the top
  const cushion = sample3d([R(0.07, -0.015), { pts: [[-(hw - 0.12), -0.01, -0.035], [hw - 0.12, -0.01, -0.035]] }, { pts: [[-(hw - 0.12), -0.01, 0.035], [hw - 0.12, -0.01, 0.035]] }], nCushion);
  return { base, gold, lid, cushion };
}
/** A lid point swung open by angle a (0 closed) about the hinge line at the back. */
const swingLid = ([x, y, z], a) => { const o = [x, y, z]; pitch(o, -a, BOX.hinge[0], BOX.hinge[1]); return o; };
const VIEW = (p) => { const o = [p[0], p[1], p[2]]; yaw(o, 0.5); pitch(o, 0.4); return o; }; // three-quarter view from a little above

/**
 * The hand: a loose right hand in an oblique view, the wrist at the top right with a cuff of two arcs, fingers of
 * unequal bend with deep gaps between them, an empty palm. The ring finger reaches out furthest to the lower left:
 * a clear corridor for the ring. Fingers: [base, direction angle, length, half-width, curl].
 */
const FINGERS_H = [
  [[0.24, 0.58], Math.PI - 0.5, 0.5, 0.09, -0.1], // thumb, short, raised
  [[-0.22, 0.33], Math.PI + 0.08, 0.5, 0.068, 0.45], // index, bent back
  [[-0.1, 0.15], Math.PI + 0.42, 0.56, 0.07, 0.42], // middle, bent back
  [[0.03, -0.03], Math.PI + 0.72, 1.0, 0.07, 0.04], // ring finger, reaching out
  [[0.17, -0.2], Math.PI + 1.15, 0.45, 0.06, 0.4], // little finger, curled
];
const RING_FINGER = 3;
/** Centre line point and direction of finger f at s ∈ [0, 1]. */
function fingerAt(f, s) {
  const [[bx, by], a0, L, , c] = FINGERS_H[f], a = a0 + c * s;
  const x = Math.abs(c) < 1e-4 ? bx + L * s * Math.cos(a0) : bx + (L * (Math.sin(a) - Math.sin(a0))) / c;
  const y = Math.abs(c) < 1e-4 ? by + L * s * Math.sin(a0) : by - (L * (Math.cos(a) - Math.cos(a0))) / c;
  return [x, y, Math.cos(a), Math.sin(a)];
}
function handPaths() {
  const W1 = [0.66, 1.12], W2 = [1.03, 0.76], wristDir = [0.71, 0.7], pts = [W1, [0.5, 0.88]];
  const edge = (f, side) => [0, 0.35, 0.7, 1].map((s) => { const [x, y, dx, dy] = fingerAt(f, s), w = FINGERS_H[f][3] * (1 - 0.25 * s); return [x + side * dy * w, y - side * dx * w]; });
  FINGERS_H.forEach((_, f) => {
    const up = edge(f, 1), back = edge(f, -1).reverse(), [tx, ty, dx, dy] = fingerAt(f, 1), w = FINGERS_H[f][3] * 0.75;
    if (f > 0) { const prev = pts[pts.length - 1], next = up[0]; pts.push([(prev[0] + next[0]) / 2 + wristDir[0] * (f === 1 ? 0.02 : 0.07), (prev[1] + next[1]) / 2 + wristDir[1] * (f === 1 ? 0.02 : 0.07)]); } // the gap between two fingers reaches into the hand
    pts.push(...up.slice(0, 3));
    for (let i = 0; i <= 4; i++) { const th = (i / 4) * Math.PI; pts.push([tx + w * (Math.cos(th) * dy + Math.sin(th) * dx), ty + w * (-Math.cos(th) * dx + Math.sin(th) * dy)]); } // rounded tip
    pts.push(...back.slice(1));
  });
  pts.push([0.46, 0.04], [0.82, 0.42], W2);
  const bulge = (a, b, k, out) => Array.from({ length: 9 }, (_, i) => { const u = i / 8, h = Math.sin(Math.PI * u) * k; return [a[0] + (b[0] - a[0]) * u + wristDir[0] * (h + out), a[1] + (b[1] - a[1]) * u + wristDir[1] * (h + out)]; });
  const cuff = [{ pts: bulge(W1, W2, 0.04, 0), closed: false }, { pts: bulge([W1[0] - 0.04, W1[1] + 0.03], [W2[0] + 0.03, W2[1] - 0.04], 0.05, 0.15), closed: false }];
  const inner = [{ pts: [[-0.03, 0.33], [0.08, 0.38], [0.17, 0.44]], closed: false }, { pts: [[0.1, 0.14], [0.2, 0.19], [0.28, 0.26]], closed: false }];
  return { outline: spline(pts, 4, false), cuff, inner };
}
function hand(nContour, nCuff, nInner) {
  const { outline, cuff, inner } = handPaths();
  return { contour: sampleOutline([outline], nContour), cuff: sampleOutline(cuff, nCuff), inner: sampleOutline(inner, nInner) };
}
const HAND = [246, 200, 214], CUFF = mix(PINK, VIOLET, 0.35);

function ringStory(n) {
  // budget per act (300 drones): ring 60; box 216 with cushion and gold edges + 24 calm stars far out; hand 232 with
  // cuff + 8 sparks that wait dimmed at the stone's seat; heart 232 + the same 8 sparks
  const ringN = Math.round(n * 0.2), body = Math.round(n * 0.773), boxN = Math.round(n * 0.72), sparks = n - ringN - body, stars = n - ringN - boxN;
  const [nBase, nGold, nLid, nCushion] = share(boxN, [84, 30, 66, 36]), [nContour, nCuff, nInner] = share(body, [178, 42, 12]);
  const ring = ringLocal(ringN), band = ring.band, isStone = (j) => j >= band;
  const ringColour = (j) => (isStone(j) ? ICE : RING_GOLD);
  const place = (q, c) => ring.pts.map((p, j) => { const [x, y, z] = qRot(q, p); return [x + c[0], y + c[1], z + c[2], ...ringColour(j)]; });
  const setRing = (j, q, c, o) => { const [x, y, z] = qRot(q, ring.pts[j]); o[0] = x + c[0]; o[1] = y + c[1]; o[2] = z + c[2]; };

  // the box acts: the ring stands in the cushion's slit, its lower half sunk, facing the audience
  const B = ringBox(nBase, nGold, nLid, nCushion), OPEN = 1.9, BORDEAUX = [178, 38, 84], LID = [196, 52, 104], CUSHION = mix(BORDEAUX, PINK, 0.45);
  const lidStart = nBase + nGold, cushionStart = lidStart + nLid;
  const boxPts = (a) => [...B.base.map((p) => [...VIEW(p), ...BORDEAUX]), ...B.gold.map((p) => [...VIEW(p), ...GOLD]), ...B.lid.map((p) => [...VIEW(swingLid(p, a)), ...LID]), ...B.cushion.map((p) => [...VIEW(p), ...CUSHION])];
  const inSlot = VIEW([0, 0.07, 0]), raised = VIEW([0, 0.62, 0.04]);
  const farStars = (m, rx, ry, cy) => Array.from({ length: m }, (_, i) => { const a = (i / m) * TAU + (hash(i * 3.3) - 0.5) * 0.4, r = 1 + 0.12 * hash(i + 5); return [Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, -0.3]; });
  const boxStars = paint(farStars(stars, 1.15, 0.95, 0.1), mix(PINK, WARM, 0.55));
  const lidOpen = (t) => OPEN * smooth((t - 0.5) / 2.6);
  // the hand acts: the ring waits above the fingers, then flies a wide arc to the ring finger
  // the hand is turned a little flatter than drawn, so it fills the wide stage instead of standing tall in it
  const HR = -0.3, hc = Math.cos(HR), hs = Math.sin(HR), turnH = ([x, y]) => [0.15 + (x - 0.15) * hc - (y - 0.2) * hs, 0.2 + (x - 0.15) * hs + (y - 0.2) * hc];
  const H = hand(nContour, nCuff, nInner), flatHand = (list, colour) => paint(list.map((p) => [...turnH(p), 0]), colour);
  const handPts = [...flatHand(H.contour, HAND), ...flatHand(H.cuff, CUFF), ...flatHand(H.inner, HAND)];
  const finger = (s) => { const [x, y, dx, dy] = fingerAt(RING_FINGER, s); return [...turnH([x, y]), dx * hc - dy * hs, dx * hs + dy * hc]; };
  const hover = [-1.0, 0.45, 0.1], [tipX, tipY, ux, uy] = finger(1.12), [seatX, seatY] = finger(0.3);
  // on the finger the ring's axis lies along the finger but tips 30° towards the audience, so the band stays an open
  // ellipse instead of an edge; the stone sits beside the finger on the side of the hand's back
  const side = ux < 0 ? [uy, -ux, 0] : [-uy, ux, 0], axis = norm3([ux * 0.87, uy * 0.87, 0.5]);
  const qFinger = qFromBasis(norm3(cross(side, axis)), side, axis);
  const tipC = [tipX, tipY, 0.04], seatC = [seatX, seatY, 0.04], ctrl = [-1.3, -0.35, 0.1];
  const turnOf = (t) => smooth((t - 1.4) / 2.8);
  const flyAt = (t) => { // waits, flies a wide flat arc to the fingertip while it turns, then slides down to the base
    const u = smooth((t - 1.0) / 3.2), w = smooth((t - 4.5) / 2.2), v = 1 - u;
    const arc = [0, 1, 2].map((i) => v * v * hover[i] + 2 * v * u * ctrl[i] + u * u * tipC[i]);
    return { c: arc.map((a, i) => a + (seatC[i] - tipC[i]) * w), q: slerp(Q0, qFinger, turnOf(t)) };
  };
  const stoneAt = qRot(qFinger, [0, 0.14 + 0.075, 0]).map((v, i) => v + seatC[i]);
  const sparkPts = Array.from({ length: sparks }, (_, i) => { const a = (i / sparks) * TAU + 0.3; return [stoneAt[0] + Math.cos(a) * 0.13, stoneAt[1] + Math.sin(a) * 0.13, stoneAt[2] + 0.05]; });
  const heartPts = [...sampleOutline([heartCurve()], Math.round(body * 0.58)).map(([x, y]) => [x * 1.02, y * 1.02 - 0.02, 0.05]), ...sampleOutline([{ pts: heartCurve().pts.map(([x, y]) => [x * 0.84, y * 0.84 - 0.04]) }], body - Math.round(body * 0.58)).map(([x, y]) => [x, y, -0.05])];
  const heartColour = (p) => (p[2] > 0 ? PINK : mix(PINK, VIOLET, 0.6)), centre = [0, -0.02, 0.1];
  const heartSparks = Array.from({ length: sparks }, (_, i) => { const a = (i / sparks) * TAU; return [centre[0] + Math.cos(a) * 0.3, centre[1] + 0.12 + Math.sin(a) * 0.3, 0.15]; });
  const calm = (j, t, o) => { o[3] = 0.32 + 0.12 * Math.sin(t * 0.7 + j); }; // far stars: dim and quiet
  const ringLight = (j, t, stoneDim = 0) => (isStone(j) ? lerp(sparkle(j, t, 1.0, 1.65), 0.55, stoneDim) : 0.95 + 0.35 * Math.max(0, Math.sin(Math.atan2(ring.pts[j][1], ring.pts[j][0]) - t * 1.6)) ** 4);
  const sparkPart = (pts) => part("stars", paint(pts, mix(DIAMOND, WARM, 0.4)));

  return { beats: [
    act([part("ring", place(Q0, inSlot), { rigid: true }), part("body", boxPts(0)), part("stars", boxStars, { offstage: true })], { caption: "Ein Schmuckkästchen öffnet sich", hold: 3.4, frame: "box", live: (b, j, t, o) => {
      if (j < ringN) o[3] = isStone(j) ? 0.3 + 1.1 * smooth((t - 2.2) / 1) : 0.3 + 0.4 * smooth((t - 2.6) / 1); // the stone shows first as the lid opens
      else if (j < ringN + boxN) { const k = j - ringN; if (k >= lidStart && k < cushionStart) { const p = VIEW(swingLid(B.lid[k - lidStart], lidOpen(t))); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; } }
      else calm(j, t, o);
    } }),
    act([part("ring", place(Q0, raised), { rigid: true }), part("body", boxPts(OPEN)), part("stars", boxStars, { offstage: true })], { caption: "der Ring steigt aus dem Polster, der Stein funkelt", hold: 2.6, frame: "box", live: (b, j, t, o) => {
      if (j < ringN) { setRing(j, slerp(Q0, [Math.cos(0.3), 0, Math.sin(0.3), 0], 0.5 - 0.5 * Math.cos(t * 0.9)), raised, o); o[3] = isStone(j) ? sparkle(j, t, 1.05, 1.7) : 0.7 + 0.35 * smooth((t - 0.4) / 1.2); }
      else if (j >= ringN + boxN) calm(j, t, o);
    } }),
    act([part("ring", place(Q0, hover), { rigid: true }), part("body", paint(loosen(handPts, 0.3, 1.04), mix(HAND, PINK, 0.3))), sparkPart(sparkPts)], { caption: "das Kästchen löst sich in eine Wolke", hold: 0.6, frame: "hand", live: (b, j, t, o) => {
      if (j < ringN) o[3] = ringLight(j, t); else if (j >= ringN + body) o[3] = 0.1; else o[3] = sparkle(j, t, 0.35, 0.8);
    } }),
    act([part("ring", place(Q0, hover), { rigid: true }), part("body", handPts), sparkPart(sparkPts)], { caption: "eine Hand: der Ring findet den Ringfinger", hold: 7.4, frame: "hand", live: (b, j, t, o) => {
      if (j < ringN) { const { c, q } = flyAt(t); setRing(j, q, c, o); o[3] = ringLight(j, t, Math.sin(Math.PI * turnOf(t))); } // the stone dims while the ring turns
      else if (j < ringN + body) o[3] = 0.95 + 0.1 * Math.sin(t * 1.3);
      else o[3] = 0.1 + sparkle(j, t, 0.5, 1.5) * smooth((t - 6.6) / 0.8); // a few sparks at the stone once the ring sits
    } }),
    act([part("ring", place(Q0, centre), { rigid: true }), part("body", paint(heartPts, heartColour)), sparkPart(heartSparks)], { caption: "…und sie sagt Ja", live: (b, j, t, o) => {
      if (j < ringN) { setRing(j, slerp(Q0, [Math.cos(0.35), 0, Math.sin(0.35), 0], 0.5 - 0.5 * Math.cos(t * 0.8)), centre, o); o[3] = ringLight(j, t); }
      else if (j < ringN + body) o[3] = breathe(t, 2.8);
      else o[3] = sparkle(j, t, 0.6, 1.4);
    } }),
  ] };
}

// ---------- Ring · Eheringe (SPARK) ----------
/**
 * Two wedding rings overlapping, each with an inner and an outer edge (a band, not a wire), champagne white; a small
 * stone cluster sits on top of the left ring. Light runs round the rings in opposite directions, the stone sparkles.
 */
function weddingRings2d(n, caption) {
  const st = Math.max(10, Math.round(n * 0.12)), [a, b] = share(n - st, [1, 1]), C = 0.37, RO = 0.6, RI = 0.49;
  const ringPts = (m, cx) => { const [o, i] = share(m, [RO, RI]); return [...sampleOutline([circle2(cx, 0, RO)], o).map(([x, y]) => [x, y, 0, 1]), ...sampleOutline([circle2(cx, 0, RI)], i).map(([x, y]) => [x, y, 0, 0])]; };
  const sa = 1.92, sx = -C + Math.cos(sa) * RO, sy = Math.sin(sa) * RO; // where the stone sits on the left ring
  const gem = { pts: [[-0.13, 0], [0.13, 0], [0.18, 0.08], [0.1, 0.16], [-0.1, 0.16], [-0.18, 0.08]].map(([x, y]) => { const r = sa - Math.PI / 2, c = Math.cos(r), s = Math.sin(r); return [sx + x * c - y * s, sy + x * s + y * c]; }), closed: true };
  const L = ringPts(a, -C), R = ringPts(b, C), stone = sampleOutline([gem], st);
  const CHAMPAGNE = [250, 228, 190], STONE = mix(DIAMOND, VIOLET, 0.45);
  const pts = [...L.map(([x, y]) => [x, y, 0, ...CHAMPAGNE]), ...R.map(([x, y]) => [x, y, 0, ...CHAMPAGNE]), ...stone.map(([x, y]) => [x, y, 0.02, ...STONE])];
  return { beats: [{ pts, caption, live: (bp, j, t, o) => {
    if (j >= a + b) { o[3] = sparkle(j, t, 0.95, 1.7); return; }
    const left = j < a, cx = left ? -C : C, ang = Math.atan2(bp[1], bp[0] - cx);
    o[3] = 0.85 + 0.55 * Math.max(0, Math.cos(ang - (left ? 1 : -1) * t * 1.1)) ** 6; // a highlight glides round each band
  } }] };
}
const circle2 = (cx, cy, r, k = 96) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }), closed: true });

export const builders = { heartTunnel, lotus3d, lotusStory, butterfly2d, butterfly3d, butterflyStory, ringStory, weddingRings2d };
