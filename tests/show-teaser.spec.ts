import { test, expect, type Page } from '@playwright/test';

// Teaser des Show-Konfigurators für die Startseite, Showreel-Fassung (31.10.2026, Runde 8: reduziertes Wireframe,
// Schärfe-Effekt am Logo, Bokkenrijders bei 600; ConfiguratorTeaser.astro,
// src/scripts/show-teaser.js): ein sich selbst abspielender Durchlauf durch die „Greatest Hits“ von SPARK bis ODYSSEY
// mit einem Beispiel-Logo, daneben ein vor-animiertes Wireframe des Konfigurators, das der Bühne folgt. Keine
// Formularelemente, nur der Knopf in den Konfigurator. Lädt erst in der Nähe des Viewports, zeichnet außerhalb nicht,
// steht bei reduzierter Bewegung. TEASER_PATH stellt die Seite ein (Standard: die Prüfseite; Startseite: TEASER_PATH=/).
const PAGE = process.env.TEASER_PATH ?? '/poc/konfigurator-teaser/';
const root = (page: Page) => page.locator('[data-cft-root]');
const field = (page: Page) => root(page).locator('[data-cft=field]');
const reach = async (page: Page) => { await root(page).scrollIntoViewIfNeeded(); await expect(root(page)).toHaveAttribute('data-cft-loaded', 'true', { timeout: 20_000 }); };

test('Der Teaser lädt erst in der Nähe des Viewports', async ({ page }) => {
  await page.goto(PAGE);
  const far = await root(page).evaluate((el) => el.getBoundingClientRect().top - innerHeight);
  test.skip(far < 400, 'Der Teaser steht auf dieser Seite schon im ersten Blick.');
  await page.waitForTimeout(800);
  await expect(root(page)).not.toHaveAttribute('data-cft-ready', 'true');
  await reach(page);
});

test('Das Mockup ist Dekoration: keine Formularelemente, nur der Knopf in den Konfigurator, die Bühne hat eine Textalternative', async ({ page }) => {
  await page.goto(PAGE);
  await expect(root(page).locator('input, button, select, textarea, [tabindex]')).toHaveCount(0);
  await expect(root(page).locator('a')).toHaveCount(1);
  await expect(root(page).locator('a')).toHaveAttribute('href', '/drohnenshow-preise/#konfigurator');
  await expect(root(page).locator('a')).toHaveText('Show selbst zusammenstellen');
  await expect(root(page).locator('.cft-mock')).toHaveAttribute('aria-hidden', 'true');
  await expect(root(page).locator('.cft-stage')).toHaveAttribute('aria-label', /Drohnenshow/);
});

test('Das Showreel läuft von selbst durch SPARK, HORIZON und ODYSSEY, das Logo wird mit mehr Drohnen schärfer, dann von vorn', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(PAGE);
  await reach(page);
  const on = (id: string) => root(page).locator(`[data-cft=pkg][data-id=${id}]`), count = root(page).locator('[data-cft=count]');
  const euros = () => root(page).locator('[data-cft=euro].is-on').count();
  await expect(on('SPARK')).toHaveClass(/is-on/);
  await expect(root(page).locator('.cft-count')).toContainText('Drohnen');
  expect(await euros()).toBe(1);
  await expect(on('HORIZON')).toHaveClass(/is-on/, { timeout: 15_000 });
  await expect(on('ODYSSEY')).toHaveClass(/is-on/, { timeout: 20_000 });
  await expect(count).toHaveText('600', { timeout: 20_000 }); // die Bokkenrijders-Maske
  expect(await euros()).toBe(6);
  // das Logo: der Regler fährt von 100 bis 600, die Schrift „Euer Logo …“ steht dabei
  await expect(root(page).locator('[data-cft=logo]')).toHaveClass(/is-on/, { timeout: 15_000 });
  await expect(count).toHaveText('100');
  await expect(count).toHaveText('300', { timeout: 10_000 });
  await expect(count).toHaveText('600', { timeout: 10_000 });
  // dann wieder von vorn durch die lebendige Wolke
  await expect(root(page).locator('[data-cft=logo]')).not.toHaveClass(/is-on/, { timeout: 10_000 });
  await expect(on('SPARK')).toHaveClass(/is-on/);
  await expect(count).toHaveText('100');
  expect(errors).toEqual([]);
});

test('Außerhalb des Viewports zeichnet die Engine nicht, bei reduzierter Bewegung steht die Bokkenrijders-Maske in Ruhe', async ({ page }) => {
  await page.goto(PAGE);
  await reach(page);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  await page.evaluate(() => scrollTo(0, 0));
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await reach(page);
  await page.waitForTimeout(500);
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  await expect(root(page).locator('[data-cft=pkg][data-id=ODYSSEY]')).toHaveClass(/is-on/);
  expect(Number(await field(page).getAttribute('data-points'))).toBe(600); // die Bokkenrijders-Maske in Ruhe
});
