// 3D-Fassungen der Katalogfiguren (Formklasse Figuren und Tiere, docs/katalog-3d.md): Körper aus Ellipsoiden und
// Röhren, nach den Maßen der Katalogformation gesetzt, damit die Figur bei 0° wie ihr 2D-Bild steht. Je Figur bewegt
// sich EIN Teil (Arm, Schwanz, Hut, Flügel), dazu schwenkt der ganze Körper langsam und zeigt seine Tiefe.
import { GOLD, WARM, ORANGE, RED, PINK, CYAN, VIOLET, GREEN, BLUE, DIAMOND, mix, yaw, roll, pitch, glint, breathe, wander, chase } from '../../show-motion.js';
import { ellipsoid, tube, curves, spot, assemble, colour, ease, turn, rankBy, turnAbout, TAU } from './kit.js';

/** Merkmale je nach Drohnenzahl: kleine Lichtringe aus k Drohnen. */
const dots = (n, few, many) => (n >= 400 ? many : few);

// ---------------------------------------------------------------- Lebkuchenmann ----------
// Ein dicker Keks: Kopf und Rumpf als flache Ellipsoide, Arme und Beine als Röhren, Zuckerguss als Zickzack auf der
// Vorderfläche an Hand- und Fußgelenken, Knöpfe aus Zuckerperlen. Der rechte Arm winkt.
const SHOULDER_R = [0.2, 0.36];
export function lebkuchen(n) {
  const q = n / 300, deep = 0.62;
  const head = ellipsoid('head', [-0.02, 0.71], [0.29, 0.28, 0.17], { lat: [0.55], w: 1 });
  const body = ellipsoid('body', [-0.04, 0.1], [0.36, 0.43, 0.22], { lat: q > 1.2 ? [-0.45, 0.05] : [-0.2], w: 1 });
  const limb = (tag, a, b, r) => tube(tag, [a, b], r, { depth: deep, hoops: 1, hoopAt: [0.45] });
  const armL = limb('armL', [-0.22, 0.36, 0], [-0.78, 0.2, -0.04], 0.12), armR = limb('armR', [SHOULDER_R[0], SHOULDER_R[1], 0], [0.74, 0.46, -0.04], 0.12);
  const legL = limb('legL', [-0.2, -0.18, 0], [-0.42, -0.84, 0], 0.15), legR = limb('legR', [0.12, -0.18, 0], [0.34, -0.82, 0], 0.15);
  // Zuckerguss: Zickzack über die Vorderseite der Röhre, quer zur Achse
  const icing = (tag, a, b, r, s0) => {
    const ax = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(...ax), d = [ax[0] / L, ax[1] / L], nn = [-d[1], d[0]];
    return curves(tag, [Array.from({ length: 7 }, (_, i) => { const s = s0 + i * 0.03, side = (i % 2 ? 1 : -1) * 0.8, c = [a[0] + ax[0] * s, a[1] + ax[1] * s]; return [c[0] + nn[0] * side * r, c[1] + nn[1] * side * r, r * deep * Math.sqrt(1 - 0.64) + 0.02]; })], { w: 1.4 });
  };
  const face = [
    spot('eye', head.front(-0.12, 0.77, 0.01), dots(n, 4, 6), 0.035), spot('eye', head.front(0.09, 0.77, 0.01), dots(n, 4, 6), 0.035),
    curves('mouth', [Array.from({ length: 9 }, (_, i) => { const u = i / 8 - 0.5, x = -0.02 + u * 0.24, y = 0.61 - 0.06 * Math.cos(u * Math.PI); return head.front(x, y, 0.01); })], { w: 1.3 }),
  ];
  const buttons = [0.3, 0.08, -0.14].map((y) => spot('button', body.front(-0.03, y, 0.015), dots(n, 4, 6), 0.035));
  const parts = [head, body, armL, armR, legL, legR, ...face, ...buttons,
    icing('icing', [-0.22, 0.36], [-0.78, 0.2], 0.12, 0.62), icing('icingR', [0.2, 0.36], [0.74, 0.46], 0.12, 0.62),
    icing('icing', [-0.2, -0.18], [-0.42, -0.84], 0.15, 0.66), icing('icing', [0.12, -0.18], [0.34, -0.82], 0.15, 0.66)];
  const shape = assemble(parts, n), dough = mix(GOLD, ORANGE, 0.45);
  const pts = colour(shape, { eye: WARM, mouth: WARM, icing: WARM, icingR: WARM, button: RED }, dough);
  const rank = rankBy(pts, (p) => -p[1] + 0.3 * p[0]);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (tag === 'armR' || tag === 'icingR') roll(o, 0.32 * Math.sin((t * TAU) / 2.6) ** 2, SHOULDER_R[0], SHOULDER_R[1]); // winkt
    o[3] = tag === 'icing' || tag === 'icingR' ? glint(b[0] + b[1], t, 3.4, 0.35) : tag === 'button' ? breathe(t, 2.4, j * 0.1) : wander(rank[j], t, 6, 0.25, 0.1);
    turn(o, t, -0.32, 0.38);
  } };
}

