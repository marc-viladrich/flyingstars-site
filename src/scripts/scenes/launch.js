// launch motifs of the eleventh version (see src/content/show-configurator.js for the build names).
import { TAU, WARM, GOLD, VIOLET, CYAN, BLUE, mix, paint, frac, smooth, hash, yaw, pitch, roll, breathe, glint, sparkle, chase, trace, loosen, share, part, act } from "../show-motion.js";
import { sampleOutline, evenSubset } from "../show-geometry.js";

const line = (...pts) => ({ pts, closed: false });
const flat = (pts, z = 0) => pts.map(([x, y]) => [x, y, z]);

// ---------- QR code ----------
// A real QR code, version 1-L, mask 7, for "HTTPS://FLYINGSTARS.ART" (alphanumeric mode, hence upper case; scheme and
// host are case-insensitive). Drones light the DARK modules, an inverted code on the night sky; scanners read inverted
// codes. The one pad codeword after the terminator is free (readers stop at the terminator), so it was chosen for the
// fewest dark modules: 198 instead of 208, and 200 drones can fly the whole code. Encoded offline and decoded with
// OpenCV from a dot rendering (white dots on black, inverted for the reader) on 10 October 2026.
const QR = `
111111100101101111111
100000101010001000001
101110101010001011101
101110100100001011101
101110101011001011101
100000101101001000001
111111101010101111111
000000001001000000000
110100110010001110110
001110000011110101111
000000110110101110010
010110000000110101001
100101100100011000001
000000001000000000011
111111101010000000101
100000100000000110001
101110100101010000110
101110101001000001011
101110100000000100001
100000101001001011001
111111101010100100000`.trim().split("\n");
const QR_DARK = QR.flatMap((row, r) => [...row].flatMap((v, c) => (v === "1" ? [[r, c]] : [])));
const FINDERS = [[3, 3], [3, 17], [17, 3]];
const inFinder = (r, c) => FINDERS.some(([fr, fc]) => Math.abs(r - fr) <= 4 && Math.abs(c - fc) <= 4);
/** The code's dark modules, module size m, centred on (cx, cy); row 0 on top, in reading order (row by row). */
const qrCode = (m, cx = 0, cy = 0) => QR_DARK.map(([r, c]) => [cx + (c - 10) * m, cy + (10 - r) * m, 0]);

/** The code with 100 drones: the three finder squares, a few real modules and nothing else (no real code fits). */
function qrSketch(n, m) {
  const finder = ([fr, fc]) => {
    const cx = (fc - 10) * m, cy = (10 - fr) * m, s = 3 * m, sq = [[-s, s], [s, s], [s, -s], [-s, -s]], out = [];
    for (let k = 0; k < 16; k++) { const a = sq[k >> 2], b = sq[((k >> 2) + 1) % 4], u = (k % 4) / 4; out.push([cx + a[0] + (b[0] - a[0]) * u, cy + a[1] + (b[1] - a[1]) * u, 0]); }
    for (const [dx, dy] of [[0, 0], [-1, 1], [1, 1], [1, -1], [-1, -1]]) out.push([cx + dx * m, cy + dy * m, 0]); // the solid core
    return out;
  };
  const finders = FINDERS.flatMap(finder);
  const data = evenSubset(QR_DARK.filter(([r, c]) => !inFinder(r, c)).map(([r, c]) => [(c - 10) * m, (10 - r) * m, 0]), n - finders.length);
  return [...finders, ...data];
}
/** Corner brackets of a scanner frame around (cx, cy), half size h, arm length a; a drone sits exactly on every corner. */
function bracketCorners(n, cx, cy, h, a) {
  const per = share(n, [1, 1, 1, 1]), out = [];
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sy], k) => {
    const arm = (per[k] - 1) / 2;
    out.push([cx + sx * h, cy + sy * h, 0]);
    for (let i = 1; i <= Math.ceil(arm); i++) out.push([cx + sx * (h - (a * i) / Math.ceil(arm)), cy + sy * h, 0]);
    for (let i = 1; i <= Math.floor(arm); i++) out.push([cx + sx * h, cy + sy * (h - (a * i) / Math.floor(arm)), 0]);
  });
  return out;
}

