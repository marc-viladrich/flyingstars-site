// Chopper, der Bürohund, als fliegende Drohnenformation. „Chopper“ ist Slang für Hubschrauber,
// also trägt er eine Propellermütze. Ohr, Schwanz und Propeller sind eigene Teile und bewegen sich einzeln.
// Rasse und Fellfarbe sind noch nicht bekannt: Mit einem Foto wird nur body/ear/tail neu gezeichnet.
//
// Runde 10b (Marc, 20.11.2026: „Chopper kann ruhig auch in der 404-Seite und woanders ohne filling dots erscheinen“):
// Chopper ist überall ein Umriss, gebaut wie die Katalogfiguren (scenes/catalog-3d/kit.js): Drohnen in gleichem Abstand
// entlang der Linien, Linien eines Teils, die in einem anderen liegen, fallen weg. Geometrie wie die bisherige Silhouette
// (dieselben Ellipsen, Beine, Ohr, Schwanz, Mütze im 400 × 300 Rahmen), darum stimmen alle Gelenkpunkte. Vorher war er
// eine gefüllte SVG-Fläche, abgetastet wie ein Logo (330 + 40 + 34 Drohnen). Eine Quelle für 404, Danke-Seite, Team und
// die Spielszene der Hochzeit (chopper-moods.js).
import { ellipsoid, tube, curves, spot, assemble } from '../scenes/catalog-3d/kit.js';
import { gradientAt } from './swarm.js';

/** Fläche aus einem Umriss (Kleid, T-Shirt, Hose): Linie und Innen-Test für die Vereinigung der Körper. */
export function outlineShape(tag, pts) {
  const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
  const hit = (x, y) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
  return { tag, w: 1, solid: true, lines: [{ pts: pts.map(([x, y]) => [x, y, 0]), closed: true }], inside: (p, s = 1) => hit(c[0] + (p[0] - c[0]) / s, c[1] + (p[1] - c[1]) / s) };
}
/** Nur Innen-Test, keine Linie: ein Körper, in dem die Linien eines separat gebauten Teils (Arm) verschwinden. */
export const ghost = (part) => ({ tag: 'ghost', lines: [], solid: true, inside: part.inside });
/** Ergebnis von assemble() als [{ x, y, tag }]. */
export const outlinePoints = (shape) => shape.pts.map((p, j) => ({ x: p[0], y: p[1], tag: shape.tags[j] }));

