// festival motifs (Kolibri, Delfin) of the eleventh version (see src/content/show-configurator.js for the build names).
// Kolibri: SPARK whirrs with light between two wing poses, HORIZON is a skeleton body whose wings really beat (slowly,
// within drone limits) with light whirring at the edges, ODYSSEY flies to a blossom, drinks and rises. Delfin: one
// body drawn along a curve (the leap bends it like a real dolphin), water as wave rows that sway a little.
import { TAU, GOLD, PINK, VIOLET, CYAN, BLUE, GREEN, DIAMOND, mix, smooth, hash, yaw, pitch, breathe, glint, sparkle, chase, share, part, act } from "../show-motion.js";
import { sample3d } from "../show-shapes.js";

// ---------- shared ----------
const lerp = (a, b, u) => a + (b - a) * u;
const wrap = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);
const bez = (P0, P1, P2, u) => P0.map((v, i) => (1 - u) * (1 - u) * v + 2 * (1 - u) * u * P1[i] + u * u * P2[i]);
const length3 = (lines) => lines.reduce((s, { pts, closed = false }) => { let L = 0; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0)); } return s + L; }, 0);
const at = (xs, ys, x) => { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1])); return ys[ys.length - 1]; };
/** Groups of 3D polylines → exactly n points; a group with `count` gets that many, the rest share by length. */
function sampleTagged(groups, n) {
  const fixed = groups.reduce((s, g) => s + (g.count ?? 0), 0), free = groups.filter((g) => g.count == null);
  const counts = share(n - fixed, free.map((g) => length3(g.lines) * (g.w ?? 1))), pts = [], tags = [];
  let f = 0;
  for (const g of groups) { const k = g.count ?? counts[f++]; for (const p of sample3d(g.lines, k)) { pts.push(p); tags.push(g.tag); } }
  return { pts, tags };
}
// a drone under the water surface glows faintly: the audience reads it as the body below the waves
const underwater = (y, surface) => 0.1 + 0.9 * smooth(1 - (surface - y) / 0.14);

