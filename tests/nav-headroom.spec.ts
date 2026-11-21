import { test, expect, type Page } from '@playwright/test';

// Kopfzeile auf schmalen Bildschirmen (src/scripts/site.ts): weicht beim Runterscrollen aus, kommt beim Hochscrollen zurück.
// Marc, 21.11.2026 am iPhone: „funktioniert sehr unregelmäßig“. Ursachen laut Codex-Analyse: Trägheit nach dem Loslassen fiel
// aus einem festen 900-ms-Fenster, große Schritte (> 0,8 Bildschirmhöhen) wurden verworfen. Mausrad statt Wischen, weil
// Playwright im mobilen WebKit kein Rad kennt; die Logik ist dieselbe (touchmove und wheel beginnen eine Geste).
const PAGES = ['/', '/drohnenshow-preise/', '/drohnenshow-hochzeit/', '/ueber-uns/', '/drohnenshow-indoor/'];
const away = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('nav-away'));
const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

test.use({ viewport: { width: 390, height: 664 } });

for (const path of PAGES) {
  test(`Kopfzeile weicht aus und kommt zurück (${path})`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mausrad nur ohne Mobil-Emulation');
    await page.goto(path);
    await page.mouse.move(195, 400);
    // kleine Schritte
    for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 120); await settle(page); }
    await expect.poll(() => away(page)).toBe(true);
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -60); await settle(page); }
    await expect.poll(() => away(page)).toBe(false);
    // ein großer Schritt in jede Richtung
    await page.mouse.wheel(0, 620); await settle(page);
    await expect.poll(() => away(page)).toBe(true);
    await page.mouse.wheel(0, -620); await settle(page);
    await expect.poll(() => away(page)).toBe(false);
  });
}

test('Trägheit nach der Eingabe zählt, ein Sprung ohne Eingabe nicht', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mausrad nur ohne Mobil-Emulation');
  await page.goto('/drohnenshow-hochzeit/');
  await page.mouse.move(195, 400);
  await page.mouse.wheel(0, 200); await settle(page);
  await expect.poll(() => away(page)).toBe(true);
  // Trägheit: 1,6 s weiter scrollen ohne neue Eingabe, dann (wie ein Gegenwischen in der Trägheit) zurück
  await page.evaluate(() => new Promise<void>((done) => {
    const t0 = performance.now();
    const step = () => { const t = performance.now() - t0; scrollBy(0, t < 1600 ? 6 : -12); if (t < 1900) requestAnimationFrame(step); else done(); };
    requestAnimationFrame(step);
  }));
  await settle(page);
  expect(await away(page), 'Rückweg in der Trägheit zeigt die Kopfzeile').toBe(false);
  // Ruhe, dann ein Sprung nach unten ohne Eingabe (Anker per Skript): die Kopfzeile bleibt sichtbar
  await page.waitForTimeout(400);
  await page.evaluate(() => scrollBy({ top: 900, behavior: 'instant' })); await settle(page);
  expect(await away(page), 'Sprung ohne Eingabe ändert nichts').toBe(false);
});
