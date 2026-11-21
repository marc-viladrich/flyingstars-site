import { t as message } from '../../i18n/ui.mjs';
// jubilaeum motifs of the eleventh version (see src/content/show-configurator.js for the build names).
// Fußball and Kopfsprung, after FlyingStars' sports pictures in Eisenhüttenstadt (round 2: a stick figure with a ball
// that drifts up, a diver over rows of water with a light running through them), as own figures: the footballer is a
// body with joints from catalog-3d/sport.js (Runde 9), the diver a rigid body that turns along its arc.
import { sampleOutline, circle } from "../show-geometry.js";
import { textFormationAsync } from "../text-formation.js";
import { schuss, schuss2d, springer, pose as fussPose, fussball3d, GROUND as FOOT_GROUND, VIEW } from "./catalog-3d/sport.js";
import { TAU, WARM, GOLD, CYAN, BLUE, mix, paint, smooth, hash, sway, glint, sparkle, chase, burstLight, share, part, act, drift } from "../show-motion.js";

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
const bez = (P0, P1, P2, s) => P0.map((v, i) => (1 - s) ** 2 * v + 2 * (1 - s) * s * P1[i] + s * s * P2[i]);
/** The number of the jubilee in FlyingStars' own lettering, centred on (cx, cy); unused drones underline it. */
async function number(value, k, halfWidth, cx, cy, z = 0) {
  const r = await textFormationAsync(value, k); // vorberechnet sofort, sonst im Worker (Runde 6)
  const pts = r ? r.pts.slice(0, k) : [];
  if (!pts.length) return sample([circle(cx, cy, halfWidth * 0.7, 80)], k).map(([x, y]) => [x, y, z]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), s = (halfWidth * 2) / (Math.max(...xs) - Math.min(...xs)), my = (Math.max(...ys) + Math.min(...ys)) / 2, mx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const out = pts.map(([x, y]) => [(x - mx) * s + cx, (y - my) * s + cy, z]), bottom = Math.min(...out.map((p) => p[1]));
  return out.concat(sample([line([cx - halfWidth * 0.8, bottom - 0.12], [cx + halfWidth * 0.8, bottom - 0.12])], k - out.length).map(([x, y]) => [x, y, z]));
}
const NUMBER = "25";

// ---------- Fußball ----------
// Runde 9 (Marc, 19.11.2026: „crazy, wie schlecht im Vergleich dann dieser Fußballer ist“): Spieler und Ball sind
// Körper nach der Methode der Katalogfiguren (catalog-3d/sport.js, docs/katalog-3d.md). Die alte Strichfigur (rig aus
// Einzellinien, flacher Ball, der durch das Bein flog) ist ersetzt. SPARK: Doppelkontur im Durchschwung, der Ball steigt
// und bremst (Referenz Eisenhüttenstadt); HORIZON: der ganze Schuss aus der Anlaufstellung; ODYSSEY: Schuss ins Tor.
function kick2d(n, caption) {
  return { beats: [{ ...schuss2d(n), caption }] };
}

function kickHorizon(n, caption) {
  return { beats: [{ ...schuss(n), caption }] };
}

