// Runde 9, Punkt 1 (Marc 19.11.2026, Cupra: „wenn ich das Liniendichte-Handle eins runtersetze, geht die Drohnenanzahl von
// 114 auf 233 hoch“). Wächter: Im Automatikzustand steht der Griff auf der gemessenen Stufe des automatischen Bilds, und
// ein Schritt nach unten braucht nie mehr Drohnen als die Automatik, für jedes Beispiel bei jeder Drohnenstufe.
// Aufruf: node --test src/scripts/logo-density.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DENSITIES, densityIndexFromCounts, searchDensityIndex } from './logo-density.mjs';

const dir = new URL('../../public/media/logo-modus/beispiele/', import.meta.url);
const ids = JSON.parse(fs.readFileSync(new URL('sizes.json', dir))).map((x) => x.id);

test('Regel: nächste Zahl, aber nur mit einer unteren Nachbarin unter der Automatik', () => {
  assert.equal(densityIndexFromCounts({ 2: 80, 3: 101, 4: 161 }, 114), 3); // Cupra bei 100 (gemessen im Browser)
  assert.equal(densityIndexFromCounts({ 2: 80, 3: 130, 4: 161 }, 114), 3); // 130 näher als 80, untere Nachbarin 80 ≤ 114
  assert.equal(densityIndexFromCounts({ 1: 70, 2: 110, 3: 118 }, 114), 2); // Gleichstand der Abstände → die untere
  assert.equal(densityIndexFromCounts({ 0: 300 }, 254), 0); // schon die dünnste Stufe braucht mehr: ganz unten
  assert.equal(densityIndexFromCounts({ 5: 100 }, 100), null); // ohne gemessene Nachbarin keine Aussage
});

test('Suche: wenige Messungen, ein Schritt nach unten nie über der Automatik (auch bei nicht ganz monotoner Kurve)', async () => {
  const curves = { linear: (i) => 20 + 30 * i, flat: (i) => Math.min(260, 40 + 40 * i), bumpy: (i) => 50 + 25 * i + (i % 3 === 0 ? 12 : 0) };
  for (const [name, f] of Object.entries(curves)) for (let auto = 30; auto <= 520; auto += 7) {
    let calls = 0;
    const { index, counts } = await searchDensityIndex(async (i) => { calls++; return f(i); }, auto);
    assert.ok(calls <= 8, `${name} ${auto}: ${calls} Messungen`);
    if (index > 0) assert.ok(counts[index - 1] <= auto, `${name} ${auto}: Stufe ${index - 1} braucht ${counts[index - 1]}`);
    assert.ok(index >= 0 && index < DENSITIES.length);
  }
});

for (const id of ids) test(`Beispiel ${id}: gemessene Stufe je Drohnenstufe, ein Schritt nach unten ≤ Automatik`, () => {
  const data = JSON.parse(fs.readFileSync(new URL(`${id}.json`, dir)));
  assert.ok(data.density, `${id}: density fehlt (tools/v10/configurator-density.mjs im Ordner 23 laufen lassen)`);
  for (let n = 100; n <= 200; n += 10) {
    const d = data.density[n]; assert.ok(d, `${id} ${n}: fehlt`);
    const raw = data.formations[data.steps[n]];
    assert.equal(d.index, densityIndexFromCounts(d.counts, d.auto) ?? 0, `${id} ${n}: gespeicherte Stufe passt nicht zur Regel`);
    if (d.index > 0) assert.ok(d.counts[d.index - 1] <= d.auto, `${id} ${n}: Stufe ${d.index - 1} braucht ${d.counts[d.index - 1]} > ${d.auto}`);
    // gemessene Zahlen steigen mit der Dichte (sonst wäre „ein Schritt nach unten“ zwischen Handstufen nicht verlässlich)
    const measured = Object.entries(d.counts).map(([i, c]) => [+i, c]).sort((a, b) => a[0] - b[0]);
    for (let k = 1; k < measured.length; k++) assert.ok(measured[k][1] >= measured[k - 1][1], `${id} ${n}: Stufe ${measured[k][0]} (${measured[k][1]}) < Stufe ${measured[k - 1][0]} (${measured[k - 1][1]})`);
    assert.ok(raw);
  }
});

// Runde 10b (Marc 20.11.2026: „bei komplexeren hochgeladenen Logos wird die Liniendichte in der Mitte angesetzt, und wenn ich
// sie runterschiebe, steigt die Drohnenanzahl“). Wächter mit echten Wappen über den echten Konverter, auf dem Weg für
// hochgeladene Logos (keine vorberechneten Stufen): Bremen, dessen Automatik bei 100 Drohnen gröber ist als Stufe 0, und
// Nieheim und Berlin (bei 200), deren Automatik innerhalb der Skala liegt. Gemessen wird wie im Browser (effectiveDensity: contentPipeline mit density).
const live = async (id) => {
  const V = new URL('./logo-v10/', import.meta.url);
  const { convert } = await import(new URL('converter/convert.mjs', V));
  const { contentPipeline } = await import(new URL('content-fit.mjs', V));
  const R = JSON.parse(fs.readFileSync(new URL(`${id}.raster.json`, dir)));
  const raster = async (size) => { const im = R[size] ?? R[512]; return { width: im.width, height: im.height, data: new Uint8ClampedArray(Buffer.from(im.rgba, 'base64')) }; };
  return async (n, density) => (await contentPipeline(raster, convert, { flex: 'auto', part: 'auto', drones: n, ...(density == null ? {} : { density }) }, {})).result.points.length;
};
// (bei 100 gewünschten Drohnen; gemessen im Browser: Bremen 266 automatisch, Stufe 0 braucht 293)
// Runde 12: Bremen ist kein Wappen mehr (Schlüssel ohne Schild, Automatik innerhalb der Skala); unter den Beispielen gibt es
// keinen Fall „Automatik gröber als Stufe 0“ mehr (geprüft bei 100: Nieheim, Lamborghini, DHL, Firefox). Die Suche dafür
// prüft der synthetische Test unten mit den Arsenal-Zahlen.
for (const id of []) test(`hochgeladenes Wappen ${id}: Automatik gröber als Stufe 0 → Griff ganz unten nach EINER Umrechnung`, async () => {
  const count = await live(id), auto = await count(100);
  let calls = 0;
  const { index, counts } = await searchDensityIndex(async (i) => { calls++; return count(100, DENSITIES[i]); }, auto);
  assert.equal(index, 0); assert.equal(calls, 1, `${calls} Umrechnungen`);
  assert.ok(counts[0] >= auto, `Stufe 0 braucht ${counts[0]}, Automatik ${auto}`);
});
for (const id of ['nieheim', 'berlin']) test(`hochgeladenes Wappen ${id}: Griff auf der gemessenen Stufe, ein Schritt nach unten braucht nie mehr Drohnen`, async () => {
  const count = await live(id), auto = await count(200);
  const { index, counts } = await searchDensityIndex((i) => count(200, DENSITIES[i]), auto);
  assert.ok(index > 0, `${id}: Stufe ${index}`);
  const below = counts[index - 1] ?? (await count(200, DENSITIES[index - 1]));
  assert.ok(below <= auto, `${id}: Stufe ${index - 1} braucht ${below} > Automatik ${auto}`);
});
test('Suche beginnt bei Stufe 0: liegt die Automatik darunter, genügt eine Messung', async () => {
  let calls = 0;
  const { index } = await searchDensityIndex(async (i) => { calls++; return 662 + 400 * i; }, 583); // Arsenal-Wappen bei 200
  assert.equal(index, 0); assert.equal(calls, 1);
});
