import { t as message } from '../../../i18n/ui.mjs';
// Der Tintenfisch (Runde 11, große Motive, Anlass Stadtfest, ab 400 Drohnen). Kandidat FSK-053 der
// Motiv-Shortlist (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Detailed octopus with curling
// tentacles · 400“ (dort ein gefüllter Kopf; hier nur Kontur, Marc mag keine gefüllten Punktflächen).
// Das organische Gegenstück zum Satelliten: keine starren Teile, alles biegt sich. Lesbar an drei Zeichen: der gewölbte
// Mantel mit zwei Augen, acht lange Arme, deren Spitzen sich einrollen, und die Saugnäpfe als Rhythmus auf der Innenseite
// jedes Arms (die Kontur buchtet sich dort in gleichmäßigen, zur Spitze kleiner werdenden Bögen aus). Runde 11b (Marc
// 21.11.2026: „bei der Krake allerdings die Korallen wegnehmen, die brauchen wir nicht“): kein Riff mehr, alle Drohnen
// gehen in den Kraken.
// Jeder Arm ist eine Kurve, deren Krümmung zur Spitze wächst (so rollt sie sich wie ein echter Arm von der Spitze her ein);
// gezeichnet als schmale Schleife um diese Mittellinie: Oberseite glatt, Innenseite mit Saugnäpfen, an der Spitze
// zusammenlaufend. Jede Drohne kennt ihren Arm und ihre Stelle darauf; Einrollen, Welle und Rückstoß ändern nur die
// Krümmung, also fliegt jede Drohne eine weiche Bahn. Die Welle läuft vom Ansatz zur Spitze und schwingt dort am
// weitesten aus (Nachlauf wie beim Flügelschlag des Drachen). Die Arme liegen abwechselnd vor und hinter dem Körper, im
// Schwenk zeigt sich die Tiefe. Mehr Drohnen bringen den Trichter, größere Augen und mehr Blasen.
//
//   octopus3d (3D, ab 400): der Tintenfisch schwebt, Wellen laufen durch die Arme, die Arme rollen sich
//     nacheinander ein und wieder aus, er schwenkt langsam.
//   octopusStory (3D+, ab 400): zusammengerollt → die Arme öffnen sich nacheinander → sie rollen sich nacheinander
//     ein → Rückstoß: der Mantel zieht sich zusammen, die Arme legen sich nach hinten, er schießt in zwei Stößen nach oben,
//     die Blasen unter ihm werden zu seiner Spur.
// Steht im Stadtfest direkt hinter dem Delfin (Meer). Wächter: scripts/tintenfisch.test.mjs.
import { TAU, PINK, VIOLET, GOLD, WARM, CYAN, DIAMOND, mix, smooth, yaw, pitch, part, act, hash, share } from '../../show-motion.js';
import { ellipsoid, curves, spot, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const DEG = Math.PI / 180;
/** Detailstufe nach Drohnen: 0 bis 599, 1 bis 849, 2 ab 850. */
export const octoLevel = (n) => (n >= 850 ? 2 : n >= 600 ? 1 : 0);

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan (y oben, z zum Publikum). Kopf über dem Ursprung, Arme setzen unter ihm an.
// ---------------------------------------------------------------------------------------------------------------------
const MANTLE = { c: [0.05, 0.43, -0.04], r: [0.3, 0.33, 0.25], roll: -0.42 }; // nach hinten geneigt, wie ein Krake schaut
const HEAD = [0, 0.06, 0]; // Mitte des Armkranzes
/** Arme der rechten Seite (die linke ist gespiegelt): Abgangsrichtung (Grad, 0 = rechts), Länge, Neigung in die Tiefe,
 * Grundkrümmung (negativ: der Arm hängt erst nach unten durch), Phase der Welle. */
const ARMS_R = [
  { a: 18, L: 1.24, dz: 0.3, k0: -1.3, ph: 0.0, zb: -0.03 },
  { a: -14, L: 1.18, dz: -0.3, k0: -0.66, ph: 1.7, zb: -0.11 },
  { a: -46, L: 1.1, dz: 0.42, k0: 0.05, ph: 3.1, zb: 0.12 },
  { a: -74, L: 1.0, dz: -0.36, k0: 0.52, ph: 4.4, zb: -0.06 },
];
/** Alle acht Arme: k = 0…3 rechts (außen nach innen), 4…7 links; sg = Spiegelung, ord = Reihenfolge rund um den Kranz. */
const ARMS = [...ARMS_R.map((p, i) => ({ ...p, sg: 1, ord: 3 - i })), ...ARMS_R.map((p, i) => ({ ...p, sg: -1, dz: -p.dz * 0.9, zb: -p.zb, ph: p.ph + 0.9, ord: 4 + i }))];
const S0 = 0.07; // Arme beginnen etwas unter dem Kranz (die Ansätze stehen sonst zu dicht)
const CURL_P = 2.4, CURL_TURN = 1.75 * Math.PI; // Krümmung wächst mit (s/L)^P, eingerollt dreht die Spitze um so viel
const halfWidth = (s, L) => 0.011 + 0.05 * Math.max(0, 1 - s / L) ** 0.85;
const STEPS = 72;

/** Mittellinie eines Arms (rechte Seite, vor Spiegelung) zum Zustand st: { curl 0…1.3, bend Faktor der Grundkrümmung,
 * head Drehung der Abgangsrichtung (rad), wave Amplitude, ph Phase, dzK Faktor der Tiefe }. Liefert Stützstellen. */
function armLine(arm, st, out) {
  const { L } = arm, ds = (L - S0) / STEPS, C = (CURL_TURN * (CURL_P + 1)) / L;
  let th = arm.a * DEG + st.head, x = HEAD[0] + 0.13 * Math.cos(arm.a * DEG), y = HEAD[1] + 0.07 * Math.sin(arm.a * DEG), z = arm.zb; // Ansätze rund um den Kranz, vorn und hinten
  for (let i = 0; i <= STEPS; i++) {
    const s = S0 + i * ds, u = s / L;
    out.x[i] = x; out.y[i] = y; out.z[i] = z; out.th[i] = th;
    const kap = arm.k0 * st.bend * (1 - u) + st.curl * C * u ** CURL_P + st.wave * 2.2 * u * Math.sin(st.ph - 5.5 * u);
    th += kap * ds;
    x += Math.cos(th) * ds; y += Math.sin(th) * ds;
    z += (arm.dz * st.dzK + st.wave * 0.5 * Math.cos(st.ph - 5 * u + 0.8)) * ds;
  }
  return out;
}
const lineBuf = () => ({ x: new Float64Array(STEPS + 1), y: new Float64Array(STEPS + 1), z: new Float64Array(STEPS + 1), th: new Float64Array(STEPS + 1) });
/** Saugnäpfe: Ausbuchtung der Innenseite an der Stelle s (gleichmäßige Bögen, zur Spitze kleiner). */
const sucker = (s, L) => { const u = (s - S0) / (L - S0); return Math.abs(Math.sin(Math.PI * (u * 11 + 0.5 * u * u * 6))) ** 0.6 * 0.85; };

/** Lage einer Armdrohne (Stelle s, Seite side: +1 Innenseite mit Saugnäpfen, −1 Oberseite) auf der Linie ln. */
function onArm(arm, ln, s, side, out) {
  const f = Math.max(0, Math.min(STEPS, ((s - S0) / (arm.L - S0)) * STEPS)), i = Math.min(STEPS - 1, Math.floor(f)), w = f - i;
  const x = lerp(ln.x[i], ln.x[i + 1], w), y = lerp(ln.y[i], ln.y[i + 1], w), z = lerp(ln.z[i], ln.z[i + 1], w), th = lerp(ln.th[i], ln.th[i + 1], w);
  const h = halfWidth(s, arm.L) * (side > 0 ? 1 + sucker(s, arm.L) : 1);
  out[0] = arm.sg * (x - side * Math.sin(th) * h); out[1] = y + side * Math.cos(th) * h; out[2] = z;
  return out;
}
/** Armdrohnen: je Arm eine Schleife Ansatz → Oberseite → Spitze → Innenseite → Ansatz, gleichmäßig verteilt. */
function armSlots(counts) {
  const slots = [];
  ARMS.forEach((arm, k) => {
    for (let q = 0; q < counts[k]; q++) {
      const u = (q + 0.5) / counts[k], d = 1 - Math.abs(1 - 2 * u); // 0 am Ansatz, 1 an der Spitze
      slots.push({ k, s: S0 + (arm.L - S0) * d, side: u < 0.5 ? -1 : 1 });
    }
  });
  return slots;
}

/** Ruhelage aller festen Teile (Mantel, Kopf, Augen, Trichter) für assemble(). */
function bodyParts(lv) {
  const M = MANTLE, parts = [];
  parts.push({ ...ellipsoid('mantel', M.c, M.r, { roll: M.roll, lat: [-0.6], w: 1.1 }), solid: false });
  // Kopf unter dem Mantel: Wangenlinie, auf der die Augen sitzen
  parts.push(curves('kopf', [Array.from({ length: 25 }, (_, i) => { const a = Math.PI * (1.08 + (0.84 * i) / 24); return [Math.cos(a) * 0.21, 0.15 + Math.sin(a) * 0.1, 0.08 + 0.1 * Math.sin(a) ** 2]; })], { w: 1.0 }));
  for (const s of [1, -1]) parts.push(spot('auge', [s * 0.2, 0.215, 0.12], lv >= 1 ? 7 : 6, 0.042, [s * 0.9, 0.1, 0.7]), spot('pupille', [s * 0.215, 0.215, 0.145], 1, 0.01, [s, 0, 0.7]));
  if (lv >= 1) {
    // Trichter (Sipho) an der Seite, Schwimmhaut als Bögen zwischen benachbarten Armansätzen
    parts.push(curves('trichter', [[[0.22, 0.17, -0.12], [0.33, 0.13, -0.2], [0.39, 0.17, -0.24]]], { w: 1.0 }));
  }
  return parts;
}
const lineLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], (pts[i][2] || 0) - (pts[i - 1][2] || 0)); return L; };

