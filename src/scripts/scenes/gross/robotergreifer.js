import { t as message } from '../../../i18n/ui.mjs';
// Der Robotergreifer (Runde 11b, große Motive, Anlass Marketing, ab 800 Drohnen). Kandidat FSK-030 der Motiv-Shortlist
// (freelance/clients/flyingstars/25-motiv-shortlist-2026-11-20). Gebaut wie Satellit und Förderband: ein mechanischer
// Körper aus wenigen klaren Teilen, nur Kanten, und eine echte Kinematik.
//   - Ein Knickarm: Sockel, Drehturm (dreht um die Senkrechte), Schulter, Oberarm, Ellbogen, Unterarm, Handgelenk,
//     Greiferhand mit zwei Backen. Jedes Glied ist ein Kasten aus vier Kanten, jedes Gelenk ein kurzer Zylinder (zwei
//     Kreise auf der Achse). Jede Drohne gehört zu einem Glied und hat dort feste Koordinaten; die Lage folgt aus den
//     Gelenkwinkeln (Vorwärtskinematik).
//   - Die Haltungen entstehen aus Zielpunkten (inverse Kinematik: wo soll die Hand sein, wie gedreht) und werden im
//     Gelenkraum weich ineinander übergeführt, wie ein Industrieroboter fährt: alle Gelenke starten und halten zusammen.
//   - Das Modul liegt links schräg (45°) auf einer Ablage, die Aufnahme rechts auf einer Platine. Der Greifer dreht die
//     Hand passend, greift, hebt, schwenkt, dreht das Modul gerade (ausrichten), setzt es ein. Beim Einrasten läuft Licht
//     von der Aufnahme über die Leiterbahnen: die Platine erwacht.
// Mehr Drohnen bringen ein Kabel am Arm, Schrauben am Sockel, ein zweites Modul auf der Ablage und LEDs auf der Platine.
//
//   robotArm3d (3D, ab 800): der Arm an seinem Arbeitsplatz (ohne Modul), eine ruhige Vorführung aller Gelenke: Turm schwenkt,
//     Arm reckt sich, Handgelenk dreht, Greifer öffnet und schließt.
//   robotArmStory (3D+, ab 800): greifen → anheben und zur Aufnahme schwenken → ausrichten → einsetzen, Klick, die
//     Platine leuchtet, der Arm richtet sich auf.
// Steht im Marketing direkt hinter dem Kleinen Roboter. Wächter: scripts/robotergreifer.test.mjs.
import { TAU, GOLD, WARM, CYAN, BLUE, DIAMOND, ORANGE, GREEN, VIOLET, mix, smooth, yaw, pitch, part, act } from '../../show-motion.js';
import { curves, spot, assemble } from '../catalog-3d/kit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const UP = [0, 1, 0];

/** Detailstufe nach Drohnen: 0 bis 899, 1 ab 900. */
export const armLevel = (n) => (n >= 900 ? 1 : 0);

// ---------------------------------------------------------------------------------------------------------------------
// Bauplan
// ---------------------------------------------------------------------------------------------------------------------
const TABLE = { y: -0.58, x: 1.3, z: 0.5 };
const BASE = [0, TABLE.y, -0.12]; // Sockelmitte auf dem Tisch
const SH = 0.34; // Schulter über dem Tisch
const L1 = 0.62, L2 = 0.56, LW = 0.1, PALM = 0.05, FING = 0.14; // Oberarm, Unterarm, Handgelenk, Hand, Backen
const TOOL = LW + PALM + FING * 0.6; // vom Handgelenk bis zum Greifpunkt
const MOD = { h: 0.1, w: 0.085 }; // Modul: Höhe, halbe Kantenlänge
const TRAY = { c: [-0.8, TABLE.y, 0.16], h: 0.1 }; // Ablage links
const BOARD = { c: [0.8, TABLE.y + 0.012, 0.16], hx: 0.34, hz: 0.26 }; // Platine rechts
const GRIP = { open: 0.16, closed: 0.115 }; // Backenabstand von der Mitte

