// Adventskranz mit vier Kerzen (Runde 11, Kandidat FSK-001 der Motiv-Shortlist), Anlass Winter & Silvester. Runde 11b (Marc:
// „könnte auch mit deutlich weniger Drohnen auskommen“): 2D ab 200, 3D ab 250, 3D+ ab 300, lockere Linie; Runde 11c: 2D ab 150, 3D ab 200. Ein liegender Kranz, wie er auf dem Tisch steht (kein Türkranz mit Schleife): Er liegt flach und wird
// leicht von oben gesehen, die vier roten Kerzen stehen senkrecht darauf.
//
//   adventskranz2d (2D, 150–390): Vorderansicht als Zeichnung in Linien. Der Kranz ist ein Band aus zwei Ellipsen mit
//     Zweigspitzen nach außen, die Kerzen stehen versetzt darauf (vier verschiedene Höhen und Lagen, keine verdeckt eine
//     andere). Ein warmer Schein wandert die Zweige entlang, die Flammen flackern in Licht.
//   adventskranz3d (3D, 200–1000): der Kranz als Körper: ein Zweigstrang windet sich als Schraube um den Ring (ab 500 ein
//     zweiter, versetzt, ab 750 ein goldenes Band und Zweigspitzen), Kerzen als Zylinder aus Mantellinien und oberem Rand,
//     Flammen aus zwei gekreuzten Tropfen (aus jeder Richtung eine Flamme). Er dreht sich langsam wie auf einem Drehteller.
//   adventskranzStory (3D+, 300–1000): die Kerzen sind dunkel, vorn auf dem Kranz wartet eine warme Lichtspur. Sie läuft
//     den Kranz entlang, und an jeder Kerze steigen die vordersten Drohnen am Docht hinauf und werden zur Flamme: erste
//     Kerze, zweite, dritte, vierte. Dieselben Drohnen, keine Wolke; wo die Spur vorbeikommt, leuchten die Zweige nach.
// Wächter: scripts/adventskranz.test.mjs.
import { TAU, GREEN, GOLD, ORANGE, RED, WARM, mix, smooth, hash, yaw, pitch, lightRank, wander } from '../../show-motion.js';
import { assign } from '../../show-flight.js';

const FIR = mix(GREEN, [24, 92, 48], 0.5), FIR2 = mix(GREEN, [40, 120, 70], 0.3), CANDLE = mix(RED, WARM, 0.12), WICK = mix(WARM, ORANGE, 0.4);
const flameTint = (u) => mix(mix(GOLD, WARM, 0.35), ORANGE, Math.max(0, u - 0.35) / 0.65); // u: 0 Docht … 1 Spitze

