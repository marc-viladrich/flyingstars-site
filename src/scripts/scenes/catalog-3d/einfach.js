// Runde 9: einfache Motive (Stufe 3D, stufen.js) für Katalogmotive, die bisher in 3D als flache Formation liefen. Jedes
// gibt es in zwei Fassungen (Marc: „3D+ offensichtlich komplexer und refinter und more polished“):
//   3D  – schlicht: die Grundkörper als Umriss, wenig Detail, ruhiger Schwenk, höchstens Licht.
//   3D+ – aufwendig: Kämme und Röhren statt Einzellinien, Zusatzteile, feinere Silhouette und eine Story-Bewegung.
// Maße aus der Katalogformation (docs/katalog-3d.md). Aufruf (n, stufe), ohne Stufe gilt 3D.
import { GOLD, WARM, ORANGE, RED, PINK, VIOLET, CYAN, BLUE, GREEN, mix, yaw, roll, pitch, glint, breathe, chase } from '../../show-motion.js';
import { revolve, tube, curves, assemble, colour, turn, isPlus, TAU } from './kit.js';

const ringX = (x, r, tag, k = 36, w = 1) => curves(tag, [{ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [x, Math.sin(a) * r, Math.cos(a) * r]; }), closed: true }], { w });

// ---------------------------------------------------------------- Batterie ----------
// Liegend wie im Katalog, der Pluspol rechts. 3D: ein Zylinder mit zwei Endringen und drei Ladebalken, die ruhig leuchten.
// 3D+: Kamm über den Körper, Pol als eigener Zylinder, Pluszeichen, fünf Balken, die nacheinander aufladen, dann blitzt
// der Pol.
const BAT = { x0: -0.92, x1: 0.82, r: 0.44 };
export function batterie(n, stufe) {
  const P = isPlus(stufe, n), bars = P ? 5 : 3;
  const body = tube('case', [[BAT.x0, 0, 0], [BAT.x1, 0, 0]], BAT.r, { depth: 1, hoops: 0, crest: P, caps: [false, false] });
  const ends = [BAT.x0, BAT.x1].map((x) => ringX(x, BAT.r, 'case', 40));
  const charge = Array.from({ length: bars }, (_, k) => ringX(BAT.x0 + (P ? 0.2 + k * 0.3 : 0.35 + k * 0.45), BAT.r * 1.005, `bar${k}`, 36, 1.1));
  const extra = P ? [
    tube('pole', [[BAT.x1, 0, 0], [BAT.x1 + 0.13, 0, 0]], 0.13, { depth: 1, hoops: 0, crest: false, caps: [false, true] }),
    curves('plus', [[[0.58, 0.0, BAT.r + 0.01], [0.7, 0.0, BAT.r + 0.01]], [[0.64, -0.07, BAT.r + 0.005], [0.64, 0.07, BAT.r + 0.005]]], { w: 1.3 }),
  ] : [curves('pole', [[[BAT.x1, 0.13, 0], [BAT.x1 + 0.12, 0.13, 0], [BAT.x1 + 0.12, -0.13, 0], [BAT.x1, -0.13, 0]]])];
  const shape = assemble([body, ...ends, ...charge, ...extra], n);
  const pts = colour(shape, { pole: GOLD, plus: GOLD, case: mix(WARM, CYAN, 0.18) }, GREEN);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (!P) { o[3] = tag.startsWith('bar') ? 1.05 : 1; turn(o, t, 0.4, 0.3, 14); pitch(o, 0.22); return; }
    const level = (((t + 3.2) % 6) / 6) * (bars + 1.2); // beginnt mit drei vollen Balken
    if (tag.startsWith('bar')) { const k = +tag.slice(3); o[3] = level > k + 1 ? 1.25 : level > k ? 0.4 + 0.85 * (level - k) : 0.25; }
    else if (tag === 'pole' || tag === 'plus') o[3] = level > bars ? 1.6 : 1; // voll: der Pol blitzt
    else o[3] = glint(b[0], t, 6, 0.25, -1, 1);
    turn(o, t, 0.4, 0.38, 13);
    pitch(o, 0.25);
  } };
}