/** Rahmen: Ursprung o und Achsen X, Y, Z (Einheitsvektoren). */
const frame = (o, X, Y, Z) => ({ o, X, Y, Z });
const toWorld = (f, l, out) => { for (let c = 0; c < 3; c++) out[c] = f.o[c] + l[0] * f.X[c] + l[1] * f.Y[c] + l[2] * f.Z[c]; return out; };
const toLocal = (f, p) => { const d = sub(p, f.o); return [dot(d, f.X), dot(d, f.Y), dot(d, f.Z)]; };

/** Vorwärtskinematik: Gelenkzustand q → Rahmen aller Glieder. q = { yaw, a1, a2, a3, roll, grip }. */
function frames(q) {
  const dir = [Math.cos(q.yaw), 0, Math.sin(q.yaw)], n = [-Math.sin(q.yaw), 0, Math.cos(q.yaw)];
  const S = add(BASE, [0, SH, 0]);
  const axis = (a) => [add(mul(dir, Math.cos(a)), mul(UP, Math.sin(a))), add(mul(dir, -Math.sin(a)), mul(UP, Math.cos(a)))];
  const [X1, Y1] = axis(q.a1), E = add(S, mul(X1, L1));
  const [X2, Y2] = axis(q.a1 + q.a2), W = add(E, mul(X2, L2));
  const [X3, Y3] = axis(q.a1 + q.a2 + q.a3), H = add(W, mul(X3, LW));
  // Hand: Achse X3 (zur Greifspitze), um diese Achse um roll gedreht
  const c = Math.cos(q.roll), s = Math.sin(q.roll), F = add(mul(n, c), mul(cross(X3, n), s)), G = cross(X3, F);
  const hand = frame(H, X3, F, G);
  return {
    turret: frame(BASE, dir, UP, n), upper: frame(S, X1, Y1, n), fore: frame(E, X2, Y2, n), wrist: frame(W, X3, Y3, n), hand,
    fingerA: frame(add(H, mul(F, q.grip)), X3, F, G), fingerB: frame(add(H, mul(F, -q.grip)), X3, F, G),
    tip: add(H, mul(X3, PALM + FING * 0.6)),
  };
}
/** Inverse Kinematik: Greifpunkt P, Hand senkrecht nach unten, Backen quer zur Weltrichtung phi (Winkel in der
 * Waagerechten, wie der Modulrahmen); Ellbogen oben. */
