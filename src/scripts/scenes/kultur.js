// kultur motifs of the eleventh version (see src/content/show-configurator.js for the build names).
import { TAU, WARM, GOLD, PINK, VIOLET, CYAN, BLUE, ORANGE, RED, GREEN, DIAMOND, mix, paint, place, frac, smooth, hash, yaw, roll, pitch, sway, swing, breathe, glint, sparkle, chase, trace, burstLight, loosen, rig, share, part, act } from "../show-motion.js";
import { sampleOutline } from "../show-geometry.js";
import { sample3d, notePath1, MELODY_X } from "../show-shapes.js";

const line = (...pts) => ({ pts, closed: false });
const flat = (pts, z = 0) => pts.map(([x, y]) => [x, y, z]);
const curve = (k, f) => Array.from({ length: k + 1 }, (_, i) => f(i / k));
/** Points spread evenly along each open path, each path with its own count (rows of dots, strings). */
const rows = (paths, counts) => paths.flatMap((p, k) => sampleOutline([p], counts[k]));
/** A five-pointed star outline as a closed path. */
const starPath = (cx, cy, R, inner = 0.42) => ({ pts: Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU, r = i % 2 ? R * inner : R; return [cx + Math.sin(a) * r, cy + Math.cos(a) * r]; }) });

// ---------------------------------------------------------------- Buch ----------
// SPARK: the classic open book seen from the front, lines of text as short rows of dots; the light reads them.
const pageTop = (s) => 0.5 - 0.12 * (1 - s) ** 2, pageBottom = (s) => -0.5 - 0.12 * (1 - s) ** 2;
function book2dShape(n) {
  const side = (sg) => [line(...curve(12, (s) => [sg * s * 1.05, pageTop(s)])), line([sg * 1.05, pageTop(1)], [sg * 1.05, pageBottom(1)]), line(...curve(12, (s) => [sg * s * 1.05, pageBottom(s)]))];
  const outline = [...side(-1), ...side(1), line([0, pageTop(0)], [0, pageBottom(0)])];
  // three rows per page following the bend of the page; the last row on the right ends a paragraph
  const R = [[-1, 0, 5], [-1, 1, 5], [-1, 2, 5], [1, 0, 5], [1, 1, 5], [1, 2, 3]], ink = [];
  for (const [sg, r, k] of R) for (let i = 0; i < k; i++) { const s = 0.2 + (i / 4) * 0.62; ink.push([sg * s * 1.05, pageTop(s) - 0.27 - r * 0.25, 0]); }
  // reading order: the left page first, each row left to right
  const order = ink.map((p, i) => i).sort((a, b) => (Math.sign(ink[a][0]) - Math.sign(ink[b][0])) || (ink[b][1] - ink[a][1] > 0.1 ? 1 : ink[a][1] - ink[b][1] > 0.1 ? -1 : ink[a][0] - ink[b][0]));
  const read = new Float64Array(ink.length); order.forEach((i, k) => { read[i] = k / (ink.length - 1); });
  return { outline: flat(sampleOutline(outline, n - ink.length)), ink, read };
}

// 3D: book space has the spine along y, x across the pages, z up from the table; the audience looks from the front and
// above, so a page that lifts rises in the picture and comes closer.
const BW = 0.95, BH = 1.3, ELEV = 0.9, BETA = 0.22, CURL = 0.4;
const view = (x, y, z) => [x, y * Math.sin(ELEV) + z * Math.cos(ELEV), -y * Math.cos(ELEV) + z * Math.sin(ELEV)];
/** A point of a sheet hinged at the spine: s across it (0 at the spine), turned up by a from the right (0) over to the
 * left (π), lifted off its hinge by off along its normal. The paper bows upward on both sides and is flat when upright. */
function sheet(s, y, a, off = 0, dx = 0, curl = CURL) {
  const v = curl * s * (1 - s / BW) * Math.cos(a) + off, c = Math.cos(a), sn = Math.sin(a);
  return view(dx + s * c - v * sn, y, s * sn + v * c);
}
/** Outline of a sheet without its spine edge (the spine is shared, two sheets would put drones on top of each other). */
const sheetEdges = (w, h, s0 = 0.06) => [{ pts: [[s0, h / 2], [w, h / 2], [w, -h / 2], [s0, -h / 2]] }];
const sheetPts = (n, w, h, s0) => sampleOutline(sheetEdges(w, h, s0).map((p) => ({ ...p, closed: false })), n);
/** Rows of text on a page in sheet coordinates [s, y]. */
const textRows = (ys, k, s0 = 0.16, s1 = 0.8) => ys.flatMap((y) => Array.from({ length: k }, (_, i) => [s0 + ((s1 - s0) * i) / (k - 1), y]));

const COVER = (p) => mix(RED, WARM, 0.08), INK = GOLD;

