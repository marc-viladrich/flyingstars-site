import { t as message } from '../../i18n/ui.mjs';
// hochzeit motifs of the eleventh version (see src/content/show-configurator.js for the build names).
import { TAU, WARM, GOLD, PINK, VIOLET, CYAN, BLUE, ORANGE, RED, GREEN, DIAMOND, mix, paint, place, frac, smooth, hash, yaw, roll, pitch, sway, swing, breathe, glint, sparkle, chase, trace, burstLight, rig, share, part, act, wander, drift, lightRank } from "../show-motion.js";
import { sampleOutline } from "../show-geometry.js";
import { heartShell } from "../heart-formation.js";
import { starField, sample3d, brilliant, torusLink, solitaire } from "../show-shapes.js";

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
  // front of the other, and keep turning into each other. Dreizehnte Fassung (Marc: „eine Art Finte, wirkt awkward“):
  // they no longer part again before the next motif; every movement goes one way.
  const per = Math.floor(n / 2), slots = [...lotusSlots(per, RINGS_H), ...lotusSlots(n - per, RINGS_H)];
  const APART = 1.6, MOVE = 2.6, TOGETHER = 3.4, into = (t) => smooth((t - APART) / MOVE);
  const where = (j, t) => { const left = j < per, k = into(t), d = lerp(0.9, 0.32, k); return [left ? -d : d, -0.3, (left ? 1 : -1) * 0.38 * k]; };
  const pts = slots.map((sl, j) => [...seat(lotusLocal(sl, 1, 0, RINGS_H), ...where(j, 0)), ...lotusColour(sl, RINGS_H)]);
  return { beats: [{ ...act([part("left", pts.slice(0, per)), part("right", pts.slice(per))]), caption, live: (b, j, t, o) => {
    const left = j < per, spin = (left ? 1 : -1) * ease(t, 3) * 0.32, p = seat(lotusLocal(slots[j], 1, slots[j][0] === -2 ? 0 : spin, RINGS_H), ...where(j, t));
    o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = petalLight(slots[j], t, left ? 1 : -1, RINGS_H);
  }, hold: APART + MOVE + TOGETHER }] };
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
  // the buds stand where the open flowers will stand: blooming does not push them apart first (that outward step, then
  // the turn inwards, read as a feint; Marc, 30.10.2026)
  const APART = 1.02, BUD_APART = APART, INTO = 0.3;
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
    flowerBeat(() => 0, () => 0, () => BUD_APART, { caption: message('hochzeit.twoBuds'), hold: 1.4, light: (s, t, f) => breathe(t, 2.8, f * 1.4) }),
    flowerBeat(bloomAt, () => 0, budGap, { caption: message('hochzeit.theyBloom'), hold: 2.8, light: (s, t, f) => (t < 2.8 ? breathe(t, 2.8, f * 1.4) : petalLight(s, t, f ? -1 : 1)) }),
    flowerBeat(() => 1, (t) => ease(t, 2.5) * 0.45, intoGap, { caption: message('hochzeit.twistIntoEachOther'), hold: 3.4, light: (s, t, f) => petalLight(s, t, f ? -1 : 1) }),
    act(parts(ballPts), { caption: message('hochzeit.andBecomeASphereOfLight'), live: (b, j, t, o) => {
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

/**
 * Vierzehnte Fassung (Marc: die ODYSSEY-Schmetterlinge sahen nicht hochwertiger aus als in HORIZON, „nur ein bisschen
 * mehr“; Vorbild Kolibri): ein großer Schmetterling in 3D wie in HORIZON, dazu eine Welt. Er fliegt zu einer Lotusblüte,
 * landet und öffnet und schließt langsam die Flügel, über die ein feiner Schein wandert; dann steigt er ein Stück und
 * hinter ihm leuchtet FlyingStars' 3D-Herz auf (die Blüte wird in der lebendigen Wolke zum Herz). Vorher waren es zwei
 * kleine Falter mit je weniger Drohnen als der eine in HORIZON und ein flaches Herz.
 */
async function butterflyStory(n) {
  const B = Math.round(n * 0.6), F = n - B, local = butterflyLocal(B), S = 0.72, TURN = 0.55, TILT = -0.18;
  const slots = lotusSlots(F), FL = [0.3, -0.8], flowerPts = slots.map((sl) => [...seat(lotusLocal(sl, 1, 0), FL[0], FL[1], 0), ...lotusColour(sl)]);
  const heart = (await heartShell(F)).map(([x, y, z]) => [x * 0.95 + 0.62, y * 0.95 - 0.25, z * 0.6 - 0.2]); // neben dem Falter, wo die Blüte stand
  const START = [-1.05, 0.62, 0.1], C = [-0.35, 0.55, 0.1], LAND = [FL[0] - 0.02, FL[1] + 1.0, 0.05], UP = [-0.6, 0.32, 0.1];
  const bez3 = (P0, P1, P2, u) => [0, 1, 2].map((i) => (1 - u) * (1 - u) * P0[i] + 2 * (1 - u) * u * P1[i] + u * u * P2[i]);
  const pose = (j, a, at, o) => { const q = flutter(local[j], a, S, TURN, TILT, at); o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; o[3] = wingShine(local[j], 0); };
  const flyPts = (at, a) => local.map((p, j) => { const o = [0, 0, 0, 1]; pose(j, a, at, o); return [o[0], o[1], o[2], ...wingColour(p)]; });
  const shine = (j, t) => (local[j][2] === 2 ? breathe(t, 2.2) + 0.1 : glint(Math.abs(local[j][0]) + local[j][1] * 0.25, t, 3.6, 0.55, -0.3, 1.3));
  const petals = (j, t) => petalLight(slots[j], t);
  return { beats: [
    act([part("fly", flyPts(START, beat(0))), part("bloom", flowerPts)], { caption: message('hochzeit.aButterflyFliesTowardsAFlower'), hold: 3.8, live: (b, j, t, o) => {
      if (j < B) { pose(j, beat(t, 1.4, 0.32, 0.25), bez3(START, C, LAND, smooth(t / 3.6)), o); o[3] = shine(j, t); } else o[3] = petals(j - B, t);
    } }),
    act([part("fly", flyPts(LAND, 0.25)), part("bloom", flowerPts)], { caption: message('hochzeit.itLandsItsWingsOpenAndClose'), hold: 4.2, live: (b, j, t, o) => {
      // gelandet: langsam auf und zu (0,25 → 1,05 rad), so wie ein Falter auf einer Blüte ruht
      if (j < B) { pose(j, 0.25 + 0.8 * (0.5 - 0.5 * Math.cos((t * TAU) / 4.2)), LAND, o); o[3] = shine(j, t); } else o[3] = petals(j - B, t);
    } }),
    act([part("fly", flyPts(UP, beat(0))), part("bloom", paint(heart, (p) => mix(PINK, VIOLET, (p[2] + 1) / 1.2)))], { caption: message('hochzeit.itRisesTheFlowerBecomesAHeart'), cloud: ["bloom"], live: (b, j, t, o) => {
      if (j < B) { pose(j, beat(t, 2.6, 0.3, 0.22), [UP[0], UP[1] + 0.03 * Math.sin((t * TAU) / 3.4), UP[2]], o); o[3] = shine(j, t); }
      else { o[3] = breathe(t, 2.8) * wander((b[1] + 1.1) / 2.2, t, 5, 0.25, 0.12); yaw(o, 0.12 * Math.sin((t * TAU) / 12), 0.55, -0.2); }
    } }),
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
 * Fünfzehnte Fassung (Marc, 30.10.2026 abends): die Hand aus FlyingStars' eigener Antrags-Show. Marc hat ein Foto ihrer
 * Formation geliefert (Hand mit Armband am Handgelenk, Ring am Finger, daneben eine kleine Ringformation; FlyingStars'
 * eigene Arbeit, darf nachgebaut werden). Die Drohnen sind direkt aus dem Foto gelesen: Helligkeitsmaxima auf dem
 * blauen Himmel, Bäume ausgeschlossen (211 Lichter), dann von Hand in Linienzüge geordnet:
 * Handrücken mit erstem Finger, zweiter Finger, Ringfinger, vierter und fünfter Finger mit der Außenkante zum Handgelenk.
 * Die beiden Lichterbüschel am Handgelenk sind das Armband (46 Lichter, wie im Foto). Der Ring am Fingeransatz (pink im
 * Foto) ist hier der fliegende Ring der Geschichte, die kleine Ringformation links daneben sein Warteplatz.
 * Einheiten: Bildmitte der Hand (0, 0), y nach oben, die Hand reicht etwa von −1 bis 1. Werkzeug und Kontaktbögen:
 * docs/show-konfigurator.md, „Fünfzehnte Fassung“.
 */
const HAND_PHOTO = [
  [[0.265,0.691],[0.193,0.638],[0.127,0.597],[0.061,0.561],[-0.008,0.517],[-0.077,0.483],[-0.146,0.459],[-0.215,0.431],[-0.285,0.412],[-0.354,0.39],[-0.425,0.37],[-0.483,0.337],[-0.544,0.298],[-0.605,0.26],[-0.666,0.229],[-0.724,0.193],[-0.779,0.157],[-0.746,0.11],[-0.68,0.102],[-0.616,0.116],[-0.561,0.149],[-0.5,0.18],[-0.448,0.227],[-0.381,0.249],[-0.312,0.265],[-0.249,0.268],[-0.177,0.251]],
  [[-0.309,0.224],[-0.376,0.185],[-0.436,0.135],[-0.497,0.094],[-0.561,0.058],[-0.622,0.019],[-0.674,-0.036],[-0.727,-0.08],[-0.787,-0.122],[-0.837,-0.169],[-0.895,-0.204],[-0.948,-0.246],[-1.0,-0.287],[-0.953,-0.337],[-0.898,-0.326],[-0.84,-0.307],[-0.782,-0.287],[-0.729,-0.246],[-0.671,-0.215],[-0.619,-0.177],[-0.558,-0.146],[-0.497,-0.119],[-0.436,-0.091],[-0.373,-0.061]],
  [[-0.334,-0.099],[-0.387,-0.16],[-0.436,-0.221],[-0.489,-0.285],[-0.528,-0.351],[-0.558,-0.423],[-0.583,-0.503],[-0.608,-0.575],[-0.635,-0.646],[-0.66,-0.721],[-0.685,-0.796],[-0.627,-0.771],[-0.575,-0.732],[-0.53,-0.674],[-0.492,-0.616],[-0.459,-0.547],[-0.423,-0.483],[-0.398,-0.45],[-0.387,-0.428],[-0.351,-0.376],[-0.315,-0.296],[-0.229,-0.257]],
  [[-0.459,-0.547],[-0.453,-0.597],[-0.425,-0.663],[-0.395,-0.743],[-0.356,-0.812],[-0.315,-0.892],[-0.273,-0.959],[-0.229,-1.025],[-0.191,-0.972],[-0.196,-0.892],[-0.213,-0.82],[-0.235,-0.754],[-0.268,-0.693],[-0.296,-0.619],[-0.265,-0.541],[-0.235,-0.47],[-0.196,-0.395],[-0.157,-0.334],[-0.113,-0.265],[-0.064,-0.191],[-0.008,-0.138],[0.047,-0.069],[0.105,-0.019],[0.18,0.03],[0.21,-0.044],[0.243,-0.133],[0.257,-0.224],[0.243,-0.318],[0.213,-0.398],[0.166,-0.481],[0.13,-0.555],[0.122,-0.652],[0.124,-0.743],[0.141,-0.831],[0.174,-0.912],[0.235,-0.964],[0.268,-0.909],[0.26,-0.82],[0.271,-0.724],[0.337,-0.547],[0.378,-0.459],[0.428,-0.384],[0.478,-0.307],[0.514,-0.213],[0.552,-0.119],[0.608,-0.036],[0.66,0.044],[0.713,0.141]]
];
/** Das Armband: die Lichterbüschel am Handgelenk, Punkt für Punkt aus dem Foto. */
const HAND_CUFF = [[0.149,0.981],[0.166,0.928],[0.185,0.959],[0.193,1.008],[0.207,0.975],[0.229,0.997],[0.235,0.84],[0.254,0.914],[0.276,0.873],[0.298,0.942],[0.331,0.732],[0.351,0.815],[0.351,0.702],[0.392,0.785],[0.392,0.749],[0.395,0.862],[0.464,0.823],[0.475,0.704],[0.506,0.528],[0.514,0.732],[0.53,0.878],[0.536,0.635],[0.599,0.936],[0.599,0.569],[0.638,0.608],[0.666,0.37],[0.71,0.409],[0.715,0.439],[0.757,0.472],[0.762,0.224],[0.801,0.238],[0.807,0.296],[0.82,0.326],[0.848,0.282],[0.856,0.387],[0.865,0.362],[0.903,0.221],[0.906,0.459],[0.906,0.152],[0.945,0.199],[0.948,0.26],[0.953,0.144],[0.959,0.122],[0.975,0.528],[0.994,0.188],[0.997,0.166]];
/** Fingerspitze und Sitz des Rings (Fingeransatz) im Foto, der Warteplatz des Rings (die kleine Ringformation). */
const HAND_TIP = [-0.685,-0.796], HAND_RING = [-0.282,-0.022], HAND_RING_WAIT = [-1.518,-0.583];
/** Glättet einen Linienzug aus dem Foto leicht (das Foto ist nicht exakt von vorn) und legt eine Catmull-Rom-Kurve hindurch. */
const smoothLine = (P, k = 6) => {
  const soft = P.map((p, i) => (i === 0 || i === P.length - 1 ? p : [0, 1].map((c) => (P[i - 1][c] + 2 * p[c] + P[i + 1][c]) / 4)));
  return { ...spline(soft, k, false), closed: false };
};
/** Mittellinie des Ringfingers von der Spitze bis zum Ansatz: Mitte zwischen seinen beiden Kanten (dritter Linienzug, die
 * Spitze in der Mitte), zuletzt der Sitz des Rings. */
const RING_FINGER_LINE = (() => {
  const L = HAND_PHOTO[2], tip = L.findIndex(([x, y]) => x === HAND_TIP[0] && y === HAND_TIP[1]);
  const left = L.slice(0, tip + 1).reverse(), right = L.slice(tip), at = (line, u) => line[Math.min(line.length - 1, Math.round(u * (line.length - 1)))];
  return [HAND_TIP, ...[0.25, 0.5, 0.75].map((u) => { const a = at(left, u), b = at(right, u); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }), HAND_RING];
})();
/** Punkt und Richtung auf dem Ringfinger, s = 0 an der Spitze, 1 am Ansatz. */
function ringFingerAt(s) {
  const P = spline(RING_FINGER_LINE, 10, false).pts, L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const d = Math.max(0, Math.min(1, s)) * L[L.length - 1];
  let q = 1; while (q < P.length - 1 && L[q] < d) q++;
  const u = (d - L[q - 1]) / (L[q] - L[q - 1] || 1), dx = P[q][0] - P[q - 1][0], dy = P[q][1] - P[q - 1][1], l = Math.hypot(dx, dy) || 1;
  // Richtung zur Fingerspitze hin (der Ring gleitet entgegengesetzt, zum Ansatz)
  return [P[q - 1][0] + dx * u, P[q - 1][1] + dy * u, -dx / l, -dy / l];
}
/** Die Hand für nContour Drohnen auf den Linien (gleichmäßig neu verteilt) und das Armband wie im Foto (nCuff ≤ 46; mehr
 * Drohnen kommen auf die Linien). */
function hand(nContour, nCuff) {
  const cuff = evenPick(HAND_CUFF, Math.min(nCuff, HAND_CUFF.length));
  return { contour: sampleOutline(HAND_PHOTO.map((l) => smoothLine(l)), nContour + nCuff - cuff.length), cuff };
}
/** m Punkte aus einer Liste, gleichmäßig über die Liste verteilt (die Reihenfolge ist von links nach rechts). */
const evenPick = (list, m) => Array.from({ length: m }, (_, i) => list[Math.floor(((i + 0.5) * list.length) / m)]);
const HAND = [246, 200, 214], CUFF = GOLD;

function ringStory(n) {
  // budget per act (300 drones): ring 60; box 216 with cushion and gold edges + 24 calm stars far out; hand 232 with
  // cuff + 8 sparks that wait dimmed at the stone's seat; heart 232 + the same 8 sparks. Dreizehnte Fassung: the box no
  // longer stands as a cloud; box and stars rebuild into the hand through the living cloud while the ring flies on
  const ringN = Math.round(n * 0.2), body = Math.round(n * 0.773), boxN = Math.round(n * 0.72), sparks = n - ringN - body, stars = n - ringN - boxN;
  const [nBase, nGold, nLid, nCushion] = share(boxN, [84, 30, 66, 36]), nCuff = Math.min(HAND_CUFF.length, Math.round(body * 0.14)), nContour = body - nCuff;
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
  // fünfzehnte Fassung: die Hand aus FlyingStars' Antrags-Show (HAND_PHOTO), Linien in Hand-Weiß, das Armband in Gold
  const H = hand(nContour, nCuff), flatHand = (list, colour) => paint(list.map((p) => [p[0], p[1], 0]), colour);
  const handPts = [...flatHand(H.contour, HAND), ...flatHand(H.cuff, CUFF)];
  // vor der Fingerspitze (s < 0 verlängert die Spitze nach außen) und der Sitz des Rings, gut ein Drittel vom Ansatz
  const tipAt = (() => { const [x, y, dx, dy] = ringFingerAt(0); return [x + dx * 0.1, y + dy * 0.1, dx, dy]; })();
  // der Ring wartet, wo im Foto die kleine Ringformation steht, und sitzt am Ende am Fingeransatz wie der Ring im Foto
  const hover = [HAND_RING_WAIT[0], HAND_RING_WAIT[1], 0.1], [tipX, tipY, ux, uy] = tipAt, [seatX, seatY] = ringFingerAt(0.8);
  // on the finger the ring's axis lies along the finger but tips 30° towards the audience, so the band stays an open
  // ellipse instead of an edge; the stone sits beside the finger on the side of the hand's back
  const side = ux < 0 ? [uy, -ux, 0] : [-uy, ux, 0], axis = norm3([ux * 0.87, uy * 0.87, 0.5]);
  const qFinger = qFromBasis(norm3(cross(side, axis)), side, axis);
  const tipC = [tipX, tipY, 0.04], seatC = [seatX, seatY, 0.04], ctrl = [(hover[0] + tipX) / 2 - 0.02, tipY + 0.12, 0.1]; // ein flacher Bogen, der nur vorwärts geht (vorher holte er nach links unten aus)
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
  const calm = (j, t, o) => { o[3] = 0.32 + 0.12 * Math.sin(t * 0.7 + j); drift(o, j, t, 0.03); }; // far stars: dim and quiet, drifting gently (vierzehnte Fassung)
  const ringLight = (j, t, stoneDim = 0) => (isStone(j) ? lerp(sparkle(j, t, 1.0, 1.65), 0.55, stoneDim) : 0.95 + 0.35 * Math.max(0, Math.sin(Math.atan2(ring.pts[j][1], ring.pts[j][0]) - t * 1.6)) ** 4);
  const sparkPart = (pts) => part("stars", paint(pts, mix(DIAMOND, WARM, 0.4)));

  return { beats: [
    act([part("ring", place(Q0, inSlot), { rigid: true }), part("body", boxPts(0)), part("stars", boxStars, { offstage: true })], { caption: message('hochzeit.aJewelleryBoxOpens'), hold: 3.4, frame: "box", live: (b, j, t, o) => {
      if (j < ringN) o[3] = isStone(j) ? 0.3 + 1.1 * smooth((t - 2.2) / 1) : 0.3 + 0.4 * smooth((t - 2.6) / 1); // the stone shows first as the lid opens
      else if (j < ringN + boxN) { const k = j - ringN; if (k >= lidStart && k < cushionStart) { const p = VIEW(swingLid(B.lid[k - lidStart], lidOpen(t))); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; } }
      else calm(j, t, o);
    } }),
    act([part("ring", place(Q0, raised), { rigid: true }), part("body", boxPts(OPEN)), part("stars", boxStars, { offstage: true })], { caption: message('hochzeit.theRingRisesFromItsCushionTheDiamondSparkles'), hold: 2.6, frame: "box", live: (b, j, t, o) => {
      if (j < ringN) { setRing(j, slerp(Q0, [Math.cos(0.3), 0, Math.sin(0.3), 0], 0.5 - 0.5 * Math.cos(t * 0.9)), raised, o); o[3] = isStone(j) ? sparkle(j, t, 1.05, 1.7) : 0.7 + 0.35 * smooth((t - 0.4) / 1.2); }
      else if (j >= ringN + boxN) calm(j, t, o);
    } }),
    act([part("ring", place(Q0, hover), { rigid: true }), part("body", handPts), sparkPart(sparkPts)], { caption: message('hochzeit.aHandTheRingFindsTheRingFinger'), hold: 7.4, frame: "hand", cloud: ["body", "stars"], live: (b, j, t, o) => {
      if (j < ringN) { const { c, q } = flyAt(t); setRing(j, q, c, o); o[3] = ringLight(j, t, Math.sin(Math.PI * turnOf(t))); } // the stone dims while the ring turns
      else if (j < ringN + body) o[3] = 0.95 + 0.1 * Math.sin(t * 1.3);
      else o[3] = 0.1 + sparkle(j, t, 0.5, 1.5) * smooth((t - 6.6) / 0.8); // a few sparks at the stone once the ring sits
    } }),
    act([part("ring", place(Q0, centre), { rigid: true }), part("body", paint(heartPts, heartColour)), sparkPart(heartSparks)], { caption: message('hochzeit.andSheSaysYes'), live: (b, j, t, o) => {
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


// ---------- Ringe · ODYSSEY ----------
/**
 * Vierzehnte Fassung (Marc: ODYSSEY muss sichtbar hochwertiger sein als HORIZON, Vorbild Kolibri): Die Eheringe aus
 * SPARK als Körper in 3D, ineinander verschlungen; ein Schein wandert um jeden Reif (der Schmetterlings-Effekt). Dann
 * wachsen sie zu einem Solitär mit Brillant zusammen, dem HORIZON-Ring. Der Antrag mit Kästchen und Hand ist ein eigenes,
 * größeres Motiv geworden (ab UNLOCK[1]).
 */
function ringsLink(n) {
  const CHAMPAGNE = [250, 228, 190], ROSE = mix([250, 210, 190], PINK, 0.35);
  const [ra, rb] = torusLink(n, 0.62, 0.36, 0.07);
  const angleRank = (pts, cx) => pts.map((p) => frac(Math.atan2(p[1], p[0] - cx) / TAU + 0.25));
  const ua = angleRank(ra, -0.36), ub = rb.map((p) => frac(Math.atan2(p[2], p[0] - 0.36) / TAU + 0.25));
  const [band, stone] = solitaire(n, 0.8), bandU = band.map((p) => frac(Math.atan2(p[1], p[0]) / TAU + 0.25)), k = band.length;
  return { beats: [
    act([part("a", paint(ra, CHAMPAGNE)), part("b", paint(rb, ROSE))], { caption: message('hochzeit.twoWeddingRingsIntertwineIn3d'), hold: 4.5, live: (b, j, t, o) => {
      o[3] = j < ra.length ? wander(ua[j], t, 4.6, 0.45, 0.07) : wander(ub[j - ra.length], t + 2.3, 4.6, 0.45, 0.07);
      yaw(o, 0.28 * t); pitch(o, 0.32);
    } }),
    act([part("band", paint(band, (p) => mix(GOLD, WARM, (p[1] + 0.8) / 3.2))), part("stone", paint(stone, DIAMOND))], { caption: message('hochzeit.andBecomeASolitaireWithADiamond'), live: (b, j, t, o) => {
      o[3] = j >= k ? sparkle(j, t, 0.95, 1.55) : wander(bandU[j], t, 4.2, 0.4, 0.08);
      yaw(o, 0.28 * t); pitch(o, 0.35);
    } }),
  ] };
}

export const builders = { ringsLink, heartTunnel, lotus3d, lotusStory, butterfly2d, butterfly3d, butterflyStory, ringStory, weddingRings2d };