// ---------------------------------------------------------------- Schneemann ----------
// Drei Kugeln (Umriss, Breitenkreise, Globus-Meridiane), der Zylinderhut sitzt schief, die Karottennase ragt zum
// Publikum: im 2D-Bild ein Punkt, im Schwenk eine Karotte. Der Hut lüftet sich zum Gruß.
const HAT = { c: [-0.04, 0.53], tilt: 0.32 };
export function schneemann(n) {
  const q = n / 300;
  const bottom = ellipsoid('snow', [0.02, -0.58], [0.4, 0.38, 0.38], { lat: q > 1.2 ? [-0.3, 0.3] : [0.3], mer: [0.9, -0.9] });
  const middle = ellipsoid('snow', [0.02, -0.09], [0.29, 0.28, 0.28], { lat: [0.25], mer: [0.9] });
  const head = ellipsoid('head', [0, 0.33], [0.21, 0.2, 0.2], { lat: [0.5] });
  // Hut: Krempe, Deckel und vier Kanten des Zylinders; im eigenen Rahmen gebaut und um die Krempenmitte gekippt
  const hatLocal = [
    ...[0, 1].map((e) => ({ pts: Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * TAU; return [Math.cos(a) * (e ? 0.12 : 0.21), e ? 0.27 : 0, Math.sin(a) * (e ? 0.12 : 0.21)]; }), closed: true })),
    ...[0.6, 2.2, 3.8, 5.4].map((a) => ({ pts: [[Math.cos(a) * 0.125, 0.02, Math.sin(a) * 0.125], [Math.cos(a) * 0.12, 0.27, Math.sin(a) * 0.12]] })),
  ];
  const tilt = (p) => { const [x, y] = [p[0] * Math.cos(HAT.tilt) - p[1] * Math.sin(HAT.tilt), p[0] * Math.sin(HAT.tilt) + p[1] * Math.cos(HAT.tilt)]; return [HAT.c[0] + x, HAT.c[1] + y, p[2]]; };
  const hat = curves('hat', hatLocal.map((l) => ({ ...l, pts: l.pts.map(tilt) })), { w: 0.85 });
  const nose = curves('nose', [[head.front(0.0, 0.31), [0.02, 0.3, 0.42]], [head.front(0.03, 0.3), [0.02, 0.3, 0.42]], [head.front(-0.01, 0.28), [0.02, 0.3, 0.42]]], { w: 1.6 });
  const eyes = [-0.075, 0.075].map((x) => spot('eye', head.front(x, 0.39, 0.01), n >= 400 ? 5 : 3, 0.022));
  const mouth = [-0.09, -0.045, 0, 0.045, 0.09].map((x) => spot('eye', head.front(x, 0.24 - 0.04 * Math.cos(x * 12), 0.01), 1));
  const buttons = [0.03, -0.12, -0.42].map((y) => spot('button', (y < -0.3 ? bottom : middle).front(0.02, y, 0.015), n >= 400 ? 5 : 4, 0.03));
  const stick = (a, b, f1, f2) => curves('arm', [[a, b], [f1[0], f1[1]], [f2[0], f2[1]]], { w: 1.2 });
  const armL = stick([-0.25, -0.04, 0.02], [-0.82, -0.2, -0.16], [[-0.7, -0.17, -0.13], [-0.82, -0.08, -0.12]], [[-0.62, -0.15, -0.11], [-0.66, -0.27, -0.06]]);
  const armR = stick([0.26, 0.02, 0.02], [0.86, 0.2, -0.16], [[0.74, 0.17, -0.13], [0.84, 0.3, -0.12]], [[0.66, 0.15, -0.11], [0.74, 0.06, -0.14]]);
  const shape = assemble([bottom, middle, head, hat, nose, ...eyes, ...mouth, ...buttons, armL, armR], n);
  const pts = colour(shape, { hat: mix(WARM, CYAN, 0.25), nose: ORANGE, eye: mix(WARM, GOLD, 0.3), button: GOLD, arm: mix(GOLD, ORANGE, 0.55) }, (p) => mix(WARM, CYAN, 0.12 + 0.18 * (0.6 - p[1]) / 1.6));
  const rank = rankBy(pts, (p) => -p[1] + 0.3 * p[0]);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (tag === 'hat') { const u = ease(t, 6) ** 2; o[1] += 0.1 * u; roll(o, -0.18 * u, HAT.c[0] - 0.2, HAT.c[1]); } // lüftet den Hut
    o[3] = tag === 'nose' ? 1.15 : tag === 'snow' || tag === 'head' ? wander(rank[j], t, 6.5, 0.25, 0.1) : 1;
    turn(o, t, 0.36, 0.42, 13);
  } };
}

