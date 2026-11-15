// Punktübergang zwischen zwei Sectionfarben: erzeugt eine kachelbare SVG-Maske (public/media/labor/uebergang.svg).
// Aufruf: node tools/labor/uebergang.mjs [seed=7]
// Oben (über der Kante) lösen sich Punkte der unteren Farbe nach oben auf, unten tauchen Punkte der oberen Farbe ein.
// Unregelmäßig, aber gleichmäßig verteilt (Mindestabstand wächst mit der Entfernung zur Kante), in der Breite nahtlos.
import { writeFileSync } from 'node:fs';
const W = 576, UP = 84, DOWN = 44, H = UP + DOWN;
let seed = +(process.argv[2] || 7);
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// d = Abstand zur Kante (0…1 der jeweiligen Zone). Die Flächendeckung fällt weich auf null, die Punkte werden dabei kleiner.
const size = (d) => 2.4 - 1.5 * d ** 0.8;                       // Radius 2,4 → 0,9 px
const cover = (d, top) => (top ? 0.56 : 0.4) * (1 - d) ** 1.9;   // Deckung an der Kante 56 % (oben) bzw. 40 % (unten)
const gap = (d, top) => Math.min(70, 0.78 * Math.sqrt((Math.PI * size(d) ** 2) / (0.87 * Math.max(cover(d, top), 1e-4))));
const dots = [];
const far = (x, y, need) => dots.every((p) => { let dx = Math.abs(p.x - x); dx = Math.min(dx, W - dx); return Math.hypot(dx, p.y - y) >= (need + p.g) / 2; });
for (let i = 0; i < 70000; i++) {
  const x = rnd() * W, up = rnd() < UP / H, d = rnd(), r = size(d) * (0.88 + rnd() * 0.24);
  // Mittelpunkt mindestens einen Radius von der Kante: Kein Punkt wird von der Kante zerschnitten
  const y = up ? UP - r - d * (UP - r - 2) : UP + r + d * (DOWN - r - 2);
  const g = gap(d, up);
  if (far(x, y, g)) dots.push({ x, y, g, r });
}
// nach Radius bündeln: je Stärke ein Pfad aus Nullstrecken mit runden Enden (kleinste Datei)
const bins = new Map();
for (const p of dots) { const k = (Math.round(p.r * 4) / 4).toFixed(2); (bins.get(k) ?? bins.set(k, []).get(k)).push(p); }
const n = (v) => Math.round(v);
const paths = [...bins].map(([r, list]) => `<path stroke-width="${+(r * 2).toFixed(1)}" d="${list.map((p) => `M${n(p.x)} ${n(p.y)}h0`).join('')}"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="none" stroke="#fff" stroke-linecap="round">${paths}</g></svg>`;
writeFileSync(new URL('../../public/media/labor/uebergang.svg', import.meta.url), svg);
console.log(`${dots.length} Punkte, ${svg.length} Bytes, Kachel ${W} × ${H} px, Kante bei ${UP} px`);
