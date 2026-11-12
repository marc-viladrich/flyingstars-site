import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

// Zwölfte Fassung: Die Drohnenzahl ist frei wählbar (Regler). Jedes Bild jedes Motivs muss für jede wählbare
// Drohnenzahl seines Pakets genau so viele Punkte plus ausdrücklich ausgewiesene Offstage-Drohnen haben.
// Originalformationen werden nicht durch Duplikate aufgefüllt; alle Motivpunkte bleiben endlich und farbig.
const { buildSequence } = await import('../src/scripts/show-scenes.js');
const { OCCASIONS, playable } = await import('../src/content/show-configurator.js');
const { DRONE_RANGES, DRONE_STEP, PACKAGE_NAMES } = await import('../src/content/show-packages.ts');

const countsOf = (pkg) => { const out = []; for (let n = DRONE_RANGES[pkg].min; n <= DRONE_RANGES[pkg].max; n += DRONE_STEP) out.push(n); return out; };
const check = (beats, n, label) => beats.forEach((b, k) => {
  assert.ok(Number.isInteger(b.offstageDrones ?? 0) && (b.offstageDrones ?? 0) >= 0);
  assert.equal(b.pts.length + (b.offstageDrones ?? 0), n, `${label}, Bild ${k}: ${b.pts.length} statt ${n} Punkte`);
  assert.ok(b.pts.every((p) => p.length >= 6 && p.every(Number.isFinite)), `${label}, Bild ${k}: ungültige Koordinaten`);
});

for (const pkg of PACKAGE_NAMES) {
  test(`${pkg}: jedes Motiv hat bei jeder wählbaren Drohnenzahl genau so viele Punkte`, async () => {
    for (const n of countsOf(pkg)) for (const o of OCCASIONS) for (const m of o.motifs) {
      if (!playable(m, pkg, n)) continue; // gesperrt (Freischalt-Leiter): ein Link öffnet das Motiv mit seiner Mindestzahl
      check((await buildSequence([m], pkg, n, undefined, o.id)).beats, n, `${o.id}/${m.tiers[pkg].build} ${n}`);
    }
  });
}

test('Eigener Text hat in jeder Schrift an den Bereichsgrenzen genau die Drohnen des Pakets', async () => {
  for (const pkg of PACKAGE_NAMES) for (const n of [DRONE_RANGES[pkg].min, DRONE_RANGES[pkg].max]) for (const style of ['script', 'print', 'initials']) {
    const motif = { id: 'text', label: 'Euer Text', tiers: { [pkg]: { build: `text${pkg}`, caption: 'Euer Text', value: 'Anna & Ben', style, occasion: 'hochzeit' } } };
    check((await buildSequence([motif], pkg, n, undefined, 'hochzeit')).beats, n, `Text ${style} ${pkg} ${n}`);
  }
});

// Wolkenregel, ruhende Wolken, Freischalt-Schwellen und Lichtlauf: scripts/show-clouds.test.mjs (dreizehnte Fassung).

// Source-limited formations keep their complete original figure, with an explicit offstage budget.
test('Bokkenrijders bleibt bei 600 Originalpunkten, zusätzliche Drohnen sind ausdrücklich offstage', async () => {
  const motif = OCCASIONS.find(o => o.id === 'kultur').motifs.find(m => m.tiers.ODYSSEY?.build === 'devilStory');
  for (const n of [650, 800, 1000]) {
    const [b] = (await buildSequence([motif], 'ODYSSEY', n, undefined, 'kultur')).beats;
    assert.equal(b.pts.length, 600);
    assert.equal(b.offstageDrones, n - 600);
    assert.equal(new Set(b.pts.map(p => JSON.stringify(p))).size, 600);
  }
});

test('Kleine bewegte Katalogteile bleiben auch bei großer dunkler Reserve im Anflug still', async () => {
  for (const n of [600, 800, 1000]) {
    // Use the real catalog mapping, including the same occasion ordering as the configurator.
    const o = OCCASIONS.find(o => o.motifs.some(m => m.catalog === 'golfcaddy'));
    const m = o.motifs.find(m => m.catalog === 'golfcaddy');
    const b = (await buildSequence([m], 'ODYSSEY', n, undefined, o.id)).beats.at(-1);
    assert.ok(b.steady, `Golfcaddy ${n}: Bewegung wird trotz Reserve erkannt`);
    for (let j = 0; j < b.pts.length; j++) {
      const p = b.pts[j], start = [...p.slice(0, 3), 1], flight = [...start];
      b.live(p, j, 0, start); b.live(p, j, -2, flight);
      assert.deepEqual(flight.slice(0, 3), start.slice(0, 3), `Golfcaddy ${n}/${j}: Anflugziel steht still`);
    }
  }
});
