import { t as message } from '../../../i18n/ui.mjs';
// Radfahrer im Zielbogen (Runde 11b, große Motive, Kandidat FSK-038), ab 500 Drohnen in 3D und 3D+, als geteiltes Motiv im
// Stadtfest (Stadtrennen) und im Jubiläum (Ziel erreicht). Bauweise wie der 3D-Fußballer und der Erste Tanz: der Fahrer aus
// wenigen klaren Körpern (Helm, Rumpf, Hüfte als Ellipsoide, Glieder als Röhren), das Rennrad aus Rohren (Rahmendreieck,
// Gabel, Lenker), die Räder als Reifenring mit Nabe und Speichen. Nur Linien, keine Flächen; locker besetzt (Marc zu Welle 1:
// „deutlich geringere Liniendichte“), mehr Drohnen kaufen Teile: ab 700 Kettenblatt, Startnummer und Felgenring, ab 900
// Fahnen am Zielbogen.
//
// Bewegung über Gelenke: Die Kurbel dreht sich, die Füße stehen auf den Pedalen, Knie und Hüfte folgen über zwei Glieder
// (das Bein bleibt ein Bein); die Speichen drehen sich mit dem Rad, der Reifen bleibt ein Ring. Im 3D+ fährt der Fahrer
// durch einen aufblasbaren Zielbogen (zwei Säulen, Bogen, Banner mit Schachbrettband), die Ziellinie am Boden leuchtet auf,
// er richtet sich auf und reißt die Arme hoch, aus dem Banner sprühen Funken.
//
//   cyclist3d (3D, ab 500): der Fahrer im Wiegetritt auf der Straße, die Kamera fährt mit (die Straßenmarkierung läuft als
//     Licht nach hinten), er schwenkt langsam aus der Seitenansicht in die Dreiviertelansicht.
//   cyclistStory (3D+): Close-up des Fahrers im Tritt → Zieleinfahrt in einem Zug: durch den Bogen, die Ziellinie
//     leuchtet, er rollt aus, Arme hoch, Funken aus dem Banner.
// Wächter: scripts/radfahrer.test.mjs.
import { TAU, WARM, GOLD, ORANGE, CYAN, BLUE, PINK, RED, mix, smooth, yaw, pitch, sparkle, chase, share } from '../../show-motion.js';
import { ellipsoid, tube, curves, assemble } from '../catalog-3d/kit.js';

// ---------------------------------------------------------------- Vektoren und Drehungen ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const mv = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
const mm = (A, B) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]));
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
function rotAxis(d, w) { const c = Math.cos(w), s = Math.sin(w), k = 1 - c, [x, y, z] = d; return [c + x * x * k, x * y * k - z * s, x * z * k + y * s, y * x * k + z * s, c + y * y * k, y * z * k - x * s, z * x * k - y * s, z * y * k + x * s, c + z * z * k]; }
function between(u, v) { const a = norm(u), b = norm(v), ax = cross(a, b), s = len(ax), c = dot(a, b); if (s < 1e-9) return c > 0 ? I3 : rotAxis(norm(Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0])), Math.PI); return rotAxis(mul(ax, 1 / s), Math.atan2(s, c)); }
/** smootherstep (Anfang und Ende ohne Geschwindigkeit und Beschleunigung) */
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
/** Zwei Glieder: Schulter/Hüfte S, Ziel T, Längen, Knie/Ellbogen weicht zu pole aus (weich begrenzt, nie ganz gestreckt). */
function ik(S, T, [L1, L2], pole) {
  const d0 = sub(T, S), L = L1 + L2, r = len(d0), d = r < 0.9 * L ? r : 0.9 * L + 0.08 * L * Math.tanh((r - 0.9 * L) / (0.08 * L)), u = norm(d0);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  let w = sub(pole, mul(u, dot(pole, u))); if (len(w) < 1e-6) w = cross(u, [0, 0, 1]);
  return [add(add(S, mul(u, a)), mul(norm(w), h)), add(S, mul(u, d))];
}

// ---------------------------------------------------------------- Farben ----------
const SKIN = [255, 210, 168], JERSEY = mix(GOLD, ORANGE, 0.15), SHORTS = mix(BLUE, WARM, 0.25), HELMET = mix(PINK, WARM, 0.3);
const FRAME = mix(CYAN, WARM, 0.25), TYRE = [214, 226, 240], SPOKE = mix(CYAN, WARM, 0.55), ARCHC = mix(RED, ORANGE, 0.25), BANNER = [250, 232, 200], ROAD = mix(BLUE, WARM, 0.55);