/** Das Modell: Armdrohnen (Arm, Stelle, Seite) + feste Teile + Blasen. Verteilung nach Linienlänge (gleiche Dichte). */
export function octoModel(n) {
  const lv = octoLevel(n), parts = bodyParts(lv), BUB = [8, 12, 16][lv];
  const bodyLen = parts.reduce((s, p) => s + (p.lines ? p.lines.reduce((a, l) => a + lineLen(l.closed ? [...l.pts, l.pts[0]] : l.pts) * (p.w ?? 1), 0) : 0), 0);
  const armLen = ARMS.map((a) => 2 * (a.L - S0) * 1.06); // Schleife, Innenseite mit Saugnäpfen etwas länger
  const budget = n - BUB, total = bodyLen + armLen.reduce((a, b) => a + b, 0);
  const armCounts = share(Math.round((budget * armLen.reduce((a, b) => a + b, 0)) / total), armLen);
  const body = assemble(parts, budget - armCounts.reduce((a, b) => a + b, 0));
  const slots = armSlots(armCounts);
  // Blasen: kleine Lichter unter dem Kraken
  const bubbles = Array.from({ length: BUB }, (_, i) => [lerp(-0.75, 0.7, hash(i + 3.1)), -0.75 + 0.55 * hash(i + 7.7), -0.55 - 0.15 * hash(i + 1.9)]); // hinter den Armen
  return { lv, slots, body, bubbles, A: slots.length, Bd: body.pts.length };
}