// ---------------------------------------------------------------------------------------------------------------------
// Linien → genau n Punkte
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)];
const len3 = (a) => Math.hypot(a[0], a[1], a[2] || 0);
/** Sichtbare Stücke einer dichten Linie (hide: Punkte in einem anderen Körper fallen weg). */
function runsOf(line, hide) {
  const src = line.closed ? [...line.pts, line.pts[0]] : line.pts, runs = []; let cur = [];
  for (const p of src) { if (hide && hide(p)) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(p); }
  if (cur.length > 1) runs.push(cur);
  if (line.closed && runs.length === 1 && runs[0].length === src.length) return [{ pts: line.pts, closed: true }];
  return runs.map((pts) => ({ pts, closed: false }));
}
const runLen = ({ pts, closed }) => { let L = 0; for (let i = 1; i < pts.length; i++) L += len3(sub(pts[i], pts[i - 1])); return closed ? L + len3(sub(pts[0], pts[pts.length - 1])) : L; };
function alongRun({ pts, closed }, d) {
  const src = closed ? [...pts, pts[0]] : pts;
  for (let i = 1; i < src.length; i++) { const l = len3(sub(src[i], src[i - 1])); if (d <= l || i === src.length - 1) { const u = l ? Math.min(1, Math.max(0, d / l)) : 0; return [0, 1, 2].map((k) => (src[i - 1][k] || 0) + ((src[i][k] || 0) - (src[i - 1][k] || 0)) * u); } d -= l; }
  return src[src.length - 1];
}
/** Gruppen {tag, lines, w} → je Gruppe Punkte, Anzahl nach sichtbarer Länge × Gewicht; insgesamt genau n. */
function sampleGroups(groups, n, hide) {
  const runs = groups.map((g) => g.lines.flatMap((l) => runsOf(l, g.solid === false ? null : hide))), lens = runs.map((r) => r.map(runLen));
  const weight = groups.map((g, i) => lens[i].reduce((a, b) => a + b, 0) * (g.w ?? 1)), total = weight.reduce((a, b) => a + b, 0);
  const counts = largest(weight.map((w) => (w / total) * n), n);
  return groups.map((g, i) => {
    const c = counts[i], per = largest(lens[i].map((l) => (l / Math.max(1e-9, lens[i].reduce((a, b) => a + b, 0))) * c), c), pts = [];
    runs[i].forEach((r, k) => { const m = per[k], L = lens[i][k]; for (let q = 0; q < m; q++) pts.push(alongRun(r, r.closed ? (q * L) / m : ((q + 0.5) * L) / m)); });
    return { tag: g.tag, pts };
  });
}
/** Ganzzahlige Aufteilung (größte Reste), Summe genau n. */
function largest(xs, n) { const f = xs.map(Math.floor), rest = n - f.reduce((a, b) => a + b, 0); xs.map((x, i) => [x - f[i], i]).sort((a, b) => b[0] - a[0]).slice(0, rest).forEach(([, i]) => f[i]++); return f; }
const ringXZ = (r, y, k = 96) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [Math.cos(a) * r, y, Math.sin(a) * r]; }), closed: true });

// ---------------------------------------------------------------------------------------------------------------------
// 3D: liegender Kranz (Mitte y = WY), Kerzen auf dem Kamm, Blick leicht von oben
export const RW = 1, RT = 0.17, WY = -0.36, CR = 0.09, CH = 0.5, FH = 0.34, FW = 0.085, VIEW = 0.45;
/** Azimut der Kerzen (x = cos, z = sin; vorn = +z); die Lichtspur zündet sie in dieser Reihenfolge. */
export const CANDLE_AT = [0.35, 0.35 + TAU / 4, 0.35 + TAU / 2, 0.35 + (3 * TAU) / 4].map((a) => a + Math.PI / 2);
export const level = (n) => (n >= 750 ? 2 : n >= 500 ? 1 : 0);
const C_Y0 = WY + RT * 0.55, C_Y1 = C_Y0 + CH; // Kerzenfuß (im Kranz) und oberer Rand
const candleAxis = (c) => [Math.cos(CANDLE_AT[c]) * RW, Math.sin(CANDLE_AT[c]) * RW];
/** Schraube um den Kranz: m Windungen, Phase ph, Abstand zur Rohrmitte r. */
const helix = (m, ph, r = RT, k = 900) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU, b = m * a + ph, R = RW + r * Math.cos(b); return [Math.cos(a) * R, WY + r * Math.sin(b), Math.sin(a) * R]; }), closed: true });
/** Flammenform als Tropfen in einer senkrechten Ebene mit Richtung dir (cos, sin), Fuß am Docht. */
const drop = (cx, cz, dir, k = 40) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU, u = (1 - Math.cos(a)) / 2, w = FW * Math.sin(a) * (1 - 0.55 * u) * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.6))); return [cx + Math.cos(dir) * w, C_Y1 + 0.08 + FH * u, cz + Math.sin(dir) * w]; }), closed: true });
const flameU = (p) => Math.max(0, Math.min(1, (p[1] - C_Y1 - 0.08) / FH));

