import { test, expect, devices, type Page } from '@playwright/test';

// Untermenüs der Kopfzeile („Anlässe“, „Über uns“, src/scripts/site.ts + global.css). Marc, 19.11.2026: auf dem iPad quer
// (Leiste sichtbar) war das Untermenü nie zu sehen. Audit 3 (V3): der offene Zustand muss programmgesteuert lesbar sein.
// Seitdem: Übersichtslink + eigener Schalter (Chevron, aria-expanded, aria-controls). Auf Touch-Geräten deckt der Schalter
// Wort + Chevron ab (≥ 44 px hoch): ein Tipp aufs Wort öffnet, die Übersicht steht als erster Eintrag in der Liste (nur
// wo sie fehlt). Tipp daneben, Fokus außerhalb oder Esc schließt, Esc gibt den Fokus an den Schalter zurück. Mit der Maus
// öffnet weiterhin das Zeigen, der Klick auf das Wort führt zur Seite, einen Übersichtseintrag gibt es dort nicht.
const { userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['iPad Pro 11 landscape'];
const ipad = { userAgent, deviceScaleFactor, isMobile, hasTouch };
const PAGE = '/faq/';
const drop = (page: Page, href: string) => page.locator(`header.nav .nav-drop:has(> .nav-drop-head > a[href="${href}"])`);
const head = (page: Page, href: string) => drop(page, href).locator('> .nav-drop-head > a');
const toggle = (page: Page, href: string) => drop(page, href).locator('.nav-drop-toggle');
const isOpen = (page: Page, href: string) => drop(page, href).locator('> ul').evaluate((ul) => getComputedStyle(ul).opacity === '1' && getComputedStyle(ul).pointerEvents === 'auto');
/** Sichtbarer und gemeldeter Zustand stimmen überein: offen ⇔ aria-expanded=true ⇔ Liste nicht inert */
async function expectState(page: Page, href: string, open: boolean) {
  await expect.poll(() => isOpen(page, href)).toBe(open);
  await expect(toggle(page, href)).toHaveAttribute('aria-expanded', String(open));
  expect(await drop(page, href).locator('> ul').evaluate((ul) => (ul as HTMLElement).inert)).toBe(!open);
}
/** Tipp mitten aufs Wort, wie ein Finger: trifft, was dort oben liegt (auf Touch die Fläche des Schalters) */
async function tapWord(page: Page, href: string) {
  const box = (await head(page, href).boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}
/** Element, das ein Zeiger an Anfang, Mitte und Ende des Worts trifft */
const hitAtWord = (page: Page, href: string) => head(page, href).evaluate((a) => {
  const r = a.getBoundingClientRect(), y = r.top + r.height / 2;
  return [r.left + 2, r.left + r.width / 2, r.right - 2].map((x) => { const el = document.elementFromPoint(x, y)!; return el.closest('.nav-drop-toggle') ? 'toggle' : el.closest('a') === a ? 'link' : el.tagName; });
});
/** Schaltet Anchor Positioning in den Stylesheets ab: so sieht Marcs Safari 18.6 die gleitende Box (Ersatzweg). */
async function withoutAnchors(page: Page) {
  await page.route('**/*', async (route) => {
    const type = route.request().resourceType();
    if (type !== 'stylesheet' && type !== 'document') return route.continue();
    const response = await route.fetch();
    const body = (await response.text()).replace(/@supports\s*(not\s*)?\(\s*anchor-name\s*:/g, '@supports $1(x-anchor-off:');
    await route.fulfill({ response, body });
  });
}

test('Schalter: benannt, verweist auf seine Liste, Link bleibt Link', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Leiste nur ab Tabletbreite quer');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  for (const [href, label] of [['/#anlaesse', 'Anlässe'], ['/ueber-uns/', 'Über uns']]) {
    const button = toggle(page, href);
    await expect(button).toHaveAccessibleName(`Untermenü ${label}`);
    await expect(button).toHaveAttribute('type', 'button');
    const list = drop(page, href).locator('> ul');
    await expect(list).toHaveAttribute('id', (await button.getAttribute('aria-controls'))!);
    await expect(head(page, href)).toHaveAccessibleName(label);
    await expectState(page, href, false);
  }
  await page.goto('/en/faq/');
  await expect(drop(page, '/en/#anlaesse').locator('.nav-drop-toggle')).toHaveAccessibleName('Occasions submenu');
});

test.describe('Touch (iPad quer)', () => {
  test.use({ ...ipad });
  for (const width of [1024, 1180]) {
    test(`Tipp aufs Wort öffnet, Übersicht als erster Eintrag, daneben und Esc schließen, Eintrag navigiert (${width} px)`, async ({ page }, info) => {
      test.skip(info.project.name.startsWith('mobile'), 'läuft in desktop (Chromium) und webkit');
      await page.setViewportSize({ width, height: Math.round(width * 0.69) });
      await page.goto(PAGE);
      // Wort und Chevron gehören auf Touch zum Schalter, die Trefferfläche ist mindestens 44 px hoch
      for (const href of ['/#anlaesse', '/ueber-uns/']) {
        expect(await hitAtWord(page, href)).toEqual(['toggle', 'toggle', 'toggle']);
        const height = await toggle(page, href).evaluate((b) => parseFloat(getComputedStyle(b, '::before').height));
        expect(height).toBeGreaterThanOrEqual(44);
      }
      await expectState(page, '/#anlaesse', false);
      // Tipp aufs Wort: Untermenü offen, die Seite bleibt
      await tapWord(page, '/#anlaesse');
      await expectState(page, '/#anlaesse', true);
      expect(new URL(page.url()).pathname).toBe(PAGE);
      // „Anlässe“ hat keine eigene Übersichtsseite in der Liste: sie steht als erster Eintrag da
      const first = drop(page, '/#anlaesse').locator('> ul > li:visible').first().locator('a');
      await expect(first).toHaveText('Übersicht');
      await expect(first).toHaveAttribute('href', '/#anlaesse');
      // zweiter Tipp aufs Wort schließt (trotz klebendem :hover nach dem Tipp)
      await tapWord(page, '/#anlaesse');
      await expectState(page, '/#anlaesse', false);
      // Tipp auf das andere Untermenü: dieses öffnet, das erste schließt
      await tapWord(page, '/#anlaesse');
      await expectState(page, '/#anlaesse', true);
      await tapWord(page, '/ueber-uns/');
      await expectState(page, '/ueber-uns/', true);
      await expectState(page, '/#anlaesse', false);
      expect(new URL(page.url()).pathname).toBe(PAGE);
      // „Über uns“ enthält seine Übersicht schon: kein zweiter Eintrag
      await expect(drop(page, '/ueber-uns/').locator('.nav-drop-all')).toHaveCount(0);
      await expect(drop(page, '/ueber-uns/').locator('> ul > li:visible').first().locator('a')).toHaveAttribute('href', '/ueber-uns/');
      // Tipp daneben schließt
      await page.locator('main h1').first().tap({ position: { x: 4, y: 4 } }); // links oben, nicht unter dem offenen Untermenü
      await expectState(page, '/ueber-uns/', false);
      // Esc schließt
      await tapWord(page, '/#anlaesse');
      await expectState(page, '/#anlaesse', true);
      await page.keyboard.press('Escape');
      await expectState(page, '/#anlaesse', false);
      // geöffnet: Tipp auf einen Eintrag navigiert
      await tapWord(page, '/#anlaesse');
      await expectState(page, '/#anlaesse', true);
      await drop(page, '/#anlaesse').locator('a[href="/drohnenshow-hochzeit/"]').tap();
      await page.waitForURL('**/drohnenshow-hochzeit/');
    });
  }

  test('Übersichtseintrag führt zur Übersicht', async ({ page }, info) => {
    test.skip(info.project.name.startsWith('mobile'), 'läuft in desktop (Chromium) und webkit');
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.goto(PAGE);
    await tapWord(page, '/#anlaesse');
    await expectState(page, '/#anlaesse', true);
    await drop(page, '/#anlaesse').locator('.nav-drop-all a').tap();
    await page.waitForURL((url) => url.pathname === '/' && url.hash === '#anlaesse');
    await page.goto(PAGE);
    await tapWord(page, '/ueber-uns/');
    await expectState(page, '/ueber-uns/', true);
    await drop(page, '/ueber-uns/').locator('a[href="/ueber-uns/"]').last().tap();
    await page.waitForURL('**/ueber-uns/');
  });

  test('ohne Anchor Positioning (Safari 18): gleiches Öffnen, die Box steht auf dem Eintrag', async ({ page }, info) => {
    test.skip(info.project.name !== 'webkit', 'Ersatzweg gilt für WebKit');
    await withoutAnchors(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(PAGE);
    const occasions = drop(page, '/#anlaesse');
    await tapWord(page, '/#anlaesse'); // Liste mit Übersicht als erster Zeile
    await expectState(page, '/#anlaesse', true);
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

test.describe('Maus und Tastatur', () => {
  test('ohne Anchor Positioning (Safari 18) mit Maus: die Box steht trotz ausgeblendeter Übersicht auf dem Eintrag', async ({ page }, info) => {
    test.skip(info.project.name !== 'webkit', 'Ersatzweg gilt für WebKit');
    await withoutAnchors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    const occasions = drop(page, '/#anlaesse'), mark = occasions.locator('.glide-mark');
    await head(page, '/#anlaesse').hover();
    await expectState(page, '/#anlaesse', true);
    for (const href of ['/drohnenshow-werbung/', '/drohnenshow-hochzeit/', '/drohnenshow-indoor/']) {
      const item = occasions.locator(`a[href="${href}"]`);
      await item.hover();
      await expect.poll(async () => {
        const [m, a] = await Promise.all([mark.boundingBox(), item.boundingBox()]);
        return Math.round(Math.abs(m!.y - a!.y) + Math.abs(m!.height - a!.height));
      }).toBeLessThanOrEqual(1);
    }
  });

  test('Zeigen öffnet (aria-expanded folgt), Esc schließt, Klick auf den Kopf führt direkt zur Seite', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Maus nur am Desktop');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    // Mit Maus bleibt das Wort der Link, und die Liste zeigt keinen Übersichtseintrag
    expect(await hitAtWord(page, '/#anlaesse')).toEqual(['link', 'link', 'link']);
    await head(page, '/#anlaesse').hover();
    await expectState(page, '/#anlaesse', true);
    await expect(drop(page, '/#anlaesse').locator('.nav-drop-all')).toBeHidden();
    await expect(drop(page, '/#anlaesse').locator('> ul > li:visible').first().locator('a')).toHaveAttribute('href', '/drohnenshow-werbung/');
    await page.mouse.move(700, 600);
    await head(page, '/ueber-uns/').hover();
    await expectState(page, '/ueber-uns/', true);
    await page.keyboard.press('Escape'); // Esc schließt auch eine per Zeigen offene Liste
    await expectState(page, '/ueber-uns/', false);
    await page.mouse.move(700, 600);
    await expectState(page, '/ueber-uns/', false);
    await head(page, '/ueber-uns/').hover();
    await expectState(page, '/ueber-uns/', true);
    await head(page, '/ueber-uns/').click();
    await page.waitForURL('**/ueber-uns/');
  });

  test('Tastatur: Fokus auf dem Link öffnet nichts, der Schalter öffnet, Tab erreicht die Einträge, Esc schließt und gibt den Fokus zurück', async ({ page, isMobile, browserName }) => {
    test.skip(isMobile, 'Leiste nur am Desktop');
    test.skip(browserName === 'webkit', 'WebKit erreicht Links per Tab nur mit der Systemeinstellung „Jedes Element“');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    const occasions = drop(page, '/#anlaesse');
    await head(page, '/#anlaesse').focus();
    await expectState(page, '/#anlaesse', false);
    // geschlossen: Tab geht vom Link zum Schalter und danach an der Liste vorbei
    await page.keyboard.press('Tab');
    await expect(toggle(page, '/#anlaesse')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('header.nav nav > a[href="/drohnenshow-preise/"]')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(toggle(page, '/#anlaesse')).toBeFocused();
    await page.keyboard.press('Enter');
    await expectState(page, '/#anlaesse', true);
    await page.keyboard.press('Tab');
    await expect(occasions.locator('li:visible a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expectState(page, '/#anlaesse', false);
    await expect(toggle(page, '/#anlaesse')).toBeFocused();
    await page.keyboard.press('Space');
    await expectState(page, '/#anlaesse', true);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/drohnenshow-werbung/');
  });

  test('Tastatur: Fokus verlässt das Untermenü, es schließt', async ({ page, isMobile, browserName }) => {
    test.skip(isMobile, 'Leiste nur am Desktop');
    test.skip(browserName === 'webkit', 'WebKit erreicht Links per Tab nur mit der Systemeinstellung „Jedes Element“');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    await toggle(page, '/ueber-uns/').focus();
    await page.keyboard.press('Enter');
    await expectState(page, '/ueber-uns/', true);
    const count = await drop(page, '/ueber-uns/').locator('li a').count();
    for (let i = 0; i <= count; i++) await page.keyboard.press('Tab');
    await expect(page.locator('header.nav nav > a[href="/faq/"]')).toBeFocused();
    await expectState(page, '/ueber-uns/', false);
  });
});
