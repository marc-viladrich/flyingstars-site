// Runde 14 (Marc: für Gemeinden lieber eine Kirche, „das kann man ja wohl nehmen“): Wächter für die Zuordnung Anlass → Motiv
// des Schwarms (src/scripts/himmel/anlass-motiv.js) an beiden Stellen, Startseite (Anlass-Karten) und Formular, und für den
// vorberechneten Kölner Dom (public/media/himmel/dom-150.json aus tools/himmel/motive-vorberechnen.mjs).
// Aufruf: node --test scripts/himmel-anlass-motiv.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));
const read = (file) => readFileSync(root(file), 'utf8');
const { OCCASION, FORM_OCCASION, HIMMEL_MOTIFS, occasionMotif } = await import('../src/scripts/himmel/anlass-motiv.js');
const { FORM_OCCASION_IDS, occasionLabel, occasionHref } = await import('../src/content/occasions.mjs');
const { domPoints } = await import('../tools/himmel/motive-vorberechnen.mjs');
const catalog = JSON.parse(read('src/content/catalog-motifs.json')).motifs;

test('Gemeinden fliegen den Kölner Dom, an der Anlass-Karte wie im Formular', () => {
  assert.equal(FORM_OCCASION.gemeinden, 'dom');
  for (const locale of ['de', 'en', 'nl']) assert.equal(occasionMotif(occasionLabel('gemeinden', locale)), 'dom', `Bezeichnung ${locale}`);
  // Karte der Startseite: Kicker, Link-Ziel (Anfrage mit ?anlass=gemeinden) und Kartentitel
  assert.equal(occasionMotif('', occasionHref('gemeinden'), 'Ein Fest, bei dem alle mitfeiern'), 'dom');
  assert.ok(!OCCASION.some(([, m]) => m === 'foerderturm'), 'der Förderturm fliegt im Schwarm nicht mehr für Gemeinden');
});

test('jeder Formularwert hat ein Motiv, das es gibt', () => {
  assert.deepEqual(Object.keys(FORM_OCCASION).sort(), [...FORM_OCCASION_IDS].sort(), 'Schlüssel = Anlässe aus occasions.json');
  for (const motif of [...Object.values(FORM_OCCASION), ...OCCASION.map(([, m]) => m)]) {
    assert.ok(catalog[motif] || HIMMEL_MOTIFS[motif], `Motiv ${motif} fehlt`);
  }
});

test('der Schwarm nutzt diese Zuordnung (keine zweite Liste in schwarm.ts)', () => {
  const src = read('src/scripts/himmel/schwarm.ts');
  assert.match(src, /from '\.\/anlass-motiv\.js'/);
  assert.doesNotMatch(src, /const (OCCASION|FORM_OCCASION)\b/);
  assert.doesNotMatch(src, /foerderturm/);
});

test('der Förderturm bleibt im Konfigurator-Katalog', () => {
  assert.ok(catalog.foerderturm);
  assert.match(read('src/content/show-configurator.js'), /catalogMotif\('foerderturm'/);
});

/** Median-Abstand der Lichter in px, wenn der Schwarm das Motiv in eine Bühne w × h setzt (schwarm.ts → aim(): 92 %). */
function spacing(pts, w, h) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const half = Math.max(x1 - x0, y1 - y0) / 2, S = Math.min((w * 0.92) / 2 / ((x1 - x0) / 2 / half), (h * 0.92) / 2 / ((y1 - y0) / 2 / half));
  const nn = pts.map((p, i) => Math.min(...pts.filter((_, j) => j !== i).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])))).sort((a, b) => a - b);
  return { median: (nn[nn.length >> 1] / half) * S, min: (nn[0] / half) * S };
}
const katalog = (k) => JSON.parse(read(`public/media/katalog/${catalog[k].variants.filter((v) => v.points <= 300).at(-1).id}.json`)).points;

test('Dom-Datei = Linienzeichnung des Konfigurators, mit Portal und Kreuzblumen', () => {
  for (const v of HIMMEL_MOTIFS.dom.variants) {
    const file = JSON.parse(read(`public/media/himmel/${v.id}.json`));
    assert.deepEqual(file.points, domPoints(v.drones), `${v.id} veraltet: node tools/himmel/motive-vorberechnen.mjs`);
    assert.equal(file.points.length, v.points);
    // Gold = Portal und Kreuzblumen: das Portal unten, auf jeder Turmspitze eine Kreuzblume
    const gold = file.points.filter((p) => p[3] === 255 && p[4] === 196), top = Math.max(...file.points.map((p) => p[1]));
    assert.ok(gold.some((p) => p[1] < 0), 'Portal fehlt');
    for (const side of [-1, 1]) assert.ok(gold.some((p) => p[1] > top - 0.1 && Math.sign(p[0]) === side), 'Kreuzblume fehlt');
  }
});

test('Dom so dicht wie die Nachbarmotive, im Formular und an der Anlass-Karte (Linien statt Strich)', () => {
  const dom = JSON.parse(read(`public/media/himmel/${HIMMEL_MOTIFS.dom.variants.at(-1).id}.json`)).points;
  // Bühnen: Formular-Himmelsfenster bei 1440 px (687 × 132) und 390 px (310 × 104), Anlass-Kopf bei 1440 px (520 × 240)
  for (const [w, h] of [[687, 132], [310, 104], [520, 240]]) {
    const own = spacing(dom, w, h), others = ['foerderturm', 'mikrofon', 'sportwagen', 'diskokugel', 'handschlag'].map((k) => spacing(katalog(k), w, h).median);
    assert.ok(own.median >= Math.min(...others) * 0.95 && own.median <= Math.max(...others), `${w}×${h}: Dom ${own.median.toFixed(1)} px, Nachbarn ${others.map((x) => x.toFixed(1))}`);
    assert.ok(own.min >= own.median / 3, `${w}×${h}: engster Abstand ${own.min.toFixed(1)} px`);
  }
  // Drohnenzahl im Bereich der Nachbarn (Förderturm 101, Handschlag 104, Doppelherz 100 … Mikrofon 149)
  assert.ok(dom.length >= 95 && dom.length <= 150, `Dom ${dom.length} Drohnen`);
});
