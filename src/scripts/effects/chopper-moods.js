// Chopper in Stimmungen: derselbe Hund wie in chopper.js (Silhouette, Ohr, Schwanz, Propellermütze), hier mit Gefühl.
//   happy – Danke-Seite und Team-Kachel: wedelt, Propeller dreht, einmal je Schleife ein Rückwärtssalto
//   play  – Hochzeit: ein Mädchen wirft einen Ball, ein Junge eine Frisbee; Chopper springt, fängt, wendet sich zum
//           anderen Kind wie auf der 404 (lebendige Wolke)
// Nahtlose Schleifen (Runde 6, Marc): jede Bewegung ist eine ganzzahlige Wiederholung der Schleifenlänge, Start- und
// Endbild sind identisch. Die Ohren schwingen bei Salto und Sprung nach, statt starr mitzudrehen.
// Koordinaten wie chopper.js (400 × 300 Rahmen). Bei reduzierter Bewegung (T = 0) zeigt jede Stimmung ein Standbild.
import { formation, gradientAt, hash } from './swarm.js';
import { chopperParts, CHOPPER_COUNT } from './chopper.js';

const S = (420 - 6) / 400, RW = Math.round(400 * S) + 6, RH = Math.round(300 * S) + 6;
const toN = (X, Y) => [(3 + X * S - RW / 2) * 2 / RW, (3 + Y * S - RH / 2) * 2 / RW];
const fromN = (x, y) => [((x * RW) / 2 + RW / 2 - 3) / S, ((y * RW) / 2 + RH / 2 - 3) / S];
const BLADE = 17;
const TAU = Math.PI * 2;

// Kinder als Konturfiguren gleichen Stils (Runde 6, Marc: „stick figures, but more human-looking“): Kopf, Haare,
// Kleid bzw. Shirt und Shorts, Beine mit Schuhen; Arme mit Händen sind eigene Teile, damit sie werfen und jubeln.
// Gleicher Rahmen und Maßstab wie der Hund, Füße auf derselben Grundlinie.
const VB = 'viewBox="0 0 400 300" width="400" height="300"';
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" ${VB}><g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
const SHOULDER = { girlThrow: [211, 106], girlFree: [189, 106], boyThrow: [187, 106], boyFree: [213, 106] };
const ARM = 58, SPREAD = 13; // Arme leicht abgespreizt, damit sie nicht auf der Rumpfkontur liegen
const arm = ([sx, sy], dx) => svg(`<path d="M${sx} ${sy} L${sx + dx} ${sy + ARM}"/><circle cx="${sx + dx}" cy="${sy + ARM + 6}" r="5"/>`);
const GIRL = svg(`<circle cx="200" cy="64" r="24"/>
  <path d="M180 56 Q198 38 222 54"/><path d="M178 52 C162 58 158 78 166 96"/><circle cx="170" cy="50" r="5"/>
  <path d="M200 88 L200 100"/>
  <path d="M190 102 L210 102 L214 130 L234 184 L166 184 L186 130 Z"/>
  <path d="M190 186 L188 240"/><path d="M210 186 L212 240"/><path d="M188 244 L177 245"/><path d="M212 244 L223 245"/>`);
const BOY = svg(`<circle cx="200" cy="64" r="24"/>
  <path d="M176 58 L180 42 L189 48 L196 36 L204 46 L212 38 L218 48 L224 56"/>
  <path d="M200 88 L200 100"/>
  <path d="M186 102 L214 102 L220 160 L180 160 Z"/>
  <path d="M180 160 L220 160 L222 186 L204 186 L200 174 L196 186 L178 186 Z"/>
  <path d="M188 188 L188 240"/><path d="M212 188 L212 240"/><path d="M188 244 L177 245"/><path d="M212 244 L223 245"/>`);
const KID = { body: 132, arm: 24 };
const BALL = 13, DISC = 16;

let kidCache = null;
async function kids() {
  if (kidCache) return kidCache;
  const f = (markup, n) => formation({ kind: 'svg', markup, noCrop: true }, n);
  const [girl, girlThrow, girlFree, boy, boyThrow, boyFree] = await Promise.all([
    f(GIRL, KID.body), f(arm(SHOULDER.girlThrow, SPREAD), KID.arm), f(arm(SHOULDER.girlFree, -SPREAD), KID.arm),
    f(BOY, KID.body), f(arm(SHOULDER.boyThrow, -SPREAD), KID.arm), f(arm(SHOULDER.boyFree, SPREAD), KID.arm)]);
  kidCache = { girl, girlThrow, girlFree, boy, boyThrow, boyFree };
  return kidCache;
}

