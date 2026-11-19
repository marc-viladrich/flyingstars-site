import { test, expect, type Page } from '@playwright/test';

// Sechzehnte Fassung: der Konfigurator steht auf der Preisseite (CFG_PATH überschreibt das, z. B. für die Prüfseite).
const CFG = process.env.CFG_PATH ?? '/drohnenshow-preise/';

// Every motif version may only do what real show drones can do: fly smoothly within speed and acceleration limits,
// never jump (also not in the dark). Effects such as sparks, rain or a heartbeat must be made with light.
// Display units. The preview runs as a time-lapse at the pace of the client's Vercel prototype (a real show takes
// about three times as long); the limits guarantee smooth, bounded motion without jumps. Flight planning in
// show-flight.js aims lower (1.8 and 3); the margin covers the flow drift and staggered starts.
const LIMITS = { speed: 2.6, accel: 5.5 };
const OCCASIONS = ['hochzeit', 'jubilaeum', 'launch', 'kultur', 'silvester', 'festival'];
/** Ohne Bilder gibt es nichts zu messen: Maxima über null Frame-Tripel wären 0 und bestünden jeden Grenzwert. Jede
 * Messung braucht deshalb auswertbare Tripel (regelmäßige Abstände) für mindestens die Hälfte ihrer Dauer bei 60 Hz;
 * gemessen sind es rund 62 je Sekunde. */
const MIN_TRIPLES_PER_SECOND = 30;

/** Highest speed and acceleration of any drone over the recorded frames (regular frame intervals only), with the number
 * of evaluated frame triples and the most drones seen in one of them. */
const measure = (page: Page) => page.evaluate(() => {
  const trace = (window as unknown as { __showTrace: [number, number[]][] }).__showTrace;
  let speed = 0, accel = 0, triples = 0, drones = 0;
  for (let f = 2; f < trace.length; f++) {
    const [t0, p0] = trace[f - 2], [t1, p1] = trace[f - 1], [t2, p2] = trace[f];
    const d1 = t1 - t0, d2 = t2 - t1;
    if (d1 < 0.012 || d2 < 0.012 || Math.abs(d1 - d2) > 0.002) continue;
    const n = Math.min(p0.length, p1.length, p2.length);
    if (!n) continue;
    triples++; drones = Math.max(drones, n / 3);
    for (let k = 0; k < n; k += 3) {
      const v1 = [0, 1, 2].map((q) => (p1[k + q] - p0[k + q]) / d1), v2 = [0, 1, 2].map((q) => (p2[k + q] - p1[k + q]) / d2);
      speed = Math.max(speed, Math.hypot(...v2));
      accel = Math.max(accel, Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]) / ((d1 + d2) / 2));
    }
  }
  (window as unknown as { __showTrace: unknown[] }).__showTrace = [];
  return { speed, accel, triples, drones };
});
/** Grenzwerte erst, wenn die Messung genug Bewegung mit mindestens `drones` Drohnen in der Luft enthält. */
function expectFlyable(result: Awaited<ReturnType<typeof measure>>, label: string, drones: number, seconds: number) {
  test.info().annotations.push({ type: 'measure', description: `${label}: ${JSON.stringify(result)}` });
  expect(result.triples, `${label}: auswertbare Frame-Tripel`).toBeGreaterThanOrEqual(seconds * MIN_TRIPLES_PER_SECOND);
  expect(result.drones, `${label}: Drohnen in der Luft`).toBeGreaterThanOrEqual(drones);
  expect.soft(result.speed, `${label}: speed`).toBeLessThanOrEqual(LIMITS.speed);
  expect.soft(result.accel, `${label}: acceleration`).toBeLessThanOrEqual(LIMITS.accel);
}

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