// Gleicher Rahmen wie die Silhouette bisher: 400 × 300 SVG-Pixel auf 420 px Kante, 3 px Rand, normiert auf die längere Seite
const S = (420 - 6) / 400, RW = Math.round(400 * S) + 6, RH = Math.round(300 * S) + 6, PX = (2 * S) / RW;
const toN = (X, Y) => [(3 + X * S - RW / 2) * 2 / RW, (3 + Y * S - RH / 2) * 2 / RW];
const N = (X, Y) => [...toN(X, Y), 0];
/** Kubische Bézier-Pfade (Start + [c1, c2, Ende]…) als Punktliste in SVG-Pixeln. */
const bezier = (start, segs, k = 10) => { const out = [start]; let p = start; for (const [c1, c2, e] of segs) { for (let i = 1; i <= k; i++) { const u = i / k, v = 1 - u; out.push([v ** 3 * p[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u ** 3 * e[0], v ** 3 * p[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u ** 3 * e[1]]); } p = e; } return out; };
const svgShape = (tag, pts) => outlineShape(tag, pts.map(([X, Y]) => N(X, Y).slice(0, 2)));
const svgEllipse = (tag, cx, cy, rx, ry, rotDeg = 0) => ellipsoid(tag, N(cx, cy), [rx * PX, ry * PX, ry * PX], { roll: (rotDeg * Math.PI) / 180 });
/** Bein: abgerundetes Rechteck wie in der Silhouette (rect x y w h, rx = w/2, rotate(a cx cy)) als Röhre mit runden Enden. */
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
/** Drohnen je Teil (Linienabstand wie bei den Kindern der Spielszene). */
const PARTS = { body: 150, ear: 22, tail: 20 };
const BLADE = 17; // Drohnen je Rotorblatt
export const CHOPPER_COUNT = PARTS.body + PARTS.ear + PARTS.tail + BLADE * 2;

let cache = null;
/** Chopper als Umriss: { body, ear, tail } als [{ x, y, tag }] im Bühnenrahmen (y unten). */
function outline() {
  if (cache) return cache;
  const body = DOG_BODY(), ear = EAR(), tail = TAIL();
  // Das Ohr liegt vor dem Kopf (dessen Linien darunter fallen weg), der Schwanz setzt im Rumpf an (seine Wurzel fällt weg)
  cache = { body: outlinePoints(assemble([...body, ghost(ear)], PARTS.body)), ear: outlinePoints(assemble([ear], PARTS.ear)), tail: outlinePoints(assemble([tail, ghost(body[0])], PARTS.tail)) };
  return cache;
}
/** Teile wie bisher asynchron (Aufrufer warten darauf); gerechnet wird synchron in gut 20 ms, einmal je Seite. */
async function parts() { return outline(); }

/** Farben je Drohne: Fell im FlyingStars-Verlauf, Propeller kühl. */
export function chopperColors(p) {
  const out = new Uint8Array(CHOPPER_COUNT * 3); let i = 0;
  for (const q of [...p.body, ...p.ear, ...p.tail]) out.set(gradientAt((q.x + 0.9) / 1.8), 3 * i++);
  for (let k = 0; k < BLADE * 2; k++) out.set([150, 245, 250], 3 * i++);
  return out;
}

/**
 * Verhalten: Chopper schwebt hin und her, wippt, der Propeller dreht, Schwanz wedelt, Ohr flattert.
 * An den Enden wendet er über eine langsame lebendige Wolke (3,2 s). Bei Aufmerksamkeit (Button-Hover)
 * fliegt er zu den Buttons, wedelt schneller und der Propeller dreht hoch.
 */
export async function chopperBehaviour(getAttention) {
  const p = await parts();
  const [tbx, tby] = toN(116, 161), [ebx, eby] = toN(266, 78), [pcx, pcy] = toN(294, 27), half = toN(352, 0)[0] - toN(294, 0)[0];
  const size = 0.78; // Hund kleiner als die Bühne, damit er Platz zum Fliegen hat
  // ruhig statt hektisch (Marc 30.10.): langsamer Flug, Propeller, Wedeln und Wippen; Wende als langsame Wolke
  const TURN_MS = 3200;
  let last = 0, x = -0.2, face = 1, turn = 1, spin = 0, wag = 0, goal = 0.22, hold = 0, turningUntil = 0, att = false, attRaw = false, attSince = 0;
  return (T, tx, ty, sw) => {
    const dt = last ? Math.min(0.05, T - last) : 0; last = T;
    // Aufmerksamkeit entprellt: kurzes Überstreichen der Buttons löst keine Wende aus
    const raw = getAttention(); if (raw !== attRaw) { attRaw = raw; attSince = T; }
    if (attRaw !== att && T - attSince > (attRaw ? 0.4 : 1.2)) att = attRaw;
    // Flugbahn: zwischen zwei Punkten pendeln, kurz schweben, bei Aufmerksamkeit nach rechts zu den Buttons
    const target = att ? 0.24 : goal;
    // Er fliegt nie rückwärts: Zeigt das Ziel in die andere Richtung, wendet er zuerst auf der Stelle
    // (lebendige Wolke) und fliegt erst los, wenn die Wolke durch ist. Während der Wende zählt kein neues Ziel.
    const want = Math.abs(target - x) > 0.01 ? Math.sign(target - x) : face;
    const turning = T < turningUntil;
    if (!turning && want !== face) { face = want; turn = face; turningUntil = T + TURN_MS / 1000; sw?.retarget(TURN_MS); }
    else if (!turning && Math.abs(target - x) > 0.01) { x += face * Math.min(Math.abs(target - x), dt * (att ? 0.22 : 0.1)); hold = 0; }
    else if (!turning && !att && (hold += dt) > 3.5) goal = goal > 0 ? -0.22 : 0.22;
    spin += dt * (att ? 11 : 6); wag += dt * (att ? 8 : 4);
    const bob = Math.sin(T * 1.3) * 0.03, tilt = (att ? 0.04 : 0.02) * Math.sin(T * 0.8);
    let i = 0;
    const put = (qx, qy) => {
      // Neigung um die Körpermitte, dann Blickrichtung (gespiegelt), dann Position
      const c = Math.cos(tilt), s = Math.sin(tilt), rx = qx * c - qy * s, ry = qx * s + qy * c;
      tx[i] = x + rx * size * turn; ty[i] = ry * size + bob; i++;
    };
    for (const q of p.body) put(q.x, q.y);
    const flap = Math.sin(T * 2.4) * 0.18 + (att ? 0.12 : 0);
    for (const q of p.ear) { const dx = q.x - ebx, dy = q.y - eby, c = Math.cos(flap), s = Math.sin(flap); put(ebx + dx * c - dy * s, eby + dx * s + dy * c); }
    const w = Math.sin(wag) * 0.45;
    for (const q of p.tail) { const dx = q.x - tbx, dy = q.y - tby, c = Math.cos(w), s = Math.sin(w); put(tbx + dx * c - dy * s, tby + dx * s + dy * c); }
    // Rotor von der Seite: Blattlänge schwankt mit dem Drehwinkel, leichte Tiefe als Ellipse
    for (let b = 0; b < 2; b++) {
      const ang = spin + b * Math.PI;
      for (let k = 1; k <= BLADE; k++) { const u = k / BLADE; put(pcx + Math.cos(ang) * half * u, pcy + Math.sin(ang) * half * u * 0.12); }
    }
  };
}
export { parts as chopperParts, outline as chopperOutline };
