// Winter & Silvester (eleventh version): firework made of light, the snowflake and the tree of lights.
// Firework after FlyingStars' own (round 2, Frühlingsnacht 2:10–2:25, S3fuZRsYIvc): stars of straight drone chains,
// one colour per star, full within a blink, standing for seconds, several overlapping with staggered starts; the
// drones barely move, the burst is light. Tree after the spiral tree (FSR-018): a conical helix, light climbing it.
import { TAU, GOLD, PINK, VIOLET, CYAN, ORANGE, GREEN, DIAMOND, mix, paint, frac, smooth, hash, yaw, roll, sparkle, chase, trace, loosen, share, part, act } from "../show-motion.js";

export const builders = {};
const EMBER = [178, 52, 34]; // a cooling spark: what the tips of a star turn into as it glows out

// ---------- firework ----------
/**
 * One firework star: straight chains of drones from a loose core, the drones spreading outward along each chain
 * (the Frühlingsnacht stars have ~8 rays of 4–7 drones). dirs: unit vectors for a star in every direction (3D);
 * otherwise `rays` rays in the picture plane. Every drone keeps { r, ray, dir, c, R } for light and gravity.
 */
function fireStar(k, { c = [0, 0, 0], R = 0.5, rays = 8, turn = 0, dirs = null, ...rest } = {}) {
  const D = dirs ?? Array.from({ length: rays }, (_, q) => { const a = turn + (q / rays) * TAU; return [Math.cos(a), Math.sin(a), 0]; });
  const per = share(k, D.map(() => 1)), out = [];
  // the first drone of a ray sits a third out: a loose core, no clump in the middle
  D.forEach((dir, q) => { for (let i = 0; i < per[q]; i++) out.push({ r: per[q] === 1 ? 1 : 0.3 + 0.7 * (i / (per[q] - 1)) ** 1.15, ray: q, dir, c, R, ...rest }); });
  return out;
}
const starPos = (d) => d.c.map((v, a) => v + d.dir[a] * d.r * d.R);
/** Directions spread over a sphere (golden angle): the rays of a star that bursts in every direction. */
const sphereDirs = (m) => Array.from({ length: m }, (_, i) => { const y = 1 - ((i + 0.5) / m) * 2, s = Math.sqrt(1 - y * y), a = i * 2.39996 + 0.4; return [Math.cos(a) * s, y, Math.sin(a) * s]; });

/**
 * The light of one star, s seconds after its ignition (Frühlingsnacht 2:12 at 30 fps): a faint glimmer just before,
 * then full light within a blink; a short front may run out along the rays. A white-gold flash settles into the
 * star's colour, the rays waver a little while it stands, then it glows out from the core, the tips last, crackling.
 */
function starGlow(d, s, { front = 0.1, stand = 2.4, out = 1.0, flash = 0.6, off = 0.05 } = {}) {
  if (s < -0.4) return off;
  const at = s - front * d.r;
  if (at < 0) return off + 0.16 * smooth((s + 0.4) / 0.4);
  const lit = (1 + flash * Math.exp(-at / 0.35)) * (1 + 0.07 * Math.sin(at * 5 + d.ray * 2.3));
  if (at < stand) return lit;
  const e = Math.exp(-(at - stand) / (out * (0.4 + 0.8 * d.r)));
  return off + (lit - off) * e * (1 + 0.35 * (1 - e) * Math.sin(at * (8 + 7 * hash(d.ray * 7.3 + d.r * 13))));
}
/** Seconds since the star last ignited, for a star repeating every P seconds; the glimmer before counts as negative. */
const cycle = (t, P, delay) => P * frac((t - delay + 0.4) / P) - 0.4;
/** The tips sink a little while the star glows out (gravity), and rise back in the dark before the next burst. */
const droop = (d, s, stand, P) => (s < 0 ? 0 : -0.1 * d.r * d.r * d.R * smooth((s - stand) / 1.8) * (1 - smooth((s - (P - 1.4)) / 0.9)));
/** A star's colour with the cooling built in: a gold-white core, the star colour, tips going ember red. */
const cooling = (d) => mix(mix(d.col, GOLD, 0.35 * (1 - d.r)), EMBER, 0.5 * smooth((d.r - 0.55) / 0.45));

