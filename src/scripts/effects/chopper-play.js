// Die beiden Kinder der Chopper-Spielszene (Hochzeit, „Kinder und Hunde willkommen“), Runde 10, als Umrissfiguren.
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
// Chopper selbst ist seit Runde 10b überall ein Umriss in derselben Bauweise (chopper.js); Flächen-, Hüll- und
// Punkt-Helfer kommen von dort.
//
// Koordinaten: Figurrahmen, y oben, Füße bei y = 0, Kopfscheitel bei gut 1. Die Szene (chopper-moods.js) setzt die Figur in
// ihre Bühne (y unten).
import { ellipsoid, tube, curves, spot, assemble } from '../scenes/catalog-3d/kit.js';
import { outlineShape as shape, ghost, outlinePoints as flat } from './chopper.js';

/** Bogen als Punktliste (Saum, Lächeln). */
const arc = (x0, x1, y, sag, k = 9) => Array.from({ length: k }, (_, i) => { const u = i / (k - 1), x = x0 + (x1 - x0) * u; return [x, y - sag * (1 - (2 * u - 1) ** 2), 0]; });

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
    // Arme deutlich vom Kleid weg (neben dem Kleid entstünden Doppellinien); Runde 10b 10 % kürzer, die Hand endet an der
    // Hüfte statt am Oberschenkel: Das gibt Abstand zu Chopper, ohne die Szene breiter (also kleiner) zu machen
    const shoulder = [0.088, 0.655], from = [0.096, 0.662], elbow = [0.181, 0.543], wrist = [0.236, 0.444];
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
    const shoulder = [0.12, 0.64], from = [0.136, 0.6], elbow = [0.185, 0.51], wrist = [0.23, 0.42];
    return { parts: [...head(), ...hair, shirt, shorts, ...legs, ...shoes], armParts: (side) => [...arm(side, from, elbow, wrist), ghost(shirt)], shoulder, hand: [wrist[0] + 0.012, wrist[1] - 0.028] };
  },
};

/** Drohnen je Teil (Körper, je Arm): gleicher Linienabstand wie bei den Katalogfiguren (~0,024 Figurhöhen). */
export const KID_DRONES = { girl: { body: 170, arm: 28 }, boy: { body: 172, arm: 28 } };

/** Kind kind ('girl' | 'boy') als Punkte im Figurrahmen. */
export function kidFigure(kind) {
  const k = KIDS[kind](), n = KID_DRONES[kind];
  return {
    body: flat(assemble(k.parts, n.body)),
    left: flat(assemble(k.armParts(-1), n.arm)), right: flat(assemble(k.armParts(1), n.arm)),
    shoulder: { left: [-k.shoulder[0], k.shoulder[1]], right: k.shoulder }, hand: { left: [-k.hand[0], k.hand[1]], right: k.hand },
  };
}