// ---------------------------------------------------------------- Hund ----------
// Seitenansicht wie im Katalog (Kopf links): Rumpf und Brust als Ellipsoide, Hals, Kopf, Schnauze, Schlappohren auf
// beiden Seiten, vier Beine, von denen je zwei vorn und zwei hinten stehen (im 2D-Bild liegen sie übereinander), der
// Schwanz wedelt, der Ball hüpft.
const TAIL0 = [0.8, 0.2, 0];
export function hund(n) {
  const torso = ellipsoid('dog', [0.25, 0.05], [0.58, 0.23, 0.21], { lat: [], mer: [] });
  const chest = ellipsoid('dog', [-0.27, 0.02], [0.24, 0.26, 0.22], { lat: [0.2] });
  // Querschnitt-Reifen des Rumpfs (senkrechte Ringe, sie lesen sich als Rippen des Körpers)
  const girth = curves('girth', [0.02, 0.48].map((x) => { const k = Math.sqrt(1 - ((x - 0.25) / 0.58) ** 2); return { pts: Array.from({ length: 33 }, (_, i) => { const a = (i / 32) * TAU; return [x, 0.05 + Math.sin(a) * 0.23 * k, Math.cos(a) * 0.21 * k]; }), closed: true }; }));
  const neck = tube('dog', [[-0.38, 0.12, 0], [-0.6, 0.44, 0]], 0.12, { hoops: 1, caps: [false, false] });
  const head = ellipsoid('dog', [-0.7, 0.54], [0.2, 0.16, 0.15], { lat: [0.35] });
  const snout = tube('dog', [[-0.8, 0.48, 0], [-1.0, 0.44, 0]], (s) => 0.1 - 0.02 * s, { hoops: 1, caps: [false, true] });
  const ear = (z) => curves('ear', [{ pts: [[-0.64, 0.68, z], [-0.52, 0.67, z * 1.15], [-0.45, 0.52, z * 1.3], [-0.46, 0.36, z * 1.3], [-0.54, 0.33, z * 1.25], [-0.58, 0.48, z * 1.15], [-0.64, 0.62, z]], closed: true }]);
  const leg = (x0, x1, z) => tube('dog', [[x0, -0.02, z], [x0 + (x1 - x0) * 0.5, -0.32, z], [x1, -0.56, z]], (s) => 0.12 - 0.04 * s, { depth: 0.9, hoops: 0, crest: false, caps: [false, false] });
  const legs = [[-0.3, -0.28, 0.11], [-0.14, -0.1, -0.11], [0.58, 0.6, 0.11], [0.74, 0.86, -0.11]];
  const paws = legs.map(([, x1, z]) => ellipsoid('dog', [x1 - 0.05, -0.62, z], [0.12, 0.06, 0.08], { lat: [] }));
  const tail = tube('tail', [TAIL0, [0.88, 0.32, 0], [0.92, 0.45, 0]], (s) => 0.04 - 0.02 * s, { hoops: 0, crest: false, caps: [false, true], solid: false });
  const ball = ellipsoid('ball', [-0.92, -0.56, 0.18], [0.085, 0.085, 0.085], { lat: [0], mer: [0.8] });
  const eyes = [1, -1].map((s) => spot('eye', [-0.76, 0.6, s * 0.12], n >= 400 ? 4 : 3, 0.02, [0, 0, s]));
  const nose = spot('nose', [-1.05, 0.47, 0], n >= 400 ? 4 : 3, 0.025, [-1, 0, 0]);
  const shape = assemble([torso, chest, girth, neck, head, snout, ear(0.12), ear(-0.12), ...legs.map((l) => leg(...l)), ...paws, tail, ball, ...eyes, nose], n);
  const pts = colour(shape, { girth: mix(WARM, GOLD, 0.3), ear: mix(GOLD, ORANGE, 0.3), ball: RED, eye: DIAMOND, nose: GOLD, tail: WARM }, (p) => mix(WARM, GOLD, 0.15 + 0.25 * Math.max(0, p[0] + 0.4)));
  const rank = rankBy(pts, (p) => -p[1] + 0.3 * p[0]);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (tag === 'tail') yaw(o, 0.55 * Math.sin((t * TAU) / 1.1), TAIL0[0], TAIL0[2]); // wedelt
    if (tag === 'ball') { o[1] += 0.09 * ease(t, 1.6); roll(o, -0.6 * ease(t, 3.2), -0.92, -0.56); }
    if (tag === 'ear') o[1] += 0.012 * Math.sin((t * TAU) / 1.6);
    o[3] = tag === 'dog' ? wander(rank[j], t, 6, 0.25, 0.1) : tag === 'girth' ? 0.7 : 1;
    turn(o, t, -0.42, 0.4, 13, 0.1, 0);
  } };
}

