// jubilaeum motifs of the eleventh version (see src/content/show-configurator.js for the build names).
// Fußball and Kopfsprung, after FlyingStars' sports pictures in Eisenhüttenstadt (round 2: a stick figure with a ball
// that drifts up, a diver over rows of water with a light running through them), as own figures: the footballer is a
// rig whose leg really swings (smooth, slow, within the drone limits), the diver a rigid body that turns along its arc.
import { sampleOutline, circle } from "../show-geometry.js";
import { loadTextEngine, textFormation } from "../text-formation.js";
import { TAU, WARM, GOLD, CYAN, BLUE, mix, paint, smooth, hash, roll, sway, breathe, glint, sparkle, chase, burstLight, loosen, rig, share, part, act } from "../show-motion.js";

const line = (...pts) => ({ pts, closed: false });
const sample = (paths, k) => (k > 0 ? sampleOutline(paths, k).map(([x, y]) => [x, y, 0]) : []);
const shift = (pts, dx = 0, dy = 0, dz = 0) => pts.map(([x, y, z = 0, ...c]) => [x + dx, y + dy, z + dz, ...c]);
/** Cosine ease: for a given move the lowest peak acceleration, so limbs and balls start and stop softly. */
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u));
/** A value along eased keyframes [[t, v], …], held before the first and after the last. */
function keys(K, t) {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (t < K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * ease((t - K[i - 1][0]) / (K[i][0] - K[i - 1][0]));
  return K[K.length - 1][1];
}
const rot = ([x, y], a, [cx, cy] = [0, 0]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
/** A rig frozen at time t: its points in that pose. */
const bake = (r, t) => r.pts.map((p, j) => { const o = [p[0], p[1], p[2], 1]; r.live(p, j, t, o); return [o[0], o[1], o[2]]; });
const bez = (P0, P1, P2, s) => P0.map((v, i) => (1 - s) ** 2 * v + 2 * (1 - s) * s * P1[i] + s * s * P2[i]);
/** A limb as a slim closed outline: the double contour real shows use for thick lines. */
function capsule(a, b, w) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = (-dy / l) * w, ny = (dx / l) * w;
  return { pts: [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] + dx / l * w, b[1] + dy / l * w], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny], [a[0] - dx / l * w, a[1] - dy / l * w]] };
}
/** The number of the jubilee in FlyingStars' own lettering, centred on (cx, cy); unused drones underline it. */
async function number(value, k, halfWidth, cx, cy, z = 0) {
  await loadTextEngine();
  const r = textFormation(value, k);
  const pts = r ? r.pts.slice(0, k) : [];
  if (!pts.length) return sample([circle(cx, cy, halfWidth * 0.7, 80)], k).map(([x, y]) => [x, y, z]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), s = (halfWidth * 2) / (Math.max(...xs) - Math.min(...xs)), my = (Math.max(...ys) + Math.min(...ys)) / 2, mx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const out = pts.map(([x, y]) => [(x - mx) * s + cx, (y - my) * s + cy, z]), bottom = Math.min(...out.map((p) => p[1]));
  return out.concat(sample([line([cx - halfWidth * 0.8, bottom - 0.12], [cx + halfWidth * 0.8, bottom - 0.12])], k - out.length).map(([x, y]) => [x, y, z]));
}
const NUMBER = "25";

