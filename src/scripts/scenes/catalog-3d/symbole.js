// 3D-Fassungen flacher Zeichen (Formklasse Embleme und Zeichen, docs/katalog-3d.md): Aus dem Umriss wird ein Körper mit
// Graten (Stern) oder eine räumliche Anordnung (Galaxie als geneigte Scheibe). Der Umriss bleibt in der Bildebene, damit
// das Zeichen bei 0° so dasteht wie im Katalog.
import { GOLD, WARM, ORANGE, PINK, VIOLET, CYAN, mix, yaw, roll, pitch, glint, wander, chase, breathe } from '../../show-motion.js';
import { ellipsoid, curves, assemble, colour, isPlus, TAU } from './kit.js';

// ---------------------------------------------------------------- Stern ----------
// Ein geschliffener Stern: der Umriss mit fünf Zacken, vorn und hinten eine Spitze, von der Grate zu jeder Zacke und
// jedem Innenwinkel laufen. Er dreht sich ganz um seine senkrechte Achse; Licht läuft die Grate entlang.
// Runde 9: 3D zeigt den Umriss und fünf Grate vorn zu den Zacken im ruhigen Schwenk; 3D+ den geschliffenen Stern mit
// allen Graten vorn und hinten, der sich ganz dreht, und Licht auf den Graten.
export function stern(n, stufe) {
  const P = isPlus(stufe, n);
  const C = [0, -0.02], R = 0.93, r = 0.4, D = 0.32;
  const corner = (k) => { const a = Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r : R; return [C[0] + Math.cos(a) * q, C[1] + Math.sin(a) * q, 0]; };
  const rim = curves('rim', [{ pts: Array.from({ length: 10 }, (_, k) => corner(k)), closed: true }], { w: 1.25 });
  const F = [C[0], C[1], D], B = [C[0], C[1], -D];
  const front = curves('ridge', Array.from({ length: P ? 10 : 5 }, (_, k) => [F, corner(P ? k : 2 * k)]), { w: 0.75 });
  const back = curves('ridge', Array.from({ length: 5 }, (_, k) => [B, corner(2 * k)]), { w: 0.6 });
  const shape = assemble(P ? [rim, front, back] : [rim, front], n);
  const pts = colour(shape, {}, (p) => mix(GOLD, ORANGE, (0.9 - p[1]) / 1.9));
  const along = pts.map((p) => Math.hypot(p[0] - C[0], p[1] - C[1]));
  return { pts, live: (b, j, t, o) => {
    if (!P) { yaw(o, 0.42 * Math.sin((t * TAU) / 13) + 0.3, C[0], 0); pitch(o, 0.12, C[1], 0); return; }
    o[3] = shape.tags[j] === 'ridge' ? glint(along[j], t, 2.8, 0.55, 0, 1) : wander(along[j], t, 4, 0.2, 0.15);
    yaw(o, t * 0.4, C[0], 0);
    pitch(o, 0.12, C[1], 0);
  } };
}