// ---------------------------------------------------------------- Rad und Fahrer (Radrahmen: x Fahrtrichtung, y oben, z links) ----------
export const GROUND = -0.92;
const R = 0.34; // Laufrad
const HUB = { r: [-0.52, GROUND + R, 0], f: [0.52, GROUND + R, 0] };
const BB = [-0.05, GROUND + 0.3, 0], SEAT = [-0.2, -0.06, 0], HTOP = [0.37, -0.02, 0], HBOT = [0.41, -0.2, 0], CRANK = 0.17, PEDAL_Z = 0.12;
const SADDLE = [-0.19, 0.01, 0];
// Fahrer in Rennhaltung (Bauhaltung): Hüfte über dem Sattel, Rumpf weit vorgebeugt, Hände an den Bremsgriffen
const J = { hip: [-0.17, 0.07, 0], neck: [0.31, 0.33, 0], head: [0.42, 0.42, 0], shL: [0.27, 0.3, 0.17], shR: [0.27, 0.3, -0.17], hipL: [-0.17, 0.05, 0.09], hipR: [-0.17, 0.05, -0.09] };
const HOOD = { L: [0.47, 0.03, 0.17], R: [0.47, 0.03, -0.17] };
const ARM = [0.27, 0.26], LEG = [0.42, 0.41];
/** Fußpunkt auf dem Pedal bei Kurbelwinkel a (Seite s = +1 links, −1 rechts; rechts um π versetzt). */
// Runde 11c (Marc: „er tritt rückwärts in die Pedale“): die Kurbel dreht wie die Räder (von links gesehen im Uhrzeigersinn,
// das obere Pedal geht nach vorn); Winkel a wächst mit dem Tritt
const pedal = (a, s) => { const q = -a + (s > 0 ? 0 : Math.PI); return [BB[0] + Math.cos(q) * CRANK, BB[1] + Math.sin(q) * CRANK, s * PEDAL_Z]; };
const KNEE_POLE = [1, 0.25, 0], ELBOW_POLE = [-0.2, -1, 0];

/** Detailstufe: 0 bis 690, 1 ab 700 (Kettenblatt, Startnummer, Felgenring), 2 ab 900 (Fahnen am Bogen). */
export const level = (n) => (n >= 900 ? 2 : n >= 700 ? 1 : 0);

