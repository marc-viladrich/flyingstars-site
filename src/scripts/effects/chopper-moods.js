// Chopper in Stimmungen: derselbe Hund wie in chopper.js (Silhouette, Ohr, Schwanz, Propellermütze), hier mit Gefühl.
//   happy – Danke-Seite und Team-Kachel: wedelt, Propeller dreht, einmal je Schleife ein Rückwärtssalto
//   play  – Hochzeit: ein Mädchen wirft einen Ball, ein Junge eine Frisbee; Chopper springt, fängt, wendet sich zum
//           anderen Kind wie auf der 404 (lebendige Wolke)
// Nahtlose Schleifen (Runde 6, Marc): jede Bewegung ist eine ganzzahlige Wiederholung der Schleifenlänge, Start- und
// Endbild sind identisch. Die Ohren schwingen bei Salto und Sprung nach, statt starr mitzudrehen.
// Koordinaten wie chopper.js (400 × 300 Rahmen). Bei reduzierter Bewegung (T = 0) zeigt jede Stimmung ein Standbild.
import { gradientAt, hash } from './swarm.js';
import { chopperParts, CHOPPER_COUNT } from './chopper.js';
import { kidFigure, KID_DRONES, playDog, DOG_DRONES } from './chopper-play.js';

const S = (420 - 6) / 400, RW = Math.round(400 * S) + 6, RH = Math.round(300 * S) + 6;
const toN = (X, Y) => [(3 + X * S - RW / 2) * 2 / RW, (3 + Y * S - RH / 2) * 2 / RW];
const fromN = (x, y) => [((x * RW) / 2 + RW / 2 - 3) / S, ((y * RW) / 2 + RH / 2 - 3) / S];
const BLADE = 17;
const TAU = Math.PI * 2;

// Kinder: Umrissfiguren nach der Methode der Katalogfiguren (chopper-play.js, Runde 10; vorher gefüllte SVG-Flächen,
// Marc: „Punkte überall an den Kleidern … Gesicht kann man nicht richtig erkennen“). Mädchen links mit Zöpfen und Kleid,
// wirft den Ball mit dem rechten Arm; Junge rechts mit T-Shirt und Shorts, wirft die Frisbee mit dem linken Arm.
// Gebaut erst mit der Spielszene (gut 10 ms), die Danke-Seite braucht nur den Hund; assemble() liefert genau KID_DRONES
let GIRL = null, BOY = null;
const kidCount = (kind) => KID_DRONES[kind].body + 2 * KID_DRONES[kind].arm;
const BALL = 13, DISC = 16;
/** Farben der Teile: Haut warm hell, Kleidung in den Markenfarben, Haare kräftiger, Augen hell, Mund rosa. */
const KID_COLOR = {
  skin: () => [252, 226, 204], eye: () => [255, 250, 240], mouth: () => [255, 140, 170],
  dress: (q) => gradientAt(0.04 + (0.7 - q.y) * 0.25), shoe: () => [196, 160, 255],
  shirt: (q) => gradientAt(0.97 - (0.7 - q.y) * 0.3), shorts: () => [128, 140, 255],
};
const HAIR = { girl: [255, 200, 104], boy: [214, 138, 82] };

// Größe (Runde 10, Marc: „die Illustration könnte ein ganzes Stück größer sein“): Die Szene füllt ihre Bühne, statt einen
// festen Anteil der kürzeren Seite zu nehmen. PLAY_BOX ist ihr über eine ganze Schleife gemessener Rahmen in Einheiten
// (Kinder samt Jubelarmen, Ballbogen, Sprung, um die Bühnenmitte; scripts/chopper-play.test.mjs misst nach) plus Rand für
// die Lichter. Je Frame setzt die Szene sw.scale so, dass er in die Bühne passt. PLAY_SCALE ist nur der Startwert.
export const PLAY_SCALE = 0.75;
export const PLAY_BOX = { w: 2.44, h: 1.08 };
/** Maßstab des Schwarms (Anteil der kürzeren Bühnenseite je Einheit), damit PLAY_BOX in eine Bühne w × h passt. */
export const playScale = (w, h) => Math.min(w / PLAY_BOX.w, h / PLAY_BOX.h) / Math.min(w, h);
// Spielszene: Chopper als Umriss (chopper-play.js), mit eigener Drohnenzahl; Danke-Seite: der gefüllte Hund
const DOG = CHOPPER_COUNT, PLAY_DOG = DOG_DRONES.body + DOG_DRONES.ear + DOG_DRONES.tail + BLADE * 2;
export const MOOD_COUNT = { happy: DOG, play: PLAY_DOG + kidCount('girl') + kidCount('boy') + BALL + DISC };

