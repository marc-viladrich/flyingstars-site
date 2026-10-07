import { test, expect, type Page } from '@playwright/test';

// Show configurator v4: Anlass offers two motifs, Aufwand picks the package; the slider turns the chosen motif into
// its version for that package. Shape counts and the data model are unit-tested in scripts/show-geometry.test.mjs.

const OCCASIONS = ['hochzeit', 'jubilaeum', 'launch', 'kultur', 'silvester'];
const STEPS = [['SPARK', '7.900', '100'], ['HORIZON', '15.900', '200'], ['ODYSSEY', '34.900', '300']] as const;
const occasion = (page: Page, id: string) => page.locator(`label:has([name=occasion][value=${id}])`).click();
const paused = (page: Page) => page.addInitScript(() => sessionStorage.setItem('flyingstars:motion', 'paused'));
const field = (page: Page) => page.locator('#cfg-field');
/** Width of the lit drone picture in canvas pixels. */
const pictureWidth = (page: Page) => field(page).evaluate((node) => {
  const c = node as HTMLCanvasElement, d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 60) { const x = ((i - 3) / 4) % c.width; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  return x1 - x0;
});

test('Preis nur über den Aufwand; jedes Motiv hat je Paket eine eigene Fassung mit genau dessen Drohnen', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await paused(page);
  await page.goto('/show-konfigurator/');
  const captions = new Set<string>();
  for (const id of OCCASIONS) {
    await occasion(page, id);
    await expect(page.locator('#cfg-motifs button')).toHaveCount(2);
    for (const m of [0, 1]) {
      await page.locator('#cfg-motifs button').nth(m).click();
      for (const [k, [pkg, price, drones]] of STEPS.entries()) {
        await page.locator('#cfg-step').fill(String(k));
        await expect(page.locator('#cfg-pkg')).toHaveText(pkg);
        await expect(page.locator('#cfg-price')).toHaveText(`ab ${price} €`);
        await expect(page.locator('#cfg-new')).toHaveText(pkg);
        if (info.project.name === 'desktop') await expect(field(page)).toHaveAttribute('data-points', drones);
        captions.add(await page.locator('#cfg-scene').textContent() ?? '');
      }
    }
  }
  expect(captions.size).toBe(OCCASIONS.length * 2 * 3); // 30 distinct versions
  expect(errors).toEqual([]);
});

test('Der Anlass ändert weder Regler noch Preis', async ({ page }) => {
  await page.goto('/show-konfigurator/');
  await page.locator('#cfg-step').fill('2');
  for (const id of OCCASIONS) {
    await occasion(page, id);
    await expect(page.locator('#cfg-step')).toHaveValue('2');
    await expect(page.locator('#cfg-price')).toHaveText('ab 34.900 €');
  }
});

test('Dasselbe Motiv wird mit dem Paket größer', async ({ page }) => {
  await paused(page);
  await page.goto('/show-konfigurator/');
  const widths: number[] = [];
  for (const k of ['0', '2']) {
    await page.locator('#cfg-step').fill(k);
    await expect(page.locator('#cfg-scene')).toHaveText(k === '0' ? 'Herz als Umriss' : '3D-Herz mit kleinen Herzen');
    await page.waitForTimeout(300);
    widths.push(await pictureWidth(page));
  }
  expect(widths[1] / widths[0]).toBeGreaterThan(1.4);
});

test('Ein 3D-Motiv dreht sich einmal und die Animation kommt danach zur Ruhe', async ({ page }) => {
  await page.goto('/show-konfigurator/');
  await occasion(page, 'launch');
  await page.locator('#cfg-step').fill('1');
  await expect(page.locator('#cfg-scene')).toHaveText('3D-Rakete');
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  // forming (~2 s) + one turn (5.5 s): afterwards no frames are drawn any more
  await expect(field(page)).toHaveAttribute('data-running', 'false', { timeout: 15_000 });
});

test('Motive lassen sich per Tastatur wechseln', async ({ page }) => {
  await paused(page);
  await page.goto('/show-konfigurator/');
  await occasion(page, 'kultur');
  await page.locator('#cfg-step').fill('2');
  await page.locator('#cfg-motifs button', { hasText: 'Vorhang' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cfg-motifs button', { hasText: 'Vorhang' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#cfg-scene')).toHaveText('Vorhang auf für 3D-Sternenregen');
  await page.locator('#cfg-motifs button', { hasText: 'Maske' }).click();
  await expect(page.locator('#cfg-scene')).toHaveText('3D-Maske aus unserer Musical-Show Bokkenrijders');
  await expect.poll(() => pictureWidth(page)).toBeGreaterThan(100);
});

test('Auf den ersten Blick: Anlass, Aufwand, Preis und Anfrage', async ({ page }, info) => {
  await page.goto('/show-konfigurator/');
  await expect(page.locator('#cfg-step')).toBeVisible();
  if (info.project.name === 'mobile') await expect(page.locator('#cfg-bar-cta')).toBeInViewport();
  else await expect(page.locator('#cfg-cta')).toBeInViewport();
});

test('Die Anfrage übernimmt Anlass, Motiv und Paket', async ({ page }) => {
  await page.goto('/show-konfigurator/');
  await occasion(page, 'launch');
  await page.locator('#cfg-step').fill('0');
  await page.locator('#cfg-cta').click();
  await expect(page).toHaveURL(/#anfrage$/);
  const form = page.locator('#inquiry-form');
  await expect(form.locator('[name=paket]')).toHaveValue(/SPARK/);
  await expect(form.locator('[name=anlass][value=firma]')).toBeChecked();
  await expect(form.locator('[name=message]')).toHaveValue('Anlass: Launch\nBeispielmotiv: Rakete – Rakete als Umriss\nAufwand: Klassisch in 2D (SPARK, ab 7.900 € netto, Einstiegspreis laut Konfigurator)');
});
