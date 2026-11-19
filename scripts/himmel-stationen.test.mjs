// Himmel-Abstände (himmel.css) hängen an den Section-IDs, die auch die Stationstabelle des Schwarms nennt
// (src/scripts/himmel/schwarm.ts, plan()). Die ID ist dort der Vertrag zwischen Inhalt und Himmel (index.yaml, Kopfkommentar
// „Vertrag mit dem Himmel-Agenten“); ein zusätzliches Daten-Attribut würde dieselbe Station ein zweites Mal pflegen. Darum
// wacht dieser Test, dass jede ID, an der himmel.css Platz reserviert, eine Station mit passender Bühne ist und in allen
// drei Sprachen als Section existiert (Audit 2, C2).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read = (file) => readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');

const css = read('src/styles/himmel.css').replace(/\/\*[\s\S]*?\*\//g, '');
const ids = [...new Set([...css.matchAll(/#([a-z][\w-]*)/g)].map((m) => m[1]))];
const schwarm = read('src/scripts/himmel/schwarm.ts');
const station = (id) => schwarm.split('\n').find((line) => line.includes(`sel: '#${id}'`));

test('himmel.css reserviert Platz nur an Stationen des Schwarms', () => {
  assert.deepEqual(ids.sort(), ['projekte', 'warum-drohnen']);
  for (const id of ids) assert.ok(station(id), `#${id} ist keine Station in schwarm.ts`);
  // Fläche unter dem Text für die Show-Folge, Luft über dem Kopf für die hohe Figur
  assert.match(station('warum-drohnen'), /folge: true/);
  assert.match(station('projekte'), /\bup: \d+/);
});

test('jede Station mit reserviertem Platz ist in DE, EN und NL eine Section der Startseite', () => {
  for (const file of ['src/content/pages/index.yaml', 'src/content/pages/en/index.yaml', 'src/content/pages/nl/index.yaml']) {
    const yaml = read(file);
    for (const id of ids) assert.match(yaml, new RegExp(`^\\s+id: ${id}$`, 'm'), `${file}: id ${id} fehlt`);
  }
});
