// 3D-Fassungen flacher Zeichen (Formklasse Embleme und Zeichen, docs/katalog-3d.md): Aus dem Umriss wird ein Körper mit
// Graten (Stern) oder eine räumliche Anordnung (Galaxie als geneigte Scheibe). Der Umriss bleibt in der Bildebene, damit
// das Zeichen bei 0° so dasteht wie im Katalog.
import { GOLD, WARM, ORANGE, PINK, VIOLET, CYAN, mix, yaw, roll, pitch, glint, wander, chase, breathe } from '../../show-motion.js';
import { ellipsoid, curves, assemble, colour, rankBy, TAU } from './kit.js';

// ---------------------------------------------------------------- Stern ----------
// Ein geschliffener Stern: der Umriss mit fünf Zacken, vorn und hinten eine Spitze, von der Grate zu jeder Zacke und
// jedem Innenwinkel laufen. Er dreht sich ganz um seine senkrechte Achse; Licht läuft die Grate entlang.
export function stern(n) {
  const C = [0, -0.02], R = 0.93, r = 0.4, D = 0.32;
  const corner = (k) => { const a = Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r : R; return [C[0] + Math.cos(a) * q, C[1] + Math.sin(a) * q, 0]; };
  const rim = curves('rim', [{ pts: Array.from({ length: 10 }, (_, k) => corner(k)), closed: true }], { w: 1.25 });
  const F = [C[0], C[1], D], B = [C[0], C[1], -D];
  const front = curves('ridge', Array.from({ length: 10 }, (_, k) => [F, corner(k)]), { w: 0.75 });
  const back = curves('ridge', Array.from({ length: 5 }, (_, k) => [B, corner(2 * k)]), { w: 0.6 });
  const shape = assemble([rim, front, back], n);
  const pts = colour(shape, {}, (p) => mix(GOLD, ORANGE, (0.9 - p[1]) / 1.9));
  const along = pts.map((p) => Math.hypot(p[0] - C[0], p[1] - C[1]));
  return { pts, live: (b, j, t, o) => {
    o[3] = shape.tags[j] === 'ridge' ? glint(along[j], t, 2.8, 0.55, 0, 1) : wander(along[j], t, 4, 0.2, 0.15);
    yaw(o, t * 0.4, C[0], 0);
    pitch(o, 0.12, C[1], 0);
  } };
}

// ---------------------------------------------------------------- Galaxie ----------
// Zwei Spiralarme in einer Scheibe, die zum Publikum geneigt ist, um einen leuchtenden Kern; die Arme wölben sich leicht
// aus der Scheibe. Die Scheibe dreht sich langsam um ihre Achse, das Licht wandert die Arme hinaus.
const TILT = 0.62; // die Scheibe steht zum Publikum und ist um so viel nach hinten gekippt
const tip = (o) => { const y = o[1], z = o[2]; o[1] = y * Math.cos(TILT) - z * Math.sin(TILT); o[2] = y * Math.sin(TILT) + z * Math.cos(TILT); return o; };
export function galaxie(n) {
  const arm = (phase, off = 0, from = 0) => ({ pts: Array.from({ length: 70 - from }, (_, k) => {
    const u = (k + from) / 69, th = u * 2.5 * Math.PI, rr = 0.13 * Math.exp(2.05 * u) * (1 + off);
    return tip([Math.cos(th + phase) * rr, Math.sin(th + phase) * rr, 0.05 * Math.sin(th * 1.5)]);
  }) });
  const arms = curves('arm', [arm(0), arm(Math.PI)], { w: 1.1 });
  const outer = curves('dust', [arm(0.35, 0.1, 25), arm(Math.PI + 0.35, 0.1, 25)], { w: 0.55 });
  const core = ellipsoid('core', [0, 0, 0], [0.12, 0.12, 0.12], { lat: [0] });
  const shape = assemble([core, arms, outer], n);
  const radius = shape.pts.map((p) => Math.hypot(p[0], p[1], p[2]));
  const pts = colour(shape, { core: mix(GOLD, WARM, 0.5) }, (p) => { const u = Math.min(1, Math.hypot(p[0], p[1], p[2]) / 0.95); return u < 0.5 ? mix(GOLD, PINK, u * 2) : mix(PINK, mix(VIOLET, CYAN, 0.6), (u - 0.5) * 2); });
  const rank = rankBy(pts, (p) => Math.hypot(p[0], p[1], p[2]));
  return { pts, live: (b, j, t, o) => {
    if (shape.tags[j] !== 'core') { // um die Scheibenachse drehen: zurück in die Scheibe, drehen, wieder kippen
      const y = o[1] * Math.cos(TILT) + o[2] * Math.sin(TILT), z = -o[1] * Math.sin(TILT) + o[2] * Math.cos(TILT), w = t * 0.2;
      o[1] = y; o[2] = z; roll(o, w); tip(o);
    }
    o[3] = shape.tags[j] === 'core' ? 1.25 : wander(rank[j], t, 5, 0.45, 0.1) * (1.05 - 0.3 * Math.min(1, radius[j]));
    yaw(o, 0.3 * Math.sin((t * TAU) / 14));
  } };
}

// ---------------------------------------------------------------- Sonne ----------
// Ein Kugelkern aus Breitenkreisen und zwei Meridianen, ringsum ein Strahlenkranz, dessen Strahlen abwechselnd nach
// vorn und nach hinten aus der Bildebene stehen (eine Krone, kein flacher Kranz). Der Kranz dreht sich langsam, Licht
// läuft die Strahlen hinaus.
export function sonne(n) {
  const R = 0.42, K = 16;
  const core = ellipsoid('core', [0, 0], [R, R, R], { lat: [-0.55, 0, 0.55], mer: [0.7, -0.7] });
  const rays = curves('ray', Array.from({ length: K }, (_, k) => { const a = (k / K) * TAU + 0.1, tilt = (k % 2 ? 1 : -1) * 0.42, L = k % 2 ? 0.86 : 0.98, d = [Math.cos(a) * Math.cos(tilt), Math.sin(a) * Math.cos(tilt), Math.sin(tilt)], w = [-Math.sin(a) * 0.05, Math.cos(a) * 0.05, 0];
    return { pts: [[d[0] * 0.52 + w[0], d[1] * 0.52 + w[1], d[2] * 0.52], [d[0] * L, d[1] * L, d[2] * L], [d[0] * 0.52 - w[0], d[1] * 0.52 - w[1], d[2] * 0.52]] }; }), { w: 1 });
  const shape = assemble([core, rays], n);
  const dist = shape.pts.map((p) => Math.hypot(p[0], p[1], p[2]));
  const pts = colour(shape, { core: (p) => mix(GOLD, WARM, 0.25 + 0.3 * p[1]) }, (p) => mix(GOLD, ORANGE, (Math.hypot(p[0], p[1], p[2]) - 0.5) / 0.48));
  return { pts, live: (b, j, t, o) => {
    if (shape.tags[j] === 'ray') { roll(o, t * 0.18); o[3] = chase(dist[j], t, 0.5, 0.5, 0.8, 1.4); }
    else o[3] = breathe(t, 3.2);
    yaw(o, 0.35 * Math.sin((t * TAU) / 13));
  } };
}
