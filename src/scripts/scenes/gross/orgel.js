import { t as message } from '../../../i18n/ui.mjs';
// Die Orgel (Runde 11b, große Motive, Anlass Kultur, ab 600 Drohnen). Kandidat FSK-090 der Motiv-Shortlist
// (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Piano with spiraling music notes · 250“ (nur
// als Anregung: ein Instrument, aus dem Licht aufsteigt).
// Gebaut wie Satellit und Krake: wenige klare Körper, nur Linien. Lesbar an drei Zeichen: der Prospekt aus Pfeifen in
// drei Größen (Mittelturm, zwei Seitentürme, zwei Flachfelder dazwischen), jede Pfeife als Kontur mit Fuß und Labium
// (die Querlinie, an der der Ton entsteht); die Türme stehen gewölbt vor dem Gehäuse, die Flachfelder zurück, im Schwenk
// zeigt sich die Tiefe. Darunter Gehäuse und Spieltisch, obenauf der Zimbelstern, der sich beim Spielen dreht. Die Musik
// ist Licht: es läuft vom Spieltisch über die Windlade zu den Pfeifen eines Akkords und steigt in ihnen vom Fuß zur
// Mündung, dort bleibt der Akkord kurz stehen. Mehr Drohnen kaufen Spanische Trompeten, die waagerecht zum Publikum
// zeigen (ab 800), und goldenes Schleierwerk zwischen den Mündungen der Türme (ab 900), keine dichteren Pfeifen.
//
//   organ3d (3D, ab 600): ein Akkord wandert durch die drei Register (klein, mittel, groß, zurück), der Zimbelstern
//     dreht sich, die Orgel schwenkt.
//   organStory (3D+, ab 600): vier Akte. Die Orgel ruht, am Spieltisch geht das Licht an → der erste Akkord steigt in
//     die kleinen Pfeifen → er wandert in die Seitentürme und den Mittelturm, der Stern beginnt sich zu drehen → volles
//     Werk: alle Pfeifen leuchten, die fünf Kränze über den Türmen lösen sich als Klangbögen und steigen auf.
// Steigerung der Harfe (Musik, in der Motivliste direkt dahinter): die Teile heißen wie am Ende der Harfengeschichte
// (frame, strings, note0…note4): der Notenschlüssel wird das Gehäuse, die Notenlinien werden die Pfeifen, die fünf
// Noten die fünf Kränze. Wächter: scripts/orgel.test.mjs.
import { TAU, GOLD, WARM, CYAN, DIAMOND, VIOLET, BLUE, mix, smooth, yaw, pitch, part, act, sparkle } from '../../show-motion.js';
import { curves, spot, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));

