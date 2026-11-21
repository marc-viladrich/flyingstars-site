import { t as message } from '../../../i18n/ui.mjs';
// Das Schallfeld (Runde 11b, große Motive, ab 900 Drohnen, in Kultur und Stadtfest dieselbe Fassung). Kandidat FSK-029 der
// Motiv-Shortlist (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Audio visualizer waveform ·
// 800“ (dort ein gefüllter Pegelberg; hier nur Linien).
// Gebaut wie Satellit und Krake: wenige klare Körper, nur Linien. Lesbar an drei Zeichen: zwei Lautsprecherboxen (zwölf
// Kanten, Tieftöner aus drei Ringen, Hochtöner), leicht zur Mitte gedreht; zwischen ihnen ein Feld aus parallelen
// Linien, wie ein Wellenbecken von schräg oben gesehen. Jede Feldlinie ist eine Reihe von Drohnen, die sich nur senkrecht
// bewegen: ihre Höhe ist die Summe der Wellen beider Lautsprecher (Kreiswellen, die mit dem Abstand schwächer werden).
// So entsteht die Interferenz von selbst: wo zwei Wellenberge zusammentreffen, hebt sich das Feld doppelt und leuchtet
// hell, wo Berg auf Tal trifft, bleibt es still und dunkel. Die Membranen schwingen sichtbar im Takt (die Ringe von
// Konus und Staubkappe bewegen sich vor und zurück, die Sicke bleibt). Ab 1000 Drohnen wird das Feld größer (elf statt neun
// Linien, tiefer in den Raum), nicht dichter.
//
//   soundField3d (3D, ab 900): beide Lautsprecher spielen, das Interferenzmuster läuft über das Feld, die Ansicht schwenkt.
//   soundFieldStory (3D+, ab 900): vier Akte. Stille, das Feld liegt flach → der linke spielt, Kreiswellen laufen über das
//     Feld → der rechte setzt ein, die Wellen überlagern sich zu hellen und dunklen Bahnen → Drop: einen Takt lang Stille,
//     dann schlagen beide hart, das ganze Feld bebt im Takt und blitzt auf den Bergen.
// Wächter: scripts/schallfeld.test.mjs.
import { TAU, CYAN, BLUE, VIOLET, DIAMOND, PINK, WARM, GOLD, mix, smooth, yaw, pitch, part, act, share } from '../../show-motion.js';
import { curves, spot, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const circle3 = (c, r, e1, e2, k = 40) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [c[0] + r * (Math.cos(a) * e1[0] + Math.sin(a) * e2[0]), c[1] + r * (Math.cos(a) * e1[1] + Math.sin(a) * e2[1]), c[2] + r * (Math.cos(a) * e1[2] + Math.sin(a) * e2[2])]; }), closed: true });