// ---------------------------------------------------------------------------------------------------------------------
// Zustand über die Zeit: Arme je Arm (curl, bend, head, wave), Körper (Verschiebung, Mantelpuls)
// ---------------------------------------------------------------------------------------------------------------------
const BODY_TAGS = new Set(['mantel', 'kopf', 'auge', 'pupille', 'trichter']);
const colourOf = (tag, p) => ({
  mantel: mix(PINK, VIOLET, 0.15 + 0.4 * smooth((p[1] - 0.2) / 0.5)), kopf: PINK, auge: GOLD, pupille: WARM, trichter: mix(PINK, VIOLET, 0.4),
}[tag] ?? PINK);
const armColour = (k, s, side) => (side > 0 ? mix(mix(PINK, WARM, 0.35), VIOLET, 0.5 * s) : mix(PINK, VIOLET, 0.15 + 0.6 * s));

/** Eine Szene über die Zeit: state(T) liefert je Arm den Zustand und die Körperlage. Rechnet Armlinien je Zeitpunkt einmal. */
function scene(model, state) {
  const lines = ARMS.map(lineBuf);
  let at = NaN, st = null;
  const ready = (T) => { if (T === at) return; at = T; st = state(T); ARMS.forEach((arm, k) => armLine(arm, st.arms[k], lines[k])); };
  const { A, Bd, slots, body, bubbles } = model;
  const pose = (j, T, o) => {
    ready(T);
    if (j < A) { const q = slots[j]; onArm(ARMS[q.k], lines[q.k], q.s, q.side, o); }
    else if (j < A + Bd) {
      const p = body.pts[j - A], tag = body.tags[j - A];
      o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
      if (tag === 'mantel') { const c = MANTLE.c, k = st.squeeze; o[0] = c[0] + (o[0] - c[0]) * k; o[1] = c[1] + (o[1] - c[1]) * (1 + 0.6 * (1 - k)); o[2] = c[2] + (o[2] - c[2]) * k; } // Mantelpuls: schmaler und länger
    } else {
      const b = bubbles[j - A - Bd], i = j - A - Bd; o[0] = b[0]; o[1] = b[1]; o[2] = b[2];
      if (st.bubbles) return st.bubbles(i, b, o);
      o[0] += 0.03 * Math.sin(T * 0.7 + i * 1.3); o[1] += 0.04 * Math.sin(T * 0.5 + i * 2.1); return o;
    }
    // Körper und Arme: Lage der ganzen Figur
    o[0] += st.dx; o[1] += st.dy; o[2] += st.dz;
    yaw(o, st.yaw, st.dx, 0); pitch(o, 0.08);
    return o;
  };
  return { pose, state: (T) => { ready(T); return st; } };
}
/** Arm in Ruhe: offen, leicht durchhängend, Welle schwach. */
const openArm = (k, T, wave = 0.18) => ({ curl: 0.45, bend: 1, head: 0, wave, ph: (T * TAU) / 4.2 + ARMS[k].ph, dzK: 1 });

