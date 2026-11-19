// 3D-Fassungen der Technik- und Fahrzeugmotive (Runde 7, docs/katalog-3d.md): kleiner Roboter, Zahnräder,
// Drehzahlmesser, Sportwagen, Hubschrauber. Gleiche Methode wie die Figuren: Maße aus der Katalogformation, Skelett statt
// Punktwolke, ein Teil tut, was das Ding tut (Räder, Rotor, Nadel, Zahnräder), der ganze Körper schwenkt. Fahrzeuge sind
// Kastenkörper: die Seitenkontur auf beiden Seiten, Querkanten an den markanten Stellen, Räder als kurze Zylinder.
// Bei wenigen Drohnen bleibt das Wesentliche (eine Kontur, Achsen, Naben); die zweite Seite, Kanten und Zierlinien
// kommen dazu, wenn die Drohnen dafür reichen (ab etwa 330, voll ab 400).
import { GOLD, WARM, ORANGE, RED, VIOLET, CYAN, BLUE, DIAMOND, mix, yaw, roll, pitch, glint, breathe, chase, wander } from '../../show-motion.js';
import { ellipsoid, revolve, tube, curves, spot, assemble, colour, ease, turn, rankBy, TAU } from './kit.js';

/** Kreis um c mit Radius r in der Ebene mit den Achsen u, v (Standard: Bildebene). */
const circle = (c, r, k = 40, u = [1, 0, 0], v = [0, 1, 0]) => ({ pts: Array.from({ length: k }, (_, i) => { const a = (i / k) * TAU; return [0, 1, 2].map((d) => (c[d] || 0) + (u[d] * Math.cos(a) + v[d] * Math.sin(a)) * r); }), closed: true });
/** Bogen in der Bildebene von a0 bis a1 (rad) um c bei Tiefe z. */
const arc = (c, r, a0, a1, z = 0, k = 24) => ({ pts: Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z]; }) });
/** Polygon in der Bildebene → geschlossene Linie bei Tiefe z (Breite je Ecke als dritter Wert erlaubt: z * w). */
const outline = (poly, z) => ({ pts: poly.map(([x, y, w = 1]) => [x, y, z * w]), closed: true });
/** Punkt in Polygon (Bildebene). */
function inPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Kastenkörper: Seitenkontur poly ([x, y, Breitenfaktor]) bei ±half, Querkanten an den Ecken edges. */
function box(tag, poly, half, edges, { both = true, w = 1 } = {}) {
  const lines = [outline(poly, half)];
  if (both) lines.push(outline(poly, -half));
  for (const i of edges) { const [x, y, f = 1] = poly[i]; lines.push({ pts: [[x, y, -half * f], [x, y, half * f]] }); }
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return { tag, lines, w, solid: true, inside: (p, s = 1) => Math.abs(p[2] || 0) < half * s && inPoly([cx + (p[0] - cx) / s, cy + (p[1] - cy) / s], poly) };
}
/** Rad als kurzer Zylinder um die Querachse: zwei Felgenringe, Nabe, Speichen (drehen sich mit). */
function wheel(tag, c, r, z0, z1, { spokes = 0, treads = 0 } = {}) {
  const lines = [circle([c[0], c[1], z1], r, 36)];
  if (z0 !== z1) lines.push(circle([c[0], c[1], z0], r, 36));
  for (let k = 0; k < treads; k++) { const a = (k / treads) * TAU + 0.4; lines.push({ pts: [[c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z0], [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z1]] }); }
  for (let k = 0; k < spokes; k++) { const a = (k / spokes) * TAU + 0.3; lines.push({ pts: [[c[0] + Math.cos(a) * r * 0.3, c[1] + Math.sin(a) * r * 0.3, z1], [c[0] + Math.cos(a) * r * 0.86, c[1] + Math.sin(a) * r * 0.86, z1]] }); }
  return curves(tag, lines);
}