/** Detailstufe nach Drohnen: 0 bis 799, 1 (Spanische Trompeten) bis 899, 2 (Schleierwerk) ab 900. */
export const organLevel = (n) => (n >= 900 ? 2 : n >= 800 ? 1 : 0);
const PITCH = 0.06;

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (y oben, z zum Publikum; die Windlade, auf der die Pfeifen stehen, bei y = 0)
// ---------------------------------------------------------------------------------------------------------------------
/** Pfeifen: Register (0 klein, 1 mittel, 2 groß), Mitte x, Tiefe z, halbe Breite w, Fußhöhe y0, Fußlänge F, Körper B. */
function pipeList(lv) {
  const pipes = [];
  const tower = (xs, B, w, reg, z0, bow, F = 0.2) => xs.forEach((x, i) => { const c = (xs[0] + xs[xs.length - 1]) / 2, half = (xs[xs.length - 1] - xs[0]) / 2 || 1; pipes.push({ reg, x, z: z0 + bow * (1 - ((x - c) / half) ** 2), w, y0: 0, F, B: B[i] }); });
  tower([-0.46, -0.23, 0, 0.23, 0.46], [0.84, 0.96, 1.08, 0.96, 0.84], 0.064, 2, 0.16, 0.12); // Mittelturm: groß
  for (const s of [-1, 1]) {
    tower([1.08, 1.28, 1.48].map((x) => s * x).sort((a, b) => a - b), [0.8, 0.9, 0.8], 0.058, 1, 0.1, 0.09); // Seitentürme
    [0.7, 0.87].forEach((x, i) => pipes.push({ reg: 0, x: s * x, z: -0.06, w: 0.046, y0: 0.12, F: 0.14, B: [0.4, 0.46][i] })); // Flachfelder
  }
  return pipes;
}
/** Eine Pfeife als Linien: Fuß (zwei zulaufende Linien), Körper (U-Bogen mit Deckel), Labium (Querlinie am Mund). */
function pipeLines(p) {
  const { x, z, w, y0, F, B } = p, m = y0 + F, top = m + B;
  return [
    [[x - 0.3 * w, y0, z], [x - w, m, z], [x - w, top, z], [x + w, top, z], [x + w, m, z], [x + 0.3 * w, y0, z]],
    [[x - w * 0.55, m + 0.045, z], [x + w * 0.55, m + 0.045, z]],
  ];
}
/** Kränze über Türmen und Flachfeldern (die späteren Klangbögen): k = 0 Mitte, 1/2 Seitentürme, 3/4 Flachfelder. */
function crownLines() {
  const arc = (x0, x1, y, rise, z0, bow) => Array.from({ length: 25 }, (_, i) => { const u = i / 24, x = lerp(x0, x1, u); return [x, y + rise * Math.sin(Math.PI * u), z0 + bow * Math.sin(Math.PI * u)]; });
  return [
    arc(-0.58, 0.58, 1.37, 0.16, 0.16, 0.14),
    arc(-1.58, -0.98, 1.2, 0.11, 0.1, 0.1), arc(0.98, 1.58, 1.2, 0.11, 0.1, 0.1),
    arc(-0.93, -0.64, 0.84, 0.05, -0.06, 0), arc(0.64, 0.93, 0.84, 0.05, -0.06, 0),
  ];
}
const CROWN_C = [[0, 1.45, 0.24], [-1.28, 1.26, 0.15], [1.28, 1.26, 0.15], [-0.785, 0.86, -0.06], [0.785, 0.86, -0.06]];
const STAR = { c: [0, 1.8, 0.24], R: 0.17, r: 0.075, k: 8 };
const KX = 1.6, KY = -0.4, KZ0 = -0.22, KZ1 = 0.2; // Gehäuse unten
function caseParts(lv) {
  const parts = [];
  // Unterbau: Vorderfläche, obere Tiefenkanten; die Oberkante vorn ist die Windlade (dort läuft das Licht)
  parts.push(curves('gehaeuse', [{ pts: [[-KX, KY, KZ1], [KX, KY, KZ1], [KX, 0, KZ1], [-KX, 0, KZ1]], closed: true }, [[-KX, 0, KZ1], [-KX, 0, KZ0]], [[KX, 0, KZ1], [KX, 0, KZ0]], [[-KX, 0, KZ0], [KX, 0, KZ0]]], { w: 1 }));
  // Spieltisch: Pult vor dem Gehäuse, zwei Manuale, Notenpult
  parts.push(curves('spieltisch', [{ pts: [[-0.36, -0.34, KZ1], [-0.36, -0.34, 0.5], [0.36, -0.34, 0.5], [0.36, -0.34, KZ1]] }, [[-0.29, -0.3, 0.44], [0.29, -0.3, 0.44]], [[-0.29, -0.25, 0.36], [0.29, -0.25, 0.36]], [[-0.2, -0.14, 0.27], [0.2, -0.14, 0.27]]], { w: 1.1 }));
  for (const s of [-1, 1]) for (const i of [0, 1, 2]) parts.push(spot('register', [s * (0.47 + 0.09 * i), -0.2 - 0.07 * (i % 2), KZ1 + 0.01], 1, 0.01));
  // Zimbelstern: achtzackiger Stern über dem Mittelturm
  const { c, R, r, k } = STAR;
  parts.push(curves('stern', [{ pts: Array.from({ length: 2 * k }, (_, i) => { const a = (i / (2 * k)) * TAU + Math.PI / 2, q = i % 2 ? r : R; return [c[0] + q * Math.cos(a), c[1] + q * Math.sin(a), c[2]]; }), closed: true }], { w: 1.2 }));
  if (lv >= 2) {
    // Schleierwerk: goldene Bögen zwischen den Mündungen der Türme (geschnitztes Zierwerk)
    const veil = [];
    for (const [xs, top] of [[[-0.46, -0.23, 0, 0.23, 0.46], [1.04, 1.16, 1.28, 1.16, 1.04]], [[-1.48, -1.28, -1.08], [1.0, 1.1, 1.0]], [[1.08, 1.28, 1.48], [1.0, 1.1, 1.0]]]) for (let i = 1; i < xs.length; i++) {
      const a = [xs[i - 1], top[i - 1] + 0.05], b = [xs[i], top[i] + 0.05], z = xs.length === 5 ? 0.2 : 0.14;
      veil.push(Array.from({ length: 9 }, (_, k) => { const u = k / 8; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 0.09 * Math.sin(Math.PI * u), z]; }));
    }
    parts.push(curves('schleier', veil, { w: 1.1 }));
  }
  if (lv >= 1) {
    // Spanische Trompeten: zwei Fächer unter den Flachfeldern, waagerecht zum Publikum
    const trumpets = [];
    for (const s of [-1, 1]) for (const a of [-0.45, 0, 0.45]) {
      const d = [Math.sin(a) * s, 0.12, Math.cos(a)], b0 = [s * 0.785, -0.12, KZ1 + 0.02], L = 0.5, e = [b0[0] + d[0] * L, b0[1] + d[1] * L, b0[2] + d[2] * L];
      const side = [Math.cos(a) * s, 0, -Math.sin(a)];
      trumpets.push([[b0[0] + side[0] * 0.012, b0[1], b0[2] + side[2] * 0.012], [e[0] + side[0] * 0.05, e[1], e[2] + side[2] * 0.05]], [[b0[0] - side[0] * 0.012, b0[1], b0[2] - side[2] * 0.012], [e[0] - side[0] * 0.05, e[1], e[2] - side[2] * 0.05]]);
    }
    parts.push(curves('trompete', trumpets, { w: 0.9 }));
  }
  return parts;
}