// ---------- Kolibri ----------
// Profile facing right, the body tilted head-up like a hovering hummingbird. Body = an axis with a radius profile:
// in 2D its two side lines, in 3D also the top lines and two hoops (a skeleton, not a filled cloud).
const HEAD = [0.42, 0.3], HEAD_R = 0.14, SH = [0.1, 0.14], AX0 = [-0.42, -0.42], AX1 = [0.36, 0.26];
const BODY_R = [[0, 0.2, 0.45, 0.7, 0.9, 1], [0.035, 0.12, 0.175, 0.155, 0.12, 0.1]];
const AXL = Math.hypot(AX1[0] - AX0[0], AX1[1] - AX0[1]), AD = [(AX1[0] - AX0[0]) / AXL, (AX1[1] - AX0[1]) / AXL], AN = [-AD[1], AD[0]];
const axisAt = (s) => [AX0[0] + (AX1[0] - AX0[0]) * s, AX0[1] + (AX1[1] - AX0[1]) * s];
const WING = [[0, 0.06], [0.25, 0.12], [0.55, 0.12], [0.82, 0.07], [1, 0], [0.86, -0.06], [0.6, -0.13], [0.32, -0.17], [0.1, -0.14], [0, -0.06]];
const WING_L = 0.95;
/** A wing at angle theta in the picture plane, then turned out of it by beta about the shoulder (the beat axis). */
const wing = (theta, side = 0, beta = 0) => {
  const sd = [Math.cos(theta), Math.sin(theta)], cd = [Math.sin(theta), -Math.cos(theta)], z0 = side * 0.05;
  return { pts: WING.map(([s, c]) => { const x = SH[0] + WING_L * (s * sd[0] + c * cd[0]), y = WING_L * (s * sd[1] + c * cd[1]); return [x, SH[1] + y * Math.cos(side * beta), z0 + y * Math.sin(side * beta)]; }), closed: true };
};
function hummingbird(n, wings, solid) {
  const S = 22, side = (k) => ({ pts: Array.from({ length: S + 1 }, (_, i) => { const s = i / S, c = axisAt(s), r = at(...BODY_R, s); return [c[0] + k * r * AN[0], c[1] + k * r * AN[1], 0]; }) });
  const top = (k) => ({ pts: Array.from({ length: S + 1 }, (_, i) => { const s = i / S, c = axisAt(s), r = at(...BODY_R, s) * 0.85; return [c[0], c[1], k * r]; }) });
  const hoop = (s) => { const c = axisAt(s), r = at(...BODY_R, s); return { pts: Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * TAU; return [c[0] + Math.cos(a) * r * AN[0], c[1] + Math.cos(a) * r * AN[1], Math.sin(a) * r * 0.85]; }), closed: true }; };
  const ring = (f) => ({ pts: Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU; return f(Math.cos(a) * HEAD_R, Math.sin(a) * HEAD_R); }), closed: true });
  const fan = solid ? [-0.14, 0, 0.14] : [0, 0, 0];
  const tail = { pts: [[-0.38, -0.38, 0], [-0.82, -0.62, fan[0]], [-0.68, -0.68, fan[0] * 0.5], [-0.76, -0.86, fan[1]], [-0.6, -0.76, fan[2] * 0.5], [-0.54, -0.95, fan[2]], [-0.44, -0.5, 0]] };
  const groups = [
    { tag: "body", lines: solid ? [side(1), side(-1), top(1), top(-1), hoop(0.35), hoop(0.68)] : [side(1), side(-1)] },
    { tag: "head", lines: solid ? [ring((a, b) => [HEAD[0] + a, HEAD[1] + b, 0]), ring((a, b) => [HEAD[0] + a * 0.3, HEAD[1] + b, a])] : [ring((a, b) => [HEAD[0] + a, HEAD[1] + b, 0])] },
    { tag: "beak", w: 1.5, lines: [{ pts: [[0.55, 0.27, 0], [0.8, 0.225, 0], [1.1, 0.14, 0]] }] },
    { tag: "tail", lines: [tail] },
    ...(solid ? [-1, 1] : [0]).map((z) => ({ tag: "eye", count: 1, lines: [{ pts: [[0.47, 0.34, z * 0.11], [0.47, 0.34, z * 0.11]] }] })),
    ...wings.map((w) => ({ tag: w.tag, lines: [wing(w.theta, w.side, w.beta)] })),
  ];
  const { pts, tags } = sampleTagged(groups, n);
  // span fraction of every wing drone: the light whirrs strongest at the tips
  const span = pts.map((p, j) => (tags[j].startsWith("wing") ? Math.min(1, Math.hypot(p[0] - SH[0], p[1] - SH[1], p[2]) / WING_L) : 0));
  return { pts, tags, span };
}
const birdColour = (p, tag, u) => {
  if (tag === "beak") return GOLD;
  if (tag === "eye") return DIAMOND;
  if (tag === "tail") return mix(VIOLET, BLUE, 0.35);
  if (tag.startsWith("wing")) return mix(CYAN, VIOLET, u * 1.1);
  const s = ((p[0] - AX0[0]) * AD[0] + (p[1] - AX0[1]) * AD[1]) / AXL, breast = (p[0] - AX0[0]) * AN[0] + (p[1] - AX0[1]) * AN[1] < 0;
  if (tag === "body" && breast && s > 0.66 && Math.abs(p[2]) < 0.06) return PINK; // the gorget: a ruby throat
  return mix(GREEN, CYAN, tag === "head" ? 0.15 : 0.55 - s * 0.4);
};
const paintBird = ({ pts, tags, span }) => pts.map((p, j) => [p[0], p[1], p[2], ...birdColour(p, tags[j], span[j])]);
// The wing beat: a slow sine (period 2 s, ±26°) is what drones can fly; the light makes it look fast.
const FLAP = 2, BEAT = 0.45, BETA0 = 0.5;
const flapAngle = (t) => BEAT * Math.sin((t * TAU) / FLAP);
const whirr = (u, t, side) => 0.8 + 0.65 * u * (0.5 + 0.5 * Math.sin(TAU * 2.4 * t - 5 * u + side * 1.4));
const wingSide = (tag) => (tag === "wingR" ? 1 : tag === "wingL" ? -1 : 0);