function book3dScene(n, caption) {
  // static: covers under the open pages, the left and the right page; moving: one page with its rows of text
  const [nc, nl, nr, nt, nrl, nrr, nrt] = share(n, [44, 34, 34, 34, 18, 18, 18]);
  const cov = [...sampleOutline([{ pts: [[0, BH / 2 + 0.05], [BW + 0.06, BH / 2 + 0.05], [BW + 0.06, -BH / 2 - 0.05], [0, -BH / 2 - 0.05]] }], Math.ceil(nc / 2)).map(([s, y]) => sheet(s, y, 0, -0.05, 0, 0)),
    ...sampleOutline([{ pts: [[0, BH / 2 + 0.05], [BW + 0.06, BH / 2 + 0.05], [BW + 0.06, -BH / 2 - 0.05], [0, -BH / 2 - 0.05]] }], Math.floor(nc / 2)).map(([s, y]) => sheet(s, y, Math.PI, 0.05, 0, 0))];
  const left = sheetPts(nl, BW, BH, 0.03).map(([s, y]) => sheet(s, y, Math.PI - BETA)), right = sheetPts(nr, BW, BH, 0.03).map(([s, y]) => sheet(s, y, BETA));
  const turnLocal = [...sheetPts(nt, BW * 0.98, BH * 0.97, 0.1), ...textRows([0.3, 0.05, -0.2], nrt / 3)];
  const rowsL = textRows([0.18, -0.07, -0.32], nrl / 3).map(([s, y]) => sheet(s, y, Math.PI - BETA)), rowsR = textRows([0.18, -0.07, -0.32], nrr / 3).map(([s, y]) => sheet(s, y, BETA));
  const A0 = BETA + 0.12, A1 = Math.PI - BETA - 0.12, P = 9, T = 3.4;
  // one cycle: rest on the right, turn over lit, rest on the left, turn back dimmed (the next page) and rest again
  const angle = (t) => { const u = frac((t - 0.6) / P) * P; return u < T ? smooth(u / T) : u < P / 2 ? 1 : u < P / 2 + T ? 1 - smooth((u - P / 2) / T) : 0; };
  const back = (t) => { const u = frac((t - 0.6) / P) * P; return smooth((u - P / 2 + 0.3) / 0.4) * (1 - smooth((u - P / 2 - T) / 0.4)); };
  const turn = turnLocal.map(([s, y]) => sheet(s, y, A0));
  const pts = [...paint(cov, COVER), ...paint(left, WARM), ...paint(right, WARM), ...paint(turn.slice(0, nt), WARM), ...paint(turn.slice(nt), INK), ...paint(rowsL, INK), ...paint(rowsR, INK)];
  const T0 = nc + nl + nr, T1 = T0 + nt + nrt, L1 = T1 + nrl;
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    const u = angle(t);
    if (j >= T0 && j < T1) { const [s, y] = turnLocal[j - T0], p = sheet(s, y, A0 + (A1 - A0) * u); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = (1 - 0.6 * back(t)) * (j >= T0 + nt ? glint(s, t, 2.4, 0.4, 0, 1) : 1); }
    else if (j >= T1) { const covered = j < L1 ? smooth((u - 0.75) / 0.25) : 1 - smooth(u / 0.25); o[3] = 1.05 - 0.75 * covered; } // the page that lies on a page hides its rows
    sway(o, t, 0.22, 11);
  } }] };
}