/** Rounded rectangle as a closed path; the corner `tail` (0 tr, 1 tl, 2 bl, 3 br) becomes the point of a speech bubble. */
function roundRect(cx, cy, w, h, r, tail = -1) {
  const pts = [];
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sy], k) => {
    if (k === tail) { // side, tip, bottom edge in the order the path runs (it runs anticlockwise)
      const side = [cx + sx * (w / 2), cy + sy * (h / 2 - 0.08)], tip = [cx + sx * (w / 2 + 0.07), cy + sy * (h / 2 + 0.035)], edge = [cx + sx * (w / 2 - 0.12), cy + sy * (h / 2)];
      pts.push(...(k % 2 ? [edge, tip, side] : [side, tip, edge])); return;
    }
    const x = cx + sx * (w / 2 - r), y = cy + sy * (h / 2 - r), a0 = Math.atan2(sy, sx) - Math.PI / 4;
    for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  });
  return { pts };
}

/** "SCAN ME" in single-stroke capitals (corners read better than script with the ~75 drones left over), centred. */
function scanMe(n, h = 0.36, w = 0.26, gap = 0.12) {
  const G = {
    S: [[[1, 0.86], [0.8, 1], [0.2, 1], [0, 0.82], [0, 0.62], [0.2, 0.5], [0.8, 0.5], [1, 0.38], [1, 0.16], [0.8, 0], [0.2, 0], [0, 0.14]]],
    C: [[[1, 0.84], [0.78, 1], [0.22, 1], [0, 0.8], [0, 0.2], [0.22, 0], [0.78, 0], [1, 0.16]]],
    A: [[[0, 0], [0.5, 1], [1, 0]], [[0.24, 0.42], [0.76, 0.42]]],
    N: [[[0, 0], [0, 1], [1, 0], [1, 1]]],
    M: [[[0, 0], [0, 1], [0.5, 0.42], [1, 1], [1, 0]]],
    E: [[[1, 1], [0, 1], [0, 0], [1, 0]], [[0, 0.5], [0.72, 0.5]]],
  };
  const paths = [], text = "SCAN ME"; let x = 0;
  for (const ch of text) { if (ch === " ") { x += w * 0.8; continue; } for (const st of G[ch]) paths.push(line(...st.map(([u, v]) => [x + u * w, v * h]))); x += w + gap; }
  const width = x - gap;
  return flat(sampleOutline(paths, n).map(([px, py]) => [px - width / 2, py - h / 2]));
}

// The phone of the QR story: outline, speaker and home bar; chat bubbles in front of the screen (incoming left,
// outgoing right), each with one or two lines of "text".
const PHONE = { w: 1.3, h: 2.5 };
const phone = (n) => { const [o, s, b] = share(n, [7.2, 0.3, 0.42]); return flat([...sampleOutline([roundRect(0, 0, PHONE.w, PHONE.h, 0.2)], o), ...sampleOutline([line([-0.14, 1.1], [0.14, 1.1])], s), ...sampleOutline([line([-0.21, -1.12], [0.21, -1.12])], b)]); };
const BUBBLES = [
  { cx: -0.13, cy: 0.6, w: 0.74, h: 0.3, tail: 2, lines: [[-0.4, 0.14]] },
  { cx: 0.13, cy: 0.12, w: 0.74, h: 0.3, tail: 3, lines: [[-0.12, 0.38]] },
  { cx: -0.13, cy: -0.42, w: 0.74, h: 0.44, tail: 2, lines: [[-0.4, 0.16], [-0.4, -0.06]] },
];
/** The chat bubbles; also returns which bubble every point belongs to (they appear one after the other). */
function chat(n) {
  const counts = share(n, BUBBLES.map((b) => 2 * (b.w + b.h) + b.lines.length * 0.5)), pts = [], of = [];
  BUBBLES.forEach((b, k) => {
    const textY = (i) => b.cy + (b.lines.length === 1 ? 0 : 0.07 - i * 0.14);
    const paths = [roundRect(b.cx, b.cy, b.w, b.h, 0.1, b.tail), ...b.lines.map(([x0, x1], i) => line([b.cx + x0 + 0.03, textY(i)], [b.cx + x1 + 0.03, textY(i)]))];
    for (const p of sampleOutline(paths, counts[k])) { pts.push([p[0], p[1], 0.05]); of.push(k); }
  });
  return { pts, of };
}