/** Kranz und Kerzen (ohne Flammen): Gruppen mit Linien. Der Kranz ist ein Ring aus Außen- und Innenkante (von oben ein
 * Band), Zweigspitzen ragen nach außen; ab 500 ein Kamm obenauf und Zweige schräg über das Band, ab 750 dichter und mit
 * roten Beeren zwischen den Kerzen. Keine Schraube: die las sich als Spirale, nicht als Tannengrün (Kontaktbogen 1). */
function wreathGroups(n) {
  const L = level(n), g = [{ tag: 'zweig', lines: [ringXZ(RW + RT, WY, 160), ringXZ(RW - RT, WY, 120)] }];
  const tufts = [], k = [14, 22, 30][L];
  for (let q = 0; q < k; q++) {
    const a = ((q + 0.5) / k) * TAU, c = [Math.cos(a), Math.sin(a)], t = [-Math.sin(a), Math.cos(a)], base = [c[0] * (RW + RT + 0.025), WY, c[1] * (RW + RT + 0.025)];
    for (const sgn of [-1, 1]) tufts.push({ pts: Array.from({ length: 6 }, (_, i) => { const u = (i + (sgn > 0 ? 0.35 : 0)) / 5.35; return [base[0] + c[0] * 0.12 * u + t[0] * sgn * 0.065 * u, base[1] + 0.03 * u, base[2] + c[1] * 0.12 * u + t[1] * sgn * 0.065 * u]; }) });
  }
  g.push({ tag: 'spitze', lines: tufts, w: 0.9 });
  if (L >= 1) {
    g.push({ tag: 'kamm', lines: [ringXZ(RW, WY + RT * 0.85, 140)], w: 0.9 });
    // Zweige schräg über das Band: von der Innenkante über den Kamm zur Außenkante, um 0,16 rad versetzt
    const twigs = [], m = L >= 2 ? 40 : 28;
    for (let q = 0; q < m; q++) { const a = (q / m) * TAU; twigs.push({ pts: Array.from({ length: 9 }, (_, i) => { const u = i / 8, r = RW - RT * 0.75 + RT * 1.5 * u, b = a + 0.16 * u, h = WY + RT * 0.95 * Math.sin(Math.PI * (0.15 + 0.7 * u)); return [Math.cos(b) * r, h, Math.sin(b) * r]; }) }); }
    g.push({ tag: 'zweig2', lines: twigs, w: 0.85 });
  }
  const candles = [];
  for (let c = 0; c < 4; c++) {
    const [x, z] = candleAxis(c), lines = [], sides = L >= 1 ? 4 : 3;
    for (let q = 0; q < sides; q++) { const a = (q / sides) * TAU + 0.4; lines.push({ pts: Array.from({ length: 12 }, (_, i) => [x + Math.cos(a) * CR, C_Y0 + (CH * i) / 11, z + Math.sin(a) * CR]) }); }
    lines.push({ pts: Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU; return [x + Math.cos(a) * CR, C_Y1, z + Math.sin(a) * CR]; }), closed: true });
    candles.push({ tag: `kerze${c}`, lines, solid: false, w: 1.15 });
  }
  return [...g, ...candles];
}
/** Punkte der Kerzen und Zweige verdeckt eine Kerze nicht: Zweigpunkte im Kerzenfuß fallen weg. */
const inCandle = (p) => { for (let c = 0; c < 4; c++) { const [x, z] = candleAxis(c); if (Math.hypot(p[0] - x, p[2] - z) < CR + 0.06 && p[1] > WY) return true; } return false; };

