// Runde 14 (Marc: man soll sofort sehen, dass der Text im Formular-Himmel variabel ist): Wächter für den Auftakt
// EURE SHOW → EUER TAG → heute → EURE SHOW (src/scripts/himmel/himmel-texte.js, gespielt von schwarm.ts). Das Verhalten im
// Browser (einmal, erst im Blick, nicht nach einer Eingabe, keine Rotation bei reduzierter Bewegung) prüft
// tests/himmel-formular-auftakt.spec.ts.
// Aufruf: node --test scripts/himmel-formular-auftakt.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (file) => readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');
const { SKY, START_COUNT, introTexts, skyDate } = await import('../src/scripts/himmel/himmel-texte.js');

test('Auftakt: Start, Tag, heutiges Datum, Start – in jeder Sprache', () => {
  const day = new Date(2026, 10, 21);
  assert.deepEqual(introTexts('de', day), ['EURE SHOW', 'EUER TAG', '21.11.26', 'EURE SHOW']);
  assert.deepEqual(introTexts('en', day), ['YOUR SHOW', 'YOUR DAY', '21 NOV 2026', 'YOUR SHOW']);
  assert.deepEqual(introTexts('nl', day), ['JULLIE SHOW', 'JULLIE DAG', '21 NOV 2026', 'JULLIE SHOW']);
});

test('Datum so, wie man es in der Sprache liest', () => {
  assert.equal(skyDate('de', 2027, 3, 5), '05.03.27');
  assert.equal(skyDate('en', 2027, 3, 5), '5 MAR 2027');
  assert.equal(skyDate('nl', 2027, 3, 5), '5 MRT 2027');
  assert.equal(skyDate('nl', 2027, 5, 1), '1 MEI 2027');
  assert.equal(skyDate('nl', 2027, 10, 12), '12 OKT 2027');
});

test('Start und Tag liegen vorberechnet bereit (der Textplaner lädt erst für das Datum, im Worker)', () => {
  for (const lang of ['de', 'en', 'nl']) {
    const fixed = JSON.parse(read(`public/media/himmel/texte-${lang}.json`));
    for (const word of [SKY[lang].start, SKY[lang].day]) assert.ok(fixed[`t:${word}:${START_COUNT}`]?.length > 50, `${lang}: ${word} fehlt, node tools/himmel/texte-vorberechnen.mjs`);
  }
  const src = read('src/scripts/himmel/schwarm.ts');
  assert.match(src, /textFormationAsync/);
  assert.doesNotMatch(src, /loadTextEngine/, 'Texte am Himmel rechnet der Worker, nicht der Hauptthread');
});

test('der Schwarm spielt den Auftakt als Einmal-Folge, eine Eingabe beendet ihn', () => {
  const src = read('src/scripts/himmel/schwarm.ts');
  assert.match(src, /spec: intro, react: form/);
  assert.match(src, /once: true/);
  assert.match(src, /if \('seq' in slot\.spec && slot\.spec\.once\) on\(/, 'jede Eingabe ersetzt den Auftakt sofort');
  // Das Himmelsfenster ist für Screenreader verborgen: die Rotation wird nicht vorgelesen
  assert.match(src, /el\.className = `hm-own hm-own-\$\{place\}`; el\.setAttribute\('aria-hidden', 'true'\)/);
});