// ---------- Fußball ----------
// The footballer faces right, hip at the origin, drawn in reference pose (kicking leg hanging straight down). The rig
// turns the limbs; angles are offsets from this pose, positive = counter-clockwise = forward for the kicking leg.
const HIP = [0, 0], NECK = [-0.02, 0.5], SH = [-0.02, 0.43], HEAD = [-0.035, 0.64], HEAD_R = 0.12;
const KNEE = [0.02, -0.42], ANKLE = [0.02, -0.84], TOE = [0.17, -0.86], GROUND = -0.87;
const SHIN = 6; // limb index of the shin (for the light at the moment of the kick)
function footballer(n, a, thick = false) {
  const limb = (p, q) => (thick ? capsule(p, q, 0.04) : line(p, q));
  return rig([
    { name: "torso", paths: [limb(HIP, NECK)], pivot: HIP, angle: a.lean },
    { name: "head", paths: [circle(HEAD[0], HEAD[1], HEAD_R, 40)], pivot: HIP, parent: "torso" },
    { name: "armB", paths: [line(SH, [-0.21, 0.27], [-0.4, 0.32])], pivot: SH, parent: "torso", angle: a.armB },
    { name: "armF", paths: [line(SH, [0.16, 0.27], [0.34, 0.31])], pivot: SH, parent: "torso", angle: a.armF },
    { name: "stand", paths: [limb(HIP, [-0.08, -0.42]), limb([-0.08, -0.42], [-0.1, -0.84]), line([-0.1, -0.85], [0.04, -0.87])], pivot: HIP },
    { name: "thigh", paths: [limb(HIP, KNEE)], pivot: HIP, angle: a.thigh },
    { name: "shin", paths: [limb(KNEE, ANKLE), line(ANKLE, TOE)], pivot: KNEE, parent: "thigh", angle: a.shin },
  ], n, sample);
}
const toeAt = (thigh, shin) => rot(rot(TOE, shin, KNEE), thigh, HIP);
/** A football: rim, a pentagon in the middle, seams to five patches cut by the rim (plain spokes read as a wheel); turning the pattern shows the spin. */
function football(k, R) {
  const [rim, inner] = share(k, [1.3, 1]), full = k >= 34; // from 34 drones the outer patches cut by the rim show too
  const at = (a, r) => [Math.cos(a) * r * R, Math.sin(a) * r * R], corner = Array.from({ length: 5 }, (_, i) => Math.PI / 2 + (i * TAU) / 5);
  const seams = [{ pts: corner.map((a) => at(a, 0.42)) }, ...corner.flatMap((a) => (full ? [line(at(a, 0.42), at(a, 0.66)), line(at(a - 0.42, 0.97), at(a, 0.66), at(a + 0.42, 0.97))] : [line(at(a, 0.42), at(a, 0.68))]))];
  return [...sample([circle(0, 0, R, 48)], rim), ...sample(seams, inner)];
}
const still = (v) => () => v;

// One kick of the HORIZON loop (s): wind up, swing through, follow through, back to rest. The swing takes 1.6 s, slow
// enough that the foot stays within the drones' acceleration; the ball leaves when the foot reaches it.
const KICK = {
  thigh: [[0.1, 0.12], [1.2, -0.3], [2.8, 1.0], [3.1, 1.0], [4.6, 0.12]],
  shin: [[0.1, -0.05], [1.2, -0.9], [2.6, -0.08], [4.6, -0.05]],
  hit: 2.1, // the foot reaches the ball
};
const kickAngles = (clock) => {
  const th = (t) => keys(KICK.thigh, clock(t));
  return { thigh: th, shin: (t) => keys(KICK.shin, clock(t)), lean: (t) => 0.04 + 0.12 * (th(t) - 0.12), armB: (t) => 0.1 - 0.22 * (th(t) - 0.12), armF: (t) => -0.1 + 0.18 * (th(t) - 0.12) };
};
/** The ball's loop after the kick: up and forward, over the top, and down again in front of the foot (s ∈ [0, 1]). */
const lob = (s, H, D) => [D * (0.85 * Math.sin(Math.PI * s) + 0.18 * Math.sin(TAU * s)), H * Math.sin(Math.PI * s)];

function kick2d(n, caption) {
  const [f, b] = share(n, [2.3, 1]), TH = 1.38, SN = -0.06, R = 0.19;
  const body = bake(footballer(f, { lean: still(0.18), thigh: still(TH), shin: still(SN), armB: still(0.3), armF: still(-0.45) }), 0);
  const toe = toeAt(TH, SN), C = [toe[0] + 0.08, toe[1] + R + 0.13];
  const pts = [...paint(body, WARM), ...paint(shift(football(b, R), C[0], C[1]), GOLD)];
  // the figure stands; only the pattern inside the ball turns, and the ball floats a hair above the foot
  return { beats: [{ pts, caption, live: (bs, j, t, o) => {
    if (j < f) return;
    roll(o, -t * 0.8, C[0], C[1]); o[1] += 0.018 * Math.sin(t * 1.7); o[3] = breathe(t, 3);
  } }] };
}