/** Flammenplätze einer Kerze (f Drohnen, von der Spitze abwärts geordnet). */
function flameSlots(c, f) {
  const [x, z] = candleAxis(c), a = CANDLE_AT[c];
  // zweiter Tropfen ohne Spitze und Fuß, die teilt er mit dem ersten (sonst stünden dort zwei Drohnen beieinander)
  const B = drop(x, z, a), keep = B.pts.filter((p) => { const u = flameU(p); return u > 0.22 && u < 0.8; }), half = keep.length / 2;
  const lines = [drop(x, z, a + Math.PI / 2), { pts: keep.slice(0, Math.floor(half)) }, { pts: keep.slice(Math.ceil(half)) }];
  // heller Kern ab 30 Drohnen je Flamme; wo die Tropfen sich nahekommen, fällt eine Drohne weg und die Linie bekommt sie zurück
  const core = f >= 30 ? 2 : 0, inner = Array.from({ length: core }, (_, i) => [x, C_Y1 + 0.2 + FH * 0.3 * i, z]);
  const L = lines.reduce((a, l) => a + runLen(l), 0);
  let uniq = [];
  for (let extra = 0; extra < 12; extra++) {
    const m = f - core + extra, thr = (0.62 * L) / m, outline = sampleGroups([{ tag: 'f', lines }], m)[0].pts;
    uniq = [...inner];
    for (const p of outline) if (!uniq.some((q) => len3(sub(p, q)) < thr)) uniq.push(p);
    if (uniq.length >= f) break;
  }
  if (uniq.length > f) { const over = uniq.length - f, drop = new Set(Array.from({ length: over }, (_, q) => core + Math.floor(((q + 0.5) * (uniq.length - core)) / over))); uniq = uniq.filter((_, i) => !drop.has(i)); }
  return uniq.slice(0, f).sort((p, q) => q[1] - p[1]);
}
/** Das Modell: Punkte mit Teilnamen; flames: Drohnen je Flamme. */
export function wreathModel(n) {
  const f = Math.max(8, Math.round(n * 0.042)), wick = 4, rest = n - 4 * f - wick, wg = wreathGroups(n);
  // wo Linien sich kreuzen oder zusammenlaufen (Zweige über den Kamm, Fuß der Zweigspitzen), fällt die spätere Drohne weg,
  // und ihr Platz geht an die Linien zurück, bis es genau passt
  let pts = [], tags = [], extra = 0;
  for (let round = 0; round < 12; round++) {
    const groups = sampleGroups(wg, rest + extra, inCandle), all = groups.flatMap((g) => g.pts.map((p) => [p, g.tag]));
    const total = wg.reduce((a, g) => a + g.lines.reduce((b, l) => b + runLen(l), 0), 0), tau = (0.5 * total) / (rest + extra);
    const grid = new Map(), cell = (p) => p.map((v) => Math.floor(v / tau)).join(','), kept = [];
    for (const [p, tag] of all) {
      const [cx, cy, cz] = p.map((v) => Math.floor(v / tau)); let near = false;
      for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1 && !near; b++) for (let d = -1; d <= 1 && !near; d++) for (const q of grid.get(`${cx + a},${cy + b},${cz + d}`) ?? []) if (len3(sub(p, q)) < tau) { near = true; break; }
      if (near) continue;
      kept.push([p, tag]); const k = cell(p); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p);
    }
    pts = kept.map(([p]) => p); tags = kept.map(([, t]) => t);
    if (kept.length >= rest) break;
    extra += rest - kept.length + 1;
  }
  // zu viele: gleichmäßig verteilt aus den Kranzringen nehmen (einzelne Lücken fallen dort nicht auf)
  const over = pts.length - rest;
  if (over > 0) { const ring = tags.map((t, i) => (t === 'zweig' ? i : -1)).filter((i) => i >= 0), drop = new Set(Array.from({ length: over }, (_, q) => ring[Math.floor(((q + 0.5) * ring.length) / over)])); pts = pts.filter((_, i) => !drop.has(i)); tags = tags.filter((_, i) => !drop.has(i)); }
  for (let c = 0; c < 4; c++) { const [x, z] = candleAxis(c); pts.push([x, C_Y1 + 0.01, z]); tags.push(`docht${c}`); }
  const flameStart = pts.length;
  for (let c = 0; c < 4; c++) for (const p of flameSlots(c, f)) { pts.push(p); tags.push(`flamme${c}`); }
  return { pts, tags, f, flameStart };
}
const colourOf = (tag, p) => (tag.startsWith('zweig') ? (tag === 'zweig2' ? FIR2 : FIR) : tag === 'band' ? GOLD : tag === 'spitze' ? mix(FIR, WARM, 0.15) : tag.startsWith('kerze') ? CANDLE : tag.startsWith('docht') ? WICK : flameTint(flameU(p)));
/** Licht einer Flamme: flackert, heller am Fuß, die Spitze zittert. */
const flicker = (j, t, u) => (1.15 - 0.25 * u) * (0.88 + 0.12 * Math.sin(t * (9 + 5 * hash(j)) + hash(j + 1) * 30) + 0.1 * Math.sin(t * 23 + j));
/** Flammen wiegen sich leicht (Spitze am meisten), Bewegung in Szeneneinheiten. */
const sway3 = (o, c, t, u) => { const p = 1.7 * c, q = 2.3 * c; // die ganze Flamme neigt sich (je Kerze ein Takt), sonst rücken Nachbarn aneinander
  o[0] += 0.012 * u * u * (Math.sin(t * 2.3 + p) - Math.sin(p)); o[2] += 0.012 * u * u * (Math.cos(t * 1.9 + q) - Math.cos(q)); };
