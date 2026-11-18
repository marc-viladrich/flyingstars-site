import test from 'node:test';
import assert from 'node:assert/strict';
import { DRONE_STEP, DRONES_MIN, DRONES_MAX, SHOW_PACKAGES, PACKAGE_NAMES, SHOW_ARTS, ART_TIER, artMin, artOfPackage, individualPrice, showArtPrice, snapDrones } from '../src/content/show-packages.ts';

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

// Runde 5 (Marc, 18.11.2026): Art der Show (2D · 3D · 3D mit Storytelling) als zweite Hauptgröße neben der Drohnenzahl.
test('Show-Art: Moritz’ Zahlen und die festen Pakete passen ohne Widerspruch zusammen', () => {
  assert.equal(showArtPrice('2d', 100), 7900);
  assert.equal(showArtPrice('2d', 300), 25700);
  assert.equal(showArtPrice('2d', 500), 45300);
  assert.equal(showArtPrice('3d', 200), 15900);
  assert.equal(showArtPrice('story', 300), 34900);
  // jedes feste Paket kostet so viel wie seine Show-Art mit seiner Drohnenzahl im individuellen Paket
  for (const name of PACKAGE_NAMES) assert.equal(showArtPrice(artOfPackage(name), SHOW_PACKAGES[name].base), SHOW_PACKAGES[name].price, name);
  // die Lücke ODYSSEY (34.900) gegen „300 Drohnen ab 25.700“ ist der Storytelling-Aufpreis
  assert.equal(showArtPrice('story', 300) - showArtPrice('3d', 300), 9200);
});

test('Show-Art: Mindestzahl wie das Paket, das sie einführt (2D 100, 3D 200, Storytelling 300)', () => {
  assert.deepEqual(SHOW_ARTS.map(artMin), [100, 200, 300]);
  assert.deepEqual(SHOW_ARTS.map((a) => ART_TIER[a]), ['SPARK', 'HORIZON', 'ODYSSEY']);
  // unter der Mindestzahl gilt der Preis der Mindestzahl (der Konfigurator hebt die Drohnenzahl dann an)
  assert.equal(showArtPrice('3d', 120), showArtPrice('3d', 200));
  assert.equal(showArtPrice('story', 200), showArtPrice('story', 300));
});

test('Show-Art: Preis steigt mit der Drohnenzahl und mit der Art nie ab', () => {
  for (const art of SHOW_ARTS) {
    let previous = -Infinity;
    for (let n = artMin(art); n <= DRONES_MAX; n += DRONE_STEP) { const p = showArtPrice(art, n); assert.ok(Number.isFinite(p) && p >= previous, `${art} ${n}: ${p}`); previous = p; }
  }
  for (let n = DRONES_MIN; n <= DRONES_MAX; n += DRONE_STEP) {
    assert.ok(showArtPrice('2d', n) <= showArtPrice('3d', n) && showArtPrice('3d', n) <= showArtPrice('story', n), `${n} Drohnen`);
  }
  const top = showArtPrice('story', 1000);
  assert.ok(top >= 60000 && top < 200000, `Storytelling mit 1000 Drohnen ${top}`);
});
