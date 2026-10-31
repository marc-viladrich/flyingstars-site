import { test, expect, type Page } from '@playwright/test';

// Teaser des Show-Konfigurators für die Startseite (sechzehnte Fassung, 31.10.2026, ConfiguratorTeaser.astro): dieselbe
// Engine, zwei Bedienungen (Anlass, Drohnenzahl), Freischalten mit Meldung, Paket und Preis live, Übergabe in den
// Konfigurator. Lädt erst in der Nähe des Viewports, zeichnet außerhalb nicht und steht bei reduzierter Bewegung.
// TEASER_PATH stellt die Seite ein (Standard: die Prüfseite; auf der Startseite z. B. TEASER_PATH=/).
const PAGE = process.env.TEASER_PATH ?? '/poc/konfigurator-teaser/';
const root = (page: Page) => page.locator('[data-cft-root]');
const field = (page: Page) => root(page).locator('[data-cft=field]');
const reach = async (page: Page) => { await root(page).scrollIntoViewIfNeeded(); await expect(root(page)).toHaveAttribute('data-cft-ready', 'true'); await expect.poll(() => field(page).getAttribute('data-points')).not.toBeNull(); };

test('Der Teaser lädt erst in der Nähe des Viewports', async ({ page }) => {
  await page.goto(PAGE);
  const far = await root(page).evaluate((el) => el.getBoundingClientRect().top - innerHeight);
  test.skip(far < 400, 'Der Teaser steht auf dieser Seite schon im ersten Blick.');
  await page.waitForTimeout(800);
  await expect(root(page)).not.toHaveAttribute('data-cft-ready', 'true');
  await reach(page);
});

test('Mehr Drohnen schalten ein Motiv frei: Meldung, Motivliste, Paket, Preis und Übergabe folgen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(PAGE);
  await reach(page);
  const slider = root(page).locator('[data-cft=drones]'), list = root(page).locator('[data-cft=motifs] li');
  await expect(root(page).locator('[data-cft=pkg]')).toHaveText('HORIZON');
  await expect(list.filter({ hasText: 'Lotusblüten' })).toContainText('ab 250');
  await slider.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect(root(page).locator('[data-cft=toast]')).toHaveText('Neues Motiv freigeschaltet: Lotusblüten');
  await expect(list.filter({ hasText: 'Lotusblüten' })).toHaveClass(/is-on/);
  await expect(root(page).locator('[data-cft=price]')).toHaveText('ab 20.800 €');
  await expect(root(page).locator('[data-cft=scene]')).toHaveText('Zwei Lotusblüten in 3D drehen sich ineinander');
  const href = await root(page).locator('[data-cft=cta]').getAttribute('href');
  expect(href).toBe('/drohnenshow-preise/?anlass=hochzeit&drohnen=250&motiv=lotus#konfigurator');
  // ein anderer Anlass: neue Motivliste, die gesperrten mit ihrer Schwelle
  await root(page).locator('label:has([value=festival])').click();
  await expect(list).toHaveText(['Reise', 'Papierflieger ab 450', 'Kolibri', 'Riesenrad', 'Delfin', 'Drache']);
  // weniger Drohnen sind keine Meldung wert
  await slider.focus(); await page.keyboard.press('Home');
  await expect(root(page).locator('[data-cft=pkg]')).toHaveText('SPARK');
  await page.waitForTimeout(300);
  await expect(root(page).locator('[data-cft=toast]')).not.toHaveText(/neu/i, { timeout: 6000 });
  expect(errors).toEqual([]);
});

test('Außerhalb des Viewports zeichnet die Engine nicht, bei reduzierter Bewegung steht das Bild', async ({ page }) => {
  await page.goto(PAGE);
  await reach(page);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  await page.evaluate(() => scrollTo(0, 0));
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await reach(page);
  await page.waitForTimeout(400);
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  expect(Number(await field(page).getAttribute('data-points'))).toBeGreaterThan(0);
});
