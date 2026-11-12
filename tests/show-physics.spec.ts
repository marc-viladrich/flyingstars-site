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

/** Highest speed and acceleration of any drone over the recorded frames (regular frame intervals only). */
const measure = (page: Page) => page.evaluate(() => {
  const trace = (window as unknown as { __showTrace: [number, number[]][] }).__showTrace;
  let speed = 0, accel = 0;
  for (let f = 2; f < trace.length; f++) {
    const [t0, p0] = trace[f - 2], [t1, p1] = trace[f - 1], [t2, p2] = trace[f];
    const d1 = t1 - t0, d2 = t2 - t1;
    if (d1 < 0.012 || d2 < 0.012 || Math.abs(d1 - d2) > 0.002) continue;
    for (let k = 0; k < Math.min(p0.length, p1.length, p2.length); k += 3) {
      const v1 = [0, 1, 2].map((q) => (p1[k + q] - p0[k + q]) / d1), v2 = [0, 1, 2].map((q) => (p2[k + q] - p1[k + q]) / d2);
      speed = Math.max(speed, Math.hypot(...v2));
      accel = Math.max(accel, Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]) / ((d1 + d2) / 2));
    }
  }
  (window as unknown as { __showTrace: unknown[] }).__showTrace = [];
  return { speed, accel };
});

for (const occasion of OCCASIONS) {
  test(`Physikalisch fliegbar: ${occasion}, die ganze Show in allen drei Paketen`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Die Bewegung ist auf allen Geräten dieselbe.');
    test.setTimeout(900_000);
    await page.clock.install();
    await page.goto(CFG);
    await page.clock.runFor(1000);
    await page.locator(`#cfg-occasion label[data-occasion="${occasion}"]`).click();
    // long enough for every motif of the sequence to form and play, and for the loop back to the first
    for (const [k, seconds] of [[0, 40], [1, 50], [2, 180]] as const) {
      await page.evaluate(() => { (window as unknown as { __showTrace: unknown[] }).__showTrace = []; });
      await page.locator(`label:has([name=pkg][value="${k}"])`).click();
      await page.clock.runFor(seconds * 1000);
      const { speed, accel } = await measure(page);
      expect.soft(speed, `speed, package ${k}`).toBeLessThanOrEqual(LIMITS.speed);
      expect.soft(accel, `acceleration, package ${k}`).toBeLessThanOrEqual(LIMITS.accel);
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
    const { speed, accel } = await measure(page);
    expect.soft(speed, `${occasion} speed at 600`).toBeLessThanOrEqual(LIMITS.speed);
    expect.soft(accel, `${occasion} acceleration at 600`).toBeLessThanOrEqual(LIMITS.accel);
  });
}

// Sechzehnte Fassung (Freischalt-Leiter): Motive, die erst ab SPARK 150 bzw. HORIZON 250 spielen (Riesenrad, Lotusblüten,
// Kopfsprung, QR-Code, Tanz, Sektflasche, Drache in HORIZON), laufen an den Obergrenzen der beiden Pakete.
for (const occasion of OCCASIONS) {
  test(`Physikalisch fliegbar: ${occasion} mit SPARK 190 und HORIZON 290`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Die Bewegung ist auf allen Geräten dieselbe.');
    test.setTimeout(900_000);
    await page.clock.install();
    for (const [n, seconds] of [[190, 60], [290, 70]] as const) {
      await page.goto(`${CFG}?anlass=${occasion}&drohnen=${n}#konfigurator`);
      await page.clock.runFor(1000);
      await expect(page.locator('#cfg-field')).toHaveAttribute('data-points', String(n));
      await page.evaluate(() => { (window as unknown as { __showTrace: unknown[] }).__showTrace = []; });
      await page.clock.runFor(seconds * 1000);
      const { speed, accel } = await measure(page);
      expect.soft(speed, `${occasion} speed at ${n}`).toBeLessThanOrEqual(LIMITS.speed);
      expect.soft(accel, `${occasion} acceleration at ${n}`).toBeLessThanOrEqual(LIMITS.accel);
    }
  });
}
