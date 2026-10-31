import './show-node-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

// Zwölfte Fassung: Die Drohnenzahl ist frei wählbar (Regler). Jedes Bild jedes Motivs muss für jede wählbare
// Drohnenzahl seines Pakets genau so viele Punkte haben, mit endlichen Koordinaten und Farbe.
const { buildSequence } = await import('../src/scripts/show-scenes.js');
const { OCCASIONS } = await import('../src/content/show-configurator.js');
const { DRONE_RANGES, DRONE_STEP, PACKAGE_NAMES } = await import('../src/content/show-packages.ts');

const countsOf = (pkg) => { const out = []; for (let n = DRONE_RANGES[pkg].min; n <= DRONE_RANGES[pkg].max; n += DRONE_STEP) out.push(n); return out; };
const check = (beats, n, label) => beats.forEach((b, k) => {
  assert.equal(b.pts.length, n, `${label}, Bild ${k}: ${b.pts.length} statt ${n} Punkte`);
  assert.ok(b.pts.every((p) => p.length >= 6 && p.every(Number.isFinite)), `${label}, Bild ${k}: ungültige Koordinaten`);
});

for (const pkg of PACKAGE_NAMES) {
  test(`${pkg}: jedes Motiv hat bei jeder wählbaren Drohnenzahl genau so viele Punkte`, async () => {
    for (const n of countsOf(pkg)) for (const o of OCCASIONS) for (const m of o.motifs) {
      if (!m.tiers[pkg]) continue;
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
