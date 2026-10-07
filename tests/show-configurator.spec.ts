import { test, expect, type Page } from '@playwright/test';

// Show configurator v3: Anlass picks the example motifs, Aufwand picks the package. Data rules (cumulative steps,
// distinct occasions, exact drone counts) are unit-tested in scripts/show-geometry.test.mjs.

const OCCASIONS = ['hochzeit', 'jubilaeum', 'launch', 'kultur', 'silvester'];
const STEPS = [['SPARK', '7.900', '100', 4], ['HORIZON', '15.900', '200', 6], ['ODYSSEY', '34.900', '300', 7]] as const;
const occasion = (page: Page, id: string) => page.locator(`label:has([name=occasion][value=${id}])`).click();
const paused = (page: Page) => page.addInitScript(() => sessionStorage.setItem('flyingstars:motion', 'paused'));
/** Width of the lit drone picture in canvas pixels. */
const pictureWidth = (page: Page) => page.locator('#cfg-field').evaluate((node) => {
  const c = node as HTMLCanvasElement, d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 60) { const x = ((i - 3) / 4) % c.width; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  return x1 - x0;
});

test('Der Preis hängt nur am Aufwand, der Anlass ändert nur die Motive', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await paused(page);
  await page.goto('/show-konfigurator/');
  for (const [k, [pkg, price, drones, motifs]] of STEPS.entries()) {
    await page.locator('#cfg-step').fill(String(k));
    const seen = new Set<string>();
    for (const id of OCCASIONS) {
      await occasion(page, id);
      await expect(page.locator('#cfg-step')).toHaveValue(String(k)); // the occasion never moves the slider
      await expect(page.locator('#cfg-pkg')).toHaveText(pkg);
      await expect(page.locator('#cfg-price')).toHaveText(`ab ${price} €`);
      await expect(page.locator('#cfg-count')).toHaveText(`${drones} Drohnen`);
      await expect(page.locator('#cfg-dots button')).toHaveCount(motifs);
      seen.add(await page.locator('#cfg-dots button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')).join('|')));
    }
    expect(seen.size).toBe(OCCASIONS.length); // every occasion shows its own motifs
  }
  expect(errors).toEqual([]);
});

test('Eine Stufe höher beginnt mit dem, was neu dazukommt', async ({ page }) => {
  await page.goto('/show-konfigurator/');
  await page.locator('#cfg-step').fill('2');
  await expect(page.locator('#cfg-scene')).toHaveText('Ineinander drehende 3D-Ringe');
  await expect(page.locator('#cfg-new')).toHaveText('Neu in ODYSSEY');
  await expect(page.locator('#cfg-includes')).toContainText('komplexe 3D-Animationen');
  await page.locator('#cfg-step').fill('1');
  await expect(page.locator('#cfg-includes')).toContainText('individuelle 2D-Animationen');
});

test('Mehr Drohnen ergeben ein sichtbar größeres Bild', async ({ page }) => {
  await paused(page);
  await page.goto('/show-konfigurator/');
  const widths: number[] = [];
  for (const k of ['0', '2']) {
    await page.locator('#cfg-step').fill(k);
    await page.locator('#cfg-dots button[aria-label="Herz"]').click();
    await expect.poll(() => pictureWidth(page)).toBeGreaterThan(50);
    await page.waitForTimeout(300);
    widths.push(await pictureWidth(page));
  }
  expect(widths[1] / widths[0]).toBeGreaterThan(1.4);
});

test('Pausiert lässt sich die Vorschau mit der Tastatur durchgehen', async ({ page }) => {
  await paused(page);
  await page.goto('/show-konfigurator/');
  await occasion(page, 'kultur');
  await page.locator('#cfg-step').fill('2');
  const figure = page.locator('#cfg-dots button[aria-label^="Beispiel aus unserer Musical-Show"]');
  await figure.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cfg-scene')).toHaveText('Beispiel aus unserer Musical-Show Bokkenrijders');
  await expect(figure).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => pictureWidth(page)).toBeGreaterThan(100);
});

test('Auf den ersten Blick: Anlass, Aufwand, Preis und Anfrage', async ({ page }, info) => {
  await page.goto('/show-konfigurator/');
  await expect(page.locator('#cfg-step')).toBeVisible();
  await expect(page.locator('details')).toHaveCount(0);
  if (info.project.name === 'mobile') await expect(page.locator('#cfg-bar-cta')).toBeInViewport();
  else await expect(page.locator('#cfg-cta')).toBeInViewport();
});

test('Die Anfrage übernimmt Anlass, Paket und Beispielmotive', async ({ page }) => {
  await page.goto('/show-konfigurator/');
  await occasion(page, 'launch');
  await page.locator('#cfg-step').fill('0');
  await page.locator('#cfg-cta').click();
  await expect(page).toHaveURL(/#anfrage$/);
  const form = page.locator('#inquiry-form');
  await expect(form.locator('[name=paket]')).toHaveValue(/SPARK/);
  await expect(form.locator('[name=anlass][value=firma]')).toBeChecked();
  await expect(form.locator('[name=message]')).toHaveValue(/Anlass: Launch\nAufwand: Klassische Bilder \(SPARK, ab 7\.900 € netto, Einstiegspreis laut Konfigurator\)\nBeispielmotive: Sternenhimmel → /);
});