function kickHorizon(n, caption) {
  const [f, b] = share(n, [2.6, 1]), R = 0.17, P = 6.0, TL = 2.0, TF = 3.7, H = 1.1, D = 0.6;
  const clock = (t) => (t <= 0 ? 0 : t % P), r = footballer(f, kickAngles(clock), true);
  const B0 = [0.5, GROUND + R + 0.01], ballPts = football(b, R);
  const flight = (t) => ease((clock(t) - TL) / TF);
  const fit = [...r.pts, ...Array.from({ length: 21 }, (_, i) => { const [x, y] = lob(i / 20, H, D); return [B0[0] + x, B0[1] + y + R, 0]; }), [B0[0] + D * 0.9 + R, B0[1], 0]];
  const pts = [...paint(r.pts, WARM), ...paint(shift(ballPts, B0[0], B0[1]), GOLD)];
  return { beats: [{ pts, fitPts: fit, caption, live: (bs, j, t, o) => {
    if (j < f) {
      r.live(bs, j, t, o);
      if (r.owner[j] === SHIN) o[3] = 1 + 0.7 * Math.exp(-(((clock(t) - KICK.hit) / 0.18) ** 2)); // the foot lights up as it meets the ball
      return;
    }
    // the ball: spin and flight from one smooth parameter, so it leaves the foot and lands again without a jolt
    const s = flight(t), [dx, dy] = lob(s, H, D);
    roll(o, -TAU * s, B0[0], B0[1]); o[0] += dx; o[1] += dy; o[3] = 1 + 0.35 * Math.sin(Math.PI * s);
  } }] };
}