/**
 * Das Modell: Teile zusammengesetzt, dann in der Reihenfolge der Harfenteile sortiert: frame (Gehäuse, Spieltisch,
 * Stern, Trompeten) | strings (Pfeifen) | note0…note4 (Kränze). Je Pfeifendrohne: Pfeife und Höhe h (0 Fuß, 1 Mündung).
 */
export function organModel(n) {
  const lv = organLevel(n), pipes = pipeList(lv), crowns = crownLines();
  const parts = [...caseParts(lv), ...pipes.map((p, i) => curves(`pipe:${i}`, pipeLines(p), { w: 1 })), ...crowns.map((l, k) => curves(`crown:${k}`, [l], { w: 1.3 }))];
  const { pts, tags } = assemble(parts, n);
  const idx = pts.map((_, j) => j), kind = (t) => (t.startsWith('pipe:') ? 1 : t.startsWith('crown:') ? 2 + +t.slice(6) : 0);
  idx.sort((a, b) => kind(tags[a]) - kind(tags[b]) || a - b);
  const P = idx.map((j) => pts[j]), G = idx.map((j) => tags[j]);
  const info = G.map((t, j) => { if (!t.startsWith('pipe:')) return null; const p = pipes[+t.slice(5)]; return { i: +t.slice(5), reg: p.reg, h: (P[j][1] - p.y0) / (p.F + p.B), x: p.x }; });
  const counts = [0, 1, 2, 3, 4, 5, 6].map((k) => G.filter((t) => kind(t) === k).length);
  return { lv, pipes, pts: P, tags: G, info, counts };
}
const GROUPS = ['frame', 'strings', 'note0', 'note1', 'note2', 'note3', 'note4'];