// ---------------------------------------------------------------- Doppelherz ----------
// 3D: der Umriss des äußeren Katalogherzens und das innere Herz als Höhenlinie der Wölbung, vorn gesetzt; ruhiger
// Schwenk. 3D+: eine zweite Höhenlinie, die Rückenlinie von der Kerbe zur Spitze und ein Herzschlag, bei dem die
// Höhenlinien nacheinander aufleuchten.
const heartPt = (u, s, c = [0, 0]) => { const x = 16 * Math.sin(u) ** 3, y = 13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u); return [c[0] + (x / 17) * s, c[1] + (y / 17) * s]; };
export function doppelherz(n, stufe) {
  const P = isPlus(stufe, n), S = 1.0, C = [0, 0.08];
  const contour = (s, z, k = 72) => ({ pts: Array.from({ length: k }, (_, i) => { const [x, y] = heartPt((i / k) * TAU, s, [C[0], C[1] + (S - s) * 0.18]); return [x, y, z]; }), closed: true });
  const outer = curves('outer', [contour(S, 0, 90)], { w: 1.15 });
  const inner = curves('inner', [contour(0.6, 0.26)], { w: 1 });
  const extra = P ? [
    curves('inner2', [contour(0.3, 0.34, 40)], { w: 1 }),
    curves('crest', [Array.from({ length: 20 }, (_, i) => { const u = i / 19, top = C[1] + 0.52 * S, tipY = C[1] - 0.98 * S; return [0, top + (tipY - top) * u, 0.36 * Math.sin(Math.PI * u) ** 0.7]; })], { w: 0.7 }),
  ] : [];
  const shape = assemble([outer, inner, ...extra], n);
  const pts = colour(shape, { inner: mix(PINK, WARM, 0.35), inner2: mix(PINK, WARM, 0.55), crest: mix(PINK, WARM, 0.5) }, (p) => mix(RED, PINK, 0.35 + 0.3 * (p[1] + 1) / 2));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (!P) { turn(o, t, 0.3, 0.36, 14); return; }
    const pulse = Math.max(0, Math.sin((t * TAU) / 1.4)) ** 4, beat = 1 + 0.035 * pulse; // schlägt
    o[0] *= beat; o[1] = C[1] + (o[1] - C[1]) * beat; o[2] *= beat;
    o[3] = tag === 'outer' ? glint(b[0] + b[1], t, 5, 0.3, -1.6, 1.6) : 0.9 + 0.5 * Math.max(0, Math.sin((t * TAU) / 1.4 - (tag === 'inner2' ? 0.6 : 0.3))) ** 4;
    turn(o, t, 0.3, 0.42, 13);
  } };
}

// ---------------------------------------------------------------- Unendlich-Zeichen ----------
// Eine räumliche Schleife: an der Kreuzung läuft der eine Bogen vor, der andere hinter der Bildebene. 3D: als Linie,
// ruhiges Licht. 3D+: als Röhre mit zwei Seitenlinien und Kamm (die zwei Linien der 2D-Formation), ein Lichtpuls läuft
// die Schleife entlang und die Schleife wiegt sich in der Tiefe.
export function unendlich(n, stufe) {
  const P = isPlus(stufe, n), A = 0.98, k = 120;
  const path = Array.from({ length: k + 1 }, (_, i) => { const u = (i / k) * TAU, d = 1 + Math.sin(u) ** 2; return [(A * Math.cos(u)) / d, (A * Math.sin(u) * Math.cos(u)) / d * 1.15, 0.2 * Math.sin(u)]; });
  const band = P ? tube('band', path, 0.075, { depth: 1, hoops: 0, crest: true, caps: [false, false] }) : curves('band', [{ pts: path.slice(0, -1), closed: true }], { w: 1 });
  const shape = assemble([band], n);
  const along = shape.pts.map((p) => Math.atan2(p[2] / 0.2, p[0] >= 0 ? 1 : -1));
  const pts = colour(shape, {}, (p) => (p[0] < 0 ? mix(RED, ORANGE, 0.4 + 0.4 * (p[0] + 1)) : mix(BLUE, VIOLET, 0.3 + 0.5 * p[0])));
  return { pts, live: (b, j, t, o) => {
    if (!P) { turn(o, t, 0.25, 0.32, 14); pitch(o, 0.18); return; }
    o[3] = chase(b[0] * 0.5 + along[j] * 0.1, t, 0.25, 0.6, 0.75, 1.3);
    pitch(o, 0.18 + 0.1 * Math.sin((t * TAU) / 8));
    turn(o, t, 0.25, 0.4, 13);
  } };
}

