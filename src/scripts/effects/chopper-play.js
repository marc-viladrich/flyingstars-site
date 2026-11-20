// Figuren der Chopper-Spielszene (Hochzeit, „Kinder und Hunde willkommen“), Runde 10: zwei Kinder und Chopper als Umriss.
// Marc, 20.11.2026: „Im Konfigurator hast du einen deutlich besseren Job gemacht, Menschen darzustellen. Random, dass da
// Punkte überall an den Kleidern sind, die Arme so dicht besiedelt und die Beine, insbesondere bei den Mädchen, so wenig
// besiedelt. Das Gesicht kann man nicht richtig erkennen; es muss deutlich cleaner und anthropomorpher sein.“
//
// Ursache: Die Kinder waren gefüllte SVG-Flächen, abgetastet wie ein Logo (Punkte auf der Fläche, Dichte je Teil nach
// fester Drohnenzahl statt nach Linienlänge). Jetzt nach der Methode der Katalogfiguren (scenes/catalog-3d/kit.js, wie
// Fußballer und Springer in der 2D-Fassung): nur Umrisslinien, Drohnen in gleichem Abstand entlang der Linien, Linien
// eines Teils, die in einem anderen liegen, fallen weg (ein Körper statt übereinanderliegender Formen). Kopf als sauberer
// Kreis mit Haaransatz, zwei Augen und ein Lächeln als einzelne Lichter. Arme sind eigene Teile (sie drehen um die
// Schulter), ihre Linien im Kleid bzw. im Ärmel fallen trotzdem weg.
//
// Chopper selbst ist in dieser Szene ebenfalls ein Umriss (playDog unten): Neben den Umrisskindern wirkte der gefüllte Hund
// wie aus einer anderen Zeichnung. Geometrie und Gelenkpunkte sind dieselben wie in chopper.js (gleiche Ellipsen, Beine,
// Ohr, Schwanz, Mütze), darum bewegt chopper-moods.js ihn unverändert. Danke-Seite und 404 behalten den gefüllten Hund.
//
// Koordinaten Kinder: Figurrahmen, y oben, Füße bei y = 0, Kopfscheitel bei gut 1. Die Szene (chopper-moods.js) setzt die
// Figur in ihre Bühne (y unten). Hund: Bühnenrahmen von chopper.js (toN, y unten).
import { ellipsoid, tube, curves, spot, assemble } from '../scenes/catalog-3d/kit.js';

/** Fläche aus einem Umriss (Kleid, T-Shirt, Hose): Linie und Innen-Test für die Vereinigung der Körper. */
function shape(tag, pts) {
  const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
  const hit = (x, y) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
  return { tag, w: 1, solid: true, lines: [{ pts: pts.map(([x, y]) => [x, y, 0]), closed: true }], inside: (p, s = 1) => hit(c[0] + (p[0] - c[0]) / s, c[1] + (p[1] - c[1]) / s) };
}
/** Bogen als Punktliste (Saum, Lächeln). */
const arc = (x0, x1, y, sag, k = 9) => Array.from({ length: k }, (_, i) => { const u = i / (k - 1), x = x0 + (x1 - x0) * u; return [x, y - sag * (1 - (2 * u - 1) ** 2), 0]; });
/** Nur Innen-Test, keine Linie: ein Körper, in dem die Linien eines separat gebauten Teils (Arm) verschwinden. */
const ghost = (part) => ({ tag: 'ghost', lines: [], solid: true, inside: part.inside });

const HEAD = { c: [0, 0.85], r: [0.125, 0.135, 0.1] };
/** Haare als Fläche, die dem Kopf folgt: außen ein Bogen knapp über dem Kopf (von Winkel a0 über den Scheitel bis a1),
 *  innen der Haaransatz (fringe, von links nach rechts: der Bogen endet links; andersherum schloss sich die Fläche mit einer
 *  Linie quer über die Augen). Eine Kappe als eigene Ellipse las sich wie eine Mütze. */
function hairShape(a0, a1, lift, fringe) {
  const [cx, cy] = HEAD.c, [rx, ry] = HEAD.r, k = 18;
  const outer = Array.from({ length: k + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / k; return [cx + Math.cos(a) * (rx + lift), cy + Math.sin(a) * (ry + lift)]; });
  return shape('hair', [...outer, ...fringe]);
}
/** Kopf mit Gesicht; der Haaransatz kommt vom Haarteil (seine Unterkante liegt im Gesicht und bleibt sichtbar). */
const head = () => [
  // nicht massiv: sonst verschwände die Unterkante der Haare (Pony) im Gesicht
  ellipsoid('skin', HEAD.c, HEAD.r, { solid: false }),
  tube('skin', [[0, 0.668, 0], [0, 0.7, 0]], 0.03, { hoops: 0, crest: false, caps: [false, false] }), // Hals (die Röhre ist eine Kapsel: länger reichte sie bis in den Mund und löschte das Lächeln)
  spot('eye', [-0.046, 0.8, 0], 1), spot('eye', [0.046, 0.8, 0], 1),
  curves('mouth', [arc(-0.038, 0.038, 0.765, 0.016, 5)]),
];

