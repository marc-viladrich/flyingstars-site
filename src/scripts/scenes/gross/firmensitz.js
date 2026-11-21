import { t as message } from '../../../i18n/ui.mjs';
// Der Firmensitz (Runde 11b, große Motive, Anlass Jubiläum, ab 700 Drohnen). Kandidat FSK-042 der Motiv-Shortlist
// (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20). Gebaut wie Satellit und Förderband: nur Kanten, eine
// kleine Mechanik, keine Drohne aus dem Nichts.
//   - Das Haus ist ein Turm aus Etagenringen (Deckenkanten), vier Ecksäulen und Fensterpfosten auf Vorder- und
//     Seitenfront. Die Etagenringe liegen anfangs als flacher Stapel auf dem Fundament (die Kletterschalung). Mit jedem
//     Takt hebt sich der Stapel um eine Etage und lässt seinen untersten Ring zurück: das Haus wächst Etage für Etage, und
//     jede Ringdrohne fliegt nur nach oben und hält weich an.
//   - Säulen und Fensterpfosten stehen etwas neben den Ringen (Säulen außen, Fenster zurückgesetzt), damit der Stapel an
//     ihnen vorbeiziehen kann. Sie leuchten auf, wenn ihre Etage steht; die Fenster einen Takt später.
//   - Ein Turmdrehkran (Gittermast, Ausleger mit Zugband, Gegenausleger mit Gewicht, Laufkatze, Seil, Haken) schwenkt
//     ein und hält den Stapel am Haken. Wenn das Haus steht, fliegen seine Drohnen aufs Dach und werden zur Leuchtschrift
//     mit eurer Zahl (25, wie im übrigen Jubiläum).
// Mehr Drohnen kaufen Größe: 6, 8, 10 oder 12 Etagen, ab 850 ein Flachbau daneben, ab 950 eine Antenne auf dem Dach.
//
//   headquarters3d (3D, ab 700): das fertige Haus mit Leuchtschrift auf dem Dach, Licht geht Etage für Etage an, das Haus
//     schwenkt langsam.
//   headquartersStory (3D+, ab 700): Fundament und Kran → Etage für Etage → die Fenster folgen → der Kran wird zur
//     Leuchtschrift.
// Steht im Jubiläum direkt hinter dem LKW (Baustelle). Wächter: scripts/firmensitz.test.mjs.
import { TAU, GOLD, WARM, CYAN, BLUE, DIAMOND, ORANGE, mix, smooth, yaw, pitch, part, act } from '../../show-motion.js';
import { curves, spot, assemble } from '../catalog-3d/kit.js';
import { assign } from '../../show-flight.js';

const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const rect = (hx, y, hz, cx = 0, cz = 0) => ({ pts: [[cx - hx, y, cz - hz], [cx + hx, y, cz - hz], [cx + hx, y, cz + hz], [cx - hx, y, cz + hz]], closed: true });

/** Detailstufe nach Drohnen: 0 bis 549, 1 bis 849, 2 bis 949, 3 ab 950. */
// Runde 11c (Marc: „wir müssen nicht alles in 500+ reinforcen“): ab 400 mit 6 Etagen, mehr Drohnen machen das Haus höher
export const hqLevel = (n) => (n >= 950 ? 3 : n >= 850 ? 2 : n >= 550 ? 1 : 0);
const FLOORS = [6, 8, 10, 12];

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (x Front, y oben, z zum Publikum)
// ---------------------------------------------------------------------------------------------------------------------
const HX = 0.42, HZ = 0.28, Y0 = -0.9, FH = 0.13, STACK = 0.052; // Grundriss, Fundament, Etagenhöhe, Stapelabstand
const COL = 0.03, WIN = 0.034; // Säulen außen versetzt, Fenster zurückgesetzt
const top = (lv) => Y0 + FLOORS[lv] * FH;
const CRANE = { x: 1.0, z: -0.12, jib: 1.0, counter: 0.38 };
const craneTop = (lv) => top(lv) + 0.36; // Auslegerhöhe
const SIGN = (lv) => ({ cy: top(lv) + 0.36, hx: 0.5, hy: 0.24 });