/** Fahrer und Rad in der Bauhaltung (Kurbel bei 0): Linienteile für kit.assemble, dazu die Bauhaltung der Glieder. */
function riderParts(lv) {
  const limb = (tag, a, b, r0, r1, opts = {}) => tube(tag, [a, b], (s) => r0 + (r1 - r0) * s, { depth: 0.9, hoops: 0, crest: false, caps: [false, false], ...opts });
  const legs = {}, arms = {};
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    const hip = J[`hip${k}`], foot = pedal(0, s), [knee, ank] = ik(hip, foot, LEG, KNEE_POLE);
    legs[k] = { hip, knee, ank };
    const sh = J[`sh${k}`], [el, wr] = ik(sh, HOOD[k], ARM, ELBOW_POLE);
    arms[k] = { sh, el, wr };
  }
  const gap = (a, b, d) => add(a, mul(norm(sub(b, a)), d)); // Glied beginnt ein Stück nach dem Gelenk (Gelenkspalt)
  const parts = [
    // Helm (länglich, aerodynamisch nach hinten gezogen) mit Visierlinie, Kopf darunter nur angedeutet
    ellipsoid('kopf', J.head, [0.13, 0.085, 0.09], { roll: -0.25, lat: [-0.35], w: 1.2 }),
    tube('kopf', [[0.33, 0.33, 0], [0.38, 0.38, 0]], 0.04, { hoops: 0, crest: false, caps: [false, false] }),
    // Rumpf: gestreckt und flach (Rennhaltung), Hüfte
    ellipsoid('rumpf', [0.07, 0.2, 0], [0.27, 0.12, 0.17], { roll: 0.42, lat: [0.5], mer: [Math.PI / 2] }),
    ellipsoid('hose', [-0.15, 0.04, 0], [0.13, 0.1, 0.13], { roll: 0.3 }),
  ];
  for (const k of ['L', 'R']) {
    const l = legs[k], a = arms[k];
    parts.push(limb(`osch${k}`, gap(l.hip, l.knee, 0.05), gap(l.knee, l.hip, 0.06), 0.07, 0.048), limb(`usch${k}`, gap(l.knee, l.ank, 0.075), l.ank, 0.046, 0.036));
    parts.push(ellipsoid(`usch${k}`, add(l.ank, [0.05, -0.02, 0]), [0.08, 0.03, 0.035], { w: 1.1 })); // Schuh
    parts.push(limb(`oarm${k}`, gap(a.sh, a.el, 0.05), a.el, 0.045, 0.038), limb(`uarm${k}`, gap(a.el, a.wr, 0.035), a.wr, 0.036, 0.03));
  }
  // Rad: Rahmendreieck, Hinterbau, Gabel, Lenker (Unterlenker), Sattel, Vorbau
  const bike = [
    [SEAT, HTOP], [HBOT, BB], [BB, SEAT], [SEAT, [-0.24, 0.0, 0]], [HTOP, HBOT],
    [BB, add(HUB.r, [0.06, 0, 0.04])], [BB, add(HUB.r, [0.06, 0, -0.04])], [SEAT, add(HUB.r, [0.05, 0.05, 0.04])], [SEAT, add(HUB.r, [0.05, 0.05, -0.04])],
    [HBOT, add(HUB.f, [-0.05, 0.05, 0.05])], [HBOT, add(HUB.f, [-0.05, 0.05, -0.05])],
    [[-0.3, 0.015, 0], [-0.08, 0.015, 0]], // Sattel
    [HTOP, [0.47, 0.03, 0]], // Vorbau
  ];
  // Lenker: Quergriff und zwei Unterlenker-Bögen
  const drop = (s) => Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI * 1.1; return [0.47 + 0.07 * Math.sin(a), 0.03 - 0.06 * (1 - Math.cos(a)), s * 0.19]; });
  parts.push(curves('rad', [...bike, [[0.47, 0.03, 0.19], [0.47, 0.03, -0.19]], drop(1), drop(-1)], { w: 0.85 }));
  // Laufräder: Reifen (zwei Ringe ab 700: Reifen und Felge), Nabe frei (Speichen drehen sich darin, kommen extra)
  const ringAt = (c, r, k = 64) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 0]; }), closed: true });
  parts.push(curves('reifen', [ringAt(HUB.r, R), ringAt(HUB.f, R), ...(lv >= 1 ? [ringAt(HUB.r, R * 0.86), ringAt(HUB.f, R * 0.86)] : [])], { w: lv >= 1 ? 0.8 : 0.95 }));
  if (lv >= 1) {
    parts.push(curves('kette', [ringAt(add(BB, [0, 0, -0.06]), 0.1, 32)].map((l) => ({ ...l, pts: l.pts.map((p) => [p[0], p[1], -0.06]) })), { w: 0.9 }));
    // Startnummer auf dem Rücken
    parts.push(curves('nummer', [{ pts: [[-0.06, 0.25, 0.1], [0.12, 0.33, 0.1], [0.15, 0.26, 0.12], [-0.03, 0.18, 0.12]], closed: true }], { w: 0.8 }));
  }
  // Gelenk- und Nabenkugeln: keine Linie in ihrer Nähe (Speichen, Kurbeln und Glieder drehen dort)
  const hidden = (c, r) => ellipsoid('gelenk', c, [r, r, r], { silhouette: false });
  parts.push(hidden(HUB.r, 0.075), hidden(HUB.f, 0.075), hidden(BB, 0.07));
  for (const k of ['L', 'R']) parts.push(hidden(legs[k].knee, 0.065), hidden(arms[k].el, 0.035));
  return { parts, legs, arms };
}
const COLOUR = { kopf: (p) => (p[1] < 0.37 && p[0] > 0.33 ? SKIN : HELMET), rumpf: JERSEY, hose: SHORTS, oschL: SHORTS, oschR: SHORTS, uschL: SKIN, uschR: SKIN, oarmL: JERSEY, oarmR: JERSEY, uarmL: SKIN, uarmR: SKIN, rad: FRAME, reifen: TYRE, kette: GOLD, nummer: WARM };

const cache = new Map();
/**
 * Fahrer und Rad, genau m Drohnen: Körper und Rahmen über kit.assemble, dazu die Speichen (je Rad drei Durchmesser, sie
 * drehen sich) und die Kurbeln (Arm und Pedal). Liefert { pts, tags, spokes: [{wheel, a, r}], cranks: [{side, f}] }.
 */