// ---------- Delfin ----------
// A straight dolphin (snout at +x) described by top, belly and width profiles; a leap bends it along a curve.
const DX = [-0.92, -0.7, -0.4, -0.1, 0.2, 0.45, 0.62, 0.74, 0.84, 1.0];
const DTOP = [0.03, 0.06, 0.13, 0.19, 0.21, 0.19, 0.15, 0.09, 0.045, 0.015];
const DBOT = [-0.03, -0.05, -0.1, -0.15, -0.17, -0.15, -0.11, -0.07, -0.035, -0.012];
const DW = [0.02, 0.04, 0.09, 0.13, 0.14, 0.12, 0.09, 0.05, 0.03, 0.01];
const DIM = 26, dxs = Array.from({ length: DIM + 1 }, (_, i) => -0.92 + (1.92 * i) / DIM);
function dolphin(n, solid) {
  const mid = (x) => (at(DX, DTOP, x) + at(DX, DBOT, x)) / 2;
  const fin = { pts: [[0.12, 0.2], [0.0, 0.3], [-0.14, 0.42], [-0.24, 0.48], [-0.22, 0.4], [-0.2, 0.28], [-0.3, 0.16]].map(([x, y]) => [x, y, 0]) };
  const lines = [{ pts: dxs.map((x) => [x, at(DX, DTOP, x), 0]) }, { pts: dxs.map((x) => [x, at(DX, DBOT, x), 0]) }, fin];
  if (solid) {
    for (const k of [-1, 1]) lines.push({ pts: dxs.map((x) => [x, mid(x), k * at(DX, DW, x)]) });
    for (const x of [-0.45, 0.15, 0.58]) { const h = (at(DX, DTOP, x) - at(DX, DBOT, x)) / 2, w = at(DX, DW, x); lines.push({ pts: Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * TAU; return [x, mid(x) + Math.cos(a) * h, Math.sin(a) * w]; }), closed: true }); }
    // flukes lie flat (as on a real dolphin), slightly raised at the tips so they read from the side too
    for (const k of [-1, 1]) lines.push({ pts: [[-0.9, 0, 0], [-1.02, 0.03, k * 0.12], [-1.16, 0.09, k * 0.3], [-1.1, 0.04, k * 0.1], [-1.04, 0, 0]] });
    for (const k of [-1, 1]) lines.push({ pts: [[0.45, -0.12, k * 0.09], [0.3, -0.28, k * 0.26], [0.24, -0.3, k * 0.28], [0.32, -0.16, k * 0.1]] });
  } else {
    lines.push({ pts: [[-0.9, 0.025], [-1.02, 0.12], [-1.16, 0.22], [-1.1, 0.08], [-1.04, 0], [-1.1, -0.08], [-1.16, -0.2], [-1.02, -0.1], [-0.9, -0.025]].map(([x, y]) => [x, y, 0]) });
    lines.push({ pts: [[0.45, -0.13, 0], [0.3, -0.3, 0], [0.24, -0.33, 0], [0.32, -0.17, 0]] });
  }
  const eyes = solid ? [-1, 1] : [0];
  const { pts } = sampleTagged([{ tag: "body", lines }, ...eyes.map((z) => ({ tag: "eye", count: 1, lines: [{ pts: [[0.68, 0.035, z * 0.085], [0.68, 0.035, z * 0.085]] }] }))], n);
  return pts;
}
const dolphinColour = (p) => (Math.abs(p[0] - 0.68) < 0.01 && Math.abs(p[1] - 0.035) < 0.01 ? DIAMOND : mix(CYAN, BLUE, (0.95 - p[0]) / 2.2));
/** The dolphin bent along a circle (centre c, radius R): body angle phi from the top, dir +1 swims right, −1 left. */
const onCircle = (p, c, R, phi, dir, out) => { const a = phi + p[0] / R, r = R + p[1]; out[0] = c[0] + dir * r * Math.sin(a); out[1] = c[1] + r * Math.cos(a); out[2] = (c[2] ?? 0) + p[2]; return out; };
/** A polyline as an arc-length curve: position and unit tangent at length s. */
function curve(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const len = cum[cum.length - 1];
  return { len, at(s) {
    s = Math.max(0, Math.min(len, s)); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const a = points[i - 1], b = points[i], u = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), L = cum[i] - cum[i - 1] || 1;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (b[0] - a[0]) / L, (b[1] - a[1]) / L];
  } };
}
/** The dolphin laid along a curve from tail to snout, its back on the side `back` (+1 = right of the direction). */
const onCurve = (p, cv, s0, back, mirror, out) => { const [x, y, tx, ty] = cv.at(s0 + p[0]); out[0] = mirror * (x + back * ty * p[1]); out[1] = y - back * tx * p[1]; out[2] = p[2]; return out; };

