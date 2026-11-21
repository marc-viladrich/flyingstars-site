import { t as message } from '../../../i18n/ui.mjs';
// Die Töpferscheibe (Runde 11b, große Motive, Anlass Kultur, ab 500 Drohnen). Kandidat FSK-089 der Motiv-Shortlist
// (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20), Referenz „Rotating ornamental column · 200“ (nur als
// Anregung: ein Drehkörper aus Querschnitten).
// Gebaut wie Satellit und Krake: wenige klare Körper, nur Linien. Lesbar an drei Zeichen: die Vase als Stapel waagerechter
// Ringe (Querschnitte), die zusammen ihren Umriss zeichnen, die Scheibe mit Spritzschale darunter, zwei Hände mit
// Unterarmen, die die Wand von außen formen. Jede Ringdrohne kennt ihren Ring (Stelle s entlang des Profils, 0 am Fuß,
// 1 an der Lippe) und ihren Winkel; das Profil ist eine Mischung aus drei Formen (Klumpen, Zylinder, Vase), die von unten
// nach oben nachgibt, wo die Hände vorbeiziehen. Die Scheibe dreht wirklich: alle Ringe drehen starr um die Achse
// (keine Drohne kommt einer anderen näher), helle Drehrillen auf den Ringen machen die Drehung sichtbar. Mehr Drohnen
// kaufen das Tretrad mit Speichen und Beinen (ab 700) und ein Zickzack-Ornament auf dem Bauch (ab 900), keine dichteren
// Ringe.
//
//   potteryWheel3d (3D, ab 500): die fertige Vase dreht auf der Scheibe, die Hände gleiten an der Wand auf und ab und
//     drücken eine wandernde Delle hinein, Drehrillen laufen um, die Ansicht schwenkt.
//   potteryWheelStory (3D+, ab 500): vier Akte. Ein Klumpen dreht sich, die Hände kommen heran → sie zentrieren ihn und
//     ziehen ihn zum Zylinder hoch → sie ziehen den Bauch heraus und den Hals hoch, die Vase wächst von unten nach oben →
//     die Hände lassen los, die Scheibe wird langsamer, eine Glasur steigt als Lichtspirale vom Fuß zur Lippe, das Ornament
//     leuchtet golden.
// Wächter: scripts/toepferscheibe.test.mjs.
import { TAU, GOLD, WARM, ORANGE, RED, BLUE, DIAMOND, CYAN, mix, smooth, yaw, pitch, part, act, share } from '../../show-motion.js';
import { curves, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
/** smootherstep: Anfang und Ende ohne Geschwindigkeit und ohne Beschleunigung. */
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const wrap = (a) => a - TAU * Math.round(a / TAU);
const circle = (r, y, k = 64, a0 = 0) => ({ pts: Array.from({ length: k }, (_, i) => { const a = a0 + (i / k) * TAU; return [r * Math.cos(a), y, r * Math.sin(a)]; }), closed: true });

/** Detailstufe nach Drohnen: 0 bis 699, 1 bis 899, 2 ab 900. */
export const potLevel = (n) => (n >= 900 ? 2 : n >= 700 ? 1 : 0);
const PITCH = 0.3; // leichte Aufsicht: die Ringe lesen sich als Ellipsen
const RINGS = 10;

// ---------------------------------------------------------------------------------------------------------------------
// Profile (Radius, Höhe) vom Fuß zur Lippe; die Ringe sitzen bei gleichen Anteilen der Profillänge
// ---------------------------------------------------------------------------------------------------------------------
const PROFILE = {
  clump: [[0.32, 0], [0.36, 0.15], [0.35, 0.32], [0.29, 0.47], [0.2, 0.56], [0.15, 0.59]],
  cyl: [[0.27, 0], [0.28, 0.22], [0.275, 0.5], [0.265, 0.74], [0.27, 0.84]],
  vase: [[0.22, 0], [0.35, 0.11], [0.45, 0.3], [0.45, 0.48], [0.35, 0.68], [0.2, 0.88], [0.135, 1.02], [0.135, 1.14], [0.2, 1.25]],
};
/** Profil fein nach Bogenlänge abgetastet: at(s) liefert [r, y] bei Anteil s. */
function table(raw, k = 240) {
  // Catmull-Rom durch die Stützpunkte: das Profil hat keine Knicke (sonst springt die Neigung der Hände)
  const poly = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const p0 = raw[Math.max(0, i - 1)], p1 = raw[i], p2 = raw[i + 1], p3 = raw[Math.min(raw.length - 1, i + 2)];
    for (let q = 0; q < 12; q++) { const u = q / 12, u2 = u * u, u3 = u2 * u; poly.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u3))); }
  }
  poly.push(raw[raw.length - 1]);
  const cum = [0];
  for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const L = cum[cum.length - 1], r = new Float64Array(k + 1), y = new Float64Array(k + 1);
  for (let q = 0, i = 1; q <= k; q++) {
    const d = (q / k) * L;
    while (i < poly.length - 1 && cum[i] < d) i++;
    const u = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    r[q] = lerp(poly[i - 1][0], poly[i][0], u); y[q] = lerp(poly[i - 1][1], poly[i][1], u);
  }
  return (s) => { const f = Math.max(0, Math.min(k, s * k)), q = Math.min(k - 1, Math.floor(f)), w = f - q; return [lerp(r[q], r[q + 1], w), lerp(y[q], y[q + 1], w)]; };
}
const AT = { clump: table(PROFILE.clump), cyl: table(PROFILE.cyl), vase: table(PROFILE.vase) };
/** Lage des Profils bei s: u1 Klumpen → Zylinder, u2 Zylinder → Vase. */
function shapeAt(s, u1, u2, out, h1 = u1, h2 = u2) {
  // Radius nach u1/u2 (hinter den Händen), Höhe nach h1/h2 (alle Ringe gemeinsam: kein Ring überholt einen anderen)
  const a = AT.clump(s), b = AT.cyl(s), c = AT.vase(s);
  out[0] = lerp(lerp(a[0], b[0], u1), c[0], u2); out[1] = lerp(lerp(a[1], b[1], h1), c[1], h2);
  return out;
}
const ringS = (k) => 0.02 + (0.96 * k) / (RINGS - 1);
/** Zickzack-Ornament auf dem Bauch: Stelle s je Winkel. */
const ZIG = { s: 0.393, amp: 0.032, teeth: 9 }; // zwischen dem vierten und fünften Ring
const zigS = (a) => ZIG.s + ZIG.amp * (2 * Math.abs(((a / TAU) * ZIG.teeth) % 1 - 0.5) * 2 - 1);