function ik(P, phi, grip, lift = 0) {
  const W = add(P, [0, TOOL + lift, 0]), S = add(BASE, [0, SH, 0]), d = sub(W, S);
  const yawA = Math.atan2(d[2], d[0]), r = Math.hypot(d[0], d[2]), h = d[1], D = Math.min(L1 + L2 - 1e-6, Math.hypot(r, h));
  const a2 = -Math.acos(Math.max(-1, Math.min(1, (D * D - L1 * L1 - L2 * L2) / (2 * L1 * L2))));
  const a1 = Math.atan2(h, r) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
  // die Öffnungsrichtung der Hand liegt bei Winkel yaw + π/2 + roll (Hand senkrecht); Backen sind symmetrisch (mod π)
  let roll = phi - (yawA + Math.PI / 2);
  roll = ((((roll + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI) - Math.PI / 2;
  return { yaw: yawA, a1, a2, a3: -Math.PI / 2 - a1 - a2, roll, grip };
}

// Glieder in ihren eigenen Koordinaten (x längs, y quer in der Armebene, z Gelenkachse) ---------------------------------
const hub = (x, r, zs, k = 16) => zs.map((z) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [x + Math.cos(a) * r, Math.sin(a) * r, z]; }), closed: true }));
const beam = (x0, x1, hy, hz) => [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => [[x0, a * hy, b * hz], [x1, a * hy, b * hz]]);
const LINKS = {
  // Turm (Rahmen turret: x Armrichtung, y oben): Sockelringe, Drehkranz, Schulterbock mit Achse
  turret: () => [
    ...[0, 0.07].map((y) => ({ pts: Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * TAU; return [Math.cos(a) * 0.2, y, Math.sin(a) * 0.2]; }), closed: true })),
    ...[0.1, 0.17].map((y) => ({ pts: Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * TAU; return [Math.cos(a) * 0.14, y, Math.sin(a) * 0.14]; }), closed: true })),
    ...[-1, 1].map((s) => [[-0.07, 0.17, s * 0.125], [-0.025, SH - 0.09, s * 0.125], [0.025, SH - 0.09, s * 0.125], [0.07, 0.17, s * 0.125]]), // Schulterbock endet unter dem Gelenk
  ],
  upper: () => [...hub(0, 0.075, [-0.1, 0.1]), ...beam(0.08, L1 - 0.07, 0.045, 0.06), ...hub(L1, 0.06, [-0.085, 0.085])],
  fore: () => [...beam(0.065, L2 - 0.05, 0.035, 0.045), ...hub(L2, 0.045, [-0.065, 0.065])],
  wrist: () => [[[0.045, 0, 0], [LW, 0, 0]], ...hub(LW * 0.55, 0.03, [0])],
  // Hand (x zur Spitze, y Öffnungsrichtung, z quer): Handplatte
  hand: () => [{ pts: [[0, -GRIP.open - 0.01, -0.04], [0, GRIP.open + 0.01, -0.04], [0, GRIP.open + 0.01, 0.04], [0, -GRIP.open - 0.01, 0.04]], closed: true }, [[0, 0, 0], [PALM, 0, 0]]],
  // Backe (eigener Rahmen am Backenort): ein schmaler Rahmen längs der Greifrichtung
  finger: () => [{ pts: [[PALM + 0.015, 0, -0.035], [PALM + FING, 0, -0.025], [PALM + FING, 0, 0.025], [PALM + 0.015, 0, 0.035]], closed: true }],
};
/** Modul in eigenen Koordinaten (y oben): Kasten mit Kontaktstiften unten und Leuchtpunkt oben. */
const moduleLines = (lv) => {
  const w = MOD.w, h = MOD.h / 2, c = (a, y, b) => [a * w, y, b * w];
  return [
    { pts: [c(-1, -h, -1), c(1, -h, -1), c(1, -h, 1), c(-1, -h, 1)], closed: true }, { pts: [c(-1, h, -1), c(1, h, -1), c(1, h, 1), c(-1, h, 1)], closed: true },
    ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [c(a, -h, b), c(a, h, b)]),
    ...(lv >= 1 ? [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]] : [[-0.5, 0], [0.5, 0]]).map(([a, b]) => [c(a, -h - 0.005, b), c(a, -h - 0.05, b)]),
  ];
};
const MOD_REST = { c: add(TRAY.c, [0, TRAY.h + MOD.h / 2 + 0.008, 0]), roll: Math.PI / 4 }; // schräg auf der Ablage
const SOCKET = add(BOARD.c, [0, MOD.h / 2 + 0.012, 0]); // Modulmitte, wenn es sitzt

