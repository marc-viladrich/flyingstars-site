// 3D-Fassungen zweier Hochzeitsmotive (Runde 7, docs/katalog-3d.md): anstoßende Gläser und verschlungene Eheringe.
// Gleiche Methode wie die übrigen Fassungen: Maße aus der Katalogformation, Skelett statt Punktwolke, ein Teil bewegt
// sich, der ganze Körper schwenkt.
import { GOLD, WARM, DIAMOND, CYAN, mix, roll, pitch, glint, breathe, chase, sparkle } from '../../show-motion.js';
import { revolve, tube, curves, spot, assemble, colour, ease, turn, posePart, poseLine, isPlus, TAU } from './kit.js';

// ---------------------------------------------------------------- Anstoßende Gläser ----------
// Zwei Weingläser wie im Katalog, schräg zueinander, die Kelche berühren sich oben in der Mitte. Jedes Glas ist ein
// Rotationskörper (Fuß, Stiel, Kelch, Rand), im eigenen Rahmen gebaut und schräg gestellt; darin der Wein als
// Oberfläche, Perlen steigen auf. Die Gläser neigen sich zum Anstoßen zueinander, an der Berührstelle blitzt Licht.
// Runde 9: 3D zeigt die beiden Gläser schlicht (Umriss, Fuß und Rand), sie stoßen an (Marc: „Anstoßen kann ruhig in 3D
// rein“); 3D+ füllt sie mit Wein und Perlen, mehr Profillinien, und beim Anstoßen blitzt Licht an der Berührstelle.
const GLASS = [[0.2, 0], [0.19, 0.03], [0.035, 0.07], [0.03, 0.5], [0.1, 0.56], [0.18, 0.64], [0.235, 0.77], [0.255, 0.9], [0.245, 1.04], [0.21, 1.17], [0.18, 1.27]];
const GLASSES = [{ c: [-0.7, -0.92], r: -0.48, side: -1 }, { c: [0.56, -0.92], r: 0.2, side: 1 }];
const TOUCH = [0.1, 0.5];
export function anstossen(n, stufe) {
  const rich = isPlus(stufe, n), parts = [];
  for (const g of GLASSES) {
    const tag = g.side < 0 ? 'L' : 'R';
    parts.push(posePart(revolve(`glass${tag}`, [0, 0], GLASS, { meridians: rich ? 4 : 2, rings: rich ? [0, 0.9, 1.27] : [0, 1.27], phase: 0 }), g.r, g.c));
    // Wein: Oberfläche im Kelch, darunter zwei Perlenketten
    const surf = { pts: Array.from({ length: 30 }, (_, i) => { const a = (i / 30) * TAU; return [Math.cos(a) * 0.235, 0.8, Math.sin(a) * 0.235]; }), closed: true };
    if (rich) parts.push(curves(`wine${tag}`, [poseLine(surf, g.r, g.c)], { w: 1.2 }));
    if (rich) parts.push(curves(`pearl${tag}`, [[-0.06, 0.03], [0.07, -0.04]].map(([x, z]) => poseLine({ pts: [[x, 0.6, z], [x * 1.5, 0.76, z * 1.5]] }, g.r, g.c)), { w: 0.7 }));
  }
  const shape = assemble(parts, n);
  const pts = colour(shape, { wineL: GOLD, wineR: GOLD, pearlL: mix(GOLD, WARM, 0.5), pearlR: mix(GOLD, WARM, 0.5) }, (p) => mix(WARM, CYAN, 0.18));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j], side = tag.endsWith('L') ? -1 : tag.endsWith('R') ? 1 : 0;
    const clink = ease(t, 3.2) ** 2; // neigen sich zum Anstoßen und wieder zurück (in beiden Stufen)
    // zueinander: in der Ruhelage ein Stück auseinander, auf dem Höhepunkt berühren sich die Kelche (bis Runde 9 lief die
    // Drehung mit falschem Vorzeichen, die Gläser neigten sich beim „Anstoßen“ voneinander weg)
    if (side) { const g = GLASSES[side < 0 ? 0 : 1]; roll(o, side * 0.11 * (clink - 0.5), g.c[0], g.c[1]); }
    if (!rich) { turn(o, t, 0.3, 0.3, 14, -0.05, 0); return; }
    if (tag.startsWith('pearl')) o[3] = chase(b[1], t, 0.25, 0.18, 0.4, 1.3);
    else if (tag.startsWith('wine')) o[3] = glint(b[0], t, 3.2, 0.4, -0.6, 0.6);
    else o[3] = 1 + 0.9 * clink ** 3 * Math.exp(-(((b[0] - TOUCH[0]) ** 2 + (b[1] - TOUCH[1]) ** 2) / 0.04)); // Klirren: Licht an der Berührstelle
    turn(o, t, 0.3, 0.38, 13, -0.05, 0);
  } };
}