// ---------------------------------------------------------------------------------------------------------------------
// Feste Teile: Scheibe, Spritzschale, Fuß oder Tretrad, Hand mit Unterarm
// ---------------------------------------------------------------------------------------------------------------------
const HEAD_R = 0.4, HEAD_Y = -0.05; // Scheibenkopf (dreht)
/** Teile, die mit der Scheibe drehen (Scheibenkopf, ab Stufe 1 Tretrad mit Speichen), und feste Teile. */
function machineParts(lv) {
  const turning = [curves('scheibe', [circle(HEAD_R, HEAD_Y, 72)], { w: 1.1 })], still = [];
  still.push(curves('schale', lv >= 1 ? [circle(0.63, -0.1, 72), circle(0.55, -0.26, 64)] : [circle(0.63, -0.1, 72)], { w: 0.95 }));
  if (lv >= 1) {
    const FY = -0.72, FR = 0.5;
    turning.push(curves('tretrad', [circle(FR, FY, 72), ...[0, 1, 2].map((i) => { const a = (i / 3) * TAU + 0.4; return [[0.06 * Math.cos(a), FY, 0.06 * Math.sin(a)], [FR * 0.94 * Math.cos(a), FY, FR * 0.94 * Math.sin(a)]]; })], { w: 0.95 }));
    still.push(curves('welle', [[[0, -0.3, 0], [0, FY + 0.05, 0]]], { w: 0.9 }));
    still.push(curves('gestell', [-1, 1].flatMap((s) => [[[s * 0.5, -0.28, 0.17], [s * 0.74, -0.9, 0.3]], [[s * 0.5, -0.28, -0.17], [s * 0.74, -0.9, -0.3]]]), { w: 0.9 }));
  } else {
    // Fuß: Kegelstumpf aus vier Kanten und einem Bodenring
    still.push(curves('fuss', [...[0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + Math.PI / 4; return [[0.2 * Math.cos(a), -0.12, 0.2 * Math.sin(a)], [0.36 * Math.cos(a), -0.6, 0.36 * Math.sin(a)]]; }), circle(0.38, -0.62, 56)], { w: 0.9 }));
  }
  return { turning, still };
}
/** Rechte Hand mit Unterarm im eigenen Rahmen: Handfläche bei x = 0 zur Vase, Finger nach oben, Anlagepunkt (0, 0). */
const HS = 1.45, HAND = [[0.0, -0.2], [-0.005, -0.06], [0.0, 0.08], [0.02, 0.16], [0.055, 0.19], [0.085, 0.16], [0.095, 0.04], [0.135, 0.02], [0.165, -0.04], [0.14, -0.08], [0.105, -0.09], [0.105, -0.2]].map(([x, y]) => [x * HS, y * HS]);
const ARM = [[[0.0, -0.29, 0], [0.36, -0.58, 0.48]], [[0.152, -0.29, 0], [0.5, -0.52, 0.44]]];
// Anlagepunkt im unteren Drittel der Handfläche: die Finger reichen über ihn hinaus, das Handgelenk bleibt über der Scheibe
const UP = 0.11;
const handParts = () => [curves('hand', [{ pts: HAND.map(([x, y]) => [x, y + UP, 0]), closed: true }], { w: 1.15 }), curves('arm', ARM.map((l) => l.map(([x, y, z]) => [x, y + UP, z])), { w: 0.9 })];
const lineLen = (l) => { const p = l.closed ? [...l.pts, l.pts[0]] : l.pts; let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], (p[i][2] || 0) - (p[i - 1][2] || 0)); return L; };
const partsLen = (parts) => parts.reduce((s, p) => s + p.lines.reduce((a, l) => a + lineLen(l), 0) * (p.w ?? 1), 0);