function bookStoryScene(n) {
  // Ein geschlossenes Buch mit Feder → es öffnet sich → die Feder schreibt → die Zeilen steigen als Funken auf →
  // …und werden ein Stern. Covers and pages are rigid parts: their drones keep their place while the book opens.
  const NC = 84, NP = 66, NI = 54, NQ = 50, NS = n - NC - NP - NI - NQ;
  const coverLocal = sampleOutline([{ pts: [[0, BH / 2 + 0.05], [BW + 0.06, BH / 2 + 0.05], [BW + 0.06, -BH / 2 - 0.05], [0, -BH / 2 - 0.05]] }], NC / 2);
  const pageLocal = sheetPts(NP / 2, BW, BH, 0.04);
  const inkL = textRows([0.36, 0.14, -0.08, -0.3, -0.52].slice(0, 5), 6), inkR = textRows([0.3, 0.06, -0.18], 8, 0.14, 0.82);
  const TH = 0.2; // the closed book's thickness
  // pose of the book while it opens (u 0 → 1): the front cover and the left page swing over, the right page settles;
  // the whole book slides left so the closed book stands in the middle of the picture
  const coverAt = (k, u) => { const [s, y] = coverLocal[k % (NC / 2)], dx = -(BW / 2) * (1 - u); return k < NC / 2 ? sheet(s, y, 0, -0.05, dx, 0) : sheet(s, y, Math.PI * u, TH + (0.05 - TH) * u, dx, 0); };
  const pageAt = (k, u) => { const [s, y] = pageLocal[k % (NP / 2)], dx = -(BW / 2) * (1 - u); return k < NP / 2 ? sheet(s, y, BETA * u, TH * 0.3 * (1 - u), dx) : sheet(s, y, (Math.PI - BETA) * u, TH * 0.65 * (1 - u), dx); };
  const inkAt = (k, u) => { const dx = -(BW / 2) * (1 - u); if (k < inkL.length) { const [s, y] = inkL[k]; return sheet(s, y, (Math.PI - BETA) * u, TH * 0.65 * (1 - u) + 0.01, dx); } const [s, y] = inkR[k - inkL.length]; return sheet(s, y, BETA * u, TH * 0.3 * (1 - u) + 0.01, dx); };
  const cover = (u) => paint(Array.from({ length: NC }, (_, k) => coverAt(k, u)), COVER), pages = (u) => paint(Array.from({ length: NP }, (_, k) => pageAt(k, u)), WARM);
  // the gold frame on the closed cover becomes the ink of the open pages
  const frame = sampleOutline([{ pts: [[0.14, 0.5], [BW - 0.08, 0.5], [BW - 0.08, -0.5], [0.14, -0.5]] }, line([0.3, 0.2], [BW - 0.24, 0.2]), line([0.3, 0.06], [BW - 0.24, 0.06])], NI).map(([s, y]) => sheet(s, y, 0, TH + 0.03, -BW / 2, 0));
  const inkOpen = Array.from({ length: NI }, (_, k) => inkAt(k, 1));
  // the quill: a long feather with its nib at the origin, leaning to the upper right like a hand holds it
  const quillLocal = (() => {
    const L = 0.95, lean = 0.62, vane = line(...curve(10, (u) => [0.28 * L + u * 0.72 * L, 0.11 * Math.sin(Math.PI * u ** 0.8) * (1 - 0.3 * u)]), ...curve(10, (u) => [L - u * 0.72 * L, -0.07 * Math.sin(Math.PI * (1 - u) ** 0.8)]));
    const shaft = line([0, 0], [L * 1.04, 0]);
    const [a, b] = share(NQ, [1.2, 3]);
    return [...sampleOutline([shaft], a), ...sampleOutline([vane], b)].map(([x, y]) => [x * Math.cos(lean) - y * Math.sin(lean), x * Math.sin(lean) + y * Math.cos(lean), 0.15]);
  })();
  const quillColour = (p, i) => (i < 8 ? GOLD : mix(WARM, VIOLET, 0.55));
  const quillAt = (x, y, z = 0, a = 0) => paint(quillLocal.map(([qx, qy, qz]) => [x + qx * Math.cos(a) - qy * Math.sin(a), y + qx * Math.sin(a) + qy * Math.cos(a), z + qz]), quillColour);
  // the pen: three rows on the right page, written left to right, back to the start of the next row lifted a little
  const TW = 1.6, TR = 1.35, T0 = 0.6, rowsY = [0.3, 0.06, -0.18], S0 = 0.12, S1 = 0.84;
  const pen = (t) => {
    let u = t - T0;
    for (let r = 0; r < 3; r++) {
      if (u < TW) { const w = smooth(u / TW); return [S0 + (S1 - S0) * w, rowsY[r] - 0.04, r + w, 0]; }
      u -= TW;
      if (r < 2 && u < TR) { const w = smooth(u / TR); return [S1 + (S0 - S1) * w, rowsY[r] + (rowsY[r + 1] - rowsY[r]) * w - 0.04, r + 1, Math.sin(Math.PI * w) * 0.06]; }
      if (r < 2) u -= TR;
    }
    const w = smooth(u / 1.6); return [S1 + 0.1 * w, rowsY[2] - 0.04 + 0.25 * w, 3, 0.2 * w]; // done: the pen lifts away
  };
  const nibAt = (t) => { const [s, y, , lift] = pen(t), p = sheet(s, y, BETA); return [p[0], p[1] + lift, p[2] + lift * 0.4]; };
  const nib0 = nibAt(0);
  const starAt = (cx, cy, R) => { const out = sampleOutline([starPath(cx, cy, R), starPath(cx, cy, R * 0.8, 0.38)], NI + NS); return out.map(([x, y], i) => [x, y, i % 2 ? 0.05 : -0.05]); };
  const STAR = [0, 1.22, 0.5], finalStar = starAt(...STAR);
  const sky = paint(Array.from({ length: NS }, (_, k) => [-1.25 + 2.5 * ((k + hash(k + 1)) / NS), 0.74 + 0.36 * hash(k + 11), (hash(k + 5) - 0.5) * 0.5]), (p, i) => (i % 3 ? WARM : GOLD));
  const twinkle = (j, t, o) => { o[3] = sparkle(j, t, 0.6, 1.25); };
  const rest = [quillAt(0.68, -0.5, 0.1, -0.15)];
  const I0 = NC + NP, Q0 = I0 + NI, S0i = Q0 + NQ;
  const ink = (pts, colour = INK) => part("ink", paint(pts, colour));
  return { beats: [
    act([part("cover", cover(0), { rigid: true }), part("pages", pages(0), { rigid: true }), ink(frame), part("quill", rest[0], { rigid: true }), part("stars", sky)], { caption: "Ein geschlossenes Buch und eine Feder", hold: 1.4, frame: "book", live: (b, j, t, o) => { if (j >= S0i) twinkle(j, t, o); else if (j >= I0 && j < Q0) o[3] = glint(b[0] - b[1], t, 3.2, 0.45); sway(o, t, 0.2, 10); } }),
    act([part("cover", cover(1), { rigid: true }), part("pages", pages(1), { rigid: true }), ink(inkOpen), part("quill", quillAt(nib0[0] + 0.25, nib0[1] + 0.35, nib0[2]), { rigid: true }), part("stars", sky)], { caption: "es öffnet sich", hold: 3.8, frame: "book", live: (b, j, t, o) => {
      const u = smooth((t - 0.4) / 3.2);
      const p = j < NC ? coverAt(j, u) : j < I0 ? pageAt(j - NC, u) : j < Q0 ? inkAt(j - I0, u) : null;
      if (p) { o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
      if (j >= I0 && j < Q0) o[3] = j - I0 < inkL.length ? 0.3 + 0.75 * u : 0.15;
      if (j >= S0i) twinkle(j, t, o);
    } }),
    act([part("cover", cover(1), { rigid: true }), part("pages", pages(1), { rigid: true }), ink(inkOpen), part("quill", quillAt(...nib0), { rigid: true }), part("stars", sky)], { caption: "eine Feder schreibt", hold: 9, frame: "book", live: (b, j, t, o) => {
      if (j >= Q0 && j < S0i) { const q = nibAt(t); roll(o, 0.07 * Math.sin((t * TAU) / 1.8), nib0[0], nib0[1]); o[0] += q[0] - nib0[0]; o[1] += q[1] - nib0[1]; o[2] += q[2] - nib0[2]; }
      else if (j >= I0 && j < Q0) {
        const k = j - I0 - inkL.length;
        if (k < 0) o[3] = 1.05;
        else { const r = Math.floor(k / 8), s = inkR[k][0], [ps, , row] = pen(t), at = row - r - (s - S0) / (S1 - S0); o[3] = row >= r + 1 ? 1.05 : at < -0.02 ? 0.15 : 1.05 + 0.6 * Math.exp(-(((ps - s) / 0.05) ** 2)); }
      } else if (j >= S0i) twinkle(j, t, o);
    } }),
    act([part("cover", cover(1), { rigid: true }), part("pages", pages(1), { rigid: true }), part("quill", quillAt(nib0[0] + 0.62, nib0[1] + 0.25, nib0[2]), { rigid: true }), part("star", paint(loosen(finalStar, 0.4, 1.0).map(([x, y, z]) => [x * 1.25, y - 0.15, z]), GOLD))], { caption: "die Zeilen steigen als Funken auf", hold: 1.6, frame: "star", live: (b, j, t, o) => { if (j >= NC + NP + NQ) { o[3] = sparkle(j, t, 0.75, 1.4); o[1] += 0.12 * smooth(t / 2.5); } } }),
    act([part("cover", cover(1), { rigid: true }), part("pages", pages(1), { rigid: true }), part("quill", quillAt(nib0[0] + 0.62, nib0[1] + 0.25, nib0[2]), { rigid: true }), part("star", paint(finalStar, GOLD))], { caption: "…und werden ein Stern", frame: "star", live: (b, j, t, o) => { if (j >= NC + NP + NQ) { yaw(o, Math.sin(t * 0.5) * 0.5, STAR[0], 0); o[3] = glint(b[0] + b[1], t, 3.6, 0.45, -0.6, 1.8); } else sway(o, t, 0.15, 12); } }),
  ] };
}

// ---------------------------------------------------------------- Harfe ----------
// A concert harp drawn the way a pen would: the pillar on the left, the neck as a swan curve on top, the soundboard
// slanting up to the right (a double line, wide at the foot), the strings straight down from neck to soundboard.
const NECK = [[-0.53, 0.82], [-0.42, 0.94], [-0.24, 0.91], [-0.05, 0.77], [0.15, 0.65], [0.35, 0.63], [0.55, 0.72], [0.7, 0.79], [0.8, 0.73], [0.76, 0.6]];
const boardY = (x) => -0.86 + (x + 0.42) * 1.2456;
const neckY = (x) => { for (let i = 1; i < NECK.length; i++) { const [x0, y0] = NECK[i - 1], [x1, y1] = NECK[i]; if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); } return NECK[NECK.length - 1][1]; };
const STRING_X = Array.from({ length: 8 }, (_, i) => -0.34 + i * 0.13);
const stringEnds = (x) => [boardY(x) + 0.05, neckY(x) - 0.05];
function harpFrame(double = true) {
  const BN = [0.78, -0.626], w = (v) => 0.14 * (1 - v) + 0.04 * v, board = curve(10, (v) => [-0.42 + 1.14 * v, -0.86 + v * 1.42]);
  const back = board.map(([x, y], i) => [x + BN[0] * w(i / 10), y + BN[1] * w(i / 10)]);
  return [
    line([-0.58, -0.9], [-0.53, 0.8]), ...(double ? [line([-0.66, -0.9], [-0.61, 0.78])] : []), line(...NECK),
    ...(double ? [line([-0.61, 0.78], [-0.53, 0.82])] : []),
    line(...board), line(back[0], ...back.slice(1), board[10]), line([-0.68, -0.92], back[0]),
  ];
}
/** n drones on the eight strings, shared by length; returns points and for each drone its string and place v (0 at
 * the soundboard, 1 at the neck). */
