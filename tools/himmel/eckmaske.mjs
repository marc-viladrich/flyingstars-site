// Punktmaske für Bilder, die aus einer Kartenecke wachsen (LandingBento, Marc 18.11.2026: „the image grows from the top
// right into the card, masked with this dot mask“). Erzeugt public/media/ecke-punkte.svg (4 : 3, Ecke oben rechts).
// Aufruf: node tools/himmel/eckmaske.mjs
// Gleiches Raster wie der Lichtpunkt-Hover (dotimage.js: Zellen, Punkt je Zelle): nahe der Ecke überlappen die Punkte zur
// geschlossenen Fläche, zur Karte hin werden sie kleiner, bis sie verschwinden. Wie uebergang.mjs: Pfade aus Nullstrecken
// mit runden Enden, je Radius gebündelt.
import { writeFileSync } from 'node:fs';
const W = 480, H = 360, STEP = 10;
const SOLID = 0.36, END = 1.02;            // Abstand zur Ecke (0 = Ecke, 1 = gegenüberliegende Kanten): Fläche bis SOLID, Punkte bis END
const R_MAX = STEP * 0.75;                  // ab 0,71 · STEP schließen sich die Punkte zur Fläche
const bins = new Map();
for (let y = STEP / 2; y < H; y += STEP) {
  for (let x = STEP / 2; x < W; x += STEP) {
    const d = Math.hypot((W - x) / W, y / H);
    const t = Math.min(1, Math.max(0, (d - SOLID) / (END - SOLID)));
    const r = R_MAX * (1 - t) ** 1.35;
    if (r < 0.45) continue;
    const k = (Math.round(r * 4) / 4).toFixed(2);
    (bins.get(k) ?? bins.set(k, []).get(k)).push([x, y]);
  }
}
const paths = [...bins].map(([r, list]) => `<path stroke-width="${+(r * 2).toFixed(1)}" d="${list.map(([x, y]) => `M${x} ${y}h0`).join('')}"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="none" stroke="#fff" stroke-linecap="round">${paths}</g></svg>`;
writeFileSync(new URL('../../public/media/ecke-punkte.svg', import.meta.url), svg);
console.log(`${[...bins.values()].flat().length} Punkte, ${svg.length} Bytes, ${W} × ${H}, Raster ${STEP}`);