/**
 * Das Modell: Ringdrohnen (Ring k, Winkel a) + Ornament (Winkel a) + drehende und feste Maschinenteile + zwei Hände.
 * radius(k) ist der Radius, nach dem die Drohnen eines Rings verteilt werden (Mittel der Formen, die er durchläuft).
 */
export function potModel(n, forms = ['vase']) {
  const lv = potLevel(n), mach = machineParts(lv), hands = handParts();
  const rad = Array.from({ length: RINGS }, (_, k) => forms.reduce((s, f) => s + AT[f](ringS(k))[0], 0) / forms.length);
  const ringLen = rad.map((r) => TAU * r), zigLen = lv >= 2 ? TAU * AT.vase(ZIG.s)[0] * 1.35 : 0;
  const W_VASE = 1.15, W_HAND = 1;
  const lens = [ringLen.reduce((a, b) => a + b, 0) * W_VASE + zigLen, partsLen(mach.turning), partsLen(mach.still), 2 * partsLen(hands) * W_HAND];
  const [nv, nt, ns, nh] = share(n, lens);
  const [nr, nz] = share(nv, [ringLen.reduce((a, b) => a + b, 0) * W_VASE, zigLen || 1e-9]);
  const counts = share(nr, ringLen), slots = [];
  counts.forEach((c, k) => { const a0 = 0.37 * k; for (let q = 0; q < c; q++) slots.push({ k, a: a0 + (q / c) * TAU }); });
  for (let q = 0; q < nz; q++) slots.push({ k: -1, a: (q / nz) * TAU });
  const turning = assemble(mach.turning, nt), still = assemble(mach.still, ns);
  const [hr, hl] = share(nh, [1, 1]), handR = assemble(handParts(), hr), handL = assemble(handParts(), hl);
  return { lv, slots, turning, still, handR, handL, V: slots.length };
}

// ---------------------------------------------------------------------------------------------------------------------
// Bewegung: Zustand je Zeit (Profilmischung je Stelle, Drehwinkel, Handlage), daraus die Lage jeder Drohne
// ---------------------------------------------------------------------------------------------------------------------
/** Drehwinkel als Integral einer weichen Winkelgeschwindigkeit (Tabelle, 100 Schritte je Sekunde). */
function spinTable(omega, Tmax) {
  const dt = 0.01, k = Math.ceil(Tmax / dt) + 2, phi = new Float64Array(k + 1);
  for (let i = 1; i <= k; i++) phi[i] = phi[i - 1] + 0.5 * (omega((i - 1) * dt) + omega(i * dt)) * dt;
  return (T) => { const f = Math.max(0, Math.min(k, T / dt)), i = Math.min(k - 1, Math.floor(f)); return lerp(phi[i], phi[i + 1], f - i); };
}
const GAP = 0.085; // Abstand der Handfläche zur Wand