function harpStrings(n) {
  const len = STRING_X.map((x) => { const [a, b] = stringEnds(x); return b - a; }), counts = share(n, len), pts = [], of = [];
  STRING_X.forEach((x, i) => { const [a, b] = stringEnds(x); for (let k = 0; k < counts[i]; k++) { const v = (k + 0.5) / counts[i]; pts.push([x, a + (b - a) * v, 0]); of.push([i, v]); } });
  return { pts, of };
}
/** A plucked string: it swings across a little and lets go slowly; window shape keeps start and end at rest. */
const PLUCK = 3.2;
const pluckEnv = (tau) => (tau <= 0 || tau >= PLUCK ? 0 : smooth(tau / 0.4) * (1 - smooth((tau - 0.4) / (PLUCK - 0.4))));
// (callers also pass the previous round's pluck times: the last plucks of a round still ring into the next)
const pluck = (o, v, tau, amp = 0.03) => { o[0] += amp * Math.sin(Math.PI * v) * pluckEnv(tau) * Math.sin(TAU * 1.1 * tau); return 0.85 + 0.5 * pluckEnv(tau) + 0.7 * (tau > 0 && tau < 1 ? Math.exp(-(((v - tau * 1.6) / 0.14) ** 2)) : 0); };
const quaver = (n, s, cx, cy, z = 0) => sampleOutline(notePath1(), n).map(([x, y]) => [cx + x * s, cy + y * s, z]);
const NOTE = mix(VIOLET, WARM, 0.25);