async function kickStory(n) {
  // Ein Spieler mit Ball (aus der lebendigen Wolke) → Schuss, der Ball fliegt mit Lichtspur ins Tor → Tor! → der Ball
  // wird zur Zahl. Das Tor steht von Anfang an als Linie (gedimmt). Der Spieler trägt den größten Teil der Drohnen (als
  // Körper braucht er sie), höchstens 320; die übrigen teilen sich Ball, Spur, Netz und Rahmen.
  const PN = Math.min(320, Math.round(n * 0.46)), [BN, TN, NN, FN] = share(n - PN, [36, 40, 50, 40]), PX = -1.25, R = 0.13;
  const GX0 = 0.0, GX1 = 1.55, GT = -0.12, BK = -0.5, BT = -0.32, BX0 = 0.15, BX1 = 1.4, GROUND = FOOT_GROUND;
  const G1 = [0.85, -0.55, -0.38], K = [-0.35, 0.95, -0.1];
  // der Schuss: dieselbe Figur wie in HORIZON, der Blick steht (die Geschichte schwenkt als Ganzes), der Ball fliegt ins Tor
  const kick = schuss(PN + BN, { ballDrones: BN, R, view: { ...VIEW, amp: 0 }, target: [G1[0] - PX, G1[1], G1[2]], lift: 0.28, flight: { rise: 0.24, x: 0.75, y: 0.75 } });
  const at = (pts) => shift(pts, PX), rest = at(kick.pts), restPlayer = rest.slice(0, PN), restBall = rest.slice(PN);
  const cheer = at(fussPose(PN, 'jubel'));
  const kickLive = (j, t, o) => { kick.live(null, j, t, o); o[0] += PX; };
  // the goal, its mouth towards the audience; the net goes back in depth
  const frame = sample([line([GX0, GROUND], [GX0, GT], [GX1, GT], [GX1, GROUND])], FN);
  const netLines = [line([BX0, GROUND, BK], [BX0, BT, BK], [BX1, BT, BK], [BX1, GROUND, BK]), line([GX0, GT, 0], [BX0, BT, BK]), line([GX1, GT, 0], [BX1, BT, BK]),
    ...[0.25, 0.5, 0.75].flatMap((u) => { const x = BX0 + (BX1 - BX0) * u; return [line([x, BT, BK], [x, GROUND, BK]), line([GX0 + (GX1 - GX0) * u, GT, 0], [x, BT, BK])]; }), line([BX0, (BT + GROUND) / 2, BK], [BX1, (BT + GROUND) / 2, BK])];
  // the net in 3D: sample the lines in x-y, then give every point the depth of its line at that place
  const net = sample3(netLines, NN);
  // die Lichtspur steht entlang der wirklichen Ballbahn und leuchtet hinter dem Ball auf
  const uOf = (k) => 0.06 + 0.88 * (k + 0.5) / TN, bahn = (u) => { const c = kick.ballSeen(kick.kickAt + kick.timeFor(u)); return [c[0] + PX, c[1], c[2]]; };
  const trail = Array.from({ length: TN }, (_, k) => { const [x, y, z] = bahn(uOf(k)); return [x, y + (k % 2 ? 0.025 : -0.025), z - 0.12]; });
  const RAYS = 9, burst = Array.from({ length: TN }, (_, k) => { const a = ((k % RAYS) / RAYS) * TAU + 0.2, u = Math.floor(k / RAYS) / Math.max(1, Math.ceil(TN / RAYS) - 1); return [0.78 + Math.cos(a) * (0.2 + 0.4 * u), 0.45 + Math.sin(a) * (0.2 + 0.4 * u), (hash(k) - 0.5) * 0.2]; });
  const stars = Array.from({ length: TN }, (_, k) => [-1.5 + 3.2 * hash(k * 2.3 + 1), -0.2 + 1.1 * hash(k * 4.1 + 2), (hash(k * 7.7) - 0.5) * 0.6]);
  const num = await number(NUMBER, BN + TN, 0.48, 0.78, 0.45, 0.1);
  const twinkle = (j, t, o) => { o[3] = sparkle(j, t, 0.5, 1.2); drift(o, j, t, 0.03); }; // vierzehnte Fassung: die Sterne treiben sanft
  const goal = (netPts = net, framePts = frame) => [part("net", paint(netPts, mix(WARM, CYAN, 0.25))), part("frame", paint(framePts, WARM))];
  const inGoal = shift(fussball3d(BN, R * 0.8).pts, ...G1).map((p) => [p[0], p[1], p[2]]);
  const T0 = PN, T1 = PN + BN, T2 = T1 + TN; // index ranges: player | ball | trail | net | frame
  const landed = kick.kickAt + kick.timeFor(0.97);
  return { beats: [
    act([part("player", restPlayer), part("ball", restBall), part("trail", paint(stars, GOLD)), ...goal()], { caption: message('jubilaeum.aPlayerAndHisGoal'), hold: 1.8, cloud: true, live: (b, j, t, o) => {
      if (j >= T1 && j < T2) twinkle(j, t, o); else if (j >= T2) o[3] = 0.45;
      sway(o, t, 0.15);
    } }),
    act([part("player", restPlayer), part("ball", restBall), part("trail", paint(trail, GOLD)), ...goal()], { caption: message('jubilaeum.heShoots'), hold: Math.max(4.4, landed + 0.6), live: (b, j, t, o) => {
      if (j < T1) kickLive(j, t, o);
      else if (j < T2) { const d = kick.progress(t) - uOf(j - T1); o[3] = d < 0 ? 0.06 : 0.35 + 1.2 * Math.exp(-d / 0.12); } // the light trail follows the ball
      else if (j < T2 + NN && t > landed) o[3] = 1 + 0.6 * Math.exp(-(t - landed) / 0.4); // the net catches the ball
    } }),
    act([part("player", cheer), part("ball", paint(inGoal, GOLD)), part("trail", paint(burst, GOLD)), ...goal()], { caption: message('jubilaeum.goal'), hold: 2.6, live: (b, j, t, o) => {
      if (j >= T1 && j < T2) o[3] = burstLight(Math.hypot(b[0] - 0.78, b[1] - 0.45) / 0.6, t, 2.6)[0];
      else if (j >= T2 && j < T2 + NN) o[3] = chase(Math.hypot(b[0] - G1[0], b[1] - G1[1]), -t, 0.5, 0.6, 0.8, 1.7); // the net glows outward from the ball
      else if (j >= T0 && j < T1) o[3] = sparkle(j, t, 1, 1.5);
      sway(o, t, 0.15);
    } }),
    act([part("player", cheer), part("number", paint(num, GOLD)), ...goal()], { caption: message('jubilaeum.andTheBallBecomesYourNumber'), live: (b, j, t, o) => {
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
// Runde 9b (Marc: „gleiche Klasse, gleiche Bauweise“): der Springer ist ein Körper aus catalog-3d/sport.js (springer),
// kein Strichfiguren-Rig mehr. Er nimmt dieselben Gelenkwinkel wie die alte Figur: torso und arms negativ = zum Bauch,
// thigh positiv = Knie nach vorn, shin negativ = Unterschenkel zurück, foot FLAT = Fuß steht flach auf dem Brett. Bahn,
// Takt und Wasser bleiben, wie sie waren.
const FLAT = Math.PI / 2, STRAIGHT = { torso: 0, arms: 0, thigh: 0, shin: 0, foot: 0 };
/** Farben des Körpers (Badehose), auch wenn die Punkte eines Bildes neu gestellt sind. */
const skin = (sp) => (p, i) => sp.pts[i].slice(3);
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


function diveHorizon(n, caption) {
  const [dv, w] = share(n, [1.5, 1]), WY = -0.55, P = 7.7, S = 1.15, ROWS = [-0.45, -0.15, 0.15, 0.45];
  const water = waterRows(w, ROWS, -1.4, 1.4, WY);
  // the arc of the dive (path of the hip): from the take-off on the left over a flat top into the water; the body
  // follows the arc, the hips piked at first and stretching out before the hands meet the water
  // Runde 9b: 3,5 s statt 3,2 s, sonst überschritten die Hände am Scheitel die Beschleunigungsgrenze (Wächter)
  const A = [-1.25, 1.2, 0], K = [0.1, 1.95, 0], E = [0.45, WY - 1.3 * S, 0], T0 = 0.4, TD = 3.5;
  const dir = (s) => { const d = [0, 1].map((i) => 2 * (1 - s) * (K[i] - A[i]) + 2 * s * (E[i] - K[i])); return Math.atan2(d[1], d[0]); };
  const at = (t) => { // where the diver is in the loop: dive, glide back unseen behind the water, fade in again
    const c = t <= 0 ? 0 : t % P;
    if (c < T0 + TD) { const s = ease((c - T0) / TD); return { c: bez(A, K, E, s), a: dir(s), pike: 0.3 * (1 - ease(s / 0.7)), lit: 1 }; }
    const v = ease((c - T0 - TD - 0.6) / 3.2), p = A.map((q, i) => E[i] + (q - E[i]) * v);
    p[2] = -1.4 * Math.sin(Math.PI * v);
    return { c: p, a: dir(1) + (dir(0) - dir(1)) * v, pike: 0.3 * v, lit: smooth((c - 7.0) / 0.6) };
  };
  let now = NaN, cur = at(0), g = { ...STRAIGHT, thigh: cur.pike };
  const sp = springer(dv, { S });
  // when and where the hands meet the water
  let tE = T0 + TD, xE = 0;
  for (let c = T0; c < T0 + TD; c += 0.01) { const q = at(c), hand = sp.hand({ ...STRAIGHT, thigh: q.pike }, q.c, q.a); if (hand[1] < WY) { tE = c; xE = hand[0]; break; } }
  const q0 = at(0), q1 = at(T0 + TD * 0.4), start = sp.pts.map((q, j) => sp.at(j, { ...STRAIGHT, thigh: q0.pike }, A, dir(0))), top = sp.pts.map((q, j) => sp.at(j, { ...STRAIGHT, thigh: q1.pike }, q1.c, q1.a));
  // vierzehnte Fassung: ein ganzer Sprung, bis die Ringe verebbt sind (vorher endete das Bild nach 3 s mitten im Flug)
  return { beats: [{ ...act([part("diver", paint(start, skin(sp))), part("water", paint(water, (p) => mix(CYAN, BLUE, (p[1] - WY + 0.15) / 0.3)))]), fitPts: [...start, ...top, ...water], caption, hold: 6.7, live: (b, j, t, o) => {
    if (t !== now) { now = t; cur = at(t); g = { ...STRAIGHT, thigh: cur.pike }; }
    if (j < dv) { const p = sp.at(j, g, cur.c, cur.a); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = cur.lit * underwater(p[1], WY); return; }
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
  // Wasser → die Ringe richten sich auf und werden zur Medaille mit eurer Zahl. The diver keeps its drones (a body)
  // until it is under water; its drones then join the rings.
  const [DV, BD, W] = share(n, [150, 45, 105]), WY = -0.6, BY = 0.3, TIPX = -0.7, POST = -1.7, S = 1.05;
  // a springboard: the plank, its post down to the pool edge and a brace; the plank's far end rests on the post
  const plank = [line([POST - 0.25, BY], [TIPX, BY]), line([POST - 0.25, BY - 0.045], [TIPX, BY - 0.045]), line([POST, BY - 0.045], [POST, WY + 0.02]), line([POST, BY - 0.42], [POST + 0.3, BY - 0.045])];
  const board = (() => { const [a, b] = share(BD, [1, 1]); return [...sample(plank, a).map(([x, y]) => [x, y, 0.08]), ...sample(plank, b).map(([x, y]) => [x, y, -0.08])]; })();
  const water = waterRows(W, [-0.4, -0.13, 0.13, 0.4], -0.8, 1.45, WY);
  // Runde 9b: Scheitel 0,16 höher als bei der Strichfigur; der Körper steht mit erhobenen Armen höher, sonst sänke sein
  // Schwerpunkt am Ende des Absprungs wieder ab (Finten-Wächter, Teil diver)
  const UP = Math.PI / 2, FEET = [TIPX - 0.12, BY + 0.02], AH = [-0.3, 1.66, 0], APEX_A = 0.25;
  const UNDER = [0.5, WY - 1.4 * S, 0], UNDER_A = -1.45, K = [0.6, 1.81, 0];
  // the take-off: crouch on the board (it bends), stretch, and leap to the top of the arc, the hips piked
  const crouch = (t) => keys([[0.2, 0], [1.4, 1], [2.6, 0]], t), leap = (t) => ease((t - 2.0) / 2.2);
  const takeoff = (t) => { const k = crouch(t), u = leap(t); return { torso: -0.55 * k, arms: -0.7 * k, thigh: 0.7 * k + 0.35 * u, shin: -1.3 * k, foot: (FLAT + 0.7 * k) * (1 - u) }; };
  const dip = (t) => 0.1 * crouch(t) * (1 - leap(t));
  const bend = (x) => Math.max(0, (x - POST) / (TIPX - POST)) ** 2;
  const standing = { ...STRAIGHT, foot: FLAT }, sp = springer(DV, { S });
  const hipOnBoard = (g, a, d) => { const k = sp.sole(g, [0, 0, 0], a); return [FEET[0] - k[0], FEET[1] - d - k[1], 0]; };
  const leapAt = (t) => { const g = takeoff(t), u = leap(t), a = UP + (APEX_A - UP) * u, h = hipOnBoard(g, UP, dip(t)); return { c: h.map((v, i) => v + (AH[i] - v) * u), a }; };
  // the dive: from the top down into the water, the body stretches and turns head first; the hands meet the water at tE
  const fall = (t) => ease(t / 2.8), fallAt = (t) => ({ c: bez(AH, K, UNDER, fall(t)), a: APEX_A + (UNDER_A - APEX_A) * fall(t) });
  const diving = (t) => ({ ...STRAIGHT, thigh: 0.35 * (1 - ease(t / 1.3)) });
  const DIVE0 = 3.7, BLEND = 0.5; // der Fall beginnt kurz vor dem Scheitel des Absprungs (ease endet bei 4,2)
  let tE = 2.8, xE = 0.3;
  for (let c = 0; c < 2.8; c += 0.01) { const { c: q, a } = fallAt(c), hand = sp.hand(diving(c), q, a); if (hand[1] < WY) { tE = c; xE = hand[0]; break; } }
  const E = surf(xE, 0, WY);
  const onBoard = hipOnBoard(standing, UP, 0), standPts = sp.pts.map((q, j) => sp.at(j, standing, onBoard, UP));
  const underPts = sp.pts.map((q, j) => sp.at(j, diving(9), UNDER, UNDER_A));
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
  const bodyCol = skin(sp), boardCol = mix(GOLD, WARM, 0.45), waterCol = (p) => mix(CYAN, BLUE, (p[1] - WY + 0.15) / 0.3);
  const D0 = DV, D1 = DV + BD; // index ranges: diver | board | water
  const scene = (diverPts, opts = {}) => [part("diver", paint(diverPts, bodyCol), { rigid: true, ...opts }), part("board", paint(board, boardCol)), part("water", paint(water, waterCol))];
  return { beats: [
    act(scene(standPts), { caption: message('jubilaeum.aDivingBoard'), hold: 1.4, live: (b, j, t, o) => { if (j >= D1) swell(b, t, o); } }),
    // Runde 11c (Marc: „beim Kopfsprung, da brauchen wir auch keine Pause“): Absprung und Kopfsprung sind ein Bild. Vorher
    // endete der Absprung am Scheitel, und zwischen den Bildern stand der Springer still in der Luft. Jetzt geht der Flug
    // vor dem Scheitel weich in den Fall über (DIVE0, Überblendung über BLEND s), ohne Halt.
    act(scene(standPts, { offstage: true }), { caption: message('jubilaeum.headFirstDiveTheWaterSplashes'), hold: DIVE0 + 3.6, live: (b, j, t, o) => {
      if (j < D0) {
        const tt = Math.max(0, t);
        let p;
        if (tt < DIVE0) { const { c, a } = leapAt(tt); p = sp.at(j, takeoff(tt), c, a); }
        else {
          const f = tt - DIVE0, { c, a } = fallAt(f); p = sp.at(j, diving(f), c, a);
          const w = smooth(f / BLEND);
          if (w < 1) { const L = leapAt(tt), q = sp.at(j, takeoff(tt), L.c, L.a); p = p.map((v, i) => q[i] + (v - q[i]) * w); }
        }
        set(o, p); o[3] = underwater(p[1], WY);
      }
      else if (j < D1) o[1] -= dip(Math.max(0, t)) * bend(b[0]);
      else {
        swell(b, t, o);
        // the splash: drones near the entry lift a little and flash, then a ring of light runs outward
        const since = t - DIVE0 - tE, r = Math.hypot(b[0] - E[0], (b[2] - E[2]) / Math.cos(TIP));
        if (since > 0) {
          const near = Math.exp(-((r / 0.28) ** 2)), up = Math.sin(Math.PI * Math.min(1, since / 1.3)) ** 2;
          o[1] += 0.13 * near * up; o[3] += near * 1.4 * Math.exp(-since / 0.7) + 0.8 * smooth(since / 0.3) * Math.exp(-(((r - 0.45 * since) / 0.12) ** 2));
        }
      }
    } }),
    act([part("water", paint(rings.map((p) => p.slice(0, 3)), (p, i) => mix(CYAN, BLUE, rings[i][3] / 2)))], { caption: message('jubilaeum.ripplesSpread'), hold: 2.8, live: (b, j, t, o) => {
      const q = rings[j][3], dx = b[0] - E[0], dy = b[1] - E[1], dz = b[2] - E[2], k = 1 + 0.06 * Math.sin(t * 1.4 - q * 1.1);
      o[0] = E[0] + dx * k; o[1] = E[1] + dy * k; o[2] = E[2] + dz * k;
      o[3] = chase(RR[q], t, 0.45, 0.9, 0.7, 1.5);
    } }),
    act([part("water", paint(rim, GOLD)), part("number", paint(num, WARM)), part("ribbon", ribbon)], { caption: message('jubilaeum.andBecomeYourNumber'), live: (b, j, t, o) => {
      if (j < RIM) o[3] = glint(Math.atan2(b[1] - MC[1], b[0] - MC[0]), t, 4, 0.5, -Math.PI, Math.PI);
      sway(o, t, 0.3);
    } }),
  ] };
}

export const builders = { kick2d, kickHorizon, kickStory, diveHorizon, diveStory };