/** Detailstufe nach Drohnen: 0 bis 999, 1 (größeres Feld) ab 1000. */
export const fieldLevel = (n) => (n >= 1000 ? 1 : 0);
const PITCH = 0.36;

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (y oben, z zum Publikum; das Feld liegt bei y = 0)
// ---------------------------------------------------------------------------------------------------------------------
const BOX = { hx: 0.26, y0: 0.0, y1: 1.12, hz: 0.21 };
const SPK = [{ s: -1, c: [-1.42, 0, -0.12], turn: 0.5 }, { s: 1, c: [1.42, 0, -0.12], turn: -0.5 }];
const WOOF = { y: 0.36, R: [0.19, 0.13, 0.055] }, TWEET = { y: 0.86, r: 0.065 };
const FIELD = { x: 0.98, y: 0.3 }; // auf Höhe der Tieftöner
/** Feldlinien: ab Stufe 1 elf statt neun, tiefer in den Raum (größer, nicht dichter). */
const rowsOf = (lv) => (lv ? { z0: -0.9, z1: 0.9, rows: 11 } : { z0: -0.72, z1: 0.72, rows: 9 });
/** Punkt im Rahmen eines Lautsprechers (x quer, y hoch, z nach vorn) in Weltkoordinaten. */
const toWorld = (spk, p) => { const c = Math.cos(spk.turn), s = Math.sin(spk.turn); return [spk.c[0] + p[0] * c + p[2] * s, spk.c[1] + p[1], spk.c[2] - p[0] * s + p[2] * c]; };
const frontOf = (spk) => [Math.sin(spk.turn), 0, Math.cos(spk.turn)];
const sideOf = (spk) => [Math.cos(spk.turn), 0, -Math.sin(spk.turn)];
function boxEdges(hx, y0, y1, hz, map) {
  const c = (sx, sy, sz) => map([sx * hx, sy ? y1 : y0, sz * hz]), e = [];
  for (const sz of [-1, 1]) e.push({ pts: [c(-1, 0, sz), c(1, 0, sz), c(1, 1, sz), c(-1, 1, sz)], closed: true });
  for (const sx of [-1, 1]) for (const sy of [0, 1]) e.push([c(sx, sy, -1), c(sx, sy, 1)]);
  return e;
}
/** Teile der Lautsprecher: Gehäuse, Sicke (fest), Konus und Staubkappe (schwingen), Hochtöner. */
function speakerParts() {
  const parts = [];
  for (const spk of SPK) {
    const k = spk.s < 0 ? 'L' : 'R', f = frontOf(spk), sd = sideOf(spk), up = [0, 1, 0];
    parts.push(curves(`box${k}`, boxEdges(BOX.hx, BOX.y0, BOX.y1, BOX.hz, (p) => toWorld(spk, p)), { w: 1 }));
    const wc = toWorld(spk, [0, WOOF.y, BOX.hz + 0.005]), tc = toWorld(spk, [0, TWEET.y, BOX.hz + 0.005]);
    parts.push(curves(`sicke${k}`, [circle3(wc, WOOF.R[0], sd, up, 56)], { w: 1.15 }));
    parts.push(curves(`konus${k}`, [circle3(wc.map((v, i) => v + f[i] * 0.03), WOOF.R[1], sd, up, 40)], { w: 1.15 }));
    parts.push(spot(`kappe${k}`, wc.map((v, i) => v + f[i] * 0.045), 5, WOOF.R[2], f));
    parts.push(curves(`hoch${k}`, [circle3(tc, TWEET.r, sd, up, 24)], { w: 1.1 }), spot(`hochkern${k}`, tc.map((v, i) => v + f[i] * 0.02), 1, 0.01, f));
  }
  return parts;
}
/** Wellenquellen in der Feldebene: Tieftöner links und rechts. */
const SOURCES = SPK.map((spk) => { const w = toWorld(spk, [0, 0, BOX.hz]); return [w[0], w[2]]; });

/** Das Modell: Lautsprecherteile | Feldlinien (Reihe, x, z, Abstände zu den Quellen). */
export function fieldModel(n) {
  const lv = fieldLevel(n), parts = speakerParts(), FR = rowsOf(lv);
  const lineLen = (l) => { const p = l.closed ? [...l.pts, l.pts[0]] : l.pts; let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]); return L; };
  const spkLen = parts.reduce((s, p) => s + (p.lines ? p.lines.reduce((a, l) => a + lineLen(l), 0) * (p.w ?? 1) : 0), 0) + 30 * 0.05;
  const fieldLen = FR.rows * 2 * FIELD.x * 1.08;
  const [ns, nf] = share(n, [spkLen, fieldLen]);
  const spk = assemble(parts, ns);
  const rows = share(nf, Array(FR.rows).fill(1)), slots = [];
  rows.forEach((c, i) => { const z = lerp(FR.z0, FR.z1, i / (FR.rows - 1)); for (let q = 0; q < c; q++) { const x = -FIELD.x + (2 * FIELD.x * (q + 0.5)) / c; slots.push({ i, x, z, r: SOURCES.map(([sx, sz]) => Math.hypot(x - sx, z - sz)) }); } });
  return { lv, spk, slots, S: spk.pts.length, FR };
}