async function kickStory(n) {
  // Funken → ein Spieler mit Ball → Schuss, der Ball fliegt mit Lichtspur ins Tor → Tor! → der Ball wird zur Zahl.
  // The trail is light on drones that stand along the ball's arc; the goal is a frame with a net drawn in depth.
  const [PN, BN, TN, NN, FN] = share(n, [128, 36, 46, 50, 40]), PX = -1.25, R = 0.16;
  const at = (pts) => shift(pts, PX);
  const restAngles = { lean: still(0.04), thigh: still(0.12), shin: still(-0.05), armB: still(0.1), armF: still(-0.1) };
  const rest = at(bake(footballer(PN, restAngles, true), 0));
  const cheer = at(bake(footballer(PN, { lean: still(-0.05), thigh: still(0.05), shin: still(-0.02), armB: still(-1.15), armF: still(1.2) }, true), 0));
  const kicker = footballer(PN, kickAngles((t) => Math.max(0, t)), true);
  const kickLive = (j, t, o) => { o[0] -= PX; kicker.live(null, j, t, o); o[0] += PX; if (kicker.owner[j] === SHIN) o[3] = 1 + 0.7 * Math.exp(-(((t - KICK.hit) / 0.18) ** 2)); };
  // the goal, its mouth towards the audience; the net goes back in depth
  const GX0 = 0.0, GX1 = 1.55, GT = -0.12, BK = -0.5, BT = -0.32, BX0 = 0.15, BX1 = 1.4;
  const frame = sample([line([GX0, GROUND], [GX0, GT], [GX1, GT], [GX1, GROUND])], FN);
  const netLines = [line([BX0, GROUND, BK], [BX0, BT, BK], [BX1, BT, BK], [BX1, GROUND, BK]), line([GX0, GT, 0], [BX0, BT, BK]), line([GX1, GT, 0], [BX1, BT, BK]),
    ...[0.25, 0.5, 0.75].flatMap((u) => { const x = BX0 + (BX1 - BX0) * u; return [line([x, BT, BK], [x, GROUND, BK]), line([GX0 + (GX1 - GX0) * u, GT, 0], [x, BT, BK])]; }), line([BX0, (BT + GROUND) / 2, BK], [BX1, (BT + GROUND) / 2, BK])];
  // the net in 3D: sample the lines in x-y, then give every point the depth of its line at that place
  const net = sample3(netLines, NN);
  const B0 = [PX + 0.5, GROUND + R + 0.01, 0], G1 = [0.85, -0.5, -0.38], K = [-0.35, 0.95, -0.1];
  const ball = (c) => shift(football(BN, R), ...c);
  const sOf = (k) => 0.06 + 0.88 * (k + 0.5) / TN;
  const trail = Array.from({ length: TN }, (_, k) => { const [x, y, z] = bez(B0, K, G1, sOf(k)); return [x, y + (k % 2 ? 0.025 : -0.025), z - 0.12]; });
  const TL = 2.0, TF = 2.3, s = (t) => ease((t - TL) / TF);
  const RAYS = 9, burst = Array.from({ length: TN }, (_, k) => { const a = ((k % RAYS) / RAYS) * TAU + 0.2, u = Math.floor(k / RAYS) / Math.max(1, Math.ceil(TN / RAYS) - 1); return [0.78 + Math.cos(a) * (0.2 + 0.4 * u), 0.45 + Math.sin(a) * (0.2 + 0.4 * u), (hash(k) - 0.5) * 0.2]; });
  const stars = Array.from({ length: TN }, (_, k) => [-1.5 + 3.2 * hash(k * 2.3 + 1), -0.2 + 1.1 * hash(k * 4.1 + 2), (hash(k * 7.7) - 0.5) * 0.6]);
  const num = await number(NUMBER, BN + TN, 0.48, 0.78, 0.45, 0.1);
  const twinkle = (j, t, o) => { o[3] = sparkle(j, t, 0.5, 1.2); };
  const goal = (netPts = net, framePts = frame) => [part("net", paint(netPts, mix(WARM, CYAN, 0.25))), part("frame", paint(framePts, WARM))];
  const T0 = PN, T1 = PN + BN, T2 = T1 + TN; // index ranges: player | ball | trail | net | frame
  return { beats: [
    act([part("player", paint(loosen(rest, 0.4), WARM)), part("ball", paint(loosen(ball(B0), 0.3), GOLD)), part("trail", paint(stars, GOLD)), ...goal(loosen(net, 0.6), loosen(frame, 0.6))], { caption: "Funken", hold: 1.2, live: (b, j, t, o) => { o[3] = sparkle(j, t, 0.45, 1.3); } }),
    act([part("player", paint(rest, WARM)), part("ball", paint(ball(B0), GOLD)), part("trail", paint(stars, GOLD)), ...goal(loosen(net, 0.35), loosen(frame, 0.35))], { caption: "daraus wird ein Spieler", hold: 1.4, live: (b, j, t, o) => {
      if (j >= T1 && j < T2) twinkle(j, t, o); else if (j >= T2) o[3] = 0.35 * sparkle(j, t, 0.6, 1.2);
      else if (j >= T0) roll(o, -t * 0.5, B0[0], B0[1]);
      sway(o, t, 0.15);
    } }),
    act([part("player", paint(at(kicker.pts), WARM)), part("ball", paint(ball(B0), GOLD)), part("trail", paint(trail, GOLD)), ...goal()], { caption: "er holt aus und schießt", hold: 4.4, live: (b, j, t, o) => {
      if (j < T0) kickLive(j, t, o);
      else if (j < T1) { const q = s(t), c = bez(B0, K, G1, q), sc = 1 - 0.25 * q; roll(o, -0.8 * TAU * q, B0[0], B0[1]); o[0] = c[0] + (o[0] - B0[0]) * sc; o[1] = c[1] + (o[1] - B0[1]) * sc; o[2] = c[2]; }
      else if (j < T2) { const d = s(t) - sOf(j - T1); o[3] = d < 0 ? 0.06 : 0.35 + 1.2 * Math.exp(-d / 0.12); } // the light trail follows the ball
      else if (j < T2 + NN && s(t) > 0.97) o[3] = 1 + 0.6 * Math.exp(-(t - TL - TF) / 0.4); // the net catches the ball
    } }),
    act([part("player", paint(cheer, WARM)), part("ball", paint(shift(football(BN, R * 0.75), ...G1), GOLD)), part("trail", paint(burst, GOLD)), ...goal()], { caption: "Tor!", hold: 2.6, live: (b, j, t, o) => {
      if (j >= T1 && j < T2) o[3] = burstLight(Math.hypot(b[0] - 0.78, b[1] - 0.45) / 0.6, t, 2.6)[0];
      else if (j >= T2 && j < T2 + NN) o[3] = chase(Math.hypot(b[0] - G1[0], b[1] - G1[1]), -t, 0.5, 0.6, 0.8, 1.7); // the net glows outward from the ball
      else if (j >= T0 && j < T1) o[3] = sparkle(j, t, 1, 1.5);
      sway(o, t, 0.15);
    } }),
    act([part("player", paint(cheer, WARM)), part("number", paint(num, GOLD)), ...goal()], { caption: "…und der Ball wird zu eurer Zahl", live: (b, j, t, o) => {
      if (j >= PN && j < T2) o[3] = glint(b[0], t, 3.2, 0.45, -0.1, 1.7);
      sway(o, t, 0.2);
    } }),
  ] };
}
/** Points along 3D polylines (by their length in the picture), each with the depth of its line at that place. */
function sample3(paths, k) {
  const segs = [];
  for (const { pts } of paths) for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] - a[2]) * 0.6), total = segs.reduce((s, [a, b]) => s + len(a, b), 0), out = [];
  let seg = 0, along = 0;
  for (let q = 0; q < k; q++) {
    const d = ((q + 0.5) * total) / k;
    while (seg < segs.length - 1 && d - along > len(...segs[seg])) { along += len(...segs[seg]); seg++; }
    const [a, b] = segs[seg], L = len(a, b), u = L ? Math.min(1, (d - along) / L) : 0;
    out.push([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * u));
  }
  return out;
}