/** Haus: Fundament, Etagenringe (Index 1 … N), Säulen, Fenster; ab Stufe 1 Flachbau, ab Stufe 2 Antenne. */
function houseParts(lv) {
  const N = FLOORS[lv], P = [];
  P.push(curves('fundament', [rect(HX + 0.12, Y0 - 0.035, HZ + 0.1), rect(HX, Y0, HZ)], { w: 1 }));
  for (let k = 1; k <= N; k++) P.push(curves(`ring${k}`, [rect(HX, Y0 + k * FH, HZ)], { w: 1.05 }));
  P.push(curves('saeule', [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [[a * (HX + COL), Y0, b * (HZ + COL)], [a * (HX + COL), top(lv), b * (HZ + COL)]]), { w: 1.1 }));
  // Fensterpfosten: Vorderfront 5, Seitenfront rechts 3, je zwischen zwei Decken (kurze Stücke, damit sie Etage für Etage angehen)
  const win = [];
  for (let k = 0; k < N; k++) {
    const y0 = Y0 + k * FH + 0.02, y1 = Y0 + (k + 1) * FH - 0.02;
    for (let i = 1; i <= 5; i++) { const x = -HX + (2 * HX * i) / 6; win.push([[x, y0, HZ - WIN], [x, y1, HZ - WIN]]); }
    for (let i = 1; i <= 3; i++) { const z = -HZ + (2 * HZ * i) / 4; win.push([[HX - WIN, y0, z], [HX - WIN, y1, z]]); }
  }
  P.push(curves('fenster', win, { w: 0.8 }));
  if (lv >= 2) {
    const x0 = -HX - 0.62, x1 = -HX - 0.06, h = Y0 + 2.4 * FH, c = (x, y, z) => [x, y, z];
    P.push(curves('flachbau', [{ pts: [c(x0, h, -0.2), c(x1, h, -0.2), c(x1, h, 0.22), c(x0, h, 0.22)], closed: true }, ...[[x0, -0.2], [x0, 0.22], [x1, 0.22]].map(([x, z]) => [c(x, Y0, z), c(x, h, z)]), ...[1, 2, 3].map((i) => [c(x0 + ((x1 - x0) * i) / 4, Y0 + 0.03, 0.22), c(x0 + ((x1 - x0) * i) / 4, h - 0.03, 0.22)])], { w: 0.8 }));
  }
  if (lv >= 3) P.push(curves('antenne', [[[0.1, top(lv), 0], [0.1, top(lv) + 0.2, 0]]]), spot('antennenlicht', [0.1, top(lv) + 0.22, 0], 1));
  return P;
}
/** Kran in Ruhelage (Ausleger über dem Haus, Seil bis zur Hakenhöhe hook). Der Schwenk kommt in der Bewegung dazu. */
function craneParts(lv, hook) {
  const C = CRANE, yT = craneTop(lv), x = C.x, z = C.z, w = 0.045, P = [];
  const zig = []; for (let y = Y0, k = 0; y < yT - 0.05; y += 0.16, k++) zig.push([x + (k % 2 ? w : -w), y, z]);
  P.push(curves('mast', [[[x - w, Y0, z], [x - w, yT, z]], [[x + w, Y0, z], [x + w, yT, z]], zig], { w: 0.85 }));
  P.push(curves('ausleger', [[[x, yT, z], [x - C.jib, yT, z]], [[x, yT + 0.24, z], [x - C.jib, yT + 0.02, z]], [[x, yT + 0.24, z], [x + C.counter, yT + 0.02, z]], [[x, yT, z], [x + C.counter, yT, z]], [[x, yT, z], [x, yT + 0.24, z]]], { w: 0.95 }));
  P.push(curves('gewicht', [rect(0.06, yT - 0.04, 0.05, x + C.counter - 0.06, z)], { w: 0.9 }));
  P.push(curves('seil', [[[0, yT - 0.03, z], [0, hook + 0.03, z]]], { w: 0.3 }), // wenige Drohnen: das Seil wird beim Wachsen kurz
     spot('haken', [0, hook, z], 3, 0.025));
  return P;
}
/** Leuchtschrift „25“ mit Rahmen und zwei Stützen auf dem Dach (Ziel der Krandrohnen; im 3D steht sie von Anfang an). */
function signLines(lv) {
  const S = SIGN(lv), cy = S.cy, q = (x, y) => [x, cy + y, 0];
  const arc = (cx, cyy, r, a0, a1, k = 12) => Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return q(cx + Math.cos(a) * r, cyy + Math.sin(a) * r * 1.05); });
  const two = [...arc(-0.2, 0.07, 0.1, Math.PI * 0.95, -0.25 * Math.PI), q(-0.3, -0.16), q(-0.08, -0.16)];
  const five = [q(0.3, 0.17), q(0.1, 0.17), q(0.09, 0.03), ...arc(0.19, -0.05, 0.1, Math.PI * 0.7, -Math.PI * 0.75), q(0.08, -0.12)];
  return [{ pts: [q(-S.hx, -S.hy), q(S.hx, -S.hy), q(S.hx, S.hy), q(-S.hx, S.hy)], closed: true }, two, five, [q(-0.3, -S.hy - 0.04), [-0.3, top(lv) + 0.03, 0]], [q(0.3, -S.hy - 0.04), [0.3, top(lv) + 0.03, 0]]];
}