// ---------------------------------------------------------------- Kleiner Roboter ----------
// Von vorn wie im Katalog: Kuppelkopf mit zwei Augen, darunter ein breiter Kinnkasten mit Gitter (die waagerechten
// Linien der 2D-Formation), ein runder Bauch, Greifarme mit Zangen, Antenne mit Licht und zwei Laufrollen als kurze
// Zylinder. Kopf, Kasten und Bauch sind Rotationskörper; ihre Reifen zeigen im Schwenk den Querschnitt. Die Arme
// schwingen abwechselnd, die Zangen schnappen, die Augen zwinkern.
const BOT = { x: -0.04 };
const SHOULDERS = [[-1, [BOT.x - 0.43, -0.2]], [1, [BOT.x + 0.43, -0.2]]];
export function roboter(n) {
  const rich = n >= 350, mer = 2;
  const head = revolve('bot', [BOT.x, 0], [[0.32, 0.26], [0.31, 0.42], [0.25, 0.56], [0.14, 0.67], [0, 0.72]], { meridians: mer, rings: rich ? [0.6] : [], phase: 0 });
  const jaw = revolve('jaw', [BOT.x, 0], [[0.4, 0.04], [0.4, 0.25]], { meridians: mer, rings: [0.04, 0.25], phase: 0 });
  const belly = revolve('bot', [BOT.x, 0], [[0.28, -0.47], [0.4, -0.38], [0.44, -0.2], [0.4, -0.02], [0.36, 0.04]], { meridians: mer, rings: rich ? [-0.47, -0.22] : [-0.47], phase: 0 });
  const onHead = (x, y, lift = 0.015) => { const r = head.rAt(y); return [x, y, Math.sqrt(Math.max(0, r * r - (x - BOT.x) ** 2)) + lift]; };
  const onJaw = (x, y) => [x, y, Math.sqrt(Math.max(0, 0.4 * 0.4 - (x - BOT.x) ** 2)) + 0.012];
  const eyes = [-0.13, 0.13].map((dx) => spot('eye', onHead(BOT.x + dx, 0.44), rich ? 6 : 4, 0.055));
  const grille = curves('grille', (rich ? [-0.18, -0.09, 0, 0.09, 0.18] : [-0.12, 0, 0.12]).map((dx) => [onJaw(BOT.x + dx, 0.2), onJaw(BOT.x + dx, 0.09)]), { w: 1 });
  const antenna = curves('mast', [[[BOT.x, 0.72, 0], [BOT.x, 0.84, 0]]], { w: 0.8 });
  const bulb = spot('bulb', [BOT.x, 0.89, 0], rich ? 5 : 3, 0.04);
  // Arme: Oberarm schräg hinaus und nach vorn, Unterarm nach oben, Zange aus zwei gebogenen Fingern
  const arm = (s, [sx, sy]) => {
    const elbow = [sx + s * 0.3, -0.28, 0.1], wrist = [sx + s * 0.4, -0.02, 0.14];
    const finger = (d) => [wrist, [wrist[0] + d * 0.07, 0.04, 0.16], [wrist[0] + d * 0.1, 0.11, 0.17], [wrist[0] + d * 0.08, 0.18, 0.18]];
    return [
      curves(`arm${s}`, [[[sx, sy, 0], elbow, wrist]], { w: 1.1 }),
      curves(`claw${s}`, [finger(-1), finger(1)], { w: 1.2 }),
      spot(`joint${s}`, elbow, 3, 0.03),
    ];
  };
  const WH = [[-0.36, -0.7], [0.24, -0.7]];
  const rollers = WH.map(([x, y]) => wheel('roller', [x, y], 0.17, rich ? -0.12 : 0, rich ? 0.12 : 0.04, { treads: rich ? 6 : 0 }));
  const hubs = WH.map(([x, y]) => spot('hub', [x, y, rich ? 0.13 : 0.05], rich ? 4 : 3, 0.04));
  const parts = [head, jaw, belly, ...eyes, grille, antenna, bulb, ...SHOULDERS.flatMap(([s, p]) => arm(s, p)), ...rollers, ...hubs];
  const shape = assemble(parts, n);
  const metal = (p) => mix(DIAMOND, CYAN, 0.2 + 0.3 * (0.75 - p[1]) / 1.2);
  const pts = colour(shape, { jaw: CYAN, eye: GOLD, grille: mix(CYAN, WARM, 0.45), mast: WARM, bulb: ORANGE, roller: mix(WARM, BLUE, 0.45), hub: GOLD, 'joint-1': GOLD, joint1: GOLD, 'claw-1': WARM, claw1: WARM }, metal);
  const rank = rankBy(pts, (p) => -p[1] + 0.3 * p[0]);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j], s = tag.endsWith('-1') ? -1 : tag.endsWith('1') ? 1 : 0;
    if (s) {
      const sh = SHOULDERS[s > 0 ? 1 : 0][1], swing = 0.2 * Math.sin((t * TAU) / 3.2 + (s > 0 ? Math.PI : 0));
      if (tag.startsWith('claw')) { const w = [sh[0] + s * 0.4, -0.02], d = Math.sign(b[0] - w[0]); roll(o, d * 0.18 * ease(t, 1.6), w[0], w[1]); } // Zange schnappt
      roll(o, -s * swing, sh[0], sh[1]);
    }
    o[3] = tag === 'eye' ? (Math.sin((t * TAU) / 5.2) > 0.97 ? 0.35 : 1.2) : tag === 'bulb' ? breathe(t, 1.4) + 0.15 : tag === 'jaw' ? glint(b[0], t, 3.6, 0.35, -0.5, 0.5) : tag === 'bot' ? wander(rank[j], t, 6, 0.25, 0.1) : 1;
    turn(o, t, 0.34, 0.4, 13, BOT.x, 0);
  } };
}