// ---------- Kopfsprung ----------
// The diver is a figure in the footballer's style, drawn stretched out along +x (hands ahead, feet at −x, belly side
// −y), hip at the origin, scaled by S. Angles bend the joints: torso and arms towards the belly (negative), thigh
// positive brings the knees forward, shin negative folds the lower leg back, foot FLAT stands the foot on the board.
const FLAT = Math.PI / 2, STRAIGHT = { torso: 0, arms: 0, thigh: 0, shin: 0, foot: 0 };
function diverRig(n, angles, { S = 1, thick = false } = {}) {
  const P = (x, y) => [x * S, y * S], hip = P(0, 0), sh = P(0.56, 0), knee = P(-0.44, 0), ankle = P(-0.86, 0), hand = P(1.22, 0);
  const limb = (p, q, w) => (thick ? capsule(p, q, w * S) : line(p, q));
  const a = (k) => (t) => angles(t)[k];
  return rig([
    { name: "torso", paths: [limb(hip, sh, 0.05)], pivot: hip, angle: a("torso") },
    { name: "head", paths: [circle(0.71 * S, -0.18 * S, 0.14 * S, 40)], pivot: hip, parent: "torso" },
    // both arms stretched over the head, the hands together: the tip that cuts the water
    { name: "arms", paths: [line(P(0.56, 0.045), hand), line(P(0.56, -0.045), hand)], pivot: sh, parent: "torso", angle: a("arms") },
    { name: "thigh", paths: [limb(hip, knee, 0.045)], pivot: hip, angle: a("thigh") },
    { name: "shin", paths: [limb(knee, ankle, 0.035)], pivot: knee, parent: "thigh", angle: a("shin") },
    { name: "foot", paths: [line(ankle, P(-0.99, -0.025))], pivot: ankle, parent: "shin", angle: a("foot") },
  ], n, sample);
}
const HAND_TIP = 1.22, ANKLE_X = -0.86, KNEE_X = -0.44;
/** Drone j of the diver rig at time t, hip at c, body turned to angle a (0 = hands to the right). */
function diverAt(r, j, t, c, a) {
  const p = r.pts[j], o = [p[0], p[1], 0, 1];
  r.live(p, j, t, o);
  const [x, y] = rot(o, a);
  return [c[0] + x, c[1] + y, c[2] ?? 0];
}
/** Where the ankle sits relative to the hip for given leg angles (to keep the feet on the board). */
const ankleOf = (g, S, a) => rot(rot(rot([ANKLE_X * S, 0], g.shin, [KNEE_X * S, 0]), g.thigh), a);
const pose = (p, c, a) => { const [x, y] = rot(p, a); return [c[0] + x, c[1] + y, c[2] ?? 0]; };
// the water seen from slightly above: a point at depth d (further back = larger d) lies a little higher on the stage
const TIP = 0.32;
const surf = (x, d, wy) => [x, wy + d * Math.sin(TIP), -d * Math.cos(TIP)];
/** Rows of water on the surface; depth of each row in d. */
function waterRows(k, rows, x0, x1, wy) {
  const counts = share(k, rows.map(() => 1));
  return rows.flatMap((d, r) => Array.from({ length: counts[r] }, (_, i) => surf(x0 + ((x1 - x0) * (i + (r % 2 ? 0.75 : 0.25))) / counts[r], d, wy)));
}
/** Drones below the water line glow out: the diver visibly disappears into the water. */
const underwater = (y, wy) => 1 - 0.97 * smooth((wy - y) / 0.12);

function dive2d(n, caption) {
  const [dv, w] = share(n, [0.96, 1]), WY = -0.62, S = 1.15, A = -0.8;
  // in flight; the hands just above the water
  const r = diverRig(dv, () => ({ ...STRAIGHT, thigh: 0.38, shin: -0.22, foot: -0.25 }), { S, thick: true }); // body as double contour, hips a little piked
  const tip = [0.4, WY + 0.14], hip = [tip[0] - HAND_TIP * S * Math.cos(A), tip[1] - HAND_TIP * S * Math.sin(A)];
  const body = r.pts.map((q, j) => diverAt(r, j, 0, hip, A));
  const rows = [0, 1, 2], counts = share(w, [1, 1, 1]);
  const water = rows.flatMap((q) => Array.from({ length: counts[q] }, (_, i) => { const x = -1.4 + 0.1 * q + ((2.8 - 0.2 * q) * (i + (q % 2 ? 0.75 : 0.25))) / counts[q]; return [x, WY - q * 0.12 + 0.025 * Math.sin(x * 5 + q * 1.3), 0, q]; }));
  const pts = [...paint(body, WARM), ...paint(water.map((p) => p.slice(0, 3)), (p, i) => mix(CYAN, BLUE, water[i][3] / 2.5))];
  // light runs along the rows like ripples; the diver stands still
  return { beats: [{ pts, caption, live: (b, j, t, o) => { if (j >= dv) { const q = water[j - dv][3]; o[3] = chase(b[0] + q * 0.18, t, 0.32, 0.75, 0.75, 1.5); } } }] };
}