// ---------------------------------------------------------------- Biene ----------
// Von vorn wie im Katalog: der Hinterleib als Ellipsoid, dessen Querschnitt-Reifen die Streifen sind, Brust und Kopf
// als Kugeln, Fühler nach vorn, je Seite ein Vorder- und ein Hinterflügel, schräg nach hinten gestellt. Die Flügel
// schlagen langsam auf und ab (in Drohnengrenzen), das Licht schwirrt an den Rändern.
const WING = [[0, 0], [0.18, 0.1], [0.42, 0.14], [0.62, 0.1], [0.7, 0.02], [0.6, -0.07], [0.36, -0.1], [0.14, -0.07]];
const SHOULDER = [0.17, 0.2];
export function biene(n) {
  const q = n / 300;
  const stripes = q > 1.2 ? [-0.75, -0.5, -0.25, 0, 0.25, 0.5] : [-0.6, -0.3, 0, 0.3, 0.6];
  const abdomen = ellipsoid('stripe', [0, -0.18, -0.05], [0.27, 0.36, 0.3], { lat: stripes, mer: [] });
  const shell = ellipsoid('body', [0, -0.18, -0.05], [0.27, 0.36, 0.3], { lat: [], mer: [Math.PI / 2] });
  const thorax = ellipsoid('body', [0, 0.2, 0], [0.17, 0.15, 0.17], { lat: [0] });
  const head = ellipsoid('head', [0, 0.4, 0.06], [0.14, 0.12, 0.13], { lat: [0.2] });
  const eyes = [-1, 1].map((s) => spot('eye', head.front(s * 0.07, 0.42, 0.005), n >= 400 ? 6 : 4, 0.03));
  const antenna = (s) => curves('antenna', [[[s * 0.05, 0.5, 0.12], [s * 0.12, 0.6, 0.2], [s * 0.2, 0.63, 0.26]]], { w: 1.2 });
  const tip = spot('sting', [0, -0.58, -0.08], 3, 0.02, [0, 1, 0]);
  const wing = (side, k, scale, back, up) => curves(`wing${side > 0 ? 'R' : 'L'}`, [{ pts: WING.map(([u, v]) => { const x = u * scale, y = v * scale; return [side * (SHOULDER[0] + x * Math.cos(back)), SHOULDER[1] + up + y, -0.04 - x * Math.sin(back) - k * 0.06]; }), closed: true }], { w: 0.9 });
  const parts = [abdomen, shell, thorax, head, ...eyes, antenna(-1), antenna(1), tip, wing(-1, 0, 1.18, 0.5, 0.03), wing(1, 0, 1.18, 0.5, 0.03), wing(-1, 1, 0.78, 0.85, -0.08), wing(1, 1, 0.78, 0.85, -0.08)];
  const shape = assemble(parts, n);
  const pts = colour(shape, { stripe: (p) => (Math.round((p[1] + 0.18) / 0.072) % 2 ? GOLD : mix(GOLD, ORANGE, 0.6)), head: mix(GOLD, WARM, 0.4), eye: WARM, antenna: mix(GOLD, WARM, 0.5), sting: ORANGE, wingL: mix(VIOLET, CYAN, 0.35), wingR: mix(VIOLET, CYAN, 0.35) }, GOLD);
  const span = pts.map((p) => Math.min(1, Math.hypot(Math.abs(p[0]) - SHOULDER[0], p[1] - SHOULDER[1], p[2]) / 0.8));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j], side = tag === 'wingR' ? 1 : tag === 'wingL' ? -1 : 0;
    if (side) { roll(o, side * 0.24 * Math.sin((t * TAU) / 1.8), side * SHOULDER[0], SHOULDER[1]); o[3] = 0.75 + 0.6 * span[j] * (0.5 + 0.5 * Math.sin(TAU * 2.2 * t - 6 * span[j])); }
    else if (tag === 'stripe') o[3] = glint(b[1], t, 3.2, 0.3, -0.6, 0.3);
    o[1] += 0.05 * ease(t, 3.4); // schwebt
    turn(o, t, 0.3, 0.38, 12);
    pitch(o, 0.18);
  } };
}

// ---------------------------------------------------------------- Taube ----------
// Im Aufflug nach rechts oben wie im Katalog: Körper und Kopf als Ellipsoide, Schwanzfächer, zwei Flügel, die nach oben
// und je zu einer Seite in die Tiefe stehen und langsam um die Körperachse schlagen, im Schnabel ein Ölzweig.
const DOVE = { a: [-0.42, -0.52, 0], b: [0.52, -0.02, 0] };
const DOVE_D = (() => { const d = [DOVE.b[0] - DOVE.a[0], DOVE.b[1] - DOVE.a[1], 0], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l, 0]; })();
const DOVE_S = [0.02, -0.18, 0]; // Schulter
const WING_SHAPE = [[0, 0], [-0.05, 0.25], [-0.02, 0.5], [0.06, 0.75], [0.16, 0.95], [0.22, 1.0], [0.3, 0.93], [0.25, 0.85], [0.36, 0.8], [0.31, 0.7], [0.42, 0.66], [0.35, 0.55], [0.44, 0.47], [0.35, 0.36], [0.36, 0.2], [0.28, 0.05]];
/** Flügel: Spannweite entlang dir (in der Bildebene), Hinterkante links davon, die Spitze um zTip in der Tiefe. */
const doveWing = (dir, zTip, L = 0.98) => { const l = Math.hypot(dir[0], dir[1]), d = [dir[0] / l, dir[1] / l], back = [-d[1], d[0]]; return { pts: WING_SHAPE.map(([x, y]) => [DOVE_S[0] + (d[0] * y + back[0] * x) * L, DOVE_S[1] + (d[1] * y + back[1] * x) * L, zTip * y]), closed: true }; };
export function taube(n) {
  const body = ellipsoid('dove', [0.04, -0.27], [0.5, 0.18, 0.17], { roll: Math.atan2(DOVE_D[1], DOVE_D[0]), lat: [], mer: [Math.PI / 2] });
  const head = ellipsoid('dove', [0.6, 0.07], [0.15, 0.14, 0.13], { lat: [0.35] });
  const beak = curves('beak', [[[0.73, 0.09, 0.03], [0.87, 0.04, 0]], [[0.73, 0.03, -0.03], [0.87, 0.04, 0]]], { w: 1.4 });
  const branch = curves('branch', [[[0.85, 0.03, 0], [0.98, -0.12, 0.02], [1.04, -0.28, 0.04]], ...[[0.94, -0.06, 1], [1.0, -0.17, -1], [1.03, -0.25, 1]].map(([x, y, s]) => ({ pts: Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU; return [x + s * 0.05 + Math.cos(a) * 0.05, y + Math.sin(a) * 0.022, 0.03 * s]; }), closed: true }))], { w: 1.1 });
  const tail = curves('tail', [{ pts: [DOVE.a, ...Array.from({ length: 9 }, (_, i) => { const a = 3.6 + (i / 8) * 0.85; return [DOVE.a[0] + Math.cos(a) * 0.52, DOVE.a[1] + Math.sin(a) * 0.52 + 0.025 * (i % 2), -0.16 + (0.33 * i) / 8]; })], closed: true }]);
  const near = curves('wingN', [doveWing([0.38, 0.92], 0.24)], { w: 0.95 }), far = curves('wingF', [doveWing([-0.3, 0.95], -0.3, 0.92)], { w: 0.95 });
  const eye = spot('eye', [0.66, 0.11, 0.1], 3, 0.018);
  const shape = assemble([body, head, beak, tail, near, far, eye, branch], n);
  const pts = colour(shape, { beak: ORANGE, branch: mix(GOLD, mix(CYAN, GREEN, 0.6), 0.6), eye: DIAMOND, wingN: (p) => mix(WARM, CYAN, 0.25 + 0.4 * Math.max(0, p[1])), wingF: (p) => mix(WARM, CYAN, 0.45 + 0.4 * Math.max(0, p[1])), tail: mix(WARM, CYAN, 0.2) }, WARM);
  const span = shape.pts.map((p) => Math.min(1, Math.hypot(p[0] - DOVE_S[0], p[1] - DOVE_S[1]) / 1.1));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j], side = tag === 'wingN' ? 1 : tag === 'wingF' ? -1 : 0;
    if (side) { turnAbout(o, DOVE_S, DOVE_D, side * 0.32 * (1 - Math.cos((t * TAU) / 2.4))); o[3] = 0.85 + 0.35 * span[j]; }
    o[1] += 0.05 * ease(t, 2.4); // jeder Flügelschlag hebt die Taube ein wenig
    turn(o, t, -0.3, 0.36, 13);
  } };
}