function sea(rows, perRow, surface, half = 1.8) {
  return rows.flatMap((z, r) => Array.from({ length: perRow }, (_, i) => { const x = -half + (2 * half * (i + 0.5)) / perRow; return [x, surface - 0.12 * z + 0.035 * Math.sin(2.4 * x + r * 1.7), z]; }));
}
const waveLive = (b, t, o, amp = 0.03) => { o[1] += amp * Math.sin(2.4 * b[0] - 1.3 * t + b[2] * 2.1); };

export const builders = {
  // ---- Kolibri ----
  hummingbird2d: (n, caption) => {
    // two wing poses drawn at once; their light alternates quickly, so the wing seems to whirr (drones stand still)
    const bird = hummingbird(n, [{ tag: "wingA", theta: (100 * Math.PI) / 180 }, { tag: "wingB", theta: (146 * Math.PI) / 180 }], false);
    return { beats: [{ pts: paintBird(bird), caption, live: (b, j, t, o) => {
      const tag = bird.tags[j], w = 0.5 + 0.5 * Math.sin(TAU * 2.2 * t);
      if (tag === "wingA") o[3] = 0.25 + 1.15 * w;
      else if (tag === "wingB") o[3] = 0.25 + 1.15 * (1 - w);
      else if (tag === "beak") o[3] = glint(b[0], t, 3, 0.4, 0.4, 1.2);
      else o[3] = breathe(t, 3.2);
    } }] };
  },
  hummingbird3d: (n, caption) => {
    const bird = hummingbird(n, [-1, 1].map((side) => ({ tag: side > 0 ? "wingR" : "wingL", theta: (104 * Math.PI) / 180, side, beta: BETA0 })), true);
    return { beats: [{ pts: paintBird(bird), caption, live: (b, j, t, o) => {
      const side = wingSide(bird.tags[j]);
      if (side) { pitch(o, side * flapAngle(t), SH[1], side * 0.05); o[3] = whirr(bird.span[j], t, side); }
      o[1] += 0.035 * Math.sin((t * TAU) / 3.4); // hovering: a gentle up and down
      yaw(o, -0.5 + 0.18 * Math.sin((t * TAU) / 12), 0.2, 0);
    } }] };
  },
  hummingbirdStory: (n) => {
    // Anflug → Schweben vor der Blüte → Trinken, die Blüte leuchtet → Aufsteigen mit Lichtspur, die Knospen blühen.
    // The bird is one rigid part in every act; the trail drones are the light trail of both flights and the pollen
    // around the blossom in between; the trail drones stand still and light up as the bird passes (a light trail).
    const [B, FL, BD, TR] = share(n, [140, 70, 56, 34]), [BD1, BD2] = share(BD, [1, 1]);
    const bird = hummingbird(B, [-1, 1].map((side) => ({ tag: side > 0 ? "wingR" : "wingL", theta: (104 * Math.PI) / 180, side, beta: BETA0 })), true);
    const birdCol = paintBird(bird), SB = 0.8, YAW = -0.4, BZ = -0.25;
    const pose = (j, t, O, out) => {
      const p = bird.pts[j], side = wingSide(bird.tags[j]); out[0] = p[0]; out[1] = p[1]; out[2] = p[2];
      if (side) pitch(out, side * flapAngle(t), SH[1], side * 0.05);
      yaw(out, YAW);
      out[0] = O[0] + out[0] * SB; out[1] = O[1] + out[1] * SB; out[2] = BZ + out[2] * SB;
      return out;
    };
    const tipOff = (() => { const o = [1.1, 0.14, 0]; yaw(o, YAW); return [o[0] * SB, o[1] * SB]; })();
    const F = [0.6, 0.02], FR = 0.34, B1 = [1.26, -0.4], B2 = [0.12, -0.62];
    const origin = (tip) => [tip[0] - tipOff[0], tip[1] - tipOff[1]];
    const O2 = origin([F[0] - 0.5, F[1] + 0.04]), O3 = origin([F[0] - 0.02, F[1] + 0.01]);
    const IN = [[O2[0] - 0.95, O2[1] + 0.58], [O2[0] - 0.6, O2[1] - 0.12], O2], UP = [O3, [O3[0] - 0.6, O3[1] + 0.04], [O3[0] - 0.42, O3[1] + 0.62]];
    const T1 = 3.4, T4 = 3.2;
    const birdAt = (O) => bird.pts.map((p, j) => [...pose(j, 0, O, [0, 0, 0]), ...birdCol[j].slice(3)]);
    // a blossom: petals as loops; open 0 = a bud (petals bundled upwards), 1 = open. The same parameters in both, so
    // a bud opens by flying every drone along its own petal.
    const flower = (k, c, R, stemTo, colour) => {
      const [pe, co, st] = share(k, [6.5, 1, 2.6]), per = share(pe, [1, 1, 1, 1, 1]), spec = [];
      per.forEach((m, q) => { for (let i = 0; i < m; i++) spec.push({ q, u: (i + 0.3 + 0.4 * (q / 4)) / m }); }); // staggered, so a small bud is not two rows of dots
      for (let i = 0; i < co; i++) spec.push({ core: (i / co) * TAU });
      const stem = sample3d([{ pts: [[c[0], c[1] - R * 0.2, 0], [c[0] + (stemTo[0] - c[0]) * 0.4 + 0.06, c[1] + (stemTo[1] - c[1]) * 0.45, 0], [stemTo[0], stemTo[1], 0]] }], st);
      const place = (s, open, out) => {
        if (s.core !== undefined) { const r = R * lerp(0.08, 0.17, open); out[0] = c[0] + Math.cos(s.core) * r; out[1] = c[1] + R * 0.28 * (1 - open) + Math.sin(s.core) * r; out[2] = 0.04; return out; }
        const a = lerp(Math.PI / 2 + (s.q - 2) * 0.28, Math.PI / 2 + s.q * (TAU / 5), open), L = R * lerp(0.75, 1, open), W = R * lerp(0.3, 0.52, open);
        const px = L * Math.sin(Math.PI * s.u), py = 0.5 * W * Math.sin(TAU * s.u);
        out[0] = c[0] + px * Math.cos(a) - py * Math.sin(a); out[1] = c[1] + px * Math.sin(a) + py * Math.cos(a); out[2] = lerp((s.q - 2) * 0.03, -0.1 * R * Math.sin(Math.PI * s.u), open);
        return out;
      };
      const pts = (open) => [...spec.map((s) => [...place(s, open, [0, 0, 0]), ...(s.core !== undefined ? GOLD : colour)]), ...stem.map((p) => [...p, ...GREEN])];
      return { pts, place, spec, size: k };
    };
    const main = flower(FL, F, FR, [0.7, -1.12], PINK), bud1 = flower(BD1, B1, 0.3, [0.82, -1.12], VIOLET), bud2 = flower(BD2, B2, 0.28, [0.6, -1.12], mix(PINK, GOLD, 0.35));
    const buds = (open) => [...bud1.pts(open), ...bud2.pts(open)];
    // the trail: drones along a flight path (behind the bird), each with its place u along it
    const along = (path, k) => Array.from({ length: k }, (_, i) => { const u = (i + 0.5) / k, p = bez(...path, u); return [p[0] - 0.05, p[1] - 0.1, BZ - 0.45, ...GOLD]; });
    const trailU = (i) => (i + 0.5) / TR;
    // pollen: a loose cloud of sparks above the blossom, not a ring
    const pollen = Array.from({ length: TR }, (_, i) => { const a = Math.PI * (0.12 + 0.76 * hash(i + 2)), r = FR * (1.25 + 0.9 * hash(i)); return [F[0] + 0.1 + Math.cos(a) * r, F[1] + 0.05 + Math.sin(a) * r * 0.9, (hash(i + 4) - 0.5) * 0.5, ...GOLD]; });
    const lightTrail = (u, progress) => (progress < u ? 0.12 : 0.3 + 1.2 * Math.exp(-(progress - u) / 0.3));
    const bob = (t) => [0, 0.03 * Math.sin((t * TAU) / 3.4)];
    const parts = (O, flowerOpen, budsOpen, trail) => [part("bird", birdAt(O), { rigid: true }), part("flower", main.pts(flowerOpen)), part("buds", buds(budsOpen)), part("trail", trail)];
    const [FB, BB] = [B, B + FL];
    const flowerLive = (fl, local, open, out) => { if (local < fl.spec.length) fl.place(fl.spec[local], open, out); };
    return { beats: [
      act(parts(O2, 1, 0, along(IN, TR)), { caption: "Ein Kolibri fliegt heran", hold: T1 + 0.8, live: (b, j, t, o) => {
        const u = smooth(Math.max(0, t) / T1);
        if (j < FB) { const O = bez(...IN, u), d = bob(t); pose(j, t, [O[0] + d[0], O[1] + d[1]], o); if (wingSide(bird.tags[j])) o[3] = whirr(bird.span[j], t, wingSide(bird.tags[j])); }
        else if (j >= n - TR) o[3] = lightTrail(trailU(j - (n - TR)), u);
      } }),
      act(parts(O2, 1, 0, pollen), { caption: "er schwebt vor der Blüte", hold: 2.6, live: (b, j, t, o) => {
        if (j < FB) { const d = bob(t); pose(j, t, [O2[0] + d[0], O2[1] + d[1]], o); if (wingSide(bird.tags[j])) o[3] = whirr(bird.span[j], t, wingSide(bird.tags[j])); }
        else if (j >= n - TR) o[3] = sparkle(j, t, 0.5, 1.1);
      } }),
      act(parts(O3, 1, 0, pollen), { caption: "trinkt, die Blüte leuchtet auf", hold: 3, live: (b, j, t, o) => {
        const glow = smooth((t - 0.5) / 1.2);
        if (j < FB) { const d = bob(t); pose(j, t, [O3[0] + d[0], O3[1] + d[1] * 0.5], o); if (wingSide(bird.tags[j])) o[3] = whirr(bird.span[j], t, wingSide(bird.tags[j])); }
        else if (j < BB) { const r = Math.hypot(b[0] - F[0], b[1] - F[1]) / FR; if (r < 1.1) o[3] = 1 + 0.45 * glow + 0.4 * glow * chase(r, t, 0.5, 0.5, 0, 1); }
        else if (j >= n - TR) o[3] = sparkle(j, t, 0.6 + 0.4 * glow, 1.2 + 0.4 * glow);
      } }),
      act(parts(UP[2], 1, 1, along(UP, TR)), { caption: "…und steigt auf, die Knospen blühen", live: (b, j, t, o) => {
        const u = smooth(Math.max(0, t) / T4), open = smooth((t - 0.4) / 2.6);
        if (j < FB) { const O = bez(...UP, u), d = bob(t); pose(j, t, [O[0] + d[0], O[1] + d[1]], o); if (wingSide(bird.tags[j])) o[3] = whirr(bird.span[j], t, wingSide(bird.tags[j])); }
        else if (j < BB) o[3] = breathe(t, 2.6);
        else if (j < n - TR) { const k = j - BB; if (k < BD1) flowerLive(bud1, k, open, o); else flowerLive(bud2, k - BD1, open, o); o[3] = 0.9 + 0.4 * open; }
        else o[3] = lightTrail(trailU(j - (n - TR)), u);
      } }),
    ] };
  },

  // ---- Delfin ----
  dolphin2d: (n, caption) => {
    const [D, W1] = share(n, [64, 36]), [WA, WB] = share(W1, [3, 1.6]), C = [0, -1.0], R = 1.3;
    const body = dolphin(D, false).map((p) => [...onCircle(p, C, R, 0, 1, [0, 0, 0]), ...dolphinColour(p)]);
    const wave = (k, x0, x1, y, ph) => Array.from({ length: k }, (_, i) => { const x = x0 + ((x1 - x0) * (i + 0.5)) / k; return [x, y + 0.06 * Math.sin(2.6 * x + ph), 0, ...mix(BLUE, CYAN, 0.25)]; });
    const pts = [...body, ...wave(WA, -1.55, 1.55, -0.52, 0.4), ...wave(WB, -1.0, 1.0, -0.72, 2.2)];
    return { beats: [{ pts, caption, live: (b, j, t, o) => {
      if (j >= D) o[3] = chase(b[0], t, 0.55, 0.75, 0.55, 1.45); // light runs over the water
      else o[3] = glint(b[0], t, 4.2, 0.3, -1.3, 1.3);
    } }] };
  },
  dolphin3d: (n, caption) => {
    // One dolphin swims a vertical circle: above the surface it leaps (lit), below it returns under water (dimmed).
    // Its body is bent along the circle, so it arches like a real leap; spray at the surface is light only.
    const [D, W, S] = share(n, [130, 56, 14]), WY = -0.45, C = [0, -1.25], R = 1.6, OM = 1.2;
    const local = dolphin(D, true), phiW = Math.acos((WY - C[1]) / R), xs = R * Math.sin(phiW);
    const body = local.map((p) => [...onCircle(p, C, R, 0, 1, [0, 0, 0]), ...dolphinColour(p)]);
    const water = sea([0.5, -0.5], W / 2, WY).map((p) => [...p, ...mix(BLUE, CYAN, 0.2)]);
    const spray = Array.from({ length: S }, (_, i) => { const side = i < S / 2 ? -1 : 1, k = i % (S / 2), a = 0.45 + (2.25 * k) / (S / 2 - 1); return [side * xs + 0.17 * Math.cos(a), WY + 0.07 + 0.2 * Math.sin(a) * (0.75 + 0.25 * hash(i)), (k % 2 ? 1 : -1) * 0.08, ...DIAMOND]; });
    // a soft start, then the circle: slower over the top (the hang of a real leap), faster under water
    const phase = (t) => { const u = OM * (t <= 0 ? 0 : t < 2 ? (t * t) / 4 : t - 1); return u - 0.35 * Math.sin(u); };
    const splash = (d) => (d < 0 ? 0.12 : 0.15 + 1.45 * Math.exp(-d / 0.5));
    const fitPts = [...body, ...water, ...spray];
    return { beats: [{ pts: [...body, ...water, ...spray], fitPts, caption, live: (b, j, t, o) => {
      const ph = phase(t);
      if (j < D) { onCircle(local[j], C, R, ph, 1, o); o[3] = underwater(o[1], WY + 0.02) * glint(local[j][0], t, 3, 0.25, -1.2, 1.2); }
      else if (j < D + W) { waveLive(b, t, o); o[3] = 0.85 + 0.25 * Math.sin(2.4 * b[0] - 1.3 * t); }
      else {
        // spray where the snout breaks the surface (out on the left, back in on the right)
        const snout = ph + 1 / R, d = j - D - W < S / 2 ? wrap(snout + phiW) : wrap(snout - phiW);
        o[3] = splash(d) * sparkle(j, t, 0.85, 1.2);
      }
      yaw(o, 0.16 + 0.1 * Math.sin((t * TAU) / 12));
    } }] };
  },
  dolphinStory: (n) => {
    // Wellen → ein Delfin springt → taucht ein, Ringe ziehen über das Wasser → zwei Delfine springen aufeinander zu →
    // sie bilden ein Herz. Parts: water (two wave rows that stay), dolphin A and dolphin B (both are waves at first;
    // B is the rings in between). The leaps bend each body along its arc.
    const [WN, DA, DB] = share(n, [1, 1, 1]), WY = -0.5, R = 1.5, C = [0, -1.15], YAW = 0.3;
    const la = dolphin(DA, true), lb = dolphin(DB, true), phiW = Math.acos((WY - C[1]) / R), xe = R * Math.sin(phiW);
    const half = (k) => share(k, [1, 1]);
    const waveCol = mix(BLUE, CYAN, 0.2), asWater = (pts) => pts.map((p) => [...p, ...waveCol]);
    const rows = (zs, k) => { const [a, b] = half(k); return [...sea([zs[0]], a, WY), ...sea([zs[1]], b, WY)]; };
    const water = part("water", asWater(rows([-0.63, 0.63], WN)));
    const dol = (local, f) => local.map((p) => [...f(p), ...dolphinColour(p)]);
    const leapA = (phi) => dol(la, (p) => onCircle(p, C, R, phi, 1, [0, 0, 0]));
    // act 4: A swims left, B right, towards each other (a little apart in depth); they meet in the heart
    const CA = [0.1, C[1], 0.12], CB = [-0.1, C[1], -0.12];
    // act 5: the heart. Each dolphin lies along one half of a heart curve, tail at the point, snout at the dip.
    // The heart is scaled so that a body (x −1.16 … 1.0) covers most of a half, leaving a gap at the point and the dip.
    const unitHalf = Array.from({ length: 200 }, (_, i) => { const s = Math.PI - (Math.PI - 0.05) * (i / 199); return [16 * Math.sin(s) ** 3, 13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s) + 17]; });
    const HS = 2.5 / curve(unitHalf).len, HB = WY + 0.25, hc = curve(unitHalf.map(([x, y]) => [x * HS, y * HS + HB])), hs0 = 0.12 + 1.16;
    const heartA = dol(la, (p) => onCurve(p, hc, hs0, 1, 1, [0, 0, 0])), heartB = dol(lb, (p) => onCurve(p, hc, hs0, 1, -1, [0, 0, 0]));
    const ringsAt = (k) => { const radii = [0.25, 0.5, 0.75], per = share(k, radii); return radii.flatMap((r, q) => Array.from({ length: per[q] }, (_, i) => { const a = (i / per[q]) * TAU; return [xe + r * Math.cos(a), WY - 0.3 * r * Math.sin(a), 0.32 * r * Math.sin(a), r]; })); };
    const rings = ringsAt(DB);
    const T2 = 4.4, T3 = 2.6, T4 = 3.8;
    const lit = (o, base = 1) => { o[3] = underwater(o[1], WY + 0.02) * base; };
    const turn = (o) => yaw(o, YAW);
    return { beats: [
      act([water, part("a", asWater(rows([0.21, 1.05], DA))), part("b", asWater(rows([-0.21, -1.05], DB)))], { caption: "Wellen", hold: 2.4, live: (b, j, t, o) => {
        waveLive(b, t, o, 0.04); o[3] = chase(b[0] + b[2] * 0.3, t, 0.5, 0.9, 0.6, 1.35); turn(o);
      } }),
      act([water, part("a", leapA(0.95)), part("b", asWater(rows([-1.05, 1.05], DB)))], { caption: "ein Delfin springt", hold: T2 + 0.3, minFlight: 2.6, live: (b, j, t, o) => {
        if (j >= WN && j < WN + DA) { onCircle(la[j - WN], C, R, lerp(-2.2, 0.95, smooth(t / T2)), 1, o); lit(o); }
        else { waveLive(b, t, o); o[3] = 0.85 + 0.25 * Math.sin(2.4 * b[0] - 1.3 * t); }
        turn(o);
      } }),
      act([water, part("a", leapA(2.5), { offstage: true }), part("b", rings.map(([x, y, z]) => [x, y, z, ...mix(CYAN, DIAMOND, 0.3)]))], { caption: "taucht ein, Ringe ziehen über das Wasser", hold: T3 + 0.8, live: (b, j, t, o) => {
        if (j >= WN && j < WN + DA) { onCircle(la[j - WN], C, R, lerp(0.95, 2.5, smooth(t / T3)), 1, o); lit(o); }
        else if (j >= WN + DA) {
          // the rings widen slowly, a ripple of light runs outward
          const r0 = rings[j - WN - DA][3], k = lerp(0.6, 1, smooth(t / 3.2));
          o[0] = xe + (b[0] - xe) * k; o[1] = WY + (b[1] - WY) * k; o[2] = b[2] * k; o[3] = chase(r0 * k, t, 0.22, 0.5, 0.45, 1.5);
        } else { waveLive(b, t, o); o[3] = 0.85 + 0.25 * Math.sin(2.4 * b[0] - 1.3 * t); }
        turn(o);
      } }),
      act([water, part("a", dol(la, (p) => onCircle(p, CA, R, -0.55, -1, [0, 0, 0]))), part("b", dol(lb, (p) => onCircle(p, CB, R, -0.55, 1, [0, 0, 0])))], { caption: "zwei Delfine springen aufeinander zu", hold: T4 + 0.4, live: (b, j, t, o) => {
        const phi = lerp(-2.25, -0.55, smooth(t / T4));
        if (j >= WN && j < WN + DA) { onCircle(la[j - WN], CA, R, phi, -1, o); lit(o); }
        else if (j >= WN + DA) { onCircle(lb[j - WN - DA], CB, R, phi, 1, o); lit(o); }
        else { waveLive(b, t, o); o[3] = 0.85 + 0.25 * Math.sin(2.4 * b[0] - 1.3 * t); }
        turn(o);
      } }),
      act([water, part("a", heartA), part("b", heartB)], { caption: "…und bilden ein Herz", live: (b, j, t, o) => {
        if (j < WN) { waveLive(b, t, o); o[3] = chase(b[0], t, 0.5, 0.9, 0.6, 1.3); }
        else { o[1] += 0.03 * Math.sin((t * TAU) / 3.6); o[3] = glint(b[1], t, 3.6, 0.4, WY, HB + 1.6); }
        yaw(o, 0.14 * Math.cos((t * TAU) / 14));
      } }),
    ] };
  },
};