/** Arm aus der Schulter: Oberarm, Ellbogen, Unterarm, Hand. side ±1. */
function arm(side, from, elbow, wrist) {
  const s = (p) => [side * p[0], p[1], 0];
  return [tube('skin', [s(from), s(elbow), s(wrist)], (u) => 0.029 - 0.006 * u, { hoops: 0, crest: false, caps: [false, false] }),
    ellipsoid('skin', [side * (wrist[0] + 0.012), wrist[1] - 0.028], [0.034, 0.036, 0.03])];
}

/** Ein Kind: { body, arms: { left, right } } je als [{ x, y, tag }], dazu Schultern und Hände im Figurrahmen. */
const KIDS = {
  girl: () => {
    // Haare: Scheitel mit Pony (leicht geschwungen, Seitenscheitel), bis über die Ohren, und zwei Zöpfe
    const hair = [hairShape(-0.38, Math.PI + 0.38, 0.016, [[-0.118, 0.8], [-0.1, 0.87], [-0.05, 0.895], [0.0, 0.905], [0.03, 0.885], [0.085, 0.875], [0.118, 0.8]]),
      ellipsoid('hair', [-0.158, 0.8], [0.04, 0.066, 0.03], { roll: -0.3 }), ellipsoid('hair', [0.158, 0.8], [0.04, 0.066, 0.03], { roll: 0.3 })];
    const dress = shape('dress', [[-0.055, 0.7], [0.055, 0.7], [0.1, 0.672], [0.088, 0.55], ...arc(0.185, -0.185, 0.33, -0.02, 11).map(([x, y]) => [x, y]), [-0.088, 0.55], [-0.1, 0.672]]);
    const legs = [-1, 1].map((s) => tube('skin', [[s * 0.06, 0.42, 0], [s * 0.06, 0.065, 0]], 0.035, { hoops: 0, crest: false, caps: [false, false] }));
    const shoes = [-1, 1].map((s) => ellipsoid('shoe', [s * 0.072, 0.034], [0.05, 0.03, 0.04]));
    // Arme deutlich vom Kleid weg: neben dem Kleid entstünden Doppellinien
    const shoulder = [0.088, 0.655], from = [0.096, 0.662], elbow = [0.19, 0.53], wrist = [0.252, 0.42];
    return { parts: [...head(), ...hair, dress, ...legs, ...shoes], armParts: (side) => [...arm(side, from, elbow, wrist), ghost(dress)], shoulder, hand: [wrist[0] + 0.012, wrist[1] - 0.028] };
  },
  boy: () => {
    // kurze Haare: schräg gekämmter Pony (rechts hoch, links tief; Spitzen oder ein waagerechter Bogen lasen sich als Band
    // bzw. Mütze), oben ein Wirbel
    const hair = [hairShape(-0.12, Math.PI + 0.12, 0.014, [[0.124, 0.85], [0.1, 0.925], [0.05, 0.93], [0, 0.912], [-0.05, 0.888], [-0.095, 0.86], [-0.124, 0.83]].reverse()),
      curves('hair', [[[-0.004, 0.995, 0], [0.012, 1.04, 0], [0.03, 1.0, 0]]])];
    const shirt = shape('shirt', [[-0.058, 0.7], [0.058, 0.7], [0.128, 0.672], [0.168, 0.582], [0.124, 0.562], [0.104, 0.6], [0.1, 0.44], [-0.1, 0.44], [-0.104, 0.6], [-0.124, 0.562], [-0.168, 0.582], [-0.128, 0.672]]);
    const shorts = shape('shorts', [[-0.1, 0.442], [0.1, 0.442], [0.118, 0.3], [0.016, 0.3], [0, 0.37], [-0.016, 0.3], [-0.118, 0.3]]);
    const legs = [-1, 1].map((s) => tube('skin', [[s * 0.062, 0.36, 0], [s * 0.062, 0.065, 0]], 0.035, { hoops: 0, crest: false, caps: [false, false] }));
    const shoes = [-1, 1].map((s) => ellipsoid('shoe', [s * 0.074, 0.034], [0.05, 0.03, 0.04]));
    const shoulder = [0.12, 0.64], from = [0.136, 0.6], elbow = [0.19, 0.5], wrist = [0.24, 0.4];
    return { parts: [...head(), ...hair, shirt, shorts, ...legs, ...shoes], armParts: (side) => [...arm(side, from, elbow, wrist), ghost(shirt)], shoulder, hand: [wrist[0] + 0.012, wrist[1] - 0.028] };
  },
};

/** Drohnen je Teil (Körper, je Arm): gleicher Linienabstand wie bei den Katalogfiguren (~0,024 Figurhöhen). */
export const KID_DRONES = { girl: { body: 170, arm: 30 }, boy: { body: 172, arm: 30 } };