/** Modell: Hausdrohnen (Ring-Index oder Teil), Krandrohnen mit Ziel in der Leuchtschrift. */
export function hqModel(n, { crane = true } = {}) {
  const lv = hqLevel(n), N = FLOORS[lv], stackTop = Y0 + N * STACK;
  const house = houseParts(lv);
  // Stapel: Ring k liegt anfangs bei Y0 + k·STACK (Ruhelage für assemble ist der Stapel, damit die Abstände dort stimmen)
  const stacked = house.map((p) => (p.tag.startsWith('ring') ? { ...p, lines: p.lines.map((l) => ({ ...l, pts: l.pts.map(([x, , z]) => [x, Y0 + +p.tag.slice(4) * STACK, z]) })) } : p));
  const parts = crane ? [...stacked, ...craneParts(lv, stackTop + 0.12)] : [...house, curves('schild', signLines(lv), { w: 1.2 })];
  const { pts, tags } = assemble(parts, n);
  const ring = tags.map((t) => (t.startsWith('ring') ? +t.slice(4) : 0));
  // Seil: Anteil von der Laufkatze (0) bis zum Haken (1); Haken: Lage relativ zur Hakenhöhe
  const yT = craneTop(lv), hook0 = stackTop + 0.12, ropeF = pts.map((p, j) => (tags[j] === 'seil' ? (yT - 0.03 - p[1]) / (yT - 0.03 - (hook0 + 0.03)) : 0));
  const hookOff = pts.map((p, j) => (tags[j] === 'haken' ? p[1] - hook0 : 0));
  let target = null;
  if (crane) {
    // Ziel jeder Krandrohne in der Leuchtschrift: optimale Zuordnung (kürzeste Wege, keine Kreuzungen)
    const ci = tags.map((t, j) => j).filter((j) => CRANE_TAGS.has(tags[j])), lines = signLines(lv), sp = sampleLines(lines, ci.length);
    const from = Float64Array.from(ci.flatMap((j) => cranePoint(pts[j], tags[j], 1, top(lv) + 0.12, lv, ropeF[j], hookOff[j]))), to = Float64Array.from(sp.flat());
    const m = assign(from, to);
    target = new Map(ci.map((j, r) => [j, sp[m[r]]]));
  }
  return { lv, N, pts, tags, ring, target, stackTop, ropeF, hookOff };
}
const CRANE_TAGS = new Set(['mast', 'ausleger', 'gewicht', 'seil', 'haken']);
/** Genau n Punkte auf Polylinien, gleichmäßig, ohne zwei Punkte zu nah an spitzen Ecken (der „2“): feiner abtasten,
 * zu nahe Punkte verwerfen, bis genau n bleiben. */
function sampleLines(lines, n) {
  for (let extra = 0; extra < n; extra += 2) {
    const raw = sampleEven(lines, n + extra), gap = 0.6 * (lineTotal(lines) / (n + extra)), kept = [];
    for (const p of raw) if (!kept.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < gap)) kept.push(p);
    if (kept.length >= n) return kept.length === n ? kept : thinOut(kept, n);
  }
  return sampleEven(lines, n);
}
/** Überzählige Punkte weg, jeweils der mit dem knappsten Nachbarn. */
function thinOut(pts, n) {
  const out = [...pts];
  while (out.length > n) {
    let worst = 0, wd = Infinity;
    out.forEach((p, i) => { for (let j = 0; j < out.length; j++) if (j !== i) { const d = Math.hypot(p[0] - out[j][0], p[1] - out[j][1], p[2] - out[j][2]); if (d < wd) { wd = d; worst = i; } } });
    out.splice(worst, 1);
  }
  return out;
}
const lineTotal = (lines) => lines.reduce((s, l) => { const p = Array.isArray(l) ? l : l.closed ? [...l.pts, l.pts[0]] : l.pts; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]); return s; }, 0);
/** Gleichmäßig verteilte Punkte auf Polylinien. */
function sampleEven(lines, n) {
  const segs = []; for (const l of lines) { const p = Array.isArray(l) ? l : l.closed ? [...l.pts, l.pts[0]] : l.pts; for (let i = 1; i < p.length; i++) segs.push([p[i - 1], p[i], Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2])]); }
  const total = segs.reduce((s, g) => s + g[2], 0), out = []; let s = 0, along = 0;
  for (let k = 0; k < n; k++) { const d = ((k + 0.5) * total) / n; while (s < segs.length - 1 && d - along > segs[s][2]) { along += segs[s][2]; s++; } const [a, b, L] = segs[s], u = L ? Math.min(1, (d - along) / L) : 0; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); }
  return out;
}
/** Krandrohne in Ruhelage → Lage: Ausleger um den Mast geschwenkt (swing 1 = über dem Haus, 0 = nach hinten); Seil und
 * Haken hängen an der Laufkatze, das Seil teilt sich gleichmäßig bis zur Hakenhöhe hookY (f = Anteil von oben). */
