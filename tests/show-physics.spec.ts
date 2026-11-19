import { test, expect } from '@playwright/test';
import { expectFlyable, measure, measureTrace } from './helpers/physics';

// Sechzehnte Fassung: der Konfigurator steht auf der Preisseite (CFG_PATH überschreibt das, z. B. für die Prüfseite).
const CFG = process.env.CFG_PATH ?? '/drohnenshow-preise/';

const OCCASIONS = ['hochzeit', 'jubilaeum', 'launch', 'kultur', 'silvester', 'festival'];

test('Physikmessung verwirft leere und unregelmäßige Traces', () => {
  expect(() => expectFlyable(measureTrace([]), 'Leerer Trace', 1, 1)).toThrow(/auswertbare Frame-Tripel/);
  const irregular = measureTrace([[0, [0, 0, 0]], [0.016, [0, 0, 0]], [0.04, [0, 0, 0]]]);
  expect(() => expectFlyable(irregular, 'Unregelmäßiger Trace', 1, 1)).toThrow(/auswertbare Frame-Tripel/);
});

test('Physikmessung verlangt auch bei genügend Tripeln die erwartete Drohnenzahl', () => {
  const result = measureTrace(Array.from({ length: 32 }, (_, i) => [i / 60, [i / 60, 0, 0]]));
  expect(result.speed).toBeCloseTo(1);
  expectFlyable(result, 'Regelmäßiger Trace', 1, 1);
  expect(() => expectFlyable(result, 'Zu kleine Flotte', 2, 1)).toThrow(/Drohnen in der Luft/);
});

// Runde 6: die Paketwahl ist weg, die Fassung der Motive folgt der Art der Show (Pills 2D · 3D · 3D+, input[name=art]).
// Start mit 2D an seiner Mindestzahl; jede höhere Art hebt die Drohnenzahl selbst auf ihre Mindestzahl (artMin), so
// laufen dieselben drei Fassungen wie früher SPARK 100, HORIZON 200 und ODYSSEY 300.
const ARTS = [['2d', 100, 40], ['3d', 200, 50], ['story', 300, 180]] as const;
for (const occasion of OCCASIONS) {
  test(`Physikalisch fliegbar: ${occasion}, die ganze Show in allen drei Show-Arten`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Die Bewegung ist auf allen Geräten dieselbe.');
    test.setTimeout(900_000);
    await page.clock.install();
    await page.goto(`${CFG}?anlass=${occasion}&art=2d&drohnen=${ARTS[0][1]}#konfigurator`); // ohne Anker lädt der Konfigurator unter der simulierten Uhr nie (whenNear)
    await page.clock.runFor(1000);
    await expect(page.locator('#cfg-occasion input[name=occasion]:checked')).toHaveValue(occasion);
    // long enough for every motif of the sequence to form and play, and for the loop back to the first
    for (const [art, drones, seconds] of ARTS) {
      await page.evaluate(() => { (window as unknown as { __showTrace: unknown[] }).__showTrace = []; });
      const pill = page.locator(`#cfg-arts input[name=art][value="${art}"]`);
      if (!(await pill.isChecked())) await page.locator(`#cfg-arts label[data-art="${art}"]`).click();
      await expect(pill).toBeChecked();
      await page.clock.runFor(1000);
      await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', String(drones));
      await page.clock.runFor(seconds * 1000 - 1000);
      expectFlyable(await measure(page), `${occasion}, ${art}`, drones, seconds);
    }
  });
}

// Zwölfte Fassung: die Drohnenzahl ist frei wählbar; an der Obergrenze des Reglers (mehr Drohnen, dichtere Bilder,
// lebendige Wolke mit Hilbert-Zuordnung) gelten dieselben Grenzen. Dreizehnte Fassung: alle Anlässe, weil erst ab 450
// und 520 Drohnen die freigeschalteten Motive und ihre Teil-Umbauten in der Wolke laufen.
for (const occasion of OCCASIONS) {
  test(`Physikalisch fliegbar: ${occasion} in ODYSSEY mit 600 Drohnen`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Die Bewegung ist auf allen Geräten dieselbe.');
    test.setTimeout(900_000);
    await page.clock.install();
    await page.goto(`${CFG}?anlass=${occasion}&paket=ODYSSEY&drohnen=600#konfigurator`); // ohne Anker lädt der Konfigurator unter der simulierten Uhr nie (whenNear)
    await page.clock.runFor(1000);
    await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', '600');
    await page.evaluate(() => { (window as unknown as { __showTrace: unknown[] }).__showTrace = []; });
    await page.clock.runFor(160_000);
    expectFlyable(await measure(page), `${occasion} at 600`, 600, 160);
  });
}

// Sechzehnte Fassung (Freischalt-Leiter): Motive, die erst ab SPARK 150 bzw. HORIZON 250 spielen (Riesenrad, Lotusblüten,
// Kopfsprung, QR-Code, Tanz, Sektflasche, Drache in HORIZON), laufen an den Obergrenzen der beiden Pakete. Seit Runde 6
// bestimmt die Show-Art die Fassung (2D = SPARK, 3D = HORIZON); ohne `art` gälte 3D, und 190 läge unter dessen Mindestzahl.
for (const occasion of OCCASIONS) {
  test(`Physikalisch fliegbar: ${occasion} mit SPARK 190 und HORIZON 290`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Die Bewegung ist auf allen Geräten dieselbe.');
    test.setTimeout(900_000);
    await page.clock.install();
    for (const [art, n, seconds] of [['2d', 190, 60], ['3d', 290, 70]] as const) {
      await page.goto(`${CFG}?anlass=${occasion}&art=${art}&drohnen=${n}#konfigurator`);
      await page.clock.runFor(1000);
      await expect(page.locator(`#cfg-arts input[name=art][value="${art}"]`)).toBeChecked();
      await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', String(n));
      await page.evaluate(() => { (window as unknown as { __showTrace: unknown[] }).__showTrace = []; });
      await page.clock.runFor(seconds * 1000);
      expectFlyable(await measure(page), `${occasion}, ${art} at ${n}`, n, seconds);
    }
  });
}