// ---------------------------------------------------------------- Verschlungene Eheringe ----------
// Zwei Ringe wie im Katalog, ineinander verschlungen: jeder ein Torus (Röhre um einen Kreis, Innen- und Außenkante,
// Kamm vorn, Querschnitt-Reifen), der eine leicht vor-, der andere zurückgekippt, sodass sie durcheinander hindurch
// laufen. Auf dem linken sitzt ein Stein. Glanz läuft um die Ringe, der rechte wiegt sich ein wenig.
// Runde 9: 3D zeigt zwei schlichte Bänder (Innen- und Außenkante) im ruhigen Schwenk; 3D+ setzt den Kamm, den Stein mit
// funkelndem Licht und lässt Glanz um die Ringe laufen, während der rechte sich wiegt.
const RINGS = [{ c: [-0.3, -0.02], r: 0.5, tilt: -0.38, tag: 'ringA' }, { c: [0.34, 0.0], r: 0.52, tilt: 0.62, tag: 'ringB' }];
const ringPt = ({ c, r, tilt }, a, k = 1) => { const x = Math.cos(a) * r * k, y = Math.sin(a) * r * k; return [c[0] + x, c[1] + y * Math.cos(tilt), y * Math.sin(tilt)]; };
export function eheringe(n, stufe) {
  const rich = isPlus(stufe, n);
  const parts = RINGS.map((R) => {
    const axis = Array.from({ length: 65 }, (_, i) => ringPt(R, (i / 64) * TAU + 0.001));
    return tube(R.tag, axis, 0.065, { depth: 0.9, hoops: 0, crest: rich, caps: [false, false] });
  });
  // Stein oben auf dem linken Ring: Fassung als kleiner Ring, Spitze zum Publikum
  const top = ringPt(RINGS[0], Math.PI / 2, 1.13);
  const stone = curves('stone', [{ pts: Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return [top[0] + Math.cos(a) * 0.075, top[1] + 0.05, top[2] + Math.sin(a) * 0.075]; }), closed: true }, [[top[0] - 0.075, top[1] + 0.05, top[2]], [top[0], top[1] + 0.15, top[2]], [top[0] + 0.075, top[1] + 0.05, top[2]]]], { w: 1.2 });
  const shine = spot('shine', [top[0], top[1] + 0.07, top[2] + 0.02], rich ? 3 : 1, 0.02);
  const shape = assemble(rich ? [...parts, stone, shine] : parts, n);
  const ang = shape.pts.map((p, j) => { const R = RINGS[shape.tags[j] === 'ringB' ? 1 : 0]; return Math.atan2(p[1] - R.c[1], p[0] - R.c[0]); });
  const pts = colour(shape, { ringA: GOLD, ringB: mix(GOLD, WARM, 0.55), stone: DIAMOND, shine: WARM }, GOLD);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (!rich) { turn(o, t, -0.3, 0.34, 14); return; }
    if (tag === 'ringB') { pitch(o, 0.12 * Math.sin((t * TAU) / 6), RINGS[1].c[1], 0); o[3] = glint(ang[j], t, 5, 0.45, -Math.PI, Math.PI); }
    else if (tag === 'ringA') o[3] = glint(-ang[j], t, 5.6, 0.45, -Math.PI, Math.PI);
    else o[3] = tag === 'shine' ? 0.6 + 0.8 * breathe(t, 1.8) : 1.2 * sparkle(j, t, 0.85, 1.2);
    turn(o, t, -0.3, 0.42, 13);
    o[1] += 0.03 * Math.sin((t * TAU) / 6.5);
  } };
}