// ---------------------------------------------------------------- Galaxie ----------
// Runde 9 (Marc: „sieht noch ziemlich janky aus“): neu gebaut. Zwei Hauptarme als logarithmische Spiralen mit festem
// Steigungswinkel, die erst ab einem Mindestradius beginnen (vorher liefen sie in der Mitte zu einem Knäuel zusammen),
// ein ruhiger Kern als kleiner Kugelumriss. Die Scheibe ist zum Publikum geneigt und dreht sich starr und langsam; das
// Licht ist ruhig (innen heller, außen gedämpft), ein einzelner Schimmer läuft die Arme hinaus. Kein Flackern.
// 3D: genau das. 3D+: dazu ein polarer Ring quer zur Scheibe, der um den Kern kreist, und das Licht strömt in Wellen
// vom Kern hinaus.
// Verworfen: Neben-, innere und Staubarme (laufen außen dicht neben den Hauptarmen, Doppellinien), ein Kern mit Querlinie
// (liest sich als „e“) und Sternhaufen auf den Armen (wirken wie Knoten).
const TILT = 0.55; // die Scheibe steht zum Publikum und ist um so viel nach hinten gekippt
const tip = (o) => { const y = o[1], z = o[2]; o[1] = y * Math.cos(TILT) - z * Math.sin(TILT); o[2] = y * Math.sin(TILT) + z * Math.cos(TILT); return o; };
const PITCH = 0.3; // Steigung der Spiralen (rad), etwa 17°: offen genug, dass die Arme sich nicht berühren
/** Arm: Radius von r0 bis r1 als logarithmische Spirale, Phase phase; Scheibe leicht gewölbt (Mitte etwas vorn). */
const spiralArm = (phase, r0, r1, k = 90) => ({ pts: Array.from({ length: k }, (_, i) => {
  const r = r0 * Math.exp((Math.log(r1 / r0) * i) / (k - 1)), th = Math.log(r / r0) / Math.tan(PITCH) + phase;
  return tip([Math.cos(th) * r, Math.sin(th) * r, 0.07 * (1 - r)]);
}) });
export function galaxie(n, stufe) {
  const P = isPlus(stufe, n);
  const arms = curves('arm', [spiralArm(0, 0.15, 0.98), spiralArm(Math.PI, 0.15, 0.98)], { w: 1.15 });
  // 3D+: ein polarer Ring quer zur Scheibe durch den Kern (dreht sich um die Scheibenachse), klar räumlich und ohne
  // Linie neben einem Arm
  const inner = P ? [curves('polar', [{ pts: Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU; return tip([Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36 + 0.06]); }), closed: true }], { w: 0.9 })] : [];
  // Kern: ein kleiner Kugelumriss (die Bildebene schneidet die Kugel immer als Kreis), keine Querlinie
  const core = ellipsoid('core', [0, 0, 0.06], [0.1, 0.1, 0.1], { lat: [] });
  const shape = assemble([core, arms, ...inner], n);
  const radius = shape.pts.map((p) => { const y = p[1] * Math.cos(TILT) + p[2] * Math.sin(TILT); return Math.hypot(p[0], y); });
  const pts = colour(shape, { core: mix(GOLD, WARM, 0.55), polar: mix(CYAN, WARM, 0.4) }, (p) => { const y = p[1] * Math.cos(TILT) + p[2] * Math.sin(TILT), u = Math.min(1, Math.hypot(p[0], y) / 0.98); return u < 0.45 ? mix(GOLD, PINK, u / 0.45) : mix(PINK, mix(VIOLET, CYAN, 0.55), (u - 0.45) / 0.55); });
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    // um die Scheibenachse drehen: zurück in die Scheibe, drehen, wieder kippen
    const y = o[1] * Math.cos(TILT) + o[2] * Math.sin(TILT), z = -o[1] * Math.sin(TILT) + o[2] * Math.cos(TILT);
    o[1] = y; o[2] = z; roll(o, t * 0.14); tip(o);
    const r = radius[j];
    o[3] = tag === 'core' ? 1.25 : P ? (1.05 - 0.4 * r) * chase(-r, t, 0.22, 0.45, 0.8, 1.35) : (1.1 - 0.45 * r) * glint(r, t, 7, 0.35, 0, 1.1);
    yaw(o, 0.32 * Math.sin((t * TAU) / 14));
  } };
}

// ---------------------------------------------------------------- Sonne ----------
// Ein Kugelkern aus Breitenkreisen und zwei Meridianen, ringsum ein Strahlenkranz, dessen Strahlen abwechselnd nach
// vorn und nach hinten aus der Bildebene stehen (eine Krone, kein flacher Kranz). Der Kranz dreht sich langsam, Licht
// läuft die Strahlen hinaus.
// Runde 9: 3D zeigt eine Kugel mit Äquator und zwölf flachen Strahlen im ruhigen Schwenk; 3D+ die Kugel mit drei
// Breitenkreisen und zwei Meridianen und die Krone aus sechzehn Strahlen vor und hinter der Bildebene, die sich dreht.
export function sonne(n, stufe) {
  const P = isPlus(stufe, n), R = 0.42, K = P ? 16 : 12;
  const core = ellipsoid('core', [0, 0], [R, R, R], P ? { lat: [-0.55, 0, 0.55], mer: [0.7, -0.7] } : { lat: [0] });
  const rays = curves('ray', Array.from({ length: K }, (_, k) => { const a = (k / K) * TAU + 0.1, tilt = P ? (k % 2 ? 1 : -1) * 0.42 : 0, L = k % 2 ? 0.86 : 0.98, d = [Math.cos(a) * Math.cos(tilt), Math.sin(a) * Math.cos(tilt), Math.sin(tilt)], w = [-Math.sin(a) * 0.05, Math.cos(a) * 0.05, 0];
    return { pts: [[d[0] * 0.52 + w[0], d[1] * 0.52 + w[1], d[2] * 0.52], [d[0] * L, d[1] * L, d[2] * L], [d[0] * 0.52 - w[0], d[1] * 0.52 - w[1], d[2] * 0.52]] }; }), { w: 1 });
  const shape = assemble([core, rays], n);
  const dist = shape.pts.map((p) => Math.hypot(p[0], p[1], p[2]));
  const pts = colour(shape, { core: (p) => mix(GOLD, WARM, 0.25 + 0.3 * p[1]) }, (p) => mix(GOLD, ORANGE, (Math.hypot(p[0], p[1], p[2]) - 0.5) / 0.48));
  return { pts, live: (b, j, t, o) => {
    if (!P) { yaw(o, 0.32 * Math.sin((t * TAU) / 13)); return; }
    if (shape.tags[j] === 'ray') { roll(o, t * 0.18); o[3] = chase(dist[j], t, 0.5, 0.5, 0.8, 1.4); }
    else o[3] = breathe(t, 3.2);
    yaw(o, 0.35 * Math.sin((t * TAU) / 13));
  } };
}
