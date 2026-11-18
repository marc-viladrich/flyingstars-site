// Vorberechnung der Kampagnen-Schriftzüge als Drohnenformation (src/scripts/text-formation.js, FS-Einstrich wie im
// Konfigurator; das Werkzeug kennt kein #, deshalb ohne). Ausgabe: src/components/engagement/formations.json, Punkte normiert auf die Breite (x 0..1, y 0..h/w).
import { writeFileSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const tf = await import(root + '/src/scripts/text-formation.js');
await tf.loadTextEngine();
const out = {};
for (const [key, text, n] of [['KEIN BOCK AUF NAZIS', 'KEIN BOCK AUF NAZIS', 300], ['#BÖLLERCIAO', 'BÖLLERCIAO', 200]]) {
  const r = tf.textFormation(text, n);
  const xs = r.pts.map((p) => p[0]), ys = r.pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = x1 - x0;
  // y im Werkzeug zeigt nach oben, im SVG nach unten
  out[key] = { drones: r.pts.length, ratio: +((y1 - y0) / w).toFixed(4), pts: r.pts.map((p) => [+((p[0] - x0) / w).toFixed(4), +((y1 - p[1]) / w).toFixed(4)]) };
}
writeFileSync(root + '/src/components/engagement/formations.json', JSON.stringify(out) + '\n');
console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.drones} Drohnen, Verhältnis ${v.ratio}`).join('\n'));
