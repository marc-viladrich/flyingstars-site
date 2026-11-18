// Chopper in Stimmungen (Runde 4, 18.11.2026): derselbe Hund wie in chopper.js (gleiche Silhouette, Ohr, Schwanz,
// Propellermütze), hier nicht fliegend, sondern mit Gefühl:
//   happy  – Danke-Seite: wedelt, Propeller dreht, alle paar Sekunden ein Rückwärtssalto
//   sad    – 404: Kopf hängt, Schwanz hängt, Propeller steht, ab und zu ein Seufzer; kühle Farben
//   play   – Hochzeit: zwei Kinder aus Lichtpunkten werfen ihm einen Ball zu, er springt und fängt ihn
// Alles in denselben normierten Koordinaten wie chopper.js (400 × 300 Rahmen). Bei reduzierter Bewegung ruft der
// Schwarm die Formation mit T = 0 auf; jede Stimmung zeigt dann ein ruhiges Standbild (POSTER).
import { formation, gradientAt } from './swarm.js';
import { chopperParts, CHOPPER_COUNT } from './chopper.js';

const S = (420 - 6) / 400, RW = Math.round(400 * S) + 6, RH = Math.round(300 * S) + 6;
const toN = (X, Y) => [(3 + X * S - RW / 2) * 2 / RW, (3 + Y * S - RH / 2) * 2 / RW];
const fromN = (x, y) => [((x * RW) / 2 + RW / 2 - 3) / S, ((y * RW) / 2 + RH / 2 - 3) / S];
const BLADE = 17;

// Kinder im selben Rahmen und Maßstab wie der Hund (Füße auf derselben Grundlinie y ≈ 252). Große Köpfe, kurze Beine:
// so liest man sie ohne Beschriftung als Kinder. Arme sind eigene Teile, damit sie werfen und jubeln können.
const VB = 'viewBox="0 0 400 300" width="400" height="300"';
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" ${VB}><g fill="#fff">${inner}</g></svg>`;
// Kind 1: Mädchen mit Zopf und Kleid, wirft mit dem rechten Arm
const GIRL = svg(`<circle cx="200" cy="58" r="31"/>
  <path d="M172 40 C156 44 150 62 156 84 C160 98 170 104 176 100 C168 88 166 70 178 52 Z"/><circle cx="160" cy="44" r="9"/>
  <rect x="193" y="86" width="14" height="12" rx="4"/>
  <path d="M184 96 L216 96 C224 98 228 106 230 116 L246 184 L154 184 L170 116 C172 106 176 98 184 96 Z"/>
  <rect x="181" y="182" width="13" height="62" rx="6"/><rect x="206" y="182" width="13" height="62" rx="6"/>
  <ellipse cx="184" cy="248" rx="13" ry="7"/><ellipse cx="216" cy="248" rx="13" ry="7"/>`);
const GIRL_ARM_L = svg('<rect x="168" y="100" width="12" height="66" rx="6" transform="rotate(16 174 104)"/><circle cx="164" cy="166" r="8"/>');
const GIRL_ARM_R = svg('<rect x="220" y="100" width="12" height="66" rx="6" transform="rotate(-130 226 104)"/><circle cx="267" cy="66" r="8"/>');
// Kind 2: Junge mit kurzen Haaren, T-Shirt und Hose, jubelt mit beiden Armen
const BOY = svg(`<circle cx="200" cy="62" r="30"/>
  <path d="M170 56 C170 30 230 28 231 56 C222 46 206 42 196 46 C188 42 178 46 170 56 Z"/>
  <rect x="193" y="90" width="14" height="10" rx="4"/>
  <path d="M180 98 L220 98 C228 100 232 108 232 118 L230 166 L170 166 L168 118 C168 108 172 100 180 98 Z"/>
  <path d="M172 164 L228 164 L226 182 L174 182 Z"/>
  <rect x="176" y="178" width="20" height="66" rx="8"/><rect x="204" y="178" width="20" height="66" rx="8"/>
  <ellipse cx="184" cy="248" rx="14" ry="7"/><ellipse cx="216" cy="248" rx="14" ry="7"/>`);
const BOY_ARM_L = svg('<rect x="166" y="102" width="12" height="62" rx="6" transform="rotate(150 172 106)"/><circle cx="141" cy="52" r="8"/>');
const BOY_ARM_R = svg('<rect x="222" y="102" width="12" height="62" rx="6" transform="rotate(-150 228 106)"/><circle cx="259" cy="52" r="8"/>');
const KID = { body: 150, arm: 22 };
const BALL = 13;

