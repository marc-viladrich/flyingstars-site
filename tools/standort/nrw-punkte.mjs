#!/usr/bin/env node
// Punktkarte NRW für den Abschnitt „Standort“ (Über uns, 17.11.2026). Kein Gebäudefoto im Bestand, deshalb trägt eine
// Karte aus Lichtpunkten: Nordrhein-Westfalen als Raster wie ein Drohnenfeld, zum Zuhause im Ruhrgebiet hin heller.
// Umriss: Natural Earth 1:10m Admin 1 (gemeinfrei), nrw-natural-earth.json. Ausgabe:
//   public/media/standort-nrw.svg   Punkte, ohne Beschriftung (Beschriftung und Markierungen setzt Location.astro)
//   public/media/standort-nrw-maske.svg  dieselben Punkte voll deckend, Maske des Lichtkegels
//   src/lib/nrw-map.mjs             Projektion, damit Markierungen auf denselben Koordinaten sitzen
// Aufruf: node tools/standort/nrw-punkte.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const {ring} = JSON.parse(readFileSync(here('./nrw-natural-earth.json'), 'utf8'));
const LAT0 = 51.5, K = Math.cos(LAT0 * Math.PI / 180), SCALE = 400, PAD = 12;
const lons = ring.map(([x]) => x), lats = ring.map(([, y]) => y);
const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
const px = (lon) => PAD + (lon - minLon) * K * SCALE, py = (lat) => PAD + (maxLat - lat) * SCALE;
const width = Math.ceil(px(maxLon) + PAD), height = Math.ceil(py(minLat) + PAD);
const poly = ring.map(([lon, lat]) => [px(lon), py(lat)]);
const inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
// Zuhause: Mitte zwischen Büro (Essen) und Hauptsitz (Gelsenkirchen)
const home = [px(7.07), py(51.50)];
const STEP = 22, R = 3.4, dots = [], mask = [];
for (let row = 0, y = PAD; y < height; row++, y += STEP * 0.866) {
  for (let x = PAD + (row % 2 ? STEP / 2 : 0); x < width; x += STEP) {
    if (!inside(x, y)) continue;
    const d = Math.hypot(x - home[0], y - home[1]);
    const a = 0.26 + 0.52 * Math.exp(-(d * d) / (2 * 120 * 120));
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}" fill-opacity="${a.toFixed(2)}"/>`);
    mask.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}"/>`);
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><g fill="#ede6da">${dots.join('')}</g></svg>\n`;
writeFileSync(here('../../public/media/standort-nrw.svg'), svg);
// Maske für den wandernden Lichtkegel (Location.astro, Runde 9): dieselben Punkte, voll deckend
writeFileSync(here('../../public/media/standort-nrw-maske.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><g fill="#000">${mask.join('')}</g></svg>\n`);
writeFileSync(here('../../src/lib/nrw-map.mjs'), `// Erzeugt von tools/standort/nrw-punkte.mjs, nicht von Hand ändern.
export const NRW_MAP = ${JSON.stringify({minLon, maxLat, k: K, scale: SCALE, pad: PAD, width, height})};
/** Lage eines Orts auf public/media/standort-nrw.svg in Prozent der Bildbreite und -höhe. */
export function nrwPosition(lat, lon) {
  const {minLon, maxLat, k, scale, pad, width, height} = NRW_MAP;
  return {x: (pad + (lon - minLon) * k * scale) / width * 100, y: (pad + (maxLat - lat) * scale) / height * 100};
}
`);
console.log(`${dots.length} Punkte, ${width} × ${height}, ${(svg.length / 1024).toFixed(1)} KB`);