const rot = (x, y, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** Fortschritt 0..1 im Fenster [a, b] */
const span = (u, a, b) => clamp01((u - a) / (b - a));
/** weicher Hügel 0 → 1 → 0 im Fenster [a, b] mit Rampen der Länge r */
const hill = (u, a, b, r) => ease(span(u, a, a + r)) * (1 - ease(span(u, b - r, b)));

/** Kopf-Drohnen des Hundes (Kopf, Schnauze, Mütze), damit er ihn neigen kann. */
function headMask(body) {
  return body.map((q) => { const [X, Y] = fromN(q.x, q.y); return (X > 250 && Y < 146) || (X > 238 && Y < 96); });
}

/**
 * Setzt den Hund in tx/ty ab Index i. pose: Position, Größe, Blickrichtung, Ganzkörper-Drehung, Kopfneigung,
 * Schwanz-, Ohr- und Propellerwinkel. Gibt den nächsten freien Index und die Lage der Schnauze zurück.
 */
function putDog(p, mask, tx, ty, i, pose) {
  const { x = 0, y = 0, size = 0.78, face = 1, spin = 0, head = 0, tail = 0, ear = 0, blade = 0 } = pose;
  const [cx, cy] = toN(230, 160), [nx, ny] = toN(258, 132), [tbx, tby] = toN(116, 161), [ebx, eby] = toN(266, 78);
  const [pcx, pcy] = toN(294, 27), half = toN(352, 0)[0] - toN(294, 0)[0];
  const put = (qx, qy) => {
    const [rx, ry] = rot(qx, qy, cx, cy, spin);
    tx[i] = x + (rx - cx) * size * face; ty[i] = y + (ry - cy) * size; i++;
  };
  const headRot = (qx, qy) => rot(qx, qy, nx, ny, head);
  p.body.forEach((q, k) => mask[k] ? put(...headRot(q.x, q.y)) : put(q.x, q.y));
  for (const q of p.ear) put(...headRot(...rot(q.x, q.y, ebx, eby, ear)));
  for (const q of p.tail) put(...rot(q.x, q.y, tbx, tby, tail));
  for (let b = 0; b < 2; b++) {
    const ang = blade + b * Math.PI;
    for (let k = 1; k <= BLADE; k++) { const u = k / BLADE; put(...headRot(pcx + Math.cos(ang) * half * u, pcy + Math.sin(ang) * half * u * 0.12)); }
  }
  const [mx0, my0] = headRot(...toN(376, 132));
  const [mx, my] = rot(mx0, my0, cx, cy, spin);
  return { i, mouth: [x + (mx - cx) * size * face, y + (my - cy) * size] };
}

/** Farben je Drohne in derselben Reihenfolge wie putDog. */
function dogColors(p, out, i) {
  for (const q of [...p.body, ...p.ear, ...p.tail]) out.set(gradientAt((q.x + 0.9) / 1.8), 3 * i++);
  for (let k = 0; k < BLADE * 2; k++) out.set([150, 245, 250], 3 * i++);
  return i;
}

// ---------- happy: eine Schleife von 5 s mit einem Salto ----------
const HAPPY = 5;
function happyPose(t) {
  const w = TAU / HAPPY, u = ((t % HAPPY) + HAPPY) % HAPPY;
  const s = span(u, 1.2, 2.5), inFlip = s > 0 && s < 1;
  const flip = -TAU * ease(s);
  const lift = Math.sin(Math.PI * s) ** 2;                 // Absprung und Landung ohne Ruck
  const crouch = hill(u, 0.85, 1.35, 0.25) + hill(u, 2.4, 2.9, 0.2);
  const vel = 6 * s * (1 - s);                             // Drehgeschwindigkeit des Saltos
  const after = span(u, 2.5, 3.6);                          // Nachschwingen nach der Landung
  const ear = 0.16 * Math.sin(4 * w * u) + 0.55 * vel + (after > 0 && after < 1 ? 0.3 * Math.sin(TAU * 2 * after) * (1 - after) ** 2 : 0);
  return {
    x: 0, y: 0.04 + 0.022 * Math.sin(2 * w * u) - 0.34 * lift + 0.03 * crouch, size: 0.8, spin: flip,
    head: 0.06 * Math.sin(2 * w * u) - 0.12 * crouch, tail: 0.55 * Math.sin(13 * w * u), ear,
    blade: (14 * Math.PI / HAPPY) * u + 4 * Math.PI * ease(s), inFlip,
  };
}

/**
 * Stimmung als Formation für Swarm.follow(). Liefert { count, colors, behaviour }.
 * @param {'happy'|'play'} mood
 */
export async function chopperMood(mood) {
  const p = mood === 'play' ? playDog() : await chopperParts();
  const mask = headMask(p.body);
  const count = MOOD_COUNT[mood];
  const colors = new Uint8Array(count * 3);
  let ci = dogColors(p, colors, 0);
  if (mood === 'happy') {
    let t0 = null;
    const behaviour = (T, tx, ty) => {
      if (t0 === null && T) t0 = T;
      putDog(p, mask, tx, ty, 0, happyPose(T ? T - t0 : 0));
    };
    return { count, colors, behaviour };
  }

  GIRL ??= kidFigure('girl'); BOY ??= kidFigure('boy');
  // Reihenfolge wie im Verhalten: Mädchen (Körper, Wurfarm rechts, freier Arm links), Junge (Körper, Wurfarm links, rechts)
  for (const [f, hair, arms] of [[GIRL, HAIR.girl, ['right', 'left']], [BOY, HAIR.boy, ['left', 'right']]]) {
    for (const q of f.body) colors.set(q.tag === 'hair' ? hair : KID_COLOR[q.tag](q), 3 * ci++);
    for (const side of arms) for (let a = 0; a < f[side].length; a++) colors.set(KID_COLOR.skin(), 3 * ci++);
  }
  for (let b = 0; b < BALL + DISC; b++) colors.set([255, 236, 190], 3 * ci++);
  const sA = new Float32Array(PLAY_DOG), sB = new Float32Array(PLAY_DOG), sC = new Float32Array(PLAY_DOG), sD = new Float32Array(PLAY_DOG);
  const delay = Float32Array.from({ length: PLAY_DOG }, (_, d) => hash(d, 5) * 0.35);
  const offX = Float32Array.from({ length: PLAY_DOG }, (_, d) => hash(d, 11) - 0.5), offY = Float32Array.from({ length: PLAY_DOG }, (_, d) => hash(d, 13) - 0.65);

  // ---------- play: 12,4 s, erst wirft das Mädchen (Ball), dann der Junge (Frisbee) ----------
  const P = 12.4, H = P / 2, w = TAU / P;
  // K: Kinderhöhe in Einheiten (Figurrahmen 0…1 → Bühne); floor: Boden, so dass PLAY_BOX mittig steht
  const K = 0.86, dogSize = 0.53, floor = 0.5, girlX = -0.8, boyX = 0.8; // ±0,76: Frisbee berührte die Schwanzspitze
  const kidY = floor, dogY = floor - (toN(0, 254)[1] - toN(0, 160)[1]) * dogSize;
  // Wurfarm: ausholen, nach vorn schwingen (Abwurf bei 0,85 s), zurück; Winkel für den Wurf nach rechts
  const throwAngle = (v) => v < 0.6 ? 0.9 * ease(v / 0.6) : v < 0.85 ? 0.9 - 3 * ease((v - 0.6) / 0.25) : v < 1.6 ? -2.1 * (1 - ease((v - 0.85) / 0.75)) : 0;
  const RELEASE = 0.85, CATCH = 2.15, DROP = 3.4, HOME = 4.6, PICK = 5.2;
  // Figurrahmen (y oben, Füße bei 0) → Bühne (y unten): x = ox + K·x, y = oy − K·y; Arme drehen um ihre Schulter
  const at = (ox, oy, [x, y]) => [ox + x * K, oy - y * K];
  // Jubelarm schräg nach oben außen, gut 40° neben der Senkrechten (2,05 rad führten ihn über Zopf und Kopf). Beim
  // Hochreißen geht er durch die Waagerechte: Das ist die breiteste Stelle der Szene (PLAY_BOX)
  const CHEER = 1.86;
  const hand = (f, side, ang, ox, oy) => rot(...at(ox, oy, f.hand[side]), ...at(ox, oy, f.shoulder[side]), ang);

  let t0 = null;
  const behaviour = (T, tx, ty, sw) => {
    if (t0 === null && T) t0 = T;
    const t = T ? T - t0 : CATCH, u = ((t % P) + P) % P;
    if (sw?.w && sw?.h) sw.scale = playScale(sw.w, sw.h);
    const half = u < H ? 0 : 1, v = u - half * H;               // Zeit innerhalb der Hälfte
    const face = half === 0 ? -1 : 1;                           // Chopper schaut zum werfenden Kind
    // Sprung zum Fang, Ohren schwingen mit der Sprunggeschwindigkeit
    const jk = span(v, 1.55, 2.65), jump = -0.3 * Math.sin(Math.PI * jk) ** 2;
    const excite = hill(v, 2.0, 4.0, 0.3);
    const dogPose = (f) => ({
      x: 0.02, y: dogY + jump, size: dogSize, face: f,
      spin: -0.32 * Math.sin(Math.PI * jk) ** 2, head: -0.22 * Math.sin(Math.PI * jk) ** 2 + 0.04 * Math.sin(4 * w * u),
      tail: (0.4 + 0.18 * excite) * Math.sin(24 * w * u), ear: 0.18 * Math.sin(6 * w * u) - 0.45 * Math.sin(TAU * jk) * (jk > 0 && jk < 1 ? 1 : 0),
      blade: (40 * Math.PI / P) * u,
    });
    // Wende zum anderen Kind am Ende jeder Hälfte als lebendige Wolke (wie die 404)
    const tk = span(v, HOME, H);
    let mouth;
    if (tk <= 0) mouth = putDog(p, mask, tx, ty, 0, dogPose(face)).mouth;
    else {
      putDog(p, mask, sA, sB, 0, dogPose(face));
      mouth = putDog(p, mask, sC, sD, 0, dogPose(-face)).mouth;
      for (let d = 0; d < PLAY_DOG; d++) {
        const e = ease(clamp01((tk - delay[d]) / 0.65)), a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
        const mx = (sA[d] + sC[d]) / 2 + offX[d] * 0.5, my = (sB[d] + sD[d]) / 2 + offY[d] * 0.35;
        tx[d] = a * sA[d] + b * mx + c * sC[d]; ty[d] = a * sB[d] + b * my + c * sD[d];
      }
    }
    let i = PLAY_DOG;
    const placeKid = (pts, ox, oy, pivot = null, ang = 0) => {
      const [pvx, pvy] = pivot ? at(ox, oy, pivot) : [0, 0];
      for (const q of pts) { const [x, y] = at(ox, oy, [q.x, q.y]), [px, py] = ang ? rot(x, y, pvx, pvy, ang) : [x, y]; tx[i] = px; ty[i] = py; i++; }
    };
    // Werfendes Kind dieser Hälfte, das andere jubelt beim Fang
    const throwA = throwAngle(v), cheerOther = hill(v, 2.0, 3.8, 0.35);
    const girlThrowA = half === 0 ? throwA : 0, boyThrowA = half === 1 ? -throwA : 0;
    const girlCheer = half === 1 ? cheerOther : 0, boyCheer = half === 0 ? cheerOther : 0;
    const gy = kidY - 0.05 * girlCheer * Math.abs(Math.sin(10 * w * u)), by = kidY - 0.05 * boyCheer * Math.abs(Math.sin(10 * w * u));
    placeKid(GIRL.body, girlX, gy);
    placeKid(GIRL.right, girlX, gy, GIRL.shoulder.right, girlThrowA);
    placeKid(GIRL.left, girlX, gy, GIRL.shoulder.left, girlCheer * (CHEER + 0.2 * Math.sin(12 * w * u)) + 0.08 * Math.sin(2 * w * u));
    placeKid(BOY.body, boyX, by);
    placeKid(BOY.left, boyX, by, BOY.shoulder.left, boyThrowA);
    placeKid(BOY.right, boyX, by, BOY.shoulder.right, -boyCheer * (CHEER + 0.2 * Math.sin(12 * w * u)) - 0.08 * Math.sin(2 * w * u));
    const girlHand = hand(GIRL, 'right', girlThrowA, girlX, gy), boyHand = hand(BOY, 'left', boyThrowA, boyX, by);
    // Wurfobjekt: Ball (Mädchen) bzw. Frisbee (Junge); das jeweils andere liegt in der Hand seines Kindes
    const flight = (from, feetX, arc) => {
      if (v < RELEASE) return from;
      if (v < CATCH) { const f = ease((v - RELEASE) / (CATCH - RELEASE)); return [from[0] + (mouth[0] - from[0]) * f, from[1] + (mouth[1] - from[1]) * f - Math.sin(Math.PI * f) * arc]; }
      if (v < DROP) return mouth;
      const ground = floor - 0.035;
      if (v < HOME) { const f = (v - DROP) / (HOME - DROP); const x = mouth[0] + (feetX - mouth[0]) * ease(f); const yy = f < 0.25 ? mouth[1] + (ground - mouth[1]) * (f / 0.25) ** 2 : ground - Math.abs(Math.sin((f - 0.25) / 0.75 * TAU)) * 0.06 * (1 - f) * arc / 0.5; return [x, yy]; }
      if (v < PICK) { const f = ease((v - HOME) / (PICK - HOME)); return [feetX + (from[0] - feetX) * f, ground + (from[1] - ground) * f]; }
      return from;
    };
    const ball = half === 0 ? flight(girlHand, girlX + 0.24, 0.55) : girlHand;
    const disc = half === 1 ? flight(boyHand, boyX - 0.24, 0.28) : boyHand;
    const r = 0.034;
    for (let b = 0; b < BALL; b++) {
      const a = b < 9 ? (b / 9) * TAU + 6 * w * u : b * 2.1, rr = b < 9 ? r : r * 0.35;
      tx[i] = ball[0] + Math.cos(a) * rr; ty[i] = ball[1] + Math.sin(a) * rr; i++;
    }
    const discFlying = half === 1 && v > RELEASE && v < CATCH, tilt = discFlying ? -0.25 * Math.sin(Math.PI * (v - RELEASE) / (CATCH - RELEASE)) : 0;
    for (let b = 0; b < DISC; b++) {
      const a = (b / DISC) * TAU, ex = Math.cos(a) * 0.075, ey = Math.sin(a) * 0.022;
      tx[i] = disc[0] + ex * Math.cos(tilt) - ey * Math.sin(tilt); ty[i] = disc[1] + ex * Math.sin(tilt) + ey * Math.cos(tilt); i++;
    }
  };
  return { count, colors, behaviour };
}