// ---------------------------------------------------------------------------------------------------------------------
// Wellen: Kreiswellen je Quelle, gedämpft mit dem Abstand; Amplituden je Quelle über die Zeit
// ---------------------------------------------------------------------------------------------------------------------
const K = TAU / 0.62, OMEGA = TAU * 0.55, AMP = 0.085;
/** Feldhöhe einer Drohne: amps[k] Amplitude der Quelle k, ph gemeinsame Phase (ω·t, als Integral, damit das Tempo weich wechseln kann). */
const height = (q, amps, ph) => { let y = 0; for (let k = 0; k < amps.length; k++) if (amps[k]) y += (amps[k] * AMP * Math.cos(K * q.r[k] - ph)) / Math.sqrt(0.35 + q.r[k]); return y; };
/** Membranhub: Konus und Staubkappe im Takt (Periode beat s), um die Achse des Lautsprechers. */
const BEAT = 0.82, CONE = 0.03;

function phaseTable(omega, Tmax) {
  const dt = 0.01, k = Math.ceil(Tmax / dt) + 2, phi = new Float64Array(k + 1);
  for (let i = 1; i <= k; i++) phi[i] = phi[i - 1] + 0.5 * (omega((i - 1) * dt) + omega(i * dt)) * dt;
  return (T) => { const f = Math.max(0, Math.min(k, T / dt)), i = Math.min(k - 1, Math.floor(f)); return lerp(phi[i], phi[i + 1], f - i); };
}

function scene(m, st) {
  const { S, spk, slots } = m, f = SPK.map(frontOf);
  let at = NaN, s = null;
  const ready = (T) => { if (T !== at) { at = T; s = st(T); } };
  const pose = (j, T, o) => {
    ready(T);
    if (j < S) {
      const p = spk.pts[j], t = spk.tags[j];
      o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
      const side = t.endsWith('L') ? 0 : t.endsWith('R') ? 1 : -1;
      if (side >= 0 && (t.startsWith('konus') || t.startsWith('kappe'))) { const d = s.pump[side] * (t.startsWith('kappe') ? 1.1 : 1); for (let c = 0; c < 3; c++) o[c] += f[side][c] * d; }
    } else { const q = slots[j - S]; o[0] = q.x; o[1] = FIELD.y + height(q, s.amps, s.ph); o[2] = q.z; }
    yaw(o, s.yaw); pitch(o, PITCH);
    return o;
  };
  return { pose, state: (T) => { ready(T); return s; } };
}
/** Pumpen der Membran: weicher Schlag (vorn kurz, zurück langsam), Hub a. */
const pump = (phase, a) => a * CONE * (Math.sin(phase) * 0.8 + 0.2 * Math.sin(2 * phase));

const colourOf = (m, j) => {
  if (j >= m.S) { const q = m.slots[j - m.S], u = (q.z - m.FR.z0) / (m.FR.z1 - m.FR.z0); return mix(mix(VIOLET, BLUE, 0.35), CYAN, u); }
  const t = m.spk.tags[j];
  if (t.startsWith('box')) return mix(DIAMOND, BLUE, 0.35);
  if (t.startsWith('hoch')) return WARM;
  if (t.startsWith('kappe')) return GOLD;
  return mix(PINK, VIOLET, 0.3); // Sicke und Konus
};
/** Licht: Wellenberge hell, Täler dunkel; Membranen blitzen beim Schlag. */
function lightOf(m, j, s, extra = 0) {
  if (j >= m.S) {
    const q = m.slots[j - m.S], y = height(q, s.amps, s.ph), on = Math.min(1, s.amps.reduce((a, b) => a + b, 0));
    return 0.62 + 0.18 * (1 - on) + (on > 0 ? Math.max(-0.35, Math.min(1.3, (y / AMP) * 1.6)) * 0.55 : 0) + extra;
  }
  const t = m.spk.tags[j], side = t.endsWith('L') ? 0 : t.endsWith('R') ? 1 : -1;
  if (side < 0) return 0.85;
  return 0.8 + 0.9 * Math.max(0, s.pump[side] / CONE) * Math.min(1, s.amps[side] * 1.5) + (t.startsWith('hoch') ? 0.2 : 0);
}
const groupsOf = (m, pts) => [part('lautsprecher', pts.slice(0, m.S), { rigid: true }), part('feld', pts.slice(m.S), { rigid: true })];

