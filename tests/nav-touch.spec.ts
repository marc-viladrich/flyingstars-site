import { test, expect, devices, type Page } from '@playwright/test';

// Untermenüs der Kopfzeile („Anlässe“, „Über uns“, src/scripts/site.ts + global.css). Marc, 19.11.2026: auf dem iPad quer
// (Leiste sichtbar) führte der Tipp direkt zur Übersichtsseite, das Untermenü war nie zu sehen. Erwartet: erster Tipp
// öffnet, zweiter Tipp folgt dem Link, Tipp daneben oder Esc schließt. Maus und Tastatur bleiben wie gehabt.
const { userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['iPad Pro 11 landscape'];
const ipad = { userAgent, deviceScaleFactor, isMobile, hasTouch };
const PAGE = '/faq/';
const drop = (page: Page, href: string) => page.locator(`header.nav .nav-drop:has(> a[href="${href}"])`);
const isOpen = (page: Page, href: string) => drop(page, href).locator('> ul').evaluate((ul) => getComputedStyle(ul).opacity === '1' && getComputedStyle(ul).pointerEvents === 'auto');
/** Schaltet Anchor Positioning in den Stylesheets ab: so sieht Marcs Safari 18.6 die gleitende Box (Ersatzweg). */
async function withoutAnchors(page: Page) {
  await page.route('**/*', async (route) => {
    const type = route.request().resourceType();
    if (type !== 'stylesheet' && type !== 'document') return route.continue();
    const response = await route.fetch();
    const body = (await response.text()).replace(/@supports\s*\(\s*anchor-name\s*:/g, '@supports (x-anchor-off:');
    await route.fulfill({ response, body });
  });
}

test.describe('Touch (iPad quer)', () => {
  test.use({ ...ipad });
  for (const width of [1024, 1180]) {
    test(`erster Tipp öffnet, zweiter folgt dem Eintrag, daneben schließt (${width} px)`, async ({ page }, info) => {
      test.skip(info.project.name.startsWith('mobile'), 'läuft in desktop (Chromium) und webkit');
      await page.setViewportSize({ width, height: Math.round(width * 0.69) });
      await page.goto(PAGE);
      const occasions = drop(page, '/#anlaesse'), about = drop(page, '/ueber-uns/');
      await expect(occasions.locator('> a')).toBeVisible();
      expect(await isOpen(page, '/#anlaesse')).toBe(false);
      // erster Tipp: Untermenü offen, die Seite bleibt
      await occasions.locator('> a').tap();
      await expect.poll(() => isOpen(page, '/#anlaesse')).toBe(true);
      expect(new URL(page.url()).pathname).toBe(PAGE);
      // Tipp auf das andere Untermenü: dieses öffnet, das erste schließt
      await about.locator('> a').tap();
      await expect.poll(() => isOpen(page, '/ueber-uns/')).toBe(true);
      await expect.poll(() => isOpen(page, '/#anlaesse')).toBe(false);
      expect(new URL(page.url()).pathname).toBe(PAGE);
      // Tipp daneben schließt
      await page.locator('main h1').first().tap({ position: { x: 4, y: 4 } }); // links oben, nicht unter dem offenen Untermenü
      await expect.poll(() => isOpen(page, '/ueber-uns/')).toBe(false);
      // Esc schließt
      await occasions.locator('> a').tap();
      await expect.poll(() => isOpen(page, '/#anlaesse')).toBe(true);
      await page.keyboard.press('Escape');
      await expect.poll(() => isOpen(page, '/#anlaesse')).toBe(false);
      // geöffnet: Tipp auf einen Eintrag navigiert
      await occasions.locator('> a').tap();
      await expect.poll(() => isOpen(page, '/#anlaesse')).toBe(true);
      await occasions.locator('a[href="/drohnenshow-hochzeit/"]').tap();
      await page.waitForURL('**/drohnenshow-hochzeit/');
    });
  }

  test('zweiter Tipp auf den Kopf des Untermenüs öffnet die Übersichtsseite', async ({ page }, info) => {
    test.skip(info.project.name.startsWith('mobile'), 'läuft in desktop (Chromium) und webkit');
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.goto(PAGE);
    const about = drop(page, '/ueber-uns/').locator('> a');
    await about.tap();
    await expect.poll(() => isOpen(page, '/ueber-uns/')).toBe(true);
    expect(new URL(page.url()).pathname).toBe(PAGE);
    await about.tap();
    await page.waitForURL('**/ueber-uns/');
  });

  test('ohne Anchor Positioning (Safari 18): gleiches Öffnen, die Box steht auf dem Eintrag', async ({ page }, info) => {
    test.skip(info.project.name !== 'webkit', 'Ersatzweg gilt für WebKit');
    await withoutAnchors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(PAGE);
    const occasions = drop(page, '/#anlaesse');
    await occasions.locator('> a').tap();
    await expect.poll(() => isOpen(page, '/#anlaesse')).toBe(true);
    // Ersatzweg aktiv: die Box verschiebt sich per transform (mit Anchor Positioning wäre transform „none“)
    const mark = occasions.locator('.glide-mark');
    await occasions.locator('a[href="/drohnenshow-hochzeit/"]').hover();
    await expect.poll(() => mark.evaluate((m) => getComputedStyle(m).opacity)).toBe('1');
    await expect.poll(async () => {
      const [m, a] = await Promise.all([mark.boundingBox(), occasions.locator('a[href="/drohnenshow-hochzeit/"]').boundingBox()]);
      return Math.round(Math.abs(m!.y - a!.y));
    }).toBeLessThanOrEqual(1);
    expect(await mark.evaluate((m) => getComputedStyle(m).transform)).not.toBe('none');
  });
});

test.describe('Maus und Tastatur (unverändert)', () => {
  test('Zeigen öffnet, Klick auf den Kopf führt direkt zur Seite', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Maus nur am Desktop');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    const about = drop(page, '/ueber-uns/');
    await about.locator('> a').hover();
    await expect.poll(() => isOpen(page, '/ueber-uns/')).toBe(true);
    await page.keyboard.press('Escape'); // Esc schließt auch eine per Zeigen offene Liste
    await expect.poll(() => isOpen(page, '/ueber-uns/')).toBe(false);
    await page.mouse.move(700, 600);
    await about.locator('> a').hover();
    await expect.poll(() => isOpen(page, '/ueber-uns/')).toBe(true);
    await about.locator('> a').click();
    await page.waitForURL('**/ueber-uns/');
  });

  test('Tab öffnet mit dem Fokus, Esc schließt und lässt den Fokus am Kopf, Enter folgt dem Link', async ({ page, isMobile, browserName }) => {
    test.skip(isMobile, 'Leiste nur am Desktop');
    test.skip(browserName === 'webkit', 'WebKit erreicht Links per Tab nur mit der Systemeinstellung „Jedes Element“');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    const occasions = drop(page, '/#anlaesse');
    await occasions.locator('> a').focus();
    await expect.poll(() => isOpen(page, '/#anlaesse')).toBe(true);
    await page.keyboard.press('Tab');
    await expect(occasions.locator('li a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, '/#anlaesse')).toBe(false);
    await expect(occasions.locator('> a')).toBeFocused();
    await page.keyboard.press('Tab'); // zurück in die Liste: sie öffnet wieder
    await expect.poll(() => isOpen(page, '/#anlaesse')).toBe(true);
    await page.keyboard.press('Enter');
    await page.waitForURL('**/drohnenshow-werbung/');
  });
});