export function riderModel(m, lv) {
  const key = `${m}|${lv}`;
  if (cache.has(key)) return cache.get(key);
  const { parts, legs, arms } = riderParts(lv);
  const nc = 6, [nb, ns] = share(m - nc, [1, 0.16]); // Kurbeln: je Seite drei Drohnen (Arm und Pedal), nicht mehr
  const body = assemble(parts, nb);
  // Speichen: je Rad 3 Durchmesser (6 Speichen), von 0,25 R bis 0,8 R
  const spokes = [], perWheel = share(ns, [1, 1]);
  perWheel.forEach((k, w) => { const per = share(k, [1, 1, 1, 1, 1, 1]); per.forEach((q, i) => { for (let s = 0; s < q; s++) spokes.push({ wheel: w, a: (i / 6) * TAU + w * 0.3, r: R * (0.27 + 0.53 * ((s + 0.5) / q)) }); }); });
  const cranks = []; const perC = share(nc, [1, 1]);
  perC.forEach((k, i) => { for (let s = 0; s < k; s++) cranks.push({ side: i ? -1 : 1, f: 0.3 + 0.42 * (s / Math.max(1, k - 1)) }); }); // der Kurbelarm, das Pedal trägt der Schuh
  const res = { lv, body, spokes, cranks, legs, arms, nb, ns, nc, m };
  cache.set(key, res);
  return res;
}

// ---------------------------------------------------------------- Haltung ----------
/**
 * Lage der Drohne j des Fahrermodells im Radrahmen. st: { crank (rad), spin: [hinten, vorn] (rad), up (0 Rennhaltung … 1
 * aufgerichtet, Arme hoch), rock (Wiegetritt: Rad neigt sich, rad) }.
 */
function riderPoint(M, j, st, X, o) {
  const { body, spokes, cranks, nb, ns } = M;
  if (j < nb) {
    const p = body.pts[j], tag = body.tags[j];
    o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
    const T = X[tag];
    if (T) { const q = mv(T.M, p); o[0] = q[0] + T.c[0]; o[1] = q[1] + T.c[1]; o[2] = q[2] + T.c[2]; }
  } else if (j < nb + ns) {
    const s = spokes[j - nb], c = s.wheel ? HUB.f : HUB.r, a = s.a - st.spin[s.wheel];
    o[0] = c[0] + Math.cos(a) * s.r; o[1] = c[1] + Math.sin(a) * s.r; o[2] = 0;
  } else {
    const c = cranks[j - nb - ns], p = pedal(st.crank, c.side);
    o[0] = lerp(BB[0], p[0], c.f); o[1] = lerp(BB[1], p[1], c.f); o[2] = c.side * 0.07;
  }
  return o;
}
const xf = (Mx, c) => ({ M: Mx, c });
const about = (Rm, a) => xf(Rm, sub(a, mv(Rm, a)));
const comp = (A, B) => xf(mm(A.M, B.M), add(mv(A.M, B.c), A.c));
/** Transformationen der Körperteile für eine Haltung (im Radrahmen). */
function rig(M, st) {
  const out = {}, up = st.up;
  // Rumpf richtet sich um die Hüfte auf (Siegerpose), der Kopf hebt sich mit
  const torso = about(rotZ(0.85 * up), J.hip);
  out.rumpf = torso; out.kopf = torso; out.nummer = torso; out.hose = about(rotZ(0.25 * up), J.hip);
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    const l = M.legs[k], foot = pedal(st.crank, s), [knee, ank] = ik(l.hip, foot, LEG, KNEE_POLE);
    const R1 = between(sub(l.knee, l.hip), sub(knee, l.hip)), R2 = mm(between(mv(R1, sub(l.ank, l.knee)), sub(ank, knee)), R1);
    out[`osch${k}`] = xf(R1, sub(l.hip, mv(R1, l.hip))); out[`usch${k}`] = xf(R2, sub(knee, mv(R2, l.knee)));
    // Arme: an den Bremsgriffen; zum Jubel drehen Ober- und Unterarm um Schulter und Ellbogen nach oben (V, leicht gebeugt).
    // Richtungen statt Handziel: so klappt kein Ellbogen um, wenn die Hand am Kopf vorbeizieht
    const a = M.arms[k], sh = add(mv(torso.M, a.sh), torso.c), w = ease(up);
    // Bogen über „nach vorn“: Anfangs- und Endrichtung zeigen fast entgegengesetzt, ein gerades Mitteln wäre dort instabil
    const fwd = norm([1, 0.35, 0.3 * s]), nl = (u, v) => norm(add(add(mul(u, (1 - w) ** 2), mul(fwd, 2 * w * (1 - w))), mul(v, w * w)));
    const dU = nl(mv(torso.M, norm(sub(a.el, a.sh))), norm([0.18, 1, 0.45 * s])), dF = nl(mv(torso.M, norm(sub(a.wr, a.el))), norm([0.05, 1, 0.22 * s]));
    const el = add(sh, mul(dU, ARM[0])), wr = add(el, mul(dF, ARM[1]));
    const A1 = between(sub(a.el, a.sh), sub(el, sh)), A2 = mm(between(mv(A1, sub(a.wr, a.el)), sub(wr, el)), A1);
    out[`oarm${k}`] = xf(A1, sub(sh, mv(A1, a.sh))); out[`uarm${k}`] = xf(A2, sub(el, mv(A2, a.el)));
  }
  return out;
}
/** Rad und Fahrer im Weltrahmen: Ort entlang der Straße x, Neigung im Wiegetritt rock, Gierwinkel des Rades. */
function placeRider(o, pos, heading, rock) {
  // Wiegetritt: das Rad neigt sich um die Aufstandslinie (x-Achse in Bodenhöhe)
  if (rock) { const y = o[1] - GROUND, z = o[2], c = Math.cos(rock), s = Math.sin(rock); o[1] = GROUND + y * c - z * s; o[2] = y * s + z * c; }
  yaw(o, heading);
  o[0] += pos[0]; o[2] += pos[1];
  return o;
}

