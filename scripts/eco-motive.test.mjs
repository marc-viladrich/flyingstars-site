// Nachhaltigkeit der Startseite (Runde 14, 21.11.2026; scenes/eco.js, Reihe ECO_ROW in scripts/himmel/folge.js). Marc: eine
// kompakte Section, rechts die Figuren der früheren Scrollstory (Schallwelle, Flotte, Blitz) mit derselben Engine wie die
// Indoor-Reihe. Wächter: Reihe und Figuren stimmen überein, die Schallwelle steht vorn, Drohnenzahl, keine zwei Drohnen
// aufeinander über die Standzeit, die Startseite nutzt show: eco statt der Scrollstory.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ecoScene, ECO_MOTIFS } from '../src/scripts/scenes/eco.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const src = read('src/scripts/himmel/folge.js');
const row = JSON.parse(src.match(/const ECO_ROW = (\[.*\]);/)[1]);
const N = Number(src.match(/const NE = (\d+);/)[1]);

test('die Reihe in folge.js spielt genau die Figuren aus eco.js, die Schallwelle zuerst', () => {
  assert.deepEqual(row.map(([k]) => k), [...ECO_MOTIFS]);
  assert.equal(row[0][0], 'schall');
  for (const k of ['schall', 'flotte', 'blitz']) assert.ok(ECO_MOTIFS.includes(k), k);
});

test('jede Figur nutzt fast alle Drohnen der Bühne und keine zwei Drohnen liegen aufeinander', () => {
  for (const [key, hold] of row) {
    const { beats: [b] } = ecoScene(key, N);
    assert.ok(b.pts.length <= N && b.pts.length >= N * 0.8, `${key}: ${b.pts.length}`);
    let worst = Infinity;
    for (let t = 0; t <= hold + 1e-9; t += 0.2) {
      const P = b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, j, t, o); return o; });
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) worst = Math.min(worst, Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]));
    }
    assert.ok(worst > 0.012, `${key}: kleinster Abstand ${worst.toFixed(4)}`);
  }
});

test('Startseite: kompakte Nachhaltigkeit mit Bühne statt Scrollstory, Team als Collage', () => {
  for (const file of ['src/content/pages/index.yaml', 'src/content/pages/en/index.yaml', 'src/content/pages/nl/index.yaml']) {
    const yaml = read(file);
    const eco = yaml.slice(yaml.indexOf('id: nachhaltigkeit'), yaml.indexOf('_key: k_001c02ae39915e989410'));
    assert.match(eco, /show: eco/, file);
    assert.doesNotMatch(eco, /\bfacts:/, `${file}: keine Scrollstory-Werte mehr`);
    const team = yaml.slice(yaml.indexOf('id: ueber'), yaml.indexOf('_key: k_43486c946660a912fde1'));
    assert.match(team, /layout: collage/, file);
    assert.equal((team.match(/personId:/g) ?? []).length, 3, `${file}: drei Porträts`);
  }
  const pillars = JSON.parse(read('src/content/sustainability-pillars.json'));
  for (const locale of ['de', 'en', 'nl']) assert.ok(!pillars[locale].pillars.some((p) => p.icon === 'eu'), `${locale}: „Gebaut in der EU“ ist raus (Moritz)`);
});