builders.fireworkSpark = (n, caption) => {
  // three places in turn, one colour each; always two of them glowing, the third resting
  const P = 4.2, specs = [[[-0.62, 0.2, 0], 0.62, GOLD, 0, 0.2], [[0.6, 0.38, 0], 0.55, CYAN, 1.4, 0], [[0.02, -0.5, 0], 0.5, PINK, 2.8, 0.35]];
  const counts = share(n, specs.map((q) => q[1])), drones = specs.flatMap(([c, R, col, delay, turn], q) => fireStar(counts[q], { c, R, rays: 8, turn, col, delay }));
  return { beats: [{ pts: paint(drones.map(starPos), (p, j) => drones[j].col), caption, shimmer: false, live: (b, j, t, o) => {
    const d = drones[j]; o[3] = starGlow(d, cycle(t, P, d.delay), { front: 0.06, stand: 2.2, out: 0.8, flash: 0.35, off: 0.06 });
  } }] };
};

builders.fireworkHorizon = (n, caption) => {
  // stars of different size and colour bloom one after the other and overlap; a quick front runs out along the rays,
  // the flash cools into the star's colour, the tips sink a little and glow out in ember red
  const P = 5.2, specs = [
    [[-0.5, 0.22, 0], 0.66, GOLD, 9, 0], [[0.12, -0.5, 0.1], 0.46, PINK, 8, 0.6], [[0.66, 0.42, -0.1], 0.52, CYAN, 8, 1.3],
    [[1.05, -0.42, 0], 0.32, ORANGE, 7, 2.1], [[-1.0, -0.5, 0], 0.32, VIOLET, 7, 2.7], [[0.02, 0.95, -0.2], 0.3, GOLD, 7, 3.4],
  ];
  const counts = share(n, specs.map((q) => q[1])), drones = specs.flatMap(([c, R, col, rays, delay], q) => fireStar(counts[q], { c, R, rays, turn: q * 0.4, col, delay }));
  return { beats: [{ pts: paint(drones.map(starPos), (p, j) => cooling(drones[j])), caption, shimmer: false, live: (b, j, t, o) => {
    const d = drones[j], s = cycle(t, P, d.delay);
    o[3] = starGlow(d, s, { front: 0.28, stand: 2.0, out: 1.1, flash: 0.75 });
    o[1] += droop(d, s, 2.0 + 0.28 * d.r, P);
  } }] };
};