function harpHorizonScene(n, caption) {
  const [nf, ns, nn] = share(n, [94, 70, 36]), nq = share(nn, [1, 1, 1]);
  const frame = flat(sampleOutline(harpFrame(true), nf)), { pts: strings, of } = harpStrings(ns);
  // three notes travel on a closed loop beside the harp: up in front, lit; down behind, dimmed (no jumps anywhere)
  const C = [1.12, 0.02], RX = 0.24, RY = 0.62, RZ = 0.45, W = TAU / 9, at = (th) => [C[0] + RX * Math.cos(th), C[1] + RY * Math.sin(th), RZ * Math.cos(th)];
  const notes = [], home = [];
  nq.forEach((m, k) => { const th = -Math.PI / 2 + (k * TAU) / 3, c = at(th); for (const p of quaver(m, 0.36, 0, 0)) { notes.push([c[0] + p[0], c[1] + p[1], c[2]]); home.push([p[0], p[1], th]); } });
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1], STEP = 0.42, P = order.length * STEP + 1.4; // up and down the strings, then a breath
  const starts = STRING_X.map((_, i) => order.flatMap((s, k) => (s === i ? [0.5 + k * STEP] : [])));
  const pts = [...paint(frame, GOLD), ...paint(strings, WARM), ...paint(notes, NOTE)];
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    if (j < nf) { o[3] = glint(b[1], t, 4.5, 0.3, -1, 1); return; }
    if (j < nf + ns) { const [i, v] = of[j - nf], u = frac(t / P) * P; let a = 0.85; for (const s0 of starts[i]) a = Math.max(a, pluck(o, v, u - s0), pluck(o, v, u + P - s0)); o[3] = a; return; }
    const [x, y, th0] = home[j - nf - ns], c = at(th0 + W * t), front = (Math.cos(th0 + W * t) + 1) / 2;
    o[0] = c[0] + x; o[1] = c[1] + y + 0.02 * Math.sin(t * 2 + th0); o[2] = c[2]; o[3] = 0.4 + 0.85 * smooth((front - 0.25) / 0.6);
  } }] };
}

/** A treble clef as one pen stroke: the hook at the foot, the stem, the loop at the top and the bowl that curls in on
 * the G line (staff lines at y = -0.5 … 0.3). */
const CLEF = [[-0.08, -0.76], [-0.05, -0.83], [0.02, -0.84], [0.07, -0.79], [0.07, -0.6], [0.06, -0.2], [0.05, 0.2], [0.04, 0.42], [0.0, 0.56], [-0.07, 0.52], [-0.09, 0.38], [-0.04, 0.22], [0.06, 0.12], [0.08, 0.02], [-0.06, -0.06], [-0.17, -0.17], [-0.18, -0.32], [-0.1, -0.44], [0.04, -0.48], [0.15, -0.42], [0.19, -0.3], [0.14, -0.19], [0.02, -0.16], [-0.06, -0.23], [-0.03, -0.32]];
const noteHead = (cx, cy) => ({ pts: Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * TAU, x = Math.cos(a) * 0.14, y = Math.sin(a) * 0.095; return [cx + x * 0.94 - y * 0.34, cy + x * 0.34 + y * 0.94]; }) });

