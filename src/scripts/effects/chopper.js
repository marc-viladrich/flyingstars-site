// Chopper, der Bürohund, als fliegende Drohnenformation. „Chopper“ ist Slang für Hubschrauber,
// also trägt er eine Propellermütze. Silhouette aus gezeichneten Formen (gleiche Abtastung wie die
// Logos), Ohr, Schwanz und Propeller sind eigene Teile und bewegen sich einzeln.
// Rasse und Fellfarbe sind noch nicht bekannt: Mit einem Foto wird nur body/ear/tail neu gezeichnet.
import { formation, gradientAt } from './swarm.js';

const VB = 'viewBox="0 0 400 300" width="400" height="300"';
const BODY = `<svg xmlns="http://www.w3.org/2000/svg" ${VB}><g fill="#fff">
  <ellipse cx="184" cy="178" rx="88" ry="40" transform="rotate(-8 184 178)"/>
  <ellipse cx="248" cy="160" rx="44" ry="42"/>
  <ellipse cx="292" cy="108" rx="52" ry="48"/>
  <path d="M300 112 C330 104 362 106 374 118 C384 128 380 146 366 150 C346 156 318 152 300 146 Z"/>
  <circle cx="378" cy="118" r="10"/>
  <rect x="236" y="176" width="26" height="78" rx="13" transform="rotate(-58 249 186)"/>
  <rect x="220" y="182" width="24" height="70" rx="12" transform="rotate(-42 232 190)"/>
  <rect x="104" y="180" width="26" height="80" rx="13" transform="rotate(62 117 190)"/>
  <rect x="124" y="186" width="24" height="70" rx="12" transform="rotate(48 136 194)"/>
  <path d="M262 70 C266 44 318 40 326 66 Z"/>
  <rect x="291" y="26" width="6" height="22" rx="3"/>
</g><circle cx="312" cy="98" r="7" fill="#000"/></svg>`;
const EAR = `<svg xmlns="http://www.w3.org/2000/svg" ${VB}><path fill="#fff" d="M266 74 C246 74 232 98 236 132 C238 150 256 156 264 140 C272 120 276 92 266 74 Z"/></svg>`;
const TAIL = `<svg xmlns="http://www.w3.org/2000/svg" ${VB}><path fill="#fff" d="M112 168 C86 158 68 138 60 112 C57 101 68 98 72 107 C82 128 98 144 120 154 Z"/></svg>`;

// Gleicher Rahmen wie rasterize(): 400×300 auf 420 px Kante, 3 px Rand, normiert auf die längere Seite
const S = (420 - 6) / 400, RW = Math.round(400 * S) + 6, RH = Math.round(300 * S) + 6;
const toN = (X, Y) => [(3 + X * S - RW / 2) * 2 / RW, (3 + Y * S - RH / 2) * 2 / RW];

const PARTS = { body: 330, ear: 40, tail: 34 };
const BLADE = 17; // Drohnen je Rotorblatt
export const CHOPPER_COUNT = PARTS.body + PARTS.ear + PARTS.tail + BLADE * 2;

let cache = null;
async function parts() {
  if (cache) return cache;
  // gleicher Rahmen für alle Teile: nicht auf den Inhalt zuschneiden
  const [body, ear, tail] = await Promise.all([[BODY, PARTS.body], [EAR, PARTS.ear], [TAIL, PARTS.tail]]
    .map(([markup, n]) => formation({ kind: 'svg', markup, noCrop: true }, n)));
  cache = { body, ear, tail };
  return cache;
}

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
export { parts as chopperParts };
