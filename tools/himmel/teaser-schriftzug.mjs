// Schriftzug FLYINGSTΛRS des Konfigurator-Teasers (show-teaser.js, Logo ab 450 Drohnen) als fertige Punktlisten. Der
// Textplaner kostet dafür im Browser rund 120 ms am Stück, genau beim Eintritt der Section (WebKit-Ruckeln an der Grenze
// #ablauf → #preise, Messung 18.11.2026). Nach Änderungen an LOGO_FULL oder den Drohnenzahlen der Abläufe neu laufen lassen:
//   node tools/himmel/teaser-schriftzug.mjs
import { writeFileSync } from 'node:fs';
import { loadTextEngine, textFormation } from '../../src/scripts/text-formation.js';
import { brandText } from '../../src/scripts/scenes/text.js';

const COUNTS = [150, 300]; // 450 und 600 Drohnen minus LOGO_FULL (300)
await loadTextEngine();
const value = brandText('FlyingStars'), out = { value, formations: {} };
for (const n of COUNTS) {
  const f = textFormation(value, n);
  if (!f?.pts.length) throw new Error(`Keine Formation für ${n}`);
  out.formations[n] = { style: f.style, pts: f.pts.map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]) };
}
writeFileSync(new URL('../../src/data/teaser-lettering.json', import.meta.url), JSON.stringify(out));
console.log(COUNTS.map((n) => `${n}: ${out.formations[n].pts.length} Punkte (${out.formations[n].style})`).join(', '), JSON.stringify(out).length, 'Bytes');