/** Feste Teile: Tisch, Ablage, Platine mit Aufnahme und Leiterbahnen. */
function fixedParts(lv) {
  const P = [], T = TABLE, ty = T.y;
  P.push(curves('tisch', [{ pts: [[-T.x, ty, -T.z], [T.x, ty, -T.z], [T.x, ty, T.z], [-T.x, ty, T.z]], closed: true }, [[-T.x, ty - 0.06, T.z], [T.x, ty - 0.06, T.z]]], { w: 0.75 }));
  const tc = TRAY.c, th = TRAY.h, r = 0.14;
  P.push(curves('ablage', [{ pts: [[tc[0] - r, ty + th, tc[2] - r], [tc[0] + r, ty + th, tc[2] - r], [tc[0] + r, ty + th, tc[2] + r], [tc[0] - r, ty + th, tc[2] + r]], closed: true }, ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [[tc[0] + a * r, ty, tc[2] + b * r], [tc[0] + a * r, ty + th, tc[2] + b * r]])], { w: 0.8 }));
  const b = BOARD, by = b.c[1];
  P.push(curves('platine', [{ pts: [[b.c[0] - b.hx, by, b.c[2] - b.hz], [b.c[0] + b.hx, by, b.c[2] - b.hz], [b.c[0] + b.hx, by, b.c[2] + b.hz], [b.c[0] - b.hx, by, b.c[2] + b.hz]], closed: true }], { w: 0.9 }));
  const s = MOD.w + 0.035;
  P.push(curves('aufnahme', [{ pts: [[b.c[0] - s, by + 0.004, b.c[2] - s], [b.c[0] + s, by + 0.004, b.c[2] - s], [b.c[0] + s, by + 0.004, b.c[2] + s], [b.c[0] - s, by + 0.004, b.c[2] + s]], closed: true }], { w: 1.1 }));
  // Leiterbahnen: von der Aufnahme mit einem Knick zum Platinenrand (rechtwinklig, wie geätzt)
  const tr = [[1, 0.06, 0.2], [1, -0.06, 0.1], [-1, 0.05, 0.15], [-1, -0.08, 0.22]].map(([sx, z0, dz]) => [[b.c[0] + sx * s, by + 0.004, b.c[2] + z0], [b.c[0] + sx * (s + 0.08), by + 0.004, b.c[2] + z0], [b.c[0] + sx * (s + 0.08 + dz * 0.5), by + 0.004, b.c[2] + z0 + Math.sign(z0) * dz * 0.5], [b.c[0] + sx * (b.hx - 0.03), by + 0.004, b.c[2] + z0 + Math.sign(z0) * dz * 0.5]]);
  P.push(curves('bahn', tr, { w: 0.85 }));
  if (lv >= 1) {
    P.push(...[[-0.22, -0.18], [-0.22, 0.18], [0.22, -0.18], [0.22, 0.18]].map(([x, z]) => spot('led', [b.c[0] + x, by + 0.006, b.c[2] + z], 1)));
    P.push(...[0, 1, 2, 3].map((k) => { const a = (k / 4) * TAU + 0.4; return spot('schraube', [BASE[0] + Math.cos(a) * 0.24, ty + 0.004, BASE[2] + Math.sin(a) * 0.24], 1); }));
  }
  return P;
}