/** Drehteller und Blick von oben. */
function view(o, ang) { yaw(o, ang); pitch(o, VIEW, WY, 0); }

// ---------------------------------------------------------------------------------------------------------------------
// 2D: Zeichnung in Linien (Vorderansicht leicht von oben)
const E = { cy: -0.32, rx: 1.12, ry: 0.32, band: 0.16 };
const A2 = [0.35, 0.35 + TAU / 4, 0.35 + TAU / 2, 0.35 + (3 * TAU) / 4].map((a) => -a); // Kerzen versetzt, keine verdeckt eine andere
const on2 = (a, k = 1) => [Math.cos(a) * E.rx * k, E.cy + Math.sin(a) * E.ry * k];
function flat2d(n) {
  const ell = (k) => ({ pts: Array.from({ length: 160 }, (_, i) => { const a = (i / 160) * TAU; return [Math.cos(a) * (E.rx * k), E.cy + Math.sin(a) * (E.ry * k), 0]; }), closed: true });
  const kOut = 1 + E.band / E.rx, kIn = 1 - E.band / E.rx;
  const tufts = [];
  for (let q = 0; q < 16; q++) { const a = ((q + 0.5) / 16) * TAU, base = on2(a, kOut), nx = Math.cos(a) / E.rx, ny = Math.sin(a) / E.ry, l = Math.hypot(nx, ny), d = [nx / l, ny / l], tg = [-d[1], d[0]];
    for (const s of [-1, 1]) tufts.push({ pts: Array.from({ length: 5 }, (_, i) => { const u = (i + (s > 0 ? 0.45 : 0)) / 4.45; // die zweite Linie beginnt nicht im selben Punkt
      return [base[0] + (d[0] * 0.09 + tg[0] * s * 0.085) * u, base[1] + (d[1] * 0.09 + tg[1] * s * 0.085) * u, 0]; }) }); }
  const W2 = 0.085, H2 = 0.58, candles = A2.map((a) => { const [x, y] = on2(a); return { x, y0: y - 0.02, y1: y + H2 }; });
  // Kerze: drei Seiten (der Fuß bleibt offen, die Zweige tragen ihn)
  const rect = ({ x, y0, y1 }) => { const c = [[x - W2, y0, 0], [x - W2, y1, 0], [x + W2, y1, 0], [x + W2, y0, 0]]; return { pts: [0, 1, 2].flatMap((i) => Array.from({ length: 10 }, (_, k) => [c[i][0] + ((c[i + 1][0] - c[i][0]) * k) / 10, c[i][1] + ((c[i + 1][1] - c[i][1]) * k) / 10, 0])).concat([c[3]]), closed: false }; };
  // Kerze und Flamme verdecken den Kranz: seine Linien fallen dort weg (mit Luft)
  const hide = (p) => candles.some((c) => Math.abs(p[0] - c.x) < W2 + 0.05 && p[1] > c.y0 - 0.05 && p[1] < c.y1 + 0.42); // samt Flamme
  const flames = candles.map(({ x, y1 }) => ({ pts: Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * TAU, u = (1 - Math.cos(a)) / 2; return [x + 0.075 * Math.sin(a) * (1 - 0.55 * u) * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.6))), y1 + 0.06 + 0.28 * u, 0]; }), closed: true }));
  const groups = [{ tag: 'aussen', lines: [ell(kOut)] }, { tag: 'innen', lines: [ell(kIn)] }, { tag: 'spitze', lines: tufts, w: 0.8 },
    ...candles.map((c, i) => ({ tag: `kerze${i}`, lines: [rect(c)], solid: false })), ...flames.map((l, i) => ({ tag: `flamme${i}`, lines: [l], solid: false, w: 1.5 }))];
  const out = sampleGroups(groups, n, hide), pts = [], tags = [];
  for (const g of out) for (const p of g.pts) { pts.push(p); tags.push(g.tag); }
  return { pts, tags, candles };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3D+: die Lichtspur. Die Flammen-Drohnen liegen anfangs als goldenes Band um den Kranz, je ein Viertel vor jeder Kerze. Ein