// ---------- spiral and torus ----------
/**
 * A curve f(s), s ∈ [0, 1], measured by length: at(d) is the point at distance d along it (wrapping around when closed),
 * spread(n) n points at equal distances. Drones that stream along a curve keep equal gaps, so the form stands while
 * every drone moves at the same speed.
 */
function curve(f, closed = true, k = 1600) {
  const p = Array.from({ length: k + 1 }, (_, i) => f(i / k)), cum = [0];
  for (let i = 1; i <= k; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]));
  const total = cum[k];
  const at = (d) => {
    d = closed ? ((d % total) + total) % total : Math.max(0, Math.min(total, d));
    let lo = 0, hi = k; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
    const u = (d - cum[lo]) / (cum[hi] - cum[lo] || 1), a = p[lo], b = p[hi];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  };
  return { total, at, spread: (n) => Array.from({ length: n }, (_, i) => at(((i + (closed ? 0 : 0.5)) / n) * total)) };
}
/** Cyan → blue → violet. */
const cool = (u) => (u < 0.5 ? mix(CYAN, BLUE, u * 2) : mix(BLUE, VIOLET, u * 2 - 1));
/** Flat Archimedean spiral from the centre outwards (radius grows evenly with the angle). */
const archimedes = (turns = 3.2, r0 = 0.06) => curve((s) => { const a = turns * TAU * s, r = r0 + (1 - r0) * s; return [r * Math.cos(a), r * Math.sin(a), 0]; }, false);
/** Conic helix (the simulator spiral): five windings, radius and height grow evenly from the narrow bottom. */
const conicHelix = (turns = 5) => curve((s) => { const a = turns * TAU * s, r = 0.16 + 0.84 * s; return [r * Math.cos(a), -0.72 + 1.44 * s, r * Math.sin(a)]; }, false);
// The torus lies flat (axis upright) and tips towards the audience, so its hole stays open.
const TR = 0.72, Tr = 0.3, TILT = 0.55;
const onTorus = (u, v, R = TR, r = Tr) => [(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)];
/** A Möbius band's edge: one closed line that runs twice around, the band turning half a turn on the way. */
const moebiusEdge = (w = 0.3) => curve((s) => { const u = 2 * TAU * s; return [(TR + w * Math.cos(u / 2)) * Math.cos(u), w * Math.sin(u / 2), (TR + w * Math.cos(u / 2)) * Math.sin(u)]; });
/** Speed that starts from rest: distance covered after t seconds at full speed v, reached after `ramp` seconds. */
const run = (t, v, ramp = 1.5) => (t <= 0 ? 0 : t < ramp ? (v * t * t) / (2 * ramp) : v * (t - ramp / 2));
const tipped = (o, a = TILT) => pitch(o, a);
const put = (o, p) => { o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; };