function harpStoryScene(n) {
  // Eine Harfe → die Saiten klingen nacheinander → Noten lösen sich und fliegen in Bögen davon → …und ordnen sich auf
  // fünf Linien zur Melodie. The strings become the staff, the frame becomes the clef, the notes find their places
  // of the melody of the notes story (MELODY_X and its pitches).
  const NF = 140, NN = 80, NS = n - NF, NS3 = NS - NN, NC = 70, NL = n - NC - NN; // act 4: clef, staff lines
  const [fa, fb] = share(NF, [1, 1]), frame = [...flat(sampleOutline(harpFrame(false), fa), 0.07), ...flat(sampleOutline(harpFrame(false), fb), -0.07)];
  const full = harpStrings(NS), thin = harpStrings(NS3);
  // the notes start just in front of five strings and fly in arcs to the upper right, one after another
  const FROM = [0, 2, 3, 5, 6], TO = [[0.98, 0.5], [1.16, 0.18], [1.3, 0.62], [1.48, 0.28], [1.62, 0.66]], per = share(NN, Array(5).fill(1));
  const HEIGHT = [0.22, 0.68, 0.3, 0.72, 0.28], starts = FROM.map((i, k) => { const [a, b] = stringEnds(STRING_X[i]); return [STRING_X[i] + 0.05, a + (b - a) * HEIGHT[k], 0.22]; });
  const local = per.flatMap((m, k) => quaver(m, 0.4, 0, 0).map((p) => [...p, k]));
  const noteOf = local.map((p) => p[3]), notesAt = (where) => local.map(([x, y, , k]) => [where[k][0] + x, where[k][1] + y, where[k][2] ?? 0]);
  const LEAVE = (k) => 0.3 + k * 0.45, FLY = 2.6;
  const arc = (k, t) => { const u = smooth((t - LEAVE(k)) / FLY), [sx, sy, sz] = starts[k], [ex, ey] = TO[k], cx = (sx + ex) / 2, cy = Math.max(sy, ey) + 0.38; return [(1 - u) ** 2 * sx + 2 * u * (1 - u) * cx + u * u * ex, (1 - u) ** 2 * sy + 2 * u * (1 - u) * cy + u * u * ey, sz * (1 - u)]; };
  // act 4: staff, clef and the melody
  const ys = [-0.5, -0.2, 0.1, -0.1, 0.2], CX = -1.5;
  const staff = flat(sampleOutline([0, 1, 2, 3, 4].map((k) => line([-1.85, -0.5 + k * 0.2], [1.35, -0.5 + k * 0.2])), NL));
  const clef = flat(sampleOutline([line(...CLEF.map(([x, y]) => [CX + x * 1.05, y * 1.05 - 0.02]))], NC));
  const melodyNotes = per.flatMap((m, k) => { const x = MELODY_X[k], y = ys[k]; return flat(sampleOutline([noteHead(x, y), line([x + 0.135, y + 0.06], [x + 0.135, y + 0.64])], m)); });
  const sw = (o, t) => sway(o, t, 0.28, 10);
  const glissando = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1], STEP = 0.3, P = glissando.length * STEP + 1.2;
  const onString = STRING_X.map((_, i) => glissando.flatMap((s, k) => (s === i ? [0.5 + k * STEP] : [])));
  const strings = (pts) => part("strings", paint(pts, WARM)), harp = part("frame", paint(frame, GOLD));
  const endAt = notesAt(TO.map(([x, y]) => [x, y, 0]));
  return { beats: [
    act([harp, strings(full.pts)], { caption: "Eine Harfe", hold: 1.4, frame: "harp", live: (b, j, t, o) => { o[3] = glint(b[0] + b[1] * 0.5, t, 3.8, 0.35); sw(o, t); } }),
    act([harp, strings(full.pts)], { caption: "die Saiten klingen nacheinander", hold: 4.8, frame: "harp", live: (b, j, t, o) => {
      if (j >= NF) { const [i, v] = full.of[j - NF], u = frac(t / P) * P; let a = 0.85; for (const s0 of onString[i]) a = Math.max(a, pluck(o, v, u - s0, 0.035), pluck(o, v, u + P - s0, 0.035)); o[3] = a; }
      sw(o, t);
    } }),
    act([harp, strings(thin.pts), part("notes", paint(notesAt(starts), NOTE))], { caption: "Noten lösen sich und fliegen in Bögen davon", hold: 4.4, frame: "fly", fitPts: [...frame, ...thin.pts, ...endAt], live: (b, j, t, o) => {
      if (j >= NF && j < NF + NS3) { const [i, v] = thin.of[j - NF], k = FROM.indexOf(i); if (k >= 0) o[3] = pluck(o, v, t - LEAVE(k) + 0.15, 0.03); }
      else if (j >= NF + NS3) { const q = j - NF - NS3, k = noteOf[q], [x, y] = local[q], c = arc(k, t); o[0] = c[0] + x; o[1] = c[1] + y; o[2] = c[2]; o[3] = 1 + 0.35 * Math.sin(Math.PI * smooth((t - LEAVE(k)) / FLY)); return; }
      sw(o, t);
    } }),
    act([part("frame", paint(clef, GOLD)), strings(staff), part("notes", paint(melodyNotes, NOTE))], { caption: "…und ordnen sich auf fünf Linien zur Melodie", frame: "staff", live: (b, j, t, o) => {
      if (j >= NC + NL) { const k = noteOf[j - NC - NL], u = frac(t / 3 - k * 0.12); o[1] += 0.08 * Math.sin(Math.PI * Math.min(1, u / 0.25)) ** 2; o[3] = 1 + 0.4 * Math.sin(Math.PI * Math.min(1, u / 0.25)); }
      else if (j < NC) o[3] = glint(b[1], t, 3.4, 0.4, -0.9, 0.7);
      sway(o, t, 0.2, 12);
    } }),
  ] };
}

// ---------------------------------------------------------------- Tänzerin ----------
const pathLen = ({ pts, closed = true }) => pts.slice(0, closed ? pts.length : -1).reduce((acc, a, i) => { const b = pts[(i + 1) % pts.length]; return acc + Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] ?? 0) - (a[2] ?? 0)); }, 0);
/** Groups of paths with their colours → exactly n points, shared by drawn length (weight scales a group's share). */
function drawGroups(groups, n) {
  const counts = share(n, groups.map((g) => g.paths.reduce((s, p) => s + pathLen(p), 0) * (g.weight ?? 1)));
  return groups.flatMap((g, k) => paint(g.paths[0].pts[0].length === 3 ? sample3d(g.paths, counts[k]) : flat(sampleOutline(g.paths, counts[k])), g.colour));
}
const smoothPath = (pts, k = 8) => { // Catmull-Rom through the given points, for calligraphic lines
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let q = 0; q < k; q++) { const u = q / k, u2 = u * u, u3 = u2 * u; out.push(p1.map((_, d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3))); }
  }
  out.push(pts[pts.length - 1]);
  return line(...out);
};
const ring2 = (cx, cy, r, k = 16) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }) });
const SKIRT = mix(RED, PINK, 0.15);

/** SPARK: one sweep of the pen: head, an arm raised over it, the other arm holding out the edge of a wide skirt. */
function dancer2dShape(n) {
  const hem = curve(28, (u) => [-0.8 + 1.66 * u, -0.64 - 0.08 * u - 0.1 * Math.sin(Math.PI * u) + 0.045 * Math.sin(u * TAU * 3.5)]);
  return drawGroups([
    { paths: [ring2(0.04, 0.96, 0.095, 14)], colour: GOLD, weight: 1.4 },
    { paths: [smoothPath([[0.04, 0.85], [0.0, 0.66], [-0.05, 0.42], [0.0, 0.2]]), smoothPath([[0.03, 0.76], [0.28, 0.96], [0.36, 1.24]]), smoothPath([[-0.02, 0.74], [-0.32, 0.64], [-0.6, 0.52]])], colour: WARM, weight: 1.4 },
    { paths: [smoothPath([[-0.04, 0.2], [-0.34, 0.3], [-0.6, 0.5], [-0.84, 0.12], [-0.92, -0.32], [-0.8, -0.64]]), smoothPath([[0.05, 0.2], [0.3, -0.15], [0.6, -0.5], [0.86, -0.72]]), smoothPath([[0.0, 0.18], [-0.15, -0.2], [-0.02, -0.5], [0.08, -0.8]])], colour: SKIRT },
    { paths: [line(...hem)], colour: GOLD },
  ], n);
}