// warmer Lichtkopf läuft das Band entlang; erreicht er eine Kerze, hebt sich das Bandstück davor und zieht sich am Docht
// zur Flamme zusammen. Kurze Wege (ein Viertelbogen), alle Drohnen eines Stücks zugleich und optimal zugeordnet: keine
// Kreuzung. (Erste Fassung: eine Lichtspur als Zug aus allen Flammen-Drohnen, die den ganzen Kranz umrundet; bei 1000 Drohnen
// 24 s lang und an der Kerze zu scharf in der Kurve, Kontaktbogen 1.)
export const SPUR = { wait: 0.7, quarter: 1.15, ramp: 0.5, lift: 0.25, fly: 1.9, glow: 2.6, off: 0.3 };
const BAND_R = RT + 0.08;
/** Bandstück vor Kerze c: eine Welle über dem Kranz auf dem Viertelbogen bis kurz vor die Kerze (eine Schraube um den Kranz
 * streifte die Zweigspitzen). */
function bandPiece(c, f) {
  const a1 = CANDLE_AT[c] - SPUR.off, a0 = a1 - TAU / 4 + 2 * SPUR.off, K = 200;
  const line = { pts: Array.from({ length: K + 1 }, (_, i) => { const u = i / K, a = a0 + (a1 - a0) * u, b = Math.PI / 2 + 0.42 * Math.sin(TAU * u), R = RW + BAND_R * Math.cos(b); return [Math.cos(a) * R, WY + BAND_R * Math.sin(b), Math.sin(a) * R]; }) };
  return sampleGroups([{ tag: 'band', lines: [line] }], f)[0].pts;
}
/** Winkel des Lichtkopfs auf dem Kranz zur Zeit t (er wartet, läuft sanft an, dann gleichmäßig) und wann er Kerze c erreicht. */
const A_START = CANDLE_AT[0] - TAU / 4 + SPUR.off, OMEGA = TAU / 4 / SPUR.quarter;
const headAz = (t) => { const x = Math.max(0, t - SPUR.wait), r = SPUR.ramp; return A_START + OMEGA * (x < r ? (x * x) / (2 * r) : x - r / 2); };
const reach = (c) => SPUR.wait + SPUR.ramp / 2 + (CANDLE_AT[c] - A_START) / OMEGA;
const ease5 = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));