// ---------------------------------------------------------------- Zielbogen, Straße ----------
// Weltrahmen: die Straße läuft entlang der Richtung DIR (schräg vom Publikum weg nach links hinten), der Bogen steht quer zu
// ihr bei s = 0; Ansicht von etwas oben (pitch), wie beim Ersten Tanz.
const ARCH = { w: 1.05, h: 1.75, tube: 0.1 }; // halbe lichte Breite, Höhe des Scheitels, Dicke des Schlauchs
/** Bogen im eigenen Rahmen (u quer zur Straße, y oben): zwei Säulen und ein Halbkreis oben, als Doppellinie (Schlauch). */
function archLines(lv) {
  const { w, h, tube: t } = ARCH, top = h - w; // Säulenhöhe bis zum Ansatz des Halbkreises
  const side = (r) => [...Array.from({ length: 6 }, (_, i) => [-r, GROUND + (top - GROUND) * (i / 5)]), ...Array.from({ length: 25 }, (_, i) => { const a = Math.PI - (i / 24) * Math.PI; return [Math.cos(a) * r, top + Math.sin(a) * (r * 0.92)]; }), ...Array.from({ length: 6 }, (_, i) => [r, top - (top - GROUND) * (i / 5)])];
  const lines = [{ pts: side(w + t).map(([u, y]) => [u, y, 0]), tag: 'bogen' }, { pts: side(w - t).map(([u, y]) => [u, y, 0]), tag: 'bogen' }];
  // Banner unter dem Scheitel: Rahmen und ein Schachbrettband (zwei Reihen versetzter Striche)
  const bw = 0.62, by = top + w * 0.55, bh = 0.2;
  lines.push({ pts: [[-bw, by - bh / 2, 0.02], [bw, by - bh / 2, 0.02], [bw, by + bh / 2, 0.02], [-bw, by + bh / 2, 0.02]], closed: true, tag: 'banner' });
  return { lines, banner: { bw, by, bh } };
}

// ---------------------------------------------------------------- Fassungen ----------
const VIEW = { pitch: 0.22, y0: -0.2 };
const SHOW = { heading: 0.0 };
const groupsOf = (sizes) => sizes.map(([name, count]) => ({ name, count, rigid: false }));