builders.fireworkStory = (n, caption) => {
  // Leuchtspur → a star bursting in every direction → stars in waves, the front ones larger → all at once → Goldregen.
  // Parts: the trail (rising column, later a small star of its own), the big star, the wave stars. The stars stand
  // where they burst from the first act on; acts change their light, only the Goldregen moves the drones.
  const TR = 36, BG = 112, WV = n - TR - BG;
  const BIG = { c: [0, 0.3, 0], R: 0.78 };
  const column = Array.from({ length: TR }, (_, i) => ({ u: (i + 0.5) / TR, p: [0.012 * Math.sin(i * 1.7), -1.2 + (1.42 * (i + 0.5)) / TR, 0] }));
  const tStar = fireStar(TR, { c: [-0.42, -0.86, -0.6], R: 0.26, rays: 9, col: GOLD, delay: 2.0 });
  const big = fireStar(BG, { ...BIG, dirs: sphereDirs(14), col: GOLD });
  // front row near the audience and larger, back row further away and smaller: depth from size and distance
  const WAVES = [
    [[-0.92, -0.18, 0.5], 0.46, PINK, 0.3], [[0.92, 0.02, 0.5], 0.46, CYAN, 0.9], [[0.36, -0.8, 0.5], 0.38, ORANGE, 1.5],
    [[-0.58, 0.98, -0.6], 0.28, VIOLET, 1.2], [[0.58, 1.02, -0.6], 0.28, GOLD, 1.8], [[-1.38, 0.55, -0.6], 0.24, CYAN, 2.4], [[1.38, 0.6, -0.6], 0.24, PINK, 3.0],
  ];
  const wc = share(WV, WAVES.map((q) => q[1]));
  const waves = WAVES.flatMap(([c, R, col, delay], q) => fireStar(wc[q], { c, R, rays: 8, turn: q * 0.5, col, delay }));
  const stars = (list) => paint(list.map(starPos), (p, j) => list[j].col);
  const parts = (trail) => [part("trail", trail), part("big", stars(big)), part("waves", stars(waves))];
  const columnPts = paint(column.map((q) => q.p), (p, j) => mix(ORANGE, GOLD, column[j].u));
  // the big star turns a little to one side and back (it is a star in every direction), resting at the act's ends
  const turn = (o, t, hold, a = 0.7) => yaw(o, a * 0.5 * (1 - Math.cos((TAU * Math.min(Math.max(t, 0), hold)) / hold)), BIG.c[0], BIG.c[2]);
  const OFF = 0.025;
  // Goldregen: every ray bends down under its own weight, the light runs down along it
  const willow = (d) => { const r = 0.2 + 0.9 * d.r; return [d.c[0] + d.R * d.dir[0] * r, d.c[1] + d.R * (d.dir[1] * r * 0.45 + 0.1 * r - 1.25 * r * r), d.c[2] + d.R * d.dir[2] * r]; };
  const rainColour = (list) => paint(list.map(willow), (p, j) => mix(GOLD, ORANGE, list[j].r * 0.8));
  return { beats: [
    act(parts(columnPts), { caption: "Eine Leuchtspur steigt auf", hold: 2.4, live: (b, j, t, o) => {
      if (j < TR) { const h = 1.05 * smooth(t / 1.9), du = h - column[j].u; o[3] = du < 0 ? OFF + 0.6 * Math.exp(-((du / 0.03) ** 2)) : 0.25 + 1.3 * Math.exp(-du / 0.05) + 0.35 * Math.exp(-du / 0.3) * sparkle(j, t, 0.6, 1.4); }
      else if (j < TR + BG) o[3] = OFF + 0.14 * smooth((t - 1.6) / 0.6) * (1 - big[j - TR].r);
      else o[3] = OFF;
    } }),
    act(parts(columnPts), { caption: "…und blüht als Stern in alle Richtungen", hold: 3.6, live: (b, j, t, o) => {
      if (j < TR) o[3] = OFF + 0.6 * Math.exp(-t / 0.8) * column[j].u * sparkle(j, t, 0.6, 1.4);
      else if (j < TR + BG) { o[3] = starGlow(big[j - TR], t - 0.1, { front: 0.4, stand: 99, flash: 0.9 }); turn(o, t, 3.6); }
      else o[3] = OFF;
    } }),
    act(parts(stars(tStar)), { caption: "Sterne blühen in Wellen, vorn groß, hinten klein", hold: 4.6, live: (b, j, t, o) => {
      if (j < TR) o[3] = starGlow(tStar[j], t - tStar[j].delay, { front: 0.15, stand: 1.8, flash: 0.6, off: OFF });
      else if (j < TR + BG) { const d = big[j - TR], e = Math.exp(-Math.max(0, t) / (0.5 + 1.2 * d.r)); o[3] = OFF + (1 - OFF) * e * (1 + 0.35 * (1 - e) * Math.sin(t * 9 + d.ray)); }
      else { const d = waves[j - TR - BG]; o[3] = starGlow(d, t - d.delay, { front: 0.15, stand: 1.9, flash: 0.6, off: OFF }); }
    } }),
    act(parts(stars(tStar)), { caption: "Finale: alle Sterne zugleich", hold: 3, live: (b, j, t, o) => {
      const d = j < TR ? tStar[j] : j < TR + BG ? big[j - TR] : waves[j - TR - BG];
      o[3] = starGlow(d, t - 0.15 - 0.05 * hash(d.ray + (d.c[0] * 9)), { front: 0.25, stand: 99, flash: 1.0 });
      if (j >= TR && j < TR + BG) turn(o, t, 3, -0.5);
    } }),
    act([part("trail", rainColour(tStar)), part("big", rainColour(big)), part("waves", rainColour(waves))], { caption: "…und Goldregen fällt", live: (b, j, t, o) => {
      const d = j < TR ? tStar[j] : j < TR + BG ? big[j - TR] : waves[j - TR - BG];
      o[1] -= 0.16 * d.r * d.R * smooth(Math.max(0, t) / 6);
      o[3] = chase(d.r, t, 0.32, 0.5, 0.4, 1.45) * sparkle(j, t, 0.85, 1.15);
    } }),
  ].map((b) => ({ ...b, shimmer: false })) };
};