/**
 * Szene: st(T) liefert { u1(s), u2(s), dent(s), phi, hs, dx, dy, yaw }; pose(j, T, o) die Lage der Drohne j.
 * Reihenfolge der Drohnen: Ringe | Ornament | Scheibe (dreht) | Schale, Fuß, Gestell | rechte Hand | linke Hand.
 */
function scene(m, st) {
  const { V, turning, still, handR, handL } = m, T0 = V, S0 = T0 + turning.pts.length, R0 = S0 + still.pts.length, L0 = R0 + handR.pts.length, N = L0 + handL.pts.length;
  let at = NaN, s = null;
  const prof = [0, 0], tan = [0, 0], hand = { x: 0, y: 0, rot: 0 };
  const profAt = (x, out) => { shapeAt(x, s.u1(x), s.u2(x), out, s.whole[0], s.whole[1]); out[0] *= 1 - s.dent(x); return out; };
  const ready = (T) => {
    if (T === at) return; at = T; s = st(T);
    // Hand: Anlagepunkt auf der Wand bei hs, Neigung nach der Wand (Tangente), um dx nach außen, dy nach unten versetzt
    // Neigung aus der Form als Ganzes (ohne die wandernde Zone und die Delle): ändert sich weich mit der Zeit
    const [g1, g2] = s.whole; shapeAt(Math.min(1, s.hs + 0.1), g1, g2, tan); const r1 = tan[0], y1 = tan[1]; shapeAt(Math.max(0, s.hs - 0.1), g1, g2, tan);
    hand.rot = 0.6 * Math.max(-0.6, Math.min(0.6, Math.atan2(r1 - tan[0], (y1 - tan[1]) || 1e-6))); profAt(s.hs, prof);
    // die Hand liegt an der breitesten Stelle der Wand entlang ihrer Fläche an (unten Bauch, oben Lippe), nicht in ihr
    let sum = 0; for (let i = -8; i <= 10; i++) { profAt(Math.max(0, Math.min(1, s.hs + 0.018 * i)), tan); const d = Math.abs(tan[1] - prof[1]); sum += Math.exp(40 * (tan[0] - 0.25 * d) - 40 * prof[0]) * (1 - smooth((d - 0.2) / 0.08)); }
    const wide = prof[0] + Math.log(Math.max(1, sum)) / 40; // weiches Maximum: die Hand gleitet ohne Ruck über den Bauch
    hand.x = wide + GAP + s.dx; hand.y = prof[1] - s.dy;
  };
  const place = (o) => { yaw(o, s.yaw); pitch(o, PITCH); return o; };
  const pose = (j, T, o) => {
    ready(T);
    if (j < V) {
      const q = m.slots[j], x = q.k >= 0 ? ringS(q.k) : zigS(q.a);
      profAt(x, prof);
      const a = q.a + s.phi; o[0] = prof[0] * Math.cos(a); o[1] = prof[1]; o[2] = prof[0] * Math.sin(a);
      return place(o);
    }
    if (j < S0) { const p = turning.pts[j - T0], c = Math.cos(s.phi), sn = Math.sin(s.phi); o[0] = p[0] * c - p[2] * sn; o[1] = p[1]; o[2] = p[0] * sn + p[2] * c; return place(o); }
    if (j < R0) { const p = still.pts[j - S0]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; return place(o); }
    // Hände: rechte Hand wie gebaut, linke gespiegelt; Drehung in der Bildebene um den Anlagepunkt
    const right = j < L0, p = right ? handR.pts[j - R0] : handL.pts[j - L0], c = Math.cos(hand.rot), sn = Math.sin(hand.rot);
    const x = p[0] * c + p[1] * sn, y = -p[0] * sn + p[1] * c, sg = right ? 1 : -1;
    o[0] = sg * (hand.x + x); o[1] = hand.y + y; o[2] = p[2];
    return place(o);
  };
  return { pose, N, ranges: { V, T0, S0, R0, L0 }, state: (T) => { ready(T); return s; } };
}

