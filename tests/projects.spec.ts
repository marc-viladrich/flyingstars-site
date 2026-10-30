import { test, expect } from '@playwright/test';

const cases = [
  { route: '/musikalischer-teaser-bokkenrijders/', name: 'Bokkenrijders', droneCount: 600, pictures: 6, next: '/nfl-berlin-game/' },
  { route: '/nfl-berlin-game/', name: 'NFL Berlin Game', droneCount: 289, pictures: 6, next: '/exploring-reinvented-der-neue-ford-explorer/' },
  { route: '/exploring-reinvented-der-neue-ford-explorer/', name: 'Ford Explorer', droneCount: 369, pictures: 6, next: '/puma-bundesliga/' },
  { route: '/puma-bundesliga/', name: 'PUMA', droneCount: 78, pictures: 4, next: '/musikalischer-teaser-bokkenrijders/' },
];

for (const project of cases) {
  test(`${project.name}: Geschichte, echte Formation und nächstes Projekt`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(project.route);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(project.name);
    await expect(page.locator('.c-step')).toHaveCount(4);
    await expect(page.locator('.c-track figure')).toHaveCount(project.pictures);
    await expect(page.locator('video')).not.toHaveAttribute('src');
    const formation = page.locator('.c-play');
    await formation.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-tally]')).toContainText(`${project.droneCount} Drohnen`);
    await expect(page.locator('[data-replay]')).toBeEnabled();
    await page.getByRole('button', { name: 'Animation pausieren', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Animation fortsetzen', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Noch mal starten', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Animation pausieren', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.c-next')).toHaveAttribute('href', project.next);
    expect(errors).toEqual([]);
  });
}

test('Projektübersicht verlinkt alle vier Fälle und blendet redaktionelle Entwürfe aus', async ({ page }) => {
  await page.goto('/projekte/');
  for (const project of cases) await expect(page.locator(`.projects a[href="${project.route}"]`)).toBeVisible();
  await expect(page.getByText('Beispielprojekt', { exact: true })).toHaveCount(0);
  await page.locator(`.projects a[href="${cases[0].route}"]`).click();
  await expect(page).toHaveURL(new RegExp(cases[0].route));
});

test('Bildergalerie lässt sich mit der Tastatur horizontal bedienen', async ({ page }) => {
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  const gallery = page.getByRole('region', { name: 'Bokkenrijders: Bildergalerie' });
  await gallery.scrollIntoViewIfNeeded();
  await gallery.focus();
  await gallery.press('ArrowRight');
  await expect.poll(() => gallery.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
});

test('Reduzierte Bewegung zeigt eine statische echte Formation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  await page.locator('.c-play').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-tally]')).toContainText('600 Drohnen');
  await expect(page.locator('[data-formation-pause]')).toBeHidden();
  await expect(page.locator('[data-replay]')).toBeDisabled();
  // A visible formation, not just a successfully downloaded JSON document.
  await expect.poll(() => page.locator('canvas[data-formation]').evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
});

test('Kennzahlen stehen ohne Scrollen fertig da, die Anfrage nennt die Referenz', async ({ page }) => {
  await page.goto('/musikalischer-teaser-bokkenrijders/');
  // read right after load, before anything could have scrolled into view
  // one read without retrying: a count-up would still show its start value here
  expect(await page.locator('.c-num b').allTextContents()).toEqual(['600', '12.000', '20']);
  await expect(page.locator('section[aria-labelledby="cta-h"] a.btn')).toHaveAttribute('href', '/kontakt/?anlass=firma&quelle=referenz-musikalischer-teaser-bokkenrijders');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test('Globale Pause mitten im Start zeigt sofort die fertige Formation', async ({ page }) => {
  await page.goto('/puma-bundesliga/');
  await page.locator('.c-play').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-tally]')).toContainText('Drohnen');
  // the drones are still on the ground or climbing now; the pause has to land them in their places
  await page.locator('header.nav').getByRole('button', { name: 'Bewegung pausieren', exact: true }).click();
  const picture = () => page.locator('canvas[data-formation]').evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const d = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0, ys = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40 && Math.max(d[i], d[i + 1], d[i + 2]) > 120) { n++; ys += Math.floor(i / 4 / canvas.width); }
    return { n, centre: n ? ys / n / canvas.height : 0 };
  });
  const first = await picture();
  expect(first.n).toBeGreaterThan(500);
  // finished formation sits in the middle of the stage, a take-off would be at the bottom edge
  expect(first.centre).toBeGreaterThan(0.25);
  expect(first.centre).toBeLessThan(0.75);
  await page.waitForTimeout(500);
  expect(await picture()).toEqual(first);
});