/** Das Modell: Drohnen je Glied (lokale Koordinaten), feste Teile, Modul. */
export function armModel(n, { table = true, module = true } = {}) {
  const lv = armLevel(n), q0 = track(KEYS_STORY)(0), F = frames(q0), parts = []; // Ruhelage = erste Haltung beider Fassungen
  const linkParts = [['turret', 'turret', 1.0], ['upper', 'upper', 1.1], ['fore', 'fore', 1.1], ['wrist', 'wrist', 1], ['hand', 'hand', 1.05], ['fingerA', 'finger', 1.2], ['fingerB', 'finger', 1.2]];
  for (const [fr, kind, w] of linkParts) parts.push({ ...curves(fr, LINKS[kind]().map((l) => (Array.isArray(l) ? { pts: l.map((p) => toWorld(F[fr], p, [0, 0, 0])) } : { ...l, pts: l.pts.map((p) => toWorld(F[fr], p, [0, 0, 0])) }))), w });
  if (lv >= 1) parts.push(curves('kabel', [cable(F)], { w: 0.8 }));
  if (table) {
    parts.push(...fixedParts(lv));
  }
  if (table && module) {
    const mf = moduleFrame(MOD_REST.c, MOD_REST.roll);
    parts.push(curves('modul', moduleLines(lv).map((l) => (Array.isArray(l) ? { pts: l.map((p) => toWorld(mf, p, [0, 0, 0])) } : { ...l, pts: l.pts.map((p) => toWorld(mf, p, [0, 0, 0])) })), { w: 1.25 }), spot('modullicht', toWorld(mf, [0, MOD.h / 2 + 0.004, 0], [0, 0, 0]), 3, 0.025, [0, 1, 0]));
  }
  const raw = assemble(parts, n);
  // Drohnen nach Teilen ordnen (jedes Glied ein starrer Teil für die Engine und den Finten-Wächter, der je Teil die
  // gemeinsame Bewegung abzieht; als ein einziges Teil erschienen Gelenkbewegungen und der stehende Tisch als Finten)
  const perm = raw.pts.map((_, j) => j).sort((a, b) => GROUP_ORDER.indexOf(GROUP_OF(raw.tags[a])) - GROUP_ORDER.indexOf(GROUP_OF(raw.tags[b])) || a - b);
  const pts = perm.map((j) => raw.pts[j]), tags = perm.map((j) => raw.tags[j]);
  const groups = GROUP_ORDER.map((name) => ({ name, count: tags.filter((t) => GROUP_OF(t) === name).length })).filter((g) => g.count);
  // lokale Koordinaten je Drohne im Rahmen ihres Glieds (Kabel: Stelle auf dem Arm)
  const local = pts.map((p, j) => (F[tags[j]] ? toLocal(F[tags[j]], p) : tags[j] === 'modul' || tags[j] === 'modullicht' ? toLocal(moduleFrame(MOD_REST.c, MOD_REST.roll), p) : null));
  const cableU = pts.map((p, j) => (tags[j] === 'kabel' ? nearestU(cable(F), p) : 0));
  return { lv, pts, tags, local, cableU, groups };
}
const GROUP_ORDER = ['tisch', 'turret', 'upper', 'fore', 'hand', 'fingerA', 'fingerB', 'kabel', 'modul'];
const GROUP_OF = (tag) => (['turret', 'upper', 'fore', 'fingerA', 'fingerB', 'kabel'].includes(tag) ? tag : tag === 'wrist' || tag === 'hand' ? 'hand' : tag === 'modul' || tag === 'modullicht' ? 'modul' : 'tisch');
/** Teile eines Bildes aus den Lagen pts (Reihenfolge wie im Modell). */
const partsOf = (m, pts) => { let s = 0; return m.groups.map((g) => { const q = part(g.name, pts.slice(s, s + g.count), { rigid: true }); s += g.count; return q; }); };
/** Modulrahmen: Mitte c, um die Senkrechte um roll gedreht (y oben). */
function moduleFrame(c, roll) { const X = [Math.cos(roll), 0, Math.sin(roll)], Z = [-Math.sin(roll), 0, Math.cos(roll)]; return frame(c, X, UP, Z); }
/** Kabel: vom Turm über die Oberseite des Oberarms und Unterarms zum Handgelenk, leicht durchhängend. */
function cable(F) {
  const ctrl = [toWorld(F.turret, [-0.08, 0.2, -0.15], [0, 0, 0]), toWorld(F.upper, [0.15, 0.1, -0.15], [0, 0, 0]), toWorld(F.upper, [L1 * 0.6, 0.1, -0.14], [0, 0, 0]), toWorld(F.upper, [L1, 0.1, -0.14], [0, 0, 0]), toWorld(F.fore, [0.14, 0.085, -0.12], [0, 0, 0]), toWorld(F.fore, [L2 * 0.75, 0.07, -0.1], [0, 0, 0])];
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) for (let k = 0; k < 8; k++) { const u = k / 8; out.push(add(mul(ctrl[i], 1 - u), mul(ctrl[i + 1], u))); }
  out.push(ctrl.at(-1));
  return out;
}
/** Stelle eines Punkts auf der Kabellinie (Index mit Bruchteil, 0 … 1): Lot auf das nächste Stück. */
const nearestU = (line, p) => {
  let best = Infinity, u = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], ab = sub(line[i + 1], a), L2 = dot(ab, ab) || 1e-12, t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / L2)), d = Math.hypot(...sub(p, add(a, mul(ab, t))));
    if (d < best) { best = d; u = (i + t) / (line.length - 1); }
  }
  return u;
};

