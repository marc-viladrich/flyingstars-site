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

// Kinder (Runde 7, Marc: „die beiden Kinder sehen absolut komplett scheiße aus“): keine Strichfiguren mehr, sondern
// gefüllte Silhouetten im selben Stil wie Chopper (Kontur hell, Fläche locker gefüllt), mit Kinderproportionen: großer
// Kopf (gut ein Viertel der Größe), kurze Beine, Arme mit Ellbogen. Jede Figur besteht aus Teilen mit eigener Farbe
// (Haut, Kleidung, Haare), damit Kopf, Haare und Kleid lesbar getrennt sind; überlappende Flächen werden im Hautteil
// ausgespart, so steht keine Drohne doppelt. Mädchen: Zöpfe, Kleid; Junge: kurze Haare mit Wirbel, T-Shirt, Shorts.
// Die Arme sind eigene Teile und drehen um die Schulter (werfen, jubeln). Gleicher Rahmen und Maßstab wie der Hund.
const VB = 'viewBox="0 0 400 300" width="400" height="300"';
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" ${VB}>${inner}</svg>`;
const fill = (d, c = '#fff') => `<g fill="${c}">${d}</g>`;
const limb = (d, w, c = '#fff') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const HEAD = '<circle cx="200" cy="62" r="25"/>';
const FACE = '<circle cx="191" cy="65" r="3.4"/><circle cx="209" cy="65" r="3.4"/>';
const SMILE = '<path d="M192 75 Q200 81 208 75" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>';
// Kinderproportionen: Kopf um 12 % größer und tiefer gesetzt, Rumpf 10 px tiefer, dadurch kürzere Beine (Füße bleiben)
const headG = (inner) => `<g transform="translate(200 73) scale(1.12) translate(-200 -62)">${inner}</g>`;
const torsoG = (inner) => `<g transform="translate(0 10)">${inner}</g>`;
const GIRL_HAIR = '<path d="M174 70 C171 43 186 33 200 33 C214 33 229 43 226 70 C223 60 217 52 207 49 C200 55 188 56 181 53 C177 58 175 64 174 70 Z"/><ellipse cx="168" cy="76" rx="8.5" ry="13" transform="rotate(18 168 76)"/><ellipse cx="232" cy="76" rx="8.5" ry="13" transform="rotate(-18 232 76)"/>';
const DRESS = '<path d="M182 99 L218 99 L224 111 L215 115 L216 126 L238 177 Q200 186 162 177 L184 126 L185 115 L176 111 Z"/>';
const GIRL_SHOES = '<ellipse cx="182" cy="242" rx="10" ry="5.5"/><ellipse cx="218" cy="242" rx="10" ry="5.5"/>';
const GIRL_LEGS = limb('M190 186 L186 235', 13) + limb('M210 186 L214 235', 13);
const BOY_HAIR = '<path d="M175 67 C172 42 188 33 202 34 C218 35 229 46 225 67 C221 56 214 50 204 52 C195 49 185 52 178 59 Z"/><path d="M193 37 L197 27 L203 35 L210 29 L211 39 Z"/>';
const SHIRT = '<path d="M183 99 L217 99 L231 108 L226 123 L217 119 L217 151 L183 151 L183 119 L174 123 L169 108 Z"/>';
const SHORTS_TOP = '<path d="M183 150 L217 150 L220 181 L203 181 L200 167 L197 181 L180 181 Z"/>';
const BOY_SHOES = '<ellipse cx="182" cy="242" rx="10" ry="5.5"/><ellipse cx="218" cy="242" rx="10" ry="5.5"/>';
const BOY_LEGS = limb('M189 189 L186 235', 13) + limb('M211 189 L214 235', 13);
// Schultern (Drehpunkt der Arme) und Hände (Wurfobjekt), je Kind die Wurfhand
const SHOULDER = { girlThrow: [216, 116], girlFree: [184, 116], boyThrow: [184, 118], boyFree: [216, 118] };
const HAND = { girlThrow: [242, 166], girlFree: [158, 166], boyThrow: [158, 167], boyFree: [242, 167] };
/** Arm als Teil: aus dem Ärmel, Ellbogen leicht nach außen, Hand als Kreis. */
const arm = (key, sleeve, elbow) => { const [hx, hy] = HAND[key]; return svg(fill(`<circle cx="${hx}" cy="${hy}" r="6.5"/>`) + limb(`M${sleeve[0]} ${sleeve[1] + 10} L${elbow[0]} ${elbow[1] + 10} L${hx} ${hy - 5}`, 9.5)); };
const PARTS = {
  girl: [
    // Haut: Kopf, Hals, Beine; Haare und Kleid ausgespart, Augen als Aussparung
    [svg(fill(torsoG('<rect x="195" y="84" width="10" height="17"/>')) + fill(headG(HEAD)) + GIRL_LEGS + fill(headG(GIRL_HAIR + FACE) + torsoG(DRESS) + GIRL_SHOES, '#000') + headG(SMILE)), 130, 'skin'],
    [svg(fill(torsoG(DRESS) + GIRL_SHOES)), 92, 'dress'],
    [svg(fill(headG(GIRL_HAIR))), 54, 'hairGirl'],
  ],
  boy: [
    [svg(fill(torsoG('<rect x="195" y="84" width="10" height="17"/>')) + fill(headG(HEAD)) + BOY_LEGS + fill(headG(BOY_HAIR + FACE) + torsoG(SHIRT + SHORTS_TOP) + BOY_SHOES, '#000') + headG(SMILE)), 130, 'skin'],
    [svg(fill(torsoG(SHIRT))), 74, 'shirt'],
    [svg(fill(torsoG(SHORTS_TOP) + BOY_SHOES)), 62, 'shorts'],
    [svg(fill(headG(BOY_HAIR))), 44, 'hairBoy'],
  ],
};
const ARMS = {
  girlThrow: arm('girlThrow', [222, 113], [235, 136]), girlFree: arm('girlFree', [178, 113], [165, 136]),
  boyThrow: arm('boyThrow', [173, 120], [163, 140]), boyFree: arm('boyFree', [227, 120], [237, 140]),
};
const KID = { arm: 34 };
const KID_BODY = { girl: PARTS.girl.reduce((s, p) => s + p[1], 0), boy: PARTS.boy.reduce((s, p) => s + p[1], 0) };
const BALL = 13, DISC = 16;
/** Farben der Teile: Haut warm hell, Kleidung in den Markenfarben, Haare dunkler. */
const KID_COLOR = {
  skin: () => [252, 226, 204], dress: (q) => gradientAt(0.02 + (q.y + 0.2) * 0.12), hairGirl: () => [255, 200, 104],
  shirt: (q) => gradientAt(0.97 - (q.y + 0.2) * 0.1), shorts: () => [128, 140, 255], hairBoy: () => [214, 138, 82],
};