export const builders = {
  // ---- Launch · QR-Code ----
  qr2d(n, caption) {
    // the finder squares, a few modules, a scanner frame; a band of light scans down over the code
    const m = 0.1, B = 20, code = paint(qrSketch(n - B, m), WARM), frame = paint(bracketCorners(B, 0, 0, 1.3, 0.36), GOLD);
    return { beats: [{ pts: [...code, ...frame], caption, live: (b, j, t, o) => {
      if (j >= code.length) { o[3] = breathe(t, 3.2); return; }
      const beam = 1.25 - 2.5 * frac(t / 3.4);
      o[3] = 0.6 + 1.1 * Math.exp(-(((b[1] - beam) / 0.12) ** 2));
    } }] };
  },
  qrHorizon(n, caption) {
    // the real code: a scan line runs down and lights it row by row; the two leftover drones are the ends of the line
    // and keep scanning up and down, the code stands still (scannable)
    const m = 0.1, code = paint(qrCode(m), WARM), X = 10 * m + 3.4 * m, TOP = 1.08, T = 2.8, P = 7;
    const beamY = (t) => (t < T ? TOP - 2 * TOP * smooth(t / T) : -TOP + 2 * TOP * (0.5 - 0.5 * Math.cos((TAU * (t - T)) / P)));
    const ends = paint(Array.from({ length: n - code.length }, (_, k) => [k % 2 ? X : -X, TOP, 0]), GOLD);
    return { beats: [{ pts: [...code, ...ends], caption, live: (b, j, t, o) => {
      const y = beamY(t);
      if (j >= code.length) { o[1] = y; o[3] = 1.5; return; }
      const near = Math.exp(-(((b[1] - y) / 0.07) ** 2));
      o[3] = t > T || b[1] > y ? 1 + 0.5 * near : 0.14 + 1.3 * near;
    } }] };
  },
  qrStory(n) {
    // Eine Nachricht kommt an → die Nachrichten lösen sich in Funken → daraus wird ein QR-Code im Display → groß, mit
    // Scanrahmen und „Scan me“. The phone's drones become frame and lettering, the message drones become the code.
    const P = n - QR_DARK.length, body = paint(phone(P), WARM), { pts: bubbles, of } = chat(QR_DARK.length);
    const small = qrCode(0.05, 0, 0.05), top = small[0][1], bottom = small[small.length - 1][1];
    const sparks = loosen(small.map((p, i) => [p[0] * 1.15, p[1] * 1.05 + 0.05, (hash(i * 2.3) - 0.5) * 0.5]), 0.3, 1.05);
    const big = qrCode(0.1, 0, 0.32), F = 1.3, BR = 24;
    const frame = paint(bracketCorners(BR, 0, 0.32, F, 0.42), GOLD), words = paint(scanMe(P - BR).map(([x, y]) => [x, y - 1.5, 0]), GOLD);
    const appear = (k) => 0.35 + 1.05 * k; // the bubbles come in one after the other, each rises a little into place
    return { beats: [
      act([part("phone", body), part("code", paint(bubbles, (p, i) => (BUBBLES[of[i]].tail === 3 ? GOLD : WARM)))], { caption: "Eine Nachricht kommt an", hold: 3.6, frame: "phone", live: (b, j, t, o) => {
        if (j >= P) { const u = smooth((t - appear(of[j - P])) / 0.7); o[1] -= 0.09 * (1 - u); o[3] = 0.12 + 1.0 * u; }
        yaw(o, 0.3 * Math.sin((TAU * t) / 9));
      } }),
      act([part("phone", body), part("code", paint(sparks, (p, i) => mix(GOLD, WARM, hash(i))))], { caption: "die Nachrichten lösen sich in Funken", hold: 1.2, frame: "phone", live: (b, j, t, o) => {
        if (j >= P) { yaw(o, 0.35 * t, 0, 0); o[3] = sparkle(j, t, 0.7, 1.35); }
      } }),
      act([part("phone", body), part("code", paint(small, WARM))], { caption: "daraus wird ein QR-Code", hold: 2.6, frame: "phone", live: (b, j, t, o) => {
        if (j >= P) o[3] = trace((top - b[1]) / (top - bottom), t, 1.8, { dim: 0.2 });
      } }),
      act([part("phone", [...frame, ...words]), part("code", paint(big, WARM))], { caption: "„Scan me“: der Code steht still", frame: "scan", live: (b, j, t, o) => {
        if (j >= P) { o[3] = 1 + 0.12 * Math.sin(t * 0.8); return; } // only light on the code, so it could be scanned
        if (j < BR) { const k = 1 + 0.03 * Math.sin((TAU * t) / 3.4); o[0] = b[0] * k; o[1] = 0.32 + (b[1] - 0.32) * k; o[3] = breathe(t, 3.4); } // the frame breathes
        else o[3] = trace((j - BR) / (P - BR), t, 1.6, { dim: 0.25 });
      } }),
    ] };
  },

  // ---- Launch · Spirale ----
  spiral2d(n, caption) {
    // a flat spiral; light runs inwards along it and the spiral turns slowly (which also seems to pull inwards)
    const path = archimedes(), pts = paint(path.spread(n), (p, i) => cool(i / n));
    return { beats: [{ pts, caption, live: (b, j, t, o) => { o[3] = chase(1 - j / n, t, 0.11, 0.25, 0.65, 1.45); roll(o, t * 0.16); } }] };
  },
  spiral3d(n, caption) {
    // the conic helix turns about its upright axis; a wave of light climbs the windings
    const local = conicHelix().spread(n), pts = paint(local.map((p) => { const o = [...p]; tipped(o, 0.32); return o; }), (p, i) => cool(i / n));
    return { beats: [{ pts, caption, live: (b, j, t, o) => { put(o, local[j]); yaw(o, t * 0.32); tipped(o, 0.32); o[3] = chase(j / n, t, 0.09, 0.34, 0.6, 1.5); } }] };
  },
  spiralStory(n) {
    // Eine Spirale → sie schließt sich zum Torus, die Drohnen laufen auf den Windungen → der Torus dreht sich durch sich
    // selbst (wie ein Rauchring) → er verdreht sich zur endlosen Schleife. One part throughout; in every act after the
    // first the drones stream along their lines at constant speed, so the form stands while every drone moves.
    const helix = conicHelix().spread(n);
    const wound = curve((s) => onTorus(TAU * s, 16 * TAU * s, TR, 0.24)), V = 0.42; // one line wound sixteen times around a slimmer ring
    const coilAt = (j, t) => wound.at(((j + 0.5) / n) * wound.total + run(t, V));
    const RINGS = 20, onRing = share(n, Array(RINGS).fill(1)), ringOf = [], vOf = [];
    onRing.forEach((c, q) => { for (let k = 0; k < c; k++) { ringOf.push(q); vOf.push((k / c) * TAU + (q % 2) * (Math.PI / c)); } });
    const ringAt = (j, t) => onTorus((ringOf[j] / RINGS) * TAU, vOf[j] + run(t, 1.5, 2));
    const [EG] = share(n, [1.15, 1]), edge = moebiusEdge(), RUNGS = 16, rungN = share(n - EG, Array(RUNGS).fill(1)), rungs = [];
    rungN.forEach((c, q) => { const u = (q / RUNGS) * TAU; for (let k = 0; k < c; k++) { const s = -0.3 + (0.6 * (k + 0.5)) / c; rungs.push([(TR + s * Math.cos(u / 2)) * Math.cos(u), s * Math.sin(u / 2), (TR + s * Math.cos(u / 2)) * Math.sin(u)]); } });
    const edgeAt = (j, t) => edge.at(((j + 0.5) / EG) * edge.total + run(t, 0.32));
    const wobble = (t) => TILT + 0.3 * Math.sin((TAU * t) / 11); // the torus tips slowly back and forth
    const at = (fn, t, tilt) => (j) => { const o = fn(j, t); tipped(o, tilt); return o; };
    return { beats: [
      act([part("spiral", paint(helix.map((p) => { const o = [...p]; tipped(o, 0.32); return o; }), (p, i) => cool(i / n)))], { caption: "Eine Spirale", hold: 3, live: (b, j, t, o) => { put(o, helix[j]); yaw(o, t * 0.32); tipped(o, 0.32); o[3] = chase(j / n, t, 0.09, 0.34, 0.6, 1.5); } }),
      act([part("spiral", paint(Array.from({ length: n }, (_, j) => at(coilAt, 0)(j)), (p, i) => cool(0.5 + 0.5 * Math.cos((TAU * 3 * i) / n))))], { caption: "sie schließt sich zum Torus, die Lichter laufen die Windungen entlang", hold: 4.5, live: (b, j, t, o) => {
        put(o, coilAt(j, t)); yaw(o, t * 0.12); tipped(o);
      } }),
      act([part("spiral", paint(Array.from({ length: n }, (_, j) => at(ringAt, 0)(j)), (p, i) => cool(0.5 - 0.5 * Math.cos(vOf[i]))))], { caption: "der Torus dreht sich durch sich selbst", hold: 6, live: (b, j, t, o) => {
        put(o, ringAt(j, t)); yaw(o, t * 0.1); tipped(o, wobble(t));
      } }),
      act([part("spiral", paint([...edge.spread(EG), ...rungs].map((p) => { const o = [...p]; tipped(o); return o; }), (p, i) => (i < EG ? cool(0.5 + 0.5 * Math.sin((TAU * 2 * i) / EG)) : mix(BLUE, WARM, 0.25))))], { caption: "…und verdreht sich zur endlosen Schleife", live: (b, j, t, o) => {
        if (j < EG) put(o, edgeAt(j, t)); else { put(o, rungs[j - EG]); o[3] = 0.85 * glint(Math.atan2(rungs[j - EG][2], rungs[j - EG][0]), t, 6, 0.6, -Math.PI, Math.PI); }
        yaw(o, t * 0.14); tipped(o);
      } }),
    ] };
  },
};