// ---------------------------------------------------------------- Zahnräder ----------
// Drei Zahnräder, die ineinandergreifen (Zähnezahl im Verhältnis der Radien, sie drehen sich passend gegeneinander):
// das große oben rechts wie im Katalog, darunter ein mittleres, links ein kleines. Jedes Rad ist eine Scheibe mit
// Stärke: Zahnkontur vorn und hinten, Kanten an den Zahnköpfen, Nabe als Achse, die zum Publikum heraussteht.
const GEARS = [
  { c: [0.36, 0.2], pitch: 0.53, teeth: 10, w: 1, tag: 'gear0' },
  { c: [-0.29, -0.5], pitch: 0.37, teeth: 7, w: -10 / 7, tag: 'gear1' },
  { c: [-0.93, -0.06], pitch: 0.27, teeth: 5, w: 10 / 5, tag: 'gear2' },
];
const GEAR_W = 0.32; // Winkelgeschwindigkeit des großen Rads (rad/s)
function gearOutline({ c, pitch, teeth }, phase, k = 6) {
  const tip = pitch + 0.07, root = pitch - 0.07, pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = phase + (i / teeth) * TAU, d = TAU / teeth;
    // Zahn: Fuß, Flanke hinauf, Kopf, Flanke hinab (leicht trapezförmig)
    const prof = [[0, root], [0.12, root], [0.22, tip], [0.48, tip], [0.58, root]];
    for (const [u, r] of prof) pts.push([c[0] + Math.cos(a + u * d) * r, c[1] + Math.sin(a + u * d) * r]);
    for (let m = 1; m < k / 2; m++) { const u = 0.58 + (0.42 * m) / (k / 2); pts.push([c[0] + Math.cos(a + u * d) * root, c[1] + Math.sin(a + u * d) * root]); }
  }
  return pts;
}
export function zahnraeder(n) {
  const rich = n >= 330, thick = rich ? 0.08 : 0;
  const parts = [];
  GEARS.forEach((g, gi) => {
    if (gi === 2 && n < 260) return;
    // Phasen so, dass Zahn in Lücke greift (am Berührpunkt der Teilkreise)
    const dir = gi === 0 ? 0 : Math.atan2(GEARS[gi - 1].c[1] - g.c[1], GEARS[gi - 1].c[0] - g.c[0]);
    const phase = gi === 0 ? 0.15 : dir + Math.PI / g.teeth - 0.35 * (TAU / g.teeth);
    const poly = gearOutline(g, phase);
    // Stärke ohne doppelte Zahnkontur: vorn die Zähne, hinten nur ein glatter Kreis am Zahnfuß. So liest sich die Scheibe
    // im Schwenk als Körper und nicht als zweite Ebene (Kanten an jedem Zahnkopf machten die Zähne unscharf).
    const lines = [outline(poly, thick)];
    if (thick) {
      lines.push(circle([g.c[0], g.c[1], -thick], g.pitch - 0.07, 48));
    }
    // Speichenkranz: innerer Ring und Speichen (große Räder, genug Drohnen)
    if (rich && gi < 2) {
      lines.push(circle([g.c[0], g.c[1], thick], g.pitch * 0.66, 40));
      for (let k = 0; k < (gi ? 4 : 5); k++) { const a = phase + (k / (gi ? 4 : 5)) * TAU + 0.2; lines.push({ pts: [[g.c[0] + Math.cos(a) * g.pitch * 0.3, g.c[1] + Math.sin(a) * g.pitch * 0.3, thick], [g.c[0] + Math.cos(a) * g.pitch * 0.64, g.c[1] + Math.sin(a) * g.pitch * 0.64, thick]] }); }
    }
    parts.push(curves(g.tag, lines, { w: 1 }));
    // Nabe: Ring vorn, die Achse steht als zweiter Ring zum Publikum heraus
    const hub = g.pitch * 0.24;
    parts.push(curves(`hub${gi}`, [circle([g.c[0], g.c[1], thick + 0.01], hub, 22), ...(rich ? [circle([g.c[0], g.c[1], thick + 0.15], hub, 22)] : [])], { w: 1 }));
  });
  const shape = assemble(parts, n);
  const hue = [mix(WARM, VIOLET, 0.32), mix(WARM, CYAN, 0.35), mix(GOLD, WARM, 0.35)];
  const pts = colour(shape, { gear0: hue[0], gear1: hue[1], gear2: hue[2], hub0: GOLD, hub1: GOLD, hub2: ORANGE }, WARM);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j], gi = +tag.slice(-1), g = GEARS[gi];
    roll(o, -GEAR_W * g.w * t, g.c[0], g.c[1]);
    o[3] = tag.startsWith('hub') ? breathe(t, 3, gi * 0.6) : glint(Math.atan2(b[1] - g.c[1], b[0] - g.c[0]), t, 4.5, 0.3, -Math.PI, Math.PI);
    turn(o, t, -0.36, 0.42, 14, -0.1, 0);
  } };
}