// ---------------------------------------------------------------- Marienkäfer ----------
// Von oben wie im Katalog: die Flügeldecken als Kuppel zum Publikum, die Naht in der Mitte, Punkte auf der Kuppel, der
// Kopf mit Fühlern, sechs Beine, die nach hinten in die Tiefe greifen. Die Beine laufen im Dreifuß-Takt, die Fühler
// tasten.
const BUG = { c: [0, -0.08], r: [0.62, 0.66, 0.36] };
const LEGS = [[-1, 0.28], [-1, -0.05], [-1, -0.38], [1, 0.28], [1, -0.05], [1, -0.38]];
export function marienkaefer(n) {
  const shell = ellipsoid('shell', BUG.c, BUG.r, { lat: [], mer: [Math.PI / 2] });
  const rim = curves('shell', [{ pts: Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * TAU; return [BUG.c[0] + Math.cos(a) * BUG.r[0] * 0.92, BUG.c[1] + Math.sin(a) * BUG.r[1] * 0.92, BUG.r[2] * 0.39]; }), closed: true }], { w: 0.8 });
  const head = ellipsoid('head', [0, 0.6, 0.05], [0.24, 0.16, 0.18], { lat: [0.2] });
  const spots = [[-0.3, 0.2], [0.3, 0.2], [-0.36, -0.2], [0.36, -0.2], [-0.2, -0.48], [0.2, -0.48]].map(([x, y]) => spot('dot', shell.front(x, y, 0.01), 6, 0.075));
  const feelers = [-1, 1].map((s) => curves('feeler', [[[s * 0.08, 0.72, 0.15], [s * 0.18, 0.88, 0.22], [s * 0.3, 0.98, 0.24]]], { w: 1.2 }));
  const legs = LEGS.map(([s, y], k) => curves(`leg${k}`, [[[s * 0.5, y, -0.05], [s * 0.78, y + 0.08, -0.12], [s * 0.95, y - 0.12, -0.22]]], { w: 1 }));
  const shape = assemble([shell, rim, head, ...spots, ...feelers, ...legs], n);
  const pts = colour(shape, { head: mix(VIOLET, WARM, 0.5), dot: WARM, feeler: mix(VIOLET, WARM, 0.4) }, RED).map((p, j) => (shape.tags[j].startsWith('leg') ? [p[0], p[1], p[2], ...mix(VIOLET, WARM, 0.4)] : p));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (tag.startsWith('leg')) { const k = +tag.slice(3), [s, y] = LEGS[k], phase = (k + (s > 0 ? 1 : 0)) % 2 ? 1 : -1; roll(o, phase * 0.14 * Math.sin((t * TAU) / 1.6), s * 0.5, y); }
    else if (tag === 'feeler') roll(o, 0.08 * Math.sin((t * TAU) / 2.2) * (b[0] > 0 ? 1 : -1), 0, 0.72);
    else if (tag === 'dot') o[3] = breathe(t, 2.6, j * 0.07);
    turn(o, t, 0.3, 0.35, 13);
    pitch(o, 0.12);
  } };
}

// ---------------------------------------------------------------- Lachendes Gesicht ----------
// Ein Kopf als Kugel mit ruhigem Umriss; lachende Augen und der offene Mund liegen
// auf der Vorderfläche und wandern beim Drehen mit ihr. Der Kopf nickt und dreht sich lachend hin und her.
export function smiley(n) {
  const R = 0.95, head = ellipsoid('face', [0, 0], [R, R, R * 0.9], { lat: [], mer: [] });
  const on = (x, y) => head.front(x, y, 0.01);
  const eye = (cx) => curves('feature', [Array.from({ length: 14 }, (_, i) => { const a = Math.PI * (i / 13); return on(cx + Math.cos(a) * 0.17, 0.26 + Math.sin(a) * 0.15); })], { w: 1.3 });
  const mouth = curves('feature', [{ pts: [...Array.from({ length: 22 }, (_, i) => { const u = i / 21, x = -0.55 + 1.1 * u; return on(x, -0.12 - 0.04 * Math.sin(Math.PI * u)); }), ...Array.from({ length: 22 }, (_, i) => { const u = 1 - i / 21, x = -0.55 + 1.1 * u; return on(x, -0.14 - 0.5 * Math.sin(Math.PI * u) ** 0.9); })], closed: true }], { w: 1.3 });
  const tongue = curves('tongue', [Array.from({ length: 12 }, (_, i) => { const u = i / 11, x = -0.2 + 0.4 * u; return on(x, -0.52 + 0.1 * Math.sin(Math.PI * u)); })], { w: 1.1 });
  const shape = assemble([head, eye(-0.33), eye(0.33), mouth, tongue], n);
  const pts = colour(shape, { feature: WARM, tongue: PINK }, (p) => mix(GOLD, WARM, 0.15 + 0.2 * p[1]));
  return { pts, live: (b, j, t, o) => {
    pitch(o, 0.1 * Math.sin((t * TAU) / 1.6) ** 2); // lacht: nickt im Takt
    turn(o, t, 0, 0.45, 9);
    if (shape.tags[j] === 'feature') o[3] = 1.15;
  } };
}