// ---------- snowflake and tree of lights ----------
/** A snowflake as a line drawing: six arms meeting in the middle, two pairs of branches leaning outward on each arm. */
function flake(n, R = 1) {
  const segs = [], hub = 0.06;
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 2 + (k * TAU) / 6, at = (r, ang = a) => [Math.cos(ang) * r * R, Math.sin(ang) * r * R];
    segs.push({ from: at(hub), to: at(1), tip: true, arm: k });
    for (const [r, len] of [[0.48, 0.3], [0.74, 0.19]]) for (const side of [-1, 1]) {
      const base = at(r), e = a + side * (TAU / 6);
      segs.push({ from: base, to: [base[0] + Math.cos(e) * len * R, base[1] + Math.sin(e) * len * R], tip: true, arm: k });
    }
  }
  // drones per line by its length; the far end of every line gets a drone, so tips are sharp
  const counts = share(n, segs.map((s) => Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]))), pts = [], meta = [];
  segs.forEach((s, q) => { for (let i = 0; i < counts[q]; i++) { const u = (i + 1) / counts[q]; pts.push([s.from[0] + (s.to[0] - s.from[0]) * u, s.from[1] + (s.to[1] - s.from[1]) * u, 0]); meta.push({ tip: s.tip && i === counts[q] - 1, arm: s.arm }); } });
  return { pts, meta };
}

/** A conical helix (the spiral tree): radius shrinking towards the top, drones evenly spread along its length. */
function helix(k, { y0 = -1, H = 1.8, R0 = 0.8, R1 = 0.05, turns = 5.5 } = {}) {
  const M = 3000, line = Array.from({ length: M + 1 }, (_, i) => { const u = i / M, r = R0 + (R1 - R0) * u, a = turns * TAU * u; return [Math.sin(a) * r, y0 + H * u, Math.cos(a) * r]; });
  const len = [0]; for (let i = 1; i <= M; i++) len.push(len[i - 1] + Math.hypot(...[0, 1, 2].map((q) => line[i][q] - line[i - 1][q])));
  const out = []; let at = 0;
  for (let i = 0; i < k; i++) { const want = ((i + 0.5) / k) * len[M]; while (len[at + 1] < want) at++; out.push(line[at]); }
  return out;
}
/** The star on the top: a five-pointed outline, in ODYSSEY with an inner second outline (double contour). */
function topStar(k, cy, s, inner = 0) {
  const outline = (sc) => { const pts = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU, r = i % 2 ? 0.45 : 1; return [Math.sin(a) * r * sc, cy + Math.cos(a) * r * sc]; }); return pts; };
  const rings = inner ? [outline(s), outline(s * 0.55)] : [outline(s)], counts = share(k, inner ? [1, 0.55] : [1]), out = [];
  rings.forEach((ring, q) => { for (let i = 0; i < counts[q]; i++) { const u = (i / counts[q]) * 10, a = ring[Math.floor(u)], b = ring[(Math.floor(u) + 1) % 10], f = u - Math.floor(u); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0]); } });
  return out;
}
const TREE = { y0: -1, H: 1.8 }, STAR_Y = TREE.y0 + TREE.H + 0.2;
/** Garland colours: green line, every third drone a gold bulb. */
const garland = (p, j) => (j % 3 === 1 ? GOLD : GREEN);
/** The tree turns about its own axis; the angular speed comes up gently from rest (no jolt when the act begins). */
const spin = (t, w = 0.35, ramp = 1.5) => { const tt = Math.max(0, t); return w * (tt < ramp ? (tt * tt) / (2 * ramp) : tt - ramp / 2); };

builders.snow2d = (n, caption) => {
  const { pts, meta } = flake(n);
  return { beats: [{ pts: paint(pts, (p, j) => (meta[j].tip ? CYAN : DIAMOND)), caption, live: (b, j, t, o) => {
    roll(o, t * 0.14);
    // light sparkles at the tips, travelling from arm to arm
    const m = meta[j];
    o[3] = m.tip ? 0.95 + 0.7 * Math.exp(-(((frac(t / 3 - m.arm / 6) - 0.5) / 0.09) ** 2)) * (0.7 + 0.3 * hash(j)) : 0.92 + 0.08 * Math.sin(t * 1.4 + j);
  } }] };
};

builders.tree3d = (n, caption) => {
  const S = Math.round(n * 0.16), L = n - S, coil = helix(L, TREE);
  return { beats: [{ pts: [...paint(coil, garland), ...paint(topStar(S, STAR_Y, 0.2), GOLD)], caption, live: (b, j, t, o) => {
    if (j < L) { yaw(o, spin(t, 0.4)); o[3] = chase(j / L, t, 0.1, 0.25, 0.72, 1.5) * (j % 3 === 1 ? 1.1 : 1); }
    else o[3] = 1 + 0.45 * Math.exp(-(((frac(t / 2.6) - 0.5) / 0.1) ** 2)) + 0.15 * sparkle(j, t, -1, 1);
  } }] };
};

