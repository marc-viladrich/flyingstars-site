// Punktübergang zwischen zwei Sectionfarben: kachelbare SVG-Masken (public/media/uebergang*.svg), docs/himmel.md → Punktübergänge.
// Aufruf: node tools/himmel/uebergang.mjs [seed=11]
//
// Die Maske zeigt, wie weit die Farbe einer Fläche über ihre Kante hinaus in die Nachbarsection reicht (weiß = Farbe der
// Fläche). Unten liegt die Kante. Dort stehen die Punkte so dicht und groß, dass sie sich überlappen: Die Fläche endet in einer
// Kontur aus Punkten, nicht in einer geraden Linie (Marc, 18.11.: „I can see very clearly a straight line“). Nach oben werden
// sie lichter und kleiner. Punktgröße wie beim Lichtpunkt-Hover auf Bildern (effects/dotimage.js: Raster 8 px, Radius
// 1,3–4 px). Damit es nicht nach Raster aussieht („factory built“), schwanken Reichweite und Dichte entlang der Breite
// (weiche, in der Breite periodische Verläufe), die Punkte liegen als Blue Noise. In der Breite nahtlos: Abstände rechnen über
// die Kachelkante, Punkte am Rand werden auf der Gegenseite wiederholt.
import { writeFileSync } from 'node:fs';

// Zwei Kacheln mit denselben Punktgrößen: breit (72 px Bandhöhe, ab 700 px) und schmal (32 px, Handy). Kürzer schneiden oder
// skalieren ginge nicht: Abgeschnitten entstünde wieder eine gerade Kante, skaliert würden die Punkte winzig.
const KACHELN = [{ file: 'uebergang.svg', W: 960, H: 72 }, { file: 'uebergang-schmal.svg', W: 480, H: 32 }];
const seed0 = +(process.argv[2] || 11);
for (const { file, W, H } of KACHELN) {
  let seed = seed0;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const TAU = Math.PI * 2;
  // weicher, in x periodischer Verlauf aus drei Wellen (Perioden W, W/2, W/3), Werte 0…1
  const wave = () => { const ph = [rnd(), rnd(), rnd()].map((v) => v * TAU), a = [1, 0.55, 0.3]; return (x) => (a.reduce((s, k, i) => s + k * Math.sin(((i + 1) * TAU * x) / W + ph[i]), 0) / a.reduce((s, k) => s + k, 0) + 1) / 2; };
  const reachAt = wave(), denseAt = wave();
  const reach = (x) => H * (0.55 + 0.45 * reachAt(x));                         // wie weit die Punkte reichen: 55–100 % der Kachel
  const cover = (d, x) => 0.93 * (1 - d) ** 1.45 * (0.78 + 0.22 * denseAt(x)); // Flächendeckung, an der Kante gut 90 %
  const radius = (d) => 1.4 + 3.2 * (1 - d) ** 1.2;                             // 4,6 px an der Kante, 1,4 px am Rand
  const dots = [];
  const far = (x, y, g) => dots.every((p) => { let dx = Math.abs(p.x - x); dx = Math.min(dx, W - dx); return dx * dx + (p.y - y) ** 2 >= ((g + p.g) / 2) ** 2; });
  for (let i = 0; i < 400000 && dots.length < 6000; i++) {
    const x = rnd() * W, R = reach(x), d = rnd() ** 1.5;                        // d: 0 = Kante, 1 = äußerster Punkt (mehr Versuche an der Kante)
    const c = cover(d, x); if (c < 0.004) continue;
    const r = radius(d) * (0.86 + rnd() * 0.28), y = H - d * R + (rnd() - 0.5) * 3;
    // Mindestabstand aus Deckung und Radius; an der Kante dürfen sich Punkte überlappen, damit die Fläche ohne Linie ausläuft
    const g = (0.5 + 0.4 * Math.min(1, d / 0.35)) * Math.sqrt((Math.PI * r * r) / c);
    if (far(x, y, g)) dots.push({ x, y, r, g });
  }
  const f = (v) => +v.toFixed(1);
  const parts = [];
  for (const p of dots) for (const dx of [0, -W, W]) { const x = p.x + dx; if (x + p.r < 0 || x - p.r > W) continue; parts.push({ x, y: p.y, r: p.r }); }
  // nach Radius bündeln (Viertelpixel): je Stärke ein Pfad aus Nullstrecken mit runden Enden (kleinste Datei)
  const bins = new Map();
  for (const p of parts) { const k = (Math.round(p.r * 4) / 4).toFixed(2); (bins.get(k) ?? bins.set(k, []).get(k)).push(p); }
  const paths = [...bins].sort((a, b) => a[0] - b[0]).map(([r, list]) => `<path stroke-width="${+(r * 2).toFixed(1)}" d="${list.map((p) => `M${f(p.x)} ${f(p.y)}h0`).join('')}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="none" stroke="#fff" stroke-linecap="round">${paths}</g></svg>`;
  writeFileSync(new URL(`../../public/media/${file}`, import.meta.url), svg);
  console.log(`${file}: ${dots.length} Punkte, ${svg.length} Bytes, Kachel ${W} × ${H} px, Kante unten`);
}