function diveHorizon(n, caption) {
  const [dv, w] = share(n, [1, 1]), WY = -0.55, P = 7.4, S = 1.15, ROWS = [-0.45, -0.15, 0.15, 0.45];
  const water = waterRows(w, ROWS, -1.4, 1.4, WY);
  // the arc of the dive (path of the hip): from the take-off on the left over a flat top into the water; the body
  // follows the arc, the hips piked at first and stretching out before the hands meet the water
  const A = [-1.25, 1.2, 0], K = [0.1, 1.95, 0], E = [0.45, WY - 1.3 * S, 0], T0 = 0.4, TD = 3.2;
  const dir = (s) => { const d = [0, 1].map((i) => 2 * (1 - s) * (K[i] - A[i]) + 2 * s * (E[i] - K[i])); return Math.atan2(d[1], d[0]); };
  const at = (t) => { // where the diver is in the loop: dive, glide back unseen behind the water, fade in again
    const c = t <= 0 ? 0 : t % P;
    if (c < T0 + TD) { const s = ease((c - T0) / TD); return { c: bez(A, K, E, s), a: dir(s), pike: 0.3 * (1 - ease(s / 0.7)), lit: 1 }; }
    const v = ease((c - T0 - TD - 0.6) / 3.2), p = A.map((q, i) => E[i] + (q - E[i]) * v);
    p[2] = -1.4 * Math.sin(Math.PI * v);
    return { c: p, a: dir(1) + (dir(0) - dir(1)) * v, pike: 0.3 * v, lit: smooth((c - 6.7) / 0.6) };
  };
  let now = NaN, cur = at(0);
  const r = diverRig(dv, (t) => { if (t !== now) { now = t; cur = at(t); } return { ...STRAIGHT, thigh: cur.pike }; }, { S, thick: true });
  // when and where the hands meet the water
  let tE = T0 + TD, xE = 0;
  for (let c = T0; c < T0 + TD; c += 0.01) { const q = at(c), hand = pose([HAND_TIP * S, 0], q.c, q.a); if (hand[1] < WY) { tE = c; xE = hand[0]; break; } }
  const start = r.pts.map((q, j) => diverAt(r, j, 0, A, dir(0))), top = r.pts.map((q, j) => diverAt(r, j, T0 + TD * 0.4, at(T0 + TD * 0.4).c, at(T0 + TD * 0.4).a));
  const pts = [...paint(start, WARM), ...paint(water, (p) => mix(CYAN, BLUE, (p[1] - WY + 0.15) / 0.3))];
  return { beats: [{ pts, fitPts: [...start, ...top, ...water], caption, live: (b, j, t, o) => {
    if (t !== now) { now = t; cur = at(t); }
    if (j < dv) { const p = diverAt(r, j, t, cur.c, cur.a); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = cur.lit * underwater(p[1], WY); return; }
    // the water: a slow swell, and after the dive rings that spread over the surface and settle again
    const k = j - dv, d = -b[2] / Math.cos(TIP), c = t <= 0 ? 0 : t % P, since = c - tE, rr = Math.hypot(b[0] - xE, d);
    const env = smooth(since / 0.4) * (1 - smooth((since - 2.6) / 1.4));
    const ring = since > 0 ? Math.exp(-(((rr - 0.5 * since) / 0.11) ** 2)) + 0.6 * Math.exp(-(((rr - 0.5 * (since - 0.7)) / 0.11) ** 2)) : 0;
    o[1] += 0.018 * Math.sin(b[0] * 2.4 - t * 1.3 + d * 4 + k * 0.01) + 0.06 * env * ring;
    o[3] = 0.85 + 0.12 * Math.sin(b[0] * 3 - t * 0.9 + d * 5) + env * (1.2 * ring + 1.1 * Math.exp(-((rr / 0.18) ** 2)) * Math.exp(-since / 0.5));
  } }] };
}