/** 3D: der Fahrer im Wiegetritt, die Straße läuft als Licht unter ihm durch, er schwenkt in die Dreiviertelansicht. */
const HOLD3D = 10;
function cyclist3d(n, caption) {
  const nr = Math.round(n * 0.8), M = riderModel(nr, level(n)), nRoad = n - nr;
  const tags = M.body.tags;
  // Straße: zwei Randlinien und eine Mittellinie (gestrichelt), knapp unter den Reifen
  const road = [], [n1, n2] = share(nRoad, [2, 1]);
  for (let i = 0; i < n1; i++) { const s = i % 2 ? 1 : -1, k = Math.floor(i / 2), m = Math.ceil(n1 / 2); road.push([-1.05 + (2.1 * (k + 0.5)) / m, GROUND - 0.06, s * 0.42, 0]); }
  for (let i = 0; i < n2; i++) road.push([-1.05 + (2.1 * (i + 0.5)) / n2, GROUND - 0.06, 0, 1]);
  const turn = (t) => -0.95 + 0.55 * ease(t / 7) + 0.12 * Math.sin((t * TAU) / 12); // aus fast seitlich in die Dreiviertelansicht
  const crank = (t) => 3.0 * t, spin = (t) => [3.4 * t, 3.4 * t], rock = (t) => 0.05 * Math.sin(crank(t));
  const colOf = (j) => (j < M.nb ? (COLOUR[tags[j]] ? (typeof COLOUR[tags[j]] === 'function' ? COLOUR[tags[j]](M.body.pts[j]) : COLOUR[tags[j]]) : WARM) : j < M.nb + M.ns ? SPOKE : FRAME);
  const pose = (j, t, o) => {
    if (j < nr) {
      if (t !== memo) { memo = t; S = { crank: crank(t), spin: spin(t), up: 0 }; X = rig(M, S); }
      riderPoint(M, j, S, X, o);
      placeRider(o, [0, 0], 0, rock(t));
    } else { const p = road[j - nr]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    yaw(o, turn(t)); pitch(o, VIEW.pitch, VIEW.y0, 0);
    return o;
  };
  const light = (j, t) => {
    if (j < nr) return 1;
    const p = road[j - nr];
    return p[3] ? chase(-p[0], t, 1.6, 0.75, 0.35, 1.35) : 0.75; // Mittellinie: Lichtstriche laufen nach hinten (die Straße zieht unten durch)
  };
  let memo = NaN, S = null, X = null;
  const cols = Array.from({ length: n }, (_, j) => (j < nr ? colOf(j) : road[j - nr][3] ? WARM : ROAD));
  const at = (t) => cols.map((c, j) => [...pose(j, t, [0, 0, 0]), ...c]);
  const fitPts = [0, 2, 4, 6, 8, HOLD3D].flatMap((t) => at(t).map((p) => p.slice(0, 3)));
  return { beats: [{ pts: at(0), caption, hold: HOLD3D, fitPts, groups: groupsOf([['fahrer', nr], ['strasse', nRoad]]), live: (b, j, t, o) => { pose(j, t, o); o[3] = light(j, t); } }] };
}

// 3D+: eine Zeitachse über drei Akte; jedes Bild beginnt dort, wo das vorige endet
// Runde 11c (Marc: „zuerst das Close-up und dann erst die Zieleinfahrt … in einem Schwung durchlaufen“): zwei Bilder. Erst der
// Fahrer groß im Tritt (eigener Bildausschnitt, die Straße zieht als Licht unter ihm durch), dann die Zieleinfahrt als eine
// Fahrt ohne Halt: anfahren, durch den Bogen, Ziellinie, ausrollen, Arme hoch.
const ACT = [0, 5.2, 16.4], CU = ACT[1];
const RUN = { from: -1.85, gate: 0, to: 0.95, t0: CU + 0.2, t1: 13.4 }; // Weg entlang der Straße (Bogen bei 0), Start, Ankunft
function cyclistStory(n) {
  const lv = level(n), nr = Math.round(n * 0.6), M = riderModel(nr, lv), tags = M.body.tags;
  const { lines, banner } = archLines(lv), nArch = Math.round(n * 0.22), nLine = Math.round(n * 0.07), nSpark = Math.round(n * 0.05), nRoad = n - nr - nArch - nLine - nSpark;
  const arch = assemble([curves('bogen', lines.filter((l) => l.tag === 'bogen'), { w: 1 }), curves('banner', lines.filter((l) => l.tag === 'banner'), { w: 1.2 }), ...(lv >= 2 ? [curves('fahne', [[[-ARCH.w - 0.45, GROUND, 0.25], [-ARCH.w - 0.45, GROUND + 1.05, 0.25], [-ARCH.w - 0.2, GROUND + 0.92, 0.25], [-ARCH.w - 0.45, GROUND + 0.8, 0.25]], [[ARCH.w + 0.45, GROUND, 0.25], [ARCH.w + 0.45, GROUND + 1.05, 0.25], [ARCH.w + 0.2, GROUND + 0.92, 0.25], [ARCH.w + 0.45, GROUND + 0.8, 0.25]]], { w: 0.9 })] : [])], nArch);
  // Schachbrettband im Banner: Funkendrohnen warten als zwei Reihen versetzter Punkte im Banner, beim Sieg sprühen sie
  const sparks = Array.from({ length: nSpark }, (_, i) => { const row = i % 2, k = Math.floor(i / 2), m = Math.ceil(nSpark / 2); return [-banner.bw + 0.08 + ((2 * banner.bw - 0.16) * (k + (row ? 0.75 : 0.25))) / m, banner.by + (row ? 0.045 : -0.045), 0.03]; });
  // Ziellinie quer unter dem Bogen und Straßenränder (knapp unter dem Reifen)
  const finish = Array.from({ length: nLine }, (_, i) => [0, GROUND - 0.06, -0.62 + (1.24 * (i + 0.5)) / nLine]);
  const road = []; for (let i = 0; i < nRoad; i++) { const s = i % 2 ? 1 : -1, k = Math.floor(i / 2), m = Math.ceil(nRoad / 2); road.push([-2.2 + (3.4 * (k + 0.5)) / m, GROUND - 0.06, s * 0.66]); }
  // Weltrahmen: die Straße (x) ist um die Senkrechte gedreht, der Bogen steht quer bei x = 0 (Bogenebene = y/z)
  const DIR = -1.0; // Straße schräg: der Fahrer kommt von links hinten auf euch zu
  const archWorld = (p, o) => { o[0] = 0; o[1] = p[1]; o[2] = -p[0]; return o; }; // Bogenebene quer zur Straße
  // Fahrt: weich anfahren, sprinten, nach dem Ziel ausrollen (Weg über die Zeit, Geschwindigkeit ohne Sprung)
  const s0 = RUN.from, s1 = RUN.to, path = (T) => s0 + (s1 - s0) * ease((T - RUN.t0) / (RUN.t1 - RUN.t0));
  const speed = (T) => (path(T + 0.01) - path(T - 0.01)) / 0.02;
  // Kurbel und Räder: Winkel = Integral der Geschwindigkeit (Räder rollen ab, Kurbel im Übersetzungsverhältnis)
  const dist = (T) => path(T) - s0;
  const crossT = (() => { let lo = RUN.t0, hi = RUN.t1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (path(m) + HUB.f[0] < 0) lo = m; else hi = m; } return hi; })(); // Vorderrad auf der Linie
  const upT = crossT + 1.5; // nach dem Ziel rollt er aus und richtet sich auf
  // im Close-up tritt er gleichmäßig (die Kamera fährt mit), danach Kurbel und Räder nach dem Weg
  const cu = (T) => Math.min(Math.max(T, 0), CU), ride = (T) => (dist(T) / R) * 0.55 * (1 - 0.7 * smooth((T - crossT) / 1.2));
  // die Kurbel steht am Ende des Close-ups waagerecht (6π): die letzte Bewegung der Füße ist ein ganzer Weg, kein Rest (Finten-Wächter)
  const CADENCE = (6 * Math.PI - 2.4) / CU;
  const st = (T) => ({ crank: 2.4 + CADENCE * cu(T) + ride(T), spin: [3.4 * cu(T) + dist(T) / R, 3.4 * cu(T) + dist(T) / R], up: ease((T - upT) / 3.2) });
  const rocking = (T) => 0.06 * Math.sin(st(T).crank) * (1 - smooth((T - crossT) / 0.8)); // Wiegetritt
  const A0 = nr, L0 = nr + nArch, S0 = L0 + nLine, R0 = S0 + nSpark;
  const colOf = (j) => (j < M.nb ? (typeof COLOUR[tags[j]] === 'function' ? COLOUR[tags[j]](M.body.pts[j]) : COLOUR[tags[j]] ?? WARM) : j < M.nb + M.ns ? SPOKE : FRAME);
  const cols = Array.from({ length: n }, (_, k) => (k < nr ? colOf(k) : k < L0 ? (arch.tags[k - A0] === 'banner' ? BANNER : arch.tags[k - A0] === 'fahne' ? GOLD : ARCHC) : k < S0 ? WARM : k < R0 ? (k % 2 ? WARM : mix(BLUE, WARM, 0.4)) : ROAD));
  let at = NaN, S = null, X = null;
  const pose = (k, T, o) => {
    if (k < nr) {
      if (T !== at) { at = T; S = st(T); X = rig(M, S); }
      riderPoint(M, k, S, X, o);
      placeRider(o, [path(T), 0], 0, rocking(T));
    } else if (k < L0) archWorld(arch.pts[k - A0], o);
    else if (k < S0) { const p = finish[k - L0]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    else if (k < R0) {
      const p = sparks[k - S0], i = k - S0, u = ease((T - upT - 0.2) / 2.6);
      archWorld(p, o);
      if (u > 0) { // Funken: ein weiter Bogen schräg nach oben, auseinander (Licht verglüht in light())
        // fächerförmig nach oben, jeder Funke in Richtung seiner Stelle im Banner (die Bahnen kreuzen sich nicht)
        const xf = (p[0] + banner.bw) / (2 * banner.bw), a = Math.PI * (0.9 - 0.8 * xf), r = (i % 2 ? 0.78 : 0.5) + 0.08 * Math.sin(i * 1.7);
        o[1] += u * (Math.sin(a) * r * 0.85 + 0.12); o[2] -= u * Math.cos(a) * r * 1.3; o[0] += u * (0.3 + 0.12 * (i % 3)); // aus der Bogenebene heraus nach vorn
      }
    } else { const p = road[k - R0]; o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; }
    // im Close-up sieht man ihn zuerst mehr von der Seite; bis zur Zieleinfahrt dreht sich der Blick um ihn in die Fahrtansicht
    const swing = 0.6 * (1 - ease(T / CU));
    if (swing) yaw(o, swing, RUN.from, 0);
    yaw(o, DIR); pitch(o, VIEW.pitch, VIEW.y0, 0);
    return o;
  };
  const light = (k, T) => {
    if (k < nr) return 1;
    // im Close-up ist nur der Fahrer zu sehen; Bogen, Linie und Funken leuchten erst mit der Zieleinfahrt auf
    if (k >= R0) { // im Close-up leuchtet nur die Straße unter ihm (als Lauflicht), der Rest kommt mit der Zieleinfahrt
      const near = Math.abs(road[k - R0][0] - RUN.from) < 0.95;
      if (T < CU) return near ? chase(-road[k - R0][0], T, 1.6, 0.75, 0.35, 1.35) : 0.02;
      return near ? 0.7 : 0.02 + 0.68 * smooth((T - CU - 0.1) / 1.2);
    }
    const shown = smooth((T - CU - 0.1) / 1.2);
    if (shown <= 0) return 0.02;
    return 0.02 + (lightOn(k, T) - 0.02) * shown;
  };
  const lightOn = (k, T) => {
    if (k < L0) return arch.tags[k - A0] === 'banner' ? 1 + 0.4 * Math.exp(-(((T - crossT - 0.2) / 0.5) ** 2)) : 0.95 + 0.25 * Math.exp(-(((T - crossT) / 0.6) ** 2));
    if (k < S0) { // Ziellinie: dunkel, leuchtet auf, wenn das Vorderrad sie überfährt, von der Mitte nach außen
      const z = Math.abs(finish[k - L0][2]), since = T - crossT - z * 0.6;
      return since < 0 ? 0.35 : 0.35 + 1.0 * smooth(since / 0.25) + 0.6 * Math.exp(-since / 0.7);
    }
    const s = T - upT - 0.2; return s < 0 ? 1 : 1.1 + 0.5 * sparkle(k, T, 0.6, 1.2) * Math.exp(-s / 3.2) - 0.25 * smooth((s - 2) / 3);
  };
  const sizes = [['fahrer', nr], ['bogen', nArch], ['ziellinie', nLine], ['funken', nSpark], ['strasse', nRoad]];
  const atT = (T) => cols.map((c, k) => [...pose(k, T, [0, 0, 0]), ...c]);
  const fitWide = [CU, 7, 9, 11, 13, 15, ACT[2]].flatMap((T) => atT(T).map((p) => p.slice(0, 3)));
  const fitNear = [0, 1.3, 2.6, 3.9, CU].flatMap((T) => atT(T).slice(0, nr).map((p) => p.slice(0, 3))); // Close-up: nur der Fahrer
  const caps = ['radfahrer.aRiderInFullFlow', 'radfahrer.inOneGoThroughTheArch'], fits = [fitNear, fitWide], frames = ['nah', null];
  return { beats: caps.map((key, a) => ({ pts: atT(ACT[a]), groups: groupsOf(sizes), caption: message(key), hold: ACT[a + 1] - ACT[a], fitPts: fits[a], ...(frames[a] ? { frame: frames[a] } : {}), live: (b, k, t, o) => { const T = ACT[a] + Math.min(Math.max(t, 0), ACT[a + 1] - ACT[a]); /* jedes Bild nur in seinem Abschnitt der Zeitachse */ pose(k, T, o); o[3] = light(k, T); } })), meta: { crossT, upT, nr, nArch, nLine, nSpark, nRoad } };
}

export const builders = {
  cyclist3d: (n, caption) => cyclist3d(n, caption),
  cyclistStory: (n) => cyclistStory(n),
};
// für den Wächter
export const _internal = { ACT, HUB, R };
/** Für den Wächter: Pedal (Kurbelwinkel, Seite) und Speichenpunkt (Rad, Winkel, Drehung) im Radrahmen. */
export const _rider = { pedal, spoke: (w, a, spin) => { const c = w ? HUB.f : HUB.r, q = a - spin; return [c[0] + Math.cos(q) * R * 0.8, c[1] + Math.sin(q) * R * 0.8, 0]; } };
/** Für die Werkzeuge: Teilname einer Fahrerdrohne (Körperteil, Speiche, Kurbel). */
export const _tagOf = (name, n, j) => { const M = riderModel(Math.round(n * (name === 'cyclist3d' ? 0.8 : 0.6)), level(n)); return j < M.nb ? M.body.tags[j] : j < M.nb + M.ns ? 'speiche' : j < M.m ? 'kurbel' : ''; };
