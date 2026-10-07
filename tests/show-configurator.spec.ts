import { test, expect, type Page } from '@playwright/test';

// Show configurator prototype: answers translate into FlyingStars' package, drone and price rules.

const pick = (page: Page, id: string) => page.locator(`[name=adventure][value=${id}]`).check({ force: true });
const result = (page: Page) => ({ pkg: page.locator('#cfg-result-pkg'), price: page.locator('#cfg-result-price'), meta: page.locator('#cfg-result-meta') });
const litPixels = (page: Page) => page.locator('#cfg-field').evaluate((node) => {
  const canvas = node as HTMLCanvasElement;
  const d = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 60) n++;
  return n;
});

for (const [id, pkg, price, drones] of [
  ['ja', 'SPARK', '7.900', '100'], ['jubilaeum', 'HORIZON', '25.700', '300'], ['launch', 'HORIZON', '16.800', '200'],
  ['geschichte', 'ODYSSEY', '64.600', '600'], ['silvester', 'HORIZON', '25.700', '300'],
] as const) {
  test(`Ausgangspunkt ${id} ergibt ${pkg} nach den FlyingStars-Preisregeln`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/show-konfigurator/');
    await pick(page, id);
    const r = result(page);
    await expect(r.pkg).toHaveText(pkg);
    await expect(r.price).toHaveText(`ab ${price} €`);
    await expect(r.meta).toContainText(`${drones} Drohnen`);
    await expect.poll(() => litPixels(page)).toBeGreaterThan(300);
    expect(errors).toEqual([]);
  });
}

test('Jede Einstellung ändert Paket und Begründung sichtbar', async ({ page }) => {
  await page.goto('/show-konfigurator/');
  const r = result(page), decisive = page.locator('#cfg-reasons li.decisive');
  await expect(r.pkg).toHaveText('SPARK');
  await page.locator('#cfg-tier').fill('3');
  await expect(r.pkg).toHaveText('HORIZON');
  await expect(decisive.first()).toContainText('Es bewegt sich');
  await expect(page.locator('#cfg-scene')).toHaveText('Schlagendes Herz');
  await page.locator('#cfg-tier').fill('5');
  await expect(r.pkg).toHaveText('ODYSSEY');
  await page.locator('#cfg-tier').fill('2');
  await page.locator('label:has([name=music][value=live])').click();
  await expect(r.pkg).toHaveText('ODYSSEY');
  await expect(decisive.first()).toContainText('Timecode');
  await page.locator('label:has([name=music][value=katalog])').click();
  await page.locator('label:has(#cfg-film)').click();
  await expect(r.price).toHaveText('ab 8.800 €');
  await page.locator('#cfg-audience').fill('2');
  await expect(r.pkg).toHaveText('HORIZON');
  await expect(decisive.first()).toContainText('SPARK fliegt bis 150');
});

test('Eigener Text, Ablauf und Anfrage hängen zusammen', async ({ page }) => {
  await page.goto('/show-konfigurator/');
  await page.getByLabel('Eure Initialen').fill('M & J');
  await expect(page.locator('#cfg-scene')).toHaveText('Eure Initialen');
  await expect(page.locator('#cfg-scenes')).toContainText('M & J');
  await page.locator('#cfg-play').click();
  await expect(page.locator('#cfg-scene')).toHaveText('Sternenhimmel');
  await expect(page.locator('#cfg-scene')).toHaveText('Eure Initialen', { timeout: 5000 });
  await page.locator('#cfg-play').click();
  await page.locator('#cfg-cta').click();
  await expect(page).toHaveURL(/#anfrage$/);
  const form = page.locator('#inquiry-form');
  await expect(form.locator('[name=paket]')).toHaveValue(/SPARK/);
  await expect(form.locator('[name=anlass][value=privat]')).toBeChecked();
  await expect(form.locator('[name=message]')).toHaveValue(/Show: Das Ja\nMotive: Sternenhimmel → M & J/);
});

test('Bei pausierter Bewegung zeigt das Feld das fertige Bild', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('flyingstars:motion', 'paused'));
  await page.goto('/show-konfigurator/');
  await pick(page, 'geschichte');
  await expect(page.locator('#cfg-scene')).toContainText('3D-Figur');
  await expect.poll(() => litPixels(page)).toBeGreaterThan(300);
});