function cranePoint(p, tag, swing, hookY, lv, f = 0, off = 0) {
  const C = CRANE, yT = craneTop(lv);
  let [x, y, z] = p;
  if (tag === 'seil') y = lerp(yT - 0.03, hookY + 0.03, f);
  else if (tag === 'haken') y = hookY + off;
  if (tag !== 'mast') { const a = (1 - swing) * (Math.PI / 2), dx = x - C.x, dz = z - C.z; x = C.x + dx * Math.cos(a) - dz * Math.sin(a); z = C.z + dx * Math.sin(a) + dz * Math.cos(a); }
  return [x, y, z];
}

// ---------------------------------------------------------------------------------------------------------------------
// Zeitplan der Geschichte
// ---------------------------------------------------------------------------------------------------------------------
/** Takt je Etage: bei vielen Etagen etwas schneller, damit die Geschichte nicht zu lang wird. */
const stepOf = (N) => (N >= 10 ? 0.72 : N <= 6 ? 0.95 : 0.85);
function timeline(N) {
  const step = stepOf(N), dur = step - 0.06, t0 = 3.4, land = Array.from({ length: N + 1 }, (_, k) => (k ? t0 + (k - 1) * step + dur : 0));
  const A2 = t0 - 0.2, A3 = land[N] + 0.5, A4 = A3 + 2.6, END = A4 + 7.2;
  return { step, dur, t0, land, ACT: [0, A2, A3, A4, END], beat: 0.9, fly: [A4 + 0.3, 3.2] };
}
/** Höhe des Rings j zur Zeit T (Stapel → seine Etage, nur nach oben, weich). */
const ringY = (j, T, tl) => { let y = Y0 + j * STACK; for (let k = 1; k <= j; k++) y += (FH - STACK) * ease((T - tl.t0 - (k - 1) * tl.step) / tl.dur); return y; };

const COLOURS = {
  fundament: mix(BLUE, DIAMOND, 0.4), saeule: WARM, fenster: GOLD, flachbau: mix(DIAMOND, BLUE, 0.35), antenne: WARM, antennenlicht: ORANGE,
  mast: ORANGE, ausleger: ORANGE, gewicht: mix(ORANGE, GOLD, 0.4), seil: WARM, haken: GOLD, schild: GOLD,
};
const colourOf = (tag) => (tag.startsWith('ring') ? mix(DIAMOND, CYAN, 0.25) : COLOURS[tag] ?? WARM);
const view = (o, ya) => { yaw(o, ya); pitch(o, 0.12); return o; };
/** Etage einer Fensterdrohne (0 … N−1). */
const floorOf = (p) => Math.max(0, Math.floor((p[1] - Y0) / FH));

