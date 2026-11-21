// Runde 14 (Marc 21.11.2026: Bremen im Logo-Modus „janky“, der Schlüssel im Stadtfest „mega clean“; „Lass uns das doch
// einfach nehmen.“). Wächter: Das Beispiel Bremen zeigt im Logo-Modus bei jeder Drohnenzahl genau die Punkte und Farben
// des Stadtfest-Schlüssels (scenes/wahrzeichen.js, flat('schluessel', n)), über den echten Weg in logo-mode.js; Bearbeiten
// (Liniendichte, Teile entfernen, knappere Show-Fassung) bleibt auf denselben Linien; die übrigen Beispiele sind unverändert.
// Aufruf: node --test src/scripts/logo-landmark.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { flat, SHAPES, COLOURS } from './scenes/wahrzeichen.js';
import { GOLD, WARM } from './show-motion.js';
import { LOGO_EXAMPLES, LANDMARK_EXAMPLES, CONVERTER_EXAMPLES } from './logo-examples.mjs';
import { landmarkFormation, landmarkCount, landmarkSvg } from './logo-landmark.mjs';
import { DENSITIES, densityIndexFromCounts } from './logo-density.mjs';
import { colourRuns, targetKey } from './logo-v10/groups.mjs';
import * as mode from './logo-mode.js';

const dir = new URL('../../public/media/logo-modus/beispiele/', import.meta.url);
const same = (pts, f) => pts.length === f.pts.length && pts.every((q, j) => q.x === f.pts[j][0] && q.y === -f.pts[j][1] && q.c === (COLOURS[f.tag[j]] ?? WARM));
const session = async (init) => mode.logoSession(await mode.exampleFile('bremen'), init);

test('Bremen = Stadtfest-Schlüssel: bei jeder Drohnenzahl dieselben Punkte und Farben (vorberechneter und live Weg)', async () => {
  assert.deepEqual(LANDMARK_EXAMPLES.bremen.shape, 'schluessel');
  for (let n = 100; n <= LANDMARK_EXAMPLES.bremen.max; n += 10) {
    const f = flat('schluessel', n);
    assert.ok(same(await mode.exampleFormation('bremen', n), f), `${n}: Beispielbild weicht vom Stadtfest ab`);
    assert.ok(same(await (await session()).formation(n), f), `${n}: Sitzung weicht vom Stadtfest ab`);
    // die Farben wie im Stadtfest: Schlüssel warmweiß, das Kreuz bzw. Ornament in der Mitte gelb (ab 200)
    const gold = f.tag.filter((t) => t === 'ornament').length;
    assert.equal((await mode.exampleFormation('bremen', n)).filter((q) => q.c === GOLD).length, gold);
    assert.equal(gold > 0, n >= 200, `${n}: gelbes Kreuz ab 200 Drohnen`);
  }
});

test('knappere Show-Fassung: das Motiv bei der Show-Zahl (wie das Stadtfest bei dieser Zahl)', async () => {
  for (const [anchor, budget] of [[200, 150], [300, 200], [150, 100]]) {
    const pts = await mode.exampleFormation('bremen', anchor, budget);
    assert.ok(same(pts, flat('schluessel', budget)), `${anchor} → ${budget}`);
    assert.equal(pts.meta.n, budget); assert.ok(!pts.meta.over);
  }
});

test('Liniendichte: Stufe = feste Punktdichte, Automatik-Griff nach der Konverter-Regel, ein Schritt nach unten ≤ Automatik', async () => {
  const counts = DENSITIES.map((d) => landmarkFormation('bremen', landmarkCount(d)).length);
  for (let i = 1; i < counts.length; i++) assert.ok(counts[i] >= counts[i - 1], `Stufe ${i} braucht weniger als ${i - 1}`);
  for (let n = 100; n <= 300; n += 10) {
    const index = await mode.preparedDensity('bremen', n), auto = flat('schluessel', n).pts.length;
    if (index > 0) assert.ok(counts[index - 1] <= auto, `${n}: Stufe ${index - 1} braucht ${counts[index - 1]} > ${auto}`);
    assert.equal(index, densityIndexFromCounts({ ...counts }, auto) ?? 0, `${n}: Stufe nicht nach der Regel`);
  }
  // von Hand gewählte Stufe: der Schlüssel des Stadtfests bei der Zahl dieser Stufe
  const s = await session({ density: DENSITIES[5] });
  assert.ok(same(await s.formation(200), flat('schluessel', landmarkCount(DENSITIES[5]))));
  assert.equal(s.setOptions({ density: undefined }), true); assert.ok(same(await s.formation(200), flat('schluessel', 200)));
});