// ---------------------------------------------------------------- Sparschwein ----------
// Ein rundes Schwein: Rumpf als Ellipsoid mit Bauchringen, Rüssel als kurze Röhre zum Publikum, Ohren, vier Beine in der
// Tiefe, Ringelschwanz als Spirale, oben der Schlitz. Eine Münze schwebt über dem Schlitz und dreht sich.
const COIN = [0.08, 0.72, 0];
export function sparschwein(n) {
  const body = ellipsoid('pig', [0, -0.08], [0.78, 0.5, 0.45], { lat: [], mer: [Math.PI / 2] });
  const girth = curves('pig', [0.15].map((x) => { const k = Math.sqrt(1 - (x / 0.78) ** 2); return { pts: Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * TAU; return [x, -0.08 + Math.sin(a) * 0.5 * k, Math.cos(a) * 0.45 * k]; }), closed: true }; }));
  const snout = tube('snout', [[-0.7, 0.0, 0.0], [-0.92, -0.02, 0.0]], 0.15, { hoops: 0, crest: false, caps: [false, false] });
  const disc = curves('snout', [{ pts: Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU; return [-0.92, -0.02 + Math.sin(a) * 0.15, Math.cos(a) * 0.15]; }), closed: true }]);
  const nostrils = [-1, 1].map((s) => spot('nostril', [-0.93, -0.02, s * 0.06], 3, 0.025, [-1, 0, 0]));
  const ears = [-1, 1].map((s) => curves('ear', [[[-0.45, 0.32, s * 0.2], [-0.55, 0.62, s * 0.26], [-0.28, 0.42, s * 0.24]]]));
  const eyes = [-1, 1].map((s) => spot('eye', [-0.6, 0.15, s * 0.22], 3, 0.025, [-0.6, 0.2, s]));
  const legs = [[-0.45, 0.22], [-0.45, -0.22], [0.42, 0.22], [0.42, -0.22]].map(([x, z]) => tube('pig', [[x, -0.4, z], [x, -0.72, z]], 0.09, { hoops: 0, crest: false, caps: [false, true] }));
  const tail = curves('tail', [Array.from({ length: 24 }, (_, i) => { const a = (i / 23) * TAU * 1.5; return [0.78 + 0.05 * i / 23 + 0.05 * Math.cos(a), 0.02 + 0.05 * Math.sin(a), 0.05 * Math.sin(a)]; })], { w: 1.1 });
  const slot = curves('slot', [{ pts: [[-0.08, 0.42, 0.08], [0.24, 0.42, 0.08], [0.24, 0.42, -0.08], [-0.08, 0.42, -0.08]], closed: true }], { w: 0.9 });
  const coin = curves('coin', [{ pts: Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU; return [COIN[0] + Math.cos(a) * 0.15, COIN[1] + Math.sin(a) * 0.15, 0]; }), closed: true }, { pts: Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * TAU; return [COIN[0] + Math.cos(a) * 0.07, COIN[1] + Math.sin(a) * 0.07, 0.005]; }), closed: true }], { w: 1.2 });
  const shape = assemble([body, girth, snout, disc, ...nostrils, ...ears, ...eyes, ...legs, tail, slot, coin], n);
  const pts = colour(shape, { coin: GOLD, slot: mix(PINK, WARM, 0.6), eye: WARM, nostril: WARM }, (p) => mix(PINK, WARM, 0.3));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (tag === 'coin') { yaw(o, t * 1.4, COIN[0], 0); o[1] += 0.06 * ease(t, 2.4); o[3] = glint(o[0] - COIN[0], t, 1.5, 0.6, -0.15, 0.15); }
    else if (tag === 'tail') roll(o, 0.25 * Math.sin((t * TAU) / 1.4), 0.78, 0.02);
    turn(o, t, 0.4, 0.35, 13);
  } };
}