// ---------------------------------------------------------------- Peace-Zeichen ----------
// 3D: der Ring als Kreis, die drei Striche als Linien, ruhiger Schwenk. 3D+: Ring als Torus (Innen-, Außenkante, Kamm),
// Striche als Röhren, Licht läuft um den Ring und die Striche hinab.
export function peace(n, stufe) {
  const P = isPlus(stufe, n), R = 0.9, w = 0.065, d = Math.SQRT1_2 * R;
  const ringAxis = Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * TAU + 0.001; return [Math.cos(a) * R, Math.sin(a) * R, 0]; });
  const segs = [[[0, R, 0], [0, -R, 0]], [[0, 0, 0], [-d, -d, 0]], [[0, 0, 0], [d, -d, 0]]];
  const parts = P
    ? [tube('ring', ringAxis, w, { depth: 1, hoops: 0, crest: true, caps: [false, false] }), ...segs.map(([a, b]) => tube('bar', [a, b], w * 0.85, { depth: 1, hoops: 0, crest: false, caps: [false, false] }))]
    : [curves('ring', [{ pts: ringAxis.slice(0, -1), closed: true }], { w: 1 }), curves('bar', segs)];
  const shape = assemble(parts, n);
  const ang = shape.pts.map((p) => Math.atan2(p[1], p[0]));
  const pts = colour(shape, { bar: mix(WARM, CYAN, 0.2) }, (p) => mix(GOLD, PINK, 0.5 + 0.5 * Math.sin(Math.atan2(p[1], p[0]))));
  return { pts, live: (b, j, t, o) => {
    if (!P) { turn(o, t, 0.2, 0.4, 14); pitch(o, 0.12); return; }
    o[3] = shape.tags[j] === 'ring' ? glint(ang[j], t, 4.5, 0.4, -Math.PI, Math.PI) : glint(-b[1], t, 4.5, 0.4, -1, 1);
    turn(o, t, 0.2, 0.55, 12);
    pitch(o, 0.12);
  } };
}