// ---------------------------------------------------------------- Drehzahlmesser ----------
// Ein Rundinstrument: Gehäuse als kurzer Zylinder (Ring vorn, Ring hinten, Kanten), Skala mit Strichen über 270°, die
// letzten im roten Bereich, Nadel als schmales Dreieck vor dem Zifferblatt um eine Nabe, unten eine Digitalanzeige.
// Die Nadel dreht hoch in den roten Bereich und wieder zurück.
const DIAL = { r: 0.96, a0: (225 * Math.PI) / 180, a1: (-45 * Math.PI) / 180 };
const NEEDLE_REST = (158 * Math.PI) / 180, NEEDLE_PEAK = (12 * Math.PI) / 180;
export function drehzahl(n) {
  const rich = n >= 330;
  const R = DIAL.r, depth = rich ? 0.16 : 0;
  const rim = curves('rim', [circle([0, 0, 0.05], R, 64), ...(rich ? [circle([0, 0, -depth], R * 0.97, 56), ...Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * TAU + 0.2; return [[Math.cos(a) * R, Math.sin(a) * R, 0.05], [Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97, -depth]]; })] : [])], { w: 1 });
  const ticks = [], red = [];
  const T = rich ? 13 : 10;
  for (let k = 0; k < T; k++) {
    const a = DIAL.a0 + ((DIAL.a1 - DIAL.a0) * k) / (T - 1), long = k % 2 === 0 || !rich, r0 = long ? 0.68 : 0.76;
    (k >= T - 3 ? red : ticks).push([[Math.cos(a) * r0, Math.sin(a) * r0, 0.01], [Math.cos(a) * 0.86, Math.sin(a) * 0.86, 0.01]]);
  }
  const scale = curves('tick', ticks, { w: 1.1 }), zone = curves('redline', [...red, ...(rich ? [arc([0, 0], 0.89, DIAL.a0 + (DIAL.a1 - DIAL.a0) * (1 - 2.5 / (T - 1)), DIAL.a1, 0.01, 14)] : [])], { w: 1.2 });
  // Nadel: schmales Dreieck von der Nabe zur Spitze, kurzes Gegenstück; liegt vor dem Zifferblatt
  const needle = curves('needle', [{ pts: [[0.74, 0, 0.09], [0, 0.045, 0.09], [-0.18, 0, 0.09], [0, -0.045, 0.09]], closed: true }], { w: 1.2 });
  const cap = ellipsoid('cap', [0, 0, 0.1], [0.075, 0.075, 0.05], { lat: [] });
  const readout = curves('readout', [outline([[-0.26, -0.42], [0.26, -0.42], [0.26, -0.6], [-0.26, -0.6]], 0.01)], { w: 0.9 });
  const digits = curves('digit', [-0.15, 0, 0.15].map((x) => [[x - 0.04, -0.51, 0.015], [x + 0.04, -0.51, 0.015]]), { w: 1 });
  const shape = assemble([rim, scale, zone, needle, cap, readout, digits], n);
  const pts = colour(shape, { rim: mix(WARM, CYAN, 0.2), tick: WARM, redline: RED, needle: mix(RED, ORANGE, 0.35), cap: GOLD, readout: mix(CYAN, WARM, 0.35), digit: CYAN }, WARM);
  const ang = pts.map((p) => Math.atan2(p[1], p[0]));
  const needleAt = (t) => NEEDLE_REST + (NEEDLE_PEAK - NEEDLE_REST) * ease(t, 6.5);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j], a = needleAt(t);
    if (tag === 'needle') roll(o, a);
    if (tag === 'redline') o[3] = 0.85 + 0.55 * Math.max(0, Math.cos(a - ang[j]) ** 8);
    else if (tag === 'tick') o[3] = 0.8 + 0.5 * Math.max(0, Math.cos(a - ang[j]) ** 12);
    else if (tag === 'digit') o[3] = 0.7 + 0.5 * ease(t, 6.5);
    else if (tag === 'rim') o[3] = glint(ang[j], t, 6, 0.3, -Math.PI, Math.PI);
    turn(o, t, 0.36, 0.42, 14);
    pitch(o, 0.1);
  } };
}