// ---------------------------------------------------------------------------------------------------------------------
// Licht: Akkorde laufen vom Spieltisch über die Windlade und steigen in den Pfeifen auf
// ---------------------------------------------------------------------------------------------------------------------
const RUN = 1.9; // Geschwindigkeit des Lichts auf der Windlade (Einheiten/s)
const RISE = 0.85; // Pfeifenhöhen je Sekunde
/** Akkord: Startzeit, Pfeifen (Indizes), Dauer. Licht einer Pfeifendrohne aus allen Akkorden. */
function pipeLight(chords, q, T, dim) {
  let a = dim;
  for (const c of chords) {
    if (!c.set.has(q.i)) continue;
    const t0 = c.t + Math.abs(q.x) / RUN, fr = (T - t0) * RISE, off = 1 - smooth((T - c.t - c.dur) / 0.7);
    if (fr <= 0 || off <= 0) continue;
    const lit = smooth((fr - q.h) / 0.12) * off, head = Math.exp(-(((fr - q.h) / 0.07) ** 2)) * (fr < 1.15 ? 1 : 0);
    a = Math.max(a, lerp(dim, 1.75 + 0.15 * Math.sin(T * 5 + q.i), lit) + 0.8 * head);
  }
  return a;
}
/** Licht auf der Windlade (Oberkante vorn) und am Spieltisch: ein Lichtpunkt läuft je Akkord nach außen. */
function caseLight(chords, tag, p, T, base) {
  if (tag === 'spieltisch' || tag === 'register') return base + chords.reduce((s, c) => s + 0.6 * Math.exp(-(((T - c.t) / 0.35) ** 2)), 0) + (tag === 'register' ? 0.3 : 0);
  if (tag !== 'gehaeuse' || Math.abs(p[1]) > 0.01 || p[2] < KZ1 - 0.01) return base;
  return base + chords.reduce((s, c) => s + 1.1 * Math.exp(-(((Math.abs(p[0]) - (T - c.t) * RUN) / 0.09) ** 2)) * (T > c.t ? 1 : 0), 0);
}
/** Akkordfolge aus Registern: je Akkord eine Pfeife aus jedem genannten Register plus Nachbarn (drei bis fünf Pfeifen). */
function chord(pipes, t, dur, regs, shift) {
  const set = new Set();
  for (const reg of regs) {
    const list = pipes.map((p, i) => [p, i]).filter(([p]) => p.reg === reg && !p.back);
    const pick = [shift % list.length, (shift + 2) % list.length, (shift + list.length - 2) % list.length];
    for (const k of pick) set.add(list[k][1]);
  }
  return { t, dur, set };
}

const COL = {
  frame: mix(GOLD, WARM, 0.35), console: mix(GOLD, WARM, 0.1), star: GOLD, trumpet: mix(GOLD, WARM, 0.2),
  pipe: (reg, h) => mix(mix(DIAMOND, WARM, 0.25), reg === 2 ? mix(GOLD, WARM, 0.4) : reg === 1 ? mix(CYAN, DIAMOND, 0.5) : mix(VIOLET, DIAMOND, 0.45), 0.35 + 0.4 * h),
  crown: mix(GOLD, VIOLET, 0.2),
};
function colourOf(m, j) {
  const t = m.tags[j];
  if (m.info[j]) return COL.pipe(m.info[j].reg, m.info[j].h);
  if (t.startsWith('crown')) return COL.crown;
  if (t === 'stern') return COL.star;
  if (t === 'spieltisch' || t === 'register') return COL.console;
  if (t === 'trompete' || t === 'schleier') return COL.trumpet;
  return COL.frame;
}

/** Lage: Stern dreht in der Bildebene, Kränze steigen (rise 0…1), alles schwenkt. */
function poser(m, spin, rise, yawAt) {
  return (j, T, o) => {
    const p = m.pts[j], t = m.tags[j];
    o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
    if (t === 'stern') { const a = spin(T), c = Math.cos(a), s = Math.sin(a), x = p[0] - STAR.c[0], y = p[1] - STAR.c[1]; o[0] = STAR.c[0] + x * c - y * s; o[1] = STAR.c[1] + x * s + y * c; }
    else if (t.startsWith('crown:') && rise) {
      const k = +t.slice(6), u = rise(k, T), C = CROWN_C[k], sc = 1 + [1.15, 0.55, 0.55, 0.7, 0.7][k] * u, lift = [0.62, 0.42, 0.42, 0.55, 0.55][k] * u;
      o[0] = C[0] + (p[0] - C[0]) * sc + (k === 1 ? 0.12 : k === 2 ? -0.12 : 0) * u; o[1] = C[1] + (p[1] - C[1]) * sc + lift; o[2] = C[2] + (p[2] - C[2]) * sc - (k === 0 ? 0.5 * smooth(u * 2.2) : 0); // der mittlere Bogen steigt hinter dem Zimbelstern auf
    }
    yaw(o, yawAt(T)); pitch(o, PITCH);
    return o;
  };
}
/** Drehwinkel aus einer weichen Winkelgeschwindigkeit (Tabelle). */
function spinTable(omega, Tmax) {
  const dt = 0.01, k = Math.ceil(Tmax / dt) + 2, phi = new Float64Array(k + 1);
  for (let i = 1; i <= k; i++) phi[i] = phi[i - 1] + 0.5 * (omega((i - 1) * dt) + omega(i * dt)) * dt;
  return (T) => { const f = Math.max(0, Math.min(k, T / dt)), i = Math.min(k - 1, Math.floor(f)); return lerp(phi[i], phi[i + 1], f - i); };
}
const groupsOf = (m, pts) => { let s = 0; return GROUPS.map((g, k) => { const q = part(g, pts.slice(s, s + m.counts[k])); s += m.counts[k]; return q; }); };

