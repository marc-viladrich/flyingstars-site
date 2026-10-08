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
