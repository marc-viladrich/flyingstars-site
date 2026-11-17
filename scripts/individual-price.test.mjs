import test from 'node:test';
import assert from 'node:assert/strict';
import { DRONE_STEP, DRONES_MIN, DRONES_MAX, SHOW_PACKAGES, individualPrice, snapDrones } from '../src/content/show-packages.ts';

// Preisseite nach Moritz (17.11.2026): freie Konfiguration („Individuelles Paket“) ohne Paketwahl. Die Zahlen stammen aus
// Moritz' Preistext (FAQ „Was kostet eine Show mit 100, 300, 500 oder 1000 Drohnen?“ und Paket HORIZON).
test('freie Konfiguration trifft Moritz’ Zahlen', () => {
  assert.equal(individualPrice(100), 7900);
  assert.equal(individualPrice(200), SHOW_PACKAGES.HORIZON.price);
  assert.equal(individualPrice(300), 25700);
  assert.equal(individualPrice(500), 45300);
  const thousand = individualPrice(1000);
  assert.ok(thousand >= 60000 && thousand < 200000, `1000 Drohnen „hoher fünfstelliger bis niedriger sechsstelliger Bereich“, ist ${thousand}`);
});

test('freie Konfiguration steigt über den ganzen Regler nie ab', () => {
  let previous = -Infinity;
  for (let n = DRONES_MIN; n <= DRONES_MAX; n += DRONE_STEP) {
    const price = individualPrice(n);
    assert.ok(Number.isFinite(price) && price >= previous, `${n} Drohnen: ${price} nach ${previous}`);
    previous = price;
  }
});

test('ODYSSEY ist ein Festpaket mit Mehrleistung: teurer als dieselbe Drohnenzahl frei konfiguriert', () => {
  assert.ok(SHOW_PACKAGES.ODYSSEY.price > individualPrice(SHOW_PACKAGES.ODYSSEY.base));
  assert.equal(individualPrice(SHOW_PACKAGES.SPARK.base), SHOW_PACKAGES.SPARK.price);
});

test('Zahlen außerhalb der Stufen landen auf der wählbaren Stufe', () => {
  assert.equal(individualPrice(205), individualPrice(snapDrones(205)));
  assert.equal(individualPrice(5000), individualPrice(DRONES_MAX));
});