builders.treeStory = (n, caption) => {
  // Schnee fällt → die Flocken sammeln sich (sparks in the shape of the tree) → light draws the spiral from the bottom
  // up → the star on the top lights up → the tree turns, the garland changes colour. Parts: lights (the helix), star.
  const S = 50, L = n - S, coil = helix(L, TREE), crown = topStar(S, STAR_Y, 0.24, 1), tree = [...coil, ...crown];
  // snow: columns of drones in depth, light falling along them (like rain in show-scenes.js, but slower and softer)
  const COLS = 18, perCol = Math.ceil(n / COLS);
  const snow = Array.from({ length: n }, (_, i) => { const c = i % COLS, k = Math.floor(i / COLS); return [-1.7 + (3.4 * c) / (COLS - 1) + 0.1 * (hash(i * 3.3) - 0.5), -0.95 + (1.95 * (k + 0.5 + 0.6 * (hash(i * 1.7) - 0.5))) / perCol + 0.12 * hash(c), Math.sin(c * 2.1) * 0.5 + 0.15 * (hash(i * 5.1) - 0.5)]; });
  const flakes = paint(snow, (p, i) => (i % 4 === 0 ? CYAN : DIAMOND));
  const cloud = paint(loosen(tree, 0.45, 1.12), (p, i) => (i % 4 === 0 ? CYAN : DIAMOND));
  const bulbs = [GOLD, PINK, CYAN];
  return { beats: [
    act([part("lights", flakes.slice(0, L)), part("star", flakes.slice(L))], { caption: "Schnee fällt", hold: 3.2, frame: "snow", live: (b, j, t, o) => {
      const c = j % COLS;
      o[1] -= 0.12 * smooth(Math.max(0, t) / 4); // the whole snowfall drifts down a little
      o[0] += 0.025 * Math.sin(t * 0.8 + c * 1.3) * smooth(Math.max(0, t) / 1.5);
      o[3] = chase(-b[1] + hash(c) * 0.6, t, 0.3, 0.55, 0.5, 1.4) * sparkle(j, t, 0.75, 1.15);
    } }),
    act([part("lights", cloud.slice(0, L)), part("star", cloud.slice(L))], { caption: "die Flocken sammeln sich", hold: 1.8, live: (b, j, t, o) => { o[3] = sparkle(j, t, 0.5, 1.35); } }),
    act([part("lights", paint(coil, garland)), part("star", paint(crown, GOLD))], { caption: "Licht zeichnet den Baum von unten nach oben", hold: 3.4, live: (b, j, t, o) => {
      o[3] = j < L ? trace(j / L, t, 3.0) : 0.15;
    } }),
    act([part("lights", paint(coil, garland)), part("star", paint(crown, GOLD))], { caption: "auf der Spitze geht ein Stern auf", hold: 2.6, live: (b, j, t, o) => {
      if (j < L) o[3] = 0.95 + 0.1 * Math.sin(t * 2 + j * 0.3);
      else { const k = j - L, u = k < 31 ? k / 31 : (k - 31) / 19; o[3] = trace(u, t, 0.9, { dim: 0.15, lit: 1.25 }) + 0.15 * sparkle(j, t, -1, 1) * smooth(t - 1); }
    } }),
    act([part("lights", paint(coil, (p, j) => (j % 2 ? GREEN : bulbs[(j >> 1) % 3]))), part("star", paint(crown, GOLD))], { caption: "…der Baum dreht sich, die Lichterkette wechselt die Farbe", live: (b, j, t, o) => {
      if (j < L) {
        yaw(o, spin(t, 0.35));
        // the bulbs light in turn, colour after colour, while the green line glows calmly
        o[3] = j % 2 ? 0.7 : 0.3 + 1.2 * Math.max(0, Math.cos(TAU * (t / 2.7 - ((j >> 1) % 3) / 3))) ** 2;
      } else o[3] = 1.05 + 0.4 * Math.exp(-(((frac(t / 2.6) - 0.5) / 0.1) ** 2)) + 0.12 * sparkle(j, t, -1, 1);
    } }),
  ] };
};