// ---------------------------------------------------------------- Sportwagen ----------
// Seitenansicht mit der Nase links wie im Katalog: flache Karosserie als Kastenkörper (Seitenkontur auf beiden Seiten,
// das Dach schmaler als der Unterbau), Querkanten an Nase, Scheibe, Dach und Heck, Seitenfenster, vier Räder in den
// Radhäusern, Scheinwerfer vorn, Rücklichter hinten, Fahrtwind dahinter. Die Räder drehen, der Wagen federt leicht.
const WHEELS_X = [-0.72, 0.12], WHEEL_Y = -0.24, WHEEL_R = 0.13, CAR_HALF = 0.28;
const archPts = (cx, from, to) => Array.from({ length: 9 }, (_, i) => { const a = from + ((to - from) * i) / 8; return [cx + Math.cos(a) * 0.165, WHEEL_Y + Math.sin(a) * 0.165]; });
const CAR = [
  [0.4, -0.27], ...archPts(WHEELS_X[1], 0, Math.PI), [-0.57, -0.27], ...archPts(WHEELS_X[0], 0, Math.PI), [-1.0, -0.26], [-1.03, -0.2, 0.86], [-0.97, -0.13, 0.92],
  [-0.62, -0.08], [-0.45, -0.05, 0.92], [-0.22, 0.05, 0.72], [0.0, 0.06, 0.72], [0.22, -0.03, 0.86], [0.38, -0.04], [0.41, -0.12], [0.41, -0.2],
];
const CAR_EDGE = { noseTop: 21, noseLow: 20, shield: 24, roofF: 25, roofB: 26, deck: 27, tail: 29 };
export function sportwagen(n) {
  const rich = n >= 330, edges = rich ? Object.values(CAR_EDGE) : [CAR_EDGE.noseTop, CAR_EDGE.roofF, CAR_EDGE.roofB, CAR_EDGE.tail];
  const body = box('car', CAR, CAR_HALF, edges, { both: true });
  const winPoly = [[-0.4, -0.065, 0.88], [-0.2, 0.025, 0.74], [0.0, 0.035, 0.74], [0.18, -0.045, 0.84]];
  const windows = curves('window', [outline(winPoly, CAR_HALF * 1.0), ...(rich ? [outline(winPoly, -CAR_HALF)] : []), [[-0.06, 0.035, CAR_HALF * 0.74], [-0.08, -0.065, CAR_HALF * 0.86]]], { w: 0.9 });
  const tyre = (x, z) => curves(`wheel${x < 0 ? 0 : 1}`, [circle([x, WHEEL_Y, z], WHEEL_R, 36), ...(rich ? [circle([x, WHEEL_Y, z], WHEEL_R * 0.5, 16)] : []), ...Array.from({ length: rich ? 5 : 3 }, (_, k) => { const a = (k / (rich ? 5 : 3)) * TAU + 0.3; return [[x + Math.cos(a) * WHEEL_R * (rich ? 0.5 : 0.2), WHEEL_Y + Math.sin(a) * WHEEL_R * (rich ? 0.5 : 0.2), z], [x + Math.cos(a) * WHEEL_R * 0.85, WHEEL_Y + Math.sin(a) * WHEEL_R * 0.85, z]]; })]);
  const wheels = WHEELS_X.flatMap((x) => [tyre(x, CAR_HALF + 0.02), ...(rich || n >= 260 ? [tyre(x, -CAR_HALF - 0.02)] : [])]);
  const lights = [1, -1].flatMap((s) => [spot('head', [-1.02, -0.17, s * 0.18], rich ? 4 : 3, 0.03, [-1, 0, 0]), spot('tail', [0.42, -0.13, s * 0.2], 3, 0.025, [1, 0, 0])]);
  const wind = curves('wind', [[-0.02, 0.0, 0.62], [0.08, 0.1, 0.5], [-0.12, -0.18, 0.7]].slice(0, rich ? 3 : 2).map(([y, z, L]) => Array.from({ length: 10 }, (_, i) => [0.58 + (L * i) / 9, y + 0.02 * Math.sin(i), z])), { w: 0.8 });
  const shape = assemble([body, windows, ...wheels, ...lights, wind], n);
  const pts = colour(shape, { window: mix(CYAN, WARM, 0.35), wheel0: WARM, wheel1: WARM, head: GOLD, tail: RED, wind: mix(WARM, BLUE, 0.4) }, (p) => mix(RED, ORANGE, 0.1 + 0.25 * Math.max(0, p[1] + 0.1)));
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (tag === 'wheel0' || tag === 'wheel1') roll(o, t * 2.6, WHEELS_X[tag === 'wheel0' ? 0 : 1], WHEEL_Y); // Räder drehen (vorwärts nach links)
    else o[1] += 0.008 * Math.sin((t * TAU) / 1.3); // federt
    o[3] = tag === 'wind' ? chase(-b[0], t, 0.6, 0.45, 0.25, 1.1) : tag === 'head' ? 1.3 : tag === 'car' ? glint(b[0], t, 4.2, 0.3, -1.1, 0.5) : 1;
    turn(o, t, -0.38, 0.28, 14, -0.3, 0);
    pitch(o, 0.16);
  } };
}