export const builders = {
  headquarters3d: (n, caption) => {
    const m = hqModel(n, { crane: false }), col = m.tags.map(colourOf), H = 14;
    const ya = (T) => 0.5 + 0.3 * smooth(T / 3) * Math.sin((T * TAU) / 16);
    const at = (T) => m.pts.map((p, j) => [...view([p[0], p[1], p[2]], ya(T)), ...col[j]]);
    const fitPts = [0, 4, 8, 12, H].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    return { beats: [{ ...act([part('haus', at(0), { rigid: true })], { caption, hold: H, live: (b, j, t, o) => {
      const p = m.pts[j]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; view(o, ya(t));
      const tag = m.tags[j];
      // Licht geht Etage für Etage an und wieder etwas zurück (eine Welle läuft das Haus hinauf), die Schrift glänzt
      if (tag === 'fenster') { const u = floorOf(p) / m.N; o[3] = 0.55 + 0.75 * Math.exp(-(((((t / 4) % 1.4) - 0.2 - u) / 0.12) ** 2)); }
      else if (tag === 'schild') o[3] = 1.1 + 0.3 * Math.exp(-((((p[0] + 0.6) - ((t * 0.5) % 2.2)) / 0.15) ** 2));
      else if (tag === 'antennenlicht') o[3] = 0.6 + 0.9 * (Math.sin(t * 3) > 0.6 ? 1 : 0.2);
    } }), fitPts }] };
  },

  headquartersStory: (n) => {
    const m = hqModel(n), tl = timeline(m.N), col = m.tags.map(colourOf);
    const ya = (T) => 0.5 + 0.08 * Math.sin((T * TAU) / 22);
    const pose = (j, T, o) => {
      const p = m.pts[j], tag = m.tags[j];
      if (m.ring[j]) { o[0] = p[0]; o[1] = ringY(m.ring[j], T, tl); o[2] = p[2]; }
      else if (CRANE_TAGS.has(tag)) {
        const swing = ease((T - 0.3) / 2.5), hookY = ringY(m.N, T, tl) + 0.12;
        const c = cranePoint(p, tag, swing, hookY, m.lv, m.ropeF[j], m.hookOff[j]);
        // zuletzt: der Kran wird zur Leuchtschrift. Gerade Wege (die Zuordnung ist für gerade Wege ohne Kreuzung berechnet)
        // plus ein für alle gleicher Bogen nach oben: die Abstände untereinander bleiben die der geraden Wege
        const g = m.target.get(j), u = ease((T - tl.fly[0]) / tl.fly[1]);
        if (u > 0) { o[0] = lerp(c[0], g[0], u); o[1] = lerp(c[1], g[1], u) + 0.3 * Math.sin(Math.PI * u); o[2] = lerp(c[2], g[2], u); }
        else { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }
      } else { o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
      return view(o, ya(T));
    };
    const light = (j, T) => {
      const p = m.pts[j], tag = m.tags[j];
      // Ringe im Stapel leuchten gedämpft (der Stapel soll nicht als gefüllter Block wirken), gesetzte voll
      if (m.ring[j]) { const k = m.ring[j]; return 0.38 + 0.62 * smooth((T - tl.land[k] + 0.3) / 0.5); }
      if (tag === 'saeule' || tag === 'flachbau') { const built = Y0 + FH * tl.land.filter((t, k) => k && T >= t).length; return 0.1 + 0.9 * smooth((built - p[1] + 0.06) / 0.12); }
      if (tag === 'fenster') { const k = floorOf(p) + 1, s = T - tl.land[Math.min(m.N, k)] - tl.beat; return 0.06 + (s > 0 ? smooth(s / 0.4) * (1.25 + 0.6 * Math.exp(-s / 0.6)) : 0) + (T > tl.ACT[3] ? 0.25 * Math.exp(-(((((T - tl.ACT[3]) * 0.5) % 1.6 - k / m.N) / 0.1) ** 2)) : 0); }
      if (tag === 'antenne' || tag === 'antennenlicht') return T > tl.land[m.N] ? (tag === 'antennenlicht' ? 0.6 + 0.9 * (Math.sin(T * 3) > 0.6 ? 1 : 0.2) : 1) : 0.1;
      if (CRANE_TAGS.has(tag)) { const u = (T - tl.fly[0]) / tl.fly[1]; return u > 0.85 ? 1.1 + 0.35 * Math.exp(-((((p[0] + 1.6) - (((T - tl.fly[0]) * 0.6) % 3)) / 0.2) ** 2)) : 1; }
      return 1;
    };
    const at = (T) => m.pts.map((_, j) => [...pose(j, T, [0, 0, 0]), ...col[j]]);
    const { ACT } = tl, keyT = [0, 2.8, ACT[1] + 2, (ACT[1] + ACT[2]) / 2, ACT[2], ACT[3], tl.fly[0] + 1.5, ACT[4]];
    const fitPts = keyT.flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    const caps = ['firmensitz.foundation', 'firmensitz.grows', 'firmensitz.windows', 'firmensitz.number'];
    return { beats: caps.map((key, a) => ({ ...act([part('haus', at(ACT[a]), { rigid: true })], { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (b, j, t, o) => {
      const T = ACT[a] + t; pose(j, T, o); o[3] = light(j, T);
    } }), fitPts })) };
  },
};
/** Für Wächter und Werkzeuge: Teilname jeder Drohne. */
export const labelOf = (name, n, j) => hqModel(n, { crane: name !== 'headquarters3d' }).tags[j];
export { timeline, FLOORS, Y0, FH };