// ---------------------------------------------------------------------------------------------------------------------
// 3D: ein Akkord wandert durch die Register
// ---------------------------------------------------------------------------------------------------------------------
const H3 = 15;
export const builders = {
  organ3d: (n, caption) => {
    const m = organModel(n), col = m.pts.map((_, j) => colourOf(m, j));
    const chords = [[0], [1], [2], [1, 2], [0, 1, 2]].map((regs, k) => chord(m.pipes, 0.8 + k * 2.7, 2.4, regs, k));
    const spin = spinTable((T) => 1.4 * ease((T - 0.6) / 2), 30), yawAt = (T) => 0.42 * Math.sin((T * TAU) / 16) * ease(T / 2.5);
    const pose = poser(m, spin, null, yawAt);
    const at = (T) => m.pts.map((_, j) => [...pose(j, T, [0, 0, 0]), ...col[j]]);
    const fitPts = [0, 4, 8, 12].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    return { beats: [{ ...act(groupsOf(m, at(0)), { caption, hold: H3, live: (p, j, t, o) => {
      pose(j, t, o);
      const q = m.info[j], tag = m.tags[j];
      o[3] = q ? pipeLight(chords, q, t, 0.5) : tag === 'stern' ? 1.1 + 0.35 * Math.sin(t * 6 + j) : tag.startsWith('crown') ? 0.95 + 0.25 * Math.exp(-((((j % 25) / 24 - ((t / 4) % 1.4)) / 0.15) ** 2)) : caseLight(chords, tag, m.pts[j], t, 0.85);
    } }), fitPts }] };
  },

  organStory: (n) => {
    const m = organModel(n), col = m.pts.map((_, j) => colourOf(m, j));
    const ACT = [0, 3, 8, 14, 21];
    const all = new Set(m.pipes.map((_, i) => i));
    const chords = [chord(m.pipes, 3.4, 3.6, [0], 0), chord(m.pipes, 8.4, 2.6, [1], 1), chord(m.pipes, 10.4, 2.6, [2], 2), chord(m.pipes, 12.0, 2.4, [0, 1, 2], 3), { t: 14.6, dur: 6.4, set: all }];
    const spin = spinTable((T) => 1.2 * ease((T - 9) / 2.5) + 1.6 * ease((T - 14.6) / 2.5), 30);
    const yawAt = (T) => 0.3 * Math.sin((T * TAU) / 20) * ease(T / 3);
    const rise = (k, T) => ease((T - 15.6 - [0.5, 0, 0, 0.9, 0.9][k]) / 2.8); // Klangbögen lösen sich, wenn das Licht oben ankommt
    const pose = poser(m, spin, rise, yawAt);
    const at = (T) => m.pts.map((_, j) => [...pose(j, T, [0, 0, 0]), ...col[j]]);
    const fitPts = [0, 8, 14, 17, 19, 21].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    // Licht: die Orgel ruht gedimmt, wird mit dem Spiel heller
    const dim = (T) => 0.38 + 0.2 * ease((T - 2) / 4) + 0.12 * ease((T - 8) / 4);
    const light = (j, T) => {
      const q = m.info[j], tag = m.tags[j];
      if (q) return pipeLight(chords, q, T, dim(T));
      if (tag === 'stern') return 0.7 + 0.4 * ease((T - 9) / 2) + 0.55 * ease((T - 14.6) / 1.5) * sparkle(j, T, 0.5, 1.2);
      if (tag.startsWith('crown:')) { const k = +tag.slice(6), u = rise(k, T); return 0.6 + 0.3 * ease((T - 8) / 4) + 0.9 * Math.sin(Math.PI * Math.min(1, u * 1.2)) + 0.35 * u; }
      return caseLight(chords, tag, m.pts[j], T, tag === 'spieltisch' || tag === 'register' ? 0.45 + 0.75 * ease((T - 0.6) / 1.8) : dim(T) + 0.2);
    };
    const caps = ['orgel.console', 'orgel.firstChord', 'orgel.wandering', 'orgel.tutti'];
    return { beats: caps.map((key, a) => ({ ...act(groupsOf(m, at(ACT[a])), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (p, j, t, o) => {
      const T = ACT[a] + t; pose(j, T, o); o[3] = light(j, T);
    } }), fitPts })) };
  },
};