// ---------------------------------------------------------------------------------------------------------------------
// 3D: schwebt, Wellen, die Arme rollen sich nacheinander ein und aus
// ---------------------------------------------------------------------------------------------------------------------
const CYCLE = 9; // s für einmal Einrollen und Ausrollen aller Arme
const state3d = (T) => {
  const on = smooth(T / 2);
  return {
    arms: ARMS.map((arm, k) => { const u = ((T - 1 - arm.ord * 0.45) / CYCLE) * TAU, c = 0.5 - 0.5 * Math.cos(u); return { ...openArm(k, T, 0.18 * on), curl: 0.45 + 0.6 * on * (T > 1 + arm.ord * 0.45 ? c : 0) }; }),
    dx: 0, dy: 0.1 + 0.04 * Math.sin((T * TAU) / 6.5) * on, dz: 0, squeeze: 1 - 0.04 * on * (0.5 - 0.5 * Math.cos((T * TAU) / 3.2)), yaw: 0.35 * on * Math.sin((T * TAU) / 16),
  };
};

// ---------------------------------------------------------------------------------------------------------------------
// 3D+: eingerollt → öffnen → einrollen → Rückstoß
// ---------------------------------------------------------------------------------------------------------------------
const ACT = [0, 2.5, 8, 13.5, 21];
const HIDE = { curl: 1.3, bend: 0.2, dy: -0.42, squeeze: 0.92 }; // eingerollt: tief, Arme eingerollt
const OPEN0 = 2.6, OPEN_DUR = 1.9, OPEN_STEP = 0.45; // öffnen: je Arm 0,32 s später
const CURL0 = 8.3, CURL_DUR = 2.0, CURL_STEP = 0.4;
const JET = { t0: 14.0, pulses: [0, 3.2], rise: [0.42, 0.36], dur: 1.6 };
/** Glocke 0 → 1 → 0 über w Sekunden ab x = 0. */
const bump = (x, w) => (x <= 0 || x >= w ? 0 : Math.sin((Math.PI * x) / w) ** 2);
function stateStory(T) {
  const arms = ARMS.map((arm, k) => {
    const t0 = OPEN0 + arm.ord * OPEN_STEP, t1 = CURL0 + arm.ord * CURL_STEP, o = ease((T - t0) / OPEN_DUR), c = ease((T - t1) / CURL_DUR);
    // Finten-Wächter (Lead 21.11.: Ausholen/Überschwingen beim Öffnen und Einrollen bei 1000): die Welle eines Arms ruht,
    // solange er selbst auf- oder einrollt; sonst lief eine kleine Gegenbewegung direkt vor oder nach der großen
    const quiet = (a, b) => 1 - smooth((T - a + 0.9) / 0.7) * (1 - smooth((T - b - 0.2) / 0.7));
    const st = openArm(k, T, (0.06 + 0.14 * o) * quiet(t0, t0 + OPEN_DUR) * quiet(t1, t1 + CURL_DUR) * (1 - smooth((T - JET.t0 + 0.9) / 0.7)));
    st.curl = lerp(HIDE.curl, 0.45, o); st.curl = lerp(st.curl, 1.05, c);
    if (arm.ord === 1) st.curl -= 0.75 * bump(T - 0.2, 2.3); // eingerollt: ein Arm lugt heraus und rollt sich wieder ein
    st.bend = lerp(HIDE.bend, 1, o);
    // Rückstoß: die Arme legen sich nach unten zusammen (Abgangsrichtung → senkrecht, mit Nachlauf: Grundkrümmung bleibt
    // kurz länger), entrollen sich und schwingen hinter dem Körper aus
    // Runde 11b: die Arme legen sich in einem Zug zusammen; das halbe Wiederöffnen zwischen den Stößen und die angeregte
    // Welle danach waren für den Finten-Wächter Überschwingen (Bewegung zurück direkt nach der großen)
    const j = ease((T - JET.t0 - 0.15) / 2.9), target = (-90 + (arm.a + 90) * 0.3) * DEG - arm.a * DEG;
    st.head = j * target; st.curl = lerp(st.curl, 0.06, j); st.bend = lerp(st.bend, 0.15, ease((T - JET.t0) / 2)); st.dzK = lerp(1, 0.45, j);
    return st;
  });
  const lift = JET.pulses.reduce((a, p, i) => a + JET.rise[i] * ease((T - JET.t0 - p) / JET.dur), 0);
  const sq = JET.pulses.reduce((a, p) => a - 0.12 * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (T - JET.t0 - p + 0.5) / 0.9)))), 1);
  const rise = ease((T - OPEN0) / 3);
  return {
    arms, dx: 0, dy: lerp(HIDE.dy, 0.06, rise) + lift + 0.03 * Math.sin((T * TAU) / 6.5) * rise, dz: 0,
    squeeze: lerp(HIDE.squeeze, 1, rise) * sq, yaw: 0.22 * Math.sin((T * TAU) / 17) * rise,
    bubbles: (i, b, o) => { // Blasen: treiben unter ihm, beim Rückstoß reihen sie sich als Spur unter dem Trichter auf
      const g = ease((T - JET.t0 - 0.2 - 0.12 * i) / 2.2), y0 = lerp(HIDE.dy, 0.06, rise) + lift;
      const tx = 0.34 + 0.05 * Math.sin(i * 2.4), ty = y0 + 0.02 - 0.12 * (i + 1), tz = -0.62; // hinter den Armen
      o[0] = lerp(b[0] + 0.03 * Math.sin(T * 0.7 + i * 1.3), tx, g); o[1] = lerp(b[1] + 0.04 * Math.sin(T * 0.5 + i * 2.1), ty, g); o[2] = lerp(b[2], tz, g);
      return o;
    },
  };
}