// ---------------------------------------------------------------------------------------------------------------------
// Haltungen und Zeitpläne
// ---------------------------------------------------------------------------------------------------------------------
// Bahnsteuerung (Runde 11b, Finten-Wächter): Ziele sind Greifpunkte, nicht Gelenkwinkel. Zwischen zwei Zielen fährt die
// Hand auf einer Geraden, weich an- und abgebremst; die Gelenke folgen per inverser Kinematik. Im Gelenkraum interpoliert
// beschrieb die Hand Bögen, die über das Ziel hinausschwangen (für den Wächter Ausholen und Überschwingen).
/** Ziel: Greifpunkt P (mit Hub lift), Backenrichtung phi (Weltwinkel), Backenabstand grip. */
const tgt = (P, phi, grip, lift = 0) => ({ P: add(P, [0, lift, 0]), phi, grip });
/** Gelenkzustand zu einem Ziel: Turmwinkel nahe yawRef (durchgehend gezählt), Handdrehung ohne Rest modulo π (stetig). */
function solve(g, yawRef) {
  const q = ik(g.P, g.phi, g.grip);
  let y = q.yaw; while (y - yawRef > Math.PI) y -= TAU; while (yawRef - y > Math.PI) y += TAU;
  return { ...q, yaw: y, roll: g.phi - (y + Math.PI / 2) };
}
/** Zeitplan aus Zielen [Zeit, Ziel]: Turmwinkel der Ziele vorab durchgehend gezählt, Backenrichtung je Ziel um ein
 * Vielfaches von π so gewählt, dass die Hand sich so wenig wie möglich dreht; dazwischen gerade Bahnen. */
function track(keys0) {
  const ref = [], keys = [];
  keys0.forEach(([t, g], i) => {
    const q = solve(g, i ? ref[i - 1].yaw : ik(g.P, g.phi, g.grip).yaw), want = i ? ref[i - 1].roll : 0;
    const k = Math.round((want - q.roll) / Math.PI), gg = { ...g, phi: g.phi + k * Math.PI };
    keys.push([t, gg]); ref.push({ ...q, roll: q.roll + k * Math.PI });
  });
  return (T) => {
    if (T <= keys[0][0]) return ref[0];
    for (let i = 1; i < keys.length; i++) if (T <= keys[i][0]) {
      const u = ease((T - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])), a = keys[i - 1][1], b = keys[i][1];
      // Schwenk (joint): im Gelenkraum, wie ein Industrieroboter große Wege fährt; eine Gerade nahe der Turmachse ließe
      // den Turm zu schnell drehen
      if (b.joint) return Object.fromEntries(Object.keys(ref[i]).map((k) => [k, lerp(ref[i - 1][k], ref[i][k], u)]));
      const g = { P: [0, 1, 2].map((k) => lerp(a.P[k], b.P[k], u)), phi: lerp(a.phi, b.phi, u), grip: lerp(a.grip, b.grip, u) };
      return solve(g, lerp(ref[i - 1].yaw, ref[i].yaw, u));
    }
    return ref.at(-1);
  };
}
// 3D+: greifen, anheben, schwenken (hoch und hinter dem Sockel), ausrichten, einsetzen, loslassen, aufrichten
const PICK = MOD_REST.c, PLACE = SOCKET;
const G = {
  home: tgt([0.12, 0.42, 0.06], Math.PI / 2, GRIP.open),
  abovePick: tgt(PICK, MOD_REST.roll, GRIP.open, 0.32),
  atPick: tgt(PICK, MOD_REST.roll, GRIP.open),
  gripped: tgt(PICK, MOD_REST.roll, GRIP.closed),
  lifted: tgt(PICK, MOD_REST.roll, GRIP.closed, 0.36),
  // beim Schwenk hoch und hinter dem Sockel (vorn zeigte der gestreckte Arm mitten im Schwenk aufs Publikum)
  carry: tgt([BASE[0] - 0.2, TABLE.y + 0.82, BASE[2] - 0.42], MOD_REST.roll, GRIP.closed),
  carry2: tgt([BASE[0] + 0.35, TABLE.y + 0.8, BASE[2] - 0.43], MOD_REST.roll, GRIP.closed),
  abovePlace: tgt(PLACE, MOD_REST.roll, GRIP.closed, 0.3),
  aligned: tgt(PLACE, 0, GRIP.closed, 0.3),
  inserted: tgt(PLACE, 0, GRIP.closed),
  released: tgt(PLACE, 0, GRIP.open),
  clear: tgt(PLACE, 0, GRIP.open, 0.34),
};
const Q = Object.fromEntries(Object.entries(G).map(([k, g]) => [k, ik(g.P, g.phi, g.grip)]));
const HOME = Q.home;
const ACT = [0, 6.4, 11.6, 15.2, 23];
const KEYS_STORY = [
  [0.0, G.home], [2.6, G.abovePick], [4.4, G.atPick], [5.2, G.gripped],
  // Schwenk hinter dem Sockel als gerade Strecken über zwei Punkte weit weg von der Turmachse (jede Koordinate wandert in
  // eine Richtung); nach dem Anheben eine kurze Haltepause
  [6.9, G.lifted], [7.3, G.lifted], [9.0, G.carry], [10.4, G.carry2], [11.8, G.abovePlace], [13.9, G.aligned],
  [16.2, G.inserted], [17.4, G.released], [19.2, G.clear], [22.4, { ...G.home, phi: 0 }],
];
const STORY = { grab: 5.2, release: 16.9, click: 16.25 };
// 3D: Vorführung ohne Modul, eine Folge von Zielen
const G3 = [G.home, tgt([-0.55, -0.1, 0.35], 0.6, GRIP.open, 0.15), tgt([-0.55, -0.25, 0.35], 0.6, GRIP.closed), tgt([0.4, 0.15, 0.45], -0.5, GRIP.closed, 0.2), tgt([0.62, -0.2, 0.1], 0.3, GRIP.open, 0.1), { ...G.home, phi: 0.3 }];
const KEYS_3D = G3.map((g, i) => [i * 2.6, g]);
const H3 = (G3.length - 1) * 2.6;