let kidCache = null;
async function kids() {
  if (kidCache) return kidCache;
  const f = (markup, n) => formation({ kind: 'svg', markup, noCrop: true }, n);
  const sets = await Promise.all(['girl', 'boy'].map((k) => Promise.all(PARTS[k].map(([m, n, tag]) => f(m, n).then((pts) => pts.map((q) => ({ x: q.x, y: q.y, tag })))))));
  const [girlThrow, girlFree, boyThrow, boyFree] = await Promise.all(['girlThrow', 'girlFree', 'boyThrow', 'boyFree'].map((k) => f(ARMS[k], KID.arm)));
  kidCache = { girl: sets[0].flat(), boy: sets[1].flat(), girlThrow, girlFree, boyThrow, boyFree };
  return kidCache;
}

export const PLAY_SCALE = 0.56;
const DOG = CHOPPER_COUNT;
export const MOOD_COUNT = { happy: DOG, play: DOG + KID_BODY.girl + KID_BODY.boy + 4 * KID.arm + BALL + DISC };

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
  for (const q of k.girl) colors.set(KID_COLOR[q.tag](q), 3 * ci++);
  for (let a = 0; a < 2 * KID.arm; a++) colors.set(KID_COLOR.skin(), 3 * ci++);
  for (const q of k.boy) colors.set(KID_COLOR[q.tag](q), 3 * ci++);
  for (let a = 0; a < 2 * KID.arm; a++) colors.set(KID_COLOR.skin(), 3 * ci++);
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
  const hand = (key, ang, ox, oy) => { const [hx, hy] = rot(...toN(...HAND[key]), ...toN(...SHOULDER[key]), ang); return [ox + hx * size, oy + hy * size]; };

  let t0 = null;
  const behaviour = (T, tx, ty, sw) => {
    if (t0 === null && T) t0 = T;
    const t = T ? T - t0 : CATCH, u = ((t % P) + P) % P;
    const visX = sw?.w && sw?.h ? (sw.w / sw.h) / (2 * PLAY_SCALE) : 1.6;
    // Abstand zum Bühnenrand: ausgestreckter Arm samt Hand (Runde 7) bleibt auch bei 390 px im Bild
    const spread = Math.min(1.2, visX - 0.42), girlX = -spread, boyX = spread;
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
    placeKid(k.girlFree, girlX, gy, SHOULDER.girlFree, girlCheer * (2.05 + 0.2 * Math.sin(12 * w * u)) + 0.08 * Math.sin(2 * w * u));
    placeKid(k.boy, boyX, by, [200, 150]);
    placeKid(k.boyThrow, boyX, by, SHOULDER.boyThrow, boyThrowA);
    placeKid(k.boyFree, boyX, by, SHOULDER.boyFree, -boyCheer * (2.05 + 0.2 * Math.sin(12 * w * u)) - 0.08 * Math.sin(2 * w * u));
    const girlHand = hand('girlThrow', girlThrowA, girlX, gy), boyHand = hand('boyThrow', boyThrowA, boyX, by);
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
