import { test, expect, type Page } from '@playwright/test';

// Findings from the second comparison pass against the shared Vercel reference.

const cases = [
  { route: '/musikalischer-teaser-bokkenrijders/', nextChars: 6, title: 'Bokkenrijders: 600 Drohnen im Musical in Maastricht | FlyingStars' },
  { route: '/nfl-berlin-game/', nextChars: 8, title: 'NFL Berlin Game: 300 Drohnen für die Indianapolis Colts | FlyingStars' },
  { route: '/exploring-reinvented-der-neue-ford-explorer/', nextChars: 4, title: 'Exploring Reinvented: 350 Drohnen für den neuen Ford Explorer | FlyingStars' },
  { route: '/puma-bundesliga/', nextChars: 13, title: 'PUMA: 100 Drohnen zum Anstoß eines Bundesliga-Derbys | FlyingStars' },
];

/** Puts the element at the bottom edge of the viewport and reports what the visitor would hit at its corners. */
const hitAtBottom = (page: Page, selector: string) => page.locator(selector).evaluate((element) => {
  element.scrollIntoView({ block: 'end', behavior: 'instant' });
  const r = element.getBoundingClientRect();
  return [[r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [r.left + 4, r.top + 4]].every(([x, y]) => {
    const hit = document.elementFromPoint(x, y);
    return hit === element || element.contains(hit);
  });
});

test('Globaler Pausenschalter sitzt im Header und verdeckt keine Bedienelemente', async ({ page }) => {
  await page.goto('/drohnenshow-preise/');
  await expect(page.locator('header.nav').getByRole('button', { name: 'Bewegung pausieren', exact: true })).toBeVisible();
  for (const selector of ['#drones', '#showtext', '#calc-cta']) expect(await hitAtBottom(page, selector), selector).toBe(true);
  await page.goto('/nfl-berlin-game/');
  expect(await hitAtBottom(page, '.c-credits div:first-child dd')).toBe(true);
});

test('Pausierte Bewegung bleibt beim Seitenwechsel pausiert', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bewegung pausieren', exact: true }).click();
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  await expect(page.getByRole('button', { name: 'Bewegung fortsetzen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass(/motion-paused/);
  await page.getByRole('button', { name: 'Bewegung fortsetzen', exact: true }).click();
  await page.goto('/drohnenshow-preise/');
  await expect(page.getByRole('button', { name: 'Bewegung pausieren', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

for (const project of cases) {
  test(`Case übernimmt Metadaten, Navigation und Titelgröße der Referenz: ${project.route}`, async ({ page }) => {
    await page.goto(project.route);
    await expect(page).toHaveTitle(project.title);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\.jpg$/);
    if (await page.locator('header.nav nav').isVisible()) {
      await expect(page.locator('header.nav nav a[href="/projekte/"]')).toHaveAttribute('aria-current', 'true');
    }
    // The reference scales the next-case title by its longest word (values taken from its markup).
    await expect(page.locator('.c-next b')).toHaveAttribute('style', `--chars:${project.nextChars}`);
  });
}

test('Startseite trägt Titel, Beschreibung und Vorschaubild der Referenz', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Drohnenshows buchen – über 150 Shows seit 2022 | FlyingStars');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /über 150 Shows seit 2022, eigene Flotte/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\.jpg$/);
});

test('Text am Himmel wandert mit der Anfrage ins Formular', async ({ page }) => {
  await page.goto('/drohnenshow-preise/');
  await page.getByLabel('Dein Text am Himmel').fill('ANNA & TOM');
  await expect(page.locator('#calc-cta')).toHaveAttribute('href', '/?paket=HORIZON&drohnen=200&text=ANNA+%26+TOM#anfrage');
  await page.locator('#calc-cta').click();
  await expect(page).toHaveURL(/#anfrage$/);
  await expect(page.locator('#inquiry-form [name=paket]')).toHaveValue(/HORIZON/);
  await expect(page.locator('#inquiry-form [name=message]')).toHaveValue('Text am Himmel: ANNA & TOM');
});

test('Scrollstory hebt auf breiten Bildschirmen nur den aktiven Abschnitt hervor', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Mobil stehen alle Abschnitte untereinander mit eigenem Bild.');
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  const steps = page.locator('.c-step');
  await steps.nth(1).scrollIntoViewIfNeeded();
  await expect(steps.nth(1)).toHaveClass(/\bon\b/);
  const opacity = (index: number) => steps.nth(index).locator('h2').evaluate((node) => Number(getComputedStyle(node).opacity));
  await expect.poll(() => opacity(1)).toBe(1);
  await expect.poll(() => opacity(0)).toBeLessThan(1);
});