function build(n, state, holdOf) {
  const model = octoModel(n), sc = scene(model, state), { A, Bd, slots, body } = model;
  const col = [...slots.map((q) => armColour(q.k, q.s / ARMS[q.k].L, q.side)), ...body.pts.map((p, i) => colourOf(body.tags[i], p)), ...model.bubbles.map(() => mix(CYAN, DIAMOND, 0.4))];
  const tagOf = (j) => (j < A ? 'arm' : j < A + Bd ? body.tags[j - A] : 'blase');
  const at = (T) => Array.from({ length: n }, (_, j) => [...sc.pose(j, T, [0, 0, 0]), ...col[j]]);
  return { model, sc, col, tagOf, at, holdOf };
}
/** Licht: Glanz läuft die Arme entlang zur Spitze, Augen leuchten, Blasen funkeln. */
function lightOf(model, j, T, extra = 0) {
  const { A, Bd, slots, body } = model;
  if (j < A) { const q = slots[j], u = q.s / ARMS[q.k].L; return 1 + 0.32 * Math.exp(-(((u - (((T + ARMS[q.k].ph) / 3.6) % 1.6) + 0.3) / 0.12) ** 2)) + extra; }
  if (j < A + Bd) { const tag = body.tags[j - A]; return tag === 'auge' ? 1.2 + 0.25 * Math.sin(T * 1.3) : tag === 'pupille' ? 1.5 : 1; }
  return 0.8 + 0.5 * (0.5 + 0.5 * Math.sin(T * 2.3 + j * 1.7));
}
const groupsOf = (model, pts) => [part('arme', pts.slice(0, model.A), { rigid: true }), part('koerper', pts.slice(model.A, model.A + model.Bd), { rigid: true }), part('blasen', pts.slice(model.A + model.Bd), { rigid: true })];