async function diveStory(n) {
  // Sprungbrett → Absprung (Hocke, das Brett federt) → Kopfsprung ins Wasser, Spritzer aus Licht → Ringe auf dem
  // Wasser → die Ringe richten sich auf und werden zur Medaille mit eurer Zahl. The diver keeps its drones (a rig)
  // until it is under water; its drones then join the rings.
  const [DV, BD, W] = share(n, [100, 50, 150]), WY = -0.6, BY = 0.3, TIPX = -0.7, POST = -1.7, S = 1.05;
  // a springboard: the plank, its post down to the pool edge and a brace; the plank's far end rests on the post
  const plank = [line([POST - 0.25, BY], [TIPX, BY]), line([POST - 0.25, BY - 0.045], [TIPX, BY - 0.045]), line([POST, BY - 0.045], [POST, WY + 0.02]), line([POST, BY - 0.42], [POST + 0.3, BY - 0.045])];
  const board = (() => { const [a, b] = share(BD, [1, 1]); return [...sample(plank, a).map(([x, y]) => [x, y, 0.08]), ...sample(plank, b).map(([x, y]) => [x, y, -0.08])]; })();
  const water = waterRows(W, [-0.4, -0.13, 0.13, 0.4], -0.8, 1.45, WY);
  const UP = Math.PI / 2, FEET = [TIPX - 0.12, BY + 0.02], AH = [-0.3, 1.5, 0], APEX_A = 0.25;
  const UNDER = [0.5, WY - 1.4 * S, 0], UNDER_A = -1.45, K = [0.6, 1.65, 0];
  // the take-off: crouch on the board (it bends), stretch, and leap to the top of the arc, the hips piked
  const crouch = (t) => keys([[0.2, 0], [1.4, 1], [2.6, 0]], t), leap = (t) => ease((t - 2.0) / 2.2);
  const takeoff = (t) => { const k = crouch(t), u = leap(t); return { torso: -0.55 * k, arms: -0.7 * k, thigh: 0.7 * k + 0.35 * u, shin: -1.3 * k, foot: (FLAT + 0.7 * k) * (1 - u) }; };
  const dip = (t) => 0.1 * crouch(t) * (1 - leap(t));
  const bend = (x) => Math.max(0, (x - POST) / (TIPX - POST)) ** 2;
  const standing = { ...STRAIGHT, foot: FLAT }, stand = diverRig(DV, () => standing, { S, thick: true });
  const jumper = diverRig(DV, takeoff, { S, thick: true });
  const hipOnBoard = (g, a, d) => { const k = ankleOf(g, S, a); return [FEET[0] - k[0], FEET[1] - d - k[1], 0]; };
  const leapAt = (t) => { const g = takeoff(t), u = leap(t), a = UP + (APEX_A - UP) * u, h = hipOnBoard(g, UP, dip(t)); return { c: h.map((v, i) => v + (AH[i] - v) * u), a }; };
  // the dive: from the top down into the water, the body stretches and turns head first; the hands meet the water at tE
  const fall = (t) => ease(t / 2.8), fallAt = (t) => ({ c: bez(AH, K, UNDER, fall(t)), a: APEX_A + (UNDER_A - APEX_A) * fall(t) });
  const diving = diverRig(DV, (t) => ({ ...STRAIGHT, thigh: 0.35 * (1 - ease(t / 1.3)) }), { S, thick: true });
  let tE = 2.8, xE = 0.3;
  for (let c = 0; c < 2.8; c += 0.01) { const { c: q, a } = fallAt(c), hand = pose([HAND_TIP * S, 0], q, a); if (hand[1] < WY) { tE = c; xE = hand[0]; break; } }
  const E = surf(xE, 0, WY);
  const standPts = stand.pts.map((q, j) => diverAt(stand, j, 0, hipOnBoard(standing, UP, 0), UP));
  const underPts = diving.pts.map((q, j) => diverAt(diving, j, 9, UNDER, UNDER_A));
  // three rings on the water around the entry point, and the medal they become
  const RR = [0.32, 0.62, 0.92], ringCounts = share(n, RR);
  const rings = RR.flatMap((r, q) => Array.from({ length: ringCounts[q] }, (_, i) => { const a = (i / ringCounts[q]) * TAU + q * 0.3; return [...surf(xE + Math.cos(a) * r, Math.sin(a) * r * 0.9, WY), q]; }));
  const MC = [0.15, 0.75], MR = 0.62, [RIM, NUM, RIB] = share(n, [1.15, 1.25, 0.8]);
  const rim = (() => { const [a, b] = share(RIM, [1, 1]); return [...sample([circle(MC[0], MC[1], MR, 90)], a).map(([x, y]) => [x, y, 0.05]), ...sample([circle(MC[0], MC[1], MR * 0.9, 90)], b).map(([x, y]) => [x, y, -0.05])]; })();
  const num = await number(NUMBER, NUM, 0.36, MC[0], MC[1] - 0.02, 0.05);
  const strap = (x0, x1) => ({ pts: [[x0 - 0.11, MC[1] + 1.2], [x0 + 0.11, MC[1] + 1.2], [x1 + 0.07, MC[1] + MR + 0.02], [x1 - 0.07, MC[1] + MR + 0.02]] });
  const [ra, rb] = share(RIB, [1, 1]), ribbon = [...paint(sample([strap(MC[0] - 0.46, MC[0] - 0.09)], ra), BLUE), ...paint(sample([strap(MC[0] + 0.46, MC[0] + 0.09)], rb), CYAN)];
  const swell = (b, t, o) => { const d = -b[2] / Math.cos(TIP); o[1] += 0.016 * Math.sin(b[0] * 2.4 - t * 1.3 + d * 4); o[3] = 0.85 + 0.12 * Math.sin(b[0] * 3 - t * 0.9 + d * 5); };
  const set = (o, p) => { o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; };
  const bodyCol = WARM, boardCol = mix(GOLD, WARM, 0.45), waterCol = (p) => mix(CYAN, BLUE, (p[1] - WY + 0.15) / 0.3);
  const D0 = DV, D1 = DV + BD; // index ranges: diver | board | water
  const scene = (diverPts, opts = {}) => [part("diver", paint(diverPts, bodyCol), { rigid: true, ...opts }), part("board", paint(board, boardCol)), part("water", paint(water, waterCol))];
  return { beats: [
    act(scene(standPts), { caption: "Ein Sprungbrett", hold: 1.4, live: (b, j, t, o) => { if (j >= D1) swell(b, t, o); } }),
    act(scene(standPts), { caption: "Absprung", hold: 4.4, live: (b, j, t, o) => {
      if (j < D0) { const { c, a } = leapAt(Math.max(0, t)); set(o, diverAt(jumper, j, Math.max(0, t), c, a)); }
      else if (j < D1) o[1] -= dip(Math.max(0, t)) * bend(b[0]);
      else swell(b, t, o);
    } }),
    act(scene(underPts, { offstage: true }), { caption: "Kopfsprung, das Wasser spritzt", hold: 3.6, live: (b, j, t, o) => {
      if (j < D0) { const tt = Math.max(0, t), { c, a } = fallAt(tt), p = diverAt(diving, j, tt, c, a); set(o, p); o[3] = underwater(p[1], WY); }
      else if (j >= D1) {
        swell(b, t, o);
        // the splash: drones near the entry lift a little and flash, then a ring of light runs outward
        const since = t - tE, r = Math.hypot(b[0] - E[0], (b[2] - E[2]) / Math.cos(TIP));
        if (since > 0) {
          const near = Math.exp(-((r / 0.28) ** 2)), up = Math.sin(Math.PI * Math.min(1, since / 1.3)) ** 2;
          o[1] += 0.13 * near * up; o[3] += near * 1.4 * Math.exp(-since / 0.7) + 0.8 * smooth(since / 0.3) * Math.exp(-(((r - 0.45 * since) / 0.12) ** 2));
        }
      }
    } }),
    act([part("water", paint(rings.map((p) => p.slice(0, 3)), (p, i) => mix(CYAN, BLUE, rings[i][3] / 2)))], { caption: "Ringe breiten sich aus", hold: 2.8, live: (b, j, t, o) => {
      const q = rings[j][3], dx = b[0] - E[0], dy = b[1] - E[1], dz = b[2] - E[2], k = 1 + 0.06 * Math.sin(t * 1.4 - q * 1.1);
      o[0] = E[0] + dx * k; o[1] = E[1] + dy * k; o[2] = E[2] + dz * k;
      o[3] = chase(RR[q], t, 0.45, 0.9, 0.7, 1.5);
    } }),
    act([part("water", paint(rim, GOLD)), part("number", paint(num, WARM)), part("ribbon", ribbon)], { caption: "…und werden zu eurer Zahl", live: (b, j, t, o) => {
      if (j < RIM) o[3] = glint(Math.atan2(b[1] - MC[1], b[0] - MC[0]), t, 4, 0.5, -Math.PI, Math.PI);
      sway(o, t, 0.3);
    } }),
  ] };
}

export const builders = { kick2d, kickHorizon, kickStory, dive2d, diveHorizon, diveStory };
