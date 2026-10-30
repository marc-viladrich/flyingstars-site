import { test, expect, type Page } from '@playwright/test';

// Findings from the second comparison pass against the shared Vercel reference.

// 30.10.2026: the pages left the reference design (docs/DESIGN.md); what stays tested is behaviour, not parity.
const cases = [
  { route: '/musikalischer-teaser-bokkenrijders/', title: /Bokkenrijders.*\| FlyingStars$/ },
  { route: '/nfl-berlin-game/', title: /NFL.*\| FlyingStars$/ },
  { route: '/exploring-reinvented-der-neue-ford-explorer/', title: /Ford Explorer.*\| FlyingStars$/ },
  { route: '/puma-bundesliga/', title: /PUMA.*\| FlyingStars$/ },
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
  for (const selector of ['.pk-card:first-child .pk-actions', '.cfg-pkgs', '.cfg-result', '.pv-text summary'] /* rectangles: the pill buttons' own corners lie outside their rounding */) expect(await hitAtBottom(page, selector), selector).toBe(true);
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
  test(`Case trägt eigene Metadaten, markiert Referenzen in der Navigation und verlinkt das nächste Projekt: ${project.route}`, async ({ page }) => {
    await page.goto(project.route);
    await expect(page).toHaveTitle(project.title);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\.jpg$/);
    if (await page.locator('header.nav nav').isVisible()) {
      await expect(page.locator('header.nav nav a[href="/projekte/"]')).toHaveAttribute('aria-current', 'true');
    }
    await expect(page.locator('.c-next')).toHaveAttribute('href', /^\/[a-z0-9-]+\/$/);
  });
}

test('Startseite trägt Titel, Beschreibung und Vorschaubild', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Drohnenshows für Firmen, Städte und Hochzeiten \| FlyingStars/);
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description?.length ?? 0).toBeGreaterThanOrEqual(50);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\.jpg$/);
});

test('Text am Himmel wandert mit der Anfrage ins Formular', async ({ page }) => {
  await page.goto('/drohnenshow-preise/#vorschau');
  await page.getByText('Euren Text hinzufügen (ohne Aufpreis)').click();
  await page.getByLabel('Euer Text am Himmel').fill('ANNA & TOM');
  await expect(page.locator('#cfg-cta')).toHaveAttribute('href', /paket=HORIZON&drohnen=200&.*Eigener\+Text%3A\+%E2%80%9EANNA\+%26\+TOM%E2%80%9C/);
  await page.locator('#cfg-cta').click();
  await expect(page).toHaveURL(/\/kontakt\/\?/);
  await expect(page.locator('#inquiry-form [name=paket]')).toHaveValue(/HORIZON/);
  await expect(page.locator('#inquiry-form [name=message]')).toHaveValue(/Eigener Text: „ANNA & TOM“ \(Schreibschrift\)/);
});

/** Counts coloured formation pixels; the grey dimension lines do not count. */
const colouredPixels = (page: Page, selector: string) => page.locator(selector).evaluate((node) => {
  const canvas = node as HTMLCanvasElement;
  const d = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 60) n++;
  return n;
});

test('Formationen erscheinen fertig, wenn die Bewegung schon pausiert ist', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('flyingstars:motion', 'paused'));
  await page.goto('/nfl-berlin-game/');
  await page.locator('.c-play').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-tally]')).toContainText('289 Drohnen');
  await expect.poll(() => colouredPixels(page, 'canvas[data-formation]')).toBeGreaterThan(500);
  await page.goto('/drohnenshow-preise/#vorschau');
  await expect(page.locator('[data-preview]')).toHaveAttribute('data-state', 'paused');
  await expect.poll(() => colouredPixels(page, '#cfg-field')).toBeGreaterThan(500);
});