function storyBeat(n, caption) {
  const { pts: rest, tags, f, flameStart } = wreathModel(n);
  // Band: je Kerze f Drohnen auf ihrem Viertel, optimal (Summe der Quadratwege) ihren Flammenplätzen zugeordnet
  const band = new Array(4 * f), groupAz = new Array(4 * f);
  for (let c = 0; c < 4; c++) {
    const piece = bandPiece(c, f), slots = rest.slice(flameStart + c * f, flameStart + (c + 1) * f), flat3 = (l) => Float64Array.from(l.flatMap((p) => [p[0], p[1], p[2]]));
    const a = assign(flat3(slots), flat3(piece)); // Platz i ← Bandpunkt a[i]
    slots.forEach((_, i) => { band[c * f + i] = piece[a[i]]; groupAz[c * f + i] = Math.atan2(piece[a[i]][2], piece[a[i]][0]); });
  }
  const lit = [0, 1, 2, 3].map((c) => reach(c) - SPUR.lift + SPUR.fly), end = lit[3] + SPUR.glow;
  // Richtung vom Kerzenschaft zur Mitte des Bandstücks (in der Ebene): dorthin weicht der Flug aus
  const away = [0, 1, 2, 3].map((c) => { const [ax, az] = candleAxis(c); let sx = 0, sz = 0; for (let i = 0; i < f; i++) { sx += band[c * f + i][0] - ax; sz += band[c * f + i][2] - az; } const l = Math.hypot(sx, sz) || 1; return [sx / l, sz / l]; });
  const unwrap = (az) => { let a = az; while (a < A_START - 0.01) a += TAU; while (a > A_START + TAU - 0.01) a -= TAU; return a; };
  const bandAz = band.map((p) => unwrap(Math.atan2(p[2], p[0])));
  const turn = (t) => (0.16 * Math.max(0, t - 0.6) ** 2) / (1 + Math.max(0, t - 0.6)); // Drehteller läuft sanft an
  const live = (b, j, t, o) => {
    const h = headAz(t), running = t > SPUR.wait && t < reach(3) + 0.4;
    if (j >= flameStart) {
      const q = j - flameStart, c = Math.floor(q / f), slot = rest[j], from = band[q], w = ease5((t - reach(c) + SPUR.lift) / SPUR.fly), u = flameU(slot);
      // das Bandstück hebt sich im Bogen über die Kerze (alle gleich hoch: an den Abständen untereinander ändert das nichts)
      // und hält dabei Abstand zum Kerzenschaft (es weicht zur Seite des Bandes aus)
      const bump = Math.sin(Math.PI * w), side = away[c];
      o[0] = from[0] + (slot[0] - from[0]) * w + side[0] * 0.14 * bump; o[1] = from[1] + (slot[1] - from[1]) * w + 0.32 * bump; o[2] = from[2] + (slot[2] - from[2]) * w + side[1] * 0.14 * bump;
      if (w >= 1) { sway3(o, c, t - lit[c], u); o[3] = flicker(j, t, u) + 0.7 * Math.exp(-(t - lit[c]) / 0.5); }
      else if (w > 0) o[3] = 1.25 + 0.3 * w;
      else { const d = h - bandAz[q]; o[3] = 0.95 + (d > -0.05 ? 0.75 * Math.exp(-Math.max(0, d) / 0.5) * smooth((d + 0.05) / 0.1) : 0); }
    } else {
      const p = rest[j]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
      const tag = tags[j];
      if (tag.startsWith('docht')) { const c = Number(tag.slice(5)); o[3] = 0.3 + 0.8 * smooth((t - lit[c] + 0.3) / 0.4); }
      else if (tag.startsWith('kerze')) { const c = Number(tag.slice(5)); o[3] = 0.8 + 0.3 * smooth((t - lit[c] + 0.3) / 0.8); }
      else if (running) { const d = h - unwrap(Math.atan2(p[2], p[0])); o[3] = 1 + (d > -0.1 ? 0.3 * Math.exp(-Math.max(0, d) / 0.6) * smooth((d + 0.1) / 0.15) : 0); } // die Zweige leuchten hinter dem Kopf nach
    }
    view(o, turn(t));
    return o;
  };
  const colour = (j) => (j >= flameStart ? GOLD : colourOf(tags[j], rest[j]));
  const pts = rest.map((p, j) => { const o = [p[0], p[1], p[2], 1]; live(null, j, 0, o); return [o[0], o[1], o[2], ...colour(j)]; });
  // Bildausschnitt mit den brennenden Flammen (am Anfang liegen ihre Drohnen noch als Band auf dem Kranz)
  const fitPts = rest.map((p) => { const o = [p[0], p[1], p[2], 1]; view(o, 0); return o; });
  return { pts, caption, hold: end, live, shimmer: false, lit, fitPts };
}