/** Lage aller Drohnen: Glieder nach Kinematik, Modul an der Ablage / in der Hand / in der Aufnahme. */
function makePose(m, track, story) {
  let at = NaN, F = null, grabLocal = null, placeFrame = null;
  const modFrameAt = (T) => {
    if (!story) return null;
    if (T < story.grab) return moduleFrame(MOD_REST.c, MOD_REST.roll);
    const handAt = (t) => frames(track(t)).hand;
    grabLocal ||= (() => { const h = handAt(story.grab), mf = moduleFrame(MOD_REST.c, MOD_REST.roll); return { o: toLocal(h, mf.o), X: [dot(mf.X, h.X), dot(mf.X, h.Y), dot(mf.X, h.Z)], Y: [dot(mf.Y, h.X), dot(mf.Y, h.Y), dot(mf.Y, h.Z)], Z: [dot(mf.Z, h.X), dot(mf.Z, h.Y), dot(mf.Z, h.Z)] }; })();
    const h = T < story.release ? handAt(T) : (placeFrame ||= handAt(story.release));
    const vec = (v) => [v[0] * h.X[0] + v[1] * h.Y[0] + v[2] * h.Z[0], v[0] * h.X[1] + v[1] * h.Y[1] + v[2] * h.Z[1], v[0] * h.X[2] + v[1] * h.Y[2] + v[2] * h.Z[2]];
    return frame(toWorld(h, grabLocal.o, [0, 0, 0]), vec(grabLocal.X), vec(grabLocal.Y), vec(grabLocal.Z));
  };
  let MF = null;
  return (j, T, o) => {
    if (T !== at) { at = T; F = frames(track(T)); MF = modFrameAt(T); }
    const tag = m.tags[j], l = m.local[j];
    if (F[tag] && l) return toWorld(F[tag], l, o);
    if ((tag === 'modul' || tag === 'modullicht') && MF) return toWorld(MF, l, o);
    if (tag === 'kabel') { const c = cable(F), f = m.cableU[j] * (c.length - 1), i = Math.min(c.length - 2, Math.floor(f)), w = f - i; for (let k = 0; k < 3; k++) o[k] = lerp(c[i][k], c[i + 1][k], w); return o; }
    const p = m.pts[j]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; return o;
  };
}