let kidCache = null;
async function kids() {
  if (kidCache) return kidCache;
  const f = (markup, n) => formation({ kind: 'svg', markup, noCrop: true }, n);
  const [girl, girlL, girlR, boy, boyL, boyR] = await Promise.all([
    f(GIRL, KID.body), f(GIRL_ARM_L, KID.arm), f(GIRL_ARM_R, KID.arm), f(BOY, KID.body), f(BOY_ARM_L, KID.arm), f(BOY_ARM_R, KID.arm)]);
  kidCache = { girl, girlL, girlR, boy, boyL, boyR };
  return kidCache;
}

export const PLAY_SCALE = 0.56;
export const MOOD_COUNT = { happy: CHOPPER_COUNT, sad: CHOPPER_COUNT, play: CHOPPER_COUNT + 2 * (KID.body + 2 * KID.arm) + BALL };

const rot = (x, y, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Kopf-Drohnen des Hundes (Kopf, Schnauze, Mütze), damit er ihn hängen lassen kann. */
function headMask(body) {
  return body.map((q) => { const [X, Y] = fromN(q.x, q.y); return (X > 250 && Y < 146) || (X > 238 && Y < 96); });
}

/**
 * Setzt den Hund in tx/ty ab Index i. pose: Position, Größe, Blickrichtung, Ganzkörper-Drehung, Kopfneigung,
 * Schwanz-, Ohr- und Propellerwinkel. Gibt den nächsten freien Index und die Lage der Schnauze zurück.
 */
function putDog(p, mask, tx, ty, i, pose) {
  const { x = 0, y = 0, size = 0.78, face = 1, spin = 0, head = 0, headDrop = 0, tail = 0, ear = 0, blade = 0, bladeLen = 1, lie = 0 } = pose;
  const [cx, cy] = toN(230, 160), [nx, ny] = toN(258, 132), [tbx, tby] = toN(116, 161), [ebx, eby] = toN(266, 78);
  const [pcx, pcy] = toN(294, 27), half = toN(352, 0)[0] - toN(294, 0)[0];
  const put = (qx, qy) => {
    const [rx, ry] = rot(qx, qy, cx, cy, spin);
    tx[i] = x + (rx - cx) * size * face; ty[i] = y + (ry - cy) * size; i++;
  };
  const headRot = (qx, qy) => { const [hx, hy] = rot(qx, qy, nx, ny, head); return [hx, hy + headDrop]; };
  // liegen: Beine unterhalb der Bauchlinie zusammenschieben (lie = 0 steht, 1 liegt)
  const belly = toN(0, 200)[1];
  const fold = (qx, qy) => [qx, qy > belly ? belly + (qy - belly) * (1 - 0.72 * lie) : qy];
  p.body.forEach((q, k) => mask[k] ? put(...headRot(q.x, q.y)) : put(...fold(q.x, q.y)));
  for (const q of p.ear) put(...headRot(...rot(q.x, q.y, ebx, eby, ear)));
  for (const q of p.tail) put(...rot(q.x, q.y, tbx, tby, tail));
  const [hx, hy] = headRot(pcx, pcy);
  for (let b = 0; b < 2; b++) {
    const ang = blade + b * Math.PI;
    for (let k = 1; k <= BLADE; k++) { const u = (k / BLADE) * bladeLen; put(...headRot(pcx + Math.cos(ang) * half * u, pcy + Math.sin(ang) * half * u * 0.12)); }
    void hx; void hy;
  }
  // Schnauze (für den Ball): gleiche Transformation wie die Punkte
  const [mx0, my0] = headRot(...toN(376, 132));
  const [mx, my] = rot(mx0, my0, cx, cy, spin);
  return { i, mouth: [x + (mx - cx) * size * face, y + (my - cy) * size] };
}

/** Farben je Drohne in derselben Reihenfolge wie putDog/putKid. */
function dogColors(p, out, i, tone) {
  for (const q of [...p.body, ...p.ear, ...p.tail]) out.set(tone((q.x + 0.9) / 1.8), 3 * i++);
  for (let k = 0; k < BLADE * 2; k++) out.set([150, 245, 250], 3 * i++);
  return i;
}

/**
 * Stimmung als Formation für Swarm.follow(). Liefert { count, colors, behaviour }.
 * @param {'happy'|'sad'|'play'} mood
 */
export async function chopperMood(mood) {
  const p = await chopperParts();
  const mask = headMask(p.body);
  const count = MOOD_COUNT[mood];
  const colors = new Uint8Array(count * 3);
  // traurig: nur der kühle Teil des Verlaufs (Violett bis Cyan), sonst der volle FlyingStars-Verlauf
  const tone = mood === 'sad' ? (t) => gradientAt(0.55 + t * 0.45) : gradientAt;
  let ci = dogColors(p, colors, 0, tone);
  let k = null;
  if (mood === 'play') {
    k = await kids();
    // Kinder warm (links Orange, rechts Cyan), der Ball hell wie ein Lichtlauf
    for (const q of [...k.girl, ...k.girlL, ...k.girlR]) { colors.set(gradientAt(0.05 + (q.y + 0.6) * 0.12), 3 * ci++); }
    for (const q of [...k.boy, ...k.boyL, ...k.boyR]) { colors.set(gradientAt(0.88 + (q.y + 0.6) * 0.1), 3 * ci++); }
    for (let b = 0; b < BALL; b++) colors.set([255, 236, 190], 3 * ci++);
  }

  let t0 = null;
  const behaviour = (T, tx, ty, sw) => {
    if (t0 === null && T) t0 = T;
    const POSTER = { happy: 0.6, sad: 0, play: 2.15 }[mood];
    const t = T ? T - t0 : POSTER;
    if (mood === 'happy') {
      // alle 5 s ein Salto (1,3 s), dazwischen fröhliches Schweben
      const P = 5, u = (t + 3.4) % P, sal = u < 1.3 ? u / 1.3 : -1;
      const flip = sal >= 0 ? -2 * Math.PI * ease(sal) : 0;
      const jump = sal >= 0 ? -Math.sin(Math.PI * sal) * 0.34 : 0;
      putDog(p, mask, tx, ty, 0, {
        x: 0, y: 0.04 + Math.sin(t * 2.2) * 0.025 + jump, size: 0.8, spin: flip,
        head: Math.sin(t * 2.2) * 0.06, tail: Math.sin(t * 13) * 0.55, ear: Math.sin(t * 5) * 0.22 - (sal >= 0 ? 0.3 : 0),
        blade: t * (sal >= 0 ? 16 : 9),
      });
      return;
    }
    if (mood === 'sad') {
      // Seufzer alle 7 s: Kopf hebt sich kurz und sinkt wieder
      const u = t % 7, sigh = u > 4 && u < 6 ? Math.sin(Math.PI * (u - 4) / 2) : 0;
      putDog(p, mask, tx, ty, 0, {
        x: 0, y: 0.2 + Math.sin(t * 0.9) * 0.006, size: 0.8, lie: 1,
        head: 0.22 - sigh * 0.14, headDrop: 0.17 - sigh * 0.05, tail: -1.25 + Math.sin(t * 0.7) * 0.04, ear: 0.35, blade: 0.35, bladeLen: 0.8,
      });
      return;
    }
    // play: Wurf, Flug, Sprung, Fang, Ball rollt zurück, Mädchen hebt ihn auf (6 s)
    const P = 6.2, u = t % P;
    // Kinder größer als der Hund (sein Kopf reicht ihnen etwa bis zur Brust), alle Füße auf einer Grundlinie
    const size = 0.8, dogSize = 0.5, floor = 0.6, ground = floor - 0.511 * size;
    // Abstand der Kinder folgt der Bühnenbreite (Handy 4:3, sonst 16:9), damit niemand angeschnitten wird
    const visX = sw?.w && sw?.h ? (sw.w / sw.h) / (2 * PLAY_SCALE) : 1.6;
    const spread = Math.min(1.2, visX - 0.3), girlX = -spread, dogX = 0.02, boyX = spread;
    // Hund schaut zum Mädchen (nach links)
    const jumpK = clamp01((u - 1.55) / 1.1), jump = -Math.sin(Math.PI * jumpK) * 0.3;
    const caught = u > 2.15 && u < 3.5;
    const excite = u > 2.1 && u < 4 ? 1 : 0;
    let i = 0;
    const dog = putDog(p, mask, tx, ty, i, {
      x: dogX, y: floor - 0.463 * dogSize + jump, size: dogSize, face: -1,
      spin: jumpK > 0 && jumpK < 1 ? -0.35 * Math.sin(Math.PI * jumpK) : 0,
      head: jumpK > 0 && jumpK < 1 ? -0.25 * Math.sin(Math.PI * jumpK) : Math.sin(t * 2) * 0.04,
      tail: Math.sin(t * (excite ? 15 : 8)) * 0.55, ear: Math.sin(t * 4) * 0.2, blade: t * 10,
    });
    i = dog.i;
    // Kinder: Teile im eigenen Rahmen, dann verschoben und skaliert
    const placeKid = (pts, ox, oy, pivot, ang) => {
      const [pvx, pvy] = pivot ? toN(...pivot) : [0, 0];
      for (const q of pts) {
        const [qx, qy] = pivot ? rot(q.x, q.y, pvx, pvy, ang) : [q.x, q.y];
        tx[i] = ox + qx * size; ty[i] = oy + qy * size; i++;
      }
    };
    // Wurfarm: ausholen (nach hinten), werfen (nach vorn), zurück in die Ausgangslage
    const throwA = u < 0.55 ? -0.7 * ease(u / 0.55) : u < 0.8 ? -0.7 + 1.5 * ease((u - 0.55) / 0.25) : u < 1.6 ? 0.8 * (1 - ease((u - 0.8) / 0.8)) : 0;
    const girlBob = excite ? -Math.abs(Math.sin(t * 6)) * 0.03 : 0;
    const gy = ground + girlBob;
    placeKid(k.girl, girlX, gy);
    placeKid(k.girlL, girlX, gy);
    placeKid(k.girlR, girlX, gy, [226, 104], throwA);
    // Junge: jubelt beim Fang mit hüpfenden Armen, sonst winkt er leicht
    const boyHop = excite ? -Math.abs(Math.sin(t * 7)) * 0.07 : 0;
    const wave = excite ? Math.sin(t * 12) * 0.25 : Math.sin(t * 2.4) * 0.12;
    placeKid(k.boy, boyX, ground + boyHop);
    placeKid(k.boyL, boyX, ground + boyHop, [172, 106], wave);
    placeKid(k.boyR, boyX, ground + boyHop, [228, 106], -wave);
    // Ball
    const [hx0, hy0] = rot(...toN(267, 66), ...toN(226, 104), throwA);
    const hand = [girlX + hx0 * size, gy + hy0 * size];
    const feet = [girlX + 0.24, floor - 0.035];
    let bx, by;
    if (u < 0.8) [bx, by] = hand;
    else if (u < 2.15) {
      // Flugbahn bis zur Schnauze (die sich mit dem Sprung bewegt): Parabel mit Scheitel über dem Hund
      const f = ease((u - 0.8) / 1.35), [mx, my] = dog.mouth;
      bx = hand[0] + (mx - hand[0]) * f; by = hand[1] + (my - hand[1]) * f - Math.sin(Math.PI * f) * 0.55;
    } else if (u < 3.5) [bx, by] = dog.mouth;
    else if (u < 4.9) {
      // fallen lassen, zweimal aufspringen, zum Mädchen rollen
      const f = (u - 3.5) / 1.4, [mx, my] = dog.mouth;
      bx = mx + (feet[0] - mx) * ease(f);
      const g = feet[1], drop = f < 0.25 ? my + (g - my) * (f / 0.25) ** 2 : g - Math.abs(Math.sin((f - 0.25) / 0.75 * Math.PI * 2)) * 0.08 * (1 - f);
      by = drop;
    } else if (u < 5.6) { const f = ease((u - 4.9) / 0.7); bx = feet[0] + (hand[0] - feet[0]) * f; by = feet[1] + (hand[1] - feet[1]) * f; }
    else [bx, by] = hand;
    const r = 0.034;
    for (let b = 0; b < BALL; b++) {
      if (b < 9) { const a = (b / 9) * Math.PI * 2 + t * 3; tx[i] = bx + Math.cos(a) * r; ty[i] = by + Math.sin(a) * r; }
      else { const a = b * 2.1; tx[i] = bx + Math.cos(a) * r * 0.35; ty[i] = by + Math.sin(a) * r * 0.35; }
      i++;
    }
  };
  return { count, colors, behaviour };
}