export const builders = {
  adventskranz2d: (n, caption) => {
    const { pts, tags } = flat2d(n), rank = lightRank(pts);
    const colour = (tag, p) => (tag === 'aussen' || tag === 'innen' ? FIR : tag === 'spitze' ? mix(FIR, WARM, 0.15) : tag.startsWith('kerze') ? CANDLE : flameTint(Math.max(0, Math.min(1, (p[1] - 0.1) / 0.6))));
    const fy = tags.map((tag, j) => (tag.startsWith('flamme') ? pts[j][1] : 0)), fmin = {};
    tags.forEach((tag, j) => { if (tag.startsWith('flamme')) fmin[tag] = Math.min(fmin[tag] ?? Infinity, fy[j]); });
    const live = (b, j, t, o) => {
      const tag = tags[j];
      if (tag.startsWith('flamme')) { const u = Math.max(0, Math.min(1, (fy[j] - fmin[tag]) / 0.34)); o[3] = flicker(j, t, u); o[0] += 0.01 * u * u * (Math.sin(t * 2.1 + (j % 5)) - Math.sin(j % 5)); }
      else if (!tag.startsWith('kerze')) o[3] = wander(rank[j], t, 6, 0.35, 0.08);
    };
    return { beats: [{ pts: pts.map((p, j) => [p[0], p[1], 0, ...colour(tags[j], p)]), caption, live, shimmer: false }] };
  },
  adventskranz3d: (n, caption) => {
    const { pts, tags, flameStart } = wreathModel(n);
    const turn = (t) => 0.32 * t; // Drehteller (steadyClock lässt ihn sanft anlaufen und auslaufen)
    const live = (b, j, t, o) => {
      const p = pts[j]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
      if (j >= flameStart) { const u = flameU(p); sway3(o, Math.floor((j - flameStart) / ((pts.length - flameStart) / 4)), t, u); o[3] = flicker(j, t, u); }
      else if (tags[j] === 'band') o[3] = 1 + 0.4 * Math.exp(-((((((Math.atan2(p[2], p[0]) - t * 0.9) % TAU) + TAU) % TAU - Math.PI) / 0.35) ** 2));
      view(o, turn(t));
      return o;
    };
    const out = pts.map((p, j) => { const o = [p[0], p[1], p[2], 1]; live(null, j, 0, o); return [o[0], o[1], o[2], ...colourOf(tags[j], p)]; });
    return { beats: [{ pts: out, caption, hold: 7, live, shimmer: false }] };
  },
  adventskranzStory: (n, caption) => {
    const b = storyBeat(n, caption);
    return { beats: [{ pts: b.pts, caption: b.caption, hold: b.hold, live: b.live, shimmer: false, fitPts: b.fitPts }] };
  },
};
