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
  // Runde 16: die Bokkenrijders-Geschichte (Maske ↔ Totenkopf, scenes/bokkenrijders.js) beginnt mit der Originalmaske
  const motif = OCCASIONS.find(o => o.id === 'kultur').motifs.find(m => m.tiers.ODYSSEY?.build === 'bokkenrijdersStory');
  for (const n of [650, 800, 1000]) {
    const [b] = (await buildSequence([motif], 'ODYSSEY', n, undefined, 'kultur')).beats;
    assert.equal(b.pts.length, 600);
    assert.equal(b.offstageDrones, n - 600);
    assert.equal(new Set(b.pts.map(p => JSON.stringify(p))).size, 600);
  }
});

// Runde 9 (Einstufung 3D/3D+): Golfcaddy hat keine 3D-Fassung und spielt nur noch in 2D; in 3D+ hat kein Motiv mehr
// beides zugleich (die Körper nutzen alle Drohnen, Reserve haben nur die räumlichen Katalogformationen). Die Absicht bleibt an
// den Motiven, die diese Lage in der Oberfläche wirklich haben: bewegte Kleinteile (Räder des Golfcaddys, 2D bis 350
// Drohnen) und große dunkle Reserve (Atom in 3D+, 600 bis 1000 Drohnen). Ein leeres Ergebnis scheitert laut.
const stillInFlight = async (key, tier, counts, expect) => {
  const o = OCCASIONS.find(o => o.motifs.some(m => m.catalog === key && m.tiers[tier]));
  assert.ok(o, `${key}: spielt in ${tier} nicht (Einstufung prüfen)`);
  const m = o.motifs.find(m => m.catalog === key);
  for (const n of counts) {
    const beats = (await buildSequence([m], tier, n, undefined, o.id)).beats, b = beats.at(-1);
    assert.ok(b, `${key} ${tier} ${n}: keine Bilder`);
    assert.ok(b.steady, `${key} ${n}: Bewegung wird nicht erkannt`);
    let moving = 0, dark = 0;
    for (let j = 0; j < b.pts.length; j++) {
      const p = b.pts[j], start = [...p.slice(0, 3), 1], flight = [...start], later = [...start];
      b.live(p, j, 0, start); b.live(p, j, -2, flight); b.live(p, j, 1.3, later);
      assert.deepEqual(flight.slice(0, 3), start.slice(0, 3), `${key} ${n}/${j}: Anflugziel steht still`);
      if (Math.hypot(later[0] - start[0], later[1] - start[1], later[2] - start[2]) > 1e-6) moving++;
      if (start[3] < 0.05 || p[3] + p[4] + p[5] === 0) dark++;
    }
    expect({ n, moving, dark, total: b.pts.length });
  }
};
test('Kleine bewegte Katalogteile (Räder) bleiben im Anflug still', async () => {
  await stillInFlight('golfcaddy', 'SPARK', [100, 300, 350], ({ n, moving, total }) => assert.ok(moving > 0 && moving < 0.5 * total, `Golfcaddy ${n}: ${moving} von ${total} bewegt`));
});
test('Große dunkle Reserve: bewegte Formation bleibt im Anflug still (Atom, 3D+)', async () => {
  await stillInFlight('atom', 'ODYSSEY', [600, 800, 1000], ({ n, moving, dark }) => assert.ok(moving > 0 && dark >= 0.5 * n, `Atom ${n}: ${moving} bewegt, ${dark} dunkel`));
});