// ---------------------------------------------------------------- Hubschrauber ----------
// Seitenansicht mit der Kanzel links wie im Katalog: Rumpf als Ellipsoid mit Querschnitt-Reifen, Kanzelscheibe auf beiden
// Seiten, Heckausleger als Röhre, Seitenleitwerk, Heckrotor, Kufen mit gebogenen Bügeln in der Tiefe. Der Hauptrotor
// liegt waagerecht über dem Rumpf (im 2D-Bild ein Strich) und dreht sich; im Schwenk zeigt er seine Fläche.
const MAST = [-0.47, 0.32];
const TAIL_ROTOR = [0.88, 0.2, 0.05];
export function hubschrauber(n) {
  const rich = n >= 330;
  const cab = { c: [-0.58, -0.01], r: [0.43, 0.2, 0.19] };
  const fuselage = ellipsoid('heli', cab.c, cab.r, { lat: rich ? [0] : [] });
  const girth = curves('heli', (rich ? [-0.8, -0.4] : [-0.58]).map((x) => { const k = Math.sqrt(1 - ((x - cab.c[0]) / cab.r[0]) ** 2); return circle([x, cab.c[1], 0], 1, 30, [0, 0, cab.r[2] * k], [0, cab.r[1] * k, 0]); }), { w: 0.8 });
  // Kanzelscheibe auf der Vorderfläche, gespiegelt auf die abgewandte Seite
  const winXY = [[-0.97, -0.06], [-0.9, 0.06], [-0.78, 0.15], [-0.64, 0.17], [-0.6, 0.04], [-0.66, -0.06]];
  const pane = (s) => ({ pts: winXY.map(([x, y]) => { const f = fuselage.front(x, y, 0.01); return [f[0], f[1], s * f[2]]; }), closed: true });
  const windows = curves('window', rich ? [pane(1), pane(-1)] : [pane(1)], { w: 1 });
  const boom = tube('heli', [[-0.22, 0.02, 0], [0.7, 0.05, 0]], (s) => 0.075 - 0.04 * s, { depth: 1, hoops: 0, crest: false, caps: [false, false] });
  const fin = curves('fin', [{ pts: [[0.62, 0.02, 0], [0.92, 0.38, 0], [0.99, 0.36, 0], [0.9, 0.0, 0], [0.74, -0.03, 0]], closed: true }], { w: 1 });
  const stab = rich ? [curves('fin', [[[0.62, 0.04, -0.17], [0.7, 0.05, 0], [0.62, 0.04, 0.17]]], { w: 0.8 })] : [];
  const mast = curves('mast', [[[MAST[0], 0.18, 0], [MAST[0], MAST[1], 0]]], { w: 0.8 });
  const hubs = [spot('hub', [MAST[0], MAST[1], 0], rich ? 5 : 3, 0.035, [0, 1, 0])];
  const BL = 0.62, blades = curves('rotor', [0, 1, 2, 3].map((k) => { const a = (k / 4) * TAU + 0.35; return Array.from({ length: 12 }, (_, i) => { const u = 0.07 + ((BL - 0.07) * i) / 11; return [MAST[0] + Math.cos(a) * u, MAST[1] - 0.02 * (u / BL) ** 2, Math.sin(a) * u]; }); }), { w: 0.9 });
  const tailBlades = curves('trotor', [0, 1].map((k) => { const a = (k / 2) * TAU + 0.5; return [[TAIL_ROTOR[0] + Math.cos(a) * 0.02, TAIL_ROTOR[1] + Math.sin(a) * 0.02, TAIL_ROTOR[2]], [TAIL_ROTOR[0] + Math.cos(a) * 0.15, TAIL_ROTOR[1] + Math.sin(a) * 0.15, TAIL_ROTOR[2]]]; }), { w: 1 });
  const skidZ = rich ? 0.17 : 0;
  const skid = (z) => [[-0.94, -0.3, z], [-0.9, -0.36, z], [-0.82, -0.38, z], [-0.32, -0.38, z]];
  const skids = curves('skid', [skid(skidZ), ...(rich ? [skid(-skidZ)] : [])], { w: 1 });
  const bow = (x) => (rich ? Array.from({ length: 9 }, (_, i) => { const u = -1 + i / 4; return [x, -0.38 + 0.2 * (1 - u * u) ** 0.6, skidZ * u]; }) : [[x, -0.38, 0], [x, -0.19, 0]]);
  const bows = curves('skid', [bow(-0.76), bow(-0.42)], { w: 0.9 });
  const beacon = spot('beacon', [0.96, 0.4, 0], 3, 0.02);
  const shape = assemble([fuselage, girth, windows, boom, fin, ...stab, mast, ...hubs, blades, tailBlades, skids, bows, beacon], n);
  const pts = colour(shape, { window: CYAN, rotor: DIAMOND, trotor: DIAMOND, hub: RED, mast: WARM, skid: mix(WARM, BLUE, 0.35), fin: mix(WARM, CYAN, 0.2), beacon: RED }, (p) => mix(WARM, CYAN, 0.12 + 0.15 * (0.2 - p[1])));
  const rank = rankBy(pts, (p) => p[0]);
  return { pts, live: (b, j, t, o) => {
    const tag = shape.tags[j];
    if (tag === 'rotor') { yaw(o, t * 1.5, MAST[0], 0); o[3] = 0.8 + 0.5 * Math.min(1, Math.hypot(b[0] - MAST[0], b[2]) / 0.62); }
    else if (tag === 'trotor') { roll(o, t * 2.4, TAIL_ROTOR[0], TAIL_ROTOR[1]); }
    else if (tag === 'beacon') o[3] = Math.sin((t * TAU) / 1.5) > 0.6 ? 1.4 : 0.4;
    else if (tag === 'heli') o[3] = wander(rank[j], t, 6, 0.22, 0.12);
    o[1] += 0.035 * Math.sin((t * TAU) / 4); // schwebt
    roll(o, 0.04 * Math.sin((t * TAU) / 8), -0.4, 0); // Nase nickt leicht
    turn(o, t, -0.4, 0.36, 14, -0.25, 0);
    pitch(o, 0.14);
  } };
}