export const builders = {
  octopus3d: (n, caption) => {
    const b = build(n, state3d), hold = 14;
    const fitPts = [0, 3, 5, 7, 9, 11, 14].flatMap((T) => b.at(T)).filter((_, i) => i % 3 === 0);
    return { beats: [{ ...act(groupsOf(b.model, b.at(0)), { caption, hold, live: (p, j, t, o) => { b.sc.pose(j, t, o); o[3] = lightOf(b.model, j, t); } }), fitPts }] };
  },
  octopusStory: (n) => {
    const b = build(n, stateStory);
    // Bildausschnitt: die ersten drei Akte eng (der Tintenfisch füllt die Bühne), für den Rückstoß zieht die Kamera zurück
    // (eigener Ausschnitt wie beim Feuerstoß des Drachen), damit er im Bild aufsteigt
    const near = [0, 3.5, 5, 6.5, 8, 10, 12, 13.5].flatMap((T) => b.at(T)).filter((_, i) => i % 3 === 0);
    const far = [13.5, 15.5, 17.5, 19.5, 21].flatMap((T) => b.at(T)).filter((_, i) => i % 3 === 0);
    const caps = ['tintenfisch.inTheReef', 'tintenfisch.armsOpen', 'tintenfisch.armsCurl', 'tintenfisch.jet'];
    return { beats: caps.map((key, a) => ({ ...act(groupsOf(b.model, b.at(ACT[a])), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (p, j, t, o) => {
      const T = ACT[a] + t; b.sc.pose(j, T, o);
      // eingerollt: die Augen öffnen sich zuerst (es regt sich etwas)
      o[3] = lightOf(b.model, j, T) * (a === 0 && j < b.model.A ? 0.75 + 0.25 * smooth((T - 0.8) / 1.5) : 1);
    } }), ...(a === 3 ? { frame: 'aufstieg', fitPts: far } : { fitPts: near }) })) };
  },
};
