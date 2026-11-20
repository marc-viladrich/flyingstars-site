// Indoor-Reihe (scenes/indoor.js, Reihe in scripts/himmel/folge.js). Runde 10 (Marc, 20.11.2026): Indoor-Shows sind meist
// Business-Events, darum Marketing- und geometrische Motive statt Herz, Gesicht, Initialen und Ring; „geometrische Formen,
// die man mit 20 bis 50 Drohnen machen kann“. Wächter: Reihe und Motive stimmen überein, keine privaten Liebesmotive,
// Drohnenzahl im Indoor-Rahmen, keine zwei Drohnen aufeinander, solange ein Motiv steht und sich bewegt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indoorScene, INDOOR_MOTIFS, MIN_DRONES } from '../src/scripts/scenes/indoor.js';

const N = 50;
const src = readFileSync(new URL('../src/scripts/himmel/folge.js', import.meta.url), 'utf8');
const row = JSON.parse(src.match(/const INDOOR_ROW = (\[.*\]);/)[1]);
const GEOMETRIC = ['wuerfel', 'tetraeder', 'formen', 'raster', 'lissajous'];

/** Kleinster Abstand zweier Drohnen im Raum über die Standzeit (alle 0,1 s). */
function tightest(key, hold) {
  const { beats: [b] } = indoorScene(key, N);
  let worst = Infinity;
  for (let t = 0; t <= hold + 1e-9; t += 0.1) {
    const P = b.pts.map((p, j) => { const o = [p[0], p[1], p[2] || 0, 1]; b.live?.(p, j, t, o); return o; });
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) worst = Math.min(worst, Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]));
  }
  return worst;
}

test('die Reihe in folge.js spielt genau die Motive aus indoor.js', () => {
  assert.deepEqual(row.map(([k]) => k).sort(), [...INDOOR_MOTIFS].sort());
});

test('keine privaten Liebesmotive in der Indoor-Reihe (Business-Event)', () => {
  for (const k of ['herz', 'smiley', 'initialen', 'ring']) assert.ok(!INDOOR_MOTIFS.includes(k), k);
  assert.doesNotMatch(src, /"(herz|smiley|initialen|ring)"/);
});

test('Marcs behaltene Motive und die neuen geometrischen Formen sind dabei', () => {
  for (const k of ['welle', 'spirale', 'stern', 'krone', 'noten', 'diamant', ...GEOMETRIC]) assert.ok(INDOOR_MOTIFS.includes(k), k);
});

test('jedes Motiv nutzt 20 bis 50 Drohnen, die neuen Formen auch weniger', () => {
  for (const k of INDOOR_MOTIFS) {
    const n = indoorScene(k, N).beats[0].pts.length;
    assert.ok(n >= MIN_DRONES && n <= N, `${k}: ${n}`);
  }
  assert.ok(GEOMETRIC.some((k) => indoorScene(k, N).beats[0].pts.length <= 36), 'mindestens eine Form mit wenigen Drohnen');
  assert.throws(() => indoorScene('herz', N), /fehlt/);
});

test('keine zwei Drohnen aufeinander, auch während der Bewegung', () => {
  const hold = Object.fromEntries(row.map(([k, h = 1.4]) => [k, h]));
  for (const k of INDOOR_MOTIFS) {
    const d = tightest(k, hold[k]);
    assert.ok(d >= (GEOMETRIC.includes(k) ? 0.07 : 0.02), `${k}: ${d.toFixed(3)}`);
  }
});

test('Formen-Morph: jede Ecke trägt eine Drohne (36 Drohnen für Dreieck, Quadrat, Sechseck)', () => {
  const { beats: [b] } = indoorScene('formen', N);
  assert.equal(b.pts.length % 12, 0);
});