// 3D: the body is a line drawing in its own plane that turns about the vertical axis; the skirt is a cone of curves
// (waist ring, swirling folds, hem) whose hem rises and flares with the speed of the turn.
const BODY = () => [
  { pts: ring2(0, 0.8, 0.085, 12).pts.map(([x, y]) => [x, y, 0]), closed: true }, { pts: ring2(0, 0.8, 0.085, 12).pts.map(([x, y]) => [0, y, x]), closed: true },
  smoothPath([[-0.08, 0.04, 0], [-0.1, 0.3, 0], [-0.07, 0.5, 0], [-0.13, 0.56, 0]]), smoothPath([[0.08, 0.04, 0], [0.1, 0.32, 0], [0.07, 0.5, 0], [0.13, 0.56, 0]]),
  smoothPath([[0.13, 0.56, 0], [0.3, 0.76, 0], [0.24, 0.98, 0], [0.06, 1.05, 0]]), smoothPath([[-0.13, 0.56, 0], [-0.4, 0.5, 0], [-0.64, 0.6, 0.05]]),
];
/** Skirt drones as parameters [θ, v] (v 0 at the waist, 1 at the hem): a waist ring, folds and the hem. */
function skirtParams(n, folds) {
  const [nw, nh, nf] = share(n, [0.12, 1, 1.05]), per = share(nf, Array(folds).fill(1)), out = [];
  for (let i = 0; i < nw; i++) out.push([(i / nw) * TAU, 0]);
  for (let i = 0; i < nh; i++) out.push([(i / nh) * TAU, 1]);
  per.forEach((m, k) => { for (let i = 0; i < m; i++) out.push([(k / folds) * TAU, (i + 1) / (m + 1)]); });
  return out;
}
/** Where a skirt drone is: lift 0 (at rest) … 1 (flying out); wave turns the ruffle of the hem. */
function skirtAt([th, v], lift, wave) {
  const R = 0.1 + (0.62 + 0.38 * lift) * v ** 0.85, yh = -0.8 + 0.42 * lift + 0.06 * (1 + lift) * Math.sin(6 * th - wave), y = 0.02 + (yh - 0.02) * v, a = th + 0.5 * v;
  return [R * Math.cos(a), y, R * Math.sin(a)];
}
const TILT = 0.28; // seen a little from above, so the hem reads as a ring
const bodyColour = (p) => (Math.hypot(p[0], p[1] - 0.8, p[2]) < 0.12 ? GOLD : WARM);
/** Integral of smooth(u) from 0: the angle of a turn that speeds up smoothly from rest. */
const spun = (u) => (u <= 0 ? 0 : u >= 1 ? u - 0.5 : u ** 3 - u ** 4 / 2);

function dancer3dScene(n, caption) {
  const body = BODY(), nb = Math.round(n * 0.34), bodyPts = sample3d(body, nb), sk = skirtParams(n - nb, 7), W = 0.55;
  const pts = [...paint(bodyPts, bodyColour), ...paint(sk.map((q) => skirtAt(q, 0.25, 0)), (p, i) => (sk[i][1] === 1 ? GOLD : SKIRT))];
  return { beats: [{ pts, caption, live: (b, j, t, o) => {
    if (j >= nb) { const p = skirtAt(sk[j - nb], 0.25, t * 1.6); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; if (sk[j - nb][1] === 1) o[3] = 0.95 + 0.35 * (0.5 + 0.5 * Math.sin(6 * sk[j - nb][0] - t * 1.6)); }
    yaw(o, W * t); pitch(o, TILT);
  } }] };
}

/** One petal as a closed 3D path: from r0 to r1 along angle phi, width w, its tip cupped towards the audience. */
function petal(phi, r0, r1, w, z0, cup, k = 12) {
  const at = (u, sg) => { const r = r0 + (r1 - r0) * u, h = sg * w * Math.sin(Math.PI * Math.min(0.9, u)) ** 0.7; return [Math.cos(phi) * r - Math.sin(phi) * h, Math.sin(phi) * r + Math.cos(phi) * h, z0 + cup * u * u]; };
  return { pts: [...curve(k, (u) => at(u, 1)), ...curve(k, (u) => at(1 - u, -1)).slice(1, -1)], closed: true };
}
const FAN = { x: 0, y: -0.72, R: 1.02, a0: 0.26, a1: Math.PI - 0.26, ribs: 9 };
const fanAngle = (i) => FAN.a0 + ((FAN.a1 - FAN.a0) * i) / (FAN.ribs - 1);
const polar = (r, a, z = 0) => [FAN.x + Math.cos(a) * r, FAN.y + Math.sin(a) * r, z];

