import { test, expect, type Page } from '@playwright/test';

// CSS-Dauerschleifen (src/scripts/css-loop.ts, Audit 18.11.2026 P1): Logo-Laufband und Aufnahmepunkt im Showreel-Kopf
// laufen nur im Bild. Vertrag: [data-loop] trägt data-running, global.css hält über --loop-play an. Geprüft wird der
// Zustand der echten CSS-Animationen: erst im Bild, dann weit weg, wieder zurück, bei verstecktem Tab und globaler Pause.
const states = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-loop]')].map((el) => {
  const running = el.getAnimations({ subtree: true }).map((a) => a.playState);
  return [el.classList[0], { flag: el.dataset.running, plays: running }];
})));
const scrollToLoop = (page: Page, selector: string) => page.locator(selector).evaluate((el) => {
  const r = el.getBoundingClientRect(); scrollTo({ top: r.top + scrollY - innerHeight / 3, behavior: 'instant' });
});

test('Logo-Laufband und Aufnahmepunkt laufen nur im Bild und bei erlaubter Bewegung', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const marquee = '.logo-marquee[data-loop]';
  await expect(page.locator(marquee)).toHaveCount(1);
  await expect(page.locator('.rec[data-loop]')).toHaveCount(1);

  await scrollToLoop(page, marquee);
  await expect.poll(async () => (await states(page))['logo-marquee']).toEqual({ flag: 'true', plays: ['running', 'running'] });

  // weit weg: Seitenende
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect.poll(async () => (await states(page))['logo-marquee']).toEqual({ flag: 'false', plays: ['paused', 'paused'] });
  // der Aufnahmepunkt ist dort ebenfalls aus dem Bild; läuft er (Reel an), dann nur angehalten
  const rec = (await states(page)).rec;
  expect(rec.flag).toBe('false');
  expect(rec.plays.every((s: string) => s === 'paused')).toBe(true);

  // zurück ins Bild
  await scrollToLoop(page, marquee);
  await expect.poll(async () => (await states(page))['logo-marquee'].flag).toBe('true');

  // versteckter Tab
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await states(page))['logo-marquee']).toEqual({ flag: 'false', plays: ['paused', 'paused'] });
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await states(page))['logo-marquee'].flag).toBe('true');

  // globale Pause (Knopf im Kopf setzt html.motion-paused)
  await page.evaluate(() => document.documentElement.classList.add('motion-paused'));
  await expect.poll(async () => (await states(page))['logo-marquee'].flag).toBe('false');
  expect((await states(page))['logo-marquee'].plays.every((s: string) => s === 'paused')).toBe(true);
});
