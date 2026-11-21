// Motive des Schwarms, die nicht aus FlyingStars' Katalog kommen, als fertige Punktlisten im Katalogformat
// ({ id, key, points: [[x, y, z, r, g, b]] }, y nach oben). Der Schwarm lädt sie wie eine Katalogvariante
// (src/scripts/himmel/schwarm.ts → HIMMEL_MOTIFS), ohne die Wahrzeichen-Engine des Konfigurators mitzuladen.
//
// Kölner Dom für den Anlass Gemeinden/Städte (Runde 14, Marc: Kirche statt Förderturm, „das kann man ja wohl nehmen“):
// dieselbe Linienzeichnung wie im Konfigurator (scenes/wahrzeichen.js → SHAPES.dom, Detailstufe 1: Türme, Giebel, Boden,
// Portal, Kreuzblumen), gleichmäßig abgetastet wie dort (stageSample). Drohnenzahl nach der sichtbaren Dichte: Der Dom ist
// schmal und hoch mit langen Linien, bei 150 Drohnen verschmolzen die Lichter im flachen Formularfenster zu einem Strich
// (3,6 px Abstand, Nachbarn 5–8 px). Bei 100 steht er so dicht wie Förderturm, Mikrofon und Sportwagen; unter 100 fallen
// die Kreuzblumen auf den Spitzen der Abstandsregel zum Opfer. Nach Änderungen am Dom neu laufen lassen:
//   node tools/himmel/motive-vorberechnen.mjs
// Der Wächter scripts/himmel-anlass-motiv.test.mjs vergleicht die Datei mit der Zeichnung.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SHAPES, linesOf } from '../../src/scripts/scenes/wahrzeichen.js';
import { prepareLines, stageSample } from '../../src/scripts/scenes/catalog-resample.js';
import { HIMMEL_MOTIFS } from '../../src/scripts/himmel/anlass-motiv.js';
import { WARM, GOLD } from '../../src/scripts/show-motion.js';

// Farben wie die 2D-Fassung im Konfigurator (wahrzeichen.js → COLOURS): Stein warmweiß, Portal und Kreuzblumen gold
const COLOURS = { portal: GOLD, finial: GOLD, window: GOLD };
const r3 = (v) => Math.round(v * 1000) / 1000 || 0; // ohne -0 (JSON schreibt es als 0)

export function domPoints(n) {
  // Detailstufe 1 fest (flat() wählte unter 150 Drohnen Stufe 0 ohne Portal und Kreuzblumen)
  const polys = SHAPES.dom(1), tags = [...new Set(polys.map((p) => p.tag))], s = stageSample(prepareLines(linesOf(polys, tags)), n);
  return s.pts.map((q) => [r3(q[0]), r3(q[1]), 0, ...(COLOURS[tags[q[2]]] ?? WARM)]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { // nur als Skript, nicht beim Import im Wächter
  for (const v of HIMMEL_MOTIFS.dom.variants) {
    const points = domPoints(v.drones);
    if (points.length !== v.points) throw new Error(`${v.id}: ${points.length} statt ${v.points} Punkte (HIMMEL_MOTIFS anpassen)`);
    const file = new URL(`../../public/media/himmel/${v.id}.json`, import.meta.url);
    writeFileSync(file, JSON.stringify({ id: v.id, key: 'dom', points }));
    console.log(v.id, points.length, 'Punkte');
  }
}