export const builders = {
  soundField3d: (n, caption) => {
    const m = fieldModel(n), col = Array.from({ length: n }, (_, j) => colourOf(m, j));
    const ph = phaseTable((T) => OMEGA * ease(T / 2), 30), beat = phaseTable((T) => (TAU / BEAT) * ease(T / 1.5), 30);
    const st = (T) => { const on = ease(T / 2.5), a = Math.min(1, 1.2 * ease((T - 0.3) / 2.4)), p = beat(T); return { amps: [a, a], ph: ph(T), pump: [pump(p, on), pump(p, on)], yaw: 0.34 * Math.sin((T * TAU) / 16) * ease(T / 3) }; };
    const sc = scene(m, st), H = 14;
    const at = (T) => Array.from({ length: n }, (_, j) => [...sc.pose(j, T, [0, 0, 0]), ...col[j]]);
    const fitPts = [0, 4, 8, 12].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    return { beats: [{ ...act(groupsOf(m, at(0)), { caption, hold: H, live: (p, j, t, o) => { sc.pose(j, t, o); o[3] = lightOf(m, j, sc.state(t)); } }), fitPts }] };
  },

  soundFieldStory: (n) => {
    const m = fieldModel(n), col = Array.from({ length: n }, (_, j) => colourOf(m, j));
    const ACT = [0, 3, 8, 14, 21], DROP = 14.3, HIT = 15.4;
    // Tempo: ruhig, im Drop schneller und härter (als Integral: kein Sprung in der Phase)
    const ph = phaseTable((T) => OMEGA * (ease((T - 3) / 1.2) + 0.18 * ease((T - HIT) / 1.2)), 30);
    const beat = phaseTable((T) => (TAU / BEAT) * (1 + 0.12 * ease((T - HIT) / 1.2)), 30);
    const st = (T) => {
      const gap = 1 - ease((T - DROP) / 0.6) * (1 - ease((T - HIT) / 1.1)); // der Drop: einen Takt lang Stille
      const L = ease((T - 3.2) / 2.2) * gap * (1 + 0.15 * ease((T - HIT) / 0.9)), R = ease((T - 8.3) / 2.2) * gap * (1 + 0.15 * ease((T - HIT) / 0.9));
      const p = beat(T);
      return { amps: [L, R], ph: ph(T), pump: [pump(p, L), pump(p, R)], yaw: 0.26 * Math.sin((T * TAU) / 22) * ease(T / 3) };
    };
    const sc = scene(m, st);
    const at = (T) => Array.from({ length: n }, (_, j) => [...sc.pose(j, T, [0, 0, 0]), ...col[j]]);
    const fitPts = [0, 6, 12, 16, 18, 20].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    // im Drop blitzt das Feld bei jedem Schlag von der Mitte nach außen
    const flash = (j, T) => { if (T < HIT || j < m.S) return 0; const q = m.slots[j - m.S], b = ((beat(T) / TAU) % 1 + 1) % 1, d = Math.hypot(q.x, q.z * 1.4); return 0.7 * Math.exp(-(((d - b * 1.6) / 0.16) ** 2)) * ease((T - HIT) / 0.5); };
    const caps = ['schallfeld.silence', 'schallfeld.left', 'schallfeld.both', 'schallfeld.drop'];
    return { beats: caps.map((key, a) => ({ ...act(groupsOf(m, at(ACT[a])), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (p, j, t, o) => {
      const T = ACT[a] + t; sc.pose(j, T, o); o[3] = lightOf(m, j, sc.state(T), flash(j, T));
    } }), fitPts })) };
  },
};