const CLAY = mix(ORANGE, RED, 0.18), CLAY_LIP = mix(ORANGE, GOLD, 0.35);
function colours(m) {
  const { slots, turning, still, handR, handL } = m;
  const ring = slots.map((q) => (q.k < 0 ? GOLD : q.k === RINGS - 1 ? CLAY_LIP : mix(CLAY, ORANGE, q.k / (RINGS - 1) * 0.4)));
  const steel = mix(BLUE, DIAMOND, 0.55);
  return [
    ...ring,
    ...turning.tags.map((t) => (t === 'scheibe' ? mix(DIAMOND, CYAN, 0.25) : steel)),
    ...still.tags.map(() => steel),
    ...[...handR.tags, ...handL.tags].map((t) => (t === 'hand' ? mix(WARM, GOLD, 0.22) : mix(WARM, GOLD, 0.1))),
  ];
}
/** Drehrillen: auf jedem Ring eine helle Stelle, über die Ringe zur Spirale versetzt; dreht mit den Drohnen. */
const groove = (q) => 1 + 0.38 * Math.exp(-((wrap(q.a - 0.9 * q.k) / 0.45) ** 2));
/** Lichtmarken auf der Scheibe: vier helle Bögen, die mitdrehen. */
const headMark = (p) => { const a = Math.atan2(p[2], p[0]); return 0.85 + 0.6 * Math.exp(-((wrap(4 * a) / 0.5) ** 2)); };
const groups = (m, sc, pts) => {
  const { V, T0, S0, R0, L0 } = sc.ranges;
  return [part('vase', pts.slice(0, V), { rigid: true }), part('scheibe', pts.slice(T0, R0), { rigid: true }), part('haende', pts.slice(R0), { rigid: true })];
};