const COLOURS = {
  turret: mix(DIAMOND, BLUE, 0.3), upper: ORANGE, fore: ORANGE, wrist: mix(ORANGE, GOLD, 0.5), hand: mix(DIAMOND, CYAN, 0.4), fingerA: CYAN, fingerB: CYAN,
  kabel: mix(VIOLET, BLUE, 0.4), tisch: mix(DIAMOND, BLUE, 0.55), ablage: mix(DIAMOND, BLUE, 0.4), platine: GREEN, aufnahme: mix(GREEN, WARM, 0.45), bahn: mix(GREEN, GOLD, 0.35),
  led: GREEN, schraube: mix(DIAMOND, BLUE, 0.3), modul: GOLD, modullicht: CYAN,
};
const view = (o, ya) => { yaw(o, ya); pitch(o, 0.18); return o; };

export const builders = {
  robotArm3d: (n, caption) => {
    const m = armModel(n, { module: false }), pose = makePose(m, track(KEYS_3D), null), col = m.tags.map((t) => COLOURS[t] ?? WARM);
    const ya = (T) => 0.35 + 0.2 * smooth(T / 3) * Math.sin((T * TAU) / 18);
    const at = (T) => m.pts.map((_, j) => [...view(pose(j, T, [0, 0, 0]), ya(T)), ...col[j]]);
    const fitPts = Array.from({ length: 14 }, (_, i) => (i * H3) / 13).flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    return { beats: [{ ...act(partsOf(m, at(0)), { caption, hold: H3, live: (b, j, t, o) => {
      view(pose(j, t, o), ya(t)); const tag = m.tags[j]; o[3] = tag === 'hand' || tag.startsWith('finger') ? 1.1 : 1;
    } }), fitPts }] };
  },
  robotArmStory: (n) => {
    const m = armModel(n), tr = track(KEYS_STORY), pose = makePose(m, tr, STORY), col = m.tags.map((t) => COLOURS[t] ?? WARM);
    const ya = (T) => 0.32 + 0.06 * Math.sin((T * TAU) / 20);
    const at = (T) => m.pts.map((_, j) => [...view(pose(j, T, [0, 0, 0]), ya(T)), ...col[j]]);
    const fitPts = [0, 2.6, 4.4, 7, 10.2, 13.6, 16.2, 19.2, 23].flatMap((T) => at(T)).filter((_, i) => i % 3 === 0);
    // Licht nach dem Klick: von der Aufnahme über die Leiterbahnen zum Rand, dann LEDs; das Modul leuchtet auf
    const bc = BOARD.c, reach = m.pts.map((p) => Math.hypot(p[0] - bc[0], p[2] - bc[2]));
    const light = (j, T) => {
      const tag = m.tags[j], since = T - STORY.click;
      if (tag === 'bahn') return since > 0 ? 0.8 + 0.9 * Math.exp(-(((reach[j] - 0.55 * since) / 0.07) ** 2)) + 0.35 * smooth(since / 1.5) : 0.75;
      if (tag === 'aufnahme') return 1 + (since > 0 ? 0.9 * Math.exp(-since / 0.8) + 0.2 : 0);
      if (tag === 'led') return since > 0.6 ? 0.9 + 0.5 * (0.5 + 0.5 * Math.sin(T * 3 + reach[j] * 20)) : 0.35;
      if (tag === 'modullicht') return since > 0 ? 1.4 + 0.3 * Math.sin(T * 4) : 0.7;
      if (tag === 'fingerA' || tag === 'fingerB') return 1.1;
      return 1;
    };
    const caps = ['robotergreifer.grips', 'robotergreifer.turns', 'robotergreifer.aligns', 'robotergreifer.clicks'];
    return { beats: caps.map((key, a) => ({ ...act(partsOf(m, at(ACT[a])), { caption: message(key), hold: ACT[a + 1] - ACT[a], live: (b, j, t, o) => {
      const T = ACT[a] + t; view(pose(j, T, o), ya(T)); o[3] = light(j, T);
    } }), fitPts })) };
  },
};
/** Für Wächter und Werkzeuge: Teilname jeder Drohne. */
export const labelOf = (name, n, j) => armModel(n, { module: name !== 'robotArm3d' }).tags[j];
export { frames, ik, Q, STORY, KEYS_STORY, track, KEYS_3D };