// ---------------------------------------------------------------- Lotusblume ----------
// Blütenblätter in zwei Kränzen um die senkrechte Achse, der innere steiler, der äußere offen, jedes Blatt ein spitzer
// Bogen, der sich nach außen neigt; in der Mitte ein goldener Fruchtknoten, darunter ein flaches Blatt auf dem Wasser.
// Die Blüte dreht sich langsam, Licht steigt die Blätter hinauf.
export function lotusblume(n) {
  // ein Blatt in seiner eigenen Ebene (w quer, h längs), um phi um die Achse gedreht und um tilt nach außen geneigt
  const petal = (phi, tilt, L, W, y0, r0) => {
    const edge = Array.from({ length: 12 }, (_, i) => { const u = i / 11; return [W * Math.sin(Math.PI * u ** 0.8), L * u]; });
    const outline = [...edge.map(([w, h]) => [-w, h]), ...edge.slice(0, -1).reverse()];
    return outline.map(([w, h]) => { const r = r0 + h * Math.sin(tilt), y = y0 + h * Math.cos(tilt); return [Math.cos(phi) * r - Math.sin(phi) * w, y, Math.sin(phi) * r + Math.cos(phi) * w]; });
  };
  const ring = (k, tilt, L, W, y0, off, r0) => Array.from({ length: k }, (_, i) => ({ pts: petal((i / k) * TAU + off, tilt, L, W, y0, r0) }));
  const inner = curves('inner', ring(5, 0.38, 0.72, 0.17, -0.4, 0.3, 0.1), { w: 1 }), outer = curves('outer', ring(7, 0.95, 0.8, 0.22, -0.44, 0, 0.2), { w: 1 });
  const seed = ellipsoid('seed', [0, -0.32, 0], [0.13, 0.07, 0.13], { lat: [] });
  const pad = curves('pad', [{ pts: Array.from({ length: 64 }, (_, i) => { const a = 0.25 + (i / 63) * (TAU - 0.5); return [Math.cos(a) * 0.8, -0.5, Math.sin(a) * 0.8]; }) }], { w: 0.7 });
  const shape = assemble([seed, inner, outer, pad], n);
  const pts = colour(shape, { seed: GOLD, pad: mix(GREEN, CYAN, 0.4), inner: (p) => mix(WARM, PINK, 0.2 + 0.5 * (p[1] + 0.4)) }, (p) => mix(WARM, PINK, 0.1 + 0.6 * (p[1] + 0.44)));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (tag !== 'pad') { yaw(o, t * 0.25); o[3] = chase(b[1], t, 0.3, 0.6, 0.85, 1.3); }
    pitch(o, 0.2);
    yaw(o, 0.25 * Math.sin((t * TAU) / 14));
  } };
}