export const PLAY_SCALE = 0.56;
const DOG = CHOPPER_COUNT;
export const MOOD_COUNT = { happy: DOG, play: DOG + 2 * (KID.body + 2 * KID.arm) + BALL + DISC };

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
  const p = await chopperParts();
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

  const k = await kids();
  for (const q of [...k.girl, ...k.girlThrow, ...k.girlFree]) colors.set(gradientAt(0.04 + (q.y + 0.6) * 0.1), 3 * ci++);
  for (const q of [...k.boy, ...k.boyThrow, ...k.boyFree]) colors.set(gradientAt(0.9 + (q.y + 0.6) * 0.08), 3 * ci++);
  for (let b = 0; b < BALL + DISC; b++) colors.set([255, 236, 190], 3 * ci++);
  const sA = new Float32Array(DOG), sB = new Float32Array(DOG), sC = new Float32Array(DOG), sD = new Float32Array(DOG);
  const delay = Float32Array.from({ length: DOG }, (_, d) => hash(d, 5) * 0.35);
  const offX = Float32Array.from({ length: DOG }, (_, d) => hash(d, 11) - 0.5), offY = Float32Array.from({ length: DOG }, (_, d) => hash(d, 13) - 0.65);

  // ---------- play: 12,4 s, erst wirft das Mädchen (Ball), dann der Junge (Frisbee) ----------
  const P = 12.4, H = P / 2, w = TAU / P;
  const size = 0.8, dogSize = 0.5, floor = 0.6;
  const kidY = floor - toN(0, 246)[1] * size, dogY = floor - (toN(0, 254)[1] - toN(0, 160)[1]) * dogSize;
  // Wurfarm: ausholen, nach vorn schwingen (Abwurf bei 0,85 s), zurück; Winkel für den Wurf nach rechts
  const throwAngle = (v) => v < 0.6 ? 0.9 * ease(v / 0.6) : v < 0.85 ? 0.9 - 3 * ease((v - 0.6) / 0.25) : v < 1.6 ? -2.1 * (1 - ease((v - 0.85) / 0.75)) : 0;
  const RELEASE = 0.85, CATCH = 2.15, DROP = 3.4, HOME = 4.6, PICK = 5.2;
  const hand = (sh, dx, ang, ox, oy) => { const [hx, hy] = rot(...toN(sh[0] + dx, sh[1] + ARM + 6), ...toN(...sh), ang); return [ox + hx * size, oy + hy * size]; };

  let t0 = null;
  const behaviour = (T, tx, ty, sw) => {
    if (t0 === null && T) t0 = T;
    const t = T ? T - t0 : CATCH, u = ((t % P) + P) % P;
    const visX = sw?.w && sw?.h ? (sw.w / sw.h) / (2 * PLAY_SCALE) : 1.6;
    const spread = Math.min(1.2, visX - 0.3), girlX = -spread, boyX = spread;
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
      for (let d = 0; d < DOG; d++) {
        const e = ease(clamp01((tk - delay[d]) / 0.65)), a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
        const mx = (sA[d] + sC[d]) / 2 + offX[d] * 0.5, my = (sB[d] + sD[d]) / 2 + offY[d] * 0.35;
        tx[d] = a * sA[d] + b * mx + c * sC[d]; ty[d] = a * sB[d] + b * my + c * sD[d];
      }
    }
    let i = DOG;
    const placeKid = (pts, ox, oy, pivot, ang = 0) => {
      const [pvx, pvy] = toN(...pivot);
      for (const q of pts) { const [qx, qy] = ang ? rot(q.x, q.y, pvx, pvy, ang) : [q.x, q.y]; tx[i] = ox + qx * size; ty[i] = oy + qy * size; i++; }
    };
    // Werfendes Kind dieser Hälfte, das andere jubelt beim Fang
    const throwA = throwAngle(v), cheerOther = hill(v, 2.0, 3.8, 0.35);
    const girlThrowA = half === 0 ? throwA : 0, boyThrowA = half === 1 ? -throwA : 0;
    const girlCheer = half === 1 ? cheerOther : 0, boyCheer = half === 0 ? cheerOther : 0;
    const gy = kidY - 0.05 * girlCheer * Math.abs(Math.sin(10 * w * u)), by = kidY - 0.05 * boyCheer * Math.abs(Math.sin(10 * w * u));
    placeKid(k.girl, girlX, gy, [200, 150]);
    placeKid(k.girlThrow, girlX, gy, SHOULDER.girlThrow, girlThrowA);
    placeKid(k.girlFree, girlX, gy, SHOULDER.girlFree, girlCheer * (2.4 + 0.25 * Math.sin(12 * w * u)) + 0.08 * Math.sin(2 * w * u));
    placeKid(k.boy, boyX, by, [200, 150]);
    placeKid(k.boyThrow, boyX, by, SHOULDER.boyThrow, boyThrowA);
    placeKid(k.boyFree, boyX, by, SHOULDER.boyFree, -boyCheer * (2.4 + 0.25 * Math.sin(12 * w * u)) - 0.08 * Math.sin(2 * w * u));
    const girlHand = hand(SHOULDER.girlThrow, SPREAD, girlThrowA, girlX, gy), boyHand = hand(SHOULDER.boyThrow, -SPREAD, boyThrowA, boyX, by);
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