function dancerStoryScene(n) {
  // Eine Tänzerin → sie dreht sich, schneller, der Rock hebt sich → der Rock wird zur Blüte → …die Blüte faltet sich
  // zum Fächer. The body drones become the heart of the flower and then the ribs of the fan; the skirt drones become
  // the petals and then the fan's leaf.
  const NB = 96, NK = n - NB, bodyPts = sample3d(BODY(), NB), sk = skirtParams(NK, 8), D = 3.6, W1 = 1.05;
  const skirtColour = (p, i) => (sk[i][1] === 1 ? GOLD : SKIRT);
  const body = part("body", paint(bodyPts, bodyColour)), skirt = (lift) => part("skirt", paint(sk.map((q) => skirtAt(q, lift, 0)), skirtColour));
  const B = [0, 0.05], outer = Array.from({ length: 8 }, (_, k) => petal((k / 8) * TAU + TAU / 16, 0.16, 0.92, 0.21, 0, 0.3));
  const inner = [...Array.from({ length: 6 }, (_, k) => petal((k / 6) * TAU, 0.07, 0.48, 0.13, 0.12, 0.14)), { pts: ring2(0, 0, 0.06, 8).pts.map(([x, y]) => [x, y, 0.16]), closed: true }];
  const bloom = (pts) => pts.map(([x, y, z]) => [x + B[0], y + B[1], z]);
  const flowerOuter = paint(bloom(sample3d(outer, NK)), (p) => mix(SKIRT, GOLD, Math.max(0, Math.hypot(p[0] - B[0], p[1] - B[1]) - 0.6) * 1.4));
  const flowerInner = paint(bloom(sample3d(inner, NB)), (p) => (Math.hypot(p[0] - B[0], p[1] - B[1]) < 0.1 ? GOLD : mix(GOLD, VIOLET, 0.45)));
  const ribs = Array.from({ length: FAN.ribs }, (_, i) => ({ pts: [polar(0.17, fanAngle(i), 0.02), polar(FAN.R, fanAngle(i), 0.02)] }));
  const scallop = { pts: curve(64, (u) => { const a = FAN.a0 + (FAN.a1 - FAN.a0) * u, bump = 0.05 * Math.abs(Math.sin(u * (FAN.ribs - 1) * Math.PI)); return polar(FAN.R + bump, a); }) };
  const innerEdge = { pts: curve(24, (u) => polar(0.46, FAN.a0 + (FAN.a1 - FAN.a0) * u)) };
  const lace = { pts: curve(64, (u) => polar(0.74 + 0.035 * Math.sin(u * 2 * (FAN.ribs - 1) * Math.PI), FAN.a0 + (FAN.a1 - FAN.a0) * u)) };
  const fanLeaf = paint(sample3d([scallop, innerEdge, lace], NK), (p) => (Math.abs(Math.hypot(p[0] - FAN.x, p[1] - FAN.y) - 0.74) < 0.05 ? mix(VIOLET, WARM, 0.2) : SKIRT));
  const fanRibs = paint(sample3d(ribs, NB), GOLD);
  const spin = (t) => W1 * D * spun((t - 0.3) / D), lift = (t) => 0.15 + 0.85 * smooth((t - 0.6) / 3.4);
  return { beats: [
    act([body, skirt(0.15)], { caption: "Eine Tänzerin", hold: 1.6, live: (b, j, t, o) => {
      if (j >= NB) { const p = skirtAt(sk[j - NB], 0.15, t * 1.4); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
      yaw(o, 0.35 * Math.sin((t * TAU) / 9)); pitch(o, TILT);
    } }),
    act([body, skirt(1)], { caption: "sie dreht sich, schneller, der Rock hebt sich", hold: 4.6, live: (b, j, t, o) => {
      if (j >= NB) { const p = skirtAt(sk[j - NB], lift(t), t * 1.8); o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = sk[j - NB][1] === 1 ? 1 + 0.3 * smooth((t - 1) / 3) : 1; }
      yaw(o, spin(t)); pitch(o, TILT);
    } }),
    act([part("body", flowerInner), part("skirt", flowerOuter)], { caption: "der Rock wird zur Blüte", hold: 2.6, live: (b, j, t, o) => {
      roll(o, 0.3 * t, B[0], B[1]); pitch(o, 0.18 * Math.sin((t * TAU) / 7), B[1]); o[3] = glint(Math.hypot(b[0] - B[0], b[1] - B[1]), t, 3.2, 0.45, 0, 1.1);
    } }),
    act([part("body", fanRibs), part("skirt", fanLeaf)], { caption: "…und die Blüte faltet sich zum Fächer", live: (b, j, t, o) => {
      roll(o, 0.1 * Math.sin((t * TAU) / 3.4), FAN.x, FAN.y); o[3] = glint(Math.atan2(b[1] - FAN.y, b[0] - FAN.x), t, 3.4, 0.4, FAN.a1 + 0.3, FAN.a0 - 0.3);
    } }),
  ] };
}

export const builders = {
  book2d: (n, caption) => {
    const { outline, ink, read } = book2dShape(n), k = outline.length, P = 7.5;
    return { beats: [{ pts: [...paint(outline, WARM), ...paint(ink, GOLD)], caption, live: (b, j, t, o) => {
      if (j < k) return;
      const head = frac(t / P) * 1.15 - 0.05, u = read[j - k]; // the light reads along the rows, then turns the page
      o[3] = (u < head ? 1.05 : 0.7) + 0.7 * Math.exp(-(((u - head) / 0.035) ** 2));
    } }] };
  },
  book3d: (n, caption) => book3dScene(n, caption),
  bookStory: (n) => bookStoryScene(n),
  harpHorizon: (n, caption) => harpHorizonScene(n, caption),
  harpStory: (n) => harpStoryScene(n),
  dancer2d: (n, caption) => {
    const pts = dancer2dShape(n);
    return { beats: [{ pts, caption, live: (b, j, t, o) => { if (b[1] < -0.3) { const d = (-0.3 - b[1]) / 0.5; o[0] += 0.025 * d * Math.sin(t * 1.4 - b[0] * 2); } o[3] = b[1] < -0.55 ? glint(b[0], t, 4, 0.4) : 1; } }] };
  },
  dancer3d: (n, caption) => dancer3dScene(n, caption),
  dancerStory: (n) => dancerStoryScene(n),
};