// ---------------------------------------------------------------------------------------------------------------------
// 3D: die fertige Vase dreht, die Hände gleiten an der Wand
// ---------------------------------------------------------------------------------------------------------------------
const W3 = 1.9; // rad/s
const H3 = { hold: 14, glide: 7 };
const one = () => 1, zero = () => 0;
function state3d() {
  const phi = spinTable((T) => W3 * ease(T / 2), 30);
  return (T) => {
    const on = ease(T / 1.6), hs = 0.56 - 0.19 * Math.cos((T * TAU) / H3.glide) * on;
    const dent = (x) => 0.075 * on * Math.exp(-(((x - hs) / 0.08) ** 2));
    return { u1: one, u2: one, whole: [1, 1], dent, phi: phi(T), hs, dx: 0, dy: 0, yaw: 0.32 * Math.sin((T * TAU) / 15) };
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3D+: Klumpen → Zylinder → Vase → Glasur
// ---------------------------------------------------------------------------------------------------------------------
const ACT = [0, 3, 8.4, 14.6, 21];
const P1 = { t0: 4.3, dur: 3.4, from: 0.34, to: 0.84 }; // Hochziehen zum Zylinder
const P2 = { t0: 9.4, dur: 4.6, from: 0.32, to: 0.76 }; // Bauch und Hals
const WIDTH = 0.42; // Breite der Zone, in der das Profil hinter den Händen nachgibt (Anteil der Profillänge)
const follow = (q) => (x) => ease((q * (1 + WIDTH) - x) / WIDTH);
function stateStory() {
  // Scheibe: läuft an, dreht, wird im letzten Akt langsamer
  const omega = (T) => 2.1 * ease(T / 1.8) * (1 - 0.5 * ease((T - 15.2) / 3.6)); // läuft nicht ganz aus: ein Halt sähe aus wie Zurückschwingen
  const phi = spinTable(omega, 30);
  return (T) => {
    const q1 = ease((T - P1.t0) / P1.dur), q2 = ease((T - P2.t0) / P2.dur);
    // Handhöhe: Mitte des Klumpens → hinab zum Fuß → mit dem Zylinder hoch → wieder hinab → mit dem Hals hoch (beim
    // Loslassen bleibt sie stehen, die Hände gehen nur nach außen und unten: keine Gegenbewegung)
    let hs = 0.45;
    hs = lerp(hs, P1.from, ease((T - 3.3) / 1.0));
    hs = lerp(hs, P1.to, q1);
    hs = lerp(hs, P2.from, ease((T - 7.9) / 1.5));
    hs = lerp(hs, P2.to, q2);
    // beim Hinabgleiten lösen sich die Hände kurz von der Wand (sie schieben nichts nach unten)
    const lift = 0.07 * (Math.sin(Math.PI * Math.max(0, Math.min(1, (T - 3.3) / 1.0))) ** 2 + Math.sin(Math.PI * Math.max(0, Math.min(1, (T - 7.9) / 1.5))) ** 2);
    const dx = 0.36 * (1 - ease((T - 0.6) / 2.2)) + lift + 0.42 * ease((T - 14.8) / 2.6);
    const dy = 0.12 * (1 - ease((T - 0.6) / 2.2)) + 0.3 * ease((T - 15.4) / 2.4);
    // eine Druckstelle unter den Händen, solange sie ziehen
    const press = Math.min(ease((T - P1.t0 + 0.3) / 0.6) * (1 - ease((T - P1.t0 - P1.dur) / 0.4)) + ease((T - P2.t0 + 0.3) / 0.6) * (1 - ease((T - P2.t0 - P2.dur) / 0.5)), 1);
    const dent = (x) => 0.06 * press * Math.exp(-(((x - hs) / 0.07) ** 2));
    return { u1: follow(q1), u2: follow(q2), whole: [q1, q2], dent, phi: phi(T), hs, dx, dy, yaw: 0.22 * Math.sin((T * TAU) / 19) };
  };
}

function fitOf(at, times) { return times.flatMap((T) => at(T)).filter((_, i) => i % 3 === 0); }

export const builders = {
  potteryWheel3d: (n, caption) => {
    const m = potModel(n), sc = scene(m, state3d()), col = colours(m), { V } = sc.ranges;
    const at = (T) => Array.from({ length: n }, (_, j) => [...sc.pose(j, T, [0, 0, 0]), ...col[j]]);
    const fitPts = fitOf(at, [0, 2, 4, 6, 8, 10, 12, 14]);
    const { T0, S0 } = sc.ranges;
    return { beats: [{ ...act(groups(m, sc, at(0)), { caption, hold: H3.hold, live: (p, j, t, o) => {
      sc.pose(j, t, o);
      if (j < V) { const q = m.slots[j]; o[3] = q.k < 0 ? 1.25 + 0.25 * Math.sin(t * 2 + q.a * 3) : groove(q); }
      else if (j < S0) o[3] = m.turning.tags[j - T0] === 'scheibe' ? headMark(m.turning.pts[j - T0]) : 0.9;
      else o[3] = 1;
    } }), fitPts }] };
  },

  potteryWheelStory: (n) => {
    const m = potModel(n, ['clump', 'cyl', 'vase']), stf = stateStory(), sc = scene(m, stf), col = colours(m), { V, T0, S0 } = sc.ranges;
    const at = (T) => Array.from({ length: n }, (_, j) => [...sc.pose(j, T, [0, 0, 0]), ...col[j]]);
    const fitPts = fitOf(at, [0, 2, 5, 8, 11, 13, 15, 17, 19, 21]);
    const light = (j, T) => {
      if (j < V) {
        const q = m.slots[j], x = q.k >= 0 ? ringS(q.k) : zigS(q.a);
        // Glasur: eine Lichtspirale steigt vom Fuß zur Lippe, dahinter glänzt die Vase
        const front = (T - 15.6) / 3.0, spiral = wrap(q.a + stf(T).phi - 6 * x - 2.5 * T);
        const glaze = smooth((front - x) / 0.12), wave = Math.exp(-(((front - x) / 0.09) ** 2)) * (0.6 + 0.6 * Math.exp(-((spiral / 0.9) ** 2)));
        if (q.k < 0) return 0.55 + 0.25 * ease((T - 9) / 3) + 1.1 * glaze * (0.85 + 0.2 * Math.sin(T * 3 + q.a * 4)) + wave; // Ornament: erst Ritzung, dann Gold
        // als Klumpen leuchtet nur jeder zweite Ring (lockere Linien statt einer gefüllten Kugel), bis die Hände ziehen
        const quiet = q.k % 2 ? 0.7 * (1 - ease((T - P1.t0 - 0.4) / 2.5)) : 0;
        return groove(q) * (1 - 0.25 * glaze) * (1 - quiet) + 0.55 * glaze + wave + (q.k === RINGS - 1 ? 0.5 * glaze * (0.5 + 0.5 * Math.sin(T * 4 + q.a * 5)) : 0);
      }
      if (j < S0) return m.turning.tags[j - T0] === 'scheibe' ? headMark(m.turning.pts[j - T0]) : 0.9;
      return 1;
    };
    const caps = ['toepferscheibe.lump', 'toepferscheibe.centre', 'toepferscheibe.pull', 'toepferscheibe.glaze'];
    return { beats: caps.map((key, a) => ({ ...act(groups(m, sc, at(ACT[a])), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (p, j, t, o) => {
      const T = ACT[a] + t; sc.pose(j, T, o); o[3] = light(j, T);
    } }), fitPts })) };
  },
};