// ---------------------------------------------------------------- Anker ----------
// Schaft, Ring, Arme und der Stock, der wie an einem echten Anker quer in der Tiefe steht. 3D: alles als Linien, ruhiger
// Schwenk. 3D+: Schaft und Arme als Röhren mit Kamm, Flunken an den Armen, eine Kette am Ring, und der Anker pendelt.
const ANCHOR_TOP = [0, 0.88];
export function anker(n, stufe) {
  const P = isPlus(stufe, n);
  const SPAN = 1.32, armAt = (a) => [Math.cos(a) * 0.62, -0.2 + Math.sin(a) * 0.62, 0];
  const armPts = (s) => Array.from({ length: 22 }, (_, i) => armAt(-Math.PI / 2 + s * (i / 21) * SPAN));
  const ring = curves('ring', [{ pts: Array.from({ length: 30 }, (_, i) => { const a = (i / 30) * TAU; return [Math.cos(a) * 0.1, ANCHOR_TOP[1] - 0.04 + Math.sin(a) * 0.1, 0]; }), closed: true }], { w: 1.1 });
  const parts = P ? [
    tube('anchor', [[0, 0.72, 0], [0, -0.82, 0]], 0.055, { depth: 1, hoops: 0, crest: true, caps: [false, true] }),
    tube('stock', [[0, 0.5, -0.5], [0, 0.5, 0.5]], 0.045, { depth: 1, hoops: 0, crest: false, caps: [true, true] }),
    ...[1, -1].map((s) => tube('anchor', armPts(s), 0.05, { depth: 1, hoops: 0, crest: true, caps: [false, false] })),
    curves('fluke', [1, -1].map((s) => { const [x, y] = armAt(-Math.PI / 2 + s * SPAN); return [[x - s * 0.13, y - 0.02, 0], [x + s * 0.02, y + 0.14, 0], [x + s * 0.1, y - 0.1, 0]]; }), { w: 1.2 }),
    // Kette: ovale Glieder abwechselnd in zwei Ebenen, vom Ring nach oben
    curves('chain', Array.from({ length: 3 }, (_, k) => { const cy = ANCHOR_TOP[1] + 0.12 + k * 0.1, flat = k % 2; return { pts: Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return [flat ? 0 : Math.cos(a) * 0.035, cy + Math.sin(a) * 0.06, flat ? Math.cos(a) * 0.035 : 0]; }), closed: true }; }), { w: 0.9 }),
  ] : [
    curves('anchor', [[[0, 0.72, 0], [0, -0.82, 0]], armPts(1), armPts(-1)], { w: 1 }),
    curves('stock', [[[0, 0.5, -0.45], [0, 0.5, 0.45]]], { w: 1 }),
  ];
  const shape = assemble([ring, ...parts], n);
  const pts = colour(shape, { ring: GOLD, chain: mix(GOLD, WARM, 0.4), stock: mix(WARM, BLUE, 0.3), fluke: mix(CYAN, BLUE, 0.3) }, (p) => mix(CYAN, BLUE, 0.35 + 0.3 * (0.9 - p[1]) / 1.8));
  return { pts, live: (b, j, t, o) => {
    if (!P) { turn(o, t, 0.45, 0.32, 14); return; }
    roll(o, 0.07 * Math.sin((t * TAU) / 5), ANCHOR_TOP[0], ANCHOR_TOP[1] + 0.32); // pendelt an der Kette
    o[3] = shape.tags[j] === 'anchor' ? glint(-b[1], t, 5, 0.35, -0.9, 1) : 1;
    turn(o, t, 0.45, 0.4, 13);
  } };
}

// ---------------------------------------------------------------- Hochzeitstorte ----------
// 3D: drei Stockwerke als Rotationskörper (Seitenlinien, Kanten), ein Herz obenauf, ruhiger Schwenk. 3D+: Zierbänder
// als Girlanden auf jeder Stufe, Perlen am Rand, zwei Herzen in der Tiefe; die Torte dreht sich, Licht läuft die
// Girlanden entlang, die Herzen atmen.
const TIERS = [[0.86, -0.95, -0.42], [0.62, -0.42, 0.05], [0.4, 0.05, 0.46]];
export function torte(n, stufe) {
  const P = isPlus(stufe, n), parts = [];
  TIERS.forEach(([r, y0, y1], k) => {
    parts.push(revolve(`tier${k}`, [0, 0], [[r, y0], [r, y1]], { meridians: 2, rings: [y0, y1], phase: 0 }));
    if (P) parts.push(curves('garland', [{ pts: Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU, y = y0 + (y1 - y0) * 0.55 - 0.05 * Math.abs(Math.sin(a * 4)); return [Math.cos(a) * r * 1.01, y, Math.sin(a) * r * 1.01]; }), closed: true }], { w: 0.8 }));
  });
  const smallHeart = (dz, s = 0.15) => curves('topper', [{ pts: Array.from({ length: 22 }, (_, i) => { const [x, y] = heartPt((i / 22) * TAU, s, [0, 0.66]); return [x, y, dz]; }), closed: true }], { w: 1.1 });
  parts.push(...(P ? [smallHeart(0.07), smallHeart(-0.07)] : [smallHeart(0, 0.17)]));
  const shape = assemble(parts, n);
  const pts = colour(shape, { garland: GOLD, topper: mix(RED, PINK, 0.4) }, (p) => mix(WARM, PINK, 0.08 + 0.12 * (p[1] + 1)));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (!P) { turn(o, t, 0, 0.3, 14); pitch(o, 0.22); return; }
    if (tag !== 'topper') yaw(o, t * 0.22);
    o[3] = tag === 'garland' ? chase(Math.atan2(b[2], b[0]), t, 0.8, 1.05, 0.7, 1.3) : tag === 'topper' ? breathe(t, 2.2) + 0.1 : 1;
    turn(o, t, 0, 0.3, 13);
    pitch(o, 0.22);
  } };
}