// ---------------------------------------------------------------- Schmetterling ----------
// Runde 7 (Marc: „könnte nicer aussehen und ein bisschen realer“): von oben, die Flügel ausgebreitet und leicht zum
// Publikum aufgestellt. Vorderflügel mit gerundeter Spitze und Adern, Hinterflügel mit gewelltem Rand, Schwänzchen und
// Augenfleck, Farben aus der Katalogformation (Blau-Violett, Magenta, Gelb). Körper aus Brust, Kopf und gegliedertem
// Hinterleib, Fühler mit Kolben. Die Flügel schlagen langsam um die Körperachse; im Schwenk sieht man ihre Fläche
// kürzer und länger werden. Wenige Drohnen: Umrisse, Körper, Fühler; ab 350 Adern, Saum und Flecken.
const FORE = [[0.04, 0.08], [0.2, 0.3], [0.38, 0.5], [0.56, 0.66], [0.74, 0.78], [0.88, 0.84], [0.95, 0.8], [0.93, 0.66], [0.86, 0.5], [0.8, 0.36], [0.72, 0.22], [0.62, 0.12], [0.44, 0.06], [0.24, 0.02], [0.1, 0.02]];
const HIND = (rich) => {
  const base = [[0.1, -0.02], [0.32, -0.02], [0.52, -0.08], [0.66, -0.2], [0.7, -0.36], [0.64, -0.52], [0.5, -0.64], [0.36, -0.7], [0.28, -0.88], [0.22, -0.9], [0.2, -0.72], [0.1, -0.56], [0.04, -0.36], [0.03, -0.14]];
  if (!rich) return base;
  // gewellter Saum zwischen Außenrand und Schwänzchen
  const out = [];
  base.forEach((p, i) => { out.push(p); const q = base[i + 1]; if (q && i >= 2 && i <= 6) { const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], l = Math.hypot(m[0] - 0.05, m[1] + 0.1); out.push([m[0] + 0.035 * (m[0] - 0.05) / l, m[1] + 0.035 * (m[1] + 0.1) / l]); } });
  return out;
};
const FLY = { rest: 0.32, amp: 0.62, period: 2.6 };
/** Flügelpunkt (u außen, v längs des Körpers) für die Seite s, um ang aus der Ebene zum Publikum gedreht. */
const wingPt = (s, [u, v], ang, lift = 0) => [s * u * Math.cos(ang), v, u * Math.sin(ang) + lift];
export function schmetterling(n) {
  const rich = n >= 350;
  const parts = [];
  for (const s of [-1, 1]) {
    const side = s > 0 ? 'R' : 'L', a = FLY.rest;
    const W = (l, w = 1) => ({ pts: l.map((p) => wingPt(s, p, a)), closed: true, w });
    parts.push(curves(`fore${side}`, [W(FORE)], { w: 1.05 }));
    parts.push(curves(`hind${side}`, [W(HIND(rich))], { w: 1 }));
    // Querbinde über den Vorderflügel (wie der gelbe Tropfen im Katalog, hier als Binde eines Admirals), helle Punkte an
    // der Spitze, Augenfleck im Hinterflügel
    const band = (() => { const P0 = [0.46, 0.5], P1 = [0.77, 0.35], d = [P1[0] - P0[0], P1[1] - P0[1]], l = Math.hypot(...d), nn = [-d[1] / l, d[0] / l], k = 10;
      const side = (w) => Array.from({ length: k }, (_, i) => { const u = i / (k - 1), bow = 0.02 * Math.sin(Math.PI * u), ww = w * (0.75 + 0.25 * Math.sin(Math.PI * u)); return [P0[0] + d[0] * u + nn[0] * (ww + bow), P0[1] + d[1] * u + nn[1] * (ww + bow)]; });
      return [...side(0.045), ...side(-0.045).reverse()]; })();
    parts.push(curves(`mark${side}`, [{ pts: band.map((p) => wingPt(s, p, a, 0.005)), closed: true }], { w: 1.25 }));
    const nrm = [-s * Math.sin(a), 0, Math.cos(a)];
    parts.push(spot(`eye${side}`, wingPt(s, [0.42, -0.42], a, 0.008), rich ? 7 : 4, rich ? 0.065 : 0.05, nrm));
    if (n >= 300) for (const q of [[0.83, 0.73], [0.88, 0.66], [0.78, 0.66]]) parts.push(spot(`apex${side}`, wingPt(s, q, a, 0.006), 1, 0.01, nrm));
    if (rich) {
      const veins = [[[0.08, 0.06], [0.3, 0.3], [0.44, 0.46]], [[0.1, 0.04], [0.4, 0.2], [0.6, 0.28]], [[0.12, 0.03], [0.4, 0.08], [0.62, 0.14]]];
      parts.push(curves(`vein${side}`, veins.map((l) => l.map((p) => wingPt(s, p, a, 0.004))), { w: 0.55 }));
      parts.push(curves(`hvein${side}`, [[[0.1, -0.06], [0.3, -0.2], [0.44, -0.3]], [[0.08, -0.1], [0.18, -0.36], [0.24, -0.62]]].map((l) => l.map((p) => wingPt(s, p, a, 0.004))), { w: 0.55 }));
      parts.push(curves(`edge${side}`, [[[0.48, -0.13], [0.58, -0.23], [0.61, -0.36], [0.56, -0.5], [0.45, -0.59], [0.34, -0.63]].map((p) => wingPt(s, p, a, 0.005))], { w: 0.9 }));
    }
  }
  const thorax = ellipsoid('body', [0, 0.1, 0.02], [0.07, 0.13, 0.07], { lat: rich ? [0] : [] });
  const head = ellipsoid('body', [0, 0.29, 0.03], [0.055, 0.05, 0.05], { lat: [] });
  const abdomen = tube('body', [[0, -0.02, 0.02], [0, -0.6, 0.0]], (u) => 0.055 * (1 - 0.6 * u * u), { depth: 1, hoops: rich ? 3 : 1, crest: false, caps: [false, true] });
  const antennae = [-1, 1].map((s) => curves('antenna', [[[s * 0.025, 0.33, 0.05], [s * 0.09, 0.5, 0.1], [s * 0.17, 0.66, 0.14], [s * 0.24, 0.76, 0.15]]], { w: 1 }));
  const clubs = [-1, 1].map((s) => spot('club', [s * 0.26, 0.79, 0.15], 3, 0.022));
  parts.push(thorax, head, abdomen, ...antennae, ...clubs);
  const shape = assemble(parts, n);
  const foreC = (p) => mix(mix(BLUE, VIOLET, 0.35), VIOLET, Math.min(1, Math.abs(p[0]) / 0.9)), hindC = (p) => mix(VIOLET, PINK, 0.25 + 0.4 * Math.min(1, -p[1] / 0.8));
  const map = { body: mix(WARM, GOLD, 0.25), antenna: WARM, club: GOLD };
  for (const sd of ['L', 'R']) Object.assign(map, { [`fore${sd}`]: foreC, [`hind${sd}`]: hindC, [`mark${sd}`]: mix(GOLD, ORANGE, 0.25), [`eye${sd}`]: GOLD, [`apex${sd}`]: WARM, [`edge${sd}`]: mix(GOLD, PINK, 0.35), [`vein${sd}`]: mix(VIOLET, WARM, 0.45), [`hvein${sd}`]: mix(PINK, WARM, 0.4) });
  const pts = colour(shape, map, WARM);
  // jede Flügeldrohne kennt ihre Lage im Flügel (u, v) und ihren Abstand von der Körperfläche (Flecken, Adern)
  const local = shape.pts.map((p, j) => { const tag = shape.tags[j], side = tag.endsWith('R') ? 1 : tag.endsWith('L') ? -1 : 0; if (!side || tag === 'body') return null; const ca = Math.cos(FLY.rest), sa = Math.sin(FLY.rest); const u = Math.abs(p[0]) / ca, lift = p[2] - u * sa; return [side, u, p[1], lift]; });
  return { pts, live: (b, j, t, o) => {
    const L = local[j];
    if (L) { const [s, u, v, lift] = L, ang = FLY.rest + FLY.amp * ease(t, FLY.period), q = wingPt(s, [u, v], ang, 0); o[0] = q[0] - s * lift * Math.sin(ang); o[1] = q[1]; o[2] = q[2] + lift * Math.cos(ang); o[3] = /^(mark|eye|apex)/.test(shape.tags[j]) ? breathe(t, FLY.period, 0) + 0.1 : 0.85 + 0.3 * Math.min(1, u); }
    o[1] += 0.04 * ease(t + FLY.period / 2, FLY.period); // jeder Flügelschlag trägt ihn ein Stück
    pitch(o, -0.42);
    turn(o, t, 0.3, 0.38, 13);
  } };
}
