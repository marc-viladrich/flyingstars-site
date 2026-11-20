// Mischfarben an Kanten (geglättete Randpixel) auf die erklärten Logofarben legen: jeder Paletteneintrag wird zur nächsten
// Zielfarbe. Ändert nur Farben, nie Lagen oder Punktzahlen. node snap-palette.mjs <beispiel.json> "r,g,b" "r,g,b" …
import fs from 'node:fs';
const [file, ...t] = process.argv.slice(2), targets = t.map((s) => s.split(',').map(Number));
const d = JSON.parse(fs.readFileSync(file)), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const before = d.palette.length;
d.palette = d.palette.map((c) => targets.reduce((best, x) => (dist(c, x) < dist(c, best) ? x : best), targets[0]).slice());
fs.writeFileSync(file, JSON.stringify(d));
console.log(file.split('/').pop(), before, 'Einträge →', new Set(d.palette.map((c) => c.join())).size, 'Farben');
