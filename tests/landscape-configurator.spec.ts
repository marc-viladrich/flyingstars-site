import { test, expect, devices, type Locator, type Page } from '@playwright/test';

// Handy quer (Audit 3, V13/V14, 19.11.2026): bei 844 × 390 lagen klebende Bühne, Abspielleiste und feste Preisleiste über
// der Bedienung, 3D+ ließ sich nicht antippen, und die Erklärungen der Sicherheitszeichnung liefen unter den Bildschirmrand.
// Seitdem stehen Bedienung und Bühne quer nebeneinander (show-configurator.css), und die Erklärung wählt die Seite, auf der
// sie ganz zu sehen ist (LandingSite.astro). Geprüft wird mit echtem Tap im iPhone-Profil von WebKit.
const { defaultBrowserType: _, ...phone } = devices['iPhone 13 landscape'];
test.use({ ...phone, reducedMotion: 'reduce' });
test.skip(({ browserName }) => browserName !== 'webkit', 'iPhone-Querformat: WebKit');

const CFG = '/drohnenshow-preise/';
const SIZES = [[844, 390], [740, 360], [932, 430]] as const;

/** Nach scrollIntoView trifft die Mitte des Elements das Element selbst, nicht Bühne, Spieler oder Preisleiste. */
const hitsItself = (loc: Locator) => loc.evaluate((el) => {
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { ok: !!hit && (hit === el || el.contains(hit)), hit: hit ? `${hit.tagName}#${hit.id}.${hit.getAttribute('class') ?? ''}` : 'nichts' };
});
/** Sichtbarer Bereich zwischen Kopfzeile und Preisleiste */
const band = (page: Page) => page.evaluate(() => {
  const bar = document.querySelector('.cfg-bar')!.getBoundingClientRect(), nav = document.querySelector('.nav')!.getBoundingClientRect();
  return { top: Math.max(0, nav.bottom), bottom: getComputedStyle(document.querySelector('.cfg-bar')!).visibility === 'visible' ? bar.top : innerHeight };
});

for (const [width, height] of SIZES) {
  test.describe(`Handy quer ${width} × ${height}`, () => {
    test.use({ viewport: { width, height } });

    test('jedes Bedienelement des Konfigurators ist per Tap erreichbar', async ({ page }) => {
      await page.goto(`${CFG}#konfigurator`);
      await expect(page.locator('#cfg-field')).toBeVisible();
      const controls: [string, Locator][] = [
        ['Anlass', page.locator('#cfg-occasion label[data-occasion]').first()],
        ['2D', page.locator('#cfg-arts label:has(input[value="2d"])')],
        ['3D', page.locator('#cfg-arts label:has(input[value="3d"])')],
        ['3D+', page.locator('#cfg-arts label:has(input[value="story"])')],
        ['Drohnen', page.locator('#cfg-drones')],
        ['Upgrades', page.locator('#cfg-up-toggle')],
        ['Text', page.locator('#cfg-text')],
        ['Logo', page.locator('#cfg-upload')],
        ['Anfragen', page.locator('#cfg-cta')],
      ];
      for (const [name, loc] of controls) expect(await hitsItself(loc), name).toMatchObject({ ok: true });

      // echte Taps: 3D+ wählt die Art und hebt die Drohnenzahl auf die Mindestzahl (300)
      await page.locator('#cfg-arts label:has(input[value="story"])').tap();
      await expect(page.locator('#cfg-arts input[value="story"]')).toBeChecked();
      await expect(page.locator('#cfg-dronecount')).toHaveText('300');
      await page.locator('#cfg-arts label:has(input[value="2d"])').tap();
      await expect(page.locator('#cfg-arts input[value="2d"]')).toBeChecked();
      await page.locator('#cfg-up-toggle').tap();
      await expect(page.locator('#cfg-up-toggle')).toHaveAttribute('aria-expanded', 'true');
      const upgrade = page.locator('#cfg-upgrades label').first();
      await expect(upgrade).toBeVisible();
      expect(await hitsItself(upgrade), 'Upgrade').toMatchObject({ ok: true });
      await upgrade.tap();
      await expect(upgrade.locator('input')).toBeChecked();
      await page.locator('#cfg-text').tap();
      await expect(page.locator('#cfg-text')).toBeFocused();
      // Logo-Auswahl und Anfrage öffnen Dateidialog bzw. führen weiter: nur die Trefferprüfung des Taps
      await page.locator('#cfg-upload').tap({ trial: true });
      await page.locator('#cfg-cta').tap({ trial: true });
    });

    test('das fokussierte Textfeld steht ganz zwischen Kopfzeile und Preisleiste', async ({ page }) => {
      await page.goto(`${CFG}#konfigurator`);
      await expect(page.locator('#cfg-field')).toBeVisible();
      const text = page.locator('#cfg-text');
      await text.focus();
      // show-configurator.js rückt das Feld nach dem eigenen Fokus-Scroll des Browsers nach (120 ms)
      await expect.poll(async () => {
        const [r, b] = [await text.boundingBox(), await band(page)];
        return !!r && r.y >= b.top && r.y + r.height <= b.bottom;
      }).toBe(true);
      expect(await text.evaluate((el) => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return hit === el; })).toBe(true);
    });

    test('die Erklärungen der Sicherheitszeichnung stehen ganz im Bild', async ({ page }) => {
      await page.goto('/');
      const map = page.locator('[data-st-map]').first();
      await map.scrollIntoViewIfNeeded();
      await expect(map.locator('.st-hot').first()).toBeVisible();
      for (const zone of await map.locator('.st-hot[data-hot]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.hot!))) {
        const hot = map.locator(`.st-hot[data-hot="${zone}"]`);
        await hot.scrollIntoViewIfNeeded();
        await hot.tap();
        const tip = map.locator(`.st-tips li[data-tip="${zone}"]`);
        await expect(tip).toBeVisible();
        const box = await tip.evaluate((el) => {
          const t = el.getBoundingClientRect(), nav = document.querySelector('.nav')!.getBoundingClientRect();
          const h = document.querySelector(`[data-hot="${(el as HTMLElement).dataset.tip}"]`)!.getBoundingClientRect();
          return { top: t.top, bottom: t.bottom, left: t.left, right: t.right, nav: Math.max(0, nav.bottom), vh: innerHeight, vw: innerWidth,
            coversNumber: t.left < h.right && t.right > h.left && t.top < h.bottom && t.bottom > h.top };
        });
        expect(box.top, zone).toBeGreaterThanOrEqual(box.nav - 1);
        expect(box.bottom, zone).toBeLessThanOrEqual(box.vh);
        expect(box.left, zone).toBeGreaterThanOrEqual(0);
        expect(box.right, zone).toBeLessThanOrEqual(box.vw);
        expect(box.coversNumber, zone).toBe(false);
      }
    });
  });
}