test('Teile entfernen: Klick wählt ein Teil, ein zweiter den Schlüssel; entfernte Teile fehlen, Punktabstand bleibt', async () => {
  for (const n of [100, 200, 300]) {
    const s = await session(), pts = await s.formation(n), groups = colourRuns({ points: pts, spacing: pts.meta.spacing });
    const shaft = pts.find((q) => q.cg === pts.meta.colourGroups.find((g) => g.anchor.part === 'shaft').id);
    const key = targetKey(groups, shaft);
    assert.equal(key[0], 'r', `${n}: der Schaft ist ein eigenes Teil`);
    for (const g of pts.meta.colourGroups) {
      s.setRemoved([{ erase: true, anchors: [g.anchor], ghost: [] }]);
      const rest = await s.formation(n), tag = g.anchor.part;
      assert.ok(rest.length < pts.length, `${n} ohne ${tag}: ${rest.length}`);
      assert.ok(!rest.meta.colourGroups.some((x) => x.anchor.part === tag), `${n}: ${tag} ist noch da`);
      assert.ok(Math.abs(rest.meta.spacing / pts.meta.spacing - 1) < 0.25, `${n} ohne ${tag}: Abstand ${rest.meta.spacing} statt ${pts.meta.spacing}`);
    }
    // das ganze Element (zweiter Klick): nur das Ornament bleibt, sofern es eines gibt
    s.setRemoved([{ erase: false, anchors: [pts.meta.elements.find((e) => e.id === 0).anchor], ghost: [] }]);
    const rest = await s.formation(n);
    if (n >= 200) assert.ok(rest.length > 0 && rest.every((q) => q.c === GOLD), `${n}: nur das Ornament bleibt`);
    s.setRemoved([]); assert.ok(same(await s.formation(n), flat('schluessel', n)), `${n}: wiederhergestellt`);
  }
});

test('Minimap: Bild aus denselben Linien (volle Zeichnung), keine zweite Zeichnung als Datei', async () => {
  const svg = landmarkSvg('bremen'), f = await mode.exampleFile('bremen');
  assert.equal(await f.text(), svg); assert.equal(f.type, 'image/svg+xml');
  assert.equal((svg.match(/<path /g) ?? []).length, SHAPES.schluessel(2).length);
  for (const ext of ['svg', 'json', 'raster.json']) assert.ok(!fs.existsSync(new URL(`bremen.${ext}`, dir)), `bremen.${ext} ist ein Rest`);
  // eine hochgeladene Datei mit denselben Bytes ist kein Beispiel: sie läuft durch den Konverter
  const upload = new File([svg], 'bremen.svg', { type: 'image/svg+xml' });
  assert.notEqual(mode.logoSession(upload).formation.toString(), (await session()).formation.toString());
});

test('Beispielliste: Bremen bleibt ein Knopf; Konverter-Beispiele und ihre Daten unverändert (Hash über alle Dateien)', () => {
  assert.ok(LOGO_EXAMPLES.some(([id]) => id === 'bremen'));
  assert.deepEqual(CONVERTER_EXAMPLES, LOGO_EXAMPLES.map(([id]) => id).filter((id) => id !== 'bremen'));
  const names = fs.readdirSync(dir).filter((n) => !['sizes.json', 'rasters-index.json'].includes(n)).sort();
  assert.deepEqual(names, CONVERTER_EXAMPLES.flatMap((id) => [`${id}.json`, `${id}.raster.json`, `${id}.svg`]).sort());
  const all = names.map((n) => `${n} ${createHash('sha256').update(fs.readFileSync(new URL(n, dir))).digest('hex')}\n`).join('');
  // Stand Runde 14 (vor und nach dem Umbau gleich). Ändert sich ein Beispiel bewusst, diesen Wert mit Begründung anpassen.
  assert.equal(createHash('sha256').update(all).digest('hex'), '951aa3642e8af512f8febbf4a6bb04950164c3a5ff1fe3a11754dfcba5b7718d');
});