const flat = (shape) => shape.pts.map((p, j) => ({ x: p[0], y: p[1], tag: shape.tags[j] }));
/** Kind kind ('girl' | 'boy') als Punkte im Figurrahmen. */
export function kidFigure(kind) {
  const k = KIDS[kind](), n = KID_DRONES[kind];
  return {
    body: flat(assemble(k.parts, n.body)),
    left: flat(assemble(k.armParts(-1), n.arm)), right: flat(assemble(k.armParts(1), n.arm)),
    shoulder: { left: [-k.shoulder[0], k.shoulder[1]], right: k.shoulder }, hand: { left: [-k.hand[0], k.hand[1]], right: k.hand },
  };
}

// ---------------------------------------------------------------- Chopper als Umriss ----------
// Rahmen und Maßstab wie chopper.js: 400 × 300 SVG-Pixel auf 420 px Kante, normiert auf die längere Seite (y unten).
const SK = (420 - 6) / 400, RW = Math.round(400 * SK) + 6, RH = Math.round(300 * SK) + 6, PX = (2 * SK) / RW;
const N = (X, Y) => [(3 + X * SK - RW / 2) * 2 / RW, (3 + Y * SK - RH / 2) * 2 / RW, 0];
/** Kubische Bézier-Pfade (Start + [c1, c2, Ende]…) als Punktliste in SVG-Pixeln. */
const bezier = (start, segs, k = 10) => { const out = [start]; let p = start; for (const [c1, c2, e] of segs) { for (let i = 1; i <= k; i++) { const u = i / k, v = 1 - u; out.push([v ** 3 * p[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u ** 3 * e[0], v ** 3 * p[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u ** 3 * e[1]]); } p = e; } return out; };
const svgShape = (tag, pts) => shape(tag, pts.map(([X, Y]) => N(X, Y).slice(0, 2)));
const svgEllipse = (tag, cx, cy, rx, ry, rotDeg = 0) => ellipsoid(tag, N(cx, cy), [rx * PX, ry * PX, ry * PX], { roll: (rotDeg * Math.PI) / 180 });
/** Bein: abgerundetes Rechteck wie in chopper.js (rect x y w h, rx = w/2, rotate(a cx cy)) als Röhre mit runden Enden. */
const svgLeg = (x, y, w, h, a, cx, cy) => { const r = (a * Math.PI) / 180, R = ([X, Y]) => [cx + (X - cx) * Math.cos(r) - (Y - cy) * Math.sin(r), cy + (X - cx) * Math.sin(r) + (Y - cy) * Math.cos(r)]; return tube('dog', [N(...R([x + w / 2, y + w / 2])), N(...R([x + w / 2, y + h - w / 2]))], (w / 2) * PX, { hoops: 0, crest: false, caps: [true, true] }); };

const DOG_BODY = () => {
  const snout = svgShape('dog', bezier([300, 112], [[[330, 104], [362, 106], [374, 118]], [[384, 128], [380, 146], [366, 150]], [[346, 156], [318, 152], [300, 146]]]));
  const hat = svgShape('hat', bezier([262, 70], [[[266, 44], [318, 40], [326, 66]]]));
  return [svgEllipse('dog', 184, 178, 88, 40, -8), svgEllipse('dog', 248, 160, 44, 42), svgEllipse('dog', 292, 108, 52, 48), snout, svgEllipse('nose', 378, 118, 10, 10),
    svgLeg(236, 176, 26, 78, -58, 249, 186), svgLeg(220, 182, 24, 70, -42, 232, 190), svgLeg(104, 180, 26, 80, 62, 117, 190), svgLeg(124, 186, 24, 70, 48, 136, 194),
    hat, curves('hat', [[N(294, 28), N(294, 46)]]), spot('eye', N(312, 98), 1)];
};
const EAR = () => svgShape('ear', bezier([266, 74], [[[246, 74], [232, 98], [236, 132]], [[238, 150], [256, 156], [264, 140]], [[272, 120], [276, 92], [266, 74]]]));
const TAIL = () => svgShape('tail', bezier([112, 168], [[[86, 158], [68, 138], [60, 112]], [[57, 101], [68, 98], [72, 107]], [[82, 128], [98, 144], [120, 154]]]));
/** Drohnen je Teil des Umriss-Chopper (Linienabstand wie bei den Kindern in der Szene). */
export const DOG_DRONES = { body: 150, ear: 22, tail: 20 };
let dogCache = null;
/** Chopper als Umriss in denselben Teilen wie chopperParts(): { body, ear, tail } als [{ x, y, tag }] (Bühnenrahmen). */
export function playDog() {
  if (dogCache) return dogCache;
  const body = DOG_BODY(), ear = EAR(), tail = TAIL();
  // Das Ohr liegt vor dem Kopf (dessen Linien darunter fallen weg), der Schwanz setzt im Rumpf an (seine Wurzel fällt weg)
  dogCache = { body: flat(assemble([...body, ghost(ear)], DOG_DRONES.body)), ear: flat(assemble([ear], DOG_DRONES.ear)), tail: flat(assemble([tail, ghost(body[0])], DOG_DRONES.tail)) };
  return dogCache;
}
